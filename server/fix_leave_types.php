<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

echo "=== FIXING LEAVE TYPES BY ID ===\n";

// Update by ID - safe, no duplicates
$fixes = [
    // ID:2 - Sick Leave: 1 per month
    ['id' => 2, 'description' => '1 Sick Leave per month (12 per year).'],

    // ID:3 - Casual Leave: 1 per month
    ['id' => 3, 'description' => '1 Casual Leave per month (12 per year).'],

    // ID:7 - Vacation Leave: half day per month
    ['id' => 7, 'description' => 'Vacation Leave - Half Day per month (12 per year).'],

    // ID:9 - Permission Leave: 2 x 1-hour permissions per month
    ['id' => 9, 'description' => '2 One-Hour Permissions per month (24 per year).'],

    // ID:10 - Monthly Half-Day Permission: 1 per month
    ['id' => 10, 'description' => '1 Half-Day Permission per month (12 per year).'],

    // ID:11 - Monthly One-Hour Permission: 1 per month
    ['id' => 11, 'description' => '1 One-Hour Permission per month (12 per year).'],
];

foreach ($fixes as $fix) {
    $stmt = $db->prepare("UPDATE leave_types SET description = :desc WHERE id = :id");
    $stmt->execute([':desc' => $fix['description'], ':id' => $fix['id']]);
    echo "✓ Updated ID:{$fix['id']} description\n";
}

// Fix ID:12 "madanity" - this is a duplicate Maternity. Delete it.
$stmt = $db->prepare("DELETE FROM leave_types WHERE id = 12");
$stmt->execute();
echo "✓ Deleted 'madanity' (ID:12) - duplicate/misspelled Maternity entry\n";

// Also fix ID:8 "Monthly Half Day" description
$stmt = $db->prepare("UPDATE leave_types SET description = '1 Half-Day per month (12 per year).' WHERE id = 8");
$stmt->execute();
echo "✓ Updated ID:8 Monthly Half Day description\n";

echo "\n=== FINAL LEAVE TYPES ===\n";
$stmt = $db->query('SELECT id, name, code, default_days, description FROM leave_types ORDER BY id');
$types = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($types as $t) {
    echo "ID:{$t['id']} | {$t['name']} ({$t['code']}) | Days:{$t['default_days']} | Desc: {$t['description']}\n";
}

echo "\nAll done!\n";
?>
