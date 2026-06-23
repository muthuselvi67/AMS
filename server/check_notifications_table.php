<?php
$conn = new PDO("mysql:host=localhost;dbname=lms_db", "root", "12345678");
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Check columns in notifications table
$stmt = $conn->query("DESCRIBE notifications");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "=== notifications table columns ===\n";
foreach ($cols as $c) {
    echo $c['Field'] . ' | ' . $c['Type'] . ' | Null:' . $c['Null'] . ' | Default:' . $c['Default'] . "\n";
}

// Check if updated_at exists
$colNames = array_column($cols, 'Field');
if (!in_array('updated_at', $colNames)) {
    echo "\n[!] updated_at column MISSING - adding it...\n";
    $conn->exec("ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    echo "[+] updated_at column added.\n";
} else {
    echo "\n[OK] updated_at column exists.\n";
}

// Test a sample notification insert
echo "\n=== Testing notification insert ===\n";
$stmt = $conn->prepare("INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at) VALUES (1, 'Test Notification', 'This is a test', 'general', 0, 'test', 0, NOW(), NOW())");
$stmt->execute();
$testId = $conn->lastInsertId();
echo "[OK] Inserted test notification with ID: $testId\n";

// Clean up
$conn->exec("DELETE FROM notifications WHERE id = $testId");
echo "[OK] Cleaned up test notification.\n";
