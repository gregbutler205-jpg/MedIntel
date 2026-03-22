// ── IntelliTrax localStorage data store ──────────────────────────────────────
// All health data lives here. Keys are prefixed with "mi_".

const DEFAULTS = {
  readings:     [],
  meds:         [],
  alerts:       [],
  upcoming:     [],
  labs:         [],
  lastImport:   null,
  importLog:    [],
  meds_full:    [],
  meds_pending: [],
  watch_daily:  [],
};

export function getStore(key) {
  try {
    const raw = localStorage.getItem(`mi_${key}`);
    return raw ? JSON.parse(raw) : DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
}

export function setStore(key, value) {
  localStorage.setItem(`mi_${key}`, JSON.stringify(value));
}

// Merge new readings with existing ones, deduplicating by date (ts), newest first
export function mergeReadings(newReadings) {
  const existing = getStore('readings');
  const map = new Map();
  [...existing, ...newReadings].forEach(r => map.set(r.ts, r));
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.ts) - new Date(a.ts)
  );
  setStore('readings', merged);
  return merged;
}

// Merge new meds with existing, deduplicating by name
export function mergeMeds(newMeds) {
  const existing = getStore('meds');
  const map = new Map();
  existing.forEach(m => map.set(m.name.toLowerCase(), m));
  newMeds.forEach(m => map.set(m.name.toLowerCase(), { ...map.get(m.name.toLowerCase()), ...m }));
  const merged = Array.from(map.values());
  setStore('meds', merged);
  return merged;
}

// Merge new labs with existing
export function mergeLabs(newLabs) {
  const existing = getStore('labs');
  const merged = [...newLabs, ...existing];
  setStore('labs', merged);
  return merged;
}

// For Tab04: get/set the rich medication list
export function getMedsFull() {
  return getStore('meds_full') ?? [];
}
export function setMedsFull(meds) { setStore('meds_full', meds); }

export function getPendingMeds() { return getStore('meds_pending'); }
export function setPendingMeds(meds) { setStore('meds_pending', meds); }

// Add an import log entry
export function addImportLog(entry) {
  const log = getStore('importLog');
  const updated = [entry, ...log].slice(0, 50); // keep last 50
  setStore('importLog', updated);
  setStore('lastImport', new Date().toISOString());
}
