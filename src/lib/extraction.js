// ── Extraction interface (ONBOARDING_SPEC v1.1 §4.1–§4.3, work order) ────────
// SINGLE entry point for every onboarding extraction. Two implementations
// behind one interface: `fixture` (the spec's demo dataset — default until
// the proxy work order ships) and `live` (Render proxy /extract). Selected
// by VITE_EXTRACTION_MODE. The §3.0 consent gate is enforced HERE, at the
// choke point: no extraction of any kind runs while consents.ai_processing
// is not true — fixture mode included, so the gate is testable end-to-end.

import { extractionAllowed } from "./onboardingState.js";
import { buildFixtureResult } from "./fixtureExtraction.js";
import { getPilotToken } from "./pilotAuth.js";

const PROXY_URL = import.meta.env?.VITE_PROXY_URL || "http://localhost:3001";
export const EXTRACTION_MODE = import.meta.env?.VITE_EXTRACTION_MODE === "live" ? "live" : "fixture";

export const PAGES_PER_CALL = 15; // §4.2: batch ≤15 pages per model call, merge client-side

export class ExtractionConsentError extends Error {
  constructor() { super("AI processing consent has not been granted — extraction is blocked."); this.name = "ExtractionConsentError"; }
}

function assertConsent() {
  if (!extractionAllowed()) throw new ExtractionConsentError();
}

function authHeaders() {
  const token = getPilotToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Merge multiple §4.1 results for one logical document (page batching). */
export function mergeExtractionResults(results, sourceName) {
  const docs = results.flatMap(r => r?.documents || []);
  if (docs.length === 0) return { documents: [] };
  return {
    documents: [{
      source_name: sourceName || docs[0].source_name || "Document",
      doc_date: docs.map(d => d.doc_date).find(Boolean) || null,
      doc_date_confidence: docs.map(d => d.doc_date_confidence).find(c => c != null) ?? null,
      items: docs.flatMap(d => d.items || []),
    }],
  };
}

async function proxyExtract(body) {
  const res = await fetch(`${PROXY_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Extraction failed (${res.status}).`);
  return res.json();
}

/**
 * Text-path extraction (§4.2): pdf.js page texts or portal paste.
 * @param {object} opts
 * @param {string} opts.sourceName - e.g. the file name, or "Pasted from portal"
 * @param {string[]} opts.pageTexts - one string per page (paste = single "page")
 * @returns {Promise<object>} §4.1 result
 */
export async function extractText({ sourceName, pageTexts }) {
  assertConsent();
  if (EXTRACTION_MODE === "fixture") return buildFixtureResult();
  const batches = [];
  for (let i = 0; i < pageTexts.length; i += PAGES_PER_CALL) {
    batches.push(pageTexts.slice(i, i + PAGES_PER_CALL));
  }
  const results = [];
  for (const [bi, batch] of batches.entries()) {
    results.push(await proxyExtract({
      mode: "text",
      source_name: sourceName,
      pages: batch,
      page_offset: bi * PAGES_PER_CALL,
    }));
  }
  return mergeExtractionResults(results, sourceName);
}

/**
 * Vision-path extraction (§4.3): photos or scanned-PDF page renders.
 * @param {object} opts
 * @param {string} opts.sourceName
 * @param {string[]} opts.images - data URLs, already downscaled (≤6 per doc)
 * @param {string} [opts.docTypeHint]
 * @returns {Promise<object>} §4.1 result
 */
export async function extractVision({ sourceName, images, docTypeHint }) {
  assertConsent();
  if (EXTRACTION_MODE === "fixture") return buildFixtureResult();
  return proxyExtract({
    mode: "vision",
    source_name: sourceName,
    doc_type_hint: docTypeHint || null,
    images: images.map(dataUrl => {
      const [meta, data] = dataUrl.split(",");
      return { media_type: /data:([^;]+)/.exec(meta)?.[1] || "image/jpeg", data };
    }),
  });
}
