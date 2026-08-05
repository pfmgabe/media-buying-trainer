"use strict";

const SAVE_SCHEMA=3,UI_SCHEMA=1;
let ACTIVE_PROFILE=(window.__trainerProfile&&PROFILE_DB[window.__trainerProfile])?window.__trainerProfile:"general";
let profileBooted=false;

function profileRecord(){return PROFILE_DB[ACTIVE_PROFILE]||PROFILE_DB.general;}
function profileStorageKey(kind){return `ttm.${kind}.${ACTIVE_PROFILE}.v${kind==="save"?SAVE_SCHEMA:UI_SCHEMA}`;}
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
  if(typeof render==="function"&&profileBooted&&typeof S!=="undefined"&&S)render();return UI_PREFS.analogies;}
function setDensity(level){const next=DENSITY_LEVELS.includes(level)?level:"guided";
  UI_PREFS={...UI_PREFS,density:next};persistUiPrefs();applyUiPrefs(false);
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

function saveRecord(profile=ACTIVE_PROFILE){
  try{const item=JSON.parse(localStorage.getItem(`ttm.save.${profile}.v${SAVE_SCHEMA}`)||"null");
    const mode=item&&Number(item.mode),days=item&&Number(item.days),budget=item&&Number(item.budget),seed=item&&Number(item.seed);
    return item&&item.schema===SAVE_SCHEMA&&item.profile===profile&&Number.isInteger(mode)&&mode>=0&&mode<=5&&
      Number.isFinite(days)&&days>0&&Number.isFinite(budget)&&budget>0&&validSeed(seed)&&
      item.state&&typeof item.state==="object"?item:null;
  }catch(e){return null;}
}
function saveGame(source="manual",notify=true){
  if(!profileBooted||typeof S==="undefined"||!S)return false;
  const record={schema:SAVE_SCHEMA,profile:ACTIVE_PROFILE,mode:MODE,stage:MODE===0?CLASSIC_STAGE:null,
    days:DAYS,budget:DAILY,seed:SEED,flavor:ACTIVE_FLAVOR,savedAt:new Date().toISOString(),
    source,state:JSON.parse(JSON.stringify(S))};
  try{localStorage.setItem(profileStorageKey("save"),JSON.stringify(record));}
  catch(e){return false;}
  if(notify){playSfx("settle",.55);addLog(`<div><b class="pos">Checkpoint saved</b> — this ${profileRecord().label} run can resume on this browser.</div>`,"structure");render();}
  return true;
}
function autoCheckpoint(){
  if(!profileBooted||typeof S==="undefined"||!S)return false;
  const progressed=MODE===0?S.day>1:S.day>1||S.spendTotal>0;
  return progressed?saveGame("auto",false):false;
}
function compatibleSave(record){
  if(!record||record.profile!==ACTIVE_PROFILE||record.mode!==MODE||Number(record.days)!==DAYS||
      Number(record.budget)!==DAILY||Number(record.seed)!==SEED||!record.state||typeof record.state!=="object"||
      !Number.isFinite(Number(record.state.day)))return false;
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
  if(MODE===5)return state.engine==="nightmare"&&state.ended===true;
  if(MODE===0)return state.classic===true&&Number(state.day)>DAYS;
  return MODE>=1&&MODE<=4&&Number(state.day)>DAYS;
}
function reopenTerminalDebrief(){
  if(!terminalCheckpoint())return false;
  if(MODE===5&&typeof NightmareEngine!=="undefined"&&typeof NightmareEngine.debrief==="function"){
    NightmareEngine.debrief();return true;
  }
  if(MODE===0&&typeof classicDebrief==="function"){classicDebrief();return true;}
  if(MODE>=1&&MODE<=4&&typeof debrief==="function"){debrief();return true;}
  return false;
}
function restoreSavedState(record){
  if(!compatibleSave(record))return false;
  const previous=S;
  try{
    S=JSON.parse(JSON.stringify(record.state));
    S.seedShown=SEED;
    if(MODE>=1&&MODE<=4&&!S.rng)S.rng={event:0,creative:0};
    if(MODE===5&&typeof NightmareEngine!=="undefined"&&typeof NightmareEngine.hydrate==="function")NightmareEngine.hydrate(S);
    if(record.flavor&&typeof setFlavor==="function")setFlavor(record.flavor,{persist:true,updateUrl:false,rerender:false});
    render();if(typeof renderTutorialCoach==="function")renderTutorialCoach();
    reopenTerminalDebrief();
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
  const ok=restoreSavedState(record);if(ok&&!terminalCheckpoint()&&typeof close==="function")close();return ok;
}
function resumeRequested(){return new URLSearchParams(location.search).get("resume")==="1";}
function clearResumeQuery(){const p=new URLSearchParams(location.search);p.delete("resume");
  if(typeof history!=="undefined"&&history.replaceState)history.replaceState(null,"",p.toString()?`?${p.toString()}`:location.pathname||"");}

function saveSummaryMarkup(record){
  if(!record)return `<div class="note">No browser-local checkpoint exists for this training track yet.</div>`;
  const label=MODE_NAME[record.mode]||`Mode ${record.mode}`,day=Math.max(1,Math.min(record.days,(record.state.day||1)-1));
  let when="saved locally";try{when=new Date(record.savedAt).toLocaleString();}catch(e){}
  return `<div class="save-summary"><div><b>Saved run</b><span>${label}</span></div><div><b>Progress</b><span>through day ${day} of ${record.days}</span></div>
    <div><b>Setup</b><span>${money(record.budget)}/day · seed ${record.seed}</span></div><div><b>Checkpoint</b><span>${when}</span></div></div>`;
}
function mainMenu(){
  const record=saveRecord(),profile=profileRecord(),day=typeof S!=="undefined"&&S?Math.max(1,Math.min(DAYS,(S.day||1)-1)):1;
  show(`<div class="eyebrow">Main menu · ${profile.badge} track</div><h2>${profile.label}</h2>
    <div class="prose"><p>${profile.intro}</p><p><strong>Current run:</strong> ${MODE_NAME[MODE]} · day ${day}/${DAYS} · seed ${SEED}. Each training track keeps one checkpoint in this browser profile; a new save on the same track replaces it.</p></div>
    ${saveSummaryMarkup(record)}
    <div class="row" style="margin-top:12px"><button class="btn wide" id="continueRun">Continue current run</button>
      <button class="btn wide" id="saveNow">Save checkpoint</button>${record?'<button class="btn wide" id="resumeSave">Resume saved run</button>':""}</div>
    <div class="row" style="margin-top:8px"><button class="btn wide" id="freshRun">Start fresh · saved checkpoint stays available</button>
      <button class="btn wide" id="openSetup">Modes &amp; run setup</button><button class="btn wide" id="openGuide">${ACTIVE_PROFILE==="specialist"?"Account Playbook":"Field Guide"}</button>
      <button class="btn wide" id="replayTutorial">Replay Mode 1 tutorial</button></div>`,"structure",{wide:true});
  document.getElementById("continueRun").onclick=close;
  document.getElementById("saveNow").onclick=()=>{saveGame("manual",false);playSfx("settle",.55);mainMenu();};
  const resume=document.getElementById("resumeSave");if(resume)resume.onclick=resumeSavedGame;
  document.getElementById("freshRun").onclick=()=>{resetRng();fresh();close();render();if(typeof startTutorialIntro==="function")startTutorialIntro(false);};
  document.getElementById("openSetup").onclick=()=>briefing();
  document.getElementById("openGuide").onclick=()=>ACTIVE_PROFILE==="specialist"?specialistGuide("00"):loreBook("01");
  document.getElementById("replayTutorial").onclick=()=>{if(MODE!==1){const p=new URLSearchParams(location.search);p.set("mode","1");p.set("days",CONFIG_SPECS[1].days);p.set("budget",CONFIG_SPECS[1].budget);p.set("seed",SEED);p.set("tutorial","1");location.search=p.toString();return;}
    close();if(typeof replayTutorial==="function")replayTutorial();};
}

function cardAnatomyRows(){
  if(MODE===0)return [
    ["Identity","The campaign and ad-group names locate the object you are editing. Every control below stays inside that ad group unless it explicitly says it changes campaign structure."],
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
