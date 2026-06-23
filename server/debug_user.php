<?php
require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();
$stmt = $db->prepare('SELECT id, name, email, role FROM users');
$stmt->execute();
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($users, JSON_PRETTY_PRINT);
?>
