import { useState } from "react";
import {
  Calendar,
  Pill,
  Activity,
  MessageCircleQuestion,
  Printer,
  ChevronRight,
  Sun,
  Moon,
  Home,
  FlaskConical,
  HeartPulse,
  LayoutGrid,
  TriangleAlert,
  Phone,
} from "lucide-react";

// Accessible token sets. Every text token clears WCAG AA (4.5:1) on its card background.
const THEMES = {
  dark: {
    base: "#07090f",
    card: "#0b1220",
    cardRaised: "#101a2c",
    border: "#1c2a40",
    text: "#e6eef8",
    textSecondary: "#c4d8ee",
    textMuted: "#8fabc7", // was #3d5a7a (2.6:1), now 7.9:1
    textFaint: "#7a97b6", // was #1e3550 (1.5:1), now 6.2:1
    accent: "#6ea3ff", // 7.4:1
    accentText: "#07090f",
    ok: "#2dd4a0",
    warn: "#f59e0b",
    danger: "#f87171",
    warnBg: "rgba(245,158,11,0.12)",
    tabBar: "#080c14",
  },
  light: {
    base: "#f3f6fb",
    card: "#ffffff",
    cardRaised: "#eef3fa",
    border: "#cfd9e8",
    text: "#101827",
    textSecondary: "#25344d",
    textMuted: "#4a5f7d",
    textFaint: "#5b6f8c",
    accent: "#2456c7",
    accentText: "#ffffff",
    ok: "#0f7f5a",
    warn: "#a05a00",
    danger: "#b42318",
    warnBg: "rgba(160,90,0,0.10)",
    tabBar: "#ffffff",
  },
};

// Demo persona only. No real patient data.
const PERSONA = { first: "Jordan", full: "Jordan Reyes" };

export default function InsinaToday() {
  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("patient"); // patient | caregiver
  const [tab, setTab] = useState("today");
  const t = THEMES[theme];
  const care = mode === "caregiver";
  const whose = care ? `${PERSONA.first}'s` : "your";
  const Whose = care ? `${PERSONA.first}'s` : "Your";

  const focus = `0 0 0 3px ${t.base}, 0 0 0 6px ${t.accent}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#02040a" : "#dfe6f0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "24px 16px",
        fontFamily: "'Sora', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        button:focus-visible, a:focus-visible { outline: none; box-shadow: ${focus}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* Reviewer controls. Not part of the product surface. */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          fontSize: 14,
          color: theme === "dark" ? "#c4d8ee" : "#25344d",
        }}
      >
        <Seg
          t={t}
          value={mode}
          onChange={setMode}
          options={[
            ["patient", "Patient is using it"],
            ["caregiver", "Caregiver is using it"],
          ]}
        />
        <Seg
          t={t}
          value={theme}
          onChange={setTheme}
          options={[
            ["dark", "Dark"],
            ["light", "Light"],
          ]}
          icons={{ dark: Moon, light: Sun }}
        />
      </div>

      {/* Phone frame */}
      <div
        style={{
          width: 390,
          maxWidth: "100%",
          height: 800,
          background: t.base,
          color: t.text,
          borderRadius: 36,
          border: `1px solid ${t.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "background .2s, color .2s",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: t.accent }}>Insina</div>
            {care && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.textSecondary,
                  background: t.cardRaised,
                  border: `1px solid ${t.border}`,
                  padding: "6px 12px",
                  borderRadius: 999,
                }}
              >
                Helping {PERSONA.full}
              </div>
            )}
          </div>
          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontWeight: 400,
              fontSize: 30,
              lineHeight: 1.15,
              margin: "6px 0 4px",
              letterSpacing: "-0.3px",
            }}
          >
            {care ? `Good morning.` : `Good morning, ${PERSONA.first}.`}
          </h1>
          <p style={{ fontSize: 15, color: t.textMuted, margin: "0 0 20px", lineHeight: 1.45 }}>
            Saturday, September 5. One thing needs {care ? "attention" : "your attention"}.
          </p>

          {/* The one flag. Text authored by the deterministic layer, advisory tier. */}
          <section
            aria-label="Needs attention"
            style={{
              background: t.warnBg,
              border: `1px solid ${t.warn}`,
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <TriangleAlert size={22} color={t.warn} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>
                  Tacrolimus level is overdue
                </div>
                <div style={{ fontSize: 15, color: t.textSecondary, lineHeight: 1.5 }}>
                  {Whose} transplant team asked for this test every 4 weeks. The last one was 32 days ago.
                </div>
              </div>
            </div>
            <button
              style={{
                marginTop: 12,
                minHeight: 44,
                width: "100%",
                background: "transparent",
                border: `1.5px solid ${t.warn}`,
                color: t.text,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Phone size={18} /> Call the transplant clinic
            </button>
          </section>

          {/* Next appointment */}
          <Card t={t} icon={Calendar} title="Next appointment">
            <div style={{ fontSize: 17, fontWeight: 600 }}>Tuesday, September 15</div>
            <div style={{ fontSize: 15, color: t.textSecondary, marginTop: 2 }}>
              10:00 AM with Dr. Alvarez, transplant clinic
            </div>
            <div style={{ fontSize: 14, color: t.textMuted, marginTop: 4 }}>Bring the medication list.</div>
          </Card>

          {/* Medications due */}
          <Card t={t} icon={Pill} title="Medications">
            <Row t={t} left="Tacrolimus 2 mg" right="Due at 9:00 PM" />
            <Row t={t} left="Mycophenolate 500 mg" right="Due at 9:00 PM" />
            <Row t={t} left="Magnesium oxide" right="3 days of refills left" rightColor={t.warn} last />
          </Card>

          {/* Two big actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "18px 0 14px" }}>
            <BigButton t={t} icon={Activity} label={care ? "Log vitals" : "Log my vitals"} primary />
            <BigButton t={t} icon={MessageCircleQuestion} label="Ask a question" />
          </div>

          {/* Two quiet links */}
          <LinkRow t={t} icon={Printer} label="Print for a visit" hint="ER packet, visit prep, medication list" />
          <LinkRow t={t} icon={LayoutGrid} label="Full record" hint="Labs, documents, notes, everything else" />
        </div>

        {/* Tier 1 tab bar */}
        <nav
          aria-label="Main"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            background: t.tabBar,
            borderTop: `1px solid ${t.border}`,
            padding: "8px 6px 14px",
          }}
        >
          {[
            ["today", "Today", Home],
            ["meds", "Meds", Pill],
            ["labs", "Labs", FlaskConical],
            ["vitals", "Vitals", HeartPulse],
            ["more", "More", LayoutGrid],
          ].map(([id, label, Icon]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                style={{
                  minHeight: 48,
                  background: "transparent",
                  border: "none",
                  borderRadius: 12,
                  color: active ? t.accent : t.textMuted,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ maxWidth: 390, fontSize: 13, color: theme === "dark" ? "#8fabc7" : "#4a5f7d", lineHeight: 1.5, textAlign: "center" }}>
        Demo persona. All text tokens clear WCAG AA. Body 15px, smallest text 12px, every tap target 44px or taller.
      </div>
    </div>
  );
}

function Seg({ t, value, onChange, options, icons = {} }) {
  return (
    <div
      role="group"
      style={{ display: "inline-flex", background: t.card, border: `1px solid ${t.border}`, borderRadius: 999, padding: 3 }}
    >
      {options.map(([id, label]) => {
        const Icon = icons[id];
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={active}
            style={{
              minHeight: 40,
              padding: "0 14px",
              borderRadius: 999,
              border: "none",
              background: active ? t.accent : "transparent",
              color: active ? t.accentText : t.textSecondary,
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {Icon && <Icon size={16} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ t, icon: Icon, title, children }) {
  return (
    <section
      aria-label={title}
      style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: t.textMuted, fontSize: 14, fontWeight: 600 }}>
        <Icon size={18} /> {title}
      </div>
      {children}
    </section>
  );
}

function Row({ t, left, right, rightColor, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${t.border}`,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 500 }}>{left}</span>
      <span style={{ fontSize: 14, color: rightColor || t.textMuted, textAlign: "right", fontFamily: "'DM Mono', monospace" }}>{right}</span>
    </div>
  );
}

function BigButton({ t, icon: Icon, label, primary }) {
  return (
    <button
      style={{
        minHeight: 72,
        borderRadius: 16,
        border: primary ? "none" : `1.5px solid ${t.border}`,
        background: primary ? t.accent : t.card,
        color: primary ? t.accentText : t.text,
        fontSize: 16,
        fontWeight: 700,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <Icon size={24} strokeWidth={2.2} />
      {label}
    </button>
  );
}

function LinkRow({ t, icon: Icon, label, hint }) {
  return (
    <button
      style={{
        width: "100%",
        minHeight: 56,
        background: "transparent",
        border: "none",
        borderTop: `1px solid ${t.border}`,
        color: t.text,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 4px",
        textAlign: "left",
      }}
    >
      <Icon size={22} color={t.accent} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 600 }}>{label}</span>
        <span style={{ display: "block", fontSize: 13, color: t.textMuted }}>{hint}</span>
      </span>
      <ChevronRight size={20} color={t.textMuted} />
    </button>
  );
}
