<?php

class GreenEventController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;
    private $subId;

    public function __construct($db, $requestMethod, $id = null, $user = null, $subId = null) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;
        $this->subId = $subId;
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized access", null, 401);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id === 'dashboard' || $this->id === 'stats') {
                    $this->getDashboardStats();
                } else if ($this->id) {
                    $this->getEventDetails();
                } else {
                    $this->getEvents();
                }
                break;

            case 'POST':
                if ($this->id && $this->subId === 'register') {
                    $this->registerForEvent($this->id);
                } else if ($this->id && $this->subId === 'cancel') {
                    $this->cancelRegistration($this->id);
                } else if ($this->id && ($this->subId === 'complete' || $this->subId === 'complete-participation')) {
                    $this->markParticipationCompleted($this->id);
                } else if ($this->id === 'register') {
                    $data = json_decode(file_get_contents("php://input"), true);
                    $eventId = $data['event_id'] ?? null;
                    $this->registerForEvent($eventId);
                } else if ($this->id === 'cancel') {
                    $data = json_decode(file_get_contents("php://input"), true);
                    $eventId = $data['event_id'] ?? null;
                    $this->cancelRegistration($eventId);
                } else {
                    if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
                        Response::json(false, "Forbidden: Admin or HR access required", null, 403);
                        return;
                    }
                    $this->createEvent();
                }
                break;

            case 'PUT':
                if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
                    Response::json(false, "Forbidden: Admin or HR access required", null, 403);
                    return;
                }
                $this->updateEvent();
                break;

            case 'DELETE':
                if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
                    Response::json(false, "Forbidden: Admin or HR access required", null, 403);
                    return;
                }
                $this->deleteEvent();
                break;

            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getEvents() {
        $category = $_GET['category'] ?? null;
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $userId = $this->user['id'];

        $sql = "SELECT e.*, 
                       (CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS is_registered,
                       p.participation_status AS my_participation_status,
                       p.registration_date AS my_registration_date
                FROM green_events e
                LEFT JOIN employee_event_participations p 
                     ON e.id = p.event_id AND p.employee_id = :user_id
                WHERE 1=1";

        $params = [':user_id' => $userId];

        if ($category && $category !== 'All') {
            $sql .= " AND e.category = :category";
            $params[':category'] = $category;
        }

        if ($status && $status !== 'All') {
            if ($status === 'My Registered Events') {
                $sql .= " AND p.id IS NOT NULL";
            } else {
                $sql .= " AND e.status = :status";
                $params[':status'] = $status;
            }
        }

        if ($search && trim($search) !== '') {
            $sql .= " AND (e.event_name LIKE :search OR e.location LIKE :search OR e.organizer LIKE :search OR e.description LIKE :search)";
            $params[':search'] = '%' . trim($search) . '%';
        }

        $sql .= " ORDER BY e.event_date ASC, e.start_time ASC";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate current_participants dynamically from participations
            foreach ($events as &$ev) {
                $countStmt = $this->db->prepare("SELECT COUNT(*) FROM employee_event_participations WHERE event_id = :eid AND participation_status != 'Cancelled'");
                $countStmt->execute([':eid' => $ev['id']]);
                $ev['current_participants'] = (int)$countStmt->fetchColumn();
                $ev['is_registered'] = (bool)$ev['is_registered'];
            }

            Response::json(true, "Green Events fetched successfully", $events, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function getEventDetails() {
        $userId = $this->user['id'];
        $eventId = $this->id;

        $sql = "SELECT e.*, 
                       (CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS is_registered,
                       p.participation_status AS my_participation_status,
                       p.registration_date AS my_registration_date
                FROM green_events e
                LEFT JOIN employee_event_participations p 
                     ON e.id = p.event_id AND p.employee_id = :user_id
                WHERE e.id = :event_id";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':event_id' => $eventId, ':user_id' => $userId]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                Response::json(false, "Green Event not found", null, 444);
                return;
            }

            // Get participant list
            $partSql = "SELECT p.id AS participation_id, p.registration_date, p.participation_status, p.completion_date,
                               u.id AS employee_id, u.name, u.email, u.department, u.position, u.employee_id AS emp_code
                        FROM employee_event_participations p
                        JOIN users u ON p.employee_id = u.id
                        WHERE p.event_id = :event_id
                        ORDER BY p.registration_date DESC";
            $partStmt = $this->db->prepare($partSql);
            $partStmt->execute([':event_id' => $eventId]);
            $participants = $partStmt->fetchAll(PDO::FETCH_ASSOC);

            $event['participants'] = $participants;
            $event['current_participants'] = count(array_filter($participants, fn($p) => $p['participation_status'] !== 'Cancelled'));
            $event['is_registered'] = (bool)$event['is_registered'];

            Response::json(true, "Event details fetched successfully", $event, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function createEvent() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['event_name']) || empty($data['category']) || empty($data['event_date']) || empty($data['start_time']) || empty($data['end_time'])) {
            Response::json(false, "Missing required fields (event_name, category, event_date, start_time, end_time)", null, 400);
            return;
        }

        $query = "INSERT INTO green_events 
                  (event_name, category, description, location, event_date, start_time, end_time, organizer, max_participants, status, created_by)
                  VALUES 
                  (:event_name, :category, :description, :location, :event_date, :start_time, :end_time, :organizer, :max_participants, :status, :created_by)";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':event_name' => trim($data['event_name']),
                ':category' => trim($data['category']),
                ':description' => $data['description'] ?? '',
                ':location' => $data['location'] ?? 'Main Office Campus',
                ':event_date' => $data['event_date'],
                ':start_time' => $data['start_time'],
                ':end_time' => $data['end_time'],
                ':organizer' => $data['organizer'] ?? 'Sustainability Cell',
                ':max_participants' => (int)($data['max_participants'] ?? 50),
                ':status' => $data['status'] ?? 'Upcoming',
                ':created_by' => $this->user['id']
            ]);

            $newId = $this->db->lastInsertId();
            Response::json(true, "Green Event created successfully", ["id" => $newId], 201);
        } catch (PDOException $e) {
            Response::json(false, "Error creating Green Event: " . $e->getMessage(), null, 500);
        }
    }

    private function updateEvent() {
        if (!$this->id) {
            Response::json(false, "Missing event ID", null, 400);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        $query = "UPDATE green_events SET 
                    event_name = COALESCE(:event_name, event_name),
                    category = COALESCE(:category, category),
                    description = COALESCE(:description, description),
                    location = COALESCE(:location, location),
                    event_date = COALESCE(:event_date, event_date),
                    start_time = COALESCE(:start_time, start_time),
                    end_time = COALESCE(:end_time, end_time),
                    organizer = COALESCE(:organizer, organizer),
                    max_participants = COALESCE(:max_participants, max_participants),
                    status = COALESCE(:status, status)
                  WHERE id = :id";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':event_name' => $data['event_name'] ?? null,
                ':category' => $data['category'] ?? null,
                ':description' => $data['description'] ?? null,
                ':location' => $data['location'] ?? null,
                ':event_date' => $data['event_date'] ?? null,
                ':start_time' => $data['start_time'] ?? null,
                ':end_time' => $data['end_time'] ?? null,
                ':organizer' => $data['organizer'] ?? null,
                ':max_participants' => isset($data['max_participants']) ? (int)$data['max_participants'] : null,
                ':status' => $data['status'] ?? null,
                ':id' => $this->id
            ]);

            Response::json(true, "Green Event updated successfully", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error updating Green Event: " . $e->getMessage(), null, 500);
        }
    }

    private function deleteEvent() {
        if (!$this->id) {
            Response::json(false, "Missing event ID", null, 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM green_events WHERE id = :id");
            $stmt->execute([':id' => $this->id]);
            Response::json(true, "Green Event deleted successfully", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error deleting Green Event: " . $e->getMessage(), null, 500);
        }
    }

    private function registerForEvent($eventId) {
        if (!$eventId) {
            Response::json(false, "Missing event ID for registration", null, 400);
            return;
        }

        $userId = $this->user['id'];

        try {
            // Check if event exists
            $eventStmt = $this->db->prepare("SELECT * FROM green_events WHERE id = :id");
            $eventStmt->execute([':id' => $eventId]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                Response::json(false, "Green Event not found", null, 404);
                return;
            }

            if ($event['status'] === 'Completed' || $event['status'] === 'Cancelled') {
                Response::json(false, "Registration is closed for this event", null, 400);
                return;
            }

            // Check current capacity
            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM employee_event_participations WHERE event_id = :eid AND participation_status != 'Cancelled'");
            $countStmt->execute([':eid' => $eventId]);
            $currentCount = (int)$countStmt->fetchColumn();

            if ($currentCount >= $event['max_participants']) {
                Response::json(false, "Event capacity is full", null, 400);
                return;
            }

            // Prevent duplicate registration
            $checkStmt = $this->db->prepare("SELECT * FROM employee_event_participations WHERE employee_id = :uid AND event_id = :eid");
            $checkStmt->execute([':uid' => $userId, ':eid' => $eventId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                if ($existing['participation_status'] === 'Registered' || $existing['participation_status'] === 'Completed') {
                    Response::json(false, "You are already registered for this Green Event", null, 400);
                    return;
                } else {
                    // Re-register if previously cancelled
                    $reStmt = $this->db->prepare("UPDATE employee_event_participations SET participation_status = 'Registered', registration_date = NOW() WHERE id = :id");
                    $reStmt->execute([':id' => $existing['id']]);
                }
            } else {
                // Insert new registration
                $insertStmt = $this->db->prepare("INSERT INTO employee_event_participations (employee_id, event_id, participation_status) VALUES (:uid, :eid, 'Registered')");
                $insertStmt->execute([':uid' => $userId, ':eid' => $eventId]);
            }

            // Update current_participants count in green_events
            $updStmt = $this->db->prepare("UPDATE green_events SET current_participants = (SELECT COUNT(*) FROM employee_event_participations WHERE event_id = :eid AND participation_status != 'Cancelled') WHERE id = :eid");
            $updStmt->execute([':eid' => $eventId]);

            Response::json(true, "Successfully registered for Green Event!", ["event_id" => $eventId], 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error during registration: " . $e->getMessage(), null, 500);
        }
    }

    private function cancelRegistration($eventId) {
        if (!$eventId) {
            Response::json(false, "Missing event ID", null, 400);
            return;
        }

        $userId = $this->user['id'];

        try {
            $stmt = $this->db->prepare("DELETE FROM employee_event_participations WHERE employee_id = :uid AND event_id = :eid");
            $stmt->execute([':uid' => $userId, ':eid' => $eventId]);

            // Recalculate participant count
            $updStmt = $this->db->prepare("UPDATE green_events SET current_participants = (SELECT COUNT(*) FROM employee_event_participations WHERE event_id = :eid AND participation_status != 'Cancelled') WHERE id = :eid");
            $updStmt->execute([':eid' => $eventId]);

            Response::json(true, "Event registration cancelled successfully", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error cancelling registration: " . $e->getMessage(), null, 500);
        }
    }

    private function markParticipationCompleted($eventId) {
        $data = json_decode(file_get_contents("php://input"), true);
        $empId = $data['employee_id'] ?? null;

        if (!$eventId || !$empId) {
            Response::json(false, "Missing event ID or employee ID", null, 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("UPDATE employee_event_participations SET participation_status = 'Completed', completion_date = NOW() WHERE event_id = :eid AND employee_id = :empid");
            $stmt->execute([':eid' => $eventId, ':empid' => $empId]);

            Response::json(true, "Employee participation marked as Completed!", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error marking participation completed: " . $e->getMessage(), null, 500);
        }
    }

    private function getDashboardStats() {
        $userId = $this->user['id'];

        try {
            // Total available events (Upcoming or Ongoing)
            $totalAvailStmt = $this->db->prepare("SELECT COUNT(*) FROM green_events WHERE status IN ('Upcoming', 'Ongoing')");
            $totalAvailStmt->execute();
            $totalAvailable = (int)$totalAvailStmt->fetchColumn();

            // Upcoming events
            $upStmt = $this->db->prepare("SELECT COUNT(*) FROM green_events WHERE status = 'Upcoming'");
            $upStmt->execute();
            $upcomingEventsCount = (int)$upStmt->fetchColumn();

            // My Registered Events
            $myRegStmt = $this->db->prepare("SELECT COUNT(*) FROM employee_event_participations p JOIN green_events e ON p.event_id = e.id WHERE p.employee_id = :uid AND p.participation_status = 'Registered' AND e.status IN ('Upcoming', 'Ongoing')");
            $myRegStmt->execute([':uid' => $userId]);
            $myRegisteredCount = (int)$myRegStmt->fetchColumn();

            // Completed Events for Employee
            $compStmt = $this->db->prepare("SELECT COUNT(*) FROM employee_event_participations WHERE employee_id = :uid AND participation_status = 'Completed'");
            $compStmt->execute([':uid' => $userId]);
            $completedEventsCount = (int)$compStmt->fetchColumn();

            // Total Participation Count
            $totalPartStmt = $this->db->prepare("SELECT COUNT(*) FROM employee_event_participations WHERE employee_id = :uid AND participation_status != 'Cancelled'");
            $totalPartStmt->execute([':uid' => $userId]);
            $myParticipationCount = (int)$totalPartStmt->fetchColumn();

            // Fetch My Registered Events List
            $myListStmt = $this->db->prepare("SELECT e.*, p.participation_status, p.registration_date, p.completion_date 
                                              FROM employee_event_participations p 
                                              JOIN green_events e ON p.event_id = e.id 
                                              WHERE p.employee_id = :uid 
                                              ORDER BY e.event_date ASC");
            $myListStmt->execute([':uid' => $userId]);
            $myEvents = $myListStmt->fetchAll(PDO::FETCH_ASSOC);

            $data = [
                "total_available_events" => $totalAvailable,
                "upcoming_events" => $upcomingEventsCount,
                "my_registered_events" => $myRegisteredCount,
                "completed_events" => $completedEventsCount,
                "my_participation_count" => $myParticipationCount,
                "my_events" => $myEvents
            ];

            Response::json(true, "Dashboard stats fetched successfully", $data, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error fetching stats: " . $e->getMessage(), null, 500);
        }
    }
}
?>
