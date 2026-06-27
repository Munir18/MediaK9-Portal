<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
Auth::start();
if (Auth::isLoggedIn()) { header('Location: /dashboard'); exit; }
$pageTitle = 'BDM Registration';
$extraJs   = ['registration.js'];
require_once dirname(__DIR__) . '/partials/head.php';
if (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== '') {
    echo '<script src="https://www.google.com/recaptcha/api.js?render=' . RECAPTCHA_SITE_KEY . '"></script>';
}
?>
<style>
.mk9-form__error { display:none; color:var(--marmalade); font-size:11px; margin-top:6px; }
.mk9-form__error.active { display:block; }
.mk9-form__input--error { border-color:var(--marmalade) !important; }
.mk9-file-upload {
  border: 1px dashed var(--hairline);
  height: 110px;
  border-radius: 10px;
  text-align: center;
  position: relative;
  transition: border-color 0.3s;
  cursor: pointer;
  margin-top: 6px;
  background: rgba(255,255,255,0.01);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
  padding: 8px;
}
.mk9-file-upload:hover { border-color:var(--cream-dim); background: rgba(255,255,255,0.03); }
.mk9-file-upload.dragover { border-color:var(--lime); background:rgba(196,229,56,.05); }
.mk9-file-upload__input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.mk9-file-upload__icon { font-size:24px; margin-bottom:8px; }
.mk9-file-upload__text { font-family:'Space Grotesk',sans-serif; font-size:12px; color:var(--cream-dim); }
.mk9-file-upload__name { margin-top:0px; font-weight:600; font-size:12px; color:var(--lime); width: 100%; }
.pw-wrap { position:relative; display:block; width:100%; }
.pw-wrap input { padding-right: 44px !important; width:100%; box-sizing:border-box; }
.pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:4px; color:var(--cream-muted); line-height:1; }
.pw-toggle:hover { color:var(--cream); }
.pw-toggle svg { width:18px; height:18px; display:block; }

/* Custom upload field states */
.mk9-file-upload.has-file .mk9-file-upload__icon,
.mk9-file-upload.has-file .mk9-file-upload__text {
  display: none !important;
}
.mk9-file-upload__remove {
  display: none;
  position: absolute;
  right: 8px;
  top: 8px;
  background: rgba(239, 68, 68, 0.85);
  border: none;
  border-radius: 50%;
  color: var(--cream);
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  z-index: 10;
  font-weight: bold;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.2s;
}
.mk9-file-upload__remove:hover {
  background: rgb(239, 68, 68);
}
.mk9-file-upload.has-file .mk9-file-upload__remove {
  display: flex;
}
.mk9-file-upload.has-file {
  border-style: solid;
}
.mk9-file-upload.has-file .mk9-file-upload__input {
  pointer-events: none;
}
</style>

<section class="p-hero" style="padding-bottom: 20px;">
  <div class="badge">Application</div>
  <h1 data-blur data-blur-stagger="0.06">Become a<br><span class="accent">Partner.</span></h1>
</section>

<section class="contact glow-follow" style="padding-top: 0;">
  <div class="contact-grid" style="grid-template-columns: 1fr; max-width: 600px; margin: 0 auto;">
    
    <div id="mk9-registration-container">
      <form class="c-form rv" id="mk9-registration-form" enctype="multipart/form-data" novalidate autocomplete="off">
        
        <div style="margin-bottom:24px; border-bottom:1px solid var(--hairline); padding-bottom:16px;">
          <h3 style="font-size:18px; font-weight:700;">1. Personal Information</h3>
          <p style="font-size:13px; color:var(--cream-dim);">All fields are required.</p>
        </div>
        <div class="c-row">
          <label class="mk9-form__group">Full Name <input type="text" id="mk9-full-name" name="full_name" placeholder="Muhammad Ali" required autocomplete="name"><div class="mk9-form__error" role="alert"></div></label>
          <label class="mk9-form__group">Father's Name <input type="text" id="mk9-father-name" name="father_name" placeholder="Muhammad Ahmed" required><div class="mk9-form__error" role="alert"></div></label>
        </div>
        <div class="c-row">
          <label class="mk9-form__group">Email <input type="email" id="mk9-email" name="email" placeholder="you@example.com" required autocomplete="email"><div class="mk9-form__error" role="alert"></div></label>
          <label class="mk9-form__group">Phone <input type="tel" id="mk9-phone" name="phone" placeholder="03XX-XXXXXXX" required pattern="[0-9]{4}-[0-9]{7}"><div class="mk9-form__error" role="alert"></div></label>
        </div>
        <div class="c-row">
          <label class="mk9-form__group">Password
            <div class="pw-wrap">
              <input type="password" id="mk9-password" name="password" placeholder="Min. 8 characters" required autocomplete="new-password">
              <button type="button" class="pw-toggle" aria-label="Toggle password" onclick="togglePw('mk9-password',this)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
              </button>
            </div>
            <!-- Password Strength Indicator -->
            <div id="pw-strength-container" style="display:none; margin-top:8px;">
              <div style="height:4px; width:100%; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                <div id="pw-strength-bar" style="height:100%; width:0%; transition:width 0.3s, background-color 0.3s;"></div>
              </div>
              <div id="pw-strength-text" style="font-size:10px; color:var(--cream-muted); margin-top:4px; font-family:'JetBrains Mono',monospace; text-transform:uppercase;"></div>
              <ul id="pw-requirements" style="list-style:none; padding:0; margin:8px 0 0 0; font-size:11px; font-family:'JetBrains Mono',monospace; line-height:1.4;">
                <li id="req-length" style="color:var(--cream-muted); margin-bottom:2px;">✕ At least 8 characters</li>
                <li id="req-upper" style="color:var(--cream-muted); margin-bottom:2px;">✕ One uppercase letter (A-Z)</li>
                <li id="req-lower" style="color:var(--cream-muted); margin-bottom:2px;">✕ One lowercase letter (a-z)</li>
                <li id="req-number" style="color:var(--cream-muted); margin-bottom:2px;">✕ One number (0-9)</li>
                <li id="req-special" style="color:var(--cream-muted); margin-bottom:2px;">✕ One special character (e.g. @, #, $, !)</li>
              </ul>
            </div>
            <div class="mk9-form__error" role="alert"></div>
          </label>
          <label class="mk9-form__group">Confirm Password
            <div class="pw-wrap">
              <input type="password" id="mk9-confirm-password" name="confirm_password" placeholder="Re-enter password" required autocomplete="new-password">
              <button type="button" class="pw-toggle" aria-label="Toggle confirm password" onclick="togglePw('mk9-confirm-password',this)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
              </button>
            </div>
            <div class="mk9-form__error" role="alert"></div>
          </label>
        </div>

        <div style="margin-top:40px; margin-bottom:24px; border-bottom:1px solid var(--hairline); padding-bottom:16px;">
          <h3 style="font-size:18px; font-weight:700;">2. Identity & Secure Documents</h3>
          <p style="font-size:13px; color:var(--cream-dim);">CNIC number is AES-256 encrypted before storage. Files are encrypted at rest.</p>
        </div>
        <div class="c-row" style="margin-bottom:16px;">
          <label class="mk9-form__group" style="flex:1;">
            <span style="display:block;margin-bottom:8px;font-size:.8125rem;font-weight:600;">CNIC Number <span style="color:var(--marmalade)">*</span></span>
            <div style="position:relative;">
              <input
                type="text"
                id="cnic_number"
                name="cnic_number"
                class="mk9-input"
                placeholder="00000-0000000-0"
                maxlength="15"
                inputmode="numeric"
                autocomplete="off"
                required
                style="letter-spacing:2px;font-size:16px;font-family:monospace;"
              >
            </div>
            <div class="mk9-form__error" role="alert"></div>
            <div style="font-size:11px;color:var(--cream-muted);margin-top:6px;">Enter 13 digits only — dashes are added automatically. Example: 6110169898892</div>
          </label>
        </div>
        <div class="c-row" style="margin-bottom:16px;">
          <label class="mk9-form__group">University Card Front
            <div class="mk9-file-upload">
              <input type="file" name="university_card_front" class="mk9-file-upload__input" accept="image/jpeg,image/png,image/webp,application/pdf" required>
              <button type="button" class="mk9-file-upload__remove">×</button>
              <div class="mk9-file-upload__icon"></div>
              <div class="mk9-file-upload__text">Required</div>
              <div class="mk9-file-upload__name"></div>
            </div>
          </label>
          <label class="mk9-form__group">University Card Back <span style="font-size:9px">(Optional)</span>
            <div class="mk9-file-upload">
              <input type="file" name="university_card_back" class="mk9-file-upload__input" accept="image/jpeg,image/png,image/webp,application/pdf">
              <button type="button" class="mk9-file-upload__remove">×</button>
              <div class="mk9-file-upload__icon"></div>
              <div class="mk9-file-upload__text">Optional</div>
              <div class="mk9-file-upload__name"></div>
            </div>
          </label>
        </div>
        <div class="c-row" style="margin-bottom:32px;">
          <label class="mk9-form__group">Profile Picture
            <div class="mk9-file-upload">
              <input type="file" name="profile_picture" class="mk9-file-upload__input" accept="image/jpeg,image/png,image/webp" required>
              <button type="button" class="mk9-file-upload__remove">×</button>
              <div class="mk9-file-upload__icon"></div>
              <div class="mk9-file-upload__text">JPG/PNG only</div>
              <div class="mk9-file-upload__name"></div>
            </div>
          </label>
          <label class="mk9-form__group" style="visibility: hidden; pointer-events: none;"></label>
        </div>

        <div class="mk9-form__group" style="margin-top:16px; margin-bottom:24px;">
          <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer;">
            <input type="checkbox" id="accept_terms" name="accept_terms" value="1" required style="margin-top:4px; width:16px; height:16px; accent-color:var(--lime); flex-shrink:0;">
            <span style="font-size:13px; line-height:1.5; color:var(--cream-dim);">
              I agree to the <a href="/terms.html" target="_blank" style="color:var(--lime); text-decoration:none;">Terms &amp; Conditions</a> and <a href="/privacy.html" target="_blank" style="color:var(--lime); text-decoration:none;">Privacy Policy</a>. <span style="color:var(--marmalade)">*</span>
            </span>
          </label>
          <div class="mk9-form__error" role="alert" style="margin-top:6px;"></div>
        </div>

        <?php if (!defined('RECAPTCHA_SITE_KEY') || RECAPTCHA_SITE_KEY === ''): ?>
        <!-- CAPTCHA -->
        <div class="captcha-container" style="margin-bottom: 24px; max-width: 100%;">
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
          <input type="text" id="mk9-register-captcha" name="captcha_answer" placeholder="Enter answer" required autocomplete="off" style="margin-top: 10px; width: 100%; text-align: center; font-family:'JetBrains Mono',monospace; letter-spacing: 0.1em;">
        </div>
        <?php endif; ?>

        <div style="display:flex; justify-content:center; margin-top:24px;">
          <button type="submit" class="btn btn-pri" id="mk9-register-submit" style="width:100%; justify-content:center;">Submit Application</button>
        </div>
        <?php if (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== ''): ?>
        <div style="margin-top:12px;text-align:center;">
          <span style="font-size:10px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">
            🛡 Protected by reCAPTCHA v3 &middot;
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" style="color:var(--cream-muted);text-decoration:underline;text-underline-offset:2px;">Privacy</a> &middot;
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener" style="color:var(--cream-muted);text-decoration:underline;text-underline-offset:2px;">Terms</a>
          </span>
        </div>
        <?php endif; ?>
      </form>
    </div>

    <div style="margin-top:24px;text-align:center;border-top:1px solid var(--hairline);padding-top:24px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--cream-muted);margin-bottom:12px;">Already applied?</p>
      <a href="/login" class="btn btn-sec" style="width:100%;justify-content:center;">Login</a>
    </div>

  </div>
</section>

<?php require_once dirname(__DIR__) . '/partials/footer.php'; ?>
