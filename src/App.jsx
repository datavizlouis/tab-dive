import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ─── Utilities ────────────────────────────────────────
const KNOWN_PREFIXES = /^(pcdf:|pcdiff:|pctgt:|running:|window:|rank:|index:|first:|last:|lookup:|size:|usr:|attr:|sum:|avg:|min:|max:|count:|countd:|stdev:|var:|median:|percentile:|year:|quarter:|month:|week:|day:|hour:|minute:|second:|my:|mdy:|hms:|none:)+/i;
const cleanTok = t => {
  if (!t) return "";
  let s = String(t).trim();
  const dotted = s.match(/\[([^\]]+)\]\.\[([^\]]+)\]/);
  if (dotted) { s = dotted[2]; }
  else { s = s.replace(/^\[|\]$/g, ""); }
  s = s.replace(KNOWN_PREFIXES, "");
  s = s.replace(/:(nk|qk|ok|pk\d*|iqk|iqnk|qn|nn)$/i, "");
  return s.trim();
};
const tokShelf = shelf => { if (!shelf) return []; const m=[], re=/\[[^\]]+\](?:\.\[[^\]]+\])?/g; let x; while((x=re.exec(shelf))!==null)m.push(x[0]); return m.length?m:shelf.split(",").map(s=>s.trim()).filter(Boolean); };
const TYPE_NORM={"sheet":"worksheet","view":"worksheet","filter-card":"filter","filterCard":"filter","filter-control":"filter","web-view":"web","webView":"web","line":"blank","empty":"blank","bitmap":"image"};
const effType = z => { const raw=z.typeV2||z.type||"blank"; return TYPE_NORM[raw]||raw; };
const isCont = z => { const t=effType(z); return t==="layout-basic"||t==="layout-flow"; };

// ─── SVG Icon system ──────────────────────────────────
const ICONS={
  overview:    <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  database:    <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></>,
  fields:      <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  dashboard:   <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="15" y1="9" x2="15" y2="21"/></>,
  worksheet:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  issues:      <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  chart:       <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  search:      <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  pin:         <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  check:       <><polyline points="20 6 9 17 4 12"/></>,
  funnel:      <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  enc_color:   <><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>,
  enc_size:    <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="11"/></>,
  enc_label:   <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  enc_tooltip: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  enc_wave:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  cols_shelf:  <><rect x="2" y="5" width="8" height="14" rx="1"/><rect x="14" y="5" width="8" height="14" rx="1"/></>,
  rows_shelf:  <><rect x="5" y="2" width="14" height="8" rx="1"/><rect x="5" y="14" width="14" height="8" rx="1"/></>,
  ft_param:    <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  ft_calc:     <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  ft_measure:  <><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></>,
  ft_dim:      <><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>,
  z_sheet:     <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
  z_text:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  z_image:     <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
  z_blank:     <><rect x="3" y="3" width="18" height="18" rx="2"/></>,
  z_title:     <><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></>,
  z_filter:    <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  z_param:     <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  z_legend:    <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></>,
  z_web:       <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  z_layout:    <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></>,
};
function Icon({name,size=14,color="currentColor",strokeWidth=1.75,style={}}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block",flexShrink:0,verticalAlign:"middle",...style}}>{ICONS[name]||null}</svg>;
}
const ZICON_MAP={worksheet:"z_sheet",text:"z_text",image:"z_image",blank:"z_blank",title:"z_title",filter:"z_filter",parameter:"z_param",legend:"z_legend",web:"z_web","layout-basic":"z_layout","layout-flow":"z_layout"};
const zIcon=t=>{const n=ZICON_MAP[t];return n?<Icon name={n} size={12}/>:null;};

const AGG_MAP = {sum:"SUM",avg:"AVG",min:"MIN",max:"MAX",count:"COUNT",countd:"COUNTD",stdev:"STDEV",var:"VAR",median:"MEDIAN",percentile:"PERCENTILE",year:"YEAR",quarter:"QUARTER",month:"MONTH",week:"WEEK",day:"DAY",hour:"HOUR",minute:"MINUTE",second:"SECOND"};
function extractAgg(t){
  if(!t)return null;
  let s=String(t).trim();
  if(/\[.*?\]\.\[.*?\]/.test(s))return null;
  s=s.replace(/^\[|\]$/g,"");
  s=s.replace(/^(pcto:|pctgt:|running:|window:|rank\w*:|index:|first:|last:|lookup:|size:)+/i,"");
  const m=s.match(/^([a-z]+):/i);
  if(m&&AGG_MAP[m[1].toLowerCase()])return AGG_MAP[m[1].toLowerCase()];
  return null;
}
function parseZone(el) {
  const ga=a=>el.getAttribute(a);
  const fmts={};
  el.querySelectorAll(":scope > zone-style > format").forEach(f=>{const a=f.getAttribute("attr"),v=f.getAttribute("value");if(a&&v!=null)fmts[a]=v;});
  const gf=a=>ga(a)??fmts[a]??null;
  const id=ga("id")||Math.random().toString(36).slice(2);
  const type=ga("type")||"layout-basic", typeV2=ga("type-v2")||type;
  const param=ga("param")||"";
  const name=ga("name")||"", friendlyName=ga("friendly-name")||name||param;
  const x=parseFloat(ga("x")||"0"),y=parseFloat(ga("y")||"0"),w=parseFloat(ga("w")||"0"),h=parseFloat(ga("h")||"0");
  const loEl=el.querySelector(":scope > layout-options"); let rawDir=loEl?.getAttribute("direction")||null;
  const children=[];
  Array.from(el.children).forEach(c=>{if(c.tagName==="zone")children.push(parseZone(c));if(c.tagName==="zones")Array.from(c.children).forEach(gc=>{if(gc.tagName==="zone")children.push(parseZone(gc));});});
  if(!rawDir&&children.length>1){const xs=children.map(c=>c.x),ys=children.map(c=>c.y);rawDir=(Math.max(...xs)-Math.min(...xs))>=(Math.max(...ys)-Math.min(...ys))?"LR":"TB";}
  return {id,type,typeV2,name,friendlyName,param,x,y,w,h,rawDir:rawDir||"TB",fixedSize:gf("fixed-size"),
    margin:gf("margin"),marginLeft:gf("margin-left"),marginRight:gf("margin-right"),marginTop:gf("margin-top"),marginBottom:gf("margin-bottom"),
    padding:gf("padding"),paddingLeft:gf("padding-left"),paddingRight:gf("padding-right"),paddingTop:gf("padding-top"),paddingBottom:gf("padding-bottom"),
    borderColor:gf("border-color"),borderStyle:gf("border-style"),borderWidth:gf("border-width"),bgColor:gf("background-color"),children};
}
function enrichZones(z,parentDir=null){
  z.parentDirection=parentDir; z.direction=z.rawDir==="LR"?"horizontal":"vertical";
  const fs=z.fixedSize!=null?parseFloat(z.fixedSize):null; z.fixedSize=isNaN(fs)?null:fs; z.isFixed=z.fixedSize!=null&&z.fixedSize>0;
  const st={},s=(k,v)=>{if(v!=null)st[k]=v;};
  s("border-color",z.borderColor);s("border-style",z.borderStyle);s("border-width",z.borderWidth);s("background-color",z.bgColor);
  s("margin",z.margin);s("margin-left",z.marginLeft);s("margin-right",z.marginRight);s("margin-top",z.marginTop);s("margin-bottom",z.marginBottom);
  s("padding",z.padding);s("padding-left",z.paddingLeft);s("padding-right",z.paddingRight);s("padding-top",z.paddingTop);s("padding-bottom",z.paddingBottom);
  z.style=st; z.children=z.children.map(c=>enrichZones(c,z.direction)); return z;
}

function resolveNames(allFields){
  const cDs={};allFields.forEach(f=>{if(!cDs[f.caption])cDs[f.caption]=new Set();cDs[f.caption].add(f.dsName);});
  allFields.forEach(f=>{const raw=f.name.replace(/^\[|\]$/g,"");f.isAutoNamed=/^\./.test(raw)||/^\[?Calculation_\d+/i.test(f.name)||/^\[?Calc_\d+/i.test(f.name);f.isCopy=/\(copy\)/i.test(f.caption)||/\(copy\)/i.test(raw);f.hasConflict=(cDs[f.caption]?.size||0)>1;f.resolvedCaption=f.caption;});
}

function parseSchemaFromEl(dsEl){
  const tables=[],joins=[];let customSQL=null;
  const walk=rel=>{const type=rel.getAttribute("type")||"";if(type==="text"||type==="custom-sql"){customSQL=rel.textContent?.trim()||null;return;}if(type==="join"){const jtype=rel.getAttribute("join")||"inner",ch=[...rel.children].filter(c=>c.tagName==="relation");let cond="";const clause=rel.querySelector(":scope > clause");if(clause){const expr=clause.querySelector("expression[op='=']");if(expr){const pts=[...expr.children].map(e=>(e.getAttribute("field")||"").replace(/^\[|\]$/g,"")).filter(Boolean);if(pts.length===2)cond=pts.join(" = ");}}if(ch[0]&&ch[1]){const gn=r=>r.getAttribute("name")||r.getAttribute("table")||r.getAttribute("alias")||"";joins.push({left:gn(ch[0]),right:gn(ch[1]),type:jtype,condition:cond});ch.forEach(walk);}}else{const name=rel.getAttribute("name")||rel.getAttribute("table")||"",alias=rel.getAttribute("alias")||name;if(name&&!tables.find(t=>t.name===name))tables.push({name,alias,columns:[]});}};
  const conn=dsEl.querySelector(":scope > connection"),root=conn?.querySelector(":scope > relation")||dsEl.querySelector(":scope > relation");if(root)walk(root);
  dsEl.querySelectorAll(":scope > column").forEach(col=>{const n=col.getAttribute("name")||"",m=n.match(/^\[([^\]]+)\]\.\[([^\]]+)\]$/);if(m){const t=tables.find(t=>t.name===m[1]||t.alias===m[1]),cap=col.getAttribute("caption")||m[2];if(t&&!t.columns.includes(cap))t.columns.push(cap);}});
  return{tables,joins,customSQL};
}

function parseTableau(xmlStr){
  const doc=new DOMParser().parseFromString(xmlStr,"text/xml");
  if(doc.querySelector("parseerror"))throw new Error("Invalid XML — ensure this is an unpackaged .twb file");
  const datasources=[],allFields=[];
  doc.querySelectorAll("datasources > datasource").forEach(ds=>{
    const name=ds.getAttribute("name")||"",caption=ds.getAttribute("caption")||name;
    const conn=ds.querySelector("connection")||ds.querySelector("named-connection connection");
    const dbclass=conn?.getAttribute("class")||"",server=conn?.getAttribute("server")||conn?.getAttribute("filename")||conn?.getAttribute("dbname")||"",database=conn?.getAttribute("database")||"";
    const fields=[];
    ds.querySelectorAll("column").forEach(col=>{const n=col.getAttribute("name")||"";if(!n)return;const cap=col.getAttribute("caption")||n.replace(/^\[|\]$/g,""),datatype=col.getAttribute("datatype")||"",role=col.getAttribute("role")||"",hidden=col.getAttribute("hidden")==="true",calcEl=col.querySelector("calculation"),formula=calcEl?.getAttribute("formula")||"",isParam=col.getAttribute("param-domain-type")!=null||name==="Parameters";fields.push({id:`${name}::${n}`,name:n,caption:cap,resolvedCaption:cap,datatype,role,formula,hidden,isParam,datasource:caption||name,dsName:name,isCalc:!!formula,isAutoNamed:false,isCopy:false,hasConflict:false,usageCount:0,usedInSheets:[]});});
    if(name!=="Parameters"&&fields.length>0){const{tables,joins,customSQL}=parseSchemaFromEl(ds);datasources.push({name,caption:caption||name,dbclass,server,database,fields,tables,joins,customSQL});allFields.push(...fields.filter(f=>!f.isParam));}
  });
  resolveNames(allFields);
  const byId={};allFields.forEach(f=>{byId[f.id]=f;});
  datasources.forEach(ds=>{ds.fields.forEach(f=>{const r=byId[f.id];if(r){f.resolvedCaption=r.resolvedCaption;f.isAutoNamed=r.isAutoNamed;f.isCopy=r.isCopy;f.hasConflict=r.hasConflict;}});});
  const paramDs=doc.querySelector("datasources > datasource[name='Parameters']"),parameters=[];
  paramDs?.querySelectorAll("column").forEach(col=>{const n=col.getAttribute("name")||"";parameters.push({id:`Parameters::${n}`,name:n,caption:col.getAttribute("caption")||n,resolvedCaption:col.getAttribute("caption")||n,datatype:col.getAttribute("datatype")||"",domainType:col.getAttribute("param-domain-type")||"",isParam:true,isCalc:false,isAutoNamed:false,isCopy:false,hasConflict:false,usageCount:0,usedInSheets:[]});});
  const nameToCaption={};[...allFields,...parameters].forEach(f=>{const r=f.name.replace(/^\[|\]$/g,"");if(r!==f.caption)nameToCaption[r]=f.caption;});
  allFields.filter(f=>f.isCalc).forEach(f=>{f.formula=f.formula.replace(/\[Parameters\]\.\[([^\]]+)\]/g,(_,i)=>nameToCaption[i]?`[${nameToCaption[i]}]`:`[${i}]`).replace(/\[([^\]]+)\]/g,(m,i)=>nameToCaption[i]?`[${nameToCaption[i]}]`:m);});
  const dsMap={};datasources.forEach(ds=>{dsMap[ds.name]=ds.caption;});
  const worksheets=[];
  doc.querySelectorAll("worksheets > worksheet").forEach(ws=>{
    const name=ws.getAttribute("name")||"";
    const markEl=ws.querySelector("panes > pane > mark")||ws.querySelector("mark");
    const markType=markEl?.getAttribute("class")||"Automatic";
    const rows=ws.querySelector("table > rows")?.textContent?.trim()||ws.querySelector("rows")?.textContent?.trim()||"";
    const cols=ws.querySelector("table > cols")?.textContent?.trim()||ws.querySelector("cols")?.textContent?.trim()||"";
    const measures=[],dimensions=[],datasourceNames=[],colCap={};
    ws.querySelectorAll("datasource-dependencies").forEach(dep=>{
      const ds=dep.getAttribute("datasource")||"";if(ds==="Parameters")return;
      if(ds&&!datasourceNames.includes(ds))datasourceNames.push(ds);
      dep.querySelectorAll("column").forEach(col=>{const n=col.getAttribute("name")||"";if(!n)return;const raw=n.replace(/^\[|\]$/g,"");const cap=col.getAttribute("caption")||nameToCaption[raw]||raw;colCap[n]=cap;colCap[raw]=cap;(col.getAttribute("role")==="measure"?measures:dimensions).push({name:n,caption:cap});});
    });
    const resolveToken=token=>{
      const m=token.match(/\[.*?\]\.\[([^\]]+)\]/);
      const inner=m?m[1]:token.replace(/^\[|\]$/g,"");
      const stripped=cleanTok(inner);
      return colCap[`[${inner}]`]||colCap[`[${stripped}]`]||colCap[inner]||colCap[stripped]||nameToCaption[inner]||nameToCaption[stripped]||stripped;
    };
    const filters=[];
    ws.querySelectorAll("slices > column").forEach(col=>{const t=(col.textContent||"").trim();if(t)filters.push(resolveToken(t));});
    if(!filters.length)ws.querySelectorAll("filter").forEach(f=>{const col=f.getAttribute("column")||"";if(col){const raw=col.replace(/^\[|\]$/g,"");filters.push(nameToCaption[raw]||raw);}});
    const encodings={};
    ws.querySelectorAll("panes > pane > encodings > *").forEach(enc=>{const ch=enc.tagName,cap=enc.getAttribute("caption")||"",col=enc.getAttribute("column")||"";const val=cap||(col?resolveToken(col):"");if(ch&&val){if(!encodings[ch])encodings[ch]=[];encodings[ch].push(val);}});
    const rawRowTokens=tokShelf(rows),rawColTokens=tokShelf(cols);
    const rowFields=rawRowTokens.map(resolveToken),colFields=rawColTokens.map(resolveToken);
    const rowAggs=rawRowTokens.map(extractAgg),colAggs=rawColTokens.map(extractAgg);
    const used=new Set([...rowFields,...colFields,...filters,...measures.map(m=>m.caption),...dimensions.map(d=>d.caption)]);
    worksheets.push({name,markType,rows,cols,rowFields,colFields,rowAggs,colAggs,measures,dimensions,filters,datasourceNames,encodings,usedFields:[...used]});
  });
  const dashboards=[];
  doc.querySelectorAll("dashboards > dashboard").forEach(db=>{
    const name=db.getAttribute("name")||"Unnamed";
    const sz=db.querySelector("size");
    const width=parseInt(sz?.getAttribute("maxwidth")||sz?.getAttribute("w")||"1366"),height=parseInt(sz?.getAttribute("maxheight")||sz?.getAttribute("h")||"768");
    const rootEl=db.querySelector("zones > zone"),hierarchy=rootEl?enrichZones(parseZone(rootEl)):null;
    const sheetsUsed=[];const collect=z=>{if(!z)return;const zn=z.name||z.param||"";if(effType(z)==="worksheet"&&zn&&!sheetsUsed.includes(zn))sheetsUsed.push(zn);z.children.forEach(collect);};collect(hierarchy);
    dashboards.push({name,width,height,hierarchy,sheetsUsed});
  });
  const usageMap={};worksheets.forEach(ws=>ws.usedFields.forEach(f=>{if(!usageMap[f])usageMap[f]=new Set();usageMap[f].add(ws.name);}));
  const getU=f=>new Set([...usageMap[f.caption]||[],...usageMap[f.name.replace(/^\[|\]$/g,"")]||[]]);
  allFields.forEach(f=>{const u=getU(f);f.usageCount=u.size;f.usedInSheets=[...u];});parameters.forEach(p=>{const u=getU(p);p.usageCount=u.size;p.usedInSheets=[...u];});
  const byCap={},byRaw={};[...allFields,...parameters].forEach(f=>{byCap[f.resolvedCaption]=f;byCap[f.caption]=f;byRaw[f.name.replace(/^\[|\]$/g,"")]=f;});
  const lineage={};[...allFields,...parameters].forEach(f=>{lineage[f.id]={...f,deps:[],usedBy:[]};});
  allFields.filter(f=>f.isCalc).forEach(f=>{(f.formula.match(/\[([^\]]+)\]/g)||[]).map(m=>m.slice(1,-1)).forEach(ref=>{const dep=byCap[ref]||byRaw[ref];if(dep&&dep.id&&dep.id!==f.id){if(!lineage[f.id].deps.includes(dep.id))lineage[f.id].deps.push(dep.id);if(lineage[dep.id]&&!lineage[dep.id].usedBy.includes(f.id))lineage[dep.id].usedBy.push(f.id);}});});
  const fmap={};allFields.filter(f=>f.isCalc).forEach(f=>{const k=f.formula.toLowerCase().replace(/\s+/g,"").trim();(fmap[k]=fmap[k]||[]).push(f);});
  const duplicates=Object.values(fmap).filter(g=>g.length>1);
  const allUsed=new Set();worksheets.forEach(ws=>ws.usedFields.forEach(f=>allUsed.add(f)));allFields.filter(f=>f.isCalc).forEach(f=>(f.formula.match(/\[([^\]]+)\]/g)||[]).forEach(m=>allUsed.add(m.slice(1,-1))));
  const unused=allFields.filter(f=>!allUsed.has(f.caption)&&!allUsed.has(f.name.replace(/^\[|\]$/g,""))),unusedParams=parameters.filter(p=>!allUsed.has(p.caption)),namingIssues=allFields.filter(f=>f.isAutoNamed||f.isCopy);
  return{datasources,parameters,allFields,worksheets,dashboards,lineage,dsMap,issues:{duplicates,unused,unusedParams,namingIssues}};
}

function makeSample(){
  const mk=(id,n,cap,dt,role,formula,hidden,dsN,dsC,uc,us)=>({id,name:n,caption:cap,resolvedCaption:cap,datatype:dt,role,formula,hidden,isParam:false,datasource:dsC,dsName:dsN,isCalc:!!formula,isAutoNamed:false,isCopy:false,hasConflict:false,usageCount:uc||0,usedInSheets:us||[]});
  const [SO,PA,RB,KS]=["Sales Overview","Profit Analysis","Regional Breakdown","KPI Summary"];
  const ds1f=[mk("o::OID","[Order ID]","Order ID","integer","dimension","",false,"orders","Orders",0,[]),mk("o::ODate","[Order Date]","Order Date","date","dimension","",false,"orders","Orders",0,[]),mk("o::Sales","[Sales]","Sales","real","measure","",false,"orders","Orders",3,[SO,RB,KS]),mk("o::Profit","[Profit]","Profit","real","measure","",false,"orders","Orders",4,[SO,PA,RB,KS]),mk("o::Disc","[Discount]","Discount","real","measure","",false,"orders","Orders",0,[]),mk("o::Qty","[Quantity]","Quantity","integer","measure","",false,"orders","Orders",1,[RB]),mk("o::Cat","[Category]","Category","string","dimension","",false,"orders","Orders",2,[SO,PA]),mk("o::Reg","[Region]","Region","string","dimension","",false,"orders","Orders",2,[SO,RB]),mk("o::Seg","[Segment]","Customer Segment","string","dimension","",false,"orders","Orders",1,[PA]),mk("o::PR","[Profit Ratio]","Profit Ratio","real","measure","SUM([Profit])/SUM([Sales])",false,"orders","Orders",2,[SO,KS]),mk("o::Mgn","[Margin %]","Margin %","real","measure","SUM([Profit])/SUM([Sales])",false,"orders","Orders",0,[]),mk("o::SPU","[Sales Per Unit]","Sales Per Unit","real","measure","SUM([Sales])/SUM([Quantity])",false,"orders","Orders",1,[SO]),mk("o::PvT","[Profit vs Target]","Profit vs Target","real","measure","SUM([Profit]) - [Target Profit]",false,"orders","Orders",1,[PA]),mk("o::AbT","[Above Target]","Above Target?","boolean","dimension","[Profit vs Target] > 0",false,"orders","Orders",1,[PA]),mk("o::PCpy","[Profit (copy)]","Profit (copy)","real","measure","",false,"orders","Orders",0,[]),mk("o::AC1","[Calculation_1048576]","Calculation_1048576","real","measure","DATEPART('year',[Order Date])",false,"orders","Orders",0,[]),mk("o::Old","[Old Revenue]","Old Revenue Calc","real","measure","SUM([Sales])*1.1",true,"orders","Orders",0,[])];
  const ds2f=[mk("t::TS","[Target Sales]","Target Sales","real","measure","",false,"targets","Targets",1,[KS]),mk("t::TP","[Target Profit]","Target Profit","real","measure","",false,"targets","Targets",0,[]),mk("t::Reg","[Region]","Region","string","dimension","",false,"targets","Targets",0,[]),mk("t::AC2","[Calculation_2097152]","Calculation_2097152","real","measure","SUM([Target Sales])*0.9",false,"targets","Targets",0,[])];
  const allFields=[...ds1f,...ds2f];resolveNames(allFields);
  const parameters=[{id:"p::TN",name:"[Top N]",caption:"Top N",resolvedCaption:"Top N",datatype:"integer",domainType:"range",isParam:true,isCalc:false,isAutoNamed:false,isCopy:false,hasConflict:false,usageCount:0,usedInSheets:[]},{id:"p::DR",name:"[Date Range]",caption:"Date Range Filter",resolvedCaption:"Date Range Filter",datatype:"date",domainType:"list",isParam:true,isCalc:false,isAutoNamed:false,isCopy:false,hasConflict:false,usageCount:1,usedInSheets:[PA]},{id:"p::CT",name:"[Color Theme]",caption:"Color Theme",resolvedCaption:"Color Theme",datatype:"string",domainType:"list",isParam:true,isCalc:false,isAutoNamed:false,isCopy:false,hasConflict:false,usageCount:0,usedInSheets:[]}];
  const worksheets=[{name:SO,markType:"Bar",rows:"SUM([Sales])",cols:"[Category]",rowFields:["Sales"],colFields:["Category"],measures:[{name:"[Sales]",caption:"Sales"},{name:"[Profit Ratio]",caption:"Profit Ratio"},{name:"[Sales Per Unit]",caption:"Sales Per Unit"}],dimensions:[{name:"[Category]",caption:"Category"},{name:"[Region]",caption:"Region"}],filters:["Region"],datasourceNames:["orders"],encodings:{color:["Category"],size:["Sales"]},usedFields:["Sales","Profit","Category","Region","Profit Ratio","Sales Per Unit"]},{name:PA,markType:"Bar",rows:"SUM([Profit])",cols:"[Category]",rowFields:["Profit"],colFields:["Category"],measures:[{name:"[Profit]",caption:"Profit"},{name:"[Profit vs Target]",caption:"Profit vs Target"}],dimensions:[{name:"[Category]",caption:"Category"},{name:"[Segment]",caption:"Customer Segment"},{name:"[Above Target]",caption:"Above Target?"}],filters:["Customer Segment"],datasourceNames:["orders"],encodings:{color:["Above Target?"]},usedFields:["Profit","Category","Customer Segment","Above Target?","Profit vs Target"]},{name:RB,markType:"Map",rows:"",cols:"",rowFields:[],colFields:[],measures:[{name:"[Sales]",caption:"Sales"},{name:"[Profit]",caption:"Profit"},{name:"[Quantity]",caption:"Quantity"}],dimensions:[{name:"[Region]",caption:"Region"}],filters:[],datasourceNames:["orders"],encodings:{color:["Profit"],size:["Sales"]},usedFields:["Sales","Region","Profit","Quantity"]},{name:KS,markType:"Text",rows:"",cols:"",rowFields:[],colFields:[],measures:[{name:"[Sales]",caption:"Sales"},{name:"[Profit]",caption:"Profit"},{name:"[Profit Ratio]",caption:"Profit Ratio"},{name:"[Target Sales]",caption:"Target Sales"}],dimensions:[],filters:[],datasourceNames:["orders","targets"],encodings:{label:["Sales","Profit"]},usedFields:["Sales","Profit","Profit Ratio","Target Sales"]}];
  const mz=(id,type,name,dir,fs,children=[])=>enrichZones({id,type,typeV2:type,name,friendlyName:name||type,param:"",x:0,y:0,w:0,h:0,rawDir:dir||"TB",fixedSize:fs,children,margin:null,marginLeft:null,marginRight:null,marginTop:null,marginBottom:null,padding:null,paddingLeft:null,paddingRight:null,paddingTop:null,paddingBottom:null,borderColor:null,borderStyle:null,borderWidth:null,bgColor:null});
  const dash1=mz("d1","layout-basic","","TB",null,[mz("z1","worksheet",KS,"TB",120),mz("d1row","layout-basic","","LR",null,[mz("z2","worksheet",SO,"TB",380),mz("z3","worksheet",PA,"TB",380)]),mz("d1row2","layout-basic","","LR",null,[mz("z4","worksheet",RB,"TB",355),mz("z5","filter","Filters","TB",355)])]);
  const dash2=mz("d2","layout-basic","","TB",null,[mz("z6","worksheet",RB,"TB",340),mz("d2row","layout-basic","","LR",null,[mz("z7","worksheet",SO,"TB",340),mz("z8","worksheet",PA,"TB",340)])]);
  const lineage={};[...allFields,...parameters].forEach(f=>{lineage[f.id]={...f,deps:[],usedBy:[]};});
  const addD=(a,b)=>{if(lineage[a]&&lineage[b]){if(!lineage[a].deps.includes(b))lineage[a].deps.push(b);if(!lineage[b].usedBy.includes(a))lineage[b].usedBy.push(a);}};
  addD("o::PR","o::Profit");addD("o::PR","o::Sales");addD("o::Mgn","o::Profit");addD("o::Mgn","o::Sales");addD("o::SPU","o::Sales");addD("o::SPU","o::Qty");addD("o::PvT","o::PR");addD("o::PvT","p::DR");addD("o::AbT","o::PvT");addD("o::Old","o::Sales");addD("o::AC1","o::ODate");addD("t::AC2","t::TS");
  const fmap={};allFields.filter(f=>f.isCalc).forEach(f=>{const k=f.formula.toLowerCase().replace(/\s+/g,"").trim();(fmap[k]=fmap[k]||[]).push(f);});
  const allUsed=new Set();worksheets.forEach(ws=>ws.usedFields.forEach(f=>allUsed.add(f)));
  const customSQL=`SELECT o.order_id, o.order_date, o.sales, o.profit FROM orders o`;
  return{dsMap:{orders:"Orders",targets:"Targets"},datasources:[{name:"orders",caption:"Orders",dbclass:"hyper",server:"orders.hyper",database:"",fields:ds1f,tables:[{name:"Orders",alias:"Orders",columns:["Order ID","Order Date","Ship Mode","Customer Name","Segment","Region","Category","Sales","Quantity","Discount","Profit"]},{name:"Returns",alias:"Returns",columns:["Returned","Order ID"]}],joins:[{left:"Orders",right:"Returns",type:"left",condition:"Order ID = Order ID"}],customSQL},{name:"targets",caption:"Targets",dbclass:"excel-direct",server:"Targets.xlsx",database:"",fields:ds2f,tables:[],joins:[],customSQL:null}],parameters,allFields,worksheets,dashboards:[{name:"Executive Dashboard",width:1200,height:900,hierarchy:dash1,sheetsUsed:[KS,SO,PA,RB]},{name:"Operations View",width:1000,height:700,hierarchy:dash2,sheetsUsed:[RB,SO,PA]}],lineage,issues:{duplicates:Object.values(fmap).filter(g=>g.length>1),unused:allFields.filter(f=>!allUsed.has(f.caption)&&!allUsed.has(f.name.replace(/^\[|\]$/g,""))),unusedParams:parameters.filter(p=>!allUsed.has(p.caption)),namingIssues:allFields.filter(f=>f.isAutoNamed||f.isCopy)}};
}

// ─── Design tokens ────────────────────────────────────
const T={bg:"#f8fafc",surface:"#ffffff",surface2:"#f1f5f9",surface3:"#e8f0fe",border:"#e2e8f0",border2:"#cbd5e1",txt:"#0f172a",txt2:"#475569",txt3:"#94a3b8",accent:"#2563eb",accentBg:"#eff6ff",red:"#dc2626",amber:"#d97706",green:"#059669",purple:"#7c3aed",mono:"#92400e",monoBg:"#fef3c7"};
const MARK_META={Bar:{color:"#3b82f6",icon:"▊",label:"Bar"},Line:{color:"#f59e0b",icon:"↗",label:"Line"},Area:{color:"#10b981",icon:"▲",label:"Area"},Pie:{color:"#ef4444",icon:"◑",label:"Pie"},Circle:{color:"#8b5cf6",icon:"●",label:"Scatter"},Shape:{color:"#06b6d4",icon:"◆",label:"Shape"},Square:{color:"#f97316",icon:"■",label:"Square"},Text:{color:"#6366f1",icon:"T",label:"Text Table"},Map:{color:"#0ea5e9",icon:"◎",label:"Map"},Gantt:{color:"#ec4899",icon:"≡",label:"Gantt"},Automatic:{color:"#6b7280",icon:"✦",label:"Auto"},Unknown:{color:"#9ca3af",icon:"?",label:"Unknown"}};
const DEPTH_COLORS=[{border:"#3b82f6",bg:"rgba(59,130,246,0.04)",label:"#2563eb"},{border:"#8b5cf6",bg:"rgba(139,92,246,0.04)",label:"#7c3aed"},{border:"#06b6d4",bg:"rgba(6,182,212,0.04)",label:"#0891b2"},{border:"#f59e0b",bg:"rgba(245,158,11,0.04)",label:"#d97706"},{border:"#10b981",bg:"rgba(16,185,129,0.04)",label:"#059669"},{border:"#ec4899",bg:"rgba(236,72,153,0.04)",label:"#db2777"}];
const LEAF_COLORS={worksheet:{bg:"#d1fae5",border:"#6ee7b7",text:"#065f46"},text:{bg:"#fef9c3",border:"#fde047",text:"#713f12"},image:{bg:"#dbeafe",border:"#93c5fd",text:"#1e40af"},blank:{bg:"#f8fafc",border:"#e2e8f0",text:"#94a3b8"},title:{bg:"#f3e8ff",border:"#d8b4fe",text:"#6b21a8"},filter:{bg:"#fff7ed",border:"#fdba74",text:"#9a3412"},parameter:{bg:"#f0f9ff",border:"#7dd3fc",text:"#075985"},legend:{bg:"#fdf4ff",border:"#e879f9",text:"#86198f"}};

// ─── Shared UI ────────────────────────────────────────
const rc=f=>f.isParam?T.purple:f.isCalc?T.amber:f.role==="measure"?T.green:T.accent;
function Badge({label,color}){const c=color||T.txt3;return <span style={{background:c+"18",color:c,border:`1px solid ${c}33`,fontSize:11,padding:"2px 7px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>;}
function Card({children,style={}}){return <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:"1rem 1.25rem",boxShadow:"0 1px 3px rgba(0,0,0,.06)",...style}}>{children}</div>;}
function Mono({children}){return <code style={{fontFamily:"monospace",fontSize:11,background:T.monoBg,color:T.mono,padding:"2px 6px",borderRadius:4,wordBreak:"break-all"}}>{children}</code>;}
function FieldName({f,size=13}){if(f.isAutoNamed)return <span style={{color:"#b45309",fontWeight:500,fontSize:size,fontFamily:"monospace"}}>{f.resolvedCaption}</span>;if(f.isCopy)return <span style={{color:"#b45309",fontWeight:500,fontSize:size}}>{f.resolvedCaption}</span>;return <span style={{color:T.txt,fontWeight:500,fontSize:size}}>{f.resolvedCaption}</span>;}
function NameBadges({f}){return <>{f.isAutoNamed&&<Badge label="auto-named" color={T.amber}/>}{f.isCopy&&<Badge label="copy" color={T.amber}/>}{f.hasConflict&&<Badge label="ambiguous" color={T.accent}/>}</>;}
function FloatTip({tip}){
  if(!tip)return null;const f=tip.f,left=Math.min(tip.x+14,(typeof window!=="undefined"?window.innerWidth:1200)-300);
  const ftype=f.isCalc?"Calculation":f.isParam?"Parameter":"Native Field",fcolor=f.isCalc?T.amber:f.isParam?T.purple:T.accent;
  return <div style={{position:"fixed",left,top:tip.y-8,background:T.surface,border:`1px solid ${T.border2}`,borderRadius:9,padding:"10px 13px",zIndex:9999,maxWidth:290,pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>
    <div style={{color:T.txt,fontWeight:600,fontSize:12,marginBottom:2}}>{f.resolvedCaption}</div>
    <div style={{color:fcolor,fontSize:10,fontWeight:600,marginBottom:1}}>{ftype}</div>
    <div style={{color:T.txt3,fontSize:10,marginBottom:f.formula?6:5}}>{f.datasource}</div>
    {f.formula&&<div style={{marginBottom:6}}><Mono>{f.formula.length>160?f.formula.slice(0,160)+"…":f.formula}</Mono></div>}
    {f.usageCount>0?(<div><div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Used in:</div>{f.usedInSheets?.map(s=><div key={s} style={{color:T.txt2,fontSize:10,display:"flex",gap:5,lineHeight:"16px"}}><span style={{color:T.txt3}}>•</span>{s}</div>)}</div>):<div style={{color:T.txt3,fontSize:10}}>Not used in any worksheet</div>}
  </div>;
}
function ChartBadge({type}){const m=MARK_META[type]||MARK_META.Unknown;return <span style={{background:m.color+"20",border:`1px solid ${m.color}88`,color:m.color,display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}><span style={{fontFamily:"monospace"}}>{m.icon}</span>{m.label}</span>;}
function Pill({label,role}){const isMeas=role==="measure";return <span style={{display:"inline-block",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:500,whiteSpace:"nowrap",background:isMeas?"#eff6ff":"#f0fdf4",border:`1px solid ${isMeas?"#bfdbfe":"#bbf7d0"}`,color:isMeas?"#1d4ed8":"#166534"}}>{label}</span>;}
function ColorSwatch({value}){if(!value||value==="none")return <span style={{color:T.txt3,fontStyle:"italic",fontSize:11}}>none</span>;const isHex=/^#[0-9a-f]{3,8}$/i.test(value);return <span style={{display:"inline-flex",alignItems:"center",gap:5}}>{isHex&&<span style={{background:value,width:12,height:12,borderRadius:2,border:`1px solid ${T.border2}`,display:"inline-block",flexShrink:0}}/>}<span style={{fontFamily:"monospace",fontSize:11}}>{value}</span></span>;}
function PaddingIcon({side}){
  const sides=[["top","M3,3 L19,3"],["right","M19,3 L19,19"],["bottom","M3,19 L19,19"],["left","M3,3 L3,19"]];
  return <svg width={22} height={22} viewBox="0 0 22 22" style={{display:"block"}}>{sides.map(([id,d])=><path key={id} d={d} fill="none" stroke={id===side?"#334155":"#dde1e7"} strokeWidth={id===side?2.5:1} strokeLinecap="round"/>)}</svg>;
}
function PaddingGrid({label,top,right,bottom,left}){
  return <div style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>{label}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
      {[{side:"top",v:top},{side:"right",v:right},{side:"bottom",v:bottom},{side:"left",v:left}].map(({side,v})=>{const n=v!=null&&v!==""?parseFloat(v):null,isZ=n===null||isNaN(n)||n===0;return(
        <div key={side} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <PaddingIcon side={side}/>
          <span style={{background:isZ?T.surface2:T.accentBg,color:isZ?T.txt3:T.accent,border:`1px solid ${isZ?T.border:T.accent+"44"}`,padding:"1px 8px",borderRadius:4,fontSize:11,fontFamily:"monospace",fontWeight:600,display:"inline-block"}}>{isZ?0:Math.round(n*10)/10}</span>
        </div>
      );})}
    </div>
  </div>;
}

// ─── NestedZone ───────────────────────────────────────
function NestedZone({zone,depth=0,onSelect,selected}){
  const et=effType(zone),isCtrl=isCont(zone),isSel=selected?.id===zone.id;
  const dc=DEPTH_COLORS[depth%DEPTH_COLORS.length];
  const dn=zone.friendlyName||zone.name||zone.param||"";
  const renderAsLeaf=!isCtrl||zone.children.length===0;
  if(!renderAsLeaf){
    const isH=zone.direction==="horizontal";
    return(
      <div onClick={e=>{e.stopPropagation();onSelect(zone);}}
        style={{width:"100%",flex:1,display:"flex",flexDirection:"column",border:`2px solid ${isSel?"#f59e0b":dc.border}`,outline:isSel?"2px solid #fbbf24":"none",background:dc.bg,borderRadius:5,cursor:"pointer",boxSizing:"border-box",minHeight:100}}>
        <div style={{padding:"4px 8px",fontSize:10,fontWeight:700,color:dc.label,background:dc.border+"22",borderBottom:`1px solid ${dc.border}44`,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flexShrink:0,lineHeight:"18px"}}>
          {isH?"↔ Horizontal":"↕ Vertical"}{dn?` — ${dn}`:""}
          {zone.isFixed&&<Icon name="pin" size={11} style={{marginLeft:5,opacity:.6}}/>}
        </div>
        <div style={{display:"flex",flex:1,flexDirection:isH?"row":"column",gap:3,padding:4,minHeight:60,alignItems:"stretch"}}>
          {zone.children.map(child=>(
            <div key={child.id} style={{flex:1,display:"flex",flexDirection:"column",minWidth:isH?36:0,minHeight:isH?0:36}}>
              <NestedZone zone={child} depth={depth+1} onSelect={onSelect} selected={selected}/>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const lc=LEAF_COLORS[et]||LEAF_COLORS.blank;
  const leafLabel=et==="image"&&zone.param?(zone.param.split(/[/\\]/).pop()||zone.param):(dn||et);
  return(
    <div onClick={e=>{e.stopPropagation();onSelect(zone);}}
      style={{flex:1,width:"100%",background:lc.bg,border:`1.5px solid ${isSel?"#f59e0b":lc.border}`,outline:isSel?"2px solid #fbbf24":"none",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 10px",minHeight:56,cursor:"pointer",textAlign:"center",boxSizing:"border-box",overflow:"hidden"}}>
      <span style={{color:lc.text,fontSize:11,fontWeight:600,wordBreak:"break-word",lineHeight:1.4}}>{zIcon(et)} {leafLabel}</span>
    </div>
  );
}

// ─── ZoneDetails ──────────────────────────────────────
function ZoneDetails({zone, worksheets, onNavigateToWorksheet}){
  if(!zone)return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,minHeight:240,textAlign:"center"}}>
      <Icon name="search" size={36} color={T.txt3} strokeWidth={1.5} style={{margin:"0 auto 12px",opacity:.35}}/>
      <p style={{fontSize:13,color:T.txt3,fontWeight:500}}>Click any object in the layout to inspect its properties</p>
    </div>
  );
  const et=effType(zone);
  // Match by name/param against the worksheet list — type-attribute-agnostic
  const wsName = zone.name || zone.param || "";
  const matchedSheet = wsName ? (worksheets?.find(s=>s.name===wsName)||null) : null;
  const isCtrl=isCont(zone);
  const isParH=zone.parentDirection==="horizontal";
  const displayW=zone.fixedSize!=null?(isParH?zone.fixedSize:0):0;
  const displayH=zone.fixedSize!=null?(isParH?0:zone.fixedSize):0;
  const gv=k=>zone[k]??zone.style?.[k]??null;
  const gb=(base,spec)=>{const b=base!=null?parseFloat(base)||0:0;const s=spec!=null?parseFloat(spec):null;return(s!==null&&!isNaN(s))?s:b;};
  const outer={top:gb(gv("margin"),gv("marginTop")??gv("margin-top")),right:gb(gv("margin"),gv("marginRight")??gv("margin-right")),bottom:gb(gv("margin"),gv("marginBottom")??gv("margin-bottom")),left:gb(gv("margin"),gv("marginLeft")??gv("margin-left"))};
  const inner={top:gb(gv("padding"),gv("paddingTop")??gv("padding-top")),right:gb(gv("padding"),gv("paddingRight")??gv("padding-right")),bottom:gb(gv("padding"),gv("paddingBottom")??gv("padding-bottom")),left:gb(gv("padding"),gv("paddingLeft")??gv("padding-left"))};
  const visProps=[["border-color",gv("borderColor")??gv("border-color"),true],["border-style",gv("borderStyle")??gv("border-style"),false],["border-width",gv("borderWidth")??gv("border-width"),false],["background-color",gv("bgColor")??gv("background-color"),true]];
  const imageUrl=et==="image"?zone.param:null;

  return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.05)",height:"100%",display:"flex",flexDirection:"column"}}>
      {/* ── Header ── */}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:zone.typeV2||zone.type?4:0}}>
          <span style={{fontSize:16}}>{zIcon(et)}</span>
          <span style={{fontWeight:700,color:T.txt,fontSize:14}}>{zone.friendlyName||zone.name||zone.param||et}</span>
          {isCtrl&&<Badge label={zone.direction==="horizontal"?"↔ Horizontal":"↕ Vertical"} color={T.accent}/>}
          {zone.isFixed&&<Badge label="📌 Fixed" color={T.amber}/>}
          {matchedSheet&&<ChartBadge type={matchedSheet.markType}/>}
        </div>
        {(zone.typeV2||zone.type)&&<div style={{fontSize:10,color:T.txt3,fontFamily:"monospace",marginBottom:imageUrl?4:0}}>{zone.typeV2||zone.type}{zone.typeV2&&zone.type&&zone.typeV2!==zone.type&&` (${zone.type})`}</div>}
        {imageUrl&&<div style={{fontSize:11,color:T.accent,marginTop:4,wordBreak:"break-all",fontFamily:"monospace"}}>{imageUrl}</div>}
        {/* Navigate button – only for worksheet zones with a matching sheet */}
        {matchedSheet && onNavigateToWorksheet && (
          <button
            onClick={()=>onNavigateToWorksheet(wsName)}
            style={{marginTop:10,width:"100%",padding:"8px 12px",background:T.accentBg,border:`1px solid ${T.accent}44`,borderRadius:8,color:T.accent,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
          >
            📊 View "{wsName}" in Worksheets →
          </button>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{padding:"14px 16px",overflowY:"auto",maxHeight:"68vh"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Size</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[["Width",displayW],["Height",displayH]].map(([l,v])=><div key={l} style={{background:v===0?T.surface2:T.accentBg,borderRadius:8,padding:"9px 12px",border:`1px solid ${v===0?T.border:T.accent+"33"}`,textAlign:"center"}}>
            <div style={{fontSize:11,color:T.txt3}}>{l}</div>
            <div style={{fontWeight:700,color:v===0?T.txt3:T.accent,fontSize:15,fontFamily:"monospace"}}>{v}<span style={{fontSize:11,fontWeight:400,color:T.txt3,marginLeft:2}}>px</span></div>
          </div>)}
        </div>
        <PaddingGrid label="Outer Padding" {...outer}/>
        <PaddingGrid label="Inner Padding" {...inner}/>
        <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Visual Properties</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:zone.children?.length?16:0}}>
          {visProps.map(([lbl,val,isColor])=>(
            <div key={lbl} style={{background:T.surface2,borderRadius:6,padding:"7px 10px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.txt3,marginBottom:4}}>{lbl}</div>
              {isColor?<ColorSwatch value={val||""}/>:<span style={{background:(!val||val==="none")?T.surface2:T.accentBg,color:(!val||val==="none")?T.txt3:T.accent,border:`1px solid ${(!val||val==="none")?T.border:T.accent+"44"}`,padding:"1px 8px",borderRadius:4,fontSize:11,fontFamily:"monospace",display:"inline-block"}}>{val||"0"}</span>}
            </div>
          ))}
        </div>
        {zone.children&&zone.children.length>0&&(
          <div style={{marginTop:4}}>
            <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Nested Objects ({zone.children.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {zone.children.map((c,i)=>{
                const cet=effType(c),cdn=c.friendlyName||c.name||c.param||cet;
                const cParH=zone.direction==="horizontal";
                const cW=c.fixedSize!=null?(cParH?c.fixedSize:0):0,cH=c.fixedSize!=null?(cParH?0:c.fixedSize):0;
                const lc=LEAF_COLORS[cet]||LEAF_COLORS.blank;
                return <div key={c.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:T.surface2,borderRadius:7,border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:14,flexShrink:0}}>{zIcon(cet)}</span>
                  <span style={{flex:1,fontSize:12,color:T.txt,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cdn}</span>
                  <Badge label={cet} color={lc.border}/>
                  {(cW>0||cH>0)&&<span style={{fontSize:10,color:T.txt3,fontFamily:"monospace",flexShrink:0}}>{cW>0?`${cW}px w`:""}{cH>0?`${cH}px h`:""}</span>}
                </div>;
              })}
            </div>
          </div>
        )}
        {/* No measures/dimensions/filters shown here — use "View in Worksheets" button above */}
      </div>
    </div>
  );
}

// ─── Dashboards tab ───────────────────────────────────
// Walk hierarchy and match zones by name/param against known worksheet names (type-agnostic)
function countWSZones(z,wsSet){if(!z)return 0;const nm=z.name||z.param||"";return(wsSet.has(nm)?1:0)+(z.children||[]).reduce((s,c)=>s+countWSZones(c,wsSet),0);}
function collectWSNames(z,wsSet,seen=new Set(),res=[]){if(!z)return res;const nm=z.name||z.param||"";if(nm&&wsSet.has(nm)&&!seen.has(nm)){seen.add(nm);res.push(nm);}(z.children||[]).forEach(c=>collectWSNames(c,wsSet,seen,res));return res;}

function DashboardsTab({wb,onNavigateToWorksheet}){
  const [dashIdx,setDashIdx]=useState(0),[selZone,setSelZone]=useState(null);
  const wsNames=useMemo(()=>new Set(wb.worksheets.map(ws=>ws.name)),[wb.worksheets]);
  if(!wb.dashboards.length)return <div style={{textAlign:"center",padding:60,color:T.txt3}}>No dashboards found.</div>;
  const dash=wb.dashboards[dashIdx];
  const chartCount=dash.hierarchy?countWSZones(dash.hierarchy,wsNames):dash.sheetsUsed.length;
  const sheetsInDash=dash.hierarchy?collectWSNames(dash.hierarchy,wsNames):dash.sheetsUsed;
  return <div style={{width:"100%"}}>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {wb.dashboards.map((d,i)=><button key={i} onClick={()=>{setDashIdx(i);setSelZone(null);}} style={{padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",background:dashIdx===i?T.accent:T.surface,border:`1px solid ${dashIdx===i?T.accent:T.border}`,color:dashIdx===i?"#fff":T.txt2}}>{d.name}</button>)}
    </div>
    <div style={{fontSize:11,color:T.red,fontWeight:500,marginBottom:10}}>⚠ This tool is only able to analyze and visually show Tiled containers. Floating objects/containers are not supported.</div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <h2 style={{fontWeight:700,color:T.txt,fontSize:18,margin:0}}>{dash.name}</h2>
      <Badge label={`${dash.width}×${dash.height}px`} color={T.txt3}/>
      <Badge label={`${chartCount} chart${chartCount!==1?"s":""}`} color={T.accent}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"7fr 3fr",gap:16,alignItems:"stretch"}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Visual Layout <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11,color:T.txt3}}>— click any object to inspect</span></div>
        <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:12,minHeight:200}}>
          {dash.hierarchy?<NestedZone zone={dash.hierarchy} onSelect={setSelZone} selected={selZone}/>:<div style={{color:T.txt3,padding:24,textAlign:"center",fontSize:13}}>No layout data.</div>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8,flexShrink:0}}>Object Details</div>
        <div style={{flex:1,minHeight:0}}><ZoneDetails zone={selZone} worksheets={wb.worksheets} onNavigateToWorksheet={onNavigateToWorksheet}/></div>
      </div>
    </div>

  </div>;
}

// ─── Overview ─────────────────────────────────────────
function OverviewTab({wb,setTab,setDsNav,setFieldFilter,setIssueSection}){
  const [moreWS,setMoreWS]=useState(false),[moreDash,setMoreDash]=useState(false);
  const {issues,datasources,allFields,parameters,worksheets,dashboards}=wb;
  const native=allFields.filter(f=>!f.isCalc&&!f.isParam).length,calcs=allFields.filter(f=>f.isCalc).length;
  const Row=({label,value,color,onClick})=><button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:T.surface2,borderRadius:8,marginBottom:5,border:`1px solid ${T.border}`,cursor:"pointer"}}>
    <span style={{color:T.txt2,fontSize:13}}>{label}</span><span style={{fontWeight:700,color:value>0?color:T.txt3,fontSize:15}}>{value}</span>
  </button>;
  return <div style={{width:"100%"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <Card><div style={{fontWeight:700,color:T.txt,marginBottom:12,fontSize:14}}>Issues <span style={{color:T.txt3,fontWeight:400,fontSize:13}}>({issues.duplicates.length+issues.unused.length+issues.unusedParams.length})</span></div>{[{label:"Duplicate calculations",count:issues.duplicates.length,sec:"dup",color:"#dc2626"},{label:"Unused fields",count:issues.unused.length,sec:"unused",color:T.amber},{label:"Unused parameters",count:issues.unusedParams.length,sec:"params",color:T.purple}].map(x=><Row key={x.sec} label={x.label} value={x.count} color={x.color} onClick={()=>{setIssueSection(x.sec);setTab("issues");}}/>)}</Card>
      <Card><div style={{fontWeight:700,color:T.txt,marginBottom:12,fontSize:14}}>Fields <span style={{color:T.txt3,fontWeight:400,fontSize:13}}>({allFields.length+parameters.length})</span></div>{[{label:"Native Fields",count:native,filter:"native",color:T.accent},{label:"Calculations",count:calcs,filter:"calc",color:T.amber},{label:"Parameters",count:parameters.length,filter:"param",color:T.purple}].map(x=><Row key={x.filter} label={x.label} value={x.count} color={x.color} onClick={()=>{setFieldFilter(x.filter);setTab("fields");}}/>)}</Card>
      <Card><div style={{fontWeight:700,color:T.txt,marginBottom:12,fontSize:14}}>Data Sources <span style={{color:T.txt3,fontWeight:400,fontSize:13}}>({datasources.length})</span></div>{datasources.map(ds=><button key={ds.name} onClick={()=>{setDsNav(ds.name);setTab("datasources");}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:T.surface2,borderRadius:8,marginBottom:5,border:`1px solid ${T.border}`,cursor:"pointer"}}><div style={{textAlign:"left"}}><div style={{color:T.txt,fontSize:13,fontWeight:500}}>{ds.caption}</div>{ds.server&&<div style={{color:T.txt3,fontSize:11}}>{ds.server}</div>}</div><div style={{display:"flex",gap:5}}><Badge label={ds.dbclass||"local"} color={T.accent}/><Badge label={`${ds.fields.length} fields`} color={T.green}/></div></button>)}</Card>
      <Card><div style={{fontWeight:700,color:T.txt,marginBottom:12,fontSize:14}}>Structure <span style={{color:T.txt3,fontWeight:400,fontSize:13}}>({dashboards.length+worksheets.length})</span></div>
        <div style={{marginBottom:14}}><div style={{color:T.txt2,fontSize:12,fontWeight:600,marginBottom:6}}>Dashboards <span style={{color:T.txt3}}>({dashboards.length})</span></div>{(moreDash?dashboards:dashboards.slice(0,10)).map(d=><button key={d.name} onClick={()=>setTab("dashboards")} style={{width:"100%",textAlign:"left",color:T.txt2,fontSize:12,padding:"3px 8px",background:T.surface2,borderRadius:5,marginBottom:3,border:`1px solid ${T.border}`,cursor:"pointer",display:"block"}}>{d.name}</button>)}{dashboards.length===0&&<div style={{color:T.txt3,fontSize:11}}>None</div>}{dashboards.length>10&&<button onClick={()=>setMoreDash(v=>!v)} style={{color:T.accent,fontSize:11,background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>{moreDash?"Show less":`+${dashboards.length-10} more`}</button>}</div>
        <div><div style={{color:T.txt2,fontSize:12,fontWeight:600,marginBottom:6}}>Worksheets <span style={{color:T.txt3}}>({worksheets.length})</span></div>{(moreWS?worksheets:worksheets.slice(0,10)).map(ws=><button key={ws.name} onClick={()=>setTab("worksheets")} style={{width:"100%",textAlign:"left",color:T.txt2,fontSize:12,padding:"3px 8px",background:T.surface2,borderRadius:5,marginBottom:3,border:`1px solid ${T.border}`,cursor:"pointer",display:"block"}}>{ws.name}</button>)}{worksheets.length>10&&<button onClick={()=>setMoreWS(v=>!v)} style={{color:T.accent,fontSize:11,background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>{moreWS?"Show less":`+${worksheets.length-10} more`}</button>}</div>
      </Card>
    </div>
  </div>;
}

// ─── Datasources ──────────────────────────────────────
const JC={inner:"#2563eb",left:"#059669",right:"#dc2626",full:"#d97706"};
function SchemaView({ds,onNavigate}){
  const{tables=[],joins=[],fields=[],customSQL}=ds;const[sqlOpen,setSqlOpen]=useState(false);
  const dims=fields.filter(f=>f.role==="dimension"&&!f.isCalc&&!f.isParam),meass=fields.filter(f=>f.role==="measure"&&!f.isCalc),calcs=fields.filter(f=>f.isCalc);
  const fByC=useMemo(()=>{const m={};fields.forEach(f=>{m[f.caption]=f;m[f.resolvedCaption]=f;});return m;},[fields]);
  const Sec=({label,flds,color,filter})=><div style={{background:T.surface2,borderRadius:8,border:`1px solid ${color}22`,overflow:"hidden",marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:color+"14",borderBottom:`1px solid ${color}22`}}><span style={{color,fontSize:12,fontWeight:600}}>{label}</span><span style={{color,fontSize:11,opacity:.7}}>{flds.length}</span></div>
    <div style={{padding:"4px 0"}}>{flds.map(f=><div key={f.id} onClick={()=>onNavigate&&onNavigate(filter,f.id)} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{padding:"4px 12px",fontSize:11,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}><span style={{color:T.txt2}}>{f.resolvedCaption}</span>{f.usageCount>0&&<span style={{color:T.txt3,fontSize:10}}>{f.usageCount}×</span>}</div>)}{!flds.length&&<div style={{color:T.txt3,fontSize:11,padding:"4px 12px"}}>None</div>}</div>
  </div>;
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {customSQL&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:4}}>
      <button onClick={()=>setSqlOpen(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 13px",background:"none",border:"none",cursor:"pointer"}}><span style={{color:T.accent,fontSize:12,fontWeight:600}}>Custom SQL</span><span style={{color:T.txt3,fontSize:14}}>{sqlOpen?"▲":"▼"}</span></button>
      {sqlOpen&&<pre style={{margin:0,padding:"0 13px 13px",color:T.mono,fontSize:11,fontFamily:"monospace",whiteSpace:"pre-wrap",wordBreak:"break-all",lineHeight:1.6,background:T.monoBg}}>{customSQL}</pre>}
    </div>}
    {!tables.length?(<><Sec label="Dimensions" flds={dims} color={T.accent} filter="native"/><Sec label="Measures" flds={meass} color={T.green} filter="native"/><Sec label="Calculations" flds={calcs} color={T.amber} filter="calc"/></>):(
      <>{tables.map((t,i)=>{const out=joins.filter(j=>j.left===t.name||j.left===t.alias);return <div key={i} style={{marginBottom:6}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{background:T.surface3,padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`}}><span style={{color:T.accent,fontWeight:600,fontSize:12}}>{t.alias||t.name}</span><span style={{color:T.txt3,fontSize:10}}>{t.columns.length} cols</span></div>
          <div style={{padding:"4px 0"}}>{t.columns.map((col,ci)=>{const mf=fByC[col];return <div key={ci} onClick={()=>mf&&onNavigate&&onNavigate(mf.isCalc?"calc":"native",mf.id)} onMouseEnter={e=>{if(mf)e.currentTarget.style.background=T.surface3;}} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{padding:"3px 12px",fontSize:10,color:ci%2===0?T.txt2:"#64748b",cursor:mf?"pointer":"default"}}>{col}</div>;})}
          </div>
        </div>
        {out.map((j,ji)=><div key={ji} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0 3px 20px",margin:"2px 0"}}><div style={{width:1,height:14,background:T.border2}}/><span style={{background:(JC[j.type]||T.txt3)+"18",color:JC[j.type]||T.txt2,border:`1px solid ${JC[j.type]||T.border}`,fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600}}>{j.type.toUpperCase()}</span>{j.condition&&<span style={{color:T.txt3,fontSize:10}}>on {j.condition}</span>}</div>)}
      </div>;})}
      {calcs.length>0&&<Sec label="Calculations" flds={calcs} color={T.amber} filter="calc"/>}
      </>
    )}
  </div>;
}
function DatasourcesTab({wb,selectedName,setSelectedName,onNavigateToFields}){
  const ds=wb.datasources.find(d=>d.name===selectedName)||wb.datasources[0];
  return <div style={{width:"100%",display:"flex",gap:14,minHeight:500}}>
    <div style={{width:200,flexShrink:0}}>{wb.datasources.map(d=><button key={d.name} onClick={()=>setSelectedName(d.name)} style={{width:"100%",textAlign:"left",padding:"10px 14px",borderRadius:8,marginBottom:6,cursor:"pointer",background:ds?.name===d.name?T.accent:T.surface,border:`1px solid ${ds?.name===d.name?T.accent:T.border}`,color:ds?.name===d.name?"#fff":T.txt}}><div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.caption}</div><div style={{fontSize:11,opacity:.6,marginTop:2}}>{d.fields.length} fields · {d.tables?.length||0} tables</div></button>)}</div>
    {ds&&<div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
      <Card><div style={{fontSize:16,fontWeight:700,color:T.txt,marginBottom:12}}>{ds.caption}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Connection",ds.dbclass||"—"],["Server / File",ds.server||"—"],["Database",ds.database||"—"],["Fields",ds.fields.length],["Calcs",ds.fields.filter(f=>f.isCalc).length],["Tables",ds.tables?.length||"—"]].map(([k,v])=><div key={k} style={{background:T.surface2,borderRadius:8,padding:"9px 12px",border:`1px solid ${T.border}`}}><div style={{fontSize:11,color:T.txt3}}>{k}</div><div style={{fontWeight:500,color:T.txt,marginTop:2,fontSize:13}}>{String(v)}</div></div>)}</div></Card>
      <Card><div style={{fontWeight:600,color:T.txt,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>Schema</span>{ds.joins?.length>0&&<span style={{fontSize:11,color:T.txt3}}>{ds.joins.length} join{ds.joins.length!==1?"s":""}</span>}</div><SchemaView ds={ds} onNavigate={(filter,fieldId)=>onNavigateToFields(ds.name,filter,fieldId)}/></Card>
    </div>}
  </div>;
}

// ─── Fields + Lineage ─────────────────────────────────
function LineagePanel({nodeId,lineage,onSelect,onClose}){
  const[tip,setTip]=useState(null);
  const node=lineage[nodeId];if(!node)return null;
  const deps=node.deps.map(id=>lineage[id]).filter(Boolean),usedBy=node.usedBy.map(id=>lineage[id]).filter(Boolean);
  const CW=7.2,NH=50,VG=20,HG=88,MX=28,MY=48;
  const cw=ns=>ns.length?Math.max(160,Math.max(...ns.map(n=>Math.ceil(n.resolvedCaption.length*CW)+32))):160;
  const w0=cw(deps),w1=cw([node]),w2=cw(usedBy);
  const svgH=MY*2+Math.max(deps.length||1,1,usedBy.length||1)*(NH+VG),svgW=MX*2+w0+HG+w1+HG+w2;
  const cx=[MX,MX+w0+HG,MX+w0+HG+w1+HG];
  const cY=arr=>arr.map((_,i)=>MY+(i+.5)*(svgH-MY*2)/arr.length);
  const midY=svgH/2,dYs=cY(deps),uYs=cY(usedBy);
  const NC=(n,isC)=>isC?{fill:"#1e40af",stroke:"#3b82f6",text:"#fff",sub:"#93c5fd"}:{fill:T.surface2,stroke:rc(n),text:T.txt,sub:T.txt3};
  const NB=({x,y,nw,n,isCenter,onClick})=>{const{fill,stroke,text,sub}=NC(n,isCenter);return <g onClick={onClick} onMouseEnter={e=>setTip({f:n,x:e.clientX,y:e.clientY})} onMouseMove={e=>setTip(p=>p?{...p,x:e.clientX,y:e.clientY}:null)} onMouseLeave={()=>setTip(null)} style={{cursor:onClick?"pointer":"default"}}><rect x={x} y={y-NH/2} width={nw} height={NH} rx={7} fill={fill} stroke={stroke} strokeWidth={isCenter?2:1.5}/><text x={x+nw/2} y={y-8} textAnchor="middle" fill={sub} fontSize={9}>{n.isCalc?"calc":n.isParam?"param":n.role||"field"}</text><text x={x+nw/2} y={y+10} textAnchor="middle" fill={text} fontSize={11} fontWeight={isCenter?"600":"400"}>{n.resolvedCaption}</text></g>;};
  const Cv=({x1,y1,x2,y2})=>{const mx=(x1+x2)/2;return <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={T.border2} strokeWidth={1.5} markerEnd="url(#aL)"/>;};
  return <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.surface}}>
    <FloatTip tip={tip}/>
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"flex-start",gap:10}}>
      <div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}><FieldName f={node} size={13}/><NameBadges f={node}/></div>{node.formula&&<Mono>{node.formula.length>130?node.formula.slice(0,130)+"…":node.formula}</Mono>}</div>
      <button onClick={onClose} style={{background:T.red,border:"none",borderRadius:7,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,padding:"7px 14px",whiteSpace:"nowrap",flexShrink:0}}>← Return to field list</button>
    </div>
    <div style={{flex:1,overflow:"auto",padding:16,background:T.bg}}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",height:"auto",minWidth:Math.min(svgW,400),display:"block"}}>
        <defs><marker id="aL" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto"><path d="M0,0 L0,6 L7,3 z" fill={T.border2}/></marker></defs>
        <text x={cx[0]+w0/2} y={18} textAnchor="middle" fill={T.txt3} fontSize={9}>depends on</text>
        <text x={cx[1]+w1/2} y={18} textAnchor="middle" fill={T.txt2} fontSize={9}>selected</text>
        <text x={cx[2]+w2/2} y={18} textAnchor="middle" fill={T.txt3} fontSize={9}>used by</text>
        {deps.map((d,i)=><Cv key={d.id} x1={cx[0]+w0} y1={dYs[i]} x2={cx[1]} y2={midY}/>)}
        {usedBy.map((u,i)=><Cv key={u.id} x1={cx[1]+w1} y1={midY} x2={cx[2]} y2={uYs[i]}/>)}
        {deps.map((d,i)=><NB key={d.id} x={cx[0]} y={dYs[i]} nw={w0} n={d} onClick={d.isCalc||lineage[d.id]?.usedBy.length>0?()=>onSelect(d.id):null}/>)}
        <NB x={cx[1]} y={midY} nw={w1} n={node} isCenter/>
        {usedBy.map((u,i)=><NB key={u.id} x={cx[2]} y={uYs[i]} nw={w2} n={u} onClick={()=>onSelect(u.id)}/>)}
        {!deps.length&&<text x={cx[0]+w0/2} y={midY} textAnchor="middle" fill={T.txt3} fontSize={10}>no dependencies</text>}
        {!usedBy.length&&<text x={cx[2]+w2/2} y={midY} textAnchor="middle" fill={T.txt3} fontSize={10}>not referenced</text>}
      </svg>
    </div>
    <div style={{padding:"7px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:14,fontSize:11,color:T.txt3,background:T.surface}}>
      <span>↑ {deps.length} dep{deps.length!==1?"s":""}</span><span>↓ {usedBy.length} consumer{usedBy.length!==1?"s":""}</span>
      <span style={{marginLeft:"auto"}}>hover nodes · click calcs to navigate</span>
    </div>
  </div>;
}
function FieldsLineageTab({wb,fieldFilter,setFieldFilter,dsFilter,setDsFilter,pendingFieldId,clearPendingFieldId}){
  const[q,setQ]=useState(""),[sort,setSort]=useState("usage"),[selId,setSelId]=useState(null),[tip,setTip]=useState(null);
  const itemRefs=useRef({});
  useEffect(()=>{if(pendingFieldId){setSelId(pendingFieldId);clearPendingFieldId();}},[pendingFieldId]);
  useEffect(()=>{if(selId&&itemRefs.current[selId])itemRefs.current[selId].scrollIntoView({behavior:"smooth",block:"nearest"});},[selId]);
  const fields=useMemo(()=>{let f=[...wb.allFields,...wb.parameters];if(q){const lq=q.toLowerCase();f=f.filter(x=>x.resolvedCaption.toLowerCase().includes(lq)||(x.formula||"").toLowerCase().includes(lq));}if(fieldFilter==="calc")f=f.filter(x=>x.isCalc);else if(fieldFilter==="param")f=f.filter(x=>x.isParam);else if(fieldFilter==="native")f=f.filter(x=>!x.isCalc&&!x.isParam);if(dsFilter)f=f.filter(x=>x.dsName===dsFilter);if(sort==="usage")f=[...f].sort((a,b)=>(b.usageCount||0)-(a.usageCount||0));else if(sort==="asc")f=[...f].sort((a,b)=>a.resolvedCaption.localeCompare(b.resolvedCaption));else if(sort==="desc")f=[...f].sort((a,b)=>b.resolvedCaption.localeCompare(a.resolvedCaption));return f;},[wb,q,fieldFilter,dsFilter,sort]);
  const handleLineageNav=useCallback(id=>{if(!fields.some(f=>f.id===id)){setFieldFilter("all");setDsFilter(null);}setSelId(id);},[fields,setFieldFilter,setDsFilter]);
  const RBtn=({label,active,onClick})=><button onClick={onClick} style={{padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:active?600:400,cursor:"pointer",background:active?T.accent:"transparent",border:`1px solid ${active?T.accent:T.border2}`,color:active?"#fff":T.txt2,whiteSpace:"nowrap"}}>{label}</button>;
  const boxStyle={display:"flex",alignItems:"center",gap:6,width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",flexWrap:"wrap",marginBottom:6,boxSizing:"border-box",background:T.surface2};
  return <div style={{width:"100%"}}>
    <FloatTip tip={!selId?tip:null}/>
    <div style={{display:"flex",gap:8,marginBottom:18,alignItems:"center"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search fields and formulas…" style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.txt,fontSize:13,outline:"none"}}/>
      <div style={{display:"flex",gap:4,borderLeft:`1px solid ${T.border}`,paddingLeft:10}}>{[["usage","↓ Usage"],["asc","A→Z"],["desc","Z→A"]].map(([id,l])=><button key={id} onClick={()=>setSort(id)} style={{padding:"6px 9px",borderRadius:7,fontSize:11,cursor:"pointer",background:sort===id?T.surface3:"transparent",border:`1px solid ${sort===id?T.border2:"transparent"}`,color:sort===id?T.txt2:T.txt3}}>{l}</button>)}</div>
    </div>
    <div style={boxStyle}><span style={{color:T.red,fontSize:12,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Datasources:</span><RBtn label="All" active={dsFilter===null} onClick={()=>setDsFilter(null)}/>{wb.datasources.map(ds=><RBtn key={ds.name} label={ds.caption} active={dsFilter===ds.name} onClick={()=>setDsFilter(dsFilter===ds.name?null:ds.name)}/>)}</div>
    <div style={{...boxStyle,marginBottom:14}}><span style={{color:T.red,fontSize:12,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Fields:</span>{[["all","All"],["native","Native Fields"],["calc","Calculations"],["param","Parameters"]].map(([id,l])=><RBtn key={id} label={l} active={fieldFilter===id} onClick={()=>setFieldFilter(id)}/>)}</div>
    <div style={{minHeight:400,height:"calc(100vh - 310px)"}}>
      {!selId?(
        <div style={{height:"100%",display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
          <div style={{color:T.txt3,fontSize:11,marginBottom:4,paddingLeft:2}}>{fields.length} field{fields.length!==1?"s":""} — click any row to explore lineage</div>
          {fields.map(f=><div key={f.id} ref={el=>{if(el)itemRefs.current[f.id]=el;}} onClick={()=>setSelId(f.id)} onMouseEnter={e=>{setTip({f,x:e.clientX,y:e.clientY});e.currentTarget.style.background=T.surface3;}} onMouseMove={e=>setTip(p=>p?{...p,x:e.clientX,y:e.clientY}:null)} onMouseLeave={e=>{setTip(null);e.currentTarget.style.background=T.surface;}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer"}}>
            <span style={{display:"flex",alignItems:"center",flexShrink:0}}><Icon name={f.isParam?"ft_param":f.isCalc?"ft_calc":f.role==="measure"?"ft_measure":"ft_dim"} size={14} color={rc(f)}/></span>
            <div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><FieldName f={f}/>{f.hidden&&<span style={{color:T.txt3,fontSize:10}}>(hidden)</span>}<span style={{color:T.txt3,fontSize:10}}>{f.datasource}</span></div>{f.formula&&<div style={{marginTop:4}}><Mono>{f.formula.length>90?f.formula.slice(0,90)+"…":f.formula}</Mono></div>}</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}><span style={{fontSize:12,fontWeight:600,color:f.usageCount===0?T.txt3:f.usageCount>=3?T.green:T.txt2}}>{f.usageCount>0?`${f.usageCount}×`:"—"}</span><div style={{display:"flex",gap:4}}>{f.datatype&&<Badge label={f.datatype} color={T.txt3}/>}<NameBadges f={f}/></div></div>
          </div>)}
          {!fields.length&&<div style={{color:T.txt3,textAlign:"center",padding:40}}>No matching fields.</div>}
        </div>
      ):(
        <div style={{height:"100%",border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",animation:"fadeIn .18s ease-out",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
          <LineagePanel nodeId={selId} lineage={wb.lineage} onSelect={handleLineageNav} onClose={()=>setSelId(null)}/>
        </div>
      )}
    </div>
  </div>;
}

// ─── Worksheet visual ─────────────────────────────────
const SHELF_S={cols:{border:"#94a3b8",hBg:"#f1f5f9",lc:"#475569"},rows:{border:"#94a3b8",hBg:"#f1f5f9",lc:"#475569"},chart:{border:"#a855f7",hBg:"#faf5ff",lc:"#7e22ce"},marks:{border:"#f97316",hBg:"#fff7ed",lc:"#c2410c"},filters:{border:"#ef4444",hBg:"#fef2f2",lc:"#b91c1c"}};
function ShelfBox({sk,title,icon,children}){const s=SHELF_S[sk];return(
  <div style={{border:`1.5px solid ${s.border}`,borderRadius:6,overflow:"hidden",background:"#fff",marginBottom:10}}>
    <div style={{padding:"5px 12px",fontSize:11,fontWeight:700,color:s.lc,background:s.hBg,borderBottom:`1px solid ${s.border}55`,display:"flex",alignItems:"center",gap:6}}>{icon} {title}</div>
    <div style={{padding:"10px 12px",minHeight:40}}>{children||<span style={{color:"#cbd5e1",fontSize:12,fontStyle:"italic"}}>Empty</span>}</div>
  </div>
);}
const ENC_CH=[{key:"color",label:"Color",icon:<Icon name="enc_color" size={12}/>},{key:"size",label:"Size",icon:<Icon name="enc_size" size={12}/>},{key:"label",label:"Label",icon:<Icon name="enc_label" size={12}/>},{key:"detail",label:"Detail",icon:<Icon name="search" size={12}/>},{key:"tooltipText",label:"Tooltip",icon:<Icon name="enc_tooltip" size={12}/>,hideLabel:true},{key:"path",label:"Path",icon:<Icon name="enc_wave" size={12}/>}];
function WorksheetVisual({sheet,dsMap,fieldNameMap}){
  const mSet=new Set(sheet.measures.flatMap(m=>[m.name,m.caption,cleanTok(m.name),cleanTok(m.caption)]));
  const dSet=new Set(sheet.dimensions.flatMap(d=>[d.name,d.caption,cleanTok(d.name),cleanTok(d.caption)]));
  const display=tok=>{
    const agg=extractAgg(tok);
    const c=cleanTok(tok);
    const direct=fieldNameMap?.[c]||fieldNameMap?.[tok.replace(/^\[|\]$/g,"")];
    let name;
    if(direct&&!direct.match(/^Calculation_\d+$/i)&&!/\(copy\)/i.test(direct))name=direct;
    else if(direct&&!direct.match(/^Calculation_\d+$/i))name=direct;
    else{const base=c.replace(/\s*\(copy\)\s*\d*$/i,"").replace(/_copy\d*$/i,"").trim();name=(base!==c&&fieldNameMap?.[base])||base||c;}
    return agg?`${agg}(${name})`:name;
  };
  const role=tok=>{const c=cleanTok(tok),r=fieldNameMap?.[c]||c;if(mSet.has(c)||mSet.has(r)||sheet.measures.some(m=>display(m.name)===display(tok)))return "measure";if(dSet.has(c)||dSet.has(r)||sheet.dimensions.some(d=>display(d.name)===display(tok)))return "dimension";return "unknown";};
  const FP=({token})=><Pill label={display(token)} role={role(token)}/>;
  const merged={...sheet.encodings,tooltipText:[...(sheet.encodings?.tooltip||[]),...(sheet.encodings?.text||[])]};
  const activeEncs=ENC_CH.filter(ch=>(merged[ch.key]||[]).length>0);
  const mm=MARK_META[sheet.markType]||MARK_META.Unknown;
  const visDs=sheet.datasourceNames.filter(ds=>ds!=="Parameters");
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <h3 style={{fontWeight:700,color:T.txt,fontSize:15,margin:0}}>{sheet.name}</h3>
        <ChartBadge type={sheet.markType}/>
        {visDs.map(ds=><span key={ds} style={{fontSize:11,background:T.surface2,color:T.txt2,padding:"2px 8px",borderRadius:12,border:`1px solid ${T.border}`}}>{dsMap[ds]||ds}</span>)}
      </div>
      <ShelfBox sk="chart" title="Chart Type" icon={<Icon name="chart" size={12}/>}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:28,fontFamily:"monospace",color:mm.color,lineHeight:1}}>{mm.icon}</span><div><div style={{fontWeight:700,color:T.txt,fontSize:13}}>{mm.label}</div><div style={{fontSize:10,color:T.txt3,fontFamily:"monospace",marginTop:2}}>{sheet.markType}</div></div></div></ShelfBox>
      <ShelfBox sk="cols" title="Columns" icon={<Icon name="cols_shelf" size={12}/>}><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(sheet.colFields||[]).map((f,i)=>{const agg=sheet.colAggs?.[i];const nm=display(f);return <Pill key={i} label={agg?`${agg}(${nm})`:nm} role={role(f)}/>;})}</div></ShelfBox>
      <ShelfBox sk="rows" title="Rows" icon={<Icon name="rows_shelf" size={12}/>}><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(sheet.rowFields||[]).map((f,i)=>{const agg=sheet.rowAggs?.[i];const nm=display(f);return <Pill key={i} label={agg?`${agg}(${nm})`:nm} role={role(f)}/>;})}</div></ShelfBox>
      <ShelfBox sk="filters" title="Filters" icon={<Icon name="funnel" size={12}/>}><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(sheet.filters||[]).map((f,i)=><span key={i} style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#991b1b",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:500}}>{display(f)||f}</span>)}</div></ShelfBox>
      <ShelfBox sk="marks" title="Marks" icon={<Icon name="enc_color" size={12}/>}>{activeEncs.length>0?(<div style={{display:"flex",flexDirection:"column",gap:8}}>{activeEncs.map(ch=><div key={ch.key} style={{display:"flex",alignItems:"flex-start",gap:8}}>{!ch.hideLabel&&<span style={{fontSize:11,fontWeight:600,color:T.txt2,flexShrink:0,minWidth:60,paddingTop:2}}>{ch.icon} {ch.label}</span>}<div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(merged[ch.key]||[]).map((f,i)=><FP key={i} token={f}/>)}</div></div>)}</div>):null}</ShelfBox>
    </div>
  );
}
function WorksheetsTab({wb,pendingWorksheet,clearPendingWorksheet}){
  const[filterDs,setFilterDs]=useState("__all__"),[selSheet,setSelSheet]=useState(null);
  useEffect(()=>{
    if(pendingWorksheet){const found=wb.worksheets.find(ws=>ws.name===pendingWorksheet);if(found){setSelSheet(found);clearPendingWorksheet?.();}}
  },[pendingWorksheet]);
  const dsKeys=[...new Set(wb.worksheets.flatMap(ws=>ws.datasourceNames||[]))].filter(k=>k!=="Parameters");
  const filtered=filterDs==="__all__"?wb.worksheets:wb.worksheets.filter(ws=>(ws.datasourceNames||[]).includes(filterDs));
  const fieldNameMap=useMemo(()=>{const m={};[...(wb.allFields||[]),(wb.parameters||[])].flat().forEach(f=>{const raw=f.name.replace(/^\[|\]$/g,""),cap=f.resolvedCaption||f.caption;if(raw)m[raw]=cap;if(f.caption)m[f.caption]=cap;const c=cleanTok(f.name);if(c)m[c]=cap;const stripped=raw.replace(/:(nk|qk|ok|pk\d*|iqk|iqnk|qn|nn)$/i,"").trim();if(stripped!==raw)m[stripped]=cap;});return m;},[wb]);
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 118px)",minHeight:400}}>
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"8px 0",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",flexShrink:0}}>
        <span style={{fontSize:11,fontWeight:700,color:T.txt3,marginRight:4,flexShrink:0}}>Datasource:</span>
        {["__all__",...dsKeys].map(key=><button key={key} onClick={()=>{setFilterDs(key);setSelSheet(null);}} style={{padding:"4px 12px",fontSize:11,borderRadius:20,border:`1px solid ${filterDs===key?T.accent:T.border}`,background:filterDs===key?T.accent:"transparent",color:filterDs===key?"#fff":T.txt2,cursor:"pointer",fontWeight:500}}>{key==="__all__"?"All":(wb.dsMap[key]||key)}</button>)}
      </div>
      <div style={{display:"flex",flex:1,minHeight:0}}>
        <aside style={{width:"28%",flexShrink:0,background:T.bg,borderRight:`1px solid ${T.border}`,overflowY:"auto",display:"flex",flexDirection:"column",padding:"10px 12px",gap:6}}>
          <div style={{fontSize:11,fontWeight:600,color:T.txt3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2,flexShrink:0}}>Worksheets ({filtered.length})</div>
          {!filtered.length&&<div style={{padding:"24px 0",textAlign:"center",color:T.txt3,fontSize:13}}>No worksheets for this datasource</div>}
          {filtered.map(ws=>{const visDs=(ws.datasourceNames||[]).filter(ds=>ds!=="Parameters");const isSel=selSheet?.name===ws.name;return(
            <button key={ws.name} onClick={()=>setSelSheet(ws)} style={{width:"100%",textAlign:"left",padding:"10px 14px",borderRadius:8,cursor:"pointer",background:isSel?T.accent:T.surface,border:`1px solid ${isSel?T.accent:T.border}`,boxShadow:T.shadow,flexShrink:0}}>
              <div style={{fontWeight:500,fontSize:13,color:isSel?"#fff":T.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{ws.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",opacity:isSel?.85:1}}><ChartBadge type={ws.markType}/>{visDs.slice(0,1).map(ds=><span key={ds} style={{fontSize:10,color:isSel?"rgba(255,255,255,.7)":T.txt3}}>{wb.dsMap[ds]||ds}</span>)}</div>
            </button>
          );})}
        </aside>
        <main style={{flex:1,overflowY:"auto",padding:20,background:T.bg}}>
          {selSheet?<WorksheetVisual sheet={selSheet} dsMap={wb.dsMap} fieldNameMap={fieldNameMap}/>:(
            <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",color:T.txt3}}><div><Icon name="chart" size={44} color={T.txt3} strokeWidth={1.5} style={{margin:"0 auto 12px",opacity:.35}}/><p style={{fontSize:13,fontWeight:500}}>Select a worksheet from the explorer</p></div></div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Issues ───────────────────────────────────────────
function Accordion({id,title,count,color,open,onToggle,children}){return <div style={{background:T.surface,borderRadius:10,border:`1px solid ${open?color+"66":T.border}`,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
  <button onClick={()=>onToggle(id)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",background:open?color+"08":"transparent",border:"none",cursor:"pointer"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontWeight:600,color:T.txt,fontSize:14}}>{title}</span><span style={{background:count>0?color+"18":T.surface2,color:count>0?color:T.txt3,border:`1px solid ${count>0?color+"33":T.border}`,fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{count}</span></div>
    <span style={{color:T.txt3,fontSize:20,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block",lineHeight:1}}>›</span>
  </button>
  <div style={{maxHeight:open?"4000px":"0",overflow:"hidden",transition:"max-height .35s ease"}}><div style={{padding:"0 16px 16px"}}>{children}</div></div>
</div>;}
function IssuesTab({wb,openSection,setOpenSection}){
  const{duplicates,unused,unusedParams}=wb.issues;
  const toggle=id=>setOpenSection(prev=>prev===id?null:id);
  const secs=[{id:"dup",label:"Duplicate Calculations",count:duplicates.length,color:"#dc2626"},{id:"unused",label:"Unused Fields",count:unused.length,color:T.amber},{id:"params",label:"Unused Parameters",count:unusedParams.length,color:T.purple}];
  const IR=({f,icon})=><div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surface2,borderRadius:8,marginBottom:4,border:`1px solid ${T.border}`}}><span style={{color:rc(f),fontSize:14}}>{icon}</span><FieldName f={f}/><span style={{marginLeft:4,color:T.txt3,fontSize:11}}>{f.datasource}</span>{f.formula&&<div style={{marginLeft:"auto"}}><Mono>{f.formula.length>60?f.formula.slice(0,60)+"…":f.formula}</Mono></div>}</div>;
  return <div style={{width:"100%"}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>{secs.map(s=><button key={s.id} onClick={()=>toggle(s.id)} style={{background:openSection===s.id?s.color+"14":T.surface,border:`1px solid ${openSection===s.id?s.color:T.border}`,borderRadius:10,padding:14,cursor:"pointer",textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}><div style={{fontSize:26,fontWeight:700,color:s.count>0?s.color:T.txt3}}>{s.count}</div><div style={{fontSize:11,color:T.txt2,marginTop:3}}>{s.label}</div></button>)}</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <Accordion id="dup" title="Duplicate Calculations" count={duplicates.length} color="#dc2626" open={openSection==="dup"} onToggle={toggle}>
        {!duplicates.length?<div style={{color:T.txt3,textAlign:"center",padding:20}}>✅ No duplicates!</div>:duplicates.map((grp,i)=><div key={i} style={{marginBottom:12}}><div style={{display:"flex",gap:8,marginBottom:6}}><span style={{color:"#dc2626",fontSize:12,fontWeight:600}}>Group {i+1}</span><Badge label={`${grp.length} identical`} color="#dc2626"/></div>{grp.map(f=><div key={f.id} style={{background:T.surface2,borderRadius:8,padding:"9px 12px",marginBottom:4,border:`1px solid ${T.border}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div style={{display:"flex",gap:6,alignItems:"center"}}><FieldName f={f}/><NameBadges f={f}/></div><Badge label={f.datasource} color={T.txt3}/></div><Mono>{f.formula}</Mono></div>)}</div>)}
      </Accordion>
      <Accordion id="unused" title="Unused Fields" count={unused.length} color={T.amber} open={openSection==="unused"} onToggle={toggle}>
        {!unused.length?<div style={{color:T.txt3,textAlign:"center",padding:20}}>✅ No unused fields!</div>:<div style={{display:"flex",flexDirection:"column",gap:4}}>{unused.map(f=><div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}><span style={{color:rc(f),fontSize:14}}>{f.isCalc?"∑":f.role==="measure"?"#":"A"}</span><div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}><FieldName f={f}/><span style={{color:T.txt3,fontSize:11}}>{f.datasource}</span></div><div style={{display:"flex",gap:4}}>{f.isCalc&&<Badge label="calc" color={T.amber}/>}{f.datatype&&<Badge label={f.datatype} color={T.txt3}/>}<NameBadges f={f}/></div></div>)}</div>}
      </Accordion>
      <Accordion id="params" title="Unused Parameters" count={unusedParams.length} color={T.purple} open={openSection==="params"} onToggle={toggle}>
        {!unusedParams.length?<div style={{color:T.txt3,textAlign:"center",padding:20}}>✅ No unused parameters!</div>:<div style={{display:"flex",flexDirection:"column",gap:4}}>{unusedParams.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}><span style={{color:T.purple,fontSize:14}}>⊙</span><span style={{color:T.txt,fontSize:13,flex:1}}>{p.caption}</span><Badge label={p.datatype||"string"} color={T.purple}/></div>)}</div>}
      </Accordion>
    </div>
  </div>;
}

// ─── App ──────────────────────────────────────────────
export default function App(){
  const[wb,setWb]=useState(null),[tab,setTab]=useState("overview"),[drag,setDrag]=useState(false),[err,setErr]=useState(null);
  const[dsSelectedName,setDsSelectedName]=useState(null),[fieldFilter,setFieldFilter]=useState("all"),[dsFilter,setDsFilter]=useState(null),[openIssueSection,setOpenIssueSection]=useState(null);
  const[pendingFieldId,setPendingFieldId]=useState(null),[pendingWorksheet,setPendingWorksheet]=useState(null);
  const load=useCallback(file=>{if(!file)return;const r=new FileReader();r.onload=e=>{try{const w=parseTableau(e.target.result);setWb(w);setDsSelectedName(w.datasources[0]?.name||null);setTab("overview");setErr(null);}catch(ex){setErr(ex.message);}};r.readAsText(file);},[]);
  const totalIssues=wb?(wb.issues.duplicates.length+wb.issues.unused.length+wb.issues.unusedParams.length+wb.issues.namingIssues.length):0;
  const TABS=[{id:"overview",l:"Overview",i:<Icon name="overview" size={13}/>},{id:"datasources",l:"Datasources",i:<Icon name="database" size={13}/>},{id:"fields",l:"Fields",i:<Icon name="fields" size={13}/>},{id:"dashboards",l:"Dashboards",i:<Icon name="dashboard" size={13}/>},{id:"worksheets",l:"Worksheets",i:<Icon name="worksheet" size={13}/>},{id:"issues",l:`Issues${totalIssues>0?" ⚠":""}`,i:<Icon name="issues" size={13}/>}];
  const isFullHeight=tab==="worksheets";
  if(!wb)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:32}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);load(e.dataTransfer.files[0]);}}>
      <div style={{textAlign:"center",maxWidth:460}}>
        <div style={{width:72,height:72,borderRadius:16,background:T.accentBg,border:`1px solid ${T.accent}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}><Icon name="chart" size={34} color={T.accent} strokeWidth={1.5}/></div>
        <h1 style={{fontSize:24,fontWeight:700,color:T.txt,marginBottom:8}}>Tableau D.I.V.E.</h1>
		<h1 style={{fontSize:16,fontWeight:700,color:T.txt,marginBottom:8}}>Dashboard Inspector & Viz Explorer</h1>
        <p style={{color:T.txt2,marginBottom:6,lineHeight:1.6}}>Upload a <strong style={{color:T.txt}}>.twb</strong> file to analyze datasources, fields, lineage, dashboard layouts, worksheet shelves, and workbook health.</p>
        <div style={{border:`2px dashed ${drag?T.accent:T.border2}`,borderRadius:12,padding:"40px 32px",marginTop:24,background:drag?T.accentBg:T.surface,transition:"all .2s",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <p style={{color:T.txt2,marginBottom:16,fontSize:13}}>Drop your .twb file here or</p>
          <label style={{padding:"10px 20px",background:T.accent,color:"#fff",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500}}>Choose File<input type="file" accept=".twb,.xml" style={{display:"none"}} onChange={e=>load(e.target.files[0])}/></label>
          <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:16}}>
            <button onClick={()=>{const w=makeSample();setWb(w);setDsSelectedName(w.datasources[0]?.name);setTab("overview");}} style={{color:T.accent,background:"none",border:"none",cursor:"pointer",fontSize:12}}>or load a sample workbook →</button>
          </div>
        </div>
        {err&&<p style={{marginTop:16,color:T.red,fontSize:12}}>{err}</p>}
        <div style={{marginTop:16,background:"#000",borderRadius:12,padding:"14px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <span style={{color:"#fff",fontSize:16,fontWeight:500,letterSpacing:"0.03em"}}><strong style={{color:T.green}}>Created by 2KBI</strong></span>
          <a href="mailto:louis.yu@2k.com" title="Email" style={{color:"#ccc",display:"flex",alignItems:"center",transition:"color .15s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#ccc"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
               &nbsp;&nbsp;<span style={{color:"#fff",fontSize:12,fontWeight:500,letterSpacing:"0.03em"}}>Contact us if you face any issues</span></a>
        </div>
      </div>
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.txt,display:"flex",flexDirection:"column"}}>
      <header style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"11px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 3px rgba(0,0,0,.06)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Icon name="chart" size={20} color={T.accent}/>
          <div><div style={{fontWeight:700,color:T.txt,fontSize:14}}>Tableau Workbook Analyzer</div><div style={{fontSize:11,color:T.txt3}}>{wb.datasources.length} source{wb.datasources.length!==1?"s":""} · {wb.worksheets.length} sheets · {wb.dashboards.length} dashboards · {wb.allFields.length} fields</div></div>
        </div>
        <button onClick={()=>{setWb(null);setFieldFilter("all");setDsFilter(null);setOpenIssueSection(null);setPendingFieldId(null);setPendingWorksheet(null);}} style={{color:T.txt2,background:"none",border:"none",cursor:"pointer",fontSize:12}}>← Load another file</button>
      </header>
      <nav style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",gap:2,flexShrink:0}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 16px",fontSize:13,fontWeight:500,cursor:"pointer",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?T.accent:"transparent"}`,color:tab===t.id?T.accent:T.txt2,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>{t.i}{t.l}</button>)}
      </nav>
      <main style={{flex:1,padding:isFullHeight?"0":"18px 24px",overflowY:isFullHeight?"hidden":"auto",display:"flex",flexDirection:"column"}}>
        {tab==="overview"&&<OverviewTab wb={wb} setTab={setTab} setDsNav={setDsSelectedName} setFieldFilter={f=>{setFieldFilter(f);setDsFilter(null);}} setIssueSection={setOpenIssueSection}/>}
        {tab==="datasources"&&<DatasourcesTab wb={wb} selectedName={dsSelectedName||wb.datasources[0]?.name} setSelectedName={setDsSelectedName} onNavigateToFields={(dsName,filter,fieldId)=>{setDsFilter(dsName);setFieldFilter(filter);if(fieldId)setPendingFieldId(fieldId);setTab("fields");}}/>}
        {tab==="fields"&&<FieldsLineageTab wb={wb} fieldFilter={fieldFilter} setFieldFilter={setFieldFilter} dsFilter={dsFilter} setDsFilter={setDsFilter} pendingFieldId={pendingFieldId} clearPendingFieldId={()=>setPendingFieldId(null)}/>}
        {tab==="dashboards"&&<DashboardsTab wb={wb} onNavigateToWorksheet={sn=>{setPendingWorksheet(sn);setTab("worksheets");}}/>}
        {tab==="worksheets"&&<WorksheetsTab wb={wb} pendingWorksheet={pendingWorksheet} clearPendingWorksheet={()=>setPendingWorksheet(null)}/>}
        {tab==="issues"&&<IssuesTab wb={wb} openSection={openIssueSection} setOpenSection={setOpenIssueSection}/>}
      </main>
    </div>
  );
}
