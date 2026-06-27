<?php
require_once __DIR__ . '/config/config.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `" . DB_NAME . "`");

    $tables = [

        "CREATE TABLE IF NOT EXISTS `users` (
        `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `email`      VARCHAR(255) NOT NULL UNIQUE,
        `full_name`  VARCHAR(255) NOT NULL,
        `password`   VARCHAR(255) NOT NULL,
        `role`       ENUM('admin','bdm') NOT NULL DEFAULT 'bdm',
        `created_at` DATETIME NOT NULL,
        `updated_at` DATETIME DEFAULT NULL,
        INDEX `idx_email` (`email`),
        INDEX `idx_role`  (`role`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_bdm_profiles` (
        `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `user_id`               INT UNSIGNED NOT NULL UNIQUE,
        `full_name`             VARCHAR(255) NOT NULL,
        `father_name`           VARCHAR(255) NOT NULL,
        `phone`                 VARCHAR(30) NOT NULL,
        `bdm_code`              VARCHAR(20) DEFAULT NULL,
        `cnic_number`           VARBINARY(500) DEFAULT NULL,
        `university_card_front` VARCHAR(255) DEFAULT NULL,
        `university_card_back`  VARCHAR(255) DEFAULT NULL,
        `profile_picture`       VARCHAR(255) DEFAULT NULL,
        `status`                ENUM('pending','approved','rejected','terminated') NOT NULL DEFAULT 'pending',
        `can_edit`              TINYINT(1) NOT NULL DEFAULT 1,
        `admin_notes`           TEXT DEFAULT NULL,
        `terms_accepted_at`     DATETIME DEFAULT NULL,
        `created_at`            DATETIME NOT NULL,
        `updated_at`            DATETIME DEFAULT NULL,
        INDEX `idx_user`   (`user_id`),
        INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_bdm_codes` (
        `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `bdm_user_id` INT UNSIGNED NOT NULL,
        `code`        VARCHAR(20) NOT NULL UNIQUE,
        `counter`     INT UNSIGNED NOT NULL,
        `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
        `created_at`  DATETIME NOT NULL,
        INDEX `idx_code`   (`code`),
        INDEX `idx_user`   (`bdm_user_id`),
        INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_clients` (
        `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `organization_name`   VARCHAR(255) NOT NULL,
        `contact_name`        VARCHAR(255) NOT NULL,
        `contact_email`       VARCHAR(255) NOT NULL,
        `contact_phone`       VARCHAR(30) DEFAULT NULL,
        `website`             VARCHAR(255) DEFAULT NULL,
        `service_required`    VARCHAR(255) NOT NULL,
        `timeline`            VARCHAR(100) DEFAULT NULL,
        `budget`              VARCHAR(100) DEFAULT NULL,
        `project_description` TEXT DEFAULT NULL,
        `competitors`         TEXT DEFAULT NULL,
        `bdm_code`            VARCHAR(20) NOT NULL,
        `bdm_user_id`         INT UNSIGNED DEFAULT NULL,
        `status`              ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        `admin_notes`         TEXT DEFAULT NULL,
        `created_at`          DATETIME NOT NULL,
        `updated_at`          DATETIME DEFAULT NULL,
        INDEX `idx_bdm_code` (`bdm_code`),
        INDEX `idx_status`   (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_projects` (
        `id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `client_id`         INT UNSIGNED NOT NULL,
        `bdm_user_id`       INT UNSIGNED DEFAULT NULL,
        `bdm_code`          VARCHAR(20) NOT NULL,
        `organization_name` VARCHAR(255) NOT NULL,
        `service_required`  VARCHAR(255) DEFAULT NULL,
        `status`            ENUM('pending','ongoing','completed') NOT NULL DEFAULT 'ongoing',
        `notes`             TEXT DEFAULT NULL,
        `created_at`        DATETIME NOT NULL,
        `updated_at`        DATETIME DEFAULT NULL,
        INDEX `idx_bdm_user` (`bdm_user_id`),
        INDEX `idx_status`   (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_change_requests` (
        `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `bdm_user_id` INT UNSIGNED NOT NULL,
        `field_name`  VARCHAR(100) NOT NULL,
        `old_value`   TEXT DEFAULT NULL,
        `new_value`   TEXT NOT NULL,
        `status`      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        `admin_notes` TEXT DEFAULT NULL,
        `created_at`  DATETIME NOT NULL,
        `updated_at`  DATETIME DEFAULT NULL,
        INDEX `idx_bdm`    (`bdm_user_id`),
        INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_activity_log` (
        `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `user_id`    INT UNSIGNED DEFAULT NULL,
        `action`     VARCHAR(100) NOT NULL,
        `details`    TEXT DEFAULT NULL,
        `created_at` DATETIME NOT NULL,
        INDEX `idx_user`   (`user_id`),
        INDEX `idx_action` (`action`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_password_resets` (
        `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `email`      VARCHAR(255) NOT NULL UNIQUE,
        `token`      VARCHAR(64) NOT NULL,
        `expires_at` DATETIME NOT NULL,
        `created_at` DATETIME NOT NULL,
        INDEX `idx_email`  (`email`),
        INDEX `idx_token`  (`token`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_tickets` (
        `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `bdm_user_id` INT UNSIGNED NOT NULL,
        `subject`     VARCHAR(255) NOT NULL,
        `category`    ENUM('general','technical','payment','account','other') NOT NULL DEFAULT 'general',
        `status`      ENUM('open','in-progress','closed') NOT NULL DEFAULT 'open',
        `created_at`  DATETIME NOT NULL,
        `updated_at`  DATETIME NOT NULL,
        INDEX `idx_bdm`    (`bdm_user_id`),
        INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `mk9_ticket_replies` (
        `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `ticket_id`   INT UNSIGNED NOT NULL,
        `sender_id`   INT UNSIGNED NOT NULL,
        `sender_role` ENUM('bdm','admin') NOT NULL DEFAULT 'bdm',
        `message`     TEXT NOT NULL,
        `is_read`     TINYINT(1) NOT NULL DEFAULT 0,
        `created_at`  DATETIME NOT NULL,
        INDEX `idx_ticket` (`ticket_id`),
        INDEX `idx_sender` (`sender_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    ];

    foreach ($tables as $sql) {
        $pdo->exec($sql);
    }

    // ── Safe Alterations for Existing Databases ───────────────────
    $alters = [
        "ALTER TABLE `mk9_clients` ADD COLUMN `website` VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE `mk9_clients` ADD COLUMN `timeline` VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE `mk9_clients` ADD COLUMN `project_description` TEXT DEFAULT NULL",
        "ALTER TABLE `mk9_clients` ADD COLUMN `competitors` TEXT DEFAULT NULL",
    ];
    foreach ($alters as $alterSql) {
        try {
            $pdo->exec($alterSql);
        } catch (PDOException $e) {
            // Safe to ignore if columns already exist
        }
    }

    // ── Extend ENUM for terminated status (safe for existing databases) ──
    try {
        $pdo->exec(
            "ALTER TABLE `mk9_bdm_profiles`
             MODIFY COLUMN `status`
             ENUM('pending','approved','rejected','terminated') NOT NULL DEFAULT 'pending'"
        );
    } catch (PDOException $e) {
        // Already has the value - safe to ignore
    }

    // ── Add updated_at to mk9_bdm_codes if missing ──
    try {
        $pdo->exec("ALTER TABLE `mk9_bdm_codes` ADD COLUMN `updated_at` DATETIME DEFAULT NULL");
    } catch (PDOException $e) { /* already exists */
    }

    // ── Extend mk9_projects status ENUM to include 'on-hold' ──
    try {
        $pdo->exec(
            "ALTER TABLE `mk9_projects`
             MODIFY COLUMN `status`
             ENUM('pending','ongoing','completed','on-hold') NOT NULL DEFAULT 'ongoing'"
        );
    } catch (PDOException $e) {
        // Already has value or column differs - safe to ignore
    }

    // ── Create Admin Accounts ─────────────────────────────────────
    $admins = [
        ['email' => 'mediak997@gmail.com', 'name' => 'MediaK9 Admin', 'password' => 'Admin@MK9!2026'],
        ['email' => 'munir5033010@gmail.com', 'name' => 'Muhammad Munir', 'password' => 'Admin@MK9!2026'],
        ['email' => 'mh.haroon56@gmail.com', 'name' => 'Haroon', 'password' => 'Admin@MK9!2026']
    ];

    foreach ($admins as $admin) {
        $hash = password_hash($admin['password'], PASSWORD_BCRYPT);
        $exists = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $exists->execute([$admin['email']]);
        if (!$exists->fetch()) {
            $ins = $pdo->prepare("INSERT INTO users (email, full_name, password, role, created_at) VALUES (?,?,?,?,?)");
            $ins->execute([$admin['email'], $admin['name'], $hash, 'admin', date('Y-m-d H:i:s')]);
            echo "<p style='color:green'> Admin created: <strong>{$admin['email']}</strong> / password: <strong>{$admin['password']}</strong></p>";
        } else {
            echo "<p style='color:blue'>Already exists: {$admin['email']}</p>";
        }
    }
    echo "<p style='color:orange'><strong>Change both admin passwords immediately after first login!</strong></p>";

    echo "<p style='color:green;font-size:1.2rem'> All 9 database tables created successfully!</p>";
    echo "<p><strong>Tables created:</strong> users, mk9_bdm_profiles, mk9_bdm_codes, mk9_clients, mk9_projects, mk9_change_requests, mk9_activity_log, mk9_tickets, mk9_ticket_replies</p>";
    echo "<p style='color:red;font-weight:bold'> DELETE THIS FILE (install.php) IMMEDIATELY after setup is complete!</p>";

} catch (PDOException $e) {
    echo "<p style='color:red'> Database Error: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . "</p>";
    echo "<p>Check your DB credentials in <code>install.php</code></p>";
}