/* ═══════════════════════════════════════════════════════════════════
   MK9 BDM PORTAL - dashboard.js
   Fetch dashboard data, render projects, change request form
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const dashEl = document.getElementById('mk9-dashboard');
  if (!dashEl) return;

  // If admin is in impersonation mode, wire up the "Exit Admin View" button
  const isAdminView = dashEl.dataset.adminView === '1';
  if (isAdminView) {
    const exitBtn = document.getElementById('mk9-exit-admin-view');
    if (exitBtn) {
      exitBtn.addEventListener('click', async () => {
        exitBtn.textContent = 'Exiting...';
        exitBtn.disabled = true;
        try {
          const fd = new FormData();
          fd.append('action', 'mk9_admin_stop_impersonate');
          fd.append('nonce', mk9_admin.nonce);
          const res = await fetch(mk9_admin.url, { method: 'POST', credentials: 'same-origin', body: fd });
          const json = await res.json();
          window.location.href = json.data?.redirect || '/admin';
        } catch { window.location.href = '/admin'; }
      });
    }
  }

  // ─── Admin AJAX helper (uses admin-handler, not portal-handler) ──
  // Only available when admin is in impersonation mode and mk9_admin global exists
  const adminAjax = isAdminView && typeof mk9_admin !== 'undefined'
    ? async (action, data = {}) => {
        const fd = new FormData();
        fd.append('action', action);
        fd.append('nonce', mk9_admin.nonce);
        Object.keys(data).forEach(k => fd.append(k, data[k]));
        const res = await fetch(mk9_admin.url, { method: 'POST', credentials: 'same-origin', body: fd });
        return res.json();
      }
    : async () => ({ success: false, data: { message: 'Admin AJAX not available.' } });

  // ─── Load Dashboard Data ──────────────────────────────────────
  const showLoader = (id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="mk9-loader"><div class="mk9-loader__ring"></div></div>`;
  };

  const renderBadge = (status) => {
    const labels = {
      pending:   { text: 'Pending',   cls: 'mk9-badge--pending' },
      ongoing:   { text: 'Ongoing',   cls: 'mk9-badge--ongoing' },
      completed: { text: 'Completed', cls: 'mk9-badge--completed' },
      approved:  { text: 'Approved',  cls: 'mk9-badge--approved' },
      rejected:  { text: 'Rejected',  cls: 'mk9-badge--rejected' },
      'on-hold': { text: 'On Hold',   cls: 'mk9-badge--on-hold' },
    };
    const b = labels[status] || { text: status, cls: '' };
    return `<span class="mk9-badge ${b.cls}"><span class="mk9-badge__dot"></span>${MK9.escHtml(b.text)}</span>`;
  };

  // Each project card carries data attributes so the admin edit handler can read them
  const renderProjectCard = (project) => {
    // admin_notes from mk9_clients (pending/rejected), notes from mk9_projects (ongoing/completed)
    const notes = project.admin_notes || project.notes || '';
    const notesHtml = notes
      ? `<div class="mk9-project-card__notes" style="font-size:12px;color:var(--cream-dim);margin-top:8px;padding-top:8px;border-top:1px dashed var(--hairline);word-break:break-word;">
           <strong>Admin Notes:</strong> ${MK9.escHtml(notes)}
         </div>`
      : '';
    const statusColor = {
      pending:   'var(--marmalade)',
      ongoing:   'var(--lime)',
      completed: '#4ade80',
      approved:  '#4ade80',
      rejected:  '#f87171',
      'on-hold': '#f59e0b',
    }[project.status] || 'var(--cream-dim)';

    // Determine which DB table this row lives in
    const dbTable = (project.status === 'pending' || project.status === 'rejected')
      ? 'mk9_clients'
      : 'mk9_projects';

    const adminEditBtn = isAdminView
      ? `<button class="mk9-btn mk9-btn--ghost mk9-btn--sm admin-edit-project-btn"
            style="font-size:11px;padding:4px 10px;margin-top:10px;border-color:rgba(232,84,28,.4);color:var(--marmalade);"
            data-project-id="${project.id}"
            data-db-table="${dbTable}"
            data-project='${JSON.stringify(project).replace(/'/g, "&#39;")}'>
            Admin: Edit This Record
         </button>`
      : '';

    return `
      <div class="mk9-project-card" style="flex-direction:column;align-items:stretch;border-left:3px solid ${statusColor};">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
          <div class="mk9-project-card__info">
            <div class="mk9-project-card__icon" style="background:rgba(196,229,56,.08);color:var(--lime);font-weight:700;font-size:13px;">P</div>
            <div>
              <div class="mk9-project-card__name">${MK9.escHtml(project.organization_name)}</div>
              ${project.service_required ? `<div style="font-size:11px;color:var(--cream-muted);margin-top:2px;">${MK9.escHtml(project.service_required)}</div>` : ''}
              <div style="display:flex;gap:12px;align-items:center;margin-top:4px;">
                <span class="mk9-project-card__date" style="margin-top:0;">${MK9.formatDate(project.created_at)}</span>
                ${project.budget ? `<span style="font-size:11px;color:var(--lime);font-weight:600;background:rgba(196,229,56,.05);padding:2px 6px;border-radius:4px;border:1px solid rgba(196,229,56,.1);font-family:'JetBrains Mono',monospace;">${MK9.escHtml(project.budget)}</span>` : ''}
              </div>
            </div>
          </div>
          ${renderBadge(project.status)}
        </div>
        ${notesHtml}
        ${adminEditBtn}
      </div>
    `;
  };

  const renderProjectSection = (containerId, projects, emptyIcon, emptyText) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!projects || !projects.length) {
      el.innerHTML = `
        <div class="mk9-empty">
          <div class="mk9-empty__title">${emptyText}</div>
        </div>
      `;
      return;
    }
    el.innerHTML = `<div class="mk9-project-list">${projects.map(renderProjectCard).join('')}</div>`;
    // Bind admin edit buttons after render
    if (isAdminView) {
      el.querySelectorAll('.admin-edit-project-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const project = JSON.parse(btn.dataset.project || '{}');
          showAdminEditProjectModal(project, btn.dataset.projectId, btn.dataset.dbTable);
        });
      });
    }
  };

  // Store profile globally so admin edit modal can reference it
  let _loadedProfile = null;

  try {
    showLoader('mk9-projects-pending');
    showLoader('mk9-projects-ongoing');
    showLoader('mk9-projects-completed');

    const res = await MK9.ajax('mk9_get_dashboard_data');

    if (!res.success) {
      MK9.toast(res.data?.message || 'Failed to load dashboard.', 'error');
      return;
    }

    const { profile, projects, counts, change_requests } = res.data;
    _loadedProfile = profile;

    // ─── Update Profile Header ─────────────────────────────────
    const nameEl = document.getElementById('mk9-profile-name');
    const codeEl = document.getElementById('mk9-profile-code');
    const avatarEl = document.getElementById('mk9-profile-avatar');

    if (nameEl) nameEl.textContent = profile.name;
    if (codeEl) codeEl.textContent = profile.bdm_code;
    if (avatarEl) {
      if (profile.profile_picture) {
        // Show actual profile picture
        avatarEl.style.backgroundImage = `url('/api/serve-file.php?file=${encodeURIComponent(profile.profile_picture)}')`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      } else {
        avatarEl.textContent = profile.name.charAt(0).toUpperCase();
      }
    }

    // ─── Update Stat Cards ─────────────────────────────────────
    const setCount = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '0';
        animateCount(el, val);
      }
    };

    setCount('mk9-count-total',     counts.total);
    setCount('mk9-count-pending',   counts.pending);
    setCount('mk9-count-ongoing',   counts.ongoing);
    setCount('mk9-count-completed', counts.completed);
    setCount('mk9-count-rejected',  counts.rejected);

    // ─── Update Sidebar Nav Badge ──────────────────────────────
    const pendingBadge = document.getElementById('mk9-pending-badge');
    if (pendingBadge && counts.pending > 0) {
      pendingBadge.textContent = counts.pending;
      pendingBadge.style.display = 'inline-flex';
    }

    // ─── Render Project Sections ───────────────────────────────
    renderProjectSection('mk9-projects-pending',   projects.pending,   '', 'No pending projects');
    renderProjectSection('mk9-projects-ongoing',   projects.ongoing,   '', 'No ongoing projects');
    renderProjectSection('mk9-projects-completed', projects.completed, '', 'No completed projects');

    const rejectedSection = document.getElementById('mk9-section-rejected');
    if (rejectedSection) {
      if (counts.rejected > 0) {
        rejectedSection.style.display = 'block';
        renderProjectSection('mk9-projects-rejected', projects.rejected, '', 'No rejected leads');
      } else {
        rejectedSection.style.display = 'none';
      }
    }

    // ─── Bonus Progress Bar ────────────────────────────────────
    const bonusText = document.getElementById('mk9-bonus-text');
    const bonusBar = document.getElementById('mk9-bonus-bar');
    if (bonusText && bonusBar) {
      const qualified = counts.ongoing + counts.completed;
      const pct = Math.min(100, Math.round((qualified / 5) * 100));
      bonusText.textContent = `${qualified}/5 Projects`;
      setTimeout(() => { bonusBar.style.width = pct + '%'; }, 100);
    }

    // ─── Profile Fields ────────────────────────────────────────
    const profileFields = {
      'mk9-field-email':       profile.email,
      'mk9-field-phone':       profile.phone,
      'mk9-field-father-name': profile.father_name,
      'mk9-field-bdm-code':    profile.bdm_code,
      'mk9-field-joined':      MK9.formatDate(profile.joined),
    };
    Object.entries(profileFields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '-';
    });

    // ─── Edit Profile / Change Request Buttons ─────────────────
    const editBtn = document.getElementById('mk9-edit-profile-btn');
    const editBadge = document.getElementById('mk9-edit-info');
    const editChangesBtn = document.getElementById('mk9-edit-profile-btn-changes');

    if (isAdminView) {
      // Hide BDM-only buttons
      if (editBtn) editBtn.style.display = 'none';
      if (editBadge) editBadge.style.display = 'none';
      if (editChangesBtn) editChangesBtn.style.display = 'none';

      // Inject admin-only "Edit Full Profile" button into the profile view header
      const profileHeader = document.querySelector('#mk9-view-profile > div:first-child > div:last-child');
      if (profileHeader) {
        const adminProfileBtn = document.createElement('button');
        adminProfileBtn.className = 'btn btn-pri';
        adminProfileBtn.id = 'mk9-admin-edit-profile-btn';
        adminProfileBtn.textContent = 'Admin: Edit Full Profile';
        adminProfileBtn.style.cssText = 'padding:10px 16px;font-size:13px;background:var(--marmalade);border-color:var(--marmalade);';
        profileHeader.appendChild(adminProfileBtn);
        adminProfileBtn.addEventListener('click', () => showAdminEditProfileModal(profile));
      }
    } else {
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          showEditProfileForm(profile);
        });
      }
      if (editChangesBtn) {
        editChangesBtn.addEventListener('click', () => {
          showChangeRequestForm();
        });
      }
      const changePasswordBtn = document.getElementById('mk9-change-password-btn');
      if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
          showChangePasswordForm();
        });
      }
    }

    // ─── Change Requests History ───────────────────────────────
    renderChangeRequests(change_requests);

  } catch (err) {
    MK9.toast('Failed to load dashboard data: ' + err.message, 'error');
    console.error(err);
    // Clear all loaders so they don't stay stuck on "Loading..."
    ['mk9-projects-pending','mk9-projects-ongoing','mk9-projects-completed'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="mk9-empty"><div class="mk9-empty__title">Could not load data</div></div>';
    });
    renderChangeRequests([]);
  }

  // ─── Animate Count ────────────────────────────────────────────
  function animateCount(el, target) {
    const duration = 800;
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // ─── Change Requests History ──────────────────────────────────
  function renderChangeRequests(requests) {
    const container = document.getElementById('mk9-change-requests-list');
    if (!container) return;

    if (!requests || !requests.length) {
      container.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--cream-muted);">
          <div style="font-size:32px;margin-bottom:12px;">📋</div>
          <div style="font-weight:600;margin-bottom:6px;">No Change Requests Yet</div>
          <div style="font-size:13px;line-height:1.5;">Once you submit a change request, it will appear here with its review status.</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="mk9-cr-list">
        ${requests.map(cr => `
          <div class="mk9-cr-item">
            <div>
              <div class="mk9-cr-item__field">${MK9.escHtml((cr.field_name || cr.field || '').replace(/_/g, ' '))}</div>
              <div class="mk9-cr-item__date">${MK9.formatDate(cr.created_at)}</div>
            </div>
            <span class="mk9-badge mk9-badge--${cr.status}">
              <span class="mk9-badge__dot"></span>${MK9.escHtml(cr.status)}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── File Upload Preview Helper ───────────────────────────────
  function bindFileUploadPreview(container) {
    const input = container.querySelector('input[type="file"]');
    const nameEl = container.querySelector('.mk9-file-upload__name');
    if (!input || !nameEl) return;

    const showFilePreview = () => {
      if (!input.files || !input.files[0]) {
        nameEl.innerHTML = '';
        return;
      }
      const file = input.files[0];
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
        nameEl.innerHTML = `<div style="font-size:11px;color:var(--lime);margin-top:6px;">📄 ${MK9.escHtml(file.name)}</div>`;
      }
    };

    input.addEventListener('change', showFilePreview);

    // drag and drop events
    ['dragenter','dragover','dragleave','drop'].forEach(ev =>
      container.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
    );
    ['dragenter','dragover'].forEach(ev => container.addEventListener(ev, () => container.classList.add('dragover')));
    ['dragleave','drop'].forEach(ev => container.addEventListener(ev, () => container.classList.remove('dragover')));
    container.addEventListener('drop', e => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        try { input.files = e.dataTransfer.files; } catch(_) {}
        showFilePreview();
      }
    });
  }

  // ─── Edit Profile Form (BDM self-edit) ───
  function showEditProfileForm(profile) {
    MK9.modal.open(`
      <form id="mk9-edit-profile-form">
        <div class="mk9-form__group">
          <label class="mk9-form__label">Full Name</label>
          <input type="text" name="full_name" class="mk9-form__input" value="${MK9.escHtml(profile.name)}" required>
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label">Phone Number</label>
          <input type="tel" name="phone" id="mk9-edit-phone" class="mk9-form__input" value="${MK9.escHtml(profile.phone || '')}" placeholder="03XX-XXXXXXX" required>
        </div>
      </form>
    `, {
      title: 'Edit Profile',
      footer: `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" onclick="MK9.modal.close()">Cancel</button>
        <button class="mk9-btn mk9-btn--primary mk9-btn--sm" id="mk9-save-profile">Save Changes</button>
      `,
    });

    // Real-time phone formatter
    const phoneInput = document.getElementById('mk9-edit-phone');
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

    document.getElementById('mk9-save-profile')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const nameVal = document.querySelector('#mk9-edit-profile-form [name="full_name"]').value.trim();
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';

      if (!nameVal || !phoneVal) {
        MK9.toast('Name and phone number are required.', 'error');
        return;
      }
      if (!/^\d{4}-\d{7}$/.test(phoneVal)) {
        MK9.toast('Phone number must be 11 digits like (0318-6072309).', 'error');
        return;
      }

      MK9.setButtonLoading(btn, true);

      const editForm = document.getElementById('mk9-edit-profile-form');
      const fd = new FormData(editForm);
      fd.append('action', 'mk9_update_profile');
      fd.append('nonce', mk9_ajax.nonce);

      try {
        const res = await fetch(mk9_ajax.url, { method: 'POST', credentials: 'same-origin', body: fd }).then(r => r.json());

        if (res.success) {
          MK9.modal.close();
          MK9.toast('Profile updated successfully!', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          MK9.toast(res.data?.message || 'Update failed.', 'error');
          MK9.setButtonLoading(btn, false);
        }
      } catch {
        MK9.toast('Network error.', 'error');
        MK9.setButtonLoading(btn, false);
      }
    });
  }

  // ─── Change Password Form (BDM Password Change) ────────
  function showChangePasswordForm() {
    MK9.modal.open(`
      <form id="mk9-change-password-form" autocomplete="off">
        <div class="mk9-form__group">
          <label class="mk9-form__label mk9-form__label--required">Current Password</label>
          <input type="password" id="mk9-cr-curr-pw" class="mk9-form__input" placeholder="Enter current password" required autocomplete="current-password">
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label mk9-form__label--required">New Password</label>
          <input type="password" id="mk9-cr-new-pw" class="mk9-form__input" placeholder="Min. 8 characters" required autocomplete="new-password">
          <div id="cr-pw-strength-bar-container" style="display:none; margin-top:8px;">
            <div style="height:4px; width:100%; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
              <div id="cr-pw-strength-bar" style="height:100%; width:0%; transition:width 0.3s, background-color 0.3s;"></div>
            </div>
            <div id="cr-pw-strength-text" style="font-size:10px; color:var(--cream-muted); margin-top:4px; font-family:'JetBrains Mono',monospace; text-transform:uppercase;"></div>
          </div>
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label mk9-form__label--required">Confirm New Password</label>
          <input type="password" id="mk9-cr-conf-pw" class="mk9-form__input" placeholder="Re-enter new password" required autocomplete="new-password">
        </div>
      </form>
    `, {
      title: 'Change Password',
      footer: `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" onclick="MK9.modal.close()">Cancel</button>
        <button class="mk9-btn mk9-btn--primary mk9-btn--sm" id="mk9-submit-pw-change">Change Password</button>
      `,
    });

    const newPwInput = document.getElementById('mk9-cr-new-pw');
    const strengthBarContainer = document.getElementById('cr-pw-strength-bar-container');
    const strengthBar = document.getElementById('cr-pw-strength-bar');
    const strengthText = document.getElementById('cr-pw-strength-text');

    if (newPwInput) {
      newPwInput.addEventListener('input', () => {
        const val = newPwInput.value;
        if (!val) {
          strengthBarContainer.style.display = 'none';
          return;
        }
        strengthBarContainer.style.display = 'block';

        const tests = {
          length: val.length >= 8,
          upper: /[A-Z]/.test(val),
          lower: /[a-z]/.test(val),
          number: /[0-9]/.test(val),
          special: /[^A-Za-z0-9]/.test(val)
        };

        let score = 0;
        for (const k in tests) { if (tests[k]) score++; }

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
      });
    }

    document.getElementById('mk9-submit-pw-change')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const current = document.getElementById('mk9-cr-curr-pw').value;
      const newPw = document.getElementById('mk9-cr-new-pw').value;
      const confirm = document.getElementById('mk9-cr-conf-pw').value;

      if (!current || !newPw || !confirm) {
        MK9.toast('All fields are required.', 'error');
        return;
      }
      if (newPw !== confirm) {
        MK9.toast('Passwords do not match.', 'error');
        return;
      }
      if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[a-z]/.test(newPw) || !/[0-9]/.test(newPw) || !/[^A-Za-z0-9]/.test(newPw)) {
        MK9.toast('New password is not strong enough.', 'error');
        return;
      }

      MK9.setButtonLoading(btn, true);

      try {
        const res = await MK9.ajax('mk9_change_password', {
          current_password: current,
          new_password: newPw,
          confirm_password: confirm
        });

        if (res.success) {
          MK9.modal.close();
          MK9.toast(res.data?.message || 'Password changed successfully!', 'success');
          setTimeout(() => location.reload(), 2000);
        } else {
          MK9.toast(res.data?.message || 'Failed to change password.', 'error');
          MK9.setButtonLoading(btn, false);
        }
      } catch {
        MK9.toast('Network error.', 'error');
        MK9.setButtonLoading(btn, false);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  ADMIN-ONLY MODALS  (only available when isAdminView === true)
  // ═══════════════════════════════════════════════════════════════

  // ─── Admin: Edit Full BDM Profile ────────────────────────────
  function showAdminEditProfileModal(profile) {
    MK9.modal.open(`
      <div style="margin-bottom:12px;padding:10px 14px;background:rgba(232,84,28,.08);border:1px solid rgba(232,84,28,.2);border-radius:8px;font-size:12px;color:var(--marmalade);">
        ADMIN MODE - Changes apply immediately. You are editing ${MK9.escHtml(profile.name)}'s account.
      </div>
      <form id="mk9-admin-profile-form">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:0;">
          <div class="mk9-form__group">
            <label class="mk9-form__label">Full Name</label>
            <input type="text" name="full_name" class="mk9-form__input" value="${MK9.escHtml(profile.name)}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Father's Name</label>
            <input type="text" name="father_name" class="mk9-form__input" value="${MK9.escHtml(profile.father_name || '')}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Phone Number</label>
            <input type="tel" name="phone" class="mk9-form__input" value="${MK9.escHtml(profile.phone || '')}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">BDM Code</label>
            <input type="text" name="bdm_code" class="mk9-form__input" value="${MK9.escHtml(profile.bdm_code || '')}" style="font-weight:700;color:var(--marmalade);" placeholder="e.g. MK9-101">
          </div>
        </div>

        <div style="margin:16px 0;border-top:1px solid var(--hairline);padding-top:16px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--cream-muted);margin-bottom:12px;">Login Credentials</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="mk9-form__group">
              <label class="mk9-form__label">Email Address</label>
              <input type="email" name="email" class="mk9-form__input" value="${MK9.escHtml(profile.email || '')}" placeholder="email@example.com">
            </div>
            <div class="mk9-form__group">
              <label class="mk9-form__label">New Password <span style="color:var(--cream-muted);font-size:10px;">(leave blank to keep)</span></label>
              <input type="password" name="new_password" class="mk9-form__input" placeholder="Min. 8 characters" autocomplete="new-password">
            </div>
          </div>
        </div>

        <div class="mk9-form__group" style="margin-top:4px;">
          <label class="mk9-form__label">Admin Notes <span style="color:var(--cream-muted);font-size:10px;">(internal, BDM cannot see)</span></label>
          <textarea name="admin_notes" class="mk9-form__input" rows="3" style="resize:vertical;">${MK9.escHtml(profile.admin_notes || '')}</textarea>
        </div>
      </form>
    `, {
      title: 'Admin: Edit BDM Full Profile',
      footer: `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" onclick="MK9.modal.close()">Cancel</button>
        <button class="mk9-btn mk9-btn--primary mk9-btn--sm" id="mk9-admin-save-profile" style="background:var(--marmalade);border-color:var(--marmalade);">Save All Changes</button>
      `,
    });

    document.getElementById('mk9-admin-save-profile')?.addEventListener('click', async (e) => {
      const btn = e.target;
      MK9.setButtonLoading(btn, true);
      const form = document.getElementById('mk9-admin-profile-form');
      const fd = new FormData(form);

      try {
        const res = await adminAjax('mk9_admin_edit_bdm_dashboard', {
          user_id:      profile.user_id,
          full_name:    fd.get('full_name') || '',
          father_name:  fd.get('father_name') || '',
          phone:        fd.get('phone') || '',
          bdm_code:     fd.get('bdm_code') || '',
          email:        fd.get('email') || '',
          new_password: fd.get('new_password') || '',
          admin_notes:  fd.get('admin_notes') || '',
        });

        if (res.success) {
          MK9.modal.close();
          MK9.toast(res.data?.message || 'BDM updated!', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          MK9.toast(res.data?.message || 'Update failed.', 'error');
          MK9.setButtonLoading(btn, false);
        }
      } catch {
        MK9.toast('Network error.', 'error');
        MK9.setButtonLoading(btn, false);
      }
    });
  }

  // ─── Admin: Edit Project / Client Record ─────────────────────
  function showAdminEditProjectModal(project, projectId, dbTable) {
    const isClient  = dbTable === 'mk9_clients';
    const isProject = dbTable === 'mk9_projects';

    // Build status dropdown only for mk9_projects rows
    const statusHtml = isProject ? `
      <div class="mk9-form__group">
        <label class="mk9-form__label">Project Status</label>
        <select name="status" class="mk9-form__select">
          <option value="pending"   ${project.status === 'pending'   ? 'selected' : ''}>Pending</option>
          <option value="ongoing"   ${project.status === 'ongoing'   ? 'selected' : ''}>Ongoing</option>
          <option value="on-hold"   ${project.status === 'on-hold'   ? 'selected' : ''}>On Hold</option>
          <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>` : '';

    // Extra fields only available on mk9_clients rows
    const clientFieldsHtml = isClient ? `
      <div style="margin-top:16px;border-top:1px solid var(--hairline);padding-top:16px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--cream-muted);margin-bottom:12px;">Client Contact Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="mk9-form__group">
            <label class="mk9-form__label">Contact Name</label>
            <input type="text" name="contact_name" class="mk9-form__input" value="${MK9.escHtml(project.contact_name || '')}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Contact Email</label>
            <input type="email" name="contact_email" class="mk9-form__input" value="${MK9.escHtml(project.contact_email || '')}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Contact Phone</label>
            <input type="tel" name="contact_phone" class="mk9-form__input" value="${MK9.escHtml(project.contact_phone || '')}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Website</label>
            <input type="url" name="website" class="mk9-form__input" value="${MK9.escHtml(project.website || '')}" placeholder="https://...">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Budget</label>
            <input type="text" name="budget" class="mk9-form__input" value="${MK9.escHtml(project.budget || '')}" placeholder="e.g. PKR 50,000/month">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Timeline</label>
            <input type="text" name="timeline" class="mk9-form__input" value="${MK9.escHtml(project.timeline || '')}" placeholder="e.g. 3 months">
          </div>
        </div>
        <div class="mk9-form__group" style="margin-top:12px;">
          <label class="mk9-form__label">Project Description</label>
          <textarea name="project_description" class="mk9-form__input" rows="3" style="resize:vertical;">${MK9.escHtml(project.project_description || '')}</textarea>
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label">Competitors</label>
          <input type="text" name="competitors" class="mk9-form__input" value="${MK9.escHtml(project.competitors || '')}" placeholder="Competitor names...">
        </div>
      </div>` : '';

    MK9.modal.open(`
      <div style="margin-bottom:12px;padding:10px 14px;background:rgba(232,84,28,.08);border:1px solid rgba(232,84,28,.2);border-radius:8px;font-size:12px;color:var(--marmalade);">
        ADMIN MODE - Editing <strong>${isClient ? 'Lead/Application' : 'Project'}</strong>: ${MK9.escHtml(project.organization_name)}
      </div>
      <form id="mk9-admin-project-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="mk9-form__group">
            <label class="mk9-form__label">Organization Name</label>
            <input type="text" name="organization_name" class="mk9-form__input" value="${MK9.escHtml(project.organization_name || '')}">
          </div>
          <div class="mk9-form__group">
            <label class="mk9-form__label">Service Required</label>
            <input type="text" name="service_required" class="mk9-form__input" value="${MK9.escHtml(project.service_required || '')}">
          </div>
        </div>
        ${statusHtml}
        <div class="mk9-form__group">
          <label class="mk9-form__label">Admin Notes / Internal Notes</label>
          <textarea name="${isClient ? 'admin_notes' : 'notes'}" class="mk9-form__input" rows="3" style="resize:vertical;">${MK9.escHtml(isClient ? (project.admin_notes || '') : (project.notes || ''))}</textarea>
        </div>
        ${clientFieldsHtml}
      </form>
    `, {
      title: `Admin: Edit ${isClient ? 'Lead Application' : 'Project'}`,
      footer: `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" onclick="MK9.modal.close()">Cancel</button>
        <button class="mk9-btn mk9-btn--primary mk9-btn--sm" id="mk9-admin-save-project" style="background:var(--marmalade);border-color:var(--marmalade);">Save Changes</button>
      `,
    });

    document.getElementById('mk9-admin-save-project')?.addEventListener('click', async (e) => {
      const btn = e.target;
      MK9.setButtonLoading(btn, true);
      const form = document.getElementById('mk9-admin-project-form');
      const fd   = new FormData(form);
      const payload = { id: projectId, db_table: dbTable };
      fd.forEach((v, k) => { payload[k] = v; });

      try {
        const res = await adminAjax('mk9_admin_edit_project_dashboard', payload);

        if (res.success) {
          MK9.modal.close();
          MK9.toast(res.data?.message || 'Record updated!', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          MK9.toast(res.data?.message || 'Update failed.', 'error');
          MK9.setButtonLoading(btn, false);
        }
      } catch {
        MK9.toast('Network error.', 'error');
        MK9.setButtonLoading(btn, false);
      }
    });
  }

  // ─── Change Request Form ──────────────────────────────────────
  function showChangeRequestForm() {
    const fieldOptions = [
      { value: 'full_name',             label: 'Full Name' },
      { value: 'cnic_number',           label: 'CNIC Number (13 digits)' },
    ];

    MK9.modal.open(`
      <form id="mk9-cr-form">
        <div class="mk9-form__group">
          <label class="mk9-form__label mk9-form__label--required">Field to Change</label>
          <select name="field_name" class="mk9-form__select" id="mk9-cr-field" required>
            <option value="">- Select field -</option>
            ${fieldOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="mk9-form__group" id="mk9-cr-text-group">
          <label class="mk9-form__label">New Value</label>
          <input type="text" name="new_value" id="mk9-cr-new-value" class="mk9-form__input" placeholder="Enter new value...">
          <div id="mk9-cr-cnic-hint" style="display:none;font-size:11px;color:var(--cream-muted);margin-top:6px;">Enter 13 digits only — dashes added automatically. Format: XXXXX-XXXXXXX-X</div>
        </div>
        <div class="mk9-form__group" id="mk9-cr-file-group" style="display:none">
          <label class="mk9-form__label">Upload New File</label>
          <div class="mk9-file-upload">
            <input type="file" name="new_file" class="mk9-file-upload__input" accept="image/*,application/pdf">
            <div class="mk9-file-upload__text">Click or drag to upload</div>
            <div class="mk9-file-upload__name"></div>
          </div>
        </div>
      </form>
    `, {
      title: 'Submit Change Request',
      footer: `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" onclick="MK9.modal.close()">Cancel</button>
        <button class="mk9-btn mk9-btn--primary mk9-btn--sm" id="mk9-cr-submit">Submit Request</button>
      `,
    });

    // Toggle text/file input based on field
    const fieldSelect = document.getElementById('mk9-cr-field');
    const fileFields  = ['profile_picture', 'university_card_front', 'university_card_back'];
    const cnicInput   = document.getElementById('mk9-cr-new-value');
    const cnicHint    = document.getElementById('mk9-cr-cnic-hint');

    fieldSelect?.addEventListener('change', () => {
      const isFile = fileFields.includes(fieldSelect.value);
      const isCnic = fieldSelect.value === 'cnic_number';
      document.getElementById('mk9-cr-text-group').style.display = isFile ? 'none' : 'block';
      document.getElementById('mk9-cr-file-group').style.display = isFile ? 'block' : 'none';
      if (cnicHint) cnicHint.style.display = isCnic ? 'block' : 'none';
      if (cnicInput) {
        cnicInput.placeholder = isCnic ? '00000-0000000-0' : 'Enter new value...';
        cnicInput.style.fontFamily = isCnic ? 'monospace' : '';
        cnicInput.style.letterSpacing = isCnic ? '2px' : '';
        cnicInput.maxLength = isCnic ? 15 : 255;
      }
    });

    // CNIC auto-formatter in change request modal
    if (cnicInput) {
      cnicInput.addEventListener('input', () => {
        if (fieldSelect.value !== 'cnic_number') return;
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
        if (fieldSelect.value !== 'cnic_number') return;
        const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End'];
        if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      });
    }

    // File upload init
    const uploadArea = document.querySelector('#mk9-cr-file-group .mk9-file-upload');
    if (uploadArea) {
      bindFileUploadPreview(uploadArea);
    }

    document.getElementById('mk9-cr-submit')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const crForm = document.getElementById('mk9-cr-form');

      if (!fieldSelect.value) {
        MK9.toast('Please select which field to change.', 'error');
        return;
      }

      MK9.setButtonLoading(btn, true);

      const fd = new FormData(crForm);
      fd.append('action', 'mk9_submit_change_request');
      fd.append('nonce', mk9_ajax.nonce);

      try {
        const res = await fetch(mk9_ajax.url, { method: 'POST', credentials: 'same-origin', body: fd }).then(r => r.json());

        if (res.success) {
          MK9.modal.close();
          MK9.toast('Change request submitted! Admin will review it soon.', 'success');
          setTimeout(() => location.reload(), 2000);
        } else {
          MK9.toast(res.data?.message || 'Failed to submit request.', 'error');
          MK9.setButtonLoading(btn, false);
        }
      } catch {
        MK9.toast('Network error.', 'error');
        MK9.setButtonLoading(btn, false);
      }
    });
  }

  // ─── Sidebar Navigation ───────────────────────────────────────
  document.querySelectorAll('.mk9-sidebar__nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');

      document.querySelectorAll('.mk9-sidebar__nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.mk9-view').forEach(v => {
        v.style.display = v.id === `mk9-view-${view}` ? 'block' : 'none';
      });
    });
  });

  // ─── Logout Link ──────────────────────────────────────────────
  document.querySelectorAll('.mk9-logout-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res = await MK9.ajax('mk9_logout');
        window.location.href = res.data?.redirect || '/login';
      } catch {
        window.location.href = '/login';
      }
    });
  });

  // ─── Support Tickets ──────────────────────────────────────────
  let activeTicketId = null;

  const ticketStatusBadge = (status) => {
    const map = {
      'open':        ['#60a5fa', 'Open'],
      'in-progress': ['#f59e0b', 'In Progress'],
      'closed':      ['#f87171', 'Closed'],
    };
    const [color, label] = map[status] || ['#9ca3af', status];
    return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;background:${color}22;color:${color};border:1px solid ${color}44;">
      <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;"></span>${label}</span>`;
  };

  const ticketCategoryLabel = (cat) => ({
    general: 'General', technical: 'Technical Issue',
    payment: 'Payment', account: 'Account', other: 'Other',
  }[cat] || cat);

  const fmtDt = (str) => {
    if (!str) return '-';
    return new Date(str).toLocaleString('en-PK', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const loadTicketList = async () => {
    const listEl = document.getElementById('mk9-ticket-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="mk9-loader">Loading tickets...</div>';

    const res = await MK9.ajax('mk9_ticket_get_mine');
    if (!res.success) { listEl.innerHTML = '<p style="color:#f87171;padding:20px;">Failed to load tickets.</p>'; return; }

    const tickets = res.data.tickets || [];

    // Update sidebar badge
    const unread = tickets.filter(t => t.unread_admin_replies > 0).length;
    const badge = document.getElementById('mk9-ticket-badge');
    if (badge) { badge.style.display = unread > 0 ? 'inline-block' : 'none'; badge.textContent = '!'; }

    if (!tickets.length) {
      listEl.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--cream-dim);">
        <div style="font-size:32px;margin-bottom:16px;">🎫</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;">No tickets yet</div>
        <p style="font-size:13px;">Click "+ New Ticket" to get support from our team.</p>
      </div>`;
      return;
    }

    listEl.innerHTML = tickets.map(t => `
      <div class="mk9-ticket-row" data-ticket-id="${t.id}" style="padding:16px 20px;border-bottom:1px solid var(--hairline);cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:space-between;gap:12px;" onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background=''">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            ${t.unread_admin_replies > 0 ? `<span style="width:8px;height:8px;border-radius:50%;background:#60a5fa;flex-shrink:0;"></span>` : ''}
            <strong style="font-size:14px;">${MK9.escHtml(t.subject)}</strong>
          </div>
          <div style="font-size:12px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">${ticketCategoryLabel(t.category)} · ${t.reply_count} message${t.reply_count != 1 ? 's' : ''} · ${fmtDt(t.updated_at)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          ${ticketStatusBadge(t.status)}
          <span style="color:var(--cream-muted);font-size:18px;">›</span>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.mk9-ticket-row').forEach(row => {
      row.addEventListener('click', () => openTicketDetail(parseInt(row.dataset.ticketId)));
    });
  };

  const openTicketDetail = async (ticketId) => {
    activeTicketId = ticketId;
    const listWrap   = document.getElementById('mk9-ticket-list-wrap');
    const detailWrap = document.getElementById('mk9-ticket-detail-wrap');
    const formWrap   = document.getElementById('mk9-new-ticket-form');
    if (listWrap)   listWrap.style.display   = 'none';
    if (detailWrap) detailWrap.style.display = 'block';
    if (formWrap)   formWrap.style.display   = 'none';

    const headerEl  = document.getElementById('mk9-ticket-detail-header');
    const repliesEl = document.getElementById('mk9-ticket-replies-list');
    if (headerEl)  headerEl.innerHTML  = '<div class="mk9-loader">Loading...</div>';
    if (repliesEl) repliesEl.innerHTML = '';

    const res = await MK9.ajax('mk9_ticket_get_detail', { ticket_id: ticketId });
    if (!res.success) { if (headerEl) headerEl.innerHTML = '<p style="color:#f87171;">Failed to load ticket.</p>'; return; }

    const { ticket, replies } = res.data;

    if (headerEl) headerEl.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:20px;font-weight:700;margin-bottom:8px;">${MK9.escHtml(ticket.subject)}</div>
          <div style="font-size:12px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">
            ${ticketCategoryLabel(ticket.category)} · Opened ${fmtDt(ticket.created_at)}
          </div>
        </div>
        ${ticketStatusBadge(ticket.status)}
      </div>`;

    if (repliesEl) {
      repliesEl.innerHTML = replies.map(r => {
        const isBdm = r.sender_role === 'bdm';
        return `<div style="display:flex;${isBdm ? 'justify-content:flex-end;' : ''}">
          <div style="max-width:80%;background:${isBdm ? 'rgba(196,229,56,.1)' : 'rgba(96,165,250,.08)'};border:1px solid ${isBdm ? 'rgba(196,229,56,.2)' : 'rgba(96,165,250,.2)'};border-radius:12px;padding:14px 18px;">
            <div style="font-size:11px;font-weight:700;color:${isBdm ? 'var(--lime)' : '#60a5fa'};text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;font-family:'JetBrains Mono',monospace;">
              ${isBdm ? 'You' : 'MediaK9 Support'} · ${fmtDt(r.created_at)}
            </div>
            <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${MK9.escHtml(r.message)}</div>
          </div>
        </div>`;
      }).join('');
    }

    // Show/hide reply box based on status
    const replyBox    = document.getElementById('mk9-ticket-reply-box');
    const closedNote  = document.getElementById('mk9-ticket-closed-notice');
    if (ticket.status === 'closed') {
      if (replyBox)   replyBox.style.display   = 'none';
      if (closedNote) closedNote.style.display = 'block';
    } else {
      if (replyBox)   replyBox.style.display   = 'block';
      if (closedNote) closedNote.style.display = 'none';
    }

    // Reload list badge
    loadTicketList();
  };

  // Back button
  const backBtn = document.getElementById('mk9-ticket-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => {
    activeTicketId = null;
    const listWrap   = document.getElementById('mk9-ticket-list-wrap');
    const detailWrap = document.getElementById('mk9-ticket-detail-wrap');
    if (listWrap)   listWrap.style.display   = 'block';
    if (detailWrap) detailWrap.style.display = 'none';
  });

  // New ticket button
  const newTicketBtn = document.getElementById('mk9-new-ticket-btn');
  const newTicketForm = document.getElementById('mk9-new-ticket-form');
  if (newTicketBtn && newTicketForm) {
    newTicketBtn.addEventListener('click', () => {
      const detailWrap = document.getElementById('mk9-ticket-detail-wrap');
      if (detailWrap) detailWrap.style.display = 'none';
      const listWrap = document.getElementById('mk9-ticket-list-wrap');
      if (listWrap) listWrap.style.display = 'block';
      newTicketForm.style.display = newTicketForm.style.display === 'none' ? 'block' : 'none';
    });
  }

  const cancelTicketBtn = document.getElementById('mk9-ticket-cancel-btn');
  if (cancelTicketBtn && newTicketForm) {
    cancelTicketBtn.addEventListener('click', () => { newTicketForm.style.display = 'none'; });
  }

  // Submit new ticket
  const submitTicketBtn = document.getElementById('mk9-ticket-submit-btn');
  if (submitTicketBtn) {
    submitTicketBtn.addEventListener('click', async () => {
      const subject  = (document.getElementById('mk9-ticket-subject')?.value || '').trim();
      const category = document.getElementById('mk9-ticket-category')?.value || 'general';
      const message  = (document.getElementById('mk9-ticket-message')?.value || '').trim();
      const alertEl  = document.getElementById('mk9-ticket-form-alert');

      const showAlert = (msg, type) => {
        if (!alertEl) return;
        alertEl.style.display = 'block';
        alertEl.style.background = type === 'error' ? 'rgba(248,113,113,.1)' : 'rgba(74,222,128,.1)';
        alertEl.style.border = type === 'error' ? '1px solid rgba(248,113,113,.3)' : '1px solid rgba(74,222,128,.3)';
        alertEl.style.color = type === 'error' ? '#f87171' : '#4ade80';
        alertEl.textContent = msg;
      };

      if (!subject) { showAlert('Please enter a subject.', 'error'); return; }
      if (!message) { showAlert('Please describe your issue.', 'error'); return; }

      MK9.setButtonLoading(submitTicketBtn, true, 'Submitting...');
      try {
        const res = await MK9.ajax('mk9_ticket_create', { subject, category, message });
        if (res.success) {
          showAlert('Ticket submitted successfully!', 'success');
          document.getElementById('mk9-ticket-subject').value = '';
          document.getElementById('mk9-ticket-message').value = '';
          setTimeout(() => {
            if (newTicketForm) newTicketForm.style.display = 'none';
            if (alertEl) alertEl.style.display = 'none';
            loadTicketList();
          }, 1500);
        } else {
          showAlert(res.data?.message || 'Failed to submit ticket.', 'error');
        }
      } catch { showAlert('Network error.', 'error'); }
      MK9.setButtonLoading(submitTicketBtn, false);
    });
  }

  // Send reply
  const replyBtn = document.getElementById('mk9-ticket-reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', async () => {
      if (!activeTicketId) return;
      const msg = (document.getElementById('mk9-ticket-reply-msg')?.value || '').trim();
      if (!msg) return;
      MK9.setButtonLoading(replyBtn, true, 'Sending...');
      try {
        const res = await MK9.ajax('mk9_ticket_reply', { ticket_id: activeTicketId, message: msg });
        if (res.success) {
          document.getElementById('mk9-ticket-reply-msg').value = '';
          openTicketDetail(activeTicketId);
        } else {
          MK9.toast(res.data?.message || 'Failed to send reply.', 'error');
        }
      } catch { MK9.toast('Network error.', 'error'); }
      MK9.setButtonLoading(replyBtn, false);
    });
  }

  // Load tickets when view is activated
  document.querySelectorAll('.mk9-sidebar__nav-item[data-view="tickets"]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTicketId = null;
      const listWrap   = document.getElementById('mk9-ticket-list-wrap');
      const detailWrap = document.getElementById('mk9-ticket-detail-wrap');
      const formWrap   = document.getElementById('mk9-new-ticket-form');
      if (listWrap)   listWrap.style.display   = 'block';
      if (detailWrap) detailWrap.style.display = 'none';
      if (formWrap)   formWrap.style.display   = 'none';
      loadTicketList();
    });
  });

  // Initial badge check
  loadTicketList();
});
