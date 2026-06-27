<?php
class Auth {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name(SESSION_NAME);
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                       (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
                       (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', $isHttps ? 1 : 0);
            ini_set('session.use_strict_mode', 1);
            session_start();
        }
        if (empty($_SESSION[CSRF_TOKEN_NAME])) {
            $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
        }
    }

    public static function csrf(): string {
        return $_SESSION[CSRF_TOKEN_NAME] ?? '';
    }

    public static function verifyCsrf(): void {
        $token = $_POST['nonce'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!hash_equals($_SESSION[CSRF_TOKEN_NAME] ?? '', $token)) {
            self::jsonError('Invalid security token.', 403);
        }
    }

    public static function login(int $userId, string $email, string $role): void {
        session_regenerate_id(true);
        $_SESSION['user_id']    = $userId;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_role']  = $role;
    }

    public static function logout(): void {
        $_SESSION = [];
        session_destroy();
    }

    public static function isLoggedIn(): bool {
        return !empty($_SESSION['user_id']);
    }

    public static function userId(): int {
        return (int) ($_SESSION['user_id'] ?? 0);
    }

    public static function userRole(): string {
        return $_SESSION['user_role'] ?? '';
    }

    public static function isBDM(): bool {
        return self::isLoggedIn() && in_array(self::userRole(), ['bdm', 'admin']);
    }

    public static function isAdmin(): bool {
        return self::isLoggedIn() && self::userRole() === 'admin';
    }

    /** Returns the current user as an associative array, or null if not logged in */
    public static function user(): ?array {
        if (!self::isLoggedIn()) return null;
        return [
            'id'    => self::userId(),
            'email' => $_SESSION['user_email'] ?? '',
            'role'  => self::userRole(),
        ];
    }

    /** Admin-only: enter "view as BDM" mode without notifying the BDM */
    public static function startImpersonating(int $bdmUserId): void {
        $_SESSION['mk9_impersonate_bdm_id'] = $bdmUserId;
    }

    public static function stopImpersonating(): void {
        unset($_SESSION['mk9_impersonate_bdm_id']);
    }

    public static function isImpersonating(): bool {
        return self::isAdmin() && !empty($_SESSION['mk9_impersonate_bdm_id']);
    }

    public static function impersonatedBdmId(): int {
        return (int) ($_SESSION['mk9_impersonate_bdm_id'] ?? 0);
    }

    public static function requireLogin(): void {
        if (!self::isLoggedIn()) {
            header('Location: /login');
            exit;
        }
    }

    public static function requireBDM(): void {
        if (!self::isBDM()) {
            header('Location: /login');
            exit;
        }
    }

    public static function requireAdmin(): void {
        if (!self::isAdmin()) {
            header('Location: /login');
            exit;
        }
    }

    public static function requireAjaxAuth(): void {
        if (!self::isLoggedIn()) {
            self::jsonError('Unauthorized.', 401);
        }
    }

    public static function requireAjaxAdmin(): void {
        if (!self::isAdmin()) {
            self::jsonError('Unauthorized.', 403);
        }
    }

    public static function jsonSuccess(mixed $data = null): never {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    public static function jsonError(string $message, int $code = 400): never {
        http_response_code($code);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'data' => ['message' => $message]]);
        exit;
    }
}
