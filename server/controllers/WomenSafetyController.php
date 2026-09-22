<?php

class WomenSafetyController {
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
                if ($this->id === 'my-reports') {
                    $this->getMyReports();
                } else if ($this->id === 'my-sos') {
                    $this->getMySos();
                } else if ($this->id === 'emergency-contacts') {
                    $this->getEmergencyContacts();
                } else if ($this->id === 'admin-stats' || $this->id === 'stats') {
                    $this->getAdminStats();
                } else if ($this->id === 'admin-reports' || $this->id === 'all-reports') {
                    $this->getAllReportsForAdmin();
                } else if ($this->id === 'admin-emergency' || $this->id === 'all-emergency') {
                    $this->getAllEmergencyRequestsForAdmin();
                } else if ($this->id) {
                    $this->getSingleReport();
                } else {
                    $this->getMyReports();
                }
                break;

            case 'POST':
                if ($this->id === 'sos') {
                    $this->triggerSosEmergency();
                } else if ($this->id === 'report') {
                    $this->submitSafetyReport();
                } else if ($this->id === 'update-status' || ($this->id && $this->subId === 'status')) {
                    $this->updateReportStatus();
                } else if ($this->id === 'update-emergency' || ($this->id && $this->subId === 'emergency-status')) {
                    $this->updateEmergencyStatus();
                } else {
                    $this->submitSafetyReport();
                }
                break;

            case 'PUT':
                if ($this->subId === 'emergency') {
                    $this->updateEmergencyStatus();
                } else {
                    $this->updateReportStatus();
                }
                break;

            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    // ── 1. EMPLOYEE: Trigger SOS Emergency ───────────────────────────────────
    private function triggerSosEmergency() {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $this->user['id'];
        $location = isset($data['location']) && trim($data['location']) !== '' ? trim($data['location']) : 'Workplace / Campus Area';
        $requestType = isset($data['request_type']) ? trim($data['request_type']) : 'SOS Emergency Trigger';

        try {
            $query = "INSERT INTO women_safety_emergency_requests 
                      (employee_id, request_type, location, status, created_at) 
                      VALUES (:employee_id, :request_type, :location, 'Emergency Raised', NOW())";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':employee_id' => $userId,
                ':request_type' => $requestType,
                ':location' => $location
            ]);

            $requestId = $this->db->lastInsertId();

            // Fetch reporter details
            $uStmt = $this->db->prepare("SELECT name, employee_id, department FROM users WHERE id = :uid");
            $uStmt->execute([':uid' => $userId]);
            $uInfo = $uStmt->fetch(PDO::FETCH_ASSOC);
            $empName = $uInfo['name'] ?? 'Employee';
            $empCode = $uInfo['employee_id'] ?? ('ID: ' . $userId);

            // Notify HR/Admin users via notifications table
            $this->notifyHrAdminUsers("🚨 EMERGENCY SOS ALERT RAISED", "Employee {$empName} ({$empCode}) triggered an Emergency SOS Alert at location: {$location}.", "emergency");

            Response::json(true, "🚨 Emergency SOS alert sent successfully to Corporate Security & HR!", [
                "request_id" => $requestId,
                "status" => "Emergency Raised",
                "location" => $location,
                "created_at" => date('Y-m-d H:i:s')
            ], 201);
        } catch (PDOException $e) {
            Response::json(false, "Error recording emergency alert: " . $e->getMessage(), null, 500);
        }
    }

    // ── 2. EMPLOYEE: Submit Safety Concern Report ─────────────────────────────
    private function submitSafetyReport() {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $this->user['id'];

        if (empty($data['concern_type']) || empty($data['description'])) {
            Response::json(false, "Missing required fields (concern_type, description)", null, 400);
            return;
        }

        $validTypes = [
            'Co-worker Related Issue',
            'Harassment',
            'Inappropriate Behaviour',
            'Verbal Misconduct',
            'Workplace Safety',
            'Unsafe Working Environment',
            'Environmental Issue',
            'Discrimination',
            'Threatening Behaviour',
            'Personal Safety Concern',
            'Other Workplace Concern'
        ];

        $concernType = in_array($data['concern_type'], $validTypes) ? $data['concern_type'] : 'Other Workplace Concern';
        $subject = !empty($data['subject']) ? trim($data['subject']) : 'Workplace Safety Concern';
        $description = trim($data['description']);
        $incidentDate = !empty($data['incident_date']) ? $data['incident_date'] : date('Y-m-d');
        $location = !empty($data['location']) ? trim($data['location']) : 'Workplace Campus';
        $personInvolved = !empty($data['person_involved']) ? trim($data['person_involved']) : null;
        $supportingInfo = !empty($data['supporting_info']) ? trim($data['supporting_info']) : null;
        $confidential = isset($data['confidential']) ? ($data['confidential'] ? 1 : 0) : 1;

        try {
            $query = "INSERT INTO women_safety_reports 
                      (employee_id, concern_type, subject, description, incident_date, location, person_involved, supporting_info, confidential, status, created_at)
                      VALUES 
                      (:employee_id, :concern_type, :subject, :description, :incident_date, :location, :person_involved, :supporting_info, :confidential, 'Submitted', NOW())";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':employee_id' => $userId,
                ':concern_type' => $concernType,
                ':subject' => $subject,
                ':description' => $description,
                ':incident_date' => $incidentDate,
                ':location' => $location,
                ':person_involved' => $personInvolved,
                ':supporting_info' => $supportingInfo,
                ':confidential' => $confidential
            ]);

            $reportId = $this->db->lastInsertId();

            // Notify HR
            $this->notifyHrAdminUsers("New Women Safety & Workplace Concern Filed", "A confidential report (ID: #{$reportId} - {$subject}) has been submitted for review.", "safety");

            Response::json(true, "Workplace concern report submitted confidentially to HR.", [
                "report_id" => $reportId,
                "status" => "Submitted"
            ], 201);
        } catch (PDOException $e) {
            Response::json(false, "Error submitting report: " . $e->getMessage(), null, 500);
        }
    }

    // ── 3. EMPLOYEE: View ONLY Own Submitted Reports ──────────────────────────
    private function getMyReports() {
        $userId = $this->user['id'];

        try {
            // STRICT PRIVACY: Employee ONLY sees their own reports. Never hr_notes.
            $query = "SELECT id, concern_type, subject, description, incident_date, location, person_involved, supporting_info, confidential, status, created_at, updated_at
                      FROM women_safety_reports 
                      WHERE employee_id = :employee_id 
                      ORDER BY created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute([':employee_id' => $userId]);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::json(true, "Your safety reports fetched successfully", $reports, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error fetching reports: " . $e->getMessage(), null, 500);
        }
    }

    // ── 4. EMPLOYEE: Get My Active SOS Alerts ────────────────────────────────
    private function getMySos() {
        $userId = $this->user['id'];

        try {
            $query = "SELECT * FROM women_safety_emergency_requests 
                      WHERE employee_id = :employee_id 
                      ORDER BY created_at DESC LIMIT 10";

            $stmt = $this->db->prepare($query);
            $stmt->execute([':employee_id' => $userId]);
            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::json(true, "SOS emergency requests fetched", $requests, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error fetching SOS history: " . $e->getMessage(), null, 500);
        }
    }

    // ── 5. EMERGENCY CONTACTS DIRECTORY ─────────────────────────────────────
    private function getEmergencyContacts() {
        $contacts = [
            ["name" => "Corporate Women Helpline", "phone" => "1800-425-9999", "role" => "24/7 Toll-Free Line", "highlight" => true],
            ["name" => "National Emergency SOS", "phone" => "112 / 1091", "role" => "Police & Women Safety", "highlight" => true],
            ["name" => "Women Safety Officer (Dr. Ananya Sharma)", "phone" => "+91 98765 43210", "role" => "Presiding Officer", "highlight" => false],
            ["name" => "Campus Security Desk", "phone" => "+91 98765 00000", "role" => "24/7 Campus Patrol", "highlight" => false],
            ["name" => "Employee Assistance & Wellbeing Desk", "phone" => "1800-200-8888", "role" => "Counseling & Wellbeing", "highlight" => false],
        ];

        Response::json(true, "Emergency contacts fetched", $contacts, 200);
    }

    // ── 6. HR/ADMIN: View All Confidential Safety Reports ────────────────────
    private function getAllReportsForAdmin() {
        if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
            Response::json(false, "Forbidden: Only authorized HR and Admin can view all safety reports", null, 403);
            return;
        }

        try {
            $status = $_GET['status'] ?? null;
            $search = $_GET['search'] ?? null;

            $query = "SELECT r.*, u.name AS reporter_name, u.email AS reporter_email, 
                             u.department AS reporter_department, u.phone AS reporter_phone, u.employee_id AS emp_code,
                             a.name AS assigned_to_name
                      FROM women_safety_reports r
                      JOIN users u ON r.employee_id = u.id
                      LEFT JOIN users a ON r.assigned_to = a.id
                      WHERE 1=1";

            $params = [];

            if ($status && $status !== 'All') {
                $query .= " AND r.status = :status";
                $params[':status'] = $status;
            }

            if ($search && trim($search) !== '') {
                $query .= " AND (r.concern_type LIKE :search OR r.description LIKE :search OR u.name LIKE :search OR r.location LIKE :search)";
                $params[':search'] = '%' . trim($search) . '%';
            }

            $query .= " ORDER BY r.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::json(true, "All safety reports fetched for HR/Admin", $reports, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error fetching reports: " . $e->getMessage(), null, 500);
        }
    }

    // ── 7. HR/ADMIN: View All Emergency SOS Requests ─────────────────────────
    private function getAllEmergencyRequestsForAdmin() {
        if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
            Response::json(false, "Forbidden: HR/Admin access required", null, 403);
            return;
        }

        try {
            $query = "SELECT e.*, u.name AS employee_name, u.email AS employee_email, 
                             u.department AS employee_department, u.phone AS employee_phone, u.employee_id AS emp_code
                      FROM women_safety_emergency_requests e
                      JOIN users u ON e.employee_id = u.id
                      ORDER BY e.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::json(true, "All emergency SOS requests fetched for HR/Admin", $requests, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error fetching emergency requests: " . $e->getMessage(), null, 500);
        }
    }

    // ── 8. HR/ADMIN: Update Report Status & HR Notes ─────────────────────────
    private function updateReportStatus() {
        if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
            Response::json(false, "Forbidden: Only HR/Admin can update safety report status", null, 403);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $reportId = $this->id ?? ($data['report_id'] ?? null);

        if (!$reportId) {
            Response::json(false, "Missing report ID", null, 400);
            return;
        }

        $status = $data['status'] ?? null;
        $hrNotes = $data['hr_notes'] ?? null;
        $actionTaken = $data['action_taken'] ?? null;
        $assignedTo = isset($data['assigned_to']) ? trim($data['assigned_to']) : null;

        $validStatuses = ['Submitted', 'Under Review', 'Assigned', 'Action in Progress', 'Resolved', 'Closed'];
        if ($status && !in_array($status, $validStatuses)) {
            Response::json(false, "Invalid status value", null, 400);
            return;
        }

        try {
            $query = "UPDATE women_safety_reports SET 
                        status = COALESCE(:status, status),
                        hr_notes = COALESCE(:hr_notes, hr_notes),
                        action_taken = COALESCE(:action_taken, action_taken),
                        assigned_to = COALESCE(:assigned_to, assigned_to),
                        updated_at = NOW()
                      WHERE id = :id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':status' => $status,
                ':hr_notes' => $hrNotes,
                ':action_taken' => $actionTaken,
                ':assigned_to' => $assignedTo,
                ':id' => $reportId
            ]);

            // Notify reporter of status update
            try {
                $rStmt = $this->db->prepare("SELECT employee_id, subject FROM women_safety_reports WHERE id = :id");
                $rStmt->execute([':id' => $reportId]);
                $reportInfo = $rStmt->fetch(PDO::FETCH_ASSOC);
                if ($reportInfo && !empty($reportInfo['employee_id'])) {
                    $nStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, 'safety', :rel_id, 'women_safety', 0, NOW(), NOW())");
                    $nStmt->execute([
                        ':uid' => $reportInfo['employee_id'],
                        ':title' => "Safety Report Update: " . ($status ?? 'Reviewed'),
                        ':msg' => "Your workplace safety report (#{$reportId} - {$reportInfo['subject']}) status has been updated to: " . ($status ?? 'Reviewed') . ".",
                        ':rel_id' => $reportId
                    ]);
                }
            } catch (Exception $ne) {}

            Response::json(true, "Safety report status updated successfully!", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error updating report: " . $e->getMessage(), null, 500);
        }
    }

    // ── 9. HR/ADMIN: Update Emergency Request Status ────────────────────────
    private function updateEmergencyStatus() {
        if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
            Response::json(false, "Forbidden: Only HR/Admin can update emergency status", null, 403);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $reqId = $this->id ?? ($data['request_id'] ?? null);

        if (!$reqId) {
            Response::json(false, "Missing emergency request ID", null, 400);
            return;
        }

        $status = $data['status'] ?? 'Acknowledged';

        try {
            $ackTime = ($status === 'Acknowledged' || $status === 'In Progress') ? date('Y-m-d H:i:s') : null;
            $resTime = ($status === 'Resolved') ? date('Y-m-d H:i:s') : null;

            $query = "UPDATE women_safety_emergency_requests SET 
                        status = :status,
                        acknowledged_at = COALESCE(:ack_time, acknowledged_at),
                        resolved_at = COALESCE(:res_time, resolved_at)
                      WHERE id = :id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':status' => $status,
                ':ack_time' => $ackTime,
                ':res_time' => $resTime,
                ':id' => $reqId
            ]);

            // Notify reporter of emergency status update
            try {
                $eStmt = $this->db->prepare("SELECT employee_id, location FROM women_safety_emergency_requests WHERE id = :id");
                $eStmt->execute([':id' => $reqId]);
                $sosInfo = $eStmt->fetch(PDO::FETCH_ASSOC);
                if ($sosInfo && !empty($sosInfo['employee_id'])) {
                    $nStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, 'emergency', :rel_id, 'women_safety', 0, NOW(), NOW())");
                    $nStmt->execute([
                        ':uid' => $sosInfo['employee_id'],
                        ':title' => "SOS Emergency Status: {$status}",
                        ':msg' => "Your Emergency SOS alert at location '{$sosInfo['location']}' has been updated to: {$status}.",
                        ':rel_id' => $reqId
                    ]);
                }
            } catch (Exception $ne) {}

            Response::json(true, "Emergency SOS status updated to {$status}", null, 200);
        } catch (PDOException $e) {
            Response::json(false, "Error updating emergency request: " . $e->getMessage(), null, 500);
        }
    }

    // ── 10. HR/ADMIN: Dashboard Statistics ────────────────────────────────────
    private function getAdminStats() {
        if ($this->user['role'] !== 'admin' && $this->user['role'] !== 'hr') {
            Response::json(false, "Forbidden: HR/Admin access required", null, 403);
            return;
        }

        try {
            $totalStmt = $this->db->prepare("SELECT COUNT(*) FROM women_safety_reports");
            $totalStmt->execute();
            $totalReports = (int)$totalStmt->fetchColumn();

            $openStmt = $this->db->prepare("SELECT COUNT(*) FROM women_safety_reports WHERE status = 'Submitted'");
            $openStmt->execute();
            $openReports = (int)$openStmt->fetchColumn();

            $inProgStmt = $this->db->prepare("SELECT COUNT(*) FROM women_safety_reports WHERE status IN ('Under Review', 'Assigned', 'Action in Progress', 'In Progress', 'Acknowledged')");
            $inProgStmt->execute();
            $inProgress = (int)$inProgStmt->fetchColumn();

            $resStmt = $this->db->prepare("SELECT COUNT(*) FROM women_safety_reports WHERE status IN ('Resolved', 'Closed')");
            $resStmt->execute();
            $resolved = (int)$resStmt->fetchColumn();

            $sosStmt = $this->db->prepare("SELECT COUNT(*) FROM women_safety_emergency_requests WHERE status = 'Emergency Raised' OR status = 'Acknowledged'");
            $sosStmt->execute();
            $emergencyRequests = (int)$sosStmt->fetchColumn();

            Response::json(true, "Admin statistics fetched", [
                "total_reports" => $totalReports,
                "open_reports" => $openReports,
                "in_progress" => $inProgress,
                "resolved" => $resolved,
                "emergency_requests" => $emergencyRequests
            ], 200);
        } catch (PDOException $e) {
            Response::json(false, "Error fetching stats: " . $e->getMessage(), null, 500);
        }
    }

    // Helper method to notify HR & Admin users
    private function notifyHrAdminUsers($title, $message, $type = 'safety') {
        try {
            $hrStmt = $this->db->prepare("SELECT id FROM users WHERE role IN ('admin', 'hr')");
            $hrStmt->execute();
            $admins = $hrStmt->fetchAll(PDO::FETCH_ASSOC);

            $notifStmt = $this->db->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (:uid, :title, :msg, :type, 0, 'women_safety', 0, NOW(), NOW())");
            foreach ($admins as $adm) {
                $notifStmt->execute([
                    ':uid' => $adm['id'],
                    ':title' => $title,
                    ':msg' => $message,
                    ':type' => $type
                ]);
            }
        } catch (Exception $e) {
            // Error logging if needed
        }
    }
}
?>
