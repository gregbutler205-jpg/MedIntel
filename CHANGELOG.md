# Changelog

All notable changes to Insina Health are recorded here. This project follows
[Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**

- **MAJOR** — large redesigns or breaking changes to how data is stored
- **MINOR** — new features (e.g. a new tab or section), backward-compatible
- **PATCH** — bug fixes and small tweaks

At the end of a working session, bump the version in `package.json`, add an
entry here, then tag the release in git (`git tag v1.5.0 && git push --tags`).

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
