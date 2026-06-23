<?php

class TaskHandoverController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;

    public function __construct($db, $requestMethod, $id, $user) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;

        // Auto-migrate: add is_replaced column to task_handovers if missing
        try {
            $checkCol = $this->db->query("SHOW COLUMNS FROM task_handovers LIKE 'is_replaced'");
            if ($checkCol->rowCount() === 0) {
                $this->db->exec("ALTER TABLE task_handovers ADD COLUMN is_replaced TINYINT(1) DEFAULT 0");
            }
        } catch (Exception $e) {}
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                $this->getAssignedHandovers();
                break;
            case 'PUT':
                $this->updateHandoverStatus($this->id);
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getAssignedHandovers() {
        $query = "SELECT th.id, th.status, th.created_at, th.updated_at, th.task_description,
                         lr.start_date, lr.end_date, lr.reason,
                         u.name as requested_by_name
                  FROM task_handovers th
                  JOIN leave_requests lr ON th.leave_request_id = lr.id
                  JOIN users u ON th.assigned_by_id = u.id
                  WHERE th.assigned_to_id = :assigned_to_id
                  ORDER BY th.created_at DESC";
                  
        $stmt = $this->db->prepare($query);
        $stmt->execute([':assigned_to_id' => $this->user['id']]);
        $handovers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(true, "Assigned handovers fetched successfully", ['handovers' => $handovers], 200);
    }

    private function updateHandoverStatus($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id) {
            Response::json(false, "Invalid request", null, 400);
            return;
        }

        // Get the handover to check ownership
        $checkStmt = $this->db->prepare("SELECT assigned_by_id, assigned_to_id, leave_request_id, status FROM task_handovers WHERE id = :id LIMIT 1");
        $checkStmt->execute([':id' => $id]);
        $handover = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$handover) {
            Response::json(false, "Handover not found", null, 404);
            return;
        }

        // If the assignee is updating the status (accept/reject)
        if ($this->user['id'] == $handover['assigned_to_id']) {
            if (!isset($data['status'])) {
                Response::json(false, "Missing status", null, 400);
                return;
            }
            $query = "UPDATE task_handovers SET status = :status, updated_at = NOW() WHERE id = :id";
            $stmt = $this->db->prepare($query);
            if ($stmt->execute([':status' => $data['status'], ':id' => $id])) {
                // Send notification to the creator
                $notifStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model) VALUES (:rid, :title, :msg, 'general', :rel_id, 'task_handovers')");
                $notifStmt->execute([
                    ':rid' => $handover['assigned_by_id'],
                    ':title' => "Task Handover " . ucfirst($data['status']),
                    ':msg' => "{$this->user['name']} has {$data['status']} your task handover request.",
                    ':rel_id' => $id
                ]);

                // Check if all active handovers for this leave request are now accepted
                if ($data['status'] === 'accepted') {
                    $checkAllStmt = $this->db->prepare("SELECT COUNT(*) as cnt FROM task_handovers WHERE leave_request_id = :lrid AND status != 'accepted' AND is_replaced = 0");
                    $checkAllStmt->execute([':lrid' => $handover['leave_request_id']]);
                    $res = $checkAllStmt->fetch(PDO::FETCH_ASSOC);
                    if ($res && $res['cnt'] == 0) {
                        $this->sendLeaveAppliedNotificationToAdmins($handover['leave_request_id']);
                    }
                }

                Response::json(true, "Handover status updated successfully", null, 200);
            } else {
                Response::json(false, "Failed to update handover status", null, 500);
            }
            return;
        }

        // If the creator is reassigning the task
        if ($this->user['id'] == $handover['assigned_by_id']) {
            if (!isset($data['assigned_to_id'])) {
                Response::json(false, "Missing new assignee ID", null, 400);
                return;
            }
            $newAssigneeId = $data['assigned_to_id'];
            $taskDescription = $data['task_description'] ?? '';

            // If the old handover is pending, we can just update it
            if ($handover['status'] === 'pending') {
                $query = "UPDATE task_handovers SET assigned_to_id = :assigned_to_id, task_description = :task_description, status = 'pending', updated_at = NOW() WHERE id = :id";
                $stmt = $this->db->prepare($query);
                $execParams = [':assigned_to_id' => $newAssigneeId, ':task_description' => $taskDescription, ':id' => $id];
            } else {
                // Mark the old handover as replaced
                $this->db->prepare("UPDATE task_handovers SET is_replaced = 1 WHERE id = :id")->execute([':id' => $id]);

                // Insert a new row to preserve history
                $query = "INSERT INTO task_handovers (leave_request_id, assigned_by_id, assigned_to_id, task_description, status, is_replaced, created_at, updated_at) 
                          VALUES (:leave_request_id, :assigned_by_id, :assigned_to_id, :task_description, 'pending', 0, NOW(), NOW())";
                $stmt = $this->db->prepare($query);
                $execParams = [
                    ':leave_request_id' => $handover['leave_request_id'],
                    ':assigned_by_id' => $this->user['id'],
                    ':assigned_to_id' => $newAssigneeId,
                    ':task_description' => $taskDescription
                ];
            }

            if ($stmt->execute($execParams)) {
                $newId = ($handover['status'] === 'pending') ? $id : $this->db->lastInsertId();

                // Send notification to the new assignee
                $empName = $this->user['name'] ?? 'An employee';
                $notifStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model) VALUES (:rid, :title, :msg, 'general', :rel_id, 'task_handovers')");
                $notifStmt->execute([
                    ':rid' => $newAssigneeId,
                    ':title' => "Task Handover Assigned",
                    ':msg' => "{$empName} has assigned tasks to you during their leave. Please review.",
                    ':rel_id' => $newId
                ]);
                Response::json(true, "Handover reassigned successfully", null, 200);
            } else {
                Response::json(false, "Failed to reassign handover", null, 500);
            }
            return;
        }

        Response::json(false, "Forbidden", null, 403);
    }

    private function sendLeaveAppliedNotificationToAdmins($leaveRequestId) {
        try {
            $stmt = $this->db->prepare("
                SELECT lr.start_date, lr.end_date, lt.name as leave_type_name, u.name as employee_name, u.manager_id
                FROM leave_requests lr
                JOIN leave_types lt ON lr.leave_type_id = lt.id
                JOIN users u ON lr.employee_id = u.id
                WHERE lr.id = :id LIMIT 1
            ");
            $stmt->execute([':id' => $leaveRequestId]);
            $leave = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$leave) return;

            $empName = $leave['employee_name'];
            $ltName = $leave['leave_type_name'];
            $startDate = $leave['start_date'];
            $endDate = $leave['end_date'];
            $managerId = $leave['manager_id'];

            // Get admins and hr
            $recipStmt = $this->db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
            $recipients = $recipStmt->fetchAll(PDO::FETCH_COLUMN);

            if ($managerId) {
                // Check if manager is active
                $mgrStmt = $this->db->prepare("SELECT is_active FROM users WHERE id = :id LIMIT 1");
                $mgrStmt->execute([':id' => $managerId]);
                $mgr = $mgrStmt->fetch(PDO::FETCH_ASSOC);
                if ($mgr && $mgr['is_active'] && !in_array($managerId, $recipients)) {
                    $recipients[] = $managerId;
                }
            }

            $notifStmt = $this->db->prepare("
                INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                VALUES (:recipient_id, 'New Leave Request', :message, 'leave_applied', :related_id, 'leave_requests', 0, NOW(), NOW())
            ");

            $msg = "{$empName} has applied for {$ltName} from {$startDate} to {$endDate}. Please review.";

            foreach ($recipients as $recipId) {
                $notifStmt->execute([
                    ':recipient_id' => $recipId,
                    ':message' => $msg,
                    ':related_id' => $leaveRequestId
                ]);
            }
        } catch (Exception $e) {
            // Silent fail
        }
    }
}
