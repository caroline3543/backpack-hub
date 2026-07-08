// ─── PinIcon.jsx ──────────────────────────────────────────────────────────────
// Small SVG pin (map-marker style) — a real outline/filled pair, unlike the
// 📌 emoji glyph this replaces (which rendered inconsistently large across
// devices and couldn't be dimmed cleanly). Outline = unpinned/low emphasis,
// gold fill = pinned.

export default function PinIcon({ pinned, size = 15, animate = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        display:"block", flexShrink:0,
        transition:"transform 0.2s ease",
        animation: animate ? "pinPop 0.4s ease" : "none",
      }}
    >
      <path
        d="M12 3c-3.31 0-6 2.6-6 5.8 0 4.3 6 11.2 6 11.2s6-6.9 6-11.2C18 5.6 15.31 3 12 3z"
        fill={pinned ? "#c9962f" : "none"}
        stroke={pinned ? "#c9962f" : "#b8c0ba"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle
        cx="12" cy="8.6" r="2.1"
        fill={pinned ? "white" : "none"}
        stroke={pinned ? "none" : "#b8c0ba"}
        strokeWidth="1.4"
      />
    </svg>
  );
}
