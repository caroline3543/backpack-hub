// ─── cyrilleConfig.js ─────────────────────────────────────────────────────────
// Cyrille is a Bear Hunt expert with two distinct capacity-boosting skills
// that are frequently confused with each other:
//   - Ursa's Bane: increases the PERSONAL deployment capacity of the troops
//     you can send in a single march (applies to your own marches, whether
//     you're joining or starting a Bear Hunt rally).
//   - Entrapment: increases the TOTAL rally capacity of a Bear Hunt rally
//     that YOU start as rally leader. It does not add to ordinary joiner
//     marches, and does not apply to Crazy Joe at all.
//
// Verified 2026-07-11 against whiteoutsurvival.wiki/experts/cyrille/ (updated
// Apr 2026) and corroborating guides: both skills are flat additions (not
// percentages), both run 10 levels, and the ranges quoted there (Ursa's Bane
// 3,000 → 30,000; Entrapment 30,000 → 300,000) match the per-level step size
// used below exactly. Not independently confirmed: whether the bonus is
// applied automatically without further action, and whether it's reflected
// correctly in a *saved* formation preset before the Bear Hunt actually
// starts — flag these as assumptions if the numbers ever look off in-game.
export const CYRILLE_CONFIG = {
  ursasBane: {
    event: "bearTrap",
    bonusType: "personalDeploymentCapacity",
    perLevel: 3000,
    maxLevel: 10,
    label: "Ursa's Bane",
    description: "Increases your personal Bear Hunt troop deployment capacity.",
  },
  entrapment: {
    event: "bearTrap",
    bonusType: "totalRallyCapacity",
    perLevel: 30000,
    maxLevel: 10,
    label: "Entrapment",
    description: "Increases the total capacity of a rally you start as rally leader.",
  },
  lastVerified: "2026-07-11",
  source: "https://www.whiteoutsurvival.wiki/experts/cyrille/",
};
