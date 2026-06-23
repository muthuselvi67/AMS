<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

$holidays = [
    ["New Year's Day", '2026-01-01', 'government', 'New Year\'s Day'],
    ["Pongal*", '2026-01-15', 'government', 'Pongal'],
    ["Republic Day", '2026-01-26', 'government', 'Republic Day'],
    ["Maha Shivaratri", '2026-02-17', 'government', 'Maha Shivaratri'],
    ["Holi", '2026-03-04', 'government', 'Holi'],
    ["Ramzan / Eid-ul-Fitr*", '2026-03-21', 'government', 'Ramzan / Eid-ul-Fitr'],
    ["Mahavir Jayanti", '2026-03-30', 'government', 'Mahavir Jayanti'],
    ["Good Friday", '2026-04-03', 'government', 'Good Friday'],
    ["Dr. B.R. Ambedkar Jayanti", '2026-04-14', 'government', 'Dr. B.R. Ambedkar Jayanti'],
    ["May Day / Labour Day", '2026-05-01', 'government', 'May Day / Labour Day'],
    ["Bakrid / Eid al-Adha*", '2026-05-28', 'government', 'Bakrid / Eid al-Adha'],
    ["Muharram*", '2026-06-26', 'government', 'Muharram'],
    ["Independence Day", '2026-08-15', 'government', 'Independence Day'],
    ["Krishna Jayanthi", '2026-09-03', 'government', 'Krishna Jayanthi'],
    ["Milad-un-Nabi*", '2026-09-15', 'government', 'Milad-un-Nabi'],
    ["Gandhi Jayanti", '2026-10-02', 'government', 'Gandhi Jayanti'],
    ["Deepavali", '2026-11-08', 'government', 'Deepavali'],
    ["Christmas", '2026-12-25', 'government', 'Christmas']
];

try {
    // Clear existing holidays to ensure we only have the requested list
    $db->exec("TRUNCATE TABLE holidays");

    $query = "INSERT INTO holidays (name, date, type, description) VALUES (:name, :date, :type, :description)";
    $stmt = $db->prepare($query);

    foreach ($holidays as $holiday) {
        $stmt->bindParam(':name', $holiday[0]);
        $stmt->bindParam(':date', $holiday[1]);
        $stmt->bindParam(':type', $holiday[2]);
        $stmt->bindParam(':description', $holiday[3]);
        $stmt->execute();
    }
    
    echo "Holidays seeded successfully.\n";

} catch (PDOException $e) {
    die("Error seeding database: " . $e->getMessage() . "\n");
}
?>
