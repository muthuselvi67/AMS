<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

echo "--- Seeding salaries in users table ---\n";

// Get all non-admin active users
$stmt = $db->query("SELECT id, name, position, role FROM users WHERE is_active = 1 AND role != 'admin'");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($users as $u) {
    $pos = strtolower($u['position']);
    
    // Assign realistic salaries depending on position
    if (strpos($pos, 'director') !== false || strpos($pos, 'manager') !== false) {
        $base = 65000.00;
        $hra = 25000.00;
        $transport = 8000.00;
        $other = 5000.00;
        $pf = 1800.00;
        $tax = 3500.00;
    } else if (strpos($pos, 'sr.') !== false || strpos($pos, 'senior') !== false) {
        $base = 45000.00;
        $hra = 18000.00;
        $transport = 6000.00;
        $other = 4000.00;
        $pf = 1800.00;
        $tax = 2000.00;
    } else if (strpos($pos, 'jr.') !== false || strpos($pos, 'junior') !== false) {
        $base = 25000.00;
        $hra = 10000.00;
        $transport = 4000.00;
        $other = 2000.00;
        $pf = 1800.00;
        $tax = 500.00;
    } else {
        // Associate
        $base = 35000.00;
        $hra = 14000.00;
        $transport = 5000.00;
        $other = 3000.00;
        $pf = 1800.00;
        $tax = 1200.00;
    }
    
    $updateStmt = $db->prepare("UPDATE users SET 
        salary_base = :base, 
        salary_hra = :hra, 
        salary_transport = :transport, 
        salary_other = :other, 
        salary_pf = :pf, 
        salary_tax = :tax 
        WHERE id = :id");
    
    $updateStmt->execute([
        'base' => $base,
        'hra' => $hra,
        'transport' => $transport,
        'other' => $other,
        'pf' => $pf,
        'tax' => $tax,
        'id' => $u['id']
    ]);
    
    echo "Set salary for {$u['name']} ({$u['position']}): Base={$base}, HRA={$hra}, Net=" . ($base+$hra+$transport+$other-$pf-$tax) . "\n";
}

echo "\n--- Generating payroll entries ---\n";

// Generate for May and June 2026
$periods = [
    ['month' => 5, 'year' => 2026],
    ['month' => 6, 'year' => 2026]
];

// Clean existing payroll entries to avoid duplicates
$db->exec("DELETE FROM payrolls");
echo "Cleared existing payroll records.\n";

$insertQuery = "INSERT INTO payrolls (user_id, month, year, base_salary, allowance_hra, allowance_transport, allowance_other, deduction_pf, deduction_tax, deduction_lop, net_salary, status, paid_at) 
                VALUES (:user_id, :month, :year, :base, :hra, :transport, :other, :pf, :tax, 0, :net, 'Paid', :paid_at)";
$insertStmt = $db->prepare($insertQuery);

foreach ($users as $u) {
    // Fetch newly updated salary
    $sStmt = $db->prepare("SELECT salary_base, salary_hra, salary_transport, salary_other, salary_pf, salary_tax FROM users WHERE id = :id");
    $sStmt->execute(['id' => $u['id']]);
    $sal = $sStmt->fetch(PDO::FETCH_ASSOC);
    
    $base = (float)$sal['salary_base'];
    $hra = (float)$sal['salary_hra'];
    $transport = (float)$sal['salary_transport'];
    $other = (float)$sal['salary_other'];
    $pf = (float)$sal['salary_pf'];
    $tax = (float)$sal['salary_tax'];
    
    $net = $base + $hra + $transport + $other - $pf - $tax;
    
    foreach ($periods as $period) {
        // paid_at date: end of that month
        $paid_at = "{$period['year']}-" . sprintf("%02d", $period['month']) . "-30 10:00:00";
        
        $insertStmt->execute([
            'user_id' => $u['id'],
            'month' => $period['month'],
            'year' => $period['year'],
            'base' => $base,
            'hra' => $hra,
            'transport' => $transport,
            'other' => $other,
            'pf' => $pf,
            'tax' => $tax,
            'net' => $net,
            'paid_at' => $paid_at
        ]);
    }
    echo "Generated Paid payrolls for {$u['name']} (May & June 2026)\n";
}

echo "\nDatabase seeding for payroll completed successfully!\n";
?>
