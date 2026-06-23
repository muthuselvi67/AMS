<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    echo "Adding photo columns to attendances table...\n";
    $sql = "ALTER TABLE attendances 
            ADD COLUMN check_in_photo LONGTEXT AFTER check_in_time,
            ADD COLUMN check_out_photo LONGTEXT AFTER check_out_time,
            ADD COLUMN check_in_latitude DECIMAL(10, 8) AFTER check_in_photo,
            ADD COLUMN check_in_longitude DECIMAL(11, 8) AFTER check_in_latitude,
            ADD COLUMN check_in_address TEXT AFTER check_in_longitude,
            ADD COLUMN check_in_accuracy DECIMAL(10, 2) AFTER check_in_address";
    
    $db->exec($sql);
    echo "Columns added successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // If table doesn't exist, create it
    if (strpos($e->getMessage(), "doesn't exist") !== false) {
        echo "Creating attendances table...\n";
        $sql = "CREATE TABLE attendances (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            date DATE NOT NULL,
            check_in_time DATETIME,
            check_in_photo LONGTEXT,
            check_in_latitude DECIMAL(10, 8),
            check_in_longitude DECIMAL(11, 8),
            check_in_address TEXT,
            check_in_accuracy DECIMAL(10, 2),
            check_out_time DATETIME,
            check_out_photo LONGTEXT,
            check_out_latitude DECIMAL(10, 8),
            check_out_longitude DECIMAL(11, 8),
            check_out_address TEXT,
            check_out_accuracy DECIMAL(10, 2),
            total_hours DECIMAL(5, 2),
            status ENUM('present', 'absent', 'late', 'on-leave') DEFAULT 'present',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (employee_id, date)
        )";
        $db->exec($sql);
        echo "Table created successfully.\n";
    }
}
