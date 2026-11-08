import { useEffect, useMemo, useState } from "react";
import { formatAmount } from "./backpackConstants.js";

const RESOURCES = [
  { id:"meat", label:"Meat", aliases:["meat"] },
  { id:"wood", label:"Wood", aliases:["wood","lumber"] },
  { id:"coal", label:"Coal", aliases:["coal"] },
  { id:"iron", label:"Iron", aliases:["iron"] },
  { id:"fire-crystals", label:"Fire Crystals", aliases:["fire crystals","fire crystal","fc"] },
  { id:"refined-fire", label:"Refined Fire Crystals", aliases:["refined fire crystals","refined fire crystal","refined crystals","refined fc"] },
  { id:"steel", label:"Steel", aliases:["steel"] },
];
const blank = () => Object.fromEntries(RESOURCES.map(r => [r.id, ""]));
const num = value => {
  const s = String(value ?? "").replaceAll(",","").trim().replace(/\s/g,"");
  const m = s.match(/^([0-9]+(?:\.[0-9]+)?)([KMB])?$/i);
  if (!m) return NaN;
  return Number(m[1]) * ({K:1e3,M:1e6,B:1e9}[m[2]?.toUpperCase()] || 1);
};
const read = key => {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
};
const inputStyle = {width:"100%", minWidth:0, boxSizing:"border-box", padding:"12px", borderRadius:12, border:"1px solid var(--bp-border2)", background:"var(--bp-card)", color:"var(--bp-text)", fontSize:15};
const buttonStyle = {padding:"11px 15px", borderRadius:12, border:"1px solid var(--bp-border2)", background:"var(--bp-card)", color:"var(--bp-text)", fontWeight:700, cursor:"pointer"};
const heading = {fontSize:14, fontWeight:750, color:"var(--bp-text)"};

/** A deliberately source-agnostic import, not a connection to WOS Tools.
 * Only explicitly entered requirements are used; no estimated game costs.
 */
export default function FurnaceGoal({userId, balances, items, onUpdateResource}) {
  const key = "backpack-hub-furnace-goal-v1:" + (userId || "local-user");
  const [goal, setGoal] = useState(() => read(key) || {current:"FC5",target:"FC7",requirements:blank(),source:""});
  const [pasted,setPasted] = useState("");
  const [message,setMessage] = useState("");
  const [editing,setEditing] = useState(false);
  useEffect(() => { try { localStorage.setItem(key,JSON.stringify(goal)); } catch {} },[key,goal]);
  const setField = (field,value) => setGoal(g => ({...g,[field]:value}));
  const setRequirement = (id,value) => setGoal(g=>({...g,requirements:{...g.requirements,[id]:value}}));
  const status = useMemo(() => RESOURCES.map(r => {
    const raw=goal.requirements?.[r.id] ?? "";
    const required=raw === "" ? null : num(raw);
    const have=Math.max(0,Number(balances[r.id] || 0));
    const valid=required !== null && Number.isFinite(required) && required >= 0;
    return {...r,required:valid?required:null,have,missing:valid?Math.max(0,required-have):null};
  }),[goal.requirements,balances]);
  const known = status.filter(r=>r.required!==null);
  const complete = known.length>0 && known.every(r=>r.missing===0);
  const importLines = () => {
    const next={...goal.requirements};
    let count=0;
    // CSV, TSV, and resource:amount. Does not claim to support arbitrary exports.
    pasted.split(/\r?\n/).forEach(line=>{
      const cells=line.split(/[\t,;:]/).map(x=>x.trim().replace(/^["']|["']$/g,""));
      const id=RESOURCES.find(r=>r.aliases.some(a=>cells[0]?.toLowerCase()===a))?.id;
      const amount=cells.slice(1).map(num).find(n=>Number.isFinite(n)&&n>=0);
      if(id && amount!==undefined){next[id]=String(amount);count++;}
    });
    if(count){setGoal(g=>({...g,requirements:next,source:"Imported text (review figures)"}));setMessage(count+" resource values imported. Review all totals and prerequisites before relying on this goal.");setEditing(false);}
    else setMessage("No matching resource rows. Use lines such as Fire Crystals,3000 or Coal,400M.");
  };
  return <section style={{background:"var(--bp-card)",border:"1px solid var(--bp-border)",borderRadius:20,padding:16}}>
    <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",fontWeight:700,color:"var(--bp-muted2)"}}>Upgrade planner</div>
    <h3 style={{margin:"5px 0 8px",fontFamily:"Fraunces,serif",fontSize:23,color:"var(--bp-text)"}}>Furnace goal</h3>
    <p style={{fontSize:13,lineHeight:1.5,color:"var(--bp-muted2)",margin:"0 0 16px"}}>Enter verified total costs for the entire upgrade path, including prerequisites. Your existing backpack balances update this goal automatically.</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {["current","target"].map(field=><label key={field} style={{fontSize:12,color:"var(--bp-muted2)",fontWeight:700}}>
        {field==="current"?"Current furnace":"Target furnace"}
        <select value={goal[field]} onChange={e=>setField(field,e.target.value)} style={{...inputStyle,marginTop:6}}>{Array.from({length:11},(_,i)=><option key={i} value={"FC"+i}>{"FC"+i}</option>)}</select>
      </label>)}
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,margin:"16px 0 8px"}}>
      <div style={heading}>Required resources</div>
      <button style={buttonStyle} onClick={()=>setEditing(x=>!x)}>{editing?"Done":"Edit costs"}</button>
    </div>
    {known.length===0?<p style={{color:"var(--bp-muted2)",fontSize:13}}>No costs entered. Paste your calculator totals or enter them manually below.</p>:null}
    {status.filter(r=>r.required!==null).map(r=>{
      const pct=r.required===0?100:Math.min(100,100*r.have/r.required);
      return <div key={r.id} style={{borderTop:"1px solid var(--bp-border)",padding:"12px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:13,color:"var(--bp-text)"}}><strong>{r.label}</strong><span>{Math.round(pct)}%</span></div>
        <div style={{height:7,background:"var(--bp-border3)",borderRadius:10,overflow:"hidden",margin:"8px 0"}}><div style={{width:pct+"%",height:"100%",background:"#78917f",borderRadius:10}}/></div>
        <div style={{fontSize:12,color:"var(--bp-muted2)"}}>{formatAmount(r.have)} owned / {formatAmount(r.required)} needed</div>
        <div style={{fontSize:12,fontWeight:700,color:r.missing?"#a06358":"#5c7a6e",marginTop:4}}>{r.missing?formatAmount(r.missing)+" still needed":"Ready"}</div>
        {items.some(i=>i.id===r.id)&&onUpdateResource&&<button onClick={()=>onUpdateResource(r.id)} style={{...buttonStyle,marginTop:7,padding:"7px 11px",fontSize:12}}>Update backpack amount</button>}
      </div>;
    })}
    {complete&&<p style={{color:"#5c7a6e",fontWeight:700}}>All entered resource targets reached. Check building prerequisites before upgrading.</p>}
    {editing&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:12}}>
      {RESOURCES.map(r=><label key={r.id} style={{fontSize:12,color:"var(--bp-muted2)"}}>{r.label}<input style={{...inputStyle,marginTop:4}} inputMode="decimal" placeholder="0, 500K, 2.5M" value={goal.requirements?.[r.id]??""} onChange={e=>setRequirement(r.id,e.target.value)}/></label>)}
    </div>}
    <details style={{marginTop:16}}>
      <summary style={{...heading,cursor:"pointer"}}>Import calculator totals</summary>
      <p style={{fontSize:12,lineHeight:1.5,color:"var(--bp-muted2)"}}>Paste one resource per line as Name,Amount. For example: Fire Crystals,3000. This is a manual import, not a live connection to WOS Tools. Export formats vary, so verify imported amounts.</p>
      <textarea value={pasted} onChange={e=>setPasted(e.target.value)} rows={5} placeholder={"Fire Crystals,3000\nRefined Fire Crystals,200\nCoal,400M"} style={{...inputStyle,resize:"vertical"}}/>
      <button onClick={importLines} style={{...buttonStyle,marginTop:8}}>Import totals</button>
    </details>
    {message&&<p role="status" style={{fontSize:12,color:"var(--bp-muted2)"}}>{message}</p>}
    {goal.source&&<p style={{fontSize:11,color:"var(--bp-muted)"}}>Cost source: {goal.source}</p>}
    <p style={{fontSize:11,lineHeight:1.5,color:"var(--bp-muted)",marginBottom:0}}>All data stays in this browser and this backpack profile. Values are requirements, not deductions. Multiple goals may reference the same resources.</p>
  </section>;
}
