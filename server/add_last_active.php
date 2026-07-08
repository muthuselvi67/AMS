<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
try {
    $db->exec("ALTER TABLE users ADD COLUMN last_active DATETIME NULL");
    echo "Column last_active added successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
