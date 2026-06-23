<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->prepare('SELECT email, password FROM users WHERE email = :email');
$stmt->execute([':email' => 'admin@lms.com']);
$u = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Email: " . $u['email'] . "\n";
echo "Hash: " . $u['password'] . "\n";
echo "Verify 'Admin@123': " . (password_verify('Admin@123', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
echo "Verify 'admin123': " . (password_verify('admin123', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
echo "Verify 'password': " . (password_verify('password', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
echo "Verify '12345678': " . (password_verify('12345678', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
