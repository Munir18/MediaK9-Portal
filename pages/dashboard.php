<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/BDM.php';
Auth::start();

// Allow admins to view a BDM dashboard in impersonation mode
$isAdminView = false;
if (Auth::isAdmin() && Auth::isImpersonating()) {
    $isAdminView = true;
    $userId = Auth::impersonatedBdmId();
} elseif (Auth::isAdmin() && !Auth::isImpersonating()) {
    // Admin directly hitting /dashboard without impersonating - send them to admin panel
    header('Location: /admin');
    exit;
} else {
    Auth::requireBDM();
    $userId = Auth::userId();
}

$profile = BDM::getProfile($userId);
$pageTitle = 'My Dashboard';
$extraJs   = ['dashboard.js'];
require_once dirname(__DIR__) . '/partials/head.php';
?>
<style>
/* Dashboard Specific Layout adapting Studio Design System */
body { background: var(--black); }
.d-layout { display: flex; min-height: 100vh; padding-top: 80px; max-width: 1400px; margin: 0 auto; gap: 40px; padding-left: 40px; padding-right: 40px; }
.d-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 32px; position: sticky; top: 100px; height: calc(100vh - 120px); }
.d-main { flex: 1; padding-bottom: 80px; }
.d-card { background: var(--ink); border: 1px solid var(--hairline); border-radius: 16px; padding: 24px; position: relative; overflow: hidden; }
.d-card::before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%); pointer-events: none; }

/* Sidebar Profile */
.d-profile-av { width: 48px; height: 48px; border-radius: 12px; background: rgba(196,229,56,0.1); color: var(--lime); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; border: 1px solid rgba(196,229,56,0.2); margin-bottom: 16px; }
.d-profile-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.d-profile-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; color: var(--marmalade); background: rgba(232,84,28,0.1); padding: 4px 8px; border-radius: 4px; display: inline-block; }

/* Nav Items */
.mk9-sidebar__nav-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px; background: transparent; border: none; border-radius: 8px; color: var(--cream-dim); font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; margin-bottom: 4px; }
.mk9-sidebar__nav-item:hover { background: rgba(255,255,255,0.03); color: var(--cream); }
.mk9-sidebar__nav-item.active { background: var(--ink); color: var(--lime); border: 1px solid var(--hairline); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
.mk9-sidebar__nav-item__badge { margin-left: auto; background: var(--marmalade); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 700; }
.nav-section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--cream-muted); margin-bottom: 12px; padding-left: 16px; }

/* Views */
.mk9-view { display: none; animation: fadeUp 0.4s ease forwards; }
.mk9-view.active { display: block; }

/* Stats Grid */
.d-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
.d-stat-val { font-size: 32px; font-weight: 700; margin: 12px 0 4px; letter-spacing: -0.03em; }
.d-stat-lbl { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cream-muted); }

/* Projects Tabs */
.mk9-tab-section { margin-bottom: 32px; }
.mk9-tab-section__title { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--hairline); padding-bottom: 12px; }
.mk9-loader { padding: 40px; text-align: center; color: var(--cream-dim); font-size: 13px; }

/* Profile Fields */
.p-field { margin-bottom: 20px; }
.p-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cream-muted); margin-bottom: 6px; }
.p-val { font-size: 15px; font-weight: 500; }

@media (max-width: 900px) {
  .d-layout { flex-direction: column; padding: 100px 20px 40px; }
  .d-sidebar { width: 100%; height: auto; position: relative; top: 0; }
}
</style>

<div class="d-layout" id="mk9-dashboard" data-user-id="<?php echo $userId; ?>" data-admin-view="<?php echo $isAdminView ? '1' : '0'; ?>">
  
  <?php if ($isAdminView): ?>
  <div style="position:fixed;top:70px;left:0;right:0;z-index:9998;background:rgba(232,84,28,0.95);color:#fff;text-align:center;padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:20px;font-size:13px;font-weight:600;backdrop-filter:blur(4px);">
    <span>ADMIN VIEW - You are viewing <strong id="mk9-impersonate-name"><?php echo htmlspecialchars($profile->full_name ?? 'BDM', ENT_QUOTES, 'UTF-8'); ?>'s</strong> dashboard. The BDM cannot see this.</span>
    <button id="mk9-exit-admin-view" style="background:#fff;color:#E8541C;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;">Exit Admin View → Back to Admin Panel</button>
  </div>
  <?php endif; ?>
  
  <aside class="d-sidebar">
    <div class="d-card" style="padding: 20px;">
      <div class="d-profile-av" id="mk9-profile-avatar">
        <?php echo htmlspecialchars(mb_strtoupper(mb_substr($profile->full_name ?? 'U', 0, 1)), ENT_QUOTES, 'UTF-8'); ?>
      </div>
      <div class="d-profile-name" id="mk9-profile-name"><?php echo htmlspecialchars($profile->full_name ?? '', ENT_QUOTES, 'UTF-8'); ?></div>
      <?php if ($profile && $profile->bdm_code): ?>
        <div class="d-profile-code">#<?php echo htmlspecialchars($profile->bdm_code, ENT_QUOTES, 'UTF-8'); ?></div>
      <?php endif; ?>
    </div>

    <nav>
      <div class="nav-section-title">Dashboard</div>
      <button class="mk9-sidebar__nav-item active" data-view="projects">
        My Projects
        <span class="mk9-sidebar__nav-item__badge" id="mk9-pending-badge" style="display:none">0</span>
      </button>
      
      <div class="nav-section-title" style="margin-top:24px;">Account</div>
      <button class="mk9-sidebar__nav-item" data-view="profile">
        My Profile
      </button>
      <button class="mk9-sidebar__nav-item" data-view="changes">
        Change Requests
      </button>
      <button class="mk9-sidebar__nav-item" data-view="tickets" id="mk9-nav-tickets">
        Support Tickets
        <span class="mk9-sidebar__nav-item__badge" id="mk9-ticket-badge" style="display:none;background:#60a5fa">!</span>
      </button>

      <div style="margin-top:40px; padding-top:24px; border-top:1px solid var(--hairline);">
        <a href="#" class="mk9-sidebar__nav-item mk9-logout-link" style="color:var(--marmalade);">
          Logout
        </a>
      </div>
    </nav>
  </aside>

  <main class="d-main">
    
    <!-- PROJECTS VIEW -->
    <div class="mk9-view active" id="mk9-view-projects">
      <div style="margin-bottom:32px;">
        <h2 style="font-size:32px;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">My Projects</h2>
        <p style="color:var(--cream-dim);">Track all your client projects and their statuses.</p>
      </div>

      <div class="d-stats">
        <div class="d-card" style="border-top:2px solid var(--cream);">
          <div class="d-stat-val" id="mk9-count-total">-</div>
          <div class="d-stat-lbl">Total Leads/Projects</div>
        </div>
        <div class="d-card" style="border-top:2px solid var(--marmalade);">
          <div class="d-stat-val" id="mk9-count-pending" style="color:var(--marmalade);">-</div>
          <div class="d-stat-lbl">Pending Review</div>
        </div>
        <div class="d-card" style="border-top:2px solid var(--lime);">
          <div class="d-stat-val" id="mk9-count-ongoing" style="color:var(--lime);">-</div>
          <div class="d-stat-lbl">Ongoing</div>
        </div>
        <div class="d-card" style="border-top:2px solid #4ade80;">
          <div class="d-stat-val" id="mk9-count-completed" style="color:#4ade80;">-</div>
          <div class="d-stat-lbl">Completed</div>
        </div>
        <div class="d-card" style="border-top:2px solid #f87171;">
          <div class="d-stat-val" id="mk9-count-rejected" style="color:#f87171;">-</div>
          <div class="d-stat-lbl">Rejected</div>
        </div>
      </div>

      <div class="d-card" style="margin-top:24px; border:1px solid var(--lime); background:rgba(196,229,56,.05);">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <div class="p-label" style="color:var(--lime);">Bonus Eligibility</div>
          <div class="p-label" id="mk9-bonus-text">0/5 Projects</div>
        </div>
        <div style="height:6px; background:var(--ink); border-radius:3px; overflow:hidden;">
          <div id="mk9-bonus-bar" style="height:100%; width:0%; background:var(--lime); transition:width 0.5s ease;"></div>
        </div>
        <p style="font-size:12px; color:var(--cream-muted); margin-top:12px; margin-bottom:0;">Reach 5 ongoing or completed projects to qualify for the BDM bonus.</p>
      </div>

      <div class="mk9-tab-section" style="margin-top:32px;">
        <div class="mk9-tab-section__title">Pending Review</div>
        <div id="mk9-projects-pending"><div class="mk9-loader">Loading pending projects...</div></div>
      </div>
      <div class="mk9-tab-section">
        <div class="mk9-tab-section__title">Ongoing Work</div>
        <div id="mk9-projects-ongoing"><div class="mk9-loader">Loading ongoing projects...</div></div>
      </div>
      <div class="mk9-tab-section">
        <div class="mk9-tab-section__title">Completed</div>
        <div id="mk9-projects-completed"><div class="mk9-loader">Loading completed projects...</div></div>
      </div>
      <div class="mk9-tab-section" id="mk9-section-rejected" style="display:none;">
        <div class="mk9-tab-section__title" style="color:#f87171;">Rejected Leads</div>
        <div id="mk9-projects-rejected"><div class="mk9-loader">Loading rejected leads...</div></div>
      </div>
    </div>

    <!-- PROFILE VIEW -->
    <div class="mk9-view" id="mk9-view-profile">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;">
        <div>
          <h2 style="font-size:32px;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">My Profile</h2>
          <p style="color:var(--cream-dim);">Your BDM account information.</p>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <span id="mk9-edit-info" style="display:none;font-size:12px;color:var(--marmalade);margin-right:8px;"> Free edit used</span>
          <button class="btn btn-sec" id="mk9-edit-profile-btn" style="padding:10px 16px;font-size:13px;"> Edit Name</button>
          <button class="btn btn-sec" id="mk9-change-password-btn" style="padding:10px 16px;font-size:13px;"> Change Password</button>
        </div>
      </div>

      <div class="d-card" style="margin-bottom:24px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div class="p-field">
            <div class="p-label">Full Name</div>
            <div class="p-val" id="mk9-field-name"><?php echo htmlspecialchars($profile->full_name ?? '', ENT_QUOTES, 'UTF-8'); ?></div>
          </div>
          <div class="p-field">
            <div class="p-label">Email Address</div>
            <div class="p-val" id="mk9-field-email"><?php echo htmlspecialchars($profile->email ?? '', ENT_QUOTES, 'UTF-8'); ?></div>
          </div>
          <div class="p-field">
            <div class="p-label">Father's Name</div>
            <div class="p-val" id="mk9-field-father-name"><?php echo htmlspecialchars($profile->father_name ?? '-', ENT_QUOTES, 'UTF-8'); ?></div>
          </div>
          <div class="p-field">
            <div class="p-label">Phone Number</div>
            <div class="p-val" id="mk9-field-phone"><?php echo htmlspecialchars($profile->phone ?? '-', ENT_QUOTES, 'UTF-8'); ?></div>
          </div>
          <div class="p-field">
            <div class="p-label">BDM Code</div>
            <div class="p-val" id="mk9-field-bdm-code" style="color:var(--lime);"><?php echo htmlspecialchars($profile->bdm_code ?? '-', ENT_QUOTES, 'UTF-8'); ?></div>
          </div>
          <div class="p-field">
            <div class="p-label">Member Since</div>
            <div class="p-val" id="mk9-field-joined"><?php echo htmlspecialchars($profile ? date('d M Y', strtotime($profile->created_at)) : '-', ENT_QUOTES, 'UTF-8'); ?></div>
          </div>
        </div>
      </div>

      <div class="d-card" style="display:flex;align-items:center;gap:16px;background:rgba(196,229,56,.03);border-color:rgba(196,229,56,.1);">
        <div style="font-size:14px; color:var(--lime); font-family:'JetBrains Mono',monospace;">[STATUS]</div>
        <div>
          <div class="p-label" style="margin-bottom:2px;">Account Status</div>
          <div style="color:var(--lime);font-weight:700;text-transform:uppercase;font-size:14px;letter-spacing:0.05em;">
            <?php echo htmlspecialchars(ucfirst($profile->status ?? 'Unknown'), ENT_QUOTES, 'UTF-8'); ?>
          </div>
        </div>
      </div>

      <?php if ($profile && !$profile->can_edit): ?>
      <script>document.addEventListener('DOMContentLoaded', () => {
          const b = document.getElementById('mk9-edit-profile-btn');
          const i = document.getElementById('mk9-edit-info');
          if (b) { b.textContent = 'Submit Change Request'; b.setAttribute('data-mode','change-request'); b.classList.add('btn-pri'); b.classList.remove('btn-sec'); }
          if (i) i.style.display = 'inline-block';
      });</script>
      <?php endif; ?>
    </div>

    <!-- CHANGE REQUESTS VIEW -->
    <div class="mk9-view" id="mk9-view-changes">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;">
        <div>
          <h2 style="font-size:32px;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">Change Requests</h2>
          <p style="color:var(--cream-dim);">Request profile updates for admin review.</p>
        </div>
        <button class="btn btn-pri" id="mk9-edit-profile-btn-changes" style="padding:10px 16px;font-size:13px;">+ New Request</button>
      </div>

      <div style="margin-bottom:24px;padding:12px 16px;background:rgba(255,255,255,.05);border-radius:10px;font-size:13px;color:var(--cream-muted);">
        ℹ After your first free edit, all further changes require admin approval.
      </div>
      
      <div class="d-card">
        <div id="mk9-change-requests-list"><div class="mk9-loader">Loading history...</div></div>
      </div>
    </div>

    <!-- TICKETS VIEW -->
    <div class="mk9-view" id="mk9-view-tickets">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;">
        <div>
          <h2 style="font-size:32px;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">Support Tickets</h2>
          <p style="color:var(--cream-dim);">Get help with technical, payment, or account issues.</p>
        </div>
        <button class="btn btn-pri" id="mk9-new-ticket-btn" style="padding:10px 16px;font-size:13px;">+ New Ticket</button>
      </div>

      <!-- New Ticket Form (hidden by default) -->
      <div class="d-card" id="mk9-new-ticket-form" style="display:none;margin-bottom:24px;border-color:rgba(96,165,250,.25);">
        <div style="font-size:16px;font-weight:700;margin-bottom:20px;color:#60a5fa;">Open a New Support Ticket</div>
        <div id="mk9-ticket-form-alert" style="display:none;padding:12px 16px;border-radius:8px;margin-bottom:14px;font-size:13px;font-weight:500;"></div>
        <label style="display:block;margin-bottom:16px;">
          <div class="p-label" style="margin-bottom:8px;">Subject</div>
          <input type="text" id="mk9-ticket-subject" placeholder="Brief description of your issue" style="width:100%;box-sizing:border-box;">
        </label>
        <label style="display:block;margin-bottom:16px;">
          <div class="p-label" style="margin-bottom:8px;">Category</div>
          <select id="mk9-ticket-category" style="width:100%;padding:12px 16px;background:var(--black);border:1px solid var(--hairline);border-radius:10px;color:var(--cream);font-family:'Space Grotesk',sans-serif;font-size:14px;">
            <option value="general">General</option>
            <option value="technical">Technical Issue</option>
            <option value="payment">Payment</option>
            <option value="account">Account</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label style="display:block;margin-bottom:20px;">
          <div class="p-label" style="margin-bottom:8px;">Describe Your Issue</div>
          <textarea id="mk9-ticket-message" rows="5" placeholder="Explain the problem in detail..." style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
        </label>
        <div style="display:flex;gap:12px;">
          <button class="btn btn-pri" id="mk9-ticket-submit-btn" style="padding:10px 20px;font-size:13px;">Submit Ticket</button>
          <button class="btn btn-sec" id="mk9-ticket-cancel-btn" style="padding:10px 20px;font-size:13px;">Cancel</button>
        </div>
      </div>

      <!-- Ticket List -->
      <div class="d-card" id="mk9-ticket-list-wrap">
        <div id="mk9-ticket-list"><div class="mk9-loader">Loading your tickets...</div></div>
      </div>

      <!-- Ticket Detail (hidden until ticket clicked) -->
      <div id="mk9-ticket-detail-wrap" style="display:none;margin-top:24px;">
        <button id="mk9-ticket-back-btn" style="background:none;border:none;color:var(--lime);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:6px;font-family:'Space Grotesk',sans-serif;">← Back to All Tickets</button>
        <div class="d-card" id="mk9-ticket-detail-card">
          <div id="mk9-ticket-detail-header" style="border-bottom:1px solid var(--hairline);padding-bottom:20px;margin-bottom:24px;"></div>
          <div id="mk9-ticket-replies-list" style="display:flex;flex-direction:column;gap:16px;margin-bottom:24px;"></div>
          <!-- Reply Box -->
          <div id="mk9-ticket-reply-box">
            <textarea id="mk9-ticket-reply-msg" rows="3" placeholder="Write your reply..." style="width:100%;box-sizing:border-box;resize:vertical;margin-bottom:12px;"></textarea>
            <button class="btn btn-pri" id="mk9-ticket-reply-btn" style="padding:10px 20px;font-size:13px;">Send Reply</button>
          </div>
          <div id="mk9-ticket-closed-notice" style="display:none;padding:12px 16px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:8px;font-size:13px;color:#f87171;">This ticket is closed. Open a new ticket if you need further help.</div>
        </div>
      </div>
    </div>

  </main>
</div>



<?php require_once dirname(__DIR__) . '/partials/footer.php'; ?>
