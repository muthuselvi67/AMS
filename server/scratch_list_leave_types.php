<?php
$host = "127.0.0.1";
$db_name = "lms_db";
$username = "root";
$password = "12345678";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "--- LEAVE TYPES ---\n";
    $stmt = $conn->query("SELECT id, name, code, default_days, color, is_active FROM leave_types");
    $types = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($types as $t) {
        echo "ID: {$t['id']} | Name: {$t['name']} | Code: {$t['code']} | Days: {$t['default_days']} | Color: {$t['color']} | Active: {$t['is_active']}\n";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
