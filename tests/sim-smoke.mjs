import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);

class FakeElement{
  constructor(id,registry){this.id=id;this.registry=registry;this.style={};this.dataset={};this.attributes={};this.listeners={};this.disabled=false;this.textContent="";this.value="";this._descendants=[];}
  set innerHTML(value){
    this._innerHTML=String(value);
    this._descendants=[];let anonymous=0;
    for(const match of this._innerHTML.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)){
      const tag=match[1].toLowerCase(),attrs=match[2];
      const idMatch=attrs.match(/\bid=["']([^"']+)["']/i);
      const data=[...attrs.matchAll(/\bdata-([\w-]+)=["']([^"']*)["']/gi)];
      if(!idMatch&&!data.length)continue;
      const id=idMatch?idMatch[1]:`__${this.id}_${anonymous++}`;
      const el=this.registry[id]||(this.registry[id]=new FakeElement(id,this.registry));
      el.tagName=tag;el.dataset={};
      for(const item of data){
        const key=item[1].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());el.dataset[key]=item[2];
      }
      const valueMatch=attrs.match(/\bvalue=["']([^"']*)["']/i);if(valueMatch)el.value=valueMatch[1];
      const pressed=attrs.match(/\baria-pressed=["']([^"']*)["']/i);if(pressed)el.attributes["aria-pressed"]=pressed[1];
      this._descendants.push(el);
    }
  }
  get innerHTML(){return this._innerHTML||"";}
  addEventListener(type,handler){(this.listeners[type]||(this.listeners[type]=[])).push(handler);}
  querySelectorAll(selector){
    const data=selector.match(/^(?:([a-z]+))?\[data-([\w-]+)\]$/i);
    if(!data)return [];
    const key=data[2].replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
    return this._descendants.filter(el=>(!data[1]||el.tagName===data[1].toLowerCase())&&el.dataset[key]!==undefined);
  }
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  closest(){return null;}
  focus(){}
  remove(){this.removed=true;}
  getBoundingClientRect(){return {left:0,bottom:0};}
}

function fakeDom(){
  const registry={};
  for(const id of ["strip","slots","runBtn","log","binBtn","helpBtn","loreBtn","asksLeft",
    "asksRow","accountBox","pipeBox","overlay","fxLayer","sfxBtn","flavorSelect","realityBar",
    "accountSection","accountSectionNote","adSection","adSectionNote","operationsSection","operationsSectionNote",
    "runLens","logSection","benchSection","seedLbl","runSummary","gate","pw","go","pwerr"]){
    registry[id]=new FakeElement(id,registry);
  }
  registry.wrap=new FakeElement("wrap",registry);
  const document={
    body:new FakeElement("body",registry),documentElement:{clientWidth:1280},
    getElementById:id=>registry[id]||(registry[id]=new FakeElement(id,registry)),
    querySelector:selector=>selector===".wrap"?registry.wrap:null,
    querySelectorAll:()=>[],addEventListener:()=>{},
    createElement:tag=>new FakeElement(tag,registry),
    createTreeWalker:()=>({nextNode:()=>null})
  };
  return {document,registry};
}

function makeContext(search="?mode=1&seed=7",options={}){
  const {document,registry}=fakeDom();
  const storage=options.sessionStore||new Map();
  const persistent=options.localStore||new Map();
  const location={search};
  const history={lastUrl:null,replaceState(_state,_title,url){
    this.lastUrl=String(url);location.search=this.lastUrl.includes("?")?this.lastUrl.slice(this.lastUrl.indexOf("?")):"";
  }};
  const context=vm.createContext({
    console,document,location,URLSearchParams,TextEncoder,NodeFilter:{SHOW_TEXT:4},
    sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))},
    localStorage:{getItem:key=>persistent.get(key)??null,setItem:(key,value)=>persistent.set(key,String(value))},
    history,window:null,setTimeout,clearTimeout
  });
  context.window=context;
  vm.runInContext(scripts[1],context,{filename:"index.html"});
  return {context,registry,history,localStore:persistent};
}

function state(context){return vm.runInContext("S",context);}
function value(context,expression){return vm.runInContext(expression,context);}
function finiteTree(value,seen=new Set()){
  if(value===null||typeof value==="string"||typeof value==="boolean"||value===undefined)return;
  if(typeof value==="number"){assert(Number.isFinite(value),`non-finite number: ${value}`);return;}
  if(typeof value!=="object"||seen.has(value))return;
  seen.add(value);
  for(const child of Object.values(value))finiteTree(child,seen);
}

function runToEnd(context){
  const days=value(context,"MODE===0?CLASSIC_DAYS:DAYS");
  for(let i=0;i<days;i++){
    vm.runInContext("runDay()",context);
    const s=state(context);
    finiteTree(s);
    if(value(context,"MODE===0")){
      const spent=s.groups.filter(group=>!group.paused&&group.last).reduce((sum,group)=>sum+group.last.spend,0);
      assert(spent<=s.budget+1e-6,"Classic daily spend exceeded its cap");
    }else{
      const allocated=s.slots.filter(slot=>slot.alive).reduce((sum,slot)=>sum+slot.budget,0);
      assert(allocated<=value(context,"DAILY")+1e-6,"Modern allocation exceeded its cap");
    }
  }
  assert.equal(state(context).day,days+1,"run did not end on the configured period");
}

// Gate persistence: a validated session bypasses the password on query-string reloads.
{
  const {document,registry}=fakeDom();
  const hash="5a3b1ef9f7594ecbe03bff6d08366a452e210c3a6964f6a204fe620e1e3265f6";
  const context=vm.createContext({document,window:null,TextEncoder,
    sessionStorage:{getItem:()=>hash,setItem:()=>{}},crypto:globalThis.crypto});
  context.window=context;
  vm.runInContext(scripts[0],context,{filename:"gate.js"});
  assert.equal(context.__trainerAccessGranted,true);
  assert.equal(registry.gate.removed,true);
}

// Every default mode completes without NaN/Infinity or period/cap drift.
for(let mode=0;mode<=4;mode++){
  const {context}=makeContext(`?mode=${mode}&seed=17`);
  runToEnd(context);
}

// The analogy layer is a complete, stable set of 11 flavors with no missing vocabulary or events.
{
  const {context,registry}=makeContext("?mode=1&seed=19");
  const ids=Array.from(value(context,"FLAVORS"),flavor=>flavor.id);
  assert.deepEqual(ids,["deckbuilder","jrpg","fighting","agriculture","evolution","kitchen","f1","fishing","mixing","vc","dnd"]);
  assert.equal(new Set(ids).size,11);
  assert.equal(value(context,"ACTIVE_FLAVOR"),"jrpg");
  assert.equal((registry.flavorSelect.innerHTML.match(/<option /g)||[]).length,11);
  for(const id of ids){
    assert.equal(value(context,`Object.keys(FLAVOR_BY_ID[${JSON.stringify(id)}].terms).length`),22,`${id} has incomplete terms`);
    assert(value(context,`Object.values(FLAVOR_BY_ID[${JSON.stringify(id)}].terms).every(Boolean)`),`${id} has an empty term`);
    assert.equal(value(context,`Object.keys(FLAVOR_BY_ID[${JSON.stringify(id)}].metrics).length`),17,`${id} has incomplete metrics`);
    assert(value(context,`Object.values(FLAVOR_BY_ID[${JSON.stringify(id)}].metrics).every(Boolean)`),`${id} has an empty metric`);
    assert(value(context,`FLAVOR_BY_ID[${JSON.stringify(id)}].signature.length>30`),`${id} has no signature mapping`);
    assert.deepEqual(Array.from(value(context,`Object.keys(FLAVOR_BY_ID[${JSON.stringify(id)}].events)`)).sort(),
      ["copied","glut","influencer","ios","quiet","surge","viral"],`${id} has incomplete events`);
    for(const concept of ["day","performance","budget","creative","measurement","fatigue","platform","compliance","client","search","structure"]){
      const cue=value(context,`(()=>{ACTIVE_FLAVOR=${JSON.stringify(id)};return flavorCue(${JSON.stringify(concept)})})()`);
      assert(cue.length>20&&!cue.includes("undefined"),`${id}/${concept} produced a broken cue`);
    }
  }
  vm.runInContext('ACTIVE_FLAVOR="jrpg";render()',context);
  assert.match(registry.realityBar.innerHTML,/Platform-abstracted direct-response display\/native lead generation/);
  assert.match(registry.realityBar.innerHTML,/No single platform is simulated/);
  assert.match(registry.realityBar.innerHTML,/In-house-style/);
  assert.match(registry.realityBar.innerHTML,/JRPG Raid Party lens/);
  assert.match(registry.slots.innerHTML,/Ad ↔/);
  assert.match(registry.slots.innerHTML,/Creative ↔/);
  assert.match(registry.slots.innerHTML,/party member/);
  assert.match(value(context,'flavorCue("day")'),/combat turn.*battle plan/i);
  assert.match(value(context,'flavorCue("structure")'),/Account → Campaign → Ad Set\/Ad Group → Ad → Creative/);
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
  assert.match(registry.slots.innerHTML,/Ad ↔/);
  assert.equal(value(context,'statFlavorAlias("Spend")'),"gold spent");
  assert.equal(value(context,'statFlavorAlias("ROAS")'),"loot-per-gold multiplier");
  assert.equal(value(context,'statFlavorAlias("Unsettled")'),"loot awaiting identification");
}

// Every flavor boots and runs under every mode without contaminating the simulation surface.
for(const flavor of ["deckbuilder","jrpg","fighting","agriculture","evolution","kitchen","f1","fishing","mixing","vc","dnd"]){
  for(let mode=0;mode<=4;mode++){
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

// Boundary configurations: short/low and long/high runs use the chosen mechanics.
for(const search of [
  "?mode=0&stage=2&days=7&budget=50&seed=23",
  "?mode=0&stage=3&days=90&budget=5000&seed=23",
  "?mode=2&days=4&budget=5000&seed=23",
  "?mode=4&days=60&budget=100000&seed=23"
]){
  const {context}=makeContext(search);
  runToEnd(context);
}

// The configured account cap stops repeated +budget actions.
{
  const {context,registry}=makeContext("?mode=1&days=12&budget=5000&seed=31");
  const handler=registry.slots.listeners.click[0];
  for(let i=0;i<50;i++)handler({target:{closest:()=>({dataset:{act:"plus",i:"0"}})}});
  assert(value(context,"allocatedBudget()")<=value(context,"DAILY"));
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

// Audiovisual feedback stays optional, maps high-stakes cues correctly, and is RNG-neutral.
{
  for(const file of ["click_002.ogg","confirmation_004.ogg","drop_004.ogg","error_008.ogg",
    "glitch_004.ogg","maximize_008.ogg","tick_001.ogg"]){
    assert(fs.statSync(new URL(`../assets/audio/${file}`,import.meta.url)).size>1000,`${file} is missing or empty`);
  }
  const a=makeContext("?mode=1&seed=73"), b=makeContext("?mode=1&seed=73");
  assert.equal(value(a.context,"sfxEnabled"),false);
  vm.runInContext("setSfx(true,false)",a.context);
  assert.equal(value(a.context,"sfxEnabled"),true);
  assert.equal(a.registry.sfxBtn.textContent,"SFX ON");
  assert.equal(value(a.context,'fxCopy("review",{}).value'),"DELIVERY HOLD");
  assert.equal(value(a.context,'fxCopy("legendary",{name:"Unicorn"}).value'),"Unicorn");
  vm.runInContext('fireFx("jackpot",{profit:5000,roas:5.4});runDay()',a.context);
  vm.runInContext("runDay()",b.context);
  assert.equal(state(a.context).spendTotal,state(b.context).spendTotal);
  assert.equal(state(a.context).revenue,state(b.context).revenue);
  assert.deepEqual(Array.from(state(a.context).slots,s=>[s.fatigue,s.last?.rev]),
    Array.from(state(b.context).slots,s=>[s.fatigue,s.last?.rev]));
}

if(process.argv.includes("--report")){
  for(let mode=1;mode<=4;mode++){
    const rois=[], managed=[];
    for(let seed=1;seed<=100;seed++){
      const {context}=makeContext(`?mode=${mode}&seed=${seed}`);
      runToEnd(context);
      const s=state(context);
      rois.push(s.spendTotal?(s.revenue-s.spendTotal)/s.spendTotal*100:0);
      const managedRun=makeContext(`?mode=${mode}&seed=${seed}`).context;
      const days=value(managedRun,"DAYS");
      for(let day=0;day<days;day++){
        if(mode<4)vm.runInContext("S.slots.forEach(s=>{if(s.alive&&s.fatigue>48&&s.multiplies<MAX_MULT){s.fatigue=18;s.multiplies++;S.spendTotal+=600;S.telemetry.multiplies++;}})",managedRun);
        else vm.runInContext("S.slots.forEach(s=>{while(s.offerAtSec>1){s.offerAtSec--;S.spendTotal+=250}if(s.fatigue>52){s.fatigue=8;S.spendTotal+=1500;S.telemetry.recasts++;}})",managedRun);
        vm.runInContext("runDay()",managedRun);
      }
      const ms=state(managedRun);
      managed.push(ms.spendTotal?(ms.revenue-ms.spendTotal)/ms.spendTotal*100:0);
    }
    rois.sort((a,b)=>a-b);managed.sort((a,b)=>a-b);
    console.log(`mode ${mode} passive ROI: p10 ${rois[9].toFixed(1)}% · median ${rois[49].toFixed(1)}% · p90 ${rois[89].toFixed(1)}%`);
    console.log(`mode ${mode} refresh strategy: p10 ${managed[9].toFixed(1)}% · median ${managed[49].toFixed(1)}% · p90 ${managed[89].toFixed(1)}%`);
  }
}

console.log("media-buying-trainer smoke tests: ok");
