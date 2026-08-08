"use strict";
const SETTLE_SPLIT=[[2,0.6],[3,0.4]];   // Mode 2+: 60% lands on D+2, 40% on D+3
const MAX_MULT=(MODE>=3)?2:5;           // introductory modes expose five common axes; pipelines are tighter
let rnd, eventRnd, creativeRnd;
function resetRng(){
  rnd=mulberry32(SEED*7919);
  eventRnd=mulberry32(SEED*104729+37);
  creativeRnd=mulberry32(SEED*130363+71);
}
resetRng();
function stateRoll(stream){
  if(S&&S.rng){
    const cursor=Number(S.rng[stream])||0;S.rng[stream]=cursor+1;
    /* Replaying the original stream to its saved cursor preserves every established seed
       while making the cursor serializable. The streams are short, so this is inexpensive. */
    const generator=stream==="event"?mulberry32(SEED*104729+37):mulberry32(SEED*130363+71);
    let value=0;for(let i=0;i<=cursor;i++)value=generator();return value;
  }
  return (stream==="event"?eventRnd:creativeRnd)();
}
function creativeFormatFor(c){return creativeFormatById(c&&c.format);}
/* The compact single-account modes damp the full format modifiers so taxonomy matters
   without overpowering the established unit economics. Mode 5 uses the full portfolio physics. */
function formatModifier(format,key,weight=.35){const value=Number(format&&format[key]);
  return 1+((Number.isFinite(value)?value:1)-1)*weight;}
function formatLaneModifier(format,lane,weight=.35){const value=Number(format&&format.fit&&format.fit[lane]);
  return 1+((Number.isFinite(value)?value:1)-1)*weight;}
function formatStyleModifier(format,style="lead_gen",weight=.35){const value=Number(format&&format.styleFit&&format.styleFit[style]);
  return 1+((Number.isFinite(value)?value:1)-1)*weight;}
function creativeFormatBadge(c){const f=creativeFormatFor(c);
  const title=typeof tooltipsEnabled==="function"&&tooltipsEnabled()?` title="${f.description}"`:"";
  return `<span class="tag format-badge format-${f.id}"${title}><span class="format-mark" aria-hidden="true">${f.mark}</span>${f.label}</span>`;}
function creativeBlueprintBadges(c,measurementHealthy=true){const concept=creativeConceptFor(c),method=creativeProductionMethodFor(c);
  return `<span class="creative-blueprint-badges"><span class="tag" title="Why the ad may persuade">${concept.mark} Concept · ${concept.label}</span>`+
    `<span class="tag" title="How this asset was made">${method.mark} Production · ${method.label}</span>`+
    `<span class="tag evidence-tag" title="Evidence belongs to this account and measurement setup">Evidence · ${creativeEvidenceLabel(c,measurementHealthy)}</span></span>`;}

/* ---------------- content: the account's live families ---------------- */
/* cpm $, ctr %, cvr %, epl $, lpctr % — rounded synthetic training inputs */
const LIBRARY = [
 {id:"utility_a",  fam:"Bill Screenshot", name:"Monthly Bill Screenshot — color × state",format:"static",rarity:"Common",rarityClass:"common",
  cpm:6.5, ctr:0.9, cvr:6.5, epl:19, lpctr:30, axes:"color × state",
  intent:"Workhorse. Kept alive because it is the cheapest thing in the account to refresh."},
 {id:"rendered_b",   fam:"Neighborhood Scene", name:"Auto Neighborhood Scene — demographic matrix, smooth 3D",format:"animation",rarity:"Epic",rarityClass:"epic",
  cpm:7.5, ctr:0.9, cvr:9, epl:33, lpctr:30, axes:"demographic × treatment",
  intent:"A scalable rendered family. It can be recast across audiences without a new physical shoot."},
 {id:"lifestyle_c", fam:"Retirees On The Coast", name:"Retirees On The Coast Blue — state storm",format:"static",rarity:"Epic",rarityClass:"epic",
  cpm:8, ctr:0.7, cvr:7.5, epl:43, lpctr:40, axes:"peril × state × size",
  intent:"A secondary product-line treatment. Higher-cost leads can still be valuable when downstream acceptance supports them."},
 {id:"motion_d",fam:"Priced Animation", name:"Priced Animation — fade dark",format:"animation",rarity:"Epic",rarityClass:"epic",
  cpm:6, ctr:1.1, cvr:9.5, epl:18, lpctr:35, axes:"price × treatment",
  intent:"The approved price is the primary hook. Use only approved pricing and offer windows."},
 {id:"lifestyle_e", fam:"Life Event", name:"Home Life Event — life event",format:"story",rarity:"Epic",rarityClass:"epic",
  cpm:7, ctr:0.8, cvr:7, epl:42, lpctr:25, axes:"language × demographic",
  intent:"A strong low-spend return in this practice account. The ad has room to spend more, but ask why before scaling."},
 {id:"native_f",fam:"Plain Price Unit", name:"plain price unit — display",format:"native_long_copy",rarity:"Common",rarityClass:"common",
  cpm:5.5, ctr:1.3, cvr:11.5, epl:16, lpctr:65, axes:"copy × vertical × audience",
  intent:"Intentionally plain. It is designed for lead volume, but low value per lead can erase its low cost per lead."},
 {id:"utility_g",  fam:"Zip Entry", name:"Zip entry — 300×250",format:"static",rarity:"Common",rarityClass:"common",
  cpm:5, ctr:1, cvr:7.5, epl:18, lpctr:50, axes:"button × text",
  intent:"A compact utility unit with promising early simulated economics. The evidence base is small, so collect more observations before scaling."},
 {id:"native_h",fam:"Deliberately Plain", name:"Deliberately plain — check rates",format:"native_long_copy",rarity:"Common",rarityClass:"common",
  cpm:5, ctr:0.9, cvr:5.5, epl:19, lpctr:45, axes:"color × call to action × 7 sizes",
  intent:"Large size matrix built from one idea. Format coverage is useful only when version lineage stays traceable."},
 /* the trap: gorgeous engagement, deliberately thin economics */
 {id:"trap_i", fam:"Bill Screenshot", name:"Mobile broad — screenshot ad",format:"static",rarity:"Common",rarityClass:"common",
  cpm:4.5, ctr:1.6, cvr:7, epl:14, lpctr:70, axes:"none — one size",
  intent:"Do not let the strong click-through rate distract you. Check value per lead before scaling."},
 /* the brand play: negative in-window by design */
 {id:"brand_j",fam:"Reach Network test", name:"Reach network — brand/awareness test",format:"branded",rarity:"Common",rarityClass:"common",
  cpm:14, ctr:5.9, cvr:2, epl:11, lpctr:0, axes:"n/a — test", brandPlay:true,
  intent:"This ad buys reach, not immediate profit. Its lower cost per thousand impressions can help the whole account, so a short-term loss may be intentional."}
];

/* margin dial: keeps a hands-off run under the 40% target so that managing the
   account — not just owning it — is what earns the result */
const EPL_SCALE = 0.80;
LIBRARY.forEach(c=>{c.epl=+(c.epl*EPL_SCALE).toFixed(2);});

/* found assets — some carry compliance landmines */
const FOUND = [
 {name:"Storm-damaged roof, stock photo",format:"static", cpm:7, ctr:0.9, cvr:7, epl:38, lpctr:30, flag:null},
 {name:"Family at a dealership — a competitor's banner is in frame",format:"static", cpm:6.5, ctr:1.2, cvr:8, epl:24, lpctr:40, flag:"Third-party brand visible in frame"},
 {name:"Renewal notice on a kitchen table",format:"static", cpm:6, ctr:1.1, cvr:9, epl:21, lpctr:50, flag:null},
 {name:"Celebrity reaction still, cropped",format:"static", cpm:5, ctr:2.1, cvr:6, epl:19, lpctr:65, flag:"Recognizable person, no release"},
 {name:"New baby coming home from hospital",format:"story", cpm:7, ctr:0.8, cvr:7.5, epl:40, lpctr:30, flag:null},
 {name:"Guaranteed-savings headline mock",format:"static", cpm:5, ctr:1.6, cvr:9.5, epl:18, lpctr:60, flag:"Unqualified promise claim"},
 {name:"Moving truck in a driveway",format:"story", cpm:6, ctr:1, cvr:8, epl:26, lpctr:45, flag:null},
 {name:"Screenshot showing an unapproved rate",format:"static", cpm:5.5, ctr:1.4, cvr:8.5, epl:20, lpctr:60, flag:"Price unit and offer window are not approved"}
];

const RECALL = [
 {id:"recall-cpl",discipline:"measurement",q:"CPL stands for?", a:["cost per lead"], why:"Cost per lead (CPL) tells you what media spend bought each lead. Read it with lead quality and value, not alone."},
 {id:"recall-epl",discipline:"finance",q:"EPL stands for?", a:["earnings per lead"], why:"Earnings per lead (EPL) estimates the value of each lead. If EPL falls below CPL, media economics are negative before operating costs."},
 {id:"recall-scoreboard",discipline:"finance",q:"Which is the scoreboard — CTR or profit?", a:["profit"], why:"Profit is the business result. Click-through rate (CTR) shows response, but a highly clicked ad can still lose money."},
 {id:"recall-lpctr",discipline:"measurement",q:"LP CTR measures the pull of the ad or the landing page?", a:["lander","the lander","lp","landing page"], why:"Landing-page click-through rate (LP CTR) counts the declared on-page action among landing-page visitors. It does not measure the original ad click."},
 {id:"recall-cheapest-change",discipline:"creative",q:"Which concept change usually costs the least?", a:["color"], why:"A color change can reuse approved art while giving a tired unit a visible variation."},
 {id:"recall-window-objective",discipline:"account",q:"A campaign losing money during the current window is always failing. True or false?", a:["false","f"], why:"Some ads deliberately buy reach or learning. Judge the result against the ad's stated job and the full account."}
];

  /* ---------------- Mode 4: deliberately stylized platform archetypes -----------------------
     These are fictitious training physics, not benchmarks or predictions. Each lane exaggerates
     a different decision problem: cheap reach, high-click/low-intent traffic, attribution loss,
     fast fatigue, concentration risk, and audience overlap. */
const PLATFORMS={
  google:  {name:"Google Display / Demand Gen", cpm:6.65, ctrM:1.00, cvrM:1.00, settle:3,
           infl:0.006, pool:9.0,
           note:"The slow, forgiving baseline: cheapest impressions and the lowest CTR. Profitability still depends on creative fit, fatigue, timing, allocation and the day's auction."},
  snap:    {name:"Snapchat", cpm:12.70, ctrM:3.90, cvrM:0.34, settle:1,
           infl:0.008, pool:3.2,
           note:"High CTR, weak click-to-lead CVR. Later offers compound that weakness. It settles fast so you can read tests early, "+
                "but marginal efficiency falls when allocation outruns the lane's fresh capacity."},
  meta:    {name:"Meta", cpm:14.19, ctrM:1.60, cvrM:0.72, settle:2,
           infl:0.015, pool:5.0, hashed:true,
           note:"Costs climbing fastest of the four. Creative reports as a hash, so a quarter of "+
                "what it earns cannot be attributed to a slot."},
  tiktok:  {name:"TikTok", cpm:8.20, ctrM:2.40, cvrM:0.55, settle:2,
           infl:0.010, pool:2.6, fatigueM:1.55,
           note:"High-velocity lane: cheap clicks, volatile lead quality, and the fastest creative burnout."}};
const PLAT_ORDER=["google","snap","meta","tiktok"];

/* Separate random streams keep events and creative drops reproducible even when the player
   takes a different sequence of actions. The seed still means something, without making the
   account feel clockwork. */
const CREATIVE_TIERS=[
  {name:"Common",cls:"common",weight:0.62,cpmM:1,ctrM:1,cvrM:1,satBonus:0,fatigueM:1},
  {name:"Epic",cls:"epic",weight:0.30,cpmM:0.94,ctrM:1.40,cvrM:1.15,satBonus:3000,fatigueM:0.90},
  {name:"Legendary",cls:"legendary",weight:0.08,cpmM:0.78,ctrM:2.10,cvrM:1.25,satBonus:7000,fatigueM:1.45}
];
const MODERN_FORMAT_NAMES=Object.freeze({
  story:["First-Person Story Hook","Swipe-Sequence Test","Three-Beat Problem Story"],
  vsl:["Mechanism-to-Offer VSL","Proof-Stack Sales Letter","Problem / Mechanism Explainer"],
  podcast:["Host-and-Guest Proof Clip","Interview Objection Cut","Conversational Case Story"],
  slideshow:["Five-Frame Benefit Sequence","Proof-Card Slideshow","Problem-to-Outcome Slides"],
  veo:["Generated Scenario Test","AI Product Moment","AI Scene Variation"],
  ugc_interview:["Prompted Customer Interview","First-Person Objection Interview","Life-Event Interview Cut"],
  qvc_demo:["Hosted Offer Demonstration","Sixty-Second Product Walkthrough","Direct-Response Demo"],
  breaking_news:["Urgent Bulletin Package","Field-Report Offer Bridge","Breaking-News Explainer"],
  ctv_spot:["Sixty-Second CTV Response Spot","Horizontal Demonstration Spot","View-Through Story Spot"],
  news_greenscreen:["Headline Reaction Explainer","Current-Event Greenscreen","Source-on-Screen Breakdown"],
  documentary:["Field-Story Documentary","Observed-Behavior Mini-Doc","Cinematic Customer Journey"],
  meme:["Relatable Reaction Meme","Expectation / Reality Meme","Pain-Point Remix"],
  voicemail:["Missed-Call Curiosity Hook","Voicemail Confession","Recorded-Message Reveal"],
  static:["Static Comparison","Offer Reveal Static","Single-Frame Proof"],
  animation:["Mechanism Animation","Problem / Solution Motion","Diagram-to-Outcome Cut"],
  branded:["Polished Brand Story","Product Demonstration Film","Brand Proof Montage"],
  native_long_copy:["Native Customer Story","Long-Copy Problem / Solution","In-Feed Proof Letter"],
  long_copy_video:["Narrated Long-Copy Cut","Chaptered Sales Story","Written Proof to Video"]
});
function rollCreative(requestedFormat,requestedConcept,requestedProductionMethod){
  const pool=LIBRARY.filter(c=>!c.brandPlay&&c.id!=="trap_i");
  const base=pool[Math.floor(stateRoll("creative")*pool.length)];
  const formatRoll=stateRoll("creative"),formats=selectableCreativeFormats();
  const format=creativeFormatById(requestedFormat||formats[Math.floor(formatRoll*formats.length)].id);
  const concepts=Object.values(CREATIVE_CONCEPTS),methods=Object.values(CREATIVE_PRODUCTION_METHODS),
    concept=creativeConceptById(requestedConcept==="surprise"?concepts[Math.floor(stateRoll("creative")*concepts.length)].id:(requestedConcept||defaultCreativeConceptId(format.id))),
    method=creativeProductionMethodById(requestedProductionMethod==="surprise"?methods[Math.floor(stateRoll("creative")*methods.length)].id:(requestedProductionMethod||defaultCreativeProductionMethodId(format.id)));
  const roll=stateRoll("creative"); let acc=0, tier=CREATIVE_TIERS[0];
  for(const candidate of CREATIVE_TIERS){acc+=candidate.weight;if(roll<=acc){tier=candidate;break;}}
  const names=MODERN_FORMAT_NAMES[format.id]||[base.fam],executionName=names[Math.floor(stateRoll("creative")*names.length)],conceptName=`${concept.label} · ${executionName}`;
  return {...base, id:base.id+"-"+Math.floor(stateRoll("creative")*1e7), rarity:tier.name,
    rarityClass:tier.cls, format:format.id, concept:concept.id,productionMethod:method.id,evidenceDays:0,
    fam:conceptName,name:tier.name+" · "+conceptName,
    cpm:+(base.cpm*tier.cpmM).toFixed(2), ctr:+(base.ctr*tier.ctrM).toFixed(3),
    cvr:+(base.cvr*tier.cvrM).toFixed(3), tierCpmM:tier.cpmM,
    satBonus:tier.satBonus, fatigueM:tier.fatigueM};
}

const MODERN_MARKETS=Object.freeze([
  {id:"open-inventory",label:"Open inventory",brief:"Supply is unusually available. Reach is cheaper, but response is a little softer.",cpmM:.86,ctrM:.94,cvrM:1,qualityM:1,volatility:.85,bias:{supply:1.8}},
  {id:"high-intent",label:"High-intent pocket",brief:"Fewer people respond, but the people who do are more likely to become valuable leads.",cpmM:1.06,ctrM:.92,cvrM:1.24,qualityM:1.13,volatility:.95,bias:{demand:1.7}},
  {id:"click-flood",label:"Low-quality click flood",brief:"Clicks are plentiful and cheap. Lead rate and downstream value are the problem.",cpmM:.92,ctrM:1.24,cvrM:.80,qualityM:.82,volatility:1.12,bias:{quality:1.8}},
  {id:"contested",label:"Contested auction",brief:"A well-funded competitor is keeping inventory expensive. Efficient scale ceilings arrive early.",cpmM:1.20,ctrM:.96,cvrM:.96,qualityM:1.03,volatility:1.08,bias:{auction:1.8}},
  {id:"choppy",label:"Choppy demand",brief:"Averages look ordinary, but day-to-day delivery is much less stable than usual.",cpmM:1,ctrM:1,cvrM:1,qualityM:1,volatility:1.65,bias:{volatility:2}},
  {id:"soft-demand",label:"Soft demand",brief:"The market is quiet. Response and conversion are weak, so waste control matters more.",cpmM:.96,ctrM:.86,cvrM:.88,qualityM:1.06,volatility:1.05,bias:{demand:1.45}}
]);
const MODERN_INHERITANCES=Object.freeze([
  {id:"balanced",label:"Balanced handoff",brief:"The inherited mix is usable, with enough unallocated budget to make a deliberate first move.",fatigue:0,shares:[.225,.225,.225,.06]},
  {id:"tired-winners",label:"Tired incumbent winners",brief:"The strongest-looking ads arrive with accumulated fatigue. The first problem is continuity, not scale.",fatigue:30,shares:[.24,.22,.20,.06]},
  {id:"measurement-debt",label:"Measurement debt",brief:"Delivery is live, but the reporting signal starts degraded. Account results and ad reports will disagree.",fatigue:8,pixelDays:3,shares:[.22,.22,.22,.06]},
  {id:"overconcentrated",label:"Overconcentrated handoff",brief:"The clickiest unit inherited too much of the daily allocation. Its business value has not earned that confidence.",fatigue:6,shares:[.12,.15,.39,.06]},
  {id:"cautious",label:"Underfunded test slate",brief:"The previous buyer left substantial capacity unallocated. You must decide where evidence is worth buying.",fatigue:3,shares:[.16,.16,.16,.05]},
  {id:"brand-heavy",label:"Brand-heavy handoff",brief:"Reach support is heavily funded. It may help auction costs, but it puts more pressure on the direct-response ads.",fatigue:7,shares:[.20,.20,.20,.14]}
]);
const MODERN_TUTORIAL_MARKET=Object.freeze({id:"guided-baseline",label:"Guided baseline",brief:"Neutral market conditions keep the opening lesson focused on account structure and evidence.",cpmM:1,ctrM:1,cvrM:1,qualityM:1,volatility:1,bias:{}});
const MODERN_STARTER_SETS=Object.freeze([
  ["utility_a","rendered_b","trap_i"],
  ["motion_d","native_f","trap_i"],
  ["lifestyle_e","utility_g","native_h"],
  ["rendered_b","motion_d","lifestyle_e"],
  ["utility_g","native_f","trap_i"],
  ["utility_a","lifestyle_c","native_h"]
]);
const MODERN_PLATFORM_STARTER_SETS=Object.freeze([
  ["utility_a","rendered_b","native_f","lifestyle_e"],
  ["motion_d","native_f","utility_g","lifestyle_e"],
  ["lifestyle_c","utility_a","native_h","motion_d"],
  ["rendered_b","trap_i","lifestyle_e","utility_g"]
]);
function modernScenarioProfile(seed=SEED,mode=MODE){
  /* The guided Fundamentals run must remain teachable. Every other seed receives a
     compound market + inherited-account identity, producing 36 strategic openings. */
  const tutorialPreset=Number(mode)===1&&Number(seed)===2601;
  const market=tutorialPreset?MODERN_TUTORIAL_MARKET:MODERN_MARKETS[Math.floor(keyedRandom(seed,"modern-market",mode)*MODERN_MARKETS.length)];
  const inheritance=tutorialPreset?MODERN_INHERITANCES[0]:MODERN_INHERITANCES[Math.floor(keyedRandom(seed,"modern-inheritance",mode)*MODERN_INHERITANCES.length)];
  const setIndex=tutorialPreset?0:Math.floor(keyedRandom(seed,"modern-starter-set",mode)*(mode>=4?MODERN_PLATFORM_STARTER_SETS.length:MODERN_STARTER_SETS.length));
  return {...market,market,inheritance,setIndex,tutorialPreset,
    starterIds:(mode>=4?MODERN_PLATFORM_STARTER_SETS:MODERN_STARTER_SETS)[setIndex].slice()};
}
function modernScenarioMarkup(profile=modernScenarioProfile()){
  return `<div class="scenario-conditions"><div><span>Market condition</span><b>${profile.market.label}</b><small>${profile.market.brief}</small></div>`+
    `<div><span>Inherited account</span><b>${profile.inheritance.label}</b><small>${profile.inheritance.brief}</small></div></div>`;
}

const DAY_EVENTS=[
  {id:"quiet",weight:22,tags:["ordinary"],tone:"",title:"No major shock",body:"The account is yours to steer today."},
  {id:"viral",weight:12,tags:["demand","volatility"],tone:"good",scope:"slot",title:"Viral momentum",
   body:"One ad caught a pocket of lower-cost attention: cost per thousand impressions (CPM) fell 35%, and click-to-lead conversion rate (CVR) rose 35% today.",cpmM:0.65,cvrM:1.35},
  {id:"surge",weight:8,tags:["auction","volatility"],tone:"bad",title:"Auction surge",
   body:"A major advertiser entered the auction. Cost per thousand impressions (CPM) is 55% higher across the account today.",cpmM:1.55},
  {id:"influencer",weight:8,tags:["demand"],tone:"good",title:"Influencer tagged the brand",
   body:"Organic demand is spilling into paid traffic. Click-to-lead conversion rate (CVR) is 2.2× its baseline for one day.",cvrM:2.20},
  {id:"copied",weight:8,tags:["quality","volatility"],tone:"bad",scope:"slot",title:"Competitor copied the hook",
   body:"Your hottest ad is suddenly everywhere. Its fatigue jumps to 90% until you refresh the creative.",fatigue:90},
  {id:"ios",weight:6,tags:["measurement"],tone:"bad",title:"Attribution signal loss",
   body:"A platform update degraded the pixel for three days. Account revenue still lands, but ad reporting misses 55% until the pixel is repaired.",pixelDays:3},
  {id:"glut",weight:9,tags:["supply"],tone:"good",title:"Inventory glut",
   body:"More placements opened than buyers expected. Cost per thousand impressions (CPM) is 22% lower across the account today.",cpmM:0.78},
  {id:"bidwar",weight:6,tags:["auction"],tone:"bad",title:"Three-day bidding war",duration:3,
   body:"A competitor raised bids across the category. Auction cost stays 28% higher for three days unless the market changes again.",cpmM:1.28},
  {id:"creator-echo",weight:6,tags:["demand"],tone:"good",title:"Creator mention keeps circulating",duration:2,
   body:"A creator mention is still sending high-intent visitors. Response and conversion remain elevated for two days.",ctrM:1.18,cvrM:1.28},
  {id:"quality-warning",weight:7,tags:["quality"],tone:"bad",title:"Downstream lead-quality warning",duration:3,
   body:"The buyer reports weaker acceptance. Lead volume may hold, but modeled value per lead is 28% lower for three days.",eplM:.72},
  {id:"lander-outage",weight:5,tags:["volatility"],tone:"bad",title:"Landing-page reliability incident",duration:2,
   body:"Intermittent page failures are suppressing click-to-lead conversion for two days.",cvrM:.62},
  {id:"comment-lift",weight:5,tags:["demand","quality"],tone:"good",scope:"slot",title:"Helpful comment thread",duration:2,
   body:"Customer answers beneath one ad improve trust. That slot converts better and produces higher-value leads for two days.",cvrM:1.22,eplM:1.16}
];
function weightedEvent(roll,profile=modernScenarioProfile()){
  const adjusted=DAY_EVENTS.map(event=>({event,weight:event.weight*(event.tags||[]).reduce((m,tag)=>m*(profile.market.bias?.[tag]||1),1)}));
  const total=adjusted.reduce((a,row)=>a+row.weight,0); let cursor=roll*total;
  for(const row of adjusted){cursor-=row.weight;if(cursor<=0)return row.event;}
  return DAY_EVENTS[0];
}
function moodFrom(roll){
  if(roll<0.12) return {label:"Generous",detail:"cost per thousand impressions (CPM) −28%",tone:"good",cpmM:0.72};
  if(roll<0.32) return {label:"Favorable",detail:"cost per thousand impressions (CPM) −12%",tone:"good",cpmM:0.88};
  if(roll<0.76) return {label:"Stable",detail:"cost per thousand impressions (CPM) at baseline",tone:"",cpmM:1};
  if(roll<0.93) return {label:"Crowded",detail:"cost per thousand impressions (CPM) +22%",tone:"bad",cpmM:1.22};
  return {label:"Hostile",detail:"cost per thousand impressions (CPM) +45%",tone:"bad",cpmM:1.45};
}
function drawDayState(day){
  const profile=modernScenarioProfile();
  if(!Array.isArray(S.pressures))S.pressures=[];
  S.pressures=S.pressures.filter(item=>item&&item.until>=day);
  const mood=moodFrom(stateRoll("event"));
  const eligible=S.slots.map((slot,index)=>!slot.c.brandPlay&&slot.alive&&slot.budget>0&&slot.blocked<=0?index:null)
    .filter(index=>index!==null);
  const target=eligible[Math.floor(stateRoll("event")*eligible.length)];
  let event={...weightedEvent(stateRoll("event"),profile),target:null};
  if(event.scope==="slot")event=eligible.length?{...event,target}:{...DAY_EVENTS[0],target:null};
  if(event.id==="ios"&&S.pixel.status==="degraded") event={...DAY_EVENTS[0],target:null};
  if(event.fatigue&&Number.isInteger(target)){
    const slot=S.slots[target]; slot.fatigue=Math.max(slot.fatigue,event.fatigue);
  }
  if(event.pixelDays){
    S.pixel={status:"degraded",days:event.pixelDays,diagnosed:false};
    if(S.telemetry) S.telemetry.pixelBreaks=(S.telemetry.pixelBreaks||0)+1;
  }
  if(event.duration>1)S.pressures.push({id:event.id,title:event.title,from:day+1,until:day+event.duration-1,target:event.target,
    cpmM:event.cpmM,cvrM:event.cvrM,ctrM:event.ctrM,eplM:event.eplM});
  return {day,mood,event};
}
function dayEffect(state,key,slotIndex){
  const event=state&&state.event;
  let effect=!event||event[key]===undefined?1:(event.target===null||event.target===slotIndex?event[key]:1);
  for(const pressure of Array.isArray(S?.pressures)?S.pressures:[]){
    if(S.day<pressure.from||S.day>pressure.until||pressure[key]===undefined)continue;
    if(pressure.target===null||pressure.target===slotIndex)effect*=pressure[key];
  }
  return effect;
}
function activePressureText(){const active=(Array.isArray(S?.pressures)?S.pressures:[]).filter(item=>S.day>=item.from&&S.day<=item.until);
  return active.length?`<div class="event-aftermath"><b>Still in effect:</b> ${active.map(item=>`${item.title} through Day ${item.until}`).join(" · ")}</div>`:"";}
function scaleRiskRoll(day,index){return mulberry32(SEED*15485863+day*32452843+index*49999)();}

/* demand index across the run: a February-style peak then a fall */
const DEMAND=[0.90,0.94,0.99,1.05,1.10,1.14,1.15,1.11,1.04,0.98,0.93,0.90];
function demandOn(day){
  if(RUN_DAYS<=1) return DEMAND[0];
  const pos=(Math.min(RUN_DAYS,Math.max(1,day))-1)/(RUN_DAYS-1)*(DEMAND.length-1);
  const lo=Math.floor(pos), hi=Math.min(DEMAND.length-1,Math.ceil(pos)), mix=pos-lo;
  return DEMAND[lo]+(DEMAND[hi]-DEMAND[lo])*mix;
}
