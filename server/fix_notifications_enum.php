<?php
$conn = new PDO("mysql:host=localhost;dbname=lms_db", "root", "12345678");
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Add 'allowance' type to the enum if not already there
$conn->exec("ALTER TABLE notifications MODIFY COLUMN type ENUM(
    'leave_applied','leave_approved','leave_rejected','leave_cancelled',
    'attendance','general',
    'allowance_applied','allowance_approved','allowance_rejected','allowance'
) DEFAULT 'general'");

echo "[OK] notifications.type enum updated to include 'allowance'.\n";
echo "Now notifications will be saved correctly when employees apply for allowances.\n";
