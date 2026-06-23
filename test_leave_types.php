<?php
require 'server/config/Database.php';
$db = (new Database())->getConnection();
$stmt = $db->query("SELECT * FROM leave_types");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
