import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

const root=new URL("../",import.meta.url);
const html=fs.readFileSync(new URL("index.html",root),"utf8");
const css=fs.readFileSync(new URL("assets/styles/trainer.css",root),"utf8");
const CACHE_VERSION="10";
const APP_FILES=[
  "js/content-db.js","js/feedback.js","js/radio.js","js/runtime.js","js/session.js","js/flavors.js",
  "js/modern-content.js","js/modern-engine.js","js/nightmare-engine.js","js/knowledge-data.js",
  "js/field-guide.js","js/tutorial.js","js/classic-client-data.js","js/classic-engine.js","js/bootstrap.js"
];
const SCRIPT_FILES=["js/access.js",...APP_FILES];
const scriptSources=[...html.matchAll(/<script\s+src=["']([^"']+)["'][^>]*><\/script>/g)].map(match=>match[1]);
assert.deepEqual(scriptSources,SCRIPT_FILES.map(file=>`${file}?v=${CACHE_VERSION}`),
  "index script order or shared cache version changed");
for(const file of SCRIPT_FILES)assert(fs.existsSync(new URL(file,root)),`missing script: ${file}`);
const gateScript=fs.readFileSync(new URL("js/access.js",root),"utf8");
const appSources=APP_FILES.map(file=>({file,source:fs.readFileSync(new URL(file,root),"utf8")}));
const appScript=appSources.map(({file,source})=>`/* ${file} */\n${source}`).join("\n;\n");
const sourceCorpus=[html,css,gateScript,appScript].join("\n");
assert(gateScript.includes("media-buying-trainer-access-v1"),"access-gate script is missing");
assert(appScript.includes("deterministic RNG so two people can compare"),"simulation runtime is missing");

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
    this.parentNode=null;this.classList=new FakeClassList();this.hidden=false;this.inert=false;this.removed=false;
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
      el.tagName=tag;el.dataset={};el.attributes={};el.disabled=/\bdisabled(?:\s|>|$)/i.test(attrs);el.parentNode=this;
      el.classList.reset(classMatch?classMatch[1]:"");el.removed=false;
      for(const item of data){
        const key=item[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());el.dataset[key]=item[2];
      }
      const valueMatch=attrs.match(/\bvalue=["']([^"']*)["']/i);if(valueMatch)el.value=valueMatch[1];
      for(const attr of attrs.matchAll(/\b(aria-[\w-]+|href|title|role|tabindex)=["']([^"']*)["']/gi))
        el.attributes[attr[1].toLowerCase()]=attr[2];
      this._descendants.push(el);
    }
  }
  get innerHTML(){return this._innerHTML||"";}
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
  setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith("data-")){
    const key=name.slice(5).replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());this.dataset[key]=String(value);}}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(name){delete this.attributes[name];if(name.startsWith("data-")){
    const key=name.slice(5).replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());delete this.dataset[key];}}
  closest(selector){
    if(selector==="button"&&this.tagName==="button")return this;
    const cls=selector&&selector.match(/^\.([\w-]+)$/);if(cls)return this.classList.contains(cls[1])?this:null;
    const data=selector&&selector.match(/\[data-([\w-]+)\]/);if(data){const key=data[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());return this.dataset[key]!==undefined?this:null;}
    return null;
  }
  contains(node){if(node===this)return true;let parent=node&&node.parentNode;while(parent){if(parent===this)return true;parent=parent.parentNode;}return false;}
  focus(){this.registry.__active=this;}
  replaceWith(node){this.replacedWith=node;this.parentNode=null;}
  remove(){if(this.parentNode&&Array.isArray(this.parentNode.children))this.parentNode.children=this.parentNode.children.filter(item=>item!==this);this.parentNode=null;this.removed=true;}
  getBoundingClientRect(){return {left:0,bottom:0};}
}

function fakeDom(){
  const registry={};
  for(const id of ["runSummary","profileBadge","seedLbl","flavorSelect","densitySelect","learningMenu","learningCloseBtn","tipsBtn","analogyBtn","radioBtn",
    "sfxBtn","audioBtn","menuBtn","audioPanel","audioTitle","audioCloseBtn","sfxVolume","sfxVolumeLabel",
    "sfxCues","radioPanel","radioTitle","radioCurrent","radioPhase","radioCloseBtn","radioStations",
    "radio-synthwave","radio-deep-house","radio-trance","radio-dnb","radio-lofi","spotifyPlayer","radioOpenLink",
    "radioPopoutBtn","musicVolumeHelp",
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
    for(const id of ["general","specialist"]){const key=`ttm.tutorial.${id}.v1`;
      if(!persistent.has(key))persistent.set(key,JSON.stringify({introComplete:true,complete:true,completedAt:"test"}));}
  }
  const location={search,pathname:"/media-buying-trainer/"};
  const history={lastUrl:null,replaceState(_state,_title,url){
    this.lastUrl=String(url);location.search=this.lastUrl.includes("?")?this.lastUrl.slice(this.lastUrl.indexOf("?")):"";
  }};
  const audioPlays=[];
  class FakeAudio{
    constructor(src=""){this.src=src;this.preload="";this.volume=1;this.currentTime=0;}
    cloneNode(){return new FakeAudio(this.src);}
    play(){audioPlays.push({src:this.src,volume:this.volume});return Promise.resolve();}
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
  for(const {file,source} of appSources)vm.runInContext(source,context,{filename:file});
  return {context,registry,history,localStore:persistent,sessionStore:storage,audioPlays,documentListeners,
    windowListeners,windowOpenCalls,broadcastChannels};
}

function state(context){return vm.runInContext("S",context);}
function value(context,expression){return vm.runInContext(expression,context);}
function clickAct(fixture,act,i=0){
  fixture.registry.slots.listeners.click[0]({target:{closest:()=>({dataset:{act,i:String(i)}})}});
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

function runToEnd(context){
  const days=value(context,"MODE===0?CLASSIC_DAYS:DAYS");
  const nightmare=value(context,"MODE===5");
  const classic=value(context,"MODE===0");
  for(let i=0;i<days*8;i++){
    if(nightmare&&state(context).ended)break;
    if(classic&&state(context).client?.pendingEncounter?.phase==="choice")
      vm.runInContext(`(()=>{const p=S.client.pendingEncounter,e=CLASSIC_CLIENT_EVENTS[p.eventId],o=e.options.slice().sort((a,b)=>(b.evidence+b.operational+b.base)-(a.evidence+a.operational+a.base))[0];return resolveClassicClientEncounter(o.id)})()`,context);
    else if(classic&&state(context).client?.pendingEncounter?.phase==="feedback")vm.runInContext("continueClassicClientEncounter()",context);
    else vm.runInContext("runDay()",context);
    const s=state(context);
    finiteTree(s);
    if(value(context,"MODE===0")){
      const spent=s.groups.filter(group=>!group.paused&&group.last).reduce((sum,group)=>sum+group.last.spend,0);
      assert(spent<=s.budget+1e-6,"Classic daily spend exceeded its cap");
    }else if(!nightmare){
      const allocated=s.slots.filter(slot=>slot.alive).reduce((sum,slot)=>sum+slot.budget,0);
      assert(allocated<=value(context,"DAILY")+1e-6,"Modern allocation exceeded its cap");
    }else{
      const allocated=s.accounts.filter(account=>!account.paused).reduce((sum,account)=>sum+account.budget,0);
      assert(allocated<=value(context,"DAILY")+1e-6,"Nightmare allocation exceeded its cap");
      assert(s.finance.creditUsed<=s.finance.creditLimit+1e-6,"Nightmare shared credit exceeded its limit");
      assert.deepEqual(Array.from(value(context,"NightmareEngine.validate()")),[]);
    }
    if(!nightmare&&s.day===days+1&&(!classic||!s.client.pendingEncounter))break;
  }
  if(nightmare){
    assert.equal(state(context).ended,true,"Nightmare run did not reach an exit condition");
    assert(state(context).day<=days+1,"Nightmare run exceeded its configured period");
  }else assert.equal(state(context).day,days+1,"run did not end on the configured period");
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
  assert.equal(fixture.registry.profileBadge.textContent,"GUIDED TRACK");assert.equal(value(fixture.context,"document.body.dataset.profile"),"specialist");
  const first=value(fixture.context,"JSON.stringify(S)");
  assert.equal(value(fixture.context,'window.__unlocked("general")'),false);
  assert.equal(value(fixture.context,"ACTIVE_PROFILE"),"specialist");assert.equal(value(fixture.context,"JSON.stringify(S)"),first);
}

// Product naming, neutral copy, and the reconstructed learning corpus have no stale private/workbook labels.
{
  const readme=fs.readFileSync(new URL("../README.md",import.meta.url),"utf8");
  assert.match(html,/<title>To The Moon — the PFM Media Buying Trainer<\/title>/);
  assert.match(html,/class="brand-mark"[^>]*>PFM<\/div>/);
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
  assert.equal(value(guided.context,"ACTIVE_PROFILE"),"specialist");assert.equal(guided.registry.profileBadge.textContent,"GUIDED TRACK");
  assert.equal(guided.registry.loreBtn.textContent,"Account Playbook");
  vm.runInContext('specialistGuide("04")',guided.context);
  assert.match(guided.registry.guideOverlay.innerHTML,/Specialist Account Playbook/);
  assert.match(guided.registry.guideOverlay.innerHTML,/Winner and anomaly lab/);
  assert.match(guided.registry.guideOverlay.innerHTML,/Public simulation scope/);
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
  assert.match(value(context,"LORE_SEL"),/reality-copy/);assert.match(value(context,"LORE_SEL"),/config \.hint/);
  vm.runInContext('loreBook("03")',context);
  assert.match(registry.guideOverlay.innerHTML,/Field Guide · 11 linked lessons/);
  assert.match(registry.guideOverlay.innerHTML,/Lesson 03 · Purpose before scoreboard/);
  assert.match(registry.guideOverlay.innerHTML,/Foundation · new to media buying/);
  assert.match(registry.guideOverlay.innerHTML,/Working practice · active operators/);
  assert.match(registry.guideOverlay.innerHTML,/Expert notes · scope and caveats/);
  const lessonButtons=registry.guideOverlay.querySelectorAll("button[data-lesson-select]");
  assert.equal(lessonButtons.length,11);lessonButtons.find(button=>button.dataset.lessonSelect==="07").onclick();
  assert.match(registry.guideOverlay.innerHTML,/Lesson 07 · Measurement and attribution/);

  // Every surfaced glossary term has both a real lesson destination and a deliberate analogy in every flavor.
  const loreTerms=Array.from(value(context,"Object.keys(LORE)"));
  assert.equal(loreTerms.length,211,"canonical glossary count drifted");
  const specialistTerms=Array.from(value(context,"Object.keys(SPECIALIST_PLAYBOOK_BY_TERM)"));
  assert.deepEqual(specialistTerms.slice().sort(),loreTerms.slice().sort(),
    "Specialist Playbook routing must cover every canonical glossary term exactly once");
  const specialistIds=new Set(Array.from(value(context,"GUIDED_PLAYBOOK"),lesson=>lesson.id));
  for(const [term,id] of Array.from(value(context,"Object.entries(SPECIALIST_PLAYBOOK_BY_TERM)"))){
    assert(specialistIds.has(id),`${term} routes to missing Specialist Playbook ${id}`);
  }
  for(const [term,id] of [["objective","00"],["account","05"],["platform","05"],["pixel","05"],
    ["modeled mer","03"],["compliance","11"],["seed","12"]]){
    assert.equal(value(context,`SPECIALIST_PLAYBOOK_BY_TERM[${JSON.stringify(term)}]`),id,
      `${term} routes to the wrong Specialist Playbook family`);
  }
  for(const term of loreTerms){
    const lessonId=value(context,`lessonForTerm(${JSON.stringify(term)}).id`);
    assert(value(context,`!!KNOWLEDGE_BY_ID[${JSON.stringify(lessonId)}]`),`${term} has no Field Guide route`);
    for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id)){
      const alias=value(context,`flavorAliasForTerm(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}])`);
      assert(typeof alias==="string"&&alias.trim().length>0&&!alias.includes("no direct one-to-one analogue")&&!alias.includes("undefined"),
        `${flavorId}/${term} has no exact flavor alias`);
    }
  }
  assert.match(value(context,'LORE["modeled mer"]'),/modeled outcome value divided by media spend/i);
  assert.match(value(context,'LORE["modeled mer"]'),/does not subtract.*cost/i);
  assert.match(value(context,'LORE["modeled mer"]'),/not.*platform.*cash/i);
  assert.match(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return flavorMechanicExplanation("modeled mer")})()'),/efficiency multiple.*not profit, cash/i);
  assert.match(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return flavorMechanicExplanation("modeled mer")})()'),/Boundary:/);
  assert.match(value(context,'LORE["campaign"]'),/exact position vary by platform/i);
  assert.match(value(context,'LORE["campaign"]'),/ad-set.*ad-group.*ad-squad.*line-item/i);

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
  const reference=pop._descendants.find(el=>el.classList.contains("lesson-link"));
  assert(reference&&reference.dataset.lesson,"glossary popup omitted its linked Field Guide lesson");
  const event={target:reference,relatedTarget:null,key:"",preventDefault(){}};
  for(const {handler} of fixture.documentListeners.click)handler(event);
  assert.match(fixture.registry.guideOverlay.innerHTML,/Field Guide · 11 linked lessons/);
  assert.match(fixture.registry.guideOverlay.innerHTML,new RegExp(`Lesson ${reference.dataset.lesson}`));
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

// Every default mode completes without NaN/Infinity or period/cap drift.
for(let mode=0;mode<=5;mode++){
  const {context}=makeContext(`?mode=${mode}&seed=17`);
  runToEnd(context);
}

// Modes 0–4 retain stable keyed-RNG behavior, and lag modes leave the period-end tail unsettled.
{
  const classic=makeContext("?mode=0&stage=1&seed=97").context;
  runToEnd(classic);const s=state(classic);
  assert.equal(s.day,31);approx(s.spendTotal,9000);approx(s.valueTotal,8276.084353);
  approx(s.convReported,99.436816);approx(s.client.trust,95.2);approx(s.wasteTotal,3914.403432);
}
for(const fixture of [
  {mode:1,spend:176400,revenue:222875.560903,earned:222875.560903,attributed:222875.560903,attributedEarned:222875.560903,leads:16277.735123,reported:16277.735123,unknown:0,pending:0},
  {mode:2,spend:176400,revenue:193639.260569,earned:218236.623628,attributed:193639.260569,attributedEarned:218236.623628,leads:15958.449787,reported:15958.449787,unknown:0,pending:24597.363059},
  {mode:3,spend:176400,revenue:193639.260569,earned:218236.623628,attributed:193639.260569,attributedEarned:218236.623628,leads:15958.449787,reported:15958.449787,unknown:0,pending:24597.363059},
  {mode:4,spend:192000,revenue:116476.151785,earned:126266.904839,attributed:112077.409170,attributedEarned:121577.703577,leads:6562.077031,reported:6166.675427,unknown:4398.742615,pending:9790.753055}
]){
  const context=makeContext(`?mode=${fixture.mode}&seed=97`).context;runToEnd(context);const s=state(context);
  assert.equal(s.day,13);approx(s.spendTotal,fixture.spend);approx(s.revenue,fixture.revenue);
  approx(s.earnedRevenue,fixture.earned);approx(s.attributedRevenue,fixture.attributed);
  approx(s.attributedEarnedRevenue,fixture.attributedEarned);approx(s.leadsTotal,fixture.leads);
  approx(s.reportedLeadsTotal,fixture.reported);approx(s.unknownRev,fixture.unknown);
  approx(s.pending.reduce((sum,item)=>sum+item.amt,0),fixture.pending);
}

// The analogy layer is a complete, stable set of 11 flavors with no missing vocabulary or events.
{
  const {context,registry}=makeContext("?mode=1&seed=19");
  const ids=Array.from(value(context,"FLAVORS"),flavor=>flavor.id);
  assert.deepEqual(ids,["deckbuilder","jrpg","fighting","agriculture","evolution","kitchen","f1","fishing","mixing","vc","dnd"]);
  assert.equal(new Set(ids).size,11);
  assert.equal(value(context,"ACTIVE_FLAVOR"),"jrpg");
  assert.equal((registry.flavorSelect.innerHTML.match(/<option /g)||[]).length,11);
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
      const explanation=value(context,`flavorMechanicExplanation(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(id)}])`);
      assert(!explanation.startsWith("The metaphor preserves the decision relationship"),`${id}/${term} fell through to the generic analogy bridge`);
      assert.match(explanation,/Boundary:/,`${id}/${term} lost its analogy boundary`);
    }
    for(const term of allCanonicalTerms){
      const explanation=value(context,`flavorMechanicExplanation(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(id)}])`);
      assert(!explanation.startsWith("The metaphor preserves the decision relationship"),
        `${id}/${term} fell through to the generic analogy bridge`);
      assert(explanation.length>120,`${id}/${term} analogy bridge is too thin to explain the causal relationship`);
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
  assert.match(registry.slots.innerHTML,/Ad ≈/);
  assert.match(registry.slots.innerHTML,/Creative ≈/);
  assert.match(registry.slots.innerHTML,/party member/);
  assert.match(value(context,'flavorCue("day")'),/combat turn.*battle plan/i);
  assert.match(value(context,'flavorCue("structure")'),/Account → Campaign → Ad Set\/Ad Group → Ad → Creative/);
}

// Previously collided analogies now preserve the distinct real objects and control scopes.
{
  const {context}=makeContext("?mode=5&seed=192");
  for(const [flavorId,left,right] of [["agriculture","account","operating company"],
    ["f1","ad","platform initiative"],["evolution","match type","targeting"],["vc","saturation","demand index"]]){
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
  const expectedMarks={deckbuilder:"🃏",jrpg:"⚔️",fighting:"🥊",agriculture:"🚜",evolution:"🧬",kitchen:"🍽️",
    f1:"🏎️",fishing:"🎣",mixing:"🎚️",vc:"📈",dnd:"🎲"};
  assert.deepEqual(Object.fromEntries(Array.from(value(context,"FLAVORS"),flavor=>[flavor.id,flavor.mark])),expectedMarks);
  assert.equal(value(context,"currentFlavor().mark"),"🚜");
  assert.equal(value(context,"FLAVOR_BY_ID.kitchen.mark"),"🍽️");
  assert.equal(value(context,"currentFlavor().terms.audience"),"field");
  assert.equal(value(context,"currentFlavor().terms.pixel"),"sensor network");
  assert.equal(value(context,"currentFlavor().terms.bid"),"valve setting");
  assert.equal(value(context,"currentFlavor().terms.targeting"),"sensor-guided valve plan");
  assert.match(value(context,"currentFlavor().signature"),/Audience ≈ field.*Budget ≈ water reserve.*Pixel ≈ sensor network/);
  assert.deepEqual(Object.fromEntries(Array.from(value(context,"Object.values(CREATIVE_FORMATS)"),format=>[format.id,format.mark])),{
    static:"🖼️",rendered:"🎨",motion:"🎞️",ugc:"🤳",founder:"🗣️",native:"📰",utility:"🖥️",lifestyle:"📸",ctv:"📺",search:"🔍"
  });
}

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
  assert.equal(value(context,"currentFlavor().terms.buyer"),"Dungeon Master");
  assert.equal(value(context,"currentFlavor().terms.platform"),"d20 table");
  assert.equal(value(context,"currentFlavor().terms.creative"),"adventurer and build");
  assert.equal(value(context,"currentFlavor().terms.fatigue"),"exhaustion and spell slots");
  assert.equal(value(context,"currentFlavor().terms.audience"),"monster AC");
  assert.match(value(context,'eventFlavorText("viral")'),/Natural 20/);
  assert.match(value(context,'eventFlavorText("surge")'),/Natural 1/);
  assert.match(value(context,"currentFlavor().signature"),/Fighter.*Rogue.*Wizard.*Cleric/);
  assert.match(registry.realityBar.innerHTML,/Cross-platform paid social \+ Google display \/ Demand Gen/);
  for(const platform of ["Google","Snapchat","Meta","TikTok"])assert(registry.realityBar.innerHTML.includes(platform));
  for(const hierarchy of ["ad group → ad","ad set → ad","ad squad → ad"])assert(registry.realityBar.innerHTML.includes(hierarchy));
  assert.match(registry.realityBar.innerHTML,/In-house/);
  assert.match(registry.slots.innerHTML,/Ad ≈/);
  assert.equal(value(context,'statFlavorAlias("Spend")'),"gold spent");
  assert.equal(value(context,'statFlavorAlias("ROAS")'),"loot-per-gold multiplier");
  assert.equal(value(context,'statFlavorAlias("Unsettled")'),"loot awaiting identification");
  const blackout=value(context,'nightmareEventFlavorText("blackout")');
  assert.match(blackout,/delivery and modeled value continue/i);
  assert.match(blackout,/reported .* credit is suppressed/i);
  assert.doesNotMatch(blackout,/platform is unavailable|another initiative/i);
}

// Every flavor boots and runs under every mode without contaminating the simulation surface.
for(const flavor of ["deckbuilder","jrpg","fighting","agriculture","evolution","kitchen","f1","fishing","mixing","vc","dnd"]){
  for(let mode=0;mode<=5;mode++){
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
  const {context,registry}=makeContext("?mode=0&stage=2&seed=22&flavor=fighting");
  assert.match(registry.realityBar.innerHTML,/Paid Search \/ PPC/);
  assert.match(registry.realityBar.innerHTML,/Google Ads-style Search/);
  assert.match(registry.realityBar.innerHTML,/Client-based agency/);
  assert.match(registry.realityBar.innerHTML,/Client → account → campaign → ad group → keyword \+ search ad/);
  assert.match(registry.accountBox.innerHTML,/account-wide simulation cap/);
  assert.match(registry.slots.innerHTML,/Ad group/);
  assert.match(registry.slots.innerHTML,/Keyword/);
  assert.match(registry.slots.innerHTML,/move set/);
  assert.equal(value(context,"realWorldScope().team"),"Client-based agency");
}

// Classic tracking keeps reported and modeled value separate, and repairs only future reporting.
{
  const f=makeContext("?mode=0&stage=2&seed=7");
  vm.runInContext("runDay()",f.context);let s=state(f.context),broken=s.groups[1];
  assert(broken.last.convR<broken.last.convA);
  assert(broken.last.roasReported<broken.last.roasModeled);
  assert.equal(broken.last.roas,broken.last.roasReported);
  assert(s.reportedValueTotal<s.valueTotal);
  assert.match(f.registry.slots.innerHTML,/reported ROAS/i);
  const reportedBefore=s.reportedValueTotal,modeledBefore=s.valueTotal;
  f.registry.trackBtn.onclick();f.registry.closeB.onclick();
  assert.equal(state(f.context).reportedValueTotal,reportedBefore,"tracking repair rewrote historical reports");
  assert.equal(state(f.context).valueTotal,modeledBefore,"tracking repair rewrote modeled value");
  vm.runInContext("runDay()",f.context);broken=state(f.context).groups[1];
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
  assert.match(f.registry.slots.innerHTML,/keyword-level diagnostic, not a KPI and not a literal auction input/i);
  assert.match(f.registry.accountBox.innerHTML,/Bid does not raise the score/);
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
  assert.match(f.registry.slots.innerHTML,/Controlled change · CTA/);assert.match(f.registry.slots.innerHTML,/CTA permutation/);
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
  assert.match(card,/keyword-level diagnostic, not a KPI and not a literal auction input/);
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
  assert.equal(state(f.context).groups[0].previewAdId,permutationId);assert.match(f.registry.slots.innerHTML,/Controlled change · CTA/);
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

// Briefing flavor cards preserve draft run configuration and restore focus to the active choice.
{
  const {context,registry}=makeContext("?mode=1&seed=27&flavor=jrpg");
  vm.runInContext("briefing()",context);
  registry.daysCfg.value="33";registry.budgetCfg.value="44000";
  assert.equal(typeof registry["flavorCard-dnd"].onclick,"function");
  registry["flavorCard-dnd"].onclick();
  assert.equal(value(context,"ACTIVE_FLAVOR"),"dnd");
  assert.equal(registry.daysCfg.value,"33");
  assert.equal(registry.budgetCfg.value,"44000");
  assert.equal(registry["flavorCard-dnd"].getAttribute("aria-pressed"),"true");
  assert.equal(registry.wrap.inert,true);
  registry.closeB.onclick();
  assert.equal(registry.wrap.inert,false);
}

// The Field Guide is a nested surface: it preserves the briefing draft and restores that underlying dialog.
{
  const {context,registry}=makeContext("?mode=4&seed=28&flavor=dnd");
  vm.runInContext("briefing()",context);
  registry.daysCfg.value="44";registry.budgetCfg.value="73000";
  registry.daysCfg.listeners.input[0]();
  const briefingMarkup=registry.overlay.innerHTML;
  vm.runInContext('loreBook("04")',context);
  assert.equal(registry.overlay.innerHTML,briefingMarkup,"Field Guide replaced its underlying briefing");
  assert.equal(registry.daysCfg.value,"44");assert.equal(registry.budgetCfg.value,"73000");
  assert.match(registry.guideOverlay.innerHTML,/Lesson 04 · Funnel diagnosis/);
  assert.equal(registry.wrap.inert,true);
  const attribution=registry.guideOverlay.querySelectorAll("button[data-lesson-select]")
    .find(button=>button.dataset.lessonSelect==="07");
  attribution.onclick();
  assert.match(registry.guideOverlay.innerHTML,/Lesson 07 · Measurement and attribution/);
  assert.equal(registry.overlay.innerHTML,briefingMarkup);
  assert.equal(registry.daysCfg.value,"44");assert.equal(registry.budgetCfg.value,"73000");
  registry.guideClose.onclick();
  assert.equal(registry.guideOverlay.innerHTML,"");assert.equal(registry.overlay.innerHTML,briefingMarkup);
  assert.equal(registry.wrap.inert,true,"closing the guide incorrectly re-enabled the covered simulation");
  registry.closeB.onclick();assert.equal(registry.wrap.inert,false);
}

// Boundary configurations: short/low and long/high runs use the chosen mechanics.
for(const search of [
  "?mode=0&stage=2&days=7&budget=50&seed=23",
  "?mode=0&stage=3&days=90&budget=5000&seed=23",
  "?mode=2&days=4&budget=5000&seed=23",
  "?mode=4&days=60&budget=100000&seed=23",
  "?mode=5&days=90&budget=25000&seed=23",
  "?mode=5&days=180&budget=500000&seed=23"
]){
  const {context}=makeContext(search);
  runToEnd(context);
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

// Nightmare mandates round to whole 30-day acquisition blocks and expose that cadence in setup.
for(const [days,expected] of [[91,90],[104,90],[105,120],[134,120],[135,150],[179,180]]){
  const {context}=makeContext(`?mode=5&days=${days}&seed=30`);
  assert.equal(value(context,"DAYS"),expected,`${days} days did not round to a 30-day block`);
}
{
  const {context,registry}=makeContext("?mode=5&days=120&seed=30");
  vm.runInContext("briefing()",context);
  assert.match(registry.overlay.innerHTML,/Mandate \(days, 30-day blocks\)/);
  assert.match(registry.overlay.innerHTML,/id="daysCfg"[^>]*step="30"/);
  assert.match(registry.overlay.innerHTML,/Daily portfolio authorization/);
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
  assert.equal(s.costBreakdown.creative,1200);assert(s.mediaSpendTotal>0);
  const mediaBefore=s.mediaSpendTotal,attributedBefore=s.attributedEarnedRevenue;
  vm.runInContext('S.pixel={status:"degraded",days:2,diagnosed:true};render()',f.context);
  value(f.context,'document.getElementById("pixelBtn")').onclick();
  assert.equal(state(f.context).mediaSpendTotal,mediaBefore);
  assert.equal(state(f.context).attributedEarnedRevenue,attributedBefore,"repair rewrote historical attribution");
  assert.equal(state(f.context).costBreakdown.measurement,750);
  approx(state(f.context).spendTotal,state(f.context).mediaSpendTotal+state(f.context).opsCost);
  assert.match(f.registry.log.innerHTML,/historical attribution gap remains/i);
}

// Knowledge checks award only training points and cannot manufacture account economics.
{
  const f=makeContext("?mode=1&seed=33",{reducedMotion:false});
  vm.runInContext('S.queue=[{q:"Type the requested hidden phrase.",a:["orbit margin"],why:"Hidden explanation after commitment."}]',f.context);
  const before=value(f.context,'JSON.stringify({revenue:S.revenue,attributedRevenue:S.attributedRevenue,earnedRevenue:S.earnedRevenue,attributedEarnedRevenue:S.attributedEarnedRevenue,spendTotal:S.spendTotal,mediaSpendTotal:S.mediaSpendTotal,opsCost:S.opsCost,leadsTotal:S.leadsTotal,pending:S.pending})');
  vm.runInContext("recall()",f.context);
  assert.match(f.registry.overlay.innerHTML,/Type the requested hidden phrase/);
  assert.doesNotMatch(f.registry.overlay.innerHTML,/orbit margin|Hidden explanation after commitment|flavor-cue|class="rosetta"|class="lore"|data-flavor-concept/i,
    "the unanswered quiz leaked its answer, explanation, analogy, or tooltip layer");
  f.registry.ans.value="orbit margin";let prevented=false;
  f.registry.sendA.click=()=>f.registry.sendA.onclick();
  f.registry.ans.onkeydown({key:"Enter",preventDefault(){prevented=true;}});
  assert.equal(prevented,true,"Enter submission did not suppress the input's default action");
  assert.equal(state(f.context).knowledgeCredits,500);assert.equal(state(f.context).telemetry.recallRight,1);
  assert.match(f.registry.overlay.innerHTML,/quiz-result-correct/);assert.match(f.registry.overlay.innerHTML,/✓/);
  assert.match(f.registry.overlay.innerHTML,/Correct!/);assert.match(f.registry.overlay.innerHTML,/\+500 training points/);
  assert.match(f.registry.fxLayer.innerHTML,/fx-score quiz-correct/);assert.match(f.registry.fxLayer.innerHTML,/fx-value[^>]*>✓/);
  assert.match(f.registry.overlay.innerHTML,/Hidden explanation after commitment/);
  assert.match(f.registry.overlay.innerHTML,/flavor-cue/);assert.match(f.registry.overlay.innerHTML,/class="rosetta"/);
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

// A completed modern period preserves its earned, settled, attribution, and pending ledgers.
{
  const f=makeContext("?mode=4&days=4&budget=20000&seed=40");runToEnd(f.context);
  const final=value(f.context,"JSON.stringify(S)");assert.equal(value(f.context,"runDay()"),false);
  assert.equal(value(f.context,"JSON.stringify(S)"),final,"a post-period modern run mutated state");
}

// Apply/restart makes normalization and progress loss explicit, and autostarts only changed setups.
{
  const sessionStore=new Map();
  const f=makeContext("?mode=1&days=12&budget=20000&seed=27",{sessionStore});
  assert.deepEqual(JSON.parse(sessionStore.get("media-buying-trainer-config-v1"))["1"],{days:12,budget:20000});
  vm.runInContext("briefing()",f.context);
  assert.equal(f.registry.applyCfg.disabled,true);assert.equal(f.registry.applyCfg.textContent,"Current setup already loaded");
  const activeMode=f.registry.overlay.querySelectorAll("button[data-mode]").find(button=>button.dataset.mode==="1");
  assert.equal(activeMode.disabled,true);const searchBefore=value(f.context,"location.search");activeMode.onclick();assert.equal(value(f.context,"location.search"),searchBefore);
  f.registry.daysCfg.value="999";f.registry.budgetCfg.value="-1";
  f.registry.daysCfg.listeners.input[0]();
  assert.match(f.registry.configStatus.textContent,/60 days · \$5,000\/day/);
  assert.equal(f.registry.applyCfg.disabled,false);assert.match(f.registry.applyCfg.textContent,/Load this setup & start fresh/);
  f.registry.applyCfg.onclick();const params=new URLSearchParams(value(f.context,"location.search"));
  assert.equal(params.get("days"),"60");assert.equal(params.get("budget"),"5000");assert.equal(params.get("autostart"),"1");
  assert.deepEqual(JSON.parse(sessionStore.get("media-buying-trainer-config-v1"))["1"],{days:60,budget:5000});
}
{
  const f=makeContext("?mode=1&days=12&budget=20000&seed=27&autostart=1");
  vm.runInContext("openAfterUnlock()",f.context);
  assert.doesNotMatch(f.history.lastUrl,/autostart/);assert.equal(f.registry.overlay.innerHTML,"");
}

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

// Saves are profile-isolated and resume both RNG cursors, so the next simulated day is identical.
{
  const localStore=new Map(),search="?mode=3&days=12&budget=20000&seed=61&flavor=dnd";
  const original=makeContext(search,{localStore,profile:"general"});
  vm.runInContext("runDay();requestCreative();runDay();saveGame('manual',false)",original.context);
  const checkpoint=value(original.context,"JSON.stringify(S)"),generalKey="ttm.save.general.v3";
  const generalRecord=JSON.parse(localStore.get(generalKey));
  assert.equal(generalRecord.profile,"general");assert.equal(generalRecord.schema,3);
  assert.equal(JSON.stringify(generalRecord.state),checkpoint);assert.equal(JSON.stringify(generalRecord.state.rng),value(original.context,"JSON.stringify(S.rng)"));
  const checkpointStore=new Map(localStore);
  vm.runInContext("runDay()",original.context);const expectedNext=value(original.context,"JSON.stringify(S)");

  const specialist=makeContext(search,{localStore,profile:"specialist"});
  assert.equal(value(specialist.context,"saveRecord()"),null,"general save leaked into specialist profile");
  vm.runInContext("runDay();saveGame('manual',false)",specialist.context);
  assert.equal(JSON.parse(localStore.get("ttm.save.specialist.v3")).profile,"specialist");
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

// Authored Classic ad variants survive a browser checkpoint and reproduce the next day exactly.
{
  const localStore=new Map(),search="?mode=0&stage=2&days=12&budget=300&seed=603&flavor=dnd";
  const original=makeContext(search,{localStore});
  clickClassic(original,"rewrite",0);clickClassic(original,"variant",0);clickClassic(original,"expanded",0);
  vm.runInContext("runDay();saveGame('classic-authored-copy',false)",original.context);
  const checkpoint=value(original.context,"JSON.stringify(S)"),record=JSON.parse(localStore.get("ttm.save.general.v3"));
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
  const key="ttm.save.general.v3",record=JSON.parse(localStore.get(key));
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
  const key="ttm.save.general.v3",record=JSON.parse(localStore.get(key));delete record.state.classicModelVersion;
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
  const record=JSON.parse(localStore.get("ttm.save.general.v3"));
  assert.equal(record.budget,300);assert.equal(record.state.budget,150);
}

// Malformed browser-local saves fail closed and leave a valid fresh run renderable.
{
  const malformed={schema:3,profile:"general",mode:1,stage:null,days:12,budget:20000,seed:612,flavor:"dnd",
    savedAt:new Date(0).toISOString(),source:"corrupt-fixture",state:{day:1,slots:[{c:{},hist:[]}],pending:[],queue:[],telemetry:{}}};
  const localStore=new Map([["ttm.save.general.v3",JSON.stringify(malformed)]]);
  const fixture=makeContext("?mode=1&days=12&budget=20000&seed=612&resume=1",{localStore});
  assert.equal(state(fixture.context).slots.length,4);assert.equal(value(fixture.context,"S.pixel.status"),"healthy");
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
  const key="ttm.save.general.v3",record=JSON.parse(localStore.get(key));record.seed=-9;
  localStore.set(key,JSON.stringify(record));
  assert.equal(value(fixture.context,"saveRecord()"),null,"an invalid saved seed remained resumable");
}

// Resuming a terminal checkpoint reopens the correct debrief instead of a disabled board.
for(const fixture of [
  {mode:0,query:"?mode=0&stage=1&days=7&budget=300&seed=621",terminal:"S.day=DAYS+1",copy:/Two scoreboards/},
  {mode:1,query:"?mode=1&days=4&budget=20000&seed=622",terminal:"S.day=DAYS+1",copy:/What the run reveals/},
  {mode:5,query:"?mode=5&days=90&budget=150000&seed=623",terminal:'S.ended=true;S.outcome="term-ended"',copy:/Portfolio mandate failed/}
]){
  const localStore=new Map(),first=makeContext(fixture.query,{localStore});
  vm.runInContext(`${fixture.terminal};saveGame("terminal-test",false)`,first.context);
  const restored=makeContext(`${fixture.query}&resume=1`,{localStore});
  assert.equal(value(restored.context,"terminalCheckpoint()"),true,`mode ${fixture.mode} terminal state was not recognized`);
  assert.match(restored.registry.overlay.innerHTML,fixture.copy,`mode ${fixture.mode} resumed without its debrief`);
  assert.doesNotMatch(restored.history.lastUrl||"",/resume=1/);
}

// Dialog/accessibility and layered Escape behavior remain scoped to the topmost control.
{
  assert.match(appScript,/modal\.setAttribute\("aria-labelledby",heading\.id\)/,
    "dialogs are not named by their visible heading");
  assert.doesNotMatch(value(makeContext("?mode=1&seed=624").context,"LORE_SEL"),/\.config label/,
    "glossary controls can still be injected into form labels");
  assert.match(css,/\.mast::after\{[^}]*right:0;/,"decorative mast glow can overflow narrow viewports");
  const fixture=makeContext("?mode=1&seed=625");
  vm.runInContext('show(`<h2>Layered dialog</h2><button id="closeB">Close</button>`);setAudioPanel(true)',fixture.context);
  const event={key:"Escape",defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
  for(const {handler} of fixture.documentListeners.keydown)handler(event);
  assert.equal(fixture.registry.audioPanel.hidden,true,"Escape did not close the topmost sound panel");
  assert.match(fixture.registry.overlay.innerHTML,/Layered dialog/,"closing sound also dismissed the underlying dialog");

  const layered=makeContext("?mode=1&seed=626");
  const pressEscape=()=>{const key={key:"Escape",defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    for(const {handler} of layered.documentListeners.keydown)handler(key);return key;};
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
  assert.match(toggled.registry.realityBar.innerHTML,/<details class="reality-details">/);
  toggled.registry.learningMenu.open=true;toggled.registry.learningCloseBtn.listeners.click[0]();
  assert.equal(toggled.registry.learningMenu.open,false,"Learning & View cannot be dismissed from its popover");
  assert(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length>0'));
  assert.equal(value(toggled.context,"setTooltips(false)"),false);assert.equal(value(toggled.context,"analogiesEnabled()"),true);
  assert(value(toggled.context,'document.body.classList.contains("tooltips-off")'));
  assert.equal(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length'),0);
  assert.equal(value(toggled.context,"setAnalogies(false)"),false);assert.equal(value(toggled.context,"tooltipsEnabled()"),false);
  assert(value(toggled.context,'document.body.classList.contains("analogies-off")'));
  assert.equal(toggled.registry.accountSection.textContent,"Account HUD");assert.doesNotMatch(toggled.registry.realityBar.innerHTML,/D20 Adventure.*lens/i);
  assert.equal(value(toggled.context,"setTooltips(true)"),true);assert.equal(value(toggled.context,"analogiesEnabled()"),false);
  assert(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length>0'));
  assert.equal(value(toggled.context,'setDensity("analyst")'),"analyst");
  assert.equal(value(toggled.context,"document.body.dataset.density"),"analyst");assert.equal(toggled.registry.densitySelect.value,"analyst");
  assert.match(toggled.registry.realityBar.innerHTML,/<details class="reality-details" open>/);
  assert.equal(value(toggled.context,"JSON.stringify(S)"),before);assert.equal(value(toggled.context,"JSON.stringify(S.rng)"),rngBefore);
  assert.deepEqual(JSON.parse(localStore.get("ttm.ui.general.v1")),{tooltips:true,analogies:false,density:"analyst"});
  const otherProfile=makeContext("?mode=1&seed=62&flavor=dnd",{localStore,profile:"specialist"});
  assert.equal(value(otherProfile.context,"tooltipsEnabled()"),true);assert.equal(value(otherProfile.context,"analogiesEnabled()"),true);
  assert.equal(value(otherProfile.context,"densityLevel()"),"guided");
  vm.runInContext("runDay()",toggled.context);vm.runInContext("runDay()",control.context);
  assert.equal(value(toggled.context,"JSON.stringify(S)"),value(control.context,"JSON.stringify(S)"),
    "presentation toggles changed the seeded simulation");
}

// Mode 1 first-run guidance reveals five concepts, coaches six days, persists, and can replay.
{
  const localStore=new Map(),first=makeContext("?mode=1&seed=63",{localStore,tutorialComplete:false});
  assert.match(first.registry.tutorialBox.innerHTML,/Quick start · 1\/5/);
  assert(value(first.context,'document.body.classList.contains("tutorial-intro")'));
  assert.match(first.registry.tutorialBox.innerHTML,/Start with the account/);
  for(let step=0;step<5;step++){
    assert.equal(typeof first.registry.tutorialNext.onclick,"function",`tutorial step ${step+1} has no continuation`);
    first.registry.tutorialNext.onclick();
  }
  assert.match(first.registry.tutorialBox.innerHTML,/Guided launch · Day 1 of 6/);
  assert.deepEqual(JSON.parse(localStore.get("ttm.tutorial.general.v1")),{introComplete:true,complete:false,completedAt:null});
  vm.runInContext("S.day=7;renderTutorialCoach()",first.context);
  assert.match(first.registry.tutorialBox.innerHTML,/Guided opening complete/);
  assert.equal(JSON.parse(localStore.get("ttm.tutorial.general.v1")).complete,true);

  const returning=makeContext("?mode=1&seed=63",{localStore,tutorialComplete:false});
  assert.doesNotMatch(returning.registry.tutorialBox.innerHTML,/Quick start|Guided launch/);
  assert.equal(value(returning.context,"replayTutorial()"),true);assert.match(returning.registry.tutorialBox.innerHTML,/Quick start · 1\/5/);
  assert.equal(JSON.parse(localStore.get("ttm.tutorial.general.v1")).complete,false);

  const modeTwo=makeContext("?mode=2&seed=63",{localStore:new Map(),tutorialComplete:false});
  assert.equal(modeTwo.registry.tutorialBox.innerHTML,"");assert.doesNotMatch(modeTwo.registry.tutorialBox.innerHTML,/Quick start/);
  assert.match(css,/\.tutorial-intro[\s\S]*animation/);

  const fromMenu=makeContext("?mode=1&seed=64",{localStore:new Map()});
  vm.runInContext("mainMenu()",fromMenu.context);assert.match(fromMenu.registry.overlay.innerHTML,/Main menu/);
  assert.equal(typeof fromMenu.registry.replayTutorial.onclick,"function");fromMenu.registry.replayTutorial.onclick();
  assert.equal(fromMenu.registry.overlay.innerHTML,"");assert.match(fromMenu.registry.tutorialBox.innerHTML,/Quick start · 1\/5/);
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
  assert(f.registry.slots.innerHTML.includes(`Optimize landing step $${expectedLandingCost.toLocaleString("en-US")}`));
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
  assert.match(registry.slots.innerHTML,/reach objective does not instrument the on-page-action diagnostic, so LP CTR is N\/A/);
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
  assert.match(high.registry.slots.innerHTML,/Fresh-capacity model/);
  assert.match(high.registry.slots.innerHTML,/trainer constraint, not a platform benchmark/);
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
  assert.match(appScript,/every second after the first applies a 13% click-to-lead CVR haircut/i);
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
  assert.match(registry.realityBar.innerHTML,/Synthetic in-house holding-company media desk \/ internal agency/);
  for(const platform of ["Google Ads — Search","Google Ads — Demand Gen","Microsoft Advertising — Search","Meta Ads","TikTok Ads","Snapchat Ads","LinkedIn Campaign Manager","platform-abstracted programmatic \/ CTV"])
    assert(new RegExp(platform,"i").test(registry.realityBar.innerHTML),`${platform} missing from real-world scope`);
  assert.match(registry.accountBox.innerHTML,/Training-only portfolio/);
  assert.match(registry.slots.innerHTML,/Quasar Kettleworks/);
  assert.doesNotMatch(registry.slots.innerHTML,/\bFictional\b/i);
  assert.match(registry.slots.innerHTML,/Real hierarchy/);
  vm.runInContext("briefing()",context);
  assert.equal(registry.overlay.querySelectorAll("button[data-mode]").length,6);
  assert.match(registry.overlay.innerHTML,/all-Google portfolio/i);
  assert.match(registry.overlay.innerHTML,/Every advertiser, business, product and result in this mode is invented for training/);
  assert.doesNotMatch([registry.realityBar.innerHTML,registry.accountBox.innerHTML,registry.slots.innerHTML,registry.overlay.innerHTML].join(" "),/\bfictional\b/i);
}

// The redesigned Mode 5 surface starts with a scan layer, preserves details, and names every card section.
{
  const {context,registry}=makeContext("?mode=5&seed=671&flavor=dnd");
  assert.match(registry.slots.innerHTML,/<details class="night-workstream"/);
  assert.equal((registry.slots.innerHTML.match(/<details class="night-workstream"/g)||[]).length,6);
  assert((registry.slots.innerHTML.match(/data-workstream-id="[^"]+" open/g)||[]).length>=1,"no workstream opens for the first decision");
  for(const section of ["Scope","Decision snapshot","Last-day evidence","Delivery path","Creative state","Decisions"])
    assert(registry.slots.innerHTML.includes(section),`Mode 5 cards omitted ${section}`);
  assert.match(registry.slots.innerHTML,/Next decision:/);assert.match(registry.slots.innerHTML,/Last-day MER status:/);
  assert.equal((registry.strip.innerHTML.match(/class="stat"/g)||[]).length,6,"primary HUD is not a six-metric scan layer");
  assert.match(registry.accountBox.innerHTML,/Finance &amp; attribution details · 6 metrics/);
  assert.match(registry.accountBox.innerHTML,/night-hud-drawer/);
  assert.equal(value(context,"NightmareEngine.validate().length"),0);
}

// Card anatomy is an operable, mode-aware teaching surface rather than an unexplained legend.
for(const mode of [0,1,5]){
  const fixture=makeContext(`?mode=${mode}&seed=672${mode}${mode===0?"&stage=1":""}`),button=fixture.registry.cardGuideBtn;
  assert(button.listeners.click&&button.listeners.click.length,`Mode ${mode} did not wire the card guide`);
  button.listeners.click[0]();
  assert.match(fixture.registry.overlay.innerHTML,/How to read a card/);
  assert.match(fixture.registry.overlay.innerHTML,/card-anatomy/);
  assert.match(fixture.registry.overlay.innerHTML,mode===0?/Keyword, match (?:&|&amp;) bid/:mode===5?/Decision snapshot/:/Concept, format (?:&|&amp;) rarity/);
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
        targetCreative:[a.platform,a.creative.name,a.creative.tier,a.creativeTests||0].join("|"),qualityCause:${JSON.stringify(cause)},applied:false,averted:false}};
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
  vm.runInContext('S.pixels.find(p=>p.id==="prism").purity=.30;runDay()',context);
  const s=state(context);
  assert(s.claims.some(claim=>claim.crossPixel),"low-integrity shared event sources did not create cross-account claims");
  assert(s.claims.length>s.outcomes.length,"claim duplication was not represented explicitly");
  assert.equal(s.finance.cash,value(context,"DAILY*6"),"unsettled platform claims changed cash");
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

// Audiovisual feedback stays optional, maps high-stakes cues correctly, and is RNG-neutral.
{
  const expectedCues=[
    ["click","select_004.ogg"],["tally","scroll_002.ogg"],["settle","confirmation_003.ogg"],
    ["profit","confirmation_004.ogg"],["jackpot","maximize_005.ogg"],["creative","drop_004.ogg"],
    ["warning","error_003.ogg"],["failure","scratch_004.ogg"]
  ];
  const stored=new Map([["media-buying-trainer-sfx-v1","on"],["media-buying-trainer-sfx-volume-v1","0.25"]]);
  const mixer=makeContext("?mode=1&seed=73",{localStore:stored});
  assert.deepEqual(Array.from(value(mixer.context,"SFX_DEFS"),cue=>[cue.id,cue.file.split("/").pop()]),expectedCues);
  assert.equal(value(mixer.context,"Object.keys(SFX_FILES).length"),8);
  assert.equal(value(mixer.context,"new Set(Object.values(SFX_FILES)).size"),8);
  for(const [,file] of expectedCues)assert(fs.statSync(new URL(`../assets/audio/${file}`,import.meta.url)).size>1000,`${file} is missing or empty`);
  assert.equal(value(mixer.context,"sfxEnabled"),true);assert.equal(value(mixer.context,"sfxVolume"),.25);
  assert.equal(mixer.registry.sfxBtn.textContent,"SFX ON");assert.equal(mixer.registry.sfxVolumeLabel.textContent,"25%");
  assert.doesNotMatch(html,/id=["']sfxCues["']/,"the internal sound-effect library is visible in the interface");
  vm.runInContext('playSfx("profit",1)',mixer.context);
  assert.match(mixer.audioPlays.at(-1).src,/confirmation_004\.ogg$/);approx(mixer.audioPlays.at(-1).volume,.25,1e-12);
  vm.runInContext("setSfxVolume(.63)",mixer.context);
  assert.equal(stored.get("media-buying-trainer-sfx-volume-v1"),"0.63");assert.equal(mixer.registry.sfxVolumeLabel.textContent,"63%");
  assert.equal(value(mixer.context,"setAudioPanel(true)"),true);assert.equal(mixer.registry.audioPanel.hidden,false);
  assert.equal(mixer.registry.audioBtn.getAttribute("aria-expanded"),"true");
  assert.equal(value(mixer.context,"setAudioPanel(false)"),false);assert.equal(mixer.registry.audioPanel.hidden,true);
  const noAudio=makeContext("?mode=1&seed=73",{audio:false});
  assert.equal(value(noAudio.context,'playSfx("profit",1)'),false,"no-Audio environment did not fail closed");

  const a=makeContext("?mode=1&seed=73"), b=makeContext("?mode=1&seed=73");
  assert.equal(value(a.context,"sfxEnabled"),false);vm.runInContext("setSfx(true,false);setSfxVolume(.47)",a.context);
  assert.equal(value(a.context,"sfxEnabled"),true);assert.equal(a.registry.sfxBtn.textContent,"SFX ON");
  assert.equal(value(a.context,'fxCopy("review",{}).value'),"DELIVERY HOLD");
  assert.equal(value(a.context,'fxCopy("legendary",{name:"Unicorn"}).value'),"Unicorn");
  const rngBefore=value(a.context,"JSON.stringify(S.rng)");
  vm.runInContext('playSfx("click");playSfx("tally");playSfx("settle");playSfx("profit");playSfx("jackpot");playSfx("creative");playSfx("warning");playSfx("failure");fireFx("jackpot",{profit:5000,roas:5.4})',a.context);
  assert.equal(value(a.context,"JSON.stringify(S.rng)"),rngBefore,"audio consumed seeded simulation state");
  vm.runInContext("runDay()",a.context);
  vm.runInContext("runDay()",b.context);
  assert.equal(value(a.context,"JSON.stringify(S)"),value(b.context,"JSON.stringify(S)"),"audio changed the seeded run");
}

// Media Buyer Radio uses a strict playlist allowlist, launches a persistent popout, and is RNG-neutral.
{
  const expected=[
    ["synthwave","37i9dQZF1DXdLEN7aqioXM"],
    ["deep-house","37i9dQZF1DX2TRYkJECvfC"],
    ["trance","37i9dQZF1DX91oIci4su1D"],
    ["dnb","37i9dQZF1DX5wDmLW735Yd"],
    ["lofi","37i9dQZF1DWWQRwui0ExPn"]
  ];
  const localStore=new Map(),first=makeContext("?mode=1&seed=73",{localStore});
  assert.deepEqual(Array.from(value(first.context,"RADIO_STATIONS"),station=>[station.key,station.playlist]),expected);
  assert.equal(value(first.context,"radioPrefs.station"),"synthwave");
  assert.equal(value(first.context,"radioPrefs.panelOpen"),false);
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
    assert.equal(value(first.context,"radioPrefs.station"),"synthwave","an untrusted station changed radio state");
  }
  assert.equal(value(first.context,'setRadioStation("lofi")'),true);
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","station switching mounted an in-page Spotify iframe");
  assert.match(first.registry.radioCurrent.textContent,/Lofi Beats · lofi beats/);
  assert.equal(first.registry["radio-lofi"].getAttribute("aria-pressed"),"true");
  assert.equal(expected.filter(([key])=>first.registry[`radio-${key}`].getAttribute("aria-pressed")==="true").length,1);
  assert.equal(first.registry.radioOpenLink.getAttribute("href"),
    "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn");
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
    assert.equal(value(fallback.context,"radioPrefs.station"),"synthwave");
    assert.equal(value(fallback.context,"radioPrefs.panelOpen"),false);
    assert.equal(fallback.registry.spotifyPlayer.innerHTML,"");
  }

  // A direct user action opens one named window; subsequent controls focus that same player.
  const launcher=makeContext("?mode=1&seed=74");
  launcher.registry.radioPopoutBtn.listeners.click[0]();
  assert.equal(launcher.windowOpenCalls.length,1);
  assert.equal(launcher.windowOpenCalls[0].target,"ttm-media-buyer-radio");
  assert.match(launcher.windowOpenCalls[0].url,
    /^https:\/\/example\.test\/media-buying-trainer\/radio\.html\?station=synthwave&v=\d+$/);
  assert.match(launcher.windowOpenCalls[0].features,/\bwidth=460\b/);
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
  assert.equal(blocked.windowOpenCalls[1].url,"https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn");

  // Cross-window messages update the selector without trusting arbitrary playlist URLs.
  const channel=first.broadcastChannels.find(item=>item.name==="ttm-media-buyer-radio-v1");
  assert(channel,"radio did not create its cross-window coordination channel");
  channel.emit({type:"station",station:"trance",source:"popout"});
  assert.equal(value(first.context,"radioPrefs.station"),"trance");
  assert.match(first.registry.radioCurrent.textContent,/Trance · trance mission/);
  channel.emit({type:"station",station:"https://evil.example/list",source:"popout"});
  assert.equal(value(first.context,"radioPrefs.station"),"trance");
  localStore.set("media-buying-trainer-radio-v1",JSON.stringify({station:"dnb",panelOpen:true}));
  for(const handler of first.windowListeners.storage||[])handler({key:"media-buying-trainer-radio-v1"});
  assert.equal(value(first.context,"radioPrefs.station"),"dnb");
  assert.match(first.registry.radioCurrent.textContent,/Drum & Bass · Massive Drum & Bass/);

  const radioSource=appSources.find(({file})=>file==="js/radio.js").source;
  const popoutHtml=fs.readFileSync(new URL("radio.html",root),"utf8");
  const popoutSource=fs.readFileSync(new URL("js/radio-popout.js",root),"utf8");
  const popoutCss=fs.readFileSync(new URL("assets/styles/radio-popout.css",root),"utf8");
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
  assert.match(popoutHtml,/src="js\/radio-popout\.js\?v=\d+"/);
  assert.match(popoutHtml,/href="assets\/styles\/radio-popout\.css\?v=\d+"/);
  assert.match(popoutCss,/\.player-frame iframe/);
  for(const [,playlist] of expected)assert(popoutSource.includes(playlist),`popout allowlist is missing ${playlist}`);
  for(const deadId of ["37i9dQZF1DXdLENR3129h1","37i9dQZF1DX8tP33SuA32v","37i9dQZF1DXbK2L9i3m4C7",
    "37i9dQZF1DX5wB1L1M3R4E","37i9dQZF1DWWQR0aw0SuMj"])assert(!sourceCorpus.includes(deadId),`dead Spotify playlist remains: ${deadId}`);
  assert.match(html,/id="radioBtn"[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="radioPanel"/);
  assert.match(html,/id="radioStations"[^>]*role="group"[^>]*aria-label="Radio station"/);
  assert.match(html,/id="radioPopoutBtn"[^>]*type="button"/);
  assert.match(html,/id="musicVolumeHelp"[^>]*type="button"/);
  assert.match(html,/id="learningCloseBtn"[^>]*type="button"/);
  assert.doesNotMatch(html,/id="spotifyPlayer"/,"the game page still exposes an in-page Spotify player");
  assert.match(css,/\.radio-shell\[hidden\]\{display:none\}/);
  assert.match(css,/@media \(max-width:520px\)[\s\S]*?\.radio-stations\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(html,/Track information and music volume remain in Spotify's player/);

  const a=makeContext("?mode=5&seed=83"),b=makeContext("?mode=5&seed=83");
  const before=value(a.context,"JSON.stringify(S)");
  vm.runInContext('setRadioOpen(true);setRadioStation("deep-house");setRadioStation("trance");setRadioStation("dnb");setRadioStation("lofi");setRadioStation("synthwave");setRadioOpen(false)',a.context);
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

console.log("media-buying-trainer smoke tests: ok");
