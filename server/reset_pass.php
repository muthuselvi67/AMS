<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

$email = 'jamuna.ganesan@learnlike.co.in';
$newPassword = 'LL-100003';
$hash = password_hash($newPassword, PASSWORD_BCRYPT);

$stmt = $db->prepare('UPDATE users SET password = :pass WHERE email = :email');
$stmt->execute([':pass' => $hash, ':email' => $email]);

if ($stmt->rowCount() > 0) {
    echo "Password reset successfully for $email\n";
    echo "New password: $newPassword\n";
    
    // Verify it works
    $stmt2 = $db->prepare('SELECT password FROM users WHERE email = :email');
    $stmt2->execute([':email' => $email]);
    $u = $stmt2->fetch(PDO::FETCH_ASSOC);
    echo "Verify: " . (password_verify($newPassword, $u['password']) ? 'TRUE' : 'FALSE') . "\n";
} else {
    echo "No user updated for $email\n";
}
