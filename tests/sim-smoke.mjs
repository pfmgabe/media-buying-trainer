import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

const root=new URL("../",import.meta.url);
const html=fs.readFileSync(new URL("index.html",root),"utf8");
const css=fs.readFileSync(new URL("assets/styles/trainer.css",root),"utf8");
const CACHE_VERSION="3";
const APP_FILES=[
  "js/content-db.js","js/feedback.js","js/radio.js","js/runtime.js","js/session.js","js/flavors.js",
  "js/modern-content.js","js/modern-engine.js","js/nightmare-engine.js","js/knowledge-data.js",
  "js/field-guide.js","js/tutorial.js","js/classic-engine.js","js/bootstrap.js"
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
  for(const id of ["runSummary","profileBadge","seedLbl","flavorSelect","tipsBtn","analogyBtn","radioBtn",
    "sfxBtn","audioBtn","menuBtn","audioPanel","audioTitle","audioCloseBtn","sfxVolume","sfxVolumeLabel",
    "sfxCues","radioPanel","radioTitle","radioCurrent","radioPhase","radioCloseBtn","radioStations",
    "radio-synthwave","radio-deep-house","radio-trance","radio-dnb","radio-lofi","spotifyPlayer","radioOpenLink",
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
    getElementById:id=>registry[id]||(registry[id]=new FakeElement(id,registry)),
    querySelector(selector){
      if(selector===".wrap")return registry.wrap;
      const direct=selector.match(/^#([\w-]+)$/);if(direct)return registry[direct[1]]||null;
      const nested=selector.match(/^#([\w-]+)\s+\.([\w-]+)/);if(nested){
        const parent=registry[nested[1]];return parent?parent._descendants.find(el=>el.classList.contains(nested[2]))||parent:null;
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
  const context=vm.createContext({
    console,document,location,URLSearchParams,TextEncoder,Uint8Array,NodeFilter:{SHOW_TEXT:4},crypto:globalThis.crypto||webcrypto,
    sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
    localStorage:{getItem:key=>persistent.get(key)??null,setItem:(key,value)=>persistent.set(key,String(value)),removeItem:key=>persistent.delete(key)},
    history,window:null,setTimeout,clearTimeout,queueMicrotask,MutationObserver:FakeMutationObserver,
    Audio:options.audio===false?undefined:FakeAudio,matchMedia:()=>({matches:true}),
    __trainerAccessGranted:options.accessGranted!==false,__trainerProfile:profile
  });
  context.window=context;
  for(const {file,source} of appSources)vm.runInContext(source,context,{filename:file});
  return {context,registry,history,localStore:persistent,sessionStore:storage,audioPlays,documentListeners};
}

function state(context){return vm.runInContext("S",context);}
function value(context,expression){return vm.runInContext(expression,context);}
function clickAct(fixture,act,i=0){
  fixture.registry.slots.listeners.click[0]({target:{closest:()=>({dataset:{act,i:String(i)}})}});
}
function clickClassic(fixture,action,i=0){
  const handler=fixture.registry.slots.listeners.click[1];
  handler({target:{closest:selector=>selector.includes("data-ca")?{dataset:{ca:action,i:String(i)}}:null}});
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
  for(let i=0;i<days;i++){
    if(nightmare&&state(context).ended)break;
    vm.runInContext("runDay()",context);
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
  for(const term of loreTerms){
    const lessonId=value(context,`lessonForTerm(${JSON.stringify(term)}).id`);
    assert(value(context,`!!KNOWLEDGE_BY_ID[${JSON.stringify(lessonId)}]`),`${term} has no Field Guide route`);
    for(const flavorId of Array.from(value(context,"FLAVORS"),flavor=>flavor.id)){
      const alias=value(context,`flavorAliasForTerm(${JSON.stringify(term)},FLAVOR_BY_ID[${JSON.stringify(flavorId)}])`);
      assert(typeof alias==="string"&&alias.trim().length>0&&!alias.includes("no direct one-to-one analogue")&&!alias.includes("undefined"),
        `${flavorId}/${term} has no exact flavor alias`);
    }
  }

  // Common plural copy on the starter surface resolves to the same canonical glossary records.
  const plurals={accounts:"account",ads:"ad","ad sets":"ad set",platforms:"platform",campaigns:"campaign",
    budgets:"budget",allocations:"allocation",keywords:"keyword",bids:"bid","match types":"match type",
    creatives:"creative",assets:"asset",concepts:"concept",audiences:"audience",pixels:"pixel",clicks:"click",
    leads:"lead",conversions:"conversion","advertiser workstreams":"advertiser workstream",
    "platform initiatives":"platform initiative","business containers":"business container",
    "holding companies":"holding company","operating companies":"operating company",
    "landing-page optimizations":"landing-page optimization","event source clusters":"event-source cluster",
    "campaign budgets":"campaign budget"};
  for(const [alias,key] of Object.entries(plurals)){
    assert.equal(value(context,`LORE_ALIAS_TO_KEY[${JSON.stringify(alias)}]`),key,`${alias} did not route to ${key}`);
    assert(value(context,`(()=>{LORE_RX.lastIndex=0;return LORE_RX.test(${JSON.stringify(` ${alias} `)})})()`),`${alias} is not linkable copy`);
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

// Every default mode completes without NaN/Infinity or period/cap drift.
for(let mode=0;mode<=5;mode++){
  const {context}=makeContext(`?mode=${mode}&seed=17`);
  runToEnd(context);
}

// Modes 0–4 retain stable keyed-RNG behavior, and lag modes leave the period-end tail unsettled.
{
  const classic=makeContext("?mode=0&stage=1&seed=97").context;
  runToEnd(classic);const s=state(classic);
  assert.equal(s.day,31);approx(s.spendTotal,6441.987121);approx(s.valueTotal,6066.323221);
  approx(s.convReported,72.886626);assert.equal(s.client.trust,38);approx(s.wasteTotal,2869.23567);
}
for(const fixture of [
  {mode:1,spend:176400,revenue:222875.560903,earned:222875.560903,attributed:222875.560903,attributedEarned:222875.560903,leads:16277.735123,reported:16277.735123,unknown:0,pending:0},
  {mode:2,spend:176400,revenue:203905.664215,earned:228503.027274,attributed:203905.664215,attributedEarned:228503.027274,leads:16704.964657,reported:16704.964657,unknown:0,pending:24597.363059},
  {mode:3,spend:176400,revenue:203905.664215,earned:228503.027274,attributed:203905.664215,attributedEarned:228503.027274,leads:16704.964657,reported:16704.964657,unknown:0,pending:24597.363059},
  {mode:4,spend:192000,revenue:126514.259451,earned:136481.554339,attributed:121962.875509,attributedEarned:131639.711750,leads:6967.083811,reported:6559.632810,unknown:4551.383942,pending:9967.294888}
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
    assert.equal(value(context,`FLAVOR_BY_ID[${JSON.stringify(id)}].flow`),flow);
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

// Precision Agriculture uses a tintable sensor-grid mark and one consistent Rosetta Stone.
{
  const {context}=makeContext("?mode=1&flavor=agriculture");
  assert.equal(value(context,"currentFlavor().mark"),"⌗");
  assert.equal(value(context,"currentFlavor().terms.audience"),"field");
  assert.equal(value(context,"currentFlavor().terms.pixel"),"sensor network");
  assert.equal(value(context,"currentFlavor().terms.bid"),"valve setting");
  assert.equal(value(context,"currentFlavor().terms.targeting"),"sensor-guided valve plan");
  assert.match(value(context,"currentFlavor().signature"),/Audience ≈ field.*Budget ≈ water reserve.*Pixel ≈ sensor network/);
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
  assert.equal(value(context,"currentFlavor().terms.creative"),"adventurer");
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
  assert.match(f.registry.slots.innerHTML,/reported ROAS/);
  const reportedBefore=s.reportedValueTotal,modeledBefore=s.valueTotal;
  f.registry.trackBtn.onclick();f.registry.closeB.onclick();
  assert.equal(state(f.context).reportedValueTotal,reportedBefore,"tracking repair rewrote historical reports");
  assert.equal(state(f.context).valueTotal,modeledBefore,"tracking repair rewrote modeled value");
  vm.runInContext("runDay()",f.context);broken=state(f.context).groups[1];
  approx(broken.last.roasReported,broken.last.roasModeled,1e-9,"future Classic tracking did not reconcile");
}

// Classic stage and bid/rewrite constraints are enforced in mechanics, not only disabled markup.
{
  const f=makeContext("?mode=0&stage=1&seed=8");
  assert.doesNotMatch(f.registry.pipeBox.innerHTML,/id="delivBtn"/);
  vm.runInContext('S.delivery="accelerated";runDay()',f.context);
  assert.equal(state(f.context).telemetry.acceleratedDays,0,"Stage 1 used a Stage 2 delivery mechanic");
  clickClassic(f,"rewrite",0);const once=state(f.context).groups[0].qs;
  clickClassic(f,"rewrite",0);assert.equal(state(f.context).groups[0].qs,once,"Rewrite repeated on the same day");
  vm.runInContext("S.groups[0].maxCPC=.25;renderClassic()",f.context);clickClassic(f,"bid-",0);
  assert.equal(state(f.context).groups[0].maxCPC,.25);
  vm.runInContext("S.groups[0].maxCPC=8;renderClassic()",f.context);clickClassic(f,"bid+",0);
  assert.equal(state(f.context).groups[0].maxCPC,8);
}

// Classic structural actions cannot stack, and a terminal scheduled call hands off to one debrief only.
{
  const f=makeContext("?mode=0&stage=1&days=7&budget=300&seed=9");
  clickClassic(f,"split",0);
  const splitOnce=value(f.context,'JSON.stringify({group:S.groups[0],splits:S.telemetry.splits,log:S.log})');
  assert.equal(state(f.context).groups[0].qs,6.5);assert.equal(state(f.context).telemetry.splits,1);
  clickClassic(f,"split",0);
  assert.equal(value(f.context,'JSON.stringify({group:S.groups[0],splits:S.telemetry.splits,log:S.log})'),splitOnce,
    "splitting the same ad group twice stacked Quality Score or telemetry");

  for(let day=0;day<7;day++)vm.runInContext("runDay()",f.context);
  assert.equal(state(f.context).day,8);assert.equal(state(f.context).client.calls,1);
  assert.match(f.registry.overlay.innerHTML,/the client is on the phone/);
  const finalChoice=f.registry.overlay.querySelectorAll("button[data-c]").find(button=>button.dataset.c==="report");
  assert(finalChoice,"terminal client call had no factual-report option");
  finalChoice.onclick();assert.match(f.registry.overlay.innerHTML,/Debrief · Stage 1 · The Build · day 7/);
  assert.match(f.registry.overlay.innerHTML,/Two scoreboards/);
  const afterDebrief=value(f.context,"JSON.stringify(S)");
  finalChoice.onclick();
  assert.equal(value(f.context,"JSON.stringify(S)"),afterDebrief,"a stale final-call choice applied twice");
  assert.equal(value(f.context,"runDay()"),false);
  assert.equal(value(f.context,"JSON.stringify(S)"),afterDebrief,"a post-period Classic run mutated state");
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
  const f=makeContext("?mode=1&seed=33");
  vm.runInContext('S.queue=[{q:"Type the requested hidden phrase.",a:["orbit margin"],why:"Hidden explanation after commitment."}]',f.context);
  const before=value(f.context,'JSON.stringify({revenue:S.revenue,attributedRevenue:S.attributedRevenue,earnedRevenue:S.earnedRevenue,attributedEarnedRevenue:S.attributedEarnedRevenue,spendTotal:S.spendTotal,mediaSpendTotal:S.mediaSpendTotal,opsCost:S.opsCost,leadsTotal:S.leadsTotal,pending:S.pending})');
  vm.runInContext("recall()",f.context);
  assert.match(f.registry.overlay.innerHTML,/Type the requested hidden phrase/);
  assert.doesNotMatch(f.registry.overlay.innerHTML,/orbit margin|Hidden explanation after commitment|flavor-cue|class="rosetta"|class="lore"|data-flavor-concept/i,
    "the unanswered quiz leaked its answer, explanation, analogy, or tooltip layer");
  f.registry.ans.value="orbit margin";f.registry.sendA.onclick();
  assert.equal(state(f.context).knowledgeCredits,500);assert.equal(state(f.context).telemetry.recallRight,1);
  assert.match(f.registry.overlay.innerHTML,/Correct/);assert.match(f.registry.overlay.innerHTML,/orbit margin/);
  assert.match(f.registry.overlay.innerHTML,/Hidden explanation after commitment/);
  assert.match(f.registry.overlay.innerHTML,/flavor-cue/);assert.match(f.registry.overlay.innerHTML,/class="rosetta"/);
  assert.equal(value(f.context,'JSON.stringify({revenue:S.revenue,attributedRevenue:S.attributedRevenue,earnedRevenue:S.earnedRevenue,attributedEarnedRevenue:S.attributedEarnedRevenue,spendTotal:S.spendTotal,mediaSpendTotal:S.mediaSpendTotal,opsCost:S.opsCost,leadsTotal:S.leadsTotal,pending:S.pending})'),before);
  finiteTree(state(f.context));
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
  vm.runInContext("S.slots[3].budget=0",f.context);assert.equal(value(f.context,"brandDiscount()"),0);
  vm.runInContext("S.slots[3].budget=100;S.slots[3].blocked=1",f.context);assert.equal(value(f.context,"brandDiscount()"),0);
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

// Tooltip and analogy controls persist independently without consuming luck or mutating the run.
{
  const localStore=new Map(),toggled=makeContext("?mode=1&seed=62&flavor=dnd",{localStore}),control=makeContext("?mode=1&seed=62&flavor=dnd");
  const before=value(toggled.context,"JSON.stringify(S)"),rngBefore=value(toggled.context,"JSON.stringify(S.rng)");
  assert.equal(value(toggled.context,"tooltipsEnabled()"),true);assert.equal(value(toggled.context,"analogiesEnabled()"),true);
  assert(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length>0'));
  assert.equal(value(toggled.context,"setTooltips(false)"),false);assert.equal(value(toggled.context,"analogiesEnabled()"),true);
  assert(value(toggled.context,'document.body.classList.contains("tooltips-off")'));
  assert.equal(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length'),0);
  assert.equal(value(toggled.context,"setAnalogies(false)"),false);assert.equal(value(toggled.context,"tooltipsEnabled()"),false);
  assert(value(toggled.context,'document.body.classList.contains("analogies-off")'));
  assert.equal(toggled.registry.accountSection.textContent,"Account HUD");assert.doesNotMatch(toggled.registry.realityBar.innerHTML,/D20 Adventure.*lens/i);
  assert.equal(value(toggled.context,"setTooltips(true)"),true);assert.equal(value(toggled.context,"analogiesEnabled()"),false);
  assert(value(toggled.context,'document.querySelectorAll(".format-badge[title]").length>0'));
  assert.equal(value(toggled.context,"JSON.stringify(S)"),before);assert.equal(value(toggled.context,"JSON.stringify(S.rng)"),rngBefore);
  assert.deepEqual(JSON.parse(localStore.get("ttm.ui.general.v1")),{tooltips:true,analogies:false});
  const otherProfile=makeContext("?mode=1&seed=62&flavor=dnd",{localStore,profile:"specialist"});
  assert.equal(value(otherProfile.context,"tooltipsEnabled()"),true);assert.equal(value(otherProfile.context,"analogiesEnabled()"),true);
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

// Mode 4 platform moves can create the overlap mechanic that used to be unreachable.
{
  const {context,registry}=makeContext("?mode=4&seed=61");
  const handler=registry.slots.listeners.click[0];
  handler({target:{closest:()=>({dataset:{act:"platform",i:"0"}})}}); // Google → Snap, now two Snap slots.
  vm.runInContext("runDay()",context);
  assert(state(context).telemetry.overlapDays>0);
  assert.equal(state(context).telemetry.platformMoves,1);
}

// Mode 5 boots as a distinct, explicitly fictional portfolio engine with eight free-choice lanes.
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
  assert.match(registry.realityBar.innerHTML,/Entirely fictional in-house holding-company media desk \/ internal agency/);
  for(const platform of ["Google Ads — Search","Google Ads — Demand Gen","Microsoft Advertising — Search","Meta Ads","TikTok Ads","Snapchat Ads","LinkedIn Campaign Manager","platform-abstracted programmatic \/ CTV"])
    assert(new RegExp(platform,"i").test(registry.realityBar.innerHTML),`${platform} missing from real-world scope`);
  assert.match(registry.accountBox.innerHTML,/Entirely fictional simulation/);
  assert.match(registry.slots.innerHTML,/Fictional · Quasar Kettleworks/);
  assert.match(registry.slots.innerHTML,/Real hierarchy/);
  vm.runInContext("briefing()",context);
  assert.equal(registry.overlay.querySelectorAll("button[data-mode]").length,6);
  assert.match(registry.overlay.innerHTML,/all-Google portfolio/i);
  assert.match(registry.overlay.innerHTML,/Every advertiser, business, product and result in this mode is fictional/);
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
  assert.equal(mixer.registry.sfxCues.querySelectorAll("button[data-sfx-preview]").length,8);
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

// Media Buyer Radio uses a strict playlist allowlist, persists presentation state, and is RNG-neutral.
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
  assert.equal(value(first.context,"radioPrefs.open"),false);
  assert.equal(first.registry.radioPanel.hidden,true);
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","a closed radio loaded Spotify eagerly");
  assert.equal(first.registry.radioBtn.getAttribute("aria-expanded"),"false");

  assert.equal(value(first.context,"setRadioOpen(true)"),true);
  assert.equal(first.registry.radioPanel.hidden,false);
  assert.equal(first.registry.radioBtn.getAttribute("aria-expanded"),"true");
  assert.match(first.registry.spotifyPlayer.innerHTML,
    /src="https:\/\/open\.spotify\.com\/embed\/playlist\/37i9dQZF1DXdLEN7aqioXM\?utm_source=generator&amp;theme=0"|src="https:\/\/open\.spotify\.com\/embed\/playlist\/37i9dQZF1DXdLEN7aqioXM\?utm_source=generator&theme=0"/);
  assert.match(first.registry.spotifyPlayer.innerHTML,/title="Spotify radio: Synthwave — Retrowave \/\/ Outrun"/);
  assert.match(first.registry.spotifyPlayer.innerHTML,/loading="lazy"/);
  assert.match(first.registry.spotifyPlayer.innerHTML,/allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/);
  assert.doesNotMatch(first.registry.spotifyPlayer.innerHTML,/<iframe[^>]*\sautoplay(?:\s*=|[\s>])/i,
    "radio iframe autoplayed without a user action");

  const safeMarkup=first.registry.spotifyPlayer.innerHTML;
  for(const attack of ["javascript:alert(1)","https://evil.example/list","../playlist","<img src=x>","spotify:playlist:bad"]){
    assert.equal(value(first.context,`setRadioStation(${JSON.stringify(attack)})`),false);
    assert.equal(first.registry.spotifyPlayer.innerHTML,safeMarkup,"an untrusted station changed the embed");
  }
  assert.equal(value(first.context,'setRadioStation("lofi")'),true);
  assert.match(first.registry.spotifyPlayer.innerHTML,/37i9dQZF1DWWQRwui0ExPn/);
  assert.match(first.registry.radioCurrent.textContent,/Lofi Beats · lofi beats/);
  assert.equal(first.registry["radio-lofi"].getAttribute("aria-pressed"),"true");
  assert.equal(expected.filter(([key])=>first.registry[`radio-${key}`].getAttribute("aria-pressed")==="true").length,1);
  assert.equal(first.registry.radioOpenLink.getAttribute("href"),
    "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn");
  const lofiMarkup=first.registry.spotifyPlayer.innerHTML;
  assert.equal(value(first.context,'setRadioStation("lofi")'),true);
  assert.equal(first.registry.spotifyPlayer.innerHTML,lofiMarkup,"selecting the tuned station restarted its player");

  assert.equal(value(first.context,"setRadioOpen(false)"),false);
  assert.equal(first.registry.radioPanel.hidden,true);
  assert.equal(first.registry.spotifyPlayer.innerHTML,"","closing Radio did not stop and remove its player");
  value(first.context,"setRadioOpen(true)");
  assert.deepEqual(JSON.parse(localStore.get("media-buying-trainer-radio-v1")),{station:"lofi",open:true});
  const restored=makeContext("?mode=5&seed=73",{localStore});
  assert.equal(value(restored.context,"radioPrefs.station"),"lofi");
  assert.equal(value(restored.context,"radioPrefs.open"),true);
  assert.equal(restored.registry.radioPanel.hidden,false);
  assert.match(restored.registry.spotifyPlayer.innerHTML,/37i9dQZF1DWWQRwui0ExPn/);
  assert.doesNotMatch(restored.registry.spotifyPlayer.innerHTML,/<iframe[^>]*\sautoplay(?:\s*=|[\s>])/i);

  for(const corrupt of ["{broken",'{"station":"javascript:alert(1)","open":"yes"}']){
    const fallback=makeContext("?mode=1&seed=74",{localStore:new Map([["media-buying-trainer-radio-v1",corrupt]])});
    assert.equal(value(fallback.context,"radioPrefs.station"),"synthwave");
    assert.equal(value(fallback.context,"radioPrefs.open"),false);
    assert.equal(fallback.registry.spotifyPlayer.innerHTML,"");
  }

  const radioSource=appSources.find(({file})=>file==="js/radio.js").source;
  assert(radioSource,"radio implementation is missing");
  assert.doesNotMatch(radioSource,/\b(?:Math\.random|eventRnd|creativeRnd|rnd|roll)\b/,
    "radio code gained access to a random stream");
  assert.doesNotMatch(radioSource,/api\.spotify\.com|access[_-]?token|client[_-]?secret|setVolume\s*\(/i,
    "radio unexpectedly requires Spotify authorization or promises unsupported volume control");
  for(const deadId of ["37i9dQZF1DXdLENR3129h1","37i9dQZF1DX8tP33SuA32v","37i9dQZF1DXbK2L9i3m4C7",
    "37i9dQZF1DX5wB1L1M3R4E","37i9dQZF1DWWQR0aw0SuMj"])assert(!sourceCorpus.includes(deadId),`dead Spotify playlist remains: ${deadId}`);
  assert.match(html,/id="radioBtn"[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="radioPanel"/);
  assert.match(html,/id="radioStations"[^>]*role="group"[^>]*aria-label="Radio station"/);
  assert.match(css,/\.radio-shell\[hidden\]\{display:none\}/);
  assert.match(css,/@media \(max-width:520px\)[\s\S]*?\.radio-stations\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(html,/Track and artist information appear in Spotify's player/);

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
