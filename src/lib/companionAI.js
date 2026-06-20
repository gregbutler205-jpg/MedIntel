// ─────────────────────────────────────────────────────────────────────────────
// companionAI.js — All companion AI runs through the SAME proxy the web app uses
// (VITE_PROXY_URL /api/chat). No client API key on the phone. Cheap model by
// default; escalate to a stronger one only for long/complex work.
// ─────────────────────────────────────────────────────────────────────────────

import { profile, activeConditions, activeMeds, readings } from "./companionData.js";

const PROXY_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";

export const MODEL_LITE   = "claude-haiku-4-5";   // quick on-the-go answers, short work
export const MODEL_STRONG = "claude-sonnet-4-6";  // long visit transcripts / complex analysis

/** Record-grounded system prompt shared by AI Lite, Quick Log, pattern flags. */
export function buildRecordSystem(extra = "") {
  const p = profile();
  const conds = activeConditions().map(c => c.name).join(", ") || "None on file";
  const ms = activeMeds().map(m => `${m.name}${m.dose ? " " + m.dose : ""}`).join(", ") || "None on file";
  const vitals = readings().slice(0, 3)
    .map(r => [r.date, r.bp_s && r.bp_d ? `BP ${r.bp_s}/${r.bp_d}` : null, r.weight ? `${r.weight} lb` : null, r.spo2 ? `SpO₂ ${r.spo2}%` : null].filter(Boolean).join(" · "))
    .join("; ") || "None recorded";
  return `You are Insina, a personal health assistant for ${p.name || "the patient"} on their mobile companion app. Be concise — short paragraphs and bullets, mobile-sized answers. Informational only, never medical advice.

Active Conditions: ${conds}
Current Medications: ${ms}
Recent Vitals: ${vitals}

Always advise consulting their physician for clinical decisions. In an emergency, tell them to call 911 immediately.${extra ? "\n\n" + extra : ""}`;
}

const toApiMsgs = (messages) => messages.map(m => ({
  role: m.role === "user" ? "user" : "assistant",
  content: m.content ?? m.text ?? "",
}));

/**
 * Streaming chat (SSE passthrough from the proxy). Calls onDelta(textChunk) as
 * tokens arrive. Returns the full accumulated text. Reuses Tab11's proxy pattern.
 */
export async function askInsinaStream({ system, messages, model = MODEL_LITE, max_tokens = 512, onDelta, signal }) {
  const res = await fetch(`${PROXY_URL}/api/chat`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens, stream: true, system, messages: toApiMsgs(messages) }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || e?.error || `Error ${res.status}`); }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", accum = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6).trim();
      if (d === "[DONE]") continue;
      try {
        const p = JSON.parse(d);
        if (p.type === "content_block_delta" && p.delta?.type === "text_delta") {
          accum += p.delta.text;
          onDelta?.(p.delta.text, accum);
        }
      } catch { /* ignore keep-alives / partial frames */ }
    }
  }
  return accum;
}

/** Non-streaming single-shot. Returns the assistant text. */
export async function askInsina({ system, messages, model = MODEL_LITE, max_tokens = 1024 }) {
  const res = await fetch(`${PROXY_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens, stream: false, system, messages: toApiMsgs(messages) }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || e?.error || `Error ${res.status}`); }
  const json = await res.json();
  return json.content?.map(b => b.text).filter(Boolean).join("") || "";
}

/** Ask for JSON and parse it tolerantly (strips code fences / prose around it). */
export async function askInsinaJSON({ system, messages, model = MODEL_LITE, max_tokens = 1024 }) {
  const text = await askInsina({ system, messages, model, max_tokens });
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return JSON.");
  return JSON.parse(match[0]);
}
