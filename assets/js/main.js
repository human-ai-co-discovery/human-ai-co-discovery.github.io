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
