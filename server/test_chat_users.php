<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $currentUserId = 1;

    $query = "
        SELECT 
            u.id, 
            COALESCE(u.chat_name, u.name) as name, 
            u.email, 
            COALESCE(u.chat_avatar, u.avatar) as avatar, 
            u.role, 
            u.department, 
            u.position,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.recipient_id = :current_user_id AND m.is_read = 0) as unread_count,
            (SELECT m.message FROM messages m 
             WHERE (m.sender_id = u.id AND m.recipient_id = :current_user_id) 
                OR (m.sender_id = :current_user_id AND m.recipient_id = u.id)
             ORDER BY m.created_at DESC LIMIT 1) as last_message,
            (SELECT m.created_at FROM messages m 
             WHERE (m.sender_id = u.id AND m.recipient_id = :current_user_id) 
                OR (m.sender_id = :current_user_id AND m.recipient_id = u.id)
             ORDER BY m.created_at DESC LIMIT 1) as last_message_time
        FROM users u
        WHERE u.id != :current_user_id AND u.is_active = 1
        ORDER BY last_message_time DESC, u.name ASC
    ";

    $stmt = $db->prepare($query);
    $stmt->execute([':current_user_id' => $currentUserId]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "SUCCESS: " . json_encode($users);
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage();
}
