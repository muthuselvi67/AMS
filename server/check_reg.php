<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->query("SELECT * FROM attendance_regularizations");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
