<?php
$pdo = new PDO('mysql:host=localhost;dbname=lms_db;charset=utf8', 'root', '12345678');
$stmt = $pdo->query('DESCRIBE users');
foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
    echo $col['Field'] . ' (' . $col['Type'] . ")\n";
}
