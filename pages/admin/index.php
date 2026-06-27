<?php
require_once dirname(dirname(__DIR__)) . '/config/config.php';
require_once dirname(dirname(__DIR__)) . '/config/database.php';
require_once dirname(dirname(__DIR__)) . '/src/Database.php';
require_once dirname(dirname(__DIR__)) . '/src/Auth.php';
require_once dirname(dirname(__DIR__)) . '/src/Admin.php';
require_once dirname(dirname(__DIR__)) . '/src/BDM.php';
require_once dirname(dirname(__DIR__)) . '/src/BDMCode.php';
require_once dirname(dirname(__DIR__)) . '/src/FileHandler.php';
require_once dirname(dirname(__DIR__)) . '/src/Client.php';
require_once dirname(dirname(__DIR__)) . '/src/ChangeRequest.php';
require_once dirname(dirname(__DIR__)) . '/src/Mailer.php';
Auth::start();
Auth::requireAdmin();
$pageTitle = 'Admin Panel';
$extraJs   = ['admin.js'];
require_once dirname(dirname(__DIR__)) . '/partials/head.php';
?>
<style>
/* Admin Panel Specific Styles using MediaK9 Studio Tokens */
body { background: var(--black); }
.mk9-admin { max-width: 1400px; margin: 0 auto; padding: 120px 40px 60px; min-height: 100vh; }
.mk9-admin__header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
.mk9-admin__title { font-size: 36px; font-weight: 700; letter-spacing: -0.03em; }
.mk9-admin__title span { color: var(--lime); }
.mk9-admin__stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 48px; }
.mk9-admin__stat { background: var(--ink); border: 1px solid var(--hairline); border-radius: 12px; padding: 20px; }
.mk9-admin__stat-value { font-size: 32px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.03em; }
.mk9-admin__stat-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cream-muted); }
.mk9-admin__stat--marmalade .mk9-admin__stat-value { color: var(--marmalade); }
.mk9-admin__stat--warning .mk9-admin__stat-value { color: #facc15; }
.mk9-admin__stat--success .mk9-admin__stat-value { color: #4ade80; }
.mk9-admin__stat--lime .mk9-admin__stat-value { color: var(--lime); }
.mk9-admin__stat--info .mk9-admin__stat-value { color: #60a5fa; }

.mk9-admin__tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--hairline); padding-bottom: 16px; overflow-x: auto; scrollbar-width: none; }
.mk9-admin__tab { background: transparent; border: 1px solid transparent; color: var(--cream-dim); padding: 10px 20px; border-radius: 30px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: 'Space Grotesk', sans-serif; display: flex; align-items: center; gap: 8px; }
.mk9-admin__tab:hover { color: var(--cream); background: rgba(255,255,255,0.05); }
.mk9-admin__tab.active { background: var(--lime); color: var(--black); border-color: var(--lime); }
.mk9-admin__tab-badge { background: var(--black); color: var(--lime); padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }

.mk9-admin__filters { display: flex; gap: 8px; margin-bottom: 24px; }
.mk9-admin__filter { background: var(--ink); border: 1px solid var(--hairline); color: var(--cream-dim); padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; }
.mk9-admin__filter:hover { border-color: var(--cream-dim); }
.mk9-admin__filter.active { background: var(--cream); color: var(--black); border-color: var(--cream); }

.mk9-admin__table-wrapper { background: var(--ink); border: 1px solid var(--hairline); border-radius: 16px; overflow: hidden; }
.mk9-admin__table { width: 100%; border-collapse: collapse; text-align: left; }
.mk9-admin__table th { background: rgba(255,255,255,0.02); padding: 16px 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cream-muted); border-bottom: 1px solid var(--hairline); }
.mk9-admin__table td { padding: 16px 20px; border-bottom: 1px solid var(--hairline); font-size: 14px; vertical-align: middle; }
.mk9-admin__table tr:last-child td { border-bottom: none; }
.mk9-admin__table tr:hover { background: rgba(255,255,255,0.02); }

.mk9-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }
.mk9-status__dot { width: 6px; height: 6px; border-radius: 50%; }
.mk9-status--pending { background: rgba(250,204,21,0.1); color: #facc15; }
.mk9-status--pending .mk9-status__dot { background: #facc15; }
.mk9-status--approved, .mk9-status--completed { background: rgba(74,222,128,0.1); color: #4ade80; }
.mk9-status--approved .mk9-status__dot, .mk9-status--completed .mk9-status__dot { background: #4ade80; }
.mk9-status--rejected { background: rgba(248,113,113,0.1); color: #f87171; }
.mk9-status--rejected .mk9-status__dot { background: #f87171; }
.mk9-status--ongoing { background: rgba(196,229,56,0.1); color: var(--lime); }
.mk9-status--ongoing .mk9-status__dot { background: var(--lime); }
.mk9-status--on-hold { background: rgba(245,158,11,0.12); color: #f59e0b; }
.mk9-status--on-hold .mk9-status__dot { background: #f59e0b; }

.mk9-admin__actions { display: flex; gap: 8px; }
.mk9-admin__action-btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: 'Space Grotesk', sans-serif; }
.mk9-admin__action-btn--view, .mk9-admin__action-btn--status { background: var(--ink); border-color: var(--hairline); color: var(--cream); }
.mk9-admin__action-btn--view:hover, .mk9-admin__action-btn--status:hover { background: rgba(255,255,255,0.1); }
.mk9-admin__action-btn--approve { background: rgba(74,222,128,0.1); color: #4ade80; border-color: rgba(74,222,128,0.3); }
.mk9-admin__action-btn--reject { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.3); }

/* Modals */
.mk9-admin__modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; cursor: auto !important; }
.mk9-admin__modal { background: var(--ink); border: 1px solid var(--hairline); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 32px; position: relative; cursor: auto !important; }
.mk9-admin__modal * { cursor: auto; }
.mk9-admin__modal button, .mk9-admin__modal a, .mk9-admin__modal select { cursor: pointer !important; }
.mk9-admin__modal input[type="text"], .mk9-admin__modal input[type="email"], .mk9-admin__modal textarea { cursor: text !important; }
.mk9-admin__modal-header { margin-bottom: 24px; }
.mk9-admin__modal-title { font-size: 24px; font-weight: 700; }
.mk9-admin__modal-close { position: absolute; top: 24px; right: 24px; background: none; border: none; color: var(--cream-dim); font-size: 24px; cursor: pointer; }
.mk9-admin__modal-footer { margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px; }
.mk9-admin__modal-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; cursor: pointer; border: none; }
.mk9-admin__modal-btn--cancel { background: transparent; color: var(--cream-dim); }
.mk9-admin__modal-btn--confirm { background: var(--lime); color: var(--black); }
.mk9-admin__modal-btn--danger { background: #f87171; color: var(--black); }

/* Admin Details Grid */
.mk9-admin__detail { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
.mk9-admin__detail-field { background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--hairline); }
.mk9-admin__detail-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cream-muted); margin-bottom: 8px; }
.mk9-admin__detail-value { font-size: 14px; font-weight: 500; }
.mk9-admin__doc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; border-top: 1px solid var(--hairline); padding-top: 24px; }
.mk9-admin__doc-card { text-align: center; }
.mk9-admin__doc-card img { width: 100%; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid var(--hairline); cursor: pointer; margin-bottom: 8px; }
.mk9-admin__doc-label { font-size: 11px; color: var(--cream-dim); }

.mk9-admin__empty { text-align: center; padding: 60px; background: var(--ink); border: 1px dashed var(--hairline); border-radius: 16px; }
.mk9-admin__empty-icon { font-size: 32px; margin-bottom: 16px; }
.mk9-admin__empty-text { color: var(--cream-dim); }

.mk9-admin__toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; z-index: 10000; animation: slideIn 0.3s forwards; }
.mk9-admin__toast--success { background: var(--lime); color: var(--black); }
.mk9-admin__toast--error { background: #f87171; color: var(--black); }
@keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Loader */
.mk9-admin__loading { padding: 60px; text-align: center; }
.mk9-admin__spinner { width: 32px; height: 32px; border: 3px solid rgba(196,229,56,0.2); border-top-color: var(--lime); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<div class="mk9-admin" id="mk9-admin-panel">
  <div class="mk9-admin__header">
    <div>
      <h1 class="mk9-admin__title">Media<span>K9</span> Portal</h1>
      <p style="color:var(--cream-dim);font-size:14px;margin-top:8px;">Campus Partnership Program - Admin Control Panel</p>
    </div>
    <div style="display:flex;gap:12px;align-items:center">
      <button class="btn btn-sec" id="mk9-admin-sync-sheets-btn" style="font-size:12px;padding:8px 16px;cursor:pointer;background:rgba(74,222,128,0.1);border-color:rgba(74,222,128,0.35);color:#4ade80;">Sync to Sheets</button>
      <button class="btn btn-sec" id="mk9-admin-change-password-btn" style="font-size:12px;padding:8px 16px;cursor:pointer;">Change Password</button>
      <a href="/apply" target="_blank" class="btn btn-sec" style="font-size:12px;padding:8px 16px;">↗ Client Form</a>
      <a href="#" class="btn btn-sec mk9-logout-link" style="font-size:12px;padding:8px 16px;color:var(--marmalade);border-color:rgba(232,84,28,.3);">Logout</a>
    </div>
  </div>

  <!-- ── Admin: Silently View a BDM Dashboard ── -->
  <div style="background:var(--ink);border:1px solid rgba(232,84,28,.25);border-radius:14px;padding:20px 24px;margin-bottom:32px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
    <div style="flex:1;min-width:200px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:var(--marmalade);margin-bottom:6px;">Admin Tool</div>
      <div style="font-size:15px;font-weight:600;">View a BDM's Dashboard</div>
      <div style="font-size:12px;color:var(--cream-dim);margin-top:2px;">The BDM will not be notified or see any indication.</div>
    </div>
    <select id="mk9-bdm-impersonate-select" style="flex:2;min-width:200px;padding:10px 14px;background:#000000;border:1px solid var(--cream-muted);border-radius:8px;color:var(--cream);font-family:'Space Grotesk',sans-serif;font-size:14px;cursor:pointer;">
      <option value="">- Select a BDM by ID -</option>
    </select>
    <button id="mk9-bdm-impersonate-btn" style="padding:10px 20px;background:var(--marmalade);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;font-family:'Space Grotesk',sans-serif;" disabled>
      Enter BDM View →
    </button>
  </div>

  <div class="mk9-admin__stats">
    <div class="mk9-admin__stat mk9-admin__stat--marmalade"><div class="mk9-admin__stat-value" id="mk9-stat-bdms-total">-</div><div class="mk9-admin__stat-label">Total BDMs</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--warning"><div class="mk9-admin__stat-value" id="mk9-stat-bdms-pending">-</div><div class="mk9-admin__stat-label">Pending BDMs</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--success"><div class="mk9-admin__stat-value" id="mk9-stat-bdms-approved">-</div><div class="mk9-admin__stat-label">Active BDMs</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--info"><div class="mk9-admin__stat-value" id="mk9-stat-clients-total">-</div><div class="mk9-admin__stat-label">Total Clients</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--warning"><div class="mk9-admin__stat-value" id="mk9-stat-clients-pending">-</div><div class="mk9-admin__stat-label">Pending Clients</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--marmalade"><div class="mk9-admin__stat-value" id="mk9-stat-projects-total">-</div><div class="mk9-admin__stat-label">Total Projects</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--lime"><div class="mk9-admin__stat-value" id="mk9-stat-ongoing">-</div><div class="mk9-admin__stat-label">Ongoing</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--success"><div class="mk9-admin__stat-value" id="mk9-stat-completed">-</div><div class="mk9-admin__stat-label">Completed</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--warning"><div class="mk9-admin__stat-value" id="mk9-stat-changes-pending">-</div><div class="mk9-admin__stat-label">Pending Changes</div></div>
    <div class="mk9-admin__stat mk9-admin__stat--info"><div class="mk9-admin__stat-value" id="mk9-stat-tickets-open">-</div><div class="mk9-admin__stat-label">Open Tickets</div></div>
  </div>

  <div class="mk9-admin__tabs" role="tablist">
    <button class="mk9-admin__tab active" data-tab="bdms">BDM Applications<span class="mk9-admin__tab-badge" id="mk9-tab-badge-bdms" style="display:none"></span></button>
    <button class="mk9-admin__tab" data-tab="clients">Client Applications</button>
    <button class="mk9-admin__tab" data-tab="projects">Projects</button>
    <button class="mk9-admin__tab" data-tab="leaderboard">Leaderboard</button>
    <button class="mk9-admin__tab" data-tab="changes">Change Requests</button>
    <button class="mk9-admin__tab" data-tab="tickets">Support Tickets<span class="mk9-admin__tab-badge" id="mk9-tab-badge-tickets" style="display:none"></span></button>
  </div>

  <div id="mk9-tab-content" role="tabpanel">
    <div class="mk9-admin__loading"><div class="mk9-admin__spinner"></div></div>
  </div>

  <div style="margin-top:48px;padding-top:24px;border-top:1px solid var(--hairline);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">
    <span>MK9 BDM Portal</span>
    <a href="/" target="_blank" style="color:var(--lime);text-decoration:none;">View Landing Page ↗</a>
  </div>
</div>
<?php require_once dirname(dirname(__DIR__)) . '/partials/footer.php'; ?>
