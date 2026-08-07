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
const LORE_LABEL_OVERRIDES=Object.freeze({
  "ppc":"Pay-per-click (PPC)","ctv":"Connected TV (CTV)","cpc":"Cost per click (CPC)","cpm":"Cost per thousand impressions (CPM)","ctr":"Click-through rate (CTR)","cvr":"Conversion rate (CVR)","cpl":"Cost per lead (CPL)","cpa":"Cost per acquisition (CPA)","epl":"Earnings or value per lead (EPL)",
  "roi":"Return on investment (ROI)","roas":"Return on ad spend (ROAS)","lp ctr":"Landing-page click-through rate (LP CTR)","sis":"Search impression share (SIS)","max cpc":"Maximum cost per click (Max CPC)","avg position":"Average position",
  "vsl":"Video sales letter (VSL)","veo creative":"Veo creative","ugc video":"User-generated content video","ctv spot":"Connected TV (CTV) spot","quality score":"Quality Score",
  "modeled mer":"Modeled marketing efficiency ratio (MER)","blended modeled mer":"Blended modeled marketing efficiency ratio (MER)","blended mer":"Blended marketing efficiency ratio (MER)","marginal mer":"Marginal marketing efficiency ratio (MER)",
  "account roi":"Account return on investment (ROI)","ad roi":"Ad return on investment (ROI)","all-in business roi":"All-in business return on investment (ROI)","attributed media roi":"Attributed media return on investment (ROI)",
  "a/b ad permutation":"A/B ad permutation"
});
function loreTermLabel(term){
  const key=String(term||"").toLowerCase();
  if(LORE_LABEL_OVERRIDES[key])return LORE_LABEL_OVERRIDES[key];
  return key?key.charAt(0).toUpperCase()+key.slice(1):"";
}
function detailedLoreGuidanceMarkup(term){
  if(typeof densityLevel!=="function"||densityLevel()!=="guided"||typeof playerGuidanceForTerm!=="function")return "";
  const guidance=playerGuidanceForTerm(term);if(!guidance)return "";
  return [
    ["Why it matters",guidance.why],
    ["What changes it",guidance.changes],
    ["Your move",guidance.move],
    ["Where to check",guidance.check]
  ].filter(([,copy])=>copy).map(([label,copy])=>
    `<span class="guide-reference"><b>${label}</b>${escapeHtml(copy)}</span>`).join("");
}
function flavorGloss(term,flavor=currentFlavor()){
  const f=flavor||currentFlavor(),alias=flavorAliasForTerm(term,f);
  const bridge=typeof flavorMechanicExplanation==="function"?flavorMechanicExplanation(term,f):"The metaphor describes the decision pattern, while the media-buying definition controls the math.";
  return `${f.name} connection: Think of ${term} as ${alias}. ${bridge}`;
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
    :lessonLink(lesson.id,`Open Field Guide · Lesson ${lesson.id} · ${lesson.title}`,k);
  const guided=typeof densityLevel==="function"&&densityLevel()==="guided";
  const definition=guided
    ?`<span class="guide-reference"><b>What it means</b>${escapeHtml(LORE[k])}</span>`
    :`<span>${escapeHtml(LORE[k])}</span>`;
  _pop.innerHTML=`<b id="loreTooltipTitle">${escapeHtml(loreTermLabel(k))}</b><div id="loreTooltipDescription">${definition}${detailedLoreGuidanceMarkup(k)}${analogy}</div><span class="guide-reference">${reference}</span>`;
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
  if(lesson){e.preventDefault();const returnTo=popContains(lesson)?_popTrigger:null,guideWasOpen=typeof guideOv!=="undefined"&&!!guideOv.innerHTML,
      priorGuideReturn=typeof guideReturnFocus!=="undefined"?guideReturnFocus:null;hidePop();
    if(lesson.dataset.playbook&&typeof specialistGuide==="function")specialistGuide(lesson.dataset.playbook,{sourceTerm:lesson.dataset.lessonTerm||""});
    else loreBook(lesson.dataset.lesson,{sourceTerm:lesson.dataset.lessonTerm||""});
    if(returnTo&&!guideWasOpen&&typeof guideReturnFocus!=="undefined")guideReturnFocus=returnTo;
    else if(guideWasOpen&&priorGuideReturn&&typeof guideReturnFocus!=="undefined")guideReturnFocus=priorGuideReturn;
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
  const term=canonicalTerm?` data-lesson-term="${String(canonicalTerm).replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[char]))}"`:"";
  return specialist
    ?`<button type="button" class="lesson-link" data-playbook="${tab.id}"${term}>${label||`Playbook ${tab.id} · ${tab.title}`}</button>`
    :`<button type="button" class="lesson-link" data-lesson="${lesson.id}"${term}>${label||`Lesson ${lesson.id} · ${lesson.title}`}</button>`;}

const LESSON_PROGRESS_SCHEMA=1;
let guideLessonState=null;
function lessonProgressKey(){const profile=typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE?ACTIVE_PROFILE:"general";return `ttm.lessons.${profile}.v${LESSON_PROGRESS_SCHEMA}`;}
function blankLessonProgress(){return {schema:LESSON_PROGRESS_SCHEMA,completed:{field:[],specialist:[]},last:null};}
function readLessonProgress(){try{const raw=JSON.parse(localStorage.getItem(lessonProgressKey())||"null"),base=blankLessonProgress();
    if(!raw||raw.schema!==LESSON_PROGRESS_SCHEMA)return base;
    return {...base,...raw,completed:{field:Array.isArray(raw.completed?.field)?raw.completed.field:[],specialist:Array.isArray(raw.completed?.specialist)?raw.completed.specialist:[]}};
  }catch(e){return blankLessonProgress();}}
function writeLessonProgress(progress){try{localStorage.setItem(lessonProgressKey(),JSON.stringify(progress));}catch(e){}return progress;}
function rememberLessonState(state){const progress=readLessonProgress();progress.last={course:state.course,id:state.id,step:state.step,
  answer:Number.isInteger(state.answer)?state.answer:null};writeLessonProgress(progress);}
function lessonIsComplete(course,id){return readLessonProgress().completed[course]?.includes(id)||false;}
function completeLesson(course,id){const progress=readLessonProgress(),list=progress.completed[course]||[];
  if(!list.includes(id))progress.completed[course]=[...list,id];const order=lessonCourseOrder(course),index=order.indexOf(id),after=order.slice(index+1).find(item=>!progress.completed[course].includes(item)),
    remaining=order.find(item=>!progress.completed[course].includes(item)),next=after||remaining||null;
  progress.last=next?{course,id:next,step:0,answer:null}:null;writeLessonProgress(progress);return progress;}
function lessonCourseRecords(course){return course==="specialist"&&typeof GUIDED_PLAYBOOK!=="undefined"?GUIDED_PLAYBOOK:KNOWLEDGE_DB.lessons;}
function lessonCourseOrder(course){return course==="specialist"?lessonCourseRecords(course).map(item=>item.id):LESSON_PATHS.flatMap(path=>path.lessons);}
function nextLessonId(course,id){const order=lessonCourseOrder(course),index=order.indexOf(id);return index>=0&&index<order.length-1?order[index+1]:null;}
function lessonTermButtons(terms=[]){return terms.filter(term=>LORE[term]).slice(0,5).map(term=>
  `<button class="lesson-term lore" type="button" data-t="${escapeHtml(term)}" aria-expanded="false" aria-label="${escapeHtml(loreTermLabel(term))}: show definition">${escapeHtml(loreTermLabel(term))}</button>`).join("");}
function generalLessonModule(id){const lesson=KNOWLEDGE_BY_ID[id],module=typeof LESSON_MODULES!=="undefined"?LESSON_MODULES[id]:null;return lesson&&module?{...module,title:lesson.title,summary:lesson.summary,
  reference:{working:lesson.working,expert:lesson.expert,scope:LESSON_SCOPE[id]}}:null;}
function specialistLessonQuestion(selected){const meta=typeof SPECIALIST_LESSON_META!=="undefined"?SPECIALIST_LESSON_META[selected.id]:null,mapped=meta?.questionId,
    question=typeof TRAINING_QUESTION_BY_ID!=="undefined"?TRAINING_QUESTION_BY_ID[mapped]:null;
  if(question)return {id:question.id,prompt:question.prompt,answer:question.answer,discipline:question.discipline,why:question.why,
    choices:question.choices.map((text,index)=>({text,feedback:index===question.answer?"This choice matches the evidence and scope in the case.":"This choice does not follow the evidence or operating order in this lesson."}))};
  if(selected.id==="09")return {id:"playbook-09-practice-loop",prompt:"Which sequence turns a result into a useful practice drill?",answer:1,discipline:"account",
    why:"A prediction creates a record of judgment. The reveal and same-scenario replay show whether the next decision improved.",choices:[
      {text:"Reveal the answer, memorize it and move to a new seed.",feedback:"Seeing the answer first does not test a decision or explain transfer."},
      {text:"Predict, define the stop rule, reveal, explain and replay one changed decision.",feedback:"This creates a full prediction-to-replay learning loop."},
      {text:"Repeat the same clicks until the score rises.",feedback:"A higher score without a stated reason does not identify what was learned."},
      {text:"Read every glossary term before touching the board.",feedback:"Reference material cannot replace a decision and observed result."}]};
  if(selected.id==="10")return {id:"playbook-10-progression",prompt:"A learner knows the terms but cannot diagnose an account. What should practice require next?",answer:2,discipline:"account",
    why:"The next step should bridge vocabulary and action: diagnose one known break with guidance, then repeat on a fresh case with less help.",choices:[
      {text:"Another page of definitions.",feedback:"The learner has already demonstrated vocabulary recall."},
      {text:"An unbounded portfolio crisis with no coaching.",feedback:"That adds several new decisions before diagnostic order is established."},
      {text:"One guided funnel diagnosis, followed by the same task on a new case.",feedback:"This moves from supported action to independent transfer."},
      {text:"A faster timer on the same vocabulary quiz.",feedback:"Speed does not demonstrate account diagnosis."}]};
  if(selected.id==="11"&&typeof LESSON_MODULES!=="undefined")return {...LESSON_MODULES["11"].check,discipline:"creative",id:"playbook-11-review"};
  if(selected.id==="12")return {id:"playbook-12-replay",prompt:"What should happen after a cold run exposes a weak decision?",answer:0,discipline:"account",
    why:"Keep the scenario constant long enough to test the revised decision. Move to a new seed only after the correction works in the original case.",choices:[
      {text:"Read the linked lesson and replay the same setup with one deliberate change.",feedback:"This isolates whether the revised decision improves the known case."},
      {text:"Start a new seed immediately.",feedback:"A new scenario adds uncertainty before the original mistake is tested."},
      {text:"Delete the run so the miss no longer appears.",feedback:"The debrief is evidence, not a penalty to erase."},
      {text:"Copy the winning score without reviewing the decisions.",feedback:"The score does not explain which action should transfer."}]};
  const correct=selected.checklist[0]||"State the evidence before changing the account.";
  return {id:`playbook-${selected.id}-check`,prompt:"Which move follows this lesson's operating order?",answer:1,discipline:"account",
    why:`Start with this move: ${correct}`,choices:[
      {text:"Change several account layers at once.",feedback:"That hides which change produced the result."},
      {text:correct,feedback:"This is the first check the lesson asks you to make."},
      {text:"Choose whichever headline metric is green.",feedback:"A metric only helps when its scope matches the decision."},
      {text:"Wait for certainty before recording a hypothesis.",feedback:"Good account work states uncertainty and defines the next evidence check."}
    ]};}
function conciseLessonDefinition(term){const text=String(LORE[term]||""),sentence=text.match(/^.{1,190}?[.!?](?:\s|$)/);return sentence?sentence[0].trim():text.slice(0,190);}
function specialistLessonModule(id){if(typeof GUIDED_PLAYBOOK==="undefined")return null;const selected=GUIDED_PLAYBOOK.find(item=>item.id===id);if(!selected)return null;
  const meta=typeof SPECIALIST_LESSON_META!=="undefined"?SPECIALIST_LESSON_META[id]:null,question=specialistLessonQuestion(selected),terms=selected.terms.filter(term=>LORE[term]).slice(0,5);
  return {id:selected.id,title:selected.title,category:"Specialist account playbook",minutes:4,discipline:question.discipline||"account",outcome:meta?.outcome||selected.summary,
    situation:{title:meta?.title||"A recommendation is due",body:meta?.body||selected.summary,
      facts:meta?.facts||["The next move needs a reason.","The changed layer must be named.","The result needs a follow-up check."]},
    concept:{title:"Start with the operating rule",body:selected.core,contrasts:terms.slice(0,3).map(term=>({label:loreTermLabel(term),value:conciseLessonDefinition(term)}))},
    example:{title:"Work the account in order",setup:meta?.example||selected.operator,steps:selected.checklist.slice(0,4),outcome:"The recommendation now has a reason, an action and a way to check the result."},
    check:question,application:{title:"Use this on the account",mode:"Specialist practice",body:selected.summary,steps:selected.checklist.slice(0,4)},terms,
    reference:{working:selected.operator,expert:selected.advanced,scope:"The playbook teaches transferable operating judgment without exposing account identifiers, private benchmarks or source links."}};}
function lessonModule(course,id){return course==="specialist"?specialistLessonModule(id):generalLessonModule(id);}
function lessonStageMarkup(module,state){const stage=Math.max(0,Math.min(5,Number(state.step)||0)),stageA11y=`${LESSON_STAGE_LABELS[stage]}: ${module.title}`;
  if(stage===0)return `<section class="lesson-stage lesson-brief" id="lessonStageFocus" tabindex="-1" aria-label="${escapeHtml(stageA11y)}" data-lesson-stage="briefing">
    <div class="lesson-promise"><span>By the end, you can</span><strong>${escapeHtml(module.outcome)}</strong></div>
    ${state.sourceTerm?`<p class="lesson-entry-note">You opened this lesson from <b>${escapeHtml(loreTermLabel(state.sourceTerm))}</b>. The case below shows how that term affects a decision.</p>`:""}
    <div class="lesson-case"><div class="eyebrow">Your account</div><h3>${escapeHtml(module.situation.title)}</h3><p>${escapeHtml(module.situation.body)}</p>
      <ul>${module.situation.facts.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div></section>`;
  if(stage===1)return `<section class="lesson-stage" id="lessonStageFocus" tabindex="-1" aria-label="${escapeHtml(stageA11y)}" data-lesson-stage="concept"><div class="eyebrow">The idea</div><h3>${escapeHtml(module.concept.title)}</h3>
    <p class="lesson-lead">${escapeHtml(module.concept.body)}</p><div class="lesson-contrast-grid">${module.concept.contrasts.map(item=>
      `<article><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></article>`).join("")}</div></section>`;
  if(stage===2)return `<section class="lesson-stage" id="lessonStageFocus" tabindex="-1" aria-label="${escapeHtml(stageA11y)}" data-lesson-stage="example"><div class="eyebrow">Worked example</div><h3>${escapeHtml(module.example.title)}</h3>
    <p class="lesson-lead">${escapeHtml(module.example.setup)}</p><ol class="lesson-steps">${module.example.steps.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ol>
    <div class="lesson-observation"><span>What this tells you</span><strong>${escapeHtml(module.example.outcome)}</strong></div></section>`;
  if(stage===3)return `<section class="lesson-stage" id="lessonStageFocus" tabindex="-1" aria-label="${escapeHtml(stageA11y)}" data-lesson-stage="decision"><div class="eyebrow">Make the call</div><h3>${escapeHtml(module.check.prompt)}</h3>
    <p class="lesson-choice-instruction">Choose the strongest answer. The explanation appears after you commit.</p><div class="lesson-choice-list">${module.check.choices.map((choice,index)=>
      `<button class="lesson-choice" type="button" data-lesson-choice="${index}"><span>${String.fromCharCode(65+index)}</span><b>${escapeHtml(choice.text)}</b></button>`).join("")}</div></section>`;
  const chosen=Number.isInteger(state.answer)?state.answer:null,correct=chosen===module.check.answer,answer=module.check.choices[module.check.answer],selected=chosen===null?null:module.check.choices[chosen];
  if(stage===4)return `<section class="lesson-stage" id="lessonStageFocus" tabindex="-1" aria-label="${escapeHtml(stageA11y)}" data-lesson-stage="debrief" aria-live="polite">
    <div class="lesson-result ${correct?"is-correct":"is-review"}"><span aria-hidden="true">${correct?"✓":"↺"}</span><div><strong>${correct?"Correct":"Review the distinction"}</strong>
      <small>${correct?(state.award>0?`+${Number(state.award).toLocaleString("en-US")} Training XP`:"That answer is already in your training record"):`Your choice: ${selected?escapeHtml(selected.text):"No answer selected"}`}</small></div></div>
    <div class="lesson-answer"><span>Strongest answer</span><h3>${escapeHtml(answer.text)}</h3>${selected?`<p>${escapeHtml(selected.feedback)}</p>`:""}<p>${escapeHtml(module.check.why)}</p></div>
  </section>`;
  const complete=lessonIsComplete(state.course,state.id),nextId=nextLessonId(state.course,state.id),analogy=typeof analogiesEnabled!=="function"||analogiesEnabled();
  return `<section class="lesson-stage" id="lessonStageFocus" tabindex="-1" aria-label="${escapeHtml(stageA11y)}" data-lesson-stage="application">
    <div class="lesson-apply"><div class="eyebrow">Take it to the board</div><h3>${escapeHtml(module.application.title)}</h3><p>${escapeHtml(module.application.body)}</p>
      <ul>${module.application.steps.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul><span class="lesson-mode-tag">Practice: ${escapeHtml(module.application.mode)}</span></div>
    ${analogy&&module.terms[0]?`<details class="lesson-optional"><summary>Connect this to ${escapeHtml(currentFlavor().name)}</summary><p class="flavor-cue">${escapeHtml(flavorGloss(module.terms[0]))}</p></details>`:""}
    <details class="lesson-optional"><summary>Operator and expert notes</summary><div><b>Working practice</b><p>${escapeHtml(module.reference.working)}</p><b>Limits and caveats</b><p>${escapeHtml(module.reference.expert)}</p></div></details>
    ${complete?`<div class="lesson-complete" role="status"><span aria-hidden="true">✓</span><b>Lesson complete</b></div>`:""}
    <div class="lesson-debrief-actions">${!complete?'<button class="btn primary" id="lessonComplete" type="button" data-sfx="commit">Complete lesson</button>':nextId?`<button class="btn primary" type="button" data-lesson-next="${nextId}" data-sfx="navigation">Start the next lesson</button>`:"<button class=\"btn primary\" id=\"lessonLibraryAfterComplete\" type=\"button\" data-sfx=\"navigation\">Return to the lesson library</button>"}</div>
  </section>`;}
function bindLessonShell(module,state){const library=document.getElementById("guideLibrary"),closeButton=document.getElementById("guideClose"),exitBottom=document.getElementById("guideExitBottom"),back=document.getElementById("lessonBack"),next=document.getElementById("lessonNext");
  if(library)library.onclick=()=>state.course==="specialist"?specialistLibrary():loreLibrary();if(closeButton)closeButton.onclick=closeGuide;
  if(exitBottom)exitBottom.onclick=closeGuide;
  if(back)back.onclick=()=>{if(state.step<=0){state.course==="specialist"?specialistLibrary():loreLibrary();return;}state.step--;renderLesson(state);};
  if(next)next.onclick=()=>{state.step=Math.min(5,state.step+1);renderLesson(state);};
  guideOv.querySelectorAll("button[data-lesson-choice]").forEach(button=>button.onclick=()=>{if(state.step!==3)return;const choice=Number(button.dataset.lessonChoice),correct=choice===module.check.answer;
    state.answer=choice;state.step=4;let result=null;if(typeof TrainingProgress!=="undefined"&&TrainingProgress)result=TrainingProgress.recordQuestion({...module.check,discipline:module.discipline},{correct,source:"mastery"});
    state.award=result?.awarded||0;renderLesson(state);if(correct&&typeof fireFx==="function")fireFx("quizCorrect",{points:state.award||0},{silent:false});
    else if(!correct&&typeof playSfx==="function"&&typeof SFX_EVENT_CUE!=="undefined")playSfx(SFX_EVENT_CUE.quizWrong);});
  const complete=document.getElementById("lessonComplete");if(complete)complete.onclick=()=>{completeLesson(state.course,state.id);renderLesson(state,{remember:false});
    const action=guideOv.querySelector("button[data-lesson-next]")||document.getElementById("lessonLibraryAfterComplete");if(action&&typeof action.focus==="function")action.focus();};
  const after=document.getElementById("lessonLibraryAfterComplete");if(after)after.onclick=()=>state.course==="specialist"?specialistLibrary():loreLibrary();
  guideOv.querySelectorAll("button[data-lesson-next]").forEach(button=>button.onclick=()=>{const id=button.dataset.lessonNext;state.course==="specialist"?specialistGuide(id):loreBook(id);});
}
function renderLesson(state,{remember=true}={}){const module=lessonModule(state.course,state.id);if(!module){state.course==="specialist"?specialistLibrary():loreLibrary();return;}
  state.step=Math.max(0,Math.min(5,Number(state.step)||0));if(state.step>=4&&!Number.isInteger(state.answer))state.step=3;guideLessonState=state;if(remember)rememberLessonState(state);
  const completed=lessonIsComplete(state.course,state.id),stageLabel=LESSON_STAGE_LABELS[state.step],terms=lessonTermButtons(module.terms);
  showGuide(`<div class="lesson-player no-lore" data-course="${state.course}">
    <header class="lesson-header"><button class="lesson-backlink" id="guideLibrary" type="button" data-sfx="navigation">${state.course==="specialist"?"Account Playbook":"Field Guide"}</button>
      <span>${escapeHtml(module.category)} · ${module.minutes} min</span><button class="lesson-exit" id="guideClose" type="button">Exit lesson</button></header>
    <div class="lesson-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin="1" aria-valuemax="${LESSON_STAGE_LABELS.length}" aria-valuenow="${state.step+1}"><span style="width:${((state.step+1)/LESSON_STAGE_LABELS.length)*100}%"></span></div>
    <div class="lesson-heading"><div class="eyebrow" id="lessonStageContext">Lesson ${module.id} · Step ${state.step+1} of ${LESSON_STAGE_LABELS.length} · ${stageLabel}${completed?" · complete":""}</div>
      <h2 id="guideTitle">${escapeHtml(module.title)}</h2></div>
    ${lessonStageMarkup(module,state)}
    <details class="lesson-term-drawer"><summary>Definitions used here · ${module.terms.length}</summary><div>${terms||"No glossary terms on this step."}</div></details>
    <footer class="lesson-footer"><button class="btn" id="lessonBack" type="button" data-sfx="navigation">${state.step===0?"Back to library":"Back"}</button>
      ${state.step<3||state.step===4?`<button class="btn primary" id="lessonNext" type="button" data-sfx="navigation">${state.step===2?"Make the call":state.step===4?"Apply it":"Continue"}</button>`:""}
      ${state.step===5?'<button class="btn" id="guideExitBottom" type="button">Back to To The Moon</button>':""}</footer></div>`);
  const modal=document.getElementById("guideCard");if(modal)modal.setAttribute("aria-describedby","lessonStageContext");bindLessonShell(module,state);
  const stageFocus=document.getElementById("lessonStageFocus");if(stageFocus&&typeof stageFocus.focus==="function")stageFocus.focus({preventScroll:true});
}
function guideLibraryMarkup(course,records){const progress=readLessonProgress(),completed=progress.completed[course]||[],last=progress.last?.course===course?progress.last:null;
  const title=course==="specialist"?"Account Playbook":"Field Guide",copy=course==="specialist"?"Short account lessons built around one decision at a time.":"Short lessons built around an account situation, a decision and a debrief.";
  const groups=course==="field"?LESSON_PATHS.map(path=>({title:path.title,copy:path.copy,records:path.lessons.map(id=>records.find(item=>item.id===id)).filter(Boolean)})):
    [{title:"Specialist account sequence",copy:"Start with the account mission, then move through creative, metrics, diagnosis and replay.",records}];
  return `<div class="lesson-library no-lore"><div class="eyebrow">${title}</div><h2 id="guideTitle">Choose one thing to learn</h2><p class="lesson-library-intro">${copy} Each lesson takes about four or five minutes.</p>
    <div class="lesson-library-status"><b>${completed.length} of ${records.length} complete</b><span>Progress is saved on this browser.</span></div>
    ${last?`<button class="lesson-continue-card" type="button" data-${course==="specialist"?"playbook":"lesson"}-select="${last.id}" data-lesson-step="${last.step}"${Number.isInteger(last.answer)?` data-lesson-answer="${last.answer}"`:""}><span>Continue</span><b>${escapeHtml(records.find(item=>item.id===last.id)?.title||"Last lesson")}</b><small>Resume at step ${Number(last.step)+1}</small></button>`:""}
    <div class="lesson-paths">${groups.map(group=>`<section><div class="lesson-path-heading"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.copy)}</p></div><div class="lesson-library-grid">${group.records.map(item=>
      `<button class="lesson-library-card ${completed.includes(item.id)?"is-complete":""}" type="button" data-${course==="specialist"?"playbook":"lesson"}-select="${item.id}" data-sfx="navigation"><span>${item.id}</span><b>${escapeHtml(item.title)}</b><small>${completed.includes(item.id)?"Complete · replay":"4 to 5 min"}</small></button>`).join("")}</div></section>`).join("")}</div>
    <div class="lesson-library-actions"><button class="btn" id="openGuideGlossary" type="button">Search definitions</button><button class="btn" id="guideClose" type="button">Back to To The Moon</button></div></div>`;}
function bindGuideLibrary(course){const closeButton=document.getElementById("guideClose"),glossary=document.getElementById("openGuideGlossary");if(closeButton)closeButton.onclick=closeGuide;if(glossary)glossary.onclick=()=>loreGlossary();
  const selector=course==="specialist"?"button[data-playbook-select]":"button[data-lesson-select]";guideOv.querySelectorAll(selector).forEach(button=>button.onclick=()=>{
    const id=course==="specialist"?button.dataset.playbookSelect:button.dataset.lessonSelect,step=Number(button.dataset.lessonStep)||0,
      answer=button.dataset.lessonAnswer===undefined?null:Number(button.dataset.lessonAnswer);
    course==="specialist"?specialistGuide(id,{step,answer}):loreBook(id,{step,answer});});}
function loreLibrary(){guideLessonState=null;showGuide(guideLibraryMarkup("field",KNOWLEDGE_DB.lessons));bindGuideLibrary("field");}
function specialistLibrary(){if(typeof GUIDED_PLAYBOOK==="undefined"||!GUIDED_PLAYBOOK.length){loreLibrary();return;}guideLessonState=null;showGuide(guideLibraryMarkup("specialist",GUIDED_PLAYBOOK));bindGuideLibrary("specialist");}
function glossaryRows(query=""){const clean=String(query||"").trim().toLowerCase(),all=Object.keys(LORE).sort(),matches=(clean?all.filter(term=>term.includes(clean)||LORE[term].toLowerCase().includes(clean)):all).slice(0,clean?60:30);
  if(!matches.length)return '<p class="lesson-glossary-empty">No definitions match that search.</p>';
  return matches.map(term=>{const lesson=lessonForTerm(term);return `<article><h3>${escapeHtml(loreTermLabel(term))}</h3><p>${escapeHtml(LORE[term])}</p>${lessonLink(lesson.id,`Open its lesson · ${lesson.title}`,term)}</article>`;}).join("");}
function loreGlossary(query=""){const count=Object.keys(LORE).length;showGuide(`<div class="lesson-glossary no-lore"><header class="lesson-header"><button class="lesson-backlink" id="guideLibrary" type="button" data-sfx="navigation">${typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE==="specialist"?"Account Playbook":"Field Guide"}</button><span>Reference</span><button class="lesson-exit" id="guideClose" type="button">Exit</button></header>
    <div class="eyebrow">Definitions</div><h2 id="guideTitle">Search the media-buying glossary</h2><p>Use this when you need a definition. Lessons stay focused on decisions.</p>
    <label class="lesson-glossary-search"><span>Search ${count} terms</span><input id="guideGlossarySearch" type="search" value="${String(query).replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[char]))}" placeholder="Try MER, pixel or allocation" autocomplete="off"></label>
    <p class="lesson-glossary-count" id="guideGlossaryCount" aria-live="polite">${query?"Up to 60 matches":"Showing the first 30 terms. Search to narrow the list."}</p><div class="lesson-glossary-results" id="guideGlossaryResults">${glossaryRows(query)}</div></div>`);
  const closeButton=document.getElementById("guideClose"),library=document.getElementById("guideLibrary"),input=document.getElementById("guideGlossarySearch"),results=document.getElementById("guideGlossaryResults"),countLabel=document.getElementById("guideGlossaryCount");
  if(closeButton)closeButton.onclick=closeGuide;if(library)library.onclick=()=>typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE==="specialist"?specialistLibrary():loreLibrary();
  if(input){input.oninput=()=>{results.innerHTML=glossaryRows(input.value);countLabel.textContent=input.value.trim()?"Showing up to 60 matches.":"Showing the first 30 terms. Search to narrow the list.";};if(typeof input.focus==="function")input.focus();}}
function loreBook(selectedId="",options={}){if(!selectedId){loreLibrary();return;}const id=String(selectedId).padStart(2,"0"),module=generalLessonModule(id);if(!module){loreLibrary();return;}
  renderLesson({course:"field",id,step:Number(options.step)||0,answer:Number.isInteger(options.answer)?options.answer:null,award:0,sourceTerm:options.sourceTerm||""});}
function specialistGuide(selectedId="",options={}){if(typeof GUIDED_PLAYBOOK==="undefined"||!Array.isArray(GUIDED_PLAYBOOK)||!GUIDED_PLAYBOOK.length){loreLibrary();return;}
  if(!selectedId){specialistLibrary();return;}const id=String(selectedId).padStart(2,"0");if(!specialistLessonModule(id)){specialistLibrary();return;}
  renderLesson({course:"specialist",id,step:Number(options.step)||0,answer:Number.isInteger(options.answer)?options.answer:null,award:0,sourceTerm:options.sourceTerm||""});}
