#!/usr/bin/env python3
"""Fetch the two Paris library datasets and write cleaned JSON to data/.

Usage: python3 scripts/fetch_data.py
Standard library only. Re-run when Paris publishes the yearly update.
"""
import json
import re
import urllib.request
from pathlib import Path

API = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/{}/exports/json"
OUT = Path(__file__).resolve().parent.parent / "data"

# The source has a few characters lost to encoding ("?"). Fix the known ones.
FIXES = {
    "End?,  Tatsuya": "Endō,  Tatsuya",
    "Horikoshi,  K?hei": "Horikoshi,  Kōhei",
    "Oda,  Eiichir?": "Oda,  Eiichiro",
    "To?ibi?n,  Colm": "Tóibín,  Colm",
    "Compartiment n?6": "Compartiment n°6",
}


def fetch(dataset):
    with urllib.request.urlopen(API.format(dataset), timeout=60) as resp:
        return json.load(resp)


def clean_text(s):
    if not s:
        return None
    s = FIXES.get(s, s)
    return re.sub(r"\s+", " ", s).strip()


def author_name(raw):
    """'Oda, Eiichiro' -> 'Eiichiro Oda'."""
    s = clean_text(raw)
    if not s:
        return None
    if "," in s:
        last, first = (p.strip() for p in s.split(",", 1))
        return f"{first} {last}" if first else last
    return s


def title(raw):
    s = clean_text(raw) or ""
    s = re.sub(r"\s*:\s*roman$", "", s)  # drop the generic ": roman" suffix
    s = re.sub(r"(\s*:)+", " :", s)  # collapse ": :" runs
    s = re.sub(r"\s*:\s*$", "", s)  # drop a dangling trailing ":"
    return s[:1].upper() + s[1:]


def family(doc_type):
    """Group the ~20 document types into a handful of families for colour."""
    t = (doc_type or "").lower()
    if not t or t.startswith("nouveauté"):
        return "Autre / non précisé"
    if "bande dessinée" in t:
        return "BD & manga"
    if t.startswith("livre"):
        return "Livres"
    if "dvd" in t or t.startswith("cd") or "musique" in t:
        return "Films & musique"
    return "Autre / non précisé"


def main():
    OUT.mkdir(exist_ok=True)

    reserves = [
        {
            "rang": r["rang"],
            "titre": title(r["titre"]),
            "auteur": author_name(r["auteur"]),
            "type": clean_text(r["type_de_document"]) or "Non précisé",
            "famille": family(r["type_de_document"]),
            "reservations": int(r["reservations"]),
        }
        for r in fetch("les-1000-titres-les-plus-reserves-dans-les-bibliotheques-de-pret")
    ]
    reserves.sort(key=lambda r: r["rang"])

    prets = []
    for r in fetch("les-titres-les-plus-pretes"):
        ex = r["nombre_d_exemplaires"] or 0
        fam = family(r["type_de_document"])
        if fam == "Autre / non précisé" or fam == "Films & musique":
            fam = "Jeux, musique & autres"
        prets.append({
            "titre": title(r["titre"]),
            "auteur": author_name(r["auteur"]),
            "type": clean_text(r["type_de_document"]),
            "famille": fam,
            "prets": r["prets"],
            "exemplaires": ex,
            "bibliotheques": r["nombre_de_localisations"],
            "prets_total": r["nombre_de_pret_total"],
            "prets_par_exemplaire": round(r["prets"] / ex, 1) if ex else None,
        })
    prets.sort(key=lambda r: -r["prets"])

    for name, rows in (("reserves", reserves), ("prets", prets)):
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
        print(f"wrote {path.relative_to(OUT.parent)} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
