/* J.H. LAB / Daily Brief reader — shared page, unchanged public JSON schema.
 *
 * vNext: one filter state, one render path. Date/range/edition/topic/query are
 * owned here; UI chips only project that state. Loading, empty, no-result,
 * network and parse failures are distinct states, and the first paint reserves
 * its height with skeleton cards.
 */
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
type ScopeMode="issue"|"range"|"archive";
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
const searchAll=document.querySelector<HTMLButtonElement>("#brief-search-all");
const searchScope=document.querySelector<HTMLElement>("#search-scope");
const filterReset=document.querySelector<HTMLButtonElement>("#filter-reset");
const storiesProgress=document.querySelector<HTMLElement>("#stories-progress");
const storiesProgressCopy=document.querySelector<HTMLElement>("#stories-progress-copy");
const storiesLoadMore=document.querySelector<HTMLButtonElement>("#stories-load-more");
const storiesSentinel=document.querySelector<HTMLElement>("#stories-sentinel");
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
 let scopeMode:ScopeMode="issue";
 let searchTimer:ReturnType<typeof setTimeout>|undefined;
 const root=document.documentElement;
 const t=(zh:string,en:string)=>root.lang==="en"?en:zh;
 const isDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date);
 const todayBeijing=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const recentDays=(date:string,days:number)=>{
  const end=Date.parse(date+"T00:00:00Z");
  const start=end-(days-1)*86400000;
  return (d:string)=>{const ms=Date.parse(d+"T00:00:00Z");return ms>=start&&ms<=end};
 };
 const rangeLabel=(days:number)=>days===3?t("近三天","last 3 days"):days===7?t("近一周","last 7 days"):t("当天","this day");
 const scopeLabel=()=>scopeMode==="archive"?t("全部归档","all archived issues"):selectedRange?rangeLabel(selectedRange):viewLabel||t("当前简报","current issue");
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
 const updateSearchScope=()=>{
  if(searchScope)searchScope.textContent=t(`范围：${scopeLabel()}`,`Scope: ${scopeLabel()}`);
  if(searchAll)searchAll.hidden=!(query&&availableDates.length>1&&scopeMode!=="archive");
 };
 const updateCompact=()=>{
  dateLabel.textContent=(issueSelect.value||availableDates[0]||"").slice(5)||"-- --";
  dateButton.setAttribute("aria-label",t(`日期：${issueSelect.value||"未选择"}；打开筛选`,`Date: ${issueSelect.value||"not selected"}; open filters`));
  categoryCompact.textContent=category==="全部"?t("全部","All"):category;
  rangeCompact.textContent=selectedRange===3?t("近三天","3 days"):selectedRange===7?t("近一周","7 days"):t("当天","Day");
  editionCompact.textContent=selectedEdition==="morning"?t("早报","AM"):selectedEdition==="evening"?t("晚报","PM"):t("全部刊期","Both");
  categoryCompact.setAttribute("aria-label",t(`分类：${category}；展开分类筛选`,`Category: ${category}; open filters`));
  rangeCompact.setAttribute("aria-label",t(`时间范围：${rangeCompact.textContent}；展开筛选`,`Date range: ${rangeCompact.textContent}; open filters`));
  editionCompact.setAttribute("aria-label",t(`刊期：${editionCompact.textContent}；展开筛选`,`Edition: ${editionCompact.textContent}; open filters`));
  updateSearchScope();
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
 const renderSkeleton=()=>{
  const fragment=document.createDocumentFragment();
  for(let index=0;index<6;index++){
   const card=txt("div","","news-skeleton");
   card.setAttribute("aria-hidden","true");
   for(let line=0;line<4;line++)card.append(document.createElement("span"));
   fragment.append(card);
  }
  stories.dataset.state="loading";
  stories.replaceChildren(fragment);
 };
 const renderEmpty=(message:string,kind:string,action?:{label:string;run:()=>void})=>{
  const empty=txt("div",message,"news-empty");
  empty.dataset.state=kind;
  if(action){
   const button=txt("button",action.label,"news-empty-retry") as HTMLButtonElement;
   button.type="button";
   button.addEventListener("click",action.run);
   empty.append(document.createElement("br"),button);
  }
  stories.dataset.state=kind;
  stories.replaceChildren(empty);
 };
 const renderError=(message:string,retry:()=>void)=>{
  statusNode.textContent=message;
  statusNode.classList.remove("is-summary");
  renderEmpty(message,"error",{label:t("重试","Retry"),run:retry});
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
 /* The archive grows every day; painting every matching card at once blocks the
    main thread for ~0.5s at 120+ cards. The list is paginated by viewport: the
    total is shown immediately, the first chunk paints fast, and more chunks
    follow on scroll or on request. Filters/search always operate on the full
    selection, not only the painted chunk. */
 const CHUNK=24;
 let visibleStories:(BriefItem & {issue_date?:string})[]=[];
 let renderedCount=0;
 let progressObserver:IntersectionObserver|null=null;
 const updateProgress=()=>{
  if(!storiesProgress||!storiesProgressCopy||!storiesLoadMore)return;
  const remaining=visibleStories.length-renderedCount;
  storiesProgress.hidden=remaining<=0;
  storiesProgressCopy.textContent=remaining>0
   ?t(`已显示 ${renderedCount} / ${visibleStories.length} 条`,`Showing ${renderedCount} of ${visibleStories.length}`)
   :"";
  storiesLoadMore.textContent=t(`继续加载 ↓（还剩 ${remaining} 条）`,`Load more ↓ (${remaining} left)`);
 };
 const appendChunk=()=>{
  if(renderedCount>=visibleStories.length){updateProgress();return}
  const end=Math.min(visibleStories.length,renderedCount+CHUNK);
  const fragment=document.createDocumentFragment();
  for(let index=renderedCount;index<end;index++)fragment.append(buildCard(visibleStories[index]));
  stories?.append(fragment);
  renderedCount=end;
  updateProgress();
 };
 const setupProgressObserver=()=>{
  if(progressObserver||!storiesSentinel||!("IntersectionObserver" in window))return;
  progressObserver=new IntersectionObserver((entries)=>{
   if(entries.some(entry=>entry.isIntersecting)&&visibleStories.length>renderedCount)appendChunk();
  },{rootMargin:"320px 0px"});
  progressObserver.observe(storiesSentinel);
 };
 storiesLoadMore?.addEventListener("click",()=>appendChunk());
 const render=()=>{
  visibleStories=current.filter(x=>(category==="全部"||(x.category||"其他")===category) && (selectedEdition==="all"||x.edition===selectedEdition) && matchesQuery(x));
  statusNode.textContent=t(`显示 ${visibleStories.length} 条 · 范围：${scopeLabel()}`,`Showing ${visibleStories.length} · scope: ${scopeLabel()}`);
  statusNode.classList.add("is-summary");
  total.textContent=String(visibleStories.length);
  if(expandedTotal)expandedTotal.textContent=total.textContent;
  updateCompact();
  readOpen=null;
  stories?.classList.remove("has-reading");
  if(storiesProgress)storiesProgress.hidden=true;
  if(!visibleStories.length){
   if(query)renderEmpty(t("没有找到匹配的资讯。试试其他关键词，或在全部归档中搜索。","No matches. Try another keyword, or search all archived issues."),"empty-search",{label:t("清空搜索","Clear search"),run:()=>{searchInput.value="";updateSearch(true);searchInput.focus({preventScroll:true})}});
   else if(!current.length)renderEmpty(t("本期简报暂无条目。","This issue has no stories yet."),"empty-issue");
   else renderEmpty(t("当前筛选下没有资讯。清除筛选即可返回全部条目。","No stories under these filters. Clear filters to see everything."),"empty-filter",{label:t("清除筛选","Clear filters"),run:()=>void resetFilters()});
   return;
  }
  renderedCount=0;
  stories.dataset.state="ready";
  stories.replaceChildren();
  appendChunk();
  setupProgressObserver();
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
 const updateSearch=(immediate=false)=>{
  if(searchTimer!==undefined){clearTimeout(searchTimer);searchTimer=undefined}
  const apply=()=>{
   query=normalizeSearch(searchInput.value).slice(0,120);
   searchClear.hidden=!searchInput.value;
   if(loaded)render();
   updateSearchScope();
  };
  if(immediate)apply();else searchTimer=setTimeout(apply,140);
 };
 searchInput.addEventListener("input",()=>updateSearch());
 searchInput.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&searchInput.value){
   // Prevent the native search-input Escape clear from racing a fresh query.
   event.preventDefault();event.stopPropagation();
   searchInput.value="";updateSearch(true);
  }
 });
 searchClear.addEventListener("click",()=>{
  searchInput.value="";updateSearch(true);
  searchInput.focus({preventScroll:true});
 });
 searchAll?.addEventListener("click",()=>{void loadAll();});
 let controller:AbortController|undefined;
 const validateIssue=(data:BriefIssue,date:string)=>{
  if(data.date!==date||!Array.isArray(data.items))throw Error("日报数据结构不符合预期");
  const fields=["category","source","published","url","title_zh","summary_zh","why_zh","details_zh","original_title"] as const;
  if(data.items.some(item=>!item||typeof item!=="object"||fields.some(key=>item[key]!==undefined&&typeof item[key]!=="string")))throw Error("日报条目结构不符合预期");
 };
 const beginLoad=(message:string)=>{
  loaded=false;stories.setAttribute("aria-busy","true");stories.dataset.state="loading";
  statusNode.classList.remove("is-summary");
  statusNode.textContent=message;
  renderSkeleton();
 };
 const load=async(date:string)=>{
  const currentRequest=++request;
  controller?.abort();controller=new AbortController();
  beginLoad(t(`正在加载 ${date}…`,`Loading ${date}…`));
  try{
   if(!isDate(date))throw Error("日期格式不正确");
   const response=await fetch(`/brief/data/${date}.json`,{cache:"no-cache",signal:controller.signal});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const data=await response.json() as BriefIssue;
   if(currentRequest!==request)return;
   validateIssue(data,date);
   current=data.items ?? [];loaded=true;
   scopeMode="issue";selectedRange=0;viewLabel=date;
   updateRangeButtons();updateDateButtons();
   headline.textContent=date;
   renderTabs();render();
  }catch(error){
   if(currentRequest!==request)return;
   current=[];total.textContent="—";if(expandedTotal)expandedTotal.textContent="—";
   tabs.replaceChildren();
   renderError(t("这期内容暂时无法加载。检查网络后重试，或切换日期。","This issue is unavailable. Check your connection, retry, or pick another date."),()=>void load(date));
  }finally{
   if(currentRequest===request)stories.setAttribute("aria-busy","false");
  }
 };
 const loadRange=async(days:number)=>{
  const currentRequest=++request;
  controller?.abort();controller=new AbortController();
  const signal=controller.signal;
  selectedRange=days;updateRangeButtons();
  const matching=availableDates.filter(recentDays(todayBeijing(),days));
  beginLoad(t("正在汇总范围内的简报…","Loading recent issues…"));
  try{
   if(!matching.length){
    current=[];loaded=true;scopeMode="range";viewLabel=rangeLabel(days);
    updateSearchScope();renderTabs();render();
    statusNode.textContent=t("所选日期范围内暂无已发布的简报","No published issues in this date range");
    statusNode.classList.remove("is-summary");
    return;
   }
   const results=await Promise.allSettled(matching.map(async date=>{
    const response=await fetch(`/brief/data/${date}.json`,{cache:"no-cache",signal});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const issue=await response.json() as BriefIssue;
    validateIssue(issue,date);
    return (issue.items ?? []).map(item=>({...item,issue_date:date}));
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
   loaded=true;scopeMode="range";viewLabel=rangeLabel(days);
   headline.textContent=rangeLabel(days);
   renderTabs();render();
   if(success.length<matching.length){
    const failed=matching.length-success.length;
    statusNode.classList.remove("is-summary");
    statusNode.textContent=t(`有 ${failed} 期加载失败，当前显示其余 ${current.length} 条。`,`${failed} issue(s) failed; showing the remaining ${current.length}.`);
   }
  }catch(error){
   if(currentRequest!==request)return;
   current=[];loaded=false;tabs.replaceChildren();
   renderError(t("近期简报暂时无法加载。检查网络后重试，或选择具体日期。","Recent issues are unavailable. Check your connection, retry, or choose a date."),()=>void loadRange(days));
  }finally{
   if(currentRequest===request)stories.setAttribute("aria-busy","false");
  }
 };
 const loadAll=async()=>{
  if(!availableDates.length)return;
  const currentRequest=++request;
  controller?.abort();controller=new AbortController();
  const signal=controller.signal;
  beginLoad(t("正在搜索全部归档…","Searching all archived issues…"));
  try{
   const results=await Promise.allSettled(availableDates.map(async date=>{
    const response=await fetch(`/brief/data/${date}.json`,{cache:"no-cache",signal});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const issue=await response.json() as BriefIssue;
    validateIssue(issue,date);
    return (issue.items ?? []).map(item=>({...item,issue_date:date}));
   }));
   if(currentRequest!==request)return;
   const success=results.filter((result):result is PromiseFulfilledResult<(BriefItem & {issue_date:string})[]>=>result.status==="fulfilled");
   if(!success.length)throw Error("All issues failed");
   const seen=new Set<string>();
   current=success.flatMap(result=>result.value).filter(item=>{
    const key=item.url||`${item.title_zh}|${item.source}`;
    if(seen.has(key))return false;
    seen.add(key);return true;
   });
   loaded=true;scopeMode="archive";selectedRange=0;viewLabel=t("全部归档","All issues");
   updateRangeButtons();renderTabs();render();
  }catch(error){
   if(currentRequest!==request)return;
   current=[];loaded=false;
   renderError(t("全部归档暂时无法加载。请重试。","The archive is unavailable. Please retry."),()=>void loadAll());
  }finally{
   if(currentRequest===request)stories.setAttribute("aria-busy","false");
  }
 };
 const resetFilters=async()=>{
  if(searchTimer!==undefined){clearTimeout(searchTimer);searchTimer=undefined}
  searchInput.value="";query="";searchClear.hidden=true;
  category="全部";selectedEdition="all";selectedRange=0;scopeMode="issue";
  updateRangeButtons();updateEditionButtons();updateSearchScope();
  const date=issueSelect.value||availableDates[0];
  if(date)await load(date);
 };
 filterReset?.addEventListener("click",()=>void resetFilters());
 editionControls.querySelectorAll<HTMLButtonElement>("button[data-edition]").forEach(button=>{
  button.addEventListener("click",()=>{selectedEdition=button.dataset.edition||"all";updateEditionButtons();render();});
 });
 quickDates.querySelectorAll<HTMLButtonElement>("button[data-days]").forEach(button=>{
  button.addEventListener("click",()=>{
   const days=Number(button.dataset.days);
   if(days===0){void load(issueSelect.value);return;}
   if(days===selectedRange&&loaded){setFilterOpen(false);return;}
   void loadRange(days);
  });
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
    current=[];loaded=true;
    renderEmpty(t("观察站已经就绪，等待首期日报发布。","Ready for the first Daily Brief."),"empty-archive");
    statusNode.textContent=t("尚无归档数据","No archived issues yet");
    return;
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
   current=[];loaded=false;
   renderError(t("归档暂时无法加载。检查网络后重试。","The archive is unavailable. Check your connection and retry."),()=>void refreshManifest(true));
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
  if(searchAll)searchAll.setAttribute("aria-label",t("在全部归档中搜索","Search across all archived issues"));
  if(filterReset)filterReset.setAttribute("aria-label",t("重置全部筛选","Reset all filters"));
  issueSelect.setAttribute("aria-label",t("当前归档日期（内部同步）","Current issue date (internal sync)"));
  renderDateButtons();
  if(loaded){
   headline.textContent=scopeMode==="archive"?t("全部归档","All issues"):selectedRange?rangeLabel(selectedRange):viewLabel;
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
