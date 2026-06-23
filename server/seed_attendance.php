<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

// Get the first user (likely the one logged in)
$uStmt = $db->query("SELECT id FROM users LIMIT 1");
$user = $uStmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("No users found to seed attendance for.\n");
}

$userId = $user['id'];
echo "Seeding attendance for user ID: $userId\n";

$records = [
    [
        'date' => date('Y-m-d', strtotime('-1 days')),
        'check_in' => date('Y-m-d 09:00:00', strtotime('-1 days')),
        'check_out' => date('Y-m-d 18:00:00', strtotime('-1 days')),
        'address' => 'A-12, Sector 62, Noida, Uttar Pradesh 201301',
        'status' => 'present'
    ],
    [
        'date' => date('Y-m-d', strtotime('-2 days')),
        'check_in' => date('Y-m-d 09:15:00', strtotime('-2 days')),
        'check_out' => date('Y-m-d 18:30:00', strtotime('-2 days')),
        'address' => 'Cyber City, Phase 2, Gurgaon, Haryana 122002',
        'status' => 'present'
    ],
    [
        'date' => date('Y-m-d', strtotime('-3 days')),
        'check_in' => date('Y-m-d 10:30:00', strtotime('-3 days')),
        'check_out' => date('Y-m-d 19:30:00', strtotime('-3 days')),
        'address' => 'DLF Mall, Saket, New Delhi 110017',
        'status' => 'late'
    ]
];

foreach ($records as $r) {
    $sql = "INSERT INTO attendances (employee_id, date, check_in_time, check_out_time, check_in_address, total_hours, status) 
            VALUES (:uid, :date, :in, :out, :addr, 9, :status)
            ON DUPLICATE KEY UPDATE check_in_time = :in";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':uid' => $userId,
        ':date' => $r['date'],
        ':in' => $r['check_in'],
        ':out' => $r['check_out'],
        ':addr' => $r['address'],
        ':status' => $r['status']
    ]);
}

echo "Attendance seeded successfully.\n";
