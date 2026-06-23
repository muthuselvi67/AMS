<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

try {
    // Modify the type column in holidays table
    $alterTable = "
    ALTER TABLE `holidays` 
    MODIFY COLUMN `type` ENUM('government', 'bank', 'working_saturday', 'floating_leave', 'national', 'regional', 'company', 'optional') DEFAULT 'government';
    ";
    
    $db->exec($alterTable);
    echo "Column 'type' in 'holidays' table updated successfully.\n";

} catch (PDOException $e) {
    die("Error updating database schema: " . $e->getMessage() . "\n");
}
