<?php

class ProjectController {
    private $db;
    private $method;
    private $id;
    private $user;
    private $subId;

    public function __construct($db, $method, $id, $user = null, $subId = null) {
        $this->db      = $db;
        $this->method  = $method;
        $this->id      = $id;
        $this->user    = $user;
        $this->subId   = $subId;
    }

    public function processRequest($resource) {
        if (!$this->user) {
            Response::json(false, 'Unauthorized', null, 401);
            return;
        }

        switch ($resource) {
            case 'projects':       $this->handleProjects();   break;
            case 'tasks':          $this->handleTasks();      break;
            case 'time-logs':
            case 'timelogs':       $this->handleTimeLogs();   break;
            case 'risks':          $this->handleRisks();      break;
            case 'issues':         $this->handleIssues();     break;
            default:
                Response::json(false, 'Unknown resource', null, 404);
        }
    }

    /* ═══════════════════════════════  PROJECTS  ═══════════════════════════════ */

    private function handleProjects() {
        switch ($this->method) {
            case 'GET':
                if ($this->id) $this->getProject($this->id);
                else           $this->getProjects();
                break;
            case 'POST':   $this->createProject();                break;
            case 'PUT':    $this->updateProject($this->id);       break;
            case 'DELETE': $this->deleteProject($this->id);       break;
            default: Response::json(false, 'Method not allowed', null, 405);
        }
    }

    private function getProjects() {
        $status   = $_GET['status']   ?? null;
        $priority = $_GET['priority'] ?? null;

        $where  = [];
        $params = [];

        // Non-admin / non-HR: only own / created / team projects
        if (!in_array($this->user['role'], ['admin', 'hr'])) {
            $where[]  = '(p.assigned_pm_id = :uid OR p.created_by_id = :uid3 OR EXISTS(SELECT 1 FROM project_teams pt WHERE pt.project_id = p.id AND pt.user_id = :uid2))';
            $params[':uid']  = $this->user['id'];
            $params[':uid2'] = $this->user['id'];
            $params[':uid3'] = $this->user['id'];
        }

        if ($status)   { $where[] = 'p.status = :status';     $params[':status']   = $status; }
        if ($priority) { $where[] = 'p.priority = :priority'; $params[':priority'] = $priority; }

        $sql = "SELECT p.*,
                       u.name AS pm_name, u.email AS pm_email
                FROM projects p
                LEFT JOIN users u ON u.id = p.assigned_pm_id"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY p.created_at DESC';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $projects = array_map([$this, 'formatProject'], $rows);
        Response::json(true, 'Projects fetched', ['projects' => $projects]);
    }

    private function getProject($id) {
        $stmt = $this->db->prepare(
            "SELECT p.*, u.name AS pm_name, u.email AS pm_email
             FROM projects p
             LEFT JOIN users u ON u.id = p.assigned_pm_id
             WHERE p.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) { Response::json(false, 'Project not found', null, 404); return; }
        Response::json(true, 'Project fetched', ['project' => $this->formatProject($row)]);
    }

    private function createProject() {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = $data['name'] ?? null;
        if (!$name) { Response::json(false, 'Project name is required', null, 400); return; }

        $projectId = 'PROJ-' . strtoupper(substr(md5(uniqid()), 0, 6));
        $sql = "INSERT INTO projects
                    (project_id, name, client_name, start_date, end_date, budget, priority,
                     description, status, assigned_pm_id, tags, created_by_id)
                VALUES
                    (:pid, :name, :client, :start, :end, :budget, :priority,
                     :desc, :status, :pm, :tags, :cb)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':pid'      => $projectId,
            ':name'     => $name,
            ':client'   => $data['clientName']  ?? null,
            ':start'    => $data['startDate']   ?: null,
            ':end'      => $data['endDate']     ?: null,
            ':budget'   => $data['budget']      ?? 0,
            ':priority' => $data['priority']    ?? 'medium',
            ':desc'     => $data['description'] ?? null,
            ':status'   => $data['status']      ?? 'not-started',
            ':pm'       => $data['assignedPM']  ?: null,
            ':tags'     => json_encode($data['tags'] ?? []),
            ':cb'       => $this->user['id'],
        ]);
        Response::json(true, 'Project created', ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateProject($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = [];
        $params = [':id' => $id];

        $map = [
            'name'        => ':name',   'clientName'  => ':client',
            'startDate'   => ':start',  'endDate'     => ':end',
            'budget'      => ':budget', 'priority'    => ':priority',
            'description' => ':desc',   'status'      => ':status',
            'assignedPM'  => ':pm',
        ];
        $colMap = [
            ':name' => 'name', ':client' => 'client_name', ':start' => 'start_date',
            ':end'  => 'end_date', ':budget' => 'budget', ':priority' => 'priority',
            ':desc' => 'description', ':status' => 'status', ':pm' => 'assigned_pm_id',
        ];
        foreach ($map as $key => $placeholder) {
            if (array_key_exists($key, $data)) {
                $fields[] = $colMap[$placeholder] . ' = ' . $placeholder;
                $params[$placeholder] = ($key === 'assignedPM' && $data[$key] === '') ? null : $data[$key];
            }
        }
        if (isset($data['tags'])) {
            $fields[] = 'tags = :tags';
            $params[':tags'] = json_encode($data['tags']);
        }
        if (empty($fields)) { Response::json(false, 'Nothing to update', null, 400); return; }

        $stmt = $this->db->prepare('UPDATE projects SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($params);
        Response::json(true, 'Project updated');
    }

    private function deleteProject($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $stmt = $this->db->prepare('DELETE FROM projects WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::json(true, 'Project deleted');
    }

    private function formatProject($row) {
        $row['tags'] = $row['tags'] ? json_decode($row['tags'], true) : [];
        $row['assignedPM'] = $row['assigned_pm_id'] ? [
            'id'    => $row['assigned_pm_id'],
            'name'  => $row['pm_name']  ?? '',
            'email' => $row['pm_email'] ?? '',
        ] : null;
        $row['clientName'] = $row['client_name'] ?? null;
        $row['startDate']  = $row['start_date']  ?? null;
        $row['endDate']    = $row['end_date']    ?? null;
        $row['budget']     = (float)($row['budget'] ?? 0);
        unset($row['client_name'], $row['start_date'], $row['end_date'],
              $row['assigned_pm_id'], $row['pm_name'], $row['pm_email']);
        return $row;
    }

    /* ═══════════════════════════════  TASKS  ══════════════════════════════════ */

    private function handleTasks() {
        switch ($this->method) {
            case 'GET':
                if ($this->id && $this->subId === 'comments') $this->getTaskComments($this->id);
                elseif ($this->id) $this->getTask($this->id);
                else               $this->getTasks();
                break;
            case 'POST':
                if ($this->id && $this->subId === 'comments') $this->addTaskComment($this->id);
                else $this->createTask();
                break;
            case 'PUT':    $this->updateTask($this->id);   break;
            case 'DELETE': $this->deleteTask($this->id);   break;
            default: Response::json(false, 'Method not allowed', null, 405);
        }
    }

    private function getTasks() {
        $projectId = $_GET['project_id'] ?? null;
        $status    = $_GET['status']     ?? null;
        $assignee  = $_GET['assigned_to'] ?? null;

        $where  = [];
        $params = [];
        if ($projectId) { $where[] = 't.project_id = :pid';        $params[':pid']      = $projectId; }
        if ($status)    { $where[] = 't.status = :status';         $params[':status']   = $status; }
        if ($assignee)  { $where[] = 't.assigned_to = :assignee';  $params[':assignee'] = $assignee; }

        // Employees only see their own tasks
        if ($this->user['role'] === 'employee') {
            $where[] = 't.assigned_to = :self';
            $params[':self'] = $this->user['id'];
        }

        $sql = "SELECT t.*,
                       u.name  AS assignee_name,  u.email AS assignee_email,
                       p.name  AS project_name,
                       cb.name AS creator_name
                FROM tasks t
                LEFT JOIN users u  ON u.id  = t.assigned_to
                LEFT JOIN projects p ON p.id = t.project_id
                LEFT JOIN users cb ON cb.id = t.created_by"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY t.created_at DESC';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $tasks = array_map([$this, 'formatTask'], $rows);
        Response::json(true, 'Tasks fetched', ['tasks' => $tasks]);
    }

    private function getTask($id) {
        $stmt = $this->db->prepare(
            "SELECT t.*, u.name AS assignee_name, u.email AS assignee_email, p.name AS project_name
             FROM tasks t
             LEFT JOIN users u ON u.id = t.assigned_to
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) { Response::json(false, 'Task not found', null, 404); return; }
        Response::json(true, 'Task fetched', ['task' => $this->formatTask($row)]);
    }

    private function createTask() {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['project']))        $data['project_id']      = $data['project'];
        if (isset($data['assignedTo']))     $data['assigned_to']     = $data['assignedTo'];
        if (isset($data['startDate']))      $data['start_date']      = $data['startDate'];
        if (isset($data['dueDate']))        $data['due_date']        = $data['dueDate'];
        if (isset($data['estimatedHours'])) $data['estimated_hours'] = $data['estimatedHours'];
        if (isset($data['loggedHours']))    $data['logged_hours']    = $data['loggedHours'];

        if (!($data['name'] ?? null)) { Response::json(false, 'Task name required', null, 400); return; }
        if (!($data['project_id'] ?? null)) { Response::json(false, 'project_id required', null, 400); return; }

        $taskId = 'TASK-' . strtoupper(substr(md5(uniqid()), 0, 6));
        $stmt = $this->db->prepare(
            "INSERT INTO tasks (task_id, name, project_id, assigned_to, created_by, priority,
                                start_date, due_date, description, estimated_hours, status, tags)
             VALUES (:tid, :name, :pid, :at, :cb, :pri, :sd, :dd, :desc, :eh, :status, :tags)"
        );
        $stmt->execute([
            ':tid'    => $taskId,
            ':name'   => $data['name'],
            ':pid'    => $data['project_id'],
            ':at'     => $data['assigned_to']      ?: null,
            ':cb'     => $this->user['id'],
            ':pri'    => $data['priority']          ?? 'medium',
            ':sd'     => $data['start_date']        ?: null,
            ':dd'     => $data['due_date']          ?: null,
            ':desc'   => $data['description']       ?? null,
            ':eh'     => $data['estimated_hours']   ?? 0,
            ':status' => $data['status']            ?? 'pending',
            ':tags'   => json_encode($data['tags']  ?? []),
        ]);
        Response::json(true, 'Task created', ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateTask($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['project']))        $data['project_id']      = $data['project'];
        if (isset($data['assignedTo']))     $data['assigned_to']     = $data['assignedTo'];
        if (isset($data['startDate']))      $data['start_date']      = $data['startDate'];
        if (isset($data['dueDate']))        $data['due_date']        = $data['dueDate'];
        if (isset($data['estimatedHours'])) $data['estimated_hours'] = $data['estimatedHours'];
        if (isset($data['loggedHours']))    $data['logged_hours']    = $data['loggedHours'];

        $fields = []; $params = [':id' => $id];

        $allowed = [
            'name' => 'name', 'project_id' => 'project_id', 'assigned_to' => 'assigned_to', 'priority' => 'priority',
            'start_date' => 'start_date', 'due_date' => 'due_date',
            'description' => 'description', 'estimated_hours' => 'estimated_hours',
            'logged_hours' => 'logged_hours', 'status' => 'status', 'progress' => 'progress',
        ];
        foreach ($allowed as $key => $col) {
            if (array_key_exists($key, $data)) {
                $fields[] = "$col = :$key";
                $params[":$key"] = ($data[$key] === '') ? null : $data[$key];
            }
        }
        if (isset($data['tags'])) { $fields[] = 'tags = :tags'; $params[':tags'] = json_encode($data['tags']); }
        if (empty($fields)) { Response::json(false, 'Nothing to update', null, 400); return; }

        $stmt = $this->db->prepare('UPDATE tasks SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($params);
        Response::json(true, 'Task updated');
    }

    private function deleteTask($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $stmt = $this->db->prepare('DELETE FROM tasks WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::json(true, 'Task deleted');
    }

    private function getTaskComments($taskId) {
        $stmt = $this->db->prepare(
            "SELECT c.*, u.name AS author_name, u.email AS author_email
             FROM pm_comments c
             JOIN users u ON u.id = c.author_id
             WHERE c.task_id = :tid ORDER BY c.created_at ASC"
        );
        $stmt->execute([':tid' => $taskId]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::json(true, 'Comments fetched', ['comments' => $comments]);
    }

    private function addTaskComment($taskId) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $text = trim($data['text'] ?? '');
        if (!$text) { Response::json(false, 'Comment text required', null, 400); return; }
        $stmt = $this->db->prepare(
            'INSERT INTO pm_comments (task_id, author_id, text) VALUES (:tid, :aid, :text)'
        );
        $stmt->execute([':tid' => $taskId, ':aid' => $this->user['id'], ':text' => $text]);
        Response::json(true, 'Comment added', ['id' => $this->db->lastInsertId()], 201);
    }

    private function formatTask($row) {
        $row['tags'] = $row['tags'] ? json_decode($row['tags'], true) : [];
        $row['assignee'] = $row['assigned_to'] ? [
            'id' => $row['assigned_to'], 'name' => $row['assignee_name'] ?? '', 'email' => $row['assignee_email'] ?? ''
        ] : null;
        $row['assignedTo'] = $row['assignee'];
        $row['project'] = ['id' => $row['project_id'], 'name' => $row['project_name'] ?? ''];
        $row['estimatedHours'] = (float)($row['estimated_hours'] ?? 0);
        $row['loggedHours']    = (float)($row['logged_hours']    ?? 0);
        $row['progress']       = (int)($row['progress'] ?? 0);
        unset($row['assignee_name'], $row['assignee_email'], $row['project_name'],
              $row['creator_name'], $row['estimated_hours'], $row['logged_hours']);
        return $row;
    }

    /* ════════════════════════════  TIME LOGS  ═════════════════════════════════ */

    private function handleTimeLogs() {
        switch ($this->method) {
            case 'GET':    $this->getTimeLogs();                 break;
            case 'POST':   $this->createTimeLog();               break;
            case 'PUT':
                if ($this->subId === 'approve') {
                    $this->approveTimeLog($this->id);
                } else {
                    $this->updateTimeLog($this->id);
                }
                break;
            case 'DELETE': $this->deleteTimeLog($this->id);      break;
            default: Response::json(false, 'Method not allowed', null, 405);
        }
    }

    private function getTimeLogs() {
        $projectId = $_GET['project_id'] ?? $_GET['project'] ?? null;
        $userId    = $_GET['user_id']    ?? null;

        $where  = []; $params = [];
        if ($projectId) { $where[] = 'tl.project_id = :pid'; $params[':pid'] = $projectId; }
        if ($userId)    { $where[] = 'tl.user_id = :uid';    $params[':uid'] = $userId; }
        if (!in_array($this->user['role'], ['admin', 'pm', 'hr'])) {
            $where[] = 'tl.user_id = :self';
            $params[':self'] = $this->user['id'];
        }

        $sql = "SELECT tl.*, u.name AS user_name, p.name AS project_name, t.name AS task_name
                FROM time_logs tl
                LEFT JOIN users u ON u.id = tl.user_id
                LEFT JOIN projects p ON p.id = tl.project_id
                LEFT JOIN tasks t ON t.id = tl.task_id"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY tl.date DESC';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $timeLogs = array_map([$this, 'formatTimeLog'], $rows);
        Response::json(true, 'Time logs fetched', ['timeLogs' => $timeLogs]);
    }

    private function formatTimeLog($row) {
        $row['isApproved'] = (bool)($row['is_approved'] ?? false);
        $row['user'] = [
            'id'   => $row['user_id'],
            'name' => $row['user_name'] ?? '',
        ];
        $row['project'] = [
            'id'   => $row['project_id'],
            'name' => $row['project_name'] ?? '',
        ];
        $row['task'] = $row['task_id'] ? [
            'id'   => $row['task_id'],
            'name' => $row['task_name'] ?? '',
        ] : null;
        $row['hours'] = (float)$row['hours'];
        unset($row['user_name'], $row['project_name'], $row['task_name'], $row['is_approved']);
        return $row;
    }

    private function approveTimeLog($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        if (!in_array($this->user['role'], ['admin', 'pm'])) {
            Response::json(false, 'Forbidden', null, 403);
            return;
        }

        $stmt = $this->db->prepare(
            "UPDATE time_logs 
             SET is_approved = 1, approved_by_id = :uid, approved_at = NOW() 
             WHERE id = :id"
        );
        $stmt->execute([
            ':uid' => $this->user['id'],
            ':id'  => $id
        ]);
        Response::json(true, 'Time log approved');
    }

    private function createTimeLog() {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!($data['project_id'] ?? null)) { Response::json(false, 'project_id required', null, 400); return; }
        if (!($data['hours'] ?? null))       { Response::json(false, 'hours required', null, 400); return; }
        if (!($data['date'] ?? null))        { Response::json(false, 'date required', null, 400); return; }

        $stmt = $this->db->prepare(
            "INSERT INTO time_logs (task_id, project_id, user_id, date, hours, description, type)
             VALUES (:tid, :pid, :uid, :date, :hours, :desc, :type)"
        );
        $stmt->execute([
            ':tid'   => $data['task_id']     ?: null,
            ':pid'   => $data['project_id'],
            ':uid'   => $this->user['id'],
            ':date'  => $data['date'],
            ':hours' => $data['hours'],
            ':desc'  => $data['description'] ?? null,
            ':type'  => $data['type']        ?? 'billable',
        ]);
        Response::json(true, 'Time log created', ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateTimeLog($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $stmt = $this->db->prepare(
            "UPDATE time_logs SET hours=:hours, description=:desc, date=:date, type=:type WHERE id=:id"
        );
        $stmt->execute([
            ':hours' => $data['hours']       ?? 0,
            ':desc'  => $data['description'] ?? null,
            ':date'  => $data['date']        ?? null,
            ':type'  => $data['type']        ?? 'billable',
            ':id'    => $id,
        ]);
        Response::json(true, 'Time log updated');
    }

    private function deleteTimeLog($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $stmt = $this->db->prepare('DELETE FROM time_logs WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::json(true, 'Time log deleted');
    }

    /* ════════════════════════════  RISKS  ═════════════════════════════════════ */

    private function handleRisks() {
        switch ($this->method) {
            case 'GET':    $this->getRisks();                 break;
            case 'POST':   $this->createRisk();               break;
            case 'PUT':    $this->updateRisk($this->id);      break;
            case 'DELETE': $this->deleteRisk($this->id);      break;
            default: Response::json(false, 'Method not allowed', null, 405);
        }
    }

    private function getRisks() {
        $projectId = $_GET['project_id'] ?? $_GET['project'] ?? null;
        $where = []; $params = [];
        if ($projectId) { $where[] = 'r.project_id = :pid'; $params[':pid'] = $projectId; }

        $sql = "SELECT r.*, p.name AS project_name, u.name AS responsible_name
                FROM risks r
                LEFT JOIN projects p ON p.id = r.project_id
                LEFT JOIN users u ON u.id = r.responsible_person_id"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY r.created_at DESC';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $risks = array_map([$this, 'formatRisk'], $rows);
        Response::json(true, 'Risks fetched', ['risks' => $risks]);
    }

    private function formatRisk($row) {
        $row['project'] = [
            'id' => $row['project_id'],
            'name' => $row['project_name'] ?? ''
        ];
        $row['responsiblePerson'] = $row['responsible_person_id'] ? [
            'id' => $row['responsible_person_id'],
            'name' => $row['responsible_name'] ?? ''
        ] : null;
        $row['riskId'] = $row['risk_id'];
        $row['mitigationPlan'] = $row['mitigation_plan'] ?? null;
        $row['createdAt'] = $row['created_at'];
        return $row;
    }

    private function createRisk() {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['project']))           $data['project_id']            = $data['project'];
        if (isset($data['mitigationPlan']))    $data['mitigation_plan']       = $data['mitigationPlan'];
        if (isset($data['responsiblePerson'])) $data['responsible_person_id'] = $data['responsiblePerson'];

        if (!($data['project_id'] ?? null))   { Response::json(false, 'project_id required', null, 400); return; }
        if (!($data['description'] ?? null))  { Response::json(false, 'description required', null, 400); return; }

        $riskId = 'RISK-' . strtoupper(substr(md5(uniqid()), 0, 6));
        $stmt = $this->db->prepare(
            "INSERT INTO risks (risk_id, project_id, description, level, impact, mitigation_plan, responsible_person_id, status, created_by)
             VALUES (:rid, :pid, :desc, :level, :impact, :mit, :resp, :status, :cb)"
        );
        $stmt->execute([
            ':rid'    => $riskId,
            ':pid'    => $data['project_id'],
            ':desc'   => $data['description'],
            ':level'  => $data['level']                  ?? 'medium',
            ':impact' => $data['impact']                 ?? null,
            ':mit'    => $data['mitigation_plan']        ?? null,
            ':resp'   => $data['responsible_person_id']  ?: null,
            ':status' => $data['status']                 ?? 'identified',
            ':cb'     => $this->user['id'],
        ]);
        Response::json(true, 'Risk created', ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateRisk($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['project']))           $data['project_id']            = $data['project'];
        if (isset($data['mitigationPlan']))    $data['mitigation_plan']       = $data['mitigationPlan'];
        if (isset($data['responsiblePerson'])) $data['responsible_person_id'] = $data['responsiblePerson'];

        $stmt = $this->db->prepare(
            "UPDATE risks SET description=:desc, level=:level, impact=:impact,
             mitigation_plan=:mit, responsible_person_id=:resp, status=:status WHERE id=:id"
        );
        $stmt->execute([
            ':desc'   => $data['description']           ?? null,
            ':level'  => $data['level']                 ?? 'medium',
            ':impact' => $data['impact']                ?? null,
            ':mit'    => $data['mitigation_plan']       ?? null,
            ':resp'   => $data['responsible_person_id'] ?: null,
            ':status' => $data['status']                ?? 'identified',
            ':id'     => $id,
        ]);
        Response::json(true, 'Risk updated');
    }

    private function deleteRisk($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $stmt = $this->db->prepare('DELETE FROM risks WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::json(true, 'Risk deleted');
    }

    /* ════════════════════════════  ISSUES  ════════════════════════════════════ */

    private function handleIssues() {
        switch ($this->method) {
            case 'GET':    $this->getIssues();                 break;
            case 'POST':   $this->createIssue();               break;
            case 'PUT':    $this->updateIssue($this->id);      break;
            case 'DELETE': $this->deleteIssue($this->id);      break;
            default: Response::json(false, 'Method not allowed', null, 405);
        }
    }

    private function getIssues() {
        $projectId = $_GET['project_id'] ?? $_GET['project'] ?? null;
        $where = []; $params = [];
        if ($projectId) { $where[] = 'i.project_id = :pid'; $params[':pid'] = $projectId; }

        $sql = "SELECT i.*, p.name AS project_name, u.name AS assigned_name, r.name AS reporter_name
                FROM issues i
                LEFT JOIN projects p ON p.id = i.project_id
                LEFT JOIN users u ON u.id = i.assigned_to
                LEFT JOIN users r ON r.id = i.reported_by"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY i.created_at DESC';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $issues = array_map([$this, 'formatIssue'], $rows);
        Response::json(true, 'Issues fetched', ['issues' => $issues]);
    }

    private function formatIssue($row) {
        $row['project'] = [
            'id' => $row['project_id'],
            'name' => $row['project_name'] ?? ''
        ];
        $row['assignedTo'] = $row['assigned_to'] ? [
            'id' => $row['assigned_to'],
            'name' => $row['assigned_name'] ?? ''
        ] : null;
        $row['reportedBy'] = $row['reported_by'] ? [
            'id' => $row['reported_by'],
            'name' => $row['reporter_name'] ?? ''
        ] : null;
        $row['issueId'] = $row['issue_id'];
        $row['createdAt'] = $row['created_at'];
        return $row;
    }

    private function createIssue() {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['project']))    $data['project_id']  = $data['project'];
        if (isset($data['assignedTo'])) $data['assigned_to'] = $data['assignedTo'];
        if (isset($data['task']))       $data['task_id']     = $data['task'];

        if (!($data['project_id'] ?? null)) { Response::json(false, 'project_id required', null, 400); return; }
        if (!($data['title'] ?? null))      { Response::json(false, 'title required', null, 400); return; }

        $issueId = 'ISS-' . strtoupper(substr(md5(uniqid()), 0, 6));
        $stmt = $this->db->prepare(
            "INSERT INTO issues (issue_id, project_id, task_id, title, description, severity, status, assigned_to, reported_by)
             VALUES (:iid, :pid, :tid, :title, :desc, :sev, :status, :at, :rb)"
        );
        $stmt->execute([
            ':iid'    => $issueId,
            ':pid'    => $data['project_id'],
            ':tid'    => $data['task_id']     ?: null,
            ':title'  => $data['title'],
            ':desc'   => $data['description'] ?? null,
            ':sev'    => $data['severity']    ?? 'medium',
            ':status' => $data['status']      ?? 'open',
            ':at'     => $data['assigned_to'] ?: null,
            ':rb'     => $this->user['id'],
        ]);
        Response::json(true, 'Issue created', ['id' => $this->db->lastInsertId()], 201);
    }

    private function updateIssue($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['project']))    $data['project_id']  = $data['project'];
        if (isset($data['assignedTo'])) $data['assigned_to'] = $data['assignedTo'];
        if (isset($data['task']))       $data['task_id']     = $data['task'];

        $stmt = $this->db->prepare(
            "UPDATE issues SET title=:title, description=:desc, severity=:sev,
             status=:status, assigned_to=:at WHERE id=:id"
        );
        $stmt->execute([
            ':title'  => $data['title']       ?? null,
            ':desc'   => $data['description'] ?? null,
            ':sev'    => $data['severity']    ?? 'medium',
            ':status' => $data['status']      ?? 'open',
            ':at'     => $data['assigned_to'] ?: null,
            ':id'     => $id,
        ]);
        Response::json(true, 'Issue updated');
    }

    private function deleteIssue($id) {
        if (!$id) { Response::json(false, 'ID required', null, 400); return; }
        $stmt = $this->db->prepare('DELETE FROM issues WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::json(true, 'Issue deleted');
    }
}
?>
