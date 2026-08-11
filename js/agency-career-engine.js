"use strict";
/* ------------------------------------------------------------------------------------------
   Agency Career

   A deterministic, decade-scale management simulation. Client media spend and client business
   outcomes are deliberately separate from the agency's own revenue, costs, cash, and profit.
   One client relationship consumes one of 75 seats even when that client has several campaigns.
------------------------------------------------------------------------------------------- */
const AgencyCareer=(()=>{
  const TOTAL_DAYS=AGENCY_TOTAL_MONTHS*AGENCY_MONTH_DAYS;
  const FIRST_YEAR_TARGETS=Object.freeze([1,2,5,8,11,15,17,19,22,24,27,30]);
  const PERSONALITIES=Object.freeze({
    evidence:{label:"Evidence seeker",hint:"Often asks for the denominator, source, and comparison window before accepting a conclusion.",best:"evidence"},
    decisive:{label:"Decisive operator",hint:"Responds best to a named owner, a bounded decision, and a clear next checkpoint.",best:"plan"},
    cautious:{label:"Risk guardian",hint:"Wants downside protection, reversibility, and advance notice of changes.",best:"assurance"},
    collaborative:{label:"Collaborative builder",hint:"Values context, shared reasoning, and being included before a major move.",best:"context"}
  });
  const STAFF=Object.freeze({
    buyer:{label:"Media buyer",salary:6500,hireCost:3500,focus:8,note:"Operates routine account work and delivery decisions."},
    account:{label:"Account manager",salary:5800,hireCost:3000,focus:2,note:"Absorbs reporting and relationship work."},
    creative:{label:"Creative strategist",salary:7000,hireCost:4000,focus:2,note:"Reduces creative-service pressure across social and commerce."},
    ops:{label:"Operations specialist",salary:6200,hireCost:3500,focus:4,note:"Adds process capacity and improves reliable delegation."},
    analyst:{label:"Measurement analyst",salary:7500,hireCost:4500,focus:2,note:"Handles tracking, customer data, tests of whether media caused additional outcomes and payout reconciliation."}
  });
  const ACTIONS=Object.freeze({
    service:{label:"Service account",costM:1,match:["quality","auction","geography"],concept:"performance"},
    audit:{label:"Audit measurement",costM:1.15,match:["tracking","policy","geography"],concept:"measurement"},
    refresh:{label:"Refresh creative",costM:1.2,match:["creative"],concept:"creative"},
    update:{label:"Send client update",costM:.7,match:["stakeholder"],concept:"client"}
  });
  const FILTERS=Object.freeze(["attention","risk","all"]);
  const DASHBOARD_VIEWS=Object.freeze(["today","money","agency"]),COMPANY_VIEWS=Object.freeze(["operations","finance","team"]);

  function presentationKey(kind){const profile=typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE?ACTIVE_PROFILE:"general";return `ttm.agency.${kind}.${profile}.v1`;}
  function readPresentation(kind,allowed,fallback){try{const value=sessionStorage.getItem(presentationKey(kind));return allowed.includes(value)?value:fallback;}catch(e){return fallback;}}
  function writePresentation(kind,value){try{sessionStorage.setItem(presentationKey(kind),value);}catch(e){}}
  let agencyDashboardView="",agencyCompanyView="",agencyPinnedTargetId="";
  function currentDashboardView(){if(!DASHBOARD_VIEWS.includes(agencyDashboardView))agencyDashboardView=readPresentation("dashboard",DASHBOARD_VIEWS,"today");return agencyDashboardView;}
  function currentCompanyView(){if(!COMPANY_VIEWS.includes(agencyCompanyView))agencyCompanyView=readPresentation("company",COMPANY_VIEWS,"operations");return agencyCompanyView;}

  function clamp(n,min,max){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;}
  function roundTo(n,step=1){return Math.round(Number(n||0)/step)*step;}
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
  function safeId(value){return typeof value==="string"&&/^[a-z0-9_-]{1,80}$/i.test(value);}
  function safeAuthoredText(value,max=20000){return typeof value==="string"&&value.length<=max&&!/<\s*(?:script|style|iframe|object|embed)|\bon\w+\s*=|javascript\s*:/i.test(value);}
  function sanitizeAgencyName(value,fallback="Moonrise Media"){
    const clean=String(value??"").normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/g,"").replace(/\s+/g," ").trim().slice(0,48);
    return clean.length>=2?clean:fallback;
  }
  function roll(...parts){return keyedRandom(SEED,"agency-career",...parts);}
  function year(state=S){return 2017+Math.floor(Math.min(119,Math.max(0,state.month))/12);}
  function monthOfYear(state=S){return (Math.max(0,state.month)%12)+1;}
  function monthName(state=S){return `${year(state)} · month ${monthOfYear(state)}/12`;}
  function activeClients(state=S){return state.clients.filter(client=>client.status==="active");}
  function starterModel(value=S){
    const id=typeof value==="string"?value:value?.agencyIdentity?.agencyType;
    return AGENCY_STARTER_MODELS[id]||AGENCY_STARTER_MODELS.digital_agency;
  }
  function hqLocation(value=S){
    const id=typeof value==="string"?value:value?.agencyIdentity?.hqId;
    return AGENCY_HQ_LOCATIONS.find(item=>item.id===id)||AGENCY_HQ_LOCATIONS.find(item=>item.id==="portland-or")||AGENCY_HQ_LOCATIONS[0];
  }
  function identity(state=S){
    const source=state?.agencyIdentity||{},model=starterModel(source.agencyType),hq=hqLocation(source.hqId);
    return {name:sanitizeAgencyName(source.name),hqId:hq.id,agencyType:model.id,model,hq};
  }
  function queryAgencyIdentity(){
    const get=key=>{try{return typeof QUERY!=="undefined"&&QUERY?QUERY.get(key):new URLSearchParams(location.search||"").get(key);}catch(e){return null;}};
    const model=starterModel(get("agencyType")),hq=hqLocation(get("hq"));
    return {name:sanitizeAgencyName(get("agencyName")),hqId:hq.id,agencyType:model.id};
  }
  function channelAllowed(channel,state=S){return starterModel(state).allowedChannels.includes(channel);}
  function timezoneBand(timezone,state=S){
    if(timezone==="Pacific/Honolulu")return monthOfYear(state)>=3&&monthOfYear(state)<=10?-3:-2;if(timezone==="America/Anchorage")return -1;
    if(timezone==="America/New_York")return 3;if(timezone==="America/Chicago")return 2;if(timezone==="America/Denver")return 1;
    if(timezone==="America/Phoenix")return monthOfYear(state)>=3&&monthOfYear(state)<=10?0:1;return 0;
  }
  function clientGeography(client,state=S){
    const office=hqLocation(client?.officeId),hq=hqLocation(state),targetStates=Array.isArray(client?.targetStates)?client.targetStates:[];
    const timeOffset=timezoneBand(client?.accountTimezone||office.timezone,state)-timezoneBand(hq.timezone,state),timeDifference=Math.abs(timeOffset);
    const sameState=office.stateCode===hq.stateCode,wideTargeting=client?.marketScope==="national"||targetStates.length>=5;
    const coordinationSurcharge=timeDifference>=3&&!hasTech("follow_the_sun",state)?1:0;
    const targetingSurcharge=wideTargeting&&!hasTech("portfolio_measurement",state)?1:0;
    const targetingMultiplier=client?.marketScope==="national"&&!hasTech("portfolio_measurement",state)?.965:targetStates.length>=9&&!hasTech("portfolio_measurement",state)?.96:targetStates.length>=5?.985:1;
    return {hq,office,targetStates,timeOffset,timeDifference,sameState,wideTargeting,coordinationSurcharge,targetingSurcharge,
      focusSurcharge:coordinationSurcharge+targetingSurcharge,outcomeMultiplier:targetingMultiplier};
  }
  function node(id){return AGENCY_TECH_NODES.find(item=>item.id===id);}
  function hasTech(id,state=S){return state.unlocked.includes(id);}
  function capabilityInvestment(itemOrId,state=S){
    const item=typeof itemOrId==="string"?node(itemOrId):itemOrId;
    return roundTo(Math.max(0,Number(item?.investment)||0)*eraCostFactor(state),50);
  }
  function capabilityMonthlyCosts(state=S){
    const categories={infrastructureHosting:0,softwareSubscriptions:0,facilitiesAdministration:0},factor=eraCostFactor(state);
    for(const id of state.unlocked){
      const item=node(id),category=item?.monthlyCategory;
      if(!item?.monthly||!Object.prototype.hasOwnProperty.call(categories,category))continue;
      categories[category]+=Math.max(0,Number(item.monthly)||0)*factor;
    }
    for(const category of Object.keys(categories))categories[category]=roundTo(categories[category],10);
    return {...categories,total:Object.values(categories).reduce((sum,value)=>sum+value,0)};
  }
  function typeOf(client){return AGENCY_CLIENT_TYPES[client.typeId]||AGENCY_CLIENT_TYPES.smb_leadgen;}
  function channelOf(client){return AGENCY_CHANNELS[client.channel]||AGENCY_CHANNELS.search;}
  function defaultPlatformFor(channel){return AGENCY_PLATFORM_DEFAULTS[channel]||null;}
  function platformOf(client){
    const platform=AGENCY_PLATFORMS[client?.platform];
    if(platform&&platform.channel===client.channel)return platform;
    const fallback=defaultPlatformFor(client?.channel);return fallback?AGENCY_PLATFORMS[fallback]:null;
  }
  function pacingOf(client){return AGENCY_PACING[client?.pacing]||AGENCY_PACING.steady;}
  function strategyOf(client){return AGENCY_STRATEGIES[client?.strategy]||AGENCY_STRATEGIES.balanced;}
  function strategyAvailable(strategyId,client,state=S){
    const doctrine=AGENCY_STRATEGIES[strategyId];if(!doctrine)return {ok:false,reason:"Unknown doctrine"};
    if(doctrine.families&&!doctrine.families.includes(channelOf(client).family))return {ok:false,reason:`Fits ${doctrine.families.join("/")} channels only`};
    if(year(state)<doctrine.year)return {ok:false,reason:`Available in ${doctrine.year}`};
    if(doctrine.requiresTech&&!hasTech(doctrine.requiresTech,state))return {ok:false,reason:`Requires ${node(doctrine.requiresTech)?.label||doctrine.requiresTech}`};
    return {ok:true,reason:"Ready"};
  }
  /* Doctrine economics, era- and capability-aware. Returns the multiplier set the daily
     simulation consumes: outcome value, day-to-day volatility, service focus, creative decay,
     platform-capacity share and incident pressure. This is where a buying STYLE becomes a
     different game: automation shines post-2019 but starves in signal-loss years without
     advertiser data; manual hands dominate early and fade; retargeting is efficient but small. */
  function strategyEconomics(client,state=S){
    const doctrine=strategyOf(client),era=AGENCY_ERAS.find(item=>item.year===year(state))||AGENCY_ERAS[0];
    const base={value:1,volatility:1,focus:1,decay:1,capacity:1,incident:1,refreshCash:1};
    if(doctrine.id==="intent_harvest")return {...base,value:1.05,volatility:.8,focus:1.15,capacity:.8,incident:.7};
    if(doctrine.id==="creative_engine")return {...base,value:1.06,volatility:1.25,focus:1.1,decay:.7,refreshCash:.8};
    if(doctrine.id==="broad_automation"){
      const starved=era.flags.signalPressure&&!hasTech("first_party",state);
      return {...base,value:starved?.9:1.08,volatility:1.1,focus:.75,incident:starved?1.2:.9};
    }
    if(doctrine.id==="manual_precision"){
      const outgrown=era.flags.automationPressure&&!hasTech("automation",state);
      return {...base,value:outgrown?.96:1.06,volatility:.7,focus:1.25,incident:.85};
    }
    if(doctrine.id==="bottom_funnel")return {...base,value:1.12,volatility:.9,focus:1,capacity:.45,incident:.8};
    return base;
  }
  function clientIsB2B(client){return AGENCY_B2B_VERTICALS.includes(client?.vertical)||String(client?.typeId||"").startsWith("enterprise");}
  function platformsForChannel(channel,state=S){
    return Object.values(AGENCY_PLATFORMS).filter(platform=>platform.channel===channel&&
      year(state)>=platform.year&&(!platform.tech||hasTech(platform.tech,state)));
  }
  /* Platform economics: efficiency prices the clicks, capacity caps how much monthly media the
     demand pool can absorb, and LinkedIn-class platforms flip between a B2B bonus and a
     consumer penalty. This is where Google vs. Microsoft vs. LinkedIn actually differ.
     Efficiency feeds the outcome index; the capacity penalty applies ONLY to the client's own
     value ledger, so client media volume can never move agency revenue (a locked invariant). */
  function singlePlatformFit(platform,client){
    if(!platform)return 1;
    if(platform.b2bEfficiency)return clientIsB2B(client)?platform.b2bEfficiency:platform.efficiency||1;
    return platform.efficiency||1;
  }
  /* The media plan can split a client's monthly budget between the primary platform and one
     secondary lane in 10% steps (up to 50%) — the career's version of the Modes 1–5
     allocation board. Efficiency blends by share; capacity is checked per allocated share. */
  function mediaSplit(client){
    const primary=platformOf(client);if(!primary)return null;
    const secondary=AGENCY_PLATFORMS[client.secondaryPlatformId];
    const usable=secondary&&secondary.channel===client.channel&&secondary.id!==primary.id;
    const share=usable?clamp(Math.round((Number(client.secondaryShare)||0)/10)*10,0,50)/100:0;
    return {primary,secondary:share>0?secondary:null,share};
  }
  function platformFitM(client,state=S){
    const split=mediaSplit(client);if(!split)return 1;
    const primaryFit=singlePlatformFit(split.primary,client);
    if(!split.secondary)return primaryFit;
    return primaryFit*(1-split.share)+singlePlatformFit(split.secondary,client)*split.share;
  }
  function singleCapacityM(platform,allocated){
    if(!platform||allocated<=0)return 1;
    const capacity=Math.max(1,Number(platform.capacity)||0);
    return allocated>capacity?Math.max(.6,Math.pow(capacity/allocated,.5)):1;
  }
  function platformCapacityM(client,capacityShare=1){
    const split=mediaSplit(client);if(!split)return 1;
    /* A doctrine can shrink the demand pool it fishes in (retargeting, tight intent). */
    const scale=platform=>platform?{...platform,capacity:Math.max(1,(Number(platform.capacity)||0)*capacityShare)}:platform;
    const primary=scale(split.primary),secondary=scale(split.secondary);
    const budget=Math.max(0,Number(client.mediaBudget)||0);
    if(!secondary)return singleCapacityM(primary,budget);
    return singleCapacityM(primary,budget*(1-split.share))*(1-split.share)+
      singleCapacityM(secondary,budget*split.share)*split.share;
  }
  /* THE DEEPER LAYER (2026-08-09). The client card's buy board stays the top abstraction: it
     always drives the client's PRIMARY campaign, so a player who never opens this layer keeps
     the simple game. With the multi-campaign capability unlocked, a client can carry up to
     four campaigns, each with its own budget share, platform, doctrine, pacing and creative.
     Campaigns are stored on the client and default to a single implicit one. */
  const MAX_CAMPAIGNS=4,MAX_AD_SETS=3,MAX_ADS=3;
  /* The last level: individual ads inside an ad set. Each carries its own creative and wears
     out on its own schedule, so rotation can hold response up while one ad is replaced —
     the creative-testing loop the rest of To The Moon already runs on. */
  function adsOf(adSet,campaign,client){
    if(Array.isArray(adSet?.ads)&&adSet.ads.length)return adSet.ads;
    return [{id:"primary",paused:false,adConceptId:campaign?.adConceptId||client?.adConceptId,
      adFormat:campaign?.adFormat||client?.adFormat,creative:Number(campaign?.creative)||Number(client?.creative)||70,implicit:true}];
  }
  function canAddAd(client,campaign,adSet,state=S){
    if(!hasTech("creative_rotation",state))return {ok:false,reason:"Needs the multi-ad creative rotation capability"};
    if(adsOf(adSet,campaign,client).length>=MAX_ADS)return {ok:false,reason:`An ad set runs at most ${MAX_ADS} ads`};
    const cash=operationCashCost("refresh",state);
    if(state.cash-cash < -state.creditLimit)return {ok:false,reason:`Needs ${safeMoney(cash)} of production`};
    if(state.focusRemaining<1)return {ok:false,reason:"Needs 1 focus"};
    return {ok:true,reason:"Ready",cash};
  }
  function addAd(clientId,campaignId,adSetId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    const campaign=campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    const sets=adSetsOf(campaign,client,state).map(item=>({...item,implicit:false}));
    const set=sets.find(item=>item.id===adSetId);if(!set)return false;
    const check=canAddAd(client,campaign,set,state);if(!check.ok)return refuseAgency(check.reason||"That is not available yet.");
    const ads=adsOf(set,campaign,client).map(item=>({...item,implicit:false}));
    const offer=offerOf(client),pool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const used=new Set(ads.map(item=>item.adConceptId));
    const concept=pool.find(item=>!used.has(item.id))||pool[0];if(!concept)return false;
    ads.push({paused:false,id:`ad-${ads.length+1}-${state.day}`,adConceptId:concept.id,
      adFormat:adFormatFor(concept,client.channel),creative:88,implicit:false});
    set.ads=ads;campaign.adSets=sets;client.campaigns=campaigns;
    state.focusRemaining--;state.cash-=check.cash;addMonthCost(state,"clientService",check.cash);state.opsCost+=check.cash;
    creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"creative",html:`<div><b>New ad in rotation</b> · ${esc(client.name)} · ${esc(campaign.name)} now runs ${ads.length} ads, adding “${esc(concept.label)}”. Each ad wears out on its own, so the fresh one carries response while the tired one is replaced.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  /* THE MISSING LEVERS (2026-08-09). Agency could add campaigns, ad sets and ads but could
     never kill one, never choose a landing page, and had a single blunt reroll standing in for
     three distinct creative moves. Those are the levers modes 1-4 already had. */
  function toggleCampaignPaused(clientId,campaignId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    const campaign=campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    const pausing=!campaign.paused;
    if(pausing&&campaigns.filter(item=>!item.paused).length<2)
      return refuseAgency("That is the only campaign still running. Pausing it would take the account dark and stop every conversion.");
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and pause it tomorrow.");
    campaign.paused=pausing;client.campaigns=campaigns;
    state.focusRemaining--;creditBuyingWork(client,state,{full:false});
    client.lastAction=`${pausing?"Paused":"Resumed"} ${campaign.name} · day ${state.day}`;
    state.log.unshift({concept:"structure",html:`<div><b>${pausing?"Campaign paused":"Campaign back on"}</b> · ${esc(client.name)} · ${esc(campaign.name)} ${pausing?`stops buying. Its budget moves to the campaigns still running, so the account spends the same and concentrates it.`:`starts buying again and takes its share back.`}</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function toggleAdPaused(clientId,campaignId,adSetId,adId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    const campaign=campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    const sets=adSetsOf(campaign,client,state).map(item=>({...item,implicit:false}));
    const set=sets.find(item=>item.id===adSetId);if(!set)return false;
    const ads=adsOf(set,campaign,client).map(item=>({...item,implicit:false}));
    const ad=ads.find(item=>item.id===adId);if(!ad)return false;
    const pausing=!ad.paused;
    if(pausing&&ads.filter(item=>!item.paused).length<2)
      return refuseAgency("That is the only ad left in the set. An ad set with nothing running cannot serve, so pause the ad set's campaign instead.");
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and kill it tomorrow.");
    ad.paused=pausing;set.ads=ads;campaign.adSets=sets;client.campaigns=campaigns;
    state.focusRemaining--;creditBuyingWork(client,state,{full:false});
    const concept=AGENCY_AD_CONCEPTS.find(item=>item.id===ad.adConceptId);
    state.log.unshift({concept:"creative",html:`<div><b>${pausing?"Ad killed":"Ad back in rotation"}</b> · ${esc(client.name)} · “${esc(concept?.label||"the ad")}” ${pausing?"stops serving. The set's spend splits across the ads still running, so the survivors get more of it.":"serves again and takes a share of the rotation."}</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function landerOptions(state=S){return Object.values(AGENCY_LANDERS).filter(item=>!item.requiresTech||hasTech(item.requiresTech,state));}
  function canSetLander(client,campaign,landerId,state=S){
    const lander=AGENCY_LANDERS[landerId];
    if(!lander)return {ok:false,reason:"No such landing page"};
    if(campaign.lander===landerId||(!campaign.lander&&landerId==="client_site"))return {ok:false,reason:"That campaign already points at this page"};
    if(lander.requiresTech&&!hasTech(lander.requiresTech,state))return {ok:false,reason:"Needs the landing-page capability before you can build this one"};
    if(state.cash-lander.cost < -state.creditLimit)return {ok:false,reason:`Building it costs ${safeMoney(lander.cost)} and the agency cannot cover it`};
    if(state.focusRemaining<Math.max(1,lander.build))return {ok:false,reason:`Building it takes ${Math.max(1,lander.build)} focus`};
    return {ok:true,cost:lander.cost,focus:Math.max(1,lander.build)};
  }
  function setCampaignLander(clientId,campaignId,landerId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    const campaign=campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    const check=canSetLander(client,campaign,landerId,state);
    if(!check.ok)return refuseAgency(check.reason||"That landing page is not available.");
    const lander=AGENCY_LANDERS[landerId];
    campaign.lander=landerId;client.campaigns=campaigns;
    state.focusRemaining-=check.focus;state.cash-=check.cost;
    if(check.cost){addMonthCost(state,"funnelDevelopment",check.cost);state.opsCost+=check.cost;}
    creditBuyingWork(client,state,{full:false});
    client.lastAction=`Landing page rebuilt · day ${state.day}`;
    state.log.unshift({concept:"conversion",html:`<div><b>New landing page</b> · ${esc(client.name)} · ${esc(campaign.name)} now sends its clicks to ${esc(lander.label.toLowerCase())}. ${esc(lander.note)} Cost per click does not move; the share of clicks that convert does.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  /* Three distinct creative moves, the way modes 1-4 already split them. Restate keeps the
     idea and rewrites the words. Recast keeps the words and changes the format. Choosing a
     new direction replaces the idea outright, and stays the expensive one. */
  function restateAd(clientId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and rewrite it tomorrow.");
    const cash=Math.round(operationCashCost("refresh",state)*0.3);
    if(state.cash-cash < -state.creditLimit)return refuseAgency(`Rewriting the ad costs ${safeMoney(cash)} and the agency cannot cover it.`);
    const concept=AGENCY_AD_CONCEPTS.find(item=>item.id===client.adConceptId)||null;
    const offer=offerOf(client),version=Math.max(1,Number(client.creativeVersion)||1)+1;
    client.creativeVersion=version;
    client.adCopy=adCopyFor(concept,offer,hqLocation(client.officeId),client.channel,version,client);
    client.creative=clamp(client.creative+7,0,100);
    state.focusRemaining--;state.cash-=cash;
    if(cash){addMonthCost(state,"clientService",cash);state.opsCost+=cash;}
    creditBuyingWork(client,state,{full:false});
    client.lastAction=`Ad rewritten · day ${state.day}`;
    state.log.unshift({concept:"creative",html:`<div><b>Ad rewritten</b> · ${esc(client.name)} keeps the same idea and says it differently — new headlines and descriptions, revision ${version}. Cheaper than a new direction and it buys back some of the wear, but a rewrite cannot fix an idea the market has stopped wanting.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function recastAd(clientId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    if(state.focusRemaining<2)return refuseAgency("Recasting the ad takes 2 focus. Run the day and pick it up tomorrow.");
    const cash=Math.round(operationCashCost("refresh",state)*0.6);
    if(state.cash-cash < -state.creditLimit)return refuseAgency(`Recasting costs ${safeMoney(cash)} and the agency cannot cover it.`);
    const offer=offerOf(client),pool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const current=AGENCY_AD_CONCEPTS.find(item=>item.id===client.adConceptId);
    const sameIdea=pool.filter(item=>item.id!==client.adConceptId&&item.format!==current?.format);
    const next=sameIdea.length?sameIdea[Math.floor(roll("recast",client.id,client.creativeVersion||1)*sameIdea.length)]:null;
    if(!next)return refuseAgency("There is no other format available for this offer on this channel. A new direction is the move instead.");
    const version=Math.max(1,Number(client.creativeVersion)||1)+1;
    client.adConceptId=next.id;client.adFormat=adFormatFor(next,client.channel);client.creativeVersion=version;
    client.adCopy=adCopyFor(next,offer,hqLocation(client.officeId),client.channel,version,client);
    client.creative=clamp(client.creative+16,0,100);
    state.focusRemaining-=2;state.cash-=cash;
    if(cash){addMonthCost(state,"clientService",cash);state.opsCost+=cash;}
    creditBuyingWork(client,state,{full:false});
    client.lastAction=`Ad recast · day ${state.day}`;
    state.log.unshift({concept:"creative",html:`<div><b>Ad recast</b> · ${esc(client.name)} runs the argument in a different format — now ${esc(formatLabel(client.adFormat))}. The same claim in a new shape reads as new to the auction, so it buys back more wear than a rewrite for less than a new direction.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function scaleClientBudget(clientId,direction,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||state.businessModel!=="agency"||!client)return false;
    const bounds=budgetBounds(client),current=Math.max(0,Number(client.mediaBudget)||0);
    const target=roundTo(clamp(direction==="down"?current/1.5:current*1.5,bounds.min,bounds.max),100);
    if(target===current)return refuseAgency(`${esc(client.name)} is already at the ${direction==="down"?"floor":"ceiling"} of what they approved: ${safeMoney(direction==="down"?bounds.min:bounds.max)}/month against a ${safeMoney(bounds.base)} baseline.`);
    const check=canSetBudget(client,target,state);
    if(!check.ok)return refuseAgency(check.reason||`${esc(client.name)} will not approve ${safeMoney(target)}/month yet.`);
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and scale tomorrow.");
    state.focusRemaining--;client.mediaBudget=target;
    creditBuyingWork(client,state,{full:false});
    client.lastAction=`Budget ${direction==="down"?"cut hard":"scaled hard"} · day ${state.day}`;
    state.log.unshift({concept:"structure",html:`<div><b>Budget ${direction==="down"?"cut by a third":"scaled by half again"}</b> · ${esc(client.name)} moves from ${safeMoney(current)} to ${safeMoney(target)}/month in one step. Big moves reprice the auction faster than small ones, so watch cost per conversion before the next change.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  /* ACCOUNTS (2026-08-09). The layer above campaigns. A client used to be one account on one
     platform; campaigns could differ by platform but nothing named or grouped them, so the top
     of the hierarchy was invisible. An account is now every campaign sharing a platform. */
  const MAX_ACCOUNTS=3;
  function accountsOf(client,state=S){
    const groups=[];
    campaignsOf(client).forEach(campaign=>{
      const id=campaign.platform||client.platform||"unassigned";
      let account=groups.find(item=>item.platformId===id);
      if(!account){const platform=AGENCY_PLATFORMS[id]||null;
        groups.push(account={platformId:id,platform,label:platform?platform.label:"Unassigned account",campaigns:[]});}
      account.campaigns.push(campaign);
    });
    return groups;
  }
  function openableAccountPlatforms(client,state=S){
    const open=new Set(accountsOf(client,state).map(account=>account.platformId));
    return Object.values(AGENCY_PLATFORMS).filter(platform=>{
      if(open.has(platform.id))return false;
      if(year(state)<platform.year)return false;
      if(platform.tech&&!hasTech(platform.tech,state))return false;
      const channel=AGENCY_CHANNELS[platform.channel];
      if(!channel)return false;
      return !channel.tech||hasTech(channel.tech,state);
    });
  }
  function canOpenAccount(client,platformId,state=S){
    if(!hasTech("multi_account",state))return {ok:false,reason:"Needs the second-ad-account capability before a client can run more than one"};
    if(accountsOf(client,state).length>=MAX_ACCOUNTS)return {ok:false,reason:`A client runs at most ${MAX_ACCOUNTS} ad accounts`};
    if(!openableAccountPlatforms(client,state).some(item=>item.id===platformId))return {ok:false,reason:"That platform is not open to this client yet"};
    if(campaignsOf(client).length>=MAX_CAMPAIGNS)return {ok:false,reason:`The client already runs the maximum ${MAX_CAMPAIGNS} campaigns; a new account needs room for one`};
    const cash=operationCashCost("audit",state);
    if(state.cash-cash < -state.creditLimit)return {ok:false,reason:`Standing an account up costs ${safeMoney(cash)} and the agency cannot cover it`};
    if(state.focusRemaining<2)return {ok:false,reason:"Standing an account up takes 2 focus"};
    return {ok:true,cash};
  }
  function openAccount(clientId,platformId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    const check=canOpenAccount(client,platformId,state);
    if(!check.ok)return refuseAgency(check.reason||"That account cannot be opened yet.");
    const platform=AGENCY_PLATFORMS[platformId];
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    /* The new account takes a quarter of the plan from the largest existing campaign, so total
       budget is unchanged and the player decides afterwards how to weight them. */
    const donor=campaigns.slice().sort((a,b)=>b.share-a.share)[0];
    const moved=Math.max(5,Math.round(donor.share*.25));
    donor.share=clamp(donor.share-moved,5,95);
    campaigns.push({id:`campaign-${campaigns.length+1}-${state.day}`,name:`${platform.short} campaign`,
      share:moved,paused:false,lander:donor.lander||"client_site",platform:platformId,
      secondaryPlatformId:null,secondaryShare:0,pacing:client.pacing||"steady",strategy:client.strategy||"balanced",
      adConceptId:client.adConceptId,adFormat:client.adFormat,creative:82,adSets:[],implicit:false});
    client.campaigns=campaigns;
    state.focusRemaining-=2;state.cash-=check.cash;
    if(check.cash){addMonthCost(state,"onboarding",check.cash);state.opsCost+=check.cash;}
    creditBuyingWork(client,state,{full:true});
    client.lastAction=`${platform.short} account opened · day ${state.day}`;
    state.log.unshift({concept:"structure",html:`<div><b>Second ad account opened</b> · ${esc(client.name)} now buys on ${esc(platform.label)} alongside what it already ran. ${esc(platform.pros)} The new account took ${moved}% of the plan from the biggest campaign, so the client spends the same money across more places until you re-weight it.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function targetingOptions(client,state=S,campaign=null){
    const platform=campaign&&campaign.platform?AGENCY_PLATFORMS[campaign.platform]:null;
    const channel=platform?AGENCY_CHANNELS[platform.channel]:null;
    const family=(channel||channelOf(client)).family;
    return Object.values(AGENCY_TARGETING).filter(item=>item.families.includes(family)&&
      (!item.requiresTech||hasTech(item.requiresTech,state)));
  }
  function defaultTargetingFor(client,state=S){
    const options=targetingOptions(client,state);
    return (options.find(item=>item.id==="phrase_intent")||options.find(item=>item.id==="broad_audience")||options[0]||null)?.id||null;
  }
  function adSetsOf(campaign,client,state=S){
    if(Array.isArray(campaign?.adSets)&&campaign.adSets.length)return campaign.adSets;
    /* The implicit ad set IS the campaign, reaching the platform's whole pool. It carries no
       targeting modifiers, so a campaign nobody has divided behaves exactly as it did before
       this layer existed. Targeting only starts shaping delivery once the player picks it. */
    return [{id:"primary",share:100,targeting:null,implicit:true}];
  }
  function canSplitCampaign(client,campaign,state=S){
    if(!hasTech("audience_structure",state))return {ok:false,reason:"Needs the ad set and audience structure capability"};
    if(adSetsOf(campaign,client,state).length>=MAX_AD_SETS)return {ok:false,reason:`A campaign holds at most ${MAX_AD_SETS} ad sets`};
    if(targetingOptions(client,state).length<2)return {ok:false,reason:"No second audience is available on this channel"};
    if(state.focusRemaining<1)return {ok:false,reason:"Needs 1 focus"};
    return {ok:true,reason:"Ready"};
  }
  function splitCampaign(clientId,campaignId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client)return false;
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    const campaign=campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    const check=canSplitCampaign(client,campaign,state);if(!check.ok)return refuseAgency(check.reason||"That is not available yet.");
    const sets=adSetsOf(campaign,client,state).map(item=>({...item,implicit:false,
      targeting:item.targeting||defaultTargetingFor(client,state)}));
    const used=new Set(sets.map(item=>item.targeting));
    const next=targetingOptions(client,state).find(item=>!used.has(item.id));if(!next)return false;
    const taken=Math.min(40,Math.max(10,Math.round(sets[0].share/3/5)*5));
    sets[0].share-=taken;
    sets.push({id:`adset-${sets.length+1}-${state.day}`,share:taken,targeting:next.id,implicit:false});
    campaign.adSets=sets;client.campaigns=campaigns;
    state.focusRemaining--;creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"structure",html:`<div><b>${esc(campaign.name)} divided into ${sets.length} ad sets</b> · ${esc(client.name)} now tests ${esc(next.label.toLowerCase())} on ${taken}% of that campaign. ${esc(next.tradeoff)}</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function setAdSetTargeting(clientId,campaignId,adSetId,targetingId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),spec=AGENCY_TARGETING[targetingId];
    if(!state||state.ended||!client||!spec)return false;
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and continue tomorrow.");
    if(!targetingOptions(client,state).some(item=>item.id===targetingId))return refuseAgency("That audience is not unlocked for this account yet. Capabilities unlock the targeting you can buy.");
    const campaigns=campaignsOf(client).map(item=>({...item,implicit:false}));
    const campaign=campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    const sets=adSetsOf(campaign,client,state).map(item=>({...item,implicit:false}));
    const set=sets.find(item=>item.id===adSetId);if(!set||set.targeting===targetingId)return false;
    set.targeting=targetingId;campaign.adSets=sets;client.campaigns=campaigns;
    state.focusRemaining--;creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"structure",html:`<div><b>Audience changed</b> · ${esc(client.name)} · ${esc(campaign.name)} now targets ${esc(spec.label.toLowerCase())}. ${esc(spec.note)}</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function campaignsOf(client){
    if(Array.isArray(client?.campaigns)&&client.campaigns.length)return client.campaigns;
    /* The implicit primary campaign IS the client's own plan fields, so nothing changes for a
       player who never splits an account. */
    return [{id:"primary",name:"Primary campaign",share:100,paused:false,lander:client?.lander||"client_site",platform:client?.platform??null,
      secondaryPlatformId:client?.secondaryPlatformId??null,secondaryShare:Number(client?.secondaryShare)||0,
      pacing:client?.pacing||"steady",strategy:client?.strategy||"balanced",
      adConceptId:client?.adConceptId,adFormat:client?.adFormat,creative:Number(client?.creative)||70,implicit:true}];
  }
  function canSplitAccount(client,state=S){
    if(!hasTech("campaign_structure",state))return {ok:false,reason:"Needs the multi-campaign account structure capability"};
    if(campaignsOf(client).length>=MAX_CAMPAIGNS)return {ok:false,reason:`A client account holds at most ${MAX_CAMPAIGNS} campaigns`};
    if(state.focusRemaining<2)return {ok:false,reason:"Needs 2 focus"};
    return {ok:true,reason:"Ready"};
  }
  function splitAccount(clientId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||state.businessModel!=="agency"||!client)return false;
    const check=canSplitAccount(client,state);if(!check.ok)return refuseAgency(check.reason||"That is not available yet.");
    const existing=campaignsOf(client).map(campaign=>({...campaign,implicit:false}));
    /* A new campaign takes a quarter of the account's budget from the primary and starts on
       the same plan, so the split itself changes structure rather than strategy. */
    const donor=existing[0],taken=Math.min(40,Math.max(10,Math.round(donor.share/4/5)*5));
    donor.share=donor.share-taken;
    const offer=offerOf(client),pool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const nextConcept=pool.find(item=>item.id!==donor.adConceptId)||pool[0]||null;
    existing.push({id:`campaign-${existing.length+1}-${state.day}`,name:`Campaign ${existing.length+1}`,share:taken,
      platform:client.platform??null,secondaryPlatformId:null,secondaryShare:0,pacing:client.pacing||"steady",
      strategy:client.strategy||"balanced",adConceptId:nextConcept?nextConcept.id:client.adConceptId,
      adFormat:nextConcept?adFormatFor(nextConcept,client.channel):client.adFormat,creative:78,implicit:false});
    client.campaigns=existing;
    state.focusRemaining-=2;creditBuyingWork(client,state);
    state.log.unshift({concept:"structure",html:`<div><b>Account split into ${existing.length} campaigns</b> · ${esc(client.name)} now runs ${existing.map(campaign=>`${esc(campaign.name)} at ${campaign.share}%`).join(", ")}. Each campaign buys its own media and reports its own results; every one is another surface to keep serviced.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function adjustCampaignShare(clientId,campaignId,direction,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client||!Array.isArray(client.campaigns)||client.campaigns.length<2)return false;
    const index=client.campaigns.findIndex(campaign=>campaign.id===campaignId);
    if(index<0)return false;
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and rebalance tomorrow.");
    const step=direction==="down"?-5:5,target=client.campaigns[index];
    const donorIndex=client.campaigns.findIndex((campaign,position)=>position!==index&&
      (direction==="down"?true:campaign.share-step>=5));
    if(donorIndex<0)return false;
    const next=clamp(target.share+step,5,95);if(next===target.share)return refuseAgency("That campaign is already at the edge of its share. One campaign has to keep at least 5% of the budget.");
    const moved=next-target.share;
    target.share=next;client.campaigns[donorIndex].share=clamp(client.campaigns[donorIndex].share-moved,5,95);
    state.focusRemaining--;creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"structure",html:`<div><b>Budget moved between campaigns</b> · ${esc(client.name)}: ${esc(target.name)} now takes ${target.share}% of ${safeMoney(client.mediaBudget)}.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function setCampaignFacet(clientId,campaignId,facet,valueId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||!client||!Array.isArray(client.campaigns))return false;
    const campaign=client.campaigns.find(item=>item.id===campaignId);if(!campaign)return false;
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and change the campaign tomorrow.");
    if(facet==="pacing"&&AGENCY_PACING[valueId])campaign.pacing=valueId;
    else if(facet==="strategy"){const check=strategyAvailable(valueId,client,state);if(!check.ok)return refuseAgency(check.reason||"That doctrine is not available on this campaign yet.");campaign.strategy=valueId;}
    else if(facet==="platform"){const platform=AGENCY_PLATFORMS[valueId];
      if(!platform||platform.channel!==client.channel||!platformsForChannel(client.channel,state).some(item=>item.id===valueId))return false;
      campaign.platform=valueId;if(campaign.secondaryPlatformId===valueId){campaign.secondaryPlatformId=null;campaign.secondaryShare=0;}}
    else return false;
    state.focusRemaining--;creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"structure",html:`<div><b>${esc(campaign.name)} updated</b> · ${esc(client.name)}'s campaign now runs ${facet==="pacing"?esc(AGENCY_PACING[valueId].label.toLowerCase()):facet==="strategy"?esc(AGENCY_STRATEGIES[valueId].label.toLowerCase()):esc(AGENCY_PLATFORMS[valueId].label)}.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  /* Services sold TO a client. Each raises the retainer, changes one named part of that
     client's funnel, and fades without upkeep — so selling one is a commitment, not a toggle. */
  function clientServicesOf(client){
    const held=client&&typeof client.services==="object"&&client.services?client.services:{};
    return Object.values(AGENCY_CLIENT_SERVICES).map(spec=>({spec,strength:clamp(Number(held[spec.id])||0,0,100)}))
      .filter(entry=>entry.strength>0);
  }
  function clientServiceStrength(client,effect){
    return clientServicesOf(client).filter(entry=>entry.spec.effect===effect)
      .reduce((sum,entry)=>sum+entry.strength/100,0);
  }
  function canSellService(client,serviceId,state=S){
    const spec=AGENCY_CLIENT_SERVICES[serviceId];if(!spec)return {ok:false,reason:"Unknown service"};
    if(client.services&&Number(client.services[serviceId])>0)return {ok:false,reason:"Already running"};
    if(spec.tech&&!hasTech(spec.tech,state))return {ok:false,reason:`Needs ${node(spec.tech)?.label||spec.tech}`};
    if(client.trust<45)return {ok:false,reason:"Needs 45% client trust to propose new work"};
    const setup=roundTo(spec.setup*eraCostFactor(state),50);
    if(state.cash-setup < -state.creditLimit)return {ok:false,reason:`Needs ${safeMoney(setup)}`};
    if(state.focusRemaining<2)return {ok:false,reason:"Needs 2 focus"};
    return {ok:true,reason:"Ready",setup,fee:roundTo(budgetBaselineOf(client)*0+client.fee*spec.feeM,50)};
  }
  function sellClientService(clientId,serviceId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),spec=AGENCY_CLIENT_SERVICES[serviceId];
    if(!state||state.ended||state.businessModel!=="agency"||!client||!spec)return false;
    const check=canSellService(client,serviceId,state);if(!check.ok)return refuseAgency(check.reason||"That is not available yet.");
    state.focusRemaining-=2;state.cash-=check.setup;addMonthCost(state,"clientService",check.setup);state.opsCost+=check.setup;
    if(!client.services||typeof client.services!=="object")client.services={};
    client.services[serviceId]=45;
    client.fee=roundTo(client.fee+check.fee,50);
    client.trust=clamp(client.trust+2,0,100);creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"structure",html:`<div><b class="pos">${esc(spec.label)} sold to ${esc(client.name)}</b> · the retainer rises ${safeMoney(check.fee)} to ${safeMoney(client.fee)} per month and ${safeMoney(check.setup)} of setup entered the ledger. ${esc(spec.note)}</div>`});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }
  function workClientService(clientId,serviceId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),spec=AGENCY_CLIENT_SERVICES[serviceId];
    if(!state||state.ended||!client||!spec)return false;
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and continue tomorrow.");
    const current=Number(client.services?.[serviceId])||0;
    if(!current)return refuseAgency(`${esc(client.name)} is not buying that service yet. Sell it first, then it becomes work you can push.`);
    if(current>=100)return refuseAgency("That programme is already at full strength. Spend the focus somewhere it moves a number.");
    state.focusRemaining--;client.services[serviceId]=clamp(current+12,0,100);
    creditBuyingWork(client,state,{full:false});
    state.log.unshift({concept:"structure",html:`<div><b>${esc(spec.label)} advanced</b> · ${esc(client.name)}'s programme is now at ${Math.round(client.services[serviceId])}% strength.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function serviceLineSpec(id){return AGENCY_SERVICE_LINES[id]||null;}
  function serviceLinesForModel(state=S){
    const model=starterModel(state);
    return Object.values(AGENCY_SERVICE_LINES).filter(line=>line.models.includes(model.id));
  }
  function serviceLineState(state,id){return state.services&&typeof state.services==="object"?state.services[id]||null:null;}
  function activeServiceLines(state=S){
    return serviceLinesForModel(state).filter(line=>serviceLineState(state,line.id)?.active);
  }
  function canStartServiceLine(id,state=S){
    const line=serviceLineSpec(id);if(!line)return {ok:false,reason:"Unavailable"};
    if(!line.models.includes(starterModel(state).id))return {ok:false,reason:"Outside this company's model"};
    if(serviceLineState(state,id)?.active)return {ok:false,reason:"Already operating"};
    if(year(state)<line.year)return {ok:false,reason:`Available in ${line.year}`};
    if(line.requiresLine&&!serviceLineState(state,line.requiresLine)?.active)
      return {ok:false,reason:`Requires the ${serviceLineSpec(line.requiresLine)?.label||line.requiresLine} line`};
    const setup=roundTo(line.setup*eraCostFactor(state),50);
    if(state.cash<setup)return {ok:false,reason:`Needs ${safeMoney(setup)} in positive operating cash`};
    return {ok:true,reason:"Ready",setup};
  }
  function serviceLineMonthlyUpkeep(state=S){
    return roundTo(activeServiceLines(state).reduce((sum,line)=>sum+(Number(line.upkeep)||0),0)*eraCostFactor(state),10);
  }
  function serviceLineBilling(line,record,state=S){
    const momentum=clamp(Number(record?.momentum)||0,0,100);
    return roundTo(line.monthlyBase*(.35+momentum*.0065)*(0.8+clamp(state.reputation,0,100)*.004)*eraCostFactor(state),10);
  }
  function offerOf(value){
    const id=typeof value==="string"?value:value?.offerId;
    return AGENCY_OFFERS.find(item=>item.id===id)||AGENCY_OFFERS.find(item=>item.vertical===(value?.vertical||value))||AGENCY_OFFERS[0];
  }
  function conceptsForOffer(offer,channel,allowChannelFallback=false){
    const aligned=AGENCY_AD_CONCEPTS.filter(item=>item.vertical===offer.vertical&&item.offerIds.includes(offer.id));
    const exact=channel?aligned.filter(item=>item.channels.includes(channel)):[];
    return exact.length?exact:(allowChannelFallback||!channel?aligned:[]);
  }
  function adConceptOf(value){
    const id=typeof value==="string"?value:value?.adConceptId;
    const current=AGENCY_AD_CONCEPTS.find(item=>item.id===id);
    if(typeof value==="string"||!value?.offerId)return current||null;
    const offer=offerOf(value);
    const compatible=current?.offerIds.includes(offer.id)&&(value.channel==="search"||current.channels.includes(value.channel));
    return compatible?current:(conceptsForOffer(offer,value.channel,value.channel==="search")[0]||null);
  }
  function formatLabel(id){return ({radio_spot:"30-second radio spot",outdoor_board:"outdoor board",expanded_search_text:"expanded search text"})[id]||String(id||"ad").replace(/_/g," ");}
  function personalityOf(client){return PERSONALITIES[client.personality]||PERSONALITIES.evidence;}
  function safeMoney(n){return typeof money==="function"?money(Number(n)||0):`$${Math.round(Number(n)||0).toLocaleString()}`;}
  function pct(n){return `${Math.round(clamp(n,0,999))}%`;}
  function emptyMonthCostLedger(){return {onboarding:0,clientService:0,recruiting:0,equipmentSetup:0,severance:0,
    transformation:0,funnelDevelopment:0,compliance:0,other:0};}
  function emptyStaffDayLedger(){return Object.fromEntries(Object.keys(STAFF).map(id=>[id,0]));}
  function addMonthCost(state,key,amount){
    const value=Math.max(0,Number(amount)||0);if(!value)return 0;
    if(!state.monthCostLedger||typeof state.monthCostLedger!=="object")state.monthCostLedger=emptyMonthCostLedger();
    const bucket=Object.prototype.hasOwnProperty.call(state.monthCostLedger,key)?key:"other";
    state.monthCostLedger[bucket]=(Number(state.monthCostLedger[bucket])||0)+value;
    state.monthVariableCosts=(Number(state.monthVariableCosts)||0)+value;return value;
  }
  function accrueStaffThrough(state,throughDay){
    if(!state.monthStaffDays||typeof state.monthStaffDays!=="object")state.monthStaffDays=emptyStaffDayLedger();
    const through=Math.floor(clamp(throughDay,0,AGENCY_MONTH_DAYS)),from=Math.floor(clamp(state.staffAccruedThrough,0,AGENCY_MONTH_DAYS));
    const elapsed=Math.max(0,through-from);if(!elapsed)return 0;
    for(const id of Object.keys(STAFF))state.monthStaffDays[id]=(Number(state.monthStaffDays[id])||0)+(Number(state.staff[id])||0)*elapsed;
    state.staffAccruedThrough=through;return elapsed;
  }

  function desiredSeatsForMonth(monthNumber){
    const m=Math.max(1,Math.floor(monthNumber));
    if(m<=12)return FIRST_YEAR_TARGETS[m-1];
    /* The roster reaches the full 75 around month 72 of 120 -- late enough that scale is earned,
       early enough that the endgame crises land on an agency big enough to absorb them. */
    return Math.min(AGENCY_MAX_CLIENTS,Math.round(30+(m-12)*0.75));
  }
  /* MONTH 1 INTAKE (2026-08-10). Month 1 used to allow no prospects at all, which left most of
     its twenty days with nothing to decide. A client opens on each of days 2, 3, 4 and 5, one
     more at day 15, and Month 2 continues on the monthly curve. */
  function seatsAllowedNow(state=S){
    if(state.month>0)return desiredSeatsForMonth(state.month+1);
    const day=Math.max(1,Number(state.dayInMonth)||1);
    if(day>=15)return 6;
    if(day>=2)return 1+Math.min(4,day-1);
    return 1;
  }

  function unlockedChannelFamilies(state=S){
    const families=new Set();
    for(const channel of Object.values(AGENCY_CHANNELS))if(channelAllowed(channel.id,state)&&hasTech(channel.tech,state))families.add(channel.family);
    if(!families.size)families.add(starterModel(state).id==="creative_agency"?"interruption":"intent");
    return families;
  }

  function breadth(state=S,extra=null){
    const rows=activeClients(state).map(client=>({vertical:client.vertical,family:channelOf(client).family}));
    if(extra)rows.push({vertical:extra.vertical,family:channelOf(extra).family});
    const verticals=new Set(rows.map(row=>row.vertical)).size;
    const families=new Set(rows.map(row=>row.family)).size;
    const verticalCap=2+(hasTech("portfolio_measurement",state)?2:0)+(hasTech("predictive_ops",state)?1:0)+(hasTech("follow_the_sun",state)?1:0);
    const familyCap=1+(hasTech("agency_os",state)?1:0)+(hasTech("portfolio_measurement",state)?1:0)+(hasTech("agentic_ops",state)?1:0);
    const verticalOver=Math.max(0,verticals-verticalCap),familyOver=Math.max(0,families-familyCap);
    let multiplier=1+.08*verticalOver*verticalOver+.06*familyOver*familyOver;
    if(hasTech("portfolio_measurement",state))multiplier=1+(multiplier-1)*.62;
    return {verticals,families,verticalCap,familyCap,verticalOver,familyOver,multiplier};
  }

  function serviceCost(client,state=S){
    const t=typeOf(client),ch=channelOf(client),b=breadth(state);
    let cost=Math.ceil(t.work*2*ch.workM*b.multiplier*strategyEconomics(client,state).focus)+clientGeography(client,state).targetingSurcharge;
    if(hasTech("automation",state)&&client.channel==="search"&&client.health>=65&&!client.incident)cost--;
    if(hasTech("creative_studio",state)&&(ch.family==="interruption"||t.id.includes("commerce")))cost--;
    if(hasTech("measurement",state)&&client.incident?.id==="tracking")cost--;
    if(hasTech("distributed_qa",state)&&!client.incident?.critical)cost--;
    if(hasTech("agentic_ops",state)&&!client.incident?.critical)cost--;
    if(hasTech("automated_creative_pipeline",state)&&(ch.family==="interruption"||t.id.includes("commerce")))cost--;
    if(starterModel(state).id==="creative_agency"&&actionableCreativeChannel(client.channel))cost--;
    return Math.max(1,cost);
  }

  function actionableCreativeChannel(channel){return ["social","shortform","programmatic","out_of_home","radio","cable"].includes(channel);}

  function operationFocusCost(client,action,state=S){
    const spec=ACTIONS[action]||ACTIONS.service,geo=clientGeography(client,state),basis=Math.max(1,serviceCost(client,state)-(action==="service"?0:geo.targetingSurcharge));
    let cost=Math.max(1,Math.ceil(basis*spec.costM));
    if(action==="update")cost+=geo.coordinationSurcharge;
    if(action==="audit"&&state.staff.analyst)cost=Math.max(1,cost-Math.min(2,Math.ceil(state.staff.analyst/3)));
    if(action==="refresh"&&state.staff.creative)cost=Math.max(1,cost-Math.min(2,Math.ceil(state.staff.creative/3)));
    if(action==="update"&&state.staff.account)cost=Math.max(1,cost-Math.min(2,Math.ceil(state.staff.account/3)));
    if(hasTech("agentic_workbench",state)&&(action==="audit"||action==="update"))cost=Math.max(1,cost-1);
    if(hasTech("creative_automation",state)&&action==="refresh")cost=Math.max(1,cost-1);
    if(hasTech("automated_creative_pipeline",state)&&action==="refresh")cost=Math.max(1,cost-1);
    return cost;
  }
  function operationCashCost(action,state=S){
    if(action==="audit")return roundTo(250*(1-Math.min(.4,state.staff.analyst*.06))*(hasTech("agentic_workbench",state)?.8:1),50);
    if(action==="refresh"){
      let multiplier=1-Math.min(.4,state.staff.creative*.06);
      if(hasTech("workstation_fleet",state))multiplier*=.8;
      if(hasTech("creative_automation",state))multiplier*=.78;
      if(hasTech("automated_creative_pipeline",state))multiplier*=.72;
      if(hasTech("local_ai_cluster",state))multiplier*=.82;
      if(starterModel(state).id==="creative_agency")multiplier*=.72;
      return Math.max(50,roundTo(450*multiplier,50));
    }
    return 0;
  }

  function capacity(state=S){
    const staffFocus=Object.entries(state.staff).reduce((sum,[id,count])=>sum+(STAFF[id]?.focus||0)*count,0);
    const systemBonus=(hasTech("agency_os",state)?6:0)+(hasTech("predictive_ops",state)?8:0)+
      (hasTech("distributed_ops",state)?5:0)+(hasTech("distributed_qa",state)?3:0)+(hasTech("follow_the_sun",state)?10:0)+
      (hasTech("agentic_workbench",state)?4:0)+(hasTech("agentic_ops",state)?8:0)+
      (hasTech("creative_automation",state)?3:0)+(hasTech("automated_creative_pipeline",state)?6:0)+
      (hasTech("workstation_fleet",state)?2:0)+(hasTech("local_ai_cluster",state)?5:0);
    const raw=8+staffFocus+systemBonus;
    const committed=activeClients(state).reduce((sum,client)=>sum+serviceCost(client,state)/Math.max(2,typeOf(client).cadence),0);
    const utilization=raw?committed/raw:0;
    const overload=utilization>.85?1+Math.pow((utilization-.85)*2.2,2):1;
    return {raw,committed,utilization,overload,remaining:Math.max(0,state.focusRemaining)};
  }

  function continuityCapacity(state,raw){
    if(year(state)<2023)return {raw,loss:0,risk:0};
    let risk=.006;
    if(hasTech("resilient_network",state))risk*=.34;
    if(hasTech("satellite_failover",state))risk*=.16;
    if(roll("office-connectivity",state.day)>=risk)return {raw,loss:0,risk};
    const share=hasTech("satellite_failover",state)?.05:hasTech("resilient_network",state)?.10:.24;
    return {raw:Math.max(1,raw-Math.max(1,Math.ceil(raw*share))),loss:Math.max(1,Math.ceil(raw*share)),risk};
  }

  function pickOffer(verticalId,id,channel="search"){
    const verticalOffers=AGENCY_OFFERS.filter(item=>item.vertical===verticalId);
    const compatible=channel==="search"?verticalOffers:verticalOffers.filter(item=>conceptsForOffer(item,channel).length);
    const options=compatible.length?compatible:verticalOffers;
    return options[Math.floor(roll("offer",id)*options.length)]||AGENCY_OFFERS[0];
  }
  function pickOffice(id,ownerState,scope){
    const home=hqLocation(ownerState),homeChance=scope==="local"?.55:scope==="regional"?.46:.25,stayHome=roll("client-home-market",id)<homeChance;
    return stayHome?home:AGENCY_HQ_LOCATIONS[Math.floor(roll("client-office",id)*AGENCY_HQ_LOCATIONS.length)]||home;
  }
  function targetStatesFor(id,office,scope){
    if(scope==="national")return ["US"];
    if(scope==="local")return [office.stateCode];
    const pool=AGENCY_TARGET_STATE_POOLS[office.region]?.states||[office.stateCode],wanted=2+Math.floor(roll("target-state-count",id)*Math.min(4,pool.length));
    const ranked=pool.slice().sort((a,b)=>roll("target-state",id,a)-roll("target-state",id,b));
    return [office.stateCode,...ranked.filter(code=>code!==office.stateCode)].slice(0,Math.min(wanted,pool.length));
  }
  function conceptFor(verticalId,channel,id,offer){
    const resolvedOffer=offer&&offer.vertical===verticalId?offer:pickOffer(verticalId,id,channel),
      pool=conceptsForOffer(resolvedOffer,channel,channel==="search");
    if(pool.length)return pool[Math.floor(roll("ad-concept",id)*pool.length)];
    return {id:`ad-${resolvedOffer.id}`,offerIds:[resolvedOffer.id],vertical:resolvedOffer.vertical,label:`${resolvedOffer.label} — next step`,format:channel==="search"?"expanded_search_text":"static",
      channels:[channel],premise:`The ad names the ${resolvedOffer.label.toLowerCase()}, explains who it is for and asks the customer to complete one ${resolvedOffer.conversion}.`};
  }
  /* Real ad anatomy (2026-08-09). An ad in this game should read the way an ad reads in the
     platform that serves it: search ads have headlines, a description and a display path;
     social ads have primary text above the creative, a headline under it and a button;
     shopping ads are a title, price and a store name. Business and product names stay
     invented, but the STRUCTURE is not abstracted away. */
  /* A real display path is the domain plus up to two 15-character path fields. */
  function displayPathFor(client,offer){
    const domain=String(client?.name||"advertiser").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,18)||"advertiser";
    const words=String(offer?.label||"offer").toLowerCase().replace(/[^a-z0-9\s-]/g,"").split(/[\s-]+/).filter(Boolean);
    const fields=[];
    for(const word of words){
      if(!fields.length){fields.push(word.slice(0,15));continue;}
      const last=fields[fields.length-1];
      if(fields.length<2&&`${last}-${word}`.length>15)fields.push(word.slice(0,15));
      else if(`${last}-${word}`.length<=15)fields[fields.length-1]=`${last}-${word}`;
      else break;
    }
    return `${domain}.com/${fields.slice(0,2).join("/")}`;
  }
  function ctaFor(offer){
    const conversion=String(offer?.conversion||"").toLowerCase();
    if(/appointment|consultation|assessment|tour|session|meeting|audit/.test(conversion))return "Book now";
    if(/quote|estimate|inquiry|request|application/.test(conversion))return "Get a quote";
    if(/purchase|order|reservation|booking/.test(conversion))return "Shop now";
    if(/subscription|trial|enrollment|registration|membership|donation/.test(conversion))return "Sign up";
    return "Learn more";
  }
  /* REAL AD COPY (2026-08-09). The previous version pasted the concept's internal label into
     Headline 3 and its strategy premise into Description 1, so the ad read like a planning memo
     instead of an ad. Real responsive search ads are 30-character headlines and 90-character
     descriptions. The concept now picks an ANGLE; the angle picks short lines that fit. */
  const AD_LIMITS=Object.freeze({headline:30,description:90,path:15});
  const AD_ANGLES=Object.freeze({
    proof:{test:/proof|review|testimon|customer|neighbou?r|word|story|rated/,
      h:["Rated By Local Customers","See Verified Reviews","Neighbors Booked This Week","Real Results, Real Owners"],
      d:["Read what customers nearby said, then pick the time that works for you.",
         "Hundreds of local jobs finished. See the reviews before you decide."]},
    price:{test:/price|pricing|cost|afford|budget|financ|value|save|deal|quote/,
      h:["Upfront Price, No Surprises","Free Written Estimate","See Pricing First","Know The Cost Up Front"],
      d:["Written pricing before any work starts. No call-out fee, no surprise line items.",
         "Get the number in writing first, then decide. No pressure either way."]},
    speed:{test:/fast|speed|same.?day|urgent|emergen|quick|now|today|wait|rush/,
      h:["Same-Week Appointments","Openings Available Today","Fast Local Response","Book A Time This Week"],
      d:["Same-week openings on the schedule right now. Pick a window and lock it in.",
         "Most jobs scheduled within days, not weeks. Check what is still open."]},
    expertise:{test:/expert|licens|certif|train|specialist|pro|skill|experien|qualified/,
      h:["Licensed And Insured","Specialists, Not Generalists","Trained On Your System","Certified Local Crews"],
      d:["Licensed, insured crews who do this work daily. Ask for the credentials.",
         "The people who show up are the people who trained for this exact job."]},
    guarantee:{test:/guarant|warrant|risk|safe|protect|assur|back|promise/,
      h:["Workmanship Guaranteed","Backed By Written Warranty","Done Right Or We Return","No-Risk Scheduling"],
      d:["Written warranty on the work. If it fails inside the term, we come back.",
         "Every job carries a written guarantee. Cancel free before the crew is sent."]},
    problem:{test:/problem|issue|fail|break|leak|damage|repair|fix|symptom|before|worse/,
      h:["Fix It Before It Spreads","Small Problem, Small Bill","Catch It Early","Stop The Damage Now"],
      d:["Caught early it is a small repair. Left alone it is a replacement.",
         "The longer it runs unfixed, the more of the system it takes with it."]},
    seasonal:{test:/season|winter|summer|spring|fall|holiday|annual|weather|peak/,
      h:["Book Before The Rush","Get Ahead Of The Season","Beat The Seasonal Backlog","Schedule Before Peak"],
      d:["Schedules fill as the season turns. Booking early is how you pick the time.",
         "Peak weeks book out first. Get on the calendar while windows are open."]},
    local:{test:/local|area|neighbo|communit|near|city|region|home/,
      h:["Serving Your Area","Local Crews, Local Rates","Based Near You","Your Neighborhood Team"],
      d:["A local crew covering your area, not a call centre routing you elsewhere.",
         "We work this area every week. You get a real name and a real number."]}
  });
  const AD_FALLBACK=Object.freeze({h:["Straight Answers, Fair Price","Get The Details First","See What Is Included","Ask Before You Commit"],
    d:["See exactly what is included and what it costs before you commit to anything.",
       "Straight pricing, clear scope, and a person who answers when you call."]});
  function titleCaseAd(text){return String(text||"").replace(/(^|[\s\-\/])([a-z])/g,(all,lead,letter)=>lead+letter.toUpperCase());}
  function fitAd(text,limit){const clean=String(text||"").trim();if(clean.length<=limit)return clean;
    const cut=clean.slice(0,limit);const space=cut.lastIndexOf(" ");return (space>limit*0.6?cut.slice(0,space):cut).replace(/[\s,.;:-]+$/,"");}
  function adAngleFor(concept,offer){
    const hay=`${concept?.id||""} ${concept?.label||""} ${concept?.premise||""} ${offer?.label||""}`.toLowerCase();
    const hit=Object.keys(AD_ANGLES).find(key=>AD_ANGLES[key].test.test(hay));
    return hit?AD_ANGLES[hit]:AD_FALLBACK;
  }
  function pickAdLine(list,version,offset){return list[(Math.max(1,version)-1+offset)%list.length];}
  function adCopyFor(concept,offer,office,channel,version=1,client=null){
    const cta=ctaFor(offer),path=displayPathFor(client,offer),angle=adAngleFor(concept,offer);
    const conversion=String(offer?.conversion||"quote").toLowerCase();
    const offerHead=fitAd(titleCaseAd(offer?.label||"Our Service"),AD_LIMITS.headline);
    if(channel==="search"){
      const h2=fitAd(pickAdLine(angle.h,version,0),AD_LIMITS.headline);
      const h3=fitAd(pickAdLine(angle.h,version,1),AD_LIMITS.headline);
      const d1=fitAd(pickAdLine(angle.d,version,0),AD_LIMITS.description);
      const d2=fitAd(`Check availability and request your ${conversion}. ${cta}.`,AD_LIMITS.description);
      return `Headline 1: ${offerHead}\nHeadline 2: ${h2}\nHeadline 3: ${h3}\n`+
        `Description 1: ${d1}\nDescription 2: ${d2}\nDisplay path: ${path}`;
    }
    if(channel==="shopping"){
      return `Product title: ${fitAd(titleCaseAd(offer?.label||"Product"),150)}\nStore: ${client?.name||"the advertiser"}\n`+
        `Detail: ${fitAd(pickAdLine(angle.d,version,0),AD_LIMITS.description)}\nLanding page: ${path}`;
    }
    return `Primary text: ${fitAd(pickAdLine(angle.d,version,0),125)}\nHeadline: ${offerHead}\n`+
      `Link description: ${fitAd(pickAdLine(angle.h,version,1),AD_LIMITS.headline)}\nCall to action: ${cta}\nDestination: ${path}`;
  }
  function adFormatFor(concept,channel){return channel==="search"?"expanded_search_text":channel==="shopping"?"product_listing":concept.format;}
  function rewriteClientAd(client,state=S){
    const offer=offerOf(client),office=hqLocation(client.officeId),version=Math.max(1,Number(client.creativeVersion)||1)+1;
    const pool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const current=pool.findIndex(item=>item.id===client.adConceptId),concept=pool.length?pool[(Math.max(0,current)+1+Math.floor(roll("rewrite",client.id,version)*pool.length))%pool.length]:
      conceptFor(client.vertical,client.channel,`${client.id}-${version}`,offer);
    client.creativeVersion=version;client.adConceptId=concept.id;client.adFormat=adFormatFor(concept,client.channel);
    client.adCopy=adCopyFor(concept,offer,office,client.channel,version,client);return concept;
  }
  function enrichClient(client,state){
    const vertical=AGENCY_VERTICALS.find(item=>item.id===client.vertical)||AGENCY_VERTICALS[0],offer=pickOffer(vertical.id,client.id,client.channel),context=AGENCY_VERTICAL_CONTEXT[vertical.id]||{};
    const t=typeOf(client),baseCustomerValue=t.id==="smb_leadgen"?420:t.id==="enterprise_leadgen"?2600:t.id==="smb_commerce"?95:180;
    const office=pickOffice(client.id,state,offer.scope),targetStates=targetStatesFor(client.id,office,offer.scope),concept=conceptFor(vertical.id,client.channel,client.id,offer);
    return {...client,offerId:offer.id,officeId:office.id,marketScope:offer.scope,targetStates,accountTimezone:office.timezone,
      adConceptId:concept.id,adFormat:adFormatFor(concept,client.channel),adCopy:adCopyFor(concept,offer,office,client.channel,1,client),creativeVersion:1,
      customer:context.customer||"People evaluating the advertised service or product",stakes:context.stakes||"The offer and next step must match what the customer will receive.",
      leadsDelivered:0,leadsAccepted:0,
      customerValue:roundTo(baseCustomerValue*(.75+roll("customer-value",client.id)*.5),10)};
  }

  function alignClientCreative(client){
    let offer=offerOf(client);const current=AGENCY_AD_CONCEPTS.find(item=>item.id===client.adConceptId),search=client.channel==="search";
    if(current?.vertical===client.vertical&&current.offerIds.includes(offer.id)&&(search||current.channels.includes(client.channel))&&
      client.adFormat===adFormatFor(current,client.channel))return client;
    if(!search&&!conceptsForOffer(offer,client.channel).length)offer=pickOffer(client.vertical,client.id,client.channel);
    const concept=conceptFor(client.vertical,client.channel,client.id,offer),version=Math.max(1,Number(client.creativeVersion)||1),office=hqLocation(client.officeId);
    return {...client,offerId:offer.id,adConceptId:concept.id,adFormat:adFormatFor(concept,client.channel),
      adCopy:adCopyFor(concept,offer,office,client.channel,version,client)};
  }

  function assignClientPlatform(verticalId,channel,id,ownerState){
    const fallback=defaultPlatformFor(channel);if(!fallback)return null;
    const available=platformsForChannel(channel,ownerState||S||{month:0}).map(platform=>platform.id);
    if(channel==="social"&&AGENCY_B2B_VERTICALS.includes(verticalId)&&available.includes("linkedin_ads")&&roll("client-platform",id)<.6)return "linkedin_ads";
    if(channel==="search"&&available.includes("microsoft_search")&&roll("client-platform",id)<.14)return "microsoft_search";
    return fallback;
  }
  function makeClient(id,typeId,createdMonth,options={}){
    const t=AGENCY_CLIENT_TYPES[typeId]||AGENCY_CLIENT_TYPES.smb_leadgen;
    const matching=AGENCY_VERTICALS.filter(vertical=>vertical.fit.includes(t.id));
    const vertical=options.vertical||matching[Math.floor(roll("vertical",id)*matching.length)]||AGENCY_VERTICALS[0];
    const prefix=AGENCY_NAME_PREFIX[Math.floor(roll("prefix",id)*AGENCY_NAME_PREFIX.length)];
    const suffixes=AGENCY_NAME_SUFFIX[vertical.id]||["Company"];
    const suffix=suffixes[Math.floor(roll("suffix",id)*suffixes.length)];
    const personalities=Object.keys(PERSONALITIES),personality=personalities[Math.floor(roll("personality",id)*personalities.length)];
    const fee=roundTo(t.fee*(.9+roll("fee",id)*.22),50),mediaBudget=roundTo(t.mediaBudget*(.78+roll("media",id)*.5),500);
    const channel=options.channel||"search",offer=options.offerId?offerOf(options.offerId):pickOffer(vertical.id,id,channel),marketScope=options.marketScope||offer.scope;
    const verticalContext=AGENCY_VERTICAL_CONTEXT[vertical.id]||{customer:"People evaluating the advertised service or product",stakes:"The offer, qualification rules and next step must match what the customer will actually receive."};
    const baseCustomerValue=t.id==="smb_leadgen"?420:t.id==="enterprise_leadgen"?2600:t.id==="smb_commerce"?95:180;
    const customerValue=options.customerValue||roundTo(baseCustomerValue*(.75+roll("customer-value",id)*.5),10);
    const ownerState=options.ownerState||S||{agencyIdentity:queryAgencyIdentity()},office=options.officeId?hqLocation(options.officeId):pickOffice(id,ownerState,marketScope);
    const targetStates=Array.isArray(options.targetStates)?options.targetStates.slice():targetStatesFor(id,office,marketScope);
    const concept=conceptFor(vertical.id,channel,id,offer),creativeVersion=options.creativeVersion||1;
    return {id,name:options.name||`${prefix} ${suffix}`,typeId:t.id,vertical:vertical.id,channel,
      platform:options.platform!==undefined?options.platform:assignClientPlatform(vertical.id,channel,id,ownerState),
      pacing:AGENCY_PACING[options.pacing]?options.pacing:"steady",
      secondaryPlatformId:options.secondaryPlatformId??null,secondaryShare:Number(options.secondaryShare)||0,
      campaignHistory:Array.isArray(options.campaignHistory)?options.campaignHistory.slice(-10):[],planChangedDay:Number(options.planChangedDay)||0,campaigns:[],services:{},
      strategy:AGENCY_STRATEGIES[options.strategy]?options.strategy:"balanced",budgetBaseline:Number(options.budgetBaseline)||mediaBudget,
      offerId:offer.id,officeId:office.id,marketScope,targetStates,accountTimezone:options.accountTimezone||office.timezone,
      adConceptId:concept.id,adFormat:adFormatFor(concept,channel),adCopy:options.adCopy||adCopyFor(concept,offer,office,channel,creativeVersion,{name:options.name||`${prefix} ${suffix}`}),creativeVersion,
      customer:options.customer||verticalContext.customer,stakes:options.stakes||verticalContext.stakes,customerValue,
      status:"active",createdMonth,createdDay:options.createdDay??1,fee,mediaBudget,terms:t.id.startsWith("enterprise")?30+(roll("terms",id)>.6?15:0):15,
      trust:options.trust??68,health:options.health??70,performance:options.performance??96,measurement:options.measurement??72,
      creative:options.creative??78,serviceDebt:0,nextDue:options.nextDue??1,incident:null,incidentAge:0,
      personality,insight:0,lastAction:"New account",lastOperatedDay:0,contractEndMonth:createdMonth+12,
      clientMediaSpend:0,clientModeledValue:0,clientReportedValue:0,validatedOutcomes:0,history:[]};
  }

  const AGENCY_OPENINGS=Object.freeze([
    {id:"founder-referral",label:"Founder referral",brief:"The first client arrives with ordinary trust, usable tracking and no operating team behind you.",trust:68,health:70,performance:96,measurement:72,creative:78,feeM:1,reputation:62},
    {id:"measurement-cleanup",label:"Measurement cleanup",brief:"The relationship is sound, but the inherited conversion path is poorly documented.",trust:72,health:65,performance:93,measurement:44,creative:72,feeM:1.04,reputation:63},
    {id:"underpriced-retainer",label:"Underpriced anchor client",brief:"The client is friendly and stable, but the retainer leaves little room for company overhead.",trust:78,health:73,performance:98,measurement:75,creative:76,feeM:.72,reputation:66},
    {id:"stale-creative",label:"Stale creative handoff",brief:"The account still produces leads, but its message has been run too long and needs a production plan.",trust:66,health:62,performance:87,measurement:76,creative:38,feeM:1.08,reputation:61},
    {id:"skeptical-owner",label:"Skeptical owner",brief:"Past agency communication damaged the relationship. Results alone will not rebuild trust.",trust:55,health:72,performance:99,measurement:68,creative:74,feeM:1.18,reputation:57},
    {id:"warm-handoff",label:"Warm handoff",brief:"The founding account begins healthy, but expectations and the monthly fee are both higher.",trust:82,health:79,performance:104,measurement:81,creative:84,feeM:1.24,reputation:69}
  ]);
  const HOLDING_OFFERS=Object.freeze([
    {verticalId:"home-intent",name:"Roofline Project Match",audience:"Homeowners comparing a repair or replacement project",stakes:"Poorly qualified requests consume contractor time and weaken payout quality.",adConcept:"Storm-damage checklist",adFormat:"native long-copy"},
    {verticalId:"consumer-finance",name:"Copperline Business Funding Match",audience:"Small-business owners comparing funding structures",stakes:"Eligibility, rates and repayment terms must remain clear while every accepted application is validated.",adConcept:"Three ways to fund one equipment purchase",adFormat:"animated explainer"},
    {verticalId:"wellness",name:"Daybreak Routine Plan",audience:"Adults comparing a practical daily wellness routine",stakes:"The message must describe the routine accurately without promising a medical outcome.",adConcept:"A complete morning routine in four steps",adFormat:"long-copy video"},
    {verticalId:"software",name:"Pocket Atlas Utility Trial",audience:"People looking for a simpler way to organize recurring personal tasks",stakes:"A trial counts only when the user activates and continues using the product.",adConcept:"The Tuesday task nobody remembered",adFormat:"short-form story"},
    {verticalId:"commerce",name:"Driftwood Compact Home Kit",audience:"Apartment residents comparing useful products for limited space",stakes:"The product must match the dimensions and features shown or returns erase the apparent gain.",adConcept:"A full storage reset in one corner",adFormat:"demonstration video"}
  ]);
  function holdingOffer(verticalId){return HOLDING_OFFERS.find(item=>item.verticalId===verticalId)||HOLDING_OFFERS[0];}
  function agencyOpeningProfile(seed=SEED){if(Number(seed)===2601)return AGENCY_OPENINGS[0];
    return AGENCY_OPENINGS[Math.floor(keyedRandom(seed,"agency-career","agency-opening",0)*AGENCY_OPENINGS.length)];}

  function guidedStartRequested(){try{return QUERY.get("guided")==="1"||QUERY.get("tutorial")==="1";}catch(e){return false;}}

  function initialState(){
    const opening=agencyOpeningProfile(),agencyIdentity=queryAgencyIdentity(),model=starterModel(agencyIdentity.agencyType),tutorialEnabled=guidedStartRequested();
    const businessModel=model.id==="holding_company"?"affiliate":"agency",state={engine:"agency-career",agencyModelVersion:AGENCY_MODEL_VERSION,seedShown:SEED,totalDays:TOTAL_DAYS,
      agencyIdentity,day:1,month:0,dayInMonth:1,ended:false,outcome:null,businessModel,startReserve:DAILY_BUDGET,
      cash:DAILY_BUDGET,creditLimit:50000,cumulativeRevenue:0,cumulativeCosts:0,cumulativeProfit:0,peakProfit:0,
      spendTotal:0,mediaSpendTotal:0,opsCost:0,monthVariableCosts:0,monthClientMediaSpend:0,monthAffiliateSpend:0,monthAffiliateEarned:0,monthAffiliateCollected:0,
      level:1,skillPoints:1,unlocked:model.startingUnlocks.filter(id=>node(id)),staff:{buyer:0,account:0,creative:0,ops:0,analyst:0},
      clients:[],archivedClients:[],prospects:[],receivables:[],affiliate:null,reputation:opening.reputation,focusTotal:8,focusRemaining:8,
      targetSeats:businessModel==="agency"?1:0,filter:"attention",rosterPage:0,payrollMisses:0,services:{},bizDevPoints:0,monthCostLedger:emptyMonthCostLedger(),
      monthStaffDays:emptyStaffDayLedger(),staffAccruedThrough:0,
      lastOperatingStatement:null,lastSettlementId:null,unpaidOperatingBalance:0,insolvencyCause:null,
      pendingInteraction:null,monthlyHistory:[],log:[],
      tutorialEnabled,tutorialStep:tutorialEnabled?0:4,eraSeen:[2017],telemetry:{daysOperated:0,accountsOperated:0,incidentsResolved:0,incidentsMissed:0,
        clientUpdates:0,clientInsights:0,clientsAccepted:0,clientsRejected:0,clientsChurned:0,staffHired:0,staffReleased:0,
        techUnlocked:0,delegated:0,capacityOverloadDays:0,growthGatesMet:0,growthGatesMissed:0,profitLevels:0,pivoted:false,affiliateShutdowns:0,
        liquidityWarnings:0,operatingInsolvencies:0,clientMediaSpend:0,clientModeledValue:0,agencyRevenue:0,agencyCosts:0}};
    if(model.id==="holding_company"){
      const verticals=AFFILIATE_VERTICALS.slice().sort((a,b)=>roll("holding-starter",a.id)-roll("holding-starter",b.id)).slice(0,3);
      state.affiliate={pivotMonth:0,posture:"documented",origin:"holding-company",preserved:null,funnels:verticals.map((vertical,index)=>{
        const offer=holdingOffer(vertical.id);return {id:`funnel-${index+1}`,name:offer.name,verticalId:vertical.id,dailyBudget:[500,650,400][index],
          fatigue:4+index*2,signal:64-index*3,complianceHeat:10+vertical.compliance*6,pausedDays:0,last:null,
          audience:offer.audience,stakes:offer.stakes,adConcept:offer.adConcept,adFormat:offer.adFormat};})};
    }else{
      const founder=makeClient("client-001","smb_leadgen",0,{ownerState:state,...(Number(SEED)===2601?{name:"Lantern Fox Home Services"}:{}),
        channel:model.id==="creative_agency"?"social":"search",nextDue:1,trust:opening.trust,health:opening.health,
        performance:opening.performance,measurement:opening.measurement,creative:model.id==="creative_agency"?Math.min(opening.creative,48):opening.creative});
      founder.fee=roundTo(founder.fee*opening.feeM,50);state.clients.push(founder);
    }
    prepareDay(state,true);
    const home=hqLocation(state),openingCopy=model.id==="holding_company"?
      `${state.affiliate.funnels.map(funnel=>esc(funnel.name)).join(", ")} are ready for controlled tests. There are no clients, retainers or client-loss checks; ${esc(agencyIdentity.name)} funds every media dollar and waits for validated payouts.`:
      `${esc(opening.brief)} The founding client is based in ${esc(hqLocation(state.clients[0].officeId).city)}, and sells ${esc(offerOf(state.clients[0]).label.toLowerCase())} through ${esc(channelOf(state.clients[0]).label.toLowerCase())}.`;
    state.log.unshift({concept:"structure",html:`<div><b>January 2017 · ${esc(agencyIdentity.name)} opens in ${esc(home.city)}, ${esc(home.state)}.</b> ${openingCopy} ${esc(model.channelRule)}</div>`});
    return state;
  }

  function incidentFor(state,client){
    if(client.incident)return client.incident;
    const era=AGENCY_ERAS.find(item=>item.year===year(state))||AGENCY_ERAS[0];
    let chance=(.012+typeOf(client).risk*.012+(client.serviceDebt>3?.02:0))*(era.flags.enforcement||1)*pacingOf(client).incidentM*strategyEconomics(client,state).incident;
    if(hasTech("predictive_ops",state)&&client.health>=65&&client.serviceDebt<2)chance*=.68;
    if(hasTech("distributed_ops",state)&&!hasTech("distributed_qa",state))chance*=1.08;
    if(hasTech("distributed_qa",state))chance*=.80;
    if(hasTech("agentic_workbench",state))chance*=.92;
    if(hasTech("agentic_ops",state))chance*=.84;
    chance*=clamp(1-state.staff.ops*.018,.68,1);
    if(roll("incident",state.day,client.id)>=chance)return null;
    const template=AGENCY_INCIDENTS[Math.floor(roll("incident-kind",state.day,client.id)*AGENCY_INCIDENTS.length)];
    if(template.id==="tracking"){
      const resilience=(hasTech("measurement",state)?.2:0)+(hasTech("first_party",state)?.18:0)+Math.min(.22,state.staff.analyst*.035);
      if(roll("tracking-resilience",state.day,client.id)<resilience)return null;
    }
    const critical=roll("incident-critical",state.day,client.id)<(.12+(client.typeId.startsWith("enterprise")?.13:0));
    client.incident={id:template.id,label:template.label,copy:template.copy,concept:template.concept,critical,openedDay:state.day};
    client.incidentAge=0;
    return client.incident;
  }

  function prepareDay(state=S,initial=false){
    if(state.ended)return state;
    const cap=capacity(state),continuity=initial?{raw:cap.raw,loss:0}:continuityCapacity(state,cap.raw);
    state.focusTotal=continuity.raw;state.focusRemaining=continuity.raw;
    if(continuity.loss){state.log.unshift({concept:"structure",html:`<div><b class="amb">Office connectivity disruption</b> · ${continuity.loss} focus unit${continuity.loss===1?" was":"s were"} lost today. ${hasTech("satellite_failover",state)?"The non-terrestrial backup limited the interruption; an external dependency still failed.":hasTech("resilient_network",state)?"The secondary network and power reserve limited the interruption.":"No tested secondary path was available."}</div>`});state.log=state.log.slice(0,180);}
    for(const client of activeClients(state))incidentFor(state,client);
    if(!initial&&cap.utilization>.85)state.telemetry.capacityOverloadDays++;
    return state;
  }

  function refreshCapacity(state=S,spent=null){
    const used=spent===null?Math.max(0,state.focusTotal-state.focusRemaining):Math.max(0,spent);
    const next=continuityCapacity(state,capacity(state).raw).raw;
    state.focusTotal=next;state.focusRemaining=Math.max(0,next-used);
    return state;
  }

  function collectReceivables(state,lines=[]){
    const due=state.receivables.filter(item=>item.dueDay<=state.day),pending=state.receivables.filter(item=>item.dueDay>state.day);
    let total=0,affiliateCollected=0;
    for(const item of due){
      let amount=item.amount;
      if(item.kind==="affiliate"){
        const clawback=roll("clawback",item.id)<item.clawbackRisk?amount*(.04+roll("clawback-size",item.id)*.10):0;
        amount-=clawback;
        if(clawback)lines.push(`<b class="neg">Payout adjustment</b> · ${safeMoney(clawback)} was removed after validation.`);
      }
      total+=amount;if(item.kind==="affiliate")affiliateCollected+=amount;
    }
    state.receivables=pending;state.cash+=total;state.monthAffiliateCollected=(state.monthAffiliateCollected||0)+affiliateCollected;
    if(total)lines.push(`<b class="pos">Collections settled</b> · ${safeMoney(total)} reached the operating account.`);
    return total;
  }

  function routineDue(client,state=S){return state.day>=client.nextDue;}
  function managedClients(state=S){return activeClients(state).filter(client=>client.createdMonth<state.month||client.lastOperatedDay>=client.createdDay);}
  function clientPriority(client,state=S){return (client.incident?.critical?1000:0)+(client.incident?300:0)+(routineDue(client,state)?150:0)+client.serviceDebt*18+(100-client.trust)+(100-client.health);}

  function resolveIncident(client,action,state=S){
    if(!client.incident)return {resolved:false,matched:false};
    const spec=ACTIONS[action],matched=!!spec&&spec.match.includes(client.incident.id);
    if(!matched)return {resolved:false,matched:false};
    client.incident=null;client.incidentAge=0;client.trust=clamp(client.trust+3,0,100);client.health=clamp(client.health+4,0,100);
    state.telemetry.incidentsResolved++;return {resolved:true,matched:true};
  }

  function operate(clientId,action="service",options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),spec=ACTIONS[action];
    if(!state||state.ended||state.businessModel!=="agency"||!client||!spec)return false;
    if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("agency_action",{action}))return false;
    const cost=operationFocusCost(client,action,state),cashCost=operationCashCost(action,state);
    if(state.focusRemaining<cost)return refuseAgency(`That takes ${cost} focus and you have ${state.focusRemaining} left. Run the day and pick it up tomorrow.`);
    if(state.cash-cashCost < -state.creditLimit)return refuseAgency(`That costs ${safeMoney(cashCost)} and the agency cannot cover it against the credit limit.`);
    state.focusRemaining-=cost;state.telemetry.accountsOperated++;
    const incident=resolveIncident(client,action,state);
    if(action==="service"){
      const stableExtension=(hasTech("automation",state)&&client.channel==="search"?1:0)+(hasTech("predictive_ops",state)&&client.health>=65?1:0)+
        (hasTech("follow_the_sun",state)&&client.health>=65?1:0)+(hasTech("agentic_ops",state)&&client.health>=70?1:0);
      const landingLift=hasTech("landing_systems",state)&&client.typeId.includes("leadgen")?2:0;
      client.nextDue=state.day+typeOf(client).cadence+stableExtension;
      client.serviceDebt=Math.max(0,client.serviceDebt-2.5);client.health=clamp(client.health+4+landingLift,0,100);
      client.performance=clamp(client.performance+3+landingLift,35,130);client.lastOperatedDay=state.day;
    }else if(action==="audit"){
      client.measurement=clamp(client.measurement+10+Math.min(10,state.staff.analyst*2),0,100);client.health=clamp(client.health+2,0,100);
      addMonthCost(state,"clientService",cashCost);state.cash-=cashCost;state.opsCost+=cashCost;
    }else if(action==="refresh"){
      client.planChangedDay=state.day;
      const lift=starterModel(state).id==="creative_agency"?29:22,concept=rewriteClientAd(client,state);
      client.creative=clamp(client.creative+lift+Math.min(14,state.staff.creative*2),0,100);client.health=clamp(client.health+3,0,100);
      if(starterModel(state).id==="creative_agency"&&actionableCreativeChannel(client.channel)){
        client.nextDue=state.day+typeOf(client).cadence;client.serviceDebt=Math.max(0,client.serviceDebt-2);client.lastOperatedDay=state.day;
      }
      addMonthCost(state,"clientService",cashCost);state.cash-=cashCost;state.opsCost+=cashCost;
      state.log.unshift({concept:"creative",html:`<div><b>New ad revision</b> · ${esc(client.name)} now runs “${esc(concept.label)}” as ${esc(formatLabel(client.adFormat))}. The card shows the rewritten execution.</div>`});
    }else if(action==="update"){
      const learned=client.insight<3,relationshipLift=Math.min(4,state.staff.account);
      client.insight=Math.min(3,client.insight+1);client.trust=clamp(client.trust+(learned?5:3)+relationshipLift,0,100);
      state.telemetry.clientUpdates++;if(learned)state.telemetry.clientInsights++;
    }
    client.lastAction=`${spec.label} · day ${state.day}`;
    if(typeof tutorialAfterAction==="function")tutorialAfterAction("agency_action",{action});
    const expectedAction=starterModel(state).id==="creative_agency"?"refresh":"service";
    const tutorialAdvanced=state.tutorialEnabled&&state.month===0&&state.tutorialStep<=1&&client.id==="client-001"&&action===expectedAction;
    if(tutorialAdvanced)state.tutorialStep=2;
    state.log.unshift({concept:spec.concept,html:`<div><b>${esc(spec.label)}</b> · ${esc(client.name)} used ${cost} focus unit${cost===1?"":"s"}.${incident.resolved?' <span class="pos">The scoped incident is resolved.</span>':client.incident?' The open incident needs a different response.':""}</div>`});
    markRunDirty();if(options.render!==false){render();if(tutorialAdvanced)focusGuidedControl(2);}return {cost,resolved:incident.resolved};
  }

  function clientConversation(clientId,approach){
    const client=activeClients(S).find(item=>item.id===clientId),profile=client&&personalityOf(client);
    if(S.ended||!client||!profile||S.focusRemaining<1)return false;
    S.focusRemaining--;const matched=approach===profile.best;
    client.insight=Math.min(3,client.insight+1);client.trust=clamp(client.trust+(matched?7:3),0,100);
    if(client.incident?.id==="stakeholder"&&matched)resolveIncident(client,"update",S);
    S.telemetry.clientUpdates++;S.telemetry.clientInsights++;
    S.log.unshift({concept:"client",html:`<div><b>${matched?"The update landed":"The update moved the conversation forward"}</b> · ${esc(client.name)} ${matched?"responded to the communication structure":"gave another observable cue"}. The Client Read is now ${client.insight}/3.</div>`});
    markRunDirty();render();return matched;
  }

  /* Campaign-plan controls: the media-buying decisions the player makes ON the campaign —
     which platform buys the media, how hard it paces and which creative direction runs.
     These are the levers Modes 0–5 teach, surfaced inside the career. */
  function setClientPacing(clientId,pacingId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),spec=AGENCY_PACING[pacingId];
    if(!state||state.ended||state.businessModel!=="agency"||!client||!spec)return false;
    if(client.pacing===pacingId)return refuseAgency(`${esc(client.name)} is already pacing ${esc(spec.label.replace(" pacing",""))}.`);
    client.pacing=pacingId;client.planChangedDay=state.day;client.lastAction=`${spec.label} · day ${state.day}`;
    state.log.unshift({concept:"structure",html:`<div><b>${esc(spec.label)}</b> · ${esc(client.name)} now paces its media ${pacingId==="aggressive"?"harder: stronger results while creative is fresh, faster burnout and more incident risk":pacingId==="conservative"?"gently: steadier results, slower burnout, fewer incidents":"evenly"}.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function switchClientPlatform(clientId,platformId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),platform=AGENCY_PLATFORMS[platformId];
    if(!state||state.ended||state.businessModel!=="agency"||!client||!platform||platform.channel!==client.channel||client.platform===platformId)return false;
    if(!platformsForChannel(client.channel,state).some(item=>item.id===platformId))return refuseAgency("That platform is not unlocked yet. Capability points open new places to buy.");
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day and move the budget tomorrow.");
    if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("agency_platform",{platform:platformId}))return false;
    state.focusRemaining--;client.platform=platformId;
    if(client.secondaryPlatformId===platformId){client.secondaryPlatformId=null;client.secondaryShare=0;}
    client.performance=clamp(client.performance-6,30,135);
    creditBuyingWork(client,state);
    client.lastAction=`Moved to ${platform.short} · day ${state.day}`;
    if(typeof tutorialAfterAction==="function")tutorialAfterAction("agency_platform",{platform:platformId});
    state.log.unshift({concept:"structure",html:`<div><b>Platform moved</b> · ${esc(client.name)} now buys ${esc(channelOf(client).label.toLowerCase())} through ${esc(platform.label)}. The account gives back a few outcome points while delivery relearns, then the platform's economics take over: ${esc(platform.note)}</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  /* Working the media IS servicing the account. A media buyer who reallocates budget, moves
     platforms, changes doctrine or ships new creative has done that account's work for the
     cycle — the game must not demand a separate abstract "routine service" click on top. */
  function creditBuyingWork(client,state,{full=true}={}){
    client.planChangedDay=state.day;client.lastOperatedDay=state.day;
    client.serviceDebt=Math.max(0,client.serviceDebt-(full?2.5:1.5));
    if(full)client.nextDue=state.day+typeOf(client).cadence;
    client.health=clamp(client.health+(full?3:1.5),0,100);
  }
  function budgetBaselineOf(client){return Math.max(500,Number(client.budgetBaseline)||Number(client.mediaBudget)||1000);}
  function budgetBounds(client){const base=budgetBaselineOf(client);
    return {min:roundTo(base*.5,100),max:roundTo(base*1.5,100),step:roundTo(Math.max(100,base*.1),100),base};}
  /* Scaling past the approved baseline spends the client's money, so it needs their
     confidence: trust gates the top of the range. Cutting below is always allowed. */
  function canSetBudget(client,next,state=S){
    const bounds=budgetBounds(client),base=bounds.base;
    if(next<bounds.min||next>bounds.max)return {ok:false,reason:"Outside the approved range"};
    if(next>base){
      const needed=next>base*1.25?70:55;
      if(client.trust<needed)return {ok:false,reason:`Needs ${needed}% client trust to scale this far`};
    }
    return {ok:true};
  }
  /* RESPONSIVE CONTROLS (2026-08-09). Buying controls used to `return false` when a gate blocked
     them, so a trust-locked or focus-starved click did nothing at all and read as a dead button.
     Every refusal now names its reason on screen. It is deliberately NOT written to the activity
     log and NOT part of game state: a refused click must leave the save byte-identical, which the
     credit-line smoke test asserts. */
  let agencyToastTimer=null;
  function refuseAgency(reason){
    try{
      if(typeof document==="undefined"||!document.body||typeof document.createElement!=="function")return false;
      let host=document.getElementById("agencyToast");
      if(!host){host=document.createElement("div");host.id="agencyToast";host.className="agency-toast";
        host.setAttribute("role","status");host.setAttribute("aria-live","polite");document.body.appendChild(host);}
      host.textContent=String(reason||"");
      host.classList.add("is-live");
      if(agencyToastTimer&&typeof clearTimeout==="function")clearTimeout(agencyToastTimer);
      if(typeof setTimeout==="function")agencyToastTimer=setTimeout(()=>{host.classList.remove("is-live");},5200);
    }catch(e){}
    return false;
  }
  function adjustClientBudget(clientId,direction,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||state.businessModel!=="agency"||!client)return false;
    const bounds=budgetBounds(client),step=direction==="down"?-bounds.step:bounds.step;
    const next=roundTo(clamp(Math.max(0,Number(client.mediaBudget)||0)+step,bounds.min,bounds.max),100);
    if(next===client.mediaBudget)return refuseAgency(`${esc(client.name)} is already at the ${direction==="down"?"lowest":"highest"} budget you are allowed to set: ${safeMoney(direction==="down"?bounds.min:bounds.max)}/month. The client approved ${safeMoney(bounds.base)} as the baseline, and you can move it half a step either side of that.`);
    const check=canSetBudget(client,next,state);
    if(!check.ok)return refuseAgency(check.reason||`${esc(client.name)} will not approve ${safeMoney(next)}/month yet.`);
    if(state.focusRemaining<1)return refuseAgency("No focus left today. Run the day, then change the budget tomorrow morning.");
    state.focusRemaining--;client.mediaBudget=next;
    creditBuyingWork(client,state,{full:false});
    client.lastAction=`Budget ${direction==="down"?"cut":"raised"} · day ${state.day}`;
    const pace=next>bounds.base?"above":next<bounds.base?"below":"at";
    state.log.unshift({concept:"structure",html:`<div><b>Media budget ${direction==="down"?"reduced":"increased"}</b> · ${esc(client.name)} now runs ${safeMoney(next)}/month, ${pace} the approved ${safeMoney(bounds.base)} baseline. Tomorrow's delivery spends at the new rate; the campaign results table shows what it bought.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function setClientStrategy(clientId,strategyId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),doctrine=AGENCY_STRATEGIES[strategyId];
    if(!state||state.ended||state.businessModel!=="agency"||!client||!doctrine||client.strategy===strategyId)return false;
    const check=strategyAvailable(strategyId,client,state);
    if(!check.ok||state.focusRemaining<1)return false;
    state.focusRemaining--;client.strategy=strategyId;
    client.performance=clamp(client.performance-4,30,135);
    creditBuyingWork(client,state);client.lastAction=`${doctrine.label} · day ${state.day}`;
    state.log.unshift({concept:"structure",html:`<div><b>Buying doctrine changed</b> · ${esc(client.name)} now runs ${esc(doctrine.label.toLowerCase())}. ${esc(doctrine.note)} The account gives back a few outcome points while the new approach settles; the campaign results table shows what it changes.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  /* The allocation board: move the client's monthly media in 10% steps between the primary
     platform and one secondary lane (up to 50%). Routing to a different secondary lane pulls
     the previous split back to the primary first. */
  function adjustMediaSplit(clientId,platformId,direction,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId),platform=AGENCY_PLATFORMS[platformId];
    if(!state||state.ended||state.businessModel!=="agency"||!client||!platform)return false;
    const primary=platformOf(client);
    if(!primary||platform.channel!==client.channel||platform.id===primary.id)return false;
    if(!platformsForChannel(client.channel,state).some(item=>item.id===platformId))return false;
    const step=direction==="cut"?-10:10;
    const current=client.secondaryPlatformId===platformId?clamp(Number(client.secondaryShare)||0,0,50):0;
    const next=clamp(current+step,0,50);
    if(next===current||state.focusRemaining<1)return false;
    state.focusRemaining--;
    client.secondaryPlatformId=next>0?platformId:null;client.secondaryShare=next;
    client.planChangedDay=state.day;
    client.lastAction=`Media split · day ${state.day}`;
    state.log.unshift({concept:"structure",html:`<div><b>Media plan adjusted</b> · ${esc(client.name)} now routes ${next}% of its ${safeMoney(client.mediaBudget)}/month media through ${esc(platform.label)} and ${100-next}% through ${esc(primary.label)}. Efficiency blends by share; each lane's demand pool absorbs only its own allocation.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function applyCreativeDirection(clientId,conceptId,options={}){
    const state=S,client=activeClients(state).find(item=>item.id===clientId);
    if(!state||state.ended||state.businessModel!=="agency"||!client)return false;
    const offer=offerOf(client),pool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const concept=pool.find(item=>item.id===conceptId);
    if(!concept||concept.id===client.adConceptId)return false;
    const cost=operationFocusCost(client,"refresh",state),cashCost=operationCashCost("refresh",state);
    if(state.focusRemaining<cost)return refuseAgency(`That takes ${cost} focus and you have ${state.focusRemaining} left. Run the day and pick it up tomorrow.`);
    if(state.cash-cashCost < -state.creditLimit)return refuseAgency(`That costs ${safeMoney(cashCost)} and the agency cannot cover it against the credit limit.`);
    state.focusRemaining-=cost;state.telemetry.accountsOperated++;
    const version=Math.max(1,Number(client.creativeVersion)||1)+1,office=hqLocation(client.officeId);
    client.creativeVersion=version;client.adConceptId=concept.id;client.adFormat=adFormatFor(concept,client.channel);
    client.adCopy=adCopyFor(concept,offer,office,client.channel,version,client);
    const lift=starterModel(state).id==="creative_agency"?29:22;
    client.creative=clamp(client.creative+lift+Math.min(14,state.staff.creative*2),0,100);client.health=clamp(client.health+3,0,100);
    resolveIncident(client,"refresh",state);
    addMonthCost(state,"clientService",cashCost);state.cash-=cashCost;state.opsCost+=cashCost;
    creditBuyingWork(client,state);
    client.lastAction=`Creative direction · day ${state.day}`;
    state.log.unshift({concept:"creative",html:`<div><b>Creative direction chosen</b> · ${esc(client.name)} now runs “${esc(concept.label)}” as ${esc(formatLabel(client.adFormat))}. You picked the concept; the card shows the new execution.</div>`});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }
  function creativeDesk(clientId){
    const client=activeClients(S).find(item=>item.id===clientId);if(S.ended||!client)return false;
    const offer=offerOf(client),pool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const cost=operationFocusCost(client,"refresh",S),cashCost=operationCashCost("refresh",S);
    const rows=pool.map(concept=>{const running=concept.id===client.adConceptId;
      return `<article class="agency-lead-card"><div class="fam">${esc(formatLabel(adFormatFor(concept,client.channel)))}</div><h3>${esc(concept.label)}</h3><p>${esc(concept.premise)}</p>
        <button class="btn wide" data-agency-direction="${esc(concept.id)}" data-client="${esc(client.id)}" ${running||S.focusRemaining<cost||S.cash-cashCost < -S.creditLimit?"disabled":""}>${running?"Now running":`Run this direction · ${cost} focus + ${safeMoney(cashCost)}`}</button></article>`;}).join("");
    show(`<div class="eyebrow">Creative direction · ${esc(client.name)}</div><h2>Choose the argument this campaign should make</h2><div class="prose"><p>${esc(client.name)} sells ${esc(offer.label.toLowerCase())}. Each direction below is a different persuasion concept carried by a different execution. Picking one writes the new revision and raises creative readiness — the same production cost as a refresh, but you choose the idea instead of rotating to the next one.</p></div><div class="agency-lead-grid">${rows}</div><div class="row"><button class="btn wide" id="closeB">Back to the account</button></div>`,"creative",{wide:true});
    document.getElementById("closeB").onclick=close;
    document.querySelectorAll("[data-agency-direction]").forEach(button=>button.onclick=()=>applyCreativeDirection(button.dataset.client,button.dataset.agencyDirection));
    return true;
  }
  /* Between-service business operations: the work an agency owner actually does on the days
     no account is due — pipeline, intake judgment and organic service lines. */
  function developBusiness(options={}){
    const state=S;if(!state||state.ended||state.businessModel!=="agency")return false;
    const cash=roundTo(150*eraCostFactor(state),10);
    if(state.focusRemaining<1||state.cash-cash < -state.creditLimit||(state.bizDevPoints||0)>=6)return false;
    state.focusRemaining--;state.cash-=cash;addMonthCost(state,"other",cash);state.opsCost+=cash;
    state.bizDevPoints=(state.bizDevPoints||0)+1;
    state.log.unshift({concept:"structure",html:`<div><b>Business development</b> · ${safeMoney(cash)} and 1 focus went into outreach, referrals and positioning. Next month's prospect group improves with this work (${state.bizDevPoints}/6 this month).</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function interviewProspect(id,options={}){
    const state=S,lead=state.prospects.find(item=>item.id===id);
    if(!state||state.ended||state.businessModel!=="agency"||!lead||lead.interviewed||state.focusRemaining<1)return false;
    state.focusRemaining--;lead.interviewed=true;lead.insight=Math.min(3,(lead.insight||0)+1);lead.trust=clamp(lead.trust+4,0,100);
    state.telemetry.clientInsights++;
    state.log.unshift({concept:"client",html:`<div><b>Prospect interviewed</b> · ${esc(lead.name)}. You now know how this owner makes decisions before committing a seat, and the relationship would start warmer.</div>`});
    markRunDirty();if(options.render!==false){leadDesk();}return true;
  }
  function startServiceLine(id,options={}){
    const state=S,line=serviceLineSpec(id),check=canStartServiceLine(id,state);
    if(!state||state.ended||!line||!check.ok||state.focusRemaining<1)return false;
    state.focusRemaining--;state.cash-=check.setup;addMonthCost(state,"other",check.setup);state.opsCost+=check.setup;
    if(!state.services||typeof state.services!=="object")state.services={};
    state.services[id]={active:true,startedMonth:state.month,momentum:35};
    state.log.unshift({concept:"structure",html:`<div><b class="pos">Service line opened</b> · ${esc(line.label)}. ${safeMoney(check.setup)} setup entered the ledger and ${safeMoney(roundTo(line.upkeep*eraCostFactor(state),10))}/month upkeep joins the operating statement. Work the line to build momentum; it bills at every month close.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function workServiceLine(id,options={}){
    const state=S,line=serviceLineSpec(id),record=serviceLineState(state,id);
    if(!state||state.ended||!line||!record?.active||state.focusRemaining<1||record.momentum>=100)return false;
    state.focusRemaining--;record.momentum=clamp(record.momentum+9,0,100);
    state.log.unshift({concept:"structure",html:`<div><b>${esc(line.label)}</b> · 1 focus of hands-on work raised the line to ${Math.round(record.momentum)}% momentum. It bills about ${safeMoney(serviceLineBilling(line,record,state))} at month close.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }
  function settleServiceLines(state,lines){
    const active=activeServiceLines(state);if(!active.length)return 0;
    let total=0;const parts=[];
    for(const line of active){const record=serviceLineState(state,line.id),billed=serviceLineBilling(line,record,state);
      total+=billed;parts.push(`${esc(line.label)} ${safeMoney(billed)} at ${Math.round(record.momentum)}% momentum`);}
    state.cash+=total;
    lines.push(`<b class="pos">Organic service lines billed</b> · ${parts.join(" · ")}. Momentum decays when a line goes unworked.`);
    return total;
  }
  function delegateRoutine(options={}){
    const state=S;if(!state||state.ended||state.businessModel!=="agency")return 0;
    const team=state.staff.buyer+state.staff.ops+(hasTech("agency_os",state)?1:0)+(hasTech("distributed_ops",state)?2:0)+
      (hasTech("follow_the_sun",state)?2:0)+(hasTech("agentic_ops",state)?2:0);
    if(team<=0&&!options.force)return 0;
    let completed=0;
    const rows=activeClients(state).filter(client=>routineDue(client,state)&&!client.incident?.critical)
      .sort((a,b)=>clientPriority(b,state)-clientPriority(a,state));
    for(const client of rows){
      const cost=serviceCost(client,state);if(state.focusRemaining<cost)break;
      const result=operate(client.id,"service",{render:false});if(result)completed++;
    }
    state.telemetry.delegated+=completed;
    if(completed)state.log.unshift({concept:"structure",html:`<div><b>Team playbook</b> · ${completed} routine account${completed===1?" was":"s were"} serviced in priority order. Critical account problems still need your attention.</div>`});
    if(options.render!==false)render();return completed;
  }

  function simulateClientDay(state,client){
    const t=typeOf(client),ch=channelOf(client),b=breadth(state),geo=clientGeography(client,state),model=starterModel(state),era=AGENCY_ERAS.find(item=>item.year===year(state))||AGENCY_ERAS[0];
    const due=routineDue(client,state),overload=capacity(state).overload;
    if(due){client.serviceDebt+=1;client.health=clamp(client.health-1.2*overload,0,100);}
    if(client.incident){
      client.incidentAge++;const template=AGENCY_INCIDENTS.find(item=>item.id===client.incident.id);
      const trackingProtection=client.incident.id==="tracking"?(hasTech("measurement",state)?.58:1)*(hasTech("first_party",state)?.78:1):1;
      if(client.incidentAge>1){client.trust=clamp(client.trust+(template?.trust||-3)*.22*trackingProtection,0,100);client.health=clamp(client.health+(template?.health||-2)*.18,0,100);}
      if(client.incidentAge>5)state.telemetry.incidentsMissed++;
    }
    const pacing=pacingOf(client),strat=strategyEconomics(client,state);
    if(actionableCreativeChannel(client.channel)){
      const creativeCoverage=Math.min(.72,state.staff.creative*5/Math.max(1,activeClients(state).length)+
        (hasTech("workstation_fleet",state)?.04:0)+(hasTech("creative_automation",state)?.09:0)+
        (hasTech("automated_creative_pipeline",state)?.18:0)+(hasTech("local_ai_cluster",state)?.08:0));
      const decay=(era.flags.creativePressure?1.2:.75)*(1-creativeCoverage);
      client.creative=clamp(client.creative-decay*pacing.decayM*strat.decay,0,100);
      if(Array.isArray(client.campaigns))for(const campaign of client.campaigns){
        if(Array.isArray(campaign.adSets))for(const set of campaign.adSets){
          if(!Array.isArray(set.ads))continue;
          for(const ad of set.ads)ad.creative=clamp((Number(ad.creative)||campaign.creative||client.creative)-decay,0,100);
        }
        const campaignPacing=AGENCY_PACING[campaign.pacing]||pacing,
          campaignStrat=strategyEconomics({...client,strategy:campaign.strategy},state);
        campaign.creative=clamp((Number(campaign.creative)||client.creative)-decay*campaignPacing.decayM*campaignStrat.decay,0,100);
      }
    }
    const capability=(client.channel==="search"||hasTech(ch.tech,state))?1:.78;
    const volatility=(era.flags.volatility||1)*(ch.volatilityM||1)*strat.volatility,noise=1+(roll("client-day",state.day,client.id)-.5)*.2*volatility;
    const landingM=(hasTech("landing_systems",state)&&t.id.includes("leadgen")?1.06:1);
    const starterM=model.id==="digital_agency"&&client.channel==="search"?1.07:model.id==="creative_agency"&&actionableCreativeChannel(client.channel)?1.06:1;
    /* REAL DELIVERY PHYSICS (2026-08-09). Agency campaigns used to resolve as one smoothed
       scalar, which produced an identical row every day and taught nothing. A campaign now
       runs the same funnel the rest of To The Moon runs: spend buys impressions at a cost per
       thousand, impressions earn clicks at a click-through rate, clicks become outcomes at a
       conversion rate. Every buying lever moves a named part of that chain. */
    const deliveryFor=platform=>(platform&&AGENCY_DELIVERY[platform.id])||AGENCY_CHANNEL_DELIVERY[client.channel]||AGENCY_CHANNEL_DELIVERY.search;
    const dailySpend=client.mediaBudget/AGENCY_MONTH_DAYS;
    /* Every campaign buys its own media on its own plan. A client with one campaign resolves
       exactly as before, so the top abstraction is unchanged for anyone who never splits. */
    const campaigns=campaignsOf(client);
    /* Paused campaigns buy nothing. Their share is redistributed across whatever is still
       live, so killing a loser moves its budget rather than shrinking the account. */
    const liveCampaigns=campaigns.filter(campaign=>!campaign.paused);
    const liveShare=liveCampaigns.reduce((sum,campaign)=>sum+clamp(campaign.share,0,100),0);
    const legs=liveCampaigns.flatMap(campaign=>{
      const campaignSpend=liveShare>0?dailySpend*(clamp(campaign.share,0,100)/liveShare):0;
      const view={...client,platform:campaign.platform,secondaryPlatformId:campaign.secondaryPlatformId,
        secondaryShare:campaign.secondaryShare,pacing:campaign.pacing,strategy:campaign.strategy};
      const campaignSplit=mediaSplit(view),campaignPacing=pacingOf(view),campaignStrategy=strategyEconomics(view,state);
      const campaignWear=clamp(1-(Number(campaign.creative)??client.creative)/100,0,1);
      const lander=AGENCY_LANDERS[campaign.lander]||AGENCY_LANDERS.client_site;
      const shape={pacing:campaignPacing,strat:campaignStrategy,wear:campaignWear,landerM:lander.cvrM};
      const platformLegs=campaignSplit&&campaignSplit.secondary?
        [{platform:campaignSplit.primary,spend:campaignSpend*(1-campaignSplit.share)},
         {platform:campaignSplit.secondary,spend:campaignSpend*campaignSplit.share}]:
        [{platform:campaignSplit?campaignSplit.primary:null,spend:campaignSpend}];
      /* Each ad set inside the campaign buys its own share against its own audience pool. */
      const sets=adSetsOf(campaign,client,state);
      return platformLegs.flatMap(leg=>sets.flatMap(set=>{
        const targeting=AGENCY_TARGETING[set.targeting]||null;
        const setSpend=leg.spend*(clamp(set.share,0,100)/100);
        const allAds=adsOf(set,campaign,client),ads=allAds.filter(ad=>!ad.paused);
        if(!ads.length)return [];
        /* Rotation splits the ad set's spend evenly, and each ad's own wear shapes its
           response — so one fresh ad can hold the set up while another is tired. */
        return ads.map(ad=>({...leg,...shape,spend:setSpend/ads.length,targeting,
          wear:clamp(1-(Number(ad.creative)??campaign.creative)/100,0,1)}));
      }));
    });
    const split=mediaSplit(client);
    /* Creative wear lifts cost and depresses response; the account's own condition and the
       buyer's doctrine move the conversion side. Auction pressure varies by day. */
    const wear=clamp(1-client.creative/100,0,1);
    const auction=1+(roll("auction",state.day,client.id)-.5)*.22*(era.flags.volatility||1)*strat.volatility;
    const responseNoise=1+(roll("response",state.day,client.id)-.5)*.28*strat.volatility;
    const conversionNoise=1+(roll("convert",state.day,client.id)-.5)*.2;
    const healthM=.75+client.health*.0028,serviceM=clamp(1-client.serviceDebt*.02,.6,1);
    /* Sold services change the client's funnel: conversion work lifts the rate on traffic
       already bought, content slows creative wear, and organic adds outcomes the client did
       not pay media for. All three make the client's money go further, which is the pitch. */
    const conversionLift=1+Math.min(.35,clientServiceStrength(client,"conversion")*.22);
    const freshness=Math.min(.5,clientServiceStrength(client,"freshness")*.4);
    const organicStrength=Math.min(1,clientServiceStrength(client,"organic"));
    /* Calibration: the funnel's impression and click physics are realistic on their own, but
       a client's economics decide what a converted outcome may cost. Anchor the conversion
       rate so BASELINE delivery lands at this client's target cost per conversion; every lever
       then moves the result around that anchor instead of inventing free money. */
    const targetCplAnchor=Math.max(1,client.customerValue||160)/1.24;
    const anchorBase=deliveryFor(split?split.primary:null);
    const anchorCpl=(anchorBase.cpm/1000)/Math.max(1e-6,anchorBase.ctr*anchorBase.cvr);
    const conversionCalibration=clamp(anchorCpl/targetCplAnchor,.01,1);
    let impressions=0,clicks=0,outcomes=0,unsaturatedOutcomes=0;
    for(const leg of legs){
      if(leg.spend<=0)continue;
      const base=deliveryFor(leg.platform);
      /* Saturation: pushing more money than a lane's demand pool absorbs buys progressively
         worse impressions, so the cost per thousand climbs instead of the money vanishing. */
      const targeting=leg.targeting;
      /* A tight audience can only absorb its slice of the platform's demand, so it saturates
         long before a broad one on the same money. */
      const monthly=leg.spend*AGENCY_MONTH_DAYS,
        capacity=Math.max(1,(Number(leg.platform?.capacity)||monthly)*(targeting?targeting.pool:1));
      const saturation=monthly>capacity?Math.pow(monthly/capacity,.45):1;
      const legPacing=leg.pacing||pacing,legStrat=leg.strat||strat,legWear=leg.wear===undefined?wear:leg.wear;
      const cpm=base.cpm*(targeting?targeting.cpmM:1)*auction*saturation*(2-legPacing.valueM);
      const legImpressions=leg.spend/Math.max(1,cpm)*1000;
      const ctr=base.ctr*(targeting?targeting.ctrM:1)*(1-legWear*(1-freshness)*.55*base.fatigueSensitivity)*responseNoise*(legStrat.value*.5+.5);
      const legClicks=legImpressions*clamp(ctr,.0002,.35);
      const cvr=base.cvr*conversionCalibration*healthM*serviceM*conversionNoise*geo.outcomeMultiplier*capability*landingM*(leg.landerM||1)*starterM*legStrat.value*conversionLift*(targeting?targeting.cvrM:1)/b.multiplier;
      impressions+=legImpressions;clicks+=legClicks;outcomes+=legClicks*clamp(cvr,.001,.5);
      /* The agency's performance read is budget-NORMALIZED: saturation genuinely damages the
         client's outcomes, but client media VOLUME must never move agency revenue (locked
         invariant), so the bonus basis uses the unsaturated cost per conversion. */
      unsaturatedOutcomes+=legImpressions*saturation*clamp(ctr,.0002,.35)*clamp(cvr,.001,.5);
    }
    /* Organic outcomes arrive without media behind them. */
    const organicOutcomes=outcomes*organicStrength*.28;
    const totalOutcomes=outcomes+organicOutcomes;
    const quality=trueLeadQuality(client,state);
    const valueRoll=rollConversionValue(client,quality,state,"day");
    const dailyValue=totalOutcomes*valueRoll.value;
    const dailyLeads=totalOutcomes;
    /* The outcome index still summarizes the account, but it now REPORTS the delivery result
       instead of generating it: it compares today's cost per conversion with the client's target. */
    const targetCpl=Math.max(1,client.customerValue||160)/1.24;
    const todayCpl=unsaturatedOutcomes>0?dailySpend/unsaturatedOutcomes:targetCpl*2;
    const valueIndex=clamp(100*(targetCpl/Math.max(1,todayCpl)),35,135);
    client.performance=clamp(client.performance*.72+valueIndex*.28,30,135);
    const signalM=era.flags.signalPressure&&!hasTech("first_party",state)?.78:1;
    const reportingShare=clamp((.62+client.measurement*.0035)*signalM*(ch.reportShare||1),0,1);
    /* The buyer judges the leads. Rejected ones still cost media and still show up as
       conversions in the platform; they simply do not become money. */
    const acceptedShare=clamp(quality/100*(0.9+roll("accept",state.day,client.id)*0.2),0,1);
    client.leadsDelivered=(Number(client.leadsDelivered)||0)+totalOutcomes;
    client.leadsAccepted=(Number(client.leadsAccepted)||0)+totalOutcomes*acceptedShare;
    client.clientMediaSpend+=dailySpend;client.clientModeledValue+=dailyValue;client.clientReportedValue+=dailyValue*reportingShare;
    client.validatedOutcomes+=dailyLeads;
    if(!Array.isArray(client.campaignHistory))client.campaignHistory=[];
    client.campaignHistory.push({day:state.day,spend:Math.round(dailySpend),value:Math.round(dailyValue),
      leads:Math.round(dailyLeads*100)/100,organic:Math.round(organicOutcomes*100)/100,index:Math.round(valueIndex),share:split?Math.round(split.share*100):0,
      impressions:Math.round(impressions),clicks:Math.round(clicks*10)/10,
      quality:observedLeadQuality(client).rate??null,trueQuality:quality,perLead:valueRoll.value,valueRoll:{d100:valueRoll.d100,modifier:valueRoll.modifier,total:valueRoll.total,low:valueRoll.low,high:valueRoll.high},
      cpm:Math.round((impressions>0?dailySpend/impressions*1000:0)*100)/100,
      ctr:Math.round((impressions>0?clicks/impressions*100:0)*1000)/1000,
      cvr:Math.round((clicks>0?outcomes/clicks*100:0)*100)/100,
      secondary:split?.secondary?.id||null,changed:client.planChangedDay===state.day,incident:client.incident?client.incident.id:null});
    client.campaignHistory=client.campaignHistory.slice(-10);
    state.monthClientMediaSpend+=dailySpend;state.telemetry.clientMediaSpend+=dailySpend;state.telemetry.clientModeledValue+=dailyValue;
  }

  function unresolvedConsequences(state,lines){
    const unresolved=activeClients(state).filter(client=>routineDue(client,state)||client.incident);
    const relationshipCoverage=Math.min(.68,state.staff.account*6/Math.max(1,activeClients(state).length)+
      (hasTech("distributed_qa",state)?.08:0)+(hasTech("follow_the_sun",state)?.18:0)+(hasTech("agentic_ops",state)?.08:0));
    for(const client of unresolved){
      const severe=client.incident?.critical||client.serviceDebt>=5;
      client.trust=clamp(client.trust-(severe?1.6:.35)*(1-relationshipCoverage),0,100);
      if(severe)lines.push(`${esc(client.name)} closed the day with ${client.incident?.critical?"a critical incident":"heavy service debt"}.`);
    }
    return unresolved;
  }

  function eraCostFactor(state=S){return Math.pow(1+AGENCY_COST_RULES.annualCostGrowth,Math.max(0,year(state)-2017));}
  function projectedStaffDays(state=S){
    const accrued=state.monthStaffDays&&typeof state.monthStaffDays==="object"?state.monthStaffDays:emptyStaffDayLedger();
    const through=Math.floor(clamp(state.staffAccruedThrough,0,AGENCY_MONTH_DAYS)),remaining=AGENCY_MONTH_DAYS-through;
    return Object.fromEntries(Object.keys(STAFF).map(id=>[id,Math.max(0,Number(accrued[id])||0)+(Number(state.staff[id])||0)*remaining]));
  }
  function payroll(state=S){
    const roleDays=projectedStaffDays(state),factor=eraCostFactor(state);
    return roundTo(Object.entries(roleDays).reduce((sum,[id,days])=>sum+(STAFF[id]?.salary||0)*days/AGENCY_MONTH_DAYS,0)*factor,10);
  }
  function workstationSetupCost(role,state=S){return roundTo((AGENCY_COST_RULES.workstationSetup[role]||1800)*eraCostFactor(state),50);}
  function monthAgencyEconomics(state=S){
    const clients=activeClients(state);let retainers=0,bonuses=0,credits=0;const invoices=[];
    for(const client of clients){
      const monthStart=state.month*AGENCY_MONTH_DAYS+1,activeStart=Math.max(monthStart,client.createdDay||monthStart);
      const serviceFraction=clamp((state.day-activeStart+1)/AGENCY_MONTH_DAYS,0,1),earnedFee=client.fee*serviceFraction;
      retainers+=earnedFee;let clientBonus=0,clientCredit=0;
      const confidence=clamp(.5+client.measurement/200+(hasTech("first_party",state)?.08:0),.5,1),above=Math.max(0,client.performance-100)/100;
      clientBonus=earnedFee*Math.min(.25,above*.8)*confidence;bonuses+=clientBonus;
      if(client.trust<45||client.health<40){clientCredit=earnedFee*(client.trust<30?.2:.08);credits+=clientCredit;}
      const amount=earnedFee+clientBonus-clientCredit;if(amount>0)invoices.push({clientId:client.id,name:client.name,amount,terms:client.terms});
    }
    return {retainers,bonuses,credits,revenue:retainers+bonuses-credits,invoices};
  }

  function monthlyOperatingCost(state=S){
    const clients=activeClients(state),seats=clients.length,funnels=state.businessModel==="affiliate"?(state.affiliate?.funnels.length||0):0;
    const roleDays=projectedStaffDays(state),averageByRole=Object.fromEntries(Object.entries(roleDays).map(([id,days])=>[id,days/AGENCY_MONTH_DAYS]));
    const headcount=Object.values(state.staff).reduce((a,b)=>a+b,0),averageHeadcount=Object.values(averageByRole).reduce((a,b)=>a+b,0),people=averageHeadcount+1,factor=eraCostFactor(state);
    const enterprise=clients.filter(client=>client.typeId.startsWith("enterprise")).length;
    const commerce=clients.filter(client=>client.typeId.includes("commerce")).length;
    const channels=new Set(clients.map(client=>client.channel));if(funnels)channels.add("affiliate");
    const capabilityStack=state.unlocked.filter(id=>!node(id)?.starter).length,hq=hqLocation(state),facilityM=hq.facilitiesCostMultiplier||1;
    const capabilityMonthly=capabilityMonthlyCosts(state),newClients=clients.filter(client=>client.createdMonth===state.month).length;
    const categories={
      founderCompensation:roundTo(AGENCY_COST_RULES.founderMonthlyCompensation*factor,10),
      employeeWages:payroll(state),
      employerBenefits:roundTo(payroll(state)*AGENCY_COST_RULES.employerBenefitRate,10),
      infrastructureHosting:roundTo((AGENCY_COST_RULES.infrastructureBase+averageHeadcount*35+seats*28+enterprise*80+funnels*150)*factor+capabilityMonthly.infrastructureHosting,10),
      equipmentReserve:roundTo((people*AGENCY_COST_RULES.equipmentReservePerPerson+(averageByRole.creative+averageByRole.analyst)*35)*factor,10),
      softwareSubscriptions:roundTo((AGENCY_COST_RULES.softwareBase+people*95+seats*50+channels.size*125+capabilityStack*45+funnels*90)*factor+capabilityMonthly.softwareSubscriptions+serviceLineMonthlyUpkeep(state),10),
      insuranceComplianceProfessional:roundTo((AGENCY_COST_RULES.insuranceProfessionalBase+people*85+enterprise*95+commerce*35+
        clients.filter(client=>client.channel==="programmatic").length*75+funnels*60)*(year(state)>=2026?1.12:1)*factor,10),
      facilitiesAdministration:roundTo(((AGENCY_COST_RULES.facilitiesAdministrationBase+people*120+seats*14)*facilityM)*factor+capabilityMonthly.facilitiesAdministration,10),
      eventsPartnershipsMarketing:roundTo((AGENCY_COST_RULES.growthMarketingBase+(state.businessModel==="agency"?state.targetSeats*14+newClients*75:300+funnels*90)+channels.size*80)*factor,10)
    };
    const total=Object.values(categories).reduce((sum,value)=>sum+value,0);
    const pipelineProspectBonus=state.businessModel==="agency"?Math.min(3,Math.floor(categories.eventsPartnershipsMarketing/250)):0;
    const peopleLabel=Number.isInteger(people)?String(people):people.toFixed(1);
    const drivers=[`${peopleLabel} average company operator${people===1?"":"s"} including the founder`,
      state.businessModel==="agency"?`${seats} client seat${seats===1?"":"s"}, including ${enterprise} enterprise and ${commerce} commerce`:`${funnels} owned funnel${funnels===1?"":"s"}`,
      `${channels.size} active delivery ${channels.size===1?"lane":"lanes"}`,`${capabilityStack} paid capability stack addition${capabilityStack===1?"":"s"}`,
      capabilityMonthly.total?`${safeMoney(capabilityMonthly.total)} in recurring advanced-system obligations`:"no advanced-system obligations",
      ...(activeServiceLines(state).length?[`${activeServiceLines(state).length} organic service line${activeServiceLines(state).length===1?"":"s"} adding ${safeMoney(serviceLineMonthlyUpkeep(state))}/month upkeep`]:[]),
      state.businessModel==="agency"?`${safeMoney(categories.eventsPartnershipsMarketing)} spent on sales, events and partnerships can add up to ${pipelineProspectBonus} prospective client${pipelineProspectBonus===1?"":"s"} next month`:`the affiliate business no longer uses the prospective-client system`,
      `${hq.city}, ${hq.stateCode} headquarters applies a ${facilityM.toFixed(2)}× facilities-cost factor`,`${Math.round((factor-1)*100)}% cumulative era-cost growth`];
    return {categories,total,drivers,headcount,averageHeadcount,people,seats,enterprise,commerce,channels:channels.size,capabilityStack,capabilityMonthly,pipelineProspectBonus,factor};
  }

  function monthlyOperatingStatement(state=S){
    const recurring=monthlyOperatingCost(state),ledger={...emptyMonthCostLedger(),...(state.monthCostLedger||{})};
    const tracked=Object.values(ledger).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
    const unclassified=Math.max(0,(Number(state.monthVariableCosts)||0)-tracked)+Math.max(0,Number(ledger.other)||0);
    const categories={...recurring.categories,
      clientServiceOnboarding:Math.max(0,ledger.onboarding)+Math.max(0,ledger.clientService),
      teamChangesEquipment:Math.max(0,ledger.recruiting)+Math.max(0,ledger.equipmentSetup)+Math.max(0,ledger.severance),
      businessTransformation:Math.max(0,ledger.transformation)+Math.max(0,ledger.funnelDevelopment),
      complianceInterventions:Math.max(0,ledger.compliance),ownedMedia:Math.max(0,Number(state.monthAffiliateSpend)||0),other:unclassified};
    const variableTotal=categories.clientServiceOnboarding+categories.teamChangesEquipment+categories.businessTransformation+
      categories.complianceInterventions+categories.other;
    const totalExpense=Object.values(categories).reduce((sum,value)=>sum+value,0),settlementId=`${state.businessModel}-month-${String(state.month+1).padStart(3,"0")}`;
    return {settlementId,month:state.month,year:year(state),monthNumber:state.month+1,dueDay:state.day+(AGENCY_MONTH_DAYS-state.dayInMonth),
      dueInWorkdays:Math.max(1,AGENCY_MONTH_DAYS-state.dayInMonth+1),categories,recurringTotal:recurring.total,variableTotal,
      ownedMedia:categories.ownedMedia,totalExpense,billsDue:recurring.total,alreadyPaid:variableTotal+categories.ownedMedia,drivers:recurring.drivers};
  }

  function cashRunway(state=S){
    const statement=monthlyOperatingStatement(state),plannedOwnedMedia=state.businessModel==="affiliate"?
      (state.affiliate?.funnels||[]).reduce((sum,funnel)=>sum+Math.max(0,Number(funnel.dailyBudget)||0)*AGENCY_MONTH_DAYS,0):0;
    const monthly=Math.max(1,statement.recurringTotal+plannedOwnedMedia);
    const cash=Math.max(0,Number(state.cash)||0),unusedCredit=Math.max(0,(Number(state.creditLimit)||0)-Math.max(0,-Number(state.cash)||0));
    const totalLiquidity=cash+unusedCredit;
    return {cashMonths:cash/monthly,liquidityMonths:totalLiquidity/monthly,monthlyObligations:statement.recurringTotal,
      plannedOwnedMedia,monthlyCashBurn:monthly,cash,unusedCredit,totalLiquidity};
  }

  function liquidityStatus(state=S){
    const statement=monthlyOperatingStatement(state),runway=cashRunway(state),shortfall=Math.max(0,statement.billsDue-runway.totalLiquidity);
    let id="healthy",label="Bills covered",detail=`Cash covers ${runway.cashMonths.toFixed(1)} months of the current company burn plan.`;
    if(shortfall>0){id="unpayable";label="Operating bills cannot be covered";detail=`Cash and the remaining credit line are ${safeMoney(shortfall)} short of this month's bills.`;}
    else if(runway.cash<statement.billsDue){id="credit";label="Credit required at close";detail=`The company can pay this month's bills only by drawing ${safeMoney(statement.billsDue-runway.cash)} from its credit line.`;}
    else if(runway.cashMonths<2){id="watch";label="Short cash runway";detail=`Cash covers ${runway.cashMonths.toFixed(1)} months of the current company burn plan before collections or new sales.`;}
    return {id,label,detail,shortfall,statement,runway};
  }

  function renewClients(state,closingMonth,lines){
    for(const client of activeClients(state).slice()){
      const contractDue=closingMonth+1>=client.contractEndMonth;
      const sustainedFailure=client.trust<28||client.health<25||client.serviceDebt>=10||
        (client.incident?.critical&&client.incidentAge>9);
      if(!contractDue&&!sustainedFailure)continue;
      const debt=Math.min(1,client.serviceDebt/Math.max(1,typeOf(client).work*3));
      const performanceFit=client.performance>=92?1:0,commitment=client.insight/3;
      const p=clamp(.25+.006*client.trust+.15*performanceFit+.10*commitment-.15*debt,.10,.95);
      const hardExit=client.trust<12||client.health<12||client.serviceDebt>=16||(client.incident?.critical&&client.incidentAge>14);
      const earlyExit=sustainedFailure&&roll("early-exit",closingMonth,client.id)<clamp(.28+(30-client.trust)*.012+(28-client.health)*.01+client.serviceDebt*.018,.25,.88);
      if(hardExit||earlyExit||(contractDue&&roll("renewal",closingMonth,client.id)>p)){
        client.status="churned";state.archivedClients.push({...client});state.telemetry.clientsChurned++;
        state.reputation=clamp(state.reputation-(hardExit?5:2),0,100);
        lines.push(`<b class="neg">${esc(client.name)} ${sustainedFailure?"ended the relationship early":"did not renew"}.</b> One client seat opened; the rest of the roster is unchanged.`);
      }else if(contractDue){client.contractEndMonth+=12;client.fee=roundTo(client.fee*1.04,50);client.trust=clamp(client.trust+2,0,100);}
    }
    state.clients=state.clients.filter(client=>client.status==="active");
  }

  function eligibleTypes(state=S){
    const m=state.month,y=year(state),model=starterModel(state),ids=["smb_leadgen"];
    if(m>=2&&(model.id==="creative_agency"||hasTech("commerce_feeds",state)||y>=2020))ids.push("smb_commerce");
    if(m>=5&&hasTech("measurement",state))ids.push("enterprise_leadgen");
    if(m>=8&&hasTech("measurement",state)&&(model.id==="creative_agency"||hasTech("commerce_feeds",state)))ids.push("enterprise_commerce");
    return ids;
  }

  function prospectChannel(state,typeId,id){
    const model=starterModel(state),options=[];
    for(const channel of Object.values(AGENCY_CHANNELS)){
      if(!model.allowedChannels.includes(channel.id)||!hasTech(channel.tech,state))continue;
      if(channel.id==="shopping"&&!typeId.includes("commerce"))continue;
      if(channel.id==="programmatic"&&!typeId.startsWith("enterprise"))continue;
      if(["out_of_home","radio","cable"].includes(channel.id)&&model.id!=="creative_agency")continue;
      options.push(channel.id);
    }
    if(!options.length)options.push(model.id==="creative_agency"?"social":"search");
    return options[Math.floor(roll("prospect-channel",id)*options.length)];
  }

  function prospectVertical(state,typeId,id,channel){
    const compatible=AGENCY_VERTICALS.filter(vertical=>vertical.fit.includes(typeId)),channelFit=compatible.filter(vertical=>
      AGENCY_AD_CONCEPTS.some(concept=>concept.vertical===vertical.id&&concept.channels.includes(channel)));
    const matching=channel!=="search"&&channelFit.length?channelFit:compatible;
    const limit=Math.min(matching.length,4+(hasTech("portfolio_measurement",state)?4:0)+(hasTech("predictive_ops",state)?2:0));
    const pool=[],seen=new Set();
    for(const client of activeClients(state)){
      const vertical=matching.find(item=>item.id===client.vertical);
      if(vertical&&!seen.has(vertical.id)&&pool.length<limit){seen.add(vertical.id);pool.push(vertical);}
    }
    const ranked=matching.slice().sort((a,b)=>roll("practice-vertical",typeId,a.id)-roll("practice-vertical",typeId,b.id));
    for(const vertical of ranked)if(!seen.has(vertical.id)&&pool.length<limit){seen.add(vertical.id);pool.push(vertical);}
    return pool[Math.floor(roll("prospect-vertical",id)*pool.length)]||matching[0]||AGENCY_VERTICALS[0];
  }

  function growthProspectBonus(state=S,organicNeed=0){
    const spend=Math.max(0,Number(state.lastOperatingStatement?.categories?.eventsPartnershipsMarketing)||0);
    const supported=Math.min(3,Math.floor(spend/250));
    return Math.max(0,Math.min(supported,Math.ceil(Math.max(0,organicNeed)*.5)));
  }

  function generateProspects(state=S,count=null){
    if(state.businessModel!=="agency"||state.ended)return [];
    /* The seat schedule paces the AUTOMATIC desk only. An explicit count still generates, because
       the real ceiling is AGENCY_MAX_CLIENTS and it is enforced where a contract is accepted. */
    if(count==null&&activeClients(state).length>=seatsAllowedNow(state))return [];
    const gap=Math.max(0,seatsAllowedNow(state)-activeClients(state).length),baseNeed=count??Math.min(12,gap+2);
    const organicNeed=Math.max(1,Math.round(baseNeed*clamp(.65+state.reputation*.005,.65,1.15)));
    const bizDevBonus=Math.min(3,Math.floor((state.bizDevPoints||0)/2)),bizDevFit=1+Math.min(.06,(state.bizDevPoints||0)*.01);
    const need=count??Math.min(18,organicNeed+growthProspectBonus(state,organicNeed)+bizDevBonus);
    const made=[];
    for(let k=0;k<need;k++){
      const seq=state.telemetry.clientsAccepted+state.telemetry.clientsRejected+state.prospects.length+k+1;
      const id=`lead-${state.month+1}-${seq}`,types=eligibleTypes(state);
      const typeId=types[Math.floor(roll("prospect-type",id)*types.length)],channel=prospectChannel(state,typeId,id),vertical=prospectVertical(state,typeId,id,channel);
      const base=makeClient(`candidate-${id}`,typeId,state.month,{channel,vertical,ownerState:state});
      const reputationFit=clamp(.78+state.reputation*.004,.78,1.18)*bizDevFit;
      base.fee=roundTo(base.fee*reputationFit,50);base.trust=clamp(base.trust+(state.reputation-60)*.12,45,82);
      const onboarding=roundTo(300+typeOf(base).work*650*channelOf(base).workM,50);
      made.push({...base,id,status:"prospect",onboarding,fit:breadth(state,base).multiplier,expiresMonth:state.month+(state.reputation>=55?2:1)});
    }
    state.prospects.push(...made);
    state.prospects=state.prospects.filter((lead,index,arr)=>lead.expiresMonth>=state.month&&arr.findIndex(x=>x.id===lead.id)===index).slice(0,18);
    return made;
  }

  function acceptProspect(id,options={}){
    const state=S,index=state.prospects.findIndex(item=>item.id===id),lead=state.prospects[index];
    if(state.ended||state.businessModel!=="agency"||!lead||activeClients(state).length>=AGENCY_MAX_CLIENTS||state.focusRemaining<1)return false;
    if(state.cash-lead.onboarding < -state.creditLimit)return false;
    state.focusRemaining--;state.cash-=lead.onboarding;addMonthCost(state,"onboarding",lead.onboarding);state.opsCost+=lead.onboarding;
    const client={...lead,id:`client-${String(state.telemetry.clientsAccepted+2).padStart(3,"0")}`,status:"active",createdMonth:state.month,
      createdDay:state.day,nextDue:state.day+1,contractEndMonth:state.month+12,incident:null,incidentAge:0,serviceDebt:0,lastAction:"Onboarding"};
    state.clients.push(client);state.prospects.splice(index,1);state.telemetry.clientsAccepted++;state.reputation=clamp(state.reputation+.25,0,100);
    state.log.unshift({concept:"structure",html:`<div><b class="pos">Client accepted</b> · ${esc(client.name)} occupies one of ${AGENCY_MAX_CLIENTS} client seats. ${safeMoney(client.onboarding)} onboarding cost entered the agency ledger; ${safeMoney(client.mediaBudget)} client media budget did not.</div>`});
    markRunDirty();if(options.render!==false){close();render();}return client;
  }

  function rejectProspect(id,options={}){
    if(S.ended)return false;const index=S.prospects.findIndex(item=>item.id===id);if(index<0)return false;
    const [lead]=S.prospects.splice(index,1);S.telemetry.clientsRejected++;
    S.log.unshift({concept:"structure",html:`<div><b>Lead declined</b> · ${esc(lead.name)}. Capacity and positioning are valid reasons to leave a client seat empty.</div>`});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }

  function hire(role,options={}){
    const spec=STAFF[role],equipment=spec?workstationSetupCost(role,S):0,total=spec?spec.hireCost+equipment:0;
    if(!spec||S.ended||S.staff[role]>=100||S.cash-total < -S.creditLimit)return false;
    accrueStaffThrough(S,S.dayInMonth-1);
    const focusSpent=Math.max(0,S.focusTotal-S.focusRemaining);
    S.cash-=total;addMonthCost(S,"recruiting",spec.hireCost);addMonthCost(S,"equipmentSetup",equipment);S.opsCost+=total;S.staff[role]++;
    S.telemetry.staffHired++;refreshCapacity(S,focusSpent);S.log.unshift({concept:"structure",html:`<div><b>Hired ${esc(spec.label)}</b> · ${safeMoney(spec.hireCost)} recruiting + ${safeMoney(equipment)} workstation setup. Monthly wages, employer taxes and benefits now enter the operating statement.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }

  function releaseStaff(role,options={}){
    const spec=STAFF[role];if(!spec||S.ended||S.staff[role]<=0)return false;
    const severance=roundTo(spec.salary*eraCostFactor(S)*.5,50);if(S.cash-severance < -S.creditLimit)return false;
    accrueStaffThrough(S,S.dayInMonth-1);
    const focusSpent=Math.max(0,S.focusTotal-S.focusRemaining);
    S.staff[role]--;S.cash-=severance;addMonthCost(S,"severance",severance);S.opsCost+=severance;S.telemetry.staffReleased++;
    refreshCapacity(S,focusSpent);S.log.unshift({concept:"structure",html:`<div><b>Role released</b> · ${esc(spec.label)}. ${safeMoney(severance)} severance entered the ledger; capacity falls immediately.</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }

  function canUnlock(id,state=S){
    const item=node(id);if(!item)return {ok:false,reason:"Capability unavailable"};
    if(hasTech(id,state))return {ok:false,reason:"Already unlocked"};
    if(id==="affiliate_engine"&&state.businessModel!=="agency")return {ok:false,reason:"Already operating owned offers"};
    const model=starterModel(state),representedChannels=Object.values(AGENCY_CHANNELS).filter(channel=>channel.tech===id);
    if(Array.isArray(item.availableModels)&&!item.availableModels.includes(model.id))return {ok:false,reason:`Only available to ${item.availableModels.map(key=>starterModel(key).label).join(" or ")}`};
    if(representedChannels.length&&representedChannels.every(channel=>!model.allowedChannels.includes(channel.id)))return {ok:false,reason:`Outside the ${model.label.toLowerCase()} service model`};
    if(model.id==="creative_agency"&&["search_foundations","landing_systems","commerce_feeds","automation"].includes(id))return {ok:false,reason:"Paid-search systems are outside this agency's service model"};
    if(year(state)<item.year)return {ok:false,reason:`Available in ${item.year}`};
    if(item.level&&state.level<item.level)return {ok:false,reason:`Requires Agency career level ${item.level}`};
    const effectiveRequires=item.requires.map(req=>model.id==="creative_agency"&&item.id==="measurement"&&req==="search_foundations"?null:
      model.id==="creative_agency"&&item.id==="predictive_ops"&&req==="automation"?"creative_automation":req).filter(Boolean);
    const missing=effectiveRequires.filter(req=>!hasTech(req,state));
    if(missing.length)return {ok:false,reason:`Requires ${missing.map(req=>node(req)?.label||req).join(" + ")}`};
    if(state.skillPoints<item.cost)return {ok:false,reason:`Needs ${item.cost} Agency capability point${item.cost===1?"":"s"}`};
    const investment=capabilityInvestment(item,state);
    if(state.cash<investment)return {ok:false,reason:`Needs ${safeMoney(investment)} in positive operating cash`};
    return {ok:true,reason:"Ready",investment,monthly:roundTo((Number(item.monthly)||0)*eraCostFactor(state),10)};
  }

  function unlock(id,options={}){
    if(S.ended)return false;
    const check=canUnlock(id,S),item=node(id);if(!check.ok||!item)return false;
    const focusSpent=Math.max(0,S.focusTotal-S.focusRemaining);
    const investment=capabilityInvestment(item,S),monthly=roundTo((Number(item.monthly)||0)*eraCostFactor(S),10);
    S.skillPoints-=item.cost;S.cash-=investment;if(investment){addMonthCost(S,"other",investment);S.opsCost+=investment;}
    S.unlocked.push(id);S.telemetry.techUnlocked++;
    refreshCapacity(S,focusSpent);
    S.log.unshift({concept:"structure",html:`<div><b class="pos">Capability unlocked</b> · ${esc(item.label)}. ${investment?`${safeMoney(investment)} entered this month's systems-investment ledger. `:""}${monthly?`${safeMoney(monthly)}/month enters recurring obligations. `:""}${esc(item.effect)}</div>`});
    markRunDirty();if(options.render!==false)render();return true;
  }

  function settleOperatingBills(state,statement,lines){
    const availableLiquidity=Math.max(0,state.cash+state.creditLimit),billsDue=statement.billsDue;
    const billsPaid=Math.min(billsDue,availableLiquidity),shortfall=Math.max(0,billsDue-billsPaid);
    state.cash-=billsPaid;state.lastSettlementId=statement.settlementId;
    state.unpaidOperatingBalance=shortfall;
    const recurring=monthlyOperatingCost(state),largest=Object.entries(recurring.categories).sort((a,b)=>b[1]-a[1])[0]||["other",0];
    state.lastOperatingStatement={...copy(statement),billsPaid,shortfall,cashAfter:state.cash,closedDay:state.day,status:shortfall?"unpaid":state.cash<0?"credit-used":"paid"};
    if(shortfall){
      state.ended=true;state.outcome="operating-insolvency";state.payrollMisses=1;state.reputation=clamp(state.reputation-15,0,100);
      state.telemetry.operatingInsolvencies++;state.insolvencyCause={settlementId:statement.settlementId,month:state.month,year:year(state),
        billsDue,billsPaid,shortfall,availableLiquidity,largestCategory:largest[0],largestCategoryLabel:AGENCY_EXPENSE_CATEGORIES[largest[0]]?.label||largest[0],largestCategoryAmount:largest[1]};
      lines.push(`<b class="neg">Operating cash exhausted</b> · ${safeMoney(billsDue)} was due for monthly company operations. Cash and the credit line covered ${safeMoney(billsPaid)}, leaving ${safeMoney(shortfall)} unpaid. The largest recurring obligation was ${esc(state.insolvencyCause.largestCategoryLabel)} at ${safeMoney(largest[1])}.`);
    }else{
      state.payrollMisses=0;state.insolvencyCause=null;
      if(state.cash<0){state.telemetry.liquidityWarnings++;lines.push(`<b class="amb">Credit line in use</b> · all monthly obligations were paid, but the operating account closed at ${safeMoney(state.cash)}. ${safeMoney(Math.max(0,state.creditLimit+state.cash))} of borrowing capacity remains.`);}
      else lines.push(`<b class="pos">Monthly operating bills paid</b> · ${safeMoney(billsPaid)} cleared from company cash without drawing the credit line.`);
    }
    return {billsDue,billsPaid,shortfall,availableLiquidity};
  }

  function historyCostFields(state,statement,settlement){
    const runway=cashRunway(state);
    return {settlementId:statement.settlementId,expenseBreakdown:copy(statement.categories),recurringOperatingCost:statement.recurringTotal,
      variableOperatingCost:statement.variableTotal,billsDue:settlement.billsDue,billsPaid:settlement.billsPaid,unpaidBalance:settlement.shortfall,
      cashRunwayMonths:runway.cashMonths,liquidityRunwayMonths:runway.liquidityMonths};
  }

  function closeAgencyMonth(state,lines){
    const economics=monthAgencyEconomics(state),statement=monthlyOperatingStatement(state);
    const organic=settleServiceLines(state,lines),revenue=economics.revenue+organic;
    const totalCost=statement.totalExpense,profit=revenue-totalCost;
    state.cumulativeRevenue+=revenue;state.cumulativeCosts+=totalCost;state.cumulativeProfit+=profit;
    state.spendTotal=state.cumulativeCosts;state.telemetry.agencyRevenue+=revenue;state.telemetry.agencyCosts+=totalCost;
    economics.invoices.forEach((invoice,index)=>state.receivables.push({id:`invoice-${state.month+1}-${index+1}-${invoice.clientId}`,kind:"agency",
      amount:invoice.amount,dueDay:state.day+invoice.terms,clientId:invoice.clientId}));
    const settlement=settleOperatingBills(state,statement,lines);
    if(!state.ended&&state.month===0){
      const founding=activeClients(state).find(client=>client.id==="client-001");
      const retained=founding&&founding.trust>=50&&founding.health>=48&&founding.serviceDebt<5&&
        !(founding.incident?.critical&&founding.incidentAge>3);
      if(!retained){
        if(founding){founding.status="churned";state.archivedClients.push({...founding});state.clients=state.clients.filter(client=>client.id!==founding.id);state.telemetry.clientsChurned++;}
        state.ended=true;state.outcome="founding-client-lost";
        lines.push(`<b class="neg">The founding client left.</b> Month 1 closed without enough trust, account health, or service coverage to renew the relationship.`);
      }else lines.push(`<b class="pos">The founding client renewed.</b> The first closed-loop service challenge is complete. Month 2 will open a second small-business lead-generation choice.`);
    }
    if(!state.ended)renewClients(state,state.month,lines);
    const previousLevel=state.level;state.peakProfit=Math.max(state.peakProfit,state.cumulativeProfit);
    state.level=Math.min(22,1+Math.floor(Math.sqrt(Math.max(0,state.peakProfit)/25000)));
    if(state.level>previousLevel){const gained=state.level-previousLevel;state.skillPoints+=gained;state.telemetry.profitLevels+=gained;
      lines.push(`<b class="pos">Agency career level ${state.level}</b> · ${gained} capability point${gained===1?"":"s"} earned from peak career profit.`);}
    state.monthlyHistory.push({month:state.month,year:year(state),seats:activeClients(state).length,revenue,organicRevenue:organic,
      costs:totalCost,profit,cash:state.cash,retainers:economics.retainers,bonuses:economics.bonuses,credits:economics.credits,
      payroll:statement.categories.employeeWages,clientMediaSpend:state.monthClientMediaSpend,...historyCostFields(state,statement,settlement)});
    lines.push(`<b>Month close</b> · agency revenue ${safeMoney(revenue)}${organic?` (including ${safeMoney(organic)} from organic service lines)`:""} · agency costs ${safeMoney(totalCost)} · operating profit <span class="${profit>=0?"pos":"neg"}">${safeMoney(profit)}</span>. The statement includes ${safeMoney(statement.recurringTotal)} in monthly obligations and ${safeMoney(statement.variableTotal)} in operating costs paid as choices were made. Client media spend stayed outside every agency total.`);
  }

  function closeAffiliateMonth(state,lines){
    const statement=monthlyOperatingStatement(state),organic=settleServiceLines(state,lines);
    const recognizedRevenue=(state.monthAffiliateCollected||0)+organic;
    const costs=statement.totalExpense,profit=recognizedRevenue-costs;
    state.cumulativeRevenue+=recognizedRevenue;state.cumulativeCosts+=costs;state.cumulativeProfit+=profit;
    state.spendTotal=state.cumulativeCosts;state.peakProfit=Math.max(state.peakProfit,state.cumulativeProfit);
    state.telemetry.agencyRevenue+=recognizedRevenue;state.telemetry.agencyCosts+=costs;
    const previousLevel=state.level;state.level=Math.min(22,1+Math.floor(Math.sqrt(Math.max(0,state.peakProfit)/25000)));
    if(state.level>previousLevel){state.skillPoints+=state.level-previousLevel;state.telemetry.profitLevels+=state.level-previousLevel;}
    const settlement=settleOperatingBills(state,statement,lines);
    state.monthlyHistory.push({month:state.month,year:year(state),businessModel:"affiliate",funnels:state.affiliate.funnels.length,
      revenue:recognizedRevenue,modeledPayoutEarned:state.monthAffiliateEarned,costs,profit,cash:state.cash,payroll:statement.categories.employeeWages,
      mediaSpend:state.monthAffiliateSpend,...historyCostFields(state,statement,settlement)});
    lines.push(`<b>Month close</b> · validated payouts collected ${safeMoney(recognizedRevenue)} (${safeMoney(state.monthAffiliateEarned)} modeled this month) · owned media and operating costs ${safeMoney(costs)} · operating profit <span class="${profit>=0?"pos":"neg"}">${safeMoney(profit)}</span>.`);
  }

  function closeMonth(state,lines){
    const closingYear=year(state),closingMonth=state.month;
    if(state.businessModel==="agency")closeAgencyMonth(state,lines);else closeAffiliateMonth(state,lines);
    if(state.businessModel==="agency"&&!state.ended){
      const seats=managedClients(state).length,gap=Math.max(0,state.targetSeats-seats);
      if(gap){state.telemetry.growthGatesMissed++;state.reputation=clamp(state.reputation-Math.min(6,1+gap*.35),0,100);
        lines.push(`<b class="amb">Growth gate missed</b> · ${seats}/${state.targetSeats} managed client seats. A newly signed account counts only after the team operates it; the company continues, but prospect quality and reputation soften.`);}
      else{state.telemetry.growthGatesMet++;state.reputation=clamp(state.reputation+.5,0,100);}
    }
    state.month++;
    if(state.month>=AGENCY_TOTAL_MONTHS&&!state.ended){
      state.ended=true;state.outcome=state.cumulativeProfit>=AGENCY_PROFIT_TARGET&&state.cash>=0&&state.payrollMisses===0?"win":"target-missed";
    }
    if(state.ended)return;
    state.dayInMonth=1;state.targetSeats=state.businessModel==="agency"?desiredSeatsForMonth(state.month+1):0;
    state.monthVariableCosts=0;state.monthCostLedger=emptyMonthCostLedger();state.monthStaffDays=emptyStaffDayLedger();state.staffAccruedThrough=0;
    state.monthClientMediaSpend=0;state.monthAffiliateSpend=0;state.monthAffiliateEarned=0;state.monthAffiliateCollected=0;
    if(state.businessModel==="agency"){
      state.prospects=state.prospects.filter(lead=>lead.expiresMonth>=state.month);
      /* The desk refreshes each month rather than accumulating. Candidates who were not signed
         in Month 1 have gone elsewhere, which is also why the monthly pipeline count stays a
         readable number instead of a growing pile. */
      state.prospects=[];
      generateProspects(state);
      state.bizDevPoints=0;
      const seats=managedClients(state).length;
      if(seats>=state.targetSeats){state.reputation=clamp(state.reputation+1,0,100);lines.push(`<b class="pos">Growth gate covered</b> · ${seats}/${state.targetSeats} active client seats.`);}
      else lines.push(`<b class="amb">Growth target not yet met</b> · ${seats}/${state.targetSeats} active client slots. New prospective clients are available, but you choose whether to accept each contract.`);
    }
    const nextYear=year(state);if(nextYear!==closingYear&&!state.eraSeen.includes(nextYear)){
      state.eraSeen.push(nextYear);const era=AGENCY_ERAS.find(item=>item.year===nextYear);
      if(era)lines.push(`<b>${esc(nextYear)} · ${esc(era.title)}</b> — ${esc(era.copy)}`);
    }
    if(closingMonth===0&&state.businessModel==="agency"&&activeClients(state).length){state.skillPoints++;
      lines.push(`<b class="pos">Month 1 survived</b> · the first growth gate grants one Agency capability point and a choice of new small-business leads.`);}
  }

  function creativeProductionModifier(state=S){
    let modifier=1;
    if(hasTech("workstation_fleet",state))modifier*=.90;
    if(hasTech("creative_automation",state))modifier*=.84;
    if(hasTech("automated_creative_pipeline",state))modifier*=.70;
    if(hasTech("local_ai_cluster",state))modifier*=.82;
    return modifier;
  }
  function affiliateRefreshCost(state=S){return Math.max(400,roundTo(1500*creativeProductionModifier(state),50));}
  function affiliateRefreshLift(state=S){return 28+(hasTech("creative_automation",state)?5:0)+(hasTech("automated_creative_pipeline",state)?9:0)+(hasTech("local_ai_cluster",state)?5:0);}
  function funnelLaunchCost(state=S){return Math.max(12500,roundTo(25000*(hasTech("automated_creative_pipeline",state)?.84:1)*(hasTech("local_ai_cluster",state)?.88:1),50));}

  function simulateAffiliateDay(state,lines){
    let spend=0,earned=0;
    for(const funnel of state.affiliate.funnels){
      if(funnel.pausedDays>0){funnel.pausedDays--;continue;}
      if(funnel.dailyBudget<=0)continue;
      const fundedSpend=Math.min(funnel.dailyBudget,Math.max(0,state.cash+state.creditLimit));
      if(fundedSpend<=0){lines.push(`<b class="neg">${esc(funnel.name)} could not fund delivery.</b> Available cash and credit are exhausted.`);continue;}
      const vertical=AFFILIATE_VERTICALS.find(item=>item.id===funnel.verticalId)||AFFILIATE_VERTICALS[0];
      const noise=.72+roll("affiliate-day",state.day,funnel.id)*.58;
      const fatigueM=clamp(1-funnel.fatigue*.006,.38,1),signalM=.72+funnel.signal*.003,complianceM=clamp(1-funnel.complianceHeat*.004,.55,1);
      const mer=vertical.baseMer*noise*fatigueM*signalM*complianceM;
      const value=fundedSpend*mer,lag=14+Math.floor(roll("affiliate-lag",state.day,funnel.id)*32);
      spend+=fundedSpend;earned+=value;state.cash-=fundedSpend;
      state.receivables.push({id:`payout-${state.day}-${funnel.id}`,kind:"affiliate",amount:value,dueDay:state.day+lag,
        clawbackRisk:.02+vertical.compliance*.035+funnel.complianceHeat*.0007});
      funnel.fatigue=clamp(funnel.fatigue+(1.4+(fundedSpend/4000))*creativeProductionModifier(state),0,100);
      const era=AGENCY_ERAS.find(item=>item.year===year(state))||AGENCY_ERAS[0];
      funnel.complianceHeat=clamp(funnel.complianceHeat+(vertical.compliance*.35+(state.affiliate.posture==="opaque"?.25:-.15))*(era.flags.enforcement||1),0,100);
      funnel.signal=clamp(funnel.signal+(mer>=1?1:-1),0,100);funnel.last={spend:fundedSpend,earned:value,mer,lag};
      if(funnel.complianceHeat>72&&roll("affiliate-review",state.day,funnel.id)<.08*(era.flags.enforcement||1)){
        funnel.pausedDays=5+Math.floor(roll("affiliate-pause",state.day,funnel.id)*8);state.telemetry.affiliateShutdowns++;
        lines.push(`<b class="neg">${esc(funnel.name)} entered review</b> · delivery pauses ${funnel.pausedDays} workdays while claims and ownership evidence are checked.`);
      }
    }
    state.monthAffiliateSpend+=spend;state.monthAffiliateEarned+=earned;state.mediaSpendTotal+=spend;
    lines.push(`Owned funnel media ${safeMoney(spend)} · modeled payout earned ${safeMoney(earned)}. Cash collection remains delayed.`);
  }

  function runDay(options={}){
    const state=S;if(!state||state.engine!=="agency-career"||state.ended)return false;
    if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("run"))return false;
    if(!options.force&&state.businessModel==="agency"){
      const critical=activeClients(state).filter(client=>client.incident?.critical),due=activeClients(state).filter(client=>routineDue(client,state));
      if((critical.length||(state.month===0&&due.length))&&!state.pendingInteraction){
        state.pendingInteraction={type:"end-day",day:state.day};reopenPending();return false;
      }
    }
    const incidentKeys=new Set(activeClients(state).filter(client=>client.incident).map(client=>`${client.id}:${client.incident.openedDay}`));
    const shutdownsBefore=state.telemetry.affiliateShutdowns,historyBefore=state.monthlyHistory.length;
    state.pendingInteraction=null;const lines=[];const collectedToday=collectReceivables(state,lines);
    if(state.businessModel==="agency"){
      delegateRoutine({render:false});const unresolved=unresolvedConsequences(state,lines);
      for(const client of activeClients(state))simulateClientDay(state,client);
      const cap=capacity(state);lines.push(`${activeClients(state).length} client seat${activeClients(state).length===1?"":"s"} · ${unresolved.length} unresolved need${unresolved.length===1?"":"s"} · ${state.focusRemaining}/${state.focusTotal} focus unused · ${pct(cap.utilization*100)} forecast utilization.`);
    }else simulateAffiliateDay(state,lines);
    for(const line of activeServiceLines(state)){const record=serviceLineState(state,line.id);if(record)record.momentum=clamp(record.momentum-1.25,0,100);}
    if(state.businessModel==="agency")for(const client of activeClients(state)){
      if(!client.services)continue;
      for(const id of Object.keys(client.services))client.services[id]=clamp(Number(client.services[id])-1.1,0,100);
    }
    /* The day report is what connects one workday to the next: what the media bought today,
       which accounts moved, what broke, and what now needs a decision. Without it the loop is
       a button that ticks a number. */
    if(state.businessModel==="agency"){
      const rows=activeClients(state).map(client=>{const today=client.campaignHistory?.at(-1);if(!today||today.day!==state.day)return null;
        const prior=client.campaignHistory.at(-2);
        return {name:client.name,spend:today.spend,leads:today.leads,value:today.value,index:today.index,
          clicks:Number(today.clicks)||0,impressions:Number(today.impressions)||0,
          delta:prior?Math.round(today.index-prior.index):0,changed:today.changed,
          incident:client.incident?client.incident.label:null,due:routineDue(client,state)};}).filter(Boolean);
      /* Both sides of the ledger, in money the player can act on: what the client's media
         bought them, what the agency earned for the day, and where the company stands. */
      const economics=monthAgencyEconomics(state),statement=monthlyOperatingStatement(state);
      const dayFee=activeClients(state).reduce((sum,client)=>sum+client.fee/AGENCY_MONTH_DAYS,0);
      state.lastDayReport={day:state.day,dayInMonth:state.dayInMonth,month:state.month,
        spend:Math.round(rows.reduce((sum,row)=>sum+row.spend,0)),
        leads:Math.round(rows.reduce((sum,row)=>sum+row.leads,0)*10)/10,
        clientValue:Math.round(rows.reduce((sum,row)=>sum+(row.value||0),0)),
        clicks:Math.round(rows.reduce((sum,row)=>sum+(row.clicks||0),0)),
        impressions:Math.round(rows.reduce((sum,row)=>sum+(row.impressions||0),0)),
        feeEarned:Math.round(dayFee),
        monthRevenue:Math.round(economics.revenue),
        monthCosts:Math.round(statement.totalExpense),
        monthProfit:Math.round(economics.revenue-statement.totalExpense),
        cash:Math.round(state.cash),
        receivables:Math.round(state.receivables.reduce((sum,item)=>sum+item.amount,0)),
        careerProfit:Math.round(state.cumulativeProfit),
        billsDue:Math.round(statement.billsDue),dueInDays:statement.dueInWorkdays,
        focusUsed:Math.max(0,state.focusTotal-state.focusRemaining),focusTotal:state.focusTotal,
        rows:rows.slice(0,6),collected:Math.round(collectedToday||0)};
    }
    state.telemetry.daysOperated++;const closingLabel=monthName(state),closingDay=state.dayInMonth;
    accrueStaffThrough(state,state.dayInMonth);
    if(state.dayInMonth>=AGENCY_MONTH_DAYS)closeMonth(state,lines);else state.dayInMonth++;
    state.log.unshift({concept:"day",html:`<div><b>${closingLabel} · workday ${closingDay}</b><br>${lines.join("<br>")}</div>`});
    state.log=state.log.slice(0,180);
    state.day++;if(state.month===0&&state.tutorialStep===3)state.tutorialStep=4;
    /* A seat opens on days 2, 3, 4, 5 and again at day 15. Put candidates on the desk that
       morning so the day has a decision in it rather than an empty roster. */
    if(state.month===0&&!state.ended&&activeClients(state).length+state.prospects.length<seatsAllowedNow(state)){
      const opened=generateProspects(state);
      if(opened&&opened.length)state.log.unshift({concept:"structure",html:`<div><b>A new client is looking</b> · ${opened.length} ${opened.length===1?"business has":"businesses have"} approached the agency. Signing one fills a seat and adds a retainer; it also adds an account somebody has to service every week. Review them on the prospective-clients desk.</div>`});
    }
    if(typeof tutorialAfterAction==="function")tutorialAfterAction("run",{day:state.day});
    if(!state.ended)prepareDay(state);
    if(typeof autoCheckpoint==="function")autoCheckpoint();
    const newIncident=activeClients(state).filter(client=>client.incident&&!incidentKeys.has(`${client.id}:${client.incident.openedDay}`))
      .sort((a,b)=>(b.incident.critical?1:0)-(a.incident.critical?1:0))[0];
    const closedMonth=state.monthlyHistory.length>historyBefore?state.monthlyHistory[state.monthlyHistory.length-1]:null;
    if(state.telemetry.affiliateShutdowns>shutdownsBefore)queueDayFx("review",{name:"An owned funnel entered compliance review"});
    if(newIncident)queueDayFx("clientRisk",{name:`${newIncident.name} · ${newIncident.incident.label}`});
    if(closedMonth&&closedMonth.profit>0)queueDayFx("agencyProfit",{profit:closedMonth.profit});
    render();
    if(!state.ended&&state.businessModel==="agency"&&state.lastDayReport)showDayDebrief();
    if(state.ended){pendingDayFx=[];const insolvency=state.outcome==="operating-insolvency",won=state.outcome==="win";
      fireFx(won?"success":"fail",won?
        {kicker:"Career target cleared",value:"2027 EXIT CLEARED",sub:`${safeMoney(state.cumulativeProfit)} cumulative operating profit`}:
        insolvency?{kicker:"Monthly obligations could not clear",value:"OPERATING CASH EXHAUSTED",sub:`${safeMoney(state.unpaidOperatingBalance)} remained unpaid after cash and credit`}:
        {kicker:"Career run complete",value:"TARGET MISSED",sub:`${safeMoney(state.cumulativeProfit)} cumulative operating profit`});
      const html=debrief();if(typeof show==="function"){show(html,won?"victory":"defeat",{wide:true,rosetta:false});afterDebriefRendered();}}
    else flushDayFx();
    return true;
  }

  /* UNIFIED COMPANY TRANSFORMATION (2026-08-09). Becoming a different kind of company used to
     be one special-cased escape hatch (agency -> owned offers). It is now a standard mechanic:
     any company can become any other type by spending capability points and cash at a clean
     month opening. What survives is everything you built — calendar, cash, staff, systems,
     reputation, level and career profit. What ends is the work that belongs to the old type. */
  const TRANSFORM_POINT_COST=4;
  function transformCashCost(state=S){return roundTo(150000*eraCostFactor(state),1000);}
  function transformTargets(state=S){
    const current=starterModel(state).id;
    return Object.values(AGENCY_STARTER_MODELS).filter(model=>model.id!==current||state.businessModel==="affiliate");
  }
  function canTransform(targetId,state=S){
    const target=AGENCY_STARTER_MODELS[targetId];
    if(!target)return {ok:false,reason:"Unknown company type"};
    const current=starterModel(state);
    if(target.id===current.id&&state.businessModel!=="affiliate")return {ok:false,reason:"Already this kind of company"};
    const cash=transformCashCost(state);
    const requirements={
      year:year(state)>=2020,
      level:state.level>=6,
      points:state.skillPoints>=TRANSFORM_POINT_COST,
      cash:state.cash>=cash,
      boundary:state.dayInMonth===1&&state.focusRemaining===state.focusTotal&&state.monthVariableCosts===0
    };
    const failed=Object.entries(requirements).find(([,met])=>!met);
    const why={year:"Available from 2020",level:"Needs Agency career level 6",
      points:`Needs ${TRANSFORM_POINT_COST} capability points`,cash:`Needs ${safeMoney(cash)} in operating cash`,
      boundary:"Only at the start of a month, before any focus or cash is spent"};
    return {ok:!failed,reason:failed?why[failed[0]]:"Ready",requirements,cash,points:TRANSFORM_POINT_COST,target};
  }
  function transformCompany(targetId,options={}){
    const state=S,check=canTransform(targetId,state);
    if(!state||state.ended||!check.ok)return false;
    const target=check.target,wasModel=starterModel(state).label;
    state.skillPoints-=TRANSFORM_POINT_COST;state.cash-=check.cash;
    addMonthCost(state,"transformation",check.cash);state.opsCost+=check.cash;
    /* Client work and owned offers belong to a company type, so the old type's book closes. */
    if(state.clients.length)state.archivedClients.push(...activeClients(state).map(client=>({...client,status:"offboarded-at-pivot"})));
    state.clients=[];state.prospects=[];
    state.agencyIdentity={...state.agencyIdentity,agencyType:target.id};
    /* Capabilities the new type cannot practise are surrendered with the old book. */
    state.unlocked=state.unlocked.filter(id=>canUnlock(id,state).reason!=="Already unlocked"||true)
      .filter(id=>{const channels=Object.values(AGENCY_CHANNELS).filter(channel=>channel.tech===id);
        if(channels.length&&channels.every(channel=>!target.allowedChannels.includes(channel.id)))return false;
        if(target.id==="creative_agency"&&["search_foundations","landing_systems","commerce_feeds","automation"].includes(id))return false;
        return true;});
    for(const id of target.startingUnlocks)if(node(id)&&!state.unlocked.includes(id))state.unlocked.push(id);
    /* Service lines that belonged to the old type close with it. */
    if(state.services)for(const id of Object.keys(state.services)){
      const line=serviceLineSpec(id);if(line&&!line.models.includes(target.id))delete state.services[id];
    }
    if(target.id==="holding_company"){
      state.businessModel="affiliate";state.targetSeats=0;
      const verticals=AFFILIATE_VERTICALS.slice().sort((a,b)=>roll("transform-offer",a.id)-roll("transform-offer",b.id)).slice(0,2);
      state.affiliate={pivotMonth:state.month,posture:"documented",origin:"transformation",preserved:null,
        funnels:verticals.map((vertical,index)=>{const offer=holdingOffer(vertical.id);
          return {id:`funnel-t${state.month}-${index+1}`,name:offer.name,verticalId:vertical.id,dailyBudget:1500,
            fatigue:5,signal:62,complianceHeat:12+vertical.compliance*6,pausedDays:0,last:null,
            audience:offer.audience,stakes:offer.stakes,adConcept:offer.adConcept,adFormat:offer.adFormat};})};
    }else{
      state.businessModel="agency";state.affiliate=null;
      state.targetSeats=desiredSeatsForMonth(state.month+1);
      generateProspects(state,6);
    }
    state.telemetry.pivoted=true;
    state.log.unshift({concept:"structure",html:`<div><b class="pos">The company changed what it is</b> · ${esc(wasModel)} → ${esc(target.label)}. ${TRANSFORM_POINT_COST} capability points and ${safeMoney(check.cash)} paid for the transition. Cash, staff, systems, reputation, level and career profit carried over; the old book of work did not. ${esc(target.channelRule)}</div>`});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }
  function canPivot(state=S){
    const channelCapabilities=["search_foundations","paid_social","commerce_feeds","short_form","programmatic"].filter(id=>hasTech(id,state)).length;
    const cleanOpening=state.dayInMonth===1&&state.focusRemaining===state.focusTotal&&state.monthVariableCosts===0;
    const requirements={year:year(state)>=2021,level:state.level>=8,cash:state.cash>=350000,engine:hasTech("affiliate_engine",state),channels:channelCapabilities>=2,boundary:cleanOpening};
    return {ok:Object.values(requirements).every(Boolean),requirements,channelCapabilities};
  }

  function pivot(options={}){
    const state=S,check=canPivot(state);if(state.ended||!check.ok||state.businessModel!=="agency")return false;
    const setupCost=150000;if(state.cash-setupCost < -state.creditLimit)return false;
    const preserved={cash:state.cash,cumulativeProfit:state.cumulativeProfit,level:state.level,skillPoints:state.skillPoints,
      unlocked:state.unlocked.slice(),staff:{...state.staff},reputation:state.reputation,month:state.month,day:state.day};
    state.archivedClients.push(...activeClients(state).map(client=>({...client,status:"offboarded-at-pivot"})));
    state.clients=[];state.prospects=[];state.businessModel="affiliate";state.cash-=setupCost;addMonthCost(state,"transformation",setupCost);state.opsCost+=setupCost;
    const ownedOffer=holdingOffer("home-intent");state.affiliate={pivotMonth:state.month,posture:"opaque",origin:"agency-pivot",funnels:[{id:"funnel-1",name:ownedOffer.name,verticalId:"home-intent",
      dailyBudget:2500,fatigue:8,signal:68,complianceHeat:18,pausedDays:0,last:null,audience:ownedOffer.audience,stakes:ownedOffer.stakes,adConcept:ownedOffer.adConcept,adFormat:ownedOffer.adFormat}],preserved};
    state.telemetry.pivoted=true;state.targetSeats=0;
    state.log.unshift({concept:"structure",html:`<div><b>Business model transformed</b> · client retainers ended and client-owned accounts were handed back. Cash, staff, systems, reputation, level, and ${safeMoney(state.cumulativeProfit)} career profit carried forward. Owned media, payout lag, clawbacks, and compliance resilience now drive the company.</div>`});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }

  function affiliateAction(id,action,options={}){
    const state=S,funnel=state.affiliate?.funnels.find(item=>item.id===id);if(state.ended||!funnel||state.focusRemaining<1)return false;
    const spendStep=500,refreshCost=affiliateRefreshCost(state),refreshLift=affiliateRefreshLift(state);
    if(action==="scale-up"){if(state.cash<10000||funnel.dailyBudget>=25000)return false;funnel.dailyBudget=Math.min(25000,funnel.dailyBudget+spendStep);funnel.complianceHeat=clamp(funnel.complianceHeat+1,0,100);}
    else if(action==="scale-down"){if(funnel.dailyBudget<=0)return false;funnel.dailyBudget=Math.max(0,funnel.dailyBudget-spendStep);}
    else if(action==="refresh"){if(state.cash<refreshCost||funnel.fatigue<=0)return false;state.cash-=refreshCost;addMonthCost(state,"clientService",refreshCost);funnel.fatigue=clamp(funnel.fatigue-refreshLift,0,100);}
    else if(action==="audit"){if(state.cash<1000||(funnel.signal>=100&&funnel.complianceHeat<=0))return false;state.cash-=1000;addMonthCost(state,"compliance",1000);funnel.signal=clamp(funnel.signal+12,0,100);funnel.complianceHeat=clamp(funnel.complianceHeat-8,0,100);}
    else if(action==="document"){if(state.cash<3000||(state.affiliate.posture==="documented"&&funnel.complianceHeat<=0))return false;state.cash-=3000;addMonthCost(state,"compliance",3000);state.affiliate.posture="documented";funnel.complianceHeat=clamp(funnel.complianceHeat-18,0,100);}
    else return false;
    state.focusRemaining--;
    const tutorialAdvanced=state.tutorialEnabled&&state.month===0&&state.tutorialStep<=1&&id==="funnel-1"&&action==="audit";
    if(tutorialAdvanced)state.tutorialStep=2;
    const label=action==="scale-up"?"Daily budget raised":action==="scale-down"?"Daily budget lowered":action==="refresh"?"Creative refreshed":action==="audit"?"Signal audited":"Network documented";
    state.log.unshift({concept:action==="audit"?"measurement":action==="refresh"?"creative":"structure",html:`<div><b>${label}</b> · ${esc(funnel.name)} now carries ${safeMoney(funnel.dailyBudget)}/day, ${pct(funnel.signal)} signal, ${pct(funnel.fatigue)} fatigue and ${pct(funnel.complianceHeat)} compliance heat.</div>`});
    markRunDirty();if(options.render!==false){render();if(tutorialAdvanced)focusGuidedControl(2);}return true;
  }

  function documentAffiliateNetwork(options={}){
    const state=S,useful=state.affiliate?.posture!=="documented"||state.affiliate?.funnels.some(funnel=>funnel.complianceHeat>0);
    if(state.ended||state.businessModel!=="affiliate"||!state.affiliate?.funnels.length||state.focusRemaining<1||state.cash<3000||!useful)return false;
    state.cash-=3000;addMonthCost(state,"compliance",3000);state.affiliate.posture="documented";state.focusRemaining--;
    for(const funnel of state.affiliate.funnels)funnel.complianceHeat=clamp(funnel.complianceHeat-18,0,100);
    state.log.unshift({concept:"compliance",html:"<div><b>Claims and ownership documented</b> · $3,000 and 1 focus used. Compliance heat fell by 18 points across every owned funnel, and future enforcement pressure uses the documented-network posture.</div>"});
    markRunDirty();if(options.render!==false)render();return true;
  }

  function launchFunnel(verticalId,options={}){
    const vertical=AFFILIATE_VERTICALS.find(item=>item.id===verticalId),launchCost=funnelLaunchCost(S);if(S.ended||!vertical||S.businessModel!=="affiliate"||S.cash<launchCost||S.affiliate.funnels.length>=8)return false;
    const id=`funnel-${S.affiliate.funnels.length+1}-${S.month}`,offer=holdingOffer(verticalId);S.cash-=launchCost;addMonthCost(S,"funnelDevelopment",launchCost);S.opsCost+=launchCost;
    S.affiliate.funnels.push({id,name:offer.name,verticalId,dailyBudget:2000,fatigue:5,signal:60,
      complianceHeat:12+vertical.compliance*8,pausedDays:0,last:null,audience:offer.audience,stakes:offer.stakes,adConcept:offer.adConcept,adFormat:offer.adFormat});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }

  function sortedRoster(state=S){
    const rows=activeClients(state).slice();
    const pinned=state.tutorialEnabled&&state.month===0&&state.tutorialStep>0&&state.tutorialStep<4?rows.find(client=>client.id==="client-001"):null;
    let visible=state.filter==="attention"?rows.filter(client=>routineDue(client,state)||client.incident):
      state.filter==="risk"?rows.filter(client=>client.trust<55||client.health<55||client.serviceDebt>=3||client.incident):rows;
    if(pinned&&!visible.includes(pinned))visible=[pinned,...visible];
    return visible.sort((a,b)=>clientPriority(b,state)-clientPriority(a,state)||a.name.localeCompare(b.name));
  }

  function focusGuidedControl(step=S?.tutorialStep){
    if(typeof document==="undefined"||!document.querySelector)return false;
    const model=starterModel(S),holding=model.id==="holding_company",creative=model.id==="creative_agency";
    const selector=step===0?'.agency-first-assignment [data-agency-tutorial="show-client"]':
      step===1?(holding?'[data-affiliate-action="audit"][data-funnel="funnel-1"]':`.agency-full-roster [data-agency-action="${creative?"refresh":"service"}"][data-client="client-001"]`):
      step===2?'.agency-first-assignment [data-agency-tutorial="plan-day"]':step===3?'#runBtn':"";
    const target=selector?document.querySelector(selector):null;if(!target)return false;
    if(typeof target.focus==="function")target.focus({preventScroll:true});
    if(typeof target.scrollIntoView==="function")target.scrollIntoView({block:"center",inline:"nearest"});return true;
  }

  function guidedClientMarkup(client){
    if(!S.tutorialEnabled||S.month!==0||client.id!=="client-001"||S.tutorialStep>=3)return "";
    const model=starterModel(S),creative=model.id==="creative_agency",offer=offerOf(client);
    if(S.tutorialStep===0)return `<section class="agency-client-coach"><div><span>Guided start · step 1 of 4</span><b>This is the founding client</b></div><p>The account is due for routine service, but its work controls stay locked until To The Moon introduces the assignment.</p><button class="btn" data-agency-tutorial="show-client">Show me what to do</button></section>`;
    if(S.tutorialStep===1)return `<section class="agency-client-coach is-action"><div><span>Guided start · step 2 of 4</span><b>${creative?"Revise the founding ad":"Service the account"}</b></div><p>${creative?`The client sells ${esc(offer.label.toLowerCase())}. A creative refresh writes a new execution, raises creative readiness and costs production cash.`:"Routine service uses focus, improves operating health and schedules the next check-in. It does not improve client trust because it is account work, not client communication."}</p><strong>Choose the highlighted ${creative?"Refresh creative":"Complete routine service"} button below.</strong></section>`;
    return `<section class="agency-client-coach is-result"><div><span>Guided start · step 3 of 4</span><b>Read the result before moving on</b></div><div class="agency-guide-results"><span><b>${pct(client.health)}</b> account health</span><span><b>${Math.round(client.performance)}</b> outcome index</span><span><b>${creative?`Revision ${client.creativeVersion}`:`Day ${client.nextDue}`}</b> ${creative?"active ad":"next service"}</span><span><b>${pct(client.trust)}</b> client trust</span></div><p>${creative?"Creative readiness rose and the card shows the new execution. Trust stayed separate because revising an ad is not client communication.":"The account improved and the next service date moved. Trust stayed separate because you have not communicated with the client."}</p><button class="btn" data-agency-tutorial="plan-day">Continue to today's plan</button></section>`;
  }
  function guidedActionBlocked(client,action){
    if(!S.tutorialEnabled||S.month!==0||client.id!=="client-001"||S.tutorialStep>=3)return false;
    const expected=starterModel(S).id==="creative_agency"?"refresh":"service";
    return S.tutorialStep!==1||action!==expected;
  }

  /* The playable core of a client card: yesterday's campaign numbers, the recent trend and
     what changed. Platform moves, splits, pacing and creative choices answer here the next
     workday, against a target cost derived from what the client's accepted outcome is worth. */
  function campaignResultsMarkup(client){
    const t=typeOf(client),platform=platformOf(client),split=mediaSplit(client);
    const unit=t.id.includes("commerce")?"orders":"leads",unitOne=unit==="orders"?"order":"lead";
    const doctrine=strategyOf(client);
    const mixLabel=(platform?(split&&split.secondary?
      `${platform.short} ${100-Math.round(split.share*100)}% + ${split.secondary.short} ${Math.round(split.share*100)}%`:platform.short):channelOf(client).label)+
      (doctrine.id==="balanced"?"":` · ${doctrine.label}`);
    const rows=(Array.isArray(client.campaignHistory)?client.campaignHistory:[]).slice(-5).reverse();
    const targetCpl=Math.max(1,Number(client.customerValue)||0)/1.24;
    if(!rows.length)return `<div class="agency-campaign-results is-empty"><div class="agency-campaign-head"><b>Campaign results · ${esc(mixLabel)}</b><span>Target CPA ≤ ${safeMoney(targetCpl)} per ${unitOne}</span></div><span class="agency-campaign-empty">No delivery yet. Ending the workday writes the first row here.</span></div>`;
    const cplOf=row=>row.leads>0?row.spend/row.leads:null;
    const latest=rows[0],latestCpl=cplOf(latest),previousCpl=rows[1]?cplOf(rows[1]):null;
    const tone=latestCpl===null?"":latestCpl<=targetCpl?"pos":latestCpl<=targetCpl*1.25?"amb":"neg";
    const trend=latestCpl!==null&&previousCpl!==null?(latestCpl<previousCpl*.97?"▼ improving":latestCpl>previousCpl*1.03?"▲ rising":"→ steady"):"";
    const noteFor=row=>{const parts=[];if(row.changed)parts.push("plan changed");
      if(row.incident){const spec=AGENCY_INCIDENTS.find(item=>item.id===row.incident);parts.push((spec?.label||row.incident).toLowerCase());}
      return parts.join(" · ");};
    return `<div class="agency-campaign-results"><div class="agency-campaign-head"><b>Campaign results · ${esc(mixLabel)}</b><span>Target CPA ≤ ${safeMoney(targetCpl)} per ${unitOne}</span></div>
      <div class="agency-campaign-latest"><span><b>${safeMoney(latest.spend)}</b><small>spend · day ${latest.day}</small></span><span><b>${latest.leads.toFixed(1)}</b><small>${unit}</small></span><span class="${tone}"><b>${latestCpl===null?"—":safeMoney(latestCpl)}</b><small>per ${unitOne} ${esc(trend)}</small></span><span><b>${latest.index}</b><small>day index</small></span></div>
      <table class="agency-campaign-table"><thead><tr><th>Day</th><th>Spend</th><th>Impr.</th><th>Clicks</th><th>CTR</th><th>CPC</th><th>CVR</th><th>${unit[0].toUpperCase()}${unit.slice(1)}</th><th>Per ${unitOne}</th><th>Notes</th></tr></thead><tbody>
      ${rows.map(row=>{const cpl=cplOf(row);return `<tr${row.changed?' class="is-changed"':""}><td>${row.day}</td><td>${safeMoney(row.spend)}</td><td>${Number(row.impressions||0).toLocaleString()}</td><td>${Number(row.clicks||0).toFixed(1)}</td><td>${row.ctr!==undefined?`${row.ctr}%`:"—"}</td><td>${row.clicks>0?safeMoney(row.spend/row.clicks):"—"}</td><td>${row.cvr!==undefined?`${row.cvr}%`:"—"}</td><td>${row.leads.toFixed(1)}</td><td>${cpl===null?"—":safeMoney(cpl)}</td><td>${esc(noteFor(row))}</td></tr>`;}).join("")}
      </tbody></table></div>`;
  }
  /* The media board is the PRIMARY surface of a client card: the buyer's control panel,
     always open, never behind a disclosure. Budget, platform, split, doctrine, pacing and
     creative sit together because those are the six things a media buyer actually changes. */
  function mediaBoardMarkup(client){
    const ch=channelOf(client),platform=platformOf(client),pacing=pacingOf(client),doctrine=strategyOf(client),
      split=mediaSplit(client),share=split?Math.round(split.share*100):0,budget=Math.max(0,Number(client.mediaBudget)||0),
      bounds=budgetBounds(client),offer=offerOf(client),concept=adConceptOf(client),
      platformOptions=platformsForChannel(client.channel,S).filter(item=>item.id!==platform?.id),
      conceptPool=conceptsForOffer(offer,client.channel,client.channel==="search"),
      refreshFocus=operationFocusCost(client,"refresh",S),refreshCash=operationCashCost("refresh",S),
      up=canSetBudget(client,roundTo(Math.min(bounds.max,budget+bounds.step),100),S),
      capacityWarning=platformCapacityM(client)<1;
    const row=(label,value,controls,note)=>`<div class="buy-row"><div class="buy-row-head"><span>${label}</span><b>${value}</b></div>
      ${controls?`<div class="buy-row-controls">${controls}</div>`:""}${note?`<small>${note}</small>`:""}</div>`;
    const budgetControls=`<button class="btn" data-agency-budget="down" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1||budget<=bounds.min?"disabled":""}>− ${safeMoney(bounds.step)}/mo</button>
      <button class="btn" data-agency-budget="up" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1||budget>=bounds.max||!up.ok?"disabled":""}>+ ${safeMoney(bounds.step)}/mo</button>
      <button class="btn" data-agency-scale="down" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1||budget<=bounds.min?"disabled":""}>Cut hard</button>
      <button class="btn" data-agency-scale="up" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1||budget>=bounds.max?"disabled":""}>Scale hard</button>`;
    const budgetNote=budget>bounds.base?`Running ${safeMoney(budget-bounds.base)} above the approved ${safeMoney(bounds.base)} baseline — the client is watching this.`:
      budget<bounds.base?`Running ${safeMoney(bounds.base-budget)} below the approved ${safeMoney(bounds.base)} baseline. Less spend buys fewer outcomes.`:
      `At the client's approved ${safeMoney(bounds.base)} baseline.${up.ok?"":` Scaling higher ${esc(up.reason.toLowerCase())}.`}`;
    const platformControls=platformOptions.map(item=>`<button class="btn" data-agency-platform="${esc(item.id)}" data-client="${esc(client.id)}" title="${esc(item.pros)} / ${esc(item.cons)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Move to ${esc(item.short)}</button>`).join("");
    const splitControls=platformOptions.map(item=>{const active=client.secondaryPlatformId===item.id?share:0;
      return `<button class="btn" data-agency-split="${esc(item.id)}" data-split-dir="add" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1||active>=50?"disabled":""}>+10% ${esc(item.short)}</button>${active?`<button class="btn" data-agency-split="${esc(item.id)}" data-split-dir="cut" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>−10% ${esc(item.short)}</button>`:""}`;}).join("");
    const doctrineControls=Object.values(AGENCY_STRATEGIES).filter(item=>item.id!==doctrine.id).map(item=>{const check=strategyAvailable(item.id,client,S);
      return check.ok?`<button class="btn" data-agency-strategy="${esc(item.id)}" data-client="${esc(client.id)}" title="${esc(item.pros)} / ${esc(item.cons)}" ${S.ended||S.focusRemaining<1?"disabled":""}>${esc(item.label)}</button>`:"";}).join("");
    const pacingControls=Object.values(AGENCY_PACING).filter(item=>item.id!==pacing.id).map(item=>`<button class="btn" data-agency-pacing="${esc(item.id)}" data-client="${esc(client.id)}" title="${esc(item.note)}" ${S.ended?"disabled":""}>${esc(item.label.replace(" pacing",""))}</button>`).join("");
    const campaigns=campaignsOf(client),splitCheck=canSplitAccount(client,S),structured=campaigns.length>1;
    const accounts=accountsOf(client,S);
    const accountHeader=campaign=>{
      const first=accounts.find(account=>account.campaigns[0]&&account.campaigns[0].id===campaign.id);
      if(!first||accounts.length<2)return "";
      const spend=first.campaigns.reduce((sum,item)=>sum+budget*item.share/100,0);
      return `<div class="agency-account-head"><b>${esc(first.label)}</b><span>${first.campaigns.length} ${first.campaigns.length===1?"campaign":"campaigns"} · ${safeMoney(spend)}/mo</span></div>`;
    };
    const openAccountRow=(()=>{
      if(!hasTech("multi_account",S))return `<p class="agency-account-note">One ad account, on ${esc(accounts[0]?accounts[0].label:"the client's platform")}. The second-ad-account capability lets a client buy on more than one platform at once.</p>`;
      const options=openableAccountPlatforms(client,S);
      if(!options.length||accounts.length>=MAX_ACCOUNTS)return `<p class="agency-account-note">${accounts.length} of ${MAX_ACCOUNTS} ad accounts open. ${accounts.length>=MAX_ACCOUNTS?"That is the most one client runs.":"No other platform is available to this client yet."}</p>`;
      return `<div class="agency-account-open"><b>Open another ad account</b>
        <div class="buy-row-controls">${options.slice(0,3).map(platform=>{const check=canOpenAccount(client,platform.id,S);
          return `<button class="btn" data-agency-open-account="${esc(platform.id)}" data-client="${esc(client.id)}" ${S.ended||!check.ok?"disabled":""}>${esc(platform.label)}</button>`;}).join("")}</div>
        <small>A second account buys on another platform with its own campaigns. It takes a quarter of the plan from the biggest campaign, so the client spends the same money in more places until you re-weight it.</small></div>`;
    })();
    const campaignLayer=`<details class="card-detail-block agency-campaign-layer" data-disclosure-id="client-${esc(client.id)}-campaigns"${structured?" open":""}>
      <summary>Account and campaign structure · ${accounts.length} ${accounts.length===1?"account":"accounts"} · ${campaigns.length} of ${MAX_CAMPAIGNS} ${campaigns.length===1?"campaign":"campaigns"}</summary><div class="card-detail-body">
      ${openAccountRow}
      ${structured?campaigns.map(campaign=>{const campaignPlatform=AGENCY_PLATFORMS[campaign.platform],
        pacingSpec=AGENCY_PACING[campaign.pacing]||AGENCY_PACING.steady,doctrineSpec=AGENCY_STRATEGIES[campaign.strategy]||AGENCY_STRATEGIES.balanced,
        money=budget*campaign.share/100,concept=AGENCY_AD_CONCEPTS.find(item=>item.id===campaign.adConceptId);
        return `${accountHeader(campaign)}<div class="agency-campaign-row${campaign.paused?" is-paused":""}"><div class="agency-campaign-row-head"><b>${esc(campaign.name)}${campaign.paused?" · paused":""}</b><span>${campaign.share}% · ${safeMoney(money)}/mo</span>
          <button class="btn tiny" data-agency-campaign-pause="${esc(campaign.id)}" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>${campaign.paused?"Turn back on":"Pause"}</button></div>
          <small>${esc(campaignPlatform?campaignPlatform.short:ch.label)} · ${esc(doctrineSpec.label)} · ${esc(pacingSpec.label.replace(" pacing",""))} · ${esc(concept?concept.label:"inherited ad")} · creative ${pct(campaign.creative)}</small>
          ${(()=>{const sets=adSetsOf(campaign,client,S),divided=sets.length>1||!sets[0].implicit,
            setCheck=canSplitCampaign(client,campaign,S);
            return `${divided?`<div class="agency-adset-list">${sets.map(set=>{const spec=AGENCY_TARGETING[set.targeting];
              return `<div class="agency-adset-row"><span><b>${esc(spec?spec.label:"Whole audience")}</b> · ${set.share}%</span>
                <small>${esc(spec?spec.tradeoff:"No targeting narrowing: the campaign reaches the platform's whole pool.")}</small>
                ${(()=>{const ads=adsOf(set,campaign,client),adCheck=canAddAd(client,campaign,set,S);
                  return `${ads.length>1||!ads[0].implicit?`<div class="agency-ad-rotation">${ads.map(ad=>{const adConcept=AGENCY_AD_CONCEPTS.find(item=>item.id===ad.adConceptId);
                    return `<span class="agency-ad-chip${ad.paused?" is-paused":""}"><b>${esc(adConcept?adConcept.label:"inherited ad")}</b><small>${esc(formatLabel(ad.adFormat))} · creative ${pct(ad.creative)}${ad.paused?" · killed":""}</small>
                      <button class="btn tiny" data-agency-ad-pause="${esc(ad.id)}" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" data-adset="${esc(set.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>${ad.paused?"Revive":"Kill"}</button></span>`;}).join("")}</div>`:""}
                  <button class="btn" data-add-ad="${esc(set.id)}" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" ${S.ended||!adCheck.ok?"disabled":""}>${adCheck.ok?`Add an ad to the rotation · 1 focus + ${safeMoney(adCheck.cash)}`:esc(adCheck.reason)}</button>`;})()}
                <div class="buy-row-controls">${targetingOptions(client,S).filter(item=>item.id!==set.targeting).slice(0,3).map(item=>`<button class="btn" data-adset-targeting="${esc(item.id)}" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" data-adset="${esc(set.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>${esc(item.label)}</button>`).join("")}</div></div>`;}).join("")}</div>`:""}
              <button class="btn" data-split-campaign="${esc(campaign.id)}" data-client="${esc(client.id)}" ${S.ended||!setCheck.ok?"disabled":""}>${setCheck.ok?`Add an ad set · test another audience · 1 focus`:esc(setCheck.reason)}</button>`;})()}
          <div class="buy-row-controls">
            <button class="btn" data-campaign-share="up" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" ${S.ended||S.focusRemaining<1||campaign.share>=95?"disabled":""}>+5%</button>
            <button class="btn" data-campaign-share="down" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" ${S.ended||S.focusRemaining<1||campaign.share<=5?"disabled":""}>−5%</button>
            ${platformOptions.map(item=>`<button class="btn" data-campaign-facet="platform" data-value="${esc(item.id)}" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" ${S.ended||S.focusRemaining<1||campaign.platform===item.id?"disabled":""}>→ ${esc(item.short)}</button>`).join("")}
            ${Object.values(AGENCY_STRATEGIES).filter(item=>item.id!==campaign.strategy&&strategyAvailable(item.id,client,S).ok).slice(0,2).map(item=>`<button class="btn" data-campaign-facet="strategy" data-value="${esc(item.id)}" data-client="${esc(client.id)}" data-campaign="${esc(campaign.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>${esc(item.label)}</button>`).join("")}
          </div></div>`;}).join(""):
        `<p>This account runs as one campaign. The board above is that campaign. Splitting the account lets a proven approach keep running while a second campaign tests another platform or doctrine on part of the budget.</p>`}
      <button class="btn wide" data-agency-split-account="${esc(client.id)}" ${S.ended||!splitCheck.ok?"disabled":""}>${splitCheck.ok?`Split into ${campaigns.length+1} campaigns · 2 focus`:esc(splitCheck.reason)}</button>
    </div></details>`;
    return `<section class="agency-buy-board"><header><b>Buy media for this campaign</b><span>every change here is this account's work for the cycle</span></header>
      ${row("Monthly media budget",`${safeMoney(budget)}`,budgetControls,budgetNote)}
      ${(()=>{const primary=campaignsOf(client)[0],current=AGENCY_LANDERS[primary?.lander]||AGENCY_LANDERS.client_site;
        const others=landerOptions(S).filter(item=>item.id!==current.id);
        return row("Where the click lands",esc(current.label),
          others.map(item=>{const check=canSetLander(client,primary,item.id,S);
            return `<button class="btn" data-agency-lander="${esc(item.id)}" data-client="${esc(client.id)}" data-campaign="${esc(primary.id)}" ${S.ended||!check.ok?"disabled":""}>${esc(item.label)}${item.cost?` · ${safeMoney(item.cost)}`:" · free"}</button>`;}).join(""),
          `${esc(current.note)} The page does not change what a click costs — it changes how many of those clicks become conversions.`);})()}
      ${row("Platform",`${esc(platform?platform.label:ch.label)}${share?` ${100-share}% + ${esc(split.secondary.short)} ${share}%`:""}`,platformControls+splitControls,
        platform?`${esc(platform.pros)}${capacityWarning?` <b>⚠ ${safeMoney(budget)} exceeds what ${esc(platform.short)} absorbs well (about ${safeMoney(platform.capacity)}) — split it or cut back.</b>`:` ${esc(platform.cons)}`}`:esc(ch.note))}
      ${row("Buying doctrine",esc(doctrine.label),doctrineControls,`${esc(doctrine.pros)} <b>Exposure:</b> ${esc(doctrine.cons)}`)}
      ${row("Pacing",esc(pacing.label.replace(" pacing","")),pacingControls,esc(pacing.note))}
      ${row("Ad running now",esc(concept?.label||"the inherited ad"),
        `<button class="btn" data-agency-restate="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Rewrite the words · 1 focus</button>
         <button class="btn" data-agency-recast="${esc(client.id)}" ${S.ended||S.focusRemaining<2?"disabled":""}>Run it as another format · 2 focus</button>`+
        (conceptPool.length>1?`<button class="btn" data-agency-creative-desk="${esc(client.id)}" ${S.ended||S.focusRemaining<refreshFocus||S.cash-refreshCash < -S.creditLimit?"disabled":""}>Choose a new direction · ${refreshFocus} focus + ${safeMoney(refreshCash)}</button>`:""),
        `${esc(formatLabel(client.adFormat))} · revision ${Math.max(1,client.creativeVersion||1)} · creative readiness ${pct(client.creative)}`)}
      <div class="agency-ad-preview"><div class="agency-ad-preview-head">The ad as it runs on ${esc(platform?platform.short:ch.label)}</div>
        ${String(client.adCopy||"").split("\n").map(line=>{const [label,...rest]=line.split(": ");
          if(!rest.length)return `<div class="agency-ad-field"><b>${esc(line)}</b></div>`;
          const value=rest.join(": "),limit=/^Headline/.test(label)?30:/^Description|^Primary text/.test(label)?(/Primary/.test(label)?125:90):0;
          const count=limit?`<i class="agency-ad-count${value.length>limit?" is-over":""}">${value.length}/${limit} characters</i>`:"";
          return `<div class="agency-ad-field"><span>${esc(label)}</span><b>${esc(value)}${count}</b></div>`;}).join("")}</div>
      ${campaignLayer}
      ${(()=>{const running=clientServicesOf(client);
        return `<details class="card-detail-block agency-client-services" data-disclosure-id="client-${esc(client.id)}-services"${running.length?" open":""}>
        <summary>Sell this client more than media · ${running.length} running</summary><div class="card-detail-body">
        <p>Work that makes the client's own money go further. Each one raises the retainer you charge, changes a named part of their funnel, and fades if nobody keeps it moving.</p>
        ${running.map(entry=>`<div class="agency-service-line"><span><b>${esc(entry.spec.mark)} ${esc(entry.spec.label)}</b><small>${esc(entry.spec.note)}</small></span>
          <div class="agency-service-meter"><span>Strength ${Math.round(entry.strength)}%</span><i style="--value:${Math.round(entry.strength)}%"></i></div>
          <button class="btn" data-client-service-work="${esc(entry.spec.id)}" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1||entry.strength>=100?"disabled":""}>Work the programme · 1 focus</button></div>`).join("")}
        ${Object.values(AGENCY_CLIENT_SERVICES).filter(spec=>!(Number(client.services?.[spec.id])>0)).map(spec=>{const check=canSellService(client,spec.id,S);
          return `<div class="agency-service-line is-inactive"><span><b>${esc(spec.mark)} ${esc(spec.label)}</b><small>${esc(spec.pitch)}</small></span>
            <button class="btn" data-client-service-sell="${esc(spec.id)}" data-client="${esc(client.id)}" ${S.ended||!check.ok?"disabled":""}>${check.ok?`Propose it · +${safeMoney(check.fee)}/mo retainer · 2 focus + ${safeMoney(check.setup)}`:esc(check.reason)}</button></div>`;}).join("")}
      </div></details>`;})()}
    </section>`;
  }
  /* The client brief answers a buyer's questions — what they sell, what an outcome is worth,
     what they expect, what limits the campaign — not a philosophy lecture about the vertical. */
  function clientBriefMarkup(client){
    const t=typeOf(client),offer=offerOf(client),geo=clientGeography(client,S),
      target=client.targetStates.includes("US")?"nationwide (all 50 states)":
        `${client.targetStates.length} target state${client.targetStates.length===1?"":"s"} — ${client.targetStates.join(", ")}`,
      cpl=Math.max(1,Number(client.customerValue)||0)/1.24,
      bounds=budgetBounds(client);
    return `<details class="card-detail-block" data-disclosure-id="client-${esc(client.id)}-brief"><summary>The brief · what this client wants from you</summary><div class="card-detail-body">
      <div class="agency-brief-grid">
        <span><b>They sell</b>${esc(offer.label)}</span>
        <span><b>What counts as a conversion</b>one ${esc(offer.conversion)}</span>
        <span><b>Worth to them</b>${(()=>{const band=conversionValueBand(client),last=(client.campaignHistory||[]).at(-1);
          return `${safeMoney(band.low)}–${safeMoney(band.high)} each · ${leadQualityLine(client)}${
            last&&last.valueRoll?` · yesterday rolled ${last.valueRoll.d100}${last.valueRoll.modifier>=0?"+":""}${last.valueRoll.modifier} = ${last.valueRoll.total} → ${safeMoney(last.perLead)} each`:""}`;})()}</span>
        <span><b>So keep cost per conversion under</b>${safeMoney(cpl)}</span>
        <span><b>Based in</b>${esc(geo.office.city)}, ${esc(geo.office.stateCode)}</span>
        <span><b>They can serve</b>${esc(target)}</span>
        <span><b>Approved media budget</b>${safeMoney(bounds.base)}/month</span>
        <span><b>They pay you</b>${safeMoney(client.fee)}/month, ${client.terms} days after invoice</span>
        <span><b>They expect service</b>every ${t.cadence} workdays</span>
      </div>
      <p><b>Who you are reaching:</b> ${esc(client.customer)}</p>
      <p><b>What this client is like:</b> ${client.insight?`${esc(personalityOf(client).label)} — ${esc(personalityOf(client).hint)}`:"You have not learned how this owner makes decisions yet. Send a client update during a tense moment and watch the reaction."}</p>
      ${geo.timeDifference?`<p><b>Working window:</b> their account clock runs ${geo.timeDifference} hour${geo.timeDifference===1?"":"s"} ${geo.timeOffset>0?"ahead of":"behind"} ${esc(geo.hq.city)}, so approvals and updates cost ${geo.coordinationSurcharge} extra focus.</p>`:""}
    </div></details>`;
  }
  /* Running a day is a beat: the results are presented and acknowledged before the next day
     opens. Without this the loop is a button you smash while a number ticks in the corner. */
  function showDayDebrief(){
    const report=S.lastDayReport;if(!report||typeof show!=="function")return false;
    const cpl=report.leads>0?report.spend/report.leads:0;
    /* The debrief is the screen the player actually reads every day, so it carries the same
       standard buying metrics as the Today report rather than a reduced set. */
    const cpc=report.clicks>0?report.spend/report.clicks:0;
    const roas=report.spend>0?(report.clientValue||0)/report.spend:0;
    const epl=report.leads>0?(report.clientValue||0)/report.leads:0;
    const roll=activeClients(S).map(client=>(client.campaignHistory||[]).at(-1)).filter(entry=>entry&&entry.valueRoll).sort((a,b)=>b.value-a.value)[0];
    const movers=report.rows.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,4);
    const attention=activeClients(S).filter(client=>client.incident||routineDue(client,S));
    const monthClosed=report.month!==S.month;
    show(`<div class="eyebrow">Day ${report.dayInMonth} results · ${esc(monthName(S))}</div>
      <h2>${report.leads>0?`The media bought ${report.leads} ${report.leads===1?"conversion":"conversions"} today`:"The media ran with nothing to show yet"}</h2>
      <div class="agency-day-figures">
        <span><b>${safeMoney(report.spend)}</b><small>client media spent</small></span>
        <span><b>${report.leads}</b><small>conversions</small></span>
        <span><b>${cpl?safeMoney(cpl):"—"}</b><small>cost per conversion (CPA)</small></span>
        <span><b>${cpc?safeMoney(cpc):"—"}</b><small>cost per click (CPC)</small></span>
        <span class="pos"><b>${safeMoney(report.clientValue||0)}</b><small>value earned for clients</small></span>
        <span class="${roas>=1?"pos":"neg"}"><b>${roas?`${roas.toFixed(2)}×`:"—"}</b><small>return on client ad spend (ROAS)</small></span>
        <span><b>${epl?safeMoney(epl):"—"}</b><small>value earned per conversion (EPL)</small></span>
        ${roll?`<span><b>${roll.valueRoll.d100}${roll.valueRoll.modifier>=0?"+":""}${roll.valueRoll.modifier}</b><small>value roll → ${safeMoney(roll.perLead)} a conversion</small></span>`:""}
      </div>
      <div class="agency-day-figures is-agency">
        <span class="pos"><b>${safeMoney(report.feeEarned||0)}</b><small>fees you earned today</small></span>
        <span><b>${safeMoney(report.monthRevenue||0)}</b><small>agency revenue this month</small></span>
        <span><b>${safeMoney(report.monthCosts||0)}</b><small>agency costs this month</small></span>
        <span class="${(report.monthProfit||0)>=0?"pos":"neg"}"><b>${safeMoney(report.monthProfit||0)}</b><small>month profit so far</small></span>
      </div>
      <div class="agency-day-figures is-agency">
        <span><b>${safeMoney(report.cash||0)}</b><small>cash in the bank</small></span>
        <span><b>${safeMoney(report.collected||0)}</b><small>collected today</small></span>
        <span><b>${safeMoney(report.receivables||0)}</b><small>owed to you</small></span>
        <span><b>${safeMoney(report.billsDue||0)}</b><small>bills due in ${report.dueInDays||0} days</small></span>
      </div>
      ${movers.length?`<ul class="agency-day-movers">${movers.map(row=>`<li class="${row.delta>0?"pos":row.delta<0?"neg":""}"><b>${esc(row.name)}</b><span>${safeMoney(row.spend)} → ${row.leads} ${row.leads===1?"conversion":"conversions"}${row.delta?` · index ${row.delta>0?"+":""}${row.delta}`:" · steady"}${row.changed?" · your change landed":""}${row.incident?` · ⚠ ${esc(row.incident)}`:""}</span></li>`).join("")}</ul>`:""}
      <div class="prose"><p>${monthClosed?`<b>The month closed.</b> Fees invoiced, operating costs settled and the roster reviewed — the career ledger has the detail.`:
        attention.length?`<b>Tomorrow:</b> ${attention.length} account${attention.length===1?"":"s"} need${attention.length===1?"s":""} a buying decision — ${esc(attention.slice(0,3).map(client=>client.name).join(", "))}${attention.length>3?" and others":""}.`:
        `<b>Tomorrow:</b> nothing is overdue. Spend the day on media plans, new business or the service lines.`}</p></div>
      <div class="row"><button class="btn wide" id="agencyDayContinue">Open day ${S.dayInMonth}</button><button class="btn wide" id="agencyDayLedger">Read the full ledger</button></div>`,
      "performance",{wide:true});
    const go=document.getElementById("agencyDayContinue"),ledger=document.getElementById("agencyDayLedger");
    if(go)go.onclick=()=>{close();const run=document.getElementById("runBtn");if(run&&run.focus)run.focus({preventScroll:true});};
    if(ledger)ledger.onclick=()=>{close();if(typeof Workspace!=="undefined"&&Workspace)Workspace.setView("history",{focus:true});};
    return true;
  }
  /* The History screen's numbers. Every day the career has run, with what the client's media
     bought and what the agency actually earned from it — spent and earned side by side, which
     the day report alone never showed across time. */
  /* The ledger renders from state, not by mirroring the #log node. That node is written during
     the engine's own render pass and was empty whenever History was opened straight from the day
     debrief, which made a career with real days claim nothing had happened yet. */
  function ledgerEntries(){
    if(!S||!Array.isArray(S.log)||!S.log.length)return "";
    return typeof renderLog==="function"?renderLog(S.log,""):S.log.map(item=>item.html).join("");
  }
  function ledgerSummary(){
    if(!S||S.businessModel!=="agency")return "";
    const days=[];
    activeClients(S).concat(S.archivedClients||[]).forEach(client=>{
      (client.campaignHistory||[]).forEach(entry=>{
        const key=entry.day;
        let row=days.find(item=>item.day===key);
        if(!row){row={day:key,spend:0,leads:0,value:0,clicks:0,impressions:0};days.push(row);}
        row.spend+=Number(entry.spend)||0;row.leads+=Number(entry.leads)||0;
        row.value+=Number(entry.value)||0;row.clicks+=Number(entry.clicks)||0;
        row.impressions+=Number(entry.impressions)||0;
      });
    });
    if(!days.length)return "";
    days.sort((a,b)=>b.day-a.day);
    const shown=days.slice(0,30);
    const total=days.reduce((sum,row)=>({spend:sum.spend+row.spend,leads:sum.leads+row.leads,
      value:sum.value+row.value,clicks:sum.clicks+row.clicks}),{spend:0,leads:0,value:0,clicks:0});
    const fee=Math.round(S.cumulativeRevenue||0);
    return `<div class="ledger-figures">
      <span><b>${safeMoney(total.spend)}</b><small>client media spent, career to date</small></span>
      <span><b>${safeMoney(total.value)}</b><small>value that media earned the clients</small></span>
      <span><b>${safeMoney(fee)}</b><small>fees the agency earned</small></span>
      <span><b>${safeMoney(S.cumulativeProfit||0)}</b><small>profit kept after costs</small></span>
      <span><b>${Math.round(total.leads*10)/10}</b><small>conversions delivered</small></span>
      <span><b>${total.spend>0?`${(total.value/total.spend).toFixed(2)}×`:"—"}</b><small>return on client ad spend</small></span>
    </div>
    <table class="ledger-table"><thead><tr><th>Day</th><th>Spent</th><th>Impressions</th><th>Clicks</th><th>CPC</th><th>Conversions</th><th>Cost per conversion</th><th>Value earned</th><th>ROAS</th></tr></thead><tbody>
    ${shown.map(row=>`<tr><td>${row.day}</td><td>${safeMoney(row.spend)}</td><td>${Math.round(row.impressions).toLocaleString("en-US")}</td>
      <td>${Math.round(row.clicks).toLocaleString("en-US")}</td><td>${row.clicks>0?safeMoney(row.spend/row.clicks):"—"}</td>
      <td>${Math.round(row.leads*10)/10}</td><td>${row.leads>0?safeMoney(row.spend/row.leads):"—"}</td>
      <td>${safeMoney(row.value)}</td><td class="${row.value>=row.spend?"pos":"neg"}">${row.spend>0?`${(row.value/row.spend).toFixed(2)}×`:"—"}</td></tr>`).join("")}
    </tbody></table>${days.length>shown.length?`<p class="ledger-note">Showing the last ${shown.length} days of ${days.length} the career has run.</p>`:""}`;
  }
  /* WHAT A CONVERSION IS WORTH (2026-08-09). It used to be one fixed number per client, so
     every conversion was worth exactly the same and nothing the player did changed it. A
     conversion is now worth somewhere in a band, and where it lands is a d100 roll shifted by
     how well qualified the lead was: high-intent targeting and a page that pre-qualifies push
     the roll up, broad targeting and weak tracking push it down. */
  /* LEAD QUALITY (rebuilt 2026-08-10). It was a score projected from the player's own settings
     and printed as "50/100" before a single lead existed. That is not what lead quality is. In
     lead generation it is measured downstream by whoever buys the lead -- were they reachable,
     were the details real, did they qualify, did the buyer accept or return them -- and you
     learn it after delivery, on a lag.

     So the world now has a TRUE qualification rate the player never sees directly, driven by the
     things that really drive it: how much intent the targeting captures, whether the page
     pre-qualifies before the form, and how well the account is measured. The player sees only
     what has been judged so far, and nothing at all until enough leads have come back. */
  const LEAD_QUALITY_MIN_SAMPLE=5;
  function trueLeadQuality(client,state=S){
    const campaign=campaignsOf(client)[0];
    const sets=campaign?adSetsOf(campaign,client,state):[];
    const targeting=sets.length?AGENCY_TARGETING[sets[0].targeting]:null;
    const lander=AGENCY_LANDERS[campaign?.lander]||AGENCY_LANDERS.client_site;
    const intent=targeting?targeting.intent:null;
    let rate=54;
    rate+=intent==="exact"?21:intent==="phrase"?10:intent==="broad"?-16:intent==="retargeting"?15:intent==="lookalike"?2:intent==="interest"?-9:0;
    rate+=lander.cvrM>=1.3?12:lander.cvrM>=1.15?5:0;
    rate+=((Number(client.measurement)||0)-50)*.22;
    if(Number(client.services?.landing_program)>0)rate+=5;
    return clamp(Math.round(rate),8,96);
  }
  function observedLeadQuality(client){
    const delivered=Number(client?.leadsDelivered)||0,accepted=Number(client?.leadsAccepted)||0;
    if(delivered<LEAD_QUALITY_MIN_SAMPLE)return {known:false,delivered,needed:Math.ceil(LEAD_QUALITY_MIN_SAMPLE-delivered)};
    return {known:true,delivered:Math.round(delivered*10)/10,rate:clamp(Math.round(accepted/delivered*100),0,100)};
  }
  function leadQualityLine(client){
    const read=observedLeadQuality(client);
    return read.known?`${read.rate}% of leads accepted by the buyer, across ${read.delivered} so far`
      :`lead quality not measured yet · ${read.needed} more ${read.needed===1?"conversion":"conversions"} before the buyer's verdict lands`;
  }
  function conversionValueBand(client){
    const base=Math.max(1,Number(client.customerValue)||160);
    return {low:roundTo(base*.45,5),high:roundTo(base*1.85,5),base};
  }
  function rollConversionValue(client,quality,state=S,key=""){
    const band=conversionValueBand(client);
    const d100=Math.floor(roll("lead-value",client.id,state.day,key)*100)+1;
    const modifier=Math.round((quality-50)*.55);
    const total=clamp(d100+modifier,1,128);
    const position=(total-1)/127;
    return {...band,d100,modifier,total,value:roundTo(band.low+(band.high-band.low)*position,1)};
  }
  function dayReportMarkup(){
    const report=S.lastDayReport;
    if(!report||S.businessModel!=="agency")return `<section class="agency-day-report is-open"><header><b>Day ${S.dayInMonth} · ${esc(monthName(S))}</b><span>opening day of the career</span></header>
      <p class="agency-day-lead">No media has run yet. Set each campaign's budget, platform and doctrine on its card, then run the day to see what it bought.</p></section>`;
    const cpl=report.leads>0?report.spend/report.leads:0,carried=report.day!==S.day-1;
    const cpc=report.clicks>0?report.spend/report.clicks:0;
    const roas=report.spend>0?(report.clientValue||0)/report.spend:0;
    const epl=report.leads>0?(report.clientValue||0)/report.leads:0;
    const movers=report.rows.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
    const attention=activeClients(S).filter(client=>client.incident||routineDue(client,S));
    return `<section class="agency-day-report is-open"><header><b>Yesterday · day ${report.dayInMonth} results</b><span>${report.focusUsed} of ${report.focusTotal} focus spent${carried?" · earlier in the career":""}</span></header>
      <div class="agency-day-figures">
        <span><b>${safeMoney(report.spend)}</b><small>client media spent</small></span>
        <span><b>${report.leads}</b><small>conversions</small></span>
        <span class="${cpl?"":"is-blank"}"><b>${cpl?safeMoney(cpl):"—"}</b><small>cost per conversion (CPA)</small></span>
        <span class="${cpc?"":"is-blank"}"><b>${cpc?safeMoney(cpc):"—"}</b><small>cost per click (CPC)</small></span>
        <span class="${roas?(roas>=1?"pos":"neg"):""}"><b>${roas?`${roas.toFixed(2)}×`:"—"}</b><small>return on client ad spend (ROAS)</small></span>
        <span class="${epl?"":"is-blank"}"><b>${epl?safeMoney(epl):"—"}</b><small>value earned per conversion (EPL)</small></span>
        ${(()=>{const lead=activeClients(S).map(client=>(client.campaignHistory||[]).at(-1)).filter(entry=>entry&&entry.valueRoll)
            .sort((a,b)=>b.value-a.value)[0];
          return lead?`<span><b>${lead.valueRoll.d100}${lead.valueRoll.modifier>=0?"+":""}${lead.valueRoll.modifier}</b><small>value roll · quality ${lead.quality}/100 → ${safeMoney(lead.perLead)} a conversion</small></span>`:"";})()}
        <span><b>${safeMoney(report.collected)}</b><small>collected into cash</small></span>
      </div>
      ${movers.length?`<ul class="agency-day-movers">${movers.map(row=>`<li class="${row.delta>0?"pos":row.delta<0?"neg":""}"><b>${esc(row.name)}</b><span>${safeMoney(row.spend)} → ${row.leads} ${row.leads===1?"conversion":"conversions"}${row.delta?` · index ${row.delta>0?"+":""}${row.delta}`:" · steady"}${row.changed?" · your change landed":""}${row.incident?` · ⚠ ${esc(row.incident)}`:""}</span></li>`).join("")}</ul>`:""}
      <p class="agency-day-lead">${attention.length?`<b>Today:</b> ${attention.length} account${attention.length===1?"":"s"} need${attention.length===1?"s":""} a decision — ${esc(attention.slice(0,3).map(client=>client.name).join(", "))}${attention.length>3?" and others":""}.`:`<b>Today:</b> nothing is overdue. Spend focus on the media plans, business development or the service lines, then run the day.`}</p>
    </section>`;
  }
  function clientCard(client){
    const t=typeOf(client),ch=channelOf(client),due=routineDue(client,S),risk=client.trust<50||client.health<50||client.incident?.critical;
    const profile=personalityOf(client),cost=operationFocusCost(client,"service",S),incident=client.incident;
    const offer=offerOf(client),concept=adConceptOf(client),geo=clientGeography(client,S),targetLabel=client.targetStates.includes("US")?"Nationwide U.S.":client.targetStates.join(", ");
    const platform=platformOf(client),pacing=pacingOf(client),platformOptions=platformsForChannel(client.channel,S).filter(item=>item.id!==platform?.id),
      conceptPool=conceptsForOffer(offer,client.channel,client.channel==="search");
    const auditFocus=operationFocusCost(client,"audit",S),refreshFocus=operationFocusCost(client,"refresh",S),updateFocus=operationFocusCost(client,"update",S);
    const auditCash=operationCashCost("audit",S),refreshCash=operationCashCost("refresh",S);
    const insight=client.insight?`<div class="agency-guide"><b>What you have learned · ${client.insight}/3 · ${esc(profile.label)}</b><span>${esc(profile.hint)}</span></div>`:
      `<div class="agency-guide"><b>You do not know this client yet</b><span>The business type offers one clue, not an answer. During a tense moment, send an evidence-based update and watch the reaction. To The Moon will record what you learn.</span></div>`;
    const opening=client.id==="client-001"?agencyOpeningProfile():null;
    return `<article class="agency-client-card slot${risk?" at-risk":""}" data-client-id="${esc(client.id)}">
      <header><div><div class="fam">${esc(t.short)} · ${esc(ch.label)}${platform?` · ${esc(platform.short)}`:""}</div><h3>${esc(client.name)}</h3></div>
        <span class="agency-chip">${safeMoney(client.fee)} per month</span></header>
      <div class="row"><span class="tag">${esc(AGENCY_VERTICALS.find(v=>v.id===client.vertical)?.label||client.vertical)}</span>
        <span class="tag">${esc(offer.label)}</span>
        <span class="tag ${incident?.critical?"flag":""}">${incident?esc(incident.label):due?"Service due":"Stable"}</span>
        <span class="tag">service every ${t.cadence} ${t.cadence===1?"day":"days"}</span></div>
      <div class="note">Sells ${esc(offer.label.toLowerCase())} to ${esc(client.customer.toLowerCase())}${client.targetStates.includes("US")?" nationwide":` in ${esc(targetLabel)}`}.</div>
      <div class="agency-health"><span><b>Trust</b> ${pct(client.trust)}</span><span><b>Account health</b> ${pct(client.health)}</span>
        <span><b>Performance index</b> ${Math.round(client.performance)}</span><span><b>Service debt</b> ${client.serviceDebt.toFixed(1)}</span></div>
      ${campaignResultsMarkup(client)}
      ${opening&&S.month===0?`<div class="scenario-conditions"><div><span>Career opening</span><b>${esc(opening.label)}</b><small>${esc(opening.brief)}</small></div></div>`:""}
      ${incident?`<div class="agency-alert${incident.critical?" is-critical":""}"><b>${incident.critical?"⚠ Critical · ":""}${esc(incident.label)}</b><span>${esc(incident.copy)}</span></div>`:""}
      ${clientBriefMarkup(client)}
      ${mediaBoardMarkup(client)}
      ${guidedClientMarkup(client)}<div class="agency-actions">
        <button class="btn${S.tutorialEnabled&&S.month===0&&S.tutorialStep===1&&client.id==="client-001"&&starterModel(S).id!=="creative_agency"?" tutorial-focus":""}" data-agency-action="service" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<cost||guidedActionBlocked(client,"service")?"disabled":""}>🎯 Optimize the account · ${cost} focus</button>
        <button class="btn" data-agency-action="audit" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<auditFocus||S.cash-auditCash < -S.creditLimit||guidedActionBlocked(client,"audit")?"disabled":""}>🔎 Fix tracking · ${auditFocus} focus + ${safeMoney(auditCash)}</button>
        <button class="btn${S.tutorialEnabled&&S.month===0&&S.tutorialStep===1&&client.id==="client-001"&&starterModel(S).id==="creative_agency"?" tutorial-focus":""}" data-agency-action="refresh" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<refreshFocus||S.cash-refreshCash < -S.creditLimit||guidedActionBlocked(client,"refresh")?"disabled":""}>🎨 New ad revision · ${refreshFocus} focus + ${safeMoney(refreshCash)}</button>
        <button class="btn" data-agency-action="update" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<updateFocus||guidedActionBlocked(client,"update")?"disabled":""}>💬 Report to the client · ${updateFocus} focus</button>
      </div>${typeof densityLevel==="function"&&densityLevel()==="guided"?`<div class="note"><b>Choose the layer that needs work:</b> Service improves routine performance and resets the due date. Audit improves measurement. Refresh improves creative readiness. Update builds trust and can reveal how the client makes decisions.</div>`:""}${incident?.id==="stakeholder"?`<div class="agency-actions"><button class="btn" data-client-call="evidence" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with evidence</button><button class="btn" data-client-call="plan" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with a plan</button><button class="btn" data-client-call="assurance" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with safeguards</button><button class="btn" data-client-call="context" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with shared context</button></div>`:""}
    </article>`;
  }

  function guidedFunnelActionBlocked(funnel,action){
    if(!S.tutorialEnabled||S.month!==0||S.tutorialStep>=3)return false;
    return S.tutorialStep!==1||funnel.id!=="funnel-1"||action!=="audit";
  }
  function funnelCard(funnel){const vertical=AFFILIATE_VERTICALS.find(item=>item.id===funnel.verticalId)||AFFILIATE_VERTICALS[0],last=funnel.last,offer=holdingOffer(vertical.id);
    return `<article class="affiliate-funnel-card slot${funnel.complianceHeat>65?" at-risk":""}" data-funnel-id="${esc(funnel.id)}"><header><div><div class="fam">Owned funnel · ${esc(vertical.label)}</div><h3>${esc(funnel.name)}</h3></div><span class="agency-chip">${safeMoney(funnel.dailyBudget)}/day</span></header>
      <div class="note"><b>Offer and customer:</b> ${esc(funnel.audience||offer.audience)}. <b>Why quality matters:</b> ${esc(funnel.stakes||offer.stakes)}</div>
      <div class="note"><b>Ad now running:</b> ${esc(funnel.adConcept||offer.adConcept)} · ${esc(funnel.adFormat||offer.adFormat)}.</div>
      <div class="agency-health"><span><b>Fatigue</b> ${pct(funnel.fatigue)}</span><span><b>Affiliate signal</b> ${pct(funnel.signal)}</span><span><b>Compliance heat</b> ${pct(funnel.complianceHeat)}</span><span><b>Status</b> ${funnel.pausedDays?`review · ${funnel.pausedDays} ${funnel.pausedDays===1?"day":"days"}`:"active"}</span></div>
      <div class="affiliate-heat"><span>Compliance heat</span><i style="--value:${pct(funnel.complianceHeat)}"></i><b>${pct(funnel.complianceHeat)}</b></div>
      <div class="note">${last?`Last workday: ${safeMoney(last.spend)} in media produced ${safeMoney(last.earned)} in modeled payout · modeled payout efficiency ${last.mer.toFixed(2)}× · expected payout delay ${last.lag} ${last.lag===1?"day":"days"}.`:"No delivery evidence yet."} Signal raises modeled payout efficiency. Compliance heat reduces it and can trigger a 5–12-day review. When a payout reaches its due date, validation can remove 4%–14% as a clawback before cash arrives.</div>
      <div class="agency-actions"><button class="btn" data-affiliate-action="scale-down" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||funnel.dailyBudget<=0||guidedFunnelActionBlocked(funnel,"scale-down")?"disabled":""}>Lower daily budget by ${safeMoney(500)} · 1 focus</button><button class="btn" data-affiliate-action="scale-up" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||S.cash<10000||funnel.dailyBudget>=25000||guidedFunnelActionBlocked(funnel,"scale-up")?"disabled":""}>Raise daily budget by ${safeMoney(500)} · 1 focus + 1 heat · needs ${safeMoney(10000)} cash</button><button class="btn" data-affiliate-action="refresh" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||S.cash<affiliateRefreshCost(S)||funnel.fatigue<=0||guidedFunnelActionBlocked(funnel,"refresh")?"disabled":""}>🎨 New ad revision · −${affiliateRefreshLift(S)} fatigue · 1 focus + ${safeMoney(affiliateRefreshCost(S))} cash</button><button class="btn${S.tutorialEnabled&&S.month===0&&S.tutorialStep===1&&funnel.id==="funnel-1"?" tutorial-focus":""}" data-affiliate-action="audit" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||S.cash<1000||(funnel.signal>=100&&funnel.complianceHeat<=0)||guidedFunnelActionBlocked(funnel,"audit")?"disabled":""}>🔎 Audit signal · +12 signal and −8 heat · 1 focus + ${safeMoney(1000)} cash</button></div><div class="note">Optional interventions use positive operating cash. The credit line can bridge scheduled delivery and month-close obligations, but it cannot fund these discretionary changes.</div></article>`;}

  function runwayLabel(months){return months>=99?"99+ months":`${months.toFixed(1)} ${months.toFixed(1)==="1.0"?"month":"months"}`;}
  function operatingStatementMarkup(){
    const status=liquidityStatus(S),statement=status.statement,runway=status.runway;
    const tone=status.id==="healthy"?"is-safe":status.id==="unpayable"?"is-critical":"is-tight";
    const categoryRows=Object.entries(statement.categories).filter(([,amount])=>amount>0).map(([id,amount])=>{
      const spec=AGENCY_EXPENSE_CATEGORIES[id]||AGENCY_EXPENSE_CATEGORIES.other;
      return `<div class="agency-cost-row is-category"><span aria-hidden="true">${esc(spec.icon)}</span><b>${esc(spec.label)} · ${safeMoney(amount)}</b><small>${esc(spec.note)}</small></div>`;
    }).join("");
    return `<details class="agency-operating-statement ${tone}" data-disclosure-id="agency-operating-statement">
      <summary><span>Monthly company operating statement</span><em>${safeMoney(statement.billsDue)} due in ${statement.dueInWorkdays} workday${statement.dueInWorkdays===1?"":"s"}</em></summary>
      <div class="agency-statement-body"><div class="agency-runway ${tone}"><b>${esc(status.label)}</b><strong>${runwayLabel(runway.cashMonths)}</strong>
        <small>${esc(status.detail)} Cash plus unused credit covers ${runwayLabel(runway.liquidityMonths)} under the current plan.${runway.plannedOwnedMedia?` That plan includes ${safeMoney(runway.plannedOwnedMedia)} in monthly owned-media delivery.`:""}</small></div>
        <div class="agency-cost-breakdown">${categoryRows}</div>
        <div class="agency-cost-row"><span aria-hidden="true">📅</span><b>Recurring bills due at month close · ${safeMoney(statement.billsDue)}</b><small>These obligations settle after collections that arrive before the final workday.</small></div>
        <div class="agency-cost-row"><span aria-hidden="true">✅</span><b>Costs already paid this month · ${safeMoney(statement.alreadyPaid)}</b><small>Onboarding, team changes, optional work and company-funded media reduce cash when chosen.</small></div>
        <div class="agency-cost-row is-total"><span aria-hidden="true">🧾</span><b>Current-month expense total · ${safeMoney(statement.totalExpense)}</b><small>Includes recurring obligations and costs already paid. Future optional actions and owned-media delivery enter as they occur; client-funded media remains outside this statement.</small></div>
        <div class="note">Cost drivers: ${statement.drivers.map(esc).join(" · ")}.</div></div></details>`;
  }

  function hud(){
    const cap=capacity(S),seats=activeClients(S).length,managed=managedClients(S).length,profitProgress=clamp(S.cumulativeProfit/AGENCY_PROFIT_TARGET*100,0,100);
    const urgent=S.businessModel==="agency"?activeClients(S).filter(c=>c.incident?.critical||c.serviceDebt>=4).length:S.affiliate.funnels.filter(f=>f.pausedDays||f.complianceHeat>65).length;
    const due=S.businessModel==="agency"?activeClients(S).filter(c=>routineDue(c,S)).length:urgent;
    const receivable=S.receivables.reduce((sum,item)=>sum+item.amount,0),liquidity=liquidityStatus(S),runway=liquidity.runway;
    const runwayCopy=runway.plannedOwnedMedia?`${safeMoney(runway.monthlyObligations)} recurring bills + ${safeMoney(runway.plannedOwnedMedia)} planned owned media per month`:
      `${safeMoney(liquidity.statement.billsDue)} in recurring bills due in ${liquidity.statement.dueInWorkdays} workday${liquidity.statement.dueInWorkdays===1?"":"s"}`;
    const nextLevelProfit=S.level>=22?null:S.level*S.level*25000,levelFloor=Math.max(0,(S.level-1)*(S.level-1)*25000),
      levelProgress=nextLevelProfit===null?100:clamp((Math.max(0,S.peakProfit)-levelFloor)/Math.max(1,nextLevelProfit-levelFloor)*100,0,100),
      levelRemaining=nextLevelProfit===null?0:Math.max(0,nextLevelProfit-Math.max(0,S.peakProfit));
    const metrics={
      clock:["Career clock",S.month>=120?"2027 audit":`${year(S)} · Month ${monthOfYear(S)} · Day ${S.dayInMonth}`,`${S.month}/120 months closed`],
      cash:["Operating cash",safeMoney(S.cash),`${safeMoney(Math.max(0,S.creditLimit+S.cash))} liquidity before the credit-line limit`,S.cash>=0?"pos":"neg"],
      runway:["Cash runway",runwayLabel(runway.cashMonths),runwayCopy,liquidity.id==="healthy"?"pos":liquidity.id==="unpayable"?"neg":"amb"],
      profit:["Career profit",safeMoney(S.cumulativeProfit),`${pct(profitProgress)} of ${safeMoney(AGENCY_PROFIT_TARGET)} victory target`,S.cumulativeProfit>=0?"pos":"neg"],
      seats:[S.businessModel==="agency"?"Active client seats":"Owned funnels",S.businessModel==="agency"?`${seats} / ${AGENCY_MAX_CLIENTS}`:`${S.affiliate.funnels.length} / 8`,S.businessModel==="agency"?`${managed} managed · next growth gate ${S.targetSeats}`:starterModel(S).id==="holding_company"?"company-owned offers · no client relationships":"client retainers retired"],
      focus:["Focus left today",`${S.focusRemaining} / ${S.focusTotal}`,`${pct(cap.utilization*100)} forecast utilization`,cap.utilization>.95?"neg":cap.utilization>.8?"amb":"pos"],
      level:["Agency career level",String(S.level),"","","career-level"],
      reputation:["Agency reputation",pct(S.reputation),"Affects lead volume, fee quality and decision time",S.reputation<40?"neg":S.reputation<60?"amb":"pos"],
      receivable:["Open receivables",safeMoney(receivable),`${S.receivables.length} invoice or payout ${S.receivables.length===1?"batch":"batches"}`],
      queue:["Priority queue",urgent?`${urgent} critical`:due?`${due} due`:"Clear",urgent?"Resolve before running the day":due?"Routine service is due":"No account requires immediate work",urgent?"neg":due?"amb":"pos"]
    };
    const groups={today:[metrics.clock,metrics.focus,metrics.queue,metrics.seats],money:[metrics.cash,metrics.runway,metrics.profit,metrics.receivable],
      agency:[metrics.level,metrics.reputation,metrics.seats]},active=currentDashboardView(),
      statMarkup=([k,v,sub,cls,kind])=>kind==="career-level"?`<article class="agency-stat stat agency-level-card"><div class="k">${k}</div><div class="agency-level-main"><span>Level</span><strong aria-label="Agency career level ${v}">${v}</strong></div><button type="button" class="agency-level-points" data-agency-global="capabilities" ${S.ended?"disabled":""}><b>${S.skillPoints}</b><span>capability point${S.skillPoints===1?"":"s"} available${S.skillPoints?" · open the tree":""}</span></button><div class="agency-level-track"><progress max="100" value="${levelProgress}" aria-label="Progress toward the next Agency career level"></progress><small>${nextLevelProfit===null?"Maximum career level reached":`${safeMoney(levelRemaining)} more peak career profit to reach level ${S.level+1}`}</small></div></article>`:
        `<div class="agency-stat stat"><div class="k">${k}</div><div class="v ${cls||""}">${v}</div><div class="sub">${sub}</div></div>`,
      tab=(id,label,meta)=>`<button type="button" role="tab" data-agency-hud-view="${id}" aria-selected="${active===id}" aria-controls="agency-hud-${id}" tabindex="${active===id?0:-1}"><b>${label}</b><small>${meta}</small></button>`;
    return `<section class="agency-dashboard" aria-label="Agency status"><nav class="agency-hud-nav" role="tablist" aria-label="Agency status pages">
        ${tab("today","Workday",urgent?`${urgent} urgent`:due?`${due} due`:"Ready")}${tab("money","Cash",liquidity.label)}${tab("agency","Progress",`${S.skillPoints} capability point${S.skillPoints===1?"":"s"}`)}</nav>
      ${Object.entries(groups).map(([id,rows])=>`<div class="agency-hud" id="agency-hud-${id}" data-agency-hud-panel="${id}" role="tabpanel"${active===id?"":" hidden"}>${rows.map(statMarkup).join("")}${id==="money"?`<div class="agency-progress"><span>2027 career-profit gate</span><progress max="100" value="${profitProgress}" aria-label="Career profit progress"></progress><b>${safeMoney(S.cumulativeProfit)} / ${safeMoney(AGENCY_PROFIT_TARGET)}</b><small>Operating profit only. Client media budgets are excluded.</small></div>`:""}</div>`).join("")}
    </section>`;
  }

  function careerLoopMarkup(){const holding=starterModel(S).id==="holding_company";return `<details class="agency-career-loop" data-disclosure-id="agency-career-loop"${S.tutorialStep===0?" open":""}><summary>How Agency Career works</summary><div><span><b>1 · ${holding?"Work owned funnels":"Work clients"}</b><small>${holding?"Use focus on budgets, signal, creative and compliance.":"Use focus on service, measurement, creative or communication."}</small></span><span><b>2 · Manage the company</b><small>Watch cash, capacity, team costs and capabilities.</small></span><span><b>3 · Run the day</b><small>The media spends and time advances; ${holding?"media spends and payouts age":"debt, incidents and receivables can change"}.</small></span><span><b>4 · Close the month</b><small>${holding?"Collect validated payouts and pay company costs.":"Collect fees, pay operating costs, retain clients and choose growth."}</small></span></div><p>Repeat the daily loop through each month. Reaching peak-profit milestones raises the Agency career level and awards capability points. Reach the 2027 profit and liquidity gates to win.</p></details>`;}

  function guideMarkup(){
    /* The verified walkthrough in tutorial.js owns guidance for this mode now; the old
       four-card stub only remains for saves that were mid-way through it. */
    if(typeof tutorialIsActive==="function"&&tutorialIsActive())return "";
    if(!S.tutorialEnabled||S.month>0||S.tutorialStep>=4)return "";
    const model=starterModel(S),holding=model.id==="holding_company",creative=model.id==="creative_agency";
    const content=holding?(S.tutorialStep===0?["Meet the owned-offer portfolio","This company has no clients. It funds three funnels, absorbs their losses and collects payouts only after validation."]:
      S.tutorialStep===1?["Audit one funnel's signal","Signal measures how useful the funnel's conversion evidence is. The highlighted audit costs cash and focus, raises signal and lowers compliance heat."]:
      S.tutorialStep===2?["Read the audit result",`Funnel 1 now has ${pct(S.affiliate.funnels[0]?.signal||0)} signal and ${pct(S.affiliate.funnels[0]?.complianceHeat||0)} compliance heat. The audit did not create revenue; it changed the evidence and risk behind future delivery.`]:
      ["Finish the first workday","Use another control if it serves a clear purpose, or end the workday. Delivery spends company cash and creates delayed payout receivables."]):
      (S.tutorialStep===0?["Meet the founding client",`Keep this one client through Month 1. First, learn what the company sells, who it serves and what its ${esc(channelOf(S.clients[0]).label.toLowerCase())} account needs.`]:
      S.tutorialStep===1?[creative?"Revise the first ad":"Complete the first account task",creative?"The founding ad needs a new execution. The highlighted creative control will write and display the revision.":"The founding client is due now. The required service control is highlighted inside the client card below."]:
      S.tutorialStep===2?["Read what your action changed",creative?"Creative readiness rose and the ad card now shows a different execution. Account health, campaign outcomes and client trust remain separate.":"Account health, campaign outcomes and client trust answer different questions. Review the real result on the card before continuing."]:
      ["Finish the first workday","The required work is complete. Optional work can use the remaining focus, or you can move to Today and end the workday."]);
    const next=S.tutorialStep===0?`<button class="btn" data-agency-tutorial="show-client">${holding?"Show the owned funnels":"Show the founding client"}</button>`:
      S.tutorialStep===2?`<button class="btn" data-agency-tutorial="plan-day">Continue to today's plan</button>`:
      S.tutorialStep===3?`<button class="btn" data-agency-tutorial="finish-day">Take me to End workday</button>`:"";
    return `<section class="agency-guide agency-first-assignment"><header><span>Guided start · step ${S.tutorialStep+1} of 4</span><b>${content[0]}</b></header><p>${content[1]}</p>${careerLoopMarkup()}<div class="row">${next}<button class="btn" data-agency-tutorial="disable">End walkthrough</button></div></section>`;
  }

  function setTutorialEnabled(enabled,options={}){
    if(!S||S.engine!=="agency-career")return false;
    const next=enabled===true;
    if(next&&!(S.month===0&&S.day===1&&S.telemetry.accountsOperated===0&&S.focusRemaining===S.focusTotal))return false;
    S.tutorialEnabled=next;S.tutorialStep=next?0:4;markRunDirty();
    if(options.render!==false)render();return true;
  }

  function activateGuidedRecommendation(){
    if(!S||S.engine!=="agency-career"||!S.tutorialEnabled||S.month!==0||S.tutorialStep>=4)return "";
    if(S.tutorialStep===0){S.tutorialStep=1;markRunDirty();render();}
    const view=S.tutorialStep===3?"overview":"board";
    if(typeof Workspace!=="undefined"&&Workspace){Workspace.setView(view,{focus:false});if(view==="board")Workspace.selectEntity(`entity:${S.businessModel==="agency"?"client-001":"funnel-1"}`,{focus:false,ensure:true});}
    focusGuidedControl(S.tutorialStep);return view;
  }

  function setDashboardView(requested,{persist=true,focus=false}={}){
    const view=DASHBOARD_VIEWS.includes(requested)?requested:"today";agencyDashboardView=view;if(persist)writePresentation("dashboard",view);
    if(typeof document==="undefined"||!document.querySelectorAll)return view;
    document.querySelectorAll("[data-agency-hud-view]").forEach(button=>{const active=button.dataset.agencyHudView===view;button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;});
    document.querySelectorAll("[data-agency-hud-panel]").forEach(panel=>{const active=panel.dataset.agencyHudPanel===view;panel.hidden=!active;panel.setAttribute("aria-hidden",String(!active));});
    if(focus){const panel=document.querySelector(`[data-agency-hud-panel="${view}"]`);if(panel&&typeof panel.focus==="function"){panel.tabIndex=-1;panel.focus({preventScroll:true});}}
    return view;
  }

  function setCompanyView(requested,{persist=true,focus=false}={}){
    const view=COMPANY_VIEWS.includes(requested)?requested:"operations";agencyCompanyView=view;if(persist)writePresentation("company",view);
    if(typeof document==="undefined"||!document.querySelectorAll)return view;
    document.querySelectorAll("[data-agency-company-view]").forEach(button=>{const active=button.dataset.agencyCompanyView===view;button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;});
    document.querySelectorAll("[data-agency-company-panel]").forEach(panel=>{const active=panel.dataset.agencyCompanyPanel===view;panel.hidden=!active;panel.setAttribute("aria-hidden",String(!active));});
    if(focus){const panel=document.querySelector(`[data-agency-company-panel="${view}"]`);if(panel&&typeof panel.focus==="function"){panel.tabIndex=-1;panel.focus({preventScroll:true});}}
    return view;
  }

  function resetPresentation(){
    agencyDashboardView="today";agencyCompanyView="operations";agencyPinnedTargetId="";
    writePresentation("dashboard",agencyDashboardView);writePresentation("company",agencyCompanyView);return true;
  }

  function revealWorkspaceTarget(id){
    if(!safeId(id)||!activeClients(S).some(client=>client.id===id)&&!S.affiliate?.funnels?.some(funnel=>funnel.id===id))return false;
    agencyPinnedTargetId=id;render();return true;
  }

  function workspaceModel(state=S){
    if(!state||state.engine!=="agency-career")return null;
    const clients=state.businessModel==="agency"?activeClients(state):[],urgentClients=state.businessModel==="agency"?clients.filter(client=>client.incident?.critical||client.serviceDebt>=4):[],
      urgentFunnels=state.businessModel==="affiliate"?state.affiliate?.funnels.filter(funnel=>funnel.pausedDays||funnel.complianceHeat>65)||[]:[],critical=urgentClients.length||urgentFunnels.length,
      dueClients=state.businessModel==="agency"?clients.filter(client=>routineDue(client,state)):[],due=state.businessModel==="agency"?dueClients.length:critical,cap=capacity(state),liquidity=liquidityStatus(state),
      history=state.log?.length||0;
    let recommendedView="overview";
    if(critical||due)recommendedView="board";
    else if(liquidity.id!=="healthy"||liquidity.runway.cashMonths<2)recommendedView="finance";
    else if(cap.utilization>.95)recommendedView="team";
    const recommendation=critical?`${critical} urgent ${critical===1?(state.businessModel==="agency"?"account needs":"funnel needs"):(state.businessModel==="agency"?"accounts need":"funnels need")} attention.`:due?`${due} ${due===1?"campaign needs":"campaigns need"} a decision before you run the day.`:
      liquidity.id!=="healthy"?`${liquidity.label}. Review the month-close obligations.`:cap.utilization>.95?"The workload forecast is over safe capacity.":
      state.focusRemaining?`${state.focusRemaining} of ${state.focusTotal} focus remains today. No account is due — business development, a service line or proactive account work can use it.`:"Today's focus is spent. Run the day and read what the media bought.";
    const target=(critical?(urgentClients.sort((a,b)=>clientPriority(b,state)-clientPriority(a,state))[0]||urgentFunnels[0]):
      due?dueClients.sort((a,b)=>clientPriority(b,state)-clientPriority(a,state))[0]:null);
    return {identity:identity(state),recommendedView,recommendation,targetId:target?.id||null,views:{
      overview:{label:"Today",meta:state.focusRemaining?`${state.focusRemaining} focus left`:"Ready to close"},
      board:{label:state.businessModel==="agency"?"Client work":"Funnels",meta:critical?`${critical} urgent`:due?`${due} due`:state.businessModel==="agency"?`${clients.length} active`:`${state.affiliate?.funnels.length||0} active`},
      finance:{label:"Finance",meta:liquidity.label},team:{label:"Team",meta:`${pct(cap.utilization*100)} utilized`},
      growth:{label:"Capabilities",meta:`${state.skillPoints} capability point${state.skillPoints===1?"":"s"}`},
      history:{label:"History",meta:history?`${history} entries`:"No entries"}
    }};
  }

  function playerContext(state=S){
    if(!state||state.engine!=="agency-career")return null;
    const brand=identity(state),holding=brand.agencyType==="holding_company",founder=!holding?activeClients(state)[0]||state.archivedClients[0]:null;
    const geography=founder?clientGeography(founder,state):null,offer=founder?offerOf(founder):null;
    return {name:brand.name,agencyType:brand.agencyType,modelLabel:brand.model.label,hqId:brand.hqId,hqLabel:`${brand.hq.city}, ${brand.hq.state}`,
      playerRole:brand.model.playerRole,startingSituation:brand.model.startingSituation,channelRule:brand.model.channelRule,businessModel:state.businessModel,
      openingWork:holding?`${(state.affiliate?.funnels||[]).map(funnel=>funnel.name).join(", ")} — company-owned offers with separate budgets, signal, fatigue and payout delays`:
        `${founder?.name||"Founding client"} sells ${offer?.label?.toLowerCase()||"one offer"} from ${geography?.office.city||brand.hq.city}, ${geography?.office.stateCode||brand.hq.stateCode} to ${founder?.targetStates?.includes("US")?"a nationwide market":founder?.targetStates?.join(", ")||"its service area"}`,
      tutorialEnabled:state.tutorialEnabled===true,tutorialStep:state.tutorialStep};
  }

  function serviceLinesMarkup(){
    const lines=serviceLinesForModel(S);if(!lines.length)return "";
    const rows=lines.map(line=>{
      const record=serviceLineState(S,line.id);
      if(record?.active){
        const billed=serviceLineBilling(line,record,S),upkeep=roundTo(line.upkeep*eraCostFactor(S),10);
        return `<div class="agency-service-line"><span><b>${esc(line.label)}</b><small>${esc(line.note)}</small></span>
          <div class="agency-service-meter"><span>Momentum ${Math.round(record.momentum)}%</span><i style="--value:${Math.round(record.momentum)}%"></i></div>
          <small>Bills about ${safeMoney(billed)} at month close · ${safeMoney(upkeep)}/month upkeep on the operating statement. Momentum falls a little every workday nobody works the line.</small>
          <button class="btn" data-agency-service-work="${esc(line.id)}" ${S.ended||S.focusRemaining<1||record.momentum>=100?"disabled":""}>Work the line · 1 focus · +9 momentum</button></div>`;
      }
      const check=canStartServiceLine(line.id,S);
      return `<div class="agency-service-line is-inactive"><span><b>${esc(line.label)}</b><small>${esc(line.note)}</small></span>
        <small><b>Pros:</b> ${esc(line.pros)} <b>Cons:</b> ${esc(line.cons)}</small>
        <button class="btn" data-agency-service-start="${esc(line.id)}" ${S.ended||!check.ok||S.focusRemaining<1?"disabled":""}>${check.ok?`Open the line · ${safeMoney(check.setup)} + 1 focus`:esc(check.reason)}</button></div>`;
    }).join("");
    return `<div class="agency-service-lines"><div class="eyebrow">Organic service lines</div>
      <div class="note">Revenue this company earns beside paid media. A line only performs when someone works it — a useful place for focus on days when no account is due.</div>${rows}</div>`;
  }
  function accountControls(){
    const b=breadth(S),cap=capacity(S),staffCount=Object.values(S.staff).reduce((a,n)=>a+n,0),currentEra=AGENCY_ERAS.find(item=>item.year===year(S))||AGENCY_ERAS[0],costs=monthlyOperatingCost(S),brand=identity(S);
    const documentUseful=S.affiliate?.posture!=="documented"||S.affiliate?.funnels.some(funnel=>funnel.complianceHeat>0),active=currentCompanyView();
    const tab=(id,label,meta)=>`<button type="button" role="tab" data-agency-company-view="${id}" aria-selected="${active===id}" aria-controls="agency-company-${id}" tabindex="${active===id?0:-1}"><b>${label}</b><small>${meta}</small></button>`;
    const operations=`<section class="agency-panel agency-company-panel" id="agency-company-operations" data-agency-company-panel="operations" role="tabpanel"${active==="operations"?"":" hidden"}><div class="eyebrow">Operations</div>
      <div class="agency-era"><b>${esc(currentEra.title)}</b><span>${esc(currentEra.copy)}</span></div>
      <div class="agency-capacity"><b>Workload forecast</b><span>The company normally has ${cap.raw} focus per day.${S.focusTotal<cap.raw?` A continuity disruption reduced today to ${S.focusTotal}.`:""} Current clients are expected to use ${cap.committed.toFixed(1)} · ${pct(cap.utilization*100)} utilization.</span>
        <span>You can manage ${b.verticalCap} verticals and ${b.familyCap} channel families without extra switching cost. Current breadth: ${b.verticals} verticals and ${b.families} families · workload multiplier ×${b.multiplier.toFixed(2)}.</span></div>
      ${S.businessModel==="agency"?`<div class="row"><button class="btn wide" data-agency-global="delegate" ${(S.ended||(!S.staff.buyer&&!S.staff.ops&&!hasTech("agency_os",S)&&!hasTech("distributed_ops",S)&&!hasTech("agentic_ops",S)))?"disabled":""}>🤖 Delegate due routine accounts · uses available focus</button><button class="btn wide" data-agency-global="lead-desk" ${S.ended?"disabled":""}>💼 Prospective clients · ${S.prospects.length}</button></div>
      <div class="row"><button class="btn wide" data-agency-global="bizdev" ${(S.ended||S.focusRemaining<1||S.cash-roundTo(150*eraCostFactor(S),10) < -S.creditLimit||(S.bizDevPoints||0)>=6)?"disabled":""}>🤝 Develop new business · 1 focus + ${safeMoney(roundTo(150*eraCostFactor(S),10))} · ${S.bizDevPoints||0}/6 this month</button></div>
      <div class="note">Employees, approved distributed operators and guardrailed agent workflows can service due, noncritical accounts in priority order. They use today's shared focus. Critical incidents, client commitments and irreversible changes remain yours. Business development improves next month's prospective-client group — useful work for a day when no account is due.</div>`:
        `<div class="row"><button class="btn wide" data-agency-global="affiliate-desk" ${S.ended?"disabled":""}>🧬 Launch funnel</button><button class="btn wide" data-agency-global="document" ${(S.ended||S.focusRemaining<1||S.cash<3000||!documentUseful)?"disabled":""}>🛡 Document network claims · −18 heat on every funnel · 1 focus + ${safeMoney(3000)} cash</button></div>`}
      ${serviceLinesMarkup()}
    </section>`;
    const finance=`<section class="agency-panel agency-company-panel" id="agency-company-finance" data-agency-company-panel="finance" role="tabpanel"${active==="finance"?"":" hidden"}><div class="eyebrow">Finance</div>
      <p class="agency-role-brief">Can the company pay this month's obligations, and what is consuming its operating cash?</p>${operatingStatementMarkup()}</section>`;
    const team=`<section class="agency-panel agency-company-panel" id="agency-company-team" data-agency-company-panel="team" role="tabpanel"${active==="team"?"":" hidden"}><div class="eyebrow">Team · ${staffCount} employees + founder</div>
      ${Object.entries(STAFF).map(([id,spec])=>{const severance=roundTo(spec.salary*eraCostFactor(S)*.5,50),equipment=workstationSetupCost(id,S),wage=roundTo(spec.salary*eraCostFactor(S),10);return `<div class="pixelrow agency-staff-row"><span><b>${esc(spec.label)}</b><small>${esc(spec.note)}</small></span><b class="agency-staff-count" aria-label="${S.staff[id]} on staff">${S.staff[id]}</b><button class="btn" data-agency-hire="${id}" ${S.ended||S.staff[id]>=100||S.cash-spec.hireCost-equipment < -S.creditLimit?"disabled":""}>Hire · ${safeMoney(spec.hireCost)} recruiting + ${safeMoney(equipment)} setup</button><button class="btn" data-agency-release="${id}" ${S.ended||S.staff[id]<=0||S.cash-severance < -S.creditLimit?"disabled":""}>Release · ${safeMoney(severance)} severance + immediate capacity loss</button><small>${safeMoney(wage)}/month wages before employer taxes and benefits</small></div>`;}).join("")}
      <div class="note">Monthly employee wages ${safeMoney(costs.categories.employeeWages)} + ${safeMoney(costs.categories.employerBenefits)} in employer taxes and benefits. Hiring creates capacity, equipment and facilities costs; an oversized team turns quiet months into a cash problem.</div></section>`;
    return `<section class="agency-company-shell"><header><div><div class="eyebrow">${esc(brand.name)} · ${esc(brand.hq.city)}, ${esc(brand.hq.stateCode)}</div><strong>${esc(brand.model.label)}</strong><small>${esc(brand.model.playerRole)}</small></div></header>
      <nav class="agency-company-tabs" role="tablist" aria-label="Company pages">${tab("operations","Operations",`${pct(cap.utilization*100)} utilized`)}${tab("finance","Finance",`${runwayLabel(cashRunway(S).cashMonths)} runway`)}${tab("team","Team",`${staffCount} employees`)}</nav>
      <div class="agency-command">${operations}${finance}${team}</div></section>`;
  }

  /* The capability tree is a major progression system and deserves the whole screen when the
     player goes looking for it, not a drawer pinned under the company panels. */
  function capabilityScreen(){
    if(!S||S.engine!=="agency-career")return false;
    show(`<div class="eyebrow">Agency career level ${S.level} · ${esc(identity(S).name)}</div>
      <h2>${S.skillPoints?`Spend your capability point${S.skillPoints===1?"":"s"}`:"The capability tree"}</h2>
      <div class="capability-screen">${techMarkup()}</div>
      <div class="row"><button class="btn wide" id="closeB">Back to the agency</button></div>`,"structure",{wide:true});
    const back=document.getElementById("closeB");if(back)back.onclick=close;
    bindRenderedActions();
    if(typeof tooltipsEnabled==="function"&&tooltipsEnabled()&&typeof wireLore==="function")wireLore(document.getElementById("modalCard")||document);
    return true;
  }
  function techMarkup(){
    const pivotCheck=canPivot(S),branches=[...new Set(AGENCY_TECH_NODES.map(item=>item.branch))];
    const nodeMarkup=item=>{const unlocked=hasTech(item.id,S),check=canUnlock(item.id,S),investment=capabilityInvestment(item,S),monthly=roundTo((Number(item.monthly)||0)*eraCostFactor(S),10),stateClass=unlocked?" unlocked":check.ok?" available":" locked";return `<article class="agency-tech-node${stateClass}"><div class="agency-tech-meta"><span class="tag">${esc(item.branch)}</span><span class="tag">${item.year}</span>${item.level?`<span class="tag">level ${item.level}+</span>`:""}<span class="tag">${item.cost} point${item.cost===1?"":"s"}</span></div><b>${esc(item.label)}</b><p>${esc(item.effect)}</p>${item.tradeoff?`<small><b>Tradeoff:</b> ${esc(item.tradeoff)}</small>`:""}${investment||monthly?`<div class="agency-tech-economics">${investment?`<span><b>${safeMoney(investment)}</b><small>one-time setup</small></span>`:""}${monthly?`<span><b>${safeMoney(monthly)}/month</b><small>recurring obligation</small></span>`:""}</div>`:""}<button class="btn wide" data-agency-tech="${esc(item.id)}" ${S.ended||unlocked||!check.ok?"disabled":""}>${unlocked?"✓ Unlocked":check.ok?"Unlock capability":esc(check.reason)}</button></article>`;};
    const nextLevelProfit=S.level>=22?null:S.level*S.level*25000,levelFloor=Math.max(0,(S.level-1)*(S.level-1)*25000),
      levelProgress=nextLevelProfit===null?100:clamp((Math.max(0,S.peakProfit)-levelFloor)/Math.max(1,nextLevelProfit-levelFloor)*100,0,100),
      levelRemaining=nextLevelProfit===null?0:Math.max(0,nextLevelProfit-Math.max(0,S.peakProfit));
    return `<div class="agency-tech-tree"><section class="agency-level-screen">
        <div class="agency-level-screen-main"><span>Agency career level</span><strong>${S.level}</strong></div>
        <div class="agency-level-screen-side">
          <div class="agency-level-screen-points"><b>${S.skillPoints}</b><span>capability point${S.skillPoints===1?"":"s"} to spend</span></div>
          <div class="agency-level-track"><progress max="100" value="${levelProgress}" aria-label="Progress toward the next Agency career level"></progress>
            <small>${nextLevelProfit===null?"Maximum career level reached":`${safeMoney(levelRemaining)} more peak career profit reaches level ${S.level+1}`}</small></div>
          <small class="agency-level-screen-note">Levels come from peak career profit, and each one grants a capability point. Points are the only way to open new channels, systems and structure.</small>
        </div>
      </section>
      <header class="agency-tree-head"><div><div class="eyebrow">Capability tree</div><strong>Spend points here</strong></div><span>Open one branch at a time.</span></header>
      <div class="note"><b>Choose an operating strategy, not a shopping list.</b> Capability points are scarce. Advanced systems also require positive operating cash up front and add recurring obligations to the monthly statement. Setup and monthly amounts below include the current era's cost growth.</div>
      <div class="agency-tech-branches">${branches.map((branch,index)=>{const nodes=AGENCY_TECH_NODES.filter(item=>item.branch===branch),unlocked=nodes.filter(item=>hasTech(item.id,S)).length,id=branch.toLowerCase().replace(/[^a-z0-9]+/g,"-");return `<details class="agency-tech-branch" data-disclosure-id="agency-tech-${id}"${index===0?" open":""}><summary><span><b>${esc(branch)}</b><small>${unlocked} of ${nodes.length} unlocked</small></span><em>${nodes.some(item=>canUnlock(item.id,S).ok&&!hasTech(item.id,S))?"Choice available":"Review branch"}</em></summary><div class="agency-lead-grid">${nodes.map(nodeMarkup).join("")}</div></details>`;}).join("")}</div>
      <details class="agency-panel agency-transformation" data-disclosure-id="agency-transformation"><summary>Become a different kind of company</summary><div class="agency-transformation-body">
        <p>Any company can change what it is. It costs ${TRANSFORM_POINT_COST} capability points and ${safeMoney(transformCashCost(S))}, and it can only happen at the start of a month before any focus or cash is spent. Cash, staff, systems, reputation, career level and career profit all carry over. The old book of work does not: clients are handed back, or owned offers are wound down, and capabilities the new company cannot practise are surrendered.</p>
        <div class="agency-lead-grid">${transformTargets(S).map(target=>{const check=canTransform(target.id,S);
          return `<article class="agency-lead-card"><div class="fam">${esc(target.icon)} ${esc(target.label)}</div>
            <p>${esc(target.selectionCopy)}</p><div class="note">${esc(target.channelRule)}</div>
            <button class="btn wide" data-agency-transform="${esc(target.id)}" ${S.ended||!check.ok?"disabled":""}>${check.ok?`Become this · ${TRANSFORM_POINT_COST} points + ${safeMoney(check.cash)}`:esc(check.reason)}</button></article>`;}).join("")}</div>
      </div></details></div>`;
  }

  function render(){
    const state=S;if(!state||state.engine!=="agency-career")return false;
    if(typeof updateFlavorChrome==="function")updateFlavorChrome();
    setNodeText("accountSection","Agency status");setNodeText("accountSectionNote","switch between the workday, cash and career progress");
    setNodeText("operationsSection","Today's work");setNodeText("operationsSectionNote","");
    setNodeText("adSection",state.businessModel==="agency"?"Client roster":"Owned funnel network");
    setNodeText("adSectionNote",state.businessModel==="agency"?"clients needing action appear first · each client uses one of the agency's 75 client slots":"funnels needing action appear first · compare payout timing, fatigue, measurement quality, cash and compliance risk");
    const brand=identity(state);setNodeText("runSummary",`${brand.name} · ${brand.model.label} · ${brand.hq.city}, ${brand.hq.stateCode}`);
    /* Focus is spent from every destination, so it has to be readable from every destination. */
    const phase=document.getElementById("ctxPhase");
    if(phase)phase.textContent=`Workday ${state.dayInMonth}/${AGENCY_MONTH_DAYS} · ${state.focusRemaining} of ${state.focusTotal} focus left`;
    setNodeText("seedLbl",`Scenario ${state.seedShown}`);
    document.getElementById("strip").innerHTML=hud();document.getElementById("accountBox").innerHTML=accountControls();document.getElementById("pipeBox").innerHTML=techMarkup();
    const runBtn=document.getElementById("runBtn");runBtn.disabled=state.ended;runBtn.setAttribute("aria-label","Run the agency workday");
    const runText=runBtn.querySelector("span"),runLens=document.getElementById("runLens");if(runText)runText.textContent=state.ended?"Career complete":`Run day ${state.dayInMonth} of ${AGENCY_MONTH_DAYS}`;
    if(runLens)runLens.textContent=state.ended?"Review the final result":"Spend today's media, settle collections and reveal what it bought";
    document.getElementById("asksRow").style.display="";setNodeText("asksLabel","Focus left today:");setNodeText("asksLeft",state.focusRemaining);
    const binBtn=document.getElementById("binBtn");binBtn.style.display="";binBtn.disabled=state.ended;binBtn.className=`btn wide${state.prospects.length?" crisis-count":""}`;
    binBtn.textContent=state.businessModel==="agency"?`Prospective clients (${state.prospects.length})`:`Owned funnels (${state.affiliate.funnels.length})`;
    setNodeText("benchSection","Agency command");setNodeText("logSection","Career ledger");
    document.getElementById("log").innerHTML=typeof renderLog==="function"?renderLog(state.log,"<div>Nothing has moved yet.</div>"):state.log.map(item=>item.html).join("");
    if(state.businessModel==="agency"){
      const todayRows=activeClients(state).slice().sort((a,b)=>clientPriority(b,state)-clientPriority(a,state)||a.name.localeCompare(b.name)).slice(0,3);
      let rows=sortedRoster(state);const pinned=agencyPinnedTargetId?activeClients(state).find(client=>client.id===agencyPinnedTargetId):null;
      if(agencyPinnedTargetId&&!pinned)agencyPinnedTargetId="";if(pinned&&!rows.includes(pinned))rows=[pinned,...rows];const pageSize=12,maxPage=Math.max(0,Math.ceil(rows.length/pageSize)-1),page=pinned?0:Math.min(state.rosterPage,maxPage);
      const visible=rows.slice(page*pageSize,(page+1)*pageSize);
      document.getElementById("slots").innerHTML=`${guideMarkup()}${dayReportMarkup()}<div class="agency-today-scope"><span><b>Today's client priorities</b><small>The three clients needing the most attention appear here, regardless of the filter or page selected under Client work.</small></span><button class="btn" type="button" data-agency-workspace="board">Open all client work</button></div>
        <div class="agency-roster agency-today-roster">${todayRows.length?todayRows.map(clientCard).join(""):`<div class="agency-panel"><b>No active client relationships.</b><p>Open Client work or Prospective clients to rebuild the roster.</p></div>`}</div>
        <div class="agency-full-scope"><div class="agency-roster-toolbar"><div class="row">${FILTERS.map(id=>`<button class="btn" data-agency-filter="${id}" ${state.filter===id?"disabled":""}>${id==="attention"?"Needs attention":id==="risk"?"At risk":"All clients"} · ${id==="all"?activeClients(state).length:sortedCount(id,state)}</button>`).join("")}</div><span>Showing ${visible.length} of ${rows.length}</span></div>
        <div class="agency-roster agency-full-roster">${visible.length?visible.map(clientCard).join(""):`<div class="agency-panel"><b>No accounts in this view.</b><p>Change the roster filter or open Prospective clients.</p></div>`}</div>
        ${maxPage?`<div class="row"><button class="btn" data-agency-page="prev" ${page<=0?"disabled":""}>← Previous</button><span class="agency-chip">Page ${page+1}/${maxPage+1}</span><button class="btn" data-agency-page="next" ${page>=maxPage?"disabled":""}>Next →</button></div>`:""}</div>`;
    }else{const todayFunnels=state.affiliate.funnels.slice().sort((a,b)=>(Number(!!b.pausedDays)-Number(!!a.pausedDays))||(b.complianceHeat-a.complianceHeat)).slice(0,3);
      document.getElementById("slots").innerHTML=`${guideMarkup()}${dayReportMarkup()}<div class="agency-today-scope"><span><b>Today's funnel priorities</b><small>The three owned funnels with the highest current risk appear here. Open Funnels to review the full network.</small></span><button class="btn" type="button" data-agency-workspace="board">Open all funnels</button></div><div class="agency-roster agency-today-roster">${todayFunnels.map(funnelCard).join("")}</div><div class="agency-full-scope"><div class="agency-roster agency-full-roster">${state.affiliate.funnels.map(funnelCard).join("")}</div></div>`;}
    bindRenderedActions();
    if(typeof tutorialAfterRender==="function")tutorialAfterRender();
    if(typeof tooltipsEnabled==="function"&&tooltipsEnabled()&&typeof wireLore==="function")wireLore(document);
    if(typeof applyUiPrefs==="function")applyUiPrefs(false);
    if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.sync();return true;
  }

  function sortedCount(filter,state=S){const previous=state.filter;state.filter=filter;const n=sortedRoster(state).length;state.filter=previous;return n;}

  function bindRenderedActions(){
    const bindTabs=(selector,dataKey,setter)=>document.querySelectorAll(selector).forEach(button=>{button.onclick=()=>setter(button.dataset[dataKey],{focus:false});button.onkeydown=event=>{
      if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;const tabs=Array.from(document.querySelectorAll(selector)),current=Math.max(0,tabs.indexOf(button)),next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(current+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
      event.preventDefault();setter(tabs[next].dataset[dataKey]);tabs[next].focus();};});
    bindTabs("[data-agency-hud-view]","agencyHudView",setDashboardView);bindTabs("[data-agency-company-view]","agencyCompanyView",setCompanyView);
    document.querySelectorAll("[data-agency-tutorial]").forEach(button=>button.onclick=()=>{const action=button.dataset.agencyTutorial;
      if(action==="show-client")activateGuidedRecommendation();
      else if(action==="disable")setTutorialEnabled(false);
      else if(action==="plan-day"){S.tutorialStep=3;markRunDirty();render();if(typeof Workspace!=="undefined"&&Workspace)Workspace.setView("overview",{focus:false});focusGuidedControl(3);}
      else if(action==="finish-day"){if(typeof Workspace!=="undefined"&&Workspace)Workspace.setView("overview",{focus:false});focusGuidedControl(3);}});
    document.querySelectorAll("[data-agency-action]").forEach(button=>button.onclick=()=>operate(button.dataset.client,button.dataset.agencyAction));
    document.querySelectorAll("[data-client-call]").forEach(button=>button.onclick=()=>clientConversation(button.dataset.client,button.dataset.clientCall));
    document.querySelectorAll("[data-agency-pacing]").forEach(button=>button.onclick=()=>setClientPacing(button.dataset.client,button.dataset.agencyPacing));
    document.querySelectorAll("[data-agency-platform]").forEach(button=>button.onclick=()=>switchClientPlatform(button.dataset.client,button.dataset.agencyPlatform));
    document.querySelectorAll("[data-agency-creative-desk]").forEach(button=>button.onclick=()=>creativeDesk(button.dataset.agencyCreativeDesk));
    document.querySelectorAll("[data-agency-service-start]").forEach(button=>button.onclick=()=>startServiceLine(button.dataset.agencyServiceStart));
    document.querySelectorAll("[data-agency-service-work]").forEach(button=>button.onclick=()=>workServiceLine(button.dataset.agencyServiceWork));
    document.querySelectorAll("[data-agency-filter]").forEach(button=>button.onclick=()=>{agencyPinnedTargetId="";S.filter=FILTERS.includes(button.dataset.agencyFilter)?button.dataset.agencyFilter:"attention";S.rosterPage=0;render();});
    document.querySelectorAll("[data-agency-page]").forEach(button=>button.onclick=()=>{agencyPinnedTargetId="";S.rosterPage=Math.max(0,S.rosterPage+(button.dataset.agencyPage==="next"?1:-1));render();});
    document.querySelectorAll("[data-agency-budget]").forEach(button=>button.onclick=()=>adjustClientBudget(button.dataset.client,button.dataset.agencyBudget));
    document.querySelectorAll("[data-agency-open-account]").forEach(button=>button.onclick=()=>openAccount(button.dataset.client,button.dataset.agencyOpenAccount));
    document.querySelectorAll("[data-agency-scale]").forEach(button=>button.onclick=()=>scaleClientBudget(button.dataset.client,button.dataset.agencyScale));
    document.querySelectorAll("[data-agency-restate]").forEach(button=>button.onclick=()=>restateAd(button.dataset.agencyRestate));
    document.querySelectorAll("[data-agency-recast]").forEach(button=>button.onclick=()=>recastAd(button.dataset.agencyRecast));
    document.querySelectorAll("[data-agency-lander]").forEach(button=>button.onclick=()=>setCampaignLander(button.dataset.client,button.dataset.campaign,button.dataset.agencyLander));
    document.querySelectorAll("[data-agency-campaign-pause]").forEach(button=>button.onclick=()=>toggleCampaignPaused(button.dataset.client,button.dataset.agencyCampaignPause));
    document.querySelectorAll("[data-agency-ad-pause]").forEach(button=>button.onclick=()=>toggleAdPaused(button.dataset.client,button.dataset.campaign,button.dataset.adset,button.dataset.agencyAdPause));
    document.querySelectorAll("[data-add-ad]").forEach(button=>button.onclick=()=>addAd(button.dataset.client,button.dataset.campaign,button.dataset.addAd));
    document.querySelectorAll("[data-split-campaign]").forEach(button=>button.onclick=()=>splitCampaign(button.dataset.client,button.dataset.splitCampaign));
    document.querySelectorAll("[data-adset-targeting]").forEach(button=>button.onclick=()=>setAdSetTargeting(button.dataset.client,button.dataset.campaign,button.dataset.adset,button.dataset.adsetTargeting));
    document.querySelectorAll("[data-client-service-sell]").forEach(button=>button.onclick=()=>sellClientService(button.dataset.client,button.dataset.clientServiceSell));
    document.querySelectorAll("[data-client-service-work]").forEach(button=>button.onclick=()=>workClientService(button.dataset.client,button.dataset.clientServiceWork));
    document.querySelectorAll("[data-agency-split-account]").forEach(button=>button.onclick=()=>splitAccount(button.dataset.agencySplitAccount));
    document.querySelectorAll("[data-campaign-share]").forEach(button=>button.onclick=()=>adjustCampaignShare(button.dataset.client,button.dataset.campaign,button.dataset.campaignShare));
    document.querySelectorAll("[data-campaign-facet]").forEach(button=>button.onclick=()=>setCampaignFacet(button.dataset.client,button.dataset.campaign,button.dataset.campaignFacet,button.dataset.value));
    document.querySelectorAll("[data-agency-transform]").forEach(button=>button.onclick=()=>confirmTransform(button.dataset.agencyTransform));
    document.querySelectorAll("[data-agency-split]").forEach(button=>button.onclick=()=>adjustMediaSplit(button.dataset.client,button.dataset.agencySplit,button.dataset.splitDir));
    document.querySelectorAll("[data-agency-strategy]").forEach(button=>button.onclick=()=>setClientStrategy(button.dataset.client,button.dataset.agencyStrategy));
    document.querySelectorAll("[data-agency-hire]").forEach(button=>button.onclick=()=>hire(button.dataset.agencyHire));
    document.querySelectorAll("[data-agency-release]").forEach(button=>button.onclick=()=>releaseStaff(button.dataset.agencyRelease));
    document.querySelectorAll("[data-agency-tech]").forEach(button=>button.onclick=()=>unlock(button.dataset.agencyTech));
    document.querySelectorAll("[data-affiliate-action]").forEach(button=>button.onclick=()=>affiliateAction(button.dataset.funnel,button.dataset.affiliateAction));
    document.querySelectorAll("[data-agency-global]").forEach(button=>button.onclick=()=>{
      const action=button.dataset.agencyGlobal;
      if(action==="delegate")delegateRoutine();else if(action==="lead-desk")leadDesk();else if(action==="affiliate-desk")affiliateDesk();
      else if(action==="pivot")confirmPivot();else if(action==="document")documentAffiliateNetwork();else if(action==="bizdev")developBusiness();else if(action==="capabilities")capabilityScreen();
      else if(action==="tutorial-next"){S.tutorialStep++;render();}
    });
  }

  function leadDesk(){
    if(S.ended)return false;
    if(S.businessModel!=="agency")return affiliateDesk();
    if(S.month===0){
      const model=starterModel(S),founder=S.clients[0],offer=offerOf(founder);show(`<div class="eyebrow">Prospective clients · available after Month 1</div><h2>Keep the founding client first</h2><div class="prose"><p>Month 1 includes one ${esc(typeOf(founder).label)} client selling ${esc(offer.label.toLowerCase())} through ${esc(channelOf(founder).label.toLowerCase())}. Finish Month 1 with at least 50% trust, 48% account health, fewer than 5 service-debt points and no neglected critical incident.</p><p>${esc(model.channelRule)} If the client renews, you can consider additional contracts in Month 2. You cannot accept another contract before completing this first test.</p></div><div class="row"><button class="btn wide" id="closeB">Back to the agency</button></div>`,"structure",{wide:true});
      document.getElementById("closeB").onclick=close;return true;
    }
    const seats=activeClients(S).length,growthSpend=Math.max(0,Number(S.lastOperatingStatement?.categories?.eventsPartnershipsMarketing)||0),growthSupport=Math.min(3,Math.floor(growthSpend/250)),rows=S.prospects.map(lead=>{const t=typeOf(lead),ch=channelOf(lead),offer=offerOf(lead),geo=clientGeography(lead,S),projectedLoad=serviceCost(lead,S)/t.cadence,target=lead.targetStates.includes("US")?"Nationwide U.S.":lead.targetStates.join(", ");
      const leadPlatform=platformOf(lead);
      return `<article class="agency-lead-card"><div class="fam">${esc(t.short)} · ${esc(ch.label)}${leadPlatform?` · ${esc(leadPlatform.short)}`:""}</div><h3>${esc(lead.name)}</h3><p><b>${esc(offer.label)}</b> for ${esc(lead.customer.toLowerCase())}. Client office: ${esc(geo.office.city)}, ${esc(geo.office.stateCode)}. Target market: ${esc(target)}.</p><div class="agency-health"><span><b>Retainer</b> ${safeMoney(lead.fee)} per month</span><span><b>Client media</b> ${safeMoney(lead.mediaBudget)} per month</span><span><b>Expected workload</b> ${projectedLoad.toFixed(1)} focus units per day</span><span><b>Payment timing</b> ${lead.terms} days after invoice</span></div><p>${esc(t.lesson)}</p>${lead.interviewed?`<div class="agency-guide"><b>Intake interview · ${esc(personalityOf(lead).label)}</b><span>${esc(personalityOf(lead).hint)} Having met before signing, the relationship would start warmer.</span></div>`:""}<div class="note">Signing this client costs ${safeMoney(lead.onboarding)} and uses one client seat. Its business and channel mix would apply a ${lead.fit.toFixed(2)}× context-switching workload multiplier.${geo.focusSurcharge?` Geography adds up to ${geo.focusSurcharge} focus to affected work until the relevant operating capability is built.`:" Geography adds no workload surcharge at the current scope."} Client media is neither agency revenue nor agency cost.</div><div class="row"><button class="btn wide" data-agency-lead="interview" data-lead="${esc(lead.id)}" ${(lead.interviewed||S.focusRemaining<1)?"disabled":""}>${lead.interviewed?"Interviewed":"Interview the owner · 1 focus"}</button><button class="btn wide" data-agency-lead="accept" data-lead="${esc(lead.id)}" ${(seats>=AGENCY_MAX_CLIENTS||S.focusRemaining<1||S.cash-lead.onboarding < -S.creditLimit)?"disabled":""}>Accept client · 1 seat + ${safeMoney(lead.onboarding)}</button><button class="btn wide" data-agency-lead="reject" data-lead="${esc(lead.id)}">Decline lead</button></div></article>`;}).join("");
    show(`<div class="eyebrow">Prospective clients · ${seats}/${AGENCY_MAX_CLIENTS} client slots used</div><h2>Choose the clients this agency can serve well</h2><div class="prose"><p>Your next growth target is ${S.targetSeats} managed clients; you currently have ${managedClients(S).length}. A signed client counts only after your team services the account. Repeating familiar verticals and channels reuses playbooks. Expanding into too many unfamiliar areas increases the work required across the roster.</p>${growthSpend?`<p><strong>Effect of business-development spending:</strong> Last month's ${safeMoney(growthSpend)} spending on sales, events and partnerships added up to ${growthSupport} qualified prospective client${growthSupport===1?"":"s"} this month. Agency reputation and unused client capacity still determine the final number available.</p>`:""}</div><div class="agency-lead-grid">${rows||"<div class='note'>No qualified prospective clients remain this month. Declined and expired opportunities do not return on demand. The next monthly close creates a new group based on agency reputation.</div>"}</div><div class="row"><button class="btn wide" id="closeB">Back to the agency</button></div>`,"structure",{wide:true});
    document.getElementById("closeB").onclick=close;document.querySelectorAll("[data-agency-lead]").forEach(button=>button.onclick=()=>{
      const kind=button.dataset.agencyLead;
      if(kind==="accept")acceptProspect(button.dataset.lead);else if(kind==="interview")interviewProspect(button.dataset.lead);else rejectProspect(button.dataset.lead);});return true;
  }

  function affiliateDesk(){
    if(S.ended||S.businessModel!=="affiliate")return false;
    const launchCost=funnelLaunchCost(S);
    show(`<div class="eyebrow">Owned funnels · ${S.affiliate.funnels.length}/8</div><h2>Launch another owned acquisition lane</h2><div class="prose"><p>A new funnel costs ${safeMoney(launchCost)} in positive operating cash to build; the credit line cannot fund this optional expansion. More funnels can reduce dependence on one offer, but each funnel adds creative, measurement, payout and compliance work.</p></div><div class="agency-lead-grid">${AFFILIATE_VERTICALS.map(vertical=>`<article class="agency-lead-card"><h3>${esc(vertical.label)}</h3><p>Base modeled payout efficiency: ${vertical.baseMer.toFixed(2)}×, or ${vertical.baseMer.toFixed(2)} in modeled payout for each $1 of media spend, before fatigue, measurement quality, enforcement pressure and daily variance.</p><button class="btn wide" data-launch-funnel="${esc(vertical.id)}" ${(S.cash<launchCost||S.affiliate.funnels.length>=8)?"disabled":""}>Launch ${esc(vertical.label)} funnel · ${safeMoney(launchCost)} cash</button></article>`).join("")}</div><div class="row"><button class="btn wide" id="closeB">Back to the network</button></div>`,"structure",{wide:true});
    document.getElementById("closeB").onclick=close;document.querySelectorAll("[data-launch-funnel]").forEach(button=>button.onclick=()=>launchFunnel(button.dataset.launchFunnel));return true;
  }

  function confirmTransform(targetId){
    const check=canTransform(targetId,S);if(S.ended||!check.ok)return false;
    const target=check.target,clients=activeClients(S).length,funnels=S.affiliate?.funnels.length||0;
    show(`<div class="eyebrow">Irreversible career decision</div><h2>Become a ${esc(target.label.toLowerCase())}?</h2>
      <div class="prose"><p>${clients?`${clients} client relationship${clients===1?"":"s"} will be handed back.`:funnels?`${funnels} owned funnel${funnels===1?"":"s"} will be wound down.`:"There is no active book to close."} Capabilities the new company cannot practise are surrendered with it.</p>
      <p><b>Carries over:</b> the calendar, ${safeMoney(S.cash-check.cash)} cash after the transition, your staff, systems, reputation, Agency career level ${S.level} and ${safeMoney(S.cumulativeProfit)} of career profit. The 2027 target does not change.</p>
      <p><b>Costs:</b> ${TRANSFORM_POINT_COST} capability points and ${safeMoney(check.cash)}.</p></div>
      <div class="row"><button class="btn wide" id="confirmAgencyTransform">Become a ${esc(target.label.toLowerCase())}</button><button class="btn wide" id="closeB">Stay as we are</button></div>`,"structure",{wide:true});
    document.getElementById("closeB").onclick=close;
    document.getElementById("confirmAgencyTransform").onclick=()=>transformCompany(targetId);return true;
  }
  function confirmPivot(){
    const check=canPivot(S);if(S.ended||!check.ok)return false;
    show(`<div class="eyebrow">Irreversible career decision</div><h2>Transform the agency into an affiliate scaling engine?</h2><div class="prose"><p>This clean month-opening handoff offboards every client before any new retainer is earned or operating choice is charged. The company keeps its calendar, cash, cumulative profit, staff, skills, systems, reputation and historical ledger. From then on, it funds owned media and waits for validated network payouts.</p><p><strong>What changes after the pivot:</strong> Payout delays, clawbacks, creative fatigue, signal degradation, offer concentration and compliance reviews replace client-service risk. Opaque infrastructure increases fragility; documented claims and ownership improve resilience.</p></div><div class="row"><button class="btn wide" id="confirmAgencyPivot">Transform · ${safeMoney(150000)}</button><button class="btn wide" id="closeB">Keep the client agency</button></div>`,"structure",{wide:true});
    document.getElementById("closeB").onclick=close;document.getElementById("confirmAgencyPivot").onclick=()=>pivot();return true;
  }

  function reopenPending(){
    if(!S?.pendingInteraction)return false;
    if(S.pendingInteraction.type==="end-day"){
      const critical=activeClients(S).filter(client=>client.incident?.critical).length,due=activeClients(S).filter(client=>routineDue(client,S)).length;
      show(`<div class="eyebrow">End-of-day check</div><h2>${critical?`${critical} critical incident${critical===1?"":"s"} remain`:`${due} account${due===1?" still needs":"s still need"} attention`}</h2><div class="prose"><p>Unfinished work is allowed, but it becomes visible service debt and can reduce account health and client trust. The career never silently fixes a critical issue when time advances.</p></div><div class="row"><button class="btn wide" id="forceEndAgencyDay">End workday with the risk</button><button class="btn wide" id="closeB">Return to operations</button></div>`,"performance");
      document.getElementById("closeB").onclick=()=>{S.pendingInteraction=null;close();};document.getElementById("forceEndAgencyDay").onclick=()=>{close();runDay({force:true});};return true;
    }
    return false;
  }

  function validate(raw){
    if(!raw||raw.engine!=="agency-career"||![1,2,3,4,5,6,7,8,9,10,11,12,13,AGENCY_MODEL_VERSION].includes(raw.agencyModelVersion))return false;
    const version=raw.agencyModelVersion,isCurrent=version===AGENCY_MODEL_VERSION,hasOperatingLedger=version>=2,hasAgencyOrigin=version>=3,hasCampaignPlan=version>=5,hasCampaignResults=version>=6,hasDoctrines=version>=7,hasBudgetBaseline=version>=8,hasCampaignLayer=version>=9,hasClientServices=version>=10,hasAdSets=version>=11,hasAds=version>=12,hasLevers=version>=13,hasMeasuredQuality=version>=14;
    const validHistoryRow=row=>row&&typeof row==="object"&&[row.day,row.spend,row.value,row.leads,row.index,row.share].every(Number.isFinite)&&
      (row.secondary===null||(typeof row.secondary==="string"&&safeId(row.secondary)))&&typeof row.changed==="boolean"&&
      (row.incident===null||(typeof row.incident==="string"&&safeId(row.incident)));
    if(!validSeed(raw.seedShown)||raw.totalDays!==TOTAL_DAYS||!Number.isInteger(raw.day)||raw.day<1||raw.day>TOTAL_DAYS+1||
      !Number.isInteger(raw.month)||raw.month<0||raw.month>AGENCY_TOTAL_MONTHS||!Number.isInteger(raw.dayInMonth)||raw.dayInMonth<1||raw.dayInMonth>AGENCY_MONTH_DAYS)return false;
    const stateNumbers=[raw.startReserve,raw.cash,raw.creditLimit,raw.cumulativeRevenue,raw.cumulativeCosts,raw.cumulativeProfit,raw.peakProfit,
      raw.spendTotal,raw.mediaSpendTotal,raw.opsCost,raw.monthVariableCosts,raw.monthClientMediaSpend,raw.monthAffiliateSpend,
      raw.monthAffiliateEarned,raw.monthAffiliateCollected,raw.reputation,raw.focusTotal,raw.focusRemaining];
    if(!stateNumbers.every(Number.isFinite)||raw.creditLimit<0||raw.focusTotal<0||raw.focusRemaining<0||raw.focusRemaining>raw.focusTotal||raw.reputation<0||raw.reputation>100)return false;
    if(typeof raw.ended!=="boolean"||![null,"win","target-missed","payroll-default","founding-client-lost","operating-insolvency"].includes(raw.outcome)||
      (raw.ended&&raw.outcome===null)||(!raw.ended&&raw.outcome!==null))return false;
    if(!hasOperatingLedger&&raw.outcome==="operating-insolvency")return false;
    if(!["agency","affiliate"].includes(raw.businessModel)||!Array.isArray(raw.clients)||raw.clients.length>AGENCY_MAX_CLIENTS||
      !Array.isArray(raw.archivedClients)||raw.archivedClients.length>1000||!Array.isArray(raw.prospects)||raw.prospects.length>24)return false;
    if(!Number.isInteger(raw.level)||raw.level<1||raw.level>22||!Number.isInteger(raw.skillPoints)||raw.skillPoints<0||
      !Number.isInteger(raw.targetSeats)||raw.targetSeats<0||raw.targetSeats>AGENCY_MAX_CLIENTS||!Number.isInteger(raw.payrollMisses)||raw.payrollMisses<0||
      !Number.isInteger(raw.rosterPage)||raw.rosterPage<0||!Number.isInteger(raw.tutorialStep)||raw.tutorialStep<0||(hasAgencyOrigin&&raw.tutorialStep>4))return false;
    if(!Array.isArray(raw.eraSeen)||raw.eraSeen.length<1||raw.eraSeen.length>AGENCY_ERAS.length||raw.eraSeen.some(item=>!Number.isInteger(item)||!AGENCY_ERAS.some(era=>era.year===item)))return false;
    if(!raw.staff||Object.keys(STAFF).some(id=>!Number.isInteger(raw.staff[id])||raw.staff[id]<0||raw.staff[id]>100))return false;
    if(!FILTERS.includes(raw.filter)||!Array.isArray(raw.unlocked)||(version<3&&!raw.unlocked.includes("search_foundations"))||raw.unlocked.some(id=>!node(id))||
      !Array.isArray(raw.receivables)||raw.receivables.length>5000)return false;
    if(hasAgencyOrigin){
      const agencyIdentity=raw.agencyIdentity,model=agencyIdentity&&AGENCY_STARTER_MODELS[agencyIdentity.agencyType],hq=agencyIdentity&&hqLocation(agencyIdentity.hqId);
      const forbiddenTechs=model?Object.values(AGENCY_CHANNELS).filter(channel=>!model.allowedChannels.includes(channel.id)).map(channel=>channel.tech):[];
      const modelBlockedTechs=model?.id==="creative_agency"?["search_foundations","landing_systems","commerce_feeds","automation"]:[];
      /* A transformed company legitimately carries an archive from the type it used to be, so
         history cannot gate the current model's channel rules — only live work can. */
      const transformed=raw.telemetry&&raw.telemetry.pivoted===true;
      const modeledClients=transformed?[...raw.clients,...raw.prospects]:[...raw.clients,...raw.prospects,...raw.archivedClients];
      if(!agencyIdentity||!model||hq.id!==agencyIdentity.hqId||sanitizeAgencyName(agencyIdentity.name)!==agencyIdentity.name||
        typeof raw.tutorialEnabled!=="boolean"||model.startingUnlocks.some(id=>!raw.unlocked.includes(id))||
        (model.id==="holding_company"&&raw.businessModel!=="affiliate")||
        [...new Set([...forbiddenTechs,...modelBlockedTechs])].some(id=>raw.unlocked.includes(id))||
        modeledClients.some(client=>!model.allowedChannels.includes(client.channel))||
        (model.id==="holding_company"&&(raw.clients.length>0||raw.prospects.length>0||(!transformed&&raw.archivedClients.length>0)||raw.targetSeats!==0))||
        (raw.businessModel==="affiliate"&&(raw.clients.length>0||raw.prospects.length>0||raw.targetSeats!==0)))return false;
    }
    if(hasCampaignPlan){
      const model=raw.agencyIdentity&&AGENCY_STARTER_MODELS[raw.agencyIdentity.agencyType];
      if(!raw.services||typeof raw.services!=="object"||Array.isArray(raw.services))return false;
      for(const [id,record] of Object.entries(raw.services)){
        const line=AGENCY_SERVICE_LINES[id];
        if(!line||!record||typeof record!=="object"||typeof record.active!=="boolean"||!Number.isInteger(record.startedMonth)||
          record.startedMonth<0||!Number.isFinite(record.momentum)||record.momentum<0||record.momentum>100)return false;
        if(model&&!line.models.includes(model.id))return false;
      }
      if(!Number.isFinite(raw.bizDevPoints)||raw.bizDevPoints<0||raw.bizDevPoints>6)return false;
    }
    if(!raw.telemetry||typeof raw.telemetry!=="object"||!Array.isArray(raw.log)||raw.log.length>180||!Array.isArray(raw.monthlyHistory)||raw.monthlyHistory.length>AGENCY_TOTAL_MONTHS)return false;
    if(raw.businessModel==="affiliate"&&(!raw.affiliate||!Array.isArray(raw.affiliate.funnels)||raw.affiliate.funnels.length>8))return false;
    if(raw.businessModel==="agency"&&raw.affiliate!==null)return false;
    if(raw.pendingInteraction!==null&&(!raw.pendingInteraction||raw.pendingInteraction.type!=="end-day"||!Number.isInteger(raw.pendingInteraction.day)))return false;
    const telemetryNumbers=["daysOperated","accountsOperated","incidentsResolved","incidentsMissed","clientUpdates","clientInsights","clientsAccepted",
      "clientsRejected","clientsChurned","staffHired","staffReleased","techUnlocked","delegated","capacityOverloadDays","growthGatesMet",
      "growthGatesMissed","profitLevels","affiliateShutdowns","clientMediaSpend","clientModeledValue","agencyRevenue","agencyCosts"];
    if(telemetryNumbers.some(key=>!Number.isFinite(raw.telemetry[key])||raw.telemetry[key]<0)||typeof raw.telemetry.pivoted!=="boolean")return false;
    if(hasOperatingLedger){
      const ledgerKeys=Object.keys(emptyMonthCostLedger()),staffDayKeys=Object.keys(emptyStaffDayLedger());
      if(!raw.monthCostLedger||Object.keys(raw.monthCostLedger).length!==ledgerKeys.length||ledgerKeys.some(key=>!Number.isFinite(raw.monthCostLedger[key])||raw.monthCostLedger[key]<0)||
        !raw.monthStaffDays||Object.keys(raw.monthStaffDays).length!==staffDayKeys.length||staffDayKeys.some(key=>!Number.isFinite(raw.monthStaffDays[key])||raw.monthStaffDays[key]<0||raw.monthStaffDays[key]>AGENCY_MONTH_DAYS*100)||
        !Number.isInteger(raw.staffAccruedThrough)||raw.staffAccruedThrough<0||raw.staffAccruedThrough>AGENCY_MONTH_DAYS||
        !Number.isFinite(raw.unpaidOperatingBalance)||raw.unpaidOperatingBalance<0||
        (raw.lastSettlementId!==null&&!safeId(raw.lastSettlementId))||
        ["liquidityWarnings","operatingInsolvencies"].some(key=>!Number.isFinite(raw.telemetry[key])||raw.telemetry[key]<0))return false;
      const expenseKeys=Object.keys(AGENCY_EXPENSE_CATEGORIES);
      const validStatement=statement=>statement&&safeId(statement.settlementId)&&Number.isInteger(statement.month)&&Number.isInteger(statement.year)&&
        statement.categories&&Object.keys(statement.categories).length===expenseKeys.length&&expenseKeys.every(key=>Number.isFinite(statement.categories[key])&&statement.categories[key]>=0)&&
        [statement.recurringTotal,statement.variableTotal,statement.ownedMedia,statement.totalExpense,statement.billsDue,statement.alreadyPaid,
          statement.billsPaid,statement.shortfall,statement.cashAfter,statement.closedDay].every(Number.isFinite)&&
        Math.abs(Object.values(statement.categories).reduce((sum,value)=>sum+value,0)-statement.totalExpense)<.01&&
        Math.abs(statement.billsDue-statement.recurringTotal)<.01&&Math.abs(statement.billsPaid+statement.shortfall-statement.billsDue)<.01&&
        ["paid","credit-used","unpaid"].includes(statement.status)&&Array.isArray(statement.drivers)&&statement.drivers.every(item=>safeAuthoredText(item,180));
      if(raw.lastOperatingStatement!==null&&!validStatement(raw.lastOperatingStatement))return false;
      if((raw.lastOperatingStatement===null)!==(raw.lastSettlementId===null)||
        (raw.lastOperatingStatement&&raw.lastOperatingStatement.settlementId!==raw.lastSettlementId))return false;
      const cause=raw.insolvencyCause,validCause=cause&&safeId(cause.settlementId)&&Number.isInteger(cause.month)&&Number.isInteger(cause.year)&&
        safeId(cause.largestCategory)&&safeAuthoredText(cause.largestCategoryLabel,160)&&
        [cause.billsDue,cause.billsPaid,cause.shortfall,cause.availableLiquidity,cause.largestCategoryAmount].every(Number.isFinite);
      if(cause!==null&&!validCause)return false;
      if(raw.outcome==="operating-insolvency"&&(!validCause||raw.unpaidOperatingBalance<=0||cause.settlementId!==raw.lastSettlementId||
        Math.abs(cause.shortfall-raw.unpaidOperatingBalance)>.01))return false;
      if(raw.outcome!=="operating-insolvency"&&cause!==null)return false;
    }
    const validClient=client=>client&&safeId(client.id)&&safeAuthoredText(client.name,120)&&AGENCY_CLIENT_TYPES[client.typeId]&&
      AGENCY_CHANNELS[client.channel]&&AGENCY_VERTICALS.some(vertical=>vertical.id===client.vertical)&&PERSONALITIES[client.personality]&&
      safeAuthoredText(client.lastAction,160)&&Array.isArray(client.history)&&client.history.length<=200&&
      [client.createdMonth,client.createdDay,client.fee,client.mediaBudget,client.terms,client.trust,client.health,client.performance,
        client.measurement,client.creative,client.serviceDebt,client.nextDue,client.incidentAge,client.insight,client.lastOperatedDay,
        client.contractEndMonth,client.clientMediaSpend,client.clientModeledValue,client.clientReportedValue,client.validatedOutcomes].every(Number.isFinite)&&
      (client.incident===null||(client.incident&&AGENCY_INCIDENTS.some(item=>item.id===client.incident.id)&&typeof client.incident.critical==="boolean"&&
        Number.isFinite(client.incident.openedDay)&&safeAuthoredText(client.incident.label,120)&&safeAuthoredText(client.incident.copy,500)&&safeAuthoredText(client.incident.concept,80)))&&
      (!hasAgencyOrigin||(AGENCY_OFFERS.some(offer=>offer.id===client.offerId&&offer.vertical===client.vertical)&&hqLocation(client.officeId).id===client.officeId&&
        ["local","regional","national"].includes(client.marketScope)&&Array.isArray(client.targetStates)&&client.targetStates.length>=1&&client.targetStates.length<=12&&
        client.targetStates.every(code=>code==="US"||AGENCY_STATE_NAMES[code])&&AGENCY_HQ_LOCATIONS.some(location=>location.timezone===client.accountTimezone)&&
        safeId(client.adConceptId)&&(!isCurrent||AGENCY_AD_CONCEPTS.some(concept=>concept.id===client.adConceptId&&concept.vertical===client.vertical&&concept.offerIds.includes(client.offerId)&&
          (client.channel==="search"||concept.channels.includes(client.channel))&&client.adFormat===adFormatFor(concept,client.channel)))&&
        safeAuthoredText(client.adFormat,80)&&safeAuthoredText(client.adCopy,900)&&Number.isInteger(client.creativeVersion)&&client.creativeVersion>=1&&client.creativeVersion<=999&&
        safeAuthoredText(client.customer,320)&&safeAuthoredText(client.stakes,500)&&Number.isFinite(client.customerValue)&&client.customerValue>0))&&
      (!hasCampaignPlan||((client.platform===null||(typeof client.platform==="string"&&AGENCY_PLATFORMS[client.platform]&&AGENCY_PLATFORMS[client.platform].channel===client.channel))&&
        !!AGENCY_PACING[client.pacing]&&
        (client.secondaryPlatformId===null||(typeof client.secondaryPlatformId==="string"&&AGENCY_PLATFORMS[client.secondaryPlatformId]&&
          AGENCY_PLATFORMS[client.secondaryPlatformId].channel===client.channel&&client.secondaryPlatformId!==client.platform))&&
        Number.isFinite(client.secondaryShare)&&client.secondaryShare>=0&&client.secondaryShare<=50))&&
      (!hasCampaignResults||(Array.isArray(client.campaignHistory)&&client.campaignHistory.length<=10&&
        client.campaignHistory.every(validHistoryRow)&&Number.isFinite(client.planChangedDay)&&client.planChangedDay>=0))&&
      (!hasDoctrines||!!AGENCY_STRATEGIES[client.strategy])&&
      (!hasBudgetBaseline||(Number.isFinite(client.budgetBaseline)&&client.budgetBaseline>0))&&
      (!hasCampaignLayer||(!client.campaigns||(Array.isArray(client.campaigns)&&client.campaigns.length<=MAX_CAMPAIGNS&&
        client.campaigns.every(campaign=>campaign&&safeId(campaign.id)&&safeAuthoredText(campaign.name,80)&&
          Number.isFinite(campaign.share)&&campaign.share>=0&&campaign.share<=100&&
          (campaign.platform===null||(typeof campaign.platform==="string"&&AGENCY_PLATFORMS[campaign.platform]))&&
          !!AGENCY_PACING[campaign.pacing]&&!!AGENCY_STRATEGIES[campaign.strategy]&&Number.isFinite(campaign.creative)&&
          (!hasAdSets||!campaign.adSets||(Array.isArray(campaign.adSets)&&campaign.adSets.length<=MAX_AD_SETS&&
            campaign.adSets.every(set=>set&&safeId(set.id)&&Number.isFinite(set.share)&&set.share>=0&&set.share<=100&&
              (set.targeting===null||AGENCY_TARGETING[set.targeting])&&
              (!hasAds||!set.ads||(Array.isArray(set.ads)&&set.ads.length<=MAX_ADS&&
                set.ads.every(ad=>ad&&safeId(ad.id)&&safeId(ad.adConceptId)&&safeAuthoredText(ad.adFormat,80)&&
                  Number.isFinite(ad.creative)&&ad.creative>=0&&ad.creative<=100))))))))))&&
      (!hasClientServices||(!client.services||(typeof client.services==="object"&&!Array.isArray(client.services)&&
        Object.entries(client.services).every(([id,strength])=>AGENCY_CLIENT_SERVICES[id]&&Number.isFinite(strength)&&strength>=0&&strength<=100))));
    if(!raw.clients.every(client=>validClient(client)&&client.status==="active")||
      !raw.archivedClients.every(client=>validClient(client)&&["churned","offboarded-at-pivot"].includes(client.status))||
      !raw.prospects.every(lead=>validClient(lead)&&lead.status==="prospect"&&[lead.onboarding,lead.fit,lead.expiresMonth].every(Number.isFinite)))return false;
    const liveIds=[...raw.clients,...raw.prospects].map(item=>item.id);if(new Set(liveIds).size!==liveIds.length)return false;
    if(!raw.receivables.every(item=>item&&safeId(item.id)&&["agency","affiliate"].includes(item.kind)&&Number.isFinite(item.amount)&&item.amount>=0&&
      Number.isFinite(item.dueDay)&&(item.kind!=="affiliate"||(Number.isFinite(item.clawbackRisk)&&item.clawbackRisk>=0&&item.clawbackRisk<=1))))return false;
    if(!raw.log.every(item=>item&&safeAuthoredText(item.html)&&safeAuthoredText(item.concept,40)))return false;
    if(raw.businessModel==="affiliate"&&!raw.affiliate.funnels.every(funnel=>funnel&&safeId(funnel.id)&&safeAuthoredText(funnel.name,120)&&AFFILIATE_VERTICALS.some(vertical=>vertical.id===funnel.verticalId)&&
      [funnel.dailyBudget,funnel.fatigue,funnel.signal,funnel.complianceHeat,funnel.pausedDays].every(Number.isFinite)&&
      ["opaque","documented"].includes(raw.affiliate.posture)&&Number.isInteger(raw.affiliate.pivotMonth)))return false;
    return true;
  }

  function migrate(raw){
    const next=copy(raw);if(next.agencyModelVersion===1){
      const ledger=emptyMonthCostLedger();ledger.other=Math.max(0,Number(next.monthVariableCosts)||0);
      const accruedThrough=Math.floor(clamp(next.dayInMonth-1,0,AGENCY_MONTH_DAYS));
      next.agencyModelVersion=2;next.monthCostLedger=ledger;next.lastOperatingStatement=null;next.lastSettlementId=null;
      next.monthStaffDays=Object.fromEntries(Object.keys(STAFF).map(id=>[id,(Number(next.staff[id])||0)*accruedThrough]));next.staffAccruedThrough=accruedThrough;
      next.unpaidOperatingBalance=0;next.insolvencyCause=null;next.telemetry.liquidityWarnings=0;next.telemetry.operatingInsolvencies=0;
    }
    if(next.agencyModelVersion===2){
      next.agencyIdentity={name:"Moonrise Media",hqId:"portland-or",agencyType:"digital_agency"};
      next.tutorialStep=Math.floor(clamp(next.tutorialStep,0,4));next.tutorialEnabled=next.month===0&&next.tutorialStep<4;
      next.clients=next.clients.map(client=>enrichClient(client,next));
      next.archivedClients=next.archivedClients.map(client=>enrichClient(client,next));
      next.prospects=next.prospects.map(client=>enrichClient(client,next));
      next.agencyModelVersion=3;
    }
    if(next.agencyModelVersion===3){
      next.clients=next.clients.map(alignClientCreative);
      next.archivedClients=next.archivedClients.map(alignClientCreative);
      next.prospects=next.prospects.map(alignClientCreative);
      next.agencyModelVersion=4;
    }
    if(next.agencyModelVersion===4){
      /* v4 → v5: campaign-plan fields (platform, pacing), organic service lines and the
         business-development counter. Older clients land on their channel's default platform
         at steady pacing; no service line opens without the player's choice. */
      const withPlan=client=>({...client,platform:AGENCY_PLATFORMS[client.platform]&&AGENCY_PLATFORMS[client.platform].channel===client.channel?
        client.platform:defaultPlatformFor(client.channel),pacing:AGENCY_PACING[client.pacing]?client.pacing:"steady",
        secondaryPlatformId:null,secondaryShare:0});
      next.clients=next.clients.map(withPlan);
      next.archivedClients=next.archivedClients.map(withPlan);
      next.prospects=next.prospects.map(withPlan);
      next.services={};next.bizDevPoints=0;
      next.agencyModelVersion=5;
    }
    if(next.agencyModelVersion===5){
      /* v5 → v6: the campaign results ring and the plan-change marker. Older clients start
         with an empty ring; the next workday writes their first readable row. */
      const withResults=client=>({...client,campaignHistory:[],planChangedDay:0});
      next.clients=next.clients.map(withResults);
      next.archivedClients=next.archivedClients.map(withResults);
      next.prospects=next.prospects.map(withResults);
      next.agencyModelVersion=6;
    }
    if(next.agencyModelVersion===6){
      /* v6 → v7: the buying-doctrine layer. Every existing account starts on the balanced
         doctrine; committing to a style is the player's decision, never the migration's. */
      const withDoctrine=client=>({...client,strategy:AGENCY_STRATEGIES[client.strategy]?client.strategy:"balanced"});
      next.clients=next.clients.map(withDoctrine);
      next.archivedClients=next.archivedClients.map(withDoctrine);
      next.prospects=next.prospects.map(withDoctrine);
      next.agencyModelVersion=7;
    }
    if(next.agencyModelVersion===7){
      /* v7 -> v8: the approved-budget baseline the buyer paces against. */
      const withBaseline=client=>({...client,budgetBaseline:Number(client.budgetBaseline)||Number(client.mediaBudget)||1000});
      next.clients=next.clients.map(withBaseline);
      next.archivedClients=next.archivedClients.map(withBaseline);
      next.prospects=next.prospects.map(withBaseline);
      next.agencyModelVersion=8;
    }
    if(next.agencyModelVersion===8){
      /* v8 -> v9: the campaign layer. Older clients keep their implicit primary campaign, so
         nothing about an existing account changes until the player splits it. */
      const withCampaigns=client=>({...client,campaigns:[]});
      next.clients=next.clients.map(withCampaigns);
      next.archivedClients=next.archivedClients.map(withCampaigns);
      next.prospects=next.prospects.map(withCampaigns);
      next.agencyModelVersion=9;
    }
    if(next.agencyModelVersion===9){
      /* v9 -> v10: services sold to a client. Nobody starts with one. */
      const withServices=client=>({...client,services:{}});
      next.clients=next.clients.map(withServices);
      next.archivedClients=next.archivedClients.map(withServices);
      next.prospects=next.prospects.map(withServices);
      next.agencyModelVersion=10;
    }
    if(next.agencyModelVersion===10){
      /* v10 -> v11: ad sets. Existing campaigns keep their implicit single ad set. */
      const withAdSets=client=>({...client,campaigns:Array.isArray(client.campaigns)?
        client.campaigns.map(campaign=>({...campaign,adSets:Array.isArray(campaign.adSets)?campaign.adSets:[]})):[]});
      next.clients=next.clients.map(withAdSets);
      next.archivedClients=next.archivedClients.map(withAdSets);
      next.prospects=next.prospects.map(withAdSets);
      next.agencyModelVersion=11;
    }
    if(next.agencyModelVersion===11){
      /* v11 -> v12: ads inside ad sets. Existing ad sets keep their implicit single ad. */
      const withAds=client=>({...client,campaigns:Array.isArray(client.campaigns)?client.campaigns.map(campaign=>
        ({...campaign,adSets:Array.isArray(campaign.adSets)?campaign.adSets.map(set=>({...set,ads:Array.isArray(set.ads)?set.ads:[]})):[]})):[]});
      next.clients=next.clients.map(withAds);
      next.archivedClients=next.archivedClients.map(withAds);
      next.prospects=next.prospects.map(withAds);
      next.agencyModelVersion=12;
    }
    if(next.agencyModelVersion===12){
      /* v12 -> v13: pause flags and a landing page per campaign. Nothing starts paused, and
         every existing campaign keeps pointing at the client's own site. */
      const withLevers=client=>({...client,campaigns:Array.isArray(client.campaigns)?client.campaigns.map(campaign=>
        ({...campaign,paused:campaign.paused===true,lander:typeof campaign.lander==="string"?campaign.lander:"client_site",
          adSets:Array.isArray(campaign.adSets)?campaign.adSets.map(set=>({...set,
            ads:Array.isArray(set.ads)?set.ads.map(ad=>({...ad,paused:ad.paused===true})):[]})):[]})):[]});
      next.clients=next.clients.map(withLevers);
      next.archivedClients=next.archivedClients.map(withLevers);
      next.prospects=next.prospects.map(withLevers);
      next.agencyModelVersion=13;
    }
    if(next.agencyModelVersion===13){
      /* v13 -> v14: lead quality became something measured rather than projected, so each client
         carries what it has delivered and what the buyer kept. Existing saves start unmeasured. */
      const withQuality=client=>({...client,
        leadsDelivered:Number(client.leadsDelivered)||0,leadsAccepted:Number(client.leadsAccepted)||0});
      next.clients=next.clients.map(withQuality);
      next.archivedClients=next.archivedClients.map(withQuality);
      next.prospects=next.prospects.map(withQuality);
      next.agencyModelVersion=AGENCY_MODEL_VERSION;
    }
    return next;
  }

  function hydrate(raw){
    if(!validate(raw))return false;const next=migrate(raw);if(!validate(next))return false;
    next.monthClientMediaSpend=Number(next.monthClientMediaSpend)||0;next.monthAffiliateCollected=Number(next.monthAffiliateCollected)||0;
    next.monthCostLedger={...emptyMonthCostLedger(),...next.monthCostLedger};next.unpaidOperatingBalance=Math.max(0,Number(next.unpaidOperatingBalance)||0);
    next.monthStaffDays={...emptyStaffDayLedger(),...next.monthStaffDays};next.staffAccruedThrough=Math.floor(clamp(next.staffAccruedThrough,0,AGENCY_MONTH_DAYS));
    next.lastOperatingStatement=next.lastOperatingStatement&&typeof next.lastOperatingStatement==="object"?next.lastOperatingStatement:null;
    next.lastSettlementId=safeId(next.lastSettlementId)?next.lastSettlementId:null;next.insolvencyCause=next.insolvencyCause&&typeof next.insolvencyCause==="object"?next.insolvencyCause:null;
    next.telemetry.liquidityWarnings=Math.max(0,Number(next.telemetry.liquidityWarnings)||0);next.telemetry.operatingInsolvencies=Math.max(0,Number(next.telemetry.operatingInsolvencies)||0);
    next.lastDayReport=next.lastDayReport&&typeof next.lastDayReport==="object"&&Array.isArray(next.lastDayReport.rows)?next.lastDayReport:null;
    next.services=next.services&&typeof next.services==="object"&&!Array.isArray(next.services)?next.services:{};
    next.bizDevPoints=Math.max(0,Math.min(6,Number(next.bizDevPoints)||0));
    next.filter=FILTERS.includes(next.filter)?next.filter:"attention";next.rosterPage=Math.max(0,Math.floor(next.rosterPage||0));
    next.pendingInteraction=next.pendingInteraction&&typeof next.pendingInteraction==="object"?next.pendingInteraction:null;
    next.log=next.log.slice(0,180);next.monthlyHistory=next.monthlyHistory.slice(-AGENCY_TOTAL_MONTHS);S=next;return S;
  }

  function exportState(){return S&&S.engine==="agency-career"?copy({...S,log:S.log.slice(0,180)}):null;}
  function debrief(){
    const brand=identity(S),won=S.outcome==="win",model=S.businessModel==="agency"?brand.model.label:(brand.agencyType==="holding_company"?brand.model.label:"affiliate scaling engine"),seats=S.businessModel==="agency"?activeClients(S).length:S.affiliate?.funnels.length||0;
    const best=S.monthlyHistory.slice().sort((a,b)=>(b.profit||0)-(a.profit||0))[0];
    const reachedAudit=S.month>=AGENCY_TOTAL_MONTHS,insolvent=S.outcome==="operating-insolvency",cause=S.insolvencyCause;
    const trainingAward=typeof TrainingProgress!=="undefined"?TrainingProgress.completeRun({success:won,outcome:S.outcome||"career-ended",state:S,
      facts:{monthsCompleted:S.month,careerProfit:Math.round(S.cumulativeProfit),cash:Math.round(S.cash),businessModel:S.businessModel}}):null;
    const title=won?"Career target cleared":insolvent?"The agency ran out of operating liquidity":reachedAudit?"The decade ended short of the gate":"The agency closed before 2027";
    const outcomeCopy=won?"The company reached 2027 with the required profit and liquidity.":insolvent?
      "The company could not cover its monthly operating obligations after using all available company cash and credit. The run ends at the unpaid close; positive invoices or campaign results cannot keep an insolvent business open.":
      S.outcome==="payroll-default"?"A legacy save reached its previous payroll-default condition before the final audit.":S.outcome==="founding-client-lost"?
      "The founding relationship ended during Month 1. Restart the career and protect its service cadence, trust, health, and critical queue.":"The company reached the final audit, but the profit and liquidity gates were not both clear.";
    const insolvencyMarkup=insolvent&&cause?`<div class="agency-insolvency-debrief"><b>Operating bills left unpaid: ${safeMoney(cause.shortfall)}</b>
      <span>${safeMoney(cause.billsDue)} was due. Cash and available credit paid ${safeMoney(cause.billsPaid)} before the line was exhausted.</span>
      <small>Largest recurring obligation: ${esc(cause.largestCategoryLabel)} · ${safeMoney(cause.largestCategoryAmount)}. Settlement: ${esc(cause.settlementId)}.</small></div>`:"";
    return `<div class="eyebrow">${esc(brand.name)} · ${esc(brand.hq.city)}, ${esc(brand.hq.stateCode)} · ${reachedAudit?"2027 audit":`${year(S)} exit review`}</div><h2 class="${won?"pos":"neg"}">${title}</h2>
      <div class="verdict"><b>${safeMoney(S.cumulativeProfit)} cumulative operating profit</b><span>${safeMoney(AGENCY_PROFIT_TARGET)} target · ${safeMoney(S.cash)} ending cash · ${esc(model)} · ${seats} ${S.businessModel==="agency"?"client seats":"owned funnels"}</span></div>
      ${insolvencyMarkup}<div class="prose"><p>Client media spend was never counted as agency revenue. Each month itemizes founder and employee compensation, employer benefits, equipment, infrastructure, software, insurance and professional services, facilities, company marketing, operating actions and — after an affiliate pivot — company-funded media.</p>
      ${best?`<p><strong>Best month:</strong> ${safeMoney(best.profit)} operating profit in ${best.year}.</p>`:""}<p>${outcomeCopy}</p></div>
      ${typeof TrainingProgress!=="undefined"?TrainingProgress.awardMarkup(trainingAward):""}<div class="row"><button class="btn wide" id="saveCareerEnd">Save final checkpoint</button><button class="btn wide" id="trainingProgress">Training progress</button><button class="btn wide" id="debriefMenu">Main menu</button><button class="btn wide" id="closeB">Review the ledger</button></div>`;
  }

  function afterDebriefRendered(){const save=document.getElementById("saveCareerEnd"),training=document.getElementById("trainingProgress"),menu=document.getElementById("debriefMenu"),back=document.getElementById("closeB");if(save)save.onclick=()=>saveGame("career-end",false);if(training)training.onclick=()=>TrainingProgress.open({returnTo:"debrief"});if(menu)menu.onclick=mainMenu;if(back)back.onclick=close;}
  return Object.freeze({fresh:initialState,runDay,render,operate,clientConversation,delegateRoutine,acceptProspect,rejectProspect,
    generateProspects,hire,releaseStaff,unlock,canUnlock,canPivot,pivot,affiliateAction,launchFunnel,leadDesk,affiliateDesk,
    capabilityScreen,ledgerSummary,seatsAllowedNow,desiredSeatsForMonth,ledgerEntries,accountsOf,openableAccountPlatforms,canOpenAccount,openAccount,trueLeadQuality,observedLeadQuality,leadQualityLine,conversionValueBand,rollConversionValue,toggleCampaignPaused,toggleAdPaused,landerOptions,canSetLander,setCampaignLander,restateAd,recastAd,scaleClientBudget,adsOf,canAddAd,addAd,adSetsOf,targetingOptions,canSplitCampaign,splitCampaign,setAdSetTargeting,clientServicesOf,canSellService,sellClientService,workClientService,campaignsOf,canSplitAccount,splitAccount,adjustCampaignShare,setCampaignFacet,canTransform,transformCompany,transformTargets,transformCashCost,setClientPacing,switchClientPlatform,adjustClientBudget,budgetBounds,canSetBudget,adjustMediaSplit,mediaSplit,setClientStrategy,strategyOf,strategyAvailable,strategyEconomics,applyCreativeDirection,creativeDesk,developBusiness,interviewProspect,
    startServiceLine,workServiceLine,canStartServiceLine,serviceLinesForModel,activeServiceLines,serviceLineBilling,
    platformsForChannel,platformOf,pacingOf,platformFitM,
    validate,hydrate,export:exportState,debrief,reopenPending,capacity,breadth,serviceCost,desiredSeatsForMonth,activeClients,
    monthlyOperatingCost,monthlyOperatingStatement,cashRunway,liquidityStatus,capabilityInvestment,capabilityMonthlyCosts,continuityCapacity,openingProfile:agencyOpeningProfile,
    identity,starterModel,hqLocation,offerOf,adConceptOf,clientGeography,playerContext,workspaceModel,setDashboardView,setCompanyView,resetPresentation,revealWorkspaceTarget,activateGuidedRecommendation,setTutorialEnabled,
    totalDays:TOTAL_DAYS,maxClients:AGENCY_MAX_CLIENTS,profitTarget:AGENCY_PROFIT_TARGET,modelVersion:AGENCY_MODEL_VERSION,staff:STAFF,afterDebriefRendered});
})();

function freshAgencyCareer(){RUN_DIRTY=false;S=AgencyCareer.fresh();return S;}
function runDayAgencyCareer(){return AgencyCareer.runDay();}
function renderAgencyCareer(){return AgencyCareer.render();}
function agencyLeadDesk(){return AgencyCareer.leadDesk();}
