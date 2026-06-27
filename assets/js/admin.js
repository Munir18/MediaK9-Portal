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
    const s = (status || 'pending').toString().toLowerCase().trim();
    const map = {
      pending:    'pending',
      approved:   'approved',
      rejected:   'rejected',
      ongoing:    'ongoing',
      completed:  'completed',
      'on-hold':  'on-hold',
      terminated: 'rejected',   // reuse red styling for terminated
    };
    const cls = map[s] || 'pending';
    const labels = {
      terminated: 'Terminated',
      'on-hold':  'On Hold',
      pending:    'Pending',
      approved:   'Approved',
      rejected:   'Rejected',
      ongoing:    'Ongoing',
      completed:  'Completed',
    };
    const label = labels[s] || (s.charAt(0).toUpperCase() + s.slice(1));
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
    if (res.data.tickets) set('mk9-stat-tickets-open', res.data.tickets.open);

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
    // Tab badge for open tickets
    if (res.data.tickets) {
      const tBadge = document.getElementById('mk9-tab-badge-tickets');
      if (tBadge) {
        if (res.data.tickets.open > 0) {
          tBadge.textContent = res.data.tickets.open;
          tBadge.style.display = 'inline-block';
        } else {
          tBadge.style.display = 'none';
        }
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
        <td><strong>${esc(bdm.full_name)}</strong><br><span style="font-size:.75rem;color:var(--cream-muted)">${esc(bdm.email)}</span></td>
        <td>${esc(bdm.father_name)}</td>
        <td>${esc(bdm.phone)}</td>
        <td>${bdm.bdm_code ? `<code style="background:var(--ink);padding:2px 8px;border-radius:4px;color:var(--marmalade)">${esc(bdm.bdm_code)}</code>` : '-'}</td>
        <td>${statusBadge(bdm.status)}</td>
        <td>${fmtDate(bdm.created_at)}</td>
        <td>
          <div class="mk9-admin__actions">
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="view-bdm" data-id="${bdm.id}" data-bdm='${escAttr(JSON.stringify(bdm))}'>View</button>
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="edit-bdm" data-id="${bdm.id}" data-bdm='${escAttr(JSON.stringify(bdm))}'>Edit</button>
            <button class="mk9-admin__action-btn" 
              data-action="custom-email-bdm" 
              data-id="${bdm.id}" 
              data-name="${escAttr(bdm.full_name)}"
              data-email="${escAttr(bdm.email)}"
              style="background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);color:#60a5fa;">
              ✉ Email
            </button>
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
        <td>${esc(c.contact_name)}<br><span style="font-size:.75rem;color:var(--cream-muted)">${esc(c.contact_email)}</span></td>
        <td>${esc(c.service_required).substring(0, 50)}…</td>
        <td><code style="background:var(--ink);padding:2px 8px;border-radius:4px;color:var(--marmalade)">${esc(c.bdm_code)}</code></td>
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
        ${['all','pending','ongoing','on-hold','completed'].map(f => `
          <button class="mk9-admin__filter ${currentFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f === 'on-hold' ? 'On Hold' : f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] || 0})
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
        <td>${esc(p.bdm_name)}<br><code style="font-size:.7rem;color:var(--marmalade)">${esc(p.bdm_code)}</code></td>
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
        <td>${esc(cr.bdm_name)}<br><code style="font-size:.7rem;color:var(--marmalade)">${esc(cr.bdm_code)}</code></td>
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
        <td><strong>${esc(bdm.full_name)}</strong><br><span style="font-size:.75rem;color:var(--cream-muted)">${esc(bdm.email)}</span></td>
        <td><code style="background:var(--ink);padding:2px 8px;border-radius:4px;color:var(--marmalade)">${esc(bdm.bdm_code)}</code></td>
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
      case 'tickets':  renderTickets(); break;
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
      case 'view-bdm':            showBDMDetail(JSON.parse(btn.getAttribute('data-bdm') || '{}')); break;
      case 'edit-bdm':            showEditBDMModal(id, JSON.parse(btn.getAttribute('data-bdm') || '{}')); break;
      case 'approve-bdm':         showApproveModal('approve-bdm', id, 'Approve BDM'); break;
      case 'reject-bdm':          showApproveModal('reject-bdm', id, 'Reject BDM'); break;
      case 'layoff-bdm':          showLayoffModal(id, btn.getAttribute('data-name'), btn.getAttribute('data-code')); break;
      case 'send-welcome-email':  sendWelcomeEmailConfirm(id, btn.getAttribute('data-name'), btn.getAttribute('data-email')); break;
      case 'custom-email-bdm':    showCustomEmailModal(id, btn.getAttribute('data-name'), btn.getAttribute('data-email')); break;
      case 'view-client':         showClientDetail(JSON.parse(btn.getAttribute('data-client') || '{}')); break;
      case 'edit-client':         showEditClientModal(id, JSON.parse(btn.getAttribute('data-client') || '{}')); break;
      case 'approve-client':      showApproveModal('approve-client', id, 'Approve Client'); break;
      case 'reject-client':       showApproveModal('reject-client', id, 'Reject Client'); break;
      case 'update-project':      showProjectStatusModal(id, btn.getAttribute('data-current')); break;
      case 'approve-change':      showApproveModal('approve-change', id, 'Approve Change Request'); break;
      case 'reject-change':       showApproveModal('reject-change', id, 'Reject Change Request'); break;
      case 'view-ticket':         showTicketModal(parseInt(id)); break;
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
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--hairline);">
        <button
          class="mk9-admin__action-btn"
          data-action="send-welcome-email"
          data-id="${bdm.id}"
          data-name="${escAttr(bdm.full_name)}"
          data-email="${escAttr(bdm.email)}"
          style="background:rgba(196,229,56,.12);border:1px solid rgba(196,229,56,.35);color:#c4e538;font-weight:700;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:8px;"
        >✉ Send Welcome Email</button>
        <div style="font-size:11px;color:var(--cream-muted);margin-top:6px;">Sends the official Media K9 Campus Partnership Program approval email to this BDM.</div>
      </div>
    `, 'BDM Application Detail');

    // Bind the send-welcome-email button inside the modal
    document.querySelectorAll('#mk9-admin-modal-overlay [data-action="send-welcome-email"]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn));
    });
  };

  // ─── Send Welcome Email Confirmation ─────────────────────────────────────────
  const sendWelcomeEmailConfirm = (id, name, email) => {
    showAdminModal(`
      <div style="padding:8px 0;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:14px 16px;background:rgba(196,229,56,.06);border:1px solid rgba(196,229,56,.2);border-radius:10px;">
          <div style="font-size:28px;line-height:1;">✉</div>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--cream);margin-bottom:2px;">Send Welcome Email</div>
            <div style="font-size:12px;color:var(--cream-dim);">This will send the official approval welcome email to this BDM.</div>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--cream-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em;font-family:'JetBrains Mono',monospace;">Recipient</div>
          <div style="font-weight:600;color:var(--cream);">${esc(name)}</div>
          <div style="font-size:13px;color:var(--cream-muted);">${esc(email)}</div>
        </div>
        <div style="font-size:12px;color:var(--cream-muted);padding:10px 14px;background:var(--ink);border-radius:8px;border:1px solid var(--hairline);line-height:1.6;">
          <strong style="color:var(--cream);display:block;margin-bottom:4px;">Email Subject:</strong>
          Application Approved – Media K9 Campus Partnership Program
        </div>
      </div>
    `, 'Confirm: Send Welcome Email', [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: '✉ Send Email Now', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--confirm', action: 'confirm' },
    ], async () => {
      const confirmBtn = document.querySelector('#mk9-admin-modal-overlay [data-modal-action="confirm"]');
      if (confirmBtn) { confirmBtn.textContent = 'Sending...'; confirmBtn.disabled = true; }
      try {
        const res = await adminAjax('mk9_admin_send_welcome_email', { id });
        closeAdminModal();
        if (res.success) {
          toast(res.data?.message || 'Welcome email sent!', 'success');
        } else {
          toast(res.data?.message || 'Failed to send email.', 'error');
        }
      } catch {
        closeAdminModal();
        toast('Network error. Please try again.', 'error');
      }
    });
  };

  // ─── Show Custom Email Modal ───────────────────────────────────────────
  const showCustomEmailModal = (id, name, email) => {
    showAdminModal(`
      <div style="margin-bottom:14px;padding:12px 14px;background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2);border-radius:8px;">
        <div style="font-size:11px;color:var(--cream-muted);text-transform:uppercase;letter-spacing:.08em;font-family:'JetBrains Mono',monospace;margin-bottom:3px;">To</div>
        <div style="font-weight:600;color:var(--cream);">${esc(name)}</div>
        <div style="font-size:12px;color:#60a5fa;">${esc(email)}</div>
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:.8125rem;margin-bottom:6px;color:var(--cream-dim);">Subject</label>
        <input type="text" id="mk9-custom-email-subject" placeholder="Email subject..." style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;box-sizing:border-box;">
      </div>
      <div>
        <label style="display:block;font-size:.8125rem;margin-bottom:6px;color:var(--cream-dim);">Message</label>
        <textarea id="mk9-custom-email-message" rows="5" placeholder="Write your message here..." style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;resize:vertical;box-sizing:border-box;"></textarea>
      </div>
    `, `Send Email to ${name}`, [
      { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
      { text: '✉ Send Email', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--confirm', action: 'confirm' },
    ], async () => {
      const subject = document.getElementById('mk9-custom-email-subject')?.value?.trim();
      const message = document.getElementById('mk9-custom-email-message')?.value?.trim();
      if (!subject || !message) { toast('Subject and message are required.', 'error'); return; }
      const confirmBtn = document.querySelector('#mk9-admin-modal-overlay [data-modal-action="confirm"]');
      if (confirmBtn) { confirmBtn.textContent = 'Sending...'; confirmBtn.disabled = true; }
      try {
        const res = await adminAjax('mk9_admin_custom_email', { id, subject, message });
        closeAdminModal();
        if (res.success) {
          toast(res.data?.message || 'Email sent!', 'success');
        } else {
          toast(res.data?.message || 'Failed to send email.', 'error');
        }
      } catch {
        closeAdminModal();
        toast('Network error. Please try again.', 'error');
      }
    });
  };

  // ─── Edit BDM Modal ───────────────────────────────────────────
  const showEditBDMModal = (id, bdm) => {
    showAdminModal(`
      <form id="mk9-edit-bdm-form" autocomplete="off" autocomplete="off">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Full Name</label>
          <input type="text" name="full_name" value="${esc(bdm.full_name)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Father's Name</label>
          <input type="text" name="father_name" value="${esc(bdm.father_name)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Email Address</label>
          <input type="email" name="email" value="${esc(bdm.email)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Phone Number</label>
          <input type="text" name="phone" value="${esc(bdm.phone)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">BDM Code</label>
          <input type="text" name="bdm_code" value="${esc(bdm.bdm_code || '')}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--marmalade);font-family:inherit;font-weight:bold;">
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
            <div class="mk9-admin__detail-value"><code style="background:var(--ink);padding:2px 8px;border-radius:4px;color:var(--marmalade)">${esc(client.bdm_code)}</code></div>
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
      <form id="mk9-edit-client-form" autocomplete="off" autocomplete="off">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Organization Name</label>
          <input type="text" name="organization_name" value="${esc(client.organization_name)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Contact Name</label>
          <input type="text" name="contact_name" value="${esc(client.contact_name)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Contact Email</label>
          <input type="email" name="contact_email" value="${esc(client.contact_email)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Contact Phone</label>
          <input type="text" name="contact_phone" value="${esc(client.contact_phone)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Website URL</label>
          <input type="url" name="website" value="${esc(client.website || '')}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Service Required</label>
          <input type="text" name="service_required" value="${esc(client.service_required)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Timeline</label>
          <input type="text" name="timeline" value="${esc(client.timeline || '')}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Budget</label>
          <input type="text" name="budget" value="${esc(client.budget)}" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Project Description & Requirements</label>
          <textarea name="project_description" rows="3" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;resize:vertical;">${esc(client.project_description || '')}</textarea>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Key Competitors or References</label>
          <textarea name="competitors" rows="2" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;resize:vertical;">${esc(client.competitors || '')}</textarea>
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
      <p style="color:var(--cream-dim);margin-bottom:16px">
        ${isDanger ? 'Are you sure you want to reject this application?' : 'Confirm approval for this application?'}
      </p>
      <label style="display:block;font-size:.8125rem;margin-bottom:6px;color:var(--cream-dim)">Admin Notes (optional)</label>
      <textarea id="mk9-action-notes" rows="3" placeholder="Enter notes for the applicant…"
        style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);
               border-radius:8px;color:var(--cream);font-family:inherit;font-size:.875rem;resize:vertical">
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
        <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">New Status</label>
        <select id="mk9-new-status" style="width:100%;padding:10px 14px;background:#000000;border:1px solid var(--cream-muted);border-radius:8px;color:var(--cream);font-family:inherit;">
          <option value="pending"   ${currentStatus === 'pending'   ? 'selected' : ''}>Pending</option>
          <option value="ongoing"   ${currentStatus === 'ongoing'   ? 'selected' : ''}>Ongoing</option>
          <option value="on-hold"   ${currentStatus === 'on-hold'   ? 'selected' : ''}>On Hold</option>
          <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>
      <div>
        <label style="display:block;font-size:.8125rem;margin-bottom:6px;color:var(--cream-dim)">Notes (optional)</label>
        <textarea id="mk9-status-notes" rows="2" placeholder="Any notes about this status change…"
          style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;resize:vertical">
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
        <div style="font-size:12px;color:var(--cream-dim);line-height:1.5;">
          You are about to take action against <strong style="color:var(--cream);">${esc(name)}</strong>
          <code style="background:var(--ink);padding:1px 6px;border-radius:4px;color:var(--marmalade);font-size:11px;">${esc(code)}</code>.
          Choose the type of removal below.
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:.8125rem;font-weight:600;margin-bottom:10px;color:var(--cream-dim);">Removal Type</label>
        <div style="display:flex;flex-direction:column;gap:10px;">

          <label style="display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid rgba(251,191,36,.25);border-radius:10px;background:rgba(251,191,36,.04);cursor:pointer;">
            <input type="radio" name="layoff_mode" value="soft" checked style="margin-top:3px;accent-color:#fbbf24;">
            <div>
              <div style="font-weight:700;color:#fbbf24;margin-bottom:3px;">Soft Layoff (Recommended)</div>
              <div style="font-size:12px;color:var(--cream-dim);line-height:1.5;">
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
              <div style="font-size:12px;color:var(--cream-dim);line-height:1.5;">
                Deletes the user account, profile, BDM code, all change requests and encrypted documents.
                <strong>Projects and clients are kept</strong> but unlinked.
                <strong style="color:#f87171;">This CANNOT be undone.</strong>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label style="display:block;font-size:.8125rem;font-weight:600;margin-bottom:6px;color:var(--cream-dim);">Reason / Notes <span style="color:var(--cream-muted);font-weight:400;">(required)</span></label>
        <textarea id="mk9-layoff-reason" rows="3"
          placeholder="State the reason for this action (e.g. performance, misconduct, voluntary exit)…"
          style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;font-size:.875rem;resize:vertical;"></textarea>
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

  // ─── Google Sheets Sync ────────────────────────────────────────
  const adminSyncSheetsBtn = document.getElementById('mk9-admin-sync-sheets-btn');
  if (adminSyncSheetsBtn) {
    adminSyncSheetsBtn.addEventListener('click', async () => {
      const originalText = adminSyncSheetsBtn.textContent;
      adminSyncSheetsBtn.textContent = 'Syncing...';
      adminSyncSheetsBtn.disabled = true;
      try {
        const res = await adminAjax('mk9_admin_sync_sheets', {});
        if (res.success) {
          toast(res.data?.message || 'Sheets synced successfully!', 'success');
        } else {
          toast(res.data?.message || 'Sync failed.', 'error');
        }
      } catch {
        toast('Network error during sync.', 'error');
      } finally {
        adminSyncSheetsBtn.textContent = originalText;
        adminSyncSheetsBtn.disabled = false;
      }
    });
  }

  // ─── Change Admin Password ─────────────────────────────────────
  const adminChangePasswordBtn = document.getElementById('mk9-admin-change-password-btn');
  if (adminChangePasswordBtn) {
    adminChangePasswordBtn.addEventListener('click', () => {
      showAdminModal(`
        <form id="mk9-admin-change-pw-form" autocomplete="off">
          <div style="margin-bottom:16px">
            <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Current Password</label>
            <input type="password" id="mk9-admin-curr-pw" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;" required autocomplete="current-password">
          </div>
          <div style="margin-bottom:16px">
            <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">New Password</label>
            <input type="password" id="mk9-admin-new-pw" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;" required autocomplete="new-password">
          </div>
          <div style="margin-bottom:16px">
            <label style="display:block;font-size:.8125rem;margin-bottom:8px;color:var(--cream-dim)">Confirm New Password</label>
            <input type="password" id="mk9-admin-conf-pw" style="width:100%;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;" required autocomplete="new-password">
          </div>
        </form>
      `, 'Change Admin Password', [
        { text: 'Cancel', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--cancel', action: 'cancel' },
        { text: 'Change Password', cls: 'mk9-admin__modal-btn mk9-admin__modal-btn--confirm', action: 'confirm' }
      ], async () => {
        const current = document.getElementById('mk9-admin-curr-pw').value;
        const newPw = document.getElementById('mk9-admin-new-pw').value;
        const confirm = document.getElementById('mk9-admin-conf-pw').value;

        if (!current || !newPw || !confirm) {
          toast('All fields are required.', 'error');
          return;
        }
        if (newPw !== confirm) {
          toast('Passwords do not match.', 'error');
          return;
        }
        if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[a-z]/.test(newPw) || !/[0-9]/.test(newPw) || !/[^A-Za-z0-9]/.test(newPw)) {
          toast('Password must meet strength requirements (8+ chars, upper, lower, number, special).', 'error');
          return;
        }

        try {
          const res = await adminAjax('mk9_admin_change_password', {
            current_password: current,
            new_password: newPw,
            confirm_password: confirm
          });
          closeAdminModal();
          if (res.success) {
            toast('Password changed successfully!', 'success');
          } else {
            toast(res.data?.message || 'Failed to change password.', 'error');
          }
        } catch {
          toast('Network error.', 'error');
        }
      });
    });
  }

  // ─── Render Tickets Table (Admin) ─────────────────────────────
  const renderTickets = async () => {
    showLoading('mk9-tab-content');
    const res = await adminAjax('mk9_admin_get_data', { tab: 'tickets', filter: currentFilter });
    if (!res.success) { document.getElementById('mk9-tab-content').innerHTML = `<div class="mk9-admin__empty"><div class="mk9-admin__empty-text">Failed to load tickets.</div></div>`; return; }

    const { items, counts } = res.data;

    const tktStatusBadge = (status) => {
      const m = { 'open': ['#60a5fa','Open'], 'in-progress': ['#f59e0b','In Progress'], 'closed': ['#4ade80','Closed'] };
      const [c, l] = m[status] || ['#9ca3af', status];
      return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;background:${c}22;color:${c};border:1px solid ${c}44;"><span style="width:6px;height:6px;border-radius:50%;background:${c};display:inline-block;"></span>${l}</span>`;
    };

    const catLabel = (cat) => ({ general:'General', technical:'Technical Issue', payment:'Payment', account:'Account', other:'Other' }[cat] || cat);

    const filtersHtml = `
      <div class="mk9-admin__filters">
        ${['all','open','in-progress','closed'].map(f => `
          <button class="mk9-admin__filter ${currentFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f === 'in-progress' ? 'In Progress' : esc(f.charAt(0).toUpperCase() + f.slice(1))}
            <span style="opacity:.6">(${counts[f] || 0})</span>
          </button>
        `).join('')}
      </div>`;

    if (!items.length) {
      document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `<div class="mk9-admin__empty"><div class="mk9-admin__empty-icon">🎫</div><div class="mk9-admin__empty-text">No tickets found.</div></div>`;
      bindFilters('mk9-tab-content');
      return;
    }

    const rows = items.map(t => `
      <tr>
        <td><strong>${esc(t.bdm_name || 'Unknown')}</strong><br><span style="font-size:.75rem;color:var(--cream-muted)">Code: ${esc(t.bdm_code || '-')}</span></td>
        <td><strong>${esc(t.subject)}</strong><br><span style="font-size:.75rem;color:var(--cream-muted)">${catLabel(t.category)}</span></td>
        <td>${tktStatusBadge(t.status)}</td>
        <td>${t.reply_count}<br><span style="font-size:.75rem;color:${t.unread_bdm_replies > 0 ? '#60a5fa' : 'var(--cream-muted)'};">${t.unread_bdm_replies > 0 ? `${t.unread_bdm_replies} unread` : ''}</span></td>
        <td>${fmtDate(t.updated_at)}</td>
        <td>
          <div class="mk9-admin__actions">
            <button class="mk9-admin__action-btn mk9-admin__action-btn--view" data-action="view-ticket" data-id="${t.id}">Open</button>
          </div>
        </td>
      </tr>
    `).join('');

    document.getElementById('mk9-tab-content').innerHTML = filtersHtml + `
      <div class="mk9-admin__table-wrapper">
        <table class="mk9-admin__table">
          <thead><tr>
            <th>BDM</th><th>Subject / Category</th><th>Status</th><th>Replies</th><th>Last Updated</th><th>Action</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    bindFilters('mk9-tab-content');
    bindTableActions('mk9-tab-content');
  };

  // ─── Ticket Detail / Reply Modal (Admin) ─────────────────────
  const showTicketModal = async (ticketId) => {
    showAdminModal('<div class="mk9-admin__loading"><div class="mk9-admin__spinner"></div></div>', 'Support Ticket');

    const res = await adminAjax('mk9_admin_ticket_detail', { ticket_id: ticketId });
    if (!res.success) { closeAdminModal(); toast('Failed to load ticket.', 'error'); return; }

    const { ticket, replies } = res.data;
    const isClosed = ticket.status === 'closed';

    const tktStatusBadge = (s) => {
      const m = { 'open': ['#60a5fa','Open'], 'in-progress': ['#f59e0b','In Progress'], 'closed': ['#4ade80','Closed'] };
      const [c, l] = m[s] || ['#9ca3af', s];
      return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;background:${c}22;color:${c};border:1px solid ${c}44;"><span style="width:6px;height:6px;border-radius:50%;background:${c};display:inline-block;"></span>${l}</span>`;
    };

    const fmtDt2 = (str) => str ? new Date(str).toLocaleString('en-PK', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';

    const repliesHtml = replies.map(r => {
      const isAdmin = r.sender_role === 'admin';
      return `<div style="display:flex;${isAdmin ? 'justify-content:flex-end;' : ''}margin-bottom:12px;">
        <div style="max-width:80%;background:${isAdmin ? 'rgba(232,84,28,.1)' : 'rgba(96,165,250,.08)'};border:1px solid ${isAdmin ? 'rgba(232,84,28,.25)' : 'rgba(96,165,250,.2)'};border-radius:12px;padding:12px 16px;">
          <div style="font-size:11px;font-weight:700;color:${isAdmin ? 'var(--marmalade)' : '#60a5fa'};text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;font-family:'JetBrains Mono',monospace;">${isAdmin ? 'You (Admin)' : esc(ticket.bdm_name || 'BDM')} · ${fmtDt2(r.created_at)}</div>
          <div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">${esc(r.message)}</div>
        </div>
      </div>`;
    }).join('');

    const statusOptions = ['open','in-progress','closed'].map(s =>
      `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('');

    const bodyHtml = `
      <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--hairline);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:18px;font-weight:700;margin-bottom:4px;">${esc(ticket.subject)}</div>
            <div style="font-size:12px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">From: ${esc(ticket.bdm_name || 'Unknown')} · ${fmtDt2(ticket.created_at)}</div>
          </div>
          ${tktStatusBadge(ticket.status)}
        </div>
      </div>
      <div style="max-height:300px;overflow-y:auto;margin-bottom:20px;padding-right:4px;">${repliesHtml || '<p style="color:var(--cream-muted);font-size:13px;">No messages yet.</p>'}</div>
      <div style="border-top:1px solid var(--hairline);padding-top:16px;">
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">
          <label style="font-size:.8125rem;color:var(--cream-dim);flex-shrink:0;">Status:</label>
          <select id="mk9-ticket-admin-status" style="padding:8px 12px;background:#000;border:1px solid var(--cream-muted);border-radius:8px;color:var(--cream);font-family:inherit;">${statusOptions}</select>
          <button id="mk9-ticket-update-status-btn" style="padding:8px 16px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-size:13px;cursor:pointer;">Update Status</button>
        </div>
        ${!isClosed ? `
        <textarea id="mk9-admin-ticket-reply" rows="3" placeholder="Write your reply to this BDM..." style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--ink);border:1px solid var(--hairline);border-radius:8px;color:var(--cream);font-family:inherit;font-size:.875rem;resize:vertical;margin-bottom:8px;"></textarea>
        <button id="mk9-admin-ticket-reply-btn" style="padding:10px 20px;background:var(--marmalade);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Send Reply</button>
        ` : `<p style="color:#4ade80;font-size:13px;">✓ This ticket is closed.</p>`}
      </div>`;

    // Replace modal body
    const modalBody = document.querySelector('#mk9-admin-modal-overlay .mk9-admin__modal-body');
    const modalTitle = document.querySelector('#mk9-admin-modal-overlay .mk9-admin__modal-title');
    if (modalBody) modalBody.innerHTML = bodyHtml;
    if (modalTitle) modalTitle.textContent = 'Support Ticket';

    // Status update
    document.getElementById('mk9-ticket-update-status-btn')?.addEventListener('click', async () => {
      const status = document.getElementById('mk9-ticket-admin-status')?.value;
      const res2 = await adminAjax('mk9_admin_ticket_status', { id: ticketId, status });
      if (res2.success) {
        toast('Ticket status updated.', 'success');
        await updateStats();
        renderTickets();
        closeAdminModal();
      } else {
        toast(res2.data?.message || 'Failed.', 'error');
      }
    });

    // Admin reply
    document.getElementById('mk9-admin-ticket-reply-btn')?.addEventListener('click', async () => {
      const msg = (document.getElementById('mk9-admin-ticket-reply')?.value || '').trim();
      if (!msg) return;
      const replyBtn = document.getElementById('mk9-admin-ticket-reply-btn');
      if (replyBtn) { replyBtn.textContent = 'Sending...'; replyBtn.disabled = true; }
      const res3 = await adminAjax('mk9_admin_ticket_reply', { ticket_id: ticketId, message: msg });
      if (res3.success) {
        toast('Reply sent!', 'success');
        await updateStats();
        showTicketModal(ticketId); // Reload detail
      } else {
        toast(res3.data?.message || 'Failed.', 'error');
        if (replyBtn) { replyBtn.textContent = 'Send Reply'; replyBtn.disabled = false; }
      }
    });
  };
});


