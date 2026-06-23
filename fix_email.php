<?php
require_once __DIR__ . '/server/config/database.php';
$db = (new Database())->getConnection();

$stmt = $db->prepare("UPDATE users SET email = :new_email WHERE email = :old_email");
$stmt->execute([
    ':new_email' => 'priyasundar1777@gmail.com',
    ':old_email' => 'priyasundarrajan1777@gmail.com'
]);

echo "Rows updated: " . $stmt->rowCount() . "\n";
echo "Done.\n";
