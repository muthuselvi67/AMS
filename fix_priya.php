<?php
require_once __DIR__ . '/server/config/database.php';
$db = (new Database())->getConnection();

$email = 'priyasundarrajan1777@gmail.com';
$password = '12345678';
$hashed = password_hash($password, PASSWORD_DEFAULT);

// Update name 'PRIYA DHARSHINI S' to have the email and password the user wants
$stmt = $db->prepare("UPDATE users SET email = :email, password = :password WHERE name LIKE '%PRIYA DHARSHINI%'");
$stmt->execute([
    ':email' => $email,
    ':password' => $hashed
]);

echo "Rows updated: " . $stmt->rowCount() . "\n";

// Print updated details
$query = $db->query("SELECT name, email FROM users WHERE name LIKE '%priya%' OR email LIKE '%priya%'");
while($row = $query->fetch(PDO::FETCH_ASSOC)) {
    echo "Found user: " . $row['name'] . " with email: " . $row['email'] . "\n";
}
?>
