# LiverTox source monitor

Admin tooling for **DEC-P34** (source freshness monitoring), Tier 1 programmatic
sources. Detects what changed in LiverTox between quarterly runs and writes a
human-readable change report.

**It reports only.** It does not write to any substance table, does not assign or
infer any classification of its own, does not interpret Likelihood Scores, and
has no connection to the Insina app. Every changed or added entry is labeled
`HOLDING QUEUE — requires human disposition`.

## Why it is deliberately dumb about scores

Per **DEC-P33**, the LiverTox Likelihood Score measures hepatotoxicity only, and
is systematically wrong as a general transplant signal: acetaminophen scores `A`
and is the recommended post-transplant analgesic, while pseudoephedrine scores
`E` and transplant centers say to steer clear of it.

So score strings are carried through as **opaque text**. They are compared for
equality (changed / not changed) and never for magnitude, never ranked, never
mapped onto anything. `A [HD]`, `C[HD]` and `A ` are preserved verbatim,
inconsistent spacing included.

Per **DEC-P34 rule 1**, a score downgrade is a review trigger, never a deletion.
The report says what changed and never suggests removing anything.

## Usage

```bash
pip install -r requirements.txt

python src/livertox_monitor.py --baseline   # first run: snapshot + counts
python src/livertox_monitor.py --check      # quarterly: diff + report (default)
```

Exit `0` on success (whether or not changes were found), `1` on network or
structure failure — in which case **no snapshot is written and the previous one
is left untouched**, so a failed run can never look like "no changes".

Output:
- `snapshots/livertox-YYYY-MM-DD.json` — the state used for the next diff
- `reports/livertox-YYYY-MM-DD.md` — the change report (also printed to stdout)

Neither is ever overwritten; a same-day re-run gets a `-2`, `-3`, … suffix.

## Sources

| ID | Purpose | URL |
|---|---|---|
| P1 | Changelog | `/books/n/livertox/updates/` |
| P2 | Master list page (spreadsheet link resolved from here) | `/books/n/livertox/masterlistintro/` |
| P3 | HDS index | `/books/n/livertox/HerbalDietarySuppl/` |

**The spreadsheet URL is never hardcoded.** Its filename encodes a release date
(`masterlist02-26.xlsx`) and changes on release. It is resolved from P2 on every
run. If no `.xlsx` link is found the run fails loudly rather than reusing a
previously seen URL — a stale spreadsheet would diff clean and hide real
changes.

**The lag is expected, not an error.** The spreadsheet trails the site; at the
time of writing its banner read "Last Update: January 30, 2026" while the
changelog ran to 05 Aug 2026. The report shows both dates side by side. Read the
changelog for what is actually new; the spreadsheet is the structured diff.

## What the source actually looks like

Verified against the live 2026-08-08 release:

- Two-row header: a title banner (carrying the spreadsheet's own "Last Update"),
  then column headers, then data. Columns are located **by header text** — a
  missing required header is a hard stop, not a guess at positions.
- 1,707 data rows; 157 carry an `HDS:` primary classification.
- **Ingredient names are not unique.** Ten names repeat, sometimes with
  different scores (Omalizumab appears as both `X` and `E` under different
  brands). Rows are grouped by name so both survive; a name's scores are
  compared as a set. Whitespace is normalized for the grouping key only — 22
  names carry trailing spaces — while displayed values stay verbatim.
- Brand Name gives *a* brand, not necessarily the primary one (cyclosporine
  appears as Sangcya). Carried through as-is, uncorrected.

## Tests

```bash
python tests/test_monitor.py     # 23 checks, no network
```

Covers the work-order acceptance criteria: a hand-edited snapshot producing
exactly three changes and nothing else; a saved P2 page with the link removed
failing loudly; header-located (not positional) column discovery; duplicate
names surviving the diff; and every reported row carrying its disposition label.

Requires a snapshot to exist — run `--baseline` first.

## Notes

- No credentials, no API keys, no PHI. LiverTox is a US government work in the
  public domain, so storing extracted values is unproblematic. Snapshots store
  **data, not prose** — names, dates, scores, classifications. Entry narrative
  text is never captured.
- `snapshots/` and `reports/` are gitignored: they are generated artifacts, and
  a 1,707-row JSON per quarter would bloat the repo. They must still be kept on
  disk between runs — the most recent snapshot is the baseline for the next
  diff. If you would rather have them version-controlled, drop those two lines
  from `.gitignore`.
