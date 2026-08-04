import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);

class FakeElement{
  constructor(id,registry){this.id=id;this.registry=registry;this.style={};this.dataset={};this.listeners={};this.disabled=false;this.textContent="";this.value="";}
  set innerHTML(value){
    this._innerHTML=String(value);
    for(const match of this._innerHTML.matchAll(/\bid=["']([^"']+)["']/g)){
      if(!this.registry[match[1]])this.registry[match[1]]=new FakeElement(match[1],this.registry);
    }
  }
  get innerHTML(){return this._innerHTML||"";}
  addEventListener(type,handler){(this.listeners[type]||(this.listeners[type]=[])).push(handler);}
  querySelectorAll(){return [];}
  closest(){return null;}
  focus(){}
  remove(){this.removed=true;}
  getBoundingClientRect(){return {left:0,bottom:0};}
}

function fakeDom(){
  const registry={};
  for(const id of ["strip","slots","runBtn","log","binBtn","helpBtn","loreBtn","asksLeft",
    "asksRow","accountBox","pipeBox","overlay","seedLbl","runSummary","gate","pw","go","pwerr"]){
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

function makeContext(search="?mode=1&seed=7"){
  const {document,registry}=fakeDom();
  const storage=new Map();
  const location={search};
  const context=vm.createContext({
    console,document,location,URLSearchParams,TextEncoder,NodeFilter:{SHOW_TEXT:4},
    sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))},
    window:null,setTimeout,clearTimeout
  });
  context.window=context;
  vm.runInContext(scripts[1],context,{filename:"index.html"});
  return {context,registry};
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
