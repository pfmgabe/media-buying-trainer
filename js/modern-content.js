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
function rollCreative(requestedFormat){
  const pool=LIBRARY.filter(c=>!c.brandPlay&&c.id!=="trap_i");
  const base=pool[Math.floor(stateRoll("creative")*pool.length)];
  const formatRoll=stateRoll("creative"),formats=selectableCreativeFormats();
  const format=creativeFormatById(requestedFormat||formats[Math.floor(formatRoll*formats.length)].id);
  const roll=stateRoll("creative"); let acc=0, tier=CREATIVE_TIERS[0];
  for(const candidate of CREATIVE_TIERS){acc+=candidate.weight;if(roll<=acc){tier=candidate;break;}}
  const names=MODERN_FORMAT_NAMES[format.id]||[base.fam],conceptName=names[Math.floor(stateRoll("creative")*names.length)];
  return {...base, id:base.id+"-"+Math.floor(stateRoll("creative")*1e7), rarity:tier.name,
    rarityClass:tier.cls, format:format.id, fam:conceptName,name:tier.name+" · "+conceptName,
    cpm:+(base.cpm*tier.cpmM).toFixed(2), ctr:+(base.ctr*tier.ctrM).toFixed(3),
    cvr:+(base.cvr*tier.cvrM).toFixed(3), tierCpmM:tier.cpmM,
    satBonus:tier.satBonus, fatigueM:tier.fatigueM};
}

const DAY_EVENTS=[
  {id:"quiet",weight:34,tone:"",title:"No major shock",body:"The account is yours to steer today."},
  {id:"viral",weight:16,tone:"good",scope:"slot",title:"Viral momentum",
   body:"One ad caught a pocket of lower-cost attention: cost per thousand impressions (CPM) fell 35%, and click-to-lead conversion rate (CVR) rose 35% today.",cpmM:0.65,cvrM:1.35},
  {id:"surge",weight:10,tone:"bad",title:"Auction surge",
   body:"A major advertiser entered the auction. Cost per thousand impressions (CPM) is 55% higher across the account today.",cpmM:1.55},
  {id:"influencer",weight:10,tone:"good",title:"Influencer tagged the brand",
   body:"Organic demand is spilling into paid traffic. Click-to-lead conversion rate (CVR) is 2.2× its baseline for one day.",cvrM:2.20},
  {id:"copied",weight:10,tone:"bad",scope:"slot",title:"Competitor copied the hook",
   body:"Your hottest ad is suddenly everywhere. Its fatigue jumps to 90% until you refresh the creative.",fatigue:90},
  {id:"ios",weight:8,tone:"bad",title:"Attribution signal loss",
   body:"A platform update degraded the pixel for three days. Account revenue still lands, but ad reporting misses 55% until the pixel is repaired.",pixelDays:3},
  {id:"glut",weight:12,tone:"good",title:"Inventory glut",
   body:"More placements opened than buyers expected. Cost per thousand impressions (CPM) is 22% lower across the account today.",cpmM:0.78}
];
function weightedEvent(roll){
  const total=DAY_EVENTS.reduce((a,e)=>a+e.weight,0); let cursor=roll*total;
  for(const event of DAY_EVENTS){cursor-=event.weight;if(cursor<=0)return event;}
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
  const mood=moodFrom(stateRoll("event"));
  const eligible=S.slots.map((slot,index)=>!slot.c.brandPlay&&slot.alive&&slot.budget>0&&slot.blocked<=0?index:null)
    .filter(index=>index!==null);
  const target=eligible[Math.floor(stateRoll("event")*eligible.length)];
  let event={...weightedEvent(stateRoll("event")),target:null};
  if(event.scope==="slot")event=eligible.length?{...event,target}:{...DAY_EVENTS[0],target:null};
  if(event.id==="ios"&&S.pixel.status==="degraded") event={...DAY_EVENTS[0],target:null};
  if(event.fatigue&&Number.isInteger(target)){
    const slot=S.slots[target]; slot.fatigue=Math.max(slot.fatigue,event.fatigue);
  }
  if(event.pixelDays){
    S.pixel={status:"degraded",days:event.pixelDays,diagnosed:false};
    if(S.telemetry) S.telemetry.pixelBreaks=(S.telemetry.pixelBreaks||0)+1;
  }
  return {day,mood,event};
}
function dayEffect(state,key,slotIndex){
  const event=state&&state.event;
  if(!event||event[key]===undefined) return 1;
  return event.target===null||event.target===slotIndex?event[key]:1;
}
function scaleRiskRoll(day,index){return mulberry32(SEED*15485863+day*32452843+index*49999)();}

/* demand index across the run: a February-style peak then a fall */
const DEMAND=[0.90,0.94,0.99,1.05,1.10,1.14,1.15,1.11,1.04,0.98,0.93,0.90];
function demandOn(day){
  if(RUN_DAYS<=1) return DEMAND[0];
  const pos=(Math.min(RUN_DAYS,Math.max(1,day))-1)/(RUN_DAYS-1)*(DEMAND.length-1);
  const lo=Math.floor(pos), hi=Math.min(DEMAND.length-1,Math.ceil(pos)), mix=pos-lo;
  return DEMAND[lo]+(DEMAND[hi]-DEMAND[lo])*mix;
}
