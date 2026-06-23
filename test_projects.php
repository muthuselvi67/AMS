<?php
require 'server/config/Database.php';
$db = (new Database())->getConnection();
$stmt = $db->query('SELECT id, name FROM projects LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
