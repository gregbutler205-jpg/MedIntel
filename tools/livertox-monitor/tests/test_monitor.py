#!/usr/bin/env python3
"""Offline tests for the LiverTox monitor (work-order acceptance 3 and 4).

No network: acceptance 3 diffs a real snapshot against a hand-edited copy of
itself, and acceptance 4 feeds the resolver a saved page with the link removed.
Stdlib only, matching the project's no-framework test convention.

    python tests/test_monitor.py
"""

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import livertox_monitor as lm  # noqa: E402

lm._force_utf8_streams()  # test names contain arrows; console may be cp1252

PASS = FAIL = 0


def ok(condition, message):
    global PASS, FAIL
    if condition:
        PASS += 1
        print("PASS —", message)
    else:
        FAIL += 1
        print("FAIL —", message)


def load_baseline():
    snaps = sorted((ROOT / "snapshots").glob("livertox-*.json"))
    if not snaps:
        print("No snapshot found. Run: python src/livertox_monitor.py --baseline")
        raise SystemExit(2)
    with snaps[0].open(encoding="utf-8") as handle:
        return json.load(handle)


# ── Acceptance 3: exactly three changes, nothing else ───────────────────────
def test_three_changes():
    old = load_baseline()
    new = copy.deepcopy(old)
    records = new["masterlist"]["records"]

    # Pick edit targets whose names appear exactly once, so the edit is
    # unambiguous (9 names are duplicated in this source).
    counts = {}
    for record in records:
        counts[record["Ingredient"].strip().casefold()] = \
            counts.get(record["Ingredient"].strip().casefold(), 0) + 1
    unique = [r for r in records if counts[r["Ingredient"].strip().casefold()] == 1]

    altered, deleted = unique[0], unique[1]
    original_score = altered["Likelihood Score"]

    # (a) score altered — a fabricated string, to prove it is carried verbatim
    #     and never parsed or ranked
    for record in records:
        if record["Ingredient"] == altered["Ingredient"]:
            record["Likelihood Score"] = "Z [TEST]"
    # (b) row deleted
    new["masterlist"]["records"] = [
        r for r in records if r["Ingredient"] != deleted["Ingredient"]
    ]
    # (c) row added
    new["masterlist"]["records"].append({
        "Ingredient": "Zzz Test Ingredient",
        "Brand Name": "Testbrand",
        "Likelihood Score": "B[HD]",
        "Primary Classification": "HDS: Herbal Product",
    })

    changes = lm.diff_snapshots(old, new)

    ok(len(changes["masterlist_score_changed"]) == 1,
       f"exactly one score change (got {len(changes['masterlist_score_changed'])})")
    ok(len(changes["masterlist_removed"]) == 1,
       f"exactly one removal (got {len(changes['masterlist_removed'])})")
    ok(len(changes["masterlist_added"]) == 1,
       f"exactly one addition (got {len(changes['masterlist_added'])})")
    ok(not changes["changelog_new"] and not changes["hds_added"] and not changes["hds_removed"],
       "nothing else reported — changelog and HDS index show no changes")

    change = changes["masterlist_score_changed"][0]
    ok(change["ingredient"] == altered["Ingredient"].strip(),
       f"the altered ingredient is named ({change['ingredient']})")
    ok(change["score_before"] == [original_score] and change["score_after"] == ["Z [TEST]"],
       f"score reported verbatim, before → after ({change['score_before']} → {change['score_after']})")
    ok(changes["masterlist_removed"][0]["ingredient"] == deleted["Ingredient"].strip(),
       "the removed ingredient is named")
    ok(changes["masterlist_added"][0]["score"] == "B[HD]",
       "the added row keeps its bracketed score string exactly, unnormalized")

    # The report must label everything for disposition and must not claim to
    # have accepted, approved, or promoted anything.
    report = lm.render_report(new, changes, old)

    # The constraint is about how ROWS are labeled. The report's own disclaimer
    # legitimately uses those words in the negative ("no entry has been
    # accepted, approved, or promoted"), so check the table rows, not prose.
    # Scope to the changes section: the metadata bullets and the source-dates
    # table above it are informational and carry no disposition by design.
    changes_section = report[report.index("## Changes requiring disposition"):]
    data_rows = [ln for ln in changes_section.splitlines()
                 if ln.startswith("|") and not ln.startswith("|---")
                 and "Disposition |" not in ln]
    ok(data_rows and all(lm.HOLDING_QUEUE in ln for ln in data_rows),
       f"every table row carries the disposition label ({len(data_rows)} rows)")
    ok(not any(w in ln.lower() for ln in data_rows
               for w in ("accepted", "approved", "promoted")),
       "no row is labeled accepted / approved / promoted")
    bullet_rows = [ln for ln in changes_section.splitlines() if ln.startswith("- ")]
    ok(all(lm.HOLDING_QUEUE in ln for ln in bullet_rows) if bullet_rows else True,
       "HDS index entries are labeled for disposition too")
    ok("never an automatic removal" in report,
       "the report states a score change is never an automatic removal (DEC-P34 rule 1)")
    ok("Z [TEST]" in report and "B[HD]" in report,
       "score strings appear verbatim in the report")


def test_unchanged_is_silent():
    old = load_baseline()
    changes = lm.diff_snapshots(old, copy.deepcopy(old))
    ok(not lm.has_changes(changes), "a snapshot compared with itself reports no changes")


def test_duplicate_names_survive():
    """9 ingredient names repeat in this source, sometimes with different scores.

    Grouping by name must keep both rows rather than silently dropping one.
    """
    old = load_baseline()
    grouped = lm._index_by_ingredient(old["masterlist"]["records"])
    multi = {k: v for k, v in grouped.items() if len(v) > 1}
    ok(len(multi) > 0, f"duplicate ingredient names are preserved, not collapsed ({len(multi)} names)")
    total = sum(len(v) for v in grouped.values())
    ok(total == len(old["masterlist"]["records"]),
       f"no row lost in grouping ({total} == {len(old['masterlist']['records'])})")


# ── Acceptance 4: missing spreadsheet link fails loudly ─────────────────────
def test_missing_xlsx_link_fails_loudly():
    page = (ROOT / "tests" / "fixtures" / "masterlistintro-no-xlsx.html").read_text(encoding="utf-8")
    try:
        url = lm.resolve_xlsx_url(page)
        ok(False, f"expected a hard failure, but it returned {url!r}")
    except lm.SourceStructureError as exc:
        message = str(exc)
        ok(True, "missing .xlsx link raises SourceStructureError")
        ok("Refusing to fall back" in message, "the error states there is no cached fallback")
        ok("hide real changes" in message, "the error explains why a fallback would be dangerous")

    # ...and the same page WITH a link still resolves, so the test above is
    # detecting absence rather than a broken matcher.
    with_link = page.replace("</body>", '<a href="/books/NBK571102/bin/masterlist02-26.xlsx">x</a></body>')
    ok(lm.resolve_xlsx_url(with_link).endswith("masterlist02-26.xlsx"),
       "the same page with a link resolves to an absolute URL")


def test_relative_link_is_absolutized():
    html = '<a href="/books/NBK571102/bin/masterlist07-26.xlsx">spreadsheet</a>'
    ok(lm.resolve_xlsx_url(html) ==
       "https://www.ncbi.nlm.nih.gov/books/NBK571102/bin/masterlist07-26.xlsx",
       "a relative href resolves against the page URL")


def test_header_located_not_positional():
    """Columns are found by header text, and a missing required header stops the run."""
    shuffled = [
        ["Drugs for LiverTox", None, None, "Last Update: January 30, 2026"],
        ["Likelihood Score", "Primary Classification", "Ingredient", "Brand Name"],
        ["A [HD]", "HDS: Herbal Product", "Testium", "Testbrand"],
    ]
    index, columns = lm._locate_header_row(shuffled)
    ok(index == 1 and columns["Ingredient"] == 2,
       "header row and column positions are discovered, not assumed")

    try:
        lm._locate_header_row([["Count", "Brand Name"], ["1", "x"]])
        ok(False, "expected a failure when a required header is missing")
    except lm.SourceStructureError:
        ok(True, "a missing required header is a hard stop, not a guess")


if __name__ == "__main__":
    test_three_changes()
    test_unchanged_is_silent()
    test_duplicate_names_survive()
    test_missing_xlsx_link_fails_loudly()
    test_relative_link_is_absolutized()
    test_header_located_not_positional()
    print(f"\n{PASS} passed, {FAIL} failed (livertox-monitor)")
    raise SystemExit(1 if FAIL else 0)
