<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $db->exec("ALTER TABLE notifications MODIFY COLUMN type ENUM(
        'leave_applied','leave_approved','leave_rejected','leave_cancelled',
        'attendance','general',
        'allowance_applied','allowance_approved','allowance_rejected','allowance',
        'wfh_update','wfh_policy_leave',
        'task_handover',
        'birthday'
    ) DEFAULT 'general'");
    echo "[OK] notifications.type ENUM updated to include 'birthday'.\n";
} catch (PDOException $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
}
?>
