<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

$sql = "
CREATE TABLE IF NOT EXISTS `attendance_regularizations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `attendance_id` INT NULL,
  `date` DATE NOT NULL,
  `check_in_time` DATETIME NULL,
  `check_out_time` DATETIME NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  `hr_remark` TEXT,
  `hr_reviewed_by` INT NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`hr_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
";

try {
    $db->exec($sql);
    echo "Table attendance_regularizations created successfully.\n";
} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage() . "\n";
}
