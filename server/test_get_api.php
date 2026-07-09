<?php
$token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OTQsInJvbGUiOiJlbXBsb3llZSIsImVtYWlsIjoibXV0aHVzZWx2aTEyM0BnbWFpbC5jb20ifQ.something"; 
// Wait, I can't forge a JWT easily without the secret.
// I will just use the backend router directly in a script, bypassing HTTP.

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/controllers/RegularizationController.php';

$db = (new Database())->getConnection();
$user = [
    'id' => 94,
    'role' => 'employee'
];

$controller = new RegularizationController($db, 'GET', null, $user);

ob_start();
$controller->processRequest();
$output = ob_get_clean();

file_put_contents(__DIR__ . '/debug_get.txt', $output);
echo "Done";
