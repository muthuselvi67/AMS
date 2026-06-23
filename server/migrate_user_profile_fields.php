<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

$colsToAdd = [
    'grad_degree' => 'VARCHAR(255) DEFAULT ""',
    'grad_institution' => 'VARCHAR(255) DEFAULT ""',
    'grad_year' => 'INT DEFAULT NULL',
    'grad_gpa' => 'VARCHAR(50) DEFAULT ""',
    'portfolio_website' => 'VARCHAR(255) DEFAULT ""',
    'portfolio_github' => 'VARCHAR(255) DEFAULT ""',
    'portfolio_linkedin' => 'VARCHAR(255) DEFAULT ""',
    'portfolio_resume' => 'VARCHAR(255) DEFAULT ""'
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
echo "User profile columns migration finished.\n";
?>
