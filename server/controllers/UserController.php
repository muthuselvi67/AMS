<?php

class UserController {
    private $db;
    private $requestMethod;
    private $id;
    private $user;
    private $subId;

    public function __construct($db, $requestMethod, $id, $user, $subId = null) {
        $this->db = $db;
        $this->requestMethod = $requestMethod;
        $this->id = $id;
        $this->user = $user;
        $this->subId = $subId;
    }

    public function processRequest() {
        if (!$this->user) {
            Response::json(false, "Unauthorized", null, 401);
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($this->id) {
                    $this->getUser($this->id);
                } else {
                    $this->getAllUsers();
                }
                break;
            case 'POST':
                $this->createUser();
                break;
            case 'PUT':
                if ($this->id === 'change-password' || $this->subId === 'change-password') {
                    $this->changePassword();
                } else if ($this->subId === 'profile') {
                    $this->updateProfile($this->id);
                } else {
                    $this->updateUser($this->id);
                }
                break;
            case 'DELETE':
                $this->deleteUser($this->id);
                break;
            default:
                Response::json(false, "Method not allowed", null, 405);
                break;
        }
    }

    private function getAllUsers() {
        $query = "SELECT id, name, email, role, department, position, is_active as isActive, 
                         employee_id as employeeId, joining_date as joiningDate, phone, phone_secondary as phoneSecondary,
                         salary_base as salaryBase, salary_hra as salaryHra, 
                         salary_transport as salaryTransport, salary_other as salaryOther,
                         salary_pf as salaryPf, salary_tax as salaryTax, avatar, cover_photo as coverPhoto,
                         grad_degree as gradDegree, grad_institution as gradInstitution, grad_year as gradYear, grad_gpa as gradGpa,
                         portfolio_website as portfolioWebsite, portfolio_github as portfolioGithub, portfolio_linkedin as portfolioLinkedin, portfolio_resume as portfolioResume,
                         blood_group as bloodGroup, date_of_birth as dateOfBirth, id_card_photo as idCardPhoto,
                         bank_name as bankName, account_name as accountName, account_number as accountNumber, ifsc_code as ifscCode, branch_name as branchName,
                         leave_balance_annual as leaveBalanceAnnual, leave_balance_sick as leaveBalanceSick, leave_balance_casual as leaveBalanceCasual,
                         leave_balance_maternity as leaveBalanceMaternity, leave_balance_paternity as leaveBalancePaternity, leave_balance_unpaid as leaveBalanceUnpaid
                  FROM users";
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        if ($search !== '') {
            $query .= " WHERE name LIKE :search OR email LIKE :search OR employee_id LIKE :search OR department LIKE :search OR position LIKE :search";
        }
        $stmt = $this->db->prepare($query);
        if ($search !== '') {
            $stmt->bindValue(':search', '%' . $search . '%');
        }
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Structure the response to match frontend expectations if needed, 
        // but for now, just flat is often okay if the frontend handles it.
        // However, the frontend Employees.jsx handles flat properties for most but nested for salary.
        // Let's reformat salary for the frontend.
        $formattedUsers = array_map(function($u) {
            $u['salary'] = [
                'base' => $u['salaryBase'],
                'allowances' => [
                    'hra' => $u['salaryHra'],
                    'transport' => $u['salaryTransport'],
                    'other' => $u['salaryOther']
                ],
                'deductions' => [
                    'pf' => $u['salaryPf'],
                    'tax' => $u['salaryTax']
                ]
            ];
            return $u;
        }, $users);

        Response::json(true, "Users fetched successfully", $formattedUsers, 200);
    }

    private function getUser($id) {
        $query = "SELECT id, name, email, role, department, position, is_active as isActive, 
                         employee_id as employeeId, joining_date as joiningDate, phone, phone_secondary as phoneSecondary,
                         salary_base as salaryBase, salary_hra as salaryHra, 
                         salary_transport as salaryTransport, salary_other as salaryOther,
                         salary_pf as salaryPf, salary_tax as salaryTax, avatar, cover_photo as coverPhoto,
                         grad_degree as gradDegree, grad_institution as gradInstitution, grad_year as gradYear, grad_gpa as gradGpa,
                         portfolio_website as portfolioWebsite, portfolio_github as portfolioGithub, portfolio_linkedin as portfolioLinkedin, portfolio_resume as portfolioResume,
                         blood_group as bloodGroup, date_of_birth as dateOfBirth, id_card_photo as idCardPhoto,
                         bank_name as bankName, account_name as accountName, account_number as accountNumber, ifsc_code as ifscCode, branch_name as branchName,
                         leave_balance_annual as leaveBalanceAnnual, leave_balance_sick as leaveBalanceSick, leave_balance_casual as leaveBalanceCasual,
                         leave_balance_maternity as leaveBalanceMaternity, leave_balance_paternity as leaveBalancePaternity, leave_balance_unpaid as leaveBalanceUnpaid
                  FROM users WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            $u['salary'] = [
                'base' => $u['salaryBase'],
                'allowances' => ['hra' => $u['salaryHra'], 'transport' => $u['salaryTransport'], 'other' => $u['salaryOther']],
                'deductions' => ['pf' => $u['salaryPf'], 'tax' => $u['salaryTax']]
            ];
            Response::json(true, "User fetched successfully", $u, 200);

        } else {
            Response::json(false, "User not found", null, 404);
        }
    }

    private function createUser() {
        $data = json_decode(file_get_contents("php://input"), true);
        if(!isset($data['name']) || !isset($data['email']) || !isset($data['password'])) {
            Response::json(false, "Missing required fields", null, 400);
        }

        $hash = password_hash($data['password'], PASSWORD_DEFAULT);

        $query = "INSERT INTO users (name, email, password, role, employee_id, department, position, phone, phone_secondary, joining_date, 
                                     salary_base, salary_hra, salary_transport, salary_other, salary_pf, salary_tax, blood_group, date_of_birth) 
                  VALUES (:name, :email, :password, :role, :employee_id, :department, :position, :phone, :phone_secondary, :joining_date,
                          :salary_base, :salary_hra, :salary_transport, :salary_other, :salary_pf, :salary_tax, :blood_group, :date_of_birth)";
        $stmt = $this->db->prepare($query);
        
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':password', $hash);
        $role = $data['role'] ?? 'employee';
        $stmt->bindParam(':role', $role);
        $stmt->bindParam(':employee_id', $data['employeeId']);
        $stmt->bindParam(':department', $data['department']);
        $stmt->bindParam(':position', $data['position']);
        $stmt->bindParam(':phone', $data['phone']);
        $phoneSec = $data['phoneSecondary'] ?? '';
        $stmt->bindParam(':phone_secondary', $phoneSec);
        $joiningDate = !empty($data['joiningDate']) ? $data['joiningDate'] : null;
        $stmt->bindParam(':joining_date', $joiningDate);
        
        $salary = $data['salary'] ?? [];
        $base = $salary['base'] ?? 0;
        $hra = $salary['allowances']['hra'] ?? 0;
        $transport = $salary['allowances']['transport'] ?? 0;
        $other = $salary['allowances']['other'] ?? 0;
        $pf = $salary['deductions']['pf'] ?? 0;
        $tax = $salary['deductions']['tax'] ?? 0;
        
        $stmt->bindParam(':salary_base', $base);
        $stmt->bindParam(':salary_hra', $hra);
        $stmt->bindParam(':salary_transport', $transport);
        $stmt->bindParam(':salary_other', $other);
        $stmt->bindParam(':salary_pf', $pf);
        $stmt->bindParam(':salary_tax', $tax);

        $bloodGroup = $data['bloodGroup'] ?? '';
        $stmt->bindParam(':blood_group', $bloodGroup);
        $dateOfBirth = !empty($data['dateOfBirth']) ? $data['dateOfBirth'] : null;
        $stmt->bindParam(':date_of_birth', $dateOfBirth);
        
        try {
            $stmt->execute();
            Response::json(true, "User created successfully", ["id" => $this->db->lastInsertId()], 201);
        } catch(PDOException $e) {
            Response::json(false, "Error creating user: " . $e->getMessage(), null, 500);
        }
    }

    private function updateUser($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id || !$data) Response::json(false, "Invalid request", null, 400);

        $query = "UPDATE users SET 
                    name = :name, 
                    email = :email,
                    role = :role,
                    department = :department, 
                    position = :position,
                    employee_id = :employee_id,
                    is_active = :is_active,
                    phone = :phone,
                    phone_secondary = :phone_secondary,
                    joining_date = :joining_date,
                    salary_base = :salary_base,
                    salary_hra = :salary_hra,
                    salary_transport = :salary_transport,
                    salary_other = :salary_other,
                    salary_pf = :salary_pf,
                    salary_tax = :salary_tax
                  WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':role', $data['role']);
        $stmt->bindParam(':department', $data['department']);
        $stmt->bindParam(':position', $data['position']);
        $stmt->bindParam(':employee_id', $data['employeeId']);
        $isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1;
        $stmt->bindParam(':is_active', $isActive);
        $stmt->bindParam(':phone', $data['phone']);
        $phoneSec = $data['phoneSecondary'] ?? '';
        $stmt->bindParam(':phone_secondary', $phoneSec);
        $joiningDate = !empty($data['joiningDate']) ? $data['joiningDate'] : null;
        $stmt->bindParam(':joining_date', $joiningDate);
        
        $salary = $data['salary'] ?? [];
        $base = $salary['base'] ?? 0;
        $hra = $salary['allowances']['hra'] ?? 0;
        $transport = $salary['allowances']['transport'] ?? 0;
        $other = $salary['allowances']['other'] ?? 0;
        $pf = $salary['deductions']['pf'] ?? 0;
        $tax = $salary['deductions']['tax'] ?? 0;
        
        $stmt->bindParam(':salary_base', $base);
        $stmt->bindParam(':salary_hra', $hra);
        $stmt->bindParam(':salary_transport', $transport);
        $stmt->bindParam(':salary_other', $other);
        $stmt->bindParam(':salary_pf', $pf);
        $stmt->bindParam(':salary_tax', $tax);
        $stmt->bindParam(':id', $id);

        if($stmt->execute()) {
            Response::json(true, "User updated successfully", null, 200);
        }
    }

    private function updateProfile($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id || !$data) Response::json(false, "Invalid request", null, 400);

        // Allow users to update their own profile, or let admins do it
        if ($this->user['id'] != $id && !in_array($this->user['role'], ['admin', 'hr'])) {
            Response::json(false, "Unauthorized", null, 403);
        }

        $query = "UPDATE users SET 
                    name = :name, 
                    phone = :phone,
                    phone_secondary = :phone_secondary,
                    department = :department, 
                    position = :position,
                    avatar = :avatar,
                    cover_photo = :cover_photo,
                    grad_degree = :grad_degree,
                    grad_institution = :grad_institution,
                    grad_year = :grad_year,
                    grad_gpa = :grad_gpa,
                    portfolio_website = :portfolio_website,
                    portfolio_github = :portfolio_github,
                    portfolio_linkedin = :portfolio_linkedin,
                    portfolio_resume = :portfolio_resume,
                    blood_group = :blood_group,
                    date_of_birth = :date_of_birth,
                    employee_id = :employee_id,
                    joining_date = :joining_date,
                    id_card_photo = :id_card_photo,
                    bank_name = :bank_name,
                    account_name = :account_name,
                    account_number = :account_number,
                    ifsc_code = :ifsc_code,
                    branch_name = :branch_name
                  WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':phone', $data['phone']);
        $phoneSec = $data['phoneSecondary'] ?? '';
        $stmt->bindParam(':phone_secondary', $phoneSec);
        $stmt->bindParam(':department', $data['department']);
        $stmt->bindParam(':position', $data['position']);
        $avatar = $data['avatar'] ?? null;
        $stmt->bindParam(':avatar', $avatar);
        $coverPhoto = $data['coverPhoto'] ?? null;
        $stmt->bindParam(':cover_photo', $coverPhoto);
        
        $gradDegree = $data['gradDegree'] ?? '';
        $stmt->bindParam(':grad_degree', $gradDegree);
        $gradInstitution = $data['gradInstitution'] ?? '';
        $stmt->bindParam(':grad_institution', $gradInstitution);
        $gradYear = !empty($data['gradYear']) ? (int)$data['gradYear'] : null;
        $stmt->bindParam(':grad_year', $gradYear, PDO::PARAM_INT);
        $gradGpa = $data['gradGpa'] ?? '';
        $stmt->bindParam(':grad_gpa', $gradGpa);
        
        $portfolioWebsite = $data['portfolioWebsite'] ?? '';
        $stmt->bindParam(':portfolio_website', $portfolioWebsite);
        $portfolioGithub = $data['portfolioGithub'] ?? '';
        $stmt->bindParam(':portfolio_github', $portfolioGithub);
        $portfolioLinkedin = $data['portfolioLinkedin'] ?? '';
        $stmt->bindParam(':portfolio_linkedin', $portfolioLinkedin);
        $portfolioResume = $data['portfolioResume'] ?? '';
        $stmt->bindParam(':portfolio_resume', $portfolioResume);
        
        $bloodGroup = $data['bloodGroup'] ?? '';
        $stmt->bindParam(':blood_group', $bloodGroup);
        $dateOfBirth = !empty($data['dateOfBirth']) ? $data['dateOfBirth'] : null;
        $stmt->bindParam(':date_of_birth', $dateOfBirth);

        $employeeId = !empty($data['employeeId']) ? $data['employeeId'] : null;
        $stmt->bindParam(':employee_id', $employeeId);
        $joiningDate = !empty($data['joiningDate']) ? $data['joiningDate'] : null;
        $stmt->bindParam(':joining_date', $joiningDate);
        $idCardPhoto = $data['idCardPhoto'] ?? null;
        $stmt->bindParam(':id_card_photo', $idCardPhoto);

        $bankName = $data['bankName'] ?? '';
        $stmt->bindParam(':bank_name', $bankName);
        $accountName = $data['accountName'] ?? '';
        $stmt->bindParam(':account_name', $accountName);
        $accountNumber = $data['accountNumber'] ?? '';
        $stmt->bindParam(':account_number', $accountNumber);
        $ifscCode = $data['ifscCode'] ?? '';
        $stmt->bindParam(':ifsc_code', $ifscCode);
        $branchName = $data['branchName'] ?? '';
        $stmt->bindParam(':branch_name', $branchName);
        
        $stmt->bindParam(':id', $id);

        if($stmt->execute()) {
            // Fetch updated user to return
            $q = "SELECT id, name, email, role, department, position, is_active as isActive, 
                         employee_id as employeeId, joining_date as joiningDate, phone, phone_secondary as phoneSecondary, avatar, cover_photo as coverPhoto,
                         grad_degree as gradDegree, grad_institution as gradInstitution, grad_year as gradYear, grad_gpa as gradGpa,
                         portfolio_website as portfolioWebsite, portfolio_github as portfolioGithub, portfolio_linkedin as portfolioLinkedin, portfolio_resume as portfolioResume,
                         blood_group as bloodGroup, date_of_birth as dateOfBirth, id_card_photo as idCardPhoto,
                         bank_name as bankName, account_name as accountName, account_number as accountNumber, ifsc_code as ifscCode, branch_name as branchName,
                         leave_balance_annual as leaveBalanceAnnual, leave_balance_sick as leaveBalanceSick, leave_balance_casual as leaveBalanceCasual,
                         leave_balance_maternity as leaveBalanceMaternity, leave_balance_paternity as leaveBalancePaternity, leave_balance_unpaid as leaveBalanceUnpaid
                  FROM users WHERE id = :id";
            $s = $this->db->prepare($q);
            $s->bindParam(':id', $id);
            $s->execute();
            $updatedUser = $s->fetch(PDO::FETCH_ASSOC);
            
            // We shouldn't necessarily override salary array in frontend user object,
            // but just passing back the flat info is enough for the profile page
            Response::json(true, "Profile updated successfully", ["user" => $updatedUser], 200);
        } else {
            Response::json(false, "Failed to update profile", null, 500);
        }
    }

    private function deleteUser($id) {

        if (!$id) Response::json(false, "Invalid request", null, 400);
        $query = "DELETE FROM users WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        if($stmt->execute()) {
            Response::json(true, "User deleted successfully", null, 200);
        } else {
            Response::json(false, "Failed to delete user", null, 500);
        }
    }

    private function changePassword() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['currentPassword']) || !isset($data['newPassword'])) {
            Response::json(false, "Please provide current and new passwords", null, 400);
        }

        $userId = $this->user['id'] ?? null;
        if (!$userId) {
            Response::json(false, "Unauthorized", null, 401);
        }

        $query = "SELECT password FROM users WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $userId);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            Response::json(false, "User not found", null, 404);
        }

        $dbUser = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!password_verify($data['currentPassword'], $dbUser['password'])) {
            Response::json(false, "Incorrect current password", null, 400);
        }

        $newHash = password_hash($data['newPassword'], PASSWORD_DEFAULT);
        $updateQuery = "UPDATE users SET password = :password WHERE id = :id";
        $updateStmt = $this->db->prepare($updateQuery);
        $updateStmt->bindParam(':password', $newHash);
        $updateStmt->bindParam(':id', $userId);

        if ($updateStmt->execute()) {
            Response::json(true, "Password updated successfully", null, 200);
        } else {
            Response::json(false, "Failed to update password", null, 500);
        }
    }
}

?>
