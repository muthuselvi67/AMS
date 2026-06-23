<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

// 1. Deactivate all existing leave types
$db->exec("UPDATE leave_types SET is_active = 0");
echo "Deactivated all existing leave types.\n";

$policyTypes = [
    [
        'name' => 'Casual Leave',
        'code' => 'CL',
        'default_days' => 1,
        'color' => '#10B981',
        'description' => '1 Casual Leave per year.'
    ],
    [
        'name' => 'Sick Leave',
        'code' => 'SL',
        'default_days' => 1,
        'color' => '#F59E0B',
        'description' => '1 Sick Leave per year.'
    ],
    [
        'name' => 'Vacation Leave',
        'code' => 'VL',
        'default_days' => 12,
        'color' => '#3B82F6',
        'description' => 'Vacation Leave available (12 days per year).'
    ],
    [
        'name' => 'Permission Leave',
        'code' => 'PEL',
        'default_days' => 12,
        'color' => '#8B5CF6',
        'description' => 'Permission Leave available.'
    ],
    [
        'name' => 'Monthly Half-Day Permission',
        'code' => 'MHDP',
        'default_days' => 12,
        'color' => '#EC4899',
        'description' => '1 Half-Day Permission per month (12 per year).'
    ],
    [
        'name' => 'Monthly One-Hour Permission',
        'code' => 'MOP',
        'default_days' => 12,
        'color' => '#06B6D4',
        'description' => '1 One-Hour Permission per month (12 per year).'
    ],
    [
        'name' => 'Compensatory Off',
        'code' => 'CO',
        'default_days' => 5,
        'color' => '#14B8A6',
        'description' => 'Leave granted as compensation for working on weekends or holidays.'
    ]
];

foreach ($policyTypes as $lt) {
    // Check if leave type exists by code
    $stmt = $db->prepare("SELECT id FROM leave_types WHERE code = :code");
    $stmt->execute([':code' => $lt['code']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        // Update existing leave type
        $sql = "UPDATE leave_types SET 
                    name = :name, 
                    default_days = :default_days, 
                    color = :color, 
                    description = :description, 
                    is_active = 1 
                WHERE code = :code";
        $updateStmt = $db->prepare($sql);
        $updateStmt->execute($lt);
        echo "Updated and activated: {$lt['name']} ({$lt['code']})\n";
    } else {
        // Insert new leave type
        $sql = "INSERT INTO leave_types (name, code, default_days, color, description, is_active) 
                VALUES (:name, :code, :default_days, :color, :description, 1)";
        $insertStmt = $db->prepare($sql);
        $insertStmt->execute($lt);
        echo "Created and activated: {$lt['name']} ({$lt['code']})\n";
    }
}

echo "Leave policy seeding completed successfully.\n";
?>
