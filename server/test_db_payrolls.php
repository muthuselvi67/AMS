<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();
$stmt = $db->query('SELECT id, name, is_active, salary_base, salary_hra, salary_transport, salary_other, salary_pf, salary_tax FROM users WHERE name LIKE "%MUTHUSELVI%"');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
