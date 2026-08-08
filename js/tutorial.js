"use strict";

/* The Fundamentals tutorial is a verified action script, not a slideshow. Its progress is
   presentation state stored by run fingerprint, so it cannot alter simulation RNG or metrics. */
let tutorialObserver=null,tutorialBound=false,tutorialLastNudge="",tutorialIntroActive=false,tutorialClickGateBound=false,
  tutorialSessionActive=false;

function tutorialProfileId(){return typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE?ACTIVE_PROFILE:
  (typeof window!=="undefined"&&window.__trainerProfile?window.__trainerProfile:"general");}
function tutorialStorageKey(){const version=typeof TUTORIAL_DB!=="undefined"&&TUTORIAL_DB.version?TUTORIAL_DB.version:2;
  return `ttm.tutorial.${tutorialProfileId()}.v${version}`;}
function tutorialRunKey(){return `${tutorialProfileId()}|mode-${typeof MODE!=="undefined"?MODE:1}|${typeof DAYS!=="undefined"?DAYS:12}|${typeof DAILY!=="undefined"?DAILY:20000}|${typeof SEED!=="undefined"?SEED:0}`;}
function readTutorialProgress(){const fallback={introComplete:false,complete:false,step:0,runKey:null,generatedCreativeId:null,baseline:null,comparison:null,completedAt:null};
  try{if(typeof localStorage==="undefined")return fallback;const value=JSON.parse(localStorage.getItem(tutorialStorageKey())||"null");
    return value&&typeof value==="object"?{...fallback,...value,step:Math.max(0,Math.floor(Number(value.step)||0))}:fallback;}catch(e){return fallback;}}
function writeTutorialProgress(changes){const value={...readTutorialProgress(),...changes};
  try{if(typeof localStorage!=="undefined")localStorage.setItem(tutorialStorageKey(),JSON.stringify(value));}catch(e){}return value;}
function tutorialEligible(){return typeof MODE!=="undefined"&&Number(MODE)===1;}
function tutorialRoot(){return typeof document!=="undefined"&&document.getElementById?document.getElementById("tutorialBox"):null;}
function tutorialEscape(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function tutorialQueryRequested(){try{return typeof location!=="undefined"&&new URLSearchParams(location.search||"").get("tutorial")==="1";}catch(e){return false;}}
function clearTutorialQuery(){try{if(typeof history==="undefined"||!history.replaceState)return;const params=new URLSearchParams(location.search||"");
  params.delete("tutorial");history.replaceState(null,"",params.toString()?`?${params.toString()}`:(location.pathname||""));}catch(e){}}
function tutorialActions(){return typeof TUTORIAL_DB!=="undefined"&&Array.isArray(TUTORIAL_DB.actions)?TUTORIAL_DB.actions:[];}
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
  if(step.kind==="creative_request")return `button[data-format-id="${step.format}"]`;
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
  if(target.closest("#tutorialBox,#guideOverlay,#audioPanel,.lorepop,.lore"))return true;
  /* A walkthrough may limit game decisions, but it must never trap the player in a dialog. */
  if(target.closest("[data-modal-dismiss],#closeB,#menuDismiss,#wizardBack,#openingBack,#openingSkip,#closeCardGuide"))return true;
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
  if(!tutorialIsActive()){clearTutorialFocus();if(!readTutorialProgress().complete)root.innerHTML="";return false;}
  const progress=readTutorialProgress(),step=tutorialCurrent(),targetIndex=tutorialTargetIndex(step.target),targetText=targetIndex>=0?` · Slot ${targetIndex+1}`:"";
  root.innerHTML=`<div class="tutorial-coach" role="status"><div class="step">Step ${progress.step+1} of ${tutorialActions().length}${targetText} · ${tutorialEscape(step.title)}</div>
    <p>${tutorialEscape(step.body)}</p><div class="tutorial-instruction"><b>Do this now:</b> ${tutorialEscape(tutorialStepInstruction(step))}</div>
    ${tutorialLastNudge?`<div class="tutorial-nudge">${tutorialEscape(tutorialLastNudge)}</div>`:""}
    <div class="row"><button class="btn wide" type="button" id="tutorialLesson">Why this matters</button><button class="btn wide" type="button" id="tutorialEnd" title="Marks this walkthrough complete. You can replay it from the main menu.">End walkthrough · unlock all controls</button></div></div>`;
  wireTutorialLore(root);
  setTutorialFocus(step.focus);const lesson=document.getElementById("tutorialLesson"),end=document.getElementById("tutorialEnd");
  if(lesson)lesson.onclick=()=>{const id=tutorialCoachLesson();if(tutorialProfileId()==="specialist"&&typeof specialistGuide==="function")specialistGuide(id);else if(typeof loreBook==="function")loreBook(id);};
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
  root.innerHTML=`<div class="tutorial-coach"><div class="step">Guided opening complete</div><p>The first three days are complete. The full account is now open.</p>${comparisonLine}
    <div class="tutorial-comparison"><b>What you proved</b><ul style="grid-column:1/-1;margin:0;padding-left:18px"><li>You measured a Day 1 baseline before changing the account.</li><li>You changed one variable at a time and compared the next result.</li><li>You increased spending only after you had evidence.</li></ul></div>
    ${typeof TrainingProgress!=="undefined"?TrainingProgress.awardMarkup(trainingAward):""}
    <div class="row"><button class="btn wide" type="button" id="tutorialDone">Continue independently</button></div></div>`;
  wireTutorialLore(root);
  const done=document.getElementById("tutorialDone");if(done)done.onclick=()=>{root.innerHTML="";const run=document.getElementById("runBtn");if(run&&run.focus)run.focus();};return true;}
function replayTutorial(){const p=new URLSearchParams(location.search);p.set("mode","1");p.set("days",CONFIG_SPECS[1].days);p.set("budget",CONFIG_SPECS[1].budget);
  p.set("seed",typeof TUTORIAL_SEED!=="undefined"?TUTORIAL_SEED:2601);p.set("tutorial","1");p.set("guided","1");p.set("brief","1");p.set("autostart","1");p.delete("resume");
  writeTutorialProgress({introComplete:false,complete:false,step:0,runKey:null,generatedCreativeId:null,baseline:null,comparison:null,completedAt:null});location.search=p.toString();return true;}
function tutorialAfterRender(){return renderTutorialCoach();}
function deferTutorialRefresh(){const refresh=()=>{try{renderTutorialCoach();}catch(e){}};if(typeof queueMicrotask==="function")queueMicrotask(refresh);else if(typeof setTimeout==="function")setTimeout(refresh,0);else refresh();}
function bindTutorialRefresh(){if(tutorialBound||typeof document==="undefined")return;tutorialBound=true;
  if(!tutorialClickGateBound&&typeof document.addEventListener==="function"){tutorialClickGateBound=true;document.addEventListener("click",gateTutorialClick,true);}
  const seed=document.getElementById("seedLbl");
  if(seed&&typeof MutationObserver!=="undefined"){tutorialObserver=new MutationObserver(()=>deferTutorialRefresh());tutorialObserver.observe(seed,{childList:true,characterData:true,subtree:true});}}
function initTutorial(options={}){bindTutorialRefresh();if(!tutorialEligible())return false;const force=options.force===true||tutorialQueryRequested();return startTutorialIntro(force);}
