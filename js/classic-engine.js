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
      Object.freeze({headlines:["Plan Your Concrete Project"],descriptions:["Talk through site requirements with a commercial concrete project specialist."],path:"project-planning",ctrM:.99,relM:1.12,cvrM:1.10}),
      Object.freeze({headlines:["Concrete Scope Before Mobilizing"],descriptions:["Clarify access, phasing and finish requirements before crews arrive."],path:"scope-review",ctrM:.97,relM:1.15,cvrM:1.14}),
      Object.freeze({headlines:["Bid A Commercial Concrete Job"],descriptions:["Send plans and schedule constraints for a structured project estimate."],path:"plan-estimate",ctrM:1.01,relM:1.13,cvrM:1.13}),
      Object.freeze({headlines:["Slabs, Foundations And Sitework"],descriptions:["One project conversation for concrete scope, sequencing and estimate details."],path:"commercial-scope",ctrM:1.05,relM:1.09,cvrM:1.07}),
      Object.freeze({headlines:["Concrete Crews For Planned Work"],descriptions:["For scheduled commercial projects—not quick patch or DIY requests."],path:"planned-projects",ctrM:.93,relM:1.18,cvrM:1.20})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Project-ready concrete crews.","Book a site walk today."],path:"commercial",axis:"CTA",ctrM:1.08,cvrM:.99}),
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Licensed project crews.","Request a site estimate."],path:"commercial",axis:"Proof",ctrM:1.02,cvrM:1.06}),
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Project-ready concrete crews.","Send plans for review."],path:"commercial",axis:"Plan-submission CTA",ctrM:.98,cvrM:1.10}),
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Crews for scheduled projects.","Request a site estimate."],path:"commercial",axis:"Schedule qualifier",ctrM:.95,cvrM:1.14}),
      Object.freeze({headlines:["Commercial Concrete"],descriptions:["Scope, phasing and estimate help.","Request a site estimate."],path:"commercial",axis:"Scope specificity",ctrM:1.01,cvrM:1.08})]),
    expanded:Object.freeze([
      Object.freeze({headlines:["Commercial Concrete Crews","Request A Project Estimate"],descriptions:["Plan slabs, foundations and site work with a project-ready local concrete team."],path:"commercial/estimate",axis:"Longer qualification copy",ctrM:.98,cvrM:1.12}),
      Object.freeze({headlines:["Concrete Project Planning","Send Plans For Scope Review"],descriptions:["Coordinate access, phasing and concrete scope before requesting an estimate."],path:"commercial/plans",axis:"Plan-led qualification copy",ctrM:.96,cvrM:1.17})])}),
  local:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local concrete project help.","Request an estimate."],path:"near-you",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Find A Local Concrete Crew"],descriptions:["Share the project and connect with a nearby concrete team."],path:"local-crew",ctrM:1.07,relM:1.04,cvrM:1.02}),
      Object.freeze({headlines:["Local Concrete Project Help"],descriptions:["Compare scope, timing and an estimate before work begins."],path:"local-estimate",ctrM:1.03,relM:1.09,cvrM:1.08}),
      Object.freeze({headlines:["Nearby Concrete Specialists"],descriptions:["Get practical next steps for patios, slabs and other concrete work."],path:"nearby-projects",ctrM:1.01,relM:1.10,cvrM:1.09}),
      Object.freeze({headlines:["Check Concrete Crew Availability"],descriptions:["Share location, project type and timing to check local crew availability."],path:"crew-availability",ctrM:1.06,relM:1.08,cvrM:1.07}),
      Object.freeze({headlines:["A Local Estimate Starts Here"],descriptions:["Describe the planned concrete work and request a nearby project estimate."],path:"estimate-start",ctrM:1.04,relM:1.12,cvrM:1.11}),
      Object.freeze({headlines:["Concrete Help In Your Area"],descriptions:["Connect with a team for scoped residential or light-commercial work."],path:"area-projects",ctrM:1.00,relM:1.13,cvrM:1.13}),
      Object.freeze({headlines:["Planning Concrete Work Nearby?"],descriptions:["Check fit, location and timing before an estimate is scheduled."],path:"nearby-planning",ctrM:.98,relM:1.16,cvrM:1.16})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local concrete project help.","Check nearby availability."],path:"near-you",axis:"Local CTA",ctrM:1.09,cvrM:.98}),
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local crews for planned projects.","Request an estimate."],path:"near-you",axis:"Qualification",ctrM:.98,cvrM:1.09}),
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local concrete project help.","Share your ZIP and project."],path:"near-you",axis:"Location-detail CTA",ctrM:1.05,cvrM:1.05}),
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Patio, slab and sitework help.","Request an estimate."],path:"near-you",axis:"Project examples",ctrM:1.04,cvrM:1.04}),
      Object.freeze({headlines:["Concrete Contractors Near You"],descriptions:["Local scheduling starts with scope.","Request an estimate."],path:"near-you",axis:"Scheduling frame",ctrM:.99,cvrM:1.10})]),
    expanded:Object.freeze([
      Object.freeze({headlines:["Local Concrete Contractors","Check Project Availability"],descriptions:["Share project details and location to request a local concrete estimate."],path:"local/request",axis:"Longer local-intent copy",ctrM:1.01,cvrM:1.10}),
      Object.freeze({headlines:["Concrete Crews Near You","Describe Your Planned Project"],descriptions:["Send location, scope and preferred timing to check fit with a nearby crew."],path:"local/project-fit",axis:"Longer project-fit copy",ctrM:.99,cvrM:1.14})])}),
  patio:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Explore patio cost factors.","Plan your project."],path:"patio-cost",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Estimate A Concrete Patio"],descriptions:["Compare size, finish and site factors before requesting a quote."],path:"patio-estimate",ctrM:1.08,relM:1.00,cvrM:.99}),
      Object.freeze({headlines:["Plan Your New Concrete Patio"],descriptions:["See which project details shape price, then request a tailored estimate."],path:"patio-planning",ctrM:1.03,relM:1.08,cvrM:1.10}),
      Object.freeze({headlines:["Patio Pricing Starts Here"],descriptions:["Turn early price research into a scoped concrete patio plan."],path:"patio-pricing",ctrM:1.06,relM:1.05,cvrM:1.04}),
      Object.freeze({headlines:["What Changes Concrete Patio Cost"],descriptions:["Review access, square footage, finish and site preparation before estimating."],path:"cost-factors",ctrM:1.09,relM:1.04,cvrM:1.03}),
      Object.freeze({headlines:["From Patio Budget To Project Plan"],descriptions:["Use a cost range to define scope, then request a project-specific estimate."],path:"budget-to-plan",ctrM:1.01,relM:1.13,cvrM:1.15}),
      Object.freeze({headlines:["Price A Planned Concrete Patio"],descriptions:["For homeowners with a location, size range and intended finish in mind."],path:"planned-patio",ctrM:.97,relM:1.16,cvrM:1.19}),
      Object.freeze({headlines:["Concrete Patio Estimate Checklist"],descriptions:["Gather the details a crew needs before comparing a tailored estimate."],path:"estimate-checklist",ctrM:1.02,relM:1.12,cvrM:1.12})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Explore patio cost factors.","Compare project options."],path:"patio-cost",axis:"Comparison CTA",ctrM:1.10,cvrM:.96}),
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Price depends on size and finish.","Plan your project."],path:"patio-cost",axis:"Specificity",ctrM:1.03,cvrM:1.07}),
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Explore patio cost factors.","Build an estimate checklist."],path:"patio-cost",axis:"Planning CTA",ctrM:1.04,cvrM:1.06}),
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["Include access and site preparation.","Plan your project."],path:"patio-cost",axis:"Site-prep detail",ctrM:.99,cvrM:1.11}),
      Object.freeze({headlines:["Concrete Patio Cost Guide"],descriptions:["For a patio you plan to build soon.","Plan your project."],path:"patio-cost",axis:"Timing qualifier",ctrM:.95,cvrM:1.16})]),
    expanded:Object.freeze([
      Object.freeze({headlines:["Concrete Patio Cost Guide","Plan Size, Finish And Site"],descriptions:["Review the details that shape patio pricing, then request a project estimate."],path:"patio/cost-guide",axis:"Longer research copy",ctrM:1.07,cvrM:1.05}),
      Object.freeze({headlines:["Plan A Concrete Patio","Turn Research Into A Scope"],descriptions:["Compare cost factors, gather project details and request a tailored estimate."],path:"patio/project-scope",axis:"Longer planning-transition copy",ctrM:1.01,cvrM:1.14})])}),
  diy:Object.freeze({
    standard:Object.freeze([
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Read the basic project steps.","Plan tools and materials."],path:"slab-guide",ctrM:1,cvrM:1}),
      Object.freeze({headlines:["Planning A Concrete Slab?"],descriptions:["Review the project, then decide whether to build it or request professional help."],path:"slab-planning",ctrM:.86,relM:.88,cvrM:1.30}),
      Object.freeze({headlines:["Concrete Slab Project Guide"],descriptions:["Understand scope, site prep and when a contractor may be the safer choice."],path:"slab-project",ctrM:.84,relM:.82,cvrM:1.38}),
      Object.freeze({headlines:["Before You Pour A Slab"],descriptions:["Check project complexity and compare a professional estimate before starting."],path:"before-you-pour",ctrM:.82,relM:.76,cvrM:1.45}),
      Object.freeze({headlines:["DIY Slab Or Contractor Project?"],descriptions:["Compare access, reinforcement and finish risk before choosing a path."],path:"diy-or-pro",ctrM:.78,relM:.73,cvrM:1.58}),
      Object.freeze({headlines:["Large Concrete Slab Planning"],descriptions:["Review preparation and equipment needs, then compare professional help."],path:"large-slab",ctrM:.77,relM:.70,cvrM:1.62}),
      Object.freeze({headlines:["Concrete Slab Scope Check"],descriptions:["Use project size and site conditions to decide whether DIY still fits."],path:"scope-check",ctrM:.80,relM:.75,cvrM:1.52}),
      Object.freeze({headlines:["Get Help Before The Concrete Sets"],descriptions:["For complex pours, compare crew support before materials are ordered."],path:"pour-support",ctrM:.74,relM:.68,cvrM:1.70})]),
    permutation:Object.freeze([
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Read the basic project steps.","Or compare professional help."],path:"slab-guide",axis:"Qualified CTA",ctrM:.79,cvrM:1.55}),
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["For simple DIY planning.","Large slabs may need a crew."],path:"slab-guide",axis:"Audience qualifier",ctrM:.76,cvrM:1.65}),
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Read the basic project steps.","Check whether equipment is enough."],path:"slab-guide",axis:"Equipment-risk CTA",ctrM:.81,cvrM:1.48}),
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Complex sites raise pour risk.","Plan tools and materials."],path:"slab-guide",axis:"Site-risk qualifier",ctrM:.75,cvrM:1.68}),
      Object.freeze({headlines:["Pour A Concrete Slab"],descriptions:["Read the basic project steps.","Compare a crew before ordering."],path:"slab-guide",axis:"Pre-order CTA",ctrM:.77,cvrM:1.64})]),
    expanded:Object.freeze([
      Object.freeze({headlines:["Concrete Slab Project Guide","DIY Steps Or Professional Help"],descriptions:["Review prep, tools and complexity, then compare professional help if needed."],path:"slab/project-guide",axis:"Longer qualification copy",ctrM:.80,cvrM:1.60}),
      Object.freeze({headlines:["Planning A Concrete Slab","Check Scope Before You Pour"],descriptions:["Compare site prep, equipment and project risk before choosing DIY or a crew."],path:"slab/scope-check",axis:"Longer risk-qualification copy",ctrM:.76,cvrM:1.69})])})
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

const CLASSIC_TRUST_PARTS=Object.freeze(["results","judgment","transparency","responsiveness","alignment"]);
const CLASSIC_COMMITMENTS=Object.freeze({
  negatives:"Review search terms and add supported negative themes",
  tracking:"Check and document the conversion path",
  rewrite:"Run the declared controlled copy test",
  reporting:"Deliver the next evidence-based account read"
});
function classicClientProfile(id=S?.client?.profileId){return CLASSIC_CLIENT_PROFILES.find(profile=>profile.id===id)||CLASSIC_CLIENT_PROFILES[0];}
function classicClientBusiness(id=S?.client?.businessId){return CLASSIC_CLIENT_BUSINESSES.find(business=>business.id===id)||CLASSIC_CLIENT_BUSINESSES[0];}
function classicClientBusinessForSeed(seed=SEED){return CLASSIC_CLIENT_BUSINESSES[Math.floor(keyedRandom(seed,"classic-client-business")*CLASSIC_CLIENT_BUSINESSES.length)];}
function classicClientProfileForSeed(seed=SEED,business=classicClientBusinessForSeed(seed)){
  const weights=CLASSIC_CLIENT_PROFILES.map(profile=>Math.max(0,Number(business.weights?.[profile.id])||0)),total=weights.reduce((sum,n)=>sum+n,0);
  if(total<=0)return CLASSIC_CLIENT_PROFILES[Math.floor(keyedRandom(seed,"classic-client-profile")*CLASSIC_CLIENT_PROFILES.length)];
  let cursor=keyedRandom(seed,"classic-client-profile",business.id)*total;
  for(let i=0;i<CLASSIC_CLIENT_PROFILES.length;i++){cursor-=weights[i];if(cursor<0)return CLASSIC_CLIENT_PROFILES[i];}
  return CLASSIC_CLIENT_PROFILES[CLASSIC_CLIENT_PROFILES.length-1];
}
function classicClientWeightedTrust(client,profile=classicClientProfile(client?.profileId)){
  const parts=client?.trustParts||{},total=CLASSIC_TRUST_PARTS.reduce((sum,key)=>sum+(Number(parts[key])||0)*(profile.weights[key]||0),0);
  return classicClamp(total,0,100,profile.initialTrust);
}
function syncClassicClientTrust(client=S.client){if(!client)return 0;client.trust=Math.round(classicClientWeightedTrust(client)*10)/10;return client.trust;}
function classicClientInsightLevel(points=S.client?.insight?.points||0){return points>=10?3:points>=6?2:points>=2?1:0;}
function classicClientObservationText(observation,profile=classicClientProfile()){
  if(!observation||typeof observation!=="object")return "";
  if(observation.type==="cue"&&Number.isInteger(observation.index))return profile.cues[observation.index]||"";
  if(observation.type==="commitment"&&CLASSIC_COMMITMENTS[observation.kind])return `${observation.met?"Follow-through confirmed":"Follow-through missed"}: ${CLASSIC_COMMITMENTS[observation.kind]}.`;
  return "";
}
function classicClientRead(client=S.client){const profile=classicClientProfile(client?.profileId),level=classicClientInsightLevel(client?.insight?.points||0),count=client?.insight?.observations?.length||0;
  if(level===0)return {level,label:"Sector prior",copy:"No individual working read yet. Treat the business hint as a question, not an answer."};
  if(level===1)return {level,label:"Observed pattern",copy:`${count} behavior signal${count===1?"":"s"} recorded. The evidence is still too thin to name a stable preference.`};
  if(level===2)return {level,label:"Working hypothesis",copy:`Likely priority: ${profile.primaryNeed}. Confidence is provisional; later reactions can strengthen or complicate the read.`};
  return {level,label:"Working agreement",copy:`Current read: ${profile.label.toLowerCase()} · prioritizes ${profile.primaryNeed}, with ${profile.secondaryNeed} as a secondary need.`};
}
function freshClassicClient(){const business=classicClientBusinessForSeed(),profile=classicClientProfileForSeed(SEED,business),trustParts=Object.fromEntries(CLASSIC_TRUST_PARTS.map(key=>[key,profile.initialTrust]));
  const client={businessId:business.id,profileId:profile.id,trust:profile.initialTrust,trustParts,baseline:business.baseline,promised:null,
    grievance:"the last agency never explained what they were doing",grievanceHandled:false,amNoted:false,calls:0,budgetCut:false,
    tension:18,lastEncounterDay:0,encounterSeq:0,pendingEncounter:null,encounterHistory:[],commitments:[],agreements:[],
    insight:{points:0,observations:[]},lastPromisePenaltyDay:0};syncClassicClientTrust(client);return client;}
function classicClientValidObservation(item,profile){return !!(item&&typeof item==="object"&&(
  item.type==="cue"&&Number.isInteger(item.index)&&item.index>=0&&item.index<profile.cues.length||
  item.type==="commitment"&&Object.hasOwn(CLASSIC_COMMITMENTS,item.kind)&&typeof item.met==="boolean"));}
function classicClientValidHistory(item){const event=CLASSIC_CLIENT_EVENTS[item?.eventId];return !!(event&&event.options.some(option=>option.id===item.optionId));}
function classicHydrateClient(){const legacy=S.client&&typeof S.client==="object"?S.client:{},business=CLASSIC_CLIENT_BUSINESSES.some(item=>item.id===legacy.businessId)
    ?classicClientBusiness(legacy.businessId):classicClientBusinessForSeed(),profile=CLASSIC_CLIENT_PROFILES.some(item=>item.id===legacy.profileId)
    ?classicClientProfile(legacy.profileId):classicClientProfileForSeed(SEED,business),legacyTrust=classicClamp(legacy.trust,0,100,profile.initialTrust),
    rawParts=legacy.trustParts&&typeof legacy.trustParts==="object"?legacy.trustParts:{};
  const client={businessId:business.id,profileId:profile.id,trustParts:Object.fromEntries(CLASSIC_TRUST_PARTS.map(key=>[key,classicClamp(rawParts[key],0,100,legacyTrust)])),
    baseline:classicClamp(legacy.baseline,1,10000,business.baseline),promised:Number.isFinite(legacy.promised)?classicClamp(legacy.promised,1,10000,business.baseline):null,
    grievance:typeof legacy.grievance==="string"&&legacy.grievance.length<240?legacy.grievance:"the last agency never explained what they were doing",
    grievanceHandled:!!legacy.grievanceHandled,amNoted:!!legacy.amNoted,calls:Math.max(0,Math.floor(Number(legacy.calls)||0)),budgetCut:!!legacy.budgetCut,
    tension:classicClamp(legacy.tension,0,100,18),lastEncounterDay:Math.max(0,Math.floor(Number(legacy.lastEncounterDay)||0)),
    encounterSeq:Math.max(0,Math.floor(Number(legacy.encounterSeq)||0)),lastPromisePenaltyDay:Math.max(0,Math.floor(Number(legacy.lastPromisePenaltyDay)||0)),
    encounterHistory:Array.isArray(legacy.encounterHistory)?legacy.encounterHistory.filter(classicClientValidHistory).slice(-24):[],
    commitments:Array.isArray(legacy.commitments)?legacy.commitments.filter(item=>item&&Object.hasOwn(CLASSIC_COMMITMENTS,item.kind)&&Number.isFinite(item.dueDay)).slice(-8).map(item=>({
      kind:item.kind,dueDay:Math.max(1,Math.min(CLASSIC_DAYS,Math.floor(item.dueDay))),start:classicClamp(item.start,0,1e9,0),evaluated:!!item.evaluated,met:!!item.met})) :[],
    agreements:Array.isArray(legacy.agreements)?[...new Set(legacy.agreements.filter(id=>Object.hasOwn(CLASSIC_CLIENT_STANCES,id)))].slice(-4):[]};
  const observations=legacy.insight&&Array.isArray(legacy.insight.observations)?legacy.insight.observations.filter(item=>classicClientValidObservation(item,profile)).filter((item,index,array)=>
    array.findIndex(other=>other.type===item.type&&(item.type==="cue"?other.index===item.index:other.kind===item.kind&&other.met===item.met))===index):[];
  client.insight={points:classicClamp(legacy.insight?.points,0,Math.min(12,observations.length*3),0),observations:observations.slice(-8)};
  const pending=legacy.pendingEncounter,event=CLASSIC_CLIENT_EVENTS[pending?.eventId],optionIds=event?.options.map(option=>option.id)||[],validPending=pending&&event&&
    ["choice","feedback"].includes(pending.phase)&&Number.isFinite(pending.day)&&Array.isArray(pending.optionIds)&&pending.optionIds.every(id=>optionIds.includes(id))&&
    (pending.phase==="choice"||optionIds.includes(pending.choiceId));
  client.pendingEncounter=validPending?{id:`CE-${client.encounterSeq}`,day:Math.max(1,Math.min(CLASSIC_DAYS,Math.floor(pending.day))),eventId:pending.eventId,
    phase:pending.phase,terminal:!!pending.terminal,optionIds:optionIds.slice(),choiceId:pending.phase==="feedback"?pending.choiceId:null,
    cueIndex:Math.max(0,Math.min(profile.cues.length-1,Math.floor(Number(pending.cueIndex)||0))),
    snapshot:classicSafeClientSnapshot(pending.snapshot),result:pending.phase==="feedback"?classicSafeClientResult(pending.result):null}:null;
  S.client=client;syncClassicClientTrust(client);return client;}
function classicSafeClientSnapshot(snapshot={}){const source=snapshot&&typeof snapshot==="object"?snapshot:{};return {pace:classicClamp(source.pace,0,100000,0),baseline:classicClamp(source.baseline,1,100000,100),
  goal:classicClamp(source.goal,1,100000,100),reportedRoas:classicClamp(source.reportedRoas,0,1000,0),waste:classicClamp(source.waste,0,1e9,0),
  signal:["search intent","tracking integrity","auction rank","controlled testing","account pace"].includes(source.signal)?source.signal:"account pace"};}
function classicSafeClientResult(result={}){const source=result&&typeof result==="object"?result:{},deltas={};for(const key of CLASSIC_TRUST_PARTS)deltas[key]=classicClamp(source.deltas?.[key],-30,30,0);
  return {trustBefore:classicClamp(source.trustBefore,0,100,0),trustAfter:classicClamp(source.trustAfter,0,100,0),
    tensionBefore:classicClamp(source.tensionBefore,0,100,0),tensionAfter:classicClamp(source.tensionAfter,0,100,0),deltas,
    insightBefore:classicClamp(source.insightBefore,0,12,0),insightAfter:classicClamp(source.insightAfter,0,12,0),
    observation:classicClientValidObservation(source.observation,classicClientProfile())?source.observation:null,budgetCut:!!source.budgetCut,
    commitment:Object.hasOwn(CLASSIC_COMMITMENTS,source.commitment)?source.commitment:null,fit:classicClamp(source.fit,-3,3,0)};}
function classicHydrate(){if(!S||!S.classic)return false;
  S.classicModelVersion=3;S.classicContentVersion=1;S.stage=CLASSIC_STAGE;S.day=Math.max(1,Math.min(CLASSIC_DAYS+1,Math.floor(Number(S.day)||1)));
  S.budget=classicClamp(S.budget,1,CLASSIC_BUDGET,CLASSIC_BUDGET);S.compBid=classicClamp(S.compBid,.5,3,1);
  S.delivery=["standard","accelerated"].includes(S.delivery)?S.delivery:"standard";S.telemetry=S.telemetry||{};
  for(const key of ["adVariants","expandedAds","landingPasses","clientEncounters","clientReports","clientInsightEarned","commitmentsMet","commitmentsMissed","budgetCuts"])
    if(!Number.isFinite(S.telemetry[key]))S.telemetry[key]=0;
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
    g.variantCount=Math.max(0,Number.isInteger(g.variantCount)?g.variantCount:0);g.expandedCount=Math.max(0,Number.isInteger(g.expandedCount)?g.expandedCount:0);
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
    g.expandedCount=Math.max(g.expandedCount,g.expandedBuilt?1:0);
    if(g.last&&typeof g.last==="object"){
      g.last.day=Math.max(1,Number.isFinite(g.last.day)?g.last.day:S.day-1);
      g.last.delivery=["standard","accelerated"].includes(g.last.delivery)?g.last.delivery:classicGroupDelivery(g);
      if(Array.isArray(g.last.adBreakdown))g.last.adBreakdown.forEach(row=>{if(typeof row.adKey==="string")return;
        const ad=g.ads.find(item=>item.id===row.adId&&item.copyId===row.copyId);if(ad)row.adKey=classicAdEvidenceKey(ad);});
    }
    syncClassicQuality(g);
  });classicHydrateClient();return true;}

function freshClassic(){
  RUN_DIRTY=false;
  S={ classic:true,classicModelVersion:3,classicContentVersion:1, stage:CLASSIC_STAGE, day:1, seedShown:SEED,
      budget:CLASSIC_BUDGET, delivery:"standard",
      spendTotal:0, convReported:0, convActual:0, valueTotal:0, reportedValueTotal:0, clicksTotal:0, wasteTotal:0,
      knowledgeCredits:0,log:[], queue:shuffle(RECALL.slice()), asks:1,
      groups:AD_GROUPS.map((g,i)=>({...g, campaignId:"concrete-services",campaignDelivery:"standard",match:(i===3?"broad":"phrase"), maxCPC:2.50, qs:6,
        quality:{expectedCtr:6,adRelevance:6,landingExperience:6},landingM:1,
        negatives:0, paused:false, split:false, splitDay:0,last:null,lastRewriteDay:0,lastVariantDay:0,landingPassDone:false,
        ads:[freshClassicAd(g)],previewAdId:`${g.id}-ad-1`,nextAdId:2,rewriteCount:0,variantCount:0,expandedCount:0,expandedBuilt:false,
        trackingBroken:(CLASSIC_STAGE>=2 && i===1)})),
      terms:[], compBid:1.0,
      client:null,
      telemetry:{negAdded:0, bidMoves:0, thinBidMoves:0, adRewrites:0,adVariants:0,expandedAds:0,landingPasses:0,splits:0, trackingChecked:false,
                 overPromised:false, speculated:false, sisMisread:0, acceleratedDays:0,recallRight:0,recallWrong:0,
                 clientEncounters:0,clientReports:0,clientInsightEarned:0,commitmentsMet:0,commitmentsMissed:0,budgetCuts:0} };
  S.client=freshClassicClient();
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
  if(!S)return false;classicHydrate();
  if(S.client.pendingEncounter){renderClassicClientEncounter();return false;}
  if(S.day>CLASSIC_DAYS)return false;
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
  S.day++;
  const ended=S.day>CLASSIC_DAYS;
  if(classicShouldTriggerClientEncounter(ended)){
    renderClassic();classicBeginClientEncounter({terminal:ended});flushDayFx();return true;
  }
  if(ended){if(typeof autoCheckpoint==="function")autoCheckpoint();pendingDayFx=[];renderClassic();classicDebrief();return true;}
  if(typeof autoCheckpoint==="function")autoCheckpoint();
  if(S.day%5===0 && S.queue.length) recall();
  renderClassic();flushDayFx();return true;
}

/* ---------------- the client: a relationship system with evidence and memory -------------- */
function classicAdjustClientTrust(deltas={}){const c=S.client;
  for(const key of CLASSIC_TRUST_PARTS)c.trustParts[key]=classicClamp(c.trustParts[key]+(Number(deltas[key])||0),0,100,c.trustParts[key]);
  return syncClassicClientTrust(c);
}
function classicClientMetric(kind){const T=S.telemetry;
  if(kind==="negatives")return Number(T.negAdded)||0;
  if(kind==="tracking")return T.trackingChecked?1:0;
  if(kind==="rewrite")return Number(T.adRewrites)||0;
  return Number(T.clientReports)||0;
}
function classicSettleClientCommitments(day=S.day-1,force=false){const c=S.client,T=S.telemetry;let settled=0;
  for(const item of c.commitments){if(item.evaluated||(!force&&item.dueDay>day))continue;
    item.evaluated=true;item.met=classicClientMetric(item.kind)>item.start;settled++;
    const deltas=item.met?{judgment:.7,transparency:1,responsiveness:1.5,alignment:.5}:{judgment:-2,transparency:-2,responsiveness:-3,alignment:-1};
    classicAdjustClientTrust(deltas);c.tension=classicClamp(c.tension+(item.met?-3:8),0,100,c.tension);
    if(!c.insight.observations.some(obs=>obs.type==="commitment"&&obs.kind===item.kind&&obs.met===item.met))
      c.insight.observations.push({type:"commitment",kind:item.kind,met:item.met});
    if(item.met)T.commitmentsMet++;else T.commitmentsMissed++;
    addLog(`<div><b class="${item.met?"pos":"neg"}">${item.met?"Commitment kept":"Commitment missed"}</b> — ${CLASSIC_COMMITMENTS[item.kind]}. Relationship trust now ${c.trust.toFixed(1)}/100.</div>`,"client");
  }
  c.insight.observations=c.insight.observations.slice(-8);return settled;
}
function classicClientSnapshot(){const c=S.client,elapsed=Math.max(1,S.day-1),pace=S.convReported/elapsed*30,
    goal=c.promised||c.baseline,reportedRoas=S.spendTotal?S.reportedValueTotal/S.spendTotal:0;
  let signal="account pace";
  if(S.stage>=2&&S.groups.some(g=>g.trackingBroken)&&!S.telemetry.trackingChecked)signal="tracking integrity";
  else if(S.telemetry.negAdded===0&&S.wasteTotal>35)signal="search intent";
  else if(S.stage>=3&&S.groups.some(g=>g.last&&g.last.lostRank>.35))signal="auction rank";
  else if(S.telemetry.adRewrites||S.telemetry.adVariants)signal="controlled testing";
  return classicSafeClientSnapshot({pace,baseline:c.baseline,goal,reportedRoas,waste:S.wasteTotal,signal});
}
function classicClientEventForSnapshot(snapshot=classicClientSnapshot(),terminal=false){const c=S.client,T=S.telemetry,last=c.encounterHistory[c.encounterHistory.length-1]?.eventId;
  if(terminal)return "final";
  if(c.calls===0&&c.promised===null)return "intake";
  if(c.promised!==null&&snapshot.pace<c.promised*.85&&(S.day-1)-c.lastPromisePenaltyDay>=4)return "promise";
  if(S.stage>=2&&S.groups.some(g=>g.trackingBroken)&&!T.trackingChecked&&last!=="tracking")return "tracking";
  if(T.negAdded===0&&snapshot.waste>35&&last!=="waste")return "waste";
  if(S.stage>=3&&S.groups.some(g=>g.last&&g.last.lostRank>.35)&&last!=="rank")return "rank";
  if(snapshot.pace>snapshot.goal*1.08&&last!=="strong")return "strong";
  if(snapshot.pace<snapshot.baseline*.92&&last!=="behind")return "behind";
  return "routine";
}
function classicApplyClientPulse(eventId,snapshot){const pulse={
    intake:{},waste:{results:-1,judgment:-1.5,transparency:-1},tracking:{judgment:-1,transparency:-2},
    promise:{results:-2,transparency:-2,alignment:-1},behind:{results:-1.5},rank:{judgment:-.5},
    strong:{results:1.5},routine:{},final:snapshot.pace>=snapshot.goal?{results:1}:{results:-1}
  }[eventId]||{};classicAdjustClientTrust(pulse);}
function classicClientCueIndex(c=S.client,profile=classicClientProfile(c.profileId)){const seen=new Set(c.insight.observations.filter(obs=>obs.type==="cue").map(obs=>obs.index)),
    start=Math.floor(keyedRandom(SEED,"classic-client-cue",c.encounterSeq+1,S.day)*profile.cues.length);
  for(let offset=0;offset<profile.cues.length;offset++){const index=(start+offset)%profile.cues.length;if(!seen.has(index))return index;}
  return start;
}
function classicShouldTriggerClientEncounter(terminal=false){const c=S.client;if(c.pendingEncounter)return true;
  const day=S.day-1;if(terminal)return true;if(c.calls===0)return day>=3;
  if(day-c.lastEncounterDay<4)return false;
  return classicClientEventForSnapshot(classicClientSnapshot(),false)!=="routine"||day%6===0;
}
function classicBeginClientEncounter(options={}){classicHydrate();const c=S.client;if(c.pendingEncounter){renderClassicClientEncounter();return false;}
  const terminal=!!options.terminal,day=Math.max(1,S.day-1),snapshot=classicClientSnapshot();
  if(c.calls>0)S.telemetry.clientReports++;
  classicSettleClientCommitments(day,terminal);
  const eventId=CLASSIC_CLIENT_EVENTS[options.eventId]?options.eventId:classicClientEventForSnapshot(snapshot,terminal),event=CLASSIC_CLIENT_EVENTS[eventId];
  classicApplyClientPulse(eventId,snapshot);c.tension=classicClamp(c.tension*.55+event.pressure*.45+(snapshot.pace<snapshot.goal?5:-2),0,100,c.tension);
  c.calls++;c.encounterSeq++;c.lastEncounterDay=day;if(eventId==="promise")c.lastPromisePenaltyDay=day;S.telemetry.clientEncounters++;
  c.pendingEncounter={id:`CE-${c.encounterSeq}`,day,eventId,phase:"choice",terminal,optionIds:event.options.map(option=>option.id),choiceId:null,
    cueIndex:classicClientCueIndex(c),snapshot,result:null};
  if(typeof autoCheckpoint==="function")autoCheckpoint();renderClassicClientEncounter();return true;
}
function classicClientOptionText(option,snapshot){const values={baseline:snapshot.baseline.toFixed(0),pace:snapshot.pace.toFixed(1),goal:snapshot.goal.toFixed(0),signal:snapshot.signal};
  return option.text.replace(/\{(baseline|pace|goal|signal)\}/g,(_,key)=>values[key]);}
function classicClientChoiceDeltas(option,profile=classicClientProfile()){const evidence=Number(option.evidence)||0,operational=Number(option.operational)||0,
    base=Number(option.base)||0,fit=Number(profile.affinity[option.stance])||0,deltas={
      results:base*.45+operational*1.15+evidence*.55,
      judgment:base*.5+operational*1.25+evidence*.9+fit*.65,
      transparency:base*.4+evidence*1.25+(["investigate","reassure"].includes(option.stance)?.5:0)+fit*.25,
      responsiveness:base*.4+operational*.85+(option.stance==="recommend"?.8:0)+fit*.75,
      alignment:base*.45+evidence*.35+(option.stance==="reassure"?.7:0)+fit*1.2};
  for(const key of CLASSIC_TRUST_PARTS){if(option.unsupported||option.reckless)deltas[key]=Math.min(deltas[key],key==="judgment"||key==="transparency"?-2:-.5);
    deltas[key]=Math.round(deltas[key]*10)/10;}return {deltas,fit};}
function classicAddClientCommitment(kind,day){if(!Object.hasOwn(CLASSIC_COMMITMENTS,kind)||S.client.pendingEncounter?.terminal)return null;
  const existing=S.client.commitments.find(item=>item.kind===kind&&!item.evaluated);if(existing)return existing;
  const item={kind,dueDay:Math.min(CLASSIC_DAYS,day+(kind==="reporting"?4:3)),start:classicClientMetric(kind),evaluated:false,met:false};
  S.client.commitments.push(item);S.client.commitments=S.client.commitments.slice(-8);return item;
}
function classicApplyClientBudgetConsequence(){const c=S.client,profile=classicClientProfile(c.profileId);
  if(S.stage<3||c.budgetCut||c.trust>=profile.budgetCutAt)return false;
  c.budgetCut=true;S.budget=Math.max(1,Math.round(S.budget*profile.budgetCutM));S.telemetry.budgetCuts++;
  addLog(`<div><b class="neg">Client budget limit</b> — relationship trust crossed this client's approval threshold. Future daily authorization is now ${money(S.budget)}.</div>`,"client");return true;
}
function resolveClassicClientEncounter(optionId){classicHydrate();const c=S.client,pending=c.pendingEncounter,event=CLASSIC_CLIENT_EVENTS[pending?.eventId];
  if(!pending||pending.phase!=="choice"||!event)return false;const option=event.options.find(item=>item.id===optionId&&pending.optionIds.includes(item.id));if(!option)return false;
  const trustBefore=c.trust,tensionBefore=c.tension,insightBefore=c.insight.points,{deltas,fit}=classicClientChoiceDeltas(option);
  const pressureM=1+Math.max(0,tensionBefore-40)/250;for(const key of CLASSIC_TRUST_PARTS)deltas[key]=Math.round(deltas[key]*pressureM*10)/10;
  classicAdjustClientTrust(deltas);c.tension=classicClamp(c.tension+(Number(option.tension)||0)-Math.max(-1,fit),0,100,c.tension);
  if(option.effect==="safe-promise")c.promised=c.baseline+2;
  else if(option.effect==="over-promise"){c.promised=Math.round(c.baseline*1.6);S.telemetry.overPromised=true;}
  else if(option.effect==="reset-promise")c.promised=c.baseline;
  else if(option.effect==="grievance")c.grievanceHandled=true;
  if(option.unsupported&&Number(option.evidence)<0)S.telemetry.speculated=true;
  if(option.commitment==="reporting")c.amNoted=true;
  const commitment=classicAddClientCommitment(option.commitment,pending.day);
  if(!c.agreements.includes(option.stance))c.agreements.push(option.stance);c.agreements=c.agreements.slice(-4);
  const observation={type:"cue",index:pending.cueIndex},alreadySeen=c.insight.observations.some(obs=>obs.type==="cue"&&obs.index===observation.index);
  if(!alreadySeen)c.insight.observations.push(observation);c.insight.observations=c.insight.observations.slice(-8);
  const gain=Math.max(1,Number(option.insight)||0),insightAfter=Math.min(12,c.insight.points+gain);c.insight.points=insightAfter;S.telemetry.clientInsightEarned+=insightAfter-insightBefore;
  const budgetCut=classicApplyClientBudgetConsequence();
  pending.phase="feedback";pending.choiceId=option.id;pending.result={trustBefore,trustAfter:c.trust,tensionBefore,tensionAfter:c.tension,deltas,
    insightBefore,insightAfter,observation:alreadySeen?null:observation,budgetCut,commitment:commitment?.kind||null,fit};
  c.encounterHistory.push({day:pending.day,eventId:pending.eventId,optionId:option.id});c.encounterHistory=c.encounterHistory.slice(-24);
  addLog(`<div><b>Client encounter</b> — ${escapeHtml(event.title)} · ${escapeHtml(CLASSIC_CLIENT_STANCES[option.stance].split(" · ")[0])}. Trust ${trustBefore.toFixed(1)} → ${c.trust.toFixed(1)}.</div>`,"client");
  markRunDirty();
  if(typeof autoCheckpoint==="function")autoCheckpoint();playSfx(c.trust>=trustBefore?"settle":"warning",.65);renderClassicClientEncounter();return true;
}
function classicClientDeltaLabel(value){return `${value>0?"+":""}${Number(value).toFixed(1)}`;}
function renderClassicClientEncounter(){const c=S.client,pending=c?.pendingEncounter,event=CLASSIC_CLIENT_EVENTS[pending?.eventId];if(!pending||!event)return false;
  const profile=classicClientProfile(c.profileId),business=classicClientBusiness(c.businessId),snapshot=pending.snapshot,read=classicClientRead(c),choice=event.options.find(option=>option.id===pending.choiceId),
    tensionTone=c.tension>=70?"high":c.tension>=42?"medium":"low";
  if(pending.phase==="choice"){
    show(`<section class="client-encounter"><div class="eyebrow">Day ${pending.day} · client encounter ${c.calls}</div><h2>${escapeHtml(event.title)}</h2>
      <div class="client-encounter-facts"><div><span>Reported monthly pace</span><b>${snapshot.pace.toFixed(1)}</b></div><div><span>Current goal</span><b>${snapshot.goal.toFixed(0)}</b></div><div><span>Reported ROAS</span><b>${snapshot.reportedRoas.toFixed(2)}</b></div><div><span>Relationship trust</span><b>${c.trust.toFixed(1)}/100</b></div></div>
      <div class="client-tension ${tensionTone}"><span>Conversation tension</span><b>${Math.round(c.tension)}/100</b><div class="client-tension-bar"><i style="width:${Math.round(c.tension)}%"></i></div></div>
      <div class="client-prior"><b>${escapeHtml(business.type)} · a starting hypothesis</b><span>${escapeHtml(business.prior)}</span></div>
      <blockquote class="client-message"><span>${escapeHtml(business.role)} · ${escapeHtml(business.name)}</span>“${escapeHtml(event.quote)}”</blockquote>
      <div class="client-cue"><b>What you can observe</b><span>${escapeHtml(profile.cues[pending.cueIndex])}</span></div>
      <div class="client-read"><b>${escapeHtml(read.label)}</b><span>${escapeHtml(read.copy)}</span></div>
      <div class="prose"><p>Choose the complete response you would actually give. Evidence and operational judgment come first; communication fit can change how a sound answer lands. No business type has a magic button.</p></div>
      <div class="client-choice-list">${event.options.map(option=>`<button class="client-choice" type="button" data-client-choice="${option.id}"><b>${escapeHtml(CLASSIC_CLIENT_STANCES[option.stance])}</b><span>“${escapeHtml(classicClientOptionText(option,snapshot))}”</span></button>`).join("")}</div>
      <div class="row"><button class="btn wide" id="clientMenu" type="button">Save &amp; open menu</button></div></section>`,"client",{wide:true});
    ov.querySelectorAll("button[data-client-choice]").forEach(button=>button.onclick=()=>resolveClassicClientEncounter(button.dataset.clientChoice));
    document.getElementById("clientMenu").onclick=()=>{saveGame("client-menu",false);mainMenu();};return true;
  }
  const result=pending.result||classicSafeClientResult(),reaction=profile.reactions[choice?.stance]||"The client takes in the response.",trustDelta=result.trustAfter-result.trustBefore,
    outcomeTone=trustDelta>0?"good":trustDelta<0?"bad":"watch",currentRead=classicClientRead(c);
  show(`<section class="client-encounter client-feedback-phase"><div class="eyebrow">Reaction · ${escapeHtml(event.title)}</div><h2>${trustDelta>0?"Trust strengthened":trustDelta<0?"Trust weakened":"Trust held"}</h2>
    <div class="client-outcome ${outcomeTone}"><b>${trustDelta>0?"✓":trustDelta<0?"!":"•"} ${classicClientDeltaLabel(trustDelta)} weighted trust</b><span>Tension ${Math.round(result.tensionBefore)} → ${Math.round(result.tensionAfter)}</span></div>
    <blockquote class="client-message"><span>Your response</span>“${escapeHtml(classicClientOptionText(choice,pending.snapshot))}”</blockquote>
    <div class="client-cue"><b>Client reaction</b><span>${escapeHtml(reaction)}</span></div>
    <div class="client-feedback"><b>Why the response worked this way</b><span>${escapeHtml(choice.feedback)}${result.tensionBefore>55?" The elevated tension amplified the relationship impact.":""}</span></div>
    <div class="client-delta-grid">${CLASSIC_TRUST_PARTS.map(key=>`<div><span>${key[0].toUpperCase()+key.slice(1)}</span><b class="${result.deltas[key]>0?"pos":result.deltas[key]<0?"neg":""}">${classicClientDeltaLabel(result.deltas[key])}</b></div>`).join("")}</div>
    <div class="client-read"><b>${escapeHtml(currentRead.label)} · insight ${result.insightBefore.toFixed(0)} → ${result.insightAfter.toFixed(0)}</b><span>${escapeHtml(currentRead.copy)}${result.observation?` New evidence: ${escapeHtml(classicClientObservationText(result.observation,profile))}`:""}</span></div>
    ${result.commitment?`<div class="client-commitments"><b>Commitment recorded</b><span>${escapeHtml(CLASSIC_COMMITMENTS[result.commitment])}. The next encounter will check whether the account supports that claim.</span></div>`:""}
    ${result.budgetCut?`<div class="client-outcome bad"><b>Future authorization reduced</b><span>The relationship threshold was crossed; the new daily cap is ${money(S.budget)}.</span></div>`:""}
    <div class="row"><button class="btn wide" id="clientContinue" type="button">Continue to the account</button><button class="btn wide" id="clientMenu" type="button">Save &amp; open menu</button></div></section>`,"client",{wide:true});
  document.getElementById("clientContinue").onclick=continueClassicClientEncounter;document.getElementById("clientMenu").onclick=()=>{saveGame("client-menu",false);mainMenu();};return true;
}
function continueClassicClientEncounter(){classicHydrate();const pending=S.client.pendingEncounter;if(!pending||pending.phase!=="feedback")return false;
  const terminal=pending.terminal;S.client.pendingEncounter=null;if(typeof autoCheckpoint==="function")autoCheckpoint();close();renderClassic();
  if(terminal){classicSettleClientCommitments(CLASSIC_DAYS,true);if(typeof autoCheckpoint==="function")autoCheckpoint();classicDebrief();}
  else if(S.day%5===0&&S.queue.length)recall();
  return true;
}
function reopenClassicInteraction(){if(MODE!==0||!S?.classic)return false;classicHydrate();return S.client.pendingEncounter?renderClassicClientEncounter():false;}
/* Backward-compatible entry point for older tests and saved UI callbacks. */
function clientCall(onComplete=null){return classicBeginClientEncounter({terminal:S.day>CLASSIC_DAYS||typeof onComplete==="function"});}
function classicTrustPartLabel(key){return ({results:"Results confidence",judgment:"Buyer judgment",transparency:"Transparency",responsiveness:"Responsiveness",alignment:"Strategic alignment"})[key]||key;}
function classicClientDossierMarkup(){const c=S.client,profile=classicClientProfile(c.profileId),business=classicClientBusiness(c.businessId),read=classicClientRead(c),
    observations=c.insight.observations.map(item=>classicClientObservationText(item,profile)).filter(Boolean),pending=c.commitments.filter(item=>!item.evaluated),
    settled=c.commitments.filter(item=>item.evaluated).slice(-2),tensionTone=c.tension>=70?"high":c.tension>=42?"medium":"low";
  return `<section class="client-dossier" aria-label="Client relationship dossier"><div class="client-dossier-head"><div><span>Client dossier · ${escapeHtml(business.type)}</span><b>${escapeHtml(business.name)}</b><small>${escapeHtml(business.role)} · relationship encounter ${c.calls}</small></div><div><span>Weighted trust</span><b class="${c.trust>=profile.retentionFloor?"pos":"neg"}">${c.trust.toFixed(1)}/100</b><small>retention line ${profile.retentionFloor}</small></div></div>
    <div class="client-prior"><b>Business prior · useful, never definitive</b><span>${escapeHtml(business.prior)}</span></div>
    <div class="client-trust-grid">${CLASSIC_TRUST_PARTS.map(key=>`<div class="client-trust-part"><span>${classicTrustPartLabel(key)}</span><b>${c.trustParts[key].toFixed(0)}</b><i style="width:${c.trustParts[key]}%"></i></div>`).join("")}</div>
    <div class="client-tension ${tensionTone}"><span>Current tension</span><b>${Math.round(c.tension)}/100</b><div class="client-tension-bar"><i style="width:${Math.round(c.tension)}%"></i></div></div>
    <div class="client-read"><b>${escapeHtml(read.label)} · insight ${c.insight.points.toFixed(0)}/12</b><span>${escapeHtml(read.copy)}</span></div>
    <div class="client-observations"><b>Earned observations</b>${observations.length?`<ul>${observations.slice(-4).map(text=>`<li>${escapeHtml(text)}</li>`).join("")}</ul>`:"<span>No individual pattern has been earned yet. Watch the words, tempo, and follow-up behavior in tense encounters.</span>"}</div>
    <div class="client-commitments"><b>Working commitments</b>${pending.length?`<ul>${pending.map(item=>`<li>${escapeHtml(CLASSIC_COMMITMENTS[item.kind])} · checked by day ${item.dueDay}</li>`).join("")}</ul>`:"<span>No open promise.</span>"}${settled.length?`<small>${settled.map(item=>`${item.met?"✓":"!"} ${CLASSIC_COMMITMENTS[item.kind]}`).join(" · ")}</small>`:""}</div></section>`;
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
  const used=new Set(g.ads.filter(ad=>classicAdKind(ad)===kind).map(ad=>Number(String(ad.copyId).split(":")[2]))),cursor=kind==="permutation"?g.variantCount:g.expandedCount;
  let ordinal=cursor%deck.length;for(let offset=0;offset<deck.length;offset++){const candidate=(cursor+offset)%deck.length;if(!used.has(candidate)){ordinal=candidate;break;}}
  const copyId=classicCopyId(g.id,kind,ordinal),id=`${g.id}-ad-${g.nextAdId++}`;
  g.ads.push({id,copyId,...(kind==="permutation"?{baseCopyId:g.ads[0].copyId}:{}),createdDay:S.day,version:1,active:true,
    stats:{impr:0,clicks:0,convR:0,spend:0}});g.previewAdId=id;
  if(kind==="expanded"){g.expandedBuilt=true;g.expandedCount++;S.telemetry.expandedAds++;}
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
    ["Client trust",c.trust.toFixed(1)+"/100",c.trust>=classicClientProfile(c.profileId).retentionFloor?`holding · insight ${c.insight.points.toFixed(0)}/12`:`at risk · retention line ${classicClientProfile(c.profileId).retentionFloor}`,c.trust>=classicClientProfile(c.profileId).retentionFloor?"pos":"neg"],
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
  document.getElementById("accountBox").innerHTML=`${classicClientDossierMarkup()}<div class="eyebrow">What you are changing</div>
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
    if(n)markRunDirty();renderClassic(); };
  const db=document.getElementById("delivBtn");
  if(db)db.onclick=()=>{if(S.stage<2)return false;S.delivery=(S.delivery==="standard")?"accelerated":"standard";
    addLog(`<div><b>Shared campaign pacing</b> — unsplit ad groups now use ${S.delivery} delivery. Dedicated campaigns keep their own pacing.</div>`,"search");
    markRunDirty();renderClassic();return true;};
  const tb=document.getElementById("trackBtn");
  if(tb) tb.onclick=()=>{ S.telemetry.trackingChecked=true;
    markRunDirty();
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
  if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.sync();
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
  const before=action==="preview"?null:JSON.stringify(S);
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
  markRunDirtyIfChanged(before);
  renderClassic();
  const previewAfter=["rewrite","variant","expanded","ad-retire","split","landing"].includes(action),focusAction=previewAfter?"preview":action,
    focusAdId=focusAction==="preview"?g.previewAdId:(b.dataset.adId||"");
  restoreClassicActionFocus(focusAction,i,focusAdId);
});

/* ---------------- debrief: both scoreboards ---------------- */
function classicDebrief(){
  classicHydrate();classicSettleClientCommitments(CLASSIC_DAYS,true);
  const T=S.telemetry, c=S.client,profile=classicClientProfile(c.profileId),business=classicClientBusiness(c.businessId),clientRead=classicClientRead(c);
  const roas=S.spendTotal?S.reportedValueTotal/S.spendTotal:0,modeledRoas=S.spendTotal?S.valueTotal/S.spendTotal:0;
  const monthlyGoal=c.promised||c.baseline, periodGoal=monthlyGoal*(CLASSIC_DAYS/30);
  const hitGoal=S.convReported>=periodGoal, keptClient=c.trust>=profile.retentionFloor;
  const v=[]; const add=(k,h,b)=>v.push(`<div class="verdict ${k}"><div class="h">${h}</div>${b}</div>`);
  add(hitGoal&&keptClient?"hit":"miss","Result",
    `${S.convReported.toFixed(1)} conversions against a ${CLASSIC_DAYS}-day goal of ${periodGoal.toFixed(1)} `+
    `(${monthlyGoal}/mo pace) · reported ROAS `+
    `<b class="${roas>=2?"pos":"neg"}">${roas.toFixed(2)}</b> · client trust `+
    `<b class="${keptClient?"pos":"neg"}">${c.trust.toFixed(1)}/100</b> (this client's retention line: ${profile.retentionFloor}).<br>`+
    `${Math.abs(modeledRoas-roas)>.01?`Modeled business ROAS was ${modeledRoas.toFixed(2)}; the gap is measurement, not extra value. `:""}`+
    (hitGoal&&keptClient?"You hit the number and still have the client. Both scoreboards."
     :hitGoal&&!keptClient?"<b>You hit the number and lost the client anyway.</b> That is the whole "+
       "point of this mode — the account is not the only thing you are managing."
     :!hitGoal&&keptClient?"You missed the number but kept their trust, which is a survivable month."
     :"You missed both."));
  add(c.insight.points>=6?"hit":c.insight.points>=2?"watch":"miss","Client read",
    `${escapeHtml(business.role)} at ${escapeHtml(business.name)} began as a business-type hypothesis. You finished with <b>${c.insight.points.toFixed(0)}/12 insight</b>: ${escapeHtml(clientRead.copy)} `+
    `You kept <b>${T.commitmentsMet}</b> recorded commitment(s) and missed <b>${T.commitmentsMissed}</b>. The business prior never replaced evidence from the individual's reactions.`);
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
  document.getElementById("again").onclick=()=>{clearFx();startFreshRunExperience({mode:0,stage:S.stage,seed:SEED});};
  document.getElementById("debriefMenu").onclick=mainMenu;
  const nx=document.getElementById("next");
  if(nx) nx.onclick=()=>startFreshRunExperience({mode:0,stage:S.stage+1,seed:SEED});
}
