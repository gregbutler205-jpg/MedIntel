// ── ID / insurance card storage + image helpers ─────────────────────────────
// Cards are stored under mi_cards, so they ride the existing Drive sync and
// appear on both the web app and the companion. Each card:
//   { id, label, front, back }  where front/back are compressed JPEG data URLs.

const KEY = "mi_cards";

export function getCards() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

/** Save cards. Throws on quota overflow so callers can warn the user. */
export function setCards(cards) {
  localStorage.setItem(KEY, JSON.stringify(cards));
}

export function blankCard() {
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: "", front: "", back: "" };
}

/**
 * Read an image File, downscale it, and return a compressed JPEG data URL.
 * Keeps insurance cards legible while staying small enough for localStorage/Drive.
 */
export function compressImage(file, maxDim = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) { reject(new Error("Not an image")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const longest = Math.max(width, height);
      if (longest > maxDim) {
        const scale = maxDim / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

/**
 * Share an image data URL via the native share sheet when available (phones),
 * otherwise fall back to downloading the file. Returns "shared" | "downloaded" |
 * "cancelled".
 */
export async function shareImageDataUrl(dataUrl, filename = "card.jpg", title = "Card") {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return "shared";
    }
  } catch (e) {
    if (e?.name === "AbortError") return "cancelled";
  }
  // Fallback: download
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return "downloaded";
}
