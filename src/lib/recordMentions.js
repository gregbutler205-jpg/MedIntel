// ── Shared record text-mention scanner (v1.59.0) ─────────────────────────────
// One engine behind the Conditions (v1.57.0) and Procedures (v1.59.0)
// suggestion flows: a curated dictionary of names + abbreviations matched on
// word boundaries against text the patient already has in their record, with
// look-back cues that kill a hit when the sentence is saying the thing is
// absent, hypothetical, or someone else's. Deterministic, offline, no AI.

export const DOC_TEXT_CAP = 30000; // chars scanned per source document

// Phrases BEFORE a mention that mean the record is NOT asserting it for the
// patient: negations, screening/risk language, and family members.
// "History of X" is deliberately absent: past items belong in the record.
export const BASE_NEGATION_CUES = [
  "no evidence of", "no signs of", "no sign of", "negative for", "ruled out",
  "rule out", "rules out", "r/o", "without", "denies", "denied", "no", "not",
  "free of", "absence of", "resolved", "unlikely",
  "screening for", "screen for", "screened for", "risk of", "risk for",
  "at risk", "prevention", "prevent", "concern for possible",
  "family history of", "family hx of", "fh of", "mother", "father", "brother",
  "sister", "parent", "sibling",
];

export const safeArr = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : []; } catch { return []; } };

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Look-back window: from the previous sentence boundary (max 70 chars). */
function negatedAt(text, idx, cues) {
  const start = Math.max(0, idx - 70);
  const slice = text.slice(start, idx);
  const bound = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(";"), slice.lastIndexOf("\n"), slice.lastIndexOf("•"));
  const window = slice.slice(bound + 1).toLowerCase();
  return cues.some(cue => new RegExp(`(^|\\W)${escRe(cue)}(\\W|$)`).test(window));
}

function snippetAt(text, idx, len) {
  const from = Math.max(0, idx - 45);
  const to = Math.min(text.length, idx + len + 45);
  const s = text.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${s}${to < text.length ? "…" : ""}`;
}

/**
 * All dictionary hits in one text. Dictionary entries are { id, name, terms }.
 * Longer terms win overlapping spans (so "portal hypertension" doesn't also
 * fire plain "hypertension" on the same words); a hit inside a cue window is
 * dropped. Returns [{ id, name, snippet }], one hit per entry per text.
 */
export function matchDictionaryInText(text, dictionary, { extraCues = [], cap = DOC_TEXT_CAP } = {}) {
  if (!text) return [];
  const cues = extraCues.length ? [...BASE_NEGATION_CUES, ...extraCues] : BASE_NEGATION_CUES;
  const hay = String(text).slice(0, cap);
  const lower = hay.toLowerCase();
  const raw = [];
  for (const entry of dictionary) {
    for (const term of entry.terms) {
      const re = new RegExp(`(^|[^a-z0-9])${escRe(term.toLowerCase())}($|[^a-z0-9])`, "g");
      let m;
      while ((m = re.exec(lower)) !== null) {
        const idx = m.index + m[1].length;
        raw.push({ id: entry.id, name: entry.name, idx, len: term.length });
        re.lastIndex = idx + 1;
      }
    }
  }
  raw.sort((a, b) => b.len - a.len || a.idx - b.idx);
  const taken = [];
  const winners = [];
  for (const h of raw) {
    if (taken.some(t => h.idx < t.end && h.idx + h.len > t.start)) continue;
    taken.push({ start: h.idx, end: h.idx + h.len });
    if (negatedAt(hay, h.idx, cues)) continue;
    winners.push(h);
  }
  const seen = new Set();
  const out = [];
  for (const h of winners.sort((a, b) => a.idx - b.idx)) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    out.push({ id: h.id, name: h.name, snippet: snippetAt(hay, h.idx, h.len) });
  }
  return out;
}

// ── Sources ───────────────────────────────────────────────────────────────────
// Deliberately EXCLUDED from scan text: facility and provider names ("Diabetes
// Center of Mississippi" must not suggest diabetes), AI session transcripts
// (questions like "do I have diabetes?" would false-positive), and lab VALUES.
export function collectRecordSources() {
  const out = [];
  for (const d of safeArr("mi_diagnostics")) {
    out.push({ store: "Diagnostics", refId: d.id, title: d.name || "Diagnostic study", date: d.date || "", text: [d.name, d.impression, d.relatedCondition].filter(Boolean).join(". ") });
  }
  for (const n of safeArr("mi_notes")) {
    const bodies = (n.sections || []).map(s => s.body || "").join("\n");
    out.push({ store: "My Notes", refId: n.id, title: n.title || "Note", date: n.date || "", text: [n.title, bodies].filter(Boolean).join("\n") });
  }
  for (const r of safeArr("mi_records")) {
    out.push({ store: "Medical Records", refId: r.id, title: r.title || "Record", date: r.date || "", type: r.type || "", text: [r.title, r.type, r.summary, r.notes].filter(Boolean).join(". ") });
  }
  for (const s of safeArr("mi_surgeries")) {
    out.push({ store: "Procedures", refId: s.id, title: s.procedure || s.name || "Procedure", date: s.date || "", text: [s.procedure || s.name, s.notes].filter(Boolean).join(". ") });
  }
  for (const doc of safeArr("mi_documents")) {
    out.push({ store: "Documents", refId: doc.id, title: doc.title || "Document", date: doc.date || "", text: [doc.title, doc.notes].filter(Boolean).join(". ") });
  }
  // Full text of imported source material (discharge summaries, lab PDFs,
  // clinic and procedure notes): the words on the paperwork, never inference.
  for (const rd of safeArr("mi_ref_docs")) {
    out.push({ store: "Source Documents", refId: rd.id, title: rd.name || "Source document", date: rd.studyDate || rd.addedDate || "", type: rd.docType || "", text: [rd.name, rd.text].filter(Boolean).join("\n") });
  }
  return out;
}
