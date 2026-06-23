<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

// Remove any stray Food-related categories that should no longer exist
$db->exec("DELETE FROM allowance_categories WHERE name LIKE 'Food%'");

// Show what remains
$stmt = $db->query("SELECT id, name, is_active FROM allowance_categories ORDER BY id");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Current allowance categories:\n";
foreach ($rows as $r) {
    echo "  [" . $r['id'] . "] " . $r['name'] . " - " . ($r['is_active'] ? 'ACTIVE' : 'inactive') . "\n";
}
echo "\nTotal: " . count($rows) . "\n";
