// Screenshot extraction for Whiteout Survival's Resource & Speedup Summary.
// Values from the "Total Items" column must NEVER be used as resource totals.
// OCR is advisory only; no writes occur until a human reviews and confirms.

export const SCAN_LABELS=[
 {id:"gems",name:"Gems",patterns:[/\bgems?\b/i]},
 {id:"meat",name:"Meat",patterns:[/\bmeat\b/i]},
 {id:"wood",name:"Wood",patterns:[/\bwood\b/i]},
 {id:"coal",name:"Coal",patterns:[/\bcoal\b/i]},
 {id:"iron",name:"Iron",patterns:[/\biron\b/i]},
 {id:"steel",name:"Steel",patterns:[/\bsteel\b/i]},
 {id:"chief-stamina",name:"Chief Stamina",patterns:[/\bchief\s*stamina\b/i]},
 {id:"hero-xp",name:"Hero XP",patterns:[/\bhero\s*xp\b/i]},
 {id:"pet-food",name:"Pet Food",patterns:[/\bpet\s*food\b/i]},
 {id:"speedup-general",name:"General Speedup",patterns:[/\bgeneral\s*speed\s*ups?\b/i]},
 {id:"speedup-troop",name:"Troop Training Speedup",patterns:[/\btroop\s*training\b/i]},
 {id:"speedup-construction",name:"Construction Speedup",patterns:[/\bconstruction\b/i]},
 {id:"speedup-research",name:"Research Speedup",patterns:[/\bresearch\b/i]},
 {id:"speedup-learning",name:"Learning Speedups",patterns:[/\blearning\s*speed\s*ups?\b/i]},
 {id:"speedup-healing",name:"Troop Healing Speedup",patterns:[/\b(?:troop\s*)?healing\b/i]},
];
const MINUTE_IDS=new Set(SCAN_LABELS.filter(x=>x.id.startsWith("speedup-")).map(x=>x.id));

export function parseCompactAmount(value){
 const text=String(value||"").replace(/[,\s]/g,"").trim();
 const match=text.match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
 if(!match)return null;
 const number=Number(match[1])*({K:1e3,M:1e6,B:1e9}[match[2]?.toUpperCase()]||1);
 return Number.isFinite(number)&&number>=0&&number<=Number.MAX_SAFE_INTEGER?Math.round(number):null;
}
export function parseSpeedupMinutes(value){
 const text=String(value||"").replace(/\s+/g," ").trim().toLowerCase();
 if(!text)return null;
 // Recognises "3 day(s)14 hr(s)6 min", "37d 23h 3m" and subsets.
 const pattern=/(\d+)\s*(?:day\s*\(?s\)?|days?|d\b|hours?|hrs?\s*\(?s\)?|h\b|minutes?|mins?|m\b)/gi;
 let match,total=0,found=false;
 while((match=pattern.exec(text))){
   const raw=match[0].toLowerCase();
   const n=Number(match[1]);found=true;
   if(/day|\d\s*d$/.test(raw))total+=n*1440;
   else if(/hour|hr|\d\s*h$/.test(raw))total+=n*60;
   else total+=n;
 }
 return found?total:null;
}
function identifyName(label){
 const normalized=String(label||"").replace(/[|_]/g," ").replace(/\s+/g," ").trim();
 return SCAN_LABELS.find(row=>row.patterns.some(p=>p.test(normalized)))||null;
}
export function parseSummaryText(text){
 const rows=[];
 const lines=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const seen=new Set();
 for(let i=0;i<lines.length;i++){
   const entry=identifyName(lines[i]);
   if(!entry||seen.has(entry.id))continue;
   // OCR text sometimes puts a row's total on the following line.
   const same=lines[i].replace(entry.patterns[0],"").trim();
   const next=lines[i+1]||"";
   let value;
   if(MINUTE_IDS.has(entry.id)){
     value=parseSpeedupMinutes(same);
     if(value===null)value=parseSpeedupMinutes(next);
   }else{
     const amounts=same.match(/\d[\d,.]*\s*[KMB]?\b/gi)||[];
     // "Meat 326.28M 6.20B": the LAST value is Total Resources.
     // A lone amount is ambiguous without x-position; reject rather than guess.
     value=amounts.length>=2?parseCompactAmount(amounts.at(-1)):null;
   }
   if(value!==null&&value!==undefined){rows.push({id:entry.id,value,confidence:"needs-review",source:"text"});seen.add(entry.id);}
 }
 return rows;
}
/** Tesseract TSV retains x/y coordinates, allowing the rightmost Total Resources
 * column to be selected even when it reflows the label into two OCR lines.
 * Width and height refer to the image submitted to the recognizer.
 */
export function parseSummaryTsv(tsv,width,height){
 const tokens=[];
 const lines=String(tsv||"").split(/\r?\n/);
 for(const line of lines.slice(1)){
   const c=line.split("\t");
   if(c.length<12||c[0]!=="5")continue;
   const [x,y,w,h]=[Number(c[6]),Number(c[7]),Number(c[8]),Number(c[9])];
   const conf=Number(c[10]),word=c.slice(11).join("\t").trim();
   if(!word||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(w)||!Number.isFinite(h)||conf<20)continue;
   tokens.push({x,y,w,h,conf,word,center:y+h/2});
 }
 if(!tokens.length||!width||!height)return [];
 const found=[];
 const sorted=tokens.sort((a,b)=>a.center-b.center||a.x-b.x);
 // Construct visually grouped lines. A wrapped "Troop Training Speedup"
 // label may occupy two lines: use the previous one as context.
 const groups=[];
 for(const token of sorted){
   let group=groups.find(g=>Math.abs(g.center-token.center)<=Math.max(12,token.h*.65));
   if(!group){group={center:token.center,tokens:[]};groups.push(group);}
   group.tokens.push(token);
   group.center=group.tokens.reduce((n,x)=>n+x.center,0)/group.tokens.length;
 }
 groups.sort((a,b)=>a.center-b.center);
 for(let i=0;i<groups.length;i++){
   const group=groups[i],ordered=[...group.tokens].sort((a,b)=>a.x-b.x);
   const labelTokens=ordered.filter(t=>t.x<width*.57);
   const label=labelTokens.map(t=>t.word).join(" ");
   const previous=i>0?groups[i-1].tokens.filter(t=>t.x<width*.57).map(t=>t.word).join(" "):"";
   let entry=identifyName(label);
   if(!entry)entry=identifyName(previous+" "+label);
   if(!entry)continue;
   // Crop x bound excludes the middle "Total Items" column on Resources tab.
   const right=ordered.filter(t=>t.x>=width*.585).map(t=>t.word).join(" ");
   // If the value is at the start of the next line due to row wrapping,
   // the review screen is safer than using an unrelated number.
   let amount=null;
   if(MINUTE_IDS.has(entry.id))amount=parseSpeedupMinutes(right);
   else {
     const foundAmounts=right.match(/\d[\d,.]*\s*[KMB]?\b/gi)||[];
     amount=foundAmounts.length?parseCompactAmount(foundAmounts.at(-1)):null;
   }
   if(amount!==null){
     found.push({id:entry.id,value:amount,confidence:"needs-review",source:"positioned"});
   }
 }
 return found.filter((row,index)=>found.findIndex(r=>r.id===row.id)===index);
}
export function mergeScanRows(previous,incoming){
 const map=new Map((previous||[]).map(x=>[x.id,x]));
 for(const row of incoming||[]){
   const prior=map.get(row.id);
   if(prior&&prior.value!==row.value){
     map.set(row.id,{...row,conflict:true,previousValue:prior.value});
   }else if(!prior)map.set(row.id,{...row,conflict:false});
 }
 return [...map.values()];
}
