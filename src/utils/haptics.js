// ─── haptics.js ───────────────────────────────────────────────────────────────
// Thin wrapper over the Vibration API. Silently does nothing on devices/
// browsers that don't support it (desktop, iOS Safari, etc.), so it's always
// safe to call.

function vibrate(pattern) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // no-op — haptics are a nice-to-have, never worth throwing over
  }
}

const haptics = {
  light:     () => vibrate(8),
  medium:    () => vibrate(18),
  selection: () => vibrate(5),
  success:   () => vibrate([10, 40, 10]),
  warning:   () => vibrate([15, 30, 15, 30]),
};

export default haptics;
