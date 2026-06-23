<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$month = 5;
$year = 2026;
$userId = 21; // Muthuselvi S

// Fetch employee details
$query = "SELECT * FROM users WHERE id = :id";
$stmt = $db->prepare($query);
$stmt->execute(['id' => $userId]);
$emp = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$emp) {
    die("Employee not found");
}

// Calculate
$base = (float)$emp['salary_base'];
$transport = (float)$emp['salary_transport'];
$other = (float)$emp['salary_other'];
$net = $base + $transport + $other;

// Insert payroll record
$insertQuery = "INSERT INTO payrolls (user_id, month, year, base_salary, allowance_transport, allowance_other, net_salary, status) 
                VALUES (:user_id, :month, :year, :base, :transport, :other, :net, 'Draft')";

$insertStmt = $db->prepare($insertQuery);
try {
    $insertStmt->execute([
        'user_id' => $userId,
        'month' => $month,
        'year' => $year,
        'base' => $base,
        'transport' => $transport,
        'other' => $other,
        'net' => $net
    ]);
    echo "Payroll generated successfully for {$emp['name']}\n";
    echo "Basic: $base\n";
    echo "Travel: $transport\n";
    echo "Food: $other\n";
    echo "Net: $net\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
