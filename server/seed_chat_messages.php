<?php
require_once __DIR__ . '/config/database.php';

$db = (new Database())->getConnection();
$currentUser = 94; // MUTHUSELVI S

// Delete existing messages for this user to ensure the list perfectly matches the screenshot
$stmt = $db->prepare("DELETE FROM messages WHERE sender_id = :u OR recipient_id = :u");
$stmt->execute([':u' => $currentUser]);

// Messages to insert based on the screenshot
// Dates should be carefully chosen so they appear in this exact order:
// 1. THIRUMOORTHI G - Yesterday (2026-07-01)
// 2. AASWIN J S - Jun 24
// 3. PRIYA DHARSHINI S - Jun 24 (older)
// 4. DEEPAK R - Jun 24 (older still)
// 5. ROSHINI k - Jun 24 (oldest)

$messages = [
    [
        'sender_id' => 95, // THIRUMOORTHI G
        'message' => 'po da \\',
        'created_at' => '2026-07-01 10:00:00'
    ],
    [
        'sender_id' => 102, // AASWIN J S
        'message' => 'hii',
        'created_at' => '2026-06-24 15:00:00'
    ],
    [
        'sender_id' => 98, // PRIYA DHARSHINI S
        'message' => 'hi',
        'created_at' => '2026-06-24 14:00:00'
    ],
    [
        'sender_id' => 87, // DEEPAK R
        'message' => 'Hi',
        'created_at' => '2026-06-24 13:00:00'
    ],
    [
        'sender_id' => 99, // ROSHINI k
        'message' => 'hi',
        'created_at' => '2026-06-24 12:00:00'
    ]
];

$insertStmt = $db->prepare("INSERT INTO messages (sender_id, recipient_id, message, is_read, created_at) VALUES (:sender_id, :recipient_id, :message, 1, :created_at)");

foreach ($messages as $msg) {
    $insertStmt->execute([
        ':sender_id' => $msg['sender_id'],
        ':recipient_id' => $currentUser,
        ':message' => $msg['message'],
        ':created_at' => $msg['created_at']
    ]);
}

echo "Messages seeded successfully.";
?>
