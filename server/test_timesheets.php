<?php 
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'config/database.php'; 
$db = (new Database())->getConnection(); 
try { 
    // Check what columns exist in users table
    $stmt = $db->query("SHOW COLUMNS FROM users");
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    echo "Users columns: " . implode(', ', $cols) . "\n\n";
    
    // Check which expected columns are MISSING
    $expected = ['leave_balance_annual','leave_balance_sick','leave_balance_casual',
                 'leave_balance_maternity','leave_balance_paternity','leave_balance_unpaid',
                 'chat_name','chat_about','chat_avatar','bank_name','account_name',
                 'account_number','ifsc_code','branch_name','blood_group','date_of_birth',
                 'id_card_photo','about','grad_degree','grad_institution','grad_year','grad_gpa',
                 'portfolio_website','portfolio_github','portfolio_linkedin','portfolio_resume',
                 'phone_secondary','cover_photo','salary_base','salary_hra','salary_transport',
                 'salary_other','salary_pf','salary_tax'];
    
    $missing = [];
    foreach ($expected as $col) {
        if (!in_array($col, $cols)) {
            $missing[] = $col;
        }
    }
    
    if (empty($missing)) {
        echo "All expected columns EXIST.\n";
    } else {
        echo "MISSING COLUMNS: " . implode(', ', $missing) . "\n";
    }
    
} catch (PDOException $e) { 
    echo "PDO ERROR: " . $e->getMessage() . "\n"; 
}
