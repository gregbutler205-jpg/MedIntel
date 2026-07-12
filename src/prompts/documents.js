// ── S-07: prompt-injection defense at prompt-build time ──────────────────────
// Uploaded document text is untrusted input (CSC rule 9 handles the model
// side: treat it as content, never instructions). This is the app-side half:
// every document excerpt injected into a prompt goes through this module so
// it is delimited, stripped of control characters, and visibly marked when
// truncated — never concatenated into an instruction section unmarked.

// Strip C0/C1 control characters except \n and \t (which the model needs for
// readable document structure). This is a defense against control-character
// tricks (e.g. characters that could visually disguise injected text), not a
// content filter — it does not touch any printable character.
export function stripControlChars(text) {
  // eslint-disable-next-line no-control-regex
  return String(text || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Wrap one document excerpt in explicit delimiters with source and date.
 * Caps length; when capped, appends a visible [TRUNCATED] marker INSIDE the
 * block (per spec) so truncation is never silent to the model.
 */
export function formatDocumentBlock({ id, source = "", date = "", text = "", maxLength = 40000 }) {
  const clean = stripControlChars(text);
  const truncated = clean.length > maxLength;
  const body = truncated ? clean.slice(0, maxLength) : clean;
  return `[DOCUMENT id=${id || "unknown"} source=${source || "unknown"} date=${date || "unknown"}]
${body}${truncated ? "\n[TRUNCATED]" : ""}
[END DOCUMENT]`;
}
