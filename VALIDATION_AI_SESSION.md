# VALIDATION_AI_SESSION.md
Founder click-through script for the AI session shell (AI_SESSION_SPEC v0.3,
DEC-C-TBD pending final IDs). The surface lives at AI Analysis. Run scenarios
in order on one profile. What this branch builds is the deterministic shell —
session lifecycle, stamping, artifacts, and the validator engine; claim-typed
generation, corpus rows, and the tripwire block inside responses wait on
corpus v1 + prompts v2.5 and are NOT testable here.

Automated companion: `npm run test:ai-session-shell` (56 cases).

Coverage notes:
- Copy strings (warn-on-close, dividers, gap notices) are PROVISIONAL,
  gathered in src/lib/aiSessions.js SESSION_COPY for your review.
- The old running feed is retired but its data (insina_ai_messages) stays on
  disk and remains searchable from Search. Old conversations already saved to
  Notes are untouched.

## Scenario 1. New session

1. Open AI Analysis. Expect a session INDEX (not the old feed): "＋ New
   session" as the primary action, quick prompts / data used / reference
   docs in the sidebar, and an empty-state hero on a fresh profile.
2. Start a session and ask anything. Expect the screen to become a focused
   session surface: deterministic header (your question as the title, your
   name, start date, record-state stamp, reference-set version, and the
   informational footer), the thread, the composer, and an end-actions bar
   reading Save to Notes · Save & Print · Close.
3. The reply streams in and lands as a permanent turn. The session now
   appears on the index as "open" with its part and message counts.

## Scenario 2. Quick-launch seeding

1. From the Dashboard, tap one of the AI quick actions (or "Analyze ▸" on a
   reference doc, or Ask AI from Search). Expect a NEW session to open
   pre-seeded with that question and send it automatically.
2. A sidebar quick prompt on the index opens the session surface with the
   prompt filled in but NOT sent — you review, then press Send.

## Scenario 3. Save to Notes — verbatim, append-only

1. In a session with a few turns, press "Save to Notes". The state chip
   flips to "saved to Notes" and the button shows a check.
2. Open My Notes. Expect a note titled "AI Session — {your question}" with
   an About section and one "Part n" section per saved segment — the exact
   transcript, timestamped, nothing summarized.
3. Ask a follow-up in the same session, save again. Expect the note to GAIN
   a section; existing sections are byte-identical (append-only).

## Scenario 4. Save & Print — every printout has a stored counterpart

1. Press "Save & Print" on an unsaved session. Expect the save to happen
   FIRST (chip flips) and then the print window to open: shield logo,
   your identity block, generation timestamp, per-part stamps, the full
   transcript with collapsed content expanded, care-team contacts, and the
   disclaimer footer.
2. There is no print-without-save control anywhere on the surface.

## Scenario 5. Close without saving — warn, then discard

1. Start a session, ask one question, then press Close (or the Sessions
   back-arrow). Expect the warning modal — closing discards the session and
   keeps only the fact that one happened.
2. Confirm the discard. Expect the session gone from the index. (For the
   technically curious: mi_ai_discard_log gains a timestamp-only entry.)
3. On a SAVED session with new unsaved turns, Close warns with the variant
   copy — only the new turns are discarded; the note keeps what was saved.
4. A session with nothing said closes silently — no modal, nothing kept.

## Scenario 6. Reopen — new part, divider, staleness

1. Open a saved session from the index. Expect the full thread read-through
   with the composer live.
2. Change something in your record first (edit a condition, log a vital),
   then reopen the session. Expect the amber notice that your record has
   changed, and a "record changed" badge on that session's index row.
3. Ask a follow-up. Expect a dashed divider above the new part stating the
   record has changed since the previous part, and the new part to carry a
   fresh record-state stamp in the header.
4. The divider and stamps persist into the saved note and the printed
   document — earlier parts are never re-rendered or altered.

## Scenario 7. Guards carried over

1. The daily question counter, mode selection (Standard/Advanced), stale
   consent handling, Stop-mid-stream, and cold-start Retry all behave as
   before. A cold-start failure withdraws your unsent question so Retry
   never double-sends it into the transcript.
