<?php
header("Content-Type: application/json");
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
echo json_encode([
    'raw_input' => $raw,
    'decoded' => $data,
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'none',
]);
?>
