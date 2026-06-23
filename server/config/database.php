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
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
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
