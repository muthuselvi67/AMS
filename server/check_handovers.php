<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $stmt = $db->query('SELECT lr.id, lr.leave_type_id, lt.name as leave_type_name FROM leave_requests lr LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id ORDER BY lr.id DESC LIMIT 5');
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
