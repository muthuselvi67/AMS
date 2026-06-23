<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

$email = 'jamuna.ganesan@learnlike.co.in';
$stmt = $db->prepare('SELECT id, email, name, password, role FROM users WHERE email = :email');
$stmt->execute([':email' => $email]);
$u = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$u) {
    echo "User not found: $email\n";
    // List all users
    $all = $db->query('SELECT id, email, name, role FROM users ORDER BY id LIMIT 20');
    echo "\nAll users:\n";
    while ($r = $all->fetch(PDO::FETCH_ASSOC)) {
        echo "  ID={$r['id']} | {$r['email']} | {$r['name']} | {$r['role']}\n";
    }
} else {
    echo "Found: {$u['name']} ({$u['email']}) Role: {$u['role']}\n";
    echo "Hash: {$u['password']}\n";
    echo "Verify 'LL-100003': " . (password_verify('LL-100003', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
    echo "Verify 'password': " . (password_verify('password', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
    echo "Verify '123456': " . (password_verify('123456', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
    echo "Verify 'Admin@123': " . (password_verify('Admin@123', $u['password']) ? 'TRUE' : 'FALSE') . "\n";
}
