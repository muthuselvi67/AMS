<?php

class Response {
    public static function json($status, $message, $data = null, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        
        $response = array(
            "status" => $status,
            "message" => $message
        );
        
        if ($data !== null) {
            $response["data"] = $data;
        }
        
        echo json_encode($response);
        exit();
    }
}
