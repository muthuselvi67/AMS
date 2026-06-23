<?php
require 'server/config/Database.php';
$db = (new Database())->getConnection();
$stmt = $db->query('SELECT * FROM leave_requests ORDER BY id DESC LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
