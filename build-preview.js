const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'preview');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Copy assets
const assetsSrc = path.join(__dirname, 'assets');
const assetsDest = path.join(outDir, 'assets');
fs.cpSync(assetsSrc, assetsDest, { recursive: true });

// Read partials and clean PHP tags
const head = fs.readFileSync(path.join(__dirname, 'partials', 'head.php'), 'utf8')
    .replace(/<\?php[\s\S]*?\?>/g, '')
    .replace('<?php echo htmlspecialchars($pageTitle, ENT_QUOTES, \'UTF-8\'); ?>', 'Preview')
    .replace('<?php echo htmlspecialchars($bodyClass, ENT_QUOTES, \'UTF-8\'); ?>', '')
    .replace('<?php echo $nonce; ?>', 'dummy_nonce');

const footer = fs.readFileSync(path.join(__dirname, 'partials', 'footer.php'), 'utf8')
    .replace(/<\?php[\s\S]*?\?>/g, '');

const pages = [
    { src: 'landing.php', dest: 'index.html' },
    { src: 'login.php', dest: 'login.html' },
    { src: 'register.php', dest: 'register.html' },
    { src: 'client-apply.php', dest: 'apply.html' },
    { src: 'dashboard.php', dest: 'dashboard.html' },
    { src: 'admin/index.php', dest: 'admin.html' }
];

pages.forEach(page => {
    let content = fs.readFileSync(path.join(__dirname, 'pages', page.src), 'utf8');
    
    // Remove requires and basic PHP blocks
    content = content.replace(/<\?php[\s\S]*?\?>/g, '');
    
    // Stitch it
    let fullHtml = head + '\n' + content + '\n' + footer;
    
    // Fix asset paths
    fullHtml = fullHtml.replace(/\/assets\//g, './assets/');
    fullHtml = fullHtml.replace(/href="\//g, 'href="./');
    fullHtml = fullHtml.replace(/href="\/login"/g, 'href="./login.html"');
    fullHtml = fullHtml.replace(/href="\/register"/g, 'href="./register.html"');
    fullHtml = fullHtml.replace(/href="\/apply"/g, 'href="./apply.html"');
    
    fs.writeFileSync(path.join(outDir, page.dest), fullHtml);
});

console.log('Preview generated in /preview folder.');
