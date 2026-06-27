<footer>
  <div class="f-top">
    <div class="f-mark">
      <img src="/assets/logos/mediak9.png" alt="Media K9">
      <h3>An Islamabad studio building brands that <span class="accent">compound</span>.</h3>
      <p>We engineer the small details until they add up to something undeniable. Strategy, design, and growth - under one roof, for a small list of partners we believe in.</p>
    </div>
    <div class="f-col">
      <h4>Portal</h4>
      <a href="/">Home</a>
      <a href="/login">BDM Login</a>
      <a href="/register">Become a BDM</a>
      <a href="/apply">Client Application</a>
      <a href="https://mediak9.com/" target="_blank" rel="noopener">Media K9 Main Site</a>
    </div>
    <div class="f-col">
      <h4>Services</h4>
      <a href="https://mediak9.com/service-brand-strategy.html" target="_blank" rel="noopener">Brand strategy</a>
      <a href="https://mediak9.com/service-social-content.html" target="_blank" rel="noopener">Social & content</a>
      <a href="https://mediak9.com/service-performance-ads.html" target="_blank" rel="noopener">Performance ads</a>
      <a href="https://mediak9.com/service-web-product.html" target="_blank" rel="noopener">Web & product</a>
      <a href="https://mediak9.com/service-crm-lifecycle.html" target="_blank" rel="noopener">CRM & lifecycle</a>
    </div>
    <div class="f-col">
      <h4>Reach us</h4>
      <a href="mailto:mediak997@gmail.com">mediak997@gmail.com</a>
      <a href="tel:+923345441307">+92 334 544 1307</a>
      <p style="color:var(--cream-dim);margin-top:10px;font-size:12px;line-height:1.55">Office # 16, Green Plaza,<br>G-9 Markaz, Islamabad, Pakistan.</p>
    </div>
  </div>
  <div class="f-giant">
    <span>Media <span class="accent">K9</span></span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.15em;color:var(--cream-muted);text-transform:uppercase;font-weight:500;line-height:1.5">Est. Islamabad<br>2019 - 2026</span>
  </div>
  <div class="f-bot">
    <span>© <?php echo date('Y'); ?> Media K9. Crafted with care.</span>
    <span>Made in Islamabad</span>
  </div>
</footer>
<script src="/assets/js/app.js"></script>
<script src="/assets/js/portal.js"></script>
<?php if (!empty($extraJs)): foreach ($extraJs as $js): ?>
<script src="/assets/js/<?php echo htmlspecialchars($js, ENT_QUOTES, 'UTF-8'); ?>"></script>
<?php endforeach; endif; ?>
</body>
</html>
