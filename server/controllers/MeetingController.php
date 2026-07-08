<?php

class MeetingController {
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
                $this->getMeetings();
                break;
            case 'POST':
                if (in_array($this->user['role'], ['admin', 'hr'])) {
                    $this->createMeeting();
                } else {
                    Response::json(false, "Forbidden", null, 403);
                }
                break;
            case 'DELETE':
                if (in_array($this->user['role'], ['admin', 'hr']) && $this->id) {
                    $this->deleteMeeting($this->id);
                } else {
                    Response::json(false, "Forbidden or Missing ID", null, 403);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getMeetings() {
        try {
            $query = "SELECT m.*, u.name as organizer_name 
                      FROM meetings m 
                      JOIN users u ON m.organizer_id = u.id 
                      ORDER BY m.meeting_date ASC, m.start_time ASC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $meetings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::json(true, "Meetings retrieved successfully", $meetings);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function createMeeting() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['title']) || empty($input['meeting_date']) || empty($input['start_time']) || empty($input['end_time'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        try {
            $query = "INSERT INTO meetings (title, description, meeting_date, start_time, end_time, link, organizer_id, attendees) 
                      VALUES (:title, :description, :meeting_date, :start_time, :end_time, :link, :organizer_id, :attendees)";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':title' => $input['title'],
                ':description' => isset($input['description']) ? $input['description'] : null,
                ':meeting_date' => $input['meeting_date'],
                ':start_time' => $input['start_time'],
                ':end_time' => $input['end_time'],
                ':link' => isset($input['link']) ? $input['link'] : null,
                ':organizer_id' => $this->user['id'],
                ':attendees' => isset($input['attendees']) ? json_encode($input['attendees']) : null
            ]);

            $meetingId = $this->db->lastInsertId();

            if (isset($input['attendees']) && is_array($input['attendees'])) {
                $notifTitle = "New Meeting Scheduled: " . $input['title'];
                $notifMessage = $this->user['name'] . " has scheduled a meeting with you on " . $input['meeting_date'] . " at " . $input['start_time'] . ".";
                
                $notifStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model) VALUES (:rid, :title, :msg, 'general', :rel_id, 'meetings')");
                foreach ($input['attendees'] as $attId) {
                    $notifStmt->execute([
                        ':rid' => $attId,
                        ':title' => $notifTitle,
                        ':msg' => $notifMessage,
                        ':rel_id' => $meetingId
                    ]);
                }
            }

            Response::json(true, "Meeting scheduled successfully", null, 201);
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }

    private function deleteMeeting($id) {
        try {
            $query = "DELETE FROM meetings WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() > 0) {
                Response::json(true, "Meeting deleted successfully");
            } else {
                Response::json(false, "Meeting not found", null, 404);
            }
        } catch (PDOException $e) {
            Response::json(false, "Database error: " . $e->getMessage(), null, 500);
        }
    }
}
