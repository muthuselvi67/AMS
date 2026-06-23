<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    
    // Insert for Padmesh
    $stmt1 = $db->prepare("INSERT INTO task_handovers (leave_request_id, assigned_by_id, assigned_to_id, status) VALUES (?, ?, ?, ?)");
    $stmt1->execute([24, 97, 91, 'accepted']);
    
    // Insert for Thirumoorthi
    $stmt2 = $db->prepare("INSERT INTO task_handovers (leave_request_id, assigned_by_id, assigned_to_id, status) VALUES (?, ?, ?, ?)");
    $stmt2->execute([24, 97, 95, 'pending']);
    
    echo "Handovers added successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
