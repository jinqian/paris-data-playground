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

// ---- Top authors filter (shared by both dataviz pages).
// Authors ranked by the sum of `key` over `rows`; the selected author stays listed.
export function topAuthors(rows, key, n = 10, selected = null) {
  const by = new Map();
  for (const d of rows) {
    if (!d.auteur) continue;
    const a = by.get(d.auteur) || { name: d.auteur, total: 0, count: 0 };
    a.total += d[key];
    a.count += 1;
    by.set(d.auteur, a);
  }
  const ranked = [...by.values()].sort((a, b) => b.total - a.total);
  const top = ranked.slice(0, n);
  if (selected && !top.some((a) => a.name === selected)) {
    const sel = by.get(selected);
    if (sel) top.push(sel);
  }
  return top;
}

export function renderAuthorChips(el, authors, selected, unit) {
  el.innerHTML = authors
    .map((a) => `<button class="chip" aria-pressed="${a.name === selected}" data-a="${escapeHTML(a.name)}"
      title="${a.count} titre${a.count > 1 ? "s" : ""} · ${fmt(a.total)} ${unit}">${escapeHTML(a.name)}<span class="n">${fmt(a.total)}</span></button>`)
    .join("");
}

// Clicking a chip selects that author; clicking the selected one clears it.
export function onAuthorClick(el, state, render) {
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.author = state.author === b.dataset.a ? null : b.dataset.a;
    render();
  });
}
