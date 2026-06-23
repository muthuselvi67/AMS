<?php
require_once 'config/database.php';
$db = (new Database())->getConnection();

$email = 'Padmesh@learnlike.in';
$password = '12345678';
$hash = password_hash($password, PASSWORD_BCRYPT);

// Check if user exists
$stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
$stmt->bindParam(':email', $email);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    // Update password
    $updateStmt = $db->prepare("UPDATE users SET password = :hash WHERE email = :email");
    $updateStmt->bindParam(':hash', $hash);
    $updateStmt->bindParam(':email', $email);
    $updateStmt->execute();
    echo "Updated existing user password.";
} else {
    // Insert new user
    $insertStmt = $db->prepare("INSERT INTO users (name, email, password, role, employee_id, department, position) VALUES ('Padmesh', :email, :hash, 'admin', 'ADM007', 'Administration', 'Admin')");
    $insertStmt->bindParam(':email', $email);
    $insertStmt->bindParam(':hash', $hash);
    $insertStmt->execute();
    echo "Inserted user successfully.";
}
?>
