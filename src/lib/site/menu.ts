/** Shared menu behavior. Called once by the Astro site shell. */
export function initMenu() {
  const root=document.documentElement;
  const menu=document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const panel=document.querySelector<HTMLElement>("[data-menu-panel]");
  const backdrop=document.querySelector<HTMLElement>("[data-menu-backdrop]");
  const motionReduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const header=document.querySelector<HTMLElement>(".glass-nav");
  const positionMenu=()=>{
   if(header&&panel)panel.style.setProperty("--menu-top",Math.ceil(header.getBoundingClientRect().bottom+8)+"px");
  };
  if(header)new ResizeObserver(positionMenu).observe(header);
  window.addEventListener("resize",positionMenu,{passive:true});
  window.visualViewport?.addEventListener("resize",positionMenu,{passive:true});
  positionMenu();
  if(panel)panel.inert=true;
  let closeTimer:ReturnType<typeof setTimeout>|undefined;
  const finishClose=()=>{
   if(!panel||!backdrop)return;
   panel.hidden=true;backdrop.hidden=true;
   panel.inert=true;
   delete panel.dataset.closing;delete backdrop.dataset.closing;
   closeTimer=undefined;
  };
  const close=(restoreFocus=false)=>{
   if(!menu||!panel||!backdrop||panel.hidden||panel.dataset.closing==="true")return;
   const focusWasInside=panel.contains(document.activeElement);
   menu.setAttribute("aria-expanded","false");
   panel.inert=true;
   root.removeAttribute("data-menu-open");
   if(focusWasInside||restoreFocus)menu.focus({preventScroll:true});
   if(motionReduced.matches){finishClose();return;}
   panel.dataset.closing="true";backdrop.dataset.closing="true";
   closeTimer=setTimeout(finishClose,310);
  };
  const openMenu=()=>{
   if(!menu||!panel||!backdrop)return;
   positionMenu();
   if(closeTimer!==undefined){clearTimeout(closeTimer);closeTimer=undefined;}
   delete panel.dataset.closing;delete backdrop.dataset.closing;
   panel.hidden=false;backdrop.hidden=false;
   panel.inert=false;
   menu.setAttribute("aria-expanded","true");
   root.dataset.menuOpen="true";
   panel.querySelector<HTMLAnchorElement>("a")?.focus({preventScroll:true});
  };
  menu?.addEventListener("click",()=>{
   if(menu.getAttribute("aria-expanded")==="true")close();
   else openMenu();
  });
  panel?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>close()));
  // The visual backdrop deliberately passes through touch scrolling.
  // Dismiss on an outside click without intercepting native touch gestures.
  document.addEventListener("click",event=>{
   if(menu?.getAttribute("aria-expanded")==="true"&&event.target instanceof Node&&!header?.contains(event.target)&&!panel?.contains(event.target))close();
  });
  document.addEventListener("focusin",event=>{
   if(menu?.getAttribute("aria-expanded")==="true"&&event.target instanceof Node&&!header?.contains(event.target)&&!panel?.contains(event.target))close();
  });
  document.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&panel&&!panel.hidden){
    close(true);
    menu?.focus({preventScroll:true});
   }
  });
  // A viewport orientation change can restore desktop navigation mid-session.
  const desktopNav=window.matchMedia("(min-width: 1181px)");
  desktopNav.addEventListener("change",e=>{if(e.matches){if(closeTimer!==undefined)clearTimeout(closeTimer);menu?.setAttribute("aria-expanded","false");root.removeAttribute("data-menu-open");finishClose();}});
  window.addEventListener("pageshow",event=>{
   if(event.persisted && menu?.getAttribute("aria-expanded")==="true"){
    if(closeTimer!==undefined)clearTimeout(closeTimer);
    menu.setAttribute("aria-expanded","false");
    root.removeAttribute("data-menu-open");
    finishClose();
   }
  });
}
