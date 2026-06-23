<?php
require 'server/config/Database.php';
$db = (new Database())->getConnection();
$stmt = $db->query('DESCRIBE task_handovers');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
