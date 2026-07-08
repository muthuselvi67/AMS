<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $db->exec("ALTER TABLE users ADD COLUMN about VARCHAR(255) DEFAULT 'Available' AFTER name");
    echo "Column added successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
