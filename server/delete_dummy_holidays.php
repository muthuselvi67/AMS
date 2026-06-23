<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $db->exec("DELETE FROM holidays WHERE name LIKE '%sunday%' OR name LIKE '%Q2 Plan%'");
    echo "Deleted successfully";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
