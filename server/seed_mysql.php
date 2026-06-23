<?php
require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

$users = [
    ['Admin One', 'admin@lms.com', 'Admin@123', 'admin', 'A101', 'Administration', 'System Admin'],
    ['HR One', 'hr@lms.com', 'Hr@123', 'hr', 'HR101', 'Human Resources', 'HR Manager'],
    ['PM One', 'pm@lms.com', 'Pm@123', 'pm', 'PM101', 'Project Management', 'Project Manager'],
    ['Employee 1', 'employee@lms.com', 'Employee@123', 'employee', 'E1001', 'Design', 'UI/UX Designer']
];

$stmt = $db->prepare("INSERT INTO users (name, email, password, role, employee_id, department, position) VALUES (?, ?, ?, ?, ?, ?, ?)");

foreach ($users as $user) {
    // Hash password
    $hashedPassword = password_hash($user[2], PASSWORD_BCRYPT);
    try {
        $stmt->execute([
            $user[0],
            $user[1],
            $hashedPassword,
            $user[3],
            $user[4],
            $user[5],
            $user[6]
        ]);
        echo "Inserted: {$user[1]}\n";
    } catch (PDOException $e) {
        echo "Error inserting {$user[1]}: " . $e->getMessage() . "\n";
    }
}
echo "Seeding completed.\n";
?>
