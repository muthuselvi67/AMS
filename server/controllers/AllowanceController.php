<?php

class AllowanceController {
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

    public function processRequest($resource) {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
            return;
        }

        if ($resource === 'allowance-categories') {
            switch ($this->requestMethod) {
                case 'GET':
                    $this->getCategories();
                    break;
                case 'POST':
                    $this->createCategory();
                    break;
                case 'PUT':
                    $this->updateCategory();
                    break;
                case 'DELETE':
                    $this->deleteCategory();
                    break;
                default:
                    Response::json(false, "Method not allowed", null, 405);
                    break;
            }
        } elseif ($resource === 'allowances') {
            switch ($this->requestMethod) {
                case 'GET':
                    if ($this->id === 'stats' && $this->subId === 'summary') {
                        $this->getStatsSummary();
                    } else {
                        $this->getAllAllowances();
                    }
                    break;
                case 'POST':
                    $this->applyAllowance();
                    break;
                case 'PUT':
                    if ($this->id && $this->subId === 'cancel') {
                        $this->cancelAllowance($this->id);
                    } elseif ($this->id && $this->subId === 'review') {
                        $this->reviewAllowance($this->id);
                    } else {
                        Response::json(false, "Action not found", null, 404);
                    }
                    break;
                default:
                    Response::json(false, "Method not allowed", null, 405);
                    break;
            }
        }
    }

    private function getCategories() {
        $query = "SELECT id, name, description, max_amount as maxAmount, requires_document as requiresDocument, is_active FROM allowance_categories WHERE is_active = 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute();

        $categories = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['maxAmount'] = (float)$row['maxAmount'];
            $row['requiresDocument'] = (bool)$row['requiresDocument'];
            $row['is_active'] = (bool)$row['is_active'];
            $categories[] = $row;
        }

        // For employees: override maxAmount with their personal salary allowances set by admin
        if ($this->user && $this->user['role'] === 'employee') {
            $salaryStmt = $this->db->prepare(
                "SELECT salary_hra, salary_transport, salary_other FROM users WHERE id = :id LIMIT 1"
            );
            $salaryStmt->execute([':id' => $this->user['id']]);
            $salary = $salaryStmt->fetch(PDO::FETCH_ASSOC);

            if ($salary) {
                foreach ($categories as &$cat) {
                    $nameLower = strtolower($cat['name']);

                    // Map category name keywords to personal salary fields
                    if (strpos($nameLower, 'hra') !== false || strpos($nameLower, 'house rent') !== false) {
                        $personalMax = (float)$salary['salary_hra'];
                        if ($personalMax > 0) $cat['maxAmount'] = $personalMax;

                    } elseif (strpos($nameLower, 'transport') !== false ||
                              strpos($nameLower, 'travel') !== false ||
                              strpos($nameLower, 'conveyance') !== false) {
                        $personalMax = (float)$salary['salary_transport'];
                        if ($personalMax > 0) $cat['maxAmount'] = $personalMax;

                    } elseif (strpos($nameLower, 'food') !== false ||
                              strpos($nameLower, 'meal') !== false ||
                              strpos($nameLower, 'canteen') !== false) {
                        $personalMax = (float)$salary['salary_other'];
                        if ($personalMax > 0) $cat['maxAmount'] = $personalMax;
                    }
                }
                unset($cat);
            }
        }

        Response::json(true, "Categories retrieved", ['categories' => $categories], 200);
    }

    private function applyAllowance() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $categoryId = $data['category'] ?? null;
        $amount = $data['amount'] ?? null;
        $date = $data['date'] ?? null;
        $purpose = $data['purpose'] ?? null;
        $attachments = isset($data['attachments']) ? json_encode($data['attachments']) : json_encode([]);

        if (!$categoryId || !$amount || !$date || !$purpose) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }
        
        $dateFormatted = date('Y-m-d', strtotime($date));

        $query = "INSERT INTO allowance_requests (employee_id, category_id, amount, date, purpose, attachments, status) 
                  VALUES (:employee_id, :category_id, :amount, :date, :purpose, :attachments, 'pending_manager')";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':employee_id', $this->user['id']);
        $stmt->bindParam(':category_id', $categoryId);
        $stmt->bindParam(':amount', $amount);
        $stmt->bindParam(':date', $dateFormatted);
        $stmt->bindParam(':purpose', $purpose);
        $stmt->bindParam(':attachments', $attachments);

        if ($stmt->execute()) {
            $newId = $this->db->lastInsertId();

            // Notify all admin + HR users
            try {
                $catStmt = $this->db->prepare("SELECT name FROM allowance_categories WHERE id = :id LIMIT 1");
                $catStmt->execute([':id' => $categoryId]);
                $catRow = $catStmt->fetch(PDO::FETCH_ASSOC);
                $catName = $catRow['name'] ?? 'Allowance';

                $empName = $this->user['name'] ?? 'An employee';
                $formattedAmt = '₹' . number_format((float)$amount, 0);

                $recipStmt = $this->db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
                $recipients = $recipStmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($recipients as $recipId) {
                    $this->sendNotification(
                        $recipId,
                        "New Allowance Request",
                        "{$empName} has submitted a {$catName} request for {$formattedAmt}. Please review.",
                        "allowance",
                        $newId,
                        "allowance_request"
                    );
                }
            } catch (Exception $e) {
                // Silent fail — don't block allowance creation
            }

            Response::json(true, "Allowance request submitted successfully", null, 201);
        } else {
            Response::json(false, "Failed to submit allowance request", null, 500);
        }
    }

    private function getStatsSummary() {
        $where = "";
        $params = [];
        if ($this->user['role'] === 'employee') {
            $where = "WHERE employee_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        }

        $query = "SELECT 
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status IN ('pending_manager','pending_hr') THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS totalAmount,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
        FROM allowance_requests $where";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $stats['total'] = (int)$stats['total'];
        $stats['pending'] = (int)$stats['pending'];
        $stats['totalAmount'] = (float)$stats['totalAmount'];
        $stats['rejected'] = (int)$stats['rejected'];

        Response::json(true, "Stats fetched", ['stats' => $stats], 200);
    }

    private function getAllAllowances() {
        $status = $_GET['status'] ?? null;
        $params = [];

        $query = "SELECT ar.*, ac.name as category_name, ac.description as category_description,
                         u.name as employee_name, u.email as employee_email
                  FROM allowance_requests ar
                  JOIN allowance_categories ac ON ar.category_id = ac.id
                  JOIN users u ON ar.employee_id = u.id";
        
        $conditions = [];
        if ($this->user['role'] === 'employee') {
            $conditions[] = "ar.employee_id = :user_id";
            $params[':user_id'] = $this->user['id'];
        }
        
        if ($status && $status !== 'all') {
            if (strpos($status, ',') !== false) {
                $statusArray = explode(',', $status);
                $placeholders = [];
                foreach ($statusArray as $i => $s) {
                    $key = ":status_" . $i;
                    $placeholders[] = $key;
                    $params[$key] = $s;
                }
                $conditions[] = "ar.status IN (" . implode(', ', $placeholders) . ")";
            } else {
                $conditions[] = "ar.status = :status";
                $params[':status'] = $status;
            }
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Sort in PHP to bypass MySQL "Out of sort memory" buffer limit
        usort($records, function($a, $b) {
            $cmp = strcmp($a['employee_name'], $b['employee_name']);
            if ($cmp !== 0) return $cmp;
            return strcmp($b['created_at'], $a['created_at']);
        });

        foreach ($records as &$r) {
            $r['employee'] = [
                'id' => $r['employee_id'],
                'name' => $r['employee_name'],
                'email' => $r['employee_email']
            ];
            $r['category'] = [
                'id' => $r['category_id'],
                'name' => $r['category_name'],
                'description' => $r['category_description']
            ];
            $r['amount'] = (float)$r['amount'];
            if ($r['attachments']) {
                $r['attachments'] = json_decode($r['attachments'], true);
            } else {
                $r['attachments'] = [];
            }
        }

        Response::json(true, "Allowances fetched successfully", ['allowances' => $records], 200);
    }

    private function cancelAllowance($id) {
        $query = "SELECT * FROM allowance_requests WHERE id = :id AND employee_id = :employee_id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id, 'employee_id' => $this->user['id']]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) {
            Response::json(false, "Allowance request not found or unauthorized", null, 404);
            return;
        }

        if (!in_array($request['status'], ['pending_manager', 'pending_hr'])) {
            Response::json(false, "Cannot cancel request in status: " . $request['status'], null, 400);
            return;
        }

        $updateQuery = "UPDATE allowance_requests SET status = 'cancelled' WHERE id = :id";
        $updateStmt = $this->db->prepare($updateQuery);
        if ($updateStmt->execute(['id' => $id])) {
            Response::json(true, "Allowance request cancelled successfully", null, 200);
        } else {
            Response::json(false, "Failed to cancel request", null, 500);
        }
    }

    private function reviewAllowance($id) {
        if (in_array($this->user['role'], ['employee'])) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? null;
        $remark = $data['remark'] ?? '';

        if (!$status) {
            Response::json(false, "Status is required", null, 400);
            return;
        }

        $query = "SELECT * FROM allowance_requests WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) {
            Response::json(false, "Allowance request not found", null, 404);
            return;
        }

        $remarkCol = ($this->user['role'] === 'hr' || $this->user['role'] === 'admin') ? 'hr_remark' : 'manager_remark';
        $reviewerCol = ($this->user['role'] === 'hr' || $this->user['role'] === 'admin') ? 'hr_reviewed_by' : 'manager_reviewed_by';

        $newStatus = $status;
        if ($status === 'approved') {
            if ($this->user['role'] === 'pm') {
                $newStatus = 'pending_hr';
            } else {
                $newStatus = 'approved';
            }
        }

        $updateQuery = "UPDATE allowance_requests 
                        SET status = :status, $remarkCol = :remark, $reviewerCol = :reviewer_id, reviewed_at = NOW() 
                        WHERE id = :id";
        
        $updateStmt = $this->db->prepare($updateQuery);
        $updateStmt->bindParam(':status', $newStatus);
        $updateStmt->bindParam(':remark', $remark);
        $updateStmt->bindParam(':reviewer_id', $this->user['id']);
        $updateStmt->bindParam(':id', $id);

        if ($updateStmt->execute()) {
            // Notify the employee about the outcome
            $employeeId = $request['employee_id'];
            $reviewerName = $this->user['name'] ?? 'HR';

            // Get category name
            $catStmt2 = $this->db->prepare("SELECT ac.name FROM allowance_categories ac JOIN allowance_requests ar ON ar.category_id = ac.id WHERE ar.id = :id LIMIT 1");
            $catStmt2->execute([':id' => $id]);
            $catRow2 = $catStmt2->fetch(PDO::FETCH_ASSOC);
            $catName2 = $catRow2['name'] ?? 'Allowance';

            if ($newStatus === 'approved') {
                $notifTitle = "Allowance Approved ✓";
                $notifMsg = "Your {$catName2} request has been approved by {$reviewerName}." . ($remark ? " Remark: {$remark}" : '');
            } elseif ($newStatus === 'pending_hr') {
                $notifTitle = "Allowance Forwarded to HR";
                $notifMsg = "Your {$catName2} request has been reviewed by your manager and forwarded to HR for final approval.";
            } elseif ($newStatus === 'rejected') {
                $notifTitle = "Allowance Rejected";
                $notifMsg = "Your {$catName2} request has been rejected by {$reviewerName}." . ($remark ? " Reason: {$remark}" : '');
            } else {
                $notifTitle = "Allowance Update";
                $notifMsg = "Your {$catName2} request status has been updated to: {$newStatus}.";
            }

            $this->sendNotification($employeeId, $notifTitle, $notifMsg, "allowance", $id, "allowance_request");

            Response::json(true, "Allowance request reviewed successfully", null, 200);
        } else {
            Response::json(false, "Failed to review request", null, 500);
        }
    }

    /**
     * Helper: insert a notification row
     */
    private function sendNotification($recipientId, $title, $message, $type, $relatedId, $relatedModel) {
        $stmt = $this->db->prepare(
            "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
             VALUES (:recipient_id, :title, :message, :type, :related_id, :related_model, 0, NOW(), NOW())"
        );
        $stmt->execute([
            ':recipient_id' => $recipientId,
            ':title'        => $title,
            ':message'      => $message,
            ':type'         => $type,
            ':related_id'   => $relatedId,
            ':related_model' => $relatedModel,
        ]);
    }

    private function createCategory() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $name = $data['name'] ?? null;
        $maxAmount = $data['maxAmount'] ?? 0;
        $description = $data['description'] ?? '';
        $requiresDocument = isset($data['requiresDocument']) ? (int)$data['requiresDocument'] : 0;

        if (!$name) {
            Response::json(false, "Category name is required", null, 400);
            return;
        }

        $query = "INSERT INTO allowance_categories (name, description, max_amount, requires_document) 
                  VALUES (:name, :description, :max_amount, :requires_document)";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':max_amount', $maxAmount);
        $stmt->bindParam(':requires_document', $requiresDocument);

        if ($stmt->execute()) {
            Response::json(true, "Category created successfully", null, 201);
        } else {
            Response::json(false, "Failed to create category", null, 500);
        }
    }

    private function updateCategory() {
        if (!$this->id) {
            Response::json(false, "Category ID is required", null, 400);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        $name = $data['name'] ?? null;
        $maxAmount = $data['maxAmount'] ?? null;
        $description = $data['description'] ?? null;
        $requiresDocument = isset($data['requiresDocument']) ? (int)$data['requiresDocument'] : null;

        $fields = [];
        if ($name !== null) $fields[] = "name = :name";
        if ($maxAmount !== null) $fields[] = "max_amount = :max_amount";
        if ($description !== null) $fields[] = "description = :description";
        if ($requiresDocument !== null) $fields[] = "requires_document = :requires_document";

        if (empty($fields)) {
            Response::json(false, "No fields to update", null, 400);
            return;
        }

        $query = "UPDATE allowance_categories SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $this->id);
        
        if ($name !== null) $stmt->bindParam(':name', $name);
        if ($maxAmount !== null) $stmt->bindParam(':max_amount', $maxAmount);
        if ($description !== null) $stmt->bindParam(':description', $description);
        if ($requiresDocument !== null) $stmt->bindParam(':requires_document', $requiresDocument);

        if ($stmt->execute()) {
            Response::json(true, "Category updated successfully");
        } else {
            Response::json(false, "Failed to update category", null, 500);
        }
    }

    private function deleteCategory() {
        if (!$this->id) {
            Response::json(false, "Category ID is required", null, 400);
            return;
        }

        $query = "UPDATE allowance_categories SET is_active = 0 WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $this->id);

        if ($stmt->execute()) {
            Response::json(true, "Category deactivated successfully");
        } else {
            Response::json(false, "Failed to deactivate category", null, 500);
        }
    }
}
?>
