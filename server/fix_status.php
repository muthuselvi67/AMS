<?php
date_default_timezone_set('Asia/Kolkata');
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("SELECT id, check_in_time, status FROM attendances");
$stmt->execute();
$records = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($records as $row) {
    if (!$row['check_in_time']) continue;

    // Convert to DateTime object to reliably extract the time component
    $time = new DateTime($row['check_in_time']);
    $timeStr = $time->format('H:i:s');
    
    // Evaluate based on the new 09:30:00 rule
    $newStatus = ($timeStr > '09:30:00') ? 'late' : 'present';

    if ($row['status'] !== $newStatus) {
        $update = $db->prepare("UPDATE attendances SET status = :status WHERE id = :id");
        $update->execute([':status' => $newStatus, ':id' => $row['id']]);
        echo "Updated record {$row['id']} from {$row['status']} to $newStatus (Time: $timeStr)\n";
    }
}
echo "Status fix completed.\n";
