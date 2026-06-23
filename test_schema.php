<?php
require 'server/config/Database.php';
$db = (new Database())->getConnection();
$stmt = $db->query('DESCRIBE tasks');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
