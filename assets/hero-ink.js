/* J.H. LAB — brush-set hero. Keeps heading readable before JS and honors locale updates. */
(function(){
  "use strict";
  const heading=document.getElementById("hero-heading");
  if(!heading)return;
  let generation=0;
  function typeset(){
    // The translation layer replaces the raw <br> headline on every locale change.
    if(heading.querySelector(".ink-line"))return;
    const lines=[""];
    for(const n of heading.childNodes){
      if(n.nodeType===1&&n.tagName==="BR")lines.push("");
      else if(n.nodeType===3)lines[lines.length-1]+=n.nodeValue;
      else if(n.nodeType===1)lines[lines.length-1]+=n.textContent;
    }
    const copy=lines.map(s=>s.trim()).filter(Boolean);
    if(copy.length!==2)return;
    const seq=++generation;
    heading.classList.remove("is-typeset");
    heading.classList.add("ink-title");
    heading.setAttribute("aria-label",copy.join(document.documentElement.lang.startsWith("en")?" ":"，"));
    heading.replaceChildren();
    copy.forEach((line,i)=>{
      const row=document.createElement("span");
      row.className="ink-line ink-line--"+(i===0?"one":"two");
      row.setAttribute("aria-hidden","true");
      Array.from(line).forEach((character,j)=>{
        const glyph=document.createElement("span");
        glyph.className="ink-letter";
        glyph.style.setProperty("--glyph-order",String(j));
        // The user-chosen brush-stroke 心 is an actual transparent SVG trace,
        // applied only to the first Chinese line; other glyphs stay editable text.
        if(i===0&&character==="心"){
          glyph.classList.add("ink-heart-image");
          const mark=document.createElement("img");
          mark.className="ink-heart-mark";
          mark.src="/assets/heart-ink-selected.svg?v=1";
          mark.alt="";
          mark.width=779;
          mark.height=548;
          mark.decoding="async";
          mark.addEventListener("error",()=>{
            mark.remove();
            glyph.textContent="心"; // Accessible, legible glyph fallback.
          },{once:true});
          glyph.appendChild(mark);
        }else{
          glyph.textContent=character===" "?"\u00a0":character;
        }
        row.appendChild(glyph);
      });
      heading.appendChild(row);
    });
    const flourish=document.createElementNS("http://www.w3.org/2000/svg","svg");
    flourish.setAttribute("class","ink-flourish");
    flourish.setAttribute("viewBox","0 0 380 100");
    flourish.setAttribute("preserveAspectRatio","none");
    flourish.setAttribute("aria-hidden","true");
    const stroke=document.createElementNS("http://www.w3.org/2000/svg","path");
    stroke.setAttribute("class","ink-stroke");
    stroke.setAttribute("d","M8 72C78 91 190 55 291 64C321 65 345 72 364 56");
    const dot=document.createElementNS("http://www.w3.org/2000/svg","circle");
    dot.setAttribute("class","ink-dot");
    dot.setAttribute("cx","367");dot.setAttribute("cy","55");dot.setAttribute("r","3.3");
    flourish.append(stroke,dot);
    heading.appendChild(flourish);
    const signal=document.createElement("span");
    signal.className="ink-caption";
    signal.setAttribute("aria-hidden","true");
    heading.appendChild(signal);
    // Delay until text has been laid out. Never block visibility if frames are throttled.
    requestAnimationFrame(()=>{if(seq===generation)heading.classList.add("is-typeset")});
  }
  window.addEventListener("jhlab:language",typeset);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",typeset,{once:true});
  else typeset();
})();