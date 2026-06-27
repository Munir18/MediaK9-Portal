<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/BDMCode.php';
Auth::start();
$pageTitle = 'Client Application';
$extraJs   = ['client-form.js'];
require_once dirname(__DIR__) . '/partials/head.php';
if (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== '') {
    echo '<script src="https://www.google.com/recaptcha/api.js?render=' . RECAPTCHA_SITE_KEY . '"></script>';
}
?>
<style>
.mk9-form__error { display:none; color:var(--marmalade); font-size:11px; margin-top:6px; }
.mk9-form__error.active { display:block; }
.mk9-form__input--error { border-color:var(--marmalade) !important; }
</style>

<section class="p-hero" style="padding-bottom: 20px;">
  <div class="badge">Application · 02</div>
  <h1 data-blur data-blur-stagger="0.06">Work With<br><span class="accent">Media K9.</span></h1>
  <p class="lead fade-up">Tell us about your organization. Your BDM will guide you through the rest.</p>
</section>

<section class="contact glow-follow" style="padding-top: 0;">
  <div class="contact-grid" style="grid-template-columns: 1fr; max-width: 600px; margin: 0 auto;" id="mk9-client-container">
    <form class="c-form rv" id="mk9-client-form" novalidate autocomplete="off">
      
      <div style="margin-bottom:24px;padding:24px;background:rgba(232,84,28,.04);border:1px solid rgba(232,84,28,.15);border-radius:14px;">
        <label style="color:var(--marmalade);font-weight:700;margin-bottom:12px;font-size:11px;"> BDM Code <span style="color:var(--marmalade);font-size:13px;vertical-align:middle;">*</span> <span style="font-weight:400;color:var(--cream-muted);">(Required)</span></label>
        <input type="text" id="mk9-bdm-code" name="bdm_code" placeholder="E.g. 101" required maxlength="3" pattern="[0-9]{3}" inputmode="numeric" style="font-size:18px;font-weight:700;letter-spacing:.05em;background:rgba(10,8,7,.5);border-color:rgba(232,84,28,.2);">
        <div id="mk9-code-status" style="display:none;font-size:11px;margin-top:8px;font-weight:500"></div>
        <div id="mk9-code-error" style="display:none;color:#F87171;font-size:11px;margin-top:6px;font-weight:500;"></div>
        <p style="font-size:11px;color:var(--cream-dim);margin-top:8px;">Enter the 3-digit code from your MediaK9 representative. <strong style="color:var(--marmalade);">This field is required.</strong></p>
      </div>

      <div style="margin-bottom:16px; border-bottom:1px solid var(--hairline); padding-bottom:8px;">
        <h3 style="font-size:16px; font-weight:700;">Organization Information</h3>
      </div>

      <label class="mk9-form__group">Organization / Business Name
        <input type="text" id="mk9-org-name" name="organization_name" placeholder="Your Company Ltd." required>
        <div class="mk9-form__error" role="alert"></div>
      </label>

      <div class="c-row">
        <label class="mk9-form__group">Service Required / Project Type
          <input type="text" id="mk9-service" name="service_required" placeholder="e.g. Website Development, Branding, SEO" required>
          <div class="mk9-form__error" role="alert"></div>
        </label>
        <label class="mk9-form__group">Estimated Budget
          <input type="text" id="mk9-budget" name="budget" placeholder="e.g. PKR 150,000 or $1,000 USD" required>
          <div class="mk9-form__error" role="alert"></div>
        </label>
      </div>

      <div class="c-row">
        <label class="mk9-form__group">Website or Social Links <span style="font-size:9px">(Optional)</span>
          <input type="url" id="mk9-website" name="website" placeholder="https://yourcompany.com">
        </label>
        <label class="mk9-form__group">Project Timeline
          <select id="mk9-timeline" name="timeline" required>
            <option value="">- Select timeline -</option>
            <option value="Urgent (< 1 month)">Urgent (&lt; 1 month)</option>
            <option value="1 – 3 months">1 – 3 months</option>
            <option value="3 – 6 months">3 – 6 months</option>
            <option value="Flexible / Ongoing">Flexible / Ongoing</option>
          </select>
          <div class="mk9-form__error" role="alert"></div>
        </label>
      </div>

      <label class="mk9-form__group">Project Description & Requirements
        <textarea id="mk9-project-description" name="project_description" placeholder="Describe the project scope, goals, and what you expect from us..." required style="min-height:120px;"></textarea>
        <div class="mk9-form__error" role="alert"></div>
      </label>

      <label class="mk9-form__group">Key Competitors or Design References <span style="font-size:9px">(Optional)</span>
        <textarea id="mk9-competitors" name="competitors" placeholder="List any competitors or styles you like..." style="min-height:80px;"></textarea>
      </label>

      <div style="margin:24px 0 16px; border-bottom:1px solid var(--hairline); padding-bottom:8px;">
        <h3 style="font-size:16px; font-weight:700;">Contact Person</h3>
      </div>

      <div class="c-row">
        <label class="mk9-form__group">Full Name
          <input type="text" id="mk9-contact-name" name="contact_name" placeholder="Contact person name" required>
          <div class="mk9-form__error" role="alert"></div>
        </label>
        <label class="mk9-form__group">Phone Number
          <input type="tel" id="mk9-contact-phone" name="contact_phone" placeholder="03XX-XXXXXXX">
          <div class="mk9-form__error" role="alert"></div>
        </label>
      </div>

      <label class="mk9-form__group">Email Address
        <input type="email" id="mk9-contact-email" name="contact_email" placeholder="contact@yourcompany.com" required>
        <div class="mk9-form__error" role="alert"></div>
      </label>

      <div style="padding-top:16px;">
        <button type="button" class="btn btn-pri" id="mk9-client-submit" style="width:100%;justify-content:center;">Submit Application <span class="arr">→</span></button>
        <?php if (defined('RECAPTCHA_SITE_KEY') && RECAPTCHA_SITE_KEY !== ''): ?>
        <div style="margin-top:10px;text-align:center;">
          <span style="font-size:10px;color:var(--cream-muted);font-family:'JetBrains Mono',monospace;">
            🛡 Protected by reCAPTCHA v3 &middot;
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" style="color:var(--cream-muted);text-decoration:underline;text-underline-offset:2px;">Privacy</a> &middot;
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener" style="color:var(--cream-muted);text-decoration:underline;text-underline-offset:2px;">Terms</a>
          </span>
        </div>
        <?php else: ?>
        <p style="text-align:center;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:var(--cream-muted);">Your info is kept confidential</p>
        <?php endif; ?>
      </div>
    </form>

    <div style="margin-top:24px;text-align:center;border-top:1px solid var(--hairline);padding-top:24px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--cream-muted);margin-bottom:12px;">Are you a BDM?</p>
      <a href="/login" class="btn btn-sec" style="width:100%;justify-content:center;">Login to Dashboard</a>
    </div>

  </div>
</section>

<?php require_once dirname(__DIR__) . '/partials/footer.php'; ?>
