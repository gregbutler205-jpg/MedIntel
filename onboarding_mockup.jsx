import { useState } from "react";

const LOGO = "data:image/png;base64,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";

/* ───────────────────────── Demo data (fictional persona) ───────────────────────── */

const GOALS = [
  { id: "appointment", icon: "◷", label: "Prepare for an upcoming appointment", artifact: "Consultation Prep Brief" },
  { id: "track", icon: "◈", label: "Track my transplant medications & labs", artifact: "Medication Report" },
  { id: "emergency_packet", icon: "⛨", label: "Create an emergency health packet", artifact: "Emergency Card" },
  { id: "organize", icon: "▤", label: "Organize my medications", artifact: "Medication Report" },
  { id: "profile", icon: "◯", label: "Build my portable patient profile", artifact: "Patient Profile" },
];

const STAGED_MEDS = [
  { id: 1, name: "Tacrolimus", detail: "1 mg capsule · 2 mg twice daily · Oral", conf: "high", src: "avs" },
  { id: 2, name: "Mycophenolate mofetil", detail: "250 mg capsule · 500 mg twice daily · Oral", conf: "high", src: "avs" },
  { id: 3, name: "Sulfamethoxazole/Trimethoprim", detail: "800–160 mg tablet · Mon, Wed, Fri · Oral", conf: "high", src: "avs" },
  { id: 4, name: "Prednisone", detail: "5 mg tablet · daily · Oral", conf: "review", stale: true, src: "note24" },
  { id: 5, name: "Nifedipine ER", detail: "30 mg tablet · daily · Oral", conf: "dupe", src: "note24" },
];

const SOURCES = {
  avs: { title: "After-Visit Summary", date: "Mar 12, 2026", page: "Page 2 of 4", stale: false },
  note24: { title: "Transplant Clinic Note", date: "Apr 22, 2024", page: "Page 3 of 8", stale: true },
};

const STAGED_ALLERGY = { name: "Penicillin", reaction: "Rash", conf: "high", src: "avs" };

const CATEGORIES = [
  { id: "meds", label: "Medications", count: 5, badge: "1 needs review · 1 possible duplicate", perItem: true },
  { id: "allergies", label: "Allergies", count: 1, badge: null, perItem: true },
  { id: "conditions", label: "Conditions", count: 3, badge: "1 possible duplicate", perItem: true },
  { id: "careteam", label: "Care Team", count: 2, badge: null, perItem: false },
  { id: "labs", label: "Lab Results", count: 27, badge: "25 high confidence", perItem: false },
  { id: "procedures", label: "Procedures", count: 2, badge: null, perItem: false },
  { id: "immun", label: "Immunizations", count: 3, badge: null, perItem: false },
];

const RAIL = ["Goal", "Basics", "Add data", "Review", "First result"];

/* ───────────────────────────────── App ───────────────────────────────── */

export default function App() {
  const [screen, setScreen] = useState("welcome"); // welcome | goal | basics | add | review | meds | allergies | done
  const [consent, setConsent] = useState(false);
  const [goal, setGoal] = useState(null);
  const [tier0, setTier0] = useState({
    name: "Alex Rivera", dob: "1962-03-14", organ: "Liver", date: "2023-08-12",
    center: "Ochsner Medical Center", coordName: "Sarah Johnson, RN", coordPhone: "(504) 842-1234",
  });
  const [filesAdded, setFilesAdded] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [manualAdded, setManualAdded] = useState(false);
  const [medState, setMedState] = useState({}); // id -> accepted|rejected|deferred
  const [focusMed, setFocusMed] = useState(1);
  const [allergyDone, setAllergyDone] = useState(false);
  const [labsBulk, setLabsBulk] = useState(false);
  const [toast, setToast] = useState(false);
  const [artifact, setArtifact] = useState(false);

  const phaseIndex = { goal: 0, basics: 1, add: 2, review: 3, meds: 3, allergies: 3, done: 4 }[screen];
  const acceptedMeds = Object.values(medState).filter((s) => s === "accepted").length;

  const setMed = (id, s) => {
    setMedState((p) => ({ ...p, [id]: s }));
    setFocusMed(id);
  };

  const finishAllergies = () => {
    setAllergyDone(true);
    // First-artifact engine (§6): emergency packet minimum = Tier0 + ≥1 med + allergies reviewed
    if (!artifact && acceptedMeds >= 1) {
      setArtifact(true);
      setToast(true);
      setTimeout(() => setToast(false), 6000);
    }
  };

  const G = GOALS.find((g) => g.id === goal) || GOALS[2];

  return (
    <div className="ob-root">
      <style>{CSS}</style>

      {/* Header */}
      <header className="ob-head">
        <img className="ob-logo" src={LOGO} alt="Insina Health" />
        {screen !== "welcome" && <Rail current={phaseIndex} />}
      </header>

      <main className="ob-main">
        {screen === "welcome" && (
          <Card wide>
            <div className="ob-eyebrow">WELCOME</div>
            <h1 className="ob-h1">Get a useful result in 10–15 minutes.</h1>
            <p className="ob-lede">Build your record at your pace. You choose what to add and when — nothing is saved without your say-so.</p>

            <div className="ob-consent">
              <p><b>Your data. Your control.</b> Your records are stored on your device or in your own Google Drive — never on Insina servers. When you use AI features like document reading or analysis, only the information needed for that request is sent securely to our AI processor to generate your result; it isn't stored there.</p>
              <p style={{ marginTop: 10 }}>Insina uses AI to read the documents and photos you add and to help you prepare for appointments. That content is transmitted securely to our AI processing service and returned to your device. It is not used to train AI models and is not stored by Insina.</p>
            </div>

            <label className="ob-check">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I understand how my data is handled.</span>
            </label>

            <p className="ob-disclaimer">Insina organizes your health information and helps you prepare questions for your care team. It does not diagnose, treat, or provide medical advice. For urgent symptoms, contact your transplant team or call 911.</p>

            <div className="ob-actions">
              <button className="btn btn-primary" disabled={!consent} onClick={() => setScreen("goal")}>Continue</button>
            </div>
          </Card>
        )}

        {screen === "goal" && (
          <Card>
            <StepLabel n={1} />
            <h2 className="ob-h2">What would you like Insina to help you with first?</h2>
            <p className="ob-sub">This decides the first report we build for you. You can change it anytime.</p>
            <div className="ob-goals">
              {GOALS.map((g) => (
                <button key={g.id} className={`ob-goal ${goal === g.id ? "sel" : ""}`} onClick={() => setGoal(g.id)}>
                  <span className="ob-goal-ic">{g.icon}</span>
                  <span className="ob-goal-tx">
                    <span>{g.label}</span>
                    <small>First result: {g.artifact}</small>
                  </span>
                  <span className="ob-goal-check">{goal === g.id ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <span className="ob-hint">{goal ? "" : "No pick? We'll start with the emergency health packet."}</span>
              <button className="btn btn-primary" onClick={() => setScreen("basics")}>Continue</button>
            </div>
          </Card>
        )}

        {screen === "basics" && (
          <Card>
            <StepLabel n={2} back={() => setScreen("goal")} />
            <h2 className="ob-h2">Let's start with a few key details</h2>
            <p className="ob-sub">About two minutes. These power your {G.artifact} and your emergency contacts.</p>

            <div className="ob-grid2">
              <Field label="Your name"><input className="inp" value={tier0.name} onChange={(e) => setTier0({ ...tier0, name: e.target.value })} /></Field>
              <Field label="Date of birth"><input className="inp" type="date" value={tier0.dob} onChange={(e) => setTier0({ ...tier0, dob: e.target.value })} /></Field>
              <Field label="Organ transplanted">
                <select className="inp" value={tier0.organ} onChange={(e) => setTier0({ ...tier0, organ: e.target.value })}>
                  {["Liver", "Kidney", "Heart", "Lung", "Pancreas", "Multi-organ", "Other"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Transplant date"><input className="inp" type="date" value={tier0.date} onChange={(e) => setTier0({ ...tier0, date: e.target.value })} /></Field>
              <Field label="Transplant center" full><input className="inp" value={tier0.center} onChange={(e) => setTier0({ ...tier0, center: e.target.value })} /></Field>
              <Field label="Transplant coordinator (optional)"><input className="inp" value={tier0.coordName} onChange={(e) => setTier0({ ...tier0, coordName: e.target.value })} /></Field>
              <Field label="Coordinator phone (optional)"><input className="inp" value={tier0.coordPhone} onChange={(e) => setTier0({ ...tier0, coordPhone: e.target.value })} /></Field>
            </div>

            <div className="ob-actions">
              <button className="btn btn-ghost" onClick={() => setScreen("add")}>Skip for now</button>
              <button className="btn btn-primary" onClick={() => setScreen("add")}>Continue</button>
            </div>
          </Card>
        )}

        {screen === "add" && (
          <Card wide>
            <StepLabel n={3} back={() => setScreen("basics")} />
            <h2 className="ob-h2">Add what you already have</h2>
            <p className="ob-sub">Documents help us fill in your record faster and more accurately. Add any of these — or none.</p>

            <div className="ob-tiles">
              <Tile icon="⇪" title="Upload documents" sub="PDF, JPG, PNG, HEIC, ZIP · up to 50 MB each" onClick={() => setFilesAdded(true)} active={filesAdded} />
              <Tile icon="📷" title="Take a photo" sub="Med lists, printed labs, bottle labels · up to 6 pages" onClick={() => setFilesAdded(true)} />
              <Tile icon="⧉" title="Paste from your portal" sub="Copy text from MyChart and paste it here" onClick={() => setFilesAdded(true)} />
              <Tile icon="✎" title="Enter medications directly" sub="No documents handy? About ten minutes." onClick={() => setManualOpen(!manualOpen)} active={manualOpen} />
            </div>

            {manualOpen && (
              <div className="ob-manual">
                <div className="ob-manual-label">GUIDED ENTRY · TYPE A MEDICATION NAME</div>
                <input className="inp" placeholder='Try typing "tac"…' value={medSearch} onChange={(e) => setMedSearch(e.target.value)} />
                {medSearch.toLowerCase().startsWith("ta") && !manualAdded && (
                  <div className="ob-suggest">
                    <button onClick={() => { setManualAdded(true); setMedSearch(""); }}>Tacrolimus (Prograf) — 0.5 / 1 / 5 mg</button>
                    <button onClick={() => { setManualAdded(true); setMedSearch(""); }}>Tadalafil — 5 / 10 / 20 mg</button>
                  </div>
                )}
                {manualAdded && <div className="ob-added">✓ Tacrolimus 1 mg, twice daily — added. Manually entered meds skip the review queue.</div>}
              </div>
            )}

            {filesAdded && (
              <div className="ob-files">
                <FileRow name="After-Visit Summary 3-2026.pdf" status="Done" />
                <FileRow name="Transplant Clinic Note 4-2024.pdf" status="Done" />
                <FileRow name="MyChart_Export.zip · 2 PDFs inside" status="Done" />
                <div className="ob-found">Found: <b>5 medications</b> · <b>1 allergy</b> · 3 conditions · 27 labs · 2 procedures · 3 immunizations · 2 care team</div>
              </div>
            )}

            <div className="ob-actions">
              <button className="btn btn-ghost" onClick={() => setManualOpen(true)}>Skip for now</button>
              <button className="btn btn-primary" disabled={!filesAdded && !manualAdded} onClick={() => setScreen("review")}>
                {filesAdded ? "Review what we found" : "I've added everything"}
              </button>
            </div>
            <button className="ob-skip-all" onClick={() => setScreen("done")}>Skip everything for now</button>
          </Card>
        )}

        {screen === "review" && (
          <Card wide>
            <StepLabel n={4} back={() => setScreen("add")} />
            <h2 className="ob-h2">We found information in your documents</h2>
            <p className="ob-sub">Nothing enters your record until you confirm it. Medications, allergies, and conditions are confirmed one at a time — for your safety.</p>

            <div className="ob-cats">
              {CATEGORIES.map((c) => {
                const done = (c.id === "meds" && acceptedMeds > 0 && Object.keys(medState).length === 5) || (c.id === "allergies" && allergyDone) || (c.id === "labs" && labsBulk);
                return (
                  <div key={c.id} className="ob-cat">
                    <div className="ob-cat-main">
                      <span className="ob-cat-count">{c.count}</span>
                      <span className="ob-cat-tx">
                        <b>{c.label}</b>
                        {c.badge && <small>{c.badge}</small>}
                        <small className={c.perItem ? "warnc" : "okc"}>{c.perItem ? "One-at-a-time confirmation" : "Bulk accept available"}</small>
                      </span>
                    </div>
                    {done ? (
                      <span className="ob-cat-done">✓ Reviewed</span>
                    ) : c.id === "meds" ? (
                      <button className="btn btn-small" onClick={() => setScreen("meds")}>Review</button>
                    ) : c.id === "allergies" ? (
                      <button className="btn btn-small" onClick={() => setScreen("allergies")}>Review</button>
                    ) : c.id === "labs" ? (
                      <button className="btn btn-small btn-tint" onClick={() => setLabsBulk(true)}>Accept all 25 high-confidence labs</button>
                    ) : (
                      <button className="btn btn-small btn-tint">Accept all {c.count}</button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="ob-actions">
              <button className="btn btn-primary" disabled={!artifact} onClick={() => setScreen("done")}>
                {artifact ? "See your first result" : `Confirm medications & allergies to unlock your ${G.artifact}`}
              </button>
            </div>
          </Card>
        )}

        {screen === "meds" && (
          <Card wide>
            <StepLabel n={4} back={() => setScreen("review")} />
            <div className="ob-review-head">
              <h2 className="ob-h2">Review medications <span className="ob-count">({STAGED_MEDS.length} found)</span></h2>
              <span className="ob-safety">Confirmed one at a time — no bulk accept for medications.</span>
            </div>

            <div className="ob-split">
              <div className="ob-medlist">
                {STAGED_MEDS.map((m) => {
                  const st = medState[m.id];
                  return (
                    <div key={m.id} className={`ob-med ${st || ""} ${focusMed === m.id ? "focus" : ""}`} onClick={() => setFocusMed(m.id)}>
                      <div className="ob-med-top">
                        <b>{m.name}</b>
                        {m.conf === "high" && <span className="chip chip-high">High confidence</span>}
                        {m.conf === "review" && <span className="chip chip-warn">Needs review</span>}
                        {m.conf === "dupe" && <span className="chip chip-dupe">Possible duplicate</span>}
                      </div>
                      <div className="ob-med-detail">{m.detail}</div>
                      {m.stale && (
                        <div className="ob-stale">⚠ From a document dated Apr 2024 — confirm this is still current. <b>Status defaulted to Historical.</b></div>
                      )}
                      {st === "accepted" ? (
                        <div className="ob-med-done">✓ Added to your record</div>
                      ) : st === "rejected" ? (
                        <div className="ob-med-rej">✕ Rejected — recoverable for 30 days</div>
                      ) : st === "deferred" ? (
                        <div className="ob-med-def">? Saved to review later</div>
                      ) : (
                        <div className="ob-med-acts">
                          <button className="btn btn-small" onClick={(e) => { e.stopPropagation(); setMed(m.id, "accepted"); }}>Accept</button>
                          <button className="btn btn-small btn-ghost" onClick={(e) => e.stopPropagation()}>Edit</button>
                          {m.conf === "dupe" && <button className="btn btn-small btn-ghost" onClick={(e) => e.stopPropagation()}>Compare</button>}
                          <button className="btn btn-small btn-ghost" onClick={(e) => { e.stopPropagation(); setMed(m.id, "rejected"); }}>Reject</button>
                          <button className="btn btn-small btn-ghost" onClick={(e) => { e.stopPropagation(); setMed(m.id, "deferred"); }}>Not sure</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="ob-source">
                <div className="ob-source-head">SOURCE DOCUMENT</div>
                {(() => {
                  const s = SOURCES[STAGED_MEDS.find((m) => m.id === focusMed).src];
                  return (
                    <>
                      <div className="ob-source-title">{s.title}</div>
                      <div className="ob-source-meta">{s.date} · {s.page}</div>
                      {s.stale && <div className="chip chip-warn" style={{ marginTop: 6, display: "inline-block" }}>Older document</div>}
                      <div className="ob-doc">
                        <div className="ob-doc-line w80" /><div className="ob-doc-line w60" />
                        <div className="ob-doc-line hl" /><div className="ob-doc-line w70" />
                        <div className="ob-doc-line w50" /><div className="ob-doc-line w75" />
                      </div>
                      <button className="btn btn-small btn-ghost" style={{ width: "100%" }}>Open full document</button>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="ob-actions">
              <span className="ob-hint">{acceptedMeds} of {STAGED_MEDS.length} confirmed</span>
              <button className="btn btn-primary" disabled={Object.keys(medState).length < STAGED_MEDS.length} onClick={() => setScreen("allergies")}>Next: Allergies →</button>
            </div>
          </Card>
        )}

        {screen === "allergies" && (
          <Card>
            <StepLabel n={4} back={() => setScreen("meds")} />
            <h2 className="ob-h2">Review allergies <span className="ob-count">(1 found)</span></h2>
            <p className="ob-sub">Allergies drive the safety checks in your reports, so each one is confirmed individually.</p>

            {!allergyDone ? (
              <div className="ob-med focus">
                <div className="ob-med-top"><b>{STAGED_ALLERGY.name}</b><span className="chip chip-high">High confidence</span></div>
                <div className="ob-med-detail">Reaction: {STAGED_ALLERGY.reaction} · Source: After-Visit Summary, Mar 2026</div>
                <div className="ob-med-acts">
                  <button className="btn btn-small" onClick={finishAllergies}>Accept</button>
                  <button className="btn btn-small btn-ghost">Edit</button>
                  <button className="btn btn-small btn-ghost">Reject</button>
                </div>
              </div>
            ) : (
              <div className="ob-med accepted"><div className="ob-med-top"><b>Penicillin</b></div><div className="ob-med-done">✓ Added to your record</div></div>
            )}

            <p className="ob-nkda">If no allergies had been found, you'd confirm that explicitly — "I have no known allergies" is recorded as a statement, never assumed from silence.</p>

            <div className="ob-actions">
              <button className="btn btn-primary" disabled={!allergyDone} onClick={() => setScreen("done")}>Continue</button>
            </div>
          </Card>
        )}

        {screen === "done" && (
          <Card>
            <div className="ob-confetti">🎉</div>
            <h1 className="ob-h1" style={{ textAlign: "center" }}>{artifact ? "You're all set!" : "You're in — let's build as you go"}</h1>
            <p className="ob-lede" style={{ textAlign: "center" }}>
              {artifact ? `We've created your record and generated your first report.` : `Your ${G.artifact} needs a few details first: your transplant basics, at least one medication, and your allergies (or "none").`}
            </p>

            {artifact && (
              <div className="ob-artifact">
                <div className="ob-artifact-head"><img src={LOGO} alt="" style={{ height: 16, display: "block" }} /> <span>Emergency Card</span></div>
                <div className="ob-artifact-grid">
                  <div><small>PATIENT</small><b>{tier0.name}</b></div>
                  <div><small>TRANSPLANT</small><b>{tier0.organ} · Aug 2023</b></div>
                  <div><small>MEDICATIONS</small><b>{acceptedMeds + (manualAdded ? 1 : 0)} confirmed</b></div>
                  <div><small>ALLERGIES</small><b>Penicillin (rash)</b></div>
                  <div><small>COORDINATOR</small><b>{tier0.coordName} · {tier0.coordPhone}</b></div>
                  <div><small>CENTER</small><b>{tier0.center}</b></div>
                </div>
              </div>
            )}

            {artifact && !labsBulk && <p className="ob-pending">27 lab results are still waiting for your review — they'll improve your trends. <u>Review later</u></p>}

            <div className="ob-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              {artifact && <button className="btn btn-primary">View my report</button>}
              {artifact && <button className="btn btn-ghost">Download PDF</button>}
              {artifact && <button className="btn btn-ghost">Print</button>}
              <button className="btn btn-ghost" onClick={() => { setScreen("welcome"); setConsent(false); setGoal(null); setFilesAdded(false); setManualOpen(false); setManualAdded(false); setMedState({}); setAllergyDone(false); setLabsBulk(false); setArtifact(false); setFocusMed(1); }}>
                Restart demo
              </button>
            </div>

            <p className="ob-disclaimer" style={{ textAlign: "center" }}>Insina organizes your health information and helps you prepare questions for your care team. It does not diagnose, treat, or provide medical advice. For urgent symptoms, contact your transplant team or call 911.</p>
          </Card>
        )}
      </main>

      {/* Privacy footer — §9.1, every screen */}
      <footer className="ob-foot">
        <span className="ob-lock">🔒</span>
        <span><b>Your data. Your control.</b> Your records are stored on your device or in your own Google Drive — never on Insina servers. When you use AI features like document reading or analysis, only the information needed for that request is sent securely to our AI processor to generate your result; it isn't stored there.</span>
      </footer>

      {/* Early-artifact toast — §6 / C5 */}
      {toast && (
        <div className="ob-toast">
          <span><span className="okc">✓</span>&nbsp; Your Emergency Card is ready</span>
          <button onClick={() => { setToast(false); setScreen("done"); }}>View</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Small components ─────────────────────────── */

function Rail({ current }) {
  return (
    <div className="rail">
      {RAIL.map((label, i) => (
        <div key={label} className="rail-step">
          <div className={`rail-node ${i < current ? "done" : i === current ? "cur" : ""}`}>{i < current ? "✓" : i + 1}</div>
          <div className={`rail-label ${i === current ? "cur" : ""}`}>{label}</div>
          {i < RAIL.length - 1 && <div className={`rail-line ${i < current ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

function Card({ children, wide }) {
  return <section className={`ob-card ${wide ? "wide" : ""}`}>{children}</section>;
}

function StepLabel({ n, back }) {
  return (
    <div className="ob-steplabel">
      {back ? <button className="ob-back" onClick={back}>‹ Back</button> : <span />}
      <span>STEP {n} OF 5</span>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`ob-field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Tile({ icon, title, sub, onClick, active }) {
  return (
    <button className={`ob-tile ${active ? "sel" : ""}`} onClick={onClick}>
      <span className="ob-tile-ic">{icon}</span>
      <b>{title}</b>
      <small>{sub}</small>
    </button>
  );
}

function FileRow({ name, status }) {
  return (
    <div className="ob-filerow">
      <span>▤ {name}</span>
      <span className="okc">✓ {status}</span>
    </div>
  );
}

/* ────────────────────────────────── CSS ────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');

:root {
  --bg-base:#07090f; --bg-panel:#080c14; --bg-card:#0b1220;
  --border:#0d1a28; --border-2:#111e30; --border-active:#1a2f4a;
  --tx-1:#dde8f5; --tx-2:#c4d8ee; --tx-3:#7eb8d8; --tx-dim:#3d5a7a; --tx-ghost:#2d4d6a; --tx-faint:#1e3550;
  --accent:#4f8ef7; --accent-2:#a78bfa; --ok:#10b981; --warn:#f59e0b; --danger:#ef4444;
}
* { box-sizing:border-box; margin:0; padding:0; }
::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1a2840; border-radius:4px; }
.ob-root { min-height:100vh; background:var(--bg-base); color:var(--tx-2); font-family:'Sora',sans-serif; display:flex; flex-direction:column; }
@keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:none;} }
@media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
button:focus-visible, input:focus-visible, select:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
input, select { color-scheme: dark; }

.ob-head { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:18px 28px; flex-wrap:wrap; border-bottom:1px solid var(--border); background:var(--bg-panel); }
.ob-logo { height:32px; display:block; }

.rail { display:flex; align-items:flex-start; }
.rail-step { display:flex; align-items:center; position:relative; }
.rail-node { width:30px; height:30px; border-radius:50%; border:2px solid var(--border-active); background:var(--bg-card); color:var(--tx-dim); font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; z-index:1; }
.rail-node.cur { border-color:var(--accent); color:var(--tx-3); box-shadow:0 0 0 4px rgba(79,142,247,.15), 0 0 12px rgba(79,142,247,.25); }
.rail-node.done { background:var(--accent); border-color:var(--accent); color:#fff; }
.rail-label { font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:.8px; text-transform:uppercase; color:var(--tx-ghost); position:absolute; top:34px; left:50%; transform:translateX(-50%); white-space:nowrap; }
.rail-label.cur { color:var(--tx-3); }
.rail-line { width:52px; height:2px; background:var(--border-active); margin:0 2px; }
.rail-line.done { background:var(--accent); }
.rail-step:last-child .rail-line { display:none; }

.ob-main { flex:1; display:flex; justify-content:center; padding:34px 20px 20px; }
.ob-card { background:var(--bg-card); border:1px solid var(--border-2); border-radius:14px; padding:30px 32px; width:100%; max-width:560px; animation:fadeUp .35s ease both; height:fit-content; position:relative; overflow:hidden; }
.ob-card::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,.015) 0%, transparent 60%); pointer-events:none; }
.ob-card.wide { max-width:780px; }

.ob-eyebrow { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:2px; color:var(--tx-dim); margin-bottom:10px; }
.ob-h1 { font-family:'DM Serif Display',serif; font-size:30px; font-weight:400; color:var(--tx-1); letter-spacing:-.4px; margin-bottom:8px; }
.ob-h2 { font-family:'DM Serif Display',serif; font-size:23px; font-weight:400; color:var(--tx-1); margin-bottom:6px; }
.ob-lede { font-size:14px; line-height:1.6; color:var(--tx-2); }
.ob-sub { font-size:13px; color:var(--tx-dim); margin-bottom:18px; line-height:1.55; }
.ob-count { font-family:'DM Mono',monospace; font-size:13px; color:var(--tx-dim); }

.ob-consent { background:var(--bg-panel); border:1px solid var(--border-2); border-radius:10px; padding:14px 16px; font-size:12.5px; line-height:1.6; margin:16px 0 14px; color:var(--tx-3); }
.ob-consent b { color:var(--tx-2); }
.ob-check { display:flex; align-items:center; gap:10px; font-size:14px; color:var(--tx-1); cursor:pointer; min-height:44px; }
.ob-check input { width:18px; height:18px; accent-color:var(--accent); }
.ob-disclaimer { font-size:11.5px; color:var(--tx-dim); line-height:1.55; margin-top:14px; }

.ob-steplabel { display:flex; justify-content:space-between; align-items:center; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:1.5px; color:var(--tx-dim); margin-bottom:14px; }
.ob-back { background:none; border:none; color:var(--tx-3); font-family:'Sora',sans-serif; font-size:13px; cursor:pointer; padding:6px 8px 6px 0; }
.ob-back:hover { color:var(--tx-2); }

.btn { min-height:44px; padding:10px 22px; border-radius:10px; font-family:'Sora',sans-serif; font-size:14px; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .15s; }
.btn:disabled { opacity:.4; cursor:not-allowed; }
.btn-primary { background:var(--accent); color:#fff; }
.btn-primary:hover:not(:disabled) { background:#6ba0f8; box-shadow:0 0 14px rgba(79,142,247,.35); }
.btn-ghost { background:transparent; border-color:var(--border-active); color:var(--tx-3); }
.btn-ghost:hover { border-color:rgba(79,142,247,.5); color:#b8d4f0; }
.btn-small { min-height:36px; padding:6px 14px; font-size:12.5px; background:var(--accent); color:#fff; }
.btn-small.btn-ghost { background:transparent; color:var(--tx-3); }
.btn-tint { background:linear-gradient(135deg, rgba(79,142,247,.15), rgba(167,139,250,.1)); border:1px solid rgba(79,142,247,.3); color:var(--tx-3); }
.btn-tint:hover { background:linear-gradient(135deg, rgba(79,142,247,.25), rgba(167,139,250,.18)); border-color:rgba(79,142,247,.5); color:#b8d4f0; }
.ob-actions { display:flex; justify-content:flex-end; align-items:center; gap:12px; margin-top:22px; }
.ob-hint { font-size:12px; color:var(--tx-dim); margin-right:auto; }
.ob-skip-all { display:block; margin:14px auto 0; background:none; border:none; color:var(--tx-dim); font-size:12px; text-decoration:underline; cursor:pointer; padding:8px; }
.ob-skip-all:hover { color:var(--tx-3); }

.ob-goals { display:flex; flex-direction:column; gap:9px; }
.ob-goal { display:flex; align-items:center; gap:13px; text-align:left; background:var(--bg-card); border:1.5px solid var(--border-2); border-radius:12px; padding:13px 15px; cursor:pointer; font-family:'Sora',sans-serif; min-height:44px; transition:all .15s; }
.ob-goal:hover { border-color:rgba(79,142,247,.5); }
.ob-goal.sel { border-color:var(--accent); background:rgba(79,142,247,.08); }
.ob-goal-ic { font-size:19px; color:var(--accent); width:24px; text-align:center; }
.ob-goal-tx { flex:1; display:flex; flex-direction:column; gap:2px; }
.ob-goal-tx span { font-size:14px; font-weight:500; color:var(--tx-2); }
.ob-goal-tx small { font-size:11px; color:var(--tx-dim); }
.ob-goal-check { color:var(--accent); font-weight:700; }

.ob-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.ob-field { display:flex; flex-direction:column; gap:6px; }
.ob-field.full { grid-column:1 / -1; }
.ob-field > span { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:var(--tx-dim); }
.inp { min-height:44px; padding:10px 13px; border:1.5px solid var(--border-2); border-radius:10px; font-family:'Sora',sans-serif; font-size:14px; color:var(--tx-1); background:var(--bg-panel); width:100%; }
.inp:hover { border-color:var(--border-active); }
.inp::placeholder { color:var(--tx-ghost); }

.ob-tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; }
.ob-tile { display:flex; flex-direction:column; align-items:flex-start; gap:6px; text-align:left; background:var(--bg-card); border:1.5px solid var(--border-2); border-radius:12px; padding:15px; cursor:pointer; font-family:'Sora',sans-serif; transition:all .15s; }
.ob-tile:hover { border-color:rgba(79,142,247,.5); }
.ob-tile.sel { border-color:var(--accent); background:rgba(79,142,247,.08); }
.ob-tile-ic { font-size:20px; color:var(--accent); }
.ob-tile b { font-size:13.5px; color:var(--tx-2); }
.ob-tile small { font-size:11px; color:var(--tx-dim); line-height:1.45; }

.ob-manual { margin-top:16px; background:var(--bg-panel); border:1px solid var(--border-2); border-radius:12px; padding:14px 16px; }
.ob-manual-label { font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:1.5px; color:var(--tx-dim); margin-bottom:8px; }
.ob-suggest { border:1px solid var(--border-active); border-radius:10px; margin-top:6px; overflow:hidden; background:var(--bg-card); }
.ob-suggest button { display:block; width:100%; text-align:left; padding:11px 14px; background:none; border:none; border-bottom:1px solid var(--border-2); font-family:'Sora',sans-serif; font-size:13px; color:var(--tx-2); cursor:pointer; min-height:44px; }
.ob-suggest button:last-child { border-bottom:none; }
.ob-suggest button:hover { background:rgba(79,142,247,.08); }
.ob-added { margin-top:8px; font-size:12.5px; color:var(--ok); }

.ob-files { margin-top:16px; display:flex; flex-direction:column; gap:7px; }
.ob-filerow { display:flex; justify-content:space-between; background:var(--bg-panel); border:1px solid var(--border-2); border-radius:10px; padding:10px 14px; font-size:12.5px; color:var(--tx-3); }
.okc { color:var(--ok); font-weight:600; font-size:11.5px; }
.warnc { color:var(--warn); font-weight:600; font-size:11.5px; }
.ob-found { font-size:12.5px; color:var(--tx-2); padding:8px 2px 0; }
.ob-found b { color:var(--tx-1); }

.ob-cats { display:flex; flex-direction:column; gap:9px; }
.ob-cat { display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid var(--border-2); border-radius:12px; padding:12px 15px; background:var(--bg-card); }
.ob-cat-main { display:flex; align-items:center; gap:13px; }
.ob-cat-count { font-family:'DM Mono',monospace; font-size:17px; font-weight:500; color:var(--accent); min-width:30px; text-align:center; }
.ob-cat-tx { display:flex; flex-direction:column; gap:1px; }
.ob-cat-tx b { font-size:13.5px; color:var(--tx-1); }
.ob-cat-tx small { font-size:10.5px; color:var(--tx-dim); }
.ob-cat-done { color:var(--ok); font-size:12.5px; font-weight:600; }

.ob-review-head { display:flex; justify-content:space-between; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:14px; }
.ob-safety { font-size:11px; color:var(--warn); font-weight:600; }
.ob-split { display:grid; grid-template-columns:1fr 215px; gap:16px; }
@media (max-width:640px) { .ob-split { grid-template-columns:1fr; } .ob-grid2 { grid-template-columns:1fr; } }

.ob-medlist { display:flex; flex-direction:column; gap:9px; }
.ob-med { border:1.5px solid var(--border-2); border-radius:12px; padding:12px 14px; cursor:pointer; transition:all .15s; background:var(--bg-card); }
.ob-med.focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,.12); }
.ob-med.accepted { background:rgba(16,185,129,.06); border-color:rgba(16,185,129,.35); }
.ob-med.rejected { opacity:.55; }
.ob-med-top { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
.ob-med-top b { font-size:14px; color:var(--tx-1); }
.ob-med-detail { font-family:'DM Mono',monospace; font-size:11px; color:var(--tx-dim); margin-top:3px; }
.ob-stale { margin-top:7px; font-size:11.5px; color:var(--warn); background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.3); border-radius:8px; padding:7px 10px; line-height:1.5; }
.ob-stale b { color:var(--warn); }
.ob-med-acts { display:flex; gap:7px; margin-top:10px; flex-wrap:wrap; }
.ob-med-done { margin-top:9px; color:var(--ok); font-size:12.5px; font-weight:600; }
.ob-med-rej { margin-top:9px; color:var(--danger); font-size:12px; }
.ob-med-def { margin-top:9px; color:var(--tx-dim); font-size:12px; }

.chip { font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:.5px; padding:3px 8px; border-radius:20px; }
.chip-high { background:rgba(79,142,247,.12); color:var(--tx-3); }
.chip-warn { background:rgba(245,158,11,.12); color:var(--warn); }
.chip-dupe { background:var(--border-2); color:var(--tx-3); border:1px solid var(--border-active); }

.ob-source { border:1px solid var(--border-2); border-radius:12px; padding:14px; height:fit-content; background:var(--bg-panel); }
.ob-source-head { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:1.5px; color:var(--tx-faint); margin-bottom:8px; }
.ob-source-title { font-size:13px; font-weight:600; color:var(--tx-1); }
.ob-source-meta { font-family:'DM Mono',monospace; font-size:10.5px; color:var(--tx-dim); margin-top:2px; }
.ob-doc { background:var(--bg-card); border:1px solid var(--border-2); border-radius:8px; padding:12px; margin:12px 0; display:flex; flex-direction:column; gap:7px; }
.ob-doc-line { height:6px; border-radius:3px; background:#1a2840; }
.ob-doc-line.w80 { width:80%; } .ob-doc-line.w70 { width:70%; } .ob-doc-line.w60 { width:60%; } .ob-doc-line.w50 { width:50%; } .ob-doc-line.w75 { width:75%; }
.ob-doc-line.hl { background:var(--accent); opacity:.7; width:90%; box-shadow:0 0 8px rgba(79,142,247,.4); }

.ob-nkda { margin-top:14px; font-size:12px; color:var(--tx-dim); background:var(--bg-panel); border:1px solid var(--border-2); border-radius:10px; padding:10px 13px; line-height:1.55; }

.ob-confetti { text-align:center; font-size:34px; margin-bottom:6px; }
.ob-artifact { border:1.5px solid var(--accent); border-radius:14px; overflow:hidden; margin:18px 0 6px; box-shadow:0 0 24px rgba(79,142,247,.15); background:var(--bg-card); }
.ob-artifact-head { background:linear-gradient(135deg,#4f8ef7,#a78bfa); color:#fff; padding:10px 16px; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px; }
.ob-artifact-grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; padding:16px; }
.ob-artifact-grid small { display:block; font-family:'DM Mono',monospace; font-size:9px; letter-spacing:1.2px; color:var(--tx-dim); margin-bottom:2px; }
.ob-artifact-grid b { font-size:13px; color:var(--tx-1); }
.ob-pending { font-size:12px; color:var(--tx-dim); text-align:center; margin-top:12px; }

.ob-foot { display:flex; gap:10px; align-items:flex-start; max-width:820px; margin:10px auto 26px; padding:12px 18px; background:var(--bg-card); border:1px solid var(--border-2); border-radius:12px; font-size:11px; line-height:1.55; color:var(--tx-dim); }
.ob-foot b { color:var(--tx-3); }
.ob-lock { font-size:14px; }

.ob-toast { position:fixed; bottom:26px; left:50%; transform:translateX(-50%); background:var(--bg-card); color:var(--tx-1); border:1px solid var(--border-active); border-radius:12px; padding:12px 18px; display:flex; align-items:center; gap:16px; font-size:13.5px; box-shadow:0 8px 28px rgba(0,0,0,.55), 0 0 18px rgba(79,142,247,.12); animation:fadeUp .3s ease both; z-index:50; }
.ob-toast button { background:var(--accent); border:none; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:12.5px; padding:7px 14px; border-radius:8px; cursor:pointer; }
`;
