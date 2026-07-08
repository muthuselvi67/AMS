<?php

class Database {
    private $host = "localhost";
    private $db_name = "lms_db"; // Make sure to create this database in MySQL
    private $username = "root"; // Default XAMPP username
    private $password = "12345678"; // Default XAMPP password is empty
    public $conn;
    

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4", $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8mb4");
            try {
                $this->conn->exec("ALTER TABLE chat_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $this->conn->exec("
                    CREATE TABLE IF NOT EXISTS chat_poll_votes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        message_id INT NOT NULL,
                        user_id INT NOT NULL,
                        option_index INT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_vote (message_id, user_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
            } catch (Exception $e) {
                // Ignore if table doesn't exist yet
            }
        } catch(PDOException $exception) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                "status" => false,
                "message" => "Database connection failed: " . $exception->getMessage()
            ]);
            exit();
        }

        return $this->conn;
    }
}
