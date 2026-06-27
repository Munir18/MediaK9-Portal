<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/TwoFactor.php';

Auth::start();

// If already logged in, redirect
if (Auth::isLoggedIn()) {
    header('Location: ' . (Auth::isAdmin() ? '/admin' : '/dashboard'));
    exit;
}

// If no pending 2FA, redirect to login
if (!TwoFactor::hasPending()) {
    header('Location: /login');
    exit;
}

$pending  = TwoFactor::getPendingUser();
$maskedEmail = '';
if ($pending && !empty($pending['email'])) {
    $parts = explode('@', $pending['email']);
    $local = $parts[0];
    $domain = $parts[1] ?? '';
    $masked = substr($local, 0, 2) . str_repeat('*', max(0, strlen($local) - 2));
    $maskedEmail = $masked . '@' . $domain;
}

$pageTitle = 'Verify Identity';
require_once dirname(__DIR__) . '/partials/head.php';
?>
<section class="p-hero" style="padding-bottom: 40px;">
  <div class="badge">Security · 2FA</div>
  <h1 data-blur data-blur-stagger="0.06">Verify<br><span class="accent">your identity.</span></h1>
  <p class="lead fade-up">We sent a 6-digit code to <strong><?php echo htmlspecialchars($maskedEmail, ENT_QUOTES, 'UTF-8'); ?></strong>. Enter it below to sign in.</p>
</section>

<section class="contact glow-follow" style="padding-top: 0;">
  <div class="contact-grid" style="grid-template-columns: 1fr; max-width: 460px; margin: 0 auto;">
    <form class="c-form rv" id="mk9-2fa-form" autocomplete="off">
      <div id="mk9-2fa-alert" style="display:none;padding:16px 20px;border-radius:12px;margin-bottom:14px;font-size:13px;font-weight:500;"></div>

      <label style="display:block;margin-bottom:24px;">
        <span style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:var(--cream-muted);margin-bottom:12px;">6-Digit Verification Code</span>
        <input type="text" id="mk9-otp-input" name="otp" placeholder="000000"
               maxlength="6" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code"
               style="font-size:28px;font-weight:700;letter-spacing:.35em;text-align:center;font-family:'JetBrains Mono',monospace;padding:16px;">
      </label>

      <div id="mk9-2fa-timer" style="text-align:center;font-size:12px;color:var(--cream-muted);margin-bottom:20px;font-family:'JetBrains Mono',monospace;"></div>

      <button type="submit" class="btn btn-pri" id="mk9-2fa-submit" style="width:100%;justify-content:center;">
        Verify &amp; Sign In <span class="arr">→</span>
      </button>

      <div style="margin-top:20px;text-align:center;">
        <button type="button" id="mk9-resend-otp" class="btn btn-sec" style="font-size:12px;padding:8px 16px;" disabled>
          Resend Code <span id="mk9-resend-countdown">(60s)</span>
        </button>
      </div>

      <div style="margin-top:24px;text-align:center;">
        <a href="/login" style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--cream-muted);text-decoration:none;">← Back to Login</a>
      </div>
    </form>
  </div>
</section>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('mk9-2fa-form');
  const submitBtn = document.getElementById('mk9-2fa-submit');
  const alertArea = document.getElementById('mk9-2fa-alert');
  const otpInput  = document.getElementById('mk9-otp-input');
  const timerEl   = document.getElementById('mk9-2fa-timer');
  const resendBtn = document.getElementById('mk9-resend-otp');
  const resendCd  = document.getElementById('mk9-resend-countdown');

  const showAlert = (msg, type) => {
    alertArea.style.display = 'block';
    alertArea.style.background = type === 'error' ? 'rgba(232,84,28,.05)' : 'rgba(196,229,56,.05)';
    alertArea.style.border = type === 'error' ? '1px solid rgba(232,84,28,.3)' : '1px solid rgba(196,229,56,.3)';
    alertArea.style.color = type === 'error' ? 'var(--marmalade)' : 'var(--lime)';
    alertArea.innerHTML = msg;
  };

  // Only allow digits in OTP field
  otpInput.addEventListener('input', () => {
    otpInput.value = otpInput.value.replace(/[^0-9]/g, '').slice(0, 6);
  });

  // Countdown timer for OTP expiry
  let remaining = <?php echo TwoFactor::remainingSeconds(); ?>;
  const timerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = 'Code expired. Please request a new one.';
      timerEl.style.color = 'var(--marmalade)';
      submitBtn.disabled = true;
    } else {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `Code expires in ${mins}:${String(secs).padStart(2,'0')}`;
    }
  }, 1000);

  // Resend countdown (60 seconds)
  let resendTimer = 60;
  const resendInterval = setInterval(() => {
    resendTimer--;
    if (resendTimer <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled = false;
      resendCd.textContent = '';
    } else {
      resendCd.textContent = `(${resendTimer}s)`;
    }
  }, 1000);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = otpInput.value.trim();
    if (otp.length !== 6) { showAlert('Please enter the full 6-digit code.', 'error'); return; }

    MK9.setButtonLoading(submitBtn, true);
    alertArea.style.display = 'none';

    try {
      const res = await MK9.ajax('mk9_verify_2fa', { otp });
      if (res.success) {
        showAlert('✓ Verified! Signing you in…', 'success');
        setTimeout(() => { window.location.href = res.data.redirect || '/dashboard'; }, 800);
      } else {
        showAlert(res.data?.message || 'Invalid or expired code. Please try again.', 'error');
        MK9.setButtonLoading(submitBtn, false);
        otpInput.value = '';
        otpInput.focus();
      }
    } catch {
      showAlert('Network error. Please try again.', 'error');
      MK9.setButtonLoading(submitBtn, false);
    }
  });

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    try {
      const res = await MK9.ajax('mk9_resend_2fa');
      if (res.success) {
        showAlert('A new code has been sent to your email.', 'success');
        remaining = 600;
        resendTimer = 60;
        resendCd.textContent = '(60s)';
        const ri = setInterval(() => { resendTimer--; if (resendTimer <= 0) { clearInterval(ri); resendBtn.disabled = false; resendCd.textContent = ''; } else resendCd.textContent = `(${resendTimer}s)`; }, 1000);
      } else {
        showAlert(res.data?.message || 'Failed to resend code.', 'error');
        resendBtn.disabled = false;
      }
    } catch {
      showAlert('Network error.', 'error');
      resendBtn.disabled = false;
    }
    resendBtn.textContent = 'Resend Code';
  });

  // Auto-submit when 6 digits entered
  otpInput.addEventListener('input', () => {
    if (otpInput.value.length === 6) form.dispatchEvent(new Event('submit'));
  });
});
</script>

<?php require_once dirname(__DIR__) . '/partials/footer.php'; ?>
