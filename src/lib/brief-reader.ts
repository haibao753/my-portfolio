/* J.H. LAB / Daily Brief reader — shared page, unchanged public JSON schema. */
interface ResearchSection {text?:string; evidence_ids?:string[]}
interface ResearchDossier {
 status?:string;material_scope?:string;review_status?:string;source_url?:string;
 pages_read?:number;pages_total?:number;
 citations?:Array<{id?:string;page?:number}>;
 sections?:Record<string,ResearchSection>;
}
interface BriefItem {
 edition?: "morning"|"evening"; focus?: boolean;
 category?: string;source?: string;published?: string;url?: string;
 title_zh?: string;summary_zh?: string;why_zh?: string;
 details_zh?: string;original_title?: string;research?:ResearchDossier;
}
interface BriefIssue {date?:string;items?:BriefItem[]}
interface BriefIndex {dates?:string[];updated_at?:string}
const stories=document.querySelector<HTMLElement>("#stories");
const tabs=document.querySelector<HTMLElement>("#tabs");
const issueSelect=document.querySelector<HTMLSelectElement>("#issues");
const dateButton=document.querySelector<HTMLButtonElement>("#filter-date");
const dateLabel=document.querySelector<HTMLElement>("#filter-date-value");
const dateOptions=document.querySelector<HTMLElement>("#date-options");
const filterScrim=document.querySelector<HTMLElement>("#brief-filter-scrim");
const statusNode=document.querySelector<HTMLElement>("#status");
const quickDates=document.querySelector<HTMLElement>("#quick-dates");
const editionControls=document.querySelector<HTMLElement>("#edition-controls");
const headline=document.querySelector<HTMLElement>("#headlineDate");
const total=document.querySelector<HTMLElement>("#total");
const expandedTotal=document.querySelector<HTMLElement>("#expanded-total");
const filterDock=document.querySelector<HTMLElement>("#brief-filter");
const filterToggle=document.querySelector<HTMLButtonElement>("#filter-toggle");
const filterDetails=document.querySelector<HTMLElement>("#filter-details");
const categoryCompact=document.querySelector<HTMLButtonElement>("#compact-category");
const rangeCompact=document.querySelector<HTMLButtonElement>("#compact-range");
const editionCompact=document.querySelector<HTMLButtonElement>("#compact-edition");
const searchInput=document.querySelector<HTMLInputElement>("#brief-search");
const searchClear=document.querySelector<HTMLButtonElement>("#brief-search-clear");
if(stories&&tabs&&issueSelect&&quickDates&&editionControls&&statusNode&&headline&&total&&filterDock&&filterToggle&&filterDetails&&categoryCompact&&rangeCompact&&editionCompact&&dateButton&&dateLabel&&dateOptions&&filterScrim&&searchInput&&searchClear){
 let current:(BriefItem & {issue_date?:string})[]=[];
 let viewLabel="";
 let availableDates:string[]=[];
 let selectedRange=0;
 let loaded=false;
 let category="全部";
 let selectedEdition="all";
 let query="";
 let request=0;
 const root=document.documentElement;
 const t=(zh:string,en:string)=>root.lang==="en"?en:zh;
 const isDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date);
 const todayBeijing=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const recentDays=(date:string,days:number)=>{
  const end=Date.parse(date+"T00:00:00Z");
  const start=end-(days-1)*86400000;
  return (d:string)=>{const ms=Date.parse(d+"T00:00:00Z");return ms>=start&&ms<=end};
 };
 const setFilterOpen=(open:boolean)=>{
  filterDock.dataset.expanded=String(open);
  // The glass panel is absolutely anchored; opening must never reflow the title or article list.
  filterToggle.setAttribute("aria-expanded",String(open));
  dateButton.setAttribute("aria-expanded",String(open));
  filterScrim.classList.toggle("is-open",open);
  filterToggle.setAttribute("aria-label",open?t("收起筛选栏","Collapse filters"):t("展开筛选栏","Expand filters"));
  filterDetails.setAttribute("aria-hidden",String(!open));
  filterDetails.toggleAttribute("inert",!open);
  filterDock.classList.toggle("has-open-popover",open);
 };
 const openFilterAt=(group:HTMLElement)=>{
  setFilterOpen(true);
  const active=group.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')||group.querySelector<HTMLButtonElement>("button");
  active?.focus({preventScroll:true});
 };
 filterToggle.addEventListener("click",()=>setFilterOpen(filterDock.dataset.expanded!=="true"));
 dateButton.addEventListener("click",()=>{
  if(filterDock.dataset.expanded==="true"){setFilterOpen(false);return;}
  openFilterAt(dateOptions);
 });
 filterScrim.addEventListener("click",()=>setFilterOpen(false));
 categoryCompact.addEventListener("click",()=>openFilterAt(tabs));
 rangeCompact.addEventListener("click",()=>openFilterAt(quickDates));
 editionCompact.addEventListener("click",()=>openFilterAt(editionControls));
 document.addEventListener("keydown",(event)=>{
  if(event.key==="Escape"&&filterDock.dataset.expanded==="true"){
   setFilterOpen(false);filterToggle.focus({preventScroll:true});
  }
 });
 document.addEventListener("pointerdown",(event)=>{
  if(event.target===filterScrim)return; // Close on click, not pointerdown, to prevent tap-through.
  if(filterDock.dataset.expanded==="true"&&!filterDock.contains(event.target as Node))setFilterOpen(false);
 });
 const updateCompact=()=>{
  dateLabel.textContent=(issueSelect.value||availableDates[0]||"").slice(5)||"-- --";
  dateButton.setAttribute("aria-label",t(`日期：${issueSelect.value||"未选择"}；打开筛选`,`Date: ${issueSelect.value||"not selected"}; open filters`));
  categoryCompact.textContent=category==="全部"?t("全部","All"):category;
  rangeCompact.textContent=selectedRange===3?t("近三天","3 days"):selectedRange===7?t("近一周","7 days"):t("当天","Day");
  editionCompact.textContent=selectedEdition==="morning"?t("早报","AM"):selectedEdition==="evening"?t("晚报","PM"):t("全部刊期","Both");
  categoryCompact.setAttribute("aria-label",t(`分类：${category}；展开分类筛选`,`Category: ${category}; open filters`));
  rangeCompact.setAttribute("aria-label",t(`时间范围：${rangeCompact.textContent}；展开筛选`,`Date range: ${rangeCompact.textContent}; open filters`));
  editionCompact.setAttribute("aria-label",t(`刊期：${editionCompact.textContent}；展开筛选`,`Edition: ${editionCompact.textContent}; open filters`));
 };
 const updateDateButtons=()=>{
  dateOptions.querySelectorAll<HTMLButtonElement>("button[data-date]").forEach(button=>{
   const selected=button.dataset.date===issueSelect.value;
   button.setAttribute("aria-pressed",String(selected));
   if(selected)button.setAttribute("aria-current","date");else button.removeAttribute("aria-current");
  });
  dateLabel.textContent=issueSelect.value?issueSelect.value.slice(5):"-- --";
 };
 const renderDateButtons=()=>{
  const nodes=document.createDocumentFragment();
  for(const date of availableDates){
   const button=document.createElement("button");
   button.type="button";button.dataset.date=date;button.textContent=date.slice(5);
   button.title=date;
   button.setAttribute("aria-label",t(`查看 ${date} 的简报`,`Read the issue for ${date}`));
   button.addEventListener("click",()=>{
    issueSelect.value=date;updateDateButtons();void load(date);
   });
   nodes.append(button);
  }
  dateOptions.replaceChildren(nodes);updateDateButtons();
 };
 const updateRangeButtons=()=>quickDates.querySelectorAll<HTMLButtonElement>("button[data-days]").forEach(button=>button.setAttribute("aria-pressed",String(Number(button.dataset.days)===selectedRange)));
 const updateEditionButtons=()=>editionControls.querySelectorAll<HTMLButtonElement>("button[data-edition]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.edition===selectedEdition)));
 const viewTitle=()=>selectedRange?t(`近${selectedRange===3?"三天":"一周"}`,`Last ${selectedRange} days`):viewLabel;
 const txt=(tag:string,value:string,cls?:string)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.textContent=value;
  return el;
 };
 const safeUrl=(candidate:string)=>{
  try{const u=new URL(candidate);return ["https:","http:"].includes(u.protocol)?u.href:null}
  catch{return null}
 };
 const researchReady=(d:ResearchDossier|undefined)=>{
  if(!d||d.status!=="partial_pdf_text"||!d.sections||!Array.isArray(d.citations))return false;
  try{
   const url=new URL(d.source_url||"");
   return url.protocol==="https:" && ["arxiv.org","www.arxiv.org"].includes(url.hostname)
    && url.pathname.startsWith("/pdf/") && url.pathname.length>5
    && !url.search && !url.username && !url.password && !url.port;
  }catch{return false}
 };
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
 const normalizeSearch=(value:string)=>value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g," ").trim();
 const matchesQuery=(item:BriefItem)=>{
  if(!query)return true;
  const fields=[item.title_zh,item.original_title,item.summary_zh,item.why_zh,item.details_zh,item.source,item.category,
   ...Object.values(item.research?.sections||{}).map(section=>section?.text)];
  return normalizeSearch(fields.filter((v):v is string=>typeof v==="string").join(" ")).includes(query);
 };
 const render=()=>{
  const selection=current.filter(x=>(category==="全部"||(x.category||"其他")===category) && (selectedEdition==="all"||x.edition===selectedEdition) && matchesQuery(x));
  statusNode.textContent=t(`显示 ${selection.length} 条`,`Showing ${selection.length} stories`);
  statusNode.classList.add("is-summary");
  total.textContent=String(selection.length);
  if(expandedTotal)expandedTotal.textContent=total.textContent;
  updateCompact();
  const fragment=document.createDocumentFragment();
  if(!selection.length)fragment.append(txt("div",query?
    t("没有找到匹配的资讯。试试其他关键词或调整日期范围。","No matches. Try another keyword or date range."):
    t("当前日期范围暂无该话题的资讯，可试试近一周或其他分类。","No stories for this topic in the selected dates. Try last week or another topic."),"news-empty"));
  for(const item of selection){
   const card=txt("article","","news-card");
   if(item.focus)card.classList.add("is-focus");
   const meta=txt("div","","news-meta");
   const slot=item.edition==="morning"?t("早报","AM"):item.edition==="evening"?t("晚报","PM"):"";
   const fullStamp=item.issue_date||(item.published||"时间未提供");
   const stamp=/^\d{4}-\d{2}-\d{2}/.test(fullStamp)?fullStamp.slice(5,10):fullStamp;
   meta.append(txt("span",(researchReady(item.research)?t("◇ 论文精读 · ","◇ Paper study · "):item.focus?t("✦ 重点 · ","✦ Focus · "):"")+(item.category||"其他"),"news-category"),txt("span",slot?slot+" · "+stamp:stamp));
   const heading=txt("h3",item.title_zh||"未命名资讯");
   const summary=txt("p",item.summary_zh||"","news-summary");
   card.append(meta,heading,summary);
   const expand=txt("button",t("展开阅读 ↓","Read more ↓"),"news-read-toggle") as HTMLButtonElement;
   expand.type="button";
   expand.setAttribute("aria-expanded","false");
   expand.addEventListener("click",()=>{
    const open=card.classList.toggle("is-reading");
    expand.setAttribute("aria-expanded",String(open));
    expand.textContent=open?t("收起 ↑","Show less ↑"):t("展开阅读 ↓","Read more ↓");
   });
   card.append(expand);
   if(item.why_zh){
    const reason=txt("p","","news-reason");
    reason.append(txt("b",t("为什么值得关注　","Why it matters　")),document.createTextNode(item.why_zh));
    card.append(reason);
   }
   // The original publisher may be paywalled. Show only our grounded,
   // editorially transformed explanation here—not the copyrighted full text.
   const hasExtra=true;
   if(hasExtra){
    const disclosure=document.createElement("details");
    disclosure.className="news-expanded";
    const toggle=document.createElement("summary");
    toggle.textContent=t("展开原文信息与详细解读 ↓","Expand source info and analysis ↓");
    disclosure.append(toggle);
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
    disclosure.append(txt("p",t("一般摘要依据公开标题、摘要整理；研究档案仅取部分可读取 PDF 文本，不等于独立验证或阅读全文。","News summary uses available excerpts; research dossier uses partial PDF text, not independent verification or full-paper review."),"news-disclosure-note"));
    card.append(disclosure);
   }
   const foot=txt("div","","news-source");
   foot.append(txt("span",item.source||"原始来源"));
   const link=item.url?safeUrl(item.url):null;
   if(link){
    const a=txt("a",t("阅读原始报道 ↗","Read original report ↗")) as HTMLAnchorElement;
    a.href=link;a.rel="noopener noreferrer";a.target="_blank";
    foot.append(a);
   }
   card.append(foot);fragment.append(card);
  }
  stories.replaceChildren(fragment);
 };
 const renderTabs=()=>{
  const names=["全部",...new Set([...current.map(x=>x.category||"其他"),"亲密关系","设计学"])];
  const fragment=document.createDocumentFragment();
  for(const name of names){
   const button=txt("button",name==="全部"?t("全部","All"):name,"filter-chip") as HTMLButtonElement;
   button.type="button";button.setAttribute("aria-pressed",String(category===name));
   button.addEventListener("click",()=>{
    // Keep the clicked button mounted so keyboard focus survives filtering.
    category=name;
    tabs.querySelectorAll("button").forEach(tab=>tab.setAttribute("aria-pressed",String(tab===button)));
    render();
   });
   fragment.append(button);
  }
  tabs.replaceChildren(fragment);
 };

 const updateSearch=()=>{
  query=normalizeSearch(searchInput.value).slice(0,120);
  searchClear.hidden=!searchInput.value;
  if(loaded)render();
 };
 searchInput.addEventListener("input",updateSearch);
 searchInput.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&searchInput.value){
   event.stopPropagation();searchInput.value="";updateSearch();
  }
 });
 searchClear.addEventListener("click",()=>{
  searchInput.value="";updateSearch();
  searchInput.focus({preventScroll:true});
 });
 let controller:AbortController|undefined;
 const load=async(date:string)=>{
  const currentRequest=++request;
  controller?.abort();controller=new AbortController();
  loaded=false;
  statusNode.classList.remove("is-summary");
  current=[];tabs.replaceChildren();stories.replaceChildren();total.textContent="—";if(expandedTotal)expandedTotal.textContent="—";
  headline.textContent=date;
  stories.setAttribute("aria-busy","true");
  statusNode.textContent=t(`正在加载 ${date}…`,`Loading ${date}…`);
  try{
   if(!isDate(date))throw Error("日期格式不正确");
   const response=await fetch(`/brief/data/${date}.json`,{cache:"no-cache",signal:controller.signal});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const data=await response.json() as BriefIssue;
   if(currentRequest!==request)return;
   if(data.date!==date||!Array.isArray(data.items))throw Error("日报数据结构不符合预期");
   const fields=["category","source","published","url","title_zh","summary_zh","why_zh","details_zh","original_title"] as const;
   if(data.items.some(item=>!item||typeof item!=="object"||fields.some(key=>item[key]!==undefined&&typeof item[key]!=="string")))throw Error("日报条目结构不符合预期");
   current=data.items;loaded=true;category="全部";selectedRange=0;selectedEdition="all";viewLabel=date;updateRangeButtons();updateEditionButtons();updateDateButtons();
   headline.textContent=date;
   total.textContent=String(current.length);
   if(expandedTotal)expandedTotal.textContent=total.textContent;
   renderTabs();render();
  }catch(error){
   if(currentRequest!==request)return;
   current=[];total.textContent="—";if(expandedTotal)expandedTotal.textContent="—";
   headline.textContent=date;
   tabs.replaceChildren();stories.replaceChildren(txt("div",t("这期内容暂时无法加载，请稍后重试。","This issue is unavailable. Please try again shortly."),"news-empty"));
   statusNode.textContent=t("加载失败，请切换日期或刷新重试。","Unable to load. Choose another date or refresh to retry.");
  }finally{
   if(currentRequest===request)stories.setAttribute("aria-busy","false");
  }
 };
 const loadRange=async(days:number)=>{
  const currentRequest=++request;
  controller?.abort();controller=new AbortController();
  const signal=controller.signal;
  selectedRange=days;selectedEdition="all";updateRangeButtons();updateEditionButtons();
  const matching=availableDates.filter(recentDays(todayBeijing(),days));
  loaded=false;current=[];category="全部";statusNode.classList.remove("is-summary");
  tabs.replaceChildren();stories.replaceChildren();stories.setAttribute("aria-busy","true");
  headline.textContent=viewTitle();total.textContent="—";if(expandedTotal)expandedTotal.textContent="—";
  statusNode.textContent=t("正在汇总范围内的简报…","Loading recent issues…");
  try{
   if(!matching.length){
    current=[];loaded=true;viewLabel=viewTitle();
    total.textContent="0";if(expandedTotal)expandedTotal.textContent="0";
    renderTabs();render();
    statusNode.textContent=t("所选日期范围内暂无已发布的简报","No published issues in this date range");
    return;
   }
   const results=await Promise.allSettled(matching.map(async date=>{
    const response=await fetch(`/brief/data/${date}.json`,{cache:"no-cache",signal});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const issue=await response.json() as BriefIssue;
    if(issue.date!==date||!Array.isArray(issue.items))throw Error("Invalid issue");
    const keys=["category","source","published","url","title_zh","summary_zh","why_zh","details_zh","original_title"] as const;
    if(issue.items.some(item=>!item||typeof item!=="object"||keys.some(key=>item[key]!==undefined&&typeof item[key]!=="string")))throw Error("Invalid stories");
    return issue.items.map(item=>({...item,issue_date:date}));
   }));
   if(currentRequest!==request)return;
   const success=results.filter((result):result is PromiseFulfilledResult<(BriefItem & {issue_date:string})[]>=>result.status==="fulfilled");
   if(!success.length)throw Error("All matching issues failed");
   // Preserve newest issue first, while deduplicating the same source URL.
   const seen=new Set<string>();
   current=success.flatMap(result=>result.value).filter(item=>{
    const key=item.url||`${item.title_zh}|${item.source}`;
    if(seen.has(key))return false;
    seen.add(key);return true;
   });
   loaded=true;viewLabel=viewTitle();
   total.textContent=String(current.length);
   if(expandedTotal)expandedTotal.textContent=total.textContent;
   headline.textContent=viewLabel;
   renderTabs();render();
   if(success.length<matching.length){
    statusNode.classList.remove("is-summary");
    statusNode.textContent=t(`有 ${matching.length-success.length} 期加载失败，请稍后重试。`,`${matching.length-success.length} issue(s) failed to load. Please retry.`);
   }
  }catch{
   if(currentRequest!==request)return;
   current=[];loaded=false;
   tabs.replaceChildren();
   stories.replaceChildren(txt("div",t("近期简报暂时无法加载，请重试。","Recent issues are unavailable. Try again."),"news-empty"));
   statusNode.textContent=t("范围加载失败，请重试或选择具体日期。","Range loading failed. Try again or choose a date.");
  }finally{
   if(currentRequest===request)stories.setAttribute("aria-busy","false");
  }
 };
 editionControls.querySelectorAll<HTMLButtonElement>("button[data-edition]").forEach(button=>{
  button.addEventListener("click",()=>{selectedEdition=button.dataset.edition||"all";updateEditionButtons();render();});
 });
  quickDates.querySelectorAll<HTMLButtonElement>("button[data-days]").forEach(button=>{
  button.addEventListener("click",()=>Number(button.dataset.days)===0?void load(issueSelect.value):void loadRange(Number(button.dataset.days)));
 });
 let manifestStamp="";
 const refreshManifest=async(initial=false)=>{
  try{
   const response=await fetch("/brief/data/index.json",{cache:"no-cache"});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const index=await response.json() as BriefIndex;
   if(!Array.isArray(index.dates))throw Error("归档索引结构不符合预期");
   const dates=[...new Set(index.dates.filter(date=>typeof date==="string"&&isDate(date)))].sort().reverse();
   const stamp=(index.updated_at||"")+"|"+dates.join(",");
   if(!initial&&stamp===manifestStamp)return;
   const previousNewest=availableDates[0];
   const priorSelection=issueSelect.value;
   const viewingLatest=initial||(selectedRange===0&&priorSelection===previousNewest);
   manifestStamp=stamp;
   availableDates=dates;
   issueSelect.replaceChildren();
   if(!dates.length){
    stories.replaceChildren(txt("div",t("观察站已经就绪，等待首期日报发布。","Ready for the first Daily Brief."),"news-empty"));
    statusNode.textContent=t("尚无归档数据","No archived issues yet");return;
   }
   for(const date of dates){
    const option=txt("option",date.slice(5)) as HTMLOptionElement;
    option.value=date;option.title=date;issueSelect.append(option);
   }
   renderDateButtons();
   if(viewingLatest){
    issueSelect.value=dates[0];
    if(initial&&dates.length>1&&recentDays(todayBeijing(),3)(dates[0]))await loadRange(3);
    else await load(dates[0]);
    if(!loaded)manifestStamp=""; // Retry if manifest arrived before the article could load.
   }else{
    if(dates.includes(priorSelection))issueSelect.value=priorSelection;
    updateDateButtons();
    if(selectedRange>0)await loadRange(selectedRange);
   }
  }catch(error){
   if(!initial)return;
   stories.replaceChildren(txt("div",t("暂时无法获取资讯，请稍后重试。","Stories are unavailable. Please try again shortly."),"news-empty"));
   statusNode.textContent=t("归档暂时无法加载，请刷新重试。","Archive unavailable. Refresh to retry.");
  }
 };
 issueSelect.addEventListener("change",()=>{updateDateButtons();void load(issueSelect.value)});
 const checkForUpdates=()=>{if(!document.hidden)void refreshManifest();};
 window.addEventListener("focus",checkForUpdates);
 document.addEventListener("visibilitychange",checkForUpdates);
 window.setInterval(checkForUpdates,10*60*1000);
 const refreshLanguage=()=>{
  tabs.setAttribute("aria-label",t("内容分类","Story categories"));
  searchInput.placeholder=t("标题、摘要、来源、关键词…","Title, summary, source, keyword…");
  searchInput.setAttribute("aria-label",t("搜索已加载简报的标题、摘要、来源及解读","Search titles, summaries, sources and analysis in loaded issues"));
  searchClear.setAttribute("aria-label",t("清空搜索","Clear search"));
  issueSelect.setAttribute("aria-label",t("当前归档日期（内部同步）","Current issue date (internal sync)"));
  renderDateButtons();
  if(loaded){
   headline.textContent=viewTitle();
   renderTabs();render();
  }
  updateCompact();
  setFilterOpen(filterDock.dataset.expanded==="true");
 };
 new MutationObserver(refreshLanguage).observe(root,{attributes:true,attributeFilter:["lang"]});
 refreshLanguage();
 void refreshManifest(true);
}

export {};
