// ── RIE · Finding model ──────────────────────────────────────────────────────
// A finding is one detected issue. Its id IS its signature, so the same issue
// detected on a later scan keeps the same id — that's how dismissals/ignores
// match across scans.

export function sigOf(f) {
  return `${f.checkType}|${f.module}|${f.fieldPath}|${String(f.original || "").toLowerCase().trim()}`;
}

export function mkFinding({ severity, checkType, module, fieldPath, original = "", suggestion = null, message, fix = null }) {
  const now = new Date().toISOString();
  const f = { severity, checkType, module, fieldPath, original, suggestion, message, fix, status: "active", createdAt: now, updatedAt: now };
  f.id = sigOf(f);
  return f;
}

export const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };
