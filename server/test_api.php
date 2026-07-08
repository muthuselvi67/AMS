<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/controllers/ChatController.php';

$database = new Database();
$db = $database->getConnection();

// Simulate user ID 4 (MUTHUSELVI)
$user = ['id' => 4, 'name' => 'MUTHUSELVI'];

// Simulate GET /chat/users
$controller = new ChatController($db, 'GET', 'users', $user, null);

ob_start();
$controller->processRequest();
$output = ob_get_clean();

echo "OUTPUT:\n" . $output;
