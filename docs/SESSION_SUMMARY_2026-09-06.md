# Session summary: usability review and dashboard redesign

Date: September 5 and 6, 2026
Project: Insina Health

## What this session set out to do

Answer whether Insina is too hard for the average liver disease patient to use, and if so, decide where the product needs to get to and how to get there.

## What was concluded

Yes, as built today. The platform was designed by and for an outlier user. The target population (pre- and post-transplant liver patients, often older, rural, on phones, with hepatic encephalopathy, tremor, and eye disease in the risk profile) faces three barriers: cognitive load from 13 modules and a confirmation-heavy ingestion contract, a visual design that fails accessibility contrast by a wide margin, and a setup path that assumes the founder's technical ability. The caregiver, not the patient, is often the real operator during high-acuity periods.

## What was produced

1. `INSINA_USABILITY_REMEDIATION_PLAN.md`: ten testable end-state conditions, an operator model proposal, three complexity tiers, four delivery phases from now through Q2 2027, a list of what does not change, and a reusable usability test protocol.
2. `insina_tier0_today.jsx`: mobile Tier 0 "Today" mockup with patient and caregiver modes and light and dark themes. Depends on the operator model DEC, which is not yet written.
3. `insina_dashboard_feed.jsx`: desktop dashboard rebuilt on the MyChart pattern through eleven rounds of revision. Final state: one "Your updates" column capped at five, five quick action tiles with count badges on Medications and Appointments, three vitals cards, Who to call with tap-to-call numbers, Insina AI panel, collapsible sidebar with four groups, avatar menu for Profile, Settings, Backup, and Log out, bell for passive updates, icon-only search and text size in a trimmed top bar, Last updated on the greeting row. Render-tested.
4. `DEC_DRAFT_USABILITY_2026-09-06.md`: twelve draft DEC entries (IDs TBD) plus six deferred decisions.
5. `WO_ACCESSIBLE_TOKENS_01.md`: Claude Code work order for the mechanical token pass, blocked until DEC-TBD-01 and 02 merge.
6. A seven-step sequence for moving from files to the first merged PR.

## Key judgment calls made in the session

- Accessibility baseline elevated to a hard rule with the same weight as the em dash and disclosure accuracy rules.
- Accessible token values computed and verified (old text-faint 1.5:1, new 6.2:1, and so on). Brand accent #4F8EF7 preserved for marks and external materials; #6ea3ff for in-app text and interactive states.
- Feed replaces status wall. Only tripwire flags, pending reviews, out-of-range results, and dated items qualify. Flags are acknowledged, never dismissed. Passive events go to the bell.
- Needs-attention items never leave the main column; separate alerting is additive, not a replacement.
- Emergency tier renders as a red strip above quick actions, leading with 911 and nearest ED. Copy authored by the tripwire spec, not the dashboard.
- Refills treated as dated items alongside appointments.
- Import records stays reachable from the dashboard (top bar) until FHIR ingestion exists; Labs tile dropped since results arrive in the feed.
- Text size control accepted as opt-in only; Normal is the AA-verified default and the app never sets Smaller.
- Phone preview button is artifact-only; the product is responsive without it.

## Corrections made during the session

- Two artifact crashes, one from a renamed icon (AlertTriangle to TriangleAlert in the installed lucide-react) and one from a constant referenced under two names after partial edits. Both files are now render-tested in a harness before hand-off; that check is now part of how mockups are delivered.
- Import records was mistakenly omitted from the sidebar during nav trimming; restored.

## Open items and next actions

1. Review the twelve DEC drafts in chat; accept, edit, or reject each.
2. Assign real DEC numbers and append accepted entries to DECISIONS.md.
3. Unblock WO_ACCESSIBLE_TOKENS_01 with real IDs and hand to Claude Code.
4. Write the operator model DEC (patient-primary, caregiver-primary, handoff) before any Tier 0 or caregiver onboarding design. Needs a counsel check on identity and consent under non-custodial storage.
5. Raise the usability test with Teresa Davidson at the next conversation: five patients, two caregivers, three tasks, demo persona only.
6. Later work orders, each behind its own DEC: dashboard restructure, light theme, text size control.

## Standing reminders

- Design before Decision happened this session. The DEC drafts close that gap; do not let the work order run before they merge.
- Every opinion on this screen is Greg's and Claude's. The test with MSLA patients is the only measurement that counts.
