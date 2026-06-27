<?php
ob_start();
// Suppress PHP notices/warnings that would corrupt JSON output
@ini_set('display_errors', 0);
error_reporting(0);

require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/FileHandler.php';
require_once dirname(__DIR__) . '/src/BDMCode.php';
require_once dirname(__DIR__) . '/src/BDM.php';
require_once dirname(__DIR__) . '/src/Client.php';
require_once dirname(__DIR__) . '/src/ChangeRequest.php';
require_once dirname(__DIR__) . '/src/Dashboard.php';
require_once dirname(__DIR__) . '/src/Mailer.php';
require_once dirname(__DIR__) . '/src/Ticket.php';
require_once dirname(__DIR__) . '/src/TwoFactor.php';

Auth::start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Auth::jsonError('Method not allowed.', 405);
}

// ── Login Rate Limiting (session-based, 5 attempts → 15-min lockout) ──
function checkLoginRateLimit(): void {
    $now = time();
    if (!isset($_SESSION['mk9_login_attempts'])) {
        $_SESSION['mk9_login_attempts'] = 0;
        $_SESSION['mk9_login_locked_until'] = 0;
    }
    if ($_SESSION['mk9_login_locked_until'] > $now) {
        $wait = ceil(($_SESSION['mk9_login_locked_until'] - $now) / 60);
        Auth::jsonError("Too many failed attempts. Please wait {$wait} minute(s) before trying again.", 429);
    }
}

function recordFailedLogin(): void {
    $_SESSION['mk9_login_attempts'] = ($_SESSION['mk9_login_attempts'] ?? 0) + 1;
    if ($_SESSION['mk9_login_attempts'] >= 5) {
        $_SESSION['mk9_login_locked_until'] = time() + (15 * 60); // 15 minutes
        $_SESSION['mk9_login_attempts']     = 0;
    }
}

function clearLoginRateLimit(): void {
    $_SESSION['mk9_login_attempts']     = 0;
    $_SESSION['mk9_login_locked_until'] = 0;
}

// ── BDM Code Validation Rate Limiting ─────────────────────────────
// Prevents brute-force scanning of the sequential BDM codes (MK9-101, etc.)
// Limit: 10 guesses per session per 5 minutes
function checkBdmCodeRateLimit(): void {
    $now = time();
    if (!isset($_SESSION['mk9_bdm_code_attempts'])) {
        $_SESSION['mk9_bdm_code_attempts']     = 0;
        $_SESSION['mk9_bdm_code_locked_until'] = 0;
    }
    if ($_SESSION['mk9_bdm_code_locked_until'] > $now) {
        $wait = ceil(($_SESSION['mk9_bdm_code_locked_until'] - $now) / 60);
        Auth::jsonError("Too many code validation attempts. Please wait {$wait} minute(s) before trying again.", 429);
    }
}

function recordBdmCodeAttempt(bool $success): void {
    if ($success) {
        $_SESSION['mk9_bdm_code_attempts']     = 0;
        $_SESSION['mk9_bdm_code_locked_until'] = 0;
        return;
    }
    $_SESSION['mk9_bdm_code_attempts'] = ($_SESSION['mk9_bdm_code_attempts'] ?? 0) + 1;
    if ($_SESSION['mk9_bdm_code_attempts'] >= 10) {
        $_SESSION['mk9_bdm_code_locked_until'] = time() + (5 * 60); // 5-minute lockout
        $_SESSION['mk9_bdm_code_attempts']     = 0;
    }
}


// ── Password Strength Validator ────────────────────────────────────────
function validatePasswordStrength(string $pw): bool {
    return strlen($pw) >= 8
        && preg_match('/[A-Z]/', $pw)
        && preg_match('/[a-z]/', $pw)
        && preg_match('/[0-9]/', $pw)
        && preg_match('/[^A-Za-z0-9]/', $pw);
}

// ── reCAPTCHA v3 Verification Helper ────────────────────────────────────
function verifyReCaptcha(string $token): bool {
    if (defined('RECAPTCHA_SECRET_KEY') && RECAPTCHA_SECRET_KEY !== '') {
        $url = 'https://www.google.com/recaptcha/api/siteverify';
        $data = [
            'secret'   => RECAPTCHA_SECRET_KEY,
            'response' => $token,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
        ];

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $result = curl_exec($ch);
            curl_close($ch);
        } else {
            $options = [
                'http' => [
                    'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                    'method'  => 'POST',
                    'content' => http_build_query($data),
                    'timeout' => 10
                ]
            ];
            $context = stream_context_create($options);
            $result = @file_get_contents($url, false, $context);
        }

        if ($result === false || !$result) {
            return false;
        }
        $response = json_decode($result);
        return isset($response->success) && $response->success && $response->score >= 0.3;
    }
    return true;
}

try {
    $action = $_POST['action'] ?? '';

    match ($action) {

        // ── CAPTCHA Generation ──────────────────────────────────────────
        'mk9_get_captcha' => (function () {
            $num1 = random_int(1, 9);
            $num2 = random_int(1, 9);
            $_SESSION['mk9_captcha'] = $num1 + $num2;
            Auth::jsonSuccess(['question' => "{$num1} + {$num2}"]);
        })(),

        // ── Login: CAPTCHA + Rate Limit + 2FA ───────────────────────────
        'mk9_login' => (function () {
            Auth::verifyCsrf();
            checkLoginRateLimit();

            // Check if reCAPTCHA is active
            if (defined('RECAPTCHA_SECRET_KEY') && RECAPTCHA_SECRET_KEY !== '') {
                $recaptchaToken = $_POST['recaptcha_token'] ?? '';
                if (!$recaptchaToken || !verifyReCaptcha($recaptchaToken)) {
                    Auth::jsonError('reCAPTCHA verification failed. Please try again.');
                }
            } else {
                // CAPTCHA check fallback
                $captchaAnswer = trim($_POST['captcha_answer'] ?? '');
                $captchaExpected = $_SESSION['mk9_captcha'] ?? null;
                if ($captchaExpected === null || $captchaAnswer !== (string)$captchaExpected) {
                    Auth::jsonError('Incorrect CAPTCHA answer. Please try again.');
                }
                unset($_SESSION['mk9_captcha']); // single-use
            }

            $email    = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
            $password = $_POST['password'] ?? '';
            if (!$email || !$password) Auth::jsonError('Email and password are required.');

            $user = Database::row("SELECT * FROM users WHERE email = ?", [$email]);
            if (!$user || !password_verify($password, $user->password)) {
                recordFailedLogin();
                Auth::jsonError('Invalid email or password.');
            }

            if ($user->role === 'bdm') {
                $profile = Database::row("SELECT status FROM mk9_bdm_profiles WHERE user_id = ?", [$user->id]);
                if (!$profile) {
                    Auth::jsonError('Profile not found. Please contact admin.');
                }
                if ($profile->status === 'terminated') {
                    Auth::jsonError('Your account has been suspended. Please contact MediaK9 for more information.');
                }
                if ($profile->status !== 'approved') {
                    Auth::jsonError('Your account is pending approval. Please wait for admin review.');
                }
            }

            clearLoginRateLimit();

            // Trigger 2FA — do NOT log in yet
            TwoFactor::send((int) $user->id, $user->email, $user->full_name);
            Auth::jsonSuccess(['redirect' => '/verify-2fa', 'requires_2fa' => true]);
        })(),

        // ── 2FA Verification ────────────────────────────────────────────
        'mk9_verify_2fa' => (function () {
            Auth::verifyCsrf();
            if (!TwoFactor::hasPending()) {
                Auth::jsonError('No active verification session. Please log in again.');
            }
            $pending = TwoFactor::getPendingUser();
            $otp     = trim($_POST['otp'] ?? '');
            if (TwoFactor::verify($otp)) {
                // OTP matched — actually log the user in now
                $user = Database::row("SELECT id, email, role, full_name FROM users WHERE id = ?", [$pending['user_id']]);
                if (!$user) Auth::jsonError('User not found.');
                Auth::login((int) $user->id, $user->email, $user->role);
                $redirect = $user->role === 'admin' ? '/admin' : '/dashboard';
                Auth::jsonSuccess(['redirect' => $redirect]);
            } else {
                Auth::jsonError('Invalid or expired code. Please check your email and try again.');
            }
        })(),

        // ── Resend 2FA OTP ───────────────────────────────────────────────
        'mk9_resend_2fa' => (function () {
            Auth::verifyCsrf();
            $pending = TwoFactor::getPendingUser();
            if (!$pending) Auth::jsonError('No active session. Please log in again.');
            TwoFactor::send($pending['user_id'], $pending['email'], $pending['name']);
            Auth::jsonSuccess(['message' => 'A new code has been sent to your email.']);
        })(),

        'mk9_logout' => (function () {
            Auth::logout();
            Auth::jsonSuccess(['redirect' => '/login']);
        })(),

        // ── BDM Register: CAPTCHA + password strength ────────────────────
        'mk9_bdm_register' => (function () {
            // Check if reCAPTCHA is active
            if (defined('RECAPTCHA_SECRET_KEY') && RECAPTCHA_SECRET_KEY !== '') {
                $recaptchaToken = $_POST['recaptcha_token'] ?? '';
                if (!$recaptchaToken || !verifyReCaptcha($recaptchaToken)) {
                    Auth::jsonError('reCAPTCHA verification failed. Please try again.');
                }
            } else {
                // CAPTCHA check fallback
                $captchaAnswer   = trim($_POST['captcha_answer'] ?? '');
                $captchaExpected = $_SESSION['mk9_captcha'] ?? null;
                if ($captchaExpected === null || $captchaAnswer !== (string)$captchaExpected) {
                    Auth::jsonError('Incorrect CAPTCHA answer. Please try again.');
                }
                unset($_SESSION['mk9_captcha']);
            }

            // Password strength
            $password = $_POST['password'] ?? '';
            if (!validatePasswordStrength($password)) {
                Auth::jsonError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (e.g. @, #, !).');
            }

            BDM::register($_POST, $_FILES);
        })(),

        'mk9_client_apply' => (function () {
            // reCAPTCHA v3 verification (same as login/register)
            if (defined('RECAPTCHA_SECRET_KEY') && RECAPTCHA_SECRET_KEY !== '') {
                $recaptchaToken = $_POST['recaptcha_token'] ?? '';
                if (!$recaptchaToken || !verifyReCaptcha($recaptchaToken)) {
                    Auth::jsonError('reCAPTCHA verification failed. Please refresh the page and try again.');
                }
            }
            Client::apply($_POST);
        })(),

        'mk9_validate_bdm_code' => (function () {
            checkBdmCodeRateLimit();
            $code = strtoupper(trim($_POST['code'] ?? ''));
            if (!$code) Auth::jsonError('No code provided.');
            if (BDMCode::validate($code)) {
                recordBdmCodeAttempt(true);
                Auth::jsonSuccess(['message' => 'Valid BDM code.', 'code' => $code]);
            } else {
                recordBdmCodeAttempt(false);
                Auth::jsonError('Invalid or inactive BDM code.');
            }
        })(),


        'mk9_get_dashboard_data'     => Dashboard::getData(),
        'mk9_update_profile'         => BDM::updateProfile($_POST, $_FILES),
        'mk9_submit_change_request'  => ChangeRequest::submit($_POST, $_FILES),

        // ── BDM Change Password (immediate update, requires current password) ──
        'mk9_change_password' => (function () {
            Auth::verifyCsrf();
            Auth::requireAjaxAuth();
            $userId      = Auth::userId();
            $currentPw   = $_POST['current_password'] ?? '';
            $newPw       = $_POST['new_password'] ?? '';
            $confirmPw   = $_POST['confirm_password'] ?? '';

            if (!$currentPw || !$newPw || !$confirmPw) Auth::jsonError('All fields are required.');
            if ($newPw !== $confirmPw) Auth::jsonError('New passwords do not match.');
            if (!validatePasswordStrength($newPw)) {
                Auth::jsonError('New password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
            }

            $user = Database::row("SELECT password FROM users WHERE id = ?", [$userId]);
            if (!$user || !password_verify($currentPw, $user->password)) {
                Auth::jsonError('Current password is incorrect.');
            }

            // Update user password immediately in database
            Database::update('users', [
                'password'   => password_hash($newPw, PASSWORD_BCRYPT),
                'updated_at' => date('Y-m-d H:i:s'),
            ], ['id' => $userId]);

            Auth::jsonSuccess(['message' => 'Your password has been changed successfully.']);
        })(),

        // ── Ticket / Support ────────────────────────────────────────────
        'mk9_ticket_create'     => Ticket::create($_POST),
        'mk9_ticket_get_mine'   => Ticket::getByBDM(),
        'mk9_ticket_get_detail' => Ticket::getDetail((int) ($_POST['ticket_id'] ?? 0)),
        'mk9_ticket_reply'      => Ticket::reply($_POST),

        'mk9_forgot_password' => (function () {
            Auth::verifyCsrf();
            $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
            if (!$email) Auth::jsonError('Invalid email address.');

            // Always return success to prevent email enumeration
            $user = Database::row("SELECT id, full_name FROM users WHERE email = ?", [$email]);
            if ($user) {
                $token     = bin2hex(random_bytes(32));
                $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
                Database::run(
                    "INSERT INTO mk9_password_resets (email, token, expires_at, created_at) VALUES (?,?,?,?)
                     ON DUPLICATE KEY UPDATE token=VALUES(token), expires_at=VALUES(expires_at), created_at=VALUES(created_at)",
                    [$email, hash('sha256', $token), $expiresAt, date('Y-m-d H:i:s')]
                );
                $resetUrl = APP_URL . '/forgot-password?token=' . $token;
                Mailer::passwordReset($email, $user->full_name, $resetUrl);
            }
            Auth::jsonSuccess(['message' => 'If that email is registered, a reset link has been sent.']);
        })(),

        'mk9_reset_password' => (function () {
            Auth::verifyCsrf();
            $token    = trim($_POST['token'] ?? '');
            $password = $_POST['password'] ?? '';
            if (!$token || !validatePasswordStrength($password)) {
                Auth::jsonError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
            }

            $hashed = hash('sha256', $token);
            $row = Database::row(
                "SELECT email, expires_at FROM mk9_password_resets WHERE token = ?",
                [$hashed]
            );
            if (!$row) Auth::jsonError('Invalid or already-used reset link.');
            if (strtotime($row->expires_at) < time()) Auth::jsonError('This reset link has expired. Please request a new one.');

            $newHash = password_hash($password, PASSWORD_BCRYPT);
            Database::run("UPDATE users SET password = ?, updated_at = ? WHERE email = ?",
                [$newHash, date('Y-m-d H:i:s'), $row->email]
            );
            Database::run("DELETE FROM mk9_password_resets WHERE token = ?", [$hashed]);
            Auth::jsonSuccess(['message' => 'Password updated successfully.']);
        })(),

        default => Auth::jsonError('Unknown action: ' . htmlspecialchars($action), 400),
    };
} catch (Throwable $e) {
    Auth::jsonError('Server Error: ' . $e->getMessage());
}
