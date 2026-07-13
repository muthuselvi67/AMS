<?php
// Attendance Reminders Cron Job
// Run this script every minute or hour to send check-in/check-out reminders.

date_default_timezone_set('Asia/Kolkata');
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo "Database connection failed.\n";
    exit(1);
}

$today = date('Y-m-d');
$now = date('H:i:s');

echo "Starting Attendance Reminders check at " . date('Y-m-d H:i:s') . "\n";

// 1. Check-in Reminder
// Condition: Time is 10:00:00 or later
if ($now >= '10:00:00') {
    // Find active employees who have NOT checked in today
    // and are NOT on approved leave today.
    $query = "SELECT id, name FROM users 
              WHERE is_active = 1 
              AND id NOT IN (SELECT employee_id FROM attendances WHERE date = :today)
              AND id NOT IN (
                  SELECT employee_id FROM leave_requests 
                  WHERE :today2 BETWEEN start_date AND end_date AND status = 'approved'
              )";
    
    $stmt = $db->prepare($query);
    $stmt->execute([':today' => $today, ':today2' => $today]);
    $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($employees as $emp) {
        // Check if we already sent a check-in reminder today
        $title = "Check-in Reminder";
        $checkNotif = $db->prepare("SELECT id FROM notifications WHERE recipient_id = :uid AND title = :title AND DATE(created_at) = :today LIMIT 1");
        $checkNotif->execute([':uid' => $emp['id'], ':title' => $title, ':today' => $today]);

        if ($checkNotif->rowCount() == 0) {
            // Insert notification
            $msg = "not check in";
            $insert = $db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, 'attendance', 0, 'attendances', 0, NOW(), NOW())");
            $insert->execute([':uid' => $emp['id'], ':title' => $title, ':msg' => $msg]);
            echo "Sent Check-in Reminder to Employee ID {$emp['id']} ({$emp['name']}).\n";
        }
    }
}

// 2. Check-out Reminder
// Condition: Time is 18:00:00 (6:00 PM) or later
if ($now >= '18:00:00') {
    // Find active employees who HAVE checked in today but HAVE NOT checked out
    $query = "SELECT a.id as attendance_id, u.id as employee_id, u.name 
              FROM attendances a
              JOIN users u ON a.employee_id = u.id
              WHERE a.date = :today 
              AND a.check_out_time IS NULL
              AND u.is_active = 1";
    
    $stmt = $db->prepare($query);
    $stmt->execute([':today' => $today]);
    $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($attendances as $att) {
        $title = "Check-out Reminder";
        $checkNotif = $db->prepare("SELECT id FROM notifications WHERE recipient_id = :uid AND title = :title AND DATE(created_at) = :today LIMIT 1");
        $checkNotif->execute([':uid' => $att['employee_id'], ':title' => $title, ':today' => $today]);

        if ($checkNotif->rowCount() == 0) {
            $msg = "not check out";
            $insert = $db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, 'attendance', :related_id, 'attendances', 0, NOW(), NOW())");
            $insert->execute([':uid' => $att['employee_id'], ':title' => $title, ':msg' => $msg, ':related_id' => $att['attendance_id']]);
            echo "Sent Check-out Reminder to Employee ID {$att['employee_id']} ({$att['name']}).\n";
        }
    }
}

echo "Attendance Reminders check completed.\n";
?>
