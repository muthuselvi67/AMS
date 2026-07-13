<?php 
require 'config/database.php'; 
$db = (new Database())->getConnection(); 
try { 
    $stmt = $db->query('SELECT t.*, u.name as employee_name, u.email, u.department FROM timesheets t JOIN users u ON t.user_id = u.id ORDER BY t.date DESC, t.created_at DESC LIMIT 1'); 
    print_r($stmt->fetchAll()); 
    echo "SUCCESS"; 
} catch (Exception $e) { 
    echo $e->getMessage(); 
}
