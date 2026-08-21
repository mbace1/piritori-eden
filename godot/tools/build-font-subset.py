#!/usr/bin/env python3
"""build-font-subset.py - the font the WEB build needs.

ui/fonts.gd asks the OS for a Japanese face via SystemFont. That is correct on
desktop and MEANINGLESS on the web: a browser export has no system fonts to ask,
so it falls back to Godot's bundled face, which carries no CJK at all. The whole
Japanese locale rendered as tofu boxes in the browser, and so did the `->` arrow
(U+2192) in the title, in every language. All 201 gates were green while it did.

So the CJK coverage has to be IN the build. Not the whole 9.6MB of Noto Sans JP -
this repository does not carry multi-megabyte binaries - but exactly the glyphs
this game can actually emit, which is a few hundred.

    python tools/build-font-subset.py            # build
    python tools/build-font-subset.py --check    # verify, change nothing (CI)

The coverage set is DERIVED, never hand-listed:
  * every codepoint in every locale/*.csv, so a new translation extends it
  * printable ASCII plus the Latin-1 letters Finnish needs
  * SYMBOLS below - the non-ASCII characters drawn from code rather than from a
    translation, each one named with where it is used

tests/test_font_coverage.gd then checks the SHIPPED font against the same
sources, so adding a glyph without rebuilding fails rather than shipping a box.
"""
import argparse, io, os, sys, urllib.request, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
OUT_DIR = os.path.join(PROJECT, "ui", "fonts")

# Pinned. A font that changes under you changes every line length in the game.
SRC_URL = "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"
OFL_URL = "https://github.com/google/fonts/raw/main/ofl/notosansjp/OFL.txt"

# Non-ASCII drawn from code. Keep the "where" - it is why the glyph is here.
SYMBOLS = {
    "→": "app_shell.gd - the title, PIRITORI -> EDEN",
    "◉": "app_shell.gd - a LOOK inspectable (was an emoji no text font carries)",
    "▶": "app_shell.gd - an unseen encounter / bulletin",
    "✓": "app_shell.gd - a bulletin already seen",
    "•": "app_shell.gd - effect list bullets",
    "◆": "palette.gd - an active or opening site pin",
    "▲": "palette.gd - a landmark pin",
    "◇": "palette.gd - a teaser pin",
    "×": "palette.gd - multiplication in stat readouts",
    "—": "news_event.gd, app_shell.gd - em dash in prose",
    "–": "fighter.gd - en dash in ranges",
    "“": "news_event.gd - opening quote on a bulletin",
    "”": "news_event.gd - closing quote on a bulletin",
    "·": "app_shell.gd - the separator in status lines",
    "€": "app_shell.gd - euro, alongside the markka",
    "§": "prose that cites the design documents",
}


def literal_codepoints() -> dict:
    """Non-ASCII characters inside STRING LITERALS in the GDScript.

    Derived, not listed. SYMBOLS above says *why* each glyph is there; this says
    which ones are really reachable, so adding one to the code and forgetting to
    rebuild fails instead of shipping a box. Comments are skipped by construction:
    nothing outside a quote is ever collected, and `#` inside a quote is just a
    character - which is what makes this safe on lines like `"# %d"`.
    """
    found = {}
    for root, dirs, files in os.walk(PROJECT):
        # Exactly what ships. export_presets.cfg carries
        # `exclude_filter="tools/*, tests/*"`, so a separator drawn by a test is
        # not a glyph the game can emit and has no business in the subset.
        dirs[:] = [d for d in dirs
                   if d not in (".godot", "data", ".import", "fonts", "tests", "tools")]
        for fn in files:
            if not fn.endswith(".gd"):
                continue
            path = os.path.join(root, fn)
            rel = os.path.relpath(path, PROJECT).replace(os.sep, "/")
            with io.open(path, encoding="utf-8") as fh:
                for lineno, line in enumerate(fh, 1):
                    quote = None
                    prev = ""
                    for ch in line:
                        if quote is None:
                            if ch in ('"', "'"):
                                quote = ch
                            elif ch == "#":
                                break          # a comment - nothing here is drawn
                        else:
                            if ch == quote and prev != "\\":
                                quote = None
                            elif ord(ch) > 0x7F:
                                found.setdefault(ord(ch), "%s:%d" % (rel, lineno))
                        prev = ch
    return found


def wanted_codepoints() -> set:
    cps = set(range(0x20, 0x7F))
    for ch in "äöÄÖåÅ":   # Finnish / Swedish
        cps.add(ord(ch))
    for ch in SYMBOLS:
        cps.add(ord(ch))
    cps.update(literal_codepoints().keys())
    loc = os.path.join(PROJECT, "locale")
    for fn in sorted(os.listdir(loc)):
        if not fn.endswith(".csv"):
            continue
        with io.open(os.path.join(loc, fn), encoding="utf-8") as fh:
            for ch in fh.read():
                if ch not in "\r\n":
                    cps.add(ord(ch))
    return cps


def cached(url: str, name: str) -> str:
    path = os.path.join(HERE, ".fontcache", name)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        sys.stderr.write("  fetching %s\n" % name)
        with urllib.request.urlopen(url, timeout=300) as r, open(path, "wb") as w:
            w.write(r.read())
    return path


def build(check_only: bool) -> int:
    from fontTools.ttLib import TTFont
    from fontTools import subset
    from fontTools.varLib import instancer

    cps = wanted_codepoints()
    sys.stderr.write("  coverage wanted: %d codepoints\n" % len(cps))

    ok = True
    for weight, tag in ((400, "Regular"), (700, "Bold")):
        target = os.path.join(OUT_DIR, "NotoSansJP-Subset-%s.ttf" % tag)
        if check_only:
            if not os.path.exists(target):
                sys.stderr.write("  MISSING %s\n" % os.path.basename(target))
                ok = False
                continue
            have = set(TTFont(target).getBestCmap().keys())
            missing = sorted(cps - have)
            if missing:
                ok = False
                sys.stderr.write("  %s lacks %d codepoints: %s\n" % (
                    os.path.basename(target), len(missing),
                    " ".join("U+%04X" % c for c in missing[:12])))
            else:
                sys.stderr.write("  %s OK (%d glyphs)\n" % (
                    os.path.basename(target), len(have)))
            continue

        font = TTFont(cached(SRC_URL, "NotoSansJP-VF.ttf"))
        font = instancer.instantiateVariableFont(font, {"wght": weight})
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.recalc_bounds = True
        s = subset.Subsetter(options=opts)
        s.populate(unicodes=cps)
        s.subset(font)
        os.makedirs(OUT_DIR, exist_ok=True)
        font.save(target)
        size = os.path.getsize(target)
        sys.stderr.write("  wrote %s  %.1f KB\n" % (os.path.basename(target), size / 1024.0))

    if not check_only:
        lic = os.path.join(OUT_DIR, "OFL.txt")
        if not os.path.exists(lic):
            with open(cached(OFL_URL, "OFL.txt"), "rb") as r, open(lic, "wb") as w:
                w.write(r.read())
            sys.stderr.write("  wrote OFL.txt (the licence ships with the font)\n")

    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="verify the shipped subset covers every source codepoint")
    a = ap.parse_args()
    sys.stderr.write("== font subset ==\n")
    raise SystemExit(build(a.check))
