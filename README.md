# human-ai-co-discovery.github.io

Website for Human-AI Co-Discovery, exploring how people and AI discover new questions, patterns, connections, and explanations.

**Status: private, not published.** The repository is private and GitHub Pages is off, so the site is visible only to organization members. The organization is on the GitHub Free plan, where Pages sites are always public and private repositories cannot publish Pages. To publish, make the repository public and enable Pages from the `main` branch root; the site will then appear at <https://human-ai-co-discovery.github.io/>.

## Structure

| Path | Page |
| --- | --- |
| `index.html` | Community home page, with links to events |
| `chi2027/index.html` | *Whose Eureka? Human-AI Co-Discovery of Knowledge*, the proposed CHI 2027 workshop. Hero with the animated eureka illustration over the discovery field, overview with Figure 1, expandable Q1–Q4 question cards, CFP/program entry points, organizers, and Discord community status |
| `chi2027/call-for-participation.html` | Dedicated CFP page with eight topic descriptions grouped under the four workshop questions, contribution types, submission and review rules, sharing, timeline, and contact |
| `chi2027/program.html` | Dedicated tentative program: an "At a glance" timeline with blocks proportional to their minutes, two 90-minute sessions, poster exchange during coffee break, two lightning-talk blocks, keynote/panel, and seven-group roundtable activity |
| `assets/style.css` | Styles for the home page |
| `assets/css/workshop.css` | Color tokens (light and dark, including the shared Q1–Q4 question colors), the home hero (eureka illustration and discovery field), and the question cards, CFP topic cards, and program timeline of the CHI 2027 pages |
| `assets/js/tailwind.config.js` | Tailwind theme for the CHI 2027 page: Inter, and `tide` (deep cyan) and `ember` (warm orange) colors mapped to the CSS tokens |
| `assets/js/main.js` | Lucide icons, the nav border on scroll, nav highlighting of the section being read, the title gloss, and the hero's discovery field (a canvas) on the CHI 2027 page |
| `assets/archive/hero-banner.html` | Earlier, retired hero banner from the CHI 2027 page (animated discovery-path illustration, not the current hero), kept for reference with steps to restore it |
| `assets/img/` | Figure 1 for the CHI 2027 page, exported from the proposal's teaser figure without its Q1–Q4 row (the question cards below it cover the four questions): 1200 and 2400 px WebP, with a 1200 px PNG fallback |
| `assets/people/` | Organizer photos (320 px JPEG), from each organizer's homepage or the UbiComp/ISWC 2026 tutorial site |
| `assets/brand/` | Organization avatar: `avatar-teal` (used on GitHub) and `avatar-light`, as 1024 px PNG and editable SVG |
| `.nojekyll` | Serves the files as plain static HTML (no Jekyll processing) |

The site is plain HTML with no build step: edit a file and push to `main`.

- **Home page** (`index.html`): hand-written CSS in `assets/style.css`, with Inter from Google Fonts.
- **CHI 2027 page** (`chi2027/index.html`): a fluid full-width container with responsive side gutters, a single-column reading layout (the hero and the question cards use two columns on wide screens), 20px desktop body text (18px on mobile), and organizers in up to four columns. It uses the Tailwind CSS Play CDN with the Typography plugin (pinned to 3.4.16), Inter from Google Fonts, and Lucide icons (pinned to 0.460.0). Tailwind colors resolve to CSS variables in `assets/css/workshop.css`, so dark mode follows `prefers-color-scheme` without `dark:` classes. The browser console shows Tailwind's "should not be used in production" warning; that is expected with the Play CDN.

The four questions in About are color-coded cards built on native `details`/`summary` disclosures, collapsed by default; their full explanations remain available with mouse, touch, or keyboard.

Both pages follow the palette of agentlab.zhihanjiang.com (deep cyan with a warm orange accent) and have a dark-mode set. Orange text uses darker shades (`ember-700`, or `ember-500` for large text) so it meets contrast requirements.

## Preview locally

From the repository root, run a static server and open the pages before pushing:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000/> and <http://localhost:8000/chi2027/>. After a push to `main`, GitHub Pages usually updates within a few minutes.

## Updating the CHI 2027 page

The pages currently describe the workshop as **proposed**. Daniel McDuff is supportive of joining as keynote speaker, subject to workshop acceptance and availability; Sherry Tongshuang Wu and Toby Jia-Jun Li are supportive of joining him on the panel, alongside a planned AI panelist. The program is tentative. Dates, program committee membership, the submission link, and the Discord invitation link remain to be announced. If the workshop is accepted:

1. Remove "Proposed workshop" from the kicker line near the top of `chi2027/index.html`, and add the date and room to the information block below the title.
2. Add the submission link and dates to `chi2027/call-for-participation.html`; participant decisions must reach authors at least seven days before CHI's early registration deadline.
3. Finalize speaker arrangements and program committee membership, add the opt-in Discord invitation, and post accepted papers (with permission) and the arXiv index.

Keep the text consistent with the organizers' workshop proposal, especially the call for participation.

The program was reconciled with proposal commit `a8865ef` (`sections/activities.tex`) on 2026-09-29: 30-minute keynote, 30-minute panel, poster exchange during the conference coffee break, a second 20-minute lightning-talk block, and seven roundtable groups. The 50-minute roundtable block includes reflection and discussion.

## Organizer photos

Each organizer should confirm their photo before the site is made public. To replace one, save a square or portrait image as `assets/people/<name>.jpg`, about 320 px on the long side.

## Accessibility

Pages use semantic landmarks, a skip link, visible focus styles, sufficient color contrast in light and dark modes, and respect `prefers-reduced-motion`. Please keep new content consistent with these.
