"use strict";
const LORE_ANALOGY_ONLY_SELECTOR=".metaphor-inline, .flavor-cue, .rosetta, .analogy-bridge, .flavor-grid";
const LORE_SKIP_SELECTOR="button, input, select, option, textarea, a, summary, label, [contenteditable], [aria-hidden='true'], [hidden], [inert], .lore, .lesson-link, .no-lore";
function loreNodeIsAnalogyOnly(node){
  const parent=node&&node.parentElement;
  return !!(parent&&typeof parent.closest==="function"&&parent.closest(LORE_ANALOGY_ONLY_SELECTOR));
}
function loreLinksEveryOccurrence(){
  return typeof densityLevel==="function"&&densityLevel()==="guided";
}
function wireLore(root,context={}){
  if(typeof tooltipsEnabled==="function"&&!tooltipsEnabled())return;
  if(!root)root=typeof document!=="undefined"?document:null;
  if(!root||typeof root.querySelectorAll!=="function"||typeof document.createTreeWalker!=="function"||
      typeof NodeFilter==="undefined")return;
  const linkEveryOccurrence=loreLinksEveryOccurrence(),visitedNodes=new Set(),
    contextFlavor=typeof FLAVOR_BY_ID!=="undefined"&&FLAVOR_BY_ID[context.flavor]?context.flavor:"",
    contextAnalogies=typeof context.analogies==="boolean"?String(context.analogies):"";
  const seenByScope=new Map();
  (root||document).querySelectorAll(LORE_SEL).forEach(el=>{
    const scope=typeof el.closest==="function"?(el.closest(".slot, .stat, .card, .box, .reality-bar, .section-head, .eventcard, .binrow")||el):el;
    let seen=linkEveryOccurrence?null:seenByScope.get(scope);
    if(!linkEveryOccurrence&&!seen){seen=new Set();
      if(scope&&typeof scope.querySelectorAll==="function")scope.querySelectorAll(".lore[data-t]").forEach(item=>{
        if(item.dataset&&item.dataset.t)seen.add(item.dataset.t);
      });
      seenByScope.set(scope,seen);
    }
    const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null);
    const nodes=[];let n;while((n=walk.nextNode()))nodes.push(n);
    nodes.forEach(node=>{
      if(visitedNodes.has(node))return;visitedNodes.add(node);
      if(!node.nodeValue||node.nodeValue.trim().length<3)return;
      if(!node.parentElement||node.parentElement.closest(LORE_SKIP_SELECTOR))return;
      // Flavor copy can explain a real term after its definition is opened, but it must never
      // be the element that creates (or consumes) the canonical glossary link on the board.
      if(loreNodeIsAnalogyOnly(node))return;
      let found=false;
      const html=escapeHtml(node.nodeValue).replace(LORE_RX,(match,prefix,visible)=>{
        const key=LORE_ALIAS_TO_KEY[visible.toLowerCase()];
        if(!key||(!linkEveryOccurrence&&seen.has(key)))return match;
        found=true;if(seen)seen.add(key);
        return `${prefix}<span class="lore" tabindex="0" role="button" aria-expanded="false" data-t="${key}"${contextFlavor?` data-lore-flavor="${contextFlavor}"`:""}${contextAnalogies?` data-lore-analogies="${contextAnalogies}"`:""} `+
          `aria-label="${visible}: show definition">${visible}</span>`;
      });
      if(found){const span=document.createElement("span");span.classList.add("lore-text");span.innerHTML=html;node.parentNode.replaceChild(span,node);}
    });
  });
}
function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function flavorGloss(term,flavor=currentFlavor()){
  const f=flavor||currentFlavor(),alias=flavorAliasForTerm(term,f);
  const bridge=typeof flavorMechanicExplanation==="function"?flavorMechanicExplanation(term,f):"The metaphor describes the decision pattern, while the media-buying definition controls the math.";
  return `${f.name} bridge: ${term} works like ${alias}. ${bridge}`;
}
function specialistPlaybookForTerm(term){
  if(typeof GUIDED_PLAYBOOK==="undefined"||!Array.isArray(GUIDED_PLAYBOOK)||!GUIDED_PLAYBOOK.length)return null;
  const key=String(term||"").toLowerCase();
  const id=typeof SPECIALIST_PLAYBOOK_BY_TERM!=="undefined"?SPECIALIST_PLAYBOOK_BY_TERM[key]:null;
  return GUIDED_PLAYBOOK.find(item=>item.id===id)||GUIDED_PLAYBOOK[0];
}

let _pop=null,_popPinned=false,_popTrigger=null;
function popContains(node){
  if(!_pop||!node)return false;
  if(node===_pop)return true;
  if(typeof _pop.contains==="function")return _pop.contains(node);
  return typeof node.closest==="function"&&node.closest(".lorepop")===_pop;
}
function hidePop(options={}){
  const trigger=_popTrigger;
  if(_pop){_pop.remove();_pop=null;}
  if(_popTrigger){_popTrigger.setAttribute&&_popTrigger.setAttribute("aria-expanded","false");
    _popTrigger.removeAttribute&&_popTrigger.removeAttribute("aria-describedby");
    _popTrigger.removeAttribute&&_popTrigger.removeAttribute("aria-controls");}
  _popTrigger=null;_popPinned=false;
  if(options.restoreFocus&&trigger&&typeof trigger.focus==="function")trigger.focus();
}
function showPop(el,pinned=false){
  if(typeof tooltipsEnabled==="function"&&!tooltipsEnabled()){hidePop();return;}
  hidePop();_popPinned=!!pinned;
  const k=el.dataset.t;if(!LORE[k])return;
  _pop=document.createElement("div");_pop.className="lorepop";_pop.id="loreTooltip";
  _pop.setAttribute&&_pop.setAttribute("role","dialog");
  _pop.setAttribute&&_pop.setAttribute("aria-modal","false");
  _pop.setAttribute&&_pop.setAttribute("aria-labelledby","loreTooltipTitle");
  _pop.setAttribute&&_pop.setAttribute("aria-describedby","loreTooltipDescription");
  const lesson=lessonForTerm(k);
  const surfaceFlavor=typeof FLAVOR_BY_ID!=="undefined"&&FLAVOR_BY_ID[el.dataset.loreFlavor]?FLAVOR_BY_ID[el.dataset.loreFlavor]:currentFlavor(),
    surfaceAnalogies=el.dataset.loreAnalogies==="true"?true:el.dataset.loreAnalogies==="false"?false:
      (typeof analogiesEnabled!=="function"||analogiesEnabled());
  const analogy=surfaceAnalogies?`<span class="flavor-cue">${flavorGloss(k,surfaceFlavor)}</span>`:"";
  const specialist=typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE==="specialist";
  const tab=specialist?specialistPlaybookForTerm(k):null;
  const reference=specialist&&tab
    ?lessonLink(lesson.id,`Open Account Playbook · Tab ${tab.id} · ${tab.title}`,k)
    :lessonLink(lesson.id,`Open Field Guide · Lesson ${lesson.id} · ${lesson.title}`);
  _pop.innerHTML=`<b id="loreTooltipTitle">${k}</b><span id="loreTooltipDescription">${LORE[k]}</span>${analogy}<span class="guide-reference">${reference}</span>`;
  document.body.appendChild(_pop);_popTrigger=el;
  el.setAttribute&&el.setAttribute("aria-describedby","loreTooltipDescription");
  el.setAttribute&&el.setAttribute("aria-controls","loreTooltip");
  el.setAttribute&&el.setAttribute("aria-expanded","true");
  const r=el.getBoundingClientRect(),scrollX=Number(window.scrollX)||0,scrollY=Number(window.scrollY)||0;
  let left=(Number(r.left)||0)+scrollX;
  left=Math.min(left,scrollX+document.documentElement.clientWidth-320);
  _pop.style.left=Math.max(8,left)+"px";
  const pr=_pop.getBoundingClientRect(),height=Number(pr.height)||150,viewportHeight=Number(window.innerHeight)||800;
  let top=(Number(r.bottom)||0)+scrollY+6;
  if(top+height>scrollY+viewportHeight-8)top=Math.max(scrollY+8,(Number(r.top)||0)+scrollY-height-6);
  _pop.style.top=top+"px";
}
function loreInteractionEnabled(){return typeof tooltipsEnabled!=="function"||tooltipsEnabled();}
function closestLore(target){return target&&typeof target.closest==="function"?target.closest(".lore"):null;}
document.addEventListener("mouseover",e=>{if(!loreInteractionEnabled())return;const t=closestLore(e.target);if(t&&!_popPinned)showPop(t);});
document.addEventListener("mouseout",e=>{if(!loreInteractionEnabled()||_popPinned)return;
  const t=closestLore(e.target),next=e.relatedTarget;
  if(t){if(next&&(popContains(next)||closestLore(next)===t))return;hidePop();return;}
  if(popContains(e.target)&&!popContains(next)&&closestLore(next)!==_popTrigger)hidePop();
});
document.addEventListener("focusin",e=>{if(!loreInteractionEnabled())return;const t=closestLore(e.target);if(t&&!_popPinned)showPop(t);});
document.addEventListener("focusout",e=>{if(!loreInteractionEnabled()||_popPinned)return;
  const t=closestLore(e.target),next=e.relatedTarget;
  if(t){if(next&&(popContains(next)||closestLore(next)===t))return;hidePop();return;}
  if(popContains(e.target)&&!popContains(next)&&closestLore(next)!==_popTrigger)hidePop();
});
document.addEventListener("click",e=>{
  const lesson=e.target&&typeof e.target.closest==="function"?e.target.closest(".lesson-link"):null;
  if(lesson){e.preventDefault();const returnTo=popContains(lesson)?_popTrigger:null;hidePop();
    if(lesson.dataset.playbook&&typeof specialistGuide==="function")specialistGuide(lesson.dataset.playbook);
    else loreBook(lesson.dataset.lesson);
    if(returnTo&&typeof guideReturnFocus!=="undefined")guideReturnFocus=returnTo;
    return;}
  const t=closestLore(e.target);if(t&&loreInteractionEnabled()){e.preventDefault();
    if(_pop&&_popPinned&&_popTrigger===t)hidePop({restoreFocus:true});else showPop(t,true);
    return;}hidePop();
});
document.addEventListener("keydown",e=>{
  const soundPanel=typeof document!=="undefined"?document.getElementById("audioPanel"):null;
  if(e.defaultPrevented||(soundPanel&&!soundPanel.hidden))return;
  if(e.key==="Tab"&&typeof guideOv!=="undefined"&&guideOv&&guideOv.innerHTML&&!_pop){
    const modal=document.getElementById("guideCard");if(!modal||typeof modal.querySelectorAll!=="function")return;
    const focusable=Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[href],[tabindex]:not([tabindex="-1"])'))
      .filter(el=>!el.hidden&&!el.inert&&(typeof el.getClientRects!=="function"||el.getClientRects().length>0));
    if(!focusable.length){e.preventDefault();modal.focus();return;}
    const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
    if(e.shiftKey&&(active===first||active===modal)){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
    return;
  }
  if(e.key==="Escape"){
    if(_pop){e.preventDefault();hidePop({restoreFocus:true});return;}
    if(typeof guideOv!=="undefined"&&guideOv&&guideOv.innerHTML){e.preventDefault();closeGuide();}
  }
  const t=closestLore(e.target);
  if(loreInteractionEnabled()&&(e.key==="Enter"||e.key===" ")&&t){e.preventDefault();
    if(_pop&&_popPinned&&_popTrigger===t){hidePop({restoreFocus:true});return;}
    showPop(t,true);
    const reference=_pop&&typeof _pop.querySelector==="function"?_pop.querySelector(".lesson-link"):null;
    if(reference&&typeof reference.focus==="function")reference.focus();
  }
});

function lessonLink(id,label,canonicalTerm=""){const lesson=KNOWLEDGE_BY_ID[String(id).padStart(2,"0")];if(!lesson)return "";
  const specialist=typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE==="specialist"&&typeof GUIDED_PLAYBOOK!=="undefined";
  const tab=specialist?(canonicalTerm?specialistPlaybookForTerm(canonicalTerm):(GUIDED_PLAYBOOK.find(item=>item.id===lesson.id)||GUIDED_PLAYBOOK[0])):null;
  return specialist
    ?`<button type="button" class="lesson-link" data-playbook="${tab.id}">${label||`Playbook ${tab.id} · ${tab.title}`}</button>`
    :`<button type="button" class="lesson-link" data-lesson="${lesson.id}">${label||`Lesson ${lesson.id} · ${lesson.title}`}</button>`;}
function loreBook(selectedId="01"){
  const selected=KNOWLEDGE_BY_ID[String(selectedId).padStart(2,"0")]||KNOWLEDGE_DB.lessons[0];
  const rows=Object.keys(LORE).sort().map(k=>{const lesson=lessonForTerm(k);
    const analogy=typeof analogiesEnabled!=="function"||analogiesEnabled()?`<span class="flavor-cue">${flavorGloss(k)}</span>`:"";
    return `<div><div class="t">${k}</div><div class="d">${LORE[k]}${analogy}${lessonLink(lesson.id,"",k)}</div></div>`;}).join("");
  showGuide(`<div class="eyebrow">Field Guide · 11 linked lessons</div><h2 id="guideTitle">Lesson ${selected.id} · ${selected.title}</h2>
    <div class="prose"><p>${selected.summary}</p><p>${KNOWLEDGE_DB.note}</p></div>
    <div class="note"><b>Scope:</b> ${LESSON_SCOPE[selected.id]}</div>
    <div class="guide-tabs">${KNOWLEDGE_DB.lessons.map(lesson=>`<button class="btn" data-lesson-select="${lesson.id}" ${lesson.id===selected.id?"disabled":""}>${lesson.id} · ${lesson.title}</button>`).join("")}</div>
    <div class="guide-depth"><h3>Foundation · new to media buying</h3>${selected.foundation}</div>
    <div class="guide-depth"><h3>Working practice · active operators</h3>${selected.working}</div>
    <div class="guide-depth"><h3>Expert notes · scope and caveats</h3>${selected.expert}</div>
    <div class="prose"><strong>Decision checklist</strong><ul>${selected.checklist.map(item=>`<li>${item}</li>`).join("")}</ul>
      <p><strong>Related terms:</strong> ${selected.terms.join(" · ")}</p></div>
    <details><summary class="btn">Open complete glossary · ${Object.keys(LORE).length} definitions</summary><div class="loregrid">${rows}</div></details>
    <div class="row" style="margin-top:10px"><button class="btn wide" id="guideClose">Back to the simulation</button></div>`);
  document.getElementById("guideClose").onclick=closeGuide;
  guideOv.querySelectorAll("button[data-lesson-select]").forEach(button=>button.onclick=()=>loreBook(button.dataset.lessonSelect));
}

function specialistGuide(selectedId="00"){
  if(typeof GUIDED_PLAYBOOK==="undefined"||!Array.isArray(GUIDED_PLAYBOOK)||!GUIDED_PLAYBOOK.length){
    if(typeof loreBook==="function")loreBook("01");
    return;
  }
  const normalized=String(selectedId).padStart(2,"0");
  const selected=GUIDED_PLAYBOOK.find(lesson=>lesson.id===normalized)||GUIDED_PLAYBOOK[0];
  const termMarkup=selected.terms.map(term=>`<span>${escapeHtml(term)}</span>`).join(" · ");
  showGuide(`<div class="eyebrow">Specialist Account Playbook · ${GUIDED_PLAYBOOK.length} linked lessons</div>
    <h2 id="guideTitle">Lesson ${selected.id} · ${escapeHtml(selected.title)}</h2>
    <div class="prose"><p>${escapeHtml(selected.summary)}</p></div>
    <div class="note"><b>Public simulation scope:</b> This playbook preserves the operating model while omitting names, source links, account identifiers, literal benchmarks, and private commercial rules.</div>
    <div class="guide-tabs">${GUIDED_PLAYBOOK.map(lesson=>`<button class="btn" type="button" data-playbook-select="${lesson.id}" ${lesson.id===selected.id?"disabled":""}>${lesson.id} · ${escapeHtml(lesson.title)}</button>`).join("")}</div>
    <div class="guide-depth"><h3>Foundation · new to media buying</h3><p>${escapeHtml(selected.core)}</p></div>
    <div class="guide-depth"><h3>Working practice · active operators</h3><p>${escapeHtml(selected.operator)}</p></div>
    <div class="guide-depth"><h3>Advanced · causal scope and caveats</h3><p>${escapeHtml(selected.advanced)}</p></div>
    <div class="prose"><strong>Decision checklist</strong><ul>${selected.checklist.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <p><strong>Related media-buying terms:</strong> ${termMarkup}</p></div>
    <div class="row" style="margin-top:10px"><button class="btn wide" id="playbookGlossary" type="button">Open general glossary</button>
      <button class="btn wide" id="guideClose" type="button">Back to the simulation</button></div>`);
  const closeButton=document.getElementById("guideClose");if(closeButton)closeButton.onclick=closeGuide;
  const glossaryButton=document.getElementById("playbookGlossary");if(glossaryButton)glossaryButton.onclick=()=>loreBook("01");
  if(guideOv&&typeof guideOv.querySelectorAll==="function")guideOv.querySelectorAll("button[data-playbook-select]").forEach(button=>{
    button.onclick=()=>specialistGuide(button.dataset.playbookSelect);
  });
}
