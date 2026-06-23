<?php
date_default_timezone_set('Asia/Kolkata');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Requirements
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/JWT.php';

// Controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/LeaveController.php';
require_once __DIR__ . '/controllers/AttendanceController.php';
require_once __DIR__ . '/controllers/HolidayController.php';
require_once __DIR__ . '/controllers/AppraisalController.php';
require_once __DIR__ . '/controllers/PMAppraisalController.php';
require_once __DIR__ . '/controllers/ProjectController.php';
require_once __DIR__ . '/controllers/AllowanceController.php';
require_once __DIR__ . '/controllers/PayrollController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/AnnouncementController.php';
require_once __DIR__ . '/controllers/DocumentController.php';
require_once __DIR__ . '/controllers/HelpdeskController.php';
require_once __DIR__ . '/controllers/WFHController.php';
require_once __DIR__ . '/controllers/TaskHandoverController.php';
require_once __DIR__ . '/controllers/ChatController.php';



$database = new Database();
$db = $database->getConnection();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace('/server', '', $uri); // Handle cases where /server is in path
$uri = explode('/', trim($uri, '/'));

// Check for /api prefix
if (isset($uri[0]) && $uri[0] === 'api') {
    array_shift($uri);
}

$resource = $uri[0] ?? null;
$id = $uri[1] ?? null;
$subId = $uri[2] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

// Authentication Middleware
$user = null;
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $user = JWT::decode($matches[1]);
}

// Special case: Auth/Login (doesn't need token)
if ($resource === 'auth' && isset($uri[1]) && $uri[1] === 'login' && $method === 'POST') {
    $controller = new AuthController($db, $method, 'login');
    $controller->processRequest();
    exit;
}


// Resource Routing
switch ($resource) {
    case 'users':
        $controller = new UserController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'leaves':
    case 'leave-types':
        $controller = new LeaveController($db, $method, $id, $user, $subId);
        $controller->processRequest($resource);
        break;

    case 'attendance':
        $controller = new AttendanceController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'holidays':
        $controller = new HolidayController($db, $method, $id, $user);
        $controller->processRequest();
        break;
    case 'appraisals':
        $controller = new AppraisalController($db, $method, $id, $user);
        $controller->processRequest();
        break;
    case 'pmappraisals':
        $controller = new PMAppraisalController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'projects':
    case 'tasks':
    case 'time-logs':
    case 'timelogs':
    case 'risks':
    case 'issues':
        $controller = new ProjectController($db, $method, $id, $user, $subId);
        $controller->processRequest($resource);
        break;
    case 'allowances':
    case 'allowance-categories':
        $controller = new AllowanceController($db, $method, $id, $user, $subId);
        $controller->processRequest($resource);
        break;
    case 'payroll':
        $controller = new PayrollController($db, $method, $id, $user, $subId);
        $controller->processRequest($resource);
        break;
    case 'reports':
        require_once __DIR__ . '/controllers/ReportController.php';
        $controller = new ReportController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'notifications':
        $controller = new NotificationController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'announcements':
        $controller = new AnnouncementController($db, $method, $id, $user);
        $controller->processRequest();
        break;
    case 'documents':
        $controller = new DocumentController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'helpdesk':
        $controller = new HelpdeskController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'assets':
        require_once __DIR__ . '/controllers/AssetController.php';
        $controller = new AssetController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'lifecycle':
        require_once __DIR__ . '/controllers/LifecycleController.php';
        $controller = new LifecycleController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'wfh-updates':
        $controller = new WFHController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;
    case 'task-handovers':
        $controller = new TaskHandoverController($db, $method, $id, $user);
        $controller->processRequest();
        break;
    case 'chat':
        $controller = new ChatController($db, $method, $id, $user, $subId);
        $controller->processRequest();
        break;




    default:
        Response::json(false, "Invalid endpoint: " . ($resource ?? 'root'), ["uri" => $uri], 404);
        break;
}