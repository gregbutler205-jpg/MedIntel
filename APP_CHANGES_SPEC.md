# Insina Health: App Changes Specification (Security, Privacy, Structure)

Companion to INSINA_AI_PROMPTS.md. That document specifies what the AI
surfaces say; this one specifies everything else that changes in the app.

How the project documents relate:
- PILOT_GATE.md: the go/no-go checklist before any second user (PG-01..11).
- DECISIONS_PILOT_AMENDMENT.md: decision-log entries behind the gate.
- INSINA_AI_PROMPTS.md: the full prompt spec, condition-generic.
- This document: the implementation spec. Every item is written for a
  Claude Code session: ID, What, Where, Why, How. Items that overlap the
  pilot gate cite their PG ID; this spec also covers items beyond the gate.

Reference item IDs (S-, P-, A-) in commit messages, same convention as
DEC and PG IDs.

---

## Part 1: Security (S)

### S-01. Revoke and purge the committed GitHub token (PG-01)
**Where:** `GitHub Token.docx`, repo root; `.gitignore`; git history.
**Why:** Live PAT in a public repo, hidden from GitHub secret scanning by
the docx (zip) container. Push access to the repo is a supply-chain
compromise of the deployed app.
**How:**
1. Revoke the token in GitHub settings before touching the repo.
2. Delete the file; purge history with `git filter-repo` (a delete commit
   alone leaves it recoverable).
3. Add `*.docx`, `.claude/`, `.env*` to `.gitignore`; remove
   `.claude/settings.local.json` from tracking.
4. Force-push the rewritten history; anyone with clones re-clones.

### S-02. Escape HTML before rendering AI output (PG-02)
**Where:** `applyBold()` duplicated in `Tab05.jsx` and `Tab11.jsx`, feeding
`dangerouslySetInnerHTML`.
**Why:** AI output can echo content that originated in uploaded documents.
Unescaped markup executes in the app origin, which holds the full record,
`mi_ak`, and the PIN hash.
**How:** Create one shared renderer, `src/lib/renderAiText.js`:
1. Escape `& < > " '` first.
2. Then apply the `**bold**` to `<strong>` transform and the `-----`
   divider transform.
3. Both tabs (and any future chat surface) import this module; delete the
   local copies. No other function in the codebase may build HTML from AI
   output.

### S-03. Content-Security-Policy meta tag (PG-05)
**Where:** `index.html`.
**Why:** GitHub Pages cannot set headers; a meta CSP still narrows the
blast radius of any future injection to allowlisted origins.
**How:** Add a meta CSP allowing `script-src 'self'` plus only the origins
actually used (Google Fonts stylesheets/fonts, Google Identity Services,
googleapis endpoints for Drive/Calendar, the proxy origin,
`api.anthropic.com` only while S-08/A-10 keep the BYO-key path).
`connect-src` lists the proxy, googleapis, and Anthropic; `img-src 'self'
data: blob:` for compressed images. Verify fonts, GIS popup, Drive sync,
and AI streaming still work, then tighten anything left over. Inline
styles are pervasive in the codebase, so `style-src 'unsafe-inline'`
stays for now; note it as accepted debt.

### S-04. Bundle pdf.js; remove the CDN import (PG-03)
**Where:** `Tab12.jsx` dynamic import of pdf.js 4.4.168 from cdnjs;
`package.json` already has `pdfjs-dist@^5.5`.
**Why:** Runtime CDN code in a health app origin is a supply-chain
exposure; it also breaks offline use and drifts versions against the
bundled copy.
**How:** Import the bundled `pdfjs-dist` (worker via Vite `?url` asset
import) everywhere PDFs are parsed. Delete the CDN URLs. Remove cdnjs from
the CSP allowlist once gone.

### S-05. Proxy: enforced rate limiting, spend cap, pilot bearer tokens (PG-04)
**Where:** `proxy/server.js`; Render environment; Anthropic console.
**Why:** Rate limiting is currently `skip: () => true`, and CORS is not
authentication (it does not stop curl). The proxy URL ships in the public
bundle: as it stands, anyone can spend the Anthropic balance without
limit.
**How:**
1. Enable the limiter with a real cap; add a per-token limiter once tokens
   exist.
2. Set a hard monthly spend cap in the Anthropic console as the backstop.
3. Pilot auth: `PILOT_TOKENS` env var on Render, comma-separated random
   tokens issued out-of-band, one per invited user. Client sends
   `Authorization: Bearer <token>`; the proxy rejects missing or unknown
   tokens on `/api/chat` and `/api/extract-pdf`. The client stores its
   token with the same handling as `mi_ak` until P-02 lands, then inside
   the encrypted store.
4. Rotation: removing a token from the env var revokes that user; document
   the procedure in `proxy/DEPLOY.md`.
5. Device-attestation auth (App Attest / Play Integrity) is deferred to
   the native shell; not required for an invited pilot.

### S-06. Secrets hygiene going forward
**Where:** repo root; local git hooks; GitHub repo settings.
**Why:** S-01 removes one token; this prevents the next one.
**How:** Add a pre-commit secret scan (gitleaks or equivalent) to the
local workflow and note it in CLAUDE.md so Claude Code sessions respect
it. Enable GitHub push protection on the repo. Log a decision on repo
visibility: no PHI is in the repo (verified), but prompts and clinical
config are public; GitHub Pages also deploys from private repos on paid
plans. Either outcome is fine; make it a recorded choice.

### S-07. Prompt-injection defense at prompt-build time
**Where:** the prompt builders (`src/prompts/`, A-09); document storage
(`mi_ref_docs`).
**Why:** Uploaded document text is untrusted input that currently enters
prompts unmarked. INSINA_AI_PROMPTS.md CSC rule 9 handles the model side;
this is the app side.
**How:**
1. Wrap every document excerpt in explicit delimiters with source and
   date: `[DOCUMENT id=... source=... date=...] ... [END DOCUMENT]`.
2. Strip control characters; cap per-document length; when capping, append
   a visible `[TRUNCATED]` marker inside the block.
3. Never concatenate document text into instruction sections; documents
   appear only inside DOCUMENT blocks.

### S-08. BYO Anthropic key handling (`mi_ak`)
**Where:** `Tab13.jsx` (ApiKeyModal), `Tab12.jsx` fallback, `Tab10.jsx`.
**Why:** A plaintext API key in localStorage is exactly what an XSS steals,
and the direct-to-Anthropic path bypasses the proxy's model allowlist and
token caps.
**How:** Pending the A-10 decision: if BYO-key stays, store it inside the
encrypted store once P-02 lands, offer a session-only (memory) option, show
a plain warning at entry ("this key can spend your Anthropic balance;
Insina stores it only on this device"), and route BYO-key traffic through
the proxy with the key forwarded per-request rather than calling
`api.anthropic.com` from the page, so allowlist and caps still apply. If
BYO-key is dropped, delete the modal, the fallback, and the Anthropic
entries in the CSP.

---

## Part 2: Privacy (P)

### P-01. Identity minimization in AI payloads
**Where:** all prompt payload builders; `Tab05.jsx`, `Tab10.jsx` (currently
send the patient's name); new `src/lib/identity.js`.
**Why:** The name adds zero analytic value and defeats the anonymous-ID
design on two surfaces. Sensitive identifiers do not belong in model
traffic at all.
**How:**
1. Generate a stable random `mi_user_id` at first run (not derived from
   any personal field).
2. Payload builders use an explicit field allowlist per variable
   (INSINA_AI_PROMPTS.md section 2). Prohibited fields (name, DOB, address,
   phone, email, insurance IDs, MRN, SSN) are structurally excluded: the
   builder never reads them, rather than reading and filtering.
3. DOB converts to computed age at build time.
4. Fix Tab05 and Tab10 to use `{userId}`; grep for `mi_profile_personal`
   reads inside any prompt construction and remove them.

### P-02. Passphrase-derived encryption at rest (PG-10)
**Where:** new `src/lib/vault.js`; `store.js`; Drive sync; LockScreen.
**Why:** In a non-custodial architecture a password that only gates the UI
protects nothing: there is no server, and the data sits in plaintext
localStorage regardless. The password must be the encryption key. This is
what DEC-008 "encryption" means (see DECISIONS_PILOT_AMENDMENT, DEC-P1).
**How:**
1. Key derivation: WebCrypto PBKDF2-SHA256, 600,000+ iterations, 16-byte
   random salt. (Argon2id is preferable but needs a WASM dependency;
   acceptable v2 upgrade.)
2. Envelope: a random 256-bit data key (DEK) encrypts the record; the
   passphrase-derived key (KEK) wraps the DEK. Passphrase changes re-wrap
   the DEK without re-encrypting the record.
3. Cipher: AES-GCM, fresh random 12-byte IV per encryption, never reused.
   Stored blob: `{ v, salt, iterations, iv, wrappedDek, data }` base64.
4. Recovery key: random 256-bit value generated at setup, shown once
   (hex or word groups) with a download-as-file option, wraps the DEK as
   a second envelope. Required, not optional: a forgotten passphrase must
   not destroy a medical record.
5. Scope: all `mi_*` record stores encrypt. Non-sensitive app preferences
   (theme, layout) may stay plaintext.
6. Session: the DEK lives in memory only. Auto-lock on timeout re-requires
   the passphrase. The existing 4-digit PIN may remain as an in-session
   quick-unlock in front of an unlocked vault, but PIN-wrapped key material
   is never persisted (a 4-digit wrap is brute-forceable offline), and
   user-facing copy must not describe the PIN as data protection.
7. Drive: upload ciphertext blobs only. Drive-stored data is encrypted
   with the same DEK.
8. Migration: prompt an export backup first; encrypt in place; round-trip
   verify; only then delete plaintext; set an interrupted-migration flag
   so a mid-migration crash resumes safely.
9. UI-13 (INSINA_UI_CHANGES.md) defers here for production access control:
   remove the temp PIN from the production build, protect locked and
   signed-out states, define session and auto-lock behavior, keyboard and
   accessibility support. There is no separate authentication server and
   no reset that restores access without the passphrase; recovery is the
   recovery key from point 4, nothing else.
10. Emergency access (UI-13): resolved to the exportable/printable
    Emergency Information (the Surface H ED packet the patient keeps on
    paper, phone wallet, or lock-screen medical ID), NOT a
    reduced-authentication view into the live encrypted app, which would
    breach this encryption boundary. A patient-designated lighter-protected
    Emergency Card is a possible future addition but requires its own DEC
    (see INSINA_UI_CHANGES.md open decision). Default build does option A.

### P-03. Scope the "zero-log" claim accurately
**Where:** user-facing copy, landing page, Insina_Health_Overview.
**Why:** The proxy code does not log content, but Render's infrastructure
retains HTTP access metadata (IPs, timestamps, paths) regardless of app
code. "Zero-log" overstates.
**How:** Use "Insina's proxy does not store or log message content" and
document in one place what the hosting layer retains. Accuracy here is
cheap now and expensive to correct after a trust incident.

### P-04. Verify Anthropic API data handling for health traffic
**Where:** external verification; record in DECISIONS.md.
**Why:** PHI transits the proxy to the Anthropic API. The Insina side is
stateless; the API side's retention terms are the other half of the
privacy story and must be verified, not assumed.
**How:** Confirm current API data-retention posture and whether a
zero-data-retention arrangement or BAA applies to this account tier;
record the outcome and date in DECISIONS.md; align user-facing privacy
copy with what is actually in force.

### P-05. FTC Health Breach Notification Rule readiness
**Where:** new one-page internal doc, `INCIDENT_PLAYBOOK.md`.
**Why:** As a personal health record vendor outside HIPAA, Insina sits
under the FTC HBNR the moment other people's records are involved. A
breach carries notification duties with deadlines; the time to write the
playbook is before the pilot, not during an incident.
**How:** One page: what counts as a breach of security for a PHR vendor,
who gets notified (affected individuals, FTC, media above the threshold),
timing requirements, and the first five steps (revoke credentials, snapshot
evidence, scope the exposure, draft notice, counsel review). Attorney
review of this page rides along with the PG-11 consent-language review.

### P-06. Consent, terms, and AI-limitations screen (PG-11)
**Where:** first-run flow; a terms/privacy page; the Advanced-mode consent
modal already in the app.
**Why:** Minimum legal surface for real pilot users; the narrow slice of
the attorney-review gate that cannot wait for commercialization.
**How:** Plain-language terms and privacy policy describing the
non-custodial model accurately (including P-03 scoping); an AI-limitations
consent at first use (informational only, not diagnosis, verify with your
care team: mirror the CSC identity statement so app copy and prompt
behavior match); an explicit pre-commercial acknowledgment per pilot user.
Adopt the UI-5 approved AI privacy wording verbatim: "Your health record
is stored on your device. When you use AI, information needed for your
request is sent pseudonymously and securely through Insina to Anthropic to
generate the response." Add a feature-specific "What information is sent?"
explanation, state plainly that pseudonymous is not anonymous, and remove
any remaining "stays local" or contradictory wording (UI-5 done-when: the
notice, consent text, technical behavior, and the explanation all agree).
Recording consent for the visit-capture feature keeps its existing
external-validation requirement (MS/LA review) before that feature is
enabled for pilot users.

---

## Part 3: Architecture and structure (A)

### A-01. Deterministic tripwire engine (PG-09)
**Where:** new `src/lib/tripwire.js`; threshold data generalized out of
`src/config/urgencyThresholds.js`; flag store `mi_tripwire_flags`; hooks at
import, sync, and manual entry (the existing `mi-data-synced` event).
**Why:** `URGENCY_THRESHOLDS` is currently defined but consumed by nothing:
no code path evaluates it and it is not in any prompt, so the LLM is the de
facto urgency layer. That conflicts with the settled
deterministic-tripwire decision, and the current threshold values are
calibrated to one patient's transplant.
**How:**
1. Split thresholds into: (a) a generic default library keyed by canonical
   analyte, limited to values with defensible universal critical bounds;
   (b) optional condition-aware defaults activated by condition modules;
   (c) provider-set custom ranges (existing `mi_lab_custom_ranges`), which
   take precedence. Precedence: provider custom > user-confirmed > library
   default. Analytes with no applicable entry produce no flag.
2. Evaluate every incoming lab against its effective thresholds; emit
   flags matching the schema in INSINA_AI_PROMPTS.md section 6, including
   the authored `guidance` string and `thresholdSource`.
3. Surface flags in the UI (banner plus per-result badge). Dismissal
   behavior mirrors `patternFlags.js`: dismissible, re-surfaces on a new
   qualifying value.
4. Prompt builders inject current flags as `{tripwireFlags}`. The model's
   obligations are already fixed by CSC rule 4.
5. Guidance strings and the default library are versioned and sit behind
   the same clinical review gate as condition modules.
6. Retire the "Used by Standard Mode AI" comment; the file's role is now
   real and documented.

### A-02. Unified AI client and model map (PG-08)
**Where:** new `src/lib/aiClient.js`; `Tab05.jsx`, `Tab10.jsx`,
`Tab11.jsx`, `Tab12.jsx`, companion callers.
**Why:** Each surface currently rolls its own fetch. That is how Tab10
drifted to a direct Anthropic call with a missing required header, a stale
model string, and the patient's name in the prompt.
**How:**
1. One module exporting `callAI({ surface, mode, system, messages,
   stream })`: resolves the model from a single `MODEL_MAP`
   (standard: `claude-sonnet-4-6`, advanced: `claude-opus-4-6`, extraction:
   sonnet), targets the proxy only, attaches the pilot bearer token
   (S-05), handles streaming and error mapping in one place. MODEL_MAP
   also carries a per-surface `max_tokens` (note summaries and report
   annotations well under the global cap) so output cost and latency are
   bounded per task, with the proxy's 4096 as the hard ceiling.
2. Port every surface to it; delete all direct `api.anthropic.com` URLs
   from `src/` (the BYO-key path, if kept, goes through the proxy per
   S-08).
3. Remove stale model strings; the proxy allowlist and `MODEL_MAP` are
   kept in sync by a comment cross-reference in both files.

### A-03. Lab digest builder
**Where:** new `src/lib/labDigest.js`; payload builders for Tab05 and
Tab11.
**Why:** Tab11 currently ships the complete lab history (thousands of
entries: cost and attention degradation), while Tab05 ships only the most
recent value per test (trend-blind, which defeats the product's flagship
trend detection). One digest fixes both.
**How:** Per canonical analyte (A-04): a 12-month digest, the default on
both Tab05 and Tab11. Each analyte line carries: the last 6 values with
dates within the window, window min and max, a computed trend summary
(first value, last value, direction, draw count, so a slow decline stays
visible even when draws outnumber the listed values), latest delta, unit,
reference range, provider custom range with its set date, and current
tripwire status. Emit compact lines, one analyte per line, for
`{labDigest}`. `{labsWindow}` (last 60 days, full rows) rides alongside
for fine detail. `{labsExtended}` is the same digest at 24 months,
Advanced mode only, included app-side when the question is longitudinal
or the patient toggles it, never by model request. Optional future
enhancement, not required now: per-month anchor values for analytes drawn
more often than monthly.

### A-04. Lab test-name canonicalization (absorbs UI-3 grouping)
**Where:** new `mi_lab_name_map`; `src/lib/labCanonical.js`; RIE check.
**Split:** a minimal A-04 (name map + manual Group Tests UI + reversible
mappings + ordinary-flag badge) is pulled into Phase 1 because the A-03
digest and multi-facility pilot data need alias grouping; the seeded
synonym-library richness and the full canonical-ID digest upgrade stay in
Phase 2. UI-3 requirements (asks before grouping, preserves every source
name and record, mappings apply forward and are reversible, flag badge
distinct from tripwire) are owned here. See INSINA_UI_CHANGES.md UI-3.
**Why:** Three facilities name the same analyte differently (Tacrolimus,
FK506, Tacrolimus Whole Blood; ALT, SGPT). Name-based grouping leaks
duplicates into digests, trends, and tripwire evaluation.
**How:** Seed a synonym map for common analytes; group by canonical ID
everywhere labs are grouped (digest, trends, dedupe, tripwire). Unmapped
names are flagged by an RIE check for one-tap patient confirmation (flag,
don't fix), and confirmed mappings persist to the map.

### A-05. Remove the silent transplant-terminology rewrite (PG-07)
**Where:** the prompt-build path that rewrites surgical-history terms;
`src/rie/reviewQueue.js`.
**Why:** Silent rewriting of clinical terminology violates the RIE
flag-don't-fix principle, is invisible to the patient, and would corrupt
the record of any user whose history genuinely differs.
**How:** Delete the replacement. When RIE detects a plausible
terminology discrepancy (for example, a surgical entry inconsistent with
the condition list), it files a Review Queue item; the patient confirms
once; the confirmed value is what the record stores and prompts inject.

### A-06. Condition-module loader
**Where:** new `src/prompts/modules/` (module definitions per
INSINA_AI_PROMPTS.md section 5) and `src/lib/conditionModules.js`
(selection).
**Why:** Implements the replacement for hardcoded, single-patient
reference content (PG-06).
**How:** Deterministic matcher over `{conditionsActive}` and medication
classes; cap 4 modules, relevance-ordered; inject under the CONDITION
REFERENCE header with id and version. Module content fields are data, not
code. `reviewed_by` must be non-null for a module to be eligible for
selection in any build served to a non-founder user.

### A-07. Move binary data out of localStorage
**Where:** insurance-card photos (Tab02), document and imaging images
(Tab14); new `src/lib/blobStore.js` (IndexedDB).
**Why:** Base64 images in a ~5MB localStorage budget are the first quota
wall; quota errors are already being caught, but the ceiling is
architectural.
**How:** Small hand-rolled IndexedDB wrapper (no new dependency): images
stored as Blobs keyed by ID; localStorage keeps metadata and references;
Drive sync uploads binaries to the appData folder alongside the encrypted
record (ciphertext once P-02 lands). One-time migration moves existing
base64 images out of localStorage on first run after upgrade.

### A-08. Schema versioning and migrations for `mi_*` stores
**Where:** new `src/lib/migrations.js`; `mi_schema_version` key; boot path.
**Why:** Twenty-plus releases have evolved the stores with no recorded
schema version. P-02 (encryption) and A-07 (blob move) are both migrations;
they need rails, and so does every future change.
**How:** Ordered, idempotent migration list run at boot before first
render; each migration logs to the RIE audit log; major migrations prompt
an export backup first (consistent with the CHANGELOG's own MAJOR
definition: breaking changes to how data is stored).

### A-09. Prompts as code
**Where:** new `src/prompts/` (core.js for the CSC and display rules, one
module per surface, modules/ for condition modules); consumed via A-02.
**Why:** Prompts currently live as inline strings scattered through tabs,
which is how one surface shipped with no rules. Single source of truth,
versioned, diffable.
**How:** Each surface module exports `PROMPT_VERSION` and a builder
`(payload) => ({ system, messages })`. `CSC_VERSION` exports from core.
INSINA_AI_PROMPTS.md is the spec; the modules are the implementation; both
change in the same commit. Builders order payloads cache-first: the CSC,
display and routing blocks, condition modules, and slow-changing record
sections lead; volatile sections (tripwire envelope, recent window, the
question, mode) trail, so prompt caching gets maximum prefix reuse.
{docExcerpts} is included only when the question references documents or
a document was added in the current session, never by default.

### A-10. SETTLED: keep the BYO-key tier, hardened, at release
**Where:** DECISIONS.md (logged); S-08 implements at the release gate.
**Decision:** Keep. It completes the non-custodial story (data, and now
compute, free of lock-in), serves the heaviest power users at their own
cost, and keeps the app functional independent of the proxy. Timing:
dormant through the pilot (A-02 removes the direct calls, making the
current half-implementation inert); S-08 hardening lands at release.
Pilot users are served by S-05 issued tokens and lose nothing.
**Open sub-decision, parked for S-08:** proxy-forwarded BYO (keeps the
model allowlist and caps in the loop; the key transits the stateless
proxy per request, never stored) versus direct-from-browser (the key
never touches Insina infrastructure; allowlist enforcement drops to the
client). Current lean: proxy-forwarded, because for a health app the
safety controls outweigh the last inch of non-custodial purity. Log the
final call as its own DEC at implementation.

### A-11. Consequence-gated model routing (deferred; gated on A-01 fixtures + A-09 rollout)
**Where:** MODEL_MAP in `src/lib/aiClient.js`; config only.
**Why:** Cheaper models per surface cut price per token, but the routing
principle is consequence of error, not task complexity: surfaces that
read or interpret clinical values stay on strong models regardless of how
mechanical they look, and no surface is downgraded until the threshold
fixtures and prompt rollout exist to prove behavior holds.
**How, when the gate clears:** candidates for Haiku are Surface C (note
summaries) and Surface H (report annotation), both low-consequence.
Extraction (D and E), symptom prep (G), and all lab interpretation stay
on Sonnet or better permanently. Each reassignment is a one-line
MODEL_MAP change, validated against the section 9 checklist and the
threshold fixtures before shipping, and logged in CHANGELOG.

### A-12. Plausibility guard on manual entry and extraction
**Where:** new `src/lib/plausibility.js` and versioned
`src/config/plausibilityBounds.js`; synchronous hook in the manual entry
forms (vitals, labs); RIE extraction preflight; runs before A-01 at the
same entry, import, and sync hooks.
**Why:** Obvious input errors (a systolic of 1138, an OCR decimal loss)
must be caught at the door, and they must be handled separately from the
tripwire: a typo needs a correction prompt, a real extreme value needs an
urgent flag, and confusing the two harms in both directions.
**How:**
1. Two bands per measurement, in a versioned config structured like the
   threshold library. Hard band: physiologically impossible, set beyond
   any recorded human value (example: systolic hard 40 to 370). Soft
   band: implausible but possible (example: systolic soft 70 to 250).
   No config entry means no check, mirroring the tripwire rule.
2. Manual entry, hard band: block the save with an immediate message and
   correction suggestions from cheap heuristics (value divided by 10 if
   in range, adjacent-digit transposition). The patient picks; nothing
   auto-corrects (flag, don't fix).
3. Manual entry, soft band: confirm-and-save with one tap, never block.
   Rare extreme values are exactly what the tripwire exists to catch;
   after confirmation the value proceeds to tripwire evaluation.
4. Extraction path: bounds run in RIE preflight; out-of-band values land
   in the Review Queue with the raw extracted text and the reason. A
   unit mismatch between the document and the app's expected unit is its
   own Review Queue flag; no auto-conversion in v1.
5. Cross-field checks, v1 list deliberately small: systolic greater than
   diastolic (confirm, catches swapped fields), SpO2 hard cap 100.
6. Ordering is a contract: plausibility resolves before tripwire
   evaluation, so typos cannot fire false urgent flags and confirmed
   extremes fire true ones.

### A-13. Analysis context gathering
**Where:** prompt spec v2.3 (Surface A and G context-gathering block, B2
capped at one, {sessionContext} variable); a small optional free-text
field on the Tab05 Full Analysis launch.
**Why:** Good analysis sometimes needs context the record cannot contain:
current state, onset, timing, severity, adherence today, events not yet
logged. The model may gather it, bounded so it never becomes an
interrogation and never delays an emergency response.
**How:** Conversational surfaces follow the v2.3 prompt rules: up to 5
targeted questions, one batched round, material-only, skip-tolerant,
rule 5 precedence, rule 10 forbids re-asking recorded facts. One-shot
analyses get the app-side equivalent: the optional launch field flows in
as {sessionContext}, injected under a SESSION CONTEXT header and treated
as patient-reported, not record data.
**Results presentation (same item):** analysis outputs open in a
dedicated full-screen overlay (a modal, not window.open, so popup
blockers and the mobile PWA are non-issues) with a Print button and a
Save button. Print reuses the existing branded print pattern through a
print stylesheet scoped to the overlay. Save v1 downloads the analysis
as a dated markdown file named by analysis type and date, carrying the
{lastSync} freshness stamp and the standing Surface H footer ("Compiled
by the patient from their own records using Insina Health.
Informational; verify against source records."). The Tab05 Full
Analysis always opens in the overlay; every Tab11 response carries an
open-as-report control into the same overlay, which avoids fragile
classification of which responses count as analyses. Saving analyses
into the record itself (Documents or Notes) is future work for
FEATURE_INTAKE, not built now: AI-generated content entering the record
needs explicit labeling and its own decision.

### A-14. Home button parity on four tabs
**Where:** Medications, Labs and Trends, Vitals, and Symptoms tabs.
**Why:** These four lack the Home button the other tabs carry;
navigation should be uniform across the app.
**How:** Add the Home button matching the existing implementation and
placement from the tabs that have it, exactly; no restyling, no
component extraction unless the pattern is already a shared component.
Verify at mobile widths.

---

## Part 4: External verifications (attorney / third party)

Consolidated so nothing rides only in prose:

1. PG-11 / P-06 consent language and terms (pilot-blocking slice).
2. Intended-use and marketing language against the current FDA CDS
   framing, including the tripwire guidance strings and module content
   (existing DEC gate; extend its scope to cover A-01 and A-06 content).
3. Recording consent, MS and LA, before visit capture is enabled for
   pilot users (existing DEC).
4. FTC HBNR playbook review (P-05).
5. Anthropic API data-handling verification (P-04).

---

## Part 5: Sequencing

**Phase 0, this week (founder-only still):**
S-01, S-05 items 1 and 2 (limiter and spend cap), S-02, S-04, S-03, S-06,
plus A-14 (Home button parity; not security, rides the first deploy
because it is trivial and user-facing).

**Phase 1, pilot gate (blocks user #2), with their PG IDs:**
P-02 (PG-10), P-01, P-06 (PG-11), A-01 (PG-09), A-02 (PG-08), A-05
(PG-07), A-06 plus the INSINA_AI_PROMPTS.md rollout via A-09 (PG-06),
S-05 item 3 (tokens), S-07, A-10 settled and logged, P-05 written, plus
A-12 (plausibility guard) and A-13 (analysis context gathering), plus the
minimal A-04 with UI-3 (lab alias grouping and flag badge). The UI
production-readiness track (INSINA_UI_CHANGES.md Phase 1) runs alongside;
the CLAUDE_CODE_PROMPT gives the merged order and the merge points where a
UI item shares a step with its engineering counterpart (UI-15 with A-13,
UI-4 with A-12, UI-3 with A-04, UI-13 with P-02, UI-6 with A-01, UI-5 with
P-01/P-03).

**Phase 2, quality and scale (after pilot starts):**
A-04 full (minimal A-04 was pulled to Phase 1 with UI-3), A-07, P-03, P-04 recorded, S-08 at the release gate per settled
A-10 (keep BYO, hardened; routing sub-decision logged then), and A-11
model routing once A-01 fixtures and the A-09 rollout are stable.
A-03 v1 and A-08 move into Phase 1 per the dependency notes.

Dependency notes: A-03 v1 (Phase 1) groups by normalized raw name and
A-04 upgrades the grouping to canonical IDs in Phase 2; A-08 before P-02 and A-07 (both are migrations and should run on the
rails); A-09 before or with the prompt rollout; A-02 before S-05 item 3
(the client needs one place to attach the token); A-12 resolves before
A-01 evaluation at the same entry, import, and sync hooks.
