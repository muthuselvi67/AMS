<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

$holidays = [
    ['New Year Day', '2026-01-01', 'national', 'First day of the year'],
    ['Republic Day', '2026-01-26', 'government', 'Celebration of Indian Republic (Govt Holiday)'],
    ['Holi', '2026-03-14', 'floating_leave', 'Festival of colors (Optional/Floating Leave)'],
    ['Annual Bank Closing', '2026-04-01', 'bank', 'Bank Holiday'],
    ['Good Friday', '2026-04-03', 'national', 'Religious holiday'],
    ['May Day', '2026-05-01', 'government', 'Labor Day'],
    ['Working Saturday - Q2 Planning', '2026-06-06', 'working_saturday', 'Mandatory Working Saturday for Q2 Planning'],
    ['Independence Day', '2026-08-15', 'government', 'Indian Independence Day (Govt Holiday)'],
    ['Gandhi Jayanti', '2026-10-02', 'government', 'Birthday of Mahatma Gandhi (Govt Holiday)'],
    ['Diwali', '2026-10-21', 'floating_leave', 'Festival of lights (Optional/Floating Leave)'],
    ['Christmas', '2026-12-25', 'national', 'Annual religious festival']
];

echo "Seeding holidays...\n";
foreach ($holidays as $h) {
    $sql = "INSERT INTO holidays (name, date, type, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=name";
    $stmt = $db->prepare($sql);
    $stmt->execute($h);
}
echo "Holidays seeded successfully.\n";
