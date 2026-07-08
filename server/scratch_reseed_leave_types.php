<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

// Disable foreign key checks to allow truncating tables
$db->exec("SET FOREIGN_KEY_CHECKS = 0");
$db->exec("TRUNCATE TABLE leave_requests");
$db->exec("TRUNCATE TABLE leave_types");
$db->exec("SET FOREIGN_KEY_CHECKS = 1");

$leaveTypes = [
    [
        'name' => 'Sick Leave',
        'code' => 'SL',
        'default_days' => 12,
        'color' => '#F59E0B',
        'description' => 'Medical and health related leaves'
    ],
    [
        'name' => 'Casual Leave',
        'code' => 'CL',
        'default_days' => 12,
        'color' => '#10B981',
        'description' => 'Unplanned personal leaves'
    ],
    [
        'name' => 'Floating Holiday',
        'code' => 'FH',
        'default_days' => 30,
        'color' => '#FF9F43',
        'description' => 'Floating holiday allowance'
    ],
    [
        'name' => 'Vacation Leave',
        'code' => 'VL',
        'default_days' => 6,
        'color' => '#3B82F6',
        'description' => 'Vacation and leisure leaves'
    ],
    [
        'name' => 'Monthly Half-Day Permission',
        'code' => 'MHDP',
        'default_days' => 12,
        'color' => '#8B5CF6',
        'description' => 'Monthly half-day permission leaves'
    ],
    [
        'name' => 'Monthly One-Hour Permission',
        'code' => 'MOHP',
        'default_days' => 12,
        'color' => '#8B5CF6',
        'description' => 'Monthly one-hour permission leaves'
    ],
    [
        'name' => 'Task Hand Over',
        'code' => 'THO',
        'default_days' => 30,
        'color' => '#8B5CF6',
        'description' => 'Task handover leaves'
    ],
    [
        'name' => 'Compensatory Off',
        'code' => 'CO',
        'default_days' => 30,
        'color' => '#8B5CF6',
        'description' => 'Compensatory off leaves'
    ],
    [
        'name' => 'Maternity Leave',
        'code' => 'ML',
        'default_days' => 180,
        'color' => '#EC4899',
        'description' => 'Maternity leave for child birth'
    ]
];

echo "Seeding corrected leave_types...\n";

foreach ($leaveTypes as $lt) {
    $sql = "INSERT INTO leave_types (name, code, default_days, color, description, is_paid, is_active) 
            VALUES (:name, :code, :default_days, :color, :description, 1, 1)";
    $stmt = $db->prepare($sql);
    $stmt->execute($lt);
    echo "Inserted: " . $lt['name'] . "\n";
}

echo "Seeding complete successfully.\n";
