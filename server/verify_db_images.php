<?php
$pdo = new PDO('mysql:host=localhost;dbname=lms_db;charset=utf8', 'root', '12345678');
$stmt = $pdo->query('SELECT id, name, LEFT(avatar,35) as avatar_start, LEFT(cover_photo,35) as cover_start FROM users WHERE avatar IS NOT NULL OR cover_photo IS NOT NULL');
foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    echo "User #" . $r['id'] . " (" . $r['name'] . ")\n";
    echo "  avatar      : " . $r['avatar_start'] . "\n";
    echo "  cover_photo : " . $r['cover_start'] . "\n\n";
}
