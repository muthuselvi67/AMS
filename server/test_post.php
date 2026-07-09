<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$input = [
    'date' => '2026-07-08',
    'check_in_time' => '2026-07-08 09:30:00',
    'check_out_time' => '2026-07-08 21:30:00',
    'reason' => 'check out'
];
// Hack to simulate php://input
class MockRegularizationController {
    public function __construct() {
        require_once __DIR__ . '/config/database.php';
        require_once __DIR__ . '/utils/Response.php';
        require_once __DIR__ . '/controllers/RegularizationController.php';
        $this->db = (new Database())->getConnection();
        $this->user = ['id' => 94, 'role' => 'employee'];
        $this->controller = new RegularizationController($this->db, 'POST', null, $this->user);
    }
    public function run() {
        // Since we can't easily overwrite php://input, let's see if the text is in the file
        echo "File content of RegularizationController:\n";
        $content = file_get_contents(__DIR__ . '/controllers/RegularizationController.php');
        if (strpos($content, 'already exists for this date') !== false) {
            echo "STRING FOUND IN FILE!\n";
        } else {
            echo "String NOT found in file.\n";
        }
    }
}

(new MockRegularizationController())->run();
