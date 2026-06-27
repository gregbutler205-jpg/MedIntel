# Changelog

All notable changes to Insina Health are recorded here. This project follows
[Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**

- **MAJOR** — large redesigns or breaking changes to how data is stored
- **MINOR** — new features (e.g. a new tab or section), backward-compatible
- **PATCH** — bug fixes and small tweaks

At the end of a working session, bump the version in `package.json`, add an
entry here, then tag the release in git (`git tag v1.5.0 && git push --tags`).

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
