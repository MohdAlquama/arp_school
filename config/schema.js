import db from './database.js';
import mysql from 'mysql2/promise';

export async function initializeSchema() {
    const databaseName = process.env.DB_NAME || 'erpfee';
    if (!/^[a-zA-Z0-9_-]+$/.test(databaseName)) throw new Error('Invalid DB_NAME');
    const server = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'alquamaa',
        password: process.env.DB_PASSWORD || ''
    });
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await server.end();
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        username VARCHAR(190) NOT NULL UNIQUE,
        phone VARCHAR(30) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        permissions JSON NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.execute(`CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.execute(`CREATE TABLE IF NOT EXISTS categories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.execute(`CREATE TABLE IF NOT EXISTS subcategories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        category_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(120) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_subcategory_category_name (category_id, name),
        CONSTRAINT fk_subcategory_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.execute(`CREATE TABLE IF NOT EXISTS students (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_name VARCHAR(160) NOT NULL,
        gender ENUM('Male', 'Female', 'Other') NOT NULL,
        father_name VARCHAR(160) NULL,
        mother_name VARCHAR(160) NULL,
        student_number VARCHAR(60) NULL UNIQUE,
        father_phone VARCHAR(30) NULL,
        alternate_phone VARCHAR(30) NULL,
        whatsapp_number VARCHAR(30) NULL,
        total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        category_id BIGINT UNSIGNED NOT NULL,
        subcategory_id BIGINT UNSIGNED NOT NULL,
        remarks TEXT NULL,
        image_data MEDIUMBLOB NULL,
        image_mime VARCHAR(40) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_students_category_subcategory (category_id, subcategory_id),
        CONSTRAINT fk_student_category FOREIGN KEY (category_id) REFERENCES categories(id),
        CONSTRAINT fk_student_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.execute(`CREATE TABLE IF NOT EXISTS student_installments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        installment_no INT UNSIGNED NOT NULL,
        title VARCHAR(120) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_installment_no (student_id, installment_no),
        CONSTRAINT fk_installment_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.execute(`CREATE TABLE IF NOT EXISTS student_payments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        installment_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_mode ENUM('CASH', 'CASHFREE') NOT NULL,
        status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL,
        reference_number VARCHAR(120) NULL,
        cashfree_link_id VARCHAR(100) NULL UNIQUE,
        cashfree_link_url TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        KEY idx_student_payment_installment_status (installment_id, status),
        CONSTRAINT fk_payment_installment FOREIGN KEY (installment_id) REFERENCES student_installments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
