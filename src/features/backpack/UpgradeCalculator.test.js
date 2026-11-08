import { calculatePreloadedCosts } from "./UpgradeCalculator.jsx";
import { GAME_COSTS } from "./preloadedGameCosts.js";

test("Furnace FC10 is in preloaded building progression",()=>{
 const furnace=GAME_COSTS.buildings.find(x=>x.id==="furnace");
 expect(furnace.levels.at(-1).label).toBe("FC 10");
 const out=calculatePreloadedCosts({category:"buildings",selected:"furnace",from:"FC 9",to:"FC 10"});
 expect(out.valid).toBe(true);
 expect(Object.values(out.costs).some(x=>x>0)).toBe(true);
});

test("same current and target never double-counts upgrade costs",()=>{
 const out=calculatePreloadedCosts({category:"buildings",selected:"furnace",from:"30",to:"30"});
 expect(out.valid).toBe(false);
 expect(out.costs).toEqual({});
});

test("Chief Gear progression loads materials for one exact step",()=>{
 const from=GAME_COSTS.gear[0].id;
 const to=GAME_COSTS.gear[1].id;
 const out=calculatePreloadedCosts({category:"gear",selected:"",from,to});
 expect(out.valid).toBe(true);
 expect(Object.keys(out.costs).length).toBeGreaterThan(0);
});

test("Chief Charm costs include aliases for backpack item IDs",()=>{
 const out=calculatePreloadedCosts({category:"charms",selected:"",from:GAME_COSTS.charms[0].id,to:GAME_COSTS.charms[1].id});
 expect(out.valid).toBe(true);
 expect(Object.keys(out.costs).some(x=>x.startsWith("charm-"))).toBe(true);
});

test("Pet planner includes food and milestone materials",()=>{
 const pet=GAME_COSTS.pets[0];
 const out=calculatePreloadedCosts({category:"pets",selected:pet.id,from:"1",to:"10"});
 expect(out.valid).toBe(true);
 expect(out.costs["pet-food"]).toBeGreaterThan(0);
 expect(out.costs["taming-manual"]).toBeGreaterThan(0);
});

test("Troop training multiplies units by a positive integer quantity",()=>{
 const one=calculatePreloadedCosts({category:"troops",selected:"infantry",to:"10",quantity:1});
 const many=calculatePreloadedCosts({category:"troops",selected:"infantry",to:"10",quantity:1000});
 expect(many.valid).toBe(true);
 Object.keys(one.costs).forEach(id=>expect(many.costs[id]).toBe(one.costs[id]*1000));
 expect(calculatePreloadedCosts({category:"troops",selected:"infantry",to:"10",quantity:0}).valid).toBe(false);
});


test("Public WoS Tools T11 Flame Squad table sums shards and steel correctly",()=>{
 const result=calculatePreloadedCosts({category:"helios",selected:"flame-squad",from:"0",to:"5"});
 expect(result.valid).toBe(true);
 expect(result.costs["fire-crystal-shards"]).toBe(258);
 expect(result.costs.steel).toBe(80000);
 expect(result.prerequisites.length).toBeGreaterThan(0);
});

test("Research cannot skip backwards or exceed the published levels",()=>{
 expect(calculatePreloadedCosts({category:"helios",selected:"flame-squad",from:"4",to:"2"}).valid).toBe(false);
 expect(calculatePreloadedCosts({category:"helios",selected:"flame-squad",from:"0",to:"6"}).valid).toBe(false);
});
