<?php
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "ALTER TABLE users 
              ADD COLUMN bank_name VARCHAR(100) NULL,
              ADD COLUMN account_name VARCHAR(100) NULL,
              ADD COLUMN account_number VARCHAR(50) NULL,
              ADD COLUMN ifsc_code VARCHAR(20) NULL";
              
    $db->exec($query);
    echo "Successfully added bank details columns to users table.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Columns already exist.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
