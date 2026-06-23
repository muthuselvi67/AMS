<?php
$pdo = new PDO('mysql:host=localhost;dbname=lms', 'root', '');
$pdo->exec("ALTER TABLE task_handovers ADD COLUMN task_description TEXT DEFAULT NULL");
echo "Done";
