// ── UI-26: search → record deep-select handoff ───────────────────────────────
// Selecting a search result must open the underlying record, not just its
// tab. SearchPopup stores the picked result here; the destination tab takes
// it on mount and selects the matching record. sessionStorage (not mi_*):
// transient UI state, never health data, dies with the browser tab.

const KEY = "insina_pending_select";

export function setPendingSelect(category, title) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ category, title })); } catch { /* non-fatal */ }
}

/** Take (read + clear) the pending selection if it targets `category`. Returns the title or null. */
export function takePendingSelect(category) {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { category: cat, title } = JSON.parse(raw);
    if (cat !== category) return null;
    sessionStorage.removeItem(KEY);
    return title || null;
  } catch { return null; }
}
