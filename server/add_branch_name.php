<?php
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "ALTER TABLE users ADD COLUMN branch_name VARCHAR(100) NULL";
              
    $db->exec($query);
    echo "Successfully added branch_name column to users table.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
