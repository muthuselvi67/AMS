SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `mongo_id` VARCHAR(24) UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'employee', 'hr', 'pm', 'client', 'developer') DEFAULT 'employee',
  `department` VARCHAR(255) DEFAULT '',
  `position` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(50) DEFAULT '',
  `phone_secondary` VARCHAR(50) DEFAULT '',
  `avatar` VARCHAR(255) DEFAULT '',
  `employee_id` VARCHAR(100) UNIQUE,
  `manager_id` INT,
  `joining_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_active` BOOLEAN DEFAULT TRUE,
  `leave_balance_annual` INT DEFAULT 12,
  `leave_balance_sick` INT DEFAULT 8,
  `leave_balance_casual` INT DEFAULT 6,
  `leave_balance_maternity` INT DEFAULT 90,
  `leave_balance_paternity` INT DEFAULT 15,
  `leave_balance_unpaid` INT DEFAULT 30,
  `salary_base` DECIMAL(10, 2) DEFAULT 0,
  `salary_hra` DECIMAL(10, 2) DEFAULT 0,
  `salary_transport` DECIMAL(10, 2) DEFAULT 0,
  `salary_other` DECIMAL(10, 2) DEFAULT 0,
  `salary_pf` DECIMAL(10, 2) DEFAULT 0,
  `salary_tax` DECIMAL(10, 2) DEFAULT 0,
  `grad_degree` VARCHAR(255) DEFAULT '',
  `grad_institution` VARCHAR(255) DEFAULT '',
  `grad_year` INT DEFAULT NULL,
  `grad_gpa` VARCHAR(50) DEFAULT '',
  `portfolio_website` VARCHAR(255) DEFAULT '',
  `portfolio_github` VARCHAR(255) DEFAULT '',
  `portfolio_linkedin` VARCHAR(255) DEFAULT '',
  `portfolio_resume` VARCHAR(255) DEFAULT '',
  `blood_group` VARCHAR(10) DEFAULT '',
  `date_of_birth` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `employee_name` VARCHAR(255) DEFAULT '',
  `date` DATE NOT NULL,
  `check_in_time` DATETIME,
  `check_in_photo` LONGTEXT,
  `check_in_latitude` DECIMAL(10, 8),
  `check_in_longitude` DECIMAL(11, 8),
  `check_in_address` TEXT,
  `check_in_accuracy` DECIMAL(10, 2),
  `check_out_time` DATETIME,
  `check_out_photo` LONGTEXT,
  `check_out_latitude` DECIMAL(10, 8),
  `check_out_longitude` DECIMAL(11, 8),
  `check_out_address` TEXT,
  `check_out_accuracy` DECIMAL(10, 2),
  `total_hours` DECIMAL(5, 2),
  `status` ENUM('present', 'absent', 'late', 'on-leave') DEFAULT 'present',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (employee_id, date)
);

CREATE TABLE `leave_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `default_days` INT DEFAULT 0,
  `color` VARCHAR(20) DEFAULT '#4F9CF9',
  `carry_forward` BOOLEAN DEFAULT FALSE,
  `max_carry_forward` INT DEFAULT 0,
  `is_paid` BOOLEAN DEFAULT TRUE,
  `requires_approval` BOOLEAN DEFAULT TRUE,
  `applicable_gender` ENUM('all', 'male', 'female') DEFAULT 'all',
  `description` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `leave_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `leave_type_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `number_of_days` DECIMAL(5, 1),
  `reason` TEXT NOT NULL,
  `status` ENUM('pending_manager', 'pending_hr', 'approved', 'rejected', 'cancelled') DEFAULT 'pending_manager',
  `manager_remark` TEXT,
  `hr_remark` TEXT,
  `manager_reviewed_by` INT,
  `hr_reviewed_by` INT,
  `reviewed_at` DATETIME,
  `is_half_day` BOOLEAN DEFAULT FALSE,
  `attachment_url` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`manager_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`hr_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `holidays` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `type` ENUM('government', 'bank', 'working_saturday', 'floating_leave', 'national', 'regional', 'company', 'optional') DEFAULT 'government',
  `description` TEXT,
  `is_recurring` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `payrolls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `base_salary` DECIMAL(10, 2) NOT NULL,
  `allowance_hra` DECIMAL(10, 2) DEFAULT 0,
  `allowance_transport` DECIMAL(10, 2) DEFAULT 0,
  `allowance_other` DECIMAL(10, 2) DEFAULT 0,
  `deduction_pf` DECIMAL(10, 2) DEFAULT 0,
  `deduction_tax` DECIMAL(10, 2) DEFAULT 0,
  `deduction_lop` DECIMAL(10, 2) DEFAULT 0,
  `net_salary` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('Draft', 'Paid', 'Cancelled') DEFAULT 'Draft',
  `paid_at` DATETIME,
  `remarks` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE (`user_id`, `month`, `year`)
);

CREATE TABLE `allowance_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `max_amount` DECIMAL(10, 2) DEFAULT 0,
  `requires_document` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `allowance_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `date` DATE NOT NULL,
  `purpose` TEXT NOT NULL,
  `attachments` JSON,
  `status` ENUM('pending_manager', 'pending_hr', 'approved', 'rejected', 'cancelled') DEFAULT 'pending_manager',
  `manager_remark` TEXT,
  `hr_remark` TEXT,
  `manager_reviewed_by` INT,
  `hr_reviewed_by` INT,
  `reviewed_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `allowance_categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`manager_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`hr_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `type` ENUM('announcement', 'event', 'birthday', 'anniversary', 'policy', 'alert') DEFAULT 'announcement',
  `posted_by` INT NOT NULL,
  `audience` ENUM('all', 'hr', 'employee', 'admin') DEFAULT 'all',
  `pinned` BOOLEAN DEFAULT FALSE,
  `expires_at` DATETIME,
  `tags` JSON,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `appraisals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `reviewer_id` INT NOT NULL,
  `period` VARCHAR(100) NOT NULL,
  `rating_performance` INT DEFAULT 3,
  `rating_communication` INT DEFAULT 3,
  `rating_teamwork` INT DEFAULT 3,
  `rating_leadership` INT DEFAULT 3,
  `rating_innovation` INT DEFAULT 3,
  `comments` TEXT,
  `status` ENUM('draft', 'submitted', 'acknowledged') DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `assets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('laptop', 'mobile', 'monitor', 'keyboard', 'mouse', 'headset', 'tablet', 'other') DEFAULT 'other',
  `serial_number` VARCHAR(100) DEFAULT '',
  `brand` VARCHAR(100) DEFAULT '',
  `model` VARCHAR(100) DEFAULT '',
  `purchase_date` DATE,
  `purchase_value` DECIMAL(10, 2) DEFAULT 0,
  `assigned_to` INT,
  `assigned_date` DATE,
  `returned_date` DATE,
  `status` ENUM('available', 'assigned', 'returned', 'damaged', 'retired') DEFAULT 'available',
  `notes` TEXT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `type` ENUM('appointment_letter', 'experience_letter', 'salary_revision', 'offer_letter', 'payslip', 'id_proof', 'certificate', 'bgv', 'other') DEFAULT 'other',
  `employee_id` INT NOT NULL,
  `file_data` LONGTEXT,
  `file_name` VARCHAR(255) DEFAULT '',
  `file_type` VARCHAR(100) DEFAULT '',
  `version` INT DEFAULT 1,
  `content` LONGTEXT,
  `generated_by` INT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `help_desks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('payroll', 'leave', 'attendance', 'documents', 'assets', 'benefits', 'general', 'it', 'other') DEFAULT 'general',
  `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  `status` ENUM('open', 'in-progress', 'resolved', 'closed') DEFAULT 'open',
  `submitted_by` INT NOT NULL,
  `assigned_to` INT,
  `resolved_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `help_desk_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `help_desk_id` INT NOT NULL,
  `by_user_id` INT,
  `text` TEXT NOT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`help_desk_id`) REFERENCES `help_desks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(50) UNIQUE,
  `client_name` VARCHAR(255) DEFAULT '',
  `client_user_id` INT,
  `start_date` DATE,
  `end_date` DATE,
  `budget` DECIMAL(12, 2) DEFAULT 0,
  `actual_cost` DECIMAL(12, 2) DEFAULT 0,
  `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  `description` TEXT,
  `status` ENUM('not-started', 'in-progress', 'on-hold', 'completed', 'cancelled') DEFAULT 'not-started',
  `assigned_pm_id` INT,
  `progress` INT DEFAULT 0,
  `created_by_id` INT,
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_pm_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `project_teams` (
  `project_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  PRIMARY KEY (`project_id`, `user_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `project_milestones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `due_date` DATE,
  `completed` BOOLEAN DEFAULT FALSE,
  `completed_at` DATETIME,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);

CREATE TABLE `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `task_id` VARCHAR(50) UNIQUE,
  `project_id` INT NOT NULL,
  `assigned_to` INT,
  `created_by` INT,
  `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  `start_date` DATE,
  `due_date` DATE,
  `description` TEXT,
  `estimated_hours` DECIMAL(8, 2) DEFAULT 0,
  `logged_hours` DECIMAL(8, 2) DEFAULT 0,
  `status` ENUM('pending', 'in-progress', 'review', 'completed', 'rejected') DEFAULT 'pending',
  `progress` INT DEFAULT 0,
  `parent_task_id` INT,
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);

CREATE TABLE `task_dependencies` (
  `task_id` INT NOT NULL,
  `depends_on_task_id` INT NOT NULL,
  PRIMARY KEY (`task_id`, `depends_on_task_id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`depends_on_task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);

CREATE TABLE `task_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT NOT NULL,
  `name` VARCHAR(255),
  `url` VARCHAR(500),
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);

CREATE TABLE `issues` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `task_id` INT,
  `issue_id` VARCHAR(50) UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `severity` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  `status` ENUM('open', 'in-progress', 'fixed', 'closed', 'rejected') DEFAULT 'open',
  `assigned_to` INT,
  `reported_by` INT NOT NULL,
  `resolved_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `lifecycle_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `type` ENUM('onboarding', 'bgv', 'confirmation', 'salary-revision', 'exit', 'promotion', 'transfer', 'other') NOT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
  `details` JSON,
  `notes` TEXT,
  `created_by` INT,
  `completed_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('leave_applied', 'leave_approved', 'leave_rejected', 'leave_cancelled', 'attendance', 'general', 'allowance_applied', 'allowance_approved', 'allowance_rejected') DEFAULT 'general',
  `is_read` BOOLEAN DEFAULT FALSE,
  `related_id` VARCHAR(100),
  `related_model` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `pm_appraisals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `appraisal_id` VARCHAR(50) UNIQUE,
  `employee_id` INT NOT NULL,
  `project_id` INT,
  `project_name` VARCHAR(255) DEFAULT '',
  `reporting_manager_id` INT,
  `appraisal_period` VARCHAR(100) DEFAULT '',
  `self_key_achievements` TEXT,
  `self_completed_tasks` TEXT,
  `self_technical_improvement` TEXT,
  `self_team_collaboration` TEXT,
  `self_problem_solving` TEXT,
  `self_trainings_completed` TEXT,
  `self_rating_technical` INT,
  `self_rating_communication` INT,
  `self_rating_productivity` INT,
  `self_rating_teamwork` INT,
  `self_submitted_at` DATETIME,
  `manager_reviewed_by` INT,
  `mgr_rating_work_quality` INT,
  `mgr_rating_productivity` INT,
  `mgr_rating_technical_skills` INT,
  `mgr_rating_team_collaboration` INT,
  `mgr_rating_problem_solving` INT,
  `mgr_category_level` INT,
  `mgr_strengths` TEXT,
  `mgr_areas_for_improvement` TEXT,
  `mgr_training_recommendations` TEXT,
  `mgr_promotion_recommended` BOOLEAN DEFAULT FALSE,
  `mgr_manager_comments` TEXT,
  `mgr_reviewed_at` DATETIME,
  `hr_reviewed_by` INT,
  `hr_final_category_level` INT,
  `hr_remarks` TEXT,
  `hr_approved_at` DATETIME,
  `status` ENUM('draft', 'submitted', 'under-review', 'hr-review', 'approved', 'rejected') DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reporting_manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`manager_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`hr_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `pm_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT NOT NULL,
  `author_id` INT NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `risks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `risk_id` VARCHAR(50) UNIQUE,
  `description` TEXT NOT NULL,
  `level` ENUM('low', 'medium', 'high') DEFAULT 'medium',
  `impact` TEXT,
  `mitigation_plan` TEXT,
  `responsible_person_id` INT,
  `status` ENUM('identified', 'mitigating', 'resolved', 'accepted') DEFAULT 'identified',
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`responsible_person_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `time_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT,
  `project_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `hours` DECIMAL(5, 2) NOT NULL,
  `description` TEXT,
  `type` ENUM('billable', 'non-billable') DEFAULT 'billable',
  `is_approved` BOOLEAN DEFAULT FALSE,
  `approved_by_id` INT,
  `approved_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS=1;
