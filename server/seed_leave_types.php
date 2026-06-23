<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$leaveTypes = [
    [
        'name' => 'Annual Leave',
        'code' => 'AL',
        'default_days' => 20,
        'color' => '#4F9CF9',
        'description' => 'Standard annual vacation'
    ],
    [
        'name' => 'Sick Leave',
        'code' => 'SL',
        'default_days' => 12,
        'color' => '#F59E0B',
        'description' => 'Medical leave'
    ],
    [
        'name' => 'Casual Leave',
        'code' => 'CL',
        'default_days' => 8,
        'color' => '#10B981',
        'description' => 'Unplanned short leaves'
    ],
    [
        'name' => 'Maternity Leave',
        'code' => 'ML',
        'default_days' => 180,
        'color' => '#8B5CF6',
        'description' => 'Leave for child birth'
    ],
    [
        'name' => 'Paternity Leave',
        'code' => 'PL',
        'default_days' => 5,
        'color' => '#EC4899',
        'description' => 'Leave for fathers'
    ],
    [
        'name' => 'Floating Holiday',
        'code' => 'FH',
        'default_days' => 2,
        'color' => '#FF9F43',
        'description' => 'Floating holidays for optional festival or personal celebration.'
    ],
    [
        'name' => 'Vacation Leave',
        'code' => 'VL',
        'default_days' => 12,
        'color' => '#10B981',
        'description' => 'Standard vacation leave for leisure and relaxation.'
    ],
    [
        'name' => 'Monthly Half Day',
        'code' => 'MHD',
        'default_days' => 12,
        'color' => '#8B5CF6',
        'description' => 'Monthly half day leave allowance (12 half-days per year).'
    ],
    [
        'name' => 'Compensatory Off',
        'code' => 'CO',
        'default_days' => 5,
        'color' => '#14B8A6',
        'description' => 'Leave granted as compensation for working on weekends or holidays.'
    ]
];

echo "Seeding leave_types...\n";

foreach ($leaveTypes as $lt) {
    $sql = "INSERT INTO leave_types (name, code, default_days, color, description) 
            VALUES (:name, :code, :default_days, :color, :description)
            ON DUPLICATE KEY UPDATE name=name";
    $stmt = $db->prepare($sql);
    $stmt->execute($lt);
    echo "Inserted/Updated: " . $lt['name'] . "\n";
}

echo "Seeding complete.\n";
