<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/controllers/RegularizationController.php';

$db = (new Database())->getConnection();
$user = [
    'id' => 94,
    'role' => 'employee',
    'name' => 'MUTHUSELVI S'
];

$controller = new RegularizationController($db, 'GET', null, $user);

// We need to capture the output of Response::json because it exits.
ob_start();
$controller->processRequest();
$output = ob_get_clean();
echo "OUTPUT:\n" . $output;
