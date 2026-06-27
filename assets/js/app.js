// ===== Cursor =====
(function(){
  const dot=document.querySelector('.cur-dot');
  const ring=document.querySelector('.cur-ring');
  if(!dot||!ring)return;
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px'});
  (function loop(){rx+=(mx-rx)*.18;ry+=(my-ry)*.18;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop)})();
  document.querySelectorAll('a,button,.tile,.svc,.t-card,.princ,.stat,.c-card,.reel-tab,.p-wall-cell,.reel-item').forEach(el=>{
    el.addEventListener('mouseenter',()=>ring.classList.add('h'));
    el.addEventListener('mouseleave',()=>ring.classList.remove('h'));
  });
})();

// ===== Reveal =====
(function(){
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}});
  },{threshold:.12});
  document.querySelectorAll('.rv').forEach(el=>obs.observe(el));
})();

// ===== Cursor glow on tiles & partner cells =====
(function(){
  document.querySelectorAll('.tile .vis,.p-wall-cell').forEach(c=>{
    c.addEventListener('mousemove',e=>{
      const r=c.getBoundingClientRect();
      c.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
      c.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
    });
  });
})();

// ===== Stat counters (single moment of interactivity) =====
(function(){
  function easeOutExpo(t){ return t===1 ? 1 : 1 - Math.pow(2, -10*t); }
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.querySelectorAll('[data-target]').forEach(el=>{
          const t=parseInt(el.dataset.target);
          const duration=1400;
          const start=performance.now();
          (function tick(now){
            const progress=Math.min((now-start)/duration,1);
            el.textContent=Math.floor(easeOutExpo(progress)*t);
            if(progress<1) requestAnimationFrame(tick);
            else el.textContent=t;
          })(performance.now());
        });
        obs.unobserve(e.target);
      }
    });
  },{threshold:.5});
  document.querySelectorAll('.stat,.b-stat').forEach(b=>obs.observe(b));
})();

// ===== Showreel category tabs =====
(function(){
  const tabs=document.querySelectorAll('.reel-tab');
  const cats=document.querySelectorAll('.reel-cat');
  if(!tabs.length)return;
  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>{
      const k=tab.dataset.cat;
      tabs.forEach(t=>t.classList.toggle('active',t===tab));
      cats.forEach(c=>c.classList.toggle('active',c.dataset.cat===k));
    });
  });
})();

// ===== POLISH PASS - BlurText word-stagger =====
// Auto-wraps text inside [data-blur] elements with .bw spans
// and triggers .in when scrolled into view.
(function(){
  const targets = document.querySelectorAll('[data-blur]');
  if (!targets.length) return;

  // Wrap each word in a span (preserve existing inline styles)
  targets.forEach(el => {
    if (el.dataset.blurReady) return;
    const html = el.innerHTML;
    // Split only top-level text nodes; keep inline elements intact
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    function wrapNode(node) {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        const words = node.textContent.split(/(\s+)/);
        words.forEach(w => {
          if (/^\s+$/.test(w)) {
            frag.appendChild(document.createTextNode(w));
          } else if (w.length) {
            const span = document.createElement('span');
            span.className = 'bw';
            span.textContent = w;
            frag.appendChild(span);
          }
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        // For inline elements (like <span class="accent">), wrap their inner text
        const childNodes = Array.from(node.childNodes);
        childNodes.forEach(wrapNode);
      }
    }
    Array.from(tmp.childNodes).forEach(wrapNode);
    el.innerHTML = tmp.innerHTML;
    el.classList.add('blur-text');
    el.dataset.blurReady = '1';
  });

  // Stagger reveal on intersect
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const words = el.querySelectorAll('.bw');
        const baseDelay = parseFloat(el.dataset.blurDelay || '0');
        const stagger = parseFloat(el.dataset.blurStagger || '0.07');
        words.forEach((w, i) => {
          w.style.transitionDelay = (baseDelay + i * stagger) + 's';
        });
        el.classList.add('in');
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.25 });
  targets.forEach(t => obs.observe(t));
})();

// ===== POLISH PASS - fade-up reveals =====
(function(){
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
})();

// ===== Testimonial click-to-focus =====
(function(){
  const overlay = document.getElementById('t-focus-overlay');
  if (!overlay) return;
  const focusText = overlay.querySelector('.t-focus-text');
  const focusName = overlay.querySelector('[data-focus-name]');
  const focusRole = overlay.querySelector('[data-focus-role]');
  const closeBtn = overlay.querySelector('.t-focus-close');
  let lastFocused = null;

  function openFocus(pill) {
    const text = pill.querySelector('.t-text-full')?.textContent || pill.querySelector('.t-text').textContent;
    const name = pill.querySelector('[data-name]')?.textContent || '';
    const role = pill.querySelector('[data-role]')?.textContent || '';
    focusText.textContent = text;
    focusName.textContent = name;
    focusRole.textContent = role;
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }
  function closeFocus() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus();
  }

  document.querySelectorAll('.t-pill').forEach(pill => {
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.addEventListener('click', e => { e.preventDefault(); openFocus(pill); });
    pill.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFocus(pill); } });
  });
  closeBtn?.addEventListener('click', closeFocus);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeFocus(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeFocus();
  });

  // Mark duplicate marquee pills (second half of each scroll row) as decorative
  document.querySelectorAll('.t-track-row').forEach(row => {
    const pills = row.querySelectorAll('.t-pill');
    const half = Math.floor(pills.length / 2);
    pills.forEach((p, i) => { if (i >= half) p.setAttribute('aria-hidden', 'true'); });
  });
  // Mark the reverse row's entire wrap as decorative (same content, opposite direction)
  const wraps = document.querySelectorAll('.t-marquee-wrap');
  if (wraps.length > 1) wraps[1].setAttribute('aria-hidden', 'true');
})();

// ===== HERO 3D PARTICLE FIELD =====
(function(){
  const wrap = document.querySelector('.hero-canvas-wrap');
  if (!wrap || typeof THREE === 'undefined') return;

  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));

  let w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 100);
  camera.position.set(0, 0, 12);

  // Particle ring + cloud
  const COUNT = 360;
  const positions = new Float32Array(COUNT*3);
  const origins = new Float32Array(COUNT*3);
  const colors = new Float32Array(COUNT*3);
  const sizes = new Float32Array(COUNT);

  const cMarmalade = new THREE.Color(0xE8541C);
  const cLime = new THREE.Color(0xC4E538);
  const cCream = new THREE.Color(0xF5EDE0);

  for (let i=0;i<COUNT;i++){
    // Mix: 70% on a torus shell, 30% scattered
    let x,y,z;
    if (Math.random() < 0.7){
      const a = Math.random()*Math.PI*2;
      const b = Math.random()*Math.PI*2;
      const R = 4.5 + (Math.random()-0.5)*0.8;
      const r = 0.8 + (Math.random()-0.5)*0.4;
      x = (R + r*Math.cos(b)) * Math.cos(a);
      y = r*Math.sin(b);
      z = (R + r*Math.cos(b)) * Math.sin(a);
    } else {
      const radius = 2 + Math.random()*4;
      const theta = Math.random()*Math.PI*2;
      const phi = Math.acos((Math.random()*2)-1);
      x = radius*Math.sin(phi)*Math.cos(theta);
      y = radius*Math.sin(phi)*Math.sin(theta);
      z = radius*Math.cos(phi);
    }
    positions[i*3]=origins[i*3]=x;
    positions[i*3+1]=origins[i*3+1]=y;
    positions[i*3+2]=origins[i*3+2]=z;

    sizes[i] = Math.random()*0.06 + 0.025;

    const r = Math.random();
    let c;
    if (r < 0.45) c = cMarmalade;
    else if (r < 0.6) c = cLime;
    else c = cCream;
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('origin',   new THREE.BufferAttribute(origins, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {value: 0},
      uMouse:{value: new THREE.Vector2(0,0)},
    },
    vertexShader:`
      attribute vec3 origin;
      attribute float size;
      attribute vec3 color;
      uniform float uTime;
      uniform vec2 uMouse;
      varying vec3 vColor;
      void main(){
        vColor = color;
        vec3 pos = origin;
        // Gentle breathing
        float breath = sin(uTime*0.4 + length(origin)*0.6)*0.06;
        pos *= 1.0 + breath;
        // Mouse repel
        vec2 sp = pos.xy*0.2;
        float md = distance(sp, uMouse*2.0);
        float repel = smoothstep(2.0, 0.0, md)*0.6;
        pos.xy += normalize(pos.xy - uMouse*2.0) * repel;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * 280.0 / (-mv.z);
      }
    `,
    fragmentShader:`
      varying vec3 vColor;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.18, 0.0, d);
        vec3 col = vColor*(glow + core*1.6);
        gl_FragColor = vec4(col, glow*0.85 + core);
      }
    `,
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Connection lines for the torus subset (first 70%)
  const torusEnd = Math.floor(COUNT*0.7);
  const linkP = [];
  const linkA = [];
  const THRESH = 1.4;
  for (let i=0;i<torusEnd;i++){
    for (let j=i+1;j<torusEnd && linkP.length < 1800; j++){
      const dx=origins[i*3]-origins[j*3];
      const dy=origins[i*3+1]-origins[j*3+1];
      const dz=origins[i*3+2]-origins[j*3+2];
      const d = Math.sqrt(dx*dx+dy*dy+dz*dz);
      if (d < THRESH){
        linkP.push(origins[i*3], origins[i*3+1], origins[i*3+2]);
        linkP.push(origins[j*3], origins[j*3+1], origins[j*3+2]);
        const a = (1 - d/THRESH)*0.3;
        linkA.push(a, a);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linkP), 3));
  lineGeo.setAttribute('lineAlpha', new THREE.BufferAttribute(new Float32Array(linkA), 1));
  const lineMat = new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    vertexShader:`
      attribute float lineAlpha;
      uniform float uTime;
      varying float vA;
      void main(){
        vec3 pos = position;
        float breath = sin(uTime*0.4 + length(position)*0.6)*0.06;
        pos *= 1.0 + breath;
        vA = lineAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader:`
      varying float vA;
      uniform float uTime;
      void main(){
        float t = sin(uTime*0.3)*0.5 + 0.5;
        vec3 col = mix(vec3(0.91,0.33,0.11), vec3(0.77,0.9,0.22), t*0.4);
        col = mix(col, vec3(0.96,0.93,0.88), 0.2);
        gl_FragColor = vec4(col, vA*0.7);
      }
    `,
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  let mx=0, my=0, cmx=0, cmy=0;
  wrap.parentElement.addEventListener('mousemove', e => {
    const r = wrap.getBoundingClientRect();
    mx = ((e.clientX - r.left)/r.width)*2 - 1;
    my = -((e.clientY - r.top)/r.height)*2 + 1;
  });

  window.addEventListener('resize', () => {
    w = wrap.clientWidth; h = wrap.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  });

  let lastT = 0;
  function anim(t){
    const time = t*0.001;
    mat.uniforms.uTime.value = time;
    lineMat.uniforms.uTime.value = time;
    cmx += (mx - cmx)*0.05;
    cmy += (my - cmy)*0.05;
    mat.uniforms.uMouse.value.set(cmx, cmy);

    points.rotation.y = time*0.06 + cmx*0.25;
    points.rotation.x = cmy*0.18;
    lines.rotation.y = points.rotation.y;
    lines.rotation.x = points.rotation.x;

    renderer.render(scene, camera);
    requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
})();

// ===== Scroll progress bar =====
(function(){
  const bar = document.createElement('div');
  bar.className = 'scroll-prog';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    bar.style.width = Math.min((window.scrollY / max) * 100, 100) + '%';
  }, {passive: true});
})();

// ===== Back to top =====
(function(){
  const btn = document.createElement('a');
  btn.className = 'back-top';
  btn.href = '#';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(btn);
  // hook cursor ring
  btn.addEventListener('mouseenter', () => document.querySelector('.cur-ring')?.classList.add('h'));
  btn.addEventListener('mouseleave', () => document.querySelector('.cur-ring')?.classList.remove('h'));
  window.addEventListener('scroll', () => {
    btn.classList.toggle('vis', window.scrollY > 400);
  }, {passive: true});
  btn.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
})();

// ===== Hero word cycle =====
(function(){
  const el = document.querySelector('.hero-word');
  if (!el) return;
  const words = ['brands', 'campaigns', 'products', 'stories'];
  let idx = 0;
  setInterval(() => {
    el.classList.add('out');
    setTimeout(() => {
      idx = (idx + 1) % words.length;
      el.textContent = words[idx];
      el.classList.remove('out');
    }, 230);
  }, 2600);
})();

// ===== Bento v3 cursor glow =====
(function(){
  document.querySelectorAll('.bento-v3 .b-vis').forEach(c => {
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });
})();

// ===== CASE FOCUS MODAL - bento card click =====
(function(){
  const overlay = document.getElementById('case-focus-overlay');
  if (!overlay) return;

  const els = {
    vis: overlay.querySelector('.case-focus-vis'),
    visImg: overlay.querySelector('.case-focus-vis img'),
    tag: overlay.querySelector('[data-cf-tag]'),
    name: overlay.querySelector('[data-cf-name]'),
    problem: overlay.querySelector('[data-cf-problem]'),
    approach: overlay.querySelector('[data-cf-approach]'),
    duration: overlay.querySelector('[data-cf-duration]'),
    channels: overlay.querySelector('[data-cf-channels]'),
    team: overlay.querySelector('[data-cf-team]'),
    social: overlay.querySelector('.case-focus-social'),
    close: overlay.querySelector('.case-focus-close'),
  };

  let lastFocusedCase = null;
  function open(card){
    const data = card.dataset;
    if (els.visImg && data.logo) els.visImg.src = data.logo;
    if (els.vis && data.bg) els.vis.className = 'case-focus-vis ' + data.bg;
    els.tag.textContent = data.tag || '';
    els.name.textContent = data.name || '';
    els.problem.textContent = data.problem || '';
    els.approach.textContent = data.approach || '';
    els.duration.textContent = data.duration || '';
    els.channels.textContent = data.channels || '';
    els.team.textContent = data.team || '';
    // Rebuild social icons from JSON in data-social
    if (els.social && data.social){
      try {
        const social = JSON.parse(data.social);
        els.social.innerHTML = Object.entries(social).map(([k,v]) =>
          `<a href="${v}" class="case-social-icon" target="_blank" rel="noopener noreferrer" aria-label="${data.name} on ${k}">${SOCIAL_ICON_MAP[k]||''}</a>`
        ).join('');
      } catch(e){}
    }
    lastFocusedCase = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    els.close?.focus();
  }
  function close(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocusedCase?.focus();
  }

  document.querySelectorAll('.b-card[data-name]').forEach(c => {
    c.addEventListener('click', e => { e.preventDefault(); open(c); });
  });
  els.close?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  // Cursor glow on bento cards
  document.querySelectorAll('.b-card .b-vis').forEach(v => {
    v.addEventListener('mousemove', e => {
      const r = v.getBoundingClientRect();
      v.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100) + '%');
      v.style.setProperty('--my', ((e.clientY - r.top)/r.height*100) + '%');
    });
  });
})();

// Social icons map for case focus modal
const SOCIAL_ICON_MAP = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
  tiktok:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4v9.5a4.5 4.5 0 1 1-4.5-4.5"/><path d="M16 4c0 2.5 2 4.5 4.5 4.5"/></svg>',
  linkedin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="11" x2="8" y2="17"/><circle cx="8" cy="7.5" r="0.6" fill="currentColor"/><path d="M12 17v-3.5a2 2 0 0 1 4 0V17"/><line x1="12" y1="11" x2="12" y2="17"/></svg>',
  web:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/></svg>',
};

// ===== MAGNETIC HOVER on primary CTAs =====
(function(){
  document.querySelectorAll('.btn-pri').forEach(btn => {
    let bounds;
    btn.addEventListener('mouseenter', () => {
      bounds = btn.getBoundingClientRect();
      // Disable transform transition during tracking so the button follows the cursor instantly
      btn.style.transition = 'background .3s, box-shadow .35s';
    });
    btn.addEventListener('mousemove', e => {
      if (!bounds) return;
      const x = e.clientX - bounds.left - bounds.width/2;
      const y = e.clientY - bounds.top - bounds.height/2;
      btn.style.transform = `translate(${x*0.18}px, ${y*0.25}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      // Re-enable transform transition for a spring-back release
      btn.style.transition = 'transform .5s cubic-bezier(.2,.9,.3,1.2), background .3s, box-shadow .35s';
      btn.style.transform = '';
      setTimeout(() => { btn.style.transition = ''; }, 500);
    });
  });
})();

// ===== Work page filter tabs =====
(function(){
  const filters = document.querySelectorAll('.wf-btn');
  if (!filters.length) return;
  const cards = document.querySelectorAll('.bento-v3 .b-card');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      cards.forEach(card => {
        const tag = (card.dataset.tag || '').toLowerCase();
        const match = cat === 'all' || tag.includes(cat);
        card.classList.toggle('hidden', !match);
      });
    });
  });
})();

// ===== Services expandable drawer =====
(function(){
  document.querySelectorAll('.svc-expand-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wrap = btn.closest('.svc-wrap');
      if (!wrap) return;
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.svc-wrap.open').forEach(s => s.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    });
  });
})();

// ===== Principle card 3D tilt =====
(function(){
  document.querySelectorAll('.princ').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// ===== Contact form live validation =====
(function(){
  const form = document.getElementById('contact-form');
  if (!form) return;
  function validate(input) {
    const label = input.closest('label');
    if (!label) return;
    label.classList.remove('field-ok','field-err');
    const errEl = label.querySelector('.field-err-msg');
    if (errEl) errEl.remove();
    if (!input.value.trim()) return;
    let err = '';
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) err = 'Valid email required';
    if (input.required && !input.value.trim()) err = 'Required';
    if (err) {
      label.classList.add('field-err');
      const msg = document.createElement('span');
      msg.className = 'field-err-msg';
      msg.textContent = err;
      label.appendChild(msg);
    } else {
      label.classList.add('field-ok');
    }
  }
  form.querySelectorAll('input,select,textarea').forEach(el => {
    el.addEventListener('blur', () => validate(el));
    el.addEventListener('input', () => {
      if (el.closest('label').classList.contains('field-err')) validate(el);
    });
  });
  // Textarea character count
  const ta = form.querySelector('textarea');
  if (ta) {
    const counter = document.createElement('span');
    counter.style.cssText = 'font-size:10px;color:var(--cream-muted);font-family:JetBrains Mono,monospace;text-align:right;display:block;margin-top:4px';
    ta.closest('label').appendChild(counter);
    const update = () => { counter.textContent = ta.value.length + ' chars'; };
    ta.addEventListener('input', update);
    update();
  }
})();

// ===== Section cursor glow follow =====
(function(){
  document.querySelectorAll('.glow-follow').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      el.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });
})();
