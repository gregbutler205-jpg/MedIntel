import { useState, useEffect } from "react";
import LOGO from "../assets/logo.png";

const PIN_LENGTH = 4;

async function hashPin(pin) {
  const buf  = new TextEncoder().encode(pin + "intellitrax-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function LockScreen({ onUnlock }) {
  const hasPin = !!localStorage.getItem("mi_auth_hash");
  const [mode, setMode]       = useState(hasPin ? "enter" : "setup"); // setup | enter | confirm | forgot
  const [pin, setPin]         = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [error, setError]     = useState("");
  const [shake, setShake]     = useState(false);
  const [forgotStep, setForgotStep] = useState(false);

  // Auto-submit when PIN is full length
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handleSubmit(pin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function press(digit) {
    if (pin.length >= PIN_LENGTH) return;
    setError("");
    setPin(p => p + digit);
  }

  function del() {
    setPin(p => p.slice(0, -1));
    setError("");
  }

  async function handleSubmit(currentPin) {
    if (currentPin.length < PIN_LENGTH) return;

    if (mode === "setup") {
      // First entry — move to confirm step
      setSetupPin(currentPin);
      setPin("");
      setMode("confirm");
      return;
    }

    if (mode === "confirm") {
      if (currentPin !== setupPin) {
        setError("PINs don't match. Try again.");
        triggerShake();
        setPin("");
        return;
      }
      const h = await hashPin(currentPin);
      localStorage.setItem("mi_auth_hash", h);
      sessionStorage.setItem("mi_unlocked", "1");
      onUnlock();
      return;
    }

    if (mode === "enter") {
      const h    = await hashPin(currentPin);
      const stored = localStorage.getItem("mi_auth_hash");
      if (h === stored) {
        sessionStorage.setItem("mi_unlocked", "1");
        onUnlock();
      } else {
        setError("Incorrect PIN.");
        triggerShake();
        setPin("");
      }
      return;
    }
  }

  function handleForgot() {
    // Clear all mi_ keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith("mi_"));
    keys.forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem("mi_unlocked");
    setForgotStep(false);
    setMode("setup");
    setPin("");
    setSetupPin("");
    setError("");
  }

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  const title = mode === "setup"   ? "Create your PIN"
              : mode === "confirm" ? "Confirm your PIN"
              : "Enter PIN";
  const subtitle = mode === "setup"   ? "Choose a 4-digit PIN to secure your health data"
                 : mode === "confirm" ? "Re-enter the same PIN to confirm"
                 : "IntelliTrax is locked";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#07090f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Sora', sans-serif",
      userSelect: "none",
      WebkitUserSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-10px); }
          40%     { transform: translateX(10px); }
          60%     { transform: translateX(-7px); }
          80%     { transform: translateX(7px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lock-wrap { animation: fadeIn .35s ease both; }
        .key-btn {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          color: #dde8f5; font-size: 22px; font-weight: 500;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 1px;
          transition: background .12s, transform .08s;
          -webkit-tap-highlight-color: transparent;
        }
        .key-btn:active { background: rgba(79,142,247,.25); transform: scale(.93); }
        .key-btn.del { background: transparent; border-color: transparent; font-size: 20px; }
        .key-btn.del:active { background: rgba(255,255,255,.06); }
        .key-sub { font-size: 9px; letter-spacing: 1.5px; color: #6a8090; font-family: 'DM Mono', monospace; }
      `}</style>

      <div className="lock-wrap" style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:340, padding:"0 24px" }}>

        {/* Logo */}
        <img src={LOGO} alt="IntelliTrax" style={{ width:160, height:56, objectFit:"contain", marginBottom:32, opacity:.9 }} />

        {/* Title */}
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:24, color:"#dde8f5", marginBottom:8, textAlign:"center" }}>
          {title}
        </div>
        <div style={{ fontSize:12, color:"#6a8090", fontFamily:"'DM Mono',monospace", marginBottom:36, textAlign:"center", lineHeight:1.5 }}>
          {subtitle}
        </div>

        {/* PIN dots */}
        <div
          style={{
            display:"flex", gap:16, marginBottom:12,
            animation: shake ? "shake .45s ease both" : "none",
          }}
        >
          {dots.map((filled, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: "50%",
              background: filled ? "#4f8ef7" : "transparent",
              border: `2px solid ${filled ? "#4f8ef7" : "#2a3a50"}`,
              transition: "background .15s, border-color .15s",
              boxShadow: filled ? "0 0 10px rgba(79,142,247,.5)" : "none",
            }} />
          ))}
        </div>

        {/* Error */}
        <div style={{ height:18, marginBottom:24, fontSize:12, color:"#ef4444", fontFamily:"'DM Mono',monospace", textAlign:"center" }}>
          {error}
        </div>

        {/* Keypad */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 72px)", gap:14, marginBottom:28 }}>
          {[
            ["1",""],["2","ABC"],["3","DEF"],
            ["4","GHI"],["5","JKL"],["6","MNO"],
            ["7","PQRS"],["8","TUV"],["9","WXYZ"],
          ].map(([digit, sub]) => (
            <button key={digit} className="key-btn" onClick={() => press(digit)}>
              <span>{digit}</span>
              {sub && <span className="key-sub">{sub}</span>}
            </button>
          ))}
          {/* Bottom row: empty, 0, delete */}
          <div />
          <button className="key-btn" onClick={() => press("0")}>
            <span>0</span>
          </button>
          <button className="key-btn del" onClick={del}>
            ⌫
          </button>
        </div>

        {/* Forgot PIN */}
        {mode === "enter" && !forgotStep && (
          <button
            onClick={() => setForgotStep(true)}
            style={{ background:"transparent", border:"none", color:"#4f8ef7", fontSize:13, cursor:"pointer", fontFamily:"'DM Mono',monospace", padding:"8px 0" }}
          >
            Forgot PIN?
          </button>
        )}

        {/* Forgot confirm */}
        {forgotStep && (
          <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)", borderRadius:12, padding:"16px 18px", textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#f87171", marginBottom:12, lineHeight:1.5 }}>
              This will <strong>delete all your health data</strong> and reset the PIN. This cannot be undone.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button
                onClick={() => setForgotStep(false)}
                style={{ padding:"7px 18px", background:"transparent", border:"1px solid #1a2f4a", borderRadius:8, color:"#b0c4d8", fontSize:12, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleForgot}
                style={{ padding:"7px 18px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.35)", borderRadius:8, color:"#ef4444", fontSize:12, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}
              >
                Reset &amp; Clear Data
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
