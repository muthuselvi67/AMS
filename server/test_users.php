<?php
$host = "127.0.0.1";
$db_name = "lms_db";
$username = "root";
$password = "12345678";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully to database.\n";
    
    $stmt = $conn->query("SELECT email, password FROM users LIMIT 1");
    if ($stmt) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Found user: " . json_encode($user) . "\n";
    } else {
        echo "Users table might be empty.\n";
    }
} catch(PDOException $e) {
    echo "Connection error: " . $e->getMessage() . "\n";
}
?>
