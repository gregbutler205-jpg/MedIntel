# VALIDATION_LAB_BATCH.md
Founder click-through script for WO_LAB_BATCH_CONFIRM_01 (DEC-P43). The flow
lives at Import Records: upload a lab PDF under Labs (single file or batch).
Every lab document now stops in an archive review step — nothing reaches the
Labs list until the batch is confirmed. Run scenarios in order on one profile,
or independently after clearing site data. Use real lab report PDFs (Quest or
hospital panels); scenario notes say what each needs.

Automated companion: `npm run test:lab-batch` (68 cases) covers gating, state
transitions, provenance, migration, and persistence invariants. This script is
the human pass over the same ground.

Coverage notes:
- The current extractor emits no per-row confidence, so real documents default
  to normal confidence (per the WO, absent confidence = normal). Scenario 3
  is exercised by the automated suite and was verified live against a seeded
  archive document; re-run it manually once the extractor emits confidence.
- Vitals documents have no ingest path on main today; the row model supports
  them, but this script covers labs only.

## Scenario 1. Normal panel — no flags

1. Import a lab PDF whose analytes are all in range (e.g. a basic metabolic
   panel with normal results). Expect the review overlay "Review before
   adding to your record" instead of the old instant import.
2. Left pane: the source document pages render beside the extracted table.
   Right pane: one row per analyte with value, unit, reference range, and
   collection date in mono type.
3. No amber or blue borders, no acknowledgment checkboxes. Values in range
   render green.
4. The summary line reads "N rows will be added to your record · 0 excluded"
   and "✓ Confirm batch" is enabled immediately.
5. Confirm. Expect the Labs list to show every row, an Import Log entry with
   status "Confirmed", and a Records entry for the document.

## Scenario 2. Panel with out-of-range rows

1. Import a panel containing at least one result outside its printed
   reference range (or outside the range the document states).
2. The out-of-range row carries an amber border, its value renders amber, and
   an acknowledgment checkbox appears: "I've reviewed this flagged value
   against the source document."
3. The summary line appends, in amber, "· 1 flagged row needs
   acknowledgment" and "✓ Confirm batch" is disabled (dimmed, not-allowed
   cursor). Clicking it must do nothing.
4. Tick the acknowledgment. The amber suffix disappears and Confirm enables.
5. Confirm. In the Labs list the row keeps its out-of-range badge.

## Scenario 3. Low-confidence rows

1. Requires an extraction that emits confidence < 0.8 (see coverage note —
   not producible from real documents until the extractor emits confidence).
2. Expected behavior when available: the row initializes EXCLUDED (toggle
   reads "excluded", row dimmed) rather than included, and carries the amber
   low-confidence flag.
3. An excluded flagged row must NOT demand acknowledgment — only included
   flagged rows gate the confirm button.
4. Re-including the row surfaces its acknowledgment checkbox before Confirm
   enables.

## Scenario 4. Tacrolimus row

1. Import a panel containing a tacrolimus (FK506) trough. Alias forms such
   as "FK506" or "Tacrolimus Level" must be recognized — the monitored list
   matches on the canonical id, not the printed name.
2. The row carries the blue monitored-analyte border (#4f8ef7) rather than
   amber, and its acknowledgment checkbox reads "I've reviewed this
   monitored value against the source document."
3. Confirm stays disabled until the tacrolimus row is acknowledged, even
   when its value is in range.
4. A tacrolimus row that is also out of range shows amber (warning wins the
   border) and still requires exactly one acknowledgment.

## Scenario 5. Mixed exclusion

1. On a multi-row panel, toggle two rows to "excluded" before confirming.
2. The summary line updates live: "N rows will be added to your record · 2
   excluded". Excluding a flagged row removes its acknowledgment requirement
   from the count.
3. Confirm. Expect the Labs list to gain only the included rows and the
   Import Log entry to show the excluded count.
4. Return to Import Records. A card reads "…with 2 excluded rows you can
   still add later. Nothing joins your record until you confirm it." with a
   "Review now" button — excluded is not deleted.

## Scenario 6. Correction then confirm

1. Open a review with at least one out-of-range row. Use the row's edit
   control to correct its value (e.g. a misread digit) to what the document
   actually says.
2. Expect a green CORRECTED badge and the original shown as "was {old
   value}" beside the field. The original extracted value is never
   overwritten — corrections live alongside it.
3. If the corrected value is inside the printed reference range, the
   out-of-range flag clears and the acknowledgment demand disappears; if
   still outside, the row must be re-acknowledged (corrections reset acks).
4. Confirm. The Labs list shows the corrected value, not the extracted one.
5. Reopen the archive document (Scenario 7 path): the row still records both
   the correction and the original.

## Scenario 7. Revisit excluded rows

1. After Scenario 5, reload the app (excluded state must survive reload and
   Drive sync round-trips).
2. The Import Records card still offers the excluded rows; "Review now"
   reopens the same review overlay. If the original file is no longer held
   in this session, the left pane says so and points to Source Documents /
   the Drive report archive instead of rendering pages.
3. Toggle an excluded row back to "include". If it is flagged, its
   acknowledgment checkbox reappears and gates Confirm as usual.
4. Confirm. The re-promoted row joins the Labs list now, under a NEW
   confirmation event — the first event is history, not rewritten.
5. Already-promoted rows from the earlier confirm render locked in this
   view; they cannot be un-promoted from here.
