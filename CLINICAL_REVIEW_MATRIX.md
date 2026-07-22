# Clinical Review Matrix — Tripwire Advisory Thresholds & Wording

**Status:** DRAFT / REVIEW-REQUIRED. Nothing in this document is clinically
approved. Firing remains gated behind `TRIPWIRE_ADVISORY_ENABLED = false`
until a licensed transplant clinician signs the decisions below.
**Table version under review:** 1.1.0-draft (`src/data/tripwireTable.js`,
`src/config/tripwireDefaults.js`). **Wording version under review:** 1.1.0
(`src/data/advisoryTemplates.js`). **Provenance:** the 2026-07-19 work order
(v1.0.0), Greg's rulings (DEC-039), and the 2026-07-21 external review
disposition (DEC-043 — ChatGPT review, Claude reconciliation, Greg's
authorization of the non-clinical items). External-model clinical citations
(AHA/ADA/AABB/MedlinePlus) are **unverified inputs** to this review, not
authority.

**How to use this document:** the reviewer works row by row. Every row needs
one checked box and initials. "Current" is what the code does today (v1.1.0);
"Proposed alternate" is the external review's suggestion, recorded verbatim in
substance. Where the reviewer writes a different number, strike the row and
write the ruling in the margin — the implementation follows the signed copy,
via a versioned table/template bump.

---

## 0. Standing decisions the reviewer is NOT being asked to reopen

- Urgency classification is deterministic code, never the AI (DEC-002/DEC-003;
  CSC rule 4). The AI may only repeat an existing flag verbatim.
- EMERGENCY is a full-screen takeover; TODAY is a prominent modal; dismissal is
  logged, means only "warning closed," and there is no snooze or permanent
  suppression.
- Advisory copy always routes proactive contact — never "wait for the
  callback" (DEC-039).
- Urgency thresholds are fully separate from patient/provider *display* ranges
  (custom reference ranges never feed the advisory; test-asserted). The future
  provider-set individualized ranges feature (DEC-005/OPEN-4) will layer on
  top of — not replace — this table.
- v1 is absolutes-only: no baseline-relative or trend rules (table v2), no
  immunosuppressant drug levels (condition-aware tier, parked).

## 1. Global structural questions (answer once, apply everywhere)

**Q-G1 — Exact critical value tier.** Current convention: EMERGENCY bands are
*exclusive* (`value < emLow` / `value > emHigh`), so the exact critical value
(potassium exactly 6.5, sodium exactly 160, glucose exactly 500) classifies
**TODAY**, not EMERGENCY. Pinned by tests so any change is deliberate.
- [ ] Keep (exact bound = TODAY)  - [ ] Change to inclusive EMERGENCY (≥ / ≤)  Initials: ____

**Q-G2 — Value-only vs symptom/context escalation.** Current design: a value
alone fires the full tier ("conservative over-triage": a false takeover costs
a phone call; a missed emergency costs more; the primary user is 61 and using
the app under stress). External review proposes AHA-style gating for several
metrics: value → immediate repeat → EMERGENCY only with danger symptoms,
TODAY otherwise (still fully deterministic — checkbox symptoms, no AI). This
reduces sensitivity and adds steps at the worst moment; it also reduces alarm
fatigue. Rule per metric in section 2 (column "Escalation model").
- [ ] Keep value-only everywhere  - [ ] Adopt symptom-gating for the rows marked below  Initials: ____

**Q-G3 — Repeat-reading protocol (home vitals only).** Proposed: BP/HR/SpO2/
temp prompt an immediate repeat measurement (e.g., BP after ≥1 minute) before
the advisory fires, never delaying when danger symptoms are present, and never
asking the patient to "repeat" a laboratory result. (A-12 already blocks
implausible manual entries at save time; this is a separate re-measure flow.)
- [ ] Adopt (numbers/timing to be specified by reviewer)  - [ ] Reject  Initials: ____

## 2. Threshold rows

Notation: `[a, b)` = a inclusive, b exclusive. All units as shown. "E" =
EMERGENCY, "T" = TODAY. Every row: approve current, approve alternate, or
write a ruling.

### Vitals

| Metric | Current bands (v1.1.0) | Proposed alternate (external review) | Escalation model asked | Decision |
|---|---|---|---|---|
| Systolic BP (mmHg) | E <90 · E >200 · T [180, 200] (no low-side T per Greg's ruling) | >180 → repeat ≥1 min; still high + danger symptoms → E; still high w/o symptoms → T. Low BP → T unless danger symptoms; reviewer may set an extreme value-only E below 90 | Value-only vs symptom-gated | [ ] Current [ ] Alternate [ ] Ruling: ______ |
| Diastolic BP (mmHg) | E >120 · T <50 | Same repeat/symptom logic as systolic; <50 already T (matches alternate) | Value-only vs symptom-gated | [ ] Current [ ] Alternate [ ] Ruling: ______ |
| Heart rate (bpm) | E <40 · E >140 · T [40, 50) · T [120, 140] | <40 / >140 → E only with danger symptoms; T without symptoms after confirming reading; value-only E only at an extreme reviewer-set bound | Value-only vs symptom-gated | [ ] Current [ ] Alternate [ ] Ruling: ______ |
| SpO2 (%) | E <88 · T [88, 92) | Endorsed as conservative starting points; add immediate repeat with proper sensor placement; display documented baseline when one exists; never claim the number alone proves hypoxia | Repeat protocol only | [ ] Current [ ] Current + repeat flow [ ] Ruling: ______ |
| Temperature (°F) | E ≥103.0 · T [100.4, 103.0) — **no low-temp band (known gap)** | Add E <95.0 (hypothermia). Make ≥103 immediate team contact / ED, with E reserved for danger symptoms (confusion, seizure, cannot wake, severe breathing trouble, blue lips, stiff neck) | Low-temp number + high-side model | [ ] Current + add <95 E [ ] Alternate [ ] Ruling: ______ |

### Labs (EMERGENCY bounds are the same critical values as the A-01 urgent tier — single source, test-asserted)

| Metric | Current bands (v1.1.0) | Proposed alternate (external review) | Notes for reviewer | Decision |
|---|---|---|---|---|
| Potassium (mEq/L) | E <2.5 · E >6.5 · T [2.5, 3.0) · T [6.0, 6.5] | Bounds defensible; resolve ≥6.5 vs >6.5 (Q-G1); surface hemolyzed/contaminated flags when source reports them (data not currently captured — feature, not threshold) | Rate of change and ECG context are out of scope for v1 absolutes | [ ] Current [ ] Ruling: ______ |
| Sodium (mEq/L) | E <120 · E >160 · T [120, 130) · T [150, 160] | Keep as conservative starting points; distinguish "go to ED now" (confirmed new severe value) from "call 911" (neurological symptoms) in wording | Severity is symptom/acuity-dependent | [ ] Current [ ] Ruling: ______ |
| Glucose (mg/dL) | E <50 · E >500 · T [50, 70) · T [400, 500] — **70–399 fires nothing (flagged as too permissive)** | Low: 54–69 treatment workflow, <54 severe-low. High: same-day threshold ~250–300 (persistence/symptom/ketone-dependent); 400+ at least T | **Deferred to this review + legal:** any in-app treatment steps (fast-acting carbohydrate, glucagon) are care direction — DEC-001/device-line question, needs-attorney | [ ] Current [ ] Alternate (specify: ____) [ ] Ruling: ______ |
| Hemoglobin (g/dL) | E <7 · T [7, 8.0) | <7 → T/urgent evaluation, not automatic 911; E only with active bleeding, fainting, severe breathlessness, chest pain, confusion, shock signs, rapid decline | 7 is a transfusion-decision threshold, context-dependent | [ ] Current [ ] Alternate [ ] Ruling: ______ |
| Platelets (K/uL) | E <20 · T [20, 50) | <20 → immediate same-day team contact / likely ED direction; E only with uncontrolled bleeding, blood in vomit/stool, sudden severe headache, neuro change, fainting, trauma; optional extreme value-only E bound | Transfusion guidance is context-dependent | [ ] Current [ ] Alternate [ ] Ruling: ______ |

**Excluded from v1 (confirm exclusions):** WBC (advisory-excluded; AI-context
only), immunosuppressant levels, creatinine, weight-delta, all baseline-
relative rules.  - [ ] Confirmed  Initials: ____

## 3. Wording rows (templates v1.1.0 — approve each string)

Full strings in `src/data/advisoryTemplates.js`; snapshot-tested verbatim.

| Item | Text under review | Decision |
|---|---|---|
| W1 Emergency sentence | "…meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. …" | [ ] Approve [ ] Revise: ______ |
| W2 Same-day sentence | "…meets Insina Health's same-day alert threshold. Contact your transplant coordinator today…" | [ ] Approve [ ] Revise: ______ |
| W3 No-coordinator fallback | "Contact your transplant program's main or after-hours line, or the clinician who ordered this test, today. If you cannot reach a clinician promptly, go to the nearest Emergency Department." | [ ] Approve [ ] Revise: ______ |
| W4 Verify-first (imports) | "The imported value appears to be {metric} {value}, from your document dated {date}. Verify it against the original report now." → advisory fires only after patient confirmation | [ ] Approve [ ] Revise: ______ |
| W5 Verified appendix | "You verified this value against your imported document dated {date}. If you have not already discussed this result with your care team, contact them now." (keeps DEC-039 proactive clause) | [ ] Approve [ ] Revise: ______ |
| W6–W15 Per-metric symptom sentences | One per metric (`METRIC_SYMPTOM_SENTENCES`): bp stroke-signs/vision, hr, o2 blue-lips/confusion, temp confusion/seizure/stiff-neck/cannot-wake, K, Na, glucose, Hgb, platelets. Lab sentences mirror the A-01 guidance clauses; **vital sentences are new drafts** | [ ] Approve all [ ] Row edits: ______ |

## 4. Deferred items (explicitly NOT implemented; decide here)

| # | Item | Why deferred | Decision |
|---|---|---|---|
| D1 | ADA-style hypoglycemia treatment steps in-app (carbohydrate/15-min recheck/glucagon) | Treatment direction — DEC-001 / FDA device line. **Needs-attorney.** | [ ] Reject [ ] Adopt w/ legal sign-off: ______ |
| D2 | Symptom-gated EMERGENCY for BP/HR/fever/Hgb/platelets (Q-G2) | Sensitivity reduction is a clinical call | [ ] See Q-G2 |
| D3 | Low-temperature EMERGENCY bound (<95.0°F proposed) | Number needs clinical sign-off | [ ] Adopt <95.0 [ ] Other: ______ |
| D4 | High-glucose same-day cutoff below 400 (~250–300 proposed) | Number needs clinical sign-off | [ ] Keep 400 [ ] Set: ______ |
| D5 | Documented-baseline display for SpO2; hemolysis/contamination display for K | Data model doesn't capture these yet | [ ] Park [ ] Spec: ______ |

## 5. Sign-off

Every checked decision above ships as a deliberate, versioned change
(threshold-table and/or template version bump, snapshot tests updated on
purpose). Until this page is signed, `TRIPWIRE_ADVISORY_ENABLED` stays false.

Reviewer name: ______________________  License/credential: ______________
Date: ____________  Signature: ______________________

Scope of approval (check all that apply):
- [ ] Section 1 global rulings  - [ ] Section 2 thresholds  - [ ] Section 3 wording  - [ ] Section 4 deferred decisions
