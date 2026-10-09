CREATE DATABASE IF NOT EXISTS bltf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bltf;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'volunteer') NOT NULL DEFAULT 'volunteer',
  status ENUM('pending', 'approved', 'active', 'suspended', 'rejected') NOT NULL DEFAULT 'pending',
  phone VARCHAR(30) NOT NULL,
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS volunteers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  age VARCHAR(20),
  skills TEXT,
  availability TEXT,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_volunteers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  city VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  capacity INT UNSIGNED NOT NULL DEFAULT 30,
  status ENUM('upcoming', 'cancelled', 'completed') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_date_status (event_date, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_signups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  volunteer_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  signed_up_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_signup (volunteer_id, event_id),
  CONSTRAINT fk_event_signups_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_signups_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS volunteer_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  volunteer_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NULL,
  hours DECIMAL(4,1) NOT NULL,
  date_worked DATE NOT NULL,
  location VARCHAR(200),
  notes TEXT,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500),
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  CONSTRAINT chk_hours_range CHECK (hours >= 0.5 AND hours <= 24),
  CONSTRAINT fk_hours_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
  CONSTRAINT fk_hours_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  INDEX idx_hours_status_date (status, date_worked),
  INDEX idx_hours_volunteer (volunteer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  location VARCHAR(200),
  goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  collected DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit VARCHAR(40) NOT NULL DEFAULT 'items',
  status ENUM('active', 'completed', 'paused') NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_project_goal CHECK (goal >= 0),
  CONSTRAINT chk_project_collected CHECK (collected >= 0),
  CONSTRAINT fk_projects_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_projects_status_end (status, end_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS donations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  donor_name VARCHAR(100) NOT NULL,
  donor_email VARCHAR(254) NOT NULL,
  type ENUM('money', 'food', 'clothing', 'sanitary') NOT NULL,
  amount DECIMAL(12,2),
  item_description VARCHAR(1000),
  city VARCHAR(100),
  message VARCHAR(2000),
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  payment_status ENUM('awaiting_transfer', 'pledged', 'complete', 'failed') NOT NULL DEFAULT 'pledged',
  proof_image MEDIUMTEXT,
  proof_filename VARCHAR(255),
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_donations_date (date),
  INDEX idx_donations_payment (payment_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gallery_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  url MEDIUMTEXT NOT NULL,
  caption VARCHAR(255),
  event_name VARCHAR(160) NOT NULL,
  location VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  category VARCHAR(80),
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
