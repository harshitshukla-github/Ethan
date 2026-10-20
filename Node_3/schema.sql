-- Run Once:- mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS first_node;
USE first_node; 

CREATE TABLE IF NOT EXISTS users(
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data (Insert IGNORE skips rows whose email already exists,
-- so running this file twice is safe COMMENT

INSERT IGNORE INTO users (name, email) VALUES 
    ('Aarav Sharma', 'aaravsharma@yahoo.com'),
    ('Priya Verma', 'priyaverma@protonmail.com'),
    ('Bhaskaran Rajendran', 'bhaskaranR@gmail.com'),
    ('Ethan Talapatti', 'ethantalapatti@msn.com');



