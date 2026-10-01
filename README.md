# human-ai-co-discovery.github.io

Website for Human-AI Co-Discovery, exploring how people and AI discover new questions, patterns, connections, and explanations.

**Status: private, not published.** The repository is private and GitHub Pages is off, so the site is visible only to organization members. The organization is on the GitHub Free plan, where Pages sites are always public and private repositories cannot publish Pages. To publish, make the repository public and enable Pages from the `main` branch root; the site will then appear at <https://human-ai-co-discovery.github.io/>.

## Structure

| Path | Page |
| --- | --- |
| `index.html` | Community home page, with links to events |
| `chi2027/index.html` | *Whose Eureka? Human-AI Co-Discovery of Knowledge*, the proposed CHI 2027 workshop: title with the eureka illustration over the discovery field, overview with an interactive Figure 1 walkthrough (also opens full size), the four workshop questions as expandable cards, the CFP entry point, a program summary with the program timeline and the invited guests, organizers with research profiles, and a Connect section on the Discord community |
| `chi2027/call-for-participation.html` | Dedicated CFP page: proposal status, participation essentials, an optional Gemini contribution assistant, submission requirements, and key dates, a short workshop introduction, contribution types and all eight topics grouped under the four questions, activities, follow-up plans, accessibility, and optional readings |
| `chi2027/program.html` | Dedicated tentative program: a timeline of the day drawn as the eureka curve, two 90-minute sessions, poster exchange during the coffee break, keynote and panel, and how participants take part |
| `chi2027/discussion.html` | Community question wall linked to GitHub Discussions, plus an optional reflection prompt whose choices are neither saved nor submitted |
| `chi2027/assets/css/workshop.css` | Color tokens (light and dark, including the Q1–Q4 question colors) and the few rules Tailwind utilities do not cover, such as the home hero illustration, the question cards, and the program timeline, for the CHI 2027 pages only |
| `chi2027/assets/css/interactive.css` | Styles for the Home figure walkthrough and the Discussion page’s reflection prompt |
| `chi2027/assets/js/tailwind.config.js` | Tailwind theme for the CHI 2027 pages: Inter, `tide` (deep cyan) and `ember` (warm orange) colors mapped to the CSS tokens, and prose heading sizes |
| `chi2027/assets/js/main.js` | Lucide icons, nav highlighting of the section being read, the title gloss, dialogs, the discovery field behind the home hero, and the program timeline (placing its stops along the curve) |
| `chi2027/archive/` | Retired designs kept for reference, each a standalone page with steps to restore it: `hero-banner.html` (the first hero banner) and `retired-components.html` (the program timeline and the CFP topic cards, plus the originals of the eureka hero and the Q1–Q4 question cards, which are back on Home) |
| `assets/style.css` | Styles for the home page |
| `chi2027/assets/image/` | `figure-1-*`: Figure 1 for the CHI 2027 home page, exported from the proposal's teaser figure without its Q1–Q4 row (the four questions are listed below it): 1200 and 2400 px WebP, with a 1200 px PNG fallback. `teaser*.webp`: the full teaser figure |
| `assets/people/` | Organizer and invited-guest photos (320 px JPEG), from each person's homepage or the UbiComp/ISWC 2026 tutorial site; `ai-agent.webp` is the robot from Figure 1, used for the AI agent panelist |
| `assets/brand/` | Organization avatar: `avatar-teal` (used on GitHub) and `avatar-light`, as 1024 px PNG and editable SVG |
| `scripts/serve.py` | Loopback-only static preview and server-side Gemini API; reads credentials outside the web root |
| `scripts/cfp_context.py` | Extracts current CFP grounding and validates ID-based model suggestions |
| `scripts/gemini_client.py` | Stateless Gemini REST client with structured output and safe errors |
| `chi2027/assets/js/cfp-assistant.js` | Open description form, generation state, and linked topic suggestions |
| `scripts/sync_questions.py` | Server-side, read-only export of public Q&A summaries; no client credentials |
| `.github/workflows/sync-questions.yml` | Refreshes the question snapshot after discussion changes once merged to the default branch |
| `chi2027/data/questions.json` | Generated community-question snapshot; no private discussion content |
| `.nojekyll` | Serves the files as plain static HTML (no Jekyll processing) |

The site is plain HTML with no build step: edit a file and push to `main`.

- **Home page** (`index.html`): hand-written CSS in `assets/style.css`, with Inter from Google Fonts.
- **CHI 2027 pages** (`chi2027/`): a fluid single-column layout with generous side margins, 18px body text on phones and 20px on larger screens, and 16px navigation links. The four expandable question cards stack in one column and connect to related readings, activities, and organizer profiles. Organizers appear four per row on wide screens, two per row on tablets, and one per row on phones. The pages retain their plain background, topic lists, and program timeline above the schedule list. The navigation switches to a menu below 1280px to keep the larger links from crowding the logo. They use the Tailwind CSS Play CDN with the Typography plugin (pinned to 3.4.16), Inter from Google Fonts, and Lucide icons (pinned to 0.460.0). Their CSS and scripts live in `chi2027/assets/` and are independent of the home page's. Tailwind colors resolve to CSS variables in `chi2027/assets/css/workshop.css`, so dark mode follows `prefers-color-scheme` without `dark:` classes. The browser console shows Tailwind's "should not be used in production" warning; that is expected with the Play CDN.

The Play CDN injects its styles after `workshop.css`, so a Tailwind utility wins over a rule there with the same specificity. Keep `workshop.css` to properties the pages do not also set with utilities. The active nav link (the current page, or the section being read on the home page) is styled with a single `[&[aria-current]]` variant, which covers both `aria-current="page"` and `aria-current="true"`.

Both pages follow the palette of agentlab.zhihanjiang.com (deep cyan with a warm orange accent) and have a dark-mode set. Orange text uses darker shades (`ember-700`, or `ember-500` for large text) so it meets contrast requirements.

## Preview locally

From the repository root, run a static server and open the pages before pushing:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000/> and <http://localhost:8000/chi2027/>. This static server does not enable Gemini; use the assistant preview command below for that feature. After a push to `main`, GitHub Pages usually updates within a few minutes.

## Updating the CHI 2027 page

The pages currently describe the workshop as **proposed**. Daniel McDuff is supportive of joining as keynote speaker, subject to workshop acceptance and availability; Sherry Tongshuang Wu and Toby Jia-Jun Li are supportive of joining him on the panel, alongside a planned AI panelist. The program is tentative. Dates, program committee membership, the submission link, and the Discord invitation link remain to be announced. If the workshop is accepted:

1. Remove "Proposed workshop" from the kicker line near the top of `chi2027/index.html`, and add the date and room to the information block below the title.
2. Add the submission link and dates to `chi2027/call-for-participation.html`; participant decisions must reach authors at least seven days before CHI's early registration deadline.
3. Finalize speaker arrangements and program committee membership, add the opt-in Discord invitation, and post accepted papers (with permission) and the arXiv index.

Keep the text consistent with the organizers' workshop proposal, especially the call for participation.

The program was reconciled with proposal commit `a8865ef` (`sections/activities.tex`) on 2026-09-29: 30-minute keynote, 30-minute panel, poster exchange during the conference coffee break, a second 20-minute lightning-talk block, and seven roundtable groups. The 50-minute roundtable block includes reflection and discussion.

## Gemini contribution assistant

The CFP’s **Explore how your work could contribute** disclosure accepts an open research description. A server-side Gemini call suggests up to three connections to the actual CFP, with reasons, possible writing angles, and contribution formats. It can ask for detail or report no clear connection. It does not judge eligibility, quality, or acceptance probability, and it does not change the submission requirements.

`cfp_context.py` reads the current CFP HTML for every request. Topic IDs, question groups, contribution-type IDs, authored names, and descriptions come from the `data-cfp-topic` and `data-cfp-contributions` elements; the scope comes from `#cfp-overview`. Keep these attributes when editing. The output schema and server validation only accept existing IDs. The page uses those IDs to open the original topic and inserts generated text with `textContent`.

Run the local assistant preview from the repository root:

```sh
python3 -m scripts.serve --port 8765 --env-file /private/tmp/chi2027-cfp-gemini.env
```

The environment file is outside the website directory and contains `GEMINI_API_KEY` and optional `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). It is read for each request, so updating the key does not require restarting. Explicit file settings override environment variables. Never put the key in HTML, client JavaScript, a public build variable, or this repository. The server refuses credential files within its static root and serves neither hidden paths nor its Python source.

The client uses Google’s [Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview) with `store:false`, [structured JSON output](https://ai.google.dev/gemini-api/docs/structured-output), a fixed Google endpoint, a response-size cap, and a 45-second timeout. Model details: [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). The website does not store descriptions, responses, or request bodies in logs; provider processing remains subject to Google’s terms. The browser tells visitors that descriptions are sent to Gemini.

This server binds only to `127.0.0.1`, requires same-origin JSON requests, allows one model request at a time, and caps calls at ten per minute. It is a local preview, not a public API deployment. GitHub Pages cannot run it: before enabling the assistant on the public site, deploy an API with a secret store, appropriate access and usage limits, and the corresponding frontend endpoint configuration. Without an available API the form shows an unavailable message and the full CFP remains readable. Run all local unit checks with `python3 -m unittest discover -s tests`.

## Community questions

The **Discussion** page links to the repository’s real Q&A category for submitting and replying under a GitHub account. Discussions are enabled in the existing private repository; Pages remains disabled. The website does not create posts or handle GitHub credentials. Repository members can participate privately through GitHub now.

`python3 scripts/sync_questions.py` exports a deterministic snapshot to `chi2027/data/questions.json` using the authenticated GitHub CLI. While the repository is private, the exporter writes only category metadata and an empty list, without fetching discussion content. Private preview discussions therefore do not enter the website’s Git history. Once public, it exports the 20 most recently updated Q&A discussions with plain-text excerpts and canonical GitHub links. Public snapshots are versioned; removing a discussion clears it from the next snapshot, not earlier commits.

After `.github/workflows/sync-questions.yml` reaches the default branch, discussion/comment changes, repository publication, or a manual run refresh the snapshot. The workflow has read access to discussions and write access to repository contents. It does not change visibility, enable Pages, or post messages. Local previews read their checked-out snapshot; the `human-ai-co-discovery.github.io` site reads the current JSON from raw GitHub, so a snapshot update does not depend on a Pages rebuild. If a custom domain is added, update that source selection in `main.js`.

On fetch failure the site keeps links to GitHub available. The exporter preserves the previous snapshot on API or validation failure, and the browser inserts user text with `textContent`. Run its checks with `python3 -m unittest discover -s tests -p 'test_sync_questions.py'`.

## Figure walkthrough and reflection prompt

On the Home page, the three Figure 1 controls highlight the selected stage and show how the researcher and AI change the inquiry, including what remains untested. The figure is an illustrative scenario; its full-size dialog remains available. Text is in the `story-panel-*` sections in `chi2027/index.html`.

The dedicated Discussion page offers a roundtable provocation with Agree, Disagree, and It depends. Each choice reveals an authored perspective and follow-up question. Choices stay in the current page state: there is no storage, submission, tally, or live AI response. Edit the `response-*` sections in `chi2027/discussion.html` to revise those perspectives. The former Home link `#roundtable-question` redirects to the Discussion page. Both interactions use native buttons, visible selection states, and polite announcements of revealed content.

## Research profiles and question links

The Home page connects each workshop question to two selected readings, a program activity, and organizers with related interests. Each organizer's **Research profile** opens a native dialog with their existing bio, research-interest tags, two selected publications, and buttons that open the relevant questions. Escape and the close button dismiss the dialog; clicking a question returns focus to that question. These thematic connections are editorial suggestions, not exclusive assignments of expertise.

Edit the research-interest tags and publication links in each `organizer-*` card in `chi2027/index.html`; the dialog reuses the card's name, affiliation, photo, and bio. Its `<template data-profile-content>` holds the related questions and selected papers. Keep publication metadata consistent with the CFP readings and proposal bibliography, and label preprints explicitly.

## Organizer photos

Each organizer should confirm their photo before the site is made public. To replace one, save a square or portrait image as `assets/people/<name>.jpg`, about 320 px on the long side.

## Accessibility

Pages use semantic landmarks, a skip link, visible focus styles, sufficient color contrast in light and dark modes, and respect `prefers-reduced-motion`. Please keep new content consistent with these.
