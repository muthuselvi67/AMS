<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    echo "Altering attendances table to add employee_name column...\n";
    // Check if column already exists
    $check = $db->query("SHOW COLUMNS FROM attendances LIKE 'employee_name'");
    if ($check->rowCount() == 0) {
        $sql = "ALTER TABLE attendances ADD COLUMN employee_name VARCHAR(255) NULL AFTER employee_id";
        $db->exec($sql);
        echo "Column employee_name added successfully after employee_id.\n";
    } else {
        echo "Column employee_name already exists.\n";
    }
    
    // Backfill existing rows with employee names from users table
    echo "Backfilling employee_name for existing records...\n";
    $backfillSql = "UPDATE attendances a JOIN users u ON a.employee_id = u.id SET a.employee_name = u.name WHERE a.employee_name IS NULL OR a.employee_name = ''";
    $affected = $db->exec($backfillSql);
    echo "Backfilled $affected records.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
