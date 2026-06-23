<?php
// Test DB connection and login
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode(['db' => 'FAILED - connection is null']);
    exit;
}

echo json_encode(['db' => 'OK']);

// Test user query
$query = "SELECT id, email, role, name FROM users LIMIT 5";
$stmt = $db->prepare($query);
$stmt->execute();
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\n" . json_encode(['users' => $users]);
?>
