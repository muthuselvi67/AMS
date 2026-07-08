<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    
    // Ignore errors if columns already exist
    try { $db->exec("ALTER TABLE users ADD COLUMN chat_name VARCHAR(255) NULL AFTER about"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE users ADD COLUMN chat_about VARCHAR(255) NULL AFTER chat_name"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE users ADD COLUMN chat_avatar VARCHAR(255) NULL AFTER chat_about"); } catch(Exception $e){}
    
    echo "Chat columns added successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
