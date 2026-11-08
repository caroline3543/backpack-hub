import { useEffect,useRef,useState } from "react";
import { formatAmount,formatMinutes } from "./backpackConstants.js";
import { SCAN_LABELS,parseCompactAmount,parseSpeedupMinutes,parseSummaryText,parseSummaryTsv,mergeScanRows } from "./scanSummaryParser.js";

const panel={padding:16,border:"1px solid var(--bp-border2)",borderRadius:18,background:"var(--bp-card)"};
const button={border:"1px solid var(--bp-border2)",borderRadius:12,padding:"12px 14px",minHeight:44,fontSize:14,fontWeight:700,background:"var(--bp-card)",color:"var(--bp-text)",cursor:"pointer"};
const display=(id,n)=>id.startsWith("speedup-")?formatMinutes(n):formatAmount(n);
const safeValue=(id,text)=>id.startsWith("speedup-")
  ?(parseSpeedupMinutes(text)??parseCompactAmount(text))
  :parseCompactAmount(text);
const label=id=>SCAN_LABELS.find(row=>row.id===id)?.name||id;
const uploadImage=async file=>{
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    const loaded=new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
    img.src=url;await loaded;
    // The WOS modal is centred in typical tall game screenshots.
    // Crop surrounding blurred inventory to improve recognition.
    const tall=img.height/img.width>1.55;
    const sy=tall?Math.round(img.height*.21):0;
    const sh=tall?Math.round(img.height*.59):img.height;
    const canvas=document.createElement("canvas");
    const scale=Math.min(2,2100/img.width);
    canvas.width=Math.round(img.width*scale);
    canvas.height=Math.round(sh*scale);
    const ctx=canvas.getContext("2d",{willReadFrequently:false});
    if(!ctx)throw Error("Unable to prepare the screenshot.");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,sy,img.width,sh,0,0,canvas.width,canvas.height);
    return canvas;
  }finally{URL.revokeObjectURL(url);}
};
export default function BackpackScanner({items,balances,onApply}){
 const fileRef=useRef(null);
 const workingRef=useRef(false);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [rows,setRows]=useState([]);
 const [originals,setOriginals]=useState([]);
 const [rawText,setRawText]=useState("");
 const [manualText,setManualText]=useState("");
 const [selected,setSelected]=useState({});
 const [drafts,setDrafts]=useState({});
 const [confirm,setConfirm]=useState(false);
 const [complete,setComplete]=useState("");
 useEffect(()=>()=>{originals.forEach(x=>URL.revokeObjectURL(x.url));},[originals]);
 const addRows=found=>{
   setRows(previous=>{
     const merged=mergeScanRows(previous,found);
     setDrafts(d=>{const next={...d};merged.forEach(r=>{if(next[r.id]===undefined||r.conflict)next[r.id]=String(r.value);});return next;});
     setSelected(d=>{const next={...d};merged.forEach(r=>{if(next[r.id]===undefined)next[r.id]=true;});return next;});
     return merged;
   });
 };
 const scan=async event=>{
   const incoming=[...(event.target.files||[])];
   event.target.value="";
   if(!incoming.length||workingRef.current)return;
   if(incoming.length>8){setError("Choose up to 8 screenshots per scan.");return;}
   workingRef.current=true;setBusy(true);setError("");setComplete("");setConfirm(false);
   let worker;
   try{
     const {createWorker}=await import("tesseract.js");
     worker=await createWorker("eng",1,{logger:m=>{
       if(m.status==="recognizing text")setProgress("Reading text · "+Math.round((m.progress||0)*100)+"%");
       else if(m.status)setProgress(m.status);
     }});
     for(let i=0;i<incoming.length;i++){
       const file=incoming[i];
       if(!file.type.startsWith("image/")){setError("Unsupported file ignored: "+file.name);continue;}
       setProgress("Screenshot "+(i+1)+" of "+incoming.length);
       const canvas=await uploadImage(file);
       const result=await worker.recognize(canvas,{}, {tsv:true});
       const txt=result?.data?.text||"";
       const found=mergeScanRows(parseSummaryTsv(result?.data?.tsv||"",canvas.width,canvas.height),parseSummaryText(txt));
       // Prefer position-aware numbers. Text-only OCR may confuse the "Total Items"
       // column; never auto-check text-only resource results without confirmation.
       const byId=new Map(found.map(r=>[r.id,r]));
       addRows([...byId.values()]);
       setRawText(previous=>[previous,txt].filter(Boolean).join("\n\n--- Screenshot "+(i+1)+" ---\n"));
       setOriginals(previous=>[...previous,{name:file.name,url:URL.createObjectURL(file)}]);
     }
   }catch(ex){setError("Could not read the screenshot: "+(ex?.message||"OCR unavailable")+". Try a clearer screenshot or paste text below.");}
   finally{try{await worker?.terminate();}catch{}workingRef.current=false;setBusy(false);setProgress("");}
 };
 const manualParse=()=>{
   const parsed=parseSummaryText(manualText);
   if(!parsed.length){setError("No readable resource totals found. For resources enter a label and both columns, e.g. Meat 326.28M 6.20B.");return;}
   addRows(parsed);setError("");setComplete("");
 };
 const edits=rows.filter(row=>selected[row.id]).map(row=>({
   ...row,input:drafts[row.id]??String(row.value),
   parsed:safeValue(row.id,drafts[row.id]??String(row.value)),
   item:items.find(item=>item.id===row.id)
 }));
 const invalid=edits.filter(row=>row.parsed===null||!row.item);
 const save=async()=>{
   if(!confirm)return;
   if(invalid.length){setError("Correct invalid or untracked entries before importing.");return;}
   try{
     // Per-item setTotal updates existing balances using the app's own history,
     // not additive totals. A second scan won't double the inventory.
     for(const row of edits)await onApply(row.id,row.parsed);
     setComplete("Saved "+edits.length+" reviewed balances to your backpack.");
     setConfirm(false);setError("");
   }catch(e){setError("Import interrupted: "+(e?.message||"Unknown error")+". Check balances before trying again.");}
 };
 return <section style={{display:"grid",gap:14,paddingBottom:16}}>
   <div style={panel}>
     <div style={{fontSize:11,letterSpacing:1.2,textTransform:"uppercase",fontWeight:750,color:"var(--bp-muted2)"}}>Screenshot importer</div>
     <h2 style={{fontSize:26,fontFamily:"Fraunces,serif",color:"var(--bp-text)",margin:"5px 0 8px"}}>Scan Backpack</h2>
     <p style={{fontSize:13,lineHeight:1.6,color:"var(--bp-muted2)",margin:"0 0 14px"}}>Upload the game's <strong>Resource &amp; Speedup Summary</strong> screenshots. You can add several screenshots to cover the whole list. Review the detected totals before updating your backpack.</p>
     <input ref={fileRef} type="file" multiple accept="image/*" onChange={scan} style={{display:"none"}} aria-label="Choose WOS summary screenshots" />
     <button style={{...button,width:"100%",background:"var(--bp-accent,#78917f)",color:"#fff"}} disabled={busy} onClick={()=>fileRef.current?.click()}>
       {busy?"Reading screenshots…":"＋ Add screenshots"}
     </button>
     <p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.5}}>Use the game's Resources and Speedup tabs. Only <strong>Total Resources</strong> is used for materials, not Total Items. Speedups are converted to minutes. Screenshot processing happens in your browser, with OCR language files downloaded when needed.</p>
     {busy&&<p role="status" style={{fontSize:13,color:"var(--bp-text)"}}>{progress||"Preparing OCR…"}</p>}
   </div>
   {originals.length>0&&<div style={panel}>
     <strong style={{color:"var(--bp-text)",fontSize:14}}>Screenshots added ({originals.length})</strong>
     <div style={{display:"flex",gap:8,overflowX:"auto",padding:"10px 0 0"}}>
       {originals.map((img,i)=><img key={i} src={img.url} alt={"Screenshot "+(i+1)+": "+img.name} style={{width:88,height:160,objectFit:"contain",background:"var(--bp-bg)",borderRadius:8,flexShrink:0}}/>)}
     </div>
   </div>}
   {!!rows.length&&<div style={panel}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
       <h3 style={{fontSize:19,color:"var(--bp-text)",margin:0}}>Review detected totals</h3>
       <button style={{...button,minHeight:36,padding:"6px 10px"}} onClick={()=>{setRows([]);setDrafts({});setSelected({});setConfirm(false);setComplete("");setOriginals([]);}}>Clear</button>
     </div>
     <p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.55}}>OCR can misread K, M, B and numbers. Check every field. Only checked values will replace current balances.</p>
     {rows.map(row=>{
       const existing=items.find(item=>item.id===row.id);
       const parsed=safeValue(row.id,drafts[row.id]??String(row.value));
       return <div key={row.id} style={{padding:"12px 0",borderTop:"1px solid var(--bp-border)",display:"grid",gridTemplateColumns:"28px minmax(0,1fr)",gap:9}}>
         <input type="checkbox" aria-label={"Import "+label(row.id)} checked={!!selected[row.id]} onChange={e=>{setSelected(prev=>({...prev,[row.id]:e.target.checked}));setConfirm(false);}} style={{width:22,height:22,marginTop:6}}/>
         <div style={{minWidth:0}}>
           <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline"}}>
             <strong style={{color:"var(--bp-text)",fontSize:14}}>{label(row.id)}</strong>
             <span style={{color:"var(--bp-muted2)",fontSize:11}}>Current {display(row.id,balances[row.id]||0)}</span>
           </div>
           <input aria-label={label(row.id)+" detected total"} value={drafts[row.id]??String(row.value)}
             onChange={e=>{setDrafts(prev=>({...prev,[row.id]:e.target.value}));setConfirm(false);}}
             style={{width:"100%",boxSizing:"border-box",marginTop:6,height:44,borderRadius:10,border:"1px solid var(--bp-border2)",padding:"8px 10px",fontSize:16,color:"var(--bp-text)",background:"var(--bp-card)"}}/>
           <div style={{fontSize:12,marginTop:5,color:row.conflict?"#a06358":"var(--bp-muted2)"}}>
             {parsed===null?"Invalid amount":("Will set to "+display(row.id,parsed))}
             {row.conflict?" · Different totals found across screenshots":""}
             {!existing?" · Item not tracked in Backpack":""}
           </div>
         </div>
       </div>;
     })}
     <div style={{fontSize:12,lineHeight:1.5,color:"var(--bp-muted2)",margin:"10px 0"}}>{edits.length} selected · Updates are absolute totals, not additions. Unselected balances stay unchanged.</div>
     {invalid.length>0&&<p role="alert" style={{fontSize:12,color:"#a06358"}}>Some selected values are invalid or do not have a matching backpack item. Correct or deselect them.</p>}
     {!confirm?<button style={{...button,width:"100%",background:"var(--bp-accent,#78917f)",color:"#fff"}} disabled={!edits.length||invalid.length>0||busy} onClick={()=>setConfirm(true)}>Review import ({edits.length})</button>:
       <div style={{padding:12,border:"1px solid #b99360",borderRadius:12}}>
         <strong style={{fontSize:14,color:"var(--bp-text)"}}>Confirm changes to {edits.length} backpack balances?</strong>
         <p style={{fontSize:12,color:"var(--bp-muted2)"}}>The selected resources will be replaced with these reviewed totals. This action records changes in inventory history.</p>
         <div style={{display:"flex",gap:8}}>
           <button style={{...button,flex:1}} onClick={()=>setConfirm(false)}>Cancel</button>
           <button style={{...button,flex:1,background:"var(--bp-accent,#78917f)",color:"#fff"}} onClick={save} disabled={busy}>Import totals</button>
         </div>
       </div>}
   </div>}
   <details style={panel}><summary style={{fontSize:13,fontWeight:750,color:"var(--bp-text)",cursor:"pointer"}}>OCR text fallback</summary>
     <p style={{fontSize:12,color:"var(--bp-muted2)",lineHeight:1.5}}>If detection misses a row, paste corrected screenshot text here. For material totals, include both displayed columns to avoid confusing item counts with amounts.</p>
     <textarea rows={5} value={manualText} onChange={e=>setManualText(e.target.value)} placeholder={"Meat 326.28M 6.20B\nWood 403.73M 5.34B\nGeneral Speedup 3 day(s)14 hr(s)6 min"} style={{width:"100%",boxSizing:"border-box",padding:10,borderRadius:10,fontSize:13,background:"var(--bp-card)",color:"var(--bp-text)",border:"1px solid var(--bp-border2)"}}/>
     <button style={{...button,width:"100%",marginTop:8}} onClick={manualParse}>Add parsed text</button>
     {rawText&&<details style={{marginTop:12}}><summary style={{fontSize:12,color:"var(--bp-muted2)"}}>View raw OCR output</summary><pre style={{fontSize:11,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:260,overflow:"auto",color:"var(--bp-muted2)"}}>{rawText}</pre></details>}
   </details>
   {error&&<div role="alert" style={{fontSize:13,color:"#a06358"}}>{error}</div>}
   {complete&&<div role="status" style={{fontSize:13,color:"#56856e",fontWeight:700}}>{complete}</div>}
 </section>;
}
