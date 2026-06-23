<?php
$host = 'localhost';
$db   = 'lms_db';
$user = 'root';
$pass = '12345678';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Check if cover_photo column exists, if not add it
$check = $conn->query("SHOW COLUMNS FROM users LIKE 'cover_photo'");
if ($check->num_rows == 0) {
    $conn->query("ALTER TABLE users ADD COLUMN cover_photo LONGTEXT NULL");
    echo "Added cover_photo column to users table.\n";
} else {
    echo "cover_photo column already exists.\n";
}

$conn->close();
?>
