<?php
$conn = new PDO("mysql:host=localhost;dbname=lms_db", "root", "12345678");
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== 1. Checking admin/hr users ===\n";
$stmt = $conn->query("SELECT id, name, role FROM users WHERE role IN ('admin','hr') AND is_active = 1");
$admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($admins as $a) {
    echo "  ID={$a['id']} | {$a['name']} | {$a['role']}\n";
}

echo "\n=== 2. Current notifications count ===\n";
$stmt = $conn->query("SELECT COUNT(*) as cnt FROM notifications");
echo "  Total rows: " . $stmt->fetchColumn() . "\n";

echo "\n=== 3. Inserting a TEST notification for each admin/hr ===\n";
$notifStmt = $conn->prepare(
    "INSERT INTO notifications (recipient_id, title, message, type, related_id, related_model, is_read, created_at, updated_at)
     VALUES (:rid, :title, :msg, :type, :rel_id, :rel_model, 0, NOW(), NOW())"
);
foreach ($admins as $a) {
    $notifStmt->execute([
        ':rid'       => $a['id'],
        ':title'     => 'New Leave Request',
        ':msg'       => 'Test: Priya Dharshini has submitted a leave request.',
        ':type'      => 'leave_applied',
        ':rel_id'    => 1,
        ':rel_model' => 'leave_requests',
    ]);
    echo "  [OK] Inserted notification for {$a['name']} (ID={$a['id']})\n";
}

echo "\n=== 4. Notifications now in DB for admins ===\n";
foreach ($admins as $a) {
    $stmt = $conn->prepare("SELECT id, title, type, is_read, created_at FROM notifications WHERE recipient_id = :rid ORDER BY id DESC LIMIT 5");
    $stmt->execute([':rid' => $a['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "  User {$a['name']} ({$a['id']}) has " . count($rows) . " notification(s):\n";
    foreach ($rows as $r) {
        echo "    - [{$r['id']}] {$r['title']} | type={$r['type']} | read={$r['is_read']} | at={$r['created_at']}\n";
    }
}

echo "\n=== 5. Checking type enum - does 'leave_applied' exist? ===\n";
$stmt = $conn->query("SHOW COLUMNS FROM notifications LIKE 'type'");
$col = $stmt->fetch(PDO::FETCH_ASSOC);
echo "  type column: " . $col['Type'] . "\n";
echo "\nDone! Check admin notifications bell now.\n";
