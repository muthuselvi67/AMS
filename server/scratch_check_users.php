<?php
require_once __DIR__ . '/config/database.php';

$db = (new Database())->getConnection();

$stmt = $db->query("SELECT * FROM users WHERE name LIKE '%MUTHUSELVI%' OR id = 2");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

print_r($users);
?>
