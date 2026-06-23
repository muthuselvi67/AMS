<?php
require_once __DIR__ . '/server/config/database.php';

$data = [
    ["DEEPAK R", "deepak.ravikumar@learnlike.co.in", "LL-100000", "LL-100000", "Administration", "Chief Executive Officer", "Exective", "9894239802", "2019-09-04"],
    ["SRI HARI R", "srihari.ravikumar@learnlike.co.in", "LL-100001", "LL-100001", "Administration", "Chief Technology Officer", "Exective", "9629044754", "2019-09-04"],
    ["THIYAGARAJAN P", "thiyagarajan.palanisamy@learnlike.co.in", "LL-100002", "LL-100002", "Administration", "Chief Operating Officer", "Exective", "8220776896", "2020-09-16"],
    ["JAMUNA DEVI G", "jamuna.ganesan@learnlike.co.in", "LL-100003", "LL-100003", "HR", "Director - Human Resources", "Exective", "9629039802", "2021-09-17"],
    ["PADMESH K A", "padmesh2019@gmail.com", "LL-101022-001", "LL-101022-001", "Training", "Associate", "Devops Administrator", "9629852929", "2022-10-10"],
    ["ROSHAN SRIRAM N", "roshansri22571@gmail.com", "LL-290424-001", "LL-290424-001", "Admin", "Associate", "Admin", "9384785597", "2024-04-29"],
    ["RAJA PANDI N", "nitrajapandi2019@gmail.com", "LL-211224-001", "LL-211224-001", "Development", "Jr.Associate", "Full Stack Developer", "9361440027", "2024-12-21"],
    ["MUTHUSELVI S", "muthuselvi.s2910@gmail.com", "LL-010725-001", "LL-010725-001", "Training", "Jr.Associate", "Full Stack Developer", "6380993878", "2025-07-01"],
    ["THIRUMOORTHI G", "thirugst7@gmail.com", "LL-300625-001", "LL-300625-001", "Training", "Sr.Associate", "Full Stack Developer", "9965022420", "2025-07-01"],
    ["MUTHEESWARI A", "mutheesa@gmail.com", "LL-151225-001", "LL-151225-001", "Development", "Associate", "Front End Developer", "9952113873", "2025-12-15"],
    ["KAMALA BHARATHI S", "kamalabharathi2003@gmail.com", "LL-151225-002", "LL-151225-002", "Development", "Associate", "Mobile App Developer", "9080457782", "2025-12-15"],
    ["PRIYA DHARSHINI S", "priyasundarrajan1777@gmail.com", "LL-141025-001", "LL-141025-001", "Training", "Jr.Associate", "Technical Trainer", "9524381684", "2025-10-14"],
    ["ROSHINI k", "roshini192004@gmail.com", "LL-141025-002", "LL-141025-002", "Training", "Jr.Associate", "Technical Trainer", "9047980031", "2025-10-14"],
    ["SRI HARI PRASATH A", "hari54stark@gmail.com", "LL-060126-001", "LL-060126-001", "Development", "Associate", "Full Stack Developer", "8838159937", "2026-01-06"],
    ["PRANAV S", "pranavsivasamy37@gmail.com", "LL-060126-002", "LL-060126-002", "Development", "Associate", "Mobile App Developer", "9345270065", "2026-01-06"],
    ["AASWIN J S", "jsaaswin2004@gmail.com", "LL-190126-001", "LL-190126-001", "Development", "Associate", "Full Stack Developer", "8680935830", "2026-01-19"],
    ["SRI NATHI S", "22srinathi@gmail.com", "LL-010426-001", "LL-010426-001", "Development", "Jr.Associate", "Full Stack Developer", "7094880636", "2026-04-01"],
    ["SUSMITHA S", "susmithasekar210@gmail.com", "LL-010426-002", "LL-010426-002", "Development", "Jr.Associate", "Full Stack Developer", "9360555929", "2026-04-01"]
];

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("INSERT INTO users (name, email, password, role, employee_id, department, position, phone, joining_date) 
                      VALUES (:name, :email, :password, :role, :employee_id, :department, :position, :phone, :joining_date)
                      ON DUPLICATE KEY UPDATE 
                      password = VALUES(password),
                      role = VALUES(role),
                      employee_id = VALUES(employee_id),
                      department = VALUES(department),
                      position = VALUES(position),
                      phone = VALUES(phone),
                      joining_date = VALUES(joining_date)");

foreach ($data as $row) {
    $sysRole = 'employee';
    if ($row[1] === 'jamuna.ganesan@learnlike.co.in') {
        $sysRole = 'hr';
    } else if (in_array($row[1], ['deepak.ravikumar@learnlike.co.in', 'srihari.ravikumar@learnlike.co.in', 'thiyagarajan.palanisamy@learnlike.co.in'])) {
        $sysRole = 'admin';
    }

    $hash = password_hash($row[2], PASSWORD_DEFAULT);
    
    $stmt->execute([
        ':name' => $row[0],
        ':email' => $row[1],
        ':password' => $hash,
        ':role' => $sysRole,
        ':employee_id' => $row[3],
        ':department' => $row[4],
        ':position' => $row[5],
        ':phone' => $row[7],
        ':joining_date' => $row[8]
    ]);
}

echo "All users inserted/updated successfully.\n";
