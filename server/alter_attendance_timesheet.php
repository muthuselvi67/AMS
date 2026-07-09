<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$sql = "ALTER TABLE attendances 
        ADD COLUMN break_minutes INT DEFAULT 0,
        ADD COLUMN overtime_hours DECIMAL(5,2) DEFAULT 0.00,
        ADD COLUMN task_done TEXT DEFAULT NULL,
        ADD COLUMN remarks TEXT DEFAULT NULL,
        ADD COLUMN timesheet_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'";

try {
    $db->exec($sql);
    echo "Columns added successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Columns already exist.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
