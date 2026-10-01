// Draw Lucide icons.
if (window.lucide) lucide.createIcons();

const navbar = document.getElementById('navbar');

// Tailwind's Play CDN styles the page after the browser has already jumped to a
// linked section (such as program.html → call-for-participation.html#topics-h), so jump again once loaded.
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
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });
}
