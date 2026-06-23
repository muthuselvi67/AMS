<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

try {
    // 1. Add work_from_home column to attendances table if it doesn't exist
    $checkColumn = $db->query("SHOW COLUMNS FROM `attendances` LIKE 'work_from_home'");
    if ($checkColumn->rowCount() === 0) {
        $db->exec("ALTER TABLE `attendances` ADD COLUMN `work_from_home` TINYINT(1) DEFAULT 0 AFTER `status`");
        echo "Column 'work_from_home' added to 'attendances' table successfully.\n";
    } else {
        echo "Column 'work_from_home' already exists in 'attendances' table.\n";
    }

    // 2. Create wfh_updates table if it doesn't exist
    $createTable = "
    CREATE TABLE IF NOT EXISTS `wfh_updates` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `attendance_id` INT NOT NULL,
        `submitted_at` DATETIME NOT NULL,
        `update_text` TEXT NOT NULL,
        `is_final` TINYINT(1) DEFAULT 0,
        FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $db->exec($createTable);
    echo "Table 'wfh_updates' created/verified successfully.\n";

} catch (PDOException $e) {
    die("Error updating database schema: " . $e->getMessage() . "\n");
}
