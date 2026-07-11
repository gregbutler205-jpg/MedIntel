# Decision Log Amendment - Pilot Readiness

Append these to DECISIONS.md with the next sequential DEC-NNN IDs in your
existing log. IDs below are placeholders (DEC-P1 etc.) - renumber to match.
Reference PILOT_GATE.md item IDs (PG-01 etc.) in the corresponding commits.

---

**DEC-P1 - Amends DEC-008: "password protection" means passphrase-derived
encryption, not a login screen**

Context: the original security-staging decision (DEC-007/DEC-008) gated
"encryption" before additional users' data enters the system, without
specifying mechanism. In a non-custodial architecture, a password that only
gates UI access (the current PIN model) protects nothing, since there is no
server-side record for it to guard and the underlying data is plaintext in
localStorage regardless.

Decision: "password protected," as a pilot-readiness milestone, means the
password is used to derive an encryption key (PBKDF2 or Argon2 via
WebCrypto) that encrypts the record at rest (localStorage, AES-GCM) and
before every Drive upload. A recovery-key export is required at setup so a
forgotten passphrase does not destroy the record. The existing 4-digit PIN
may remain as a quick-unlock convenience in front of decryption, but is not
itself the security boundary and must not be described as one in
user-facing copy.

Status: required before any pilot user's data enters the system.
Tracked as PG-10.

---

**DEC-P2 - Two-step authorization deferred until a server-side login
surface exists**

Context: two-step authorization was raised as a near-term plan alongside
password protection.

Decision: 2FA protects a remote account/login surface. This architecture
has none - storage is local/Drive, not server-authenticated accounts.
Building 2FA now would protect nothing that exists. Defer until server-side
accounts are introduced, and treat that introduction itself as a decision
point: it is the first time this app would hold custodial data (login
credentials), which changes the non-custodial posture DEC-level and
deserves its own DEC, not a quiet addition alongside an unrelated feature.

Status: deferred, not blocking pilot.

---

**DEC-P3 - Clinical prompt content must be patient-generic or
patient-injected, never founder-specific static text**

Context: pilot review found the AI system prompts and reference-data blocks
contain the founder's specific clinical facts as hardcoded static text
(e.g. serostatus, a specific prophylaxis regimen, condition-specific dietary
framing), rather than deriving them from injected patient data.

Decision: static prompt text carries zero patient-specific clinical facts.
Content is either (a) condition-generic and gated on the patient's own
injected problem list, or (b) generated per patient and versioned like any
other clinical content. This is a hard rule for all AI-facing surfaces
(Tab05, Tab11, Tab14, and any future tab), not a one-time cleanup.

Status: required before any pilot user's data enters the system.
Tracked as PG-06.

---

**DEC-P4 - Extends the RIE flag-don't-fix principle to the AI prompt-build
layer**

Context: the surgical-history prompt-injection step silently rewrites
"kidney transplant"/"LDKT" to "Liver Transplant (LDLT) [corrected]" before
the model ever sees it. This is the same class of risk the Record Integrity
Engine's flag-don't-fix principle already exists to prevent, but it happens
outside RIE, in the prompt-construction code, and is invisible to the
patient.

Decision: any correction to patient-entered clinical terminology, wherever
in the codebase it happens, routes through the Review Queue for explicit
patient confirmation. No silent rewrites of clinical fact, full stop -
this was already the rule for RIE itself; this decision closes the gap
where a similar rewrite existed outside RIE's scope.

Status: required before any pilot user's data enters the system.
Tracked as PG-07.

---

**DEC-P5 - Deterministic urgency thresholds must be evaluated in code, not
left to the model**

Context: `urgencyThresholds.js` defines critical lab bounds
(`urgentLow`/`urgentHigh`) with a file-header comment stating it is "used
by Standard Mode AI to flag values that need immediate attention," but no
code path evaluates the array. The LLM is currently the only thing
classifying lab-value urgency (Routine/Soon/Today/Emergency), which
conflicts with the deterministic-tripwire-layer decision already on record
for SaMD positioning.

Decision: incoming labs are evaluated against `URGENCY_THRESHOLDS`
deterministically at import and sync time; the result is a flag the AI can
explain and echo, never a classification the AI originates. This applies
per patient, since thresholds may carry personalized doctor-set ranges
(see the existing custom-range handling).

Status: required before pilot, and independently required for the SaMD
positioning already on record regardless of pilot status.
Tracked as PG-09.

---

**DEC-P6 - Repo hygiene: no live credentials, no local-machine metadata, in
the public repository**

Context: a live GitHub personal access token was found committed inside a
.docx file in the repo root (undetected by GitHub's secret scanning, since
docx is a zip container). Local Claude Code settings, including local file
paths, were also committed.

Decision: `*.docx`, `.claude/`, and any file containing credentials are
gitignored. Any credential ever committed is treated as compromised and
rotated immediately, not just deleted from the working tree - deletion
alone leaves it recoverable in git history and requires a history purge.

Status: immediate, independent of pilot timing.
Tracked as PG-01.

---

**DEC-P7 - The AI proxy requires authentication and enforced rate limiting
before any pilot user relies on it**

Context: the proxy currently has rate limiting disabled
(`skip: () => true`) and relies on CORS as its only access control, which
does not stop non-browser requests. The proxy URL and model allowlist are
visible in the public repo's bundled client code.

Decision: rate limiting is enabled with a real cap; a hard Anthropic
spend cap is set as a backstop; and per-pilot-user bearer tokens are issued
out-of-band as a right-sized stopgap for a small invited group. Stronger
device-attestation-based auth (App Attest / Play Integrity) is deferred to
the native migration, where it becomes feasible, and is not required to
clear this pilot gate.

Status: required before any pilot user's data enters the system.
Tracked as PG-04.

---

**DEC-P8 - BYO Anthropic key: keep, hardened, at release**

Context: the app half-implements a bring-your-own-key path (plaintext key
in localStorage, one surface bypassing the proxy). The choice was keep as
a supported tier or delete.

Decision: keep. It completes the non-custodial architecture (data and
compute both free of lock-in), serves the heaviest users at their own
cost, and keeps the app functional independent of the proxy. Dormant
through the pilot: A-02 removes the direct calls now; S-08 hardening
(encrypted at rest, session-only option, warning copy) lands at the
release gate. Sub-decision parked for S-08: proxy-forwarded (retains
model allowlist and caps; key transits the stateless proxy, never stored)
versus direct-from-browser (key never touches Insina infrastructure).
Current lean: proxy-forwarded.

Status: settled for timing and direction; routing sub-decision open.
Tracked as A-10 / S-08.

---

**DEC-P9 - Lab data windows for AI: 12-month digest default, 24-month on
Advanced**

Context: Tab 11 shipped the full lab history per call (cost, attention
degradation); Tab 05 shipped only the latest value per test (trend-blind).
The Lab Trends display offers 3, 6, and 12 months.

Decision: both AI surfaces default to a 12-month per-analyte digest (last
6 values, window min and max, computed trend line with first, last,
direction, and draw count, delta, ranges, tripwire status), with a 60-day
full-resolution window alongside. Advanced mode gets the same digest at
24 months, included app-side when the question is longitudinal or the
patient toggles it: the app decides inclusion, never the model
(non-agentic by design). The trend line keeps slow declines visible for
analytes drawn more often than the listed values; full per-month anchors
remain optional future work. The AI window is a fixed default,
independent of the on-screen Trends toggle.

Status: settled. Tracked as A-03 (amended).

---

**DEC-P10 - AI cost policy: input-size levers first, model routing gated**

Context: founder approved cost reductions with standing permission.

Decision: the primary cost levers are input size and caching, applied
now: the 12-month digest replaces full-history payloads, builders order
payloads cache-first (stable sections lead, volatile trail), MODEL_MAP
carries per-surface max_tokens, and document excerpts are included only
when referenced or newly added. Model downgrades are a secondary lever
governed by consequence of error, not task complexity: surfaces that
read or interpret clinical values stay on strong models; note summaries
and report annotation are the Haiku candidates. No reassignment ships
until the threshold fixtures and prompt rollout exist to verify behavior
holds (tracked as A-11, deferred).

Status: cost set applied to specs; A-11 gated.

---

**DEC-P11 - Input plausibility guard: two bands, distinct from the
tripwire**

Context: manual entry and OCR extraction can produce obvious errors (a
systolic of 1138, a lost decimal). Error-catching and urgency-flagging
must not blur: a typo needs a correction prompt, a real extreme value
needs an urgent flag.

Decision: a versioned plausibility layer runs before tripwire evaluation
at the same hooks. Hard band (physiologically impossible, set beyond any
recorded human value) blocks manual save with correction suggestions the
patient picks from; nothing auto-corrects. Soft band (implausible but
possible) confirms and saves with one tap and never blocks, because rare
extreme values are exactly what the tripwire exists to catch. Extraction
values out of band go to the RIE Review Queue with the raw extracted
text; unit mismatches are their own flag, no auto-conversion in v1.

Status: settled. Tracked as A-12.

---

**DEC-P12 - Analysis context gathering: bounded at five, one round,
emergencies exempt**

Context: good analysis sometimes needs context the record cannot contain.
Unbounded questioning degrades the product and adds cost.

Decision: conversational analysis surfaces may ask up to 5 targeted
questions in a single batched round, only when answers would materially
change the analysis; partial answers or a request to proceed end the
gathering; recorded facts are never re-asked; emergency-pattern symptoms
get the emergency response before any questionnaire. One-shot analyses
get an optional launch field injected as {sessionContext}, app-decided,
non-agentic. Lab Q&A stays capped at one question.

Status: settled. Tracked as A-13 and prompt spec v2.3.

---

**DEC-P13 - UI change plan reconciled against the engineering specs**

Context: a separate UI assessment (~30 items) overlapped the engineering
specs at nine points, including two direct contradictions.

Decision: the UI plan is kept as INSINA_UI_CHANGES.md with UI-N IDs and
the shared phase scheme. Reconciliation rulings: UI-6 (tripwire failure)
and UI-5 (pseudonymized payloads) are duplicates deferred to A-01 and
P-01/P-03, keeping only their display constraints and approved wording;
UI-13 (replace PIN) is rewritten to defer to P-02, and its
authentication/recovery-reset language is removed as incompatible with the
non-custodial encryption model; UI-3 (lab grouping) is absorbed into A-04,
a minimal version of which is pulled into Phase 1; UI-15 (AI Analysis
layout) merges with A-13 and adds the four-section response structure to
the prompt spec (v2.4). All other UI items carried through, reformatted
and phase-aligned.

Status: settled. Tracked as INSINA_UI_CHANGES.md.

---

**DEC-P14 - Save AI analysis to Notes, with an AI-generated label**

Context: the UI review approved "Save to My Notes" on the AI Analysis
screen; a prior amendment had deferred saving AI output into the record
over a labeling concern.

Decision: approved. Analyses save into Notes as dated entries carrying an
explicit AI-generated label distinguishing them from clinician or
patient-authored text, and remain downloadable as markdown. The labeling
requirement resolves the earlier concern; this is no longer deferred.

Status: settled. Tracked as A-13 / UI-15.

---

**DEC-P15 - Emergency access under full-record encryption: exportable
packet, not in-app reduced-auth view**

Context: UI-13 called for a "limited Emergency Information view," which has
no clean answer once the record is encrypted behind a passphrase (P-02).

Decision (safe default, option A): emergency information is provided by the
exportable/printable Surface H ED packet the patient keeps outside the app
(paper, phone wallet, lock-screen medical ID). The live encrypted app
exposes no no-passphrase view, so the encryption boundary is not breached.
Option B (a patient-designated, lighter-protected in-app Emergency Card
for a chosen subset) is a possible future addition and would require its
own DEC as a deliberate, documented weakening of the boundary. Built to A.

Status: A settled; B open pending founder decision. Tracked as UI-13 /
P-02.

---

*These amendments were produced from a security/architecture review of the
live repository (v1.21.0) and the AI prompt reference document, in the
context of moving from single-user founder use to a small invited pilot
group. See PILOT_GATE.md for the full checklist these decisions reference.*
