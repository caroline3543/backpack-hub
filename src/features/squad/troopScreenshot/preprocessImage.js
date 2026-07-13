// ─── preprocessImage.js ───────────────────────────────────────────────────────
// Loads the uploaded image onto a canvas, downsizing if it's very large
// (keeps OCR fast and Tesseract happy without hurting digit/comma
// legibility), and exposes a same-coordinate-space pixel sampler so header
// tab-selection detection can read background colour at a word's position.
//
// Blur detection is NOT implemented (would need a real sharpness metric,
// e.g. Laplacian variance over pixel data) — flagged as a known limitation
// rather than faked. Only a minimum-dimension check is done.

const MAX_DIMENSION = 1600;
const MIN_DIMENSION = 200;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ img, url });
    img.onerror = () => reject(new Error("Couldn't load that image — it may be corrupted or an unsupported format."));
    img.src = url;
  });
}

/**
 * @param {File} file
 * @returns {Promise<{ canvas: HTMLCanvasElement, originalWidth: number, originalHeight: number, scale: number, sampleColor: Function, warnings: string[] }>}
 */
export async function preprocessImage(file) {
  const warnings = [];
  const { img, url } = await loadImageElement(file);

  try {
    const { width, height } = img;
    if (Math.min(width, height) < MIN_DIMENSION) {
      warnings.push("This image is very small, so troop numbers may not be readable. Try a higher-resolution screenshot.");
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const sampleColor = (x, y) => {
      try {
        const sx = Math.round(x), sy = Math.round(y);
        if (sx < 0 || sy < 0 || sx >= canvas.width || sy >= canvas.height) return null;
        const d = ctx.getImageData(sx, sy, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2] };
      } catch {
        return null;
      }
    };

    return {
      canvas,
      originalWidth: width,
      originalHeight: height,
      scale,
      sampleColor,
      warnings,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
