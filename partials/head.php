<?php
if (!isset($pageTitle)) $pageTitle = APP_NAME;
if (!isset($bodyClass)) $bodyClass = '';
$nonce = Auth::csrf();
$user = Auth::user();
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title><?php echo htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8'); ?> - MediaK9</title>
<meta name="description" content="MediaK9 Campus Partnership Program - BDM Portal">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/shared.css">
<link rel="stylesheet" href="/assets/css/page.css">
<link rel="stylesheet" href="/assets/css/responsive.css">
<link rel="icon" href="/assets/logos/mediak9.png" type="image/png">
<?php if (!empty($extraCss)): foreach ($extraCss as $css): ?>
<link rel="stylesheet" href="/assets/css/<?php echo htmlspecialchars($css, ENT_QUOTES, 'UTF-8'); ?>">
<?php endforeach; endif; ?>
<script>
window.mk9_ajax = {
    url: '<?php echo APP_URL; ?>/api/portal-handler.php',
    nonce: '<?php echo $nonce; ?>',
    home_url: '<?php echo APP_URL; ?>'
};
window.mk9_admin = {
    url: '<?php echo APP_URL; ?>/api/admin-handler.php',
    nonce: '<?php echo $nonce; ?>'
};
</script>
</head>
<body class="<?php echo htmlspecialchars($bodyClass, ENT_QUOTES, 'UTF-8'); ?>" data-page="portal">
<div class="bg-aurora" aria-hidden="true">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
  <div class="blob blob-4"></div>
</div>
<div class="bg-grid" aria-hidden="true"></div>
<div class="bg-grain" aria-hidden="true"></div>
<div class="cur-dot" aria-hidden="true"></div>
<div class="cur-ring" aria-hidden="true"></div>
<nav class="top">
  <a href="/" class="nav-mark"><img src="/assets/logos/mediak9.png" alt="Media K9"></a>
  <ul class="nav-list">
    <li><a href="/" class="<?php echo $_SERVER['REQUEST_URI'] === '/' ? 'active' : ''; ?>">Home</a></li>
    <?php if ($user): ?>
      <?php if ($user['role'] === 'admin'): ?>
        <li><a href="/admin" class="<?php echo strpos($_SERVER['REQUEST_URI'], '/admin') === 0 ? 'active' : ''; ?>">Admin Panel</a></li>
      <?php else: ?>
        <li><a href="/dashboard" class="<?php echo strpos($_SERVER['REQUEST_URI'], '/dashboard') === 0 ? 'active' : ''; ?>">Dashboard</a></li>
      <?php endif; ?>
      <li><a href="#" class="mk9-logout-link">Logout</a></li>
    <?php else: ?>
      <li><a href="/login" class="<?php echo strpos($_SERVER['REQUEST_URI'], '/login') === 0 ? 'active' : ''; ?>">Login</a></li>
      <li><a href="/register" class="<?php echo strpos($_SERVER['REQUEST_URI'], '/register') === 0 ? 'active' : ''; ?>">Apply as BDM</a></li>
    <?php endif; ?>
  </ul>
  <a href="https://mediak9.com" class="nav-cta" target="_blank" rel="noopener">Main Site →</a>
</nav>
