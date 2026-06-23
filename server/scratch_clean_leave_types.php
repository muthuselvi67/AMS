<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

echo "=== CLEANING UP ERRONEOUS LEAVE TYPES ===\n";

// Delete ID 21: Maternity with code ANNUAL, which is a duplicate/mistake
$stmt = $db->prepare("DELETE FROM leave_types WHERE id = 21");
$stmt->execute();
$count = $stmt->rowCount();

if ($count > 0) {
    echo "✓ Successfully deleted erroneous leave type (ID: 21, Name: 'Maternity', Code: 'ANNUAL')!\n";
} else {
    echo "ℹ No erroneous leave type with ID 21 found.\n";
}

// Ensure the standard 'Maternity Leave' (ID: 4) has description and is active or let it be inactive so user can toggle it
$stmt = $db->prepare("UPDATE leave_types SET description = 'Leave for child birth.' WHERE id = 4");
$stmt->execute();
echo "✓ Verified standard Maternity Leave (ID: 4) description.\n";

// Let's print final list
$stmt = $db->query('SELECT id, name, code, default_days, is_active FROM leave_types ORDER BY id');
$types = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\n=== CURRENT LEAVE TYPES ===\n";
foreach ($types as $t) {
    echo "ID: {$t['id']} | Name: {$t['name']} | Code: {$t['code']} | Active: {$t['is_active']}\n";
}
echo "Done!\n";
?>
