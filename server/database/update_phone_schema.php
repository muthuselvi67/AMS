<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Check if column already exists
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'phone_secondary'");
    $exists = $stmt->fetch();
    
    if (!$exists) {
        $db->exec("ALTER TABLE users ADD COLUMN phone_secondary VARCHAR(50) DEFAULT '' AFTER phone");
        echo "Column phone_secondary added to users table successfully.\n";
    } else {
        echo "Column phone_secondary already exists in users table.\n";
    }
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
