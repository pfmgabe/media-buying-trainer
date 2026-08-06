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
/* ---------------- game modes --------------------------------------------------------------
   Numeric route IDs remain stable for old links and checkpoints. The registry is the source
   of truth for presentation, engine dispatch metadata, configuration, and capabilities; mode
   numbers no longer have to imply that every higher number inherits every lower mechanic. */
const MODE_CAPABILITY_DEFAULTS=Object.freeze({
  historicalRules:false,searchOperations:false,clientRelationship:false,accountFunnel:false,
  creativeFatigue:false,settlementLag:false,creativePipeline:false,multiPlatform:false,
  portfolioSystems:false,crisisOperations:false,agencyGrowth:false,eraProgression:false,
  rosterManagement:false,technologyTree:false,affiliatePivot:false
});
function defineMode(spec){return Object.freeze({...spec,
  capabilities:Object.freeze({...MODE_CAPABILITY_DEFAULTS,...(spec.capabilities||{})}),
  config:Object.freeze({...spec.config})});}
const MODE_REGISTRY=Object.freeze({
  0:defineMode({id:0,key:"search-desk-2017",engine:"classic",scopeTitle:"Paid Search Account",
    title:"Search Desk — 2017 Client Account",runType:"challenge",roiTarget:40,
    objective:"Reach the period's prorated lead target while keeping the client above their retention line.",
    blurb:"Run one agency search account under simplified 2017 paid-search rules. Diagnose intent, match types, manual bids, Quality Score and the two opposite causes of lost impression share while managing a client who can leave even when the dashboard looks healthy.",
    capabilities:{historicalRules:true,searchOperations:true,clientRelationship:true},
    config:{days:30,budget:300,minDays:7,maxDays:90,minBudget:50,maxBudget:5000,inputStep:50,
      periodUnit:"days",budgetMeaning:"dailyAccountBudget"}}),
  1:defineMode({id:1,key:"closed-loop-account",engine:"modern",scopeTitle:"Single-Account Fundamentals",
    title:"Closed-Loop Account — One Client, One Funnel",runType:"challenge",roiTarget:40,
    objective:"Finish the run with all-in business return on investment (ROI) at or above 40%.",
    blurb:"Operate one account through four delivery slots. Learn the funnel, the difference between an ad and its creative, fatigue, saturation, measurement gaps, and what each allocation is meant to accomplish.",
    capabilities:{accountFunnel:true,creativeFatigue:true},
    config:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000,
      periodUnit:"days",budgetMeaning:"dailyAccountBudget"}}),
  2:defineMode({id:2,key:"settlement-lag",engine:"modern",scopeTitle:"Cash Flow and Attribution",
    title:"Working Capital — The Settlement Lag",runType:"challenge",roiTarget:40,
    objective:"Finish with all-in business return on investment (ROI) at or above 40% without mistaking unsettled value for failure.",
    blurb:"Run a single account while earned value settles two to three days late and inventory cost changes across the week. Make decisions from aligned evidence instead of chasing a cash-like total that is designed to lag.",
    capabilities:{accountFunnel:true,creativeFatigue:true,settlementLag:true},
    config:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000,
      periodUnit:"days",budgetMeaning:"dailyAccountBudget"}}),
  3:defineMode({id:3,key:"creative-pipeline",engine:"modern",scopeTitle:"Creative Operations",
    title:"Creative Operations — The Pipeline",runType:"challenge",roiTarget:40,
    objective:"Finish with all-in business return on investment (ROI) at or above 40% while keeping approved creative ready for delivery.",
    blurb:"Plan around a creative supply chain: builds take two to four days, compliance can request revisions or reject work and each live concept allows only a few controlled variations before it needs replacement. Empty delivery slots are an operations failure, not an algorithm mystery.",
    capabilities:{accountFunnel:true,creativeFatigue:true,settlementLag:true,creativePipeline:true},
    config:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000,
      periodUnit:"days",budgetMeaning:"dailyAccountBudget"}}),
  4:defineMode({id:4,key:"channel-command",engine:"modern",scopeTitle:"Cross-Platform Account",
    title:"Channel Command — Four-Platform Account",runType:"challenge",roiTarget:25,
    objective:"Finish the cross-platform run with all-in business return on investment (ROI) at or above 25%.",
    blurb:"Command one account across four platform lanes with different auction, attention, capacity, settlement and attribution behavior. Balance concentration and overlap, move offer timing, rewrite geographic wording when relevance slips and change the presenter when the creative itself is tired.",
    capabilities:{accountFunnel:true,creativeFatigue:true,settlementLag:true,creativePipeline:true,multiPlatform:true},
    config:{days:12,budget:20000,minDays:4,maxDays:60,minBudget:5000,maxBudget:100000,inputStep:1000,
      periodUnit:"days",budgetMeaning:"dailyAccountBudget"}}),
  5:defineMode({id:5,key:"holding-company-nightmare",engine:"nightmare",scopeTitle:"Holding-Company Portfolio",
    title:"Portfolio Command — Holding Company Nightmare",runType:"full-run",roiTarget:40,
    objective:"Pass three consecutive 30-day acquisition gates and clear the portfolio contribution threshold before liquidity fails.",
    blurb:"Operate six advertiser workstreams across selectable search, social, demand-generation and programmatic or connected TV lanes. Shared cash, credit, event sources, attribution claims and finite demand connect every decision. Crises are tied to a specific ad, account, tracking source or payment problem.",
    capabilities:{searchOperations:true,accountFunnel:true,creativeFatigue:true,settlementLag:true,
      multiPlatform:true,portfolioSystems:true,crisisOperations:true},
    config:{days:90,budget:150000,minDays:90,maxDays:180,periodStep:30,minBudget:25000,maxBudget:500000,inputStep:5000,
      periodUnit:"days",budgetMeaning:"dailyPortfolioAuthorization"}}),
  6:defineMode({id:6,key:"agency-career",engine:"agency-career",scopeTitle:"Agency Career",
    title:"Agency Career — The Decade: 2017–2027",runType:"career",roiTarget:40,
    objective:"Grow from one client to a durable agency — or an affiliate scaling engine — and clear the career profit target by 2027.",
    blurb:"Begin in 2017 with one small-business lead-generation client, then build a roster, choose which prospects deserve scarce capacity, hire and specialize, unlock new buying disciplines, and adapt as platform rules change. The ten-year campaign preserves agency progress even if the business later pivots into an affiliate scaling engine.",
    capabilities:{historicalRules:true,searchOperations:true,clientRelationship:true,accountFunnel:true,
      creativeFatigue:true,settlementLag:true,creativePipeline:true,multiPlatform:true,
      portfolioSystems:true,crisisOperations:true,agencyGrowth:true,eraProgression:true,
      rosterManagement:true,technologyTree:true,affiliatePivot:true},
    config:{days:120,budget:25000,minDays:120,maxDays:120,periodStep:1,minBudget:10000,maxBudget:250000,inputStep:5000,
      periodUnit:"months",budgetMeaning:"startingReserve",fixedPeriod:true}})
});
const MODE_IDS=Object.freeze(Object.keys(MODE_REGISTRY).map(Number));
const MODE = (function(){const m=parseInt(new URLSearchParams(location.search).get("mode"),10);
  return Number.isInteger(m)&&Object.prototype.hasOwnProperty.call(MODE_REGISTRY,m)?m:1;})();
const MODE_SPEC=MODE_REGISTRY[MODE],MODE_CAPABILITIES=MODE_SPEC.capabilities;
function modeHas(capability){return MODE_CAPABILITIES[capability]===true;}
const CONFIG_SPECS=Object.freeze(Object.fromEntries(MODE_IDS.map(id=>[id,MODE_REGISTRY[id].config])));
const MODE_NAME=Object.freeze(Object.fromEntries(MODE_IDS.map(id=>[id,MODE_REGISTRY[id].title])));
const MODE_BLURB=Object.freeze(Object.fromEntries(MODE_IDS.map(id=>[id,MODE_REGISTRY[id].blurb])));
const MODE_OBJECTIVE=Object.freeze(Object.fromEntries(MODE_IDS.map(id=>[id,MODE_REGISTRY[id].objective])));
const MODE_SCOPE_TITLE=Object.freeze(Object.fromEntries(MODE_IDS.map(id=>[id,MODE_REGISTRY[id].scopeTitle])));
const MODE_RUN_TYPE=Object.freeze(Object.fromEntries(MODE_IDS.map(id=>[id,MODE_REGISTRY[id].runType])));
const RUN_TYPE_LABEL=Object.freeze({challenge:"Challenge",tutorial:"Tutorial","full-run":"Full run",career:"Career"});
function modeRunTypeLabel(mode=MODE,tutorial=false){
  const key=tutorial&&Number(mode)===1?"tutorial":MODE_RUN_TYPE[mode]||"challenge";
  return RUN_TYPE_LABEL[key]||RUN_TYPE_LABEL.challenge;
}
/* Menu copy is deliberately much smaller than the simulation descriptions above. The opening
   flow uses it to answer only three questions: what fantasy am I choosing, how demanding is it,
   and what will I learn? Detailed mechanics stay inside the contextual briefing and Field Guide. */
const MODE_MENU_META=Object.freeze({
  0:Object.freeze({icon:"🔎",intent:"practice",difficulty:"Focused",session:"25–40 minutes",
    promise:"Diagnose a paid-search account while earning a demanding client's trust.",
    watch:Object.freeze(["Search intent","Quality Score","Client trust"])}),
  1:Object.freeze({icon:"🎯",intent:"learn",difficulty:"Guided",session:"15–25 minutes",
    promise:"Learn the core loop inside one client, one funnel, and four clear decisions.",
    watch:Object.freeze(["Allocation","Funnel movement","Creative fatigue"])}),
  2:Object.freeze({icon:"💳",intent:"practice",difficulty:"Intermediate",session:"20–30 minutes",
    promise:"Stay profitable while cash, attribution, and earned value arrive on different clocks.",
    watch:Object.freeze(["Settled cash","Modeled value","Timing gaps"])}),
  3:Object.freeze({icon:"🎬",intent:"practice",difficulty:"Intermediate",session:"20–35 minutes",
    promise:"Keep delivery alive by planning, approving, and rotating a real creative pipeline.",
    watch:Object.freeze(["Ready inventory","Approval timing","Fatigue"])}),
  4:Object.freeze({icon:"🛰️",intent:"practice",difficulty:"Advanced",session:"25–40 minutes",
    promise:"Run one account across four buying lanes without confusing local wins for account health.",
    watch:Object.freeze(["Lane capacity","Overlap","Account ROI"])}),
  5:Object.freeze({icon:"⚠️",intent:"campaign",difficulty:"Expert",session:"45–90 minutes",
    promise:"Survive a volatile multi-business portfolio where cash, credit, pixels, and claims collide.",
    watch:Object.freeze(["Liquidity","True portfolio return","Concentration risk"])}),
  6:Object.freeze({icon:"🏢",intent:"campaign",difficulty:"Career",session:"Multi-session",
    promise:"Build a media-buying business from one 2017 client to a durable 2027 operation.",
    watch:Object.freeze(["Team capacity","Client mix","Agency profit"])}),
});
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
const ROI_TARGET=MODE_SPEC.roiTarget;
saveConfigFor(MODE,RUN_CONFIG);
