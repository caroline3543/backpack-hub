// ─── itemIcons.js ─────────────────────────────────────────────────────────────
// Maps predefined item ids to their icon image. Items without an entry here
// fall back to a generic placeholder in the UI (see BackpackItems.jsx) — drop
// a new file into src/assets/icons/ and add one line below to wire it in.

import advancedWild    from "../../assets/icons/advanced-wild.webp";
import booksKnowledge  from "../../assets/icons/books-knowledge.webp";
import charmDesigns    from "../../assets/icons/charm-designs.webp";
import charmGuides     from "../../assets/icons/charm-guides.webp";
import coal            from "../../assets/icons/coal.webp";
import commonWild      from "../../assets/icons/common-wild.webp";
import customChest     from "../../assets/icons/custom-chest.webp";
import designPlans     from "../../assets/icons/design-plans.webp";
import energisingPot   from "../../assets/icons/energising-pot.webp";
import essenceStones   from "../../assets/icons/essence-stones.webp";
import expertSigils    from "../../assets/icons/expert-sigils.webp";
import fireCrystals    from "../../assets/icons/fire-crystals.webp";
import generalShards   from "../../assets/icons/general-shards.webp";
import hardenedAlloy   from "../../assets/icons/hardened-alloy.webp";
import iron            from "../../assets/icons/iron.webp";
import jewelSecrets    from "../../assets/icons/jewel-secrets.webp";
import lunarAmber      from "../../assets/icons/lunar-amber.webp";
import meat            from "../../assets/icons/meat.webp";
import mithril         from "../../assets/icons/mithril.webp";
import petFood         from "../../assets/icons/pet-food.webp";
import polishingSol    from "../../assets/icons/polishing-sol.webp";
import refinedFire     from "../../assets/icons/refined-fire.webp";
import speedupResearch from "../../assets/icons/speedup-research.webp";
import strengthSerum   from "../../assets/icons/strength-serum.webp";
import tamingManual    from "../../assets/icons/taming-manual.webp";
import wood            from "../../assets/icons/wood.webp";

// Keyed by the predefined item id (see PREDEFINED_ITEMS in backpackConstants.js).
export const ITEM_ICONS = {
  "advanced-wild":     advancedWild,
  "books-knowledge":   booksKnowledge,
  "charm-designs":     charmDesigns,
  "charm-guides":      charmGuides,
  "coal":              coal,
  "common-wild":       commonWild,
  "custom-chest":      customChest,
  "design-plans":      designPlans,
  "energising-pot":    energisingPot,
  "essence-stones":    essenceStones,
  "expert-sigils":     expertSigils,
  "fire-crystals":     fireCrystals,
  "general-shards":    generalShards,
  "hardened-alloy":    hardenedAlloy,
  "iron":              iron,
  "jewel-secrets":     jewelSecrets,
  "lunar-amber":       lunarAmber,
  "meat":              meat,
  "mithril":           mithril,
  "pet-food":          petFood,
  "polishing-sol":     polishingSol,
  "refined-fire":      refinedFire,
  "speedup-research":  speedupResearch,
  "strength-serum":    strengthSerum,
  "taming-manual":     tamingManual,
  "wood":              wood,
};
