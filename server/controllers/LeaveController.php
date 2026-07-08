<?php

class LeaveController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;
    private $subId;

    public function __construct($db, $requestMethod, $id, $user, $subId = null) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;
        $this->subId = $subId;
    }

    public function processRequest($resource = 'leaves') {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
            return;
        }

        if ($resource === 'leave-types') {
            if ($this->requestMethod === 'GET' && ($this->id === 'all' || !$this->id)) {
                $this->getLeaveTypes($this->id === 'all');
                return;
            }
            switch ($this->requestMethod) {
                case 'POST':
                    $this->createLeaveType();
                    break;
                case 'PUT':
                    $this->updateLeaveType($this->id);
                    break;
                case 'DELETE':
                    $this->deleteLeaveType($this->id);
                    break;
                default:
                    Response::json(false, "Method not allowed", null, 405);
                    break;
            }
            return;
        }

        // Route: GET /api/leaves/stats/summary
        if ($this->requestMethod === 'GET' && $this->id === 'stats' && $this->subId === 'summary') {
            $this->getStatsSummary();
            return;
        }

        // Route: GET /api/leaves/types OR /api/leave-types/all
        if ($this->requestMethod === 'GET' && ($this->id === 'types' || $this->id === 'all')) {
            $this->getLeaveTypes($this->id === 'all');
            return;
        }


        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id && $this->id !== 'stats') {
                    $this->getLeave($this->id);
                } else {
                    $this->getAllLeaves();
                }
                break;
            case 'POST':
                $this->createLeave();
                break;
            case 'PUT':
                if ($this->subId === 'cancel') {
                    $this->cancelLeave($this->id);
                } else {
                    $this->updateLeaveStatus($this->id);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function cancelLeave($id) {
        if ($this->user['role'] !== 'employee') {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        // Only allow cancelling pending leaves
        $checkStmt = $this->db->prepare("SELECT status, employee_id FROM leave_requests WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        $leave = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$leave || $leave['employee_id'] != $this->user['id']) {
            Response::json(false, "Leave not found or unauthorized", null, 404);
            return;
        }

        if (!in_array($leave['status'], ['pending_manager', 'pending_hr'])) {
            Response::json(false, "Can only cancel pending leaves", null, 400);
            return;
        }

        $stmt = $this->db->prepare("UPDATE leave_requests SET status = 'cancelled' WHERE id = :id");
        if ($stmt->execute([':id' => $id])) {
            Response::json(true, "Leave request cancelled", null, 200);
        } else {
            Response::json(false, "Failed to cancel leave request", null, 500);
        }
    }

    private function getStatsSummary() {
        $where = "";
        $params = [];
        if ($this->user['role'] === 'employee') {
            $where = "WHERE employee_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        }

        $query = "SELECT 
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status IN ('pending_manager','pending_hr') THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected,
            COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled
        FROM leave_requests $where";


        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        Response::json(true, "Stats fetched", ['stats' => $stats], 200);
    }

    private function getLeaveTypes($returnAll = false) {
        $query = "SELECT * FROM leave_types";
        if (!$returnAll) {
            $query .= " WHERE is_active = 1";
        }
        $stmt = $this->db->query($query);
        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($types as &$t) {
            $t['defaultDays'] = $t['default_days'];
            // Also map carryForward and other boolean fields if they come as 1/0
            $t['carryForward'] = (bool)$t['carry_forward'];
            $t['isPaid'] = (bool)$t['is_paid'];
            $t['requiresApproval'] = (bool)$t['requires_approval'];
            $t['isActive'] = (bool)$t['is_active'];
        }
        Response::json(true, "Leave types fetched", $types, 200);


    }

    private function getAllLeaves() {
        $status  = $_GET['status'] ?? null;
        $date    = $_GET['date']   ?? null;   // YYYY-MM-DD — filter leaves covering this date
        $params  = [];

        $query = "SELECT lr.*, lt.name as leave_type_name, lt.color as leave_type_color,
                  u.name as employee_name, u.leave_balance_annual, u.leave_balance_sick,
                  u.leave_balance_casual, u.leave_balance_maternity, u.leave_balance_paternity,
                  u.leave_balance_unpaid, u.leave_balance_floating, u.leave_balance_vacation,
                  u.leave_balance_halfday
                  FROM leave_requests lr
                  LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
                  LEFT JOIN users u ON lr.employee_id = u.id";

        $conditions = [];

        // Employees can only see their own leaves, unless they request approved leaves (e.g. for calendar coordination)
        if ($this->user['role'] === 'employee') {
            if ($status !== 'approved' && !$date) {
                $conditions[] = "lr.employee_id = :user_id";
                $params[':user_id'] = $this->user['id'];
            }
        } else {
            if (!empty($_GET['employeeId'])) {
                $conditions[] = "lr.employee_id = :filter_emp_id";
                $params[':filter_emp_id'] = $_GET['employeeId'];
            } else if (!empty($_GET['employee_id'])) {
                $conditions[] = "lr.employee_id = :filter_emp_id";
                $params[':filter_emp_id'] = $_GET['employee_id'];
            }

            // Admins/Managers/HR only see pending leaves where all active handovers are accepted
            $conditions[] = "(lr.status NOT IN ('pending_manager', 'pending_hr') OR NOT EXISTS (
                SELECT 1 FROM task_handovers th 
                WHERE th.leave_request_id = lr.id 
                AND th.status != 'accepted' 
                AND th.is_replaced = 0
            ))";
        }

        if ($status && $status !== 'all') {
            $conditions[] = "lr.status = :status";
            $params[':status'] = $status;
        }

        // Date filter: return leaves whose range covers the requested date
        if ($date) {
            $conditions[] = "lr.start_date <= :date_end AND lr.end_date >= :date_start";
            $params[':date_start'] = $date;
            $params[':date_end']   = $date;
            // When filtering by date, default to approved leaves only (unless status explicitly passed)
            if (!$status || $status === 'all') {
                $conditions[] = "lr.status = 'approved'";
            }
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY lr.created_at DESC";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($records as &$r) {
            $r['employee'] = [
                'id' => $r['employee_id'],
                'name' => $r['employee_name'],
                'leaveBalance' => [
                    'annual' => $r['leave_balance_annual'] !== null ? (int)$r['leave_balance_annual'] : 0,
                    'sick' => $r['leave_balance_sick'] !== null ? (int)$r['leave_balance_sick'] : 0,
                    'casual' => $r['leave_balance_casual'] !== null ? (int)$r['leave_balance_casual'] : 0,
                    'paternity' => $r['leave_balance_paternity'] !== null ? (int)$r['leave_balance_paternity'] : 0,
                    'maternity' => $r['leave_balance_maternity'] !== null ? (int)$r['leave_balance_maternity'] : 0,
                    'unpaid' => $r['leave_balance_unpaid'] !== null ? (int)$r['leave_balance_unpaid'] : 0,
                    'floating' => $r['leave_balance_floating'] !== null ? (int)$r['leave_balance_floating'] : 0,
                    'vacation' => $r['leave_balance_vacation'] !== null ? (int)$r['leave_balance_vacation'] : 0,
                    'halfday' => $r['leave_balance_halfday'] !== null ? (int)$r['leave_balance_halfday'] : 0,
                ]
            ];
            $r['leaveType'] = [
                'id' => $r['leave_type_id'],
                'name' => $r['leave_type_name'],
                'color' => $r['leave_type_color']
            ];
            // Support camelCase for frontend
            $r['numberOfDays'] = $r['number_of_days'];
            $r['startDate'] = $r['start_date'];
            $r['endDate'] = $r['end_date'];

            // Fetch handovers
            $hoStmt = $this->db->prepare("SELECT th.id, th.status, th.task_description, th.updated_at, u.name as assigned_to_name, u.id as assigned_to_id 
                                          FROM task_handovers th 
                                          JOIN users u ON th.assigned_to_id = u.id 
                                          WHERE th.leave_request_id = :lrid");
            $hoStmt->execute([':lrid' => $r['id']]);
            $r['handovers'] = $hoStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        Response::json(true, "Leaves fetched successfully", ['leaves' => $records], 200);

    }

    private function getLeave($id) {
        $query = "SELECT lr.*, lt.name as leave_type_name, lt.color as leave_type_color,
                  u.name as employee_name, u.leave_balance_annual, u.leave_balance_sick,
                  u.leave_balance_casual, u.leave_balance_maternity, u.leave_balance_paternity,
                  u.leave_balance_unpaid, u.leave_balance_floating, u.leave_balance_vacation,
                  u.leave_balance_halfday
                  FROM leave_requests lr
                  LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
                  LEFT JOIN users u ON lr.employee_id = u.id
                  WHERE lr.id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $r = $stmt->fetch(PDO::FETCH_ASSOC);
            $r['employee'] = [
                'id' => $r['employee_id'],
                'name' => $r['employee_name'] ?? 'Unknown',
                'leaveBalance' => [
                    'annual' => $r['leave_balance_annual'] !== null ? (int)$r['leave_balance_annual'] : 0,
                    'sick' => $r['leave_balance_sick'] !== null ? (int)$r['leave_balance_sick'] : 0,
                    'casual' => $r['leave_balance_casual'] !== null ? (int)$r['leave_balance_casual'] : 0,
                    'paternity' => $r['leave_balance_paternity'] !== null ? (int)$r['leave_balance_paternity'] : 0,
                    'maternity' => $r['leave_balance_maternity'] !== null ? (int)$r['leave_balance_maternity'] : 0,
                    'unpaid' => $r['leave_balance_unpaid'] !== null ? (int)$r['leave_balance_unpaid'] : 0,
                    'floating' => $r['leave_balance_floating'] !== null ? (int)$r['leave_balance_floating'] : 0,
                    'vacation' => $r['leave_balance_vacation'] !== null ? (int)$r['leave_balance_vacation'] : 0,
                    'halfday' => $r['leave_balance_halfday'] !== null ? (int)$r['leave_balance_halfday'] : 0,
                ]
            ];
            $r['leaveType'] = [
                'id' => $r['leave_type_id'],
                'name' => $r['leave_type_name'],
                'color' => $r['leave_type_color']
            ];
            $r['numberOfDays'] = $r['number_of_days'];
            $r['startDate'] = $r['start_date'];
            $r['endDate'] = $r['end_date'];

            // Fetch handovers
            $hoStmt = $this->db->prepare("SELECT th.id, th.status, th.task_description, u.name as assigned_to_name, u.id as assigned_to_id 
                                          FROM task_handovers th 
                                          JOIN users u ON th.assigned_to_id = u.id 
                                          WHERE th.leave_request_id = :lrid");
            $hoStmt->execute([':lrid' => $r['id']]);
            $r['handovers'] = $hoStmt->fetchAll(PDO::FETCH_ASSOC);

            Response::json(true, "Leave fetched successfully", $r, 200);
        } else {
            Response::json(false, "Leave not found", null, 404);
        }

    }

    private function createLeave() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['leave_type_id']) || !isset($data['start_date']) || !isset($data['end_date']) || !isset($data['reason'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $start = new DateTime($data['start_date']);
        $end   = new DateTime($data['end_date']);
        $isHalfDay = isset($data['is_half_day']) && $data['is_half_day'] == 1;
        $days  = $isHalfDay ? 0.5 : ($end->diff($start)->days + 1);

        // Fetch leave type info for validation
        $typeStmt = $this->db->prepare("SELECT code, name FROM leave_types WHERE id = :id LIMIT 1");
        $typeStmt->execute([':id' => $data['leave_type_id']]);
        $type = $typeStmt->fetch(PDO::FETCH_ASSOC);
        if (!$type) {
            Response::json(false, "Invalid leave type", null, 400);
            return;
        }
        $code = $type['code'];

        if ($code === 'CL' || $code === 'SL') {
            // Yearly limit: max 1 day, max 1 request per year
            if ($days > 1) {
                Response::json(false, $type['name'] . " is limited to a maximum of 1 day.", null, 400);
                return;
            }
            $year = $start->format('Y');
            $checkQuery = "SELECT COUNT(*) as count FROM leave_requests 
                           WHERE employee_id = :employee_id 
                           AND leave_type_id = :leave_type_id 
                           AND status NOT IN ('rejected', 'cancelled') 
                           AND YEAR(start_date) = :year";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([
                ':employee_id' => $this->user['id'],
                ':leave_type_id' => $data['leave_type_id'],
                ':year' => $year
            ]);
            $res = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($res && $res['count'] > 0) {
                Response::json(false, "You can only apply for 1 " . $type['name'] . " per year.", null, 400);
                return;
            }
        } elseif ($code === 'MHDP') {
            // Monthly Half-Day Permission: max 1 per month, must be half day
            if (!$isHalfDay || $days > 0.5) {
                Response::json(false, "Monthly Half-Day Permission must be applied as a Half Day (0.5 days).", null, 400);
                return;
            }
            $month = $start->format('m');
            $year = $start->format('Y');
            $checkQuery = "SELECT COUNT(*) as count FROM leave_requests 
                           WHERE employee_id = :employee_id 
                           AND leave_type_id = :leave_type_id 
                           AND status NOT IN ('rejected', 'cancelled') 
                           AND MONTH(start_date) = :month 
                           AND YEAR(start_date) = :year";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([
                ':employee_id' => $this->user['id'],
                ':leave_type_id' => $data['leave_type_id'],
                ':month' => $month,
                ':year' => $year
            ]);
            $res = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($res && $res['count'] > 0) {
                Response::json(false, "You can only apply for 1 Half-Day Permission per month.", null, 400);
                return;
            }
        } elseif ($code === 'MOP') {
            // Monthly One-Hour Permission: max 1 per month
            $month = $start->format('m');
            $year = $start->format('Y');
            $checkQuery = "SELECT COUNT(*) as count FROM leave_requests 
                           WHERE employee_id = :employee_id 
                           AND leave_type_id = :leave_type_id 
                           AND status NOT IN ('rejected', 'cancelled') 
                           AND MONTH(start_date) = :month 
                           AND YEAR(start_date) = :year";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([
                ':employee_id' => $this->user['id'],
                ':leave_type_id' => $data['leave_type_id'],
                ':month' => $month,
                ':year' => $year
            ]);
            $res = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($res && $res['count'] > 0) {
                Response::json(false, "You can only apply for 1 One-Hour Permission per month.", null, 400);
                return;
            }
        }

        $query = "INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, number_of_days, reason, is_half_day) 
                  VALUES (:employee_id, :leave_type_id, :start_date, :end_date, :days, :reason, :is_half_day)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':employee_id', $this->user['id']);
        $stmt->bindParam(':leave_type_id', $data['leave_type_id']);
        $stmt->bindParam(':start_date', $data['start_date']);
        $stmt->bindParam(':end_date', $data['end_date']);
        $stmt->bindParam(':days', $days);
        $stmt->bindParam(':reason', $data['reason']);
        $stmt->bindValue(':is_half_day', $isHalfDay ? 1 : 0);

        if ($stmt->execute()) {
            $newId = $this->db->lastInsertId();

            if (isset($data['handover_user_ids']) && is_array($data['handover_user_ids'])) {
                // Build a map of user_id => task description from handover_tasks
                $taskMap = [];
                if (isset($data['handover_tasks']) && is_array($data['handover_tasks'])) {
                    foreach ($data['handover_tasks'] as $ht) {
                        if (isset($ht['user_id'])) {
                            $taskMap[(int)$ht['user_id']] = $ht['task'] ?? '';
                        }
                    }
                }
                $hoStmt = $this->db->prepare("INSERT INTO task_handovers (leave_request_id, assigned_by_id, assigned_to_id, task_description) VALUES (:leave_request_id, :assigned_by_id, :assigned_to_id, :task_description)");
                foreach ($data['handover_user_ids'] as $hoUserId) {
                    $hoStmt->execute([
                        ':leave_request_id' => $newId,
                        ':assigned_by_id' => $this->user['id'],
                        ':assigned_to_id' => $hoUserId,
                        ':task_description' => $taskMap[(int)$hoUserId] ?? ''
                    ]);
                    
                    // Notify assigned user
                    $empName  = $this->user['name'] ?? 'An employee';
                    $this->sendNotification(
                        $hoUserId,
                        "Task Handover Assigned",
                        "{$empName} has assigned tasks to you during their leave. Please review.",
                        "general",
                        $newId,
                        "task_handovers"
                    );
                }
            }

            // Notify admin, manager, and HR immediately only if there are no task handovers to wait for
            $hasHandovers = isset($data['handover_user_ids']) && is_array($data['handover_user_ids']) && count($data['handover_user_ids']) > 0;
            if (!$hasHandovers) {
                $this->sendLeaveAppliedNotificationToAdmins($newId);
            }

            Response::json(true, "Leave requested successfully", ["id" => $newId], 201);
        } else {
            Response::json(false, "Error requesting leave", null, 500);
        }
    }

    private function updateLeaveStatus($id) {
        if ($this->user['role'] === 'employee') {
            Response::json(false, "Forbidden", null, 403);
            return;
        }
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id || !isset($data['status'])) {
            Response::json(false, "Invalid request", null, 400);
            return;
        }

        $remark = isset($data['remark']) ? $data['remark'] : '';
        $remarkCol = ($this->user['role'] === 'hr') ? 'hr_remark' : 'manager_remark';
        $reviewerCol = ($this->user['role'] === 'hr') ? 'hr_reviewed_by' : 'manager_reviewed_by';

        $query = "UPDATE leave_requests SET status = :status, $remarkCol = :remark, $reviewerCol = :reviewer_id, reviewed_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':remark', $remark);
        $stmt->bindParam(':reviewer_id', $this->user['id']);
        $stmt->bindParam(':id', $id);

        if ($stmt->execute()) {
            // Send notification to employee
            try {
                $empStmt = $this->db->prepare("SELECT employee_id FROM leave_requests WHERE id = :id");
                $empStmt->execute([':id' => $id]);
                $empResult = $empStmt->fetch(PDO::FETCH_ASSOC);
                if ($empResult && in_array($data['status'], ['approved', 'rejected'])) {
                    $employeeId = $empResult['employee_id'];
                    $notifType    = 'leave_' . strtolower($data['status']);
                    $notifTitle   = "Leave Request " . ucfirst($data['status']);
                    $notifMessage = "Your leave request has been " . $data['status'] . " by " . ($this->user['name'] ?? 'Admin') . ".";
                    if ($remark) {
                        $notifMessage .= " Remark: " . $remark;
                    }
                    $this->sendNotification($employeeId, $notifTitle, $notifMessage, $notifType, $id, 'leave_requests');
                }
            } catch (Exception $e) {
                // Silent fail — don't block the update response
            }

            Response::json(true, "Leave status updated successfully", null, 200);
        } else {
            Response::json(false, "Failed to update leave status", null, 500);
        }
    }

    private function createLeaveType() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['name']) || !isset($data['code'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $query = "INSERT INTO leave_types (name, code, default_days, color, carry_forward, max_carry_forward, is_paid, requires_approval, description, is_active) 
                  VALUES (:name, :code, :default_days, :color, :carry_forward, :max_carry_forward, :is_paid, :requires_approval, :description, 1)";
        $stmt = $this->db->prepare($query);
        
        $carryForward = isset($data['carry_forward']) ? (int)$data['carry_forward'] : 0;
        $maxCarryForward = isset($data['max_carry_forward']) ? (int)$data['max_carry_forward'] : 0;
        $isPaid = isset($data['is_paid']) ? (int)$data['is_paid'] : 1;
        $requiresApproval = isset($data['requires_approval']) ? (int)$data['requires_approval'] : 1;
        $color = $data['color'] ?? '#4F9CF9';
        $desc = $data['description'] ?? '';
        $defaultDays = isset($data['default_days']) ? (int)$data['default_days'] : 0;

        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':code', $data['code']);
        $stmt->bindParam(':default_days', $defaultDays);
        $stmt->bindParam(':color', $color);
        $stmt->bindParam(':carry_forward', $carryForward);
        $stmt->bindParam(':max_carry_forward', $maxCarryForward);
        $stmt->bindParam(':is_paid', $isPaid);
        $stmt->bindParam(':requires_approval', $requiresApproval);
        $stmt->bindParam(':description', $desc);

        try {
            $stmt->execute();
            Response::json(true, "Leave type created successfully", ["id" => $this->db->lastInsertId()], 201);
        } catch (PDOException $e) {
            // Duplicate entry (name or code already exists)
            if ($e->getCode() === '23000') {
                Response::json(false, "A leave type with this name or code already exists.", null, 409);
            } else {
                Response::json(false, "Failed to create leave type: " . $e->getMessage(), null, 500);
            }
        }
    }

    private function updateLeaveType($id) {
        if ($this->user['role'] !== 'hr' && $this->user['role'] !== 'admin') {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id) {
            Response::json(false, "Missing leave type ID", null, 400);
            return;
        }

        // Check if we are toggling isActive or updating the whole leave type
        if (isset($data['isActive']) && !isset($data['name'])) {
            $query = "UPDATE leave_types SET is_active = :is_active WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $isActive = $data['isActive'] ? 1 : 0;
            $stmt->bindParam(':is_active', $isActive);
            $stmt->bindParam(':id', $id);
            if ($stmt->execute()) {
                Response::json(true, "Leave type status updated successfully", null, 200);
            } else {
                Response::json(false, "Failed to update status", null, 500);
            }
            return;
        }

        // Full update
        $query = "UPDATE leave_types SET 
                    name = :name, 
                    code = :code, 
                    default_days = :default_days, 
                    color = :color, 
                    carry_forward = :carry_forward, 
                    max_carry_forward = :max_carry_forward, 
                    is_paid = :is_paid, 
                    requires_approval = :requires_approval, 
                    description = :description 
                  WHERE id = :id";
        $stmt = $this->db->prepare($query);
        
        $carryForward = isset($data['carry_forward']) ? (int)$data['carry_forward'] : 0;
        $maxCarryForward = isset($data['max_carry_forward']) ? (int)$data['max_carry_forward'] : 0;
        $isPaid = isset($data['is_paid']) ? (int)$data['is_paid'] : 1;
        $requiresApproval = isset($data['requires_approval']) ? (int)$data['requires_approval'] : 1;
        $color = $data['color'] ?? '#4F9CF9';
        $desc = $data['description'] ?? '';
        $defaultDays = isset($data['default_days']) ? (int)$data['default_days'] : 0;

        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':code', $data['code']);
        $stmt->bindParam(':default_days', $defaultDays);
        $stmt->bindParam(':color', $color);
        $stmt->bindParam(':carry_forward', $carryForward);
        $stmt->bindParam(':max_carry_forward', $maxCarryForward);
        $stmt->bindParam(':is_paid', $isPaid);
        $stmt->bindParam(':requires_approval', $requiresApproval);
        $stmt->bindParam(':description', $desc);
        $stmt->bindParam(':id', $id);

        try {
            $stmt->execute();
            Response::json(true, "Leave type updated successfully", null, 200);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::json(false, "A leave type with this name or code already exists.", null, 409);
            } else {
                Response::json(false, "Failed to update leave type: " . $e->getMessage(), null, 500);
            }
        }
    }

    private function deleteLeaveType($id) {
        if ($this->user['role'] !== 'hr' && $this->user['role'] !== 'admin') {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        if (!$id) {
            Response::json(false, "Missing leave type ID", null, 400);
            return;
        }

        // Check if any leave requests reference this leave type
        $checkStmt = $this->db->prepare("SELECT COUNT(*) as cnt FROM leave_requests WHERE leave_type_id = :id");
        $checkStmt->execute([':id' => $id]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($result && $result['cnt'] > 0) {
            Response::json(false, "Cannot delete: this leave type has existing leave requests linked to it.", null, 409);
            return;
        }

        $stmt = $this->db->prepare("DELETE FROM leave_types WHERE id = :id");
        $stmt->bindParam(':id', $id);

        if ($stmt->execute() && $stmt->rowCount() > 0) {
            Response::json(true, "Leave type deleted successfully", null, 200);
        } else {
            Response::json(false, "Leave type not found or already deleted", null, 404);
        }
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

            foreach ($recipients as $recipId) {
                $this->sendNotification(
                    $recipId,
                    "New Leave Request",
                    "{$empName} has applied for {$ltName} from {$startDate} to {$endDate}. Please review.",
                    "leave_applied",
                    $leaveRequestId,
                    "leave_requests"
                );
            }
        } catch (Exception $e) {
            // Silent fail
        }
    }

    /**
     * Helper: insert a notification row
     */
    private function sendNotification($recipientId, $title, $message, $type, $relatedId, $relatedModel) {
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                 VALUES (:recipient_id, :title, :message, :type, :related_id, :related_model, 0, NOW(), NOW())"
            );
            $stmt->execute([
                ':recipient_id'  => $recipientId,
                ':title'         => $title,
                ':message'       => $message,
                ':type'          => $type,
                ':related_id'    => $relatedId,
                ':related_model' => $relatedModel,
            ]);
        } catch (Exception $e) {
            // Silent fail — don't break main flow
        }
    }
}
