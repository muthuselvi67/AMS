<?php
try {
    $db = new PDO('mysql:host=localhost;dbname=lms_db', 'root', '12345678');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Attempt to add chat_name
    try { $db->exec("ALTER TABLE users ADD COLUMN chat_name VARCHAR(255) NULL"); } catch (Exception $e) { echo "Err chat_name: " . $e->getMessage() . "\n"; }
    // Attempt to add chat_about
    try { $db->exec("ALTER TABLE users ADD COLUMN chat_about VARCHAR(255) NULL"); } catch (Exception $e) { echo "Err chat_about: " . $e->getMessage() . "\n"; }
    // Attempt to add chat_avatar
    try { $db->exec("ALTER TABLE users ADD COLUMN chat_avatar VARCHAR(255) NULL"); } catch (Exception $e) { echo "Err chat_avatar: " . $e->getMessage() . "\n"; }
    
    // Also try to add 'about' since it might have failed previously
    try { $db->exec("ALTER TABLE users ADD COLUMN about VARCHAR(255) NULL"); } catch (Exception $e) { echo "Err about: " . $e->getMessage() . "\n"; }

    echo "Columns added (or attempted).\n";
} catch (Exception $e) {
    echo "DB Connection Error: " . $e->getMessage();
}
