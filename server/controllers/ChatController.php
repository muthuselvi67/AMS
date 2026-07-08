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
                } elseif ($this->id === 'upload') {
                    $this->uploadFile();
                } elseif ($this->id === 'vote') {
                    $this->castVote();
                } else {
                    Response::json(false, "Invalid endpoint layout", null, 400);
                }
                break;
            case 'PUT':
                if ($this->id === 'read' && $this->subId) {
                    $this->markAsRead($this->subId);
                } elseif ($this->id === 'profile') {
                    $this->updateChatProfile();
                } elseif ($this->id === 'message' && $this->subId) {
                    $this->editMessage($this->subId);
                } else {
                    Response::json(false, "Invalid endpoint layout", null, 400);
                }
                break;
            case 'DELETE':
                if ($this->id === 'messages' && $this->subId) {
                    $this->deleteMessages($this->subId);
                } elseif ($this->id === 'message' && $this->subId) {
                    $this->deleteSingleMessage($this->subId);
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
                COALESCE(u.chat_name, u.name) as name, 
                u.email, 
                COALESCE(u.chat_avatar, u.avatar) as avatar, 
                u.role, 
                u.department, 
                u.position,
                u.last_active,
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
                $m['votes'] = [];
            }

            // Fetch votes for these messages
            if (!empty($messages)) {
                $msgIds = array_column($messages, 'id');
                $in = implode(',', array_map('intval', $msgIds));
                $voteQuery = "SELECT message_id, user_id, option_index FROM chat_poll_votes WHERE message_id IN ($in)";
                $voteStmt = $this->db->query($voteQuery);
                $votes = $voteStmt->fetchAll(PDO::FETCH_ASSOC);

                // Group votes by message
                $votesByMessage = [];
                foreach ($votes as $v) {
                    $mId = (int)$v['message_id'];
                    if (!isset($votesByMessage[$mId])) {
                        $votesByMessage[$mId] = [];
                    }
                    $votesByMessage[$mId][] = [
                        'user_id' => (int)$v['user_id'],
                        'option_index' => (int)$v['option_index']
                    ];
                }

                // Attach votes to messages
                foreach ($messages as &$m) {
                    $mId = $m['id'];
                    if (isset($votesByMessage[$mId])) {
                        $m['votes'] = $votesByMessage[$mId];
                    }
                }
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

    private function uploadFile() {
        if (!isset($_FILES['file'])) {
            Response::json(false, "No file uploaded", null, 400);
            return;
        }

        $file = $_FILES['file'];
        $uploadDir = __DIR__ . '/../uploads/chat/';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = uniqid() . '_' . basename($file['name']);
        $targetPath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $url = 'uploads/chat/' . $filename;
            Response::json(true, "File uploaded successfully", ['url' => $url, 'name' => $file['name']], 200);
        } else {
            Response::json(false, "Failed to move uploaded file", null, 500);
        }
    }

    private function castVote() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['message_id']) || !isset($input['option_index'])) {
            Response::json(false, "Message ID and option index are required", null, 400);
            return;
        }

        $userId = $this->user['id'];
        $messageId = (int)$input['message_id'];
        $optionIndex = (int)$input['option_index'];

        $query = "
            INSERT INTO chat_poll_votes (message_id, user_id, option_index)
            VALUES (:message_id, :user_id, :option_index)
            ON DUPLICATE KEY UPDATE option_index = :option_index2
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':message_id' => $messageId,
                ':user_id' => $userId,
                ':option_index' => $optionIndex,
                ':option_index2' => $optionIndex
            ]);

            Response::json(true, "Vote cast successfully", null, 200);
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

    private function updateChatProfile() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            Response::json(false, "Invalid request", null, 400);
            return;
        }

        $query = "UPDATE users SET 
                    chat_name = COALESCE(:chat_name, chat_name),
                    chat_about = COALESCE(:chat_about, chat_about),
                    chat_avatar = COALESCE(:chat_avatar, chat_avatar)
                  WHERE id = :id";
        
        $stmt = $this->db->prepare($query);
        $name = isset($data['name']) ? $data['name'] : null;
        $about = isset($data['about']) ? $data['about'] : null;
        $stmt->bindParam(':chat_name', $name);
        $stmt->bindParam(':chat_about', $about);
        
        $chatAvatar = $this->saveImageFile($data['avatar'] ?? null, 'uploads/chat_avatars/');
        $stmt->bindParam(':chat_avatar', $chatAvatar);
        
        $userId = $this->user['id'];
        $stmt->bindParam(':id', $userId);

        if($stmt->execute()) {
            Response::json(true, "Chat profile updated successfully", [
                "user" => [
                    "avatar" => $chatAvatar
                ]
            ], 200);
        } else {
            Response::json(false, "Failed to update chat profile", null, 500);
        }
    }

    private function saveImageFile(?string $value, string $subFolder): ?string {
        if (empty($value)) return null;
        if (!str_starts_with($value, 'data:image/')) return $value;

        $commaPos = strpos($value, ',');
        if ($commaPos === false) return null;

        $base64    = substr($value, $commaPos + 1);
        $base64    = str_replace(' ', '+', $base64); 
        $imageData = base64_decode($base64, true);
        if ($imageData === false) return null;

        if (extension_loaded('gd')) {
            $gd = @imagecreatefromstring($imageData);
            if ($gd !== false) {
                $w = imagesx($gd);
                $h = imagesy($gd);
                $canvas = imagecreatetruecolor($w, $h);
                $white  = imagecolorallocate($canvas, 255, 255, 255);
                imagefill($canvas, 0, 0, $white);
                imagecopy($canvas, $gd, 0, 0, 0, 0, $w, $h);
                imagedestroy($gd);
                ob_start();
                imagejpeg($canvas, null, 90);
                $imageData = ob_get_clean();
                imagedestroy($canvas);
            }
        }

        $absFolder = __DIR__ . '/../' . ltrim($subFolder, '/');
        if (!is_dir($absFolder)) {
            mkdir($absFolder, 0755, true);
        }

        $fileName = 'Image_' . date('Ymd_His') . '.jpeg';
        $filePath = $absFolder . $fileName;

        if (file_put_contents($filePath, $imageData) === false) {
            return null;
        }

        return '/' . ltrim($subFolder, '/') . $fileName;
    }

    private function deleteMessages($recipientId) {
        $currentUserId = $this->user['id'];

        $query = "
            DELETE FROM messages
            WHERE (sender_id = :current_user_id AND recipient_id = :recipient_id)
               OR (sender_id = :recipient_id AND recipient_id = :current_user_id)
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':current_user_id' => $currentUserId,
                ':recipient_id' => $recipientId
            ]);

            Response::json(true, "Messages deleted successfully", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function editMessage($messageId) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['message'])) {
            Response::json(false, "Message content is required", null, 400);
            return;
        }

        $query = "UPDATE messages SET message = :message WHERE id = :id AND sender_id = :sender_id";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':message' => $data['message'],
                ':id' => $messageId,
                ':sender_id' => $this->user['id']
            ]);

            if ($stmt->rowCount() > 0) {
                Response::json(true, "Message updated successfully", null, 200);
            } else {
                Response::json(false, "Message not found or you don't have permission", null, 403);
            }
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function deleteSingleMessage($messageId) {
        $query = "DELETE FROM messages WHERE id = :id AND sender_id = :sender_id";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':id' => $messageId,
                ':sender_id' => $this->user['id']
            ]);

            if ($stmt->rowCount() > 0) {
                Response::json(true, "Message deleted successfully", null, 200);
            } else {
                Response::json(false, "Message not found or you don't have permission", null, 403);
            }
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }
}
?>
