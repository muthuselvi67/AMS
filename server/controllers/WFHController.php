<?php

class WFHController {
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

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                $this->getUpdates();
                break;
            case 'POST':
                $this->submitUpdate();
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
        }
    }

    /**
     * GET /api/wfh-updates[?date=YYYY-MM-DD]
     * Returns all WFH updates for the requesting employee on a given date.
     * Admins/HR can also pass ?employee_id=X to view another employee.
     */
    private function getUpdates() {
        $date       = $_GET['date']        ?? date('Y-m-d');
        $employeeId = $_GET['employee_id'] ?? $this->user['id'];

        // Only admin/hr can query other employees
        if ($employeeId != $this->user['id'] &&
            !in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        // Find the attendance record for that day
        $attStmt = $this->db->prepare(
            "SELECT id, work_from_home FROM attendances
             WHERE employee_id = :emp AND date = :date LIMIT 1"
        );
        $attStmt->execute([':emp' => $employeeId, ':date' => $date]);
        $att = $attStmt->fetch(PDO::FETCH_ASSOC);

        if (!$att) {
            Response::json(true, "No attendance record found", ['updates' => [], 'attendance_id' => null, 'is_wfh' => false], 200);
            return;
        }

        $stmt = $this->db->prepare(
            "SELECT id, attendance_id, update_text, submitted_at, is_final
             FROM wfh_updates
             WHERE attendance_id = :att_id
             ORDER BY submitted_at ASC"
        );
        $stmt->execute([':att_id' => $att['id']]);
        $updates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($updates as &$u) {
            $u['is_final'] = (bool)$u['is_final'];
        }

        Response::json(true, "WFH updates fetched", [
            'updates'       => $updates,
            'attendance_id' => $att['id'],
            'is_wfh'        => (bool)$att['work_from_home']
        ], 200);
    }

    /**
     * POST /api/wfh-updates
     * Body: { update_text, is_final? }
     * Submits a WFH progress update for today's attendance record.
     */
    private function submitUpdate() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty(trim($data['update_text'] ?? ''))) {
            Response::json(false, "Update text is required", null, 400);
            return;
        }

        $today      = date('Y-m-d');
        $employeeId = $this->user['id'];
        $isFinal    = !empty($data['is_final']) ? 1 : 0;

        // Find today's attendance record
        $attStmt = $this->db->prepare(
            "SELECT id, work_from_home, check_out_time FROM attendances
             WHERE employee_id = :emp AND date = :date LIMIT 1"
        );
        $attStmt->execute([':emp' => $employeeId, ':date' => $today]);
        $att = $attStmt->fetch(PDO::FETCH_ASSOC);

        if (!$att) {
            Response::json(false, "You must check in first before submitting a WFH update.", null, 400);
            return;
        }

        if (!$att['work_from_home']) {
            Response::json(false, "Today's attendance is not marked as Work From Home.", null, 400);
            return;
        }

        // Validate EOD window (17:30 – 18:00) for final updates
        if ($isFinal) {
            $now     = date('H:i');
            $eodStart = '17:30';
            $eodEnd   = '18:00';
            if ($now < $eodStart || $now > $eodEnd) {
                Response::json(false, "The final EOD report can only be submitted between 5:30 PM and 6:00 PM.", null, 400);
                return;
            }
        }

        // Prevent duplicate final update
        if ($isFinal) {
            $dupStmt = $this->db->prepare(
                "SELECT id FROM wfh_updates WHERE attendance_id = :att_id AND is_final = 1 LIMIT 1"
            );
            $dupStmt->execute([':att_id' => $att['id']]);
            if ($dupStmt->rowCount() > 0) {
                Response::json(false, "A final EOD report has already been submitted for today.", null, 400);
                return;
            }
        }

        // Insert update
        $stmt = $this->db->prepare(
            "INSERT INTO wfh_updates (attendance_id, update_text, submitted_at, is_final)
             VALUES (:att_id, :text, NOW(), :is_final)"
        );
        $stmt->execute([
            ':att_id'   => $att['id'],
            ':text'     => trim($data['update_text']),
            ':is_final' => $isFinal
        ]);

        // Notify HR/Admin (insert notification)
        try {
            $empNameStmt = $this->db->prepare("SELECT name FROM users WHERE id = :id LIMIT 1");
            $empNameStmt->execute([':id' => $employeeId]);
            $empName = $empNameStmt->fetchColumn() ?: 'Employee';

            $notifTitle   = $isFinal ? 'Final EOD WFH Report Submitted' : 'WFH Progress Update';
            $notifMessage = $isFinal
                ? "{$empName} submitted their final EOD WFH report."
                : "{$empName} submitted a WFH progress update.";

            // Fetch all admins and HR to notify
            $hrStmt = $this->db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
            $hrUsers = $hrStmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($hrUsers as $hrId) {
                $nStmt = $this->db->prepare(
                    "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                     VALUES (:uid, :title, :msg, 'wfh_update', :att_id, 'attendances', 0, NOW(), NOW())"
                );
                $nStmt->execute([':uid' => $hrId, ':title' => $notifTitle, ':msg' => $notifMessage, ':att_id' => $att['id']]);
            }
        } catch (Exception $e) {
            // Notification failure is non-critical, continue
        }

        Response::json(true, $isFinal ? "Final EOD report submitted successfully!" : "WFH update submitted successfully!", [
            'id' => $this->db->lastInsertId()
        ], 201);
    }
}
?>
