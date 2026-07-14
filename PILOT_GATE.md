# Pilot Gate - Small-Group MVP Readiness

Status (2026-07-14, Phase 1 checkpoint): all eleven PG items are implemented
in code and verified (build gates, Node test harnesses, and a live in-browser
pass against a restored copy of the founder's real record). Three human/
external actions remain before actually inviting a second user — they gate
the invitation, not this deploy: (1) Anthropic monthly spend cap confirmed
set in the console (PG-04 backstop, HUMAN); (2) pilot bearer tokens issued
out-of-band to each invitee (PG-04, HUMAN, at invite time); (3) attorney
review of the terms/privacy/consent drafts, which ship marked DRAFT (PG-11,
external — see APP_CHANGES_SPEC Part 4). Also outstanding: clinical review
of the default tripwire threshold library (OPEN-10) — until then the urgent
tier is gated off and the app says so ("pending clinical review").

Scope: a small, invited pilot group. Passphrase-derived encryption replaces
the PIN lock now. Two-step authorization is deferred until there is a
server-side account/login surface for it to protect (see "Deferred" below).

Each item lists what, where, why, and the fix. Check off in commits, and
reference the item ID (PG-01, PG-02, ...) in commit messages.

---

## Category A - Must fix before any second user touches the app

### PG-01. Rotate and purge the committed GitHub token
**Where:** `GitHub Token.docx` (repo root)
**Why:** A live PAT is committed to a public repo. It sits inside a .docx
(a zip container), so GitHub secret scanning likely never flagged it.
Anyone who clones the repo has it. If it has repo scope, that's push access
to the repo this app deploys from - a supply-chain compromise of every
pilot user, not just the founder.
**Fix:**
1. Revoke the token at github.com/settings/tokens now, before anything else.
2. Delete `GitHub Token.docx` from the working tree.
3. Purge it from git history (`git filter-repo` or BFG - a plain delete
   commit leaves it recoverable in history).
4. Add `*.docx` and `.claude/` to `.gitignore`. Remove
   `.claude/settings.local.json` from the repo (leaks local paths/username).

### PG-02. Escape HTML before rendering AI responses
**Where:** `applyBold()` in `Tab05.jsx` and `Tab11.jsx`
**Why:** AI responses render via `dangerouslySetInnerHTML`. `applyBold` only
converts `**bold**` to `<strong>` - it does not escape `&<>"'` first. A
malicious or compromised PDF gets OCR'd into `mi_ref_docs`, the model quotes
it back, and an embedded tag (e.g. `<img onerror=...>`) executes in the
app's origin. That origin holds the full record, `mi_ak`, and the PIN hash
in localStorage. Low likelihood while only the founder uploads documents;
becomes real once a pilot group uploads their own.
**Fix:** Escape `&<>"'` before the bold-conversion regex runs, in both files.
One shared helper, not two copies.

### PG-03. Bundle pdf.js instead of loading it from a CDN
**Where:** `Tab12.jsx` - dynamic `import("https://cdnjs.cloudflare.com/...")`
**Why:** `package.json` already bundles `pdfjs-dist@5.5`, but this one call
site pulls `4.4.168` from a CDN at runtime. A compromised CDN executes code
in the app's origin. Also breaks offline use and creates version drift.
**Fix:** Import the bundled `pdfjs-dist` package everywhere; delete the CDN
import.

### PG-04. Turn on proxy rate limiting and set an Anthropic spend cap
**Where:** `proxy/server.js` - `limiter` has `skip: () => true`
**Why:** The proxy is currently an open relay. CORS does not stop `curl` -
it's a browser convention, not authentication - and the proxy URL ships in
the public bundle of a public repo. Anyone can spend the Anthropic balance
behind it, at Opus prices, without limit.
**Fix:**
1. Set `skip: () => false` (or remove the option) and choose a real `max`.
2. Set a hard monthly spend cap in the Anthropic console as a backstop.
3. Add per-pilot-user bearer tokens issued out-of-band (a shared secret per
   invited user is enough at this scale - this is not the App
   Attest/Play Integrity work, that's the item after this pilot).

### PG-05. Add a CSP meta tag
**Where:** `index.html`
**Why:** GitHub Pages can't set response headers, but a meta-tag
`Content-Security-Policy` (`script-src 'self'`, plus the pdf.js and font CDNs
you actually use) meaningfully narrows the blast radius of PG-02 even after
it's fixed. Cheap defense-in-depth for a multi-user record.
**Fix:** Add the meta tag; test that fonts (Google Fonts) and any remaining
legitimate CDN calls still load, and allowlist only those origins.

---

## Category B - De-personalize the clinical layer

The AI prompts and reference data currently encode the founder's specific
medical facts as if they were universal truths. For a second user with
different conditions, the app will confidently deliver the founder's
clinical context as if it were theirs. This is the highest-severity item
for a multi-user pilot, ahead of the security items above in clinical risk
even though it's listed second.

### PG-06. Remove patient-specific facts from static prompt text
**Where:** AI system prompts (Tab11, Tab05, Tab14) - "Valganciclovir
prophylaxis ongoing", "CMV: D-/R+", hardcoded phosphorus/CKD framing, and
similar hardcoded clinical assertions
**Why:** These are static text, not runtime-injected data. They will
contradict a different patient's actual record, and the model will
sometimes resolve the contradiction the wrong way.
**Fix:** Static prompt text carries zero patient-specific clinical facts.
Reference content (drug interactions, food restrictions, infection risks)
is either condition-generic and gated on the patient's own injected problem
list (`mi_conditions`), or generated per patient and versioned like any
other clinical content.

### PG-07. Remove the silent kidney-to-liver auto-correction
**Where:** Surgical history section - "kidney transplant" and "LDKT" are
silently rewritten to "Liver Transplant (LDLT) [corrected]" before reaching
the model
**Why:** This directly violates the RIE flag-don't-fix principle already
established in this project. It's invisible to the patient, and it will
silently corrupt the record of any real kidney-transplant pilot user.
**Fix:** Route through the Review Queue (`src/rie/reviewQueue.js`) as a
flagged discrepancy. The patient confirms once; the confirmed value is what
gets stored and injected, not a silent rewrite.

### PG-08. Fix Tab10's direct Anthropic call
**Where:** `Tab10.jsx` (Notes AI summary)
**Why:** This is the one AI surface that bypasses the proxy entirely,
calling `api.anthropic.com` directly with `mi_ak` from the browser. It's
missing the `anthropic-dangerous-direct-browser-access` header Anthropic
requires for browser calls (so it may be failing outright), uses a stale
model string not on the proxy allowlist, and injects the patient's real
name into the prompt - the same identity leak flagged on Tab05's Q&A path.
**Fix:** Route through `${PROXY_URL}/api/chat` like every other tab. Use the
anonymous `userId`, not the patient's name.

### PG-09. Wire up the deterministic urgency thresholds
**Where:** `src/config/urgencyThresholds.js` defines `URGENCY_THRESHOLDS`
with `urgentLow`/`urgentHigh` per analyte, but nothing in the codebase
imports it except `CONSENT_VERSION`. It is not evaluated anywhere.
**Why:** Right now the LLM is the only thing classifying Today/Emergency
urgency for lab values - exactly the function this file's own header
comment says it should be handling deterministically. For a pilot user
whose thresholds the founder does not personally know by heart, an LLM
misclassification carries real consequence, and pilot users will trust
whatever the app flags.
**Fix:** Evaluate incoming labs against `URGENCY_THRESHOLDS` on import and
sync (this is a small function - loop the labs, compare against
low/high/urgentLow/urgentHigh, output a flag). Surface the flag in the UI.
The AI's job becomes explaining and echoing that classification, not
originating it.

---

## Category C - The "password protection" reframe

### PG-10. Passphrase-derived encryption, not a login screen
**Why this needs reframing:** There is no server holding records in this
architecture, so a password that only gates the UI (the current 4-digit PIN
model) protects nothing that isn't already sitting in plaintext in
localStorage. It satisfies neither the spirit nor the letter of DEC-008.
**What "password protected" needs to mean instead:**
1. Derive an encryption key from the user's passphrase (PBKDF2 or Argon2 via
   WebCrypto - do not roll a custom KDF).
2. Encrypt the record at rest in localStorage with AES-GCM, keyed off that
   derived key.
3. Encrypt before every Drive upload, so Drive-stored data is also
   ciphertext, not just the local copy.
4. Add a recovery-key export at setup time. A forgotten passphrase must not
   mean a destroyed medical record - this is a real usability/safety
   requirement, not optional polish.
5. The existing PIN/hash approach (SHA-256 of a 4-digit PIN with a hardcoded
   salt) can stay as a quick-unlock convenience layer *in front of* the
   decryption, but it is not itself the security boundary. Say so plainly
   in any user-facing copy - don't let "PIN protected" imply more than it
   delivers.

---

## Category D - Legal minimum for a real pilot group

### PG-11. Consent and terms before pilot users touch the app
**Why:** The moment other people's health records are involved, this
crosses from "founder's personal tool" into something the FTC Health Breach
Notification Rule attaches to (Insina Health is a PHR vendor). The
regulatory-attorney review already gated for commercialization is broader
than what's needed here - this is the narrow slice that can't wait.
**Fix, minimum viable version:**
1. A short terms-of-use and privacy-policy page, plain language, describing
   the non-custodial storage model accurately.
2. An explicit AI-limitations consent screen at first use: informational
   only, not a diagnosis, not a substitute for medical care, verify
   everything with your care team. This should echo the "AI proposes,
   patient disposes" framing already used internally.
3. Each pilot user should explicitly acknowledge they understand the app is
   pre-commercial and unreviewed by regulators.

---

## Deferred - explicitly out of scope for this gate

- **Two-step authorization.** Protects a remote login/account surface. This
  architecture doesn't have one yet. Revisit if/when server-side accounts
  are introduced - and note that adding accounts is itself the moment this
  app starts holding its first piece of custodial data (credentials),
  which deserves its own decision, not a quiet addition.
- **App Attest / Play Integrity proxy authentication.** Real fix for the
  open-relay problem, but it requires a native shell. PG-04's shared bearer
  token is the right-sized stopgap for a small invited pilot group.
- **Full RIE buildout, FHIR integration, native app work.** Already tracked
  elsewhere (FEATURE_INTAKE.md, Phase 2 roadmap). Not blocking a pilot.
- **Formal penetration testing.** Reasonable before a public launch; not a
  proportionate bar for a small invited group.

---

## Sign-off

Do not invite a second user until every Category A and Category B item is
checked, and PG-10 (passphrase-derived encryption) and PG-11 (consent/terms)
are in place. Category C beyond PG-10 and anything in Deferred can wait.

- [x] PG-01 - GitHub token rotated and purged (S-01; history rewritten, push protection on)
- [x] PG-02 - HTML escaping in applyBold (S-02; one shared renderer, `renderAiText.js`)
- [x] PG-03 - pdf.js bundled, CDN import removed (S-04)
- [x] PG-04 - Proxy rate limiting on (S-05); bearer-token support shipped (S-05 item 3).
      HUMAN remaining: confirm Anthropic console spend cap; issue tokens at invite time.
- [x] PG-05 - CSP meta tag added (S-03)
- [x] PG-06 - Prompt text de-personalized (A-09 prompts-as-code + A-06 condition modules)
- [x] PG-07 - Silent auto-correct deleted; RIE flags to Review Queue (A-05)
- [x] PG-08 - Tab10 routed through proxy (A-02 unified client; no direct Anthropic calls remain)
- [x] PG-09 - Urgency thresholds evaluated deterministically (A-01 tripwire engine + fixtures).
      OPEN-10 remaining: clinical review of the default library before the urgent tier activates.
- [x] PG-10 - Passphrase-derived encryption shipped (P-02: PBKDF2→AES-GCM, recovery key,
      ciphertext-only Drive uploads; DEC-032 remanence fix; post-unlock migrations)
- [x] PG-11 - Consent and terms in place (P-06: in-app Before-You-Start + acknowledgment,
      TERMS/PRIVACY drafts marked DRAFT pending attorney review — external gate for invites)
