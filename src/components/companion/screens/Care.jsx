// ── Care — upcoming appointments + the door into Doctor Visit Capture. ─────────
import { formatDateUS } from "../../../lib/displaySafe.js";
// The full searchable encounter history lives on the web; this is prep + capture.
import { C, mono, serif, Card, SL, Pill, Empty } from "../companionUI.jsx";
import { upcomingAppointments, relDate, fmtShort, daysUntil, careTeam } from "../../../lib/companionData.js";
import { directionsUrl } from "../../../lib/mapsLink.js";
import { getVisits } from "../../../lib/visitCapture.js";

export default function Care({ startVisit, openVisit }) {
  const appts = upcomingAppointments();
  const visits = getVisits();

  return (
    <div style={{ padding: "16px 16px 28px" }}>
      <div style={{ fontFamily: serif, fontSize: 22, color: C.p, marginBottom: 14 }}>Upcoming Care</div>

      {appts.length === 0 ? <Empty>No upcoming appointments.</Empty> : appts.map(a => {
        const d = daysUntil(a.date);
        const soon = d != null && d <= 3;
        // v1.58.2: a DIRECTIONS link to the appointment's location (address,
        // else the care-team member's address, else the facility), not a
        // search that lists places to pick from.
        const maps = directionsUrl(a, careTeam());
        return (
          <Card key={a.id} style={{ marginBottom: 12, border: `1px solid ${soon ? C.amber + "50" : C.b2}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.p, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: soon ? C.amber : C.s, fontFamily: mono, marginTop: 2 }}>
                  {relDate(a.date)}{a.time ? ` · ${a.time}` : ""} · {fmtShort(a.date)}
                </div>
              </div>
              {soon && <Pill color={C.amber}>SOON</Pill>}
            </div>
            {(a.provider || a.facility) && (
              <div style={{ fontSize: 11, color: C.dim, fontFamily: mono, marginBottom: 8 }}>{[a.provider, a.facility].filter(Boolean).join(" · ")}</div>
            )}
            {maps && (
              <button onClick={() => window.open(maps, "_blank")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(79,142,247,.1)", border: `1px solid rgba(79,142,247,.25)`, borderRadius: 8, padding: "8px 0", color: C.blue, fontSize: 11, fontFamily: mono, cursor: "pointer", marginBottom: 8 }}>
                📍 Directions
              </button>
            )}
            <button onClick={() => startVisit(a)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#4f8ef7", border: "none", borderRadius: 8, padding: "11px 0", color: "#fff", fontSize: 12, fontFamily: mono, fontWeight: 700, cursor: "pointer" }}>
              🎙️ Pre-Visit Brief & Capture
            </button>
          </Card>
        );
      })}

      {visits.length > 0 && (
        <>
          <div style={{ marginTop: 18 }}><SL>Captured Visits</SL></div>
          {visits.map(v => (
            <button key={v.id} onClick={() => openVisit(v.id)} style={{ width: "100%", textAlign: "left", background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>{v.apptTitle}</div>
                  <div style={{ fontSize: 10, color: C.ghost, fontFamily: mono, marginTop: 2 }}>{formatDateUS(v.date)}{v.provider ? ` · ${v.provider}` : ""}</div>
                </div>
                <Pill color={v.status === "summarized" ? C.green : C.amber}>{v.status === "summarized" ? "summary ready" : v.status}</Pill>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
