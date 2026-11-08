import {parseCompactAmount,parseSpeedupMinutes,parseSummaryText,parseSummaryTsv,mergeScanRows} from "./scanSummaryParser.js";

test("uses Total Resources rather than Total Items when parsing plain text",()=>{
 const output=parseSummaryText("Meat 326.28M 6.20B\nWood 403.73M 5.34B\nCoal 72.01M 1.02B\nIron 33.84M 428.49M\nSteel 659.50K\n");
 expect(output.find(x=>x.id==="meat")?.value).toBe(6200000000);
 expect(output.find(x=>x.id==="wood")?.value).toBe(5340000000);
 expect(output.find(x=>x.id==="coal")?.value).toBe(1020000000);
 expect(output.find(x=>x.id==="iron")?.value).toBe(428490000);
 expect(output.some(x=>x.id==="steel")).toBe(false); // one value is ambiguous without column x
});

test("parses compact numbers without rounding 6.20B down",()=>{
 expect(parseCompactAmount("305.69K")).toBe(305690);
 expect(parseCompactAmount("659.50K")).toBe(659500);
 expect(parseCompactAmount("15.05K")).toBe(15050);
 expect(parseCompactAmount("1.02B")).toBe(1020000000);
 expect(parseCompactAmount("")).toBeNull();
});

test("parses all speedup durations from example screenshots into minutes",()=>{
 const input=[
  ["General Speedup 3 day(s)14 hr(s)6 min",5166],
  ["Troop Training Speedup 37 day(s)23 hr(s)3 min",54663],
  ["Construction Speedup 2 day(s)1 hr(s)53 min",2993],
  ["Research Speedup 2 day(s)18 hr(s)20 min",3980],
  ["Learning Speedups 1 day(s)3 hr(s)55 min",1675],
  ["Troop Healing Speedup 64 day(s)5 hr(s)8 min",92468],
 ];
 for(const [line,expected] of input){
   const parsed=parseSummaryText(line);
   expect(parsed[0]?.value).toBe(expected);
 }
 expect(parseSpeedupMinutes("2d 18h 20m")).toBe(3980);
});

test("position-aware extraction ignores the Total Items middle column",()=>{
 const header="level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
 const word=(x,y,t,n)=>"5\t1\t1\t1\t"+n+"\t1\t"+x+"\t"+y+"\t120\t32\t96\t"+t;
 const tsv=[header,word(90,200,"Meat",1),word(340,200,"326.28M",1),word(590,200,"6.20B",1),
   word(90,290,"Steel",2),word(590,290,"659.50K",2)].join("\n");
 const rows=parseSummaryTsv(tsv,832,1100);
 expect(rows.find(r=>r.id==="meat")?.value).toBe(6200000000);
 expect(rows.find(r=>r.id==="steel")?.value).toBe(659500);
});

test("overlapping screenshots do not double totals, but conflicting OCR is flagged",()=>{
 const old=[{id:"wood",value:5340000000}];
 expect(mergeScanRows(old,[{id:"wood",value:5340000000}])).toHaveLength(1);
 const changed=mergeScanRows(old,[{id:"wood",value:5300000000}]);
 expect(changed).toHaveLength(1);
 expect(changed[0].conflict).toBe(true);
});
