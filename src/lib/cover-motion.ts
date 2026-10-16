export function initCoverMotion(){
 const covers=[...document.querySelectorAll<HTMLElement>("[data-animated-cover]")];
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const visible=new WeakSet<Element>();
 const sync=()=>covers.forEach(cover=>{
  const active=visible.has(cover)&&!document.hidden&&!reduced.matches&&!document.querySelector("dialog[open]");
  cover.classList.toggle("is-cover-visible",active);
  cover.dataset.coverMotion=reduced.matches?"reduced":active?"playing":"sleeping";
 });
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target)});sync()},{threshold:.03});
 covers.forEach(cover=>observer.observe(cover));
 reduced.addEventListener("change",sync);document.addEventListener("visibilitychange",sync);
 document.querySelectorAll("dialog").forEach(dialog=>new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:["open"]}));
 sync();
}
