<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

$colsToAdd = [
    'check_in_photo' => 'LONGTEXT',
    'check_out_photo' => 'LONGTEXT',
    'check_in_latitude' => 'DECIMAL(10, 8)',
    'check_in_longitude' => 'DECIMAL(11, 8)',
    'check_in_address' => 'TEXT',
    'check_in_accuracy' => 'DECIMAL(10, 2)',
    'check_out_latitude' => 'DECIMAL(10, 8)',
    'check_out_longitude' => 'DECIMAL(11, 8)',
    'check_out_address' => 'TEXT',
    'check_out_accuracy' => 'DECIMAL(10, 2)',
];

foreach ($colsToAdd as $col => $type) {
    try {
        $db->exec("ALTER TABLE attendances ADD COLUMN $col $type");
        echo "Added $col\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), "Duplicate column name") !== false) {
            echo "$col already exists\n";
        } else {
            echo "Error adding $col: " . $e->getMessage() . "\n";
        }
    }
}
echo "Migration finished.\n";
