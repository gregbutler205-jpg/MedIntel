// In-memory AI scope handoff (DEC-P50, WO_AI_LAUNCHER_01 Sec 5).
// A launcher writes a scope object here and navigates to AI Analysis, which
// takes it on mount. Module memory only: never the URL, hash, query string,
// or any persisted store, so a reload always opens AI Analysis in its
// default full-record state and nothing can resurrect through a Drive merge.
//
// AIScope = {
//   source: 'nav' | 'dashboard' | 'labs_panel' | 'medications' | 'appointment' | 'symptom',
//   items: [{ kind: 'full_record' | 'panel' | 'med_list' | 'appointment' | 'symptom_entry',
//             id?: string, label: string, date?: string }],
//   question?: string   // dashboard question launchers only (DEC-P50 as amended)
// }

let _pending = null;

export const FULL_RECORD_ITEM = Object.freeze({ kind: "full_record", label: "Full record" });

export function setAIScope(scope) {
  if (!scope || typeof scope !== "object") { _pending = null; return; }
  _pending = {
    source: scope.source || "nav",
    items: Array.isArray(scope.items) ? scope.items.map(i => ({ ...i })) : [],
    question: typeof scope.question === "string" && scope.question.trim() ? scope.question : undefined,
  };
}

/** Read and clear the pending scope (AI Analysis calls this on mount). */
export function takeAIScope() {
  const s = _pending;
  _pending = null;
  return s;
}

export function peekAIScope() { return _pending; }

/** Chip list for the "Reads:" strip: the specific items, or the single Full record chip. */
export function scopeChips(items) {
  const specific = (items || []).filter(i => i && i.kind !== "full_record");
  return specific.length ? specific.map(i => ({ ...i, removable: true })) : [{ ...FULL_RECORD_ITEM, removable: false }];
}

/** True when the scope narrows to specific items (anything but full record). */
export function isNarrowed(items) {
  return (items || []).some(i => i && i.kind !== "full_record");
}
