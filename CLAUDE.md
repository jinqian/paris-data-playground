# CLAUDE.md

A static GitHub Pages site with two dataviz pages built on Paris open data about libraries. It's a fun project for a book club, so keep it simple.

## Layout

- `index.html`: home page, with links to the two dataviz pages and a few computed insights
- `reservations.html`: horizontal bar chart of the most reserved titles (format chips, top-authors chips, search, top N)
- `prets.html`: scatter of loans against copies, with a dashed median loans-per-copy line, top-authors chips and a "champions" side list
- `assets/style.css`: all shared styles. Colours are CSS tokens on `:root`, with a separate dark-mode set
- `assets/common.js`: shared ES-module helpers (data loading, colours, number formatting, theme/resize re-render)
- `data/*.json`: cleaned snapshots, generated, do not hand-edit
- `scripts/fetch_data.py`: downloads both datasets from the opendata.paris.fr API and cleans them (stdlib only)
- `.github/workflows/deploy.yml`: deploys the repo root files to Pages on push to `main`

## Conventions

- No build step and no npm. Use plain HTML and ES modules. Load Observable Plot from jsDelivr with a pinned version (`PLOT_URL` in `common.js`).
- The UI text is in **French**. Code comments and docs are in English.
- Each format family keeps one colour on every page (`FAMILY_TOKEN` in `common.js`): Livres = blue, BD & manga = orange, Films/Jeux = aqua, Autre = grey. Don't add more than three coloured families; fold the rest into grey.
- Charts read colours from CSS tokens at render time and re-render when the theme changes, so never hard-code hex values in the chart code.
- Theme: it follows the OS by default. The header button (`#theme-toggle`, wired up in `common.js`) sets `data-theme` on `<html>` and saves the choice in `localStorage`. A small inline script in each page's `<head>` re-applies the saved theme before first paint, so new pages need that script and the button too. Charts re-render through `onThemeChange`.
- Author filter: `authorFilter()` in `common.js` renders the top-10 chips plus a "Tous les auteurs" panel listing every author, with search and sorting by popularity or A→Z. Each page calls the returned `update(pool)` in `render()` with the format-filtered rows, and filters by `state.author`. Clicking an author selects it, and clicking again clears it. Duplicate author spellings are merged by `AUTHOR_ALIASES` in `fetch_data.py`, so add new ones there.
- Every chart has hover tooltips and a "Voir les données en tableau" table fallback.
- Data cleaning (encoding fixes like `Oda, Eiichir?`, "Last, First" → "First Last", dropping the ": roman" suffix, family grouping) lives in `fetch_data.py`, not in the pages.
- Local asset URLs in the pages (`style.css`, `common.js`, `data/*.json`) end in `?v=dev`. The deploy workflow replaces this with the commit SHA so browsers never mix a new page with a stale cached script, since Pages caches for 10 minutes. Keep the suffix on any new asset reference.
- If you add a new page, also add it to the `cp` line in `deploy.yml` and to the nav in each page header.

## Local preview

`python3 -m http.server 8000`, then open http://localhost:8000. Pages fetch `data/*.json`, so opening them as `file://` won't work.
