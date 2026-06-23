<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $db->exec("ALTER TABLE users ADD COLUMN id_card_photo MEDIUMTEXT DEFAULT NULL");
    echo "Added column 'id_card_photo' to 'users' table.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), "Duplicate column name") !== false) {
        echo "Column 'id_card_photo' already exists in 'users' table.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
echo "Migration finished.\n";
?>
