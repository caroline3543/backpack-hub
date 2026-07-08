// ─── backpackConstants.js ─────────────────────────────────────────────────────
// All predefined items, categories, priority config for the Backpack feature.
// IDs and English names below are the canonical/stored values — the UI never
// shows these directly. Components translate them for display via the
// tItem() / tCategory() / tPriority() helpers from useI18n().

export const CATEGORIES = [
  "General",
  "Resources",
  "Power Boost",
  "Shops",
  "Widgets",
  "Speedups",
  "Chief Charms",
  "Chief Gear",
  "Dawn Experts",
  "Pets",
];

export const PRIORITY_CONFIG = {
  Low:    { background: "#edf4ea", color: "#67806c" },
  Medium: { background: "#f7edd9", color: "#9a7746" },
  High:   { background: "#f5e3df", color: "#a06358" },
  Urgent: { background: "#eadede", color: "#8f4f4f" },
};

export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

// Display units for Resources category
export const RESOURCE_UNITS = ["K", "M", "B"];

// Unit multipliers
export const UNIT_MULTIPLIER = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };

// Format a raw number to display string using preferred unit
export function formatAmount(raw, unit = null) {
  if (raw === null || raw === undefined || raw === "") return "0";
  const n = Number(raw);
  if (unit === "B") return `${(n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}B`;
  if (unit === "M") return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (unit === "K") return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}K`;
  return n.toLocaleString();
}

// Format speedup minutes to readable string
export function formatMinutes(mins) {
  const m = Number(mins);
  if (!m) return "0m";
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mn = m % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (mn > 0 || parts.length === 0) parts.push(`${mn}m`);
  return parts.join(" ");
}

// Suggested display unit for a raw number
export function suggestUnit(n) {
  if (n >= 1_000_000_000) return "B";
  if (n >= 1_000_000)     return "M";
  if (n >= 1_000)         return "K";
  return null;
}

// ─── Predefined items ─────────────────────────────────────────────────────────
// id must be stable — used as foreign key in transactions, and as the
// translation key under items.<id> in each locale file.
export const PREDEFINED_ITEMS = [
  // General
  { id:"gems",                name:"Gems",                  category:"General",      priority:"High",   defaultUnit:null },
  { id:"stamina-cans",        name:"Stamina Cans",           category:"General",      priority:"Medium", defaultUnit:null },
  { id:"fire-crystals",       name:"Fire Crystals",          category:"General",      priority:"High",   defaultUnit:null },
  { id:"fire-crystal-shards", name:"Fire Crystal Shards",    category:"General",      priority:"Medium", defaultUnit:null },

  // Resources
  { id:"meat",            name:"Meat",                   category:"Resources",    priority:"Medium", defaultUnit:"B" },
  { id:"wood",            name:"Wood",                   category:"Resources",    priority:"Medium", defaultUnit:"B" },
  { id:"coal",            name:"Coal",                   category:"Resources",    priority:"Medium", defaultUnit:"M" },
  { id:"iron",            name:"Iron",                   category:"Resources",    priority:"Medium", defaultUnit:"M" },
  { id:"steel",           name:"Steel",                  category:"Resources",    priority:"High",   defaultUnit:"M" },

  // Power Boost
  { id:"general-shards",  name:"General Hero Shards",    category:"Power Boost",  priority:"High",   defaultUnit:null },
  { id:"refined-fire",    name:"Refined Fire Crystals",  category:"Power Boost",  priority:"Urgent", defaultUnit:null },
  { id:"essence-stones",  name:"Essence Stones",         category:"Power Boost",  priority:"High",   defaultUnit:null },
  { id:"mithril",         name:"Mithril",                category:"Power Boost",  priority:"Urgent", defaultUnit:null },

  // Speedups (stored in minutes)
  { id:"speedup-general",    name:"General Speed Ups",        category:"Speedups",     priority:"High",   defaultUnit:null, isMinutes:true },
  { id:"speedup-troop",      name:"Troop Training Speed Ups",  category:"Speedups",     priority:"High",   defaultUnit:null, isMinutes:true },
  { id:"speedup-construction", name:"Construction Speedups",   category:"Speedups",     priority:"Medium", defaultUnit:null, isMinutes:true },
  { id:"speedup-research",   name:"Research Speedups",         category:"Speedups",     priority:"Medium", defaultUnit:null, isMinutes:true },
  { id:"speedup-learning",   name:"Learning Speedups",         category:"Speedups",     priority:"Low",    defaultUnit:null, isMinutes:true },
  { id:"speedup-healing",    name:"Healing Speedups",          category:"Speedups",     priority:"High",   defaultUnit:null, isMinutes:true },

  // Shops
  { id:"mystery-badges",  name:"Mystery Badges",         category:"Shops",        priority:"Medium", defaultUnit:null },
  { id:"arena-tokens",    name:"Arena Tokens",           category:"Shops",        priority:"Medium", defaultUnit:null },
  { id:"skin-tokens",     name:"Skin Tokens",            category:"Shops",        priority:"Low",    defaultUnit:null },

  // Chief Charms
  { id:"charm-designs",   name:"Charm Designs",          category:"Chief Charms", priority:"Medium", defaultUnit:null },
  { id:"charm-guides",    name:"Charm Guides",           category:"Chief Charms", priority:"Medium", defaultUnit:null },
  { id:"jewel-secrets",   name:"Jewel Secrets",          category:"Chief Charms", priority:"Low",    defaultUnit:null },

  // Chief Gear
  { id:"design-plans",    name:"Design Plans",           category:"Chief Gear",   priority:"High",   defaultUnit:null },
  { id:"polishing-sol",   name:"Polishing Solution",     category:"Chief Gear",   priority:"Medium", defaultUnit:null },
  { id:"hardened-alloy",  name:"Hardened Alloy",         category:"Chief Gear",   priority:"High",   defaultUnit:null },
  { id:"lunar-amber",     name:"Lunar Amber",            category:"Chief Gear",   priority:"Urgent", defaultUnit:null },

  // Dawn Experts
  { id:"expert-sigils",   name:"Expert Sigils",          category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"books-knowledge", name:"Books of Knowledge",     category:"Dawn Experts", priority:"Medium", defaultUnit:null },

  // Pets
  { id:"custom-chest",    name:"Custom Chest",           category:"Pets",         priority:"Medium", defaultUnit:null },
  { id:"taming-manual",   name:"Taming Manual",          category:"Pets",         priority:"Medium", defaultUnit:null },
  { id:"energising-pot",  name:"Energising Potion",      category:"Pets",         priority:"Low",    defaultUnit:null },
  { id:"strength-serum",  name:"Strengthening Serum",    category:"Pets",         priority:"Low",    defaultUnit:null },
  { id:"common-wild",     name:"Common Wild Marks",      category:"Pets",         priority:"Low",    defaultUnit:null },
  { id:"advanced-wild",   name:"Advanced Wild Marks",    category:"Pets",         priority:"High",   defaultUnit:null },
  { id:"pet-food",        name:"Pet Food",               category:"Pets",         priority:"Medium", defaultUnit:null },
];

export const SECTION_CHIPS = ["Items", "Goals", "History", "Insights"];

// Exclusive Hero Gear widget levels — Widgets-category items use this to let
// the user pick a level instead of typing a raw target amount.
export const WIDGET_LEVEL_TARGETS = {
  1: 5,  2: 10, 3: 15, 4: 20, 5: 25,
  6: 30, 7: 35, 8: 40, 9: 45, 10: 50,
};
export const WIDGET_LEVELS = Object.keys(WIDGET_LEVEL_TARGETS).map(Number);


// Transaction types
export const TRANSACTION_TYPES = [
  { value:"gain",              label:"Gain",              color:"#5c7a6e", bg:"#edf4ea" },
  { value:"spend",             label:"Spend",             color:"#9a7746", bg:"#f7edd9" },
  { value:"goal_contribution", label:"Goal Contribution",  color:"#5c7a6e", bg:"#edf2ec" },
];
