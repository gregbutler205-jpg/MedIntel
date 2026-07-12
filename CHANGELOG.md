# Changelog

All notable changes to Insina Health are recorded here. This project follows
[Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**

- **MAJOR** — large redesigns or breaking changes to how data is stored
- **MINOR** — new features (e.g. a new tab or section), backward-compatible
- **PATCH** — bug fixes and small tweaks

At the end of a working session, bump the version in `package.json`, add an
entry here, then tag the release in git (`git tag v1.5.0 && git push --tags`).

---

## v1.25.0 — 2026-07-12 (Phase 1: pilot gate — in progress)

### Added
- **S-07:** Prompt-injection defense at prompt-build time. New
  `src/prompts/documents.js`: `stripControlChars()` removes C0/C1 control
  characters (keeping `\n`/`\t`); `formatDocumentBlock({id, source, date,
  text, maxLength})` wraps one document excerpt as
  `[DOCUMENT id=... source=... date=...] ... [END DOCUMENT]`, appending a
  visible `[TRUNCATED]` marker *inside* the block when capped — CSC rule 9
  handles the model side (documents are content, never instructions);
  this is the app-side half spec §S-07 asks for.
  - **Wired into every document-injection point still using raw
    concatenation:** Tab11's reference-document section (already had
    informal `[Document: "name" | ...]` brackets — replaced with the real
    delimiter format; the per-document/total-budget truncation logic is
    preserved exactly, now tracking actual post-strip byte counts rather
    than the cap itself, so budget-sharing across multiple documents in one
    request behaves the same as before). Tab09's `apiSummarizeDoc`/
    `apiExtractFindings` and Tab12's `parseDocWithClaude`/
    `parseLabsWithClaude` had **no delimiting at all** — raw document text
    concatenated straight into message content with a silent `.slice()`
    truncation the model was never told about. Tab14's `buildDocContext()`
    (Consultation Prep's document-search injection) had the same gap. All
    four now go through `formatDocumentBlock()`.
  - Verified: `npm run build` passes. A standalone test confirmed control
    characters are stripped without touching printable text, truncation
    produces a `[TRUNCATED]` marker inside the block, an under-cap document
    gets no marker, and Tab11's multi-document budget-tracking loop
    consumes exactly the post-strip byte count per document (not the
    cap) — the first two documents fit fully, a third that exceeds the
    remaining budget truncates correctly, and a fourth is correctly omitted
    once the budget is exhausted.
- **P-01:** Identity minimization in AI payloads. `src/prompts/identity.js`
  (built ahead of schedule during A-09, since the prompt builders needed
  `{userId}`/`{age}`/`{sex}` to construct the CSC at all) is the module the
  spec names as new `src/lib/identity.js` — same requirements, different
  path; A-09's builders already only ever accept `{userId, age, sex,
  dataSections, sessionContext}`-shaped payloads, so the "explicit field
  allowlist, structurally excluded rather than filtered" requirement was
  already true by construction for every Surface A–H module (confirmed by
  grep: the only `.dob` reference anywhere under `src/prompts/` is inside
  `getAge()`, which reads it only to compute age and never returns or sends
  it). Tab05 and Tab10 were also already fixed to `{userId}` during A-09.
  This item's real remaining work was auditing every other AI call site.
  - **Found and fixed a genuine identity leak the audit exists to catch:**
    `companionAI.js`'s `buildRecordSystem()` — the shared system-prompt
    builder for the companion app's AI Lite chat, Quick Log symptom prompts,
    and visit summarization — spliced the patient's real name
    (`mi_profile_personal.name`) directly into the system prompt sent to
    Claude: `"You are Insina, a personal health assistant for ${p.name}..."`.
    Because three call sites shared this one function
    (`companionAI.js` itself, `AILite.jsx`'s `system: buildRecordSystem()`,
    and `visitCapture.js`'s `summarizeVisit()` — which inlined the *entire*
    returned string, name included, into the AI *message content*, not just
    the system field, an even more easily-missed leak), one fix at the
    source closes all three. `buildRecordSystem()` now uses `getUserId()`
    the same way Tab05/10/11 do.
  - Audited every other AI-calling file (Tab09, Tab12, Tab14,
    `Log.jsx`, `VisitFlow.jsx`) for the same pattern: none read
    `mi_profile_personal`/`mi_profile_insurance` or any prohibited field
    into a prompt. The many other `mi_profile_personal` reads found
    throughout the app (App.jsx, Dashboard.jsx, Tab04/05/06/07/11/13) are
    all UI display of the patient's own data on their own device — sidebar
    labels, greetings, avatar initials, the local backup/export JSON — none
    reach an AI call.
  - Verified: `npm run build` passes. Manual trace of both fixed call sites
    confirms `buildRecordSystem()`'s output no longer contains any
    `mi_profile_personal` field.
- **A-01 / PG-09:** Deterministic tripwire engine. New `src/lib/tripwire.js`
  evaluates labs against effective thresholds and produces the evaluation
  envelope (`status`, `evaluatedAt`, `newestLabDate`, `flags[]`) that
  `INSINA_AI_PROMPTS.md` §6 defines for `{tripwireFlags}` — this is the only
  thing that classifies urgency (CSC rule 4); the AI echoes, never
  originates. New `src/config/tripwireDefaults.js`: the generalized default
  threshold library, replacing `urgencyThresholds.js`'s old
  `URGENCY_THRESHOLDS`/`getUrgencyLevel` (deleted — hardcoded to one
  patient's transplant context and, per that file's own prior "Why," already
  consumed by nothing; `CONSENT_VERSION` is all that remains in that file,
  an unrelated AI-consent-versioning export). Precedence: provider custom
  range (abnormal tier) then reviewed default library (urgent tier); a
  "user-confirmed" tier is structurally present per spec but a no-op until a
  future item adds a store for it.
  - **Threshold numbers (DEC-026):** rather than pick clinically significant
    panic values unilaterally, Greg was asked directly. v1 seeds six
    genuinely diagnosis-agnostic analytes only — Potassium, Sodium, Glucose,
    Hemoglobin, Platelets, WBC — sourced from widely published clinical
    critical-value conventions, urgent tier only. Ships `reviewedBy: null`,
    gated by the same `mi_allow_unreviewed_modules` flag as A-06's condition
    modules: zero urgent flags for any user, including Greg, until reviewed
    and approved. Transplant/tacrolimus-specific content from the old file
    is deliberately left out of v1 (OPEN-10).
  - **Envelope status (DEC-026):** `getTripwireEnvelope()` reports
    `"unavailable"` — not spec's literal "current, no flags" — whenever the
    default library is unreviewed and no provider-custom ranges exist to
    evaluate instead, since "current, no flags" would otherwise read to CSC
    rule 4 (and therefore the patient) as a clean bill when almost nothing
    was actually checked. Status is always recomputed fresh against live
    `mi_labs` on read, never trusted from the stored envelope, so a lab that
    arrives without a re-run correctly shows `"stale"`.
  - **Hooks at import, sync, and manual entry** per spec's own instruction
    to reuse "the existing mi-data-synced event": `tripwire.js` registers a
    listener on that event once at module load (imported from `main.jsx` so
    it's always active app-wide), so any current or future `mi_labs` writer
    that already dispatches the event gets evaluation for free. Tab05's
    manual-entry and duplicate-merge write sites, which didn't dispatch it
    before, now do.
  - **Fixtures wired into prebuild:** new `scripts/testThresholds.mjs`
    (plain Node, no new test-framework dependency) — input values in,
    expected flag level/bound out, per §6's acceptance-test requirement.
    `package.json` gains `test:thresholds` and a `prebuild` script that
    runs it, so `npm run build` now fails on a fixture regression before
    Vite even starts. 19 fixture assertions across all six analytes,
    boundary values (exactly-at-threshold does not flag), and the review
    gate itself.
  - **`labDigest.js` (A-03) wired to real per-analyte status:** each digest
    line's `tripwireStatus` field, hardcoded `"unavailable"` since A-03
    shipped ahead of this engine, now reports the real per-analyte flag
    status when a `tripwireEnvelope` is passed in (optional parameter,
    backward compatible).
  - **UI surfacing (Tab05):** a dismissible urgent-flag banner (mirrors the
    existing duplicate-detection badge's visual pattern) and an always-
    visible evaluation-status line — "current," "stale — new results have
    arrived since the last check ran," or "not yet active (pending clinical
    review)" — so a stale or unavailable state is surfaced, never hidden,
    per spec. Dismissal is per-flag, keyed by analyte+date+value+bound, so a
    new qualifying result re-surfaces despite a prior dismissal (mirrors
    `patternFlags.js`'s existing dismissal convention).
  - Verified: `npm run build` passes (prebuild fixtures included). A
    standalone Node harness covering the full engine — envelope states
    (unavailable/stale/current), the review gate on and off, dismissal with
    re-surfacing on a new value, provider-custom-range flagging for an
    analyte with no library entry, and formatted output shape — 13/13
    checks passed. Live-verified in the browser: an urgent Potassium value
    correctly produces the banner and "current" status with the review
    flag on; removing the flag correctly clears the banner and switches the
    status line to "not yet active" without a false "all clear"; Dismiss
    correctly removes the banner.
- **A-05 / PG-07:** Killed the silent kidney→liver terminology rewrite.
  Tab11's prompt-build path used to `.replace()` "kidney transplant," "renal
  transplant," and "LDKT" with "liver transplant"/"LDLT" wherever they
  appeared in surgical history, unconditionally and invisibly — a real RIE
  flag-don't-fix violation that would have corrupted the record of any
  pilot user whose transplant history genuinely differs. Deleted outright;
  patient-entered text now reaches the AI prompt verbatim.
  - Replacement: `src/rie/consistencyChecks.js` gains
    `checkTransplantTerminology()` — flags a surgical entry mentioning a
    transplant of one organ (liver, kidney, heart, lung, pancreas, matching
    both full names and the LDLT/LDKT abbreviations) when the condition
    list shows a transplant of a different organ, with a suggested
    correction. Nothing changes automatically: the existing Review Queue
    "Fix Now" flow (`engine.js`'s `applyFix()`, already built and used by
    the medical-dictionary checks) writes the confirmed value back to
    `mi_surgeries` only once the patient confirms, and that confirmed value
    is what both the UI and every prompt see from then on — exactly the
    flag → confirm-once → store pattern the spec calls for.
  - Verified: `npm run build` passes. A standalone Node harness confirmed
    the check reproduces the exact prior-behavior case (kidney/LDKT →
    liver/LDLT, capitalization preserved) as a suggested fix rather than an
    automatic rewrite; matches on "renal transplant" wording; produces no
    finding when the surgical and condition organs already agree, when no
    transplant condition is on file to compare against, or for a
    non-transplant procedure that happens to mention an organ (e.g. "kidney
    biopsy"); and flags only the mismatched entry among several surgeries.
- **A-06 / PG-06:** Condition-module loader. New
  `src/prompts/modules/MOD-IMMUNOSUPPRESSION.js`: the worked example from
  `INSINA_AI_PROMPTS.md` §5.5, copied verbatim into `content` fields
  (medication cautions, food and supplements, monitoring norms, procedure
  flags), `reviewed_by: null` (pending clinical review per PG-11). New
  `src/lib/conditionModules.js`: `selectConditionModules()` deterministically
  matches every module's `applies_when` (condition-name and medication-class
  regex matchers) against `{conditionsActive}` and active `{medicationsActive}`,
  excludes any module with `reviewed_by === null` unless the local
  `mi_allow_unreviewed_modules` flag is set (unset by default — no pilot user
  ever sees unreviewed content; Greg can preview it on his own device via
  devtools), caps at 4 matches ordered condition-hit before medication-only
  hit. `formatConditionModules()` renders matches under the CONDITION
  REFERENCE header from §5.3 with source citation (module id + version).
  - **This is the replacement A-09 named but didn't build yet:** A-09's
    CHANGELOG entry noted the old hardcoded NSAID/Tacrolimus/diet/infection
    block was deleted because "condition-specific reference content is
    A-06's conditionModules mechanism, not a block injected for every
    patient regardless of diagnosis" — this item is that mechanism. Wired
    into Tab11 (Surface A) and Tab05's Full Analysis (Surface B1), both of
    which list `{conditionModules}` in their spec'd payload; not wired into
    Tab05's Lab Q&A (B2) or Tab10 (Surface C), since neither surface's own
    payload list in §7 includes `{conditionModules}`.
  - Because the only authored module today is unreviewed, this ships inert
    for every pilot user by default — correct per spec, not a bug. It
    becomes live the moment `reviewed_by` is set on a clinically reviewed
    module.
  - Verified: `npm run build` passes. A standalone Node harness confirmed:
    the unreviewed module is excluded by default; setting
    `mi_allow_unreviewed_modules` makes it selectable; a medication-only
    match fires (condition list incomplete, drug reveals context, per §5.3
    point 1's own stated rationale); an unrelated condition/medication pair
    matches nothing; formatted output carries the correct source citation
    and header; an empty selection formats to an empty string rather than a
    dangling header; removing the flag reverts to exclusion.
- **A-03 v1:** Lab digest builder. New `src/lib/labDigest.js`:
  `buildLabDigestData()` groups labs by normalized raw name (trim, lowercase
  — A-04 upgrades this to canonical IDs with alias merging in Phase 2) into a
  12-month-window digest per analyte (last 6 values with dates, window min
  and max, a computed trend — first value, last value, direction, draw
  count — latest delta, unit, reference range, provider custom range, and a
  `tripwireStatus` field that reads "unavailable" until A-01 lands);
  `formatLabDigest()` renders it as the compact text block for `{labDigest}`;
  `formatLabsWindow()` renders full-detail rows for the last 60 days for
  `{labsWindow}`. `windowDays` is a parameter (default 365), so the same
  function serves the 24-month Advanced-mode `{labsExtended}` digest once a
  caller wires that trigger — not done in this item, since the master
  prompt's A-03 v1 instruction names only `{labDigest}` and `{labsWindow}`.
  - **Wired into Tab11 and Tab05**, replacing the two defects A-03 exists to
    fix: Tab11 no longer ships the complete lab history (thousands of
    entries) into the AI Analysis chat prompt; Tab05's Full Analysis and Lab
    Q&A no longer send only the most recent value per test (trend-blind,
    which defeated the product's own trend-detection framing). Tab11's
    condition-linked personalized-range reminder (flag a lab whose
    condition may warrant an individual target range when none is on file)
    is preserved, now driven by the digest's per-analyte flag data instead
    of the old full-history dump.
  - **Deviation:** the spec calls for the provider custom range to carry
    "its set date"; `mi_lab_custom_ranges` doesn't currently record when a
    range was set (Tab05's `saveCustomRange` only ever stored `{low, high}`).
    Added the field to the digest output as `null` rather than fabricating a
    date — the schema change to actually capture it is outside this item's
    named scope (new `labDigest.js` + payload builders, not the custom-range
    save UI).
  - Verified: `npm run build` passes. A standalone Node harness against
    synthetic labs confirmed: name-normalization merges case/whitespace
    variants into one analyte; the 12-month window correctly excludes an
    older draw from window min/max and trend while still counting it out of
    the digest; trend direction and latest delta compute correctly across 3
    draws; a provider custom range overrides the lab reference range; a
    non-numeric result (e.g. blood type) is handled without crashing and
    reports "insufficient data" for trend rather than a bogus number; empty
    input produces the documented placeholder text for both formatters.
- **A-09 / PG-06:** Prompts as code. New `src/prompts/` module: `core.js`
  holds the Clinical Safety Core (CSC v1.1, `CSC_VERSION` exported, the 14
  HARD RULES copied verbatim from `INSINA_AI_PROMPTS.md` §3), the shared
  FORMATTING and ROUTING blocks, and `assembleSystem()` which every builder
  composes through. `identity.js` is the minimal identity helper the
  builders need now (`getUserId`/`getAge`/`getSex`/`getIdentity`) — a stable
  pseudonymous ID plus computed age, never DOB; the full identity-audit pass
  against §2's complete allowlist is P-01, next. One builder module per
  Surface A–H (`surfaceA.js`.. `surfaceH.js`), each exporting a
  `PROMPT_VERSION` and a `build*(payload) => { system, promptVersion }`
  matching its section-7 spec (delta text, injection variables, CSC +
  optional display/routing blocks).
  - New `core.js` export `TRIPWIRE_UNAVAILABLE`: a standard envelope-status
    note every dataSections builder prepends until A-01 (the deterministic
    tripwire engine) exists. Without it, CSC rule 4 has nothing telling the
    model whether an unflagged value means "checked, no flag" or "never
    checked" — silence would let the model guess, which rule 4 forbids.
  - **Wired into consumers:** Tab11 (Surface A, both the streaming-chat and
    conversation-summary calls), Tab05 (Surface B1 Full Analysis, B2 Lab
    Q&A), Tab10 (Surface C Note summary). Each tab's inline
    `buildSystemPrompt`/system-string code is replaced by a lean
    `buildDataSections()`-style helper (record-data assembly only) feeding
    the shared builder. This deletes every hardcoded patient-specific
    clinical fact that stood in as a "no data yet" fallback (real diagnoses,
    medications, doctors' names, an entire unconditional NSAID/Tacrolimus/diet
    /infection-risk reference block) — CSC rule 7 (data fidelity) prohibits
    presenting fabricated defaults as record data, and condition-specific
    reference content is A-06's conditionModules mechanism, not a block
    injected for every patient regardless of diagnosis. Tab05's Full Analysis
    and Lab Q&A also stop sending the patient's real name (`mi_profile_personal
    .name`) — CSC rule 12 — using the pseudonymous `{userId}` instead, same as
    Tab10's A-02-era fix and Tab11's pre-existing pattern.
  - **Deviations reported, not silently taken:** Surface D (document
    extraction) and Surface E (Vision OCR) are built exactly to spec but not
    wired into Tab09/Tab12's extraction calls or the proxy's OCR prompt —
    those call sites' existing output schemas feed Documents/Labs/Findings
    record creation directly, and migrating them is a data-model change
    across multiple tabs, larger than "prompts as code." Surface H (report
    generation) is built to spec's deterministic-template-plus-annotation
    architecture, but Tab14's Consultation Prep currently generates the whole
    report as AI free text with no template layer to annotate — same
    reasoning. Surface F (companion visit summary) has a real candidate
    consumer, `visitCapture.js`'s `summarizeVisit()`, but it returns
    structured JSON that `confirmMedChange()` and the action-item UI parse —
    a different output contract than F's markdown-narrative spec. Surface G
    (symptom preparation) has no consumer at all yet; no symptom-prep screen
    exists in the companion app. All four modules exist, are correct to
    spec, and are ready for their consumers once those larger changes land.
    The kidney-to-liver rewrite regex in Tab11's surgical-history formatting
    is carried over unchanged into `buildDataSections()` — A-05/PG-07 is the
    tracked item to remove it, not this one.
  - Verified: `npm run build` passes. A standalone Node harness (localStorage
    polyfill, no app runtime) exercised all 9 builders plus `getIdentity()`'s
    stability across repeated calls and its `P-XXXXXXXXXXXXXXXX` ID format —
    11/11 checks passed.
- **S-05 item 3 / PG-04:** Pilot bearer tokens. The client now always attaches
  `Authorization: Bearer <token>` (via `aiClient.js`'s `getAuthHeaders()`, wired
  up now that A-02 gives it one place to do so) whenever a pilot token is
  stored. New `src/lib/pilotAuth.js` (`getPilotToken`/`setPilotToken`) —
  stored the same way `mi_ak` is today, moving inside the encrypted store once
  P-02 lands, per spec. New **Settings & Backup → Pilot access token** field +
  modal (mirrors the existing API-key entry pattern) so an invited pilot user
  can paste in the token they were given.
  - Proxy: `proxy/server.js` gains a `pilotAuth` middleware on both
    `/api/chat` and `/api/extract-pdf`, checking the header against
    `PILOT_TOKENS` (comma-separated, one per invited user) — but **only when
    `PILOT_AUTH_ENFORCED=true`**, which is unset by default. With no tokens
    issued and enforcement off, today's founder-only usage is completely
    unaffected — verified via an isolated middleware test across 7 cases:
    enforcement off always passes regardless of header; enforcement on
    correctly 401s a missing, wrong, or malformed-header token; a valid token
    (including one with stray whitespace from a copy-paste) passes; removing
    a token from `PILOT_TOKENS` correctly revokes it on the next request.
  - Deploy order documented in `proxy/DEPLOY.md`: client support ships first
    (this release), tokens get issued and pilot users enter theirs, **only
    then** is `PILOT_AUTH_ENFORCED` flipped on — otherwise an already-deployed
    client without a token would get locked out the moment enforcement turns
    on. **HUMAN, when ready for pilot users:** generate tokens, set
    `PILOT_TOKENS` and `PILOT_AUTH_ENFORCED=true` on Render.
- **A-02 / PG-08:** Unified AI client and model map. New `src/lib/aiClient.js`:
  every AI surface now calls one `callAI({ surface, mode, system, messages,
  stream, signal })`, which resolves the model from a single `MODEL_MAP`
  (`standard` → claude-sonnet-4-6, `advanced` → claude-opus-4-6, `extraction` →
  sonnet, `lite` → claude-haiku-4-5 — the companion's pre-existing cheap tier,
  now centralized rather than independently declared) and a per-surface
  `SURFACE_MAX_TOKENS` table (values promoted from what each site already
  used — not new numbers), clamped to the proxy's 4096 ceiling. Ported all 7
  files that made AI calls: Tab05 (Full Analysis, Lab Q&A), Tab09 (document
  summarize/findings, Vision extraction — via a new `extractPdfVision()` on the
  same module so both proxy routes share one place to attach auth), Tab10,
  Tab11 (main streaming chat, conversation summary), Tab12, Tab14, and
  `companionAI.js`. Two files weren't in the master prompt's shorthand list of
  four but had their own AI call sites and needed the same port: **Tab14**
  (Consultation Prep) and **companionAI.js** (the companion's own chat
  functions) — noted as the delta between the spec's example list and what
  "port every surface" actually required.
  - **Fixes PG-08's headline defect:** Tab10 (Notes AI summary) called
    `api.anthropic.com` directly with a stale model string
    (`claude-sonnet-4-20250514`, not on the proxy's allowlist) and the
    patient's real name in the prompt. Now routes through the proxy like every
    other surface. The full identity-minimization pass is P-01 (next); this
    port includes the minimal fix — a generic condition-context line instead
    of the patient's name — since PG-08's own rationale names the identity
    leak as one of Tab10's three defects, not a P-01-only concern.
  - **Deletes Tab12's fallback to a direct Anthropic call on a proxy 429**
    (using the BYO key from `mi_ak`). Per A-10 (settled): A-02 is what makes
    the BYO-key half-implementation dormant through the pilot. Every surface
    now targets the proxy only; nothing in the app calls `api.anthropic.com`
    directly anymore (verified — see below).
  - Bearer-token attachment point (`getAuthHeaders()`) is a documented stub
    returning `{}` for now — the "one place" S-05 item 3 fills in without
    touching every call site again, per that item's own dependency note.
  - Each surface keeps its own response-status handling (503 cold-start copy,
    413 payload-too-large copy, etc.) — `callAI()` returns the raw `Response`,
    same as the `fetch()` calls it replaces, so no surface's tailored error
    copy needed rewriting; only the model string, token ceiling, and target
    URL were centralized, which is what had actually drifted.
  - Verified: `npm run build` passes; a full-repo sweep confirms zero
    remaining `api.anthropic.com` calls (only explanatory comments mention the
    string), exactly one `PROXY_URL` declaration left in the whole `src/`
    tree (inside `aiClient.js` itself), and all 7 ported files import the
    shared client.
- **A-08:** Schema versioning and migration rails. New `src/lib/migrations.js`:
  an ordered, idempotent migration list gated by `mi_schema_version`, run once
  synchronously at boot (`main.jsx`, before either the full app or companion
  renders — both share the same `mi_*` record). Each migration logs to the RIE
  audit log (`mi_rie_audit`, Drive-synced). A migration may be flagged `major`
  (CHANGELOG's own MAJOR definition — breaking changes to how data is stored):
  before it runs, an automatic JSON export of the full record downloads as a
  safety-net backup, and an `mi_migration_interrupted` flag is set for the
  duration so a crash mid-migration is detected and retried on the next boot
  rather than silently skipped. A failed migration halts the chain — no later
  migration is applied out of order over a failure. Twenty-plus prior releases
  evolved the stores with no recorded version; migration v1 here is a no-op
  version stamp establishing the baseline, not a retroactive migration of that
  undocumented history. **P-02 (vault encryption)** and **A-07 (binary blob
  move, Phase 2)** are the first real migrations to land on these rails.
- Verified: fresh-install stamping, no-op on an already-migrated boot, and the
  full major-migration lifecycle (backup trigger, interrupted-flag set/clear,
  failure-halts-the-chain, and correct retry-in-order on the next boot) all
  confirmed against the actual runner logic.

---

## v1.24.0 — 2026-07-11 (Phase 0: pilot security hardening — in progress)

### Security
- **S-01 / PG-01 (DEC-014):** Removed the committed credential file
  (`GitHub Token.docx`) from the working tree and purged it from all git history
  with `git filter-repo`; the exposed token was revoked first. Added `*.docx`,
  `.claude/`, and `.env*` to `.gitignore` and untracked local Claude settings.
  Public history is force-pushed as part of this item; existing clones must be
  re-cloned.
- **S-05 items 1-2 / PG-04 (DEC-015):** Proxy rate limiting is now enforced —
  the limiter's disable switch is removed. `/api/chat` is capped at 60 requests
  per IP per hour; `/api/extract-pdf` (Vision OCR, the expensive route) gets its
  own 20/hour cap. Backstop is a hard monthly spend cap in the Anthropic console
  (HUMAN). Per-pilot-user bearer tokens are Phase 1 (S-05 item 3).
- **S-02 / PG-02:** AI-generated text is now escaped before it becomes HTML,
  everywhere in the app. Uploaded documents can be OCR'd and quoted back by the
  AI; without escaping, an embedded tag in that echoed content would execute in
  the app's origin (full record, PIN hash). Added a single shared module,
  `src/lib/renderAiText.js` (escape `&<>"'` first, then apply `**bold**` /
  `-----` transforms), and ported every AI-text-to-HTML renderer to it — the
  duplicated `answerToHTML`/`applyBold` in Tab05.jsx and Tab11.jsx (both the
  print-window builders and the on-screen chat renderers), plus a third,
  independently-drifted copy in Tab14.jsx's Consultation Prep printout that had
  a real gap (escaping was applied only on its fallback text branch, not on
  bullets/numbered items/headers). No other function in the codebase builds
  HTML from AI output. Verified with a Node script: a malicious payload
  (`<img onerror>`, `<script>`) is neutralized by the new renderer while the
  reconstructed old renderer is shown passing it through unescaped; benign AI
  responses render visually identical (HTML-entity-encoded apostrophes/quotes
  display the same as the raw characters — required by the fix, not a
  regression).
- **S-04 / PG-03:** pdf.js is now bundled, not fetched from a CDN at runtime.
  The spec named one call site (Tab12); the current code had **five**, across
  four files — Tab09 (text extraction + the Vision-OCR page renderer), Tab11
  (reference-doc upload), Tab12 (Import Records), and Tab14 (post-visit
  capture) — all dynamically importing pdf.js 4.4.168 from cdnjs while
  `pdfjs-dist@5.5` sat unused in package.json. Added `src/lib/pdfjs.js`, a
  shared lazy loader (Vite code-splits it, so the main bundle is unchanged and
  pdf.js still loads only when a PDF is parsed) with the worker bundled via
  Vite's `?url` asset import. All five sites ported; every CDN URL deleted.
  Verified: build emits `pdf-*.js` chunk + `pdf.worker.min-*.mjs` asset, zero
  cdnjs references in the built output, and the v5 API surface used by all
  call sites (`getDocument`, `getTextContent`, `getViewport`,
  `render({canvasContext})`) confirmed present in the installed package.
- **S-03 / PG-05:** Added a Content-Security-Policy meta tag to both entry
  points (`index.html` and `companion/index.html`) — GitHub Pages cannot set
  response headers, so the meta tag is the enforcement point. Policy:
  `script-src 'self'` + accounts.google.com (Google Identity), style/font
  allowances for Google Fonts, `img-src` adds `data:`/`blob:` (card photos)
  and `*.googleusercontent.com` (profile photo), `connect-src` limited to the
  proxy, www.googleapis.com (Drive/Calendar), accounts.google.com,
  api.anthropic.com (BYO-key fallback — comes out when A-02 lands), and
  clinicaltables.nlm.nih.gov (ICD-10 lookup); `object-src 'none'`,
  `base-uri 'self'`, `worker-src 'self' blob:`. The two inline scripts in the
  HTML (companion-manifest swap, service-worker registration) moved to
  self-hosted files so `script-src` needs no `'unsafe-inline'`;
  `style-src 'unsafe-inline'` stays as accepted debt (inline styles are
  pervasive). The tag is stripped during `npm run dev` only (vite.config.js
  hook) because the React dev plugin injects an inline refresh preamble;
  production builds ship it untouched. Verified: both built HTMLs carry
  exactly one enforcing tag and zero inline scripts; live checks of fonts,
  Google sign-in, Drive sync, and AI streaming ride the Phase 0 manual test
  list.
- **S-06:** Secrets hygiene going forward. Pre-commit secret scanning
  (gitleaks) is documented as a standing rule in CLAUDE.md; the repo-visibility
  question (public vs private) is logged in DECISIONS.md as **OPEN-8** for
  Greg to answer — recorded choice, not a default. Re-verified no PHI in
  tracked files (only the public GitHub username in deploy URLs and one
  cosmetic form placeholder, flagged for the Phase 1 de-personalization pass).
  HUMAN actions: install gitleaks locally and enable GitHub push protection on
  the repo.

### Changed
- **A-14:** Home-button parity. Medications, Labs & Trends, Vitals, and
  Symptoms — the four tabs that render their own topbar — now carry the same
  Home button (house icon + label, top-left) the shared topbar gained in
  v1.23.0, byte-for-byte the same implementation and placement. It replaces
  those tabs' older "‹ Dashboard" chevron, exactly as the shared topbar's
  Home button replaced it there, so the navigation affordance is uniform
  across every tab. No restyling; no new shared component (the source pattern
  is inline, per spec).

---


## v1.21.0 — 2026-07-01

### Changed — Appointments post-visit capture
- **Capture happens inline — no more tab-hopping.** The "Visit complete" prompt
  shown on **Mark Complete** no longer bounces you to other tabs. Each row now
  expands into a small capture form right in the prompt:
  - **Clinical notes / documents** and **Lab results** — a file picker. Images are
    compressed to a data URL via `compressImage`; text-PDFs have their text pulled
    in automatically. Both save to your Documents (labs filed under the *lab*
    category).
  - **New condition / diagnosis** — name, status, and diagnosed date (pre-filled
    from the visit); saves to Conditions and refreshes the active-conditions
    summary.
  - **New or changed medication** — name, dose, and frequency; saves to
    Medications with the prescriber pre-filled from the appointment.
  - **Imaging study** — type and body part (plus an optional compressed image);
    facility and date pre-fill from the visit.
- **Everything auto-attaches to the appointment.** Whatever you capture is written
  to the right record store **and** immediately linked to the appointment's
  **Records & Documents** section — one prompt for the whole visit, still no
  per-item juggling.
- **Open tabs and the Record Integrity Engine re-read** after each capture
  (`mi-data-synced`), and oversized images surface a friendly "storage is full"
  message instead of failing silently.

---

## v1.20.0 — 2026-06-29

### Added / Changed — Appointments
- **Directions link.** An appointment's expanded detail now shows a 🧭 Directions
  link (built from its facility + address) that opens Google Maps.
- **Calendar events come in for review, not auto-added.** Google Calendar sync
  (manual and the daily auto-sync) now brings events in as **Suggested** rather
  than dropping them straight onto your schedule. The tab switches to the
  Suggested filter with a count so you can **edit to fill gaps, then Confirm or
  Dismiss** each one. Nothing hits your real schedule until you accept it — fixes
  incomplete calendar entries silently becoming appointments.
- **Post-visit capture on Mark Complete.** Marking an appointment complete now
  opens one prompt (not a prompt per item) to capture anything from the visit —
  clinical notes/documents, labs, new conditions, new/changed meds, imaging —
  each with a jump button to the right place. Add what applies, then attach it to
  the appointment from its Records & Documents section.

---

## v1.19.0 — 2026-06-29

### Added — RIE Report Preflight
- **Reports are now integrity-checked before they generate.** Printing the
  Patient Profile, a Consultation Prep, the Medication reports, or the Lab report
  first runs a preflight scan (full-record consistency + spelling **plus**
  report-specific critical checks). If anything is found, a modal shows three
  sections — **Critical / Warnings / Suggested cleanup** — each with Fix Now,
  Ignore This Time, and Dismiss, plus an Apply-safe-fixes batch.
- **Critical issues block generation** until fixed or explicitly overridden;
  **Override & Generate** is recorded in the audit log. If the record is clean,
  the report generates immediately with no interruption.
- Report-specific criticals per the spec, e.g. Consultation Prep flags missing
  transplant/immunosuppression status, an empty allergy list, or a missing
  platelet count; the Profile flags missing insurance.

### Notes
- This is the "spell-check shared documents at generate time" path — the preflight
  scan includes the medical-dictionary/spelling findings, so misspellings surface
  before a document is printed or shared.

---

## v1.18.1 — 2026-06-29

### Fixed
- **"Server error 413" on AI analysis with a rich record.** The AI proxy's
  `/api/chat` body limit was 256 KB, but a full record (all labs/vitals/meds plus
  uploaded reference documents) exceeds it, so the proxy rejected the request
  before it reached Claude — whose context window is far larger. Raised the proxy
  limit to 1 MB, added a total-text cap (~120 KB) across all reference documents
  so a large document library can't blow the payload, and replaced the cryptic
  "Server error 413" with a clear message pointing at reference-doc context.
  **Requires the Render proxy to redeploy** (auto-deploys on push).

---

## v1.18.0 — 2026-06-29

### Added — Record Integrity Engine (Phase 1)
- **A client-side data-quality engine** (`src/rie/`) that scans your record for
  problems and surfaces them in a **Review Queue** before they reach reports or
  AI analysis. Nothing leaves your device; nothing is changed without your
  confirmation.
- **Five consistency-check categories** across your `mi_*` data: medications
  (missing dose/frequency/prescriber/refill, duplicate active meds by generic),
  labs (missing unit/range, impossible/future dates, duplicates, same test under
  two names), providers/contacts (appointment missing provider/location, care-team
  spelling mismatches, duplicate emergency contacts), conditions/allergies
  (missing status/onset, duplicate allergy, allergy-vs-active-med conflict), and
  documents (procedure missing date/facility, garbled imported text).
- **Medical dictionary** seeded from your own record plus a curated base list of
  common misspellings (e.g. "Trazedone" → Trazodone). Surfaced in the queue with
  a Confirm-style **Fix Now** — medication names are never auto-corrected or
  batch-fixed.
- **Review Queue** — a floating button with a Critical+Warning count badge, on
  every tab. Each finding shows a severity badge, the issue, a before→after diff
  where applicable, and **Fix Now / Ignore This Time / Dismiss Permanently**, plus
  an **Apply Safe Fixes** batch (never medication names or Critical items) and a
  manual **Re-scan**.
- **Audit log** of every action, and **permanent dismissals**, stored under `mi_`
  keys so they ride Google Drive sync; "ignore this time" stays session-local.

### Deferred (next phases)
- Live as-you-type spell squiggles, the English (nspell) dictionary, report/print
  **preflight** blocking, and the AI-context completeness panel. The engine is
  structured so a "spell-check shared documents at print/share time" preflight
  drops in next.

---

## v1.17.1 — 2026-06-28

### Fixed
- **Out-of-range now uses your doctor's range first.** When a lab has a custom
  doctor's range set, the in/out-of-range status (the colored value, the "OUT OF
  RANGE" badge, the list dots, the flagged count and filter, the printed report,
  and the AI summaries) is now based on **your doctor's range**, falling back to
  the lab report's printed range only when no doctor's range is set. Previously
  the range *bar* honored the doctor's range but the status flags did not — so a
  value like Tacrolimus that's within your doctor's target but outside the lab's
  generic range was wrongly shown as out of range. Both ranges are still displayed
  for reference.

---

## v1.17.0 — 2026-06-28

### Added — reorder lab groups on the tab
- **Reorder lab groups right on the Labs & Trends tab.** A "⠿ Reorder Groups"
  button reveals a panel where you **drag** groups (or use up/down arrows) into
  the order you want. The on-screen list reorders live and the **printout follows
  the same order**.
- The order is remembered until you change it again — freely re-arrangeable per
  appointment. It writes the same `mi_lab_category_order` used by the printout and
  the Settings → Lab Category Order panel, so all three stay in sync.

---

## v1.16.0 — 2026-06-28

### Fixed
- **Adding a second insurance card (or the back of a card) now works.** The card
  uploader was defined inside the modal, so React remounted the hidden file input
  on every keystroke/pick and the second image got dropped. The uploader is now a
  stable top-level component using a ref — both sides and multiple cards load
  reliably.

### Added
- **Insurance/ID cards print on the Profile report.** Selected cards are added at
  the end of the printed profile (front & back images). When you have more than
  one card, **Print Profile** first asks which card(s) to include; with a single
  card it just prints it.
- **"Refilled" button on each medication row.** The main Medications list now has
  a quick **Refilled** action per row that advances the refill date by the days
  supply (same as Complete Refill in the detail) — no need to open the med first.
  It briefly confirms with "✓ Refilled".

---

## v1.15.0 — 2026-06-28

### Added — records tied to appointments
- **Each appointment now has a "Records & Documents" section** in its expanded
  detail. Link uploaded documents, imaging studies, and notes to a visit, and the
  AI **Consultation Prep** generated for that visit shows there automatically
  (with a ⎙ View to reprint it).
- **+ Attach** opens a picker that lists your documents, imaging, and notes —
  with a **Suggested** group at the top for items that match the visit by date or
  provider (manual selection + auto-suggest in one). Detach with the ✕.
- **↗ Open** jumps to where a linked record lives (Documents, Profile imaging, or
  Notes). Attachments are stored on the appointment and sync via Drive.

---

## v1.14.0 — 2026-06-28

### Added — Insurance & ID cards
- **Photograph and store insurance/ID cards on both apps.** Capture the **front
  and back** of a card; add as many cards as you like (primary + secondary
  insurance, pharmacy, dental, etc.) with the **+ Add** button.
- Cards are stored in your record (`mi_cards`) and ride the existing Drive sync,
  so a card added on the phone appears on the web app and vice-versa.
- **View full-screen** to show at a check-in desk, flip between front/back, and a
  **Share / Send** button that uses the phone's share sheet (or downloads on
  desktop) to send a card to a provider or family member.
- Full app: Profile → "Insurance & ID Cards". Companion: Today → "Insurance
  cards". Photos are auto-compressed so they stay small.

---

## v1.13.2 — 2026-06-28

### Changed
- **The Vitals tab now refreshes live when a sync arrives.** Previously, if you
  were already on the Vitals tab when a phone-logged reading synced in, it
  wouldn't show until you navigated away and back. A Drive pull now broadcasts a
  "data synced" event and the Vitals tab re-reads immediately.

---

## v1.13.1 — 2026-06-28

### Fixed
- **Vitals (and other data) logged on the phone companion now appear on the web
  app automatically.** The desktop only pulled from Drive when you clicked Sync;
  its background task uploaded but never downloaded. It now auto-pulls from Drive
  on open and whenever you return to the tab — matching the companion — so a
  reading logged on the phone shows up without a manual sync.
- **Profile → Latest Vitals now shows Blood Pressure and Heart Rate.** The card
  read `systolic/diastolic/pulse`, but readings are stored as `bp_s/bp_d/hr`, so
  BP and HR were always blank. Now reads the correct fields (with fallback for any
  legacy data).

---

## v1.13.0 — 2026-06-27

### Added — shared consultation prep (web ⇄ companion)
- **The companion now shows the same visit-specific Consultation Prep as the web
  app, instead of a generic template.** Prep is generated once per appointment
  (Claude Sonnet) from that appointment's details plus your conditions and meds,
  and **saved into your record** keyed by appointment id, so it syncs over Google
  Drive between the web app and the phone.
  - Generate it on the **web app** → it appears on the **companion** after the next
    sync (no rebuild).
  - Open a visit's brief on the **companion** with no prep yet → the companion
    generates it and saves it back, so the **web app** then has it too.
  - A **Regenerate** button refreshes it; if the appointment's details change, both
    apps flag the saved prep as stale.
  - Offline with nothing cached, the brief falls back to a few record-grounded
    questions so it's never empty.

### Notes
- Requires Google sign-in on both surfaces (Drive is the sync transport) and the
  proxy to be reachable for generation. Prep propagates on the next sync, not
  instantly.

---

## v1.12.0 — 2026-06-27

### Added — web app Vitals
- **"✦ Ask AI" on the Vitals tab.** The Vitals tab had no AI hand-off; each vital's
  detail header now has an Ask AI button that sends the currently-viewed vital and
  its trend (over the selected time range) to AI Analysis, cross-referenced against
  medications, conditions, other vitals, and labs.

### Note
- Labs and Medications already have their own in-tab AI (Labs has "Full Analysis"
  plus a free-text question box; Medications has its own hand-off), so no
  redundant button was added there.

---

## v1.11.1 — 2026-06-27

### Changed — web app Symptoms
- **Each symptom row now has a clear "✦ Ask AI" button.** Previously you had to
  click the row to open the side panel to reach the AI hand-off, which was easy to
  miss (the severity number looked like the only target). The button sends the
  symptom straight to AI Analysis, cross-referencing it against your labs, vitals,
  and medications. The severity number and full side panel are unchanged.

---

## v1.11.0 — 2026-06-27

### Fixed — companion symptom logging
- **Saving a symptom now confirms it.** The companion Symptoms tab saved silently
  (no feedback), so it felt like nothing happened. It now shows a "✓ <symptom>
  saved — will sync to Drive" confirmation, matching the Vitals tab.

### Added
- **Ask Insina about a symptom.** Every logged symptom (and the just-saved
  confirmation) now has a **✦ Ask Insina about this** button that opens the AI tab
  and auto-sends a prompt cross-referencing that symptom against the patient's
  labs, vitals, and medications — bringing the companion in line with the web
  app's symptom → AI hand-off.

---

## v1.10.0 — 2026-06-26

### Added — companion improvements
- **Voice input.** A 🎤 mic on the AI box and Quick Log uses on-device speech
  recognition where available (Chrome/Android). On iPhone, every text field
  already accepts the keyboard's built-in dictation, so vitals, symptoms, and
  questions can all be spoken.
- **My Medications list.** A button on the Meds screen opens the full list with
  name, dose/frequency, and prescribing doctor (e.g. "Tacrolimus · 3 mg · twice
  daily · Dr. Zapata").
- **Surgeries & Procedures list**, reachable from Today (procedure, date, surgeon,
  facility, outcome).
- **Sign-in screen** now leads with a 2× larger logo.

### Changed
- **Meds tracking mode is now pick-once.** Instead of always showing all four
  options, you choose a mode once; afterward the screen shows just "Tracking:
  <mode> · Change". Added **per-dose-group reminder toggles** (morning / midday /
  evening), each independently on/off with its own time. Medication reminders moved
  off the Settings screen to the Meds screen; Settings keeps appointment and
  attention-alert toggles.
- **Appointment Prep shows only relevant safety flags.** The AI now selects the
  flags that matter for that visit's provider/specialty (always keeping
  life-critical ones), with a "Show all flags" toggle. Offline, it falls back to a
  deterministic specialty filter.

### Fixed
- **"Talk to Insina" no longer errors with "AI did not return JSON."** The
  structured-entry parse now forces valid JSON (assistant prefill) and retries
  before failing, with a friendly fallback message.
- **App fits the screen.** Fixed horizontal overflow and applied left/right
  safe-area insets so nothing sits off to the right on iPhone.
- **Back button everywhere.** A back control returns to the previous screen; from a
  main tab it returns to Today (useful since an installed PWA has no browser back).

---

## v1.9.0 — 2026-06-25

### Added
- **Per-conversation printing in AI Analysis.** The chat is now split into
  separate conversations on screen. A **＋ New Conversation** button (by the
  input) starts a fresh topic without clearing — earlier conversations stay
  visible above, each under its own header. Every conversation has its own two
  print buttons: **⎙ Transcript** (verbatim, instant) and **✦ Summary** (an
  AI-written brief of just that conversation).
- Each conversation also has its **own independent AI context** — starting a new
  conversation gives the AI a clean slate, so topics don't bleed together.

### Changed
- Removed the top "Print Summary" button (which summarized *everything*); printing
  is now per-conversation.
- The sidebar action is now **🗑 Clear All** (saves all conversations to Notes,
  then clears the screen).
- Pop-up-blocked fallback now applies to both transcript and summary prints.

---

## v1.8.3 — 2026-06-19

### Added
- **Companion sign-in screen.** A full-screen welcome now handles Google
  connection before the app, replacing the cramped top-bar "Sign in" button that
  sat under the iOS status bar and couldn't be tapped. Large Google sign-in button
  plus an optional "Continue without signing in" (capture still works offline).

### Fixed
- **Top bar hidden under the status bar / notch.** The app now respects
  `safe-area-inset-top`, so the sync bar and content clear the status bar and
  Dynamic Island.
- **Sign-in returns you to where you started.** The OAuth redirect now comes back
  to the launch path (e.g. `/companion/`) instead of always `/?companion=1`, so an
  installed standalone app stays in its own scope. **Requires** adding
  `https://insinahealth.com/companion/` to the Google OAuth client's Authorized
  redirect URIs.

---

## v1.8.2 — 2026-06-19

### Fixed
- **Companion home-screen icon still opened the full app (v1.8.1 follow-up).**
  Swapping only the manifest wasn't enough: both apps shared `scope: "/"`, so iOS
  couldn't tell the companion webclip apart from the already-installed full-app
  webclip and resolved to the full app (companion would flash, then the full app
  loaded). The companion now lives at its **own path and scope, `/companion/`**,
  with a distinct manifest `id` — so iOS installs it as a genuinely separate app.
  `src/main.jsx` routes the companion for `/companion/` (or the legacy
  `?companion=1`); the build now emits a second `/companion/` entry point.
  Bumped the service-worker cache (`insina-v4`) so devices drop the stale shell.

### Note
- New companion URL is **`insinahealth.com/companion/`** (the old `?companion=1`
  still works). Existing home-screen icons must be deleted and re-added once.

---

## v1.8.1 — 2026-06-19

### Fixed
- **Companion "Add to Home Screen" launched the full web app instead of the
  companion.** iOS reads the linked Web App Manifest's `start_url` when you add to
  the home screen, and the single manifest pointed at `/` (the full app). Added a
  dedicated companion manifest (`start_url: /?companion=1`) that is swapped in
  whenever the page is loaded in companion mode, so the home-screen icon now opens
  the companion. The full web app's icon is unchanged.

---

## v1.8.0 — 2026-06-19

### Added — Insina Health Mobile companion (`/?companion=1`)
A rebuilt mobile companion PWA following the principle **"Mobile captures, the web
app organizes."** Reads and writes the same Google-Drive-synced record as the web
app — one record, two front doors. Five-tab bottom navigation:

- **Today** — greeting + sync status, an at-a-glance row (next visit / labs /
  refills), the latest vital, and quick-capture buttons. Surfaces **proactive
  pattern flags** computed from the record (e.g. blood pressure drifting up across
  recent readings, a drug-level trough trending toward its low bound, a flagged lab
  moving further from range) — conservative and dismissible. Emergency Info and
  Notifications are one tap away.
- **Meds** — the daily screen, built for a large pill burden. Tracking **modes**
  (Reminders only / Quick confirm / Full logging / Off, default Quick); **whole-group
  one-tap confirmation** (morning / midday / evening) so a drug is named only when
  **flagging an exception** (skipped / late / reaction / as-needed). Refills surface
  at the top.
- **Log** — fast structured Vitals and Symptoms capture, plus **Quick Log / Talk to
  Insina**: say it in plain language and Insina drafts a structured entry you confirm
  before it's filed.
- **Care** — upcoming appointments with countdowns, provider, location + Maps
  directions, and the entry into Doctor Visit Capture; lists captured visits.
- **AI** — a lite, record-grounded assistant for quick questions on the go.

- **Doctor Visit Capture** — Pre-Visit Brief (safety flags, what's changed,
  suggested questions) → **Consent (cannot be skipped; Mississippi/Louisiana
  recording-law notice)** → a deliberately minimal During-Visit screen (record /
  pause / stop, timer, optional note, optional "mark moment") → AI summary
  (Discussed / Plan / When to call / Still open) → Action Items, where a detected
  **medication change must be explicitly confirmed** before the med list updates.
- **Emergency Info** — offline-first must-know status, meds, allergies, key labs,
  and care-team phone numbers; loads instantly to show an EMT or ER nurse.
- **Offline-first + notifications** — all capture works offline and queues a Drive
  sync via an outbox that drains when back online; three independently-switchable
  notification types (medication, appointment, attention alerts).

### Notes
- **Audio transcription is intentionally deferred** behind a clean interface — the
  Anthropic stack can't transcribe audio. Visits record, save, and summarize from
  manual notes today; full audio transcription will be wired to a provider later.
- Companion AI runs through the existing proxy (no client API key on the phone);
  `claude-haiku-4-5` was added to the proxy allow-list for cheap/short work. **The
  proxy must be redeployed** for companion AI to work in production.

---

## v1.7.1 — 2026-06-18

### Fixed
- **AI Print Summary no longer fails silently.** When the browser blocked the
  print pop-up, the button finished with no window and no file. It now (a) falls
  back to downloading the summary as an `.html` file to your Downloads folder,
  and (b) shows a clear on-screen message explaining what happened — whether the
  pop-up was blocked or the AI server was still waking up. (Note: the in-app
  button opens a print dialog / saves to Downloads; it does not write to the
  Insina Reports folder.)

---

## v1.7.0 — 2026-06-17

### Added
- **Inactivity auto-lock.** After a configurable idle period (default 30 minutes)
  Insina returns to the PIN lock screen. Because the app unmounts when locked, no
  data is visible behind the lock — you re-enter your PIN to resume. Activity
  (mouse, keyboard, scroll, touch) resets the timer; the setting lives in
  Settings & Backup → App Settings → "Auto-lock after inactivity" (Off / 5 / 10 /
  15 / 30 / 60 min) and re-arms immediately when changed.

### Notes
- The existing 4-digit PIN is unchanged. An alphanumeric **password** option and
  **two-step authentication** are planned for when other users keep their own
  data in Insina (deferred for now while the app is PIN-protected for testing and
  demos).

---

## v1.6.2 — 2026-06-17

### Added
- **Daily auto-sync (on open).** Once you've connected a calendar, Insina
  auto-syncs it the first time you open the Appointments tab each day, quietly in
  the background — it only shows a message when it actually adds appointments.
  Tracked via `mi_gcal_last_sync` (date), so it runs at most once per day whether
  triggered automatically or by the manual button. The connected-calendar line
  now notes "auto-syncs daily".
- Note: this runs when the app is open (browser-only app, no background server),
  so it catches you up on first open each day rather than at a fixed clock time.

---

## v1.6.1 — 2026-06-17

### Added
- **Calendar sync auto-fills from Care Team.** When a synced event's title ends
  with a doctor's name (convention: `… - Dr. Barclay`), Insina reads that name,
  matches it against your Care Team, and fills in any **blank** fields —
  specialty, phone, facility, address. Values already in the event are kept.
- The Care Team matcher is now shared between calendar sync and the Add
  Appointment form, and the form's auto-fill now also fills specialty.

---

## v1.6.0 — 2026-06-17

### Added
- **Google Calendar sync (one-way)** — a "⟳ Sync Google Calendar" button on the
  Appointments tab pulls events from a calendar you choose into your
  appointments. Reuses the existing Google sign-in (adds read-only Calendar
  permission). Pick your medical calendar the first time; the choice is
  remembered and can be changed. New events are matched on Google event id, then
  date + title, so re-syncing only adds genuinely new appointments — your edits
  are never overwritten. Event title → appointment title, start → date/time,
  location → address, description → notes.

### Setup required (one-time)
- The Calendar permission must be enabled on the app's Google OAuth consent
  screen, and you must be listed as a test user. Until then, sign-in will refuse
  the Calendar scope.

---

## v1.5.0 — 2026-06-17

This is the first formally versioned release. Everything below was built prior
to introducing version tracking; it is recorded here as the v1.5.0 baseline.

### Added
- **Versioning system** — semantic version sourced from `package.json`, shown in
  Settings & Backup → App version, with this changelog.
- **AI Analysis — fluid conversation & Print Summary** — the AI tab is now a
  continuous chat; a single **Print Summary** generates a structured one-to-two
  page brief (conversation summary, your questions, key findings, topics for your
  doctor, bottom line) instead of printing each response separately. Input box
  auto-expands vertically; New Conversation saves the transcript to Notes.
- **Imaging History** on the Profile tab — log MRI, CT, X-ray, and other studies
  with type, body part, facility, and date; included in the printed profile.
- **Vitals** — added Resting Heart Rate and Sleep to the inline entry form, plus
  auto-calculated **BMI** on both the Vitals tab and the Dashboard.
- **Care Team** — providers are now fully editable and deletable; checked
  physicians appear on the Dashboard styled like the Profile tab.
- **Medications** — Complete Refill / Complete Renewal buttons auto-calculate the
  next date; printable refill report sorted by pharmacy (due in ≤7 days, with Rx#).
- **Appointments** — auto-fills provider address from the Care Team; appointment
  notes flow into the Consultation Prep report and AI prompt; AI Appointment Prep
  pulls in relevant documents, conditions, and surgeries.
- **Custom lab reference ranges** with a dual-range bar and AI awareness.
- **Weekly backup infrastructure** and Google Drive sync.

### Fixed
- AI Appointment Prep no longer shows `Error: [object Object]` — the real error
  message from the API is now surfaced.
