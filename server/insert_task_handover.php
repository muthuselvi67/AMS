<?php
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $sql = "INSERT INTO leave_types (name, code, default_days, color, description) 
            VALUES (:name, :code, :default_days, :color, :description)";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([
        'name' => 'Task Hand Over',
        'code' => 'THO',
        'default_days' => 5,
        'color' => '#6366F1', // Indigo color for contrast
        'description' => 'Time allocated for handing over tasks to colleagues.'
    ]);
    
    echo "Successfully added 'Task Hand Over' to leave types.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
