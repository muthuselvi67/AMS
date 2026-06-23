<?php

class AuthController {
    private $db;
    private $requestMethod;
    private $id;

    public function __construct($db, $requestMethod, $id) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
    }

    public function processRequest() {
        if ($this->requestMethod === 'POST' && $this->id === 'login') {
            $this->login();
        } else {
            Response::json(false, "Not Found", null, 404);
        }
    }

    private function login() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['email']) || !isset($data['password'])) {
            Response::json(false, "Please provide email and password", null, 400);
        }

        $query = "SELECT * FROM users WHERE email = :email LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':email', $data['email']);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (password_verify($data['password'], $user['password'])) {
                // Force lowercase role and default to employee
                $role = !empty($user['role']) ? strtolower($user['role']) : 'employee';
                
                $payload = [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'role' => $role,
                    'name' => $user['name']
                ];
                $token = JWT::encode($payload);

                // Prepare user object for frontend
                unset($user['password']);
                $user['role'] = $role; // Explicitly set role
                $user['token'] = $token;
                
                // Map leave balance properties for frontend context
                $user['leaveBalance'] = [
                    'annual' => isset($user['leave_balance_annual']) ? (int)$user['leave_balance_annual'] : 0,
                    'sick' => isset($user['leave_balance_sick']) ? (int)$user['leave_balance_sick'] : 0,
                    'casual' => isset($user['leave_balance_casual']) ? (int)$user['leave_balance_casual'] : 0,
                    'paternity' => isset($user['leave_balance_paternity']) ? (int)$user['leave_balance_paternity'] : 0,
                    'maternity' => isset($user['leave_balance_maternity']) ? (int)$user['leave_balance_maternity'] : 0,
                    'unpaid' => isset($user['leave_balance_unpaid']) ? (int)$user['leave_balance_unpaid'] : 0,
                    'floating' => isset($user['leave_balance_floating']) ? (int)$user['leave_balance_floating'] : 0,
                    'vacation' => isset($user['leave_balance_vacation']) ? (int)$user['leave_balance_vacation'] : 0,
                    'halfday' => isset($user['leave_balance_halfday']) ? (int)$user['leave_balance_halfday'] : 0
                ];

                Response::json(true, "Login successful", $user, 200);
            } else {


                Response::json(false, "Invalid credentials", null, 401);
            }
        } else {
            Response::json(false, "Invalid credentials", null, 401);
        }
    }
}
