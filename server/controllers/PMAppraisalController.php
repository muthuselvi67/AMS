<?php

class PMAppraisalController {
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

        // Special routes
        if ($this->requestMethod === 'GET' && $this->id === 'stats') {
            $this->getStats();
            return;
        }

        if ($this->requestMethod === 'POST' && $this->subId === 'approve') {
            $this->approveAppraisal($this->id);
            return;
        }

        if ($this->requestMethod === 'POST' && $this->subId === 'reject') {
            $this->rejectAppraisal($this->id);
            return;
        }

        if ($this->requestMethod === 'POST' && $this->subId === 'submit') {
            $this->submitSelfAppraisal($this->id);
            return;
        }

        if ($this->requestMethod === 'POST' && $this->subId === 'review') {
            $this->submitManagerReview($this->id);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id) {
                    $this->getAppraisal($this->id);
                } else {
                    $this->getAllAppraisals();
                }
                break;
            case 'POST':
                $this->createAppraisal();
                break;
            case 'PUT':
                $this->updateAppraisal($this->id);
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getStats() {
        $query = "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'under-review' THEN 1 ELSE 0 END) as under_review,
            SUM(CASE WHEN status = 'hr-review' THEN 1 ELSE 0 END) as hr_review,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM pm_appraisals pma";
            
        $params = [];
        if ($this->user['role'] === 'employee') {
            $query .= " WHERE pma.employee_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        } elseif ($this->user['role'] === 'pm') {
            $query .= " WHERE pma.reporting_manager_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        }
        
        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Ensure values are integers
        foreach ($stats as $k => $v) {
            $stats[$k] = (int)$v;
        }
        
        Response::json(true, "Stats fetched", $stats, 200);
    }

    private function formatAppraisal($r) {
        if (!$r) return null;
        return [
            'id' => (int)$r['id'],
            'appraisalId' => $r['appraisal_id'],
            'employeeId' => (int)$r['employee_id'],
            'projectId' => $r['project_id'] ? (int)$r['project_id'] : null,
            'projectName' => $r['project_name'] ?? '',
            'reportingManagerId' => $r['reporting_manager_id'] ? (int)$r['reporting_manager_id'] : null,
            'appraisalPeriod' => $r['appraisal_period'] ?? '',
            'status' => $r['status'] ?? 'draft',
            'createdAt' => $r['created_at'],
            'updatedAt' => $r['updated_at'],
            'employee' => [
                'id' => (int)$r['employee_id'],
                'name' => $r['employee_name'] ?? '',
                'department' => $r['employee_department'] ?? ''
            ],
            'manager' => [
                'id' => $r['reporting_manager_id'] ? (int)$r['reporting_manager_id'] : null,
                'name' => $r['manager_name'] ?? ''
            ],
            'selfAppraisal' => [
                'keyAchievements' => $r['self_key_achievements'] ?? '',
                'completedTasks' => $r['self_completed_tasks'] ?? '',
                'technicalImprovement' => $r['self_technical_improvement'] ?? '',
                'teamCollaboration' => $r['self_team_collaboration'] ?? '',
                'problemSolving' => $r['self_problem_solving'] ?? '',
                'trainingsCompleted' => $r['self_trainings_completed'] ?? '',
                'submittedAt' => $r['self_submitted_at'] ?? null,
                'selfRating' => [
                    'technical' => $r['self_rating_technical'] ? (int)$r['self_rating_technical'] : null,
                    'communication' => $r['self_rating_communication'] ? (int)$r['self_rating_communication'] : null,
                    'productivity' => $r['self_rating_productivity'] ? (int)$r['self_rating_productivity'] : null,
                    'teamwork' => $r['self_rating_teamwork'] ? (int)$r['self_rating_teamwork'] : null,
                ]
            ],
            'managerReview' => [
                'reviewedBy' => $r['manager_reviewed_by'] ? (int)$r['manager_reviewed_by'] : null,
                'reviewedByName' => $r['manager_name'] ?? '',
                'categoryLevel' => $r['mgr_category_level'] ? (int)$r['mgr_category_level'] : null,
                'strengths' => $r['mgr_strengths'] ?? '',
                'areasForImprovement' => $r['mgr_areas_for_improvement'] ?? '',
                'trainingRecommendations' => $r['mgr_training_recommendations'] ?? '',
                'promotionRecommended' => (bool)($r['mgr_promotion_recommended'] ?? false),
                'managerComments' => $r['mgr_manager_comments'] ?? '',
                'reviewedAt' => $r['mgr_reviewed_at'],
                'criteriaRatings' => [
                    'workQuality' => $r['mgr_rating_work_quality'] ? (int)$r['mgr_rating_work_quality'] : null,
                    'productivity' => $r['mgr_rating_productivity'] ? (int)$r['mgr_rating_productivity'] : null,
                    'technicalSkills' => $r['mgr_rating_technical_skills'] ? (int)$r['mgr_rating_technical_skills'] : null,
                    'teamCollaboration' => $r['mgr_rating_team_collaboration'] ? (int)$r['mgr_rating_team_collaboration'] : null,
                    'problemSolving' => $r['mgr_rating_problem_solving'] ? (int)$r['mgr_rating_problem_solving'] : null,
                ]
            ],
            'hrReview' => [
                'reviewedBy' => $r['hr_reviewed_by'] ? (int)$r['hr_reviewed_by'] : null,
                'reviewedByName' => $r['hr_name'] ?? '',
                'finalCategoryLevel' => $r['hr_final_category_level'] ? (int)$r['hr_final_category_level'] : null,
                'hrRemarks' => $r['hr_remarks'] ?? '',
                'approvedAt' => $r['hr_approved_at']
            ]
        ];
    }

    private function getAllAppraisals() {
        $query = "SELECT pma.*, u.name as employee_name, u.department as employee_department,
                  pm.name as manager_name, hr.name as hr_name
                  FROM pm_appraisals pma
                  LEFT JOIN users u ON pma.employee_id = u.id
                  LEFT JOIN users pm ON pma.reporting_manager_id = pm.id
                  LEFT JOIN users hr ON pma.hr_reviewed_by = hr.id";
        
        $params = [];
        $whereClauses = [];
        
        if ($this->user['role'] === 'employee') {
            $whereClauses[] = "pma.employee_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        } elseif ($this->user['role'] === 'pm') {
            $whereClauses[] = "pma.reporting_manager_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        }

        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $whereClauses[] = "pma.status = :status";
            $params[':status'] = $_GET['status'];
        }

        if (count($whereClauses) > 0) {
            $query .= " WHERE " . implode(" AND ", $whereClauses);
        }

        $query .= " ORDER BY pma.created_at DESC";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedRecords = [];
        foreach ($records as $r) {
            $formattedRecords[] = $this->formatAppraisal($r);
        }

        // Return both top-level and nested key formats to satisfy all frontend variations
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            "status" => true,
            "message" => "PM Appraisals fetched",
            "appraisals" => $formattedRecords,
            "data" => [
                "appraisals" => $formattedRecords
            ]
        ]);
        exit();
    }

    private function getAppraisal($id) {
        $query = "SELECT pma.*, u.name as employee_name, u.department as employee_department,
                  pm.name as manager_name, hr.name as hr_name
                  FROM pm_appraisals pma
                  LEFT JOIN users u ON pma.employee_id = u.id
                  LEFT JOIN users pm ON pma.reporting_manager_id = pm.id
                  LEFT JOIN users hr ON pma.hr_reviewed_by = hr.id
                  WHERE pma.id = :id OR pma.appraisal_id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($record) {
             $formatted = $this->formatAppraisal($record);
             http_response_code(200);
             header('Content-Type: application/json; charset=utf-8');
             echo json_encode([
                 "status" => true,
                 "message" => "Appraisal fetched",
                 "appraisal" => $formatted,
                 "data" => array_merge($formatted, ["appraisal" => $formatted])
             ]);
             exit();
        } else {
             Response::json(false, "Not found", null, 404);
        }
    }

    private function createAppraisal() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Fetch manager_id for this employee
        $stmtUser = $this->db->prepare("SELECT manager_id FROM users WHERE id = :eid LIMIT 1");
        $stmtUser->bindParam(':eid', $this->user['id']);
        $stmtUser->execute();
        $userRow = $stmtUser->fetch(PDO::FETCH_ASSOC);
        $managerId = $userRow ? $userRow['manager_id'] : null;

        $query = "INSERT INTO pm_appraisals (employee_id, appraisal_id, status, reporting_manager_id) VALUES (:eid, :aid, 'draft', :mgr_id)";
        $stmt = $this->db->prepare($query);
        $aid = 'PMA-' . time();
        $stmt->bindParam(':eid', $this->user['id']);
        $stmt->bindParam(':aid', $aid);
        $stmt->bindParam(':mgr_id', $managerId);
        
        if ($stmt->execute()) {
            $insertId = $this->db->lastInsertId();
            // Fetch newly created record
            $query = "SELECT pma.*, u.name as employee_name, u.department as employee_department,
                      pm.name as manager_name, hr.name as hr_name
                      FROM pm_appraisals pma
                      LEFT JOIN users u ON pma.employee_id = u.id
                      LEFT JOIN users pm ON pma.reporting_manager_id = pm.id
                      LEFT JOIN users hr ON pma.hr_reviewed_by = hr.id
                      WHERE pma.id = :id LIMIT 1";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $insertId);
            $stmt->execute();
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            $formatted = $this->formatAppraisal($record);
            
            http_response_code(201);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                "status" => true,
                "message" => "Draft created",
                "appraisal" => $formatted,
                "data" => array_merge($formatted, ["appraisal" => $formatted])
            ]);
            exit();
        } else {
            Response::json(false, "Failed to create draft", null, 500);
        }
    }

    private function updateAppraisal($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $projectName = $data['projectName'] ?? '';
        $appraisalPeriod = $data['appraisalPeriod'] ?? '';
        $selfApp = $data['selfAppraisal'] ?? [];
        
        $keyAchievements = $selfApp['keyAchievements'] ?? '';
        $completedTasks = $selfApp['completedTasks'] ?? '';
        $technicalImprovement = $selfApp['technicalImprovement'] ?? '';
        $teamCollaboration = $selfApp['teamCollaboration'] ?? '';
        $problemSolving = $selfApp['problemSolving'] ?? '';
        $trainingsCompleted = $selfApp['trainingsCompleted'] ?? '';
        
        $selfRating = $selfApp['selfRating'] ?? [];
        $technical = $selfRating['technical'] ?? null;
        $communication = $selfRating['communication'] ?? null;
        $productivity = $selfRating['productivity'] ?? null;
        $teamwork = $selfRating['teamwork'] ?? null;
        
        $query = "UPDATE pm_appraisals SET 
            project_name = :project_name,
            appraisal_period = :appraisal_period,
            self_key_achievements = :key_ach,
            self_completed_tasks = :comp,
            self_technical_improvement = :tech_imp,
            self_team_collaboration = :team_col,
            self_problem_solving = :prob_solv,
            self_trainings_completed = :train,
            self_rating_technical = :rating_tech,
            self_rating_communication = :rating_comm,
            self_rating_productivity = :rating_prod,
            self_rating_teamwork = :rating_team
            WHERE id = :id";
            
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':project_name', $projectName);
        $stmt->bindParam(':appraisal_period', $appraisalPeriod);
        $stmt->bindParam(':key_ach', $keyAchievements);
        $stmt->bindParam(':comp', $completedTasks);
        $stmt->bindParam(':tech_imp', $technicalImprovement);
        $stmt->bindParam(':team_col', $teamCollaboration);
        $stmt->bindParam(':prob_solv', $problemSolving);
        $stmt->bindParam(':train', $trainingsCompleted);
        $stmt->bindParam(':rating_tech', $technical);
        $stmt->bindParam(':rating_comm', $communication);
        $stmt->bindParam(':rating_prod', $productivity);
        $stmt->bindParam(':rating_team', $teamwork);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
            $this->getAppraisal($id);
        } else {
            Response::json(false, "Failed to update appraisal", null, 500);
        }
    }

    private function submitSelfAppraisal($id) {
        $query = "UPDATE pm_appraisals SET status = 'submitted', self_submitted_at = :now WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $now = date('Y-m-d H:i:s');
        $stmt->bindParam(':now', $now);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
             // Fetch reporting manager and employee name to send a notification
             $appStmt = $this->db->prepare("SELECT pma.reporting_manager_id, u.name as employee_name FROM pm_appraisals pma
                                            LEFT JOIN users u ON pma.employee_id = u.id
                                            WHERE pma.id = :id OR pma.appraisal_id = :id LIMIT 1");
             $appStmt->execute([':id' => $id]);
             $appraisal = $appStmt->fetch(PDO::FETCH_ASSOC);
             
             if ($appraisal && $appraisal['reporting_manager_id']) {
                 $this->sendNotification(
                     $appraisal['reporting_manager_id'],
                     "Self-Appraisal Submitted",
                     $appraisal['employee_name'] . " has submitted their performance self-appraisal. Please review.",
                     "general",
                     $id,
                     "pm_appraisals"
                 );
             }
             $this->getAppraisal($id);
        } else {
             Response::json(false, "Failed to submit", null, 500);
        }
    }

    private function submitManagerReview($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $review = $data['managerReview'] ?? [];
        $ratings = $review['criteriaRatings'] ?? [];
        
        $workQuality = $ratings['workQuality'] ?? null;
        $productivity = $ratings['productivity'] ?? null;
        $technicalSkills = $ratings['technicalSkills'] ?? null;
        $teamCollaboration = $ratings['teamCollaboration'] ?? null;
        $problemSolving = $ratings['problemSolving'] ?? null;
        
        $categoryLevel = $review['categoryLevel'] ?? null;
        $strengths = $review['strengths'] ?? '';
        $areasForImprovement = $review['areasForImprovement'] ?? '';
        $trainingRecommendations = $review['trainingRecommendations'] ?? '';
        $promotionRecommended = isset($review['promotionRecommended']) ? (int)$review['promotionRecommended'] : 0;
        $managerComments = $review['managerComments'] ?? '';
        $now = date('Y-m-d H:i:s');
        
        $query = "UPDATE pm_appraisals SET 
            status = 'hr-review',
            manager_reviewed_by = :mgr_by,
            mgr_rating_work_quality = :wq,
            mgr_rating_productivity = :prod,
            mgr_rating_technical_skills = :tech,
            mgr_rating_team_collaboration = :team,
            mgr_rating_problem_solving = :prob,
            mgr_category_level = :level,
            mgr_strengths = :strengths,
            mgr_areas_for_improvement = :improvement,
            mgr_training_recommendations = :training,
            mgr_promotion_recommended = :promo,
            mgr_manager_comments = :comments,
            mgr_reviewed_at = :reviewed_at
            WHERE id = :id";
            
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':mgr_by', $this->user['id']);
        $stmt->bindParam(':wq', $workQuality);
        $stmt->bindParam(':prod', $productivity);
        $stmt->bindParam(':tech', $technicalSkills);
        $stmt->bindParam(':team', $teamCollaboration);
        $stmt->bindParam(':prob', $problemSolving);
        $stmt->bindParam(':level', $categoryLevel);
        $stmt->bindParam(':strengths', $strengths);
        $stmt->bindParam(':improvement', $areasForImprovement);
        $stmt->bindParam(':training', $trainingRecommendations);
        $stmt->bindParam(':promo', $promotionRecommended);
        $stmt->bindParam(':comments', $managerComments);
        $stmt->bindParam(':reviewed_at', $now);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
             // Fetch employee name, reporting manager name, and notify HR/Admin
             $appStmt = $this->db->prepare("SELECT pma.employee_id, u.name as employee_name, pm.name as manager_name FROM pm_appraisals pma
                                            LEFT JOIN users u ON pma.employee_id = u.id
                                            LEFT JOIN users pm ON pma.reporting_manager_id = pm.id
                                            WHERE pma.id = :id OR pma.appraisal_id = :id LIMIT 1");
             $appStmt->execute([':id' => $id]);
             $appraisal = $appStmt->fetch(PDO::FETCH_ASSOC);
             
             if ($appraisal) {
                 // Get active admins and hrs
                 $recipStmt = $this->db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
                 $recipients = $recipStmt->fetchAll(PDO::FETCH_COLUMN);
                 
                 foreach ($recipients as $recipId) {
                     $this->sendNotification(
                         $recipId,
                         "PM Appraisal Manager Review Submitted",
                         $appraisal['employee_name'] . "'s appraisal has been reviewed by manager " . $appraisal['manager_name'] . " and is pending HR final approval.",
                         "general",
                         $id,
                         "pm_appraisals"
                     );
                 }
             }
             $this->getAppraisal($id);
        } else {
             Response::json(false, "Failed to submit manager review", null, 500);
        }
    }

    private function approveAppraisal($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $finalLevel = $data['finalCategoryLevel'] ?? null;
        $hrRemarks = $data['hrRemarks'] ?? '';
        
        $query = "UPDATE pm_appraisals SET 
            status = 'approved',
            hr_final_category_level = :final_level,
            hr_remarks = :remarks,
            hr_reviewed_by = :hr_by,
            hr_approved_at = :now
            WHERE id = :id";
            
        $stmt = $this->db->prepare($query);
        $now = date('Y-m-d H:i:s');
        $stmt->bindParam(':final_level', $finalLevel);
        $stmt->bindParam(':remarks', $hrRemarks);
        $stmt->bindParam(':hr_by', $this->user['id']);
        $stmt->bindParam(':now', $now);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
             // Fetch HR reviewer's name from users table
             $hrStmt = $this->db->prepare("SELECT name FROM users WHERE id = :hr_id LIMIT 1");
             $hrStmt->execute([':hr_id' => $this->user['id']]);
             $hrUser = $hrStmt->fetch(PDO::FETCH_ASSOC);
             $hrName = $hrUser ? $hrUser['name'] : 'HR';

             // Fetch employee_id to send a notification
             $appStmt = $this->db->prepare("SELECT employee_id FROM pm_appraisals WHERE id = :id OR appraisal_id = :id LIMIT 1");
             $appStmt->execute([':id' => $id]);
             $appraisal = $appStmt->fetch(PDO::FETCH_ASSOC);
             
             if ($appraisal) {
                 $this->sendNotification(
                     $appraisal['employee_id'],
                     "PM Appraisal Approved",
                     "Your performance appraisal has been approved by HR " . $hrName . ".",
                     "general",
                     $id,
                     "pm_appraisals"
                 );
             }
             $this->getAppraisal($id);
        } else {
             Response::json(false, "Failed to approve appraisal", null, 500);
        }
    }

    private function rejectAppraisal($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $reason = $data['reason'] ?? 'Rejected';
        
        $query = "UPDATE pm_appraisals SET 
            status = 'rejected',
            hr_remarks = :reason,
            hr_reviewed_by = :hr_by,
            hr_approved_at = :now
            WHERE id = :id";
            
        $stmt = $this->db->prepare($query);
        $now = date('Y-m-d H:i:s');
        $stmt->bindParam(':reason', $reason);
        $stmt->bindParam(':hr_by', $this->user['id']);
        $stmt->bindParam(':now', $now);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
             // Fetch HR reviewer's name from users table
             $hrStmt = $this->db->prepare("SELECT name FROM users WHERE id = :hr_id LIMIT 1");
             $hrStmt->execute([':hr_id' => $this->user['id']]);
             $hrUser = $hrStmt->fetch(PDO::FETCH_ASSOC);
             $hrName = $hrUser ? $hrUser['name'] : 'HR';

             // Fetch employee_id to send a notification
             $appStmt = $this->db->prepare("SELECT employee_id FROM pm_appraisals WHERE id = :id OR appraisal_id = :id LIMIT 1");
             $appStmt->execute([':id' => $id]);
             $appraisal = $appStmt->fetch(PDO::FETCH_ASSOC);
             
             if ($appraisal) {
                 $this->sendNotification(
                     $appraisal['employee_id'],
                     "PM Appraisal Rejected",
                     "Your performance appraisal has been rejected by HR " . $hrName . ". Reason: " . $reason,
                     "general",
                     $id,
                     "pm_appraisals"
                 );
             }
             $this->getAppraisal($id);
        } else {
             Response::json(false, "Failed to reject appraisal", null, 500);
        }
    }

    /**
     * Helper: insert a notification row
     */
    private function sendNotification($recipientId, $title, $message, $type, $relatedId, $relatedModel) {
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                 VALUES (:recipient_id, :title, :message, :type, :related_id, :related_model, 0, NOW(), NOW())"
            );
            $stmt->execute([
                ':recipient_id'  => $recipientId,
                ':title'         => $title,
                ':message'       => $message,
                ':type'          => $type,
                ':related_id'    => $relatedId,
                ':related_model' => $relatedModel,
            ]);
        } catch (Exception $e) {
            // Silent fail — don't break main flow
        }
    }
}

