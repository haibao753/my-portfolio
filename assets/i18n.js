/* J.H. Lab / shared interface translation. Editorial news data stays in its published language. */
(function(){
"use strict";
const translations={
zh:{
 "nav.works":"作品","nav.research":"研究","nav.about":"关于","nav.contact":"联系",
 "nav.home":"返回主页 ↗","nav.brief":"每日简报 ↗",
 "hero.kicker":"独立研究与创意计算实验室",
 "hero.title":"让好奇心<br>成为作品",
 "hero.lead":"让好奇心成为作品。在数学、人工智能、信息与视觉艺术的交汇处，探索新的表达方式。",
 "hero.explore":"浏览精选项目 ↘","hero.brief":"阅读全球资讯观察 ↗",
 "hero.aside":"独立研究与创意计算。<br>科学 · 信息 · 技术 · 人文。",
 "hero.scroll":"向下探索 ↓","hero.count":"四个探索方向",
 "section.works":"精选项目","section.worksDesc":"从抽象算法到具体世界，从每日观察到私人影像。四个方向，一座持续生长的数字实验室。",
 "project.brief.label":"资讯 · 世界观察","project.brief.title":"全球资讯观察站",
 "project.brief.desc":"每日用中文整理值得追踪的全球信息。连接公共议题、国际社会、人工智能与前沿科研；提供摘要、观察角度与原始来源。",
 "project.brief.open":"进入观察站 ↗",
 "project.brief.art":"世界很大，<br>值得仔细阅读。",
 "project.math.label":"科学 · 数学可视化","project.math.title":"让抽象数学可见",
 "project.math.desc":"通过数学动画与科学可视化，把群论、几何、算法和机器学习中的抽象概念转化为易于理解的动态画面。视频作品现已集中展示在 B 站。",
 "project.math.open":"前往 B 站观看作品 ↗","project.math.creator":"一立方米的云","project.math.platform":"哔哩哔哩 · 视频作品集","project.math.visualLabel":"数学可视化 · 影像作品","project.math.watch":"查看频道与全部视频",
 "project.gallery.label":"人文 · 三维影像档案","project.gallery.title":"三维影像档案",
 "project.gallery.desc":"摄影不只是被观看的平面，也可以成为可以漫游的空间。把光影、日常和时间的碎片保存在独立的 3D 影像世界里。",
 "project.gallery.open":"探索三维相册 ↗",
 "project.exp.label":"技术 · 交互计算","project.exp.title":"交互计算实验",
 "project.exp.desc":"通过 Three.js 与 WebGL 将数学曲面、空间结构和数据的演变转化为可直接操控的场景。选择作品后进入独立的全屏交互体验。",
 "project.exp.classical":"经典极小曲面","project.exp.periodic":"周期极小曲面","project.exp.entropy":"熵与空间沙盒",
 "project.exp.art":"几何，<br>正在生长。",
 "studio.kicker":"开放的探索实践","studio.title":"精确的思考，<br>自由的表达。",
 "studio.desc":"科学提供理解世界的方法，艺术扩展感知世界的维度。这里是一个持续更新的个人实验场：在严谨与想象之间，记录每一次学习、试验与创造。",
 "contact.kicker":"取得联系","contact.title":"建立连接.","contact.desc":"欢迎交流数学、人工智能、科学传播、创意编程与跨学科合作。",
 "contact.email":"电子邮箱","contact.wechat":"微信","contact.mailaction":"发送邮件 ↗","contact.copy":"复制微信号 ↗",
 "footer.tagline":"独立研究与创意计算实验室","footer.brief":"全球资讯 ↗","footer.archive":"影像档案 ↗","footer.contact":"联系 ↗","footer.top":"返回顶部 ↑",
 "brief.kicker":"全球资讯观察站","brief.heading":"全球资讯<br>观察站",
 "brief.desc":"<strong>世界很大，值得仔细阅读。</strong><br>穿透日常信息流，连接中国与全球。每日追踪公共议题、前沿科研与技术变化，以中文提供有背景的简报，并保留原始报道的链接。",
 "brief.current":"本期简报","brief.await":"等待首期发布",
 "brief.schedule":"计划每天北京时间 09:00 更新","brief.scroll":"向下阅读 ↓",
 "brief.archiveKicker":"每日资讯归档","brief.archiveHeading":"每日观察.","brief.archiveDesc":"从事实出发，提供理解事件的线索。可按主题筛选，也可回顾历史期数。",
 "brief.dateLabel":"日期 / 期数","brief.disclaimer":"本站以 AI 辅助整理公开资讯，摘要仅反映信息来源的观点，并非独立事实核查。重大或存在争议的议题应核对多个来源。所有报道版权归原发布方所有，点击原文查看完整内容。",
 "brief.reading":"人文阅读",
 "brief.fontModern":"现代阅读",
 "brief.note":"目前仅翻译页面界面；每日新闻正文保留原发布的中文摘要。",
 "hero.asideTitle":"关于本站","hero.asideMeta":"建立于 2026 年 · 持续探索","hero.heroInfo":"这里记录我的研究、阅读、可视化实验，以及与世界发生连接的方式。",
 "hero.featured":"精选作品 · 2026","hero.counter":"四个研究方向","hero.studioTitle":"关于这个站点",
 "project.brief.visualKicker":"全球资讯观察","project.brief.issueTag":"每日更新","project.brief.visualFooter":"每日阅读档案","project.brief.archiveBtn":"浏览历史简报 ↗",
 "project.gallery.visual":"影像档案 ↗","project.exp.previewKicker":"交互数学实验","project.exp.previewFooter":"曲面可视化","project.exp.previewOpen":"进入实验 ↗",
 "footer.copy":"以好奇心驱动的创造实践",
 "brief.topRight":"每日观察 · 2026","brief.brandFooter":"资讯观察"
},
en:{
 "nav.works":"Works","nav.research":"Research","nav.about":"About","nav.contact":"Contact",
 "nav.home":"Back home ↗","nav.brief":"Daily brief ↗",
 "hero.kicker":"Independent research & creative computing",
 "hero.title":"Curiosity<br>in motion.",
 "hero.lead":"Turning curiosity into creation. Exploring the intersection of mathematics, artificial intelligence, information and visual art.",
 "hero.explore":"Explore selected work ↘","hero.brief":"Read the global brief ↗",
 "hero.aside":"Independent research and creative computing.<br>Science · Information · Technology · Humanities.",
 "hero.scroll":"Scroll to explore ↓","hero.count":"Four fields of exploration",
 "section.works":"Selected projects","section.worksDesc":"From abstract algorithms to tangible worlds, daily observations to visual memories: four fields, one evolving digital laboratory.",
 "project.brief.label":"Information · Global observation","project.brief.title":"Global Intelligence Brief",
 "project.brief.desc":"Daily Chinese-language coverage of global developments in policy, society, artificial intelligence and frontier research, with source links and context.",
 "project.brief.open":"Open the briefing ↗",
 "project.brief.art":"A wider world,<br>worth reading closely.",
 "project.math.label":"Science · Mathematical visualization","project.math.title":"Making mathematics visible",
 "project.math.desc":"Python and Manim transform algebra, geometry, algorithms and machine learning concepts into accessible animated structures.",
 "project.math.open":"Watch on Bilibili ↗","project.math.creator":"一立方米的云","project.math.platform":"Bilibili · Video portfolio","project.math.visualLabel":"Mathematical visualization · Videos","project.math.watch":"View channel and videos",
 "project.gallery.label":"Humanities · Spatial archive","project.gallery.title":"Spatial Visual Archive",
 "project.gallery.desc":"Photography can become a world to explore, not just a flat image. An independent 3D gallery for moments, memory and light.",
 "project.gallery.open":"Explore the gallery ↗",
 "project.exp.label":"Technology · Interactive computing","project.exp.title":"Interactive Computing",
 "project.exp.desc":"Explore mathematical surfaces, spatial structures and data through interactive Three.js and WebGL experiments.",
 "project.exp.classical":"Classical minimal surfaces","project.exp.periodic":"Periodic minimal surfaces","project.exp.entropy":"Entropy and spatial sandbox",
 "project.exp.art":"Geometry<br>in motion.",
 "studio.kicker":"An open-ended practice","studio.title":"Precise thinking,<br>free expression.",
 "studio.desc":"Science offers a method for understanding the world; art widens how we perceive it. This is an evolving space for inquiry, experiments and creative work.",
 "contact.kicker":"Get in touch","contact.title":"Connect.","contact.desc":"Open to conversations and collaborations in mathematics, AI, science communication and creative coding.",
 "contact.email":"Email","contact.wechat":"WeChat","contact.mailaction":"Send email ↗","contact.copy":"Copy WeChat ID ↗",
 "footer.tagline":"Independent research & creative computing","footer.brief":"Global Brief ↗","footer.archive":"Visual Archive ↗","footer.contact":"Contact ↗","footer.top":"Back to top ↑",
 "brief.kicker":"Global intelligence observatory","brief.heading":"Global<br>Briefing.",
 "brief.desc":"<strong>A wider world, worth reading closely.</strong><br>Daily Chinese-language briefings covering public affairs, new research and technology, with original source links.",
 "brief.current":"Current issue","brief.await":"Awaiting first issue",
 "brief.schedule":"Planned daily update · 09:00 Beijing time","brief.scroll":"Scroll to read ↓",
 "brief.archiveKicker":"News archive","brief.archiveHeading":"Daily observations.","brief.archiveDesc":"Curated context for understanding events. Filter by subject or explore earlier issues.",
 "brief.dateLabel":"Date / issue","brief.disclaimer":"These AI-assisted summaries reflect cited sources and are not independent fact-checks. Cross-check significant or contested claims with multiple sources. Original publishers retain copyright.",
 "brief.reading":"Humanist font","brief.fontModern":"Modern font",
 "brief.note":"Interface translations only. Daily article summaries remain in their published Chinese.",
 "hero.asideTitle":"About this site","hero.asideMeta":"Established 2026 · Exploring continuously","hero.heroInfo":"A record of research, reading, visual experiments, and ways of engaging with the world.",
 "hero.featured":"Selected work · 2026","hero.counter":"Four fields of research","hero.studioTitle":"About the studio",
 "project.brief.visualKicker":"Global observation","project.brief.issueTag":"Updated daily","project.brief.visualFooter":"Reading archive","project.brief.archiveBtn":"Browse archives ↗",
 "project.gallery.visual":"Visual archive ↗","project.exp.previewKicker":"Interactive mathematics","project.exp.previewFooter":"Surface visualization","project.exp.previewOpen":"Enter experiment ↗",
 "footer.copy":"Creative work driven by curiosity",
 "brief.topRight":"Daily observations · 2026","brief.brandFooter":"Brief"
}};
const safeHtml=new Set(["hero.title","hero.aside","project.brief.art","project.exp.art","studio.title","brief.heading","brief.desc"]);
const originals=new Map();
function readLang(){try{return localStorage.getItem("jhlab-lang")==="en"?"en":"zh"}catch(e){return "zh"}}
function apply(lang){
 const dict=translations[lang]||translations.zh;
 document.documentElement.lang=lang==="en"?"en":"zh-CN";
 document.querySelectorAll("[data-i18n]").forEach(el=>{
  const key=el.dataset.i18n;
  if(!(key in dict))return;
  if(safeHtml.has(key))el.innerHTML=dict[key];else el.textContent=dict[key];
 });
 const toggle=document.getElementById("language-toggle");
 if(toggle){toggle.textContent=lang==="zh"?"EN / English":"中文";toggle.setAttribute("aria-label",lang==="zh"?"Switch to English":"切换为中文");}
 try{localStorage.setItem("jhlab-lang",lang)}catch(e){}
 window.dispatchEvent(new CustomEvent("jhlab:language",{detail:{language:lang}}));
}
document.addEventListener("DOMContentLoaded",()=>{
 const toggle=document.getElementById("language-toggle");
 if(toggle)toggle.addEventListener("click",()=>apply(document.documentElement.lang==="en"?"zh":"en"));
 apply(readLang());
});
window.JHLabI18n={setLanguage:apply,getLanguage:()=>document.documentElement.lang==="en"?"en":"zh"};
})();
