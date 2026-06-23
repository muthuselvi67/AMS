<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    
    // Update Padmesh for Kamala
    $stmt1 = $db->prepare("UPDATE task_handovers SET task_description = ? WHERE leave_request_id = ? AND assigned_to_id = ?");
    $stmt1->execute(['Covering API development and server monitoring', 24, 91]);
    
    // Update Thirumoorthi for Kamala
    $stmt2 = $db->prepare("UPDATE task_handovers SET task_description = ? WHERE leave_request_id = ? AND assigned_to_id = ?");
    $stmt2->execute(['Handling urgent client queries and support tickets', 24, 95]);
    
    // Update whatever RAJA PANDI has
    // Let's just update ALL task handovers that don't have a task description to have a default one.
    $stmt3 = $db->query("UPDATE task_handovers SET task_description = 'Covering daily tasks' WHERE task_description IS NULL");
    
    echo "Handovers updated with descriptions!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
