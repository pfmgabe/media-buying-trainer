"use strict";
/* ---------------- deterministic RNG so two people can compare the same run ---------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function keyedRandom(...parts){
  let hash=2166136261;
  const input=parts.map(part=>String(part)).join("|");
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return mulberry32(hash>>>0)();
}
/* Seeds stay inside a documented signed-32-bit range so every accepted value is a
   positive safe integer, survives JSON exactly, and feeds the bitwise RNG predictably. */
const SEED_MIN=1,SEED_MAX=2147483647,DEFAULT_SEED=7;
function validSeed(value){return Number.isSafeInteger(value)&&value>=SEED_MIN&&value<=SEED_MAX;}
function parseSeed(raw){
  if(typeof raw!=="string"||!/^\d+$/.test(raw.trim()))return DEFAULT_SEED;
  const value=Number(raw);return validSeed(value)?value:DEFAULT_SEED;
}
const SEED=parseSeed(new URLSearchParams(location.search).get("seed"));
/* ---------------- difficulty modes: each stage adds mechanics, never removes them -------- */
const MODE = (function(){const m=parseInt(new URLSearchParams(location.search).get("mode"),10);
  return (m>=0&&m<=5)?m:1;})();
const CONFIG_SPECS={
  0:{days:30,budget:300,minDays:7,maxDays:90,minBudget:50,maxBudget:5000,inputStep:50},
  1:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000},
  2:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000},
  3:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000},
  4:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000},
  5:{days:90,budget:150000,minDays:90,maxDays:180,periodStep:30,minBudget:25000,maxBudget:500000,inputStep:5000}
};
const CONFIG_KEY="media-buying-trainer-config-v1";
function readSavedConfigs(){
  try{const saved=JSON.parse(sessionStorage.getItem(CONFIG_KEY)||"{}");
    return saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{};
  }catch(e){return {};}
}
function cleanConfig(mode,raw){
  const spec=CONFIG_SPECS[mode], source=raw||{};
  const rawDays=source.days===""?NaN:Number(source.days);
  const rawBudget=source.budget===""?NaN:Number(source.budget);
  const periodStep=spec.periodStep||1;
  const days=Math.max(spec.minDays,Math.min(spec.maxDays,
    Number.isFinite(rawDays)?Math.round(rawDays/periodStep)*periodStep:spec.days));
  const unclamped=Number.isFinite(rawBudget)?rawBudget:spec.budget;
  const budget=Math.max(spec.minBudget,Math.min(spec.maxBudget,
    Math.round(unclamped/spec.inputStep)*spec.inputStep));
  return {days,budget};
}
function savedConfigFor(mode){return cleanConfig(mode,readSavedConfigs()[mode]);}
function saveConfigFor(mode,config){
  const all=readSavedConfigs(); all[mode]=cleanConfig(mode,config);
  try{sessionStorage.setItem(CONFIG_KEY,JSON.stringify(all));}catch(e){}
  return all[mode];
}
const QUERY=new URLSearchParams(location.search);
const AUTO_START=QUERY.get("autostart")==="1";
const SAVED_CONFIG=savedConfigFor(MODE);
const RUN_CONFIG=cleanConfig(MODE,{
  days:QUERY.has("days")?QUERY.get("days"):SAVED_CONFIG.days,
  budget:QUERY.has("budget")?QUERY.get("budget"):SAVED_CONFIG.budget
});
const RUN_DAYS=RUN_CONFIG.days, DAILY_BUDGET=RUN_CONFIG.budget;
const BUDGET_STEP=MODE===0?0:Math.max(250,Math.round((DAILY_BUDGET*0.05)/50)*50);
const ROI_TARGET=MODE===4?25:40;
saveConfigFor(MODE,RUN_CONFIG);
const MODE_NAME={0:"Mode 0 · Classic (2017)",1:"Mode 1 · Single Account",2:"Mode 2 · Lag & Settlement",
                 3:"Mode 3 · Creative Pipeline",4:"Mode 4 · Four Platforms",
                 5:"Mode 5 · Agency / Holding Co. Nightmare"};
const MODE_BLURB={
 0:"<b>A different game.</b> Search PPC at an agency in 2017: keywords and match types instead of "+
   "audiences and creative, manual bids, Quality Score, and impression share you can lose two "+
   "opposite ways. It has a second scoreboard — <b>a client who can fire you "+
   "while the numbers are fine.</b> Its own three-stage track.",
 1:"One account, four slots. Learn the funnel, fatigue, saturation and what spend is FOR.",
 2:"Everything in Mode 1, plus revenue that <b>settles two to three days late</b> — so you decide "+
   "before you know what a lead was worth — and cost that swings with the day of the week.",
 3:"Everything in Mode 2, plus you must <b>request creative</b> and wait for it: a 2-4 day build, "+
   "then a compliance review that can come back with revisions. Each slot can only be multiplied "+
   "twice before its axes are exhausted, so an empty slot is your own planning failure.",
 4:"Everything above, on <b>four platforms at once</b>, each with its own physics. Costs inflate "+
   "every day you play. Demand rises then falls on its own. Two slots on one platform eat each "+
   "other's audience. A late offer reveal kills completion. State swaps buy relevance but NOT "+
   "fresh attention — only a new face does, so <b>Multiply splits into Restate and Recast here</b>. And one platform reports its creative as a hash, so "+
   "part of your revenue is unattributable. Target is 25%.",
 5:"A separate portfolio engine: six synthetic advertiser workstreams can open parallel initiatives while sharing business containers, deliberately misconfigured event sources, cash, "+
   "credit, and attribution paths across eight freely selectable lanes. Search has volume ceilings; "+
   "social has creative fatigue; CTV has view-through ambiguity. Survive operational crises and pass "+
   "three consecutive 30-day acquisition gates. Every advertiser and financial outcome is synthetic."};
