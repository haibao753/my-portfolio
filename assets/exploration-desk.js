/* Event-driven exploration: real project routes stay usable without JavaScript. */
const desk=document.querySelector('[data-exploration-desk]');
if(desk){
 const stage=desk.querySelector('[data-lab-stage]');
 const objects=Array.from(desk.querySelectorAll('[data-lab-object]'));
 const inspector=desk.querySelector('[data-lab-inspector]');
 const content=desk.querySelector('[data-lab-discovery-content]');
 const status=desk.querySelector('[data-lab-status]');
 const count=desk.querySelector('[data-clue-count]');
 const reset=desk.querySelector('[data-lab-reset]');
 const mobile=matchMedia('(max-width:760px)');
 let visited=new Set(),active=null,previousFocus=null,arrangement=0;
 try{const saved=JSON.parse(sessionStorage.getItem('jhlab-trail-v1')||'[]');if(Array.isArray(saved))visited=new Set(saved.filter(x=>Number.isInteger(x)&&x>=0&&x<objects.length))}catch{}
 const english=()=>document.documentElement.lang==='en';
 const say=(zh,en)=>{status.textContent=english()?en:zh};
 const translate=()=>document.querySelectorAll('[data-zh][data-en]').forEach(el=>el.setAttribute('aria-label',english()?el.dataset.en:el.dataset.zh));
 const renderTrail=()=>{
  count.textContent=String(visited.size);
  objects.forEach((object,index)=>object.dataset.visited=String(visited.has(index)));
  reset.hidden=visited.size!==objects.length;
  try{sessionStorage.setItem('jhlab-trail-v1',JSON.stringify([...visited]))}catch{}
 };
 const close=()=>{
  inspector.close();
  objects.forEach(object=>object.querySelector('[data-lab-open]').setAttribute('aria-expanded','false'));
  active=null;
  previousFocus?.focus({preventScroll:true});
 };
 const discover=(index,trigger)=>{
  const object=objects[index];if(!object)return;
  active=index;previousFocus=trigger||object.querySelector('[data-lab-open]');
  content.replaceChildren(object.querySelector('template').content.cloneNode(true));
  objects.forEach((item,i)=>item.querySelector('[data-lab-open]').setAttribute('aria-expanded',String(i===index)));
  const firstVisit=!visited.has(index);visited.add(index);renderTrail();
  if(!inspector.open)inspector.show();
  inspector.querySelector('[data-lab-close]').focus({preventScroll:true});
  if(visited.size===objects.length)say('四个方向都看过了，可以打开感兴趣的完整作品。','All four projects previewed. Open any project to see the full work.');
  else if(firstVisit)say(`已查看作品 · ${visited.size} / 4`,`Project preview · ${visited.size} / 4`);
  else say('点击介绍中的链接，进入完整作品。','Use the project link to see the full work.');
 };
 objects.forEach((object,index)=>{
  const link=object.querySelector('[data-lab-open]');
  link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();discover(index,link)});
  const grip=object.querySelector('[data-lab-drag]');
  const constrain=(left,top)=>({left:Math.max(12,Math.min(stage.clientWidth-object.offsetWidth-12,left)),top:Math.max(12,Math.min(stage.clientHeight-object.offsetHeight-42,top))});
  const move=(left,top)=>{const p=constrain(left,top);object.style.left=p.left+'px';object.style.top=p.top+'px'};
  let dragging=null;
  grip.addEventListener('pointerdown',event=>{
   if(mobile.matches||event.pointerType!=='mouse'||event.button!==0)return;
   event.preventDefault();
   dragging={id:event.pointerId,x:event.clientX,y:event.clientY,left:object.offsetLeft,top:object.offsetTop};
   grip.setPointerCapture(event.pointerId);object.dataset.dragging='true';
  });
  grip.addEventListener('pointermove',event=>{
   if(!dragging||event.pointerId!==dragging.id)return;
   move(dragging.left+event.clientX-dragging.x,dragging.top+event.clientY-dragging.y);
  });
  const stop=()=>{dragging=null;delete object.dataset.dragging};
  grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);grip.addEventListener('lostpointercapture',stop);
  grip.addEventListener('keydown',event=>{
   const vectors={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
   if(!vectors[event.key]||mobile.matches)return;
   event.preventDefault();const [x,y]=vectors[event.key],step=event.shiftKey?30:10;
   move(object.offsetLeft+x*step,object.offsetTop+y*step);
  });
 });
 // Curated arrangements keep objects separated and the title readable. Randomly
 // throwing rectangles into the stage can bury links beneath other objects.
 const layouts=[[[.03,245],[.54,330],[.04,680],[.53,765]],[[.07,260],[.51,315],[.03,690],[.53,755]],[[.04,270],[.53,325],[.06,670],[.51,770]]];
 const shuffle=()=>{
  arrangement=(arrangement+1)%layouts.length;
  if(!mobile.matches)objects.forEach((object,index)=>{
   const narrow=[[[.03,230],[.54,300],[.04,630],[.53,700]],[[.07,245],[.51,295],[.03,635],[.53,690]],[[.04,250],[.53,305],[.06,620],[.51,705]]];
   const position=(stage.clientWidth>1036?layouts:narrow)[arrangement][index];
   object.style.left=Math.min(stage.clientWidth-object.offsetWidth-18,stage.clientWidth*position[0])+'px';
   object.style.top=position[1]+'px';
   object.style.setProperty('--angle',((index%2?1:-1)*(1+arrangement))+'deg');
  });
  else{
   // On narrow screens re-order the exploration path rather than intercept touch.
   const order=arrangement%2?[2,0,3,1]:[0,1,2,3];
   objects.forEach((object,index)=>{const slot=order.indexOf(index);object.style.gridColumn='1';object.style.gridRow=slot+2});
  }
  say('作品排列已更新，点击卡片查看介绍。','Arrangement updated. Open a card for project details.');
 };
 desk.querySelector('[data-lab-shuffle]').addEventListener('click',shuffle);
 desk.querySelector('[data-lab-surprise]').addEventListener('click',event=>{
  const candidates=objects.map((_,i)=>i).filter(i=>!visited.has(i)&&i!==active);
  const pool=candidates.length?candidates:objects.map((_,i)=>i).filter(i=>i!==active);
  discover(pool[Math.floor(Math.random()*pool.length)],event.currentTarget);
 });
 reset.addEventListener('click',()=>{close();visited.clear();renderTrail();shuffle();say('浏览记录已重置，选一个作品重新开始。','Preview history cleared. Choose a project to start again.')});
 desk.querySelector('[data-lab-close]').addEventListener('click',close);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&inspector.open){event.preventDefault();close()}});
 const restoreLayout=()=>objects.forEach(object=>{object.style.removeProperty('left');object.style.removeProperty('top');object.style.removeProperty('--angle');object.style.removeProperty('grid-column');object.style.removeProperty('grid-row')});
 addEventListener('resize',restoreLayout,{passive:true});
 new MutationObserver(()=>{translate();if(active!==null&&inspector.open){if(visited.size===objects.length)say('四个方向都看过了，可以打开感兴趣的完整作品。','All four projects previewed. Open any project to see the full work.');else say(`已查看作品 · ${visited.size} / 4`,`Project preview · ${visited.size} / 4`)}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 desk.dataset.labReady='true';desk.querySelector('[data-lab-controls]').hidden=false;translate();renderTrail();
}
