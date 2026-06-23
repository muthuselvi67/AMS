<?php

class LifecycleController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;
    private $subId;

    public function __construct($db, $requestMethod, $id, $user = null, $subId = null) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;
        $this->subId = $subId;
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
            return;
        }

        // Only Admin/HR roles can manage lifecycle events
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id) {
                    $this->getEvent($this->id);
                } else {
                    $this->getAllEvents();
                }
                break;
            case 'POST':
                $this->createEvent();
                break;
            case 'PUT':
                if ($this->id) {
                    $this->updateEvent($this->id);
                } else {
                    Response::json(false, "Missing event ID", null, 400);
                }
                break;
            case 'DELETE':
                if ($this->id) {
                    $this->deleteEvent($this->id);
                } else {
                    Response::json(false, "Missing event ID", null, 400);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getAllEvents() {
        $type = $_GET['type'] ?? null;
        $status = $_GET['status'] ?? null;
        $employee = $_GET['employee'] ?? null;

        $query = "
            SELECT le.*, u.name as employee_name, u.email as employee_email, u.department,
                   cb.name as creator_name
            FROM lifecycle_events le
            JOIN users u ON le.employee_id = u.id
            LEFT JOIN users cb ON le.created_by = cb.id
            WHERE 1=1
        ";

        $params = [];
        if ($type) {
            $query .= " AND le.type = :type";
            $params['type'] = $type;
        }
        if ($status) {
            $query .= " AND le.status = :status";
            $params['status'] = $status;
        }
        if ($employee) {
            $query .= " AND le.employee_id = :employee_id";
            $params['employee_id'] = $employee;
        }

        $query .= " ORDER BY le.date DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $events = [];
        foreach ($records as $row) {
            $events[] = [
                'id' => $row['id'],
                'type' => $row['type'],
                'date' => $row['date'],
                'status' => $row['status'],
                'notes' => $row['notes'],
                'details' => $row['details'] ? json_decode($row['details'], true) : new stdClass(),
                'employee' => [
                    'id' => $row['employee_id'],
                    'name' => $row['employee_name'],
                    'email' => $row['employee_email'],
                    'department' => $row['department']
                ],
                'createdBy' => [
                    'id' => $row['created_by'],
                    'name' => $row['creator_name'] ?: 'System'
                ]
            ];
        }

        Response::json(true, "Lifecycle events fetched", ['events' => $events], 200);
    }

    private function getEvent($id) {
        $query = "
            SELECT le.*, u.name as employee_name, u.email as employee_email, u.department,
                   cb.name as creator_name
            FROM lifecycle_events le
            JOIN users u ON le.employee_id = u.id
            LEFT JOIN users cb ON le.created_by = cb.id
            WHERE le.id = :id
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::json(false, "Event not found", null, 404);
            return;
        }

        $event = [
            'id' => $row['id'],
            'type' => $row['type'],
            'date' => $row['date'],
            'status' => $row['status'],
            'notes' => $row['notes'],
            'details' => $row['details'] ? json_decode($row['details'], true) : new stdClass(),
            'employee' => [
                'id' => $row['employee_id'],
                'name' => $row['employee_name'],
                'email' => $row['employee_email'],
                'department' => $row['department']
            ],
            'createdBy' => [
                'id' => $row['created_by'],
                'name' => $row['creator_name'] ?: 'System'
            ]
        ];

        Response::json(true, "Event fetched", ['event' => $event], 200);
    }

    private function createEvent() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['employee']) || empty($input['type']) || empty($input['date'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $query = "
            INSERT INTO lifecycle_events (employee_id, type, date, status, details, notes, created_by)
            VALUES (:employee_id, :type, :date, :status, :details, :notes, :created_by)
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'employee_id' => $input['employee'],
            'type' => $input['type'],
            'date' => $input['date'],
            'status' => $input['status'] ?? 'pending',
            'details' => !empty($input['details']) ? json_encode($input['details']) : null,
            'notes' => $input['notes'] ?? '',
            'created_by' => $this->user['id']
        ]);

        Response::json(true, "Lifecycle event created", ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateEvent($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['employee']) || empty($input['type']) || empty($input['date'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $completedAt = null;
        if ($input['status'] === 'completed') {
            $completedAt = date('Y-m-d H:i:s');
        }

        $query = "
            UPDATE lifecycle_events
            SET employee_id = :employee_id, type = :type, date = :date, status = :status,
                details = :details, notes = :notes, completed_at = :completed_at
            WHERE id = :id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'id' => $id,
            'employee_id' => $input['employee'],
            'type' => $input['type'],
            'date' => $input['date'],
            'status' => $input['status'] ?? 'pending',
            'details' => !empty($input['details']) ? json_encode($input['details']) : null,
            'notes' => $input['notes'] ?? '',
            'completed_at' => $completedAt
        ]);

        Response::json(true, "Lifecycle event updated");
    }

    private function deleteEvent($id) {
        $query = "DELETE FROM lifecycle_events WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);

        Response::json(true, "Lifecycle event deleted");
    }
}
?>
