// Draw Lucide icons.
if (window.lucide) lucide.createIcons();

// Strengthen the nav border once the page scrolls, and highlight the nav
// link for the section being read (aria-current drives the styling).
const navbar = document.getElementById('navbar');
const navLinks = [...document.querySelectorAll('[data-nav-link]')];
const sections = [...new Set(navLinks.map((a) => a.hash))]
  .map((hash) => document.querySelector(hash))
  .filter(Boolean);

const currentSection = () => {
  // A section is current once its top passes a line a little below the nav
  // (below where in-page links land, so a clicked section is highlighted).
  const line = (navbar ? navbar.offsetHeight : 0) + Math.max(48, window.innerHeight * 0.1);
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom) return sections[sections.length - 1];
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= line) current = section;
  }
  return current;
};

// Keep in-page link targets clear of the nav, whose height changes when its links wrap.
const setNavHeight = () => {
  if (navbar) document.documentElement.style.setProperty('--nav-height', `${navbar.offsetHeight}px`);
};
setNavHeight();
window.addEventListener('resize', setNavHeight);

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    if (navbar) {
      const scrolled = window.scrollY > 10;
      navbar.classList.toggle('border-rule', scrolled);
      navbar.classList.toggle('border-rule/50', !scrolled);
    }
    const current = currentSection();
    for (const link of navLinks) {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  });
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// Title gloss: toggle on click, close on outside click or Escape.
const glossButton = document.querySelector('[data-gloss]');
if (glossButton) {
  const gloss = document.getElementById(glossButton.getAttribute('aria-controls'));
  const setOpen = (open) => {
    gloss.hidden = !open;
    glossButton.setAttribute('aria-expanded', String(open));
  };
  glossButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(gloss.hidden);
  });
  document.addEventListener('click', (event) => {
    if (!gloss.hidden && !gloss.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !gloss.hidden) {
      setOpen(false);
      glossButton.focus();
    }
  });
}

// Discovery field behind the home hero: faint points that link up near the
// pointer, or near a slow wandering probe when no pointer is present. Points
// fade out behind [data-field-quiet] elements (the value is the opacity kept
// there; data-field-feather sets the fade distance around them, and
// data-field-text limits the quiet area to the element's lines of text), so
// the title stays clear and the illustration stays in front.
// The field drifts for a few seconds when the hero comes into view and while
// the pointer moves over it, then settles into a still constellation, so no
// motion runs longer than five seconds on its own (WCAG 2.2.2).
// Reduced motion draws one static constellation; the loop pauses off-screen
// and in hidden tabs.
const fieldCanvas = document.querySelector('canvas[data-field]');
const fieldHost = fieldCanvas && fieldCanvas.closest('[data-field-host]');
const fieldCtx = fieldHost && fieldCanvas.getContext('2d');
if (fieldCtx) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = (query, fn) => {
    if (query.addEventListener) query.addEventListener('change', fn);
    else if (query.addListener) query.addListener(fn);
  };
  const quietEls = [...fieldHost.querySelectorAll('[data-field-quiet]')];
  const LINK = 120; // longest link, px
  const REACH = 190; // radius lit by the pointer or probe, px
  const FEATHER = 64; // default fade distance around quiet elements, px
  const AUTO_MS = 3200; // drift after the hero comes into view; easing out ends before 5 s
  const POINTER_MS = 1800; // drift kept after the last pointer movement
  let W = 0;
  let H = 0;
  let points = [];
  let quiet = [];
  let colors = {};
  let raf = 0;
  let onScreen = true;
  let t = 0;
  let last = 0; // time of the previous frame
  let awakeUntil = 0; // drift continues until this time
  let energy = 1; // drift speed, easing between 1 (awake) and 0 (settled)
  const pointer = { x: 0, y: 0, active: false, strength: 0, timer: 0 };

  const rgbVar = (name) => getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`).trim().split(/\s+/).join(',');
  const readColors = () => {
    colors = { dot: rgbVar('tide-300'), link: rgbVar('tide-700'), spark: rgbVar('ember-400') };
  };

  // The boxes of an element's text, one per line, so space beside short lines stays open.
  const textRects = (el) => {
    const rects = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.data.trim()) continue;
      range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    }
    return rects;
  };
  // Quiet elements as boxes in canvas coordinates.
  const measureQuiet = () => {
    const origin = fieldCanvas.getBoundingClientRect();
    quiet = quietEls.flatMap((el) => {
      const floor = Number(el.dataset.fieldQuiet) || 0;
      const feather = Number(el.dataset.fieldFeather) || FEATHER;
      const rects = 'fieldText' in el.dataset ? textRects(el) : [el.getBoundingClientRect()];
      return rects.map((r) => ({
        left: r.left - origin.left, top: r.top - origin.top,
        right: r.right - origin.left, bottom: r.bottom - origin.top,
        floor, feather,
      }));
    });
  };
  // Opacity factor at (x, y): the lowest floor among quiet boxes, rising to 1 over each box's feather.
  const calm = (x, y) => {
    let k = 1;
    for (const q of quiet) {
      const d = Math.hypot(Math.max(q.left - x, 0, x - q.right), Math.max(q.top - y, 0, y - q.bottom));
      k = Math.min(k, q.floor + (1 - q.floor) * Math.min(1, d / q.feather));
    }
    return k;
  };

  // Seeded random numbers, so the constellation is the same on every visit.
  const seed = () => {
    let s = 20270;
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const count = Math.round(Math.min(110, Math.max(28, (W * H) / 8000)));
    points = [];
    for (let i = 0; i < count; i += 1) {
      points.push({
        x: rand() * W, y: rand() * H,
        vx: (rand() - 0.5) * 0.16, vy: (rand() - 0.5) * 0.16,
        r: 1.1 + rand() * 1.5,
        spark: rand() < 0.08,
        calm: 1, near: 0,
      });
    }
  };

  const resize = () => {
    const rect = fieldCanvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fieldCanvas.width = Math.round(W * dpr);
    fieldCanvas.height = Math.round(H * dpr);
    fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    measureQuiet();
  };

  const line = (a, b, color, alpha) => {
    fieldCtx.strokeStyle = `rgba(${color},${alpha})`;
    fieldCtx.beginPath(); fieldCtx.moveTo(a.x, a.y); fieldCtx.lineTo(b.x, b.y); fieldCtx.stroke();
  };
  const dot = (p, radius, color, alpha) => {
    fieldCtx.fillStyle = `rgba(${color},${alpha})`;
    fieldCtx.beginPath(); fieldCtx.arc(p.x, p.y, radius, 0, Math.PI * 2); fieldCtx.fill();
  };

  const drawStatic = () => {
    fieldCtx.clearRect(0, 0, W, H);
    fieldCtx.lineWidth = 1;
    for (const p of points) p.calm = calm(p.x, p.y);
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i]; const b = points[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 95) line(a, b, colors.dot, (1 - d / 95) * 0.35 * Math.min(a.calm, b.calm));
      }
    }
    for (const p of points) dot(p, p.r, p.spark ? colors.spark : colors.dot, 0.65 * p.calm);
  };

  const frame = (now) => {
    raf = 0;
    // Steps are measured in 60 Hz frames of elapsed time, so the speed does not
    // depend on the display's refresh rate.
    const dt = last ? Math.min(50, now - last) / (1000 / 60) : 1;
    last = now;
    energy += ((now < awakeUntil ? 1 : 0) - energy) * (1 - 0.93 ** dt);
    const step = dt * energy;
    t += step;
    fieldCtx.clearRect(0, 0, W, H);
    // Focus point: the visitor's pointer, or the probe drifting across the hero.
    const probeX = W * (0.5 + 0.4 * Math.sin(t / 520));
    const probeY = H * (0.5 + 0.3 * Math.sin(t / 310 + 1.3));
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * (1 - 0.92 ** dt);
    const fx = pointer.x * pointer.strength + probeX * (1 - pointer.strength);
    const fy = pointer.y * pointer.strength + probeY * (1 - pointer.strength);
    const power = 0.55 + 0.45 * pointer.strength;

    for (const p of points) {
      p.x += p.vx * step; p.y += p.vy * step;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      p.near = Math.max(0, 1 - Math.hypot(p.x - fx, p.y - fy) / REACH);
      p.calm = calm(p.x, p.y);
    }
    fieldCtx.lineWidth = 1;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        const dx = a.x - b.x; const dy = a.y - b.y;
        if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
        const d = Math.hypot(dx, dy);
        if (d > LINK) continue;
        const ambient = d < 90 ? (1 - d / 90) * 0.22 : 0;
        const lit = Math.min(a.near, b.near) * (1 - d / LINK) * 0.7 * power;
        const alpha = Math.min(0.75, ambient + lit) * Math.min(a.calm, b.calm);
        if (alpha < 0.02) continue;
        const color = (a.spark || b.spark) && lit > 0.12 ? colors.spark : lit > ambient ? colors.link : colors.dot;
        line(a, b, color, alpha);
      }
    }
    for (const p of points) {
      const glow = p.near * power;
      const color = p.spark ? colors.spark : glow > 0.25 ? colors.link : colors.dot;
      dot(p, p.r + glow * 1.6, color, (0.65 + glow * 0.35) * p.calm);
    }
    // Keep drawing while awake, easing out, or while the pointer glow fades in or out.
    const fading = Math.abs((pointer.active ? 1 : 0) - pointer.strength) > 0.004;
    if (now < awakeUntil || energy > 0.004 || fading) schedule();
    else energy = 0;
  };

  const schedule = () => {
    if (!raf && onScreen && !document.hidden && !reducedMotion.matches) raf = requestAnimationFrame(frame);
  };
  const wake = (ms) => {
    awakeUntil = Math.max(awakeUntil, performance.now() + ms);
    schedule();
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };
  const render = () => {
    stop();
    if (reducedMotion.matches) drawStatic();
    else schedule();
  };

  // The canvas ignores the pointer (so text stays selectable); the window listens
  // instead, and the field follows the pointer while it is over the canvas area,
  // which reaches into the page gutters.
  const setPointer = (event) => {
    if (!onScreen) return;
    const rect = fieldCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    clearTimeout(pointer.timer);
    if (!inside) {
      if (pointer.active) {
        pointer.active = false;
        schedule();
      }
      return;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    wake(POINTER_MS);
    if (event.pointerType === 'touch') {
      pointer.timer = setTimeout(() => {
        pointer.active = false;
        schedule();
      }, 1600);
    }
  };
  window.addEventListener('pointermove', setPointer, { passive: true });
  window.addEventListener('pointerdown', setPointer, { passive: true });
  // A mouse leaving the window hands the field back to the probe.
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget && event.pointerType !== 'touch' && pointer.active) {
      pointer.active = false;
      schedule();
    }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) {
        wake(AUTO_MS);
        render();
      } else {
        stop();
        pointer.active = false;
      }
    }).observe(fieldCanvas);
  }
  document.addEventListener('visibilitychange', render);
  onChange(reducedMotion, render);
  onChange(darkScheme, () => {
    readColors();
    render();
  });

  // Re-seed when the hero changes size; re-measure once web fonts settle the title.
  const onResize = () => {
    resize();
    render();
  };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(fieldCanvas);
  else window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureQuiet();
      render();
    });
  }

  readColors();
  resize();
  wake(AUTO_MS);
  render();
}
