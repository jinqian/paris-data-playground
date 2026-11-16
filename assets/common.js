// Shared helpers for every page (ES module, no build step).
export const PLOT_URL = "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.16/+esm";

// Each family keeps the same colour on every page (CSS token name).
export const FAMILY_TOKEN = {
  "Livres": "--livres",
  "BD & manga": "--bd",
  "Films & musique": "--films",
  "Jeux, musique & autres": "--films",
  "Autre / non précisé": "--autre",
};

export const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const familyColor = (f) => css(FAMILY_TOKEN[f] || "--autre");

export const nf = new Intl.NumberFormat("fr-FR");
export const fmt = (n) => nf.format(n);

export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// ---- Theme: follows the OS by default; the header button pins light/dark.
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const root = document.documentElement;
const currentTheme = () => root.dataset.theme || (darkQuery.matches ? "dark" : "light");

const ICONS = {
  // Shows what you'll switch TO.
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};

function paintToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const next = currentTheme() === "dark" ? "light" : "dark";
  btn.innerHTML = ICONS[next];
  btn.setAttribute("aria-label", next === "dark" ? "Passer en mode sombre" : "Passer en mode clair");
  btn.title = btn.getAttribute("aria-label");
}

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) { /* private mode: not remembered */ }
  paintToggle();
  window.dispatchEvent(new Event("themechange"));
});
darkQuery.addEventListener("change", paintToggle);
paintToggle();

// Re-render when the theme changes (button or OS), so chart colours follow the tokens.
export function onThemeChange(fn) {
  darkQuery.addEventListener("change", () => { if (!root.dataset.theme) fn(); });
  window.addEventListener("themechange", fn);
}

// Re-render on width change (debounced).
export function onResize(el, fn) {
  let w = el.clientWidth, t;
  new ResizeObserver(() => {
    if (el.clientWidth === w) return;
    w = el.clientWidth;
    clearTimeout(t);
    t = setTimeout(fn, 120);
  }).observe(el);
}

// Accent-insensitive search.
export const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function legend(el, families) {
  el.innerHTML = families
    .map((f) => `<span><i class="swatch" style="background:${familyColor(f)}"></i>${f}</span>`)
    .join("");
}

export const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---- Author filter (shared by both dataviz pages).
// Top-10 chips plus a "Tous les auteurs" panel listing every author, searchable
// and sortable. Clicking an author sets state.author (click again to clear).

// Every author in `rows`, with the sum of `key` and their number of titles.
export function rankAuthors(rows, key) {
  const by = new Map();
  for (const d of rows) {
    if (!d.auteur) continue;
    const a = by.get(d.auteur) || { name: d.auteur, total: 0, count: 0 };
    a.total += d[key];
    a.count += 1;
    by.set(d.auteur, a);
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"));
}

const collator = new Intl.Collator("fr", { sensitivity: "base" });

export function authorFilter(el, { key, unit, state, render, top = 10 }) {
  el.innerHTML = `
    <div class="controls authors">
      <span class="muted">Top auteurs</span>
      <div class="chips" data-top role="group" aria-label="Filtrer par auteur"></div>
      <button type="button" class="more" data-toggle aria-expanded="false" aria-controls="${el.id}-panel"></button>
    </div>
    <div class="author-browser" id="${el.id}-panel" data-panel hidden>
      <div class="ab-tools">
        <input type="search" data-q placeholder="Chercher un auteur…" aria-label="Chercher un auteur">
        <div class="chips" role="group" aria-label="Trier les auteurs">
          <button type="button" class="chip" data-sort="total">Les plus populaires</button>
          <button type="button" class="chip" data-sort="alpha">A → Z</button>
        </div>
        <span class="muted" data-count></span>
      </div>
      <ol class="ab-list" data-list></ol>
    </div>`;
  const $ = (sel) => el.querySelector(sel);
  const ui = { all: [], q: "", sort: "total", open: false };

  const chip = (a, rank) => `<button type="button" class="chip" aria-pressed="${a.name === state.author}" data-a="${escapeHTML(a.name)}"
      title="${a.count} titre${a.count > 1 ? "s" : ""} · ${fmt(a.total)} ${unit}">${rank ? `<span class="n">${rank}.</span>` : ""}${escapeHTML(a.name)}<span class="n">${fmt(a.total)}</span></button>`;

  function paintList() {
    const shown = ui.all.map((a, i) => ({ ...a, rank: i + 1 }))
      .filter((a) => !ui.q || norm(a.name).includes(ui.q));
    if (ui.sort === "alpha") shown.sort((a, b) => collator.compare(a.name, b.name));
    $("[data-list]").innerHTML = shown.length
      ? shown.map((a) => `<li>${chip(a, ui.sort === "total" ? a.rank : 0).replace('class="chip"', 'class="chip ab-item"')}
          <span class="ab-meta">${a.count} titre${a.count > 1 ? "s" : ""}</span></li>`).join("")
      : `<li class="muted">Aucun auteur ne correspond.</li>`;
    $("[data-count]").textContent = ui.q ? `${shown.length} / ${ui.all.length}` : "";
    el.querySelectorAll("[data-sort]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sort === ui.sort));
  }

  function paint() {
    const topList = ui.all.slice(0, top);
    const sel = ui.all.find((a) => a.name === state.author);
    if (sel && !topList.includes(sel)) topList.push(sel);
    $("[data-top]").innerHTML = topList.map((a) => chip(a)).join("");
    const t = $("[data-toggle]");
    t.textContent = `${ui.open ? "Masquer" : "Tous les auteurs"} (${fmt(ui.all.length)}) ${ui.open ? "▴" : "▾"}`;
    t.setAttribute("aria-expanded", ui.open);
    $("[data-panel]").hidden = !ui.open;
    if (ui.open) paintList();
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.a !== undefined) {
      state.author = state.author === b.dataset.a ? null : b.dataset.a;
      render();
    } else if (b.dataset.toggle !== undefined) {
      ui.open = !ui.open;
      paint();
      if (ui.open) $("[data-q]").focus();
    } else if (b.dataset.sort) {
      ui.sort = b.dataset.sort;
      paintList();
    }
  });
  $("[data-q]").addEventListener("input", (e) => { ui.q = norm(e.target.value); paintList(); });

  // Call from render() with the rows of the current format filter, before filtering by author.
  return function update(pool) {
    ui.all = rankAuthors(pool, key);
    if (state.author && !ui.all.some((a) => a.name === state.author)) state.author = null;
    paint();
  };
}
