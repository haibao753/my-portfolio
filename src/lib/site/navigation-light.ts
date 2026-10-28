/** Shared navigation-light behavior. Called once by the Astro site shell. */
export function initNavigationLight() {
  // Shared pointer light for the navigation glass. When the GPU optical layer
  // is active it uses the same tracker, so the CSS fallback and WebGL material
  // never disagree about where the light is. Touch only lights while held.
  const navGlass=document.querySelector<HTMLElement>(".glass-nav");
  if(navGlass){
   const setLight=(x:number,y:number)=>{
    navGlass.style.setProperty("--glass-light-x",`${Math.round(x*100)}%`);
    navGlass.style.setProperty("--glass-light-y",`${Math.round(y*100)}%`);
   };
   let touchLighting=false;
   const track=(event:PointerEvent)=>{
    if(event.pointerType!=="mouse"&&!touchLighting)return;
    const rect=navGlass.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    setLight(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)));
   };
   navGlass.addEventListener("pointermove",track,{passive:true});
   navGlass.addEventListener("pointerdown",event=>{if(event.pointerType!=="mouse"){touchLighting=true;track(event)}},{passive:true});
   const release=()=>{touchLighting=false;setLight(.28,0)};
   navGlass.addEventListener("pointerleave",()=>{if(!touchLighting)release()});
   navGlass.addEventListener("pointerup",release,{passive:true});
   navGlass.addEventListener("pointercancel",release,{passive:true});
   // Reading pages can scroll large headlines behind the sticky toolbar; the
   // veil is a legibility aid, not a second material.
   const syncScrolled=()=>navGlass.toggleAttribute("data-scrolled",window.scrollY>18);
   addEventListener("scroll",syncScrolled,{passive:true});
   syncScrolled();
  }
}
