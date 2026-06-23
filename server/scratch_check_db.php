<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

echo "Resetting PM password...\n";
$newHash = password_hash('12345678', PASSWORD_DEFAULT);
$stmt = $db->prepare("UPDATE users SET password = :pwd WHERE role = 'pm' OR email = 'ganesanjamuna@gmail.com'");
$stmt->execute(['pwd' => $newHash]);
echo "Rows affected: " . $stmt->rowCount() . "\n";
?>
