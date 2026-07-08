<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

try {
    // Add attendees column to meetings table
    $sql = "ALTER TABLE meetings ADD COLUMN attendees TEXT NULL;";
    $db->exec($sql);
    echo "Attendees column added to meetings table successfully.\n";
} catch (PDOException $e) {
    die("Error altering meetings table: " . $e->getMessage() . "\n");
}
?>
