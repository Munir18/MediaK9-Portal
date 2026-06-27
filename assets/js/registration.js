/* ═══════════════════════════════════════════════════════════════════
   MK9 BDM PORTAL - registration.js
   Math Captcha, Password strength meter, phone/email validation, image preview with clear
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Eye-toggle (called by inline onclick) ── */
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  const svgs = btn.querySelectorAll('svg');
  if (svgs[0]) svgs[0].style.display = isText ? 'block' : 'none';
  if (svgs[1]) svgs[1].style.display = isText ? 'none'  : 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('mk9-registration-form');
  if (!form) return;
  const submitBtn = document.getElementById('mk9-register-submit');

  // ── Field Validation ─────────────────────────────────────────────
  const showError = (input, msg) => {
    const group   = input.closest('.mk9-form__group');
    const errorEl = group ? group.querySelector('.mk9-form__error') : null;
    input.classList.add('mk9-form__input--error');
    input.classList.remove('mk9-form__input--success');
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('active'); }
  };

  const showOk = (input) => {
    const group   = input.closest('.mk9-form__group');
    const errorEl = group ? group.querySelector('.mk9-form__error') : null;
    input.classList.remove('mk9-form__input--error');
    input.classList.add('mk9-form__input--success');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('active'); }
  };

  const clearState = (input) => {
    const group   = input.closest('.mk9-form__group');
    const errorEl = group ? group.querySelector('.mk9-form__error') : null;
    input.classList.remove('mk9-form__input--error', 'mk9-form__input--success');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('active'); }
  };

  const validateField = (input) => {
    if (input.type === 'file') return true; // files handled separately

    if (input.type === 'checkbox') {
      if (input.required && !input.checked) {
        showError(input, 'You must accept the terms and conditions to proceed.');
        return false;
      }
      showOk(input);
      return true;
    }

    const val = input.value.trim();

    if (!val) {
      if (input.required) { showError(input, 'This field is required.'); return false; }
      clearState(input);
      return true;
    }

    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showError(input, 'Please enter a valid email address.'); return false;
    }
    if (input.id === 'mk9-phone' && !/^\d{4}-\d{7}$/.test(val)) {
      showError(input, 'Phone number must be 11 digits like (0318-6072309).'); return false;
    }
    if (input.id === 'mk9-password') {
      const tests = {
        length: val.length >= 8,
        upper: /[A-Z]/.test(val),
        lower: /[a-z]/.test(val),
        number: /[0-9]/.test(val),
        special: /[^A-Za-z0-9]/.test(val)
      };
      if (!tests.length || !tests.upper || !tests.lower || !tests.number || !tests.special) {
        showError(input, 'Password does not meet all security requirements.'); return false;
      }
    }
    if (input.id === 'mk9-confirm-password') {
      const pw = document.getElementById('mk9-password');
      if (pw && val !== pw.value) { showError(input, 'Passwords do not match.'); return false; }
    }
    if (input.id === 'cnic_number') {
      const digits = val.replace(/\D/g, '');
      if (!/^\d{13}$/.test(digits)) {
        showError(input, 'CNIC must be exactly 13 digits (e.g. 6110169898892).');
        return false;
      }
    }

    showOk(input);
    return true;
  };

  // Real-time phone formatter
  const phoneInput = document.getElementById('mk9-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      let cursor = phoneInput.selectionStart;
      let value = phoneInput.value;
      let clean = value.replace(/\D/g, '');
      if (clean.length > 11) clean = clean.slice(0, 11);
      
      let formatted = '';
      if (clean.length > 4) {
        formatted = clean.slice(0, 4) + '-' + clean.slice(4);
      } else {
        formatted = clean;
      }
      
      const addedHyphen = formatted.length > clean.length && clean.length === 5;
      phoneInput.value = formatted;
      
      if (cursor !== null) {
        if (addedHyphen && cursor === 5) cursor++;
        phoneInput.setSelectionRange(cursor, cursor);
      }
    });
  }

  // CNIC number auto-formatter (XXXXX-XXXXXXX-X)
  const cnicInput = document.getElementById('cnic_number');
  if (cnicInput) {
    cnicInput.addEventListener('input', () => {
      const start = cnicInput.selectionStart;
      const raw   = cnicInput.value;
      const clean = raw.replace(/\D/g, '').slice(0, 13); // max 13 digits
      let formatted = clean;
      if (clean.length > 5 && clean.length <= 12) {
        formatted = clean.slice(0, 5) + '-' + clean.slice(5);
      } else if (clean.length === 13) {
        formatted = clean.slice(0, 5) + '-' + clean.slice(5, 12) + '-' + clean.slice(12);
      }
      cnicInput.value = formatted;
      // Adjust cursor: account for inserted dashes
      const extraDashes = (formatted.slice(0, start).match(/-/g) || []).length -
                          (raw.slice(0, start).match(/-/g) || []).length;
      const newPos = start + extraDashes;
      cnicInput.setSelectionRange(newPos, newPos);
    });
    // Prevent non-numeric input
    cnicInput.addEventListener('keydown', (e) => {
      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End'];
      if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    });
  }

  // Terms and conditions checkbox change listener
  const acceptTermsCheckbox = document.getElementById('accept_terms');
  if (acceptTermsCheckbox) {
    acceptTermsCheckbox.addEventListener('change', () => validateField(acceptTermsCheckbox));
  }

  // Password strength logic
  const pwInput = document.getElementById('mk9-password');
  const strengthContainer = document.getElementById('pw-strength-container');
  const strengthBar = document.getElementById('pw-strength-bar');
  const strengthText = document.getElementById('pw-strength-text');
  const reqs = {
    length: document.getElementById('req-length'),
    upper: document.getElementById('req-upper'),
    lower: document.getElementById('req-lower'),
    number: document.getElementById('req-number'),
    special: document.getElementById('req-special')
  };

  if (pwInput && strengthContainer) {
    pwInput.addEventListener('focus', () => {
      strengthContainer.style.display = 'block';
    });

    pwInput.addEventListener('input', () => {
      const val = pwInput.value;
      const tests = {
        length: val.length >= 8,
        upper: /[A-Z]/.test(val),
        lower: /[a-z]/.test(val),
        number: /[0-9]/.test(val),
        special: /[^A-Za-z0-9]/.test(val)
      };

      let score = 0;
      for (const key in tests) {
        if (tests[key]) {
          score++;
          if (reqs[key]) {
            reqs[key].style.color = 'var(--lime)';
            reqs[key].textContent = '✓' + reqs[key].textContent.slice(1);
          }
        } else {
          if (reqs[key]) {
            reqs[key].style.color = 'var(--cream-muted)';
            reqs[key].textContent = '✕' + reqs[key].textContent.slice(1);
          }
        }
      }

      const width = (score / 5) * 100;
      strengthBar.style.width = width + '%';

      if (score <= 1) {
        strengthBar.style.backgroundColor = 'var(--marmalade)';
        strengthText.textContent = 'Weak';
        strengthText.style.color = 'var(--marmalade)';
      } else if (score <= 3) {
        strengthBar.style.backgroundColor = 'var(--marmalade-2)';
        strengthText.textContent = 'Medium';
        strengthText.style.color = 'var(--marmalade-2)';
      } else if (score < 5) {
        strengthBar.style.backgroundColor = 'var(--lime)';
        strengthText.textContent = 'Strong';
        strengthText.style.color = 'var(--lime)';
      } else {
        strengthBar.style.backgroundColor = 'var(--lime-2)';
        strengthText.textContent = 'Very Strong';
        strengthText.style.color = 'var(--lime-2)';
      }

      // Show/clear validation error message in real time below the field
      if (!val) {
        clearState(pwInput);
      } else if (score < 5) {
        showError(pwInput, 'Password must meet all security requirements.');
      } else {
        showOk(pwInput);
      }

      // Also update confirm password if filled
      const confirm = document.getElementById('mk9-confirm-password');
      if (confirm && confirm.value) validateField(confirm);
    });
  }

  // Real-time feedback
  form.querySelectorAll('input:not([type="file"]), select, textarea').forEach(inp => {
    inp.addEventListener('blur', () => validateField(inp));
    inp.addEventListener('input', () => {
      // For general fields, validate on input if already has error, or if it is confirm password
      if (inp.classList.contains('mk9-form__input--error') || inp.id === 'mk9-confirm-password' || inp.id === 'mk9-phone' || inp.type === 'email') {
        validateField(inp);
      }
    });
  });

  // ── Image / File Uploads with Preview & Remove ──────────────────
  document.querySelectorAll('.mk9-file-upload').forEach(el => {
    const input  = el.querySelector('input[type="file"]');
    const nameEl = el.querySelector('.mk9-file-upload__name');
    const removeBtn = el.querySelector('.mk9-file-upload__remove');
    if (!input || !nameEl) return;

    // Drag events
    ['dragenter','dragover','dragleave','drop'].forEach(ev =>
      el.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
    );
    ['dragenter','dragover'].forEach(ev => el.addEventListener(ev, () => el.classList.add('dragover')));
    ['dragleave','drop'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('dragover')));

    el.addEventListener('drop', e => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        try { input.files = e.dataTransfer.files; } catch(_) {}
        showFilePreview(input, nameEl, el);
      }
    });

    input.addEventListener('change', () => showFilePreview(input, nameEl, el));

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        el.classList.remove('has-file');
        nameEl.innerHTML = '';
        el.style.borderColor = '';
      });
    }
  });

  const showFilePreview = (input, nameEl, container) => {
    if (!input.files || !input.files[0]) {
      nameEl.innerHTML = '';
      container.classList.remove('has-file');
      if (input.required) container.style.borderColor = 'var(--marmalade)';
      return;
    }

    const file    = input.files[0];
    const isImage = file.type.startsWith('image/');

    container.style.borderColor = 'var(--lime)';
    container.classList.add('has-file');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => {
        nameEl.innerHTML = `
          <img src="${e.target.result}"
               style="max-height:50px;max-width:100%;border-radius:6px;margin-top:4px;object-fit:contain;display:block;margin-left:auto;margin-right:auto;"
               alt="Preview">
          <div style="font-size:10px;color:var(--lime);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;margin-left:auto;margin-right:auto;">${MK9.escHtml(file.name)}</div>`;
      };
      reader.readAsDataURL(file);
    } else {
      nameEl.innerHTML = `
        <div style="font-size:24px;margin-top:4px;">📄</div>
        <div style="font-size:10px;color:var(--lime);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;margin-left:auto;margin-right:auto;">${MK9.escHtml(file.name)}</div>`;
    }
  };

  // ── Math Captcha Logic ───────────────────────────────────────────
  const captchaQuestion = document.getElementById('captcha-question');
  const refreshBtn = document.getElementById('btn-refresh-captcha');
  const captchaInput = document.getElementById('mk9-register-captcha');

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

  // ── Full-form validation on submit ───────────────────────────────
  const validateAll = () => {
    let valid = true;

    form.querySelectorAll('input:not([type="file"]), select, textarea').forEach(inp => {
      if (!validateField(inp)) valid = false;
    });

    // Check required files
    ['university_card_front','profile_picture'].forEach(name => {
      const inp = form.querySelector(`[name="${name}"]`);
      if (inp && !inp.files.length) {
        const box = inp.closest('.mk9-file-upload');
        if (box) box.style.borderColor = 'var(--marmalade)';
        valid = false;
      }
    });

    // Check captcha if reCAPTCHA is not active
    const isReCaptchaActive = typeof grecaptcha !== 'undefined';
    if (!isReCaptchaActive && captchaInput && !captchaInput.value.trim()) {
      captchaInput.classList.add('mk9-form__input--error');
      valid = false;
    }

    if (!valid) MK9.toast('Please complete all required fields and security checks.', 'error');
    return valid;
  };

  // ── Form Submit ──────────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateAll()) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="mk9-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.3);border-top-color:#000;border-radius:50%;animation:mk9spin .7s linear infinite;vertical-align:middle;margin-right:8px;"></span>Uploading &amp; encrypting files…';
    }

    if (!document.getElementById('mk9-spin-style')) {
      const s = document.createElement('style');
      s.id = 'mk9-spin-style';
      s.textContent = '@keyframes mk9spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }

    const doSubmit = async (recaptchaToken = '') => {
      try {
        const fd = new FormData(form);
        if (recaptchaToken) {
          fd.append('recaptcha_token', recaptchaToken);
        }
        const res = await MK9.ajax('mk9_bdm_register', fd);

        if (res.success) {
          MK9.toast('Application submitted! You will be notified within 1–2 business days.', 'success');
          form.reset();
          document.querySelectorAll('.mk9-file-upload__name').forEach(el => el.innerHTML = '');
          document.querySelectorAll('.mk9-file-upload').forEach(el => {
            el.style.borderColor = '';
            el.classList.remove('has-file');
          });
          setTimeout(() => window.location.href = '/login', 2500);
        } else {
          MK9.toast(res.data?.message || 'Registration failed. Please try again.', 'error');
          if (typeof refreshCaptcha === 'function' && !recaptchaToken) refreshCaptcha();
          if (submitBtn) {
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Submit Application';
          }
        }
      } catch (err) {
        MK9.toast('Network error during submission. Please try again.', 'error');
        if (typeof refreshCaptcha === 'function' && !recaptchaToken) refreshCaptcha();
        if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Submit Application';
        }
      }
    };

    const isReCaptchaActive = typeof grecaptcha !== 'undefined';
    if (isReCaptchaActive) {
      let siteKey = '';
      const scriptEl = Array.from(document.querySelectorAll('script')).find(s => s.src.includes('recaptcha/api.js'));
      if (scriptEl) {
        const urlParams = new URLSearchParams(scriptEl.src.split('?')[1]);
        siteKey = urlParams.get('render') || '';
      }

      if (siteKey) {
        grecaptcha.ready(() => {
          grecaptcha.execute(siteKey, {action: 'register'}).then((token) => {
            doSubmit(token);
          }).catch(err => {
            MK9.toast('reCAPTCHA Error. Please refresh and try again.', 'error');
            if (submitBtn) {
              submitBtn.disabled    = false;
              submitBtn.textContent = 'Submit Application';
            }
          });
        });
      } else {
        doSubmit();
      }
    } else {
      doSubmit();
    }
  });
});
