<?php
require_once __DIR__ . '/config/database.php';

$db = (new Database())->getConnection();

$query = "
CREATE TABLE IF NOT EXISTS `chat_poll_votes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `option_index` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vote` (`message_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $db->exec($query);
    echo "chat_poll_votes table created successfully.\n";
} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage() . "\n";
}
?>
