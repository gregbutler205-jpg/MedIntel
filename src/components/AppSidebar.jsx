// ── UI-10: THE shared application sidebar ─────────────────────────────────────
// One sidebar, one NAV list. Previously App.jsx and each standalone tab
// (Medications, Labs, Vitals, Symptoms) carried byte-for-byte copies of this
// aside and its NAV array — five parallel definitions that had to be edited
// in lockstep. Styles come from index.css (.nav-item, .nav-group-header,
// .live-dot — UI-8 tokens).
//
// UI-9: nav renders as three collapsible groups (Today / My Health /
// Records & Tools). Collapse state persists in a plain (non-mi_, so never
// encrypted/locked) localStorage key; the group holding the active screen
// force-expands so the active destination is always visible. Emergency
// Information is pinned below the groups, always visible on every screen.
import { useState } from "react";
import { printEmergency } from "../lib/printEmergency.js";

// UI-11: standardized nav labels. "Export & Backup" / "App Settings" both map
// onto the single Settings & Backup tab today; splitting is a new tab, not a
// relabel — tracked as follow-up.
export const NAV = [
  // ── Core ────────────────────────────────────────────────────────────────────
  { id: "dashboard",   icon: "⬡", label: "Dashboard" },
  { id: "profile",     icon: "◯", label: "Health Profile" },
  { id: "conditions",  icon: "◎", label: "Conditions" },
  { id: "surgeries",   icon: "✦", label: "Surgeries" },
  { id: "medications", icon: "⬡", label: "Medications" },
  { id: "labs",        icon: "◈", label: "Labs & Trends" },
  { id: "vitals",      icon: "♡", label: "Vitals" },
  { id: "symptoms",    icon: "◎", label: "Symptoms" },
  { id: "appointments",icon: "◻", label: "Appointments" },
  { id: "careplan",    icon: "◷", label: "Care Team" },
  // ── System ──────────────────────────────────────────────────────────────────
  { id: "records",     icon: "▤", label: "Medical Records" },
  { id: "documents",   icon: "▣", label: "Source Documents" },
  { id: "notes",       icon: "◻", label: "My Notes" },
  { id: "ai",          icon: "✦", label: "AI Analysis" },
  { id: "import",      icon: "↓", label: "Import Records" },
  { id: "backup",      icon: "◈", label: "Settings & Backup" },
];

// UI-9 groups. Assignment: "Today" is the day-to-day starting points;
// "My Health" the clinical record modules; "Records & Tools" documents,
// import/export, and system screens. Every module stays reachable.
export const NAV_GROUPS = [
  { key: "today",  label: "Today",           ids: ["dashboard", "appointments"] },
  { key: "health", label: "My Health",       ids: ["profile", "conditions", "surgeries", "medications", "labs", "vitals", "symptoms", "careplan"] },
  { key: "tools",  label: "Records & Tools", ids: ["records", "documents", "notes", "ai", "import", "backup"] },
];

// Plain key on purpose — mi_* keys are vault-managed (encrypted, unreadable
// while locked); a UI preference must survive lock state.
const COLLAPSE_KEY = "insina_nav_collapsed";
function readCollapsed() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
}

const LOGO = import.meta.env.BASE_URL + "logo-white.png";

function PatientBlock() {
  let name = "", condition = "";
  try {
    const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}");
    name = p.name || "";
  } catch { /* locked or unset */ }
  try {
    const c = JSON.parse(localStorage.getItem("mi_conditions") || "[]").filter(x => x.status === "active");
    condition = c[0]?.name || "";
  } catch { /* locked or unset */ }
  return (
    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--divider)" }}>
      <div style={{ fontSize: 11, color: "var(--text-label)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>PATIENT</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
      {condition && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{condition}</div>}
    </div>
  );
}

function NavItem({ id, icon, label, active, onNav }) {
  return (
    <div className={`nav-item ${active ? "active" : ""}`} onClick={() => onNav(id)}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {id === "ai" && <span style={{ marginLeft: "auto", fontSize: 10, background: "var(--accent)", color: "#fff", padding: "1px 6px", borderRadius: 8, fontFamily: "var(--font-mono)" }}>AI</span>}
    </div>
  );
}

/**
 * @param {string}   activeNav - nav id of the screen being shown
 * @param {function} onNav     - called with the target nav id
 */
export default function AppSidebar({ activeNav, onNav }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleGroup = (key) => {
    // Collapsing the group that holds the active screen is a visual no-op
    // (it force-renders expanded) — don't silently store a collapse the user
    // never saw happen, or the group snaps shut later when they navigate away.
    const group = NAV_GROUPS.find(g => g.key === key);
    if (group?.ids.includes(activeNav) && !collapsed[key]) return;
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* quota/denied: state still works this session */ }
      return next;
    });
  };

  const byId = Object.fromEntries(NAV.map(item => [item.id, item]));

  return (
    <aside style={{
      width: 220, minWidth: 220, height: "100vh",
      background: "var(--bg-deep)",
      borderRight: "1px solid var(--divider)",
      display: "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--divider)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={LOGO} alt="Insina Health" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      <PatientBlock />

      {/* Nav groups (UI-9) */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {NAV_GROUPS.map(group => {
          const containsActive = group.ids.includes(activeNav);
          // The active screen's group can't be collapsed shut — active
          // destination stays visible.
          const isCollapsed = collapsed[group.key] && !containsActive;
          return (
            <div key={group.key}>
              <button
                className="nav-group-header"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={!isCollapsed}
              >
                <span>{group.label}</span>
                <span aria-hidden="true" style={{ fontSize: 10, color: "var(--text-dim)" }}>{isCollapsed ? "▸" : "▾"}</span>
              </button>
              {!isCollapsed && group.ids.map(id => {
                const item = byId[id];
                return item ? <NavItem key={id} {...item} active={activeNav === id} onNav={onNav} /> : null;
              })}
            </div>
          );
        })}
      </nav>

      {/* UI-9: Emergency Information — pinned, always visible, never inside a
          collapsible group. Opens the printable emergency packet (DEC-023's
          exportable-packet model — not a nav destination). */}
      <div style={{ borderTop: "1px solid var(--divider)", padding: "8px 0" }}>
        <div
          className="nav-item"
          onClick={printEmergency}
          role="button"
          title="Open a printable emergency information sheet"
          style={{ color: "var(--red)" }}
        >
          <span className="nav-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span>Emergency Information</span>
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--divider)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#2e5a44", fontFamily: "var(--font-mono)" }}>
          <div className="live-dot" />
          All systems nominal
        </div>
      </div>
    </aside>
  );
}
