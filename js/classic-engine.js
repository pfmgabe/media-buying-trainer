"use strict";
/* ================= MODE 0 · CLASSIC (2017) — its own track ==================================
   Search PPC at an agency. This period-styled training model includes:
     · match types, and broad match bleeding into junk queries
     · negative keywords from the search-terms report — the core daily habit
     · Avg Position from bid x Quality Score (period-correct; Google killed it in 2019)
     · manual Max CPC; Maximize Clicks only on limited-budget campaigns
     · Search Impression Share split into Lost To Rank and Lost To Budget — opposite fixes,
       and SIS is "secondary or tertiary" data, so optimising it first is a mistake
     · standard vs accelerated delivery ("hits traffic harder earlier")
     · the wainscoting third scenario: a DIY researcher with great CTR who never converts
     · "is my client's website even set up for proper attribution?" — tracking can be broken
     · bid changes on thin click data are noise (the 3+ month timescale rule)
     · a keyword performing wildly differently from its ad-group peers needs splitting out
   And the thing no other mode has: A CLIENT. You can ace the account and still be fired.
   ========================================================================================== */
const CLASSIC_DAYS=RUN_DAYS, CLASSIC_BUDGET=DAILY_BUDGET;
const CLASSIC_STAGE=(function(){const s=parseInt(new URLSearchParams(location.search).get("stage"),10);
  return (s>=1&&s<=3)?s:1;})();
const CSTAGE_NAME={1:"Stage 1 · The Build",2:"Stage 2 · The Blind Spot",3:"Stage 3 · The Squeeze"};
const CSTAGE_BLURB={
 1:"Four ad groups, manual bids, one client. Learn match types, negatives, and the two ways to "+
   "lose impression share — they look the same and have opposite fixes.",
 2:"Everything in Stage 1, plus the client's conversion tracking may be lying to you, demand "+
   "swings with the season, and accelerated delivery can burn the budget before the afternoon.",
 3:"Everything above, plus competitors escalating their bids, Quality Score decaying on stale ad "+
   "copy, and a client who may cut the budget mid-flight if trust slips."};

const AD_GROUPS=[
 {id:"commercial",name:"Commercial Concrete Contractors", core:"commercial concrete contractors",
  intent:"ready",    vol:520, baseCVR:7.2, value:95,
  note:"Tightly themed and high intent. The money is here if you can afford the position."},
 {id:"local",name:"Concrete Contractors Near Me", core:"concrete contractors near me",
  intent:"ready",    vol:880, baseCVR:5.4, value:85,
  note:"Local intent, more volume, slightly cheaper leads."},
 {id:"patio",name:"Concrete Patio Cost", core:"concrete patio cost",
  intent:"research", vol:1450, baseCVR:2.1, value:70,
  note:"Price research. Real buyers, earlier in the funnel — cheap clicks, patient money."},
 /* the wainscoting third scenario, transplanted: looks mid-funnel, is a DIY-er */
 {id:"diy",name:"How To Pour A Concrete Slab", core:"how to pour a concrete slab",
  intent:"diy",      vol:2600, baseCVR:0.25, value:70,
  note:"Huge volume and a great click-through rate. Read the intent before you fund it."}];

const JUNK_TERMS=["concrete contractor jobs","concrete calculator free","how much does a bag of "+
 "concrete weigh","concrete poem examples","cement vs concrete reddit","diy concrete countertop",
 "concrete contractor salary","minecraft concrete recipe"];

/* Authored copy is resolved from stable IDs, so rewrites are visible and browser saves cannot
   inject arbitrary HTML. Standard ads use a compact trainer format rather than claiming an exact
   historical field limit. Expanded Text Ads use the 2017-era two-headline / one-description shape. */
const CLASSIC_COPY_DECKS=Object.freeze({
  commercial:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Project-ready concrete crews.","Request a site estimate."],path:"commercial",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Concrete Built For Business"],descriptions:["Plan foundations, slabs and site work with an experienced project team."],path:"business-projects",ctrM:1.04,relM:1.06,cvrM:1.05}),
      Object.freeze({headlines:["Commercial Concrete Partner"],descriptions:["Coordinate scope, timing and an itemized estimate for your next concrete project."],path:"commercial-estimate",ctrM:1.02,relM:1.10,cvrM:1.08}),
      Object.freeze({headlines:["Plan Your Concrete Project"],descriptions:["Talk through site requirements with a commercial concrete project specialist."],path:"project-planning",ctrM:.99,relM:1.12,cvrM:1.10})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Project-ready concrete crews.","Book a site walk today."],path:"commercial",axis:"CTA",ctrM:1.08,cvrM:.99}),
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Licensed project crews.","Request a site estimate."],path:"commercial",axis:"Proof",ctrM:1.02,cvrM:1.06})]),
    expanded:Object.freeze([Object.freeze({headlines:["Commercial Concrete Crews","Request A Project Estimate"],descriptions:["Plan slabs, foundations and site work with a project-ready local concrete team."],path:"commercial/estimate",axis:"Longer qualification copy",ctrM:.98,cvrM:1.12})])}),
  local:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local concrete project help.","Request an estimate."],path:"near-you",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Find A Local Concrete Crew"],descriptions:["Share the project and connect with a nearby concrete team."],path:"local-crew",ctrM:1.07,relM:1.04,cvrM:1.02}),
      Object.freeze({headlines:["Local Concrete Project Help"],descriptions:["Compare scope, timing and an estimate before work begins."],path:"local-estimate",ctrM:1.03,relM:1.09,cvrM:1.08}),
      Object.freeze({headlines:["Nearby Concrete Specialists"],descriptions:["Get practical next steps for patios, slabs and other concrete work."],path:"nearby-projects",ctrM:1.01,relM:1.10,cvrM:1.09})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local concrete project help.","Check nearby availability."],path:"near-you",axis:"Local CTA",ctrM:1.09,cvrM:.98}),
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local crews for planned projects.","Request an estimate."],path:"near-you",axis:"Qualification",ctrM:.98,cvrM:1.09})]),
    expanded:Object.freeze([Object.freeze({headlines:["Local Concrete Contractors","Check Project Availability"],descriptions:["Share project details and location to request a local concrete estimate."],path:"local/request",axis:"Longer local-intent copy",ctrM:1.01,cvrM:1.10})])}),
  patio:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Explore patio cost factors.","Plan your project."],path:"patio-cost",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Estimate A Concrete Patio"],descriptions:["Compare size, finish and site factors before requesting a quote."],path:"patio-estimate",ctrM:1.08,relM:1.00,cvrM:.99}),
      Object.freeze({headlines:["Plan Your New Concrete Patio"],descriptions:["See which project details shape price, then request a tailored estimate."],path:"patio-planning",ctrM:1.03,relM:1.08,cvrM:1.10}),
      Object.freeze({headlines:["Patio Pricing Starts Here"],descriptions:["Turn early price research into a scoped concrete patio plan."],path:"patio-pricing",ctrM:1.06,relM:1.05,cvrM:1.04})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Explore patio cost factors.","Compare project options."],path:"patio-cost",axis:"Comparison CTA",ctrM:1.10,cvrM:.96}),
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Price depends on size and finish.","Plan your project."],path:"patio-cost",axis:"Specificity",ctrM:1.03,cvrM:1.07})]),
    expanded:Object.freeze([Object.freeze({headlines:["Concrete Patio Cost Guide","Plan Size, Finish And Site"],descriptions:["Review the details that shape patio pricing, then request a project estimate."],path:"patio/cost-guide",axis:"Longer research copy",ctrM:1.07,cvrM:1.05})])}),
  diy:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Read the basic project steps.","Plan tools and materials."],path:"slab-guide",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Planning A Concrete Slab?"],descriptions:["Review the project, then decide whether to build it or request professional help."],path:"slab-planning",ctrM:.86,relM:.88,cvrM:1.30}),
      Object.freeze({headlines:["Concrete Slab Project Guide"],descriptions:["Understand scope, site prep and when a contractor may be the safer choice."],path:"slab-project",ctrM:.84,relM:.82,cvrM:1.38}),
      Object.freeze({headlines:["Before You Pour A Slab"],descriptions:["Check project complexity and compare a professional estimate before starting."],path:"before-you-pour",ctrM:.82,relM:.76,cvrM:1.45})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Read the basic project steps.","Or compare professional help."],path:"slab-guide",axis:"Qualified CTA",ctrM:.79,cvrM:1.55}),
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["For simple DIY planning.","Large slabs may need a crew."],path:"slab-guide",axis:"Audience qualifier",ctrM:.76,cvrM:1.65})]),
    expanded:Object.freeze([Object.freeze({headlines:["Concrete Slab Project Guide","DIY Steps Or Professional Help"],descriptions:["Review prep, tools and complexity, then compare professional help if needed."],path:"slab/project-guide",axis:"Longer qualification copy",ctrM:.80,cvrM:1.60})])})
});

function classicCopyId(groupId,kind,index){return `${groupId}:${kind}:${index}`;}
function classicCopy(copyId,groupId="commercial"){
  const parts=String(copyId||"").split(":"),deck=CLASSIC_COPY_DECKS[parts[0]],list=deck&&deck[parts[1]],index=Number(parts[2]);
  const fallback=CLASSIC_COPY_DECKS[groupId]||CLASSIC_COPY_DECKS.commercial;
  return list&&Number.isInteger(index)&&list[index]?list[index]:fallback.standard[0];
}
function classicCopyExists(copyId){const parts=String(copyId||"").split(":"),deck=CLASSIC_COPY_DECKS[parts[0]],list=deck&&deck[parts[1]],index=Number(parts[2]);
  return !!(list&&Number.isInteger(index)&&list[index]);}
function classicCopyBelongsTo(copyId,groupId){return classicCopyExists(copyId)&&String(copyId).split(":")[0]===groupId;}
function classicAdKind(ad){return String(ad?.copyId||"").split(":")[1]||"standard";}
function classicAdCopy(g,ad){
  const recipe=classicCopy(ad?.copyId,g.id);if(classicAdKind(ad)!=="permutation")return recipe;
  const baseId=classicCopyBelongsTo(ad?.baseCopyId,g.id)&&String(ad.baseCopyId).includes(":standard:")
    ?ad.baseCopyId:classicCopyId(g.id,"standard",0),base=classicCopy(baseId,g.id),control=CLASSIC_COPY_DECKS[g.id].standard[0];
  const descriptions=base.descriptions.slice();recipe.descriptions.forEach((line,index)=>{
    if(line===control.descriptions[index])return;
    if(descriptions.length>=control.descriptions.length)descriptions[index]=line;
    else if(index===0)descriptions.unshift(line);else descriptions.push(line);
  });
  return {...base,headlines:base.headlines.slice(),descriptions,path:base.path,axis:recipe.axis,
    ctrM:(base.ctrM||1)*(recipe.ctrM||1),cvrM:(base.cvrM||1)*(recipe.cvrM||1)};
}
function classicAdEvidenceKey(ad){return `${ad.id}|${ad.copyId}|${ad.baseCopyId||""}|${ad.version||1}`;}
function classicPermutationCount(g){return g.ads.filter(ad=>classicAdKind(ad)==="permutation").length;}
function classicActiveAds(g){const active=g.ads.filter(ad=>ad.active!==false);return active.length?active:[g.ads[0]];}
function classicClamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function freshClassicAd(group,index=0){return {id:`${group.id}-ad-${index+1}`,copyId:classicCopyId(group.id,"standard",0),version:1,
  createdDay:1,active:true,stats:{impr:0,clicks:0,convR:0,spend:0}};}
function classicQualityScore(g){const q=g.quality||{expectedCtr:g.qs||6,adRelevance:g.qs||6,landingExperience:g.qs||6};
  return Math.max(1,Math.min(10,(q.expectedCtr+q.adRelevance+q.landingExperience)/3));}
function syncClassicQuality(g){g.qs=classicQualityScore(g);return g.qs;}
function classicAuctionQuality(g){const q=g.quality;return q?(.40*q.expectedCtr+.35*q.adRelevance+.25*q.landingExperience):(g.qs||6);}
function classicQualityStatus(value){return value<5.5?["Below average","bad"]:value<7.5?["Average","amb"]:["Above average","good"];}
function classicSigned(value){return `${value>=0?"+":""}${value.toFixed(1)}`;}
function classicHydrate(){if(!S||!S.classic)return false;
  S.classicModelVersion=2;S.stage=CLASSIC_STAGE;S.day=Math.max(1,Math.min(CLASSIC_DAYS+1,Math.floor(Number(S.day)||1)));
  S.budget=classicClamp(S.budget,1,CLASSIC_BUDGET,CLASSIC_BUDGET);S.compBid=classicClamp(S.compBid,.5,3,1);
  S.delivery=["standard","accelerated"].includes(S.delivery)?S.delivery:"standard";S.telemetry=S.telemetry||{};
  for(const key of ["adVariants","expandedAds","landingPasses"])if(!Number.isFinite(S.telemetry[key]))S.telemetry[key]=0;
  const usedGroupIds=new Set();S.groups=S.groups.slice(0,AD_GROUPS.length);S.groups.forEach((g,index)=>{
    const requested=AD_GROUPS.find(item=>item.id===g.id),indexed=AD_GROUPS[index],
      base=(requested&&!usedGroupIds.has(requested.id)?requested:null)||
        (indexed&&!usedGroupIds.has(indexed.id)?indexed:null)||AD_GROUPS.find(item=>!usedGroupIds.has(item.id))||AD_GROUPS[0];
    usedGroupIds.add(base.id);
    g.id=base.id;for(const key of ["name","core","intent","vol","baseCVR","value","note"])g[key]=base[key];
    g.match=MATCH[g.match]?g.match:(index===3?"broad":"phrase");g.maxCPC=classicClamp(g.maxCPC,.25,8,2.5);
    g.negatives=Math.max(0,Math.min(100,Math.floor(Number(g.negatives)||0)));g.paused=!!g.paused;g.split=!!g.split;
    g.campaignId=g.split?`dedicated-${g.id}`:"concrete-services";
    g.campaignDelivery=["standard","accelerated"].includes(g.campaignDelivery)?g.campaignDelivery:S.delivery;
    g.quality=g.quality&&["expectedCtr","adRelevance","landingExperience"].every(key=>Number.isFinite(g.quality[key]))
      ?g.quality:{expectedCtr:Number(g.qs)||6,adRelevance:Number(g.qs)||6,landingExperience:Number(g.qs)||6};
    for(const key of ["expectedCtr","adRelevance","landingExperience"])
      g.quality[key]=classicClamp(g.quality[key],1,10,6);
    g.landingM=classicClamp(g.landingM,.5,2,1);g.rewriteCount=Math.max(0,Number.isInteger(g.rewriteCount)?g.rewriteCount:0);
    g.variantCount=Math.max(0,Number.isInteger(g.variantCount)?g.variantCount:0);
    g.lastRewriteDay=Math.max(0,Math.min(S.day,Number.isFinite(g.lastRewriteDay)?g.lastRewriteDay:0));
    g.lastVariantDay=Math.max(0,Math.min(S.day,Number.isFinite(g.lastVariantDay)?g.lastVariantDay:0));g.landingPassDone=!!g.landingPassDone;
    const oldPreview=String(g.previewAdId||""),rawAds=Array.isArray(g.ads)?g.ads.filter(ad=>ad&&classicCopyBelongsTo(ad.copyId,g.id)):[],
      lead=rawAds.find(ad=>classicAdKind(ad)==="standard")||freshClassicAd(g),leadCopyId=lead.copyId,seenSiblingCopies=new Set();let expandedSeen=false;
    const siblings=[];for(const raw of rawAds){const kind=classicAdKind(raw);if(raw===lead||kind==="standard")continue;
      if(kind==="expanded"){if(expandedSeen)continue;expandedSeen=true;}
      if(kind==="permutation"&&seenSiblingCopies.has(raw.copyId))continue;
      if(kind==="permutation")seenSiblingCopies.add(raw.copyId);
      const baseChanged=kind==="permutation"&&raw.baseCopyId!==leadCopyId;
      siblings.push(baseChanged?{...raw,baseCopyId:leadCopyId,version:(Number(raw.version)||1)+1,createdDay:S.day,
        stats:{impr:0,clicks:0,convR:0,spend:0}}:raw);
      if(siblings.length>=3)break;
    }
    const safeAds=[lead,...siblings],usedAdIds=new Set();
    g.ads=(safeAds.length?safeAds:[freshClassicAd(g)]).map((ad,adIndex)=>{
      const suggested=`${g.id}-ad-${adIndex+1}`,rawId=String(ad.id||"");let id=new RegExp(`^${g.id}-ad-[1-9][0-9]*$`).test(rawId)?rawId:suggested,
        candidate=adIndex+1;
      while(usedAdIds.has(id)){while(usedAdIds.has(`${g.id}-ad-${candidate}`))candidate++;id=`${g.id}-ad-${candidate++}`;}
      usedAdIds.add(id);
      const stats=ad.stats&&typeof ad.stats==="object"?ad.stats:{};
      return {id,copyId:ad.copyId,version:Math.max(1,Number.isInteger(ad.version)?ad.version:1),
        createdDay:Math.max(1,Number.isFinite(ad.createdDay)?ad.createdDay:S.day),
        active:adIndex===0?true:ad.active!==false,
        ...(classicAdKind(ad)==="permutation"?{baseCopyId:classicCopyBelongsTo(ad.baseCopyId,g.id)&&String(ad.baseCopyId).includes(":standard:")?ad.baseCopyId:leadCopyId}:{}),
        ...(adIndex===0&&classicCopyBelongsTo(ad.previousCopyId,g.id)?{previousCopyId:ad.previousCopyId}:{}),
        stats:{impr:Math.max(0,Number(stats.impr)||0),clicks:Math.max(0,Number(stats.clicks)||0),
          convR:Math.max(0,Number(stats.convR)||0),spend:Math.max(0,Number(stats.spend)||0)}};});
    g.previewAdId=g.ads.some(ad=>ad.id===oldPreview)?oldPreview:g.ads[0].id;
    g.variantCount=Math.max(g.variantCount,classicPermutationCount(g));
    g.nextAdId=Math.max(2,...g.ads.map(ad=>Number(ad.id.split("-").pop())+1).filter(Number.isFinite));
    g.expandedBuilt=g.ads.some(ad=>String(ad.copyId).includes(":expanded:"));
    if(g.last&&typeof g.last==="object"){
      g.last.day=Math.max(1,Number.isFinite(g.last.day)?g.last.day:S.day-1);
      g.last.delivery=["standard","accelerated"].includes(g.last.delivery)?g.last.delivery:classicGroupDelivery(g);
      if(Array.isArray(g.last.adBreakdown))g.last.adBreakdown.forEach(row=>{if(typeof row.adKey==="string")return;
        const ad=g.ads.find(item=>item.id===row.adId&&item.copyId===row.copyId);if(ad)row.adKey=classicAdEvidenceKey(ad);});
    }
    syncClassicQuality(g);
  });return true;}

function freshClassic(){
  S={ classic:true, stage:CLASSIC_STAGE, day:1, seedShown:SEED,
      budget:CLASSIC_BUDGET, delivery:"standard",
      spendTotal:0, convReported:0, convActual:0, valueTotal:0, reportedValueTotal:0, clicksTotal:0, wasteTotal:0,
      knowledgeCredits:0,log:[], queue:shuffle(RECALL.slice()), asks:1,
      groups:AD_GROUPS.map((g,i)=>({...g, campaignId:"concrete-services",campaignDelivery:"standard",match:(i===3?"broad":"phrase"), maxCPC:2.50, qs:6,
        quality:{expectedCtr:6,adRelevance:6,landingExperience:6},landingM:1,
        negatives:0, paused:false, split:false, splitDay:0,last:null,lastRewriteDay:0,lastVariantDay:0,landingPassDone:false,
        ads:[freshClassicAd(g)],previewAdId:`${g.id}-ad-1`,nextAdId:2,rewriteCount:0,variantCount:0,expandedBuilt:false,
        trackingBroken:(CLASSIC_STAGE>=2 && i===1)})),
      terms:[], compBid:1.0,
      client:{trust:62, baseline:100, promised:null, grievance:"the last agency never explained "+
        "what they were doing", grievanceHandled:false, amNoted:false, calls:0, budgetCut:false},
      telemetry:{negAdded:0, bidMoves:0, thinBidMoves:0, adRewrites:0,adVariants:0,expandedAds:0,landingPasses:0,splits:0, trackingChecked:false,
                 overPromised:false, speculated:false, sisMisread:0, acceleratedDays:0,recallRight:0,recallWrong:0} };
}

function classicSeason(day){                       // "is my client's business seasonal?"
  if(S.stage<2) return 1;
  return 0.82+0.34*Math.sin((day/CLASSIC_DAYS)*Math.PI);   // concrete: soft winter, strong summer
}
const MATCH={exact:{reach:0.30,junk:0.02,cvrM:1.20},
             phrase:{reach:0.62,junk:0.16,cvrM:1.00},
             broad:{reach:1.00,junk:0.46,cvrM:0.72}};

function classicGroupDelivery(g){return S.stage>=2?(g.split?g.campaignDelivery:S.delivery):"standard";}
function classicAuctionPreview(g,season){
  const M=MATCH[g.match],auctionQuality=classicAuctionQuality(g),accelerated=classicGroupDelivery(g)==="accelerated",
    strength=(g.maxCPC*auctionQuality)/(S.compBid*6),
    avgPos=Math.max(1,Math.min(4.2,4.4-2.6*Math.min(1.6,strength))),
    sisRank=Math.max(0,Math.min(1,(strength-.35)/.9)),
    baseCtr=(.085-.014*(avgPos-1))*(.7+g.quality.expectedCtr*.05)*(g.intent==="diy"?1.9:1),
    cpc=Math.min(g.maxCPC,S.compBid*(.72+keyedRandom(SEED,"classic-cpc",S.day,g.id)*.30)/Math.pow(auctionQuality/6,.18)),
    ads=classicActiveAds(g),share=1/ads.length,potentialImpr=g.vol*M.reach*sisRank*season,
    potentialClicks=ads.reduce((sum,ad)=>sum+potentialImpr*share*baseCtr*(classicAdCopy(g,ad).ctrM||1),0),
    potentialSpend=potentialClicks*cpc*(accelerated?1.14:1);
  return {g,M,accelerated,avgPos,sisRank,baseCtr,cpc,ads,share,potentialImpr,potentialSpend};
}

function runDayClassic(){
  if(!S||S.day>CLASSIC_DAYS)return false;
  classicHydrate();
  const lines=[];const season=classicSeason(S.day);
  if(S.stage>=3){ S.compBid=Math.min(2.2, S.compBid*1.018); }   // competitors escalate
  let daySpend=0, dayConvA=0, dayConvR=0, dayValA=0, dayValR=0, dayClicks=0, dayWaste=0;
  const active=S.groups.filter(g=>!g.paused);
  const auctions=active.map(g=>classicAuctionPreview(g,season)),potentialSpend=auctions.reduce((sum,row)=>sum+row.potentialSpend,0),
    budgetRatio=potentialSpend>0?Math.min(1,S.budget/potentialSpend):1;
  auctions.forEach(({g,M,accelerated,avgPos,sisRank,baseCtr,cpc,ads,share,potentialImpr})=>{
    // Rank determines what is reachable; the second pass allocates the actual budget against
    // predicted deliverable spend, so "lost to budget" only appears when the cap really binds.
    const sis=sisRank*budgetRatio;
    const lostRank=Math.max(0,1-sisRank), lostBudget=Math.max(0,sisRank*(1-budgetRatio));
    const impr=potentialImpr*budgetRatio;
    const junkShare=Math.max(0,M.junk-g.negatives*0.045)*(accelerated?1.12:1);
    const paidCpc=cpc*(accelerated?1.14:1),adBreakdown=ads.map(ad=>{const copy=classicAdCopy(g,ad),adImpr=impr*share,
      clicks=Math.max(0,adImpr*baseCtr*(copy.ctrM||1)),wasted=clicks*junkShare,good=clicks-wasted,
      convA=good*(g.baseCVR/100)*M.cvrM*season*(accelerated?0.93:1)*(copy.cvrM||1)*g.landingM,
      convR=g.trackingBroken?convA*.35:convA,spend=clicks*paidCpc;
      return {adId:ad.id,adKey:classicAdEvidenceKey(ad),copyId:ad.copyId,impr:adImpr,clicks,cpc:paidCpc,spend,wasted,convA,convR,
        valA:convA*g.value,valR:convR*g.value};});
    const total=key=>adBreakdown.reduce((sum,row)=>sum+row[key],0),clicks=total("clicks"),spend=total("spend"),
      wasted=total("wasted"),convA=total("convA"),convR=total("convR"),valA=total("valA"),valR=total("valR");
    g.last={day:S.day,delivery:classicGroupDelivery(g),impr,clicks,cpc:clicks?spend/clicks:paidCpc,spend,avgPos,sis,lostRank,lostBudget,wasted,convA,convR,val:valA,valA,valR,adBreakdown,
            ctr:impr?clicks/impr:0,postClickCvr:clicks?convR/clicks:0,
            cpa:convR>0?spend/convR:0,roas:spend>0?valR/spend:0,
            roasReported:spend>0?valR/spend:0,roasModeled:spend>0?valA/spend:0};
    daySpend+=spend;dayConvA+=convA;dayConvR+=convR;dayValA+=valA;dayValR+=valR;dayClicks+=clicks;dayWaste+=wasted;
    if(S.stage>=3){g.quality.expectedCtr=Math.max(3,g.quality.expectedCtr-.0675);
      g.quality.adRelevance=Math.max(3,g.quality.adRelevance-.0675);syncClassicQuality(g);} // every ad can stale
  });
  /* The old approximation could report spend above the account budget, especially with
     accelerated delivery. Scale delivery proportionally so the chosen cap is a real cap. */
  if(daySpend>S.budget){
    const scale=S.budget/daySpend;
    daySpend=0;dayConvA=0;dayConvR=0;dayValA=0;dayValR=0;dayClicks=0;dayWaste=0;
    active.forEach(g=>{const L=g.last;
      ["impr","clicks","spend","wasted","convA","convR","val","valA","valR"].forEach(k=>{L[k]*=scale;});
      if(Array.isArray(L.adBreakdown))L.adBreakdown.forEach(row=>{
        ["impr","clicks","spend","wasted","convA","convR","valA","valR"].forEach(k=>{row[k]*=scale;});
      });
      L.sis*=scale;L.lostBudget=Math.max(0,(1-L.lostRank)-L.sis);
      L.ctr=L.impr?L.clicks/L.impr:0;L.postClickCvr=L.clicks?L.convR/L.clicks:0;
      L.cpa=L.convR?L.spend/L.convR:0;L.roasReported=L.spend?L.valR/L.spend:0;
      L.roasModeled=L.spend?L.valA/L.spend:0;L.roas=L.roasReported;
      daySpend+=L.spend;dayConvA+=L.convA;dayConvR+=L.convR;dayValA+=L.valA;dayValR+=L.valR;
      dayClicks+=L.clicks;dayWaste+=L.wasted;
    });
  }
  active.forEach(g=>{for(const row of g.last?.adBreakdown||[]){const ad=g.ads.find(item=>item.id===row.adId&&classicAdEvidenceKey(item)===row.adKey);if(!ad)continue;
    ad.stats.impr+=row.impr;ad.stats.clicks+=row.clicks;ad.stats.convR+=row.convR;ad.stats.spend+=row.spend;}});
  // junk search terms surface for the player to negative out
  if(dayWaste>1&&S.terms.length<8&&keyedRandom(SEED,"classic-term-surface",S.day)<0.75){
    const t=JUNK_TERMS[Math.floor(keyedRandom(SEED,"classic-term-choice",S.day)*JUNK_TERMS.length)];
    if(!S.terms.includes(t)) S.terms.push(t);
  }
  S.spendTotal+=daySpend; S.convActual+=dayConvA; S.convReported+=dayConvR;
  S.valueTotal+=dayValA;S.reportedValueTotal+=dayValR;S.clicksTotal+=dayClicks;S.wasteTotal+=dayWaste;
  if(auctions.some(row=>row.accelerated))S.telemetry.acceleratedDays++;
  lines.push(`spend <b>${money(daySpend)}</b> · ${Math.round(dayClicks)} clicks · `+
    `<b>${dayConvR.toFixed(1)}</b> conversions reported${S.stage>=2?" (as tracked)":""} · `+
    `reported ROAS <b>${(daySpend?dayValR/daySpend:0).toFixed(2)}</b>`);
  if(S.stage>=2) lines.push(`season index ${season.toFixed(2)}`);
  addLog(`<div><b>Day ${S.day}</b> · `+lines.join(" · ")+`</div>`,"performance");
  const dayRoas=daySpend?dayValR/daySpend:0;
  if(dayRoas>=5)queueDayFx("jackpot",{profit:dayValR-daySpend,roas:dayRoas});
  else if(dayRoas>=2)queueDayFx("profit",{profit:dayValR-daySpend,roas:dayRoas});
  // the client calls every 7 days
  S.day++;
  const ended=S.day>CLASSIC_DAYS;
  if((S.day-1)%7===0){
    renderClassic();clientCall(ended?classicDebrief:null);flushDayFx();return;
  }
  if(ended){if(typeof autoCheckpoint==="function")autoCheckpoint();pendingDayFx=[];renderClassic();classicDebrief();return;}
  if(typeof autoCheckpoint==="function")autoCheckpoint();
  if(S.day%5===0 && S.queue.length) recall();
  renderClassic();flushDayFx();
}

/* ---------------- the client: a second scoreboard that can fire you ---------------- */
function clientCall(onComplete=null){
  const c=S.client; c.calls++;
  const terminal=S.day>CLASSIC_DAYS&&typeof onComplete==="function";
  const pace=S.convReported/Math.max(1,(S.day-1))*30;      // month-paced reported conversions
  const behind=pace<c.baseline;
  c.trust-=2;                                  // a quiet month makes clients nervous
  if(S.telemetry.negAdded===0 && S.wasteTotal>400){ c.trust-=4;
    addLog("<div><b class='neg'>Client noticed</b> — they pulled the search terms report themselves</div>","client"); }
  const opts=[];
  if(c.promised===null&&!terminal){
    opts.push(["honest",`Reiterate the baseline (${c.baseline}/mo) and suggest a small increase`,
      "Training principle: reiterate the baseline, suggest a small increase, then evaluate."]);
    opts.push(["over",`Promise to beat ${c.baseline}/mo comfortably`,
      "Feels good on the call. Creates an expectation you then have to meet."]);
  } else {
    opts.push(["report", behind?"Tell them we're behind and what you're changing":"Report the numbers straight",
      "Data speaks for itself. No speculation."]);
    opts.push(["speculate","Offer a theory about why, off the top of your head",
      "Training principle: distinguish evidence from an untested theory when speaking with a client."]);
  }
  if(!c.grievanceHandled) opts.push(["grievance",`Address it: "${c.grievance}"`,
    "Training principle: acknowledge and resolve concerns so they do not linger."]);
  if(!c.amNoted) opts.push(["am","Leave the Account Manager a note on what changed",
    "Training principle: the Account Manager needs a clear record of what changed and why."]);
  show(`<div class="eyebrow">Day ${S.day-1} · the client is on the phone (call ${c.calls})</div>
    <h2>Client trust ${c.trust}/100</h2>
    <div class="prose"><p>Pace so far: <b>${pace.toFixed(1)}</b> conversions a month reported,
    against a baseline of <b>${c.baseline}</b>. ${c.promised!==null?`You promised <b>${c.promised}</b>.`:""}</p></div>
    <div class="row" style="margin:10px 0;flex-direction:column;align-items:stretch">
      ${opts.map(([k,label])=>`<button class="btn" data-c="${k}"
        style="text-align:left;margin-bottom:5px">${label}</button>`).join("")}
    </div>`,"client");
  ov.querySelectorAll("button[data-c]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.c, T=S.telemetry;
    const explanation=(opts.find(option=>option[0]===k)||[])[2];
    if(k==="honest"){ c.promised=c.baseline+2; c.trust+=6;
      addLog("<div><b>Call</b> — baseline reiterated, small increase agreed</div>","client"); }
    if(k==="over"){ c.promised=Math.round(c.baseline*1.6); c.trust+=10; T.overPromised=true;
      addLog("<div><b>Call</b> — you promised big. They are delighted, for now.</div>","client"); }
    if(k==="report"){ c.trust+=behind?-3:5;
      addLog("<div><b>Call</b> — numbers reported straight</div>","client"); }
    if(k==="speculate"){ c.trust-=9; T.speculated=true;
      addLog("<div><b class='neg'>Call</b> — you speculated in front of the client</div>","client"); }
    if(k==="grievance"){ c.grievanceHandled=true; c.trust+=8;
      addLog("<div><b>Call</b> — their old grievance addressed</div>","client"); }
    if(k==="am"){ c.amNoted=true; c.trust+=5;
      addLog("<div><b>Note</b> — AM briefed on what changed</div>","client"); }
    if(c.promised!==null && pace<c.promised*0.85) c.trust-=9;   // missing the promise costs
    if(S.stage>=3 && c.trust<45 && !c.budgetCut){ c.budgetCut=true; S.budget=Math.round(S.budget*0.7);
      addLog(`<div><b class="neg">Budget cut</b> — trust slipped, daily budget now ${money(S.budget)}</div>`,"client"); }
    c.trust=Math.max(0,Math.min(100,c.trust));
    if(explanation)addLog(`<div><b>Decision feedback</b> — ${explanation}</div>`,"client");
    if(typeof autoCheckpoint==="function")autoCheckpoint();
    close();renderClassic();if(typeof onComplete==="function")onComplete();
  });
}

/* ---------------- render ---------------- */
function classicAdLabel(g,ad,index){const copy=classicAdCopy(g,ad),letter=String.fromCharCode(65+index),kind=classicAdKind(ad),
  status=ad.active===false?" · paused":"";
  return `${letter} · ${kind==="expanded"?"Expanded Text Ad":kind==="permutation"?`${copy.axis||"A/B"} permutation`:index===0?"Lead ad":"Variant"}${status}`;}
function classicAdPreviewMarkup(g,ad,index,groupIndex){const copy=classicAdCopy(g,ad),kind=classicAdKind(ad),L=g.last,
  evidence=(L?.adBreakdown||[]).find(row=>row.adKey===classicAdEvidenceKey(ad)),cumulative=ad.stats||{},previous=ad.previousCopyId?classicCopy(ad.previousCopyId,g.id):null,
  fields=[...copy.headlines.map((line,i)=>["headline",`Headline ${i+1}`,line]),...copy.descriptions.map((line,i)=>["description",`Description ${i+1}`,line])];
  return `<section class="classic-ad-preview" aria-label="${classicAdLabel(g,ad,index)}">
    <div class="classic-ad-type"><span>${kind==="expanded"?"📝":"🔎"} ${kind==="expanded"?"Expanded Text Ad · historical 2017 longer-copy format":"Search text ad · compact trainer format"}</span>
      <span>${classicAdLabel(g,ad,index)}${ad.version>1?` · version ${ad.version}`:""}</span></div>
    <div class="classic-ad-url">Ad · example-concrete.test/${copy.path}</div>
    <div class="classic-ad-fields">${fields.map(([type,label,line])=>`<div class="classic-ad-field classic-ad-${type}"><span>${label}</span><div>${escapeHtml(line)}</div></div>`).join("")}</div>
    ${copy.axis?`<div class="classic-ad-axis">Controlled change · ${escapeHtml(copy.axis)}</div>`:""}
    ${evidence?`<div class="classic-ad-evidence">Day ${L.day} · ${Math.round(evidence.impr)} impressions · ${Math.round(evidence.clicks)} clicks · ${evidence.convR.toFixed(1)} reported conversions</div>`:
      Number(cumulative.impr)>0?`<div class="classic-ad-evidence">Cumulative for this copy · ${Math.round(cumulative.impr)} impressions · ${Math.round(cumulative.clicks)} clicks · ${Number(cumulative.convR).toFixed(1)} reported conversions${ad.active===false?" · currently paused":""}</div>`:
      `<div class="classic-ad-evidence">${ad.active===false?"Paused · no delivery evidence for this copy yet.":"No delivery evidence for this copy version yet."}</div>`}
    ${previous?`<details class="classic-copy-history"><summary>What the rewrite replaced</summary>
      <div><b>Headline</b><s>${escapeHtml(previous.headlines.join(" | "))}</s><span aria-hidden="true">→</span><strong>${escapeHtml(copy.headlines.join(" | "))}</strong></div>
      <div><b>Description</b><s>${escapeHtml(previous.descriptions.join(" "))}</s><span aria-hidden="true">→</span><strong>${escapeHtml(copy.descriptions.join(" "))}</strong></div></details>`:""}
    ${index>0?`<div class="classic-variant-controls"><button class="btn" data-ca="ad-toggle" data-i="${groupIndex}" data-ad-id="${ad.id}">${ad.active===false?"▶️ Resume this ad":"⏸️ Pause this ad"}</button>
      <button class="btn" data-ca="ad-retire" data-i="${groupIndex}" data-ad-id="${ad.id}">🗑️ Retire this ad</button></div>`:""}
  </section>`;}
function classicQualityMarkup(g){const rows=[
    ["Expected CTR",g.quality.expectedCtr,"How likely the ad is to earn a click for this keyword."],
    ["Ad relevance",g.quality.adRelevance,"How closely the wording answers the search intent."],
    ["Landing page experience",g.quality.landingExperience,"How useful and consistent the destination is after the click."]
  ];
  return `<section class="classic-quality" aria-label="Quality Score explanation">
    <div class="classic-quality-title"><span>🧩 Quality Score · keyword diagnostic</span><b>${Math.round(g.qs)}/10</b></div>
    <div class="classic-quality-components">${rows.map(([label,value,detail])=>{const [status,cls]=classicQualityStatus(value);return `<div class="${cls}"><span>${label}</span><b>${status}</b><small>${detail}</small></div>`;}).join("")}</div>
    <details class="classic-quality-why"><summary>Why this score—and what changes it?</summary>
      <p>The visible 1–10 score is a keyword-level diagnostic, not a KPI and not a literal auction input. Google presents the three components above as relative statuses. This trainer keeps internal component indices so your decisions can move the diagnostic gradually, then uses those underlying signals in a simplified 2017 auction-quality proxy.</p>
      <p><b>Rewrite</b> can raise or lower expected CTR and ad relevance depending on the new message. <b>Landing-page pass</b> changes landing experience. <b>Bid</b> changes auction pressure, never Quality Score. A longer ad or new variant is a test—not a guaranteed score upgrade.</p></details>
  </section>`;}
function addClassicVariant(g,kind){if(!g||g.ads.length>=4||(kind==="permutation"&&classicPermutationCount(g)>=2))return false;
  const deck=CLASSIC_COPY_DECKS[g.id]?.[kind];if(!deck||!deck.length)return false;
  const available=kind==="permutation"?deck.map((copy,index)=>index).filter(index=>!g.ads.some(ad=>ad.copyId===classicCopyId(g.id,kind,index))):[0],
    ordinal=available[g.variantCount%available.length],copyId=classicCopyId(g.id,kind,ordinal),id=`${g.id}-ad-${g.nextAdId++}`;
  g.ads.push({id,copyId,...(kind==="permutation"?{baseCopyId:g.ads[0].copyId}:{}),createdDay:S.day,version:1,active:true,
    stats:{impr:0,clicks:0,convR:0,spend:0}});g.previewAdId=id;
  if(kind==="expanded"){g.expandedBuilt=true;S.telemetry.expandedAds++;}
  else {g.variantCount++;g.lastVariantDay=S.day;S.telemetry.adVariants++;}
  return true;}
function rewriteClassicLead(g){if(!g||g.lastRewriteDay===S.day)return false;const deck=CLASSIC_COPY_DECKS[g.id]?.standard;if(!deck||deck.length<2)return false;
  const lead=g.ads[0],old=lead.copyId,oldCopy=classicCopy(old,g.id),index=1+(g.rewriteCount%(deck.length-1)),retired=classicPermutationCount(g);
  g.ads=g.ads.filter((ad,adIndex)=>adIndex===0||classicAdKind(ad)!=="permutation");lead.previousCopyId=old;lead.copyId=classicCopyId(g.id,"standard",index);
  const nextCopy=classicCopy(lead.copyId,g.id),expectedBefore=g.quality.expectedCtr,relevanceBefore=g.quality.adRelevance,
    expectedNext=classicClamp(expectedBefore+((nextCopy.ctrM||1)-(oldCopy.ctrM||1))*5,1,10,6),
    relevanceNext=classicClamp(relevanceBefore+((nextCopy.relM||1)-(oldCopy.relM||1))*5,1,10,6);
  lead.version=(lead.version||1)+1;lead.createdDay=S.day;lead.stats={impr:0,clicks:0,convR:0,spend:0};g.previewAdId=lead.id;
  g.rewriteCount++;g.lastRewriteDay=S.day;g.quality.expectedCtr=expectedNext;g.quality.adRelevance=relevanceNext;syncClassicQuality(g);
  return {old,next:lead.copyId,retired,ctrShift:expectedNext-expectedBefore,relevanceShift:relevanceNext-relevanceBefore};}

function renderClassic(){
  classicHydrate();
  updateFlavorChrome();
  const flavor=currentFlavor(),ft=flavor.terms;
  document.getElementById("accountSection").textContent=`Search account HUD${analogiesEnabled()?` · ${ft.account}`:""}`;
  document.getElementById("accountSectionNote").textContent="budget, reported conversions and client trust";
  document.getElementById("adSection").textContent=`Live ad groups${analogiesEnabled()?` · ${ft.group}`:""}`;
  document.getElementById("adSectionNote").textContent=`keywords, bids, match types and ads${analogiesEnabled()?` · ${ft.keyword}`:""}`;
  const elective=ACTIVE_PROFILE==="specialist"?" · general elective":"";
  document.getElementById("runSummary").textContent=`${profileRecord().badge} track${elective} · paid search / PPC · ${CLASSIC_DAYS}-day run`;
  document.getElementById("seedLbl").textContent=
    `${MODE_NAME[0]} · ${CSTAGE_NAME[S.stage]} · seed ${S.seedShown} · day ${Math.min(S.day,CLASSIC_DAYS)}/${CLASSIC_DAYS}`;
  const roas=S.spendTotal?S.reportedValueTotal/S.spendTotal:0;
  const modeledRoas=S.spendTotal?S.valueTotal/S.spendTotal:0;
  const cpa=S.convReported?S.spendTotal/S.convReported:0;
  const pace=S.convReported/Math.max(1,S.day-1)*30;
  const c=S.client;
  document.getElementById("strip").innerHTML=[
    ["Day",Math.min(S.day,CLASSIC_DAYS)+" / "+CLASSIC_DAYS,""],
    ["Daily budget",money(S.budget),S.delivery],
    ["Spend",money(S.spendTotal),""],
    ["Conversions",S.convReported.toFixed(1),"as reported"],
    ["Pace / mo",pace.toFixed(1),"goal "+(c.promised||c.baseline),
      pace>=(c.promised||c.baseline)?"pos":"neg"],
    ["CPA",S.convReported?money2(cpa):"—",""],
    ["Reported ROAS",roas.toFixed(2),"diagnostic benchmark 2.00",roas>=2?"pos":"amb"],
    ...(S.telemetry.trackingChecked?[["Modeled business ROAS",modeledRoas.toFixed(2),"diagnostic only · historical reports unchanged",modeledRoas>=2?"pos":"amb"]]:[]),
    ["Client trust",c.trust+"/100",c.trust>=50?"holding":"at risk",c.trust>=50?"pos":"neg"],
    ["Wasted clicks",Math.round(S.wasteTotal),"add negatives","amb"]
  ].map(([k,v,sub,cls])=>`<div class="stat"><div class="k">${k}</div>
      <div class="v ${cls||""}">${v}</div><div class="sub">${sub||"&nbsp;"}<br><span class="metaphor-inline">≈ ${statFlavorAlias(k)}</span></div></div>`).join("");

  document.getElementById("slots").innerHTML=S.groups.map((g,i)=>{
    const L=g.last,previewIndex=Math.max(0,g.ads.findIndex(ad=>ad.id===g.previewAdId)),preview=g.ads[previewIndex]||g.ads[0];
    const activeAdCount=classicActiveAds(g).length,permutationCount=classicPermutationCount(g);
    const sisBar=L?`SIS <b>${(L.sis*100).toFixed(0)}%</b> · lost to rank
      <b class="${L.lostRank>0.35?"neg":""}">${(L.lostRank*100).toFixed(0)}%</b> · lost to budget
      <b class="${L.lostBudget>0.25?"neg":""}">${(L.lostBudget*100).toFixed(0)}%</b>`:"";
    return `<article class="slot classic-slot ${g.paused?"dead":""}" aria-labelledby="classic-group-${g.id}">
      <header class="classic-identity"><div class="fam">🗂️ Ad group ${i+1} · ${g.split?"dedicated campaign":"Concrete Services campaign"}</div>
        <h3 id="classic-group-${g.id}">${g.name}</h3>
        <div class="metaphor-inline">Ad group ≈ ${ft.group} · Keyword ≈ ${ft.keyword} · Bid ≈ ${ft.bid}</div></header>
      <section class="classic-keyword" aria-label="Keyword controls">
        <div class="classic-band-title"><span>🔑 Keyword · ${g.match} match</span><span>negatives ${g.negatives}</span></div>
        <div class="classic-keyword-text" aria-label="${g.match} match keyword: ${escapeHtml(g.core)}">${g.match==="exact"?`[${escapeHtml(g.core)}]`:g.match==="phrase"?`&quot;${escapeHtml(g.core)}&quot;`:escapeHtml(g.core)}</div>
        <div class="spendline"><button class="btn" data-ca="bid-" data-i="${i}" ${g.maxCPC<=.25?"disabled":""} aria-label="Decrease maximum CPC">➖</button>
          <span class="amt">Max CPC ${money2(g.maxCPC)}</span>
          <button class="btn" data-ca="bid+" data-i="${i}" ${g.maxCPC>=8?"disabled":""} aria-label="Increase maximum CPC">➕</button></div>
        <button class="btn wide" data-ca="match" data-i="${i}">🎯 Match type · ${g.match} →</button>
      </section>
      <section class="classic-ad-workshop" aria-label="Search ad workshop">
        <div class="classic-band-title"><span>📣 Search ads · ${activeAdCount} active / ${g.ads.length} total</span><span>equal rotation · training model</span></div>
        <div class="classic-ad-tabs" role="group" aria-label="Preview search ad variant">${g.ads.map((ad,adIndex)=>`<button class="btn" data-ca="preview" data-i="${i}" data-ad-id="${ad.id}" aria-pressed="${ad.id===preview.id}">${classicAdLabel(g,ad,adIndex)}</button>`).join("")}</div>
        ${classicAdPreviewMarkup(g,preview,previewIndex,i)}
        <div class="classic-ad-help"><b>Replace</b> gives Ad A a new message and retires sibling permutations tied to its old copy. <b>A/B</b> adds a one-variable permutation of the current Ad A. <b>Expanded</b> adds the historical longer format. Active ads rotate evenly here so the comparison stays readable.</div>
        <div class="classic-action-label">Change the ad copy</div>
        <div class="row"><button class="btn wide" data-ca="rewrite" data-i="${i}" ${g.lastRewriteDay===S.day?"disabled":""}>✍️ ${g.lastRewriteDay===S.day?"Ad A replaced today":"Replace Ad A copy"}</button>
          <button class="btn wide" data-ca="variant" data-i="${i}" ${(g.ads.length>=4||permutationCount>=2||g.lastVariantDay===S.day)?"disabled":""}>🧪 ${permutationCount>=2?"Two permutations in test":g.lastVariantDay===S.day?"Permutation added today":"Add A/B permutation"}</button></div>
        <button class="btn wide" data-ca="expanded" data-i="${i}" ${(g.expandedBuilt||g.ads.length>=4)?"disabled":""}>📝 ${g.expandedBuilt?"Expanded Text Ad active":"Add Expanded Text Ad · longer copy"}</button>
      </section>
      ${classicQualityMarkup(g)}
      <details class="card-detail-block classic-delivery" ${L?'open':''}><summary>📊 ${L?`Day ${L.day} delivery evidence`:"No delivery yet · run a day"}</summary>
        <div class="card-detail-body"><div class="grid2">
          <span>Avg position</span><span>${L?L.avgPos.toFixed(1):"—"}</span><span>Avg CPC</span><span>${L?money2(L.cpc):"—"}</span>
          <span>CTR</span><span>${L?(L.ctr*100).toFixed(2)+"%":"—"}</span><span>Reported click CVR</span><span>${L?(L.postClickCvr*100).toFixed(2)+"%":"—"}</span>
          <span>Wasted clicks</span><span>${L?Math.round(L.wasted):"—"}</span><span>Reported ROAS</span><span class="${L&&L.roasReported>=2?"pos":"neg"}">${L?L.roasReported.toFixed(2):"—"}</span></div>
          <div class="funnel">${L?`${Math.round(L.impr)} impressions → <b>${Math.round(L.clicks)}</b> clicks → <b>${L.convR.toFixed(1)}</b> reported conversions · CPA <b>${L.cpa?money2(L.cpa):"—"}</b>${S.telemetry.trackingChecked&&Math.abs(L.roasModeled-L.roasReported)>.01?` · modeled ROAS ${L.roasModeled.toFixed(2)}`:""}<br>${sisBar}`:'Run a day to create delivery evidence.'}</div>
          <div class="fam">${g.note}</div></div></details>
      <details class="card-detail-block classic-structure"><summary>🛠️ Landing page, structure & status</summary><div class="card-detail-body">
        <div class="row"><button class="btn wide" data-ca="landing" data-i="${i}" ${g.landingPassDone?"disabled":""}>🌐 ${g.landingPassDone?"Landing-page pass complete":"Improve landing-page experience"}</button>
          <button class="btn wide" data-ca="split" data-i="${i}" ${g.split?"disabled":""}>🗂️ ${g.split?"Dedicated campaign active":`Move group → dedicated campaign${S.stage>=2?" & pacing":""}`}</button></div>
        ${g.split&&S.stage>=2?`<button class="btn wide" data-ca="campaign-delivery" data-i="${i}">⏱️ Dedicated campaign delivery · ${g.campaignDelivery}</button>`:""}
        <button class="btn wide" data-ca="pause" data-i="${i}">${g.paused?"▶️ Enable ad group":"⏸️ Pause ad group"}</button></div></details>
    </article>`;}).join("");
  document.getElementById("log").innerHTML=renderLog(S.log,
    '<div style="color:var(--ink-dim)">Set your bids and match types, then run a day.</div>');
  document.getElementById("binBtn").style.display="none";
  document.getElementById("asksRow").style.display="none";
  document.getElementById("accountBox").innerHTML=`<div class="eyebrow">What you are changing</div>
    <div class="eventcard"><div class="eventtitle">🧭 Account → campaign → ad group → keyword + search ads</div>
    <div class="eventbody">The ${money(S.budget)} number is an account-wide simulation cap; real Google Ads budgets normally sit at campaign level or in a shared campaign budget. Each card below is an ad group.
    <b>✍️ Replace</b> gives the lead ad differently worded copy. <b>🧪 A/B permutation</b> preserves its current core message and changes one declared axis. <b>📝 Expanded Text Ad</b> adds a longer historical-format variant. Active ads rotate evenly in this training model; pause or retire a sibling to optimize the test. <b>🗂️ Move group</b> creates a dedicated campaign and, from Stage 2 onward, independent delivery pacing—without pretending the ad itself improved.<br><br>
    <b>Quality Score is diagnostic:</b> expected CTR, ad relevance, and landing-page experience explain where quality may be weak. Bid does not raise the score. The trainer uses those underlying components in simplified period-styled auction physics; the displayed 1–10 number is not treated as a literal auction input.
    <span class="flavor-cue">${flavorCue("structure")} ${flavorCue("search")}</span></div></div>`;
  const pb=document.getElementById("pipeBox");
  if(pb) pb.innerHTML=`<div class="eyebrow">Search terms report · ${ft.negative}</div>
    <div class="note">See the exact queries that triggered your keywords, then exclude irrelevant intent. <span class="flavor-cue">${flavorCue("search")}</span></div>
    ${S.terms.length?S.terms.slice(0,4).map(t=>`<div class="fam">${t}</div>`).join(""):
      '<div class="fam" style="color:var(--ink-dim)">nothing flagged yet</div>'}
    <div class="row" style="margin-top:5px">
      <button class="btn wide" id="negBtn" ${S.terms.length?"":"disabled"}>Add negatives (${S.terms.length})</button>
    </div>
    <div class="row" style="margin-top:5px">
      ${S.stage>=2?`<button class="btn wide" id="delivBtn">Shared campaign delivery: ${S.delivery}</button>`:`<div class="note">Accelerated delivery unlocks in Stage 2. Stage 1 always uses standard pacing.</div>`}
      <button class="btn wide" id="trackBtn" ${S.telemetry.trackingChecked?"disabled":""}>Check tracking</button>
    </div>`;
  const nb=document.getElementById("negBtn");
  if(nb) nb.onclick=()=>{ const n=S.terms.length; S.groups.forEach(g=>{g.negatives+=n;});
    S.telemetry.negAdded+=n; S.terms=[];
    addLog(`<div><b>Negatives</b> — ${n} junk term(s) excluded across every ad group</div>`,"search");
    renderClassic(); };
  const db=document.getElementById("delivBtn");
  if(db)db.onclick=()=>{if(S.stage<2)return false;S.delivery=(S.delivery==="standard")?"accelerated":"standard";
    addLog(`<div><b>Shared campaign pacing</b> — unsplit ad groups now use ${S.delivery} delivery. Dedicated campaigns keep their own pacing.</div>`,"search");
    renderClassic();return true;};
  const tb=document.getElementById("trackBtn");
  if(tb) tb.onclick=()=>{ S.telemetry.trackingChecked=true;
    const broken=S.groups.filter(g=>g.trackingBroken);
    show(`<div class="eyebrow">Attribution check</div><h2>${broken.length?
      "The client's tracking is not set up properly":"Tracking looks correct"}</h2>
      <div class="prose"><p>${broken.length?
        `<b>${broken.map(g=>g.name).join(", ")}</b> is under-reporting conversions by about 65%. `+
        "Every decision made from its report used incomplete data. Future reporting is repaired; historical totals remain as originally reported."
        :"Every ad group is reporting what it actually produced."}</p></div>
      <div class="row"><button class="btn wide" id="closeB">${broken.length?"Repair tracking & return":"Back to the account"}</button></div>`,"measurement");
    document.getElementById("closeB").onclick=()=>{ broken.forEach(g=>{g.trackingBroken=false;});
      close(); renderClassic(); };
  };
  document.getElementById("runBtn").disabled=S.day>CLASSIC_DAYS;
  if(tooltipsEnabled()&&typeof wireLore==="function") wireLore();
}

function restoreClassicActionFocus(action,index,adId=""){
  if(typeof document.querySelector!=="function")return;
  const attr=`[data-i="${index}"]`,adAttr=adId?`[data-ad-id="${adId}"]`:"";
  let next=document.querySelector(`button[data-ca="${action}"]${attr}${adAttr}`),g=S.groups[index];
  if(!next||next.disabled){const previewId=g?.previewAdId||g?.ads?.[0]?.id;
    if(previewId)next=document.querySelector(`button[data-ca="preview"]${attr}[data-ad-id="${previewId}"]`);}
  if(next&&typeof next.focus==="function")next.focus();
}
document.getElementById("slots").addEventListener("click",e=>{
  const b=e.target.closest("button[data-ca]"); if(!b) return;
  classicHydrate();const action=b.dataset.ca,i=+b.dataset.i, g=S.groups[i], T=S.telemetry;if(!g)return;
  switch(action){
    case "bid+": case "bid-": {
      if((b.dataset.ca==="bid-"&&g.maxCPC<=.25)||(b.dataset.ca==="bid+"&&g.maxCPC>=8))break;
      const clicks=g.last?g.last.clicks:0;
      if(clicks>0 && clicks*Math.max(1,S.day-1)<30) T.thinBidMoves++;   // thin data
      g.maxCPC=Math.max(.25,Math.min(8,g.maxCPC+(b.dataset.ca==="bid+"?.35:-.35)));
      T.bidMoves++; break; }
    case "match": {
      const order=["exact","phrase","broad"];
      g.match=order[(order.indexOf(g.match)+1)%3]; break; }
    case "preview": if(g.ads.some(ad=>ad.id===b.dataset.adId))g.previewAdId=b.dataset.adId;break;
    case "rewrite": {const changed=rewriteClassicLead(g);if(!changed)break;T.adRewrites++;
      const oldCopy=classicCopy(changed.old,g.id),nextCopy=classicCopy(changed.next,g.id);
      addLog(`<div><b>Ad A replaced</b> in ${g.name} — “${escapeHtml(oldCopy.headlines.join(" | "))}” → “${escapeHtml(nextCopy.headlines.join(" | "))}”.${changed.retired?` ${changed.retired} old-copy A/B permutation${changed.retired===1?" was":"s were"} retired so the next test has an honest control.`:""} Simulated diagnostic response: expected CTR <b>${classicSigned(changed.ctrShift)}</b>, ad relevance <b>${classicSigned(changed.relevanceShift)}</b>. Landing-page experience, bid, keyword and campaign structure did not change.</div>`,"search");break;}
    case "variant": if(g.lastVariantDay===S.day||!addClassicVariant(g,"permutation"))break;
      {const ad=g.ads[g.ads.length-1],copy=classicAdCopy(g,ad),letter=String.fromCharCode(65+g.ads.indexOf(ad));addLog(`<div><b>A/B permutation added</b> in ${g.name} — Ad ${letter} starts from the current Ad A (“${escapeHtml(copy.headlines.join(" | "))}”) and changes only <b>${escapeHtml(copy.axis||"one copy axis")}</b>. It now rotates evenly and reports its own delivery evidence.</div>`,"search");}break;
    case "expanded": if(g.expandedBuilt||!addClassicVariant(g,"expanded"))break;
      {const ad=g.ads[g.ads.length-1],copy=classicAdCopy(g,ad);addLog(`<div><b>Expanded Text Ad added</b> in ${g.name} — “${escapeHtml(copy.headlines.join(" | "))}” adds the longer 2017-era copy format as a rotating test. Longer copy can qualify intent, but it does not guarantee a higher Quality Score or better performance.</div>`,"search");}break;
    case "ad-toggle": {const ad=g.ads.find((item,adIndex)=>adIndex>0&&item.id===b.dataset.adId);if(!ad)break;
      ad.active=ad.active===false;g.previewAdId=ad.id;
      addLog(`<div><b>Ad ${ad.active?"resumed":"paused"}</b> in ${g.name} — ${escapeHtml(classicAdCopy(g,ad).headlines.join(" | "))}. The ad group and its other ads remain active.</div>`,"search");break;}
    case "ad-retire": {const adIndex=g.ads.findIndex((item,index)=>index>0&&item.id===b.dataset.adId);if(adIndex<1)break;
      const [ad]=g.ads.splice(adIndex,1),copy=classicAdCopy(g,ad);g.previewAdId=g.ads[0].id;
      if(classicAdKind(ad)==="expanded")g.expandedBuilt=false;
      addLog(`<div><b>Ad retired</b> from ${g.name} — “${escapeHtml(copy.headlines.join(" | "))}” left the rotation. Final copy-level evidence: <b>${Math.round(ad.stats.impr)}</b> impressions · <b>${Math.round(ad.stats.clicks)}</b> clicks · <b>${ad.stats.convR.toFixed(1)}</b> reported conversions · <b>${money(ad.stats.spend)}</b> spend. This snapshot remains in the account log.</div>`,"search");break;}
    case "landing": if(g.landingPassDone)break;g.landingPassDone=true;g.landingM*=1.06;
      g.quality.landingExperience=Math.min(10,g.quality.landingExperience+1.5);syncClassicQuality(g);T.landingPasses++;
      addLog(`<div><b>Landing-page experience improved</b> for ${g.name} — destination relevance and post-click progression rose. Ad wording, keyword, match type and bid did not change.</div>`,"search");break;
    case "split": if(g.split)break;
      g.split=true;g.splitDay=S.day;g.campaignId=`dedicated-${g.id}`;g.campaignDelivery=S.delivery;T.splits++;
      addLog(`<div><b>Ad group moved</b> — ${g.name} now has a dedicated campaign${S.stage>=2?" and independent delivery pacing":""}. Its keyword, ads, bids, Quality Score components and accumulated evidence stayed the same; the account-wide simulation cap remains ${money(S.budget)}/day.</div>`,"structure");break;
    case "campaign-delivery": if(!g.split||S.stage<2)break;
      g.campaignDelivery=g.campaignDelivery==="standard"?"accelerated":"standard";
      addLog(`<div><b>Dedicated campaign pacing</b> — ${g.name} now uses ${g.campaignDelivery} delivery independently of the shared campaign.</div>`,"search");break;
    case "pause": g.paused=!g.paused; break;
  }
  renderClassic();
  const previewAfter=["rewrite","variant","expanded","ad-retire","split","landing"].includes(action),focusAction=previewAfter?"preview":action,
    focusAdId=focusAction==="preview"?g.previewAdId:(b.dataset.adId||"");
  restoreClassicActionFocus(focusAction,i,focusAdId);
});

/* ---------------- debrief: both scoreboards ---------------- */
function classicDebrief(){
  const T=S.telemetry, c=S.client;
  const roas=S.spendTotal?S.reportedValueTotal/S.spendTotal:0,modeledRoas=S.spendTotal?S.valueTotal/S.spendTotal:0;
  const monthlyGoal=c.promised||c.baseline, periodGoal=monthlyGoal*(CLASSIC_DAYS/30);
  const hitGoal=S.convReported>=periodGoal, keptClient=c.trust>=50;
  const v=[]; const add=(k,h,b)=>v.push(`<div class="verdict ${k}"><div class="h">${h}</div>${b}</div>`);
  add(hitGoal&&keptClient?"hit":"miss","Result",
    `${S.convReported.toFixed(1)} conversions against a ${CLASSIC_DAYS}-day goal of ${periodGoal.toFixed(1)} `+
    `(${monthlyGoal}/mo pace) · reported ROAS `+
    `<b class="${roas>=2?"pos":"neg"}">${roas.toFixed(2)}</b> · client trust `+
    `<b class="${keptClient?"pos":"neg"}">${c.trust}/100</b>.<br>`+
    `${Math.abs(modeledRoas-roas)>.01?`Modeled business ROAS was ${modeledRoas.toFixed(2)}; the gap is measurement, not extra value. `:""}`+
    (hitGoal&&keptClient?"You hit the number and still have the client. Both scoreboards."
     :hitGoal&&!keptClient?"<b>You hit the number and lost the client anyway.</b> That is the whole "+
       "point of this mode — the account is not the only thing you are managing."
     :!hitGoal&&keptClient?"You missed the number but kept their trust, which is a survivable month."
     :"You missed both."));
  if(T.overPromised && S.convReported<periodGoal)
    add("miss","You over-promised on the intake call",
      `You committed to ${monthlyGoal}/mo when the baseline was ${c.baseline}/mo. The call felt great and the `+
      "month did not. Your own rule: reiterate the baseline, suggest a small increase, then evaluate.");
  if(T.speculated)
    add("miss","You speculated in front of the client",
      "Never simply assume things about what will make an account run better or worse, "+
      "especially not openly in front of a client. Let the data speak.");
  if(!c.grievanceHandled)
    add("watch","You never addressed their history with the last agency",
      `"${c.grievance}" sat there all month. Latch onto the client's concerns or they linger.`);
  if(!c.amNoted)
    add("watch","The Account Manager was never briefed",
      "Anything worked out on a call and later done differently on the build has to reach the AM, "+
      "or the client hears two stories.");
  if(T.negAdded===0)
    add("miss","You never added a negative keyword",
      `${Math.round(S.wasteTotal)} clicks went to queries that were never going to convert. The `+
      "search-terms report is the cheapest win in search, and it was sitting right there.");
  else add("hit",`You excluded ${T.negAdded} junk term(s)`,
      "Working the search-terms report is the core daily habit of the job.");
  const diy=S.groups.find(group=>group.id==="diy")||S.groups[3];
  if(!diy.paused && diy.last && diy.last.spend>0)
    add("miss","You funded the DIY ad group all month",
      "“How to pour a concrete slab” has the best click-through rate in the account and converts at "+
      "a quarter of a percent, because those searchers intend to do it themselves. Read the intent "+
      "before you read the CTR.");
  else add("hit","You saw through the DIY traffic",
      "Great CTR, no intent to hire. That is the trap this account is built around.");
  const misread=S.groups.filter(g=>g.last&&g.last.lostRank>0.4&&g.maxCPC<=2.5).length;
  if(misread) add("watch",`${misread} ad group(s) ended with heavy impression share lost to rank`,
      "Lost to rank is a bid or Quality Score problem. Lost to budget is a budget problem. They look "+
      "identical on the surface and the fixes are opposite — and SIS is still only secondary data.");
  if(T.thinBidMoves>=4)
    add("miss",`You changed bids ${T.thinBidMoves} time(s) on thin click data`,
      "Under about 30 clicks you are reading noise. Widen the timescale before you touch a bid.");
  if(T.acceleratedDays>=8)
    add("watch",`Accelerated delivery ran for ${T.acceleratedDays} day(s)`,
      "It hits traffic harder earlier, which spends faster and catches worse traffic later.");
  if(S.stage>=2 && !T.trackingChecked)
    add("miss","You never checked whether the tracking worked",
      "One ad group under-reported conversions by 65% all month, so you optimised against numbers "+
      "that were not true. “Is my client's website even set up for proper attribution?”");
  show(`<div class="eyebrow">Debrief · ${CSTAGE_NAME[S.stage]} · day ${CLASSIC_DAYS}</div>
    <h2>Two scoreboards</h2>
    <div class="prose" style="margin-bottom:8px"><p>This period-styled search simulation keeps reported performance and client trust as separate scoreboards. ${lessonLink("09")}</p></div>
    ${v.join("")}
    <div class="row" style="margin-top:12px">
      <button class="btn wide" id="again">Replay this stage</button>
      ${S.stage<3?`<button class="btn wide" id="next">Stage ${S.stage+1} →</button>`:""}
      <button class="btn wide" id="debriefMenu">Main menu</button>
    </div>`,"client");
  pendingDayFx=[];
  fireFx(hitGoal&&keptClient?"success":"fail",hitGoal&&keptClient
    ?{kicker:"Client and account retained",value:"BOTH CLEARED",sub:`${S.convReported.toFixed(1)} conversions · trust ${c.trust}/100`}
    :{kicker:hitGoal?"Client outcome failed":"Performance objective missed",value:keptClient?"GOAL MISSED":"CLIENT LOST",sub:`${S.convReported.toFixed(1)} conversions · trust ${c.trust}/100`});
  document.getElementById("again").onclick=()=>{clearFx();resetRng();freshClassic();close();renderClassic();};
  document.getElementById("debriefMenu").onclick=mainMenu;
  const nx=document.getElementById("next");
  if(nx) nx.onclick=()=>{const p=new URLSearchParams(location.search);
    p.set("mode","0");p.set("stage",String(S.stage+1));p.set("seed",SEED);p.set("flavor",ACTIVE_FLAVOR);location.search=p.toString();};
}
