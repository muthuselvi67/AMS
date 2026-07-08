<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

try {
    $sql = "CREATE TABLE IF NOT EXISTS meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        meeting_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        link VARCHAR(255),
        organizer_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $db->exec($sql);
    echo "Meetings table created successfully.\n";

} catch (PDOException $e) {
    die("Error creating meetings table: " . $e->getMessage() . "\n");
}
?>
