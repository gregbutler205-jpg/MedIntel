# Insina Health Decisions Log

This file records **why** the system is the way it is: the load-bearing decisions,
the reasoning behind them, and the alternatives that were rejected. It is deliberately
distinct from the other two repo docs:

- **DECISIONS.md** (this file): why a thing was decided, and what reversing it would undo.
- **CHANGELOG.md**: what shipped and when.
- **CLAUDE.md**: how the project works (context for building).

Keep them separate. A feature that ships is a CHANGELOG entry. A choice you would not
want silently reversed six months from now is a DECISIONS entry.

---

## For Claude Code

Read this file at the start of every session, alongside CLAUDE.md. Do not reverse or
re-implement anything marked **Settled** without explicit instruction from Greg. If a
task would contradict a Settled decision, stop and flag it rather than proceeding.

---

## Conventions

- **Append-only.** Never edit away an old decision. To change one, add a new entry and
  mark the old one `Superseded by DEC-NNN`. The history of the reasoning is the point.
- **Stable IDs.** Each entry has a `DEC-NNN` id. Cite it in commit messages and specs
  (for example: "implements DEC-005 provider-range provenance").
- **Status values:** `Settled`, `Settled (pending implementation)`, `Open`, `Superseded`.
- **Scope.** This file is for safety, regulatory, architectural, and data-integrity
  decisions. Routine UI and feature choices belong in CHANGELOG.md.
- **Standing caveat.** Entries that touch FDA classification or clinical thresholds
  reflect reasoning, not legal advice. They are marked where external regulatory counsel
  is required before commercialization.

## Standing regulatory context (so future sessions do not re-litigate it)

- The whole platform splits into two risk buckets. Aggregation, display, organizing,
  formatting, and exporting the patient's own records is essentially a personal health
  record: low risk, very likely not a device. The AI Analysis module is where device
  risk lives, and where the decisions below apply.
- Most 2025 to 2026 state health-AI laws target two actors Insina is not: providers using
  AI in diagnosis or treatment, and payers using AI in utilization review or prior
  authorization. Insina's real state touchpoints are narrower: developer-transparency
  statutes (Colorado AI Act, Texas TRAIGA) if the AI is deemed high-risk, and California
  AB 489 on license-implying naming (see OPEN-2). The state layer is unsettled: a federal
  effort to preempt state AI laws is underway, but as of mid-2026 those laws still stand.

---

## DEC-001: AI Analysis stays strictly informational (the device-line firewall)

**Date:** 2026-07-02
**Status:** Settled (principle). Marketing and overview copy alignment is Open (OPEN-1).

**Decision.** The AI Analysis module presents the patient's own data and the questions to
raise with their care team. It does not interpret disease state, declare what is clinically
wrong, or issue treatment or management directives. "Things to discuss with [doctor]" is the
substance of every output, not a disclaimer appended to a conclusion.

**Reasoning.** FDA reissued its final Clinical Decision Support (CDS) guidance on 2026-01-06
(reissued 2026-01-29). It states that CDS intended to provide recommendations to patients or
caregivers (non-clinicians) generally meets the device definition, and that existing device
policies continue to apply to patient-facing software functions. The general wellness
off-ramp is unavailable because Insina is explicitly disease-specific (transplant,
immunosuppression), not general wellness. Intended use is established largely by claims and
marketing, so directive-style output is itself evidence that can convert the software into a
regulated device. A "does not diagnose" disclaimer does not neutralize this, because FDA
reads function and claims, not disclaimers.

**Alternatives rejected.**
- Let the AI state clinical conclusions (for example "critically sub-therapeutic, requires
  immediate action"). Rejected: directive-giving is the device-flavored behavior being avoided.
- Rely on a disclaimer to cover directive output. Rejected: disclaimers do not control the
  FDA intended-use analysis.

**External validation.** The device-classification line should be reviewed by an FDA
regulatory attorney before the AI module is commercialized.

**Related:** DEC-002, DEC-003, OPEN-1, OPEN-2, OPEN-5.

---

## DEC-002: The operative line is tripwire vs. clinical interpretation, not urgent vs. not urgent

**Date:** 2026-07-02
**Status:** Settled

**Decision.** The app may recognize a value crossing a known threshold and route the person
toward care with appropriate urgency (a "tripwire"). It must not interpret why a value is
abnormal, declare what it means about the disease, or state a management step. Routing and
speed statements are allowed; diagnosis and treatment statements are not.

**Reasoning.** "This number can be an emergency, seek care now" is a routing statement, the
same category as a smoke detector or a pharmacy red-flag line. "Your level is sub-therapeutic
and needs action" is a clinical judgment about the patient's disease. Both feel urgent to the
patient; only the second is the thing regulators treat as a device function. The referral must
be the endpoint of a display function, not a caveat bolted onto a conclusion already delivered.

**Alternatives rejected.**
- Treat all urgency as forbidden to stay maximally conservative. Rejected: that produces a
  product that stays calm and analytical while a patient is at 220/180, which is both
  indefensible and unsafe.

**Related:** DEC-001, DEC-003.

---

## DEC-003: Emergency escalation runs as a deterministic layer outside the AI

**Date:** 2026-07-02
**Status:** Settled (principle). Threshold table and firing copy pending (OPEN-3).

**Decision.** Red-flag escalation is a hard-coded threshold check, separate from the AI
Analysis narrative. It fires identically every time on a number, points the person to emergency
services or their care team, and does not name a diagnosis. It is deliberately not generated by
the language model.

**Reasoning.** Keeping escalation as plain threshold logic keeps it in the defensible safety
tripwire category rather than entangled with the interpretive module. Separately, a generative
model should not be the thing deciding whether someone is having an emergency; that decision
must be deterministic and repeatable. This is the one place where "AI proposes, patient
disposes" is the wrong pattern: an emergency tripwire should fire, not propose.

**Alternatives rejected.**
- Omit emergency escalation to appear more conservative. Rejected: leaving it out is the actual
  safety failure, not a conservative virtue.
- Let the LLM decide case by case what counts as an emergency. Rejected: non-deterministic and
  unsafe for a life-safety function.

**Implementation guidance.** Keep the emergency thresholds a short, fixed, well-established list
drawn from standard sources. Point to emergency services, not to a named condition (say "seek
emergency care," not "you may be in hypertensive crisis"). Keep the check in its own code path,
not in the model prompt.

**External validation.** Where "obvious red-flag value" ends and "clinical interpretation"
begins is a judgment call at the margins; the threshold list and its firing copy should be
reviewed by regulatory counsel.

**Related:** DEC-002, DEC-004, OPEN-3, OPEN-5.

---

## DEC-004: The tripwire layer covers critical labs, not only vital signs

**Date:** 2026-07-02
**Status:** Settled

**Decision.** The red-flag threshold layer includes critical laboratory values, tacrolimus at
both the low and high ends, not just acute vital signs.

**Reasoning.** For a liver-transplant recipient, a tacrolimus level that is too low is not
benign. Sustained sub-therapeutic levels are how rejection gains a foothold and can threaten the
graft. A vitals-only emergency layer would miss dangerous labs entirely. Both ends of the range
carry real risk and both belong in the tripwire.

**Alternatives rejected.**
- Limit the tripwire to acute vital-sign emergencies such as 220/180. Rejected: labs can be
  red-flag values too, and for this patient population the low end of a drug level is as
  dangerous as the high end.

**Related:** DEC-003, DEC-005.

---

## DEC-005: Critical thresholds use provider-set, individualized ranges with attributed provenance

**Date:** 2026-07-02
**Status:** Settled (principle). Schema and provenance model pending (OPEN-4).

**Decision.** Critical-lab tripwires fire against the range the patient's treating physician set
for that individual (example: a tacrolimus target of 3 to 6 for a tac-sensitive living-donor
recipient, not the lab default of 5 to 20). The range is captured by prompting the patient to
obtain it from their provider (via Consultation Prep) and is stored as a distinct, attributed,
dated field that records the provider as the author. It is not blended into a generic
"normal range" column.

**Reasoning.** Applying a clinician-set parameter is about as far from "software making the
clinical call" as possible; it is closer to a reminder than to CDS. It moves the clinical
judgment back to the clinician and leaves the app with only "did we cross the line the physician
drew." Provenance must be legible: if asked what basis the app used to flag a value, the answer
should be "the range the patient's hepatologist specified for them." This also fixes the
generic-threshold failure mode, where a fixed default would either cry wolf or, worse, stay
silent inside an atypical patient's real danger zone.

**Alternatives rejected.**
- Hard-coded generic reference ranges for critical labs. Rejected: wrong for atypical patients,
  and authored by the software rather than by the physician.

**Implementation guidance.** When a tripwire fires, cite the provider's threshold, state the
stakes in general terms, and route to the care team. Do not explain why the value changed or
what it implies about the graft. Store provider-set ranges as their own field with author and
date, separate from any generic reference range.

**Related:** DEC-004, DEC-006, OPEN-4.

---

## DEC-006: A missing critical-lab range surfaces a prompt, never a silent default

**Date:** 2026-07-02
**Status:** Settled

**Decision.** When a patient has no provider-set range for a critical lab, the app surfaces a
Consultation Prep prompt asking them to obtain their target range from their care team. It does
not silently substitute a generic default and flag against it.

**Reasoning.** Falling back to a generic range reintroduces the exact problem DEC-005 solved and
can under-alert a sensitive patient. The app must never be the author of a critical threshold,
including by default.

**Alternatives rejected.**
- Silent fallback to a generic lab reference range when the personalized range is absent.
  Rejected: under-alerts atypical patients and makes the software the threshold's author.

**Related:** DEC-005.

---

## DEC-007: Account-level security hardening is staged, deferred until before the first additional user

**Date:** 2026-07-02
**Status:** Settled (staged). Trigger: before any second person's data enters the system. Component split: the password component is resolved by DEC-009 (passphrase encryption, before any second user); the 2FA component's trigger is refined by DEC-010 (server-side login surface).

**Decision.** Two-step verification, alphanumeric passwords, and per-user authentication are
deferred. The app currently uses a 4-digit PIN (SHA-256, session unlock) plus inactivity
auto-lock, and that is accepted as proportionate for the current single-user, single-owner-device
situation. The deferred hardening is committed to land before any person other than Greg stores
data in the app.

**Reasoning.** 2FA and per-user auth protect an account boundary that does not exist in a
single-user app. Building them now would mean designing against a multi-user architecture that has
not been designed yet. The 4-digit PIN protects a local-only store on a device Greg controls,
which is a proportionate posture for n-of-1 use. The risk this defers (weak brute-force resistance
on a 10,000-value PIN space) is bounded because the hash is not synced and the data is local.

**Trigger (explicit, so the gate is not missed).** The hardening must be implemented before the
first non-Greg user's data enters any instance. Onboarding a second user without it is a gate
violation, not a later cleanup.

**Alternatives rejected.**
- Build 2FA and per-user auth now. Rejected: premature, against an undesigned multi-user model.
- Leave the trigger unstated ("handle it before launch"). Rejected: a deferral with no named
  trigger is how pre-launch gates get skipped.

**Related:** DEC-008, CL-015, CL-016, CL-017.

---

## DEC-008: Encryption at rest is committed before multi-user; present plaintext is a deliberate posture; the storage abstraction layer lands first

**Date:** 2026-07-02
**Status:** Settled (staged), with one present-tense sub-item (the abstraction layer). Amended by DEC-009: encryption mechanism specified (passphrase-derived, PG-10); the accepted plaintext posture ends at the pilot gate.

**Decision.** Three parts.
1. The current posture, the full record stored as plaintext in localStorage and as a plaintext
   JSON on the user's Google Drive, is accepted as a deliberate choice for the current single-user
   situation, protected by the device login, the Google account, and the app PIN.
2. Encryption at rest is committed to land before any additional user stores data, alongside the
   hardening in DEC-007.
3. The storage abstraction layer (a unified read/write interface over localStorage and Drive)
   should be built earlier than the encryption itself, so that adding encryption later is a
   contained change to one layer rather than a rewrite of every read and write, the merge logic,
   and the restore path.

**Reasoning.** For a single-user app on a controlled device, plaintext at rest behind existing
logins is a legitimate posture, but it is one worth choosing on purpose, because the data
(transplant status, medications, labs, insurance IDs) is already sensitive and already Greg's,
today. Encryption is not a flip-the-switch pre-launch task: it changes the data model and touches
storage, backup format, merge, and restore. Bolting it on at launch, the same moment the first real
second user and their data arrive, is the highest-risk time to change how data is stored. Landing
the abstraction layer first de-risks that.

**Scope boundary (to prevent false comfort).** At-rest encryption does not address the AI proxy
transit question (CL-003). The record must reach the model in readable form to be used, so
encrypting localStorage and Drive does nothing about data passing through the proxy. At-rest and
in-transit-to-a-third-party are separate axes; CL-003 remains open on its own terms.

**Alternatives rejected.**
- File encryption entirely under "before launch" as a single late task. Rejected: it is partly a
  present-posture question about Greg's own data, and it is too data-model-invasive to safely land
  at launch without the abstraction layer already in place.
- Encrypt now. Not rejected on principle, but not required; the accepted single-user posture makes
  it optional at this stage. If chosen early, the abstraction layer still comes first.

**Related:** DEC-007, CL-003, OPEN-6.

---

---

## DEC-009: Amends DEC-008 — "password protection" means passphrase-derived encryption, not a login screen

**Date:** 2026-07-11
**Status:** Settled (pending implementation). Trigger: before any pilot user's data enters the system.

**Decision.** "Password protected," as a pilot-readiness milestone, means the password derives
an encryption key (PBKDF2 or Argon2 via WebCrypto) that encrypts the record at rest
(localStorage, AES-GCM) and before every Drive upload. A recovery-key export is required at
setup so a forgotten passphrase does not destroy the record. The existing 4-digit PIN may
remain as a quick-unlock convenience in front of decryption, but is not itself the security
boundary and must not be described as one in user-facing copy.

**Reasoning.** DEC-007/DEC-008 gated "encryption" before additional users without specifying
mechanism. In a non-custodial architecture, a password that only gates UI access (the current
PIN model) protects nothing: there is no server-side record for it to guard, and the underlying
data is plaintext in localStorage regardless.

**Related:** DEC-007, DEC-008 (amended by this entry), PG-10, APP_CHANGES_SPEC P-02.

---

## DEC-010: Two-step authorization deferred until a server-side login surface exists

**Date:** 2026-07-11
**Status:** Settled (deferred). Trigger: introduction of server-side accounts — itself a DEC-level event.

**Decision.** 2FA protects a remote account/login surface. This architecture has none — storage
is local/Drive, not server-authenticated accounts. Building 2FA now would protect nothing that
exists. Defer until server-side accounts are introduced, and treat that introduction itself as
a decision point: it is the first time this app would hold custodial data (login credentials),
which changes the non-custodial posture at DEC level and deserves its own entry, not a quiet
addition alongside an unrelated feature.

**Reasoning.** Refines DEC-007's bundled trigger for the 2FA component specifically: the
password component of DEC-007's deferred hardening is resolved by DEC-009 (passphrase
encryption, before any second user); the 2FA component waits for a login surface to protect.

**Related:** DEC-007 (trigger refined for the 2FA component), DEC-009, PILOT_GATE "Deferred".

---

## DEC-011: Clinical prompt content must be patient-generic or patient-injected, never founder-specific static text

**Date:** 2026-07-11
**Status:** Settled (pending implementation). Trigger: before any pilot user's data enters the system.

**Decision.** Static prompt text carries zero patient-specific clinical facts. Content is
either (a) condition-generic and gated on the patient's own injected problem list, or
(b) generated per patient and versioned like any other clinical content. This is a hard rule
for all AI-facing surfaces (Tab05, Tab11, Tab14, and any future tab), not a one-time cleanup.

**Reasoning.** Pilot review found the AI system prompts and reference-data blocks contain the
founder's specific clinical facts as hardcoded static text (serostatus, a specific prophylaxis
regimen, condition-specific dietary framing) rather than deriving them from injected patient
data. For a second user, the app would confidently deliver the founder's clinical context as
if it were theirs.

**Related:** PG-06, A-09, A-06, INSINA_AI_PROMPTS §1 (architecture principles).

---

## DEC-012: The RIE flag-don't-fix principle extends to the AI prompt-build layer

**Date:** 2026-07-11
**Status:** Settled (pending implementation). Trigger: before any pilot user's data enters the system.

**Decision.** Any correction to patient-entered clinical terminology, wherever in the codebase
it happens, routes through the Review Queue for explicit patient confirmation. No silent
rewrites of clinical fact, full stop — this was already the rule for RIE itself; this decision
closes the gap where a similar rewrite existed outside RIE's scope.

**Reasoning.** The surgical-history prompt-injection step silently rewrites "kidney
transplant"/"LDKT" to "Liver Transplant (LDLT) [corrected]" before the model ever sees it —
the same class of risk RIE's flag-don't-fix principle exists to prevent, but outside RIE, in
prompt-construction code, invisible to the patient, and corrupting for any real
kidney-transplant user.

**Related:** PG-07, A-05, the RIE flag-don't-fix principle.

---

## DEC-013: Deterministic urgency thresholds must be evaluated in code, not left to the model

**Date:** 2026-07-11
**Status:** Settled (pending implementation). Required before pilot, and independently required for the SaMD positioning already on record.

**Decision.** Incoming labs are evaluated against `URGENCY_THRESHOLDS` deterministically at
import and sync time; the result is a flag the AI can explain and echo, never a classification
the AI originates. This applies per patient, since thresholds may carry personalized
doctor-set ranges (existing custom-range handling).

**Reasoning.** `urgencyThresholds.js` defines critical lab bounds with a header comment
claiming Standard Mode AI uses them, but no code path evaluates the array. The LLM is
currently the only thing classifying lab-value urgency (Routine/Soon/Today/Emergency), which
conflicts with the deterministic-tripwire-layer decision already on record (DEC-003).

**Related:** DEC-002, DEC-003, DEC-005, OPEN-3, OPEN-4 (both land via A-01), PG-09, A-01.

---

## DEC-014: Repo hygiene — no live credentials, no local-machine metadata, in the public repository

**Date:** 2026-07-11
**Status:** Settled. Immediate, independent of pilot timing.

**Decision.** `*.docx`, `.claude/`, and any file containing credentials are gitignored. Any
credential ever committed is treated as compromised and rotated immediately, not just deleted
from the working tree — deletion alone leaves it recoverable in git history and requires a
history purge.

**Reasoning.** A live GitHub personal access token was found committed inside a .docx file in
the repo root (undetected by GitHub's secret scanning, since docx is a zip container). Local
Claude Code settings, including local file paths, were also committed.

**Related:** PG-01, S-01, S-06.

---

## DEC-015: The AI proxy requires authentication and enforced rate limiting before any pilot user relies on it

**Date:** 2026-07-11
**Status:** Settled (pending implementation). Trigger: before any pilot user's data enters the system.

**Decision.** Rate limiting is enabled with a real cap; a hard Anthropic spend cap is set as a
backstop; and per-pilot-user bearer tokens are issued out-of-band as a right-sized stopgap for
a small invited group. Stronger device-attestation-based auth (App Attest / Play Integrity) is
deferred to the native migration, where it becomes feasible, and is not required to clear this
pilot gate.

**Reasoning.** The proxy currently has rate limiting disabled (`skip: () => true`) and relies
on CORS as its only access control, which does not stop non-browser requests. The proxy URL
and model allowlist are visible in the public repo's bundled client code.

**Related:** PG-04, S-05.

---

## DEC-016: BYO Anthropic key — keep, hardened, at release

**Date:** 2026-07-11
**Status:** Settled (direction and timing). Routing sub-decision Open, parked for S-08.

**Decision.** Keep. It completes the non-custodial architecture (data and compute both free of
lock-in), serves the heaviest users at their own cost, and keeps the app functional independent
of the proxy. Dormant through the pilot: A-02 removes the direct calls now; S-08 hardening
(encrypted at rest, session-only option, warning copy) lands at the release gate. Sub-decision
parked for S-08: proxy-forwarded (retains model allowlist and caps; key transits the stateless
proxy, never stored) versus direct-from-browser (key never touches Insina infrastructure).
Current lean: proxy-forwarded.

**Alternatives rejected.**
- Delete the BYO-key tier. Rejected: it is the compute half of the non-custodial story, and
  removing it makes the app proxy-dependent.

**Related:** A-10, S-08, DEC-018.

---

## DEC-017: Lab data windows for AI — 12-month digest default, 24-month on Advanced

**Date:** 2026-07-11
**Status:** Settled.

**Decision.** Both AI surfaces default to a 12-month per-analyte digest (last 6 values, window
min and max, computed trend line with first, last, direction, and draw count, delta, ranges,
tripwire status), with a 60-day full-resolution window alongside. Advanced mode gets the same
digest at 24 months, included app-side when the question is longitudinal or the patient
toggles it: the app decides inclusion, never the model (non-agentic by design). The trend line
keeps slow declines visible for analytes drawn more often than the listed values; full
per-month anchors remain optional future work. The AI window is a fixed default, independent
of the on-screen Trends toggle.

**Reasoning.** Tab 11 shipped the full lab history per call (cost, attention degradation);
Tab 05 shipped only the latest value per test (trend-blind, defeating the product's flagship
trend detection). One digest fixes both.

**Related:** A-03 (amended), DEC-018.

---

## DEC-018: AI cost policy — input-size levers first, model routing gated

**Date:** 2026-07-11
**Status:** Settled. Cost set applied to specs; A-11 gated.

**Decision.** The primary cost levers are input size and caching, applied now: the 12-month
digest replaces full-history payloads, builders order payloads cache-first (stable sections
lead, volatile trail), MODEL_MAP carries per-surface max_tokens, and document excerpts are
included only when referenced or newly added. Model downgrades are a secondary lever governed
by consequence of error, not task complexity: surfaces that read or interpret clinical values
stay on strong models; note summaries and report annotation are the Haiku candidates. No
reassignment ships until the threshold fixtures and prompt rollout exist to verify behavior
holds (tracked as A-11, deferred).

**Reasoning.** Founder approved cost reductions with standing permission; input-size and
caching levers carry no clinical-behavior risk, while model reassignment does and therefore
waits for the verification instruments.

**Related:** A-11, A-02, A-03, A-09, DEC-016, DEC-017.

---

## DEC-019: Input plausibility guard — two bands, distinct from the tripwire

**Date:** 2026-07-11
**Status:** Settled.

**Decision.** A versioned plausibility layer runs before tripwire evaluation at the same
hooks. Hard band (physiologically impossible, set beyond any recorded human value) blocks
manual save with correction suggestions the patient picks from; nothing auto-corrects. Soft
band (implausible but possible) confirms and saves with one tap and never blocks, because rare
extreme values are exactly what the tripwire exists to catch. Extraction values out of band go
to the RIE Review Queue with the raw extracted text; unit mismatches are their own flag, no
auto-conversion in v1.

**Reasoning.** Manual entry and OCR extraction can produce obvious errors (a systolic of 1138,
a lost decimal). Error-catching and urgency-flagging must not blur: a typo needs a correction
prompt, a real extreme value needs an urgent flag, and confusing the two harms in both
directions.

**Related:** A-12, DEC-013, the RIE flag-don't-fix principle.

---

## DEC-020: Analysis context gathering — bounded at five, one round, emergencies exempt

**Date:** 2026-07-11
**Status:** Settled.

**Decision.** Conversational analysis surfaces may ask up to 5 targeted questions in a single
batched round, only when answers would materially change the analysis; partial answers or a
request to proceed end the gathering; recorded facts are never re-asked; emergency-pattern
symptoms get the emergency response before any questionnaire. One-shot analyses get an
optional launch field injected as {sessionContext}, app-decided, non-agentic. Lab Q&A stays
capped at one question.

**Reasoning.** Good analysis sometimes needs context the record cannot contain. Unbounded
questioning degrades the product and adds cost.

**Related:** A-13, INSINA_AI_PROMPTS v2.3.

---

## DEC-021: UI change plan reconciled against the engineering specs

**Date:** 2026-07-11
**Status:** Settled.

**Decision.** The UI plan is kept as INSINA_UI_CHANGES.md with UI-N IDs and the shared phase
scheme. Reconciliation rulings: UI-6 (tripwire failure) and UI-5 (pseudonymized payloads) are
duplicates deferred to A-01 and P-01/P-03, keeping only their display constraints and approved
wording; UI-13 (replace PIN) is rewritten to defer to P-02, and its authentication/
recovery-reset language is removed as incompatible with the non-custodial encryption model;
UI-3 (lab grouping) is absorbed into A-04, a minimal version of which is pulled into Phase 1;
UI-15 (AI Analysis layout) merges with A-13 and adds the four-section response structure to
the prompt spec (v2.4). All other UI items carried through, reformatted and phase-aligned.

**Reasoning.** A separate UI assessment (~30 items) overlapped the engineering specs at nine
points, including two direct contradictions; one reconciled document prevents divergent
implementations of the same code.

**Related:** INSINA_UI_CHANGES.md, DEC-009 (UI-13 ruling), DEC-013 (UI-6 ruling), A-04, A-13.

---

## DEC-022: Save AI analysis to Notes, with an AI-generated label

**Date:** 2026-07-11
**Status:** Settled.

**Decision.** Approved. Analyses save into Notes as dated entries carrying an explicit
AI-generated label distinguishing them from clinician or patient-authored text, and remain
downloadable as markdown. The labeling requirement resolves the earlier concern; this is no
longer deferred.

**Reasoning.** The UI review approved "Save to My Notes" on the AI Analysis screen; a prior
amendment had deferred saving AI output into the record over a labeling concern. With the
label explicit, AI-generated content entering Notes is distinguishable at a glance and on
export.

**Related:** A-13, UI-15, DEC-021.

---

## DEC-023: Emergency access under full-record encryption — exportable packet, not in-app reduced-auth view

**Date:** 2026-07-11
**Status:** Option A settled; option B Open pending founder decision (OPEN-7).

**Decision.** (Option A, the safe default): emergency information is provided by the
exportable/printable Surface H ED packet the patient keeps outside the app (paper, phone
wallet, lock-screen medical ID). The live encrypted app exposes no no-passphrase view, so the
encryption boundary is not breached. Option B (a patient-designated, lighter-protected in-app
Emergency Card for a chosen subset) is a possible future addition and would require its own
DEC as a deliberate, documented weakening of the boundary. Built to A.

**Reasoning.** UI-13 called for a "limited Emergency Information view," which has no clean
answer once the record is encrypted behind a passphrase (P-02): any reduced-authentication
window into the live app is a hole in the encryption model.

**Related:** DEC-009, UI-13, P-02, Surface H, OPEN-7.

---

## DEC-024: Clinical Safety Core version 1.0 → 1.1 — tripwire evaluation envelope

**Date:** 2026-07-11
**Status:** Settled (shipped in prompt spec v2.1; logged here per §8 change control).

**Decision.** CSC rule 4 now receives tripwire flags inside an evaluation envelope with a
status of current, stale, or unavailable, plus evaluatedAt and newestLabDate. The model may
treat the absence of a flag as meaningful only when the envelope status is current; when stale
or unavailable it must say the app's threshold check has not run against the latest data,
treat flag status as unknown rather than reassuring, and route concerns to the care team.
CSC_VERSION bumps 1.0 → 1.1.

**Reasoning.** Without envelope status, a silent or failed tripwire engine reads to the model
— and therefore to the patient — as a clean bill. A missing check must never masquerade as a
passing one. (This is also the UI-6 ruling: tripwire failure cannot produce false
reassurance.)

**Related:** DEC-013, A-01, INSINA_AI_PROMPTS §3, §6, §8, UI-6.

---

## DEC-025: Prompts-as-code rollout (A-09) — hardcoded clinical facts removed; four surfaces built but not wired

**Date:** 2026-07-12
**Status:** Settled (shipped in code; logged per the master prompt's ground rule 2).

**Decision.** Tab11, Tab05, and Tab10's inline system-prompt strings are replaced by the shared
`src/prompts/` builders (CSC v1.1 + per-surface delta). In the process, every hardcoded
patient-specific clinical fact standing in as a "no data yet" fallback — real diagnoses,
medications, doctors' names, and an entire unconditional NSAID/Tacrolimus/diet/infection-risk
reference block injected for every patient regardless of recorded diagnosis — is deleted, not
carried forward. Tab05's two AI calls also stop sending the patient's real legal name.
Surfaces D (document extraction), E (Vision OCR), F (companion visit summary), and H (report
generation) are built to spec but deliberately not wired into their real candidate call sites,
because each of those call sites has an output contract (a JSON extraction schema feeding
record creation, or a JSON schema feeding `confirmMedChange()`'s med-change pipeline, or a
free-text-only report with no template layer) that the spec's version doesn't match — wiring
them is a data-model or feature redesign, not a prompt swap. Surface G (symptom preparation) has
no consumer at all; no symptom-prep screen exists yet.

**Reasoning.** CSC rule 7 (data fidelity) prohibits presenting fabricated defaults as record
data — a fallback string reading "Tacrolimus (Prograf) 3mg BID" when no medication is actually
on file is exactly the kind of thing rule 7 exists to prevent, regardless of whether it
originated as founder placeholder content. CSC rule 12 (identity) prohibits sending the
patient's legal name; the AI-facing side of Tab05 predated that rule. The condition-specific
safety block (NSAID/Tacrolimus interactions, diet restrictions, infection risks) unconditionally
injected on every request is what A-06's conditionModules mechanism exists to replace with
per-patient, per-condition selection — leaving it hardcoded in the interim would mean every pilot
user, not just a liver-transplant patient, receives founder-specific dietary and drug-interaction
guidance. Ground rule 5 (scope discipline) governs the deferred surfaces: forcing D/E/F/H's real
consumers onto the spec's output contract this item would silently break working extraction and
med-confirmation pipelines outside what A-09 itself specifies.

**Related:** A-09, A-02, A-03, A-06, A-01, P-01, A-05, INSINA_AI_PROMPTS §2, §3, §7, §9.

---

## DEC-026: Tripwire engine v1 default library — universal panic values only, gated unreviewed; "unavailable" extended to cover an unreviewed library

**Date:** 2026-07-12
**Status:** Settled (Greg's decision via AskUserQuestion during A-01; shipped in code).

**Decision.** A-01's spec limits the default threshold library to "analytes with defensible
universal critical bounds" without enumerating them, and separately states the library "sit[s]
behind the same clinical review gate as modules" (INSINA_AI_PROMPTS §6). Rather than have Claude
Code pick the actual numbers unilaterally, Greg was asked directly. Decision: seed v1 with six
genuinely diagnosis-agnostic panic-value analytes only — Potassium, Sodium, Glucose, Hemoglobin,
Platelets, WBC, urgent tier only (no "abnormal" tier, since normal ranges are far less universal
than panic values) — sourced from widely published clinical critical-value conventions, not
authored clinical judgment of this app's own. `src/config/tripwireDefaults.js` ships with
`reviewedBy: null`, gated by the same `mi_allow_unreviewed_modules` flag as
MOD-IMMUNOSUPPRESSION (one "founder preview" toggle, not two) — meaning the urgent tier produces
zero flags for any pilot user, including Greg by default, until he reviews and approves it.
Everything transplant/tacrolimus-specific from the old `urgencyThresholds.js` (Tacrolimus, CMV
PCR, liver/kidney panel "rejection"/"nephrotoxicity" framing, LDL/HbA1c targets) is left out of
v1 entirely — that content is A-01's condition-aware tier (b), deferred (OPEN-10).

A second, related interpretive decision made in the same item: `getTripwireEnvelope()` returns
`status: "unavailable"` — not the spec's literal "current, flags: []" — whenever the default
library is unreviewed (and no provider-custom ranges exist to evaluate instead). The spec's
literal three-state definition ties "unavailable" only to a missing/malformed flag store. Applied
literally, an unreviewed library would still compute as "current" once the engine runs (since it
genuinely did run — it just has nothing eligible to check), and CSC rule 4 treats "current, no
flags" as license to reassure the patient that an unflagged value is fine. That reassurance would
be false: almost nothing was actually checked. Extending "unavailable" to also cover "engine ran,
nothing eligible to evaluate" closes that gap.

**Reasoning.** Ambiguity resolves upward, not into improvisation (CLAUDE.md ground rule 1) —
the specific panic-value numbers are medical-judgment content with real patient-safety stakes
(they gate "call your doctor now" / "seek emergency care" messaging), not an engineering choice
Claude Code should make unilaterally. The unreviewed-library gate mirrors A-06's own precedent
(DEC entries for MOD-IMMUNOSUPPRESSION) rather than inventing a new mechanism. The "unavailable"
extension is the conservative, safety-first reading available within the spec's three-state
model: CSC rule 4 already instructs the model to withhold reassurance and route concerns to the
care team whenever status is anything but current — exactly the behavior wanted while the
library sits unreviewed, and exactly what would NOT happen if "current, flags: []" were reported
instead.

**Related:** A-01, A-06, DEC-025, PILOT_GATE PG-09, INSINA_AI_PROMPTS §6.

---

## DEC-027: Vault encryption (P-02) — Storage-API interception over a store-abstraction rewrite; PIN quick-unlock deferred; migration made idempotent against concurrent invocation

**Date:** 2026-07-12
**Status:** Settled (Greg's decision via AskUserQuestion during P-02; shipped in code).

**Decision.** P-02's spec names `store.js` as an integration point, assuming it is the access layer
for `mi_*` data. It isn't: `store.js` wraps a handful of keys; a grep found 167 direct
`localStorage.getItem/setItem/removeItem("mi_...")` call sites across 25 other files (Tab05, Tab11,
Tab13, Tab14, companionData.js, and more), none going through any shared abstraction. This matches
OPEN-6, which had already flagged "build the storage abstraction layer ahead of encryption" as
unfinished prerequisite work. Rather than either build that abstraction first (a separate,
multi-session undertaking) or ship encryption covering only the fraction of data `store.js` already
wraps, Greg chose: intercept at the Storage API itself. `src/lib/secureStorage.js` monkey-patches
`Storage.prototype.getItem/setItem/removeItem` for `mi_*` keys against an in-memory plaintext cache
(populated by decrypting every ciphertext blob at unlock); all 167 existing call sites keep calling
`localStorage.getItem/setItem` completely unchanged and transparently get plaintext in, ciphertext
out. `src/lib/vault.js` implements the crypto primitives: PBKDF2-SHA256 (600k iterations) deriving a
KEK that wraps a random AES-GCM DEK, with a second independent wrap under a one-time-shown 256-bit
recovery key. `LockScreen.jsx` is rebuilt around passphrase setup/unlock/recovery instead of a PIN.

Two scope decisions made in the same item: (1) spec point 6 allows the old PIN to remain as an
optional in-session "quick-unlock" layered in front of an already-unlocked vault — not built; every
unlock in this pass goes through the real passphrase or recovery key. Tab13's PIN-management UI is
replaced with a passphrase-change UI (`secureStorage.changePassphrase()`, re-wraps the DEK, never
re-encrypts data) rather than left in place, since a working "Change PIN" panel that no longer
gates anything would itself be exactly the false-security pattern this item exists to eliminate.
(2) The old LockScreen's "Forgot PIN → delete all data" destructive reset is replaced by the
recovery-key unlock path; a destructive wipe is offered only as the explicit last resort when both
passphrase and recovery key are lost (per spec point 9: no reset restores access without one of
those two, and cryptographically there is nothing else to offer at that point).

**Bugs found and fixed during implementation** (all caught before touching real data, per Greg's
own instruction to test thoroughly with synthetic data first): (a) an early version of the
migration's resume path derived a *fresh* DEK on retry instead of re-deriving the original from the
already-persisted envelope — a second interrupted-migration attempt would have permanently orphaned
any key already encrypted under the first DEK. Fixed by persisting the envelope before encrypting
any data, so a resume always unwraps the same DEK. (b) the resume/migration loop populated the
in-memory plaintext cache only for freshly-encrypted keys, not for keys skipped because they were
already ciphertext from an earlier partial attempt — leaving them unreadable after a successful
resume despite being correctly encrypted on disk. (c) live browser testing (not caught by the Node
test suite, which calls the module directly) surfaced that `setupVaultAndMigrate()` is reachable
concurrently — observed in practice, most likely React 18 StrictMode's dev-mode double-invoke
behavior — and a genuine race between two concurrent calls was possible. Fixed with an in-flight
promise guard so a second call while one is running returns the first call's result rather than
racing it.

**Reasoning.** Ambiguity resolves upward (CLAUDE.md ground rule 1): the spec's own assumption about
`store.js` didn't match the codebase, and picking between "encrypt everything via a new interception
layer" and "build the abstraction layer first, encryption later" is an architecture-scale call with
real risk (a bug either way risks the patient's actual medical record), not a detail to improvise.
Interception was chosen because it achieves point 5's "all mi_* record stores encrypt" without a
separate, larger refactor first, at the cost of an unusual (though not unprecedented) pattern
instead of the spec's assumed literal architecture. Every fix in the "bugs found" section came from
actually exercising the code — first an adversarial Node test suite designed to simulate exactly the
interrupted-migration and concurrent-call scenarios a real device could hit, then a live browser
walkthrough of setup → migration → recovery-key display → lock → reload → unlock → data-persists —
rather than trusting the crypto logic's correctness from inspection alone.

**Related:** P-02, PILOT_GATE PG-10, OPEN-6 (superseded by this decision for the encryption-access
question specifically; the general storage-abstraction cleanup remains open for its own sake),
DEC-008.

---

---

## DEC-028: A-12/UI-4 full scope — a fifth, previously-undocumented vital-entry surface found and fixed

**Date:** 2026-07-13
**Status:** Settled (Greg's decision via AskUserQuestion: "Full scope now"; shipped in code).

**Decision.** A-12's spec named two vital-save paths in the desktop Vitals tab (Tab06) and two in
the companion app. A survey ahead of implementation found a fifth, undocumented one: `App.jsx`'s
Dashboard "Quick Vitals" modal (`showVitalsModal`/`quickReading`/`handleQuickSave`), reachable from
the Dashboard's "Log Vitals" hot button. It carried the same class of bugs the other four had:
silent carry-forward of the last known value into any blank field (`cf()`'s
`readings.find(r => r[key] != null)?.[key] ?? null` fallback), a free-text "DATE" input with no
picker, no time field, `store.js`'s date-keyed `mergeReadings()` (which keys by `.ts` — a field the
new shared schema doesn't produce, so calling it on a `mkReading()`-shaped object would have
collapsed every reading without a `.ts` into one map entry), and no plausibility check at all.
Fixed under the same "Full scope now" answer already given for A-12: rewired onto
`mkReading`/`saveReading` (`src/lib/vitals.js`), added a real date + optional time picker, and wired
the same hard-block/soft-confirm plausibility gate used everywhere else in this item. `store.js`'s
`mergeReadings()` is left in place for the bulk-import path (Tab09/Tab12 parsed-import merge),
which is out of this item's scope.

Separately, `src/components/Dashboard.jsx` (a standalone file with its own `MANUAL_READINGS`
module-level frozen constant and the crash bugs the spec described — `MANUAL_READINGS[0].weight`
with no guard) was found to be dead code: not imported anywhere. The live dashboard is the inline
one in `App.jsx`, which already read `readings` as live state and already guarded per-field lookups
(`readings.find(r => r.bp_s != null && ...)`) — it did not have the crash bug the spec's brief
description implied; the undocumented Quick Vitals modal did. `components/Dashboard.jsx` was left
untouched (not deleted) — deleting dead files is not what this item specifies, and removing it is
better scoped as its own small cleanup (see OPEN-13).

**Reasoning.** The master prompt's own instruction is to report the delta between spec and reality
rather than patch blind or silently expand scope. This is the same category of bug already in
A-12's granted full scope (silent same-day/blank-field data loss, no plausibility gate) on a
previously unknown surface, not a new item.

**Related:** A-12, DEC-019, UI-4.

---

## DEC-029: A-13/UI-15 implementation — DEC-022 governs Save; Surface G safety gap closed in-item; Tab11 layout redesigned in place

**Date:** 2026-07-13
**Status:** Settled (Greg's decisions via AskUserQuestion during A-13; shipped in code).

**Decision.** Four calls made implementing A-13 + merged UI-15:

1. **Stale spec text vs settled decision on Save.** APP_CHANGES_SPEC's A-13 entry says saving
   analyses into Notes is "future work … not built now," but DEC-022 (Settled, 2026-07-11, same
   day) and INSINA_UI_CHANGES UI-15 both approve "Save to My Notes" with an explicit AI-generated
   label. DEC-022 governs: the analysis overlay's Save writes an `aiGenerated: true` note in
   Tab10's canonical shape, and analyses remain downloadable as dated markdown (type + date
   filename, {lastSync} freshness stamp, Surface H footer).

2. **Surface G was dead code — fixed as part of A-13** (Greg's explicit choice). The companion's
   symptom-prep AI ran on `companionAI.js`'s thin ad-hoc prompt carrying no Clinical Safety Core,
   no tripwire envelope, and no rule-5 emergency routing; `buildSurfaceG()` existed but was never
   called anywhere. A-13's "Surface G inherits the same context-gathering block" could not be true
   without fixing this. Now: a symptom handoff ("Ask Insina about this") tags the AI session as
   symptom prep, and the whole session runs on `buildSymptomPrepSystem()` — the full Surface G
   builder with the spec's payload (recent symptoms, active conditions, medications, care team,
   tripwire envelope). The companion's *generic* chat still runs on the lightweight
   `buildRecordSystem()` prompt, because no spec surface covers generic companion chat — inventing
   one would be improvisation; logged as OPEN-15 instead.

3. **UI-15 redesigns Tab11's main screen in place** (Greg's explicit choice), not a separate new
   screen: Quick Prompts and the context panel (renamed "Data used in this analysis") collapse;
   the mode bar gains a Change action (routes to Settings & Backup, where mode/consent is actually
   managed) and drops the raw model-id chip; per-message badges/footers say Standard/Advanced
   without model names; assistant messages carry timestamps and an "Open as report" control into
   the shared full-screen `AnalysisOverlay` (modal, not window.open — its Print uses a print
   stylesheet scoped to the overlay, satisfying the popup-blocker/PWA requirement).

4. **Tab05's silent Full-Analysis auto-save to Notes is removed**, replaced by the overlay's
   explicit, labeled Save button. The auto-save wrote a flat-`content` note shape that crashed
   Tab10's editor on open (`note.sections.map` of undefined); Tab11's save-to-Notes had a sibling
   bug (`heading` vs the `header` field Tab10 reads). Both writers now use one shared
   `mkAnalysisNote()`, and Tab10 normalizes the legacy shapes read-time so existing broken notes
   open instead of crashing.

**Bug found and fixed in passing:** Tab11's `buildDataSections()` formatted vitals from field
names nothing ever writes (`systolic`/`pulse`/`spo2` instead of the schema's `bp_s`/`hr`/`o2`), so
BP, HR, and O2 silently never reached Surface A's VITALS HISTORY section; and `sendMessage`
referenced an undefined `model` variable in its audit-log call, throwing inside the success path
and overwriting every completed streamed answer with "Error: model is not defined." Both corrected.

**Related:** A-13, UI-15, DEC-020, DEC-022, INSINA_AI_PROMPTS v2.3/v2.4, OPEN-15.

---

## DEC-030: A-04 minimal — canonical grouping is a reversible name map, not a record rewrite

**Date:** 2026-07-13
**Status:** Settled.

**Decision.** Lab test-name canonicalization is implemented as one new module,
`src/lib/labCanonical.js`, exposing `canonicalLabId(name)` — the single source of truth for
"same analyte across facilities." Two layers: a seed synonym table (the union of the three
alias tables that already existed but never fed grouping — tripwire.js's inline `ALIASES`,
plausibilityBounds' `LAB_ALIASES`, medDictionary's `LAB_SYNONYMS`), and a patient-confirmed
`mi_lab_name_map` (`{ normalized source name → canonical display name }`). Every grouping site now
keys on `canonicalLabId`: the digest (`labDigest.js`), Tab05's dedupe / detail history / print,
custom-range lookup, and tripwire evaluation's dedupe. The RIE `checkLabs` synonym nag also uses
it and stops firing once a grouping is confirmed.

Three UI-3 requirements drove the shape:

1. **Non-destructive / source-preserving.** The pre-existing "Duplicate Lab Names" merge
   *rewrote* `lab.name` in place, losing the original string, was irreversible, and wrote a
   `mi_lab_canonical` map nothing ever read. That is replaced: confirming a group writes only the
   name map; `mi_labs` records keep their original names forever. `displayLabName()` applies the
   chosen canonical label at render time only.
2. **Reversible.** Because records are never rewritten, "Ungroup" simply removes the mapping and
   the original names reappear — no data reconstruction needed.
3. **Manual grouping + asks before grouping.** The Group Tests panel is always available (not
   only when auto-candidates exist): it lists confirmed groups with Ungroup, offers a
   multi-select "group these arbitrary names" affordance, and still surfaces auto-detected
   candidates (seed-synonym or noise-stripped collisions) for one-tap confirmation. Nothing groups
   without the patient's action (flag, don't fix).

**Flag badge (UI-3, other half).** Ordinary out-of-range values get a compact amber "FLAGGED"
badge in the routine lab list. Amber is deliberate: the urgent tripwire banner and the detail
"OUT OF RANGE" pill both already use red, so an ordinary flag must not read as urgent. The
badge/dot/value amber (`#f59e0b`) matches the existing out-of-range dot color.

**Scope.** The seeded-synonym *richness* (a large clinical alias library) and the full
canonical-ID digest upgrade stay Phase 2 per the spec's A-04 split; this is the minimal slice the
A-03 digest and multi-facility pilot data need. `mi_lab_name_map` is added to the backup/restore
key list and syncs to Drive with the rest of the `mi_*` record.

**Related:** A-04, UI-3, A-03, A-01 (tripwire dedupe now shares this canonicalization).

---

## DEC-032: P-02 data-remanence bug — "Erase & Start Fresh" left encrypted health blobs on disk

**Date:** 2026-07-13
**Status:** Settled (bug fix, found by live verification).

**Decision / fix.** `secureStorage.js`'s patched `Storage.prototype.removeItem` only forwarded a
managed-key deletion to real storage when the vault was *unlocked*
(`if (dek !== null) nativeRemove(key)`). But the destructive reset,
`LockScreen.handleWipe()`, runs entirely from the lock screen — i.e. while locked — so every
`removeItem("mi_…")` it issued cleared only the in-memory cache (empty while locked) and left the
actual encrypted blob on disk. The reset removed only the *exempt* keys (`mi_vault`,
`mi_schema_version`); all managed ciphertext (`mi_labs`, `mi_meds_full`, `mi_rie_audit`,
`mi_tripwire_flags`, …) survived, orphaned and undecryptable but physically present. A user who
chose "erase everything" (P-02 spec point 9 / DEC-027 — the only path left when both passphrase and
recovery key are lost) would still have all their encrypted PHI sitting in localStorage.

Fix: `removeItem` now always calls `nativeRemove(key)` for managed keys regardless of lock state —
deletion never needs the DEK (you are erasing, not decrypting), so gating it on being unlocked was
the defect.

**How found.** Live browser verification (this is precisely the class of bug the Node suite missed,
because it calls the module directly rather than exercising the lock-screen reset): clicking "Erase
& Start Fresh" on a locked vault left `mi_vault` and the managed blobs in place, and the app
returned to the unlock screen on reload instead of the first-run setup. Confirmed fixed both by a
new Node regression test (managed keys cleared by a locked wipe) and live (`removeItem` loop while
locked now empties every `mi_` key).

**Related:** P-02, DEC-027, PG-10.

---

## DEC-031: UI-1 Foundation split — mechanical slice done now, sweeping visual work deferred to live verification

**Date:** 2026-07-13
**Status:** Settled (Greg's decision via AskUserQuestion).

**Decision.** The UI-1 Foundation set (UI-10 shared shell, UI-8 typography/contrast tokens, UI-11
labels, UI-14 semantic icons, UI-9 collapsible nav) is almost entirely *visual*, and its
done-when lines are visual acceptance tests ("readable without zoom," "no competing global nav,"
"one consistent icon"). The dev app is currently locked behind the P-02 vault passphrase, so none
of it can be live-verified this session. A survey also showed UI-10 is a high-risk ~15-file
structural rewrite (the four standalone tabs — Medications/Labs/Vitals/Symptoms — each re-implement
the entire sidebar/topbar/NAV inline, and App.jsx runs a dual standalone-vs-shell render path)
that everything else sits on.

Rather than rewrite 15 files blind, Greg chose to ship only the mechanical, reason-verifiable
slice now and defer the sweeping visual work until the vault can be unlocked for in-browser
verification:

- **Done now:** UI-11 nav-label standardization (Health Profile / Medical Records / Source
  Documents / My Notes, applied in the shared sidebar, the four duplicated standalone-tab NAVs,
  and Search); dead-file deletion (OPEN-13 — Dashboard.jsx + Sidebar.jsx, both unimported); and
  the UI-14 *Print* half (a shared `PrinterIcon`/`PrintLabel`, adopting one consistent printer
  icon + visible "Print" label across every print button, replacing the `⎙`/`🖨`/`✦` mix).
- **Deferred to a vault-unlocked session (part of OPEN-14 verification):** UI-10 shell
  consolidation, UI-8 body-size increases (11→15px) across hundreds of inline styles, UI-9
  collapsible Today/My Health/Records & Tools nav with direct Emergency access, and the rest of
  UI-14's icon-family unification (nav glyphs, emoji hot-buttons). Also unresolved: the
  "Export & Backup" vs "App Settings" label split, which needs a new tab, not a relabel.

**Related:** UI-10, UI-8, UI-11, UI-14, UI-9, OPEN-13, OPEN-14.

---

## DEC-033: UI-1 Foundation visual work — scope shipped, choices made

**Date:** 2026-07-14
**Status:** Settled (shipped; live-verified against the real record in the dev pane).

**Decision.** The DEC-031-deferred visual half of the UI-1 Foundation shipped in five commits
(UI-8 tokens, UI-10 shared sidebar, UI-9 grouped nav + a follow-up fix, UI-14 icons). The
judgment calls, each the minimal reading of its spec item:

1. **UI-8 is "establish and adopt in the shell," not a whole-app sweep.** `src/index.css` now
   defines the tokens (surface/text/accent custom properties, font stacks, 15px body/nav,
   13px floor, 44px touch targets) and the shared shell classes consume them. The hundreds of
   9–11px inline literals inside tab content bodies are adopted progressively as later UI items
   touch each module — sweeping them blind was the risk DEC-031 deferred in the first place.
   Google Fonts load once from index.html; the identical @import in 16 files is gone.
2. **UI-10 is sidebar consolidation, not a full shell rewrite.** The five byte-identical
   sidebar/NAV copies (App.jsx + the four standalone tabs) became one `AppSidebar.jsx`. The
   standalone tabs keep owning their own layout and topbar — those are module headers, not a
   competing global nav, so the done-when holds without restructuring App.jsx's dual render
   path.
3. **UI-9 group assignment:** Today = Dashboard, Appointments; My Health = Health Profile,
   Conditions, Surgeries, Medications, Labs & Trends, Vitals, Symptoms, Care Plan/Team;
   Records & Tools = Medical Records, Source Documents, My Notes, AI Analysis, Import Records,
   Settings & Backup. Collapse state persists in a plain non-vault key (`insina_nav_collapsed`
   — a mi_* key would be encrypted and unreadable while locked); the active screen's group
   force-expands; Emergency Information is pinned below the groups on every screen and opens
   the printable packet (DEC-023 model), whose builder moved to `src/lib/printEmergency.js`.
4. **UI-14: emoji are gone from routine controls; the nav's geometric-glyph family stays.**
   The spec bans emoji in primary nav and routine controls — the nav glyphs (⬡◯◈…) are a
   uniform non-emoji family already, so replacing them was not required; the actual emoji
   (dashboard hot buttons, backup banner, Clear All, pins, the print buttons earlier) are now
   one shared stroke-SVG family in `icons.jsx`.

**Related:** UI-8, UI-9, UI-10, UI-14, DEC-031, DEC-023.

---

## Open items (spawned by the decisions above)

- **OPEN-1** (priority): Bring the Insina overview and any marketing copy in line with DEC-001.
  Current overview language ("generates urgent alerts ... with specific action guidance,"
  "requiring immediate action," "critically sub-therapeutic") describes the directive version of
  the product and reads as marketing an uncleared device. Needs attorney eyes.
- **OPEN-2:** Naming and copy pass against California AB 489 (effective 2026-01-01), which
  prohibits AI systems from using terms or design elements implying the AI holds a healthcare
  license. Review module names and voice.
- **OPEN-3:** Build the emergency threshold table and the firing copy (DEC-003), starting with
  tacrolimus at both ends. Deterministic code path, not model-generated.
- **OPEN-4:** Implement the provider-set range schema with attributed, dated provenance (DEC-005).
- **OPEN-5:** Engage an FDA regulatory attorney on the intended-use question for the AI module,
  and on where the red-flag versus interpretation line sits for transplant-specific labs, before
  commercializing the AI module.
- **OPEN-6:** Build the storage abstraction layer (a unified read/write interface over localStorage
  and Drive) ahead of encryption, per DEC-008 part 3. Bucket 2 design, then Claude Code. This is the
  contained-change enabler; it is worth doing before launch pressure, not during it. **Partially
  addressed by DEC-027:** P-02 shipped encryption without this layer, via Storage-API interception
  instead — the "encrypt everything" need this item named is met. The general cleanup case (one
  real API instead of 167 scattered direct-localStorage call sites, easier future maintenance) is
  still open on its own merits.
- **OPEN-7:** Emergency Card option B (a patient-designated, lighter-protected in-app subset:
  transplant status, allergies, meds, emergency contacts). A deliberate, documented weakening of the
  P-02 encryption boundary; requires its own DEC before any build. Pending founder decision.
  (Spawned by DEC-023.)
- **OPEN-8** (DECISION for Greg, from S-06): Repository visibility — public vs private. Context:
  no PHI is in the repository (re-verified 2026-07-11: the only personal-data matches in tracked
  files are the public GitHub username in deploy URLs and one cosmetic form placeholder,
  "e.g. Sarah Butler", noted for the Phase 1 de-personalization pass), but the AI prompts and
  clinical configuration are world-readable in a public repo, and GitHub Pages also deploys from
  private repos on paid plans. Either outcome is fine; it must be a recorded choice, not a
  default. Neither Claude Code nor anyone else picks this — Greg answers, then this becomes a
  DEC entry.
- **OPEN-9:** Wire Surfaces D (extraction), E (Vision OCR), F (companion visit summary), and H
  (report generation) into their real consumers once the larger changes DEC-025 named for each are
  done: D/E need Tab09/Tab12/proxy-OCR's extraction schemas reconciled with the spec's schema
  (data-model change across multiple tabs); F needs `visitCapture.js`'s `summarizeVisit()` JSON
  contract reconciled with F's markdown-narrative spec, or the module split into a JSON variant;
  H needs Tab14's Consultation Prep rebuilt around a deterministic template with annotation-only
  AI fields, per its own spec section. Surface G (symptom prep) needs a consumer screen built
  before it has anything to wire into. (Spawned by DEC-025.)
- **OPEN-10:** Clinical review of `src/config/tripwireDefaults.js`'s v1 default library (six
  universal panic-value analytes), and condition-aware tier (b) thresholds for transplant/
  tacrolimus-specific analytes (Tacrolimus itself, CMV PCR, liver/kidney panel, LDL/HbA1c) per
  A-01's "optional condition-aware defaults activated by condition modules." Until reviewed, the
  urgent tier produces zero flags for any user. (Spawned by DEC-026.)
- **OPEN-11:** Build the optional PIN "quick-unlock" convenience layer P-02 spec point 6 allows
  (front an already-unlocked vault with a lighter re-entry for brief screen-privacy locks, distinct
  from the real auto-lock timeout which must clear the DEK and require the passphrase). Needs
  design for how it interacts with the existing single inactivity-timeout `lock()` path in
  `App.jsx`, which today always does a full DEK-clearing lock. (Spawned by DEC-027.)
- **OPEN-12:** Drive-sync-side multi-device key handling is unverified beyond unit tests — P-02's
  ciphertext-only upload (DEC-027) assumes every device sharing a Drive backup unlocks with the
  same passphrase/recovery key (single-DEK model). A second real device has not been exercised
  against a live Drive backup produced by this code. (Spawned by DEC-027.)
- **OPEN-13:** ~~`src/components/Dashboard.jsx` is dead code~~ RESOLVED (UI-1 track cleanup): both
  `Dashboard.jsx` and the likewise-unimported `Sidebar.jsx` were confirmed dead (the live
  dashboard and sidebar are inline in `App.jsx`) and deleted. (Spawned by DEC-028.)
- **OPEN-14 (largely resolved 2026-07-14):** the live in-browser pass ran against a throwaway
  test vault Greg unlocked. Verified live: A-12 Dashboard Quick Vitals (date/time pickers, hard
  gate on systolic 1138 with correction suggestion and no bypass, suggestion-apply saving with a
  correctly recomputed flag, cross-field soft gate with one-tap Save Anyway, two same-day
  readings stored separately); A-04 (FK506+Tacrolimus grouped to one row/trend series, amber
  FLAGGED badge, Group Tests modal with manual grouping, confirm writing only mi_lab_name_map —
  source records untouched — and Ungroup restoring the original presentation, RIE synonym nag
  clearing on confirmation); A-13/UI-15 Tab11 layout (compact mode bar + Change, no model-id
  chip, collapsible Quick Prompts / Data-used panels, bottom composer) and Tab05's
  sessionContext launch field; UI-11 labels; UI-14 printer icon. The pass also caught and fixed
  four real bugs (DEC-032 data remanence; pre-existing LAB_CATEGORIES crash; A-12 stale flag
  after suggestion-apply; A-04 orphaned labKey crash). Still not live-exercised: flows needing a
  real AI response (AnalysisOverlay Print/Save/open-as-report end-to-end, context gathering),
  the companion surfaces, and the A-12 migration against real pre-existing data — these remain
  unit-test-verified only. (Spawned by DEC-028; extended by DEC-029.)
- **OPEN-15:** The companion's *generic* AI chat (AILite sessions not started from a symptom
  handoff) still runs on `companionAI.js`'s lightweight `buildRecordSystem()` prompt, which
  carries no Clinical Safety Core, tripwire envelope, or rule-5 emergency routing text. No
  INSINA_AI_PROMPTS surface covers generic companion chat, so A-13 did not invent one; the spec
  needs either a new surface definition or an explicit decision that Surface A's (or G's) rules
  extend to it. Until then this is the one remaining AI surface outside the prompts-as-code
  architecture. (Spawned by DEC-029.)
