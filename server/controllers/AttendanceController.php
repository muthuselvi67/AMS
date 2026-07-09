<?php

class AttendanceController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;
    private $subId;

    // Office Geofence configurations
    private const LOCATIONS = [
        [
            'name' => 'LearnLike',
            'lat' => 10.9984474,
            'lng' => 76.9914006,
        ],
        [
            'name' => 'Hicas',
            'lat' => 11.0126179,
            'lng' => 76.9905965,
        ]
    ];
    private const GEOFENCE_RADIUS  = 500; // meters

    public function __construct($db, $requestMethod, $id, $user, $subId = null) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;
        $this->subId = $subId;
    }

    // Haversine formula — returns distance in meters
    private function haversineDistance($lat1, $lon1, $lat2, $lon2) {
        $R = 6371000; // Earth radius in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
            return;
        }

        $this->enforceWFHPolicy();

        // Route: GET /api/attendance/today
        if ($this->requestMethod === 'GET' && $this->id === 'today') {
            $this->getTodayAttendance();
            return;
        }

        // Route: GET /api/attendance/absent
        if ($this->requestMethod === 'GET' && $this->id === 'absent') {
            $this->getAbsentEmployees();
            return;
        }

        if ($this->requestMethod === 'PUT' && $this->subId === 'timesheet') {
            $this->updateTimesheet();
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                $this->getAttendance();
                break;
            case 'POST':
                $this->markAttendance();
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function enforceWFHPolicy() {
        $today = date('Y-m-d');
        $now = date('H:i:s');

        // Find WFH attendance records that are not marked as 'on-leave' yet
        // and check if they missed the EOD report. We only check records for:
        // - past days
        // - today, if the current time is past 18:00:00 (6:00 PM)
        $query = "SELECT id, employee_id, date, status 
                  FROM attendances 
                  WHERE work_from_home = 1 
                    AND status != 'on-leave'
                    AND (date < :today OR (date = :today2 AND :now > '18:00:00'))";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':today' => $today,
            ':today2' => $today,
            ':now' => $now
        ]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($records as $r) {
            // Check if there is a final EOD report for this attendance record
            $checkFinal = $this->db->prepare(
                "SELECT id FROM wfh_updates 
                 WHERE attendance_id = :att_id AND is_final = 1 LIMIT 1"
            );
            $checkFinal->execute([':att_id' => $r['id']]);

            if ($checkFinal->rowCount() == 0) {
                // No EOD report found! Update status to 'on-leave'
                $update = $this->db->prepare(
                    "UPDATE attendances SET status = 'on-leave' WHERE id = :id"
                );
                $update->execute([':id' => $r['id']]);

                // Notify the employee that their WFH day was auto-marked as leave
                try {
                    $empMsg  = "Your WFH day on {$r['date']} was automatically marked as Leave because no final EOD report was submitted by 6:00 PM.";
                    $notifEmp = $this->db->prepare(
                        "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                         VALUES (:uid, 'WFH Marked as Leave', :msg, 'wfh_policy_leave', :att_id, 'attendances', 0, NOW(), NOW())"
                    );
                    $notifEmp->execute([':uid' => $r['employee_id'], ':msg' => $empMsg, ':att_id' => $r['id']]);

                    // Also notify all HR / Admin users
                    $empNameStmt = $this->db->prepare("SELECT name FROM users WHERE id = :id LIMIT 1");
                    $empNameStmt->execute([':id' => $r['employee_id']]);
                    $empName = $empNameStmt->fetchColumn() ?: 'An employee';

                    $hrMsg = "{$empName}'s WFH attendance on {$r['date']} was automatically marked as Leave — no final EOD report was submitted by 6:00 PM.";
                    $hrStmt = $this->db->query("SELECT id FROM users WHERE role IN ('admin','hr') AND is_active = 1");
                    $hrUsers = $hrStmt->fetchAll(PDO::FETCH_COLUMN);
                    $notifHR = $this->db->prepare(
                        "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
                         VALUES (:uid, 'WFH Auto-Leave Applied', :msg, 'wfh_policy_leave', :att_id, 'attendances', 0, NOW(), NOW())"
                    );
                    foreach ($hrUsers as $hrId) {
                        $notifHR->execute([':uid' => $hrId, ':msg' => $hrMsg, ':att_id' => $r['id']]);
                    }
                } catch (Exception $e) {
                    // ignore notification errors
                }
            }
        }
    }

    private function getTodayAttendance() {
        $today = date("Y-m-d");
        $userId = $this->user['id'];

        $query = "SELECT * FROM attendances WHERE employee_id = :user_id AND date = :today LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($record) {
            // Format to match what frontend expects
            $attendance = [
                'id'       => $record['id'],
                'checkIn'  => $record['check_in_time']  ? [
                    'time'      => $record['check_in_time'],
                    'photo'     => $this->formatPhotoUrl($record['check_in_photo']),
                    'address'   => $record['check_in_address'],
                    'accuracy'  => $record['check_in_accuracy'],
                    'latitude'  => $record['check_in_latitude']  ? (float)$record['check_in_latitude']  : null,
                    'longitude' => $record['check_in_longitude'] ? (float)$record['check_in_longitude'] : null
                ] : null,
                'checkOut' => $record['check_out_time'] ? [
                    'time'      => $record['check_out_time'],
                    'photo'     => $this->formatPhotoUrl($record['check_out_photo']),
                    'address'   => $record['check_out_address'],
                    'latitude'  => $record['check_out_latitude']  ? (float)$record['check_out_latitude']  : null,
                    'longitude' => $record['check_out_longitude'] ? (float)$record['check_out_longitude'] : null
                ] : null,
                'totalHours'   => $record['total_hours'] ?? 0,
                'status'       => $record['status'],
                'workFromHome' => (bool)($record['work_from_home'] ?? false),
                'break_minutes' => $record['break_minutes'] ?? 0,
                'overtime_hours' => $record['overtime_hours'] ?? 0,
                'task_done' => $record['task_done'],
                'remarks' => $record['remarks'],
                'timesheet_status' => $record['timesheet_status'] ?? 'pending'
            ];

            Response::json(true, "Today attendance fetched", ['attendance' => $attendance], 200);
        } else {
            Response::json(true, "No attendance today", ['attendance' => null], 200);
        }
    }

    private function getAttendance() {
        $isAdminOrHR = in_array($this->user['role'], ['admin', 'hr']);

        $query = "SELECT a.*, u.name as employee_name, u.department as employee_department 
                  FROM attendances a
                  JOIN users u ON a.employee_id = u.id";

        $conditions = [];
        $params = [];

        // Employees can only see their own records
        if (!$isAdminOrHR) {
            $conditions[] = "a.employee_id = :emp_id";
            $params[':emp_id'] = $this->user['id'];
        } else {
            if (!empty($_GET['employeeId'])) {
                $conditions[] = "a.employee_id = :emp_id";
                $params[':emp_id'] = $_GET['employeeId'];
            } else if (!empty($_GET['employee_id'])) {
                $conditions[] = "a.employee_id = :emp_id";
                $params[':emp_id'] = $_GET['employee_id'];
            }
        }

        // Single-day filter (for WFH policy manager)
        if (!empty($_GET['date'])) {
            $conditions[] = "a.date = :date";
            $params[':date'] = $_GET['date'];
        }

        if (!empty($_GET['startDate'])) {
            $conditions[] = "a.date >= :startDate";
            $params[':startDate'] = $_GET['startDate'];
        }

        if (!empty($_GET['endDate'])) {
            $conditions[] = "a.date <= :endDate";
            $params[':endDate'] = $_GET['endDate'];
        }

        if (!empty($_GET['status'])) {
            $conditions[] = "a.status = :status";
            $params[':status'] = $_GET['status'];
        }

        if (count($conditions) > 0) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY a.date DESC";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($records as &$r) {
            $r['employee'] = [
                'id' => $r['employee_id'],
                'name' => $r['employee_name'],
                'department' => $r['employee_department']
            ];
            $r['checkIn'] = [
                'time' => $r['check_in_time'],
                'photo' => $this->formatPhotoUrl($r['check_in_photo']),
                'address' => $r['check_in_address'],
                'latitude' => $r['check_in_latitude'] ? (float)$r['check_in_latitude'] : null,
                'longitude' => $r['check_in_longitude'] ? (float)$r['check_in_longitude'] : null
            ];
            $r['checkOut'] = [
                'time' => $r['check_out_time'],
                'photo' => $this->formatPhotoUrl($r['check_out_photo']),
                'address' => $r['check_out_address'],
                'latitude' => $r['check_out_latitude'] ? (float)$r['check_out_latitude'] : null,
                'longitude' => $r['check_out_longitude'] ? (float)$r['check_out_longitude'] : null
            ];
            $r['totalHours'] = (float)$r['total_hours'];
            $r['break_minutes'] = (int)($r['break_minutes'] ?? 0);
            $r['overtime_hours'] = (float)($r['overtime_hours'] ?? 0);
            $r['task_done'] = $r['task_done'];
            $r['remarks'] = $r['remarks'];
            $r['timesheet_status'] = $r['timesheet_status'] ?? 'pending';

            // For WFH records, attach update counts for HR/Admin
            if ($isAdminOrHR && $r['work_from_home']) {
                $wfhStmt = $this->db->prepare(
                    "SELECT COUNT(*) as total, 
                            SUM(CASE WHEN is_final = 1 THEN 1 ELSE 0 END) as finals
                     FROM wfh_updates WHERE attendance_id = :att_id"
                );
                $wfhStmt->execute([':att_id' => $r['id']]);
                $wfhData = $wfhStmt->fetch(PDO::FETCH_ASSOC);
                $r['update_count']  = (int)($wfhData['total'] ?? 0);
                $r['has_final_eod'] = (int)($wfhData['finals'] ?? 0) > 0;
            }
        }

        Response::json(true, "Attendance fetched successfully", $records, 200);
    }

    private function markAttendance() {

        $date   = date("Y-m-d");
        $userId = $this->user['id'];

        // Check if employee has an approved leave for today
        $leaveCheck = "SELECT lr.id, lt.name as leave_type 
                       FROM leave_requests lr 
                       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
                       WHERE lr.employee_id = :emp_id 
                       AND :today BETWEEN lr.start_date AND lr.end_date 
                       AND lr.status = 'approved' 
                       LIMIT 1";
        $leaveStmt = $this->db->prepare($leaveCheck);
        $leaveStmt->bindParam(':emp_id', $userId);
        $leaveStmt->bindParam(':today', $date);
        $leaveStmt->execute();

        if ($leaveStmt->rowCount() > 0) {
            $leaveInfo = $leaveStmt->fetch(PDO::FETCH_ASSOC);
            $leaveType = $leaveInfo['leave_type'] ?? 'Leave';
            Response::json(false, "You cannot mark attendance today. You have an approved {$leaveType} for this date.", null, 400);
            return;
        }

        // Read request body early for geofence check
        $data = json_decode(file_get_contents("php://input"), true);

        // ── STEP: GPS Geofence Check (skip for WFH mode) ──────────────────────
        $isWFH = !empty($data['work_from_home']);

        if (!$isWFH) {
            // Location permission was denied / missing — frontend must send coords
            if (empty($data['latitude']) || empty($data['longitude'])) {
                Response::json(false,
                    "Location permission is required to mark attendance. Please allow GPS access and try again.",
                    null, 400);
                return;
            }

            // ── GATE: GPS Accuracy must be < 200 m (indoor GPS gives 50–100 m normally) ──
            if (isset($data['accuracy']) && (float)$data['accuracy'] >= 200) {
                $acc = round((float)$data['accuracy'], 1);
                Response::json(false,
                    "GPS accuracy too low ({$acc} m). Accuracy < 200 m required.",
                    null, 400);
                return;
            }

            // Find closest office location
            $minDistance = null;
            $closestLocationName = 'LearnLike';
            foreach (self::LOCATIONS as $loc) {
                $dist = $this->haversineDistance(
                    (float)$data['latitude'], (float)$data['longitude'],
                    $loc['lat'], $loc['lng']
                );
                if ($minDistance === null || $dist < $minDistance) {
                    $minDistance = $dist;
                    $closestLocationName = $loc['name'];
                }
            }

            // ── Distance > 500 m → Outside Office Area ──────────────────────────
            if ($minDistance > self::GEOFENCE_RADIUS) {
                $distM = (int)round($minDistance);
                Response::json(false,
                    "Outside Office Area. You are {$distM} m away from the nearest office. " .
                    "You must be within " . self::GEOFENCE_RADIUS . " m to mark attendance.",
                    ['distance_meters' => $distM, 'required_meters' => self::GEOFENCE_RADIUS],
                    400);
                return;
            }

            $data['address'] = $closestLocationName;
        }

        // ── STEP: Check if Already Marked Today ────────────────────────────────
        $check = "SELECT id, check_in_time, check_out_time FROM attendances WHERE employee_id = :employee_id AND date = :date LIMIT 1";
        $stmt  = $this->db->prepare($check);
        $stmt->bindParam(':employee_id', $userId);
        $stmt->bindParam(':date', $date);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($record['check_out_time']) {
                Response::json(false, "Attendance already marked. You have already checked in and out today.", null, 400);
                return;
            }
            // Save check-out selfie to disk
            $photoPath = $this->saveSelfie($data['photo'] ?? null, $userId, 'CheckOut');

            // Checkout
            $update = "UPDATE attendances SET 
                        check_out_time = NOW(), 
                        check_out_photo = :photo,
                        check_out_latitude = :lat,
                        check_out_longitude = :lng,
                        check_out_address = :address,
                        check_out_accuracy = :accuracy,
                        total_hours = ROUND(TIMESTAMPDIFF(SECOND, check_in_time, NOW()) / 3600.0, 2)
                      WHERE id = :id";
            $updateStmt = $this->db->prepare($update);
            $updateStmt->bindParam(':photo', $photoPath);
            $updateStmt->bindParam(':lat', $data['latitude']);
            $updateStmt->bindParam(':lng', $data['longitude']);
            $updateStmt->bindParam(':address', $data['address']);
            $updateStmt->bindParam(':accuracy', $data['accuracy']);
            $updateStmt->bindParam(':id', $record['id']);
            $updateStmt->execute();

            // Fetch final calculated hours
            $hoursQuery = "SELECT total_hours FROM attendances WHERE id = :id";
            $hoursStmt = $this->db->prepare($hoursQuery);
            $hoursStmt->bindParam(':id', $record['id']);
            $hoursStmt->execute();
            $totalHours = (float)$hoursStmt->fetchColumn();

            Response::json(true, "Checked out successfully", ['totalHours' => $totalHours], 200);

        } else {
            // Check-in

            $currentTime  = date('H:i:s');
            $status       = ($currentTime > '09:30:00') ? 'late' : 'present';
            $workFromHome = !empty($data['work_from_home']) ? 1 : 0;

            // Fetch employee name to store in the attendance record
            $userStmt = $this->db->prepare("SELECT name FROM users WHERE id = :uid LIMIT 1");
            $userStmt->execute([':uid' => $userId]);
            $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
            $employeeName = $userRow ? $userRow['name'] : '';

            // Save check-in selfie to disk
            $photoPath = $this->saveSelfie($data['photo'] ?? null, $userId, 'CheckIn');

            $insert = "INSERT INTO attendances
                       (employee_id, employee_name, date, check_in_time, check_in_photo,
                        check_in_latitude, check_in_longitude, check_in_address,
                        check_in_accuracy, status, work_from_home)
                       VALUES
                       (:employee_id, :employee_name, :date, NOW(), :photo,
                        :lat, :lng, :address,
                        :accuracy, :status, :work_from_home)";
            $insertStmt = $this->db->prepare($insert);
            $insertStmt->bindParam(':employee_id',    $userId);
            $insertStmt->bindParam(':employee_name',  $employeeName);
            $insertStmt->bindParam(':date',           $date);
            $insertStmt->bindParam(':photo',          $photoPath);
            $insertStmt->bindParam(':lat',            $data['latitude']);
            $insertStmt->bindParam(':lng',            $data['longitude']);
            $insertStmt->bindParam(':address',        $data['address']);
            $insertStmt->bindParam(':accuracy',       $data['accuracy']);
            $insertStmt->bindParam(':status',         $status);
            $insertStmt->bindParam(':work_from_home', $workFromHome);
            $insertStmt->execute();
            Response::json(true, "Checked in successfully", [
                'status'       => $status,
                'workFromHome' => (bool)$workFromHome
            ], 201);
        }
    }

    /**
     * Helper to save base64 selfie data as JPG to ParentDirectory/uploads/YYYY-MM-DD/
     */
    private function saveSelfie($photoData, $employeeId, $type) {
        if (empty($photoData)) {
            return null;
        }

        // Fetch employee details to construct the filename
        $userStmt = $this->db->prepare("SELECT name FROM users WHERE id = :uid LIMIT 1");
        $userStmt->execute([':uid' => $employeeId]);
        $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
        $employeeName = $userRow ? $userRow['name'] : '';

        $safeName = preg_replace('/[^A-Za-z0-9]/', '', $employeeName);

        $timeStr = date('H-i-s');
        $dateStr = date('Y-m-d');
        $fileName = $safeName . '_' . $timeStr . '_' . $dateStr . '.jpg';

        $subFolder = ($type === 'CheckIn') ? 'check_in' : 'check_out';
        $targetDir = __DIR__ . '/../uploads/' . $subFolder . '/' . $dateStr;
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        if (strpos($photoData, 'data:image') === 0) {
            $parts = explode(',', $photoData);
            $base64String = $parts[1] ?? '';
            $decodedData = base64_decode($base64String);
        } else {
            $decodedData = base64_decode($photoData);
        }

        $filePath = $targetDir . '/' . $fileName;
        file_put_contents($filePath, $decodedData);

        // Return relative file path starting with leading slash for absolute matching in frontend
        return '/uploads/' . $subFolder . '/' . $dateStr . '/' . $fileName;
    }

    private function getAbsentEmployees() {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        // Find employees who:
        // 1. Are active
        // 2. Are not admins
        // 3. Haven't checked in for the given date
        // 4. Aren't on approved leave for the given date
        $query = "SELECT id, name, department, position 
                  FROM users 
                  WHERE is_active = 1 
                  AND role = 'employee'
                  AND id NOT IN (SELECT employee_id FROM attendances WHERE date = :date)
                  AND id NOT IN (SELECT employee_id FROM leave_requests WHERE :date2 BETWEEN start_date AND end_date AND status = 'approved')";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':date', $date);
        $stmt->bindParam(':date2', $date);
        $stmt->execute();
        $absentees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(true, "Absent employees for " . $date, $absentees, 200);
    }

    private function formatPhotoUrl($photo) {
        if (!$photo) return null;
        if (strpos($photo, 'data:image') === 0 || strpos($photo, 'http') === 0) return $photo;
        return '/' . ltrim($photo, '/');
    }
    private function updateTimesheet() {
        if (!$this->id) {
            Response::json(false, "Attendance ID required", null, 400);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            Response::json(false, "Invalid input", null, 400);
            return;
        }

        // Only employees can update their own task info, but HR/Admin can update timesheet_status (approve/reject)
        $isAdminOrHR = in_array($this->user['role'], ['admin', 'hr']);
        
        $checkQuery = "SELECT employee_id, total_hours FROM attendances WHERE id = :id LIMIT 1";
        $checkStmt = $this->db->prepare($checkQuery);
        $checkStmt->execute([':id' => $this->id]);
        $record = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            Response::json(false, "Record not found", null, 404);
            return;
        }

        if (!$isAdminOrHR && $record['employee_id'] != $this->user['id']) {
            Response::json(false, "Unauthorized", null, 403);
            return;
        }

        $fields = [];
        $params = [':id' => $this->id];

        if (isset($data['break_minutes'])) {
            $fields[] = "break_minutes = :break_minutes";
            $params[':break_minutes'] = $data['break_minutes'];
        }
        if (isset($data['task_done'])) {
            $fields[] = "task_done = :task_done";
            $params[':task_done'] = $data['task_done'];
        }
        if (isset($data['remarks'])) {
            $fields[] = "remarks = :remarks";
            $params[':remarks'] = $data['remarks'];
        }
        if (isset($data['timesheet_status']) && $isAdminOrHR) {
            $fields[] = "timesheet_status = :timesheet_status";
            $params[':timesheet_status'] = $data['timesheet_status'];
        }

        // Automatic Overtime Calculation: if updating break or task, recalculate overtime based on total_hours
        $stdHours = 9.0;
        $totalHours = (float)($record['total_hours'] ?? 0);
        $breakHrs = isset($data['break_minutes']) ? ((int)$data['break_minutes'] / 60) : 0;
        
        // Let's assume total_hours already includes breaks if the user hasn't paused the timer, 
        // but if they explicitly specify break_minutes, we might deduct it. 
        // For now, overtime is simply (total_hours) - stdHours.
        $overtime = $totalHours - $stdHours;
        if ($overtime < 0) $overtime = 0;
        
        $fields[] = "overtime_hours = :overtime_hours";
        $params[':overtime_hours'] = $overtime;

        if (empty($fields)) {
            Response::json(false, "No fields to update", null, 400);
            return;
        }

        $query = "UPDATE attendances SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);

        if ($stmt->execute($params)) {
            Response::json(true, "Timesheet updated successfully", null, 200);
        } else {
            Response::json(false, "Failed to update timesheet", null, 500);
        }
    }
}
?>
