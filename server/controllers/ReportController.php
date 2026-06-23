<?php

class ReportController {
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

        // Only Admin and HR can access reports
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Forbidden", null, 403);
            return;
        }

        if ($this->id === 'allowances') {
            if ($this->requestMethod === 'GET') {
                $this->getAllowanceReport();
            } else {
                Response::json(false, "Method not allowed", null, 405);
            }
        } else if ($this->id === 'attendance') {
            if ($this->requestMethod === 'GET') {
                $this->getAttendanceReport();
            } else {
                Response::json(false, "Method not allowed", null, 405);
            }
        } else if ($this->id === 'leaves') {
            if ($this->requestMethod === 'GET') {
                $this->getLeaveReport();
            } else {
                Response::json(false, "Method not allowed", null, 405);
            }
        } else {
            Response::json(false, "Report type not found", null, 404);
        }
    }

    private function getAllowanceReport() {
        $status = $_GET['status'] ?? null;
        $employeeId = $_GET['employeeId'] ?? null;
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;
        $format = $_GET['format'] ?? null;

        $query = "
            SELECT ar.id as request_id, u.name as employee_name, u.employee_id, u.department,
                   ac.name as category_name, ar.amount, ar.date, ar.status, ar.created_at
            FROM allowance_requests ar
            JOIN users u ON ar.employee_id = u.id
            JOIN allowance_categories ac ON ar.category_id = ac.id
            WHERE 1=1
        ";

        $params = [];
        if ($status && $status !== 'all') {
            $query .= " AND ar.status = :status";
            $params['status'] = $status;
        }
        if ($employeeId) {
            $query .= " AND ar.employee_id = :employee_id";
            $params['employee_id'] = $employeeId;
        }
        if ($startDate) {
            $query .= " AND ar.date >= :start_date";
            $params['start_date'] = $startDate;
        }
        if ($endDate) {
            $query .= " AND ar.date <= :end_date";
            $params['end_date'] = $endDate;
        }

        $query .= " ORDER BY u.name ASC, ar.created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $reportData = [];
        foreach ($records as $row) {
            $reportData[] = [
                'ID' => (int)$row['request_id'],
                'Employee Name' => $row['employee_name'],
                'Employee ID' => $row['employee_id'] ?: ('EMP' . str_pad($row['employee_id'], 3, '0', STR_PAD_LEFT)),
                'Department' => $row['department'] ?: 'HR',
                'Category' => $row['category_name'],
                'Amount' => (float)$row['amount'],
                'Date' => date('Y-m-d', strtotime($row['date'])),
                'Status' => $row['status'],
                'Applied On' => date('Y-m-d', strtotime($row['created_at']))
            ];
        }

        if ($format === 'excel') {
            // Stream clean CSV format representing Excel spreadsheet
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="allowance_report_' . time() . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // Add UTF-8 BOM for Excel compatibility
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header Row
            fputcsv($output, ['Employee Name', 'Employee ID', 'Department', 'Category', 'Amount (₹)', 'Date', 'Status', 'Applied On']);
            
            // Data Rows
            foreach ($reportData as $row) {
                fputcsv($output, [
                    $row['Employee Name'],
                    $row['Employee ID'],
                    $row['Department'],
                    $row['Category'],
                    $row['Amount'],
                    $row['Date'],
                    ucfirst(str_replace('_', ' ', $row['Status'])),
                    $row['Applied On']
                ]);
            }
            fclose($output);
            exit();
        } else {
            Response::json(true, "Allowance report fetched", $reportData, 200);
        }
    }

    private function getAttendanceReport() {
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;
        $format = $_GET['format'] ?? null;

        $query = "
            SELECT a.*, u.name as employee_name, u.employee_id as employee_code, u.department
            FROM attendances a
            JOIN users u ON a.employee_id = u.id
            WHERE 1=1
        ";

        $params = [];
        if ($startDate) {
            $query .= " AND a.date >= :start_date";
            $params['start_date'] = $startDate;
        }
        if ($endDate) {
            $query .= " AND a.date <= :end_date";
            $params['end_date'] = $endDate;
        }

        $query .= " ORDER BY a.date DESC, u.name ASC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $reportData = [];
        foreach ($records as $row) {
            $reportData[] = [
                'Employee Name' => $row['employee_name'],
                'Employee ID' => $row['employee_code'] ?: ('EMP' . str_pad($row['employee_id'], 3, '0', STR_PAD_LEFT)),
                'Department' => $row['department'] ?: 'HR',
                'Date' => $row['date'],
                'Check-In' => $row['check_in_time'] ? date('H:i:s', strtotime($row['check_in_time'])) : '-',
                'Check-In Location' => $row['check_in_address'] ?: '-',
                'Check-Out' => $row['check_out_time'] ? date('H:i:s', strtotime($row['check_out_time'])) : '-',
                'Check-Out Location' => $row['check_out_address'] ?: '-',
                'Hours Worked' => $row['total_hours'] !== null ? round((float)$row['total_hours'], 2) : 0,
                'Status' => ucfirst($row['status'] ?: 'present')
            ];
        }

        if ($format === 'excel') {
            // Stream clean CSV format representing Excel spreadsheet
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="attendance_report_' . time() . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // Add UTF-8 BOM for Excel compatibility
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header Row
            fputcsv($output, ['Employee Name', 'Employee ID', 'Department', 'Date', 'Check-In', 'Check-In Location', 'Check-Out', 'Check-Out Location', 'Hours Worked', 'Status']);
            
            // Data Rows
            foreach ($reportData as $row) {
                fputcsv($output, [
                    $row['Employee Name'],
                    $row['Employee ID'],
                    $row['Department'],
                    $row['Date'],
                    $row['Check-In'],
                    $row['Check-In Location'],
                    $row['Check-Out'],
                    $row['Check-Out Location'],
                    $row['Hours Worked'],
                    $row['Status']
                ]);
            }
            fclose($output);
            exit();
        } else {
            Response::json(true, "Attendance report fetched", $reportData, 200);
        }
    }

    private function getLeaveReport() {
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;
        $status = $_GET['status'] ?? null;
        $format = $_GET['format'] ?? null;

        $query = "
            SELECT lr.*, lt.name as leave_type_name, u.name as employee_name, u.employee_id as employee_code, u.department
            FROM leave_requests lr
            LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
            LEFT JOIN users u ON lr.employee_id = u.id
            WHERE 1=1
        ";

        $params = [];
        if ($startDate) {
            $query .= " AND lr.start_date >= :start_date";
            $params['start_date'] = $startDate;
        }
        if ($endDate) {
            $query .= " AND lr.end_date <= :end_date";
            $params['end_date'] = $endDate;
        }
        if ($status && $status !== 'all') {
            $query .= " AND lr.status = :status";
            $params['status'] = $status;
        }

        $query .= " ORDER BY lr.created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $reportData = [];
        foreach ($records as $row) {
            $reportData[] = [
                'Employee Name' => $row['employee_name'],
                'Employee ID' => $row['employee_code'] ?: ('EMP' . str_pad($row['employee_id'], 3, '0', STR_PAD_LEFT)),
                'Department' => $row['department'] ?: 'HR',
                'Leave Type' => $row['leave_type_name'] ?: 'General',
                'Start Date' => $row['start_date'],
                'End Date' => $row['end_date'],
                'Days' => (float)$row['number_of_days'],
                'Reason' => $row['reason'],
                'Status' => ucfirst($row['status']),
                'Remarks' => $row['hr_remark'] ?: ($row['manager_remark'] ?: '-')
            ];
        }

        if ($format === 'excel') {
            // Stream clean CSV format representing Excel spreadsheet
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="leave_report_' . time() . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // Add UTF-8 BOM for Excel compatibility
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header Row
            fputcsv($output, ['Employee Name', 'Employee ID', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Remarks']);
            
            // Data Rows
            foreach ($reportData as $row) {
                fputcsv($output, [
                    $row['Employee Name'],
                    $row['Employee ID'],
                    $row['Department'],
                    $row['Leave Type'],
                    $row['Start Date'],
                    $row['End Date'],
                    $row['Days'],
                    $row['Reason'],
                    $row['Status'],
                    $row['Remarks']
                ]);
            }
            fclose($output);
            exit();
        } else {
            Response::json(true, "Leave report fetched", $reportData, 200);
        }
    }
}
?>
