// ─── PinIcon.jsx ──────────────────────────────────────────────────────────────
// Emoji-based pin glyph. There's no outline/filled pair for 📌 the way there
// is for ♡/♥, so "unpinned" is represented with reduced opacity + grayscale
// (low visual emphasis) and "pinned" is the full-color glyph at full scale.

export default function PinIcon({ pinned, size = 15, animate = false }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display:"inline-block", fontSize:size, lineHeight:1,
        filter: pinned ? "none" : "grayscale(1)",
        opacity: pinned ? 1 : 0.4,
        transform: pinned ? "scale(1) rotate(0deg)" : "scale(0.88)",
        transition:"opacity 0.2s ease, transform 0.2s ease",
        animation: animate ? "pinPop 0.4s ease" : "none",
      }}
    >
      📌
    </span>
  );
}
