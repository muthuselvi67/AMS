<?php

class DocumentController {
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
                if ($this->id === 'mine') {
                    $this->getMyDocuments();
                } else if ($this->id) {
                    $this->getDocument($this->id);
                } else {
                    $this->getAllDocuments();
                }
                break;
            case 'POST':
                if (in_array($this->user['role'], ['admin', 'hr'])) {
                    $this->createDocument();
                } else {
                    Response::json(false, "Forbidden", null, 403);
                }
                break;
            case 'PUT':
                if (in_array($this->user['role'], ['admin', 'hr']) && $this->id && $this->id !== 'mine') {
                    $this->updateDocument($this->id);
                } else {
                    Response::json(false, "Forbidden or Missing ID", null, 403);
                }
                break;
            case 'DELETE':
                if (in_array($this->user['role'], ['admin', 'hr']) && $this->id && $this->id !== 'mine') {
                    $this->deleteDocument($this->id);
                } else {
                    Response::json(false, "Forbidden or Missing ID", null, 403);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getMyDocuments() {
        $query = "
            SELECT d.*, u.name as created_by_name 
            FROM documents d
            LEFT JOIN users u ON d.created_by = u.id
            WHERE d.employee_id = :employee_id
            ORDER BY d.created_at DESC
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute(['employee_id' => $this->user['id']]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formatted = [];
        foreach ($documents as $doc) {
            $formatted[] = [
                'id' => (int)$doc['id'],
                'title' => $doc['title'],
                'type' => $doc['type'],
                'employee_id' => (int)$doc['employee_id'],
                'content' => $doc['content'],
                'version' => (int)$doc['version'],
                'created_by' => isset($doc['created_by']) ? (int)$doc['created_by'] : null,
                'createdAt' => $doc['created_at'],
                'updatedAt' => $doc['updated_at'],
                'employee' => [
                    'id' => (int)$doc['employee_id']
                ],
                'generatedBy' => [
                    'id' => isset($doc['created_by']) ? (int)$doc['created_by'] : null,
                    'name' => $doc['created_by_name'] ?? ''
                ]
            ];
        }
        
        Response::json(true, "Documents fetched successfully", ['documents' => $formatted], 200);
    }

    private function getAllDocuments() {
        // Only HR and Admin can see all documents
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        $type = isset($_GET['type']) ? $_GET['type'] : null;
        $employeeId = isset($_GET['employee']) ? $_GET['employee'] : null;

        $query = "
            SELECT d.*, e.name as employee_name, e.department as employee_department, u.name as created_by_name 
            FROM documents d
            JOIN users e ON d.employee_id = e.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE 1=1
        ";

        $params = [];
        if ($type) {
            $query .= " AND d.type = :type";
            $params['type'] = $type;
        }
        if ($employeeId) {
            $query .= " AND d.employee_id = :emp_id";
            $params['emp_id'] = $employeeId;
        }

        $query .= " ORDER BY d.created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formatted = [];
        foreach ($documents as $doc) {
            $formatted[] = [
                'id' => (int)$doc['id'],
                'title' => $doc['title'],
                'type' => $doc['type'],
                'employee_id' => (int)$doc['employee_id'],
                'content' => $doc['content'],
                'version' => (int)$doc['version'],
                'created_by' => isset($doc['created_by']) ? (int)$doc['created_by'] : null,
                'createdAt' => $doc['created_at'],
                'updatedAt' => $doc['updated_at'],
                'employee' => [
                    'id' => (int)$doc['employee_id'],
                    'name' => $doc['employee_name'] ?? '',
                    'department' => $doc['employee_department'] ?? ''
                ],
                'generatedBy' => [
                    'id' => isset($doc['created_by']) ? (int)$doc['created_by'] : null,
                    'name' => $doc['created_by_name'] ?? ''
                ]
            ];
        }
        
        Response::json(true, "Documents fetched successfully", ['documents' => $formatted], 200);
    }

    private function getDocument($id) {
        $query = "
            SELECT d.*, e.name as employee_name, e.department as employee_department, u.name as created_by_name 
            FROM documents d
            JOIN users e ON d.employee_id = e.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE d.id = :id
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);
        $doc = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$doc) {
            Response::json(false, "Document not found", null, 404);
            return;
        }

        if (!in_array($this->user['role'], ['admin', 'hr']) && $doc['employee_id'] !== $this->user['id']) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        $formatted = [
            'id' => (int)$doc['id'],
            'title' => $doc['title'],
            'type' => $doc['type'],
            'employee_id' => (int)$doc['employee_id'],
            'content' => $doc['content'],
            'version' => (int)$doc['version'],
            'created_by' => isset($doc['created_by']) ? (int)$doc['created_by'] : null,
            'createdAt' => $doc['created_at'],
            'updatedAt' => $doc['updated_at'],
            'employee' => [
                'id' => (int)$doc['employee_id'],
                'name' => $doc['employee_name'] ?? '',
                'department' => $doc['employee_department'] ?? ''
            ],
            'generatedBy' => [
                'id' => isset($doc['created_by']) ? (int)$doc['created_by'] : null,
                'name' => $doc['created_by_name'] ?? ''
            ]
        ];

        Response::json(true, "Document fetched", ['document' => $formatted], 200);
    }

    private function createDocument() {
        $input = json_decode(file_get_contents('php://input'), true);

        $employeeId = $input['employee_id'] ?? $input['employee'] ?? null;

        if (empty($input['title']) || empty($employeeId) || empty($input['content'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $query = "
            INSERT INTO documents (title, type, employee_id, content, version, created_by)
            VALUES (:title, :type, :employee_id, :content, 1, :created_by)
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'title' => $input['title'],
            'type' => $input['type'] ?? 'other',
            'employee_id' => $employeeId,
            'content' => $input['content'],
            'created_by' => $this->user['id']
        ]);

        Response::json(true, "Document created successfully", ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateDocument($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        $employeeId = $input['employee_id'] ?? $input['employee'] ?? null;

        if (empty($input['title']) || empty($employeeId) || empty($input['content'])) {
            Response::json(false, "Missing required fields", null, 400);
            return;
        }

        $query = "
            UPDATE documents
            SET title = :title, type = :type, employee_id = :employee_id, content = :content, version = version + 1
            WHERE id = :id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'id' => $id,
            'title' => $input['title'],
            'type' => $input['type'] ?? 'other',
            'employee_id' => $employeeId,
            'content' => $input['content']
        ]);

        Response::json(true, "Document updated successfully");
    }

    private function deleteDocument($id) {
        $query = "DELETE FROM documents WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);

        Response::json(true, "Document deleted successfully");
    }
}
?>
