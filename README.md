# human-ai-co-discovery.github.io

Website for Human-AI Co-Discovery, exploring how people and AI discover new questions, patterns, connections, and explanations.

**Status: private, not published.** The repository is private and GitHub Pages is off, so the site is visible only to organization members. The organization is on the GitHub Free plan, where Pages sites are always public and private repositories cannot publish Pages. To publish, make the repository public and enable Pages from the `main` branch root; the site will then appear at <https://human-ai-co-discovery.github.io/>.

## Structure

| Path | Page |
| --- | --- |
| `index.html` | Community home page, with links to events |
| `chi2027/index.html` | *Whose Eureka? Human-AI Co-Discovery of Knowledge*, the proposed CHI 2027 workshop |
| `assets/style.css` | Shared styles for all pages |
| `assets/people/` | Organizer photos (320 px JPEG), from each organizer's homepage or the UbiComp/ISWC 2026 tutorial site |
| `assets/brand/` | Organization avatar: `avatar-teal` (used on GitHub) and `avatar-light`, as 1024 px PNG and editable SVG |
| `.nojekyll` | Serves the files as plain static HTML (no Jekyll processing) |

The site is plain HTML and CSS with no build step: edit a file and push to `main`. Fonts (Fraunces, Atkinson Hyperlegible, IBM Plex Mono) load from Google Fonts. Colors are CSS variables at the top of `assets/style.css`, following the palette of agentlab.zhihanjiang.com (deep teal with a coral accent), with a dark-mode set under `prefers-color-scheme: dark`. Coral text uses darker shades so it meets contrast requirements.

## Preview locally

From the repository root, run a static server and open the pages before pushing:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000/> and <http://localhost:8000/chi2027/>. After a push to `main`, GitHub Pages usually updates within a few minutes.

## Updating the CHI 2027 page

The page currently describes the workshop as **proposed and under review**. It deliberately lists no dates, named speakers, program committee, or submission link, since none are confirmed yet. If the workshop is accepted:

1. Replace the status note near the top of `chi2027/index.html` and remove "Proposed" from the kicker line.
2. Add the submission link and important dates to the "Participate" section; participant decisions must reach authors at least seven days before CHI's early registration deadline.
3. Add the keynote and invited speakers and the program committee once confirmed, and post accepted papers (with permission) and the arXiv index.

Keep the text consistent with the organizers' workshop proposal, especially the call for participation.

## Organizer photos

Each organizer should confirm their photo before the site is made public. To replace one, save a square or portrait image as `assets/people/<name>.jpg`, about 320 px on the long side.

## Accessibility

Pages use semantic landmarks, a skip link, visible focus styles, sufficient color contrast in light and dark modes, and respect `prefers-reduced-motion`. Please keep new content consistent with these.
