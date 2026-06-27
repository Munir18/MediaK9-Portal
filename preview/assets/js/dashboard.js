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
              <div class="mk9-project-card__date">${MK9.formatDate(project.created_at)}</div>
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
    if (avatarEl) avatarEl.textContent = profile.name.charAt(0).toUpperCase();

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
        if (!profile.can_edit) {
          editBtn.textContent = 'Submit Change Request';
          editBtn.setAttribute('data-mode', 'change-request');
          if (editBadge) editBadge.style.display = 'block';
        }
        editBtn.addEventListener('click', () => {
          const mode = editBtn.getAttribute('data-mode');
          if (mode === 'change-request') {
            showChangeRequestForm();
          } else {
            showEditProfileForm(profile);
          }
        });
      }
      if (editChangesBtn) {
        editChangesBtn.addEventListener('click', () => {
          showChangeRequestForm();
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

  // ─── Edit Profile Form (BDM self-edit, 1 free edit) ──────────
  function showEditProfileForm(profile) {
    MK9.modal.open(`
      <form id="mk9-edit-profile-form" enctype="multipart/form-data">
        <div class="mk9-form__group">
          <label class="mk9-form__label">Full Name</label>
          <input type="text" name="full_name" class="mk9-form__input" value="${MK9.escHtml(profile.name)}">
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label">Phone Number</label>
          <input type="tel" name="phone" class="mk9-form__input" value="${MK9.escHtml(profile.phone)}">
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label">Father Name</label>
          <input type="text" name="father_name" class="mk9-form__input" value="${MK9.escHtml(profile.father_name)}">
        </div>
        <div class="mk9-form__group">
          <label class="mk9-form__label">Profile Picture</label>
          <div class="mk9-file-upload">
            <input type="file" name="profile_picture" class="mk9-file-upload__input" accept="image/*">
            <div class="mk9-file-upload__text">Click or drag to upload</div>
            <div class="mk9-file-upload__name"></div>
          </div>
        </div>
        <div class="mk9-alert mk9-alert--warning" style="margin-top:16px">
           This is your <strong>1 free edit</strong>. After saving, further changes will require a Change Request.
        </div>
      </form>
    `, {
      title: 'Edit Profile',
      footer: `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" onclick="MK9.modal.close()">Cancel</button>
        <button class="mk9-btn mk9-btn--primary mk9-btn--sm" id="mk9-save-profile">Save Changes</button>
      `,
    });

    const uploadArea = document.querySelector('#mk9-edit-profile-form .mk9-file-upload');
    if (uploadArea) bindFileUploadPreview(uploadArea);

    document.getElementById('mk9-save-profile')?.addEventListener('click', async (e) => {
      const btn = e.target;
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
      { value: 'father_name',           label: 'Father Name' },
      { value: 'phone',                 label: 'Phone Number' },
      { value: 'profile_picture',       label: 'Profile Picture' },
      { value: 'university_card_front', label: 'University Card (Front)' },
      { value: 'university_card_back',  label: 'University Card (Back)' },
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
          <input type="text" name="new_value" class="mk9-form__input" placeholder="Enter new value...">
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
    const fileFields = ['profile_picture', 'university_card_front', 'university_card_back'];

    fieldSelect?.addEventListener('change', () => {
      const isFile = fileFields.includes(fieldSelect.value);
      document.getElementById('mk9-cr-text-group').style.display = isFile ? 'none' : 'block';
      document.getElementById('mk9-cr-file-group').style.display = isFile ? 'block' : 'none';
    });

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
});
