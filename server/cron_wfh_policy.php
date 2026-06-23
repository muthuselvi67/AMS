<?php
// WFH Policy Enforcement Cron Job
// Run this script daily at or after 6:00 PM (18:00) to automatically transition WFH records without EOD updates to leave.
date_default_timezone_set('Asia/Kolkata');
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo "Database connection failed.\n";
    exit(1);
}

$today = date('Y-m-d');
$now = date('H:i:s');

echo "Starting WFH Policy enforcement check at " . date('Y-m-d H:i:s') . "\n";

// Find WFH attendance records that are not marked as 'on-leave' yet
// and check if they missed the EOD report. We check records for:
// - past days
// - today, if the current time is past 18:00:00 (6:00 PM)
$query = "SELECT id, employee_id, date, status 
          FROM attendances 
          WHERE work_from_home = 1 
            AND status != 'on-leave'
            AND (date < :today OR (date = :today2 AND :now > '18:00:00'))";

$stmt = $db->prepare($query);
$stmt->execute([
    ':today' => $today,
    ':today2' => $today,
    ':now' => $now
]);
$records = $stmt->fetchAll(PDO::FETCH_ASSOC);

$updatedCount = 0;
foreach ($records as $r) {
    // Check if there is a final EOD report for this attendance record
    $checkFinal = $db->prepare(
        "SELECT id FROM wfh_updates 
         WHERE attendance_id = :att_id AND is_final = 1 LIMIT 1"
    );
    $checkFinal->execute([':att_id' => $r['id']]);

    if ($checkFinal->rowCount() == 0) {
        // No EOD report found! Update status to 'on-leave'
        $update = $db->prepare(
            "UPDATE attendances SET status = 'on-leave' WHERE id = :id"
        );
        $update->execute([':id' => $r['id']]);
        
        $updatedCount++;
        echo "Marked attendance ID {$r['id']} (Employee ID {$r['employee_id']}) on date {$r['date']} as on-leave due to missing EOD update.\n";

        // Notify the employee
        try {
            $empMsg = "Your WFH day on {$r['date']} was automatically marked as Leave because no final EOD report was submitted by 6:00 PM.";
            $notifEmp = $db->prepare(
                "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                 VALUES (:uid, 'WFH Marked as Leave', :msg, 'wfh_policy_leave', :att_id, 'attendances', 0, NOW(), NOW())"
            );
            $notifEmp->execute([':uid' => $r['employee_id'], ':msg' => $empMsg, ':att_id' => $r['id']]);

            // Notify HR / Admin users
            $empNameStmt = $db->prepare("SELECT name FROM users WHERE id = :id LIMIT 1");
            $empNameStmt->execute([':id' => $r['employee_id']]);
            $empName = $empNameStmt->fetchColumn() ?: 'An employee';

            $hrMsg = "{$empName}'s WFH attendance on {$r['date']} was automatically marked as Leave \u2014 no final EOD report was submitted by 6:00 PM.";
            $hrStmt = $db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
            $hrUsers = $hrStmt->fetchAll(PDO::FETCH_COLUMN);
            $notifHR = $db->prepare(
                "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                 VALUES (:uid, 'WFH Auto-Leave Applied', :msg, 'wfh_policy_leave', :att_id, 'attendances', 0, NOW(), NOW())"
            );
            foreach ($hrUsers as $hrId) {
                $notifHR->execute([':uid' => $hrId, ':msg' => $hrMsg, ':att_id' => $r['id']]);
            }
        } catch (Exception $e) {
            // ignore notification errors
        }
    }
}

echo "WFH Policy enforcement check completed. $updatedCount records marked as leave.\n";
?>
