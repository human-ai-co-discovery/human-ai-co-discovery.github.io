// Draw Lucide icons.
if (window.lucide) lucide.createIcons();

const navbar = document.getElementById('navbar');

// Tailwind's Play CDN styles the page after the browser has already jumped to a
// linked section (such as program.html → call-for-participation.html#topics-h), so jump again once loaded.
// Preserve bookmarked and in-page links to sections that have moved to other pages.
const redirectMovedSection = () => {
  if (location.hash === '#roundtable-question' && document.querySelector('[data-discovery-story]')) {
    location.replace('discussion.html#roundtable-question');
    return true;
  }
  if (location.pathname.endsWith('/call-for-participation.html')) {
    const destination = {
      '#cfp-overview': 'program.html#cfp-overview',
      '#overview-h': 'program.html#overview-h',
      '#sharing-h': 'after-workshop.html#title',
    }[location.hash];
    if (destination) {
      location.replace(destination);
      return true;
    }
  }
  return false;
};
window.addEventListener('hashchange', redirectMovedSection);
window.addEventListener('load', () => {
  if (redirectMovedSection()) return;
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) requestAnimationFrame(() => target.scrollIntoView());
});

// Keep in-page link targets clear of the nav, whose height changes when its links wrap.
const setNavHeight = () => {
  if (navbar) document.documentElement.style.setProperty('--nav-height', `${navbar.offsetHeight}px`);
};
setNavHeight();
window.addEventListener('resize', setNavHeight);

// A [data-nav-fade] nav is clear at the top of the page and fills in as the page
// scrolls, reaching full opacity when the element it names reaches the nav.
const fadeSelector = navbar ? navbar.dataset.navFade : null;
const fadeTarget = fadeSelector ? document.querySelector(fadeSelector) : null;
const fadeNav = () => {
  const end = fadeTarget.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight;
  const fill = end > 0 ? Math.min(window.scrollY / end, 1) : 1;
  navbar.style.setProperty('--nav-fill', fill.toFixed(3));
};

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    if (fadeTarget) fadeNav();
  });
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// Title gloss tooltip: shown on hover or focus by CSS; Escape dismisses it from the keyboard.
const glossButton = document.querySelector('[data-gloss]');
if (glossButton) {
  glossButton.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') glossButton.blur();
  });
}

// Dialogs: open from a [data-dialog-open] button; close on the backdrop, the close button, or Escape.
for (const opener of document.querySelectorAll('[data-dialog-open]')) {
  const dialog = document.getElementById(opener.dataset.dialogOpen);
  if (!dialog) continue;
  opener.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

// Speaker bios: the toggle beside each name shows or hides that speaker's bio.
for (const toggle of document.querySelectorAll('[data-bio-toggle]')) {
  const bio = document.getElementById(toggle.getAttribute('aria-controls'));
  if (!bio) continue;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    bio.hidden = !open;
  });
}

// Figure walkthrough: the selected stage highlights its panel and reveals a short explanation.
const discoveryStory = document.querySelector('[data-discovery-story]');
if (discoveryStory) {
  const storyButtons = discoveryStory.querySelectorAll('[data-story-step]');
  const storyPanels = discoveryStory.querySelectorAll('.story-panel');
  const selectStoryStep = (step) => {
    discoveryStory.dataset.step = step;
    for (const button of storyButtons) button.setAttribute('aria-pressed', String(button.dataset.storyStep === step));
    for (const panel of storyPanels) panel.hidden = panel.id !== `story-panel-${step}`;
  };
  for (const button of storyButtons) button.addEventListener('click', () => selectStoryStep(button.dataset.storyStep));
  discoveryStory.querySelector('[data-story-restart]').addEventListener('click', () => {
    selectStoryStep('1');
    discoveryStory.querySelector('#story-step-1').focus();
  });
}

// Reflection choices reveal authored perspectives; no answers are stored or submitted.
const provocation = document.querySelector('[data-provocation]');
if (provocation) {
  const positionButtons = provocation.querySelectorAll('[data-position]');
  for (const button of positionButtons) {
    button.addEventListener('click', () => {
      for (const choice of positionButtons) choice.setAttribute('aria-pressed', String(choice === button));
      for (const response of provocation.querySelectorAll('.provocation-response')) {
        response.hidden = response.id !== `response-${button.dataset.position}`;
      }
    });
  }
}

// Discussion content is exported on the server; no GitHub credentials enter the browser.
const questionWall = document.querySelector('[data-question-wall]');
if (questionWall) {
  const status = questionWall.querySelector('[data-wall-status]');
  const list = questionWall.querySelector('[data-wall-list]');
  // Bot commits do not trigger a Pages rebuild. On GitHub Pages, read the current
  // snapshot directly from main; local previews read their checked-out snapshot.
  const source = location.hostname === 'human-ai-co-discovery.github.io'
    ? 'https://raw.githubusercontent.com/human-ai-co-discovery/human-ai-co-discovery.github.io/main/chi2027/data/questions.json'
    : 'data/questions.json';
  fetch(source, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Questions unavailable');
      return response.json();
    })
    .then(data => {
      if (data.repository !== 'human-ai-co-discovery/human-ai-co-discovery.github.io'
        || !Array.isArray(data.questions) || typeof data.private !== 'boolean') throw new Error('Invalid question data');
      const cards = (data.private ? [] : data.questions).slice(0, 20).map(question => {
        if (typeof question.title !== 'string' || typeof question.excerpt !== 'string'
          || (question.author !== null && typeof question.author !== 'string') || typeof question.url !== 'string'
          || !/^https:\/\/github\.com\/human-ai-co-discovery\/human-ai-co-discovery\.github\.io\/discussions\/[1-9]\d*$/.test(question.url)) {
          throw new Error('Invalid question');
        }
        const card = document.createElement('li');
        const heading = document.createElement('h3');
        const link = document.createElement('a');
        link.href = question.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = question.title;
        heading.append(link);
        const excerpt = document.createElement('p');
        excerpt.textContent = question.excerpt;
        const meta = document.createElement('p');
        meta.className = 'question-meta';
        meta.textContent = `${question.author ? '@' + question.author : 'Community member'} · Join the discussion on GitHub ↗`;
        card.append(heading, excerpt, meta);
        return card;
      });
      list.replaceChildren(...cards);
      questionWall.querySelector('[data-wall-private]').hidden = !data.private;
      status.hidden = cards.length > 0;
      status.textContent = data.private
        ? 'Read questions and join the conversation on GitHub during this private preview. Public question summaries will appear here when the community opens.'
        : 'No community questions yet. Start a conversation on GitHub.';
    })
    .catch(() => {
      status.hidden = false;
      status.textContent = 'Questions could not be loaded. You can still read and reply on GitHub using the links above.';
    });
}

// Organizer research profiles connect the team, question cards, and selected work.
// Names, bios, and links come from the existing cards and their local templates.
const researchProfile = document.getElementById('research-profile');
if (researchProfile) {
  for (const opener of document.querySelectorAll('[data-profile-open]')) {
    opener.addEventListener('click', () => {
      const card = document.getElementById(`organizer-${opener.dataset.profileOpen}`);
      if (!card) return;
      const name = card.querySelector('h4 a');
      const photo = card.querySelector('img');
      researchProfile.querySelector('[data-profile-name]').textContent = name.textContent;
      researchProfile.querySelector('[data-profile-institution]').textContent = card.querySelector('[data-profile-affiliation]').textContent;
      researchProfile.querySelector('[data-profile-photo]').src = photo.currentSrc || photo.src;
      researchProfile.querySelector('[data-profile-description]').textContent = card.querySelector('[data-profile-bio]').textContent;
      researchProfile.querySelector('[data-profile-homepage]').href = name.href;
      const tags = Array.from(card.querySelectorAll('.organizer-tags li'), (tag) => {
        const label = document.createElement('span');
        label.textContent = tag.textContent;
        return label;
      });
      researchProfile.querySelector('[data-profile-tags]').replaceChildren(...tags);
      researchProfile.querySelector('[data-profile-content-slot]').replaceChildren(card.querySelector('template').content.cloneNode(true));
      researchProfile.showModal();
      researchProfile.querySelector('.profile-dialog__body').scrollTop = 0;
    });
  }
  researchProfile.addEventListener('click', (event) => {
    if (event.target === researchProfile) {
      researchProfile.close();
      return;
    }
    const trigger = event.target.closest('[data-question-target]');
    if (!trigger) return;
    const question = document.getElementById(`question-${trigger.dataset.questionTarget}`);
    if (!question) return;
    researchProfile.close();
    question.querySelector('details').open = true;
    question.scrollIntoView({ block: 'start' });
    question.querySelector('summary').focus({ preventScroll: true });
  });
}

// Mobile menu: the menu button drops down the page links; Escape or a click outside closes it.
const menuToggle = document.querySelector('[data-menu-toggle]');
const menu = menuToggle ? document.getElementById(menuToggle.getAttribute('aria-controls')) : null;
if (menu) {
  const setMenu = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    navbar.toggleAttribute('data-menu-open', open);
  };
  menuToggle.addEventListener('click', () => setMenu(menu.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !navbar.contains(event.target)) setMenu(false);
  });
  window.matchMedia('(min-width: 1536px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
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
  // The field spans the page from edge to edge. CSS has no unit for the viewport
  // without its scrollbar, so --page-width follows the root element's width.
  const root = document.documentElement;
  const setPageWidth = () => {
    const width = `${root.clientWidth}px`;
    if (root.style.getPropertyValue('--page-width') !== width) root.style.setProperty('--page-width', width);
  };
  setPageWidth();
  if ('ResizeObserver' in window) new ResizeObserver(setPageWidth).observe(root);
  else window.addEventListener('resize', setPageWidth);

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
      // Skip blank text and text that is laid out but not shown (the title's gloss).
      if (!node.data.trim() || getComputedStyle(node.parentElement).visibility !== 'visible') continue;
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
    readColors();
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
  onChange(darkScheme, render);

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

  resize();
  wake(AUTO_MS);
  render();
}

// ===========================================================================
// Discovery path ([data-discovery-path]): the program drawn as the hero's eureka
// curve. The curve is cut into stretches as long as the activities' minutes, with a
// small joint at each start minute; each stop's node sits in the middle of its
// stretch, the coffee break is a short dashed stretch, and the last stretch ends in
// the eureka spark. A container at least 560px wide runs the curve left to right
// with labels above and below it; a narrower one runs it downward with the labels
// in a column beside it. Without this script the stops stay a plain list.
// The CSS block of the same name styles it.
// ===========================================================================
const DP_SVG = 'http://www.w3.org/2000/svg';
const DP_BREAK = 14; // length of the coffee-break stretch, in minutes of curve
const DP_RADIUS = { dot: 8, ring: 20, break: 16, spark: 26 }; // clearance around each node

const dpSvg = (parent, tag, attrs) => {
  const el = document.createElementNS(DP_SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  parent.appendChild(el);
  return el;
};

// A smooth curve through knots (p along the run, q across it, in px), flat at its
// crests and troughs, sampled densely with the arc length s at each sample.
const dpSpline = (p, q) => {
  const n = p.length;
  const slope = p.map((_, k) => {
    if (k === 0) return (q[1] - q[0]) / (p[1] - p[0]);
    if (k === n - 1) return (q[k] - q[k - 1]) / (p[k] - p[k - 1]);
    if ((q[k] - q[k - 1]) * (q[k + 1] - q[k]) <= 0) return 0;
    return (q[k + 1] - q[k - 1]) / (p[k + 1] - p[k - 1]);
  });
  const samples = [];
  const lengths = [];
  let s = 0;
  for (let k = 0; k < n - 1; k++) {
    const w = (p[k + 1] - p[k]) / 3;
    const cp = [p[k], p[k] + w, p[k + 1] - w, p[k + 1]];
    const cq = [q[k], q[k] + slope[k] * w, q[k + 1] - slope[k + 1] * w, q[k + 1]];
    const before = s;
    for (let i = k ? 1 : 0; i <= 64; i++) {
      const u = i / 64;
      const b = [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3];
      const sp = b[0] * cp[0] + b[1] * cp[1] + b[2] * cp[2] + b[3] * cp[3];
      const sq = b[0] * cq[0] + b[1] * cq[1] + b[2] * cq[2] + b[3] * cq[3];
      const last = samples[samples.length - 1];
      if (last) s += Math.hypot(sp - last.p, sq - last.q);
      samples.push({ p: sp, q: sq, s });
    }
    lengths.push(s - before);
  }
  return { samples, lengths, length: s };
};

// Spaces the knots along the run so that the arc length between them matches their
// minutes: over a fixed span (rows), or to a total arc length (columns).
const dpFit = (knots, { span, length }) => {
  const tEnd = knots[knots.length - 1].t;
  const share = knots.slice(1).map((knot, k) => (knot.t - knots[k].t) / tEnd);
  const q = knots.map((knot) => knot.q);
  let widths = share.map((f) => f * (span || length));
  let curve;
  for (let round = 0; round < 14; round++) {
    const p = [0];
    for (const w of widths) p.push(p[p.length - 1] + w);
    curve = dpSpline(p, q);
    const target = span ? curve.length : length;
    widths = widths.map((w, k) => (w * share[k] * target) / curve.lengths[k]);
    if (span) {
      const sum = widths.reduce((a, b) => a + b, 0);
      widths = widths.map((w) => (w * span) / sum);
    }
  }
  return curve;
};

// The point at arc length s, interpolated between samples, with the direction there.
const dpAt = (curve, s) => {
  const list = curve.samples;
  let lo = 0;
  let hi = list.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (list[mid].s < s) lo = mid; else hi = mid;
  }
  const a = list[lo];
  const b = list[hi];
  const f = b.s > a.s ? Math.min(Math.max((s - a.s) / (b.s - a.s), 0), 1) : 0;
  return { p: a.p + (b.p - a.p) * f, q: a.q + (b.q - a.q) * f, dp: b.p - a.p, dq: b.q - a.q };
};

const dpOverlaps = (a, b, pad = 0) =>
  a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;

// Distance from a point to a box (0 inside it), with the nearest point of the box.
const dpToBox = (x, y, box) => {
  const nx = Math.min(Math.max(x, box.x0), box.x1);
  const ny = Math.min(Math.max(y, box.y0), box.y1);
  return { d: Math.hypot(x - nx, y - ny), x: nx, y: ny };
};

// A small seeded generator, so the scattered dots land in the same places each time.
const dpRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};

let dpCount = 0;

function setUpDiscoveryPath(root) {
  const id = `dp-${++dpCount}`;
  const art = document.createElementNS(DP_SVG, 'svg');
  art.setAttribute('class', 'dp-art');
  art.setAttribute('aria-hidden', 'true');
  art.setAttribute('focusable', 'false');
  root.prepend(art);

  // The stops in program order, each with its stretch of the curve (t0 to t1, in minutes).
  const stops = [];
  const sessions = [];
  let t = 0;
  for (const el of root.querySelectorAll('.dp-stop')) {
    const node = el.querySelector('.dp-node');
    const isBreak = el.classList.contains('dp-stop--break');
    const min = isBreak ? DP_BREAK : Number(el.dataset.min);
    const kind = isBreak ? 'break'
      : node.classList.contains('dp-node--spark') ? 'spark'
      : node.classList.contains('dp-node--ring') ? 'ring' : 'dot';
    const stop = { el, node, kind, t0: t, t1: t + min };
    stops.push(stop);
    if (!isBreak) {
      const sessionEl = el.closest('.dp-session');
      let session = sessions.find((x) => x.el === sessionEl);
      if (!session) {
        session = { el: sessionEl, kicker: sessionEl.querySelector('.dp-kicker'), t0: t };
        sessions.push(session);
      }
      session.t1 = t + min;
    }
    t += min;
  }
  const tEnd = t;
  for (const stop of stops) stop.at = stop.kind === 'spark' ? tEnd : (stop.t0 + stop.t1) / 2;
  const spark = stops[stops.length - 1];
  const [first, second] = sessions;
  const len1 = first.t1 - first.t0;
  const len2 = second.t1 - second.t0;

  // Where the curve rises and dips, by program time (q is a share of its swing across
  // the run): up through the first session, down into the break, a shoulder, then up
  // to the spark.
  const shapes = {
    row: [[0, 0.8], [len1 * 0.53, 0.08], [(first.t1 + second.t0) / 2, 0.95], [second.t0 + len2 * 0.42, 0.5], [second.t0 + len2 * 0.62, 0.6], [tEnd, 0]],
    column: [[0, -0.4], [len1 * 0.5, 1], [(first.t1 + second.t0) / 2, -1], [second.t0 + len2 * 0.45, 0.8], [tEnd, 0]],
  };

  // Hovering a stop, or focusing it from the keyboard, lights up its stretch of the curve.
  for (const stop of stops) {
    const light = (on) => {
      stop.lit = on;
      if (stop.trace) stop.trace.toggleAttribute('data-on', on);
    };
    stop.el.addEventListener('pointerenter', () => light(true));
    stop.el.addEventListener('pointerleave', () => light(stop.el.matches(':focus-visible')));
    stop.el.addEventListener('focus', () => light(stop.el.matches(':focus-visible')));
    stop.el.addEventListener('blur', () => light(false));
  }

  let lastKey = '';
  const layout = () => {
    const W = root.clientWidth;
    if (!W) return;
    const row = W >= 560;
    root.dataset.mode = row ? 'row' : 'column';
    root.dataset.laid = '';
    const colX = 94;
    for (const { kicker } of sessions) kicker.style.setProperty('--w', row ? 'max-content' : `${W - colX}px`);

    // 1. Measure each label at its tight width; nothing else to do if none changed.
    const maxW = row ? Math.min(Math.max(W * 0.18, 124), 158) : W - colX;
    const range = document.createRange();
    for (const stop of stops) {
      const { el } = stop;
      el.style.setProperty('--w', 'max-content');
      el.style.maxWidth = `${maxW}px`;
      let w = 0;
      if (row) {
        for (const part of el.querySelectorAll('.dp-name, .dp-min')) {
          range.selectNodeContents(part);
          w = Math.max(w, range.getBoundingClientRect().width);
        }
      } else {
        range.setStartBefore(el.querySelector('.dp-name'));
        range.setEndAfter(el.querySelector('.dp-min') || el.querySelector('.dp-name'));
        w = range.getBoundingClientRect().width;
      }
      stop.w = Math.ceil(w) + 1;
      el.style.setProperty('--w', `${stop.w}px`);
      el.style.maxWidth = '';
      stop.h = el.offsetHeight;
    }
    const kickerH = first.kicker.offsetHeight;
    const key = [W, kickerH, ...stops.map((s) => `${s.w}x${s.h}`)].join();
    if (key === lastKey) return;
    lastKey = key;

    // 2. The curve. Rows run x along and y across; columns run y along and x across.
    const amp = row ? Math.min(Math.max(W * 0.2, 120), 170) : 20;
    const knots = shapes[root.dataset.mode].map(([kt, kq]) => ({ t: kt, q: kq * amp }));
    const curve = row ? dpFit(knots, { span: W - 46 }) : dpFit(knots, { length: tEnd * 3.1 });
    const toXY = row ? ({ p, q }) => ({ x: 12 + p, y: q }) : ({ p, q }) => ({ x: 42 + q, y: p });
    const sOf = (minute) => (Math.min(Math.max(minute, 0), tEnd) / tEnd) * curve.length;
    const xyAt = (minute) => toXY(dpAt(curve, sOf(minute)));
    const points = curve.samples.map(toXY);
    for (const stop of stops) Object.assign(stop, xyAt(stop.at), { r: DP_RADIUS[stop.kind] });

    // 3. Labels.
    let top;
    let height;
    if (row) {
      // Each label goes above or below the curve (or beside its node), clear of the curve,
      // the nodes and the labels already placed, alternating sides where it can. The
      // spark's label goes first and prefers the top, like the hero's "eureka".
      const curveTop = Math.min(...points.map((pt) => pt.y));
      const curveBottom = Math.max(...points.map((pt) => pt.y));
      const gap = 9;
      const placed = [];
      let lastSide = null;
      for (const stop of [spark, ...stops.slice(0, -1)]) {
        if (stop === stops[0]) lastSide = null;
        const options = [];
        for (const [side, align] of [['above', 'center'], ['above', 'start'], ['above', 'end'], ['below', 'center'], ['below', 'start'], ['below', 'end'], ['left', 'end'], ['right', 'start']]) {
          let x0;
          if (side === 'left') x0 = stop.x - stop.r - gap - stop.w;
          else if (side === 'right') x0 = stop.x + stop.r + gap;
          else if (align === 'center') x0 = Math.min(Math.max(stop.x - stop.w / 2, 0), W - stop.w);
          else if (align === 'start') x0 = Math.min(Math.max(stop.x - 14, 0), W - stop.w);
          else x0 = Math.min(Math.max(stop.x - stop.w + 14, 0), W - stop.w);
          if (x0 < 0 || x0 + stop.w > W) continue;
          const x1 = x0 + stop.w;
          let box;
          if (side === 'left' || side === 'right') {
            box = { x0, x1, y0: stop.y - stop.h / 2, y1: stop.y + stop.h / 2 };
            if (points.some((pt) => pt.x > x0 - 8 && pt.x < x1 + 8 && pt.y > box.y0 - 10 && pt.y < box.y1 + 10)) continue;
          } else {
            // Clear of the curve and of every node under the label's span (a node off to
            // one side only needs the height of its circle at the label's edge).
            const ys = points.filter((pt) => pt.x > x0 - 10 && pt.x < x1 + 10).map((pt) => pt.y);
            const under = stops.map((o) => {
              const dx = o.x < x0 ? x0 - o.x : o.x > x1 ? o.x - x1 : 0;
              return { y: o.y, h: dx < o.r ? Math.sqrt(o.r * o.r - dx * dx) : -1 };
            }).filter((n) => n.h >= 0);
            const up = side === 'above';
            const edge = up
              ? Math.min(...ys, ...under.map((n) => n.y - n.h))
              : Math.max(...ys, ...under.map((n) => n.y + n.h));
            box = up ? { x0, x1, y0: edge - gap - stop.h, y1: edge - gap } : { x0, x1, y0: edge + gap, y1: edge + gap + stop.h };
            // Step past labels already placed on this side.
            for (let tries = 0; tries < 6; tries++) {
              const hit = placed.find((b) => dpOverlaps(b, box, 8));
              if (!hit) break;
              const dy = up ? hit.y0 - 8 - box.y1 : hit.y1 + 8 - box.y0;
              box.y0 += dy;
              box.y1 += dy;
            }
          }
          if (placed.some((b) => dpOverlaps(b, box, 8))) continue;
          if (stops.some((o) => o !== stop && dpToBox(o.x, o.y, box).d < o.r + 2)) continue;
          const reach = dpToBox(stop.x, stop.y, box).d;
          const spill = Math.max(0, curveTop - 14 - box.y0) + Math.max(0, box.y1 - curveBottom - 14);
          const score = reach + spill * 0.6
            + (side === lastSide ? 36 : 0)
            + (align === 'center' ? 0 : 7)
            + (side === 'left' || side === 'right' ? 14 : 0)
            + (stop === spark && side === 'above' ? -40 : 0);
          options.push({ box, side, align, score });
        }
        options.sort((a, b) => a.score - b.score);
        const pick = options[0] || {
          side: 'below', align: 'center',
          box: { x0: stop.x - stop.w / 2, x1: stop.x + stop.w / 2, y0: stop.y + stop.r + gap, y1: stop.y + stop.r + gap + stop.h },
        };
        stop.box = pick.box;
        stop.align = { left: 'end', right: 'start' }[pick.side] || pick.align;
        lastSide = pick.side;
        placed.push(pick.box);
      }
      // Leave room at the top for the session kickers and their brackets.
      const contentTop = Math.min(curveTop, ...stops.flatMap((s) => [s.y - s.r, s.box.y0]));
      const contentBottom = Math.max(curveBottom, ...stops.flatMap((s) => [s.y + s.r, s.box.y1]));
      top = kickerH + 26 - contentTop;
      height = contentBottom + top + 6;
    } else {
      // Kickers and labels stack in a column beside the curve, each as close to its
      // node as the ones above it allow.
      const blocks = [];
      for (const session of sessions) {
        const h = session.kicker.offsetHeight;
        blocks.push({ kicker: session.kicker, t: session.t0, pref: xyAt(session.t0).y - h - 14, h, after: 8 });
      }
      for (const stop of stops) blocks.push({ stop, t: stop.at, pref: stop.y - 10, h: stop.h, after: 12 });
      blocks.sort((a, b) => a.t - b.t);
      let floor = -Infinity;
      for (const block of blocks) {
        const y0 = Math.max(block.pref, floor);
        floor = y0 + block.h + block.after;
        if (block.stop) block.stop.box = { x0: colX, x1: colX + block.stop.w, y0, y1: y0 + block.h };
        else block.kicker.box = { x0: colX, x1: W, y0, y1: y0 + block.h };
      }
      for (const stop of stops) stop.align = 'start';
      const ys = [...points.map((pt) => pt.y), ...stops.flatMap((s) => [s.y - s.r, s.y + s.r, s.box.y0, s.box.y1]), ...sessions.map((s) => s.kicker.box.y0)];
      top = -Math.min(...ys);
      height = Math.max(...ys) + top + 4;
    }

    // 4. Shift everything down by `top` and size the container.
    height = Math.ceil(height);
    root.style.height = `${height}px`;
    for (const pt of points) pt.y += top;
    for (const stop of stops) {
      stop.y += top;
      stop.box.y0 += top;
      stop.box.y1 += top;
    }
    const at = (minute) => {
      const pt = xyAt(minute);
      return { x: pt.x, y: pt.y + top };
    };
    const pathBetween = (m0, m1) => {
      const s0 = sOf(m0);
      const s1 = sOf(m1);
      const list = [dpAt(curve, s0), ...curve.samples.filter((pt) => pt.s > s0 && pt.s < s1), dpAt(curve, s1)];
      return list.map((pt, i) => {
        const { x, y } = toXY(pt);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${(y + top).toFixed(1)}`;
      }).join('');
    };

    // Motion: the curve draws from 0.3s to 2.1s, and each stop appears as the curve reaches it.
    const DRAW = 1.8;
    const when = (minute) => 0.3 + (DRAW * Math.min(Math.max(minute, 0), tEnd)) / tEnd;
    const sec = (v) => `${v.toFixed(2)}s`;

    // 5. Drawing, back to front: scattered dots, session halos and brackets, leaders,
    //    the curve in stretches (deep cyan, warming to coral over the stretch before the
    //    spark), and the hover traces.
    art.replaceChildren();
    art.setAttribute('viewBox', `0 0 ${W} ${height}`);
    const back = dpSvg(art, 'g', {});
    const warm = at(stops[stops.length - 2].t0);
    const hot = at(spark.t0);
    const grad = dpSvg(dpSvg(art, 'defs', {}), 'linearGradient', row
      ? { id: `${id}-grad`, gradientUnits: 'userSpaceOnUse', x1: warm.x, y1: 0, x2: hot.x, y2: 0 }
      : { id: `${id}-grad`, gradientUnits: 'userSpaceOnUse', x1: 0, y1: warm.y, x2: 0, y2: hot.y });
    dpSvg(grad, 'stop', { offset: 0, class: 'dp-stop-tide' });
    dpSvg(grad, 'stop', { offset: 1, class: 'dp-stop-ember' });

    for (const session of sessions) {
      dpSvg(art, 'path', { class: 'dp-halo', d: pathBetween(session.t0, session.t1), style: `--d:${sec(when(session.t0))}` });
    }

    for (const session of sessions) {
      const { kicker } = session;
      const d = sec(Math.max(when(session.t0) - 0.2, 0.05));
      kicker.style.setProperty('--d', d);
      if (row) {
        const x0 = at(session.t0).x - 6;
        const x1 = session.t1 >= tEnd ? W - 2 : at(session.t1).x + 6;
        const y = kickerH + 7;
        kicker.style.setProperty('--x', `${x0.toFixed(1)}px`);
        kicker.style.setProperty('--y', '0px');
        dpSvg(art, 'path', { class: 'dp-bracket', d: `M${x0.toFixed(1)} ${y + 5}V${y}H${x1.toFixed(1)}V${y + 5}`, style: `--d:${d}` });
      } else {
        kicker.style.setProperty('--x', `${colX}px`);
        kicker.style.setProperty('--y', `${(kicker.box.y0 + top).toFixed(1)}px`);
      }
    }

    // Leaders, where a label had to move away from its node.
    for (const stop of stops) {
      const near = dpToBox(stop.x, stop.y, stop.box);
      if (near.d - stop.r < 16) continue;
      const ux = (near.x - stop.x) / near.d;
      const uy = (near.y - stop.y) / near.d;
      dpSvg(art, 'path', {
        class: 'dp-leader', pathLength: 1, style: `--d:${sec(when(stop.at))}`,
        d: `M${(stop.x + ux * (stop.r - 2)).toFixed(1)} ${(stop.y + uy * (stop.r - 2)).toFixed(1)}L${(near.x - ux * 4).toFixed(1)} ${(near.y - uy * 4).toFixed(1)}`,
      });
    }

    // The curve: one stretch per stop, parted by a small joint at each start minute
    // (round caps reach 1.75px past each end, so a 5px parting leaves a visible joint).
    for (const stop of stops) {
      const dashed = stop.kind === 'break';
      const joint = (minute) => (2.6 / curve.length) * tEnd * (minute > 0 && minute < tEnd ? 1 : 0);
      const m0 = stop.t0 + joint(stop.t0);
      const m1 = stop.kind === 'spark' ? tEnd : stop.t1 - joint(stop.t1);
      const style = `--d:${sec(when(m0))};--t:${sec(Math.max(when(m1) - when(m0), 0.05))}`;
      const d = pathBetween(m0, m1);
      if (dashed) dpSvg(art, 'path', { class: 'dp-piece dp-piece--break', d: pathBetween(stop.t0, stop.t1), style });
      else dpSvg(art, 'path', { class: 'dp-piece', d, pathLength: 1, stroke: `url(#${id}-grad)`, style });
      stop.trace = dpSvg(art, 'path', { class: dashed ? 'dp-trace dp-trace--break' : 'dp-trace', d: dashed ? pathBetween(stop.t0, stop.t1) : d });
      stop.trace.toggleAttribute('data-on', !!stop.lit);
    }

    // 6. Place the labels and their nodes.
    for (const stop of stops) {
      const { el, box } = stop;
      el.dataset.align = stop.align;
      el.style.setProperty('--x', `${box.x0.toFixed(1)}px`);
      el.style.setProperty('--y', `${box.y0.toFixed(1)}px`);
      el.style.setProperty('--nx', `${(stop.x - box.x0).toFixed(1)}px`);
      el.style.setProperty('--ny', `${(stop.y - box.y0).toFixed(1)}px`);
      el.style.setProperty('--d', sec(when(stop.at)));
    }

    // 7. A few faint dots scattered in the open space, as around the hero's curve.
    if (row) {
      const rand = dpRandom(7);
      const taken = stops.map((s) => ({ x0: s.box.x0 - 12, x1: s.box.x1 + 12, y0: s.box.y0 - 12, y1: s.box.y1 + 12 }));
      const bandTop = kickerH + 24;
      let count = 0;
      for (let tries = 0; tries < 400 && count < Math.round(W / 60); tries++) {
        const x = 6 + rand() * (W - 12);
        const y = bandTop + rand() * (height - bandTop - 6);
        if (taken.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1)) continue;
        if (points.some((pt) => Math.hypot(pt.x - x, pt.y - y) < 24)) continue;
        if (stops.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + 20)) continue;
        taken.push({ x0: x - 40, x1: x + 40, y0: y - 30, y1: y + 30 });
        dpSvg(back, 'circle', {
          class: 'dp-dot', cx: x.toFixed(1), cy: y.toFixed(1), r: [2, 2.5, 3, 3.5][Math.floor(rand() * 4)],
          style: `--d:${sec(rand() * 0.4)};--dx:${Math.round((rand() - 0.5) * 24)}px;--dy:${Math.round((rand() - 0.5) * 24)}px`,
        });
        count++;
      }
    }
  };

  // Lay out now, again once the fonts have loaded, and whenever the width changes.
  layout();
  if (document.fonts) document.fonts.ready.then(layout);
  window.addEventListener('load', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(root);

  // Draw in once, the first time most of the path is in view.
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches && window.IntersectionObserver) {
    root.dataset.armed = '';
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      root.dataset.play = '';
      setTimeout(() => {
        delete root.dataset.play;
        delete root.dataset.armed;
      }, 3200);
    }, { threshold: 0.35 });
    const watch = () => observer.observe(root);
    if (document.fonts) document.fonts.ready.then(watch); else watch();
  }
}

for (const root of document.querySelectorAll('[data-discovery-path]')) setUpDiscoveryPath(root);
