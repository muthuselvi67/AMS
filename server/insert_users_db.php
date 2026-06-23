<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

$sql = file_get_contents(__DIR__ . '/../insert_users.sql');

try {
    $stmt = $db->prepare($sql);
    $stmt->execute();
    echo "Users inserted successfully.\n";
} catch (PDOException $e) {
    echo "Error inserting users: " . $e->getMessage() . "\n";
}
