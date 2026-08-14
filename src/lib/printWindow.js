// ── CSP-safe print-window wiring (v1.49.1) ───────────────────────────────────
// Every report opens as window.open("") + document.write(html). That popup
// inherits the APP's Content-Security-Policy (S-03: script-src 'self', no
// 'unsafe-inline') — so an inline <script>window.onload…print()</script> or an
// onclick="window.print()" inside the generated HTML is silently blocked in
// production. (It worked in `npm run dev` only because vite.config strips the
// CSP meta in dev — which is why this never showed in dev verification.)
//
// The fix: the OPENER wires the popup. Same-origin scripts running under
// 'self' may freely drive the child DOM — attach the click handler, fire the
// auto-print, set the title. Generated pages must contain NO inline scripts
// or handlers; Tab02's profile print already used this pattern (its
// opener-side setTimeout(win.print) kept working), this module standardizes
// it for every other report.
//
// Also improves Save-as-PDF: the document title becomes the browser's
// suggested PDF filename, auto-print waits for images (logo) so the PDF
// isn't missing them, and every report gets a visible Print / Save-as-PDF
// button — a cancelled dialog no longer strands the report with no way to
// reopen it.

/**
 * Wire a just-written popup: title, a working print button (injected when the
 * page doesn't ship one), and an auto-print that waits for content + images.
 * Call immediately after win.document.close(). Safe no-op if the popup was
 * blocked or already closed.
 */
export function wirePrintWindow(win, { autoPrint = true, title = "" } = {}) {
  if (!win) return;

  const firePrint = () => { try { win.focus(); win.print(); } catch { /* window closed */ } };

  const setup = () => {
    try {
      if (title) win.document.title = title;
      let btns = [...win.document.querySelectorAll(".printbtn,[data-print]")];
      if (btns.length === 0) {
        const style = win.document.createElement("style");
        style.textContent =
          ".insina-printbtn{position:fixed;top:14px;right:14px;padding:9px 22px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:9999}" +
          "@media print{.insina-printbtn{display:none}}";
        win.document.head.appendChild(style);
        const b = win.document.createElement("button");
        b.className = "insina-printbtn";
        b.textContent = "🖨 Print / Save as PDF";
        win.document.body.appendChild(b);
        btns = [b];
      }
      btns.forEach(b => b.addEventListener("click", firePrint));
    } catch { /* closed mid-setup — nothing to wire */ }
  };

  // document.write + close: readyState turns "complete" once subresources
  // settle. Poll (the child's load event isn't reliably observable from the
  // opener after document.write) and require images complete so the printed
  // PDF includes the logo; give up waiting after ~6s and print anyway.
  const ready = () => {
    try {
      return win.document.readyState === "complete" &&
        [...win.document.images].every(img => img.complete);
    } catch { return true; }
  };
  let tries = 0;
  (function tick() {
    if (win.closed) return;
    if (ready() || ++tries > 60) {
      setup();
      if (autoPrint) setTimeout(firePrint, 80);
    } else {
      setTimeout(tick, 100);
    }
  })();
}
