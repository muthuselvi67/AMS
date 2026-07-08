<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("DELETE FROM leave_types WHERE name = 'Leave' OR code = 'LEAVE'");
$stmt->execute();

echo "Deleted generic 'Leave' type successfully.\n";
