/* ═══════════════════════════════════════════════════════════════════
   MK9 BDM PORTAL - admin.js
   Admin panel: tabs, data tables, approve/reject modals
   Uses mk9_admin.url and mk9_admin.nonce
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('mk9-admin-panel')) return;

  // ─── State ────────────────────────────────────────────────────
  let currentTab    = 'bdms';
  let currentFilter = 'all';

  // ─── Admin AJAX ───────────────────────────────────────────────
  const adminAjax = async (action, data = {}) => {
    const fd = new FormData();
    fd.append('action', action);
    fd.append('nonce', mk9_admin.nonce);
    Object.keys(data).forEach(k => fd.append(k, data[k]));
    const res = await fetch(mk9_admin.url, { method: 'POST', credentials: 'same-origin', body: fd });
    return res.json();
  };

  // ─── Toast ────────────────────────────────────────────────────
  const toast = (message, type = 'success') => {
    document.querySelectorAll('.mk9-admin__toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = `mk9-admin__toast mk9-admin__toast--${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3500);
  };

  // ─── Loading ──────────────────────────────────────────────────
  const showLoading = (containerId) => {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="mk9-admin__loading"><div class="mk9-admin__spinner"></div></div>`;
  };

  // ─── Status Badge ─────────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      pending:    'pending',
      approved:   'approved',
      rejected:   'rejected',
      ongoing:    'ongoing',
      completed:  'completed',
      terminated: 'rejected',   // reuse red styling for terminated
    };
    const cls = map[status] || 'pending';
    const label = status === 'terminated' ? 'Terminated' : esc(status);
    return `<span class="mk9-status mk9-status--${cls}"><span class="mk9-status__dot"></span>${label}</span>`;
  };

  const esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  };

  const escAttr = (str) => {
    return (str ?? '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  };

  const fmtDate = (str) => {
    if (!str) return '-';
    return new Date(str).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ─── Update Stats ─────────────────────────────────────────────
  const updateStats = async () => {
    const res = await adminAjax('mk9_admin_get_data', { tab: 'stats' });
    if (!res.success) return;
    const { bdms, clients, projects, changes } = res.data;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('mk9-stat-bdms-total',      bdms.total);
    set('mk9-stat-bdms-pending',    bdms.pending);
    set('mk9-stat-bdms-approved',   bdms.approved);
    set('mk9-stat-clients-total',   clients.total);
    set('mk9-stat-clients-pending', clients.pending);
    set('mk9-stat-projects-total',  projects.total);
    set('mk9-stat-ongoing',         projects.ongoing);
    set('mk9-stat-completed',       projects.completed);
    set('mk9-stat-changes-pending', changes.pending);

    // Tab badge for pending BDMs
    const badge = document.getElementById('mk9-tab-badge-bdms');
    if (badge) {
      if (bdms.pending > 0) {
        badge.textContent = bdms.pending;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  };

  // ─── Render BDMs Table ────────────────────────────────────────
  const renderBDMs = async () => {
    showLoading('mk9-tab-content');
    const res = await adminAjax('mk9_admin_get_data', { tab: 'bdms', filter: currentFilter });
    if (!res.success) { toast('Failed to load data.', 'error'); return; }

    const { items, counts } = res.data;

    // Filters
    const filtersHtml = `
      <div class="mk9-admin__filters">
        ${['all','pending','approved','rejected'].map(f => `
          <button class="mk9-admin__filter ${currentFilter === f ? 'active' : ''}" data-filter="${f}">
            ${esc(f.charAt(0).toUpperCase() + f.slice(1))} 
            <span style="opacity:.6">(${counts[f] || 0})</span>
          </button>
        `).join('')}
      </div>
    `;

    if (!items.length) {
      document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
        <div class="mk9-admin__empty">
          <div class="mk9-admin__empty-text">No BDMs found for this filter.</div>
        </div>
      `;
      bindFilters('mk9-tab-content');
      return;
    }

    const rows = items.map(bdm => `
      <tr>
        <td><strong>${esc(bdm.full_name)}</strong><br><span style="font-size:.75rem;color:var(--mk9-cream-muted)">${esc(bdm.email)}</span></td>
        <td>${esc(bdm.father_name)}</td>
        <td>${esc(bdm.phone)}</td>
        <td>${bdm.bdm_code ? `<code style="background:var(--mk9-ink-2);padding:2px 8px;border-radius:4px;color:var(--mk9-marmalade-2)">${esc(bdm.bdm_code)}</code>` : '-'}</td>
        <td>${statusBadge(bdm.status)}</td>
        <td>${fmtDate(bdm.created_at)}</td>
        <td>
          <div class="mk9-admin__actions">
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="view-bdm" data-id="${bdm.id}" data-bdm='${escAttr(JSON.stringify(bdm))}'>View</button>
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="edit-bdm" data-id="${bdm.id}" data-bdm='${escAttr(JSON.stringify(bdm))}'>Edit</button>
            ${bdm.status === 'pending' ? `
              <button class="mk9-admin__action-btn mk9-admin__action-btn--approve" data-action="approve-bdm" data-id="${bdm.id}">Approve</button>
              <button class="mk9-admin__action-btn mk9-admin__action-btn--reject"  data-action="reject-bdm"  data-id="${bdm.id}">Reject</button>
            ` : ''}
            ${bdm.status !== 'terminated' ? `
              <button class="mk9-admin__action-btn mk9-admin__action-btn--reject"
                style="background:rgba(220,38,38,.12);border-color:rgba(220,38,38,.35);color:#f87171;"
                data-action="layoff-bdm"
                data-id="${bdm.id}"
                data-name="${escAttr(bdm.full_name)}"
                data-code="${escAttr(bdm.bdm_code || 'N/A')}">
                Lay Off
              </button>
            ` : `<span style="font-size:11px;color:#f87171;padding:4px 8px;">Terminated</span>`}
          </div>
        </td>
      </tr>
    `).join('');

    document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
      <div class="mk9-admin__table-wrapper">
        <table class="mk9-admin__table">
          <thead>
            <tr>
              <th>Name / Email</th><th>Father Name</th><th>Phone</th>
              <th>BDM Code</th><th>Status</th><th>Applied</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    bindFilters('mk9-tab-content');
    bindTableActions('mk9-tab-content');
  };

  // ─── Render Clients Table ─────────────────────────────────────
  const renderClients = async () => {
    showLoading('mk9-tab-content');
    const res = await adminAjax('mk9_admin_get_data', { tab: 'clients', filter: currentFilter });
    if (!res.success) {
      document.getElementById('mk9-tab-content').innerHTML = `<div class="mk9-admin__empty"><div class="mk9-admin__empty-text">Failed to load client applications. Please refresh the page.</div></div>`;
      return;
    }

    const { items, counts } = res.data;

    const filtersHtml = `
      <div class="mk9-admin__filters">
        ${['all','pending','approved','rejected'].map(f => `
          <button class="mk9-admin__filter ${currentFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] || 0})
          </button>
        `).join('')}
      </div>
    `;

    if (!items.length) {
      document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
        <div class="mk9-admin__empty">
          <div class="mk9-admin__empty-text">No Clients found for this filter.</div>
        </div>
      `;
      bindFilters('mk9-tab-content');
      return;
    }

    const rows = items.map(c => `
      <tr>
        <td><strong>${esc(c.organization_name)}</strong></td>
        <td>${esc(c.contact_name)}<br><span style="font-size:.75rem;color:var(--mk9-cream-muted)">${esc(c.contact_email)}</span></td>
        <td>${esc(c.service_required).substring(0, 50)}…</td>
        <td><code style="background:var(--mk9-ink-2);padding:2px 8px;border-radius:4px;color:var(--mk9-marmalade-2)">${esc(c.bdm_code)}</code></td>
        <td>${c.budget ? esc(c.budget) : '-'}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${fmtDate(c.created_at)}</td>
        <td>
          <div class="mk9-admin__actions">
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="view-client" data-id="${c.id}" data-client='${escAttr(JSON.stringify(c))}'>View</button>
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="edit-client" data-id="${c.id}" data-client='${escAttr(JSON.stringify(c))}'>Edit</button>
            ${c.status === 'pending' ? `
              <button class="mk9-admin__action-btn mk9-admin__action-btn--approve" data-action="approve-client" data-id="${c.id}">Approve</button>
              <button class="mk9-admin__action-btn mk9-admin__action-btn--reject"  data-action="reject-client"  data-id="${c.id}">Reject</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
      <div class="mk9-admin__table-wrapper">
        <table class="mk9-admin__table">
          <thead>
            <tr>
              <th>Organization</th><th>Contact</th><th>Service</th>
              <th>BDM Code</th><th>Budget</th><th>Status</th><th>Submitted</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    bindFilters('mk9-tab-content');
    bindTableActions('mk9-tab-content');
  };

  // ─── Render Projects Table ────────────────────────────────────
  const renderProjects = async () => {
    showLoading('mk9-tab-content');
    const res = await adminAjax('mk9_admin_get_data', { tab: 'projects', filter: currentFilter });
    if (!res.success) {
      document.getElementById('mk9-tab-content').innerHTML = `<div class="mk9-admin__empty"><div class="mk9-admin__empty-text">Failed to load projects. Please refresh the page.</div></div>`;
      return;
    }

    const { items, counts } = res.data;

    const filtersHtml = `
      <div class="mk9-admin__filters">
        ${['all','pending','ongoing','completed'].map(f => `
          <button class="mk9-admin__filter ${currentFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] || 0})
          </button>
        `).join('')}
      </div>
    `;

    if (!items.length) {
      document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
        <div class="mk9-admin__empty">
          <div class="mk9-admin__empty-text">No Projects found for this filter.</div>
        </div>
      `;
      bindFilters('mk9-tab-content');
      return;
    }

    const rows = items.map(p => `
      <tr>
        <td><strong>${esc(p.organization_name)}</strong></td>
        <td>${esc(p.bdm_name)}<br><code style="font-size:.7rem;color:var(--mk9-marmalade-2)">${esc(p.bdm_code)}</code></td>
        <td>${esc(p.service_required || '-').substring(0,40)}…</td>
        <td>${statusBadge(p.status)}</td>
        <td>${fmtDate(p.created_at)}</td>
        <td>
          <div class="mk9-admin__actions">
            <button class="mk9-admin__action-btn mk9-admin__action-btn--status" 
              data-action="update-project" data-id="${p.id}" data-current="${p.status}">
              Change Status
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
      <div class="mk9-admin__table-wrapper">
        <table class="mk9-admin__table">
          <thead>
            <tr><th>Organization</th><th>BDM</th><th>Service</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    bindFilters('mk9-tab-content');
    bindTableActions('mk9-tab-content');
  };

  // ─── Render Change Requests ───────────────────────────────────
  const renderChanges = async () => {
    showLoading('mk9-tab-content');
    const res = await adminAjax('mk9_admin_get_data', { tab: 'changes', filter: currentFilter });
    if (!res.success) {
      document.getElementById('mk9-tab-content').innerHTML = `<div class="mk9-admin__empty"><div class="mk9-admin__empty-text">Failed to load change requests. Please refresh the page.</div></div>`;
      return;
    }

    const { items, counts } = res.data;

    const filtersHtml = `
      <div class="mk9-admin__filters">
        ${['all','pending','approved','rejected'].map(f => `
          <button class="mk9-admin__filter ${currentFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] || 0})
          </button>
        `).join('')}
      </div>
    `;

    if (!items.length) {
      document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
        <div class="mk9-admin__empty">
          <div class="mk9-admin__empty-text">No Change Requests found for this filter.</div>
        </div>
      `;
      bindFilters('mk9-tab-content');
      return;
    }

    const rows = items.map(cr => `
      <tr>
        <td>${esc(cr.bdm_name)}<br><code style="font-size:.7rem;color:var(--mk9-marmalade-2)">${esc(cr.bdm_code)}</code></td>
        <td style="text-transform:capitalize">${esc(cr.field_name.replace('_',' '))}</td>
        <td><span style="opacity:.6">${esc(cr.old_value || '(file)')}</span></td>
        <td><strong>${esc(cr.new_value || '(new file)')}</strong></td>
        <td>${statusBadge(cr.status)}</td>
        <td>${fmtDate(cr.created_at)}</td>
        <td>
          <div class="mk9-admin__actions">
            ${cr.status === 'pending' ? `
              <button class="mk9-admin__action-btn mk9-admin__action-btn--approve" data-action="approve-change" data-id="${cr.id}">Approve</button>
              <button class="mk9-admin__action-btn mk9-admin__action-btn--reject"  data-action="reject-change"  data-id="${cr.id}">Reject</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
      <div class="mk9-admin__table-wrapper">
        <table class="mk9-admin__table">
          <thead>
            <tr><th>BDM</th><th>Field</th><th>Before</th><th>After</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    bindFilters('mk9-tab-content');
    bindTableActions('mk9-tab-content');
  };

  // ─── Render Leaderboard ───────────────────────────────────────
  const renderLeaderboard = async () => {
    showLoading('mk9-tab-content');
    const res = await adminAjax('mk9_admin_get_data', { tab: 'leaderboard' });
    if (!res.success) { toast('Failed to load leaderboard.', 'error'); return; }

    const items = res.data.items || [];

    if (!items.length) {
      document.getElementById('mk9-tab-content').innerHTML = `
        <div class="mk9-admin__empty">
          <div class="mk9-admin__empty-text">No active projects found.</div>
        </div>
      `;
      return;
    }

    const rows = items.map((bdm, i) => `
      <tr>
        <td style="font-size:18px; font-weight:700; color:var(--mk9-lime)">#${i + 1}</td>
        <td><strong>${esc(bdm.full_name)}</strong><br><span style="font-size:.75rem;color:var(--mk9-cream-muted)">${esc(bdm.email)}</span></td>
        <td><code style="background:var(--mk9-ink-2);padding:2px 8px;border-radius:4px;color:var(--mk9-marmalade-2)">${esc(bdm.bdm_code)}</code></td>
        <td style="font-size:20px; font-weight:700;">${bdm.project_score}</td>
        <td>${statusBadge(bdm.status)}</td>
      </tr>
    `).join('');

    document.getElementById('mk9-tab-content').innerHTML = `
      <div class="mk9-admin__table-wrapper" style="margin-top:24px;">
        <table class="mk9-admin__table">
          <thead>
            <tr>
              <th style="width:60px">Rank</th>
              <th>BDM Partner</th>
              <th>BDM Code</th>
              <th>Score (Active/Done Projects)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  // ─── Tab Switching ────────────────────────────────────────────
  document.querySelectorAll('.mk9-admin__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mk9-admin__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');
      currentFilter = 'all';
      loadTab(currentTab);
    });
  });

  const loadTab = (tab) => {
    switch (tab) {
      case 'bdms':     renderBDMs(); break;
      case 'clients':  renderClients(); break;
      case 'projects': renderProjects(); break;
      case 'changes':  renderChanges(); break;
      case 'leaderboard': renderLeaderboard(); break;
    }
  };

  // ─── Bind Filters ─────────────────────────────────────────────
  const bindFilters = (containerId) => {
    document.querySelectorAll(`#${containerId} .mk9-admin__filter`).forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-filter');
        loadTab(currentTab);
      });
    });
  };

  // ─── Bind Table Actions ───────────────────────────────────────
  const bindTableActions = (containerId) => {
    document.querySelectorAll(`#${containerId} [data-action]`).forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn));
    });
  };

  // ─── Handle Actions ───────────────────────────────────────────
  const handleAction = (btn) => {
    const action = btn.getAttribute('data-action');
    const id     = btn.getAttribute('data-id');

    switch (action) {
      case 'view-bdm':        showBDMDetail(JSON.parse(btn.getAttribute('data-bdm') || '{}')); break;
      case 'edit-bdm':        showEditBDMModal(id, JSON.parse(btn.getAttribute('data-bdm') || '{}')); break;
      case 'approve-bdm':     showApproveModal('approve-bdm', id, 'Approve BDM'); break;
      case 'reject-bdm':      showApproveModal('reject-bdm', id, 'Reject BDM'); break;
      case 'layoff-bdm':      showLayoffModal(id, btn.getAttribute('data-name'), btn.getAttribute('data-code')); break;
      case 'view-client':     showClientDetail(JSON.parse(btn.getAttribute('data-client') || '{}')); break;
      case 'edit-client':     showEditClientModal(id, JSON.parse(btn.getAttribute('data-client') || '{}')); break;
      case 'approve-client':  showApproveModal('approve-client', id, 'Approve Client'); break;
      case 'reject-client':   showApproveModal('reject-client', id, 'Reject Client'); break;
      case 'update-project':  showProjectStatusModal(id, btn.getAttribute('data-current')); break;
      case 'approve-change':  showApproveModal('approve-change', id, 'Approve Change Request'); break;
      case 'reject-change':   showApproveModal('reject-change', id, 'Reject Change Request'); break;
    }
  };

  // ─── BDM Detail Modal ─────────────────────────────────────────
  const showBDMDetail = (bdm) => {
    const docsHtml = [
      { url: bdm.cnic_front ? `/api/serve-file.php?file=${encodeURIComponent(bdm.cnic_front)}` : '',   label: 'CNIC Card (Front)' },
      { url: bdm.cnic_back ? `/api/serve-file.php?file=${encodeURIComponent(bdm.cnic_back)}` : '',    label: 'CNIC Card (Back)' },
      { url: bdm.university_card_front ? `/api/serve-file.php?file=${encodeURIComponent(bdm.university_card_front)}` : '',   label: 'University Card (Front)' },
      { url: bdm.university_card_back ? `/api/serve-file.php?file=${encodeURIComponent(bdm.university_card_back)}` : '',    label: 'University Card (Back)' },
      { url: bdm.profile_picture ? `/api/serve-file.php?file=${encodeURIComponent(bdm.profile_picture)}` : '', label: 'Profile Picture' },
    ].filter(d => d.url).map(d => `
      <div class="mk9-admin__doc-card">
        <img src="${esc(d.url)}" alt="${esc(d.label)}" 
          onerror="this.src='';this.style.display='none'"
          onclick="window.open('${esc(d.url)}','_blank')">
        <div class="mk9-admin__doc-label">${esc(d.label)}</div>
      </div>
    `).join('');

    showAdminModal(`
      <div class="mk9-admin__detail">
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Full Name</div>
          <div class="mk9-admin__detail-value">${esc(bdm.full_name)}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Father Name</div>
          <div class="mk9-admin__detail-value">${esc(bdm.father_name)}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Email</div>
          <div class="mk9-admin__detail-value">${esc(bdm.email)}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Phone</div>
          <div class="mk9-admin__detail-value">${esc(bdm.phone)}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">CNIC Number</div>
          <div class="mk9-admin__detail-value" style="font-family:monospace;letter-spacing:1px;font-size:15px;">${bdm.cnic_number ? `<code style="background:var(--ink);padding:2px 10px;border-radius:6px;color:var(--mk9-lime);font-size:14px;">${esc(bdm.cnic_number)}</code>` : '<span style="opacity:.5">—</span>'}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Status</div>
          <div class="mk9-admin__detail-value">${statusBadge(bdm.status)}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">BDM Code</div>
          <div class="mk9-admin__detail-value">${bdm.bdm_code || '-'}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Applied On</div>
          <div class="mk9-admin__detail-value">${fmtDate(bdm.created_at)}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Terms Accepted (Proof)</div>
          <div class="mk9-admin__detail-value">${bdm.terms_accepted_at ? `<span style="color:var(--mk9-lime);font-weight:bold;">✓ Accepted</span> <span style="font-size:11px;color:var(--cream-muted);margin-left:4px;">(${fmtDate(bdm.terms_accepted_at)})</span>` : '<span style="color:#f87171;font-weight:bold;">✗ Not Accepted</span>'}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Admin Notes</div>
          <div class="mk9-admin__detail-value">${esc(bdm.admin_notes) || '-'}</div>
        </div>
      </div>
      ${docsHtml ? `<div class="mk9-admin__doc-grid">${docsHtml}</div>` : ''}
    `, 'BDM Application Detail');
  };

  // ─── Edit BDM Modal ───────────────────────────────────────────
  const showEditBDMModal = (id, bdm) => {
    showAdminModal(`
      <form id="mk9-edit-bdm-form">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Full Name</label>
          <input type="text" name="full_name" value="${esc(bdm.full_name)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Father's Name</label>
          <input type="text" name="father_name" value="${esc(bdm.father_name)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Email Address</label>
          <input type="email" name="email" value="${esc(bdm.email)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Phone Number</label>
          <input type="text" name="phone" value="${esc(bdm.phone)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">BDM Code</label>
          <input type="text" name="bdm_code" value="${esc(bdm.bdm_code || '')}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-marmalade-2);font-family:inherit;font-weight:bold;">
        </div>
      </form>
    `, 'Edit BDM Profile', [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: 'Save Changes', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--confirm', action: 'confirm' },
    ], async () => {
      const fd = new FormData(document.getElementById('mk9-edit-bdm-form'));
      const data = { id };
      fd.forEach((v, k) => data[k] = v);
      
      const res = await adminAjax('mk9_admin_edit_bdm', data);
      closeAdminModal();
      if (res.success) {
        toast(res.data?.message || 'BDM updated!', 'success');
        loadTab('bdms');
      } else {
        toast(res.data?.message || 'Update failed.', 'error');
      }
    });
  };

  // ─── Client Detail Modal ──────────────────────────────────────
  const showClientDetail = (client) => {
    showAdminModal(`
      <div class="mk9-admin__detail" style="grid-template-columns: 1fr; gap: 12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Organization Name</div>
            <div class="mk9-admin__detail-value">${esc(client.organization_name)}</div>
          </div>
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">BDM Partner Code</div>
            <div class="mk9-admin__detail-value"><code style="background:var(--mk9-ink-2);padding:2px 8px;border-radius:4px;color:var(--mk9-marmalade-2)">${esc(client.bdm_code)}</code></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Contact Person</div>
            <div class="mk9-admin__detail-value">${esc(client.contact_name)}</div>
          </div>
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Contact Email</div>
            <div class="mk9-admin__detail-value"><a href="mailto:${esc(client.contact_email)}" style="color:var(--mk9-lime);text-decoration:none;">${esc(client.contact_email)}</a></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Contact Phone</div>
            <div class="mk9-admin__detail-value">${esc(client.contact_phone) || '-'}</div>
          </div>
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Website URL</div>
            <div class="mk9-admin__detail-value">
              ${client.website ? `<a href="${esc(client.website)}" target="_blank" style="color:var(--mk9-lime);">${esc(client.website)}</a>` : '-'}
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Service Required</div>
            <div class="mk9-admin__detail-value">${esc(client.service_required)}</div>
          </div>
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Project Timeline</div>
            <div class="mk9-admin__detail-value">${esc(client.timeline) || '-'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Estimated Budget</div>
            <div class="mk9-admin__detail-value">${esc(client.budget) || '-'}</div>
          </div>
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Status</div>
            <div class="mk9-admin__detail-value">${statusBadge(client.status)}</div>
          </div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Project Description & Requirements</div>
          <div class="mk9-admin__detail-value" style="white-space:pre-wrap;line-height:1.6">${esc(client.project_description) || '-'}</div>
        </div>
        <div class="mk9-admin__detail-field">
          <div class="mk9-admin__detail-label">Key Competitors or References</div>
          <div class="mk9-admin__detail-value" style="white-space:pre-wrap;line-height:1.6">${esc(client.competitors) || '-'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Submitted On</div>
            <div class="mk9-admin__detail-value">${fmtDate(client.created_at)}</div>
          </div>
          <div class="mk9-admin__detail-field">
            <div class="mk9-admin__detail-label">Admin Notes</div>
            <div class="mk9-admin__detail-value">${esc(client.admin_notes) || '-'}</div>
          </div>
        </div>
      </div>
    `, 'Client Application Detail');
  };

  // ─── Edit Client Modal ────────────────────────────────────────
  const showEditClientModal = (id, client) => {
    showAdminModal(`
      <form id="mk9-edit-client-form">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Organization Name</label>
          <input type="text" name="organization_name" value="${esc(client.organization_name)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Contact Name</label>
          <input type="text" name="contact_name" value="${esc(client.contact_name)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Contact Email</label>
          <input type="email" name="contact_email" value="${esc(client.contact_email)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Contact Phone</label>
          <input type="text" name="contact_phone" value="${esc(client.contact_phone)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Website URL</label>
          <input type="url" name="website" value="${esc(client.website || '')}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Service Required</label>
          <input type="text" name="service_required" value="${esc(client.service_required)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Timeline</label>
          <input type="text" name="timeline" value="${esc(client.timeline || '')}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Budget</label>
          <input type="text" name="budget" value="${esc(client.budget)}" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Project Description & Requirements</label>
          <textarea name="project_description" rows="3" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;resize:vertical;">${esc(client.project_description || '')}</textarea>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">Key Competitors or References</label>
          <textarea name="competitors" rows="2" style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;resize:vertical;">${esc(client.competitors || '')}</textarea>
        </div>
      </form>
    `, 'Edit Client Application', [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: 'Save Changes', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--confirm', action: 'confirm' },
    ], async () => {
      const fd = new FormData(document.getElementById('mk9-edit-client-form'));
      const data = { id };
      fd.forEach((v, k) => data[k] = v);
      
      const res = await adminAjax('mk9_admin_edit_client', data);
      closeAdminModal();
      if (res.success) {
        toast(res.data?.message || 'Client updated!', 'success');
        loadTab('clients');
      } else {
        toast(res.data?.message || 'Update failed.', 'error');
      }
    });
  };

  // ─── Approve / Reject Modal ───────────────────────────────────
  const showApproveModal = (action, id, title) => {
    const isDanger = action.startsWith('reject');
    showAdminModal(`
      <p style="color:var(--mk9-cream-dim);margin-bottom:16px">
        ${isDanger ? 'Are you sure you want to reject this application?' : 'Confirm approval for this application?'}
      </p>
      <label style="display:block;font-size:.8125rem;margin-bottom:6px;color:var(--mk9-cream-dim)">Admin Notes (optional)</label>
      <textarea id="mk9-action-notes" rows="3" placeholder="Enter notes for the applicant…"
        style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);
               border-radius:8px;color:var(--mk9-cream);font-family:inherit;font-size:.875rem;resize:vertical">
      </textarea>
    `, title, [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: isDanger ? 'Reject' : 'Confirm Approve', cls: `mk9-admin__modal-btn mk9-admin__modal-btn--${isDanger ? 'danger' : 'confirm'}`, action: 'confirm' },
    ], async () => {
      const notes = document.getElementById('mk9-action-notes')?.value?.trim() || '';
      const actionMap = {
        'approve-bdm':    'mk9_admin_approve_bdm',
        'reject-bdm':     'mk9_admin_reject_bdm',
        'approve-client': 'mk9_admin_approve_client',
        'reject-client':  'mk9_admin_reject_client',
        'approve-change': 'mk9_admin_approve_change',
        'reject-change':  'mk9_admin_reject_change',
      };
      try {
        const res = await adminAjax(actionMap[action], { id, notes });
        closeAdminModal();
        if (res.success) {
          toast(res.data?.message || 'Action completed.', 'success');
          await updateStats();
          loadTab(currentTab);
        } else {
          toast(res.data?.message || 'Action failed.', 'error');
        }
      } catch {
        toast('Network error.', 'error');
      }
    });
  };

  // ─── Project Status Modal ─────────────────────────────────────
  const showProjectStatusModal = (id, currentStatus) => {
    showAdminModal(`
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--mk9-cream-dim)">New Status</label>
        <select id="mk9-new-status" style="width:100%;padding:10px 14px;background:#000000;border:1px solid var(--cream-muted);border-radius:8px;color:var(--cream);font-family:inherit;">
          <option value="pending"   ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="ongoing"   ${currentStatus === 'ongoing' ? 'selected' : ''}>Ongoing</option>
          <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>
      <div>
        <label style="display:block;font-size:.8125rem;margin-bottom:6px;color:var(--mk9-cream-dim)">Notes (optional)</label>
        <textarea id="mk9-status-notes" rows="2" placeholder="Any notes about this status change…"
          style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;resize:vertical">
        </textarea>
      </div>
    `, 'Update Project Status', [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: 'Update', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--confirm', action: 'confirm' },
    ], async () => {
      const status = document.getElementById('mk9-new-status')?.value;
      const notes  = document.getElementById('mk9-status-notes')?.value?.trim() || '';
      const res = await adminAjax('mk9_admin_update_project', { id, status, notes });
      closeAdminModal();
      if (res.success) {
        toast(res.data?.message || 'Status updated!', 'success');
        loadTab('projects');
      } else {
        toast(res.data?.message || 'Update failed.', 'error');
      }
    });
  };

  // ─── Layoff / Remove BDM Modal ────────────────────────────────
  const showLayoffModal = (id, name, code) => {
    showAdminModal(`
      <div style="margin-bottom:18px;padding:14px 16px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);border-radius:10px;">
        <div style="font-weight:700;font-size:14px;color:#f87171;margin-bottom:4px;">Warning: This action affects a live account</div>
        <div style="font-size:12px;color:var(--mk9-cream-dim);line-height:1.5;">
          You are about to take action against <strong style="color:var(--mk9-cream);">${esc(name)}</strong>
          <code style="background:var(--mk9-ink-2);padding:1px 6px;border-radius:4px;color:var(--mk9-marmalade-2);font-size:11px;">${esc(code)}</code>.
          Choose the type of removal below.
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:.8125rem;font-weight:600;margin-bottom:10px;color:var(--mk9-cream-dim);">Removal Type</label>
        <div style="display:flex;flex-direction:column;gap:10px;">

          <label style="display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid rgba(251,191,36,.25);border-radius:10px;background:rgba(251,191,36,.04);cursor:pointer;">
            <input type="radio" name="layoff_mode" value="soft" checked style="margin-top:3px;accent-color:#fbbf24;">
            <div>
              <div style="font-weight:700;color:#fbbf24;margin-bottom:3px;">Soft Layoff (Recommended)</div>
              <div style="font-size:12px;color:var(--mk9-cream-dim);line-height:1.5;">
                Account is <strong>locked</strong>, BDM code is <strong>deactivated</strong>.
                All project &amp; client history is kept.
                Can be undone by editing the profile.
              </div>
            </div>
          </label>

          <label style="display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid rgba(220,38,38,.25);border-radius:10px;background:rgba(220,38,38,.04);cursor:pointer;">
            <input type="radio" name="layoff_mode" value="hard" style="margin-top:3px;accent-color:#f87171;">
            <div>
              <div style="font-weight:700;color:#f87171;margin-bottom:3px;">Hard Remove (Permanent)</div>
              <div style="font-size:12px;color:var(--mk9-cream-dim);line-height:1.5;">
                Deletes the user account, profile, BDM code, all change requests and encrypted documents.
                <strong>Projects and clients are kept</strong> but unlinked.
                <strong style="color:#f87171;">This CANNOT be undone.</strong>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label style="display:block;font-size:.8125rem;font-weight:600;margin-bottom:6px;color:var(--mk9-cream-dim);">Reason / Notes <span style="color:var(--mk9-cream-muted);font-weight:400;">(required)</span></label>
        <textarea id="mk9-layoff-reason" rows="3"
          placeholder="State the reason for this action (e.g. performance, misconduct, voluntary exit)…"
          style="width:100%;padding:10px 14px;background:var(--mk9-ink-2);border:1px solid var(--mk9-hairline-2);border-radius:8px;color:var(--mk9-cream);font-family:inherit;font-size:.875rem;resize:vertical;"></textarea>
      </div>
    `, `Lay Off BDM: ${name}`, [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: 'Confirm Action', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--danger', action: 'confirm' },
    ], async () => {
      const mode   = document.querySelector('input[name="layoff_mode"]:checked')?.value || 'soft';
      const reason = document.getElementById('mk9-layoff-reason')?.value?.trim() || '';

      if (!reason) {
        toast('Please provide a reason before proceeding.', 'error');
        return;
      }

      // Extra confirmation for hard remove
      if (mode === 'hard') {
        const confirmed = window.confirm(
          `FINAL WARNING: You are about to PERMANENTLY DELETE all data for ${name}.\n\nThis cannot be undone. Type OK to confirm.`
        );
        if (!confirmed) return;
      }

      try {
        const res = await adminAjax('mk9_admin_layoff_bdm', { id, mode, notes: reason });
        closeAdminModal();
        if (res.success) {
          toast(res.data?.message || 'Action completed.', 'success');
          await updateStats();
          loadTab('bdms');
        } else {
          toast(res.data?.message || 'Action failed.', 'error');
        }
      } catch {
        toast('Network error. Please try again.', 'error');
      }
    });
  };

  // ─── Admin Modal Helpers ──────────────────────────────────────
  const showAdminModal = (bodyHtml, title, buttons = [], onConfirm = null) => {
    closeAdminModal();

    const defaultButtons = buttons.length ? buttons : [
      { text: 'Close', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
    ];

    const overlay = document.createElement('div');
    overlay.className = 'mk9-admin__modal-overlay';
    overlay.id = 'mk9-admin-modal-overlay';

    const btnHtml = defaultButtons.map(b =>
      `<button class="${b.cls}" data-modal-action="${b.action}">${b.text}</button>`
    ).join('');

    overlay.innerHTML = `
      <div class="mk9-admin__modal">
        <div class="mk9-admin__modal-header">
          <h3 class="mk9-admin__modal-title">${esc(title)}</h3>
          <button class="mk9-admin__modal-close" id="mk9-modal-x">×</button>
        </div>
        <div class="mk9-admin__modal-body">${bodyHtml}</div>
        <div class="mk9-admin__modal-footer">${btnHtml}</div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#mk9-modal-x')?.addEventListener('click', closeAdminModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAdminModal(); });

    overlay.querySelectorAll('[data-modal-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.getAttribute('data-modal-action') === 'confirm' && onConfirm) {
          onConfirm();
        } else {
          closeAdminModal();
        }
      });
    });
  };

  const closeAdminModal = () => {
    document.getElementById('mk9-admin-modal-overlay')?.remove();
  };

  // ─── Tab Click ────────────────────────────────────────────────
  document.querySelectorAll('.mk9-admin__tab').forEach(tab => {
    tab.addEventListener('click', () => loadTab(tab.getAttribute('data-tab')));
  });

  // ─── BDM Impersonation Dropdown ───────────────────────────────
  const initImpersonateDropdown = async () => {
    const select = document.getElementById('mk9-bdm-impersonate-select');
    const btn    = document.getElementById('mk9-bdm-impersonate-btn');
    if (!select || !btn) return;

    try {
      const res = await adminAjax('mk9_admin_get_bdm_list');
      if (!res.success) return;
      const bdms = res.data.bdms || [];

      bdms.forEach(bdm => {
        const opt = document.createElement('option');
        opt.value = bdm.user_id;
        opt.textContent = `${bdm.bdm_code || '(no code)'}  -  ${bdm.full_name}`;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        btn.disabled = !select.value;
      });

      btn.addEventListener('click', async () => {
        const userId = select.value;
        if (!userId) return;
        btn.textContent = 'Opening...';
        btn.disabled = true;

        try {
          const res = await adminAjax('mk9_admin_impersonate_bdm', { id: userId });
          if (res.success) {
            window.location.href = res.data.redirect || '/dashboard';
          } else {
            toast(res.data?.message || 'Failed to open BDM dashboard.', 'error');
            btn.textContent = 'Enter BDM View →';
            btn.disabled = false;
          }
        } catch {
          toast('Network error.', 'error');
          btn.textContent = 'Enter BDM View →';
          btn.disabled = false;
        }
      });
    } catch (e) {
      console.warn('Could not load BDM list for impersonation:', e);
    }
  };

  // ─── Init ─────────────────────────────────────────────────────
  updateStats();
  loadTab('bdms');
  initImpersonateDropdown();
});
