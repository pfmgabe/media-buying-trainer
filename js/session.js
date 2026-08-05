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
  if(tips){tips.textContent=`Definitions ${tooltipsEnabled()?"ON":"OFF"}`;tips.setAttribute&&tips.setAttribute("aria-pressed",String(tooltipsEnabled()));}
  if(analogy){analogy.textContent=`Analogies ${analogiesEnabled()?"ON":"OFF"}`;analogy.setAttribute&&analogy.setAttribute("aria-pressed",String(analogiesEnabled()));}
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
  const badge=document.getElementById("profileBadge");if(badge)badge.textContent=profileRecord().badge+" TRACK";
  const guideButton=document.getElementById("loreBtn");if(guideButton)guideButton.textContent=ACTIVE_PROFILE==="specialist"?"Account Playbook":"Field Guide";
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
    source,dirty:currentRunHasProgress(),state:JSON.parse(JSON.stringify(snapshot))};
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
  if(notify){playSfx("settle",.55);addLog(`<div><b class="pos">Checkpoint saved</b> — this ${profileRecord().label} run can resume on this browser.</div>`,"structure");render();}
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
    <div class="prose"><p>The browser declined local storage, so the trainer kept the current run open instead of navigating away and risking your decisions.</p></div>
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
  if(!record)return `<div class="note">No browser-local checkpoint exists for this training track yet.</div>`;
  const label=MODE_NAME[record.mode]||`Mode ${record.mode}`,day=Math.max(1,Math.min(record.days,(record.state.day||1)-1));
  let when="saved locally";try{when=new Date(record.savedAt).toLocaleString();}catch(e){}
  if(record.mode===6){
    const model=record.state.businessModel==="affiliate"?"Affiliate scaling engine":"Client agency";
    const won=["win","won","victory"].includes(String(record.state.outcome||"").toLowerCase());
    const result=record.state.ended?` · ${won?"career target cleared":"career concluded"}`:"";
    return `<div class="save-summary"><div><b>Saved career</b><span>${label}</span></div><div><b>Progress</b><span>${careerProgressLabel(record.state)}${result}</span></div>
      <div><b>Business</b><span>${model} · career profit ${money(Number(record.state.cumulativeProfit)||0)}</span></div>
      <div><b>Setup</b><span>${money(record.budget)} starting reserve · seed ${record.seed}</span></div><div><b>Checkpoint</b><span>${when}</span></div></div>`;
  }
  return `<div class="save-summary"><div><b>Saved run</b><span>${label}</span></div><div><b>Progress</b><span>through day ${day} of ${record.days}</span></div>
    <div><b>Setup</b><span>${money(record.budget)}/day · seed ${record.seed}</span></div><div><b>Checkpoint</b><span>${when}</span></div></div>`;
}
function mainMenu(options={}){
  const record=saveRecord(),profile=profileRecord(),progressed=currentRunHasProgress(),terminal=terminalCheckpoint();
  const onboarding=typeof readOnboardingPrefs==="function"?readOnboardingPrefs():{tutorial:true};
  const activeRun=progressed||terminal||RUN_ENTERED,firstRun=!record&&!activeRun;
  const day=typeof S!=="undefined"&&S?Math.max(1,Math.min(DAYS,(S.day||1)-1)):1;
  const currentProgress=MODE===6&&typeof S!=="undefined"&&S?careerProgressLabel(S):`day ${day} of ${DAYS}`;
  const primaryLabel=terminal?"Review results":activeRun?"Return to run":record?`Resume ${MODE_SCOPE_TITLE[record.mode]}`:"Build my first run";
  const primaryNote=terminal?MODE_NAME[MODE]:activeRun?`${MODE_NAME[MODE]} · ${currentProgress}`:record?
    `${MODE_NAME[record.mode]} · ${compactSaveProgress(record)}`:onboarding.tutorial?"One choice at a time · guided opening":"Choose a challenge and enter the command center";
  let savedWhen="";if(record)try{savedWhen=new Date(record.savedAt).toLocaleString();}catch(e){savedWhen="saved on this browser";}
  show(`<div class="title-hub">
    ${activeRun?'<button class="menu-dismiss" id="menuDismiss" type="button" aria-label="Close menu">×</button>':""}
    <div class="title-hub-badge">Main menu · ${profile.badge} training track</div>
    <div class="title-hub-logo" aria-hidden="true"><span>TO</span><i>THE</i><b>MOON</b></div>
    <h2 aria-label="To The Moon — the PFM Media Buying Trainer">PFM Media Buying Trainer</h2>
    <p class="title-hub-promise">A strategy game for practicing how paid-media choices move through ads, tracking, cash, and client outcomes.</p>
    <div class="title-hub-explainer"><b>What you do</b><p>Take control of campaigns, decide where money goes, diagnose tracking and funnel evidence, build or rotate ads, handle client and platform pressure, then try to hit the business objective.</p>
      <ol><li>Inspect the board</li><li>Make one decision</li><li>Run a period</li><li>Read the outcome and adapt</li></ol></div>
    <div class="title-tutorial-choice" role="group" aria-label="Tutorial preference"><span><b>Tutorial</b><small>Staged setup and briefing; Fundamentals also includes a verified action coach.</small></span>
      <button class="btn" id="tutorialOn" type="button" aria-pressed="${onboarding.tutorial}">Teach me while I play</button>
      <button class="btn" id="tutorialOff" type="button" aria-pressed="${!onboarding.tutorial}">Let me explore</button></div>
    <button class="menu-hero-action" id="continueRun" type="button"><span>${primaryLabel}</span><small>${primaryNote}</small></button>
    ${record&&!progressed?`<p class="title-save-note">Browser checkpoint · ${savedWhen}</p>`:""}
    ${firstRun?'<p class="title-first-run-note">Nothing runs until setup is confirmed. Tutorial choice changes the teaching flow, never the simulation rules.</p>':`<div class="title-hub-actions">
      <button class="btn menu-choice" id="openSetup" type="button"><b>${activeRun||record?"Start a new run":"Choose a challenge"}</b><span>One setup choice at a time</span></button>
      <button class="btn menu-choice" id="openGuide" type="button"><b>${ACTIVE_PROFILE==="specialist"?"Open account playbook":"Open Field Guide"}</b><span>Definitions, examples, and deeper lessons</span></button>
    </div>
    <details class="title-hub-more" ${options.settingsOpen?"open":""}><summary>Settings &amp; accessibility</summary>
      <div class="title-settings">
        <button class="btn" id="menuTips" type="button" aria-pressed="${tooltipsEnabled()}">Definitions ${tooltipsEnabled()?"ON":"OFF"}</button>
        <button class="btn" id="menuAnalogies" type="button" aria-pressed="${analogiesEnabled()}">Analogies ${analogiesEnabled()?"ON":"OFF"}</button>
        <label>Detail level<select id="menuDensity">${DENSITY_LEVELS.map(level=>`<option value="${level}" ${level===densityLevel()?"selected":""}>${level[0].toUpperCase()+level.slice(1)}</option>`).join("")}</select></label>
        <button class="btn" id="openSound" type="button">Sound controls</button>
        ${activeRun?'<button class="btn" id="saveNow" type="button">Save checkpoint now</button>':""}
        <button class="btn" id="replayTutorial" type="button">Replay fundamentals tutorial</button>
      </div>
    </details>`}
  </div>`,"structure",{learning:false,definitions:true,menu:true});
  const primary=document.getElementById("continueRun");if(primary)primary.onclick=()=>{
    if(terminal){close();if(!reopenPendingInteraction())reopenTerminalDebrief();return;}
    if(activeRun){close();reopenPendingInteraction();return;}
    if(record){resumeSavedGame();return;}
    if(typeof setupWizard==="function")setupWizard({origin:"title",tutorial:onboarding.tutorial},onboarding.tutorial?"lens":"intent");
  };
  const dismiss=document.getElementById("menuDismiss");if(dismiss)dismiss.onclick=()=>{
    if(terminal){close();if(!reopenPendingInteraction())reopenTerminalDebrief();return;}close();reopenPendingInteraction();
  };
  const setup=document.getElementById("openSetup");if(setup)setup.onclick=()=>setupWizard({origin:"menu",tutorial:onboarding.tutorial},onboarding.tutorial?"lens":"intent");
  const tutorialOn=document.getElementById("tutorialOn"),tutorialOff=document.getElementById("tutorialOff"),setTutorial=enabled=>{
    if(typeof writeOnboardingPrefs==="function")writeOnboardingPrefs({tutorial:enabled});mainMenu({...options,focusId:enabled?"tutorialOn":"tutorialOff"});};
  if(tutorialOn)tutorialOn.onclick=()=>setTutorial(true);if(tutorialOff)tutorialOff.onclick=()=>setTutorial(false);
  const guide=document.getElementById("openGuide");if(guide)guide.onclick=()=>ACTIVE_PROFILE==="specialist"?specialistGuide("00"):loreBook("01");
  const reopenSettings=focusId=>mainMenu({...options,settingsOpen:true,focusId});
  const tips=document.getElementById("menuTips");if(tips)tips.onclick=()=>{setTooltips(!tooltipsEnabled());reopenSettings("menuTips");};
  const analogies=document.getElementById("menuAnalogies");if(analogies)analogies.onclick=()=>{setAnalogies(!analogiesEnabled());reopenSettings("menuAnalogies");};
  const density=document.getElementById("menuDensity");if(density)density.onchange=()=>{setDensity(density.value);reopenSettings("menuDensity");};
  const sound=document.getElementById("openSound");if(sound)sound.onclick=()=>{
    if(typeof setAudioPanel==="function")setAudioPanel(true,false,sound);
  };
  const save=document.getElementById("saveNow");if(save)save.onclick=()=>{if(!checkpointBeforeNavigation("manual",()=>mainMenu(options),true))return;playSfx("settle",.55);reopenSettings("saveNow");};
  const replay=document.getElementById("replayTutorial");if(replay)replay.onclick=()=>{
    if(!checkpointBeforeNavigation("before-tutorial-replay",()=>mainMenu(options)))return;
    close();if(typeof replayTutorial==="function")replayTutorial();};
  const focusTarget=options.focusId?document.getElementById(options.focusId):null;if(focusTarget&&typeof focusTarget.focus==="function")focusTarget.focus();
}

function cardAnatomyRows(){
  if(MODE===6)return [
    ["Career clock","The campaign advances through representative workdays from 2017 to 2027. Each month closes the operating statement, invoices clients or settles affiliate payouts, and checks liquidity separately from recognized profit."],
    ["Client seat","A client seat is one retained business relationship, not one platform ad account. A client may own several campaigns or platform accounts while consuming one of the agency's 75 available seats."],
    ["Service need","Cadence estimates how often this account needs meaningful operator attention. Due work, open incidents, and relationship pressure raise priority; stable accounts remain in the roster without demanding a full card every day."],
    ["Trust and account health","Trust measures the client's willingness to continue the relationship. Account health summarizes delivery, lead or order quality, tracking, and execution. Strong media results can coexist with weak trust, and vice versa."],
    ["Capacity and context load","Focus units represent the team's daily operating bandwidth. Extra verticals, buying disciplines, and difficult account types create context-switching load until hiring, systems, or specialization reduce it."],
    ["Client economics","Retainers and earned bonuses are agency revenue; client media budget is not. Payroll, tools, servicing, credits, and acquisition costs determine agency profit, while invoice timing determines cash."],
    ["Prospect decision","The lead desk compares fee potential, workload, business model, vertical, channel fit, and collection terms. Accepting every prospect can fill the 75 seats while making the agency less valuable and harder to operate."],
    ["Technology tree","Unlocked capabilities change which clients, channels, systems, and specialization benefits are available. Paid search can remain the core strategy; adjacent branches are choices, not mandatory upgrades."],
    ["Agency-wide decisions","Hiring, sales pace, operating policy, positioning, and reserves affect the whole roster. They trade current cash against future capacity, prospect quality, and resilience."],
    ["Affiliate pivot","An eligible agency can irreversibly exchange client retainers for owned funnel economics. Cash, staff, skills, systems, reputation, and career profit carry forward, but payout delays, clawbacks, compliance exposure, and platform concentration replace client-management risk."],
    ["Victory ledger","The 2027 result uses cumulative agency-wide profit and liquidity, not client ad spend or platform-reported return. A profitable-looking book can still fail if payroll or collections exhaust cash."]
  ];
  if(MODE===0)return [
    ["Identity","The campaign and ad-group names locate the object you are editing. Every control below stays inside that ad group unless it explicitly says it changes campaign structure."],
    ["Client relationship","Client trust combines results, judgment, transparency, responsiveness, and alignment; client tension is a separate short-term pressure signal. Business type offers an uncertain prior, while observable reactions progressively sharpen the Client Read. Evidence and sound account operations still outrank style matching, and recorded working agreements must be completed."],
    ["Keyword, match & bid","The keyword states intended demand, match type controls which real queries may trigger it, and Max CPC sets the auction ceiling. Changing the bid does not improve the ad or Quality Score."],
    ["Search-ad preview","The display URL identifies the destination. Headline 1 / Headline 2 and Description 1 / Description 2 are labeled separately so the exact authored copy—and the extra fields in a historical Expanded Text Ad—stay visible. Variant tabs only change which ad you inspect."],
    ["Three different copy actions","Rewrite replaces the lead ad with substantially different wording. A/B permutation keeps its core message but changes one labeled variable. Expanded Text Ad adds the longer two-headline format used in this historical stage."],
    ["Quality Score diagnostic","The 1–10 score summarizes expected CTR, ad relevance, and landing-page experience at keyword level. Read the three components to diagnose the weak layer; it is not a KPI or a literal auction input."],
    ["Delivery evidence","Impressions, clicks, CPC, conversion rate, reported conversions, and impression share describe the last run—not a guarantee."],
    ["Two rank losses","Lost to rank calls for bid or relevance work. Lost to budget calls for more budget or tighter scope; they require opposite remedies."],
    ["Rotation & optimization","Active sibling ads rotate evenly in this training model. Pause or retire an individual test from its own preview; the ad-group Pause control stops the keyword and every ad inside the group."],
    ["Landing page & structure","A landing-page pass changes destination experience. Move group creates a dedicated campaign and, in later stages, independent pacing without pretending the copy improved."]
  ];
  if(MODE===5)return [
    ["Scope","Advertiser workstream, business objective, platform initiative, vertical, and event-source cluster identify exactly what the card controls."],
    ["Decision snapshot","The next-decision cue, allocation, learning, lane physics, and real platform hierarchy tell you what deserves attention now."],
    ["Economics","Media spend becomes modeled outcome value in the business ledger. A platform claim is separate. Modeled MER divides modeled value by same-window spend."],
    ["Delivery path","Impressions, clicks, outcomes, CPC/CPM/CTR/CVR, query ceilings, or view-through evidence change with the selected buying lane."],
    ["Creative or search state","Social/programmatic cards show concept, format, rarity, and fatigue. Search cards instead show bid, Quality Score, and negatives."],
    ["Controls","Allocation changes spend authorization; lane controls change the initiative; creative, search, event-source, and audit actions each affect a different layer."],
    ["Workstream summary","The collapsed row combines sibling platform initiatives for one advertiser so you can scan risk before opening the detailed cards."]
  ];
  return [
    ["Identity","Slot and platform identify the delivery position. The ad is the delivery object; the named creative is the message it carries."],
    ["Concept, format & rarity","Concept is the repeatable idea, format is its execution, and rarity is a simulated upside tier. They are separate performance dimensions."],
    ["Delivery baseline","CPM is reach cost, CTR is click response, CVR is modeled leads divided by ad clicks, LP CTR separately diagnoses on-page action among landing visits, and EPL is modeled value per lead."],
    ["Fatigue & saturation","Fatigue is one creative wearing out. Saturation is the reachable audience ceiling at the current setup; replacing creative only resets fatigue. Mode 4 also shows a platform-level capacity pool shared by active slots in that lane."],
    ["Outcome & landing branches","The outcome path is impressions → ad clicks → modeled leads, followed by the separate reporting layer. Landing visits → on-page actions is a parallel LP-CTR diagnostic, not a required path to a lead and not another multiplier in CVR."],
    ["Economics","Modeled slot ROI uses modeled value. Attributed ad ROI uses platform-creditable value. Account ROI also includes operating costs and is not an average of card ROIs."],
    ["Allocation & actions","Minus/plus changes daily allocation. Multiply, Restate, Recast, landing optimization, creative swap, and Kill each change a specifically named layer."]
  ];
}
function showCardAnatomy(){
  const rows=cardAnatomyRows().map(([label,copy])=>`<div><b>${label}</b><span>${copy}</span></div>`).join("");
  show(`<div class="eyebrow">Card anatomy · ${MODE_NAME[MODE]}</div><h2>How to read a card</h2>
    <div class="prose"><p>Start with scope, then read the decision signal, then inspect supporting evidence. Use the underlined definitions for exact terms; switch Detail level to Analyst when you want the full evidence surface.</p></div>
    <div class="card-anatomy">${rows}</div><div class="row"><button class="btn wide" id="closeCardGuide" type="button">Back to the simulation</button></div>`,"structure",{wide:true});
  const button=document.getElementById("closeCardGuide");if(button)button.onclick=close;
}

const tipsButton=document.getElementById("tipsBtn"),analogyButton=document.getElementById("analogyBtn"),menuButton=document.getElementById("menuBtn"),densitySelect=document.getElementById("densitySelect"),cardGuideButton=document.getElementById("cardGuideBtn"),learningCloseButton=document.getElementById("learningCloseBtn");
if(tipsButton)tipsButton.addEventListener("click",()=>setTooltips(!tooltipsEnabled()));
if(analogyButton)analogyButton.addEventListener("click",()=>setAnalogies(!analogiesEnabled()));
if(densitySelect)densitySelect.addEventListener("change",()=>setDensity(densitySelect.value));
if(learningCloseButton)learningCloseButton.addEventListener("click",()=>{const menu=document.getElementById("learningMenu");if(menu)menu.open=false;const summary=menu&&menu.querySelector?menu.querySelector("summary"):null;if(summary&&typeof summary.focus==="function")summary.focus();});
if(menuButton)menuButton.addEventListener("click",mainMenu);
if(cardGuideButton)cardGuideButton.addEventListener("click",showCardAnatomy);
