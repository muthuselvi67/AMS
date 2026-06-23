<?php
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "
    CREATE TABLE IF NOT EXISTS task_handovers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leave_request_id INT NOT NULL,
        assigned_by_id INT NOT NULL,
        assigned_to_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
              
    $db->exec($query);
    echo "Successfully created task_handovers table.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
