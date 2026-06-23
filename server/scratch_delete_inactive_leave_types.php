<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

echo "=== DELETING ALL INACTIVE LEAVE TYPES ===\n";

// First show what will be deleted
$stmt = $db->query('SELECT id, name, code FROM leave_types WHERE is_active = 0');
$inactive = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($inactive)) {
    echo "No inactive leave types found.\n";
} else {
    echo "Will delete:\n";
    foreach ($inactive as $t) {
        echo "  - ID: {$t['id']} | Name: {$t['name']} | Code: {$t['code']}\n";
    }

    // Delete them
    $stmt = $db->prepare("DELETE FROM leave_types WHERE is_active = 0");
    $stmt->execute();
    $count = $stmt->rowCount();
    echo "\n✓ Deleted $count inactive leave type(s)!\n";
}

// Print final list
$stmt = $db->query('SELECT id, name, code, default_days, is_active FROM leave_types ORDER BY id');
$types = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\n=== REMAINING LEAVE TYPES ===\n";
foreach ($types as $t) {
    echo "ID: {$t['id']} | Name: {$t['name']} | Code: {$t['code']} | Days: {$t['default_days']} | Active: {$t['is_active']}\n";
}
echo "Done!\n";
?>
