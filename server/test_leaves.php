<?php
require 'config/database.php';
require 'controllers/LeaveController.php';

class Response {
    public static function json($status, $message, $data, $code) {
        echo json_encode(['status' => $status, 'data' => $data]);
    }
}

$db = (new Database())->connect();
$user = ['id' => 1, 'role' => 'admin'];
$controller = new LeaveController($db, 'GET', null, $user);
$_GET['status'] = 'all';
$controller->processRequest('leaves');
