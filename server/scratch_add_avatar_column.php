<?php
require_once __DIR__ . '/config/database.php';
try {
    $db = new Database();
    $conn = $db->getConnection();
    $conn->exec("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL;");
    echo "Avatar column added successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
