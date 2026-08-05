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
  for(const id of ["strip","slots","runBtn","log","binBtn","helpBtn","loreBtn","asksLeft","asksLabel",
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
function runNightmarePolicy(context,maxTurns=180){
  for(let turn=0;turn<maxTurns&&!state(context).ended;turn++){
    while(state(context).ops>0&&state(context).crises.length){const c=state(context).crises[0];
      const resolved=value(context,`NightmareEngine.resolveCrisis(${JSON.stringify(c.id)},${JSON.stringify(NIGHTMARE_RESPONSE[c.type])})`);
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
for(let mode=0;mode<=5;mode++){
  const {context}=makeContext(`?mode=${mode}&seed=17`);
  runToEnd(context);
}

// Modes 0–4 retain their pre-portfolio seed-97 numerical behavior.
{
  const classic=makeContext("?mode=0&stage=1&seed=97").context;
  runToEnd(classic);const s=state(classic);
  assert.equal(s.day,31);approx(s.spendTotal,6554.557988);approx(s.valueTotal,6066.323221);
  approx(s.convReported,72.886626);assert.equal(s.client.trust,38);approx(s.wasteTotal,2869.23567);
}
for(const fixture of [
  {mode:1,spend:176400,revenue:228831.0879,attributed:228831.0879,leads:16375.794881,reported:16375.794881,unknown:0},
  {mode:2,spend:176400,revenue:236654.522227,attributed:236654.522227,leads:16958.590519,reported:16958.590519,unknown:0},
  {mode:3,spend:176400,revenue:236654.522227,attributed:236654.522227,leads:16958.590519,reported:16958.590519,unknown:0},
  {mode:4,spend:192000,revenue:136839.264799,attributed:132396.913171,leads:6730.078149,reported:6356.823877,unknown:4442.351629}
]){
  const context=makeContext(`?mode=${fixture.mode}&seed=97`).context;runToEnd(context);const s=state(context);
  assert.equal(s.day,13);approx(s.spendTotal,fixture.spend);approx(s.revenue,fixture.revenue);
  approx(s.attributedRevenue,fixture.attributed);approx(s.leadsTotal,fixture.leads);
  approx(s.reportedLeadsTotal,fixture.reported);approx(s.unknownRev,fixture.unknown);
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
    for(const concept of ["day","performance","budget","creative","measurement","fatigue","platform","compliance","client","search","liquidity","portfolio","crisis","structure"]){
      const cue=value(context,`(()=>{ACTIVE_FLAVOR=${JSON.stringify(id)};return flavorCue(${JSON.stringify(concept)})})()`);
      assert(cue.length>20&&!cue.includes("undefined"),`${id}/${concept} produced a broken cue`);
    }
    for(const eventId of ["quiet","viral","auction","earned","ghost","signal","payout","flag","bidwar","fees","glut","copied","blackout","conquest"]){
      const eventText=value(context,`(()=>{ACTIVE_FLAVOR=${JSON.stringify(id)};return nightmareEventFlavorText(${JSON.stringify(eventId)})})()`);
      assert(eventText.length>20&&!eventText.includes("undefined"),`${id}/${eventId} produced a broken Nightmare event analogy`);
    }
  }
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return statFlavorAlias("Available credit")})()'),value(context,'FLAVOR_BY_ID.dnd.terms.budget'));
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return statFlavorAlias("Attribution gap")})()'),value(context,'FLAVOR_BY_ID.dnd.terms.attribution'));
  assert.equal(value(context,'(()=>{ACTIVE_FLAVOR="dnd";return statFlavorAlias("Projected contribution")})()'),value(context,'FLAVOR_BY_ID.dnd.metrics.profit'));
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
      `${pct(["ghost","signal","payout","flag","bidwar","blackout","conquest"])}% measurement/operations`;
  };
  assert(registry.accountBox.innerHTML.includes(expectedSummary()));
  const before=expectedSummary();
  vm.runInContext('NightmareEngine.events.find(event=>event.id==="quiet").weight=220;render()',context);
  assert.notEqual(expectedSummary(),before);
  assert(registry.accountBox.innerHTML.includes(expectedSummary()));
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
  assert.match(html,/\.meter\.fatigue i\{background:linear-gradient\(90deg,var\(--good\),var\(--warn\),var\(--bad\)\)/);
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
