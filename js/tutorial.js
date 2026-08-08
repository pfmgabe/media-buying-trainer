"use strict";

/* The Fundamentals tutorial is a verified action script, not a slideshow. Its progress is
   presentation state stored by run fingerprint, so it cannot alter simulation RNG or metrics. */
let tutorialObserver=null,tutorialBound=false,tutorialLastNudge="",tutorialIntroActive=false,tutorialClickGateBound=false,
  tutorialSessionActive=false;

function tutorialProfileId(){return typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE?ACTIVE_PROFILE:
  (typeof window!=="undefined"&&window.__trainerProfile?window.__trainerProfile:"general");}
function tutorialMode(){return typeof MODE!=="undefined"?Number(MODE):1;}
function tutorialStorageKey(){const version=typeof TUTORIAL_DB!=="undefined"&&TUTORIAL_DB.version?TUTORIAL_DB.version:2;
  /* Mode 1 keeps its original key so existing completions survive; other modes' scripts
     record progress under their own mode-scoped key. */
  const mode=tutorialMode();
  return mode===1?`ttm.tutorial.${tutorialProfileId()}.v${version}`:`ttm.tutorial.${tutorialProfileId()}.mode-${mode}.v${version}`;}
function tutorialFixedSeed(mode=tutorialMode()){return typeof TUTORIAL_SEEDS!=="undefined"?TUTORIAL_SEEDS[mode]:(mode===1?2601:undefined);}
function tutorialRunKey(){return `${tutorialProfileId()}|mode-${typeof MODE!=="undefined"?MODE:1}|${typeof DAYS!=="undefined"?DAYS:12}|${typeof DAILY!=="undefined"?DAILY:20000}|${typeof SEED!=="undefined"?SEED:0}`;}
function readTutorialProgress(){const fallback={introComplete:false,complete:false,step:0,runKey:null,generatedCreativeId:null,baseline:null,comparison:null,completedAt:null};
  try{if(typeof localStorage==="undefined")return fallback;const value=JSON.parse(localStorage.getItem(tutorialStorageKey())||"null");
    return value&&typeof value==="object"?{...fallback,...value,step:Math.max(0,Math.floor(Number(value.step)||0))}:fallback;}catch(e){return fallback;}}
function writeTutorialProgress(changes){const value={...readTutorialProgress(),...changes};
  try{if(typeof localStorage!=="undefined")localStorage.setItem(tutorialStorageKey(),JSON.stringify(value));}catch(e){}return value;}
function tutorialEligible(){return typeof MODE!=="undefined"&&!!tutorialFixedSeed(Number(MODE))&&tutorialActions().length>0;}
function tutorialRoot(){return typeof document!=="undefined"&&document.getElementById?document.getElementById("tutorialBox"):null;}
function tutorialEscape(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function tutorialQueryRequested(){try{return typeof location!=="undefined"&&new URLSearchParams(location.search||"").get("tutorial")==="1";}catch(e){return false;}}
function clearTutorialQuery(){try{if(typeof history==="undefined"||!history.replaceState)return;const params=new URLSearchParams(location.search||"");
  params.delete("tutorial");history.replaceState(null,"",params.toString()?`?${params.toString()}`:(location.pathname||""));}catch(e){}}
function tutorialActions(){
  if(typeof TUTORIAL_DB==="undefined")return [];
  const mode=tutorialMode();
  if(mode!==1)return TUTORIAL_DB.modes&&Array.isArray(TUTORIAL_DB.modes[mode])?TUTORIAL_DB.modes[mode]:[];
  return Array.isArray(TUTORIAL_DB.actions)?TUTORIAL_DB.actions:[];
}
function tutorialCurrent(){const progress=readTutorialProgress();return tutorialActions()[Math.min(progress.step,tutorialActions().length-1)]||null;}
function tutorialStepInstruction(step=tutorialCurrent()){const value=String(step?.instruction||"");
  const increase=typeof money==="function"&&typeof BUDGET_STEP!=="undefined"?`+${money(BUDGET_STEP)}`:"the plus-budget button";
  return value.replace("{budgetIncrease}",increase);}
function tutorialRequiredCreativeFormat(step=tutorialCurrent()){
  return tutorialIsActive()&&step?.kind==="creative_request"?String(step.format||""):"";
}
function tutorialIsActive(){if(!tutorialSessionActive||!tutorialEligible())return false;const progress=readTutorialProgress();
  return progress.introComplete&&!progress.complete&&progress.runKey===tutorialRunKey()&&progress.step<tutorialActions().length;}
function restoreTutorialSession(progress=readTutorialProgress()){
  tutorialSessionActive=!!(tutorialEligible()&&progress&&progress.introComplete&&!progress.complete&&
    progress.runKey===tutorialRunKey()&&progress.step<tutorialActions().length);
  return tutorialSessionActive;
}
function shouldStartTutorial(){const progress=readTutorialProgress();return tutorialEligible()&&(!progress.complete||progress.runKey!==tutorialRunKey());}
function clearTutorialFocus(){if(typeof document==="undefined"||!document.querySelectorAll)return;
  document.querySelectorAll(".tutorial-focus").forEach(el=>el.classList&&el.classList.remove("tutorial-focus"));
  if(document.body&&document.body.classList)document.body.classList.remove("tutorial-action-lock");}
function tutorialStepSelector(step=tutorialCurrent()){
  if(!step)return "";const targetIndex=tutorialTargetIndex(step.target);
  if(step.kind==="slot"&&targetIndex>=0)return `button[data-act="${step.action}"][data-i="${targetIndex}"]`;
  if(step.kind==="creative_request"){
    const commit=typeof document!=="undefined"&&document.getElementById?document.getElementById("creativeBuildContinue"):null;
    if(commit&&commit.dataset?.format===step.format)return "#creativeBuildContinue";
    return `button[data-format-id="${step.format}"]`;}
  if(step.kind==="creative_swap"&&targetIndex>=0){const generated=readTutorialProgress().generatedCreativeId,
      readyIndex=Array.isArray(S?.readyCreative)?S.readyCreative.findIndex(c=>c.id===generated):-1;
    if(readyIndex>=0){const shipSelector=`button[data-i="${readyIndex}"][data-j="${targetIndex}"]`;
      /* The ship button does not exist until the picker opens. Before that, point to the
         Replace creative control that opens it; once open, move the focus into the picker. */
      if(typeof document!=="undefined"&&document.querySelector&&document.querySelector(shipSelector))return shipSelector;}
    return `button[data-act="swap"][data-i="${targetIndex}"]`;}
  return step.focus?`#${step.focus}`:"";
}
function setTutorialFocus(target){clearTutorialFocus();if(!target||typeof document==="undefined"||!document.querySelector)return null;
  if(target==="pipeBox"){const drawer=document.getElementById("pipeDrawer");if(drawer)drawer.open=true;
    if(typeof Workspace!=="undefined"&&Workspace)Workspace.setSideView("systems",{persist:false});}
  else if(target==="accountBox"&&typeof Workspace!=="undefined"&&Workspace)Workspace.setSideView("systems",{persist:false});
  const selectors={slots:"#slots",runBtn:"#runBtn",viewBtn:"#viewBtn",pipeBox:"#pipeBox",accountBox:"#accountBox"};
  let el=null;try{el=document.querySelector(tutorialStepSelector())||document.querySelector(selectors[target]||`#${target}`);}catch(e){return null;}
  if(el&&typeof Workspace!=="undefined"&&Workspace)Workspace.revealElement(el);
  if(el&&el.classList)el.classList.add("tutorial-focus");
  const overlay=document.getElementById("overlay"),insideOverlay=!!(el&&overlay&&typeof overlay.contains==="function"&&overlay.contains(el)),
    overlayOpen=!!(overlay&&overlay.innerHTML);
  if(el&&(insideOverlay||!overlayOpen)){
    if(typeof el.focus==="function")el.focus({preventScroll:true});
    if(typeof el.scrollIntoView==="function")el.scrollIntoView({block:"center",inline:"nearest"});
  }
  if(document.body&&document.body.classList)document.body.classList.add("tutorial-action-lock");return el;}
function tutorialTargetIndex(target){if(!S||!Array.isArray(S.slots))return -1;
  if(target==="brand")return S.slots.findIndex(slot=>slot.c&&slot.c.brandPlay);
  if(target==="utility")return S.slots.findIndex(slot=>slot.c&&slot.c.id==="utility_a");
  if(target==="trap"){const current=S.slots.findIndex(slot=>slot.c&&slot.c.id==="trap_i");
    return current>=0?current:Number(readTutorialProgress().baseline?.slotIndex??-1);}
  if(target==="best"){let best=-1,bestRoi=-Infinity;S.slots.forEach((slot,index)=>{const roi=Number(slot?.last?.actualRoi);
    if(slot?.alive&&!slot.c?.brandPlay&&Number.isFinite(roi)&&roi>bestRoi){best=index;bestRoi=roi;}});return best;}
  if(target==="worst"){let worst=-1,worstRoi=Infinity;S.slots.forEach((slot,index)=>{const roi=Number(slot?.last?.actualRoi);
    if(slot?.alive&&!slot.c?.brandPlay&&Number.isFinite(roi)&&roi<worstRoi){worst=index;worstRoi=roi;}});return worst;}
  if(target==="tired"){
    /* Shipping the commissioned build resets the target's fatigue, so after the swap the
       "most fatigued" slot is a different one. Like Mode 1's trap target, resolve through
       the generated creative once it is installed so verification stays anchored. */
    const generated=readTutorialProgress().generatedCreativeId,
      installed=generated?S.slots.findIndex(slot=>slot?.c&&slot.c.id===generated):-1;
    if(installed>=0)return installed;
    let tired=-1,most=-Infinity;S.slots.forEach((slot,index)=>{const fatigue=Number(slot?.fatigue);
    if(slot?.alive&&!slot.c?.brandPlay&&Number.isFinite(fatigue)&&fatigue>most){tired=index;most=fatigue;}});return tired;}
  return -1;}
function tutorialActionMatches(step,kind,payload={}){if(!step)return false;
  if(kind==="creative_picker_open")return step.kind==="creative_request";
  if(kind==="creative_swap_open")return step.kind==="creative_swap"&&tutorialTargetIndex(step.target)===Number(payload.slotIndex);
  if(step.kind!==kind)return false;
  if(kind==="slot")return step.action===payload.action&&tutorialTargetIndex(step.target)===Number(payload.index);
  if(kind==="creative_request")return step.format===payload.format;
  if(kind==="creative_swap")return tutorialTargetIndex(step.target)===Number(payload.slotIndex)&&
    (!readTutorialProgress().generatedCreativeId||readTutorialProgress().generatedCreativeId===payload.creativeId);
  return true;}
function tutorialBeforeAction(kind,payload={}){if(!tutorialIsActive())return true;const step=tutorialCurrent();
  if(tutorialActionMatches(step,kind,payload)){tutorialLastNudge="";return true;}
  tutorialLastNudge=`Not yet. ${tutorialStepInstruction(step)}`;if(typeof playSfx==="function")playSfx("error",.35);renderTutorialCoach();return false;}
function tutorialClickAllowed(target){if(!tutorialIsActive()||!target||typeof target.closest!=="function")return true;
  /* Guidance locks competing simulation decisions, never navigation, reference material or
     player preferences. A player can pause, leave, change display/audio settings or start a
     different run without first completing the highlighted action. */
  if(target.closest("#tutorialBox,#guideOverlay,#audioPanel,#radioPanel,#learningMenu,.lorepop,.lore"))return true;
  if(target.closest("#menuBtn,#radioBtn,#audioBtn,#cardGuideBtn,#helpBtn,#loreBtn"))return true;
  if(typeof document!=="undefined"&&document.body?.classList?.contains("menu-overlay-open")&&
    target.closest("#modalCard,.game-menu-card"))return true;
  /* A walkthrough may limit game decisions, but it must never trap the player in a dialog. */
  if(target.closest("[data-modal-dismiss],#closeB,#menuDismiss,#wizardBack,#openingMenu,#openingBack,#openingSkip,#closeCardGuide"))return true;
  const selector=tutorialStepSelector();if(selector&&target.closest(selector))return true;
  const step=tutorialCurrent();
  if(step?.kind==="creative_request"){
    if(target.closest("#reqBtn"))return true;
    if(step.format&&target.closest(`summary[data-tutorial-format-group="${step.format}"]`))return true;
  }
  if(step?.kind==="creative_swap"){
    const targetIndex=tutorialTargetIndex(step.target);
    if(target.closest(`button[data-act="swap"][data-i="${targetIndex}"]`))return true;
  }
  return false;}
function gateTutorialClick(event){if(tutorialClickAllowed(event&&event.target))return;
  if(event&&typeof event.preventDefault==="function")event.preventDefault();
  if(event&&typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
  const step=tutorialCurrent(),nextNudge=`One action at a time. ${tutorialStepInstruction(step)||"Follow the highlighted control."}`,
    repeat=tutorialLastNudge===nextNudge,overlay=document.getElementById("overlay"),overlayOpen=!!(overlay&&overlay.innerHTML),
    status=overlayOpen?document.getElementById("modalStatus"):null;
  tutorialLastNudge=nextNudge;
  if(!repeat&&typeof playSfx==="function")playSfx("error",.25);
  if(status)status.textContent=nextNudge;else renderTutorialCoach();}
function tutorialAfterAction(kind,payload={}){if(!tutorialIsActive())return false;const step=tutorialCurrent();if(!tutorialActionMatches(step,kind,payload))return false;
  const progress=readTutorialProgress(),next=progress.step+1,changes={step:next};if(kind==="creative_request")changes.generatedCreativeId=payload.creativeId||null;
  if(step.id==="baseline"&&kind==="run"){
    const slotIndex=tutorialTargetIndex("trap"),last=slotIndex>=0?S.slots[slotIndex]?.last:null;
    changes.baseline={slotIndex,slotRoi:Number(last?.actualRoi)||0,slotCpl:last?.leads?last.spend/last.leads:0,
      accountRoi:S.spendTotal?(S.earnedRevenue-S.spendTotal)/S.spendTotal*100:0};
  }
  if(step.id==="comparison"&&kind==="run"){
    const slotIndex=Number(progress.baseline?.slotIndex??-1),last=slotIndex>=0?S.slots[slotIndex]?.last:null;
    changes.comparison={slotIndex,slotRoi:Number(last?.actualRoi)||0,slotCpl:last?.leads?last.spend/last.leads:0,
      accountRoi:S.spendTotal?(S.earnedRevenue-S.spendTotal)/S.spendTotal*100:0};
  }
  writeTutorialProgress(changes);tutorialLastNudge="";
  if(next>=tutorialActions().length)return completeTutorial("completed",true);
  if(typeof saveGame==="function")saveGame("tutorial-step",false);renderTutorialCoach();return true;}
function tutorialCoachLesson(){return tutorialCurrent()?.lessonId||"06";}
function wireTutorialLore(root){if(root&&typeof wireLore==="function")wireLore(root,{flavor:typeof ACTIVE_FLAVOR!=="undefined"?ACTIVE_FLAVOR:"",analogies:typeof analogiesEnabled==="function"?analogiesEnabled():true});}
function renderTutorialCoach(){const root=tutorialRoot();if(!root)return false;
  if(!tutorialIsActive()){
    /* The per-mode guided opening (below) shares this container; do not clear its coach. */
    if(typeof modeCoachIsActive==="function"&&modeCoachIsActive())return false;
    clearTutorialFocus();if(!readTutorialProgress().complete)root.innerHTML="";return false;}
  const progress=readTutorialProgress(),step=tutorialCurrent(),targetIndex=tutorialTargetIndex(step.target),targetText=targetIndex>=0?` · Slot ${targetIndex+1}`:"";
  root.innerHTML=`<div class="tutorial-coach" role="status"><div class="step">Step ${progress.step+1} of ${tutorialActions().length}${targetText} · ${tutorialEscape(step.title)}</div>
    <p>${tutorialEscape(step.body)}</p><div class="tutorial-instruction"><b>Do this now:</b> ${tutorialEscape(tutorialStepInstruction(step))}</div>
    ${tutorialLastNudge?`<div class="tutorial-nudge">${tutorialEscape(tutorialLastNudge)}</div>`:""}
    <div class="row"><button class="btn wide" type="button" id="tutorialLesson">Why this matters</button><button class="btn wide" type="button" id="tutorialMenu">Menu and options</button><button class="btn wide" type="button" id="tutorialEnd" title="Marks this walkthrough complete. You can replay it from the main menu.">End walkthrough · unlock all controls</button></div></div>`;
  wireTutorialLore(root);
  setTutorialFocus(step.focus);const lesson=document.getElementById("tutorialLesson"),menu=document.getElementById("tutorialMenu"),end=document.getElementById("tutorialEnd");
  if(lesson)lesson.onclick=()=>{const id=tutorialCoachLesson();if(tutorialProfileId()==="specialist"&&typeof specialistGuide==="function")specialistGuide(id);else if(typeof loreBook==="function")loreBook(id);};
  if(menu)menu.onclick=()=>{if(typeof mainMenu==="function")mainMenu({settingsOpen:true,focusId:"menuDismiss"});};
  if(end)end.onclick=()=>completeTutorial("ended",false);return true;}
function startTutorialIntro(force=false){if(!tutorialEligible()||!tutorialActions().length)return false;bindTutorialRefresh();const progress=readTutorialProgress(),key=tutorialRunKey();
  if(!force&&progress.complete&&progress.runKey===key)return false;
  tutorialSessionActive=true;
  writeTutorialProgress({introComplete:true,complete:false,step:force||progress.runKey!==key?0:progress.step,runKey:key,
    generatedCreativeId:force||progress.runKey!==key?null:progress.generatedCreativeId,
    baseline:force||progress.runKey!==key?null:progress.baseline,comparison:force||progress.runKey!==key?null:progress.comparison,completedAt:null});
  clearTutorialQuery();tutorialIntroActive=false;
  if(typeof markRunEntered==="function")markRunEntered();if(typeof saveGame==="function")saveGame("tutorial-start",false);
  if(document.body?.classList){document.body.classList.remove("tutorial-intro");void document.body.offsetWidth;document.body.classList.add("tutorial-intro");
    if(typeof setTimeout==="function")setTimeout(()=>document.body?.classList.remove("tutorial-intro"),1100);}
  return renderTutorialCoach();}
function finishTutorialIntro(){return startTutorialIntro(false);}
function completeTutorial(reason="completed",showNotice=true){clearTutorialFocus();clearTutorialQuery();tutorialIntroActive=false;tutorialSessionActive=false;
  writeTutorialProgress({introComplete:true,complete:true,step:tutorialActions().length,runKey:tutorialRunKey(),completedAt:new Date().toISOString()});
  const trainingAward=reason==="completed"&&typeof TrainingProgress!=="undefined"?TrainingProgress.completeTutorial("fundamentals-v2"):null;
  if(typeof saveGame==="function")saveGame(`tutorial-${reason}`,false);
  const root=tutorialRoot();if(!root)return true;if(!showNotice){root.innerHTML="";return true;}
  const progress=readTutorialProgress(),baseline=progress.baseline,comparison=progress.comparison,
    finalAccountRoi=S.spendTotal?(S.earnedRevenue-S.spendTotal)/S.spendTotal*100:0,
    comparisonLine=baseline&&comparison?`<div class="tutorial-comparison"><b>Your three-day check</b><span>Day 1 baseline · Original creative: ${baseline.slotRoi.toFixed(0)}% modeled slot ROI</span><span>Day 2 check · Replacement creative: ${comparison.slotRoi.toFixed(0)}% modeled slot ROI</span><span>Day 3 account result: ${finalAccountRoi.toFixed(0)}% all-in ROI</span><small>These are three observations under different conditions. Compare them, but do not assume the creative change caused every difference.</small></div>`:"";
  const windowDays=Math.max(1,tutorialActions().filter(step=>step.kind==="run").length),
    proofItems=tutorialMode()===2?["You separated earned value, the platform's claim and settled cash.","You funded an ad knowing its cash would arrive days after its spend.","You judged each day on both clocks instead of one number."]:
    tutorialMode()===3?["You ordered a replacement before the live creative needed it.","You carried a build through production and its review gate.","You replaced a tired creative without touching its slot or budget."]:
    tutorialMode()===4?["You gave every lane one comparable, unchanged day first.","You read how differently each lane reports before moving money.","You reallocated one small step at a time instead of chasing yesterday's best number."]:
    ["You measured a Day 1 baseline before changing the account.","You changed one variable at a time and compared the next result.","You increased spending only after you had evidence."];
  root.innerHTML=`<div class="tutorial-coach"><div class="step">Guided opening complete</div><p>The first ${windowDays===1?"day is":`${windowDays} days are`} complete and the full account is now open. The fixed teaching scenario ends here — from the next day forward, the account runs on live market conditions.</p>${comparisonLine}
    <div class="tutorial-comparison"><b>What you proved</b><ul style="grid-column:1/-1;margin:0;padding-left:18px">${proofItems.map(item=>`<li>${item}</li>`).join("")}</ul></div>
    ${typeof TrainingProgress!=="undefined"?TrainingProgress.awardMarkup(trainingAward):""}
    <div class="row"><button class="btn wide" type="button" id="tutorialDone">Continue independently</button></div></div>`;
  wireTutorialLore(root);
  const done=document.getElementById("tutorialDone");if(done)done.onclick=()=>{root.innerHTML="";const run=document.getElementById("runBtn");if(run&&run.focus)run.focus();};return true;}
function replayTutorial(){const mode=tutorialFixedSeed()?tutorialMode():1,p=new URLSearchParams(location.search);
  p.set("mode",String(mode));p.set("days",CONFIG_SPECS[mode].days);p.set("budget",CONFIG_SPECS[mode].budget);
  p.set("seed",String(tutorialFixedSeed(mode)||2601));p.set("tutorial","1");p.set("guided","1");p.set("brief","1");p.set("autostart","1");p.delete("resume");
  writeTutorialProgress({introComplete:false,complete:false,step:0,runKey:null,generatedCreativeId:null,baseline:null,comparison:null,completedAt:null});location.search=p.toString();return true;}
function tutorialAfterRender(){const coached=renderTutorialCoach();if(typeof renderModeCoach==="function")renderModeCoach();return coached;}

/* ---------------- per-mode guided openings (Modes 0, 2, 3, 4, 5) --------------------------
   Mode 1 has the deterministic Fundamentals script above and Agency Career carries its own
   model-specific walkthrough. Every other mode gets a first-time guided opening: staged
   Orient → Act → Observe steps that highlight and center one real on-screen control at a
   time. The coach is presentation-only — it draws no randomness, never mutates the
   simulation, never locks clicks and can always be ended. */
const MODE_COACH_DB=Object.freeze({
  0:Object.freeze({steps:Object.freeze([
    Object.freeze({title:"The 2017 search desk",body:"You manage one client's paid-search account under 2017 rules. The goal is the client's lead target — and enough trust to keep the account.",do:"Read the highlighted status strip. It tracks the clock, spend and the client relationship.",focus:"#strip",advance:"next"}),
    Object.freeze({title:"The ad groups",body:"Each highlighted card is an ad group: a keyword, its match type, your bid and the ads it runs. Quality Score splits into expected click-through rate, ad relevance and landing-page experience.",do:"Open the first ad-group card and find its keyword, bid and Quality Score.",focus:"#slots",advance:"next"}),
    Object.freeze({title:"The client",body:"Search results alone do not keep this account. The client panel tracks trust and commitments; observable cues tell you how this owner makes decisions.",do:"Find the highlighted client and account panel.",focus:"#accountBox",advance:"next"}),
    Object.freeze({title:"Run the first day",body:"Nothing improves until media runs. A day's results include impressions, clicks, cost and two separate lost-impression-share causes: rank and budget.",do:"Select the highlighted Run button to complete Day 1.",focus:"#runBtn",advance:"day"}),
    Object.freeze({title:"Read what happened",body:"The log records outcomes, not instructions. Lost to rank calls for bid or relevance work; lost to budget calls for more budget or tighter scope — opposite remedies.",do:"Read the day entry, then continue on your own.",focus:"#log",advance:"next"})
  ])}),
  2:Object.freeze({steps:Object.freeze([
    Object.freeze({title:"Four different clocks",body:"Earned value, platform claims, invoices and settled cash move on different schedules. This run is about keeping those clocks separate in your head.",do:"Read the highlighted status strip and find the cash figure.",focus:"#strip",advance:"next"}),
    Object.freeze({title:"The delivery board",body:"Ads earn modeled value the day they run — but that value is not cash yet, and the platform's claim about it is a third thing entirely.",do:"Look over the highlighted delivery slots.",focus:"#slots",advance:"next"}),
    Object.freeze({title:"The money panel",body:"Receivables age here. A delayed payment is not failed performance, and a platform claim is not cash you can spend.",do:"Find the highlighted account and money panel.",focus:"#accountBox",advance:"next"}),
    Object.freeze({title:"Run the first day",body:"Run one unchanged day to create a baseline before touching any budget.",do:"Select the highlighted Run button.",focus:"#runBtn",advance:"day"}),
    Object.freeze({title:"Watch the lag",body:"Compare what was earned today with what settled today. The gap is the lesson: finish at 40% all-in ROI while staying liquid the whole way.",do:"Read the day entry, then continue on your own.",focus:"#log",advance:"next"})
  ])}),
  3:Object.freeze({steps:Object.freeze([
    Object.freeze({title:"The pipeline is the game",body:"Creative builds take two to four days, and compliance can approve, request a revision or reject. Empty delivery caused by a missing replacement is an operations failure.",do:"Read the highlighted status strip.",focus:"#strip",advance:"next"}),
    Object.freeze({title:"Live slots wear out",body:"Every live creative fatigues. The question is never whether a replacement will be needed — only whether one is approved and ready when it is.",do:"Look over the highlighted delivery slots and find each creative's fatigue.",focus:"#slots",advance:"next"}),
    Object.freeze({title:"The production desk",body:"New builds are ordered from the production desk. A concept supports a finite set of useful controlled variations, so order replacements before you need them.",do:"Find the highlighted production panel.",focus:"#pipeBox",advance:"next"}),
    Object.freeze({title:"Run the first day",body:"Run one day and let the pipeline clock move. Builds and reviews advance only when time does.",do:"Select the highlighted Run button.",focus:"#runBtn",advance:"day"}),
    Object.freeze({title:"Check your coverage",body:"After each day, check what is aging and what is in review. Keep one approved replacement ahead of every fatiguing slot and 40% all-in ROI stays reachable.",do:"Read the day entry, then continue on your own.",focus:"#log",advance:"next"})
  ])}),
  4:Object.freeze({steps:Object.freeze([
    Object.freeze({title:"Four lanes, one account",body:"Each platform lane differs in demand source, auction, attention, capacity, settlement and attribution. None of them is the account.",do:"Read the highlighted status strip.",focus:"#strip",advance:"next"}),
    Object.freeze({title:"The lanes",body:"A locally winning ad or platform can coexist with an unhealthy account. Compare lanes before scaling any single card.",do:"Look over the highlighted platform lanes.",focus:"#slots",advance:"next"}),
    Object.freeze({title:"The account view",body:"The account rolls every lane into all-in economics. The objective is 25% all-in ROI across the whole account, not one lane's best day.",do:"Find the highlighted account panel.",focus:"#accountBox",advance:"next"}),
    Object.freeze({title:"Run the first day",body:"Run one unchanged day so every lane produces comparable evidence.",do:"Select the highlighted Run button.",focus:"#runBtn",advance:"day"}),
    Object.freeze({title:"Compare the lanes",body:"Read each lane's cost and outcome behavior. Move budget toward capacity that still has demand, not toward yesterday's best number.",do:"Read the day entry, then continue on your own.",focus:"#log",advance:"next"})
  ])}),
  5:Object.freeze({steps:Object.freeze([
    Object.freeze({title:"Six businesses, one cash pool",body:"Shared cash, credit, receivables and event-source clusters connect every advertiser workstream, even where their media ledgers stay separate.",do:"Read the highlighted status strip and find the shared liquidity position.",focus:"#strip",advance:"next"}),
    Object.freeze({title:"The workstreams",body:"Each highlighted row is one advertiser workstream. Open one to see its platform initiatives — a workstream can run several at once.",do:"Look over the highlighted workstreams and open one.",focus:"#slots",advance:"next"}),
    Object.freeze({title:"Mandates and gates",body:"Mandates are selected in 30-day blocks and judged at immutable gates. Passing three monthly reviews in a row is the win condition, alongside the profit target.",do:"Find the highlighted portfolio systems panel.",focus:"#accountBox",advance:"next"}),
    Object.freeze({title:"Run the first day",body:"Run one day before restructuring anything. The portfolio's problems will introduce themselves.",do:"Select the highlighted Run button.",focus:"#runBtn",advance:"day"}),
    Object.freeze({title:"Crises name their scope",body:"Every crisis declares what it touches: creative, account, event source, receivable, lead quality or liquidity. Solve the named layer instead of reworking everything at once.",do:"Read the day entry, then continue on your own.",focus:"#log",advance:"next"})
  ])})
});
let modeCoachActive=false,modeCoachStep=0,modeCoachStepDay=0;
function modeCoachMode(){return typeof MODE!=="undefined"?Number(MODE):-1;}
function modeCoachSteps(){return MODE_COACH_DB[modeCoachMode()]?.steps||null;}
function modeCoachKey(){return `ttm.coach.${tutorialProfileId()}.mode-${modeCoachMode()}.v1`;}
function modeCoachComplete(){try{return typeof localStorage!=="undefined"&&JSON.parse(localStorage.getItem(modeCoachKey())||"null")?.complete===true;}catch(e){return false;}}
function writeModeCoachComplete(){try{if(typeof localStorage!=="undefined")localStorage.setItem(modeCoachKey(),JSON.stringify({complete:true}));}catch(e){}}
function modeCoachIsActive(){return modeCoachActive&&!!modeCoachSteps();}
function startModeCoach(force=false){
  const steps=modeCoachSteps();if(!steps)return false;
  if(!force&&modeCoachComplete())return false;
  modeCoachActive=true;modeCoachStep=0;modeCoachStepDay=Number(typeof S!=="undefined"&&S?S.day:0)||0;
  bindTutorialRefresh();return renderModeCoach();
}
function endModeCoach(){
  modeCoachActive=false;writeModeCoachComplete();clearTutorialFocus();
  const root=tutorialRoot();if(root)root.innerHTML="";
  const run=typeof document!=="undefined"&&document.getElementById?document.getElementById("runBtn"):null;
  if(run&&typeof run.focus==="function")run.focus({preventScroll:true});return true;
}
function modeCoachFocus(target){
  clearTutorialFocus();
  if(!target||typeof document==="undefined"||!document.querySelector)return null;
  if((target==="#pipeBox"||target==="#accountBox")&&typeof Workspace!=="undefined"&&Workspace&&Workspace.setSideView)Workspace.setSideView("systems",{persist:false});
  let el=null;try{el=document.querySelector(target);}catch(e){return null;}
  if(!el)return null;
  if(typeof Workspace!=="undefined"&&Workspace&&Workspace.revealElement)Workspace.revealElement(el);
  if(el.classList)el.classList.add("tutorial-focus");
  const overlay=typeof document.getElementById==="function"?document.getElementById("overlay"):null;
  if(!(overlay&&overlay.innerHTML)&&typeof el.scrollIntoView==="function")el.scrollIntoView({block:"center",inline:"nearest"});
  return el;
}
function renderModeCoach(){
  if(!modeCoachIsActive())return false;
  const root=tutorialRoot(),steps=modeCoachSteps();
  if(!root||!steps||typeof S==="undefined"||!S){modeCoachActive=false;return false;}
  let step=steps[Math.min(modeCoachStep,steps.length-1)];
  if(step.advance==="day"&&Number(S.day)>modeCoachStepDay&&modeCoachStep<steps.length-1){
    modeCoachStep++;modeCoachStepDay=Number(S.day)||0;step=steps[Math.min(modeCoachStep,steps.length-1)];
  }
  const last=modeCoachStep>=steps.length-1;
  root.innerHTML=`<div class="tutorial-coach" role="status"><div class="step">Guided opening · Step ${modeCoachStep+1} of ${steps.length} · ${tutorialEscape(step.title)}</div>
    <p>${tutorialEscape(step.body)}</p><div class="tutorial-instruction"><b>Do this now:</b> ${tutorialEscape(step.do)}</div>
    <div class="row">${step.advance==="day"?"":`<button class="btn wide" type="button" id="modeCoachNext">${last?"Finish the walkthrough":"Continue"}</button>`}<button class="btn wide" type="button" id="modeCoachEnd" title="Ends this guided opening. You can keep playing normally.">End walkthrough</button></div></div>`;
  wireTutorialLore(root);
  modeCoachFocus(step.focus);
  const next=document.getElementById("modeCoachNext"),end=document.getElementById("modeCoachEnd");
  if(next)next.onclick=()=>{if(last){endModeCoach();return;}modeCoachStep++;modeCoachStepDay=Number(S.day)||0;renderModeCoach();};
  if(end)end.onclick=endModeCoach;
  return true;
}
function deferTutorialRefresh(){const refresh=()=>{try{renderTutorialCoach();if(typeof renderModeCoach==="function")renderModeCoach();}catch(e){}};if(typeof queueMicrotask==="function")queueMicrotask(refresh);else if(typeof setTimeout==="function")setTimeout(refresh,0);else refresh();}
function bindTutorialRefresh(){if(tutorialBound||typeof document==="undefined")return;tutorialBound=true;
  if(!tutorialClickGateBound&&typeof document.addEventListener==="function"){tutorialClickGateBound=true;document.addEventListener("click",gateTutorialClick,true);}
  const seed=document.getElementById("seedLbl");
  if(seed&&typeof MutationObserver!=="undefined"){tutorialObserver=new MutationObserver(()=>deferTutorialRefresh());tutorialObserver.observe(seed,{childList:true,characterData:true,subtree:true});}}
function initTutorial(options={}){bindTutorialRefresh();if(!tutorialEligible())return false;const force=options.force===true||tutorialQueryRequested();return startTutorialIntro(force);}
