<?php
$host = "127.0.0.1";
$db_name = "lms_db";
$username = "root";
$password = "12345678";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "--- LEAVE REQUESTS ---\n";
    $stmt = $conn->query("SELECT lr.id, lr.employee_id, lr.leave_type_id, lt.name as type_name, lt.code as type_code, lr.start_date, lr.end_date, lr.status 
                          FROM leave_requests lr
                          LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id");
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($requests as $r) {
        echo "ID: {$r['id']} | Emp: {$r['employee_id']} | TypeID: {$r['leave_type_id']} | Name: {$r['type_name']} ({$r['type_code']}) | Dates: {$r['start_date']} to {$r['end_date']} | Status: {$r['status']}\n";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
