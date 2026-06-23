<?php
require_once __DIR__ . '/server/config/database.php';
$db = (new Database())->getConnection();

$email = 'jamuna.ganesan@gmail.com';
$password = '12345678';
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// It seems there are multiple possible emails that she might have been under, so I'll check 'jamuna.ganesan@learnlike.co.in' or 'jamuna.ganesan@gmail.com'
// Since she might be an existing user or newly added, let's try updating her existing record based on name or previous email.
$stmt = $db->prepare("UPDATE users SET email = :new_email, password = :password, role = 'pm' WHERE name LIKE '%jamuna%' OR email LIKE '%jamuna%'");
$stmt->execute([
    ':new_email' => $email,
    ':password' => $hashedPassword
]);

echo "Rows updated: " . $stmt->rowCount() . "\n";
echo "Done.\n";
