// ── Care Team name matching ──────────────────────────────────────────────────
// Scored fuzzy match of a free-text provider name against the saved Care Team.
// Shared by the Add Appointment form and the Google Calendar sync so both fill
// from the same logic. "Dr. Clay Thames" won't match "Dr. Stone Thames" just
// because they share a last name.

export function matchCareTeamMember(query, careTeam) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 3 || !Array.isArray(careTeam) || !careTeam.length) return null;
  const cleanQuery = q.replace(/^dr\.?\s*/i, "").trim();

  const scored = careTeam.map(p => {
    const name      = String(p.name || "").toLowerCase();
    const cleanName = name.replace(/^dr\.?\s*/i, "").trim();
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    let score = 0;
    if (name === q || cleanName === cleanQuery)                          score = 100; // exact
    else if (name.includes(q) || q.includes(cleanName))                 score = 80;  // full substring
    else if (nameParts.length && nameParts.every(part => cleanQuery.includes(part))) score = 60; // all parts present
    else if (nameParts.length > 1 &&
             nameParts.filter(part => cleanQuery.includes(part)).length >= nameParts.length - 1) score = 20; // all but one
    return { p, score };
  });

  const best = scored.reduce((a, b) => (b.score > a.score ? b : a), { p: null, score: 0 });
  return best.score > 0 ? best.p : null;
}

/**
 * Pull the provider name from an event title using the convention
 * "<description / clinic / type> - <Doctor's Name>" — i.e. the text after the
 * last " - " separator. Returns "" when there is no separator.
 */
export function providerFromTitle(title) {
  if (!title) return "";
  const parts = String(title).split(/\s+[-–—]\s+/); // hyphen, en dash, em dash
  if (parts.length < 2) return "";
  return parts[parts.length - 1].trim();
}
