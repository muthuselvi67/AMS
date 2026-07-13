<?php

class NotificationController {
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
                $this->getNotifications();
                break;
            case 'PUT':
                if ($this->id === 'read-all') {
                    $this->markAllAsRead();
                } elseif ($this->id && $this->subId === 'read') {
                    $this->markAsRead($this->id);
                } else {
                    Response::json(false, "Not Found", null, 404);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getNotifications() {
        $userId = $this->user['id'];

        $this->generateBirthdayNotifications();
        $this->generateAttendanceReminders();

        $query = "SELECT * FROM notifications WHERE recipient_id = :recipient_id ORDER BY created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['recipient_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $notifications = [];
        foreach ($rows as $row) {
            $notifications[] = [
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'message' => $row['message'],
                'type' => $row['type'],
                'isRead' => (bool)$row['is_read'],
                'createdAt' => $row['created_at'],
                'relatedId' => $row['related_id'],
                'relatedModel' => $row['related_model']
            ];
        }

        Response::json(true, "Notifications fetched successfully", ['notifications' => $notifications], 200);
    }

    private function generateAttendanceReminders() {
        date_default_timezone_set('Asia/Kolkata');
        $today = date('Y-m-d');
        $now = date('H:i:s');

        // 1. Check-in Reminder (Time is 10:00:00 or later)
        if ($now >= '10:00:00') {
            $query = "SELECT id, name FROM users 
                      WHERE is_active = 1 
                      AND id NOT IN (SELECT employee_id FROM attendances WHERE date = :today)
                      AND id NOT IN (
                          SELECT employee_id FROM leave_requests 
                          WHERE :today2 BETWEEN start_date AND end_date AND status = 'approved'
                      )";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([':today' => $today, ':today2' => $today]);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($employees as $emp) {
                $title = "Check-in Reminder";
                $checkNotif = $this->db->prepare("SELECT id FROM notifications WHERE recipient_id = :uid AND title = :title AND DATE(created_at) = :today LIMIT 1");
                $checkNotif->execute([':uid' => $emp['id'], ':title' => $title, ':today' => $today]);

                if ($checkNotif->rowCount() == 0) {
                    $msg = "not check in";
                    $insert = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, 'attendance', 0, 'attendances', 0, NOW(), NOW())");
                    $insert->execute([':uid' => $emp['id'], ':title' => $title, ':msg' => $msg]);
                }
            }
        }

        // 2. Check-out Reminder (Time is 18:00:00 or later)
        if ($now >= '18:00:00') {
            $query = "SELECT a.id as attendance_id, u.id as employee_id, u.name 
                      FROM attendances a
                      JOIN users u ON a.employee_id = u.id
                      WHERE a.date = :today 
                      AND a.check_out_time IS NULL
                      AND u.is_active = 1";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([':today' => $today]);
            $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($attendances as $att) {
                $title = "Check-out Reminder";
                $checkNotif = $this->db->prepare("SELECT id FROM notifications WHERE recipient_id = :uid AND title = :title AND DATE(created_at) = :today LIMIT 1");
                $checkNotif->execute([':uid' => $att['employee_id'], ':title' => $title, ':today' => $today]);

                if ($checkNotif->rowCount() == 0) {
                    $msg = "not check out";
                    $insert = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, 'attendance', :related_id, 'attendances', 0, NOW(), NOW())");
                    $insert->execute([':uid' => $att['employee_id'], ':title' => $title, ':msg' => $msg, ':related_id' => $att['attendance_id']]);
                }
            }
        }
    }

    private function generateBirthdayNotifications() {
        try {
            $todayMonth = date('m');
            $todayDay = date('d');
            $currentYear = date('Y');

            // Find active users who have their birthday today
            $stmt = $this->db->prepare("
                SELECT id, name FROM users 
                WHERE is_active = 1 
                  AND date_of_birth IS NOT NULL 
                  AND MONTH(date_of_birth) = :month 
                  AND DAY(date_of_birth) = :day
            ");
            $stmt->execute(['month' => $todayMonth, 'day' => $todayDay]);
            $birthdayUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($birthdayUsers as $bUser) {
                $bUserId = $bUser['id'];
                $bUserName = $bUser['name'];

                // Check if notifications have already been created for this user's birthday this year
                $checkStmt = $this->db->prepare("
                    SELECT COUNT(*) FROM notifications 
                    WHERE type = 'birthday' 
                      AND related_id = :rel_id 
                      AND YEAR(created_at) = :year
                ");
                $checkStmt->execute(['rel_id' => $bUserId, 'year' => $currentYear]);
                $exists = $checkStmt->fetchColumn() > 0;

                if (!$exists) {
                    // Get all active users to notify (excluding the birthday person)
                    $userStmt = $this->db->prepare("SELECT id FROM users WHERE is_active = 1 AND id != :b_user_id");
                    $userStmt->execute(['b_user_id' => $bUserId]);
                    $activeUsers = $userStmt->fetchAll(PDO::FETCH_ASSOC);

                    if (count($activeUsers) > 0) {
                        $this->db->beginTransaction();
                        $insertStmt = $this->db->prepare("
                            INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) 
                            VALUES (:recipient_id, :title, :message, 'birthday', :related_id, 'users', 0, NOW(), NOW())
                        ");

                        foreach ($activeUsers as $aUser) {
                            $insertStmt->execute([
                                'recipient_id' => $aUser['id'],
                                'title' => "Birthday Today: " . $bUserName,
                                'message' => "Today is " . $bUserName . "'s birthday! Don't forget to wish them a happy birthday!",
                                'related_id' => $bUserId
                            ]);
                        }
                        $this->db->commit();
                    }
                }
            }
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
        }
    }

    private function markAsRead($id) {
        $userId = $this->user['id'];

        $query = "UPDATE notifications SET is_read = 1 WHERE id = :id AND recipient_id = :recipient_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'id' => $id,
            'recipient_id' => $userId
        ]);

        Response::json(true, "Notification marked as read");
    }

    private function markAllAsRead() {
        $userId = $this->user['id'];

        $query = "UPDATE notifications SET is_read = 1 WHERE recipient_id = :recipient_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['recipient_id' => $userId]);

        Response::json(true, "All notifications marked as read");
    }
}
?>
