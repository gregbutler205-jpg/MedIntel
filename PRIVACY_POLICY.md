# Insina Health — Privacy Policy

> **DRAFT — pending attorney review.** This document describes the app's actual
> technical behavior as accurately as we can state it today. It is not final
> legal language and must not be treated as binding until reviewed and approved
> by counsel. Placeholders (`[…]`) mark facts only Greg or an attorney can fill
> in — do not remove them by guessing a value.

**Last updated:** 2026-07-12 (DRAFT)
**Applies to:** Insina Health, a pilot personal health record application, and
its companion mobile app.

---

## 1. The short version

Your health record is stored on your own device. Insina Health has no server
that holds your data. When you use the AI features, the specific information
needed to answer your question is sent — under a random ID, never your name —
through Insina's proxy to Anthropic (the company that runs the Claude AI
model), which generates a response and returns it. Nothing is retained on
Insina's side afterward. If you connect Google Drive, your data is encrypted
before it leaves your device and Insina never holds the key.

The rest of this document explains that in more detail, including the parts
that are easy to state inaccurately if you're not careful — we'd rather be
precise here than sound reassuring.

---

## 2. Where your data lives

- **On your device.** Your health record — conditions, medications, labs,
  vitals, documents, notes, and everything else you enter — is stored in your
  browser's local storage (or the equivalent on the companion app), encrypted
  at rest under a passphrase only you know. Insina Health has no database and
  no server-side copy of your record.
- **Optionally, in your own Google Drive.** If you connect Google Drive, a
  backup of your encrypted record is stored in a hidden, app-specific folder
  in *your* Drive account — one only this app can read, and one Insina Health
  itself cannot see. What's uploaded is ciphertext: encrypted data, not your
  readable record. Losing your passphrase and its one-time recovery key means
  this backup is not recoverable by Insina Health either — there is no
  password reset.
- **Nowhere else.** Insina Health does not operate a database of user health
  records. There is no "Insina Health server" holding a copy of your data,
  because none exists.

---

## 3. What happens when you use the AI features

When you ask a question or request an analysis, Insina Health's proxy server
sends the specific data your request needs — the relevant labs, conditions,
medications, and similar record fields, never your legal name, date of birth,
address, phone number, email, or insurance/ID numbers — to the Anthropic API,
which generates the response.

- **Pseudonymous, not anonymous.** Your data is identified by a randomly
  generated ID, not your name. This materially reduces — but does not
  eliminate — identifiability: a sufficiently detailed medical record can in
  principle be re-identifiable regardless of what name is or isn't attached
  to it. We say this plainly because "pseudonymous" is sometimes used to imply
  more privacy than it delivers.
- **What Insina's proxy does and doesn't retain.** The proxy server code does
  not store or log the content of your requests or the AI's responses. It is
  not "zero-log" in an absolute sense: the infrastructure that hosts the
  proxy (currently Render) retains standard HTTP access metadata — IP
  addresses, timestamps, request paths — as a normal, automatic part of
  running any web server, independent of anything Insina's own code does.
  This is true of essentially all hosted infrastructure and is not something
  application code can opt out of.
- **What Anthropic does with the data.** Anthropic's own data-handling and
  retention terms apply to data it receives via its API. `[Anthropic's
  current data-retention posture and whether a zero-data-retention
  arrangement applies to this account tier — to be confirmed and dated once
  verified, per APP_CHANGES_SPEC P-04]`.

---

## 4. What Insina Health never does

- Sell or share your health data with third parties, advertisers, or data
  brokers.
- Use your data to train AI models.
- Require your legal name, date of birth, address, phone number, email, or
  insurance/government ID to use the AI features — these are structurally
  excluded from every request the app sends.
- Diagnose, recommend treatment, or direct medical care. See the
  AI-limitations notice you're shown before first use, and the Clinical
  Safety Core described in `INSINA_AI_PROMPTS.md`.

---

## 5. Your controls

- **Export your data.** A full export of your record, in a portable file you
  can read without this app, is available at any time from Settings.
- **Delete your data.** You can clear your entire local record from Settings.
  Because there is no Insina Health server copy, this is a real, complete
  deletion on your device — though it does not reach a Google Drive backup
  you made previously, which you control and can delete yourself from Drive.
- **Change your mind about Advanced Mode.** Standard and Advanced AI modes
  can be switched at any time; Advanced Mode's informed consent can be
  withdrawn by switching back.

---

## 6. Cookies and tracking

Insina Health does not use third-party analytics, advertising trackers, or
cross-site cookies. `[Confirm and list anything that should be disclosed here
— e.g. Google OAuth's own cookies when Drive sync is connected.]`

---

## 7. Breach notification

Insina Health is a personal health record vendor and, as such, falls under
the FTC's Health Breach Notification Rule once other people's records are
involved (not just Greg's own). See `INCIDENT_PLAYBOOK.md` for the internal
response plan; affected users would be notified per that rule's requirements.

---

## 8. Changes to this policy

`[Standard "we may update this policy" language, with a mechanism for
notifying pilot users of material changes — to be finalized with counsel.]`

## 9. Contact

`[Contact email/address for privacy questions — to be added.]`

---

**Related:** `TERMS_OF_SERVICE.md`, `INCIDENT_PLAYBOOK.md`,
`DECISIONS.md` (DEC-014 secrets hygiene, DEC-023 emergency access,
OPEN-8 repository visibility), `APP_CHANGES_SPEC.md` (P-03, P-04).
