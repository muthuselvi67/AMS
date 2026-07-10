CREATE TABLE timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    task TEXT NOT NULL,
    time_in TIME,
    time_out TIME,
    break_duration INT DEFAULT 0 COMMENT 'Break in minutes',
    lunch_duration INT DEFAULT 0 COMMENT 'Lunch in minutes',
    total_hours DECIMAL(5,2) DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);