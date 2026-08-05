"use strict";

/* ---------------- staged front door -------------------------------------------------------
   Navigation is presentation-only until launchWizardRun(). No step consumes RNG, changes S,
   writes run configuration, or swaps the active analogy while the player is still browsing. */
const MENU_INTENTS=Object.freeze({
  learn:Object.freeze({icon:"🎯",title:"Learn the fundamentals",copy:"Start with one guided account and learn by making real decisions.",meta:"Recommended first run"}),
  practice:Object.freeze({icon:"🧠",title:"Practice a specialty",copy:"Choose one focused problem: search, cash flow, creative, or channels.",meta:"Four focused drills"}),
  campaign:Object.freeze({icon:"🌌",title:"Run a long campaign",copy:"Manage a portfolio or build an agency across an entire career.",meta:"Expert and multi-session"})
});

function wizardDraft(raw={}){
  const requested=Number(raw.mode),mode=MODE_IDS.includes(requested)?requested:MODE;
  const fallback=mode===MODE?{days:DAYS,budget:DAILY}:savedConfigFor(mode);
  const cfg=cleanConfig(mode,{days:raw.days??fallback.days,budget:raw.budget??fallback.budget});
  const flavor=FLAVOR_BY_ID[raw.flavor]?raw.flavor:ACTIVE_FLAVOR;
  return {origin:raw.origin||"menu",intent:raw.intent||MODE_MENU_META[mode].intent,mode,
    stage:Math.max(1,Math.min(3,Number(raw.stage)||(mode===0&&MODE===0?CLASSIC_STAGE:1))),
    days:cfg.days,budget:cfg.budget,flavor,analogies:raw.analogies===undefined?analogiesEnabled():!!raw.analogies,
    guided:raw.guided===undefined?false:!!raw.guided};
}
function wizardWithMode(raw,mode,intent=MODE_MENU_META[mode].intent){
  const cfg=mode===MODE?{days:DAYS,budget:DAILY}:savedConfigFor(mode);
  return wizardDraft({...raw,intent,mode,days:cfg.days,budget:cfg.budget,
    stage:mode===0?(MODE===0?CLASSIC_STAGE:1):1,guided:mode===1&&intent==="learn"});
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
  const challenge=["intent","mode","stage"].includes(step),mission=["mission","config","lens"].includes(step);
  return `<ol class="wizard-progress" aria-label="New run progress">
    <li class="${challenge?"active":mission?"done":""}" ${challenge?'aria-current="step"':""}><span>1</span>Choose</li>
    <li class="${mission?"active":""}" ${mission?'aria-current="step"':""}><span>2</span>Brief</li>
    <li><span>3</span>Play</li></ol>`;
}
function wizardBackStep(draft,step){
  if(step==="intent"){mainMenu();return;}
  if(step==="mode"){setupWizard(draft,"intent");return;}
  if(step==="stage"){setupWizard(draft,"mode");return;}
  if(step==="config"||step==="lens"){setupWizard(draft,"mission");return;}
  if(step==="mission"){
    if(draft.mode===0){setupWizard(draft,"stage");return;}
    if(draft.intent==="learn"){setupWizard(draft,"intent");return;}
    setupWizard(draft,"mode");return;
  }
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

function setupWizard(raw={},step="intent"){
  const draft=wizardDraft(raw),meta=MODE_MENU_META[draft.mode];
  let html="";
  if(step==="intent"){
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">New run</div><h2>What do you want to do?</h2>
      <p>Pick an intention. The game will show only the challenges that fit.</p></div>
      <div class="wizard-intents">${Object.entries(MENU_INTENTS).map(([id,item])=>`<button class="wizard-intent" type="button" data-intent="${id}">
        <span aria-hidden="true">${item.icon}</span><b>${item.title}</b><em>${item.copy}</em><small>${item.meta}</small></button>`).join("")}</div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back to title</button></div>`;
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
  }else if(step==="config"){
    const spec=CONFIG_SPECS[draft.mode],periodLabel=draft.mode===6?"Career horizon (months)":draft.mode===5?"Mandate (days)":"Periods (days)",
      budgetLabel=draft.mode===6?"Starting operating reserve":draft.mode===5?"Daily portfolio authorization":"Daily account budget";
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Optional setup</div><h2>Shape the run</h2>
      <p>The current values stay unchanged until you return to the briefing and press Start.</p></div>
      <div class="config wizard-config"><div class="configgrid">
        <label>${periodLabel}<input id="daysCfg" type="number" inputmode="numeric" min="${spec.minDays}" max="${spec.maxDays}" step="${spec.periodStep||1}" value="${draft.days}" ${spec.fixedPeriod?"disabled":""} aria-describedby="daysHint"></label>
        <label>${budgetLabel}<input id="budgetCfg" type="number" inputmode="numeric" min="${spec.minBudget}" max="${spec.maxBudget}" step="${spec.inputStep}" value="${draft.budget}" aria-describedby="budgetHint"></label>
      </div><div class="config-hints"><p id="daysHint">Allowed: ${spec.minDays}–${spec.maxDays} ${draft.mode===6?"months":`days${draft.mode===5?", in 30-day blocks":""}`}.</p>
      <p id="budgetHint">Allowed: ${money(spec.minBudget)}–${money(spec.maxBudget)}.</p></div>
      <div class="config-preview" id="configStatus" aria-live="polite"></div></div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn" id="resetCfg" type="button">Use mode defaults</button>
        <button class="btn wizard-primary" id="keepCfg" type="button">Keep these settings</button></div>`;
  }else if(step==="lens"){
    const selected=FLAVOR_BY_ID[draft.flavor]||currentFlavor(),pure=!draft.analogies;
    html=`${wizardProgress(step)}<div class="wizard-heading"><div class="eyebrow">Optional learning lens</div><h2>How should the game explain itself?</h2>
      <p>Mechanics never change. You can switch the explanation layer during play.</p></div>
      <div class="wizard-lens-grid"><button class="wizard-lens" type="button" data-lens="none" aria-pressed="${pure}"><span aria-hidden="true">📊</span><b>Pure media terms</b></button>
        ${ORDERED_FLAVORS.map(flavor=>`<button class="wizard-lens" type="button" data-lens="${flavor.id}" aria-pressed="${!pure&&flavor.id===draft.flavor}"><span aria-hidden="true">${flavor.mark}</span><b>${flavor.name}</b></button>`).join("")}</div>
      <div class="wizard-lens-preview"><small>${pure?"NO ANALOGY LAYER":`${selected.mark} ${selected.name.toUpperCase()}`}</small>
        <b>${pure?"Use the real terminology without metaphor captions.":selected.premise}</b>
        <p>${pure?"Definitions and the Field Guide remain available.":selected.signature}</p></div>
      <div class="wizard-footer"><button class="btn wizard-back" id="wizardBack" type="button">Back</button><button class="btn wizard-primary" id="keepLens" type="button">Use this explanation style</button></div>`;
  }else{
    const currentFlavorRecord=FLAVOR_BY_ID[draft.flavor]||currentFlavor(),activeProgress=currentRunHasProgress(),sameModeProgress=activeProgress&&draft.mode===MODE,
      launchText=activeProgress?`Save current & start ${wizardPeriodText(draft.mode,draft.days)}`:`Start ${wizardPeriodText(draft.mode,draft.days)}`;
    html=`${wizardProgress("mission")}<div class="mission-preflight">
      <div class="mission-icon" aria-hidden="true">${meta.icon}</div><div><div class="eyebrow">${MODE_SCOPE_TITLE[draft.mode]} · ${meta.difficulty}</div><h2>${MODE_NAME[draft.mode]}</h2>
      <p>${meta.promise}</p></div></div>
      <section class="mission-objective"><small>Your objective</small><strong>${MODE_OBJECTIVE[draft.mode]}</strong></section>
      <div class="mission-scan"><section><small>Watch these signals</small><ul>${meta.watch.map(item=>`<li>${item}</li>`).join("")}</ul></section>
        <section><small>Run setup</small><p><b>${wizardPeriodText(draft.mode,draft.days)}</b><span>${wizardBudgetText(draft.mode,draft.budget)}</span>
        ${draft.mode===0?`<span>${CSTAGE_NAME[draft.stage]}</span>`:""}<span>${draft.guided?"Guided opening":"Self-directed"}</span></p></section></div>
      <div class="mission-lens-line"><span>${draft.analogies?`${currentFlavorRecord.mark} ${currentFlavorRecord.name} explanations`:`📊 Pure media-buying terms`}</span><button class="text-button" id="chooseLens" type="button">Change explanation style</button></div>
      ${activeProgress?`<div class="mission-warning"><b>Your current run will be checkpointed first.</b><span>${sameModeProgress?"Once this new run advances, later autosaves for this same mode can replace that checkpoint.":"Its mode-specific checkpoint stays separate from this challenge."}</span></div>`:""}
      <div class="wizard-footer mission-actions"><button class="btn wizard-back" id="wizardBack" type="button">Back</button>
        <button class="btn" id="customizeRun" type="button">Customize run</button><button class="btn wizard-primary" id="launchRun" type="button">${launchText}</button></div>
      <div class="mission-help"><button class="text-button" id="openMissionGuide" type="button">Open the Field Guide</button><span aria-hidden="true">·</span><button class="text-button" id="openMissionRules" type="button">Read full mode briefing</button></div>`;
  }

  show(`<div class="setup-wizard" data-wizard-step="${step}">${html}</div>`,"structure",{
    wide:step==="mode"||step==="lens",learning:false,definitions:step==="mission",menu:true,
    loreFlavor:draft.flavor,loreAnalogies:draft.analogies});
  const back=document.getElementById("wizardBack");if(back)back.onclick=()=>wizardBackStep(draft,step);
  if(step==="intent")ov.querySelectorAll("button[data-intent]").forEach(button=>button.onclick=()=>{
    const intent=button.dataset.intent;
    if(intent==="learn"){setupWizard(wizardWithMode({...draft,guided:true},1,"learn"),"mission");return;}
    setupWizard({...draft,intent},"mode");
  });
  if(step==="mode"){
    ov.querySelectorAll("button[data-mode]").forEach(button=>button.onclick=()=>{
      const next=wizardWithMode(draft,Number(button.dataset.mode),draft.intent);
      setupWizard(next,next.mode===0?"stage":"mission");
    });
    ov.querySelectorAll("button[data-resume-mode]").forEach(button=>button.onclick=()=>{
      const record=saveRecord(ACTIVE_PROFILE,Number(button.dataset.resumeMode));resumeWizardRun(record,draft);
    });
  }
  if(step==="stage")ov.querySelectorAll("button[data-stage]").forEach(button=>button.onclick=()=>setupWizard({...draft,stage:Number(button.dataset.stage)},"mission"));
  if(step==="config"){
    const days=document.getElementById("daysCfg"),budget=document.getElementById("budgetCfg"),status=document.getElementById("configStatus");
    const update=()=>{const cfg=cleanConfig(draft.mode,{days:days.value,budget:budget.value});
      if(status)status.textContent=`Run preview: ${wizardPeriodText(draft.mode,cfg.days)} · ${wizardBudgetText(draft.mode,cfg.budget)}`;return cfg;};
    [days,budget].forEach(input=>{if(input)input.addEventListener("input",update);});update();
    const reset=document.getElementById("resetCfg");if(reset)reset.onclick=()=>{const spec=CONFIG_SPECS[draft.mode];days.value=spec.days;budget.value=spec.budget;update();};
    const keep=document.getElementById("keepCfg");if(keep)keep.onclick=()=>setupWizard({...draft,...update()},"mission");
  }
  if(step==="lens"){
    ov.querySelectorAll("button[data-lens]").forEach(button=>button.onclick=()=>{
      const id=button.dataset.lens;setupWizard({...draft,analogies:id!=="none",flavor:id==="none"?draft.flavor:id},"lens");
      const selected=Array.from(ov.querySelectorAll("button[data-lens]")).find(item=>item.dataset.lens===id);
      if(selected&&typeof selected.focus==="function")selected.focus();
    });
    const keep=document.getElementById("keepLens");if(keep)keep.onclick=()=>setupWizard(draft,"mission");
  }
  if(step==="mission"||!(["intent","mode","stage","config","lens"].includes(step))){
    const customize=document.getElementById("customizeRun");if(customize)customize.onclick=()=>setupWizard(draft,"config");
    const lens=document.getElementById("chooseLens");if(lens)lens.onclick=()=>setupWizard(draft,"lens");
    const launch=document.getElementById("launchRun");if(launch)launch.onclick=()=>launchWizardRun(draft);
    const guide=document.getElementById("openMissionGuide");if(guide)guide.onclick=()=>ACTIVE_PROFILE==="specialist"?specialistGuide("00"):loreBook("01");
    const rules=document.getElementById("openMissionRules");if(rules)rules.onclick=()=>briefing({returnToWizard:draft});
  }
}

function launchWizardRun(raw){
  const draft=wizardDraft(raw),cfg=cleanConfig(draft.mode,draft);
  if(!checkpointBeforeNavigation("before-setup-change",()=>setupWizard(draft,"mission")))return false;
  saveConfigFor(draft.mode,cfg);
  UI_PREFS={...UI_PREFS,analogies:!!draft.analogies};persistUiPrefs();
  setFlavor(draft.flavor,{persist:true,updateUrl:false,rerender:false});
  const p=new URLSearchParams(location.search);
  p.set("mode",draft.mode);p.set("days",cfg.days);p.set("budget",cfg.budget);p.set("seed",SEED);p.set("flavor",draft.flavor);p.set("autostart","1");
  if(draft.mode===0)p.set("stage",draft.stage);else p.delete("stage");
  if(draft.mode===1&&draft.guided)p.set("tutorial","1");else p.delete("tutorial");
  p.delete("resume");location.search=p.toString();return true;
}

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
