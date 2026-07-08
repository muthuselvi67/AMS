<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/controllers/ChatController.php';

$db = (new Database())->getConnection();

// Simulate MUTHUSELVI S (id = 94)
$currentUser = ['id' => 94, 'name' => 'MUTHUSELVI S', 'role' => 'Employee'];
$recipientId = 99; // ROSHINI k

$controller = new ChatController($db, 'GET', 'messages', $currentUser, $recipientId);
ob_start();
$controller->processRequest();
$output = ob_get_clean();

echo "Output of getMessages(99):\n";
echo $output;

echo "\n\nDirect DB Check:\n";
$stmt = $db->query("SELECT * FROM messages WHERE (sender_id = 94 AND recipient_id = 99) OR (sender_id = 99 AND recipient_id = 94)");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
?>
