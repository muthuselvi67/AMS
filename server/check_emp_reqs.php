<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
$employeeId = 94;

$query = "SELECT r.*, u.name as employee_name, u.department as employee_department, u.avatar as employee_avatar
                  FROM attendance_regularizations r
                  JOIN users u ON r.employee_id = u.id WHERE r.employee_id = :emp_id";

$stmt = $db->prepare($query);
$stmt->bindValue(':emp_id', $employeeId);
$stmt->execute();
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
