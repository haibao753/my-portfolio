/* J.H. LAB / Daily Brief reader — shared page, unchanged public JSON schema. */
interface BriefItem {
 edition?: "morning"|"evening"; focus?: boolean;
 category?: string;source?: string;published?: string;url?: string;
 title_zh?: string;summary_zh?: string;why_zh?: string;
 details_zh?: string;original_title?: string;
}
interface BriefIssue {date?:string;items?:BriefItem[]}
interface BriefIndex {dates?:string[];updated_at?:string}
const stories=document.querySelector<HTMLElement>("#stories");
const tabs=document.querySelector<HTMLElement>("#tabs");
const issueSelect=document.querySelector<HTMLSelectElement>("#issues");
const statusNode=document.querySelector<HTMLElement>("#status");
const quickDates=document.querySelector<HTMLElement>("#quick-dates");
const editionControls=document.querySelector<HTMLElement>("#edition-controls");
const headline=document.querySelector<HTMLElement>("#headlineDate");
const total=document.querySelector<HTMLElement>("#total");
if(stories&&tabs&&issueSelect&&quickDates&&editionControls&&statusNode&&headline&&total){
 let current:(BriefItem & {issue_date?:string})[]=[];
 let viewLabel="";
 let availableDates:string[]=[];
 let selectedRange=0;
 let loaded=false;
 let category="全部";
 let selectedEdition="all";
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
 const render=()=>{
  const selection=current.filter(x=>(category==="全部"||(x.category||"其他")===category) && (selectedEdition==="all"||x.edition===selectedEdition));
  statusNode.textContent=t(`显示 ${selection.length} 条`,`Showing ${selection.length} stories`);
  const fragment=document.createDocumentFragment();
  if(!selection.length)fragment.append(txt("div",t("暂无对应资讯。请切换分类或日期。","No stories here. Choose another category or date."),"news-empty"));
  for(const item of selection){
   const card=txt("article","","news-card");
   if(item.focus)card.classList.add("is-focus");
   const meta=txt("div","","news-meta");
   const slot=item.edition==="morning"?t("早报","AM"):item.edition==="evening"?t("晚报","PM"):"";
   const stamp=item.issue_date||(item.published||"时间未提供");
   meta.append(txt("span",(item.focus?t("✦ 重点 · ","✦ Focus · "):"")+(item.category||"其他"),"news-category"),txt("span",slot?slot+" · "+stamp:stamp));
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
    disclosure.append(txt("p",t("根据公开标题与摘要进行中文整理，不是原文全文。受限于来源信息，部分细节可能无法验证。","Editorial interpretation of public headlines and excerpts; not the complete original article."),"news-disclosure-note"));
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
  const names=["全部",...new Set(current.map(x=>x.category||"其他"))];
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
 let controller:AbortController|undefined;
 const load=async(date:string)=>{
  const currentRequest=++request;
  controller?.abort();controller=new AbortController();
  loaded=false;
  current=[];tabs.replaceChildren();stories.replaceChildren();total.textContent="—";
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
   current=data.items;loaded=true;category="全部";selectedRange=0;selectedEdition="all";viewLabel=date;updateRangeButtons();updateEditionButtons();
   headline.textContent=date;
   total.textContent=t(`${current.length} 条精选`,`${current.length} selected stories`);
   renderTabs();render();
  }catch(error){
   if(currentRequest!==request)return;
   current=[];total.textContent="—";
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
  loaded=false;current=[];category="全部";
  tabs.replaceChildren();stories.replaceChildren();stories.setAttribute("aria-busy","true");
  headline.textContent=viewTitle();total.textContent="—";
  statusNode.textContent=t("正在汇总范围内的简报…","Loading recent issues…");
  try{
   if(!matching.length){
    current=[];loaded=true;viewLabel=viewTitle();
    total.textContent=t("0 条精选","0 selected stories");
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
   total.textContent=t(`${current.length} 条精选`,`${current.length} selected stories`);
   headline.textContent=viewLabel;
   renderTabs();render();
   if(success.length<matching.length)statusNode.textContent+=t(` · ${matching.length-success.length} 期加载失败`,` · ${matching.length-success.length} issue(s) unavailable`);
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
  button.addEventListener("click",()=>void loadRange(Number(button.dataset.days)));
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
    const option=txt("option",date) as HTMLOptionElement;
    option.value=date;issueSelect.append(option);
   }
   if(viewingLatest){
    issueSelect.value=dates[0];
    await load(dates[0]);
    if(!loaded)manifestStamp=""; // Retry if manifest arrived before the article could load.
   }else{
    if(dates.includes(priorSelection))issueSelect.value=priorSelection;
    if(selectedRange>0)await loadRange(selectedRange);
   }
  }catch(error){
   if(!initial)return;
   stories.replaceChildren(txt("div",t("暂时无法获取资讯，请稍后重试。","Stories are unavailable. Please try again shortly."),"news-empty"));
   statusNode.textContent=t("归档暂时无法加载，请刷新重试。","Archive unavailable. Refresh to retry.");
  }
 };
 issueSelect.addEventListener("change",()=>void load(issueSelect.value));
 const checkForUpdates=()=>{if(!document.hidden)void refreshManifest();};
 window.addEventListener("focus",checkForUpdates);
 document.addEventListener("visibilitychange",checkForUpdates);
 window.setInterval(checkForUpdates,10*60*1000);
 const refreshLanguage=()=>{
  tabs.setAttribute("aria-label",t("内容分类","Story categories"));
  issueSelect.setAttribute("aria-label",t("选择历史日期","Choose an issue date"));
  if(loaded){
   headline.textContent=viewTitle();
   total.textContent=t(`${current.length} 条精选`,`${current.length} selected stories`);
   renderTabs();render();
  }
 };
 new MutationObserver(refreshLanguage).observe(root,{attributes:true,attributeFilter:["lang"]});
 refreshLanguage();
 void refreshManifest(true);
}

export {};
