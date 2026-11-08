import { parseUpgradeAmount, parseUpgradeImport, upgradeRequirements, combinedResourceNeeds } from "./upgradePlannerMath.js";

test("handles K/M/B suffixes and thousands separators without truncation",()=>{
  expect(parseUpgradeAmount("1,000")).toBe(1000);
  expect(parseUpgradeAmount("1.5M")).toBe(1500000);
  expect(parseUpgradeAmount("400M")).toBe(400000000);
  expect(parseUpgradeAmount("0")).toBe(0);
  expect(parseUpgradeAmount("1e12")).toBeNull();
  expect(parseUpgradeAmount("-1")).toBeNull();
  expect(parseUpgradeAmount("not a number")).toBeNull();
});

test("imports exact resource rows and does not turn 1,000 into 1",()=>{
  const names=new Map([["fire crystals","fire-crystals"],["coal","coal"]]);
  const out=parseUpgradeImport("Fire Crystals,1,000\nCoal,400M\nOther,10\nCoal,garbage",names);
  expect(out.costs["fire-crystals"]).toBe("1000");
  expect(out.costs.coal).toBe("400000000");
  expect(out.imported).toBe(2);
  expect(out.skipped).toBe(2);
});

test("goals use actual backpack balances without modifying them",()=>{
  const balances={"fire-crystals":100};
  const rows=upgradeRequirements({requirements:{"fire-crystals":"250"}},balances);
  expect(rows[0].remaining).toBe(150);
  expect(balances["fire-crystals"]).toBe(100);
});

test("combined commitments expose double counting across goals",()=>{
  const plans=[{requirements:{"fire-crystals":"100"}},{requirements:{"fire-crystals":"200"}}];
  expect(combinedResourceNeeds(plans,{"fire-crystals":150})).toEqual([
    {id:"fire-crystals",needed:300,projects:2,owned:150,missing:150}
  ]);
});
