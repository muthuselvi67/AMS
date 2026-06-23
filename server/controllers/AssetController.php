<?php

class AssetController {
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

        // Only HR and Admin can access Assets API
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id) {
                    $this->getAsset($this->id);
                } else {
                    $this->getAllAssets();
                }
                break;
            case 'POST':
                $this->createAsset();
                break;
            case 'PUT':
                if ($this->id) {
                    $this->updateAsset($this->id);
                } else {
                    Response::json(false, "Missing ID", null, 400);
                }
                break;
            case 'DELETE':
                if ($this->id) {
                    $this->deleteAsset($this->id);
                } else {
                    Response::json(false, "Missing ID", null, 400);
                }
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getAllAssets() {
        $status = $_GET['status'] ?? null;
        $type = $_GET['type'] ?? null;

        $query = "
            SELECT a.*, u.name as assigned_to_name, u.email as assigned_to_email,
                   cb.name as created_by_name
            FROM assets a
            LEFT JOIN users u ON a.assigned_to = u.id
            LEFT JOIN users cb ON a.created_by = cb.id
            WHERE 1=1
        ";

        $params = [];
        if ($status) {
            $query .= " AND a.status = :status";
            $params['status'] = $status;
        }
        if ($type) {
            $query .= " AND a.type = :type";
            $params['type'] = $type;
        }

        $query .= " ORDER BY a.created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $assets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($assets as &$a) {
            // camelCase mapping for frontend
            $a['serialNumber'] = $a['serial_number'];
            $a['purchaseValue'] = (float)$a['purchase_value'];
            $a['assignedTo'] = $a['assigned_to'] ? [
                'id' => $a['assigned_to'],
                'name' => $a['assigned_to_name'],
                'email' => $a['assigned_to_email']
            ] : null;
        }

        Response::json(true, "Assets fetched", ['assets' => $assets], 200);
    }

    private function getAsset($id) {
        $query = "
            SELECT a.*, u.name as assigned_to_name, u.email as assigned_to_email
            FROM assets a
            LEFT JOIN users u ON a.assigned_to = u.id
            WHERE a.id = :id
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);
        $asset = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$asset) {
            Response::json(false, "Asset not found", null, 404);
            return;
        }

        $asset['serialNumber'] = $asset['serial_number'];
        $asset['purchaseValue'] = (float)$asset['purchase_value'];
        $asset['assignedTo'] = $asset['assigned_to'] ? [
            'id' => $asset['assigned_to'],
            'name' => $asset['assigned_to_name']
        ] : null;

        Response::json(true, "Asset fetched", ['asset' => $asset], 200);
    }

    private function createAsset() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            Response::json(false, "Asset name is required", null, 400);
            return;
        }

        $query = "
            INSERT INTO assets (name, type, serial_number, brand, model, purchase_value, status, assigned_to, assigned_date, notes, created_by)
            VALUES (:name, :type, :serial_number, :brand, :model, :purchase_value, :status, :assigned_to, :assigned_date, :notes, :created_by)
        ";

        $assignedTo = !empty($input['assignedTo']) ? $input['assignedTo'] : null;
        $assignedDate = $assignedTo ? date('Y-m-d') : null;

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'name' => $input['name'],
            'type' => $input['type'] ?? 'other',
            'serial_number' => $input['serialNumber'] ?? '',
            'brand' => $input['brand'] ?? '',
            'model' => $input['model'] ?? '',
            'purchase_value' => $input['purchaseValue'] ?? 0,
            'status' => $input['status'] ?? 'available',
            'assigned_to' => $assignedTo,
            'assigned_date' => $assignedDate,
            'notes' => $input['notes'] ?? '',
            'created_by' => $this->user['id']
        ]);

        Response::json(true, "Asset created", ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateAsset($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            Response::json(false, "Asset name is required", null, 400);
            return;
        }

        $assignedTo = !empty($input['assignedTo']) ? $input['assignedTo'] : null;
        $assignedDate = null;
        
        // If assigned status selected and has assignedTo, update assigned_date if it wasn't assigned before
        if ($assignedTo) {
            $stmt = $this->db->prepare("SELECT assigned_to, assigned_date FROM assets WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $curr = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($curr && $curr['assigned_to'] == $assignedTo) {
                $assignedDate = $curr['assigned_date'];
            } else {
                $assignedDate = date('Y-m-d');
            }
        }

        $query = "
            UPDATE assets
            SET name = :name, type = :type, serial_number = :serial_number, brand = :brand, model = :model,
                purchase_value = :purchase_value, status = :status, assigned_to = :assigned_to,
                assigned_date = :assigned_date, notes = :notes
            WHERE id = :id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'id' => $id,
            'name' => $input['name'],
            'type' => $input['type'] ?? 'other',
            'serial_number' => $input['serialNumber'] ?? '',
            'brand' => $input['brand'] ?? '',
            'model' => $input['model'] ?? '',
            'purchase_value' => $input['purchaseValue'] ?? 0,
            'status' => $input['status'] ?? 'available',
            'assigned_to' => $assignedTo,
            'assigned_date' => $assignedDate,
            'notes' => $input['notes'] ?? ''
        ]);

        Response::json(true, "Asset updated");
    }

    private function deleteAsset($id) {
        $query = "DELETE FROM assets WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $id]);

        Response::json(true, "Asset deleted");
    }
}
?>
