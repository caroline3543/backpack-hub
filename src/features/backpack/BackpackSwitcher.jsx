// ─── BackpackSwitcher.jsx ──────────────────────────────────────────────────────
// Lets the user keep two separate backpacks (e.g. two accounts/alliances),
// each with its own name and accent color so they're easy to tell apart at
// a glance. Profile list + active selection persist in localStorage under
// their own keys — separate from the actual item/transaction data, which
// stays scoped by the profile's id (passed down as userId).

import { useState } from "react";

const PROFILES_KEY = "backpack-hub-profiles-v1";
const ACTIVE_KEY    = "backpack-hub-active-profile-v1";
const MAX_BACKPACKS = 2;

// First color matches the app's original default green, so an existing
// single-backpack user's data and look stay unchanged after this update.
export const PALETTE = [
  { name: "Sage",       color: "#78917f" },
  { name: "Dusty Blue", color: "#7690a8" },
  { name: "Terracotta", color: "#b8785a" },
  { name: "Plum",       color: "#8a6a96" },
  { name: "Mustard",    color: "#b89a4a" },
  { name: "Slate",      color: "#6f7a8a" },
];

const DEFAULT_PROFILE = { id: "local-user", name: "My Backpack", color: PALETTE[0].color };

export function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [DEFAULT_PROFILE];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_PROFILE];
  } catch { return [DEFAULT_PROFILE]; }
}

export function loadActiveId(profiles) {
  try {
    const saved = localStorage.getItem(ACTIVE_KEY);
    if (saved && profiles.some(p => p.id === saved)) return saved;
  } catch {}
  return profiles[0].id;
}

export function saveProfiles(profiles) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
}

export function saveActiveId(id) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

function ColorSwatchRow({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {PALETTE.map(p => (
        <button key={p.color} onClick={() => onChange(p.color)}
          aria-label={p.name}
          style={{
            width:30, height:30, borderRadius:"50%", cursor:"pointer",
            background:p.color,
            border: value === p.color ? "3px solid #24312c" : "1px solid rgba(0,0,0,0.1)",
            padding:0,
          }} />
      ))}
    </div>
  );
}

function ProfileForm({ initial, onSave, onCancel }) {
  const [name, setName]   = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || PALETTE[0].color);

  return (
    <div style={{
      background:"rgba(255,255,255,0.9)", borderRadius:16,
      border:"1px solid rgba(74,92,80,0.12)", padding:14, marginTop:8,
    }}>
      <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", display:"block", marginBottom:6 }}>
        Backpack Name
      </label>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder="e.g. Main Account"
        style={{
          width:"100%", background:"white", border:"1px solid #e3e8e2",
          borderRadius:12, padding:"10px 14px", fontSize:14, color:"var(--bp-text, #24312c)",
          outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
          marginBottom:12,
        }} />

      <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", display:"block", marginBottom:8 }}>
        Colour
      </label>
      <ColorSwatchRow value={color} onChange={setColor} />

      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={onCancel} style={{
          flex:1, height:38, borderRadius:10, fontSize:13, fontWeight:600,
          background:"rgba(255,255,255,0.8)", color:"var(--bp-muted2, #6f7a73)",
          border:"1px solid var(--bp-border2, rgba(72,94,80,0.14))", cursor:"pointer",
        }}>Cancel</button>
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), color })}
          disabled={!name.trim()}
          style={{
            flex:1, height:38, borderRadius:10, fontSize:13, fontWeight:700,
            background: name.trim() ? color : "rgba(72,94,80,0.2)",
            color:"white", border:"none",
            cursor: name.trim() ? "pointer" : "default",
          }}>Save</button>
      </div>
    </div>
  );
}

export default function BackpackSwitcher({ profiles, activeId, onSwitch, onUpdate, onCreate }) {
  const [editingId, setEditingId] = useState(null); // profile id being renamed/recolored
  const [creating,  setCreating]  = useState(false);

  const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];

  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {profiles.map(p => {
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => isActive ? setEditingId(editingId === p.id ? null : p.id) : onSwitch(p.id)}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"6px 12px 6px 8px", borderRadius:99,
                background: isActive ? p.color : "rgba(255,255,255,0.72)",
                color: isActive ? "white" : "var(--bp-muted2, #6f7a73)",
                border: isActive ? `1px solid ${p.color}` : "1px solid var(--bp-border2, rgba(72,94,80,0.14))",
                fontSize:12, fontWeight:700, cursor:"pointer",
              }}>
              <span style={{ width:10, height:10, borderRadius:"50%",
                background: isActive ? "white" : p.color, flexShrink:0 }} />
              {p.name}
              {isActive && <span style={{ fontSize:10, opacity:0.85 }}>✎</span>}
            </button>
          );
        })}
        {profiles.length < MAX_BACKPACKS && !creating && (
          <button onClick={() => setCreating(true)} style={{
            padding:"6px 12px", borderRadius:99, fontSize:12, fontWeight:700,
            background:"none", color:"var(--bp-accent, #78917f)",
            border:"1px dashed rgba(120,145,127,0.4)", cursor:"pointer",
          }}>
            + Add backpack
          </button>
        )}
      </div>

      {editingId && (
        <ProfileForm
          initial={profiles.find(p => p.id === editingId)}
          onCancel={() => setEditingId(null)}
          onSave={data => { onUpdate(editingId, data); setEditingId(null); }}
        />
      )}

      {creating && (
        <ProfileForm
          onCancel={() => setCreating(false)}
          onSave={data => { onCreate(data); setCreating(false); }}
        />
      )}
    </div>
  );
}
