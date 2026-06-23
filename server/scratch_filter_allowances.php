<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

// First show current state
$stmt = $db->query("SELECT id, name, is_active FROM allowance_categories");
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Current categories:\n";
foreach ($all as $c) {
    echo "  [{$c['id']}] {$c['name']} - is_active={$c['is_active']}\n";
}

// Deactivate everything that is NOT exactly Travel Allowance or Food Allowance
$stmt = $db->prepare("UPDATE allowance_categories 
    SET is_active = 0 
    WHERE name NOT IN ('Travel Allowance', 'Food Allowance')");
$stmt->execute();

$affected = $stmt->rowCount();
echo "\nDeactivated {$affected} categories.\n";

// Show updated state
$stmt = $db->query("SELECT id, name, is_active FROM allowance_categories");
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\nUpdated categories:\n";
foreach ($all as $c) {
    $status = $c['is_active'] ? 'ACTIVE' : 'inactive';
    echo "  [{$c['id']}] {$c['name']} - {$status}\n";
}
