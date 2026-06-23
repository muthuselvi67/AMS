<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

// Show current state
$stmt = $db->query("SELECT id, name, is_active FROM allowance_categories");
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Before deletion:\n";
foreach ($all as $c) {
    echo "  [{$c['id']}] {$c['name']} - " . ($c['is_active'] ? 'ACTIVE' : 'inactive') . "\n";
}

// Delete all inactive categories (Food & Meals, Medical Allowance, Internet Allowance, etc.)
// Note: only safe to delete if no allowance_requests reference them
$stmt = $db->prepare("DELETE FROM allowance_categories WHERE is_active = 0");
$stmt->execute();
$deleted = $stmt->rowCount();
echo "\nDeleted {$deleted} inactive categories.\n";

// Show final state
$stmt = $db->query("SELECT id, name, is_active FROM allowance_categories");
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\nFinal categories:\n";
foreach ($all as $c) {
    echo "  [{$c['id']}] {$c['name']} - ACTIVE\n";
}
echo "\nDone!\n";
?>
