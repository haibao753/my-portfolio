/** Shared preferences behavior. Called once by the Astro site shell. */
export function initPreferences() {
  const root=document.documentElement;
  const themeButton=document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  const refreshTheme=()=>{
   if(!themeButton)return;
   const dark=root.dataset.theme==="dark";
   const en=root.lang==="en";
   themeButton.setAttribute("aria-label",en?(dark?"Switch to light mode":"Switch to dark mode"):(dark?"切换至浅色模式":"切换至深色模式"));
   themeButton.setAttribute("title",en?(dark?"Light mode":"Dark mode"):(dark?"浅色模式":"深色模式"));
   themeButton.setAttribute("aria-pressed",String(dark));
  };
  let themeTransitionTimer:ReturnType<typeof setTimeout>|undefined;
  themeButton?.addEventListener("click",()=>{
   const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   if(themeTransitionTimer!==undefined)clearTimeout(themeTransitionTimer);
   if(!reduced)root.dataset.themeTransition="true";
   else root.removeAttribute("data-theme-transition");
   root.dataset.theme=root.dataset.theme==="dark"?"light":"dark";
   try{localStorage.setItem("jhlab-theme",root.dataset.theme)}catch{}
   refreshTheme();
   if(!reduced)themeTransitionTimer=setTimeout(()=>{
    root.removeAttribute("data-theme-transition");
    themeTransitionTimer=undefined;
   },560);
  });
  refreshTheme();
  const language=document.querySelector<HTMLButtonElement>("[data-language-toggle]");
  const refreshLanguage=()=>{
   if(!language)return;
   const en=root.lang==="en";
   language.textContent=en?"中文":"EN";
   language.setAttribute("aria-label",en?"切换为中文":"Switch to English");
   document.querySelector("[data-menu-toggle]")?.setAttribute("aria-label",en?"Menu":"菜单");
   document.querySelector(".brand")?.setAttribute("aria-label",en?"J.H. LAB home":"J.H. LAB 首页");
   refreshTheme();
  };
  language?.addEventListener("click",()=>{
   root.lang=root.lang==="en"?"zh-CN":"en";
   try{localStorage.setItem("jhlab-locale",root.lang==="en"?"en":"zh")}catch{}
   refreshLanguage();
  });
  refreshLanguage();
}
