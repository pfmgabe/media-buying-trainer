"use strict";

/* The cockpit is presentation state. It never advances the clock, draws RNG, edits S or
   enters the save payload. Its only job is to preserve the player's place while each mode
   continues to own its simulation and card markup. */
const Workspace=(()=>{
  const VIEWS=Object.freeze(["overview","board","command"]),SIDE_VIEWS=Object.freeze(["actions","activity","systems"]),
    VIEW_KEY="ttm.workspace.view.v1",SIDE_KEY="ttm.workspace.side.v1";
  let initialized=false,observer=null,selectedKey="",syncQueued=false,lastCardSignature="";

  const byId=id=>typeof document!=="undefined"&&document.getElementById?document.getElementById(id):null;
  function readPreference(key,fallback,allowed){try{const value=sessionStorage.getItem(key);return allowed.includes(value)?value:fallback;}catch(e){return fallback;}}
  function writePreference(key,value){try{sessionStorage.setItem(key,value);}catch(e){}}
  function escapeText(value){return String(value??"").replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));}
  function compactLabel(value,fallback){const text=String(value||"").replace(/\s+/g," ").trim();return text?text.slice(0,82):fallback;}
  function setText(node,value){if(!node)return false;const next=String(value??"");if(node.textContent===next)return false;node.textContent=next;return true;}
  function settleObserver(){if(observer&&typeof observer.takeRecords==="function")observer.takeRecords();}

  function setView(requested,{persist=true,focus=false}={}){
    const view=VIEWS.includes(requested)?requested:"overview",cockpit=byId("gameCockpit");
    if(cockpit)cockpit.dataset.workspaceView=view;
    if(persist)writePreference(VIEW_KEY,view);
    const tabs=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll('[role="tab"][data-workspace-view]'):[];
    tabs.forEach(tab=>{const active=tab.dataset.workspaceView===view;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
    if(focus){const target=view==="command"?byId("workspaceSide"):byId("workspaceMain");if(target&&typeof target.focus==="function")target.focus({preventScroll:true});}
    updateTrail();return view;
  }

  function setSideView(requested,{persist=true,focus=false}={}){
    const view=SIDE_VIEWS.includes(requested)?requested:"actions",side=byId("workspaceSide");
    if(side)side.dataset.sideView=view;if(persist)writePreference(SIDE_KEY,view);
    const tabs=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll('[role="tab"][data-side-view]'):[];
    tabs.forEach(tab=>{const active=tab.dataset.sideView===view;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
    const panels=typeof document!=="undefined"&&document.querySelectorAll?document.querySelectorAll("[data-side-panel]"):[];
    panels.forEach(panel=>{const active=panel.dataset.sidePanel===view;panel.hidden=!active;panel.setAttribute("aria-hidden",String(!active));});
    if(view==="systems"){const account=byId("accountDrawer");if(account&&!account.open)account.open=true;}
    if(focus){const panel=Array.from(panels).find(item=>item.dataset.sidePanel===view);if(panel&&typeof panel.focus==="function")panel.focus({preventScroll:true});}
    updateTrail();return view;
  }

  function cardNodes(){
    const root=byId("slots");if(!root||typeof root.querySelectorAll!=="function")return [];
    return Array.from(root.querySelectorAll(":scope > .slot, :scope > .night-workstream, .agency-roster > .agency-client-card, .agency-roster > .affiliate-funnel-card"));
  }
  function cardLabel(card,index){
    if(!card||typeof card.querySelector!=="function")return `Card ${index+1}`;
    const node=card.querySelector("h3, .night-workstream-summary strong, .night-workstream-summary b, .agency-client-name, .agency-client-card header b, summary b, .fam");
    return compactLabel(node&&node.textContent,`Card ${index+1}`);
  }
  function cardKey(label,index){return `${index}:${String(label).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,56)}`;}
  function detailNodes(card){return card&&typeof card.querySelectorAll==="function"?
    Array.from(card.querySelectorAll("details.card-detail-block, details.agency-contract")):[];}
  function prepareCard(card,index,label,key){
    if(!card||!card.dataset)return;
    card.dataset.workspaceKey=key;card.dataset.workspaceLabel=label;
    if(!card.dataset.workspacePrepared){
      card.dataset.workspacePrepared="true";
      if(typeof densityLevel!=="function"||densityLevel()!=="analyst")detailNodes(card).forEach(detail=>detail.removeAttribute&&detail.removeAttribute("open"));
    }
    if(typeof card.querySelector==="function"&&!card.querySelector(".workspace-card-toggle")){
      const button=typeof document!=="undefined"&&document.createElement?document.createElement("button"):null;
      if(button){button.type="button";button.className="workspace-card-toggle";button.dataset.workspaceInspect=key;
        button.setAttribute("aria-label",`Inspect ${label}`);button.textContent="Inspect";
        const host=String(card.tagName||"").toLowerCase()==="details"?card.querySelector("summary"):card;(host||card).appendChild(button);}
    }
  }
  function applySelection(cards,options=[]){
    const found=!!selectedKey&&options.some(option=>option.key===selectedKey);if(selectedKey&&!found)selectedKey="";
    cards.forEach((card,index)=>{const option=options[index],active=!!selectedKey&&option?.key===selectedKey,
      button=card&&typeof card.querySelector==="function"?card.querySelector(".workspace-card-toggle"):null;
      if(card?.classList){card.classList.toggle("workspace-selected",active);card.classList.toggle("workspace-dimmed",!!selectedKey&&!active);}
      if(card?.setAttribute){if(selectedKey&&!active)card.setAttribute("aria-hidden","true");else card.removeAttribute("aria-hidden");}
      if(card&&"inert" in card)card.inert=!!selectedKey&&!active;
      if(button){setText(button,active?"Back to all":"Inspect");button.setAttribute("aria-expanded",String(active));
        button.setAttribute("aria-label",active?"Return to all cards":`Inspect ${option?.label||`Card ${index+1}`}`);}
      if(active){if(card.tagName&&String(card.tagName).toLowerCase()==="details")card.open=true;
        const details=detailNodes(card),opened=details.find(detail=>detail.open)||details[0];
        if(opened&&!opened.open){opened.open=true;opened.dataset.workspaceAutoOpened="true";}}
      else detailNodes(card).forEach(detail=>{if(detail.dataset?.workspaceAutoOpened){detail.open=false;delete detail.dataset.workspaceAutoOpened;}});
    });
  }
  function renderEntityNav(options){
    const nav=byId("workspaceEntityNav");if(!nav)return;
    if(options.length<2){nav.hidden=true;nav.innerHTML="";nav.removeAttribute("data-signature");lastCardSignature="";return;}
    const signature=options.map(option=>`${option.key}:${option.label}`).join("|");
    nav.hidden=false;
    if(signature!==lastCardSignature){lastCardSignature=signature;nav.innerHTML=`<button type="button" class="entity-chip" data-entity-key="" aria-pressed="${!selectedKey}">All</button>`+
      options.map((option,index)=>`<button type="button" class="entity-chip" data-entity-key="${escapeText(option.key)}" aria-pressed="${option.key===selectedKey}"><span>${index+1}</span>${escapeText(option.label)}</button>`).join("");}
    else if(typeof nav.querySelectorAll==="function")nav.querySelectorAll("[data-entity-key]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.entityKey===selectedKey)));
  }
  function syncCards(){
    const cards=cardNodes(),options=cards.map((card,index)=>{const label=cardLabel(card,index),key=cardKey(label,index);prepareCard(card,index,label,key);return {label,key};});
    applySelection(cards,options);renderEntityNav(options);updateTrail();return options;
  }
  function queueSync(){if(syncQueued)return;syncQueued=true;const run=()=>{syncQueued=false;syncCards();updatePanelSignals();
      /* Workspace controls live inside the observed card tree. Discard records produced by
         this presentation pass so the observer cannot schedule itself forever. */
      settleObserver();};
    if(typeof queueMicrotask==="function")queueMicrotask(run);else if(typeof setTimeout==="function")setTimeout(run,0);else run();}

  function selectEntity(key,{focus=true}={}){
    selectedKey=key&&key!==selectedKey?key:"";syncCards();
    const chosen=cardNodes().find(card=>card.dataset?.workspaceKey===selectedKey);
    if(chosen&&focus){const heading=chosen.querySelector&&chosen.querySelector("h3, summary, header");
      if(heading&&typeof heading.focus==="function"){if(!heading.hasAttribute||!heading.hasAttribute("tabindex"))heading.tabIndex=-1;heading.focus({preventScroll:true});}
      if(typeof chosen.scrollIntoView==="function")chosen.scrollIntoView({block:"start",inline:"nearest"});}
    return selectedKey;
  }
  function clearSelection(){selectedKey="";syncCards();return true;}

  function updateTrail(){
    const trail=byId("workspaceTrail");if(!trail)return;
    const cockpit=byId("gameCockpit"),view=cockpit?.dataset?.workspaceView||"overview",side=byId("workspaceSide")?.dataset?.sideView||"actions";
    if(selectedKey){const chosen=cardNodes().find(card=>card.dataset?.workspaceKey===selectedKey);setText(trail,`Board / ${chosen?.dataset?.workspaceLabel||"Selected card"}`);return;}
    if(view==="command")setText(trail,`Command / ${{actions:"Actions",activity:"Activity",systems:"Systems"}[side]||"Actions"}`);
    else setText(trail,view==="board"?"Board / All cards":"Board and command overview");
  }
  function updatePanelSignals(){
    const log=byId("log"),activity=typeof document!=="undefined"&&document.querySelector?document.querySelector('[data-side-view="activity"]'):null,
      systems=typeof document!=="undefined"&&document.querySelector?document.querySelector('[data-side-view="systems"]'):null;
    const logCount=log&&typeof log.querySelectorAll==="function"?log.querySelectorAll(".log-entry").length:0;
    if(activity){setText(activity,logCount?`Activity (${logCount})`:"Activity");activity.setAttribute("aria-label",logCount?`Activity, ${logCount} entries`:"Activity");}
    const systemRoot=byId("accountBox"),attention=!!(systemRoot&&typeof systemRoot.querySelector==="function"&&systemRoot.querySelector(".bad,.alertpulse,.tag.flag"));
    if(systems){systems.classList.toggle("has-alert",attention);systems.setAttribute("aria-label",attention?"Systems, attention needed":"Systems");}
  }

  function revealElement(element){
    if(!element||typeof element.closest!=="function")return false;
    const panel=element.closest("[data-side-panel]");if(panel)setSideView(panel.dataset.sidePanel,{persist:false});
    const cockpit=byId("gameCockpit"),view=cockpit?.dataset?.workspaceView||"overview";
    if(element.closest("#workspaceSide")&&view==="board")setView("command",{persist:false});
    else if(element.closest("#workspaceMain")){if(view==="command")setView("board",{persist:false});const card=element.closest(".slot,.night-workstream,.agency-client-card,.affiliate-funnel-card");if(card?.dataset?.workspaceKey)selectEntity(card.dataset.workspaceKey,{focus:false});}
    return true;
  }

  function handleWorkspaceClick(event){
    const target=event&&event.target;if(!target||typeof target.closest!=="function")return;
    const view=target.closest('[role="tab"][data-workspace-view]');if(view){setView(view.dataset.workspaceView,{focus:true});return;}
    const side=target.closest('[role="tab"][data-side-view]');if(side){setSideView(side.dataset.sideView,{focus:false});return;}
    const chip=target.closest("[data-entity-key]");if(chip){selectEntity(chip.dataset.entityKey);return;}
    const inspect=target.closest("[data-workspace-inspect]");if(inspect){selectEntity(inspect.dataset.workspaceInspect);}
  }
  function handleKeydown(event){
    if(!event||event.defaultPrevented)return;
    const target=event.target,workspaceTab=target?.dataset?.workspaceView,sideTab=target?.dataset?.sideView;
    if((workspaceTab||sideTab)&&["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){
      const selector=workspaceTab?'[role="tab"][data-workspace-view]':'[role="tab"][data-side-view]',tabs=typeof document!=="undefined"&&document.querySelectorAll?Array.from(document.querySelectorAll(selector)):[];
      if(!tabs.length)return;const current=Math.max(0,tabs.indexOf(target)),next=event.key==="Home"?0:event.key==="End"?tabs.length-1:
        (current+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length,tab=tabs[next];event.preventDefault();
      if(workspaceTab)setView(tab.dataset.workspaceView,{focus:false});else setSideView(tab.dataset.sideView,{focus:false});if(typeof tab.focus==="function")tab.focus();return;
    }
    if(event.key!=="Escape")return;
    const overlay=byId("overlay"),guide=byId("guideOverlay");if((overlay&&overlay.innerHTML)||(guide&&guide.innerHTML))return;
    if(selectedKey){event.preventDefault();clearSelection();return;}
    const cockpit=byId("gameCockpit");if(cockpit?.dataset?.workspaceView&&cockpit.dataset.workspaceView!=="overview"){event.preventDefault();setView("overview",{focus:true});}
  }

  function init(){
    if(initialized)return syncCards();initialized=true;
    const cockpit=byId("gameCockpit"),side=byId("workspaceSide"),slots=byId("slots"),log=byId("log"),account=byId("accountBox");
    setView(readPreference(VIEW_KEY,"overview",VIEWS),{persist:false});setSideView(readPreference(SIDE_KEY,"actions",SIDE_VIEWS),{persist:false});
    if(cockpit&&typeof cockpit.addEventListener==="function")cockpit.addEventListener("click",handleWorkspaceClick);
    if(typeof document!=="undefined"&&typeof document.addEventListener==="function")document.addEventListener("keydown",handleKeydown);
    if(typeof MutationObserver!=="undefined"){
      observer=new MutationObserver(queueSync);if(slots)observer.observe(slots,{childList:true,subtree:true});if(log)observer.observe(log,{childList:true,subtree:true});if(account)observer.observe(account,{childList:true,subtree:true});
    }
    if(side)side.tabIndex=-1;if(byId("workspaceMain"))byId("workspaceMain").tabIndex=-1;
    const result=syncCards();updatePanelSignals();settleObserver();return result;
  }

  return Object.freeze({init,sync:queueSync,setView,setSideView,selectEntity,clearSelection,revealElement});
})();

if(typeof document!=="undefined"&&document.readyState!=="loading")Workspace.init();
else if(typeof document!=="undefined"&&typeof document.addEventListener==="function")document.addEventListener("DOMContentLoaded",()=>Workspace.init(),{once:true});
