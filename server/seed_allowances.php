<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$categories = [
    [
        'name' => 'Travel Allowance',
        'max_amount' => 500.00,
        'description' => 'Reimbursement for travel expenses, flights, and taxis.',
        'requires_document' => 0
    ],
    [
        'name' => 'Food Allowance',
        'max_amount' => 100.00,
        'description' => 'Daily meal allowance or team lunch reimbursement.',
        'requires_document' => 0
    ],
];

$query = "INSERT INTO allowance_categories (name, description, max_amount, requires_document) VALUES (:name, :description, :max_amount, :requires_document)";
$stmt = $db->prepare($query);

$db->exec("SET FOREIGN_KEY_CHECKS=0");
$db->exec("TRUNCATE TABLE allowance_categories");
$db->exec("SET FOREIGN_KEY_CHECKS=1");

foreach ($categories as $cat) {
    try {
        $stmt->bindParam(':name', $cat['name']);
        $stmt->bindParam(':description', $cat['description']);
        $stmt->bindParam(':max_amount', $cat['max_amount']);
        $stmt->bindParam(':requires_document', $cat['requires_document']);
        $stmt->execute();
        echo "Inserted {$cat['name']}\n";
    } catch (PDOException $e) {
        echo "Failed to insert {$cat['name']}: " . $e->getMessage() . "\n";
    }
}
echo "Seeding completed!\n";
?>
