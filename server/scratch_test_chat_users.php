<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/controllers/ChatController.php';

$db = (new Database())->getConnection();
$currentUser = ['id' => 94, 'name' => 'MUTHUSELVI S'];
$controller = new ChatController($db, 'GET', 'users', $currentUser, null);
$controller->processRequest();
?>
