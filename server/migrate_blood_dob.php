<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

$colsToAdd = [
    'blood_group' => 'VARCHAR(10) DEFAULT ""',
    'date_of_birth' => 'DATE DEFAULT NULL'
];

foreach ($colsToAdd as $col => $type) {
    try {
        $db->exec("ALTER TABLE users ADD COLUMN $col $type");
        echo "Added column '$col' to 'users' table.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), "Duplicate column name") !== false) {
            echo "Column '$col' already exists in 'users' table.\n";
        } else {
            echo "Error adding '$col': " . $e->getMessage() . "\n";
        }
    }
}
echo "User blood group and date of birth columns migration finished.\n";
?>
