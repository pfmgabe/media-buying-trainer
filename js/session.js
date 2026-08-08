"use strict";

const SAVE_SCHEMA=3,UI_SCHEMA=1;
let ACTIVE_PROFILE=(window.__trainerProfile&&PROFILE_DB[window.__trainerProfile])?window.__trainerProfile:"general";
let profileBooted=false;
/* Meaningful Day-1 decisions can happen before the first dollar is spent. Keep this
   navigation signal outside the model so it cannot alter simulation mechanics. */
let RUN_DIRTY=false,RUN_ENTERED=false;

function markRunDirty(){RUN_DIRTY=true;return true;}
function markRunEntered(entered=true){RUN_ENTERED=!!entered;return RUN_ENTERED;}
function markRunDirtyIfChanged(before,state=typeof S!=="undefined"?S:null){
  if(before===null||before===undefined||!state)return false;
  try{if(JSON.stringify(state)!==before)return markRunDirty();}catch(e){}
  return false;
}

function profileRecord(){return PROFILE_DB[ACTIVE_PROFILE]||PROFILE_DB.general;}
/* Runs are isolated by mode. The unsuffixed v3 key remains a last-run compatibility
   mirror so checkpoints created by earlier builds can be discovered and migrated. */
function profileStorageKey(kind,mode=MODE){
  return kind==="save"?`ttm.save.${ACTIVE_PROFILE}.mode-${mode}.v${SAVE_SCHEMA}`:
    `ttm.${kind}.${ACTIVE_PROFILE}.v${UI_SCHEMA}`;
}
function legacySaveStorageKey(profile=ACTIVE_PROFILE){return `ttm.save.${profile}.v${SAVE_SCHEMA}`;}
const DENSITY_LEVELS=Object.freeze(["guided","compact","analyst"]);
function readUiPrefs(){
  const fallback={tooltips:true,analogies:true,density:"guided"};
  try{const value=JSON.parse(localStorage.getItem(profileStorageKey("ui"))||"null");
    return value&&typeof value==="object"?{tooltips:value.tooltips!==false,analogies:value.analogies!==false,
      density:DENSITY_LEVELS.includes(value.density)?value.density:fallback.density}:fallback;
  }catch(e){return fallback;}
}
let UI_PREFS=readUiPrefs();
function analogiesEnabled(){return UI_PREFS.analogies!==false;}
function tooltipsEnabled(){return UI_PREFS.tooltips!==false;}
function densityLevel(){return DENSITY_LEVELS.includes(UI_PREFS.density)?UI_PREFS.density:"guided";}
function persistUiPrefs(){try{localStorage.setItem(profileStorageKey("ui"),JSON.stringify(UI_PREFS));}catch(e){}}
function unwrapLore(root=document){
  if(!root||typeof root.querySelectorAll!=="function")return;
  // Each generated wrapper represents exactly one original text node. Removing the wrapper
  // as a unit prevents repeated Definitions/density toggles from nesting inert spans forever.
  Array.from(root.querySelectorAll(".lore-text")).forEach(wrapper=>{
    if(typeof wrapper.replaceWith==="function"&&document.createTextNode)wrapper.replaceWith(document.createTextNode(wrapper.textContent||""));
  });
  Array.from(root.querySelectorAll(".lore")).forEach(el=>{
    if(typeof el.replaceWith==="function"&&document.createTextNode)el.replaceWith(document.createTextNode(el.textContent||""));
    else{el.removeAttribute&&el.removeAttribute("tabindex");el.removeAttribute&&el.removeAttribute("role");el.removeAttribute&&el.removeAttribute("aria-expanded");}
  });
}
function syncFormatTitles(root=document){
  if(!root||typeof root.querySelectorAll!=="function")return;
  if(!tooltipsEnabled()){
    Array.from(root.querySelectorAll(".format-badge[title]")).forEach(el=>{
      const value=el.getAttribute&&el.getAttribute("title");
      if(value&&el.setAttribute)el.setAttribute("data-format-title",value);
      if(el.removeAttribute)el.removeAttribute("title");
    });
    return;
  }
  Array.from(root.querySelectorAll(".format-badge[data-format-title]")).forEach(el=>{
    const value=el.getAttribute&&el.getAttribute("data-format-title");
    if(value&&el.setAttribute)el.setAttribute("title",value);
    if(el.removeAttribute)el.removeAttribute("data-format-title");
  });
}
function applyUiPrefs(rewire=true){
  const body=document.body;if(body&&body.classList){body.classList.toggle("tooltips-off",!tooltipsEnabled());body.classList.toggle("analogies-off",!analogiesEnabled());
    if(body.dataset)body.dataset.density=densityLevel();}
  const tips=document.getElementById("tipsBtn"),analogy=document.getElementById("analogyBtn"),density=document.getElementById("densitySelect");
  if(tips){tips.textContent=`Definitions ${tooltipsEnabled()?"on":"off"}`;tips.setAttribute&&tips.setAttribute("aria-pressed",String(tooltipsEnabled()));}
  if(analogy){analogy.textContent=`Analogies ${analogiesEnabled()?"on":"off"}`;analogy.setAttribute&&analogy.setAttribute("aria-pressed",String(analogiesEnabled()));}
  if(density)density.value=densityLevel();
  if(!tooltipsEnabled()){if(typeof hidePop==="function")hidePop();unwrapLore(document);}
  else if(rewire&&typeof wireLore==="function")wireLore(document);
  syncFormatTitles(document);
}
function setTooltips(on){UI_PREFS={...UI_PREFS,tooltips:!!on};persistUiPrefs();applyUiPrefs(false);
  if(typeof render==="function"&&profileBooted&&typeof S!=="undefined"&&S)render();
  applyUiPrefs();return UI_PREFS.tooltips;}
function setAnalogies(on){UI_PREFS={...UI_PREFS,analogies:!!on};persistUiPrefs();applyUiPrefs(false);
  if(typeof writeOnboardingPrefs==="function")writeOnboardingPrefs({analogies:UI_PREFS.analogies});
  if(typeof render==="function"&&profileBooted&&typeof S!=="undefined"&&S)render();return UI_PREFS.analogies;}
function setDensity(level){const next=DENSITY_LEVELS.includes(level)?level:"guided";
  UI_PREFS={...UI_PREFS,density:next};persistUiPrefs();applyUiPrefs(false);
  if(typeof writeOnboardingPrefs==="function")writeOnboardingPrefs({guidance:next});
  // Density changes the intended glossary-link density. Rebuild existing wrappers so a
  // Guided surface can show every definition and Compact/Analyst can return to one per scope.
  if(tooltipsEnabled())unwrapLore(document);
  if(typeof render==="function"&&profileBooted&&typeof S!=="undefined"&&S)render();
  applyUiPrefs();return densityLevel();}
function activateProfile(profile){
  ACTIVE_PROFILE=PROFILE_DB[profile]?profile:"general";window.__trainerProfile=ACTIVE_PROFILE;
  UI_PREFS=readUiPrefs();
  if(document.body&&document.body.dataset){document.body.dataset.profile=ACTIVE_PROFILE;document.body.dataset.mode=String(MODE);}
  const guideButton=document.getElementById("loreBtn");if(guideButton)guideButton.textContent=ACTIVE_PROFILE==="specialist"?"Account Playbook":"Field Guide";
  if(typeof TrainingProgress!=="undefined"&&TrainingProgress)TrainingProgress.activate(ACTIVE_PROFILE);
  applyUiPrefs(false);return profileRecord();
}

function structurallyValidSave(item,profile,requestedMode){
    const mode=item&&Number(item.mode),days=item&&Number(item.days),budget=item&&Number(item.budget),seed=item&&Number(item.seed);
    return item&&item.schema===SAVE_SCHEMA&&item.profile===profile&&Number.isInteger(mode)&&mode>=0&&mode<=6&&
      (requestedMode===undefined||mode===requestedMode)&&
      Number.isFinite(days)&&days>0&&Number.isFinite(budget)&&budget>0&&validSeed(seed)&&
      item.state&&typeof item.state==="object";
}
function normalizedSaveRecord(item){return item?{...item,mode:Number(item.mode),stage:item.stage==null?null:Number(item.stage),
  days:Number(item.days),budget:Number(item.budget),seed:Number(item.seed)}:null;}
function saveRecord(profile=ACTIVE_PROFILE,requestedMode=MODE){
  const mode=Number.isInteger(Number(requestedMode))?Number(requestedMode):MODE;
  const key=`ttm.save.${profile}.mode-${mode}.v${SAVE_SCHEMA}`;
  let item=null,legacy=null,canonicalRaw=null;
  try{canonicalRaw=localStorage.getItem(key);item=JSON.parse(canonicalRaw||"null");}catch(e){return null;}
  if(structurallyValidSave(item,profile,mode))return normalizedSaveRecord(item);
  // A present-but-invalid canonical checkpoint must fail closed. Falling back here could
  // resurrect a stale compatibility mirror after corruption or a partial write.
  if(canonicalRaw!==null)return null;
  try{legacy=JSON.parse(localStorage.getItem(legacySaveStorageKey(profile))||"null");}catch(e){}
  if(!structurallyValidSave(legacy,profile,mode))return null;
  // Copy, never delete: older published builds may still rely on the legacy key.
  const normalized=normalizedSaveRecord(legacy);try{localStorage.setItem(key,JSON.stringify(normalized));}catch(ignore){}
  return normalized;
}
function saveGame(source="manual",notify=true){
  if(!profileBooted||typeof S==="undefined"||!S)return false;
  let snapshot=S;
  if(MODE===6&&typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.export==="function"){
    try{snapshot=AgencyCareer.export()||S;}catch(e){snapshot=S;}
  }
  const record={schema:SAVE_SCHEMA,creativeTaxonomy:2,profile:ACTIVE_PROFILE,mode:MODE,stage:MODE===0?CLASSIC_STAGE:null,
    days:DAYS,budget:DAILY,seed:SEED,flavor:ACTIVE_FLAVOR,savedAt:new Date().toISOString(),
    source,dirty:currentRunHasProgress(),state:JSON.parse(JSON.stringify(snapshot)),
    trainingRun:typeof TrainingProgress!=="undefined"?TrainingProgress.currentRunRecord():null};
  if(typeof readTutorialProgress==="function"&&typeof tutorialRunKey==="function"){
    const tutorial=readTutorialProgress();if(tutorial&&tutorial.runKey===tutorialRunKey())record.tutorial=JSON.parse(JSON.stringify(tutorial));
  }
  try{
    const serialized=JSON.stringify(record);
    localStorage.setItem(profileStorageKey("save",MODE),serialized);
    // Compatibility mirror for older releases. New releases never use it when a
    // mode-specific checkpoint exists, so changing modes cannot overwrite a run.
    try{localStorage.setItem(legacySaveStorageKey(),serialized);}catch(ignore){}
  }
  catch(e){return false;}
  if(notify){playSfx("save",.55);addLog(`<div><b class="pos">Checkpoint saved.</b> This run can resume on this browser.</div>`,"structure");render();}
  return true;
}
function autoCheckpoint(){
  if(!profileBooted||typeof S==="undefined"||!S)return false;
  return currentRunHasProgress()?saveGame("auto",false):false;
}
function compatibleAgencyCareerState(state){
  if(!state||state.engine!=="agency-career")return false;
  if(typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.validate==="function"){
    try{return AgencyCareer.validate(state)===true;}catch(e){return false;}
  }
  return Number.isFinite(Number(state.day))&&Number.isFinite(Number(state.month))&&
    Number.isFinite(Number(state.cash))&&Number.isFinite(Number(state.cumulativeProfit))&&
    typeof state.businessModel==="string"&&Array.isArray(state.clients)&&
    state.telemetry&&typeof state.telemetry==="object";
}
function compatibleSave(record){
  if(!record||record.profile!==ACTIVE_PROFILE||record.mode!==MODE||Number(record.days)!==DAYS||
      Number(record.budget)!==DAILY||Number(record.seed)!==SEED||!record.state||typeof record.state!=="object"||
      !Number.isFinite(Number(record.state.day)))return false;
  if(MODE===6)return compatibleAgencyCareerState(record.state);
  if(MODE===0)return record.stage===CLASSIC_STAGE&&record.state.classic===true&&
    Array.isArray(record.state.groups)&&record.state.groups.length===4&&record.state.client&&
    typeof record.state.client==="object"&&record.state.telemetry&&typeof record.state.telemetry==="object";
  if(MODE===5)return record.state.engine==="nightmare"&&Array.isArray(record.state.accounts)&&
    record.state.accounts.length>0&&Array.isArray(record.state.pixels)&&record.state.finance&&
    typeof record.state.finance==="object"&&Array.isArray(record.state.finance.receivables)&&
    Array.isArray(record.state.finance.creditHolds)&&Array.isArray(record.state.crises)&&
    Array.isArray(record.state.months)&&record.state.telemetry&&typeof record.state.telemetry==="object";
  return !record.state.classic&&record.state.engine!=="nightmare"&&Array.isArray(record.state.slots)&&
    record.state.slots.length>0&&record.state.slots.every(slot=>slot&&typeof slot==="object"&&
      slot.c&&typeof slot.c==="object"&&Array.isArray(slot.hist))&&Array.isArray(record.state.pending)&&
    Array.isArray(record.state.queue)&&record.state.telemetry&&typeof record.state.telemetry==="object";
}
function terminalCheckpoint(state=S){
  if(!state||typeof state!=="object")return false;
  if(MODE===6)return state.engine==="agency-career"&&state.ended===true;
  if(MODE===5)return state.engine==="nightmare"&&state.ended===true;
  if(MODE===0)return state.classic===true&&Number(state.day)>DAYS;
  return MODE>=1&&MODE<=4&&Number(state.day)>DAYS;
}
function reopenTerminalDebrief(){
  if(!terminalCheckpoint())return false;
  if(MODE===6&&typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.debrief==="function"){
    const result=AgencyCareer.debrief(S),markup=typeof result==="string"?result:
      result&&typeof result.html==="string"?result.html:"";
    if(markup&&typeof show==="function")show(markup,"structure",{wide:true});
    if(typeof AgencyCareer.afterDebriefRendered==="function")AgencyCareer.afterDebriefRendered();
    return true;
  }
  if(MODE===5&&typeof NightmareEngine!=="undefined"&&typeof NightmareEngine.debrief==="function"){
    NightmareEngine.debrief();return true;
  }
  if(MODE===0&&typeof classicDebrief==="function"){classicDebrief();return true;}
  if(MODE>=1&&MODE<=4&&typeof debrief==="function"){debrief();return true;}
  return false;
}
function reopenPendingInteraction(){
  if(MODE===6&&typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.reopenPending==="function")
    return AgencyCareer.reopenPending();
  if(MODE===0&&typeof reopenClassicInteraction==="function"&&S?.classic&&S.client?.pendingEncounter)
    return reopenClassicInteraction();
  return false;
}
function restoreSavedState(record){
  if(!compatibleSave(record))return false;
  const previous=S;
  try{
    S=JSON.parse(JSON.stringify(record.state));
    /* v3 saves predate the expanded creative taxonomy. Most old IDs remain unambiguous;
       `static` is the one collision, so mark it before the new catalog can change a replay. */
    if(Number(record.creativeTaxonomy)!==2){
      const preserveStatic=creative=>{if(creative&&creative.format==="static")creative.format="static_legacy";};
      if(Array.isArray(S.slots))S.slots.forEach(slot=>preserveStatic(slot&&slot.c));
      if(Array.isArray(S.readyCreative))S.readyCreative.forEach(preserveStatic);
      if(Array.isArray(S.requests))S.requests.forEach(request=>preserveStatic(request&&request.c));
      if(Array.isArray(S.accounts))S.accounts.forEach(account=>preserveStatic(account&&account.creative));
    }
    S.seedShown=SEED;
    if(MODE>=1&&MODE<=4&&!S.rng)S.rng={event:0,creative:0};
    if(MODE===5&&typeof NightmareEngine!=="undefined"&&typeof NightmareEngine.hydrate==="function")NightmareEngine.hydrate(S);
    if(MODE===6&&typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.hydrate==="function"){
      const hydrated=AgencyCareer.hydrate(S);if(hydrated&&typeof hydrated==="object")S=hydrated;
    }
    if(typeof TrainingProgress!=="undefined"&&TrainingProgress)TrainingProgress.restoreRun(record.trainingRun,
      {mode:MODE,stage:MODE===0?CLASSIC_STAGE:null,seed:SEED,days:DAYS,budget:DAILY,savedAt:record.savedAt});
    if(record.tutorial&&typeof writeTutorialProgress==="function"&&typeof tutorialRunKey==="function"&&record.tutorial.runKey===tutorialRunKey()){
      writeTutorialProgress(record.tutorial);if(typeof restoreTutorialSession==="function")restoreTutorialSession(record.tutorial);
    }else if(typeof restoreTutorialSession==="function")restoreTutorialSession(null);
    if(record.flavor&&typeof setFlavor==="function")setFlavor(record.flavor,{persist:true,updateUrl:false,rerender:false});
    RUN_DIRTY=record.dirty===true||stateHasRecordedProgress(S,MODE);markRunEntered();
    render();if(typeof renderTutorialCoach==="function")renderTutorialCoach();
    if(!reopenPendingInteraction())reopenTerminalDebrief();
    return true;
  }catch(e){
    S=previous;
    try{if(S)render();}catch(ignore){}
    return false;
  }
}
function savedSearch(record){
  const p=new URLSearchParams();p.set("mode",record.mode);if(record.mode===0)p.set("stage",record.stage||1);
  p.set("days",record.days);p.set("budget",record.budget);p.set("seed",record.seed);p.set("flavor",record.flavor||ACTIVE_FLAVOR);p.set("resume","1");
  return p.toString();
}
function resumeSavedGame(){
  const record=saveRecord();if(!record)return false;
  if(!compatibleSave(record)){location.search=savedSearch(record);return true;}
  const ok=restoreSavedState(record),pending=(MODE===0&&!!S?.client?.pendingEncounter)||
    (MODE===6&&!!S?.pendingInteraction);
  if(ok&&!pending&&!terminalCheckpoint()&&typeof close==="function"){
    close();if(typeof deferTutorialRefresh==="function")deferTutorialRefresh();
  }return ok;
}
function resumeRequested(){return new URLSearchParams(location.search).get("resume")==="1";}
function clearResumeQuery(){const p=new URLSearchParams(location.search);p.delete("resume");
  if(typeof history!=="undefined"&&history.replaceState)history.replaceState(null,"",p.toString()?`?${p.toString()}`:location.pathname||"");}

function careerProgressLabel(state){
  const rawMonth=Number(state&&state.month),rawDay=Number(state&&state.day);
  const monthIndex=Math.max(0,Math.min(120,Number.isFinite(rawMonth)?Math.floor(rawMonth):
    Math.floor((Math.max(1,rawDay||1)-1)/20)));
  if(monthIndex>=120)return "campaign complete · 2027";
  const year=2017+Math.floor(monthIndex/12),monthInYear=(monthIndex%12)+1;
  const dayInMonth=Math.max(1,Math.min(20,Number(state&&state.dayInMonth)||(((Math.max(1,rawDay||1)-1)%20)+1)));
  return `year ${year} · month ${monthInYear}/12 · workday ${dayInMonth}/20`;
}

/* This is presentation state only. It translates each engine's live state into the same
   five orientation questions without advancing time, drawing RNG or changing a save. */
let PLAYER_CONTEXT_HOOKED=false,PLAYER_TUTORIAL_CONTEXT_HOOKED=false;
function playerContextTutorialActive(mode=MODE){
  if(Number(mode)!==1)return false;
  try{if(typeof tutorialIsActive==="function"&&tutorialIsActive())return true;}catch(e){}
  try{return new URLSearchParams(location.search||"").get("tutorial")==="1";}catch(e){return false;}
}
function playerContextTerminal(state,mode=MODE){
  if(!state||typeof state!=="object")return false;
  if(Number(mode)>=5)return state.ended===true;
  const period=Number(mode)===0&&typeof CLASSIC_DAYS!=="undefined"?CLASSIC_DAYS:
    (typeof DAYS!=="undefined"?DAYS:RUN_DAYS);
  return Number(state.day)>Number(period);
}
function playerContextDay(state,period){return Math.max(1,Math.min(Number(period)||1,Math.floor(Number(state?.day)||1)));}
function playerContextCap(value){const text=String(value||"");return text?text.charAt(0).toUpperCase()+text.slice(1):text;}
function playerContextAgencyCounts(state){
  const active=Array.isArray(state?.clients)?state.clients.filter(client=>client&&client.status==="active"):[];
  return {critical:active.filter(client=>client.incident?.critical).length,
    due:active.filter(client=>Number(state.day)>=Number(client.nextDue)).length};
}
function playerContextModel(state=typeof S!=="undefined"?S:null,mode=MODE){
  const id=Number(mode),spec=MODE_REGISTRY[id]||MODE_REGISTRY[1],tutorial=playerContextTutorialActive(id),
    terminal=playerContextTerminal(state,id),
    period=id===0&&typeof CLASSIC_DAYS!=="undefined"?CLASSIC_DAYS:(typeof DAYS!=="undefined"?DAYS:RUN_DAYS),
    day=playerContextDay(state,period),modeName=String(spec.title||"").split(/\s+\u2014\s+/)[0]||spec.scopeTitle,win=spec.objective;
  let type=modeRunTypeLabel(id,tutorial),progress=id===6?playerContextCap(careerProgressLabel(state)):`Day ${day} of ${period}`;
  let phase="Account setup",objective=spec.objective,next="Finish the setup, then enter the command center.",nextView="overview",nextPanel="actions";

  if(!state||typeof state!=="object")return {type,mode:modeName,progress:"Run setup",phase:"Preparing the board",objective,next,nextView,nextPanel,win};
  if(terminal)return {type,mode:modeName,progress:id===6?progress:`${period}-day run complete`,phase:"Run complete",
    objective:"Review what worked, what failed and whether the run met its win condition.",
    next:"Open the debrief, then save the result or choose another run.",nextView:"history",nextPanel:"activity",win};

  if(tutorial){
    let step=null,stepNumber=1,stepTotal=0;
    try{step=typeof tutorialCurrent==="function"?tutorialCurrent():null;
      const saved=typeof readTutorialProgress==="function"?readTutorialProgress():null;
      stepNumber=Math.max(1,(Number(saved?.step)||0)+1);stepTotal=typeof tutorialActions==="function"?tutorialActions().length:0;
    }catch(e){}
    phase=stepTotal?`Guided action ${Math.min(stepNumber,stepTotal)} of ${stepTotal}`:"Guided opening";
    objective=step?.title||"Complete the current guided action and watch what changes.";
    next=step&&typeof tutorialStepInstruction==="function"?tutorialStepInstruction(step):"Follow the highlighted control.";
    return {type,mode:modeName,progress,phase,objective,next,nextView,nextPanel,win};
  }

  if(id===0){
    const stage=typeof CSTAGE_NAME!=="undefined"&&CSTAGE_NAME[state.stage]?CSTAGE_NAME[state.stage]:"Client account";
    phase=state.client?.pendingEncounter?"Client conversation":stage;
    objective=state.client?.pendingEncounter?
      "Protect client trust by addressing the open conversation without losing sight of the account evidence.":
      "Reach the period lead goal while keeping client trust above the retention line.";
    next=state.client?.pendingEncounter?"Choose a response in the open client conversation.":
      Number(state.spendTotal)>0?"Review search terms, Quality Score and client commitments. Make one evidence-based change, then run the day.":
      "Read the client brief. Then inspect search terms and Quality Score before running Day 1.";
  }else if(id>=1&&id<=4){
    const pixel=state.pixel||{},hasResults=Number(state.spendTotal)>0;
    phase=({1:hasResults?"Daily optimization":"Baseline setup",2:"Cash-flow review",3:"Creative pipeline review",4:"Cross-platform review"})[id];
    objective=({
      1:"Improve all-in business ROI while keeping the funnel evidence clear.",
      2:"Protect business return while separating earned value from value that has not settled yet.",
      3:"Protect business return and keep approved creative ready before live ads wear out.",
      4:"Improve account-level return without overloading one platform lane or mistaking an ad win for an account win."
    })[id];
    if(pixel.status==="degraded"){nextView="finance";next=pixel.diagnosed?
      "Repair the pixel to restore future reporting, or use account totals before changing delivery.":
      "Diagnose the pixel before using reported ad results to change delivery.";}
    else if(id===1)next=hasResults?
      "Compare the account goal with each slot's evidence. Change one lever if needed, then run the day.":
      "Read each slot's purpose, then run Day 1 to establish a baseline.";
    else if(id===2)next="Compare modeled value, unsettled value and settled value. Then change one allocation or run the day.";
    else if(id===3){
      const ready=Array.isArray(state.readyCreative)?state.readyCreative.length:0,
        building=Array.isArray(state.requests)?state.requests.length:0,
        fatigue=Array.isArray(state.slots)?Math.max(0,...state.slots.map(slot=>Number(slot?.fatigue)||0)):0;
      next=ready&&fatigue>=60?"A live ad is tiring and approved creative is ready. Compare the cards, then replace the creative if the evidence supports the move.":
        !ready&&!building?"Check live-ad fatigue, then request a creative format before the pipeline runs empty.":
        "Check live-ad fatigue and the build queue. Swap, request or run the day based on the evidence.";
    }else next="Compare lane capacity, concentration and card-level evidence. Change one lever if needed, then run the day.";
    if(id===3&&pixel.status!=="degraded")nextView="growth";else if(id===4&&pixel.status!=="degraded")nextView="board";
  }else if(id===5){
    const crises=Array.isArray(state.crises)?state.crises.length:0,gate=Math.max(1,Math.ceil(day/30));
    phase=crises?"Crisis response":`Acquisition gate ${gate}`;
    objective=crises?"Resolve the open crisis queue without sacrificing the portfolio's liquidity or strongest workstreams.":
      "Build the next acquisition gate while keeping return, measurement, liquidity and concentration healthy.";
    next=crises?`Open the Crisis queue and resolve the highest-risk ticket before advancing time. ${crises} ${crises===1?"ticket is":"tickets are"} open.`:
      "Inspect the day preview, cash, credit and concentration. Then advance to the next decision.";
    if(crises){nextView="overview";nextPanel="actions";}
  }else if(id===6){
    const affiliate=state.businessModel==="affiliate",counts=playerContextAgencyCounts(state),focus=Math.max(0,Number(state.focusRemaining)||0),
      funnels=Array.isArray(state.affiliate?.funnels)?state.affiliate.funnels:[],hot=funnels.filter(funnel=>funnel.pausedDays||funnel.complianceHeat>65).length,
      liquidity=typeof AgencyCareer!=="undefined"&&AgencyCareer&&typeof AgencyCareer.liquidityStatus==="function"?AgencyCareer.liquidityStatus(state):null;
    const agencyGuidedStart=!affiliate&&state.month===0&&state.tutorialStep<4;
    if(agencyGuidedStart)type="Career guide";
    phase=affiliate?"Owned-funnel operations":agencyGuidedStart?`Guided start · step ${state.tutorialStep+1} of 4`:state.month===0?"Month 1: Keep the founding client":"Client agency operations";
    objective=affiliate?"Grow owned-funnel profit through 2027 while protecting cash, compliance and platform resilience.":
      state.month===0?"Keep the founding client through Month 1 by protecting trust, account health and service cadence.":
      "Grow cumulative agency profit through 2027 without exceeding team capacity or losing client quality.";
    if(!affiliate&&state.month===0&&state.tutorialStep===0){nextView="board";next="Show me the founding client.";}
    else if(!affiliate&&state.month===0&&state.tutorialStep===1){nextView="board";next="Complete routine service for the founding client.";}
    else if(!affiliate&&state.month===0&&state.tutorialStep===2){nextView="board";next="Review what changed, then continue to today's plan.";}
    else if(!affiliate&&state.month===0&&state.tutorialStep===3){nextView="overview";next="Use remaining focus if it helps, then end the workday.";}
    else if(state.pendingInteraction?.type==="end-day"){nextView="board";next="Resolve a critical or due account, or confirm that the workday will end with the stated risk.";}
    else if(!affiliate&&counts.critical){nextView="board";next=`Service the highest-priority critical account before ending the workday. ${counts.critical} critical ${counts.critical===1?"issue needs":"issues need"} attention.`;}
    else if(!affiliate&&counts.due){nextView="board";next=`Service ${counts.due} due ${counts.due===1?"account":"accounts"} before ending the workday.`;}
    else if(affiliate&&hot){nextView="board";next=`Review the ${hot} paused or high-heat ${hot===1?"funnel":"funnels"} before ending the workday.`;}
    else if(liquidity&&liquidity.id!=="healthy"){nextView="finance";next=`Open Finance and review the ${liquidity.label.toLowerCase()} before ending the workday.`;}
    else next=focus?"Use the remaining focus on operations, people, systems or growth. Then end the workday.":"End the workday, then review the next day's priorities.";
  }
  return {type,mode:modeName,progress,phase,objective,next,nextView,nextPanel,win};
}
function updatePlayerContext(){
  if(typeof document==="undefined"||!document.getElementById)return null;
  const model=playerContextModel(),fields={runType:model.type,runModeName:model.mode,runProgress:model.progress,
    runPhase:model.phase,runNext:model.next,runObjective:model.objective,runWinCondition:model.win};
  for(const [id,value] of Object.entries(fields)){const node=document.getElementById(id);if(node)node.textContent=value;}
  const root=document.getElementById("runContext");if(root){root.hidden=false;if(root.dataset){root.dataset.nextView=model.nextView||"overview";root.dataset.nextPanel=model.nextPanel||"actions";}root.setAttribute&&root.setAttribute("aria-label",
    `${model.type}: ${model.mode}. ${model.progress}. ${model.phase}. Immediate objective: ${model.objective} Next move: ${model.next} Win condition: ${model.win}`);
    if(typeof tooltipsEnabled==="function"&&tooltipsEnabled()&&typeof wireLore==="function")wireLore(root);}
  if(typeof Workspace!=="undefined"&&Workspace&&typeof Workspace.updateNavigation==="function")Workspace.updateNavigation();
  return model;
}
function installPlayerContextHook(){
  if(!PLAYER_CONTEXT_HOOKED&&typeof updateFlavorChrome==="function"){
    const updateFlavor=updateFlavorChrome;
    updateFlavorChrome=function(...args){const result=updateFlavor.apply(this,args);updatePlayerContext();return result;};
    PLAYER_CONTEXT_HOOKED=true;
  }
  if(!PLAYER_TUTORIAL_CONTEXT_HOOKED&&typeof renderTutorialCoach==="function"){
    const renderCoach=renderTutorialCoach;
    renderTutorialCoach=function(...args){const result=renderCoach.apply(this,args);updatePlayerContext();return result;};
    PLAYER_TUTORIAL_CONTEXT_HOOKED=true;
  }
  updatePlayerContext();return PLAYER_CONTEXT_HOOKED;
}
if(typeof document!=="undefined"&&typeof document.addEventListener==="function")
  document.addEventListener("DOMContentLoaded",installPlayerContextHook,{once:true});
else if(typeof setTimeout==="function")setTimeout(installPlayerContextHook,0);

function stateHasRecordedProgress(state=typeof S!=="undefined"?S:null,mode=MODE){
  if(!state||typeof state!=="object")return false;
  if(mode===6)return state.day>1||state.month>0||state.cumulativeProfit!==0||
    state.focusRemaining<state.focusTotal||state.cash!==state.startReserve||
    state.telemetry?.accountsOperated>0||state.telemetry?.clientsAccepted>0||state.telemetry?.clientsRejected>0||
    state.telemetry?.clientUpdates>0||state.telemetry?.staffHired>0||state.telemetry?.staffReleased>0||
    state.telemetry?.techUnlocked>0||state.telemetry?.pivoted===true;
  return state.day>1||Number(state.spendTotal)>0||Number(state.opsCost)>0;
}
function currentRunHasProgress(state=typeof S!=="undefined"?S:null,mode=MODE){
  return !!(state&&typeof state==="object"&&((state===S&&RUN_DIRTY)||stateHasRecordedProgress(state,mode)));
}
function checkpointBeforeNavigation(source="before-navigation",returnAction,force=false){
  if(!force&&!currentRunHasProgress())return true;
  if(saveGame(source,false))return true;
  show(`<div class="eyebrow">Checkpoint needed</div><h2>We could not save this run</h2>
    <div class="prose"><p>Your browser blocked local storage. To The Moon kept this run open so you would not lose your decisions.</p></div>
    <div class="row"><button class="btn wide" id="closeB" type="button">Back without leaving</button></div>`,"structure",{learning:false,menu:true});
  const back=document.getElementById("closeB");if(back)back.onclick=typeof returnAction==="function"?returnAction:mainMenu;
  return false;
}
function compactSaveProgress(record){
  if(!record||!record.state)return "";
  if(record.mode===6)return careerProgressLabel(record.state);
  const day=Math.max(1,Math.min(record.days,(Number(record.state.day)||1)-1));
  return `day ${day} of ${record.days}`;
}
function saveSummaryMarkup(record){
  if(!record)return `<div class="note">No saved checkpoint exists for this mode yet.</div>`;
  const label=MODE_NAME[record.mode]||`Mode ${record.mode}`,day=Math.max(1,Math.min(record.days,(record.state.day||1)-1));
  let when="saved locally";try{when=new Date(record.savedAt).toLocaleString();}catch(e){}
  if(record.mode===6){
    const model=record.state.businessModel==="affiliate"?"Affiliate scaling engine":"Client agency";
    const won=["win","won","victory"].includes(String(record.state.outcome||"").toLowerCase());
    const result=record.state.ended?` · ${won?"career target cleared":"career concluded"}`:"";
    return `<div class="save-summary"><div><b>Saved career</b><span>${label}</span></div><div><b>Progress</b><span>${careerProgressLabel(record.state)}${result}</span></div>
      <div><b>Business</b><span>${model} · career profit ${money(Number(record.state.cumulativeProfit)||0)}</span></div>
      <div><b>Setup</b><span>${money(record.budget)} starting reserve · Scenario ${record.seed}</span></div><div><b>Checkpoint</b><span>${when}</span></div></div>`;
  }
  return `<div class="save-summary"><div><b>Saved run</b><span>${label}</span></div><div><b>Progress</b><span>through day ${day} of ${record.days}</span></div>
    <div><b>Setup</b><span>${money(record.budget)}/day · Scenario ${record.seed}</span></div><div><b>Checkpoint</b><span>${when}</span></div></div>`;
}
function mainMenu(options={}){
  const record=saveRecord(),progressed=currentRunHasProgress(),terminal=terminalCheckpoint();
  const onboarding=typeof readOnboardingPrefs==="function"?readOnboardingPrefs():{tutorial:true};
  const activeRun=progressed||terminal||RUN_ENTERED,firstRun=!record&&!activeRun;
  const day=typeof S!=="undefined"&&S?Math.max(1,Math.min(DAYS,(S.day||1)-1)):1;
  const currentProgress=MODE===6&&typeof S!=="undefined"&&S?careerProgressLabel(S):`day ${day} of ${DAYS}`;
  const primaryLabel=terminal?"Review results":activeRun?"Return to run":record?`Resume ${MODE_SCOPE_TITLE[record.mode]}`:firstRun?"Begin":"Choose a challenge";
  const primaryNote=terminal?MODE_NAME[MODE]:activeRun?`${MODE_NAME[MODE]} · ${currentProgress}`:record?
    `${MODE_NAME[record.mode]} · ${compactSaveProgress(record)}`:onboarding.tutorial?"Guided Fundamentals · one step at a time":"Choose the kind of account you want to run";
  let savedWhen="";if(record)try{savedWhen=new Date(record.savedAt).toLocaleString();}catch(e){savedWhen="saved on this browser";}
  const trainingInfo=typeof TrainingProgress!=="undefined"?TrainingProgress.summary():null;
  show(`<div class="title-screen">
    ${activeRun?'<button class="menu-dismiss" id="menuDismiss" type="button" aria-label="Close menu">×</button>':""}
    <div class="title-screen-art" aria-hidden="true"></div>
    <section class="title-screen-content">
      <div class="title-screen-state">Main menu</div>
      <h2>To The Moon</h2>
      <p class="title-screen-product">PFM Media Buying Trainer</p>
      <p class="title-screen-promise">Practice media buying by setting budgets, changing ads and seeing what happens next.</p>
      <button class="menu-hero-action" id="continueRun" type="button"><span>${primaryLabel}</span><small>${primaryNote}</small></button>
      <div class="title-tutorial-switch"><span><b>Guided start</b><small>${onboarding.tutorial?"The game introduces one decision at a time.":"Setup and briefings stay short."}</small></span>
        <button class="btn" id="tutorialToggle" type="button" role="switch" aria-checked="${onboarding.tutorial}" aria-label="Turn the guided start ${onboarding.tutorial?"off":"on"}">${onboarding.tutorial?"On":"Off"}</button></div>
      ${record&&!progressed?`<p class="title-save-note">Saved on this browser · ${savedWhen}</p>`:""}
    </section>
    <details class="title-screen-drawer" ${options.settingsOpen?"open":""}><summary>New run, Field Guide and settings</summary>
      <div class="title-screen-drawer-body">
        <div class="title-screen-links">
          <button class="btn" id="openSetup" type="button">${activeRun||record?"Start a new run":"Choose another challenge"}</button>
          <button class="btn" id="openGuide" type="button">${ACTIVE_PROFILE==="specialist"?"Account playbook":"Field Guide"}</button>
          ${trainingInfo?`<button class="btn" id="openTrainingProgress" type="button">Training progress · ${trainingInfo.totalXp.toLocaleString("en-US")} XP</button>`:""}
        </div>
        <div class="title-settings">
        <button class="btn" id="menuTips" type="button" aria-pressed="${tooltipsEnabled()}">Definitions ${tooltipsEnabled()?"on":"off"}</button>
        <button class="btn" id="menuAnalogies" type="button" aria-pressed="${analogiesEnabled()}">Analogies ${analogiesEnabled()?"on":"off"}</button>
        <label>On-screen detail<select id="menuDensity">${DENSITY_LEVELS.map(level=>`<option value="${level}" ${level===densityLevel()?"selected":""}>${({guided:"Detailed",compact:"Standard",analyst:"Expert"})[level]}</option>`).join("")}</select></label>
        <button class="btn" id="openSound" type="button">Sound controls</button>
        ${activeRun?'<button class="btn" id="saveNow" type="button">Save checkpoint now</button>':""}
        ${firstRun?"":'<button class="btn" id="replayTutorial" type="button">Save this run and restart Fundamentals</button>'}
        </div>
      </div>
    </details>
  </div>`,"structure",{learning:false,definitions:true,menu:true});
  const primary=document.getElementById("continueRun");if(primary)primary.onclick=()=>{
    if(terminal){close();if(!reopenPendingInteraction())reopenTerminalDebrief();return;}
    if(activeRun){close();reopenPendingInteraction();return;}
    if(record){resumeSavedGame();return;}
    if(typeof setupWizard==="function")setupWizard({origin:"title",tutorial:onboarding.tutorial,starter:firstRun&&onboarding.tutorial},onboarding.tutorial?"lens":"intent");
  };
  const dismiss=document.getElementById("menuDismiss");if(dismiss)dismiss.onclick=()=>{
    if(terminal){close();if(!reopenPendingInteraction())reopenTerminalDebrief();return;}close();reopenPendingInteraction();
  };
  const setup=document.getElementById("openSetup");if(setup)setup.onclick=()=>setupWizard({origin:"menu",tutorial:onboarding.tutorial},onboarding.tutorial?"lens":"intent");
  const tutorialToggle=document.getElementById("tutorialToggle");if(tutorialToggle)tutorialToggle.onclick=()=>{
    if(typeof writeOnboardingPrefs==="function")writeOnboardingPrefs({tutorial:!onboarding.tutorial});mainMenu({...options,focusId:"tutorialToggle"});};
  const guide=document.getElementById("openGuide");if(guide)guide.onclick=()=>ACTIVE_PROFILE==="specialist"?specialistGuide():loreBook();
  if(typeof TrainingProgress!=="undefined")TrainingProgress.bindMenuTrigger();
  const reopenSettings=focusId=>mainMenu({...options,settingsOpen:true,focusId});
  const tips=document.getElementById("menuTips");if(tips)tips.onclick=()=>{setTooltips(!tooltipsEnabled());reopenSettings("menuTips");};
  const analogies=document.getElementById("menuAnalogies");if(analogies)analogies.onclick=()=>{setAnalogies(!analogiesEnabled());reopenSettings("menuAnalogies");};
  const density=document.getElementById("menuDensity");if(density)density.onchange=()=>{setDensity(density.value);reopenSettings("menuDensity");};
  const sound=document.getElementById("openSound");if(sound)sound.onclick=()=>{
    if(typeof setAudioPanel==="function")setAudioPanel(true,false,sound);
  };
  const save=document.getElementById("saveNow");if(save)save.onclick=()=>{if(!checkpointBeforeNavigation("manual",()=>mainMenu(options),true))return;playSfx("save",.55);reopenSettings("saveNow");};
  const replay=document.getElementById("replayTutorial");if(replay)replay.onclick=()=>{
    if(!checkpointBeforeNavigation("before-tutorial-replay",()=>mainMenu(options)))return;
    close();if(typeof replayTutorial==="function")replayTutorial();};
  const focusTarget=options.focusId?document.getElementById(options.focusId):null;if(focusTarget&&typeof focusTarget.focus==="function")focusTarget.focus();
}

function cardAnatomyRows(){
  if(MODE===6)return [
    ["Career clock","The campaign advances through representative workdays from 2017 to 2027. Each month closes the operating statement, invoices clients or settles affiliate payouts, and checks liquidity separately from recognized profit."],
    ["Client seat","A client seat is one retained business relationship, not one platform ad account. A client may own several campaigns or platform accounts while consuming one of the agency's 75 available seats."],
    ["Service need","The service schedule estimates how often this account needs meaningful hands-on work. Due work, unresolved account problems and relationship pressure raise priority; stable accounts remain in the roster without demanding attention every day."],
    ["Trust and account health","Trust measures the client's willingness to continue the relationship. Account health summarizes delivery, lead or order quality, tracking, and execution. Strong media results can coexist with weak trust, and vice versa."],
    ["Capacity and context load","Focus units represent the team's daily operating bandwidth. Extra verticals, buying disciplines and difficult account types create context-switching load. Hiring, systems or specialization can reduce that context load."],
    ["Client economics","Retainers and earned bonuses are agency revenue; client media budget is not. Payroll, tools, servicing, credits, and acquisition costs determine agency profit, while invoice timing determines cash."],
    ["Prospective clients","Compare each prospective client's fee, workload, business model, vertical, channel fit and payment terms. Accepting every prospect can fill all 75 client slots while making the agency less profitable and harder to operate."],
    ["Technology tree","Unlocked capabilities change which clients, channels, systems, and specialization benefits are available. Paid search can remain the core strategy; adjacent branches are choices, not mandatory upgrades."],
    ["Agency-wide decisions","Hiring, sales pace, operating policy, positioning, and reserves affect the whole roster. They trade current cash against future capacity, prospect quality, and resilience."],
    ["Affiliate pivot","An eligible agency can irreversibly exchange client retainers for owned funnel economics. Cash, staff, skills, systems, reputation, and career profit carry forward, but payout delays, clawbacks, compliance exposure, and platform concentration replace client-management risk."],
    ["Victory ledger","The 2027 result uses cumulative agency-wide profit and liquidity, not client ad spend or platform-reported return. A profitable-looking book can still fail if payroll or collections exhaust cash."]
  ];
  if(MODE===0)return [
    ["Identity","The campaign and ad-group names locate the object you are editing. Every control below stays inside that ad group unless it explicitly says it changes campaign structure."],
    ["Client relationship","Client trust combines results, judgment, transparency, responsiveness, and alignment; client tension is a separate short-term pressure signal. Business type is only an uncertain starting clue. Observable reactions progressively sharpen the Client Read. Evidence and sound account operations still outrank style matching, and recorded working agreements must be completed."],
    ["Keyword, match & bid","The keyword states intended demand, and match type controls which real queries may trigger it. The maximum cost-per-click (CPC) bid sets the auction ceiling. Changing the bid does not improve the ad or Quality Score."],
    ["Search-ad preview","The display URL identifies the destination. Headline 1 / Headline 2 and Description 1 / Description 2 are labeled separately, so the exact authored copy stays visible. Historical Expanded Text Ads also show their extra fields. Variant tabs only change which ad you inspect."],
    ["Three different copy actions","Rewrite replaces the lead ad with substantially different wording. A/B permutation keeps its core message but changes one labeled variable. Expanded Text Ad adds the longer two-headline format used in this historical stage."],
    ["Quality Score diagnostic","The 1 to 10 score summarizes expected click-through rate, ad relevance and landing-page experience at keyword level. Read the three components to diagnose the weak layer; it is not a key performance indicator or a literal auction input."],
    ["Delivery evidence","Impressions, clicks, cost per click (CPC), conversion rate, reported conversions and impression share describe the last run. They do not guarantee the next result."],
    ["Two rank losses","Lost to rank calls for bid or relevance work. Lost to budget calls for more budget or tighter scope; they require opposite remedies."],
    ["Rotation & optimization","Active sibling ads rotate evenly in To The Moon. Pause or retire one test from its preview. The ad-group Pause control stops the keyword and every ad in that group."],
    ["Landing page & structure","A landing-page pass changes destination experience. Move group creates a dedicated campaign and, in later stages, independent pacing without pretending the copy improved."]
  ];
  if(MODE===5)return [
    ["Scope","Advertiser workstream, business objective, platform initiative, vertical, and event-source cluster identify exactly what the card controls."],
    ["What needs attention now","The suggested next move, daily allocation, learning progress, lane limits and platform hierarchy show what deserves attention."],
    ["Economics","Media spend becomes modeled outcome value in the business ledger. A platform claim is separate. Modeled marketing efficiency ratio (MER) divides modeled outcome value by media spend for the same period."],
    ["Delivery path","The selected buying lane changes both delivery and the evidence shown. Search emphasizes cost per click (CPC) and finite query demand. Social and demand-generation lanes emphasize cost per 1,000 impressions (CPM), click-through rate (CTR), conversion rate (CVR) and creative fatigue. Connected TV emphasizes view-through evidence."],
    ["Creative","Social and programmatic cards show the concept, format, rarity and fatigue."],
    ["Search setup","Search cards instead show the bid, Quality Score and negative keywords."],
    ["Controls","Allocation changes spend authorization; lane controls change the initiative; creative, search, event-source, and audit actions each affect a different layer."],
    ["Workstream summary","The collapsed row combines sibling platform initiatives for one advertiser so you can scan risk before opening the detailed cards."]
  ];
  return [
    ["Identity","Slot and platform identify the delivery position. The ad is the delivery object; the named creative is the message it carries."],
    ["Concept, format & rarity","Concept is the repeatable idea, format is its execution, and rarity is a simulated upside tier. They are separate performance dimensions."],
    ["Delivery baseline","Cost per 1,000 impressions (CPM) is the price of reach. Click-through rate (CTR) is ad response. Conversion rate (CVR) is modeled leads divided by ad clicks. Landing-page click-through rate (LP CTR) separately measures on-page action among landing visits. Earnings per lead (EPL) is modeled value per lead."],
    ["Fatigue and saturation","Fatigue is one creative wearing out. Saturation is the reachable audience ceiling at the current setup; replacing creative only resets fatigue. Channel Command also shows a platform-level capacity pool shared by active slots in that lane."],
    ["Outcome & landing branches","Impressions produce ad clicks, and ad clicks produce modeled leads. Reporting is a separate layer. Landing visits and on-page actions form a parallel landing-page diagnostic. Landing-page click-through rate does not create a lead and is not multiplied into conversion rate."],
    ["Economics","Modeled slot ROI uses modeled value. Attributed ad ROI uses platform-creditable value. Account ROI also includes operating costs and is not an average of card ROIs."],
    ["Allocation & actions","Minus and plus change daily allocation. Create one controlled variation, Rewrite geo wording, Change presenter, Improve landing-page step, Replace creative and Stop this ad each change a different named layer."]
  ];
}
function showCardAnatomy(){
  const rows=cardAnatomyRows().map(([label,copy])=>`<div><b>${label}</b><span>${copy}</span></div>`).join("");
  show(`<div class="eyebrow">Card anatomy · ${MODE_NAME[MODE]}</div><h2>How to read a card</h2>
    <div class="prose"><p>First, identify what the card controls. Next, read the result that needs attention. Then inspect the supporting numbers. Underlined terms open definitions; Expert detail shows the most data.</p></div>
    <div class="card-anatomy">${rows}</div><div class="row"><button class="btn wide" id="closeCardGuide" type="button">Back to To The Moon</button></div>`,"structure",{wide:true});
  const button=document.getElementById("closeCardGuide");if(button)button.onclick=close;
}

const tipsButton=document.getElementById("tipsBtn"),analogyButton=document.getElementById("analogyBtn"),menuButton=document.getElementById("menuBtn"),densitySelect=document.getElementById("densitySelect"),cardGuideButton=document.getElementById("cardGuideBtn"),learningCloseButton=document.getElementById("learningCloseBtn");
if(tipsButton)tipsButton.addEventListener("click",()=>setTooltips(!tooltipsEnabled()));
if(analogyButton)analogyButton.addEventListener("click",()=>setAnalogies(!analogiesEnabled()));
if(densitySelect)densitySelect.addEventListener("change",()=>setDensity(densitySelect.value));
if(learningCloseButton)learningCloseButton.addEventListener("click",()=>{const menu=document.getElementById("learningMenu");if(menu)menu.open=false;const summary=menu&&menu.querySelector?menu.querySelector("summary"):null;if(summary&&typeof summary.focus==="function")summary.focus();});
if(menuButton)menuButton.addEventListener("click",mainMenu);
if(cardGuideButton)cardGuideButton.addEventListener("click",showCardAnatomy);
