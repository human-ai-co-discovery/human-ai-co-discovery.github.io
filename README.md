# human-ai-co-discovery.github.io

Website for Human-AI Co-Discovery, exploring how people and AI discover new questions, patterns, connections, and explanations.

**Status: private, not published.** The repository is private and GitHub Pages is off, so the site is visible only to organization members. The organization is on the GitHub Free plan, where Pages sites are always public and private repositories cannot publish Pages. To publish, make the repository public and enable Pages from the `main` branch root; the site will then appear at <https://human-ai-co-discovery.github.io/>.

## Structure

| Path | Page |
| --- | --- |
| `index.html` | Community home page, with links to events |
| `chi2027/index.html` | *Whose Eureka? Human-AI Co-Discovery of Knowledge*, the proposed CHI 2027 workshop. Sections: About (overview, open questions), Call for Participation (topics, submission details, timeline), Program, Organizers (team, contact) |
| `chi2027/proposal.pdf` | Workshop proposal, served by the nav bar's "Proposal" download button. **Not yet added**; until it is, the button leads to a missing file |
| `assets/style.css` | Styles for the home page |
| `assets/css/workshop.css` | Color tokens (light and dark) and motion rules for the CHI 2027 page |
| `assets/js/tailwind.config.js` | Tailwind theme for the CHI 2027 page: Urbanist, and `tide` (deep cyan) and `ember` (warm orange) colors mapped to the CSS tokens |
| `assets/js/main.js` | Lucide icons, the nav border on scroll, nav highlighting of the section being read, and the title gloss on the CHI 2027 page |
| `assets/archive/hero-banner.html` | Retired hero banner from the CHI 2027 page (animated discovery-path illustration), kept for reference with steps to restore it |
| `assets/people/` | Organizer photos (320 px JPEG), from each organizer's homepage or the UbiComp/ISWC 2026 tutorial site |
| `assets/brand/` | Organization avatar: `avatar-teal` (used on GitHub) and `avatar-light`, as 1024 px PNG and editable SVG |
| `.nojekyll` | Serves the files as plain static HTML (no Jekyll processing) |

The site is plain HTML with no build step: edit a file and push to `main`.

- **Home page** (`index.html`): hand-written CSS in `assets/style.css`, with Fraunces, Atkinson Hyperlegible, and IBM Plex Mono from Google Fonts.
- **CHI 2027 page** (`chi2027/index.html`): laid out after the [CHI '26 STAR workshop site](https://github.com/chi-star-workshop/chi-star-workshop.github.io) and using the same dependencies, all from CDNs: the Tailwind CSS Play CDN with the Typography plugin (pinned to 3.4.16), Urbanist from Google Fonts, and Lucide icons (pinned to 0.460.0). Tailwind colors resolve to CSS variables in `assets/css/workshop.css`, so dark mode follows `prefers-color-scheme` without `dark:` classes. The browser console shows Tailwind's "should not be used in production" warning; that is expected with the Play CDN.

Both pages follow the palette of agentlab.zhihanjiang.com (deep cyan with a warm orange accent) and have a dark-mode set. Orange text uses darker shades (`ember-700`, or `ember-500` for large text) so it meets contrast requirements.

## Preview locally

From the repository root, run a static server and open the pages before pushing:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000/> and <http://localhost:8000/chi2027/>. After a push to `main`, GitHub Pages usually updates within a few minutes.

## Updating the CHI 2027 page

The page currently describes the workshop as **proposed and under review**. It deliberately lists no dates, named speakers, program committee, or submission link, since none are confirmed yet. If the workshop is accepted:

1. Remove "Proposed workshop" from the kicker line near the top of `chi2027/index.html`, and add the date and room to the information block below the title.
2. Add the submission link to the "Call for Participation" section and fill in its "Timeline" rows; participant decisions must reach authors at least seven days before CHI's early registration deadline.
3. Add the keynote and invited speakers and the program committee once confirmed, and post accepted papers (with permission) and the arXiv index.

Keep the text consistent with the organizers' workshop proposal, especially the call for participation.

## Organizer photos

Each organizer should confirm their photo before the site is made public. To replace one, save a square or portrait image as `assets/people/<name>.jpg`, about 320 px on the long side.

## Accessibility

Pages use semantic landmarks, a skip link, visible focus styles, sufficient color contrast in light and dark modes, and respect `prefers-reduced-motion`. Please keep new content consistent with these.
