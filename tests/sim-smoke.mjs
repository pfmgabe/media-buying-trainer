import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {createHash,webcrypto} from "node:crypto";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import "./workspace-stability.mjs";

const root=new URL("../",import.meta.url);
const html=fs.readFileSync(new URL("index.html",root),"utf8");
const css=fs.readFileSync(new URL("assets/styles/trainer.css",root),"utf8");
const editorialStyle=fs.readFileSync(new URL("EDITORIAL_STYLE.md",root),"utf8");
const CACHE_VERSION="64";
const APP_FILES=[
  "js/content-db.js","js/feedback.js","js/radio-data.js","js/radio.js","js/runtime.js","js/session.js","js/training-progress.js","js/flavors.js",
  "js/modern-content.js","js/agency-career-data.js","js/modern-engine.js","js/nightmare-engine.js","js/knowledge-data.js","js/lesson-data.js",
  "js/field-guide.js","js/tutorial.js","js/classic-client-data.js","js/classic-engine.js","js/agency-career-engine.js","js/menu-flow.js","js/workspace.js","js/ambient-background.js","js/bootstrap.js"
];
const SCRIPT_FILES=["js/access.js",...APP_FILES];
const scriptSources=[...html.matchAll(/<script\s+src=["']([^"']+)["'][^>]*><\/script>/g)].map(match=>match[1]);
assert.deepEqual(scriptSources,SCRIPT_FILES.map(file=>`${file}?v=${CACHE_VERSION}`),
  "index script order or shared cache version changed");
for(const file of SCRIPT_FILES)assert(fs.existsSync(new URL(file,root)),`missing script: ${file}`);
const gateScript=fs.readFileSync(new URL("js/access.js",root),"utf8");
const appSources=APP_FILES.map(file=>({file,source:fs.readFileSync(new URL(file,root),"utf8")}));
const compiledAppScripts=appSources.map(({file,source})=>new vm.Script(source,{filename:file}));
const appScript=appSources.map(({file,source})=>`/* ${file} */\n${source}`).join("\n;\n");
const sourceCorpus=[html,css,gateScript,appScript].join("\n");
assert(gateScript.includes("media-buying-trainer-access-v1"),"access-gate script is missing");
assert(appScript.includes("deterministic RNG so two people can compare"),"simulation runtime is missing");
assert.match(editorialStyle,/AP style as a clarity and consistency baseline/i);
for(const question of ["What is it?","Why does it matter now?","What changes it?","What can I do about it?","Where will I see the result?"])
  assert(editorialStyle.includes(question),`editorial style omitted teaching question: ${question}`);
assert.doesNotMatch(appScript,/\b(?:the|this) trainer\b/i,"player-facing game copy fell back to a generic trainer label");
assert.doesNotMatch(appScript,/\b(?:colour|optimised|optimisation)\b/i,"player-facing copy must use American English");

class FakeClassList{
  constructor(){this.values=new Set();}
  add(...names){for(const name of names)if(name)this.values.add(name);}
  remove(...names){for(const name of names)this.values.delete(name);}
  toggle(name,force){
    const next=force===undefined?!this.values.has(name):!!force;
    if(next)this.values.add(name);else this.values.delete(name);return next;
  }
  contains(name){return this.values.has(name);}
  reset(value=""){this.values=new Set(String(value).split(/\s+/).filter(Boolean));}
  toString(){return [...this.values].join(" ");}
}

class FakeElement{
  constructor(id,registry){
    this.id=id;this.registry=registry;this.style={};this.dataset={};this.attributes={};this.listeners={};
    this.disabled=false;this.textContent="";this.value="";this._descendants=[];this.children=[];
    this.parentNode=null;this.classList=new FakeClassList();this.hidden=false;this.inert=false;this.removed=false;this.open=false;
  }
  set innerHTML(value){
    this._innerHTML=String(value);
    for(const old of this._descendants)old.parentNode=null;
    this._descendants=[];let anonymous=0;
    for(const match of this._innerHTML.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)){
      const tag=match[1].toLowerCase(),attrs=match[2];
      const idMatch=attrs.match(/(?:^|\s)id\s*=\s*["']([^"']+)["']/i);
      const data=[...attrs.matchAll(/\bdata-([\w-]+)=["']([^"']*)["']/gi)];
      const classMatch=attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i);
      if(!idMatch&&!data.length&&!classMatch)continue;
      const id=idMatch?idMatch[1]:`__${this.id}_${anonymous++}`;
      const el=this.registry[id]||(this.registry[id]=new FakeElement(id,this.registry));
      el.tagName=tag;el.dataset={};el.attributes={};el.disabled=/\bdisabled(?:\s|>|$)/i.test(attrs);el.open=/\bopen(?:\s|>|$)/i.test(attrs);el.parentNode=this;
      el.classList.reset(classMatch?classMatch[1]:"");el.removed=false;
      for(const item of data){
        const key=item[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());el.dataset[key]=item[2];
      }
      const valueMatch=attrs.match(/\bvalue=["']([^"']*)["']/i);if(valueMatch)el.value=valueMatch[1];
      for(const attr of attrs.matchAll(/\b(aria-[\w-]+|href|title|role|tabindex)=["']([^"']*)["']/gi))
        el.attributes[attr[1].toLowerCase()]=attr[2];
      this._descendants.push(el);
    }
    if(this.id==="overlay"||this.id==="guideOverlay"){
      const modal=this._descendants.find(el=>el.id==="modalCard"||el.id==="guideCard"),
        veil=this._descendants.find(el=>el.classList.contains("veil"));
      if(modal){if(veil){veil.parentNode=this;modal.parentNode=veil;}
        for(const el of this._descendants)if(el!==modal&&el!==veil)el.parentNode=modal;}
    }
  }
  get innerHTML(){return this._innerHTML||"";}
  set className(value){this.classList.reset(value);}
  get className(){return this.classList.toString();}
  addEventListener(type,handler){(this.listeners[type]||(this.listeners[type]=[])).push(handler);}
  appendChild(child){
    if(!child)return child;
    if(child.parentNode&&child.parentNode!==this&&Array.isArray(child.parentNode.children))
      child.parentNode.children=child.parentNode.children.filter(item=>item!==child);
    child.parentNode=this;this.children.push(child);child.removed=false;
    if(child.id)this.registry[child.id]=child;
    return child;
  }
  querySelectorAll(selector){
    const data=selector.match(/^(?:([a-z]+))?\[data-([\w-]+)\]$/i);
    if(data){
      const key=data[2].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
      return this._descendants.filter(el=>(!data[1]||el.tagName===data[1].toLowerCase())&&el.dataset[key]!==undefined);
    }
    const compound=selector.match(/^\.([\w-]+)\[([\w-]+)\]$/);if(compound){const attr=compound[2],key=attr.replace(/^data-/,'').replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
      return this._descendants.filter(el=>el.classList.contains(compound[1])&&
        (el.attributes[attr]!==undefined||(attr.startsWith("data-")&&el.dataset[key]!==undefined)));}
    const cls=selector.match(/^\.([\w-]+)$/);if(cls)return this._descendants.filter(el=>el.classList.contains(cls[1]));
    return [];
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==="open")this.open=true;if(name.startsWith("data-")){
    const key=name.slice(5).replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());this.dataset[key]=String(value);}}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(name){delete this.attributes[name];if(name==="open")this.open=false;if(name.startsWith("data-")){
    const key=name.slice(5).replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());delete this.dataset[key];}}
  closest(selector){
    const matches=(node,part)=>{
      if(part==="button")return node.tagName==="button";
      const id=part.match(/^#([\w-]+)$/);if(id)return node.id===id[1];
      const taggedData=part.match(/^([a-z]+)\[data-([\w-]+)="([^"]*)"\]$/i);if(taggedData){
        const key=taggedData[2].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());return node.tagName===taggedData[1].toLowerCase()&&node.dataset?.[key]===taggedData[3];}
      const taggedPresence=part.match(/^([a-z]+)\[data-([\w-]+)\]$/i);if(taggedPresence){
        const key=taggedPresence[2].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());return node.tagName===taggedPresence[1].toLowerCase()&&node.dataset?.[key]!==undefined;}
      const dataValues=part.match(/^([a-z]+)((?:\[data-[\w-]+="[^"]*"\])+)$/i);if(dataValues){
        const wanted=[...dataValues[2].matchAll(/\[data-([\w-]+)="([^"]*)"\]/g)].map(match=>[match[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase()),match[2]]);
        return node.tagName===dataValues[1].toLowerCase()&&wanted.every(([key,expected])=>node.dataset?.[key]===expected);}
      const cls=part.match(/^\.([\w-]+)$/);if(cls)return !!node.classList?.contains(cls[1]);
      const data=part.match(/^\[data-([\w-]+)\]$/);if(data){const key=data[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());return node.dataset?.[key]!==undefined;}
      return false;
    },parts=String(selector||"").split(",").map(part=>part.trim()).filter(Boolean);
    let node=this;while(node){if(parts.some(part=>matches(node,part)))return node;node=node.parentNode;}return null;
  }
  contains(node){if(node===this)return true;let parent=node&&node.parentNode;while(parent){if(parent===this)return true;parent=parent.parentNode;}return false;}
  focus(){this.registry.__active=this;}
  scrollIntoView(options){this.scrolledIntoView=options||true;}
  replaceWith(node){this.replacedWith=node;this.parentNode=null;}
  remove(){if(this.parentNode&&Array.isArray(this.parentNode.children))this.parentNode.children=this.parentNode.children.filter(item=>item!==this);this.parentNode=null;this.removed=true;}
  getBoundingClientRect(){return {left:0,bottom:0};}
}

function fakeDom(){
  const registry={};
  for(const id of ["runSummary","seedLbl","flavorSelect","densitySelect","learningMenu","learningCloseBtn","tipsBtn","analogyBtn","radioBtn",
    "sfxBtn","ambientBtn","ambientCanvas","audioBtn","menuBtn","audioPanel","audioTitle","audioCloseBtn","sfxVolume","sfxVolumeLabel",
    "sfxCues","radioPanel","radioTitle","radioCurrent","radioFlow","radioPhase","radioCloseBtn","radioStations",
    "radioUtility","radioContext","radioCurator","radioSearchCode","radioSearchLink",
    "radio-synthwave","radio-deep-house","radio-trance","radio-dnb","radio-lofi","spotifyPlayer","radioOpenLink",
    "radioPopoutBtn","musicVolumeHelp",
    "runContext","runType","runModeName","runProgress","runPhase","runNext","runObjective","runWinCondition",
    "realityBar","tutorialBox","accountSection","accountSectionNote","strip","adSection","adSectionNote","slots",
    "operationsSection","operationsSectionNote","runBtn","runLens","logSection","log","benchSection","binBtn",
    "helpBtn","loreBtn","asksRow","asksLabel","asksLeft","accountBox","pipeBox","overlay","guideOverlay",
    "fxLayer","gate","pw","go","pwerr"]){
    registry[id]=new FakeElement(id,registry);
  }
  registry.audioPanel.hidden=true;registry.radioPanel.hidden=true;
  registry.wrap=new FakeElement("wrap",registry);
  const documentListeners={};
  const document={
    body:new FakeElement("body",registry),documentElement:{clientWidth:1280},
    baseURI:"https://example.test/media-buying-trainer/index.html",
    getElementById:id=>registry[id]||(registry[id]=new FakeElement(id,registry)),
    querySelector(selector){
      if(selector===".wrap")return registry.wrap;
      const direct=selector.match(/^#([\w-]+)$/);if(direct)return registry[direct[1]]||null;
      const nested=selector.match(/^#([\w-]+)\s+\.([\w-]+)/);if(nested){
        const parent=registry[nested[1]];return parent?parent._descendants.find(el=>el.classList.contains(nested[2]))||parent:null;
      }
      const dataButton=String(selector).match(/^button((?:\[data-[\w-]+="[^"]*"\])+)$/);if(dataButton){
        const wanted=[...dataButton[1].matchAll(/\[data-([\w-]+)="([^"]*)"\]/g)].map(match=>[
          match[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase()),match[2]]);
        return Object.values(registry).find(el=>el instanceof FakeElement&&el.parentNode&&!el.removed&&el.tagName==="button"&&
          wanted.every(([key,expected])=>el.dataset[key]===expected))||null;
      }
      const first=String(selector).split(",")[0].trim().match(/^#([\w-]+)/);return first?registry[first[1]]||null:null;
    },
    querySelectorAll(selector){
      const compound=String(selector).match(/^\.([\w-]+)\[([\w-]+)\]$/);if(compound){const attr=compound[2],key=attr.replace(/^data-/,'').replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
        return Object.values(registry).filter(el=>el instanceof FakeElement&&el.parentNode&&!el.removed&&el.classList.contains(compound[1])&&
          (el.attributes[attr]!==undefined||(attr.startsWith("data-")&&el.dataset[key]!==undefined)));}
      const data=String(selector).match(/^(?:([a-z]+))?\[data-([\w-]+)\]$/i);if(data){const key=data[2].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
        return Object.values(registry).filter(el=>el instanceof FakeElement&&el.parentNode&&!el.removed&&
          (!data[1]||el.tagName===data[1].toLowerCase())&&el.dataset[key]!==undefined);}
      const cls=String(selector).match(/^\.([\w-]+)$/);if(!cls)return [];
      return Object.values(registry).filter(el=>el instanceof FakeElement&&el.parentNode&&!el.removed&&el.classList.contains(cls[1]));
    },
    addEventListener(type,handler,options){(documentListeners[type]||(documentListeners[type]=[])).push({handler,options});},
    createElement:tag=>new FakeElement(tag,registry),
    createTextNode:text=>({nodeType:3,textContent:String(text)}),
    createTreeWalker:()=>({nextNode:()=>null})
  };
  Object.defineProperty(document,"activeElement",{get:()=>registry.__active||null});
  return {document,registry,documentListeners};
}

function makeContext(search="?mode=1&seed=7",options={}){
  const {document,registry,documentListeners}=fakeDom();
  const storage=options.sessionStore||new Map();
  const persistent=options.localStore||new Map();
  const profile=options.profile||"general";
  if(options.tutorialComplete!==false){
    for(const id of ["general","specialist"]){const key=`ttm.tutorial.${id}.v2`;
      if(!persistent.has(key))persistent.set(key,JSON.stringify({introComplete:true,complete:true,step:9,runKey:null,
        generatedCreativeId:null,baseline:null,comparison:null,completedAt:"test"}));}
  }
  const location={search,pathname:"/media-buying-trainer/"};
  const history={lastUrl:null,replaceState(_state,_title,url){
    this.lastUrl=String(url);location.search=this.lastUrl.includes("?")?this.lastUrl.slice(this.lastUrl.indexOf("?")):"";
  }};
  const audioPlays=[];
  class FakeAudio{
    constructor(src=""){this.src=src;this.preload="";this.volume=1;this.currentTime=0;this.paused=false;}
    cloneNode(){return new FakeAudio(this.src);}
    play(){audioPlays.push({src:this.src,volume:this.volume});return options.audioReject?Promise.reject(new Error("synthetic audio rejection")):Promise.resolve();}
    pause(){this.paused=true;}
  }
  class FakeMutationObserver{constructor(callback){this.callback=callback;}observe(){}disconnect(){}}
  const windowListeners={},windowOpenCalls=[],broadcastChannels=[];
  const namedWindows=new Map();
  function fakeWindowOpen(url,target="_blank",features=""){
    const call={url:String(url),target:String(target),features:String(features),result:null};
    windowOpenCalls.push(call);
    if(options.radioPopupBlocked&&target==="ttm-media-buyer-radio")return null;
    let popup=target!=="_blank"?namedWindows.get(target):null;
    if(!popup||popup.closed){
      popup={closed:false,focusCalls:0,focus(){this.focusCalls++;},close(){this.closed=true;}};
      if(target!=="_blank")namedWindows.set(target,popup);
    }
    call.result=popup;return popup;
  }
  class FakeBroadcastChannel{
    constructor(name){this.name=String(name);this.listeners={};this.messages=[];broadcastChannels.push(this);}
    addEventListener(type,handler){(this.listeners[type]||(this.listeners[type]=[])).push(handler);}
    postMessage(message){this.messages.push(message);}
    emit(message){for(const handler of this.listeners.message||[])handler({data:message});}
    close(){this.closed=true;}
  }
  const context=vm.createContext({
    console,document,location,URL,URLSearchParams,TextEncoder,Uint8Array,NodeFilter:{SHOW_TEXT:4},crypto:globalThis.crypto||webcrypto,
    sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
    localStorage:{getItem:key=>persistent.get(key)??null,setItem:(key,value)=>persistent.set(key,String(value)),removeItem:key=>persistent.delete(key)},
    history,window:null,setTimeout,clearTimeout,queueMicrotask,MutationObserver:FakeMutationObserver,
    open:fakeWindowOpen,
    addEventListener(type,handler){(windowListeners[type]||(windowListeners[type]=[])).push(handler);},
    removeEventListener(type,handler){if(windowListeners[type])windowListeners[type]=windowListeners[type].filter(item=>item!==handler);},
    BroadcastChannel:options.broadcastChannel===false?undefined:FakeBroadcastChannel,
    Audio:options.audio===false?undefined:FakeAudio,matchMedia:()=>({matches:options.reducedMotion!==false}),
    __trainerAccessGranted:options.accessGranted!==false,__trainerProfile:profile
  });
  context.window=context;
  for(const script of compiledAppScripts)script.runInContext(context);
  return {context,registry,history,localStore:persistent,sessionStore:storage,audioPlays,documentListeners,
    windowListeners,windowOpenCalls,broadcastChannels};
}

function state(context){return vm.runInContext("S",context);}
function value(context,expression){return vm.runInContext(expression,context);}
function clickAct(fixture,act,i=0){
  fixture.registry.slots.listeners.click[0]({target:{closest:()=>({dataset:{act,i:String(i)}})}});
}
function clickRun(fixture){
  const handlers=fixture.registry.runBtn.listeners.click||[];assert(handlers.length,"RUN DAY has no click handler");
  handlers[handlers.length-1]({target:fixture.registry.runBtn});
}
function finishRunOpening(fixture){const total=value(fixture.context,"openingBriefSlides.length");for(let slide=0;slide<total;slide++){
  assert.equal(typeof fixture.registry.openingNext.onclick,"function",`opening slide ${slide+1} has no continuation`);
  fixture.registry.openingNext.onclick();
}}
function clickUi(fixture,element){
  assert(element,"UI control was not found");let stopped=false,prevented=false;
  const event={target:element,defaultPrevented:false,preventDefault(){prevented=true;this.defaultPrevented=true;},
    stopImmediatePropagation(){stopped=true;}};
  for(const item of fixture.documentListeners.click||[]){
    if(item.options===true||item.options?.capture)item.handler(event);
    if(stopped)return false;
  }
  if(element.disabled)return false;
  for(const handler of element.listeners.click||[]){handler(event);if(stopped)return false;}
  if(typeof element.onclick==="function"){element.onclick(event);if(stopped)return false;}
  let parent=element.parentNode;
  while(parent){for(const handler of parent.listeners?.click||[]){handler(event);if(stopped)return false;}parent=parent.parentNode;}
  if(!prevented&&element.tagName==="summary"){
    const group=fixture.registry.overlay.querySelectorAll(".creative-format-group")
      .find(candidate=>candidate.dataset.formatSystem===element.dataset.formatSystem);
    if(group)group.open=!group.open;
  }
  return !prevented;
}
function dispatchDocumentEvent(fixture,type,target,details={}){
  let propagationStopped=false,immediateStopped=false;
  const event={type,target,defaultPrevented:false,...details,
    preventDefault(){this.defaultPrevented=true;},stopPropagation(){propagationStopped=true;},
    stopImmediatePropagation(){propagationStopped=true;immediateStopped=true;}};
  const listeners=fixture.documentListeners[type]||[];
  for(const item of listeners){if(!(item.options===true||item.options?.capture))continue;item.handler(event);if(immediateStopped)break;}
  if(!propagationStopped)for(const item of listeners){if(item.options===true||item.options?.capture)continue;item.handler(event);if(immediateStopped)break;}
  return event;
}
function dispatchDocumentKey(fixture,key,target,{shiftKey=false}={}){
  return dispatchDocumentEvent(fixture,"keydown",target,{key,shiftKey});
}
function installWorkspaceHarness(fixture,labels=["Lantern Fox Home Services","Quartz Finch Advisory Group"]){
  const {context,registry}=fixture,document=context.document;
  const makeTab=(id,dataKey,value,parent)=>{const tab=new FakeElement(id,registry);tab.tagName="button";tab.dataset[dataKey]=value;
    tab.attributes.role="tab";tab.classList.add(dataKey==="workspaceView"?"workspace-tab":"side-tab");
    if(dataKey==="workspaceView"){
      const heading=new FakeElement(`${id}-heading`,registry),meta=new FakeElement(`${id}-meta`,registry);heading.tagName="b";meta.tagName="small";
      tab.querySelector=selector=>selector==="b"?heading:selector==="small"?meta:null;tab._tabHeading=heading;tab._tabMeta=meta;
      if(value==="team")tab.classList.add("career-only");
    }
    parent.appendChild(tab);return tab;};
  const cockpit=registry.gameCockpit||(registry.gameCockpit=new FakeElement("gameCockpit",registry));
  const main=registry.workspaceMain||(registry.workspaceMain=new FakeElement("workspaceMain",registry));
  const side=registry.workspaceSide||(registry.workspaceSide=new FakeElement("workspaceSide",registry));
  const accountRibbon=registry.accountRibbon||(registry.accountRibbon=new FakeElement("accountRibbon",registry));
  accountRibbon.hidden=true;side.appendChild(accountRibbon);
  const trail=registry.workspaceTrail||(registry.workspaceTrail=new FakeElement("workspaceTrail",registry));
  const navNote=registry.workspaceNavNote||(registry.workspaceNavNote=new FakeElement("workspaceNavNote",registry));
  const nextButton=registry.runNextButton||(registry.runNextButton=new FakeElement("runNextButton",registry));nextButton.tagName="button";
  const entityNav=registry.workspaceEntityNav||(registry.workspaceEntityNav=new FakeElement("workspaceEntityNav",registry));
  const drawer=registry.accountDrawer||(registry.accountDrawer=new FakeElement("accountDrawer",registry));drawer.open=false;
  const pipeDrawer=registry.pipeDrawer||(registry.pipeDrawer=new FakeElement("pipeDrawer",registry));pipeDrawer.open=false;
  const workspaceTabs=["overview","board","finance","team","growth","history"].map(id=>makeTab(`workspace-${id}`,"workspaceView",id,cockpit));
  const sideTabs=["actions","activity","systems"].map(id=>makeTab(`side-${id}`,"sideView",id,side));
  const sidePanels=["actions","activity","systems"].map(id=>{const panel=new FakeElement(`panel-${id}`,registry);panel.tagName="section";
    panel.dataset.sidePanel=id;side.appendChild(panel);return panel;});
  const cards=labels.map((label,index)=>{const card=new FakeElement(`workspace-card-${index}`,registry);card.tagName="article";card.dataset.clientId=`client-${String(index+1).padStart(3,"0")}`;
    card.classList.add("agency-client-card","slot");const heading=new FakeElement(`workspace-heading-${index}`,registry);heading.tagName="h3";heading.textContent=label;heading.parentNode=card;
    const detail=new FakeElement(`workspace-detail-${index}`,registry);detail.tagName="details";detail.classList.add("card-detail-block");detail.open=false;detail.parentNode=card;
    card._descendants=[heading,detail];card.querySelectorAll=selector=>selector.includes("details.card-detail-block")?[detail]:[];
    card.querySelector=selector=>selector===".workspace-card-toggle"?card.children.find(child=>child.classList?.contains("workspace-card-toggle"))||null:
      selector.includes("h3")||selector.includes("header")||selector.includes("summary")?heading:null;
    return {card,heading,detail};});
  registry.slots.querySelectorAll=selector=>selector.includes(".agency-client-card")?cards.map(item=>item.card):[];
  const originalAll=document.querySelectorAll.bind(document),originalOne=document.querySelector.bind(document);
  document.querySelectorAll=selector=>selector==='[role="tab"][data-workspace-view]'?workspaceTabs:
    selector==='[role="tab"][data-side-view]'?sideTabs:selector==="[data-side-panel]"?sidePanels:
      selector==="[data-disclosure-id]"?cards.map(item=>item.detail).filter(detail=>detail.dataset.disclosureId!==undefined):originalAll(selector);
  document.querySelector=selector=>selector==='[data-side-view="activity"]'?sideTabs[1]:selector==='[data-side-view="systems"]'?sideTabs[2]:originalOne(selector);
  return {cockpit,main,side,accountRibbon,trail,navNote,nextButton,entityNav,drawer,pipeDrawer,workspaceTabs,sideTabs,sidePanels,cards};
}
function clickClassic(fixture,action,i=0,data={}){
  const handler=fixture.registry.slots.listeners.click[1];
  handler({target:{closest:selector=>selector.includes("data-ca")?{dataset:{ca:action,i:String(i),...data}}:null}});
}
function finiteTree(value,seen=new Set()){
  if(value===null||typeof value==="string"||typeof value==="boolean"||value===undefined)return;
  if(typeof value==="number"){assert(Number.isFinite(value),`non-finite number: ${value}`);return;}
  if(typeof value!=="object"||seen.has(value))return;
  seen.add(value);
  for(const child of Object.values(value))finiteTree(child,seen);
}
function approx(actual,expected,tolerance=1e-4,message=""){
  assert(Math.abs(actual-expected)<=tolerance,
    `${message||"numeric snapshot mismatch"}: expected ${expected}, received ${actual}`);
}

function runToEnd(context,{headless=false}={}){
  if(headless)vm.runInContext("render=()=>{};autoCheckpoint=()=>{}",context);
  const agency=value(context,"MODE===6");
  const days=value(context,"MODE===6?AGENCY_TOTAL_MONTHS*AGENCY_MONTH_DAYS:MODE===0?CLASSIC_DAYS:DAYS");
  const nightmare=value(context,"MODE===5");
  const classic=value(context,"MODE===0");
  for(let i=0;i<days*8;i++){
    if((nightmare||agency)&&state(context).ended)break;
    if(classic&&state(context).client?.pendingEncounter?.phase==="choice")
      vm.runInContext(`(()=>{const p=S.client.pendingEncounter,e=CLASSIC_CLIENT_EVENTS[p.eventId],o=e.options.slice().sort((a,b)=>(b.evidence+b.operational+b.base)-(a.evidence+a.operational+a.base))[0];return resolveClassicClientEncounter(o.id)})()`,context);
    else if(classic&&state(context).client?.pendingEncounter?.phase==="feedback")vm.runInContext("continueClassicClientEncounter()",context);
    else vm.runInContext("runDay()",context);
    const s=state(context);
    finiteTree(s);
    if(value(context,"MODE===0")){
      const spent=s.groups.filter(group=>!group.paused&&group.last).reduce((sum,group)=>sum+group.last.spend,0);
      assert(spent<=s.budget+1e-6,"Classic daily spend exceeded its cap");
    }else if(agency){
      assert(state(context).clients.length<=value(context,"AGENCY_MAX_CLIENTS"),"Agency Career exceeded its 75-seat cap");
      assert.equal(value(context,"AgencyCareer.validate(S)"),true,"Agency Career state failed validation");
    }else if(!nightmare){
      const allocated=s.slots.filter(slot=>slot.alive).reduce((sum,slot)=>sum+slot.budget,0);
      assert(allocated<=value(context,"DAILY")+1e-6,"Modern allocation exceeded its cap");
    }else{
      const allocated=s.accounts.filter(account=>!account.paused).reduce((sum,account)=>sum+account.budget,0);
      assert(allocated<=value(context,"DAILY")+1e-6,"Nightmare allocation exceeded its cap");
      assert(s.finance.creditUsed<=s.finance.creditLimit+1e-6,"Nightmare shared credit exceeded its limit");
      assert.deepEqual(Array.from(value(context,"NightmareEngine.validate()")),[]);
    }
    if(!nightmare&&!agency&&s.day===days+1&&(!classic||!s.client.pendingEncounter))break;
  }
  if(nightmare||agency){
    assert.equal(state(context).ended,true,`${agency?"Agency Career":"Nightmare"} run did not reach an exit condition`);
    assert(state(context).day<=days+1,`${agency?"Agency Career":"Nightmare"} run exceeded its configured period`);
  }else assert.equal(state(context).day,days+1,"run did not end on the configured period");
}

function runAgencySearchPolicy(context,maxDays=2400){
  const policyDay=`(()=>{
    const tech=["landing_systems","measurement","automation","agency_os","first_party","portfolio_measurement","predictive_ops"];
    for(const id of tech)if(AgencyCareer.canUnlock(id).ok)AgencyCareer.unlock(id,{render:false});
    while(AgencyCareer.capacity().utilization>.72&&S.staff.buyer<12){if(!AgencyCareer.hire("buyer",{render:false}))break;}
    const rows=AgencyCareer.activeClients().slice().sort((a,b)=>(b.incident?.critical?1000:0)-(a.incident?.critical?1000:0)||
      (b.incident?300:0)-(a.incident?300:0)||b.serviceDebt-a.serviceDebt||a.nextDue-b.nextDue);
    const response={quality:"service",auction:"service",tracking:"audit",policy:"audit",creative:"refresh",stakeholder:"update"};
    for(const client of rows){
      if(client.incident)AgencyCareer.operate(client.id,response[client.incident.id]||"service",{render:false});
      if(S.day>=client.nextDue)AgencyCareer.operate(client.id,"service",{render:false});
    }
    if(AgencyCareer.activeClients().length<S.targetSeats&&!S.prospects.length)AgencyCareer.generateProspects(S);
    const leads=S.prospects.slice().filter(lead=>lead.channel==="search").sort((a,b)=>(b.fee/AgencyCareer.serviceCost(b))-(a.fee/AgencyCareer.serviceCost(a)));
    for(const lead of leads){
      if(AgencyCareer.activeClients().length>=S.targetSeats||S.focusRemaining<1)break;
      AgencyCareer.acceptProspect(lead.id,{render:false});
    }
    return AgencyCareer.runDay({force:true});
  })()`;
  for(let turn=0;turn<maxDays&&!state(context).ended;turn++){
    assert.equal(vm.runInContext(policyDay,context),true,`search-specialist policy stalled on career day ${state(context).day}`);
    finiteTree(state(context));assert.equal(value(context,"AgencyCareer.validate(S)"),true);
  }
  return state(context);
}

function runStableAgencyDay(context){
  return value(context,`(()=>{for(const client of AgencyCareer.activeClients()){
    client.incident=null;client.incidentAge=0;client.nextDue=Math.max(client.nextDue,S.day+2);
    client.trust=Math.max(client.trust,82);client.health=Math.max(client.health,82);
  }return AgencyCareer.runDay({force:true})})()`);
}
function runToNextAgencySettlement(context,maxDays=20){
  const before=state(context).monthlyHistory.length;
  for(let day=0;day<maxDays&&!state(context).ended&&state(context).monthlyHistory.length===before;day++)
    assert.equal(runStableAgencyDay(context),true,`Agency Career stalled before settlement ${before+1}`);
  assert.equal(state(context).monthlyHistory.length,before+1,`Agency Career did not post settlement ${before+1}`);
  return state(context).monthlyHistory.at(-1);
}

const NIGHTMARE_RESPONSE={ghost_attribution:"audit",pixel_contamination:"clean",payout_delay:"factor",
  false_flag:"appeal",bid_war:"relevance",payment_failure:"paydown",brand_conquest:"protect"};
const QUALITY_RESPONSES=["account_test","signal_test","creative_test","observe","cohort","clean_migration"];
function runNightmarePolicy(context,maxTurns=180){
  for(let turn=0;turn<maxTurns&&!state(context).ended;turn++){
    while(state(context).ops>0&&state(context).crises.length){const c=state(context).crises[0];
      const choice=c.type==="lead_quality_escalation"?QUALITY_RESPONSES.find(item=>!(c.meta?.attempted||[]).includes(item)):NIGHTMARE_RESPONSE[c.type];
      if(!choice)break;
      const resolved=value(context,`NightmareEngine.resolveCrisis(${JSON.stringify(c.id)},${JSON.stringify(choice)})`);
      if(!resolved)break;}
    while(state(context).ops>0){
      const s=state(context);
      if(s.contingency<2){vm.runInContext('NightmareEngine.globalAction("contingency")',context);continue;}
      if(s.auditQuality<.72){vm.runInContext('NightmareEngine.globalAction("audit")',context);continue;}
      const weak=Array.from(s.pixels).sort((a,b)=>a.purity-b.purity)[0];
      if(weak&&weak.purity<.72){vm.runInContext('NightmareEngine.globalAction("clean")',context);continue;}
      const tired=Array.from(s.accounts).filter(a=>!a.paused&&
        value(context,`NightmareEngine.lanes[${JSON.stringify(a.platform)}].kind`)!=="search").sort((a,b)=>b.fatigue-a.fatigue)[0];
      if(tired&&tired.fatigue>50){vm.runInContext(`NightmareEngine.handleAction({dataset:{night:"refresh",id:${JSON.stringify(tired.id)}}})`,context);continue;}
      const search=Array.from(s.accounts).filter(a=>
        value(context,`NightmareEngine.lanes[${JSON.stringify(a.platform)}].kind`)==="search").sort((a,b)=>a.qualityScore-b.qualityScore)[0];
      if(search&&search.negatives<4){vm.runInContext(`NightmareEngine.handleAction({dataset:{night:"search-negatives",id:${JSON.stringify(search.id)}}})`,context);continue;}
      if(search&&search.qualityScore<8.5){vm.runInContext(`NightmareEngine.handleAction({dataset:{night:"search-relevance",id:${JSON.stringify(search.id)}}})`,context);continue;}
      break;
    }
    const s=state(context);
    if(s.day>7&&s.day%4===0){
      const ranked=Array.from(s.accounts).filter(a=>!a.paused&&a.totals.spend>0)
        .sort((a,b)=>(b.totals.modeled/b.totals.spend)-(a.totals.modeled/a.totals.spend));
      const best=ranked[0],worst=ranked[ranked.length-1];
      if(best&&worst&&best!==worst&&worst.budget>=value(context,"BUDGET_STEP")){
        worst.budget-=value(context,"BUDGET_STEP");best.budget+=value(context,"BUDGET_STEP");
      }
    }
    if(s.finance.cash>value(context,"DAILY*2")&&s.finance.creditUsed>value(context,"DAILY*4"))
      vm.runInContext('NightmareEngine.globalAction("paydown")',context);
    vm.runInContext("runDay()",context);
  }
  return state(context);
}

function makeGateFixture(sessionStore=new Map(),digestHex=null){
  const {document,registry}=fakeDom(),unlocks=[];
  const digestCrypto=digestHex?{subtle:{async digest(){return Uint8Array.from(digestHex.match(/../g),byte=>parseInt(byte,16)).buffer;}}}:(globalThis.crypto||webcrypto);
  const context=vm.createContext({document,window:null,TextEncoder,Uint8Array,crypto:digestCrypto,
    sessionStorage:{getItem:key=>sessionStore.get(key)??null,setItem:(key,value)=>sessionStore.set(key,String(value))}});
  context.window=context;context.__unlocked=profile=>unlocks.push(profile);
  vm.runInContext(gateScript,context,{filename:"js/access.js"});
  return {context,registry,sessionStore,unlocks};
}

const smokeShard=process.env.TTM_SMOKE_SHARD||"";
if(!smokeShard){
  let shardFailure=false;
  for(const shard of ["a","b1","b2a1","b2a2","b2a3","b2b","c","d1a","d1r1","d1r2","d1t","d1b","d2"]){
    const result=spawnSync(process.execPath,[fileURLToPath(import.meta.url),...process.argv.slice(2)],{
      env:{...process.env,TTM_SMOKE_SHARD:shard},stdio:"inherit"
    });
    if(result.error)throw result.error;
    if(result.status!==0){process.exitCode=result.status??1;shardFailure=true;break;}
  }
  if(!shardFailure)console.log("media-buying-trainer smoke tests: ok");
}else{
assert(["a","b1","b2a1","b2a2","b2a3","b2b","c","d1a","d1r1","d1r2","d1t","d1b","d2"].includes(smokeShard),`unknown smoke-test shard: ${smokeShard}`);

if(smokeShard==="a"){
// Both precomputed access hashes select a profile, while v2 and legacy sessions survive reloads.
for(const [digest,profile] of [
  ["bb4db630004e61a51492115b876f93e9716710f4e3bbe39625088c334970302e","general"],
  ["5a3b1ef9f7594ecbe03bff6d08366a452e210c3a6964f6a204fe620e1e3265f6","specialist"]
]){
  const fixture=makeGateFixture(new Map(),digest);fixture.registry.pw.value="synthetic-access-fixture";await fixture.registry.go.onclick();
  assert.equal(fixture.context.__trainerAccessGranted,true);assert.equal(fixture.context.__trainerProfile,profile);
  assert.deepEqual(fixture.unlocks,[profile]);assert.equal(fixture.registry.gate.removed,true);
  assert.deepEqual(JSON.parse(fixture.sessionStore.get("media-buying-trainer-access-v2")),{profile});
  assert(!fixture.sessionStore.get("media-buying-trainer-access-v2").includes("synthetic-access-fixture"),"raw gate input was persisted");
}
{
  const fixture=makeGateFixture(new Map([["media-buying-trainer-access-v2",JSON.stringify({profile:"general"})]]));
  assert.equal(fixture.context.__trainerAccessGranted,true);assert.equal(fixture.context.__trainerProfile,"general");
  assert.deepEqual(fixture.unlocks,["general"]);assert.equal(fixture.registry.gate.removed,true);
}
{
  const legacyHash="5a3b1ef9f7594ecbe03bff6d08366a452e210c3a6964f6a204fe620e1e3265f6";
  const fixture=makeGateFixture(new Map([["media-buying-trainer-access-v1",legacyHash]]));
  assert.equal(fixture.context.__trainerProfile,"specialist");assert.deepEqual(fixture.unlocks,["specialist"]);
  assert.deepEqual(JSON.parse(fixture.sessionStore.get("media-buying-trainer-access-v2")),{profile:"specialist"});
}

// Loading all modules before access is granted must not create a run or lock in the wrong profile.
{
  const fixture=makeContext("?mode=1&seed=12",{accessGranted:false});
  assert.equal(value(fixture.context,"profileBooted"),false);assert.equal(value(fixture.context,"S"),undefined);
  assert.equal(value(fixture.context,'window.__unlocked("specialist")'),true);
  assert.equal(value(fixture.context,"profileBooted"),true);assert.equal(value(fixture.context,"ACTIVE_PROFILE"),"specialist");
  assert.equal(value(fixture.context,"document.body.dataset.profile"),"specialist");
  const first=value(fixture.context,"JSON.stringify(S)");
  assert.equal(value(fixture.context,'window.__unlocked("general")'),false);
  assert.equal(value(fixture.context,"ACTIVE_PROFILE"),"specialist");assert.equal(value(fixture.context,"JSON.stringify(S)"),first);
}

// The post-access title screen presents one identity, one primary action and one optional teaching choice.
{
  const opening=makeContext("?mode=1&seed=12");
  const firstMarkup=opening.registry.overlay.innerHTML;
  assert.match(firstMarkup,/class="title-screen"/);assert.match(firstMarkup,/Main menu/);
  assert.equal((firstMarkup.match(/<h2>To The Moon<\/h2>/g)||[]).length,1,"the title screen repeated its title");
  assert.doesNotMatch(firstMarkup,/title-hub-logo|<span>TO<\/span><i>THE<\/i><b>MOON<\/b>/,
    "a second decorative wordmark repeated the game title");
  assert.match(firstMarkup,/Interactive Media Buying Simulator/);
  assert.match(firstMarkup,/Practice media buying by setting budgets, changing ads and seeing what happens next/i);
  assert.equal((firstMarkup.match(/class="menu-hero-action"/g)||[]).length,1,"the title screen exposed more than one dominant action");
  assert.match(firstMarkup,/<span>Begin<\/span>/);
  assert.match(firstMarkup,/Guided start/);assert.equal(opening.registry.tutorialToggle.getAttribute("role"),"switch");
  assert.equal(opening.registry.tutorialToggle.getAttribute("aria-checked"),"true");
  assert.match(firstMarkup,/New run, Field Guide and settings/);assert.doesNotMatch(firstMarkup,/title-hub-explainer|What you do|Read the goal/);
  assert.doesNotMatch(opening.registry.overlay.innerHTML,/flavor-grid|wizard-mode-list|wizard-lens-carousel|daysCfg|budgetCfg|Operating notes|Quality Score|Modeled MER/);
  assert.equal(opening.registry.overlay.querySelectorAll("button[data-mode]").length,0);
  assert.equal(opening.registry.wrap.inert,true);assert(value(opening.context,'document.body.classList.contains("menu-overlay-open")'));
  const stateBefore=value(opening.context,"JSON.stringify(S)"),searchBefore=value(opening.context,"location.search");
  opening.registry.tutorialToggle.onclick();
  assert.equal(opening.registry.tutorialToggle.getAttribute("aria-checked"),"false");
  assert.equal(JSON.parse(opening.localStore.get("ttm.onboarding.general.v2")).tutorial,false);
  assert.equal(value(opening.context,"JSON.stringify(S)"),stateBefore,"tutorial preference changed the active simulation");
  assert.equal(value(opening.context,"location.search"),searchBefore,"tutorial preference rewrote the active run URL");
  const titleMarkup=opening.registry.overlay.innerHTML;
  const escape=()=>{const event={key:"Escape",defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    for(const item of opening.documentListeners.keydown||[])item.handler(event);return event;};
  escape();assert.equal(opening.registry.overlay.innerHTML,titleMarkup,"Escape launched a fresh run from the title hub");
  opening.registry.continueRun.onclick();assert.match(opening.registry.overlay.innerHTML,/What do you want to practice/);
  assert.doesNotMatch(opening.registry.overlay.innerHTML,/Choose an analogy|How much help should appear on screen/);
  const backEvent=escape();assert.equal(backEvent.defaultPrevented,true);assert.match(opening.registry.overlay.innerHTML,/Main menu/);
}

// A first guided start asks only for analogy and guidance, then assigns deterministic Fundamentals.
{
  const first=makeContext("?mode=4&days=44&budget=73000&seed=121&flavor=jrpg",{localStore:new Map(),tutorialComplete:false});
  first.registry.continueRun.onclick();assert.match(first.registry.overlay.innerHTML,/Help 1 of 2 · analogy/);
  assert.match(first.registry.overlay.innerHTML,/wizard-lens-carousel/);assert.doesNotMatch(first.registry.overlay.innerHTML,/data-intent|data-mode|daysCfg|budgetCfg/);
  first.registry.keepLens.onclick();assert.match(first.registry.overlay.innerHTML,/Help 2 of 2 · guidance/);
  const detailed=first.registry.overlay.querySelectorAll("button[data-guidance]").find(button=>button.dataset.guidance==="guided");
  assert(detailed);detailed.onclick();
  assert.match(first.registry.overlay.innerHTML,/Help 2 of 2 · guidance/,
    "choosing a guidance level advanced before explicit confirmation");
  assert.equal(detailed.getAttribute("aria-pressed"),"true");
  assert.equal(typeof first.registry.keepGuidance.onclick,"function");first.registry.keepGuidance.onclick();
  assert.match(first.registry.overlay.innerHTML,/data-wizard-step="starter"/);assert.match(first.registry.overlay.innerHTML,/Your first account/);
  assert.match(first.registry.overlay.innerHTML,/first three days/i);assert.match(first.registry.overlay.innerHTML,/12-day run/);
  assert.doesNotMatch(first.registry.overlay.innerHTML,/data-intent|data-mode|daysCfg|budgetCfg|How long should|How much can/,
    "the first guided start inserted a custom setup wall before Fundamentals");
  assert.equal(typeof first.registry.launchStarter.onclick,"function");first.registry.launchStarter.onclick();
  const params=new URLSearchParams(value(first.context,"location.search"));
  assert.deepEqual(Object.fromEntries(["mode","days","budget","seed","tutorial","guided","autostart","brief"].map(key=>[key,params.get(key)])),{
    mode:"1",days:"12",budget:"20000",seed:"2601",tutorial:"1",guided:"1",autostart:"1",brief:"1"
  });
}

// Product naming, neutral copy, and the reconstructed learning corpus have no stale private/workbook labels.
{
  const readme=fs.readFileSync(new URL("../README.md",import.meta.url),"utf8");
  assert.match(html,/<title>To The Moon — the Interactive Media Buying Simulator<\/title>/);
  /* No agency badge in the shell: To The Moon stands on its own name (2026-08-09). */
  assert.doesNotMatch(html,/brand-mark/,"a company badge returned to the masthead");
  assert.doesNotMatch(html,/>PFM</,"PFM branding returned to the shell");
  assert.match(html,/<h1>TO THE <span>MOON<\/span><\/h1>/);
  assert.doesNotMatch(`${sourceCorpus}\n${readme}`,/\bAccount Sim\b/i);
  assert.doesNotMatch(sourceCorpus,/\bunverified\b|verified\s*:/i);
  assert.doesNotMatch(sourceCorpus,/START HERE|\btab\s*0?\d+\b|tab to go read|\bhis account\b|your actual job|your lead|real account 79 campaigns|his live top-20|his row 18|Your doc:/i);
  assert.doesNotMatch(`${sourceCorpus}\n${readme}`,/\b(?:Gabe|Gabriel)\b/i);
  assert.doesNotMatch(sourceCorpus,/docs\.google\.com\/spreadsheets|(?:private-sheet-id|internal-person-name|live-account-url|source-workbook-url)/i);
  assert.doesNotMatch(sourceCorpus,/\b(?=[A-Za-z0-9_-]{40,}\b)(?=[A-Za-z0-9_-]*[A-Z])[0-9][A-Za-z0-9_-]+\b/,
    "a bare mixed-case private-sheet-style identifier was bundled");

  const {context,registry}=makeContext("?mode=1&seed=20");
  assert.deepEqual(Array.from(value(context,"Object.keys(PROFILE_DB).sort()")),["general","specialist"]);
  assert.deepEqual(Array.from(value(context,"GUIDED_PLAYBOOK"),lesson=>lesson.id),
    ["00","01","02","03","04","05","06","07","08","09","10","11","12"]);
  for(const lesson of Array.from(value(context,"GUIDED_PLAYBOOK"))){
    assert(typeof lesson.title==="string"&&lesson.title.length>5,`specialist playbook ${lesson.id}.title is incomplete`);
    for(const field of ["summary","core","operator","advanced"])
      assert(typeof lesson[field]==="string"&&lesson[field].length>20,`specialist playbook ${lesson.id}.${field} is incomplete`);
    assert(lesson.checklist.length>=4);assert(lesson.terms.length>=4);
  }
  const guided=makeContext("?mode=1&seed=20",{profile:"specialist"});
  assert.equal(value(guided.context,"ACTIVE_PROFILE"),"specialist");
  assert.equal(guided.registry.loreBtn.textContent,"Account Playbook");
  vm.runInContext('specialistGuide("04")',guided.context);
  assert.match(guided.registry.guideOverlay.innerHTML,/Account Playbook/);
  assert.match(guided.registry.guideOverlay.innerHTML,/Winner and anomaly lab/);
  assert.match(guided.registry.guideOverlay.innerHTML,/Step 1 of 6 · Briefing/);
  assert.match(guided.registry.guideOverlay.innerHTML,/By the end, you can<\/span><strong>Investigate a winner or anomaly/i);
  assert.doesNotMatch(guided.registry.guideOverlay.innerHTML,/By the end, you can<\/span><strong>The most instructive rows/i,
    "the specialist shell used a chapter summary as a broken learning outcome");
  assert.equal(guided.registry.guideOverlay.querySelectorAll(".lesson-stage").length,1,
    "the specialist playbook rendered more than one teaching stage");
  assert.doesNotMatch(guided.registry.guideOverlay.innerHTML,/What To The Moon leaves out|Foundation · new to media buying|Working practice · active operators/,
    "the specialist playbook fell back to its former reference dump");
  assert.deepEqual(Array.from(value(context,"Object.keys(KNOWLEDGE_BY_ID).sort()")),
    ["01","02","03","04","05","06","07","08","09","10","11"]);
  for(const id of ["01","02","03","04","05","06","07","08","09","10","11"]){
    const lesson=value(context,`KNOWLEDGE_BY_ID[${JSON.stringify(id)}]`);
    assert(typeof lesson.title==="string"&&lesson.title.length>5,`${id}.title is incomplete`);
    for(const field of ["summary","foundation","working","expert"])
      assert(typeof lesson[field]==="string"&&lesson[field].length>30,`${id}.${field} is incomplete`);
    assert(Array.from(lesson.checklist).length>=4);assert(Array.from(lesson.terms).length>=4);
  }
  for(const term of ["account","ad","ad set","platform","paid search","ppc","paid social","budget","allocation",
    "media spend","operations cost","lead","conversion","click","cpc","settlement","unsettled","reported lead",
    "attribution gap","learning phase","creative pipeline","approval","compliance hold","scaling","restate","recast",
    "slot","offer timing","campaign budget"])
    assert(value(context,`typeof LORE[${JSON.stringify(term)}]==="string"`),`starter glossary omitted ${term}`);
  for(const term of ["account health","outcome index","affiliate signal","compliance heat","validation","clawback",
    "agency headquarters","client headquarters","service area","target state","state targeting","account time zone","media market",
    "traditional media","outdoor advertising","radio advertising","local cable television","offer","ad concept","customer value"])
    assert(value(context,`typeof LORE[${JSON.stringify(term)}]==="string"`),`Agency Career glossary omitted ${term}`);
  const guidanceTerms=Array.from(value(context,"Object.keys(PLAYER_GUIDANCE)"));
  assert(guidanceTerms.length>=20,"guided mode does not explain enough decision-critical mechanics");
  for(const term of guidanceTerms){
    assert(value(context,`typeof LORE[${JSON.stringify(term)}]==="string"`),`${term} guidance has no glossary definition`);
    for(const field of ["why","changes","move","check"])
      assert(value(context,`PLAYER_GUIDANCE[${JSON.stringify(term)}][${JSON.stringify(field)}].length>20`),`${term}.${field} is incomplete`);
  }
  const modeledMerGuidance=value(context,'detailedLoreGuidanceMarkup("modeled mer")');
  for(const label of ["Why it matters","What changes it","Your move","Where to check"])
    assert(modeledMerGuidance.includes(label),`guided glossary omitted ${label}`);
  assert.match(value(context,"LORE_SEL"),/reality-copy/);assert.match(value(context,"LORE_SEL"),/config \.hint/);
  assert.deepEqual(Array.from(value(context,"Object.keys(LESSON_MODULES).sort()")),
    ["01","02","03","04","05","06","07","08","09","10","11"],
    "the staged Field Guide must have one complete module for every general lesson");
  for(const id of Array.from(value(context,"Object.keys(LESSON_MODULES)"))){
    const module=value(context,`LESSON_MODULES[${JSON.stringify(id)}]`);
    assert.equal(module.id,id);assert(module.outcome.length>30,`${id} has no concrete learning outcome`);
    for(const part of ["situation","concept","example","check","application"])
      assert(module[part]&&typeof module[part]==="object",`${id} is missing its ${part} stage data`);
    assert(module.situation.title.length>10&&module.situation.body.length>40&&Array.from(module.situation.facts).length>=3,
      `${id} has an incomplete account situation`);
    assert(module.concept.title.length>10&&module.concept.body.length>40&&Array.from(module.concept.contrasts).length>=2,
      `${id} has an incomplete core idea`);
    assert(module.example.title.length>10&&module.example.setup.length>30&&module.example.outcome.length>30&&Array.from(module.example.steps).length>=3,
      `${id} has an incomplete worked example`);
    assert(module.check.prompt.length>20&&module.check.why.length>30&&Array.from(module.check.choices).length===4,
      `${id} has an incomplete commit-before-reveal check`);
    assert(Number.isInteger(module.check.answer)&&module.check.answer>=0&&module.check.answer<module.check.choices.length,
      `${id} has an invalid strongest answer`);
    assert(module.application.title.length>10&&module.application.body.length>30&&Array.from(module.application.steps).length>=3,
      `${id} has no useful take-it-to-the-board step`);
  }
  assert.deepEqual(Array.from(value(context,"LESSON_PATHS.map(path=>path.id)")),["fundamentals","buying","operations"]);
  assert.equal(value(context,"new Set(LESSON_PATHS.flatMap(path=>path.lessons)).size"),11,
    "the lesson paths omit or duplicate a general lesson");
  vm.runInContext("loreLibrary()",context);
  assert.match(registry.guideOverlay.innerHTML,/Choose one thing to learn/);
  for(const heading of ["Start with the account","Build and buy media","Manage the work"])
    assert(registry.guideOverlay.innerHTML.includes(heading),`the Field Guide library omitted ${heading}`);
  const lessonButtons=registry.guideOverlay.querySelectorAll("button[data-lesson-select]");
  assert.equal(lessonButtons.length,11,"the Field Guide library does not expose exactly 11 modules");
  assert.equal(new Set(lessonButtons.map(button=>button.dataset.lessonSelect)).size,11,"the Field Guide library repeats a lesson");
  assert.equal(registry.guideOverlay.querySelectorAll(".lesson-path-heading").length,3,"the Field Guide library lost its three learning paths");
  assert.doesNotMatch(registry.guideOverlay.innerHTML,/loregrid|Foundation · new to media buying|Working practice · active operators|Expert notes · scope and caveats/,
    "the Field Guide library embedded the former glossary or three-depth text dump");
  lessonButtons.find(button=>button.dataset.lessonSelect==="07").onclick();
  assert.match(registry.guideOverlay.innerHTML,/Lesson 07 · Step 1 of 6 · Briefing/);
  assert.match(registry.guideOverlay.innerHTML,/Measurement and attribution/);
  assert.equal(registry.guideOverlay.querySelectorAll(".lesson-stage").length,1,
    "a lesson rendered more than one stage at once");
  assert.doesNotMatch(registry.guideOverlay.innerHTML,/loregrid|Foundation · new to media buying|Working practice · active operators|Expert notes · scope and caveats/,
    "a lesson embedded the former reference dump");

  // Every surfaced glossary term has both a real lesson destination and a deliberate analogy in every flavor.
  const loreTerms=Array.from(value(context,"Object.keys(LORE)"));
  assert.equal(loreTerms.length,303,"canonical glossary count drifted");
  const specialistTerms=Array.from(value(context,"Object.keys(SPECIALIST_PLAYBOOK_BY_TERM)"));
  assert.deepEqual(specialistTerms.slice().sort(),loreTerms.slice().sort(),
    "Specialist Playbook routing must cover every canonical glossary term exactly once");
  const specialistIds=new Set(Array.from(value(context,"GUIDED_PLAYBOOK"),lesson=>lesson.id));
  for(const [term,id] of Array.from(value(context,"Object.entries(SPECIALIST_PLAYBOOK_BY_TERM)"))){
    assert(specialistIds.has(id),`${term} routes to missing Specialist Playbook ${id}`);
  }
  for(const [term,id] of [["objective","00"],["account","05"],["platform","05"],["pixel","05"],
    ["modeled mer","03"],["outcome index","03"],["affiliate signal","03"],["validation","03"],["clawback","03"],
    ["account health","08"],["compliance","11"],["compliance heat","11"],["seed","12"]]){
    assert.equal(value(context,`SPECIALIST_PLAYBOOK_BY_TERM[${JSON.stringify(term)}]`),id,
      `${term} routes to the wrong Specialist Playbook family`);
  }
  const agencyOriginTerms=[
    ["agency headquarters","09","05"],["client headquarters","09","05"],["service area","09","05"],
    ["target state","09","05"],["state targeting","09","05"],["account time zone","09","05"],["media market","09","05"],
    ["traditional media","09","05"],["outdoor advertising","09","05"],["radio advertising","09","05"],
    ["local cable television","09","05"],["offer","01","01"],["ad concept","01","01"],["customer value","06","03"]
  ];
  for(const [term,lessonId,playbookId] of agencyOriginTerms){
    assert(value(context,`LORE[${JSON.stringify(term)}].length>120`),`${term} definition is too thin`);
    assert.equal(value(context,`lessonForTerm(${JSON.stringify(term)}).id`),lessonId,`${term} routes to the wrong Field Guide lesson`);
    assert.equal(value(context,`SPECIALIST_PLAYBOOK_BY_TERM[${JSON.stringify(term)}]`),playbookId,`${term} routes to the wrong Specialist Playbook lesson`);
  }
  for(const [alias,canonical] of [["agency hq","agency headquarters"],["client hq","client headquarters"],["service territory","service area"],
    ["target states","target state"],["geographic targeting","state targeting"],["account timezone","account time zone"],
    ["local media market","media market"],["traditional channels","traditional media"],["ooh","outdoor advertising"],
    ["terrestrial radio","radio advertising"],["cable tv","local cable television"],["offers","offer"],
    ["advertising concept","ad concept"],["modeled customer value","customer value"]])
    assert.equal(value(context,`LORE_ALIAS_TO_KEY[${JSON.stringify(alias)}]`),canonical,`${alias} did not route to ${canonical}`);
  const platformTerms=[
    ["google ads search",["google ads — search","google search"]],
    ["google ads demand gen",["google ads — demand gen","google demand gen"]],
    ["google display / demand gen",["google display/demand gen","google display and demand gen"]],
    ["microsoft advertising search",["microsoft advertising — search","microsoft ads","bing ads"]],
    ["meta ads",["meta","facebook ads"]],
    ["tiktok ads",["tiktok"]],
    ["snapchat ads",["snapchat","snap ads"]],
    ["linkedin campaign manager",["linkedin ads"]]
  ];
  for(const [term,aliases] of platformTerms){
    assert.equal(value(context,`lessonForTerm(${JSON.stringify(term)}).id`),"09",`${term} did not route to the platform lesson`);
    assert.equal(value(context,`SPECIALIST_PLAYBOOK_BY_TERM[${JSON.stringify(term)}]`),"05",`${term} did not route to the platform playbook`);
    assert(value(context,`LORE[${JSON.stringify(term)}].length>180`),`${term} definition is too thin`);
    for(const field of ["why","changes","move","check"])
      assert(value(context,`PLAYER_GUIDANCE[${JSON.stringify(term)}][${JSON.stringify(field)}].length>35`),`${term}.${field} is incomplete`);
    for(const alias of aliases)
      assert.equal(value(context,`LORE_ALIAS_TO_KEY[${JSON.stringify(alias)}]`),term,`${alias} did not route to ${term}`);
  }
  const strongAnalogyTerms=new Set(["buyer","media buyer","account","campaign","group","ad set","ad","creative","platform","algorithm","buying lane","platform initiative",
    "budget","audience","targeting","broad targeting","fatigue","pixel","attribution","test","creative test","client","impressions","click","lead","conversion","media spend","cash","revenue","profit",
    "cpm","ctr","cvr","cpl","cpa","roas","roi","modeled mer"]);
  for(const term of loreTerms){
    const lessonId=value(context,`lessonForTerm(${JSON.stringify(term)}).id`);
    assert(value(context,`!!KNOWLEDGE_BY_ID[${JSON.stringify(lessonId)}]`),`${term} has no Field Guide route`);
    for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id)){
      const mechanic=JSON.parse(value(context,
        `JSON.stringify(flavorMechanicModel(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}]))`));
      assert(["strong","partial","none"].includes(mechanic.strength),
        `${flavorId}/${term} has no declared analogy strength`);
      if(mechanic.strength!=="none"){
        assert(typeof mechanic.alias==="string"&&mechanic.alias.trim(),`${flavorId}/${term} omitted its analogy mapping`);
        assert([mechanic.source,mechanic.connection].some(copy=>typeof copy==="string"&&copy.trim()),
          `${flavorId}/${term} declared an analogy without explaining it`);
      }
      if(strongAnalogyTerms.has(term)){
        assert.equal(mechanic.strength,"strong",`${flavorId}/${term} is an anchor but is not a strong authored analogy`);
        for(const part of ["source","connection","boundary"])
          assert(typeof mechanic[part]==="string"&&mechanic[part].trim(),`${flavorId}/${term} omitted its strong analogy ${part}`);
        assert.notEqual(mechanic.boundary,value(context,`FLAVOR_REASONING[${JSON.stringify(flavorId)}].boundary`),
          `${flavorId}/${term} reused the flavor-wide caveat instead of a term-specific boundary`);
      }
      assert.doesNotMatch(String(mechanic.connection||""),/\bBoundary\s*:/i,
        `${flavorId}/${term} buried its boundary inside the connection`);
      assert.doesNotMatch(String(mechanic.source||""),/\bBoundary\s*:/i,
        `${flavorId}/${term} buried its boundary inside the real-world definition`);
    }
  }
  for(const term of [...strongAnalogyTerms].filter(term=>!loreTerms.includes(term)))for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id)){
    const mechanic=JSON.parse(value(context,
      `JSON.stringify(flavorMechanicModel(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}]))`));
    assert.equal(mechanic.strength,"strong",`${flavorId}/${term} is an anchor but is not a strong authored analogy`);
    for(const part of ["source","connection","boundary"])
      assert(typeof mechanic[part]==="string"&&mechanic[part].trim(),`${flavorId}/${term} omitted its strong analogy ${part}`);
    assert.notEqual(mechanic.boundary,value(context,`FLAVOR_REASONING[${JSON.stringify(flavorId)}].boundary`),
      `${flavorId}/${term} reused the flavor-wide caveat instead of a term-specific boundary`);
  }
  const careerAnalogyTerms=["account health","outcome index","affiliate signal","compliance heat","validation","clawback"];
  const careerMeaningChecks={
    "account health":[/0.100/,/client account is being operated/i,/not client trust/i],
    "outcome index":[/100-centered/i,/against its baseline/i,/not revenue, ROI, MER, profit/i],
    "affiliate signal":[/0.100/,/optimization and measurement evidence/i,/not event-source signal integrity/i],
    "compliance heat":[/lower is safer/i,/increase clawback risk/i,/not compliance health/i],
    validation:[/network review/i,/collected cash/i,/apply a clawback/i],
    clawback:[/payout deduction/i,/original media cost remains/i,/does not guarantee a deduction/i]
  };
  for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id)){
    const aliases=careerAnalogyTerms.map(term=>value(context,`flavorAliasForTerm(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}])`));
    assert.equal(new Set(aliases).size,careerAnalogyTerms.length,`${flavorId} collapsed two Agency Career analogies together`);
    for(const [index,term] of careerAnalogyTerms.entries()){
      const explanation=JSON.parse(value(context,
        `JSON.stringify(flavorMechanicModel(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}]))`));
      assert(explanation.connection.toLowerCase().includes(aliases[index].toLowerCase()),`${flavorId}/${term} explanation omitted its analogy`);
      for(const pattern of careerMeaningChecks[term])assert.match(`${explanation.source} ${explanation.connection}`,pattern,`${flavorId}/${term} lost its real mechanic`);
      if(explanation.strength==="strong")assert(String(explanation.boundary||"").trim(),`${flavorId}/${term} omitted its strong analogy boundary`);
    }
  }
  assert.match(value(context,'LORE["modeled mer"]'),/modeled outcome value divided by media spend/i);
  assert.match(value(context,'LORE["modeled mer"]'),/does not subtract.*cost/i);
  assert.match(value(context,'LORE["modeled mer"]'),/not.*platform.*cash/i);
  assert.match(value(context,'(()=>{ACTIVE_FLAVOR="dnd";const x=flavorMechanicModel("modeled mer");return `${x.source} ${x.connection}`})()'),/efficiency multiple.*not profit, cash/i);
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return flavorMechanicModel("modeled mer").strength})()'),"strong");
  assert.match(value(context,'LORE["campaign"]'),/exact position vary by platform/i);
  assert.match(value(context,'LORE["campaign"]'),/ad-set.*ad-group.*ad-squad.*line-item/i);
  for(const [term,concept] of [["buying lane","lane"],["platform initiative","lane"],["targeting","targeting"],["broad targeting","targeting"],
    ["cpm","cost"],["cpc","cost"],["cpl","cost"],["cpa","cost"],["cash","liquidity"],["cash roas","efficiency"],["max cpc","bid"]])
    assert.equal(value(context,`flavorConceptForTerm(${JSON.stringify(term)})`),concept,`${term} received the wrong analogy concept`);
  assert.equal(value(context,'flavorMechanicModel("campaign source of truth",FLAVOR_BY_ID.dnd).strength'),"none");
  assert.equal(value(context,'flavorGlossMarkup("campaign source of truth",FLAVOR_BY_ID.dnd)'),"",
    "a weak generic analogy still rendered as an explicit mapping");
  assert.equal(value(context,'flavorMechanicModel("account health",FLAVOR_BY_ID.dnd).strength'),"partial",
    "an authored partial analogy was suppressed with the generic fallbacks");
  for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id))
    assert.notEqual(value(context,`flavorAliasForTerm("broad targeting",FLAVOR_BY_ID[${JSON.stringify(flavorId)}])`),
      value(context,`FLAVOR_BY_ID[${JSON.stringify(flavorId)}].terms.audience`),`${flavorId} collapsed broad targeting into the audience pool`);

  // Neighboring measurement objects remain separate canonical glossary destinations.
  for(const [left,right] of [["event source","event source cluster"],["attributed value","attributed report"]]){
    const leftKey=value(context,`LORE_ALIAS_TO_KEY[${JSON.stringify(left)}]`);
    const rightKey=value(context,`LORE_ALIAS_TO_KEY[${JSON.stringify(right)}]`);
    assert.notEqual(leftKey,rightKey,`${left} collapsed into ${right}`);
    assert.notEqual(value(context,`LORE[${JSON.stringify(leftKey)}]`),value(context,`LORE[${JSON.stringify(rightKey)}]`),
      `${left} and ${right} share one definition`);
  }
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["event sources"]'),"event source");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["attributed values"]'),"attributed value");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["modeled revenue"]'),"modeled outcome value");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["cross-tag contamination"]'),"event-source contamination");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["funnel signal"]'),"affiliate signal");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["validated payouts"]'),"validation");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["payout adjustment"]'),"clawback");
  assert.equal(value(context,'LORE_ALIAS_TO_KEY["signal"]'),undefined,"generic signal copy was collapsed into affiliate signal");

  // Common plural copy on the starter surface resolves to the same canonical glossary records.
  const plurals={accounts:"account",ads:"ad","ad sets":"ad set",platforms:"platform",campaigns:"campaign",
    budgets:"budget",allocations:"allocation",keywords:"keyword",bids:"bid","match types":"match type",
    creatives:"creative",assets:"asset",concepts:"concept",audiences:"audience",pixels:"pixel",clicks:"click",
    leads:"lead",conversions:"conversion","advertiser workstreams":"advertiser workstream",
    "platform initiatives":"platform initiative","business containers":"business container",
    "holding companies":"holding company","operating companies":"operating company",
    "landing-page optimizations":"landing-page optimization","event source clusters":"event-source cluster",
    "campaign budgets":"campaign budget","event sources":"event source","attributed values":"attributed value"};
  for(const [alias,key] of Object.entries(plurals)){
    assert.equal(value(context,`LORE_ALIAS_TO_KEY[${JSON.stringify(alias)}]`),key,`${alias} did not route to ${key}`);
    assert(value(context,`(()=>{LORE_RX.lastIndex=0;return LORE_RX.test(${JSON.stringify(` ${alias} `)})})()`),`${alias} is not linkable copy`);
  }
}

// Analogy bridges preserve key real-world distinctions in every flavor.
{
  const {context}=makeContext("?mode=5&seed=191");
  const pairs=[["ad","creative"],["account","advertiser workstream"],["advertiser workstream","platform initiative"],
    ["pixel","event-source cluster"],["event-source cluster","attribution"],["budget","allocation"],["allocation","media spend"],
    ["media spend","cash"],["cash","available credit"],["fatigue","saturation"],["keyword","match type"],
    ["negative keyword","search terms report"],["modeled mer","claimed roas"],["claimed roas","profit"]];
  for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id))for(const [left,right] of pairs){
    const aliases=Array.from(value(context,`[flavorAliasForTerm(${JSON.stringify(left)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}]),flavorAliasForTerm(${JSON.stringify(right)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}])]`));
    assert.notEqual(aliases[0],aliases[1],`${flavorId} collapsed ${left} into ${right}`);
  }
}

// A glossary popup's Lesson reference is an operable control, not decorative text.
{
  const fixture=makeContext("?mode=1&seed=201&flavor=dnd");
  const trigger=new FakeElement("tipTrigger",fixture.registry);trigger.tagName="span";trigger.classList.add("lore");trigger.dataset.t="cpm";
  fixture.registry.tipTrigger=trigger;fixture.context.document.body.appendChild(trigger);
  vm.runInContext('showPop(document.getElementById("tipTrigger"),true)',fixture.context);
  const pop=fixture.registry.loreTooltip;assert(pop,"glossary popup was not mounted");
  const sourceStart=pop.innerHTML.indexOf('class="analogy-source"'),connectionStart=pop.innerHTML.indexOf('class="analogy-connection"'),
    boundaryStart=pop.innerHTML.indexOf('class="analogy-boundary"');
  assert(sourceStart>=0&&sourceStart<connectionStart&&connectionStart<boundaryStart,
    "glossary analogy did not render definition, connection and Boundary as ordered blocks");
  const connectionMarkup=pop.innerHTML.slice(connectionStart,boundaryStart);
  assert.match(connectionMarkup,/<\/(?:div|span|section|p)>\s*<(?:aside|div|section|span)\s*$/,
    "glossary Boundary is nested inside the connection instead of rendered as its sibling");
  assert.doesNotMatch(connectionMarkup,/\bBoundary\s*:/i,"glossary analogy buried its Boundary inside the connection block");
  assert(pop.innerHTML.toLowerCase().includes(value(fixture.context,'flavorAliasForTerm("cpm",currentFlavor())').toLowerCase()),
    "glossary analogy omitted the explicit source-to-analogy mapping");
  const reference=pop._descendants.find(el=>el.classList.contains("lesson-link"));
  assert(reference&&reference.dataset.lesson,"glossary popup omitted its linked Field Guide lesson");
  assert.equal(reference.dataset.lessonTerm,"cpm","the glossary-to-lesson route lost its source term");
  const event={target:reference,relatedTarget:null,key:"",preventDefault(){}};
  for(const {handler} of fixture.documentListeners.click)handler(event);
  assert.match(fixture.registry.guideOverlay.innerHTML,new RegExp(`Lesson ${reference.dataset.lesson} · Step 1 of 6 · Briefing`));
  assert.match(fixture.registry.guideOverlay.innerHTML,/You opened this lesson from <b>Cost per thousand impressions \(CPM\)<\/b>/);
  assert.equal(fixture.registry.guideOverlay.querySelectorAll(".lesson-stage").length,1);
}

// Specialist glossary links use the authored Specialist map rather than matching general-lesson numbers.
{
  const fixture=makeContext("?mode=1&seed=202&flavor=dnd",{profile:"specialist"});
  for(const [term,id] of [["objective","00"],["account","05"],["platform","05"],["pixel","05"],
    ["modeled mer","03"],["compliance","11"],["seed","12"]]){
    const html=value(fixture.context,`lessonLink(lessonForTerm(${JSON.stringify(term)}).id,"",${JSON.stringify(term)})`);
    assert.match(html,new RegExp(`data-playbook="${id}"`),`${term} rendered the wrong Specialist Playbook link`);
  }
  const trigger=new FakeElement("specialistTip",fixture.registry);trigger.tagName="span";trigger.classList.add("lore");trigger.dataset.t="objective";
  fixture.registry.specialistTip=trigger;fixture.context.document.body.appendChild(trigger);
  vm.runInContext('showPop(document.getElementById("specialistTip"),true)',fixture.context);
  const reference=fixture.registry.loreTooltip._descendants.find(el=>el.classList.contains("lesson-link"));
  assert.equal(reference.dataset.playbook,"00");reference.onclick?.();
  const event={target:reference,relatedTarget:null,key:"",preventDefault(){}};
  for(const {handler} of fixture.documentListeners.click)handler(event);
  assert.match(fixture.registry.guideOverlay.innerHTML,/Account mission, intent, and boundaries/);
}

// Field Guide modules teach one stage at a time, with commit-before-reveal feedback that cannot change the run.
{
  const localStore=new Map(),fixture=makeContext("?mode=1&seed=203",{localStore});
  const simulationBefore=value(fixture.context,"JSON.stringify(S)"),xpBefore=value(fixture.context,"TrainingProgress.summary().totalXp");
  vm.runInContext('loreBook("06")',fixture.context);
  assert.match(fixture.registry.guideOverlay.innerHTML,/Lesson 06 · Step 1 of 6 · Briefing/);
  assert.equal(fixture.registry.guideOverlay.querySelectorAll(".lesson-stage").length,1);
  for(const expected of [
    /Step 2 of 6 · Core idea/,
    /Step 3 of 6 · Worked example/,
    /Step 4 of 6 · Make the call/
  ]){
    assert.equal(typeof fixture.registry.lessonNext.onclick,"function","a teaching stage has no continuation");
    fixture.registry.lessonNext.onclick();assert.match(fixture.registry.guideOverlay.innerHTML,expected);
    assert.equal(fixture.registry.guideOverlay.querySelectorAll(".lesson-stage").length,1,
      "continuing a lesson left a prior teaching stage on screen");
  }
  const checkWhy=value(fixture.context,'LESSON_MODULES["06"].check.why');
  assert.equal(fixture.registry.guideOverlay.querySelectorAll(".lesson-answer").length,0,
    "the strongest answer was visible before the player committed");
  assert(!fixture.registry.guideOverlay.innerHTML.includes(checkWhy),
    "the answer explanation gave away the lesson check before commitment");
  const answerIndex=value(fixture.context,'LESSON_MODULES["06"].check.answer'),choices=fixture.registry.guideOverlay.querySelectorAll("button[data-lesson-choice]");
  assert.equal(choices.length,4);const correctChoice=choices.find(button=>Number(button.dataset.lessonChoice)===answerIndex);
  assert(correctChoice&&typeof correctChoice.onclick==="function");correctChoice.onclick();
  assert.match(fixture.registry.guideOverlay.innerHTML,/Step 5 of 6 · Debrief/);
  assert.match(fixture.registry.guideOverlay.innerHTML,/Strongest answer/);
  assert(fixture.registry.guideOverlay.innerHTML.includes(checkWhy),"the answer explanation did not appear after commitment");
  assert.match(fixture.registry.guideOverlay.innerHTML,/\+500 Training XP/);
  assert.equal(value(fixture.context,"TrainingProgress.summary().totalXp"),xpBefore+500,
    "a first correct lesson check did not award the documented Training XP");
  assert.equal(value(fixture.context,"JSON.stringify(S)"),simulationBefore,
    "opening and answering a lesson changed simulation state");
  assert.equal(typeof fixture.registry.lessonNext.onclick,"function");fixture.registry.lessonNext.onclick();
  assert.match(fixture.registry.guideOverlay.innerHTML,/Step 6 of 6 · Apply it/);
  assert.equal(typeof fixture.registry.lessonComplete.onclick,"function");fixture.registry.lessonComplete.onclick();
  assert.match(fixture.registry.guideOverlay.innerHTML,/Lesson complete/);
  assert.equal(value(fixture.context,"TrainingProgress.summary().totalXp"),xpBefore+500,
    "marking a lesson complete awarded campaign-independent XP a second time");
  assert.equal(value(fixture.context,"JSON.stringify(S)"),simulationBefore,
    "marking a lesson complete changed simulation state");
  const pathNext=fixture.registry.guideOverlay.querySelectorAll("button[data-lesson-next]")[0];
  assert.equal(pathNext?.dataset.lessonNext,"05","the next-lesson action ignored the displayed Fundamentals path");
  const savedLessons=JSON.parse(localStore.get("ttm.lessons.general.v1"));
  assert.deepEqual(savedLessons.completed.field,["06"],"lesson completion was not saved by profile and course");
  assert.deepEqual(savedLessons.last,{course:"field",id:"05",step:0,answer:null},
    "the completed lesson screen overwrote the next unfinished lesson resume pointer");

  const reopened=makeContext("?mode=1&seed=203",{localStore});
  vm.runInContext("loreLibrary()",reopened.context);
  assert.match(reopened.registry.guideOverlay.innerHTML,/1 of 11 complete/);
  const savedCard=reopened.registry.guideOverlay.querySelectorAll("button[data-lesson-select]")
    .find(button=>button.dataset.lessonSelect==="06"&&button.classList.contains("lesson-library-card"));
  assert(savedCard?.classList.contains("is-complete"),"a saved lesson was not marked complete after reload");
  const persistedXp=value(reopened.context,"TrainingProgress.summary().totalXp");
  vm.runInContext('loreBook("06",{step:3})',reopened.context);
  const replayChoice=reopened.registry.guideOverlay.querySelectorAll("button[data-lesson-choice]")
    .find(button=>Number(button.dataset.lessonChoice)===answerIndex);
  replayChoice.onclick();
  assert.equal(value(reopened.context,"TrainingProgress.summary().totalXp"),persistedXp,
    "replaying the same mastery check minted duplicate Training XP");
  reopened.registry.lessonNext.onclick();
  assert.match(reopened.registry.guideOverlay.innerHTML,/Lesson complete/);
}

// Closing on a revealed answer resumes that exact debrief instead of making the learner answer again.
{
  const localStore=new Map(),fixture=makeContext("?mode=1&seed=205",{localStore});
  vm.runInContext('loreBook("04",{step:3})',fixture.context);
  const choice=fixture.registry.guideOverlay.querySelectorAll("button[data-lesson-choice]")
    .find(button=>button.dataset.lessonChoice==="0");
  choice.onclick();assert.match(fixture.registry.guideOverlay.innerHTML,/Step 5 of 6 · Debrief/);
  const beforeClose=JSON.parse(localStore.get("ttm.lessons.general.v1"));
  assert.equal(beforeClose.last.step,4);assert.equal(beforeClose.last.answer,0);
  vm.runInContext("loreLibrary()",fixture.context);
  const resume=fixture.registry.guideOverlay.querySelectorAll("button[data-lesson-select]")
    .find(button=>button.classList.contains("lesson-continue-card"));
  assert(resume&&typeof resume.onclick==="function");resume.onclick();
  assert.match(fixture.registry.guideOverlay.innerHTML,/Step 5 of 6 · Debrief/);
  assert.match(fixture.registry.guideOverlay.innerHTML,/Your choice: The ad's opening hook/);
  assert.equal(value(fixture.context,"guideLessonState.answer"),0);
}

// The 283-term glossary is a separate, lazy and searchable reference instead of an embedded lesson dump.
{
  const fixture=makeContext("?mode=1&seed=204");vm.runInContext("loreLibrary()",fixture.context);
  assert.equal(fixture.registry.guideOverlay.querySelectorAll(".lesson-glossary-results").length,0,
    "the full glossary was mounted inside the lesson library");
  assert.doesNotMatch(fixture.registry.guideOverlay.innerHTML,/<article>|loregrid/,
    "the lesson library eagerly rendered glossary entries");
  assert.equal(typeof fixture.registry.openGuideGlossary.onclick,"function");fixture.registry.openGuideGlossary.onclick();
  assert.match(fixture.registry.guideOverlay.innerHTML,/Search the media-buying glossary/);
  assert.match(fixture.registry.guideOverlay.innerHTML,/Search 303 terms/);
  assert.equal((fixture.registry.guideOverlay.innerHTML.match(/<article>/g)||[]).length,30,
    "the initial glossary view did not enforce its 30-row lazy limit");
  assert.doesNotMatch(fixture.registry.guideOverlay.innerHTML,/loregrid/,
    "the searchable glossary restored the former recursive lore grid");
  const search=fixture.registry.guideGlossarySearch;assert.equal(typeof search.oninput,"function");
  search.value="modeled mer";search.oninput();
  const narrowed=fixture.registry.guideGlossaryResults.innerHTML,narrowedCount=(narrowed.match(/<article>/g)||[]).length;
  assert(narrowedCount>0&&narrowedCount<30,"glossary search did not narrow the lazy result set");
  assert.match(narrowed,/Modeled marketing efficiency ratio \(MER\)/i);
  search.value="term-that-cannot-exist-9274";search.oninput();
  assert.match(fixture.registry.guideGlossaryResults.innerHTML,/No definitions match that search/);
}

// Mode routing is explicit: six focused slices keep their old IDs and Agency Career is a new decade-scale track.
{
  const {context}=makeContext("?mode=6&seed=16");
  assert.deepEqual(Array.from(value(context,"MODE_IDS")),[0,1,2,3,4,5,6]);
  assert.equal(value(context,"MODE_REGISTRY[6].engine"),"agency-career");
  assert.equal(value(context,"MODE_REGISTRY[6].capabilities.agencyGrowth"),true);
  assert.equal(value(context,"MODE_REGISTRY[6].capabilities.technologyTree"),true);
  assert.equal(value(context,"MODE_REGISTRY[6].capabilities.affiliatePivot"),true);
  assert.equal(value(context,"CONFIG_SPECS[6].periodUnit"),"months");
  assert.equal(value(context,"CONFIG_SPECS[6].fixedPeriod"),true);
  assert.equal(value(context,"DAYS"),120);assert.equal(value(context,"DAILY"),25000);
  assert.equal(value(context,"new Set(MODE_IDS.map(id=>MODE_NAME[id])).size"),7);
  assert.deepEqual(Array.from(value(context,"MODE_IDS.map(id=>MODE_RUN_TYPE[id])")),
    ["challenge","challenge","challenge","challenge","challenge","full-run","career"]);
  assert.equal(value(context,"modeRunTypeLabel(1,true)"),"Tutorial");
  assert.equal(value(context,"modeRunTypeLabel(5)"),"Full run");
  assert.equal(value(context,"modeRunTypeLabel(6)"),"Career");
  assert.equal(value(makeContext("?mode=7&seed=16").context,"MODE"),1,"an unknown route no longer falls back safely");
  assert.match(css,/body\[data-mode="6"\] #slots\{grid-template-columns:minmax\(0,1fr\)\}/,
    "Agency Career inherited the multi-card slot grid and can squeeze full-width operations panels");
  assert.match(css,/\.agency-tech-tree\{display:grid;grid-template-columns:minmax\(0,1fr\)/,
    "the tech tree wrapper can still squeeze its nested lead-card grid into columns");
}

// The persistent run context answers the same orientation questions in every engine and never mutates game state.
{
  const challenge=makeContext("?mode=1&seed=162");
  const before=value(challenge.context,"JSON.stringify(S)");
  vm.runInContext("installPlayerContextHook();render();updatePlayerContext()",challenge.context);
  assert.equal(challenge.registry.runType.textContent,"Challenge");
  assert.equal(challenge.registry.runModeName.textContent,"Closed-Loop Account");
  assert.equal(challenge.registry.runProgress.textContent,"Day 1 of 12");
  assert.equal(challenge.registry.runPhase.textContent,"Baseline setup");
  assert.match(challenge.registry.runObjective.textContent,/all-in business ROI/i);
  assert.match(challenge.registry.runWinCondition.textContent,/40%.*or better/i);
  assert.match(challenge.registry.runNext.textContent,state(challenge.context).pixel.status==="degraded"?
    /diagnose the pixel/i:/run Day 1 to establish a baseline/i);
  assert.match(challenge.registry.runContext.getAttribute("aria-label"),/Immediate objective:.*Next move:.*Win condition:/);
  assert.equal(value(challenge.context,"JSON.stringify(S)"),before,"rendering player context changed the simulation");

  const tutorial=makeContext("?mode=1&seed=2601&days=12&budget=20000&tutorial=1&guided=1&brief=1&autostart=1",
    {tutorialComplete:false});
  vm.runInContext("installPlayerContextHook();updatePlayerContext()",tutorial.context);
  assert.equal(tutorial.registry.runType.textContent,"Tutorial");
  assert.equal(tutorial.registry.runPhase.textContent,"Guided action 1 of 9");
  assert.match(tutorial.registry.runObjective.textContent,/clean Day 1 baseline/i);
  assert.match(tutorial.registry.runNext.textContent,/Select Run Day 1/i);
  assert.match(tutorial.registry.runWinCondition.textContent,/40%.*or better/i);

  const portfolio=makeContext("?mode=5&seed=163");
  vm.runInContext("installPlayerContextHook();updatePlayerContext()",portfolio.context);
  assert.equal(portfolio.registry.runType.textContent,"Full run");
  assert.equal(portfolio.registry.runPhase.textContent,"Acquisition gate 1");
  vm.runInContext('S.crises.push({id:"test",type:"quality"});updatePlayerContext()',portfolio.context);
  assert.equal(portfolio.registry.runPhase.textContent,"Crisis response");
  assert.match(portfolio.registry.runNext.textContent,/1 ticket is open/i);
  assert.equal(portfolio.registry.runContext.dataset.nextView,"overview","the crisis recommendation hid the command pane");
  assert.equal(portfolio.registry.runContext.dataset.nextPanel,"actions","the crisis recommendation did not expose the Crisis queue");

  const career=makeContext("?mode=6&seed=164&agencyType=digital_agency&guided=1");
  vm.runInContext("installPlayerContextHook();updatePlayerContext()",career.context);
  assert.equal(career.registry.runType.textContent,"Career guide");
  assert.match(career.registry.runProgress.textContent,/Year 2017 · month 1\/12 · workday 1\/20/i);
  assert.equal(career.registry.runPhase.textContent,"Digital marketing agency guide · step 1 of 4");
  assert.match(career.registry.runObjective.textContent,/founding client through Month 1/i);
  assert.equal(career.registry.runNext.textContent,"Show the founding client and the first assignment.");
  assert.match(career.registry.slots.innerHTML,/Guided start · step 1 of 4/);
  assert.match(career.registry.slots.innerHTML,/How Agency Career works/);
  assert.match(career.registry.slots.innerHTML,/data-agency-tutorial="show-client"/);
  assert.match(career.registry.slots.innerHTML,/Work clients[\s\S]*Manage the company[\s\S]*Run the day[\s\S]*Close the month/,
    "the Agency opening still does not explain its actual daily and monthly loop");
  assert.match(career.registry.slots.innerHTML,/Today's client priorities/);assert.match(career.registry.slots.innerHTML,/data-agency-workspace="board"/);
  vm.runInContext('S.filter="risk";S.rosterPage=7;AgencyCareer.render()',career.context);
  assert.match(career.registry.slots.innerHTML,/agency-roster agency-today-roster[\s\S]*?data-client-id="client-001"/,
    "the Today desk inherited an empty full-roster filter or later page");
  assert.match(career.registry.slots.innerHTML,/agency-full-scope[\s\S]*?No accounts in this view/,
    "the full Client work scope no longer honors its own filter");
  const foundingService=career.registry.slots.querySelectorAll("button[data-agency-action]").find(button=>button.dataset.agencyAction==="service"&&button.dataset.client==="client-001");
  assert.equal(foundingService?.disabled,true,"the founding client could be serviced before the walkthrough introduced the card");
  assert(value(career.context,'AgencyCareer.operate("client-001","service",{render:false})'),"the founding service action failed through the engine API");
  assert.equal(state(career.context).tutorialStep,2,"an early founding-client service left the walkthrough asking for duplicate work");
}

// The adaptive cockpit exposes six semantic destinations in Career. Every route changes only
// presentation state, and each focused page opens the matching nested system without ambiguity.
{
  for(const id of ["runContext","runNextButton","gameCockpit","workspaceMain","workspaceSide","workspaceEntityNav","workspaceTrail","workspaceNavNote"])
    assert.match(html,new RegExp(`id=["']${id}["']`),`the modular cockpit is missing #${id}`);
  const cockpitStart=html.indexOf('id="gameCockpit"'),sideStart=html.indexOf('id="workspaceSide"',cockpitStart),
    sideEnd=html.indexOf("</aside>",sideStart),ribbonStart=html.indexOf('class="account-ribbon"');
  assert(cockpitStart>=0&&sideStart>cockpitStart&&sideEnd>sideStart,"the cockpit's playable hierarchy is malformed");
  assert(ribbonStart>sideStart&&ribbonStart<sideEnd,
    "secondary account statistics sit above the playable surface instead of inside its Finance workspace");
  assert.match(html.slice(ribbonStart,html.indexOf(">",ribbonStart)+1),/data-workspace-panel="finance"/,
    "the account ribbon is not explicitly owned by the Finance route");
  const mastHasProfileBadge=/<(?:span|div)[^>]*id="profileBadge"/.test(html);
  assert(!mastHasProfileBadge||/\.mast\s+#profileBadge\{[^}]*display:none!important/.test(css),
    "the redundant track/profile badge still consumes mast space");
  assert.doesNotMatch(`${html}\n${appScript}`,
    /(?:GENERAL|GUIDED)\s+(?:training\s+)?track|general elective/i,
    "internal profile routing is still announced to the player as a training track");
  assert.doesNotMatch(css,/\.wrap\{[^}]*grid-template-rows:auto auto auto minmax\(0,1fr\)/,
    "the top-level shell still reserves a separate status row before gameplay");
  assert.match(css,/\.workspace-main>\.slots\{[^}]*grid-auto-rows:max-content/,
    "bounded card rows can collapse beneath their content and overlap during the tutorial");
  const declared=Array.from(html.matchAll(/data-workspace-view="([^"]+)"/g),match=>match[1]);
  assert.deepEqual(declared,["overview","board","finance","team","growth","history"],"the cockpit route order changed");
  assert.match(html,/data-workspace-view="overview"[^>]*aria-selected="true"/,
    "the cockpit has no explicit default Today state");
  assert.match(html,/data-side-view="actions"[^>]*aria-selected="true"/,
    "the Today page has no explicit default action panel");

  const fixture=makeContext("?mode=6&budget=250000&seed=165"),ui=installWorkspaceHarness(fixture),before=value(fixture.context,"JSON.stringify(S)");
  vm.runInContext("Workspace.init();Workspace.updateNavigation()",fixture.context);
  assert.deepEqual(ui.workspaceTabs.map(tab=>tab._tabHeading.textContent),["Today","Client work","Finance","Team","Capabilities","History"]);
  assert.equal(ui.workspaceTabs.filter(tab=>!tab.hidden).length,6,"Career hid a primary workspace route");
  assert.equal(ui.workspaceTabs.filter(tab=>tab.tabIndex===0).length,1,"Career workspace has no single keyboard entry point");
  const routes={
    overview:{main:true,side:true,sideView:"actions"},board:{main:true,side:false},
    finance:{main:false,side:true,sideView:"systems",drawer:"account"},team:{main:false,side:true,sideView:"systems",drawer:"account"},
    growth:{main:false,side:true,sideView:"systems",drawer:"pipe"},history:{main:false,side:true,sideView:"activity"}
  };
  vm.runInContext("Workspace.setSideView('actions',{persist:false})",fixture.context);
  for(const [route,expected] of Object.entries(routes)){
    assert.equal(value(fixture.context,`Workspace.setView(${JSON.stringify(route)},{persist:false})`),route);
    assert.equal(ui.cockpit.dataset.workspaceView,route);assert.equal(fixture.context.document.body.dataset.workspaceView,route);
    assert.equal(ui.main.getAttribute("aria-hidden"),String(!expected.main),`${route} exposed the wrong main pane`);
    assert.equal(ui.side.getAttribute("aria-hidden"),String(!expected.side),`${route} exposed the wrong side pane`);
    const financeRibbon=route==="finance";
    assert.equal(ui.accountRibbon.hidden,!financeRibbon,`${route} exposed the Finance-only account overview`);
    assert.equal(ui.accountRibbon.inert,!financeRibbon,`${route} left the Finance-only account overview interactive`);
    assert.equal(ui.accountRibbon.getAttribute("aria-hidden"),String(!financeRibbon),`${route} gave the Finance-only account overview the wrong accessibility state`);
    if(expected.sideView)assert.equal(ui.side.dataset.sideView,expected.sideView,`${route} opened the wrong nested page`);
    if(expected.drawer==="account"){assert.equal(ui.drawer.open,true);assert.equal(ui.pipeDrawer.open,false);}
    if(expected.drawer==="pipe"){assert.equal(ui.drawer.open,false);assert.equal(ui.pipeDrawer.open,true);}
  }
  assert.equal(value(fixture.context,"JSON.stringify(S)"),before,"semantic workspace routing changed the seeded simulation");

  const challenge=makeContext("?mode=4&seed=166"),challengeUi=installWorkspaceHarness(challenge);
  vm.runInContext("Workspace.updateNavigation()",challenge.context);
  assert.equal(challengeUi.workspaceTabs[3].hidden,true,"the career-only Team route appeared in a single-account challenge");
  assert.equal(value(challenge.context,'Workspace.setView("team",{persist:false})'),"finance","a noncareer Team route did not resolve to Account");

  // A guided card action narrows the board to the card being taught. Repeated refreshes must
  // keep that selection instead of toggling it off and restoring a crowded four-card wall.
  const guided=makeContext("?mode=1&seed=2601&days=12&budget=20000&guided=1",{tutorialComplete:false}),guidedUi=installWorkspaceHarness(guided);
  const guidedAction=new FakeElement("guidedCardAction",guided.registry);guidedAction.tagName="button";
  guidedUi.cards[1].card.appendChild(guidedAction);
  vm.runInContext("tutorialIsActive=()=>true;Workspace.init()",guided.context);
  assert.equal(value(guided.context,"Workspace.revealElement(document.getElementById('guidedCardAction'))"),true);
  assert.equal(guidedUi.cards[1].card.classList.contains("workspace-selected"),true,
    "the tutorial highlighted a card action without isolating its card");
  assert.equal(guidedUi.cards[0].card.classList.contains("workspace-dimmed"),true,
    "the tutorial left unrelated cards crowding the active lesson");
  assert.equal(guidedUi.cards[0].card.inert,true,"an unrelated tutorial card remained interactive");
  assert.equal(value(guided.context,"Workspace.revealElement(document.getElementById('guidedCardAction'))"),true);
  assert.equal(guidedUi.cards[1].card.classList.contains("workspace-selected"),true,
    "refreshing the tutorial toggled the current card back to the full board");
}

// A Career route change rebuilds card identity for the scope that just became visible. Today
// cannot leave Client Work with stale priority chips or undecorated full-roster cards.
{
  const fixture=makeContext("?mode=6&budget=250000&seed=1657"),ui=installWorkspaceHarness(fixture);
  fixture.registry.slots.querySelectorAll=selector=>selector.includes(".agency-today-roster")?[ui.cards[0].card]:
    selector.includes(".agency-full-roster")?ui.cards.map(item=>item.card):[];
  vm.runInContext("Workspace.init()",fixture.context);
  assert.equal(ui.cards[0].card.dataset.workspaceKey,"entity:client-001");
  assert.equal(ui.cards[1].card.dataset.workspaceKey,undefined,"Today eagerly prepared hidden full-roster cards");
  assert.doesNotMatch(ui.entityNav.innerHTML,/Quartz Finch Advisory Group/,
    "Today's entity navigation described the hidden full roster");
  vm.runInContext("Workspace.setView('board',{persist:false})",fixture.context);
  assert.equal(ui.cards[1].card.dataset.workspaceKey,"entity:client-002",
    "opening Client work did not prepare the newly visible full roster");
  assert.match(ui.entityNav.innerHTML,/Quartz Finch Advisory Group/,
    "Client work retained stale Today entity navigation after the route changed");
}

// Agency Career cards form a nested, reversible workspace: inspect one relationship without
// losing the roster, its collapsed context or the player's current location.
{
  const fixture=makeContext("?mode=6&budget=250000&seed=1651"),ui=installWorkspaceHarness(fixture),before=value(fixture.context,"JSON.stringify(S)");
  ui.cards[0].detail.open=true;vm.runInContext("UI_PREFS.density='analyst'",fixture.context);
  vm.runInContext("Workspace.init();Workspace.setView('board',{persist:false})",fixture.context);
  assert.equal(ui.entityNav.hidden,false,"a multi-client career roster did not expose entity navigation");
  assert.match(ui.entityNav.innerHTML,/data-entity-key/g);assert.equal(ui.cards[0].detail.open,false,"analyst density forced a client disclosure open");
  const key=ui.cards[0].card.dataset.workspaceKey;assert.equal(key,"entity:client-001","the career card did not use its stable client ID");
  ui.cards[0].heading.textContent="Renamed display label";vm.runInContext("Workspace.init()",fixture.context);
  assert.equal(ui.cards[0].card.dataset.workspaceKey,key,"changing a client's display label changed its workspace identity");
  assert.equal(value(fixture.context,`Workspace.selectEntity(${JSON.stringify(key)})`),key);
  assert.equal(ui.cards[0].card.classList.contains("workspace-selected"),true);assert.equal(ui.cards[1].card.classList.contains("workspace-dimmed"),true);
  assert.equal(ui.cards[1].card.getAttribute("aria-hidden"),"true");assert.equal(ui.cards[1].card.inert,true);
  assert.equal(ui.cards[0].detail.open,true,"inspecting a career card did not expand its nested context");
  assert.equal(ui.cards[0].detail.dataset.workspaceAutoOpened,"true");assert.equal(fixture.context.document.activeElement,ui.cards[0].heading);
  assert.equal(ui.trail.textContent,"Client work / Renamed display label","the breadcrumb did not identify the inspected client");
  assert.equal(value(fixture.context,"Workspace.clearSelection()"),true);
  assert.equal(ui.cards[0].detail.open,false,"leaving a client did not restore its prior collapsed state");
  assert.equal(ui.cards[1].card.getAttribute("aria-hidden"),null);assert.equal(ui.cards[1].card.inert,false);
  assert.equal(ui.trail.textContent,"Client work / All active relationships");
  assert.equal(value(fixture.context,"JSON.stringify(S)"),before,"nested career navigation changed the simulation");
}

// Detail level may add explanation, but it must not open drawers or every card disclosure on
// the player's behalf. Open state is an explicit navigation choice, not a density side effect.
{
  const localStore=new Map([["ttm.ui.general.v1",JSON.stringify({tooltips:true,analogies:true,density:"analyst"})]]),
    fixture=makeContext("?mode=4&seed=1658",{localStore});
  vm.runInContext("render()",fixture.context);
  assert.doesNotMatch(fixture.registry.strip.innerHTML,/<details class="modern-hud-drawer"[^>]*\sopen(?:\s|>)/,
    "analyst density forced the supporting-metrics drawer open");
  assert.doesNotMatch(fixture.registry.slots.innerHTML,/<details class="card-detail-block"[^>]*\sopen(?:\s|>)/,
    "analyst density forced every card disclosure open");
}

// The recommendation is one coherent attention signal. In Agency's opening guide, the visible
// first action advances only tutorial presentation state; no economics, time or RNG can move.
{
  const career=makeContext("?mode=6&budget=250000&seed=1655&agencyType=digital_agency&guided=1"),ui=installWorkspaceHarness(career),before=state(career.context),careerRngBefore=value(career.context,"JSON.stringify(S.rng)");
  const model=JSON.parse(value(career.context,"Workspace.init();JSON.stringify(Workspace.updateNavigation())"));
  assert.equal(model.recommendedView,"board");assert.match(model.recommendation,/Show the founding client and the first assignment/i);
  assert.equal(ui.nextButton.dataset.workspaceTarget,"board");assert.match(ui.navNote.textContent,/Show the founding client and the first assignment/i);
  assert.equal(ui.workspaceTabs[1].classList.contains("is-recommended"),true);
  assert.equal(value(career.context,"Workspace.activateRecommendation()"),"board");
  const after=state(career.context);
  assert.equal(ui.cockpit.dataset.workspaceView,"board");
  assert.equal(after.tutorialStep,1,"the visible Show me the founding client action did not advance the guided start");
  assert.equal(after.day,before.day);assert.equal(after.focusRemaining,before.focusRemaining);assert.equal(after.cash,before.cash);
  assert.equal(value(career.context,"JSON.stringify(S.rng)"),careerRngBefore,"opening the guided client consumed deterministic RNG");
  assert.match(career.registry.slots.innerHTML,/Guided start · step 2 of 4/);
  assert.match(career.registry.slots.innerHTML,/agency-client-coach is-action/);
  const serviceMarkup=career.registry.slots.innerHTML.match(/<button class="btn tutorial-focus" data-agency-action="service" data-client="client-001"[^>]*>/)?.[0]||"";
  assert(serviceMarkup,"the guided recommendation did not visibly mark the required account action");
  assert.doesNotMatch(serviceMarkup,/\sdisabled(?:\s|>)/,"the guided recommendation opened the client but left its required action unavailable");
  assert(value(career.context,'AgencyCareer.operate("client-001","service")'),"the guided service action failed");
  assert.equal(state(career.context).tutorialStep,2);assert.match(career.registry.slots.innerHTML,/Guided start · step 3 of 4/);
  assert.match(career.registry.slots.innerHTML,/agency-guide-results[\s\S]*account health[\s\S]*outcome index[\s\S]*next service[\s\S]*client trust/,
    "the guided result did not explain the distinct values changed by service");

  const challenge=makeContext("?mode=4&seed=1656"),challengeUi=installWorkspaceHarness(challenge),challengeBefore=value(challenge.context,"JSON.stringify(S)"),rngBefore=value(challenge.context,"JSON.stringify(S.rng)");
  vm.runInContext("Workspace.init()",challenge.context);
  const expectedChallengeView=challenge.registry.runContext.dataset.nextView;
  assert(["board","finance"].includes(expectedChallengeView),"the run briefing did not publish its scenario-aware destination");
  assert.equal(JSON.parse(value(challenge.context,"JSON.stringify(Workspace.updateNavigation())")).recommendedView,expectedChallengeView);
  assert.equal(value(challenge.context,"Workspace.activateRecommendation()"),expectedChallengeView);
  assert.equal(challengeUi.cockpit.dataset.workspaceView,expectedChallengeView);
  assert.equal(value(challenge.context,"JSON.stringify(S)"),challengeBefore,"opening a recommendation changed challenge state");
  assert.equal(value(challenge.context,"JSON.stringify(S.rng)"),rngBefore,"opening a recommendation consumed deterministic RNG");
}

// Agency-wide information is nested into three status pages and three Company pages. These
// presentation tabs retain location independently while leaving the career save untouched.
{
  const sessionStore=new Map(),fixture=makeContext("?mode=6&budget=250000&seed=1657",{sessionStore});
  vm.runInContext("AgencyCareer.render()",fixture.context);
  const hudTabs=fixture.registry.strip._descendants.filter(node=>node.dataset.agencyHudView!==undefined),
    hudPanels=fixture.registry.strip._descendants.filter(node=>node.dataset.agencyHudPanel!==undefined),
    companyTabs=fixture.registry.accountBox._descendants.filter(node=>node.dataset.agencyCompanyView!==undefined),
    companyPanels=fixture.registry.accountBox._descendants.filter(node=>node.dataset.agencyCompanyPanel!==undefined);
  assert.deepEqual(hudTabs.map(tab=>tab.dataset.agencyHudView),["today","money","agency"]);
  assert.deepEqual(hudPanels.map(panel=>panel.dataset.agencyHudPanel),["today","money","agency"]);
  assert.deepEqual(companyTabs.map(tab=>tab.dataset.agencyCompanyView),["operations","finance","team"]);
  assert.deepEqual(companyPanels.map(panel=>panel.dataset.agencyCompanyPanel),["operations","finance","team"]);
  assert.doesNotMatch(fixture.registry.strip.innerHTML,/agency-hud-drawer|supporting signals/i,"Agency status fell back to a dense disclosure drawer");
  assert.match(fixture.registry.strip.innerHTML,/agency-level-card/,"Agency level did not receive its own progression hierarchy");
  assert.match(fixture.registry.strip.innerHTML,/aria-label="Agency career level 1"[^>]*>1</,"Agency level is not a distinct primary value");
  assert.match(fixture.registry.strip.innerHTML,/1<\/b><span>capability point available/,"capability-point currency is not separated from Agency level");
  assert.match(fixture.registry.strip.innerHTML,/\$25,000 more peak career profit to reach level 2/,"Agency level omitted its next milestone");
  assert.doesNotMatch(fixture.registry.strip.innerHTML,/1 · 1 point/,"Agency level and capability points collapsed back into one ambiguous value");
  assert.match(css,/\.agency-level-card\{[^}]*grid-column:1\/-1[^}]*min-height:132px[^}]*border-color:rgba\(250,204,21,\.68\)/,
    "Agency level card is not a full-width, high-emphasis progression card");
  assert.match(css,/\.agency-level-main>strong\{[^}]*font:800 clamp\(42px,5vw,58px\)/,"Agency level number lost its bold display hierarchy");
  const originalAll=fixture.context.document.querySelectorAll.bind(fixture.context.document),before=value(fixture.context,"JSON.stringify(S)");
  fixture.context.document.querySelectorAll=selector=>selector==="[data-agency-hud-view]"?hudTabs:selector==="[data-agency-hud-panel]"?hudPanels:
    selector==="[data-agency-company-view]"?companyTabs:selector==="[data-agency-company-panel]"?companyPanels:originalAll(selector);
  assert.equal(value(fixture.context,"AgencyCareer.setDashboardView('money')"),"money");
  assert.equal(hudTabs[1].getAttribute("aria-selected"),"true");assert.equal(hudPanels[1].hidden,false);assert.equal(hudPanels[0].hidden,true);
  assert.equal(value(fixture.context,"AgencyCareer.setCompanyView('team')"),"team");
  assert.equal(companyTabs[2].getAttribute("aria-selected"),"true");assert.equal(companyPanels[2].hidden,false);assert.equal(companyPanels[0].hidden,true);
  assert.equal(sessionStore.get("ttm.agency.dashboard.general.v1"),"money");assert.equal(sessionStore.get("ttm.agency.company.general.v1"),"team");
  assert.equal(value(fixture.context,"JSON.stringify(S)"),before,"nested Agency or Company navigation changed the career save");
}

// Workspace tabs use roving keyboard focus, Escape walks outward one layer at a time, and
// the breadcrumb always names the currently visible semantic route.
{
  const fixture=makeContext("?mode=6&budget=250000&seed=1652"),ui=installWorkspaceHarness(fixture);
  vm.runInContext("Workspace.init();Workspace.setView('overview',{persist:false});Workspace.setSideView('actions',{persist:false})",fixture.context);
  const keydown=fixture.documentListeners.keydown.at(-1)?.handler;assert.equal(typeof keydown,"function","workspace keyboard handler was not installed");
  const press=(target,key)=>{const event={target,key,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};keydown(event);return event;};
  let event=press(ui.workspaceTabs[0],"ArrowRight");assert.equal(event.defaultPrevented,true);
  assert.equal(ui.cockpit.dataset.workspaceView,"board");assert.equal(ui.workspaceTabs[1].getAttribute("aria-selected"),"true");
  assert.equal(ui.workspaceTabs[1].tabIndex,0);assert.equal(ui.workspaceTabs[0].tabIndex,-1);assert.equal(fixture.context.document.activeElement,ui.workspaceTabs[1]);
  assert.equal(ui.trail.textContent,"Client work / All active relationships");
  event=press(ui.workspaceTabs[1],"End");assert.equal(event.defaultPrevented,true);assert.equal(ui.cockpit.dataset.workspaceView,"history");
  assert.equal(ui.trail.textContent,"History / Recent activity");
  vm.runInContext("Workspace.setView('overview',{persist:false})",fixture.context);
  event=press(ui.sideTabs[0],"End");assert.equal(event.defaultPrevented,true);assert.equal(ui.side.dataset.sideView,"systems");
  assert.equal(ui.drawer.open,false,"opening the Systems tab forced an account disclosure open");assert.equal(ui.sidePanels[2].hidden,false);assert.equal(ui.sidePanels[0].hidden,true);
  assert.equal(ui.trail.textContent,"Today / Today's priorities");
  fixture.registry.overlay.innerHTML="";fixture.registry.guideOverlay.innerHTML="";
  vm.runInContext("Workspace.setView('board',{persist:false})",fixture.context);const key=ui.cards[0].card.dataset.workspaceKey;
  value(fixture.context,`Workspace.selectEntity(${JSON.stringify(key)},{focus:false})`);event=press(fixture.context.document.body,"Escape");
  assert.equal(event.defaultPrevented,true);assert.equal(ui.cockpit.dataset.workspaceView,"board","first Escape left the current workspace instead of closing the nested card");
  assert.equal(ui.trail.textContent,"Client work / All active relationships");event=press(fixture.context.document.body,"Escape");
  assert.equal(event.defaultPrevented,true);assert.equal(ui.cockpit.dataset.workspaceView,"overview");assert.equal(fixture.context.document.activeElement,ui.main);
  assert.equal(ui.trail.textContent,"Today / Today's priorities");
}

// Workspace preferences are mode-scoped v2 presentation state: a Career location survives a
// reload, does not leak into challenges, and never enters the save payload.
{
  const sessionStore=new Map(),localStore=new Map(),first=makeContext("?mode=6&budget=250000&seed=1653",{sessionStore,localStore}),before=value(first.context,"JSON.stringify(S)");
  const firstUi=installWorkspaceHarness(first);vm.runInContext("Workspace.init();Workspace.setView('history');Workspace.setSideView('activity')",first.context);
  firstUi.cards[0].detail.dataset.disclosureId="client-contract";firstUi.cards[0].detail.open=true;
  firstUi.cockpit.listeners.toggle[0]({target:firstUi.cards[0].detail});
  assert.equal(sessionStore.get("ttm.workspace.view.mode-6.v2"),"history");assert.equal(sessionStore.get("ttm.workspace.side.mode-6.v2"),"activity");
  assert.deepEqual(JSON.parse(sessionStore.get("ttm.workspace.disclosures.mode-6.v2")),{"client-contract":true});
  assert.equal(value(first.context,"JSON.stringify(S)"),before,"persisting workspace location changed the career save");
  assert.equal(value(first.context,"saveGame('workspace-resume-test',false)"),true);
  const challenge=makeContext("?mode=4&seed=1653",{sessionStore});
  assert.equal(challenge.registry.gameCockpit.dataset.workspaceView,"overview","Career workspace state leaked into a challenge");
  vm.runInContext("Workspace.setView('finance')",challenge.context);
  assert.equal(sessionStore.get("ttm.workspace.view.mode-4.v2"),"finance");assert.equal(sessionStore.get("ttm.workspace.view.mode-6.v2"),"history");
  const resumed=makeContext("?mode=6&budget=250000&seed=1653&resume=1",{sessionStore,localStore});
  const resumedUi=installWorkspaceHarness(resumed);resumedUi.cards[0].detail.dataset.disclosureId="client-contract";vm.runInContext("Workspace.init()",resumed.context);
  assert.equal(resumed.registry.gameCockpit.dataset.workspaceView,"history");assert.equal(resumed.registry.workspaceSide.dataset.sideView,"activity");
  assert.equal(resumed.registry.workspaceTrail.textContent,"History / Recent activity");
  assert.equal(resumedUi.cards[0].detail.open,true,"an explicit player disclosure choice was not restored");
  const invalidStore=new Map([["ttm.workspace.view.mode-6.v2","unknown"],["ttm.workspace.side.mode-6.v2","unknown"]]),fallback=makeContext("?mode=6&seed=1654",{sessionStore:invalidStore});
  assert.equal(fallback.registry.gameCockpit.dataset.workspaceView,"overview");assert.equal(fallback.registry.workspaceSide.dataset.sideView,"actions");
}

// The shell stays bounded on normal and short desktops. Mobile converts the rail into a
// scannable grid instead of inheriting desktop's inner-scroll layout.
{
  assert.match(css,/@media \(min-width:980px\)\{[\s\S]*?\.wrap\{height:100dvh;max-height:100dvh;display:grid;[^}]*overflow:hidden/,
    "the desktop shell is not bounded to the viewport");
  assert.match(css,/@media \(min-width:980px\) and \(max-height:639px\)\{[\s\S]*?\.wrap>\.game-cockpit\{grid-template-columns:154px/,
    "a short desktop does not retain the bounded cockpit shell");
  assert.match(css,/@media \(max-width:979px\)\{[\s\S]*?\.cockpit-tabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
    "tablet workspace navigation does not become a three-column grid");
  assert.match(css,/@media \(max-width:560px\)\{[\s\S]*?\.cockpit-tabs\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
    "phone workspace navigation does not become a two-column grid");
  assert.match(css,/\.workspace-side>\.account-ribbon\{[^}]*display:none/,
    "Today and Client work do not hide the secondary Finance ribbon");
  assert.match(css,/\.game-cockpit\[data-workspace-view="finance"\][^\{]*\.workspace-side>\.account-ribbon\{[^}]*display:(?:grid|block)/,
    "the Finance route cannot reveal its account statistics");
  assert.match(css,/@media \(min-width:681px\) and \(max-height:720px\)\{[\s\S]*?\.card\.game-menu-card:has\(\.title-screen\)\{[^}]*overflow-y:auto/,
    "short-desktop title-screen controls can be clipped below an overflow-hidden panel");
  assert.match(css,/@media \(max-width:680px\)\{[\s\S]*?\.card\.game-menu-card:has\(\.title-screen\)\{[^}]*overflow-y:auto/,
    "mobile title-screen controls cannot be reached by scrolling the menu panel");
  assert.match(css,/\.game-cockpit\[data-workspace-view="board"\] \.workspace-side\{display:none\}/);
  assert.match(css,/\.agency-today-roster\{display:none!important\}/,
    "the priority roster is visible outside the Today route");
  assert.match(css,/body\[data-mode="6"\] \.game-cockpit\[data-workspace-view="overview"\] \.agency-full-scope,[\s\S]*?\.entity-nav\{display:none!important\}/,
    "the Career Today page can leak the full filtered roster into its priority list");
  for(const route of ["finance","team","growth","history"])
    assert.match(css,new RegExp(`\\.game-cockpit\\[data-workspace-view="${route}"\\][^\\{]*\\.workspace-main`),`${route} has no focused-page layout rule`);
}

// Career data encodes the promised 2017–2027 arc, client ladder, first-year gates, and 75-seat ceiling.
{
  const {context}=makeContext("?mode=6&seed=161");
  assert.equal(value(context,"AGENCY_TOTAL_MONTHS"),120);
  assert.equal(value(context,"AGENCY_MONTH_DAYS"),20);
  assert.equal(value(context,"AGENCY_MAX_CLIENTS"),75);
  assert.equal(value(context,"AGENCY_PROFIT_TARGET"),12000000);
  assert.deepEqual(JSON.parse(value(context,"JSON.stringify(AGENCY_MILESTONES.filter(m=>m.month<=12).map(m=>[m.month,m.target]))")),
    [[1,1],[2,2],[3,5],[6,15],[12,30]]);
  assert.deepEqual(Array.from(value(context,"AGENCY_ERAS.map(era=>era.year)")),
    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026,2027]);
  assert.equal(value(context,"AGENCY_TECH_NODES.some(node=>node.id==='affiliate_engine')"),true);
  const endgameIds=["distributed_ops","distributed_qa","follow_the_sun","agentic_workbench","agentic_ops","creative_automation",
    "automated_creative_pipeline","workstation_fleet","resilient_network","satellite_failover","local_ai_cluster"];
  assert.deepEqual(Array.from(value(context,`AGENCY_TECH_NODES.filter(node=>${JSON.stringify(endgameIds)}.includes(node.id)).map(node=>node.id)`)),endgameIds,
    "Agency Career omitted or reordered an endgame capability path");
  assert.equal(value(context,"new Set(AGENCY_TECH_NODES.map(node=>node.id)).size===AGENCY_TECH_NODES.length"),true,"capability IDs are not unique");
  assert.equal(value(context,`AGENCY_TECH_NODES.filter(node=>${JSON.stringify(endgameIds)}.includes(node.id)).every(node=>node.year>=2022&&node.level>=6&&node.investment>0&&node.monthly>0&&node.tradeoff&&["infrastructureHosting","softwareSubscriptions","facilitiesAdministration"].includes(node.monthlyCategory))`),true,
    "an endgame capability lacks a year, level, cash investment, recurring obligation, tradeoff or valid operating-cost category");
  assert.doesNotMatch(value(context,"JSON.stringify(AGENCY_TECH_NODES)"),/Starlink|OpenAI|NVIDIA|Apple/i,
    "player-facing capability data used a real company or product brand");
  assert.equal(value(context,"AGENCY_TECH_NODES.every(node=>node.requires.every(id=>AGENCY_TECH_NODES.some(other=>other.id===id)))"),true);
  const ladder=Array.from(value(context,"['smb_leadgen','smb_commerce','enterprise_leadgen','enterprise_commerce'].map(id=>AGENCY_CLIENT_TYPES[id])"));
  assert.deepEqual(ladder.map(type=>type.id),["smb_leadgen","smb_commerce","enterprise_leadgen","enterprise_commerce"]);
  for(let i=1;i<ladder.length;i++){
    assert(ladder[i].fee>ladder[i-1].fee,"harder client tiers must pay a higher agency fee");
    assert(ladder[i].work>ladder[i-1].work,"harder client tiers must consume more operating bandwidth");
    assert(ladder[i].cadence<ladder[i-1].cadence,"harder client tiers must need attention more often");
  }
}

// Headquarters, service territories, offers and ad concepts are authored data rather than
// interchangeable labels. The location catalog covers every U.S. state and the District of Columbia once.
{
  const {context}=makeContext("?mode=6&seed=1611"),hqs=JSON.parse(value(context,"JSON.stringify(AGENCY_HQ_LOCATIONS)")),
    pools=JSON.parse(value(context,"JSON.stringify(AGENCY_TARGET_STATE_POOLS)")),
    stateNames=JSON.parse(value(context,"JSON.stringify(AGENCY_STATE_NAMES)")),
    verticals=JSON.parse(value(context,"JSON.stringify(AGENCY_VERTICALS)")),
    offers=JSON.parse(value(context,"JSON.stringify(AGENCY_OFFERS)")),concepts=JSON.parse(value(context,"JSON.stringify(AGENCY_AD_CONCEPTS)"));
  assert.equal(hqs.length,20,"Agency Career must offer 20 deliberately different U.S. headquarters");
  assert.equal(new Set(hqs.map(item=>item.id)).size,hqs.length,"headquarters IDs are not unique");
  for(const hq of hqs){
    assert.doesNotThrow(()=>new Intl.DateTimeFormat("en-US",{timeZone:hq.timezone}).format(new Date("2026-06-15T12:00:00Z")),
      `${hq.id} does not use a valid IANA time-zone identifier`);
    assert(hq.facilitiesCostMultiplier>=.85&&hq.facilitiesCostMultiplier<=1.2,`${hq.id} has an unbounded facilities-cost modifier`);
  }
  const pooledStates=Object.values(pools).flatMap(pool=>pool.states);
  assert.equal(pooledStates.length,51,"target-state pools must contain 50 states plus the District of Columbia exactly once");
  assert.equal(new Set(pooledStates).size,51,"a target state appears in more than one regional pool");
  assert.deepEqual(pooledStates.slice().sort(),Object.keys(stateNames).sort(),"target-state pools do not cover the canonical state catalog");
  assert.equal(new Set(offers.map(item=>item.id)).size,offers.length,"offer IDs are not unique");
  assert.equal(new Set(concepts.map(item=>item.id)).size,concepts.length,"ad-concept IDs are not unique");
  for(const vertical of verticals){
    const verticalOffers=offers.filter(item=>item.vertical===vertical.id),verticalConcepts=concepts.filter(item=>item.vertical===vertical.id);
    assert(verticalOffers.length>=3,`${vertical.id} has fewer than three actual things a customer can buy, book or request`);
    assert(verticalConcepts.length>=2,`${vertical.id} has fewer than two distinct advertising ideas`);
  }
  for(const offer of offers){
    const matches=concepts.filter(concept=>concept.vertical===offer.vertical&&concept.offerIds.includes(offer.id));
    assert(matches.length>=1,`${offer.id} has no semantically authored ad concept`);
  }
  assert(concepts.every(concept=>Array.isArray(concept.offerIds)&&concept.offerIds.length>=1&&concept.offerIds.every(offerId=>
    offers.some(offer=>offer.id===offerId&&offer.vertical===concept.vertical))),
  "an ad concept points to an absent offer or an offer in another vertical");
  assert(new Set(concepts.map(item=>item.format)).size>=10,"the concept library does not produce enough distinct creative formats");
  for(const channel of ["social","shortform","programmatic","out_of_home","radio","cable"])
    assert(concepts.some(item=>item.channels.includes(channel)),`${channel} has no authored ad concept`);
  assert(offers.every(item=>item.label&&item.conversion&&["local","regional","national"].includes(item.scope)),
    "an offer does not explain what is sold, what counts as an outcome or where it can be served");
  assert(concepts.every(item=>item.label&&item.premise&&item.format&&item.channels.length),
    "an ad concept is missing its idea, format or valid placement family");

  const models=JSON.parse(value(context,"JSON.stringify(AGENCY_STARTER_MODELS)")),wizardModels=JSON.parse(value(context,"JSON.stringify(Object.fromEntries(Object.keys(AGENCY_STARTER_MODELS).map(id=>[id,agencyWizardModel(id)])))")),
    channelIds=Object.keys(JSON.parse(value(context,"JSON.stringify(AGENCY_CHANNELS)"))).sort(),
    expectedChannels={
      holding_company:{allowed:["programmatic","search","shopping","shortform","social"],forbidden:["cable","out_of_home","radio"]},
      creative_agency:{allowed:["cable","out_of_home","programmatic","radio","shortform","social"],forbidden:["search","shopping"]},
      digital_agency:{allowed:["programmatic","search","shopping","shortform","social"],forbidden:["cable","out_of_home","radio"]}
    };
  assert.deepEqual(Object.keys(models).sort(),Object.keys(expectedChannels).sort(),"the starter-model catalog is incomplete");
  for(const [id,expected] of Object.entries(expectedChannels)){
    const model=models[id],wizard=wizardModels[id];
    assert.deepEqual(model.allowedChannels.slice().sort(),expected.allowed,`${id} exposes the wrong channel set`);
    assert.deepEqual(model.forbiddenChannels.slice().sort(),expected.forbidden,`${id} forbids the wrong channel set`);
    assert.deepEqual([...model.allowedChannels,...model.forbiddenChannels].sort(),channelIds,`${id} does not account for every buying channel exactly once`);
    for(const field of ["selectionCopy","playerRole","startingSituation","channelRule"]){
      assert(model[field].length>=50,`${id} does not explain ${field} in complete player-facing language`);
      assert.equal(wizard[field],model[field],`${id} says something different in setup than the simulation enforces for ${field}`);
    }
    assert(model.winShape.length>=50&&model.tutorialFocus.length===4,`${id} does not explain its goal and opening lesson sequence`);
  }
  assert.match(models.holding_company.channelRule,/digital channels.*traditional.*not part/is);
  assert.match(models.creative_agency.channelRule,/paid search.*unavailable.*outdoor.*radio.*cable/is);
  assert.match(models.digital_agency.channelRule,/paid search.*immediately.*traditional.*outside/is);
}

// Fresh lead generation chooses the offer and concept together. Every non-search concept must
// support its buying channel, and Shopping receives a product-listing execution instead of a video format.
{
  const configurations=[
    {model:"digital_agency",unlocked:["search_foundations","paid_social","commerce_feeds","short_form","measurement","programmatic"]},
    {model:"creative_agency",unlocked:["paid_social","creative_studio","traditional_media","short_form","measurement","programmatic"]}
  ],seen=new Set();
  for(const [modelIndex,configuration] of configurations.entries()){
    const fixture=makeContext(`?mode=6&budget=250000&seed=${16120+modelIndex}&agencyType=${configuration.model}`);
    vm.runInContext(`S.month=24;S.day=481;S.targetSeats=50;S.unlocked=${JSON.stringify(configuration.unlocked)};`,fixture.context);
    for(let round=0;round<8;round++){
      vm.runInContext(`S.prospects=[];S.telemetry.clientsRejected=${round*50};`,fixture.context);
      const leads=JSON.parse(value(fixture.context,"JSON.stringify(AgencyCareer.generateProspects(S,18))"));
      for(const lead of leads){
        const offer=JSON.parse(value(fixture.context,`JSON.stringify(AGENCY_OFFERS.find(item=>item.id===${JSON.stringify(lead.offerId)}))`)),
          concept=JSON.parse(value(fixture.context,`JSON.stringify(AGENCY_AD_CONCEPTS.find(item=>item.id===${JSON.stringify(lead.adConceptId)}))`));
        assert(offer&&concept,`fresh ${lead.channel} lead points to missing authored data`);
        assert.equal(offer.vertical,lead.vertical);assert.equal(concept.vertical,lead.vertical);
        assert(concept.offerIds.includes(offer.id),`${lead.channel} paired ${offer.id} with ${concept.id}`);
        if(lead.channel==="search")assert.equal(lead.adFormat,"expanded_search_text");
        else{
          assert(concept.channels.includes(lead.channel),`${concept.id} cannot run in ${lead.channel}`);
          assert.equal(lead.adFormat,lead.channel==="shopping"?"product_listing":concept.format,
            `${lead.channel} exposed an incompatible creative format`);
        }
        seen.add(lead.channel);
      }
    }
  }
  assert.deepEqual([...seen].sort(),["cable","out_of_home","programmatic","radio","search","shopping","shortform","social"],
    "the fresh-client sample did not exercise every buying-channel alignment contract");
}

// The three Agency Career starters are different businesses, not cosmetic loadout labels.
{
  const base="?mode=6&budget=250000&seed=1612&agencyName=Orbit%20House&hq=portland-or",digital=makeContext(`${base}&agencyType=digital_agency`),
    creative=makeContext(`${base}&agencyType=creative_agency`),holdingStore=new Map(),
    holding=makeContext(`${base}&agencyType=holding_company`,{localStore:holdingStore});
  const ds=state(digital.context),cs=state(creative.context),hs=state(holding.context);
  assert.deepEqual({...ds.agencyIdentity},{name:"Orbit House",hqId:"portland-or",agencyType:"digital_agency"});
  assert.equal(ds.businessModel,"agency");assert.equal(ds.clients.length,1);assert.equal(ds.clients[0].channel,"search");
  assert.deepEqual(Array.from(ds.unlocked),["search_foundations"]);assert.equal(value(digital.context,"AgencyCareer.validate(S)"),true);
  const digitalScope=JSON.parse(value(digital.context,"JSON.stringify(realWorldScope())"));
  assert.match(digitalScope.channel,/beginning with paid search/i);assert.match(digitalScope.platform,/Paid search is available from the start/i);
  assert.match(digitalScope.platform,/Outdoor, radio and cable are unavailable/i);
  assert.match(digitalScope.hierarchy,/client-owned platform ad account/);

  assert.equal(cs.businessModel,"agency");assert.equal(cs.clients.length,1);assert.notEqual(cs.clients[0].channel,"search");
  assert.equal(cs.clients[0].channel,"social");assert(cs.unlocked.includes("traditional_media"));assert(!cs.unlocked.includes("search_foundations"));
  assert.equal(value(creative.context,"AgencyCareer.canUnlock('search_foundations').ok"),false,"creative agency can buy paid search despite its defining rule");
  assert.equal(value(creative.context,"AgencyCareer.validate(S)"),true);
  vm.runInContext("S.month=1;S.targetSeats=12;AgencyCareer.generateProspects(S,12)",creative.context);
  assert(cs.prospects.length>=8,"creative agency did not produce a useful prospective-client slate");
  assert(cs.prospects.every(client=>client.channel!=="search"&&client.channel!=="shopping"),"creative agency generated a paid-search prospect");
  assert(cs.prospects.every(client=>["social","shortform","programmatic","out_of_home","radio","cable"].includes(client.channel)),
    "creative agency generated a client outside its actual service model");
  assert(cs.prospects.some(client=>["out_of_home","radio","cable"].includes(client.channel)),
    "traditional media is listed as available but never appears in creative-agency opportunities");
  const creativeScope=JSON.parse(value(creative.context,"JSON.stringify(realWorldScope())")),creativeScopeMarkup=value(creative.context,"realityMarkup()"),
    creativeHelp=JSON.parse(value(creative.context,"JSON.stringify(cardAnatomyRows())")),creativeTech=creativeHelp.find(row=>row[0]==="Technology tree")?.[1]||"";
  assert.match(creativeScope.channel,/creative production.*paid social.*outdoor.*radio.*cable/i);
  assert.match(creativeScope.channel,/Paid search and shopping feeds are unavailable/i);
  assert.match(creativeScope.platform,/available from the start.*Short-form video and programmatic media can be added later/is);
  assert.match(creativeScope.objective,/creative effectiveness.*sustainable production capacity/i);
  assert.match(creativeScope.hierarchy,/campaign brief.*concept and production.*traditional placement/i);
  assert.doesNotMatch(creativeScopeMarkup,/beginning with paid search|all-search practice/i,
    "the creative-agency scope drawer still describes a paid-search starter");
  assert.match(creativeTech,/Paid-search systems remain unavailable/i);assert.doesNotMatch(creativeTech,/core strategy/i,
    "the creative-agency card guide still recommends paid search");

  assert.equal(hs.businessModel,"affiliate");assert.equal(hs.clients.length,0);assert.equal(hs.targetSeats,0);
  assert(hs.affiliate&&hs.affiliate.origin==="holding-company");assert(hs.affiliate.funnels.length>=3,"holding company did not open with several owned offers");
  assert.equal(new Set(hs.affiliate.funnels.map(item=>item.verticalId)).size,hs.affiliate.funnels.length,
    "holding-company opening duplicated the same owned offer");
  assert.equal(value(holding.context,"AgencyCareer.validate(S)"),true);
  const month=runToNextAgencySettlement(holding.context);assert(month&&state(holding.context).month===1);
  assert.equal(state(holding.context).ended,false,"holding company inherited the agency's founding-client fail state");
  assert.notEqual(state(holding.context).outcome,"founding-client-lost");
  assert.equal(state(holding.context).targetSeats,0,"holding company inherited a client-seat growth target after Month 1");
  assert.equal(value(holding.context,"AgencyCareer.validate(S)"),true,"holding-company state became invalid at its first month close");
  assert.equal(value(holding.context,"saveGame('holding-month-1',false)"),true);
  const resumedHolding=makeContext(`${base}&agencyType=holding_company&resume=1`,{localStore:holdingStore});
  assert.equal(state(resumedHolding.context).month,1,"the first Holding Company checkpoint did not resume at Month 2");
  assert.equal(state(resumedHolding.context).targetSeats,0);assert.equal(state(resumedHolding.context).clients.length,0);
  assert.equal(value(resumedHolding.context,"AgencyCareer.validate(S)"),true,"the resumed Holding Company checkpoint failed validation");
  const holdingScope=JSON.parse(value(holding.context,"JSON.stringify(realWorldScope())")),holdingHelp=JSON.parse(value(holding.context,"JSON.stringify(cardAnatomyRows())")),
    holdingTech=holdingHelp.find(row=>row[0]==="Technology tree")?.[1]||"";
  assert.match(holdingScope.channel,/Company-owned digital acquisition.*no clients or retainers/i);
  assert.match(holdingScope.team,/Performance holding company/i);assert.match(holdingScope.objective,/company-owned offers/i);
  assert.match(holdingScope.hierarchy,/company-owned offer and funnel/i);assert.doesNotMatch(JSON.stringify(holdingScope),/Affiliate scaling company/i,
    "the original holding company was relabeled as an agency that pivoted later");
  assert.match(holdingTech,/no client-service catalog or client retainers/i);assert.doesNotMatch(holdingTech,/Paid search can remain/i);
  const transformedScope=JSON.parse(value(digital.context,`(()=>{const priorModel=S.businessModel,priorAffiliate=S.affiliate;S.businessModel='affiliate';S.affiliate={origin:'agency-pivot'};const result=JSON.stringify(realWorldScope());S.businessModel=priorModel;S.affiliate=priorAffiliate;return result;})()`));
  assert.match(transformedScope.channel,/after the agency has offboarded every client/i);
  assert.match(transformedScope.team,/Affiliate scaling company.*transformed owned-funnel business/i);
  assert.doesNotMatch(JSON.stringify(transformedScope),/Performance holding company/i,
    "a later affiliate pivot was mislabeled as the original holding-company starter");
  assert.equal(value(creative.context,`escapeRealityText('<img src=x onerror=alert(1)>A&B</img>')`),
    "&lt;img src=x onerror=alert(1)&gt;A&amp;B&lt;/img&gt;","scope text is not escaped before entering the drawer");
  assert.equal(value(creative.context,`escapeRealityHierarchy('<img src=x><br>Agency → client')`),
    "&lt;img src=x&gt;<br>Agency → client","scope hierarchy did not escape content while preserving its authored line break");
}

// A model-v3 checkpoint cannot silently cross the business boundary chosen at setup. Every
// starter must keep its required capabilities, every client collection must use an allowed
// channel and the no-client holding-company origin must remain a no-client business.
{
  const fixtures={
    digital_agency:makeContext("?mode=6&budget=250000&seed=16121&agencyType=digital_agency"),
    creative_agency:makeContext("?mode=6&budget=250000&seed=16121&agencyType=creative_agency"),
    holding_company:makeContext("?mode=6&budget=250000&seed=16121&agencyType=holding_company")
  };
  for(const [agencyType,fixture] of Object.entries(fixtures)){
    const required=JSON.parse(value(fixture.context,`JSON.stringify(AGENCY_STARTER_MODELS[${JSON.stringify(agencyType)}].startingUnlocks)`));
    for(const unlock of required){
      const malformed=JSON.parse(value(fixture.context,"JSON.stringify(AgencyCareer.export())"));
      malformed.unlocked=malformed.unlocked.filter(id=>id!==unlock);fixture.context.__candidate=malformed;
      assert.equal(value(fixture.context,"AgencyCareer.validate(__candidate)"),false,
        `${agencyType} validation accepted a checkpoint missing required starter capability ${unlock}`);
    }
  }

  for(const [agencyType,forbidden] of [["digital_agency","cable"],["creative_agency","search"]]){
    const fixture=fixtures[agencyType],baseline=JSON.parse(value(fixture.context,"JSON.stringify(AgencyCareer.export())")),source=baseline.clients[0];
    for(const collection of ["clients","prospects","archivedClients"]){
      const malformed=JSON.parse(JSON.stringify(baseline)),client={...source,channel:forbidden};
      if(collection==="clients")malformed.clients=[client];
      else if(collection==="prospects")malformed.prospects=[{...client,id:"lead-forbidden-channel",status:"prospect",onboarding:1000,fit:1,expiresMonth:1}];
      else malformed.archivedClients=[{...client,id:"archive-forbidden-channel",status:"churned"}];
      fixture.context.__candidate=malformed;
      assert.equal(value(fixture.context,"AgencyCareer.validate(__candidate)"),false,
        `${agencyType} validation accepted ${forbidden} in ${collection}`);
    }
  }

  const holding=fixtures.holding_company,digitalClient=JSON.parse(value(fixtures.digital_agency.context,"JSON.stringify(S.clients[0])")),
    holdingBaseline=JSON.parse(value(holding.context,"JSON.stringify(AgencyCareer.export())"));
  for(const collection of ["clients","prospects"]){
    const malformed=JSON.parse(JSON.stringify(holdingBaseline));
    if(collection==="clients")malformed.clients=[digitalClient];
    else malformed.prospects=[{...digitalClient,id:"lead-clientless-model",status:"prospect",onboarding:1000,fit:1,expiresMonth:1}];
    holding.context.__candidate=malformed;
    assert.equal(value(holding.context,"AgencyCareer.validate(__candidate)"),false,
      `holding-company validation accepted a ${collection==="clients"?"client":"prospect"}`);
  }

  const creative=fixtures.creative_agency;
  assert.equal(value(creative.context,"AgencyCareer.canUnlock('automation').ok"),false,
    "creative agency exposed paid-search bidding automation");
  vm.runInContext(`S.month=84;S.day=1681;S.dayInMonth=1;S.level=20;S.skillPoints=20;S.cash=1000000;
    S.unlocked.push("agency_os","creative_automation")`,creative.context);
  assert.equal(value(creative.context,"AgencyCareer.canUnlock('predictive_ops').ok"),true,
    "creative agency's endgame operations path still depended on paid-search bidding automation");
  assert.equal(value(creative.context,"AgencyCareer.unlock('predictive_ops',{render:false})"),true);
  assert(state(creative.context).unlocked.includes("predictive_ops")&&!state(creative.context).unlocked.includes("automation"));
}

// A holding-company origin draws three distinct owned offers, and the owned portfolio itself
// changes across seeds instead of presenting the same disguised scenario every time.
{
  const profiles=new Set(),names=new Set();
  for(let seed=16120;seed<16136;seed++){
    const fixture=makeContext(`?mode=6&budget=250000&seed=${seed}&agencyType=holding_company`),funnels=state(fixture.context).affiliate.funnels;
    assert.equal(funnels.length,3,`holding-company seed ${seed} did not start with three owned funnels`);
    assert.equal(new Set(funnels.map(item=>item.verticalId)).size,3,`holding-company seed ${seed} duplicated an owned-offer identity`);
    profiles.add(funnels.map(item=>`${item.verticalId}:${item.name}`).join("|"));for(const funnel of funnels)names.add(funnel.name);
  }
  assert(profiles.size>=4,"holding-company origins did not produce meaningfully different three-offer portfolios across seeds");
  assert(names.size>=5,"holding-company origin randomization never reached the authored offer catalog");
}

// Client geography is seeded variety, not a permanent copy of the agency headquarters.
// A seed sample must produce both local and cross-time-zone relationships.
{
  const offices=new Set(),remoteZones=new Set();let localCount=0,remoteCount=0;
  for(let seed=16140;seed<16188;seed++){
    const fixture=makeContext(`?mode=6&budget=250000&seed=${seed}&hq=portland-or&agencyType=digital_agency`),client=state(fixture.context).clients[0];
    offices.add(client.officeId);
    if(client.accountTimezone==="America/Los_Angeles")localCount++;
    else{remoteCount++;remoteZones.add(client.accountTimezone);}
  }
  assert(localCount>0,"the seed sample never produced a same-time-zone client");
  assert(remoteCount>0&&remoteZones.size>=2,"the seed sample never produced meaningful cross-time-zone client coordination");
  assert(offices.size>=6,"client offices do not vary enough to support location-aware careers");
}

// Agency Career boots as a closed digital-agency loop by default and exposes auditable management mechanics.
{
  const {context,registry}=makeContext("?mode=6&budget=25000&seed=162"),s=state(context);
  assert.equal(s.engine,"agency-career");assert.equal(s.businessModel,"agency");
  assert.equal(s.agencyModelVersion,8);assert.equal(value(context,"AgencyCareer.modelVersion"),8);
  assert.deepEqual({...s.agencyIdentity},{name:"Moonrise Media",hqId:"portland-or",agencyType:"digital_agency"});
  assert.equal(s.day,1);assert.equal(s.month,0);assert.equal(s.dayInMonth,1);
  assert.equal(s.cash,25000);assert.equal(s.clients.length,1);assert.equal(s.prospects.length,0);
  assert.equal(s.clients[0].typeId,"smb_leadgen");assert.equal(s.clients[0].channel,"search");
  assert.equal(s.targetSeats,1);assert.deepEqual(Array.from(s.unlocked),["search_foundations"]);
  assert.equal(s.tutorialEnabled,false);assert.equal(s.tutorialStep,4);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
  assert.equal(value(context,"AgencyCareer.maxClients"),75);
  assert.equal(value(context,"AgencyCareer.totalDays"),2400);
  assert.equal(value(context,"AgencyCareer.profitTarget"),12000000);
  assert.deepEqual(Array.from(value(context,"Array.from({length:12},(_,i)=>AgencyCareer.desiredSeatsForMonth(i+1))")),
    [1,2,5,8,11,15,17,19,22,24,27,30]);
  assert.match(registry.strip.innerHTML,/2017/i);
  assert(registry.slots.innerHTML.includes(s.clients[0].name),"the seed-specific founding client was not rendered");
  assert.match(registry.pipeBox.innerHTML,/Agentic account workbench/);
  assert.match(registry.pipeBox.innerHTML,/Low-orbit satellite failover/);
  assert.match(registry.pipeBox.innerHTML,/one-time setup/);
  assert.match(registry.pipeBox.innerHTML,/recurring obligation/);
  assert.match(registry.pipeBox.innerHTML,/Choose an operating strategy, not a shopping list/);
  for(const method of ["runDay","operate","acceptProspect","hire","unlock","canPivot","pivot","validate","export","hydrate",
    "monthlyOperatingCost","monthlyOperatingStatement","cashRunway","liquidityStatus","capabilityInvestment","capabilityMonthlyCosts","continuityCapacity"])
    assert.equal(value(context,`typeof AgencyCareer[${JSON.stringify(method)}]`),"function",`Agency Career omitted ${method}()`);
  for(const field of ["agencyIdentity","tutorialEnabled","eraSeen","archivedClients","dayInMonth","monthVariableCosts","focusTotal","focusRemaining",
    "skillPoints","level","payrollMisses","targetSeats","monthCostLedger","monthStaffDays","staffAccruedThrough","lastOperatingStatement","lastSettlementId",
    "unpaidOperatingBalance","insolvencyCause"])
    assert.equal(value(context,`(()=>{const bad=AgencyCareer.export();delete bad[${JSON.stringify(field)}];return AgencyCareer.validate(bad)})()`),false,
      `career validation accepted a checkpoint missing ${field}`);
  assert.equal(value(context,"(()=>{const bad=AgencyCareer.export();delete bad.clients[0].history;return AgencyCareer.validate(bad)})()"),false,
    "career validation accepted a client that would crash the daily history writer");
  for(const field of ["offerId","officeId","marketScope","targetStates","accountTimezone","adConceptId","adFormat","adCopy","creativeVersion","customer","stakes","customerValue"])
    assert.equal(value(context,`(()=>{const bad=AgencyCareer.export();delete bad.clients[0][${JSON.stringify(field)}];return AgencyCareer.validate(bad)})()`),false,
      `career validation accepted a client missing ${field}`);
  for(const field of ["liquidityWarnings","operatingInsolvencies"])
    assert.equal(value(context,`(()=>{const bad=AgencyCareer.export();delete bad.telemetry[${JSON.stringify(field)}];return AgencyCareer.validate(bad)})()`),false,
      `career validation accepted missing ${field} telemetry`);
}

// Every client card describes the actual business, customer, market and live ad. Geographic
// workload and outcome modifiers are deterministic, bounded and visible before the player acts.
{
  const fixture=makeContext("?mode=6&budget=250000&seed=1621&agencyName=Moonrise%20Works&hq=portland-or&agencyType=digital_agency"),
    client=state(fixture.context).clients[0],offer=JSON.parse(value(fixture.context,`JSON.stringify(AGENCY_OFFERS.find(item=>item.id===S.clients[0].offerId))`)),
    concept=JSON.parse(value(fixture.context,`JSON.stringify(AGENCY_AD_CONCEPTS.find(item=>item.id===S.clients[0].adConceptId))`)),
    office=JSON.parse(value(fixture.context,`JSON.stringify(AGENCY_HQ_LOCATIONS.find(item=>item.id===S.clients[0].officeId))`));
  for(const field of ["offerId","customer","stakes","officeId","marketScope","targetStates","accountTimezone","adConceptId","adFormat","adCopy","creativeVersion","customerValue"])
    assert(client[field]!==undefined&&client[field]!==null&&client[field]!=="",`founding client omitted ${field}`);
  assert(Array.isArray(client.targetStates)&&client.targetStates.length,"founding client has no service territory");
  assert(offer&&concept&&office,"founding client points to a missing offer, ad concept or office");
  assert(client.customer.length>30&&client.stakes.length>30&&client.adCopy.length>30,"founding-client business context is too thin");
  const card=fixture.registry.slots.innerHTML;
  /* The card answers a media buyer's questions. It must NOT be a glossary dump or a lecture
     about why the vertical matters — that prose was removed deliberately (2026-08-09). */
  for(const visible of [offer.label,client.customer,office.city,concept.label])
    assert(card.includes(visible.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))||card.includes(visible),
      `client card hides required business context: ${visible}`);
  assert.match(card,/They can serve|service (?:area|territory)|target state/i,"client card does not say where the client can operate");
  assert.match(card,/Worth to them/i,"client card does not say what one outcome is worth to the client");
  assert.match(card,/keep cost per outcome under/i,"client card does not give the buyer a cost target");
  assert.match(card,/Buy media for this campaign/i,"the media buying board is not on the client card");
  assert.doesNotMatch(card,/Why this business matters/i,"the philosophy lecture returned to the client card");
  assert.doesNotMatch(card,/To The Moon's 0.100 operating-health score/i,"glossary definitions were pasted back into the client card");

  const local=makeContext("?mode=6&budget=250000&seed=1622&hq=portland-or&agencyType=digital_agency"),
    remote=makeContext("?mode=6&budget=250000&seed=1622&hq=portland-or&agencyType=digital_agency");
  vm.runInContext(`Object.assign(S.clients[0],{officeId:"portland-or",accountTimezone:"America/Los_Angeles",marketScope:"local",targetStates:["OR"],incident:null,nextDue:999})`,local.context);
  vm.runInContext(`Object.assign(S.clients[0],{officeId:"new-york-ny",accountTimezone:"America/New_York",marketScope:"regional",targetStates:["NY","NJ","CT","PA","MA","RI","VT","NH","ME"],incident:null,nextDue:999});AgencyCareer.render()`,remote.context);
  const localUpdate=value(local.context,"AgencyCareer.operate(S.clients[0].id,'update',{render:false}).cost"),
    remoteUpdate=value(remote.context,"AgencyCareer.operate(S.clients[0].id,'update',{render:false}).cost");
  assert.equal(remoteUpdate-localUpdate,1,"a three-zone client coordination difference did not add exactly one bounded focus unit");
  const narrowCost=value(local.context,"AgencyCareer.serviceCost(S.clients[0])"),wideCost=value(remote.context,"AgencyCareer.serviceCost(S.clients[0])");
  assert(wideCost>=narrowCost&&wideCost-narrowCost<=1,"multi-state targeting added an unbounded routine-service penalty");
  const remoteCard=remote.registry.slots.innerHTML;
  assert.match(remoteCard,/3 (?:hour|time-zone)|three time zones|three-hour/i,"remote-client card hides the time-zone coordination modifier");
  assert.match(remoteCard,/9 (?:target )?states|nine (?:target )?states|multi-state/i,"remote-client card hides the target-breadth modifier");
  vm.runInContext("AgencyCareer.runDay({force:true})",local.context);vm.runInContext("AgencyCareer.runDay({force:true})",remote.context);
  const ratio=state(remote.context).clients[0].clientModeledValue/state(local.context).clients[0].clientModeledValue;
  assert(ratio>=.93&&ratio<=1,"the broad-target outcome modifier is not a modest, bounded modeling effect");
}

// The same seed and origin replay exactly. Changing headquarters changes geography and operating
// costs without rerolling the client's business; choosing a different starter changes the business itself.
{
  const query="?mode=6&budget=250000&seed=1623&agencyName=North%20Window&hq=portland-or&agencyType=digital_agency",
    first=makeContext(query),repeat=makeContext(query),east=makeContext(query.replace("portland-or","new-york-ny")),creative=makeContext(query.replace("digital_agency","creative_agency"));
  assert.equal(value(first.context,"JSON.stringify(S)"),value(repeat.context,"JSON.stringify(S)"),"same seed and agency origin did not replay exactly");
  const stripLocation=client=>{const copy=JSON.parse(JSON.stringify(client));for(const field of ["officeId","targetStates","accountTimezone"])delete copy[field];return copy;};
  assert.deepEqual(stripLocation(state(first.context).clients[0]),stripLocation(state(east.context).clients[0]),
    "changing headquarters rerolled the founding client's unrelated business facts");
  assert.notEqual(state(first.context).clients[0].officeId,state(east.context).clients[0].officeId);
  assert.notEqual(value(first.context,"AgencyCareer.monthlyOperatingCost().categories.facilitiesAdministration"),
    value(east.context,"AgencyCareer.monthlyOperatingCost().categories.facilitiesAdministration"),"headquarters did not change the visible company cost base");
  assert.notEqual(state(first.context).agencyIdentity.agencyType,state(creative.context).agencyIdentity.agencyType);
  assert.notDeepEqual(Array.from(state(first.context).unlocked),Array.from(state(creative.context).unlocked));
  assert.notEqual(state(first.context).clients[0].channel,state(creative.context).clients[0].channel);
}

// Guided starts teach the selected business model. Turning tutorials off removes the scripted
// controls without changing the initialized business.
{
  const off=makeContext("?mode=6&seed=1624&agencyType=digital_agency"),digital=makeContext("?mode=6&seed=1624&agencyType=digital_agency&guided=1"),
    creative=makeContext("?mode=6&seed=1624&agencyType=creative_agency&guided=1"),holding=makeContext("?mode=6&seed=1624&agencyType=holding_company&guided=1");
  assert.equal(state(off.context).tutorialEnabled,false);assert.equal(state(off.context).tutorialStep,4);
  assert.doesNotMatch(off.registry.slots.innerHTML,/Guided start/);
  for(const fixture of [digital,creative,holding]){assert.equal(state(fixture.context).tutorialEnabled,true);assert.equal(state(fixture.context).tutorialStep,0);}
  value(digital.context,"AgencyCareer.activateGuidedRecommendation()");assert.match(digital.registry.slots.innerHTML,/Complete the first account task|Service the account/);
  assert(value(digital.context,"AgencyCareer.operate('client-001','service',{render:false})"));assert.equal(state(digital.context).tutorialStep,2);
  value(creative.context,"AgencyCareer.activateGuidedRecommendation()");assert.match(creative.registry.slots.innerHTML,/Revise the first ad|Revise the founding ad/);
  assert(value(creative.context,"AgencyCareer.operate('client-001','refresh',{render:false})"));assert.equal(state(creative.context).tutorialStep,2);
  value(holding.context,"AgencyCareer.activateGuidedRecommendation()");assert.match(holding.registry.slots.innerHTML,/Audit one funnel's signal/);
  assert.equal(value(holding.context,"AgencyCareer.affiliateAction('funnel-1','audit',{render:false})"),true);assert.equal(state(holding.context).tutorialStep,2);
}

// Players can end the Agency Career walkthrough from either the guide itself or the main
// menu. Both routes release nonrecommended controls, and the resulting step-4 state survives
// the browser checkpoint path instead of restarting the coach on reload.
{
  const key="ttm.save.general.mode-6.v3",localStore=new Map(),
    fixture=makeContext("?mode=6&budget=250000&seed=16241&agencyType=digital_agency&guided=1&autostart=1&brief=1",{localStore}),
    action=(name)=>fixture.registry.slots.querySelectorAll("button[data-agency-action]")
      .find(button=>button.dataset.client==="client-001"&&button.dataset.agencyAction===name);
  finishRunOpening(fixture);assert.equal(fixture.registry.overlay.innerHTML,"");
  const blocked=action("audit");assert(blocked&&blocked.disabled,"the guided opening did not initially lock an off-script account action");
  const exit=fixture.registry.slots.querySelectorAll("button[data-agency-tutorial]")
    .find(button=>button.dataset.agencyTutorial==="disable");
  assert(exit&&typeof exit.onclick==="function","the visible End walkthrough control was not bound");exit.onclick();
  assert.equal(state(fixture.context).tutorialEnabled,false);assert.equal(state(fixture.context).tutorialStep,4);
  assert.doesNotMatch(fixture.registry.slots.innerHTML,/Guided start|End walkthrough/);
  assert.equal(action("audit").disabled,false,"ending the walkthrough from its guide left unrelated account actions locked");
  assert.equal(value(fixture.context,"saveGame('agency-guide-ended',false)"),true);
  const saved=JSON.parse(localStore.get(key));assert.equal(saved.source,"agency-guide-ended");assert.equal(saved.state.tutorialEnabled,false);assert.equal(saved.state.tutorialStep,4);
  const resumed=makeContext("?mode=6&budget=250000&seed=16241&agencyType=digital_agency&resume=1",{localStore});
  assert.equal(state(resumed.context).tutorialEnabled,false);assert.equal(state(resumed.context).tutorialStep,4);
}
{
  const key="ttm.save.general.mode-6.v3",localStore=new Map(),
    fixture=makeContext("?mode=6&budget=250000&seed=16242&agencyType=digital_agency&guided=1&autostart=1&brief=1",{localStore}),
    action=(name)=>fixture.registry.slots.querySelectorAll("button[data-agency-action]")
      .find(button=>button.dataset.client==="client-001"&&button.dataset.agencyAction===name);
  finishRunOpening(fixture);assert.equal(fixture.registry.overlay.innerHTML,"");clickUi(fixture,fixture.registry.menuBtn);
  assert.match(fixture.registry.overlay.innerHTML,/Current guided start/);assert.match(fixture.registry.overlay.innerHTML,/end the walkthrough and unlock every action/i);
  assert.equal(fixture.registry.tutorialToggle.getAttribute("aria-checked"),"true");assert(action("audit")?.disabled);
  fixture.registry.tutorialToggle.onclick();
  assert.equal(state(fixture.context).tutorialEnabled,false);assert.equal(state(fixture.context).tutorialStep,4);
  assert.match(fixture.registry.overlay.innerHTML,/Guided start for new runs/);assert.equal(fixture.registry.tutorialToggle.getAttribute("aria-checked"),"false");
  const saved=JSON.parse(localStore.get(key));assert(saved,"the main-menu tutorial switch did not checkpoint the changed career");
  assert.equal(saved.source,"agency-tutorial-ended");assert.equal(saved.state.tutorialEnabled,false);assert.equal(saved.state.tutorialStep,4);
  fixture.registry.continueRun.onclick();
  assert.equal(action("audit").disabled,false,"the main-menu walkthrough switch left unrelated account actions visibly locked");
  const resumed=makeContext("?mode=6&budget=250000&seed=16242&agencyType=digital_agency&resume=1",{localStore});
  assert.equal(state(resumed.context).tutorialEnabled,false);assert.equal(state(resumed.context).tutorialStep,4);
}

// Neglect can lose the closed-loop founding challenge; competent service opens Month 2 without accepting anybody automatically.
{
  const neglected=makeContext("?mode=6&budget=25000&seed=1630");
  for(let day=0;day<20;day++)vm.runInContext("AgencyCareer.runDay({force:true})",neglected.context);
  assert.equal(state(neglected.context).ended,true);assert.equal(state(neglected.context).outcome,"founding-client-lost");
  assert.equal(state(neglected.context).clients.length,0);assert.equal(state(neglected.context).prospects.length,0);

  const {context}=makeContext("?mode=6&budget=25000&seed=163");
  for(let day=0;day<20;day++)vm.runInContext(`(()=>{const client=S.clients[0],response={quality:"service",auction:"service",tracking:"audit",policy:"audit",creative:"refresh",stakeholder:"update"};
    if(client.incident)AgencyCareer.operate(client.id,response[client.incident.id]||"service",{render:false});
    if(S.day>=client.nextDue)AgencyCareer.operate(client.id,"service",{render:false});return AgencyCareer.runDay({force:true})})()`,context);
  const s=state(context);assert.equal(s.month,1);assert.equal(s.day,21);assert.equal(s.targetSeats,2);
  assert.equal(s.ended,false);assert.equal(s.outcome,null);
  assert.equal(s.clients.length,1);assert(s.prospects.length>=3,"Month 2 did not offer enough SMB prospective clients");
  assert(s.prospects.every(lead=>lead.typeId==="smb_leadgen"),"Month 2 offered a prospective client outside the promised SMB lead-generation foundation");
  assert.equal(s.skillPoints,2);assert.equal(s.monthlyHistory.length,1);
  const first=s.prospects[0],cashBefore=s.cash,accepted=value(context,`AgencyCareer.acceptProspect(${JSON.stringify(first.id)},{render:false})`);
  assert(accepted&&accepted.status==="active");assert.equal(s.clients.length,2);assert(s.cash<cashBefore);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}

// Staffing changes preserve already-spent focus: hiring adds only new capacity and releasing cannot refill the day.
{
  const {context}=makeContext("?mode=6&budget=25000&seed=1631");
  const service=value(context,"AgencyCareer.operate(S.clients[0].id,'service',{render:false})"),spent=service.cost;
  assert.equal(state(context).focusTotal,8);assert.equal(state(context).focusRemaining,8-spent);
  assert.equal(value(context,"AgencyCareer.hire('buyer',{render:false})"),true);
  assert.equal(state(context).focusTotal,16);assert.equal(state(context).focusRemaining,16-spent,
    "hiring restored capacity that had already been consumed");
  assert.equal(value(context,"AgencyCareer.releaseStaff('buyer',{render:false})"),true);
  assert.equal(state(context).focusTotal,8);assert.equal(state(context).focusRemaining,8-spent,
    "releasing a role refilled the current workday");
}

// Public hiring controls cannot create a staff count rejected by save validation.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1632");
  vm.runInContext("S.staff.buyer=100;S.cash=100000000",context);const before=value(context,"JSON.stringify(S)");
  assert.equal(value(context,"AgencyCareer.hire('buyer',{render:false})"),false);
  assert.equal(value(context,"JSON.stringify(S)"),before);assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}

// Client-funded media volume is operational evidence, never agency revenue, cost, or profit.
{
  const a=makeContext("?mode=6&budget=25000&seed=164"),b=makeContext("?mode=6&budget=25000&seed=164");
  vm.runInContext("S.clients[0].mediaBudget=100000000",b.context);
  for(let day=0;day<20;day++){
    for(const fixture of [a,b])vm.runInContext(`(()=>{const client=S.clients[0],response={quality:"service",auction:"service",tracking:"audit",policy:"audit",creative:"refresh",stakeholder:"update"};
      if(client.incident)AgencyCareer.operate(client.id,response[client.incident.id]||"service",{render:false});
      if(S.day>=client.nextDue)AgencyCareer.operate(client.id,"service",{render:false});return AgencyCareer.runDay({force:true})})()`,fixture.context);
  }
  const normal=state(a.context).monthlyHistory[0],huge=state(b.context).monthlyHistory[0];
  assert(huge.clientMediaSpend>normal.clientMediaSpend*1000,"media-budget fixture did not change client-funded delivery");
  approx(huge.revenue,normal.revenue,1e-6,"client media spend leaked into agency revenue");
  approx(huge.costs,normal.costs,1e-6,"client media spend leaked into agency costs");
  approx(huge.profit,normal.profit,1e-6,"client media spend leaked into agency profit");
  approx(huge.profit,huge.revenue-huge.costs,1e-6,"agency month ledger does not reconcile");
}

// Campaign-plan mechanics (model v5): platforms differ economically, pacing is a real tradeoff,
// organic service lines bill at close and decay when unworked, and business development and
// prospect interviews are real actions. Client media volume still never moves agency revenue.
{
  const {context}=makeContext("?mode=6&budget=25000&seed=1661");
  // Platform switching: Microsoft prices clicks lower against a much smaller demand pool.
  const client=state(context).clients[0];
  assert.equal(client.platform,"google_search");assert.equal(client.pacing,"steady");
  assert.equal(value(context,"AgencyCareer.switchClientPlatform(S.clients[0].id,'microsoft_search',{render:false})"),true);
  assert.equal(state(context).clients[0].platform,"microsoft_search");
  assert.equal(value(context,"AgencyCareer.switchClientPlatform(S.clients[0].id,'linkedin_ads',{render:false})"),false,
    "a search client crossed channels onto LinkedIn");
  assert.equal(value(context,"AgencyCareer.switchClientPlatform(S.clients[0].id,'assistant_placements',{render:false})"),false,
    "assistant placements were purchasable in 2017 without the capability");
  const fit=JSON.parse(value(context,`JSON.stringify({
    microsoft:AgencyCareer.platformFitM(S.clients[0]),
    google:AgencyCareer.platformFitM({...S.clients[0],platform:"google_search"}),
    linkedinB2B:AgencyCareer.platformFitM({...S.clients[0],channel:"social",platform:"linkedin_ads",vertical:"b2b-software"}),
    linkedinConsumer:AgencyCareer.platformFitM({...S.clients[0],channel:"social",platform:"linkedin_ads",vertical:"apparel"})})`));
  assert(fit.microsoft>fit.google,"Microsoft's cheaper clicks did not price into the outcome index");
  assert(fit.linkedinB2B>1&&fit.linkedinConsumer<1,"LinkedIn did not flip between a B2B bonus and a consumer penalty");
  // Pacing changes are free decisions with real consequences wired into the simulation.
  assert.equal(value(context,"AgencyCareer.setClientPacing(S.clients[0].id,'aggressive',{render:false})"),true);
  assert.equal(state(context).clients[0].pacing,"aggressive");
  assert.equal(value(context,"AgencyCareer.validate(S)"),true,"campaign-plan fields broke save validation");
}
{
  // Service lines: open, work, bill at month close, decay daily; upkeep enters the statement.
  const {context}=makeContext("?mode=6&budget=250000&seed=1662");
  assert.equal(value(context,"AgencyCareer.serviceLinesForModel(S).map(line=>line.id).join(',')"),"seo,webdev,aieo",
    "the digital agency lost its SEO / web development / AIEO service ladder");
  assert.equal(value(context,"AgencyCareer.canStartServiceLine('aieo',S).ok"),false,"AIEO/GEO opened before 2025");
  assert.equal(value(context,"AgencyCareer.canStartServiceLine('pr_strategy',S).ok"),false,"a digital agency opened a creative-agency PR line");
  const beforeSoftware=value(context,"AgencyCareer.monthlyOperatingCost(S).categories.softwareSubscriptions");
  assert.equal(value(context,"AgencyCareer.startServiceLine('seo',{render:false})"),true);
  assert(value(context,"AgencyCareer.monthlyOperatingCost(S).categories.softwareSubscriptions")>beforeSoftware,
    "an active service line added no upkeep to the operating statement");
  const momentum=state(context).services.seo.momentum;
  assert.equal(value(context,"AgencyCareer.workServiceLine('seo',{render:false})"),true);
  assert(state(context).services.seo.momentum>momentum,"working the line did not raise momentum");
  const worked=state(context).services.seo.momentum;
  vm.runInContext("AgencyCareer.runDay({force:true})",context);
  assert(state(context).services.seo.momentum<worked,"momentum did not decay across a workday");
  vm.runInContext("for(let d=0;d<19;d++)AgencyCareer.runDay({force:true})",context);
  const closed=state(context).monthlyHistory[0];
  assert(closed&&closed.organicRevenue>0,"the service line billed nothing at month close");
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}
{
  // The campaign results loop: every workday writes one readable row per client (spend,
  // outcomes, day index, platform mix), plan changes mark the day they land, the ring stays
  // bounded and serializable, and the card surfaces the numbers instead of burying them.
  const {context,registry}=makeContext("?mode=6&budget=25000&seed=1666");
  assert.equal(state(context).clients[0].campaignHistory.length,0);
  assert.match(registry.slots.innerHTML,/Campaign results/);
  assert.match(registry.slots.innerHTML,/No delivery yet/);
  vm.runInContext("AgencyCareer.operate(S.clients[0].id,'service',{render:false});AgencyCareer.runDay({force:true})",context);
  const firstRow=state(context).clients[0].campaignHistory[0];
  assert(firstRow&&firstRow.day===1&&firstRow.spend>0&&firstRow.leads>0&&Number.isFinite(firstRow.index),
    "the first workday did not write a readable campaign row");
  assert.equal(firstRow.changed,false);assert.equal(firstRow.share,0);
  vm.runInContext("AgencyCareer.switchClientPlatform(S.clients[0].id,'microsoft_search',{render:false});AgencyCareer.runDay({force:true})",context);
  const changedRow=state(context).clients[0].campaignHistory.at(-1);
  assert.equal(changedRow.changed,true,"a platform move did not mark that day's campaign row");
  assert.match(registry.slots.innerHTML,/plan changed/,"the results table did not surface the plan change");
  vm.runInContext("AgencyCareer.adjustMediaSplit(S.clients[0].id,'google_search','add',{render:false});AgencyCareer.runDay({force:true})",context);
  const splitRow=state(context).clients[0].campaignHistory.at(-1);
  assert.equal(splitRow.share,10);assert.equal(splitRow.secondary,"google_search");
  for(let d=0;d<12;d++)vm.runInContext("AgencyCareer.operate(S.clients[0].id,'service',{render:false});AgencyCareer.runDay({force:true})",context);
  assert(state(context).clients[0].campaignHistory.length<=10,"the campaign results ring is unbounded");
  assert.match(registry.slots.innerHTML,/Campaign results/);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true,"the campaign results ring broke save validation");
}
{
  // Buying doctrines: family/year/tech gates hold, switching costs focus and a settling dip,
  // and each doctrine's economics actually differ — the strategy layer is real, not a label.
  const {context}=makeContext("?mode=6&budget=25000&seed=1668");
  assert.equal(state(context).clients[0].strategy,"balanced");
  assert.equal(value(context,"AgencyCareer.strategyAvailable('creative_engine',S.clients[0],S).ok"),false,
    "a search client ran the interruption-family creative engine");
  assert.equal(value(context,"AgencyCareer.strategyAvailable('broad_automation',S.clients[0],S).ok"),false,
    "broad automation was available before 2019");
  assert.equal(value(context,"AgencyCareer.strategyAvailable('bottom_funnel',S.clients[0],S).ok"),false,
    "retargeting ran without the measurement capability");
  assert.equal(value(context,"AgencyCareer.strategyAvailable('intent_harvest',S.clients[0],S).ok"),true);
  const focusBefore=state(context).focusRemaining;
  assert.equal(value(context,"AgencyCareer.setClientStrategy(S.clients[0].id,'intent_harvest',{render:false})"),true);
  assert.equal(state(context).focusRemaining,focusBefore-1);
  assert.equal(state(context).clients[0].strategy,"intent_harvest");
  assert.equal(value(context,"AgencyCareer.setClientStrategy(S.clients[0].id,'creative_engine',{render:false})"),false,
    "the family gate did not hold at switch time");
  const econ=JSON.parse(value(context,`JSON.stringify({
    intent:AgencyCareer.strategyEconomics(S.clients[0],S),
    manual:AgencyCareer.strategyEconomics({...S.clients[0],strategy:"manual_precision"},S),
    balanced:AgencyCareer.strategyEconomics({...S.clients[0],strategy:"balanced"},S)})`));
  assert(econ.intent.volatility<econ.balanced.volatility&&econ.intent.capacity<1&&econ.intent.focus>1,
    "intent harvesting has no real tradeoff profile");
  assert(econ.manual.volatility<econ.balanced.volatility&&econ.manual.focus>econ.balanced.focus,
    "manual precision has no real tradeoff profile");
  // Automation's era dependence: strong in 2019+, starved in signal-loss years without first-party data.
  vm.runInContext("S.month=36",context);
  const automation2020=JSON.parse(value(context,'JSON.stringify(AgencyCareer.strategyEconomics({...S.clients[0],strategy:"broad_automation"},S))'));
  vm.runInContext("S.month=48",context);
  const automation2021=JSON.parse(value(context,'JSON.stringify(AgencyCareer.strategyEconomics({...S.clients[0],strategy:"broad_automation"},S))'));
  assert(automation2020.value>1&&automation2021.value<1,
    "broad automation ignored the signal-loss era");
  vm.runInContext("S.month=0",context);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true,"the doctrine layer broke save validation");
}
{
  // A v6 save (results ring, no doctrines) migrates forward onto the balanced doctrine.
  const {context}=makeContext("?mode=6&budget=25000&seed=1669");
  vm.runInContext(`globalThis.__legacyV6=AgencyCareer.export();__legacyV6.agencyModelVersion=6;
    __legacyV6.clients.forEach(client=>{delete client.strategy;});S=null`,context);
  assert.equal(value(context,"AgencyCareer.hydrate(__legacyV6)!==false"),true,"a v6 save failed to hydrate");
  assert.equal(state(context).agencyModelVersion,8);
  assert.equal(state(context).clients[0].strategy,"balanced");
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}
{
  // A v5 save (campaign plans, no results ring) migrates forward with an empty ring.
  const {context}=makeContext("?mode=6&budget=25000&seed=1667");
  vm.runInContext(`globalThis.__legacyV5=AgencyCareer.export();__legacyV5.agencyModelVersion=5;
    __legacyV5.clients.forEach(client=>{delete client.campaignHistory;delete client.planChangedDay;});S=null`,context);
  assert.equal(value(context,"AgencyCareer.hydrate(__legacyV5)!==false"),true,"a v5 save failed to hydrate");
  const repaired=state(context);
  assert.equal(repaired.agencyModelVersion,8);
  assert.equal(repaired.clients[0].campaignHistory.length,0);
  assert.equal(repaired.clients[0].planChangedDay,0);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}
{
  // The allocation board: a client's media can split between platforms in bounded 10% steps,
  // blending efficiency by share while each lane's capacity absorbs only its own allocation.
  const {context}=makeContext("?mode=6&budget=25000&seed=1665");
  assert.equal(state(context).clients[0].secondaryShare,0);
  assert.equal(value(context,"AgencyCareer.adjustMediaSplit(S.clients[0].id,'microsoft_search','add',{render:false})"),true);
  assert.equal(state(context).clients[0].secondaryPlatformId,"microsoft_search");
  assert.equal(state(context).clients[0].secondaryShare,10);
  const blended=value(context,"AgencyCareer.platformFitM(S.clients[0])"),
    google=value(context,"AgencyCareer.platformFitM({...S.clients[0],secondaryPlatformId:null,secondaryShare:0})"),
    microsoft=value(context,"AgencyCareer.platformFitM({...S.clients[0],platform:'microsoft_search',secondaryPlatformId:null,secondaryShare:0})");
  assert(blended>google&&blended<microsoft,"a 10% split did not blend the two platforms' economics");
  for(let i=0;i<6;i++)vm.runInContext("AgencyCareer.adjustMediaSplit(S.clients[0].id,'microsoft_search','add',{render:false})",context);
  assert.equal(state(context).clients[0].secondaryShare,50,"the split exceeded its 50% secondary ceiling");
  assert.equal(value(context,"AgencyCareer.adjustMediaSplit(S.clients[0].id,'google_search','add',{render:false})"),false,
    "media routed to the primary platform as if it were a secondary lane");
  assert.equal(value(context,"AgencyCareer.adjustMediaSplit(S.clients[0].id,'linkedin_ads','add',{render:false})"),false,
    "a search client split media onto a social platform");
  vm.runInContext("AgencyCareer.adjustMediaSplit(S.clients[0].id,'microsoft_search','cut',{render:false})",context);
  assert.equal(state(context).clients[0].secondaryShare,40);
  // Promoting the secondary to primary clears the split instead of leaving primary === secondary.
  assert.equal(value(context,"AgencyCareer.switchClientPlatform(S.clients[0].id,'microsoft_search',{render:false})"),true);
  assert.equal(state(context).clients[0].secondaryPlatformId,null);
  assert.equal(state(context).clients[0].secondaryShare,0);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true,"the media split broke save validation");
}
{
  // Business development and prospect interviews are bounded, deterministic actions.
  const {context}=makeContext("?mode=6&budget=250000&seed=1663");
  assert.equal(value(context,"AgencyCareer.developBusiness({render:false})"),true);
  assert.equal(state(context).bizDevPoints,1);
  vm.runInContext("S.bizDevPoints=6",context);
  assert.equal(value(context,"AgencyCareer.developBusiness({render:false})"),false,"business development exceeded its monthly cap");
  vm.runInContext("S.month=1;AgencyCareer.generateProspects(S,3)",context);
  const lead=state(context).prospects[0];
  assert(lead&&!lead.interviewed);
  assert.equal(value(context,"AgencyCareer.interviewProspect(S.prospects[0].id,{render:false})"),true);
  assert.equal(state(context).prospects[0].interviewed,true);
  assert.equal(value(context,"AgencyCareer.interviewProspect(S.prospects[0].id,{render:false})"),false,"one prospect was interviewed twice");
}
{
  // A v4 save migrates: clients gain platform/pacing defaults, services and bizDevPoints appear.
  const {context}=makeContext("?mode=6&budget=25000&seed=1664");
  vm.runInContext(`globalThis.__legacyV4=AgencyCareer.export();__legacyV4.agencyModelVersion=4;
    delete __legacyV4.services;delete __legacyV4.bizDevPoints;
    __legacyV4.clients.forEach(client=>{delete client.platform;delete client.pacing;});
    S=null`,context);
  assert.equal(value(context,"AgencyCareer.hydrate(__legacyV4)!==false"),true,"a v4 save failed to hydrate");
  const repaired=state(context);
  assert.equal(repaired.agencyModelVersion,8);
  assert.equal(repaired.clients[0].platform,"google_search");
  assert.equal(repaired.clients[0].pacing,"steady");
  assert.equal(Object.keys(repaired.services).length,0);assert.equal(repaired.bizDevPoints,0);
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}

// Each client keeps its own collection terms; an enterprise seat cannot delay every SMB invoice.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1641");
  vm.runInContext(`(()=>{const smb=S.clients[0],enterprise={...smb,id:"client-enterprise",name:"Cobalt Enterprise Services",
    typeId:"enterprise_leadgen",terms:45,fee:18000,createdMonth:0,createdDay:1,contractEndMonth:12,history:[]};
    smb.terms=15;S.clients=[smb,enterprise];S.month=1;S.day=40;S.dayInMonth=20;AgencyCareer.runDay({force:true})})()`,context);
  const invoices=state(context).receivables.filter(item=>item.kind==="agency");
  assert.equal(invoices.length,2);assert.deepEqual(Array.from(invoices,item=>item.dueDay).sort((a,b)=>a-b),[55,85]);
  approx(invoices.reduce((sum,item)=>sum+item.amount,0),state(context).monthlyHistory.at(-1).revenue,1e-6,
    "per-client invoices do not reconcile to recognized agency revenue");
}

// The seat ceiling is enforced by the acceptance mechanic rather than being display-only.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=165");
  vm.runInContext(`(()=>{const base=S.clients[0];S.clients=Array.from({length:75},(_,i)=>({...base,id:"client-cap-"+i,status:"active"}));
    S.month=1;S.targetSeats=75;S.cash=100000000;S.focusTotal=100;S.focusRemaining=100;AgencyCareer.generateProspects(S,1)})()`,context);
  assert.equal(state(context).clients.length,75);assert.equal(state(context).prospects.length,1);
  assert.equal(value(context,"AgencyCareer.acceptProspect(S.prospects[0].id,{render:false})"),false);
  assert.equal(state(context).clients.length,75);assert.equal(value(context,"AgencyCareer.validate(S)"),true);
}

// Seeded career turns are isolated from rendering and remain bit-for-bit reproducible.
{
  const a=makeContext("?mode=6&seed=166&flavor=jrpg"),b=makeContext("?mode=6&seed=166&flavor=jrpg");
  vm.runInContext("AgencyCareer.operate(S.clients[0].id,'service',{render:false});AgencyCareer.runDay({force:true})",a.context);
  vm.runInContext("AgencyCareer.operate(S.clients[0].id,'service',{render:false});AgencyCareer.runDay({force:true})",b.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),value(b.context,"JSON.stringify(S)"));
  const before=value(a.context,"JSON.stringify(S)");vm.runInContext("render();render();AgencyCareer.export()",a.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),before,"career rendering or export consumed simulation state");
}

// The month-close operating statement is a deterministic, once-only settlement rather than a render-side penalty.
{
  const a=makeContext("?mode=6&budget=250000&seed=1661"),b=makeContext("?mode=6&budget=250000&seed=1661");
  const first=runToNextAgencySettlement(a.context),second=runToNextAgencySettlement(b.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),value(b.context,"JSON.stringify(S)"),
    "same-seed Agency Career settlements diverged");
  assert.equal(JSON.stringify(first),JSON.stringify(second));
  assert.equal(first.settlementId,state(a.context).lastSettlementId);
  assert.equal(state(a.context).lastOperatingStatement.settlementId,first.settlementId);
  assert.equal(new Set(Array.from(state(a.context).monthlyHistory,month=>month.settlementId)).size,state(a.context).monthlyHistory.length,
    "a monthly operating settlement ID was reused");

  const before=value(a.context,"JSON.stringify({cash:S.cash,cumulativeCosts:S.cumulativeCosts,history:S.monthlyHistory,last:S.lastSettlementId,statement:S.lastOperatingStatement})");
  vm.runInContext("AgencyCareer.monthlyOperatingCost();AgencyCareer.monthlyOperatingStatement();AgencyCareer.cashRunway();AgencyCareer.liquidityStatus();render();AgencyCareer.export()",a.context);
  assert.equal(value(a.context,"JSON.stringify({cash:S.cash,cumulativeCosts:S.cumulativeCosts,history:S.monthlyHistory,last:S.lastSettlementId,statement:S.lastOperatingStatement})"),before,
    "reading or rendering the operating statement charged the month twice");
  const historyLength=state(a.context).monthlyHistory.length,costs=state(a.context).cumulativeCosts,settlement=state(a.context).lastSettlementId;
  assert.equal(runStableAgencyDay(a.context),true);
  assert.equal(state(a.context).monthlyHistory.length,historyLength,"a non-closing workday posted another monthly statement");
  approx(state(a.context).cumulativeCosts,costs,1e-6,"a non-closing workday reposted recurring operating costs");
  assert.equal(state(a.context).lastSettlementId,settlement);
}

// Every operating-cost category is auditable and the statement reconciles to the agency P&L.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1662");
  vm.runInContext("AgencyCareer.hire('buyer',{render:false});AgencyCareer.hire('analyst',{render:false});AgencyCareer.operate(S.clients[0].id,'audit',{render:false})",context);
  const month=runToNextAgencySettlement(context),categories={...month.expenseBreakdown};
  assert.deepEqual(Object.keys(categories).sort(),Array.from(value(context,"Object.keys(AGENCY_EXPENSE_CATEGORIES)")).sort(),
    "month-close statement omitted a defined operating-cost category");
  assert(Object.values(categories).every(amount=>Number.isFinite(amount)&&amount>=0),"operating statement contains an invalid category value");
  const categoryTotal=Object.values(categories).reduce((sum,amount)=>sum+amount,0);
  approx(categoryTotal,month.costs,1e-6,"operating-cost categories do not reconcile to total agency costs");
  approx(month.recurringOperatingCost+month.variableOperatingCost+(month.expenseBreakdown.ownedMedia||0),month.costs,1e-6,
    "recurring, variable and owned-media costs do not reconcile");
  approx(month.profit,month.revenue-month.costs,1e-6,"monthly agency profit does not reconcile");
  assert(month.expenseBreakdown.employeeWages>0&&month.expenseBreakdown.employerBenefits>0,
    "hired employees did not reach wages and employer-cost categories");
  assert(month.expenseBreakdown.equipmentReserve>0&&month.expenseBreakdown.teamChangesEquipment>0,
    "equipment upkeep or new-workstation setup was omitted");
  for(const key of ["infrastructureHosting","softwareSubscriptions","insuranceComplianceProfessional","facilitiesAdministration","eventsPartnershipsMarketing"])
    assert(categories[key]>0,`${key} is not represented as a real monthly obligation`);
}

// Recurring obligations grow with team and roster size, harder account mixes, and the passing era.
{
  const small=makeContext("?mode=6&budget=250000&seed=1663"),large=makeContext("?mode=6&budget=250000&seed=1663"),
    smb=makeContext("?mode=6&budget=250000&seed=1663"),enterprise=makeContext("?mode=6&budget=250000&seed=1663"),
    late=makeContext("?mode=6&budget=250000&seed=1663");
  vm.runInContext(`(()=>{const base=S.clients[0];S.clients=Array.from({length:12},(_,i)=>({...base,id:"scale-"+i,
    createdMonth:-1,status:"active",history:[]}));S.staff.buyer=3;S.staff.account=2;S.staff.ops=1})()`,large.context);
  vm.runInContext(`(()=>{const base=S.clients[0];S.clients=Array.from({length:6},(_,i)=>({...base,id:"smb-"+i,
    typeId:"smb_leadgen",createdMonth:-1,status:"active",history:[]}))})()`,smb.context);
  vm.runInContext(`(()=>{const base=S.clients[0];S.clients=Array.from({length:6},(_,i)=>({...base,id:"enterprise-"+i,
    typeId:"enterprise_commerce",createdMonth:-1,status:"active",history:[]}))})()`,enterprise.context);
  vm.runInContext("S.month=108;S.targetSeats=1",late.context);
  const baseCost=value(small.context,"AgencyCareer.monthlyOperatingCost()"),largeCost=value(large.context,"AgencyCareer.monthlyOperatingCost()"),
    smbCost=value(smb.context,"AgencyCareer.monthlyOperatingCost()"),enterpriseCost=value(enterprise.context,"AgencyCareer.monthlyOperatingCost()"),
    lateCost=value(late.context,"AgencyCareer.monthlyOperatingCost()");
  assert(largeCost.total>baseCost.total,"a larger roster and team did not increase company obligations");
  assert(largeCost.categories.employeeWages>baseCost.categories.employeeWages&&largeCost.categories.employerBenefits>baseCost.categories.employerBenefits,
    "added employees did not increase wages and employer burden");
  assert(enterpriseCost.total>smbCost.total,"enterprise-commerce work did not carry a larger company cost base than equal-sized SMB lead generation");
  assert(lateCost.total>baseCost.total&&lateCost.factor>baseCost.factor,"the 2026 cost base did not grow beyond the 2017 baseline");
}

// Employee obligations accrue by workday, so late firing cannot erase labor already used and late hiring is not retroactive.
{
  const released=makeContext("?mode=6&budget=1000000&seed=16631"),hired=makeContext("?mode=6&budget=1000000&seed=16632"),control=makeContext("?mode=6&budget=1000000&seed=16631");
  assert.equal(value(released.context,"AgencyCareer.hire('buyer',{render:false})"),true);
  for(let day=0;day<19;day++)assert.equal(runStableAgencyDay(released.context),true);
  assert.equal(state(released.context).dayInMonth,20);assert.equal(state(released.context).staffAccruedThrough,19);
  assert.equal(value(released.context,"AgencyCareer.releaseStaff('buyer',{render:false})"),true);
  const releasedMonth=runToNextAgencySettlement(released.context,1);
  const controlMonth=runToNextAgencySettlement(control.context);
  const fullWage=value(released.context,"AgencyCareer.staff.buyer.salary");
  approx(releasedMonth.expenseBreakdown.employeeWages,Math.round(fullWage*19/20/10)*10,1e-6,
    "releasing a buyer on the final day erased or overcharged accrued wages");
  approx(releasedMonth.expenseBreakdown.employerBenefits,Math.round(releasedMonth.expenseBreakdown.employeeWages*.30/10)*10,1e-6,
    "late staff release erased or mispriced accrued employer costs");
  for(const key of ["infrastructureHosting","equipmentReserve","softwareSubscriptions","insuranceComplianceProfessional","facilitiesAdministration"])
    assert(releasedMonth.expenseBreakdown[key]>controlMonth.expenseBreakdown[key],`${key} ignored 19 workdays of employee usage`);
  assert.equal(state(released.context).monthStaffDays.buyer,0,"the closed month's staff-day ledger was not reset");

  for(let day=0;day<19;day++)assert.equal(runStableAgencyDay(hired.context),true);
  assert.equal(value(hired.context,"AgencyCareer.hire('buyer',{render:false})"),true);
  const hiredMonth=runToNextAgencySettlement(hired.context,1);
  approx(hiredMonth.expenseBreakdown.employeeWages,Math.round(fullWage/20/10)*10,1e-6,
    "a final-day hire was charged a retroactive full month of wages");
  assert(hiredMonth.expenseBreakdown.employeeWages<releasedMonth.expenseBreakdown.employeeWages,
    "staff-day proration did not distinguish one day from 19 days");
}

// Paid events, partnerships and company marketing create a bounded, visible next-month lead-pipeline benefit.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=16633");
  runToNextAgencySettlement(context);
  const s=state(context),spend=s.lastOperatingStatement.categories.eventsPartnershipsMarketing;
  const gap=Math.max(0,s.targetSeats-s.clients.length),baseNeed=Math.min(12,gap+2);
  const organic=Math.max(1,Math.round(baseNeed*Math.max(.65,Math.min(1.15,.65+s.reputation*.005))));
  const supported=Math.max(0,Math.min(3,Math.floor(spend/250),Math.ceil(organic*.5)));
  assert(spend>0&&supported>0,"the business-development program had no funded pipeline capacity");
  assert.equal(s.prospects.length,organic+supported,"paid growth work did not add the promised prospective clients next month");
}

// Starting reserve changes runway, never the client's authorized media budget or delivery physics.
{
  const low=makeContext("?mode=6&budget=15000&seed=1664"),high=makeContext("?mode=6&budget=250000&seed=1664");
  assert.equal(state(low.context).startReserve,15000);assert.equal(state(high.context).startReserve,250000);
  assert.equal(state(low.context).clients[0].mediaBudget,state(high.context).clients[0].mediaBudget);
  assert.equal(value(low.context,"JSON.stringify(AgencyCareer.monthlyOperatingCost())"),value(high.context,"JSON.stringify(AgencyCareer.monthlyOperatingCost())"),
    "starting reserve changed the operating-cost physics");
  assert(value(high.context,"AgencyCareer.cashRunway().cashMonths")>value(low.context,"AgencyCareer.cashRunway().cashMonths"),
    "a larger starting reserve did not extend cash runway");
  runStableAgencyDay(low.context);runStableAgencyDay(high.context);
  approx(state(low.context).monthClientMediaSpend,state(high.context).monthClientMediaSpend,1e-6,
    "starting reserve changed client-funded media delivery");
  approx(state(low.context).telemetry.clientModeledValue,state(high.context).telemetry.clientModeledValue,1e-6,
    "starting reserve changed same-seed client outcomes");
}

// An unpayable month closes the company immediately with a specific, auditable insolvency cause.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1665");
  vm.runInContext("S.cash=-S.creditLimit+100;S.dayInMonth=20;S.clients[0].trust=95;S.clients[0].health=95;S.clients[0].nextDue=999",context);
  assert.equal(runStableAgencyDay(context),true);const s=state(context),month=s.monthlyHistory.at(-1);
  assert.equal(s.ended,true);assert.equal(s.outcome,"operating-insolvency");
  assert.equal(s.telemetry.operatingInsolvencies,1);assert.equal(s.lastSettlementId,month.settlementId);
  assert(s.unpaidOperatingBalance>0&&month.unpaidBalance>0,"insolvency did not preserve the unpaid obligation");
  assert(month.billsPaid<month.billsDue,"an insolvent month is marked fully paid");
  assert(s.insolvencyCause&&s.insolvencyCause.shortfall>0&&typeof s.insolvencyCause.largestCategory==="string",
    "insolvency ended without a specific shortfall and largest cost category");
  assert.equal(s.insolvencyCause.settlementId,month.settlementId);
  assert(s.cash>=-s.creditLimit-1e-6,"settlement spent beyond the permitted credit line");
  assert.match(value(context,"AgencyCareer.debrief()"),/operating (?:obligations|bills)|insolven|shortfall/i,
    "the early debrief does not explain the operating-cost failure");
}

// A funded, healthy founding operation pays the same obligations and continues into Month 2.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1666"),month=runToNextAgencySettlement(context),s=state(context);
  assert.equal(s.ended,false);assert.equal(s.outcome,null);assert.equal(s.month,1);
  approx(month.billsPaid,month.billsDue,1e-6,"a funded agency left recurring obligations unpaid");
  assert.equal(month.unpaidBalance,0);assert.equal(s.unpaidOperatingBalance,0);assert.equal(s.insolvencyCause,null);
  assert.equal(s.telemetry.operatingInsolvencies,0);
  assert(Number.isFinite(month.cashRunwayMonths)&&Number.isFinite(month.liquidityRunwayMonths)&&month.liquidityRunwayMonths>0);
}

// A checkpoint on either side of month close preserves settlement identity and cannot duplicate the charge.
{
  const search="?mode=6&budget=250000&seed=1667",localStore=new Map(),original=makeContext(search,{localStore});
  for(let day=0;day<19;day++)assert.equal(runStableAgencyDay(original.context),true);
  vm.runInContext('saveGame("before-month-close",false)',original.context);const beforeCloseStore=new Map(localStore);
  assert.equal(runStableAgencyDay(original.context),true);const expected=value(original.context,"JSON.stringify(S)"),settlement=state(original.context).lastSettlementId;
  const restored=makeContext(`${search}&resume=1`,{localStore:beforeCloseStore});assert.equal(runStableAgencyDay(restored.context),true);
  assert.equal(value(restored.context,"JSON.stringify(S)"),expected,"restored month close changed costs or settlement identity");
  assert.equal(state(restored.context).lastSettlementId,settlement);

  vm.runInContext('saveGame("after-month-close",false)',restored.context);const afterCloseStore=new Map(restored.localStore),
    resumed=makeContext(`${search}&resume=1`,{localStore:afterCloseStore});
  const before=value(resumed.context,"JSON.stringify({cash:S.cash,costs:S.cumulativeCosts,history:S.monthlyHistory,last:S.lastSettlementId})");
  vm.runInContext("AgencyCareer.monthlyOperatingStatement();AgencyCareer.liquidityStatus();render();AgencyCareer.export()",resumed.context);
  assert.equal(value(resumed.context,"JSON.stringify({cash:S.cash,costs:S.cumulativeCosts,history:S.monthlyHistory,last:S.lastSettlementId})"),before,
    "resuming an already settled month reposted its operating costs");
}

// A real legacy-v1 browser checkpoint migrates through session restore without losing or doubling accrued variable costs.
{
  const search="?mode=6&budget=250000&seed=1668",key="ttm.save.general.mode-6.v3",localStore=new Map(),source=makeContext(search,{localStore});
  vm.runInContext("S.day=7;S.dayInMonth=7;S.staff.buyer=2;S.monthVariableCosts=1750;S.cash-=1750;saveGame('legacy-v1-cost-ledger',false)",source.context);
  const record=JSON.parse(localStore.get(key));record.state.agencyModelVersion=1;
  for(const field of ["monthCostLedger","monthStaffDays","staffAccruedThrough","lastOperatingStatement","lastSettlementId","unpaidOperatingBalance","insolvencyCause"])
    delete record.state[field];
  delete record.state.telemetry.liquidityWarnings;delete record.state.telemetry.operatingInsolvencies;
  localStore.set(key,JSON.stringify(record));
  const restored=makeContext(`${search}&resume=1`,{localStore}),s=state(restored.context);
  assert.equal(s.agencyModelVersion,8);assert.equal(s.monthVariableCosts,1750);assert.equal(s.monthCostLedger.other,1750);
  assert.equal(s.staffAccruedThrough,6);assert.equal(s.monthStaffDays.buyer,12);
  for(const role of ["account","creative","ops","analyst"])assert.equal(s.monthStaffDays[role],0);
  for(const [key,value] of Object.entries(s.monthCostLedger))if(key!=="other")assert.equal(value,0,`legacy migration invented ${key} costs`);
  assert.equal(s.lastOperatingStatement,null);assert.equal(s.lastSettlementId,null);assert.equal(s.unpaidOperatingBalance,0);assert.equal(s.insolvencyCause,null);
  assert.equal(s.telemetry.liquidityWarnings,0);assert.equal(s.telemetry.operatingInsolvencies,0);
  assert.equal(value(restored.context,"AgencyCareer.validate(S)"),true);
  const preview=value(restored.context,"AgencyCareer.monthlyOperatingStatement()");
  approx(preview.variableTotal,1750,1e-6,"legacy variable costs doubled during migration");
  const month=runToNextAgencySettlement(restored.context);
  approx(month.variableOperatingCost,1750,1e-6,"legacy variable costs doubled at month close");
  approx(month.expenseBreakdown.other,1750,1e-6,"legacy variable costs did not land in the safe catch-all category");
}

// A real model-v2 client-agency checkpoint restores through the browser save path. Migration
// adds origin, geography, offer and ad fields without rerolling established money or client facts.
{
  const search="?mode=6&budget=250000&seed=16681",key="ttm.save.general.mode-6.v3",localStore=new Map(),source=makeContext(search,{localStore});
  vm.runInContext("S.day=8;S.dayInMonth=8;S.cash=238765;S.cumulativeProfit=4321;S.clients[0].trust=77;saveGame('real-v2-checkpoint',false)",source.context);
  const record=JSON.parse(localStore.get(key)),legacyClientName=record.state.clients[0].name;
  record.state.agencyModelVersion=2;delete record.state.agencyIdentity;delete record.state.tutorialEnabled;
  for(const collection of [record.state.clients,record.state.archivedClients,record.state.prospects])for(const client of collection)
    for(const field of ["offerId","officeId","marketScope","targetStates","accountTimezone","adConceptId","adFormat","adCopy","creativeVersion","customer","stakes","customerValue"])
      delete client[field];
  source.context.__legacyV2=JSON.parse(JSON.stringify(record.state));
  assert.equal(value(source.context,"AgencyCareer.validate(__legacyV2)"),true,"a structurally valid v2 checkpoint was rejected before migration");
  assert(value(source.context,"AgencyCareer.hydrate(__legacyV2)"),"v2 checkpoint did not enter the migration path");
  assert.equal(state(source.context).agencyModelVersion,8);assert.equal(value(source.context,"AgencyCareer.validate(S)"),true,
    "v2 checkpoint did not validate after migration to the current model");
  localStore.set(key,JSON.stringify(record));
  const restored=makeContext(`${search}&resume=1`,{localStore}),s=state(restored.context),client=s.clients[0];
  assert.equal(s.agencyModelVersion,8);assert.deepEqual({...s.agencyIdentity},{name:"Moonrise Media",hqId:"portland-or",agencyType:"digital_agency"});
  assert.equal(s.day,8);assert.equal(s.dayInMonth,8);assert.equal(s.cash,238765);assert.equal(s.cumulativeProfit,4321);
  assert.equal(client.name,legacyClientName);assert.equal(client.trust,77);assert.equal(client.channel,"search");
  for(const field of ["offerId","officeId","marketScope","targetStates","accountTimezone","adConceptId","adFormat","adCopy","creativeVersion","customer","stakes","customerValue"])
    assert(client[field]!==undefined&&client[field]!==null&&client[field]!=="",`v2 migration did not add ${field}`);
  assert.equal(s.tutorialEnabled,false);assert.equal(value(restored.context,"AgencyCareer.validate(S)"),true);
  assert.doesNotMatch(restored.history.lastUrl||"",/resume=1/,"successful v2 restore left a resume redirect loop");
}

// Model-v3 saves remain loadable even when the former vertical-only picker paired an offer
// with another offer's concept. Migration repairs the creative without rerolling money or client history.
{
  const fixture=makeContext("?mode=6&budget=250000&seed=16682&agencyType=digital_agency"),before=state(fixture.context),cash=before.cash,trust=before.clients[0].trust;
  vm.runInContext(`globalThis.__legacyV3=AgencyCareer.export();__legacyV3.agencyModelVersion=3;
    Object.assign(__legacyV3.clients[0],{vertical:"professional-services",offerId:"estate-consultation",channel:"social",
      adConceptId:"bookkeeping-before-after",adFormat:"slideshow",adCopy:"Before and after the books are reconciled."});`,fixture.context);
  assert.equal(value(fixture.context,"AgencyCareer.validate(__legacyV3)"),true,"a structurally valid v3 checkpoint was rejected before creative repair");
  assert(value(fixture.context,"AgencyCareer.hydrate(__legacyV3)"),"v3 checkpoint did not enter the creative-alignment migration");
  const repaired=state(fixture.context),client=repaired.clients[0],concept=JSON.parse(value(fixture.context,
    "JSON.stringify(AGENCY_AD_CONCEPTS.find(item=>item.id===S.clients[0].adConceptId))"));
  assert.equal(repaired.agencyModelVersion,8);assert.equal(repaired.cash,cash);assert.equal(client.trust,trust);
  assert.equal(client.offerId,"estate-consultation","v3 repair unnecessarily rerolled a channel-compatible offer");
  assert(concept.offerIds.includes(client.offerId)&&concept.channels.includes(client.channel),"v3 repair left the offer, concept and channel misaligned");
  assert.equal(client.adFormat,concept.format);assert.doesNotMatch(client.adCopy,/books are reconciled/i);
  assert.equal(value(fixture.context,"AgencyCareer.validate(S)"),true,"repaired v3 checkpoint does not satisfy the v4 contract");
}

// The affiliate transformation is gated, irreversible, and preserves earned career progress.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=167");
  assert.equal(value(context,"AgencyCareer.canPivot().ok"),false);
  vm.runInContext(`S.month=48;S.day=961;S.dayInMonth=1;S.level=8;S.skillPoints=7;S.cash=600000;S.cumulativeProfit=765432;
    S.reputation=81;S.staff.buyer=2;S.staff.analyst=1;S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"]`,context);
  const before=value(context,"JSON.stringify({profit:S.cumulativeProfit,level:S.level,points:S.skillPoints,reputation:S.reputation,staff:S.staff,unlocked:S.unlocked,clients:S.clients.length,cash:S.cash})");
  vm.runInContext("S.dayInMonth=10",context);assert.equal(value(context,"AgencyCareer.canPivot().requirements.boundary"),false);
  assert.equal(value(context,"AgencyCareer.pivot({render:false})"),false,"a midmonth transformation discarded accrued agency economics");
  vm.runInContext("S.dayInMonth=1",context);
  assert.equal(value(context,"AgencyCareer.canPivot().ok"),true);assert.equal(value(context,"AgencyCareer.pivot({render:false})"),true);
  const s=state(context),prior=JSON.parse(before);
  assert.equal(s.businessModel,"affiliate");assert.equal(s.clients.length,0);assert.equal(s.archivedClients.length,prior.clients);
  assert.equal(s.cumulativeProfit,prior.profit);assert.equal(s.level,prior.level);assert.equal(s.skillPoints,prior.points);
  assert.equal(s.reputation,prior.reputation);assert.deepEqual({...s.staff},prior.staff);assert.deepEqual(Array.from(s.unlocked),prior.unlocked);
  assert.equal(s.cash,prior.cash-150000);assert.equal(s.telemetry.pivoted,true);assert.equal(s.affiliate.funnels.length,1);
  assert.equal(value(context,"AgencyCareer.pivot({render:false})"),false,"the one-way affiliate transformation could run twice");
  assert.equal(value(context,"AgencyCareer.validate(S)"),true);
  runToNextAgencySettlement(context);
  assert.equal(state(context).targetSeats,0,"the first affiliate month close restored a retired client-seat target");
  assert.equal(value(context,"AgencyCareer.validate(S)"),true,"the post-pivot affiliate state became invalid at month close");
}

// Affiliate P&L recognizes validated cash after clawbacks, not the larger modeled payout claim.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1671");
  vm.runInContext(`S.month=48;S.day=961;S.dayInMonth=1;S.level=8;S.cash=600000;
    S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"];
    AgencyCareer.pivot({render:false});S.dayInMonth=20;S.affiliate.funnels[0].dailyBudget=0;S.monthAffiliateEarned=50000;
    S.receivables=[{id:"forced-clawback",kind:"affiliate",amount:10000,dueDay:S.day,clawbackRisk:1}];AgencyCareer.runDay({force:true})`,context);
  const s=state(context),month=s.monthlyHistory.at(-1);
  assert.equal(month.businessModel,"affiliate");assert.equal(month.modeledPayoutEarned,50000);
  assert(month.revenue>0&&month.revenue<10000,"guaranteed clawback was not reflected in recognized revenue");
  approx(s.cumulativeRevenue,month.revenue,1e-6);approx(month.profit,month.revenue-month.costs,1e-6);
}

// The affiliate transformation keeps company obligations but replaces client-service economics with owned-funnel infrastructure.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=1676");
  vm.runInContext(`S.month=48;S.day=961;S.dayInMonth=1;S.level=8;S.cash=1000000;S.reputation=85;
    S.staff.buyer=2;S.staff.analyst=1;
    S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"]`,context);
  const agencyCost=value(context,"AgencyCareer.monthlyOperatingCost()"),agencyDrivers=Array.from(agencyCost.drivers).join(" ");
  assert.match(agencyDrivers,/client seat/i);
  assert.equal(value(context,"AgencyCareer.pivot({render:false})"),true);
  const affiliateRunway=value(context,"AgencyCareer.cashRunway()");
  assert.equal(affiliateRunway.plannedOwnedMedia,50000,"affiliate runway omitted 20 workdays of planned owned-media delivery");
  approx(affiliateRunway.monthlyCashBurn,affiliateRunway.monthlyObligations+affiliateRunway.plannedOwnedMedia,1e-6,
    "affiliate runway did not combine recurring obligations and planned owned media");
  vm.runInContext("S.dayInMonth=20;S.affiliate.funnels[0].dailyBudget=0",context);
  const affiliateCost=value(context,"AgencyCareer.monthlyOperatingCost()"),affiliateDrivers=Array.from(affiliateCost.drivers).join(" ");
  assert.match(affiliateDrivers,/owned funnel/i);assert.doesNotMatch(affiliateDrivers,/client seat/i);
  assert.notEqual(affiliateCost.total,agencyCost.total,"affiliate and client-agency recurring structures collapsed to one cost model");
  assert(affiliateCost.categories.infrastructureHosting>0&&affiliateCost.categories.softwareSubscriptions>0&&
    affiliateCost.categories.insuranceComplianceProfessional>0,"the owned funnel lost infrastructure, software or compliance obligations");
  assert.equal(runStableAgencyDay(context),true);const month=state(context).monthlyHistory.at(-1);
  assert.equal(month.businessModel,"affiliate");assert(month.expenseBreakdown.businessTransformation>=150000);
  assert.equal(month.expenseBreakdown.clientServiceOnboarding,0);assert.equal(month.expenseBreakdown.ownedMedia,0);
  approx(Object.values(month.expenseBreakdown).reduce((sum,amount)=>sum+amount,0),month.costs,1e-6,
    "affiliate operating statement does not reconcile");
}

// Optional account work and owned-funnel delivery cannot silently spend through the shared credit-line floor.
{
  const agency=makeContext("?mode=6&budget=250000&seed=1674");
  vm.runInContext("S.cash=-S.creditLimit+200",agency.context);const before=value(agency.context,"JSON.stringify(S)");
  assert.equal(value(agency.context,"AgencyCareer.operate(S.clients[0].id,'audit',{render:false})"),false);
  assert.equal(value(agency.context,"JSON.stringify(S)"),before,"a paid account action crossed the credit-line floor");

  const affiliate=makeContext("?mode=6&budget=250000&seed=1675");
  vm.runInContext(`S.month=48;S.day=961;S.dayInMonth=1;S.level=8;S.cash=600000;
    S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"];
    AgencyCareer.pivot({render:false});S.cash=-S.creditLimit+1000;AgencyCareer.runDay({force:true})`,affiliate.context);
  assert(state(affiliate.context).cash>=-state(affiliate.context).creditLimit,"owned delivery spent past the shared credit line");
  assert(state(affiliate.context).monthAffiliateSpend<=1000,"owned delivery recorded spend beyond available liquidity");
}

// Affiliate controls reject boundary actions that would consume focus or cash without changing the funnel.
{
  const {context}=makeContext("?mode=6&budget=250000&seed=16751");
  vm.runInContext(`S.month=48;S.day=961;S.dayInMonth=1;S.level=8;S.cash=600000;
    S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"];
    AgencyCareer.pivot({render:false});const funnel=S.affiliate.funnels[0];S.affiliate.posture="documented";
    funnel.dailyBudget=0;funnel.fatigue=0;funnel.signal=100;funnel.complianceHeat=0`,context);
  const lowerBound=value(context,"JSON.stringify(S)");
  for(const action of ["scale-down","refresh","audit","document"])
    assert.equal(value(context,`AgencyCareer.affiliateAction(S.affiliate.funnels[0].id,${JSON.stringify(action)},{render:false})`),false,
      `${action} accepted a no-effect boundary action`);
  assert.equal(value(context,"JSON.stringify(S)"),lowerBound,"a no-effect affiliate action consumed cash, focus or state");
  vm.runInContext("S.affiliate.funnels[0].dailyBudget=25000",context);const upperBound=value(context,"JSON.stringify(S)");
  assert.equal(value(context,"AgencyCareer.affiliateAction(S.affiliate.funnels[0].id,'scale-up',{render:false})"),false);
  assert.equal(value(context,"JSON.stringify(S)"),upperBound,"scale-up at the daily cap consumed focus or changed state");
}

// A concluded career is immutable through every public command surface after its debrief is closed.
{
  const agency=makeContext("?mode=6&budget=250000&seed=1672");
  vm.runInContext(`S.month=48;S.day=961;S.level=8;S.skillPoints=10;S.cash=600000;S.staff.buyer=1;
    S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"];
    AgencyCareer.generateProspects(S,2);S.ended=true;S.outcome="win"`,agency.context);
  const before=value(agency.context,"JSON.stringify(S)");
  vm.runInContext(`AgencyCareer.operate(S.clients[0].id,"service",{render:false});AgencyCareer.clientConversation(S.clients[0].id,"evidence");
    AgencyCareer.acceptProspect(S.prospects[0]?.id,{render:false});AgencyCareer.rejectProspect(S.prospects[0]?.id,{render:false});
    AgencyCareer.hire("buyer",{render:false});AgencyCareer.releaseStaff("buyer",{render:false});AgencyCareer.unlock("automation",{render:false});
    AgencyCareer.pivot({render:false});AgencyCareer.runDay({force:true})`,agency.context);
  assert.equal(value(agency.context,"JSON.stringify(S)"),before,"an agency command mutated a concluded career");

  const affiliate=makeContext("?mode=6&budget=250000&seed=1673");
  vm.runInContext(`S.month=48;S.day=961;S.level=8;S.cash=600000;
    S.unlocked=["search_foundations","paid_social","measurement","first_party","creative_studio","affiliate_engine"];
    AgencyCareer.pivot({render:false});S.ended=true;S.outcome="win"`,affiliate.context);
  const affiliateBefore=value(affiliate.context,"JSON.stringify(S)");
  vm.runInContext(`AgencyCareer.affiliateAction(S.affiliate.funnels[0].id,"scale-up",{render:false});
    AgencyCareer.launchFunnel("software",{render:false});AgencyCareer.runDay({force:true})`,affiliate.context);
  assert.equal(value(affiliate.context,"JSON.stringify(S)"),affiliateBefore,"an affiliate command mutated a concluded career");
}

// The final 2027 gate requires both career profit and liquidity.
for(const fixture of [
  {seed:168,profit:13000000,cash:1000000,outcome:"win"},
  {seed:169,profit:11900000,cash:1000000,outcome:"target-missed"},
  {seed:170,profit:13000000,cash:-1,outcome:"target-missed"}
]){
  const {context}=makeContext(`?mode=6&budget=250000&seed=${fixture.seed}`);
  vm.runInContext(`S.month=119;S.day=2400;S.dayInMonth=20;S.cumulativeProfit=${fixture.profit};S.peakProfit=${fixture.profit};
    S.cumulativeRevenue=${fixture.profit+1000000};S.cumulativeCosts=1000000;S.cash=${fixture.cash};S.clients=[];AgencyCareer.runDay({force:true})`,context);
  assert.equal(state(context).ended,true);assert.equal(state(context).outcome,fixture.outcome);
  assert.equal(state(context).month,120);assert.equal(state(context).day,2401);
}

// Service load rises with the promised client ladder even when channel and portfolio breadth are held constant.
{
  const {context}=makeContext("?mode=6&seed=171");
  const costs=Array.from(value(context,`["smb_leadgen","smb_commerce","enterprise_leadgen","enterprise_commerce"]
    .map(typeId=>AgencyCareer.serviceCost({...S.clients[0],typeId}))`));
  assert(costs.every((cost,index)=>index===0||cost>costs[index-1]),`service-cost ladder is not strictly ordered: ${costs.join(" → ")}`);
}

// Purchased systems and specialist roles have mechanical effects, rather than being descriptive-only choices.
{
  const baseline=makeContext("?mode=6&seed=1711"),systems=makeContext("?mode=6&seed=1711");
  vm.runInContext("S.clients[0].incident=null;AgencyCareer.operate(S.clients[0].id,'service',{render:false})",baseline.context);
  vm.runInContext(`S.clients[0].incident=null;S.unlocked.push("landing_systems","predictive_ops");
    AgencyCareer.operate(S.clients[0].id,"service",{render:false})`,systems.context);
  assert(state(systems.context).clients[0].health>state(baseline.context).clients[0].health);
  assert(state(systems.context).clients[0].performance>state(baseline.context).clients[0].performance);
  assert(state(systems.context).clients[0].nextDue>state(baseline.context).clients[0].nextDue);

  const tracking=[];
  for(const unlocks of [[],["measurement"],["measurement","first_party"]]){
    const fixture=makeContext("?mode=6&seed=1712");
    vm.runInContext(`S.unlocked.push(...${JSON.stringify(unlocks)});const template=AGENCY_INCIDENTS.find(item=>item.id==="tracking");
      S.clients[0].incident={...template,critical:false,openedDay:0};S.clients[0].incidentAge=1;S.clients[0].nextDue=999;
      AgencyCareer.runDay({force:true})`,fixture.context);tracking.push(state(fixture.context).clients[0].trust);
  }
  assert(tracking[1]>tracking[0]&&tracking[2]>tracking[1],`tracking resilience did not improve across systems: ${tracking.join(" → ")}`);

  for(const [role,action,metric] of [["analyst","audit","measurement"],["creative","refresh","creative"],["account","update","trust"]]){
    const base=makeContext(`?mode=6&budget=250000&seed=1713`),staffed=makeContext(`?mode=6&budget=250000&seed=1713`);
    vm.runInContext(`S.clients[0].incident=null;S.clients[0][${JSON.stringify(metric)}]=40;
      Object.assign(S.clients[0],{officeId:"new-york-ny",accountTimezone:"America/New_York",marketScope:"local",targetStates:["NY"]})`,base.context);
    vm.runInContext(`S.clients[0].incident=null;S.clients[0][${JSON.stringify(metric)}]=40;S.staff[${JSON.stringify(role)}]=3;
      Object.assign(S.clients[0],{officeId:"new-york-ny",accountTimezone:"America/New_York",marketScope:"local",targetStates:["NY"]})`,staffed.context);
    const baseCash=state(base.context).cash,staffCash=state(staffed.context).cash;
    const baseResult=value(base.context,`AgencyCareer.operate(S.clients[0].id,${JSON.stringify(action)},{render:false})`);
    const staffResult=value(staffed.context,`AgencyCareer.operate(S.clients[0].id,${JSON.stringify(action)},{render:false})`);
    assert(staffResult.cost<baseResult.cost,`${role} did not reduce its specialist workload`);
    assert(state(staffed.context).clients[0][metric]>state(base.context).clients[0][metric],`${role} did not improve ${metric}`);
    if(action!=="update")assert(staffCash-state(staffed.context).cash<baseCash-state(base.context).cash,`${role} did not reduce cash servicing cost`);
  }
}

// Late-career expansion is a financed operating strategy: cash, points, recurring bills and real mechanics move together.
{
  const {context}=makeContext("?mode=6&budget=2500000&seed=1714");
  vm.runInContext(`S.month=96;S.day=1921;S.dayInMonth=1;S.level=10;S.skillPoints=30;S.cash=2500000;
    S.unlocked=["search_foundations","paid_social","measurement","automation","agency_os","creative_studio","short_form","first_party","portfolio_measurement","predictive_ops"]`,context);
  assert.match(value(context,"AgencyCareer.canUnlock('agentic_workbench').reason"),/level 11/i,"agentic workbench ignored its career-level gate");
  vm.runInContext("S.level=11;S.cash=0",context);
  assert.match(value(context,"AgencyCareer.canUnlock('agentic_workbench').reason"),/positive operating cash/i,"advanced capability silently spent credit");
  vm.runInContext("S.cash=2500000",context);
  const setup=value(context,"AgencyCareer.capabilityInvestment('agentic_workbench')"),beforeCash=state(context).cash,
    beforePoints=state(context).skillPoints,beforeMonthly=value(context,"AgencyCareer.monthlyOperatingCost().total");
  assert.equal(value(context,"AgencyCareer.unlock('agentic_workbench',{render:false})"),true);
  assert.equal(state(context).cash,beforeCash-setup,"capability setup did not leave operating cash immediately");
  assert.equal(state(context).skillPoints,beforePoints-2,"capability setup did not spend its points");
  assert.equal(state(context).monthCostLedger.other,setup,"capability setup did not enter the current operating statement");
  assert(value(context,"AgencyCareer.capabilityMonthlyCosts().softwareSubscriptions")>0,"agentic software omitted its recurring obligation");
  assert(value(context,"AgencyCareer.monthlyOperatingCost().total")>beforeMonthly,"advanced software did not increase monthly company costs");
  assert.equal(value(context,"AgencyCareer.validate(S)"),true,"advanced capability purchase produced an invalid save");

  const baseline=value(context,"AgencyCareer.continuityCapacity({...S,unlocked:S.unlocked.filter(id=>!['resilient_network','satellite_failover'].includes(id))},100).risk"),
    dual=value(context,"AgencyCareer.continuityCapacity({...S,unlocked:[...S.unlocked,'resilient_network']},100).risk"),
    satellite=value(context,"AgencyCareer.continuityCapacity({...S,unlocked:[...S.unlocked,'resilient_network','satellite_failover']},100).risk");
  assert(baseline>dual&&dual>satellite,"network and satellite failover did not reduce connectivity disruption risk in stages");

  const lean=makeContext("?mode=6&budget=2500000&seed=1715"),expanded=makeContext("?mode=6&budget=2500000&seed=1715");
  const prerequisites=["search_foundations","paid_social","measurement","automation","agency_os","creative_studio","short_form","first_party","portfolio_measurement","predictive_ops"];
  vm.runInContext(`S.month=108;S.day=2161;S.level=18;S.cash=2500000;S.unlocked=${JSON.stringify(prerequisites)}`,lean.context);
  vm.runInContext(`S.month=108;S.day=2161;S.level=18;S.cash=2500000;S.unlocked=${JSON.stringify([...prerequisites,"distributed_ops","distributed_qa","follow_the_sun","agentic_workbench","agentic_ops","creative_automation","automated_creative_pipeline","workstation_fleet","resilient_network","satellite_failover","local_ai_cluster"])}`,expanded.context);
  assert(value(expanded.context,"AgencyCareer.capacity().raw")>value(lean.context,"AgencyCareer.capacity().raw")+30,
    "late-career people, automation, creative and hardware systems did not create meaningful operating capacity");
  vm.runInContext("S.clients[0].channel='social';S.clients[0].typeId='smb_commerce';S.clients[0].creative=30",lean.context);
  vm.runInContext("S.clients[0].channel='social';S.clients[0].typeId='smb_commerce';S.clients[0].creative=30",expanded.context);
  const leanCash=state(lean.context).cash,expandedCash=state(expanded.context).cash;
  const leanRefresh=value(lean.context,"AgencyCareer.operate(S.clients[0].id,'refresh',{render:false})"),
    expandedRefresh=value(expanded.context,"AgencyCareer.operate(S.clients[0].id,'refresh',{render:false})");
  assert(expandedRefresh.cost<leanRefresh.cost,"automated creative systems did not reduce refresh focus");
  assert(expandedCash-state(expanded.context).cash<leanCash-state(lean.context).cash,"workstations and local compute did not reduce creative production cash");

  const affiliateBase=makeContext("?mode=6&budget=2500000&seed=1716"),affiliateAdvanced=makeContext("?mode=6&budget=2500000&seed=1716");
  const pivotTech=[...prerequisites,"affiliate_engine"];
  vm.runInContext(`S.month=108;S.day=2161;S.dayInMonth=1;S.level=18;S.cash=2500000;S.unlocked=${JSON.stringify(pivotTech)};AgencyCareer.pivot({render:false});S.affiliate.funnels[0].fatigue=80`,affiliateBase.context);
  vm.runInContext(`S.month=108;S.day=2161;S.dayInMonth=1;S.level=18;S.cash=2500000;S.unlocked=${JSON.stringify([...pivotTech,"creative_automation","automated_creative_pipeline","workstation_fleet","agentic_workbench","local_ai_cluster"])};AgencyCareer.pivot({render:false});S.affiliate.funnels[0].fatigue=80`,affiliateAdvanced.context);
  const affiliateBaseCash=state(affiliateBase.context).cash,affiliateAdvancedCash=state(affiliateAdvanced.context).cash;
  assert.equal(value(affiliateBase.context,"AgencyCareer.affiliateAction(S.affiliate.funnels[0].id,'refresh',{render:false})"),true);
  assert.equal(value(affiliateAdvanced.context,"AgencyCareer.affiliateAction(S.affiliate.funnels[0].id,'refresh',{render:false})"),true);
  assert(affiliateAdvancedCash-state(affiliateAdvanced.context).cash<affiliateBaseCash-state(affiliateBase.context).cash,
    "creative infrastructure did not carry into owned-funnel production economics");
  assert(state(affiliateAdvanced.context).affiliate.funnels[0].fatigue<state(affiliateBase.context).affiliate.funnels[0].fatigue,
    "advanced creative pipeline did not improve owned-funnel refresh depth");
}

// Ignoring a tiny founding roster is a losing strategy; a teachable search-specialist policy can build to 2027 and clear the calibrated gate.
{
  const passive=makeContext("?mode=6&budget=25000&seed=172");runToEnd(passive.context);
  assert.notEqual(state(passive.context).outcome,"win","passive Agency Career play cleared the decade target");
  assert(state(passive.context).day<=2401);

  const managed=makeContext("?mode=6&budget=25000&seed=173"),s=runAgencySearchPolicy(managed.context);
  assert.equal(s.ended,true,"managed search-specialist career did not conclude");
  assert.equal(s.day,2401);assert.equal(s.month,120);assert.equal(s.outcome,"win");
  assert(s.cumulativeProfit>=value(managed.context,"AGENCY_PROFIT_TARGET"));assert(s.cash>=0);
  assert.equal(s.monthlyHistory.length,120);assert(s.clients.length<=75);
  assert.equal(s.unlocked.includes("paid_social"),false);assert.equal(s.unlocked.includes("commerce_feeds"),false);
  for(const [month,target] of [[1,1],[2,2],[3,5],[6,15],[12,30]])
    assert(s.monthlyHistory[month-1].seats>=target,`search-specialist policy missed Month ${month}'s ${target}-seat gate`);
}

// Every default mode completes without NaN/Infinity or period/cap drift.
for(let mode=0;mode<=6;mode++){
  const {context}=makeContext(`?mode=${mode}&seed=17`);
  runToEnd(context);
}

// Modes 0–4 retain stable keyed-RNG behavior, and lag modes leave the period-end tail unsettled.
{
  const first=makeContext("?mode=0&stage=1&seed=97").context,second=makeContext("?mode=0&stage=1&seed=97").context;
  runToEnd(first);runToEnd(second);const s=state(first),repeat=state(second);
  assert.equal(s.day,31);assert(s.spendTotal>0&&s.valueTotal>0&&s.convReported>0&&s.wasteTotal>0);
  assert.deepEqual({spend:s.spendTotal,value:s.valueTotal,conversions:s.convReported,trust:s.client.trust,waste:s.wasteTotal},
    {spend:repeat.spendTotal,value:repeat.valueTotal,conversions:repeat.convReported,trust:repeat.client.trust,waste:repeat.wasteTotal},
    "Classic same-seed replay drifted");
}
for(const mode of [1,2,3,4]){
  const first=makeContext(`?mode=${mode}&seed=97`).context,second=makeContext(`?mode=${mode}&seed=97`).context;
  runToEnd(first);runToEnd(second);const s=state(first),repeat=state(second),summary=value(first,`JSON.stringify({day:S.day,spend:S.spendTotal,revenue:S.revenue,earned:S.earnedRevenue,attributed:S.attributedRevenue,attributedEarned:S.attributedEarnedRevenue,leads:S.leadsTotal,reported:S.reportedLeadsTotal,unknown:S.unknownRev,pending:S.pending.reduce((sum,item)=>sum+item.amt,0)})`);
  assert.equal(s.day,13);assert(s.spendTotal>0&&s.earnedRevenue>0&&s.leadsTotal>0);
  assert.equal(summary,value(second,`JSON.stringify({day:S.day,spend:S.spendTotal,revenue:S.revenue,earned:S.earnedRevenue,attributed:S.attributedRevenue,attributedEarned:S.attributedEarnedRevenue,leads:S.leadsTotal,reported:S.reportedLeadsTotal,unknown:S.unknownRev,pending:S.pending.reduce((sum,item)=>sum+item.amt,0)})`),
    `Mode ${mode} same-seed replay drifted`);
  finiteTree(repeat);
}

// Scenario seeds create different strategic openings, not merely different decimal noise.
{
  const modern=makeContext("?mode=1&seed=41"),classic=makeContext("?mode=0&stage=2&seed=41"),
    nightmare=makeContext("?mode=5&seed=41"),agency=makeContext("?mode=6&budget=25000&seed=41");
  const modernProfiles=Array.from({length:36},(_,i)=>value(modern.context,`JSON.stringify((p=>({market:p.market.id,inheritance:p.inheritance.id,starters:p.starterIds,shares:p.inheritance.shares,cpm:p.market.cpmM,cvr:p.market.cvrM,quality:p.market.qualityM}))(modernScenarioProfile(${i+1},1)))`));
  assert(new Set(modernProfiles).size>=14,"modern seeds do not create enough distinct market/account combinations");
  assert.equal(value(modern.context,"modernScenarioProfile(2601,1).tutorialPreset"),true);
  assert.equal(value(modern.context,"modernScenarioProfile(2601,1).inheritance.id"),"balanced");
  assert(value(modern.context,"DAY_EVENTS.length")>=12,"the modern event deck is still too narrow");
  assert(value(modern.context,"DAY_EVENTS.filter(event=>event.duration>1).length")>=4,"the modern deck lacks persistent events");
  vm.runInContext('S.pressures=[{id:"test",title:"Persistent test",from:1,until:3,target:null,cpmM:1.25}];S.day=2',modern.context);
  approx(value(modern.context,'dayEffect({event:{target:null}},"cpmM",0)'),1.25,1e-12,"persistent pressure did not alter delivery");
  assert.match(modern.registry.accountBox.innerHTML,/Market condition[\s\S]*Inherited account/);

  const classicProfiles=Array.from({length:24},(_,i)=>value(classic.context,`JSON.stringify(classicOpeningProfile(${i+1}))`));
  assert(new Set(classicProfiles).size>=5,"Classic seeds do not create distinct inherited diagnoses");
  assert.match(classic.registry.accountBox.innerHTML,/Inherited search account[\s\S]*Client context/);

  const agencyProfiles=Array.from({length:24},(_,i)=>value(agency.context,`AgencyCareer.openingProfile(${i+1}).id`));
  assert(new Set(agencyProfiles).size>=5,"Agency Career seeds do not create distinct founding relationships");
  assert.equal(value(agency.context,"AgencyCareer.openingProfile(2601).id"),"founder-referral");
  assert.match(agency.registry.slots.innerHTML,/Career opening/);

  const nightmareProfiles=Array.from({length:36},(_,i)=>value(nightmare.context,`NightmareEngine.openingProfile(${i+1}).id`));
  assert(new Set(nightmareProfiles).size>=14,"Portfolio Command seeds do not create enough portfolio/operating combinations");
  assert.match(nightmare.registry.accountBox.innerHTML,/Inherited portfolio[\s\S]*Operating condition/);
  const replayA=makeContext("?mode=6&budget=25000&seed=415"),replayB=makeContext("?mode=6&budget=25000&seed=415");
  assert.equal(value(replayA.context,"JSON.stringify(S)"),value(replayB.context,"JSON.stringify(S)"),"Agency opening is not reproducible by seed");
}

// The analogy layer is a complete, stable set of 11 flavors with no missing vocabulary or events.
{
  const {context,registry}=makeContext("?mode=1&seed=19");
  const ids=Array.from(value(context,"FLAVORS"),flavor=>flavor.id);
  const displayIds=["vc","f1","kitchen","agriculture","mixing","fishing","deckbuilder","jrpg","dnd"];
  assert.deepEqual(ids,["deckbuilder","jrpg","agriculture","kitchen","f1","fishing","mixing","vc","dnd"]);
  /* Retired lenses stay resolvable so old saves and links do not break. */
  assert.equal(value(context,'liveFlavorId("evolution")'),"agriculture");
  assert.equal(value(context,'liveFlavorId("fighting")'),"deckbuilder");
  assert.equal(value(context,"FLAVOR_BY_ID.evolution||FLAVOR_BY_ID.fighting||null"),null,"a retired lens is still selectable");
  assert.deepEqual(Array.from(value(context,"ORDERED_FLAVORS"),flavor=>flavor.id),displayIds);
  assert.equal(new Set(ids).size,9);
  assert.equal(value(context,"ACTIVE_FLAVOR"),"jrpg");
  assert.equal((registry.flavorSelect.innerHTML.match(/<option /g)||[]).length,9);
  const flavorGrid=value(context,"flavorGridMarkup()");
  for(let index=1;index<displayIds.length;index++){
    const previous=displayIds[index-1],current=displayIds[index];
    assert(registry.flavorSelect.innerHTML.indexOf(`value="${previous}"`)<registry.flavorSelect.innerHTML.indexOf(`value="${current}"`),
      "flavor selector does not follow the professional-to-game display order");
    assert(flavorGrid.indexOf(`data-flavor="${previous}"`)<flavorGrid.indexOf(`data-flavor="${current}"`),
      "flavor cards do not follow the professional-to-game display order");
  }
  const expectedTerms=Array.from(value(context,"[...new Set([...FLAVOR_TERM_KEYS,...Object.keys(FLAVOR_EXTRA_TERMS.deckbuilder)])].sort()"));
  const expectedMetrics=Array.from(value(context,"[...new Set([...FLAVOR_METRIC_KEYS,...Object.keys(FLAVOR_EXTRA_METRICS.deckbuilder)])].sort()"));
  const authoredCausalTerms=["cpm","ctr","cvr","cpl","impressions","click","lead","conversion","platform",
    "paid search","paid social","buying lane","targeting","audience","creative format","static image","view-through",
    "liquidity","concentration risk","acquisition gate"];
  const allCanonicalTerms=Array.from(value(context,"Object.keys(LORE)"));
  assert.equal(expectedTerms.length,36);assert.equal(expectedMetrics.length,26);
  for(const id of ids){
    assert.deepEqual(Array.from(value(context,`Object.keys(FLAVOR_BY_ID[${JSON.stringify(id)}].terms).sort()`)),expectedTerms,`${id} term schema drifted`);
    assert(value(context,`Object.values(FLAVOR_BY_ID[${JSON.stringify(id)}].terms).every(Boolean)`),`${id} has an empty term`);
    assert.deepEqual(Array.from(value(context,`Object.keys(FLAVOR_BY_ID[${JSON.stringify(id)}].metrics).sort()`)),expectedMetrics,`${id} metric schema drifted`);
    assert(value(context,`Object.values(FLAVOR_BY_ID[${JSON.stringify(id)}].metrics).every(Boolean)`),`${id} has an empty metric`);
    assert(value(context,`FLAVOR_BY_ID[${JSON.stringify(id)}].signature.length>30`),`${id} has no signature mapping`);
    assert.deepEqual(Array.from(value(context,`Object.keys(FLAVOR_BY_ID[${JSON.stringify(id)}].events)`)).sort(),
      ["copied","glut","influencer","ios","quiet","surge","viral"],`${id} has incomplete events`);
    for(const concept of ["day","performance","budget","creative","measurement","fatigue","platform","compliance","client","search","liquidity","portfolio","crisis","structure"]){
      const cue=value(context,`(()=>{ACTIVE_FLAVOR=${JSON.stringify(id)};return flavorCue(${JSON.stringify(concept)})})()`);
      assert(cue.length>20&&!cue.includes("undefined"),`${id}/${concept} produced a broken cue`);
    }
    for(const eventId of ["quiet","viral","auction","earned","ghost","signal","payout","flag","bidwar","fees","glut","copied","blackout","conquest"]){
      const eventText=value(context,`(()=>{ACTIVE_FLAVOR=${JSON.stringify(id)};return nightmareEventFlavorText(${JSON.stringify(eventId)})})()`);
      assert(eventText.length>20&&!eventText.includes("undefined"),`${id}/${eventId} produced a broken Nightmare event analogy`);
      assert.doesNotMatch(eventText,/\b(?:dealts|matchs)\b/i,`${id}/${eventId} used naive pluralization`);
    }
    const flow=value(context,`flavorFlow(FLAVOR_BY_ID[${JSON.stringify(id)}])`);
    for(const stage of ["Impression ≈","Click ≈","Lead ≈","Conversion ≈","Revenue ≈","Profit ≈"])
      assert(flow.includes(stage),`${id} omitted ${stage}`);
    assert.equal(value(context,`FLAVOR_BY_ID[${JSON.stringify(id)}].canonicalFlow`),flow);
    const authored=value(context,`flavorAnalogyFlow(FLAVOR_BY_ID[${JSON.stringify(id)}])`);
    assert(authored.length>40&&authored.includes("Impression")&&authored.includes("Click")&&authored.includes("Profit"),`${id} lost its authored causal path`);
    assert(value(context,`FLAVOR_REASONING[${JSON.stringify(id)}].why.length>50`),`${id} has no analogy reasoning`);
    assert(value(context,`FLAVOR_REASONING[${JSON.stringify(id)}].boundary.length>40`),`${id} has no analogy boundary`);
    for(const term of authoredCausalTerms){
      const explanation=JSON.parse(value(context,
        `JSON.stringify(flavorMechanicModel(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(id)}]))`));
      assert(["strong","partial","none"].includes(explanation.strength),`${id}/${term} has no declared analogy strength`);
      if(explanation.strength!=="none")
        assert(!String(explanation.connection||"").startsWith("The metaphor preserves the decision relationship"),`${id}/${term} fell through to the generic analogy bridge`);
      assert.doesNotMatch(String(explanation.connection||""),/\bBoundary\s*:/i,`${id}/${term} buried its analogy boundary inside its connection`);
    }
    for(const term of allCanonicalTerms){
      const explanation=JSON.parse(value(context,
        `JSON.stringify(flavorMechanicModel(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(id)}]))`));
      assert(["strong","partial","none"].includes(explanation.strength),`${id}/${term} has no declared analogy strength`);
    }
  }
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return statFlavorAlias("Available credit")})()'),value(context,'FLAVOR_BY_ID.dnd.terms.credit'));
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return statFlavorAlias("Attribution gap")})()'),value(context,'FLAVOR_BY_ID.dnd.terms.attribution'));
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return statFlavorAlias("Projected contribution")})()'),value(context,'FLAVOR_BY_ID.dnd.metrics.profit'));
  vm.runInContext('ACTIVE_FLAVOR="jrpg";render()',context);
  assert.match(registry.realityBar.innerHTML,/Platform-abstracted direct-response display\/native lead generation/);
  assert.match(registry.realityBar.innerHTML,/No single platform is simulated/);
  assert.match(registry.realityBar.innerHTML,/In-house-style/);
  assert.match(registry.realityBar.innerHTML,/JRPG Raid Party lens/);
  /* A card states plainly what it IS and where it runs. The old per-card analogy line
     ("Ad ≈ deployed adventurer · Creative ≈ equipped weapon") repeated on every card and
     told a player nothing about the account (2026-08-09). */
  assert.match(registry.slots.innerHTML,/One <b>ad<\/b> running on/);
  assert.doesNotMatch(registry.slots.innerHTML,/Ad ≈/,"the per-card analogy line returned");
  assert.match(registry.slots.innerHTML,/it carries the <b>creative<\/b>/);
  assert.match(value(context,'flavorCue("day")'),/combat turn.*battle plan/i);
  assert.match(value(context,'flavorCue("structure")'),/Account → Campaign → Ad Set\/Ad Group → Ad → Creative/);
}

// Previously collided analogies now preserve the distinct real objects and control scopes.
{
  const {context}=makeContext("?mode=5&seed=192");
  for(const [flavorId,left,right] of [["agriculture","account","operating company"],
    ["f1","ad","platform initiative"],["agriculture","match type","targeting"],["vc","saturation","demand index"]]){
    const aliases=Array.from(value(context,`[flavorAliasForTerm(${JSON.stringify(left)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}]),flavorAliasForTerm(${JSON.stringify(right)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}])]`));
    assert.notEqual(aliases[0],aliases[1],`${flavorId} collapsed ${left} into ${right}`);
  }
}

// Dedicated flavor fields must remain semantically distinct instead of collapsing into broad metaphors.
{
  const {context}=makeContext("?mode=5&seed=19&flavor=dnd");
  const alias=label=>value(context,`statFlavorAlias(${JSON.stringify(label)})`);
  assert.equal(alias("Cash"),value(context,"FLAVOR_BY_ID.dnd.terms.cash"));
  assert.equal(alias("Available credit"),value(context,"FLAVOR_BY_ID.dnd.terms.credit"));
  assert.equal(alias("Credit holds"),value(context,"FLAVOR_BY_ID.dnd.terms.credit"));
  assert.equal(alias("Portfolio allocation"),value(context,"FLAVOR_BY_ID.dnd.terms.budget"));
  assert.equal(alias("Open crises"),value(context,"FLAVOR_BY_ID.dnd.terms.crisis"));
  assert.equal(alias("Demand index"),value(context,"FLAVOR_BY_ID.dnd.terms.demand"));
  assert.equal(alias("Unsettled"),value(context,"FLAVOR_BY_ID.dnd.terms.receivable"));
  assert.notEqual(alias("Unknown bucket"),alias("Unsettled"));
  assert.notEqual(alias("Account ROI"),alias("Ad ROI"));
  for(const [term,key] of [["targeting","targeting"],["holding company","holding"],["operating company","operatingCompany"],
    ["platform initiative","initiative"],["cash","cash"],["credit line","credit"],["receivable","receivable"],
    ["account view","accountView"],["ad view","attributedView"]]){
    assert.equal(value(context,`flavorAliasForTerm(${JSON.stringify(term)},FLAVOR_BY_ID.dnd)`),
      value(context,`FLAVOR_BY_ID.dnd.terms.${key}`),`${term} mapped to the wrong D&D concept`);
  }
}

// Every flavor uses a recognizable pictogram instead of a text abbreviation masquerading as an icon.
{
  const {context}=makeContext("?mode=1&flavor=agriculture");
  const expectedMarks={deckbuilder:"🃏",jrpg:"⚔️",agriculture:"🚜",kitchen:"🍽️",
    f1:"🏎️",fishing:"🎣",mixing:"🎚️",vc:"📈",dnd:"🎲"};
  assert.deepEqual(Object.fromEntries(Array.from(value(context,"FLAVORS"),flavor=>[flavor.id,flavor.mark])),expectedMarks);
  assert.equal(value(context,"currentFlavor().mark"),"🚜");
  assert.equal(value(context,"FLAVOR_BY_ID.kitchen.mark"),"🍽️");
  assert.equal(value(context,"currentFlavor().terms.audience"),"field cohort");
  assert.equal(value(context,"currentFlavor().terms.pixel"),"sensor network");
  assert.equal(value(context,"currentFlavor().terms.bid"),"valve setting");
  assert.equal(value(context,"currentFlavor().terms.targeting"),"sensor-guided valve plan");
  const structuralFlavors=Array.from(value(context,"FLAVORS"));
  for(const flavor of structuralFlavors){
    assert.notEqual(flavor.metrics.ad,flavor.terms.creative,`${flavor.id} collapses the delivery object into its creative`);
    assert.notEqual(flavor.terms.fatigue,flavor.terms.saturation,`${flavor.id} collapses creative fatigue into audience saturation`);
  }
  assert.equal(value(context,"FLAVOR_BY_ID.jrpg.metrics.ad"),"deployed party member");
  assert.equal(value(context,"FLAVOR_BY_ID.agriculture.metrics.ad"),"treatment application");
  assert.equal(value(context,"FLAVOR_BY_ID.kitchen.metrics.ad"),"menu listing");
  assert.equal(value(context,"FLAVOR_BY_ID.kitchen.terms.creative"),"dish, description and presentation");
  assert.equal(value(context,"FLAVOR_BY_ID.deckbuilder.terms.saturation"),"remaining scoring opportunities");
  assert.match(value(context,"currentFlavor().signature"),/Audience ≈ field.*Budget ≈ water reserve.*Pixel ≈ sensor network/);
  assert.deepEqual(Object.fromEntries(Array.from(value(context,"Object.values(CREATIVE_FORMATS)"),format=>[format.id,format.mark])),{
    story:"📱",vsl:"🎬",podcast:"🎙️",slideshow:"🗂️",veo:"✨",ugc_interview:"🤳",qvc_demo:"🛍️",breaking_news:"📡",ctv_spot:"📺",news_greenscreen:"🗞️",documentary:"🦌",
    meme:"😄",voicemail:"📞",static:"🖼️",animation:"🎞️",branded:"🏷️",native_long_copy:"📜",long_copy_video:"📽️",search:"🔍"
  });
}

// The expanded creative catalog is mechanically complete, platform-aware, and analogy-safe.
{
  const {context}=makeContext("?mode=1&seed=20&flavor=dnd");
  const requested=["story","vsl","podcast","slideshow","ugc_interview","qvc_demo","breaking_news","ctv_spot","news_greenscreen","documentary","meme","voicemail",
    "static","animation","branded","native_long_copy","long_copy_video"];
  assert.deepEqual(Array.from(value(context,"selectableCreativeFormats()"),format=>format.id),requested);
  const formats=Array.from(value(context,"selectableCreativeFormats()"));
  assert.equal(value(context,'selectableCreativeFormats().some(format=>format.id==="veo")'),false,
    "AI generation still masquerades as a complete execution type");
  assert.equal(value(context,"Object.keys(CREATIVE_CONCEPTS).length"),12);
  assert.equal(value(context,"Object.keys(CREATIVE_PRODUCTION_METHODS).length"),7);
  assert(value(context,'CREATIVE_PRODUCTION_METHODS.ai_generated.qualityM<CREATIVE_PRODUCTION_METHODS.live_action.qualityM'));
  assert(value(context,'CREATIVE_PRODUCTION_METHODS.ai_generated.volatility>CREATIVE_PRODUCTION_METHODS.live_action.volatility'));
  assert.equal(new Set(formats.map(format=>format.mark)).size,formats.length,"creative format pictograms must be unique");
  for(const format of formats){
    assert(typeof format.mark==="string"&&[...format.mark].length>0,`${format.id}.mark is incomplete`);
    for(const field of ["label","kind","description","production","tradeoff"])
      assert(typeof format[field]==="string"&&format[field].length>2,`${format.id}.${field} is incomplete`);
    for(const field of ["productionDays","productionCostM","reviewRiskM","volatility","cpmM","ctrM","cvrM","qualityM","fatigueM"])
      assert(Number.isFinite(format[field])&&format[field]>0,`${format.id}.${field} is invalid`);
    for(const lane of ["google","google_dgen","meta","tiktok","snap","linkedin","ctv"])
      assert(Number.isFinite(format.fit[lane])&&format.fit[lane]>0,`${format.id} omitted ${lane} fit`);
    for(const style of ["lead_gen","commerce","b2b","app","brand"])
      assert(Number.isFinite(format.styleFit[style])&&format.styleFit[style]>0,`${format.id} omitted ${style} objective fit`);
  }
  assert.equal(value(context,'creativeFormatById("ugc").id'),"ugc","legacy UGC save physics were not preserved");
  assert.equal(value(context,'creativeFormatById("founder").id'),"founder","legacy explainer save physics were not preserved");
  assert.equal(value(context,'canonicalCreativeFormatId("ugc")'),"story");assert.equal(value(context,'canonicalCreativeFormatId("founder")'),"vsl");
  for(const flavor of Array.from(value(context,"FLAVORS"))){
    for(const term of ["story ad","vsl","podcast creative","veo creative","nat geo documentary","native long-copy","long-copy to video"]){
      const alias=value(context,`flavorAliasForTerm(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavor.id)}])`);
      assert(typeof alias==="string"&&alias.length>8&&!/undefined/i.test(alias),`${flavor.id} omitted the ${term} analogy`);
    }
  }

  const systems=Array.from(value(context,"Object.values(CREATIVE_SYSTEMS)"));
  assert.deepEqual(systems.map(system=>system.label),["Conversational and Long-Form","Fast-Turn Hook Concepts",
    "Structured Explanation and Proof","Modular Visual Production","Search Text Assets"]);
  for(const system of systems){
    assert(system.groupingReason.length>45,`${system.id} does not explain why its entries share a workflow family`);
    assert.doesNotMatch(system.label,/engine|factory|lab|system/i,`${system.id} still presents game flavor as a standard taxonomy label`);
  }
  vm.runInContext("creativeFormatPicker()",context);
  const picker=context.document.getElementById("overlay").innerHTML;
  assert.match(picker,/id="creativeConceptSelect"/);assert.match(picker,/id="creativeMethodSelect"/);
  assert.match(picker,/Continue with this blueprint/);
  for(const step of ["Concept / mechanism","Execution type","Production method","Evidence scope"])assert(picker.includes(step),
    `Creative Lab does not explain the ${step} layer`);
  for(const phrase of ["language, market, presenter, duration","routing","AI-generated scenes"])
    assert(picker.includes(phrase),`Creative Lab does not explain ${phrase}`);
  for(const system of systems.filter(system=>system.id!=="search")){
    const labels=formats.filter(format=>format.system===system.id).map(format=>format.label);
    assert(labels.length>=3,`${system.id} has too few real entries to explain its grouping`);
    for(const label of labels)assert(picker.includes(label),`${system.label} does not list ${label} while collapsed`);
  }
  assert.match(picker,/Common, Epic and Legendary are game rarity rolls after the blueprint is submitted/i);
  assert.match(picker,/What it is · (?:placement-led format|persuasion structure|production method|presentation style)/i);
  assert.match(picker,/Modeled fit ·/);assert.match(picker,/Modeled tendencies in To The Moon/);
  assert.doesNotMatch(picker,/Core analogy Rosetta|Signature mapping|Media funnel:/,
    "Creative Lab frontloaded the full analogy reference below an already dense decision screen");
  assert.match(css,/\.creative-taxonomy-flow\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,
    "the four-part Creative Lab hierarchy has no desktop flow layout");
  assert.match(css,/@media \(max-width:520px\)[^{]*\{[^}]*\.creative-taxonomy-guide/,
    "the Creative Lab explanation does not adapt on a phone-sized viewport");

  const portfolio=makeContext("?mode=5&days=90&budget=20000&seed=20&flavor=dnd");
  assert.equal(value(portfolio.context,`(()=>{const account=S.accounts.find(item=>NightmareEngine.lanes[item.platform].kind!=="search");
    return NightmareEngine.handleAction({dataset:{id:account.id,night:"format-picker"}})})()`),true,
    "Portfolio Command could not open its creative catalog");
  const portfolioPicker=portfolio.registry.overlay.innerHTML;
  assert.match(portfolioPicker,/Build one creative blueprint/i,
    "Portfolio Command presents workflow families without explaining the blueprint");
  assert.match(portfolioPicker,/What it is ·/);assert.match(portfolioPicker,/Modeled tendencies in To The Moon/);
  for(const system of systems.filter(system=>system.id!=="search")){
    assert(portfolioPicker.includes(system.label),`Portfolio Command omitted the ${system.label} family`);
    assert(portfolioPicker.includes(system.groupingReason),`Portfolio Command did not explain the ${system.label} grouping`);
  }
  assert.doesNotMatch(portfolioPicker,/Core analogy Rosetta|Signature mapping|Media funnel:/,
    "Portfolio Command frontloaded the full analogy reference below its creative catalog");
}

}

if(smokeShard==="b1"){
// Choosing a format changes real production and delivery state before rarity is applied.
{
  const immediate=makeContext("?mode=1&seed=420");
  vm.runInContext("creativeFormatPicker()",immediate.context);
  const formatButtons=immediate.registry.overlay.querySelectorAll("button[data-format-id]");
  const beforeChoice=JSON.stringify(state(immediate.context));
  assert.equal(formatButtons.length,17);formatButtons.find(button=>button.dataset.formatId==="meme").onclick();
  assert.equal(JSON.stringify(state(immediate.context)),beforeChoice,"selecting a blueprint submitted it before Continue");
  immediate.registry.creativeBuildContinue.onclick();
  assert.equal(immediate.registry.overlay.innerHTML,"");
  assert.equal(state(immediate.context).readyCreative[0].format,"meme");
  assert.equal(state(immediate.context).costBreakdown.creative,350);
  const direct=makeContext("?mode=1&seed=420");
  vm.runInContext('requestCreative("meme")',direct.context);assert.equal(state(direct.context).readyCreative[0].format,"meme");
  const faceted=makeContext("?mode=1&seed=420");
  vm.runInContext('requestCreative("static","bill_reveal","ai_generated")',faceted.context);
  assert.equal(state(faceted.context).readyCreative[0].concept,"bill_reveal");
  assert.equal(state(faceted.context).readyCreative[0].productionMethod,"ai_generated");
  assert.match(value(faceted.context,'creativeEvidenceLabel(S.readyCreative[0],false)'),/no creative verdict/i);
  const pipeline=makeContext("?mode=3&seed=420");
  vm.runInContext('requestCreative("vsl")',pipeline.context);
  const request=state(pipeline.context).requests[0];
  assert.equal(request.c.format,"vsl");assert([8,9].includes(request.days));assert.equal(request.reviewRiskM,1.2393);
  assert.equal(state(pipeline.context).costBreakdown.creative,3250);
}

// Concept and production method are independent mechanical axes, not decorative subtitles.
{
  const live=makeContext("?mode=1&seed=1422"),generated=makeContext("?mode=1&seed=1422"),comparison=makeContext("?mode=1&seed=1422");
  vm.runInContext('S.slots[0].c={...S.slots[0].c,format:"static",concept:"bill_reveal",productionMethod:"live_action"};runDay()',live.context);
  vm.runInContext('S.slots[0].c={...S.slots[0].c,format:"static",concept:"bill_reveal",productionMethod:"ai_generated"};runDay()',generated.context);
  vm.runInContext('S.slots[0].c={...S.slots[0].c,format:"static",concept:"comparison",productionMethod:"live_action"};runDay()',comparison.context);
  const liveLast=state(live.context).slots[0].last,generatedLast=state(generated.context).slots[0].last,comparisonLast=state(comparison.context).slots[0].last;
  assert.notEqual(liveLast.epl,generatedLast.epl,"production method did not affect downstream quality");
  assert.notEqual(liveLast.ctr,generatedLast.ctr,"production method did not affect response");
  assert.notEqual(liveLast.cvr,comparisonLast.cvr,"concept did not affect conversion physics");
}

// The format is not cosmetic: hold the concept, seed, budget, and day constant and delivery changes.
{
  const staticRun=makeContext("?mode=1&seed=422"),storyRun=makeContext("?mode=1&seed=422");
  vm.runInContext('S.slots[0].c={...S.slots[0].c,format:"static"};runDay()',staticRun.context);
  vm.runInContext('S.slots[0].c={...S.slots[0].c,format:"story"};runDay()',storyRun.context);
  const staticLast=state(staticRun.context).slots[0].last,storyLast=state(storyRun.context).slots[0].last;
  assert.notEqual(staticLast.cpm,storyLast.cpm,"format choice did not change CPM physics");
  assert.notEqual(staticLast.ctr,storyLast.ctr,"format choice did not change response physics");
  assert.notEqual(staticLast.cvr,storyLast.cvr,"format choice did not change conversion physics");
  assert.notEqual(staticLast.epl,storyLast.epl,"format choice did not change downstream-quality physics");
}

// Portfolio mode exposes every format by lane and honors the format production clock.
{
  const fixture=makeContext("?mode=5&days=90&budget=20000&seed=421"),s=state(fixture.context);
  for(const [lane,deck] of Object.entries(value(fixture.context,"NightmareEngine.formatDeck"))){
    const ids=Array.from(deck),kind=value(fixture.context,`NightmareEngine.lanes[${JSON.stringify(lane)}].kind`);
    if(kind==="search")assert.deepEqual(ids,["search"]);else{assert(ids.length>=7,`${lane} has too little format breadth`);assert(!ids.includes("search"));}
    for(const id of ids)assert(value(fixture.context,`!!CREATIVE_FORMATS[${JSON.stringify(id)}]`),`${lane} contains unknown format ${id}`);
  }
  const target=s.accounts.find(account=>value(fixture.context,`NightmareEngine.lanes[${JSON.stringify(account.platform)}].kind`)!=="search"),oldFormat=target.creative.format;
  assert.equal(value(fixture.context,`NightmareEngine.handleAction({dataset:{night:"format-picker",id:${JSON.stringify(target.id)}}})`),true);
  const nightmareFormatButtons=fixture.registry.overlay.querySelectorAll("button[data-night-format]");assert.equal(nightmareFormatButtons.length,17);
  vm.runInContext("close()",fixture.context);
  assert.equal(value(fixture.context,`NightmareEngine.commissionCreative(S,S.accounts.find(a=>a.id===${JSON.stringify(target.id)}),"documentary")`),true);
  const queued=state(fixture.context).accounts.find(account=>account.id===target.id).creativeQueue;
  assert.equal(queued.format,"documentary");assert.equal(queued.readyDay-state(fixture.context).day,12);
  assert.equal(state(fixture.context).accounts.find(account=>account.id===target.id).creative.format,oldFormat,"commission replaced the live creative early");
  vm.runInContext(`S.day=S.accounts.find(a=>a.id===${JSON.stringify(target.id)}).creativeQueue.readyDay;
    S.dayState={day:S.day,mood:{label:"Stable",detail:"baseline",tone:"",cpmM:1},event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,fixture.context);
  assert.equal(state(fixture.context).accounts.find(account=>account.id===target.id).creative.format,"documentary");
  assert.equal(state(fixture.context).accounts.find(account=>account.id===target.id).creativeQueue,null);
  assert.deepEqual(Array.from(value(fixture.context,"NightmareEngine.validate()")),[]);
}

// Structural screenshot examples never enter the public simulation as people, IDs, or copied rows.
for(const privateToken of ["Larysa FL","Nate P","120284","yM4WVB","yBwgBG"])
  assert(!sourceCorpus.includes(privateToken),`private screenshot token leaked into the app: ${privateToken}`);

// Query choice wins over saved choice; an invalid query falls back to the valid saved flavor.
{
  const localStore=new Map([["media-buying-trainer-flavor-v1","f1"]]);
  assert.equal(value(makeContext("?mode=1&seed=20",{localStore}).context,"ACTIVE_FLAVOR"),"f1");
  assert.equal(value(makeContext("?mode=1&seed=20&flavor=dnd",{localStore}).context,"ACTIVE_FLAVOR"),"dnd");
  localStore.set("media-buying-trainer-flavor-v1","mixing");
  const invalid=makeContext("?mode=1&seed=20&flavor=not-real",{localStore});
  assert.equal(value(invalid.context,"ACTIVE_FLAVOR"),"mixing");
  assert.match(invalid.history.lastUrl,/flavor=mixing/);
}

// The D20 flavor contains the requested D&D Rosetta Stone while retaining real terms first.
{
  const {context,registry}=makeContext("?mode=4&seed=21&flavor=dnd");
  assert.equal(value(context,"currentFlavor().terms.buyer"),"party leader");
  assert.equal(value(context,"currentFlavor().terms.platform"),"game world and rules");
  assert.match(value(context,"currentFlavor().terms.algorithm"),/encounter (?:resolution|rules)/i);
  assert.match(value(context,"currentFlavor().terms.algorithm"),/modifiers|dice/i);
  /* 2026-08-08 correction: an adventurer equips a weapon, prepares a spell or readies an item —
     never a "message" or "tactic". The source side of an analogy stays true to its own domain. */
  assert.equal(value(context,"currentFlavor().terms.creative"),"equipped weapon, prepared spell or readied item");
  assert.equal(value(context,"currentFlavor().terms.fatigue"),"exhaustion and spent abilities");
  assert.equal(value(context,"currentFlavor().terms.audience"),"encounter population");
  assert.doesNotMatch(sourceCorpus,/\bd20 table\b/i,"the discarded d20-table mapping remains in player-facing code");
  const dndLayers=JSON.parse(value(context,`JSON.stringify({
    platform:currentFlavor().terms.platform,
    campaign:currentFlavor().terms.campaign,
    lane:currentFlavor().terms.initiative,
    algorithm:currentFlavor().terms.algorithm
  })`));
  assert.equal(new Set(Object.values(dndLayers).map(label=>label.toLowerCase())).size,Object.keys(dndLayers).length,
    "D&D collapsed platform, campaign, buying lane and algorithm into one layer");
  const structureCue=value(context,'flavorCue("structure")').toLowerCase();
  for(const [real,alias] of [["platform",dndLayers.platform],["campaign",dndLayers.campaign],["buying lane",dndLayers.lane]])
    assert(structureCue.includes(`${real} ≈ ${alias.toLowerCase()}`),`D&D structure cue omitted ${real} → ${alias}`);
  const platformModel=JSON.parse(value(context,'JSON.stringify(flavorMechanicModel("platform",currentFlavor()))'));
  assert.match(platformModel.source,/game world.*rules|world.*rules/i,
    "D&D platform card did not explain what the game world and rules are in plain language");
  assert.equal(platformModel.alias,"game world and rules","D&D platform card omitted its explicit world-and-rules mapping");
  assert.doesNotMatch(platformModel.connection,/\bd20|dice\b/i,"D&D platform card still describes a platform as dice");
  for(const [term,alias] of [["buying lane","quest lane"],["targeting","encounter targeting rule"]]){
    const model=JSON.parse(value(context,`JSON.stringify(flavorMechanicModel(${JSON.stringify(term)},currentFlavor()))`));
    assert.equal(model.alias,alias,`D&D ${term} lost its plain source-domain label`);
    for(const part of ["source","connection","boundary"])assert(String(model[part]||"").trim(),`D&D ${term} did not explain its ${part}`);
  }
  assert.match(value(context,'eventFlavorText("viral")'),/Natural 20/);
  assert.match(value(context,'eventFlavorText("surge")'),/game world|encounter conditions/i);
  assert.match(value(context,"currentFlavor().signature"),/Fighter.*Rogue.*Wizard.*Cleric/);
  assert.match(registry.realityBar.innerHTML,/Cross-platform paid social \+ Google display \/ Demand Gen/);
  for(const platform of ["Google","Snapchat","Meta","TikTok"])assert(registry.realityBar.innerHTML.includes(platform));
  for(const hierarchy of ["ad group → ad","ad set → ad","ad squad → ad"])assert(registry.realityBar.innerHTML.includes(hierarchy));
  assert.match(registry.realityBar.innerHTML,/In-house/);
  /* A card states plainly what it IS and where it runs. The old per-card analogy line
     ("Ad ≈ deployed adventurer · Creative ≈ equipped weapon") repeated on every card and
     told a player nothing about the account (2026-08-09). */
  assert.match(registry.slots.innerHTML,/One <b>ad<\/b> running on/);
  assert.doesNotMatch(registry.slots.innerHTML,/Ad ≈/,"the per-card analogy line returned");
  assert.equal(value(context,'statFlavorAlias("Spend")'),"gold spent");
  assert.equal(value(context,'statFlavorAlias("ROAS")'),"loot-per-gold multiplier");
  assert.equal(value(context,'statFlavorAlias("Unsettled")'),"loot awaiting identification");
  const blackout=value(context,'nightmareEventFlavorText("blackout")');
  assert.match(blackout,/delivery and modeled value continue/i);
  assert.match(blackout,/reported .* credit is suppressed/i);
  assert.doesNotMatch(blackout,/platform is unavailable|another initiative/i);
}

// Every flavor boots and runs under every mode without contaminating the simulation surface.
for(const flavor of ["deckbuilder","jrpg","agriculture","kitchen","f1","fishing","mixing","vc","dnd"]){
  for(let mode=0;mode<=6;mode++){
    const {context,registry}=makeContext(`?mode=${mode}&seed=25&flavor=${flavor}`);
    vm.runInContext("runDay()",context);
    finiteTree(state(context));
    assert.equal(value(context,"ACTIVE_FLAVOR"),flavor);
    assert(!registry.realityBar.innerHTML.includes("undefined"),`${flavor}/mode ${mode} broke real-world context`);
    assert(!registry.log.innerHTML.includes("undefined"),`${flavor}/mode ${mode} broke log output`);
    assert.equal(value(context,"S.log[0].concept.length>0"),true);
  }
}

// Action logs carry explicit semantic concepts rather than guessing from rendered prose.
{
  const modern=makeContext("?mode=3&seed=26&flavor=vc");
  vm.runInContext("requestCreative()",modern.context);
  assert.equal(state(modern.context).log[0].concept,"creative");
  const classic=makeContext("?mode=0&seed=26&flavor=vc");
  vm.runInContext('addLog("<div>arbitrary wording</div>","measurement");renderClassic()',classic.context);
  assert.equal(state(classic.context).log[0].concept,"measurement");
  assert.match(classic.registry.log.innerHTML,/reporting stack/);
}

// Mode 0 always identifies the actual client/agency paid-search job and hierarchy.
{
  const {context,registry}=makeContext("?mode=0&stage=2&seed=22&flavor=deckbuilder");
  assert.match(registry.realityBar.innerHTML,/Paid Search \/ PPC/);
  assert.match(registry.realityBar.innerHTML,/Google Ads-style Search/);
  assert.match(registry.realityBar.innerHTML,/Client-based agency/);
  assert.match(registry.realityBar.innerHTML,/Client → account → campaign → ad group → keyword \+ search ad/);
  assert.match(registry.accountBox.innerHTML,/To The Moon's account-wide daily limit/);
  assert.match(registry.slots.innerHTML,/Ad group/);
  assert.match(registry.slots.innerHTML,/Keyword/);
  assert.match(registry.slots.innerHTML,/card family/);
  assert.equal(value(context,"realWorldScope().team"),"Client-based agency");
}

// Classic tracking keeps reported and modeled value separate, and repairs only future reporting.
{
  const f=makeContext("?mode=0&stage=2&seed=7");
  vm.runInContext("runDay()",f.context);let s=state(f.context),broken=s.groups.find(group=>group.trackingBroken),brokenId=broken.id;
  assert(broken.last.convR<broken.last.convA);
  assert(broken.last.roasReported<broken.last.roasModeled);
  assert.equal(broken.last.roas,broken.last.roasReported);
  assert(s.reportedValueTotal<s.valueTotal);
  assert.match(f.registry.slots.innerHTML,/reported ROAS/i);
  const reportedBefore=s.reportedValueTotal,modeledBefore=s.valueTotal;
  f.registry.trackBtn.onclick();f.registry.closeB.onclick();
  assert.equal(state(f.context).reportedValueTotal,reportedBefore,"tracking repair rewrote historical reports");
  assert.equal(state(f.context).valueTotal,modeledBefore,"tracking repair rewrote modeled value");
  vm.runInContext("runDay()",f.context);broken=state(f.context).groups.find(group=>group.id===brokenId);
  approx(broken.last.roasReported,broken.last.roasModeled,1e-9,"future Classic tracking did not reconcile");
}

// Classic cards render a real search ad and explain the keyword-level Quality Score diagnostic.
{
  const f=makeContext("?mode=0&stage=1&seed=801");
  assert.equal((f.registry.slots.innerHTML.match(/class="classic-ad-preview"/g)||[]).length,4,
    "each starting ad group needs an actual ad preview");
  for(const copy of ["Commercial Concrete","Project-ready concrete crews.","Concrete Contractors Near You",
    "Concrete Patio Cost Guide","Pour A Concrete Slab"])
    assert(f.registry.slots.innerHTML.includes(copy),`starting search copy is missing: ${copy}`);
  assert.match(f.registry.slots.innerHTML,/Search ads · 1 active \/ 1 total/);
  assert.match(f.registry.slots.innerHTML,/Expected CTR/);assert.match(f.registry.slots.innerHTML,/Ad relevance/);
  assert.match(f.registry.slots.innerHTML,/Landing page experience/);
  assert.match(f.registry.slots.innerHTML,/keyword-level diagnostic, not a key performance indicator or a literal auction input/i);
  assert.match(f.registry.accountBox.innerHTML,/A bid change can alter auction pressure, but it cannot raise Quality Score/);
  assert.match(f.registry.accountBox.innerHTML,/Replace.*differently worded copy.*A\/B permutation.*changes one declared axis/s);
}

// Match-type syntax is visible on the keyword itself: quotes for phrase, plain broad, and brackets for exact.
{
  const f=makeContext("?mode=0&stage=1&seed=800"),keyword="commercial concrete contractors";
  const keywordMarkup=match=>new RegExp(`<div class="classic-keyword-text" aria-label="${match} match keyword: ${keyword}">([^<]+)<\\/div>`)
    .exec(f.registry.slots.innerHTML)?.[1];
  assert.equal(keywordMarkup("phrase"),`&quot;${keyword}&quot;`);
  clickClassic(f,"match",0);assert.equal(state(f.context).groups[0].match,"broad");assert.equal(keywordMarkup("broad"),keyword);
  clickClassic(f,"match",0);assert.equal(state(f.context).groups[0].match,"exact");assert.equal(keywordMarkup("exact"),`[${keyword}]`);
  clickClassic(f,"match",0);assert.equal(state(f.context).groups[0].match,"phrase");assert.equal(keywordMarkup("phrase"),`&quot;${keyword}&quot;`);
}

// A rewrite replaces authored copy, preserves structure, changes only copy-related quality, and cannot stack in one day.
{
  const f=makeContext("?mode=0&stage=1&seed=8");
  assert.doesNotMatch(f.registry.pipeBox.innerHTML,/id="delivBtn"/);
  vm.runInContext('S.delivery="accelerated";runDay()',f.context);
  assert.equal(state(f.context).telemetry.acceleratedDays,0,"Stage 1 used a Stage 2 delivery mechanic");
  const before=JSON.parse(value(f.context,`JSON.stringify((g=>({campaignId:g.campaignId,core:g.core,match:g.match,maxCPC:g.maxCPC,
    copyId:g.ads[0].copyId,headline:classicCopy(g.ads[0].copyId,g.id).headlines.join(" | "),
    ctrM:classicCopy(g.ads[0].copyId,g.id).ctrM||1,relM:classicCopy(g.ads[0].copyId,g.id).relM||1,quality:g.quality,qs:g.qs}))(S.groups[0]))`));
  clickClassic(f,"rewrite",0);
  const after=JSON.parse(value(f.context,`JSON.stringify((g=>({campaignId:g.campaignId,core:g.core,match:g.match,maxCPC:g.maxCPC,
    copyId:g.ads[0].copyId,previousCopyId:g.ads[0].previousCopyId,headline:classicCopy(g.ads[0].copyId,g.id).headlines.join(" | "),
    ctrM:classicCopy(g.ads[0].copyId,g.id).ctrM||1,relM:classicCopy(g.ads[0].copyId,g.id).relM||1,
    version:g.ads[0].version,quality:g.quality,qs:g.qs}))(S.groups[0]))`));
  assert.notEqual(after.copyId,before.copyId);assert.notEqual(after.headline,before.headline);
  assert.equal(after.previousCopyId,before.copyId);assert.equal(after.version,2);
  assert.equal(after.campaignId,before.campaignId);assert.equal(after.core,before.core);
  assert.equal(after.match,before.match);assert.equal(after.maxCPC,before.maxCPC);
  approx(after.quality.expectedCtr,before.quality.expectedCtr+(after.ctrM-before.ctrM)*5);
  approx(after.quality.adRelevance,before.quality.adRelevance+(after.relM-before.relM)*5);
  approx(after.quality.landingExperience,before.quality.landingExperience);assert(after.qs>before.qs);
  assert(f.registry.slots.innerHTML.includes(after.headline));assert.match(f.registry.slots.innerHTML,/What the rewrite replaced/);
  assert(f.registry.slots.innerHTML.includes(before.headline));assert.match(f.registry.log.innerHTML,/Ad A replaced/);
  const once=value(f.context,'JSON.stringify({group:S.groups[0],rewrites:S.telemetry.adRewrites,log:S.log})');
  clickClassic(f,"rewrite",0);
  assert.equal(value(f.context,'JSON.stringify({group:S.groups[0],rewrites:S.telemetry.adRewrites,log:S.log})'),once,
    "Rewrite repeated on the same day");

  const qualityBeforeBid=value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs})");
  clickClassic(f,"bid+",0);assert.equal(value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs})"),qualityBeforeBid,
    "raising a bid incorrectly raised Quality Score");
  vm.runInContext("S.groups[0].maxCPC=.25;renderClassic()",f.context);clickClassic(f,"bid-",0);
  assert.equal(state(f.context).groups[0].maxCPC,.25);
  vm.runInContext("S.groups[0].maxCPC=8;renderClassic()",f.context);clickClassic(f,"bid+",0);
  assert.equal(state(f.context).groups[0].maxCPC,8);
}

// Rewriting can deliberately trade click appeal for better qualification instead of acting like a universal buff.
{
  const f=makeContext("?mode=0&stage=1&seed=807"),g=state(f.context).groups[3];
  const before={qs:g.qs,cvrM:value(f.context,'classicCopy(S.groups[3].ads[0].copyId,S.groups[3].id).cvrM'),
    ctr:g.quality.expectedCtr,relevance:g.quality.adRelevance};
  clickClassic(f,"rewrite",3);
  const afterCopy=JSON.parse(value(f.context,'JSON.stringify(classicCopy(S.groups[3].ads[0].copyId,S.groups[3].id))'));
  assert(afterCopy.cvrM>before.cvrM,"the qualified DIY rewrite did not improve post-click fit");
  assert(g.quality.expectedCtr<before.ctr);assert(g.quality.adRelevance<before.relevance);assert(g.qs<before.qs);
  assert.match(f.registry.log.innerHTML,/Simulated diagnostic response/);
}

// A/B permutations are separate rotating ads with one controlled copy change and no automatic Quality Score reward.
{
  const f=makeContext("?mode=0&stage=1&seed=802"),g=state(f.context).groups[0];
  const before=value(f.context,'JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs,campaignId:S.groups[0].campaignId,lead:S.groups[0].ads[0]})');
  const controlHeadline=value(f.context,'classicCopy(S.groups[0].ads[0].copyId,S.groups[0].id).headlines.join(" | ")');
  clickClassic(f,"variant",0);
  assert.equal(g.ads.length,2);assert.equal(g.ads[1].copyId,"commercial:permutation:0");
  assert.notEqual(g.ads[1].copyId,g.ads[0].copyId);assert.equal(value(f.context,"classicAdKind(S.groups[0].ads[1])"),"permutation");
  assert.equal(value(f.context,'classicAdCopy(S.groups[0],S.groups[0].ads[1]).headlines.join(" | ")'),controlHeadline,
    "the controlled permutation stopped preserving the lead idea");
  assert(value(f.context,'classicAdCopy(S.groups[0],S.groups[0].ads[1]).axis.length>0'));
  assert.equal(value(f.context,'JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs,campaignId:S.groups[0].campaignId,lead:S.groups[0].ads[0]})'),before,
    "adding a permutation changed the control, structure, or Quality Score before evidence existed");
  assert.match(f.registry.slots.innerHTML,/Controlled change · Call to action/);assert.match(f.registry.slots.innerHTML,/Call to action permutation/);
  assert.equal(state(f.context).telemetry.adVariants,1);
  const once=value(f.context,'JSON.stringify({group:S.groups[0],variants:S.telemetry.adVariants,log:S.log})');
  clickClassic(f,"variant",0);
  assert.equal(value(f.context,'JSON.stringify({group:S.groups[0],variants:S.telemetry.adVariants,log:S.log})'),once,
    "A/B permutation repeated on the same day");
}

// A permutation is built from the currently visible lead copy, including after a full rewrite.
{
  const f=makeContext("?mode=0&stage=1&seed=808");
  clickClassic(f,"rewrite",0);
  const lead=JSON.parse(value(f.context,'JSON.stringify(classicAdCopy(S.groups[0],S.groups[0].ads[0]))')),
    leadCopyId=state(f.context).groups[0].ads[0].copyId;
  clickClassic(f,"variant",0);
  const g=state(f.context).groups[0],variant=g.ads[1],variantCopy=JSON.parse(value(f.context,
    'JSON.stringify(classicAdCopy(S.groups[0],S.groups[0].ads[1]))'));
  assert.equal(variant.baseCopyId,leadCopyId,"the A/B sibling did not bind to the rewritten control");
  assert.deepEqual(variantCopy.headlines,lead.headlines,"the permutation reverted to the original headline idea");
  assert.equal(variantCopy.path,lead.path,"the permutation unexpectedly changed the destination path");
  assert.notDeepEqual(variantCopy.descriptions,lead.descriptions,"the declared one-axis permutation changed no visible copy");
  assert(variantCopy.axis.length>0);assert.match(f.registry.log.innerHTML,/starts from the current Ad A/);
}

// Replacing the control retires A/B siblings tied to its old wording but preserves other-format tests.
{
  const f=makeContext("?mode=0&stage=1&seed=809");
  clickClassic(f,"variant",0);clickClassic(f,"expanded",0);
  const g=state(f.context).groups[0],oldPermutationId=g.ads[1].id;
  assert.equal(g.ads.length,3);
  clickClassic(f,"rewrite",0);
  assert.equal(g.ads.length,2);assert(!g.ads.some(ad=>ad.id===oldPermutationId));
  assert.deepEqual(Array.from(g.ads,ad=>value(f.context,
    `classicAdKind(S.groups[0].ads.find(item=>item.id===${JSON.stringify(ad.id)}))`)),["standard","expanded"]);
  assert.equal(g.previewAdId,g.ads[0].id);assert.equal(g.variantCount,1,"lifetime test telemetry was erased");
  assert.match(f.registry.log.innerHTML,/old-copy A\/B permutation was retired/);
}

// Delivery evidence belongs to one authored copy version; replacing the text cannot inherit yesterday's result.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=300&seed=810");
  vm.runInContext("runDay()",f.context);
  const g=state(f.context).groups[0],oldRow=g.last.adBreakdown[0],oldKey=oldRow.adKey;
  assert.equal(g.last.day,1);assert.equal(oldKey,value(f.context,"classicAdEvidenceKey(S.groups[0].ads[0])"));
  assert.match(value(f.context,"classicAdPreviewMarkup(S.groups[0],S.groups[0].ads[0],0,0)"),/Day 1 ·/);
  clickClassic(f,"rewrite",0);
  const newKey=value(f.context,"classicAdEvidenceKey(S.groups[0].ads[0])"),freshMarkup=value(f.context,
    "classicAdPreviewMarkup(S.groups[0],S.groups[0].ads[0],0,0)");
  assert.notEqual(newKey,oldKey);assert.match(freshMarkup,/No delivery evidence for this copy version yet/);
  assert.doesNotMatch(freshMarkup,/Day 1 ·/);assert.deepEqual({...g.ads[0].stats},{impr:0,clicks:0,convR:0,spend:0});
  vm.runInContext("runDay()",f.context);
  assert.equal(g.last.day,2);assert.equal(g.last.adBreakdown[0].adKey,newKey);
  assert.match(value(f.context,"classicAdPreviewMarkup(S.groups[0],S.groups[0].ads[0],0,0)"),/Day 2 ·/);
}

// Individual ad controls alter the rotation, retain Quality Score, and reopen a full test slot after retirement.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=20000&seed=811");
  clickClassic(f,"variant",0);const firstVariantId=state(f.context).groups[0].ads[1].id;
  clickClassic(f,"expanded",0);const quality=value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs})");
  clickClassic(f,"ad-toggle",0,{adId:firstVariantId});
  assert.equal(state(f.context).groups[0].ads.find(ad=>ad.id===firstVariantId).active,false);
  vm.runInContext("runDay()",f.context);
  assert(!state(f.context).groups[0].last.adBreakdown.some(row=>row.adId===firstVariantId),"a paused ad still received traffic");
  clickClassic(f,"ad-toggle",0,{adId:firstVariantId});
  assert.equal(state(f.context).groups[0].ads.find(ad=>ad.id===firstVariantId).active,true);
  clickClassic(f,"variant",0);assert.equal(state(f.context).groups[0].ads.length,4,"the test did not reach its four-ad cap");
  vm.runInContext("runDay()",f.context);
  assert(state(f.context).groups[0].last.adBreakdown.some(row=>row.adId===firstVariantId),"a resumed ad did not rejoin rotation");
  clickClassic(f,"ad-retire",0,{adId:firstVariantId});
  assert.equal(state(f.context).groups[0].ads.length,3);assert(!state(f.context).groups[0].ads.some(ad=>ad.id===firstVariantId));
  clickClassic(f,"variant",0);
  const replacementIds=state(f.context).groups[0].ads.map(ad=>ad.id);
  assert.equal(replacementIds.length,4,"retirement did not free the capped test slot");assert(!replacementIds.includes(firstVariantId));
  assert.equal(value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs})"),quality,
    "pause, resume, retirement, or a new sibling changed Quality Score without evidence");
}

// Mode 0 rerenders restore keyboard focus to the changed control or the selected ad preview.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=20000&seed=817");
  clickClassic(f,"variant",0);const variantId=state(f.context).groups[0].ads[1].id;
  assert.equal(f.context.document.activeElement?.dataset.ca,"preview");
  assert.equal(f.context.document.activeElement?.dataset.adId,variantId);
  clickClassic(f,"bid+",0);assert.equal(f.context.document.activeElement?.dataset.ca,"bid+");
  clickClassic(f,"ad-toggle",0,{adId:variantId});
  assert.equal(f.context.document.activeElement?.dataset.ca,"ad-toggle");
  assert.equal(f.context.document.activeElement?.dataset.adId,variantId);
  clickClassic(f,"ad-retire",0,{adId:variantId});
  assert.equal(f.context.document.activeElement?.dataset.ca,"preview");
  assert.equal(f.context.document.activeElement?.dataset.adId,state(f.context).groups[0].ads[0].id);
}

// Re-filling a retired permutation advances through the larger authored corpus without duplicating its surviving sibling.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=20000&seed=815");
  clickClassic(f,"variant",0);vm.runInContext("runDay()",f.context);clickClassic(f,"variant",0);
  let permutations=state(f.context).groups[0].ads.filter(ad=>value(f.context,
    `classicAdKind(S.groups[0].ads.find(item=>item.id===${JSON.stringify(ad.id)}))`)==="permutation");
  assert.deepEqual(Array.from(permutations,ad=>ad.copyId).sort(),["commercial:permutation:0","commercial:permutation:1"]);
  const missing=permutations.find(ad=>ad.copyId==="commercial:permutation:1");
  clickClassic(f,"ad-retire",0,{adId:missing.id});
  assert.deepEqual(Array.from(state(f.context).groups[0].ads.filter(ad=>ad.copyId.includes(":permutation:")),ad=>ad.copyId),
    ["commercial:permutation:0"]);
  vm.runInContext("runDay()",f.context);clickClassic(f,"variant",0);
  permutations=state(f.context).groups[0].ads.filter(ad=>ad.copyId.includes(":permutation:"));
  assert.deepEqual(Array.from(permutations,ad=>ad.copyId).sort(),["commercial:permutation:0","commercial:permutation:2"],
    "re-adding after retirement failed to advance to a fresh permutation recipe");
}

// A paused ad missing from the latest rotation still shows cumulative evidence, and retirement preserves a numeric snapshot.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=20000&seed=816");
  clickClassic(f,"variant",0);const variantId=state(f.context).groups[0].ads[1].id;
  vm.runInContext("runDay()",f.context);clickClassic(f,"ad-toggle",0,{adId:variantId});vm.runInContext("runDay()",f.context);
  const g=state(f.context).groups[0],ad=g.ads.find(item=>item.id===variantId);
  assert(ad.stats.impr>0);assert(!g.last.adBreakdown.some(row=>row.adId===variantId),"paused variant remained in latest evidence");
  const markup=value(f.context,`classicAdPreviewMarkup(S.groups[0],S.groups[0].ads.find(ad=>ad.id===${JSON.stringify(variantId)}),1,0)`);
  assert.match(markup,/Cumulative for this copy/);assert.match(markup,/currently paused/);
  assert.doesNotMatch(markup,/No delivery evidence|no delivery evidence/);
  assert(markup.includes(`${Math.round(ad.stats.impr)} impressions`));assert(markup.includes(`${Math.round(ad.stats.clicks)} clicks`));
  const finalEvidence={impr:Math.round(ad.stats.impr),clicks:Math.round(ad.stats.clicks),conv:ad.stats.convR.toFixed(1),
    spend:value(f.context,`money(${ad.stats.spend})`)};
  clickClassic(f,"ad-retire",0,{adId:variantId});
  assert(!state(f.context).groups[0].ads.some(item=>item.id===variantId));assert.match(f.registry.log.innerHTML,/Final copy-level evidence/);
  assert(f.registry.log.innerHTML.includes(`<b>${finalEvidence.impr}</b> impressions`));
  assert(f.registry.log.innerHTML.includes(`<b>${finalEvidence.clicks}</b> clicks`));
  assert(f.registry.log.innerHTML.includes(`<b>${finalEvidence.conv}</b> reported conversions`));
  assert(f.registry.log.innerHTML.includes(`<b>${finalEvidence.spend}</b> spend`));
}

// Expanded Text Ads are a period-correct, longer-copy rotating mechanic rather than a score upgrade button.
{
  const f=makeContext("?mode=0&stage=1&seed=803"),g=state(f.context).groups[0],qs=g.qs;
  assert.equal(value(f.context,`Object.values(CLASSIC_COPY_DECKS).every(deck=>deck.expanded.every(copy=>
    copy.headlines.length===2&&copy.headlines.every(line=>line.length<=30)&&copy.descriptions.length===1&&copy.descriptions[0].length<=80))`),true,
    "an authored 2017 Expanded Text Ad exceeded its two 30-character headlines / 80-character description shape");
  const controlLength=value(f.context,'(()=>{const c=classicCopy(S.groups[0].ads[0].copyId,S.groups[0].id);return c.headlines.join(" ").length+c.descriptions.join(" ").length})()');
  clickClassic(f,"expanded",0);const ad=g.ads[1];
  assert.equal(g.ads.length,2);assert.equal(g.expandedBuilt,true);assert.equal(state(f.context).telemetry.expandedAds,1);
  assert.equal(value(f.context,"classicAdKind(S.groups[0].ads[1])"),"expanded");assert.equal(g.qs,qs);
  assert(value(f.context,'(()=>{const c=classicCopy(S.groups[0].ads[1].copyId,S.groups[0].id);return c.headlines.join(" ").length+c.descriptions.join(" ").length})()')>controlLength,
    "Expanded Text Ad did not actually expose more authored copy");
  assert.equal(g.previewAdId,ad.id);assert.match(f.registry.slots.innerHTML,/Expanded Text Ad · historical 2017 longer-copy format/);
  assert.match(f.registry.slots.innerHTML,/Longer qualification copy/);assert.match(f.registry.log.innerHTML,/does not guarantee a higher Quality Score/);
  const once=value(f.context,'JSON.stringify({group:S.groups[0],expanded:S.telemetry.expandedAds,log:S.log})');
  clickClassic(f,"expanded",0);
  assert.equal(value(f.context,'JSON.stringify({group:S.groups[0],expanded:S.telemetry.expandedAds,log:S.log})'),once,
    "the same Expanded Text Ad was added twice");
}

// Quality Score names its three diagnostic components exactly once per ad group and explains their scope.
{
  const f=makeContext("?mode=0&stage=1&seed=8031"),card=f.registry.slots.innerHTML;
  for(const component of ["Expected CTR","Ad relevance","Landing page experience"])
    assert.equal((card.match(new RegExp(component,"g"))||[]).length,4,`${component} was missing or duplicated per ad group`);
  assert.match(card,/keyword-level diagnostic, not a key performance indicator or a literal auction input/i);
  assert.match(card,/Bid<\/b> changes auction pressure, never Quality Score/);
}

// Landing work changes the destination component only; moving an ad group changes campaign structure only.
{
  const f=makeContext("?mode=0&stage=1&seed=804"),g=state(f.context).groups[0];
  const landingBefore=JSON.parse(value(f.context,'JSON.stringify({quality:S.groups[0].quality,landingM:S.groups[0].landingM,ads:S.groups[0].ads,core:S.groups[0].core,match:S.groups[0].match,maxCPC:S.groups[0].maxCPC,campaignId:S.groups[0].campaignId})'));
  clickClassic(f,"landing",0);
  assert.equal(g.quality.expectedCtr,landingBefore.quality.expectedCtr);assert.equal(g.quality.adRelevance,landingBefore.quality.adRelevance);
  approx(g.quality.landingExperience,landingBefore.quality.landingExperience+1.5);approx(g.landingM,landingBefore.landingM*1.06);
  assert.equal(value(f.context,"JSON.stringify(S.groups[0].ads)"),JSON.stringify(landingBefore.ads));
  assert.equal(g.core,landingBefore.core);assert.equal(g.match,landingBefore.match);assert.equal(g.maxCPC,landingBefore.maxCPC);
  assert.equal(g.campaignId,landingBefore.campaignId);assert.equal(state(f.context).telemetry.landingPasses,1);
  const landingOnce=value(f.context,'JSON.stringify({group:S.groups[0],passes:S.telemetry.landingPasses,log:S.log})');clickClassic(f,"landing",0);
  assert.equal(value(f.context,'JSON.stringify({group:S.groups[0],passes:S.telemetry.landingPasses,log:S.log})'),landingOnce);

  const structureBefore=JSON.parse(value(f.context,'JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs,ads:S.groups[0].ads,core:S.groups[0].core,match:S.groups[0].match,maxCPC:S.groups[0].maxCPC})'));
  clickClassic(f,"split",0);
  assert.equal(g.split,true);assert.equal(g.campaignId,"dedicated-commercial");assert.equal(state(f.context).telemetry.splits,1);
  assert.equal(value(f.context,'JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs,ads:S.groups[0].ads,core:S.groups[0].core,match:S.groups[0].match,maxCPC:S.groups[0].maxCPC})'),JSON.stringify(structureBefore),
    "moving an ad group changed its ads, keyword, bid, or Quality Score");
}

// Rotating ads retain their own evidence, roll up exactly to the ad group, and respect the daily cap.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=300&seed=805");
  clickClassic(f,"variant",0);clickClassic(f,"expanded",0);
  const permutationId=state(f.context).groups[0].ads[1].id;clickClassic(f,"preview",0,{adId:permutationId});
  assert.equal(state(f.context).groups[0].previewAdId,permutationId);assert.match(f.registry.slots.innerHTML,/Controlled change · Call to action/);
  vm.runInContext("runDay()",f.context);
  const g=state(f.context).groups[0],rows=g.last.adBreakdown;
  assert.equal(rows.length,3);assert.equal(new Set(rows.map(row=>row.adId)).size,3);assert.equal(new Set(rows.map(row=>row.copyId)).size,3);
  assert(new Set(rows.map(row=>row.clicks.toFixed(8))).size>1,"distinct copy modifiers produced identical ad evidence");
  for(const [groupKey,rowKey] of [["impr","impr"],["clicks","clicks"],["spend","spend"],["wasted","wasted"],
    ["convA","convA"],["convR","convR"],["valA","valA"],["valR","valR"]])
    approx(rows.reduce((sum,row)=>sum+row[rowKey],0),g.last[groupKey],1e-8,`${rowKey} did not roll up to the ad group`);
  for(const row of rows){const ad=g.ads.find(item=>item.id===row.adId);assert(ad);approx(ad.stats.impr,row.impr);approx(ad.stats.clicks,row.clicks);
    approx(ad.stats.convR,row.convR);approx(ad.stats.spend,row.spend);}
  const daySpend=state(f.context).groups.reduce((sum,group)=>sum+(group.last?.spend||0),0);
  approx(daySpend,state(f.context).spendTotal,1e-8);assert(daySpend<=state(f.context).budget+1e-8);
}

// Whenever delivery reports budget loss, the two-pass allocator actually consumes that day's cap.
{
  let constrainedDays=0;
  for(const setup of [
    {search:"?mode=0&stage=1&days=12&budget=300&seed=7"},
    {search:"?mode=0&stage=2&days=12&budget=140&seed=29",accelerated:true},
    {search:"?mode=0&stage=3&days=12&budget=425&seed=91",variant:true}
  ]){
    const f=makeContext(setup.search);
    if(setup.accelerated)f.registry.delivBtn.onclick();
    if(setup.variant)clickClassic(f,"variant",0);
    for(let turn=0;turn<3;turn++){
      const before=state(f.context).spendTotal;vm.runInContext("runDay()",f.context);
      const s=state(f.context),daySpend=s.spendTotal-before,
        hasBudgetLoss=s.groups.some(group=>!group.paused&&group.last&&group.last.lostBudget>1e-10);
      assert(daySpend<=s.budget+1e-7,"Classic daily allocation exceeded its cap");
      if(hasBudgetLoss){constrainedDays++;approx(daySpend,s.budget,1e-6,"lost-to-budget appeared without spending the available cap");}
    }
  }
  assert(constrainedDays>=3,"the budget-loss invariant never exercised a constrained auction");
}

// A split campaign owns its pacing: its toggle changes delivery physics without changing shared pacing.
{
  const control=makeContext("?mode=0&stage=2&days=12&budget=20000&seed=812"),
    paced=makeContext("?mode=0&stage=2&days=12&budget=20000&seed=812");
  clickClassic(control,"split",0);clickClassic(paced,"split",0);clickClassic(paced,"campaign-delivery",0);
  assert.equal(state(paced.context).delivery,"standard");assert.equal(state(paced.context).groups[0].campaignDelivery,"accelerated");
  vm.runInContext("runDay()",control.context);vm.runInContext("runDay()",paced.context);
  const controlGroup=state(control.context).groups[0],pacedGroup=state(paced.context).groups[0];
  assert.equal(controlGroup.last.delivery,"standard");assert.equal(pacedGroup.last.delivery,"accelerated");
  assert.equal(state(paced.context).groups[1].last.delivery,"standard","dedicated pacing leaked into the shared campaign");
  assert(pacedGroup.last.spend>controlGroup.last.spend,"accelerated dedicated pacing produced no mechanical spend change");
  assert(pacedGroup.last.convA<controlGroup.last.convA,"accelerated pacing did not apply its modeled efficiency tradeoff");
  assert.equal(state(control.context).telemetry.acceleratedDays,0);assert.equal(state(paced.context).telemetry.acceleratedDays,1);

  const opposite=makeContext("?mode=0&stage=2&days=12&budget=20000&seed=813");
  clickClassic(opposite,"split",0);opposite.registry.delivBtn.onclick();
  assert.equal(state(opposite.context).delivery,"accelerated");assert.equal(state(opposite.context).groups[0].campaignDelivery,"standard");
  vm.runInContext("runDay()",opposite.context);
  assert.equal(state(opposite.context).groups[0].last.delivery,"standard");
  assert.equal(state(opposite.context).groups[1].last.delivery,"accelerated","shared pacing did not reach an unsplit group");
}

// Split messaging reflects the stage: Stage 1 promises structure only; Stage 2 accurately adds pacing control.
{
  const stage1=makeContext("?mode=0&stage=1&seed=817"),stage2=makeContext("?mode=0&stage=2&seed=817");
  clickClassic(stage1,"split",0);clickClassic(stage2,"split",0);
  assert.match(stage1.registry.log.innerHTML,/now has a dedicated campaign/);
  assert.doesNotMatch(stage1.registry.log.innerHTML,/independent delivery pacing/);
  assert.match(stage2.registry.log.innerHTML,/dedicated campaign and independent delivery pacing/);
}

// Accelerated delivery reports the price actually paid at both group and individual-ad levels.
{
  const f=makeContext("?mode=0&stage=2&days=12&budget=20000&seed=814");
  clickClassic(f,"variant",0);clickClassic(f,"expanded",0);f.registry.delivBtn.onclick();
  vm.runInContext("runDay()",f.context);
  for(const g of state(f.context).groups){
    assert.equal(g.last.delivery,"accelerated");assert(g.last.clicks>0);
    approx(g.last.cpc,g.last.spend/g.last.clicks,1e-10,"accelerated group Avg CPC omitted its pacing cost");
    for(const row of g.last.adBreakdown){assert(row.clicks>0);
      approx(row.cpc,row.spend/row.clicks,1e-10,"accelerated ad-breakdown CPC did not equal spend / click");}
  }
}

// Dedicated campaign structure does not make stale search copy immune to Stage 3 decay.
{
  const f=makeContext("?mode=0&stage=3&days=12&budget=300&seed=806");clickClassic(f,"split",0);
  const before=JSON.parse(value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs})"));
  vm.runInContext("runDay()",f.context);const g=state(f.context).groups[0];
  assert(g.quality.expectedCtr<before.quality.expectedCtr);assert(g.quality.adRelevance<before.quality.adRelevance);
  assert.equal(g.quality.landingExperience,before.quality.landingExperience);assert(g.qs<before.qs);
}

// Classic structural actions cannot stack, and a terminal encounter resolves through feedback into one debrief.
{
  const f=makeContext("?mode=0&stage=1&days=7&budget=300&seed=9");
  const qualityBefore=value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs,ads:S.groups[0].ads})");
  clickClassic(f,"split",0);
  const splitOnce=value(f.context,'JSON.stringify({group:S.groups[0],splits:S.telemetry.splits,log:S.log})');
  assert.equal(value(f.context,"JSON.stringify({quality:S.groups[0].quality,qs:S.groups[0].qs,ads:S.groups[0].ads})"),qualityBefore);
  assert.equal(state(f.context).groups[0].campaignId,"dedicated-commercial");assert.equal(state(f.context).telemetry.splits,1);
  clickClassic(f,"split",0);
  assert.equal(value(f.context,'JSON.stringify({group:S.groups[0],splits:S.telemetry.splits,log:S.log})'),splitOnce,
    "moving the same ad group twice stacked structure or telemetry");

  while(state(f.context).day<=7){
    if(state(f.context).client.pendingEncounter?.phase==="choice")vm.runInContext("resolveClassicClientEncounter(CLASSIC_CLIENT_EVENTS[S.client.pendingEncounter.eventId].options[0].id)",f.context);
    else if(state(f.context).client.pendingEncounter?.phase==="feedback")vm.runInContext("continueClassicClientEncounter()",f.context);
    else vm.runInContext("runDay()",f.context);
  }
  assert.equal(state(f.context).day,8);assert(state(f.context).client.calls>=2);
  assert.equal(state(f.context).client.pendingEncounter.phase,"choice");assert.equal(state(f.context).client.pendingEncounter.eventId,"final");
  assert.match(f.registry.overlay.innerHTML,/End-of-period account defense/);
  assert.equal(vm.runInContext("runDay()",f.context),false,"pending client choice did not lock time");
  vm.runInContext('resolveClassicClientEncounter("report")',f.context);
  assert.match(f.registry.overlay.innerHTML,/Trust strengthened|Trust held/);
  const afterChoice=value(f.context,"JSON.stringify(S)");
  assert.equal(vm.runInContext('resolveClassicClientEncounter("report")',f.context),false);
  assert.equal(value(f.context,"JSON.stringify(S)"),afterChoice,"a stale final choice applied twice");
  vm.runInContext("continueClassicClientEncounter()",f.context);
  assert.match(f.registry.overlay.innerHTML,/Debrief · Stage 1 · The Build · day 7/);
  assert.match(f.registry.overlay.innerHTML,/Two scoreboards/);
  const afterDebrief=value(f.context,"JSON.stringify(S)");
  assert.equal(vm.runInContext("continueClassicClientEncounter()",f.context),false);
  assert.equal(value(f.context,"JSON.stringify(S)"),afterDebrief,"a stale final continuation applied twice");
  assert.equal(value(f.context,"runDay()"),false);
  assert.equal(value(f.context,"JSON.stringify(S)"),afterDebrief,"a post-period Classic run mutated state");
}

// Classic clients are seeded, varied, and inferred from fallible business priors rather than fixed sector labels.
{
  const f=makeContext("?mode=0&stage=1&seed=901");
  const first=value(f.context,'JSON.stringify({business:classicClientBusinessForSeed(901).id,profile:classicClientProfileForSeed(901,classicClientBusinessForSeed(901)).id})');
  assert.equal(value(f.context,'JSON.stringify({business:classicClientBusinessForSeed(901).id,profile:classicClientProfileForSeed(901,classicClientBusinessForSeed(901)).id})'),first);
  const pairs=JSON.parse(value(f.context,`JSON.stringify(Array.from({length:600},(_,i)=>{const seed=i+1,b=classicClientBusinessForSeed(seed),p=classicClientProfileForSeed(seed,b);return [b.id,p.id]}))`));
  assert(new Set(pairs.map(([business])=>business)).size>=5,"seeded client businesses lack breadth");
  assert(new Set(pairs.map(([,profile])=>profile)).size===8,"seeded client profiles lack breadth");
  const profilesByBusiness=new Map();for(const [business,profile] of pairs){if(!profilesByBusiness.has(business))profilesByBusiness.set(business,new Set());profilesByBusiness.get(business).add(profile);}
  assert([...profilesByBusiness.values()].every(profiles=>profiles.size>=3),"a business prior became a deterministic personality label");
}

// Encounter creation is serializable, rendering is pure, and pending choice/feedback phases lock time.
{
  const f=makeContext("?mode=0&stage=2&days=12&budget=300&seed=902");
  assert.equal(value(f.context,'classicBeginClientEncounter({eventId:"waste"})'),true);
  const choiceState=value(f.context,"JSON.stringify(S)"),profileLabel=value(f.context,"classicClientProfile().label"),primaryNeed=value(f.context,"classicClientProfile().primaryNeed");
  assert.equal(state(f.context).client.pendingEncounter.phase,"choice");
  assert.match(f.registry.overlay.innerHTML,/Search-quality confrontation/);assert.match(f.registry.overlay.innerHTML,/What you can observe/);
  assert.doesNotMatch(f.registry.overlay.innerHTML,new RegExp(profileLabel.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
  assert.doesNotMatch(f.registry.overlay.innerHTML,new RegExp(primaryNeed.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
  assert.doesNotMatch(f.registry.overlay.innerHTML,/recommended|trust delta|affinity|why the response worked/i);
  assert.equal(value(f.context,"renderClassicClientEncounter()"),true);assert.equal(value(f.context,"JSON.stringify(S)"),choiceState,"rendering a choice mutated state");
  f.registry.clientMenu.onclick();assert.match(f.registry.overlay.innerHTML,/Main menu/);f.registry.continueRun.onclick();
  assert.match(f.registry.overlay.innerHTML,/Search-quality confrontation/);assert.equal(value(f.context,"JSON.stringify(S)"),choiceState,"menu round-trip mutated the pending encounter");
  assert.equal(value(f.context,"runDay()"),false);assert.equal(value(f.context,"JSON.stringify(S)"),choiceState,"pending choice failed to lock time");
  assert.equal(value(f.context,'resolveClassicClientEncounter("quality-question")'),true);
  const feedbackState=value(f.context,"JSON.stringify(S)");assert.equal(state(f.context).client.pendingEncounter.phase,"feedback");
  assert.match(f.registry.overlay.innerHTML,/Why the response worked this way/);assert.match(f.registry.overlay.innerHTML,/avoids treating every upper-funnel query/i);
  assert.doesNotMatch(f.registry.overlay.innerHTML,/invent.*cause.*rank control/i,"unchosen feedback leaked after resolution");
  assert.equal(value(f.context,'resolveClassicClientEncounter("quality-question")'),false);assert.equal(value(f.context,"JSON.stringify(S)"),feedbackState,"choice resolved twice");
  assert.equal(value(f.context,"runDay()"),false);assert.equal(value(f.context,"JSON.stringify(S)"),feedbackState,"pending feedback failed to lock time");
  assert.equal(value(f.context,"continueClassicClientEncounter()"),true);const continued=value(f.context,"JSON.stringify(S)");
  assert.equal(value(f.context,"continueClassicClientEncounter()"),false);assert.equal(value(f.context,"JSON.stringify(S)"),continued,"continuation applied twice");
}

// Evidence quality dominates style, while sound responses can land differently for different client preferences.
{
  const f=makeContext("?mode=0&stage=1&seed=903");
  const option='CLASSIC_CLIENT_EVENTS.behind.options.find(option=>option.id==="owned-next")';
  const auditor=value(f.context,`JSON.stringify(classicClientChoiceDeltas(${option},classicClientProfile("auditor")))`),
    sprinter=value(f.context,`JSON.stringify(classicClientChoiceDeltas(${option},classicClientProfile("sprinter")))`);
  assert.notEqual(auditor,sprinter,"profile fit never changed a legitimate response");
  assert.equal(value(f.context,`CLASSIC_TRUST_PARTS.every(key=>classicClientChoiceDeltas(CLASSIC_CLIENT_EVENTS.behind.options.find(option=>option.id==="confident-theory"),classicClientProfile("sprinter")).deltas[key]<=0)`),true,
    "an unsupported claim became positive because it matched the client style");
  const accountBefore=value(f.context,'JSON.stringify(S.groups.map(g=>({maxCPC:g.maxCPC,match:g.match,quality:g.quality,ads:g.ads,last:g.last})))');
  value(f.context,'classicBeginClientEncounter({eventId:"behind"})');value(f.context,'resolveClassicClientEncounter("owned-next")');
  assert.equal(value(f.context,'JSON.stringify(S.groups.map(g=>({maxCPC:g.maxCPC,match:g.match,quality:g.quality,ads:g.ads,last:g.last})))'),accountBefore,
    "client dialogue retroactively changed media delivery state");
}

// Client insight grows only through completed encounters, remains capped, and reveals progressively.
{
  const f=makeContext("?mode=0&stage=1&seed=904");
  assert.equal(value(f.context,"classicClientRead().level"),0);assert.equal(state(f.context).client.insight.points,0);
  for(let i=0;i<5;i++){
    value(f.context,'classicBeginClientEncounter({eventId:"routine"})');value(f.context,'resolveClassicClientEncounter("ask-priority")');
    const points=state(f.context).client.insight.points;assert(points>=Math.min(12,(i+1)*3));value(f.context,"continueClassicClientEncounter()");
  }
  assert.equal(state(f.context).client.insight.points,12);assert.equal(value(f.context,"classicClientRead().level"),3);
  assert(state(f.context).client.insight.observations.filter(item=>item.type==="cue").length<=4);
  const capped=value(f.context,"JSON.stringify(S.client.insight)");
  value(f.context,'classicBeginClientEncounter({eventId:"routine"})');value(f.context,'resolveClassicClientEncounter("ask-priority")');
  assert.equal(state(f.context).client.insight.points,12);assert.equal(value(f.context,"JSON.stringify(S.client.insight)"),capped,"capped insight accumulated duplicate observations");
}

// Commitments settle once from later account behavior and visibly alter the relationship—not media outcomes.
{
  const f=makeContext("?mode=0&stage=1&days=12&budget=300&seed=905");
  value(f.context,'classicBeginClientEncounter({eventId:"waste"})');value(f.context,'resolveClassicClientEncounter("query-control")');value(f.context,"continueClassicClientEncounter()");
  assert.equal(state(f.context).client.commitments.length,1);assert.equal(state(f.context).client.commitments[0].kind,"negatives");
  vm.runInContext("S.telemetry.negAdded=2;S.day=6",f.context);value(f.context,"classicSettleClientCommitments(5)");
  assert.equal(state(f.context).client.commitments[0].met,true);assert.equal(state(f.context).telemetry.commitmentsMet,1);
  const once=value(f.context,"JSON.stringify(S)");assert.equal(value(f.context,"classicSettleClientCommitments(5)"),0);
  assert.equal(value(f.context,"JSON.stringify(S)"),once,"a settled commitment changed state twice");
}

// Simulation evidence selects the encounter, and a disclosed Stage 3 authorization cut applies at most once.
{
  const tracking=makeContext("?mode=0&stage=2&days=12&budget=300&seed=9051");
  vm.runInContext("S.client.calls=1;S.day=7;S.client.promised=null",tracking.context);
  assert.equal(value(tracking.context,"classicClientEventForSnapshot(classicClientSnapshot(),false)"),"tracking");
  vm.runInContext("S.telemetry.trackingChecked=true;S.wasteTotal=100",tracking.context);
  assert.equal(value(tracking.context,"classicClientEventForSnapshot(classicClientSnapshot(),false)"),"waste");
  vm.runInContext("S.telemetry.negAdded=2;S.client.promised=220;S.client.lastPromisePenaltyDay=0",tracking.context);
  assert.equal(value(tracking.context,"classicClientEventForSnapshot(classicClientSnapshot(),false)"),"promise");

  const cut=makeContext("?mode=0&stage=3&days=12&budget=300&seed=9052");
  vm.runInContext('S.client.profileId="steward";for(const key of CLASSIC_TRUST_PARTS)S.client.trustParts[key]=48;syncClassicClientTrust();classicBeginClientEncounter({eventId:"waste"})',cut.context);
  value(cut.context,'resolveClassicClientEncounter("blame-auction")');assert.equal(state(cut.context).client.budgetCut,true);assert.equal(state(cut.context).budget,192);
  const afterCut=value(cut.context,"JSON.stringify({budget:S.budget,budgetCuts:S.telemetry.budgetCuts})");
  assert.equal(value(cut.context,'resolveClassicClientEncounter("blame-auction")'),false);assert.equal(value(cut.context,"JSON.stringify({budget:S.budget,budgetCuts:S.telemetry.budgetCuts})"),afterCut);
}

// Choice and feedback phases resume exactly; a terminal client encounter takes precedence over the debrief.
{
  const localStore=new Map(),search="?mode=0&stage=2&days=12&budget=300&seed=906";
  const choice=makeContext(search,{localStore});vm.runInContext('classicBeginClientEncounter({eventId:"tracking"});saveGame("choice-phase",false)',choice.context);
  const choiceCheckpoint=value(choice.context,"JSON.stringify(S)"),choiceStore=new Map(localStore),choiceRestored=makeContext(`${search}&resume=1`,{localStore:choiceStore});
  assert.equal(value(choiceRestored.context,"JSON.stringify(S)"),choiceCheckpoint);assert.equal(state(choiceRestored.context).client.pendingEncounter.phase,"choice");
  assert.match(choiceRestored.registry.overlay.innerHTML,/Measurement credibility crisis/);
  vm.runInContext('resolveClassicClientEncounter("audit-first");saveGame("feedback-phase",false)',choiceRestored.context);
  const feedbackCheckpoint=value(choiceRestored.context,"JSON.stringify(S)"),feedbackStore=new Map(choiceStore),feedbackRestored=makeContext(`${search}&resume=1`,{localStore:feedbackStore});
  assert.equal(value(feedbackRestored.context,"JSON.stringify(S)"),feedbackCheckpoint);assert.equal(state(feedbackRestored.context).client.pendingEncounter.phase,"feedback");
  assert.match(feedbackRestored.registry.overlay.innerHTML,/Why the response worked this way/);

  const terminalStore=new Map(),terminal=makeContext(search,{localStore:terminalStore});
  vm.runInContext('S.day=DAYS+1;classicBeginClientEncounter({terminal:true});saveGame("terminal-client",false)',terminal.context);
  const terminalRestored=makeContext(`${search}&resume=1`,{localStore:terminalStore});
  assert.equal(state(terminalRestored.context).client.pendingEncounter.eventId,"final");assert.match(terminalRestored.registry.overlay.innerHTML,/End-of-period account defense/);
  assert.doesNotMatch(terminalRestored.registry.overlay.innerHTML,/Two scoreboards/);
  vm.runInContext('resolveClassicClientEncounter("report");continueClassicClientEncounter()',terminalRestored.context);
  assert.match(terminalRestored.registry.overlay.innerHTML,/Two scoreboards/);
}

// The authored search corpus is broad, internally scoped, and retains the historical ETA field limits.
{
  const f=makeContext("?mode=0&stage=1&seed=907");
  const counts=JSON.parse(value(f.context,'JSON.stringify(Object.fromEntries(Object.entries(CLASSIC_COPY_DECKS).map(([id,deck])=>[id,{standard:deck.standard.length,permutation:deck.permutation.length,expanded:deck.expanded.length}])))'));
  for(const count of Object.values(counts)){assert(count.standard>=8);assert(count.permutation>=5);assert(count.expanded>=2);}
  assert.equal(value(f.context,'Object.entries(CLASSIC_COPY_DECKS).every(([group,deck])=>[...deck.standard,...deck.permutation,...deck.expanded].every((copy,index,all)=>copy.path&&copy.headlines.length&&copy.descriptions.length&&all.findIndex(other=>other.path===copy.path&&other.headlines.join("|")===copy.headlines.join("|")&&other.descriptions.join("|")===copy.descriptions.join("|"))===index))'),true,
    "authored search copy contains a duplicate visible recipe");
  assert.equal(value(f.context,'Object.values(CLASSIC_COPY_DECKS).every(deck=>deck.expanded.every(copy=>copy.headlines.length===2&&copy.headlines.every(line=>line.length<=30)&&copy.descriptions.length===1&&copy.descriptions[0].length<=80))'),true);
  assert.equal(value(f.context,'Object.values(CLASSIC_COPY_DECKS).reduce((sum,deck)=>sum+deck.standard.length+deck.expanded.length+deck.standard.length*deck.permutation.length,0)>=200'),true,
    "the control/one-axis corpus fell below 200 authored pairings");
}

}

if(smokeShard==="b2a1"){
// Switching flavor mid-run updates the explanations and URL but cannot reset state or consume luck.
{
  const a=makeContext("?mode=2&seed=24&flavor=jrpg"),b=makeContext("?mode=2&seed=24&flavor=jrpg");
  vm.runInContext("runDay()",a.context);vm.runInContext("runDay()",b.context);
  const before=value(a.context,"JSON.stringify(S)");
  const handler=a.registry.flavorSelect.listeners.change[0];
  handler({target:{value:"dnd"}});
  assert.equal(value(a.context,"JSON.stringify(S)"),before,"flavor switch mutated simulation state");
  assert.equal(value(a.context,"ACTIVE_FLAVOR"),"dnd");
  assert.equal(a.localStore.get("media-buying-trainer-flavor-v1"),"dnd");
  assert.match(a.history.lastUrl,/flavor=dnd/);
  assert.match(a.registry.log.innerHTML,/D20 Adventure/);
  assert.match(a.registry.log.innerHTML,/Day 1/); // canonical output remains visible.
  vm.runInContext("runDay()",a.context);vm.runInContext("runDay()",b.context);
  assert.equal(state(a.context).spendTotal,state(b.context).spendTotal);
  assert.equal(state(a.context).revenue,state(b.context).revenue);
  assert.deepEqual(Array.from(state(a.context).slots,s=>[s.fatigue,s.last?.rev]),
    Array.from(state(b.context).slots,s=>[s.fatigue,s.last?.rev]));
  assert.equal(value(a.context,'setFlavor("invalid")'),false);
  assert.equal(value(a.context,"ACTIVE_FLAVOR"),"dnd");
}

// The new-run flow reveals one decision at a time and keeps every selection as an uncommitted draft.
{
  const {context,registry,localStore,sessionStore}=makeContext("?mode=1&seed=27&flavor=jrpg");
  const before=value(context,"JSON.stringify(S)"),rngBefore=value(context,"JSON.stringify(S.rng)"),urlBefore=value(context,"location.search"),
    flavorBefore=value(context,"ACTIVE_FLAVOR"),storedFlavor=localStore.get("media-buying-trainer-flavor-v1"),
    onboardingBefore=localStore.get("ttm.onboarding.general.v2"),configsBefore=sessionStore.get("media-buying-trainer-config-v1");
  vm.runInContext('setupWizard({origin:"menu",tutorial:true,mode:1,flavor:"jrpg",guidance:"guided"},"lens")',context);
  assert.match(registry.overlay.innerHTML,/Choose an analogy, or use media-buying terms/);assert.match(registry.overlay.innerHTML,/ANALOGY 8 OF 9/);
  assert.match(registry.overlay.innerHTML,/JRPG Raid Party/);assert.match(registry.overlay.innerHTML,/Use media-buying terms only/);
  assert.doesNotMatch(registry.overlay.innerHTML,/What do you want to practice|Choose one challenge|daysCfg|budgetCfg/);
  registry.lensNext.onclick();
  assert.match(registry.overlay.innerHTML,/D20 Adventure \(D&D\)/);assert.equal(value(context,"ACTIVE_FLAVOR"),"jrpg");
  registry.keepLens.onclick();assert.match(registry.overlay.innerHTML,/How much help should appear on screen/);
  assert.equal(registry.overlay.querySelectorAll("button[data-guidance]").length,3);
  assert.doesNotMatch(registry.overlay.innerHTML,/What do you want to practice|Choose one challenge|daysCfg|budgetCfg/);
  const compactGuidance=registry.overlay.querySelectorAll("button[data-guidance]").find(button=>button.dataset.guidance==="compact");
  compactGuidance.onclick();assert.match(registry.overlay.innerHTML,/How much help should appear on screen/);
  assert.equal(compactGuidance.getAttribute("aria-pressed"),"true");assert.equal(typeof registry.keepGuidance.onclick,"function");
  registry.keepGuidance.onclick();
  assert.match(registry.overlay.innerHTML,/What do you want to practice/);assert.equal(registry.overlay.querySelectorAll("button[data-intent]").length,3);
  assert.doesNotMatch(registry.overlay.innerHTML,/How much help|Choose one challenge|daysCfg|budgetCfg/);
  const practiceIntent=registry.overlay.querySelectorAll("button[data-intent]").find(button=>button.dataset.intent==="practice");
  practiceIntent.onclick();assert.match(registry.overlay.innerHTML,/What do you want to practice/);
  assert.equal(practiceIntent.getAttribute("aria-pressed"),"true");assert.equal(typeof registry.keepIntent.onclick,"function");
  registry.keepIntent.onclick();
  assert.match(registry.overlay.innerHTML,/Choose one challenge/);assert.equal(registry.overlay.querySelectorAll("button[data-mode]").length,4);
  assert.match(registry.overlay.innerHTML,/You will see the account briefing before Day 1/,
    "challenge selection no longer explains what happens next");
  for(const button of registry.overlay.querySelectorAll("button[data-mode]")){
    assert(button.getAttribute("aria-labelledby"));assert(button.getAttribute("aria-describedby"));
    assert.equal(button.getAttribute("aria-label"),null,"mode-card label hid its visible scope and session details");
  }
  const creativeMode=registry.overlay.querySelectorAll("button[data-mode]").find(button=>button.dataset.mode==="3");
  creativeMode.onclick();assert.match(registry.overlay.innerHTML,/Choose one challenge/);
  assert.equal(creativeMode.getAttribute("aria-pressed"),"true");assert.equal(typeof registry.keepMode.onclick,"function");
  registry.keepMode.onclick();
  assert.match(registry.overlay.innerHTML,/data-wizard-step="mission"/);assert.match(registry.overlay.innerHTML,/Creative Operations/);
  assert.match(registry.overlay.innerHTML,/12-day run/);assert.match(registry.overlay.innerHTML,/\$20,000\/day/);
  assert.doesNotMatch(registry.overlay.innerHTML,/daysCfg|budgetCfg|How long should this run last/,
    "ordinary challenge selection forced advanced setup before showing the default assignment");
  assert.equal(typeof registry.customizeRun.onclick,"function");registry.customizeRun.onclick();
  assert.match(registry.overlay.innerHTML,/How long should this run last/);assert.match(registry.overlay.innerHTML,/id="daysCfg"/);
  assert.doesNotMatch(registry.overlay.innerHTML,/budgetCfg|How much can the account spend/);
  registry.daysCfg.value="33";registry.daysCfg.oninput();assert.equal(registry.keepPeriod.textContent,"Use 33 days · choose budget");registry.keepPeriod.onclick();
  assert.match(registry.overlay.innerHTML,/How much can the account spend each day/);assert.match(registry.overlay.innerHTML,/id="budgetCfg"/);
  assert.doesNotMatch(registry.overlay.innerHTML,/daysCfg|How long should this run last/);
  registry.budgetCfg.value="44000";registry.budgetCfg.oninput();assert.equal(registry.keepBudget.textContent,"Use $44,000 · review run");registry.keepBudget.onclick();
  assert.match(registry.overlay.innerHTML,/Creative Operations/);assert.match(registry.overlay.innerHTML,/33-day run/);
  assert.match(registry.overlay.innerHTML,/\$44,000\/day/);assert.match(registry.overlay.innerHTML,/Standard on-screen help/);
  assert.match(registry.overlay.innerHTML,/D20 Adventure/);assert.match(registry.overlay.innerHTML,/You win if/);
  assert.equal(value(context,"JSON.stringify(S)"),before,"draft navigation mutated the simulation");
  assert.equal(value(context,"JSON.stringify(S.rng)"),rngBefore,"draft navigation consumed simulation RNG");
  assert.equal(value(context,"location.search"),urlBefore);assert.equal(value(context,"ACTIVE_FLAVOR"),flavorBefore);
  assert.equal(localStore.get("media-buying-trainer-flavor-v1"),storedFlavor);assert.equal(localStore.get("ttm.onboarding.general.v2"),onboardingBefore);
  assert.equal(sessionStore.get("media-buying-trainer-config-v1"),configsBefore,"draft setup persisted before confirmation");

  for(const mode of [0,1,2,3,4,5,6]){
    vm.runInContext(`setupWizard({mode:${mode}},"mission")`,context);
    if(mode===6){
      assert.match(registry.overlay.innerHTML,/Moonrise Media/);assert.match(registry.overlay.innerHTML,/Digital Marketing Agency/);
      assert.match(registry.overlay.innerHTML,/Portland, OR/);
    }else assert(registry.overlay.innerHTML.includes(value(context,`MODE_NAME[${mode}]`)),`mode ${mode} has no staged mission surface`);
    assert.equal(typeof registry.launchRun.onclick,"function",`mode ${mode} has no explicit launch action`);
  }
}

// Client-situation cards use the same select-then-continue rhythm as the other setup menus.
{
  const stage=makeContext("?mode=0&stage=1&seed=28");
  vm.runInContext('setupWizard({mode:0,stage:1},"stage")',stage.context);
  const third=stage.registry.overlay.querySelectorAll("button[data-stage]").find(button=>button.dataset.stage==="3");
  assert(third);third.onclick();
  assert.match(stage.registry.overlay.innerHTML,/Choose a client situation/,
    "choosing a client situation advanced before explicit confirmation");
  assert.equal(third.getAttribute("aria-pressed"),"true");assert.equal(typeof stage.registry.keepStage.onclick,"function");
  stage.registry.keepStage.onclick();assert.match(stage.registry.overlay.innerHTML,/data-wizard-step="mission"/);
  assert(stage.registry.overlay.innerHTML.includes(value(stage.context,"CSTAGE_NAME[3]")));
}

// Onboarding choices are profile-scoped; legacy preferences migrate once, and live settings keep the scoped draft aligned.
{
  const localStore=new Map(),general=makeContext("?mode=1&seed=507&flavor=f1",{localStore,profile:"general"});
  const generalPrefs=JSON.parse(value(general.context,
    'JSON.stringify(writeOnboardingPrefs({tutorial:false,guidance:"compact",flavor:"dnd",analogies:false}))'));
  assert.deepEqual(generalPrefs,{tutorial:false,guidance:"compact",flavor:"dnd",analogies:false});
  assert.deepEqual(JSON.parse(localStore.get("ttm.onboarding.general.v2")),generalPrefs);

  const specialist=makeContext("?mode=1&seed=508&flavor=f1",{localStore,profile:"specialist"}),
    specialistDefault=JSON.parse(value(specialist.context,"JSON.stringify(readOnboardingPrefs())"));
  assert.deepEqual(specialistDefault,{tutorial:true,guidance:"guided",flavor:"f1",analogies:true},
    "general onboarding preferences leaked into the specialist profile");
  const specialistPrefs=JSON.parse(value(specialist.context,
    'JSON.stringify(writeOnboardingPrefs({tutorial:true,guidance:"analyst",flavor:"jrpg",analogies:true}))'));
  assert.deepEqual(JSON.parse(localStore.get("ttm.onboarding.specialist.v2")),specialistPrefs);
  assert.deepEqual(JSON.parse(localStore.get("ttm.onboarding.general.v2")),generalPrefs,
    "specialist onboarding changes overwrote the general profile");

  vm.runInContext('setAnalogies(true);setDensity("analyst")',general.context);
  assert.deepEqual(JSON.parse(localStore.get("ttm.onboarding.general.v2")),
    {tutorial:false,guidance:"analyst",flavor:"dnd",analogies:true},
    "live Help and display settings diverged from the staged onboarding defaults");
  assert.deepEqual(JSON.parse(localStore.get("ttm.onboarding.specialist.v2")),specialistPrefs,
    "general live settings crossed the profile boundary");

  const legacyValue={tutorial:false,guidance:"compact",flavor:"dnd",analogies:false},
    legacyStore=new Map([["ttm.onboarding.v2",JSON.stringify(legacyValue)]]),
    migrated=makeContext("?mode=1&seed=509&flavor=f1",{localStore:legacyStore,profile:"general"});
  assert.deepEqual(JSON.parse(value(migrated.context,"JSON.stringify(readOnboardingPrefs())")),legacyValue);
  assert.deepEqual(JSON.parse(legacyStore.get("ttm.onboarding.general.v2")),legacyValue,
    "legacy onboarding preferences were not copied into the active profile scope");
  assert.equal(legacyStore.get("ttm.onboarding.v2"),JSON.stringify(legacyValue),"legacy migration destructively removed its source");
}

// Every mode derives a staged opening briefing from public initialized state without touching state or RNG.
for(const mode of [0,1,2,3,4,5,6]){
  const search=`?mode=${mode}&seed=${510+mode}${mode===0?"&stage=2&days=30&budget=300":mode===5?"&days=90&budget=150000":mode===6?"&days=120&budget=25000":"&days=12&budget=20000"}`;
  const fixture=makeContext(search),before=value(fixture.context,"JSON.stringify(S)"),
    rngBefore=value(fixture.context,'JSON.stringify(S&&S.rng!==undefined?S.rng:null)'),urlBefore=value(fixture.context,"location.search");
  const first=value(fixture.context,"openingBriefModel()"),serialized=value(fixture.context,"JSON.stringify(openingBriefModel())");
  assert.equal(value(fixture.context,"JSON.stringify(openingBriefModel())"),serialized,`mode ${mode} opening briefing is not repeatable`);
  const agencyType=mode===6?state(fixture.context).agencyIdentity.agencyType:null,expectedKickers=mode!==6?
    ["Your assignment","Starting conditions","Your first decision"]:agencyType==="holding_company"?
    ["Your company","Opening business","Starting campaign","What you control","Your first decision"]:
    ["Your company","Your first client","Starting account","What you control","Your first decision"];
  assert.equal(first.mode,mode);assert.equal(first.seed,510+mode);assert.equal(first.slides.length,expectedKickers.length);
  assert.equal(value(fixture.context,"Object.isFrozen(openingBriefModel())&&Object.isFrozen(openingBriefModel().slides)"),true);
  assert.deepEqual(Array.from(first.slides,slide=>slide.kicker),expectedKickers);
  /* A slide body may be prose OR a colour-coded fact list; the client brief uses facts so the
     offer, customer, win condition and outcome value each get their own slot (2026-08-09). */
  for(const slide of first.slides)for(const field of ["kicker","title","body","secondary","footer"]){
    const raw=slide[field];
    if(field==="body"&&raw&&typeof raw==="object"){
      assert(Array.isArray(raw.facts)&&raw.facts.length>=3,`mode ${mode} opening fact list is too thin`);
      assert(raw.facts.every(fact=>fact.role&&fact.label&&typeof fact.value==="string"&&fact.value.length>2),
        `mode ${mode} opening fact is missing its role, label or value`);
      continue;
    }
    assert(typeof raw==="string"&&raw.length>5,`mode ${mode} opening slide omitted ${field}`);
  }
  if(mode!==6)assert(first.slides[0].secondary.includes(value(fixture.context,`MODE_OBJECTIVE[${mode}]`)),`mode ${mode} opening omitted its win condition`);
  else assert(serialized.includes(value(fixture.context,"MODE_OBJECTIVE[6]")),"Agency Career opening omitted its 2027 win condition");
  assert(first.slides.some(slide=>slide.footer.includes(String(510+mode))),`mode ${mode} opening omitted its scenario ID`);
  const board=first.slides[1].secondary,current=first.slides[1].body,turn=first.slides.at(-1).secondary,assignment=first.slides.at(-1).body;
  if(mode!==6){assert.match(turn,/inspect|read|set|check|service/i);assert.match(turn,/run|end the workday/i);assert.match(turn,/then|each month/i);}
  if(mode===0){assert.match(board,/active ad groups.*keywords.*ads.*client relationship/i);
    assert(current.includes(value(fixture.context,"classicClientBusiness(S.client.businessId).name")));
    assert(current.includes(value(fixture.context,"classicOpeningProfile().label")),"Classic briefing hid the inherited search-account condition");}
  else if(mode>=1&&mode<=4){
    if(mode===1)assert.match(board,/one account.*active ads/i);
    else if(mode===2)assert.match(board,/value earned.*payments still pending.*cash already received/i);
    else if(mode===3)assert.match(board,/creative pipeline.*building.*review.*approval.*replace a live ad/i);
    else assert.match(board,/one account across.*platforms.*demand.*limits.*reporting behavior/i);
    assert(current.includes(state(fixture.context).dayState.mood.label));assert(current.includes(state(fixture.context).dayState.event.title));
    assert(current.includes(value(fixture.context,`modernScenarioProfile(SEED,${mode}).market.label`)),`mode ${mode} briefing hid its market condition`);
    assert(current.includes(value(fixture.context,`modernScenarioProfile(SEED,${mode}).inheritance.label`)),`mode ${mode} briefing hid its inherited account`);
  }
  else if(mode===5){assert.match(board,/advertiser accounts.*platforms.*cash.*credit.*tracking/i);assert(current.includes(state(fixture.context).dayState.mood.label));assert(current.includes(state(fixture.context).dayState.event.title));
    assert(current.includes(value(fixture.context,"NightmareEngine.openingProfile(SEED).portfolio.label")),"Portfolio briefing hid its inherited shape");
    assert(current.includes(value(fixture.context,"NightmareEngine.openingProfile(SEED).operating.label")),"Portfolio briefing hid its operating condition");}
  else{
    const s=state(fixture.context),client=s.clients[0],offer=value(fixture.context,"AGENCY_OFFERS.find(item=>item.id===S.clients[0].offerId)"),
      concept=value(fixture.context,"agencyOpeningConcept(S.clients[0])"),joined=first.slides.map(slide=>Object.values(slide).map(part=>
        part&&typeof part==="object"&&Array.isArray(part.facts)?part.facts.map(fact=>`${fact.label} ${fact.value}`).join(" "):part).join(" ")).join(" ");
    assert(offer&&concept,"Agency briefing could not resolve the founding offer or ad concept");
    for(const visible of [s.agencyIdentity.name,"Portland, OR",client.name,offer.label,client.customer,client.stakes,concept.label])
      assert(joined.includes(visible),`Agency briefing hid initialized business context: ${visible}`);
    assert(joined.toLowerCase().includes(value(fixture.context,"agencyWizardModelTitle(S.agencyIdentity.agencyType)").toLowerCase()),
      "Agency briefing hid the selected business model");
    assert.match(joined,/paid search/i);assert.match(joined,/company cash.*focus/i);assert.match(joined,/client media budget.*retainer/i);
    assert(joined.includes(value(fixture.context,"AgencyCareer.openingProfile(SEED).label")),"Agency briefing hid its opening circumstance");
    assert.match(assignment,/Open .*Read the offer.*(?:service area|target geography)/i);assert.match(turn,/guided first assignment|search-account work/i);
  }
  assert.match(assignment,/before|baseline|Read|Check|Operate|Compare/);
  assert.equal(value(fixture.context,"JSON.stringify(S)"),before,`mode ${mode} opening briefing mutated simulation state`);
  assert.equal(value(fixture.context,'JSON.stringify(S&&S.rng!==undefined?S.rng:null)'),rngBefore,`mode ${mode} opening briefing consumed RNG`);
  assert.equal(value(fixture.context,"location.search"),urlBefore,`mode ${mode} pure briefing model changed routing`);
}

// Agency Career's five-stage briefing changes its middle screens with the chosen starter.
// Client agencies explain the relationship and account; holding companies explain the owned
// business and campaign without inventing a client.
for(const agencyType of ["creative_agency","holding_company"]){
  const fixture=makeContext(`?mode=6&seed=526&budget=250000&agencyName=North%20Window&hq=new-york-ny&agencyType=${agencyType}`),
    model=value(fixture.context,"openingBriefModel()"),s=state(fixture.context),joined=model.slides.map(slide=>Object.values(slide).map(part=>
      part&&typeof part==="object"&&Array.isArray(part.facts)?part.facts.map(fact=>`${fact.label} ${fact.value}`).join(" "):part).join(" ")).join(" "),
    expected=agencyType==="holding_company"?["Your company","Opening business","Starting campaign","What you control","Your first decision"]:
      ["Your company","Your first client","Starting account","What you control","Your first decision"];
  assert.deepEqual(Array.from(model.slides,slide=>slide.kicker),expected);assert.equal(model.slides.length,5);
  assert(joined.includes("North Window")&&joined.includes("New York, NY"),`${agencyType} briefing hid the selected company identity`);
  if(agencyType==="holding_company"){
    const first=s.affiliate.funnels[0];assert.equal(s.clients.length,0);assert(joined.includes(first.name));assert(joined.includes(first.adConcept));assert(joined.includes(first.adFormat));
    assert.match(joined,/no clients|There are no clients/i,"holding-company briefing implied a client relationship");
  }else{
    const client=s.clients[0],offer=value(fixture.context,"AGENCY_OFFERS.find(item=>item.id===S.clients[0].offerId)"),concept=value(fixture.context,"agencyOpeningConcept(S.clients[0])");
    for(const visible of [client.name,offer.label,client.customer,client.stakes,concept.label])assert(joined.includes(visible),`creative-agency briefing hid ${visible}`);
    assert.match(joined,/paid search.*unavailable/i);
  }
}

// A launched run introduces assignment, live circumstances and first decision one screen at a time.
{
  const fixture=makeContext("?mode=3&days=12&budget=20000&seed=518&autostart=1&brief=1");
  const before=value(fixture.context,"JSON.stringify(S)"),assertMenu=()=>{
    assert.match(fixture.registry.overlay.innerHTML,/id="openingMenu"[^>]*>Menu and options<\/button>/);
    assert.equal(typeof fixture.registry.openingMenu.onclick,"function","an opening slide had no working Menu and options control");
  };
  assert.match(fixture.registry.overlay.innerHTML,/Briefing · 1 of 3/);assert.match(fixture.registry.overlay.innerHTML,/Your assignment/);
  assertMenu();
  assert.match(fixture.registry.overlay.innerHTML,/Next: What you found/);
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/Starting conditions|Your first decision|Your first move/);
  assert.equal(typeof fixture.registry.openingSkip.onclick,"function","an ordinary opening could not be skipped");
  fixture.registry.openingNext.onclick();assert.match(fixture.registry.overlay.innerHTML,/Briefing · 2 of 3/);
  assertMenu();
  assert.match(fixture.registry.overlay.innerHTML,/Starting conditions/);assert.match(fixture.registry.overlay.innerHTML,/What you found/);
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/<div class="eyebrow">Your first decision<\/div>|<h2>Your first move<\/h2>/);
  assert.equal(typeof fixture.registry.openingBack.onclick,"function");fixture.registry.openingBack.onclick();
  assert.match(fixture.registry.overlay.innerHTML,/Briefing · 1 of 3/);assertMenu();assert.equal(value(fixture.context,"JSON.stringify(S)"),before);
  fixture.registry.openingNext.onclick();fixture.registry.openingNext.onclick();
  assert.match(fixture.registry.overlay.innerHTML,/Briefing · 3 of 3/);assert.match(fixture.registry.overlay.innerHTML,/Your first decision/);
  assertMenu();
  assert.match(fixture.registry.overlay.innerHTML,/Your first move/);assert.match(fixture.registry.overlay.innerHTML,/Open account/);
  assert.equal(value(fixture.context,"JSON.stringify(S)"),before,"viewing the opening sequence mutated the initialized run");
  fixture.registry.openingNext.onclick();assert.equal(fixture.registry.overlay.innerHTML,"");
  const params=new URLSearchParams(value(fixture.context,"location.search"));assert.equal(params.get("brief"),null);assert.equal(params.get("autostart"),null);
}

// Menu and options remains reachable through all five staged Agency Career screens. Leaving
// from the briefing writes a forced checkpoint before the menu replaces the run surface.
{
  const localStore=new Map(),key="ttm.save.general.mode-6.v3",
    fixture=makeContext("?mode=6&budget=250000&seed=527&agencyName=North%20Window&hq=new-york-ny&agencyType=holding_company&guided=1&autostart=1&brief=1",{localStore}),
    before=value(fixture.context,"JSON.stringify(S)"),kickers=["Your company","Opening business","Starting campaign","What you control","Your first decision"];
  for(let slide=0;slide<kickers.length;slide++){
    assert.match(fixture.registry.overlay.innerHTML,new RegExp(`Briefing · ${slide+1} of 5`));
    assert.match(fixture.registry.overlay.innerHTML,new RegExp(`<div class="eyebrow">${kickers[slide]}</div>`));
    assert.match(fixture.registry.overlay.innerHTML,/id="openingMenu"[^>]*>Menu and options<\/button>/);
    assert.equal(typeof fixture.registry.openingMenu.onclick,"function",`Agency opening slide ${slide+1} had no menu action`);
    assert.doesNotMatch(fixture.registry.overlay.innerHTML,/id="openingSkip"/,"a guided opening exposed a briefing skip");
    if(slide<kickers.length-1)fixture.registry.openingNext.onclick();
  }
  fixture.registry.openingMenu.onclick();assert.match(fixture.registry.overlay.innerHTML,/Main menu/);
  const saved=JSON.parse(localStore.get(key));assert(saved,"leaving the Agency briefing did not create a checkpoint");
  assert.equal(saved.source,"opening-brief-menu");assert.equal(JSON.stringify(saved.state),before,"briefing navigation changed the checkpointed career");
  const params=new URLSearchParams(value(fixture.context,"location.search"));assert.equal(params.get("brief"),null);assert.equal(params.get("guided"),null);
}

// Escape on the first opening slide invokes the same visible Menu and options route; it does
// not click a covered gameplay control or discard the new run before saving it.
{
  const localStore=new Map(),key="ttm.save.general.mode-6.v3",
    fixture=makeContext("?mode=6&budget=250000&seed=528&agencyType=digital_agency&guided=1&autostart=1&brief=1",{localStore}),
    before=value(fixture.context,"JSON.stringify(S)");
  assert.match(fixture.registry.overlay.innerHTML,/Briefing · 1 of 5/);assert.equal(fixture.registry.openingBack.parentNode,null);
  assert.match(fixture.registry.overlay.innerHTML,/id="openingMenu"[^>]*>Menu and options<\/button>/);
  const event=dispatchDocumentKey(fixture,"Escape",fixture.registry.modalCard);
  assert.equal(event.defaultPrevented,true,"Escape ignored Menu and options on the first opening slide");
  assert.match(fixture.registry.overlay.innerHTML,/Main menu/);
  const saved=JSON.parse(localStore.get(key));assert(saved,"Escape left the opening without a checkpoint");
  assert.equal(saved.source,"opening-brief-menu");assert.equal(JSON.stringify(saved.state),before);
}

// The fresh-run briefing survives a refresh after AUTO_START has already been consumed.
{
  const fixture=makeContext("?mode=4&days=12&budget=20000&seed=519&brief=1");
  assert.match(fixture.registry.overlay.innerHTML,/Briefing · 1 of 3/);
  assert.match(fixture.registry.overlay.innerHTML,/Your assignment/);
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/Main menu/);
  assert.equal(new URLSearchParams(value(fixture.context,"location.search")).get("brief"),"1");
  assert.equal(typeof fixture.registry.openingSkip.onclick,"function");fixture.registry.openingSkip.onclick();
  assert.equal(fixture.registry.overlay.innerHTML,"");
  assert.equal(new URLSearchParams(value(fixture.context,"location.search")).get("brief"),null);
}

// A guided fresh run finishes its seeded briefing before the deterministic action coach starts.
{
  const fixture=makeContext("?mode=1&days=12&budget=20000&seed=2601&tutorial=1&guided=1&autostart=1&brief=1",{
    localStore:new Map(),tutorialComplete:false});
  assert.match(fixture.registry.overlay.innerHTML,/Briefing · 1 of 3/);assert.equal(fixture.registry.tutorialBox.innerHTML,"");
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/id="openingSkip"/);
  finishRunOpening(fixture);
  assert.equal(fixture.registry.overlay.innerHTML,"");assert.match(fixture.registry.tutorialBox.innerHTML,/Step 1 of 9/);
  const params=new URLSearchParams(value(fixture.context,"location.search"));assert.equal(params.get("brief"),null);assert.equal(params.get("guided"),null);assert.equal(params.get("tutorial"),null);
}

// Tutorial ON launches the verified action script for every mode that has one (Modes 1–4)…
{
  const launcher=makeContext("?mode=1&days=12&budget=20000&seed=520&flavor=dnd");
  assert.equal(value(launcher.context,
    'launchWizardRun({mode:3,days:12,budget:20000,flavor:"dnd",analogies:true,tutorial:true,guidance:"guided"})'),true);
  const launchParams=new URLSearchParams(value(launcher.context,"location.search"));
  assert.equal(launchParams.get("mode"),"3");assert.equal(launchParams.get("guided"),"1");assert.equal(launchParams.get("tutorial"),"1");
  assert.equal(launchParams.get("seed"),"2603","a guided Mode 3 run did not receive its fixed teaching seed");
  assert.equal(launchParams.get("brief"),"1");assert.equal(launchParams.get("autostart"),"1");
}

// …and choosing Guided start with a mode that has NO verified script corrals the run into the
// Fundamentals walkthrough rather than dropping the player onto an unguided board.
{
  const launcher=makeContext("?mode=1&days=12&budget=20000&seed=521");
  assert.equal(value(launcher.context,
    'launchWizardRun({mode:0,stage:1,days:30,budget:300,analogies:true,tutorial:true,guidance:"guided"})'),true);
  const launchParams=new URLSearchParams(value(launcher.context,"location.search"));
  assert.equal(launchParams.get("mode"),"1","Guided start left the player on an unguided mode");
  assert.equal(launchParams.get("tutorial"),"1");assert.equal(launchParams.get("guided"),"1");
  assert.equal(launchParams.get("seed"),"2601");assert.equal(launchParams.get("days"),"12");assert.equal(launchParams.get("budget"),"20000");

  const portfolio=makeContext("?mode=1&days=12&budget=20000&seed=522");
  assert.equal(value(portfolio.context,
    'launchWizardRun({mode:5,days:90,budget:25000,analogies:true,tutorial:true,guidance:"guided"})'),true);
  assert.equal(new URLSearchParams(value(portfolio.context,"location.search")).get("mode"),"1");

  const career=makeContext("?mode=1&days=12&budget=20000&seed=523");
  assert.equal(value(career.context,
    'launchWizardRun({mode:6,agencyName:"Corral Co",hq:"portland-or",agencyType:"digital_agency",analogies:true,tutorial:true,guidance:"guided"})'),true);
  assert.equal(new URLSearchParams(value(career.context,"location.search")).get("mode"),"1");

  // Guided OFF leaves every mode exactly where the player put it.
  const free=makeContext("?mode=1&days=12&budget=20000&seed=524");
  assert.equal(value(free.context,
    'launchWizardRun({mode:5,days:90,budget:25000,analogies:true,tutorial:false,guidance:"compact"})'),true);
  assert.equal(new URLSearchParams(value(free.context,"location.search")).get("mode"),"5");
}

// Optional operating notes can inspect an uncommitted draft without bloating the confirmation step.
{
  const f=makeContext("?mode=1&days=12&budget=20000&seed=270&flavor=jrpg");
  vm.runInContext('setupWizard({mode:0,stage:3,days:30,budget:900,flavor:"dnd",analogies:true},"mission")',f.context);
  const missionMarkup=f.registry.overlay.innerHTML;
  assert.match(missionMarkup,/You win if/);assert.match(missionMarkup,/You lose if/);
  assert.doesNotMatch(missionMarkup,/Operating notes|Quality Score diagnoses/);
  vm.runInContext('briefing({returnToWizard:{mode:0,stage:3,days:30,budget:900,flavor:"dnd",analogies:true}})',f.context);
  const markup=f.registry.overlay.innerHTML;
  assert(markup.includes(value(f.context,"MODE_NAME[0]")));assert(!markup.includes(value(f.context,"MODE_NAME[1]")));
  assert(markup.includes(value(f.context,"CSTAGE_NAME[3]")));assert.match(markup,/30-day run/);assert.match(markup,/\$900\/day/);
  assert.match(markup,/Quality Score diagnoses/);assert.match(markup,/D20 Adventure/);assert.doesNotMatch(markup,/JRPG Raid Party/);
  vm.runInContext(`(()=>{const el=document.createElement("span");el.dataset.t="quality score";el.dataset.loreFlavor="dnd";
    el.dataset.loreAnalogies="true";document.body.appendChild(el);showPop(el,true)})()`,f.context);
  assert.match(value(f.context,"_pop.innerHTML"),/D20 Adventure/);assert.doesNotMatch(value(f.context,"_pop.innerHTML"),/JRPG Raid Party/);
  vm.runInContext(`hidePop();(()=>{const el=document.createElement("span");el.dataset.t="quality score";el.dataset.loreFlavor="dnd";
    el.dataset.loreAnalogies="false";document.body.appendChild(el);showPop(el,true)})()`,f.context);
  assert.doesNotMatch(value(f.context,"_pop.innerHTML"),/flavor-cue|D20 Adventure|JRPG Raid Party/);
  vm.runInContext("hidePop()",f.context);
  f.registry.closeB.onclick();assert(f.registry.overlay.innerHTML.includes(value(f.context,"MODE_NAME[0]")));
  assert.match(f.registry.overlay.innerHTML,/30-day run[\s\S]*\$900\/day/);
}

}

if(smokeShard==="b2a2"){
// The Field Guide is a nested surface: it preserves the contextual briefing beneath it.
{
  const {context,registry}=makeContext("?mode=4&seed=28&flavor=dnd");
  vm.runInContext('briefing({returnToWizard:{mode:4,days:44,budget:73000,flavor:"dnd",analogies:true}})',context);
  const briefingMarkup=registry.overlay.innerHTML;registry.briefingGuide.focus();registry.briefingGuide.onclick();
  assert.equal(registry.overlay.innerHTML,briefingMarkup,"Field Guide replaced its underlying briefing");
  assert.match(registry.guideOverlay.innerHTML,/Choose one thing to learn/);assert.equal(registry.wrap.inert,true);
  assert.equal(registry.guideOverlay.querySelectorAll("button[data-lesson-select]").length,11);
  const attribution=registry.guideOverlay.querySelectorAll("button[data-lesson-select]")
    .find(button=>button.dataset.lessonSelect==="07");
  attribution.onclick();assert.match(registry.guideOverlay.innerHTML,/Lesson 07 · Step 1 of 6 · Briefing/);
  assert.equal(registry.guideOverlay.querySelectorAll(".lesson-stage").length,1);
  assert.equal(registry.overlay.innerHTML,briefingMarkup);
  registry.guideClose.onclick();assert.equal(registry.guideOverlay.innerHTML,"");assert.equal(registry.overlay.innerHTML,briefingMarkup);
  assert.equal(registry.wrap.inert,true,"closing the guide incorrectly re-enabled the covered simulation");
  assert.equal(registry.__active,registry.briefingGuide,"closing the nested guide did not restore focus to its opener");
}

// The nested Field Guide is a real modal layer: Tab cannot escape into the covered mission.
{
  const f=makeContext("?mode=1&seed=281");vm.runInContext('loreBook("01")',f.context);
  const event=dispatchDocumentKey(f,"Tab",f.registry.guideCard);
  assert.equal(event.defaultPrevented,true);assert.equal(f.registry.__active,f.registry.guideCard);
}

}

if(smokeShard==="b2a3"){
// Boundary configurations: short/low and long/high runs use the chosen mechanics.
for(const search of [
  "?mode=0&stage=2&days=7&budget=50&seed=23",
  "?mode=0&stage=3&days=90&budget=5000&seed=23",
  "?mode=2&days=4&budget=5000&seed=23",
  "?mode=4&days=60&budget=100000&seed=23",
  "?mode=5&days=90&budget=25000&seed=23",
  "?mode=5&days=180&budget=500000&seed=23",
  "?mode=6&days=1&budget=10000&seed=23",
  "?mode=6&days=999&budget=250000&seed=23"
]){
  const {context}=makeContext(search);
  runToEnd(context,{headless:true});
}

// Agency Career always spans the full decade; setup changes starting reserve, not a daily media cap.
{
  const low=makeContext("?mode=6&days=1&budget=1000&seed=291").context;
  assert.equal(value(low,"DAYS"),120);assert.equal(value(low,"DAILY"),10000);
  const high=makeContext("?mode=6&days=999&budget=9999999&seed=291").context;
  assert.equal(value(high,"DAYS"),120);assert.equal(value(high,"DAILY"),250000);
  assert.equal(value(high,"MODE_SPEC.config.budgetMeaning"),"startingReserve");
}

// Fixed horizons are rules, not fake choices. Agency Career stages company identity and business
// model before reserve, and every card selection waits for an explicit Continue action.
{
  const career=makeContext("?mode=1&seed=292");
  vm.runInContext('setupWizard({intent:"campaign",tutorial:false},"mode")',career.context);
  const careerCard=career.registry.overlay.querySelectorAll("button[data-mode]").find(button=>button.dataset.mode==="6");
  assert(careerCard,"Agency Career is missing from long-campaign selection");
  careerCard.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="mode"/,
    "choosing Agency Career advanced before explicit confirmation");
  assert.equal(careerCard.getAttribute("aria-pressed"),"true");assert.equal(typeof career.registry.keepMode.onclick,"function");
  career.registry.keepMode.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="agency-identity"/);
  assert.match(career.registry.overlay.innerHTML,/Name the company and choose its headquarters/);
  career.registry.agencyNameCfg.value="  Nova   Avenue  ";career.registry.agencyHqCfg.value="new-york-ny";
  career.registry.agencyHqCfg.onchange();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="agency-identity"/,
    "changing headquarters navigated before Continue");
  assert.match(career.registry.agencyHqEffect.innerHTML,/New York, NY/);
  career.registry.keepAgencyIdentity.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="agency-model"/);
  const creativeChoice=career.registry.overlay.querySelectorAll("button[data-agency-model]").find(button=>button.dataset.agencyModel==="creative_agency");
  assert(creativeChoice);creativeChoice.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="agency-model"/,
    "choosing an agency model navigated before Continue");
  assert.equal(creativeChoice.getAttribute("aria-pressed"),"true");assert.equal(typeof career.registry.keepAgencyModel.onclick,"function");
  career.registry.keepAgencyModel.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="budget"/);
  assert.match(career.registry.overlay.innerHTML,/How much cash should the agency start with/);
  assert.match(career.registry.overlay.innerHTML,/2017 through 2027/);
  assert.doesNotMatch(career.registry.overlay.innerHTML,/How long should this run last|Career horizon|daysCfg|Use 120 months/,
    "Agency Career rendered its fixed horizon as a player choice");

  career.registry.wizardBack.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="agency-model"/,
    "Back from Agency Career reserve setup did not return to the model choice");
  career.registry.wizardBack.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="agency-identity"/,
    "Back from the model choice did not return to company identity");
  career.registry.wizardBack.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="mode"/);
  assert.match(career.registry.overlay.innerHTML,/Choose one challenge/);
  assert(career.registry.overlay.querySelectorAll("button[data-mode]").some(button=>button.dataset.mode==="6"));
  assert.doesNotMatch(career.registry.overlay.innerHTML,/budgetCfg|daysCfg/,
    "Back from Agency Career origin setup did not return to mode selection");

  vm.runInContext('setupWizard({mode:6,tutorial:false,agencyName:"Nova Avenue",hq:"new-york-ny",agencyType:"creative_agency"},"budget")',career.context);
  career.registry.budgetCfg.value="100000";career.registry.keepBudget.onclick();
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="mission"/);
  assert.match(career.registry.overlay.innerHTML,/Nova Avenue/);assert.match(career.registry.overlay.innerHTML,/New York, NY/);
  assert.match(career.registry.overlay.innerHTML,/Full-Service Creative Agency/);assert.match(career.registry.overlay.innerHTML,/Paid search is unavailable/);
  assert.match(career.registry.overlay.innerHTML,/10-year career/);assert.match(career.registry.overlay.innerHTML,/\$100,000 starting reserve/i);
  assert.match(career.registry.overlay.innerHTML,/Your role and the agency's monthly costs/);
  assert.match(career.registry.overlay.innerHTML,/You manage media buying\. The agency pays staff and operating costs\./);
  assert.doesNotMatch(career.registry.overlay.innerHTML,/reaches your desk|monthly cash test|qualified lead desk/i,
    "Agency Career setup returned to compressed desk metaphors instead of explaining the system directly");
  career.registry.launchRun.onclick();
  const launched=new URLSearchParams(value(career.context,"location.search"));
  assert.equal(launched.get("agencyName"),"Nova Avenue");assert.equal(launched.get("hq"),"new-york-ny");
  assert.equal(launched.get("agencyType"),"creative_agency");assert.equal(launched.get("budget"),"100000");

  vm.runInContext('setupWizard({mode:6},"period")',career.context);
  assert.match(career.registry.overlay.innerHTML,/data-wizard-step="budget"/);
  assert.match(career.registry.overlay.innerHTML,/Starting operating reserve/);
  assert.doesNotMatch(career.registry.overlay.innerHTML,/How long should this run last|daysCfg/,
    "a direct fixed-period route bypassed canonicalization");
}

// Guided Agency Career still rolls a fresh career. Only the short Fundamentals action
// tutorial uses its fixed teaching seed, so repeat Agency launches do not feel identical.
{
  const launcher=makeContext("?mode=1&days=12&budget=20000&seed=294");
  vm.runInContext("randomScenarioSeed=(()=>{let next=9100;return()=>++next;})()",launcher.context);
  /* Agency Career still draws a fresh scenario every launch — no fixed career seed. Guided
     start is a separate promise: it corrals into Fundamentals, the walkthrough that exists. */
  const agencyDraft={mode:6,tutorial:false,guidance:"compact",flavor:"vc",analogies:true,budget:100000,
    agencyName:"Nova Avenue",hq:"new-york-ny",agencyType:"digital_agency"};
  assert.equal(value(launcher.context,`launchWizardRun(${JSON.stringify(agencyDraft)})`),true);
  const first=new URLSearchParams(value(launcher.context,"location.search"));
  assert.equal(first.get("mode"),"6");assert.equal(first.get("seed"),"9101");assert.equal(first.get("tutorial"),null);
  assert.equal(value(launcher.context,`launchWizardRun(${JSON.stringify(agencyDraft)})`),true);
  const second=new URLSearchParams(value(launcher.context,"location.search"));
  assert.equal(second.get("seed"),"9102","Agency Career reused a fixed scenario seed");
  assert.notEqual(second.get("seed"),first.get("seed"));
  assert.equal(value(launcher.context,`launchWizardRun(${JSON.stringify({...agencyDraft,tutorial:true,guidance:"guided"})})`),true);
  const guidedCareer=new URLSearchParams(value(launcher.context,"location.search"));
  assert.equal(guidedCareer.get("mode"),"1","Guided start left the player on an unguided Agency Career");
  assert.equal(guidedCareer.get("seed"),"2601");assert.equal(guidedCareer.get("tutorial"),"1");
  assert.equal(value(launcher.context,'launchWizardRun({mode:1,tutorial:true,guidance:"guided",flavor:"vc",analogies:true,days:12,budget:20000})'),true);
  const fundamentals=new URLSearchParams(value(launcher.context,"location.search"));
  assert.equal(fundamentals.get("seed"),"2601","the deterministic Fundamentals tutorial lost its fixed teaching seed");
  assert.equal(fundamentals.get("tutorial"),"1");assert.equal(fundamentals.get("guided"),"1");
}

{
  const configurable=makeContext("?mode=1&seed=293");
  const nonfixed=JSON.parse(value(configurable.context,
    "JSON.stringify(MODE_IDS.filter(mode=>!CONFIG_SPECS[mode].fixedPeriod))"));
  assert(nonfixed.length,"no configurable-period mode remains covered");
  for(const mode of nonfixed){
    vm.runInContext(`setupWizard({mode:${mode}},"period")`,configurable.context);
    assert.match(configurable.registry.overlay.innerHTML,/data-wizard-step="period"/,
      `mode ${mode} incorrectly skipped its configurable period`);
    assert.match(configurable.registry.overlay.innerHTML,/How long should this run last/);
    assert.match(configurable.registry.overlay.innerHTML,/id="daysCfg"/);
    assert.match(configurable.registry.overlay.innerHTML,/id="keepPeriod"/);
    assert.doesNotMatch(configurable.registry.overlay.innerHTML,/disabled/,
      `mode ${mode} exposed a disabled period control`);
  }
}

// Nightmare configuration cannot make the three monthly gates unreachable.
{
  const low=makeContext("?mode=5&days=12&budget=1000&seed=29").context;
  assert.equal(value(low,"DAYS"),90);
  assert.equal(value(low,"DAILY"),25000);
  const high=makeContext("?mode=5&days=999&budget=9999999&seed=29").context;
  assert.equal(value(high,"DAYS"),180);
  assert.equal(value(high,"DAILY"),500000);
}

// Nightmare mandates round to whole 30-day acquisition blocks and stage period before budget.
for(const [days,expected] of [[91,90],[104,90],[105,120],[134,120],[135,150],[179,180]]){
  const {context}=makeContext(`?mode=5&days=${days}&seed=30`);
  assert.equal(value(context,"DAYS"),expected,`${days} days did not round to a 30-day block`);
}
{
  const {context,registry}=makeContext("?mode=5&days=120&seed=30");
  vm.runInContext('setupWizard({mode:5},"period")',context);
  assert.match(registry.overlay.innerHTML,/How long should this run last/);
  assert.match(registry.overlay.innerHTML,/id="daysCfg"[^>]*step="30"/);
  assert.doesNotMatch(registry.overlay.innerHTML,/budgetCfg|Daily portfolio authorization/);
  registry.keepPeriod.onclick();
  assert.match(registry.overlay.innerHTML,/How much can the portfolio spend each day/);
  assert.match(registry.overlay.innerHTML,/Daily portfolio authorization/);
  assert.match(registry.overlay.innerHTML,/id="budgetCfg"/);assert.doesNotMatch(registry.overlay.innerHTML,/daysCfg|Operating notes/);
}

// The configured account cap stops repeated +budget actions.
{
  const {context,registry}=makeContext("?mode=1&days=12&budget=5000&seed=31");
  const handler=registry.slots.listeners.click[0];
  for(let i=0;i<50;i++)handler({target:{closest:()=>({dataset:{act:"plus",i:"0"}})}});
  assert(value(context,"allocatedBudget()")<=value(context,"DAILY"));
}

// The modern measurement lens is reporting-only and uses explicit, internally consistent cost bases.
{
  const f=makeContext("?mode=2&seed=31");
  assert.equal(state(f.context).view,"modeled");
  assert.match(f.registry.strip.innerHTML,/All-in business ROI/);
  const before=value(f.context,'JSON.stringify({...S,view:null})');
  f.registry.viewBtn.onclick();
  assert.equal(state(f.context).view,"attributed");
  assert.match(f.registry.strip.innerHTML,/Attributed media ROI/);
  assert.equal(value(f.context,'JSON.stringify({...S,view:null})'),before,"measurement lens changed mechanics");
  f.registry.viewBtn.onclick();assert.equal(state(f.context).view,"modeled");

  vm.runInContext("requestCreative();runDay()",f.context);const s=state(f.context);
  approx(s.spendTotal,s.mediaSpendTotal+s.opsCost);
  approx(s.opsCost,Object.values(s.costBreakdown).reduce((n,v)=>n+v,0));
  assert.equal(s.costBreakdown.creative,value(f.context,"creativeRequestCost(creativeFormatFor(S.readyCreative[0]))"));assert(s.mediaSpendTotal>0);
  const mediaBefore=s.mediaSpendTotal,attributedBefore=s.attributedEarnedRevenue;
  vm.runInContext('S.pixel={status:"degraded",days:2,diagnosed:true};render()',f.context);
  value(f.context,'document.getElementById("pixelBtn")').onclick();
  assert.equal(state(f.context).mediaSpendTotal,mediaBefore);
  assert.equal(state(f.context).attributedEarnedRevenue,attributedBefore,"repair rewrote historical attribution");
  assert.equal(state(f.context).costBreakdown.measurement,750);
  approx(state(f.context).spendTotal,state(f.context).mediaSpendTotal+state(f.context).opsCost);
  assert.match(f.registry.log.innerHTML,/historical attribution gap remains/i);
}

}

if(smokeShard==="b2b"){
// Training XP is a profile-level learning record, not a shared device-wide balance.
{
  const localStore=new Map(),general=makeContext("?mode=1&seed=3301",{localStore,profile:"general"});
  vm.runInContext(`TrainingProgress.activate("general");TrainingProgress.beginRun({id:"profile-general",mode:1,seed:3301,days:12,budget:20000});
    globalThis.__profileAward=TrainingProgress.recordQuestion(TrainingProgress.questions[0],{correct:true,source:"recall"})`,general.context);
  assert.equal(value(general.context,"__profileAward.awarded"),500);
  assert.equal(value(general.context,"TrainingProgress.summary().totalXp"),500);
  assert(localStore.has("ttm.training.general.v1"),"general Training XP was not persisted");

  const specialist=makeContext("?mode=1&seed=3301",{localStore,profile:"specialist"});
  vm.runInContext('TrainingProgress.activate("specialist")',specialist.context);
  assert.equal(value(specialist.context,"TrainingProgress.summary().totalXp"),0,
    "general Training XP leaked into the specialist learning track");
  assert(localStore.has("ttm.training.specialist.v1"),"specialist training record was not initialized");

  const restored=makeContext("?mode=1&seed=3302",{localStore,profile:"general"});
  vm.runInContext('TrainingProgress.activate("general")',restored.context);
  assert.equal(value(restored.context,"TrainingProgress.summary().totalXp"),500,
    "general Training XP did not survive a page reload");
}

// Question awards are evidence-based: submissions settle once, a retry earns partial XP,
// and a skip awards nothing while leaving the concept available for another attempt.
{
  const fixture=makeContext("?mode=1&seed=3303");
  vm.runInContext(`TrainingProgress.activate("general");TrainingProgress.beginRun({id:"quiz-policy",mode:1,seed:3303,days:12,budget:20000});
    globalThis.__first=TrainingProgress.recordQuestion(TrainingProgress.questions[0],{correct:true,source:"recall"});
    globalThis.__duplicate=TrainingProgress.recordQuestion(TrainingProgress.questions[0],{correct:true,source:"recall"});
    globalThis.__wrong=TrainingProgress.recordQuestion(TrainingProgress.questions[2],{correct:false,source:"recall"});
    globalThis.__retry=TrainingProgress.recordQuestion(TrainingProgress.questions[2],{correct:true,source:"recall"});
    globalThis.__skip=TrainingProgress.recordQuestion(TrainingProgress.questions[4],{skipped:true,source:"recall"});
    globalThis.__afterSkip=TrainingProgress.recordQuestion(TrainingProgress.questions[4],{correct:true,source:"recall"})`,fixture.context);
  assert.equal(value(fixture.context,"__first.awarded"),500);
  assert.equal(value(fixture.context,"__duplicate.awarded"),0);
  assert.equal(value(fixture.context,"__duplicate.duplicate"),true);
  assert.equal(value(fixture.context,"__wrong.awarded"),0);
  assert.equal(value(fixture.context,"__retry.awarded"),200);
  assert.equal(value(fixture.context,"__skip.awarded"),0);
  assert.equal(value(fixture.context,"__afterSkip.awarded"),500);
  assert.equal(value(fixture.context,"TrainingProgress.summary().totalXp"),1200);
}

// Earlier run-local recall points migrate once, use the highest valid saved balance rather
// than summing duplicated questions across modes, and cannot exceed the migration cap.
{
  const localStore=new Map(),saved=(mode,knowledgeCredits)=>JSON.stringify({schema:3,profile:"general",mode,state:{knowledgeCredits}});
  localStore.set("ttm.save.general.mode-0.v3",saved(0,500));
  localStore.set("ttm.save.general.mode-1.v3",saved(1,9000));
  localStore.set("ttm.save.general.mode-2.v3",JSON.stringify({schema:2,profile:"general",mode:2,state:{knowledgeCredits:8000}}));
  localStore.set("ttm.save.general.v3",saved(1,2800));
  const migrated=makeContext("?mode=3&seed=3307",{localStore,profile:"general"});
  assert.equal(value(migrated.context,"TrainingProgress.summary().totalXp"),3000,
    "legacy recall migration did not import the capped highest valid balance");
  assert(localStore.has("ttm.save.general.mode-0.v3")&&localStore.has("ttm.save.general.v3"),
    "Training XP migration removed an earlier save");
  vm.runInContext('TrainingProgress.activate("general")',migrated.context);
  assert.equal(value(migrated.context,"TrainingProgress.summary().totalXp"),3000,
    "legacy recall migration awarded the same history twice");
  assert.equal(value(migrated.context,'JSON.parse(localStorage.getItem("ttm.training.general.v1")).events.filter(event=>event.eventType==="legacy.quiz_import").length'),1,
    "legacy recall migration did not keep one auditable import event");
}

// The optional placement check cannot reveal its explanation or mark the correct option
// before the player commits. It reveals both only after the answer.
{
  const fixture=makeContext("?mode=1&seed=3304");
  vm.runInContext(`TrainingProgress.activate("general");TrainingProgress.beginRun({id:"placement-ui",mode:1,seed:3304,days:12,budget:20000});
    TrainingProgress.openQuestion(TrainingProgress.questions[0],{source:"placement"})`,fixture.context);
  assert.match(fixture.registry.overlay.innerHTML,/What is the most accurate relationship between an ad and its creative\?/);
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/Replacing creative does not automatically create another campaign/,
    "placement explanation appeared before an answer");
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/Why that answer works|Strongest answer|quiz-result-correct/,
    "placement feedback signaled the answer before commitment");
  const choices=fixture.registry.overlay.querySelectorAll("button[data-training-choice]");
  assert.equal(choices.length,4,"placement question did not present four answer choices");
  choices[1].onclick();
  assert.match(fixture.registry.overlay.innerHTML,/quiz-result-correct/);
  assert.match(fixture.registry.overlay.innerHTML,/Replacing creative does not automatically create another campaign/);
  assert.match(fixture.registry.overlay.innerHTML,/\+500 Training XP/);
}

// Completing or reopening the same run can record its learning evidence only once.
{
  const fixture=makeContext("?mode=1&seed=3305");
  vm.runInContext(`TrainingProgress.activate("general");TrainingProgress.beginRun({id:"run-idempotency",mode:1,seed:3305,days:12,budget:20000});
    globalThis.__completeFirst=TrainingProgress.completeRun({success:true,outcome:"objective-cleared",state:S});
    globalThis.__xpAfterFirst=TrainingProgress.summary().totalXp;
    globalThis.__completeAgain=TrainingProgress.completeRun({success:true,outcome:"objective-cleared",state:S})`,fixture.context);
  assert.equal(value(fixture.context,"__completeFirst.duplicate"),false);
  assert(value(fixture.context,"__completeFirst.awarded")>0,"run completion did not award Training XP");
  assert.equal(value(fixture.context,"__completeAgain.awarded"),0);
  assert.equal(value(fixture.context,"__completeAgain.duplicate"),true);
  assert.equal(value(fixture.context,"TrainingProgress.summary().totalXp"),value(fixture.context,"__xpAfterFirst"));
  assert.equal(value(fixture.context,'Object.keys(JSON.parse(localStorage.getItem("ttm.training.general.v1")).runs).length'),1);
}

// Training operations are a separate observer layer: they cannot mutate campaign economics
// or consume the deterministic simulation RNG.
{
  const fixture=makeContext("?mode=1&seed=3306"),before=value(fixture.context,"JSON.stringify(S)"),
    rngBefore=value(fixture.context,"JSON.stringify(S.rng)"),urlBefore=value(fixture.context,"location.search");
  vm.runInContext(`TrainingProgress.activate("general");TrainingProgress.beginRun({id:"economic-isolation",mode:1,seed:3306,days:12,budget:20000});
    TrainingProgress.recordQuestion(TrainingProgress.questions[0],{correct:true,source:"recall"});
    TrainingProgress.completeRun({success:false,outcome:"practice",state:S})`,fixture.context);
  assert.equal(value(fixture.context,"JSON.stringify(S)"),before,"Training XP mutated simulation state");
  assert.equal(value(fixture.context,"JSON.stringify(S.rng)"),rngBefore,"Training XP consumed seeded simulation RNG");
  assert.equal(value(fixture.context,"location.search"),urlBefore,"Training XP changed the active scenario route");
}

// Knowledge checks award only Training XP and cannot manufacture account economics.
{
  const f=makeContext("?mode=1&seed=33",{reducedMotion:false});
  vm.runInContext('S.queue=[{q:"Type the requested hidden phrase.",a:["orbit margin"],why:"Hidden explanation after commitment."}]',f.context);
  const before=value(f.context,'JSON.stringify({revenue:S.revenue,attributedRevenue:S.attributedRevenue,earnedRevenue:S.earnedRevenue,attributedEarnedRevenue:S.attributedEarnedRevenue,spendTotal:S.spendTotal,mediaSpendTotal:S.mediaSpendTotal,opsCost:S.opsCost,leadsTotal:S.leadsTotal,pending:S.pending})');
  vm.runInContext("recall()",f.context);
  assert.match(f.registry.overlay.innerHTML,/Type the requested hidden phrase/);
  assert.doesNotMatch(f.registry.overlay.innerHTML,/orbit margin|Hidden explanation after commitment|flavor-cue|class="rosetta"|class="lore"|data-flavor-concept/i,
    "the unanswered quiz leaked its answer, explanation, analogy, or tooltip layer");
  f.registry.ans.value="orbit margin";let prevented=false;const settledSubmit=f.registry.sendA.onclick;
  f.registry.sendA.click=()=>f.registry.sendA.onclick();
  f.registry.ans.onkeydown({key:"Enter",preventDefault(){prevented=true;}});
  settledSubmit();
  assert.equal(prevented,true,"Enter submission did not suppress the input's default action");
  assert.equal(state(f.context).knowledgeCredits,500);assert.equal(state(f.context).telemetry.recallRight,1,
    "the same visible answer could be submitted twice");
  assert.match(f.registry.overlay.innerHTML,/quiz-result-correct/);assert.match(f.registry.overlay.innerHTML,/✓/);
  assert.match(f.registry.overlay.innerHTML,/Correct!/);assert.match(f.registry.overlay.innerHTML,/\+500 Training XP/);
  assert.match(f.registry.fxLayer.innerHTML,/fx-score quiz-correct/);assert.match(f.registry.fxLayer.innerHTML,/fx-value[^>]*>✓/);
  assert.match(f.registry.overlay.innerHTML,/Hidden explanation after commitment/);
  /* One short analogy cue is welcome here; the nine-card term grid is not (opt-in, 2026-08-09). */
  assert.match(f.registry.overlay.innerHTML,/flavor-cue/);
  assert.doesNotMatch(f.registry.overlay.innerHTML,/class="rosetta"/,"the term grid auto-appended to a quiz result");
  assert.equal(value(f.context,'JSON.stringify({revenue:S.revenue,attributedRevenue:S.attributedRevenue,earnedRevenue:S.earnedRevenue,attributedEarnedRevenue:S.attributedEarnedRevenue,spendTotal:S.spendTotal,mediaSpendTotal:S.mediaSpendTotal,opsCost:S.opsCost,leadsTotal:S.leadsTotal,pending:S.pending})'),before);
  vm.runInContext("clearFx()",f.context);
  finiteTree(state(f.context));

  const miss=makeContext("?mode=1&seed=34",{reducedMotion:false});
  vm.runInContext('S.queue=[{q:"Pick the exact answer.",a:["correct choice"],why:"The explanation follows the attempt."}];recall()',miss.context);
  miss.registry.ans.value="wrong choice";miss.registry.sendA.onclick();
  assert.equal(state(miss.context).telemetry.recallWrong,1);
  assert.doesNotMatch(miss.registry.overlay.innerHTML,/quiz-result-correct|✓/);
  assert.doesNotMatch(miss.registry.fxLayer.innerHTML,/quiz-correct/);

  const reduced=makeContext("?mode=1&seed=35");
  vm.runInContext('S.queue=[{q:"Pick the exact answer.",a:["correct choice"],why:"The explanation follows the attempt."}];recall()',reduced.context);
  reduced.registry.ans.value="correct choice";reduced.registry.sendA.onclick();
  assert.match(reduced.registry.overlay.innerHTML,/quiz-result-correct[\s\S]*✓/);
  assert.equal(reduced.registry.fxLayer.innerHTML,"","reduced motion unexpectedly launched the animated success burst");

  const skipped=makeContext("?mode=1&seed=36");
  vm.runInContext('S.queue=[{id:"skip-integration",discipline:"account",q:"Skip this once.",a:["answer"],why:"Shown later."}];recall()',skipped.context);
  const skipHandler=skipped.registry.skipA.onclick;skipHandler();skipHandler();
  assert.equal(state(skipped.context).queue.length,1,"one skip requeued the same question more than once");
  assert.equal(value(skipped.context,"TrainingProgress.summary().totalXp"),0,"skipping a question awarded Training XP");
  assert.equal(value(skipped.context,'JSON.parse(localStorage.getItem("ttm.training.general.v1")).questions["skip-integration"].skipped'),1,
    "the same visible skip could be recorded twice");
}

// Short recall aliases are exact answers, not accidental substring matches inside unrelated words.
{
  const {context}=makeContext("?mode=1&seed=33");
  assert.equal(value(context,'recallMatches("f",["false","f"])'),true);
  assert.equal(value(context,'recallMatches("profit",["false","f"])'),false);
  assert.equal(value(context,'recallMatches("falsehood",["false","f"])'),false);
  assert.equal(value(context,'recallMatches("lp",["lander","the lander","lp","landing page"])'),true);
  assert.equal(value(context,'recallMatches("help",["lander","the lander","lp","landing page"])'),false);
  assert.equal(value(context,'recallMatches("the landing page is weak",["landing page"])'),true);
}

// Asset-bin shipping requires an explicit eligible slot and changes only that selected ad/creative.
{
  const f=makeContext("?mode=1&seed=34");
  vm.runInContext('S.bin=[{name:"Synthetic Test Asset",cpm:9,ctr:1.4,cvr:3,epl:40,lpctr:20,flag:null,inspected:true}]',f.context);
  const slot0=state(f.context).slots[0].c.name,slot1=state(f.context).slots[1].c.name;
  assert.equal(value(f.context,"assetTargetPicker(0)"),true);
  assert.equal(f.registry.overlay.querySelectorAll("button[data-found-target]").length,3,"brand-play slot was offered as an asset target");
  assert.match(f.registry.overlay.innerHTML,/modeled slot ROI|no delivery evidence/);
  assert.match(f.registry.overlay.innerHTML,/attributed ad ROI|no delivery evidence/);
  assert.equal(value(f.context,"shipFoundAsset(0,1)"),true);
  assert.equal(state(f.context).slots[0].c.name,slot0);assert.notEqual(state(f.context).slots[1].c.name,slot1);
  assert.equal(state(f.context).slots[1].c.name,"Synthetic Test Asset");
}
{
  const f=makeContext("?mode=1&seed=341");
  vm.runInContext('S.bin=[{name:"Flagged Test Asset",format:"static",cpm:9,ctr:1.4,cvr:3,epl:40,lpctr:20,flag:"Synthetic policy fixture",inspected:true}];S.telemetry.swaps=0',f.context);
  const creativeBefore=value(f.context,"JSON.stringify(S.slots[1].c)");
  assert.equal(value(f.context,"shipFoundAsset(0,1)"),true);
  assert.equal(state(f.context).telemetry.swaps,0,"a blocked asset was counted as a completed creative swap");
  assert.equal(state(f.context).telemetry.flagsShipped,1);
  assert.equal(value(f.context,"JSON.stringify(S.slots[1].c)"),creativeBefore,"a blocked asset replaced the live creative");
  assert.equal(state(f.context).slots[1].blocked,2);
}

// Exhausted, dead, and hierarchy-incompatible controls are strict no-ops.
{
  const f=makeContext("?mode=4&seed=35");
  vm.runInContext("S.slots[0].restates=3;render()",f.context);
  assert.match(f.registry.slots.innerHTML,/data-act="restate" data-i="0"[^>]*disabled/);
  const before=value(f.context,"JSON.stringify(S)");clickAct(f,"restate");
  assert.equal(value(f.context,"JSON.stringify(S)"),before);
}
{
  const f=makeContext("?mode=4&seed=36");
  vm.runInContext("S.slots[0].alive=false;S.slots[0].budget=0;render()",f.context);
  for(const act of ["plus","minus","restate","recast","sooner","platform","ask","kill"]){
    const before=value(f.context,"JSON.stringify(S)");clickAct(f,act);assert.equal(value(f.context,"JSON.stringify(S)"),before,`${act} changed a dead slot`);
  }
}
{
  const f=makeContext("?mode=1&seed=37");
  vm.runInContext("requestCreative()",f.context);const before=value(f.context,"JSON.stringify(S)");
  assert.equal(value(f.context,"shipReady(0,3)"),false);assert.equal(value(f.context,"JSON.stringify(S)"),before);
  clickAct(f,"swap",3);assert.equal(value(f.context,"JSON.stringify(S)"),before,"brand-play swap control consumed the ready creative");
  vm.runInContext("runDay()",f.context);assert(value(f.context,"brandDiscount()")>0);
  vm.runInContext("S.slots[3].hist=Array(10).fill(1);S.slots[3].budget=scaledDefault(1200)",f.context);
  approx(value(f.context,"brandDiscount()"),.15,1e-12,"fully funded brand-play lift did not reach its mature cap");
  vm.runInContext("S.slots[3].budget=scaledDefault(1200)/2",f.context);
  approx(value(f.context,"brandDiscount()"),.075,1e-12,"half-funded brand play received the full account lift");
  vm.runInContext("S.slots[3].budget=0",f.context);assert.equal(value(f.context,"brandDiscount()"),0);
  vm.runInContext("S.slots[3].budget=100;S.slots[3].blocked=1",f.context);assert.equal(value(f.context,"brandDiscount()"),0);
}

// Slot-scoped modern events target only live, funded, deliverable ads and fail closed to quiet.
{
  const {context}=makeContext("?mode=2&seed=371");
  vm.runInContext(`DAY_EVENTS.forEach(event=>event.weight=event.id==="copied"?1:0);
    S.slots.forEach(slot=>{slot.c.brandPlay=false;slot.alive=true;slot.budget=100;slot.blocked=0;slot.fatigue=10;});
    S.slots[0].alive=false;S.slots[1].budget=0;S.slots[2].blocked=2;
    S.dayState=drawDayState(S.day)`,context);
  assert.equal(state(context).dayState.event.id,"copied");
  assert.equal(state(context).dayState.event.target,3,"targeted event selected a dead, zero-budget, or blocked ad");
  assert.equal(state(context).slots[3].fatigue,90);
  assert.deepEqual(Array.from(state(context).slots.slice(0,3),slot=>slot.fatigue),[10,10,10]);

  vm.runInContext(`S.slots.forEach((slot,index)=>{slot.alive=index!==0;slot.budget=index===1?0:100;slot.blocked=index>=2?1:0;slot.fatigue=12;});
    S.dayState=drawDayState(S.day+1)`,context);
  assert.equal(state(context).dayState.event.id,"quiet","no-target slot event did not fall back to a quiet day");
  assert.equal(state(context).dayState.event.target,null);
  assert.deepEqual(Array.from(state(context).slots,slot=>slot.fatigue),[12,12,12,12],"quiet fallback still mutated an ineligible ad");
}
{
  const f=makeContext("?mode=3&seed=38");
  vm.runInContext("S.slots[0].multiplies=MAX_MULT;S.slots[0].fatigue=70;render()",f.context);
  const before=value(f.context,"JSON.stringify(S)");clickAct(f,"mult",0);
  assert.equal(value(f.context,"JSON.stringify(S)"),before,"an exhausted multiplication axis still charged or refreshed fatigue");
}
{
  const f=makeContext("?mode=4&seed=39");
  vm.runInContext("S.slots[0].fatigue=23;render()",f.context);
  let before=value(f.context,"JSON.stringify(S)");clickAct(f,"recast",0);
  assert.equal(value(f.context,"JSON.stringify(S)"),before,"an unavailable recast charged or reset fatigue");
  vm.runInContext("S.slots[0].lpOptimizations=2;render()",f.context);
  before=value(f.context,"JSON.stringify(S)");clickAct(f,"lander",0);
  assert.equal(value(f.context,"JSON.stringify(S)"),before,"a capped landing action changed state");
}

// Budget telemetry records a real decision once per day, while capped/zero adjustments are strict no-ops.
{
  const f=makeContext("?mode=2&seed=40");
  vm.runInContext("S.slots.forEach((slot,i)=>slot.budget=i?0:DAILY-BUDGET_STEP);S.slots[0].hist=[100,0];delete S.slots[0].lastBudgetDecisionDay;render()",f.context);
  clickAct(f,"plus",0);assert.equal(state(f.context).slots[0].budget,value(f.context,"DAILY"));
  assert.equal(state(f.context).telemetry.knee,1);
  clickAct(f,"minus",0);assert.equal(state(f.context).telemetry.knee,1,"one day's reallocation was counted twice");

  vm.runInContext("S.slots.forEach((slot,i)=>slot.budget=i?0:DAILY);delete S.slots[0].lastBudgetDecisionDay;render()",f.context);
  let before=value(f.context,"JSON.stringify(S)");clickAct(f,"plus",0);
  assert.equal(value(f.context,"JSON.stringify(S)"),before,"a capped increase changed budget telemetry");
  before=value(f.context,"JSON.stringify(S)");clickAct(f,"minus",1);
  assert.equal(value(f.context,"JSON.stringify(S)"),before,"a zero-budget decrease changed budget telemetry");
}

// Entering a fresh Day-1 board makes it returnable even before the player changes simulation state.
{
  const localStore=new Map(),f=makeContext("?mode=3&days=12&budget=20000&seed=400&autostart=1&brief=1",{localStore});finishRunOpening(f);
  const untouched=value(f.context,"JSON.stringify(S)");assert.equal(value(f.context,"currentRunHasProgress()"),false);
  vm.runInContext("mainMenu()",f.context);assert.match(f.registry.overlay.innerHTML,/Return to run/);
  assert.equal(typeof f.registry.menuDismiss.onclick,"function");assert.equal(typeof f.registry.continueRun.onclick,"function");assert.equal(typeof f.registry.saveNow.onclick,"function");
  f.registry.saveNow.onclick();assert(localStore.has("ttm.save.general.mode-3.v3"),"manual Day-1 save did not create a checkpoint");
  f.registry.continueRun.onclick();assert.equal(f.registry.overlay.innerHTML,"");
  assert.equal(value(f.context,"JSON.stringify(S)"),untouched,"returning from the Day-1 menu reset an entered fresh run");
}

// A valid Day-1 choice counts as progress before the first period creates spend or ops cost.
{
  const f=makeContext("?mode=1&days=12&budget=20000&seed=401");vm.runInContext("close()",f.context);
  assert.equal(value(f.context,"currentRunHasProgress()"),false);
  const before=state(f.context).slots[0].budget;clickAct(f,"minus",0);
  assert.equal(state(f.context).day,1);assert.equal(state(f.context).spendTotal,0);assert.equal(state(f.context).opsCost,0);
  assert.equal(state(f.context).slots[0].budget,before-value(f.context,"BUDGET_STEP"));
  assert.equal(value(f.context,"currentRunHasProgress()"),true);vm.runInContext("mainMenu()",f.context);
  assert.match(f.registry.overlay.innerHTML,/Return to run/);assert.equal(typeof f.registry.saveNow.onclick,"function");
}

// Day-1 Classic pacing/tracking work and free asset inspection are navigation-safe decisions too.
{
  const pacing=makeContext("?mode=0&stage=2&days=12&budget=300&seed=402");vm.runInContext("close()",pacing.context);
  assert.equal(value(pacing.context,"currentRunHasProgress()"),false);pacing.registry.delivBtn.onclick();
  assert.equal(state(pacing.context).day,1);assert.equal(state(pacing.context).spendTotal,0);assert.equal(value(pacing.context,"currentRunHasProgress()"),true);

  const tracking=makeContext("?mode=0&stage=2&days=12&budget=300&seed=403");vm.runInContext("close()",tracking.context);
  tracking.registry.trackBtn.onclick();assert.equal(state(tracking.context).day,1);assert.equal(state(tracking.context).spendTotal,0);
  assert.equal(value(tracking.context,"currentRunHasProgress()"),true);tracking.registry.closeB.onclick();
  assert.equal(state(tracking.context).groups.some(group=>group.trackingBroken),false);

  const assets=makeContext("?mode=1&days=12&budget=20000&seed=404");vm.runInContext("close();bin()",assets.context);
  const inspect=assets.registry.overlay.querySelectorAll("button[data-b]").find(button=>button.dataset.b==="insp");assert(inspect);inspect.onclick();
  assert.equal(state(assets.context).day,1);assert.equal(state(assets.context).spendTotal,0);assert.equal(value(assets.context,"currentRunHasProgress()"),true);
}

// A completed modern period preserves its earned, settled, attribution, and pending ledgers.
{
  const f=makeContext("?mode=4&days=4&budget=20000&seed=40");runToEnd(f.context);
  const final=value(f.context,"JSON.stringify(S)");assert.equal(value(f.context,"runDay()"),false);
  assert.equal(value(f.context,"JSON.stringify(S)"),final,"a post-period modern run mutated state");
}

// Setup normalization stays in the draft; only the final, explicit Start writes config and navigates.
{
  const sessionStore=new Map();
  const f=makeContext("?mode=1&days=12&budget=20000&seed=27",{sessionStore});
  assert.deepEqual(JSON.parse(sessionStore.get("media-buying-trainer-config-v1"))["1"],{days:12,budget:20000});
  const stateBefore=value(f.context,"JSON.stringify(S)"),searchBefore=value(f.context,"location.search");
  vm.runInContext('setupWizard({mode:1,tutorial:false,guidance:"analyst",flavor:"dnd",analogies:false},"period")',f.context);
  f.registry.daysCfg.value="999";f.registry.keepPeriod.onclick();
  assert.match(f.registry.overlay.innerHTML,/How much can the account spend each day/);
  f.registry.budgetCfg.value="-1";f.registry.keepBudget.onclick();
  assert.match(f.registry.overlay.innerHTML,/60-day run/);assert.match(f.registry.overlay.innerHTML,/\$5,000\/day/);
  assert.match(f.registry.overlay.innerHTML,/Tutorial off; opening briefing only/);assert.match(f.registry.overlay.innerHTML,/Expert on-screen help/);assert.match(f.registry.overlay.innerHTML,/Media-buying terms only/);
  assert.equal(value(f.context,"location.search"),searchBefore);assert.equal(value(f.context,"JSON.stringify(S)"),stateBefore);
  assert.deepEqual(JSON.parse(sessionStore.get("media-buying-trainer-config-v1"))["1"],{days:12,budget:20000});
  f.registry.launchRun.onclick();const params=new URLSearchParams(value(f.context,"location.search"));
  assert.equal(params.get("days"),"60");assert.equal(params.get("budget"),"5000");assert.equal(params.get("autostart"),"1");assert.equal(params.get("brief"),"1");
  assert.equal(params.get("tutorial"),null);assert.equal(params.get("guided"),null);
  assert.equal(value(f.context,`validSeed(${Number(params.get("seed"))})`),true,"a fresh run did not receive a valid randomized scenario seed");
  assert.equal(params.get("flavor"),"dnd");
  assert.deepEqual(JSON.parse(f.localStore.get("ttm.onboarding.general.v2")),{tutorial:false,guidance:"analyst",flavor:"dnd",analogies:false});
  assert.deepEqual(JSON.parse(f.localStore.get("ttm.ui.general.v1")),{tooltips:false,analogies:false,density:"analyst"});
  assert.deepEqual(JSON.parse(sessionStore.get("media-buying-trainer-config-v1"))["1"],{days:60,budget:5000});
}
{
  const f=makeContext("?mode=1&days=12&budget=20000&seed=27&autostart=1");
  const upgraded=new URLSearchParams(value(f.context,"location.search"));
  assert.equal(upgraded.get("mode"),"1");assert.equal(upgraded.get("days"),"12");assert.equal(upgraded.get("budget"),"20000");
  assert.equal(upgraded.get("seed"),"27");assert.equal(upgraded.get("autostart"),"1");assert.equal(upgraded.get("brief"),"1");
  assert.equal(value(f.context,"typeof S"),"undefined","legacy autostart booted the board before its upgraded briefing route reloaded");
}

}

if(smokeShard==="c"){
// Every starting creative exposes a valid, mechanically meaningful format and rarity.
for(let mode=1;mode<=4;mode++){
  const fixture=makeContext(`?mode=${mode}&seed=41`),s=state(fixture.context);
  for(const slot of s.slots){
    assert(value(fixture.context,`!!CREATIVE_FORMATS[${JSON.stringify(slot.c.format)}]`),`mode ${mode} has an unknown starting format`);
    assert(["Common","Epic","Legendary"].includes(slot.c.rarity),`mode ${mode} omitted starting rarity`);
    assert(["common","epic","legendary"].includes(slot.c.rarityClass),`mode ${mode} omitted starting rarity class`);
  }
  assert.equal((fixture.registry.slots.innerHTML.match(/format-badge/g)||[]).length,s.slots.length,
    `mode ${mode} did not render one format badge per starting card`);
  for(const rarity of new Set(s.slots.map(slot=>slot.c.rarity)))assert(fixture.registry.slots.innerHTML.includes(`>${rarity}</span>`));
}
{
  const fixture=makeContext("?mode=5&seed=41"),s=state(fixture.context);
  for(const account of s.accounts){
    assert(value(fixture.context,`!!CREATIVE_FORMATS[${JSON.stringify(account.creative.format)}]`));
    if(account.creative.format==="search")assert.equal(account.creative.tier,"Search text / assets");
    else assert(["Common","Epic","Legendary"].includes(account.creative.tier));
  }
}

// Creative test → rarity reveal → explicit slot swap resets creative state.
{
  const {context}=makeContext("?mode=1&seed=41");
  vm.runInContext("requestCreative()",context);
  assert.equal(state(context).readyCreative.length,1);
  assert(["Common","Epic","Legendary"].includes(state(context).readyCreative[0].rarity));
  vm.runInContext("shipReady(0,0)",context);
  assert.equal(state(context).readyCreative.length,0);
  assert.equal(state(context).slots[0].fatigue,6);
  assert.equal(state(context).telemetry.swaps,1);
}

// A compliance rejection is a failed test, not a shipped creative swap.
{
  const {context}=makeContext("?mode=3&seed=411");
  vm.runInContext(`S.requests=[{c:{...LIBRARY[0],name:"Rejected fixture"},stage:"review",days:0}];
    S.telemetry.swaps=0;S.telemetry.rejected=0;stateRoll=()=>.95;globalThis.pipelineLines=[];
    advancePipeline(pipelineLines)`,context);
  assert.equal(state(context).requests.length,0);
  assert.equal(state(context).readyCreative.length,0);
  assert.equal(state(context).telemetry.rejected,1);
  assert.equal(state(context).telemetry.swaps,0,"a rejected creative was counted as a successful live swap");
  assert.match(value(context,"pipelineLines.join(' ')"),/Not approved/);
}

// A save carries a non-economic training-run identity so reopening a terminal debrief cannot
// mint a second completion award for the same playthrough.
{
  const localStore=new Map(),search="?mode=1&days=12&budget=20000&seed=6061",first=makeContext(search,{localStore});
  vm.runInContext(`globalThis.__savedRunAward=TrainingProgress.completeRun({success:false,outcome:"practice",state:S});
    saveGame("training-run-metadata",false)`,first.context);
  const saved=JSON.parse(localStore.get("ttm.save.general.mode-1.v3")),run=value(first.context,"TrainingProgress.currentRunRecord()");
  assert(run&&typeof run.id==="string"&&run.id,"a new scenario did not receive a training-run ID");
  assert.equal(saved.trainingRun.id,run.id,"the checkpoint omitted its training-run identity");
  assert.deepEqual({mode:saved.trainingRun.mode,seed:saved.trainingRun.seed,days:saved.trainingRun.days,budget:saved.trainingRun.budget},
    {mode:1,seed:6061,days:12,budget:20000});
  const restored=makeContext(`${search}&resume=1`,{localStore});
  assert.equal(value(restored.context,"TrainingProgress.currentRunRecord().id"),run.id,
    "resume created a new training-run identity for the same playthrough");
  vm.runInContext('globalThis.__reopenedRunAward=TrainingProgress.completeRun({success:false,outcome:"practice",state:S})',restored.context);
  assert.equal(value(restored.context,"__reopenedRunAward.awarded"),0);
  assert.equal(value(restored.context,"__reopenedRunAward.duplicate"),true,
    "a restored run could mint its completion award a second time");
}

// Saves are profile-isolated and resume both RNG cursors, so the next simulated day is identical.
{
  const localStore=new Map(),search="?mode=3&days=12&budget=20000&seed=61&flavor=dnd";
  const original=makeContext(search,{localStore,profile:"general"});
  vm.runInContext("runDay();requestCreative();runDay();saveGame('manual',false)",original.context);
  const checkpoint=value(original.context,"JSON.stringify(S)"),generalKey="ttm.save.general.mode-3.v3";
  const generalRecord=JSON.parse(localStore.get(generalKey));
  assert.equal(generalRecord.profile,"general");assert.equal(generalRecord.schema,3);assert.equal(generalRecord.creativeTaxonomy,2);
  assert.equal(JSON.stringify(generalRecord.state),checkpoint);assert.equal(JSON.stringify(generalRecord.state.rng),value(original.context,"JSON.stringify(S.rng)"));
  const checkpointStore=new Map(localStore);
  vm.runInContext("runDay()",original.context);const expectedNext=value(original.context,"JSON.stringify(S)");

  const specialist=makeContext(search,{localStore,profile:"specialist"});
  assert.equal(value(specialist.context,"saveRecord()"),null,"general save leaked into specialist profile");
  vm.runInContext("runDay();saveGame('manual',false)",specialist.context);
  assert.equal(JSON.parse(localStore.get("ttm.save.specialist.mode-3.v3")).profile,"specialist");
  assert.equal(JSON.parse(localStore.get(generalKey)).profile,"general");

  const restored=makeContext(`${search}&resume=1`,{localStore:checkpointStore,profile:"general"});
  assert.equal(value(restored.context,"ACTIVE_PROFILE"),"general");assert.equal(value(restored.context,"JSON.stringify(S)"),checkpoint);
  assert.doesNotMatch(restored.history.lastUrl||"",/resume=1/);
  assert.equal(restored.registry.overlay.innerHTML,"","a resumed checkpoint was hidden behind the briefing");
  vm.runInContext("runDay()",restored.context);
  assert.equal(value(restored.context,"JSON.stringify(S)"),expectedNext,
    "restored event/creative RNG cursors did not reproduce the next day bit-for-bit");

  const wrongBudget=makeContext("?mode=3&days=12&budget=30000&seed=61&flavor=dnd&resume=1",
    {localStore:new Map(checkpointStore),profile:"general"});
  assert.equal(value(wrongBudget.context,"DAILY"),30000);
  assert.notEqual(value(wrongBudget.context,"JSON.stringify(S)"),checkpoint,
    "a checkpoint created under a different budget was restored into incompatible mechanics");
  assert.equal(value(wrongBudget.context,"compatibleSave(saveRecord())"),false);
}

// Numeric save metadata serialized as strings is canonicalized before compatibility checks and resumes without a redirect loop.
{
  const search="?mode=0&stage=2&days=30&budget=300&seed=610",key="ttm.save.general.mode-0.v3",localStore=new Map(),
    original=makeContext(search,{localStore});
  vm.runInContext('saveGame("numeric-string-fixture",false)',original.context);
  const snapshot=value(original.context,"JSON.stringify(S)"),record=JSON.parse(localStore.get(key));
  for(const field of ["mode","stage","days","budget","seed"])record[field]=String(record[field]);
  localStore.set(key,JSON.stringify(record));
  const restored=makeContext(`${search}&resume=1`,{localStore}),normalized=JSON.parse(value(restored.context,"JSON.stringify(saveRecord())"));
  for(const field of ["mode","stage","days","budget","seed"])
    assert.equal(typeof normalized[field],"number",`${field} remained a numeric string after save normalization`);
  assert.deepEqual({mode:normalized.mode,stage:normalized.stage,days:normalized.days,budget:normalized.budget,seed:normalized.seed},
    {mode:0,stage:2,days:30,budget:300,seed:610});
  assert.equal(value(restored.context,"JSON.stringify(S)"),snapshot,"numeric-string metadata prevented the valid checkpoint from restoring");
  assert.doesNotMatch(restored.history.lastUrl||"",/resume=1/);
}

// The one colliding legacy format ID migrates without changing newly authored Static saves.
{
  const search="?mode=1&days=12&budget=20000&seed=611",key="ttm.save.general.mode-1.v3";
  const currentStore=new Map(),current=makeContext(search,{localStore:currentStore});
  vm.runInContext('S.slots[0].c={...S.slots[0].c,format:"static"};saveGame("taxonomy-v2",false)',current.context);
  const currentRecord=JSON.parse(currentStore.get(key));assert.equal(currentRecord.creativeTaxonomy,2);
  const currentRestored=makeContext(`${search}&resume=1`,{localStore:new Map(currentStore)});
  assert.equal(state(currentRestored.context).slots[0].c.format,"static");

  const legacyRecord=JSON.parse(currentStore.get(key));delete legacyRecord.creativeTaxonomy;
  const legacyStore=new Map([[key,JSON.stringify(legacyRecord)]]),legacyRestored=makeContext(`${search}&resume=1`,{localStore:legacyStore});
  assert.equal(state(legacyRestored.context).slots[0].c.format,"static_legacy");
  assert.equal(value(legacyRestored.context,'creativeFormatFor(S.slots[0].c).id'),"static_legacy");
}

// Checkpoints are isolated by mode as well as profile, so a decade career cannot overwrite a short drill.
{
  const localStore=new Map();
  const account=makeContext("?mode=1&days=12&budget=20000&seed=601",{localStore});
  vm.runInContext("runDay();saveGame('account-slot',false)",account.context);
  const accountKey="ttm.save.general.mode-1.v3",accountRecord=localStore.get(accountKey);
  assert(accountRecord,"mode 1 did not create its isolated checkpoint");

  const career=makeContext("?mode=6&budget=25000&seed=602",{localStore});
  vm.runInContext("runDay();saveGame('career-slot',false)",career.context);
  const careerKey="ttm.save.general.mode-6.v3";
  assert(localStore.get(careerKey),"Agency Career did not create its isolated checkpoint");
  assert.equal(localStore.get(accountKey),accountRecord,"saving Agency Career overwrote the account-mode checkpoint");
  assert.equal(value(career.context,"saveRecord().mode"),6);

  const expectedAccount=JSON.stringify(JSON.parse(accountRecord).state);
  const restored=makeContext("?mode=1&days=12&budget=20000&seed=601&resume=1",{localStore});
  assert.equal(value(restored.context,"saveRecord().mode"),1);
  assert.equal(value(restored.context,"JSON.stringify(S)"),expectedAccount,
    "the mode-1 resume route restored the newer career mirror instead of its own checkpoint");
}

// Agency identity is canonicalized once, escaped at render time and preserved in the checkpoint
// and Resume route. A player's company cannot silently become the default company after reload.
{
  const search="?mode=6&budget=250000&seed=6021&agencyName=%20%20Lunar%00%20%20%26%20%3CStudio%3E%20%20&hq=new-york-ny&agencyType=creative_agency",
    key="ttm.save.general.mode-6.v3",localStore=new Map(),source=makeContext(search,{localStore}),identity=state(source.context).agencyIdentity;
  assert.deepEqual({...identity},{name:"Lunar & <Studio>",hqId:"new-york-ny",agencyType:"creative_agency"});
  const rendered=[source.registry.strip.innerHTML,source.registry.slots.innerHTML,source.registry.accountBox.innerHTML,source.registry.log.innerHTML].join("\n");
  assert.doesNotMatch(rendered,/<Studio>/,"agency name was inserted as live markup");
  assert.match(rendered,/Lunar &amp; &lt;Studio&gt;/,"escaped agency name is not visibly preserved");
  assert.equal(value(source.context,"saveGame('agency-identity',false)"),true);
  const record=JSON.parse(localStore.get(key));assert.deepEqual(record.state.agencyIdentity,{...identity});
  const savedRoute=value(source.context,"savedSearch(saveRecord())"),params=new URLSearchParams(savedRoute);
  assert.equal(params.get("agencyName"),identity.name);assert.equal(params.get("hq"),identity.hqId);assert.equal(params.get("agencyType"),identity.agencyType);
  const restored=makeContext(`?${savedRoute}`,{localStore}),restoredIdentity=state(restored.context).agencyIdentity;
  assert.deepEqual({...restoredIdentity},{...identity});assert.equal(value(restored.context,"AgencyCareer.validate(S)"),true);
  const fallback=makeContext("?mode=6&seed=6022&agencyName=x&hq=not-a-place&agencyType=not_a_model");
  assert.deepEqual({...state(fallback.context).agencyIdentity},{name:"Moonrise Media",hqId:"portland-or",agencyType:"digital_agency"},
    "invalid origin parameters bypassed canonical fallbacks");
  const longName=makeContext(`?mode=6&seed=6023&agencyName=${encodeURIComponent("A".repeat(80))}`);
  assert.equal(state(longName.context).agencyIdentity.name.length,48,"agency name was not bounded before entering the save state");
}

// Cross-mode Resume checkpoints active Day-1 work in its own slot, then routes to the target save.
{
  const localStore=new Map();
  const target=makeContext("?mode=3&days=12&budget=20000&seed=703",{localStore});
  vm.runInContext('runDay();saveGame("target",false)',target.context);
  const targetKey="ttm.save.general.mode-3.v3",targetRaw=localStore.get(targetKey);
  const current=makeContext("?mode=1&days=12&budget=20000&seed=701",{localStore});
  vm.runInContext("close()",current.context);clickAct(current,"minus",0);
  const activeState=value(current.context,"JSON.stringify(S)");
  vm.runInContext('setupWizard({intent:"practice"},"mode")',current.context);
  const resume=current.registry.overlay.querySelectorAll("button[data-resume-mode]").find(button=>button.dataset.resumeMode==="3");
  assert(resume);resume.onclick();
  const checkpoint=JSON.parse(localStore.get("ttm.save.general.mode-1.v3"));
  assert.equal(JSON.stringify(checkpoint.state),activeState);assert.equal(localStore.get(targetKey),targetRaw,"target checkpoint was overwritten");
  const params=new URLSearchParams(value(current.context,"location.search"));
  assert.equal(params.get("mode"),"3");assert.equal(params.get("seed"),"703");assert.equal(params.get("resume"),"1");
}

// Same-mode Resume asks before discarding active work and never overwrites the checkpoint being resumed.
{
  const localStore=new Map(),key="ttm.save.general.mode-2.v3";
  const source=makeContext("?mode=2&days=12&budget=20000&seed=704",{localStore});
  vm.runInContext('runDay();saveGame("target",false)',source.context);const targetRaw=localStore.get(key);
  const current=makeContext("?mode=2&days=12&budget=20000&seed=704",{localStore});
  vm.runInContext("close()",current.context);clickAct(current,"minus",0);const searchBefore=value(current.context,"location.search");
  vm.runInContext('setupWizard({intent:"practice"},"mode")',current.context);
  const resume=current.registry.overlay.querySelectorAll("button[data-resume-mode]").find(button=>button.dataset.resumeMode==="2");
  assert(resume);resume.onclick();assert.match(current.registry.overlay.innerHTML,/active run and this checkpoint/i);
  assert.equal(value(current.context,"location.search"),searchBefore);assert.equal(localStore.get(key),targetRaw);
  assert.equal(typeof current.registry.confirmResume.onclick,"function");current.registry.confirmResume.onclick();
  assert.equal(localStore.get(key),targetRaw,"confirmation overwrote the checkpoint it was meant to resume");
  const params=new URLSearchParams(value(current.context,"location.search"));
  assert.equal(params.get("mode"),"2");assert.equal(params.get("resume"),"1");
}

// Authored Classic ad variants survive a browser checkpoint and reproduce the next day exactly.
{
  const localStore=new Map(),search="?mode=0&stage=2&days=12&budget=300&seed=603&flavor=dnd";
  const original=makeContext(search,{localStore});
  clickClassic(original,"rewrite",0);clickClassic(original,"variant",0);clickClassic(original,"expanded",0);
  vm.runInContext("runDay();saveGame('classic-authored-copy',false)",original.context);
  const checkpoint=value(original.context,"JSON.stringify(S)"),record=JSON.parse(localStore.get("ttm.save.general.mode-0.v3"));
  assert.equal(record.state.classicModelVersion,3);assert.equal(record.state.groups[0].ads.length,3);
  assert(record.state.groups[0].ads.every(ad=>typeof ad.copyId==="string"&&ad.copyId.startsWith("commercial:")));
  const checkpointStore=new Map(localStore);vm.runInContext("runDay()",original.context);
  const expectedNext=value(original.context,"JSON.stringify(S)");

  const restored=makeContext(`${search}&resume=1`,{localStore:checkpointStore});
  assert.equal(value(restored.context,"JSON.stringify(S)"),checkpoint,"Classic authored ads changed while hydrating a valid checkpoint");
  assert.match(restored.registry.slots.innerHTML,/Expanded Text Ad · historical 2017 longer-copy format/);
  vm.runInContext("runDay()",restored.context);
  assert.equal(value(restored.context,"JSON.stringify(S)"),expectedNext,
    "a restored Classic ad rotation did not reproduce the next day exactly");
}

// Mode 5 checkpoint hydration reconciles an old stale payment ticket before the restored board can block time.
{
  const localStore=new Map(),search="?mode=5&days=90&budget=150000&seed=6031";
  const source=makeContext(search,{localStore});vm.runInContext("saveGame('legacy-payment-fixture',false)",source.context);
  const key="ttm.save.general.mode-5.v3",record=JSON.parse(localStore.get(key));
  record.state.finance.creditUsed=0;record.state.finance.creditHolds=[];record.state.insolvencyDays=0;
  record.state.crises.push({id:"stale-payment",type:"payment_failure",targetId:null,startDay:record.state.day,status:"open",
    scope:"holding company",scopeKey:"holding",hidden:null,meta:{holdIds:["already-cleared"]}});
  localStore.set(key,JSON.stringify(record));
  const restored=makeContext(`${search}&resume=1`,{localStore});
  assert.equal(state(restored.context).crises.some(c=>c.id==="stale-payment"),false);
  assert(state(restored.context).crisisHistory.find(c=>c.id==="stale-payment")?.superseded);
  assert.equal(value(restored.context,"NightmareEngine.validate().length"),0);
  assert.doesNotMatch(restored.registry.accountBox.innerHTML,/Review crisis queue/);
}

// Pre-ad-workshop Classic saves hydrate into the authored model instead of becoming unusable.
{
  const localStore=new Map(),search="?mode=0&stage=2&days=12&budget=300&seed=604";
  const source=makeContext(search,{localStore});vm.runInContext("saveGame('legacy-classic-fixture',false)",source.context);
  const key="ttm.save.general.mode-0.v3",record=JSON.parse(localStore.get(key));delete record.state.classicModelVersion;
  for(const [index,g] of record.state.groups.entries()){
    for(const field of ["id","campaignId","quality","landingM","ads","previewAdId","nextAdId","rewriteCount","variantCount","expandedBuilt","lastVariantDay","landingPassDone"])
      delete g[field];
    g.qs=index===0?7.25:6;
  }
  for(const field of ["adVariants","expandedAds","landingPasses"])delete record.state.telemetry[field];
  localStore.set(key,JSON.stringify(record));
  const restored=makeContext(`${search}&resume=1`,{localStore});
  assert.equal(state(restored.context).classicModelVersion,3);assert.deepEqual(Array.from(state(restored.context).groups,group=>group.id),
    ["commercial","local","patio","diy"]);
  assert.equal(state(restored.context).groups[0].ads.length,1);assert.equal(state(restored.context).groups[0].ads[0].copyId,"commercial:standard:0");
  assert.deepEqual({...state(restored.context).groups[0].quality},{expectedCtr:7.25,adRelevance:7.25,landingExperience:7.25});
  for(const field of ["adVariants","expandedAds","landingPasses"])
    assert.equal(state(restored.context).telemetry[field],0,`legacy telemetry did not hydrate ${field}`);
  vm.runInContext("runDay()",restored.context);finiteTree(state(restored.context));
  assert.equal(state(restored.context).groups[0].last.adBreakdown.length,1);
}

// Legacy and corrupt Classic client state migrates to an allowlisted, playable relationship model.
{
  const legacy=makeContext("?mode=0&stage=3&days=12&budget=300&seed=6041");
  vm.runInContext(`S.client={trust:42,baseline:101,promised:105,grievance:"needs clear updates",grievanceHandled:true,amNoted:true,calls:2,budgetCut:true,
    profileId:"<img onerror=bad>",businessId:"missing",trustParts:{results:999,judgment:-5,transparency:"nope"},tension:Infinity,
    insight:{points:999,observations:[{type:"cue",index:999},{type:"commitment",kind:"bad",met:true}]},
    pendingEncounter:{eventId:"<script>",phase:"choice",day:2,optionIds:["bad"]},secret:"do-not-keep"};classicHydrate()`,legacy.context);
  const c=state(legacy.context).client;
  assert(value(legacy.context,"CLASSIC_CLIENT_PROFILES.some(profile=>profile.id===S.client.profileId)"));
  assert(value(legacy.context,"CLASSIC_CLIENT_BUSINESSES.some(business=>business.id===S.client.businessId)"));
  assert.equal(c.baseline,101);assert.equal(c.promised,105);assert.equal(c.calls,2);assert.equal(c.budgetCut,true);
  assert(Object.values(c.trustParts).every(number=>Number.isFinite(number)&&number>=0&&number<=100));assert(Number.isFinite(c.tension));
  assert.equal(c.insight.points,0);assert.deepEqual(Array.from(c.insight.observations),[]);assert.equal(c.pendingEncounter,null);
  assert.equal(Object.hasOwn(c,"secret"),false);finiteTree(c);vm.runInContext("renderClassic()",legacy.context);
  assert.doesNotMatch(legacy.registry.accountBox.innerHTML,/onerror|script|do-not-keep/i);
}

// Browser-local Classic state cannot inject ad markup or borrow another ad group's authored copy.
{
  const fixture=makeContext("?mode=0&stage=1&seed=605"),poison='\"><img src=x onerror="poisoned">';
  vm.runInContext(`S.groups[0].name=${JSON.stringify(poison)};S.groups[0].core=${JSON.stringify(poison)};
    S.groups[0].campaignId=${JSON.stringify(poison)};S.groups[0].previewAdId=${JSON.stringify(poison)};
    S.groups[0].ads=[{id:${JSON.stringify(poison)},copyId:"commercial:standard:0",label:${JSON.stringify(poison)},createdDay:-9,
      stats:{impr:-10,clicks:-2,convR:-1,spend:-20}},{id:"commercial-ad-2",copyId:"local:standard:0",stats:{}}];renderClassic()`,fixture.context);
  const g=state(fixture.context).groups[0];assert.equal(g.name,"Commercial Concrete Contractors");
  assert.equal(g.core,"commercial concrete contractors");assert.equal(g.campaignId,"concrete-services");
  assert.equal(g.ads.length,1);assert.match(g.ads[0].id,/^commercial-ad-[1-9][0-9]*$/);assert.equal(g.ads[0].copyId,"commercial:standard:0");
  assert(Object.values(g.ads[0].stats).every(number=>Number.isFinite(number)&&number>=0));
  assert.doesNotMatch(fixture.registry.slots.innerHTML,/onerror|poisoned|<img/i);
}

// Corrupt browser state with duplicate ad IDs hydrates to unique, targetable IDs in one pass.
{
  const fixture=makeContext("?mode=0&stage=1&seed=606");
  vm.runInContext(`S.groups[0].ads=[
    {id:"commercial-ad-2",copyId:"commercial:standard:0",version:1,stats:{}},
    {id:"commercial-ad-2",copyId:"commercial:permutation:0",baseCopyId:"commercial:standard:0",version:1,stats:{}},
    {id:"commercial-ad-2",copyId:"commercial:expanded:0",version:1,stats:{}}
  ];S.groups[0].previewAdId="commercial-ad-2";S.groups[0].nextAdId=2;classicHydrate();renderClassic()`,fixture.context);
  const g=state(fixture.context).groups[0],ids=Array.from(g.ads,ad=>ad.id);
  assert.equal(ids.length,3);assert.equal(new Set(ids).size,ids.length,"duplicate ad IDs survived hydration");
  assert(ids.every(id=>/^commercial-ad-[1-9][0-9]*$/.test(id)));assert(g.nextAdId>Math.max(...ids.map(id=>+id.split("-").pop())));
  assert(ids.includes(g.previewAdId));
}

// Classic hydration restores setup authority and canonicalizes a tampered multi-ad test without preserving false evidence.
{
  const fixture=makeContext("?mode=0&stage=2&days=12&budget=300&seed=818");
  vm.runInContext(`S.stage=99;S.delivery="turbo";S.day=999;S.budget=999999;
    S.groups[0].ads=[
      {id:"commercial-ad-7",copyId:"commercial:permutation:0",baseCopyId:"commercial:standard:0",version:3,createdDay:2,stats:{impr:123,clicks:12,convR:3,spend:45}},
      {id:"commercial-ad-8",copyId:"commercial:standard:1",version:2,createdDay:2,active:false,stats:{impr:50,clicks:5,convR:1,spend:9}},
      {id:"commercial-ad-9",copyId:"commercial:standard:2",version:1,createdDay:2,stats:{impr:90,clicks:9,convR:2,spend:19}},
      {id:"commercial-ad-10",copyId:"commercial:expanded:0",version:1,createdDay:2,stats:{impr:80,clicks:8,convR:2,spend:18}},
      {id:"commercial-ad-11",copyId:"commercial:expanded:0",version:1,createdDay:2,stats:{impr:70,clicks:7,convR:2,spend:17}},
      {id:"commercial-ad-12",copyId:"commercial:permutation:0",baseCopyId:"commercial:standard:1",version:5,createdDay:2,stats:{impr:60,clicks:6,convR:2,spend:16}},
      {id:"commercial-ad-13",copyId:"commercial:permutation:1",baseCopyId:"commercial:standard:0",version:6,createdDay:2,stats:{impr:55,clicks:5,convR:1,spend:15}}
    ];S.groups[0].previewAdId="commercial-ad-13";classicHydrate()`,fixture.context);
  const s=state(fixture.context),g=s.groups[0],kinds=Array.from(g.ads,ad=>ad.copyId.split(":")[1]);
  assert.equal(s.stage,2);assert.equal(s.delivery,"standard");assert.equal(s.day,13);assert.equal(s.budget,300);
  assert.equal(g.ads.length,4);assert.equal(g.ads[0].copyId,"commercial:standard:1");assert.equal(g.ads[0].active,true);
  assert.equal(kinds.filter(kind=>kind==="standard").length,1);assert.equal(kinds.filter(kind=>kind==="expanded").length,1);
  const permutations=g.ads.filter(ad=>ad.copyId.includes(":permutation:"));
  assert.deepEqual(Array.from(permutations,ad=>ad.copyId).sort(),["commercial:permutation:0","commercial:permutation:1"]);
  assert.equal(new Set(permutations.map(ad=>ad.copyId)).size,2);assert(permutations.every(ad=>ad.baseCopyId===g.ads[0].copyId));
  assert(permutations.every(ad=>Object.values(ad.stats).every(number=>number===0)),"re-bound permutations retained evidence from another control");
  assert.deepEqual(Array.from(permutations,ad=>ad.version).sort((a,b)=>a-b),[4,7]);
  assert(permutations.every(ad=>ad.createdDay===13));
  assert.equal(new Set(Array.from(g.ads,ad=>ad.id)).size,g.ads.length);
}

// Setup budget is immutable save metadata even when a Classic client later cuts the live cap.
{
  const localStore=new Map(),classic=makeContext("?mode=0&stage=3&days=30&budget=300&seed=611",{localStore});
  vm.runInContext("S.budget=150;saveGame('manual',false)",classic.context);
  const record=JSON.parse(localStore.get("ttm.save.general.mode-0.v3"));
  assert.equal(record.budget,300);assert.equal(record.state.budget,150);
}

// Malformed browser-local saves fail closed and leave a valid fresh run renderable.
{
  const malformed={schema:3,profile:"general",mode:1,stage:null,days:12,budget:20000,seed:612,flavor:"dnd",
    savedAt:new Date(0).toISOString(),source:"corrupt-fixture",state:{day:1,slots:[{c:{},hist:[]}],pending:[],queue:[],telemetry:{}}};
  const localStore=new Map([["ttm.save.general.v3",JSON.stringify(malformed)]]);
  const fixture=makeContext("?mode=1&days=12&budget=20000&seed=612&resume=1",{localStore});
  assert.equal(state(fixture.context).slots.length,4);assert(["healthy","degraded"].includes(value(fixture.context,"S.pixel.status")));
  assert.match(fixture.registry.accountBox.innerHTML,/Market condition|Inherited account/);
  assert.equal(value(fixture.context,"restoreSavedState(saveRecord())"),false);
}

// Seeds are deterministic JSON-safe positive integers; malformed query/save values fail closed.
for(const [query,expected] of [["",7],["0",7],["-1",7],["1.5",7],["Infinity",7],
  ["999999999999999999999999",7],["1",1],["2147483647",2147483647]]){
  const suffix=query?`&seed=${encodeURIComponent(query)}`:"";
  const fixture=makeContext(`?mode=1${suffix}`);
  assert.equal(value(fixture.context,"SEED"),expected,`seed ${query||"(missing)"} was not normalized safely`);
  assert.equal(Number.isSafeInteger(value(fixture.context,"SEED")),true);
}
{
  const localStore=new Map(),fixture=makeContext("?mode=1&days=12&budget=20000&seed=7",{localStore});
  vm.runInContext("saveGame('manual',false)",fixture.context);
  const key="ttm.save.general.mode-1.v3",record=JSON.parse(localStore.get(key));record.seed=-9;
  localStore.set(key,JSON.stringify(record));
  assert.equal(value(fixture.context,"saveRecord()"),null,"an invalid saved seed remained resumable");
}

// Resuming a terminal checkpoint reopens the correct debrief instead of a disabled board.
for(const fixture of [
  {mode:0,query:"?mode=0&stage=1&days=7&budget=300&seed=621",terminal:"S.day=DAYS+1",copy:/Two scoreboards/},
  {mode:1,query:"?mode=1&days=4&budget=20000&seed=622",terminal:"S.day=DAYS+1",copy:/What the run reveals/},
  {mode:5,query:"?mode=5&days=90&budget=150000&seed=623",terminal:'S.ended=true;S.outcome="term-ended"',copy:/Portfolio mandate failed/},
  {mode:6,query:"?mode=6&budget=25000&seed=624",terminal:'S.ended=true;S.outcome="target-missed";S.month=120;S.day=2401',copy:/decade ended short/i}
]){
  const localStore=new Map(),first=makeContext(fixture.query,{localStore});
  vm.runInContext(`${fixture.terminal};saveGame("terminal-test",false)`,first.context);
  const restored=makeContext(`${fixture.query}&resume=1`,{localStore});
  assert.equal(value(restored.context,"terminalCheckpoint()"),true,`mode ${fixture.mode} terminal state was not recognized`);
  assert.match(restored.registry.overlay.innerHTML,fixture.copy,`mode ${fixture.mode} resumed without its debrief`);
  assert.doesNotMatch(restored.history.lastUrl||"",/resume=1/);
}

// A terminal Classic client conversation must be completed before the final debrief can replace it.
{
  const fixture=makeContext("?mode=0&stage=2&days=7&budget=300&seed=625");
  vm.runInContext("S.day=DAYS+1;classicBeginClientEncounter({terminal:true})",fixture.context);
  const eventTitle=value(fixture.context,"CLASSIC_CLIENT_EVENTS[S.client.pendingEncounter.eventId].title");
  assert.match(fixture.registry.overlay.innerHTML,new RegExp(eventTitle.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  vm.runInContext("mainMenu()",fixture.context);assert.match(fixture.registry.overlay.innerHTML,/Review results/);
  fixture.registry.continueRun.onclick();
  assert.match(fixture.registry.overlay.innerHTML,new RegExp(eventTitle.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  assert.doesNotMatch(fixture.registry.overlay.innerHTML,/Two scoreboards/,
    "the final debrief skipped a pending terminal client response");
}

// Dialog/accessibility and layered Escape behavior remain scoped to the topmost control.
{
  assert.match(appScript,/modal\.setAttribute\("aria-labelledby",heading\.id\)/,
    "dialogs are not named by their visible heading");
  assert.doesNotMatch(value(makeContext("?mode=1&seed=624").context,"LORE_SEL"),/\.config label/,
    "glossary controls can still be injected into form labels");
  assert.match(css,/\.mast::after\{[^}]*right:0;/,"decorative mast glow can overflow narrow viewports");
  assert.match(css,/h1,h2,h3\{[^}]*text-wrap:balance/,
    "display headings can leave an isolated final word");
  assert.match(css,/p,li,dd,blockquote,figcaption\{[^}]*text-wrap:pretty/,
    "prose lacks the site-wide widow-prevention policy");
  assert.match(css,/\.wizard-heading p\{[^}]*text-wrap:balance/,
    "centered setup copy can leave a hanging final word");
  assert.match(css,/\.wizard-mode-copy b\{[^}]*text-wrap:balance/,
    "challenge-card titles can leave a hanging final word");
  assert.match(css,/body\{[^}]*overflow-wrap:break-word;word-break:normal;text-wrap:pretty/,
    "generated UI text lacks inherited overflow and widow protection");
  assert.match(css,/\.ship-option-title\{[^}]*text-wrap:balance/,
    "creative-swap choices lack the shared balanced-label treatment");
  assert.match(css,/\.crisis-choice>small\{[^}]*text-wrap:pretty/,
    "crisis-choice explanations lack the shared prose wrapping treatment");
  const modernSource=appSources.find(item=>item.file==="js/modern-engine.js")?.source||"";
  const nightmareSource=appSources.find(item=>item.file==="js/nightmare-engine.js")?.source||"";
  assert.doesNotMatch(modernSource,/join\("<br>"\)/,
    "creative-swap options are separated with forced line breaks instead of layout");
  assert.doesNotMatch(nightmareSource,/data-choice="[^"]+"[^>]*>[^<]*<br><small>/,
    "crisis-choice labels still contain a forced typographic break");
  const fixture=makeContext("?mode=1&seed=625");
  vm.runInContext('show(`<h2>Layered dialog</h2><button id="closeB">Close</button>`);setAudioPanel(true)',fixture.context);
  const event=dispatchDocumentKey(fixture,"Escape",fixture.registry.audioPanel);
  assert.equal(fixture.registry.audioPanel.hidden,true,"Escape did not close the topmost sound panel");
  assert.match(fixture.registry.overlay.innerHTML,/Layered dialog/,"closing sound also dismissed the underlying dialog");

  const layered=makeContext("?mode=1&seed=626");
  const pressEscape=()=>dispatchDocumentKey(layered,"Escape",!layered.registry.audioPanel.hidden?layered.registry.audioPanel:
    !layered.registry.radioPanel.hidden?layered.registry.radioPanel:layered.registry.guideCard);
  vm.runInContext('loreBook("01");setAudioPanel(true)',layered.context);
  pressEscape();
  assert.equal(layered.registry.audioPanel.hidden,true,"Escape did not close Sound above the Field Guide");
  assert.match(layered.registry.guideOverlay.innerHTML,/Field Guide/,"one Escape closed both Sound and the Field Guide");
  pressEscape();
  assert.equal(layered.registry.guideOverlay.innerHTML,"","the next Escape did not close the exposed Field Guide");

  vm.runInContext('loreBook("02");setRadioOpen(true)',layered.context);
  pressEscape();
  assert.equal(layered.registry.radioPanel.hidden,true,"Escape did not close Radio above the Field Guide");
  assert.match(layered.registry.guideOverlay.innerHTML,/Field Guide/,"one Escape closed both Radio and the Field Guide");
  pressEscape();
  assert.equal(layered.registry.guideOverlay.innerHTML,"","the next Escape did not close the Field Guide after Radio");
}

}

if(smokeShard==="d1a"){
// Creative Lab is a true modal boundary, including while the guided tutorial's click gate is active.
// Back/Escape must leave the simulation untouched, covered controls cannot receive a synthetic
// activation, and a nested definition or Field Guide remains the only interactive layer until closed.
{
  function dispatchModalClick(fixture,target){
    let stopped=false;
    const event={type:"click",target,defaultPrevented:false,propagationStopped:false,
      preventDefault(){this.defaultPrevented=true;},
      stopPropagation(){this.propagationStopped=true;stopped=true;},
      stopImmediatePropagation(){this.propagationStopped=true;stopped=true;}};
    for(const item of fixture.documentListeners.click||[]){
      if(!(item.options===true||item.options?.capture))continue;
      item.handler(event);if(stopped)return event;
    }
    if(!target.disabled){
      for(const handler of target.listeners?.click||[]){handler(event);if(stopped)return event;}
      if(typeof target.onclick==="function"){target.onclick(event);if(stopped)return event;}
      let parent=target.parentNode;
      while(parent){for(const handler of parent.listeners?.click||[]){handler(event);if(stopped)return event;}parent=parent.parentNode;}
    }
    for(const item of fixture.documentListeners.click||[]){
      if(item.options===true||item.options?.capture)continue;
      item.handler(event);if(stopped)return event;
    }
    return event;
  }
  function dispatchModalKey(fixture,key,target){
    let stopped=false;
    const event={type:"keydown",key,target,defaultPrevented:false,propagationStopped:false,shiftKey:false,
      preventDefault(){this.defaultPrevented=true;},
      stopPropagation(){this.propagationStopped=true;stopped=true;},
      stopImmediatePropagation(){this.propagationStopped=true;stopped=true;}};
    for(const item of fixture.documentListeners.keydown||[]){
      if(!(item.options===true||item.options?.capture))continue;
      item.handler(event);if(stopped)return event;
    }
    for(const item of fixture.documentListeners.keydown||[]){
      if(item.options===true||item.options?.capture)continue;
      item.handler(event);if(stopped)return event;
    }
    return event;
  }
  function guidedCreativeModal(seed){
    const localStore=new Map([["media-buying-trainer-sfx-v1","on"]]),
      fixture=makeContext(`?mode=1&days=12&budget=20000&seed=${seed}&guided=1`,{localStore,tutorialComplete:false});
    vm.runInContext(`close();writeTutorialProgress({introComplete:true,complete:false,step:4,runKey:tutorialRunKey(),
      generatedCreativeId:null,baseline:null,comparison:null,completedAt:null});restoreTutorialSession();render()`,fixture.context);
    const origin=fixture.registry.reqBtn;assert(origin&&typeof origin.onclick==="function","guided Creative Lab has no originating control");
    origin.focus();const before=value(fixture.context,"JSON.stringify(S)");fixture.audioPlays.length=0;
    const openEvent=dispatchModalClick(fixture,origin);assert.equal(openEvent.defaultPrevented,false,"the tutorial blocked its required Creative Lab opener");
    assert.match(fixture.registry.overlay.innerHTML,/Build one creative blueprint/);
    // The lightweight parser records all generated nodes as overlay descendants. Rebuild the
    // relevant browser hierarchy so the capture-boundary test distinguishes card content from
    // a veil/backdrop click.
    const closeButton=wireCreativeModalHierarchy(fixture);
    return {fixture,origin,before,closeButton};
  }
  function wireCreativeModalHierarchy(fixture){
    const modal=fixture.registry.modalCard,veil=fixture.registry.overlay.querySelector(".veil");
    if(veil){veil.parentNode=fixture.registry.overlay;modal.parentNode=veil;}
    for(const element of fixture.registry.overlay._descendants){
      if(element!==modal&&element!==veil)element.parentNode=modal;
    }
    const closeButton=fixture.registry.closeB;assert(closeButton&&typeof closeButton.onclick==="function","Creative Lab has no Back control");
    // Real HTMLElement.click() dispatches a click through capture and bubble. The fake DOM normally
    // falls back to onclick, so install that browser-accurate path for Escape's programmatic click.
    closeButton.click=()=>dispatchModalClick(fixture,closeButton);
    return closeButton;
  }
  const warningFiles=fixture=>new Set(JSON.parse(value(fixture.context,"JSON.stringify(SFX_VARIANTS.warning)"))),
    closeFiles=fixture=>new Set(JSON.parse(value(fixture.context,"JSON.stringify(SFX_VARIANTS.close)")));

  const back=guidedCreativeModal(6281),backMarkup=back.fixture.registry.overlay.innerHTML;
  assert.equal(back.fixture.registry.wrap.inert,true,"Creative Lab left the account interactive");
  assert.equal(back.fixture.registry.wrap.getAttribute("aria-hidden"),"true","Creative Lab left the covered account exposed to assistive technology");
  assert.equal(back.fixture.registry.overlay.inert,false,"the active Creative Lab root was inert");
  assert.notEqual(back.fixture.registry.overlay.getAttribute("aria-hidden"),"true","the active Creative Lab root was hidden");
  assert.equal(value(back.fixture.context,"JSON.stringify(S)"),back.before,"opening Creative Lab mutated the simulation");
  back.fixture.audioPlays.length=0;
  const backEvent=dispatchModalClick(back.fixture,back.closeButton);
  assert.equal(backEvent.defaultPrevented,false,"the guided tutorial blocked Back to account");
  assert.equal(back.fixture.registry.overlay.innerHTML,"","Back to account did not close Creative Lab");
  assert.equal(back.fixture.registry.wrap.inert,false,"closing Creative Lab left the account inert");
  assert.notEqual(back.fixture.registry.wrap.getAttribute("aria-hidden"),"true","closing Creative Lab left the account aria-hidden");
  assert.equal(back.fixture.context.document.activeElement,back.origin,"Back to account did not restore focus to the Creative Lab opener");
  assert.equal(value(back.fixture.context,"JSON.stringify(S)"),back.before,"Back to account changed campaign state");
  assert.equal(back.fixture.audioPlays.length,1,"one Back interaction emitted duplicate or missing feedback");
  assert(closeFiles(back.fixture).has(back.fixture.audioPlays[0].src),"Back emitted the tutorial error cue instead of one close cue");
  assert(!back.fixture.audioPlays.some(play=>warningFiles(back.fixture).has(play.src)),"Back to account emitted a warning/error sound");
  assert(backMarkup.length>back.fixture.registry.overlay.innerHTML.length,"the Creative Lab markup was not removed");

  const escaped=guidedCreativeModal(6282);escaped.fixture.audioPlays.length=0;
  const escapeEvent=dispatchModalKey(escaped.fixture,"Escape",escaped.fixture.registry.modalCard);
  assert.equal(escapeEvent.defaultPrevented,true,"Escape was not claimed by Creative Lab");
  assert.equal(escaped.fixture.registry.overlay.innerHTML,"","Escape did not close Creative Lab");
  assert.equal(escaped.fixture.context.document.activeElement,escaped.origin,"Escape did not return focus to the Creative Lab opener");
  assert.equal(value(escaped.fixture.context,"JSON.stringify(S)"),escaped.before,"Escape changed campaign state");
  assert.equal(escaped.fixture.audioPlays.length,1,"one Escape interaction emitted duplicate or missing feedback");
  assert(closeFiles(escaped.fixture).has(escaped.fixture.audioPlays[0].src),"Escape emitted the tutorial error cue instead of one close cue");
  assert(!escaped.fixture.audioPlays.some(play=>warningFiles(escaped.fixture).has(play.src)),"Escape emitted a warning/error sound");

  const isolated=guidedCreativeModal(6283),isolatedMarkup=isolated.fixture.registry.overlay.innerHTML,
    isolatedFocus=isolated.fixture.context.document.activeElement;isolated.fixture.audioPlays.length=0;
  const outsideClick=dispatchModalClick(isolated.fixture,isolated.fixture.registry.runBtn);
  assert.equal(outsideClick.defaultPrevented,true,"a covered account button accepted a click through Creative Lab");
  assert.equal(isolated.fixture.registry.overlay.innerHTML,isolatedMarkup,"a covered account click changed the active modal");
  assert.equal(value(isolated.fixture.context,"JSON.stringify(S)"),isolated.before,"a covered account click reached the game");
  assert.equal(isolated.fixture.context.document.activeElement,isolatedFocus,"a covered account click moved focus behind Creative Lab");
  assert.equal(isolated.fixture.audioPlays.length,0,"a covered account click emitted hidden feedback");
  const outsideKey=dispatchModalKey(isolated.fixture,"Enter",isolated.fixture.registry.runBtn);
  const keyActivation=outsideKey.defaultPrevented?null:dispatchModalClick(isolated.fixture,isolated.fixture.registry.runBtn);
  assert(!keyActivation||keyActivation.defaultPrevented,"keyboard activation reached a covered account button");
  assert.equal(value(isolated.fixture.context,"JSON.stringify(S)"),isolated.before,"a covered account keypress reached the game");
  assert.equal(isolated.fixture.registry.overlay.innerHTML,isolatedMarkup,"a covered account keypress changed the active modal");
  assert.equal(isolated.fixture.audioPlays.length,0,"a covered account keypress emitted hidden feedback");
  const veil=isolated.fixture.registry.overlay.querySelector(".veil"),backdropClick=dispatchModalClick(isolated.fixture,veil);
  assert.equal(backdropClick.defaultPrevented,true,"the Creative Lab backdrop passed a click into the account");
  assert.equal(isolated.fixture.registry.overlay.innerHTML,isolatedMarkup,"a backdrop click unexpectedly dismissed Creative Lab");
  assert.equal(isolated.fixture.audioPlays.length,0,"a backdrop click emitted feedback");
  const staleTab=dispatchModalKey(isolated.fixture,"Tab",isolated.fixture.registry.runBtn);
  assert.equal(staleTab.defaultPrevented,true,"Tab did not recover focus from a stale covered control");
  assert(isolated.fixture.registry.modalCard.contains(isolated.fixture.context.document.activeElement)||
    isolated.fixture.context.document.activeElement===isolated.fixture.registry.modalCard,
    "Tab left focus behind Creative Lab");

  isolated.fixture.audioPlays.length=0;
  const staleEscapeEvent=dispatchModalKey(isolated.fixture,"Escape",isolated.fixture.registry.runBtn);
  assert.equal(staleEscapeEvent.defaultPrevented,true,"Escape from stale covered focus was not claimed by Creative Lab");
  assert.equal(isolated.fixture.registry.overlay.innerHTML,"","Escape from stale covered focus did not close Creative Lab");
  assert.equal(isolated.fixture.context.document.activeElement,isolated.origin,
    "Escape from stale covered focus did not restore the opener");
  assert.equal(isolated.fixture.audioPlays.length,1,"stale-focus Escape emitted duplicate or missing feedback");

  const nested=guidedCreativeModal(6284),parentMarkup=nested.fixture.registry.overlay.innerHTML;
  const loreTrigger=new FakeElement("modalLoreTrigger",nested.fixture.registry);loreTrigger.tagName="span";loreTrigger.classList.add("lore");
  loreTrigger.dataset.t="creative";nested.fixture.registry.modalCard.appendChild(loreTrigger);nested.fixture.audioPlays.length=0;
  const loreClick=dispatchModalClick(nested.fixture,loreTrigger);
  assert.equal(loreClick.defaultPrevented,true,"the modal definition trigger did not claim its click");
  assert.equal(nested.fixture.registry.overlay.innerHTML,parentMarkup,"a definition click closed or replaced Creative Lab");
  assert.equal(value(nested.fixture.context,"Boolean(_pop)"),true,"a Creative Lab definition could not open above its parent");
  assert.equal(nested.fixture.audioPlays.length,0,"opening a definition leaked a game sound");
  const popEscape=dispatchModalKey(nested.fixture,"Escape",loreTrigger);
  assert.equal(popEscape.defaultPrevented,true,"Escape did not close the topmost definition");
  assert.equal(value(nested.fixture.context,"Boolean(_pop)"),false,"Escape left the definition open");
  assert.equal(nested.fixture.registry.overlay.innerHTML,parentMarkup,"closing a definition also closed Creative Lab");

  vm.runInContext('showGuide(`<h2 id="guideTitle">Creative glossary</h2><button id="guideClose" type="button">Exit</button>`)',nested.fixture.context);
  const guideMarkup=nested.fixture.registry.guideOverlay.innerHTML;
  assert(guideMarkup.includes("Creative glossary"));assert.equal(nested.fixture.registry.overlay.inert,true);
  assert.equal(nested.fixture.registry.overlay.getAttribute("aria-hidden"),"true","nested help did not hide its covered Creative Lab");
  nested.fixture.audioPlays.length=0;
  const coveredParentClick=dispatchModalClick(nested.fixture,nested.closeButton);
  assert.equal(coveredParentClick.defaultPrevented,true,"a covered Creative Lab control accepted a click through nested help");
  assert.equal(nested.fixture.registry.guideOverlay.innerHTML,guideMarkup,"a covered parent action dismissed nested help");
  assert.equal(nested.fixture.registry.overlay.innerHTML,parentMarkup,"a covered parent action dismissed Creative Lab");
  assert.equal(nested.fixture.audioPlays.length,0,"a covered parent action emitted hidden feedback");
  const guideEscape=dispatchModalKey(nested.fixture,"Escape",nested.fixture.registry.guideCard);
  assert.equal(guideEscape.defaultPrevented,true,"Escape did not claim the topmost Field Guide");
  assert.equal(nested.fixture.registry.guideOverlay.innerHTML,"","Escape did not close nested help");
  assert.equal(nested.fixture.registry.overlay.innerHTML,parentMarkup,"closing nested help also closed Creative Lab");
  assert.equal(nested.fixture.registry.overlay.inert,false,"closing nested help left Creative Lab inert");
  assert.notEqual(nested.fixture.registry.overlay.getAttribute("aria-hidden"),"true","closing nested help left Creative Lab hidden");
  assert.equal(nested.fixture.registry.wrap.inert,true,"closing nested help re-enabled the covered account");
  assert.equal(nested.fixture.registry.wrap.getAttribute("aria-hidden"),"true","closing nested help exposed the covered account");
  assert.equal(value(nested.fixture.context,"JSON.stringify(S)"),nested.before,"nested definitions/help mutated campaign state");

  // The definition's own lesson link is a legitimate nested action. It must open the Field
  // Guide over Creative Lab while preserving both the parent modal and campaign state.
  const linkedTrigger=new FakeElement("linkedLoreTrigger",nested.fixture.registry);linkedTrigger.tagName="span";
  linkedTrigger.classList.add("lore");linkedTrigger.dataset.t="creative";nested.fixture.registry.modalCard.appendChild(linkedTrigger);
  dispatchModalClick(nested.fixture,linkedTrigger);
  const lessonLink=value(nested.fixture.context,"_pop&&_pop.querySelector('.lesson-link')");
  assert(lessonLink,"the Creative Lab definition has no linked Field Guide lesson");
  let lessonClick;
  assert.doesNotThrow(()=>{lessonClick=dispatchModalClick(nested.fixture,lessonLink);},
    "the definition's lesson link threw while opening help above Creative Lab");
  assert.equal(lessonClick.defaultPrevented,true,"the definition's lesson link did not claim its click");
  assert.equal(value(nested.fixture.context,"Boolean(_pop)"),false,"opening the linked lesson left the definition above it");
  assert.match(nested.fixture.registry.guideOverlay.innerHTML,/data-course="field"/,
    "the definition's lesson link did not open the Field Guide lesson");
  assert.equal(nested.fixture.registry.overlay.innerHTML,parentMarkup,"the linked Field Guide lesson replaced Creative Lab");
  assert.equal(nested.fixture.registry.overlay.inert,true,"the linked Field Guide lesson left Creative Lab interactive");
  assert.equal(nested.fixture.registry.overlay.getAttribute("aria-hidden"),"true",
    "the linked Field Guide lesson left Creative Lab exposed to assistive technology");
  assert.equal(nested.fixture.registry.wrap.inert,true,"the linked Field Guide lesson re-enabled the covered account");
  assert.equal(value(nested.fixture.context,"JSON.stringify(S)"),nested.before,
    "opening a Field Guide lesson from Creative Lab mutated campaign state");
}
}

if(smokeShard==="d1r1"){
  // Removing a tooltip can synchronously fire focusout in a browser. The nested hidePop call
  // must observe cleared shared state instead of trying to remove the same node again.
  const reentrant=makeContext("?mode=1&seed=6286"),reentrantTrigger=new FakeElement("reentrantLoreTrigger",reentrant.registry);
  reentrantTrigger.tagName="span";reentrantTrigger.classList.add("lore");reentrantTrigger.dataset.t="creative";
  reentrant.context.document.body.appendChild(reentrantTrigger);
  vm.runInContext('showPop(document.getElementById("reentrantLoreTrigger"))',reentrant.context);
  const reentrantPop=value(reentrant.context,"_pop");let removalCalls=0;
  reentrantPop.remove=()=>{removalCalls++;
    const focusout={type:"focusout",target:reentrantTrigger,relatedTarget:null};
    for(const item of reentrant.documentListeners.focusout||[])item.handler(focusout);
    reentrantPop.parentNode=null;reentrantPop.removed=true;
  };
  assert.doesNotThrow(()=>vm.runInContext("hidePop()",reentrant.context),
    "hidePop recursed when tooltip removal synchronously dispatched focusout");
  assert.equal(removalCalls,1,"reentrant tooltip cleanup removed the same popover more than once");
  assert.equal(value(reentrant.context,"Boolean(_pop)"),false,"reentrant tooltip cleanup left shared popover state behind");
  assert.equal(reentrantTrigger.getAttribute("aria-expanded"),"false","reentrant tooltip cleanup left its trigger expanded");
}

if(smokeShard==="d1r2"){
  // Escape returns focus to the trigger. A real focusin event at that moment must not reopen
  // the just-dismissed definition as an unpinned hover/focus popover.
  const restoreFixture=makeContext("?mode=1&seed=6287"),restoreTrigger=new FakeElement("restoreLoreTrigger",restoreFixture.registry);
  restoreTrigger.tagName="span";restoreTrigger.classList.add("lore");restoreTrigger.dataset.t="creative";
  const restoreHost=restoreFixture.registry.modalCard?.parentNode?restoreFixture.registry.modalCard:restoreFixture.context.document.body;
  restoreHost.appendChild(restoreTrigger);
  restoreTrigger.focus=()=>{restoreFixture.registry.__active=restoreTrigger;
    dispatchDocumentEvent(restoreFixture,"focusin",restoreTrigger,{relatedTarget:null});};
  vm.runInContext('showPop(document.getElementById("restoreLoreTrigger"),true)',restoreFixture.context);
  const restoreEscape=dispatchDocumentKey(restoreFixture,"Escape",value(restoreFixture.context,"_pop"));
  assert.equal(restoreEscape.defaultPrevented,true,"Escape did not claim the pinned definition");
  assert.equal(value(restoreFixture.context,"Boolean(_pop)"),false,"restoring focus after Escape immediately reopened the definition");
  assert.equal(restoreFixture.registry.__active,restoreTrigger,"Escape did not restore focus to the definition trigger");
  assert.equal(restoreTrigger.getAttribute("aria-expanded"),"false","the restored trigger still reports an open definition");
  assert.equal(value(restoreFixture.context,
    '_popSuppressedTrigger===document.getElementById("restoreLoreTrigger")'),true,
    "Escape did not suppress immediate focus/hover reopening on its restored trigger");
  assert.equal(restoreTrigger.parentNode,restoreHost,
    "the restored definition trigger left its active surface");
  assert.equal(value(restoreFixture.context,"Boolean(_pop)"),false,
    "the still-focused Escape target reopened the definition before an explicit action");
  const explicitReopen=dispatchDocumentKey(restoreFixture,"Enter",restoreTrigger);
  assert.equal(explicitReopen.defaultPrevented,true,"explicit keyboard activation did not claim the definition trigger");
  assert.equal(value(restoreFixture.context,"Boolean(_pop)"),true,
    "explicit keyboard activation could not reopen a definition dismissed with Escape");
  assert.equal(restoreTrigger.getAttribute("aria-expanded"),"true","the explicitly reopened definition was not announced as expanded");
  vm.runInContext("hidePop()",restoreFixture.context);

  // Hover alone must be enough to use the lesson link. Crossing the visual gap schedules a
  // dismissal, but entering the card cancels it before the click—without focusing the term first.
  restoreFixture.registry.__active=restoreHost;
  dispatchDocumentEvent(restoreFixture,"mouseover",restoreTrigger,{relatedTarget:restoreHost});
  assert.equal(value(restoreFixture.context,"Boolean(_pop)"),true,"hover did not open the definition card");
  assert.notEqual(restoreFixture.registry.__active,restoreTrigger,"hover unexpectedly focused the definition term");
  const hoverLessonLink=value(restoreFixture.context,"_pop&&_pop.querySelector('.lesson-link')");
  assert(hoverLessonLink,"the hover definition has no lesson link");
  dispatchDocumentEvent(restoreFixture,"mouseout",restoreTrigger,{relatedTarget:null});
  assert.equal(value(restoreFixture.context,"Boolean(_popHideTimer)"),true,
    "crossing the term-to-card gap did not use a grace period");
  dispatchDocumentEvent(restoreFixture,"mouseover",hoverLessonLink,{relatedTarget:null});
  assert.equal(value(restoreFixture.context,"_popHideTimer"),0,"entering the definition card did not cancel dismissal");
  const hoverLessonClick=dispatchDocumentEvent(restoreFixture,"click",hoverLessonLink);
  assert.equal(hoverLessonClick.defaultPrevented,true,"the hover-only lesson link did not claim its click");
  assert.match(restoreFixture.registry.guideOverlay.innerHTML,/data-course="field"/,
    "the hover-only lesson link did not open its lesson panel");
}

if(smokeShard==="d1t"){
// Tooltip and analogy controls persist independently without consuming luck or mutating the run.
{
  assert.match(html,/class="flavor-control flavor-analogy-control"/,
    "the analogy selector has no independently hideable control class");
  assert.match(css,/body\.analogies-off \.flavor-analogy-control[^\{]*\{display:none!important\}/,
    "Analogies OFF does not hide the analogy selector");
  assert.doesNotMatch(css,/body\.analogies-off \.flavor-control(?:\s|,|\{)/,
    "Analogies OFF also hides the independent detail-level control");
  const localStore=new Map(),toggled=makeContext("?mode=1&seed=62&flavor=dnd",{localStore}),control=makeContext("?mode=1&seed=62&flavor=dnd");
  const before=value(toggled.context,"JSON.stringify(S)"),rngBefore=value(toggled.context,"JSON.stringify(S.rng)");
  assert.equal(value(toggled.context,"tooltipsEnabled()"),true);assert.equal(value(toggled.context,"analogiesEnabled()"),true);
  assert.equal(value(toggled.context,"densityLevel()"),"guided");
  assert.match(toggled.registry.realityBar.innerHTML,/<details class="reality-details"[^>]*>/);
  assert.doesNotMatch(toggled.registry.realityBar.innerHTML,/<details class="reality-details"[^>]*\sopen(?:\s|>)/,
    "Guided mode expanded secondary scope details instead of preserving progressive disclosure");
  toggled.registry.learningMenu.open=true;toggled.registry.learningCloseBtn.listeners.click[0]();
  assert.equal(toggled.registry.learningMenu.open,false,"Help and display cannot be dismissed from its popover");
  assert(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length>0'));
  assert.equal(value(toggled.context,"setTooltips(false)"),false);assert.equal(value(toggled.context,"analogiesEnabled()"),true);
  assert(value(toggled.context,'document.body.classList.contains("tooltips-off")'));
  assert.equal(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length'),0);
  assert.equal(value(toggled.context,"setAnalogies(false)"),false);assert.equal(value(toggled.context,"tooltipsEnabled()"),false);
  assert(value(toggled.context,'document.body.classList.contains("analogies-off")'));
  assert.equal(toggled.registry.accountSection.textContent,"Account overview");assert.doesNotMatch(toggled.registry.realityBar.innerHTML,/D20 Adventure.*lens/i);
  assert.equal(value(toggled.context,"setTooltips(true)"),true);assert.equal(value(toggled.context,"analogiesEnabled()"),false);
  assert(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length>0'));
  assert.equal(value(toggled.context,'setDensity("analyst")'),"analyst");
  assert.equal(value(toggled.context,"document.body.dataset.density"),"analyst");assert.equal(toggled.registry.densitySelect.value,"analyst");
  assert.doesNotMatch(toggled.registry.realityBar.innerHTML,/<details class="reality-details"[^>]*\sopen(?:\s|>)/,
    "Expert detail expanded secondary scope details without a player request");
  assert.equal(value(toggled.context,"JSON.stringify(S)"),before);assert.equal(value(toggled.context,"JSON.stringify(S.rng)"),rngBefore);
  assert.deepEqual(JSON.parse(localStore.get("ttm.ui.general.v1")),{tooltips:true,analogies:false,density:"analyst"});
  const otherProfile=makeContext("?mode=1&seed=62&flavor=dnd",{localStore,profile:"specialist"});
  assert.equal(value(otherProfile.context,"tooltipsEnabled()"),true);assert.equal(value(otherProfile.context,"analogiesEnabled()"),true);
  assert.equal(value(otherProfile.context,"densityLevel()"),"guided");
  vm.runInContext("runDay()",toggled.context);vm.runInContext("runDay()",control.context);
  assert.equal(value(toggled.context,"JSON.stringify(S)"),value(control.context,"JSON.stringify(S)"),
    "presentation toggles changed the seeded simulation");
}

// Guided definitions are sourced from the real interface copy, never from an optional analogy.
{
  function decorateTooltipText(fixture,specs){
    const analogySelector=value(fixture.context,"LORE_ANALOGY_ONLY_SELECTOR");
    const skipSelector=value(fixture.context,"LORE_SKIP_SELECTOR");
    const nodes=specs.map(spec=>{
      const node={nodeValue:spec.text,replacement:null};
      node.parentElement={closest(selector){
        if(spec.analogy&&selector===analogySelector)return this;
        if(spec.skip&&selector===skipSelector)return this;
        return null;
      }};
      node.parentNode={replaceChild(replacement){node.replacement=replacement;}};
      return node;
    });
    const surface={nodes,closest:()=>null,querySelectorAll:()=>[]};
    const root={querySelectorAll:()=>[surface]};
    fixture.context.__tooltipRoot=root;
    fixture.context.document.createTreeWalker=target=>{let i=0;return {nextNode:()=>target.nodes[i++]||null};};
    vm.runInContext("wireLore(__tooltipRoot)",fixture.context);
    return nodes.map(node=>node.replacement?node.replacement.innerHTML:"");
  }
  const labels=["Allocated / day","Modeled contribution","All-in business ROI","Modeled media CPL",
    "bank, attribution and total performance"];
  const expected=["allocation","modeled contribution","all-in business roi","media cpl","cash","attribution"];
  const linkedTerms=markup=>markup.flatMap(text=>[...text.matchAll(/data-t="([^"]+)"/g)].map(match=>match[1]));
  let baseline=null;
  for(const [flavor,analogies] of [["f1",true],["f1",false],["dnd",true],["dnd",false]]){
    const fixture=makeContext(`?mode=1&seed=627&flavor=${flavor}`);
    vm.runInContext(`UI_PREFS={tooltips:true,analogies:${analogies},density:"guided"};ACTIVE_FLAVOR=${JSON.stringify(flavor)}`,fixture.context);
    const terms=linkedTerms(decorateTooltipText(fixture,labels.map(text=>({text}))));
    assert.deepEqual(terms,expected,`${flavor}/${analogies?"analogies-on":"analogies-off"} changed canonical HUD links`);
    if(!baseline)baseline=terms;else assert.deepEqual(terms,baseline,"flavor presentation changed definition coverage");
  }
  for(const density of ["compact","analyst"]){
    const fixture=makeContext(`?mode=1&seed=627&flavor=f1`);
    vm.runInContext(`UI_PREFS={tooltips:true,analogies:false,density:${JSON.stringify(density)}}`,fixture.context);
    assert.deepEqual(linkedTerms(decorateTooltipText(fixture,labels.map(text=>({text})))),expected,
      `${density} hid an explicit real-term HUD label`);
  }
  const guidedRepeats=makeContext("?mode=1&seed=627&flavor=f1");
  assert.deepEqual(linkedTerms(decorateTooltipText(guidedRepeats,[{text:"allocation"},{text:"allocation"}])),["allocation","allocation"],
    "Guided mode still deduplicates recognized occurrences inside one card");
  const compactRepeats=makeContext("?mode=1&seed=627&flavor=f1");
  vm.runInContext('UI_PREFS={tooltips:true,analogies:false,density:"compact"}',compactRepeats.context);
  assert.deepEqual(linkedTerms(decorateTooltipText(compactRepeats,[{text:"allocation"},{text:"allocation"}])),["allocation"],
    "Compact mode lost its per-scope glossary deduplication");

  const analogyOnly=makeContext("?mode=1&seed=628&flavor=f1");
  const excluded=decorateTooltipText(analogyOnly,[
    {text:"fuel allocation",analogy:true},{text:"Modeled MER bridge",analogy:true},
    {text:"allocation inside a summary",skip:true},{text:"quality score inside a label",skip:true}
  ]);
  assert.deepEqual(excluded,["","","",""],"analogy or interactive copy created a canonical glossary control");
  assert.match(value(analogyOnly.context,"LORE_SEL"),/\.slot/);
  assert.match(value(analogyOnly.context,"LORE_SEL"),/\.night-workstream/);
  for(const learningSurface of ["#runSummary","#seedLbl","#tutorialBox","#log","#accountBox","#pipeBox",".card"])
    assert(value(analogyOnly.context,"LORE_SEL").includes(learningSurface),
      `${learningSurface} is missing from Guided definition coverage`);
  assert.doesNotMatch(value(analogyOnly.context,"LORE_SEL"),/\.rosetta/);
  for(const protectedSurface of ["summary","label","option","textarea","[contenteditable]","[aria-hidden='true']","[hidden]","[inert]",".no-lore"])
    assert(value(analogyOnly.context,"LORE_SKIP_SELECTOR").includes(protectedSurface),
      `${protectedSurface} can receive an invalid or hidden glossary control`);

  const definitionsOff=makeContext("?mode=1&seed=629&flavor=f1");
  const existing=new FakeElement("existingLore",definitionsOff.registry);existing.classList.add("lore");
  existing.textContent="allocation";definitionsOff.registry.existingLore=existing;definitionsOff.context.document.body.appendChild(existing);
  vm.runInContext("setTooltips(false)",definitionsOff.context);
  assert.equal(existing.replacedWith?.textContent,"allocation","Definitions OFF did not unwrap an existing glossary control");
  assert.deepEqual(decorateTooltipText(definitionsOff,[{text:"Allocated / day"}]),[""],
    "Definitions OFF created a new glossary control");
}

}

if(smokeShard==="d1b"){
// Tutorial v2 is a deterministic nine-action lesson: wrong player actions are strict no-ops.
{
  const localStore=new Map(),first=makeContext("?mode=1&days=12&budget=20000&seed=2601&tutorial=1&guided=1&autostart=1&brief=1",{localStore,tutorialComplete:false});
  const tutorialActions=Array.from(value(first.context,"TUTORIAL_DB.actions"));
  assert.equal(tutorialActions.length,9);
  for(const action of tutorialActions){
    assert.match(action.lessonId,/^\d{2}$/i,`${action.id} has no linked lesson`);
    assert(action.instruction.length>8&&action.body.length>40,`${action.id} does not explain both the action and result`);
  }
  finishRunOpening(first);
  const tutorialCockpit=first.context.document.getElementById("gameCockpit"),tutorialMain=first.context.document.getElementById("workspaceMain"),
    tutorialSide=first.context.document.getElementById("workspaceSide"),tutorialSystems=new FakeElement("tutorialSystemsPanel",first.registry),
    tutorialPipeDrawer=first.context.document.getElementById("pipeDrawer");
  tutorialMain.parentNode=tutorialCockpit;tutorialSide.parentNode=tutorialCockpit;first.registry.slots.parentNode=tutorialMain;
  first.registry.runBtn.parentNode=tutorialSide;first.registry.tutorialBox.parentNode=tutorialSide;tutorialSystems.dataset.sidePanel="systems";tutorialSystems.parentNode=tutorialSide;
  tutorialPipeDrawer.parentNode=tutorialSystems;first.registry.pipeBox.parentNode=tutorialPipeDrawer;
  value(first.context,"renderTutorialCoach()");
  assert.equal(tutorialCockpit.dataset.workspaceView,"overview","the guided coach routed its required action into a view that hides the coach");
  assert.equal(tutorialSide.dataset.sideView,"actions","the guided Run Day step hid its own action panel");
  const progress=()=>JSON.parse(localStore.get("ttm.tutorial.general.v2"));
  assert.equal(first.registry.overlay.innerHTML,"");assert.match(first.registry.tutorialBox.innerHTML,/Step 1 of 9/);
  assert.match(first.registry.tutorialBox.innerHTML,/Create a clean Day 1 baseline/);
  assert.match(first.registry.tutorialBox.innerHTML,/End walkthrough · unlock all controls/);
  assert.match(first.registry.tutorialEnd.getAttribute("title"),/Marks this walkthrough complete.*replay it from the main menu/);
  assert(value(first.context,'document.body.classList.contains("tutorial-action-lock")'));
  assert.equal(first.context.document.activeElement,first.registry.runBtn,"the initial guided board action did not receive focus");
  assert(first.registry.runBtn.scrolledIntoView,"the initial guided board action was not brought into view");
  assert.deepEqual(progress(),{introComplete:true,complete:false,step:0,runKey:"general|mode-1|12|20000|2601",generatedCreativeId:null,
    baseline:null,comparison:null,completedAt:null});

  // Guidance constrains game decisions, but navigation, settings and help remain available.
  for(const id of ["menuBtn","radioBtn","audioBtn","learningMenu","cardGuideBtn","helpBtn","loreBtn"])
    assert.equal(value(first.context,`tutorialClickAllowed(document.getElementById(${JSON.stringify(id)}))`),true,
      `${id} was disabled by the walkthrough`);
  const navigationState=value(first.context,"JSON.stringify(S)"),navigationProgress=JSON.stringify(progress());
  assert.equal(clickUi(first,first.registry.menuBtn),true,"the mast Menu control was blocked during the walkthrough");
  assert.match(first.registry.overlay.innerHTML,/Main menu/);assert.match(first.registry.overlay.innerHTML,/Return to run/);
  assert.equal(value(first.context,"JSON.stringify(S)"),navigationState,"opening the menu changed the tutorial account");
  assert.equal(JSON.stringify(progress()),navigationProgress,"opening the menu advanced the tutorial");
  assert.equal(clickUi(first,first.registry.menuDismiss),true);assert.equal(first.registry.overlay.innerHTML,"");
  assert(first.registry.tutorialMenu,"the coach did not provide a visible Menu and options control");
  assert.equal(clickUi(first,first.registry.tutorialMenu),true);assert.match(first.registry.overlay.innerHTML,/title-screen-drawer" open/);
  const definitionsBefore=value(first.context,"tooltipsEnabled()");
  assert.equal(clickUi(first,first.registry.menuTips),true,"tutorial menu settings were not interactive");
  assert.equal(value(first.context,"tooltipsEnabled()"),!definitionsBefore,"tutorial menu did not change a display option");
  assert.equal(clickUi(first,first.registry.menuTips),true);assert.equal(value(first.context,"tooltipsEnabled()"),definitionsBefore);
  assert.equal(clickUi(first,first.registry.menuDismiss),true);assert.equal(first.registry.overlay.innerHTML,"");
  assert.equal(value(first.context,"JSON.stringify(S)"),navigationState,"changing tutorial display options changed simulation state");
  assert.equal(JSON.stringify(progress()),navigationProgress,"changing tutorial display options advanced the tutorial");
  assert(value(first.context,'document.body.classList.contains("tutorial-action-lock")'),"returning from the menu ended the walkthrough");

  let before=value(first.context,"JSON.stringify(S)");first.registry.viewBtn.onclick();
  assert.equal(value(first.context,"JSON.stringify(S)"),before,"the lens changed before the baseline action");
  assert.equal(progress().step,0);assert.match(first.registry.tutorialBox.innerHTML,/Not yet/);
  clickAct(first,"minus",0);assert.equal(value(first.context,"JSON.stringify(S)"),before,"a locked slot action changed the tutorial state");
  clickRun(first);assert.equal(state(first.context).day,2);assert.equal(progress().step,1);
  assert(progress().baseline&&Number.isInteger(progress().baseline.slotIndex));
  assert.match(first.registry.tutorialBox.innerHTML,/Step 2 of 9/);assert.match(first.registry.tutorialBox.innerHTML,/See what the reporting view changes/);
  assert.equal(first.context.document.activeElement,first.registry.viewBtn,"the next guided board action did not receive focus");
  assert(first.registry.viewBtn.scrolledIntoView,"the next guided board action was not brought into view");

  before=value(first.context,"JSON.stringify(S)");clickRun(first);
  assert.equal(value(first.context,"JSON.stringify(S)"),before,"RUN DAY bypassed the reporting-lens lesson");
  first.registry.viewBtn.onclick();assert.equal(state(first.context).view,"attributed");assert.equal(progress().step,2);
  const brandIndex=value(first.context,'S.slots.findIndex(slot=>slot.c&&slot.c.brandPlay)');clickAct(first,"ask",brandIndex);
  assert.equal(progress().step,3);assert.equal(state(first.context).slots[brandIndex].revealed,true);
  const utilityIndex=value(first.context,'S.slots.findIndex(slot=>slot.c&&slot.c.id==="utility_a")');clickAct(first,"mult",utilityIndex);
  assert.equal(progress().step,4);assert.equal(state(first.context).slots[utilityIndex].multiplies,1);

  before=value(first.context,"JSON.stringify(S)");
  assert.equal(clickUi(first,first.registry.reqBtn),true,"Creative Lab did not open through the guided control");
  await new Promise(resolve=>setTimeout(resolve,0));
  const formatGroups=first.registry.overlay.querySelectorAll(".creative-format-group"),requiredSummary=first.registry.overlay
    .querySelectorAll("summary[data-tutorial-format-group]").find(summary=>summary.dataset.tutorialFormatGroup==="static"),
    requiredGroup=formatGroups.find(group=>group.dataset.formatSystem===requiredSummary?.dataset.formatSystem),
    blockedSummary=first.registry.overlay.querySelectorAll("summary[data-format-system]").find(summary=>summary!==requiredSummary);
  assert(requiredSummary&&requiredGroup,"Static's tutorial format group is missing");assert.equal(requiredGroup.open,true,"Static's tutorial group did not open automatically");
  assert.equal(clickUi(first,blockedSummary),false,"the gate allowed an unrelated format group");
  assert.equal(clickUi(first,requiredSummary),true,"the gate blocked Static's required format group");assert.equal(requiredGroup.open,false);
  assert.equal(clickUi(first,requiredSummary),true);assert.equal(requiredGroup.open,true,"the required group could not be reopened");
  const staticButton=first.registry.overlay.querySelectorAll("button[data-format-id]").find(button=>button.dataset.formatId==="static");
  const buildContinue=first.registry.creativeBuildContinue;
  assert.equal(staticButton?.getAttribute("aria-pressed"),"true","Static was not preselected for the guided blueprint");
  assert(buildContinue?.classList.contains("tutorial-focus"),"the guided blueprint Continue control was not highlighted");
  assert.equal(first.context.document.activeElement,buildContinue,"the guided blueprint Continue control did not receive keyboard focus");
  assert(buildContinue.scrolledIntoView,"the guided blueprint Continue control was not brought into view");
  assert.equal(clickUi(first,buildContinue),true);await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(progress().step,5);assert(progress().generatedCreativeId);assert.equal(first.registry.overlay.innerHTML,"");
  const trapIndex=value(first.context,'S.slots.findIndex(slot=>slot.c&&slot.c.id==="trap_i")');
  const swapButton=first.context.document.querySelector(`button[data-act="swap"][data-i="${trapIndex}"]`);
  assert(swapButton,"the guided target slot has no Swap control");
  assert(swapButton.classList.contains("tutorial-focus"),"the closed picker highlighted a ship button that did not exist instead of Replace creative");
  assert.equal(first.context.document.activeElement,swapButton,"Replace creative did not receive focus before the picker opened");
  assert.equal(clickUi(first,swapButton),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  const shipButton=first.context.document.querySelector(`button[data-i="0"][data-j="${trapIndex}"]`);
  assert(shipButton?.classList.contains("tutorial-focus"),"the required ship action was not highlighted");
  assert.equal(first.context.document.activeElement,shipButton,"the required ship action did not receive keyboard focus");
  assert.equal(clickUi(first,shipButton),true);assert.equal(progress().step,6);
  assert.equal(state(first.context).slots[trapIndex].c.format,"static","the UI path did not install the commissioned Static creative");
  before=value(first.context,"JSON.stringify(S)");clickAct(first,"plus",0);
  assert.equal(value(first.context,"JSON.stringify(S)"),before,"a budget action bypassed the final comparison");
  clickRun(first);assert.equal(state(first.context).day,3);assert.equal(progress().step,7);assert(progress().comparison);
  assert.match(first.registry.tutorialBox.innerHTML,/Make one small budget increase/);
  const bestIndex=value(first.context,'tutorialTargetIndex("best")'),bestBudget=state(first.context).slots[bestIndex].budget;
  clickAct(first,"plus",bestIndex);assert.equal(progress().step,8);assert.equal(state(first.context).slots[bestIndex].budget,bestBudget+value(first.context,"BUDGET_STEP"));
  assert.match(first.registry.tutorialBox.innerHTML,/Add a third observation/);
  before=value(first.context,"JSON.stringify(S)");first.registry.viewBtn.onclick();
  assert.equal(value(first.context,"JSON.stringify(S)"),before,"the lens bypassed the third guided period");
  clickRun(first);assert.equal(state(first.context).day,4);
  assert.match(first.registry.tutorialBox.innerHTML,/Guided opening complete/);assert.match(first.registry.tutorialBox.innerHTML,/Your three-day check/);
  assert.equal(progress().complete,true);assert.equal(progress().step,9);
  assert.equal(value(first.context,'document.body.classList.contains("tutorial-action-lock")'),false);

  const returning=makeContext("?mode=1&days=12&budget=20000&seed=2601",{localStore,tutorialComplete:false});
  assert.equal(returning.registry.tutorialBox.innerHTML,"");assert.match(returning.registry.overlay.innerHTML,/Main menu/);
  assert.equal(value(returning.context,"replayTutorial()"),true);const replayParams=new URLSearchParams(value(returning.context,"location.search"));
  assert.equal(replayParams.get("seed"),"2601");assert.equal(replayParams.get("tutorial"),"1");assert.equal(replayParams.get("guided"),"1");
  assert.equal(replayParams.get("brief"),"1");assert.equal(replayParams.get("autostart"),"1");
  assert.equal(JSON.parse(localStore.get("ttm.tutorial.general.v2")).complete,false);

  /* A scripted mode keeps its own walkthrough but canonicalizes to its fixed teaching seed;
     a mode without a script still canonicalizes to the Mode 1 Fundamentals script. */
  const arbitrary=makeContext("?mode=4&days=60&budget=100000&seed=63&tutorial=1&autostart=1&resume=1&stage=3",{
    localStore:new Map(),tutorialComplete:false});
  const redirected=new URLSearchParams(value(arbitrary.context,"location.search"));assert.equal(redirected.get("mode"),"4");assert.equal(redirected.get("seed"),"2604");
  assert.equal(redirected.get("days"),"60");assert.equal(redirected.get("budget"),"100000");
  assert.equal(redirected.get("brief"),"1");assert.equal(redirected.get("guided"),"1");assert.equal(redirected.get("autostart"),"1");assert.equal(redirected.get("resume"),null);
  assert.equal(redirected.get("stage"),null);assert.equal(value(arbitrary.context,"typeof S"),"undefined");
  const unscripted=makeContext("?mode=5&days=90&budget=25000&seed=63&tutorial=1&autostart=1&resume=1",{
    localStore:new Map(),tutorialComplete:false});
  const rerouted=new URLSearchParams(value(unscripted.context,"location.search"));assert.equal(rerouted.get("mode"),"1");assert.equal(rerouted.get("seed"),"2601");
  assert.equal(rerouted.get("days"),"12");assert.equal(rerouted.get("budget"),"20000");assert.equal(value(unscripted.context,"typeof S"),"undefined");
  assert.match(css,/body\.tutorial-action-lock/);assert.match(css,/\.tutorial-focus/);

  const specialistStore=new Map(),specialist=makeContext("?mode=1&days=12&budget=20000&seed=2601&tutorial=1&guided=1&autostart=1&brief=1",{
    localStore:specialistStore,profile:"specialist",tutorialComplete:false});
  finishRunOpening(specialist);
  assert(specialistStore.has("ttm.tutorial.specialist.v2"));assert(!specialistStore.has("ttm.tutorial.general.v2"));
  assert.match(specialist.registry.tutorialBox.innerHTML,/Step 1 of 9/);
}

// Tutorial checkpoints restore the verified action, generated creative, and coach state instead of restarting or diverging.
{
  const localStore=new Map(),search="?mode=1&days=12&budget=20000&seed=2601";
  const first=makeContext(`${search}&tutorial=1&guided=1&autostart=1&brief=1`,{localStore,tutorialComplete:false});finishRunOpening(first);
  clickRun(first);first.registry.viewBtn.onclick();
  const brandIndex=value(first.context,'S.slots.findIndex(slot=>slot.c&&slot.c.brandPlay)'),
    utilityIndex=value(first.context,'S.slots.findIndex(slot=>slot.c&&slot.c.id==="utility_a")');
  clickAct(first,"ask",brandIndex);clickAct(first,"mult",utilityIndex);
  const commissioned=value(first.context,'requestCreative("static")');assert(commissioned&&commissioned.id);
  const requestedState=value(first.context,"JSON.stringify(S)"),requestedProgress=JSON.parse(localStore.get("ttm.tutorial.general.v2")),
    requestedRecord=JSON.parse(localStore.get("ttm.save.general.mode-1.v3"));
  assert.equal(requestedProgress.step,5);assert.equal(requestedProgress.generatedCreativeId,commissioned.id);
  assert.equal(requestedRecord.tutorial.step,5);assert.equal(requestedRecord.tutorial.generatedCreativeId,commissioned.id);

  const afterRequest=makeContext(`${search}&resume=1`,{localStore,tutorialComplete:false});
  assert.equal(value(afterRequest.context,"JSON.stringify(S)"),requestedState,"creative-request resume changed the tutorial board");
  assert.equal(value(afterRequest.context,"readTutorialProgress().step"),5);assert.match(afterRequest.registry.tutorialBox.innerHTML,/Step 6 of 9/);
  assert.equal(value(afterRequest.context,`S.readyCreative.some(c=>c.id===${JSON.stringify(commissioned.id)})`),true,
    "the generated tutorial creative disappeared on resume");
  const trapIndex=value(afterRequest.context,'tutorialTargetIndex("trap")'),
    readyIndex=value(afterRequest.context,`S.readyCreative.findIndex(c=>c.id===${JSON.stringify(commissioned.id)})`);
  assert.equal(value(afterRequest.context,`shipReady(${readyIndex},${trapIndex})`),true);clickRun(afterRequest);
  const bestIndex=value(afterRequest.context,'tutorialTargetIndex("best")');clickAct(afterRequest,"plus",bestIndex);
  const allocatedState=value(afterRequest.context,"JSON.stringify(S)"),allocatedProgress=JSON.parse(localStore.get("ttm.tutorial.general.v2")),
    allocatedRecord=JSON.parse(localStore.get("ttm.save.general.mode-1.v3"));
  assert.equal(allocatedProgress.step,8);assert.equal(allocatedRecord.tutorial.step,8);

  const afterAllocation=makeContext(`${search}&resume=1`,{localStore,tutorialComplete:false});
  assert.equal(value(afterAllocation.context,"JSON.stringify(S)"),allocatedState,"allocation resume changed the tutorial board");
  assert.equal(value(afterAllocation.context,"readTutorialProgress().step"),8);assert.match(afterAllocation.registry.tutorialBox.innerHTML,/Step 9 of 9/);
  assert.match(afterAllocation.registry.tutorialBox.innerHTML,/Add a third observation/);
}

// An unfinished tutorial stays dormant on a plain fresh route and reactivates only when its checkpoint is resumed.
{
  const localStore=new Map(),search="?mode=1&days=12&budget=20000&seed=2601",
    guided=makeContext(`${search}&tutorial=1&guided=1&autostart=1&brief=1`,{localStore,tutorialComplete:false});
  finishRunOpening(guided);clickRun(guided);
  const checkpoint=value(guided.context,"JSON.stringify(S)"),savedProgress=JSON.parse(localStore.get("ttm.tutorial.general.v2"));
  assert.equal(savedProgress.step,1);

  const freshPage=makeContext(search,{localStore,tutorialComplete:false});
  assert.match(freshPage.registry.overlay.innerHTML,/Main menu/);assert.match(freshPage.registry.overlay.innerHTML,/Resume/);
  assert.equal(freshPage.registry.tutorialBox.innerHTML,"");assert.equal(value(freshPage.context,'document.body.classList.contains("tutorial-action-lock")'),false);
  assert.notEqual(value(freshPage.context,"JSON.stringify(S)"),checkpoint,"plain fresh route silently restored unfinished tutorial state");
  freshPage.registry.continueRun.onclick();
  assert.equal(value(freshPage.context,"JSON.stringify(S)"),checkpoint);assert.equal(value(freshPage.context,"readTutorialProgress().step"),1);
  assert.match(freshPage.registry.tutorialBox.innerHTML,/Step 2 of 9/);
  assert.equal(value(freshPage.context,'document.body.classList.contains("tutorial-action-lock")'),true);
}

// Routing into the walkthrough from live play checkpoints the latest active work first, and
// a scripted mode restarts its OWN walkthrough rather than being pulled back to Mode 1.
{
  const localStore=new Map(),key="ttm.save.general.mode-2.v3",f=makeContext("?mode=2&days=12&budget=20000&seed=705",{localStore});
  vm.runInContext("close();runDay()",f.context);const autoRaw=localStore.get(key);clickAct(f,"minus",0);
  const latest=value(f.context,"JSON.stringify(S)");assert.notEqual(JSON.stringify(JSON.parse(autoRaw).state),latest);
  vm.runInContext("mainMenu()",f.context);assert.match(f.registry.overlay.innerHTML,/restart the Working Capital — The Settlement Lag walkthrough/);f.registry.replayTutorial.onclick();
  const replayRaw=localStore.get(key),record=JSON.parse(replayRaw);assert.notEqual(replayRaw,autoRaw);assert.equal(JSON.stringify(record.state),latest);
  const params=new URLSearchParams(value(f.context,"location.search"));
  assert.equal(params.get("mode"),"2");assert.equal(params.get("tutorial"),"1");assert.equal(params.get("guided"),"1");
  assert.equal(params.get("seed"),"2602");assert.equal(params.get("brief"),"1");assert.equal(params.get("autostart"),"1");assert.equal(params.get("resume"),null);
}

// Mode 2 runs its own verified action script on its fixed teaching seed: wrong actions are
// refused, each verified action advances the script, and the run carries a live-phase seed.
{
  const localStore=new Map();
  const f=makeContext("?mode=2&days=12&budget=20000&seed=2602&tutorial=1&guided=1&autostart=1&brief=1",{localStore,tutorialComplete:false});
  finishRunOpening(f);
  const progress=()=>JSON.parse(localStore.get("ttm.tutorial.general.mode-2.v2"));
  assert.match(f.registry.tutorialBox.innerHTML,/Step 1 of 5/);
  assert.match(f.registry.tutorialBox.innerHTML,/Create a clean Day 1 baseline/);
  assert(Number.isInteger(state(f.context).liveSeed)&&state(f.context).liveSeed>=1,"a guided run did not draw its live-phase seed");
  assert.equal(state(f.context).tutorialWindowDays,3);
  let before=value(f.context,"JSON.stringify(S)");f.registry.viewBtn.onclick();
  assert.equal(value(f.context,"JSON.stringify(S)"),before,"the lens changed before the baseline run");
  clickRun(f);assert.equal(progress().step,1);assert.equal(state(f.context).day,2);
  f.registry.viewBtn.onclick();assert.equal(progress().step,2);
  clickRun(f);assert.equal(progress().step,3);
  const best=value(f.context,'tutorialTargetIndex("best")');assert(best>=0,"Mode 2's strongest-ad target did not resolve");
  clickAct(f,"plus",best);assert.equal(progress().step,4);
  clickRun(f);assert.equal(progress().complete,true);assert.equal(state(f.context).day,4);
  assert.match(f.registry.tutorialBox.innerHTML,/Guided opening complete/);
  assert.match(f.registry.tutorialBox.innerHTML,/live market conditions/);
  assert.equal(value(f.context,'document.body.classList.contains("tutorial-action-lock")'),false);
}

// After the scripted window, a guided run turns probabilistic: the same fixed seed replays the
// window identically, while the live phase follows the run's own liveSeed.
{
  const play=liveSeed=>{
    const f=makeContext("?mode=2&days=12&budget=20000&seed=2602&tutorial=1&guided=1&autostart=1&brief=1",{
      localStore:new Map(),tutorialComplete:false});
    finishRunOpening(f);
    vm.runInContext(`completeTutorial("ended",false);S.liveSeed=${liveSeed}`,f.context);
    for(let d=0;d<5;d++)vm.runInContext("close();runDay()",f.context);
    return {window:JSON.stringify(state(f.context).slots.map(slot=>slot.hist.slice(0,3))),
      final:value(f.context,"S.earnedRevenue")};
  };
  const a=play(11111),b=play(22222),c=play(11111);
  assert.equal(a.window,b.window,"the scripted window's days changed with the live seed");
  assert.equal(JSON.stringify(a),JSON.stringify(c),"equal live seeds did not replay identically");
  assert.notEqual(a.final,b.final,"the live phase ignored the run's live seed");
  const plain=makeContext("?mode=2&days=12&budget=20000&seed=2602",{localStore:new Map()});
  assert.equal(state(plain.context).liveSeed,undefined,"a non-guided run drew a live-phase seed");
}

// Mode 3's script carries a build through production and review, then ships it by hand.
{
  const localStore=new Map();
  const f=makeContext("?mode=3&days=12&budget=20000&seed=2603&tutorial=1&guided=1&autostart=1&brief=1",{localStore,tutorialComplete:false});
  finishRunOpening(f);
  const progress=()=>JSON.parse(localStore.get("ttm.tutorial.general.mode-3.v2"));
  assert.match(f.registry.tutorialBox.innerHTML,/Step 1 of 6/);
  assert.match(f.registry.tutorialBox.innerHTML,/Order the replacement before you need it/);
  assert.equal(state(f.context).tutorialWindowDays,4);
  assert.equal(clickUi(f,f.registry.reqBtn),true,"Creative Lab did not open through the guided control");
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(clickUi(f,f.registry.creativeBuildContinue),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(progress().step,1);assert(progress().generatedCreativeId,"the commissioned build has no tracked identity");
  clickRun(f);assert.equal(progress().step,2);
  clickRun(f);assert.equal(progress().step,3);
  clickRun(f);assert.equal(progress().step,4);
  const ready=value(f.context,`S.readyCreative.findIndex(c=>c.id===${JSON.stringify(progress().generatedCreativeId)})`);
  assert(ready>=0,"the commissioned Static was not approved within the scripted window — move Mode 3's teaching seed");
  const tired=value(f.context,'tutorialTargetIndex("tired")');assert(tired>=0);
  const swapButton=f.context.document.querySelector(`button[data-act="swap"][data-i="${tired}"]`);
  assert(swapButton,"the most fatigued ad has no Replace creative control");
  assert.equal(clickUi(f,swapButton),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  const shipButton=f.context.document.querySelector(`button[data-i="${ready}"][data-j="${tired}"]`);
  assert(shipButton,"the approved build has no ship control");
  assert.equal(clickUi(f,shipButton),true);assert.equal(progress().step,5);
  clickRun(f);assert.equal(progress().complete,true);assert.equal(state(f.context).day,5);
  assert.match(f.registry.tutorialBox.innerHTML,/Guided opening complete/);
}

// Mode 4's script reallocates one step from the weakest lane to the strongest.
{
  const localStore=new Map();
  const f=makeContext("?mode=4&days=12&budget=20000&seed=2604&tutorial=1&guided=1&autostart=1&brief=1",{localStore,tutorialComplete:false});
  finishRunOpening(f);
  const progress=()=>JSON.parse(localStore.get("ttm.tutorial.general.mode-4.v2"));
  assert.match(f.registry.tutorialBox.innerHTML,/Step 1 of 5/);
  assert.match(f.registry.tutorialBox.innerHTML,/Run Day 1 across all four lanes/);
  assert.equal(state(f.context).tutorialWindowDays,2);
  clickRun(f);assert.equal(progress().step,1);
  f.registry.viewBtn.onclick();assert.equal(progress().step,2);
  const worst=value(f.context,'tutorialTargetIndex("worst")'),best=value(f.context,'tutorialTargetIndex("best")');
  assert(worst>=0&&best>=0&&worst!==best,"Mode 4's reallocation targets did not resolve to two different lanes");
  clickAct(f,"minus",worst);assert.equal(progress().step,3);
  clickAct(f,"plus",best);assert.equal(progress().step,4);
  clickRun(f);assert.equal(progress().complete,true);assert.equal(state(f.context).day,3);
  assert.match(f.registry.tutorialBox.innerHTML,/Guided opening complete/);
}

// Run endings speak player psychology in the flavor's own vocabulary — a party wipe, a DNF,
// a busted run — never a term map recited over a dead account, and no rosetta grid either.
{
  const {context,registry}=makeContext("?mode=6&budget=250000&seed=645&flavor=dnd");
  assert.equal(value(context,"ORDERED_FLAVORS.every(f=>FLAVOR_MOMENTS[f.id]&&FLAVOR_MOMENTS[f.id].victory&&FLAVOR_MOMENTS[f.id].defeat)"),true,
    "a flavor is missing its victory or defeat moment");
  vm.runInContext("S.month=5;S.day=101;S.dayInMonth=20;S.cash=-49999;S.creditLimit=50000;S.clients=[];AgencyCareer.runDay({force:true})",context);
  assert.equal(state(context).outcome,"operating-insolvency","the fixture did not force an insolvent close");
  assert.match(registry.overlay.innerHTML,/party wipe/i,"the D&D lens recited a ledger over a dead party");
  assert.doesNotMatch(registry.overlay.innerHTML,/class="rosetta"/,"the term grid rendered on a death screen");
  assert.doesNotMatch(registry.overlay.innerHTML,/party treasury ledger/,"the old term-map cue survived on the debrief");
}

// Every terminal debrief offers an operable route back to the browser-local main menu.
{
  const modern=makeContext("?mode=1&days=4&seed=641");runToEnd(modern.context);
  assert.equal(typeof modern.registry.debriefMenu.onclick,"function");modern.registry.debriefMenu.onclick();
  assert.match(modern.registry.overlay.innerHTML,/Main menu/);

  const classic=makeContext("?mode=0&stage=1&days=7&seed=642");vm.runInContext("classicDebrief()",classic.context);
  assert.equal(typeof classic.registry.debriefMenu.onclick,"function");classic.registry.debriefMenu.onclick();
  assert.match(classic.registry.overlay.innerHTML,/Main menu/);

  const nightmare=makeContext("?mode=5&days=90&seed=643");runToEnd(nightmare.context);
  assert.equal(typeof nightmare.registry.mainmenu.onclick,"function");nightmare.registry.mainmenu.onclick();
  assert.match(nightmare.registry.overlay.innerHTML,/Main menu/);

  const career=makeContext("?mode=6&budget=250000&seed=644");
  vm.runInContext("S.month=119;S.day=2400;S.dayInMonth=20;S.cumulativeProfit=13000000;S.peakProfit=13000000;S.cash=1000000;S.clients=[];AgencyCareer.runDay({force:true})",career.context);
  assert.equal(typeof career.registry.debriefMenu.onclick,"function");career.registry.debriefMenu.onclick();
  assert.match(career.registry.overlay.innerHTML,/Main menu/);
}

// Landing-step work changes only future funnel delivery and stays attached to the slot across a creative swap.
{
  const optimized=makeContext("?mode=1&seed=43"),control=makeContext("?mode=1&seed=43");
  vm.runInContext("runDay()",optimized.context);vm.runInContext("runDay()",control.context);
  const historical=value(optimized.context,'JSON.stringify({last:S.slots[0].last,earned:S.earnedRevenue,attributed:S.attributedEarnedRevenue,leads:S.leadsTotal,reported:S.reportedLeadsTotal})');
  const spendBefore=state(optimized.context).spendTotal;
  clickAct(optimized,"lander",0);
  assert.equal(value(optimized.context,'JSON.stringify({last:S.slots[0].last,earned:S.earnedRevenue,attributed:S.attributedEarnedRevenue,leads:S.leadsTotal,reported:S.reportedLeadsTotal})'),historical,
    "landing optimization rewrote historical delivery");
  assert.equal(state(optimized.context).slots[0].lpOptimizations,1);
  approx(state(optimized.context).spendTotal-spendBefore,value(optimized.context,"scaledCost(900)"));
  vm.runInContext("runDay()",optimized.context);vm.runInContext("runDay()",control.context);
  const improved=state(optimized.context).slots[0].last,baseline=state(control.context).slots[0].last;
  approx(improved.lpctr,Math.min(95,baseline.lpctr+5),1e-9,"landing work did not improve future LP CTR");
  approx(improved.cvr,baseline.cvr*1.08,1e-9,"landing work did not improve future click-to-lead CVR");
  assert(improved.leads>baseline.leads);

  vm.runInContext("requestCreative()",optimized.context);
  assert.equal(value(optimized.context,"shipReady(0,0)"),true);
  assert.equal(state(optimized.context).slots[0].lpOptimizations,1,"creative replacement erased slot-level landing work");
}

// Player-selected authorization scales allocation increments and operating actions throughout the UI and ledger.
for(const budget of [5000,20000,100000]){
  const f=makeContext(`?mode=1&days=12&budget=${budget}&seed=44`);
  const expectedStep=Math.max(250,Math.round((budget*.05)/50)*50);
  const expectedLandingCost=Math.max(0,Math.round((900*(budget/20000))/50)*50);
  assert.equal(value(f.context,"BUDGET_STEP"),expectedStep);
  assert.equal(value(f.context,"scaledCost(900)"),expectedLandingCost);
  assert(f.registry.slots.innerHTML.includes(`Improve landing-page step · $${expectedLandingCost.toLocaleString("en-US")}`));
  const before=state(f.context).spendTotal;clickAct(f,"lander",0);
  assert.equal(state(f.context).spendTotal-before,expectedLandingCost);
  assert.equal(state(f.context).opsCost,expectedLandingCost);
  assert.equal(state(f.context).costBreakdown.funnel,expectedLandingCost);
}

// Pixel loss changes attribution, not account outcomes; the repair control reconciles future reporting.
{
  const {context}=makeContext("?mode=2&seed=51");
  vm.runInContext('S.pixel={status:"degraded",days:3,diagnosed:true};S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1},event:{id:"quiet",title:"No shock",body:"",tone:"",target:null}};runDay()',context);
  assert(state(context).leadsTotal>=state(context).reportedLeadsTotal);
  assert(state(context).revenue>=state(context).attributedRevenue);
  vm.runInContext('S.pixel={status:"degraded",days:2,diagnosed:true};render()',context);
  const pixelButton=value(context,'document.getElementById("pixelBtn")');
  pixelButton.onclick();
  assert.equal(state(context).pixel.status,"healthy");
  assert.equal(state(context).telemetry.pixelFixes,1);
}

// The modern funnel exposes its actual click-to-lead model and keeps LP CTR as a parallel diagnostic.
{
  const {context,registry}=makeContext("?mode=1&seed=510");
  vm.runInContext('S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1},event:{id:"quiet",title:"No shock",body:"",tone:"",target:null}};runDay()',context);
  const brand=state(context).slots[3];
  assert(brand.last.leads>0,"reach play produced no modeled outcomes");
  assert.equal(brand.last.lpc,0,"reach play unexpectedly produced an instrumented landing action");
  assert.match(registry.slots.innerHTML,/Outcome path/);
  assert.match(registry.slots.innerHTML,/CVR = modeled leads \/ ad clicks/);
  assert.match(registry.slots.innerHTML,/Parallel landing diagnostic/);
  assert.match(registry.slots.innerHTML,/Landing-page click-through rate \(LP CTR\) is not available for this reach ad because it does not track an on-page action/);
  assert.doesNotMatch(registry.slots.innerHTML,/LP visits[^<]*→[^<]*on-page (?:actions|clicks)[^<]*→[^<]*modeled leads/i);
}

// Period 1 is Monday; only periods 6 and 7 receive the first weekend inventory adjustment.
{
  const {context}=makeContext("?mode=2&seed=511");
  assert.equal(value(context,"dowFactor(1)"),1.05);
  assert.equal(value(context,"dowFactor(5)"),1.05);
  assert.equal(value(context,"dowFactor(6)"),0.86);
  assert.equal(value(context,"dowFactor(7)"),0.86);
  assert.equal(value(context,"dowFactor(8)"),1.05);
}

// Mode 4 platform pools create disclosed, deterministic marginal CPM friction above capacity.
{
  const low=makeContext("?mode=4&seed=612"),high=makeContext("?mode=4&seed=612");
  const capacity=value(low.context,'mode4PlatformCapacity("snap")');
  assert.equal(capacity,value(low.context,"scaledDefault(3200)"));
  assert.equal(value(low.context,'mode4CapacityState("snap",mode4PlatformCapacity("snap")*.5).cpmM'),1);
  assert.equal(value(low.context,'mode4CapacityState("snap",mode4PlatformCapacity("snap")*1.5).cpmM'),1.04);
  for(const [fixture,budget] of [[low,capacity*.5],[high,capacity*1.5]]){
    vm.runInContext(`S.slots.forEach((slot,i)=>{slot.alive=i===0;slot.budget=i===0?${budget}:0;slot.lastBudget=slot.budget;});S.slots[0].plat="snap";S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1},event:{id:"quiet",title:"No shock",body:"",tone:"",target:null}};runDay()`,fixture.context);
  }
  const lowLast=state(low.context).slots[0].last,highLast=state(high.context).slots[0].last;
  assert.equal(highLast.laneCapacityUse,1.5);
  assert.equal(highLast.laneCapacityCpmM,1.04);
  assert(Math.abs(highLast.cpm/lowLast.cpm-1.04)<1e-10,"platform capacity pressure did not flow into CPM");
  assert.match(high.registry.slots.innerHTML,/Lane capacity/);
  assert.match(high.registry.slots.innerHTML,/exists only in To The Moon — it is not a platform benchmark/);
  assert.match(high.registry.slots.innerHTML,/High CTR, weak click-to-lead CVR/);
  assert.doesNotMatch(value(high.context,"PLATFORMS.snap.note"),/completion|VCR/i);
  assert.match(value(high.context,"PLATFORMS.google.note"),/Profitability still depends/);
}

// Mode 4 offer timing applies the disclosed CVR haircut; it does not invent an unmodeled completion-rate claim.
{
  const early=makeContext("?mode=4&seed=613"),late=makeContext("?mode=4&seed=613");
  for(const [fixture,second] of [[early,1],[late,3]])vm.runInContext(`S.slots.forEach((slot,i)=>{slot.alive=i===0;slot.budget=i===0?1600:0;slot.lastBudget=slot.budget;});S.slots[0].plat="snap";S.slots[0].offerAtSec=${second};S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1},event:{id:"quiet",title:"No shock",body:"",tone:"",target:null}};runDay()`,fixture.context);
  approx(state(late.context).slots[0].last.cvr/state(early.context).slots[0].last.cvr,.74);
  assert.doesNotMatch(sourceCorpus,/completion (?:is )?under 1%|almost nobody is there/i);
  assert.match(appScript,/13% click-to-lead conversion-rate reduction/i);
}

// Mode 4 platform moves can create the overlap mechanic that used to be unreachable.
{
  const {context,registry}=makeContext("?mode=4&seed=61");
  const handler=registry.slots.listeners.click[0];
  handler({target:{closest:()=>({dataset:{act:"platform",i:"0"}})}}); // Google → Snap, now two Snap slots.
  vm.runInContext("runDay()",context);
  assert(state(context).telemetry.overlapDays>0);
  assert.equal(state(context).telemetry.platformMoves,1);
}

}

if(smokeShard==="d2"){
// Mode 5 boots as a distinct synthetic portfolio engine with eight free-choice lanes and clean display names.
{
  const {context,registry}=makeContext("?mode=5&seed=67&flavor=dnd");
  const s=state(context);
  assert.equal(value(context,"MODE"),5);
  assert.equal(value(context,"DAYS"),90);
  assert.equal(value(context,"DAILY"),150000);
  assert.equal(s.engine,"nightmare");
  assert.equal(s.accounts.length,6);
  assert.equal(value(context,"NightmareEngine.laneOrder.length"),8);
  assert.equal(new Set(Array.from(value(context,"NightmareEngine.laneOrder"))).size,8);
  assert(s.accounts.every(a=>a.fictional&&a.name.startsWith("Fictional ·")&&a.business.startsWith("Fictional ·")));
  assert.equal(s.holding.fictional,true);
  assert.equal(s.desk.fictional,true);
  assert.deepEqual(Array.from(value(context,"NightmareEngine.validate()")),[]);
  assert.match(registry.realityBar.innerHTML,/Multi-client paid search, paid social, demand generation and programmatic \/ CTV/);
  assert.match(registry.realityBar.innerHTML,/In-house holding-company media desk \/ internal agency/);
  for(const platform of ["Google Ads — Search","Google Ads — Demand Gen","Microsoft Advertising — Search","Meta Ads","TikTok Ads","Snapchat Ads","LinkedIn Campaign Manager","platform-abstracted programmatic \/ CTV"])
    assert(new RegExp(platform,"i").test(registry.realityBar.innerHTML),`${platform} missing from real-world scope`);
  assert.match(registry.accountBox.innerHTML,/Practice environment/);
  assert.match(registry.slots.innerHTML,/Quasar Kettleworks/);
  assert.doesNotMatch(registry.slots.innerHTML,/\bFictional\b/i);
  assert.match(registry.slots.innerHTML,/What the controls affect/);
  vm.runInContext("briefing()",context);
  assert.equal(registry.overlay.querySelectorAll("button[data-mode]").length,0);
  assert.match(registry.overlay.innerHTML,/Current mission/);assert.match(registry.overlay.innerHTML,/Shared cash and credit/);
  assert.match(registry.overlay.innerHTML,/Platform claims can overlap/);
  assert.doesNotMatch(registry.overlay.innerHTML,/wizard-lens-grid|daysCfg|budgetCfg|Choose one of 11/);
  assert.doesNotMatch([registry.realityBar.innerHTML,registry.accountBox.innerHTML,registry.slots.innerHTML,registry.overlay.innerHTML].join(" "),/\bfictional\b/i);
}

// The redesigned Mode 5 surface starts with a scan layer, preserves details, and names every card section.
{
  const {context,registry}=makeContext("?mode=5&seed=671&flavor=dnd");
  assert.match(registry.slots.innerHTML,/<details class="night-workstream"/);
  assert.equal((registry.slots.innerHTML.match(/<details class="night-workstream"/g)||[]).length,6);
  assert.equal((registry.slots.innerHTML.match(/data-workstream-id="[^"]+" open/g)||[]).length,1,"the initial roster opened more than one workstream");
  assert.match(css,/\.night-workstream-list\{display:flex!important;flex-direction:column;align-items:stretch!important/,
    "Mode 5 workstreams are still laid out in overlap-prone grid tracks");
  assert.match(css,/\.night-workstream-list>\.note,\.night-workstream-list>\.night-workstream\{flex:0 0 auto;width:100%;min-width:0\}/,
    "expanded workstreams do not reserve their full document-flow height");
  const workstreams=registry.slots.querySelectorAll("details[data-workstream-id]");assert.equal(workstreams.length,6);
  workstreams[1].open=true;workstreams[1].listeners.toggle[0]();
  assert.equal(workstreams.filter(node=>node.open).length,1,"opening a workstream left another expanded underneath it");
  assert.equal(workstreams[1].open,true,"the requested workstream did not remain open");
  for(const section of ["Scope","What needs attention now","Last-day evidence","Delivery path","Creative","Decisions"])
    assert(registry.slots.innerHTML.includes(section),`Mode 5 cards omitted ${section}`);
  assert.match(registry.slots.innerHTML,/Next decision:/);assert.match(registry.slots.innerHTML,/Last-day MER status:/);
  assert.equal((registry.strip.innerHTML.match(/class="stat"/g)||[]).length,6,"primary HUD is not a six-metric scan layer");
  assert.match(registry.accountBox.innerHTML,/Finance (?:and|&|&amp;) attribution details · 6 metrics/);
  assert.match(registry.accountBox.innerHTML,/night-hud-drawer/);
  assert.equal(value(context,"NightmareEngine.validate().length"),0);
}

// Card anatomy is an operable, mode-aware teaching surface rather than an unexplained legend.
for(const mode of [0,1,5,6]){
  const fixture=makeContext(`?mode=${mode}&seed=672${mode}${mode===0?"&stage=1":""}`),button=fixture.registry.cardGuideBtn;
  assert(button.listeners.click&&button.listeners.click.length,`Mode ${mode} did not wire the card guide`);
  button.listeners.click[0]();
  assert.match(fixture.registry.overlay.innerHTML,/How to read a card/);
  assert.match(fixture.registry.overlay.innerHTML,/card-anatomy/);
  assert.match(fixture.registry.overlay.innerHTML,mode===0?/Keyword, match (?:&|&amp;) bid/:mode===5?/What needs attention now/:mode===6?/Career clock/:/Concept, format (?:&|&amp;) rarity/);
}

// The displayed event-deck odds are derived from the live weights instead of stale hard-coded percentages.
{
  const {context,registry}=makeContext("?mode=5&seed=68");
  const expectedSummary=()=>{
    const events=Array.from(value(context,"NightmareEngine.events"),event=>({id:event.id,weight:event.weight}));
    const total=events.reduce((n,event)=>n+event.weight,0);
    const pct=ids=>Math.round(events.filter(event=>ids.includes(event.id)).reduce((n,event)=>n+event.weight,0)/total*100);
    return `${pct(["quiet"])}% ordinary · ${pct(["viral","earned","glut"])}% upside · `+
      `${pct(["auction","fees","copied"])}% auction/fee/fatigue · `+
      `${pct(["ghost","signal","payout","flag","bidwar","blackout","conquest","quality"])}% measurement/operations`;
  };
  assert(registry.accountBox.innerHTML.includes(expectedSummary()));
  const before=expectedSummary();
  vm.runInContext('NightmareEngine.events.find(event=>event.id==="quiet").weight=220;render()',context);
  assert.notEqual(expectedSummary(),before);
  assert(registry.accountBox.innerHTML.includes(expectedSummary()));
}

// Lead-quality escalations preserve competing hypotheses until a controlled test supports one cause.
{
  const fixture=makeContext("?mode=5&seed=681"),quality=value(fixture.context,'NightmareEngine.events.find(event=>event.id==="quality")');
  assert(quality&&quality.crisis==="lead_quality_escalation");assert.equal(quality.targetKind,"interrupt");
  vm.runInContext(`(()=>{const a=S.accounts.find(item=>NightmareEngine.lanes[item.platform].kind!=="search");
    S.dayState={day:S.day,mood:{label:"Stable",detail:"baseline",tone:"",cpmM:1},
      event:{...NightmareEngine.events.find(item=>item.id==="quality"),targetId:a.id,targetLane:a.platform,targetPixel:a.pixel,applied:false,averted:false}};runDay();})()`,fixture.context);
  const crisis=state(fixture.context).crises.find(item=>item.type==="lead_quality_escalation");
  assert(crisis);assert(["creative_fit","account_learning","signal_contamination","geo_leak","downstream_shift"].includes(crisis.hidden));
  const correct={creative_fit:"creative_test",account_learning:"account_test",signal_contamination:"signal_test",geo_leak:"observe",downstream_shift:"cohort"}[crisis.hidden];
  const wrong=["account_test","signal_test","creative_test","observe","cohort"].find(choice=>choice!==correct);
  const targetBefore=value(fixture.context,`(()=>{const c=S.crises.find(item=>item.id===${JSON.stringify(crisis.id)}),a=S.accounts.find(item=>item.id===c.targetId),p=S.pixels.find(item=>item.id===a.pixel);
    return JSON.stringify({learning:a.learning,creative:a.creative,fatigue:a.fatigue,creativeFitM:a.creativeFitM,pixel:a.pixel,purity:p&&p.purity,geoQualityM:a.geoQualityM,claimTrust:a.claimTrust});})()`);
  assert.equal(value(fixture.context,`NightmareEngine.resolveCrisis(${JSON.stringify(crisis.id)},${JSON.stringify(wrong)})`),true);
  if(["account_test","signal_test","creative_test"].includes(wrong)){
    const targetAfter=value(fixture.context,`(()=>{const c=S.crises.find(item=>item.id===${JSON.stringify(crisis.id)}),a=S.accounts.find(item=>item.id===c.targetId),p=S.pixels.find(item=>item.id===a.pixel);
      return JSON.stringify({learning:a.learning,creative:a.creative,fatigue:a.fatigue,creativeFitM:a.creativeFitM,pixel:a.pixel,purity:p&&p.purity,geoQualityM:a.geoQualityM,claimTrust:a.claimTrust});})()`);
    assert.equal(targetAfter,targetBefore,"a failed controlled diagnostic mutated a supposedly held-constant live layer");
  }
  const stillOpen=state(fixture.context).crises.find(item=>item.id===crisis.id);assert(stillOpen,"one wrong hypothesis incorrectly closed the ticket");
  assert(stillOpen.meta.attempted.includes(wrong));assert(stillOpen.meta.eliminated.length>=1);
  assert.equal(value(fixture.context,`NightmareEngine.resolveCrisis(${JSON.stringify(crisis.id)},${JSON.stringify(correct)})`),true);
  assert(!state(fixture.context).crises.some(item=>item.id===crisis.id));
  const resolved=state(fixture.context).crisisHistory.find(item=>item.id===crisis.id);
  assert.equal(resolved.truth,crisis.hidden);assert.equal(resolved.causalConfidence,"high");
  assert.equal(state(fixture.context).telemetry.qualityDiagnoses,1);
}

// The three explicitly controlled quality tests do not change live layers when their hypotheses are false.
for(const choice of ["account_test","signal_test","creative_test"]){
  const fixture=makeContext(`?mode=5&seed=${682+["account_test","signal_test","creative_test"].indexOf(choice)}`);
  vm.runInContext(`(()=>{const a=S.accounts.find(item=>NightmareEngine.lanes[item.platform].kind!=="search");
    S.dayState={day:S.day,mood:{label:"Stable",detail:"baseline",tone:"",cpmM:1},event:{...NightmareEngine.events.find(item=>item.id==="quality"),targetId:a.id,targetLane:a.platform,targetPixel:a.pixel,applied:false,averted:false}};runDay();
    const c=S.crises.find(item=>item.type==="lead_quality_escalation");c.hidden="downstream_shift";S.ops=2;})()`,fixture.context);
  const crisis=state(fixture.context).crises.find(item=>item.type==="lead_quality_escalation");
  const before=value(fixture.context,`(()=>{const a=S.accounts.find(item=>item.id===${JSON.stringify(crisis.targetId)}),p=S.pixels.find(item=>item.id===a.pixel);
    return JSON.stringify({learning:a.learning,creative:a.creative,fatigue:a.fatigue,creativeFitM:a.creativeFitM,pixel:a.pixel,purity:p&&p.purity,geoQualityM:a.geoQualityM,claimTrust:a.claimTrust});})()`);
  assert.equal(value(fixture.context,`NightmareEngine.resolveCrisis(${JSON.stringify(crisis.id)},${JSON.stringify(choice)})`),true);
  const after=value(fixture.context,`(()=>{const c=S.crises.find(item=>item.id===${JSON.stringify(crisis.id)}),a=S.accounts.find(item=>item.id===c.targetId),p=S.pixels.find(item=>item.id===a.pixel);
    return JSON.stringify({learning:a.learning,creative:a.creative,fatigue:a.fatigue,creativeFitM:a.creativeFitM,pixel:a.pixel,purity:p&&p.purity,geoQualityM:a.geoQualityM,claimTrust:a.claimTrust});})()`);
  assert.equal(after,before,`${choice} changed live delivery despite disproving its hypothesis`);
}

// Lead-quality scope follows the hidden causal layer: creative, lane, and event source are distinct;
// geography and downstream acceptance remain advertiser-wide when those media layers are replaced.
function forcedQualityFixture(cause,seed){
  const fixture=makeContext(`?mode=5&seed=${seed}`);
  vm.runInContext(`(()=>{const a=S.accounts.find(item=>item.id==="quasar");
    S.dayState={day:S.day,mood:{label:"Stable",detail:"baseline",tone:"",cpmM:1},
      event:{...NightmareEngine.events.find(item=>item.id==="quality"),targetId:a.id,targetLane:a.platform,targetPixel:a.pixel,
        targetCreative:[a.platform,a.creative.format,creativeConceptFor(a.creative).id,creativeProductionMethodFor(a.creative).id,a.creative.name,a.creative.tier,"v"+(a.creativeVersion||0)].join("|"),qualityCause:${JSON.stringify(cause)},applied:false,averted:false}};
    runDay();S.ops=2;})()`,fixture.context);
  const crisis=state(fixture.context).crises.find(item=>item.type==="lead_quality_escalation");
  assert(crisis,`${cause} fixture did not open its lead-quality ticket`);assert.equal(crisis.hidden,cause);
  return {fixture,crisis};
}
for(const [cause,action] of [
  ["creative_fit",'NightmareEngine.handleAction({dataset:{night:"refresh",id:"quasar"}})'],
  ["account_learning",'NightmareEngine.setLane("quasar","snap")'],
  ["signal_contamination",'NightmareEngine.handleAction({dataset:{night:"isolate",id:"quasar"}})']
]){
  const {fixture,crisis}=forcedQualityFixture(cause,690+cause.length);
  vm.runInContext(action,fixture.context);
  assert.equal(state(fixture.context).crises.some(item=>item.id===crisis.id),false,
    `${cause} ticket survived replacement of its actual causal layer`);
  const closed=state(fixture.context).crisisHistory.find(item=>item.id===crisis.id);
  assert(closed?.superseded,`${cause} scope change was not recorded as a superseded ticket`);
}
for(const cause of ["geo_leak","downstream_shift"]){
  const {fixture,crisis}=forcedQualityFixture(cause,710+cause.length);
  vm.runInContext(`NightmareEngine.handleAction({dataset:{night:"refresh",id:"quasar"}});
    NightmareEngine.setLane("quasar","snap");
    NightmareEngine.handleAction({dataset:{night:"isolate",id:"quasar"}})`,fixture.context);
  assert(state(fixture.context).crises.some(item=>item.id===crisis.id),
    `${cause} advertiser-wide ticket was incorrectly erased by creative, lane, or event-source replacement`);
}

// One fictional advertiser can run paid, simultaneous platform initiatives without cloning value or gaming portfolio scope.
{
  const a=makeContext("?mode=5&seed=69"),control=makeContext("?mode=5&seed=69");
  const capBefore=value(a.context,'S.accounts.filter(x=>!x.paused).reduce((n,x)=>n+x.budget,0)');
  const cashBefore=state(a.context).finance.cash,opsBefore=state(a.context).ops;
  assert(value(a.context,'!!NightmareEngine.addParallelInitiative("quasar","google_search")'));
  let s=state(a.context),parallel=s.accounts.find(x=>x.id==="quasar::initiative-2");
  assert(parallel,"parallel initiative did not receive a stable per-advertiser slot ID");
  assert.equal(parallel.brandId,"quasar");assert.equal(parallel.platform,"google_search");assert.equal(parallel.budget,0);
  assert.equal(s.accounts.length,7);assert.equal(s.ops,opsBefore-1);
  approx(cashBefore-s.finance.cash,value(a.context,"DAILY*.009"));
  assert.equal(value(a.context,'S.accounts.filter(x=>!x.paused).reduce((n,x)=>n+x.budget,0)'),capBefore);
  assert(s.pixels.find(pixel=>pixel.id==="prism").members.includes(parallel.id));
  assert.deepEqual(Array.from(value(a.context,"NightmareEngine.validate()")),[]);

  const beforeDuplicate=value(a.context,"JSON.stringify(S)");
  assert.equal(value(a.context,'NightmareEngine.addParallelInitiative("quasar","google_search")'),false);
  assert.equal(value(a.context,"JSON.stringify(S)"),beforeDuplicate,"duplicate advertiser/lane setup consumed resources");
  assert.equal(value(a.context,'NightmareEngine.setLane("quasar","google_search")'),false,"lane replacement duplicated a sibling lane");

  vm.runInContext("runDay()",a.context);vm.runInContext("runDay()",control.context);
  for(const id of ["quasar","cloudbadger","lattice","wyvern","orchard","anvil"]){
    const actual=state(a.context).accounts.find(x=>x.id===id).last,expected=state(control.context).accounts.find(x=>x.id===id).last;
    approx(actual?.modeledRevenue||0,expected?.modeledRevenue||0,1e-6,`unfunded parallel changed ${id}'s modeled outcome`);
  }
  assert.equal(state(a.context).accounts.find(x=>x.id==="quasar::initiative-2").last,null);

  vm.runInContext(`const source=S.accounts.find(x=>x.id==="quasar"),parallel=S.accounts.find(x=>x.id==="quasar::initiative-2");
    source.budget-=BUDGET_STEP;parallel.budget+=BUDGET_STEP;runDay()`,a.context);
  s=state(a.context);parallel=s.accounts.find(x=>x.id==="quasar::initiative-2");
  assert(parallel.last?.spend>0,"funded parallel initiative did not deliver");
  assert(s.outcomes.some(outcome=>outcome.accountId===parallel.id&&outcome.brandId==="quasar"&&outcome.platform==="google_search"));
  assert.deepEqual(Array.from(value(a.context,"NightmareEngine.validate()")),[]);
}

// Advertiser-level event-source separation moves every sibling initiative together.
{
  const {context}=makeContext("?mode=5&seed=70");
  vm.runInContext('NightmareEngine.addParallelInitiative("quasar","google_search");S.ops=2;NightmareEngine.handleAction({dataset:{night:"isolate",id:"quasar"}})',context);
  const siblings=Array.from(state(context).accounts).filter(account=>account.brandId==="quasar");
  assert.equal(new Set(siblings.map(account=>account.pixel)).size,1);
  assert.notEqual(siblings[0].pixel,"prism");
  assert(siblings.every(account=>state(context).pixels.find(pixel=>pixel.id===account.pixel).members.includes(account.id)));
  assert.deepEqual(Array.from(value(context,"NightmareEngine.validate()")),[]);
}

// Nightmare accounting keeps one modeled outcome/receivable per funded initiative-day while allowing overlapping claims.
{
  const {context}=makeContext("?mode=5&seed=71");
  vm.runInContext("runDay()",context);
  const s=state(context);
  const modeled=Array.from(s.outcomes).reduce((sum,outcome)=>sum+outcome.modeledValue,0);
  const claims=Array.from(s.claims).reduce((sum,claim)=>sum+claim.value,0);
  const receivables=Array.from(s.finance.receivables).reduce((sum,item)=>sum+item.amount,0);
  const accountSpend=Array.from(s.accounts).reduce((sum,account)=>sum+account.totals.spend,0);
  assert(Math.abs(modeled-s.modeledRevenue)<1e-6);
  assert(Math.abs(claims-s.reportedRevenue)<1e-6);
  assert(Math.abs(receivables-s.modeledRevenue)<1e-6);
  assert(Math.abs(accountSpend-s.spendTotal)<1e-6);
  assert.notEqual(s.reportedRevenue,s.modeledRevenue);
  assert.equal(new Set(Array.from(s.outcomes,outcome=>outcome.id)).size,s.outcomes.length);
  assert.equal(new Set(Array.from(s.finance.receivables,item=>item.id)).size,s.finance.receivables.length);
  assert(s.reportedRevenue>0&&s.modeledRevenue>0);
}

// Event-source contamination creates explicit cross-account claim records, never extra modeled outcomes or cash.
{
  const {context}=makeContext("?mode=5&seed=72");
  const openingCash=state(context).finance.cash;
  vm.runInContext('S.pixels.find(p=>p.id==="prism").purity=.30;runDay()',context);
  const s=state(context);
  assert(s.claims.some(claim=>claim.crossPixel),"low-integrity shared event sources did not create cross-account claims");
  assert(s.claims.length>s.outcomes.length,"claim duplication was not represented explicitly");
  assert.equal(s.finance.cash,openingCash,"unsettled platform claims changed cash");
  assert(Math.abs(Array.from(s.finance.receivables).reduce((n,r)=>n+r.amount,0)-s.modeledRevenue)<1e-6);
}

// Search hits a finite query ceiling; creative refresh is a separate social/CTV operation.
{
  const search=makeContext("?mode=5&seed=74");
  vm.runInContext('S.accounts.forEach(a=>{a.paused=a.id!=="cloudbadger"});S.accounts.find(a=>a.id==="cloudbadger").budget=DAILY;runDay()',search.context);
  const cloud=state(search.context).accounts.find(a=>a.id==="cloudbadger");
  assert.equal(value(search.context,'NightmareEngine.lanes["google_search"].kind'),"search");
  assert(cloud.last.undelivered>0,"search accepted infinite budget instead of respecting query volume");
  assert(cloud.last.spend<=cloud.budget);

  const social=makeContext("?mode=5&seed=74");
  assert.match(social.registry.slots.innerHTML,/class="meter fatigue"/);
  assert.match(css,/\.meter\.fatigue i\{background:linear-gradient\(90deg,var\(--good\),var\(--warn\),var\(--bad\)\)/);
  const before=state(social.context).accounts.find(a=>a.id==="quasar").fatigue;
  vm.runInContext("runDay()",social.context);
  assert(state(social.context).accounts.find(a=>a.id==="quasar").fatigue>before);
  vm.runInContext('NightmareEngine.handleAction({dataset:{night:"refresh",id:"quasar"}})',social.context);
  const refreshed=state(social.context).accounts.find(a=>a.id==="quasar");
  assert.equal(refreshed.fatigue,5);
  assert(["Common","Epic","Legendary"].includes(refreshed.creative.tier));
  assert.equal(state(social.context).ops,1);
}

// Every crisis family is injectable and resolvable with a scoped, paid/operational response.
for(const fixture of [
  ["ghost_attribution","quasar","audit"],
  ["pixel_contamination","quasar","clean"],
  ["payout_delay","quasar","factor"],
  ["false_flag","quasar","appeal"],
  ["bid_war","cloudbadger","relevance"],
  ["payment_failure",null,"paydown"],
  ["brand_conquest","quasar","protect"]
]){
  const [type,targetId,choice]=fixture,{context}=makeContext("?mode=5&seed=76");
  if(type==="payout_delay")vm.runInContext('S.finance.receivables.push({id:"forced-rec",outcomeId:"forced",accountId:"quasar",due:20,amount:1000})',context);
  if(type==="payment_failure")vm.runInContext('S.finance.creditUsed=1000;S.finance.creditHolds=[{id:"forced-bill",due:1,amount:1000,label:"forced"}]',context);
  vm.runInContext(`S.crises.push({id:"forced",type:${JSON.stringify(type)},targetId:${JSON.stringify(targetId)},startDay:1,status:"open",scope:"forced",hidden:"fraud",meta:{}})`,context);
  const opsBefore=state(context).ops;
  assert.equal(value(context,`NightmareEngine.resolveCrisis("forced",${JSON.stringify(choice)})`),true,`${type} did not resolve`);
  assert.equal(state(context).crises.length,0);
  assert.equal(state(context).crisisHistory[0].type,type);
  assert.equal(state(context).ops,opsBefore-1);
  if(type==="payout_delay")assert.equal(state(context).finance.receivables.some(item=>item.id==="forced-rec"),false);
  if(type==="payment_failure"){assert.equal(state(context).finance.creditUsed,0);assert.equal(state(context).finance.creditHolds.length,0);}
  if(type==="brand_conquest")assert.equal(state(context).brandProtectionDaysByBrand.quasar,7);
  assert.equal(value(context,`NightmareEngine.resolveCrisis("forced",${JSON.stringify(choice)})`),false,"resolved crisis was charged twice");
}

// False account flags stay in force until acted on; appeal and migration have distinct recovery clocks and costs.
{
  const held=makeContext("?mode=5&seed=761");
  vm.runInContext(`S.accounts.forEach(a=>a.paused=a.id!=="quasar");
    const a=S.accounts.find(a=>a.id==="quasar");a.blockedDays=2;
    S.crises=[{id:"flag-held",type:"false_flag",targetId:a.id,startDay:S.day,status:"open",scope:"ad account",
      scopeKey:"initiative:"+a.id,hidden:null,meta:{targetLane:a.platform}}]`,held.context);
  const spendBefore=state(held.context).accounts.find(a=>a.id==="quasar").totals.spend;
  for(let day=0;day<2;day++)vm.runInContext(`S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
    event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,held.context);
  assert.equal(state(held.context).accounts.find(a=>a.id==="quasar").blockedDays,2,
    "an ignored false-flag ticket expired on its own");
  assert.equal(state(held.context).accounts.find(a=>a.id==="quasar").totals.spend,spendBefore);
  assert.equal(value(held.context,'NightmareEngine.resolveCrisis("flag-held","appeal")'),true);
  const appeal=state(held.context).crisisHistory.find(c=>c.id==="flag-held");
  assert.equal(appeal.cost,value(held.context,"DAILY*.005"));
  assert.equal(state(held.context).accounts.find(a=>a.id==="quasar").blockedDays,1);
  vm.runInContext(`S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
    event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,held.context);
  assert.equal(state(held.context).accounts.find(a=>a.id==="quasar").blockedDays,0);
  assert.equal(state(held.context).accounts.find(a=>a.id==="quasar").totals.spend,spendBefore,
    "appeal did not preserve its one remaining held-delivery day");

  const migrated=makeContext("?mode=5&seed=762");
  const originalPixel=state(migrated.context).accounts.find(a=>a.id==="quasar").pixel;
  vm.runInContext(`S.accounts.forEach(a=>a.paused=a.id!=="quasar");
    const a=S.accounts.find(a=>a.id==="quasar");a.blockedDays=2;
    S.crises=[{id:"flag-migrate",type:"false_flag",targetId:a.id,startDay:S.day,status:"open",scope:"ad account",
      scopeKey:"initiative:"+a.id,hidden:null,meta:{targetLane:a.platform}}]`,migrated.context);
  assert.equal(value(migrated.context,'NightmareEngine.resolveCrisis("flag-migrate","migrate")'),true);
  const target=state(migrated.context).accounts.find(a=>a.id==="quasar"),migration=state(migrated.context).crisisHistory.find(c=>c.id==="flag-migrate");
  assert.equal(target.blockedDays,0);approx(target.learning,.48,1e-12,
    "migration did not apply its clean event-source learning reset");
  assert.notEqual(target.pixel,originalPixel,"migration left the held initiative on its old shared event source");
  assert.equal(migration.cost,value(migrated.context,"DAILY*.024"));
  assert(migration.cost>appeal.cost);
  vm.runInContext(`S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
    event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,migrated.context);
  assert(state(migrated.context).accounts.find(a=>a.id==="quasar").totals.spend>0,
    "migrated delivery remained blocked for the appeal recovery day");
}

// Nested migration cleanup removes crises by stable ID, even when pixel isolation closes an earlier ticket first.
{
  const {context}=makeContext("?mode=5&seed=7621");
  vm.runInContext(`const a=S.accounts.find(a=>a.id==="quasar"),p=S.pixels.find(p=>p.id===a.pixel);
    a.blockedDays=2;
    S.crises=[
      {id:"quality-first",type:"lead_quality_escalation",targetId:a.id,startDay:S.day,status:"open",scope:"account operations",
        scopeKey:"initiative:"+a.id,hidden:"signal_contamination",meta:{targetLane:a.platform,targetPixel:p.id,targetCreative:a.creative.name+"|"+a.creative.format,attempted:[],eliminated:[]}},
      {id:"flag-second",type:"false_flag",targetId:a.id,startDay:S.day,status:"open",scope:"ad account",
        scopeKey:"initiative:"+a.id,hidden:null,meta:{targetLane:a.platform}}
    ]`,context);
  assert.equal(value(context,'NightmareEngine.resolveCrisis("flag-second","migrate")'),true);
  const s=state(context),historyIds=Array.from(s.crisisHistory,item=>item.id);
  assert.deepEqual(Array.from(s.crises,item=>item.id),[],"migration left a resolved false-flag ticket open");
  assert.equal(historyIds.filter(id=>id==="quality-first").length,1,"pixel migration did not supersede the stale quality ticket exactly once");
  assert.equal(historyIds.filter(id=>id==="flag-second").length,1,"false-flag migration was not recorded exactly once");
  assert(s.crisisHistory.find(c=>c.id==="quality-first")?.superseded);
  assert.equal(s.crisisHistory.find(c=>c.id==="flag-second")?.response,"migrate");
}

// Payout tickets own the exact delayed batch: later same-advertiser receivables neither block recovery nor get factored.
{
  const {context}=makeContext("?mode=5&seed=7622");
  vm.runInContext(`S.accounts.forEach(a=>a.paused=a.id!=="quasar");
    S.finance.receivables.push({id:"delay-old",outcomeId:"old",accountId:"quasar",due:20,amount:1000});
    const a=S.accounts.find(a=>a.id==="quasar");
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
      event:{...NightmareEngine.events.find(e=>e.id==="payout"),targetId:a.id,targetLane:a.platform,targetPixel:a.pixel,
        targetCreative:a.creative.name+"|"+a.creative.format,applied:false,averted:false}};runDay()`,context);
  const payout=state(context).crises.find(c=>c.type==="payout_delay");
  assert(payout,"payout event did not open a delayed-batch ticket");
  assert(payout.meta.receivableIds.includes("delay-old"),"existing affected receivable was not attached to the payout ticket");
  assert(payout.meta.receivableIds.includes("REC-1-quasar"),"same-day affected receivable was not attached to the payout ticket");
  const payoutId=payout.id,tracked=Array.from(payout.meta.receivableIds);
  vm.runInContext(`const tracked=${JSON.stringify(tracked)};
    S.finance.receivables=S.finance.receivables.filter(r=>!tracked.includes(r.id));
    S.finance.receivables.push({id:"fresh-unaffected",outcomeId:"fresh",accountId:"quasar",due:999,amount:777});
    S.accounts.forEach(a=>a.paused=true);
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
      event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,context);
  const recovered=state(context);
  assert.equal(recovered.crises.some(c=>c.id===payoutId),false,"fresh same-advertiser value kept a settled payout ticket open");
  assert(recovered.crisisHistory.find(c=>c.id===payoutId)?.superseded,"settled payout ticket was not recorded as recovered");
  assert(recovered.finance.receivables.some(r=>r.id==="fresh-unaffected"),"unaffected later receivable was consumed during recovery");

  const factored=makeContext("?mode=5&seed=7623");
  vm.runInContext(`S.finance.receivables=[
      {id:"delayed-batch",outcomeId:"delayed",accountId:"quasar",due:30,amount:1000},
      {id:"later-batch",outcomeId:"later",accountId:"quasar",due:31,amount:800}
    ];
    S.crises=[{id:"payout-scoped",type:"payout_delay",targetId:"quasar",startDay:S.day,status:"open",scope:"receivables",
      scopeKey:"brand:quasar",hidden:null,meta:{receivableIds:["delayed-batch"]}}]`,factored.context);
  const cashBefore=state(factored.context).finance.cash;
  assert.equal(value(factored.context,'NightmareEngine.resolveCrisis("payout-scoped","factor")'),true);
  const afterFactor=state(factored.context);
  assert.equal(afterFactor.finance.receivables.some(r=>r.id==="delayed-batch"),false);
  assert(afterFactor.finance.receivables.some(r=>r.id==="later-batch"),"factoring the delayed batch also consumed a later receivable");
  approx(afterFactor.finance.cash,cashBefore+940,1e-9,"factoring did not apply the 6% haircut to the tracked batch only");
}

// Payment-failure tickets follow the exact overdue holds, auto-close when they clear, and can recur for a new bill.
{
  const {context}=makeContext("?mode=5&seed=763");
  vm.runInContext(`S.accounts.forEach(a=>a.paused=true);S.finance.cash=0;S.finance.creditUsed=1200;
    S.finance.creditHolds=[{id:"forced-hold-a",due:S.day,amount:1200,label:"fixture A"}];
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
      event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,context);
  const first=state(context).crises.find(c=>c.type==="payment_failure");
  assert(first);assert.deepEqual(Array.from(first.meta.holdIds),["forced-hold-a"]);
  const firstId=first.id;

  vm.runInContext(`S.finance.cash=1200;
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
      event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,context);
  assert.equal(state(context).crises.some(c=>c.id===firstId),false,"cleared overdue hold left a stale payment ticket open");
  const cleared=state(context).crisisHistory.find(c=>c.id===firstId);
  assert(cleared?.superseded,"automatically recovered payment ticket was not recorded as superseded");

  vm.runInContext(`S.finance.cash=0;S.finance.creditUsed=900;
    S.finance.creditHolds=[{id:"forced-hold-b",due:S.day,amount:900,label:"fixture B"}];
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},
      event:{...NightmareEngine.events.find(e=>e.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};runDay()`,context);
  const recurrent=state(context).crises.find(c=>c.type==="payment_failure");
  assert(recurrent,"a new overdue hold could not reopen a payment-failure ticket");
  assert.notEqual(recurrent.id,firstId);assert.deepEqual(Array.from(recurrent.meta.holdIds),["forced-hold-b"]);
}

// A payment failure must be resolved through its scoped crisis response; routine global paydown cannot bypass its ops cost.
{
  const f=makeContext("?mode=5&seed=764");
  vm.runInContext(`S.finance.cash=1;S.finance.creditUsed=1200;
    S.finance.creditHolds=[{id:"global-hold",due:S.day,amount:1200,label:"fixture"}];
    S.crises=[{id:"global-payment",type:"payment_failure",targetId:null,startDay:S.day,status:"open",scope:"holding company",
      scopeKey:"holding",hidden:null,meta:{holdIds:["already-cleared","global-hold"]}}]`,f.context);
  const ops=state(f.context).ops,day=state(f.context).day;
  assert.equal(vm.runInContext('NightmareEngine.globalAction("paydown")',f.context),false);
  let s=state(f.context);assert.equal(s.finance.creditUsed,1200);assert.equal(s.finance.creditHolds.length,1);
  assert.equal(s.crises.some(c=>c.id==="global-payment"),true,"routine paydown bypassed the open payment ticket");
  assert.equal(s.ops,ops);assert.equal(s.day,day);assert.match(f.registry.overlay.innerHTML,/Crisis queue · 1 open/);
  assert.match(f.registry.overlay.innerHTML,/Clear the overdue balance with cash · \$1,200 cash \+ 1 op/);
  assert.equal(vm.runInContext('NightmareEngine.resolveCrisis("global-payment","paydown")',f.context),false,
    "a token partial payment closed the overdue ticket");
  s=state(f.context);assert.equal(s.finance.creditUsed,1200);assert.equal(s.finance.creditHolds[0].amount,1200);
  assert.equal(s.ops,ops);assert.equal(s.crises.some(c=>c.id==="global-payment"),true);
  vm.runInContext("S.finance.cash=1200",f.context);
  vm.runInContext('NightmareEngine.resolveCrisis("global-payment","paydown")',f.context);
  s=state(f.context);assert.equal(s.finance.creditUsed,0);assert.equal(s.finance.creditHolds.length,0);
  assert.equal(s.crises.some(c=>c.id==="global-payment"),false);assert.equal(s.ops,ops-1);assert.equal(s.day,day);
}

// Open Mode 5 crises pause batch time and route both the button and programmatic advance to the queue.
{
  const f=makeContext("?mode=5&seed=765");
  vm.runInContext(`S.crises=[{id:"waiting-fire",type:"false_flag",targetId:"quasar",startDay:S.day,status:"open",scope:"ad account",
    scopeKey:"initiative:quasar",hidden:null,meta:{targetLane:S.accounts.find(a=>a.id==="quasar").platform}}];renderNightmare()`,f.context);
  const day=state(f.context).day,batches=state(f.context).telemetry.batchDays;
  assert.match(f.registry.accountBox.innerHTML,/Review crisis queue · 1 open/);
  assert.match(f.registry.accountBox.innerHTML,/Batch advance is paused/);
  f.registry.advanceBtn.onclick();assert.equal(state(f.context).day,day);assert.equal(state(f.context).telemetry.batchDays,batches);
  assert.match(f.registry.overlay.innerHTML,/Crisis queue · 1 open/);
  vm.runInContext("close()",f.context);assert.equal(value(f.context,"NightmareEngine.advance()"),false);
  assert.equal(state(f.context).day,day);assert.match(f.registry.overlay.innerHTML,/Crisis queue · 1 open/);
}

// Forged crisis choices and lane-incompatible actions are rejected without spending operations.
{
  const {context}=makeContext("?mode=5&seed=77");
  vm.runInContext('S.crises.push({id:"forced",type:"bid_war",targetId:"cloudbadger",startDay:1,status:"open",scope:"search",meta:{}})',context);
  const before=value(context,"JSON.stringify(S)");
  assert.equal(value(context,'NightmareEngine.resolveCrisis("forced","magic-fix")'),false);
  assert.equal(value(context,"JSON.stringify(S)"),before);
  const ops=state(context).ops;
  const actionBefore=value(context,"JSON.stringify(S)");
  for(const action of ["search-negatives","search-relevance","bid-plus","bid-minus"])
    assert.equal(value(context,`NightmareEngine.handleAction({dataset:{night:${JSON.stringify(action)},id:"quasar"}})`),false);
  assert.equal(value(context,'NightmareEngine.handleAction({dataset:{night:"refresh",id:"cloudbadger"}})'),false);
  assert.equal(value(context,'NightmareEngine.handleAction({dataset:{night:"view-audit",id:"quasar"}})'),false);
  assert.equal(state(context).ops,ops);
  assert.equal(value(context,"JSON.stringify(S)"),actionBefore);
}

// Mode 5 action caps are mechanics guards: exhausted controls return false and spend nothing.
{
  const {context}=makeContext("?mode=5&seed=77");
  const noOp=(expression,label,expectsFalse=true)=>{const before=value(context,"JSON.stringify(S)"),result=value(context,expression);
    if(expectsFalse)assert.equal(result,false,`${label} did not report its cap`);
    assert.equal(value(context,"JSON.stringify(S)"),before,`${label} mutated a capped portfolio`);};
  vm.runInContext("S.auditQuality=1;S.pixels.forEach(pixel=>pixel.purity=1);S.contingency=2;S.ops=2;render()",context);
  noOp('NightmareEngine.globalAction("audit")',"portfolio audit");
  noOp('NightmareEngine.globalAction("clean")',"event-source repair");
  noOp('NightmareEngine.globalAction("contingency")',"contingency build");

  vm.runInContext('const search=S.accounts.find(a=>NightmareEngine.lanes[a.platform].kind==="search");search.negatives=13;search.qualityScore=10;search.learning=.88;search.bid=1.85;S.ops=2',context);
  const searchId=state(context).accounts.find(a=>value(context,`NightmareEngine.lanes[${JSON.stringify(a.platform)}].kind`)==="search").id;
  noOp(`NightmareEngine.handleAction({dataset:{night:"search-negatives",id:${JSON.stringify(searchId)}}})`,"search negatives");
  noOp(`NightmareEngine.handleAction({dataset:{night:"search-relevance",id:${JSON.stringify(searchId)}}})`,"search relevance");
  noOp(`NightmareEngine.handleAction({dataset:{night:"bid-plus",id:${JSON.stringify(searchId)}}})`,"maximum bid");
  vm.runInContext(`S.accounts.find(a=>a.id===${JSON.stringify(searchId)}).bid=.45`,context);
  noOp(`NightmareEngine.handleAction({dataset:{night:"bid-minus",id:${JSON.stringify(searchId)}}})`,"minimum bid");

  vm.runInContext('const ctv=S.accounts.find(a=>NightmareEngine.lanes[a.platform].kind==="ctv");ctv.claimTrust=1;S.auditQuality=1;S.ops=2',context);
  const ctvId=state(context).accounts.find(a=>value(context,`NightmareEngine.lanes[${JSON.stringify(a.platform)}].kind`)==="ctv").id;
  noOp(`NightmareEngine.handleAction({dataset:{night:"view-audit",id:${JSON.stringify(ctvId)}}})`,"view-through audit");

  vm.runInContext("S.accounts.forEach((a,i)=>a.budget=i?0:DAILY);render()",context);
  const fundedId=state(context).accounts[0].id,zeroId=state(context).accounts[1].id;
  noOp(`NightmareEngine.handleAction({dataset:{night:"budget-plus",id:${JSON.stringify(fundedId)}}})`,"portfolio allocation increase",false);
  noOp(`NightmareEngine.handleAction({dataset:{night:"budget-minus",id:${JSON.stringify(zeroId)}}})`,"zero allocation decrease",false);
}

// A capped bid-war response cannot consume the ticket, ops action, or cash.
{
  const {context}=makeContext("?mode=5&seed=77");
  vm.runInContext('const a=S.accounts.find(x=>NightmareEngine.lanes[x.platform].kind==="search");a.bid=1.85;S.crises.push({id:"bid-cap",type:"bid_war",targetId:a.id,startDay:1,status:"open",scope:"search",meta:{targetLane:a.platform}})',context);
  const before=value(context,"JSON.stringify(S)");
  assert.equal(value(context,'NightmareEngine.resolveCrisis("bid-cap","raise")'),false);
  assert.equal(value(context,"JSON.stringify(S)"),before);
}

// Solvency failure is consecutive: a successful clearing day resets the streak instead of merely decrementing it.
{
  const {context}=makeContext("?mode=5&seed=78");
  vm.runInContext("S.insolvencyDays=2;runDay()",context);
  assert.equal(state(context).insolvencyDays,0);
  assert.equal(state(context).ended,false);
}

// Targeted RNG events are either compatible with their snapshotted lane/source or explicitly averted.
{
  const {context}=makeContext("?mode=5&seed=78");
  vm.runInContext(`globalThis.forcedEvent={...NightmareEngine.events.find(event=>event.id==="bidwar"),
    targetId:"cloudbadger",targetLane:"google_search",targetPixel:"ember",applied:false,averted:false};
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},event:forcedEvent};
    NightmareEngine.setLane("cloudbadger","meta");runDay()`,context);
  assert.equal(value(context,"forcedEvent.averted"),true);
  assert.equal(state(context).crises.some(crisis=>crisis.type==="bid_war"),false);
  assert.match(state(context).log[0].html,/Event averted/);
}
{
  const {context}=makeContext("?mode=5&seed=78");
  vm.runInContext(`globalThis.forcedEvent={...NightmareEngine.events.find(event=>event.id==="signal"),
    targetId:"quasar",targetLane:"meta",targetPixel:"prism",applied:false,averted:false};
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},event:forcedEvent};
    NightmareEngine.handleAction({dataset:{night:"isolate",id:"quasar"}});runDay()`,context);
  assert.equal(value(context,"forcedEvent.averted"),true);
  assert.equal(state(context).crises.some(crisis=>crisis.type==="pixel_contamination"),false);
  assert.equal(state(context).telemetry.pixelIsolations,1);
}
{
  const {context}=makeContext("?mode=5&seed=78");
  vm.runInContext(`const target=S.accounts.find(account=>account.id==="quasar");
    globalThis.forcedEvent={...NightmareEngine.events.find(event=>event.id==="copied"),targetId:target.id,
      targetLane:target.platform,targetPixel:target.pixel,targetCreative:[target.platform,target.creative.name,target.creative.tier,target.creativeTests||0].join("|"),applied:false,averted:false};
    S.dayState={day:S.day,mood:{label:"Stable",tone:"",cpmM:1,detail:"baseline"},event:forcedEvent};
    NightmareEngine.handleAction({dataset:{night:"refresh",id:"quasar"}});runDay()`,context);
  assert.equal(value(context,"forcedEvent.averted"),true);
  assert(state(context).accounts.find(account=>account.id==="quasar").fatigue<84,"replaced creative inherited the old copied-hook penalty");
}

// If an event has no legal target, the next draw becomes a global quiet day rather than mis-targeting a lane.
{
  const {context}=makeContext("?mode=5&seed=80");
  vm.runInContext(`NightmareEngine.events.forEach(event=>event.weight=event.id==="bidwar"?1:0);
    S.accounts.forEach(account=>NightmareEngine.setLane(account.id,"meta"));runDay()`,context);
  assert.equal(state(context).dayState.event.id,"quiet");
  assert.equal(state(context).dayState.event.targetId,null);
}
{
  const {context}=makeContext("?mode=5&seed=80");
  vm.runInContext('NightmareEngine.events.forEach(event=>event.weight=event.id==="conquest"?1:0);freshNightmare()',context);
  assert.equal(state(context).dayState.event.id,"quiet","brand conquest targeted a portfolio with no generated brand demand");
}

// Opposing advertiser-level claim errors cannot cancel into a deceptively healthy portfolio total.
{
  const {context}=makeContext("?mode=5&days=120&seed=82");
  vm.runInContext(`S.day=30;S.auditQuality=.90;
    S.dailyLedger=Array.from({length:29},(_,i)=>({day:i+1,spend:1e12,billed:9e11,
      modeledRevenue:2e12,reportedRevenue:2e12,opsCost:0,collections:0,payments:0,failedPayment:false,
      cash:S.finance.cash,byPlatform:{Google:5e11,Meta:5e11},
      byAccount:{quasar:1e12,cloudbadger:1e12},byBrand:{quasar:1e12,cloudbadger:1e12},
      claimedByAccount:{quasar:2e12,cloudbadger:0}}));
    S.dayState={day:30,mood:{label:"Stable",tone:"",cpmM:1,detail:"auction baseline"},
      event:{...NightmareEngine.events.find(event=>event.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};
    runDay()`,context);
  const month=state(context).months[0];
  const cancellingAggregateGap=Math.abs(month.reported-month.modeled)/month.modeled;
  assert(cancellingAggregateGap<1e-6,"fixture did not create cancelling aggregate attribution errors");
  assert(month.gap>.99,"monthly measurement ignored advertiser-level absolute attribution error");
  assert.equal(month.conditions.measurement,false);
}

// A profitable three-gate streak can exit only when the current day actually closes a monthly gate.
{
  const {context}=makeContext("?mode=5&days=120&seed=84");
  vm.runInContext(`S.day=91;S.gateStreak=3;S.modeledRevenue=DAILY*90*.20;S.billedTotal=0;S.opsCost=0;
    S.insolvencyDays=0;S.dayState={day:91,mood:{label:"Stable",tone:"",cpmM:1,detail:"auction baseline"},
      event:{...NightmareEngine.events.find(event=>event.id==="quiet"),targetId:null,targetLane:null,targetPixel:null,applied:false,averted:false}};
    runDay()`,context);
  assert.equal(state(context).ended,false,"portfolio exited between monthly gates");
  assert.equal(state(context).day,92);
  assert.equal(state(context).outcome,null);
}

// Players can deliberately complete a full run with an all-Google portfolio by buying resilience.
{
  const {context}=makeContext("?mode=5&days=180&seed=79");
  vm.runInContext('S.accounts.forEach((a,i)=>NightmareEngine.setLane(a.id,i%2?"google_dgen":"google_search"))',context);
  const s=runNightmarePolicy(context,180),families=Array.from(s.accounts,a=>value(context,`NightmareEngine.lanes[${JSON.stringify(a.platform)}].family`));
  assert.deepEqual([...new Set(families)],["Google"]);
  assert.equal(s.contingency,2);
  assert(s.opsCost>0,"resilience was free");
  assert.equal(s.outcome,"portfolio-exit","all-Google strategy could not complete the mandate");
  assert.equal((s.day-1)%30,0,"all-Google portfolio exited outside a monthly gate");
  assert(Array.from(s.months).every(month=>month.conditions.resilience));
  assert(Array.from(s.dailyLedger).every(row=>Object.keys(row.byPlatform).every(family=>family==="Google")));
  assert(Array.from(s.dailyLedger).some(row=>(row.byPlatform.Google||0)>0));
}

// A paused account cannot be re-enabled when its retained allocation would breach the shared cap.
{
  const {context}=makeContext("?mode=5&seed=81");
  vm.runInContext('const q=S.accounts.find(a=>a.id==="quasar"),c=S.accounts.find(a=>a.id==="cloudbadger");q.paused=true;c.budget+=q.budget;NightmareEngine.handleAction({dataset:{night:"pause",id:"quasar"}})',context);
  assert.equal(state(context).accounts.find(a=>a.id==="quasar").paused,true);
  assert(value(context,"S.accounts.filter(a=>!a.paused).reduce((n,a)=>n+a.budget,0)<=DAILY"));
}

// A paused Mode 5 initiative cannot hide an unresumable budget increase off the active-allocation ledger.
{
  const {context}=makeContext("?mode=5&seed=86");
  vm.runInContext('S.accounts.find(a=>a.id==="quasar").paused=true',context);
  for(let i=0;i<100;i++)vm.runInContext('NightmareEngine.handleAction({dataset:{night:"budget-plus",id:"quasar"}})',context);
  const before=state(context).accounts.find(a=>a.id==="quasar").budget;
  assert(value(context,'S.accounts.filter(a=>!a.paused).reduce((n,a)=>n+a.budget,0)+S.accounts.find(a=>a.id==="quasar").budget<=DAILY'));
  vm.runInContext('NightmareEngine.handleAction({dataset:{night:"budget-plus",id:"quasar"}})',context);
  assert.equal(state(context).accounts.find(a=>a.id==="quasar").budget,before);
}

// Mode 5 flavor/render operations are cosmetic and cannot consume keyed portfolio luck.
{
  const a=makeContext("?mode=5&seed=83&flavor=jrpg"),b=makeContext("?mode=5&seed=83&flavor=jrpg");
  vm.runInContext("runDay()",a.context);vm.runInContext("runDay()",b.context);
  const before=value(a.context,"JSON.stringify(S)");
  a.registry.flavorSelect.listeners.change[0]({target:{value:"dnd"}});
  assert.equal(value(a.context,"JSON.stringify(S)"),before);
  vm.runInContext("render();briefing();close();render();runDay()",a.context);
  vm.runInContext("runDay()",b.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),value(b.context,"JSON.stringify(S)"));
}

// Gate snapshots are immutable 30-day periods and any post-exit run is a strict no-op.
{
  const {context}=makeContext("?mode=5&days=90&budget=150000&seed=89");
  runToEnd(context);
  const s=state(context);
  assert(Array.from(s.months).every((month,index)=>month.throughDay===(index+1)*30));
  assert.equal(new Set(Array.from(s.months,month=>month.throughDay)).size,s.months.length);
  const final=value(context,"JSON.stringify(S)");
  assert.equal(value(context,"runDay()"),false);
  assert.equal(value(context,"JSON.stringify(S)"),final,"post-exit run mutated the ledger");
}

// A teachable policy beats the hard mode: audit, build resilience, rotate fatigue, work search, and reallocate marginal budget.
{
  const {context}=makeContext("?mode=5&days=90&budget=150000&seed=97");
  const s=runNightmarePolicy(context);
  assert.equal(s.outcome,"portfolio-exit");
  assert.equal(s.months.length,3);
  assert(s.months.every(month=>month.pass));
  assert.equal(s.gateStreak,3);
  assert.equal(s.finance.failedPayments,0);
  assert.equal((s.day-1)%30,0,"managed portfolio exited outside a monthly gate");
}

// Mode 5 economics scale across the player's full authorized budget range, not only the default.
for(const budget of [25000,500000]){
  const {context}=makeContext(`?mode=5&days=90&budget=${budget}&seed=97`),s=runNightmarePolicy(context);
  assert.equal(value(context,"DAILY"),budget);
  assert.equal(s.outcome,"portfolio-exit",`managed policy could not clear the dynamic ${budget} authorization`);
  assert(s.months.every(month=>month.pass));
  assert.deepEqual(Array.from(value(context,"NightmareEngine.validate()")),[]);
}

// The under-UI ambient field is accessible, state-aware, event-reactive, and simulation-neutral.
{
  const ambientSource=appSources.find(({file})=>file==="js/ambient-background.js").source;
  function ambientWebGlFixture({search="?mode=1&seed=73",reducedMotion=false,webgl="ok"}={}){
    const fixture=makeContext(search,{accessGranted:false,reducedMotion}),calls=[],uniforms={},frames=new Map();let nextFrame=1;
    const gl={
      VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
      ARRAY_BUFFER:34962,STATIC_DRAW:35044,FLOAT:5126,DEPTH_TEST:2929,CULL_FACE:2884,TRIANGLES:4,
      createShader:type=>({type}),shaderSource(shader,source){shader.source=source;},compileShader(shader){shader.compiled=true;},
      getShaderParameter:()=>true,deleteShader(){calls.push("deleteShader");},createProgram:()=>({}),
      attachShader(){},linkProgram(program){program.linked=true;},getProgramParameter:()=>true,
      useProgram(){calls.push("useProgram");},createBuffer:()=>({}),bindBuffer(){},
      bufferData(_target,data){calls.push(["bufferData",data.length]);},getAttribLocation:()=>0,
      enableVertexAttribArray(){},vertexAttribPointer(){},getUniformLocation(_program,name){return name;},
      disable(){},clearColor(){},viewport(_x,_y,width,height){calls.push(["viewport",width,height]);},
      uniform1f(name,value){uniforms[name]=value;},uniform2f(name,a,b){uniforms[name]=[a,b];},
      uniform3f(name,a,b,c){uniforms[name]=[a,b,c];},drawArrays(_mode,_first,count){calls.push(["drawArrays",count]);},
      deleteBuffer(){calls.push("deleteBuffer");},deleteProgram(){calls.push("deleteProgram");}
    };
    fixture.registry.ambientCanvas.getContext=kind=>{
      calls.push(["getContext",kind]);if(webgl==="throw")throw new Error("synthetic WebGL denial");
      return webgl==="none"?null:gl;
    };
    fixture.context.innerWidth=1280;fixture.context.innerHeight=720;fixture.context.devicePixelRatio=1;
    fixture.context.requestAnimationFrame=callback=>{const id=nextFrame++;frames.set(id,callback);return id;};
    fixture.context.cancelAnimationFrame=id=>{frames.delete(id);};
    const flushFrame=(now=100)=>{const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);return pending.length;};
    vm.runInContext('window.__unlocked("general")',fixture.context);
    return {...fixture,gl,calls,uniforms,frames,flushFrame};
  }
  assert(html.indexOf('id="ambientCanvas"')>=0&&html.indexOf('id="ambientCanvas"')<html.indexOf('class="wrap"'),
    "ambient canvas is not mounted beneath the foreground UI");
  assert.match(html,/<canvas id="ambientCanvas" aria-hidden="true"><\/canvas>/);
  assert.match(css,/#ambientCanvas\{position:fixed;inset:0;z-index:0;[^}]*pointer-events:none/);
  assert.match(css,/\.wrap\{position:relative;z-index:1/);
  assert.doesNotMatch(ambientSource,/\b(?:Math\.random|keyedRandom|stateRoll|eventRnd|creativeRnd)\b/,
    "ambient field consumed or referenced gameplay randomness");
  assert.doesNotMatch(ambientSource,/Spotify|open\.spotify|iframe|access[_-]?token|getUserMedia|getDisplayMedia|captureStream/i,
    "ambient field attempts to inspect protected or cross-origin media");
  for(const uniform of ["u_audio_bass","u_roas_color","u_mouse","u_stress","u_glitch"]){
    if(uniform==="u_audio_bass")assert.match(ambientSource,/uniform vec2 u_audio;/);
    else assert(ambientSource.includes(uniform),`ambient shader is missing ${uniform}`);
  }
  assert.match(ambientSource,/getContext\("webgl"/);assert.match(ambientSource,/powerPreference:"low-power"/);
  assert.match(ambientSource,/now-lastFrame<32/);assert.match(ambientSource,/prefers-reduced-motion: reduce/);
  assert.match(ambientSource,/#ifdef GL_FRAGMENT_PRECISION_HIGH/);
  assert.match(ambientSource,/precision highp float;/);assert.match(ambientSource,/precision mediump float;/);
  assert.match(ambientSource,/p=mod\(p,71\.0\)/,"ambient shader hash inputs are not bounded for long sessions");
  assert.doesNotMatch(ambientSource,/uniform float u_time|u_time\s*\*/,"ambient shader still multiplies a discontinuously wrapped global clock");
  assert.match(ambientSource,/phaseA\[0\]=\(phaseA\[0\]\+delta\*\.21\)%tau/,"ambient phase is not integrated smoothly");
  assert.match(ambientSource,/flow\[0\]=\(flow\[0\]\+delta\*\(\.25\+state\.activity\*\.52\)\)%1/,
    "ambient grid translation does not wrap on an exact cell boundary");
  assert.match(ambientSource,/sin\(fract\(gridUv\.y\)\*6\.2831853\+u_phase_b\.y\)/,
    "ambient grid warp is not periodic across the one-cell flow wrap");
  assert.match(ambientSource,/sin\(fract\(gridUv\.y\+gridUv\.x\*\.13\)\*6\.2831853\)/,
    "ambient data stream is not periodic across the one-cell flow wrap");
  assert.match(ambientSource,/Math\.floor\(now\*\.017\)%67/,"ambient glitch clock is not bounded");
  assert.match(css,/@media \(forced-colors:active\)[\s\S]*#ambientCanvas\{display:none!important\}/);

  const live=ambientWebGlFixture();
  let snap=JSON.parse(value(live.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.equal(snap.engine,"webgl");assert.equal(snap.staticOnly,false);assert.equal(live.frames.size,1);
  assert(live.calls.some(call=>Array.isArray(call)&&call[0]==="getContext"&&call[1]==="webgl"));
  vm.runInContext("AmbientBackground.sync()",live.context);snap=JSON.parse(value(live.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.deepEqual(snap.state,{performance:0,stress:.03,activity:.08},"menu attract state competed with the opening choice");
  vm.runInContext("close();S.spendTotal=100;S.earnedRevenue=250;S.slots[0].fatigue=94;render();AmbientBackground.setAccent('#84CC16');fireFx('success',{}, {silent:true})",live.context);
  snap=JSON.parse(value(live.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.equal(snap.state.performance,1);assert(snap.state.stress>.75);assert.equal(snap.tone,1);assert(snap.pulse>.9);
  assert.deepEqual(snap.accent.map(value=>Math.round(value*255)),[132,204,22]);
  assert(live.flushFrame(100)>=1);assert(live.calls.some(call=>Array.isArray(call)&&call[0]==="drawArrays"&&call[1]===6));
  assert.deepEqual(live.uniforms.u_resolution,[1280,720]);
  assert(Array.isArray(live.uniforms.u_phase_a)&&live.uniforms.u_phase_a.every(value=>value>=0&&value<Math.PI*2));
  assert(Array.isArray(live.uniforms.u_flow)&&live.uniforms.u_flow[0]>=0&&live.uniforms.u_flow[0]<1);
  assert(Array.isArray(live.uniforms.u_roas_color)&&live.uniforms.u_roas_color.length===3);

  vm.runInContext("AmbientBackground.noteAudioCue('jackpot',1)",live.context);
  assert(value(live.context,"AmbientBackground.snapshot().audio.bass")>.9);
  vm.runInContext("AmbientBackground.setEnabled(false)",live.context);
  assert.equal(live.frames.size,0,"disabling the ambient field left a WebGL frame queued");
  snap=JSON.parse(value(live.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.deepEqual({audio:snap.audio,pulse:snap.pulse,tone:snap.tone,glitch:snap.glitch},
    {audio:{bass:0,treble:0},pulse:0,tone:0,glitch:0},"disabling ambient retained stale reactive energy");
  vm.runInContext("AmbientBackground.noteAudioCue('jackpot',1);AmbientBackground.trigger('burnout')",live.context);
  snap=JSON.parse(value(live.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.deepEqual({audio:snap.audio,pulse:snap.pulse,tone:snap.tone,glitch:snap.glitch},
    {audio:{bass:0,treble:0},pulse:0,tone:0,glitch:0},"disabled ambient accumulated hidden feedback");
  vm.runInContext("AmbientBackground.setEnabled(true)",live.context);assert.equal(live.frames.size,1);

  const reducedCapable=ambientWebGlFixture({reducedMotion:true});
  assert.equal(value(reducedCapable.context,"AmbientBackground.snapshot().engine"),"static");
  assert.equal(reducedCapable.registry.ambientCanvas.dataset.reason,"motion-preference");
  assert.equal(reducedCapable.calls.some(call=>Array.isArray(call)&&call[0]==="getContext"),false,
    "reduced motion still requested a WebGL context");
  assert.equal(reducedCapable.frames.size,0,"reduced motion started a continuous animation loop");
  vm.runInContext("AmbientBackground.noteAudioCue('jackpot',1);AmbientBackground.trigger('burnout')",reducedCapable.context);
  snap=JSON.parse(value(reducedCapable.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.deepEqual({audio:snap.audio,pulse:snap.pulse,tone:snap.tone,glitch:snap.glitch},
    {audio:{bass:0,treble:0},pulse:0,tone:0,glitch:0},"static ambient accumulated motion/audio feedback");

  for(const webgl of ["none","throw"]){
    const fallback=ambientWebGlFixture({webgl});
    assert.equal(value(fallback.context,"AmbientBackground.snapshot().engine"),"static",`${webgl} WebGL did not fail to the static field`);
    assert.equal(fallback.registry.ambientCanvas.dataset.reason,"webgl-unavailable");assert.equal(fallback.frames.size,0);
  }

  const modern=makeContext("?mode=1&seed=73");
  snap=JSON.parse(value(modern.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.equal(snap.initialized,true);assert.equal(snap.engine,"static");assert.equal(snap.staticOnly,true);
  assert(modern.registry.ambientBtn.listeners.click?.length===1);assert.equal(modern.registry.ambientBtn.getAttribute("aria-pressed"),"true");
  const simulationBefore=value(modern.context,"JSON.stringify(S)");
  vm.runInContext("close();S.spendTotal=100;S.earnedRevenue=250;S.slots[0].fatigue=94;render()",modern.context);
  snap=JSON.parse(value(modern.context,"JSON.stringify(AmbientBackground.snapshot())"));
  assert.equal(snap.state.performance,1);assert(snap.state.stress>.75);
  assert.deepEqual({audio:snap.audio,pulse:snap.pulse,tone:snap.tone,glitch:snap.glitch},
    {audio:{bass:0,treble:0},pulse:0,tone:0,glitch:0});
  assert.notEqual(value(modern.context,"JSON.stringify(S)"),simulationBefore,"test fixture failed to establish an ambient state scenario");
  const afterScenario=value(modern.context,"JSON.stringify(S)");
  vm.runInContext("render();AmbientBackground.setEnabled(false);AmbientBackground.setEnabled(true)",modern.context);
  assert.equal(value(modern.context,"JSON.stringify(S)"),afterScenario,"ambient controls mutated simulation state");

  const noMotionApi=makeContext("?mode=1&seed=73",{reducedMotion:false});
  assert.equal(value(noMotionApi.context,"AmbientBackground.snapshot().engine"),"static",
    "missing animation/WebGL APIs did not fail to a static field");
  const storedOff=new Map([["media-buying-trainer-ambient-v1","off"]]);
  const off=makeContext("?mode=1&seed=73",{localStore:storedOff});
  assert.equal(value(off.context,"AmbientBackground.snapshot().engine"),"disabled");assert.equal(off.registry.ambientBtn.getAttribute("aria-pressed"),"false");
  vm.runInContext("AmbientBackground.setEnabled(true);AmbientBackground.setEnabled(false)",off.context);
  assert.equal(storedOff.get("media-buying-trainer-ambient-v1"),"off");

  for(const [mode,setup,minimumStress] of [
    [0,"S.spendTotal=100;S.valueTotal=220;S.client.trustParts=Object.fromEntries(Object.keys(S.client.trustParts).map(key=>[key,18]))",.8],
    [5,"S.spendTotal=100;S.billedTotal=80;S.opsCost=0;S.modeledRevenue=112;S.crises=[{id:'risk'}]",.3],
    [6,"S.cumulativeCosts=100;S.cumulativeProfit=50;S.clients[0].incident={...AGENCY_INCIDENTS[0],openedDay:S.day}",.3]
  ]){
    const fixture=makeContext(`?mode=${mode}&seed=73`);vm.runInContext(`close();${setup};render()`,fixture.context);
    const sample=JSON.parse(value(fixture.context,"JSON.stringify(AmbientBackground.snapshot().state)"));
    for(const metric of ["performance","stress","activity"])assert(Number.isFinite(sample[metric])&&sample[metric]>=-1&&sample[metric]<=1,`mode ${mode} ambient ${metric} escaped its normalized range`);
    assert(sample.performance>.95,`mode ${mode} profitable state did not reach its positive palette`);
    assert(sample.stress>=minimumStress,`mode ${mode} risk did not reach the ambient stress channel`);
  }
  const nightmareAllIn=makeContext("?mode=5&seed=7302");
  vm.runInContext("close();S.spendTotal=100;S.modeledRevenue=120;S.billedTotal=125;S.opsCost=20;S.crises=[];AmbientBackground.sync()",nightmareAllIn.context);
  assert(value(nightmareAllIn.context,"S.modeledRevenue/S.spendTotal")>1,"Nightmare regression fixture lacks a positive media-only MER");
  assert(value(nightmareAllIn.context,"AmbientBackground.snapshot().state.performance")<0,
    "Mode 5 ambient performance ignored negative all-in contribution behind a positive media-only MER");
  const classicQuality=makeContext("?mode=0&stage=3&seed=73");
  vm.runInContext("close();S.client.trust=90;S.client.tension=0;S.groups.forEach((group,index)=>{group.qs=9;group.paused=index>0;group.trackingBroken=false;group.last=null;});AmbientBackground.sync()",classicQuality.context);
  const calmClassic=JSON.parse(value(classicQuality.context,"JSON.stringify(AmbientBackground.snapshot().state)"));
  vm.runInContext("S.groups[0].qs=2;AmbientBackground.sync()",classicQuality.context);
  const weakClassic=JSON.parse(value(classicQuality.context,"JSON.stringify(AmbientBackground.snapshot().state)"));
  assert(weakClassic.stress>calmClassic.stress+.7,"Classic Quality Score did not drive ambient risk");
  assert(calmClassic.activity<.3,"Classic paused ad groups did not reduce ambient activity");

  function agencyAmbientSample(extra=""){
    const fixture=makeContext("?mode=6&seed=7301");
    vm.runInContext(`close();S.cash=S.creditLimit*3;S.payrollMisses=0;S.focusRemaining=S.focusTotal;
      S.clients.forEach(client=>{client.incident=null;client.serviceDebt=0;client.trust=90;client.health=90;});${extra};AmbientBackground.sync()`,fixture.context);
    return JSON.parse(value(fixture.context,"JSON.stringify(AmbientBackground.snapshot().state)"));
  }
  const agencyCalm=agencyAmbientSample();
  const agencyCreditBuffer=agencyAmbientSample("S.cash=-47500;S.creditLimit=500000");
  const agencyCreditTight=agencyAmbientSample("S.cash=-47500;S.creditLimit=50000");
  const agencyPayroll=agencyAmbientSample("S.payrollMisses=1");
  const agencyCapacity=agencyAmbientSample(`const template=S.clients[0];S.staff={buyer:0,account:0,analyst:0,creative:0};
    S.clients=Array.from({length:30},(_,index)=>({...template,id:'load-'+index,name:'Load '+index,status:'active',incident:null,serviceDebt:0,trust:90,health:90}));`);
  assert(agencyCreditTight.stress>agencyCreditBuffer.stress+.5,"Agency available credit did not change ambient liquidity stress");
  assert(agencyPayroll.stress>agencyCalm.stress+.4,"Agency payroll risk did not reach ambient stress");
  assert(agencyCapacity.stress>agencyCalm.stress+.4,"Agency capacity overload did not reach ambient stress");

  const rngActive=ambientWebGlFixture({search:"?mode=1&seed=731"}),rngControl=makeContext("?mode=1&seed=731");
  const activeBefore=value(rngActive.context,"JSON.stringify(S)"),activeRngBefore=value(rngActive.context,"JSON.stringify(S.rng)");
  vm.runInContext("AmbientBackground.setAccent('#06B6D4');fireFx('review',{name:'test'},{silent:true})",rngActive.context);rngActive.flushFrame(200);
  assert.equal(value(rngActive.context,"JSON.stringify(S)"),activeBefore,"active WebGL ambience mutated simulation state");
  assert.equal(value(rngActive.context,"JSON.stringify(S.rng)"),activeRngBefore,"active WebGL ambience consumed simulation luck");
  vm.runInContext("runDay()",rngActive.context);vm.runInContext("runDay()",rngControl.context);
  assert.equal(value(rngActive.context,"JSON.stringify(S)"),value(rngControl.context,"JSON.stringify(S)"),
    "active WebGL ambience changed the seeded run");
  vm.runInContext("AmbientBackground.destroy()",rngActive.context);assert.equal(rngActive.frames.size,0);
}

// The lunar soundscape stays optional, uses semantic hierarchy rather than universal clicks, and is RNG-neutral.
{
  const expectedCueIds=[
    "nav","open","close","confirm","day","settle","save","profit","creative","swap","correct","wrong",
    "warning","crisis","epic","legendary","victory","failure"
  ];
  const stored=new Map([["media-buying-trainer-sfx-v1","on"],["media-buying-trainer-sfx-volume-v1","0.25"]]);
  const mixer=makeContext("?mode=1&seed=73",{localStore:stored});
  const definitions=JSON.parse(value(mixer.context,"JSON.stringify(SFX_DEFS)"));
  assert.deepEqual(definitions.map(cue=>cue.id),expectedCueIds,"lunar cue roles changed without updating their contract");
  assert.equal(new Set(definitions.map(cue=>cue.id)).size,definitions.length,"lunar cue IDs are not unique");
  for(const cue of definitions){
    assert(Array.isArray(cue.files)&&cue.files.length,`${cue.id} has no files[] variants`);
    assert.equal(typeof cue.channel,"string",`${cue.id} has no playback channel`);
    assert(Number.isFinite(cue.priority),`${cue.id} has no numeric priority`);
    assert(Number.isFinite(cue.cooldown)&&cue.cooldown>=0,`${cue.id} has no valid cooldown`);
    assert(Number.isFinite(cue.gain)&&cue.gain>0&&cue.gain<=1,`${cue.id} has no safe default gain`);
  }
  const cueFiles=definitions.flatMap(cue=>cue.files);
  assert.equal(cueFiles.length,23,"the lunar suite no longer exposes its 23 authored variants");
  assert.equal(new Set(cueFiles).size,cueFiles.length,"two lunar cue roles unexpectedly share one asset");
  const victorySource="assets/audio/lunar_victory_cash.ogg?v=35";
  assert.deepEqual(definitions.find(cue=>cue.id==="victory").files,[victorySource],
    "victory lost its cache-busted lunar bloom and cash-register composite");
  assert.deepEqual(JSON.parse(value(mixer.context,"JSON.stringify(SFX_VARIANTS)")),
    Object.fromEntries(definitions.map(cue=>[cue.id,cue.files])),"playback variants drifted from the content manifest");
  assert.deepEqual(JSON.parse(value(mixer.context,"JSON.stringify(SFX_FILES)")),
    Object.fromEntries(definitions.map(cue=>[cue.id,cue.files[0]])),"preload sources drifted from the content manifest");
  const legacyFiles=new Set(["select_004.ogg","day_tally_fast.ogg","money_settle_coin.ogg","money_profit_register.ogg",
    "money_jackpot_register.ogg","lunar_victory.ogg","drop_004.ogg","error_003.ogg","scratch_004.ogg"]);
  for(const filePath of cueFiles){
    const file=filePath.split("/").pop();
    assert(!legacyFiles.has(file),`${file} brought a legacy beep/register cue back into the active suite`);
    const sound=fs.readFileSync(new URL(`../${filePath}`,import.meta.url));
    assert(sound.length>1000,`${file} is missing or empty`);
    assert.equal(sound.subarray(0,4).toString(),"OggS",`${file} is not an Ogg audio asset`);
  }
  const lunarGenerator=fs.readFileSync(new URL("scripts/generate_lunar_sfx.py",root),"utf8");
  const assetCredits=fs.readFileSync(new URL("ASSET_CREDITS.md",root),"utf8");
  assert.match(lunarGenerator,/def cash_accent\s*\(/,"the original lunar generator has no cash-accent voice");
  assert.match(lunarGenerator,/elif name == "lunar_victory_cash"[\s\S]*?sound\.cash_accent\s*\(/,
    "the victory composite does not call its authored cash accent");
  assert.match(lunarGenerator,/register_source\s*=\s*ROOT\s*\/\s*"assets"\s*\/\s*"audio"\s*\/\s*"money_jackpot_register\.ogg"/,
    "the victory generator does not load the credited physical cash-register source");
  assert.match(lunarGenerator,/\[1:a\][\s\S]*?adelay=[^;]+[\s\S]*?\[bloom\]\[register\]amix=/,
    "the credited register recording is not delayed and mixed over the lunar victory bed");
  assert.match(lunarGenerator,/cash_register=name\s*==\s*"lunar_victory_cash"/,
    "the credited register recording is not restricted to the victory composite");
  assert.match(assetCredits,/victory cue[\s\S]*physical register drawer[\s\S]*money_jackpot_register\.ogg/i,
    "asset credits do not disclose the physical register recording and its source in the victory composite");
  assert.match(assetCredits,/money_jackpot_register\.ogg[^\n]*baked into the single active victory composite/i,
    "asset credits do not distinguish a baked composite from a second runtime cue");
  const victoryAsset=fs.readFileSync(new URL("assets/audio/lunar_victory_cash.ogg",root));
  assert.notEqual(createHash("sha256").update(victoryAsset).digest("hex"),
    "babfdadd5ca26d140809ab69c800286585f2c1e8dc3bb3c0e58d796acf376181",
    "the manifest points to the old victory file whose procedural accent was buried under the bloom");
  assert.equal(value(mixer.context,"sfxEnabled"),true);assert.equal(value(mixer.context,"sfxVolume"),.25);
  assert.equal(mixer.registry.sfxBtn.textContent,"Sound effects on");assert.equal(mixer.registry.sfxVolumeLabel.textContent,"25%");
  assert.doesNotMatch(html,/id=["']sfxCues["']/,"the internal sound-effect library is visible in the interface");
  vm.runInContext('playSfx("profit",1)',mixer.context);
  assert(definitions.find(cue=>cue.id==="profit").files.includes(mixer.audioPlays.at(-1).src));
  approx(mixer.audioPlays.at(-1).volume,.25,1e-12);
  assert.equal(value(mixer.context,"AmbientBackground.snapshot().audio.bass"),0,
    "static/reduced-motion ambience accumulated a hidden local-SFX envelope");
  const eventMap=JSON.parse(value(mixer.context,"JSON.stringify(SFX_EVENT_CUE)"));
  for(const [event,cue] of Object.entries(eventMap))assert(expectedCueIds.includes(cue),`${event} maps to missing cue ${cue}`);
  for(const [event,cue] of Object.entries({day:"day",profit:"profit",creative:"creative",swap:"swap",quizCorrect:"correct",
    quizWrong:"wrong",save:"save",settlement:"settle",success:"victory",jackpot:"legendary",failure:"failure",error:"warning"}))
    assert.equal(eventMap[event],cue,`${event} lost its distinct semantic sound role`);
  assert.equal(value(mixer.context,'canonicalSfx("success")'),"victory");
  const victoryOnly=makeContext("?mode=1&seed=730",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])});
  const victoryStateBefore=value(victoryOnly.context,"JSON.stringify(S)"),victoryRngBefore=value(victoryOnly.context,"JSON.stringify(S.rng)");
  vm.runInContext('fireFx("success",{value:"ACCOUNT CLEARED"})',victoryOnly.context);
  assert.deepEqual(victoryOnly.audioPlays.map(play=>play.src),[victorySource],
    "victory should remain one semantic cue with its cash accent baked into the lunar bloom");
  assert.equal(value(victoryOnly.context,"JSON.stringify(S)"),victoryStateBefore,"victory audio mutated simulation state");
  assert.equal(value(victoryOnly.context,"JSON.stringify(S.rng)"),victoryRngBefore,"victory audio consumed simulation luck");
  const nonVictory=makeContext("?mode=1&seed=7301"),nonVictoryStateBefore=value(nonVictory.context,"JSON.stringify(S)"),
    nonVictoryRngBefore=value(nonVictory.context,"JSON.stringify(S.rng)");
  const ordinaryCueIds=expectedCueIds.filter(id=>id!=="victory");
  vm.runInContext(`${JSON.stringify(ordinaryCueIds)}.forEach(cue=>playSfx(cue,undefined,{force:true}))`,nonVictory.context);
  assert.equal(nonVictory.audioPlays.length,ordinaryCueIds.length,"an ordinary semantic cue did not produce exactly one authored playback");
  assert(nonVictory.audioPlays.every(play=>play.src!==victorySource),
    "an ordinary semantic cue played the cash-register victory composite");
  assert.equal(value(nonVictory.context,"JSON.stringify(S)"),nonVictoryStateBefore,"ordinary semantic audio mutated simulation state");
  assert.equal(value(nonVictory.context,"JSON.stringify(S.rng)"),nonVictoryRngBefore,"ordinary semantic audio consumed simulation luck");

  const victoryPathFixtures=[
    {
      label:"Search Desk",
      fixture:makeContext("?mode=0&stage=1&days=7&seed=7302",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])}),
      prepare:'S.convReported=1e6;S.client.trust=100',
      trigger:"classicDebrief()"
    },
    {
      label:"account challenge",
      fixture:makeContext("?mode=1&days=4&seed=7303",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])}),
      prepare:"S.spendTotal=100;S.earnedRevenue=1000",
      trigger:"debrief()"
    },
    {
      label:"Portfolio Command",
      fixture:makeContext("?mode=5&days=90&seed=7304",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])}),
      prepare:'S.ended=true;S.outcome="portfolio-exit"',
      trigger:"NightmareEngine.debrief()"
    }
  ];
  for(const path of victoryPathFixtures){
    vm.runInContext(path.prepare,path.fixture.context);path.fixture.audioPlays.length=0;
    const rngBefore=value(path.fixture.context,"JSON.stringify(S.rng)");
    vm.runInContext(path.trigger,path.fixture.context);
    assert.deepEqual(path.fixture.audioPlays.map(play=>play.src),[victorySource],
      `${path.label} victory did not trigger exactly one cash-register bloom composite`);
    assert.equal(value(path.fixture.context,"JSON.stringify(S.rng)"),rngBefore,`${path.label} victory feedback consumed simulation luck`);
  }
  const careerVictory=makeContext("?mode=6&budget=250000&seed=7305",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])});
  careerVictory.audioPlays.length=0;
  vm.runInContext(`S.month=119;S.day=2400;S.dayInMonth=20;S.cumulativeProfit=13000000;S.peakProfit=13000000;
    S.cumulativeRevenue=14000000;S.cumulativeCosts=1000000;S.cash=1000000;S.clients=[];AgencyCareer.runDay({force:true})`,careerVictory.context);
  assert.deepEqual(careerVictory.audioPlays.map(play=>play.src),[victorySource],
    "Agency Career victory did not trigger exactly one cash-register bloom composite");
  assert.equal(value(mixer.context,"DAY_RESULT_FX_DELAY"),definitions.find(cue=>cue.id==="day").resultDelay,
    "result timing drifted from the authored day-launch tail");
  vm.runInContext("setSfxVolume(.63)",mixer.context);
  assert.equal(stored.get("media-buying-trainer-sfx-volume-v1"),"0.63");assert.equal(mixer.registry.sfxVolumeLabel.textContent,"63%");
  assert.equal(value(mixer.context,"setAudioPanel(true)"),true);assert.equal(mixer.registry.audioPanel.hidden,false);
  assert.equal(mixer.registry.audioBtn.getAttribute("aria-expanded"),"true");
  assert.equal(value(mixer.context,"setAudioPanel(false)"),false);assert.equal(mixer.registry.audioPanel.hidden,true);
  const noAudio=makeContext("?mode=1&seed=73",{audio:false});
  assert.equal(value(noAudio.context,'playSfx("profit",1)'),false,"no-Audio environment did not fail closed");
  const rejected=makeContext("?mode=1&seed=73",{audioReject:true,localStore:new Map([["media-buying-trainer-sfx-v1","on"]])});
  vm.runInContext('playSfx("profit",1)',rejected.context);await Promise.resolve();
  assert.equal(value(rejected.context,"Object.keys(activeSfx).length"),0,"rejected audio left a stale active cue");

  function soundGesture(fixture,button){
    const event={target:button,pointerId:7,timeStamp:100,defaultPrevented:false,
      preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
    for(const item of fixture.documentListeners.pointerdown||[])item.handler(event);
    for(const item of fixture.documentListeners.click||[])item.handler(event);
  }
  function testButton(id,className="",sfx){
    const fixture=makeContext("?mode=1&seed=733",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])});
    const button=new FakeElement(id,fixture.registry);button.tagName="button";button.classList.reset(className);fixture.registry[id]=button;
    if(sfx!==undefined)button.setAttribute("data-sfx",sfx);
    fixture.audioPlays.length=0;soundGesture(fixture,button);return {fixture,button};
  }
  const generic=testButton("ordinaryControl");
  assert.equal(generic.fixture.audioPlays.length,0,"an ordinary button still emits the old universal click sound");
  assert.equal(value(generic.fixture.context,'semanticButtonCue(document.getElementById("ordinaryControl"))'),"",
    "an ordinary button was assigned an implicit cue");
  const explicit=testButton("explicitConfirm","","confirm");
  assert.equal(explicit.fixture.audioPlays.length,1,"one explicit semantic gesture did not emit exactly one cue");
  assert(definitions.find(cue=>cue.id==="confirm").files.includes(explicit.fixture.audioPlays[0].src));
  const hierarchy=testButton("wizardBack","wizard-back");
  const hierarchyCue=value(hierarchy.fixture.context,'semanticButtonCue(document.getElementById("wizardBack"))');
  assert(expectedCueIds.includes(hierarchyCue),"a built-in wizard hierarchy control has no semantic cue");
  assert.equal(hierarchy.fixture.audioPlays.length,1,"pointerdown plus click doubled a built-in hierarchy cue");
  const suppressed=testButton("launchRun","wizard-primary","none");
  assert.equal(suppressed.fixture.audioPlays.length,0,'data-sfx="none" did not suppress a built-in hierarchy cue');

  function navVariantSequence(seed){
    const fixture=makeContext(`?mode=1&seed=${seed}`),before=value(fixture.context,"JSON.stringify(S.rng)");
    vm.runInContext('playSfx("nav",undefined,{force:true});playSfx("nav",undefined,{force:true});playSfx("nav",undefined,{force:true});playSfx("nav",undefined,{force:true})',fixture.context);
    assert.equal(value(fixture.context,"JSON.stringify(S.rng)"),before,"cosmetic variant selection consumed simulation RNG");
    return fixture.audioPlays.map(play=>play.src);
  }
  const navFiles=definitions.find(cue=>cue.id==="nav").files,variantsA=navVariantSequence(733),variantsB=navVariantSequence(9981);
  assert.deepEqual(variantsA,[...navFiles,navFiles[0]],"nav variants do not cycle in authored order");
  assert.deepEqual(variantsB,variantsA,"the lunar variant sequence depends on the gameplay seed");
  const cooldown=makeContext("?mode=1&seed=733",{localStore:new Map([["media-buying-trainer-sfx-v1","on"]])});
  assert.deepEqual(JSON.parse(value(cooldown.context,'JSON.stringify([playSfx("nav"),playSfx("nav")])')),[true,false],
    "the navigation cooldown no longer suppresses rapid repetition");
  assert.equal(cooldown.audioPlays.length,1,"a suppressed navigation repeat still reached Audio.play");
  vm.runInContext('playSfx("open",undefined,{force:true});playSfx("confirm",undefined,{force:true})',cooldown.context);
  assert.equal(value(cooldown.context,"Boolean(activeSfx.open)"),false,"the UI channel left its previous panel cue playing");
  assert.equal(value(cooldown.context,'activeSfxChannels.ui.cue'),"confirm","the UI channel did not yield to the latest semantic cue");
  vm.runInContext('playSfx("crisis",undefined,{force:true})',cooldown.context);const protectedCount=cooldown.audioPlays.length;
  assert.equal(value(cooldown.context,'playSfx("close")'),false,"minor UI audio interrupted a protected crisis cue");
  assert.equal(cooldown.audioPlays.length,protectedCount,"a suppressed UI cue still reached Audio.play during a crisis");

  const a=makeContext("?mode=1&seed=73"), b=makeContext("?mode=1&seed=73");
  assert.equal(value(a.context,"sfxEnabled"),false);vm.runInContext("setSfx(true,false);setSfxVolume(.47)",a.context);
  assert.equal(value(a.context,"sfxEnabled"),true);assert.equal(a.registry.sfxBtn.textContent,"Sound effects on");
  assert.equal(value(a.context,'fxCopy("review",{}).value'),"DELIVERY HOLD");
  assert.equal(value(a.context,'fxCopy("legendary",{name:"Unicorn"}).value'),"Unicorn");
  const rngBefore=value(a.context,"JSON.stringify(S.rng)");
  vm.runInContext('playSfx("nav");playSfx("day");playSfx("settle");playSfx("profit");playSfx("legendary");playSfx("creative");playSfx("warning");playSfx("failure");fireFx("jackpot",{profit:5000,roas:5.4})',a.context);
  assert.equal(value(a.context,"JSON.stringify(S.rng)"),rngBefore,"audio consumed seeded simulation state");
  vm.runInContext("runDay()",a.context);
  vm.runInContext("runDay()",b.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),value(b.context,"JSON.stringify(S)"),"audio changed the seeded run");
}

// Media Buyer Radio uses a strict playlist allowlist, launches a persistent popout, and is RNG-neutral.
{
  const radioDataSource=appSources.find(({file})=>file==="js/radio-data.js").source;
  const radioSource=appSources.find(({file})=>file==="js/radio.js").source;
  const popoutHtml=fs.readFileSync(new URL("radio.html",root),"utf8");
  const popoutSource=fs.readFileSync(new URL("js/radio-popout.js",root),"utf8");
  const popoutCss=fs.readFileSync(new URL("assets/styles/radio-popout.css",root),"utf8");
  const localStore=new Map(),first=makeContext("?mode=1&seed=73",{localStore});
  const expected=JSON.parse(value(first.context,"JSON.stringify(RADIO_STATIONS)"));
  assert.equal(expected.length,12,"radio matrix must expose exactly 12 stations");
  const matrixContract=new Map([
    ["psych-pop",["37i9dQZF1DX8gDIpdqp1XJ","Modern Psychedelia","Kaleidoscopic Warm-Up","#FF6B9D"]],
    ["synthwave",["37i9dQZF1DXdLEN7aqioXM","Synthwave Essentials","Cyberpunk Mainframe Hacking","#FF007F"]],
    ["deep-house",["1GfH39JcID8aFZ0ZQQVkBk","Anjunadeep Edition","Subconscious Hypnotic Drift","#0B192C"]],
    ["trance",["5QafFMGgQKGwqgV7k3qHy6","A State Of Trance Radio","Adrenaline Sprint","#7C3AED"]],
    ["dnb",["7rp3LPyVRMjHh12AY4kj3D","Hospital Records Official","Hyper-Speed Tactile Execution","#06B6D4"]],
    ["tech-house",["3HPnEh65cfZxTflZP42tkv","Experts Only John Summit","Victory Lap & Hype State","#84CC16"]],
    ["metalcore",["37i9dQZF1DWTcqUzwhNmKv","Kickass Metal","Cathartic Stress Relief","#DC2626"]],
    ["lofi",["37i9dQZF1DWWQRwui0ExPn","Lofi Beats","Low-Friction Creative Warmth","#D97706"]],
    ["hip-hop",["37i9dQZF1DX2RxBh64BHjQ","Most Necessary","Ruthless Executive Swagger","#EAB308"]],
    ["heartland",["37i9dQZF1DWYV7OOaGhoH0","Roots Rising","Grounded Narrative & Copywriting","#854D0E"]],
    ["outlaw",["37i9dQZF1EIepChLBA3FXD","Outlaw Country","Rogue Maverick Scaling","#B45309"]],
    ["atomic-jazz",["37i9dQZF1DWWYN0OyXQBvO","Fallout Radio","Unbothered Atomic Serenity","#FFD700"]]
  ]);
  assert.deepEqual(new Set(expected.map(station=>station.key)),new Set(matrixContract.keys()),"radio matrix station set drifted");
  assert.equal(expected[0].key,"psych-pop","the psychedelic-pop station is not first in the radio");
  for(const station of expected)assert.deepEqual(
    [station.playlist,station.searchQuery,station.flow,station.color],matrixContract.get(station.key),
    `${station.key} no longer matches the approved audio matrix`
  );
  assert.equal(new Set(expected.map(station=>station.key)).size,expected.length,"radio station keys are not unique");
  assert.equal(new Set(expected.map(station=>station.title)).size,expected.length,"radio station titles are not unique");
  const spotifyDestination=station=>{
    assert.match(station.key,/^[a-z0-9]+(?:-[a-z0-9]+)*$/,`${station.key} is not a stable station key`);
    for(const field of ["genre","title","phase","flow","utility","context"])
      assert(typeof station[field]==="string"&&station[field].trim().length>=8,`${station.key}.${field} is incomplete`);
    assert.match(station.color,/^#[0-9a-f]{6}$/i,`${station.key}.color must be a six-digit hex color`);
    assert(!/[<>]/.test([station.genre,station.title,station.phase,station.flow,station.utility,station.context].join("")),
      `${station.key} metadata contains markup`);
    for(const field of ["label","searchQuery","curator"])
      assert(typeof station[field]==="string"&&station[field].trim().length>=3,`${station.key}.${field} is incomplete`);
    assert.match(station.playlist,/^[A-Za-z0-9]{22}$/,`${station.key} has an invalid Spotify playlist id`);
    assert(!/:\/\/|google\.|[\u0000-\u001f]/i.test(station.searchQuery),`${station.key} has an unsafe Spotify search query`);
    return `https://open.spotify.com/playlist/${station.playlist}`;
  };
  const expectedUrls=expected.map(station=>spotifyDestination(station));
  for(const destination of expectedUrls){
    const parsed=new URL(destination);
    assert.equal(parsed.protocol,"https:");assert.equal(parsed.hostname,"open.spotify.com");
    assert.match(parsed.pathname,/^\/(?:playlist\/[A-Za-z0-9]{22}|search\/.+)$/);
  }
  assert.equal(new Set(expectedUrls).size,expectedUrls.length,"radio stations reuse the same Spotify destination");
  assert(value(first.context,"Object.isFrozen(RADIO_STATIONS)&&RADIO_STATIONS.every(Object.isFrozen)"),
    "radio matrix or a station record is mutable");
  for(const legacyKey of ["synthwave","deep-house","trance","dnb","lofi"])
    assert(expected.some(station=>station.key===legacyKey),`radio matrix dropped legacy station ${legacyKey}`);
  assert.equal(value(first.context,"radioPrefs.station"),"psych-pop");
  assert.equal(value(first.context,"radioPrefs.panelOpen"),false);
  assert.equal(first.registry.radioCurrent.textContent,"Psychedelic Pop & Indie Rock · Modern Psychedelia");
  assert.equal(first.registry.radioOpenLink.getAttribute("href"),"https://open.spotify.com/playlist/37i9dQZF1DX8gDIpdqp1XJ");
  assert.equal(first.registry.radioPanel.hidden,true);
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","the game page loaded Spotify eagerly");
  assert.equal(first.registry.spotifyPlayer.hidden,true,"a legacy in-page player host was not suppressed");
  assert.equal(first.registry.radioBtn.getAttribute("aria-expanded"),"false");
  assert.equal(first.registry.radioPopoutBtn.textContent,"Open radio player");
  assert.equal(first.registry.musicVolumeHelp.textContent,"Open Spotify volume control");

  assert.equal(value(first.context,"setRadioOpen(true)"),true);
  assert.equal(first.registry.radioPanel.hidden,false);
  assert.equal(first.registry.radioBtn.getAttribute("aria-expanded"),"true");
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","opening radio controls mounted an in-page Spotify iframe");

  for(const attack of ["javascript:alert(1)","https://evil.example/list","../playlist","<img src=x>","spotify:playlist:bad"]){
    assert.equal(value(first.context,`setRadioStation(${JSON.stringify(attack)})`),false);
    assert.equal(value(first.context,"radioPrefs.station"),"psych-pop","an untrusted station changed radio state");
  }
  for(const [index,station] of expected.entries()){
    assert.equal(value(first.context,`setRadioStation(${JSON.stringify(station.key)})`),true);
    assert.equal(first.registry.radioCurrent.textContent,`${station.genre} · ${station.title}`);
    assert.equal(first.registry.radioPhase.textContent,station.phase);
    assert.equal(first.registry.radioFlow.textContent,station.flow);
    assert.equal(first.registry.radioUtility.textContent,station.utility);
    assert.equal(first.registry.radioContext.textContent,station.context);
    assert.equal(first.registry.radioSearchCode.textContent,`spotify:search:playlist:${station.searchQuery}`);
    assert.equal(first.registry.radioSearchLink.getAttribute("href"),`https://open.spotify.com/search/${encodeURIComponent(station.searchQuery)}`);
    assert.equal(first.registry.radioPanel.style["--radio-accent"],station.color);
    assert.equal(first.registry.radioOpenLink.getAttribute("href"),expectedUrls[index]);
    assert.equal(first.registry[`radio-${station.key}`].getAttribute("aria-pressed"),"true");
    assert.equal(expected.filter(item=>first.registry[`radio-${item.key}`].getAttribute("aria-pressed")==="true").length,1,
      `selecting ${station.key} did not leave exactly one active station`);
  }
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","station switching mounted an in-page Spotify iframe");
  const lofiIndex=expected.findIndex(station=>station.key==="lofi");
  assert.equal(value(first.context,'setRadioStation("lofi")'),true);
  assert.match(first.registry.radioCurrent.textContent,/Lofi & Chillhop · lofi beats/);
  assert.equal(first.registry.radioOpenLink.getAttribute("href"),expectedUrls[lofiIndex]);
  assert.equal(value(first.context,'setRadioStation("lofi")'),true);

  assert.equal(value(first.context,"setRadioOpen(false)"),false);
  assert.equal(first.registry.radioPanel.hidden,true);
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","closing controls changed the player host");
  value(first.context,"setRadioOpen(true)");
  assert.deepEqual(JSON.parse(localStore.get("media-buying-trainer-radio-v1")),{station:"lofi",panelOpen:true});
  const restored=makeContext("?mode=5&seed=73",{localStore});
  assert.equal(value(restored.context,"radioPrefs.station"),"lofi");
  assert.equal(value(restored.context,"radioPrefs.panelOpen"),true);
  assert.equal(restored.registry.radioPanel.hidden,false);
  assert.equal(restored.registry.spotifyPlayer.innerHTML,"");

  for(const corrupt of ["{broken",'{"station":"javascript:alert(1)","panelOpen":"yes"}']){
    const fallback=makeContext("?mode=1&seed=74",{localStore:new Map([["media-buying-trainer-radio-v1",corrupt]])});
    assert.equal(value(fallback.context,"radioPrefs.station"),"psych-pop");
    assert.equal(value(fallback.context,"radioPrefs.panelOpen"),false);
    assert.equal(fallback.registry.spotifyPlayer.innerHTML,"");
  }
  const existingChoice=makeContext("?mode=1&seed=74",{localStore:new Map([["media-buying-trainer-radio-v1",JSON.stringify({station:"synthwave",panelOpen:false})]])});
  assert.equal(value(existingChoice.context,"radioPrefs.station"),"synthwave",
    "adding a first station overwrote a returning player's valid saved choice");

  // A direct user action opens one named window; subsequent controls focus that same player.
  const launcher=makeContext("?mode=1&seed=74");
  launcher.registry.radioPopoutBtn.listeners.click[0]();
  assert.equal(launcher.windowOpenCalls.length,1);
  assert.equal(launcher.windowOpenCalls[0].target,"ttm-media-buyer-radio");
  assert.match(launcher.windowOpenCalls[0].url,
    /^https:\/\/example\.test\/media-buying-trainer\/radio\.html\?station=psych-pop&v=\d+$/);
  assert.match(launcher.windowOpenCalls[0].features,/\bwidth=520\b/);
  const popup=launcher.windowOpenCalls[0].result;
  assert(popup&&!popup.closed,"radio launch did not return a live independent window");
  assert.equal(popup.focusCalls,1);
  assert.equal(launcher.registry.radioPopoutBtn.textContent,"Focus radio");
  assert.equal(launcher.registry.musicVolumeHelp.textContent,"Focus Spotify volume control");
  launcher.registry.radioPopoutBtn.listeners.click[0]();
  assert.equal(launcher.windowOpenCalls.length,1,"focusing the radio opened a duplicate window");
  assert.equal(popup.focusCalls,2);
  launcher.registry.musicVolumeHelp.listeners.click[0]();
  assert.equal(launcher.windowOpenCalls.length,1,"music-volume help opened a duplicate window");
  assert.equal(popup.focusCalls,3,"music-volume help did not focus the real Spotify player");

  // If the browser blocks the compact window, launch the allowlisted playlist in a regular tab.
  const blocked=makeContext("?mode=1&seed=74",{radioPopupBlocked:true});
  assert.equal(value(blocked.context,'setRadioStation("lofi")'),true);
  assert.equal(value(blocked.context,"openRadioPopout()"),false);
  assert.equal(blocked.windowOpenCalls.length,2);
  assert.equal(blocked.windowOpenCalls[0].target,"ttm-media-buyer-radio");
  assert.equal(blocked.windowOpenCalls[1].target,"_blank");
  assert.equal(blocked.windowOpenCalls[1].url,expectedUrls[lofiIndex]);

  // Cross-window messages update the selector without trusting arbitrary playlist URLs.
  const channel=first.broadcastChannels.find(item=>item.name==="ttm-media-buyer-radio-v1");
  assert(channel,"radio did not create its cross-window coordination channel");
  for(const [index,station] of expected.entries()){
    channel.emit({type:"station",station:station.key,source:"popout"});
    assert.equal(value(first.context,"radioPrefs.station"),station.key,`popout did not synchronize ${station.key}`);
    assert.equal(first.registry.radioCurrent.textContent,`${station.genre} · ${station.title}`);
    assert.equal(first.registry.radioOpenLink.getAttribute("href"),expectedUrls[index]);
  }
  channel.emit({type:"station",station:"https://evil.example/list",source:"popout"});
  assert.equal(value(first.context,"radioPrefs.station"),expected.at(-1).key);
  localStore.set("media-buying-trainer-radio-v1",JSON.stringify({station:"dnb",panelOpen:true}));
  for(const handler of first.windowListeners.storage||[])handler({key:"media-buying-trainer-radio-v1"});
  assert.equal(value(first.context,"radioPrefs.station"),"dnb");
  assert.match(first.registry.radioCurrent.textContent,/Drum & Bass · Liquid & Hospital · Hospital Records Catalog/);

  assert(radioSource,"radio implementation is missing");
  assert.doesNotMatch(radioSource,/\b(?:Math\.random|eventRnd|creativeRnd|rnd|roll)\b/,
    "radio code gained access to a random stream");
  assert.doesNotMatch(radioSource,/api\.spotify\.com|access[_-]?token|client[_-]?secret|setVolume\s*\(/i,
    "radio unexpectedly requires Spotify authorization or promises unsupported volume control");
  assert.doesNotMatch(radioSource,/open\.spotify\.com\/embed\/playlist/,
    "the main game still owns a Spotify playback iframe");
  assert.doesNotMatch(popoutSource,/api\.spotify\.com|access[_-]?token|client[_-]?secret|setVolume\s*\(/i,
    "the independent player unexpectedly requires Spotify authorization or fakes volume control");
  assert.match(popoutSource,/open\.spotify\.com\/embed\/playlist/);
  assert.match(popoutSource,/new BroadcastChannel\(RADIO_CHANNEL_NAME\)/);
  assert.match(popoutSource,/window\.addEventListener\("storage"/);
  assert.match(popoutSource,/window\.addEventListener\("beforeunload"/);
  assert.match(popoutHtml,/id="popoutSpotifyPlayer"/);
  assert.match(html,/id="radioCurrent"[^>]*>Psychedelic Pop &amp; Indie Rock · Modern Psychedelia<\/div>/,
    "the main radio's pre-script fallback no longer matches its first station");
  assert.match(popoutHtml,/id="popoutCurrent"[^>]*>Psychedelic Pop &amp; Indie Rock · Modern Psychedelia<\/strong>/,
    "the popout's pre-script fallback no longer matches its first station");
  assert.match(popoutHtml,/href="https:\/\/open\.spotify\.com\/playlist\/37i9dQZF1DX8gDIpdqp1XJ"/,
    "the popout's pre-script playlist fallback no longer matches Psych Pop");
  assert.match(popoutHtml,/src="js\/radio-data\.js\?v=\d+"/);
  assert.match(popoutHtml,/src="js\/radio-popout\.js\?v=\d+"/);
  assert.match(popoutHtml,/href="assets\/styles\/radio-popout\.css\?v=\d+"/);
  const popoutBuild=value(first.context,"RADIO_POPOUT_BUILD");
  assert.match(popoutHtml,new RegExp(`src="js/radio-popout\\.js\\?v=${popoutBuild}"`),
    "popout script cache version is incompatible with the launcher");
  assert.match(popoutHtml,new RegExp(`src="js/radio-data\\.js\\?v=${popoutBuild}"`),
    "popout matrix cache version is incompatible with the launcher");
  assert.match(popoutHtml,new RegExp(`href="assets/styles/radio-popout\\.css\\?v=${popoutBuild}"`),
    "popout style cache version is incompatible with the launcher");
  assert.match(popoutCss,/\.player-frame iframe/);
  assert.match(popoutHtml,/src="js\/radio-data\.js\?v=\d+"[^]*src="js\/radio-popout\.js\?v=\d+"/,
    "popout does not load the shared matrix before its controller");
  assert.doesNotMatch(radioSource,/playlist:\s*["'][A-Za-z0-9]{22}/,"main controller duplicates the station allowlist");
  assert.doesNotMatch(popoutSource,/playlist:\s*["'][A-Za-z0-9]{22}/,"popout controller duplicates the station allowlist");
  const mainButtonKeys=expected.filter(station=>first.registry[`radio-${station.key}`]).map(station=>station.key);
  const stationKeys=expected.map(station=>station.key).sort();
  assert.deepEqual(mainButtonKeys.slice().sort(),stationKeys,"main radio buttons do not match the 12-station matrix");
  for(const station of expected){
    assert(radioDataSource.includes(station.playlist),`shared allowlist is missing ${station.key}'s Spotify destination`);
  }
  assert.match(popoutSource,/RADIO_STATIONS\.map/,"popout does not build controls from the shared matrix");
  assert.doesNotMatch([radioDataSource,radioSource,popoutSource,html,popoutHtml].join("\n"),
    /https?:\/\/(?:www\.)?google\.[^\s"']+\/(?:url|search)\?/i,"radio contains a Google redirect/search URL");

  // The independent page builds all controls from the same data and mounts one allowlisted embed.
  const popDom=fakeDom(),popStore=new Map(),popChannels=[],popWindowListeners={};
  class PopoutChannel{
    constructor(name){this.name=name;this.listeners={};this.messages=[];popChannels.push(this);}
    addEventListener(type,handler){(this.listeners[type]||(this.listeners[type]=[])).push(handler);}
    postMessage(message){this.messages.push(message);}
    emit(message){for(const handler of this.listeners.message||[])handler({data:message});}
  }
  const popContext=vm.createContext({
    console,document:popDom.document,location:{search:"?station=deep-house"},URLSearchParams,
    localStorage:{getItem:key=>popStore.get(key)??null,setItem:(key,val)=>popStore.set(key,String(val))},
    BroadcastChannel:PopoutChannel,window:null,
    addEventListener(type,handler){(popWindowListeners[type]||(popWindowListeners[type]=[])).push(handler);},
    close(){this.closed=true;}
  });
  popContext.window=popContext;
  vm.runInContext(radioDataSource,popContext,{filename:"js/radio-data.js"});
  vm.runInContext(popoutSource,popContext,{filename:"js/radio-popout.js"});
  const popButtons=popDom.registry.popoutStations.querySelectorAll("[data-station]");
  assert.equal(popButtons.length,12,"popout did not render all radio stations");
  assert.equal(popButtons.filter(button=>button.getAttribute("aria-pressed")==="true").length,1,
    "popout did not expose exactly one active station");
  assert.match(popDom.registry.popoutCurrent.textContent,/Melodic & Deep House · Deep x Melodic/);
  assert.equal(popDom.registry.popoutFlow.textContent,"Subconscious Hypnotic Drift");
  assert.match(popDom.registry.popoutSpotifyPlayer.children[0].src,/\/embed\/playlist\/1GfH39JcID8aFZ0ZQQVkBk/);
  assert.equal(vm.runInContext('setStation("psych-pop")',popContext),true);
  assert.match(popDom.registry.popoutCurrent.textContent,/Psychedelic Pop & Indie Rock · Modern Psychedelia/);
  assert.match(popDom.registry.popoutSpotifyPlayer.children.at(-1).src,/\/embed\/playlist\/37i9dQZF1DX8gDIpdqp1XJ/);
  const atomicButton=popButtons.find(button=>button.dataset.station==="atomic-jazz");
  popDom.registry.popoutStations.listeners.click[0]({target:atomicButton});
  assert.equal(vm.runInContext("stationKey",popContext),"atomic-jazz");
  assert.match(popDom.registry.popoutCurrent.textContent,/Fallout-Era Jazz & Atomic Swing · Fallout Radio/);
  assert.equal(popDom.registry.popoutSearchCode.textContent,"spotify:search:playlist:Fallout Radio");
  assert.equal(popDom.registry.popoutSpotifyLink.href,"https://open.spotify.com/playlist/37i9dQZF1DWWYN0OyXQBvO");
  const popChannel=popChannels.find(channel=>channel.name==="ttm-media-buyer-radio-v1");
  popChannel.emit({type:"station",station:"javascript:alert(1)",source:"game"});
  assert.equal(vm.runInContext("stationKey",popContext),"atomic-jazz","popout accepted an untrusted station key");

  for(const deadId of ["37i9dQZF1DXdLENR3129h1","37i9dQZF1DX8tP33SuA32v","37i9dQZF1DXbK2L9i3m4C7",
    "37i9dQZF1DX5wB1L1M3R4E","37i9dQZF1DWWQR0aw0SuMj"])assert(!sourceCorpus.includes(deadId),`dead Spotify playlist remains: ${deadId}`);
  assert.match(html,/id="radioBtn"[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="radioPanel"/);
  assert.match(html,/id="radioStations"[^>]*role="group"[^>]*aria-label="Radio station"/);
  assert.match(html,/id="radioPopoutBtn"[^>]*type="button"/);
  assert.match(html,/id="musicVolumeHelp"[^>]*type="button"/);
  assert.match(html,/id="learningCloseBtn"[^>]*type="button"/);
  assert.doesNotMatch(html,/id="spotifyPlayer"/,"the game page still exposes an in-page Spotify player");
  assert.match(css,/\.radio-shell\[hidden\]\{display:none\}/);
  assert.match(css,/\.radio-stations\{display:flex;[^}]*overflow-x:auto/);
  assert.match(css,/\.radio-station\{[^}]*scroll-snap-align:start/);
  assert.match(html,/Track information and music volume remain in Spotify's player/);

  const a=makeContext("?mode=5&seed=83"),b=makeContext("?mode=5&seed=83");
  const before=value(a.context,"JSON.stringify(S)");
  vm.runInContext(`setRadioOpen(true);${expected.map(station=>`setRadioStation(${JSON.stringify(station.key)})`).join(";")};setRadioOpen(false)`,a.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),before,"radio interactions mutated the portfolio");
  vm.runInContext("runDay()",a.context);vm.runInContext("runDay()",b.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),value(b.context,"JSON.stringify(S)"),
    "radio interactions consumed seeded simulation luck");
}

if(process.argv.includes("--report")){
  for(let mode=1;mode<=4;mode++){
    const rois=[], managed=[];
    for(let seed=1;seed<=100;seed++){
      const {context}=makeContext(`?mode=${mode}&seed=${seed}`);
      runToEnd(context);
      const s=state(context);
      rois.push(s.spendTotal?(s.earnedRevenue-s.spendTotal)/s.spendTotal*100:0);
      const managedFixture=makeContext(`?mode=${mode}&seed=${seed}`),managedRun=managedFixture.context;
      const days=value(managedRun,"DAYS");
      for(let day=0;day<days;day++){
        if(mode<4){
          for(let i=0;i<state(managedRun).slots.length;i++){
            const slot=state(managedRun).slots[i];
            if(slot.alive&&slot.fatigue>48&&slot.multiplies<value(managedRun,"MAX_MULT"))clickAct(managedFixture,"mult",i);
          }
        }else{
          for(let i=0;i<state(managedRun).slots.length;i++){
            while(state(managedRun).slots[i].offerAtSec>1)clickAct(managedFixture,"sooner",i);
            if(state(managedRun).slots[i].fatigue>52)clickAct(managedFixture,"recast",i);
          }
        }
        vm.runInContext("runDay()",managedRun);
      }
      const ms=state(managedRun);
      managed.push(ms.spendTotal?(ms.earnedRevenue-ms.spendTotal)/ms.spendTotal*100:0);
    }
    rois.sort((a,b)=>a-b);managed.sort((a,b)=>a-b);
    console.log(`mode ${mode} passive ROI: p10 ${rois[9].toFixed(1)}% · median ${rois[49].toFixed(1)}% · p90 ${rois[89].toFixed(1)}%`);
    console.log(`mode ${mode} refresh strategy: p10 ${managed[9].toFixed(1)}% · median ${managed[49].toFixed(1)}% · p90 ${managed[89].toFixed(1)}%`);
  }
  const nightmare=[];
  for(let seed=1;seed<=40;seed++){
    const {context}=makeContext(`?mode=5&seed=${seed}`);runToEnd(context);const s=state(context);
    nightmare.push({outcome:s.outcome,day:s.day-1,months:s.months.length,passes:s.months.filter(m=>m.pass).length,
      mer:s.spendTotal?s.modeledRevenue/s.spendTotal:0,profit:s.modeledRevenue-s.billedTotal-s.opsCost,
      gap:s.modeledRevenue?Math.abs(s.reportedRevenue-s.modeledRevenue)/s.modeledRevenue:0});
  }
  const count=key=>nightmare.filter(row=>row.outcome===key).length;
  const med=key=>nightmare.map(row=>row[key]).sort((a,b)=>a-b)[Math.floor(nightmare.length/2)];
  console.log(`mode 5 passive: exits ${count("portfolio-exit")}/40 · term ${count("term-ended")}/40 · credit collapses ${count("credit-collapse")}/40`);
  console.log(`mode 5 passive medians: day ${med("day")} · months ${med("months")} · MER ${med("mer").toFixed(2)}× · profit ${moneyForReport(med("profit"))} · claim gap ${(med("gap")*100).toFixed(0)}%`);
  const managedNightmare=[];
  for(let seed=1;seed<=40;seed++){
    const {context}=makeContext(`?mode=5&seed=${seed}`),s=runNightmarePolicy(context);
    managedNightmare.push({outcome:s.outcome,day:s.day-1,months:s.months.length,passes:s.months.filter(m=>m.pass).length,
      mer:s.spendTotal?s.modeledRevenue/s.spendTotal:0,profit:s.modeledRevenue-s.billedTotal-s.opsCost,
      gap:s.modeledRevenue?Math.abs(s.reportedRevenue-s.modeledRevenue)/s.modeledRevenue:0,
      failures:Array.from(s.months).flatMap(m=>Object.entries(m.conditions).filter(([,ok])=>!ok).map(([key])=>key))});
  }
  const mcount=key=>managedNightmare.filter(row=>row.outcome===key).length;
  const mmed=key=>managedNightmare.map(row=>row[key]).sort((a,b)=>a-b)[Math.floor(managedNightmare.length/2)];
  console.log(`mode 5 managed: exits ${mcount("portfolio-exit")}/40 · term ${mcount("term-ended")}/40 · credit collapses ${mcount("credit-collapse")}/40`);
  console.log(`mode 5 managed medians: day ${mmed("day")} · months ${mmed("months")} · MER ${mmed("mer").toFixed(2)}× · profit ${moneyForReport(mmed("profit"))} · claim gap ${(mmed("gap")*100).toFixed(0)}%`);
  const failures={};for(const row of managedNightmare)for(const key of row.failures)failures[key]=(failures[key]||0)+1;
  console.log(`mode 5 managed failed gate checks across 120 months: ${JSON.stringify(failures)}`);
}

function moneyForReport(n){return `${n<0?"-":""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;}
}
}
