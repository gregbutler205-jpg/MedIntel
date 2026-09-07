import { useState } from "react";
import {
  Activity, Pill, Calendar, FlaskConical, Upload, ShieldAlert, Phone,
  TriangleAlert, FileText, Sparkles, Check, X, ChevronRight, ChevronDown, Search,
  LayoutDashboard, User, Stethoscope, Scissors, ScanLine, HeartPulse,
  ClipboardList, Users, LogOut, Settings, Sparkle, Circle,
  PanelLeftClose, PanelLeftOpen, DatabaseBackup, Bell, Printer, FolderOpen, NotebookPen,
} from "lucide-react";

const T = {
  base: "#07090f", side: "#080c14", card: "#0b1220", raised: "#101a2c",
  border: "#1c2a40", text: "#e6eef8", text2: "#c4d8ee", muted: "#8fabc7",
  faint: "#7a97b6", accent: "#6ea3ff", accentInk: "#07090f",
  ok: "#2dd4a0", warn: "#f59e0b", danger: "#f87171",
  warnBg: "rgba(245,158,11,0.10)", dangerBg: "rgba(248,113,113,0.10)",
};

const P = { first: "Jordan", full: "Jordan Reyes" };
const NEEDS = ["flag", "record", "lab"];

// Needs attention: tripwire flags, imports waiting for review, out of range results.
const ATTENTION = [
  { id: 1, kind: "flag", title: "Tacrolimus level is overdue", body: "The transplant team asked for this test every 4 weeks. The last one was 32 days ago.", when: "Today", action: "Call transplant clinic", icon: TriangleAlert },
  { id: 2, kind: "record", title: "New records imported from MyOchsner", body: "14 items are waiting for review. 3 are medications and need to be confirmed one at a time.", when: "Today", action: "Review 14 items", icon: FileText },
  { id: 4, kind: "lab", title: "Platelets are out of range", body: "142 K/uL on the September 2 CBC. Reference range is 150 to 450. Everything else on the panel was in range.", when: "Sep 2", action: "View results", icon: FlaskConical },
];

// Coming up: anything with a date.
const COMING = [
  { id: 3, kind: "appt", title: "Transplant clinic", body: "Tuesday, September 15 at 10:00 AM with Dr. Alvarez.", when: "Sep 15", action: "Prepare for this visit", icon: Calendar },
  { id: 5, kind: "refill", title: "Magnesium oxide runs out", body: "3 days left. Last refill was August 8 at Walgreens.", when: "Sep 8", action: "Mark as refilled", icon: Pill },
  { id: 6, kind: "appt", title: "Bone density test", body: "Monday, September 21 at 2:00 PM, Hancock imaging.", when: "Sep 21", action: "Add to calendar", icon: Calendar },
  { id: 7, kind: "appt", title: "Physical therapy", body: "Thursday, September 24 at 9:00 AM with Valerie Sullivan.", when: "Sep 24", action: "Add to calendar", icon: Calendar },
  { id: 8, kind: "refill", title: "Tacrolimus refill due", body: "12 days left. Last refill was August 20 at Walgreens.", when: "Sep 30", action: "Mark as refilled", icon: Pill },
  { id: 9, kind: "appt", title: "Dermatology skin check", body: "Tuesday, October 6 at 1:30 PM, Pine Belt Dermatology.", when: "Oct 6", action: "Add to calendar", icon: Calendar },
  { id: 10, kind: "appt", title: "Orthopedics follow-up", body: "Monday, October 19 at 11:30 AM with Dr. Chimento.", when: "Oct 19", action: "Add to calendar", icon: Calendar },
];

// Passive updates live behind the bell.
const NOTICES = [
  ["Backed up to Google Drive", "Today, 10:38 PM"],
  ["Vitals logged: BP 143/78, weight 218.1 lbs", "Aug 31"],
  ["Metabolic panel from September 2: all in range", "Sep 2"],
];

const VITALS = [
  ["Blood pressure", "143/78", "mmHg", "Aug 31", T.warn],
  ["Weight", "218.1", "lbs", "Aug 31", T.ok],
  ["Temperature", "98.2", "°F", "Aug 31", T.ok],
];

const CONTACTS = [
  ["Transplant coordinator", "Nurse Coordinator, Ochsner", "504-555-0142"],
  ["After hours line", "Transplant on call", "504-555-0199"],
  ["Primary care", "D. Scoggin, FNP", "601-555-0177"],
];

const NAV = [
  { g: "Today", fixed: true, items: [["Dashboard", LayoutDashboard], ["Appointments", Calendar]] },
  { g: "My health", fixed: true, items: [["Labs and trends", FlaskConical], ["Medications", Pill], ["Vitals", HeartPulse], ["Symptoms", ClipboardList], ["Health profile", User], ["Care team", Users]] },
  { g: "Records", items: [["Conditions", Stethoscope], ["Procedures", Scissors], ["Diagnostics", ScanLine], ["Documents", FolderOpen], ["Notes", NotebookPen]] },
  { g: "Tools", items: [["Import records", Upload], ["Reports", Printer], ["Insina AI", Sparkles]] },
];

export default function InsinaDashboard() {
  const [updates, setUpdates] = useState([...ATTENTION, ...COMING]);
  const attention = updates.filter((u) => NEEDS.includes(u.kind));
  const clear = (id) => setUpdates((u) => u.filter((x) => x.id !== id));
  const apptCount = updates.filter((u) => u.kind === "appt").length;
  const [narrow, setNarrow] = useState(false);
  const [size, setSize] = useState(1);
  const [menuOpen, setMenuOpen] = useState(true);
  const [groups, setGroups] = useState({ Records: true, Tools: true });
  const [bell, setBell] = useState(false);
  const [acct, setAcct] = useState(false);
  const scale = [0.88, 1, 1.18][size];
  const fs = (n) => Math.round(n * scale * 10) / 10;

  const navPad = menuOpen ? "0 20px" : 0;
  const navJustify = menuOpen ? "flex-start" : "center";

  return (
    <div style={{ minHeight: "100vh", background: T.base, color: T.text, fontFamily: "'Sora', system-ui, sans-serif", display: "flex" }} onClick={() => { setBell(false); setAcct(false); }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        button:focus-visible, a:focus-visible { outline: none; box-shadow: 0 0 0 3px ${T.base}, 0 0 0 6px ${T.accent}; }
        .btn { min-height: 44px; border-radius: 10px; border: 1.5px solid ${T.border}; background: ${T.raised}; color: ${T.text}; font-size: ${fs(14)}px; font-weight: 600; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
        .btn.primary { background: ${T.accent}; color: ${T.accentInk}; border-color: ${T.accent}; }
        .btn.icon { width: 44px; padding: 0; justify-content: center; background: transparent; border-color: transparent; color: ${T.muted}; position: relative; }
        .btn.icon:hover { background: ${T.raised}; color: ${T.text}; }
        .btn.ghost { background: transparent; }
        .tile { min-height: 96px; border-radius: 14px; border: 1px solid ${T.border}; background: ${T.card}; color: ${T.text2}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-size: ${fs(14)}px; font-weight: 600; position: relative; }
        .tile:hover { border-color: ${T.accent}; color: ${T.text}; }
        .nav { display: flex; align-items: center; gap: 12px; min-height: 44px; border: none; background: transparent; width: 100%; text-align: left; color: ${T.muted}; font-size: ${fs(15)}px; font-weight: 500; }
        .nav:hover { color: ${T.text}; background: rgba(110,163,255,.06); }
        .nav.active { color: ${T.accent}; background: rgba(110,163,255,.10); box-shadow: inset 3px 0 0 ${T.accent}; }
        .menu { position: absolute; right: 0; top: 52px; min-width: 220px; background: ${T.card}; border: 1px solid ${T.border}; border-radius: 12px; padding: 6px; box-shadow: 0 16px 40px rgba(0,0,0,.5); z-index: 10; }
        .menu button { width: 100%; min-height: 44px; border: none; background: transparent; color: ${T.text2}; font-size: ${fs(15)}px; text-align: left; padding: 0 12px; border-radius: 8px; display: flex; align-items: center; gap: 10px; }
        .menu button:hover { background: ${T.raised}; color: ${T.text}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* Sidebar */}
      {!narrow && (
        <aside style={{ width: menuOpen ? 232 : 96, flexShrink: 0, background: T.side, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width .2s" }}>
          <div style={{ padding: menuOpen ? "22px 20px 16px" : "22px 8px 16px", borderBottom: `1px solid ${T.border}`, textAlign: menuOpen ? "left" : "center" }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: menuOpen ? fs(26) : fs(22), color: T.accent, lineHeight: 1, whiteSpace: "nowrap" }}>Insina</div>
            <div style={{ fontSize: fs(13), color: T.faint, marginTop: 4 }}>Health</div>
          </div>
          {menuOpen && (
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: fs(15), fontWeight: 600 }}>{P.full}</div>
              <div style={{ fontSize: fs(13), color: T.muted, marginTop: 2, lineHeight: 1.4 }}>Liver transplant recipient</div>
            </div>
          )}
          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            {NAV.map(({ g, items, fixed }) => {
              const open = fixed || groups[g];
              return (
                <div key={g} style={{ marginBottom: 6 }}>
                  {menuOpen && (fixed ? (
                    <div style={{ padding: "10px 20px 4px", fontSize: fs(13), fontWeight: 600, color: T.faint }}>{g}</div>
                  ) : (
                    <button className="nav" aria-expanded={open} onClick={() => setGroups((s) => ({ ...s, [g]: !s[g] }))} style={{ padding: "0 20px", minHeight: 40, fontSize: fs(13), fontWeight: 600, color: T.faint }}>
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />} {g}
                    </button>
                  ))}
                  {(open || !menuOpen) && items.map(([label, Icon]) => (
                    <button key={label} className={`nav ${label === "Dashboard" ? "active" : ""}`} title={label} style={{ justifyContent: navJustify, padding: navPad }}>
                      <Icon size={20} /> {menuOpen && label}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
          <div style={{ borderTop: `1px solid ${T.border}`, padding: "6px 0" }}>
            <button className="nav" title="Emergency information" style={{ color: T.danger, justifyContent: navJustify, padding: navPad }}><ShieldAlert size={20} /> {menuOpen && "Emergency information"}</button>
          </div>
        </aside>
      )}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 28px", borderBottom: `1px solid ${T.border}`, background: T.side }}>
          {!narrow && <button className="btn icon" aria-label={menuOpen ? "Hide menu" : "Show menu"} onClick={() => setMenuOpen((m) => !m)}>{menuOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}</button>}
          <button className="btn" style={{ background: T.dangerBg, borderColor: T.danger, color: T.danger }}><ShieldAlert size={18} /> Emergency</button>
          <button className="btn icon" aria-label="Search" title="Search"><Search size={20} /></button>
          <div style={{ flex: 1, fontSize: fs(14), color: T.muted, fontFamily: "'DM Mono', monospace", paddingLeft: 8 }}>Sunday, September 6, 9:12 AM</div>
          <button className="btn icon" aria-label={`Text size: ${["smaller", "normal", "larger"][size]}`} title={`Text size: ${["smaller", "normal", "larger"][size]}`} onClick={() => setSize((v) => (v + 1) % 3)}><span style={{ fontFamily: "'DM Serif Display', serif", fontSize: [15, 18, 22][size], lineHeight: 1 }}>Aa</span></button>
          <button className="btn"><Upload size={18} /> Import records</button>
          <div title="Last saved to Google Drive at 9:12 AM" style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${T.ok}`, borderRadius: 8, padding: "6px 10px", fontSize: fs(13), fontWeight: 600, color: T.ok, minHeight: 36 }}>
            <Check size={15} /> Saved
          </div>

          {/* Bell: passive updates */}
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="btn icon" aria-label="Updates" aria-expanded={bell} onClick={() => { setBell((b) => !b); setAcct(false); }}>
              <Bell size={22} />
              <span style={{ position: "absolute", top: 4, right: 4, background: T.accent, color: T.accentInk, fontSize: 11, fontWeight: 700, borderRadius: 999, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{NOTICES.length}</span>
            </button>
            {bell && (
              <div className="menu" style={{ minWidth: 320 }}>
                <div style={{ padding: "8px 12px 4px", fontSize: fs(13), fontWeight: 600, color: T.faint }}>What's new</div>
                {NOTICES.map(([t, w]) => (
                  <button key={t}><span style={{ flex: 1, whiteSpace: "normal", lineHeight: 1.4 }}>{t}<span style={{ display: "block", fontSize: fs(12), color: T.faint, fontFamily: "'DM Mono', monospace" }}>{w}</span></span></button>
                ))}
              </div>
            )}
          </div>

          <button className="btn icon" aria-label="Insina AI" style={{ color: T.accent }}><Sparkle size={26} fill={T.accent} /></button>

          {/* Account menu */}
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button aria-label="Account" aria-expanded={acct} onClick={() => { setAcct((a) => !a); setBell(false); }} style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${T.border}`, background: "linear-gradient(135deg, #6ea3ff, #c4b5fd)", color: T.accentInk, fontWeight: 700, fontSize: fs(15) }}>{P.first[0]}</button>
            {acct && (
              <div className="menu">
                <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                  <div style={{ fontSize: fs(15), fontWeight: 600 }}>{P.full}</div>
                  <div style={{ fontSize: fs(13), color: T.muted }}>Liver transplant recipient</div>
                </div>
                <button><User size={18} /> Profile</button>
                <button><Settings size={18} /> Settings</button>
                <button><DatabaseBackup size={18} /> Backup</button>
                <button><LogOut size={18} /> Log out</button>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: narrow ? "20px 16px" : "28px 32px", maxWidth: narrow ? 430 : "none", margin: narrow ? "0 auto" : 0, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: narrow ? fs(28) : fs(34), margin: "0 0 4px", letterSpacing: "-0.3px" }}>Good morning, {P.first}.</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fs(13), color: T.muted, fontFamily: "'DM Mono', monospace" }}><Circle size={9} fill={T.ok} stroke="none" /> Last updated 9:12 AM</div>
          </div>
          <p style={{ fontSize: fs(15), color: T.muted, margin: "0 0 20px" }}>
            {attention.length === 0 ? "Nothing needs your attention today." : `${attention.length} thing${attention.length === 1 ? "" : "s"} need${attention.length === 1 ? "s" : ""} your attention.`}
          </p>

          {/* Quick actions */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
            {[["Log vitals", Activity, "#f87171"], ["Medications", Pill, "#fbbf24", 1], ["Appointments", Calendar, "#6ea3ff", apptCount], ["Symptoms", ClipboardList, "#c4b5fd"], ["Reports", Printer, "#2dd4a0"]].map(([label, Icon, color, badge]) => (
              <button key={label} className="tile">
                <span style={{ width: 40, height: 40, borderRadius: 10, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", color }}><Icon size={22} strokeWidth={2.2} /></span> {label}
                {badge && <span style={{ position: "absolute", top: 8, right: 10, background: T.warn, color: T.accentInk, fontSize: fs(12), fontWeight: 700, borderRadius: 999, minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{badge}</span>}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 720px) 300px", gap: 24, alignItems: "start", justifyContent: "start" }}>
            <section>
              <Column title="Your updates" items={updates} empty="Nothing new. Your record is up to date." fs={fs} count onClear={clear} />

              <h2 style={{ fontSize: fs(20), fontWeight: 600, margin: "28px 0 12px" }}>Current vitals</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {VITALS.map(([label, val, unit, when, color]) => (
                  <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 12px 10px" }}>
                    <div style={{ fontSize: fs(13), color: T.muted, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: fs(20), fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>{val}<span style={{ fontSize: fs(12), fontWeight: 500, marginLeft: 3 }}>{unit}</span></div>
                    <div style={{ fontSize: fs(12), color: T.faint, marginTop: 6 }}>{when}</div>
                  </div>
                ))}
              </div>
              <button className="btn ghost" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>All vitals and trends <ChevronRight size={16} /></button>
            </section>

            <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section aria-label="Who to call" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <h2 style={{ fontSize: fs(18), fontWeight: 600, margin: "0 0 12px" }}>Who to call</h2>
                {CONTACTS.map(([role, name, phone]) => (
                  <div key={role} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${T.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: fs(15), fontWeight: 600 }}>{role}</div>
                      <div style={{ fontSize: fs(13), color: T.muted }}>{name}</div>
                    </div>
                    <a href={`tel:${phone.replace(/-/g, "")}`} style={{ color: T.accent, fontSize: fs(15), fontWeight: 600, fontFamily: "'DM Mono', monospace", textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, minHeight: 44 }}><Phone size={15} /> {phone}</a>
                  </div>
                ))}
                <button className="btn ghost" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>Full care team (19) <ChevronRight size={16} /></button>
              </section>

              <section aria-label="Insina AI" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Sparkles size={20} color={T.accent} />
                  <h2 style={{ fontSize: fs(18), fontWeight: 600, margin: 0 }}>Insina AI</h2>
                </div>
                <p style={{ fontSize: fs(14), color: T.muted, margin: "0 0 12px", lineHeight: 1.5 }}>Asks questions about your record. It never tells you what to do.</p>
                {["What changed in my labs this month?", "Which medicines interact with each other?", "Help me prepare for the September 15 visit"].map((q) => (
                  <button key={q} className="btn" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 8, whiteSpace: "normal", textAlign: "left", fontWeight: 500 }}>{q}</button>
                ))}
                <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}>Ask something else</button>
              </section>
            </aside>
          </div>
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <button className="btn ghost" onClick={() => setNarrow((n) => !n)} style={{ opacity: 0.6, fontSize: fs(12), minHeight: 32, borderColor: "transparent" }}>{narrow ? "Desktop preview" : "Phone preview"} (artifact only)</button>
          </div>
        </main>
      </div>
    </div>
  );
}

const RANK = { flag: 0, record: 1, lab: 2, refill: 3, appt: 3 };
function Column({ title, items, empty, fs, count, onClear, preview = 5 }) {
  const [open, setOpen] = useState(false);
  const sorted = [...items].sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.id - b.id);
  const shown = open ? sorted : sorted.slice(0, preview);
  const needs = sorted.filter((i) => NEEDS.includes(i.kind)).length;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: fs(18), fontWeight: 600, margin: 0, color: T.text2 }}>{title}</h2>
        {count && needs > 0 ? <span title="Need a response" style={{ background: T.warn, color: T.accentInk, fontSize: fs(12), fontWeight: 700, borderRadius: 999, minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{needs}</span> : null}
      </div>
      {shown.length === 0 && (
        <div style={{ border: `1px solid ${T.ok}`, background: "rgba(45,212,160,0.08)", borderRadius: 14, padding: 18, color: T.ok, fontSize: fs(15), display: "flex", gap: 10, alignItems: "center" }}><Check size={20} /> {empty}</div>
      )}
      {shown.map((item) => {
        const isFlag = item.kind === "flag";
        const attention = NEEDS.includes(item.kind);
        const Icon = item.icon;
        return (
          <article key={item.id} style={{ background: attention ? T.warnBg : T.card, border: `1px solid ${attention ? T.warn : T.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.raised, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: attention ? T.warn : T.accent }}><Icon size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: fs(15), fontWeight: 600, lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: fs(13), color: T.faint, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{item.when}</div>
              </div>
              {!isFlag && <button className="btn icon" aria-label="Dismiss" onClick={() => onClear(item.id)}><X size={18} /></button>}
            </div>
            <div style={{ fontSize: fs(14), color: T.text2, lineHeight: 1.5, marginTop: 8 }}>{item.body}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button className={`btn ${isFlag ? "primary" : ""}`} style={{ padding: "0 12px" }}>{isFlag && <Phone size={16} />}{item.action}</button>
              {isFlag && <button className="btn" style={{ padding: "0 12px" }} onClick={() => onClear(item.id)}><Check size={16} /> Acknowledge</button>}
            </div>
          </article>
        );
      })}
      {items.length > preview && (
        <button className="btn ghost" style={{ width: "100%", justifyContent: "center" }} onClick={() => setOpen((o) => !o)}>{open ? "Show fewer" : `View all ${items.length}`} <ChevronRight size={16} /></button>
      )}
    </div>
  );
}
