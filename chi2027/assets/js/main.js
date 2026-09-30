// Draw Lucide icons.
if (window.lucide) lucide.createIcons();

// Highlight the nav link for the section being read (aria-current drives the styling).
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

// Tailwind's Play CDN styles the page after the browser has already jumped to a
// linked section (such as from the old CFP and program pages), so jump again once loaded.
window.addEventListener('load', () => {
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
