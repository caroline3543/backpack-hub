// ─── itemIcons.js ─────────────────────────────────────────────────────────────
// Maps predefined item ids to their icon image. All 38 predefined items now
// have an icon. To add icons for future custom items, drop a file into
// src/assets/icons/ and add one line below.

import advancedWild        from "../../assets/icons/advanced-wild.webp";
import arenaTokens         from "../../assets/icons/arena-tokens.png";
import booksKnowledge      from "../../assets/icons/books-knowledge.webp";
import charmDesigns        from "../../assets/icons/charm-designs.webp";
import charmGuides         from "../../assets/icons/charm-guides.webp";
import coal                from "../../assets/icons/coal.webp";
import commonWild          from "../../assets/icons/common-wild.webp";
import customChest         from "../../assets/icons/custom-chest.webp";
import designPlans         from "../../assets/icons/design-plans.webp";
import energisingPot       from "../../assets/icons/energising-pot.webp";
import essenceStones       from "../../assets/icons/essence-stones.webp";
import expertSigils        from "../../assets/icons/expert-sigils.webp";
import fireCrystals        from "../../assets/icons/fire-crystals.webp";
import fireCrystalShards   from "../../assets/icons/fire-crystal-shards.png";
import gems                from "../../assets/icons/gems.png";
import generalShards       from "../../assets/icons/general-shards.webp";
import hardenedAlloy       from "../../assets/icons/hardened-alloy.webp";
import iron                from "../../assets/icons/iron.webp";
import jewelSecrets        from "../../assets/icons/jewel-secrets.webp";
import lunarAmber          from "../../assets/icons/lunar-amber.webp";
import meat                from "../../assets/icons/meat.webp";
import mithril             from "../../assets/icons/mithril.webp";
import mysteryBadges       from "../../assets/icons/mystery-badges.png";
import petFood             from "../../assets/icons/pet-food.webp";
import polishingSol        from "../../assets/icons/polishing-sol.webp";
import refinedFire         from "../../assets/icons/refined-fire.webp";
import skinTokens          from "../../assets/icons/skin-tokens.png";
import speedupConstruction from "../../assets/icons/speedup-construction.png";
import speedupGeneral      from "../../assets/icons/speedup-general.png";
import speedupHealing      from "../../assets/icons/speedup-healing.png";
import speedupLearning     from "../../assets/icons/speedup-learning.png";
import speedupResearch     from "../../assets/icons/speedup-research.png";
import speedupTroop        from "../../assets/icons/speedup-troop.png";
import staminaCans         from "../../assets/icons/stamina-cans.png";
import steel               from "../../assets/icons/steel.png";
import strengthSerum       from "../../assets/icons/strength-serum.webp";
import tamingManual        from "../../assets/icons/taming-manual.webp";
import wood                from "../../assets/icons/wood.webp";

// Keyed by the predefined item id (see PREDEFINED_ITEMS in backpackConstants.js).
export const ITEM_ICONS = {
  "advanced-wild":        advancedWild,
  "arena-tokens":         arenaTokens,
  "books-knowledge":      booksKnowledge,
  "charm-designs":        charmDesigns,
  "charm-guides":         charmGuides,
  "coal":                 coal,
  "common-wild":          commonWild,
  "custom-chest":         customChest,
  "design-plans":         designPlans,
  "energising-pot":       energisingPot,
  "essence-stones":       essenceStones,
  "expert-sigils":        expertSigils,
  "fire-crystals":        fireCrystals,
  "fire-crystal-shards":  fireCrystalShards,
  "gems":                 gems,
  "general-shards":       generalShards,
  "hardened-alloy":       hardenedAlloy,
  "iron":                 iron,
  "jewel-secrets":        jewelSecrets,
  "lunar-amber":          lunarAmber,
  "meat":                 meat,
  "mithril":              mithril,
  "mystery-badges":       mysteryBadges,
  "pet-food":             petFood,
  "polishing-sol":        polishingSol,
  "refined-fire":         refinedFire,
  "skin-tokens":          skinTokens,
  "speedup-construction": speedupConstruction,
  "speedup-general":      speedupGeneral,
  "speedup-healing":      speedupHealing,
  "speedup-learning":     speedupLearning,
  "speedup-research":     speedupResearch,
  "speedup-troop":        speedupTroop,
  "stamina-cans":         staminaCans,
  "steel":                steel,
  "strength-serum":       strengthSerum,
  "taming-manual":        tamingManual,
  "wood":                 wood,
};
