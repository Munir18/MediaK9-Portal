<?php
// ╔══════════════════════════════════════════════════════════════╗
// ║  MK9 BDM PORTAL - config.example.php                         ║
// ║  Copy this file to config.php and fill in your credentials   ║
// ╚══════════════════════════════════════════════════════════════╝

// ── 1. DATABASE CREDENTIALS ─────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_CHARSET', 'utf8mb4');

// ── 2. APP SECURITY KEY ─────────────────────────────────────────
define('APP_KEY', 'PASTE_64_RANDOM_CHARS_HERE_NOW_DO_NOT_LEAVE_DEFAULT_1234567890ab');

// ── 3. APP URL ──────────────────────────────────────────────────
define('APP_URL', 'https://student.mediak9.com');
define('APP_NAME', 'MediaK9 BDM Portal');

// ── 4. FILE UPLOADS ─────────────────────────────────────────────
define('UPLOAD_PATH', dirname(__DIR__) . '/uploads/');
define('UPLOAD_URL', APP_URL . '/api/serve-file.php?file=');

// ── 5. GOOGLE RECAPTCHA V3 ──────────────────────────────────────
define('RECAPTCHA_SITE_KEY', '');
define('RECAPTCHA_SECRET_KEY', '');

// ── 6. EMAIL ────────────────────────────────────────────────────
define('MAIL_FROM', 'mediak997@gmail.com');
define('MAIL_TO_ADMIN', 'mediak997@gmail.com');
define('MAIL_FROM_NAME', 'MediaK9');

// ── 7. BDM CODE SETTINGS ────────────────────────────────────────
define('BDM_CODE_PREFIX', 'MK9-');
define('BDM_CODE_START', 101);

// ── 8. SESSION & CSRF ───────────────────────────────────────────
define('SESSION_NAME', 'mk9_portal');
define('CSRF_TOKEN_NAME', 'mk9_csrf');

// ── 9. GOOGLE SHEETS SYNC ───────────────────────────────────────
define('GOOGLE_SHEETS_URL', '');

// ── 10. UPLOAD LIMITS ───────────────────────────────────────────
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024);   // 5 MB max
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
