<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

// Check if table exists
$check = $db->query("SHOW TABLES LIKE 'time_logs'")->fetchAll();

if (count($check) === 0) {
    echo "time_logs table MISSING - creating now...\n";
    $db->exec("
        CREATE TABLE `time_logs` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `task_id` INT DEFAULT NULL,
          `project_id` INT NOT NULL,
          `user_id` INT NOT NULL,
          `date` DATE NOT NULL,
          `hours` DECIMAL(5,2) NOT NULL DEFAULT 0,
          `description` TEXT DEFAULT NULL,
          `type` ENUM('billable','non-billable') DEFAULT 'billable',
          `is_approved` TINYINT(1) DEFAULT 0,
          `approved_by_id` INT DEFAULT NULL,
          `approved_at` DATETIME DEFAULT NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
          FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
          FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
          FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "time_logs table CREATED successfully!\n";
} else {
    echo "time_logs table already EXISTS.\n";
    // Show columns
    $cols = $db->query("DESCRIBE time_logs")->fetchAll(PDO::FETCH_ASSOC);
    echo "Columns: " . implode(', ', array_column($cols, 'Field')) . "\n";
}

// Check projects table
$proj = $db->query("SHOW TABLES LIKE 'projects'")->fetchAll();
echo "projects table: " . (count($proj) ? "EXISTS" : "MISSING") . "\n";

// Check tasks table
$task = $db->query("SHOW TABLES LIKE 'tasks'")->fetchAll();
echo "tasks table: " . (count($task) ? "EXISTS" : "MISSING") . "\n";

echo "\nDone!\n";
?>
