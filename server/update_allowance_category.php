<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

// Rename "Other Allowance" back to "Food Allowance"
$stmt = $db->prepare("UPDATE allowance_categories SET name='Food Allowance', description='Daily meal allowance or team lunch reimbursement.' WHERE name='Other Allowance'");
$stmt->execute();
echo "Rows updated: " . $stmt->rowCount() . PHP_EOL;

// Show current categories
$rows = $db->query("SELECT id, name, description, max_amount, is_active FROM allowance_categories ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
echo "\nCurrent allowance_categories:\n";
foreach ($rows as $r) {
    echo "  [{$r['id']}] {$r['name']} (active={$r['is_active']}, max={$r['max_amount']})\n";
}
echo "\nDone!\n";
?>
