<?php
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Read the schema file
    $schemaFile = __DIR__ . '/database/timesheets_schema.sql';
    if (!file_exists($schemaFile)) {
        die("Error: Schema file not found at $schemaFile\n");
    }
    
    $sql = file_get_contents($schemaFile);
    
    // Execute the SQL
    $db->exec($sql);
    echo "Timesheets table created successfully.\n";
    
} catch(PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "Timesheets table already exists.\n";
    } else {
        echo "Error creating table: " . $e->getMessage() . "\n";
    }
}
