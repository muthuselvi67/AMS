<?php

class AnnouncementController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;

    public function __construct($db, $requestMethod, $id, $user = null) {
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
                $this->getAnnouncements();
                break;
            case 'POST':
                if (in_array($this->user['role'], ['admin', 'hr'])) {
                    $this->createAnnouncement();
                } else {
                    Response::json(false, "Forbidden", null, 403);
                }
                break;
            case 'PUT':
                if (in_array($this->user['role'], ['admin', 'hr']) && $this->id) {
                    $this->updateAnnouncement($this->id);
                } else {
                    Response::json(false, "Forbidden or Missing ID", null, 403);
                }
                break;
            case 'DELETE':
                if (in_array($this->user['role'], ['admin', 'hr']) && $this->id) {
                    $this->deleteAnnouncement($this->id);
                } else {
                    Response::json(false, "Forbidden or Missing ID", null, 403);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getAnnouncements() {
        $role = $this->user['role'];
        $type = isset($_GET['type']) ? $_GET['type'] : null;

        $query = "
            SELECT a.*, u.name as posted_by_name 
            FROM announcements a
            LEFT JOIN users u ON a.posted_by = u.id
            WHERE 1=1
        ";

        // Filter by audience
        if (!in_array($role, ['admin', 'hr'])) {
            // Employees only see 'all' or 'employee'
            $query .= " AND a.audience IN ('all', 'employee')";
        }

        $params = [];
        if ($type) {
            $query .= " AND a.type = :type";
            $params['type'] = $type;
        }

        $query .= " ORDER BY a.pinned DESC, a.created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $announcements = [];
        foreach ($rows as $row) {
            $announcements[] = [
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'content' => $row['content'],
                'type' => $row['type'],
                'audience' => $row['audience'],
                'pinned' => (bool)$row['pinned'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at'],
                'postedBy' => [
                    'id' => $row['posted_by'],
                    'name' => $row['posted_by_name']
                ]
            ];
        }

        // Fetch birthdays of active users for the current month
        $birthdayAnnouncements = [];
        if (!$type || $type === 'birthday') {
            $currentMonth = date('m');
            $currentYear = date('Y');
            
            $bStmt = $this->db->prepare("
                SELECT id, name, department, position, date_of_birth 
                FROM users 
                WHERE is_active = 1 
                  AND date_of_birth IS NOT NULL 
                  AND MONTH(date_of_birth) = :month
            ");
            $bStmt->execute(['month' => $currentMonth]);
            $birthdayUsers = $bStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($birthdayUsers as $bu) {
                // Determine the createdAt date for this birthday in the current year
                $bDateOnly = substr($bu['date_of_birth'], 5); // MM-DD
                $createdAt = $currentYear . '-' . $bDateOnly . ' 00:00:00';
                
                $birthdayAnnouncements[] = [
                    'id' => 'birthday_' . $bu['id'] . '_' . $currentYear,
                    'title' => "Happy Birthday " . $bu['name'] . "! 🎂",
                    'content' => "Wishing " . $bu['name'] . " (" . ($bu['position'] ?: 'Employee') . " in " . ($bu['department'] ?: 'No Department') . ") a very Happy Birthday! 🎉 Let's all wish them a fantastic day ahead! 🎂🎈",
                    'type' => 'birthday',
                    'audience' => 'all',
                    'pinned' => false,
                    'createdAt' => $createdAt,
                    'updatedAt' => $createdAt,
                    'postedBy' => [
                        'id' => null,
                        'name' => 'System'
                    ]
                ];
            }
        }

        $all = array_merge($announcements, $birthdayAnnouncements);
        
        // Sort: pinned DESC, then createdAt DESC
        usort($all, function($a, $b) {
            if ($a['pinned'] != $b['pinned']) {
                return $b['pinned'] ? 1 : -1;
            }
            return strcmp($b['createdAt'], $a['createdAt']);
        });

        Response::json(true, "Announcements fetched successfully", ['announcements' => $all], 200);
    }

    private function createAnnouncement() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['title']) || empty($input['content'])) {
            Response::json(false, "Title and content are required", null, 400);
            return;
        }

        $query = "
            INSERT INTO announcements (title, content, type, audience, pinned, posted_by)
            VALUES (:title, :content, :type, :audience, :pinned, :posted_by)
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'title' => $input['title'],
            'content' => $input['content'],
            'type' => $input['type'] ?? 'announcement',
            'audience' => $input['audience'] ?? 'all',
            'pinned' => isset($input['pinned']) ? (int)$input['pinned'] : 0,
            'posted_by' => $this->user['id']
        ]);

        $announcementId = $this->db->lastInsertId();

        // Send notifications to users
        $aud = $input['audience'] ?? 'all';
        $userQuery = "SELECT id FROM users WHERE is_active = 1";
        if ($aud === 'employee') {
            $userQuery .= " AND role = 'employee'";
        }
        $userStmt = $this->db->query($userQuery);
        $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($users) > 0) {
            $notifTitle = "New Announcement: " . $input['title'];
            $notifMessage = "A new announcement has been posted by " . $this->user['name'] . ".";
            
            $notifStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model) VALUES (:rid, :title, :msg, 'general', :rel_id, 'announcements')");
            foreach ($users as $u) {
                // Don't notify the person who posted it
                if ($u['id'] == $this->user['id']) continue;

                $notifStmt->execute([
                    ':rid' => $u['id'],
                    ':title' => $notifTitle,
                    ':msg' => $notifMessage,
                    ':rel_id' => $announcementId
                ]);
            }
        }

        Response::json(true, "Announcement created successfully", ['id' => $announcementId], 201);
    }

    private function updateAnnouncement($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['title']) || empty($input['content'])) {
            Response::json(false, "Title and content are required", null, 400);
            return;
        }

        $query = "
            UPDATE announcements
            SET title = :title, content = :content, type = :type, audience = :audience, pinned = :pinned
            WHERE id = :id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'id' => $id,
            'title' => $input['title'],
            'content' => $input['content'],
            'type' => $input['type'] ?? 'announcement',
            'audience' => $input['audience'] ?? 'all',
            'pinned' => isset($input['pinned']) ? (int)$input['pinned'] : 0
        ]);

        Response::json(true, "Announcement updated successfully");
    }

    private function deleteAnnouncement($id) {
        $query = "DELETE FROM announcements WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);

        Response::json(true, "Announcement deleted successfully");
    }
}
?>
