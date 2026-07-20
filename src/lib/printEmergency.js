// ── Emergency Information print (UI-9: directly accessible from the shared
// sidebar on every screen, not only the Dashboard hot button). Extracted
// verbatim from App.jsx.

export function printEmergency() {
  const safe = k => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
  const safeObj = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };
  const profile   = safeObj("mi_profile_personal");
  const conditions = safe("mi_conditions").filter(c => c.status !== "inactive");
  const meds      = safe("mi_meds_full").filter(m => m.status !== "inactive");
  const allergies = safe("mi_allergies");
  const contacts  = safe("mi_emergency_contacts");
  const labs      = safe("mi_labs");
  const logoUrl   = (import.meta.env.BASE_URL || "/") + "logo.png";

  // ── Labs on the card: ONLY the most recent CMP and CBC draws ───────────────
  // A clinician wants one coherent snapshot per panel — every value from the
  // same draw — not a mix of dates. So for each panel we take its latest date
  // and show that whole draw. Panels are ordered by the patient's own
  // Settings → Lab Category Order (mi_lab_category_order).
  // `aliases` covers the legacy/demo category names for the same panel so the
  // card still populates on records that predate the current categories.
  const CARD_PANELS = [
    { key: "Metabolic Panel", aliases: ["Metabolic Panel", "Chemistry", "Electrolytes"] },
    { key: "CBC",             aliases: ["CBC", "CBC / Hematology"] },
  ];
  const catOrder = (() => {
    try { const o = JSON.parse(localStorage.getItem("mi_lab_category_order") || "null"); return Array.isArray(o) ? o : []; }
    catch { return []; }
  })();
  const labPanels = CARD_PANELS.map(p => {
    const rows = labs.filter(l => p.aliases.includes(l.category));
    if (!rows.length) return null;
    const latest = rows.reduce((max, l) => ((l.date || "") > max ? (l.date || "") : max), "");
    const seen = new Set();
    const onDay = rows.filter(l => (l.date || "") === latest).filter(l => {
      const k = (l.name || "").toLowerCase().trim();
      if (!k || seen.has(k)) return false;      // collapse repeat imports of the same analyte
      seen.add(k); return true;
    });
    if (!onDay.length) return null;
    const idx = catOrder.indexOf(p.key);
    return { key: p.key, latest, rows: onDay, sort: idx === -1 ? 999 : idx };
  }).filter(Boolean).sort((a, b) => a.sort - b.sort);

  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const dob  = profile.dob  ? `  ·  DOB: ${profile.dob}` : "";
  const blood = profile.bloodType ? `  ·  Blood Type: ${profile.bloodType}` : "";

  const section = (title, rows) => rows.length === 0 ? "" : `
    <div class="section">
      <div class="section-title">${title}</div>
      ${rows.map(r => `<div class="row">${r}</div>`).join("")}
    </div>`;

  const condRows = conditions.map(c => `<span class="badge cond">${c.name}</span>${c.severity ? ` <span class="dim">${c.severity}</span>` : ""}`);
  const medRows  = meds.map(m => `<strong>${m.name}</strong>${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` — ${m.frequency}` : ""}${m.prescriber ? ` <span class="dim">(${m.prescriber})</span>` : ""}`);
  const algRows  = allergies.map(a => `<span class="badge allergy">${a.allergen || a.name}</span>${a.reaction ? ` <span class="dim">→ ${a.reaction}</span>` : ""}`);
  const ctRows   = contacts.map(c => `<strong>${c.name}</strong>${c.relationship ? ` (${c.relationship})` : ""} — <a href="tel:${c.phone}">${c.phone}</a>`);
  // One section per panel; the draw date lives in the heading since every value
  // in the section comes from that same draw.
  const fmtDay = iso => { try { return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }); } catch { return iso; } };
  const labSections = labPanels.map(p => section(
    `${p.key} — ${p.latest ? fmtDay(p.latest) : "date unknown"}`,
    p.rows.map(l => `${l.flag ? '<span class="badge flag">⚠</span> ' : ""}<strong>${l.name}</strong>: ${l.value}${l.unit ? " " + l.unit : ""}${l.refRange ? ` <span class="dim">(ref ${l.refRange})</span>` : ""}`)
  )).join("");

  const win = window.open("", "_blank", "width=860,height=760");
  if (!win) return; // popup blocked — same convention as printMedicationList
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Emergency Info — ${profile.name || "Patient"}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; max-width:780px; margin:36px auto; color:#1a1a1a; font-size:13px; line-height:1.6; padding:0 20px; }
      .logo { height:44px; margin-bottom:14px; }
      h1 { font-size:26px; font-weight:700; text-align:center; margin-bottom:4px; }
      .subtitle { font-size:12px; color:#555; text-align:center; margin-bottom:6px; font-family:monospace; }
      .rule { border:none; border-top:3px solid #dc2626; margin:14px 0; }
      .section { margin-bottom:18px; }
      .section-title { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#dc2626; margin-bottom:6px; border-bottom:1px solid #f5c6c6; padding-bottom:4px; }
      .row { padding:4px 0; border-bottom:1px solid #f0f0f0; font-size:12.5px; }
      .row:last-child { border-bottom:none; }
      .badge { display:inline-block; padding:1px 8px; border-radius:10px; font-size:11px; font-weight:600; }
      .badge.cond { background:#dbeafe; color:#1d4ed8; }
      .badge.allergy { background:#fef3c7; color:#92400e; }
      .badge.flag { background:#fee2e2; color:#dc2626; border-radius:4px; padding:0 5px; }
      .dim { color:#777; font-size:11px; }
      a { color:#1d4ed8; text-decoration:none; }
      .footer { margin-top:32px; border-top:1px solid #ddd; padding-top:10px; font-size:10px; color:#999; display:flex; justify-content:space-between; }
      @media print { body { margin:20px; } }
    </style>
  </head><body>
    <img src="${logoUrl}" class="logo" />
    <h1>${profile.name || "Patient Emergency Information"}</h1>
    <div class="subtitle">${profile.dob ? `DOB: ${profile.dob}` : ""}${blood}${profile.bloodType ? "" : ""}</div>
    <hr class="rule" />
    ${section("Emergency Contacts", ctRows)}
    ${section("Allergies", algRows)}
    ${section("Active Conditions", condRows)}
    ${section("Active Medications", medRows)}
    ${labSections}
    <div class="footer">
      <span>Insina Health &mdash; Emergency Information</span>
      <span>Printed ${date}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
}
