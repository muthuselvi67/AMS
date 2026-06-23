<?php
/**
 * Migration: Add WFH notification types to the notifications ENUM
 * Run this once to allow wfh_update and wfh_policy_leave notification types.
 */
date_default_timezone_set('Asia/Kolkata');
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo "Database connection failed.\n";
    exit(1);
}

try {
    $db->exec("ALTER TABLE notifications MODIFY COLUMN type ENUM(
        'leave_applied','leave_approved','leave_rejected','leave_cancelled',
        'attendance','general',
        'allowance_applied','allowance_approved','allowance_rejected','allowance',
        'wfh_update','wfh_policy_leave',
        'task_handover'
    ) DEFAULT 'general'");

    echo "[OK] notifications.type ENUM updated to include 'wfh_update' and 'wfh_policy_leave'.\n";
    echo "WFH policy auto-leave and update notifications will now save correctly.\n";
} catch (PDOException $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
}
?>
