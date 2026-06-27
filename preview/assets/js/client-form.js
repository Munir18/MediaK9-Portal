/* ═══════════════════════════════════════════════════════════════════
   MK9 BDM PORTAL - client-form.js
   Client application form - BDM code validation + AJAX submission
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('mk9-client-form');
  if (!form) return;

  const submitBtn  = document.getElementById('mk9-client-submit');
  const codeInput  = document.getElementById('mk9-bdm-code');
  const codeStatus = document.getElementById('mk9-code-status');
  const codeError  = document.getElementById('mk9-code-error');
  const codeBox    = codeInput?.closest('div') || null;   // orange wrapper box
  let   codeValid  = false;
  let   codeTimer  = null;

  // ─── BDM Code Live Validation ─────────────────────────────────
  if (codeInput) {
    // Hide error once user starts typing again
    codeInput.addEventListener('input', () => {
      const val = codeInput.value.toUpperCase().trim();
      codeInput.value = val;
      codeValid = false;
      clearTimeout(codeTimer);
      if (codeError) { codeError.style.display = 'none'; codeError.textContent = ''; }

      if (!val) {
        setCodeStatus('', '');
        return;
      }

      if (!/^MK9-\d+$/.test(val)) {
        setCodeStatus('error', 'Format must be MK9-XXX (e.g. MK9-101)');
        return;
      }

      setCodeStatus('checking', 'Verifying code...');

      codeTimer = setTimeout(async () => {
        try {
          const res = await MK9.ajax('mk9_validate_bdm_code', { code: val });
          if (res.success) {
            codeValid = true;
            setCodeStatus('success', ' Valid - BDM verified');
            codeInput.classList.add('mk9-form__input--success');
            codeInput.classList.remove('mk9-form__input--error');
          } else {
            codeValid = false;
            setCodeStatus('error', 'Invalid or inactive BDM code.');
            codeInput.classList.add('mk9-form__input--error');
            codeInput.classList.remove('mk9-form__input--success');
          }
        } catch {
          setCodeStatus('error', 'Could not verify. Please try again.');
        }
      }, 600);
    });
  }

  const setCodeStatus = (type, message) => {
    if (!codeStatus) return;
    const colors = { success: '#34D399', error: '#F87171', checking: '#FBBF24', '': '' };
    codeStatus.textContent = message;
    codeStatus.style.color = colors[type] || 'var(--mk9-cream-muted)';
    codeStatus.style.display = message ? 'block' : 'none';
  };

  // ─── Real-time Validation ─────────────────────────────────────
  form.querySelectorAll('input:not([type="file"]), select, textarea').forEach(input => {
    input.addEventListener('blur', () => validateClientField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('mk9-form__input--error')) validateClientField(input);
    });
  });

  const validateClientField = (input) => {
    const group = input.closest('.mk9-form__group');
    const errorEl = group?.querySelector('.mk9-form__error');
    let valid = true, msg = '';

    input.classList.remove('mk9-form__input--error', 'mk9-form__input--success');

    if (input.required && !input.value.trim()) {
      valid = false; msg = 'This field is required.';
    } else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      valid = false; msg = 'Please enter a valid email.';
    }

    if (errorEl) { errorEl.textContent = msg; errorEl.classList.toggle('active', !valid); }
    if (input.value.trim()) input.classList.add(valid ? 'mk9-form__input--success' : 'mk9-form__input--error');

    return valid;
  };

  // ─── Form Submit ──────────────────────────────────────────────
  submitBtn && submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Validate all fields
    let allValid = true;
    form.querySelectorAll('input:not([type="file"])[required], select[required], textarea[required]').forEach(input => {
      if (!validateClientField(input)) allValid = false;
    });

    if (!allValid) {
      MK9.toast('Please fill in all required fields.', 'error');
      return;
    }

    // BDM code is required — block if empty or invalid
    if (!codeInput || !codeInput.value.trim()) {
      if (codeError) { codeError.textContent = 'BDM code is required. Please enter your code.'; codeError.style.display = 'block'; }
      if (codeBox)   codeBox.style.borderColor = '#F87171';
      codeInput?.focus();
      MK9.toast('BDM code is required before submitting.', 'error');
      return;
    }

    if (!codeValid) {
      if (codeError) { codeError.textContent = 'Please enter a valid, verified BDM code.'; codeError.style.display = 'block'; }
      if (codeBox)   codeBox.style.borderColor = '#F87171';
      codeInput?.focus();
      MK9.toast('Please enter a valid BDM code before submitting.', 'error');
      return;
    }

    // Code is valid — clear any error styling
    if (codeError) { codeError.style.display = 'none'; }
    if (codeBox)   codeBox.style.borderColor = '';

    MK9.setButtonLoading(submitBtn, true);

    const doSubmit = async (recaptchaToken = '') => {
      const data = {
        organization_name:   form.querySelector('[name="organization_name"]')?.value?.trim(),
        contact_name:        form.querySelector('[name="contact_name"]')?.value?.trim(),
        contact_email:       form.querySelector('[name="contact_email"]')?.value?.trim(),
        contact_phone:       form.querySelector('[name="contact_phone"]')?.value?.trim(),
        service_required:    form.querySelector('[name="service_required"]')?.value?.trim(),
        budget:              form.querySelector('[name="budget"]')?.value?.trim(),
        website:             form.querySelector('[name="website"]')?.value?.trim(),
        timeline:            form.querySelector('[name="timeline"]')?.value?.trim(),
        project_description: form.querySelector('[name="project_description"]')?.value?.trim(),
        competitors:         form.querySelector('[name="competitors"]')?.value?.trim(),
        bdm_code:            codeInput?.value?.trim(),
      };
      if (recaptchaToken) {
        data.recaptcha_token = recaptchaToken;
      }

      try {
        const res = await MK9.ajax('mk9_client_apply', data);

        if (res.success) {
          const container = document.getElementById('mk9-client-container');
          if (container) {
            container.innerHTML = `
              <div class="mk9-success-screen">
                <div class="mk9-success-screen__icon"></div>
                <h2 class="mk9-success-screen__title">Application Received!</h2>
                <p class="mk9-success-screen__message">
                  Thank you for your interest in working with <strong>MediaK9</strong>.
                  Your application has been submitted and is currently under review.
                  You will be contacted within <strong>2–3 business days</strong>.
                </p>
                <a href="/" class="mk9-btn mk9-btn--secondary">← Back to Home</a>
              </div>
            `;
          }
        } else {
          MK9.toast(res.data?.message || 'Submission failed. Please try again.', 'error');
          MK9.setButtonLoading(submitBtn, false);
        }
      } catch {
        MK9.toast('Network error. Please check your connection.', 'error');
        MK9.setButtonLoading(submitBtn, false);
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
          grecaptcha.execute(siteKey, {action: 'client_apply'}).then((token) => {
            doSubmit(token);
          }).catch(err => {
            MK9.toast('reCAPTCHA Error. Please refresh and try again.', 'error');
            MK9.setButtonLoading(submitBtn, false);
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
