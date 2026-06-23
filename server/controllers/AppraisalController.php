<?php

class AppraisalController {
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
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id) {
                    $this->getAppraisal($this->id);
                } else {
                    $this->getAllAppraisals();
                }
                break;
            case 'POST':
                $this->createAppraisal();
                break;
            case 'PUT':
                $this->updateAppraisal($this->id);
                break;
            case 'DELETE':
                $this->deleteAppraisal($this->id);
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getAllAppraisals() {
        $query = "SELECT a.*, 
                  u.name as employee_name, u.department as employee_department,
                  r.name as reviewer_name
                  FROM appraisals a
                  LEFT JOIN users u ON a.employee_id = u.id
                  LEFT JOIN users r ON a.reviewer_id = r.id";
        
        $params = [];
        if ($this->user['role'] === 'employee') {
            $query .= " WHERE a.employee_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        }

        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $query .= ($this->user['role'] === 'employee' ? " AND" : " WHERE") . " a.status = :status";
            $params[':status'] = $_GET['status'];
        }

        $query .= " ORDER BY a.created_at DESC";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format ratings for frontend
        foreach ($records as &$record) {
            $record['ratings'] = [
                'performance' => (int)$record['rating_performance'],
                'communication' => (int)$record['rating_communication'],
                'teamwork' => (int)$record['rating_teamwork'],
                'leadership' => (int)$record['rating_leadership'],
                'innovation' => (int)$record['rating_innovation']
            ];
            $record['employee'] = [
                'id' => $record['employee_id'],
                'name' => $record['employee_name'],
                'department' => $record['employee_department']
            ];
            $record['reviewer'] = [
                'id' => $record['reviewer_id'],
                'name' => $record['reviewer_name']
            ];
            
            // Calculate avgRating
            $record['avgRating'] = array_sum($record['ratings']) / count($record['ratings']);
        }

        Response::json(true, "Appraisals fetched successfully", ['appraisals' => $records], 200);
    }

    private function getAppraisal($id) {
        $query = "SELECT a.*, 
                  u.name as employee_name, u.department as employee_department,
                  r.name as reviewer_name
                  FROM appraisals a
                  LEFT JOIN users u ON a.employee_id = u.id
                  LEFT JOIN users r ON a.reviewer_id = r.id
                  WHERE a.id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            $record['ratings'] = [
                'performance' => (int)$record['rating_performance'],
                'communication' => (int)$record['rating_communication'],
                'teamwork' => (int)$record['rating_teamwork'],
                'leadership' => (int)$record['rating_leadership'],
                'innovation' => (int)$record['rating_innovation']
            ];
            $record['employee'] = [
                'id' => $record['employee_id'],
                'name' => $record['employee_name'],
                'department' => $record['employee_department']
            ];
            $record['reviewer'] = [
                'id' => $record['reviewer_id'],
                'name' => $record['reviewer_name']
            ];
            $record['avgRating'] = array_sum($record['ratings']) / count($record['ratings']);

            Response::json(true, "Appraisal fetched successfully", $record, 200);
        } else {
            Response::json(false, "Appraisal not found", null, 404);
        }
    }

    private function createAppraisal() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['employee']) || !isset($data['period'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $ratings = $data['ratings'] ?? [];
        $p = $ratings['performance'] ?? 3;
        $c = $ratings['communication'] ?? 3;
        $t = $ratings['teamwork'] ?? 3;
        $l = $ratings['leadership'] ?? 3;
        $i = $ratings['innovation'] ?? 3;

        $query = "INSERT INTO appraisals (employee_id, reviewer_id, period, rating_performance, rating_communication, rating_teamwork, rating_leadership, rating_innovation, comments, status) 
                  VALUES (:employee_id, :reviewer_id, :period, :p, :c, :t, :l, :i, :comments, :status)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':employee_id', $data['employee']);
        $stmt->bindParam(':reviewer_id', $this->user['id']);
        $stmt->bindParam(':period', $data['period']);
        $stmt->bindParam(':p', $p);
        $stmt->bindParam(':c', $c);
        $stmt->bindParam(':t', $t);
        $stmt->bindParam(':l', $l);
        $stmt->bindParam(':i', $i);
        $stmt->bindParam(':comments', $data['comments']);
        $stmt->bindParam(':status', $data['status']);

        if ($stmt->execute()) {
            Response::json(true, "Appraisal created successfully", ["id" => $this->db->lastInsertId()], 201);
        } else {
            Response::json(false, "Error creating appraisal", null, 500);
        }
    }

    private function updateAppraisal($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id) {
            Response::json(false, "Invalid ID", null, 400);
            return;
        }

        $ratings = $data['ratings'] ?? [];
        $p = $ratings['performance'] ?? 3;
        $c = $ratings['communication'] ?? 3;
        $t = $ratings['teamwork'] ?? 3;
        $l = $ratings['leadership'] ?? 3;
        $i = $ratings['innovation'] ?? 3;

        $query = "UPDATE appraisals SET 
                  period = :period,
                  rating_performance = :p,
                  rating_communication = :c,
                  rating_teamwork = :t,
                  rating_leadership = :l,
                  rating_innovation = :i,
                  comments = :comments,
                  status = :status
                  WHERE id = :id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':period', $data['period']);
        $stmt->bindParam(':p', $p);
        $stmt->bindParam(':c', $c);
        $stmt->bindParam(':t', $t);
        $stmt->bindParam(':l', $l);
        $stmt->bindParam(':i', $i);
        $stmt->bindParam(':comments', $data['comments']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':id', $id);

        if ($stmt->execute()) {
            Response::json(true, "Appraisal updated successfully", null, 200);
        } else {
            Response::json(false, "Failed to update appraisal", null, 500);
        }
    }

    private function deleteAppraisal($id) {
        if (!$id) {
            Response::json(false, "Invalid ID", null, 400);
            return;
        }

        $query = "DELETE FROM appraisals WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);

        if ($stmt->execute()) {
            Response::json(true, "Appraisal deleted successfully", null, 200);
        } else {
            Response::json(false, "Failed to delete appraisal", null, 500);
        }
    }
}
