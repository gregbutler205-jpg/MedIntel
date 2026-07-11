# Claude Code Master Prompt: Insina Health Pilot Implementation

How to use:
1. Copy PILOT_GATE.md, APP_CHANGES_SPEC.md, INSINA_AI_PROMPTS.md, and
   DECISIONS_PILOT_AMENDMENT.md into the repo root.
2. Open Claude Code at the repo root.
3. Paste everything below the line as your first message. Answer its
   questions when it stops; say "continue" to advance phases.

---------------------------------------------------------------------

You are implementing a settled specification for Insina Health, a
React/Vite PWA with a Node proxy (proxy/) and a mobile companion mode.
The design phase is complete and documented. Your job is execution, not
redesign. I am the founder and the only current user; these changes
prepare the app for a small invited pilot group.

## Required reading, in full, before any code

1. PILOT_GATE.md (the gate items, PG-01 to PG-11)
2. APP_CHANGES_SPEC.md (implementation spec: S-, P-, A- items)
3. INSINA_AI_PROMPTS.md v2.4 (the AI prompt spec; section 3 is copied
   verbatim into code, section 9 is your acceptance checklist)
4. DECISIONS_PILOT_AMENDMENT.md (decision entries to log)
5. INSINA_UI_CHANGES.md (the reconciled UI workstream; UI-N items). Where
   a UI item shares code with an engineering item, INSINA_UI_CHANGES.md
   states which document owns what; follow those pointers.

Then inspect the code paths each item names and confirm the issue still
exists as described. The specs were written against v1.21.0. If the code
has moved, report the delta under the item ID and adapt the fix without
changing its intent. Never patch blind.

## Ground rules

1. Execute the spec. If an instruction is impossible, conflicts with the
   code, or requires a choice the spec does not settle, stop and ask me.
   Ambiguity resolves upward to me, never into improvisation.
2. One item per commit. Commit message format: item IDs first, then a
   short description, for example "S-02 PG-02: escape AI output in shared
   renderer". Log decisions in DECISIONS.md and cite DEC IDs in commits.
3. Update CHANGELOG.md with each item, following its existing format and
   versioning conventions.
4. After every item, `npm run build` must pass. There is currently no
   test suite; the threshold fixtures in Phase 1 become the first
   automated check. Give me a short manual test list at each checkpoint.
5. Scope discipline: no refactors, dependency changes, formatting sweeps,
   or UI redesign beyond what an item specifies. Preserve the existing
   visual design exactly.
6. Never print, log, or commit a secret. Use placeholders for tokens and
   env values; I set real values in Render, GitHub, and Anthropic myself.
7. Items marked HUMAN are mine. Stop, tell me exactly what to do and
   where, and wait for my confirmation before proceeding.
8. Items marked DECISION: ask me the question, wait for my answer, then
   implement. Do not pick a default.
9. One item is explicitly pending and must NOT be implemented unless I
   say go (INSINA_AI_PROMPTS.md section 10): the CSC rule 10 rewording.
   Per-month digest anchors are optional future work, out of scope; the
   v2.2 digest trend line covers the slow-decline case.
10. Commit locally per item. Push only at phase checkpoints after my go,
    with one exception: the history purge in Phase 0 pushes immediately.
    Pushing main deploys the app via GitHub Pages, so pushes are
    deliberate.
11. Stop at the end of each phase. Report, then wait for "continue".

## Setup, before Phase 0

- DECISIONS.md does not exist in the repo root. Ask me whether I keep it
  elsewhere. If not, create it and seed it from
  DECISIONS_PILOT_AMENDMENT.md, renumbering the DEC-P placeholders into
  a clean sequence, and add one further entry: CSC version 1.0 to 1.1
  (tripwire evaluation envelope), per INSINA_AI_PROMPTS.md section 8.
- Create CLAUDE.md at the repo root containing the ground rules above,
  the commit conventions, and a standing note that pre-commit secret
  scanning applies (S-06).
- Create FEATURE_INTAKE.md if absent. Seed it with: A-11
  consequence-gated model routing (gated on A-01 fixtures and the A-09
  rollout), the S-08 routing sub-decision (proxy-forwarded vs
  direct-from-browser BYO key, decided at release), and the
  save-analysis-into-record option (AI-generated content entering the
  record needs explicit labeling and its own DEC).
- Build a todo list covering every item ID in this prompt and keep it
  current.

## Phase 0: immediate security. Target: done and deployed today.

Work in this exact order.

1. **S-01 / PG-01, token removal.**
   HUMAN FIRST: I revoke the exposed token at github.com/settings/tokens.
   Do nothing until I confirm.
   Then: note a backup ref (branch or tag) for safety, delete
   "GitHub Token.docx", purge it from all history with git filter-repo,
   add `*.docx`, `.claude/`, and `.env*` to .gitignore, and remove
   .claude/settings.local.json from tracking.
   Do not batch any other change into the history rewrite.
   HUMAN: I confirm, then the rewritten history force-pushes immediately.
2. **S-05 items 1 and 2 / PG-04, proxy limits.** In proxy/server.js,
   enable the rate limiter with a real cap (remove `skip: () => true`)
   and add a sensible per-route cap for /api/extract-pdf.
   HUMAN: I set a hard monthly spend cap in the Anthropic console, and I
   redeploy the proxy on Render when you tell me it is ready.
3. **S-02 / PG-02, output escaping.** Create src/lib/renderAiText.js:
   escape `& < > " '` first, then the `**bold**` and `-----` transforms.
   Port Tab05.jsx and Tab11.jsx to it, delete their local applyBold
   copies, and grep to confirm no other dangerouslySetInnerHTML consumes
   AI text.
4. **S-04 / PG-03, bundle pdf.js.** Replace the cdnjs dynamic import in
   Tab12.jsx with the bundled pdfjs-dist already in package.json, worker
   wired via Vite `?url`. Delete all CDN pdf.js references.
5. **S-03 / PG-05, CSP.** Add the Content-Security-Policy meta tag to
   index.html per the spec, allowlisting only origins actually in use.
   Verify fonts, Google Identity, Drive sync, and proxy streaming still
   work, then tighten. Note `style-src 'unsafe-inline'` as accepted debt.
6. **S-06, secrets hygiene.** Document gitleaks pre-commit usage in
   CLAUDE.md.
   HUMAN: I enable GitHub push protection.
   DECISION: log the repo-visibility question (public vs private) in
   DECISIONS.md as open, for me to answer.
7. **A-14, Home button parity.** Add the Home button to the four tabs
   missing it: Medications, Labs and Trends, Vitals, and Symptoms.
   Match the existing implementation and placement from the tabs that
   have it, exactly; do not restyle, and do not extract a shared
   component unless the pattern already is one. Verify at mobile
   widths. Not a security item; it rides this deploy because it is
   trivial and user-facing.

Phase 0 checkpoint: report per item, give me the manual test list, wait
for my go to push and for "continue".

## Phase 1: pilot gate. Blocks any second user.

Two sequencing amendments to APP_CHANGES_SPEC Part 5, both per its own
dependency notes: A-08 runs before P-02 and A-07 (migrations need rails),
and a v1 of A-03 is pulled into this phase because the prompt builders
consume {labDigest}.

Work in this exact order.

1. **A-08, migration rails.** src/lib/migrations.js, mi_schema_version,
   ordered idempotent migrations run at boot, RIE audit log entries,
   export-backup prompt before major migrations.
2. **A-02 / PG-08, unified AI client.** src/lib/aiClient.js with
   MODEL_MAP (standard: claude-sonnet-4-6, advanced: claude-opus-4-6,
   extraction: sonnet), including per-surface max_tokens per the amended
   A-02. Port Tab05, Tab10, Tab11, Tab12, and companion callers. Delete every direct api.anthropic.com call from src/ (the
   BYO-key path waits for A-10). Remove stale model strings.
3. **S-05 item 3 / PG-04, pilot tokens.** Client attaches
   `Authorization: Bearer` from config; proxy validates against
   PILOT_TOKENS with enforcement behind an env flag, default off.
   Deploy order matters: client with token support deploys first, then I
   flip enforcement on Render. Spell this out for me at the checkpoint.
   HUMAN: I generate tokens, set PILOT_TOKENS, and flip the flag.
4. **A-09 / PG-06, prompts as code.** src/prompts/: core.js exports
   CSC_VERSION "1.1" and the Clinical Safety Core copied verbatim,
   character for character, from INSINA_AI_PROMPTS.md section 3, plus the
   display and routing blocks. One builder module per surface (A to H)
   implementing section 7 exactly, each exporting PROMPT_VERSION. All
   surfaces consume these builders through aiClient. Delete the old
   inline prompt strings, including every hardcoded patient-specific
   clinical fact they contained. Order payloads cache-first per the
   amended A-09 (stable sections lead, volatile sections trail), and
   include {docExcerpts} only when the question references documents or
   one was added this session.
5. **A-03 v1, lab digest.** src/lib/labDigest.js per the amended A-03:
   a 12-month digest as the default on both tabs, each analyte line
   carrying last 6 values, window min and max, the computed trend line
   (first, last, direction, draw count), delta, ranges, and tripwire
   status. Grouping by normalized raw name (trim, lowercase) until A-04
   adds canonical IDs in Phase 2. {labsExtended} is the same digest at
   24 months, Advanced only, included app-side when the question is
   longitudinal or the patient toggles it, never by model request. Wire
   {labDigest} and {labsWindow} into the Tab05 and Tab11 builders: Tab11
   stops sending full lab history, Tab05 stops sending only the latest
   value per test.
6. **A-06 / PG-06, condition modules.** src/prompts/modules/ with
   MOD-IMMUNOSUPPRESSION exactly as written in INSINA_AI_PROMPTS.md
   section 5.5, reviewed_by null. Selection logic per section 5.3.
   Loader excludes unreviewed modules unless the local flag
   `mi_allow_unreviewed_modules` is true (I enable it on my own device;
   pilot users never get unreviewed content).
7. **A-05 / PG-07, kill the silent rewrite.** Delete the
   kidney-to-liver replacement in the prompt-build path. Add the RIE
   Review Queue discrepancy check per spec: flag, patient confirms once,
   confirmed value is stored and injected.
8. **A-01 / PG-09, tripwire engine.** src/lib/tripwire.js implementing
   the evaluation envelope from INSINA_AI_PROMPTS.md section 6: status
   current, stale, or unavailable; evaluatedAt; newestLabDate; flags with
   guidance strings and thresholdSource. Threshold precedence: provider
   custom, then user-confirmed, then default library limited to analytes
   with defensible universal critical bounds. Hooks at import, sync, and
   manual entry. UI surfacing per spec, including visible evaluation
   status. Fixtures: a table per analyte of input values and expected
   flag output, run by `npm run test:thresholds`, wired into prebuild so
   a library change without updated fixtures fails.
9. **P-01, identity minimization.** mi_user_id (random, stable), builder
   allowlists per INSINA_AI_PROMPTS.md section 2, DOB converted to age at
   build time. Grep src/ for mi_profile_personal reads inside any prompt
   path and remove them. Confirm the words "anonymous" appear nowhere in
   prompt code or user-facing copy; use "pseudonymous" or
   "identity-minimized".
10. **S-07, document delimiting.** In the builders: DOCUMENT blocks with
    id, source, date; control characters stripped; per-document cap with
    a visible [TRUNCATED] marker inside the block.
11. **P-02 / PG-10, vault encryption.** src/lib/vault.js per
    APP_CHANGES_SPEC P-02, all eight numbered points: PBKDF2-SHA256 at
    600k+ iterations, DEK/KEK envelope, AES-GCM with fresh IVs, mandatory
    recovery key shown once with download option, all mi_* record stores
    encrypted, DEK in memory only with auto-lock, PIN demoted to
    in-session convenience with honest copy, Drive uploads ciphertext
    only, migration on the A-08 rails with backup-export first and an
    interrupted-migration flag.
12. **A-10, settled: record it.** BYO-key stays, hardened at release
    (S-08), dormant through the pilot; A-02 has already removed the
    direct calls. Log the DEC entry from DECISIONS_PILOT_AMENDMENT.md,
    confirm the Tab13 key modal is hidden or clearly marked inactive
    until S-08, and note the parked routing sub-decision in
    FEATURE_INTAKE.md. No hardening implementation now.
13. **P-06 / PG-11 and P-05, legal drafts.** Draft the terms, privacy
    policy, AI-limitations consent screen (mirroring the CSC identity
    statement), and pre-commercial acknowledgment, all marked DRAFT
    pending attorney review. Draft INCIDENT_PLAYBOOK.md per P-05.
14. **A-12, plausibility guard.** src/lib/plausibility.js plus versioned
    src/config/plausibilityBounds.js per the spec: hard band blocks the
    save with an immediate message and correction suggestions (value
    divided by 10 if in range, adjacent-digit transposition; the patient
    picks, nothing auto-corrects); soft band confirms and saves with one
    tap, never blocks. Synchronous hook in the vitals and labs entry
    forms before save; extraction path adds bounds and unit-mismatch
    checks to RIE preflight so out-of-band OCR values land in the Review
    Queue with the raw extracted text. Cross-field v1: systolic greater
    than diastolic (confirm), SpO2 hard cap 100. Ordering contract:
    plausibility resolves before tripwire evaluation at the same entry,
    import, and sync hooks; implement alongside step 8 and test the
    order explicitly (a blocked typo must never fire a flag; a confirmed
    extreme must). MERGE UI-4 here (same vitals form): Reading Date
    editable, Reading Time optional, Entered At stored separately, chosen
    date/time shown in Quick Log before saving, same-day readings kept
    separate, latest-value logic fixed to one shared rule, one shared
    vital schema/helper on the A-08 rails, consistent labels (Log Vitals,
    O2 Saturation), likely-duplicate detection without silent deletion.
15. **A-13, analysis context gathering.** Implement prompt spec v2.3:
    the CONTEXT GATHERING block on Surfaces A and G (up to 5 questions,
    one batched round, rule 5 precedence), Surface B2 capped at one, the
    {sessionContext} variable, and the optional free-text context field
    on the Tab05 Full Analysis launch that feeds it. Results presentation:
    analysis outputs open in a dedicated full-screen overlay (a modal,
    not window.open, so popup blockers and the mobile PWA are non-issues)
    with a Print button and a Save button. Print reuses the existing
    branded print pattern via a print stylesheet scoped to the overlay.
    MERGE UI-15 here (same screen): wide dominant conversation workspace,
    compact Standard/Advanced indicator with Change, collapsible Quick
    Prompts and "Data used in this analysis", response boundaries, mode
    badge, timestamp, composer anchored bottom, model names de-emphasized.
    Responses use the prompt spec v2.4 four-section structure. Save is
    "Save to My Notes" (approved): the analysis is saved into Notes as a
    dated entry with an explicit AI-generated label, and also downloadable
    as markdown. Use the UI-14 Print icon-and-label treatment. Consume the
    UI-10 shell and UI-8 tokens if those UI steps have landed; if not,
    build to them so the later shell work does not re-do this screen.

### Phase 1, UI track (INSINA_UI_CHANGES.md; runs alongside the steps above)

After the engineering steps, or interleaved once their merge-point
counterparts are done, implement the UI production-readiness items. Order:
foundation first, then per-module, then data integrity, then the checks.

U1. **Foundation.** UI-10 shared shell, UI-8 typography/contrast tokens,
    UI-11 record-type labels, UI-14 semantic icons and the Print
    treatment, UI-9 desktop nav grouping. Do these first; later items
    consume them. Coordinate UI-9 with the A-14 Home and UI-26 Search
    placement so the top region is laid out once.
U2. **Per-module.** UI-16 Labs & Trends chart (Doctor's-Range-first is a
    chart-display rule only; the AI still references both ranges in text
    per the prompt spec), UI-18 Care Team rename and section trim (data
    preserved), UI-25 selection descriptor, UI-19 Medical Records detail
    panel, UI-20 Import Records tabs (preserve the extract/review/save
    flow, Surfaces D/E), UI-21 Export & Backup vs App Settings split,
    UI-23 Health Profile printing, UI-24 Conditions/Surgeries, UI-22
    Symptoms.
U3. **Data integrity and nav.** UI-2 kill raw NaN/undefined display with
    shared display-safety helpers, UI-26 Search (fix and place beside
    Home), UI-13 access control (defers to P-02; remove temp PIN;
    emergency info via the exportable ED packet, not an in-app reduced-
    auth view). UI-3 and UI-4 were merged into A-04 and A-12 above.
U4. **Checks (verify, repair only if failing).** UI-7 appointment
    duplicates, UI-27 abbreviations/Learn More, UI-29 save confirmations
    and unsaved-changes.
U5. **UI-1 demo isolation.** Implement here unless the Phase 0 conditional
    already escalated it (demo reachable to real user data).

Deferred to their own decisions, do not build: the UI-13 Emergency Card
option B (default is option A, the exportable packet); anything in the
INSINA_UI_CHANGES.md no-change/rejected register.

Phase 1 checkpoint: run the INSINA_AI_PROMPTS.md section 9 checklist item
by item and report pass or fail with evidence. Produce the PILOT_GATE.md
checkbox status table, flagging which items still need HUMAN or external
action (clinical review of modules and guidance strings, attorney pass,
token issuance). Manual test list. Wait for "continue".

## Phase 2: quality and scale. After my go, order within phase flexible.

- **A-04**: canonical lab names (mi_lab_name_map, seeded synonyms,
  unmapped names flagged through RIE, confirmed mappings persist).
  Upgrade labDigest grouping to canonical IDs.
- **A-07**: blob store (IndexedDB wrapper, no new dependency), card
  photos and document images move out of localStorage, Drive appData for
  binaries, one-time migration on the A-08 rails.
- **P-03**: scope the zero-log claim in all user-facing copy per spec.
- **P-04**: HUMAN, I verify Anthropic API data handling; you record the
  outcome and date in DECISIONS.md when I report back.
- **S-08**: at the release gate, implement the settled A-10 (keep BYO,
  hardened: encrypted at rest, session-only option, warning copy) and
  log the routing sub-decision DEC (proxy-forwarded vs direct).
- **A-11**: consequence-gated MODEL_MAP reassignments (Surfaces C and H
  first), only after A-01 fixtures and the A-09 rollout are stable, each
  validated against the section 9 checklist before shipping.
- UI Phase 2 (INSINA_UI_CHANGES.md): UI-8-P2 large-text setting, UI-17-P2
  appointments calendar toggle, UI-24-P2 advanced condition sort/filter,
  UI-18-P2 optional health-management features (only if user testing
  supports; the Phase 1 hidden data is preserved for this), UI-26-P2
  advanced search (AI answers from search inherit the full prompt safety
  core).
- Sweep: confirm no remaining direct API calls, no stale model strings,
  no "anonymous" wording, no orphaned code from deleted paths.

Phase 2 checkpoint: final report against every item ID in this prompt,
with commit hashes.

## Reporting format, every item

Item ID; files touched; what changed in two sentences; how verified;
any deviation from spec and why; commit hash.

## Questions protocol

Blocking gates (HUMAN, DECISION) stop immediately. Everything else:
batch questions at natural pauses rather than one at a time. Never guess
on a DECISION item, and never resolve a spec conflict silently.
