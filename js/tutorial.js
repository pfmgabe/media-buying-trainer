"use strict";

/* Mode 1 onboarding is deliberately inline: guidance can be skipped, replayed, or ignored
   without locking any simulation control. Completion is local to the selected public profile. */
let tutorialIntroIndex=0,tutorialIntroActive=false,tutorialObserver=null,tutorialBound=false;

function tutorialProfileId(){
  return typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE?ACTIVE_PROFILE:
    (typeof window!=="undefined"&&window.__trainerProfile?window.__trainerProfile:"general");
}
function tutorialStorageKey(){
  const version=typeof TUTORIAL_DB!=="undefined"&&TUTORIAL_DB.version?TUTORIAL_DB.version:1;
  return `ttm.tutorial.${tutorialProfileId()}.v${version}`;
}
function readTutorialProgress(){
  const fallback={introComplete:false,complete:false};
  try{
    if(typeof localStorage==="undefined")return fallback;
    const value=JSON.parse(localStorage.getItem(tutorialStorageKey())||"null");
    return value&&typeof value==="object"?{
      introComplete:value.introComplete===true,
      complete:value.complete===true,
      completedAt:value.completedAt||null
    }:fallback;
  }catch(e){return fallback;}
}
function writeTutorialProgress(changes){
  const value={...readTutorialProgress(),...changes};
  try{if(typeof localStorage!=="undefined")localStorage.setItem(tutorialStorageKey(),JSON.stringify(value));}catch(e){}
  return value;
}
function tutorialEligible(){return typeof MODE!=="undefined"&&Number(MODE)===1;}
function tutorialRoot(){return typeof document!=="undefined"&&typeof document.getElementById==="function"?document.getElementById("tutorialBox"):null;}
function tutorialEscape(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function tutorialQueryRequested(){
  try{return typeof location!=="undefined"&&new URLSearchParams(location.search||"").get("tutorial")==="1";}catch(e){return false;}
}
function shouldStartTutorial(){return tutorialEligible()&&!readTutorialProgress().complete;}
function clearTutorialQuery(){
  try{
    if(typeof location==="undefined"||typeof history==="undefined"||!history.replaceState)return;
    const params=new URLSearchParams(location.search||"");if(!params.has("tutorial"))return;
    params.delete("tutorial");history.replaceState(null,"",params.toString()?`?${params.toString()}`:(location.pathname||""));
  }catch(e){}
}
function clearTutorialFocus(){
  if(typeof document==="undefined"||typeof document.querySelectorAll!=="function")return;
  document.querySelectorAll(".tutorial-focus").forEach(el=>el.classList&&el.classList.remove("tutorial-focus"));
}
function setTutorialFocus(target){
  clearTutorialFocus();if(!target||typeof document==="undefined"||typeof document.querySelector!=="function")return null;
  const selectors={
    account:"#strip",slots:"#slots","slot-0":"#slots .slot",
    controls:"#slots .slot .spendline, #slots .slot .row",run:"#runBtn",
    runBtn:"#runBtn",pipeBox:"#pipeBox",accountBox:"#accountBox"
  };
  let el=null;try{el=document.querySelector(selectors[target]||`#${target}`);}catch(e){return null;}
  if(el&&el.classList)el.classList.add("tutorial-focus");return el;
}
function removeTutorialIntroState(){
  tutorialIntroActive=false;clearTutorialFocus();
  if(typeof document!=="undefined"&&document.body&&document.body.classList)document.body.classList.remove("tutorial-intro");
}
function tutorialStepMarkup(step,index,total){
  const last=index>=total-1;
  return `<div class="tutorial-coach" role="status">
    <div class="step">Quick start · ${index+1}/${total} · ${tutorialEscape(step.title)}</div>
    <p>${tutorialEscape(step.body)}</p>
    <div class="row"><button class="btn wide" type="button" id="tutorialNext">${last?"Begin guided Day 1":"Next concept"}</button>
      <button class="btn wide" type="button" id="tutorialSkip">Skip tutorial</button></div>
  </div>`;
}
function renderTutorialIntro(){
  const root=tutorialRoot();
  if(!root||!tutorialEligible()||typeof TUTORIAL_DB==="undefined"||!Array.isArray(TUTORIAL_DB.reveal)||!TUTORIAL_DB.reveal.length)return false;
  tutorialIntroIndex=Math.max(0,Math.min(TUTORIAL_DB.reveal.length-1,tutorialIntroIndex));
  const step=TUTORIAL_DB.reveal[tutorialIntroIndex];
  root.innerHTML=tutorialStepMarkup(step,tutorialIntroIndex,TUTORIAL_DB.reveal.length);
  setTutorialFocus(step.target);
  const next=typeof document.getElementById==="function"?document.getElementById("tutorialNext"):null;
  const skip=typeof document.getElementById==="function"?document.getElementById("tutorialSkip"):null;
  if(next)next.onclick=()=>{
    if(tutorialIntroIndex<TUTORIAL_DB.reveal.length-1){tutorialIntroIndex++;renderTutorialIntro();}
    else finishTutorialIntro();
  };
  if(skip)skip.onclick=()=>completeTutorial("skipped",false);
  return true;
}
function startTutorialIntro(force=false){
  if(!tutorialEligible()||typeof TUTORIAL_DB==="undefined")return false;
  bindTutorialRefresh();
  const progress=readTutorialProgress();
  if(!force&&progress.complete)return false;
  if(!force&&progress.introComplete){renderTutorialCoach();return false;}
  tutorialIntroIndex=0;tutorialIntroActive=true;clearTutorialQuery();
  if(typeof document!=="undefined"&&document.body&&document.body.classList){
    document.body.classList.remove("tutorial-intro");
    /* Reading layout retriggers the ordered card entrance when tutorial replay is selected. */
    void document.body.offsetWidth;
    document.body.classList.add("tutorial-intro");
  }
  return renderTutorialIntro();
}
function finishTutorialIntro(){
  removeTutorialIntroState();writeTutorialProgress({introComplete:true,complete:false,completedAt:null});
  renderTutorialCoach();
}
function completeTutorial(reason="completed",showNotice=true){
  removeTutorialIntroState();writeTutorialProgress({introComplete:true,complete:true,completedAt:new Date().toISOString()});
  const root=tutorialRoot();if(!root)return true;
  if(!showNotice){root.innerHTML="";return true;}
  root.innerHTML=`<div class="tutorial-coach"><div class="step">Guided opening complete</div>
    <p>The first six decisions are covered. The remaining run is now open; use the same funnel-first reasoning without prompts.</p>
    <div class="row"><button class="btn wide" type="button" id="tutorialDone">Continue independently</button></div></div>`;
  const done=typeof document.getElementById==="function"?document.getElementById("tutorialDone"):null;if(done)done.onclick=()=>{root.innerHTML="";};
  return true;
}
function tutorialCoachLesson(day){
  const specialist=["05","04","00","02","01","04"];
  const general=["05","04","01","02","03","04"];
  return (tutorialProfileId()==="specialist"?specialist:general)[Math.max(0,Math.min(5,day-1))];
}
function renderTutorialCoach(){
  const root=tutorialRoot();if(!root)return false;
  if(!tutorialEligible()){removeTutorialIntroState();root.innerHTML="";return false;}
  if(tutorialIntroActive)return renderTutorialIntro();
  const progress=readTutorialProgress();
  if(progress.complete){clearTutorialFocus();root.innerHTML="";return false;}
  if(!progress.introComplete)return false;
  const configuredDays=typeof DAYS!=="undefined"?Math.max(1,Number(DAYS)||1):6;
  const finalGuidedDay=Math.min(6,configuredDays);
  const currentDay=typeof S!=="undefined"&&S&&Number.isFinite(Number(S.day))?Math.max(1,Math.floor(Number(S.day))):1;
  if(currentDay>finalGuidedDay)return completeTutorial("completed",true);
  if(typeof TUTORIAL_DB==="undefined"||!Array.isArray(TUTORIAL_DB.coach))return false;
  const step=TUTORIAL_DB.coach.find(item=>item.throughDay>=currentDay)||TUTORIAL_DB.coach[TUTORIAL_DB.coach.length-1];
  if(!step)return false;
  root.innerHTML=`<div class="tutorial-coach" role="status"><div class="step">Guided launch · Day ${currentDay} of ${finalGuidedDay} · ${tutorialEscape(step.title)}</div>
    <p>${tutorialEscape(step.body)}</p>
    <div class="row"><button class="btn wide" type="button" id="tutorialLesson">Open linked lesson</button>
      <button class="btn wide" type="button" id="tutorialEnd">End guidance</button></div></div>`;
  setTutorialFocus(step.focus);
  const lesson=typeof document.getElementById==="function"?document.getElementById("tutorialLesson"):null;
  const end=typeof document.getElementById==="function"?document.getElementById("tutorialEnd"):null;
  if(lesson)lesson.onclick=()=>{
    const id=tutorialCoachLesson(currentDay);
    if(tutorialProfileId()==="specialist"&&typeof specialistGuide==="function")specialistGuide(id);
    else if(typeof loreBook==="function")loreBook(id);
  };
  if(end)end.onclick=()=>completeTutorial("ended",false);
  return true;
}
function replayTutorial(){
  writeTutorialProgress({introComplete:false,complete:false,completedAt:null});
  return startTutorialIntro(true);
}
function tutorialAfterRender(){return renderTutorialCoach();}
function deferTutorialRefresh(){
  const refresh=()=>{try{renderTutorialCoach();}catch(e){}};
  if(typeof queueMicrotask==="function")queueMicrotask(refresh);
  else if(typeof setTimeout==="function")setTimeout(refresh,0);
  else refresh();
}
function bindTutorialRefresh(){
  if(tutorialBound||typeof document==="undefined"||typeof document.getElementById!=="function")return;tutorialBound=true;
  const run=document.getElementById("runBtn");
  if(run&&typeof run.addEventListener==="function")run.addEventListener("click",()=>{
    if(tutorialIntroActive)finishTutorialIntro();deferTutorialRefresh();
  });
  const seed=document.getElementById("seedLbl");
  if(seed&&typeof MutationObserver!=="undefined"){
    tutorialObserver=new MutationObserver(()=>deferTutorialRefresh());
    tutorialObserver.observe(seed,{childList:true,characterData:true,subtree:true});
  }
}
function initTutorial(options={}){
  bindTutorialRefresh();if(!tutorialEligible())return false;
  const force=options.force===true||tutorialQueryRequested();
  if(force)return startTutorialIntro(true);
  const progress=readTutorialProgress();
  if(!progress.complete&&!progress.introComplete)return startTutorialIntro(false);
  return renderTutorialCoach();
}
