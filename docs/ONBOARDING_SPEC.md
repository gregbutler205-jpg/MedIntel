# ONBOARDING_SPEC.md
Insina Health — User Onboarding Specification
Version 1.1 · July 15, 2026 · Status: Ready for Claude Code
v1.1 changes: onboarding adopts the app's dark design system (Greg's decision, supersedes v1.0 light-theme proposal); Tier 0 restored to include name and DOB; white shield logo in onboarding header.
Governs: onboarding flow, extraction pipeline (text + vision), staging queue, first-artifact engine, ongoing task engine, onboarding design tokens.
References: INSINA_AI_PROMPTS.md v2.4, DECISIONS_PILOT_AMENDMENT.md, PILOT_GATE.md. DEC entries proposed in §12 — Greg assigns numbers before commit citations.

---

## 0. Context and intent

Onboarding exists to produce one useful artifact in the first session, not a complete record. Target: a transplant patient, possibly tired, possibly 60+, gets from first launch to a document they would show a doctor in 10–15 minutes. The record accretes afterward through purpose-driven tasks. This spec supersedes the onboarding portions of any earlier flow notes and is the single source of truth for the Claude Code build.

Hard rules inherited from governing docs, restated because they bind this flow:
- Flag, don't fix. Extraction never writes directly to the record. Everything passes through the staging queue.
- AI proposes, patient disposes. AI extraction output is a proposal. The patient's explicit confirmation is the only write path for high-consequence data.
- Deterministic logic owns anything resembling urgency or escalation. Nothing in onboarding generates alerts; the tripwire engine is out of scope here and must not be invoked by extraction results.

## 1. Change log from mockup review (all items binding)

C1. **Privacy footer copy corrected.** The mockup string "We never access your data" is replaced everywhere by the exact copy in §9.1. This is a pilot-gate item; the old string must not exist anywhere in the repo after this change (grep check in §11).
C2. **Photo input is now in scope (decision reversed by Greg).** Photo capture is a first-class import path, implemented via the vision extraction pipeline in §4.3. It is gated behind the AI-processing consent (§9.2) because image content transits the Render proxy to the AI provider.
C3. **Bulk accept restricted.** "Accept All High Confidence" exists only for batch-eligible categories per the matrix in §5.2. Medications, allergies, and conditions are per-item confirmation only. No control may accept these in bulk, including keyboard shortcuts and "select all" affordances.
C4. **One progress model.** The five-phase rail is the only step numbering. Every screen shows "Step n of 5". The inner "Step 1 of 3" numbering from the mockup is removed.
C5. **First artifact fires on minimum data, not on flow completion.** The artifact mapped to the chosen goal (§6) generates the moment its minimum dataset is confirmed, even if other staged categories remain unreviewed.
C6. **Guided manual medication entry added** as a first-class tile on the Add Data screen and as the destination of "Skip for now" (§3.3, §3.7).
C7. **Storage prompt deferred.** No Google Drive OAuth in session one. Trigger and copy in §8. Footer copy must not imply Drive is already configured.
C8. **Unvalidated formats removed from UI.** C-CDA, XML, and CSV tiles are removed until parsers exist and are validated against real exports (proposed DEC in §12). ZIP is retained but only as a container for PDFs (§4.2).
C9. **Onboarding uses the app's dark navy design system** (Greg's decision, v1.1; supersedes the v1.0 light-theme proposal). One token set across onboarding and app; the §3.6 theme handoff is removed. The white shield logo (background removed, base64-embedded per the existing app convention) appears in the onboarding header.
C10. **File cap raised to 50 MB** per file; password-protected PDFs supported via pdf.js password prompt (§4.2).

Additional items introduced by this spec (not in the mockup):
C11. **Document staleness rule** (§4.5): extracted medications carry the source document date; stale documents flag every med they contribute.
C12. **Allergies are per-item confirmation** (they drive contraindication logic in reports; same consequence class as medications).
C13. **Scanned-PDF fallback**: PDFs with negligible text yield route to the vision pipeline automatically (§4.3).
C14. **Resume state**: onboarding survives tab close and resumes at the last incomplete step (§3.8).
C15. **Consent and disclaimer placement** specified (§3.0, §9.2, §9.3) — required before first extraction, not buried in settings.
C16. **Ongoing task engine is deterministic** (rule-based, no AI) per §7, consistent with the tripwire philosophy.

## 2. Flow architecture

Five phases, one linear rail, every phase skippable except Phase 1's goal selection (a default goal is applied if skipped: "Create an emergency health packet").

```
Phase 1  Choose a Goal          → sets first-artifact target + tailors copy
Phase 2  Quick Start Basics     → Tier 0 identity + transplant context
Phase 3  Add Your Information   → upload / photo / paste / manual entry
Phase 4  Review & Confirm       → staging queue
Phase 5  Your First Result      → artifact delivered + handoff to app
```

Skip destinations (must be implemented exactly):
- Skip Phase 2 → Phase 3. Tier 0 fields become tasks in §7.
- Skip Phase 3 (no documents, declines manual entry) → Phase 5 renders the "not enough data yet" variant: explains what the goal artifact needs, offers manual med entry again, then dashboard.
- Skip Phase 4 is not offered. Staged items persist unconfirmed; the queue is reachable later from Import Records and via a §7 task. Unconfirmed items never appear in the record or in any report.
- "Skip for now" on the Add Data screen routes to guided manual medication entry, not past it (C6). A secondary "Skip everything" text link goes to the Phase 5 empty variant.

State machine: `onboarding_state` in localStorage:
```json
{
  "version": 1,
  "phase": 3,
  "goal": "emergency_packet",
  "tier0": { "organ": "liver", "tx_date": "2023-08-12", "center": "...", "coordinator_name": "...", "coordinator_phone": "..." },
  "consents": { "ai_processing": true, "accepted_at": "ISO8601" },
  "staged_counts": { "medications": 11, "labs": 27 },
  "artifact_generated": null,
  "completed_steps": [1, 2],
  "last_seen": "ISO8601"
}
```
On any launch with `phase < 5` and `last_seen` present: show resume banner "Pick up where you left off — Step {n} of 5" with Continue and Start over.

## 3. Screens

### 3.0 Welcome + consent (precedes Phase 1, one screen)
Purpose: trust framing and the two required disclosures before anything else.
Content, in order: logo; headline "Get a useful result in 10–15 minutes. Build your record at your pace."; the storage/AI paragraph (§9.1 verbatim); the medical disclaimer line (§9.3 verbatim); single checkbox "I understand how my data is handled" (unchecked by default, required); Continue.
The checkbox satisfies the AI-processing consent (§9.2) for the whole product. Store in `consents`. No extraction call of any kind may fire while `consents.ai_processing !== true`.

### 3.1 Phase 1 — Choose a Goal
Five goal cards (single select, keyboard navigable):
1. Prepare for an upcoming appointment
2. Track my transplant medications & labs
3. Create an emergency health packet
4. Organize my medications
5. Build my portable patient profile
Selection stores `goal` and sets the first-artifact target per §6. Copy on later screens references the goal by name ("This gets you closer to your Emergency Card").

### 3.2 Phase 2 — Quick Start Basics (Tier 0)
Fields: Your name; Date of birth (both required before any report generates — v1.1 errata restoring Tier 0 per the original strategy); Organ transplanted (select: Liver, Kidney, Heart, Lung, Pancreas, Multi-organ, Other — all selectable; pilot cohort gating is a recruitment matter, not an app restriction); Transplant date (date picker; reject future dates; warn, don't block, if > 50 years past); Transplant center (free text with autocomplete suggestions from a bundled static list of US transplant centers; free text always allowed); Transplant coordinator name (optional); Coordinator phone (optional, US phone mask, stored E.164).
Coordinator fields feed the Emergency Card and the record's escalation contacts. Buttons: Skip for now / Continue.

### 3.3 Phase 3 — Add Your Information
Four equal tiles plus the dropzone:
- **Upload documents** — drag & drop or browse. Accepts PDF, JPG, PNG, HEIC, ZIP (PDFs inside only). Max 50 MB/file, 20 files/batch. Helper list of good examples retained from mockup (clinic notes, after-visit summaries, med lists, labs from last 3–6 months, discharge summaries).
- **Take a photo** — opens camera on mobile, file picker on desktop. Multi-shot: user may add up to 6 photos that are treated as one document ("Add another page"). Guidance overlay: fill the frame, avoid glare, one page per shot.
- **Paste from your portal** — textarea, 100k char cap, with two-line instructions for MyChart copy/paste.
- **Enter medications directly** — routes to §3.7 guided entry. Subcopy: "No documents handy? This takes about ten minutes and unlocks your first report."
Primary CTA "I've added everything"; secondary "Skip for now" → §3.7; tertiary text link "Skip everything for now" → Phase 5 empty variant.
Per-file status list during processing: Queued → Reading → Extracting → Done / Failed (with reason and retry). Encrypted PDFs prompt for password inline (pdf.js `password` callback); wrong password twice → mark Failed with "Password didn't work — you can retry or skip this file."

### 3.4 Phase 4 — Review & Confirm (staging queue)
Category summary screen exactly as mocked (counts + badges), then per-category review screens governed by §5. Requirements beyond the mockup:
- Source panel is mandatory for every item: the originating page (PDF page render or the photo itself) displayed beside the extracted fields, with the matched region highlighted when the extractor returns coordinates, page-level otherwise.
- Per-item actions: Accept / Edit / Reject / Not sure. "Not sure" stages the item in a `deferred` state surfaced later by a §7 task.
- Category order fixed: Medications → Allergies → Conditions → Care Team → Labs → Procedures → Immunizations. High-consequence first while attention is fresh.
- Progress within category: "Showing n of m" with an explicit "Next: {category}" CTA.

### 3.5 Phase 5 — Your First Result
Success screen naming the artifact generated (§6), with: View my report (primary), Download PDF, Print, Go to my dashboard. If the artifact fired early (C5) this screen acknowledges remaining review work: "27 lab results are still waiting for your review — they'll improve your trends" with a Review later link.
Empty variant (no confirmed data): explains the goal artifact's minimum needs in one sentence, offers Enter medications directly, then dashboard.

### 3.6 Theme handoff
Removed in v1.1: onboarding shares the app's dark design system (§8), so there is no theme transition. "Go to my dashboard" is a plain route change.

### 3.7 Guided manual medication entry (Tier 1)
Search-first entry: single search box, autocomplete against a bundled local drug list (static JSON, ~2,500 entries: RxNorm ingredient + common brand + available strengths, transplant-relevant drugs guaranteed present — tacrolimus, mycophenolate, prednisone, valganciclovir, TMP-SMX, etc.). No network call for autocomplete (privacy + offline).
Per med: strength (select from known strengths + Other), dose amount, frequency (picker: QD/BID/TID/QID/PRN/weekly/custom), prescriber (free text, suggestions from confirmed care team). Free-text fallback if the drug isn't in the list, flagged `unverified_name` for a §7 task.
Allergies entered on the same screen after meds: autocomplete against a common-allergen list + free text, reaction field optional.
Manually entered meds and allergies are pre-confirmed (the patient typed them; no staging round-trip).

### 3.8 Resume behavior
Per §2. Additionally: files mid-extraction at tab close are marked Failed-resumable and offered for retry on resume. Staged items persist indefinitely.

## 4. Extraction pipeline

### 4.1 Shared output contract
All three input paths (text, vision, paste) return the same schema from the proxy:
```json
{
  "documents": [{
    "source_name": "Transplant Clinic Note",
    "doc_date": "2024-04-22" ,
    "doc_date_confidence": 0.92,
    "items": [{
      "category": "medication|allergy|condition|care_team|lab|procedure|immunization|vital",
      "fields": { "...category-specific..." },
      "confidence": 0.0,
      "source_page": 3,
      "source_region": [x, y, w, h]
    }]
  }]
}
```
`doc_date` is the clinical document date, not the upload date. Extractor is prompted to find it; null if absent (triggers §4.5 conservative handling).
Category field schemas: medication {name, strength, dose, frequency, route, status_hint}; allergy {substance, reaction}; condition {name, onset_date, status_hint}; lab {test, value, unit, ref_low, ref_high, collected_date}; care_team {name, credential, specialty, phone}; procedure {name, date}; immunization {name, date}; vital {type, value, unit, date}.

### 4.2 Text path (existing, amended)
pdf.js text extraction per page → text chunks → proxy `/extract` (text mode) → schema above. Amendments:
- File cap 50 MB. Extraction batches pages (≤ 15 pages per model call) and merges results client-side.
- ZIP: unpack client-side (JSZip), ingest contained PDFs only, ignore other entries with a per-entry "skipped (unsupported)" note. Nested ZIPs ignored.
- Password-protected PDFs per §3.3.
- Paste path: raw text → same text mode, `source_name` = "Pasted from portal", `doc_date` extracted from content or null.

### 4.3 Vision path (new — photos and scanned PDFs)
Client: accept JPG/PNG/HEIC. HEIC re-encoded to JPEG via canvas. Downscale longest edge to 2000 px, JPEG q≈0.8, target ≤ 4 MB per image. Up to 6 images per logical document, sent in one extraction call so multi-page lists resolve as one document.
Proxy: `/extract` (vision mode) accepts an image array + optional doc-type hint, forwards to a vision-capable Anthropic model, returns the §4.1 schema. Stateless: no image persisted server-side, no logging of content. Request cap 25 MB post-encode; per-user rate limit consistent with existing proxy limits.
Model routing (consequence-of-error rule): extraction that can populate medications/allergies/conditions is high-consequence → Sonnet-class minimum. Haiku is not permitted for any extraction path.
Scanned-PDF fallback: if pdf.js text yield averages < 200 chars/page across the file, render pages to canvas at 150 dpi and route through vision mode. Cap 20 pages per file for the fallback; beyond that, prompt the user to select a page range ("This looks like a scanned document — choose the pages that matter most").
Provenance: original photos are stored locally as Documents-module entries and linked as the item source, so the §3.4 side-by-side panel works identically for photos and PDFs.

### 4.4 Confidence model
Extractor returns per-item confidence 0–1. Presentation bands: ≥ 0.85 "High confidence"; 0.50–0.84 "Needs review" (fields pre-expanded for editing); < 0.50 "Needs review" + amber field highlights. Confidence is presentation metadata only — it never changes the confirmation requirements in §5.2. Duplicate detection (§5.3) is orthogonal and overrides the badge with "Possible duplicate".

### 4.5 Document staleness rule (deterministic)
Applies to medications and conditions only.
- `doc_date` ≤ 12 months old: no flag.
- 12–24 months: every med/condition from that document carries the badge "From a document dated {date} — confirm this is still current." Item remains individually acceptable.
- > 24 months or `doc_date` null: same badge, and medication `status` defaults to Historical in the editor (patient can flip to Active with one tap).
Thresholds are constants `STALE_WARN_MONTHS = 12`, `STALE_HISTORICAL_MONTHS = 24` in a single config file. Rationale: extraction from old discharge summaries must not resurrect discontinued drugs into the active list; this is the intake-side twin of the Record Integrity Engine.

## 5. Staging queue rules

### 5.1 Invariant
No extracted item reaches the record without explicit patient action. The queue is the only bridge. Rejected items are retained (soft-delete, source-linked) for 30 days for undo, then purged.

### 5.2 Confirmation matrix (binding)
| Category | Per-item required | Bulk accept allowed |
|---|---|---|
| Medications | Yes | Never |
| Allergies | Yes | Never |
| Conditions | Yes | Never |
| Labs | No | Yes — per source document, high-confidence items only |
| Vitals | No | Yes — same terms as labs |
| Procedures | No | Yes |
| Immunizations | No | Yes |
| Care team | No | Yes |
Bulk-accept button label: "Accept all {n} high-confidence {category}". Items below the high band are excluded from bulk and remain listed. The button never appears on Medications, Allergies, or Conditions screens in any state.

### 5.3 Duplicate and conflict handling
Normalization before matching: drug names resolved via the bundled autocomplete list (ingredient-level); conditions lowercased/trimmed with a small synonym map (e.g., HTN → hypertension).
Match rule: same ingredient + same strength → duplicate candidate; same ingredient + different strength or frequency → conflict candidate.
Compare view: existing entry and staged entry side by side with both source documents. Actions: Keep current / Replace with new / Keep both (both flagged for review — a §7 task) / Merge (field-level picker). Duplicate labs (same test + same collected_date + same value) auto-collapse silently; near-duplicates (same test/date, different value) surface as conflicts.

## 6. First-artifact engine

Goal → artifact → minimum confirmed dataset → generation trigger:
| Goal | Artifact | Minimum dataset |
|---|---|---|
| Emergency health packet | Emergency Card | Tier 0 (organ + date) + ≥ 1 medication + allergies reviewed (even if "none") |
| Organize my medications | Medication Report | ≥ 1 confirmed medication |
| Track meds & labs | Medication Report (+ labs-import task queued) | ≥ 1 confirmed medication |
| Portable patient profile | Patient Profile | Tier 0 + meds + allergies + ≥ 1 condition or explicit "no active conditions" |
| Prepare for an appointment | Consultation Prep Brief | meds + allergies + one upcoming appointment (date, provider, specialty — collected via a one-screen insert if absent) |
Trigger: on every queue confirmation, evaluate the goal's minimum set; on first satisfaction, generate the artifact and show a non-blocking toast "Your {artifact} is ready" with a View action. Phase 5 renders around whichever artifact exists. Artifact content specs live with the existing report generators; onboarding only decides when to invoke them.
"Allergies reviewed" means the patient either confirmed extracted allergies or explicitly tapped "I have no known allergies" (stored as a positive assertion with timestamp — absence of data is not the same as NKDA).

## 7. Ongoing task engine (deterministic)

Rule-based, evaluated on app open and after any record write. No AI involvement. Each task: id, trigger rule, reason copy, benefit copy, time estimate, CTA route, dismiss/snooze. Max 4 visible, priority-ordered. Initial rule set:
- T1 Unreviewed staged items exist → "Finish reviewing {n} items from your documents."
- T2 Goal artifact minimum unmet → task per missing element (e.g., "Confirm your allergies — needed for your Emergency Card").
- T3 Lab test present with < 3 data points AND goal ∈ {track, appointment} → "Import earlier {test} results — 2 more unlock trends."
- T4 Care team lacks the specialty of the next upcoming appointment → "Add your {specialty} — improves your prep brief."
- T5 `deferred` ("Not sure") items exist → "Revisit {n} items you marked Not sure."
- T6 Tier 0 skipped → "Add your transplant details — 2 minutes, needed for your Emergency Card."
- T7 Pharmacy absent AND ≥ 3 active meds → "Add your pharmacy — helps with refill tracking."
- T8 `unverified_name` meds exist → "Verify {n} medication names."
- T9 Session ≥ 2 AND Drive not connected AND confirmed items ≥ 10 → storage task (§8 copy).
No completion percentage anywhere. Tasks always state benefit before ask.

## 8. Design tokens — onboarding uses the app system (C9, rev v1.1)

Onboarding renders in the existing dark navy design system (app spec §1): page `#07090f`; panels `#080c14`; cards `#0b1220` with `#111e30` borders and `#1a2f4a` hover/active; text scale `#dde8f5` (headings/values), `#c4d8ee` (body), `#7eb8d8` (muted), `#3d5a7a` (dim), `#2d4d6a` (ghost), `#1e3550` (faint); accent `#4f8ef7`; secondary accent `#a78bfa`; success `#10b981`; warning `#f59e0b`; danger `#ef4444`. No onboarding-specific palette exists; any `--ob-*` aliases in code must resolve to these values.

Fonts unchanged: DM Serif Display (display), Sora (UI/body), DM Mono (labels/meta). Accessibility floor unchanged and binding: body ≥ 16 px where practical and never below 12.5 px for essential copy; controls ≥ 44 px tap targets; visible focus rings (`#4f8ef7`, 2 px, 2 px offset); `prefers-reduced-motion` disables entrance animation; native inputs get `color-scheme: dark`. On the dark palette, text dimmer than `#3d5a7a` may not carry essential copy.

Logo: the white shield lockup (`logo-white.png`, black background removed, base64-embedded per the existing app convention) in the onboarding header at ~32 px height, and small reversed inside the artifact card header, which uses the `135deg #4f8ef7 → #a78bfa` gradient.

Signature element retained: the five-node progress rail — numbered nodes joined by a hairline that fills with `#4f8ef7` as phases complete, DM Mono labels beneath, current node ringed with `rgba(79,142,247,.15)`. Confidence chips: High = `rgba(79,142,247,.12)` fill / `#7eb8d8` text; Needs review = `rgba(245,158,11,.12)` / `#f59e0b`; Possible duplicate = `#111e30` fill, `#1a2f4a` border, `#7eb8d8` text. Staleness banner: `rgba(245,158,11,.08)` fill, `rgba(245,158,11,.3)` border, `#f59e0b` text.

Storage prompt (task T9, session two) — exact copy:
> **Your record lives only in this browser right now.**
> You've confirmed {n} items. Connect your own Google Drive so your record is backed up and available on other devices. Insina never sees your files — the connection uses your Google account, not ours.
> [Connect Google Drive] [Maybe later]

## 9. Copy blocks (exact strings — deviations are build errors)

### 9.1 Privacy footer (replaces mockup string everywhere)
> **Your data. Your control.** Your records are stored on your device or in your own Google Drive — never on Insina servers. When you use AI features like document reading or analysis, only the information needed for that request is sent securely to our AI processor to generate your result; it isn't stored there.

### 9.2 AI-processing consent (welcome screen, above checkbox)
> Insina uses AI to read the documents and photos you add and to help you prepare for appointments. When you use these features, the relevant content is transmitted securely to our AI processing service and returned to your device. It is not used to train AI models and is not stored by Insina.
Checkbox label: "I understand how my data is handled."
(Note for legal review: "not used to train AI models" must be verified against the current Anthropic API data-use terms before pilot; if unverifiable, drop the clause rather than soften it.)

### 9.3 Medical disclaimer (welcome + every generated artifact footer)
> Insina organizes your health information and helps you prepare questions for your care team. It does not diagnose, treat, or provide medical advice. For urgent symptoms, contact your transplant team or call 911.

### 9.4 Staleness badge
> From a document dated {Mon YYYY} — confirm this is still current.

## 10. Out of scope for this build

Google Drive OAuth inside onboarding (T9 handles it post-onboarding); C-CDA/XML/CSV parsing (removed from UI, DEC proposed); telemetry of any kind (pilot is concierge-observed; any future telemetry is a new data flow requiring its own DEC and disclosure); HealthKit; tripwire evaluation of extracted values; multi-user/household accounts; localization.

## 11. Acceptance criteria

1. Repo-wide grep: the strings "never access your data" and "never transmitted to Insina or any third party" return zero hits; §9.1 copy present verbatim in the onboarding footer component.
2. With `consents.ai_processing` false, no network call to `/extract` can be produced by any UI path (verified by attempting all four input tiles).
3. Medications, Allergies, Conditions review screens contain no bulk-accept control in any state; Labs screen bulk-accepts only high-confidence items and leaves others listed.
4. A photo of a printed medication list produces staged medication items, each opening a side-by-side view with the original photo; the photo appears in Documents as the linked source.
5. A scanned (image-only) PDF routes through the vision fallback and produces staged items; a text PDF does not invoke vision mode.
6. A 2024-dated document processed in 2026 yields meds carrying the §9.4 badge with status defaulted per §4.5.
7. Selecting "Emergency health packet", entering Tier 0, confirming one medication, and tapping "I have no known allergies" generates the Emergency Card before labs are reviewed; toast appears; Phase 5 references pending labs.
8. Every screen shows "Step n of 5"; no "of 3" numbering exists.
9. "Skip for now" on Add Data lands on guided medication entry; autocomplete resolves "tac" → tacrolimus with strength options; entry works with network disabled.
10. Closing the tab mid-Phase-3 and reopening shows the resume banner and restores state, including failed-resumable files.
11. ZIP containing three PDFs ingests all three; a password-protected PDF prompts and proceeds on correct password.
12. Keyboard-only traversal completes the entire flow; all interactive elements show focus; `prefers-reduced-motion` disables entrance animations.
13. Rejected staged items are recoverable for 30 days from Import Records.

## 12. Proposed DEC entries (Greg to number and append)

- Photo/vision extraction pipeline in scope for pilot onboarding; consent-gated; Sonnet-class minimum for all extraction (consequence-of-error).
- Bulk-accept confirmation matrix per §5.2 (supersedes any prior staging-queue wording that restricted bulk to "labs only" — now labs, vitals, procedures, immunizations, care team; per-item for meds, allergies, conditions).
- Document staleness rule with 12/24-month thresholds (§4.5).
- C-CDA/XML/CSV import removed from UI until parsers validated against real portal exports.
- Onboarding shares the app dark design system; white shield logo base64-embedded in the onboarding header (supersedes the v1.0 light-theme proposal).
- File cap 50 MB; password-protected PDF support; ZIP-of-PDFs ingestion.
- "No known allergies" stored as positive assertion, required for Emergency Card generation.

— End of spec —
