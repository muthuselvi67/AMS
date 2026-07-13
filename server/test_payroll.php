<?php 
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'config/database.php'; 
$db = (new Database())->getConnection(); 
try { 
    // Test the exact query from getAllPayrolls
    $month = 7;
    $year = 2026;
    $query = "SELECT p.*, u.name, u.employee_id, u.position 
              FROM payrolls p 
              JOIN users u ON p.user_id = u.id 
              WHERE p.month = :month AND p.year = :year";
    
    $stmt = $db->prepare($query);
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
    
    echo "OK: " . count($results) . " records\n";
    $json = json_encode($results);
    if ($json === false) {
        echo "JSON encode error: " . json_last_error_msg() . "\n";
    } else {
        echo "JSON length: " . strlen($json) . "\n";
    }
} catch (PDOException $e) { 
    echo "PDO ERROR: " . $e->getMessage() . "\n"; 
} catch (Exception $e) { 
    echo "ERROR: " . $e->getMessage() . "\n"; 
}
