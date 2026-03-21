// ── IntelliTrax localStorage data store ──────────────────────────────────────
// All health data lives here. Keys are prefixed with "mi_".

const DEFAULTS = {
  readings: [
    { date:"Mar 10", ts:"2026-03-10", bp_s:131, bp_d:71, weight:184.2 },
    { date:"Mar 7",  ts:"2026-03-07", bp_s:138, bp_d:74, weight:184.8 },
    { date:"Mar 5",  ts:"2026-03-05", bp_s:143, bp_d:79, weight:185.1 },
    { date:"Mar 3",  ts:"2026-03-03", bp_s:164, bp_d:88, weight:185.6, flag:true },
    { date:"Feb 28", ts:"2026-02-28", bp_s:136, bp_d:76, weight:185.0 },
  ],
  meds: [
    { name:"Tacrolimus 3 mg",        refillDate:"Mar 28", status:"ok",     flag:true  },
    { name:"Mycophenolate 500 mg",   refillDate:"Apr 2",  status:"ok",     flag:false },
    { name:"Prednisone 5 mg",        refillDate:"Mar 16", status:"refill", flag:true  },
    { name:"Amlodipine 10 mg",       refillDate:"Apr 10", status:"ok",     flag:false },
    { name:"Metoprolol 25 mg",       refillDate:"Apr 5",  status:"ok",     flag:false },
    { name:"Furosemide 40 mg",       refillDate:"Mar 22", status:"ok",     flag:false },
    { name:"Pantoprazole 40 mg",     refillDate:"Apr 12", status:"ok",     flag:false },
    { name:"Trimethoprim-SMX",       refillDate:"May 1",  status:"ok",     flag:false },
    { name:"Valganciclovir 450 mg",  refillDate:"Apr 8",  status:"ok",     flag:true  },
    { name:"Atorvastatin 40 mg",     refillDate:"Apr 15", status:"ok",     flag:false },
    { name:"Calcium Carbonate",      refillDate:"May 20", status:"ok",     flag:false },
    { name:"Vitamin D3 2000 IU",     refillDate:"May 20", status:"ok",     flag:false },
    { name:"Magnesium Oxide 400 mg", refillDate:"Apr 20", status:"ok",     flag:false },
    { name:"Aspirin 81 mg",          refillDate:"Jun 1",  status:"ok",     flag:false },
  ],
  alerts: [
    { type:"warn", text:"Nephrology appt in 3 days — prepare questions", time:"Mar 15" },
    { type:"info", text:"Creatinine lab due — last drawn Feb 12",         time:"Overdue" },
    { type:"ok",   text:"Tacrolimus refill confirmed at CVS #5777",       time:"Today" },
  ],
  upcoming: [
    { label:"Nephrology Follow-up", date:"Mar 15", urgency:"high", doctor:"Ari Cohen MD" },
    { label:"Transplant Labs",      date:"Mar 18", urgency:"med",  doctor:"Quest Diagnostics" },
    { label:"Primary Care",         date:"Mar 25", urgency:"low",  doctor:"Jonathan Hand MD" },
  ],
  labs: [],
  lastImport: null,
  importLog: [],
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

// Add an import log entry
export function addImportLog(entry) {
  const log = getStore('importLog');
  const updated = [entry, ...log].slice(0, 50); // keep last 50
  setStore('importLog', updated);
  setStore('lastImport', new Date().toISOString());
}
