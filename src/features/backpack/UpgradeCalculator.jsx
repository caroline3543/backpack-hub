import { useMemo, useState } from "react";
import { GAME_COSTS } from "./preloadedGameCosts.js";
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
  "charm-secrets":"jewel-secrets",
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
  if(category==="helios")return {costs:{},prerequisites:[],valid:false,reason:"T11/T12 research costs are not part of this preloaded calculator yet."};
  if(category==="troops"){
    const troop=GAME_COSTS.troops.find(x=>x.id===selected);
    const tier=troop?.tiers.find(x=>String(x.tier)===String(to));
    const amount=Number(quantity);
    if(!tier||!Number.isInteger(amount)||amount<=0)return {costs:{},prerequisites:[],valid:false};
    return {costs:Object.fromEntries(Object.entries(combine([tier.cost])).map(([id,value])=>[id,value*amount])),prerequisites:[],valid:true,seconds:(tier.trainingTimeSeconds||0)*amount};
  }
  const options=category==="buildings"?GAME_COSTS.buildings:category==="gear"?GAME_COSTS.gear:category==="charms"?GAME_COSTS.charms:GAME_COSTS.pets;
  const entry=options.find(x=>x.id===selected);
  if(!entry)return {costs:{},prerequisites:[],valid:false};
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
const FCName=value=>String(value).replace(/^FC\s*/,"FC");
export default function UpgradeCalculator({items,balances,onUpdateResource}){
 const [category,setCategory]=useState("buildings");
 const [building,setBuilding]=useState("furnace");
 const [pet,setPet]=useState(GAME_COSTS.pets[0]?.id||"");
 const [troop,setTroop]=useState("infantry");
 const [start,setStart]=useState("");
 const [target,setTarget]=useState("");
 const [quantity,setQuantity]=useState(10000);
 const [gearSlot,setGearSlot]=useState("One piece");
 const [sourceExpanded,setSourceExpanded]=useState(false);
 const [showAllSteps,setShowAllSteps]=useState(false);
 const [saved,setSaved]=useState(false);
 const selectorData=category==="buildings"?GAME_COSTS.buildings:category==="pets"?GAME_COSTS.pets:category==="troops"?GAME_COSTS.troops:[];
 const selector=category==="buildings"?building:category==="pets"?pet:troop;
 const active=selectorData.find(x=>x.id===selector);
 const rowOptions=useMemo(()=>{
   if(category==="buildings")return (active?.levels||[]).map(x=>({value:x.label,label:FCName(x.label)}));
   if(category==="pets")return (active?.levels||[]).map(x=>({value:String(x.level),label:"Level "+x.level}));
   if(category==="gear")return GAME_COSTS.gear.map(x=>({value:x.id,label:x.name}));
   if(category==="charms")return GAME_COSTS.charms.map(x=>({value:x.id,label:x.name}));
   if(category==="heroes")return Array.from({length:6},(_,i)=>({value:String(i),label:i+" stars"}));
   if(category==="troops")return active?.tiers.map(x=>({value:String(x.tier),label:"Tier "+x.tier}))||[];
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
 const totalMissing=requirements.filter(([id,required])=>(balances[id]||0)<required).length;
 const switchCat=c=>{setCategory(c);setStart("");setTarget("");setSaved(false);setShowAllSteps(false);};
 const compare=()=>requirements.length&&calculated.valid;
 return <div style={{display:"grid",gap:15}}>
  <div style={{...CARD,padding:16}}>
    <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"var(--bp-muted2)"}}>Game data included • No API key needed</div>
    <h2 style={{fontFamily:"Fraunces,serif",fontSize:25,margin:"7px 0",color:"var(--bp-text)"}}>Upgrade Calculator</h2>
    <p style={{fontSize:13,color:"var(--bp-muted2)",lineHeight:1.5,margin:"0 0 13px"}}>Choose an upgrade. Materials are filled in automatically and compared with your backpack. Costs come from a community-maintained dataset and may differ from your game.</p>
    <SelectField title="Calculator" value={category} onChange={switchCat} options={CATEGORY.map(([value,label,emoji])=>({value,label:emoji+" "+label}))}/>
    {(category==="buildings"||category==="pets"||category==="troops")&&
      <div style={{marginTop:12}}><SelectField title={category==="buildings"?"Building":category==="pets"?"Pet":"Troop type"} value={selector} onChange={v=>{if(category==="buildings")setBuilding(v);else if(category==="pets")setPet(v);else setTroop(v);setStart("");setTarget("");}}
      options={selectorData.map(x=>({value:x.id,label:x.name}))}/></div>}
    {(category==="gear"||category==="charms")&&<div style={{marginTop:12}}>
      <SelectField title={category==="gear"?"Equipment count":"Charm count"} value={gearSlot} onChange={setGearSlot} options={asOptions([1,2,3,4,5,6].map(n=>({value:String(n),label:n+" "+(category==="gear"?"gear pieces":"charms")})))}/>
      <p style={{fontSize:12,color:"var(--bp-muted2)"}}>Each piece uses the same published upgrade progression. Choose how many identical upgrades to plan.</p>
    </div>}
    {category!=="helios"&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:12}}>
      {category==="troops"? <SelectField title="Training tier" value={to} onChange={setTarget} options={rowOptions}/> :
      <><SelectField title="Current level" value={from} onChange={setStart} options={rowOptions}/><SelectField title="Target level" value={to} onChange={setTarget} options={rowOptions}/></>}
    </div>}
    {category==="troops"&&<label style={{display:"block",fontSize:12,color:"var(--bp-muted2)",marginTop:12,fontWeight:650}}>Troops to train
      <input type="number" min="1" max="100000000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} style={{...INPUT,marginTop:6}}/>
    </label>}
  </div>
  {category==="helios"?<div style={CARD}>
    <strong style={{color:"var(--bp-text)"}}>Helios research: data validation required</strong>
    <p style={{fontSize:13,color:"var(--bp-muted2)",lineHeight:1.5}}>Fire Crystal Shard research is different from training T11/T12 troops. The dataset contains a research table, but this calculator has not yet mapped its prerequisite nodes safely. No figures are fabricated.</p>
  </div>:
  <div style={{...CARD,padding:16}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
     <div><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--bp-muted2)",fontWeight:700}}>Calculated requirements</div>
     <h3 style={{fontSize:18,margin:"5px 0",color:"var(--bp-text)"}}>{calculated.valid?"Total upgrade materials":"Select a higher target"}</h3></div>
     {calculated.valid&&<span style={{fontSize:11,borderRadius:30,padding:"5px 9px",color:"#a06358",background:"rgba(160,99,88,.1)",fontWeight:750}}>Community data</span>}
   </div>
   {calculated.valid&&category==="heroes"&&<div style={{padding:12,borderRadius:12,background:"var(--bp-bg)"}}>
     <strong style={{color:"var(--bp-text)"}}>{fmt(calculated.referenceShards||0)} hero shards</strong>
     <p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.45,margin:"6px 0 0"}}>Full-star milestone estimate only. Check the hero's generation, unlock costs and partial stars. Hero-specific shards cannot always be substituted with general shards.</p>
   </div>}
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
   {calculated.valid&&category==="troops"&&<p style={{fontSize:12,color:"var(--bp-muted2)"}}>Base training time: {Math.ceil((calculated.seconds||0)/60).toLocaleString()} minutes before buffs.</p>}
   {calculated.valid&&calculated.prerequisites?.length>0&&<details style={{marginTop:14}}>
      <summary style={{fontSize:13,color:"var(--bp-text)",fontWeight:700,cursor:"pointer"}}>Building prerequisites ({calculated.prerequisites.length})</summary>
      <p style={{fontSize:12,color:"#a06358",lineHeight:1.5}}>These requirements are preloaded, but their extra construction costs are not included without knowing the current levels of the other buildings.</p>
      <ul style={{fontSize:12,color:"var(--bp-muted2)",paddingInlineStart:20,lineHeight:1.7}}>{calculated.prerequisites.map((x,i)=><li key={i}>{x}</li>)}</ul>
   </details>}
   <button style={{...BUTTON,marginTop:14,width:"100%"}} onClick={()=>setSourceExpanded(x=>!x)}>Data source and accuracy {sourceExpanded?"−":"+"}</button>
   {sourceExpanded&&<p style={{fontSize:12,lineHeight:1.6,color:"var(--bp-muted2)"}}>Preloaded community dataset v{GAME_COSTS.version} from <a href="https://github.com/chiefpansancolt/whiteout-survival-data" target="_blank" rel="noreferrer">Whiteout Survival Data</a> (MIT licence). Published values are a work in progress. Validate important upgrades in-game. Resource totals do not reserve or spend backpack items.</p>}
  </div>}
 </div>;
}
