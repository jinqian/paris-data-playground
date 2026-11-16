# Ce que lit Paris

Two small data visualisations of what people borrow and reserve in the Paris public libraries, made for a book club.

- **La liste d'attente**: the 1,000 most reserved titles in 2022, as a filterable bar chart.
- **Popularité vs disponibilité**: the most borrowed titles, plotted by loans against number of copies.

Live site: https://jinqian.github.io/paris-data-playground/

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

There's no build step. The pages are plain HTML and load [Observable Plot](https://observablehq.com/plot/) from a CDN.

## Refresh the data

The city publishes these datasets once a year. To pull the latest version:

```sh
python3 scripts/fetch_data.py
```

This rewrites `data/reserves.json` and `data/prets.json`. Commit the result.

## Deploy

Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.
In the repo settings, go to **Pages** and set **Source** to **GitHub Actions** (one-time setup).

## Data sources

- [Les 1000 titres les plus réservés dans les bibliothèques de prêt](https://opendata.paris.fr/explore/dataset/les-1000-titres-les-plus-reserves-dans-les-bibliotheques-de-pret/information/)
- [Les titres les plus prêtés dans les bibliothèques de prêt](https://opendata.paris.fr/explore/dataset/les-titres-les-plus-pretes/information/)

Both are from Paris Data and published under the ODbL licence.
