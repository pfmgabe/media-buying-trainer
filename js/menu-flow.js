"use strict";

/* ---------------- staged front door -------------------------------------------------------
   Navigation is presentation-only until launchWizardRun(). No step consumes RNG, changes S,
   writes run configuration, or swaps the active analogy while the player is still browsing. */
const MENU_INTENTS=Object.freeze({
  learn:Object.freeze({icon:"🎯",title:"Learn the fundamentals",copy:"Start with one guided account and learn by making real decisions.",meta:"Recommended first run"}),
  practice:Object.freeze({icon:"🧠",title:"Practice a specialty",copy:"Choose one focused problem: search, cash flow, creative, or channels.",meta:"Four focused drills"}),
  campaign:Object.freeze({icon:"🌌",title:"Run a long campaign",copy:"Manage a portfolio or build an agency across an entire career.",meta:"Expert and multi-session"})
});
const ONBOARDING_PREF_LEGACY_KEY="ttm.onboarding.v2",TUTORIAL_SEED=2601;
const MODE_FAILURE=Object.freeze({
  0:"Lose the client by missing results, trust, or explicit commitments.",
  1:"Finish without reaching the all-in account return objective.",
  2:"Mistake timing gaps for performance and finish below the all-in objective.",
  3:"Let fatigue outrun approved creative inventory or miss the account objective.",
  4:"Overconcentrate, overlap audiences, or miss the account-wide objective.",
  5:"Collapse shared credit or end the mandate without three consecutive portfolio gates.",
  6:"Reach 2027 without the required cumulative profit and liquidity."
});
function onboardingPrefKey(profile=ACTIVE_PROFILE){return `ttm.onboarding.${PROFILE_DB[profile]?profile:"general"}.v2`;}
function readOnboardingPrefs(){
  const fallback={tutorial:true,guidance:typeof densityLevel==="function"?densityLevel():"guided",flavor:ACTIVE_FLAVOR,
    analogies:typeof analogiesEnabled==="function"?analogiesEnabled():true};
  try{const key=onboardingPrefKey(),scoped=localStorage.getItem(key),raw=scoped===null?localStorage.getItem(ONBOARDING_PREF_LEGACY_KEY):scoped,
      value=JSON.parse(raw||"null");
    if(scoped===null&&value&&typeof value==="object")try{localStorage.setItem(key,JSON.stringify(value));}catch(ignore){}
    return value&&typeof value==="object"?{
    tutorial:value.tutorial!==false,guidance:DENSITY_LEVELS.includes(value.guidance)?value.guidance:fallback.guidance,
    flavor:FLAVOR_BY_ID[value.flavor]?value.flavor:fallback.flavor,analogies:value.analogies!==false}:fallback;}catch(e){return fallback;}
}
function writeOnboardingPrefs(changes){const value={...readOnboardingPrefs(),...changes};
  try{localStorage.setItem(onboardingPrefKey(),JSON.stringify(value));}catch(e){}return value;}

function wizardDraft(raw={}){
  const prefs=readOnboardingPrefs();
  const requested=Number(raw.mode),mode=MODE_IDS.includes(requested)?requested:MODE;
  const fallback=mode===MODE?{days:DAYS,budget:DAILY}:savedConfigFor(mode);
  const cfg=cleanConfig(mode,{days:raw.days??fallback.days,budget:raw.budget??fallback.budget});
  const flavor=FLAVOR_BY_ID[raw.flavor]?raw.flavor:(FLAVOR_BY_ID[prefs.flavor]?prefs.flavor:ACTIVE_FLAVOR),
    tutorial=raw.tutorial===undefined?(raw.guided===undefined?prefs.tutorial:!!raw.guided):!!raw.tutorial,
    guidance=DENSITY_LEVELS.includes(raw.guidance)?raw.guidance:prefs.guidance;
  return {origin:raw.origin||"menu",intent:raw.intent||MODE_MENU_META[mode].intent,mode,
    stage:Math.max(1,Math.min(3,Number(raw.stage)||(mode===0&&MODE===0?CLASSIC_STAGE:1))),
    days:cfg.days,budget:cfg.budget,flavor,analogies:raw.analogies===undefined?prefs.analogies:!!raw.analogies,
    tutorial,guidance,guided:tutorial};
}
function wizardWithMode(raw,mode,intent=MODE_MENU_META[mode].intent){
  const cfg=mode===MODE?{days:DAYS,budget:DAILY}:savedConfigFor(mode);
  return wizardDraft({...raw,intent,mode,days:cfg.days,budget:cfg.budget,
    stage:mode===0?(MODE===0?CLASSIC_STAGE:1):1});
}
function wizardPeriodText(mode,days){
  if(mode===6)return "10-year career";
  if(mode===5)return `${days}-day mandate`;
  return `${days}-day run`;
}
function wizardBudgetText(mode,budget){
  if(mode===6)return `${money(budget)} starting reserve`;
  if(mode===5)return `${money(budget)}/day portfolio authorization`;
  return `${money(budget)}/day`;
}
function wizardProgress(step){
  const explain=["lens","guidance"].includes(step),challenge=["intent","mode","stage","period","budget"].includes(step),mission=step==="mission";
  return `<ol class="wizard-progress" aria-label="New run progress">
    <li class="${explain?"active":challenge||mission?"done":""}" ${explain?'aria-current="step"':""}><span>1</span>Explain</li>
    <li class="${challenge?"active":mission?"done":""}" ${challenge?'aria-current="step"':""}><span>2</span>Choose</li>
    <li class="${mission?"active":""}" ${mission?'aria-current="step"':""}><span>3</span>Confirm</li></ol>`;
}
function wizardBackStep(draft,step){
  if(step==="lens"){mainMenu();return;}
  if(step==="guidance"){setupWizard(draft,"lens");return;}
  if(step==="intent"){draft.tutorial?setupWizard(draft,"guidance"):mainMenu();return;}
  if(step==="mode"){setupWizard(draft,"intent");return;}
  if(step==="stage"){setupWizard(draft,"mode");return;}
  if(step==="period"){setupWizard(draft,draft.mode===0?"stage":"mode");return;}
  if(step==="budget"){setupWizard(draft,"period");return;}
  if(step==="mission"){setupWizard(draft,"budget");return;}
  mainMenu();
}
function wizardSaveBadge(record){
  if(!record)return "";
  return `<span class="wizard-save-badge">● Saved · ${compactSaveProgress(record)}</span>`;
}
function wizardModeCard(mode){
  const meta=MODE_MENU_META[mode],cfg=savedConfigFor(mode),record=saveRecord(ACTIVE_PROFILE,mode);
  return `<article class="wizard-mode-card">
    <button class="wizard-mode-select" type="button" data-mode="${mode}" aria-labelledby="wizard-mode-${mode}-scope wizard-mode-${mode}-name" aria-describedby="wizard-mode-${mode}-promise wizard-mode-${mode}-stats">
      <span class="wizard-mode-icon" aria-hidden="true">${meta.icon}</span>
      <span class="wizard-mode-copy"><small id="wizard-mode-${mode}-scope">${MODE_SCOPE_TITLE[mode]}</small><b id="wizard-mode-${mode}-name">${MODE_NAME[mode]}</b><em id="wizard-mode-${mode}-promise">${meta.promise}</em></span>
      <span class="wizard-mode-stats" id="wizard-mode-${mode}-stats"><i>${meta.difficulty}</i><i>${meta.session}</i><i>${wizardPeriodText(mode,cfg.days)}</i></span>
    </button>
    ${record?`<div class="wizard-mode-save">${wizardSaveBadge(record)}<button class="btn" type="button" data-resume-mode="${mode}" aria-label="Resume ${MODE_NAME[mode]}">Resume</button></div>`:""}
  </article>`;
}

function currentRunMatchesSave(record){
  if(!record||record.mode!==MODE||Number(record.days)!==DAYS||Number(record.budget)!==DAILY||Number(record.seed)!==SEED)return false;
  if(record.mode===0&&Number(record.stage)!==CLASSIC_STAGE)return false;
  try{return JSON.stringify(record.state)===JSON.stringify(S);}catch(e){return false;}
}
function confirmSavedRun(record,draft){
  show(`${wizardProgress("mission")}<div class="wizard-heading"><div class="eyebrow">Saved checkpoint</div>
    <h2>Resume ${MODE_NAME[record.mode]}?</h2><p>The active run and this checkpoint are different versions of the same challenge.</p></div>
    <div class="mission-warning"><b>Resuming will discard the active unsaved version.</b><span>The saved checkpoint itself will not be overwritten.</span></div>
    <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Keep active run</button>
      <button class="btn wizard-primary" id="confirmResume" type="button">Discard active version &amp; resume save</button></div>`,"structure",{learning:false,menu:true});
  const back=document.getElementById("wizardBack");if(back)back.onclick=()=>setupWizard(draft,"mode");
  const confirm=document.getElementById("confirmResume");if(confirm)confirm.onclick=()=>{location.search=savedSearch(record);};
}
function resumeWizardRun(record,draft){
  if(!record)return false;
  if(!currentRunHasProgress()||currentRunMatchesSave(record)){location.search=savedSearch(record);return true;}
  if(record.mode===MODE){confirmSavedRun(record,draft);return false;}
  if(!checkpointBeforeNavigation("before-cross-mode-resume",()=>setupWizard(draft,"mode")))return false;
  location.search=savedSearch(record);return true;
}

function setupWizard(raw={},step="lens"){
  const draft=wizardDraft(raw),meta=MODE_MENU_META[draft.mode];
  let html="";
  if(step==="lens"){
    const selected=FLAVOR_BY_ID[draft.flavor]||currentFlavor(),index=Math.max(0,ORDERED_FLAVORS.findIndex(item=>item.id===selected.id)),pure=!draft.analogies;
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Step 1 · explanation language</div><h2>How should unfamiliar ideas be explained?</h2>
      <p>The real media-buying term always stays first. An analogy adds a second explanation; it never changes the mechanics.</p></div>
      <div class="wizard-lens-carousel"><button class="btn lens-arrow" id="lensPrev" type="button" aria-label="Previous analogy">←</button>
        <article class="wizard-lens-preview"><small>${selected.mark} ANALOGY ${index+1} OF ${ORDERED_FLAVORS.length}</small><b>${selected.name}</b><p>${selected.premise}</p><em>${selected.signature}</em></article>
        <button class="btn lens-arrow" id="lensNext" type="button" aria-label="Next analogy">→</button></div>
      <button class="wizard-pure-toggle" id="pureLens" type="button" aria-pressed="${pure}"><span aria-hidden="true">📊</span><b>${pure?"Pure media-buying terms selected":"Use pure media-buying terms"}</b><small>Definitions remain available without metaphor captions.</small></button>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepLens" type="button">Use ${pure?"pure terms":selected.name}</button></div>`;
  }else if(step==="guidance"){
    const levels={guided:["Guided","Maximum definitions and expanded teaching copy. Fundamentals also adds a verified action coach."],compact:["Focused","Key definitions and compact cards. Fundamentals retains its action coach."],analyst:["Analyst","Dense evidence with minimal narration. Fundamentals still verifies its tutorial actions."]};
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Step 2 · guidance level</div><h2>How much explanation should stay visible?</h2><p>This can be changed during play.</p></div>
      <div class="wizard-guidance-list">${Object.entries(levels).map(([id,[label,copy]])=>`<button class="wizard-guidance" type="button" data-guidance="${id}" aria-pressed="${draft.guidance===id}"><b>${label}</b><span>${copy}</span></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button></div>`;
  }else if(step==="intent"){
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">New run</div><h2>What do you want to accomplish?</h2>
      <p>Choose one goal. The next screen will show only challenges that serve it.</p></div>
      <div class="wizard-intents">${Object.entries(MENU_INTENTS).map(([id,item])=>`<button class="wizard-intent" type="button" data-intent="${id}">
        <span aria-hidden="true">${item.icon}</span><b>${item.title}</b><em>${item.copy}</em><small>${item.meta}</small></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button></div>`;
  }else if(step==="mode"){
    const modes=MODE_IDS.filter(mode=>MODE_MENU_META[mode].intent===draft.intent),intent=MENU_INTENTS[draft.intent];
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">${intent.icon} ${intent.title}</div><h2>Choose one challenge</h2>
      <p>Each mode teaches a different slice of the job. Nothing starts when you select it.</p></div>
      <div class="wizard-mode-list">${modes.map(wizardModeCard).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button></div>`;
  }else if(step==="stage"){
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">🔎 Paid Search Account</div><h2>Choose the client chapter</h2>
      <p>Each chapter adds pressure without changing the core search-account controls.</p></div>
      <div class="wizard-stage-list">${[1,2,3].map(stage=>`<button class="wizard-stage" type="button" data-stage="${stage}" aria-pressed="${stage===draft.stage}">
        <b>${CSTAGE_NAME[stage]}</b><span>${CSTAGE_BLURB[stage]}</span></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button></div>`;
  }else if(step==="period"){
    const spec=CONFIG_SPECS[draft.mode],label=draft.mode===6?"Career horizon":draft.mode===5?"Mandate length":"Run length",unit=draft.mode===6?"months":"days";
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Run setup · one choice</div><h2>How long should this run last?</h2><p>The current setting remains the default.</p></div>
      <div class="single-config"><label>${label}<input id="daysCfg" type="number" inputmode="numeric" min="${spec.minDays}" max="${spec.maxDays}" step="${spec.periodStep||1}" value="${draft.days}" ${spec.fixedPeriod?"disabled":""}></label>
        <p>${spec.fixedPeriod?`This campaign is fixed at ${spec.days} ${unit}.`:`Allowed: ${spec.minDays}–${spec.maxDays} ${unit}${draft.mode===5?", in 30-day blocks":""}.`}</p></div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepPeriod" type="button">Continue</button></div>`;
  }else if(step==="budget"){
    const spec=CONFIG_SPECS[draft.mode],label=draft.mode===6?"Starting operating reserve":draft.mode===5?"Daily portfolio authorization":"Daily account budget",
      meaning=draft.mode===6?"Cash available to build the agency; it is not client media spend.":draft.mode===5?"The shared daily ceiling across every active portfolio initiative.":"The maximum amount available to allocate across the active account each day.";
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Run setup · one choice</div><h2>How much buying authority should you manage?</h2><p>${meaning}</p></div>
      <div class="single-config"><label>${label}<input id="budgetCfg" type="number" inputmode="numeric" min="${spec.minBudget}" max="${spec.maxBudget}" step="${spec.inputStep}" value="${draft.budget}"></label><p>Allowed: ${money(spec.minBudget)}–${money(spec.maxBudget)}.</p></div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepBudget" type="button">Continue</button></div>`;
  }else{
    const currentFlavorRecord=FLAVOR_BY_ID[draft.flavor]||currentFlavor(),activeProgress=currentRunHasProgress(),sameModeProgress=activeProgress&&draft.mode===MODE,
      launchText=activeProgress?`Save current & start ${wizardPeriodText(draft.mode,draft.days)}`:`Start ${wizardPeriodText(draft.mode,draft.days)}`;
    html=`${wizardProgress("mission")}<div class="mission-preflight">
      <div class="mission-icon" aria-hidden="true">${meta.icon}</div><div><div class="eyebrow">${MODE_SCOPE_TITLE[draft.mode]} · ${meta.difficulty}</div><h2>${MODE_NAME[draft.mode]}</h2>
      <p>${meta.promise}</p></div></div>
      <section class="mission-objective"><small>Win condition</small><strong>${MODE_OBJECTIVE[draft.mode]}</strong></section>
      <section class="mission-failure"><small>Failure pressure</small><strong>${MODE_FAILURE[draft.mode]}</strong></section>
      <div class="mission-confirm-grid"><span>${wizardPeriodText(draft.mode,draft.days)}</span><span>${wizardBudgetText(draft.mode,draft.budget)}</span>${draft.mode===0?`<span>${CSTAGE_NAME[draft.stage]}</span>`:""}
        <span>${draft.tutorial?(draft.mode===1?"Deterministic action tutorial":"Guided briefing · open play"):"Self-directed run briefing"}</span><span>${draft.guidance} detail</span><span>${draft.analogies?`${currentFlavorRecord.mark} ${currentFlavorRecord.name}`:"📊 Pure terms"}</span></div>
      ${activeProgress?`<div class="mission-warning"><b>Your current run will be checkpointed first.</b><span>${sameModeProgress?"Once this new run advances, later autosaves for this same mode can replace that checkpoint.":"Its mode-specific checkpoint stays separate from this challenge."}</span></div>`:""}
      <div class="wizard-footer mission-actions"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="launchRun" type="button">${launchText}</button></div>`;
  }

  show(`<div class="setup-wizard" data-wizard-step="${step}">${html}</div>`,"structure",{
    wide:step==="mode"||step==="lens",learning:false,definitions:draft.tutorial||step==="mission",menu:true,
    loreFlavor:draft.flavor,loreAnalogies:draft.analogies});
  const back=document.getElementById("wizardBack");if(back)back.onclick=()=>wizardBackStep(draft,step);
  if(step==="lens"){
    const move=direction=>{const index=Math.max(0,ORDERED_FLAVORS.findIndex(item=>item.id===draft.flavor)),next=(index+direction+ORDERED_FLAVORS.length)%ORDERED_FLAVORS.length;
      setupWizard({...draft,flavor:ORDERED_FLAVORS[next].id,analogies:true},"lens");};
    const previous=document.getElementById("lensPrev"),next=document.getElementById("lensNext"),pure=document.getElementById("pureLens"),keep=document.getElementById("keepLens");
    if(previous)previous.onclick=()=>move(-1);if(next)next.onclick=()=>move(1);
    if(pure)pure.onclick=()=>setupWizard({...draft,analogies:!draft.analogies},"lens");
    if(keep)keep.onclick=()=>setupWizard(draft,"guidance");
  }
  if(step==="guidance")ov.querySelectorAll("button[data-guidance]").forEach(button=>button.onclick=()=>setupWizard({...draft,guidance:button.dataset.guidance},"intent"));
  if(step==="intent")ov.querySelectorAll("button[data-intent]").forEach(button=>button.onclick=()=>{
    const intent=button.dataset.intent;
    setupWizard({...draft,intent},"mode");
  });
  if(step==="mode"){
    ov.querySelectorAll("button[data-mode]").forEach(button=>button.onclick=()=>{
      const next=wizardWithMode(draft,Number(button.dataset.mode),draft.intent);
      setupWizard(next,next.mode===0?"stage":"period");
    });
    ov.querySelectorAll("button[data-resume-mode]").forEach(button=>button.onclick=()=>{
      const record=saveRecord(ACTIVE_PROFILE,Number(button.dataset.resumeMode));resumeWizardRun(record,draft);
    });
  }
  if(step==="stage")ov.querySelectorAll("button[data-stage]").forEach(button=>button.onclick=()=>setupWizard({...draft,stage:Number(button.dataset.stage)},"period"));
  if(step==="period"){
    const input=document.getElementById("daysCfg"),keep=document.getElementById("keepPeriod");if(keep)keep.onclick=()=>{
      const cfg=cleanConfig(draft.mode,{days:input?input.value:draft.days,budget:draft.budget});setupWizard({...draft,days:cfg.days},"budget");};}
  if(step==="budget"){
    const input=document.getElementById("budgetCfg"),keep=document.getElementById("keepBudget");if(keep)keep.onclick=()=>{
      const cfg=cleanConfig(draft.mode,{days:draft.days,budget:input?input.value:draft.budget});setupWizard({...draft,budget:cfg.budget},"mission");};}
  if(step==="mission"){
    const launch=document.getElementById("launchRun");if(launch)launch.onclick=()=>launchWizardRun(draft);
  }
}

function launchWizardRun(raw){
  const draft=wizardDraft(raw),cfg=cleanConfig(draft.mode,draft);
  if(!checkpointBeforeNavigation("before-setup-change",()=>setupWizard(draft,"mission")))return false;
  saveConfigFor(draft.mode,cfg);
  writeOnboardingPrefs({tutorial:draft.tutorial,guidance:draft.guidance,flavor:draft.flavor,analogies:draft.analogies});
  UI_PREFS={...UI_PREFS,analogies:!!draft.analogies,density:draft.guidance,tooltips:draft.guidance!=="analyst"};persistUiPrefs();
  setFlavor(draft.flavor,{persist:true,updateUrl:false,rerender:false});
  const p=new URLSearchParams(location.search);
  const actionTutorial=draft.tutorial&&draft.mode===1;
  p.set("mode",draft.mode);p.set("days",cfg.days);p.set("budget",cfg.budget);p.set("seed",actionTutorial?TUTORIAL_SEED:SEED);p.set("flavor",draft.flavor);p.set("autostart","1");p.set("brief","1");
  if(draft.mode===0)p.set("stage",draft.stage);else p.delete("stage");
  if(draft.tutorial)p.set("guided","1");else p.delete("guided");
  if(actionTutorial){p.set("tutorial","1");if(typeof writeTutorialProgress==="function")writeTutorialProgress({introComplete:false,complete:false,step:0,runKey:null,generatedCreativeId:null,baseline:null,comparison:null,completedAt:null});}
  else p.delete("tutorial");
  p.delete("resume");location.search=p.toString();return true;
}

/* Every deliberate fresh start—wizard launch, replay, new seed, or next chapter—travels
   through the same initialized-state briefing. Resuming a checkpoint intentionally does not. */
function startFreshRunExperience(options={}){
  const p=new URLSearchParams(location.search);
  const mode=MODE_IDS.includes(Number(options.mode))?Number(options.mode):MODE;
  const cfg=cleanConfig(mode,{days:options.days??DAYS,budget:options.budget??DAILY});
  p.set("mode",String(mode));p.set("days",String(cfg.days));p.set("budget",String(cfg.budget));
  p.set("seed",String(validSeed(Number(options.seed))?Number(options.seed):SEED));p.set("flavor",options.flavor||ACTIVE_FLAVOR);
  if(mode===0)p.set("stage",String(Math.max(1,Math.min(3,Number(options.stage)||CLASSIC_STAGE))));else p.delete("stage");
  p.set("autostart","1");p.set("brief","1");p.delete("resume");
  if(options.tutorial===true){p.set("tutorial","1");p.set("guided","1");}else{p.delete("tutorial");p.delete("guided");}
  location.search=p.toString();return true;
}

/* A new-run briefing reads the initialized public state exactly once. It never rolls RNG,
   advances a cursor, or reveals hidden causes. Every fresh challenge therefore opens with
   circumstances that match the board the player is about to enter. */
let openingBriefIndex=0,openingBriefSlides=[];
function cleanOpeningName(value){return String(value||"").replace(/^Fictional\s*·\s*/i,"");}
function openingBriefModel(mode=MODE,state=S){
  const meta=MODE_MENU_META[mode],objective=MODE_OBJECTIVE[mode],setup=`${wizardPeriodText(mode,DAYS)} · ${wizardBudgetText(mode,DAILY)}`;
  const roles={
    0:"You are the media buyer responsible for one paid-search client. You control bids, query filtering, ad copy, landing-page and tracking repairs, and how decisions are explained to the client.",
    1:"You are the media buyer for one closed-loop account. You allocate its daily budget, inspect reporting, question weak signals, test and swap creatives, and decide when evidence is strong enough to scale.",
    2:"You are responsible for both campaign performance and working capital. You must separate value earned today from platform claims, pending payouts, settled cash, and operating cost.",
    3:"You own delivery and the creative supply chain. You must commission the right formats, survive build and review lead times, rotate tired ads, and keep the account producing while replacements move toward live status.",
    4:"You command one account across several buying platforms. You may move budget among lanes, but must respect each lane's capacity, attribution behavior, audience overlap, and concentration risk.",
    5:"You run the portfolio command desk for a holding company. You choose which advertiser workstreams receive money and attention while shared credit, pixels, attribution claims, and crises leak across account boundaries.",
    6:"You are building a media-buying company from 2017 through 2027. You choose clients, service work, hiring, capabilities, and eventually the business model while protecting cash and cumulative operating profit."
  };
  let role=roles[mode]||meta.promise,board="",conditions="",firstMove="Inspect the visible starting evidence before changing a control.";
  if(mode===0){const groups=Array.isArray(state.groups)?state.groups:[],business=typeof classicClientBusiness==="function"?classicClientBusiness(state.client?.businessId):null;
    const chapter=CSTAGE_NAME[state.stage||CLASSIC_STAGE]||"Client chapter";
    board=`One paid-search client in ${chapter}, ${groups.length} live ad groups, their keywords and ads, and a client relationship that remembers commitments.`;
    conditions=`${business?.name||"A service business"} begins with ${money(state.budget||DAILY)} in account buying authority. ${CSTAGE_BLURB[state.stage||CLASSIC_STAGE]||"Search-account pressure is active."} ${state.client?.grievance?`The client enters with one explicit concern: ${state.client.grievance}.`:"The client expects evidence-backed communication."}`;
    firstMove="Read query intent, match type, Quality Score components, and the client brief before touching bids.";
  }else if(mode>=1&&mode<=4){const slots=Array.isArray(state.slots)?state.slots:[],event=state.dayState?.event,mood=state.dayState?.mood,
      formats=[...new Set(slots.map(slot=>typeof creativeFormatFor==="function"?creativeFormatFor(slot.c).label:slot.c?.format).filter(Boolean))],
      opening=`Day 1 auction mood: ${mood?.label||"Stable"}${mood?.detail?` (${mood.detail})`:""}. ${event?.title||"No major shock"}: ${event?.body||"The opening allocation and creative mix decide the baseline."}`;
    if(mode===1){
      board=`One account with ${slots.length} delivery slots. Each slot has a budget, ad, creative concept, format, fatigue state, and its own evidence path.`;
      conditions=`${opening} Starting formats: ${formats.join(" · ")}.`;
      firstMove=tutorialQueryRequested()?"Run the untouched baseline once. The action coach will then ask you to compare evidence before optimizing.":"Run the untouched baseline once, compare both reporting lenses, then choose the smallest decision that tests your diagnosis.";
    }else if(mode===2){
      board=`One account with ${slots.length} delivery slots plus separate earned-value, attributed-report, pending-settlement, and settled-cash ledgers.`;
      conditions=`${opening} Nothing has settled on Day 1; value produced by the first buy will enter the pending ledger on its modeled payment schedule.`;
      firstMove="Run an untouched baseline, then compare earned value with pending and settled value before treating a timing gap as a performance change.";
    }else if(mode===3){
      board=`One account with ${slots.length} live delivery slots and a creative pipeline that separates requested, building, review, revision, ready, and live work.`;
      conditions=`${opening} The pipeline starts with ${state.requests?.length||0} builds and ${state.readyCreative?.length||0} approved replacements; starting formats are ${formats.join(" · ")}.`;
      firstMove="Read current fatigue, establish a delivery baseline, and commission replacement inventory early enough to survive build and review lead time.";
    }else{const lanes=[...new Set(slots.map(slot=>slot.plat&&PLATFORMS[slot.plat]?PLATFORMS[slot.plat].name:slot.plat).filter(Boolean))];
      board=`One account across ${lanes.length} distinct platform lanes—${lanes.join(" · ")}—with lane capacity, audience overlap, concentration, settlement, and attribution differences.`;
      conditions=`${opening} Each of the ${slots.length} starting slots occupies one lane, so the opening account has no duplicate-lane overlap yet.`;
      firstMove="Establish one cross-platform baseline, compare account ROI with lane-level evidence, and change only the lane or allocation that tests your diagnosis.";
    }
  }else if(mode===5){const accounts=Array.isArray(state.accounts)?state.accounts:[],families=new Set(accounts.map(account=>account.platform).filter(Boolean)),event=state.dayState?.event,mood=state.dayState?.mood;
    board=`${accounts.length} advertiser workstreams across ${families.size} platform lanes, connected by shared cash, credit, event sources, attribution claims, and operating capacity.`;
    conditions=`Day 1 portfolio mood: ${mood?.label||"Stable"}. ${event?.title||"No systemic shock"}: ${event?.body||"Portfolio structure decides the opening day."} Cash starts at ${money(state.finance?.cash||0)} with ${money(state.finance?.creditLimit||0)} in shared credit capacity.`;
    firstMove="Check liquidity and concentration first, then inspect the workstream targeted by the visible event. Hidden causes remain hidden.";
  }else{const clients=Array.isArray(state.clients)?state.clients.filter(client=>client.status==="active"):[],prospects=Array.isArray(state.prospects)?state.prospects:[],
      incident=clients.find(client=>client.incident),year=2017+Math.floor((Number(state.month)||0)/12);
    board=`A ${year} agency with ${clients.length} active client seat${clients.length===1?"":"s"}, ${state.focusTotal||0} daily focus units, a lead desk, hiring controls, and a capability tree.`;
    conditions=`The agency opens with ${money(state.cash||0)} cash, ${prospects.length} visible prospect${prospects.length===1?"":"s"}, and paid search as its only unlocked buying discipline.${incident?` ${cleanOpeningName(incident.label)} already needs attention.`:" The first client's routine service is due."}`;
    firstMove="Operate the due founding account before spending scarce focus on growth. Client media budget is not agency revenue.";
  }
  return Object.freeze({mode,seed:SEED,slides:Object.freeze([
    Object.freeze({kicker:"Your role",title:MODE_NAME[mode],body:role,footer:`Win condition: ${objective}`}),
    Object.freeze({kicker:"What is on the board",title:"Know the objects before the metrics",body:board,footer:setup}),
    Object.freeze({kicker:`Seed ${SEED} · actual opening state`,title:"What is happening right now",body:conditions,footer:`Failure pressure: ${MODE_FAILURE[mode]}`}),
    Object.freeze({kicker:"First assignment",title:"Make one deliberate move",body:firstMove,footer:mode===1&&tutorialQueryRequested()?"The guided steps use a fixed scenario and verify each action.":"The simulation remains deterministic for this seed and setup."})
  ])});
}
function guidedOpeningRequested(){try{const params=new URLSearchParams(location.search||"");return params.get("guided")==="1"||params.get("tutorial")==="1";}catch(e){return false;}}
function clearOpeningBriefQuery(){try{const params=new URLSearchParams(location.search||"");params.delete("brief");params.delete("guided");
  if(history&&history.replaceState)history.replaceState(null,"",params.toString()?`?${params.toString()}`:(location.pathname||""));}catch(e){}}
function finishOpeningBrief(){const actionTutorial=tutorialQueryRequested();clearOpeningBriefQuery();if(typeof markRunEntered==="function")markRunEntered();close();
  if(typeof initTutorial==="function"&&actionTutorial)initTutorial({force:true});else if(typeof bindTutorialRefresh==="function")bindTutorialRefresh();return true;}
function renderOpeningBrief(){const slide=openingBriefSlides[openingBriefIndex];if(!slide)return finishOpeningBrief();
  show(`<div class="run-opening"><div class="opening-step">Run briefing · ${openingBriefIndex+1}/${openingBriefSlides.length}</div><div class="mission-icon" aria-hidden="true">${MODE_MENU_META[MODE].icon}</div>
    <div class="eyebrow">${slide.kicker}</div><h2>${slide.title}</h2><p>${slide.body}</p><div class="opening-footer">${slide.footer}</div>
    <div class="wizard-footer">${openingBriefIndex?'<button class="btn wizard-back" id="openingBack" type="button">Back</button>':""}${guidedOpeningRequested()?"":'<button class="btn" id="openingSkip" type="button">Skip briefing</button>'}<button class="btn wizard-primary" id="openingNext" type="button">${openingBriefIndex===openingBriefSlides.length-1?(tutorialQueryRequested()?"Begin guided Day 1":"Enter command center"):"Continue"}</button></div></div>`,"structure",{learning:false,definitions:true,menu:true});
  const back=document.getElementById("openingBack"),skip=document.getElementById("openingSkip"),next=document.getElementById("openingNext");if(back)back.onclick=()=>{openingBriefIndex--;renderOpeningBrief();};
  if(skip)skip.onclick=finishOpeningBrief;
  if(next)next.onclick=()=>{openingBriefIndex++;renderOpeningBrief();};return true;}
function showRunOpening(){const before=JSON.stringify(S),model=openingBriefModel();openingBriefSlides=Array.from(model.slides);openingBriefIndex=0;
  if(JSON.stringify(S)!==before)throw new Error("Opening briefing mutated simulation state");return renderOpeningBrief();}

/* ---------------- contextual mode briefing ---------------------------------------------- */
function modeBriefingNotes(mode){
  if(mode===0)return `<ul><li>Read search intent before CTR; cheap DIY clicks can still be useless to a hiring client.</li>
    <li>Lost to rank calls for bid or relevance work. Lost to budget calls for more budget or tighter scope.</li>
    <li>Quality Score diagnoses expected CTR, ad relevance, and landing-page experience; it is not the client result.</li>
    <li>Client trust responds to results, judgment, transparency, responsiveness, and whether commitments are completed.</li></ul>`;
  if(mode===5)return `<ul><li>Shared cash and credit connect every advertiser workstream even when their media ledgers stay separate.</li>
    <li>Platform claims can overlap. Compare them with blended modeled MER and the actual liquidity position.</li>
    <li>Search has finite demand; social has creative fatigue; programmatic and CTV carry view-through uncertainty.</li>
    <li>Three consecutive 30-day gates test return, attribution integrity, liquidity, and concentration.</li></ul>`;
  if(mode===6)return `<ul><li>Client media spend is not agency revenue. Retainers and earned bonuses pay payroll, tools, service, and growth.</li>
    <li>Every client consumes attention according to size and business model; a full roster can still be a weak agency.</li>
    <li>Hiring, specialization, and the capability tree trade current liquidity for future capacity.</li>
    <li>The 2027 result uses cumulative operating profit and liquidity, including an optional one-way affiliate pivot.</li></ul>`;
  const extra=mode===2?"Earned value settles late, so compare aligned windows before reacting.":mode===3?"Creative requests need lead time; a live slot without approved inventory is an operations failure.":mode===4?"Platform lanes have distinct capacity, auction, fatigue, and attribution behavior.":"An ad is the delivery object; its creative is the message people actually experience.";
  return `<ul><li>${extra}</li><li>Modeled outcome value and attributed value answer different questions; a gap is a diagnosis, not automatically a failure.</li>
    <li>Fatigue belongs to one creative. Saturation belongs to the reachable audience and does not reset when creative changes.</li>
    <li>Win by the all-in account objective, not by optimizing one attractive card metric in isolation.</li></ul>`;
}
function briefing(options={}){
  const backToWizard=options.returnToWizard?wizardDraft(options.returnToWizard):null,
    mode=backToWizard?backToWizard.mode:MODE,days=backToWizard?backToWizard.days:DAYS,
    budget=backToWizard?backToWizard.budget:DAILY,stage=backToWizard?backToWizard.stage:CLASSIC_STAGE,
    meta=MODE_MENU_META[mode],flavor=backToWizard?(FLAVOR_BY_ID[backToWizard.flavor]||currentFlavor()):currentFlavor(),
    showAnalogy=backToWizard?backToWizard.analogies:analogiesEnabled();
  show(`<div class="focused-briefing"><div class="mission-preflight"><div class="mission-icon" aria-hidden="true">${meta.icon}</div><div>
      <div class="eyebrow">${backToWizard?"Selected mission":"Current mission"} · ${MODE_SCOPE_TITLE[mode]}</div><h2>${MODE_NAME[mode]}</h2><p>${meta.promise}</p></div></div>
    <section class="mission-objective"><small>Objective</small><strong>${MODE_OBJECTIVE[mode]}</strong></section>
    <div class="mission-scan"><section><small>Watch first</small><ul>${meta.watch.map(item=>`<li>${item}</li>`).join("")}</ul></section>
      <section><small>${backToWizard?"Selected setup":"Current setup"}</small><p><b>${wizardPeriodText(mode,days)}</b><span>${wizardBudgetText(mode,budget)}</span>${mode===0?`<span>${CSTAGE_NAME[stage]}</span>`:""}</p></section></div>
    <details class="mission-details"><summary>Operating notes</summary><div class="prose">${modeBriefingNotes(mode)}</div></details>
    ${showAnalogy?`<details class="mission-details"><summary>${flavor.mark} ${flavor.name} explanation</summary><div class="prose"><p>${flavor.premise}</p><p>${flavor.signature}</p></div></details>`:""}
    <div class="wizard-footer"><button class="btn wizard-back" id="closeB" type="button">${backToWizard?"Back to run setup":"Back to the simulation"}</button>
      <button class="btn" id="briefingGuide" type="button">${ACTIVE_PROFILE==="specialist"?"Open account playbook":"Open Field Guide"}</button>
      ${backToWizard?"":'<button class="btn" id="briefingSetup" type="button">Choose another challenge</button>'}</div></div>`,"structure",{
        learning:false,definitions:true,menu:true,loreFlavor:backToWizard?backToWizard.flavor:ACTIVE_FLAVOR,
        loreAnalogies:backToWizard?backToWizard.analogies:analogiesEnabled()});
  const closeButton=document.getElementById("closeB");if(closeButton)closeButton.onclick=()=>backToWizard?setupWizard(backToWizard,"mission"):close();
  const guide=document.getElementById("briefingGuide");if(guide)guide.onclick=()=>ACTIVE_PROFILE==="specialist"?specialistGuide("00"):loreBook("01");
  const setup=document.getElementById("briefingSetup");if(setup)setup.onclick=()=>setupWizard({origin:"briefing"},"intent");
}
