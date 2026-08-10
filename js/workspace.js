"use strict";

/* The cockpit is presentation state. It never advances time, draws RNG, edits S or enters a
   save payload. It remembers where the player was, while each mode continues to own its rules. */
const Workspace=(()=>{
  const VIEWS=Object.freeze(["overview","board","finance","team","growth","history"]),
    SIDE_VIEWS=Object.freeze(["actions","activity","systems"]);
  let initialized=false,observer=null,selectedKey="",syncQueued=false,lastCardSignature="",disclosureState=null;

  const byId=id=>typeof document!=="undefined"&&document.getElementById?document.getElementById(id):null;
  const modeId=()=>typeof MODE!=="undefined"&&Number.isInteger(Number(MODE))?Number(MODE):0;
  const preferenceKey=kind=>`ttm.workspace.${kind}.mode-${modeId()}.v2`;
  function readPreference(kind,fallback,allowed){try{const value=sessionStorage.getItem(preferenceKey(kind));return allowed.includes(value)?value:fallback;}catch(e){return fallback;}}
  function writePreference(kind,value){try{sessionStorage.setItem(preferenceKey(kind),value);}catch(e){}}
  function escapeText(value){return String(value??"").replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));}
  function compactLabel(value,fallback){const text=String(value||"").replace(/\s+/g," ").trim();return text?text.slice(0,82):fallback;}
  function setText(node,value){if(!node)return false;const next=String(value??"");if(node.textContent===next)return false;node.textContent=next;return true;}
  function settleObserver(){if(observer&&typeof observer.takeRecords==="function")observer.takeRecords();}
  function isCareer(){return modeId()===6&&typeof AgencyCareer!=="undefined"&&AgencyCareer;}

  function readDisclosures(){
    if(disclosureState)return disclosureState;
    try{const raw=JSON.parse(sessionStorage.getItem(preferenceKey("disclosures"))||"{}");disclosureState=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};}
    catch(e){disclosureState={};}
    return disclosureState;
  }
  function storeDisclosures(){try{sessionStorage.setItem(preferenceKey("disclosures"),JSON.stringify(readDisclosures()));}catch(e){}}
  function restoreDisclosures(){
    if(typeof document==="undefined"||!document.querySelectorAll)return;
    const saved=readDisclosures();document.querySelectorAll("[data-disclosure-id]").forEach(detail=>{
      const id=detail.dataset?.disclosureId;if(id&&Object.prototype.hasOwnProperty.call(saved,id)&&"open" in detail)detail.open=!!saved[id];
    });
  }
  function recordDisclosure(event){
    const detail=event?.target;if(!detail?.dataset?.disclosureId||!("open" in detail))return;
    const context=byId("runContext");
    if(detail.open&&context&&typeof context.contains==="function"&&context.contains(detail)&&typeof context.querySelectorAll==="function"){
      context.querySelectorAll("details[open]").forEach(other=>{if(other!==detail){other.open=false;const otherId=other.dataset?.disclosureId;if(otherId)readDisclosures()[otherId]=false;}});
    }
    readDisclosures()[detail.dataset.disclosureId]=!!detail.open;storeDisclosures();
  }

  function setPanelAvailability(view){
    const main=byId("workspaceMain"),side=byId("workspaceSide"),mainVisible=view==="overview"||view==="board",sideVisible=view!=="board";
    for(const [panel,visible] of [[main,mainVisible],[side,sideVisible]])if(panel){panel.inert=!visible;panel.setAttribute("aria-hidden",String(!visible));}
    const accountRibbon=byId("accountRibbon"),financeVisible=view==="finance";
    if(accountRibbon){accountRibbon.hidden=!financeVisible;accountRibbon.inert=!financeVisible;accountRibbon.setAttribute("aria-hidden",String(!financeVisible));}
    if(typeof document!=="undefined"&&document.body?.dataset)document.body.dataset.workspaceView=view;
  }
  function openSystemDrawer(which){
    const account=byId("accountDrawer"),pipe=byId("pipeDrawer");
    if(account)account.open=which==="account";if(pipe)pipe.open=which==="pipe";
  }
  function labelSystemDrawers(view){
    if(!isCareer()){setText(byId("accountDrawerLabel"),"Current event and account actions");setText(byId("pipeDrawerLabel"),"Creative tools and production");return;}
    setText(byId("accountDrawerLabel"),view==="team"?"People and capacity":view==="finance"?"Company finances":"Company operations");
    setText(byId("pipeDrawerLabel"),"Capabilities and expansion");
  }
  function applyRoute(view){
    if(view==="overview"){setSideView(readPreference("side","actions",SIDE_VIEWS),{persist:false});if(isCareer())AgencyCareer.setDashboardView("today",{persist:false});}
    else if(view==="finance"){setSideView("systems",{persist:false});openSystemDrawer("account");if(isCareer())AgencyCareer.setDashboardView("money",{persist:false});if(isCareer())AgencyCareer.setCompanyView("finance",{persist:false});}
    else if(view==="team"){setSideView("systems",{persist:false});openSystemDrawer("account");if(isCareer())AgencyCareer.setDashboardView("agency",{persist:false});if(isCareer())AgencyCareer.setCompanyView("team",{persist:false});}
    else if(view==="growth"){setSideView("systems",{persist:false});openSystemDrawer("pipe");if(isCareer())AgencyCareer.setDashboardView("agency",{persist:false});}
    else if(view==="history")setSideView("activity",{persist:false});
    renderLedger(view);
    labelSystemDrawers(view);
    setPanelAvailability(view);
  }

  function setView(requested,{persist=true,focus=false}={}){
    let candidate=requested==="command"?"finance":requested;
    if(candidate==="team"&&!isCareer())candidate="finance";
    const view=VIEWS.includes(candidate)?candidate:"overview",cockpit=byId("gameCockpit");
    if(view==="overview"&&selectedKey){selectedKey="";const cards=cardNodes(),options=cards.map((card,index)=>({key:card.dataset?.workspaceKey||cardKey(card,cardLabel(card,index),index),label:card.dataset?.workspaceLabel||cardLabel(card,index)}));applySelection(cards,options);renderEntityNav(options);}
    if(cockpit)cockpit.dataset.workspaceView=view;if(persist)writePreference("view",view);
    const tabs=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll('[role="tab"][data-workspace-view]'):[];
    tabs.forEach(tab=>{const active=tab.dataset.workspaceView===view;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
    /* Career renders separate priority and full-roster scopes. Rebuild card identity and
       entity navigation after the route changes so the newly visible scope is immediately
       interactive; syncCards() applies the route and trail without calling setView(). */
    syncCards();
    if(focus){const target=view==="overview"||view==="board"?byId("workspaceMain"):byId("workspaceSide");if(target&&typeof target.focus==="function")target.focus({preventScroll:true});}
    return view;
  }

  function setSideView(requested,{persist=true,focus=false}={}){
    const view=SIDE_VIEWS.includes(requested)?requested:"actions",side=byId("workspaceSide");
    if(side)side.dataset.sideView=view;if(persist)writePreference("side",view);
    const tabs=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll('[role="tab"][data-side-view]'):[];
    tabs.forEach(tab=>{const active=tab.dataset.sideView===view;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
    const panels=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll("[data-side-panel]"):[];
    panels.forEach(panel=>{const active=panel.dataset.sidePanel===view;panel.hidden=!active;panel.setAttribute("aria-hidden",String(!active));if("inert" in panel)panel.inert=!active;});
    if(focus){const panel=Array.from(panels).find(item=>item.dataset.sidePanel===view);if(panel&&typeof panel.focus==="function")panel.focus({preventScroll:true});}
    updateNavigation();updateTrail();return view;
  }

  function cardNodes(){
    const root=byId("slots");if(!root||typeof root.querySelectorAll!=="function")return [];
    if(isCareer()){const view=byId("gameCockpit")?.dataset?.workspaceView||"overview",scope=view==="overview"?".agency-today-roster":".agency-full-roster";
      return Array.from(root.querySelectorAll(`${scope} > .agency-client-card, ${scope} > .affiliate-funnel-card`));}
    return Array.from(root.querySelectorAll(":scope > .slot, :scope > .night-workstream, .agency-roster > .agency-client-card, .agency-roster > .affiliate-funnel-card"));
  }
  function cardLabel(card,index){
    if(!card||typeof card.querySelector!=="function")return `Card ${index+1}`;
    const node=card.querySelector("h3, .night-workstream-summary strong, .night-workstream-summary b, .agency-client-name, .agency-client-card header b, summary b, .fam");
    return compactLabel(node&&node.textContent,`Card ${index+1}`);
  }
  function cardKey(card,label,index){
    const stable=card?.dataset?.clientId||card?.dataset?.funnelId||card?.dataset?.workstreamId;
    return stable?`entity:${String(stable).toLowerCase().replace(/[^a-z0-9_-]+/g,"-").slice(0,70)}`:
      `${index}:${String(label).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,56)}`;
  }
  function detailNodes(card){return card&&typeof card.querySelectorAll==="function"?Array.from(card.querySelectorAll("details.card-detail-block, details.agency-contract")):[];}
  function prepareCard(card,index,label,key){
    if(!card||!card.dataset)return;card.dataset.workspaceKey=key;card.dataset.workspaceLabel=label;
    if(!card.dataset.workspacePrepared){card.dataset.workspacePrepared="true";detailNodes(card).forEach(detail=>detail.removeAttribute&&detail.removeAttribute("open"));}
    if(typeof card.querySelector==="function"&&!card.querySelector(".workspace-card-toggle")){
      const button=typeof document!=="undefined"&&document.createElement?document.createElement("button"):null;
      if(button){button.type="button";button.className="workspace-card-toggle";button.dataset.workspaceInspect=key;button.setAttribute("aria-label",`Inspect ${label}`);button.textContent="Inspect";
        const host=String(card.tagName||"").toLowerCase()==="details"?card.querySelector("summary"):card;(host||card).appendChild(button);}
    }
  }
  function applySelection(cards,options=[]){
    const found=!!selectedKey&&options.some(option=>option.key===selectedKey);if(selectedKey&&!found)selectedKey="";
    cards.forEach((card,index)=>{const option=options[index],active=!!selectedKey&&option?.key===selectedKey,button=card&&typeof card.querySelector==="function"?card.querySelector(".workspace-card-toggle"):null;
      if(card?.classList){card.classList.toggle("workspace-selected",active);card.classList.toggle("workspace-dimmed",!!selectedKey&&!active);}
      if(card?.setAttribute){if(selectedKey&&!active)card.setAttribute("aria-hidden","true");else card.removeAttribute("aria-hidden");}
      if(card&&"inert" in card)card.inert=!!selectedKey&&!active;
      if(button){setText(button,active?"Back to all":"Inspect");button.setAttribute("aria-expanded",String(active));button.setAttribute("aria-label",active?"Return to all cards":`Inspect ${option?.label||`Card ${index+1}`}`);}
      if(active){if(card.tagName&&String(card.tagName).toLowerCase()==="details"){card.open=true;
          if(card.classList?.contains("night-workstream"))cards.forEach(other=>{if(other!==card&&other.classList?.contains("night-workstream"))other.open=false;});}
        const details=detailNodes(card),opened=details.find(detail=>detail.open)||details[0];if(opened&&!opened.open){opened.open=true;opened.dataset.workspaceAutoOpened="true";}}
      else detailNodes(card).forEach(detail=>{if(detail.dataset?.workspaceAutoOpened){detail.open=false;delete detail.dataset.workspaceAutoOpened;}});
    });
  }
  function renderEntityNav(options){
    const nav=byId("workspaceEntityNav");if(!nav)return;
    if(options.length<2){nav.hidden=true;nav.innerHTML="";nav.removeAttribute("data-signature");lastCardSignature="";return;}
    const signature=options.map(option=>`${option.key}:${option.label}`).join("|");nav.hidden=false;
    if(signature!==lastCardSignature){lastCardSignature=signature;nav.innerHTML=`<button type="button" class="entity-chip" data-entity-key="" aria-pressed="${!selectedKey}">All</button>`+
      options.map((option,index)=>`<button type="button" class="entity-chip" data-entity-key="${escapeText(option.key)}" aria-pressed="${option.key===selectedKey}"><span>${index+1}</span>${escapeText(option.label)}</button>`).join("");}
    else if(typeof nav.querySelectorAll==="function")nav.querySelectorAll("[data-entity-key]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.entityKey===selectedKey)));
  }
  function syncCards(){
    const cards=cardNodes(),options=cards.map((card,index)=>{const label=cardLabel(card,index),key=cardKey(card,label,index);prepareCard(card,index,label,key);return {label,key};});
    restoreDisclosures();applySelection(cards,options);renderEntityNav(options);const view=byId("gameCockpit")?.dataset?.workspaceView||"overview";applyRoute(view);updateNavigation();updateTrail();return options;
  }
  function queueSync(){if(syncQueued)return;syncQueued=true;const run=()=>{syncQueued=false;syncCards();updatePanelSignals();settleObserver();};
    if(typeof queueMicrotask==="function")queueMicrotask(run);else if(typeof setTimeout==="function")setTimeout(run,0);else run();}

  function selectEntity(key,{focus=true,ensure=false}={}){
    selectedKey=key&&(ensure||key!==selectedKey)?key:"";syncCards();const chosen=cardNodes().find(card=>card.dataset?.workspaceKey===selectedKey);
    if(chosen&&focus){const heading=chosen.querySelector&&chosen.querySelector("h3, summary, header");if(heading&&typeof heading.focus==="function"){if(!heading.hasAttribute||!heading.hasAttribute("tabindex"))heading.tabIndex=-1;heading.focus({preventScroll:true});}
      if(typeof chosen.scrollIntoView==="function")chosen.scrollIntoView({block:"start",inline:"nearest"});}
    return selectedKey;
  }
  function clearSelection(){selectedKey="";syncCards();return true;}

  function fallbackNavigationModel(){
    const count=cardNodes().length,log=byId("log"),entries=log&&typeof log.querySelectorAll==="function"?log.querySelectorAll(".log-entry").length:0;
    return {recommendedView:"overview",recommendation:String(byId("runNext")?.textContent||"Review the board and choose the next move."),views:{
      overview:{label:"Today",meta:"Today's priorities"},board:{label:"Board",meta:`${count} live ${count===1?"card":"cards"}`},finance:{label:"Account",meta:"Money and systems"},
      team:{label:"Team",meta:"Capacity"},growth:{label:"Production",meta:"Build and replace"},history:{label:"History",meta:entries?`${entries} entries`:"No entries"}
    }};
  }
  function navigationModel(){
    const model=isCareer()&&typeof AgencyCareer.workspaceModel==="function"?AgencyCareer.workspaceModel():fallbackNavigationModel(),
      context=byId("runContext"),source=context?.dataset?.nextView,panel=context?.dataset?.nextPanel,recommendation=String(byId("runNext")?.textContent||model?.recommendation||"");
    if(!model)return null;
    return {...model,recommendedView:VIEWS.includes(source)?source:model.recommendedView,
      recommendedSideView:SIDE_VIEWS.includes(panel)?panel:model.recommendedSideView,recommendation};
  }
  function updateNavigation(){
    const model=navigationModel();if(!model)return null;const career=!!isCareer(),currentView=byId("gameCockpit")?.dataset?.workspaceView||"overview",
      tabs=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll('[role="tab"][data-workspace-view]'):[];
    tabs.forEach(tab=>{const view=tab.dataset.workspaceView,record=model.views?.[view]||{},careerOnly=tab.classList?.contains("career-only");tab.hidden=!!careerOnly&&!career;
      const label=record.label||tab.dataset[career?"careerLabel":"generalLabel"]||view,heading=tab.querySelector&&tab.querySelector("b"),meta=tab.querySelector&&tab.querySelector("small");setText(heading,label);setText(meta,record.meta||"");
      tab.tabIndex=view===currentView?0:-1;tab.setAttribute("aria-selected",String(view===currentView));
      tab.classList?.toggle("is-recommended",view===model.recommendedView);tab.setAttribute("aria-label",`${label}${record.meta?`, ${record.meta}`:""}${view===model.recommendedView?", recommended":""}`);});
    setText(byId("workspaceNavNote"),model.recommendation||"");const next=byId("runNextButton");if(next){next.dataset.workspaceTarget=model.recommendedView||"overview";next.setAttribute("aria-label",`Recommended next: ${model.recommendation||"review today's priorities"}`);}
    return model;
  }
  /* HISTORY (2026-08-09). Selecting History used to change only the narrow right rail, so the
     whole main panel sat empty under a "Recent activity" breadcrumb. It now owns the main area:
     the day ledger at full width, with whatever numeric summary the running mode can supply. */
  function renderLedger(view){
    const ledger=byId("workspaceLedger"),slots=byId("slots"),log=byId("log");
    if(!ledger)return;
    const active=view==="history";
    ledger.hidden=!active;
    if(slots)slots.hidden=active;
    if(!active)return;
    const summary=isCareer()&&typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.ledgerSummary==="function"?AgencyCareer.ledgerSummary():"";
    const entries=log&&log.innerHTML?log.innerHTML:"<p class=\"ledger-empty\">Nothing has happened yet. Run a day and it lands here.</p>";
    ledger.innerHTML=`<div class="section-head workspace-heading"><span>Everything that has happened</span><em>newest first</em></div>${summary}<div class="ledger-entries">${entries}</div>`;
  }
  function updateTrail(){
    const trail=byId("workspaceTrail");if(!trail)return;const view=byId("gameCockpit")?.dataset?.workspaceView||"overview",model=navigationModel(),label=model?.views?.[view]?.label||view;
    if(selectedKey&&(view==="overview"||view==="board")){const chosen=cardNodes().find(card=>card.dataset?.workspaceKey===selectedKey);setText(trail,`${label} / ${chosen?.dataset?.workspaceLabel||"Selected card"}`);return;}
    const leaf={overview:"Today's priorities",board:isCareer()?"All active relationships":"All live cards",finance:isCareer()?"Cash and obligations":"Account systems",team:"Capacity and roles",growth:isCareer()?"Capabilities and expansion":"Production systems",history:"Recent activity"}[view]||"Workspace";
    setText(trail,`${label} / ${leaf}`);
  }
  function updatePanelSignals(){
    const log=byId("log"),activity=typeof document!=="undefined"&&document.querySelector?document.querySelector('[data-side-view="activity"]'):null,systems=typeof document!=="undefined"&&document.querySelector?document.querySelector('[data-side-view="systems"]'):null;
    const logCount=log&&typeof log.querySelectorAll==="function"?log.querySelectorAll(".log-entry").length:0;
    if(activity){setText(activity,logCount?`Activity (${logCount})`:"Activity");activity.setAttribute("aria-label",logCount?`Activity, ${logCount} entries`:"Activity");}
    const systemRoot=byId("accountBox"),attention=!!(systemRoot&&typeof systemRoot.querySelector==="function"&&systemRoot.querySelector(".bad,.alertpulse,.tag.flag"));
    if(systems){systems.classList.toggle("has-alert",attention);systems.setAttribute("aria-label",attention?"Systems, attention needed":"Systems");}updateNavigation();
  }

  function activateRecommendation(){
    const model=updateNavigation();
    /* Agency Career owns a short, stateful opening walkthrough. Its first recommendation is
       an actual guided action, not merely a route hint: advance the walkthrough, expose the
       founding client and put focus on the control the copy names. */
    if(isCareer()&&typeof AgencyCareer.activateGuidedRecommendation==="function"){
      const handled=AgencyCareer.activateGuidedRecommendation();if(handled)return handled;
    }
    const view=setView(model?.recommendedView||"overview",{focus:true});
    if(view==="overview"&&SIDE_VIEWS.includes(model?.recommendedSideView))setSideView(model.recommendedSideView,{persist:false});
    if(view==="board"&&model?.targetId){let target=cardNodes().find(card=>card.dataset?.clientId===model.targetId||card.dataset?.funnelId===model.targetId);
      if(!target&&isCareer()&&typeof AgencyCareer.revealWorkspaceTarget==="function"){AgencyCareer.revealWorkspaceTarget(model.targetId);syncCards();target=cardNodes().find(card=>card.dataset?.clientId===model.targetId||card.dataset?.funnelId===model.targetId);}
      if(target?.dataset?.workspaceKey&&selectedKey!==target.dataset.workspaceKey)selectEntity(target.dataset.workspaceKey);}
    return view;
  }
  function revealElement(element){
    if(!element||typeof element.closest!=="function")return false;const panel=element.closest("[data-side-panel]"),guided=typeof tutorialIsActive==="function"&&tutorialIsActive();
    if(guided){setView("overview",{persist:false});
      /* Guided actions should isolate the card being taught. Showing every full-height card
         makes the highlighted control harder to find and turns the tutorial into a crowded
         dashboard instead of one decision at a time. Keep this idempotent: selectEntity()
         toggles when called with the current key. */
      const card=element.closest(".slot,.night-workstream,.agency-client-card,.affiliate-funnel-card");
      if(card?.dataset?.workspaceKey&&selectedKey!==card.dataset.workspaceKey)selectEntity(card.dataset.workspaceKey,{focus:false});
      if(panel?.dataset?.sidePanel==="systems"){setSideView("systems",{persist:false});openSystemDrawer(element.closest("#pipeDrawer")?"pipe":"account");}
      else if(panel?.dataset?.sidePanel==="activity")setSideView("activity",{persist:false});else setSideView("actions",{persist:false});
      return true;}
    if(panel){if(panel.dataset.sidePanel==="activity")setView("history",{persist:false});else if(panel.dataset.sidePanel==="systems")setView(element.closest("#pipeDrawer")?"growth":"finance",{persist:false});else setView("overview",{persist:false});}
    else if(element.closest("#workspaceSide"))setView("finance",{persist:false});
    else if(element.closest("#workspaceMain")){setView("board",{persist:false});const card=element.closest(".slot,.night-workstream,.agency-client-card,.affiliate-funnel-card");if(card?.dataset?.workspaceKey)selectEntity(card.dataset.workspaceKey,{focus:false});}
    return true;
  }

  function handleWorkspaceClick(event){
    const target=event&&event.target;if(!target||typeof target.closest!=="function")return;const view=target.closest('[role="tab"][data-workspace-view]');if(view){setView(view.dataset.workspaceView,{focus:false});return;}
    const agencyRoute=target.closest("[data-agency-workspace]");if(agencyRoute){setView(agencyRoute.dataset.agencyWorkspace,{focus:true});return;}
    const side=target.closest('[role="tab"][data-side-view]');if(side){setSideView(side.dataset.sideView,{focus:false});return;}const chip=target.closest("[data-entity-key]");if(chip){selectEntity(chip.dataset.entityKey);return;}
    const inspect=target.closest("[data-workspace-inspect]");if(inspect)selectEntity(inspect.dataset.workspaceInspect);
  }
  function handleKeydown(event){
    if(!event||event.defaultPrevented)return;const target=event.target,workspaceTab=target?.dataset?.workspaceView,sideTab=target?.dataset?.sideView;
    if((workspaceTab||sideTab)&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key)){
      const selector=workspaceTab?'[role="tab"][data-workspace-view]':'[role="tab"][data-side-view]',tabs=typeof document!=="undefined"&&document.querySelectorAll?Array.from(document.querySelectorAll(selector)).filter(tab=>!tab.hidden):[];
      if(!tabs.length)return;const current=Math.max(0,tabs.indexOf(target)),forward=event.key==="ArrowRight"||event.key==="ArrowDown",next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(current+(forward?1:-1)+tabs.length)%tabs.length,tab=tabs[next];event.preventDefault();
      if(workspaceTab)setView(tab.dataset.workspaceView,{focus:false});else setSideView(tab.dataset.sideView,{focus:false});if(typeof tab.focus==="function")tab.focus();return;
    }
    if(event.key!=="Escape")return;const overlay=byId("overlay"),guide=byId("guideOverlay");if((overlay&&overlay.innerHTML)||(guide&&guide.innerHTML))return;
    if(selectedKey){event.preventDefault();clearSelection();return;}const cockpit=byId("gameCockpit");if(cockpit?.dataset?.workspaceView&&cockpit.dataset.workspaceView!=="overview"){event.preventDefault();setView("overview",{focus:true});}
  }

  function init(){
    if(initialized)return syncCards();initialized=true;const cockpit=byId("gameCockpit"),side=byId("workspaceSide"),slots=byId("slots"),log=byId("log"),account=byId("accountBox"),pipe=byId("pipeBox"),context=byId("runContext");
    setSideView(readPreference("side","actions",SIDE_VIEWS),{persist:false});setView(readPreference("view","overview",VIEWS),{persist:false});
    if(cockpit&&typeof cockpit.addEventListener==="function"){cockpit.addEventListener("click",handleWorkspaceClick);cockpit.addEventListener("toggle",recordDisclosure,true);}
    if(context&&typeof context.addEventListener==="function")context.addEventListener("toggle",recordDisclosure,true);
    const next=byId("runNextButton");if(next&&typeof next.addEventListener==="function")next.addEventListener("click",activateRecommendation);
    if(typeof document!=="undefined"&&typeof document.addEventListener==="function")document.addEventListener("keydown",handleKeydown);
    if(typeof MutationObserver!=="undefined"){observer=new MutationObserver(queueSync);if(slots)observer.observe(slots,{childList:true,subtree:true});if(log)observer.observe(log,{childList:true,subtree:true});if(account)observer.observe(account,{childList:true,subtree:true});if(pipe)observer.observe(pipe,{childList:true,subtree:true});}
    if(side)side.tabIndex=-1;if(byId("workspaceMain"))byId("workspaceMain").tabIndex=-1;const result=syncCards();updatePanelSignals();settleObserver();return result;
  }

  function resetPresentation(){
    selectedKey="";disclosureState={};lastCardSignature="";writePreference("view","overview");writePreference("side","actions");storeDisclosures();
    setSideView("actions",{persist:false});setView("overview",{persist:false});return true;
  }

  return Object.freeze({init,sync:queueSync,setView,setSideView,selectEntity,clearSelection,revealElement,activateRecommendation,updateNavigation,resetPresentation});
})();

if(typeof document!=="undefined"&&document.readyState!=="loading")Workspace.init();
else if(typeof document!=="undefined"&&typeof document.addEventListener==="function")document.addEventListener("DOMContentLoaded",()=>Workspace.init(),{once:true});
