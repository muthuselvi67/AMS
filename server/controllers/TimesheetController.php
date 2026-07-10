<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/Response.php';

class TimesheetController {
    private $db;
    private $method;
    private $id;
    private $user;
    private $subId;

    public function __construct($db, $method, $id, $user, $subId = null) {
        $this->db = $db;
        $this->method = $method;
        $this->id = $id;
        $this->user = $user;
        $this->subId = $subId;
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, 'Unauthorized', null, 401);
            return;
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id === 'my') {
                    $this->getMyTimesheets();
                } else if ($this->id === 'all') {
                    if ($this->user['role'] === 'employee') {
                        Response::json(false, 'Forbidden', null, 403);
                    } else {
                        $this->getAllTimesheets();
                    }
                } else {
                    Response::json(false, 'Invalid endpoint', null, 404);
                }
                break;

            case 'POST':
                if ($this->id === 'create') {
                    $this->createTimesheet();
                } else {
                    Response::json(false, 'Invalid endpoint', null, 404);
                }
                break;

            case 'PUT':
                if ($this->id === 'status' && $this->subId) {
                    if ($this->user['role'] === 'employee') {
                        Response::json(false, 'Forbidden', null, 403);
                    } else {
                        $this->updateTimesheetStatus($this->subId);
                    }
                } else if ($this->id) {
                    $this->updateTimesheet($this->id);
                } else {
                    Response::json(false, 'Invalid endpoint', null, 404);
                }
                break;

            case 'DELETE':
                if ($this->id) {
                    $this->deleteTimesheet($this->id);
                } else {
                    Response::json(false, 'Invalid endpoint', null, 404);
                }
                break;

            default:
                Response::json(false, 'Method not allowed', null, 405);
                break;
        }
    }

    private function getMyTimesheets() {
        try {
            $query = "SELECT * FROM timesheets WHERE user_id = :user_id ORDER BY date DESC, created_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute([':user_id' => $this->user['id']]);
            $timesheets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            Response::json(true, 'Fetched successfully', ['timesheets' => $timesheets]);
        } catch (PDOException $e) {
            Response::json(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    private function getAllTimesheets() {
        try {
            $query = "SELECT t.*, u.name as employee_name, u.email, u.department 
                      FROM timesheets t 
                      JOIN users u ON t.user_id = u.id 
                      ORDER BY t.date DESC, t.created_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $timesheets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            Response::json(true, 'Fetched all successfully', ['timesheets' => $timesheets]);
        } catch (PDOException $e) {
            Response::json(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    private function createTimesheet() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['date']) || !isset($data['task'])) {
            Response::json(false, 'Date and Task are required', null, 400);
            return;
        }

        try {
            $query = "INSERT INTO timesheets 
                        (user_id, date, task, time_in, time_out, break_duration, lunch_duration, total_hours) 
                      VALUES 
                        (:user_id, :date, :task, :time_in, :time_out, :break_duration, :lunch_duration, :total_hours)";
            
            $stmt = $this->db->prepare($query);
            $breakDuration = isset($data['break_duration']) ? (int)$data['break_duration'] : 0;
            $lunchDuration = isset($data['lunch_duration']) ? (int)$data['lunch_duration'] : 0;
            $totalHours = isset($data['total_hours']) ? (float)$data['total_hours'] : 0;

            $stmt->execute([
                ':user_id' => $this->user['id'],
                ':date' => $data['date'],
                ':task' => $data['task'],
                ':time_in' => $data['time_in'] ?? null,
                ':time_out' => $data['time_out'] ?? null,
                ':break_duration' => $breakDuration,
                ':lunch_duration' => $lunchDuration,
                ':total_hours' => $totalHours
            ]);
            
            Response::json(true, 'Timesheet entry created successfully', null, 201);
        } catch (PDOException $e) {
            Response::json(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    private function updateTimesheetStatus($timesheetId) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['status'])) {
            Response::json(false, 'Status is required', null, 400);
            return;
        }

        if (!in_array($data['status'], ['pending', 'approved', 'rejected'])) {
            Response::json(false, 'Invalid status', null, 400);
            return;
        }

        try {
            $query = "UPDATE timesheets SET status = :status WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':status' => $data['status'],
                ':id' => $timesheetId
            ]);
            
            Response::json(true, 'Timesheet status updated successfully');
        } catch (PDOException $e) {
            Response::json(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    private function updateTimesheet($timesheetId) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['date']) || !isset($data['task'])) {
            Response::json(false, 'Date and Task are required', null, 400);
            return;
        }

        try {
            // First check if user owns this timesheet
            $checkStmt = $this->db->prepare("SELECT user_id, status FROM timesheets WHERE id = :id");
            $checkStmt->execute([':id' => $timesheetId]);
            $timesheet = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$timesheet || $timesheet['user_id'] != $this->user['id']) {
                Response::json(false, 'Timesheet not found or unauthorized', null, 403);
                return;
            }

            if ($timesheet['status'] === 'approved') {
                Response::json(false, 'Cannot edit an approved timesheet', null, 400);
                return;
            }

            $query = "UPDATE timesheets SET 
                        date = :date, 
                        task = :task, 
                        time_in = :time_in, 
                        time_out = :time_out, 
                        break_duration = :break_duration, 
                        lunch_duration = :lunch_duration, 
                        total_hours = :total_hours
                      WHERE id = :id AND user_id = :user_id";
            
            $stmt = $this->db->prepare($query);
            $breakDuration = isset($data['break_duration']) ? (int)$data['break_duration'] : 0;
            $lunchDuration = isset($data['lunch_duration']) ? (int)$data['lunch_duration'] : 0;
            $totalHours = isset($data['total_hours']) ? (float)$data['total_hours'] : 0;

            $stmt->execute([
                ':id' => $timesheetId,
                ':user_id' => $this->user['id'],
                ':date' => $data['date'],
                ':task' => $data['task'],
                ':time_in' => $data['time_in'] ?? null,
                ':time_out' => $data['time_out'] ?? null,
                ':break_duration' => $breakDuration,
                ':lunch_duration' => $lunchDuration,
                ':total_hours' => $totalHours
            ]);
            
            Response::json(true, 'Timesheet updated successfully', null, 200);
        } catch (PDOException $e) {
            Response::json(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    private function deleteTimesheet($timesheetId) {
        try {
            // First check if user owns this timesheet
            $checkStmt = $this->db->prepare("SELECT user_id, status FROM timesheets WHERE id = :id");
            $checkStmt->execute([':id' => $timesheetId]);
            $timesheet = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$timesheet || $timesheet['user_id'] != $this->user['id']) {
                Response::json(false, 'Timesheet not found or unauthorized', null, 403);
                return;
            }

            if ($timesheet['status'] === 'approved') {
                Response::json(false, 'Cannot delete an approved timesheet', null, 400);
                return;
            }

            $query = "DELETE FROM timesheets WHERE id = :id AND user_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':id' => $timesheetId,
                ':user_id' => $this->user['id']
            ]);
            
            Response::json(true, 'Timesheet deleted successfully', null, 200);
        } catch (PDOException $e) {
            Response::json(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }
}
