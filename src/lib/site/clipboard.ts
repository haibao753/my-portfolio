/** Shared clipboard behavior. Called once by the Astro site shell. */
export function initClipboard() {
  const root=document.documentElement;
  const copy=document.querySelector<HTMLButtonElement>("[data-copy-wechat]");
  copy?.addEventListener("click",async()=>{
   const id=copy.dataset.copyWechat??"";
   try{
    await navigator.clipboard.writeText(id);
    copy.dataset.copied="true";
    window.setTimeout(()=>{copy.dataset.copied="false"},1500);
   }catch{
    copy.dataset.copied="false";
    window.prompt(root.lang==="en"?"Copy WeChat ID":"复制微信号",id);
   }
  });
}
