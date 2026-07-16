# Onboarding build — session report and decision log
Session of July 15–16, 2026 · Branch `feature/onboarding-v1_1` · Spec: ONBOARDING_SPEC.md v1.1
Work packages completed: **WP1, WP2, WP3** (of 6). All local; nothing pushed.

---

## 1. Status at a glance

| WP | Scope | Status | Commit(s) |
|---|---|---|---|
| WP1 | Flow shell: first-run detection, rail, resume, consent gate, Phases 1–2 | ✅ Done, reviewed by Greg | `7490787`, `f16fc33` |
| WP2 | Add Data: tiles, file intake, ZIP/password, paste, photo, manual entry, fixture extraction | ✅ Done, reviewed by Greg (4 flags resolved) | `69b6b70`, `662e25b`, `b09cabd` |
| WP3 | Staging queue: §5.2 matrix, Edit/Compare, §5.3 duplicates, source panel, reject recovery | ✅ Done, **awaiting Greg's review** | `934d7ae` |
| WP4 | First-artifact engine + Phase 5 (§6, §3.5), NKDA assertion, early-fire toast | ⏳ Not started | — |
| WP5 | Ongoing task engine T1–T9 (§7), session-two storage prompt (§8) | ⏳ Not started | — |
| WP6 | Acceptance pass: §11 items 1–13 explicitly, greps, tests | ⏳ Not started | — |

Build: green (`npm run build`, 19/19 threshold fixtures). Onboarding unit tests: **43/43**
(`npm run test:onboarding`). Gitleaks clean on every commit. Live-verified end to end in
fixture mode on a clean-install dev server (port 5174, synthetic vault, zero PHI) with an
error trap installed — zero console errors in every verification pass.

## 2. Files created / modified

**New libs:** `src/lib/onboardingState.js` (state machine, consent gate, validators),
`src/lib/onboardingStaging.js` (staging store, §4.5 staleness, 30-day reject retention),
`src/lib/onboardingIntake.js` (file validation, ZIP, pdf.js text+password, scanned
detection, page render, photo downscale), `src/lib/extraction.js` (single gated extraction
interface: `fixture` default / `live` proxy client per §4.1), `src/lib/fixtureExtraction.js`
(demo dataset + rendered fixture page images), `src/lib/onboardingDuplicates.js` (§5.3
normalization + matching), `src/lib/onboardingConfirm.js` (confirmed record writes +
Compare resolutions).

**New components (`src/components/onboarding/`):** OnboardingFlow, WelcomeConsent,
Phase1Goal, Phase2Basics, Phase3AddData, ManualEntry, ReviewQueue, PhaseRail, PrivacyFooter.

**New data:** `src/data/drugList.js` (~180 curated entries), `src/data/allergenList.json`,
`src/data/transplantCenters.json` (~170). **New config:** `src/config/onboardingConfig.js`
(every named constant: staleness thresholds, §5.2 matrix, caps, bands, category order).

**New tests:** `scripts/testOnboarding.mjs` (43 checks; wired as `npm run test:onboarding`).

**Modified:** `src/App.jsx` (onboarding gate after unlock), `src/components/LockScreen.jsx` +
`src/components/tabs/Tab13.jsx` (passphrase→password copy), `src/components/tabs/Tab12.jsx`
(queue + rejected-recovery entry, §2/§11.13), `package.json` (+jszip, sanctioned),
`docs/ONBOARDING_SPEC.md` (added).

## 3. Spec sections implemented

§2 (flow architecture, skip destinations, state machine, resume) · §3.0–3.4, 3.7, 3.8
(screens; §3.5 exists as the fully-implemented empty variant + honest WP4 stub) ·
§4.1–4.5 (contract, text path, vision path client-side, confidence bands, staleness) ·
§5.1–5.3 (invariant, matrix, duplicates/conflicts) · §8 (tokens, chips, rail, banner) ·
§9.1–9.4 (exact copy; 9.4 undated variant per Greg) · C1–C6, C8, C10–C15 fully; C7/C9 ✓;
C16 pending WP5.

## 4. §11 acceptance status (formal pass is WP6)

| # | Criterion | Status |
|---|---|---|
| 1 | Forbidden strings zero hits; §9.1 verbatim in footer component | ✅ verified (src + built bundle) |
| 2 | Consent false → no /extract from any path | ✅ verified live (fetch spy, all-path attempt) |
| 3 | No bulk on meds/allergies/conditions; labs bulk = high-conf only, rest listed | ✅ verified live |
| 4 | Photo → staged meds, side-by-side, Documents link | 🟡 verified in fixture mode; real-photo content needs live mode |
| 5 | Scanned PDF → vision; text PDF does not invoke vision | ✅ verified live (both directions) |
| 6 | 2024 doc → §9.4 badge + §4.5 status default | ✅ verified live |
| 7 | Emergency Card early fire + toast + Phase 5 pending-labs copy | ⏳ WP4 |
| 8 | "Step n of 5" everywhere; no "of 3" | ✅ verified |
| 9 | Skip → manual entry; tac → tacrolimus + strengths; offline | ✅ verified (offline by construction — bundled JSON, no network) |
| 10 | Resume banner + failed-resumable files | ✅ verified live |
| 11 | ZIP of PDFs ingests; password PDF prompts | 🟡 ZIP ✅ (live + unit); password logic implemented, needs a real encrypted PDF (manual test) |
| 12 | Keyboard-only traversal; focus; reduced motion | 🟡 implemented (radiogroup arrows verified); full traversal audit in WP6 |
| 13 | Rejected recoverable 30 days from Import Records | ✅ verified live |

## 5. Decision log — proposed DEC entries (Greg numbers and appends to DECISIONS.md)

1. **Onboarding state key is `mi_onboarding_state`, not the spec's plain `onboarding_state`.**
   Tier 0 carries PHI (organ, transplant date, coordinator identity/phone); the `mi_` prefix
   puts it under P-02 vault encryption. Verified ciphertext at rest. Shape/semantics per §2.
2. **User-facing "passphrase" renamed to "password" app-wide** (Greg's WP1 review direction).
   LockScreen, Settings security card, FAQ. The 12-character minimum and "this is the actual
   encryption key" explanation are retained. P-06 legal drafts may still say passphrase —
   Greg to align.
3. **Consents coexist** (Greg's WP1 review choice): the §3.0 checkbox gates extraction
   (`consents.ai_processing`); the existing AIModeOnboardingModal keeps governing
   Standard/Advanced analysis-mode choice. No existing consent code touched.
4. **First-run rule** (Greg's WP1 review choice): onboarding renders only when no vault
   existed at boot and no onboarding state exists; incomplete flows resume; demo builds and
   existing installs never see it.
5. **Drug list is ~180 curated, accuracy-first entries** (Greg agreed at WP2 review), not
   the spec's ~2,500: every transplant-relevant drug present, strengths verified; free text
   + `unverified_name` covers gaps. Full RxNorm-derived list is a future data task.
6. **Undated-document staleness badge copy**: "No date. Confirm this is still current."
   (Greg's wording, WP2 review) — §9.4's `{Mon YYYY}` slot can't be filled for null dates.
7. **HEIC: guidance over dependency** (Greg's WP2 review choice): no WASM decoder; failure
   message explains iPhone auto-conversion and the Most Compatible setting. Revisit if
   pilot users hit it.
8. **Historical medications store as the app's existing `status: "inactive"`** — keeps them
   out of the active list and the Emergency Card without inventing a parallel status; the
   review editor labels the toggle Active/Historical per §4.5.
9. **Confirmed-item source stamp is "Imported from document"** (uniform across PDF, photo,
   paste), with `refDocId` linking the Documents-module source entry (UI-19 convention).
10. **Onboarding never dispatches tripwire evaluation** (§0 hard rule): confirmed writes
    land silently; the engine evaluates at next boot as it always has.
11. **pdf.js page rendering uses `intent: "print"` + 30 s timeout** — display-intent renders
    schedule on requestAnimationFrame and hang forever in background tabs (found live in
    WP2 verification). The same latent bug exists in Tab09/Tab12's pre-existing vision code;
    flagged as a separate out-of-scope fix (task chip raised).
12. **Logo is the repo's file-reference convention** (`BASE_URL + logo-white.png`), not
    base64 — §8's "base64-embedded per the existing app convention" described a convention
    that doesn't exist in the app.
13. **Dev-only sentinel**: `console.trace` on any phase-5 (completion) write in dev builds,
    after a one-time unreproduced anomaly during WP1 browser-automation verification
    (attributed to the test harness, not app logic; never seen from real input).

## 6. Deferred / open

- **WP4–WP6** per the work order (first-artifact engine, task engine T1–T9 + storage
  prompt, acceptance pass).
- **Live extraction mode**: client is built against the §4.1 contract
  (`VITE_EXTRACTION_MODE=live`); blocked on the separate Render-proxy work order.
- **Greg's manual test list**: real password-protected PDF; real phone-camera multi-shot;
  full keyboard-only traversal; live-mode photo extraction (§11.4's content fidelity).
- **CHANGELOG**: an Unreleased section for this branch is in CHANGELOG.md; version bump
  happens at merge/release, not on the feature branch.
- Legal drafts (P-06) still say "passphrase" — Greg to align with the rename.
- Vitals confirm-mapping is minimal (fixture has none; live extraction may exercise it —
  revisit at WP6).

## 7. Test environment notes

Port 5174 (`vite-fresh` launch config) hosts a disposable clean-install vault for
onboarding testing — password `onboarding-wp1-test-vault`, synthetic data only, safe to
erase at any time. Port 5173 hosts the separate throwaway vault holding a restored copy of
Greg's real record (Greg's password). Neither is the production record.
