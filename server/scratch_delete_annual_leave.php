<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

// Find the Annual Leave Verified type
$stmt = $db->prepare("SELECT id, name FROM leave_types WHERE name LIKE '%Annual%' OR code = 'AI' OR code = 'AL' LIMIT 5");
$stmt->execute();
$types = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($types)) {
    echo "No Annual Leave type found.\n";
    exit;
}

echo "Found leave types:\n";
foreach ($types as $t) {
    echo "  ID: {$t['id']}  Name: {$t['name']}\n";
}

// Use the first match
$leaveTypeId = $types[0]['id'];
$leaveTypeName = $types[0]['name'];

echo "\nDeleting all leave requests linked to '$leaveTypeName' (ID: $leaveTypeId)...\n";
$del1 = $db->prepare("DELETE FROM leave_requests WHERE leave_type_id = :id");
$del1->execute([':id' => $leaveTypeId]);
echo "Deleted {$del1->rowCount()} leave request(s).\n";

echo "Deleting leave type '$leaveTypeName'...\n";
$del2 = $db->prepare("DELETE FROM leave_types WHERE id = :id");
$del2->execute([':id' => $leaveTypeId]);
echo "Deleted {$del2->rowCount()} leave type(s).\n";

echo "\nDone!\n";
?>
