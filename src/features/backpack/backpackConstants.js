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
  { id:"refined-fire",        name:"Refined Fire Crystals",  category:"General",      priority:"Urgent", defaultUnit:null },

  // Resources
  { id:"meat",            name:"Meat",                   category:"Resources",    priority:"Medium", defaultUnit:"B" },
  { id:"wood",            name:"Wood",                   category:"Resources",    priority:"Medium", defaultUnit:"B" },
  { id:"coal",            name:"Coal",                   category:"Resources",    priority:"Medium", defaultUnit:"M" },
  { id:"iron",            name:"Iron",                   category:"Resources",    priority:"Medium", defaultUnit:"M" },
  { id:"steel",           name:"Steel",                  category:"Resources",    priority:"High",   defaultUnit:"M" },

  // Power Boost
  { id:"general-shards",  name:"General Hero Shards",    category:"Power Boost",  priority:"High",   defaultUnit:null },
  { id:"essence-stones",  name:"Essence Stones",         category:"Power Boost",  priority:"High",   defaultUnit:null },
  { id:"mithril",         name:"Mithril",                category:"Power Boost",  priority:"Urgent", defaultUnit:null },

  // Widgets — hero/gear widgets tracked by upgrade level (see currentLevel,
  // WIDGET_GOAL_LEVELS, WIDGET_LEVEL_TARGETS above). currentLevel starts
  // null until the user is asked which level they're on.
  // The Chest is the exception: it's a flexible allocation pool, not tied
  // to one hero's gear, so trackLevel:false keeps it behaving like a plain
  // item (normal amount goal, no level prompt, no Lv. badge).
  { id:"hector-widget",     name:"Hector Widget",              category:"Widgets", priority:"High",   defaultUnit:null, currentLevel:null },
  { id:"norah-widget",      name:"Norah Widget",              category:"Widgets", priority:"High",   defaultUnit:null, currentLevel:null },
  { id:"gwen-widget",       name:"Gwen Widget",                category:"Widgets", priority:"High",   defaultUnit:null, currentLevel:null },
  { id:"gen5-widget-chest", name:"Generation 5 Widget Chest",  category:"Widgets", priority:"Medium", defaultUnit:null, trackLevel:false },

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

  // Affinity gifts — raise an Expert's Relationship Level. Compass = 10
  // affinity, Fiery Heart = 100 affinity, Sail of Conquest = 1000 affinity.
  { id:"compass",         name:"Compass",                category:"Dawn Experts", priority:"Medium", defaultUnit:null },
  { id:"fiery-heart",     name:"Fiery Heart",            category:"Dawn Experts", priority:"Medium", defaultUnit:null },
  { id:"sail-of-conquest",name:"Sail of Conquest",       category:"Dawn Experts", priority:"Medium", defaultUnit:null },

  // The 10 named Experts themselves — tracked by Relationship Level
  // (0–100, in steps of 10), the same way Hero Gear Widgets are tracked by
  // upgrade level, since everyone's Experts sit at different levels.
  { id:"cyrille-expert",  name:"Cyrille",                category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"agnes-expert",    name:"Agnes",                  category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"holger-expert",   name:"Holger",                 category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"romulus-expert",  name:"Romulus",                category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"baldur-expert",   name:"Baldur",                 category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"fabian-expert",   name:"Fabian",                 category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"valeria-expert",  name:"Valeria",                category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"ronne-expert",    name:"Ronne",                  category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"kathy-expert",    name:"Kathy",                  category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },
  { id:"gareth-expert",   name:"Gareth",                 category:"Dawn Experts", priority:"High", defaultUnit:null, hasLevel:true, currentLevel:null },

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
// the user pick a goal level instead of typing a raw target amount.
// Cost to level up STACKS: reaching level N costs 5*N widgets on top of
// whatever it took to reach level N-1, so the total needed to reach a given
// level from scratch is the running sum, not just that level's own cost.
// e.g. level 1 = 5, level 2 = 5+10 = 15, level 3 = 5+10+15 = 30, etc.
export const WIDGET_LEVEL_STEP = 5; // cost of level N's own step = WIDGET_LEVEL_STEP * N
export const WIDGET_GOAL_LEVELS = [1,2,3,4,5,6,7,8,9,10];
export const WIDGET_CURRENT_LEVEL_OPTIONS = [0,1,2,3,4,5,6,7,8,9];

// Dawn Academy Experts level up via Relationship Level, 0–100 in steps of
// 10 — a different scale from Hero Gear Widgets (0–10), so their level
// picker uses the real in-game numbers instead of the widget scale.
export const EXPERT_LEVEL_OPTIONS = [0,10,20,30,40,50,60,70,80,90,100];

// Whether an item should be asked about / show a level (Lv. badge, "what
// level are you on" prompt) at all. True Hero Gear Widgets are level-
// tracked by default unless explicitly opted out (see the Chest, which
// sets trackLevel:false). Anything outside the Widgets category — like
// Dawn Experts — only gets level-tracking if it explicitly opts in via
// hasLevel:true, since most non-Widget items have no notion of "level".
export function itemHasLevel(item) {
  if (!item) return false;
  if (item.category === "Widgets") return item.trackLevel !== false;
  return !!item.hasLevel;
}

// Which level scale to show in the picker for a given item.
export function levelOptionsFor(item) {
  return item?.category === "Dawn Experts" ? EXPERT_LEVEL_OPTIONS : WIDGET_CURRENT_LEVEL_OPTIONS;
}

export function widgetLevelCumulativeTarget(level) {
  // Sum of WIDGET_LEVEL_STEP*1 + WIDGET_LEVEL_STEP*2 + ... + WIDGET_LEVEL_STEP*level
  return WIDGET_LEVEL_STEP * level * (level + 1) / 2;
}

// Precomputed lookup, 0 (start) through 10.
export const WIDGET_LEVEL_TARGETS = Object.fromEntries(
  [0, ...WIDGET_GOAL_LEVELS].map(lvl => [lvl, widgetLevelCumulativeTarget(lvl)])
);


// Transaction types
export const TRANSACTION_TYPES = [
  { value:"gain",              label:"Gain",              color:"#5c7a6e", bg:"#edf4ea" },
  { value:"spend",             label:"Spend",             color:"#9a7746", bg:"#f7edd9" },
  { value:"goal_contribution", label:"Goal Contribution",  color:"#5c7a6e", bg:"#edf2ec" },
];

// ─── Legendary Hero Gear Mithril empowerment ──────────────────────────────────
// Empowerment milestones unlock at gear levels 20/40/60/80/100. Each
// milestone costs Mithril + Mythic Gear on top of whatever was spent to
// reach the last one. Costs confirmed against in-game sources: 150 Mithril
// total to fully empower one Legendary gear piece (10+20+30+40+50).
export const MITHRIL_MILESTONES = [20, 40, 60, 80, 100];

export const MITHRIL_MILESTONE_COST = {
  20:  { mithril: 10, mythicGear: 3 },
  40:  { mithril: 20, mythicGear: 5 },
  60:  { mithril: 30, mythicGear: 5 },
  80:  { mithril: 40, mythicGear: 10 },
  100: { mithril: 50, mythicGear: 10 },
};

// Cumulative Mithril / Mythic Gear needed from level 0 up through each milestone.
export const MITHRIL_CUMULATIVE = (() => {
  let mithril = 0, mythicGear = 0;
  const out = { 0: { mithril: 0, mythicGear: 0 } };
  MITHRIL_MILESTONES.forEach(lvl => {
    mithril += MITHRIL_MILESTONE_COST[lvl].mithril;
    mythicGear += MITHRIL_MILESTONE_COST[lvl].mythicGear;
    out[lvl] = { mithril, mythicGear };
  });
  return out;
})();

// Mithril + Mythic Gear needed to go from one milestone level to another
// (e.g. from 40 to 100). Returns 0s if toLevel isn't after fromLevel.
export function mithrilNeededBetween(fromLevel, toLevel) {
  const from = MITHRIL_CUMULATIVE[fromLevel] || MITHRIL_CUMULATIVE[0];
  const to   = MITHRIL_CUMULATIVE[toLevel]   || MITHRIL_CUMULATIVE[0];
  return {
    mithril:    Math.max(0, to.mithril    - from.mithril),
    mythicGear: Math.max(0, to.mythicGear - from.mythicGear),
  };
}
