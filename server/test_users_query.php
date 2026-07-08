<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $query = "
        SELECT 
            u.id, 
            COALESCE(u.chat_name, u.name) as name, 
            u.email, 
            COALESCE(u.chat_avatar, u.avatar) as avatar, 
            u.role, 
            u.department, 
            u.position
        FROM users u
        LIMIT 1
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "SUCCESS: " . json_encode($result);
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
