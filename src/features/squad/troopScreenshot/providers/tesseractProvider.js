// ─── tesseractProvider.js ─────────────────────────────────────────────────────
// The only file in this module that knows Tesseract.js exists. Everything
// downstream (association, label parsing, validation) works on a plain
// { text, confidence, bbox:{x0,y0,x1,y1} } word shape, so swapping providers
// later means writing one new file here, not touching the pipeline.
//
// Loaded lazily from a CDN — fetched only the first time a screenshot is
// actually uploaded, so nobody pays for it just by opening the app. Runs
// entirely in the browser: the image never leaves the device.

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let loadPromise = null;

function loadTesseract() {
  if (typeof window !== "undefined" && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR library loaded but Tesseract was not found on window.")));
    script.onerror = () => reject(new Error("Couldn't load the OCR library — check your connection, or enter troop numbers manually."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ words: Array<{text:string, confidence:number, bbox:{x0:number,y0:number,x1:number,y1:number}}>, rawText: string }>}
 */
export async function recognizeCanvas(canvas) {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(canvas, "eng");
  const words = (data.words || []).filter(w => w.text && w.text.trim());
  return { words, rawText: data.text || "" };
}
