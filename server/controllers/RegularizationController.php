<?php

class RegularizationController {
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
                $this->getRequests();
                break;
            case 'POST':
                $this->createRequest();
                break;
            case 'PUT':
                if ($this->id) {
                    $this->updateRequestStatus();
                } else {
                    Response::json(false, "Request ID required", null, 400);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getRequests() {
        $isAdminOrHR = in_array($this->user['role'], ['admin', 'hr']);

        $query = "SELECT r.*, u.name as employee_name, u.department as employee_department, u.avatar as employee_avatar
                  FROM attendance_regularizations r
                  JOIN users u ON r.employee_id = u.id";

        $conditions = [];
        $params = [];

        // Employees can only see their own requests
        if (!$isAdminOrHR) {
            $conditions[] = "r.employee_id = :emp_id";
            $params[':emp_id'] = $this->user['id'];
        } else {
            // Optional filter by status for HR
            if (isset($_GET['status']) && $_GET['status'] !== 'all') {
                $conditions[] = "r.status = :status";
                $params[':status'] = $_GET['status'];
            }
            if (isset($_GET['employee_id']) && !empty($_GET['employee_id'])) {
                $conditions[] = "r.employee_id = :emp_id";
                $params[':emp_id'] = $_GET['employee_id'];
            }
        }

        if (count($conditions) > 0) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY r.created_at DESC";

        try {
            $stmt = $this->db->prepare($query);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->execute();
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format for frontend
            foreach ($records as &$r) {
                $r['employee'] = [
                    'id' => $r['employee_id'],
                    'name' => $r['employee_name'],
                    'department' => $r['employee_department'],
                    'avatar' => $r['employee_avatar']
                ];
            }

            Response::json(true, "Requests fetched successfully", $records, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function createRequest() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['date']) || !isset($input['reason'])) {
            Response::json(false, "Date and reason are required", null, 400);
            return;
        }

        $date = $input['date'];
        $checkInTime = isset($input['check_in_time']) && !empty($input['check_in_time']) ? $input['check_in_time'] : null;
        $checkOutTime = isset($input['check_out_time']) && !empty($input['check_out_time']) ? $input['check_out_time'] : null;
        $reason = $input['reason'];
        $employeeId = $this->user['id'];

        // Find existing attendance record if any
        $stmt = $this->db->prepare("SELECT id FROM attendances WHERE employee_id = :emp_id AND date = :date");
        $stmt->execute([':emp_id' => $employeeId, ':date' => $date]);
        $attendanceId = $stmt->fetchColumn() ?: null;

        // Check if there is an existing pending request for this date
        $checkStmt = $this->db->prepare("SELECT id FROM attendance_regularizations WHERE employee_id = :emp_id AND date = :date AND status = 'pending'");
        $checkStmt->execute([':emp_id' => $employeeId, ':date' => $date]);
        $existingPendingId = $checkStmt->fetchColumn();

        try {
            if ($existingPendingId) {
                // Update existing pending request
                $updateStmt = $this->db->prepare("UPDATE attendance_regularizations SET check_in_time = :check_in, check_out_time = :check_out, reason = :reason, updated_at = NOW() WHERE id = :id");
                $updateStmt->execute([
                    ':check_in' => $checkInTime,
                    ':check_out' => $checkOutTime,
                    ':reason' => $reason,
                    ':id' => $existingPendingId
                ]);
            } else {
                // Insert new request
                $insertStmt = $this->db->prepare("INSERT INTO attendance_regularizations (employee_id, attendance_id, date, check_in_time, check_out_time, reason, status) VALUES (:employee_id, :attendance_id, :date, :check_in_time, :check_out_time, :reason, 'pending')");
                $insertStmt->execute([
                    ':employee_id' => $employeeId,
                    ':attendance_id' => $attendanceId,
                    ':date' => $date,
                    ':check_in_time' => $checkInTime,
                    ':check_out_time' => $checkOutTime,
                    ':reason' => $reason
                ]);
            }

            // Notify HR
            try {
                $hrStmt = $this->db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
                $hrUsers = $hrStmt->fetchAll(PDO::FETCH_COLUMN);
                
                $empName = $this->user['name'] ?? 'An employee';
                
                // If name is not in JWT, fetch it
                if ($empName === 'An employee') {
                    $nameStmt = $this->db->prepare("SELECT name FROM users WHERE id = :id");
                    $nameStmt->execute([':id' => $this->user['id']]);
                    if ($fetchedName = $nameStmt->fetchColumn()) {
                        $empName = $fetchedName;
                    }
                }
                
                $msg = "$empName submitted an attendance regularization request for $date.";
                
                $notif = $this->db->prepare(
                    "INSERT INTO notifications (recipient_id, title, message, type, related_model, created_at)
                     VALUES (:uid, 'New Regularization Request', :msg, 'attendance', 'attendance_regularizations', NOW())"
                );
                foreach ($hrUsers as $hrId) {
                    $notif->execute([':uid' => $hrId, ':msg' => $msg]);
                }
            } catch (Exception $e) {}

            Response::json(true, "Regularization request submitted successfully", null, 201);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function updateRequestStatus() {
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Only HR or Admin can approve/reject requests", null, 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['status']) || !in_array($input['status'], ['approved', 'rejected'])) {
            Response::json(false, "Invalid status. Must be 'approved' or 'rejected'", null, 400);
            return;
        }

        $status = $input['status'];
        $hrRemark = $input['hr_remark'] ?? null;
        $hrReviewedBy = $this->user['id'];

        try {
            $this->db->beginTransaction();

            // Get request details
            $stmt = $this->db->prepare("SELECT * FROM attendance_regularizations WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $this->id]);
            $request = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$request) {
                $this->db->rollBack();
                Response::json(false, "Request not found", null, 404);
                return;
            }

            if ($request['status'] !== 'pending') {
                $this->db->rollBack();
                Response::json(false, "Request is already processed", null, 400);
                return;
            }

            // Update request status
            $updStmt = $this->db->prepare(
                "UPDATE attendance_regularizations 
                 SET status = :status, hr_remark = :hr_remark, hr_reviewed_by = :hr_reviewed_by, reviewed_at = NOW() 
                 WHERE id = :id"
            );
            $updStmt->execute([
                ':status' => $status,
                ':hr_remark' => $hrRemark,
                ':hr_reviewed_by' => $hrReviewedBy,
                ':id' => $this->id
            ]);

            // If approved, update or insert into attendances table
            if ($status === 'approved') {
                $attId = $request['attendance_id'];
                $checkIn = $request['check_in_time'];
                $checkOut = $request['check_out_time'];
                $date = $request['date'];
                $empId = $request['employee_id'];

                $totalHours = 0;
                if ($checkIn && $checkOut) {
                    $inTime = new DateTime($checkIn);
                    $outTime = new DateTime($checkOut);
                    $diff = $inTime->diff($outTime);
                    $totalHours = $diff->h + ($diff->i / 60);
                }

                if ($attId) {
                    $attUpd = $this->db->prepare(
                        "UPDATE attendances 
                         SET check_in_time = COALESCE(:check_in, check_in_time),
                             check_out_time = COALESCE(:check_out, check_out_time),
                             total_hours = CASE WHEN :check_in IS NOT NULL AND :check_out IS NOT NULL THEN :total_hours ELSE total_hours END,
                             status = 'present'
                         WHERE id = :att_id"
                    );
                    $attUpd->execute([
                        ':check_in' => $checkIn,
                        ':check_out' => $checkOut,
                        ':total_hours' => $totalHours,
                        ':att_id' => $attId
                    ]);
                } else {
                    $attIns = $this->db->prepare(
                        "INSERT INTO attendances (employee_id, date, check_in_time, check_out_time, total_hours, status)
                         VALUES (:emp_id, :date, :check_in, :check_out, :total_hours, 'present')"
                    );
                    $attIns->execute([
                        ':emp_id' => $empId,
                        ':date' => $date,
                        ':check_in' => $checkIn,
                        ':check_out' => $checkOut,
                        ':total_hours' => $totalHours
                    ]);
                    
                    // Update the request with the new attendance_id
                    $newAttId = $this->db->lastInsertId();
                    $linkStmt = $this->db->prepare("UPDATE attendance_regularizations SET attendance_id = :att_id WHERE id = :id");
                    $linkStmt->execute([':att_id' => $newAttId, ':id' => $this->id]);
                }
            }

            $this->db->commit();

            // Notify employee
            try {
                $msg = "Your regularization request for {$request['date']} was {$status}." . ($hrRemark ? " Remark: $hrRemark" : "");
                $notif = $this->db->prepare(
                    "INSERT INTO notifications (recipient_id, title, message, type, related_model, created_at)
                     VALUES (:uid, 'Regularization Request Updated', :msg, 'attendance', 'attendance_regularizations', NOW())"
                );
                $notif->execute([':uid' => $request['employee_id'], ':msg' => $msg]);
            } catch (Exception $e) {}

            Response::json(true, "Request $status successfully", null, 200);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::json(false, "Error: " . $e->getMessage(), null, 500);
        }
    }
}
