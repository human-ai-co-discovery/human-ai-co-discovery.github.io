# human-ai-co-discovery.github.io

Website for Human-AI Co-Discovery, exploring how people and AI discover new questions, patterns, connections, and explanations.

**Status: private, not published.** The repository is private and GitHub Pages is off, so the site is visible only to organization members. The organization is on the GitHub Free plan, where Pages sites are always public and private repositories cannot publish Pages. To publish, make the repository public and enable Pages from the `main` branch root; the site will then appear at <https://human-ai-co-discovery.github.io/>.

## Structure

| Path | Page |
| --- | --- |
| `index.html` | Community home page, with links to events |
| `chi2027/index.html` | *Whose Eureka? Human-AI Co-Discovery of Knowledge*, the proposed CHI 2027 workshop. Overview, expandable questions, program, organizers, and Discord community status |
| `chi2027/call-for-participation.html` | Dedicated CFP page with eight topic descriptions, contribution types, submission and review rules, sharing, timeline, and contact |
| `assets/style.css` | Styles for the home page |
| `assets/css/workshop.css` | Color tokens (light and dark) and motion rules for the CHI 2027 page |
| `assets/js/tailwind.config.js` | Tailwind theme for the CHI 2027 page: Inter, and `tide` (deep cyan) and `ember` (warm orange) colors mapped to the CSS tokens |
| `assets/js/main.js` | Lucide icons, the nav border on scroll, nav highlighting of the section being read, and the title gloss on the CHI 2027 page |
| `assets/archive/hero-banner.html` | Retired hero banner from the CHI 2027 page (animated discovery-path illustration), kept for reference with steps to restore it |
| `assets/people/` | Organizer photos (320 px JPEG), from each organizer's homepage or the UbiComp/ISWC 2026 tutorial site |
| `assets/brand/` | Organization avatar: `avatar-teal` (used on GitHub) and `avatar-light`, as 1024 px PNG and editable SVG |
| `.nojekyll` | Serves the files as plain static HTML (no Jekyll processing) |

The site is plain HTML with no build step: edit a file and push to `main`.

- **Home page** (`index.html`): hand-written CSS in `assets/style.css`, with Inter from Google Fonts.
- **CHI 2027 page** (`chi2027/index.html`): a 1280px outer container, with a single-column reading layout, 20px desktop body text (18px on mobile), and organizers in up to four columns. It uses the Tailwind CSS Play CDN with the Typography plugin (pinned to 3.4.16), Inter from Google Fonts, and Lucide icons (pinned to 0.460.0). Tailwind colors resolve to CSS variables in `assets/css/workshop.css`, so dark mode follows `prefers-color-scheme` without `dark:` classes. The browser console shows Tailwind's "should not be used in production" warning; that is expected with the Play CDN.

The four questions in About use native `details`/`summary` disclosures, collapsed by default; their full explanations remain available with mouse, touch, or keyboard.

Both pages follow the palette of agentlab.zhihanjiang.com (deep cyan with a warm orange accent) and have a dark-mode set. Orange text uses darker shades (`ember-700`, or `ember-500` for large text) so it meets contrast requirements.

## Preview locally

From the repository root, run a static server and open the pages before pushing:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000/> and <http://localhost:8000/chi2027/>. After a push to `main`, GitHub Pages usually updates within a few minutes.

## Updating the CHI 2027 page

The pages currently describe the workshop as **proposed**. Daniel McDuff is conditionally confirmed for the keynote and panel; Sherry Tongshuang Wu and Toby Jia-Jun Li are conditionally confirmed for the panel, alongside a planned AI panelist. Dates, program committee membership, the submission link, and the Discord invitation link remain to be announced. If the workshop is accepted:

1. Remove "Proposed workshop" from the kicker line near the top of `chi2027/index.html`, and add the date and room to the information block below the title.
2. Add the submission link and dates to `chi2027/call-for-participation.html`; participant decisions must reach authors at least seven days before CHI's early registration deadline.
3. Finalize speaker arrangements and program committee membership, add the opt-in Discord invitation, and post accepted papers (with permission) and the arXiv index.

Keep the text consistent with the organizers' workshop proposal, especially the call for participation.

## Organizer photos

Each organizer should confirm their photo before the site is made public. To replace one, save a square or portrait image as `assets/people/<name>.jpg`, about 320 px on the long side.

## Accessibility

Pages use semantic landmarks, a skip link, visible focus styles, sufficient color contrast in light and dark modes, and respect `prefers-reduced-motion`. Please keep new content consistent with these.
