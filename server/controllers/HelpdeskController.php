<?php

class HelpdeskController {
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

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id && $this->subId === 'comments') {
                    $this->getComments($this->id);
                } else {
                    $this->getTickets();
                }
                break;
            case 'POST':
                if ($this->id && $this->subId === 'comments') {
                    $this->addComment($this->id);
                } else {
                    $this->createTicket();
                }
                break;
            case 'PUT':
                if ($this->id) {
                    $this->handlePutRequest($this->id);
                } else {
                    Response::json(false, "Forbidden or Missing ID", null, 403);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getTickets() {
        $query = "
            SELECT t.*, u.name as employee_name, u.department as employee_department, u.email as employee_email 
            FROM tickets t
            JOIN users u ON t.employee_id = u.id
        ";
        
        $params = [];
        
        // If employee, only show their tickets
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            $query .= " WHERE t.employee_id = :employee_id";
            $params['employee_id'] = $this->user['id'];
        }

        $query .= " ORDER BY t.created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formatted = [];
        foreach ($tickets as $t) {
            $formatted[] = [
                'id' => (int)$t['id'],
                'subject' => $t['subject'],
                'description' => $t['description'],
                'category' => $t['category'],
                'priority' => $t['priority'],
                'status' => $t['status'],
                'employee_id' => (int)$t['employee_id'],
                'createdAt' => $t['created_at'],
                'updatedAt' => $t['updated_at'],
                'submittedBy' => [
                    'name' => $t['employee_name'],
                    'department' => $t['employee_department']
                ],
                'comments' => $this->getCommentsForTicket($t['id'])
            ];
        }

        Response::json(true, "Tickets fetched", ['tickets' => $formatted], 200);
    }

    private function createTicket() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['subject']) || empty($input['description'])) {
            Response::json(false, "Subject and description are required", null, 400);
            return;
        }

        $query = "
            INSERT INTO tickets (subject, description, category, priority, status, employee_id)
            VALUES (:subject, :description, :category, :priority, 'open', :employee_id)
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'subject' => $input['subject'],
            'description' => $input['description'],
            'category' => $input['category'] ?? 'general',
            'priority' => $input['priority'] ?? 'medium',
            'employee_id' => $this->user['id']
        ]);

        Response::json(true, "Ticket created", ['id' => $this->db->lastInsertId()], 201);
    }

    private function handlePutRequest($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        // Fetch ticket to verify existence and check permissions
        $stmt = $this->db->prepare("SELECT employee_id FROM tickets WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            Response::json(false, "Ticket not found", null, 404);
            return;
        }

        // Verify access (either owner, admin, or hr)
        $isAuthorized = in_array($this->user['role'], ['admin', 'hr']) || $ticket['employee_id'] == $this->user['id'];
        if (!$isAuthorized) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        if (isset($input['comment'])) {
            // Add comment
            if (empty(trim($input['comment']))) {
                Response::json(false, "Comment text is empty", null, 400);
                return;
            }

            $query = "INSERT INTO ticket_comments (ticket_id, user_id, comment) VALUES (:ticket_id, :user_id, :comment)";
            $stmtInsert = $this->db->prepare($query);
            $stmtInsert->execute([
                'ticket_id' => $id,
                'user_id' => $this->user['id'],
                'comment' => $input['comment']
            ]);

            // Get the updated ticket with all comments to return
            $updatedTicket = $this->getSingleTicketData($id);
            Response::json(true, "Comment added", ['ticket' => $updatedTicket], 200);
            return;
        }

        if (isset($input['status'])) {
            // Update status (only admin/hr)
            if (!in_array($this->user['role'], ['admin', 'hr'])) {
                Response::json(false, "Forbidden to update status", null, 403);
                return;
            }

            $query = "UPDATE tickets SET status = :status WHERE id = :id";
            $stmtUpdate = $this->db->prepare($query);
            $stmtUpdate->execute(['status' => $input['status'], 'id' => $id]);

            // Get updated ticket
            $updatedTicket = $this->getSingleTicketData($id);
            Response::json(true, "Ticket updated", ['ticket' => $updatedTicket], 200);
            return;
        }

        Response::json(false, "Invalid fields", null, 400);
    }

    private function getSingleTicketData($id) {
        $query = "
            SELECT t.*, u.name as employee_name, u.department as employee_department, u.email as employee_email 
            FROM tickets t
            JOIN users u ON t.employee_id = u.id
            WHERE t.id = :id
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) return null;

        return [
            'id' => (int)$ticket['id'],
            'subject' => $ticket['subject'],
            'description' => $ticket['description'],
            'category' => $ticket['category'],
            'priority' => $ticket['priority'],
            'status' => $ticket['status'],
            'employee_id' => (int)$ticket['employee_id'],
            'createdAt' => $ticket['created_at'],
            'updatedAt' => $ticket['updated_at'],
            'submittedBy' => [
                'name' => $ticket['employee_name'],
                'department' => $ticket['employee_department']
            ],
            'comments' => $this->getCommentsForTicket($ticket['id'])
        ];
    }

    private function getCommentsForTicket($ticketId) {
        $query = "
            SELECT c.*, u.name as user_name, u.role as user_role 
            FROM ticket_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.ticket_id = :ticket_id
            ORDER BY c.created_at ASC
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['ticket_id' => $ticketId]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = [];
        foreach ($comments as $c) {
            $formatted[] = [
                'text' => $c['comment'],
                'date' => $c['created_at'],
                'by' => [
                    'name' => $c['user_name'],
                    'role' => $c['user_role']
                ]
            ];
        }
        return $formatted;
    }

    private function getComments($ticketId) {
        // verify access
        $stmt = $this->db->prepare("SELECT employee_id FROM tickets WHERE id = :id");
        $stmt->execute(['id' => $ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            Response::json(false, "Ticket not found", null, 404);
            return;
        }

        if (!in_array($this->user['role'], ['admin', 'hr']) && $ticket['employee_id'] !== $this->user['id']) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        $comments = $this->getCommentsForTicket($ticketId);
        Response::json(true, "Comments fetched", ['comments' => $comments], 200);
    }

    private function addComment($ticketId) {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['comment'])) {
            Response::json(false, "Comment is required", null, 400);
            return;
        }

        // verify access
        $stmt = $this->db->prepare("SELECT employee_id FROM tickets WHERE id = :id");
        $stmt->execute(['id' => $ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            Response::json(false, "Ticket not found", null, 404);
            return;
        }

        if (!in_array($this->user['role'], ['admin', 'hr']) && $ticket['employee_id'] !== $this->user['id']) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        $query = "INSERT INTO ticket_comments (ticket_id, user_id, comment) VALUES (:ticket_id, :user_id, :comment)";
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'ticket_id' => $ticketId,
            'user_id' => $this->user['id'],
            'comment' => $input['comment']
        ]);

        Response::json(true, "Comment added");
    }
}
?>
