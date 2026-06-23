<?php

class PayrollController {
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

        // Convert user object check to array check (since $this->user is decoded as PHP array)
        $role = $this->user['role'] ?? '';

        if ($resource === 'payroll') {
            if ($this->id === 'my-slips' && $this->requestMethod === 'GET') {
                $this->getMySlips();
                return;
            }

            // Only Admin or HR can manage other payroll actions
            if ($role !== 'admin' && $role !== 'hr') {
                Response::json(false, "Forbidden", null, 403);
                return;
            }

            if ($this->id === 'generate' && $this->requestMethod === 'POST') {
                $this->generatePayroll();
            } elseif ($this->id === 'all' && $this->requestMethod === 'GET') {
                $this->getAllPayrolls();
            } elseif ($this->id && $this->subId === 'status' && $this->requestMethod === 'PATCH') {
                $this->updateStatus();
            } elseif ($this->id && $this->subId === 'amount' && $this->requestMethod === 'PATCH') {
                $this->updateAmount();
            } else {
                Response::json(false, "Not Found", null, 404);
            }
        }
    }

    private function getMySlips() {
        $userId = $this->user['id'];

        $query = "SELECT p.*, u.name, u.employee_id, u.position 
                  FROM payrolls p 
                  JOIN users u ON p.user_id = u.id 
                  WHERE p.user_id = :user_id
                  ORDER BY p.year DESC, p.month DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);
        
        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = [
                'id' => $row['id'],
                'userId' => [
                    'id' => $row['user_id'],
                    'name' => $row['name'],
                    'employeeId' => $row['employee_id'],
                    'position' => $row['position']
                ],
                'month' => (int)$row['month'],
                'year' => (int)$row['year'],
                'baseSalary' => (float)$row['base_salary'],
                'allowances' => [
                    'hra' => (float)$row['allowance_hra'],
                    'transport' => (float)$row['allowance_transport'],
                    'other' => (float)$row['allowance_other']
                ],
                'deductions' => [
                    'pf' => (float)$row['deduction_pf'],
                    'tax' => (float)$row['deduction_tax'],
                    'lop' => (float)$row['deduction_lop']
                ],
                'netSalary' => (float)$row['net_salary'],
                'status' => $row['status'],
                'paidAt' => $row['paid_at']
            ];
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($results);
        exit();
    }

    private function generatePayroll() {
        $data = json_decode(file_get_contents("php://input"), true);
        $month = $data['month'] ?? date('n');
        $year = $data['year'] ?? date('Y');

        // Fetch all active employees
        $query = "SELECT id, name, salary_base, salary_hra, salary_transport, salary_other, salary_pf, salary_tax FROM users WHERE is_active = 1 AND role != 'admin'";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $count = 0;
        foreach ($employees as $emp) {
            // Check if payroll already exists for this month/year
            $checkQuery = "SELECT id FROM payrolls WHERE user_id = :user_id AND month = :month AND year = :year";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute(['user_id' => $emp['id'], 'month' => $month, 'year' => $year]);

            if ($checkStmt->rowCount() === 0) {
                // Calculate net salary
                $base = (float)$emp['salary_base'];
                $hra = (float)$emp['salary_hra'];
                $transport = (float)$emp['salary_transport'];
                $other = (float)$emp['salary_other'];
                $pf = (float)$emp['salary_pf'];
                $tax = (float)$emp['salary_tax'];
                
                $net = $base + $hra + $transport + $other - $pf - $tax;

                $insertQuery = "INSERT INTO payrolls (user_id, month, year, base_salary, allowance_hra, allowance_transport, allowance_other, deduction_pf, deduction_tax, net_salary, status) 
                                VALUES (:user_id, :month, :year, :base, :hra, :transport, :other, :pf, :tax, :net, 'Draft')";
                
                $insertStmt = $this->db->prepare($insertQuery);
                $insertStmt->execute([
                    'user_id' => $emp['id'],
                    'month' => $month,
                    'year' => $year,
                    'base' => $base,
                    'hra' => $hra,
                    'transport' => $transport,
                    'other' => $other,
                    'pf' => $pf,
                    'tax' => $tax,
                    'net' => $net
                ]);
                $count++;
            }
        }

        Response::json(true, "Successfully generated payroll for $count employees");
    }

    private function getAllPayrolls() {
        $month = $_GET['month'] ?? date('n');
        $year = $_GET['year'] ?? date('Y');

        $query = "SELECT p.*, u.name, u.employee_id, u.position 
                  FROM payrolls p 
                  JOIN users u ON p.user_id = u.id 
                  WHERE p.month = :month AND p.year = :year";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute(['month' => $month, 'year' => $year]);
        
        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = [
                'id' => $row['id'],
                'userId' => [
                    'id' => $row['user_id'],
                    'name' => $row['name'],
                    'employeeId' => $row['employee_id'],
                    'position' => $row['position']
                ],
                'month' => (int)$row['month'],
                'year' => (int)$row['year'],
                'baseSalary' => (float)$row['base_salary'],
                'allowances' => [
                    'hra' => (float)$row['allowance_hra'],
                    'transport' => (float)$row['allowance_transport'],
                    'other' => (float)$row['allowance_other']
                ],
                'deductions' => [
                    'pf' => (float)$row['deduction_pf'],
                    'tax' => (float)$row['deduction_tax'],
                    'lop' => (float)$row['deduction_lop']
                ],
                'netSalary' => (float)$row['net_salary'],
                'status' => $row['status'],
                'paidAt' => $row['paid_at']
            ];
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($results);
        exit();
    }

    private function updateStatus() {
        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? 'Draft';
        $paidAt = ($status === 'Paid') ? date('Y-m-d H:i:s') : null;

        $query = "UPDATE payrolls SET status = :status, paid_at = :paid_at WHERE id = :id";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute(['status' => $status, 'paid_at' => $paidAt, 'id' => $this->id])) {
            Response::json(true, "Status updated to $status");
        } else {
            Response::json(false, "Update failed", null, 500);
        }
    }

    private function updateAmount() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $base = $data['baseSalary'] ?? null;
        $allowances = $data['allowances'] ?? [];
        $deductions = $data['deductions'] ?? [];
        $net = $data['netSalary'] ?? null;

        $query = "UPDATE payrolls SET 
                  base_salary = :base,
                  allowance_hra = :hra,
                  allowance_transport = :transport,
                  allowance_other = :other,
                  deduction_pf = :pf,
                  deduction_tax = :tax,
                  deduction_lop = :lop,
                  net_salary = :net 
                  WHERE id = :id";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'base' => $base,
            'hra' => $allowances['hra'] ?? 0,
            'transport' => $allowances['transport'] ?? 0,
            'other' => $allowances['other'] ?? 0,
            'pf' => $deductions['pf'] ?? 0,
            'tax' => $deductions['tax'] ?? 0,
            'lop' => $deductions['lop'] ?? 0,
            'net' => $net,
            'id' => $this->id
        ]);

        Response::json(true, "Payroll amounts updated");
    }
}
?>
