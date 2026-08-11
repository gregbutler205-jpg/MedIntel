// ── DEC-046: "include in appointment prep" marks on AI analysis reports ──────
// An AI analysis often ends with points to raise with specific specialists —
// and until now Consultation Prep could not see it: the prep prompt reads
// conditions, meds and keyword-matched documents, but never mi_notes, where
// every analysis is saved. So the app produced advice and then forgot it at
// exactly the moment it mattered.
//
// The mechanism is EXPLICIT marking, not search (Greg's call, and the right
// one): when a report is saved, the patient marks it for the care-team members
// it concerns; Consultation Prep for a matching appointment then carries the
// marked report into its prompt. Deterministic end to end — the only AI
// involvement is the prep call that was already happening. DEC-042 is not
// reopened: saved conversations remain archive-only; the ONLY thing that flows
// onward is what the patient explicitly marked ("patient disposes").
//
// Lifecycle (Greg, 2026-08-11): a mark means "for my next visit with this
// doctor" — completing an appointment clears the marks that matched it.
// Manual unmark is always available in My Notes.
//
// Lives in a lib, not in Tab14, so the companion's visit prep can adopt it
// without duplicating (v1 is web-only, Greg's call).

import { matchCareTeamMember } from "./careTeamMatch.js";
import { formatDocumentBlock } from "../prompts/documents.js";

export const MAX_PREP_REPORTS = 3;      // newest-first cap per appointment
export const PREP_REPORT_MAX_CHARS = 3000; // same truncation as document blocks

// ── storage ──────────────────────────────────────────────────────────────────

function readNotes() {
  try { return JSON.parse(localStorage.getItem("mi_notes") || "[]"); } catch { return []; }
}
function writeNotes(notes) {
  localStorage.setItem("mi_notes", JSON.stringify(notes));
  // The app's "data changed" bus — lets Notes UIs and the dashboard re-read.
  try { window.dispatchEvent(new Event("mi-data-synced")); } catch { /* non-DOM */ }
}
function readCareTeam() {
  try { return JSON.parse(localStorage.getItem("mi_care_team") || "[]"); } catch { return []; }
}

export function getPrepTargets(note) {
  return Array.isArray(note?.prepTargets) ? note.prepTargets : [];
}

/**
 * Set (or clear, with []) the prep targets on a note. Stamps `updatedAt` so
 * the Drive merge's newer-edit-wins rule (driveSync._mergeArrays) can carry
 * the edit across devices — without the stamp, union-by-id local-first would
 * silently discard a mark made on another device.
 */
export function setPrepTargets(noteId, targets) {
  const notes = readNotes();
  const i = notes.findIndex(n => String(n.id) === String(noteId));
  if (i === -1) return null;
  const note = { ...notes[i], updatedAt: Date.now() };
  if (Array.isArray(targets) && targets.length) note.prepTargets = targets;
  else delete note.prepTargets;
  notes[i] = note;
  writeNotes(notes);
  return note;
}

// ── deterministic suggestion (no AI) ─────────────────────────────────────────

const TITLE_RE = /^(dr|doctor)\.?\s+/i;
const CRED_RE = /,?\s*\b(md|do|np|pa|phd|rn|dnp|facs|facp)\b\.?/gi;

/** "Dr. Sarah Chen, MD" → "chen" — the token a report would call them by. */
export function lastNameOf(name) {
  const cleaned = String(name || "").replace(TITLE_RE, "").replace(CRED_RE, "").trim();
  const tokens = cleaned.split(/[\s,]+/).filter(t => /^[a-z'-]+$/i.test(t));
  const last = tokens[tokens.length - 1] || "";
  return last.toLowerCase();
}

// Words too generic to identify a specialty in a transplant patient's report —
// "transplant" or "medicine" would match nearly every analysis and erode trust
// in the pre-checked suggestions.
const GENERIC_SPECIALTY_WORDS = new Set([
  "medicine", "medical", "care", "primary", "internal", "general", "family",
  "practice", "clinic", "center", "health", "transplant", "doctor", "physician",
]);

function specialtyPatterns(member) {
  const raw = [member?.specialty, member?.role].filter(Boolean).join(" / ");
  const phrases = raw.split("/").map(s => s.trim().toLowerCase()).filter(s => s.length >= 5);
  const tokens = raw.toLowerCase().split(/[^a-z]+/)
    .filter(t => t.length >= 5 && !GENERIC_SPECIALTY_WORDS.has(t))
    // "hepatology" → "hepatolog" so "hepatologist" matches too
    .map(t => (t.endsWith("y") ? t.slice(0, -1) : t));
  return { phrases, tokens };
}

/**
 * Which care-team members does this report text mention? Last-name match
 * (word-boundary) is the primary signal; distinctive specialty words/phrases
 * ("hepatology", "primary care") are the secondary one. Pure text matching —
 * suggestions only; nothing is marked until the patient applies them.
 */
export function suggestPrepTargets(reportText, careTeam = readCareTeam()) {
  const text = String(reportText || "").toLowerCase();
  if (!text || !Array.isArray(careTeam)) return [];
  const out = [];
  for (const m of careTeam) {
    const last = lastNameOf(m.name);
    let hit = last.length >= 3 && new RegExp(`\\b${last.replace(/[-']/g, "\\$&")}\\b`, "i").test(text);
    if (!hit) {
      const { phrases, tokens } = specialtyPatterns(m);
      hit = phrases.some(p => !GENERIC_SPECIALTY_WORDS.has(p) && text.includes(p)) ||
            tokens.some(t => text.includes(t));
    }
    if (hit) out.push(targetFor(m));
  }
  return out;
}

/** The stored shape: stable id plus a name/specialty snapshot for resilience. */
export function targetFor(member) {
  return {
    careTeamId: member?.id ?? null,
    name: member?.name || "",
    specialty: member?.specialty || member?.role || "",
    markedAt: Date.now(),
  };
}

// ── appointment matching (prep side + clear-on-complete) ─────────────────────

const normSpec = s => String(s || "").toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Does a stored target match this appointment? Provider name is primary:
 * the appointment's free-text provider is resolved to a care-team member with
 * the shared scored matcher (same logic the appointment form and calendar
 * sync use), then compared by id or exact name. Specialty is the fallback for
 * appointments with no resolvable provider ("Labs — Hepatology").
 */
export function targetMatchesAppointment(target, appt, careTeam = readCareTeam()) {
  if (!target || !appt) return false;
  const resolved = matchCareTeamMember(appt.provider, careTeam);
  if (resolved) {
    if (target.careTeamId != null && resolved.id != null &&
        String(target.careTeamId) === String(resolved.id)) return true;
    if (target.name && resolved.name &&
        lastNameOf(target.name) === lastNameOf(resolved.name) &&
        lastNameOf(target.name).length >= 3) return true;
  }
  const ts = normSpec(target.specialty), as = normSpec(appt.specialty);
  if (ts && as && (ts === as || ts.includes(as) || as.includes(ts))) return true;
  return false;
}

/** Body text of a note (analysis notes carry one text section). */
export function noteBodyText(note) {
  return (note?.sections || []).map(s => s?.body || "").filter(Boolean).join("\n\n");
}

/**
 * The marked reports that apply to this appointment: newest first, capped at
 * MAX_PREP_REPORTS. Returns { reports, droppedCount } so the UI can say when
 * older marks were left out rather than silently truncating.
 */
export function markedReportsForAppointment(appt, { notes = readNotes(), careTeam = readCareTeam() } = {}) {
  const matched = notes.filter(n =>
    getPrepTargets(n).some(t => targetMatchesAppointment(t, appt, careTeam)));
  matched.sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")) ||
    String(b.id || "").localeCompare(String(a.id || "")));
  return {
    reports: matched.slice(0, MAX_PREP_REPORTS),
    droppedCount: Math.max(0, matched.length - MAX_PREP_REPORTS),
  };
}

/**
 * The prompt section. Each report rides in an S-07 document block — delimited,
 * control-stripped, visibly truncated — never concatenated into instructions.
 * Empty in, empty out: with nothing marked the prep prompt is byte-identical
 * to what it was before this feature existed.
 */
export function buildMarkedReportsSection(reports) {
  if (!Array.isArray(reports) || !reports.length) return "";
  const blocks = reports.map(n => formatDocumentBlock({
    id: n.id,
    source: n.title || "AI Analysis",
    date: n.date || "",
    text: noteBodyText(n),
    maxLength: PREP_REPORT_MAX_CHARS,
  }));
  return `\n\nPRIOR AI ANALYSES THE PATIENT MARKED FOR THIS VISIT:
The patient reviewed these earlier Insina analyses and marked them as relevant to this appointment. Carry their key findings and questions forward where still applicable instead of re-deriving them; skip anything superseded by newer information above.
${blocks.map((b, i) => `\n[${i + 1}] ${b}`).join("\n")}`;
}

/**
 * Completing a visit consumes its marks (DEC-046 lifecycle): remove every
 * target that matches the completed appointment, leave targets for other
 * doctors intact, stamp updatedAt on changed notes. Returns how many notes
 * changed. Never throws — a mark-clear failure must not block the completion.
 */
export function clearPrepMarksForAppointment(appt, { careTeam = readCareTeam() } = {}) {
  try {
    const notes = readNotes();
    let changed = 0;
    const next = notes.map(n => {
      const targets = getPrepTargets(n);
      if (!targets.length) return n;
      const kept = targets.filter(t => !targetMatchesAppointment(t, appt, careTeam));
      if (kept.length === targets.length) return n;
      changed++;
      const copy = { ...n, updatedAt: Date.now() };
      if (kept.length) copy.prepTargets = kept;
      else delete copy.prepTargets;
      return copy;
    });
    if (changed) writeNotes(next);
    return changed;
  } catch { return 0; }
}
