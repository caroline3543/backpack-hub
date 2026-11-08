import React from "react";
import { render,screen,fireEvent,within,cleanup } from "@testing-library/react";
import UpgradeCalculator from "./UpgradeCalculator.jsx";
import { GAME_COSTS } from "./preloadedGameCosts.js";

afterEach(()=>{cleanup();window.localStorage.clear();});
function openCalculator(id="qa-furnace") {
 return render(<UpgradeCalculator userId={id} items={[]} balances={{}} onUpdateResource={()=>{}} />);
}
function choose(label,value){
 const field=screen.getByRole("combobox",{name:label});
 fireEvent.change(field,{target:{value}});
 return field;
}
test("simulated Gen6 player can choose Furnace FC5 to FC6 and see costs",()=>{
 openCalculator();
 const current=screen.getByRole("combobox",{name:"Current level"});
 const target=screen.getByRole("combobox",{name:"Target level"});
 expect(current.value).toBe("FC 5");
 expect([...current.options].map(x=>x.value)).not.toContain("FC 4");
 expect([...target.options].map(x=>x.value)).toContain("FC 6");
 expect(target.value).toBe("");
 choose("Target level","FC 6");
 expect(screen.getByRole("heading",{name:"Total upgrade materials"})).toBeTruthy();
 expect(screen.getByText("Fire Crystals")).toBeTruthy();
 expect(screen.getByRole("button",{name:"Save upgrade goal"})).toBeTruthy();
});

test("changing current Furnace level clears a now-invalid target",()=>{
 openCalculator();
 choose("Target level","FC 6");
 expect(screen.getByRole("combobox",{name:"Target level"}).value).toBe("FC 6");
 choose("Current level","FC 7");
 expect(screen.getByRole("combobox",{name:"Target level"}).value).toBe("");
 const targets=[...screen.getByRole("combobox",{name:"Target level"}).options].map(x=>x.value);
 expect(targets).not.toContain("FC 6");
 expect(targets).toContain("FC 8");
});

test("simulated player can change buildings and choose valid target",()=>{
 openCalculator();
 choose("Building","embassy");
 expect([...screen.getByRole("combobox",{name:"Current level"}).options].map(x=>x.value)).toContain("30");
 choose("Current level","FC 5");
 choose("Target level","FC 6");
 expect(screen.getByRole("heading",{name:"Total upgrade materials"})).toBeTruthy();
});

test("simulated player can save and reopen Furnace upgrade",()=>{
 const mounted=openCalculator("qa-save-goal");
 choose("Target level","FC 6");
 fireEvent.click(screen.getByRole("button",{name:"Save upgrade goal"}));
 expect(screen.getByText(/Saved upgrade goals \(1\)/)).toBeTruthy();
 mounted.unmount();
 openCalculator("qa-save-goal");
 fireEvent.click(screen.getByText(/Saved upgrade goals \(1\)/));
 const saved=screen.getByRole("button",{name:/Furnace.*FC 5.*FC 6/i});
 fireEvent.click(saved);
 expect(screen.getByRole("combobox",{name:"Current level"}).value).toBe("FC 5");
 expect(screen.getByRole("combobox",{name:"Target level"}).value).toBe("FC 6");
});

test("simulated user can select a Chief Gear upgrade without cramped two-column selector",()=>{
 openCalculator();
 choose("Calculator","gear");
 const current=screen.getByRole("combobox",{name:"Current level"});
 const next=GAME_COSTS.gear[1];
 choose("Target level",next.id);
 expect(screen.getByRole("heading",{name:"Total upgrade materials"})).toBeTruthy();
 expect(current.value).toBe(GAME_COSTS.gear[0].id);
});

test("simulated user can select pet level and compare resource amounts",()=>{
 openCalculator();
 choose("Calculator","pets");
 choose("Target level","10");
 expect(screen.getByRole("heading",{name:"Total upgrade materials"})).toBeTruthy();
 expect(screen.getByText("Pet Food")).toBeTruthy();
});

test("troop training does not compute until user selects a troop tier",()=>{
 openCalculator();
 choose("Calculator","troops");
 expect(screen.getByRole("combobox",{name:"Training tier"}).value).toBe("");
 choose("Training tier","10");
 expect(screen.getByRole("heading",{name:"Total upgrade materials"})).toBeTruthy();
});

test("different backpack profiles cannot see one another's saved goals",()=>{
 const mounted=openCalculator("qa-profile-A");
 choose("Target level","FC 6");
 fireEvent.click(screen.getByRole("button",{name:"Save upgrade goal"}));
 mounted.unmount();
 openCalculator("qa-profile-B");
 expect(screen.getByText(/Saved upgrade goals \(0\)/)).toBeTruthy();
});
