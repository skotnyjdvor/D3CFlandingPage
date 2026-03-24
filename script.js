document.addEventListener('DOMContentLoaded', () => {

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.feature-card, .features__title').forEach(el => observer.observe(el));

  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.borderBottomColor = 'rgba(255,255,255,0.15)';
      header.style.background = 'rgba(5,5,10,0.97)';
    } else {
      header.style.borderBottomColor = '';
      header.style.background = '';
    }
  }, { passive: true });

  const heroWrapper = document.querySelector('.hero__logo-wrapper');
  if (heroWrapper) {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      const glow = heroWrapper.querySelector('.hero__logo-glow');
      if (glow) glow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }, { passive: true });
  }

  removeBlackBg('.hero__logo', 50);
  initTunnel();
});

function removeBlackBg(selector, threshold) {
  const img = document.querySelector(selector);
  if (!img) return;

  const process = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;

    for (let i = 0; i < px.length; i += 4) {
      const brightness = px[i] * 0.299 + px[i+1] * 0.587 + px[i+2] * 0.114;
      if (brightness < threshold) {
        px[i+3] = 0;
      } else if (brightness < threshold + 40) {
        px[i+3] = Math.round(((brightness - threshold) / 40) * 255);
      }
    }

    ctx.putImageData(data, 0, 0);
    img.src = c.toDataURL('image/png');
  };

  if (img.complete && img.naturalWidth) process();
  else img.addEventListener('load', process);
}

function initTunnel() {
  const canvas = document.getElementById('tunnelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, vpx, vpy;
  let time = 0;
  const isLowPowerDevice =
    window.matchMedia('(max-width: 1024px)').matches ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const RENDER_SCALE = isLowPowerDevice ? 0.74 : 0.9;
  const RING_COUNT = isLowPowerDevice ? 18 : 24;
  const CHART_POINTS = isLowPowerDevice ? 28 : 38;
  const STREAK_COUNT = isLowPowerDevice ? 20 : 28;
  const CORNER_POINT_COUNT = isLowPowerDevice ? 36 : 52;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * RENDER_SCALE));
    canvas.height = Math.max(1, Math.floor(H * RENDER_SCALE));
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    vpx = W * 0.5;
    vpy = H * 0.35;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ================================================
  // PERSPECTIVE TUNNEL LINES
  // ================================================

  function drawTunnelLines() {
    const corners = [
      [0, 0], [W, 0], [W, H], [0, H],
      [W * 0.15, 0], [W * 0.35, 0], [W * 0.65, 0], [W * 0.85, 0],
      [W * 0.15, H], [W * 0.35, H], [W * 0.65, H], [W * 0.85, H],
      [0, H * 0.15], [0, H * 0.3], [0, H * 0.5], [0, H * 0.7], [0, H * 0.85],
      [W, H * 0.15], [W, H * 0.3], [W, H * 0.5], [W, H * 0.7], [W, H * 0.85],
    ];

    corners.forEach(([ex, ey], i) => {
      const isPrimary = i < 4;
      const grad = ctx.createLinearGradient(vpx, vpy, ex, ey);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.1, 'rgba(255,255,255,0)');
      grad.addColorStop(0.3, `rgba(255,255,255,${isPrimary ? 0.18 : 0.06})`);
      grad.addColorStop(1, `rgba(255,255,255,${isPrimary ? 0.3 : 0.09})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = isPrimary ? 1.2 : 0.5;
      ctx.beginPath();
      ctx.moveTo(vpx, vpy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      if (isPrimary) {
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.04;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }

  // ================================================
  // DEPTH RINGS
  // ================================================

  function drawDepthRings() {
    const phase = (time * 0.0002) % (1 / RING_COUNT);

    for (let i = 0; i < RING_COUNT; i++) {
      let t = (i / RING_COUNT + phase) % 1;
      const eased = t * t;

      const hw = 30 + (W * 0.55) * eased;
      const hh = 18 + (H * 0.55) * eased;
      const rx = vpx - hw;
      const ry = vpy - hh;

      const alpha = Math.sin(t * Math.PI) * 0.12;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.rect(rx, ry, hw * 2, hh * 2);
      ctx.stroke();
    }
  }

  // ================================================
  // EDGE DASHBOARD PANELS
  // ================================================

  function drawEdgePanel(x, y, w, h, cfg) {
    ctx.fillStyle = 'rgba(8,8,12,0.6)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Top edge glow - bright white
    const topGrad = ctx.createLinearGradient(x, y, x + w, y);
    topGrad.addColorStop(0, 'rgba(255,255,255,0)');
    topGrad.addColorStop(0.2, 'rgba(255,255,255,0.4)');
    topGrad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    topGrad.addColorStop(0.8, 'rgba(255,255,255,0.4)');
    topGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = topGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    // Bloom
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.08;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.3;
    const gsx = w / 8, gsy = h / 6;
    for (let gx = 1; gx < 8; gx++) {
      ctx.beginPath();
      ctx.moveTo(x + gx * gsx, y);
      ctx.lineTo(x + gx * gsx, y + h);
      ctx.stroke();
    }
    for (let gy = 1; gy < 6; gy++) {
      ctx.beginPath();
      ctx.moveTo(x, y + gy * gsy);
      ctx.lineTo(x + w, y + gy * gsy);
      ctx.stroke();
    }

    // Title
    if (cfg.title) {
      const fs = Math.max(9, w * 0.06);
      ctx.font = `bold ${fs}px monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(cfg.title, x + 8, y + fs + 6);
    }

    // Chart
    if (cfg.chart) {
      const cx1 = x + w * 0.06;
      const cx2 = x + w * 0.94;
      const cy1 = y + h * 0.3;
      const cy2 = y + h * 0.88;
      const cw = cx2 - cx1;
      const ch = cy2 - cy1;

      ctx.lineWidth = cfg.chart.lw || 1.3;
      ctx.beginPath();
      const pts = [];
      for (let i = 0; i <= CHART_POINTS; i++) {
        const t = i / CHART_POINTS;
        const val = cfg.chart.fn(t, time);
        const px = cx1 + cw * t;
        const py = cy2 - ch * val;
        pts.push([px, py]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(255,255,255,${cfg.chart.alpha || 0.55})`;
      ctx.stroke();

      // Glow on chart line
      ctx.lineWidth = (cfg.chart.lw || 1.3) * 6;
      ctx.globalAlpha = 0.1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Fill
      if (cfg.chart.fill) {
        ctx.beginPath();
        pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx1, cy2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();
      }

      // Second chart
      if (cfg.chart2) {
        ctx.lineWidth = cfg.chart2.lw || 0.8;
        ctx.beginPath();
        for (let i = 0; i <= CHART_POINTS; i++) {
          const t = i / CHART_POINTS;
          const val = cfg.chart2.fn(t, time);
          const px = cx1 + cw * t;
          const py = cy2 - ch * val;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(255,255,255,${cfg.chart2.alpha || 0.2})`;
        ctx.stroke();
      }
    }

    // Labels
    if (cfg.labels) {
      cfg.labels.forEach(lb => {
        const fs = Math.max(7, w * (lb.size || 0.045));
        ctx.font = `${lb.bold ? 'bold ' : ''}${fs}px monospace`;
        ctx.fillStyle = `rgba(255,255,255,${lb.alpha || 0.35})`;
        ctx.fillText(lb.text, x + w * lb.px, y + h * lb.py);
      });
    }
  }

  // Chart functions
  function fn1(x, t) {
    return 0.3 + Math.sin(x * 12 + t * 0.002) * 0.18
         + Math.sin(x * 5 + t * 0.001) * 0.2
         + Math.cos(x * 17 + t * 0.003) * 0.08;
  }
  function fn1b(x, t) {
    return 0.25 + Math.sin(x * 9 + t * 0.0015 + 1) * 0.13 + Math.cos(x * 14 + t * 0.002) * 0.14;
  }
  function fn2(x, t) {
    return 0.5 + Math.sin(x * 7 + t * 0.0015) * 0.22
         + Math.cos(x * 13 + t * 0.002) * 0.1 + Math.sin(x * 3 + t * 0.0008) * 0.12;
  }
  function fn3(x, t) {
    return 0.55 + Math.sin(x * 6 + t * 0.001) * 0.22 + Math.cos(x * 11 + t * 0.0025) * 0.12;
  }
  function fn3b(x, t) {
    return 0.42 + Math.sin(x * 8 + t * 0.0012 + 2) * 0.18 + Math.cos(x * 5 + t * 0.002) * 0.1;
  }
  function fn4(x, t) {
    const base = x < 0.3 ? x * 2.5 : (x < 0.7 ? 0.75 + Math.sin(x * 20 + t * 0.003) * 0.1 : 0.75 - (x - 0.7) * 1.5);
    return Math.max(0.05, Math.min(0.95, base + Math.sin(t * 0.002 + x * 5) * 0.05));
  }

  function drawAllPanels() {
    const panelW = W * 0.16;
    const panelH = H * 0.32;
    const pad = W * 0.01;

    drawEdgePanel(pad, H * 0.06, panelW, panelH, {
      title: 'SEGMENTS',
      chart: { fn: fn1, alpha: 0.55, fill: true, lw: 1.4 },
      chart2: { fn: fn1b, alpha: 0.2, lw: 0.7 },
      labels: [
        { text: 'C2', px: 0.78, py: 0.14, alpha: 0.45 },
        { text: '2001', px: 0.55, py: 0.2, alpha: 0.3 },
        { text: 'C3', px: 0.78, py: 0.26, alpha: 0.4 },
      ],
    });

    drawEdgePanel(pad, H * 0.42, panelW, panelH, {
      title: 'SPEED / THR',
      chart: { fn: fn2, alpha: 0.5, fill: true, lw: 1.2 },
      labels: [
        { text: 'SPD', px: 0.05, py: 0.2, alpha: 0.3 },
        { text: '142', px: 0.7, py: 0.95, alpha: 0.55, bold: true, size: 0.07 },
        { text: 'kph', px: 0.88, py: 0.95, alpha: 0.25 },
      ],
    });

    drawEdgePanel(W - panelW - pad, H * 0.06, panelW, panelH, {
      title: 'SECTOR TIMES',
      chart: { fn: fn3, alpha: 0.5, fill: false, lw: 1.4 },
      chart2: { fn: fn3b, alpha: 0.18, lw: 0.7 },
      labels: [
        { text: 'SECTOR 1', px: 0.5, py: 0.12, alpha: 0.35 },
        { text: '08:30.33', px: 0.5, py: 0.2, alpha: 0.55, bold: true },
        { text: 'SECTOR 2', px: 0.5, py: 0.26, alpha: 0.35 },
        { text: '13:12.33', px: 0.5, py: 0.34, alpha: 0.55, bold: true },
      ],
    });

    drawEdgePanel(W - panelW - pad, H * 0.42, panelW, panelH, {
      title: 'RPM / GEAR',
      chart: { fn: fn4, alpha: 0.5, fill: true, lw: 1.3 },
      labels: [
        { text: 'GEAR', px: 0.05, py: 0.2, alpha: 0.3 },
        { text: '3', px: 0.25, py: 0.95, alpha: 0.6, bold: true, size: 0.09 },
        { text: 'RPM', px: 0.6, py: 0.2, alpha: 0.3 },
        { text: '11200', px: 0.6, py: 0.95, alpha: 0.5, bold: true, size: 0.06 },
      ],
    });
  }

  // ================================================
  // SPEED STREAKS - bright white horizontal lines
  // ================================================

  const speedStreaks = [];
  for (let i = 0; i < STREAK_COUNT; i++) {
    speedStreaks.push({
      x: Math.random() * W * 2 - W * 0.5,
      y: H * (0.04 + Math.random() * 0.8),
      w: 120 + Math.random() * 600,
      speed: 2 + Math.random() * 6,
      dir: Math.random() > 0.5 ? 1 : -1,
      alpha: 0.12 + Math.random() * 0.45,
      thick: 0.6 + Math.random() * 3,
      side: i < Math.ceil(STREAK_COUNT / 2) ? -1 : 1,
    });
  }

  function drawSpeedStreaks() {
    speedStreaks.forEach(s => {
      s.x += s.speed * s.dir;
      if (s.dir > 0 && s.x > W + s.w) { s.x = -s.w; s.y = H * (0.04 + Math.random() * 0.8); }
      if (s.dir < 0 && s.x < -s.w) { s.x = W; s.y = H * (0.04 + Math.random() * 0.8); }

      let x1 = s.x;
      let x2 = s.x + s.w * s.dir;
      if (x1 > x2) { const tmp = x1; x1 = x2; x2 = tmp; }

      if (s.side === -1) {
        x1 = Math.min(x1, W * 0.44);
        x2 = Math.min(x2, W * 0.44);
      } else {
        x1 = Math.max(x1, W * 0.56);
        x2 = Math.max(x2, W * 0.56);
      }
      if (x2 - x1 < 15) return;

      const grad = ctx.createLinearGradient(x1, s.y, x2, s.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.1, `rgba(255,255,255,${s.alpha * 0.6})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${s.alpha})`);
      grad.addColorStop(0.9, `rgba(255,255,255,${s.alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = s.thick;
      ctx.beginPath();
      ctx.moveTo(x1, s.y);
      ctx.lineTo(x2, s.y);
      ctx.stroke();

      // Bloom glow
      if (s.alpha > 0.2) {
        ctx.lineWidth = s.thick * 10;
        ctx.globalAlpha = s.alpha * 0.12;
        ctx.strokeStyle = 'rgba(255,255,255,1)';
        ctx.beginPath();
        ctx.moveTo(x1, s.y);
        ctx.lineTo(x2, s.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }

  // ================================================
  // CORNER DATA OVERLAYS
  // ================================================

  function drawCornerData() {
    const fl = Math.sin(time * 0.003) * 0.3 + 0.7;
    const fs = Math.max(9, W * 0.007);
    ctx.font = `${fs}px monospace`;

    const tl = [
      { text: 'TRACK: FORSAGE', y: 0.035 },
      { text: 'SESSION 04', y: 0.055 },
    ];
    tl.forEach(d => {
      ctx.fillStyle = `rgba(255,255,255,${0.15 * fl})`;
      ctx.fillText(d.text, W * 0.18, H * d.y);
    });

    const tr = [
      { text: 'LAP TIME 01:12.847', y: 0.035 },
      { text: 'TEMP 32°C', y: 0.055 },
    ];
    tr.forEach(d => {
      ctx.fillStyle = `rgba(255,255,255,${0.15 * fl})`;
      ctx.textAlign = 'right';
      ctx.fillText(d.text, W * 0.82, H * d.y);
      ctx.textAlign = 'left';
    });

    // Mini charts
    ctx.strokeStyle = `rgba(255,255,255,${0.1 * fl})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < CORNER_POINT_COUNT; i++) {
      const px = W * 0.19 + i * (W * 0.0025);
      const py = H * 0.07 + Math.sin(i * 0.4 + time * 0.002) * 7 + Math.cos(i * 0.7 + time * 0.001) * 4;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < CORNER_POINT_COUNT; i++) {
      const px = W * 0.68 + i * (W * 0.0025);
      const py = H * 0.07 + Math.sin(i * 0.3 + time * 0.0018 + 1) * 6 + Math.cos(i * 0.6 + time * 0.0012) * 3;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // ================================================
  // CENTER GLOW + VIGNETTE
  // ================================================

  function drawCenterGlow() {
    const pulse = 0.7 + Math.sin(time * 0.0008) * 0.3;
    const r = 220 * pulse;
    const grad = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.07)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.025)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(vpx, vpy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(vpx, H * 0.42, H * 0.18, vpx, H * 0.42, H * 0.95);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.3, 'rgba(0,0,0,0)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.65)');
    grad.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const leftFade = ctx.createLinearGradient(0, 0, W * 0.02, 0);
    leftFade.addColorStop(0, 'rgba(0,0,0,0.7)');
    leftFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftFade;
    ctx.fillRect(0, 0, W * 0.04, H);

    const rightFade = ctx.createLinearGradient(W * 0.98, 0, W, 0);
    rightFade.addColorStop(0, 'rgba(0,0,0,0)');
    rightFade.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = rightFade;
    ctx.fillRect(W * 0.96, 0, W * 0.04, H);
  }

  // ================================================
  // MAIN LOOP
  // ================================================

  function animate(ts) {
    time = ts || 0;
    ctx.clearRect(0, 0, W, H);

    drawTunnelLines();
    drawDepthRings();
    drawAllPanels();
    drawCornerData();
    drawSpeedStreaks();
    drawCenterGlow();
    drawVignette();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
