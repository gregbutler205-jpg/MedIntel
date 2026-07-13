# Insina Health — Incident Playbook (P-05)

> Internal document. Not user-facing. Written before the pilot so a real
> incident is handled from a plan, not improvised under pressure.

**Purpose:** Insina Health is a personal health record vendor and, as such,
falls under the **FTC Health Breach Notification Rule (HBNR)** the moment
other people's records are involved — not just Greg's own. HBNR carries
notification duties with real deadlines. This is a one-page plan for what to
do if something goes wrong, written now, not during an incident.

---

## 1. What counts as a breach here

Given the non-custodial architecture (no server-side copy of health data,
records encrypted at rest under a user's own passphrase), the realistic
breach scenarios are narrower than for a typical hosted service, but not
zero:

- **Proxy compromise.** Unauthorized access to the Render-hosted proxy server
  or its environment variables (Anthropic API key, pilot bearer tokens).
  Because the proxy does not log or store request content, the exposure here
  is credentials and metadata, not stored health records — but a compromised
  proxy could be used to intercept in-flight requests.
- **Repository exposure.** A secret (API key, token) committed to the GitHub
  repository, or the repository itself becoming unintentionally exposed. See
  `DECISIONS.md` DEC-014 for the standing rule that any credential ever
  committed is treated as compromised and rotated immediately.
- **Google account compromise.** A pilot user's Google account (and
  therefore their Drive-stored encrypted backup) being compromised. Because
  Drive uploads are ciphertext only, the practical exposure is limited to
  what an attacker could do with the ciphertext plus knowledge of, or a
  successful attack on, the user's passphrase — but this still needs a
  notification-readiness plan.
- **Device compromise.** A pilot user's own device being compromised (malware,
  physical access while unlocked). Outside Insina Health's direct control,
  but still a "breach of security of unsecured PHR identifiable health
  information" under HBNR's definition if it results from a vulnerability in
  the app itself (e.g., a bug that left data unencrypted, or an XSS that
  exfiltrated an unlocked session).
- **A vulnerability in the app itself** — e.g., a bug that stored data
  unencrypted when it shouldn't have been, or a cross-site-scripting hole
  that let an attacker read data from an unlocked session.

## 2. Immediate response steps

1. **Contain.** Rotate any exposed credential immediately (API keys, pilot
   tokens, OAuth secrets). If the proxy itself is compromised, take it
   offline (Render dashboard) while investigating — the app fails closed
   (AI features stop working; local data access is unaffected since it
   never depended on the proxy).
2. **Assess scope.** Determine: which users are affected, what data was
   actually exposed (credentials/metadata vs. health record content vs.
   ciphertext only), and whether the exposure is ongoing or contained.
3. **Preserve evidence.** Before making changes that would destroy logs or
   state, capture what's needed to understand what happened (Render logs,
   git history, GitHub audit log).
4. **Fix the root cause**, not just the symptom — per the project's standing
   principle of fixing causes over shortcuts.
5. **Determine HBNR notification obligations.** `[Consult counsel on exact
   triggers and deadlines under the FTC Health Breach Notification Rule —
   generally: notify affected individuals without unreasonable delay and no
   later than 60 days after discovery; notify the FTC; and if 500+ individuals
   in a state/jurisdiction are affected, notify prominent media in that
   area. Confirm current rule text and thresholds before relying on this
   summary — the rule has been amended and thresholds/timing should be
   re-verified at the time of any actual incident.]`
6. **Notify.** Once scope and obligations are confirmed: affected users
   first, then regulatory notification per the confirmed requirements, using
   plain language consistent with `PRIVACY_POLICY.md`'s tone — accurate about
   what happened and what it means for them, not minimizing.

## 3. Who does what

`[To be filled in once the pilot has more than one person involved — currently
Greg is the sole point of contact for all of the above. If a co-founder,
contractor, or advisor joins, assign: incident commander, technical lead
(containment/fix), communications lead (user + regulatory notification).]`

## 4. After-action

Every incident, however small, gets a `DECISIONS.md` entry (or a dedicated
postmortem doc referenced from one) describing what happened, the root
cause, and what changed to prevent recurrence — the project's existing
pattern for every other significant decision.

---

**Related:** `PRIVACY_POLICY.md` §7, `DECISIONS.md` DEC-014 (secrets hygiene),
`APP_CHANGES_SPEC.md` P-05.
