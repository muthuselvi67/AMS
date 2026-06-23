<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();

// Check columns in users table
$stmt = $db->query("DESCRIBE users");
$cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Columns in users table:\n";
foreach ($cols as $col) echo "  - $col\n";

// Add avatar column if missing
if (!in_array('avatar', $cols)) {
    $db->exec("ALTER TABLE users ADD COLUMN avatar MEDIUMTEXT NULL DEFAULT NULL");
    echo "\n✅ Added 'avatar' column to users table.\n";
} else {
    echo "\n✅ 'avatar' column already exists.\n";
}

// Test the profile update query
echo "\nTesting profile update query...\n";
try {
    $stmt = $db->prepare("UPDATE users SET name = :name, phone = :phone, phone_secondary = :phone_secondary, department = :department, position = :position, avatar = :avatar WHERE id = :id");
    echo "✅ Profile update query prepared successfully.\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
