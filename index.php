<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/src/Database.php';
require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/FileHandler.php';
require_once __DIR__ . '/src/BDMCode.php';
require_once __DIR__ . '/src/BDM.php';
require_once __DIR__ . '/src/Client.php';
require_once __DIR__ . '/src/ChangeRequest.php';
require_once __DIR__ . '/src/Dashboard.php';
require_once __DIR__ . '/src/Admin.php';
require_once __DIR__ . '/src/Mailer.php';
require_once __DIR__ . '/src/TwoFactor.php';

Auth::start();

$uri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

switch ($uri) {
    case '':
    case 'home':
        include __DIR__ . '/pages/landing.php';
        break;

    case 'login':
        include __DIR__ . '/pages/login.php';
        break;

    case 'register':
        include __DIR__ . '/pages/register.php';
        break;

    case 'dashboard':
        include __DIR__ . '/pages/dashboard.php';
        break;

    case 'apply':
        include __DIR__ . '/pages/client-apply.php';
        break;

    case 'forgot-password':
        include __DIR__ . '/pages/forgot-password.php';
        break;

    case 'verify-2fa':
        include __DIR__ . '/pages/verify-2fa.php';
        break;

    case 'admin':
        include __DIR__ . '/pages/admin/index.php';
        break;

    case 'logout':
        Auth::logout();
        header('Location: /login');
        exit;

    default:
        http_response_code(404);
        require_once __DIR__ . '/config/config.php';
        require_once __DIR__ . '/src/Auth.php';
        Auth::start();
        $pageTitle = '404 Not Found';
        $extraCss  = [];
        $footerJs  = [];
        require_once __DIR__ . '/partials/head.php';
        echo '<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Inter,sans-serif;color:#F5EDE0">
              <div><div style="font-size:5rem;margin-bottom:16px">404</div>
              <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:12px">Page Not Found</h1>
              <p style="color:#9A938A;margin-bottom:24px">The page you\'re looking for doesn\'t exist.</p>
              <a href="/" style="padding:10px 24px;background:#E8541C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">← Go Home</a>
              </div></div>';
        require_once __DIR__ . '/partials/footer.php';
        break;
}
