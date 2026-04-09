// ── IntelliTrax localStorage data store ──────────────────────────────────────
// All health data lives here. Keys are prefixed with "mi_".

const DEFAULTS = {
  readings:           [],
  meds:               [],
  alerts:             [],
  upcoming:           [],
  labs:               [],
  records:            [],
  lastImport:         null,
  importLog:          [],
  meds_full:          [],
  meds_pending:       [],
  watch_daily:        [],
  care_team:          [],
  allergies:          [],
  emergency_contacts: [],
  profile_personal:   {},
  profile_insurance:  {},
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

// Records (Tab03)
export function getRecords() { return getStore('records') ?? []; }
export function setRecords(records) { setStore('records', records); }
export function mergeRecords(newRecords) {
  const existing = getStore('records');
  const map = new Map();
  existing.forEach(r => map.set(r.epicId ?? r.title + r.date, r));
  newRecords.forEach(r => map.set(r.epicId ?? r.title + r.date, r));
  const merged = Array.from(map.values()).sort((a,b) => new Date(b.date) - new Date(a.date));
  setStore('records', merged);
  return merged;
}

// For Tab04: get/set the rich medication list
export function getMedsFull() {
  return getStore('meds_full') ?? [];
}
export function setMedsFull(meds) { setStore('meds_full', meds); }

export function getPendingMeds() { return getStore('meds_pending'); }
export function setPendingMeds(meds) { setStore('meds_pending', meds); }

// ── Profile helpers ────────────────────────────────────────────────────────────
export function getProfilePersonal() { return getStore('profile_personal') ?? {}; }
export function setProfilePersonal(v) { setStore('profile_personal', v); }

export function getProfileInsurance() { return getStore('profile_insurance') ?? {}; }
export function setProfileInsurance(v) { setStore('profile_insurance', v); }

export function getCareTeam() { return getStore('care_team') ?? []; }
export function setCareTeam(v) { setStore('care_team', v); }

export function getAllergies() { return getStore('allergies') ?? []; }
export function setAllergies(v) { setStore('allergies', v); }

export function getEmergencyContacts() { return getStore('emergency_contacts') ?? []; }
export function setEmergencyContacts(v) { setStore('emergency_contacts', v); }

// Cross-section reads used by Profile
export function getConditions() {
  try { const r = localStorage.getItem('mi_conditions'); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
export function getSurgeries() {
  try { const r = localStorage.getItem('mi_surgeries'); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
export function getLatestReading() {
  const readings = getStore('readings') ?? [];
  return readings.length > 0 ? readings[0] : null;
}

// Add an import log entry
export function addImportLog(entry) {
  const log = getStore('importLog');
  const updated = [entry, ...log].slice(0, 50); // keep last 50
  setStore('importLog', updated);
  setStore('lastImport', new Date().toISOString());
}
