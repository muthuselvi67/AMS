<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

// List all users
$stmt = $db->prepare('SELECT id, name, email, role FROM users ORDER BY role, name');
$stmt->execute();
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== ALL USERS ===\n";
foreach ($users as $u) {
    echo "ID: {$u['id']} | Role: {$u['role']} | Name: {$u['name']} | Email: {$u['email']}\n";
}

// Reset password for Kamalabharathi to 12345678
$newHash = password_hash('12345678', PASSWORD_DEFAULT);
$stmt2 = $db->prepare("UPDATE users SET password = :pwd WHERE email = :email");
$stmt2->execute([':pwd' => $newHash, ':email' => 'Kamalabharathi@learnlike.in']);
$affected = $stmt2->rowCount();

echo "\n=== PASSWORD RESET ===\n";
if ($affected > 0) {
    echo "Password for 'Kamalabharathi@learnlike.in' reset to '12345678' successfully!\n";
} else {
    echo "User 'Kamalabharathi@learnlike.in' NOT FOUND. Check email list above.\n";
    
    // Try case-insensitive search
    $stmt3 = $db->prepare("SELECT id, name, email FROM users WHERE LOWER(email) LIKE '%kamalabharathi%'");
    $stmt3->execute();
    $found = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    if ($found) {
        echo "Similar emails found:\n";
        foreach ($found as $f) {
            echo "  ID: {$f['id']} | Name: {$f['name']} | Email: {$f['email']}\n";
        }
        // Reset by ID
        foreach ($found as $f) {
            $stmt4 = $db->prepare("UPDATE users SET password = :pwd WHERE id = :id");
            $stmt4->execute([':pwd' => $newHash, ':id' => $f['id']]);
            echo "  -> Reset password for {$f['email']} (ID: {$f['id']}) to '12345678'\n";
        }
    }
}

// Also reset all employee passwords to 12345678 for convenience
echo "\n=== RESET ALL EMPLOYEE PASSWORDS TO 12345678 ===\n";
$stmt5 = $db->prepare("UPDATE users SET password = :pwd WHERE role = 'employee'");
$stmt5->execute([':pwd' => $newHash]);
echo "Reset " . $stmt5->rowCount() . " employee(s) passwords to '12345678'\n";

echo "\nDone!\n";
?>
