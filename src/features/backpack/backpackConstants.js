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
  { id:"gen5-chest",          name:"Generation 5 Chest",     category:"General",      priority:"Medium", defaultUnit:null },

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
  // Sigils are expert-specific in-game, not a shared pool — one tracked
  // item per Expert, named to match (e.g. "Cyrille Sigils").
  { id:"cyrille-sigils",  name:"Cyrille Sigils",         category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"agnes-sigils",    name:"Agnes Sigils",           category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"holger-sigils",   name:"Holger Sigils",          category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"romulus-sigils",  name:"Romulus Sigils",         category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"baldur-sigils",   name:"Baldur Sigils",          category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"fabian-sigils",   name:"Fabian Sigils",          category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"valeria-sigils",  name:"Valeria Sigils",         category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"ronne-sigils",    name:"Ronne Sigils",           category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"kathy-sigils",    name:"Kathy Sigils",           category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"gareth-sigils",   name:"Gareth Sigils",          category:"Dawn Experts", priority:"High",   defaultUnit:null },
  { id:"books-knowledge", name:"Books of Knowledge",     category:"Dawn Experts", priority:"Medium", defaultUnit:null },

  // Affinity gifts — raise an Expert's Relationship Level. Compass = 10
  // affinity, Fiery Heart = 100 affinity, Sail of Conquest = 1000 affinity.
  { id:"compass",         name:"Compass",                category:"Dawn Experts", priority:"Medium", defaultUnit:null },
  { id:"fiery-heart",     name:"Fiery Heart",            category:"Dawn Experts", priority:"Medium", defaultUnit:null },
  { id:"sail-of-conquest",name:"Sail of Conquest",       category:"Dawn Experts", priority:"Medium", defaultUnit:null },

  // XP totals — trackable so the "Update Goal" buttons in the Experts
  // calculator can save the XP side of a plan alongside Sigils/Books.
  { id:"gift-xp",         name:"Gift XP",                category:"Dawn Experts", priority:"Medium", defaultUnit:"K", autoTracked:true },
  { id:"skill-xp",        name:"Skill XP",               category:"Dawn Experts", priority:"Medium", defaultUnit:"K" },

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

// ─── Dawn Expert Relationship Advancement data ────────────────────────────────
// Real per-tier costs, keyed by expert id — as supplied from in-game data,
// not estimated. Only experts with data supplied appear here; the Experts
// calculator shows a plain "no data yet" message for the rest until their
// numbers are added in the same shape.
// Each row's giftXP/sigil is the cost to ADVANCE INTO that tier (not
// cumulative) — matching the numbers tracked in-game exactly.
export const EXPERT_ADVANCEMENT = {
  "cyrille-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,  defenseBonus:"—",      benefits:"Hunter's Heart Lv.1" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:2260,  sigil:5,  defenseBonus:"+0.60%", benefits:"Talent Unlocked (Hunter's Heart Lv.1)" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:4300,  sigil:10, defenseBonus:"+1.20%", benefits:"Hunter's Heart Lv.2" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:6310,  sigil:15, defenseBonus:"+1.80%", benefits:"Hunter's Heart Lv.3 + Entrapment Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:8960,  sigil:20, defenseBonus:"+2.40%", benefits:"Hunter's Heart Lv.4 + Scavenging Lv.5 + Weapon Master Lv.1" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:12610, sigil:25, defenseBonus:"+3.00%", benefits:"Hunter's Heart Lv.5 + Entrapment Lv.1 + Weapon Master Lv.3" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:17250, sigil:30, defenseBonus:"+3.60%", benefits:"Hunter's Heart Lv.6 + Scavenging Lv.8" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:22250, sigil:35, defenseBonus:"+4.20%", benefits:"Hunter's Heart Lv.7" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:27250, sigil:40, defenseBonus:"+4.80%", benefits:"Hunter's Heart Lv.8 + Scavenging Lv.10" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:32250, sigil:45, defenseBonus:"+5.40%", benefits:"Hunter's Heart Lv.9 + Weapon Master Lv.5" },
    { level:100, tier:"Stranger (final)", range:"91-100", giftXP:37250, sigil:50, defenseBonus:"+6.00%", benefits:"Hunter's Heart Lv.10" },
  ],
  "agnes-expert": [
    { level:0,   tier:"Unlock",           range:"0",      giftXP:1000,  sigil:0,  defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",         range:"1-10",   giftXP:2750,  sigil:5,  defenseBonus:"+0.60%", benefits:"Earthbreaker Lv.1 (Talent unlocked)" },
    { level:20,  tier:"Acquaintance 1",   range:"11-20",  giftXP:5200,  sigil:10, defenseBonus:"+1.20%", benefits:"Earthbreaker Lv.2 + Efficient Recon Lv.1" },
    { level:30,  tier:"Acquaintance 2",   range:"21-30",  giftXP:7610,  sigil:15, defenseBonus:"+1.80%", benefits:"Earthbreaker Lv.3 + Optimization Lv.1" },
    { level:40,  tier:"Acquaintance 3",   range:"31-40",  giftXP:10800, sigil:20, defenseBonus:"+2.40%", benefits:"Earthbreaker Lv.4 + Project Manager Lv.1 + Covert Knowledge Lv.3" },
    { level:50,  tier:"Casual 1",         range:"41-50",  giftXP:15170, sigil:25, defenseBonus:"+3.00%", benefits:"Earthbreaker Lv.5 + Efficient Recon Lv.1 + Covert Knowledge Lv.3" },
    { level:60,  tier:"Casual 2",         range:"51-60",  giftXP:20700, sigil:30, defenseBonus:"+3.60%", benefits:"Earthbreaker Lv.6 + Efficient Recon Lv.5" },
    { level:70,  tier:"Casual 3",         range:"61-70",  giftXP:26700, sigil:35, defenseBonus:"+4.20%", benefits:"Earthbreaker Lv.7 + Optimization Lv.5" },
    { level:80,  tier:"Close 1",          range:"71-80",  giftXP:32700, sigil:40, defenseBonus:"+4.80%", benefits:"Earthbreaker Lv.8" },
    { level:90,  tier:"Close 2",          range:"81-90",  giftXP:38700, sigil:45, defenseBonus:"+5.40%", benefits:"Earthbreaker Lv.9" },
    { level:100, tier:"Stranger (final)", range:"91-100", giftXP:44700, sigil:50, defenseBonus:"+6.00%", benefits:"Earthbreaker Lv.10" },
  ],
  "romulus-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,   defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:11400, sigil:20,  defenseBonus:"+0.80%", benefits:"Talent Unlocked (Commander's Crest Lv.1)" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:23650, sigil:40,  defenseBonus:"+1.60%", benefits:"Commander's Crest Lv.2 + Call of War Lv.1" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:34710, sigil:80,  defenseBonus:"+2.40%", benefits:"Commander's Crest Lv.3 + Last Line Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:49280, sigil:120, defenseBonus:"+3.20%", benefits:"Commander's Crest Lv.4 + Call of War Lv.1 + Spirit of Aeetes Lv.5 + One Heart Lv.6" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:69360, sigil:160, defenseBonus:"+4.00%", benefits:"Commander's Crest Lv.5 + Call of War Lv.1" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:94900, sigil:200, defenseBonus:"+4.80%", benefits:"Commander's Crest Lv.6 + Last Line Lv.8 + One Heart Lv.11" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:122440,sigil:240, defenseBonus:"+5.60%", benefits:"Commander's Crest Lv.7" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:149900,sigil:280, defenseBonus:"+6.40%", benefits:"Commander's Crest Lv.8 + Last Line Lv.16" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:177400,sigil:320, defenseBonus:"+7.20%", benefits:"Commander's Crest Lv.9 + Last Line Lv.20" },
    { level:100, tier:"Close 3",      range:"91-100", giftXP:205000,sigil:360, defenseBonus:"+8.00%", benefits:"Commander's Crest Lv.10" },
  ],
  "fabian-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,   defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:11300, sigil:12,  defenseBonus:"+0.60%", benefits:"Craftsman of War Lv.1" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:21500, sigil:24,  defenseBonus:"+1.20%", benefits:"Craftsman of War Lv.2 + Salvager Lv.1" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:31550, sigil:36,  defenseBonus:"+1.80%", benefits:"Craftsman of War Lv.3 + Crisis Rescue Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:44800, sigil:48,  defenseBonus:"+2.40%", benefits:"Craftsman of War Lv.4 + Heightened Firepower Lv.5 + Battle Bulwark Lv.1" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:63050, sigil:60,  defenseBonus:"+3.00%", benefits:"Craftsman of War Lv.5 + Salvager Lv.1 + Heightened Firepower Lv.5" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:86250, sigil:72,  defenseBonus:"+3.60%", benefits:"Craftsman of War Lv.6 + Crisis Rescue Lv.8" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:111250,sigil:84,  defenseBonus:"+4.20%", benefits:"Craftsman of War Lv.7 + Crisis Rescue Lv.8" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:136250,sigil:96,  defenseBonus:"+4.80%", benefits:"Craftsman of War Lv.8 + Heightened Firepower Lv.10" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:161250,sigil:108, defenseBonus:"+5.40%", benefits:"Craftsman of War Lv.9 + Heightened Firepower Lv.10" },
    { level:100, tier:"Close 3",      range:"91-100", giftXP:186250,sigil:120, defenseBonus:"+6.00%", benefits:"Craftsman of War Lv.10" },
  ],
  "valeria-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,   defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:20830, sigil:20,  defenseBonus:"+0.80%", benefits:"Conqueror's Spirit Lv.1" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:39600, sigil:40,  defenseBonus:"+1.60%", benefits:"Conqueror's Spirit Lv.2 + Well Prepared Lv.1" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:58090, sigil:60,  defenseBonus:"+2.40%", benefits:"Conqueror's Spirit Lv.3 + Radiant Honor Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:82470, sigil:80,  defenseBonus:"+3.20%", benefits:"Conqueror's Spirit Lv.4 + Battle Concerto Lv.5 + Crushing Force Lv.1" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:116050,sigil:100, defenseBonus:"+4.00%", benefits:"Conqueror's Spirit Lv.5 + Well Prepared Lv.1 + Battle Concerto Lv.5" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:158700,sigil:120, defenseBonus:"+4.80%", benefits:"Conqueror's Spirit Lv.6 + Radiant Honor Lv.8" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:204700,sigil:140, defenseBonus:"+5.60%", benefits:"Conqueror's Spirit Lv.7 + Radiant Honor Lv.8" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:250700,sigil:160, defenseBonus:"+6.40%", benefits:"Conqueror's Spirit Lv.8 + Battle Concerto Lv.10" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:296700,sigil:180, defenseBonus:"+7.20%", benefits:"Conqueror's Spirit Lv.9 + Battle Concerto Lv.10" },
    { level:100, tier:"Close 3",      range:"91-100", giftXP:342700,sigil:200, defenseBonus:"+8.00%", benefits:"Conqueror's Spirit Lv.10" },
  ],
  "holger-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,  defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:5780,  sigil:8,  defenseBonus:"+0.60%", benefits:"Talent Unlocked (Blade Dancing Lv.1)" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:12900, sigil:16, defenseBonus:"+1.20%", benefits:"Blade Dancing Lv.2 + Arena Elite Lv.1" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:18930, sigil:24, defenseBonus:"+1.80%", benefits:"Blade Dancing Lv.3 + Crowd Pleaser Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:26880, sigil:32, defenseBonus:"+2.40%", benefits:"Blade Dancing Lv.4 + Arena Elite Lv.1 + Arena Star Lv.5" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:37830, sigil:40, defenseBonus:"+3.00%", benefits:"Blade Dancing Lv.5 + Arena Elite Lv.1 + Arena Star Lv.5" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:51750, sigil:48, defenseBonus:"+3.60%", benefits:"Blade Dancing Lv.6 + Crowd Pleaser Lv.8" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:66750, sigil:56, defenseBonus:"+4.20%", benefits:"Blade Dancing Lv.7 + Crowd Pleaser Lv.8" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:81750, sigil:64, defenseBonus:"+4.80%", benefits:"Blade Dancing Lv.8 + Arena Star Lv.10" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:96750, sigil:72, defenseBonus:"+5.40%", benefits:"Blade Dancing Lv.9 + Arena Star Lv.10" },
    { level:100, tier:"Close 3",      range:"91-100", giftXP:111750,sigil:80, defenseBonus:"+6.00%", benefits:"Blade Dancing Lv.10" },
  ],
  "baldur-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,  defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:4520,  sigil:6,  defenseBonus:"+0.40%", benefits:"Master Negotiator Lv.1" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:8600,  sigil:12, defenseBonus:"+0.80%", benefits:"Master Negotiator Lv.2 + Blazing Sunrise Lv.1" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:12620, sigil:18, defenseBonus:"+1.20%", benefits:"Master Negotiator Lv.3 + Honored Conquest Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:17920, sigil:24, defenseBonus:"+1.60%", benefits:"Master Negotiator Lv.4 + Bounty Hunter Lv.1 + Dawn Hymn Lv.1" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:25220, sigil:30, defenseBonus:"+2.00%", benefits:"Master Negotiator Lv.5 + Blazing Sunrise Lv.1 + Dawn Hymn Lv.5" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:34500, sigil:36, defenseBonus:"+2.40%", benefits:"Master Negotiator Lv.6 + Honored Conquest Lv.8" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:44500, sigil:42, defenseBonus:"+2.80%", benefits:"Master Negotiator Lv.7 + Honored Conquest Lv.8" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:54500, sigil:48, defenseBonus:"+3.20%", benefits:"Master Negotiator Lv.8 + Dawn Hymn Lv.10" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:64500, sigil:54, defenseBonus:"+3.60%", benefits:"Master Negotiator Lv.9 + Dawn Hymn Lv.10" },
    { level:100, tier:"Close 3",      range:"91-100", giftXP:74500, sigil:60, defenseBonus:"+4.00%", benefits:"Master Negotiator Lv.10" },
  ],
  "ronne-expert": [
    { level:0,   tier:"Unlock",       range:"0",      giftXP:1000,  sigil:0,  defenseBonus:"—",      benefits:"—" },
    { level:10,  tier:"Stranger",     range:"1-10",   giftXP:6780,  sigil:8,  defenseBonus:"+0.60%", benefits:"Trade Dominion Lv.1" },
    { level:20,  tier:"Acquaintance 1", range:"11-20", giftXP:12900, sigil:16, defenseBonus:"+1.20%", benefits:"Trade Dominion Lv.2 + Cartographic Memory Lv.1" },
    { level:30,  tier:"Acquaintance 2", range:"21-30", giftXP:18930, sigil:24, defenseBonus:"+1.80%", benefits:"Trade Dominion Lv.3 + Treasure Sent Lv.1" },
    { level:40,  tier:"Acquaintance 3", range:"31-40", giftXP:26880, sigil:32, defenseBonus:"+2.40%", benefits:"Trade Dominion Lv.4 + Giving Back Lv.5 + Gold Class Lv.1" },
    { level:50,  tier:"Casual 1",     range:"41-50",  giftXP:37830, sigil:40, defenseBonus:"+3.00%", benefits:"Trade Dominion Lv.5 + Cartographic Memory Lv.6 + Treasure Sent Lv.1" },
    { level:60,  tier:"Casual 2",     range:"51-60",  giftXP:51750, sigil:48, defenseBonus:"+3.60%", benefits:"Trade Dominion Lv.6 + Treasure Sent Lv.8" },
    { level:70,  tier:"Casual 3",     range:"61-70",  giftXP:66750, sigil:56, defenseBonus:"+4.20%", benefits:"Trade Dominion Lv.7 + Treasure Sent Lv.8" },
    { level:80,  tier:"Close 1",      range:"71-80",  giftXP:81750, sigil:64, defenseBonus:"+4.80%", benefits:"Trade Dominion Lv.8 + Giving Back Lv.10" },
    { level:90,  tier:"Close 2",      range:"81-90",  giftXP:96750, sigil:72, defenseBonus:"+5.40%", benefits:"Trade Dominion Lv.9 + Giving Back Lv.10" },
    { level:100, tier:"Close 3",      range:"91-100", giftXP:111750,sigil:80, defenseBonus:"+6.00%", benefits:"Trade Dominion Lv.10" },
  ],
};

// Cumulative Gift XP / Sigils needed from level 0 up through each row.
export const EXPERT_CUMULATIVE = Object.fromEntries(
  Object.entries(EXPERT_ADVANCEMENT).map(([id, rows]) => {
    let giftXP = 0, sigil = 0;
    const out = {};
    rows.forEach(row => {
      giftXP += row.giftXP;
      sigil  += row.sigil;
      out[row.level] = { giftXP, sigil };
    });
    return [id, out];
  })
);

// Gift XP + Sigils needed to go from one relationship level to another
// (e.g. from 20 to 80). Returns null if this expert has no data yet.
export function expertNeededBetween(expertId, fromLevel, toLevel) {
  const cum = EXPERT_CUMULATIVE[expertId];
  if (!cum) return null;
  const from = cum[fromLevel] ?? { giftXP:0, sigil:0 };
  const to   = cum[toLevel]   ?? { giftXP:0, sigil:0 };
  return {
    giftXP: Math.max(0, to.giftXP - from.giftXP),
    sigil:  Math.max(0, to.sigil  - from.sigil),
  };
}

// Affinity gift items → Gift XP conversion (Compass/Fiery Heart/Sail of
// Conquest), for translating a Gift XP requirement into gift counts.
export const AFFINITY_GIFT_XP = {
  "compass": 10,
  "fiery-heart": 100,
  "sail-of-conquest": 1000,
};

// Resolve a Relationship Advancement tier name (e.g. "Acquaintance 1") to
// its numeric level for a given expert, using that expert's own table —
// tier names aren't at the same level for every expert.
export function tierLevelForName(expertId, tierName) {
  const rows = EXPERT_ADVANCEMENT[expertId];
  if (!rows || !tierName) return null;
  const row = rows.find(r => r.tier === tierName);
  return row ? row.level : null;
}

// Skill XP + Books of Knowledge needed to take one specific skill from one
// level to another (e.g. Baldur's "Dawn Hymn" from level 1 to level 4).
// Returns {xp:0, books:0} if the expert or skill has no data yet.
export function skillNeededBetween(expertId, skillName, fromLevel, toLevel) {
  const skill = EXPERT_SKILLS[expertId]?.skills.find(s => s.name === skillName);
  if (!skill) return { xp: 0, books: 0 };
  let xp = 0, books = 0;
  skill.levels.forEach(lv => {
    if (lv.level > fromLevel && lv.level <= toLevel) { xp += lv.xp; books += lv.books; }
  });
  return { xp, books };
}

// Skill cost tables — per-level XP + Books of Knowledge, exactly as
// tracked in-game. "requirement" is any extra gate beyond the relationship
// tier already implied by "unlock" (usually a Total Skill Level threshold).
export const EXPERT_SKILLS = {
  "cyrille-expert": {
    talent: {
      name: "Hunter's Heart",
      effect: "+2/4/6/9/12/15/18/21/24/27/30% of Bear Hunt Damage Points (self only).",
    },
    skills: [
      {
        name: "Entrapment",
        effect: "+30000/60000/90000/120000/180000/210000/240000/270000/300000 Bear Hunt Rally Capacity.",
        unlock: "Unlock Expert",
        levels: [
          { level:1, xp:3600,  books:70,  requirement:null },
          { level:2, xp:7200,  books:140, requirement:null },
          { level:3, xp:10800, books:210, requirement:"Acquaintance 3" },
          { level:4, xp:14400, books:280, requirement:null },
          { level:5, xp:18000, books:350, requirement:null },
          { level:6, xp:21600, books:420, requirement:"Casual 2" },
          { level:7, xp:25200, books:490, requirement:null },
          { level:8, xp:28800, books:560, requirement:null },
          { level:9, xp:32400, books:630, requirement:"Close 1" },
        ],
        totalXP: 162000, totalBooks: 3150,
      },
      {
        name: "Scavenging",
        effect: "+1/2/3/5 x100 Enhancement XP Component every Bear.",
        unlock: "Acquaintance 2",
        levels: [
          { level:1, xp:27600,  books:400,  requirement:null },
          { level:2, xp:55200,  books:800,  requirement:"Casual 1" },
          { level:3, xp:110400, books:1600, requirement:null },
          { level:4, xp:220800, books:3200, requirement:"Close 2" },
        ],
        totalXP: 414000, totalBooks: 6000,
      },
      {
        name: "Weapon Master",
        effect: "+1/2/3/5 Essence Stone(s) per Bear.",
        unlock: "Acquaintance 3",
        levels: [
          { level:1, xp:43200,  books:500,  requirement:null },
          { level:2, xp:86400,  books:1000, requirement:"Total Skills Lv.10" },
          { level:3, xp:172800, books:2000, requirement:null },
          { level:4, xp:345600, books:4000, requirement:"Total Skills Lv.15" },
        ],
        totalXP: 648000, totalBooks: 7500,
      },
      {
        name: "Ursa's Bane",
        effect: "+3000/6000/9000/12000/18000/21000/24000/27000/30000 Bear Hunt Deployment Capacity.",
        unlock: "Casual 1",
        levels: [
          { level:1, xp:10200, books:100, requirement:null },
          { level:2, xp:20400, books:200, requirement:null },
          { level:3, xp:30600, books:300, requirement:null },
          { level:4, xp:41400, books:400, requirement:"Total Skills Lv.18" },
          { level:5, xp:51600, books:500, requirement:null },
          { level:6, xp:61800, books:600, requirement:null },
          { level:7, xp:72600, books:700, requirement:"Total Skills Lv.24" },
          { level:8, xp:82800, books:800, requirement:null },
          { level:9, xp:93000, books:900, requirement:"Total Skills Lv.29" },
        ],
        totalXP: 464400, totalBooks: 4500,
      },
    ],
  },
  "agnes-expert": {
    talent: {
      name: "Earthbreaker",
      effect: "+1/2/3/4/5 Seeker Chest every 120m Gathering (max 10/12/14/16/18/20/22/24/26/28/30)",
    },
    skills: [
      {
        name: "Efficient Recon",
        effect: "+2/3/4/6/8 extra Intel Missions per day",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:43200,  books:500,  requirement:null },
          { level:2, xp:86400,  books:1000, requirement:"Acquaintance 3" },
          { level:3, xp:172800, books:2000, requirement:null },
          { level:4, xp:345600, books:4000, requirement:"Casual 2" },
        ],
        totalXP: 648000, totalBooks: 7500,
      },
      {
        name: "Optimization",
        effect: "+10/20/30/40/50 Storehouse Chief Stamina gain",
        unlock: "Acquaintance 2",
        levels: [
          { level:1, xp:34200,  books:400,  requirement:null },
          { level:2, xp:69000,  books:800,  requirement:"Casual 1" },
          { level:3, xp:138000, books:1600, requirement:null },
          { level:4, xp:276000, books:3200, requirement:"Casual 3" },
        ],
        totalXP: 517200, totalBooks: 6000,
      },
      {
        name: "Project Manager",
        effect: "-2/-3/-4/-6/-8h Construction Time for new buildings",
        unlock: "Acquaintance 3",
        levels: [
          { level:1, xp:13800,  books:200,  requirement:null },
          { level:2, xp:27600,  books:400,  requirement:"Total Skills Lv.8" },
          { level:3, xp:55200,  books:800,  requirement:null },
          { level:4, xp:110400, books:1600, requirement:"Total Skills Lv.12" },
        ],
        totalXP: 207000, totalBooks: 3000,
      },
      {
        name: "Covert Knowledge",
        effect: "+20/30/40/50/60/70/80/90/100/120 Mystery Badges from Dailies + 1/2/3/4 free Mystery Shop refresh",
        unlock: "Casual 1",
        levels: [
          { level:1, xp:10200, books:100, requirement:null },
          { level:2, xp:20400, books:200, requirement:null },
          { level:3, xp:30600, books:300, requirement:null },
          { level:4, xp:41400, books:400, requirement:"Total Skills Lv.15" },
          { level:5, xp:51600, books:500, requirement:null },
          { level:6, xp:61800, books:600, requirement:null },
          { level:7, xp:72600, books:700, requirement:"Total Skills Lv.20" },
          { level:8, xp:82800, books:800, requirement:null },
          { level:9, xp:93000, books:900, requirement:"Total Skills Lv.24" },
        ],
        totalXP: 464400, totalBooks: 4500,
      },
    ],
  },
  "romulus-expert": {
    talent: {
      name: "Commander's Crest",
      effect: "Increasing heroes' +300/600/1k/1.5k/2k/3k/4k/5.5k/7k/8.5k/10k Expedition Army size.",
    },
    skills: [
      {
        name: "Call of War",
        effect: "+150/200/250/300/350/400/450/500/600 bonus troops and +1/2/3/4/5/6/7/8/9/10 Loyalty Tag(s) from the Enlistment Office.",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:30600,  books:300,  requirement:null },
          { level:2, xp:61800,  books:600,  requirement:null },
          { level:3, xp:93000,  books:900,  requirement:null },
          { level:4, xp:124200, books:1200, requirement:"Acquaintance 3" },
          { level:5, xp:155400, books:1500, requirement:null },
          { level:6, xp:186600, books:1800, requirement:null },
          { level:7, xp:217200, books:2100, requirement:"Casual 2" },
          { level:8, xp:248400, books:2400, requirement:null },
          { level:9, xp:279600, books:2700, requirement:"Close 1" },
        ],
        totalXP: 1396800, totalBooks: 13500,
      },
      {
        name: "Last Line",
        effect: "+0.5% to +10% Troops' Attack and Defense (20 levels, 0.5% per level).",
        unlock: "Acquaintance 2",
        levels: [
          { level:1,  xp:86400,   books:500,   requirement:null },
          { level:2,  xp:172800,  books:1000,  requirement:null },
          { level:3,  xp:259200,  books:1500,  requirement:null },
          { level:4,  xp:345600,  books:2000,  requirement:null },
          { level:5,  xp:432000,  books:2500,  requirement:"Acquaintance 3" },
          { level:6,  xp:518400,  books:3000,  requirement:null },
          { level:7,  xp:604800,  books:3500,  requirement:null },
          { level:8,  xp:691200,  books:4000,  requirement:null },
          { level:9,  xp:777600,  books:4500,  requirement:null },
          { level:10, xp:864000,  books:5000,  requirement:"Casual 2" },
          { level:11, xp:950400,  books:5500,  requirement:null },
          { level:12, xp:1036800, books:6000,  requirement:null },
          { level:13, xp:1123200, books:6500,  requirement:null },
          { level:14, xp:1209600, books:7000,  requirement:null },
          { level:15, xp:1296000, books:7500,  requirement:null },
          { level:16, xp:1382400, books:8000,  requirement:"Close 1" },
          { level:17, xp:1468800, books:8500,  requirement:null },
          { level:18, xp:1555200, books:9000,  requirement:null },
          { level:19, xp:1641600, books:9500,  requirement:null },
          { level:20, xp:1728000, books:10000, requirement:"Close 2" },
        ],
        totalXP: 17280000, totalBooks: 100000,
      },
      {
        name: "Spirit of Aeetes",
        effect: "+0.5% to +10% Troops' Lethality and Health (per-level scaling).",
        unlock: "Acquaintance 3",
        note: "Source gave partial/example level data (not a full labeled table) — level numbers below follow the given order but individual levels may be approximate. Totals are as given.",
        levels: [
          { level:1,  xp:159000,  books:800,   requirement:null },
          { level:2,  xp:297600,  books:1500,  requirement:null },
          { level:3,  xp:436800,  books:2200,  requirement:null },
          { level:4,  xp:595800,  books:3000,  requirement:null },
          { level:5,  xp:754800,  books:3800,  requirement:null },
          { level:6,  xp:894000,  books:4500,  requirement:null },
          { level:7,  xp:1033200, books:5200,  requirement:null },
          { level:8,  xp:1192200, books:6000,  requirement:null },
          { level:9,  xp:1351200, books:6800,  requirement:null },
          { level:10, xp:1490400, books:7500,  requirement:null },
          { level:11, xp:1629000, books:8200,  requirement:null },
          { level:12, xp:1788000, books:9000,  requirement:null },
          { level:13, xp:2086200, books:10500, requirement:null },
          { level:14, xp:2384400, books:12000, requirement:null },
          { level:15, xp:2682600, books:13500, requirement:null },
          { level:16, xp:2980800, books:15000, requirement:null },
          { level:17, xp:2980800, books:15500, requirement:null },
        ],
        totalXP: 29803800, totalBooks: 150000,
      },
      {
        name: "One Heart",
        effect: "+5k to +100k Rally Capacity (20 levels, +5k per level).",
        unlock: "Casual 1",
        note: "Source gave partial/example level data (not a full labeled table) — level numbers below follow the given order but individual levels may be approximate. Totals are as given.",
        levels: [
          { level:1,  xp:179400,  books:800,   requirement:null },
          { level:2,  xp:336600,  books:1500,  requirement:null },
          { level:3,  xp:493800,  books:2200,  requirement:null },
          { level:4,  xp:673800,  books:3000,  requirement:null },
          { level:5,  xp:853200,  books:3800,  requirement:null },
          { level:6,  xp:1010400, books:4500,  requirement:null },
          { level:7,  xp:1167600, books:5200,  requirement:null },
          { level:8,  xp:1347600, books:6000,  requirement:null },
          { level:9,  xp:1527600, books:6800,  requirement:null },
          { level:10, xp:1684800, books:7500,  requirement:null },
          { level:11, xp:1842000, books:8200,  requirement:null },
          { level:12, xp:2021400, books:9000,  requirement:null },
          { level:13, xp:2358600, books:10500, requirement:null },
          { level:14, xp:2695200, books:12000, requirement:null },
          { level:15, xp:2695200, books:12500, requirement:null },
          { level:16, xp:3032400, books:13500, requirement:null },
          { level:17, xp:3369600, books:15000, requirement:null },
          { level:18, xp:3369600, books:15500, requirement:null },
        ],
        totalXP: 33691200, totalBooks: 150000,
      },
    ],
  },
  "fabian-expert": {
    talent: {
      name: "Craftsman of War",
      effect: "+2%/4%/6%/9%/12%/15%/18%/21%/24%/27%/30% Attack and Defense in Foundry Battle and Tundra Hellfire.",
    },
    skills: [
      {
        name: "Salvager",
        effect: "Arsenal Tokens +10% to +100% (10 levels, +10% per level).",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:25800,  books:300,  requirement:null },
          { level:2, xp:51600,  books:600,  requirement:null },
          { level:3, xp:77400,  books:900,  requirement:null },
          { level:4, xp:103200, books:1200, requirement:"Acquaintance 3" },
          { level:5, xp:129600, books:1500, requirement:null },
          { level:6, xp:155400, books:1800, requirement:null },
          { level:7, xp:181200, books:2100, requirement:"Casual 2" },
          { level:8, xp:207000, books:2400, requirement:null },
          { level:9, xp:232800, books:2700, requirement:"Close 1" },
        ],
        totalXP: 1164000, totalBooks: 13500,
      },
      {
        name: "Crisis Rescue",
        effect: "Instant recovery of +100k to +1M troops for each Foundry Battle and Tundra Hellfire (10 levels).",
        unlock: "Acquaintance 2",
        note: "Total shown is as given by the source (labeled approximate); it doesn't exactly match the sum of the listed levels.",
        levels: [
          { level:1,  xp:25800,  books:300,  requirement:null },
          { level:2,  xp:51600,  books:600,  requirement:null },
          { level:3,  xp:77400,  books:900,  requirement:null },
          { level:4,  xp:103200, books:1200, requirement:null },
          { level:5,  xp:129600, books:1500, requirement:"Casual 1" },
          { level:6,  xp:155400, books:1800, requirement:null },
          { level:7,  xp:181200, books:2100, requirement:null },
          { level:8,  xp:207000, books:2400, requirement:"Casual 3" },
          { level:9,  xp:232800, books:2700, requirement:null },
          { level:10, xp:258600, books:3000, requirement:null },
          { level:11, xp:284400, books:3300, requirement:null },
          { level:12, xp:310200, books:3600, requirement:null },
          { level:13, xp:336000, books:3900, requirement:null },
          { level:14, xp:361800, books:4200, requirement:null },
          { level:15, xp:387600, books:4500, requirement:"Close 2" },
        ],
        totalXP: 2330455, totalBooks: 22000,
      },
      {
        name: "Heightened Firepower",
        effect: "+1.5% to +30% Lethality, +30% Health for troops during Foundry Battle and Tundra Hellfire (20 levels).",
        unlock: "Acquaintance 3",
        note: "Total shown is as given by the source (labeled approximate).",
        levels: [
          { level:1,  xp:27600,  books:200,  requirement:null },
          { level:2,  xp:55200,  books:400,  requirement:null },
          { level:3,  xp:82800,  books:600,  requirement:null },
          { level:4,  xp:110400, books:800,  requirement:null },
          { level:5,  xp:138000, books:1000, requirement:null },
          { level:6,  xp:165600, books:1200, requirement:"Total Skills Lv.16" },
          { level:7,  xp:193200, books:1400, requirement:null },
          { level:8,  xp:220800, books:1600, requirement:null },
          { level:9,  xp:248400, books:1800, requirement:null },
          { level:10, xp:276000, books:2000, requirement:null },
          { level:11, xp:303600, books:2200, requirement:null },
          { level:12, xp:331200, books:2400, requirement:"Total Skills Lv.24" },
          { level:13, xp:358800, books:2600, requirement:null },
          { level:14, xp:386400, books:2800, requirement:null },
          { level:15, xp:414000, books:3000, requirement:null },
          { level:16, xp:441600, books:3200, requirement:null },
          { level:17, xp:469200, books:3400, requirement:null },
          { level:18, xp:496800, books:3600, requirement:"Total Skills Lv.32" },
          { level:19, xp:524400, books:3800, requirement:null },
          { level:20, xp:552000, books:4000, requirement:null },
          { level:21, xp:579600, books:4200, requirement:null },
          { level:22, xp:607200, books:4400, requirement:null },
          { level:23, xp:634800, books:4600, requirement:null },
          { level:24, xp:662400, books:4800, requirement:null },
          { level:25, xp:690000, books:5000, requirement:"Total Skills Lv.40" },
        ],
        totalXP: 6907800, totalBooks: 50000,
      },
      {
        name: "Battle Bulwark",
        effect: "+7.5k to +150k Rally Capacity in Foundry Battle and Tundra Hellfire (20 levels).",
        unlock: "Casual 1",
        note: "Total shown is as given by the source (labeled approximate).",
        levels: [
          { level:1,  xp:46500,  books:300,  requirement:null },
          { level:2,  xp:93000,  books:600,  requirement:null },
          { level:3,  xp:139500, books:900,  requirement:null },
          { level:4,  xp:186000, books:1200, requirement:null },
          { level:5,  xp:232500, books:1500, requirement:null },
          { level:6,  xp:279000, books:1800, requirement:"Total Skills Lv.24" },
          { level:7,  xp:325500, books:2100, requirement:null },
          { level:8,  xp:372000, books:2400, requirement:null },
          { level:9,  xp:418500, books:2700, requirement:null },
          { level:10, xp:465000, books:3000, requirement:null },
          { level:11, xp:511500, books:3300, requirement:null },
          { level:12, xp:558000, books:3600, requirement:"Total Skills Lv.36" },
          { level:13, xp:604500, books:3900, requirement:null },
          { level:14, xp:651000, books:4200, requirement:null },
          { level:15, xp:697500, books:4500, requirement:null },
          { level:16, xp:744000, books:4800, requirement:null },
          { level:17, xp:790500, books:5100, requirement:null },
          { level:18, xp:837000, books:5400, requirement:"Total Skills Lv.48" },
          { level:19, xp:883500, books:5700, requirement:null },
          { level:20, xp:930000, books:6000, requirement:null },
          { level:21, xp:976500, books:6300, requirement:null },
          { level:22, xp:1023000,books:6600, requirement:null },
          { level:23, xp:1069500,books:6900, requirement:null },
          { level:24, xp:1116000,books:7200, requirement:null },
          { level:25, xp:1162500,books:7500, requirement:"Total Skills Lv.59" },
        ],
        totalXP: 10955000, totalBooks: 75000,
      },
    ],
  },
  "valeria-expert": {
    talent: {
      name: "Conqueror's Spirit",
      effect: "+2%/4%/6%/9%/12%/15%/18%/21%/24%/27%/30% Attack and Defense for troops in Combat Phase in the Power Region.",
    },
    skills: [
      {
        name: "Well Prepared",
        effect: "During Preparation Phase in SvS: +2% to +20% points earned, +1/2/3 daily Personal Phase point rewards.",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:43200,  books:500,  requirement:null },
          { level:2, xp:86400,  books:1000, requirement:null },
          { level:3, xp:129600, books:1500, requirement:null },
          { level:4, xp:172800, books:2000, requirement:"Acquaintance 3" },
          { level:5, xp:216000, books:2500, requirement:null },
          { level:6, xp:259200, books:3000, requirement:null },
          { level:7, xp:302400, books:3500, requirement:"Casual 2" },
          { level:8, xp:345600, books:4000, requirement:null },
          { level:9, xp:388800, books:4500, requirement:"Close 1" },
        ],
        totalXP: 1944000, totalBooks: 22500,
      },
      {
        name: "Radiant Honor",
        effect: "+5 to +50 Sunfire Tokens on Medal Rewards, +1/2/3 State of Power Shop items.",
        unlock: "Acquaintance 2",
        levels: [
          { level:1, xp:60480,  books:500,  requirement:null },
          { level:2, xp:120960, books:1000, requirement:null },
          { level:3, xp:181440, books:1500, requirement:null },
          { level:4, xp:241920, books:2000, requirement:"Casual 1" },
          { level:5, xp:302400, books:2500, requirement:null },
          { level:6, xp:362880, books:3000, requirement:null },
          { level:7, xp:423360, books:3500, requirement:"Casual 3" },
          { level:8, xp:483840, books:4000, requirement:null },
          { level:9, xp:544320, books:4500, requirement:"Close 2" },
        ],
        totalXP: 2721600, totalBooks: 22500,
      },
      {
        name: "Battle Concerto",
        effect: "+1.5% to +30% all troops' Lethality and Health during State of Power's Battle Phase (20 levels).",
        unlock: "Acquaintance 3",
        note: "Total shown is as given by the source (labeled approximate).",
        levels: [
          { level:1,  xp:110840,  books:800,   requirement:null },
          { level:2,  xp:207360,  books:1500,  requirement:null },
          { level:3,  xp:304140,  books:2200,  requirement:null },
          { level:4,  xp:414720,  books:3000,  requirement:null },
          { level:5,  xp:521280,  books:3800,  requirement:"Total Skills Lv.16" },
          { level:6,  xp:622080,  books:4500,  requirement:null },
          { level:7,  xp:716860,  books:5200,  requirement:null },
          { level:8,  xp:811640,  books:5900,  requirement:null },
          { level:9,  xp:906420,  books:6600,  requirement:null },
          { level:10, xp:1001200, books:7300,  requirement:null },
          { level:11, xp:1095980, books:8000,  requirement:"Total Skills Lv.24" },
          { level:12, xp:1190760, books:8700,  requirement:null },
          { level:13, xp:1285540, books:9400,  requirement:null },
          { level:14, xp:1380320, books:10100, requirement:null },
          { level:15, xp:1475100, books:10800, requirement:null },
          { level:16, xp:1569880, books:11500, requirement:null },
          { level:17, xp:1664660, books:12200, requirement:"Total Skills Lv.32" },
          { level:18, xp:1759440, books:12900, requirement:null },
          { level:19, xp:1854220, books:13600, requirement:null },
          { level:20, xp:1949000, books:14300, requirement:null },
          { level:21, xp:2043780, books:15000, requirement:"Total Skills Lv.40" },
        ],
        totalXP: 20716800, totalBooks: 150000,
      },
      {
        name: "Crushing Force",
        effect: "+7,500 to +150,000 Rally Capacity in State of Power Battle Phase (20 levels).",
        unlock: "Casual 1",
        note: "Total shown is as given by the source (labeled approximate).",
        levels: [
          { level:1,  xp:124440,  books:800,   requirement:null },
          { level:2,  xp:233280,  books:1500,  requirement:null },
          { level:3,  xp:342120,  books:2200,  requirement:null },
          { level:4,  xp:466560,  books:3000,  requirement:null },
          { level:5,  xp:591000,  books:3800,  requirement:"Total Skills Lv.24" },
          { level:6,  xp:699840,  books:4500,  requirement:null },
          { level:7,  xp:808680,  books:5200,  requirement:null },
          { level:8,  xp:917520,  books:5900,  requirement:null },
          { level:9,  xp:1026360, books:6600,  requirement:null },
          { level:10, xp:1135200, books:7300,  requirement:null },
          { level:11, xp:1244040, books:8000,  requirement:"Total Skills Lv.36" },
          { level:12, xp:1352880, books:8700,  requirement:null },
          { level:13, xp:1461720, books:9400,  requirement:null },
          { level:14, xp:1570560, books:10100, requirement:null },
          { level:15, xp:1679400, books:10800, requirement:null },
          { level:16, xp:1788240, books:11500, requirement:null },
          { level:17, xp:1897080, books:12200, requirement:"Total Skills Lv.48" },
          { level:18, xp:2005920, books:12900, requirement:null },
          { level:19, xp:2114760, books:13600, requirement:null },
          { level:20, xp:2223600, books:14300, requirement:null },
          { level:21, xp:2332440, books:15000, requirement:"Total Skills Lv.59" },
        ],
        totalXP: 23324360, totalBooks: 150000,
      },
    ],
  },
  "holger-expert": {
    talent: {
      name: "Blade Dancing",
      effect: "+50% to +100% chance of audience reward: +1/2/3 Arena Star Chest(s).",
    },
    skills: [
      {
        name: "Arena Elite",
        effect: "+2% to +20% Attack and Health for Arena heroes (10 levels).",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:82800,  books:600,  requirement:null },
          { level:2, xp:165600, books:1200, requirement:null },
          { level:3, xp:248400, books:1800, requirement:null },
          { level:4, xp:331800, books:2400, requirement:"Acquaintance 3" },
          { level:5, xp:414600, books:3000, requirement:null },
          { level:6, xp:497400, books:3600, requirement:null },
          { level:7, xp:580200, books:4200, requirement:"Casual 2" },
          { level:8, xp:663600, books:4800, requirement:null },
          { level:9, xp:746400, books:5400, requirement:"Close 1" },
        ],
        totalXP: 3730800, totalBooks: 27000,
      },
      {
        name: "Crowd Pleaser",
        effect: "+5% to +50% daily and weekly Arena Tokens (10 levels).",
        unlock: "Acquaintance 2",
        levels: [
          { level:1, xp:30600,  books:300,  requirement:null },
          { level:2, xp:61800,  books:600,  requirement:null },
          { level:3, xp:93000,  books:900,  requirement:null },
          { level:4, xp:124200, books:1200, requirement:"Casual 1" },
          { level:5, xp:155400, books:1500, requirement:null },
          { level:6, xp:186600, books:1800, requirement:null },
          { level:7, xp:217200, books:2100, requirement:"Casual 3" },
          { level:8, xp:248400, books:2400, requirement:null },
          { level:9, xp:279600, books:2700, requirement:"Close 2" },
        ],
        totalXP: 1396800, totalBooks: 13500,
      },
      {
        name: "Arena Star",
        effect: "+1/2/3 more items in the Arena Shop at a 5% to 50% discount (10 levels).",
        unlock: "Acquaintance 3",
        levels: [
          { level:1, xp:30600,  books:300,  requirement:null },
          { level:2, xp:61800,  books:600,  requirement:null },
          { level:3, xp:93000,  books:900,  requirement:null },
          { level:4, xp:124200, books:1200, requirement:"Total Skills Lv.14" },
          { level:5, xp:155400, books:1500, requirement:null },
          { level:6, xp:186600, books:1800, requirement:null },
          { level:7, xp:217200, books:2100, requirement:"Total Skills Lv.20" },
          { level:8, xp:248400, books:2400, requirement:null },
          { level:9, xp:279600, books:2700, requirement:"Total Skills Lv.28" },
        ],
        totalXP: 1396800, totalBooks: 13500,
      },
      {
        name: "Legacy",
        effect: "+2% to +20% additional Attack and Health in the Arena for heroes (10 levels).",
        unlock: "Casual 1",
        levels: [
          { level:1, xp:82800,  books:600,  requirement:null },
          { level:2, xp:165600, books:1200, requirement:null },
          { level:3, xp:248400, books:1800, requirement:null },
          { level:4, xp:331800, books:2400, requirement:"Total Skills Lv.22" },
          { level:5, xp:414600, books:3000, requirement:null },
          { level:6, xp:497400, books:3600, requirement:null },
          { level:7, xp:580200, books:4200, requirement:"Total Skills Lv.30" },
          { level:8, xp:663600, books:4800, requirement:null },
          { level:9, xp:746400, books:5400, requirement:"Total Skills Lv.39" },
        ],
        totalXP: 3730800, totalBooks: 27000,
      },
    ],
  },
  "baldur-expert": {
    talent: {
      name: "Master Negotiator",
      effect: "Alliance Shop items -5%/-10%/-15%; Personal Activity Triumph Chest rewards +20% to +100% Defense.",
    },
    skills: [
      {
        name: "Blazing Sunrise",
        effect: "+2% to +20% Alliance Mobilization Points, +1/2/3 Monument tier (10 levels).",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:25800,  books:300,  requirement:null },
          { level:2, xp:51600,  books:600,  requirement:null },
          { level:3, xp:77400,  books:900,  requirement:null },
          { level:4, xp:103200, books:1200, requirement:"Acquaintance 3" },
          { level:5, xp:129600, books:1500, requirement:null },
          { level:6, xp:155400, books:1800, requirement:null },
          { level:7, xp:181200, books:2100, requirement:"Casual 2" },
          { level:8, xp:207000, books:2400, requirement:null },
          { level:9, xp:232800, books:2700, requirement:"Close 1" },
        ],
        totalXP: 1164000, totalBooks: 13500,
      },
      {
        name: "Honored Conquest",
        effect: "+5% to +50% Alliance Championship Badges, +1/2/3 Alliance Championship Shop items (10 levels).",
        unlock: "Acquaintance 2",
        levels: [
          { level:1, xp:25800,  books:300,  requirement:null },
          { level:2, xp:51600,  books:600,  requirement:null },
          { level:3, xp:77400,  books:900,  requirement:null },
          { level:4, xp:103200, books:1200, requirement:"Casual 1" },
          { level:5, xp:129600, books:1500, requirement:null },
          { level:6, xp:155400, books:1800, requirement:null },
          { level:7, xp:181200, books:2100, requirement:"Casual 3" },
          { level:8, xp:207000, books:2400, requirement:null },
          { level:9, xp:232800, books:2700, requirement:"Close 2" },
        ],
        totalXP: 1164000, totalBooks: 13500,
      },
      {
        name: "Bounty Hunter",
        effect: "+5% to +50% Crazy Joe point rewards, bonus Chest per 200,000 points (limit 1–10 per season, 10 levels).",
        unlock: "Acquaintance 3",
        levels: [
          { level:1, xp:25800,  books:300,  requirement:null },
          { level:2, xp:51600,  books:600,  requirement:null },
          { level:3, xp:77400,  books:900,  requirement:null },
          { level:4, xp:103200, books:1200, requirement:"Total Skills Lv.14" },
          { level:5, xp:129600, books:1500, requirement:null },
          { level:6, xp:155400, books:1800, requirement:null },
          { level:7, xp:181200, books:2100, requirement:"Total Skills Lv.20" },
          { level:8, xp:207000, books:2400, requirement:null },
          { level:9, xp:232800, books:2700, requirement:"Total Skills Lv.28" },
        ],
        totalXP: 1164000, totalBooks: 13500,
      },
      {
        name: "Dawn Hymn",
        effect: "+5% to +50% Alliance Showdown points (excl. Tundra Trade Route), +1/2/3 daily Milestone Reward tier boost (10 levels).",
        unlock: "Casual 1",
        levels: [
          { level:1, xp:51600,  books:500,  requirement:null },
          { level:2, xp:103200, books:1000, requirement:null },
          { level:3, xp:155400, books:1500, requirement:null },
          { level:4, xp:207000, books:2000, requirement:"Total Skills Lv.22" },
          { level:5, xp:259200, books:2500, requirement:null },
          { level:6, xp:310800, books:3000, requirement:null },
          { level:7, xp:362400, books:3500, requirement:"Total Skills Lv.30" },
          { level:8, xp:414600, books:4000, requirement:null },
          { level:9, xp:466200, books:4500, requirement:"Total Skills Lv.39" },
        ],
        totalXP: 2330400, totalBooks: 22500,
      },
    ],
  },
  "ronne-expert": {
    talent: {
      name: "Trade Dominion",
      effect: "+2%/4%/6%/9%/12%/15%/18%/21%/24%/27%/30% Attack and Defense for troops during the Tundra Trade Routes event.",
    },
    skills: [
      {
        name: "Cartographic Memory",
        effect: "+2% to +20% faster arrival times, +1/2/3 additional free refreshes per truck (10 levels).",
        unlock: "Acquaintance 1",
        levels: [
          { level:1, xp:25800,  books:300,  requirement:null },
          { level:2, xp:51600,  books:600,  requirement:null },
          { level:3, xp:77400,  books:900,  requirement:null },
          { level:4, xp:103200, books:1200, requirement:"Acquaintance 3" },
          { level:5, xp:129600, books:1500, requirement:null },
          { level:6, xp:155400, books:1800, requirement:null },
          { level:7, xp:181200, books:2100, requirement:"Casual 2" },
          { level:8, xp:207000, books:2400, requirement:null },
          { level:9, xp:232800, books:2700, requirement:"Close 1" },
        ],
        totalXP: 1164000, totalBooks: 13500,
      },
      {
        name: "Treasure Sent",
        effect: "+10% to +100% chance of raiding 1 extra cargo (10 levels).",
        unlock: "Acquaintance 2",
        note: "Total shown is as given by the source (labeled approximate).",
        levels: [
          { level:1, xp:36600,  books:300,  requirement:null },
          { level:2, xp:73200,  books:600,  requirement:null },
          { level:3, xp:109800, books:900,  requirement:null },
          { level:4, xp:146400, books:1200, requirement:"Casual 1" },
          { level:5, xp:183000, books:1500, requirement:null },
          { level:6, xp:219600, books:1800, requirement:null },
          { level:7, xp:256200, books:2100, requirement:"Casual 3" },
          { level:8, xp:292800, books:2400, requirement:null },
          { level:9, xp:329400, books:2700, requirement:"Close 2" },
        ],
        totalXP: 1647000, totalBooks: 13500,
      },
      {
        name: "Giving Back",
        effect: "+5% to +50% chance of recovering 1 cargo, +1/2 elite chests that cannot be raided (10 levels).",
        unlock: "Acquaintance 3",
        levels: [
          { level:1, xp:82800,  books:600,  requirement:null },
          { level:2, xp:165600, books:1200, requirement:null },
          { level:3, xp:248400, books:1800, requirement:null },
          { level:4, xp:331800, books:2400, requirement:"Total Skills Lv.14" },
          { level:5, xp:414600, books:3000, requirement:null },
          { level:6, xp:497400, books:3600, requirement:null },
          { level:7, xp:580200, books:4200, requirement:"Total Skills Lv.20" },
          { level:8, xp:663600, books:4800, requirement:null },
          { level:9, xp:746400, books:5400, requirement:"Total Skills Lv.28" },
        ],
        totalXP: 3730800, totalBooks: 27000,
      },
      {
        name: "Gold Class",
        effect: "Legendary Mission guaranteed every 12 down to 4 missions completed, +1 extra truck mission daily (9 levels).",
        unlock: "Casual 1",
        levels: [
          { level:1, xp:186600,  books:1200,  requirement:null },
          { level:2, xp:373200,  books:2400,  requirement:null },
          { level:3, xp:559800,  books:3600,  requirement:null },
          { level:4, xp:746400,  books:4800,  requirement:"Total Skills Lv.22" },
          { level:5, xp:933000,  books:6000,  requirement:null },
          { level:6, xp:1119600, books:7200,  requirement:null },
          { level:7, xp:1306200, books:8400,  requirement:"Total Skills Lv.30" },
          { level:8, xp:1492800, books:9600,  requirement:null },
          { level:9, xp:1679400, books:10800, requirement:"Total Skills Lv.39" },
        ],
        totalXP: 8397000, totalBooks: 54000,
      },
    ],
  },
};
