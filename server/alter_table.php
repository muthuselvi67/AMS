<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $db->exec('ALTER TABLE task_handovers ADD COLUMN task_description TEXT NULL AFTER assigned_to_id');
    echo "Column added successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
