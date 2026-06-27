/* ═══════════════════════════════════════════════════════════════════
   MK9 BDM PORTAL - registration.js
   Fixed: action name, password match, eye toggle, image preview
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
    if (input.id === 'mk9-password' && val.length < 8) {
      showError(input, 'Password must be at least 8 characters.'); return false;
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

  // Real-time feedback
  form.querySelectorAll('input:not([type="file"]), select, textarea').forEach(inp => {
    inp.addEventListener('blur', () => validateField(inp));
    inp.addEventListener('input', () => {
      if (inp.classList.contains('mk9-form__input--error')) validateField(inp);
      // also re-validate confirm-password when password changes
      if (inp.id === 'mk9-password') {
        const confirm = document.getElementById('mk9-confirm-password');
        if (confirm && confirm.value) validateField(confirm);
      }
    });
  });

  // CNIC number auto-formatter (XXXXX-XXXXXXX-X)
  const cnicInput = document.getElementById('cnic_number');
  if (cnicInput) {
    cnicInput.addEventListener('input', () => {
      const start = cnicInput.selectionStart;
      const raw   = cnicInput.value;
      const clean = raw.replace(/\D/g, '').slice(0, 13);
      let formatted = clean;
      if (clean.length > 5 && clean.length <= 12) {
        formatted = clean.slice(0, 5) + '-' + clean.slice(5);
      } else if (clean.length === 13) {
        formatted = clean.slice(0, 5) + '-' + clean.slice(5, 12) + '-' + clean.slice(12);
      }
      cnicInput.value = formatted;
      const extraDashes = (formatted.slice(0, start).match(/-/g) || []).length -
                          (raw.slice(0, start).match(/-/g) || []).length;
      cnicInput.setSelectionRange(start + extraDashes, start + extraDashes);
    });
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

  // ── Image / File Uploads with Preview ───────────────────────────
  document.querySelectorAll('.mk9-file-upload').forEach(el => {
    const input  = el.querySelector('input[type="file"]');
    const nameEl = el.querySelector('.mk9-file-upload__name');
    if (!input || !nameEl) return;

    // Drag events
    ['dragenter','dragover','dragleave','drop'].forEach(ev =>
      el.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
    );
    ['dragenter','dragover'].forEach(ev => el.addEventListener(ev, () => el.classList.add('dragover')));
    ['dragleave','drop'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('dragover')));

    el.addEventListener('drop', e => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        // Assign dropped files to the input
        try { input.files = e.dataTransfer.files; } catch(_) {}
        showFilePreview(input, nameEl, el);
      }
    });

    input.addEventListener('change', () => showFilePreview(input, nameEl, el));
  });

  const showFilePreview = (input, nameEl, container) => {
    if (!input.files || !input.files[0]) {
      nameEl.innerHTML = '';
      if (input.required) container.style.borderColor = 'var(--marmalade)';
      return;
    }

    const file    = input.files[0];
    const isImage = file.type.startsWith('image/');

    container.style.borderColor = 'var(--lime)';

    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => {
        nameEl.innerHTML = `
          <img src="${e.target.result}"
               style="max-height:80px;max-width:100%;border-radius:6px;margin-top:8px;object-fit:contain;display:block;margin-left:auto;margin-right:auto;"
               alt="Preview">
          <div style="font-size:11px;color:var(--lime);margin-top:6px;">${MK9.escHtml(file.name)}</div>`;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF / non-image - just show name
      nameEl.innerHTML = `<div style="font-size:11px;color:var(--lime);margin-top:6px;">📄 ${MK9.escHtml(file.name)}</div>`;
    }
  };

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

    if (!valid) MK9.toast('Please complete all required fields and uploads.', 'error');
    return valid;
  };

  // ── Form Submit ──────────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateAll()) return;

    if (submitBtn) {
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Submitting Application...';
    }

    try {
      const fd = new FormData(form);
      // correct action name
      const res = await MK9.ajax('mk9_bdm_register', fd);

      if (res.success) {
        MK9.toast('Application submitted! You will be notified within 1–2 business days.', 'success');
        form.reset();
        // clear all previews
        document.querySelectorAll('.mk9-file-upload__name').forEach(el => el.innerHTML = '');
        document.querySelectorAll('.mk9-file-upload').forEach(el => el.style.borderColor = '');
        setTimeout(() => window.location.href = '/login', 2500);
      } else {
        MK9.toast(res.data?.message || 'Registration failed. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Submit Application';
        }
      }
    } catch (err) {
      MK9.toast('Network error during submission. Please try again.', 'error');
      if (submitBtn) {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit Application';
      }
    }
  });
});
