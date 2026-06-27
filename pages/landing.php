<?php
require_once __DIR__ . '/../src/Auth.php';

$pageTitle = 'Campus Partnership Program';
$bodyClass = 'landing-page';
require __DIR__ . '/../partials/head.php';
?>

<section class="hero">
  <div class="hero-canvas-wrap" aria-hidden="true"></div>
  <div class="hero-canvas-vignette" aria-hidden="true"></div>
  <div class="hero-inner">
    <div class="eyebrow">Campus Partnership Program</div>
    <h1 data-blur data-blur-stagger="0.05">Become a <span class="accent"><span
          class="hero-word">Partner</span></span><br>Build your <span class="outlined">future</span>.</h1>
    <p class="hero-sub">Represent Media K9 on your campus. Connect clients with our studio, manage projects through your
      dashboard, and earn commissions on every successful deal.</p>
    <div class="hero-ctas">
      <a href="/register" class="btn btn-pri">Apply as BDM <span class="arr">→</span></a>
      <a href="/login" class="btn btn-sec">Login</a>
      <a href="/apply" class="btn btn-sec" style="border-color:var(--lime);color:var(--lime);">Client Application</a>
    </div>
  </div>
  <div class="hero-bottom">
    <div class="b-stat">
      <span class="b-num"><span data-target="10">0</span><span class="u">%</span></span>
      <span class="b-lbl">Commission</span>
    </div>
    <div class="b-stat">
      <span class="b-num"><span data-target="50">0</span><span class="u">+</span></span>
      <span class="b-lbl">Active BDMs</span>
    </div>
    <div class="b-stat">
      <span class="b-num"><span data-target="20">0</span><span class="u">+</span></span>
      <span class="b-lbl">Universities</span>
    </div>
    <div class="b-stat">
      <span class="b-num"><span data-target="100">0</span><span class="u">%</span></span>
      <span class="b-lbl">Support</span>
    </div>
  </div>
</section>

<section class="philosophy glow-follow" style="padding: 100px 0;">
  <div class="phil-inner rv">
    <div class="badge">The Program · 01</div>
    <p class="phil-text">
      We handle the execution. You handle the relationships. <span class="quiet">No fulfillment headaches, no technical
        skills required.</span> Just <span class="accent">a direct pipeline</span> to an elite growth studio. <span
        class="lime">Bring the clients, we do the rest.</span>
    </p>
  </div>
</section>

<section class="cta">
  <div class="cta-inner">
    <div class="badge" style="justify-content:center;margin:0 auto 18px">Join Us · 02</div>
    <h2 data-blur data-blur-stagger="0.05">Ready to <span class="accent">get started?</span></h2>
    <div class="cta-actions">
      <a href="/register" class="btn btn-pri">Apply Now <span class="arr">→</span></a>
      <a href="/login" class="btn btn-sec">BDM Login</a>
      <a href="/apply" class="btn btn-sec" style="border-color:var(--lime);color:var(--lime);">Client Application</a>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../partials/footer.php'; ?>