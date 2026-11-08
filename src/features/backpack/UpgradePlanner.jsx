import { useEffect, useMemo, useState } from "react";
import { formatAmount } from "./backpackConstants.js";

// Resource keys are the existing Backpack item IDs. Never store separate balances.
const TYPES = [
  {id:"furnace",name:"Furnace / FC1–FC10",emoji:"🔥",levels:["30",...Array.from({length:10},(_,i)=>"FC"+(i+1))],resources:["meat","wood","coal","iron","fire-crystals","refined-fire","speedup-construction"],hint:"Enter the cumulative cost of the entire furnace path plus required buildings."},
  {id:"buildings",name:"Building upgrades",emoji:"🏰",levels:["1",...Array.from({length:30},(_,i)=>String(i+2)),...Array.from({length:10},(_,i)=>"FC"+(i+1))],resources:["meat","wood","coal","iron","fire-crystals","refined-fire","speedup-construction"],hint:"Track each building separately, including prerequisite levels."},
  {id:"heroes",name:"Hero shards & skills",emoji:"⭐",levels:["0★","1★","2★","3★","4★","5★"],resources:["general-shards","essence-stones"],hint:"Hero-specific shards may differ from General Hero Shards. Create a custom Backpack item for each hero's shards to prevent incorrect totals."},
  {id:"helios",name:"Helios / T11 & T12 troops",emoji:"⚔️",levels:["T9","T10","T11","T12"],resources:["fire-crystal-shards","refined-fire","fire-crystals","meat","wood","coal","iron","speedup-research","speedup-troop"],hint:"Set troop type in the goal name. Research unlock costs and troop training costs are different; include both only when applicable."},
  {id:"chief-gear",name:"Chief Gear",emoji:"🛡️",levels:[],resources:["design-plans","polishing-sol","hardened-alloy","lunar-amber"],hint:"Plan each of the six gear pieces separately, or enter totals for a whole set."},
  {id:"charms",name:"Chief Charms",emoji:"💎",levels:Array.from({length:19},(_,i)=>String(i)),resources:["charm-designs","charm-guides","jewel-secrets"],hint:"Plan each charm slot or a set. Use its correct level-specific materials."},
  {id:"pets",name:"Pets",emoji:"🐾",levels:Array.from({length:101},(_,i)=>String(i)),resources:["pet-food","taming-manual","energising-pot","strength-serum","common-wild","advanced-wild"],hint:"Choose the pet in the goal name. Pet food and advancement materials differ by pet and level."},
  {id:"hero-gear",name:"Hero Gear & widgets",emoji:"🗡️",levels:[],resources:["essence-stones","mithril","hector-widget","norah-widget","gwen-widget","gen5-chest"],hint:"Add hero-specific widget goals or use the existing Mithril calculator. Avoid counting the same gear resources twice."},
  {id:"research",name:"Research / War Academy",emoji:"📚",levels:[],resources:["fire-crystal-shards","refined-fire","fire-crystals","meat","wood","coal","iron","steel","speedup-research"],hint:"Research trees must be totalled across all required prerequisite nodes."}
];
const allowed = new Set(TYPES.map(x=>x.id));
const HERO_SHARD_CUMULATIVE = [0,10,50,165,465,1065];
const starIndex = value => {const m=String(value||"").match(/^([0-5])★$/);return m?Number(m[1]):-1;};
const parseNumber = value => {
  const text=String(value ?? "").replace(/,/g,"").replace(/\s/g,"").trim();
  if(!text)return null;
  const match=text.match(/^(\d+(?:\.\d+)?)([kmb])?$/i);
  if(!match)return null;
  const n=Number(match[1])*({k:1e3,m:1e6,b:1e9}[match[2]?.toLowerCase()]||1);
  return Number.isFinite(n)&&n>=0?n:null;
};
const keyFor = userId=>"backpack-hub-upgrade-plans-v1:"+(userId||"local-user");
const read = userId => {
  try {const v=JSON.parse(localStorage.getItem(keyFor(userId))||"[]");return Array.isArray(v)?v.filter(x=>allowed.has(x.type)):[];}catch{return [];}
};
const input={width:"100%",minWidth:0,boxSizing:"border-box",height:43,borderRadius:12,padding:"8px 11px",fontSize:14,background:"var(--bp-card)",color:"var(--bp-text)",border:"1px solid var(--bp-border2)"};
const btn={minHeight:43,padding:"9px 12px",borderRadius:12,fontWeight:700,fontSize:13,border:"1px solid var(--bp-border2)",background:"var(--bp-card)",color:"var(--bp-text)",cursor:"pointer"};
const card={border:"1px solid var(--bp-border)",borderRadius:18,padding:14,background:"var(--bp-card)"};
const trim=(s,max=140)=>String(s??"").slice(0,max);
const newPlan=type=>({id:"plan-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),type,name:TYPES.find(t=>t.id===type)?.name||"Upgrade",current:"",target:"",requirements:{},notes:"",source:"",createdAt:new Date().toISOString()});

export default function UpgradePlanner({userId,items,balances,onUpdateResource}){
  const [plans,setPlans]=useState(()=>read(userId));
  const [category,setCategory]=useState("furnace");
  const [active,setActive]=useState(null);
  const [pasted,setPasted]=useState("");
  const [info,setInfo]=useState("");
  const [editCosts,setEditCosts]=useState(false);
  useEffect(()=>{try{localStorage.setItem(keyFor(userId),JSON.stringify(plans));}catch{}},[userId,plans]);
  const chosen=plans.find(p=>p.id===active);
  const type=TYPES.find(t=>t.id===(chosen?.type||category));
  const counts=useMemo(()=>plans.map(plan=>{
    const rows=Object.entries(plan.requirements||{}).map(([id,raw])=>{
      const required=parseNumber(raw);const owned=Math.max(0,Number(balances[id]||0));
      return {id,required,owned,remaining:required===null?null:Math.max(0,required-owned)};
    }).filter(r=>r.required!==null);
    return {id:plan.id,rows,done:rows.length>0&&rows.every(r=>r.remaining===0),tracked:rows.length};
  }),[plans,balances]);
  const countsById=id=>counts.find(x=>x.id===id);
  const patch=(id,updates)=>setPlans(ps=>ps.map(p=>p.id===id?{...p,...updates}:p));
  const patchCost=(id,itemId,value)=>setPlans(ps=>ps.map(p=>p.id===id?{...p,requirements:{...p.requirements,[itemId]:value}}:p));
  const add=()=>{
    const p=newPlan(category);setPlans(ps=>[...ps,p]);setActive(p.id);setEditCosts(true);setInfo("");
  };
  const importRows=()=>{
    if(!chosen)return;
    const names=new Map(items.map(it=>[it.name.toLowerCase().trim(),it.id]));
    items.forEach(it=>names.set(it.id.toLowerCase(),it.id));
    ["fire crystal","fire crystals"].forEach(s=>names.set(s,"fire-crystals"));
    ["refined fc","refined fire crystals"].forEach(s=>names.set(s,"refined-fire"));
    ["fire crystal shards","fc shards"].forEach(s=>names.set(s,"fire-crystal-shards"));
    const extra={"coal":"coal","iron":"iron","meat":"meat","wood":"wood","charm guides":"charm-guides","charm designs":"charm-designs","design plans":"design-plans","pet food":"pet-food","general shards":"general-shards","hero shards":"general-shards"};
    Object.entries(extra).forEach(([k,v])=>names.set(k,v));
    let rows=0;const requirements={...chosen.requirements};
    pasted.split(/\r?\n/).forEach(line=>{
      const parts=line.split(/[\t,;:]/).map(x=>x.trim().replace(/^["']|["']$/g,""));
      const itemId=names.get((parts[0]||"").toLowerCase());
      const n=parts.slice(1).map(parseNumber).find(x=>x!==null);
      if(itemId&&n!==undefined){requirements[itemId]=String(n);rows++;}
    });
    if(rows){patch(chosen.id,{requirements,source:chosen.source||"Manual import (unverified)"});setInfo(rows+" rows imported. Verify totals and prerequisite buildings.");setEditCosts(false);}
    else setInfo("No matching resources. Use lines like Fire Crystals,3000 or Coal,400M.");
  };
  const deletePlan=id=>{setPlans(ps=>ps.filter(p=>p.id!==id));setActive(null);};
  const allIds=new Set([...items.map(i=>i.id),...TYPES.flatMap(t=>t.resources)]);
  const itemLabel=id=>items.find(i=>i.id===id)?.name||id.replace(/-/g," ");
  const options=(type?.resources||[]).filter(id=>allIds.has(id));
  const extraCosts=chosen?Object.keys(chosen.requirements||{}).filter(id=>!options.includes(id)):[];
  return <section style={{...card}}>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"var(--bp-muted2)",textTransform:"uppercase"}}>Connected to your backpack</div>
    <h2 style={{fontSize:24,margin:"6px 0",fontFamily:"Fraunces,serif",color:"var(--bp-text)"}}>Upgrade Planner</h2>
    <p style={{fontSize:13,lineHeight:1.55,color:"var(--bp-muted2)"}}>Plan upgrades across the game. All goals read your existing inventory. No materials are automatically spent or reserved.</p>
    {!chosen&&<>
      <label style={{display:"block",fontSize:13,fontWeight:700,color:"var(--bp-text)",margin:"15px 0 8px"}}>New goal type</label>
      <select value={category} onChange={e=>setCategory(e.target.value)} style={input}>{TYPES.map(t=><option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</select>
      <button onClick={add} style={{...btn,width:"100%",marginTop:10,background:"var(--bp-accent,#78917f)",color:"white"}}>+ Create upgrade goal</button>
      <h3 style={{fontSize:15,color:"var(--bp-text)",margin:"20px 0 12px"}}>Saved goals ({plans.length})</h3>
      {plans.length===0&&<p style={{fontSize:13,color:"var(--bp-muted2)"}}>No upgrade goals yet. Your existing resource balances are ready to use.</p>}
      {plans.map(p=>{const c=countsById(p.id);return <button key={p.id} onClick={()=>{setActive(p.id);setInfo("");setEditCosts(false);}} style={{...card,width:"100%",textAlign:"start",cursor:"pointer",marginBottom:9,display:"block",color:"var(--bp-text)"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}><strong style={{fontSize:14}}>{TYPES.find(t=>t.id===p.type)?.emoji} {p.name}</strong><span style={{fontSize:12,color:"var(--bp-muted2)"}}>View ›</span></div>
        <div style={{fontSize:12,color:"var(--bp-muted2)",marginTop:5}}>{p.current||"Start"} → {p.target||"Target"} · {c?.tracked||0} resource targets {c?.done?"· Ready":""}</div>
      </button>;})}
    </>}
    {chosen&&<>
      <button onClick={()=>{setActive(null);setInfo("");}} style={{...btn,margin:"10px 0"}}>← All goals</button>
      <div style={{fontSize:13,fontWeight:700,color:"var(--bp-text)",margin:"8px 0"}}>{type.emoji} {type.name}</div>
      <label style={{display:"block",fontSize:12,color:"var(--bp-muted2)"}}>Goal name<input style={{...input,marginTop:5}} value={chosen.name} onChange={e=>patch(chosen.id,{name:trim(e.target.value)})} placeholder="e.g. FC7 Furnace + Embassy"/></label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
        {["current","target"].map(field=><label key={field} style={{fontSize:12,color:"var(--bp-muted2)"}}>{field==="current"?"Current":"Target"}
          {type.levels.length>0?<select value={chosen[field]} onChange={e=>patch(chosen.id,{[field]:e.target.value})} style={{...input,marginTop:5}}><option value="">Select</option>{type.levels.map(l=><option key={l} value={l}>{l}</option>)}</select>:<input style={{...input,marginTop:5}} value={chosen[field]} placeholder="Level / tier" onChange={e=>patch(chosen.id,{[field]:trim(e.target.value,50)})}/>}
        </label>)}
      </div>
      <p style={{fontSize:12,lineHeight:1.5,color:"var(--bp-muted2)"}}>{type.hint}</p>
      {chosen.type==="heroes"&&starIndex(chosen.current)>=0&&starIndex(chosen.target)>=0&&
        <div style={{...card,marginTop:10,background:"var(--bp-bg)",color:"var(--bp-text)"}}>
          <strong style={{fontSize:14}}>Calculated ascension shards: {Math.max(0,HERO_SHARD_CUMULATIVE[starIndex(chosen.target)]-HERO_SHARD_CUMULATIVE[starIndex(chosen.current)]).toLocaleString()}</strong>
          <p style={{fontSize:12,lineHeight:1.5,color:"var(--bp-muted2)",margin:"6px 0 0"}}>This covers completed star milestones only. Hero-unlock costs and partial star tiers aren't included. Assign the number to the correct hero-specific shard item, or to General Hero Shards only if they are eligible.</p>
        </div>
      }
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:12}}>
        <strong style={{fontSize:14,color:"var(--bp-text)"}}>Required resources</strong>
        <button style={btn} onClick={()=>setEditCosts(v=>!v)}>{editCosts?"Done":"Edit amounts"}</button>
      </div>
      {countsById(chosen.id)?.rows.map(r=>{
        const pct=r.required===0?100:Math.min(100,100*r.owned/r.required);
        return <div key={r.id} style={{borderBottom:"1px solid var(--bp-border)",padding:"12px 0",color:"var(--bp-text)"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,gap:8}}><strong>{itemLabel(r.id)}</strong><span>{Math.round(pct)}%</span></div>
          <div style={{background:"var(--bp-border3)",height:7,borderRadius:10,overflow:"hidden",margin:"8px 0"}}><div style={{background:"var(--bp-accent,#78917f)",width:pct+"%",height:"100%"}}/></div>
          <div style={{fontSize:12,color:"var(--bp-muted2)"}}>{formatAmount(r.owned)} owned / {formatAmount(r.required)} needed</div>
          <div style={{fontSize:12,fontWeight:700,color:r.remaining?"#a06358":"#5c7a6e",marginTop:3}}>{r.remaining?formatAmount(r.remaining)+" missing":"Target reached"}</div>
          {items.some(it=>it.id===r.id)&&<button style={{...btn,minHeight:34,marginTop:7}} onClick={()=>onUpdateResource(r.id)}>Update backpack</button>}
        </div>;
      })}
      {!countsById(chosen.id)?.tracked&&<p style={{fontSize:13,color:"var(--bp-muted2)"}}>No verified costs entered yet. Add them below to begin tracking.</p>}
      {editCosts&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9,marginTop:14}}>
        {[...options,...extraCosts].map(id=><label key={id} style={{fontSize:12,color:"var(--bp-muted2)"}}>{itemLabel(id)}
          <input style={{...input,marginTop:5}} value={chosen.requirements?.[id]||""} placeholder="Cost, e.g. 1.2M" onChange={e=>patchCost(chosen.id,id,e.target.value)} inputMode="decimal"/>
        </label>)}
        <label style={{fontSize:12,color:"var(--bp-muted2)"}}>Additional backpack item
          <select style={{...input,marginTop:5}} value="" onChange={e=>{if(e.target.value)patchCost(chosen.id,e.target.value,"");}}>
            <option value="">Choose item…</option>{items.filter(it=>!options.includes(it.id)&&!extraCosts.includes(it.id)).map(it=><option key={it.id} value={it.id}>{it.name}</option>)}
          </select>
        </label>
      </div>}
      <details style={{marginTop:15}}><summary style={{fontSize:13,fontWeight:700,color:"var(--bp-text)",cursor:"pointer"}}>Import cost totals from a calculator</summary>
        <p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.5}}>Paste resource names and totals, one per line: Fire Crystals,3000. This is a manual import; calculator formats may differ.</p>
        <textarea value={pasted} onChange={e=>setPasted(e.target.value)} rows={4} style={{...input,height:"auto"}} placeholder={"Fire Crystals,3000\nCoal,400M"}/>
        <button style={{...btn,marginTop:8}} onClick={importRows}>Import matching rows</button>
      </details>
      <label style={{display:"block",fontSize:12,color:"var(--bp-muted2)",marginTop:15}}>Cost source / reference URL<input style={{...input,marginTop:5}} value={chosen.source||""} onChange={e=>patch(chosen.id,{source:trim(e.target.value,500)})} placeholder="Calculator or in-game source"/></label>
      <label style={{display:"block",fontSize:12,color:"var(--bp-muted2)",marginTop:12}}>Notes & prerequisites<textarea style={{...input,marginTop:5,height:72,resize:"vertical"}} value={chosen.notes||""} onChange={e=>patch(chosen.id,{notes:trim(e.target.value,2000)})} placeholder="Required Embassy level, hero name, troop type…"/></label>
      <p style={{fontSize:11,color:"var(--bp-muted2)",lineHeight:1.5}}>Requirements are user-entered, not automatically verified. Material totals aren't deducted when a goal is completed. Multiple goals can count the same resources.</p>
      <button style={{...btn,borderColor:"#a06358",color:"#a06358",marginTop:8}} onClick={()=>{if(window.confirm("Delete this upgrade goal? Your backpack items will be kept."))deletePlan(chosen.id);}}>Delete goal</button>
      {info&&<p role="status" style={{fontSize:12,color:"var(--bp-muted2)"}}>{info}</p>}
    </>}
  </section>;
}
