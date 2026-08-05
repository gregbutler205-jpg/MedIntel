// ── Generic record-deletion tombstones (every array store) ───────────────────
// The Drive merge unions each local array store with the Drive copy and has no
// concept of deletion — so ANY deleted record still living in the Drive file
// (kept alive by the other device's uploads) is quietly union-ed back on the
// next sync. v1.43.1 fixed this for appointments; Greg then hit the same
// resurrection on Care Team, Allergies, and Conditions. This module is the
// generalization: every user deletion in every section writes a tombstone, and
// driveSync's merge post-pass drops resurrected copies for every store that
// has tombstones.
//
// Identity rule: a tombstone stores the SAME key the merge union uses to
// deduplicate (mergeKeyFor below, imported by driveSync's _mergeArrays — one
// source of truth). Whatever identity would carry a record through the union
// is exactly the identity the tombstone kills. Records recreated by hand get a
// fresh id and are never matched by an old tombstone.
//
// The tombstone list itself is a managed mi_* key: encrypted at rest, carried
// in Drive/folder backups, and merged across devices (entries carry
// content-keyed ids so the union dedupes identical tombstones and keeps
// distinct ones) — deletions therefore PROPAGATE: the other device merges the
// tombstones in and drops its own copies on its next sync.

export const RECORD_TOMBSTONE_KEY = "mi_record_tombstones";
const MAX = 600; // generous history; keeps the key bounded

/** The Drive merge's dedup identity — single source, used by _mergeArrays too. */
export function mergeKeyFor(item) {
  return item?.id ?? item?.ts ?? item?.date ?? JSON.stringify(item);
}

export function readRecordTombstones() {
  try { const r = localStorage.getItem(RECORD_TOMBSTONE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

/** Record a deletion so no Drive merge can resurrect this record anywhere. */
export function tombstoneRecord(storeKey, record) {
  if (!storeKey || record == null) return;
  const key = String(mergeKeyFor(record));
  const entry = {
    id: `${storeKey}|${key}`, // content-keyed: identical tombstones collapse in the union
    store: storeKey,
    key,
    deletedAt: new Date().toISOString(),
  };
  const list = readRecordTombstones();
  if (list.some(t => t.id === entry.id)) return;
  list.push(entry);
  try { localStorage.setItem(RECORD_TOMBSTONE_KEY, JSON.stringify(list.slice(-MAX))); } catch { /* locked/quota */ }
}

/** Remove a tombstone when a record is deliberately RE-ADDED under the same
 * identity (stores that reuse stable ids, e.g. mi_ref_docs entries keyed by
 * their document's id — without this, toggling a reference back on would be
 * eaten by the tombstone from toggling it off). */
export function untombstoneRecord(storeKey, record) {
  if (!storeKey || record == null) return;
  const id = `${storeKey}|${String(mergeKeyFor(record))}`;
  const list = readRecordTombstones();
  const kept = list.filter(t => t.id !== id);
  if (kept.length === list.length) return;
  try { localStorage.setItem(RECORD_TOMBSTONE_KEY, JSON.stringify(kept)); } catch { /* locked/quota */ }
}

/** Drop records a tombstone says the user deleted. Pure; safe on any array. */
export function filterTombstonedRecords(storeKey, arr, tombstones = readRecordTombstones()) {
  if (!Array.isArray(arr)) return arr;
  const dead = new Set(tombstones.filter(t => t.store === storeKey).map(t => t.key));
  if (dead.size === 0) return arr;
  return arr.filter(item => !dead.has(String(mergeKeyFor(item))));
}

/** The store keys that currently have tombstones — drives the merge post-pass. */
export function tombstonedStores(tombstones = readRecordTombstones()) {
  return [...new Set(tombstones.map(t => t.store).filter(Boolean))];
}
