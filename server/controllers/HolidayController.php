<?php

class HolidayController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;

    public function __construct($db, $requestMethod, $id, $user) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
        }

        switch ($this->requestMethod) {
            case 'GET':
                $this->getHolidays();
                break;
            case 'POST':
                if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
                    Response::json(false, "Forbidden", null, 403);
                }
                $this->createHoliday();
                break;
            case 'PUT':
                if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
                    Response::json(false, "Forbidden", null, 403);
                }
                $this->updateHoliday();
                break;
            case 'DELETE':
                if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
                    Response::json(false, "Forbidden", null, 403);
                }
                $this->deleteHoliday();
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getHolidays() {
        $query = "SELECT * FROM holidays ORDER BY date ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::json(true, "Holidays fetched successfully", $holidays, 200);
    }

    private function createHoliday() {
        $data = json_decode(file_get_contents("php://input"), true);
        if(!isset($data['name']) || !isset($data['date'])) {
            Response::json(false, "Missing required fields", null, 400);
        }

        $query = "INSERT INTO holidays (name, date, type, description) VALUES (:name, :date, :type, :description)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':date', $data['date']);
        $type = isset($data['type']) ? $data['type'] : 'national';
        $stmt->bindParam(':type', $type);
        $desc = isset($data['description']) ? $data['description'] : '';
        $stmt->bindParam(':description', $desc);
        
        if($stmt->execute()) {
            Response::json(true, "Holiday added successfully", ["id" => $this->db->lastInsertId()], 201);
        } else {
            Response::json(false, "Error adding holiday", null, 500);
        }
    }

    private function updateHoliday() {
        if (!$this->id) {
            Response::json(false, "Missing holiday ID", null, 400);
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if(!isset($data['name']) || !isset($data['date'])) {
            Response::json(false, "Missing required fields", null, 400);
        }

        $query = "UPDATE holidays SET name = :name, date = :date, type = :type, description = :description WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':date', $data['date']);
        $type = isset($data['type']) ? $data['type'] : 'national';
        $stmt->bindParam(':type', $type);
        $desc = isset($data['description']) ? $data['description'] : '';
        $stmt->bindParam(':description', $desc);
        $stmt->bindParam(':id', $this->id);
        
        if($stmt->execute()) {
            Response::json(true, "Holiday updated successfully", null, 200);
        } else {
            Response::json(false, "Error updating holiday", null, 500);
        }
    }

    private function deleteHoliday() {
        if (!$this->id) {
            Response::json(false, "Missing holiday ID", null, 400);
        }

        $query = "DELETE FROM holidays WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $this->id);
        
        if($stmt->execute()) {
            Response::json(true, "Holiday deleted successfully", null, 200);
        } else {
            Response::json(false, "Error deleting holiday", null, 500);
        }
    }
}
?>
