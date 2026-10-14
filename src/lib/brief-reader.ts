/* J.H. LAB / Daily Brief reader — shared page, unchanged public JSON schema. */
interface BriefItem {
 category?: string;source?: string;published?: string;url?: string;
 title_zh?: string;summary_zh?: string;why_zh?: string;
}
interface BriefIssue {date?:string;items?:BriefItem[]}
interface BriefIndex {dates?:string[]}
const stories=document.querySelector<HTMLElement>("#stories");
const tabs=document.querySelector<HTMLElement>("#tabs");
const issueSelect=document.querySelector<HTMLSelectElement>("#issues");
const statusNode=document.querySelector<HTMLElement>("#statusNode");
const headline=document.querySelector<HTMLElement>("#headlineDate");
const total=document.querySelector<HTMLElement>("#total");
if(stories&&tabs&&issueSelect&&statusNode&&headline&&total){
 let current:BriefItem[]=[];
 let category="全部";
 let request=0;
 const isDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date);
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
  const selection=current.filter(x=>category==="全部"||(x.category||"其他")===category);
  statusNode.textContent=`本期收录 ${current.length} 条 · 当前显示 ${selection.length} 条 · 重大事项请核对原始报道`;
  const fragment=document.createDocumentFragment();
  if(!selection.length)fragment.append(txt("div","暂无对应资讯。请切换分类或日期。","news-empty"));
  for(const item of selection){
   const card=txt("article","","news-card");
   const meta=txt("div","","news-meta");
   meta.append(txt("span",item.category||"其他","news-category"),txt("span",item.published||"时间未提供"));
   card.append(meta,txt("h3",item.title_zh||"未命名资讯"),txt("p",item.summary_zh||""));
   if(item.why_zh){
    const reason=txt("p","","news-reason");
    reason.append(txt("b","为什么值得关注　"),document.createTextNode(item.why_zh));
    card.append(reason);
   }
   const foot=txt("div","","news-source");
   foot.append(txt("span",item.source||"原始来源"));
   const link=item.url?safeUrl(item.url):null;
   if(link){
    const a=txt("a","阅读原始报道 ↗") as HTMLAnchorElement;
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
   const button=txt("button",name,"filter-chip") as HTMLButtonElement;
   button.type="button";button.setAttribute("aria-pressed",String(category===name));
   button.addEventListener("click",()=>{
    category=name;renderTabs();render();
   });
   fragment.append(button);
  }
  tabs.replaceChildren(fragment);
 };
 const load=async(date:string)=>{
  const currentRequest=++request;
  statusNode.textContent=`正在加载 ${date}…`;
  try{
   if(!isDate(date))throw Error("日期格式不正确");
   const response=await fetch(`/brief/data/${date}.json`,{cache:"no-cache"});
   if(!response.ok)throw Error(`HTTP ${response.statusNode}`);
   const data=await response.json() as BriefIssue;
   if(currentRequest!==request)return;
   if(data.date!==date||!Array.isArray(data.items))throw Error("日报数据结构不符合预期");
   current=data.items;category="全部";
   headline.textContent=date;
   total.textContent=`${current.length} 条精选`;
   renderTabs();render();
  }catch(error){
   if(currentRequest!==request)return;
   current=[];total.textContent="—";
   headline.textContent=date;
   tabs.replaceChildren();stories.replaceChildren(txt("div","这期内容暂时无法加载，请稍后重试。","news-empty"));
   statusNode.textContent=`加载失败：${String(error)}`;
  }
 };
 const initialize=async()=>{
  try{
   const response=await fetch("/brief/data/index.json",{cache:"no-cache"});
   if(!response.ok)throw Error(`HTTP ${response.statusNode}`);
   const index=await response.json() as BriefIndex;
   const dates=[...new Set((index.dates||[]).filter(isDate))].sort().reverse();
   issueSelect.replaceChildren();
   if(!dates.length){
    stories.replaceChildren(txt("div","观察站已经就绪，等待首期日报发布。","news-empty"));
    statusNode.textContent="尚无归档数据";return;
   }
   for(const date of dates){
    const option=txt("option",date) as HTMLOptionElement;
    option.value=date;issueSelect.append(option);
   }
   issueSelect.addEventListener("change",()=>void load(issueSelect.value));
   await load(dates[0]);
  }catch(error){
   stories.replaceChildren(txt("div","暂时无法获取资讯，请稍后重试。","news-empty"));
   statusNode.textContent=`归档加载失败：${String(error)}`;
  }
 };
 void initialize();
}

export {};
