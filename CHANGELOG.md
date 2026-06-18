# Changelog

All notable changes to Insina Health are recorded here. This project follows
[Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**

- **MAJOR** — large redesigns or breaking changes to how data is stored
- **MINOR** — new features (e.g. a new tab or section), backward-compatible
- **PATCH** — bug fixes and small tweaks

At the end of a working session, bump the version in `package.json`, add an
entry here, then tag the release in git (`git tag v1.5.0 && git push --tags`).

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
