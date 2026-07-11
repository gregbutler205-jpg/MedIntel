# Insina Health: UI Change Plan (Reconciled)

Source: the July 11 2026 UI assessment ("UI Change Plan Final"), reconciled
against the existing engineering specs (APP_CHANGES_SPEC.md,
INSINA_AI_PROMPTS.md, PILOT_GATE.md, DECISIONS). This document is the UI
workstream's source of truth. Where it touches the same code as an
engineering item, the pointer here governs which document owns what.

IDs: UI-N corresponds to Item N in the original assessment, so traceability
to that review is preserved. Phases use the same scheme as every other
spec: Phase 0 (founder-only, this week), Phase 1 (before any second user /
MVP), Phase 2 (after pilot starts).

Implementation rule, carried from the assessment and consistent with the
whole project: do not rebuild behavior that already works. Confirm current
behavior first, make only the approved change, use the done-when lines as
acceptance tests.

---

## Reconciliation summary

What changed when the UI plan met the engineering specs:

| UI item | Disposition | Reason |
|---|---|---|
| UI-6 tripwire failure | Deferred to A-01 (mechanism); kept its 3 "leave unchanged" display constraints | Exact duplicate of A-01's evaluation envelope |
| UI-5 pseudonymized payloads | Deferred to P-01/P-03 (mechanism); kept approved wording, routed to P-06 | Payload audit is already P-01 |
| UI-13 replace test PIN | Rewritten to defer to P-02; "recovery/reset" language removed | Contradicted the non-custodial encryption model (DEC-P1) |
| UI-3 lab grouping | Absorbed into A-04; a minimal A-04 pulled into Phase 1 | Timing conflict; the A-03 digest also benefits |
| UI-15 AI Analysis layout | Kept; merged with A-13; forced prompt spec to v2.4 | Same screen as A-13; response structure shapes AI output |
| UI-4 vital consistency | Kept; lands with A-12 (same form), rides A-08 rails | Both touch the vitals entry form / schema |
| UI-16 chart range rule | Kept; noted AI-text-vs-chart-display distinction | The "never both ranges" rule is display-only, not the AI rule |
| UI-1 demo isolation | Phase 1, conditional escalation to Phase 0 | Escalates if the demo can reach real user data |
| UI-27 abbreviations | Kept as check; AI side already covered by CSC rule 14 | Alignment, not conflict |

Everything else in the assessment carried through unchanged in intent,
reformatted and phase-aligned below.

---

## Phase 0 (founder-only, this week)

No new UI items are added to Phase 0. Phase 0 stays the security set plus
the A-14 Home-button parity already specified. Two notes:

- **UI-1 conditional escalation.** If the current /demo route shares an
  origin or storage with the production app such that it can read a real
  user's localStorage or Google Drive, the isolation half of UI-1 moves
  here (Phase 0) as a live data-exposure fix. If the demo is already
  storage-isolated (the review confirmed demo *data* is fictional but did
  not fully verify storage isolation), UI-1 stays in Phase 1. Verify this
  first.
- **UI-26 search + A-14 Home** are adjacent in the top nav. When A-14
  lands in Phase 0, leave space for the Search icon beside Home so UI-26
  in Phase 1 does not re-lay-out the same region twice.

---

## Phase 1 (before any second user / MVP)

Two tracks run here. Track A is the engineering pilot gate
(APP_CHANGES_SPEC Phase 1, unchanged). Track B is UI production-readiness,
below. The CLAUDE_CODE_PROMPT gives the merged execution order and the
merge points where a UI item is implemented at the same step as its
engineering counterpart.

### Foundation (do these first; other UI items sit on them)

**UI-10 Shared application shell.** One sidebar and outer page structure;
standardized headers, spacing, primary actions, buttons, modals,
confirmations, error patterns. Remove repeated large Insina branding and
any second global-nav inside modules. Keep specialized module layouts and
the Care Team module's own section tabs inside the shell. Companion
five-tab nav is unchanged.
Done when: moving between modules feels like one app; no module has a
competing global nav or duplicate masthead; shared components render
consistently.

**UI-8 Text size and contrast.** Establish shared typography and contrast
tokens, dark theme retained. Body/nav generally 15 to 17 px, nothing
important below 13 px, ~44 px touch targets, accessible contrast, no
color-only status. Establish the tokens once, here, so every other UI item
consumes them.
Done when: core screens readable without zoom and usable zoomed; status
never relies on color alone; controls meet the touch-target standard.

**UI-11 Labels and record types.** Standard labels: Health Profile,
Medical Records, Source Documents, My Notes, Import Records, Export &
Backup, App Settings. Link a structured record to its Source Document when
one exists; identify which structured records were extracted from a source.
Rename once, early, so later items use the settled names.
Done when: approved labels used consistently in nav, headings, buttons,
help; a user can move from an extracted record to its source and see what
was extracted.

**UI-14 Semantic icons.** One icon family across desktop and companion,
same icon per feature everywhere, no emoji in primary nav or routine
controls, icon-only controls get accessible names and touch targets. One
consistent printer icon plus the visible label Print everywhere printing
exists (this includes the A-13 analysis overlay and UI-15). Establish the
Print treatment here so A-13/UI-15 consume it.
Done when: icon audit finds no conflicting symbols for the same action;
icon-only controls are keyboard reachable; every Print uses the approved
icon-and-label.

**UI-9 Desktop navigation grouping.** Collapsible groups: Today, My Health,
Records & Tools. Every module stays reachable; Emergency Information stays
directly accessible; companion nav unchanged. Coordinate with the A-14
Home and UI-26 Search placement so the top region is laid out once.
Done when: every module reachable in no more steps than the approved
design; active destination clear; collapse state consistent; Emergency
Information easy to reach.

### Per-module (sit on the foundation above)

**UI-15 AI Analysis screen.** Merged with A-13. A-13 owns the mechanism
(full-screen overlay, Print button, Save button, context gathering,
{sessionContext}). UI-15 owns the layout: wide dominant conversation
workspace; compact Standard/Advanced indicator with a Change action;
collapsible Quick Prompts and "Data used in this analysis"; response
boundaries, mode badge, timestamp; composer anchored at bottom; model
names de-emphasized. Response structure is the four sections now in the
prompt spec v2.4 (see below). Save is "Save to My Notes," approved with an
explicit AI-generated label on the saved note (this resolves the earlier
deferral; the note is clearly marked as AI-produced, not clinician text).
Done when: approved layout implemented without shrinking the readable
answer area; the four sections used consistently when applicable; Quick
Prompts and data-used collapse; Print and Save to My Notes work; saved
notes are labeled AI-generated.

**UI-16 Labs & Trends chart.** Y-axis shows only the bottom and top labels
of the applicable range; each point reveals its date and result; when a
Doctor's Range exists show only it, otherwise show the lab range, never
both in the main chart; correct the latest import and manual-entry status
dates; limit Doctor's Range prompting to targeted moments (for example
early Appointment Prep); preserve current width and layout.
Note, do not confuse with the AI rule: "never both ranges" is a *chart
display* rule. The prompt spec still tells the *AI* to mention both the
standard and the custom range in text when both exist (INSINA_AI_PROMPTS
{customRanges}). Chart hides one; AI text can reference both. Different
surfaces, both correct.
Done when: range display follows Doctor's-Range-first on every chart; every
point exposes date and value; status dates match reality; width unchanged.

**UI-18 Care Team (from Care Plan/Team).** Rename to Care Team; keep only
Care Team, Emergency, Reference; remove Timeline, Goals, Preventive,
Milestones from the MVP interface without destroying their data (they may
return in Phase 2, UI-18-P2); use the shared shell.
Done when: labeled Care Team with only the three sections; deferred
sections hidden but data intact; uses the shared shell.

**UI-25 Care Team selection descriptor.** Add above the checkboxes: "Select
the care team members you want shown on your Dashboard and Health Profile."
Checkboxes and behavior unchanged.
Done when: descriptor visible before the checkboxes; selection still
controls Dashboard and Health Profile inclusion.

**UI-19 Medical Records detail panel.** Consistent summary from available
fields (title/type, date, provider/facility, source, date added, structured
details or extracted summary, attached notes); no large empty headings for
absent fields; link to the related Source Document; show "Source: Entered
manually" when none; truthful source labels (Imported from PDF, Entered
manually, Imported from calendar, Demo sample record, or a real
integration). Delete placement and behavior unchanged.
Done when: every record shows an informative view without misleading blank
sections; source labels match reality; source links open the right file.

**UI-20 Import Records.** Separate Upload Document, Manual Entry, Import
History into tabs or clear modes; show the manual form only after Manual
Entry is selected; preserve the extract → review → save flow and the
correct/exclude-before-save ability (this is the RIE preflight and
Surfaces D/E, unchanged); keep Discard, Save to Records, Interpret with AI;
add Import History (document name, import date, records created,
excluded/review counts where available, source document, final status);
preserve links from imported records to their source.
Done when: Upload / Manual Entry / Import History clearly separated; manual
form hidden until selected; a completed import traces to its source and
appears in history; review-before-save intact.

**UI-21 Export & Backup vs App Settings.** Distinct Export & Backup page
(storage location, Drive status, last backup/snapshot, Back Up Now,
restore, full export, disconnect, portability, destructive actions in a
separated Danger Zone). Distinct App Settings page with expandable
sections: Display & Accessibility, AI Analysis, Security, Lab Organization.
The Security section is where P-02 passphrase and auto-lock settings live;
the AI Analysis section is where mode and the A-10 BYO-key control live;
Lab Organization is where UI-3/A-04 grouping controls live. Demo Controls
appear only in the demo build. Improve lab-ordering controls (larger
Move Up/Down or an accessible ordering pattern).
Done when: backup/export and preferences on separate pages; Danger Zone
separated with confirmation; lab ordering usable; production builds have no
demo controls.

**UI-23 Health Profile printing.** Do not flag or list optional blank
fields; omit non-applicable fields/sections from the report; show a brief
non-blocking warning only when genuinely essential info is missing; actions
are Generate Report and Cancel. Connects to Surface H report generation.
Done when: a profile with optional blanks generates without a warning wall;
only essential omissions warn; report still generates without invented
data.

**UI-24 Conditions and Surgeries.** Visible active-condition count;
condition search; expand/collapse for long details; keep status, severity,
diagnosis date, provider when available; surgeries reverse-chronological;
always show full procedure date including year; keep surgeon, facility,
outcome when available. Edit and Delete unchanged. (Advanced sort/filter is
Phase 2, UI-24-P2.)
Done when: count accurate and search works; long details expand without
tall cards; every surgery date has a year; list stays reverse-chronological.

**UI-22 Symptoms.** Full numbered 1 to 10 severity scale on every main
symptom card with marker, score, and label (e.g. "Moderate - 5/10");
resolved symptoms keep description, resolution date, last severity;
free-form entry made prominent near the top of symptom selection. Keep
categories, detailed view, Analyze in AI action, Mark as Resolved, two-step
logging.
Done when: every card with a recorded severity shows scale/marker/score/
label; resolved cards understandable without reopening; free-form findable
without scrolling the catalog.

### Data integrity and navigation

**UI-2 Eliminate raw calculation errors.** Fix "AVG SEVERITY NaN" and
"Last snapshot NaN days ago"; shared display-safety helpers for numbers,
dates, averages, elapsed time, optional text; patient-friendly fallbacks
("No severity recorded", "Not enough data", "No snapshot created yet", "Not
recorded"); tests for missing/malformed/empty/partial data. Never invent or
alter the underlying record, only the display.
Done when: representative screens and reports show no raw programming
values; missing data shows an approved fallback without changing the
record.

**UI-4 Vital-reading consistency.** Lands with A-12 (same vitals form) and
rides the A-08 schema rails. Reading Date editable, Reading Time optional,
Entered At stored separately; show chosen date/time in Quick Log before
saving; same-day readings stay separate; fix latest-value logic so every
vital uses one rule; one shared vital schema/helper; consistent labels
(Log Vitals, O2 Saturation); likely-duplicate detection without silent
deletion.
Done when: latest value is by Reading Date/Time not entry time; two
same-day readings stay separate; late-entry, missing-time, and duplicate
cases pass regression.

**UI-3 Lab-name grouping and flag display.** Grouping is absorbed into A-04
(pulled into Phase 1): verify auto duplicate/alias detection and that it
asks before grouping; add a manual Group Tests function; preserve every
source name and record; confirmed mappings apply to future imports and are
reversible. Flag display: compact Flagged badge in routine views, details
reveal direction/range/reason; urgent and tripwire statuses stay visually
and logically distinct from ordinary flags (this half pairs with A-01).
Done when: alias pairs group automatically or manually without deleting
sources; ungrouping restores original presentation; ordinary flags never
look urgent and urgent/tripwire never looks routine.

**UI-26 Search.** Make the existing Search work; place the Search icon
prominently beside Home (coordinate with A-14); accessible name/tooltip
"Search"; selecting a result opens the underlying record. (Advanced search
is Phase 2, UI-26-P2.)
Done when: search returns relevant records; every result opens the right
record; icon visible beside Home and usable by keyboard and assistive tech.

**UI-13 Production access control.** Defers to P-02 (passphrase-derived
encryption). The temporary test PIN is removed from the production build;
records are protected in locked and signed-out states; session and
auto-lock behavior defined; keyboard/accessibility supported. There is no
separate "authentication server" and no "reset" that restores access
without the passphrase: recovery is the P-02 recovery key, nothing else.
Emergency access is handled by the exportable/printable Emergency
Information (the Surface H ED packet the patient keeps on paper, phone
wallet, or lock-screen medical ID), not a reduced-authentication window
into the live encrypted app. See the open decision at the end of this doc.
Done when: temp PIN gone from production; lock/auto-lock/recovery pass
security and usability testing per P-02; no path reveals the record or
weakens encryption; emergency info is obtainable via the exportable packet
without unlocking the full record.

### Checks (verify before authorizing new work; repair if failing)

**UI-7 Appointment duplicate detection.** Manual-then-import and
import-then-manual; wording/time variants; rescheduled and recurring.
Pass: likely duplicates prompt (use existing / update / keep both); never
silently merges or deletes; reschedules and recurrences not miscounted as
duplicates. Medication duplicate and refill behavior stays unchanged.

**UI-27 Abbreviations and Learn More.** Each lab Learn More has full name,
abbreviation, plain-language explanation; medication Learn More is
patient-friendly; AI and reports spell out abbreviations on first use (AI
side already covered by CSC rule 14); imported Source Documents keep
original terminology. No new glossary/tooltip system. Keep Learn More
buttons.

**UI-29 Save confirmations and unsaved changes.** Brief success
confirmation; discard prompt on leaving a dirty form; errors do not erase
entered data; repeated clicks cannot create duplicates mid-save; Save and
Cancel consistently labeled and placed; messages announced to screen
readers and not color-only. Pass: representative Add/Edit flows pass save,
cancel, failure, repeated-click, and keyboard/screen-reader checks with no
data loss.

---

## Phase 2 (after pilot starts)

- **UI-8-P2 Optional large-text setting**, on top of the UI-8 foundation;
  applies across desktop and companion without clipping.
- **UI-17-P2 Appointments calendar/list toggle**, keeping current filters
  (Upcoming, Suggested, Completed, Cancelled, All) and actions.
- **UI-24-P2 Advanced condition sorting/filtering** by severity, specialty,
  status, diagnosis date, with a clear active-filter indicator and reset.
- **UI-18-P2 Optional health-management features** (Medical Timeline,
  Goals, Preventive-care tracking, Milestones), returned only if user
  testing supports it, each fitting the shared shell, data ownership clear.
  The data hidden by UI-18 in Phase 1 is preserved for this.
- **UI-26-P2 Advanced search**: AI-generated answers from search results
  (inherits the entire prompt safety core, CSC and all, when built),
  full-text search inside uploaded PDFs, medical-synonym matching, advanced
  filters, saved searches. Must identify its sources, open supporting
  records, and never imply that missing results mean missing health data.

---

## No-change and rejected register (do not reintroduce without new approval)

Confirmed no change: medication duplicate handling and refill workflow
(separate strengths are legitimate; refill math intentional); desktop
Dashboard (companion is the everyday surface, desktop is the record
workspace); appointments core filters/details/actions (no Record Integrity
or prep-status clutter on cards); Medical Records Delete placement/behavior;
Symptoms detailed view, Analyze in AI, Mark as Resolved, categories,
two-step logging; Conditions/Surgeries Edit and Delete; Learn More
buttons/workflow (no separate glossary); Consultation Prep workflow (no
post-visit reminder).

Rejected: empty-state redesign (UI-30, no new empty-state standard or
added Add/Upload actions); breadcrumbs and additional back-navigation
(UI-31).

---

## Release-gate checklist (UI portion; complements PILOT_GATE.md)

- [ ] Isolated public demo: fictional data only, cannot reach production or
      personal integrations (UI-1).
- [ ] No representative screen shows raw calculation or programming errors
      (UI-2).
- [ ] AI payloads pseudonymized by default; privacy wording matches
      behavior (UI-5 / P-01 / P-03).
- [ ] Tripwire failure cannot produce false reassurance (UI-6 / A-01).
- [ ] Vital and appointment duplicate/date logic passes the scenarios
      (UI-4, UI-7).
- [ ] Search works, sits beside Home, opens the record (UI-26).
- [ ] Core screens meet text-size, contrast, touch-target, icon standards
      (UI-8, UI-14).
- [ ] Shared shell and nav groupings consistent (UI-10, UI-9).
- [ ] Production access control replaces the temp PIN (UI-13 / P-02).
- [ ] AI Analysis, Labs & Trends, Care Team, Medical Records, Import
      Records, Settings/Backup, Symptoms, Health Profile, Conditions/
      Surgeries, Care Team selection meet their done criteria.
- [ ] Abbreviation and save/unsaved-change checks pass (UI-27, UI-29).
- [ ] No rejected or no-change feature added unintentionally.

---

## Open decision for the founder

**Emergency access under full-record encryption (from UI-13).** I
reconciled UI-13's "limited Emergency Information view" to the
exportable/printable ED packet rather than a reduced-authentication screen
inside the live app, because a reduced-auth in-app view is a hole in the
P-02 encryption model. Two ways to go, your call:

- **(A, chosen as the safe default)** Emergency info lives outside the
  encrypted app: the patient generates the Surface H ED packet and keeps it
  on paper, in a phone wallet pass, or on the phone's lock-screen medical
  ID. The app itself never exposes a no-passphrase view. Cleanest for the
  encryption model; zero in-app attack surface.
- **(B)** A small, explicitly patient-designated Emergency Card is stored
  under lighter protection (or a separate short emergency code) containing
  only a chosen subset (transplant status, allergies, meds, emergency
  contacts). More convenient in a live emergency, but it is a deliberate,
  documented weakening of the encryption boundary for that subset, and it
  needs its own DEC.

Built to (A). If you want (B), it is a scoped addition with its own
decision entry, not a silent change.
