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
            } catch (Exception $e) {}

            try {
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
            } catch (Exception $e) {}

            try {
                $this->conn->exec("
                    CREATE TABLE IF NOT EXISTS women_safety_reports (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        employee_id INT NOT NULL,
                        concern_type VARCHAR(100) NOT NULL,
                        subject VARCHAR(255) DEFAULT 'Workplace Safety Concern',
                        description TEXT NOT NULL,
                        incident_date DATE NOT NULL,
                        location VARCHAR(255) DEFAULT 'Workplace Campus',
                        person_involved VARCHAR(255) DEFAULT NULL,
                        supporting_info TEXT DEFAULT NULL,
                        confidential TINYINT(1) DEFAULT 1,
                        status ENUM('Submitted', 'Under Review', 'Assigned', 'Action in Progress', 'Resolved', 'Closed') DEFAULT 'Submitted',
                        assigned_to VARCHAR(255) DEFAULT NULL,
                        hr_notes TEXT DEFAULT NULL,
                        action_taken TEXT DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
            } catch (Exception $e) {}

            try {
                $this->conn->exec("
                    CREATE TABLE IF NOT EXISTS women_safety_emergency_requests (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        employee_id INT NOT NULL,
                        request_type VARCHAR(100) DEFAULT 'SOS Emergency Alert',
                        location VARCHAR(255) DEFAULT 'Campus / Workplace Area',
                        status ENUM('Emergency Raised', 'Acknowledged', 'In Progress', 'Resolved') DEFAULT 'Emergency Raised',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        acknowledged_at DATETIME DEFAULT NULL,
                        resolved_at DATETIME DEFAULT NULL,
                        FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
            } catch (Exception $e) {}

            try { $this->conn->exec("ALTER TABLE women_safety_reports MODIFY COLUMN concern_type VARCHAR(255) DEFAULT 'General Grievance'"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports ADD COLUMN IF NOT EXISTS sub_category VARCHAR(255) DEFAULT NULL"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports ADD COLUMN IF NOT EXISTS subject VARCHAR(255) DEFAULT 'Workplace Concern'"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports ADD COLUMN IF NOT EXISTS person_involved VARCHAR(255) DEFAULT NULL"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports ADD COLUMN IF NOT EXISTS supporting_info TEXT DEFAULT NULL"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports ADD COLUMN IF NOT EXISTS action_taken TEXT DEFAULT NULL"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports MODIFY COLUMN status ENUM('Submitted', 'Under Review', 'Assigned', 'Action in Progress', 'Resolved', 'Closed') DEFAULT 'Submitted'"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE women_safety_reports MODIFY COLUMN assigned_to VARCHAR(255) DEFAULT NULL"); } catch(Exception $e){}
            try { $this->conn->exec("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) DEFAULT 'general'"); } catch(Exception $e){}
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
