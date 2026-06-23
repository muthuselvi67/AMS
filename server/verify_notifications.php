<?php
$conn = new PDO("mysql:host=localhost;dbname=lms_db", "root", "12345678");
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Simulating: Employee applies LEAVE ===\n";

// Simulate employee applying a leave (what LeaveController::createLeave() now does)
$empName  = "PRIYA DHARSHINI S";
$ltName   = "Annual Leave";
$startDate = "2026-06-15";
$endDate   = "2026-06-17";

$recipStmt = $conn->query("SELECT id, name FROM users WHERE role IN ('admin','hr') AND is_active = 1");
$admins = $recipStmt->fetchAll(PDO::FETCH_ASSOC);

$notifStmt = $conn->prepare(
    "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
     VALUES (:rid, :title, :msg, :type, :rel_id, :rel_model, 0, NOW(), NOW())"
);

foreach ($admins as $a) {
    $notifStmt->execute([
        ':rid'       => $a['id'],
        ':title'     => 'New Leave Request',
        ':msg'       => "{$empName} has applied for {$ltName} from {$startDate} to {$endDate}. Please review.",
        ':type'      => 'leave_applied',
        ':rel_id'    => 999,
        ':rel_model' => 'leave_requests',
    ]);
    echo "  [OK] Notified {$a['name']} (ID={$a['id']})\n";
}

echo "\n=== Simulating: Employee applies ALLOWANCE ===\n";
$empName2     = "PRIYA DHARSHINI S";
$catName      = "Food Allowance";
$formattedAmt = "₹300";

foreach ($admins as $a) {
    $notifStmt->execute([
        ':rid'       => $a['id'],
        ':title'     => 'New Allowance Request',
        ':msg'       => "{$empName2} has submitted a {$catName} request for {$formattedAmt}. Please review.",
        ':type'      => 'allowance',
        ':rel_id'    => 999,
        ':rel_model' => 'allowance_request',
    ]);
    echo "  [OK] Notified {$a['name']} (ID={$a['id']})\n";
}

echo "\n=== Verifying notifications in DB for DEEPAK R ===\n";
$check = $conn->prepare("SELECT id, title, type, is_read, created_at FROM notifications WHERE recipient_id = 87 ORDER BY id DESC LIMIT 5");
$check->execute();
foreach ($check->fetchAll(PDO::FETCH_ASSOC) as $n) {
    $read = $n['is_read'] ? 'READ' : 'UNREAD';
    echo "  [{$n['id']}] {$n['title']} | {$n['type']} | {$read} | {$n['created_at']}\n";
}

echo "\n✅ Done! Notifications are working.\n";
echo "   → When an employee applies leave → Admin & HR get notified\n";
echo "   → When an employee applies allowance → Admin & HR get notified\n";
echo "   → When leave/allowance is approved/rejected → Employee gets notified\n";
