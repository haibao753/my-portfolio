/* J.H. LAB / Daily Brief reader — shared page, unchanged public JSON schema.
 *
 * vNext: one filter state, one render path. Date/range/edition/topic/query are
 * owned here; UI chips only project that state. Loading, empty, no-result,
 * network and parse failures are distinct states, and the first paint reserves
 * its height with skeleton cards.
 */
import { createBriefRepository, createRequestScope } from "./brief/api";
import { createBriefCards, textElement as txt } from "./brief/cards";
import { matchesQuery, normalizeSearch, recentDays, todayBeijing, type BriefStory, type ScopeMode } from "./brief/model";

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
 let current:BriefStory[]=[];
 const repository=createBriefRepository();
 const requests=createRequestScope();
 let viewLabel="";
 let availableDates:string[]=[];
 let selectedRange=0;
 let loaded=false;
 let category="全部";
 let selectedEdition="all";
 let query="";
 let scopeMode:ScopeMode="issue";
 let searchTimer:ReturnType<typeof setTimeout>|undefined;
 const root=document.documentElement;
 const t=(zh:string,en:string)=>root.lang==="en"?en:zh;
 const cards=createBriefCards(stories,t);
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
 /* The archive grows every day; painting every matching card at once blocks the
    main thread for ~0.5s at 120+ cards. The list is paginated by viewport: the
    total is shown immediately, the first chunk paints fast, and more chunks
    follow on scroll or on request. Filters/search always operate on the full
    selection, not only the painted chunk. */
 const CHUNK=24;
 let visibleStories:BriefStory[]=[];
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
  for(let index=renderedCount;index<end;index++)fragment.append(cards.buildCard(visibleStories[index]));
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
  visibleStories=current.filter(x=>(category==="全部"||(x.category||"其他")===category) && (selectedEdition==="all"||x.edition===selectedEdition) && matchesQuery(x,query));
  statusNode.textContent=t(`显示 ${visibleStories.length} 条 · 范围：${scopeLabel()}`,`Showing ${visibleStories.length} · scope: ${scopeLabel()}`);
  statusNode.classList.add("is-summary");
  total.textContent=String(visibleStories.length);
  if(expandedTotal)expandedTotal.textContent=total.textContent;
  updateCompact();
  cards.reset();
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
    if(loaded)render();
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
 const beginLoad=(message:string)=>{
  loaded=false;visibleStories=[];renderedCount=0;cards.reset();
  if(storiesProgress)storiesProgress.hidden=true;
  total.textContent="—";if(expandedTotal)expandedTotal.textContent="—";
  stories.setAttribute("aria-busy","true");stories.dataset.state="loading";
  statusNode.classList.remove("is-summary");
  statusNode.textContent=message;
  renderSkeleton();
 };
 const load=async(date:string)=>{
  const operation=requests.begin();
  beginLoad(t(`正在加载 ${date}…`,`Loading ${date}…`));
  try{
   const data=await repository.getIssue(date,operation.signal);
   if(!operation.isCurrent())return;
   current=data.items ?? [];loaded=true;
   scopeMode="issue";selectedRange=0;viewLabel=date;
   updateRangeButtons();updateDateButtons();
   headline.textContent=date;
   renderTabs();render();
  }catch(error){
   if(!operation.isCurrent())return;
   current=[];total.textContent="—";if(expandedTotal)expandedTotal.textContent="—";
   tabs.replaceChildren();
   renderError(t("这期内容暂时无法加载。检查网络后重试，或切换日期。","This issue is unavailable. Check your connection, retry, or pick another date."),()=>void load(date));
  }finally{
   if(operation.isCurrent())stories.setAttribute("aria-busy","false");
  }
 };
 const loadRange=async(days:number)=>{
  const operation=requests.begin();
  const signal=operation.signal;
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
   const result=await repository.getIssues(matching,signal);
   if(!operation.isCurrent())return;
   current=result.items;
   loaded=true;scopeMode="range";viewLabel=rangeLabel(days);
   headline.textContent=rangeLabel(days);
   renderTabs();render();
   if(result.failedDates.length){
    const failed=result.failedDates.length;
    statusNode.classList.remove("is-summary");
    statusNode.textContent=t(`有 ${failed} 期加载失败，当前显示其余 ${current.length} 条。`,`${failed} issue(s) failed; showing the remaining ${current.length}.`);
   }
  }catch(error){
   if(!operation.isCurrent())return;
   current=[];loaded=false;tabs.replaceChildren();
   renderError(t("近期简报暂时无法加载。检查网络后重试，或选择具体日期。","Recent issues are unavailable. Check your connection, retry, or choose a date."),()=>void loadRange(days));
  }finally{
   if(operation.isCurrent())stories.setAttribute("aria-busy","false");
  }
 };
 const loadAll=async()=>{
  if(!availableDates.length)return;
  const operation=requests.begin();
  const signal=operation.signal;
  beginLoad(t("正在搜索全部归档…","Searching all archived issues…"));
  try{
   const result=await repository.getIssues(availableDates,signal);
   if(!operation.isCurrent())return;
   current=result.items;
   loaded=true;scopeMode="archive";selectedRange=0;viewLabel=t("全部归档","All issues");
   headline.textContent=viewLabel;
   updateRangeButtons();renderTabs();render();
   if(result.failedDates.length){
    statusNode.classList.remove("is-summary");
    statusNode.textContent=t(`有 ${result.failedDates.length} 期加载失败，当前显示其余 ${current.length} 条。`,`${result.failedDates.length} issue(s) failed; showing the remaining ${current.length}.`);
   }
  }catch(error){
   if(!operation.isCurrent())return;
   current=[];loaded=false;
   renderError(t("全部归档暂时无法加载。请重试。","The archive is unavailable. Please retry."),()=>void loadAll());
  }finally{
   if(operation.isCurrent())stories.setAttribute("aria-busy","false");
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
  button.addEventListener("click",()=>{selectedEdition=button.dataset.edition||"all";updateEditionButtons();if(loaded)render();});
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
   const index=await repository.getIndex();
   const dates=index.dates;
   const stamp=(index.updated_at||"")+"|"+dates.join(",");
   if(!initial&&stamp===manifestStamp)return;
   const previousNewest=availableDates[0];
   const priorSelection=issueSelect.value;
   const viewingLatest=initial||(scopeMode==="issue"&&priorSelection===previousNewest);
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
    if(scopeMode==="archive")await loadAll();
    else if(selectedRange>0)await loadRange(selectedRange);
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
