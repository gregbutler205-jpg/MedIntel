import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState, useEffect } from "react";

const INITIAL_BACKUPS = [
  { id: 1, type: "Auto-backup",   date: "Mar 18, 2026", size: "18.4 KB" },
  { id: 2, type: "Auto-backup",   date: "Mar 11, 2026", size: "17.9 KB" },
  { id: 3, type: "Manual backup", date: "Mar 4, 2026",  size: "17.1 KB" },
  { id: 4, type: "Auto-backup",   date: "Feb 25, 2026", size: "16.6 KB" },
];

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0b1220", border: "1px solid #10b981", borderRadius: 10, padding: "12px 18px", fontSize: 12, color: "#10b981", fontFamily: "'DM Mono', monospace", zIndex: 200 }}>
      ✓ {msg}
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, confirmStyle, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#0b1220", border: "1px solid #1a2f4a", borderRadius: 14, padding: 28, width: 440 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#dde8f5", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#7eb8d8", lineHeight: 1.65, marginBottom: 22 }}>{body}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", background: "transparent", border: "1px solid #111e30", borderRadius: 8, color: "#3d5a7a", fontFamily: "'Sora', sans-serif", cursor: "pointer", fontSize: 12 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "8px 18px", borderRadius: 8, fontFamily: "'Sora', sans-serif", cursor: "pointer", fontSize: 12, ...confirmStyle }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ApiKeyModal({ current, onSave, onClose }) {
  const [val, setVal] = useState(current || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#0b1220", border: "1px solid #1a2f4a", borderRadius: 14, padding: 28, width: 440 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#dde8f5", marginBottom: 6 }}>Anthropic API Key</div>
        <div style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>Stored locally in your browser · never transmitted to any server</div>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="sk-ant-api03-..."
          type="password"
          style={{ width: "100%", background: "#07090f", border: "1px solid #111e30", borderRadius: 8, padding: "8px 12px", color: "#a8c4dc", fontFamily: "'DM Mono', monospace", fontSize: 11, outline: "none", marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: "transparent", border: "1px solid #111e30", borderRadius: 8, color: "#3d5a7a", fontFamily: "'Sora', sans-serif", cursor: "pointer", fontSize: 12 }}>Cancel</button>
          <button onClick={() => { onSave(val.trim()); onClose(); }} style={{ padding: "8px 18px", background: "rgba(79,142,247,.15)", border: "1px solid rgba(79,142,247,.35)", borderRadius: 8, color: "#4f8ef7", fontFamily: "'Sora', sans-serif", cursor: "pointer", fontSize: 12 }}>Save Key</button>
        </div>
      </div>
    </div>
  );
}

function ExportTile({ icon, label, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: "#07090f", border: `1px solid ${hovered ? "#1a2f4a" : "#111e30"}`, borderRadius: 10, padding: 14, cursor: "pointer", transition: "border-color .15s" }}
    >
      <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#c4d8ee", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono', monospace", lineHeight: 1.55 }}>{sub}</div>
    </div>
  );
}

const cardStyle = { background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "18px 20px" };
const sectionLbl = { fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono', monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 };
const btnPrimary = { padding: "8px 14px", background: "rgba(79,142,247,.1)", border: "1px solid rgba(79,142,247,.25)", borderRadius: 8, color: "#4f8ef7", fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer" };
const btnGhost   = { padding: "8px 14px", background: "#07090f", border: "1px solid #111e30", borderRadius: 8, color: "#3d5a7a", fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer" };

export default function DataBackup() {
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem("mi_ak") || "");
  const [backupFreq, setBackupFreq] = useState("Weekly");
  const [backups, setBackups]     = useState(INITIAL_BACKUPS);
  const [toast, setToast]         = useState("");
  const [modal, setModal]         = useState(null); // "clear" | "reset" | "restore" | "apikey"
  const [restoreId, setRestoreId] = useState(null);

  const maskedKey = apiKey ? "sk-ant-" + "•".repeat(20) : "";

  function showToast(msg) { setToast(msg); }

  function handleBackupNow() {
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setBackups([{ id: Date.now(), type: "Manual backup", date: dateStr, size: "18.7 KB" }, ...backups]);
    showToast("Backup created successfully");
  }

  function handleExport(type) {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), type, patient: "Greg Butler", note: "IntelliTrax export" }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intellitrax_${type.toLowerCase().replace(/ /g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${type} downloaded`);
  }

  function handleSaveApiKey(key) {
    localStorage.setItem("mi_ak", key);
    setApiKey(key);
    showToast("API key saved");
  }

  function handleClearData() {
    localStorage.clear();
    setApiKey("");
    setBackups([]);
    setModal(null);
    showToast("All data cleared");
  }

  function handleReset() {
    setBackups(INITIAL_BACKUPS);
    setModal(null);
    showToast("Reset to demo state");
  }

  function confirmRestore() {
    const b = backups.find(x => x.id === restoreId);
    setModal(null);
    showToast(`Restored from ${b?.date}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
      </div>
      <div style={{ overflowY: "auto", padding: "24px 28px", flex: 1 }}>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.4px" }}>Data & Backup</h1>
        <p style={{ fontSize: 11, color: "#2d4d6a", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>Manage exports, connections, storage, and app settings</p>
      </div>

      {/* Row 1: Sources + Storage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Connected Sources */}
        <div style={cardStyle}>
          <div style={sectionLbl}>Connected Data Sources</div>
          {[
            { icon: "E", iconBg: "rgba(79,142,247,.12)", iconBorder: "rgba(79,142,247,.2)", iconColor: "#4f8ef7", name: "Epic MyChart",  sub: "Ochsner · Hattiesburg · SCRMC", status: "Live",    statusColor: "#10b981", mono: true },
            { icon: "♡", iconBg: "rgba(239,68,68,.08)",  iconBorder: "rgba(239,68,68,.15)",  iconColor: "#ef4444", name: "Apple Health", sub: "iOS companion required",       status: "Pending", statusColor: "#f59e0b", mono: false },
            { icon: "✎", iconBg: "rgba(167,139,250,.1)", iconBorder: "rgba(167,139,250,.2)", iconColor: "#a78bfa", name: "Manual Entry", sub: "Vitals, meds, symptoms",       status: "Active",  statusColor: "#10b981", mono: false },
          ].map((src, i, arr) => (
            <div key={src.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #0d1a28" : "none" }}>
              <div style={{ width: 32, height: 32, background: src.iconBg, border: `1px solid ${src.iconBorder}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: src.mono ? 10 : 15, fontFamily: src.mono ? "'DM Mono', monospace" : "inherit", color: src.iconColor, fontWeight: src.mono ? 600 : 400, flexShrink: 0 }}>
                {src.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#c4d8ee" }}>{src.name}</div>
                <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono', monospace" }}>{src.sub}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: src.statusColor, boxShadow: src.statusColor === "#10b981" ? `0 0 6px ${src.statusColor}60` : "none" }} />
                <span style={{ fontSize: 10, color: src.statusColor, fontFamily: "'DM Mono', monospace" }}>{src.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Storage */}
        <div style={cardStyle}>
          <div style={sectionLbl}>Storage & Records</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { val: "2,996", label: "Lab entries",  color: "#4f8ef7" },
              { val: "48",    label: "Vitals logged", color: "#10b981" },
              { val: "14",    label: "Active meds",   color: "#a78bfa" },
              { val: "12",    label: "Notes saved",   color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ background: "#07090f", border: "1px solid #0d1a28", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#3d5a7a", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono', monospace", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <span>Local storage used</span><span style={{ color: "#7eb8d8" }}>1.2 MB / 5 MB</span>
          </div>
          <div style={{ height: 4, background: "#0d1a28", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "24%", background: "linear-gradient(90deg,#4f8ef7,#a78bfa)", borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* Row 2: Export */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={sectionLbl}>Export Your Data</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          <ExportTile icon="📄" label="Full Export"     sub="All data as JSON — labs, meds, vitals, notes"  onClick={() => handleExport("Full Export")} />
          <ExportTile icon="📊" label="Labs CSV"        sub="All lab results in spreadsheet format"          onClick={() => handleExport("Labs CSV")} />
          <ExportTile icon="🏥" label="Health Summary"  sub="PDF — share with new providers"                 onClick={() => handleExport("Health Summary")} />
          <ExportTile icon="💊" label="Medication List" sub="Current meds + history as PDF"                  onClick={() => handleExport("Medication List")} />
        </div>
      </div>

      {/* Row 3: Backup history + Settings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Backup history */}
        <div style={cardStyle}>
          <div style={sectionLbl}>Backup History</div>
          {backups.slice(0, 5).map(b => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #0d1a28" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: "#7eb8d8" }}>{b.type}</div>
              <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono', monospace" }}>{b.date}</div>
              <div style={{ fontSize: 9, color: "#10b981", fontFamily: "'DM Mono', monospace", minWidth: 44, textAlign: "right" }}>{b.size}</div>
              <span
                onClick={() => { setRestoreId(b.id); setModal("restore"); }}
                style={{ fontSize: 10, color: "#3d5a7a", fontFamily: "'DM Mono', monospace", cursor: "pointer", marginLeft: 8 }}
                title="Restore this backup"
              >↩</span>
            </div>
          ))}
          {backups.length === 0 && (
            <div style={{ fontSize: 12, color: "#1e3550", fontFamily: "'DM Mono', monospace", padding: "10px 0" }}>No backups yet</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={handleBackupNow}>Backup Now</button>
            <button style={{ ...btnGhost, flex: 1 }} onClick={() => showToast("Click ↩ on a backup entry to restore")}>Restore…</button>
          </div>
        </div>

        {/* App Settings */}
        <div style={cardStyle}>
          <div style={sectionLbl}>App Settings</div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#7eb8d8", marginBottom: 6 }}>Anthropic API Key</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "#07090f", border: "1px solid #111e30", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono', monospace", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {apiKey ? maskedKey : <span style={{ color: "#1e3550" }}>Not set</span>}
              </div>
              <button style={btnPrimary} onClick={() => setModal("apikey")}>Edit</button>
            </div>
            <div style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono', monospace", marginTop: 5 }}>Stored locally · never sent to any server</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#7eb8d8", marginBottom: 6 }}>Auto-backup frequency</div>
            <select
              value={backupFreq}
              onChange={e => { setBackupFreq(e.target.value); showToast(`Backup frequency set to ${e.target.value}`); }}
              style={{ width: "100%", background: "#07090f", border: "1px solid #111e30", borderRadius: 8, padding: "8px 12px", color: "#a8c4dc", fontFamily: "'DM Mono', monospace", fontSize: 11, outline: "none", cursor: "pointer" }}
            >
              {["Daily", "Weekly", "Monthly", "Never"].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#7eb8d8", marginBottom: 6 }}>Data since</div>
            <div style={{ background: "#07090f", border: "1px solid #0d1a28", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#3d5a7a", fontFamily: "'DM Mono', monospace" }}>
              January 2020 (oldest record)
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ background: "#0b1220", border: "1px solid rgba(239,68,68,.2)", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontSize: 10, color: "rgba(239,68,68,.5)", fontFamily: "'DM Mono', monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Danger Zone</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "#07090f", border: "1px solid rgba(239,68,68,.15)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Clear All Data</div>
            <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono', monospace", lineHeight: 1.55, marginBottom: 10 }}>Permanently removes all locally stored records, notes, and settings. Cannot be undone.</div>
            <button onClick={() => setModal("clear")} style={{ padding: "6px 14px", border: "1px solid rgba(239,68,68,.3)", borderRadius: 6, fontSize: 11, color: "#ef4444", cursor: "pointer", fontFamily: "'DM Mono', monospace", background: "transparent" }}>Clear Data</button>
          </div>
          <div style={{ flex: 1, background: "#07090f", border: "1px solid rgba(245,158,11,.15)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>Reset to Demo</div>
            <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono', monospace", lineHeight: 1.55, marginBottom: 10 }}>Restore the app to the original demo state with sample data. Clears any personal entries.</div>
            <button onClick={() => setModal("reset")} style={{ padding: "6px 14px", border: "1px solid rgba(245,158,11,.3)", borderRadius: 6, fontSize: 11, color: "#f59e0b", cursor: "pointer", fontFamily: "'DM Mono', monospace", background: "transparent" }}>Reset</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "apikey" && <ApiKeyModal current={apiKey} onSave={handleSaveApiKey} onClose={() => setModal(null)} />}
      {modal === "clear" && (
        <ConfirmModal
          title="Clear All Data?"
          body="This will permanently delete all locally stored records, notes, vitals, and settings — including your API key. This cannot be undone."
          confirmLabel="Yes, clear everything"
          confirmStyle={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.35)", color: "#ef4444" }}
          onConfirm={handleClearData}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "reset" && (
        <ConfirmModal
          title="Reset to Demo?"
          body="This will restore all tabs to the original demo data and clear any personal entries you've added. Your API key will be preserved."
          confirmLabel="Yes, reset to demo"
          confirmStyle={{ background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.35)", color: "#f59e0b" }}
          onConfirm={handleReset}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "restore" && (
        <ConfirmModal
          title="Restore this backup?"
          body={`This will overwrite your current data with the backup from ${backups.find(b => b.id === restoreId)?.date}. Your current state will be lost.`}
          confirmLabel="Yes, restore"
          confirmStyle={{ background: "rgba(79,142,247,.15)", border: "1px solid rgba(79,142,247,.35)", color: "#4f8ef7" }}
          onConfirm={confirmRestore}
          onCancel={() => setModal(null)}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </div>
      </div>
  );
}