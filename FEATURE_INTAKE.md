# Insina Health Feature Intake and Specification Builder

*Final version. Supersedes the earlier draft. Reflects DEC-001 through DEC-024.*

## 1. What this document is, and what it becomes

This is the intake funnel for every open question, issue, and feature idea for Insina
Health, gathered from Greg, from Claude, and from other LLMs. Its job is to take a messy
pile of questions from several sources and turn it into two clean outputs:

1. **An all-inclusive features list** (Section 7): the settled, comprehensive record of
   what Insina does and will do, module by module.
2. **Decisions with reasoning** that flow into `DECISIONS.md` whenever a resolved item is
   a judgment call worth not re-litigating.

The document starts as a question list and *becomes* the features list as items get
resolved. An unanswered item is a question. A resolved item is a feature entry plus, when
warranted, a decision entry. Nothing is deleted along the way; items move status.

The trap this structure exists to prevent: handing product and safety decisions to a code
assistant that will answer anything you ask, in code terms, and quietly bury an unmade
decision inside a commit. Sorting comes before answering.

**Working loop.** Claude resolves the Bucket 2 design questions into written specs before
anything goes to Claude Code. Claude Code executes only settled specs. Its output comes back
to Claude for review before it is final.

---

## 2. The workflow

1. **Generate.** Paste the prompt in Section 5 into each LLM you use. Collect every item
   each one returns.
2. **Sort.** Every item lands in one of three buckets (Section 3). The prompt asks each
   model to pre-sort, but you confirm the bucket, because models will mis-sort in the
   direction of "I can answer this," which pushes decisions into design and design into code.
3. **Reconcile.** Merge duplicates, flag disagreements, and mark any regulatory or clinical
   claim that needs checking. Different models will phrase the same issue three ways and
   some will assert stale or wrong law. The reconciliation checklist is Section 8.
4. **Resolve.** Bucket 1 items: you decide, pulling in an attorney for the device-line and
   threshold items. Bucket 2 items: Claude turns them into specs. Bucket 3 items: the settled
   spec goes to Claude Code against the real repo, and Code's output returns to Claude for review.
5. **Roll up.** Every resolved item updates the features list (Section 7). Judgment calls
   also get a `DEC-NNN` entry in `DECISIONS.md`.

---

## 3. The three buckets

**Bucket 1: Decisions only Greg can make.**
Judgment, values, regulatory, safety, privacy posture, pricing, and anything about what the
app is willing to *say*. No LLM closes these. An LLM may lay out options and tradeoffs so you
decide faster, but the output is a decision you record, not code. Sub-flag `needs-attorney`
for anything touching the FDA device line, recording-consent law, or clinical thresholds.

**Bucket 2: Design questions that need reasoning but not the repo.**
Schema, UX flows, AI prompt design, feature specs, architecture that does not require seeing
actual code. Output is a written spec. This is where the chat models are strongest.

**Bucket 3: Code questions that require the actual repo.**
Implementation, debugging, wiring, given a settled spec. Only Claude Code, and only after the
Bucket 1 and Bucket 2 questions upstream of it are resolved. Claude Code does not know when a
task is really an unmade Bucket 1 decision, so it will not stop you. You stop you.

---

## 4. Item schema (use this everywhere, so items from every source merge cleanly)

- **ID:** source prefix plus number. Claude items are `CL-NNN`. Other models use their own
  prefix (for example `GP-NNN`, `GM-NNN`). Final canonical IDs are assigned at reconciliation.
- **Title:** short.
- **Bucket:** 1 (Decision) | 2 (Design) | 3 (Code). Add `needs-attorney` where relevant.
- **Area:** the module or cross-cutting category.
- **Question / issue:** stated crisply.
- **Why it matters:** the stake, in a sentence or two.
- **Options / considerations:** optional, if any are already visible.
- **Owner:** Greg | Greg + attorney | Design (LLM) | Claude Code.
- **Feature implication:** the feature or change this points to. This is the bridge that
  turns a question into a features-list entry.

---

## 5. The portable prompt (copy everything between the markers into any LLM)

============================ COPY BELOW THIS LINE ============================

You are helping build an exhaustive feature and issue inventory for a product called
Insina Health. I will give you what it is, then ask you to generate as many sharp,
non-obvious questions, issues, and feature gaps as you can, in a strict format.

WHAT INSINA HEALTH IS
Insina Health is a personal health-record and intelligence platform for one person with a
complex medical situation (a liver-transplant recipient on lifelong immunosuppression, many
specialists, a large medication burden, frequent labs). It is two apps over one shared
record: a web app that organizes, reviews, prints, and analyzes the full record, and a
mobile companion (PWA) for fast capture, emergencies, and doctor-visit capture. Data lives
in the browser's localStorage and syncs through the user's own Google Drive. No database.
AI features call Claude models through a stateless proxy. A core safety stance governs the
AI: it is informational only. It presents the patient's own data and questions to raise with
their care team. It never diagnoses, prescribes, or issues treatment directives, partly for
patient safety and partly because patient-facing clinical directives risk classifying the
software as an FDA-regulated medical device. The primary user is 61 and often using the app
under stress.

YOUR TASK
Generate an exhaustive list of critical issues, open questions, and feature gaps across the
ENTIRE product, not just one area. Cover at least: patient-safety and FDA/regulatory
boundaries, data model and sync integrity, AI behavior and grounding, storage and security
and privacy, individual module features and gaps, the emergency and critical path, onboarding
and data entry, reporting outputs, monetization and tier gating, accessibility for an older
user under stress, and testing and release safety. Prefer sharp, specific, non-obvious items
over generic ones. Where you assert anything about law or regulation, flag your confidence and
note that it needs verification, because your training data may be stale.

ALREADY DECIDED (do not raise these as open gaps; you may still flag a specific risk or
implementation subtlety inside them, but do not re-argue the policy)
- The AI is informational only: no diagnosis, no prescribing, no treatment directives. Settled.
- Emergency and critical-lab alerts run as a deterministic tripwire layer OUTSIDE the AI, on
  fixed thresholds, routing the user to care without naming a condition. Settled.
- Critical-lab thresholds use the patient's physician-set individualized ranges with attributed
  provenance, not generic defaults. Settled.
- Account hardening (two-step verification, alphanumeric passwords, per-user auth) is
  intentionally deferred until before a second user's data enters the system. Settled deferral.
- Encryption at rest is committed before multi-user and is a deliberate deferral for now; the
  present single-user plaintext posture is an accepted choice. Settled deferral.
- Storage stays patient-controlled: localStorage plus the user's own Google Drive. No server-side
  storage of patient data is intended.

SORT EACH ITEM INTO ONE OF THREE BUCKETS
Bucket 1, Decision: judgment, values, regulatory, safety, privacy, pricing, or what the app
is willing to say. These need a human decision, not an answer from you. Add "needs-attorney"
for anything touching the FDA device line, recording-consent law, or clinical thresholds.
Bucket 2, Design: schema, UX, AI prompt design, feature specs, architecture that does not
need the codebase. These want a written spec.
Bucket 3, Code: implementation or debugging that needs the actual repo.
When unsure, sort UP (toward Decision), not down. Do not sort a safety or regulatory question
into Design or Code just because you could answer it.

OUTPUT FORMAT (use exactly these fields per item)
ID: (use a prefix of your choosing plus a number)
Title:
Bucket: 1 | 2 | 3 (and needs-attorney if relevant)
Area:
Question / issue:
Why it matters:
Options / considerations: (optional)
Owner: Greg | Greg + attorney | Design (LLM) | Claude Code
Feature implication:

WORKED EXAMPLES (match this depth and shape; these are real items already in the inventory)

ID: CL-001
Title: How the AI answers a direct "do I have rejection / what is wrong with me" question
Bucket: 1, needs-attorney
Area: AI Analysis, cross-cutting safety
Question / issue: When the user asks the AI point-blank to diagnose, what exactly does it do?
Why it matters: A direct diagnostic answer is the clearest possible device-defining behavior
and the highest-stakes wrong answer the app could give. The handling must be deliberate, not
whatever the model happens to say.
Options / considerations: Decline and reframe to "here is your data and what to ask [doctor]";
route to the tripwire layer if a critical value is involved; log the pattern for review.
Owner: Greg + attorney
Feature implication: A defined "diagnostic-request handler" in the AI layer with fixed
reframing behavior, separate from normal Q&A.

ID: CL-002
Title: Is Emergency Info reachable without the PIN unlock?
Bucket: 1
Area: Companion, Emergency Info, security
Question / issue: The Emergency Info screen exists so an EMT or ER nurse can see must-know
status instantly, but the app is PIN-locked. Can a first responder reach it while the patient
is unconscious?
Why it matters: A safety feature that is unreachable in the exact emergency it was built for
is not a feature. But exposing the full record pre-unlock is a privacy hole. This is a real
tradeoff only Greg can set.
Options / considerations: A pre-unlock, read-only Emergency Info view limited to must-know
fields; a lock-screen shortcut or QR; require nothing more than device unlock.
Owner: Greg
Feature implication: A scoped, pre-unlock Emergency Info surface distinct from the full record.

ID: CL-003
Title: The record transits the AI proxy, which sits against the "no PHI on our servers" claim
Bucket: 1
Area: Privacy positioning, AI proxy
Question / issue: Marketing says no patient data touches Insina servers, but AI calls send the
record context through the Insina-operated proxy to reach Claude. Even if the proxy is
stateless and zero-log, the data transits infrastructure Insina runs.
Why it matters: The privacy claim is a core trust and positioning pillar. If it is not
literally accurate, it needs precise wording ("we do not store" versus "never touches"), or the
architecture needs to change, before it is said publicly.
Options / considerations: Reword to "no patient data is stored on our servers"; document the
zero-log transit path; consider a direct-to-Anthropic path that removes the proxy from the PHI
route. Note that at-rest encryption does NOT resolve this, since the record must reach the model
in readable form; at-rest and in-transit are separate axes.
Owner: Greg
Feature implication: A precise privacy statement plus, possibly, a re-architected AI call path.

ID: CL-004
Title: iOS eviction of localStorage for an installed PWA
Bucket: 2
Area: Data durability, storage
Question / issue: iOS can evict a PWA's local storage after roughly seven days of non-use.
Since the browser is the live store, a user who does not open the app for a week could return
to an empty local dataset, rebuilt only from the last Drive sync.
Why it matters: For a person whose full medication list and critical labs live here, silent
data loss is a safety issue, not just an annoyance.
Options / considerations: Treat Drive as the source of truth and localStorage as a cache;
force a Drive pull on every cold start; warn the user if local looks empty but Drive has data.
Owner: Design (LLM), then Claude Code
Feature implication: An explicit cache-versus-truth model with cold-start hydration from Drive.

ID: CL-005
Title: "Local wins" merge can silently drop a concurrent edit
Bucket: 2
Area: Sync, data integrity
Question / issue: The merge rule unions arrays and resolves object conflicts as local-wins.
If the web app and companion both edit the same medication before syncing, one edit can be
overwritten with no trace.
Why it matters: A silently dropped dose change or discontinuation on a transplant med list is
a patient-safety failure, not a merge cosmetic.
Options / considerations: Per-field last-write-wins with timestamps; conflict surfacing to the
user for medical records; an edit log so a dropped change is at least recoverable.
Owner: Design (LLM), then Claude Code
Feature implication: A conflict-aware merge for medical records, with user-visible resolution
for meds specifically.

ID: CL-006
Title: What stops the AI from citing a lab value or date that is not in the record?
Bucket: 2
Area: AI grounding
Question / issue: The AI's value depends on being grounded in the actual record. What prevents
it from inventing a plausible-looking value, date, or trend?
Why it matters: A confidently fabricated lab value is worse than no answer, especially if the
user carries it into an appointment as fact.
Options / considerations: Constrain outputs to reference only supplied structured data; a
post-generation check that every cited value appears in the record; show the source row.
Owner: Design (LLM), then Claude Code
Feature implication: A grounding-and-verification layer that ties every cited figure to a
record entry.

ID: CL-007
Title: Is the Record Integrity Engine in scope, and its four open decisions
Bucket: 1 and 2
Area: RIE, data quality
Question / issue: The RIE (background data-quality service: spell check on free text, a
controlled medical dictionary, cross-module consistency checks, report preflight, AI-context
completeness) is fully specced but absent from the current build's feature map. Is it in scope,
deferred, or dropped? Four decisions remain: spell-check library, "dismiss permanently" reset
behavior, whether missing AI context hard-blocks or warns, and audit-log retention.
Why it matters: Data completeness drives AI quality, and RIE is architecturally separated from
AI Analysis specifically to keep the data-quality function on the non-device side of the line.
Its scope status affects both quality and regulatory posture.
Options / considerations: Confirm in or out; if in, resolve the four decisions before building;
keep the RIE-versus-AI-Analysis separation intact either way.
Owner: Greg for scope and the four decisions; Design (LLM) for the spec
Feature implication: Either a full RIE module spec or an explicit deferral recorded as a decision.

END OF EXAMPLES. Now generate as many new items as you can in this format, across every area
listed. Aim for breadth first, then depth. Do not repeat the examples above; extend past them.

============================ COPY ABOVE THIS LINE ============================

---

## 6. Seed intake: Claude's questions

The seven worked examples above (CL-001 to CL-007) are live seed items, not just samples. The
items below extend the inventory across the rest of the product. Format is compressed to
title, bucket, owner, question, and feature implication; expand any of them to the full schema
when it moves to resolution.

### Safety and regulatory

**CL-008 - Per-session informational-only acknowledgment.** Bucket 1. Owner: Greg.
Should the AI module require an explicit, logged acknowledgment that it is informational only
before use, or is a persistent banner enough? Feature: a consent or acknowledgment gate on the
AI surfaces.

**CL-009 - Doctor Visit Capture recording consent under MS and LA law.** Bucket 1,
needs-attorney. Owner: Greg + attorney. Does the consent notice actually satisfy the recording
laws of both Mississippi and Louisiana for the states the user records in? Feature: a
verified, state-aware recording-consent flow.

**CL-010 - Proactive flags versus the interpretation line.** Bucket 1. Owner: Greg.
The Today screen surfaces proactive pattern flags (BP drifting up, a trough trending low). Does
surfacing a concern the user did not ask about cross from display into interpretation? Feature:
a defined boundary for what proactive flags may say, aligned with DEC-002.

**CL-038 - Transcription provider is a gated decision: audio stays on-device until it is
made.** Bucket 1, needs-attorney. Owner: Greg + attorney. Logged 2026-08-03 from the
voice-recording security review. Visit-capture transcription currently defers (stubbed) —
audio never leaves the phone. Turning it on means shipping recorded clinical conversations to
a speech-to-text service: the single largest data exposure this product could take on.
Decision inputs before ANY provider ships: provider retention and model-training terms (no
BAA on consumer APIs); the fact that a voice defeats P-01 identity minimization (spoken names
and voiceprints identify the patient and clinician regardless of payload pseudonymization);
bystander voices captured without consent; and interaction with CL-009 (MS/LA recording-
consent verification, also needs-attorney — the two should go to the attorney together).
Standing rule until decided: transcription remains OFF and audio remains device-local. Same
gating discipline as the tripwire thresholds (DEC-026/DEC-044). Feature: an approved
transcription pathway with documented provider terms — or a recorded refusal.

### Data model and sync

**CL-011 - Schema versioning and backup migration.** Bucket 2. Owner: Design, then Code.
When the data model changes, how are older Drive backups migrated forward without loss? Feature:
a versioned schema with a migration path on restore.

**CL-012 - Single-backup-file loss and recovery.** Bucket 1 and 2. Owner: Greg, then Design.
If the single Drive backup is corrupted or deleted, what is the recovery story? Weekly rolling
snapshots help, but is that enough for a medical record? Feature: a defined backup-integrity and
recovery model, possibly with local export prompts.

### AI behavior

**CL-013 - Haiku for companion clinical Q&A.** Bucket 1 and 2. Owner: Greg.
The cheap companion model is Haiku. Is a lower-capability model appropriate for clinical Q&A on
the go, even informational, or should the companion route critical questions to a stronger
model? Feature: a model-routing policy tied to question sensitivity.

**CL-014 - Keeping the AI system context in sync with the record.** Bucket 2. Owner: Design,
then Code. The AI system prompt carries full clinical context (diagnoses, meds, labs, avoidance
lists). How is that kept current as the record changes mid-session? Feature: a context-assembly
step that rebuilds from the live record per query.

**CL-032 - Consequence-gated model routing (A-11).** Bucket 3, gated. Owner: Greg, then
Claude Code. Cheaper models per surface, governed by consequence of error, not task
complexity: Haiku candidates are note summaries (Surface C) and report annotation (Surface H);
extraction, symptom prep, and all lab interpretation stay on Sonnet or better. Gated on the
A-01 threshold fixtures and the A-09 prompt rollout being stable; each reassignment is a
one-line MODEL_MAP change validated against the prompt spec section 9 checklist (DEC-018).
Feature: per-surface MODEL_MAP reassignments under the settled routing policy.

### Storage, security, privacy

**CL-015 - Four-digit PIN strength. RESOLVED by DEC-007.** The 4-digit PIN is accepted as
proportionate for single-user use; 2FA, alphanumeric passwords, and per-user auth are deferred
until before a second user's data enters the system, with that trigger recorded. Kept here for
traceability; do not re-open.

**CL-016 - Drive OAuth scope.** Bucket 2 and 3. Owner: Design, then Code. Falls under the
DEC-007 pre-multi-user hardening gate. Confirm the app requests the narrowest Drive scope
(appDataFolder only) and not broad Drive access. Feature: a documented, minimal OAuth scope.

**CL-017 - Proxy abuse and session auth.** Bucket 2 and 3. Owner: Design, then Code. Falls under
the DEC-007 pre-multi-user hardening gate. What prevents a third party from calling the AI proxy
endpoint directly? Feature: proxy session authentication and rate limiting.

**CL-031 - Storage abstraction layer ahead of encryption.** Bucket 2, then Code. Owner: Design,
then Code. Per DEC-008 (OPEN-6), build the unified read/write interface over localStorage and
Drive before encryption, so encryption is a contained change to one layer rather than a rewrite
of every read, write, merge, and restore. Feature: a storage abstraction layer that the eventual
at-rest encryption plugs into.

**CL-033 - BYO-key routing sub-decision: proxy-forwarded versus direct (S-08).** Bucket 1.
Owner: Greg. Per DEC-016 the BYO tier is kept, hardened at release; the open call is whether
BYO traffic transits the stateless proxy per request (keeps the model allowlist and caps in
the loop; current lean) or goes direct from the browser (the key never touches Insina
infrastructure; allowlist enforcement drops to the client). Decided at S-08 implementation
and logged as its own DEC. Feature: the hardened BYO call path.

**CL-035 - Move large binaries out of localStorage into IndexedDB (encrypted blobs).**
Bucket 2, then Code. Owner: Design (LLM), then Claude Code. Logged 2026-07-21 on a measured
trigger: Greg's real record stands at **3.53 MB of localStorage** — ~70% of Safari's ~5 MB
floor — dominated by base64 insurance-card images (`mi_cards`) plus the ~33% ciphertext
encoding overhead, and still growing (875 labs and counting). localStorage exhaustion is the
ugly failure mode: several write paths silently swallow `QuotaExceededError`, so a full store
means silently dropped writes on a medical record. The fix is NOT a wholesale IndexedDB
migration (the P-02 sync-read interception depends on localStorage semantics; 167 call sites) —
it is moving the large binaries only: card images and future document scans/photos become
encrypted blobs in IDB, where the origin-bucket quota is effectively unlimited, while all
structured JSON stays where it is. Precedents already in-tree: `visitCapture.js` stores visit
audio in IDB; `folderBackup.js` (DEC-040) persists its directory handle there. Companion
quick wins to spec alongside: call `navigator.storage.persist()` + surface
`navigator.storage.estimate()` usage in Settings & Backup, and unify quota-error handling so
no write path swallows QuotaExceededError silently (cards.js/Tab14 warn correctly; the
onboarding/task/advisory writers do not). Design must cover: migration of existing `mi_cards`
entries (A-08-style, backup-gated), the Drive/folder backup payload treatment of IDB blobs
(today's backups only walk `mi_*` localStorage keys — moved images must not silently vanish
from backups), and Emergency Card print + Tab02 read paths going async. Feature: an
encrypted-blob store for large binaries with quota telemetry, leaving the localStorage vault
architecture untouched.

**CL-037 - Encrypt visit-recording audio at rest (CL-035 companion).** Bucket 2, then Code.
Owner: Design (LLM), then Claude Code. Logged 2026-08-03 from the voice-recording security
review. Doctor-visit audio (`visitCapture.js`) is stored as raw blobs in IndexedDB — OUTSIDE
the P-02 vault, which encrypts managed `mi_*` localStorage only. That makes the app's single
most sensitive artifact (a clinician's voice discussing the patient's health, possibly
bystanders) its least-protected data on a lost or stolen phone. Current mitigations are real
and stay: device-local only (audio never rides Drive/folder backups), 30-day auto-delete
after summarization, consent-gated capture. Fix shape: encrypt blobs with the vault DEK
before the IDB write and decrypt on read — same encrypted-blob store design as CL-035's
card-image migration, so the two should be specced together. Design must cover: playback
path decrypt, the locked-vault state (no DEK → recording buffered or refused, decided
explicitly), and migration of any existing unencrypted blobs. Feature: visit audio encrypted
at rest under the vault key.

### Modules and gaps

**CL-018 - Reports needing the informational-only revision.** Bucket 1 and 2. Owner: Greg,
then Design. Which of the generated reports (Patient Profile, Medication, AI Health Analysis,
Consultation Prep, ED Prep Packet) contain directive or interpretive language that DEC-001
requires rewording? Feature: a copy pass across all report templates.

**CL-019 - Custom lab ranges versus provider-set critical ranges.** Bucket 2. Owner: Design.
Labs already supports custom reference ranges. How does that relate to the attributed,
provider-set critical ranges from DEC-005? Are they the same field or two? Feature: a unified
range model that distinguishes patient-custom display ranges from provider-set critical
thresholds with provenance.

**CL-020 - Food Log scope.** Bucket 1. Owner: Greg.
Is the voice-activated, allergen-tagged Food Log with symptom correlation in scope, deferred, or
dropped? It is absent from the current map. Feature: a Food Log spec or a recorded deferral.

**CL-021 - Symptom-to-trigger correlation window.** Bucket 2. Owner: Design.
If symptom correlation ships, what is the trailing window (the 2 to 48 hour range was discussed)
and against what inputs? Feature: a defined correlation engine spec.

**CL-022 - One-way versus two-way calendar sync.** Bucket 1 and 2. Owner: Greg.
Calendar sync is currently read-only into Appointments. Should appointments created in Insina
push back out? Feature: a decision on sync directionality and, if two-way, the write path.

**CL-034 - Saving AI analyses into the record beyond Notes.** Bucket 1. Owner: Greg.
DEC-022 approved Save to My Notes with an explicit AI-generated label. The parked remainder:
should AI-generated analyses enter the record proper (Documents or structured stores)? AI
content entering the record needs explicit labeling, provenance, and its own DEC. Feature: a
labeled AI-content pathway into the record, or a recorded refusal.

### Emergency and critical path

**CL-023 - First-responder access to Emergency Info.** Bucket 1. Owner: Greg.
Beyond CL-002, should Emergency Info be shareable to a first responder without the phone owner
present, for example a printed card or a lock-screen medical ID handoff? Feature: an offline,
shareable emergency summary.

### Onboarding and data entry

**CL-024 - Trial storage to persistent storage transition.** Bucket 2. Owner: Design.
localStorage is framed as an onboarding and trial tier. What is the UX for moving a user from
local-only trial to Drive-backed persistent storage without data loss? Feature: a storage-tier
upgrade flow.

**CL-025 - PDF parse correction flow.** Bucket 2. Owner: Design.
When AI parsing of an imported PDF mis-reads a lab or dose, what is the confirmation and
correction path? This is the "flag, do not fix" principle applied to import. Feature: a
review-and-confirm step on every parsed import, with nothing auto-committed.

### Monetization

**CL-026 - Tier gating specifics.** Bucket 1. Owner: Greg.
Exactly what is gated across Free, Standard, and Advanced, beyond model tier and Doctor Visit
Capture? Feature: a documented feature-by-tier matrix.

**CL-027 - iOS billing path.** Bucket 1. Owner: Greg.
Is web billing confirmed as the billing path to avoid the app-store cut, and does that hold for
the companion PWA? Feature: a decided billing architecture.

### Accessibility and usability

**CL-028 - Older user under stress.** Bucket 2. Owner: Design.
The primary user is 61 and often using the app in a clinic or an ER. Has there been an
accessibility and cognitive-load pass (font sizes, tap targets, one-handed use, contrast)?
Feature: an accessibility baseline across both apps, with the emergency path prioritized.

### Testing and release

**CL-029 - Unit tests on the tripwire logic specifically.** Bucket 3. Owner: Claude Code.
The emergency and critical-lab tripwire (DEC-003, DEC-004) is life-safety logic in a fast,
manually iterated codebase. Does it have dedicated regression tests so a future change cannot
silently break it? Feature: a test suite guarding the deterministic threshold layer.

**CL-030 - Safer sandbox than a separate Chrome profile.** Bucket 2 and 3. Owner: Design,
then Code. Test data currently requires a separate browser profile. Is a proper demo or sandbox
mode safer and less error-prone? Feature: an isolated sandbox mode that cannot touch real data.

---

## 7. The features-list rollup (the endpoint this document builds toward)

As each item resolves, record the outcome here. When this table is complete and every item is
closed, this section is the all-inclusive features list.

| Feature | Module / surface | Description | Status | Source |
|---|---|---|---|---|
| Provider-set critical ranges | Labs, cross-cutting | Critical-lab thresholds use physician-set individualized ranges with attributed, dated provenance | Decided, not built | DEC-005, CL-019 |
| Emergency tripwire layer | Cross-cutting | Deterministic threshold check outside the AI that routes to emergency care, covering critical labs and vitals | Specced | DEC-003, DEC-004, CL-029 |
| Informational-only AI stance | AI Analysis, reports | AI presents data and questions for the care team; no diagnosis or directives | Settled (policy); copy pass pending | DEC-001, CL-018 |
| Account hardening (2FA, alphanumeric, per-user auth) | Auth, cross-cutting | Deferred until before the first additional user; 4-digit PIN accepted for now | Decided (staged), trigger recorded | DEC-007, CL-015 |
| Encryption at rest | Storage | Committed before multi-user; present plaintext is a deliberate single-user posture | Decided (staged) | DEC-008 |
| Storage abstraction layer | Storage | Unified read/write over localStorage and Drive; lands before encryption so encryption is a contained change | Decided, not built | DEC-008, OPEN-6, CL-031 |

Status values: Shipped | Specced | Decided (not built) | Open | Deferred.

Every row should trace back to at least one item ID or `DEC-NNN`, so the reasoning behind a
feature is always one lookup away.

---

## 8. Reconciliation checklist (run after collecting from all models)

- Merge duplicates. The same issue will arrive phrased three ways; keep the sharpest wording and
  list the alternate source IDs.
- Confirm each bucket. Re-sort anything a model pushed down into Design or Code that is really a
  Bucket 1 decision. Models sort toward "I can answer this."
- Flag disagreements. Where two models contradict each other, mark the item as contested and
  resolve it deliberately rather than picking the more confident phrasing.
- Verify every legal or regulatory claim. Treat model assertions about FDA rules, state law, or
  recording consent as unverified until checked. Some will be stale or wrong.
- Drop anything on the ALREADY DECIDED list that a model raised as an open gap, unless it surfaces
  a genuine new risk or subtlety inside a settled item.
- Assign owners. Every item needs one, and every `needs-attorney` item is flagged for counsel
  before it is closed.
- Roll resolved items into Section 7, and route judgment calls into `DECISIONS.md`.
