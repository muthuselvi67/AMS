<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

// Check users table columns
$cols = $db->query('DESCRIBE users')->fetchAll(PDO::FETCH_ASSOC);
echo "Users table columns:\n";
foreach ($cols as $col) {
    echo "  " . $col['Field'] . " (" . $col['Type'] . ")\n";
}

// Test profile update for a user
$stmt = $db->query("SELECT id, name, phone, phone_secondary, department, position FROM users LIMIT 3");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\nSample user data:\n";
foreach ($users as $u) {
    echo "  [{$u['id']}] {$u['name']} | phone={$u['phone']} | phone2={$u['phone_secondary']}\n";
}
?>
