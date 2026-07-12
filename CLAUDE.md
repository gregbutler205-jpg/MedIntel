# CLAUDE.md — Insina Health: How This Project Works

Context for every Claude Code session. Read this alongside DECISIONS.md at
session start. The pilot implementation is governed by CLAUDE_CODE_PROMPT.md
and the specs it names; this file carries the standing ground rules.

## Project documents

- **PILOT_GATE.md** — go/no-go checklist before any second user (PG-01..11).
- **APP_CHANGES_SPEC.md** — implementation spec (S-, P-, A- items).
- **INSINA_AI_PROMPTS.md** — AI prompt spec. Section 3 (Clinical Safety Core)
  is copied verbatim into code; section 9 is the acceptance checklist.
- **INSINA_UI_CHANGES.md** — UI workstream source of truth (UI-N items).
  Where a UI item shares code with an engineering item, its pointers govern
  which document owns what.
- **DECISIONS.md** — why things are the way they are (DEC-NNN). Never reverse
  or re-implement anything marked Settled without explicit instruction from
  Greg. If a task would contradict a Settled decision, stop and flag it.
- **CHANGELOG.md** — what shipped and when. Semantic versioning.

## Ground rules

1. **Execute the spec.** If an instruction is impossible, conflicts with the
   code, or requires a choice the spec does not settle, stop and ask Greg.
   Ambiguity resolves upward, never into improvisation.
2. **One item per commit.** Commit message format: item IDs first, then a
   short description — e.g. `S-02 PG-02: escape AI output in shared renderer`.
   Log decisions in DECISIONS.md and cite DEC IDs in commits.
3. **CHANGELOG.md updated with each item**, following its existing format and
   versioning conventions.
4. **`npm run build` must pass after every item.** The threshold fixtures
   (`npm run test:thresholds`, from A-01) are the first automated check and
   are wired into prebuild.
5. **Scope discipline.** No refactors, dependency changes, formatting sweeps,
   or UI redesign beyond what an item specifies. Preserve the existing visual
   design exactly.
6. **Never print, log, or commit a secret.** Use placeholders for tokens and
   env values; Greg sets real values in Render, GitHub, and Anthropic himself.
7. **Items marked HUMAN are Greg's.** Stop, state exactly what to do and
   where, and wait for confirmation before proceeding.
8. **Items marked DECISION:** ask the question, wait for the answer, then
   implement. Never pick a default.
9. **Explicitly pending, do NOT implement without go:** the CSC rule 10
   rewording (INSINA_AI_PROMPTS.md section 10). Per-month digest anchors are
   optional future work, out of scope.
10. **Commit locally per item. Push only at phase checkpoints after Greg's
    go** (exception: the Phase 0 history purge pushes immediately). Pushing
    main deploys via GitHub Pages, so pushes are deliberate.
11. **Stop at the end of each phase.** Report, then wait for "continue".

## Secrets hygiene (S-06, standing)

Pre-commit secret scanning applies to this repo: run gitleaks (or
equivalent) against staged changes before committing; never commit
credentials, tokens, or `.env*` values. `*.docx`, `.claude/`, and `.env*`
are gitignored (S-01). Any credential ever committed is treated as
compromised and rotated immediately — deletion alone leaves it recoverable
in history (DEC on repo hygiene). GitHub push protection is enabled on the
repo (HUMAN-managed).

## Reporting format (every item)

Item ID; files touched; what changed in two sentences; how verified; any
deviation from spec and why; commit hash.

## Questions protocol

Blocking gates (HUMAN, DECISION) stop immediately. Everything else: batch
questions at natural pauses rather than one at a time. Never guess on a
DECISION item, and never resolve a spec conflict silently.
