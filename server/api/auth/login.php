<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/Response.php';
require_once __DIR__ . '/../../utils/JWT.php';
require_once __DIR__ . '/../../controllers/AuthController.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

$controller = new AuthController($db, $method, 'login');
$controller->processRequest();
?>

