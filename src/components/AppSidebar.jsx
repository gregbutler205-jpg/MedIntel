// ── UI-10: THE shared application sidebar ─────────────────────────────────────
// One sidebar, one NAV list. Previously App.jsx and each standalone tab
// (Medications, Labs, Vitals, Symptoms) carried byte-for-byte copies of this
// aside and its NAV array — five parallel definitions that had to be edited
// in lockstep. Styles come from index.css (.nav-item, .nav-group-header,
// .live-dot — UI-8 tokens).

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
  { id: "careplan",    icon: "◷", label: "Care Plan/Team" },
  // ── System ──────────────────────────────────────────────────────────────────
  { id: "records",     icon: "▤", label: "Medical Records" },
  { id: "documents",   icon: "▣", label: "Source Documents" },
  { id: "notes",       icon: "◻", label: "My Notes" },
  { id: "ai",          icon: "✦", label: "AI Analysis" },
  { id: "import",      icon: "↓", label: "Import Records" },
  { id: "backup",      icon: "◈", label: "Settings & Backup" },
];

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

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        <div style={{ padding: "8px 16px 4px", fontSize: 11, color: "var(--text-label)", fontFamily: "var(--font-mono)", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
        {NAV.slice(0, 10).map(item => (
          <NavItem key={item.id} {...item} active={activeNav === item.id} onNav={onNav} />
        ))}
        <div style={{ padding: "12px 16px 4px", fontSize: 11, color: "var(--text-label)", fontFamily: "var(--font-mono)", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
        {NAV.slice(10).map(item => (
          <NavItem key={item.id} {...item} active={activeNav === item.id} onNav={onNav} />
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--divider)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#2e5a44", fontFamily: "var(--font-mono)" }}>
          <div className="live-dot" />
          All systems nominal
        </div>
      </div>
    </aside>
  );
}
