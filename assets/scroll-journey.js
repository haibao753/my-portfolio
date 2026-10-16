// Native scrolling drives the scene; there is no wheel interception or idle loop.
const guide=document.querySelector('[data-scroll-journey]');
if(guide){
 const hero=document.querySelector('[data-optical-universe]'),stage=hero.querySelector('[data-universe-stage]');
 const works=document.querySelector('[data-exploration-desk]'),contact=document.querySelector('#contact');
 const chapters=Array.from(guide.querySelectorAll('[data-reading-chapter]'));
 const fill=guide.querySelector('[data-reading-fill]'),percent=guide.querySelector('[data-reading-percent]');
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 const entries=Array.from(document.querySelectorAll('[data-reading-anchor]')).map((anchor,index)=>({anchor,index,target:anchor.querySelector('[data-reading-target]')})).filter(item=>item.target);
 const clamp=value=>Math.max(0,Math.min(1,value));
 let raf=0,lastJourney=-1,lastChapter=-1,lastPercent=-1;
 function update(){
  raf=0;
  const vh=innerHeight,y=scrollY,heroRect=hero.getBoundingClientRect(),worksRect=works.getBoundingClientRect(),contactRect=contact.getBoundingClientRect();
  const maxScroll=Math.max(1,document.documentElement.scrollHeight-vh),progress=clamp(y/maxScroll);
  const pinnedDistance=hero.offsetHeight-stage.offsetHeight;
  const journey=reduce.matches?0:clamp(-heroRect.top/(pinnedDistance>0?pinnedDistance:hero.offsetHeight*.85));
  const chapter=contactRect.top<vh*.58?2:worksRect.top<vh*.60?1:0;
  // Read geometry together before writing transforms; moving children never
  // feed back into the anchor measurements or into draggable card positions.
  const readings=entries.map(item=>{
   const r=item.anchor.getBoundingClientRect();
   return {...item,reveal:reduce.matches?1:clamp((vh*.94-r.top)/Math.min(vh*.55,Math.max(140,r.height*.85)))};
  });
  guide.dataset.guideVisible=String(y>90);
  fill.style.transform=`scaleX(${progress.toFixed(4)})`;
  const value=Math.round(progress*100);
  if(value!==lastPercent){percent.textContent=value+'%';lastPercent=value}
  if(chapter!==lastChapter){chapters.forEach((link,index)=>{if(index===chapter)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});lastChapter=chapter}
  if(Math.abs(journey-lastJourney)>.0005){
   hero.dataset.universeScroll=journey.toFixed(4);
   hero.style.setProperty('--reading-copy-y',(-journey*38).toFixed(2)+'px');
   hero.dispatchEvent(new CustomEvent('optical-scroll',{detail:{progress:journey}}));lastJourney=journey;
  }
  for(const {anchor,target,index,reveal} of readings){
   const rest=1-reveal,direction=index%2?-1:1;
   anchor.dataset.readingReveal=reveal.toFixed(3);
   target.style.setProperty('--reading-x',(direction*rest*24).toFixed(2)+'px');
   target.style.setProperty('--reading-y',(rest*54).toFixed(2)+'px');
   target.style.setProperty('--reading-turn',(direction*rest*3).toFixed(2)+'deg');
   target.style.setProperty('--reading-scale',(1-rest*.055).toFixed(4));
   target.style.setProperty('--reading-opacity',(1-rest*.62).toFixed(4));
  }
 }
 function queue(){if(!raf&&!document.hidden)raf=requestAnimationFrame(update)}
 function preference(){document.body.dataset.readingMotion=reduce.matches?'reduced':'full';queue()}
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else queue()});
 reduce.addEventListener('change',preference);
 new ResizeObserver(queue).observe(document.querySelector('main'));
 document.fonts.ready.then(queue);
 guide.hidden=false;preference();queue();
}
