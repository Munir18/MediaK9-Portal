<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
Auth::start();
if (Auth::isLoggedIn()) {
    header('Location: ' . (Auth::isAdmin() ? '/admin' : '/dashboard'));
    exit;
}
$pageTitle = 'Login';
require_once dirname(__DIR__) . '/partials/head.php';
if (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== '') {
    echo '<script src="https://www.google.com/recaptcha/api.js?render=' . RECAPTCHA_SITE_KEY . '"></script>';
}
?>
<style>
.pw-wrap { position:relative; display:block; width:100%; }
.pw-wrap input { padding-right: 44px !important; width:100%; box-sizing:border-box; }
.pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:4px; color:var(--cream-muted); line-height:1; }
.pw-toggle:hover { color:var(--cream); }
.pw-toggle svg { width:18px; height:18px; display:block; }
</style>
<?php
?>

<section class="p-hero" style="padding-bottom: 40px;">
  <div class="badge">Portal · Login</div>
  <h1 data-blur data-blur-stagger="0.06">Welcome<br><span class="accent">back.</span></h1>
  <p class="lead fade-up">Sign in to your BDM dashboard to manage your clients and track your performance.</p>
</section>

<section class="contact glow-follow" style="padding-top: 0;">
  <div class="contact-grid" style="grid-template-columns: 1fr; max-width: 500px; margin: 0 auto;">
    <form class="c-form rv" id="mk9-login-form" autocomplete="off">
      <div id="mk9-login-alert" style="display:none;padding:16px 20px;border-radius:12px;margin-bottom:14px;font-size:13px;font-weight:500;"></div>
      
      <label>Email Address
        <input type="email" id="mk9-login-email" name="email" placeholder="your@email.com" required autocomplete="email">
      </label>
      
      <label>Password
        <div class="pw-wrap">
          <input type="password" id="mk9-login-password" name="password" placeholder="Enter your password" required autocomplete="current-password">
          <button type="button" class="pw-toggle" aria-label="Toggle password visibility" onclick="togglePw('mk9-login-password',this)">
            <svg id="eye-login-show" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <svg id="eye-login-hide" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
          </button>
        </div>
      </label>

      <?php if (!defined('RECAPTCHA_SITE_KEY') || RECAPTCHA_SITE_KEY === ''): ?>
      <!-- CAPTCHA -->
      <div class="captcha-container" style="margin-top: 15px; margin-bottom: 20px;">
        <label style="display:block; margin-bottom: 8px;">
          <span style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:var(--cream-muted);margin-bottom:8px;">Security Check</span>
        </label>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="captcha-question-box" style="flex-grow: 1; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--hairline); border-radius: 8px; font-family:'JetBrains Mono',monospace; font-size: 15px; color: var(--cream); text-align: center; font-weight: 600; box-sizing: border-box; display: flex; align-items: center; justify-content: center; height: 48px;">
            Solve: &nbsp;<span id="captcha-question"><?php 
              $num1 = random_int(1, 9);
              $num2 = random_int(1, 9);
              $_SESSION['mk9_captcha'] = $num1 + $num2;
              echo "{$num1} + {$num2}";
            ?></span>
          </div>
          <button type="button" id="btn-refresh-captcha" class="btn btn-sec" style="padding: 0; width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;" aria-label="Refresh Captcha">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
        <input type="text" id="mk9-login-captcha" name="captcha_answer" placeholder="Enter answer" required autocomplete="off" style="margin-top: 10px; width: 100%; text-align: center; font-family:'JetBrains Mono',monospace; letter-spacing: 0.1em;">
      </div>
      <?php endif; ?>
      
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <a href="/forgot-password" style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--cream-muted);text-decoration:none;">Forgot password?</a>
      </div>

      <button type="submit" class="btn btn-pri" id="mk9-login-submit" style="width:100%;justify-content:center;margin-top:10px;">Sign In <span class="arr">→</span></button>
      <?php if (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== ''): ?>
      <div style="margin-top:10px;text-align:center;">
        <span style="font-size:10px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">
          🛡 Protected by reCAPTCHA v3 &middot;
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" style="color:var(--cream-muted);text-decoration:underline;text-underline-offset:2px;">Privacy</a> &middot;
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener" style="color:var(--cream-muted);text-decoration:underline;text-underline-offset:2px;">Terms</a>
        </span>
      </div>
      <?php endif; ?>
      
      <div style="margin-top:24px;text-align:center;border-top:1px solid var(--hairline);padding-top:24px;">
        <p style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--cream-muted);margin-bottom:12px;">New to the program?</p>
        <a href="/register" class="btn btn-sec" style="width:100%;justify-content:center;">Apply as BDM</a>
      </div>
    </form>
  </div>
</section>

<script>
function togglePw(inputId, btn) {
    const inp = document.getElementById(inputId);
    const isText = inp.type === 'text';
    inp.type = isText ? 'password' : 'text';
    const svgs = btn.querySelectorAll('svg');
    svgs[0].style.display = isText ? 'block' : 'none';
    svgs[1].style.display = isText ? 'none' : 'block';
}
</script>
<script>
document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('mk9-login-form');
    const submitBtn = document.getElementById('mk9-login-submit');
    const alertArea = document.getElementById('mk9-login-alert');
    const captchaQuestion = document.getElementById('captcha-question');
    const refreshBtn = document.getElementById('btn-refresh-captcha');
    const captchaInput = document.getElementById('mk9-login-captcha');

    const showAlert = (msg, type) => {
        alertArea.style.display = 'block';
        if (type === 'error') {
            alertArea.style.background = 'rgba(232,84,28,.05)';
            alertArea.style.border = '1px solid rgba(232,84,28,.3)';
            alertArea.style.color = 'var(--marmalade)';
        } else {
            alertArea.style.background = 'rgba(196,229,56,.05)';
            alertArea.style.border = '1px solid rgba(196,229,56,.3)';
            alertArea.style.color = 'var(--lime)';
        }
        alertArea.innerHTML = msg;
    };

    const refreshCaptcha = async () => {
        try {
            const res = await MK9.ajax('mk9_get_captcha');
            if (res.success && res.data?.question) {
                captchaQuestion.textContent = res.data.question;
                if (captchaInput) captchaInput.value = '';
            }
        } catch (e) {
            console.error('Failed to refresh captcha', e);
        }
    };

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCaptcha);
    }

    const isReCaptchaActive = <?php echo (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== '') ? 'true' : 'false'; ?>;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('mk9-login-email').value.trim();
        const password = document.getElementById('mk9-login-password').value;

        if (!email || !password) {
            showAlert('Please enter your email and password.', 'error');
            return;
        }

        if (!isReCaptchaActive) {
            const captcha_answer = captchaInput ? captchaInput.value.trim() : '';
            if (!captcha_answer) {
                showAlert('Please enter the security answer.', 'error');
                return;
            }
        }

        MK9.setButtonLoading(submitBtn, true);
        alertArea.style.display = 'none';

        const doSubmit = async (recaptchaToken = '') => {
            try {
                const params = { email, password };
                if (isReCaptchaActive) {
                    params.recaptcha_token = recaptchaToken;
                } else {
                    params.captcha_answer = captchaInput.value.trim();
                }

                const res = await MK9.ajax('mk9_login', params);
                if (res.success) {
                    showAlert('✓ Login successful! Redirecting…', 'success');
                    setTimeout(() => { window.location.href = res.data.redirect || '/'; }, 800);
                } else {
                    showAlert(res.data?.message || 'Invalid credentials.', 'error');
                    MK9.setButtonLoading(submitBtn, false);
                    if (!isReCaptchaActive) refreshCaptcha();
                }
            } catch {
                showAlert('Network error. Try again.', 'error');
                MK9.setButtonLoading(submitBtn, false);
                if (!isReCaptchaActive) refreshCaptcha();
            }
        };

        if (isReCaptchaActive) {
            grecaptcha.ready(() => {
                grecaptcha.execute('<?php echo RECAPTCHA_SITE_KEY; ?>', {action: 'login'}).then((token) => {
                    doSubmit(token);
                }).catch(err => {
                    showAlert('reCAPTCHA Error. Please refresh and try again.', 'error');
                    MK9.setButtonLoading(submitBtn, false);
                });
            });
        } else {
            doSubmit();
        }
    });
});
</script>

<?php require_once dirname(__DIR__) . '/partials/footer.php'; ?>
