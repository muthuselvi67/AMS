<?php
require_once __DIR__ . '/config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();

    echo "Starting holiday cleanup...\n";

    // Get all holidays ordered by date and type (so NATIONAL comes first, etc.)
    $stmt = $conn->prepare("SELECT * FROM holidays ORDER BY date ASC, type ASC");
    $stmt->execute();
    $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $seen_dates = [];
    $duplicates = [];

    foreach ($holidays as $holiday) {
        $date = $holiday['date'];
        if (in_array($date, $seen_dates)) {
            $duplicates[] = $holiday['id'];
        } else {
            $seen_dates[] = $date;
        }
    }

    if (count($duplicates) > 0) {
        $inQuery = implode(',', array_fill(0, count($duplicates), '?'));
        $deleteStmt = $conn->prepare("DELETE FROM holidays WHERE id IN ($inQuery)");
        $deleteStmt->execute($duplicates);
        echo "Deleted " . count($duplicates) . " duplicate holidays.\n";
    } else {
        echo "No duplicate holidays found.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
