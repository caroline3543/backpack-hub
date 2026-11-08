import { useEffect, useMemo, useState } from "react";
import { GAME_COSTS } from "./preloadedGameCosts.js";
import { HELIOS_REFERENCE } from "./wosToolsResearchReference.js";
import { formatAmount } from "./backpackConstants.js";

const CARD={border:"1px solid var(--bp-border2)",borderRadius:16,background:"var(--bp-card)",padding:14};
const INPUT={width:"100%",height:48,boxSizing:"border-box",border:"1px solid var(--bp-border2)",borderRadius:12,padding:"0 12px",fontSize:15,background:"var(--bp-card)",color:"var(--bp-text)"};
const BUTTON={height:44,borderRadius:12,border:"1px solid var(--bp-border2)",background:"var(--bp-card)",color:"var(--bp-text)",fontSize:13,fontWeight:700,padding:"0 12px",cursor:"pointer"};
const CATEGORY=[
  ["buildings","Buildings & Furnace FC10","🏗️"],
  ["gear","Chief Gear","🛡️"],
  ["charms","Chief Charms","💎"],
  ["pets","Pets","🐾"],
  ["troops","Troop Training","⚔️"],
  ["heroes","Hero Shards","⭐"],
  ["helios","Helios / FC Shard Research","🔥"]
];
const aliases={
  "fire-crystal":"fire-crystals",
  "fire-crystals":"fire-crystals",
  "refined-fire-crystal":"refined-fire",
  "refined-fire-crystals":"refined-fire",
  "refined-fire":"refined-fire",
  "polishing-solution":"polishing-sol",
  "charm-guide":"charm-guides",
  "charm-design":"charm-designs",
  "energizing-potion":"energising-pot",
  "strengthening-serum":"strength-serum"
};
const mapId=id=>aliases[id]||id;
const combine=steps=>{
  const acc={};
  for(const step of steps)for(const [rawId,amount] of step||[]){
    const id=mapId(rawId);
    if(!Number.isFinite(Number(amount))||Number(amount)<0)continue;
    acc[id]=(acc[id]||0)+Number(amount);
  }
  return acc;
};
const heroStarTotals=[0,10,50,165,465,1065];
const fmt=n=>formatAmount(n);
const labelFor=(id,items)=>items.find(i=>i.id===id)?.name||id.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const levelOrder=(levels)=>levels.map((x,index)=>({...x,index}));
// Every level row's cost is the cost of entering that exact row.
// Never add the initial/current level's cost to the goal.
export function calculatePreloadedCosts({category,selected,from,to,quantity=1}){
  if(category==="heroes"){
    const a=Number(from),b=Number(to);
    return {costs:{},referenceShards:Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b<=5&&b>a?heroStarTotals[b]-heroStarTotals[a]:null,prerequisites:[],valid:b>a};
  }
  if(category==="helios"){
    const track=HELIOS_REFERENCE.find(x=>x.id===selected);
    const start=Number(from),end=Number(to);
    if(!track||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>track.levels.length||end<=start)
      return {costs:{},prerequisites:[],valid:false,reason:"Choose valid research levels."};
    const steps=track.levels.filter(x=>x.level>start&&x.level<=end);
    return {costs:combine(steps.map(x=>x.cost)),
      prerequisites:[...new Set(steps.map(x=>x.requirements))],
      seconds:steps.reduce((sum,x)=>sum+x.seconds,0),
      valid:true,source:"WoS Tools public War Academy wiki; manually checked subset"};
  }
  if(category==="troops"){
    const troop=GAME_COSTS.troops.find(x=>x.id===selected);
    const tier=troop?.tiers.find(x=>String(x.tier)===String(to));
    const amount=Number(quantity);
    if(!tier||!Number.isInteger(amount)||amount<=0)return {costs:{},prerequisites:[],valid:false};
    return {costs:Object.fromEntries(Object.entries(combine([tier.cost])).map(([id,value])=>[id,value*amount])),prerequisites:[],valid:true,seconds:(tier.trainingTimeSeconds||0)*amount};
  }
  const options=category==="buildings"?GAME_COSTS.buildings:category==="gear"?GAME_COSTS.gear:category==="charms"?GAME_COSTS.charms:GAME_COSTS.pets;
  const entry=options.find(x=>x.id===selected);
  if(category!=="gear"&&category!=="charms"&&!entry)return {costs:{},prerequisites:[],valid:false};
  const rows=category==="buildings"?levelOrder(entry.levels):category==="pets"?entry.levels:options===GAME_COSTS.gear||options===GAME_COSTS.charms?options:[];
  if(category==="gear"||category==="charms"){
    const all=options;
    const start=all.findIndex(x=>x.id===from),end=all.findIndex(x=>x.id===to);
    if(start<0||end<=start)return {costs:{},prerequisites:[],valid:false};
    return {costs:combine(all.slice(start+1,end+1).map(x=>x.materials)),prerequisites:[],valid:true};
  }
  const start=rows.findIndex(x=>String(category==="pets"?x.level:x.label)===String(from));
  const end=rows.findIndex(x=>String(category==="pets"?x.level:x.label)===String(to));
  if(start<0||end<=start)return {costs:{},prerequisites:[],valid:false};
  const selectedRows=rows.slice(start+1,end+1);
  const costs=category==="buildings"
    ?combine(selectedRows.map(x=>x.cost))
    :combine(selectedRows.map(x=>[["pet-food",x.food||0],...(x.materials||[])]));
  const prerequisites=category==="buildings"
    ?selectedRows.flatMap(x=>(x.requirements||[]).map(([building,level])=>building+" level "+level))
    :[];
  return {costs,prerequisites:[...new Set(prerequisites)],valid:true,steps:selectedRows.map(x=>category==="pets"?"Level "+x.level:x.label)};
}
function SelectField({title,value,onChange,options}){
  return <label style={{fontSize:12,color:"var(--bp-muted2)",fontWeight:650,display:"block"}}>
    {title}
    <select style={{...INPUT,marginTop:6}} value={value} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>;
}
const asOptions=rows=>rows.map(x=>({value:String(x.value),label:x.label}));
const FCName=value=>String(value).replace(/^FC\\s*/,"FC");
// Generation 6 planning: Furnace selector starts at FC5; other building levels remain unchanged.
export function getBuildingLevelOptions(building) {
  const levels=building?.levels||[];
  if(building?.id!=="furnace")return levels;
  const at=levels.findIndex(level=>/^FC\\s*5$/i.test(level.label));
  return at<0?[]:levels.slice(at);
}
const goalStorageKey=userId=>"backpack-hub-calculator-goals-v1:"+(userId||"local-user");
function loadGoals(userId){try{const v=JSON.parse(localStorage.getItem(goalStorageKey(userId))||"[]");return Array.isArray(v)?v:[];}catch{return [];}}
export default function UpgradeCalculator({userId,items,balances,onUpdateResource}){
 const [goals,setGoals]=useState(()=>loadGoals(userId));
 const [goalFeedback,setGoalFeedback]=useState("");
 const [showSaved,setShowSaved]=useState(false);
 useEffect(()=>{try{localStorage.setItem(goalStorageKey(userId),JSON.stringify(goals));}catch{}},[goals,userId]);
 const [category,setCategory]=useState("buildings");
 const [building,setBuilding]=useState("furnace");
 const [pet,setPet]=useState(GAME_COSTS.pets[0]?.id||"");
 const [troop,setTroop]=useState("infantry");
 const [heliosTrack,setHeliosTrack]=useState("flame-squad");
 const [start,setStart]=useState("");
 const [target,setTarget]=useState("");
 const [quantity,setQuantity]=useState(10000);
 const [hero,setHero]=useState("renee");
 const [gearSlot,setGearSlot]=useState("1");
 const [sourceExpanded,setSourceExpanded]=useState(false);


 const selectorData=category==="buildings"?GAME_COSTS.buildings:category==="pets"?GAME_COSTS.pets:category==="troops"?GAME_COSTS.troops:category==="helios"?HELIOS_REFERENCE:[];
 const selector=category==="buildings"?building:category==="pets"?pet:category==="helios"?heliosTrack:troop;
 const active=selectorData.find(x=>x.id===selector);
 const rowOptions=useMemo(()=>{
   if(category==="buildings")return getBuildingLevelOptions(active).map(x=>({value:x.label,label:FCName(x.label)}));
   if(category==="pets")return (active?.levels||[]).map(x=>({value:String(x.level),label:"Level "+x.level}));
   if(category==="gear")return GAME_COSTS.gear.map(x=>({value:x.id,label:x.name}));
   if(category==="charms")return GAME_COSTS.charms.map(x=>({value:x.id,label:x.name}));
   if(category==="heroes")return Array.from({length:6},(_,i)=>({value:String(i),label:i+" stars"}));
   if(category==="troops")return active?.tiers.map(x=>({value:String(x.tier),label:"Tier "+x.tier}))||[];
   if(category==="helios")return Array.from({length:(active?.levels.length||0)+1},(_,i)=>({value:String(i),label:"Level "+i}));
   return [];
 },[category,active]);
 const from=rowOptions.some(x=>x.value===start)?start:rowOptions[0]?.value||"";
 const to=rowOptions.some(x=>x.value===target)?target:rowOptions.at(-1)?.value||"";
 const calculated=useMemo(()=>calculatePreloadedCosts({
   category,selected:selector,from,to,quantity
 }),[category,selector,from,to,quantity]);
 const requirements=Object.entries(calculated.costs||{}).sort((a,b)=>a[0].localeCompare(b[0]));
 const isIncomplete=calculated.prerequisites?.length>0;
 const [showBudget,setShowBudget]=useState(true);
 const totalMissing=requirements.filter(([id,required])=>(balances[id]||0)<required*((category==="gear"||category==="charms")?(Number(gearSlot)||1):1)).length;
 const switchCat=c=>{setCategory(c);setStart("");setTarget("");setGoalFeedback("");};
 const saveGoal=()=>{
   if(!calculated.valid){setGoalFeedback("Choose a valid upgrade before saving.");return;}
   const id="calc-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);
   const selectorName=active?.name||(category==="gear"?"Chief Gear":category==="charms"?"Chief Charms":category==="heroes"?({"wu-ming":"Wu Ming",renee:"Renee",wayne:"Wayne"}[hero]+" Hero Shards"):category);
   const title=selectorName+" · "+(category==="troops"?"T"+to+" × "+quantity:category==="gear"||category==="charms"?from+" → "+to+" ("+gearSlot+" pieces)":from+" → "+to);
   setGoals(previous=>[{id,title,category,building,pet,troop,heliosTrack,hero,start:from,target:to,quantity,gearSlot},...previous]);
   setGoalFeedback("Upgrade goal saved in this backpack profile.");
 };
 const restoreGoal=g=>{
   setCategory(g.category);setBuilding(g.building||"furnace");setPet(g.pet||GAME_COSTS.pets[0].id);setTroop(g.troop||"infantry");setHeliosTrack(g.heliosTrack||"flame-squad");
   setStart(g.start||"");setTarget(g.target||"");setQuantity(g.quantity||10000);setGearSlot(g.gearSlot||"1");setHero(g.hero||"renee");
   setGoalFeedback("");setShowSaved(false);
 };

 return <div style={{display:"grid",gap:15}}>
  <div style={{...CARD,padding:16}}>
    <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"var(--bp-muted2)"}}>Preloaded reference data · No API key needed</div>
    <h2 style={{fontFamily:"Fraunces,serif",fontSize:25,margin:"7px 0",color:"var(--bp-text)"}}>Upgrade Calculator</h2>
    <p style={{fontSize:13,color:"var(--bp-muted2)",lineHeight:1.5,margin:"0 0 13px"}}>Generation 6 planning · Furnace begins at FC5. Choose upgrades to calculate materials and compare with your backpack. Community data may differ from the game.</p>
    <SelectField title="Calculator" value={category} onChange={switchCat} options={CATEGORY.map(([value,label,emoji])=>({value,label:emoji+" "+label}))}/>
    <details open={showSaved} onToggle={e=>setShowSaved(e.currentTarget.open)} style={{marginTop:12}}>
      <summary style={{fontSize:13,fontWeight:750,color:"var(--bp-text)",cursor:"pointer",padding:"10px 0"}}>Saved upgrade goals ({goals.length})</summary>
      {goals.length===0?<p style={{fontSize:12,color:"var(--bp-muted2)"}}>No saved goals. Select an upgrade and tap Save goal.</p>:goals.map(g=><div key={g.id} style={{display:"flex",alignItems:"center",gap:8,borderTop:"1px solid var(--bp-border)",padding:"9px 0"}}>
        <button onClick={()=>restoreGoal(g)} style={{...BUTTON,flex:1,textAlign:"start",minHeight:44,height:"auto"}}>{g.title}</button>
        <button aria-label={"Delete "+g.title} style={{...BUTTON,color:"#a06358",flexShrink:0}} onClick={()=>setGoals(gs=>gs.filter(x=>x.id!==g.id))}>Delete</button>
      </div>)}
      <p style={{fontSize:11,color:"var(--bp-muted2)"}}>Goals are saved on this device and are separate for each backpack.</p>
    </details>
    {category==="buildings"&&building==="furnace"&&<p role="note" style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.5,margin:"10px 0 0"}}>Furnace FC5 is the lowest option. FC10 remains a future planning target; game unlocks depend on state age, not just hero generation.</p>}
    {category==="heroes"&&<div style={{marginTop:12}}><SelectField title="Generation 6 hero" value={hero} onChange={setHero} options={[
      {value:"wu-ming",label:"Wu Ming · Infantry"},
      {value:"renee",label:"Renee · Lancer"},
      {value:"wayne",label:"Wayne · Marksman"}
    ]}/></div>}
    {(category==="buildings"||category==="pets"||category==="troops"||category==="helios")&&
      <div style={{marginTop:12}}><SelectField title={category==="buildings"?"Building":category==="pets"?"Pet":category==="helios"?"Research track":"Troop type"} value={selector} onChange={v=>{if(category==="buildings")setBuilding(v);else if(category==="pets")setPet(v);else if(category==="helios")setHeliosTrack(v);else setTroop(v);setStart("");setTarget("");}}
      options={selectorData.map(x=>({value:x.id,label:x.name}))}/></div>}
    {(category==="gear"||category==="charms")&&<div style={{marginTop:12}}>
      <SelectField title={category==="gear"?"Equipment count":"Charm count"} value={gearSlot} onChange={setGearSlot} options={asOptions([1,2,3,4,5,6].map(n=>({value:String(n),label:n+" "+(category==="gear"?"gear pieces":"charms")})))}/>
      <p style={{fontSize:12,color:"var(--bp-muted2)"}}>Each piece uses the same published upgrade progression. Choose how many identical upgrades to plan.</p>
    </div>}
    {<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:12}}>
      {category==="troops"? <SelectField title="Training tier" value={to} onChange={setTarget} options={rowOptions}/> :
      <><SelectField title="Current level" value={from} onChange={setStart} options={rowOptions}/><SelectField title="Target level" value={to} onChange={setTarget} options={rowOptions}/></>}
    </div>}
    {category==="troops"&&<label style={{display:"block",fontSize:12,color:"var(--bp-muted2)",marginTop:12,fontWeight:650}}>Troops to train
      <input type="number" min="1" max="100000000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} style={{...INPUT,marginTop:6}}/>
    </label>}
  </div>
    <div style={{...CARD,padding:16}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
     <div><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--bp-muted2)",fontWeight:700}}>Calculated requirements</div>
     <h3 style={{fontSize:18,margin:"5px 0",color:"var(--bp-text)"}}>{calculated.valid?"Total upgrade materials":"Select a higher target level"}</h3></div>
     {calculated.valid&&<span style={{fontSize:11,borderRadius:30,padding:"5px 9px",color:"#a06358",background:"rgba(160,99,88,.1)",fontWeight:750}}>Community data</span>}
   </div>
   {calculated.valid&&category==="heroes"&&<div style={{padding:12,borderRadius:12,background:"var(--bp-bg)"}}>
     <strong style={{color:"var(--bp-text)"}}>{fmt(calculated.referenceShards||0)} hero shards</strong>
     <p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.45,margin:"6px 0 0"}}>Full-star milestone reference for Generation 6 heroes. Unlock and partial-star costs are excluded. Hero-specific shards are not interchangeable with general shards.</p>
   </div>}
   {calculated.valid&&<div style={{display:"flex",gap:8,alignItems:"center",margin:"12px 0"}}>
     <button style={{...BUTTON,flex:1,background:"var(--bp-accent,#78917f)",color:"white"}} onClick={saveGoal}>Save upgrade goal</button>
   </div>}
   {goalFeedback&&<p role="status" style={{fontSize:12,color:"var(--bp-muted2)"}}>{goalFeedback}</p>}
   {category==="helios"&&<p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.5}}>Public wiki reference: T11 Infantry Flame Squad levels 1–5 only. Other Helios and T12 tracks remain unavailable until their costs and permission to reuse them are verified.</p>}
   {calculated.valid&&(category==="gear"||category==="charms")&&<p style={{fontSize:12,color:"var(--bp-muted2)"}}>Totals below are for {Number(gearSlot)||1} matching pieces.</p>}
   {calculated.valid&&requirements.length===0&&category!=="heroes"&&<p style={{fontSize:13,color:"var(--bp-muted2)"}}>This step has no resource costs recorded in the dataset.</p>}
   {calculated.valid&&requirements.length>0&&<>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",margin:"12px 0"}}>
         <span style={{fontSize:12,color:"var(--bp-muted2)"}}>{totalMissing===0?"Entered costs are covered":totalMissing+" resource types are short"}</span>
         <button style={{...BUTTON,height:36}} onClick={()=>setShowBudget(x=>!x)}>{showBudget?"Hide inventory":"Compare inventory"}</button>
      </div>
      {requirements.map(([id,value])=>{
        const need=(category==="gear"||category==="charms")?value*(Number(gearSlot)||1):value;
        const owned=Math.max(0,Number(balances[id]||0));
        const missing=Math.max(0,need-owned);
        const pct=need?Math.min(100,Math.floor(owned/need*100)):100;
        const item=items.find(x=>x.id===id);
        return <div key={id} style={{borderBottom:"1px solid var(--bp-border)",padding:"11px 0",color:"var(--bp-text)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:13}}><strong>{labelFor(id,items)}</strong><strong>{fmt(need)}</strong></div>
          {showBudget&&<>
            <div style={{height:7,borderRadius:100,background:"var(--bp-border3)",overflow:"hidden",margin:"8px 0"}}><div style={{background:"var(--bp-accent,#78917f)",height:"100%",width:pct+"%"}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,color:"var(--bp-muted2)"}}><span>{fmt(owned)} owned</span><span style={{color:missing?"#a06358":"#5c7a6e",fontWeight:700}}>{missing?fmt(missing)+" needed":"Covered"}</span></div>
            {item&&<button onClick={()=>onUpdateResource(id)} style={{...BUTTON,height:36,marginTop:7}}>Update backpack</button>}
            {!item&&<p style={{fontSize:11,color:"#a06358",margin:"5px 0"}}>Not currently tracked in backpack.</p>}
          </>}
        </div>;
      })}
   </>}
   {calculated.valid&&(category==="troops"||category==="helios")&&<p style={{fontSize:12,color:"var(--bp-muted2)"}}>Base {category==="helios"?"research":"training"} time: {Math.ceil((calculated.seconds||0)/60).toLocaleString()} minutes before buffs.</p>}
   {calculated.valid&&calculated.prerequisites?.length>0&&<details style={{marginTop:14}}>
      <summary style={{fontSize:13,color:"var(--bp-text)",fontWeight:700,cursor:"pointer"}}>{category==="helios"?"Research prerequisites":"Building prerequisites"} ({calculated.prerequisites.length})</summary>
      <p style={{fontSize:12,color:"#a06358",lineHeight:1.5}}>{category==="helios"?"Other research tracks required by these prerequisites are NOT included in the total.":"These requirements are preloaded, but their extra construction costs are not included without knowing the current levels of the other buildings."}</p>
      <ul style={{fontSize:12,color:"var(--bp-muted2)",paddingInlineStart:20,lineHeight:1.7}}>{calculated.prerequisites.map((x,i)=><li key={i}>{x}</li>)}</ul>
   </details>}
   <button style={{...BUTTON,marginTop:14,width:"100%"}} onClick={()=>setSourceExpanded(x=>!x)}>Data source and accuracy {sourceExpanded?"−":"+"}</button>
   {sourceExpanded&&<p style={{fontSize:12,lineHeight:1.6,color:"var(--bp-muted2)"}}>{category==="helios"&&<>T11 Infantry Flame Squad values were transcribed from the <a href="https://wostools.net/wiki/buildings/war-academy" target="_blank" rel="noreferrer">public WoS Tools War Academy wiki</a>. Only this track is included, and it is not a live API connection. </>}Preloaded community dataset v{GAME_COSTS.version} from <a href="https://github.com/chiefpansancolt/whiteout-survival-data" target="_blank" rel="noreferrer">Whiteout Survival Data</a> (MIT licence). Published values are a work in progress. Validate important upgrades in-game. Resource totals do not reserve or spend backpack items.</p>}
  </div>
 </div>;
}
