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
  contained-change enabler; it is worth doing before launch pressure, not during it.
- **OPEN-7:** Emergency Card option B (a patient-designated, lighter-protected in-app subset:
  transplant status, allergies, meds, emergency contacts). A deliberate, documented weakening of the
  P-02 encryption boundary; requires its own DEC before any build. Pending founder decision.
  (Spawned by DEC-023.)
