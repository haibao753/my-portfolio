import { researchReady, type BriefItem, type ResearchDossier } from "./model";

export type Translator = (zh: string, en: string) => string;
export const textElement=(tag:string,value:string,cls?:string)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.textContent=value;
  return el;
 };

const txt = textElement;
 const safeUrl=(candidate:string)=>{
  try{const u=new URL(candidate);return ["https:","http:"].includes(u.protocol)?u.href:null}
  catch{return null}
 };

/** Owns card markup and reading interaction; no network or filter state. */
export function createBriefCards(stories: HTMLElement, t: Translator) {
 const makeResearch=(d:ResearchDossier)=>{
  const panel=txt("section","","news-research");
  panel.setAttribute("aria-label",t("论文证据解读","Evidence-led paper reading"));
  panel.append(txt("h4",t("论文研究档案 · 原始 PDF 页码可追溯","Paper research dossier · PDF page references")));
  panel.append(txt("p",d.material_scope||"PDF 文本部分阅读","news-research-scope"));
  const labels:Record<string,[string,string]>={
   question:["研究问题","Research question"],method:["方法与关键思想","Method"],
   findings:["论文报告的发现","Reported findings"],limitations:["局限与尚未证实的部分","Limitations"],
   replication:["学习与复现路线","Learning / replication"]
  };
  const pages=new Map<string,number>();
  for(const c of d.citations||[]){
   if(typeof c.id==="string"&&c.id.startsWith("E")&&/^[0-9]{1,2}$/.test(c.id.slice(1))&&Number.isInteger(c.page)
    && Number(c.page)<=Number(d.pages_total||0))pages.set(c.id,c.page as number);
  }
  for(const [key,names] of Object.entries(labels)){
   const part=d.sections?.[key];
   if(!part||typeof part.text!=="string"||!part.text.trim())continue;
   const section=txt("div","","news-research-part");
   section.append(txt("h5",t(names[0],names[1])),txt("p",part.text));
   const cites=txt("div","","news-research-citations");
   cites.append(txt("span",t("核对论文：","Source pages: ")));
   for(const id of part.evidence_ids||[]){
    const number=pages.get(id);if(number===undefined)continue;
    const link=txt("a",t(`第${number}页`,`p. ${number}`)) as HTMLAnchorElement;
    link.href=(d.source_url||"")+"#page="+number;
    link.rel="noopener noreferrer";link.target="_blank";
    link.setAttribute("aria-label",t(`在原始 PDF 中查看第${number}页`,`Open original PDF page ${number}`));
    cites.append(link);
   }
   section.append(cites);panel.append(section);
  }
  panel.append(txt("p",d.review_status||t("AI 根据部分论文文本归纳，尚未经独立核验。","AI reading of partial PDF text; not independently verified."),"news-disclosure-note"));
  return panel;
 };
 // vNext reading: one open card at a time, peripheral cards recede, the card is
 // brought under the sticky navigation, and closing returns the reader there.
 let readOpen:HTMLElement|null=null;
 const setCardReading=(card:HTMLElement,open:boolean)=>{
  const reading=card.querySelector<HTMLElement>(".news-reading");
  const toggle=card.querySelector<HTMLButtonElement>(".news-read-toggle");
  card.classList.toggle("is-reading",open);
  if(reading)reading.setAttribute("aria-hidden",String(!open));
  if(toggle){
   toggle.setAttribute("aria-expanded",String(open));
   toggle.textContent=open?t("收起 ↑","Show less ↑"):t("展开阅读 ↓","Read more ↓");
  }
  if(open){
   if(readOpen&&readOpen!==card)setCardReading(readOpen,false);
   readOpen=card;
   stories?.classList.add("has-reading");
   requestAnimationFrame(()=>card.scrollIntoView({block:"start",behavior:prefersReduced()?"instant":"smooth"}));
  }else{
   if(readOpen===card)readOpen=null;
   if(readOpen===null)stories?.classList.remove("has-reading");
   if(toggle)toggle.focus({preventScroll:true});
  }
 };
 const prefersReduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
 const readingStructure=(item:BriefItem,card:HTMLElement,expand:HTMLButtonElement)=>{
  const reading=document.createElement("div");
  reading.className="news-reading";
  reading.setAttribute("aria-hidden","true");
  const inner=document.createElement("div");
  inner.className="news-reading-inner";
  if(item.why_zh){
   const reason=txt("p","","news-reason");
   reason.append(txt("b",t("为什么值得关注　","Why it matters　")),document.createTextNode(item.why_zh));
   inner.append(reason);
  }
  const hasDetail=Boolean(item.original_title||item.details_zh||researchReady(item.research));
  if(hasDetail){
   const disclosure=document.createElement("details");
   disclosure.className="news-expanded";
   disclosure.append(txt("summary",t("原文信息与详细解读 ↓","Source info and analysis ↓")));
   if(item.original_title){
    const original=txt("p","","news-original-title");
    original.append(txt("b",t("原文标题：","Source headline: ")),document.createTextNode(item.original_title));
    disclosure.append(original);
   }
   if(item.details_zh){
    disclosure.append(txt("h4",t("站内详细解读","Extended analysis")));
    disclosure.append(txt("p",item.details_zh));
   }
   if(researchReady(item.research))disclosure.append(makeResearch(item.research!));
   inner.append(disclosure);
  }
  inner.append(txt("p",t("一般摘要依据公开标题、摘要整理；研究档案仅取部分可读取 PDF 文本，不等于独立验证或阅读全文。","News summary uses available excerpts; research dossier uses partial PDF text, not independent verification or full-paper review."),"news-disclosure-note"));
  reading.append(inner);
  card.append(reading);
  expand.addEventListener("click",()=>setCardReading(card,!card.classList.contains("is-reading")));
 };
 const buildCard=(item:BriefItem & {issue_date?:string})=>{
  const card=txt("article","","news-card");
  if(item.focus)card.classList.add("is-focus");
  const meta=txt("div","","news-meta");
  const slot=item.edition==="morning"?t("早报","AM"):item.edition==="evening"?t("晚报","PM"):"";
  const fullStamp=item.issue_date||(item.published||"时间未提供");
  const stamp=/^\d{4}-\d{2}-\d{2}/.test(fullStamp)?fullStamp.slice(5,10):fullStamp;
  meta.append(txt("span",(researchReady(item.research)?t("◇ 论文精读 · ","◇ Paper study · "):item.focus?t("✦ 重点 · ","✦ Focus · "):"")+(item.category||"其他"),"news-category"),txt("span",slot?slot+" · "+stamp:stamp));
  const heading=txt("h3",item.title_zh||"未命名资讯");
  const summary=txt("p",item.summary_zh||"","news-summary");
  const expand=txt("button",t("展开阅读 ↓","Read more ↓"),"news-read-toggle") as HTMLButtonElement;
  expand.type="button";
  expand.setAttribute("aria-expanded","false");
  card.append(meta,heading,summary,expand);
  readingStructure(item,card,expand);
  const foot=txt("div","","news-source");
  foot.append(txt("span",item.source||"原始来源"));
  const link=item.url?safeUrl(item.url):null;
  if(link){
   const a=txt("a",t("阅读原始报道 ↗","Read original report ↗")) as HTMLAnchorElement;
   a.href=link;a.rel="noopener noreferrer";a.target="_blank";
   foot.append(a);
  }
  card.append(foot);
  return card;
 };
 return {
  buildCard,
  reset() { readOpen = null; stories.classList.remove("has-reading"); }
 };
}
