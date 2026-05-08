// ─────────────────────────────────────────────────────────────────────────────
// SearchPopup.jsx — Global search across all health data
// Keyword queries search localStorage directly (no tokens).
// Natural-language questions route to AI Analysis (uses tokens).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";

const C = {
  overlay: "rgba(0,0,0,.72)",
  card:    "#0b1220",
  b1:      "#1a2f4a",
  b2:      "#111e30",
  blue:    "#4f8ef7",
  green:   "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
  purple:  "#a78bfa",
  p:       "#dde8f5",
  s:       "#7eb8d8",
  dim:     "#98afc4",
  ghost:   "#4a5c6a",
};

const CATEGORIES = {
  labs:         { label: "Labs & Results",  color: "#10b981", tab: "labs"         },
  medications:  { label: "Medications",     color: "#f59e0b", tab: "medications"  },
  conditions:   { label: "Conditions",      color: "#a78bfa", tab: "conditions"   },
  appointments: { label: "Appointments",    color: "#4f8ef7", tab: "appointments" },
  symptoms:     { label: "Symptoms",        color: "#ef4444", tab: "symptoms"     },
  surgeries:    { label: "Surgeries",       color: "#7eb8d8", tab: "surgeries"    },
  documents:    { label: "Documents",       color: "#f59e0b", tab: "documents"    },
  aiHistory:    { label: "AI History",      color: "#a78bfa", tab: "ai"           },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeRead(key, fb) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
}

function includes(val, q) {
  return (val || "").toLowerCase().includes(q);
}

function snippet(text, query, radius = 100) {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2) + (text.length > radius * 2 ? "…" : "");
  const s = Math.max(0, idx - radius);
  const e = Math.min(text.length, idx + query.length + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e) + (e < text.length ? "…" : "");
}

// Detect natural-language questions vs. keyword searches
function isQuestion(query) {
  const q = query.trim().toLowerCase();
  if (q.endsWith("?")) return true;
  return /^(what|why|how|when|where|who|is|are|was|were|has|have|had|does|do|did|can|could|should|would|will|tell me|explain|show me|give me|compare|analyze|review|list|find|summarize)\b/.test(q);
}

// ── Core search ───────────────────────────────────────────────────────────────
function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];

  // Labs
  safeRead("mi_labs", []).forEach(l => {
    if ([l.name, l.value, l.notes, l.date, l.refRange].some(f => includes(f, q))) {
      results.push({
        category: "labs",
        title:    l.name || "Lab Result",
        subtitle: [
          l.value != null ? `${l.value}${l.unit ? " " + l.unit : ""}` : null,
          l.refRange ? `Ref: ${l.refRange}` : null,
          l.flag ? "⚠ Flagged" : null,
          l.date,
        ].filter(Boolean).join(" · "),
        date: l.date || "",
      });
    }
  });

  // Medications
  safeRead("mi_meds_full", []).forEach(m => {
    if ([m.name, m.brand, m.dose, m.frequency, m.notes, m.category, m.prescriber].some(f => includes(f, q))) {
      results.push({
        category: "medications",
        title:    m.name || "Medication",
        subtitle: [m.dose, m.frequency, m.status !== "active" ? m.status : null].filter(Boolean).join(" · "),
        date: "",
      });
    }
  });

  // Conditions
  safeRead("mi_conditions", []).forEach(c => {
    if ([c.name, c.notes, c.status, c.severity].some(f => includes(f, q))) {
      results.push({
        category: "conditions",
        title:    c.name || "Condition",
        subtitle: [c.status, c.since ? "Since " + c.since : null].filter(Boolean).join(" · "),
        date: c.since || "",
      });
    }
  });

  // Appointments
  safeRead("mi_appointments", []).forEach(a => {
    if ([a.title, a.provider, a.facility, a.notes, a.type, a.address].some(f => includes(f, q))) {
      results.push({
        category: "appointments",
        title:    a.title || "Appointment",
        subtitle: [a.provider, a.facility, a.date].filter(Boolean).join(" · "),
        date: a.date || "",
      });
    }
  });

  // Symptoms
  safeRead("mi_symptoms", []).forEach(s => {
    if ([s.name, s.notes, s.severity].some(f => includes(f, q))) {
      results.push({
        category: "symptoms",
        title:    s.name || "Symptom",
        subtitle: [s.severity, s.date].filter(Boolean).join(" · "),
        date: s.date || "",
      });
    }
  });

  // Surgeries
  safeRead("mi_surgeries", []).forEach(s => {
    if ([s.procedure, s.surgeon, s.facility, s.notes, s.outcome].some(f => includes(f, q))) {
      results.push({
        category: "surgeries",
        title:    s.procedure || "Surgery",
        subtitle: [s.surgeon, s.facility, s.date].filter(Boolean).join(" · "),
        date: s.date || "",
      });
    }
  });

  // Reference documents (name + full text with snippet)
  safeRead("mi_ref_docs", []).forEach(d => {
    const nameHit = includes(d.name, q);
    const textHit = includes(d.text, q);
    if (nameHit || textHit) {
      results.push({
        category: "documents",
        title:    d.name || "Document",
        subtitle: textHit ? snippet(d.text, query) : "Matched document name",
        date: d.addedAt ? d.addedAt.slice(0, 10) : "",
      });
    }
  });

  // AI conversation history (free — localStorage only)
  safeRead("insina_ai_messages", []).forEach((m, i) => {
    if (includes(m.text, q)) {
      results.push({
        category: "aiHistory",
        title:    m.role === "user" ? "Your question" : "AI response",
        subtitle: snippet(m.text, query, 80),
        date: "",
        msgIndex: i,
      });
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SearchPopup({ onClose, onNavChange }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [aiMode,  setAiMode]  = useState(false);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Run search on query change
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setAiMode(false); return; }
    if (isQuestion(q)) { setAiMode(true); setResults([]); }
    else               { setAiMode(false); setResults(searchAll(q)); }
  }, [query]);

  function handleAskAI() {
    localStorage.setItem("mi_ai_pending", query.trim());
    onNavChange("ai");
    onClose();
  }

  function handleResult(cat) {
    onNavChange(CATEGORIES[cat].tab);
    onClose();
  }

  // Group results by category
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });
  const total = results.length;
  const q = query.trim();

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 72 }}
    >
      <div style={{ width: "100%", maxWidth: 660, background: C.card, border: `1px solid ${C.b1}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 28px 72px rgba(0,0,0,.7)", display: "flex", flexDirection: "column", maxHeight: "72vh" }}>

        {/* ── Search bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${C.b2}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && aiMode) handleAskAI(); }}
            placeholder="Search your health data, or ask a question…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.p, fontSize: 14, fontFamily: "'Sora',sans-serif" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 15, padding: "0 4px", lineHeight: 1 }}>✕</button>
          )}
          <kbd style={{ background: "#0d1520", border: `1px solid ${C.b1}`, borderRadius: 5, color: C.ghost, fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "3px 7px", cursor: "pointer" }} onClick={onClose}>ESC</kbd>
        </div>

        {/* ── Results ── */}
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* AI question card */}
          {aiMode && q && (
            <div style={{ padding: "14px 18px 8px" }}>
              <button
                onClick={handleAskAI}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "linear-gradient(135deg,rgba(79,142,247,.12),rgba(167,139,250,.08))", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 10, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 18, color: C.blue, flexShrink: 0 }}>✦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.p, fontWeight: 600, marginBottom: 3 }}>Ask AI: "{q}"</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono',monospace" }}>Opens AI Analysis with your full health context · uses tokens</div>
                </div>
                <span style={{ color: C.blue, fontSize: 14 }}>→</span>
              </button>
              <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 8, paddingLeft: 2 }}>
                Press <strong style={{ color: C.dim }}>Enter</strong> to open, or refine your query for a keyword search
              </div>
            </div>
          )}

          {/* Keyword results grouped by category */}
          {!aiMode && q && total === 0 && (
            <div style={{ padding: "48px 18px", textAlign: "center", color: C.ghost, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
              No results found for "{q}"
            </div>
          )}

          {!aiMode && Object.entries(grouped).map(([cat, items]) => {
            const cfg = CATEGORIES[cat];
            return (
              <div key={cat} style={{ padding: "12px 18px 4px" }}>
                <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: cfg.color, fontFamily: "'DM Mono',monospace", marginBottom: 6, paddingLeft: 2 }}>
                  {cfg.label}
                </div>
                {items.slice(0, 6).map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleResult(cat)}
                    style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 10px", background: "transparent", border: "1px solid transparent", borderRadius: 8, cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.p, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                      {r.subtitle && (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Mono',monospace", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {r.subtitle}
                        </div>
                      )}
                    </div>
                    {r.date && <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", flexShrink: 0, paddingTop: 2 }}>{String(r.date).slice(0, 10)}</div>}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Empty state */}
          {!q && (
            <div style={{ padding: "36px 18px", textAlign: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace", lineHeight: 2 }}>
                Search labs, medications, conditions, appointments,<br />
                symptoms, surgeries, documents and more.<br />
                <span style={{ color: C.blue }}>Ask a question to open AI Analysis.</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!aiMode && total > 0 && (
          <div style={{ padding: "8px 18px", borderTop: `1px solid ${C.b2}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>
              {total} result{total !== 1 ? "s" : ""} · click any to open that section
            </span>
            <span style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>
              ↑↓ navigate · Enter select
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
