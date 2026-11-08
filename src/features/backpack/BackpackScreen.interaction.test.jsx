import React from "react";
import {render,screen,fireEvent,within,cleanup} from "@testing-library/react";
import BackpackScreen from "./BackpackScreen.jsx";

jest.mock("../../i18n/I18nContext.jsx",()=>({useI18n:()=>({t:(key)=>key})}));
jest.mock("./useBackpackData.js",()=>({useBackpackData:()=>({
  items:[],transactions:[],projections:[],balances:{},summary:{},
  pinnedItems:[],togglePin:jest.fn(),addItem:jest.fn(),updateItem:jest.fn(),deleteItem:jest.fn(),
  addTransaction:jest.fn(),updateTransaction:jest.fn(),deleteTransaction:jest.fn(),setTotal:jest.fn(),
  addProjection:jest.fn(),updateProjection:jest.fn(),deleteProjection:jest.fn(),clearProjections:jest.fn(),
  setAverageReset:jest.fn(),loading:false
})}));
jest.mock("./BackpackSummary.jsx",()=>()=>null);
jest.mock("./BackpackItems.jsx",()=>()=> <div>Backpack inventory screen</div>);
jest.mock("./BackpackSheet.jsx",()=>()=>null);
jest.mock("./UpgradeCalculator.jsx",()=>()=> <div>Upgrade calculator screen</div>);
jest.mock("./BackpackScanner.jsx",()=>()=> <div>Backpack screenshot scanner screen</div>);
jest.mock("./MithrilCalculator.jsx",()=>()=> <div>Mithril screen</div>);
jest.mock("./ExpertCalculator.jsx",()=>()=> <div>Experts screen</div>);
jest.mock("./GearPriorityGuide.jsx",()=>()=>null);
jest.mock("../../components/PinReplacePrompt.jsx",()=>()=>null);
jest.mock("../../components/Celebration.jsx",()=>({
  Toast:()=>null,
  useCelebration:()=>({toast:"",toastType:"",showToast:jest.fn(),celebrate:jest.fn(),warn:jest.fn()})
}));
afterEach(cleanup);

test("simulated mobile player uses fixed bottom tabs without scrolling to a calculator section",()=>{
 window.scrollTo=jest.fn();
 render(<BackpackScreen userId="mobile-qa" />);
 const nav=screen.getByRole("navigation",{name:"Backpack app navigation"});
 expect(nav).toBeTruthy();
 expect(screen.getByText("Backpack inventory screen")).toBeTruthy();
 expect(within(nav).getAllByRole("button")).toHaveLength(5);
 fireEvent.click(within(nav).getByRole("button",{name:"Calculator"}));
 expect(screen.getByText("Upgrade calculator screen")).toBeTruthy();
 expect(screen.queryByText("Backpack inventory screen")).toBeNull();
 fireEvent.click(within(nav).getByRole("button",{name:"Scan"}));
 expect(screen.getByText("Backpack screenshot scanner screen")).toBeTruthy();
 expect(screen.queryByText("Upgrade calculator screen")).toBeNull();
 fireEvent.click(within(nav).getByRole("button",{name:"Mithril"}));
 expect(screen.getByText("Mithril screen")).toBeTruthy();
 fireEvent.click(within(nav).getByRole("button",{name:"Experts"}));
 expect(screen.getByText("Experts screen")).toBeTruthy();
 fireEvent.click(within(nav).getByRole("button",{name:"nav.items"}));
 expect(screen.getByText("Backpack inventory screen")).toBeTruthy();
});
