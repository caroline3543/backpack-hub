// Pure, testable upgrade planning helpers. Units are stored as base values.
export function parseUpgradeAmount(value) {
  const text=String(value ?? "").replace(/,/g,"").replace(/\s/g,"").trim();
  if(!text)return null;
  const match=text.match(/^(\d+(?:\.\d+)?)([kmb])?$/i);
  if(!match)return null;
  const n=Number(match[1])*({k:1e3,m:1e6,b:1e9}[match[2]?.toLowerCase()]||1);
  return Number.isSafeInteger(n) || (Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER)
    ? n>=0?n:null : null;
}

/** Accept only resource-name<delimiter>amount, preserving thousands separators.
 * Never try to extract the first number from an arbitrary spreadsheet column.
 * Unrecognized rows are reported, not silently converted.
 */
export function parseUpgradeImport(text, nameToId) {
  const costs={};let imported=0;let skipped=0;let empty=0;
  String(text||"").split(/\r?\n/).forEach(line=>{
    if(!line.trim()){empty++;return;}
    const match=line.trim().match(/^([^\t,;:]+)[\t,;:]\s*(.+)$/);
    if(!match){skipped++;return;}
    const itemName=match[1].trim().replace(/^["']|["']$/g,"").toLowerCase();
    const id=nameToId.get(itemName);
    const amount=parseUpgradeAmount(match[2].trim().replace(/^["']|["']$/g,""));
    if(!id || amount===null){skipped++;return;}
    costs[id]=String(amount);
    imported++;
  });
  return {costs,imported,skipped,empty};
}

export function upgradeRequirements(plan,balances) {
  return Object.entries(plan?.requirements||{}).map(([id,raw])=>{
    const required=parseUpgradeAmount(raw);
    const balance=Number(balances?.[id]);
    const owned=Number.isFinite(balance)?Math.max(0,balance):0;
    return {id,required,owned,remaining:required===null?null:Math.max(0,required-owned)};
  });
}

export function combinedResourceNeeds(plans,balances) {
  const totals=new Map();
  for(const plan of plans||[]) {
    for(const [id,raw] of Object.entries(plan.requirements||{})) {
      const n=parseUpgradeAmount(raw);
      if(n===null)continue;
      const previous=totals.get(id)||{needed:0,projects:0};
      totals.set(id,{needed:previous.needed+n,projects:previous.projects+1});
    }
  }
  return [...totals.entries()].map(([id,{needed,projects}])=>{
    const owned=Math.max(0,Number(balances?.[id])||0);
    return {id,needed,projects,owned,missing:Math.max(0,needed-owned)};
  });
}
