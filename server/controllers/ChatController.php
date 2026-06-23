<?php

class ChatController {
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
                if ($this->id === 'users') {
                    $this->getChatUsers();
                } elseif ($this->id === 'messages' && $this->subId) {
                    $this->getMessages($this->subId);
                } else {
                    Response::json(false, "Invalid endpoint layout", null, 400);
                }
                break;
            case 'POST':
                if ($this->id === 'messages') {
                    $this->sendMessage();
                } else {
                    Response::json(false, "Invalid endpoint layout", null, 400);
                }
                break;
            case 'PUT':
                if ($this->id === 'read' && $this->subId) {
                    $this->markAsRead($this->subId);
                } else {
                    Response::json(false, "Invalid endpoint layout", null, 400);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getChatUsers() {
        $currentUserId = $this->user['id'];

        $query = "
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.avatar, 
                u.role, 
                u.department, 
                u.position,
                (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.recipient_id = :current_user_id AND m.is_read = 0) as unread_count,
                (SELECT m.message FROM messages m 
                 WHERE (m.sender_id = u.id AND m.recipient_id = :current_user_id) 
                    OR (m.sender_id = :current_user_id AND m.recipient_id = u.id)
                 ORDER BY m.created_at DESC LIMIT 1) as last_message,
                (SELECT m.created_at FROM messages m 
                 WHERE (m.sender_id = u.id AND m.recipient_id = :current_user_id) 
                    OR (m.sender_id = :current_user_id AND m.recipient_id = u.id)
                 ORDER BY m.created_at DESC LIMIT 1) as last_message_time
            FROM users u
            WHERE u.id != :current_user_id AND u.is_active = 1
            ORDER BY last_message_time DESC, u.name ASC
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([':current_user_id' => $currentUserId]);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Cast unread_count to integer
            foreach ($users as &$u) {
                $u['unread_count'] = (int)$u['unread_count'];
            }

            Response::json(true, "Chat users fetched successfully", $users, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function getMessages($recipientId) {
        $currentUserId = $this->user['id'];

        try {
            // Automatically mark unread messages from this recipient as read
            $updateQuery = "
                UPDATE messages
                SET is_read = 1
                WHERE sender_id = :recipient_id AND recipient_id = :current_user_id AND is_read = 0
            ";
            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->execute([
                ':recipient_id' => $recipientId,
                ':current_user_id' => $currentUserId
            ]);

            $query = "
                SELECT id, sender_id, recipient_id, message, is_read, created_at
                FROM messages
                WHERE (sender_id = :current_user_id AND recipient_id = :recipient_id)
                   OR (sender_id = :recipient_id AND recipient_id = :current_user_id)
                ORDER BY created_at ASC
            ";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':current_user_id' => $currentUserId,
                ':recipient_id' => $recipientId
            ]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Cast fields
            foreach ($messages as &$m) {
                $m['id'] = (int)$m['id'];
                $m['sender_id'] = (int)$m['sender_id'];
                $m['recipient_id'] = (int)$m['recipient_id'];
                $m['is_read'] = (bool)$m['is_read'];
            }

            Response::json(true, "Messages fetched successfully", $messages, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function sendMessage() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['recipient_id']) || empty($input['message'])) {
            Response::json(false, "Recipient ID and message are required", null, 400);
            return;
        }

        $senderId = $this->user['id'];
        $recipientId = (int)$input['recipient_id'];
        $message = trim($input['message']);

        if ($senderId === $recipientId) {
            Response::json(false, "You cannot send messages to yourself", null, 400);
            return;
        }

        $query = "
            INSERT INTO messages (sender_id, recipient_id, message, is_read)
            VALUES (:sender_id, :recipient_id, :message, 0)
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':sender_id' => $senderId,
                ':recipient_id' => $recipientId,
                ':message' => $message
            ]);

            $messageId = $this->db->lastInsertId();

            Response::json(true, "Message sent successfully", [
                'id' => (int)$messageId,
                'sender_id' => $senderId,
                'recipient_id' => $recipientId,
                'message' => $message,
                'is_read' => false,
                'created_at' => date('Y-m-d H:i:s')
            ], 201);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function markAsRead($senderId) {
        $currentUserId = $this->user['id'];

        $query = "
            UPDATE messages
            SET is_read = 1
            WHERE sender_id = :sender_id AND recipient_id = :current_user_id AND is_read = 0
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':sender_id' => $senderId,
                ':current_user_id' => $currentUserId
            ]);

            Response::json(true, "Messages marked as read successfully", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }
}
?>
