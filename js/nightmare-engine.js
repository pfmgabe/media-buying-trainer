"use strict";
/* ---------------- Mode 5: entirely synthetic holding-company portfolio engine ----------
   This is deliberately separate from the slot engine above. No Mode 5 advertiser, business,
   cash flow or outcome represents a real company or account. Real platform names identify the
   buying discipline only. Keyed rolls keep one advertiser's action from re-dealing everyone
   else's future and make presentation/flavor changes provably RNG-neutral. */
const NightmareEngine=(()=>{
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const round50=n=>Math.round(n/50)*50;
  const expandedWorkstreamIds=new Set(),autoOpenedCrisisIds=new Set();
  let workstreamExpansionReady=false,financeDrawerOpen=false;
  const displayName=value=>String(value||"").replace(/^Fictional\s*·\s*/i,"");
  const displayCopy=value=>String(value||"").replace(/Fictional\s*·\s*/gi,"").replace(/\bfictional\b\s*/gi,"");
  const LANES={
    google_search:{name:"Google Ads — Search",family:"Google",kind:"search",baseCost:4.35,volumeM:1,
      claim:1.05,fatigue:0,hierarchy:"Campaign → ad group → keyword + search ad",
      note:"Intent capture. Bid and Quality Score win impression share, but finite query volume caps scale."},
    google_dgen:{name:"Google Ads — Demand Gen",family:"Google",kind:"demand",baseCost:11.60,ctrM:.92,cvrM:1.05,
      claim:1.18,fatigue:.82,hierarchy:"Campaign → ad group → ad + creative assets",
      note:"Visual demand creation. Creative and audience signals matter; it can scale beyond search volume."},
    microsoft_search:{name:"Microsoft Advertising — Search",family:"Microsoft",kind:"search",baseCost:3.70,volumeM:.58,
      claim:1.03,fatigue:0,hierarchy:"Campaign → ad group → keyword + search ad",
      note:"Independent search demand. Imports are a starting point; query mix, bids and negatives still need work."},
    meta:{name:"Meta Ads",family:"Meta",kind:"social",baseCost:17.40,ctrM:1.02,cvrM:1.04,
      claim:1.27,fatigue:1.05,hierarchy:"Campaign → ad set → ad + creative",
      note:"Interruption media. Creative × offer × audience drives delivery; fatigue and learning constrain scale."},
    tiktok:{name:"TikTok Ads",family:"TikTok",kind:"social",baseCost:9.60,ctrM:1.42,cvrM:.75,
      claim:1.36,fatigue:1.48,hierarchy:"Campaign → ad group → ad + creative",
      note:"Fast native attention and fast fatigue. Cheap clicks are not the same as retained value."},
    snap:{name:"Snapchat Ads",family:"Snapchat",kind:"social",baseCost:8.90,ctrM:1.27,cvrM:.69,
      claim:1.24,fatigue:1.28,hierarchy:"Campaign → ad squad → ad + creative",
      note:"Mobile visual interruption. Creative fit and downstream quality matter more than swipe volume."},
    linkedin:{name:"LinkedIn Campaign Manager",family:"LinkedIn",kind:"social",baseCost:37.80,ctrM:.58,cvrM:1.52,
      claim:1.09,fatigue:.66,hierarchy:"Campaign → ad set → ad + creative",
      note:"Expensive professional reach. Front-end CPL can look poor while qualified pipeline stays valuable."},
    ctv:{name:"Platform-abstracted Programmatic / CTV",family:"Programmatic / CTV",kind:"ctv",baseCost:13.20,ctrM:.02,cvrM:1,
      claim:1.58,fatigue:.45,hierarchy:"Advertiser → campaign / insertion order → line item → creative. Measurement: exposure log + modeled view-through attribution",
      note:"Reach without dependable clicks. View-through claims require blended measurement and restraint."}
  };
  const LANE_ORDER=["google_search","google_dgen","microsoft_search","meta","tiktok","snap","linkedin","ctv"];
  const FICTIONAL_ACCOUNTS=[
    {id:"quasar",name:"Fictional · Quasar Kettleworks",business:"Fictional · Paper Moon Commerce",pixel:"prism",
      vertical:"direct-to-consumer kitchenware",objective:"new-customer purchases",defaultLane:"meta",share:.25,
      value:112,baseCtr:1.08,baseCvr:.028,searchVolume:12600,searchCpcM:1,viewRate:.00016,payoutLag:6,
      fit:{meta:1.18,tiktok:1.05,google_search:1.08,google_dgen:1.14,microsoft_search:.92,snap:.94,linkedin:.58,ctv:.82}},
    {id:"cloudbadger",name:"Fictional · Cloudbadger Homeworks",business:"Fictional · Blue Comet Services",pixel:"ember",
      vertical:"multi-market home services",objective:"qualified booked appointments",defaultLane:"google_search",share:.20,
      value:78,baseCtr:.93,baseCvr:.048,searchVolume:14400,searchCpcM:1.08,viewRate:.00012,payoutLag:5,
      fit:{google_search:1.26,microsoft_search:1.15,meta:.96,google_dgen:.91,tiktok:.68,snap:.66,linkedin:.74,ctv:.72}},
    {id:"lattice",name:"Fictional · Lattice Llama Systems",business:"Fictional · Hollow Signal Labs",pixel:"quartz",
      vertical:"business-to-business workflow software",objective:"qualified sales opportunities",defaultLane:"linkedin",share:.17,
      value:610,baseCtr:.66,baseCvr:.021,searchVolume:3400,searchCpcM:1.72,viewRate:.000035,payoutLag:10,
      fit:{linkedin:1.31,google_search:1.16,microsoft_search:.93,google_dgen:.86,meta:.76,tiktok:.55,snap:.52,ctv:.70}},
    {id:"wyvern",name:"Fictional · Pocket Wyvern Arcade",business:"Fictional · Hollow Signal Labs",pixel:"quartz",
      vertical:"mobile puzzle game",objective:"retained players and payer value",defaultLane:"tiktok",share:.14,
      value:39,baseCtr:1.42,baseCvr:.041,searchVolume:6200,searchCpcM:.72,viewRate:.00033,payoutLag:8,
      fit:{tiktok:1.29,snap:1.18,meta:1.04,google_dgen:1.13,google_search:.74,microsoft_search:.61,linkedin:.44,ctv:1.05}},
    {id:"orchard",name:"Fictional · Orbit Orchard Supper Club",business:"Fictional · Paper Moon Commerce",pixel:"prism",
      vertical:"subscription meal service",objective:"retained paid subscriptions",defaultLane:"google_dgen",share:.13,
      value:91,baseCtr:1.03,baseCvr:.026,searchVolume:8900,searchCpcM:1.05,viewRate:.00015,payoutLag:7,
      fit:{meta:1.16,google_dgen:1.13,tiktok:1.04,google_search:.98,microsoft_search:.82,snap:.92,linkedin:.55,ctv:.84}},
    {id:"anvil",name:"Fictional · Velvet Anvil Academy",business:"Fictional · Blue Comet Services",pixel:"ember",
      vertical:"professional online education",objective:"qualified enrollments after refunds",defaultLane:"ctv",share:.08,
      value:238,baseCtr:.82,baseCvr:.023,searchVolume:5200,searchCpcM:1.34,viewRate:.000075,payoutLag:11,
      fit:{google_search:1.21,linkedin:1.11,meta:1.03,google_dgen:1.02,microsoft_search:.91,tiktok:.71,snap:.65,ctv:1.08}}
  ];
  const PIXEL_BLUEPRINTS=[
    {id:"prism",name:"Prism shared event-source cluster",business:"Fictional · Paper Moon Commerce",members:["quasar","orchard"],purity:.92},
    {id:"ember",name:"Ember shared event-source cluster",business:"Fictional · Blue Comet Services",members:["cloudbadger","anvil"],purity:.90},
    {id:"quartz",name:"Quartz shared event-source cluster",business:"Fictional · Hollow Signal Labs",members:["lattice","wyvern"],purity:.91}
  ];
  const EVENTS=[
    {id:"quiet",weight:22,tone:"",concept:"day",title:"No systemic shock",body:"Ordinary auction noise; portfolio structure and allocation decide the day.",global:true},
    {id:"viral",weight:8,tone:"good",concept:"creative",title:"Creative breakout pocket",body:"One active initiative found unusually cheap, responsive attention for one period.",cpmM:.68,cvrM:1.38,targetKind:"interrupt",laneSensitive:true,creativeSensitive:true},
    {id:"auction",weight:8,tone:"bad",concept:"platform",title:"Auction regime shift",body:"Inventory prices rose while creative quality stayed unchanged.",cpmM:1.42,global:true},
    {id:"earned",weight:8,tone:"good",concept:"measurement",title:"Earned-demand spike",body:"External attention lifted demand; last-click reports may over-credit paid media.",cvrM:1.62},
    {id:"ghost",weight:7,tone:"bad",concept:"measurement",title:"Ghost traffic anomaly",body:"Clicks and platform claims no longer reconcile with modeled business outcomes.",crisis:"ghost_attribution",laneSensitive:true},
    {id:"signal",weight:7,tone:"bad",concept:"measurement",title:"Event-source signal drift",body:"Mixed conversion signals are degrading a shared event-source cluster.",crisis:"pixel_contamination",pixelSensitive:true},
    {id:"payout",weight:6,tone:"bad",concept:"performance",title:"Receivable payout delay",body:"An advertiser's modeled outcome value will become cash later than forecast.",crisis:"payout_delay"},
    {id:"flag",weight:5,tone:"bad",concept:"compliance",title:"False policy flag",body:"One platform ad account is held for review; changing its creative cannot fix an account-level hold.",crisis:"false_flag",laneSensitive:true},
    {id:"bidwar",weight:7,tone:"bad",concept:"search",title:"Core-query bid war",body:"A competitor raised search auction pressure; higher bids and better relevance have different costs.",crisis:"bid_war",targetKind:"search",laneSensitive:true},
    {id:"fees",weight:7,tone:"bad",concept:"budget",title:"Billing adjustment shock",body:"Fees and reconciliation adjustments widen the gap between media delivery and billed cost.",feeM:1.075,global:true},
    {id:"glut",weight:8,tone:"good",concept:"platform",title:"Inventory glut",body:"More eligible inventory opened; the same allocation can buy more reach.",cpmM:.79,global:true},
    {id:"copied",weight:7,tone:"bad",concept:"fatigue",title:"Competitor copied the hook",body:"The targeted creative jumps toward exhaustion; the advertiser and platform campaign still exist.",targetKind:"interrupt",laneSensitive:true,creativeSensitive:true},
    {id:"blackout",weight:5,tone:"bad",concept:"measurement",title:"Attribution blackout",body:"Reported credit drops for a day while modeled outcomes and receivables continue.",claimM:.46,global:true},
    {id:"conquest",weight:5,tone:"bad",concept:"search",title:"Brand-search conquest",body:"This advertiser's interruption media created branded demand that competitors may capture if its own search protection is thin.",crisis:"brand_conquest"},
    {id:"quality",weight:7,tone:"bad",concept:"performance",title:"Downstream lead-quality escalation",
      body:"Campaign operations has flagged a quality decline and opened competing creative, geography, ad-account learning, shared event-source and downstream-acceptance hypotheses.",
      crisis:"lead_quality_escalation",targetKind:"interrupt"}
  ];
  const CRISIS_COPY={
    ghost_attribution:{title:"Ghost attribution",scope:"measurement",body:"Is this bot/fraud injection or legitimate assisted demand with a broken join?",
      a:["audit","Audit event joins","Reveals the hidden cause and improves future attribution."],
      b:["quarantine","Quarantine the lane","Stops one day of delivery; protects quality if it is fraud, destroys momentum if it is real."]},
    pixel_contamination:{title:"Event-source contamination",scope:"shared event source",body:"Two verticals are training one deliberately misconfigured signal pool and leaking claims across accounts.",
      a:["clean","Repair event mapping","Cheaper; improves simulated signal integrity but keeps the shared dependency."],
      b:["isolate","Separate conversion source","Creates a clean source and resets learning for the affected initiative."]},
    payout_delay:{title:"Payout delay",scope:"receivables",body:"Modeled profit exists, but the cash will not arrive before near-term bills clear.",
      a:["factor","Factor receivables","Collect now with a haircut."],b:["wait","Wait for full value","Keep the value and accept the liquidity risk."]},
    false_flag:{title:"Account verification / policy hold",scope:"ad account",body:"This is an account-level delivery issue, not evidence that the creative failed.",
      a:["appeal","Submit appeal","Cheaper and slower; preserves learning."],b:["migrate","Migrate eligible delivery","Faster and expensive; resets learning and isolates measurement."]},
    bid_war:{title:"Search bid war",scope:"search lane",body:"Auction pressure rose. Buying rank and earning rank are different responses.",
      a:["relevance","Rebuild relevance","Raises Quality Score and trims wasted queries."],b:["raise","Raise bids","Recovers share now but makes each click more expensive."]},
    payment_failure:{title:"Shared credit payment failure",scope:"holding company",body:"A bill reached its due date before enough receivables became cash; platform learning is at risk.",
      a:["paydown","Clear the overdue balance with cash","Available only when cash can fully clear the triggering oldest balance; the operations action covers recovery and reinstatement."],b:["pause","Pause the largest account","Protects liquidity but sacrifices delivery and learning."]},
    brand_conquest:{title:"Brand-search conquest",scope:"advertiser demand",body:"This advertiser's social and visual demand is creating branded search volume; its own coverage is below the protection threshold.",
      a:["protect","Fund brand protection","Improves capture for the next seven days."],b:["concede","Concede marginal demand","No fee, but competitors keep part of the generated demand."]},
    lead_quality_escalation:{title:"Lead-quality escalation",scope:"account operations",
      body:"Downstream quality softened. Treat creative, geography, ad-account learning, event-source integrity and acceptance criteria as competing hypotheses — not interchangeable explanations."}
  };
  const CREATIVE_NAMES=["User-generated content unboxing","Founder Demo","Problem / Solution Cut","Static Comparison",
    "Tutorial Hook","Customer Story","Offer Reveal","Product-in-Use Montage"];
  const TIERS=[
    {name:"Common",cls:"common",weight:.62,boost:1,fatigue:1},
    {name:"Epic",cls:"epic",weight:.30,boost:1.20,fatigue:.86},
    {name:"Legendary",cls:"legendary",weight:.08,boost:1.46,fatigue:1.35}
  ];
  const fallbackFormat=(id,label,mark)=>({id,label,mark,tone:"cyan",system:"modular",kind:"creative style",
    description:"A creative execution with relative response, quality, fatigue, production and placement-fit tradeoffs.",
    production:"Format-dependent production",tradeoff:"Production and placement fit",productionDays:2,productionCostM:1,
    reviewRiskM:1,volatility:1,cpmM:1,ctrM:1,cvrM:1,qualityM:1,fatigueM:1,satBonus:500,fit:{},styleFit:{}});
  const FALLBACK_FORMATS=Object.fromEntries([
    ["story","Story Ad (Stories)","📱"],["vsl","VSL","🎬"],["podcast","Podcast","🎙️"],
    ["slideshow","Slideshow","🗂️"],["veo","Veo (AI-generated video)","✨"],["news_greenscreen","News Greenscreen","🗞️"],
    ["documentary","Nat Geo Documentary","🦌"],["meme","Memes","😄"],["voicemail","Voicemail","📞"],
    ["static","Static","🖼️"],["animation","Animation","🎞️"],["branded","Branded","🏷️"],
    ["native_long_copy","Native Long-Copy","📜"],["long_copy_video","Long-Copy to Video","📽️"],
    ["search","Search text / assets","🔍"]
  ].map(([id,label,mark])=>[id,fallbackFormat(id,label,mark)]));
  const FORMAT_DECK={
    google_dgen:["static","slideshow","animation","branded","vsl","documentary","long_copy_video","podcast","veo","news_greenscreen"],
    meta:["story","native_long_copy","podcast","static","slideshow","animation","vsl","veo","news_greenscreen","meme","voicemail","branded","documentary","long_copy_video"],
    tiktok:["story","veo","news_greenscreen","meme","voicemail","slideshow","animation","podcast","long_copy_video"],
    snap:["story","meme","voicemail","veo","slideshow","animation","news_greenscreen"],
    linkedin:["native_long_copy","podcast","branded","vsl","documentary","long_copy_video","static","animation"],
    ctv:["documentary","branded","vsl","long_copy_video","podcast","animation","veo"],
    google_search:["search"],microsoft_search:["search"]
  };
  const FORMAT_NAMES={
    story:["First-Person Story Hook","Three-Beat Problem Story"],vsl:["Mechanism-to-Offer VSL","Proof-Stack Sales Letter"],
    podcast:["Host-and-Guest Proof Clip","Interview Objection Cut"],slideshow:["Five-Frame Benefit Sequence","Proof-Card Slideshow"],
    veo:["Generated Scenario Test","Synthetic Product Moment"],news_greenscreen:["Headline Reaction Explainer","Source-on-Screen Breakdown"],
    documentary:["Field-Story Documentary","Cinematic Customer Journey"],meme:["Relatable Reaction Meme","Expectation / Reality Meme"],
    voicemail:["Missed-Call Curiosity Hook","Recorded-Message Reveal"],static:["Static Comparison","Single-Frame Proof"],
    animation:["Mechanism Animation","Problem / Solution Motion"],branded:["Polished Brand Story","Product Demonstration Film"],
    native_long_copy:["Native Customer Story","In-Feed Proof Letter"],long_copy_video:["Narrated Long-Copy Cut","Chaptered Sales Story"],
    search:["Responsive Search Assets"]
  };

  function hashText(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
  function roll(stream,day,key="",salt=0){return mulberry32(hashText(`${SEED}|nightmare|${stream}|${day}|${key}|${salt}`))();}
  function weighted(list,r){const total=list.reduce((n,x)=>n+x.weight,0);let cursor=r*total;
    for(const item of list){cursor-=item.weight;if(cursor<=0)return item;}return list[0];}
  function eventDeckSummary(){const total=EVENTS.reduce((n,e)=>n+e.weight,0),pct=ids=>Math.round(EVENTS.filter(e=>ids.includes(e.id)).reduce((n,e)=>n+e.weight,0)/total*100);
    return `${pct(["quiet"])}% ordinary · ${pct(["viral","earned","glut"])}% upside · ${pct(["auction","fees","copied"])}% auction/fee/fatigue · ${pct(["ghost","signal","payout","flag","bidwar","blackout","conquest","quality"])}% measurement/operations`;}
  function accountById(state,id){return state.accounts.find(a=>a.id===id);}
  function pixelById(state,id){return state.pixels.find(p=>p.id===id);}
  function brandIdFor(a){return a.brandId||a.id;}
  function brandAccounts(state,aOrBrand){const id=typeof aOrBrand==="string"?aOrBrand:brandIdFor(aOrBrand);
    return state.accounts.filter(a=>brandIdFor(a)===id);}
  function pixelBrandCount(state,p){return new Set(p.members.map(id=>accountById(state,id)).filter(Boolean).map(brandIdFor)).size;}
  function activePixelBrandCount(state,p){return new Set(p.members.map(id=>accountById(state,id)).filter(a=>a&&!a.paused&&a.budget>0).map(brandIdFor)).size;}
  function laneFit(a,laneId){return a.fit[laneId]||.65;}
  function availableCredit(state){return Math.max(0,state.finance.creditLimit-state.finance.creditUsed);}
  function allocated(state){return state.accounts.reduce((n,a)=>n+(!a.paused?a.budget:0),0);}
  function canIncreaseAllocation(state,a,step=BUDGET_STEP){
    return allocated(state)+(a.paused?a.budget:0)+step<=DAILY;
  }
  function platformLabel(a){return LANES[a.platform].name;}
  function formatCatalog(){return typeof CREATIVE_FORMATS!=="undefined"?CREATIVE_FORMATS:FALLBACK_FORMATS;}
  function creativeFormat(a){
    if(typeof creativeFormatById==="function"&&LANES[a.platform]?.kind!=="search")return creativeFormatById(a.creative?.format);
    const catalog=formatCatalog();return catalog[a.creative?.format]||catalog[LANES[a.platform]?.kind==="search"?"search":"static"]||FALLBACK_FORMATS.static;}
  function formatFit(a,format){const fit=format.fit||{},family=(LANES[a.platform]?.family||"").toLowerCase();
    return fit[a.platform]||fit[family]||fit[family.split(" ")[0]]||1;}
  function buyingStyle(a){
    if(/mobile|game|app/i.test(`${a.vertical} ${a.objective}`))return "app";
    if(/b2b|professional|pipeline|software|education/i.test(`${a.vertical} ${a.objective}`))return "b2b";
    if(/dtc|commerce|subscription|purchase|customer/i.test(`${a.vertical} ${a.objective}`))return "commerce";
    if(/awareness|reach|brand/i.test(`${a.vertical} ${a.objective}`))return "brand";
    return "lead_gen";}
  function formatStyleFit(a,format){return Number(format.styleFit&&format.styleFit[buyingStyle(a)])||1;}
  function defaultFormatId(laneId){const deck=FORMAT_DECK[laneId]||["static"];return deck[0];}
  function qualityDefinition(){return typeof QUALITY_ESCALATION!=="undefined"?QUALITY_ESCALATION:{
    causes:["creative_fit","account_learning","signal_contamination","geo_leak","downstream_shift"],choices:{
      account_test:{label:"Account-only A/B",detail:"Match every other variable to isolate ad-account learning."},
      signal_test:{label:"Event-source-only A/B",detail:"Match account and creative to isolate event-source contamination."},
      creative_test:{label:"Creative-only refresh",detail:"Replace only the active asset."},
      clean_migration:{label:"Clean-stack migration",detail:"Change account and event source together; recovery has weak causal evidence."},
      observe:{label:"Correct geo and observe",detail:"Remove excluded regions without disturbing the rest of the stack."},
      cohort:{label:"Await cohort-quality report",detail:"Preserve the setup until downstream acceptance evidence matures."}
    },dialogue:[]};}
  function qualityCause(day,targetId){const allowed=new Set(qualityDefinition().causes||[]),weights={creative_fit:26,account_learning:22,
      signal_contamination:20,geo_leak:15,downstream_shift:17};
    const causes=Object.entries(weights).filter(([id])=>allowed.has(id)).map(([id,weight])=>({id,weight}));
    return (causes.length?weighted(causes,roll("quality-cause",day,targetId)).id:null)||"creative_fit";}
  function creativeKey(a){return `${a.platform}|${a.creative.format}|${a.creative.name}|${a.creative.tier}|v${a.creativeVersion||0}`;}
  function migrateLegacyCreativeTarget(target,a){
    const raw=String(target||"");if(!raw||!a?.creative||raw===creativeKey(a))return raw;
    const legacyPrefixes=[`${a.platform}|${a.creative.name}|${a.creative.tier}|`,
      `${a.platform}|${a.creative.format}|${a.creative.name}|${a.creative.tier}|`];
    return legacyPrefixes.some(prefix=>raw.startsWith(prefix)&&/^\d+$/.test(raw.slice(prefix.length)))?creativeKey(a):raw;
  }
  function migrateLegacyCreativeTargets(state){
    for(const a of state.accounts||[]){const version=Number(a.creativeVersion);
      a.creativeVersion=Number.isFinite(version)&&version>=0?Math.floor(version):0;}
    const event=state.dayState?.event,eventAccount=event?.targetId?accountById(state,event.targetId):null;
    if(eventAccount&&event.targetCreative)event.targetCreative=migrateLegacyCreativeTarget(event.targetCreative,eventAccount);
    for(const crisis of state.crises||[]){const a=crisis.targetId?accountById(state,crisis.targetId):null;
      if(a&&crisis.meta?.targetCreative)crisis.meta.targetCreative=migrateLegacyCreativeTarget(crisis.meta.targetCreative,a);}
  }
  function qualityScopeStale(crisis,a){if(!crisis||crisis.type!=="lead_quality_escalation"||!a)return false;
    const cause=crisis.hidden||crisis.meta?.hidden;
    if(cause==="creative_fit")return !!crisis.meta?.targetCreative&&creativeKey(a)!==crisis.meta.targetCreative;
    if(cause==="account_learning")return !!crisis.meta?.targetLane&&a.platform!==crisis.meta.targetLane;
    if(cause==="signal_contamination")return !!crisis.meta?.targetPixel&&a.pixel!==crisis.meta.targetPixel;
    return false;}
  function projectedProfit(state){return state.modeledRevenue-state.billedTotal-state.opsCost;}
  function portfolioProfitGate(){return DAILY*90*.06;}
  function attributionGap(modeled,reported){return modeled?Math.abs(reported-modeled)/modeled:0;}
  function portfolioAttributionGap(state){
    const byBrand={};for(const a of state.accounts){const id=brandIdFor(a),row=byBrand[id]||(byBrand[id]={modeled:0,reported:0});
      row.modeled+=a.totals.modeled;row.reported+=a.totals.reported;}
    const absoluteError=Object.values(byBrand).reduce((n,row)=>n+Math.abs(row.reported-row.modeled),0);
    return state.modeledRevenue?absoluteError/state.modeledRevenue:0;
  }
  function rendezvousTarget(list,day,eventId,keyFor=item=>item.id){let best=null,bestScore=-1;
    for(const item of list){const score=roll("target",day,`${eventId}|${keyFor(item)}`);if(score>bestScore){best=item;bestScore=score;}}
    return best;
  }

  function drawDayState(state,day){
    const moodRoll=roll("mood",day), mood=moodRoll<.13?{label:"Generous",tone:"good",cpmM:.76,detail:"auction cost −24%"}:
      moodRoll<.35?{label:"Favorable",tone:"good",cpmM:.89,detail:"auction cost −11%"}:
      moodRoll<.76?{label:"Stable",tone:"",cpmM:1,detail:"auction baseline"}:
      moodRoll<.94?{label:"Crowded",tone:"bad",cpmM:1.21,detail:"auction cost +21%"}:
      {label:"Hostile",tone:"bad",cpmM:1.47,detail:"auction cost +47%"};
    let base={...weighted(EVENTS,roll("event",day))};
    let eligible=state.accounts.filter(a=>!a.paused&&a.budget>0);
    if(base.targetKind==="search")eligible=eligible.filter(a=>LANES[a.platform].kind==="search");
    if(base.targetKind==="interrupt")eligible=eligible.filter(a=>LANES[a.platform].kind!=="search");
    if(base.id==="signal")eligible=eligible.filter(a=>{const p=pixelById(state,a.pixel);return p&&activePixelBrandCount(state,p)>1;});
    if(base.id==="payout")eligible=eligible.filter(a=>state.finance.receivables.some(r=>brandIdFor(accountById(state,r.accountId)||{id:r.accountId})===brandIdFor(a)));
    if(base.id==="conquest")eligible=eligible.filter(a=>(state.prevInterruptionSpendByBrand[brandIdFor(a)]||0)>0&&
      !(state.brandProtectionDaysByBrand[brandIdFor(a)]>0));
    if(base.id==="quality")eligible=eligible.filter(a=>LANES[a.platform].kind!=="search"&&
      /qualified|appointment|enrollment|retained|purchase/i.test(a.objective));
    const targetScopeKey=base.id==="signal"?a=>a.pixel:["payout","conquest"].includes(base.id)?brandIdFor:a=>a.id;
    if(["signal","payout","conquest"].includes(base.id)){const unique=new Map();for(const a of eligible){const key=targetScopeKey(a),prior=unique.get(key);
      if(!prior||a.budget>prior.budget||(a.budget===prior.budget&&a.id<prior.id))unique.set(key,a);}eligible=[...unique.values()];}
    if(!eligible.length&&!base.global)base={...EVENTS.find(e=>e.id==="quiet")};
    if(!eligible.length)eligible=state.accounts.filter(a=>!a.paused&&a.budget>0);
    const target=rendezvousTarget(eligible,day,base.id,targetScopeKey)||state.accounts[0];
    const hiddenQualityCause=base.id==="quality"?qualityCause(day,target.id):null;
    return {day,mood,event:{...base,targetId:base.global?null:target.id,targetLane:base.global?null:target.platform,
      targetPixel:base.global?null:target.pixel,targetCreative:base.global?null:creativeKey(target),qualityCause:hiddenQualityCause,
      applied:false,averted:false}};
  }

  const NIGHTMARE_PORTFOLIOS=Object.freeze([
    {id:"balanced",label:"Balanced inherited book",brief:"Allocation begins near the declared advertiser mix. No lane owns the portfolio yet.",searchM:1,interruptM:1},
    {id:"search-led",label:"Search-led shelter",brief:"High-intent lanes carry the book, but available search volume will cap further scale.",searchM:1.65,interruptM:.62},
    {id:"social-heavy",label:"Interruption-heavy growth book",brief:"Social and visual demand drive most of the opening allocation. Creative continuity is the immediate portfolio risk.",searchM:.58,interruptM:1.32},
    {id:"single-engine",label:"Power-law engine room",brief:"The largest advertiser begins overconcentrated and subsidizes the smaller experiments.",searchM:1,interruptM:1,largestM:2.1,otherM:.62},
    {id:"experimental",label:"Experiment-heavy book",brief:"Smaller initiatives inherited more money than their evidence supports. Triage matters before aggregate scale.",searchM:1,interruptM:1,largestM:.62,otherM:1.28}
  ]);
  const NIGHTMARE_OPERATING=Object.freeze([
    {id:"ordinary",label:"Ordinary operating stack",brief:"Cash, credit, signal integrity and creative freshness begin near baseline.",cashM:1,creditM:1,purity:0,fatigue:0,audit:0},
    {id:"thin-credit",label:"Thin credit window",brief:"Available buying capacity is tight relative to the daily portfolio. Payout timing can stop healthy campaigns.",cashM:.72,creditM:.68,purity:0,fatigue:0,audit:0},
    {id:"signal-tangle",label:"Cross-pixel signal tangle",brief:"Shared event sources begin with weaker integrity, raising attribution and optimization uncertainty.",cashM:1,creditM:1,purity:-.16,fatigue:4,audit:-.10},
    {id:"burned-bench",label:"Burned creative bench",brief:"Several interruption ads arrive near their replacement window. Search can stabilize the portfolio while production catches up.",cashM:1,creditM:1,purity:0,fatigue:28,audit:0},
    {id:"cash-rich-blind",label:"Cash-rich, audit-poor",brief:"Liquidity buys time, but weak reconciliation makes platform claims unusually hard to trust.",cashM:1.35,creditM:1.08,purity:-.07,fatigue:0,audit:-.18}
  ]);
  function nightmareOpeningProfile(seed=SEED){const portfolio=NIGHTMARE_PORTFOLIOS[Math.floor(keyedRandom(seed,"nightmare","opening-portfolio",0)*NIGHTMARE_PORTFOLIOS.length)],
      operating=NIGHTMARE_OPERATING[Math.floor(keyedRandom(seed,"nightmare","opening-operating",0)*NIGHTMARE_OPERATING.length)];
    return {id:`${portfolio.id}|${operating.id}`,portfolio,operating};}

  function fresh(){
    const opening=nightmareOpeningProfile();
    const startingFormats={quasar:"static",cloudbadger:"search",lattice:"native_long_copy",wyvern:"story",orchard:"slideshow",anvil:"documentary"};
    const rawWeights=FICTIONAL_ACCOUNTS.map((b,index)=>{const search=LANES[b.defaultLane].kind==="search",largest=index===0;
      return b.share*(search?opening.portfolio.searchM:opening.portfolio.interruptM)*(largest?(opening.portfolio.largestM||1):(opening.portfolio.otherM||1));}),
      weightTotal=rawWeights.reduce((sum,value)=>sum+value,0)||1;
    const accounts=FICTIONAL_ACCOUNTS.map((b,index)=>{const format=startingFormats[b.id]||defaultFormatId(b.defaultLane),search=LANES[b.defaultLane].kind==="search";
      return {...b,brandId:b.id,initiativeIndex:1,fictional:true,budget:round50(DAILY*b.share),
      platform:b.defaultLane,paused:false,blockedDays:0,fatigue:Math.min(88,8+index*2+(search?0:opening.operating.fatigue)),quality:.82+index*.025,
      qualityScore:6.4+index*.25,bid:1,competition:1,negatives:0,learning:.88,claimTrust:.35,
      creativeFitM:1,geoQualityM:1,downstreamAcceptanceM:1,
      creative:{name:search?"Responsive Search Assets":"Evergreen Core",tier:search?"Search text / assets":"Common",cls:search?"":"common",boost:1,fatigue:1,format},creativeVersion:0,creativeQueue:null,last:null,
      totals:{spend:0,billed:0,modeled:0,reported:0,conversions:0},crossClaimToday:0,incomingClaims:[]};});
    accounts.forEach((account,index)=>{account.budget=round50(DAILY*rawWeights[index]/weightTotal);});
    const allocationDrift=accounts.reduce((sum,account)=>sum+account.budget,0)-DAILY;if(allocationDrift)accounts[0].budget=Math.max(0,accounts[0].budget-allocationDrift);
    const state={engine:"nightmare",day:1,ended:false,outcome:null,seedShown:SEED,
      openingProfile:{id:opening.id,portfolio:opening.portfolio.id,operating:opening.operating.id},
      holding:{name:"Fictional · Impossible Umbrella Holdings",fictional:true},
      desk:{name:"Fictional · Paper Moon Growth Desk",fictional:true},accounts,
      pixels:PIXEL_BLUEPRINTS.map(p=>({...p,members:p.members.slice(),purity:Math.max(.25,p.purity+opening.operating.purity),status:"shared"})),
      spendTotal:0,billedTotal:0,opsCost:0,modeledRevenue:0,reportedRevenue:0,
      outcomes:[],claims:[],dailyLedger:[],months:[],gateStreak:0,
      finance:{cash:DAILY*6*opening.operating.cashM,creditLimit:DAILY*9*opening.operating.creditM,creditUsed:0,creditHolds:[],receivables:[],nextHoldId:1,
        collections:0,payments:0,failedPayments:0},
      crises:[],crisisHistory:[],nextCrisisId:1,ops:2,dailyOpsCost:0,auditQuality:Math.max(.18,.42+opening.operating.audit),
      contingency:0,backupGraceDays:0,brandProtectionDaysByBrand:{},prevInterruptionSpendByBrand:{},insolvencyDays:0,
      creativeTests:0,log:[],telemetry:{laneMoves:0,creativeRefreshes:0,searchRepairs:0,
        audits:0,pixelCleans:0,pixelIsolations:0,crisesOpened:0,crisesResolved:0,
        paymentFailures:0,resilienceUses:0,parallelInitiatives:0,batchDays:0,
        qualityEscalations:0,qualityTests:0,qualityDiagnoses:0,qualityCleanStack:0}};
    state.dayState=drawDayState(state,1);
    return state;
  }

  function createCrisis(state,type,targetId,meta={}){
    const target=targetId?accountById(state,targetId):null;
    const scopeKey=type==="payment_failure"?"holding":
      ["payout_delay","brand_conquest"].includes(type)&&target?`brand:${brandIdFor(target)}`:
      type==="pixel_contamination"&&target?`pixel:${target.pixel}`:`initiative:${targetId||"none"}`;
    const existing=state.crises.find(c=>c.type===type&&c.scopeKey===scopeKey);
    if(existing){for(const key of ["holdIds","receivableIds"]){if(meta[key]?.length)existing.meta[key]=[...new Set([...(existing.meta[key]||[]),...meta[key]])];}return existing;}
    const def=CRISIS_COPY[type];if(!def)return null;
    const crisis={id:`NC-${state.nextCrisisId++}`,type,targetId:targetId||null,startDay:state.day,
      status:"open",scope:def.scope,scopeKey,hidden:meta.hidden||null,meta};
    state.crises.push(crisis);state.telemetry.crisesOpened++;
    return crisis;
  }
  function supersedeCrises(state,predicate,reason){const closed=state.crises.filter(predicate);if(!closed.length)return 0;
    const ids=new Set(closed.map(c=>c.id));state.crises=state.crises.filter(c=>!ids.has(c.id));
    for(const c of closed){c.status="resolved";c.response="scope changed";c.resolvedDay=state.day;c.cost=0;c.superseded=true;
      state.crisisHistory.push(c);state.telemetry.crisesResolved++;}
    state.log.unshift({html:`<div><b class="pos">${closed.length} crisis ticket${closed.length===1?"":"s"} superseded</b> — ${reason}. No operations action or response cost was consumed.</div>`,concept:"crisis"});
    return closed.length;
  }
  function reconcileRecoveredPaymentCrises(state){
    const liveHolds=new Set(state.finance.creditHolds.map(hold=>hold.id));
    return supersedeCrises(state,c=>c.type==="payment_failure"&&
      ((c.meta?.holdIds?.length&&c.meta.holdIds.every(id=>!liveHolds.has(id)))||(!c.meta?.holdIds?.length&&state.insolvencyDays===0)),
      "the triggering overdue balance cleared and the payment threshold is no longer active");
  }
  function reconcileRecoveredCrises(state){
    reconcileRecoveredPaymentCrises(state);
    supersedeCrises(state,c=>c.type==="payout_delay"&&c.targetId&&(()=>{const tracked=c.meta?.receivableIds||[];
      if(tracked.length){const live=new Set(state.finance.receivables.map(r=>r.id));return tracked.every(id=>!live.has(id));}
      return !state.finance.receivables.some(r=>{const owner=accountById(state,r.accountId),target=accountById(state,c.targetId);
        return owner&&target&&brandIdFor(owner)===brandIdFor(target);});})(),
      "the delayed advertiser receivables completed settlement");
    supersedeCrises(state,c=>c.type==="brand_conquest"&&c.targetId&&(()=>{const target=accountById(state,c.targetId);if(!target)return true;
      const brandId=brandIdFor(target),required=(state.prevInterruptionSpendByBrand[brandId]||0)*.105;
      const search=state.accounts.filter(a=>brandIdFor(a)===brandId&&!a.paused&&a.blockedDays<=0&&LANES[a.platform].kind==="search").reduce((n,a)=>n+a.budget,0);
      return !required||search>=required||(state.brandProtectionDaysByBrand[brandId]||0)>0;})(),
      "the advertiser's funded search coverage now protects its generated demand");
  }

  function applyEvent(state,lines){
    const e=state.dayState.event;if(e.applied)return;e.applied=true;
    const a=e.targetId?accountById(state,e.targetId):null;
    if(a&&e.id==="quality"){
      e.qualityCause=e.qualityCause||qualityCause(state.day,a.id);
      const preview={type:"lead_quality_escalation",hidden:e.qualityCause,meta:{targetLane:e.targetLane,targetPixel:e.targetPixel,targetCreative:e.targetCreative}};
      if(qualityScopeStale(preview,a)){e.averted=true;
        lines.push(`<b class="pos">Quality event averted</b> — the preview's ${qualityCauseLabel(e.qualityCause)} layer was replaced before execution.`);return;}}
    if(a&&e.laneSensitive&&(a.platform!==e.targetLane||a.paused||a.budget<=0)){e.averted=true;
      lines.push(`<b class="pos">Event averted</b> — the preview targeted ${LANES[e.targetLane]?.name||"the previous lane"}, but that platform initiative was paused before execution.`);return;}
    if(a&&e.creativeSensitive&&e.targetCreative&&creativeKey(a)!==e.targetCreative){e.averted=true;
      lines.push(`<b class="pos">Creative event averted</b> — the preview targeted the previous asset, which was replaced before execution.`);return;}
    if(a&&e.pixelSensitive){const p=pixelById(state,a.pixel);if(a.pixel!==e.targetPixel||!p||activePixelBrandCount(state,p)<=1){e.averted=true;
      lines.push(`<b class="pos">Event averted</b> — the targeted shared event source was separated before execution.`);return;}}
    if(e.id==="conquest"&&a){const brandId=brandIdFor(a),required=(state.prevInterruptionSpendByBrand[brandId]||0)*.105;
      const ownSearch=state.accounts.filter(x=>(x.brandId||x.id)===brandId&&!x.paused&&x.blockedDays<=0&&LANES[x.platform].kind==="search").reduce((n,x)=>n+x.budget,0);
      if((state.brandProtectionDaysByBrand[brandId]||0)>0||!required||ownSearch>=required){e.averted=true;
        lines.push(`<b class="pos">Brand conquest covered</b> — this advertiser's own search protection already meets the generated-demand threshold.`);return;}}
    if(e.id==="copied"&&a){a.fatigue=Math.max(a.fatigue,84);lines.push(`${displayName(a.name)}'s creative jumped to <b class="neg">84% fatigue</b>.`);}
    if(e.id==="signal"&&a){const p=pixelById(state,a.pixel);if(p)p.purity=clamp(p.purity-(state.contingency>=2?.07:.14),.18,1);}
    if(e.id==="payout"&&a){const affected=state.finance.receivables.filter(r=>{const owner=accountById(state,r.accountId);return owner&&brandIdFor(owner)===brandIdFor(a);});
      e.payoutReceivableIds=affected.map(r=>r.id);affected.forEach(r=>{r.due+=4;});}
    if(e.id==="flag"&&a)a.blockedDays=Math.max(a.blockedDays,state.contingency>=2?1:2);
    if(e.id==="bidwar"&&a)a.competition=clamp(a.competition+.48,.7,2.3);
    if(e.id==="ghost"&&a)e.ghostTruth=roll("hidden",state.day,a.id,e.id)<.54?"fraud":"assisted";
    if(e.id==="quality"&&a){
      state.telemetry.qualityEscalations++;
      if(e.qualityCause==="creative_fit"){a.creativeFitM=clamp((a.creativeFitM||1)*.72,.45,1);a.fatigue=clamp(a.fatigue+18,0,98);}
      if(e.qualityCause==="account_learning")a.learning=clamp(a.learning*.69,.42,1);
      if(e.qualityCause==="signal_contamination"){const p=pixelById(state,a.pixel);if(p)p.purity=clamp(p.purity-.17,.18,1);}
      if(e.qualityCause==="geo_leak")a.geoQualityM=clamp((a.geoQualityM||1)*.74,.5,1);
      if(e.qualityCause==="downstream_shift")a.downstreamAcceptanceM=clamp((a.downstreamAcceptanceM||1)*.76,.5,1);
      lines.push(`<b class="neg">Campaign-operations escalation</b> — downstream quality softened. The root cause is hidden; a controlled response can distinguish creative, geography, account learning, shared signal and downstream acceptance.`);
    }
    if(e.crisis)createCrisis(state,e.crisis,e.targetId,{hidden:e.ghostTruth||e.qualityCause||null,targetLane:e.targetLane,
      targetPixel:e.targetPixel,targetCreative:e.targetCreative,receivableIds:e.payoutReceivableIds||[],attempted:[],eliminated:[]});
  }

  function fundCost(state,cost,label){
    cost=Math.max(0,cost);if(!cost)return true;
    const fromCash=Math.min(state.finance.cash,cost);state.finance.cash-=fromCash;
    const balance=cost-fromCash;
    if(balance>availableCredit(state)+1e-6){state.finance.cash+=fromCash;return false;}
    if(balance>0){state.finance.creditUsed+=balance;state.finance.creditHolds.push({id:`OPS-${state.finance.nextHoldId++}`,
      due:state.day+4,amount:balance,label:`Operations · ${label}`});}
    state.opsCost+=cost;state.dailyOpsCost+=cost;return true;
  }
  function useOperation(state,cost,label){
    if(state.ops<=0){addLog(`<div><b class="neg">No operations action available</b> — ${label} was not performed.</div>`,"crisis");fireFx("error",{name:"No operations action available"});return false;}
    if(!fundCost(state,cost,label)){addLog(`<div><b class="neg">Insufficient cash and credit</b> — ${label} was not performed; no action was consumed.</div>`,"liquidity");fireFx("error",{name:"Insufficient shared headroom"});return false;}
    state.ops--;return true;
  }

  function processCashflows(state,lines){
    let collections=0,payments=0,failed=false;const failedHoldIds=[];
    const dueReceivables=state.finance.receivables.filter(r=>r.due<=state.day);
    for(const r of dueReceivables){state.finance.cash+=r.amount;collections+=r.amount;}
    state.finance.receivables=state.finance.receivables.filter(r=>r.due>state.day);
    const future=[];
    for(const hold of state.finance.creditHolds){
      if(hold.due>state.day){future.push(hold);continue;}
      const paid=Math.min(state.finance.cash,hold.amount);state.finance.cash-=paid;payments+=paid;
      state.finance.creditUsed=Math.max(0,state.finance.creditUsed-paid);
      const remainder=hold.amount-paid;
      if(remainder>.01){future.push({...hold,due:state.day+1,amount:remainder});failed=true;failedHoldIds.push(hold.id);}
    }
    state.finance.creditHolds=future;state.finance.collections+=collections;state.finance.payments+=payments;
    if(collections)lines.push(`<b class="pos">Collections</b> — ${money(collections)} of modeled receivables became cash.`);
    if(payments)lines.push(`<b>Credit cleared</b> — ${money(payments)} paid against the shared facility.`);
    if(failed&&state.backupGraceDays>0){state.backupGraceDays--;state.telemetry.resilienceUses++;state.insolvencyDays=0;failed=false;
      lines.push(`<b class="amb">Backup billing grace used</b> — the oldest balance remains locked, but the paid contingency prevented a platform pause. ${state.backupGraceDays} grace day${state.backupGraceDays===1?"":"s"} remain.`);
    }else if(failed){state.finance.failedPayments++;state.telemetry.paymentFailures++;state.insolvencyDays++;
      createCrisis(state,"payment_failure",null,{holdIds:failedHoldIds});const largest=state.accounts.filter(a=>!a.paused).sort((a,b)=>b.budget-a.budget)[0];
      if(largest){largest.blockedDays=Math.max(largest.blockedDays,1);largest.learning=Math.max(.45,largest.learning*.78);}
      lines.push(`<b class="neg">Failed payment threshold</b> — shared credit stayed locked and the largest active initiative lost momentum.`);
    }else state.insolvencyDays=0;
    return {collections,payments,failed};
  }

  function eventM(state,a,key){const e=state.dayState.event;if(e.averted||e[key]===undefined)return 1;
    if(e.laneSensitive&&e.targetId===a.id&&e.targetLane!==a.platform)return 1;
    let value=e.targetId===null||e.targetId===a.id?e[key]:1;
    if(key==="claimM"&&e.id==="blackout"&&state.contingency>=2)value=1-(1-value)*.55;
    return value;}
  function sharedPixelClaim(state,a,modeled,baseReported,dayClaims){
    const p=pixelById(state,a.pixel);const purity=p?p.purity:1;
    dayClaims[a.id]=(dayClaims[a.id]||0)+baseReported;
    if(p&&pixelBrandCount(state,p)>1&&purity<.93){
      const otherBrands=[...new Set(p.members.map(id=>accountById(state,id)).filter(Boolean).map(brandIdFor).filter(id=>id!==brandIdFor(a)))];
      const siblingBrand=otherBrands.length?otherBrands[Math.floor(roll("claim-brand",state.day,a.id)*otherBrands.length)]:null;
      const recipients=state.accounts.filter(x=>brandIdFor(x)===siblingBrand&&x.pixel===p.id&&!x.paused&&x.budget>0)
        .sort((x,y)=>y.budget-x.budget||x.id.localeCompare(y.id));
      const recipient=recipients[0];
      if(recipient){const duplicate=modeled*(1-purity)*(.28+roll("claim-dup",state.day,a.id)*.62)*(1-state.auditQuality*.60);
        dayClaims[recipient.id]=(dayClaims[recipient.id]||0)+duplicate;
        recipient.incomingClaims.push({sourceId:a.id,value:duplicate});
        state.claims.push({outcomeId:`OUT-${state.day}-${a.id}`,accountId:recipient.id,brandId:brandIdFor(recipient),sourceAccountId:a.id,
          platform:recipient.platform,value:duplicate,crossPixel:true});}
    }
  }

  function simulateAccount(state,a,deliveryFactor,brandCapture,dayClaims){
    const lane=LANES[a.platform],fit=laneFit(a,a.platform),pixel=pixelById(state,a.pixel),purity=pixel?pixel.purity:1;
    const format=creativeFormat(a),formatLaneFit=formatFit(a,format),formatObjectiveFit=formatStyleFit(a,format),
      formatVolatility=lane.kind==="search"?1:(Number(format.volatility)||1),formatQuality=lane.kind==="search"?1:(Number(format.qualityM)||1);
    if(a.paused)return null;
    if(a.blockedDays>0){const unresolvedFlag=state.crises.some(c=>c.type==="false_flag"&&c.targetId===a.id);
      if(!unresolvedFlag)a.blockedDays--;return {blocked:true,spend:0,billed:0,modeledRevenue:0,reportedRevenue:0,conversions:0};}
    const planned=a.budget*deliveryFactor;if(planned<=0)return null;
    const noise=1+(roll("delivery",state.day,a.id,a.platform)-.5)*.36*formatVolatility;
    const valueNoise=.88+roll("value",state.day,a.id,a.platform)*.24;
    const mood=state.dayState.mood.cpmM,eventCost=eventM(state,a,"cpmM"),eventCvr=eventM(state,a,"cvrM");
    let spend=planned,impressions=0,clicks=0,reportedClicks=0,conversions=0,cpm=0,cpc=0,ctr=0,cvr=0,impressionShare=0,queryCap=0;
    if(lane.kind==="search"){
      const brandLift=1+Math.min(1.75,((state.prevInterruptionSpendByBrand[brandIdFor(a)]||0)/Math.max(1,DAILY))*1.9);
      queryCap=a.searchVolume*(DAILY/150000)*lane.volumeM*brandLift*(.82+roll("query-volume",state.day,a.id,a.platform)*.36);
      impressionShare=clamp(.16+.61*a.bid*(a.qualityScore/7)/Math.max(.7,a.competition),.08,.96);
      cpc=lane.baseCost*a.searchCpcM*a.competition*mood*eventCost/Math.pow(a.qualityScore/7,.58);
      const clickCap=queryCap*impressionShare,baseCapacity=clickCap*cpc;
      if(planned>baseCapacity)cpc*=1+Math.min(.19,(planned/Math.max(1,baseCapacity)-1)*.075);
      spend=Math.min(planned,clickCap*cpc);clicks=spend/Math.max(.1,cpc);
      ctr=clamp(.035+(a.qualityScore-5)*.0065,.022,.12);impressions=clicks/ctr;
      cvr=a.baseCvr*fit*(.72+.28*purity)*a.learning*noise*(1+Math.min(.15,a.negatives*.012))*eventCvr;
      conversions=clicks*cvr*(.84+.18*a.quality);reportedClicks=clicks;
    }else if(lane.kind==="ctv"){
      const brandInterruptionPlanned=brandAccounts(state,a).filter(x=>!x.paused&&LANES[x.platform].kind!=="search").reduce((n,x)=>n+x.budget*deliveryFactor,0);
      const saturation=Math.max(0,(brandInterruptionPlanned-DAILY*.24)/(DAILY*.24));
      cpm=lane.baseCost*mood*eventCost*(1+.21*saturation)*(1+(1-purity)*.42)*format.cpmM;
      impressions=spend/cpm*1000;clicks=impressions*.000012;
      reportedClicks=roll("ctv-click-observation",state.day,a.id,a.platform)<.42?0:clicks*(.55+roll("ctv-click-count",state.day,a.id,a.platform)*.9);
      conversions=impressions*a.viewRate*fit*(.76+.24*purity)*a.learning*noise*eventCvr*Math.sqrt(a.creative.boost)*
        format.cvrM*Math.pow(formatLaneFit,.55)*Math.pow(formatObjectiveFit,.45)*(a.creativeFitM||1)*(.84+.18*a.quality);
      ctr=impressions?reportedClicks/impressions:0;cvr=0;
    }else{
      const brandInterruptionPlanned=brandAccounts(state,a).filter(x=>!x.paused&&LANES[x.platform].kind!=="search").reduce((n,x)=>n+x.budget*deliveryFactor,0);
      const formatHeadroom=(format.satBonus||0)*Math.max(1,DAILY/20000);
      const saturation=Math.max(0,(brandInterruptionPlanned-(DAILY*.28+formatHeadroom))/(DAILY*.28+formatHeadroom));
      cpm=lane.baseCost*mood*eventCost*(1+.24*saturation)*(1+a.fatigue*.0042)*(1+(1-purity)*.58)*format.cpmM;
      impressions=spend/cpm*1000;
      ctr=(a.baseCtr/100)*lane.ctrM*Math.pow(fit,.35)*clamp(1-a.fatigue*.0062,.28,1)*noise*format.ctrM*Math.pow(formatLaneFit,.32);
      clicks=impressions*ctr;reportedClicks=clicks;
      cvr=a.baseCvr*lane.cvrM*fit*(.66+.34*purity)*a.learning*(.86+roll("conversion",state.day,a.id,a.platform)*.28)*
        eventCvr*format.cvrM*Math.pow(formatLaneFit,.55)*Math.pow(formatObjectiveFit,.45)*(a.creativeFitM||1);
      conversions=clicks*cvr*a.creative.boost*(.84+.18*a.quality);
    }
    const e=state.dayState.event;
    if(e.id==="ghost"&&e.targetId===a.id){const ghostClickM=e.ghostTruth==="fraud"?
      (state.contingency>=2?8+roll("ghost-clicks",state.day,a.id)*18:35+roll("ghost-clicks",state.day,a.id)*145):
      (state.contingency>=2?1.7+roll("ghost-clicks",state.day,a.id)*1.3:2.5+roll("ghost-clicks",state.day,a.id)*2.5);
      reportedClicks*=ghostClickM;}
    let modeledRevenue=conversions*a.value*valueNoise*brandCapture*formatQuality*(a.geoQualityM||1)*(a.downstreamAcceptanceM||1);
    const crossPath=1+(1-state.auditQuality)*Math.max(0,new Set(state.accounts.filter(x=>!x.paused&&x.budget>0).map(x=>LANES[x.platform].family)).size-1)*.025;
    const claimNoise=.88+roll("claim",state.day,a.id,a.platform)*.28;
    const rawClaimFactor=lane.claim*crossPath*claimNoise*eventM(state,a,"claimM");
    const reconciliation=clamp(state.auditQuality*.78+a.claimTrust*.12,0,.90);
    let reportedRevenue=modeledRevenue*(1+(rawClaimFactor-1)*(1-reconciliation));
    if(e.id==="ghost"&&e.targetId===a.id)reportedRevenue*=e.ghostTruth==="fraud"?(state.contingency>=2?1.72:2.65):(state.contingency>=2?.78:.62);
    const adjustment=(1.016+roll("billing-adjustment",state.day,a.id,a.platform)*.047)*(e.feeM||1);
    const billed=spend*adjustment;
    const outcomeId=`OUT-${state.day}-${a.id}`;
    state.outcomes.push({id:outcomeId,day:state.day,accountId:a.id,brandId:brandIdFor(a),platform:a.platform,modeledValue:modeledRevenue,conversions});
    state.claims.push({outcomeId,accountId:a.id,brandId:brandIdFor(a),sourceAccountId:a.id,platform:a.platform,value:reportedRevenue,crossPixel:false});
    sharedPixelClaim(state,a,modeledRevenue,reportedRevenue,dayClaims);
    const payoutTarget=e.targetId?accountById(state,e.targetId):null,payoutExtra=e.id==="payout"&&payoutTarget&&brandIdFor(payoutTarget)===brandIdFor(a)?4:0;
    const receivableId=`REC-${state.day}-${a.id}`;
    state.finance.receivables.push({id:receivableId,outcomeId,accountId:a.id,brandId:brandIdFor(a),platform:a.platform,
      due:state.day+a.payoutLag+payoutExtra,amount:modeledRevenue});
    if(payoutExtra){const payoutCrisis=state.crises.find(c=>c.type==="payout_delay"&&c.scopeKey===`brand:${brandIdFor(a)}`);
      if(payoutCrisis)payoutCrisis.meta.receivableIds=[...new Set([...(payoutCrisis.meta.receivableIds||[]),receivableId])];}
    state.finance.creditUsed+=billed;state.finance.creditHolds.push({id:`BILL-${state.day}-${a.id}`,
      accountId:a.id,brandId:brandIdFor(a),platform:a.platform,due:state.day+3+Math.floor(roll("billing-lag",state.day,a.id)*3),amount:billed,
      label:`${platformLabel(a)} adjusted bill`});
    const clickQuality=clamp((.43+fit*.23+purity*.28-a.fatigue*.0017)*Math.sqrt(a.geoQualityM||1)*Math.sqrt(a.creativeFitM||1),.2,1);
    a.totals.spend+=spend;a.totals.billed+=billed;a.totals.modeled+=modeledRevenue;a.totals.conversions+=conversions;
    if(lane.kind!=="search")a.fatigue=clamp(a.fatigue+(8+6*spend/Math.max(1,a.budget))*lane.fatigue*a.creative.fatigue*format.fatigueM,0,98);
    a.learning=clamp(a.learning+.028,.42,1);a.competition=1+(a.competition-1)*.86;
    return {spend,billed,modeledRevenue,reportedRevenue,impressions,clicks,reportedClicks,conversions,
      cpm,cpc,ctr,cvr,impressionShare,queryCap,clickQuality,purity,fit,planned,undelivered:planned-spend};
  }

  function updatePixels(state){
    for(const p of state.pixels){
      const members=p.members.map(id=>accountById(state,id)).filter(Boolean),active=members.filter(a=>a.last&&a.last.spend>0);
      if(!active.length)continue;
      const verticals=new Set(active.map(a=>a.vertical)).size;
      const activeSpend=active.reduce((n,a)=>n+a.last.spend,0);
      const quality=active.reduce((n,a)=>n+(a.last.clickQuality||.7)*a.last.spend,0)/Math.max(1,activeSpend);
      const broad=active.filter(a=>LANES[a.platform].kind!=="search").reduce((n,a)=>n+a.last.spend,0)/Math.max(1,activeSpend);
      const drift=.0015+(verticals>1?.0018:0)+Math.max(0,.72-quality)*.022+broad*.0018;
      const recovery=state.auditQuality*.0012;
      p.purity=clamp(p.purity-drift+recovery,.18,1);
    }
  }

  function evaluateMonth(state){
    if(state.day%30!==0)return null;
    const rows=state.dailyLedger.slice(-30),sum=k=>rows.reduce((n,r)=>n+r[k],0);
    const spend=sum("spend"),billed=sum("billed"),modeled=sum("modeledRevenue"),reported=sum("reportedRevenue"),ops=sum("opsCost");
    const byPlatform={},byBrand={},claimedByBrand={};
    for(const row of rows){for(const [k,v] of Object.entries(row.byPlatform))byPlatform[k]=(byPlatform[k]||0)+v;
      for(const [k,v] of Object.entries(row.byBrand||row.byAccount||{}))byBrand[k]=(byBrand[k]||0)+v;
      for(const [accountId,value] of Object.entries(row.claimedByAccount||{})){const owner=accountById(state,accountId),id=owner?brandIdFor(owner):accountId;
        claimedByBrand[id]=(claimedByBrand[id]||0)+value;}}
    const maxPlatform=spend?Math.max(0,...Object.values(byPlatform))/spend:0;
    const maxAdvertiser=modeled?Math.max(0,...Object.values(byBrand))/modeled:0;
    const claimBrands=new Set([...Object.keys(byBrand),...Object.keys(claimedByBrand)]);
    const absoluteClaimError=[...claimBrands].reduce((n,id)=>n+Math.abs((claimedByBrand[id]||0)-(byBrand[id]||0)),0);
    const mer=spend?modeled/spend:0,gap=modeled?absoluteClaimError/modeled:(reported?Infinity:0),profit=modeled-billed-ops;
    const resilience=maxPlatform<=.58||state.contingency>=2;
    const conditions={performance:mer>=1.12&&profit>0,measurement:gap<=.38&&state.auditQuality>=.40,
      liquidity:availableCredit(state)/state.finance.creditLimit>=.12&&rows.filter(r=>r.failedPayment).length<=1,
      advertiserRisk:maxAdvertiser<=.52,resilience};
    const pass=Object.values(conditions).every(Boolean);
    const snapshot={month:state.months.length+1,throughDay:state.day,spend,billed,modeled,reported,profit,mer,gap,
      absoluteClaimError,maxPlatform,maxAdvertiser,maxAccount:maxAdvertiser,conditions,pass,contingency:state.contingency};
    state.months.push(snapshot);state.gateStreak=pass?state.gateStreak+1:0;
    addLog(`<div><b>30-day acquisition gate ${snapshot.month}</b> — MER ${mer.toFixed(2)}× · attribution gap ${(gap*100).toFixed(0)}% · `+
      `platform concentration ${(maxPlatform*100).toFixed(0)}% · advertiser concentration ${(maxAdvertiser*100).toFixed(0)}% · <b class="${pass?"pos":"neg"}">${pass?"PASS":"RESET"}</b></div>`,"performance");
    return snapshot;
  }

  function runDay(){
    const state=S;if(!state||state.engine!=="nightmare"||state.ended)return false;
    const lines=[];advanceCreativeProduction(state,lines);applyEvent(state,lines);const cashflow=processCashflows(state,lines);
    const committed=state.accounts.filter(a=>!a.paused&&a.blockedDays<=0).reduce((n,a)=>n+a.budget,0),freeCredit=availableCredit(state);
    const deliveryFactor=committed?Math.min(1,freeCredit/(committed*1.15)):0;
    const brandCapture={};
    for(const brandId of new Set(state.accounts.map(brandIdFor))){const required=(state.prevInterruptionSpendByBrand[brandId]||0)*.105;
      const ownSearch=state.accounts.filter(a=>brandIdFor(a)===brandId&&!a.paused&&a.blockedDays<=0&&LANES[a.platform].kind==="search").reduce((n,a)=>n+a.budget,0);
      const protectedDays=state.brandProtectionDaysByBrand[brandId]||0;
      const coverage=protectedDays>0?1:required?clamp(ownSearch/required,0,1):1;
      brandCapture[brandId]=1-(1-coverage)*.11;}
    const dayClaims={},byPlatform={},byAccount={},byBrand={},interruptionByBrand={};let daySpend=0,dayBilled=0,dayModeled=0,dayReported=0;
    for(const a of state.accounts){a.crossClaimToday=0;a.incomingClaims=[];}
    for(const a of state.accounts){const brandId=brandIdFor(a),last=simulateAccount(state,a,deliveryFactor,brandCapture[brandId],dayClaims);a.last=last;
      if(!last||last.blocked){if(last?.blocked)lines.push(`${displayName(a.name)} <b class="neg">did not deliver</b> — account-level hold.`);continue;}
      daySpend+=last.spend;dayBilled+=last.billed;dayModeled+=last.modeledRevenue;
      byPlatform[LANES[a.platform].family]=(byPlatform[LANES[a.platform].family]||0)+last.spend;
      byAccount[a.id]=(byAccount[a.id]||0)+last.modeledRevenue;
      byBrand[brandId]=(byBrand[brandId]||0)+last.modeledRevenue;
      if(LANES[a.platform].kind!=="search")interruptionByBrand[brandId]=(interruptionByBrand[brandId]||0)+last.spend;
    }
    reconcileRecoveredCrises(state);
    for(const a of state.accounts){const claim=dayClaims[a.id]||0;if(a.last&&!a.last.blocked)a.last.reportedRevenue=claim;
      else if(claim>0)a.crossClaimToday=claim;a.totals.reported+=claim;dayReported+=claim;}
    state.spendTotal+=daySpend;state.billedTotal+=dayBilled;state.modeledRevenue+=dayModeled;state.reportedRevenue+=dayReported;
    state.prevInterruptionSpendByBrand=interruptionByBrand;
    for(const id of Object.keys(state.brandProtectionDaysByBrand))state.brandProtectionDaysByBrand[id]=Math.max(0,state.brandProtectionDaysByBrand[id]-1);
    updatePixels(state);
    const daily={day:state.day,spend:daySpend,billed:dayBilled,modeledRevenue:dayModeled,reportedRevenue:dayReported,
      opsCost:state.dailyOpsCost,collections:cashflow.collections,payments:cashflow.payments,failedPayment:cashflow.failed,
      cash:state.finance.cash,creditUsed:state.finance.creditUsed,byPlatform,byAccount,byBrand,claimedByAccount:{...dayClaims}};
    state.dailyLedger.push(daily);state.dailyOpsCost=0;
    const e=state.dayState.event,target=e.targetId?accountById(state,e.targetId):null;
    const dayMer=daySpend?dayModeled/daySpend:0;
    addLog(`<div><b>Day ${state.day}</b> · ${state.dayState.mood.label} · ${e.title}${target?` · ${displayName(target.name)}`:""}<br>`+
      `media ${money(daySpend)} · adjusted bill ${money(dayBilled)} · modeled outcome value ${money(dayModeled)} · `+
      `platform claims ${money(dayReported)} · MER <span class="${dayMer>=1.12?"pos":"neg"}">${dayMer.toFixed(2)}×</span></div>`+
      lines.map(line=>`<div>&nbsp;&nbsp;${line}</div>`).join(""),e.concept||"day");
    const closedGate=evaluateMonth(state);
    const profit=projectedProfit(state),profitGate=portfolioProfitGate();
    if(state.insolvencyDays>=3){state.ended=true;state.outcome="credit-collapse";}
    else if(closedGate&&state.gateStreak>=3&&profit>=profitGate){state.ended=true;state.outcome="portfolio-exit";}
    else if(state.day>=DAYS){state.ended=true;state.outcome="term-ended";}
    state.day++;
    if(!state.ended){state.ops=2;state.dayState=drawDayState(state,state.day);}
    if(typeof autoCheckpoint==="function")autoCheckpoint();
    render();
    if(state.ended)debrief();
    else {
      const roas=daySpend?dayModeled/daySpend:0;
      if(roas>=3.5)queueDayFx("jackpot",{profit:dayModeled-dayBilled,roas});
      else if(roas>=1.6)queueDayFx("profit",{profit:dayModeled-dayBilled,roas});
      if(state.crises.length)queueDayFx("warning",{name:`${state.crises.length} portfolio crisis ticket(s) open`});
      flushDayFx();
    }
    return true;
  }

  function laneMetricMarkup(a){const L=a.last,lane=LANES[a.platform];if(!L)return '<span style="color:var(--ink-dim)">no delivery yet</span>';
    if(L.blocked)return '<b class="neg">account-level hold — no delivery</b>';
    if(lane.kind==="search")return `${Math.round(L.impressions).toLocaleString()} search impressions · <b>${Math.round(L.clicks).toLocaleString()}</b> clicks · `+
      `${Math.round(L.conversions).toLocaleString()} modeled outcomes<br>CPC <b>${money2(L.cpc)}</b> · impression share <b>${(L.impressionShare*100).toFixed(0)}%</b> · `+
      `${money(L.undelivered)} unspent at the query ceiling`;
    if(lane.kind==="ctv")return `${Math.round(L.impressions).toLocaleString()} impressions · <b>${L.reportedClicks.toFixed(1)}</b> measurable clicks · `+
      `${Math.round(L.conversions).toLocaleString()} modeled view-through outcomes<br>CPM <b>${money2(L.cpm)}</b> · clicks are not the decision metric`;
    return `${Math.round(L.impressions).toLocaleString()} impressions · <b>${Math.round(L.reportedClicks).toLocaleString()}</b> reported clicks · `+
      `${Math.round(L.conversions).toLocaleString()} modeled outcomes<br>CPM <b>${money2(L.cpm)}</b> · CTR <b>${(L.reportedClicks/Math.max(1,L.impressions)*100).toFixed(2)}%</b> · CVR <b>${(L.cvr*100).toFixed(2)}%</b>`;
  }
  function healthFor(a){if(a.blockedDays>0)return ["bad","account hold"];if(a.paused)return ["warn","paused"];
    if(!a.last||a.last.blocked)return ["warn","unread"];
    const mer=a.last.spend?a.last.modeledRevenue/a.last.spend:0;return mer>=1.2?["good","healthy"]:mer>=.9?["warn","watch"]:["bad","bleeding"];}
  const canBidDown=a=>a.bid>.450001;
  const canBidUp=a=>a.bid<1.849999;
  const canAddNegatives=a=>a.negatives<13;
  const canImproveSearch=a=>a.qualityScore<9.999||a.learning<.879999;
  const canAuditView=(state,a)=>state.auditQuality<.999999||a.claimTrust<.999999;
  const canAuditPortfolio=state=>state.auditQuality<.999999;
  const weakestRepairablePixel=state=>state.pixels.slice().sort((a,b)=>a.purity-b.purity).find(pixel=>pixel.purity<.999999)||null;
  function monthMarkup(state){const latest=state.months[state.months.length-1];if(!latest)return `<div class="note">First immutable acquisition gate closes after day 30. Three consecutive passes are required.</div>`;
    const failed=Object.entries(latest.conditions).filter(([,ok])=>!ok).map(([k])=>k).join(", ");
    return `<div class="eventcard ${latest.pass?"good":"bad"}"><div class="eventtitle">Gate ${latest.month} · ${latest.pass?"PASS":"RESET"} · streak ${state.gateStreak}/3</div>
      <div class="eventbody">MER ${latest.mer.toFixed(2)}× · attribution gap ${(latest.gap*100).toFixed(0)}% · platform concentration ${(latest.maxPlatform*100).toFixed(0)}% · advertiser concentration ${(latest.maxAdvertiser*100).toFixed(0)}%${failed?`<br>Needs work: ${failed}`:""}</div></div>`;}

  function pixelMemberSummary(state,p){const brandIds=[...new Set(p.members.map(id=>accountById(state,id)).filter(Boolean).map(brandIdFor))];
    return brandIds.map(id=>{const initiatives=brandAccounts(state,id).filter(a=>a.pixel===p.id),name=initiatives[0]?.name||id;
      return `${displayName(name)} (${initiatives.map(platformLabel).join(" + ")})`;}).join(" · ");}

  function statCards(rows){return rows.map(([k,v,sub,cls])=>`<div class="stat"><div class="k">${k}</div><div class="v ${cls||""}">${v}</div>
    <div class="sub">${sub||"&nbsp;"}<br><span class="metaphor-inline">≈ ${statFlavorAlias(k)}</span></div></div>`).join("");}
  function captureDisclosureState(){
    if(typeof document==="undefined")return;
    document.querySelectorAll("#slots details[data-workstream-id]").forEach(node=>{
      const id=node.dataset.workstreamId;if(!id)return;
      if(node.open)expandedWorkstreamIds.add(id);else expandedWorkstreamIds.delete(id);
    });
    const finance=document.getElementById("nightFinanceDrawer");if(finance)financeDrawerOpen=finance.open;
  }
  function prepareWorkstreamExpansion(state,brandIds){
    if(!workstreamExpansionReady&&brandIds.length){expandedWorkstreamIds.add(brandIds[0]);workstreamExpansionReady=true;}
    for(const crisis of state.crises){
      if(autoOpenedCrisisIds.has(crisis.id))continue;
      const target=crisis.targetId?accountById(state,crisis.targetId):null;
      if(target)expandedWorkstreamIds.add(brandIdFor(target));
      autoOpenedCrisisIds.add(crisis.id);
    }
  }
  function workstreamEvidence(accounts){
    const delivered=accounts.map(a=>a.last).filter(L=>L&&!L.blocked),spend=delivered.reduce((n,L)=>n+(L.spend||0),0),
      modeled=delivered.reduce((n,L)=>n+(L.modeledRevenue||0),0),active=accounts.filter(a=>!a.paused),weights=active.reduce((n,a)=>n+Math.max(1,a.budget),0),
      learning=active.length?active.reduce((n,a)=>n+a.learning*Math.max(1,a.budget),0)/Math.max(1,weights):accounts.reduce((n,a)=>n+a.learning,0)/Math.max(1,accounts.length);
    return {spend,modeled,mer:spend?modeled/spend:null,learning,allocation:active.reduce((n,a)=>n+a.budget,0)};
  }
  function workstreamHealth(accounts,evidence){
    if(accounts.some(a=>a.blockedDays>0))return ["bad","account hold"];
    if(accounts.every(a=>a.paused))return ["warn","paused"];
    if(evidence.mer===null)return ["warn","unread"];
    return evidence.mer>=1.2?["good","healthy"]:evidence.mer>=.9?["warn","watch"]:["bad","bleeding"];
  }
  function workstreamAlert(state,accounts,evidence){const brandId=brandIdFor(accounts[0]);
    const crises=state.crises.filter(c=>{const target=c.targetId?accountById(state,c.targetId):null;return target&&brandIdFor(target)===brandId;});
    if(crises.length)return `${crises.length} active crisis${crises.length===1?"":"es"}: ${crises.map(c=>CRISIS_COPY[c.type]?.title||c.type).join(" · ")}`;
    const held=accounts.filter(a=>a.blockedDays>0);if(held.length)return `${held.length} initiative${held.length===1?"":"s"} on account hold`;
    const claims=accounts.reduce((n,a)=>n+a.incomingClaims.reduce((m,item)=>m+item.value,0),0);if(claims>0)return `${money(claims)} of cross-account claims need interpretation`;
    const event=state.dayState?.event,target=event?.targetId?accountById(state,event.targetId):null;
    if(target&&brandIdFor(target)===brandId&&event.id!=="quiet")return `Today's preview: ${event.title}`;
    if(evidence.mer!==null&&evidence.mer<.9)return "Last-day modeled MER is below 0.90×";
    return "No active alert";
  }
  function nextDecisionCue(state,a,pixel,accountMer){const lane=LANES[a.platform],L=a.last;
    const crisis=state.crises.find(c=>{const target=c.targetId?accountById(state,c.targetId):null;return target&&brandIdFor(target)===brandIdFor(a);});
    if(crisis)return `Open the crisis queue: ${CRISIS_COPY[crisis.type]?.title||"an operational ticket"} affects this workstream. Diagnose its layer before changing delivery.`;
    if(a.blockedDays>0)return "Delivery is held at the ad-account layer. Resolve that hold; replacing the creative will not restore delivery.";
    if(a.paused)return "This initiative is paused. Resume it only after its allocation fits inside the shared portfolio cap.";
    if(a.incomingClaims.length)return "Audit the shared event source before treating this platform claim as new business value.";
    const event=state.dayState?.event;if(event?.targetId===a.id&&event.id!=="quiet")return `Today's preview targets this initiative: ${event.title}. Check the affected layer before running the day.`;
    if(pixel&&pixelBrandCount(state,pixel)>1&&pixel.purity<.72)return "Shared event-source integrity is weak. Repair or separate the mapping before scaling from platform-reported results.";
    if(!L)return "Run one day at the current allocation to establish a delivery baseline before making a structural change.";
    if(lane.kind==="search"){
      if(a.qualityScore<7)return "Improve search-ad and landing relevance before paying more for rank.";
      if(a.negatives<4)return "Review search terms and add exclusions before widening spend.";
      if((L.undelivered||0)>a.budget*.15)return "This lane is near its query ceiling. Extra budget may not deliver; compare another intent lane or demand-creation channel.";
      if(accountMer<.9)return "Modeled return is weak. Check query intent, negatives, relevance, and bids before increasing allocation.";
    }
    if(lane.kind==="ctv"&&a.claimTrust<.65)return "Audit view-through assumptions before using the platform claim to justify more CTV allocation.";
    if(lane.kind!=="search"&&a.fatigue>=65)return "Attention is wearing out. Test and replace the active creative before increasing allocation.";
    if(accountMer<.9)return "Modeled return is weak. Diagnose creative fit, downstream quality, and the event source before scaling.";
    if(accountMer>=1.2&&canIncreaseAllocation(state,a))return `Evidence is positive. If the portfolio still needs volume, test one ${money(BUDGET_STEP)} allocation step and watch marginal MER.`;
    return "Hold the current allocation, run another day, and watch whether modeled value and platform claims continue to agree.";
  }
  function initiativeMarkup(state,a,committed,flavor,ft){
    const lane=LANES[a.platform],L=a.last,[healthCls,health]=healthFor(a),pixel=pixelById(state,a.pixel),siblings=brandAccounts(state,a),format=creativeFormat(a),
      formatTitle=tooltipsEnabled()?` title="${format.description}"`:"",modeled=L&&!L.blocked?L.modeledRevenue:0,
      claimed=L&&!L.blocked?L.reportedRevenue:(a.crossClaimToday||0),accountMer=L&&L.spend?modeled/L.spend:0,
      headingId=`nightInitiative-${String(a.id).replace(/[^a-z0-9_-]/gi,"-")}`,
      formatSystem=typeof creativeSystemFor==="function"?creativeSystemFor(format):{mark:"🧩",label:"Creative system"},
      laneFitValue=formatFit(a,format),styleFitValue=formatStyleFit(a,format),fitRead=value=>value>=1.1?"strong":value>=.96?"workable":"adaptation required";
    return `<article class="slot night-initiative ${a.paused?"dead":""} ${healthCls==="bad"?"burned":""}" aria-labelledby="${headingId}">
      <section class="night-card-section night-card-scope">
        <div class="night-section-title">Scope</div>
        <div class="fam"><span class="health-dot ${healthCls}"></span>Last-day efficiency status: ${health} · platform initiative ${a.initiativeIndex||1} · ${displayName(a.business)}</div>
        <h3 id="${headingId}">${displayName(a.name)} · ${lane.name}</h3>
        <div class="row"><span class="tag intent">Vertical · ${a.vertical}</span><span class="tag">Lane · ${lane.name}</span>
          ${siblings.length>1?`<span class="tag">Workstream mix · ${siblings.map(platformLabel).join(" + ")}</span>`:""}
          <span class="tag ${pixel&&pixel.purity<.65?"flag":""}">Event source · ${pixel?pixel.name:"separate source"} · integrity ${pixel?(pixel.purity*100).toFixed(0):100}%</span>
          ${a.blockedDays?`<span class="tag flag">Account hold · ${a.blockedDays} day${a.blockedDays===1?"":"s"}</span>`:""}</div>
        <div class="metaphor-inline">Advertiser workstream ≈ ${flavorAliasForTerm("advertiser workstream",flavor)} · Active platform initiative ≈ ${flavorAliasForTerm("platform initiative",flavor)} · Event-source cluster ≈ ${flavorAliasForTerm("event-source cluster",flavor)}</div>
      </section>
      <section class="night-card-section night-card-snapshot">
        <div class="night-section-title">What needs attention now</div>
        <div class="night-next-decision"><b>Next decision:</b> ${nextDecisionCue(state,a,pixel,accountMer)}</div>
        <div class="grid2"><span>Business objective</span><span>${a.objective}</span><span>Daily allocation</span><span>${money(a.budget)}</span>
          <span>Learning</span><span>${(a.learning*100).toFixed(0)}%</span></div>
        <div class="note"><b>How this lane behaves:</b> ${lane.note}<br><b>What the controls affect:</b> ${lane.hierarchy}</div>
      </section>
      <section class="night-card-section night-card-evidence">
        <div class="night-section-title">Last-day evidence</div>
        <div class="grid2"><span>Media spend</span><span>${L?money(L.spend||0):"—"}</span><span>Modeled outcome value</span><span>${L?money(modeled):"—"}</span>
          <span>Platform claim</span><span>${L||claimed?money(claimed):"—"}</span><span>Modeled MER</span><span>${L&&L.spend?accountMer.toFixed(2)+"×":"—"}</span></div>
        ${a.incomingClaims.length?`<div class="note night-attribution-alert"><b>Cross-account claim assigned here:</b> ${a.incomingClaims.map(item=>{const source=accountById(state,item.sourceId);return `${money(item.value)} from ${source?displayName(source.name):item.sourceId} / ${source?platformLabel(source):"unknown lane"}`;}).join("; ")}. This claim did not create another modeled outcome or receivable.</div>`:""}
        <div class="metaphor-inline">Modeled outcome value ≈ ${flavor.metrics.revenue} · Platform claim ≈ credit assigned by ${ft.attribution} · Modeled MER ≈ ${flavor.metrics.mer}</div>
      </section>
      <section class="night-card-section night-card-delivery">
        <div class="night-section-title">Delivery path</div><div class="funnel">${laneMetricMarkup(a)}</div>
      </section>
      <section class="night-card-section night-card-asset">
        <div class="night-section-title">${lane.kind==="search"?"Search setup":"Creative"}</div>
        ${lane.kind!=="search"?`<div><div class="creative-meta"><span class="fam">Creative concept · ${a.creative.name}</span>
          <span class="tag ${a.creative.cls||"common"}">${a.creative.tier}</span>
          <span class="tag format-badge format-${format.id}"${formatTitle}><span class="format-mark" aria-hidden="true">${format.mark}</span>${format.label}</span>
          <span class="tag">fatigue ${Math.round(a.fatigue)}%</span></div>
          <div class="grid2 creative-anatomy-grid"><span>Format type</span><span>${format.kind}</span><span>Production approach</span><span>${formatSystem.mark} ${formatSystem.label}${formatSystem.cadence?` · ${formatSystem.cadence}`:""}</span>
            <span>${lane.name} fit</span><span>${fitRead(laneFitValue)}</span><span>Fit for ${buyingStyle(a).replace(/_/g," ")}</span><span>${fitRead(styleFitValue)}</span>
            <span>Production burden</span><span>${format.production}</span><span>Primary tradeoff</span><span>${format.tradeoff}</span></div>
          <div class="note"><b>Why this behaves differently:</b> ${format.description}<br>The execution type changes production burden, platform fit, response, lead quality and fatigue. Concept is the repeatable idea; rarity sets the card's possible upside range. None of them changes the advertiser, platform account, campaign or event source.${format.platformNote?`<br><b>Placement adaptation:</b> ${format.platformNote}`:""}</div>
          ${a.creativeQueue?`<div class="note"><b>In production:</b> ${creativeQueueCopy(a,state)}</div>`:""}
          <div class="meter fatigue"><i style="width:${clamp(a.fatigue,0,100)}%"></i></div></div>`:
          `<div><div class="fam">Search controls · bid x${a.bid.toFixed(2)} · Quality Score ${a.qualityScore.toFixed(1)} · negatives ${a.negatives}</div>
          <div class="meter"><i style="width:${clamp(a.qualityScore*10,0,100)}%"></i></div></div>`}
      </section>
      <section class="night-card-section night-card-decisions">
        <div class="night-section-title">Decisions</div>
        <div class="spendline"><button class="btn" data-night="budget-minus" data-id="${a.id}" ${a.budget<=0?"disabled":""}>−${money(BUDGET_STEP)}</button>
          <span class="amt">${money(a.budget)}</span><button class="btn" data-night="budget-plus" data-id="${a.id}" ${canIncreaseAllocation(state,a)?"":"disabled"}>+${money(BUDGET_STEP)}</button></div>
        <div class="row night-decision-grid"><button class="btn wide" data-night="lane" data-id="${a.id}">Manage platform initiatives · ${lane.name}</button>
          ${lane.kind==="search"?`<button class="btn" data-night="bid-minus" data-id="${a.id}" ${canBidDown(a)?"":"disabled"}>Lower bid · −0.12×</button><button class="btn" data-night="bid-plus" data-id="${a.id}" ${canBidUp(a)?"":"disabled"}>Raise bid · +0.12×</button>
            <button class="btn wide" data-night="search-negatives" data-id="${a.id}" ${state.ops&&canAddNegatives(a)?"":"disabled"}>${canAddNegatives(a)?`Review terms and add negatives · ${money(DAILY*.0035)} + 1 operations action`:"Negative-query benefit fully captured"}</button>
            <button class="btn wide" data-night="search-relevance" data-id="${a.id}" ${state.ops&&canImproveSearch(a)?"":"disabled"}>${canImproveSearch(a)?`Improve search ad and landing relevance · ${money(DAILY*.006)} + 1 operations action`:"Search relevance at the current maximum"}</button>`:
            lane.kind==="ctv"?`<button class="btn wide" data-night="view-audit" data-id="${a.id}" ${state.ops&&canAuditView(state,a)?"":"disabled"}>${canAuditView(state,a)?`Audit view-through assumptions · ${money(DAILY*.008)} + 1 operations action`:"View-through controls fully audited"}</button>
              <button class="btn wide" data-night="format-picker" data-id="${a.id}" ${state.ops&&!a.creativeQueue?"":"disabled"}>${a.creativeQueue?`Creative review estimate · ${Math.max(0,a.creativeQueue.readyDay-state.day)} ${Math.max(0,a.creativeQueue.readyDay-state.day)===1?"day":"days"}`:`Choose next CTV creative format →`}</button>`:
            `<button class="btn wide" data-night="format-picker" data-id="${a.id}" ${state.ops&&!a.creativeQueue?"":"disabled"}>${a.creativeQueue?`Creative review estimate · ${Math.max(0,a.creativeQueue.readyDay-state.day)} ${Math.max(0,a.creativeQueue.readyDay-state.day)===1?"day":"days"}`:`Choose next creative format →`}</button>`}</div>
        ${lane.kind==="search"&&typeof densityLevel==="function"&&densityLevel()==="guided"?`<div class="note"><b>Before changing the bid:</b> Each step changes auction pressure by 0.12×. A higher bid can win more impression share until demand runs out, but it can raise cost per click. A lower bid protects cost but may lose volume. Bids do not improve Quality Score.</div>`:""}
        <div class="row night-decision-grid"><button class="btn wide" data-night="isolate" data-id="${a.id}" ${state.ops&&pixel&&pixelBrandCount(state,pixel)>1?"":"disabled"}>Separate advertiser event source · ${money(DAILY*.018)} + 1 operations action · resets learning</button>
          <button class="btn wide" data-night="pause" data-id="${a.id}" ${a.paused&&committed+a.budget>DAILY?"disabled":""}>${a.paused?"Resume active delivery":"Pause active delivery"}</button></div>
      </section>
    </article>`;
  }
  function workstreamMarkup(state,brandId,committed,flavor,ft){const accounts=brandAccounts(state,brandId),lead=accounts[0],evidence=workstreamEvidence(accounts),
    [healthCls,health]=workstreamHealth(accounts,evidence),lanes=[...new Set(accounts.map(platformLabel))],alert=workstreamAlert(state,accounts,evidence),open=expandedWorkstreamIds.has(brandId);
    return `<details class="night-workstream" data-workstream-id="${brandId}" ${open?"open":""}>
      <summary class="night-workstream-summary">
        <span class="night-summary-primary"><span class="night-summary-health"><span class="health-dot ${healthCls}"></span>Last-day MER status: ${health}</span>
          <span class="night-summary-name">${displayName(lead.name)}</span><span class="night-summary-meta">${displayName(lead.business)} · ${lanes.join(" + ")}</span></span>
        <span class="night-summary-objective">${lead.objective}</span>
        <span class="night-summary-kpis"><span class="night-summary-kpi"><b>${money(evidence.allocation)}</b> allocation</span>
          <span class="night-summary-kpi"><b>${evidence.mer===null?"—":evidence.mer.toFixed(2)+"×"}</b> last-day modeled MER</span>
          <span class="night-summary-kpi"><b>${(evidence.learning*100).toFixed(0)}%</b> learning</span></span>
        <span class="night-summary-alert ${alert==="No active alert"?"is-clear":"is-active"}">${alert}</span>
      </summary>
      <div class="night-workstream-body">${accounts.map(a=>initiativeMarkup(state,a,committed,flavor,ft)).join("")}</div>
    </details>`;
  }

  function render(){
    const state=S;captureDisclosureState();updateFlavorChrome();const flavor=currentFlavor(),ft=flavor.terms;
    document.getElementById("accountSection").textContent=`Portfolio overview${analogiesEnabled()?` · ${ft.holding}`:""}`;
    document.getElementById("accountSectionNote").textContent="cash, credit, return and risks across the whole company";
    document.getElementById("adSection").textContent=`Advertiser workstreams${analogiesEnabled()?` · ${flavorAliasForTerm("advertiser workstream",flavor)}`:""}`;
    document.getElementById("adSectionNote").textContent="expand a workstream for initiative evidence and controls";
    document.getElementById("runSummary").textContent=`${MODE_SCOPE_TITLE[MODE]} · agency portfolio · ${DAYS}-day mandate`;
    document.getElementById("seedLbl").textContent=`Scenario ${state.seedShown}`;
    const committed=allocated(state),profit=projectedProfit(state),mer=state.spendTotal?state.modeledRevenue/state.spendTotal:0,
      profitGate=portfolioProfitGate(),paydownAmount=Math.min(DAILY*1.5,state.finance.cash,state.finance.creditUsed);
    const claimedRoas=state.spendTotal?state.reportedRevenue/state.spendTotal:0,gap=portfolioAttributionGap(state);
    const primaryRows=[
      ["Day",`${Math.min(state.day,DAYS)} / ${DAYS}`,`gate streak ${state.gateStreak}/3`],
      ["Portfolio allocation",money(committed),`${money(Math.max(0,DAILY-committed))} unallocated · daily cap ${money(DAILY)}`,committed>DAILY?"neg":""],
      ["Cash",money(state.finance.cash),`${money(state.finance.collections)} collected`,state.finance.cash<DAILY?"amb":"pos"],
      ["Available credit",money(availableCredit(state)),`${money(state.finance.creditUsed)} locked / ${money(state.finance.creditLimit)}`,availableCredit(state)<DAILY?"neg":""],
      ["Blended modeled marketing efficiency ratio (MER)",`${mer.toFixed(2)}×`,"modeled outcome value divided by media spend",mer>=1.12?"pos":"neg"],
      ["Open crises",String(state.crises.length),`${state.ops} operations action${state.ops===1?"":"s"} left`,state.crises.length?"neg":"pos"]
    ],secondaryRows=[
      ["Media spend",money(state.spendTotal),`${money(state.billedTotal)} adjusted billed cost`],
      ["Modeled outcome value",money(state.modeledRevenue),"To The Moon's estimate of validated business outcomes"],
      ["Platform claims",money(state.reportedRevenue),"raw, overlapping attribution claims","amb"],
      ["Projected contribution",money(profit),`${money(state.opsCost)} operations cost`,profit>=0?"pos":"neg"],
      ["Claimed return on ad spend (ROAS)",`${claimedRoas.toFixed(2)}×`,"not cash and may double-count","amb"],
      ["Attribution gap",`${(gap*100).toFixed(0)}%`,`audit quality ${(state.auditQuality*100).toFixed(0)}%`,gap<=.38?"pos":"neg"]
    ];
    const strip=document.getElementById("strip");strip.classList.add("night-hud-primary");strip.innerHTML=statCards(primaryRows);

    const brandIds=[...new Set(state.accounts.map(brandIdFor))];prepareWorkstreamExpansion(state,brandIds);
    const slots=document.getElementById("slots");slots.classList.add("night-workstream-list");
    const statusGuide=typeof densityLevel==="function"&&densityLevel()==="guided"?`<div class="note"><b>Last-day MER status:</b> Healthy means modeled marketing efficiency ratio (MER) was at least 1.20×. Watch means 0.90×–1.19×. Bleeding means below 0.90×. These ranges help you triage; they do not replace the business goal or a longer trend.</div>`:"";
    slots.innerHTML=statusGuide+brandIds.map(id=>workstreamMarkup(state,id,committed,flavor,ft)).join("");
    slots.querySelectorAll("details[data-workstream-id]").forEach(node=>node.addEventListener("toggle",()=>{
      const id=node.dataset.workstreamId;if(node.open)expandedWorkstreamIds.add(id);else expandedWorkstreamIds.delete(id);
    }));
    const visibleLog=state.log.map(entry=>typeof entry==="string"?displayCopy(entry):{...entry,html:displayCopy(entry.html)});
    document.getElementById("log").innerHTML=renderLog(visibleLog,'<div style="color:var(--ink-dim)">The portfolio is ready. Set allocations, inspect today’s event, then run the day.</div>');
    document.getElementById("asksLeft").textContent=state.ops;document.getElementById("asksRow").style.display="";
    document.getElementById("asksLabel").textContent="Operations actions left today:";
    const binBtn=document.getElementById("binBtn");binBtn.style.display="";binBtn.disabled=!state.crises.length;
    binBtn.className=`btn wide${state.crises.length?" crisis-count":""}`;binBtn.textContent=`Crisis queue (${state.crises.length})`;
    const e=state.dayState.event,target=e.targetId?accountById(state,e.targetId):null,opening=nightmareOpeningProfile();
    const accountBox=document.getElementById("accountBox");accountBox.classList.add("night-command-center");
    accountBox.innerHTML=`<div class="portfolio-banner"><b>Practice environment</b><span>No live advertiser data or platform write access is used. Platform names identify the buying tools represented in the game.<span class="flavor-cue">${flavorCue("portfolio")}</span></span></div>
      <div class="eyebrow">Holding-company command center</div>
      <div class="scenario-conditions"><div><span>Inherited portfolio</span><b>${opening.portfolio.label}</b><small>${opening.portfolio.brief}</small></div><div><span>Operating condition</span><b>${opening.operating.label}</b><small>${opening.operating.brief}</small></div></div>
      <div class="eventcard ${e.tone||state.dayState.mood.tone}"><div class="eventtitle">Day ${Math.min(state.day,DAYS)} preview · ${state.dayState.mood.label} (${state.dayState.mood.detail}) · ${e.title}</div>
        <div class="eventbody">${target?`${displayName(target.name)} · ${platformLabel(target)}<br>`:"Portfolio-wide<br>"}${displayCopy(e.body)}<span class="flavor-cue">${e.id==="quality"?qualityFlavorText():nightmareEventFlavorText(e.id)}</span><span class="flavor-cue">${flavorCue(e.concept||"day")}</span></div></div>
      <div class="note night-win-condition"><b>Win condition:</b> Pass three consecutive 30-day gates and reach ${money(profitGate)} in projected contribution before the mandate ends. Every gate must meet all five checks:
        <ul><li><b>Return:</b> Modeled MER of at least 1.12× and positive gate profit.</li>
          <li><b>Measurement:</b> Attribution gap of 38% or less and audit quality of at least 40%.</li>
          <li><b>Liquidity:</b> At least 12% of the credit line available and no more than one failed-payment day.</li>
          <li><b>Advertiser mix:</b> No advertiser above 52% of modeled value.</li>
          <li><b>Platform mix:</b> No platform above 58% of spend, unless both contingency layers are built.</li></ul></div>
      <div class="matrix"><div><b>Daily event deck</b>${eventDeckSummary()}</div>
        <div><b>When time advances</b>${state.crises.length?`Batch advance is paused while ${state.crises.length} crisis ticket${state.crises.length===1?" is":"s are"} open. Review the queue before advancing time.`:"Run one day for precision or advance until the next crisis or month gate, at most seven days."}</div></div>
      <div class="row" style="margin-top:6px"><button class="btn wide" id="advanceBtn" ${state.ended?"disabled":""}>${state.crises.length?`Review crisis queue · ${state.crises.length} open`:`Advance to next decision · up to 7 days`}</button></div>
      <details class="night-hud-drawer" id="nightFinanceDrawer" ${financeDrawerOpen?"open":""}>
        <summary>Finance and attribution details · ${secondaryRows.length} metrics</summary>
        <div class="strip night-hud-secondary">${statCards(secondaryRows)}</div>
      </details>`;
    const advanceBtn=document.getElementById("advanceBtn");if(advanceBtn)advanceBtn.onclick=state.crises.length?crisisQueue:advance;
    const financeDrawer=document.getElementById("nightFinanceDrawer");if(financeDrawer)financeDrawer.addEventListener("toggle",()=>{financeDrawerOpen=financeDrawer.open;});
    const receivable=state.finance.receivables.reduce((n,r)=>n+r.amount,0),holds=state.finance.creditHolds.reduce((n,h)=>n+h.amount,0);
    document.getElementById("pipeBox").innerHTML=`<div class="eyebrow">Shared systems</div><span class="flavor-cue">${flavorCue("liquidity")}</span>
      <div class="matrix"><div><b>Receivables</b>${money(receivable)} pending · ${state.finance.receivables.length} batches</div>
        <div><b>Credit holds</b>${money(holds)} locked · ${state.finance.creditHolds.length} bills</div>
        <div><b>Attribution controls</b>${(state.auditQuality*100).toFixed(0)}% quality · reduces future claim uncertainty</div>
        <div><b>Resilience</b>${state.contingency}/2 contingency layers · ${state.backupGraceDays} paid billing-grace day${state.backupGraceDays===1?"":"s"} available · an all-Google plan is allowed when both layers are built</div></div>
      ${state.pixels.map(p=>`<div class="pixelrow"><b>${p.name}</b> · ${displayName(p.business)}<br>${pixelMemberSummary(state,p)} · simulated signal integrity ${(p.purity*100).toFixed(0)}%
        <div class="meter"><i style="width:${p.purity*100}%"></i></div></div>`).join("")}
      ${monthMarkup(state)}
      <div class="row" style="margin-top:6px"><button class="btn wide" id="auditBtn" ${state.ops&&canAuditPortfolio(state)?"":"disabled"}>${canAuditPortfolio(state)?`Audit portfolio attribution · ${money(DAILY*.014)} + 1 operations action`:"Portfolio attribution controls fully audited"}</button>
        <button class="btn wide" id="cleanBtn" ${state.ops&&weakestRepairablePixel(state)?"":"disabled"}>${weakestRepairablePixel(state)?`Repair weakest event mapping · ${money(DAILY*.010)} + 1 operations action`:"Event mappings at the current maximum"}</button>
        <button class="btn wide" id="contingencyBtn" ${state.ops&&state.contingency<2?"":"disabled"}>Build contingency ${state.contingency}/2 · ${money(DAILY*.045)} + 1 operations action</button>
        <button class="btn wide" id="paydownBtn" ${state.crises.some(c=>c.type==="payment_failure")||(state.finance.cash>0&&state.finance.creditUsed>0)?"":"disabled"}>${state.crises.some(c=>c.type==="payment_failure")?"Payment failure open · review crisis queue":`Pay down ${money(paydownAmount)} of shared credit · uses cash`}</button></div>`;
    for(const [id,action] of [["auditBtn","audit"],["cleanBtn","clean"],["contingencyBtn","contingency"],["paydownBtn","paydown"]]){
      const node=document.getElementById(id);if(node)node.onclick=()=>globalAction(action);}
    const runBtn=document.getElementById("runBtn"),runText=runBtn.querySelector("span"),runLens=document.getElementById("runLens");
    runBtn.disabled=state.ended;if(runText)runText.textContent=state.ended?"Mandate complete":`Run Day ${Math.min(state.day,DAYS)}`;
    if(runLens)runLens.textContent=state.ended?"Review the final portfolio result":`Spend selected allocations and reveal Day ${Math.min(state.day,DAYS)} results`;
    if(tooltipsEnabled()&&typeof wireLore==="function")wireLore();
    if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.sync();
  }

  function setLane(accountId,laneId,state=S){const a=accountById(state,accountId);if(state.ended||!a||!LANES[laneId])return false;
    if(a.platform===laneId)return true;
    if(brandAccounts(state,a).some(other=>other.id!==a.id&&other.platform===laneId))return false;
    const replacingHeldAccount=state.crises.some(c=>c.type==="false_flag"&&c.targetId===a.id&&c.meta?.targetLane===a.platform);
    const before=platformLabel(a),search=LANES[laneId].kind==="search",wasSearch=LANES[a.platform].kind==="search",abandoned=a.creativeQueue;
    a.platform=laneId;a.learning=state.contingency>=2?.68:.56;a.competition=1;a.last=null;a.fatigue=12;a.creativeFitM=1;a.creativeQueue=null;
    if(replacingHeldAccount)a.blockedDays=0;
    a.creative={...a.creative,name:search?"Responsive Search Assets":wasSearch?"Evergreen Core":a.creative.name,
      tier:search?"Search text / assets":wasSearch?"Common":a.creative.tier,cls:search?"":wasSearch?"common":a.creative.cls,
      boost:search?1:a.creative.boost,fatigue:search?1:a.creative.fatigue,format:defaultFormatId(laneId),assetLane:laneId};
    a.creativeVersion=(a.creativeVersion||0)+1;
    supersedeCrises(state,c=>["ghost_attribution","false_flag","bid_war"].includes(c.type)&&c.targetId===a.id&&c.meta?.targetLane&&c.meta.targetLane!==laneId||
      c.type==="lead_quality_escalation"&&c.targetId===a.id&&qualityScopeStale(c,a),
      `the affected ${before} initiative was replaced before the ticket response`);
    state.telemetry.laneMoves++;addLog(`<div><b>Platform initiative activated</b> — ${displayName(a.name)}: the ${before} campaign paused and a ${LANES[laneId].name} campaign activated. The creative concept was rebuilt as a lane-specific ad/asset; learning reset while the advertiser, operating company, allocation and event source stayed put.${abandoned?" The unfinished creative commission was abandoned because it was scoped to the replaced lane; its spent production cost was not refunded.":""}</div>`,"platform");markRunDirty();return true;}
  function addParallelInitiative(accountId,laneId,state=S){const source=accountById(state,accountId);
    if(state.ended||!source||!LANES[laneId]||state.accounts.length>=48)return false;
    const siblings=brandAccounts(state,source);if(siblings.some(a=>a.platform===laneId)||siblings.length>=LANE_ORDER.length)return false;
    if(!useOperation(state,DAILY*.009,"parallel platform initiative setup"))return false;
    const initiativeIndex=Math.max(0,...siblings.map(a=>a.initiativeIndex||1))+1,id=`${brandIdFor(source)}::initiative-${initiativeIndex}`;
    const search=LANES[laneId].kind==="search",format=defaultFormatId(laneId);
    const next={...source,id,brandId:brandIdFor(source),initiativeIndex,platform:laneId,budget:0,paused:false,blockedDays:0,
      fatigue:10,quality:.84,qualityScore:6.5,bid:1,competition:1,negatives:0,learning:state.contingency>=2?.68:.56,
      claimTrust:.35,creativeFitM:1,creative:{name:search?"Responsive Search Assets":"Lane-Adapted Core",tier:search?"Search text / assets":"Common",
        cls:search?"":"common",boost:1,fatigue:1,format,assetLane:laneId},creativeVersion:0,creativeQueue:null,last:null,createdDay:state.day,
      totals:{spend:0,billed:0,modeled:0,reported:0,conversions:0},crossClaimToday:0,incomingClaims:[],creativeTests:0};
    state.accounts.push(next);const p=pixelById(state,next.pixel);if(p&&!p.members.includes(id))p.members.push(id);
    state.telemetry.parallelInitiatives++;addLog(`<div><b>Parallel initiative opened</b> — ${displayName(source.name)} now also has a ${LANES[laneId].name} platform initiative. A lane-specific adaptation — not a free clone of the winning asset — starts at ${money(0)} allocation with fresh learning, while the advertiser, operating company and event source remain shared.</div>`,"platform");
    markRunDirty();return next;
  }
  function lanePicker(accountId){const a=accountById(S,accountId);if(!a)return;
    const siblingLanes=new Set(brandAccounts(S,a).map(x=>x.platform));
    show(`<div class="eyebrow">Manage platform initiatives · ${displayName(a.name)}</div><h2>Any lane — or mix of lanes — is allowed</h2>
      <div class="prose"><p>A fully Google strategy is valid: combine Google Ads — Search for finite intent capture with Google Ads — Demand Gen for visual demand, or concentrate entirely in either one. <strong>Replace this initiative</strong> pauses its old campaign and rebuilds the lane-specific asset. <strong>Add parallel</strong> creates another simulated platform account/campaign under the same advertiser, starting at $0 allocation and sharing its operating company and current event source.</p></div>
      <div class="bin">${LANE_ORDER.map(id=>{const l=LANES[id],active=a.platform===id,exists=siblingLanes.has(id);return `<div class="binrow"><span class="nm"><b>${l.name}</b><br><small>${l.kind.toUpperCase()} · ${l.hierarchy}<br>${l.note}</small></span>
        <span class="flavor-cue">${flavorCue(l.kind==="search"?"search":"platform")}</span>
        <button class="btn" data-lane="${id}" ${active||exists?"disabled":""}>${active?"This initiative":exists?"Already parallel":"Replace this"}</button>
        <button class="btn" data-add-lane="${id}" ${exists||!S.ops?"disabled":""}>${exists?"Active in workstream":`Add parallel initiative · ${money(DAILY*.009)} + 1 operations action`}</button></div>`;}).join("")}</div>
      <div class="row"><button class="btn wide" id="closeB">Back to portfolio</button></div>`,"platform");
    document.getElementById("closeB").onclick=close;
    ov.querySelectorAll("button[data-lane]").forEach(b=>b.onclick=()=>{setLane(accountId,b.dataset.lane);close();render();});
    ov.querySelectorAll("button[data-add-lane]").forEach(b=>b.onclick=()=>{addParallelInitiative(accountId,b.dataset.addLane);close();render();});}
  function rollCreative(state,a,commit=true,requestedFormat=null){const testNumber=(a.creativeTests||0)+1;
    if(commit){state.creativeTests++;a.creativeTests=testNumber;}
    const r=roll("creative-tier",state.day,a.id,testNumber);let cursor=0,tier=TIERS[0];
    for(const candidate of TIERS){cursor+=candidate.weight;if(r<=cursor){tier=candidate;break;}}
    const deck=FORMAT_DECK[a.platform]||["static"],formatRoll=deck[Math.floor(roll("creative-format",state.day,a.id,testNumber)*deck.length)],
      requested=String(requestedFormat||""),format=requested&&requested!=="search"&&formatCatalog()[requested]?requested:formatRoll;
    const names=FORMAT_NAMES[format]||CREATIVE_NAMES,name=names[Math.floor(roll("creative-name",state.day,a.id,testNumber)*names.length)];
    return {name,tier:tier.name,cls:tier.cls,boost:tier.boost,fatigue:tier.fatigue,format};}
  function nightmareProductionProfile(a,format){const system=typeof creativeSystemFor==="function"?creativeSystemFor(format):
      {id:format.system||"modular",label:"Creative system",costM:1,daysM:1,reviewM:1,cadence:"Format-dependent cadence"},
    active=creativeFormat(a),familiar=active&&active.system===format.system,
    workflowCostM=familiar?.90:1.12,workflowDays=familiar?-1:1,
    reviewM=(format.reviewRiskM||1)*(system.reviewM||1)*(a.platform==="tiktok"&&format.id==="veo"?1.12:1);
    return {system,familiar,reviewM,cost:round50(DAILY*.012*(format.productionCostM||1)*(system.costM||1)*workflowCostM),
      days:Math.max(1,Math.ceil((format.productionDays||2)*(system.daysM||1))+workflowDays)};}
  function creativeQueueCopy(a,state){const queued=a.creativeQueue,format=formatCatalog()[queued.format],days=Math.max(0,queued.readyDay-state.day);
    if(queued.stage==="revision-payment")return `${format?.label||"Replacement creative"} is held at review until its required revision can be funded. The current ad keeps delivering.`;
    if(queued.stage==="revision")return `${format?.label||"Replacement creative"} has ${days} revision day${days===1?"":"s"} left. The current ad keeps delivering.`;
    return `${format?.label||"Replacement creative"} reaches review in ${days} day${days===1?"":"s"}. Approval, revision or rejection resolves before activation; the current ad keeps delivering.`;}
  function nightmareCreativeCost(format,a){return nightmareProductionProfile(a,format).cost;}
  function commissionCreative(state,a,formatId){
    if(!a||LANES[a.platform].kind==="search"||a.creativeQueue||!state.ops)return false;
    const format=formatCatalog()[formatId]||(typeof creativeFormatById==="function"?creativeFormatById(formatId):FALLBACK_FORMATS.static),
      profile=nightmareProductionProfile(a,format),cost=profile.cost;
    if(!useOperation(state,cost,`creative commission · ${format.label}`))return false;
    const candidate=rollCreative(state,a,true,format.id),days=profile.days;
    a.creativeQueue={candidate,format:format.id,systemId:profile.system.id,commissionedDay:state.day,readyDay:state.day+days,
      stage:"build",reviewRiskM:profile.reviewM,revisionCost:round50(cost*.18),systemSwitch:!profile.familiar};
    addLog(`<div><b>Creative commissioned</b> — ${displayName(a.name)} started ${format.label} · ${candidate.name}. ${profile.familiar?`The existing ${profile.system.label} workflow shortened the build.`:`Switching into the ${profile.system.label} added setup overhead.`} The active creative keeps running during the ${days}-day production window; review and rarity resolve before activation.</div>`,"creative");
    markRunDirty();close();render();return true;}
  function nightmareFormatPicker(accountId){
    const a=accountById(S,accountId);if(!a||LANES[a.platform].kind==="search")return false;
    const formats=(typeof selectableCreativeFormats==="function"?selectableCreativeFormats():Object.values(formatCatalog()).filter(format=>format.id!=="search")),
      systems=(typeof CREATIVE_SYSTEMS!=="undefined"?Object.values(CREATIVE_SYSTEMS).filter(system=>system.id!=="search"):[]),
      fitRead=value=>value>=1.1?"strong":value>=.96?"workable":"adaptation required";
    const formatCard=format=>{const laneFit=Number(format.fit&&format.fit[a.platform])||1,styleFit=Number(format.styleFit&&format.styleFit[buyingStyle(a)])||1,
      profile=nightmareProductionProfile(a,format),cost=profile.cost,disabled=!S.ops||S.finance.cash+availableCredit(S)<cost,
      reviewRead=profile.reviewM>=1.3?"elevated":profile.reviewM<=.9?"lighter":"standard";
      return `<article class="creative-format-option"><div class="creative-format-heading"><span class="format-option-mark" aria-hidden="true">${format.mark}</span><span><b>${format.label}</b><small>What it is · ${format.kind}</small></span></div>
        <div class="row"><span class="tag">Modeled lane fit · ${fitRead(laneFit)}</span><span class="tag">Modeled objective fit · ${fitRead(styleFit)}</span></div>
        <p>${format.description}</p><div class="creative-format-model-label">Modeled tendencies in To The Moon</div><dl><div><dt>Build time</dt><dd>${profile.days} day${profile.days===1?"":"s"} · ${profile.familiar?"familiar workflow":"workflow switch"}</dd></div><div><dt>Cost</dt><dd>${money(cost)} + 1 operations action</dd></div>
          <div><dt>Review</dt><dd>${reviewRead} pressure</dd></div><div><dt>Fatigue</dt><dd>${format.fatigueM>1.1?"faster":format.fatigueM<.9?"slower":"balanced"}</dd></div><div><dt>Downstream</dt><dd>${format.qualityM>1.07?"stronger":format.qualityM<.93?"lighter":"balanced"}</dd></div></dl>
        <small class="format-lanes">${profile.system.mark} ${profile.system.label} · ${profile.system.cadence||"format-dependent cadence"}</small>
        ${format.platformNote?`<div class="note"><b>Placement adaptation:</b> ${format.platformNote}</div>`:""}
        <button class="btn wide" data-night-format="${format.id}" ${disabled?"disabled":""}>Commission ${format.label}</button></article>`;};
    show(`<div class="eyebrow">Creative commission · ${displayName(a.name)}</div><h2>Build for ${platformLabel(a)} and ${buyingStyle(a).replace(/_/g," ")}</h2>
      <div class="prose"><p>You choose the execution type; the rarity tier appears when production finishes. The current creative keeps delivering until the replacement is ready. Platform fit, objective fit, production burden, downstream quality, fatigue and volatility each affect the result.</p></div>
      ${typeof creativeCatalogGuideMarkup==="function"?creativeCatalogGuideMarkup():""}
      <div class="creative-format-groups">${systems.map((system,index)=>{const members=formats.filter(format=>format.system===system.id);if(!members.length)return "";
        return `<details class="creative-format-group" ${index===0?"open":""}><summary>${typeof creativeWorkflowFamilySummary==="function"?creativeWorkflowFamilySummary(system,members):`<span>${system.mark} ${system.label}</span><small>${system.summary}</small>`}</summary><div class="creative-format-grid">${members.map(formatCard).join("")}</div></details>`;}).join("")}</div>
      <div class="row"><button class="btn wide" id="nightSurpriseFormat" ${!S.ops?"disabled":""}>Surprise me · workable lane fit</button><button class="btn wide" id="closeB">Back to portfolio</button></div>`,"creative",{wide:true,rosetta:false});
    document.getElementById("closeB").onclick=close;
    document.getElementById("nightSurpriseFormat").onclick=()=>{const deck=FORMAT_DECK[a.platform]||["static"],id=deck[Math.floor(roll("creative-picker-surprise",S.day,a.id,a.creativeTests||0)*deck.length)];commissionCreative(S,a,id);};
    ov.querySelectorAll("button[data-night-format]").forEach(button=>button.onclick=()=>commissionCreative(S,a,button.dataset.nightFormat));return true;}
  function advanceCreativeProduction(state,lines){
    for(const a of state.accounts){const queued=a.creativeQueue;if(!queued||queued.readyDay>state.day)continue;
      if(queued.stage==="revision-payment"){
        if(!fundCost(state,queued.revisionCost||0,`creative revision · ${displayName(a.name)}`)){
          queued.readyDay++;lines.push(`<b class="neg">${displayName(a.name)} revision held</b> — the replacement stays in review until shared cash or credit can fund the required pass.`);continue;}
        queued.stage="revision";queued.readyDay=state.day+1;state.telemetry.creativeRevisions=(state.telemetry.creativeRevisions||0)+1;
        lines.push(`<b class="amb">${displayName(a.name)} revision funded</b> — one more production day before activation.`);continue;}
      if(queued.stage==="build"){
        const risk=clamp(Number(queued.reviewRiskM)||1,.6,2),reviewRoll=roll("creative-review",queued.readyDay,a.id,a.creativeTests||0),
          rejectP=Math.min(.12,.04*risk),revisionP=Math.min(.30,.13*risk);
        if(reviewRoll<rejectP){a.creativeQueue=null;state.telemetry.creativeRejected=(state.telemetry.creativeRejected||0)+1;
          lines.push(`<b class="neg">${displayName(a.name)} creative not approved</b> — ${formatCatalog()[queued.format]?.label||"the replacement"} stops in review; its production cost remains spent and the live creative stays active.`);
          queueDayFx("compliance",{name:`${displayName(a.name)} replacement not approved`});continue;}
        if(reviewRoll<rejectP+revisionP){queued.stage="revision-payment";
          if(!fundCost(state,queued.revisionCost||0,`creative revision · ${displayName(a.name)}`)){
            queued.readyDay++;lines.push(`<b class="neg">${displayName(a.name)} revision held</b> — review found a required pass, but shared cash and credit cannot fund it yet.`);continue;}
          queued.stage="revision";queued.readyDay=state.day+1;state.telemetry.creativeRevisions=(state.telemetry.creativeRevisions||0)+1;
          lines.push(`<b class="amb">${displayName(a.name)} needs one more pass</b> — review added one day and ${money(queued.revisionCost||0)}. The current creative remains live.`);continue;}
        queued.stage="approved";}
      a.creative=queued.candidate;a.creativeVersion=(a.creativeVersion||0)+1;a.creativeQueue=null;a.creativeFitM=1;a.fatigue=5;a.learning=queued.systemSwitch?.76:.82;state.telemetry.creativeRefreshes++;
      supersedeCrises(state,c=>c.type==="lead_quality_escalation"&&c.targetId===a.id&&qualityScopeStale(c,a),
        "the affected creative was replaced after its controlled production window");
      const format=creativeFormat(a);lines.push(`<b class="pos">${displayName(a.name)} creative activated</b> — ${a.creative.tier} ${format.label} · ${a.creative.name}; fatigue reset and platform learning softened.`);
      queueDayFx("swap",{name:`${a.creative.tier} · ${format.label}`});}}
  function isolatePixel(state,a,cost=true,reconcile=true){const old=pixelById(state,a.pixel);if(!old||pixelBrandCount(state,old)<=1)return false;
    if(cost&&!useOperation(state,DAILY*.018,"advertiser event-source separation"))return false;
    const brandId=brandIdFor(a),moving=old.members.filter(id=>{const member=accountById(state,id);return member&&brandIdFor(member)===brandId;});
    old.members=old.members.filter(id=>!moving.includes(id));const id=`isolated-${brandId}-${state.day}`;
    state.pixels.push({id,name:`${displayName(a.name)} separate conversion source`,business:a.business,members:moving,purity:.94,status:"isolated"});
    for(const member of brandAccounts(state,brandId)){member.pixel=id;member.learning=.48;}
    if(reconcile)supersedeCrises(state,c=>c.type==="pixel_contamination"&&(c.meta?.targetPixel===old.id||c.scopeKey===`pixel:${old.id}`)||
      c.type==="lead_quality_escalation"&&qualityScopeStale(c,accountById(state,c.targetId)),
      `the affected ${old.name} was separated before the ticket response`);
    state.telemetry.pixelIsolations++;return true;}
  function handleAction(button){const state=S;if(state.ended)return false;
    const a=accountById(state,button.dataset.id),action=button.dataset.night;if(!a)return false;
    const lane=LANES[a.platform];
    if((action==="search-negatives"||action==="search-relevance")&&lane.kind!=="search")return false;
    if((action==="bid-plus"||action==="bid-minus")&&lane.kind!=="search")return false;
    if(action==="view-audit"&&lane.kind!=="ctv")return false;
    if((action==="refresh"||action==="format-picker")&&lane.kind==="search")return false;
    if(action==="budget-plus"&&canIncreaseAllocation(state,a))a.budget+=BUDGET_STEP;
    if(action==="budget-minus")a.budget=Math.max(0,a.budget-BUDGET_STEP);
    if(action==="bid-plus"){if(!canBidUp(a))return false;a.bid=clamp(a.bid+.12,.45,1.85);}
    if(action==="bid-minus"){if(!canBidDown(a))return false;a.bid=clamp(a.bid-.12,.45,1.85);}
    if(action==="pause"){
      if(a.paused&&allocated(state)+a.budget>DAILY){addLog(`<div><b class="neg">Cannot enable ${displayName(a.name)}</b> — free ${money(a.budget)} inside the shared daily authorization first.</div>`,"budget");}
      else a.paused=!a.paused;}
    if(action==="lane"){lanePicker(a.id);return;}
    if(action==="format-picker"){nightmareFormatPicker(a.id);return true;}
    /* Kept as a direct simulation action for saved replays and deterministic regression tests.
       The visible UI uses the format picker and production queue above. */
    if(action==="refresh"){
      if(!useOperation(state,DAILY*.012,"creative test and swap")){render();return false;}
      a.creative=rollCreative(state,a);a.creativeVersion=(a.creativeVersion||0)+1;a.creativeFitM=1;a.fatigue=5;a.learning=.82;state.telemetry.creativeRefreshes++;
      supersedeCrises(state,c=>c.type==="lead_quality_escalation"&&c.targetId===a.id&&qualityScopeStale(c,a),
        "the affected creative was replaced outside the controlled diagnostic");
      const format=creativeFormat(a);addLog(`<div><b>Creative replaced</b> — ${displayName(a.name)} received ${a.creative.tier} ${format.label} · ${a.creative.name}. Format, concept, and rarity remain separate.</div>`,"creative");}
    if(action==="search-negatives"){
      if(!canAddNegatives(a))return false;
      if(!useOperation(state,DAILY*.0035,"search terms and negatives")){render();return false;}
      a.negatives+=2;a.learning=Math.max(a.learning,.86);state.telemetry.searchRepairs++;
      addLog(`<div><b>Search terms reviewed</b> — ${displayName(a.name)} added two negative-query themes. Query mix improved; Quality Score and creative fatigue did not change.</div>`,"search");}
    if(action==="search-relevance"){
      if(!canImproveSearch(a))return false;
      if(!useOperation(state,DAILY*.006,"search ad and landing relevance")){render();return false;}
      a.qualityScore=clamp(a.qualityScore+.7,1,10);a.learning=Math.max(a.learning,.88);state.telemetry.searchRepairs++;
      addLog(`<div><b>Search relevance rebuilt</b> — ${displayName(a.name)} aligned the search ad and landing experience, raising simulated Quality Score. Negative keywords and social-style fatigue did not change.</div>`,"search");}
    if(action==="view-audit"){
      if(!canAuditView(state,a))return false;
      if(!useOperation(state,DAILY*.008,"view-through audit")){render();return false;}
      state.auditQuality=clamp(state.auditQuality+.075,0,1);a.claimTrust=clamp(a.claimTrust+.18,0,1);state.telemetry.audits++;
      addLog(`<div><b>View-through audit</b> — future CTV claim uncertainty narrowed; modeled outcomes and cash were not rewritten.</div>`,"measurement");}
    if(action==="isolate"&&isolatePixel(state,a))addLog(`<div><b>Conversion source separated</b> — ${displayName(a.name)} now has an independent event-source cluster. To The Moon reset learning for that initiative.</div>`,"measurement");
    render();}

  function payDown(state,limit=DAILY*1.5){let amount=Math.min(limit,state.finance.cash,state.finance.creditUsed);if(amount<=0)return 0;
    state.finance.cash-=amount;state.finance.payments+=amount;state.finance.creditUsed=Math.max(0,state.finance.creditUsed-amount);
    let left=amount;const next=[];for(const h of state.finance.creditHolds){const paid=Math.min(left,h.amount);left-=paid;const remain=h.amount-paid;if(remain>.01)next.push({...h,amount:remain});}
    state.finance.creditHolds=next;return amount;}
  function paymentCrisisClearance(state,crisis){const recorded=crisis?.meta?.holdIds||[],liveIds=new Set(state.finance.creditHolds.map(hold=>hold.id)),
      tracked=new Set(recorded.filter(id=>liveIds.has(id)));
    if(!recorded.length)return state.finance.creditUsed;if(!tracked.size)return 0;
    let needed=0;for(const hold of state.finance.creditHolds){needed+=hold.amount;tracked.delete(hold.id);if(!tracked.size)return needed;}
    return 0;}
  function globalAction(action){const state=S;if(state.ended)return false;const before=JSON.stringify(state);
    if(action==="paydown"&&state.crises.some(c=>c.type==="payment_failure")){crisisQueue();return false;}
    if(action==="audit"){
      if(!canAuditPortfolio(state))return false;
      if(!useOperation(state,DAILY*.014,"portfolio attribution audit")){render();return false;}
      state.auditQuality=clamp(state.auditQuality+.13,0,1);state.telemetry.audits++;
      addLog(`<div><b>Portfolio audit</b> — future platform claims become less noisy. Historical claims and modeled outcome value stay unchanged.</div>`,"measurement");}
    if(action==="clean"){
      const p=weakestRepairablePixel(state);if(!p)return false;
      if(!useOperation(state,DAILY*.010,"shared event-source repair")){render();return false;}
      p.purity=clamp(p.purity+.15,0,1);state.telemetry.pixelCleans++;
      addLog(`<div><b>Event mapping repaired</b> — future targeting and claim purity improved; no historical report was rewritten.</div>`,"measurement");}
    if(action==="contingency"){
      if(state.contingency>=2)return false;
      if(!useOperation(state,DAILY*.045,"portfolio contingency layer")){render();return false;}
      state.contingency++;state.backupGraceDays+=state.contingency===1?3:2;
      if(state.contingency===2)state.auditQuality=clamp(state.auditQuality+.06,0,1);
      addLog(`<div><b>Contingency layer ${state.contingency}/2 built</b> — ${state.contingency===1?"three paid billing-grace days are now available":"measurement shocks are damped, lane migration retains more learning, and two more billing-grace days were added"}. This paid capacity makes concentrated strategies resilient instead of merely checking a gate.</div>`,"liquidity");}
    if(action==="paydown"){const paid=payDown(state);if(paid){reconcileRecoveredPaymentCrises(state);
      addLog(`<div><b>Credit paid down</b> — ${money(paid)} of cash released shared buying headroom.</div>`,"budget");}}
    markRunDirtyIfChanged(before,state);render();}

  function crisisCost(type,choice){
    if(type==="ghost_attribution")return choice==="audit"?DAILY*.012:DAILY*.006;
    if(type==="pixel_contamination")return choice==="clean"?DAILY*.011:DAILY*.018;
    if(type==="false_flag")return choice==="appeal"?DAILY*.005:DAILY*.024;
    if(type==="bid_war")return choice==="relevance"?DAILY*.006:0;
    if(type==="brand_conquest")return choice==="protect"?DAILY*.020:0;
    if(type==="lead_quality_escalation")return ({account_test:.018,signal_test:.016,creative_test:.012,
      clean_migration:.030,observe:.002,cohort:.006}[choice]||0)*DAILY;
    return 0;
  }
  function crisisOptions(c){const d=CRISIS_COPY[c.type];
    if(c.type==="lead_quality_escalation")return Object.entries(qualityDefinition().choices||{}).map(([id,item])=>({id,label:item.label,detail:item.detail}));
    return d?.a&&d?.b?[d.a,d.b].map(item=>({id:item[0],label:item[1],detail:item[2]})):[];}
  function crisisChoiceAvailable(state,c,choice){const a=c.targetId?accountById(state,c.targetId):null;
    if(state.ops<=0||crisisCost(c.type,choice)>state.finance.cash+availableCredit(state))return false;
    if(c.type==="lead_quality_escalation"&&(c.meta?.attempted||[]).includes(choice))return false;
    if(c.type==="bid_war"&&choice==="raise")return !!a&&a.bid<1.85-.001;
    if(c.type==="payment_failure"&&choice==="paydown"){const needed=paymentCrisisClearance(state,c);return needed>0&&state.finance.cash+1e-6>=needed;}
    if(c.type==="payment_failure"&&choice==="pause")return state.accounts.some(x=>!x.paused&&x.budget>0);
    if(c.type==="payout_delay"&&choice==="factor")return !!a&&state.finance.receivables.some(r=>{const tracked=c.meta?.receivableIds||[];
      if(tracked.length)return tracked.includes(r.id);const owner=accountById(state,r.accountId);return owner&&brandIdFor(owner)===brandIdFor(a);});
    return true;
  }
  function qualityCauseLabel(cause){return ({creative_fit:"creative-to-audience fit",account_learning:"ad-account learning",
    signal_contamination:"shared event-source contamination",geo_leak:"geography leakage",downstream_shift:"downstream acceptance shift"}[cause]||cause);}
  function qualityFlavorText(){const f=currentFlavor(),t=f.terms,m=f.metrics;
    return `${f.name}: the downstream ${m.conversion.toLowerCase()} quality check failed. Isolate whether the active ${t.creative.toLowerCase()}, geography, ${t.account.toLowerCase()}, ${t.pixel.toLowerCase()} or acceptance gate changed.`;}
  function resolveQualityCrisis(state,index,c,a,choice){if(!a)return false;
    const cost=crisisCost(c.type,choice);if(!useOperation(state,cost,`lead-quality diagnostic · ${choice}`))return false;
    c.cost=(c.cost||0)+cost;
    const p=pixelById(state,a.pixel),targets={account_test:["account_learning"],signal_test:["signal_contamination"],
      creative_test:["creative_fit"],clean_migration:["account_learning","signal_contamination"],observe:["geo_leak"],cohort:["downstream_shift"]};
    const hypotheses=targets[choice]||[],matched=hypotheses.includes(c.hidden),controlled=choice!=="clean_migration";
    c.meta.attempted=c.meta.attempted||[];c.meta.eliminated=c.meta.eliminated||[];c.meta.attempted.push(choice);
    if(!matched)c.meta.eliminated.push(...hypotheses.filter(h=>!c.meta.eliminated.includes(h)));
    state.telemetry.qualityTests++;
    let evidence="",confidence=choice==="observe"?"medium":choice==="clean_migration"?"low":"high";
    if(choice==="account_test"){
      if(matched)a.learning=clamp(Math.max(a.learning,.86),.42,1);
      evidence=matched?"The matched alternate account recovered downstream quality while creative, geography, audience, budget and event source stayed fixed.":
        "The matched accounts produced the same quality profile, so ad-account learning is less likely; the remaining hypotheses stay live.";}
    if(choice==="signal_test"){
      if(matched&&p)p.purity=clamp(Math.max(p.purity,.95),.18,1);
      evidence=matched?"The matched clean event source recovered quality while the active account, creative, geography and budget stayed fixed.":
        "The matched event sources produced no quality difference, reducing the likelihood that shared signal contamination caused the shift.";}
    if(choice==="creative_test"){
      const candidate=rollCreative(state,a,matched),format=(formatCatalog()[candidate.format]||FALLBACK_FORMATS.static);
      if(matched){a.creative=candidate;a.creativeVersion=(a.creativeVersion||0)+1;a.creativeFitM=1;a.fatigue=5;state.telemetry.creativeRefreshes++;}
      evidence=matched?`The matched ${format.label} replacement recovered lead quality with account, event source, geography, audience and budget held constant.`:
        `The matched ${format.label} replacement changed response behavior but not downstream quality, so the active creative was not the root cause.`;}
    if(choice==="clean_migration"){
      const oldPixel=p;if(oldPixel&&pixelBrandCount(state,oldPixel)>1)isolatePixel(state,a,false,false);
      const cleanPixel=pixelById(state,a.pixel);if(cleanPixel)cleanPixel.purity=clamp(Math.max(cleanPixel.purity,.95),.18,1);
      a.learning=matched?.66:.50;a.blockedDays=Math.max(a.blockedDays,1);state.telemetry.qualityCleanStack++;
      evidence=matched?"Quality recovered after both the ad account and event source changed. The operation is stabilized, but this two-variable migration cannot identify which layer caused the decline.":
        "Quality did not recover after the account and event source changed together, making both stack layers less likely while imposing a learning reset.";}
    if(choice==="observe"){
      a.geoQualityM=1;
      evidence=matched?"Removing excluded regions restored downstream quality without changing account, creative, event source or acceptance rules.":
        "The corrected geography did not restore quality — and the decline predates the geographic mistake — so geography leakage is less likely.";}
    if(choice==="cohort"){
      state.auditQuality=clamp(state.auditQuality+.07,0,1);a.claimTrust=clamp(a.claimTrust+.08,0,1);
      evidence=matched?"The matured cohort shows the acceptance rule or buyer mix shifted downstream; front-end account, creative and event-source delivery are not the media-side root.":
        "The matured cohort shows stable downstream acceptance, ruling out an acceptance-rule shift while the media-side hypotheses remain open.";}
    c.lastEvidence=evidence;c.confidence=confidence;
    if(!matched){
      addLog(`<div><b>Lead-quality hypothesis reduced</b> — ${evidence} <b>${confidence.toUpperCase()} diagnostic confidence.</b> The ticket stays open so another variable can be isolated.</div>`,"crisis");
      markRunDirty();close();render();return true;
    }
    c.status="resolved";c.response=choice;c.resolvedDay=state.day;c.truth=controlled?c.hidden:null;
    c.evidence=evidence;c.causalConfidence=confidence;state.crisisHistory.push(c);state.crises.splice(index,1);
    state.telemetry.crisesResolved++;state.telemetry.qualityDiagnoses++;
    const causeText=controlled?`Cause supported: ${qualityCauseLabel(c.hidden)}.`:"Operational recovery achieved; exact cause remains unresolved because two layers changed together.";
    addLog(`<div><b class="pos">Lead-quality escalation resolved</b> — ${evidence} <b>${confidence.toUpperCase()} diagnostic confidence.</b> ${causeText}</div>`,"crisis");
    markRunDirty();close();render();return true;
  }
  function resolveCrisis(id,choice){const state=S;if(state.ended)return false;
    const index=state.crises.findIndex(c=>c.id===id);if(index<0)return false;
    const c=state.crises[index],a=c.targetId?accountById(state,c.targetId):null,p=a?pixelById(state,a.pixel):null;
    const definition=CRISIS_COPY[c.type];
    if(!definition||!crisisOptions(c).some(option=>option.id===choice))return false;
    const laneStale=a&&["ghost_attribution","false_flag","bid_war"].includes(c.type)&&c.meta?.targetLane&&a.platform!==c.meta.targetLane;
    const pixelStale=a&&c.type==="pixel_contamination"&&c.meta?.targetPixel&&a.pixel!==c.meta.targetPixel;
    const qualityStale=a&&qualityScopeStale(c,a);
    if(laneStale||pixelStale||qualityStale){supersedeCrises(state,item=>item.id===c.id,"the original affected scope is no longer active");markRunDirty();close();render();return true;}
    if(!crisisChoiceAvailable(state,c,choice))return false;
    if(c.type==="lead_quality_escalation")return resolveQualityCrisis(state,index,c,a,choice);
    const selectedOption=crisisOptions(c).find(option=>option.id===choice),cost=crisisCost(c.type,choice),label=selectedOption?selectedOption.label:choice;
    if(!useOperation(state,cost,`crisis response · ${c.type}`))return false;
    if(c.type==="ghost_attribution"&&a){
      if(choice==="audit"){state.auditQuality=clamp(state.auditQuality+.14,0,1);c.revealed=c.hidden;
        if(c.hidden==="fraud")a.quality=clamp(a.quality+.12,.3,1.2);}
      else {a.blockedDays=Math.max(a.blockedDays,1);if(c.hidden==="fraud")a.quality=clamp(a.quality+.18,.3,1.2);else a.learning=Math.max(.4,a.learning-.24);}}
    if(c.type==="pixel_contamination"&&a){if(choice==="isolate")isolatePixel(state,a,false,false);else if(p)p.purity=clamp(p.purity+.19,0,1);}
    if(c.type==="payout_delay"&&a&&choice==="factor"){
      const brandId=brandIdFor(a),tracked=c.meta?.receivableIds||[],belongs=r=>{if(tracked.length)return tracked.includes(r.id);
        const owner=accountById(state,r.accountId);return owner&&brandIdFor(owner)===brandId;};
      const recs=state.finance.receivables.filter(belongs),gross=recs.reduce((n,r)=>n+r.amount,0),net=gross*.94;
      state.finance.receivables=state.finance.receivables.filter(r=>!belongs(r));state.finance.cash+=net;state.finance.collections+=net;
      state.opsCost+=gross-net;state.dailyOpsCost+=gross-net;}
    if(c.type==="false_flag"&&a){if(choice==="appeal")a.blockedDays=Math.min(a.blockedDays,1);else{a.blockedDays=0;a.learning=.44;isolatePixel(state,a,false);}}
    if(c.type==="bid_war"&&a){if(choice==="relevance"){a.qualityScore=clamp(a.qualityScore+1.1,1,10);a.negatives+=2;a.competition=Math.max(1,a.competition-.28);}else a.bid=clamp(a.bid+.32,.45,1.85);}
    if(c.type==="payment_failure"){if(choice==="paydown"){const needed=paymentCrisisClearance(state,c),paid=payDown(state,needed);
      const live=new Set(state.finance.creditHolds.map(hold=>hold.id));if(!needed||paid+1e-6<needed||(c.meta?.holdIds||[]).some(id=>live.has(id)))return false;
      }else{const largest=state.accounts.filter(x=>!x.paused&&x.budget>0).sort((x,y)=>y.budget-x.budget)[0];if(largest){largest.paused=true;largest.learning=.48;}}}
    if(c.type==="brand_conquest"&&a){if(choice==="protect")state.brandProtectionDaysByBrand[brandIdFor(a)]=7;}
    c.status="resolved";c.response=choice;c.resolvedDay=state.day;c.cost=cost;c.truth=c.hidden||null;
    state.crisisHistory.push(c);const liveIndex=state.crises.findIndex(item=>item.id===c.id);if(liveIndex>=0)state.crises.splice(liveIndex,1);
    state.telemetry.crisesResolved++;
    addLog(`<div><b>Crisis resolved</b> — ${CRISIS_COPY[c.type].title}: ${label}${c.truth?` · cause: ${c.truth}`:""}. The response changes future delivery; historical claims remain historical.</div>`,"crisis");
    markRunDirty();close();render();return true;}
  function crisisQueue(){const state=S;
    if(!state.crises.length){show(`<div class="eyebrow">Crisis queue</div><h2>No open tickets</h2><div class="prose"><p>No urgent problem needs your attention. A new crisis may appear after you run a day; today's event card shows the broader market condition.</p></div>
      <div class="row"><button class="btn wide" id="closeB">Back to portfolio</button></div>`,"day");document.getElementById("closeB").onclick=close;return;}
    show(`<div class="eyebrow">Crisis queue · ${state.crises.length} open · ${state.ops} operations action${state.ops===1?"":"s"}</div><h2>Diagnose the affected layer before choosing a fix</h2>
      <div class="prose"><p>An ad, campaign, platform account, shared event-source cluster and holding-company payment failure are different objects. Each ticket names its scope and shows explicit response tradeoffs.</p></div>
      <div class="bin">${state.crises.map(c=>{const d=CRISIS_COPY[c.type],a=c.targetId?accountById(state,c.targetId):null;
        const options=crisisOptions(c),choiceButton=item=>{const cost=crisisCost(c.type,item.id),attempted=(c.meta?.attempted||[]).includes(item.id);
          const paymentCash=c.type==="payment_failure"&&item.id==="paydown"?paymentCrisisClearance(state,c):null,
            resource=paymentCash!==null?`${money(paymentCash)} cash`:c.type==="payout_delay"&&item.id==="factor"?"6% receivable haircut":(cost?money(cost):"$0 response cost");
          return `<button class="btn crisis-choice" data-crisis="${c.id}" data-choice="${item.id}" ${crisisChoiceAvailable(state,c,item.id)?"":"disabled"}><span>${attempted?"Tested · ":""}${item.label} · ${resource} + 1 operations action</span><small>${item.detail}</small></button>`;};
        if(c.type==="lead_quality_escalation"){const q=qualityDefinition(),attempts=c.meta?.attempted||[],eliminated=c.meta?.eliminated||[];
          return `<div class="binrow" style="display:block"><span class="nm"><b>${d.title}</b> · ${d.scope}${a?` · ${displayName(a.name)} · ${platformLabel(a)}`:""}<br><small>${q.summary||d.body}</small></span>
            <div class="matrix" style="margin-top:8px">${(q.dialogue||[]).map(line=>`<div><b>${line.role}</b>${line.text}</div>`).join("")}</div>
            ${c.lastEvidence?`<div class="note"><b>Latest evidence · ${String(c.confidence||"").toUpperCase()} confidence:</b> ${c.lastEvidence}</div>`:""}
            ${eliminated.length?`<div class="note"><b>Reduced hypotheses:</b> ${eliminated.map(qualityCauseLabel).join(" · ")}. ${attempts.length} controlled response${attempts.length===1?"":"s"} completed; the root cause remains hidden until supported.</div>`:""}
            <div class="row" style="margin-top:8px">${options.map(choiceButton).join("")}</div></div>`;}
        return `<div class="binrow" style="align-items:flex-start"><span class="nm"><b>${d.title}</b> · ${d.scope}${a?` · ${displayName(a.name)} · ${platformLabel(a)}`:""}<br><small>${d.body}</small></span>
        ${options.map(choiceButton).join("")}</div>`;}).join("")}</div>
      <div class="row"><button class="btn wide" id="closeB">Back to portfolio</button></div>`,"crisis");
    document.getElementById("closeB").onclick=close;ov.querySelectorAll("button[data-crisis]").forEach(b=>b.onclick=()=>resolveCrisis(b.dataset.crisis,b.dataset.choice));}

  function creativeProductionSnapshot(state){return (state.accounts||[]).map(a=>
    `${a.id}:${a.creativeVersion||0}:${a.creativeQueue?(a.creativeQueue.stage||"legacy"):"none"}`).join("|");}
  function advance(){const state=S;if(state.crises.length){crisisQueue();return false;}
    const startGate=state.months.length,startCrises=new Set(state.crises.map(c=>c.id));let ran=0,
      productionSnapshot=creativeProductionSnapshot(state);
    while(ran<7&&!state.ended){runDay();ran++;state.telemetry.batchDays++;
      const nextProductionSnapshot=creativeProductionSnapshot(state),creativeReaction=nextProductionSnapshot!==productionSnapshot;
      productionSnapshot=nextProductionSnapshot;
      if(state.months.length>startGate||state.crises.some(c=>!startCrises.has(c.id))||creativeReaction)break;}
    if(!state.ended)render();return ran;}
  function debrief(){const state=S,won=state.outcome==="portfolio-exit",profit=projectedProfit(state),mer=state.spendTotal?state.modeledRevenue/state.spendTotal:0;
    const trainingAward=typeof TrainingProgress!=="undefined"?TrainingProgress.completeRun({success:won,outcome:state.outcome||"term-ended",state,
      facts:{mer:Number(mer.toFixed(3)),profit:Math.round(profit),gateStreak:state.gateStreak,daysCompleted:Math.max(0,state.day-1)}}):null;
    const monthRows=state.months.map(m=>`<div class="verdict ${m.pass?"hit":"miss"}"><div class="h">Gate ${m.month} · day ${m.throughDay} · ${m.pass?"pass":"reset"}</div>
      MER ${m.mer.toFixed(2)}× · projected contribution ${money(m.profit)} · claim gap ${(m.gap*100).toFixed(0)}% · platform concentration ${(m.maxPlatform*100).toFixed(0)}% · advertiser concentration ${(m.maxAdvertiser*100).toFixed(0)}%</div>`).join("");
    show(`<div class="eyebrow">Portfolio Command debrief · ${displayName(state.holding.name)}</div><h2>${won?"Resilient portfolio exit":"Portfolio mandate failed"}</h2>
      <div class="prose"><p><strong>Practice environment:</strong> No live advertiser data or platform write access was used. Platform names identify the buying tools represented in To The Moon.</p>
      <p>Blended modeled MER <b>${mer.toFixed(2)}×</b> · projected contribution <b class="${profit>=0?"pos":"neg"}">${money(profit)}</b> · cash ${money(state.finance.cash)} · open receivables ${money(state.finance.receivables.reduce((n,r)=>n+r.amount,0))}. Outstanding Day-${Math.min(DAYS,state.day-1)} receivables remain outstanding; the game did not turn them into cash.</p></div>
      <div class="verdict ${won?"hit":"miss"}"><div class="h">Outcome</div>${won?"Three consecutive 30-day gates passed and the dynamic contribution threshold cleared.":state.outcome==="credit-collapse"?"Three consecutive failed-payment days collapsed the shared credit line.":"The selected mandate ended without three consecutive passing gates and the required projected contribution."}</div>
      ${monthRows||'<div class="verdict miss"><div class="h">No acquisition gate closed</div>The shared credit line failed before day 30.</div>'}
      ${typeof TrainingProgress!=="undefined"?TrainingProgress.awardMarkup(trainingAward):""}
      <div class="row" style="margin-top:12px"><button class="btn wide" id="again">Replay Scenario ${SEED}</button><button class="btn wide" id="newseed">New scenario</button><button class="btn wide" id="trainingProgress">Training progress</button><button class="btn wide" id="mainmenu">Main menu</button></div>`,"performance");
    pendingDayFx=[];fireFx(won?"success":"fail",won?{kicker:"Portfolio acquired",value:"EXIT CLEARED",sub:`MER ${mer.toFixed(2)}× · contribution ${money(profit)}`}:
      {kicker:"Portfolio mandate missed",value:state.outcome==="credit-collapse"?"CREDIT COLLAPSE":"EXIT DENIED",sub:`gate streak ${state.gateStreak}/3 · contribution ${money(profit)}`});
    document.getElementById("again").onclick=()=>{clearFx();startFreshRunExperience({mode:5,seed:SEED});};
    document.getElementById("newseed").onclick=()=>{let seed=1+Math.floor(roll("new-seed",state.day)*9000);if(seed===SEED)seed=seed===9000?1:seed+1;
      startFreshRunExperience({mode:5,seed});};
    document.getElementById("trainingProgress").onclick=()=>TrainingProgress.open({returnTo:"debrief"});
    document.getElementById("mainmenu").onclick=()=>{clearFx();mainMenu();};}
  function hydrate(state=S){migrateLegacyCreativeTargets(state);reconcileRecoveredCrises(state);return state;}
  function validate(state=S){const issues=[];
    if(state.engine!=="nightmare")issues.push("wrong engine");if(allocated(state)>DAILY+.01)issues.push("allocation exceeds cap");
    if(state.accounts.some(a=>!a.fictional||!a.name.startsWith("Fictional ·")||!a.business.startsWith("Fictional ·")))issues.push("non-fictional entity");
    if(new Set(state.accounts.map(a=>a.id)).size!==state.accounts.length)issues.push("duplicate initiative id");
    if(new Set(state.accounts.map(a=>`${brandIdFor(a)}|${a.platform}`)).size!==state.accounts.length)issues.push("duplicate advertiser lane");
    if(state.accounts.some(a=>!pixelById(state,a.pixel)?.members.includes(a.id)))issues.push("initiative missing from event source");
    if(state.accounts.some(a=>!creativeFormat(a)?.id))issues.push("unknown creative format");
    if(state.accounts.some(a=>a.creativeQueue&&(!formatCatalog()[a.creativeQueue.format]||!Number.isFinite(a.creativeQueue.readyDay))))issues.push("invalid creative production queue");
    if(state.accounts.some(a=>LANES[a.platform].kind!=="search"&&!TIERS.some(tier=>tier.name===a.creative.tier)))issues.push("invalid creative rarity");
    if(state.accounts.some(a=>LANES[a.platform].kind==="search"&&a.creative.format!=="search"))issues.push("search creative taxonomy mismatch");
    if(state.finance.creditUsed<-.01||state.finance.creditUsed>state.finance.creditLimit+.01)issues.push("credit out of range");
    const held=state.finance.creditHolds.reduce((n,h)=>n+h.amount,0);
    if(Math.abs(held-state.finance.creditUsed)>.02)issues.push("credit ledger mismatch");
    const outcomeValue=state.outcomes.reduce((n,o)=>n+o.modeledValue,0);
    if(Math.abs(outcomeValue-state.modeledRevenue)>.02)issues.push("modeled outcome mismatch");
    const claimValue=state.claims.reduce((n,c)=>n+c.value,0);
    if(Math.abs(claimValue-state.reportedRevenue)>.02)issues.push("platform claim mismatch");
    if(new Set(state.outcomes.map(o=>o.id)).size!==state.outcomes.length)issues.push("duplicate outcome id");
    if(new Set(state.finance.receivables.map(r=>r.id)).size!==state.finance.receivables.length)issues.push("duplicate receivable id");
    return issues;}
  return {fresh,runDay,render,handleAction,crisisQueue,resolveCrisis,globalAction,setLane,addParallelInitiative,
    commissionCreative,advance,debrief,hydrate,validate,eventDeckSummary,portfolioAttributionGap,
    lanes:LANES,laneOrder:LANE_ORDER,accounts:FICTIONAL_ACCOUNTS,events:EVENTS,formats:formatCatalog(),formatDeck:FORMAT_DECK,openingProfile:nightmareOpeningProfile};
})();
function freshNightmare(){RUN_DIRTY=false;S=NightmareEngine.fresh();return S;}
function runDayNightmare(){return NightmareEngine.runDay();}
function renderNightmare(){return NightmareEngine.render();}
function nightmareAccountAction(button){const before=JSON.stringify(S),result=NightmareEngine.handleAction(button);markRunDirtyIfChanged(before);return result;}
function nightmareCrisisQueue(){return NightmareEngine.crisisQueue();}
