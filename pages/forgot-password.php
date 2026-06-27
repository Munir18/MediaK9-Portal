<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
Auth::start();
if (Auth::isLoggedIn()) { header('Location: /dashboard'); exit; }

// ── Server-side token validation ─────────────────────────────────
// Token is verified in PHP BEFORE any HTML is sent to the browser.
// The reset form ONLY appears when the token is valid — preventing
// the audit finding where any ?token= value would show the form.
$resetToken   = trim($_GET['token'] ?? '');
$tokenValid   = false;
$tokenExpired = false;
$tokenError   = '';

if ($resetToken !== '') {
    // Reject tokens that don't look like a valid 64-char hex string
    if (!preg_match('/^[a-f0-9]{64}$/i', $resetToken)) {
        $tokenError = 'This reset link is invalid. Please request a new one.';
    } else {
        $hashed = hash('sha256', $resetToken);
        $row = Database::row(
            "SELECT expires_at FROM mk9_password_resets WHERE token = ?",
            [$hashed]
        );
        if (!$row) {
            $tokenError = 'This reset link is invalid or has already been used. Please request a new one.';
        } elseif (strtotime($row->expires_at) < time()) {
            $tokenExpired = true;
            $tokenError   = 'This reset link has expired (links are valid for 1 hour). Please request a new one.';
        } else {
            $tokenValid = true;
        }
    }
}

$pageTitle = 'Forgot Password';
require_once dirname(__DIR__) . '/partials/head.php';
?>
<style>
.pw-wrap { position:relative; display:block; width:100%; }
.pw-wrap input { padding-right: 44px !important; width:100%; box-sizing:border-box; }
.pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:4px; color:var(--cream-muted); line-height:1; }
.pw-toggle:hover { color:var(--cream); }
.pw-toggle svg { width:18px; height:18px; display:block; }
</style>

<section class="p-hero" style="padding-bottom: 40px;">
  <div class="badge">Portal · Password Reset</div>
  <h1 data-blur data-blur-stagger="0.06">Reset your<br><span class="accent">password.</span></h1>
  <p class="lead fade-up"><?php echo $tokenValid ? 'Enter your new password below.' : "Enter your email and we'll send you a secure link to reset your password."; ?></p>
</section>

<section class="contact glow-follow" style="padding-top: 0;">
  <div class="contact-grid" style="grid-template-columns: 1fr; max-width: 500px; margin: 0 auto;">

<?php if ($resetToken !== '' && !$tokenValid): ?>
    <!-- ── Invalid/expired token: show error, never show form ── -->
    <div style="padding:20px 24px; background:rgba(232,84,28,.05); border:1px solid rgba(232,84,28,.3); border-radius:12px; margin-bottom:24px; font-size:14px; color:var(--marmalade); font-weight:500; text-align:center;">
      <?php echo htmlspecialchars($tokenError, ENT_QUOTES, 'UTF-8'); ?>
    </div>
    <div style="text-align:center;">
      <a href="/forgot-password" class="btn btn-pri" style="display:inline-flex; justify-content:center;">Request New Reset Link <span class="arr">→</span></a>
    </div>

<?php elseif ($tokenValid): ?>
    <!-- ── Step 2: New password form — ONLY shown after PHP verifies the token ── -->
    <form class="c-form rv" id="mk9-reset-form" autocomplete="off">
      <div id="mk9-reset-alert" style="display:none;padding:16px 20px;border-radius:12px;margin-bottom:14px;font-size:13px;font-weight:500;"></div>
      <input type="hidden" id="mk9-reset-token" name="token" value="<?php echo htmlspecialchars($resetToken, ENT_QUOTES, 'UTF-8'); ?>">

      <label>New Password
        <div class="pw-wrap">
          <input type="password" id="mk9-new-password" name="password" placeholder="Min. 8 characters" required autocomplete="new-password">
          <button type="button" class="pw-toggle" aria-label="Toggle password" onclick="togglePw('mk9-new-password',this)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
          </button>
        </div>
      </label>

      <label style="margin-top:16px;">Confirm New Password
        <div class="pw-wrap">
          <input type="password" id="mk9-confirm-new-password" name="confirm_password" placeholder="Re-enter password" required autocomplete="new-password">
          <button type="button" class="pw-toggle" aria-label="Toggle confirm password" onclick="togglePw('mk9-confirm-new-password',this)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
          </button>
        </div>
      </label>

      <button type="submit" class="btn btn-pri" id="mk9-reset-submit" style="width:100%;justify-content:center;margin-top:20px;">
        Set New Password <span class="arr">→</span>
      </button>
    </form>

<?php else: ?>
    <!-- ── Step 1: Request reset link (no token in URL) ── -->
    <form class="c-form rv" id="mk9-forgot-form" autocomplete="off">
      <div id="mk9-forgot-alert" style="display:none;padding:16px 20px;border-radius:12px;margin-bottom:14px;font-size:13px;font-weight:500;"></div>
      <label>Email Address
        <input type="email" id="mk9-forgot-email" name="email" placeholder="your@email.com" required autocomplete="off">
      </label>
      <button type="submit" class="btn btn-pri" id="mk9-forgot-submit" style="width:100%;justify-content:center;margin-top:16px;">
        Send Reset Link <span class="arr">→</span>
      </button>
      <div style="margin-top:24px;text-align:center;border-top:1px solid var(--hairline);padding-top:24px;">
        <a href="/login" style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--cream-muted);text-decoration:none;">← Back to Login</a>
      </div>
    </form>
<?php endif; ?>

  </div>
</section>

<script>
function togglePw(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const isText = inp.type === 'text';
    inp.type = isText ? 'password' : 'text';
    const svgs = btn.querySelectorAll('svg');
    svgs[0].style.display = isText ? 'block' : 'none';
    svgs[1].style.display = isText ? 'none'  : 'block';
}
document.addEventListener('DOMContentLoaded', () => {
    const alertEl = (id, msg, type) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'block';
        el.style.background = type === 'error' ? 'rgba(232,84,28,.05)' : 'rgba(196,229,56,.05)';
        el.style.border     = type === 'error' ? '1px solid rgba(232,84,28,.3)' : '1px solid rgba(196,229,56,.3)';
        el.style.color      = type === 'error' ? 'var(--marmalade)' : 'var(--lime)';
        el.innerHTML = msg;
    };

    // Step 1: send reset email
    const forgotForm = document.getElementById('mk9-forgot-form');
    if (forgotForm) {
        const forgotSubmit = document.getElementById('mk9-forgot-submit');
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('mk9-forgot-email').value.trim();
            if (!email) { alertEl('mk9-forgot-alert', 'Please enter your email.', 'error'); return; }
            MK9.setButtonLoading(forgotSubmit, true);
            document.getElementById('mk9-forgot-alert').style.display = 'none';
            try {
                const res = await MK9.ajax('mk9_forgot_password', { email });
                if (res.success) {
                    alertEl('mk9-forgot-alert', 'If that email is registered, a reset link has been sent. Check your inbox (and spam folder).', 'success');
                    forgotSubmit.style.display = 'none';
                } else {
                    alertEl('mk9-forgot-alert', res.data?.message || 'Something went wrong.', 'error');
                    MK9.setButtonLoading(forgotSubmit, false);
                }
            } catch { alertEl('mk9-forgot-alert', 'Network error. Try again.', 'error'); MK9.setButtonLoading(forgotSubmit, false); }
        });
    }

    // Step 2: set new password (PHP already verified token before rendering)
    const resetForm = document.getElementById('mk9-reset-form');
    if (resetForm) {
        const resetSubmit = document.getElementById('mk9-reset-submit');
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('mk9-new-password').value;
            const confirm  = document.getElementById('mk9-confirm-new-password').value;
            const tok      = document.getElementById('mk9-reset-token').value;
            if (password.length < 8) { alertEl('mk9-reset-alert', 'Password must be at least 8 characters.', 'error'); return; }
            if (password !== confirm) { alertEl('mk9-reset-alert', 'Passwords do not match.', 'error'); return; }
            MK9.setButtonLoading(resetSubmit, true);
            document.getElementById('mk9-reset-alert').style.display = 'none';
            try {
                const res = await MK9.ajax('mk9_reset_password', { token: tok, password });
                if (res.success) {
                    alertEl('mk9-reset-alert', 'Password reset successfully! Redirecting to login...', 'success');
                    setTimeout(() => { window.location.href = '/login'; }, 1800);
                } else {
                    alertEl('mk9-reset-alert', res.data?.message || 'Invalid or expired link.', 'error');
                    MK9.setButtonLoading(resetSubmit, false);
                }
            } catch { alertEl('mk9-reset-alert', 'Network error. Try again.', 'error'); MK9.setButtonLoading(resetSubmit, false); }
        });
    }
});
</script>

<?php require_once dirname(__DIR__) . '/partials/footer.php'; ?>
