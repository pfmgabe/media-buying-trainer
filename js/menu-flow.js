"use strict";

/* ---------------- staged front door -------------------------------------------------------
   Navigation is presentation-only until launchWizardRun(). No step consumes RNG, changes S,
   writes run configuration, or swaps the active analogy while the player is still browsing. */
const MENU_INTENTS=Object.freeze({
  learn:Object.freeze({icon:"🎯",title:"Learn the fundamentals",copy:"Start with one account and a guided first three days.",meta:"Recommended first run"}),
  practice:Object.freeze({icon:"🧠",title:"Practice one skill",copy:"Choose search, cash flow, creative operations or channel management.",meta:"Four focused challenges"}),
  campaign:Object.freeze({icon:"🌌",title:"Run a long campaign",copy:"Manage a portfolio or build an agency over several sessions.",meta:"Advanced play"})
});
const ONBOARDING_PREF_LEGACY_KEY="ttm.onboarding.v2",TUTORIAL_SEED=2601;
const AGENCY_WIZARD_DEFAULT_NAME="Moonrise Media";
const AGENCY_WIZARD_MODEL_FALLBACK=Object.freeze({
  holding_company:Object.freeze({id:"holding_company",label:"Holding Company",icon:"🏦",selectionCopy:"Operate company-owned offers. The company funds the media, waits for payouts and carries every loss.",
    playerRole:"You choose offers, channels, budgets, tracking and creative for campaigns the company owns.",startingSituation:"The company opens with three owned offers and no clients.",
    channelRule:"There are no retainers or client-loss events. Cash timing, platform access and compliance can still close the company."}),
  creative_agency:Object.freeze({id:"creative_agency",label:"Full-Service Creative Agency",icon:"🎨",selectionCopy:"Sell campaign strategy, ad production and media planning to clients.",
    playerRole:"You learn what a client sells, develop the message and choose paid social or traditional placements.",startingSituation:"The agency opens with one client whose local service area needs a campaign and production plan. The client may be in another time zone.",
    channelRule:"Paid search is never offered. Outdoor, radio, cable and paid social define the service."}),
  digital_agency:Object.freeze({id:"digital_agency",label:"Digital Marketing Agency",icon:"🔎",selectionCopy:"Sell measurable customer acquisition, beginning with paid search.",
    playerRole:"You manage search intent, bids, landing pages, measurement and client communication.",startingSituation:"The agency opens with one lead-generation client whose local service area has an inherited paid-search account. The client may be in another time zone.",
    channelRule:"Paid search is available now. A full creative department and additional digital channels come later."})
});
const AGENCY_WIZARD_HQ_FALLBACK=Object.freeze([
  Object.freeze({id:"portland-or",city:"Portland",state:"Oregon",stateCode:"OR",timezone:"America/Los_Angeles",region:"pacific_northwest",facilitiesCostMultiplier:1.02})
]);
const MODE_FAILURE=Object.freeze({
  0:"Lose the client by missing results, trust, or explicit commitments.",
  1:"Finish without reaching the all-in account return objective.",
  2:"Finish below the profit target after treating delayed payments as failed performance.",
  3:"Run out of approved replacement ads or miss the account objective.",
  4:"Put too much budget in one place, repeatedly show ads to the same people or miss the account objective.",
  5:"Run out of cash and credit, or fail the required monthly reviews.",
  6:"Close the company by failing a required opening contract or monthly operating bill, or end 2027 below the profit and cash targets."
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

function normalizeAgencyWizardName(value,fallback=AGENCY_WIZARD_DEFAULT_NAME){
  let clean=String(value??"");try{clean=clean.normalize("NFKC");}catch(e){}
  clean=clean.replace(/[\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,48);
  return clean.length>=2?clean:fallback;
}
function wizardEscape(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function agencyWizardModels(){return typeof AGENCY_STARTER_MODELS!=="undefined"&&AGENCY_STARTER_MODELS?AGENCY_STARTER_MODELS:AGENCY_WIZARD_MODEL_FALLBACK;}
function agencyWizardLocations(){return typeof AGENCY_HQ_LOCATIONS!=="undefined"&&Array.isArray(AGENCY_HQ_LOCATIONS)&&AGENCY_HQ_LOCATIONS.length?AGENCY_HQ_LOCATIONS:AGENCY_WIZARD_HQ_FALLBACK;}
function agencyWizardModel(id){const models=agencyWizardModels();return models[id]||models.digital_agency||Object.values(models)[0];}
function agencyWizardHq(id){const locations=agencyWizardLocations();return locations.find(item=>item.id===id)||locations.find(item=>item.id==="portland-or")||locations[0];}
function agencyWizardLocationLabel(location){return location?`${location.city}, ${location.stateCode||location.state}`:"Portland, OR";}
function agencyWizardTimezoneLabel(locationOrTimezone){
  const timezone=typeof locationOrTimezone==="string"?locationOrTimezone:locationOrTimezone?.timezone;
  return ({"America/Los_Angeles":"Pacific","America/Phoenix":"Mountain","America/Denver":"Mountain","America/Chicago":"Central",
    "America/New_York":"Eastern","America/Anchorage":"Alaska","Pacific/Honolulu":"Hawaii"})[timezone]||"Local";
}
function agencyWizardFacilitiesLabel(location){
  const multiplier=Number(location?.facilitiesCostMultiplier)||1,delta=Math.round(Math.abs(multiplier-1)*100);
  if(delta<1)return "At the game baseline";
  return `${delta}% ${multiplier>1?"above":"below"} the game baseline`;
}
function agencyHqEffectMarkup(location){return `<b>${wizardEscape(agencyWizardLocationLabel(location))}</b>
  <span><small>Workday clock</small>${wizardEscape(agencyWizardTimezoneLabel(location))} time</span>
  <span><small>Estimated facilities and administration cost</small>${wizardEscape(agencyWizardFacilitiesLabel(location))}</span>`;}
function agencyWizardModelTitle(id){return ({holding_company:"Holding Company",creative_agency:"Full-Service Creative Agency",digital_agency:"Digital Marketing Agency"})[id]||agencyWizardModel(id).label;}
function agencyWizardModelCopy(model){
  if(model.id==="holding_company")return {sale:"Company-owned offers and customer leads",start:"No clients. The company begins with owned campaigns and funds every media dollar.",rule:"Payout delays, compliance and channel concentration replace client-retention risk."};
  if(model.id==="creative_agency")return {sale:"Campaign strategy, ad production and media planning",start:"One client with a defined local service area. The client may work in another time zone and needs a campaign idea, production plan and placement choice.",rule:"Paid search is unavailable. Paid social, outdoor, radio and cable can become core services."};
  return {sale:"Measurable customer acquisition for client businesses",start:"One lead-generation client with a defined local service area and an inherited paid-search account. The client may work in another time zone.",rule:"Paid search is strongest at the start. A full creative department comes later."};
}
function agencyWizardCurrentIdentity(mode){
  if(Number(mode)!==6)return null;
  const stateIdentity=typeof S!=="undefined"&&S?.agencyIdentity?S.agencyIdentity:{},query=typeof QUERY!=="undefined"&&QUERY?QUERY:null;
  return {name:stateIdentity.name||query?.get("agencyName")||AGENCY_WIZARD_DEFAULT_NAME,
    hqId:stateIdentity.hqId||query?.get("hq")||"portland-or",agencyType:stateIdentity.agencyType||query?.get("agencyType")||"digital_agency"};
}

function wizardDraft(raw={}){
  const prefs=readOnboardingPrefs();
  const requested=Number(raw.mode),mode=MODE_IDS.includes(requested)?requested:MODE;
  const fallback=mode===MODE?{days:DAYS,budget:DAILY}:savedConfigFor(mode);
  const cfg=cleanConfig(mode,{days:raw.days??fallback.days,budget:raw.budget??fallback.budget});
  const flavor=FLAVOR_BY_ID[raw.flavor]?raw.flavor:(FLAVOR_BY_ID[prefs.flavor]?prefs.flavor:ACTIVE_FLAVOR),
    tutorial=raw.tutorial===undefined?(raw.guided===undefined?prefs.tutorial:!!raw.guided):!!raw.tutorial,
    guidance=DENSITY_LEVELS.includes(raw.guidance)?raw.guidance:prefs.guidance;
  const currentIdentity=agencyWizardCurrentIdentity(mode)||{};
  const agencyName=normalizeAgencyWizardName(raw.agencyName??currentIdentity.name),hq=agencyWizardHq(raw.hq??raw.hqId??currentIdentity.hqId),
    agencyType=agencyWizardModel(raw.agencyType??currentIdentity.agencyType).id;
  return {origin:raw.origin||"menu",intent:raw.intent||MODE_MENU_META[mode].intent,mode,
    stage:Math.max(1,Math.min(3,Number(raw.stage)||(mode===0&&MODE===0?CLASSIC_STAGE:1))),
    days:cfg.days,budget:cfg.budget,flavor,analogies:raw.analogies===undefined?prefs.analogies:!!raw.analogies,
    tutorial,guidance,guided:tutorial,starter:raw.starter===true,customized:raw.customized===true,
    agencyName,hq:hq.id,hqId:hq.id,agencyType};
}
function wizardWithMode(raw,mode,intent=MODE_MENU_META[mode].intent){
  const cfg=mode===MODE?{days:DAYS,budget:DAILY}:savedConfigFor(mode);
  return wizardDraft({...raw,intent,mode,days:cfg.days,budget:cfg.budget,
    stage:mode===0?(MODE===0?CLASSIC_STAGE:1):1,starter:false,customized:false});
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
function agencyMissionStakes(){
  return `<details class="agency-operating-statement">
    <summary><span>Your role and the agency's monthly costs</span><em>You manage media buying. The agency pays staff and operating costs.</em></summary>
    <div class="agency-statement-body">
      <p class="agency-role-brief"><b>You play one media buyer.</b> Your account decisions affect client results, renewals and the fees that support the company. Hiring and company initiatives change your capacity, costs and risk; they do not make you play every department.</p>
      <div class="agency-cost-breakdown" aria-label="Agency operating-cost categories">
        <div class="agency-cost-row is-category"><span aria-hidden="true">👥</span><b>People</b><small>Founder compensation, employee payroll, benefits, recruiting and severance</small></div>
        <div class="agency-cost-row is-category"><span aria-hidden="true">🖥️</span><b>Operations</b><small>Software, data, infrastructure, equipment, facilities, insurance and professional services</small></div>
        <div class="agency-cost-row is-category"><span aria-hidden="true">🤝</span><b>Growth</b><small>Sales, events and partnerships use cash now and can increase the number of prospective clients available next month</small></div>
      </div>
      <div class="agency-obligation-warning is-tight"><b>Short-term fail state</b><span>At month close, the game posts a monthly operating statement and applies operating cash, then available credit, to bills due. If that cannot cover the bills, the agency closes, even when client work looks profitable on paper.</span></div>
    </div>
  </details>`;
}
function wizardProgress(step){
  const help=["lens","guidance"].includes(step),challenge=["intent","mode","stage"].includes(step),
    setup=["agency-identity","agency-model","period","budget"].includes(step),start=["mission","starter"].includes(step);
  return `<ol class="wizard-progress" aria-label="New run progress">
    <li class="${help?"active":challenge||setup||start?"done":""}" ${help?'aria-current="step"':""}><span>1</span>Help</li>
    <li class="${challenge?"active":setup||start?"done":""}" ${challenge?'aria-current="step"':""}><span>2</span>Challenge</li>
    <li class="${setup?"active":start?"done":""}" ${setup?'aria-current="step"':""}><span>3</span>Setup</li>
    <li class="${start?"active":""}" ${start?'aria-current="step"':""}><span>4</span>Start</li></ol>`;
}
function wizardFirstSetupStep(mode){
  if(mode===0)return "stage";
  if(mode===6)return "agency-identity";
  return CONFIG_SPECS[mode]?.fixedPeriod?"budget":"period";
}
function wizardBudgetBackStep(draft){
  if(draft.mode===6)return "agency-model";
  if(!CONFIG_SPECS[draft.mode]?.fixedPeriod)return "period";
  return draft.mode===0?"stage":"mode";
}
function wizardBackStep(draft,step){
  if(step==="lens"){mainMenu();return;}
  if(step==="guidance"){setupWizard(draft,"lens");return;}
  if(step==="starter"){setupWizard(draft,"guidance");return;}
  if(step==="intent"){draft.tutorial?setupWizard(draft,"guidance"):mainMenu();return;}
  if(step==="mode"){setupWizard(draft,"intent");return;}
  if(step==="stage"){setupWizard(draft,"mode");return;}
  if(step==="agency-identity"){setupWizard(draft,"mode");return;}
  if(step==="agency-model"){setupWizard(draft,"agency-identity");return;}
  if(step==="period"){setupWizard(draft,draft.mode===0?"stage":"mode");return;}
  if(step==="budget"){setupWizard(draft,wizardBudgetBackStep(draft));return;}
  if(step==="mission"){setupWizard(draft,draft.mode===6?"budget":draft.customized?"budget":draft.mode===0?"stage":"mode");return;}
  mainMenu();
}
function wizardSaveBadge(record){
  if(!record)return "";
  return `<span class="wizard-save-badge">● Saved · ${compactSaveProgress(record)}</span>`;
}
function wizardModeCard(mode,selectedMode){
  const meta=MODE_MENU_META[mode],cfg=savedConfigFor(mode),record=saveRecord(ACTIVE_PROFILE,mode);
  return `<article class="wizard-mode-card">
    <button class="wizard-mode-select" type="button" data-mode="${mode}" aria-pressed="${mode===selectedMode}" aria-labelledby="wizard-mode-${mode}-scope wizard-mode-${mode}-name" aria-describedby="wizard-mode-${mode}-promise wizard-mode-${mode}-stats">
      <span class="wizard-mode-icon" aria-hidden="true">${meta.icon}</span>
      <span class="wizard-mode-copy"><small id="wizard-mode-${mode}-scope">${MODE_SCOPE_TITLE[mode]}</small><b id="wizard-mode-${mode}-name">${MODE_NAME[mode]}</b><em id="wizard-mode-${mode}-promise">${meta.promise}</em></span>
      <span class="wizard-mode-stats" id="wizard-mode-${mode}-stats"><i>${meta.difficulty}</i><i>${meta.session}</i><i>${wizardPeriodText(mode,cfg.days)}</i></span>
    </button>
    ${record?`<div class="wizard-mode-save">${wizardSaveBadge(record)}<button class="btn" type="button" data-resume-mode="${mode}" aria-label="Resume ${MODE_NAME[mode]}">Resume saved run</button></div>`:""}
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
  const draft=wizardDraft(raw);
  if(step==="starter"){
    const defaults=cleanConfig(1,{days:CONFIG_SPECS[1].days,budget:CONFIG_SPECS[1].budget});
    Object.assign(draft,{intent:"learn",mode:1,days:defaults.days,budget:defaults.budget,starter:true,customized:false});
  }
  const meta=MODE_MENU_META[draft.mode];
  /* A fixed rule is context, not a player decision. Canonicalize direct calls as well as
     ordinary menu navigation so no fixed-period mode can render a fake choice screen. */
  if(step==="period"&&CONFIG_SPECS[draft.mode]?.fixedPeriod){setupWizard(draft,"budget");return;}
  if(step==="mode"&&MODE_MENU_META[draft.mode]?.intent!==draft.intent){
    const firstMode=MODE_IDS.find(mode=>MODE_MENU_META[mode].intent===draft.intent);
    if(firstMode!==undefined)Object.assign(draft,wizardWithMode(draft,firstMode,draft.intent));
  }
  let html="";
  if(step==="lens"){
    const selected=FLAVOR_BY_ID[draft.flavor]||currentFlavor(),index=Math.max(0,ORDERED_FLAVORS.findIndex(item=>item.id===selected.id)),pure=!draft.analogies;
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Help 1 of 2 · analogy</div><h2>Choose an analogy, or use media-buying terms.</h2>
      <p>The analogy changes explanations only. The media-buying term always appears with it.</p></div>
      <div class="wizard-lens-carousel"><button class="btn lens-arrow" id="lensPrev" type="button" aria-label="Previous analogy">←</button>
        <article class="wizard-lens-preview"><small>${selected.mark} ANALOGY ${index+1} OF ${ORDERED_FLAVORS.length}</small><b>${selected.name}</b><p>${selected.premise}</p><em>${selected.signature}</em></article>
        <button class="btn lens-arrow" id="lensNext" type="button" aria-label="Next analogy">→</button></div>
      <button class="wizard-pure-toggle" id="pureLens" type="button" aria-pressed="${pure}"><span aria-hidden="true">📊</span><b>${pure?"Media-buying terms only":"Use media-buying terms only"}</b><small>Plain-English definitions will still be available.</small></button>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepLens" type="button">Continue with ${pure?"media-buying terms":selected.name}</button></div>`;
  }else if(step==="guidance"){
    const levels={guided:["Detailed","Shows definitions beside key terms and explains why choices matter."],compact:["Standard","Keeps essential definitions and shorter cards."],analyst:["Expert","Shows denser evidence with less coaching."]};
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Help 2 of 2 · guidance</div><h2>How much help should appear on screen?</h2><p>You can change this during the run.</p></div>
      <div class="wizard-guidance-list">${Object.entries(levels).map(([id,[label,copy]])=>`<button class="wizard-guidance" type="button" data-guidance="${id}" aria-pressed="${draft.guidance===id}"><b>${label}</b><span>${copy}</span></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepGuidance" type="button">Continue</button></div>`;
  }else if(step==="intent"){
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">New run · goal</div><h2>What do you want to practice?</h2>
      <p>Choose the kind of work you want to do.</p></div>
      <div class="wizard-intents">${Object.entries(MENU_INTENTS).map(([id,item])=>`<button class="wizard-intent" type="button" data-intent="${id}" aria-pressed="${draft.intent===id}">
        <span aria-hidden="true">${item.icon}</span><b>${item.title}</b><em>${item.copy}</em><small>${item.meta}</small></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepIntent" type="button">Continue</button></div>`;
  }else if(step==="mode"){
    const modes=MODE_IDS.filter(mode=>MODE_MENU_META[mode].intent===draft.intent),intent=MENU_INTENTS[draft.intent];
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">${intent.icon} ${intent.title}</div><h2>Choose one challenge</h2>
      <p>Each challenge focuses on a different part of the job. You will see the account briefing before Day 1.</p></div>
      <div class="wizard-mode-list">${modes.map(mode=>wizardModeCard(mode,draft.mode)).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepMode" type="button">Continue</button></div>`;
  }else if(step==="stage"){
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">🔎 Paid Search Account</div><h2>Choose a client situation</h2>
      <p>Each chapter adds pressure without changing the core search-account controls.</p></div>
      <div class="wizard-stage-list">${[1,2,3].map(stage=>`<button class="wizard-stage" type="button" data-stage="${stage}" aria-pressed="${stage===draft.stage}">
        <b>${CSTAGE_NAME[stage]}</b><span>${CSTAGE_BLURB[stage]}</span></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepStage" type="button">Continue</button></div>`;
  }else if(step==="agency-identity"){
    const hq=agencyWizardHq(draft.hq),locations=agencyWizardLocations();
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Agency setup · 1 of 3</div><h2>Name the company and choose its headquarters.</h2>
      <p>The headquarters affects monthly facilities cost and the time-zone distance to clients. It does not limit the agency to local work.</p></div>
      <div class="agency-identity-form">
        <label for="agencyNameCfg"><span>Company name</span><input id="agencyNameCfg" type="text" minlength="2" maxlength="48" autocomplete="organization" value="${wizardEscape(draft.agencyName)}" aria-describedby="agencyNameHint"></label>
        <small id="agencyNameHint">Use 2 to 48 characters. The name appears in the career briefing, dashboard and save.</small>
        <label for="agencyHqCfg"><span>Headquarters</span><select id="agencyHqCfg" aria-describedby="agencyHqEffect">${locations.map(location=>`<option value="${wizardEscape(location.id)}" ${location.id===hq.id?"selected":""}>${wizardEscape(agencyWizardLocationLabel(location))}</option>`).join("")}</select></label>
        <div class="agency-hq-effect" id="agencyHqEffect" role="status" aria-live="polite">${agencyHqEffectMarkup(hq)}</div>
      </div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepAgencyIdentity" type="button">Continue</button></div>`;
  }else if(step==="agency-model"){
    const models=agencyWizardModels();
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Agency setup · 2 of 3</div><h2>What kind of company are you building?</h2>
      <p>This choice changes the work, starting systems, available media and tutorial. It cannot be changed after the career begins.</p></div>
      <div class="agency-model-list">${["holding_company","creative_agency","digital_agency"].map(id=>{const model=models[id]||AGENCY_WIZARD_MODEL_FALLBACK[id],copy=agencyWizardModelCopy(model);return `<button class="agency-model-choice" type="button" data-agency-model="${id}" aria-pressed="${draft.agencyType===id}" aria-labelledby="agency-model-${id}">
        <span class="agency-model-icon" aria-hidden="true">${wizardEscape(model.icon||"")}</span><span class="agency-model-heading"><b id="agency-model-${id}">${wizardEscape(agencyWizardModelTitle(id))}</b><em>${wizardEscape(model.selectionCopy||copy.sale)}</em></span>
        <span class="agency-model-fact"><small>What you sell</small><strong>${wizardEscape(copy.sale)}</strong></span>
        <span class="agency-model-fact"><small>Starting position</small><strong>${wizardEscape(copy.start)}</strong></span>
        <span class="agency-model-rule"><small>Defining rule</small><strong>${wizardEscape(copy.rule)}</strong></span></button>`;}).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepAgencyModel" type="button">Continue</button></div>`;
  }else if(step==="period"){
    const spec=CONFIG_SPECS[draft.mode],label=draft.mode===6?"Career horizon":draft.mode===5?"Mandate length":"Run length",unit=draft.mode===6?"months":"days";
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Run setup · one choice</div><h2>How long should this run last?</h2><p>${spec.fixedPeriod?`This career always covers ${spec.days} ${unit}.`:`The standard ${MODE_SCOPE_TITLE[draft.mode].toLowerCase()} run lasts ${spec.days} ${unit}.`}</p></div>
      <div class="single-config"><label>${label}<input id="daysCfg" type="number" inputmode="numeric" min="${spec.minDays}" max="${spec.maxDays}" step="${spec.periodStep||1}" value="${draft.days}" ${spec.fixedPeriod?"disabled":""}></label>
        <p>${spec.fixedPeriod?`This campaign is fixed at ${spec.days} ${unit}.`:`Allowed: ${spec.minDays} to ${spec.maxDays} ${unit}${draft.mode===5?", in 30-day blocks":""}.`}</p></div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepPeriod" type="button">Use ${draft.days} ${unit} · choose budget</button></div>`;
  }else if(step==="budget"){
    const spec=CONFIG_SPECS[draft.mode],label=draft.mode===6?"Starting operating reserve":draft.mode===5?"Daily portfolio authorization":"Daily account budget",
      meaning=draft.mode===6?"Agency Career runs from 2017 through 2027. Choose the company cash available at the start. This reserve pays agency obligations while client fees are still being earned or collected; it is not client ad spend.":draft.mode===5?"This is the most the entire portfolio may spend in one day.":"This is the most the account may spend in one day.",
      question=draft.mode===6?"How much cash should the agency start with?":draft.mode===5?"How much can the portfolio spend each day?":"How much can the account spend each day?";
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">${draft.mode===6?"Agency setup · 3 of 3":"Run setup · one choice"}</div><h2>${question}</h2><p>${meaning}</p></div>
      <div class="single-config${draft.mode===6?" agency-reserve-config":""}"><label>${label}<input id="budgetCfg" type="number" inputmode="numeric" min="${spec.minBudget}" max="${spec.maxBudget}" step="${spec.inputStep}" value="${draft.budget}"></label><p>Allowed: ${money(spec.minBudget)} to ${money(spec.maxBudget)}.</p>${draft.mode===6?`<p class="agency-reserve-note">During play, the dashboard shows operating cash plus available credit, estimated runway and each month's operating statement.</p>`:""}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepBudget" type="button">Use ${money(draft.budget)} · review run</button></div>`;
  }else if(step==="starter"){
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Your first run</div><h2>Your first account</h2>
      <p>You will manage one advertiser for 12 days. For the first three days, the game points to one action at a time and explains the result. After that, you finish the run on your own.</p></div>
      <div class="starter-assignment">
        <div><small>Your job</small><b>Set budgets, read the results and improve the account.</b></div>
        <div><small>Your goal</small><b>${MODE_OBJECTIVE[1]}</b></div>
        <div><small>Starting setup</small><b>${wizardPeriodText(1,draft.days)} · ${wizardBudgetText(1,draft.budget)}</b></div>
      </div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="launchStarter" type="button">Start guided run</button></div>`;
  }else{
    const currentFlavorRecord=FLAVOR_BY_ID[draft.flavor]||currentFlavor(),activeProgress=currentRunHasProgress(),sameModeProgress=activeProgress&&draft.mode===MODE,
      launchText=activeProgress?"Save current run and start":"Start run",agencyModel=draft.mode===6?agencyWizardModel(draft.agencyType):null,
      agencyHq=draft.mode===6?agencyWizardHq(draft.hq):null,agencyModelDetails=agencyModel?agencyWizardModelCopy(agencyModel):null,
      missionTitle=draft.mode===6?draft.agencyName:MODE_NAME[draft.mode],missionEyebrow=draft.mode===6?`Agency Career · ${agencyWizardModelTitle(draft.agencyType)} · ${agencyWizardLocationLabel(agencyHq)}`:`${MODE_SCOPE_TITLE[draft.mode]} · ${meta.difficulty}`,
      missionPromise=draft.mode===6?agencyModel.playerRole:meta.promise,
      failure=draft.mode===6&&draft.agencyType==="holding_company"?"Run out of cash and available credit when monthly operating bills are due, or end 2027 below the required profit and cash targets.":MODE_FAILURE[draft.mode];
    html=`${wizardProgress("mission")}<div class="mission-preflight">
      <div class="mission-icon" aria-hidden="true">${draft.mode===6?wizardEscape(agencyModel.icon||meta.icon):meta.icon}</div><div><div class="eyebrow">${wizardEscape(missionEyebrow)}</div><h2>${wizardEscape(missionTitle)}</h2>
      <p>${wizardEscape(missionPromise)}</p></div></div>
      <div class="mission-confirm-grid"><span>${wizardPeriodText(draft.mode,draft.days)}</span><span>${wizardBudgetText(draft.mode,draft.budget)}</span>${draft.mode===6?`<span>${wizardEscape(agencyWizardLocationLabel(agencyHq))}</span>`:draft.mode===0?`<span>${CSTAGE_NAME[draft.stage]}</span>`:""}</div>
      ${draft.mode===6?`<div class="agency-mission-summary"><section><small>What the company sells</small><strong>${wizardEscape(agencyModelDetails.sale)}</strong></section><section><small>Opening business</small><strong>${wizardEscape(agencyModelDetails.start)}</strong></section><section><small>Rule that shapes the career</small><strong>${wizardEscape(agencyModelDetails.rule)}</strong></section></div>`:""}
      <button class="btn mission-customize" id="customizeRun" type="button">Change ${CONFIG_SPECS[draft.mode]?.fixedPeriod?"starting reserve":"length or budget"}</button>
      <details class="mission-details mission-review"><summary>Review rules and learning settings</summary><div class="mission-review-body">
        <section class="mission-objective"><small>You win if</small><strong>${MODE_OBJECTIVE[draft.mode]}</strong></section>
        <section class="mission-failure"><small>You lose if</small><strong>${failure}</strong></section>
        ${draft.mode===6?agencyMissionStakes():""}
        <p>${draft.tutorial?(typeof TUTORIAL_SEEDS!=="undefined"&&TUTORIAL_SEEDS[draft.mode]?`Guided first ${(TUTORIAL_DB.modes&&TUTORIAL_DB.modes[draft.mode]?TUTORIAL_DB.modes[draft.mode]:TUTORIAL_DB.actions).filter(step=>step.kind==="run").length} days on a fixed teaching scenario, live conditions after`:draft.mode===6?`Guided first assignment for ${agencyWizardModelTitle(draft.agencyType)}`:"Guided opening briefing"):"Tutorial off; opening briefing only"} · ${({guided:"Detailed",compact:"Standard",analyst:"Expert"})[draft.guidance]} on-screen help · ${draft.analogies?`${currentFlavorRecord.name} analogy`:"Media-buying terms only"}</p>
      </div></details>
      ${activeProgress?`<div class="mission-warning"><b>We will save your current run first.</b><span>${sameModeProgress?"After the new run advances, its later autosaves can replace this mode's checkpoint.":"The current mode keeps a separate checkpoint."}</span></div>`:""}
      <div class="wizard-footer mission-actions"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="launchRun" type="button">${launchText}</button></div>`;
  }

  show(`<div class="setup-wizard" data-wizard-step="${step}">${html}</div>`,"structure",{
    wide:step==="mode"||step==="lens"||step==="agency-model",learning:step==="lens",rosetta:step==="lens",definitions:draft.tutorial||step==="mission",menu:true,
    loreFlavor:draft.flavor,loreAnalogies:draft.analogies});
  const back=document.getElementById("wizardBack");if(back)back.onclick=()=>wizardBackStep(draft,step);
  const markChoice=(selector,key,value)=>ov.querySelectorAll(selector).forEach(button=>button.setAttribute("aria-pressed",String(button.dataset[key]===String(value))));
  if(step==="lens"){
    const move=direction=>{const index=Math.max(0,ORDERED_FLAVORS.findIndex(item=>item.id===draft.flavor)),next=(index+direction+ORDERED_FLAVORS.length)%ORDERED_FLAVORS.length;
      setupWizard({...draft,flavor:ORDERED_FLAVORS[next].id,analogies:true},"lens");};
    const previous=document.getElementById("lensPrev"),next=document.getElementById("lensNext"),pure=document.getElementById("pureLens"),keep=document.getElementById("keepLens");
    if(previous)previous.onclick=()=>move(-1);if(next)next.onclick=()=>move(1);
    if(pure)pure.onclick=()=>setupWizard({...draft,analogies:!draft.analogies},"lens");
    if(keep)keep.onclick=()=>setupWizard(draft,"guidance");
  }
  if(step==="guidance"){
    ov.querySelectorAll("button[data-guidance]").forEach(button=>button.onclick=()=>{draft.guidance=button.dataset.guidance;markChoice("button[data-guidance]","guidance",draft.guidance);});
    const keep=document.getElementById("keepGuidance");if(keep)keep.onclick=()=>setupWizard(draft,draft.starter?"starter":"intent");
  }
  if(step==="intent"){
    ov.querySelectorAll("button[data-intent]").forEach(button=>button.onclick=()=>{draft.intent=button.dataset.intent;markChoice("button[data-intent]","intent",draft.intent);});
    const keep=document.getElementById("keepIntent");if(keep)keep.onclick=()=>setupWizard(draft,"mode");
  }
  if(step==="mode"){
    ov.querySelectorAll("button[data-mode]").forEach(button=>button.onclick=()=>{
      const next=wizardWithMode(draft,Number(button.dataset.mode),draft.intent);
      Object.assign(draft,next);markChoice("button[data-mode]","mode",draft.mode);
    });
    const keep=document.getElementById("keepMode");if(keep)keep.onclick=()=>setupWizard(draft,draft.mode===0?"stage":draft.mode===6?"agency-identity":"mission");
    ov.querySelectorAll("button[data-resume-mode]").forEach(button=>button.onclick=()=>{
      const record=saveRecord(ACTIVE_PROFILE,Number(button.dataset.resumeMode));resumeWizardRun(record,draft);
    });
  }
  if(step==="stage"){
    ov.querySelectorAll("button[data-stage]").forEach(button=>button.onclick=()=>{draft.stage=Number(button.dataset.stage);markChoice("button[data-stage]","stage",draft.stage);});
    const keep=document.getElementById("keepStage");if(keep)keep.onclick=()=>setupWizard(draft,"mission");
  }
  if(step==="agency-identity"){
    const nameInput=document.getElementById("agencyNameCfg"),hqInput=document.getElementById("agencyHqCfg"),effect=document.getElementById("agencyHqEffect"),keep=document.getElementById("keepAgencyIdentity");
    const updateHq=()=>{const hq=agencyWizardHq(hqInput?.value);if(effect)effect.innerHTML=agencyHqEffectMarkup(hq);};
    if(hqInput)hqInput.onchange=updateHq;
    if(keep)keep.onclick=()=>{const agencyName=normalizeAgencyWizardName(nameInput?.value,"");if(!agencyName){const status=document.getElementById("modalStatus");if(status)status.textContent="Enter a company name with at least two characters.";nameInput?.focus();return;}
      const hq=agencyWizardHq(hqInput?.value);setupWizard({...draft,agencyName,hq:hq.id,hqId:hq.id},"agency-model");};
  }
  if(step==="agency-model"){
    ov.querySelectorAll("button[data-agency-model]").forEach(button=>button.onclick=()=>{draft.agencyType=agencyWizardModel(button.dataset.agencyModel).id;markChoice("button[data-agency-model]","agencyModel",draft.agencyType);});
    const keep=document.getElementById("keepAgencyModel");if(keep)keep.onclick=()=>setupWizard(draft,"budget");
  }
  if(step==="period"){
    const input=document.getElementById("daysCfg"),keep=document.getElementById("keepPeriod");if(keep)keep.onclick=()=>{
      const cfg=cleanConfig(draft.mode,{days:input?input.value:draft.days,budget:draft.budget});setupWizard({...draft,days:cfg.days},"budget");};
    if(input&&keep){const update=()=>{const cfg=cleanConfig(draft.mode,{days:input.value,budget:draft.budget});keep.textContent=`Use ${cfg.days} ${draft.mode===6?"months":"days"} · choose budget`;};input.oninput=update;update();}}
  if(step==="budget"){
    const input=document.getElementById("budgetCfg"),keep=document.getElementById("keepBudget");if(keep)keep.onclick=()=>{
      const cfg=cleanConfig(draft.mode,{days:draft.days,budget:input?input.value:draft.budget});setupWizard({...draft,budget:cfg.budget,customized:true},"mission");};
    if(input&&keep){const update=()=>{const cfg=cleanConfig(draft.mode,{days:draft.days,budget:input.value});keep.textContent=`Use ${money(cfg.budget)} · review run`;};input.oninput=update;update();}}
  if(step==="mission"){
    const launch=document.getElementById("launchRun");if(launch)launch.onclick=()=>launchWizardRun(draft);
    const customize=document.getElementById("customizeRun");if(customize)customize.onclick=()=>setupWizard(draft,CONFIG_SPECS[draft.mode]?.fixedPeriod?"budget":"period");
  }
  if(step==="starter"){
    const launch=document.getElementById("launchStarter");if(launch)launch.onclick=()=>launchWizardRun(draft);
  }
}

function launchWizardRun(raw){
  const draft=wizardDraft(raw),cfg=cleanConfig(draft.mode,draft);
  if(!checkpointBeforeNavigation("before-setup-change",()=>setupWizard(draft,draft.starter?"starter":"mission")))return false;
  saveConfigFor(draft.mode,cfg);
  writeOnboardingPrefs({tutorial:draft.tutorial,guidance:draft.guidance,flavor:draft.flavor,analogies:draft.analogies});
  UI_PREFS={...UI_PREFS,analogies:!!draft.analogies,density:draft.guidance,tooltips:draft.guidance!=="analyst"};persistUiPrefs();
  setFlavor(draft.flavor,{persist:true,updateUrl:false,rerender:false});
  const p=new URLSearchParams(location.search);
  const actionTutorial=draft.tutorial&&typeof TUTORIAL_SEEDS!=="undefined"&&!!TUTORIAL_SEEDS[draft.mode];
  p.set("mode",draft.mode);p.set("days",cfg.days);p.set("budget",cfg.budget);p.set("seed",actionTutorial?TUTORIAL_SEEDS[draft.mode]:randomScenarioSeed());p.set("flavor",draft.flavor);p.set("autostart","1");p.set("brief","1");
  if(draft.mode===0)p.set("stage",draft.stage);else p.delete("stage");
  if(draft.mode===6){p.set("agencyName",normalizeAgencyWizardName(draft.agencyName));p.set("hq",agencyWizardHq(draft.hq).id);p.set("agencyType",agencyWizardModel(draft.agencyType).id);}
  else{p.delete("agencyName");p.delete("hq");p.delete("agencyType");}
  if(draft.tutorial)p.set("guided","1");else p.delete("guided");
  /* Arrival re-initializes the walkthrough with force, so no pre-launch progress reset is
     needed here — and with mode-scoped progress keys, writing from the launching mode's
     context would touch the wrong record. */
  if(actionTutorial)p.set("tutorial","1");
  else p.delete("tutorial");
  p.delete("resume");location.search=p.toString();return true;
}

/* Every deliberate fresh start, whether from the wizard, replay, new seed or next chapter, travels
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
function agencyOpeningIdentity(state){
  const source=state?.agencyIdentity||agencyWizardCurrentIdentity(6)||{},model=agencyWizardModel(source.agencyType),hq=agencyWizardHq(source.hqId||source.hq);
  return {name:normalizeAgencyWizardName(source.name),agencyType:model.id,model,hq};
}
function agencyOpeningOffer(client){
  if(!client)return null;const records=typeof AGENCY_OFFERS!=="undefined"&&Array.isArray(AGENCY_OFFERS)?AGENCY_OFFERS:[];
  return records.find(item=>item.id===client.offerId)||records.find(item=>item.vertical===client.vertical)||null;
}
function agencyOpeningConcept(client){
  if(!client)return null;const records=typeof AGENCY_AD_CONCEPTS!=="undefined"&&Array.isArray(AGENCY_AD_CONCEPTS)?AGENCY_AD_CONCEPTS:[];
  return records.find(item=>item.id===client.adConceptId)||records.find(item=>item.vertical===client.vertical&&item.channels?.includes(client.channel))||null;
}
function agencyOpeningOffice(client,identity){return agencyWizardHq(client?.officeId||identity.hq.id);}
function agencyOpeningTarget(client,office){
  const targets=Array.isArray(client?.targetStates)?client.targetStates.filter(Boolean):[];
  if(targets.includes("US")||client?.marketScope==="national")return "United States (national)";
  if(targets.length){const names=targets.map(code=>typeof AGENCY_STATE_NAMES!=="undefined"&&AGENCY_STATE_NAMES[code]?AGENCY_STATE_NAMES[code]:code);
    return `${names.join(", ")} (${client?.marketScope==="local"?"local":"regional"})`;}
  return `${office.state||office.stateCode} (local)`;
}
function agencyOwnedOfferDescription(funnel){
  const verticalId=funnel?.verticalId||"home-intent",records=typeof AFFILIATE_VERTICALS!=="undefined"&&Array.isArray(AFFILIATE_VERTICALS)?AFFILIATE_VERTICALS:[],
    vertical=records.find(item=>item.id===verticalId),fallback={"home-intent":["verified home-service inquiries","people actively looking for local repair or improvement help"],
      "consumer-finance":["qualified consumer-finance inquiries","people comparing a financial product or service"],wellness:["wellness product orders and inquiries","people researching a specific wellness need"],
      software:["consumer software trials","people looking for a tool that solves a specific task"],commerce:["direct-response product orders","people ready to compare and buy a product"]}[verticalId]||[vertical?.label||"owned acquisition offer","prospective customers who match the offer"];
  return {name:cleanOpeningName(funnel?.name)||vertical?.label||"First owned offer",product:fallback[0],audience:cleanOpeningName(funnel?.audience)||fallback[1],
    stakes:cleanOpeningName(funnel?.stakes)||"The customer and outcome must match what the payout partner accepts.",adConcept:cleanOpeningName(funnel?.adConcept)||"Opening offer explanation",
    adFormat:cleanOpeningName(funnel?.adFormat)||"direct-response ad"};
}
function openingBriefModel(mode=MODE,state=S){
  const meta=MODE_MENU_META[mode],objective=MODE_OBJECTIVE[mode],setup=`${wizardPeriodText(mode,DAYS)} · ${wizardBudgetText(mode,DAILY)}`;
  const roles={
    0:"You run paid search for one client. Read what people search for, improve the ads and protect the client's trust.",
    1:"You run one paid-media account. Choose where the daily budget goes, test ads and decide when the evidence is strong enough to spend more.",
    2:"You run campaigns while protecting the business's cash. A profitable day can still create a cash shortage when payments arrive late.",
    3:"You keep ads running while new creative moves from request to approval. Plan replacements before the live work wears out.",
    4:"You run one account across several platforms. Each platform behaves differently, so you must decide where the next dollar can work best.",
    5:"You run a portfolio of advertiser accounts. Shared cash, credit, tracking and operational problems can affect more than one account.",
    6:"You build a media-buying business from 2017 through 2027. Choose clients, hire a team, add services and protect the company's cash."
  };
  const dayLoops={
    0:"Inspect search intent and account health. Make one change. Run the day. Then compare the result with the client's goal.",
    1:"Inspect the account. Choose one action. Run the day. Then compare the ad result with the whole account.",
    2:"Set budgets. Run the day. Then compare value earned, money still pending and cash that has settled.",
    3:"Inspect fatigue and the creative pipeline. Request or rotate work. Run the day. Then check whether another replacement needs to be requested.",
    4:"Inspect each platform lane. Move or resize one allocation. Run the day. Then compare local results with account health.",
    5:"Check the portfolio, resolve the most urgent risk, allocate money and run the period. Then review cash and concentration.",
    6:"Service the accounts that need attention, make one growth decision and end the workday. Each month closes with company results."
  };
  let role=roles[mode]||meta.promise,board="",conditions="",firstMove="Read the starting evidence before changing a control.",customSlides=null;
  if(mode===0){const groups=Array.isArray(state.groups)?state.groups:[],business=typeof classicClientBusiness==="function"?classicClientBusiness(state.client?.businessId):null,
      inherited=typeof classicOpeningProfile==="function"?classicOpeningProfile(SEED):null;
    const chapter=CSTAGE_NAME[state.stage||CLASSIC_STAGE]||"Client chapter";
    board=`You have ${groups.length} active ad groups, their keywords and ads, and one client relationship. The client remembers promises and missed follow-ups.`;
    conditions=`${inherited?`Inherited account: ${inherited.label}. ${inherited.brief} `:""}${business?.name||"A service business"} starts ${chapter} with ${money(state.budget||DAILY)} available for media. ${state.client?.grievance?`The client's first concern: ${state.client.grievance}`:"The client wants clear, evidence-based updates."}`;
    firstMove="Read the client brief and the search terms. Then inspect Quality Score before changing a bid.";
  }else if(mode>=1&&mode<=4){const slots=Array.isArray(state.slots)?state.slots:[],event=state.dayState?.event,mood=state.dayState?.mood,
      inherited=typeof modernScenarioProfile==="function"?modernScenarioProfile(SEED,mode):null,
      formats=[...new Set(slots.map(slot=>typeof creativeFormatFor==="function"?creativeFormatFor(slot.c).label:slot.c?.format).filter(Boolean))],
      eventTarget=Number.isInteger(event?.target)&&slots[event.target]?slots[event.target]:null,
      opening=`Run conditions: ${inherited?.market?.label||"Ordinary market"}; ${inherited?.inheritance?.label||"balanced handoff"}. ${inherited?.market?.brief||""} ${inherited?.inheritance?.brief||""} Today's market: ${mood?.label||"Stable"}. ${event?.title||"No major disruption"}: ${event?.body||"Your opening budgets and ads will create the baseline."}${eventTarget?` Affected ad: ${eventTarget.c?.name||`Ad ${event.target+1}`}.`:""}`;
    if(mode===1){
      board=`You have one account and ${slots.length} active ads. Each ad has its own budget, message, format, fatigue and results.`;
      conditions=`${opening} Your starting formats are ${formats.join(", ")}.`;
      firstMove=tutorialQueryRequested()?"Select Run Day 1 without changing a budget. That day becomes your baseline.":"Run one unchanged day. Then compare the ad results with the whole account before making one small change.";
    }else if(mode===2){
      board=`You have ${slots.length} active ads and three money views: value earned, payments still pending and cash already received.`;
      conditions=`${opening} No payment has settled yet. Results from Day 1 will move into pending payments before they become cash.`;
      firstMove="Run one unchanged day. Then compare earned value, pending payments and settled cash before reacting.";
    }else if(mode===3){
      board=`You have ${slots.length} active ads and a creative pipeline. New work moves through building, review and approval before it can replace a live ad.`;
      conditions=`${opening} ${state.requests?.length||0} creative builds are in progress, and ${state.readyCreative?.length||0} approved replacements are ready.`;
      firstMove="Check fatigue, run a baseline and request a replacement before the weakest ad burns out.";
    }else{const lanes=[...new Set(slots.map(slot=>slot.plat&&PLATFORMS[slot.plat]?PLATFORMS[slot.plat].name:slot.plat).filter(Boolean))];
      board=`You have one account across ${lanes.length} platforms: ${lanes.join(", ")}. Each platform has its own demand, limits and reporting behavior.`;
      conditions=`${opening} Each of the ${slots.length} starting ads uses a different platform, so there is no opening audience overlap within a platform.`;
      firstMove="Run one unchanged day. Compare each platform with the whole account, then change only one budget or platform.";
    }
  }else if(mode===5){const accounts=Array.isArray(state.accounts)?state.accounts:[],families=new Set(accounts.map(account=>account.platform).filter(Boolean)),event=state.dayState?.event,mood=state.dayState?.mood,
      inherited=typeof NightmareEngine!=="undefined"&&NightmareEngine.openingProfile?NightmareEngine.openingProfile(SEED):null,
      eventTarget=event?.targetId?accounts.find(account=>account.id===event.targetId):null;
    board=`You have ${accounts.length} advertiser accounts across ${families.size} platforms. They share company cash, credit, tracking infrastructure and the team's attention.`;
    conditions=`Inherited portfolio: ${inherited?.portfolio?.label||"Balanced book"}. ${inherited?.portfolio?.brief||""} Operating condition: ${inherited?.operating?.label||"Ordinary stack"}. ${inherited?.operating?.brief||""} Today's portfolio: ${mood?.label||"Stable"}. ${event?.title||"No major disruption"}: ${event?.body||"The opening structure will shape the first period."}${eventTarget?` Affected account: ${cleanOpeningName(eventTarget.name)}.`:" This event affects the full portfolio."} You start with ${money(state.finance?.cash||0)} in cash and a ${money(state.finance?.creditLimit||0)} credit limit.`;
    firstMove=eventTarget?`Check available cash and platform concentration. Then inspect ${cleanOpeningName(eventTarget.name)}.`:"Check available cash and platform concentration before changing an account.";
  }else{const clients=Array.isArray(state.clients)?state.clients.filter(client=>client.status==="active"):[],prospects=Array.isArray(state.prospects)?state.prospects:[],
      inherited=typeof AgencyCareer!=="undefined"&&AgencyCareer.openingProfile?AgencyCareer.openingProfile(SEED):null,
      incident=clients.find(client=>client.incident),identity=agencyOpeningIdentity(state),model=identity.model,
      hqLabel=agencyWizardLocationLabel(identity.hq),hqTimezone=agencyWizardTimezoneLabel(identity.hq),modelTitle=agencyWizardModelTitle(identity.agencyType),modelDetails=agencyWizardModelCopy(model),
      cash=money(state.cash||0),focus=Number(state.focusTotal)||0;
    role=`${identity.name} is a ${modelTitle.toLowerCase()} based in ${hqLabel}. ${model.playerRole||modelDetails.sale}`;
    if(identity.agencyType==="holding_company"){
      const funnels=Array.isArray(state.affiliate?.funnels)?state.affiliate.funnels:[],first=funnels[0],owned=agencyOwnedOfferDescription(first);
      conditions=`${owned.name} produces ${owned.product}. Customer: ${owned.audience}. Opening market: United States.`;
      board=`You start with ${cash} in company cash, ${focus} focus points for today's work and ${funnels.length||1} company-owned offer${(funnels.length||1)===1?"":"s"}. There are no clients, retainers or client ad budgets.`;
      firstMove=first?`Open ${owned.name}. Read its daily budget, tracking-signal score and compliance-risk meter. Before the first delivery day, the payout field correctly says there is no delivery evidence yet.`:"Open the owned-offer network and choose the first offer the company will fund.";
      customSlides=[
        {kicker:"Your company",title:identity.name,body:role,secondary:`${modelDetails.rule} Career goal: ${objective}`,footer:`${hqLabel} · ${hqTimezone} time · ${setup}`},
        {kicker:"Opening business",title:owned.name,body:conditions,secondary:`Why the outcome matters: ${owned.stakes}`,footer:`Opening circumstance: ${inherited?.label||"Owned-offer launch"}`},
        {kicker:"Starting campaign",title:"What will run",body:`Ad concept: ${owned.adConcept}. Format: ${owned.adFormat}. ${identity.name} funds the media and receives cash only after a payout is validated.`,secondary:`Every media dollar, delayed payout and compliance loss belongs to ${identity.name}.`,footer:`Company headquarters: ${hqLabel} · ${hqTimezone} time`},
        {kicker:"What you control",title:"One media buyer, company-wide stakes",body:board,secondary:"Each workday, inspect the owned offers, spend limited focus on a budget, tracking or creative action, then end the day to post media spend and modeled payout value.",footer:`Scenario ID: ${SEED}`},
        {kicker:"Your first decision",title:"Do this first",body:firstMove,secondary:"Change one variable at a time. The next result should tell you whether the decision helped signal, cash timing, creative durability or compliance.",footer:draftOpeningTutorialFooter(identity.agencyType)}
      ];
    }else{
      const client=clients[0]||null,offer=agencyOpeningOffer(client),concept=agencyOpeningConcept(client),office=agencyOpeningOffice(client,identity),target=agencyOpeningTarget(client,office),
        channel=client&&typeof AGENCY_CHANNELS!=="undefined"?AGENCY_CHANNELS[client.channel]:null,
        clientName=cleanOpeningName(client?.name)||"Your founding client",verticals=typeof AGENCY_VERTICALS!=="undefined"&&Array.isArray(AGENCY_VERTICALS)?AGENCY_VERTICALS:[],
        product=offer?.label||verticals.find(item=>item.id===client?.vertical)?.label||"the advertised service",
        conversion=offer?.conversion||"a qualified customer outcome",customer=cleanOpeningName(client?.customer)||"People evaluating the advertised service or product",
        stakes=cleanOpeningName(client?.stakes)||"The offer and next step must match what the customer will receive.",customerValue=Number(client?.customerValue),
        valueLine=Number.isFinite(customerValue)&&customerValue>0?money(customerValue):"not yet measured",accountTimezone=agencyWizardTimezoneLabel(client?.accountTimezone||office),
        ad=concept?.label||client?.adCopy||"the inherited opening ad";
      conditions={facts:[
        {role:"offer",label:"They sell",value:product},
        {role:"customer",label:"Their customer",value:customer},
        {role:"outcome",label:"The account counts as a win",value:conversion},
        {role:"value",label:"Simulated value of one win",value:valueLine}
      ]};
      board=`You start with ${cash} in company cash, ${focus} focus points for today's work, ${clients.length||1} active client${(clients.length||1)===1?"":"s"} and ${prospects.length} available lead${prospects.length===1?"":"s"}. Client media budgets stay separate from the retainers that pay the agency's bills.`;
      firstMove=identity.agencyType==="creative_agency"?`Open ${clientName}. Read the offer, customer and service area. Then inspect “${ad}” before choosing a creative action.`:
        `Open ${clientName}. Read the offer, service area and paid-search account. Then complete the highlighted account action before spending focus on growth.`;
      customSlides=[
        {kicker:"Your company",title:identity.name,body:role,secondary:`${modelDetails.rule} Career goal: ${objective}`,footer:`${hqLabel} · ${hqTimezone} time · ${setup}`},
        {kicker:"Your first client",title:clientName,body:conditions,secondary:`Why this outcome matters: ${stakes}`,footer:`Opening circumstance: ${inherited?.label||"Founder referral"}${incident?` · ${cleanOpeningName(incident.label)}`:""}`},
        {kicker:"Starting account",title:"Where the work runs",body:`Client office: ${agencyWizardLocationLabel(office)}. Account time zone: ${accountTimezone} time. Service area: ${target}. Starting channel: ${channel?.label||client?.channel||"Paid media"}.`,secondary:`Opening ad: “${ad}” The client pays the agency ${money(client?.fee||0)} per month.`,footer:`${identity.name} headquarters: ${hqLabel} · ${hqTimezone} time`},
        {kicker:"What you control",title:"One media buyer, company-wide stakes",body:board,secondary:"Each workday, service due accounts, make a limited number of company decisions and end the day. At month close, client fees must cover payroll, software, equipment and other operating costs.",footer:`Scenario ID: ${SEED}`},
        {kicker:"Your first decision",title:"Do this first",body:firstMove,secondary:identity.agencyType==="creative_agency"?"The guided first assignment shows the offer, ad concept, execution format and placement as separate parts, then asks you to revise the ad.":"The guided first assignment shows the offer, service area, account health and client trust separately, then asks you to complete the due account service.",footer:draftOpeningTutorialFooter(identity.agencyType)}
      ];
    }
  }
  return Object.freeze({mode,seed:SEED,slides:Object.freeze((customSlides||[
    Object.freeze({kicker:"Your assignment",title:MODE_NAME[mode],body:role,secondary:`Goal: ${objective}`,footer:setup}),
    Object.freeze({kicker:"Starting conditions",title:"What you found",body:conditions,secondary:board,footer:`Scenario ID: ${SEED}`}),
    Object.freeze({kicker:"Your first decision",title:"Do this first",body:firstMove,secondary:dayLoops[mode]||"Read the board, make one decision, run the period and review what changed.",
      footer:tutorialQueryRequested()&&typeof TUTORIAL_SEEDS!=="undefined"&&TUTORIAL_SEEDS[mode]?
        `Days 1 to ${(TUTORIAL_DB.modes&&TUTORIAL_DB.modes[mode]?TUTORIAL_DB.modes[mode]:TUTORIAL_DB.actions).filter(step=>step.kind==="run").length} use a fixed scenario so the game can explain each result. After the walkthrough, live conditions take over.`:
        "After this briefing, the live account opens."})
  ]).map(item=>Object.freeze(item)))});
}
function draftOpeningTutorialFooter(agencyType){
  if(!guidedOpeningRequested())return "After this briefing, the company dashboard opens.";
  return `Tutorial on · guided opening for ${agencyWizardModelTitle(agencyType)}`;
}
function guidedOpeningRequested(){try{const params=new URLSearchParams(location.search||"");return params.get("guided")==="1"||params.get("tutorial")==="1";}catch(e){return false;}}
function clearOpeningBriefQuery(){try{const params=new URLSearchParams(location.search||"");params.delete("brief");params.delete("guided");
  if(history&&history.replaceState)history.replaceState(null,"",params.toString()?`?${params.toString()}`:(location.pathname||""));}catch(e){}}
function finishOpeningBrief(){const actionTutorial=tutorialQueryRequested(),guidedRequested=guidedOpeningRequested();
  clearOpeningBriefQuery();if(typeof markRunEntered==="function")markRunEntered();close();
  if(typeof initTutorial==="function"&&actionTutorial)initTutorial({force:true});
  else if(guidedRequested&&MODE!==1&&MODE!==6&&typeof startModeCoach==="function")startModeCoach();
  else if(typeof bindTutorialRefresh==="function")bindTutorialRefresh();return true;}
function leaveOpeningBriefForMenu(){
  if(typeof checkpointBeforeNavigation==="function"&&!checkpointBeforeNavigation("opening-brief-menu",renderOpeningBrief,true))return false;
  finishOpeningBrief();if(typeof mainMenu==="function")mainMenu();return true;
}
function renderOpeningBrief(){const slide=openingBriefSlides[openingBriefIndex];if(!slide)return finishOpeningBrief();
  const nextSlide=openingBriefSlides[openingBriefIndex+1],guided=guidedOpeningRequested(),nextLabel=openingBriefIndex===openingBriefSlides.length-1?
    (MODE===6?(guided?"Begin guided career":"Open company dashboard"):(tutorialQueryRequested()?"Begin guided Day 1":"Open account")):`Next: ${nextSlide?.title||"continue"}`,
    openingIcon=MODE===6?agencyOpeningIdentity(S).model.icon:MODE_MENU_META[MODE].icon;
  show(`<div class="run-opening"><div class="opening-step">Briefing · ${openingBriefIndex+1} of ${openingBriefSlides.length}</div><div class="mission-icon" aria-hidden="true">${wizardEscape(openingIcon)}</div>
    <div class="eyebrow">${wizardEscape(slide.kicker)}</div><h2>${wizardEscape(slide.title)}</h2>${slide.body&&slide.body.facts?
      `<div class="opening-facts">${slide.body.facts.map(fact=>`<span class="opening-fact is-${wizardEscape(fact.role)}"><b>${wizardEscape(fact.label)}</b>${wizardEscape(fact.value)}</span>`).join("")}</div>`:
      `<p>${wizardEscape(slide.body)}</p>`}${slide.secondary?`<div class="opening-secondary">${wizardEscape(slide.secondary)}</div>`:""}<div class="opening-footer">${wizardEscape(slide.footer)}</div>
    <div class="wizard-footer"><button class="btn wizard-back" id="openingMenu" type="button">Menu and options</button>${openingBriefIndex?'<button class="btn wizard-back" id="openingBack" type="button">Back</button>':""}${guided?"":'<button class="btn" id="openingSkip" type="button">Skip briefing</button>'}<button class="btn wizard-primary" id="openingNext" type="button">${wizardEscape(nextLabel)}</button></div></div>`,"structure",{learning:false,definitions:true,menu:true});
  const menu=document.getElementById("openingMenu"),back=document.getElementById("openingBack"),skip=document.getElementById("openingSkip"),next=document.getElementById("openingNext");if(menu)menu.onclick=leaveOpeningBriefForMenu;if(back)back.onclick=()=>{openingBriefIndex--;renderOpeningBrief();};
  if(skip)skip.onclick=finishOpeningBrief;
  if(next)next.onclick=()=>{openingBriefIndex++;renderOpeningBrief();};return true;}
function showRunOpening(){const before=JSON.stringify(S),model=openingBriefModel();openingBriefSlides=Array.from(model.slides);openingBriefIndex=0;
  if(JSON.stringify(S)!==before)throw new Error("Opening briefing mutated simulation state");return renderOpeningBrief();}

/* ---------------- contextual mode briefing ---------------------------------------------- */
function modeBriefingNotes(mode){
  if(mode===0)return `<ul><li>Read search intent before click-through rate (CTR); cheap do-it-yourself clicks can still be useless to a client that wants qualified prospects.</li>
    <li>Lost to rank calls for bid or relevance work. Lost to budget calls for more budget or tighter scope.</li>
    <li>Quality Score diagnoses expected CTR, ad relevance, and landing-page experience; it is not the client result.</li>
    <li>Client trust responds to results, judgment, transparency, responsiveness, and whether commitments are completed.</li></ul>`;
  if(mode===5)return `<ul><li>Shared cash and credit connect every advertiser workstream even when their media ledgers stay separate.</li>
    <li>Platform claims can overlap. Compare them with blended modeled marketing efficiency ratio (MER) and the actual liquidity position.</li>
    <li>Search has finite demand; social has creative fatigue; programmatic and connected TV (CTV) carry view-through uncertainty.</li>
    <li>Three consecutive 30-day gates test return, attribution integrity, liquidity, and concentration.</li></ul>`;
  if(mode===6)return `<ul><li>The selected company model determines whether the business earns client fees or funds and owns its offers. Those are different revenue systems.</li>
    <li>Client media budgets never become agency revenue. Company-owned media is a company cost, and its payout may arrive later.</li>
    <li>Headquarters, client offices, service areas, target states and account time zones answer different geographic questions.</li>
    <li>Hiring and capabilities trade current cash for future capacity. The 2027 result uses cumulative operating profit and liquidity.</li></ul>`;
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
    <div class="wizard-footer"><button class="btn wizard-back" id="closeB" type="button">${backToWizard?"Back to run setup":"Back to To The Moon"}</button>
      <button class="btn" id="briefingGuide" type="button">${ACTIVE_PROFILE==="specialist"?"Open account playbook":"Open Field Guide"}</button>
      ${backToWizard?"":'<button class="btn" id="briefingSetup" type="button">Choose another challenge</button>'}</div></div>`,"structure",{
        learning:false,definitions:true,menu:true,loreFlavor:backToWizard?backToWizard.flavor:ACTIVE_FLAVOR,
        loreAnalogies:backToWizard?backToWizard.analogies:analogiesEnabled()});
  const closeButton=document.getElementById("closeB");if(closeButton)closeButton.onclick=()=>backToWizard?setupWizard(backToWizard,"mission"):close();
  const guide=document.getElementById("briefingGuide");if(guide)guide.onclick=()=>ACTIVE_PROFILE==="specialist"?specialistGuide():loreBook();
  const setup=document.getElementById("briefingSetup");if(setup)setup.onclick=()=>setupWizard({origin:"briefing"},"intent");
}
