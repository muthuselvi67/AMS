<?php
require 'config/database.php';
$db = (new Database())->getConnection();

// Check current password hash for muthuselvi
$stmt = $db->prepare("SELECT id, name, email, password FROM users WHERE email = :email");
$stmt->execute([':email' => 'muthuselvi@learnlike.in']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo "User found: " . $user['name'] . "\n";
    echo "Email: " . $user['email'] . "\n";
    echo "Password hash: " . $user['password'] . "\n";
    
    // Test if 87654321 matches
    $testPassword = '87654321';
    $matches = password_verify($testPassword, $user['password']);
    echo "Password '87654321' matches: " . ($matches ? 'YES' : 'NO') . "\n";
    
    if (!$matches) {
        // Reset it to 87654321
        $newHash = password_hash($testPassword, PASSWORD_DEFAULT);
        $update = $db->prepare("UPDATE users SET password = :pass WHERE email = :email");
        $update->execute([':pass' => $newHash, ':email' => 'muthuselvi@learnlike.in']);
        echo "\nPassword RESET to '87654321' successfully.\n";
        echo "New hash: " . $newHash . "\n";
    }
} else {
    echo "User NOT found with email: muthuselvi@learnlike.in\n";
    
    // List all users
    $stmt2 = $db->query("SELECT id, name, email FROM users LIMIT 20");
    $users = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "\nAll users:\n";
    foreach ($users as $u) {
        echo "  [{$u['id']}] {$u['name']} - {$u['email']}\n";
    }
}
