# Onboarding build — session report and decision log
Sessions of July 15–16, 2026 · Branch `feature/onboarding-v1_1` · Spec: ONBOARDING_SPEC.md v1.1
**Work order complete: WP1–WP6 all done.** All commits local; nothing pushed.

---

## 1. Status at a glance

| WP | Scope | Status | Commit(s) |
|---|---|---|---|
| WP1 | Flow shell: first-run detection, rail, resume, consent gate, Phases 1–2 | ✅ Done, Greg-reviewed | `7490787`, `f16fc33` |
| WP2 | Add Data: tiles, file intake, ZIP/password, paste, photo, manual entry, fixture extraction | ✅ Done, Greg-reviewed (4 flags resolved) | `69b6b70`, `662e25b`, `b09cabd` |
| WP3 | Staging queue: §5.2 matrix, Edit/Compare, §5.3 duplicates, source panel, reject recovery | ✅ Done, Greg-reviewed | `934d7ae` |
| WP4 | First-artifact engine + Phase 5 (§6/§3.5), NKDA assertion, early-fire toast | ✅ Done | `25b06ae`-adjacent series, `del` fix in flow |
| WP5 | Ongoing task engine T1–T9 (§7) + session-two storage prompt (§8) | ✅ Done | `201db6b` |
| WP6 | Acceptance pass: §11 items 1–13, greps, tests; 3 defects found and fixed | ✅ Done | `8cffa30` |

Build: green. Onboarding unit tests: **60/60** (`npm run test:onboarding`). Threshold
fixtures 19/19. Gitleaks clean on every commit. Full fixture-mode flow (wiped vault →
vault creation → consent → goal → Tier 0 → all four intake paths → review → artifact
fire → Phase 5 → dashboard tasks) ran with an armed error trap and **zero console
errors**.

## 2. Files created / modified

**Libs:** `onboardingState.js` (state machine, consent gate, validators),
`onboardingStaging.js` (staging store, §4.5 staleness, 30-day reject retention),
`onboardingIntake.js` (validation, ZIP, pdf.js text+password, scanned detection,
time-boxed page render, photo downscale), `extraction.js` (single gated interface:
`fixture` default / `live` proxy client per §4.1), `fixtureExtraction.js` (demo dataset +
rendered fixture pages), `onboardingDuplicates.js` (§5.3), `onboardingConfirm.js`
(confirmed writes + Compare resolutions, §6 trigger hooks), `artifactEngine.js` (§6
evaluation/fire, NKDA + no-conditions assertions, appointment insert),
`taskEngine.js` (§7 T1–T9, dismiss/snooze, session counting, §8 copy),
`printMedicationList.js` (extracted verbatim from Tab04 for Phase 5 invocation).

**Components (`src/components/onboarding/`):** OnboardingFlow (shell, toast, full
Phase 5 with success/empty/almost-there states + appointment insert), WelcomeConsent,
Phase1Goal, Phase2Basics, Phase3AddData, ManualEntry (+NKDA), ReviewQueue (+NKDA),
TaskCards, PhaseRail, PrivacyFooter.

**Data:** `drugList.js` (~180 curated), `allergenList.json`, `transplantCenters.json`.
**Config:** `onboardingConfig.js` (all named constants). **Tests:**
`scripts/testOnboarding.mjs` (60 checks).

**Modified:** `App.jsx` (onboarding gate, reopen-onboarding listener, pending-nav
handoff, dashboard TaskCards, session counting), `LockScreen.jsx` (password copy;
fresh-vault session flag), `Tab13.jsx` (password copy), `Tab12.jsx` (queue + recovery
entry), `Tab04.jsx` (med-report generator extracted), `index.css` (.ob-focus rings),
`package.json` (+jszip).

## 3. Final §11 acceptance status

| # | Criterion | Result |
|---|---|---|
| 1 | Forbidden strings zero hits; §9.1 verbatim in footer component | ✅ |
| 2 | Consent false → no /extract from any of the four tiles | ✅ (fetch spy: 0 calls; visible block; nothing staged) |
| 3 | No bulk on meds/allergies/conditions; labs bulk high-conf only, rest listed | ✅ |
| 4 | Photo → staged meds, side-by-side with the ORIGINAL photo, photo in Documents | ✅ structurally (WP6 fix); extraction content fidelity = live mode |
| 5 | Scanned PDF → vision; text PDF never invokes vision | ✅ both directions |
| 6 | 2024 doc → §9.4 badge + §4.5 Historical default | ✅ |
| 7 | Emergency Card early fire + toast + Phase 5 pending-labs copy | ✅ (fires on NKDA tap with 50+ labs unreviewed) |
| 8 | "Step n of 5" everywhere; no "of 3" | ✅ |
| 9 | Skip → manual entry; tac → tacrolimus + strengths; offline (0 network) | ✅ |
| 10 | Tab close mid-Phase-3 → resume + failed-resumable | ✅ |
| 11 | ZIP of three PDFs ingests all three; password PDF prompts | 🟡 ZIP ✅; password path implemented — **Greg manual test** (encrypted PDFs can't be fabricated in-browser) |
| 12 | Keyboard-only; visible focus; reduced motion | 🟡 implemented + focus fixed everywhere — **Greg manual keyboard walkthrough** |
| 13 | Rejected recoverable 30 days from Import Records | ✅ |

## 4. Decision log — proposed DEC entries (Greg numbers and appends to DECISIONS.md)

**From WP1–WP3 (reviewed):**
1. State key `mi_onboarding_state` (encrypted) instead of the spec's plain name — tier0 is PHI.
2. User-facing "passphrase" → "password" app-wide (Greg's direction); 12-char minimum and
   encryption-key explanation retained; P-06 legal drafts still to align.
3. Consents coexist: §3.0 checkbox gates extraction; AIModeOnboardingModal keeps governing
   analysis modes (Greg's choice).
4. First-run rule: onboarding only when no vault at boot **or a vault created this page
   session** (WP6 fix) and no onboarding state; demo builds excluded (Greg's choice).
5. Drug list ~180 curated, accuracy-first (Greg agreed); RxNorm-scale list is a data task.
6. Undated staleness badge: "No date. Confirm this is still current." (Greg's wording).
7. HEIC: guidance over a decoder dependency (Greg's choice).
8. Historical medications store as the app's `status: "inactive"`; editor shows
   Active/Historical.
9. Confirmed-item source stamp "Imported from document" + `refDocId` provenance link.
10. Onboarding never dispatches tripwire evaluation (§0); engine catches up at next boot.
11. Pathological-PDF hang fixed with a **30-second per-page render timeout** surfacing a
    Failed row (§3.3 contract). *(Corrects the earlier draft of this entry, which
    mis-described the fix as an `intent:"print"` change.)* The same latent hang risk
    exists in Tab09/Tab12's pre-existing render loops — separate follow-up flagged.
12. Logo uses the repo's real file-reference convention, not base64.
13. Dev-only `console.trace` sentinel on onboarding-completion writes.

**From WP4 (Greg's review choices):**
14. Artifact invocation depth: Emergency Card + Medication Report generate directly from
    Phase 5 (`printEmergency`, extracted `printMedicationList`); Patient Profile and
    Consultation Prep Brief goals route to their owning screens via a sessionStorage
    pending-nav handoff (upgradeable later).
15. "Download PDF" opens the report window's print dialog (browser Save-as-PDF); no PDF
    library added.
16. Positive assertions stored as record keys: `mi_nkda_assertion`,
    `mi_no_conditions_assertion` ({asserted_at}); a real allergy write clears NKDA.
17. §3.2's name/DOB-before-any-report errata is enforced as a universal precondition in
    every goal's §6 minimum.
18. Phase 5 "almost there" state offers the exact missing elements (incl. the §6
    appointment one-screen insert and both assertions) — a synthesis of §6's insert
    requirement with §3.5, distinct from the empty variant.

**From WP5:**
19. Task priority = the spec's T1–T9 enumeration order; max 4 visible.
20. "Session" (T9) = a calendar day on which the unlocked shell opens.
21. Snooze = 7 days; dismiss = permanent, both per task-instance key
    (`mi_onboarding_tasks`).
22. Task re-evaluation = shell mount + window focus + app data events (full
    write-hooking would mean touching the P-02 storage layer — deliberately avoided).
23. T6/T2-tier0 CTAs re-enter onboarding at Phase 2 via an event App listens for
    (`insina-reopen-onboarding`) — no reload, no re-lock.
24. §5.3 "kept both" flags surface as an extra T5-class task.
25. Task cards render on the Dashboard under "Next steps"; T9 renders the §8 copy
    verbatim.

**From WP6 (defects found by the acceptance walk, all fixed):**
26. Documents-module provenance is ALWAYS the user's real artifact (photo pixels, PDF
    text, pasted text) in every extraction mode; rendered fixture pages only stand in
    when no physical source exists.
27. Erase & Start Fresh → new vault in the same page session counts as a first run
    (LockScreen sets `insina_fresh_vault`).
28. Focus rings delivered by a shared `.ob-focus` rule in index.css carried by the
    onboarding shell, the Import Records queue, and the dashboard task cards.

## 5. Deferred / open

- **Greg's manual tests:** real password-protected PDF (§11.11), phone-camera
  multi-shot, keyboard-only traversal (§11.12), live-mode extraction content fidelity
  (§11.4).
- **Live extraction**: client ready behind `VITE_EXTRACTION_MODE=live`; blocked on the
  separate Render-proxy work order.
- **DEC numbering** (this log → DECISIONS.md) and the P-06 legal-draft "password"
  alignment.
- Tab09/Tab12 pre-existing render-hang risk (task chip raised).
- Vitals confirm-mapping minimal (fixture has none).
- **Merge/release decision**: branch is complete and green; merging to main deploys.

## 6. Test environments

Port 5174 (`vite-fresh`) — disposable clean-install vault for onboarding review,
password `onboarding-wp6-test-vault`, synthetic data only, erasable at will (lock
screen → Forgot your password? → Erase & Start Fresh). Port 5173 (`vite`) — separate
throwaway vault holding a restored copy of Greg's real record (Greg's password).
Neither is the production record.
