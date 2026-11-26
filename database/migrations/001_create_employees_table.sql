-- Migration 001: employees table
-- Idempotent: safe to run repeatedly. Compatible with MySQL 8.x and Amazon RDS for MySQL 8.x.

CREATE TABLE IF NOT EXISTS employees (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  department    VARCHAR(100) NOT NULL,
  designation   VARCHAR(100) NOT NULL,
  joining_date  DATE         NOT NULL,
  status        ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_email (email),
  KEY idx_employees_department (department),
  KEY idx_employees_status (status),
  KEY idx_employees_name (name),
  KEY idx_employees_created_at (created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci; -- case-insensitive: name search and email uniqueness ignore case
