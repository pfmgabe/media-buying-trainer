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
    service:{label:"Service account",costM:1,match:["quality","auction"],concept:"performance"},
    audit:{label:"Audit measurement",costM:1.15,match:["tracking","policy"],concept:"measurement"},
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
  function roll(...parts){return keyedRandom(SEED,"agency-career",...parts);}
  function year(state=S){return 2017+Math.floor(Math.min(119,Math.max(0,state.month))/12);}
  function monthOfYear(state=S){return (Math.max(0,state.month)%12)+1;}
  function monthName(state=S){return `${year(state)} · month ${monthOfYear(state)}/12`;}
  function activeClients(state=S){return state.clients.filter(client=>client.status==="active");}
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
    return Math.min(AGENCY_MAX_CLIENTS,30+(m-12)*2);
  }

  function unlockedChannelFamilies(state=S){
    const families=new Set(["intent"]);
    if(hasTech("paid_social",state))families.add("interruption");
    if(hasTech("programmatic",state))families.add("reach");
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
    let cost=Math.ceil(t.work*2*ch.workM*b.multiplier);
    if(hasTech("automation",state)&&client.channel==="search"&&client.health>=65&&!client.incident)cost--;
    if(hasTech("creative_studio",state)&&(ch.family==="interruption"||t.id.includes("commerce")))cost--;
    if(hasTech("measurement",state)&&client.incident?.id==="tracking")cost--;
    if(hasTech("distributed_qa",state)&&!client.incident?.critical)cost--;
    if(hasTech("agentic_ops",state)&&!client.incident?.critical)cost--;
    if(hasTech("automated_creative_pipeline",state)&&(ch.family==="interruption"||t.id.includes("commerce")))cost--;
    return Math.max(1,cost);
  }

  function operationFocusCost(client,action,state=S){
    const spec=ACTIONS[action]||ACTIONS.service;let cost=Math.max(1,Math.ceil(serviceCost(client,state)*spec.costM));
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

  function makeClient(id,typeId,createdMonth,options={}){
    const t=AGENCY_CLIENT_TYPES[typeId]||AGENCY_CLIENT_TYPES.smb_leadgen;
    const matching=AGENCY_VERTICALS.filter(vertical=>vertical.fit.includes(t.id));
    const vertical=options.vertical||matching[Math.floor(roll("vertical",id)*matching.length)]||AGENCY_VERTICALS[0];
    const prefix=AGENCY_NAME_PREFIX[Math.floor(roll("prefix",id)*AGENCY_NAME_PREFIX.length)];
    const suffixes=AGENCY_NAME_SUFFIX[vertical.id]||["Company"];
    const suffix=suffixes[Math.floor(roll("suffix",id)*suffixes.length)];
    const personalities=Object.keys(PERSONALITIES),personality=personalities[Math.floor(roll("personality",id)*personalities.length)];
    const fee=roundTo(t.fee*(.9+roll("fee",id)*.22),50),mediaBudget=roundTo(t.mediaBudget*(.78+roll("media",id)*.5),500);
    return {id,name:options.name||`${prefix} ${suffix}`,typeId:t.id,vertical:vertical.id,channel:options.channel||"search",
      status:"active",createdMonth,createdDay:options.createdDay??1,fee,mediaBudget,terms:t.id.startsWith("enterprise")?30+(roll("terms",id)>.6?15:0):15,
      trust:options.trust??68,health:options.health??70,performance:options.performance??96,measurement:options.measurement??72,
      creative:options.creative??78,serviceDebt:0,nextDue:options.nextDue??1,incident:null,incidentAge:0,
      personality,insight:0,lastAction:"New account",lastOperatedDay:0,contractEndMonth:createdMonth+12,
      clientMediaSpend:0,clientModeledValue:0,clientReportedValue:0,validatedOutcomes:0,history:[]};
  }

  function initialState(){
    const state={engine:"agency-career",agencyModelVersion:AGENCY_MODEL_VERSION,seedShown:SEED,totalDays:TOTAL_DAYS,
      day:1,month:0,dayInMonth:1,ended:false,outcome:null,businessModel:"agency",startReserve:DAILY_BUDGET,
      cash:DAILY_BUDGET,creditLimit:50000,cumulativeRevenue:0,cumulativeCosts:0,cumulativeProfit:0,peakProfit:0,
      spendTotal:0,mediaSpendTotal:0,opsCost:0,monthVariableCosts:0,monthClientMediaSpend:0,monthAffiliateSpend:0,monthAffiliateEarned:0,monthAffiliateCollected:0,
      level:1,skillPoints:1,unlocked:["search_foundations"],staff:{buyer:0,account:0,creative:0,ops:0,analyst:0},
      clients:[],archivedClients:[],prospects:[],receivables:[],affiliate:null,reputation:62,focusTotal:8,focusRemaining:8,
      targetSeats:1,filter:"attention",rosterPage:0,payrollMisses:0,monthCostLedger:emptyMonthCostLedger(),
      monthStaffDays:emptyStaffDayLedger(),staffAccruedThrough:0,
      lastOperatingStatement:null,lastSettlementId:null,unpaidOperatingBalance:0,insolvencyCause:null,
      pendingInteraction:null,monthlyHistory:[],log:[],
      tutorialStep:0,eraSeen:[2017],telemetry:{daysOperated:0,accountsOperated:0,incidentsResolved:0,incidentsMissed:0,
        clientUpdates:0,clientInsights:0,clientsAccepted:0,clientsRejected:0,clientsChurned:0,staffHired:0,staffReleased:0,
        techUnlocked:0,delegated:0,capacityOverloadDays:0,growthGatesMet:0,growthGatesMissed:0,profitLevels:0,pivoted:false,affiliateShutdowns:0,
        liquidityWarnings:0,operatingInsolvencies:0,clientMediaSpend:0,clientModeledValue:0,agencyRevenue:0,agencyCosts:0}};
    state.clients.push(makeClient("client-001","smb_leadgen",0,{name:"Lantern Fox Home Services",nextDue:1}));
    prepareDay(state,true);
    state.log.unshift({concept:"structure",html:"<div><b>January 2017 · the doors open.</b> One small-business lead-generation client, one paid-search practice, eight founder focus units and no safety net beyond the starting reserve.</div>"});
    return state;
  }

  function incidentFor(state,client){
    if(client.incident)return client.incident;
    const era=AGENCY_ERAS.find(item=>item.year===year(state))||AGENCY_ERAS[0];
    let chance=(.012+typeOf(client).risk*.012+(client.serviceDebt>3?.02:0))*(era.flags.enforcement||1);
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
    const cost=operationFocusCost(client,action,state),cashCost=operationCashCost(action,state);
    if(state.focusRemaining<cost||state.cash-cashCost < -state.creditLimit)return false;
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
      client.creative=clamp(client.creative+22+Math.min(14,state.staff.creative*2),0,100);client.health=clamp(client.health+3,0,100);
      addMonthCost(state,"clientService",cashCost);state.cash-=cashCost;state.opsCost+=cashCost;
    }else if(action==="update"){
      const learned=client.insight<3,relationshipLift=Math.min(4,state.staff.account);
      client.insight=Math.min(3,client.insight+1);client.trust=clamp(client.trust+(learned?5:3)+relationshipLift,0,100);
      state.telemetry.clientUpdates++;if(learned)state.telemetry.clientInsights++;
    }
    client.lastAction=`${spec.label} · day ${state.day}`;
    const tutorialAdvanced=state.month===0&&state.tutorialStep<=1&&client.id==="client-001"&&action==="service";
    if(tutorialAdvanced)state.tutorialStep=2;
    state.log.unshift({concept:spec.concept,html:`<div><b>${esc(spec.label)}</b> · ${esc(client.name)} used ${cost} focus unit${cost===1?"":"s"}.${incident.resolved?' <span class="pos">The scoped incident is resolved.</span>':client.incident?' The open incident needs a different response.':""}</div>`});
    markRunDirty();if(options.render!==false){render();if(tutorialAdvanced)focusFirstAssignment();}return {cost,resolved:incident.resolved};
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
    const t=typeOf(client),ch=channelOf(client),b=breadth(state),era=AGENCY_ERAS.find(item=>item.year===year(state))||AGENCY_ERAS[0];
    const due=routineDue(client,state),overload=capacity(state).overload;
    if(due){client.serviceDebt+=1;client.health=clamp(client.health-1.2*overload,0,100);}
    if(client.incident){
      client.incidentAge++;const template=AGENCY_INCIDENTS.find(item=>item.id===client.incident.id);
      const trackingProtection=client.incident.id==="tracking"?(hasTech("measurement",state)?.58:1)*(hasTech("first_party",state)?.78:1):1;
      if(client.incidentAge>1){client.trust=clamp(client.trust+(template?.trust||-3)*.22*trackingProtection,0,100);client.health=clamp(client.health+(template?.health||-2)*.18,0,100);}
      if(client.incidentAge>5)state.telemetry.incidentsMissed++;
    }
    if(client.channel==="social"||client.channel==="shortform"){
      const creativeCoverage=Math.min(.72,state.staff.creative*5/Math.max(1,activeClients(state).length)+
        (hasTech("workstation_fleet",state)?.04:0)+(hasTech("creative_automation",state)?.09:0)+
        (hasTech("automated_creative_pipeline",state)?.18:0)+(hasTech("local_ai_cluster",state)?.08:0));
      client.creative=clamp(client.creative-(era.flags.creativePressure?1.2:.75)*(1-creativeCoverage),0,100);
    }
    const capability=(client.channel==="search"||hasTech(ch.tech,state))?1:.78;
    const volatility=era.flags.volatility||1,noise=1+(roll("client-day",state.day,client.id)-.5)*.2*volatility;
    const serviceM=clamp(1-client.serviceDebt*.025,.55,1),healthM=.72+client.health*.0032;
    const creativeM=(ch.family==="interruption"?.72+client.creative*.0035:1);
    const automationM=era.flags.automationPressure&&client.channel==="search"&&!hasTech("automation",state)?.92:1;
    const landingM=hasTech("landing_systems",state)&&t.id.includes("leadgen")?1.06:1;
    const valueIndex=clamp(100*capability*automationM*landingM*noise*serviceM*healthM*creativeM/b.multiplier,35,135);
    client.performance=clamp(client.performance*.86+valueIndex*.14,30,135);
    const dailySpend=client.mediaBudget/AGENCY_MONTH_DAYS,dailyValue=dailySpend*(.82+client.performance/100*.42);
    const signalM=era.flags.signalPressure&&!hasTech("first_party",state)?.78:1;
    const reportingShare=clamp((.62+client.measurement*.0035)*signalM,0,1);
    client.clientMediaSpend+=dailySpend;client.clientModeledValue+=dailyValue;client.clientReportedValue+=dailyValue*reportingShare;
    client.validatedOutcomes+=dailyValue/(t.id.includes("commerce")?85:160);
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
    const capabilityStack=state.unlocked.filter(id=>!node(id)?.starter).length;
    const capabilityMonthly=capabilityMonthlyCosts(state),newClients=clients.filter(client=>client.createdMonth===state.month).length;
    const categories={
      founderCompensation:roundTo(AGENCY_COST_RULES.founderMonthlyCompensation*factor,10),
      employeeWages:payroll(state),
      employerBenefits:roundTo(payroll(state)*AGENCY_COST_RULES.employerBenefitRate,10),
      infrastructureHosting:roundTo((AGENCY_COST_RULES.infrastructureBase+averageHeadcount*35+seats*28+enterprise*80+funnels*150)*factor+capabilityMonthly.infrastructureHosting,10),
      equipmentReserve:roundTo((people*AGENCY_COST_RULES.equipmentReservePerPerson+(averageByRole.creative+averageByRole.analyst)*35)*factor,10),
      softwareSubscriptions:roundTo((AGENCY_COST_RULES.softwareBase+people*95+seats*50+channels.size*125+capabilityStack*45+funnels*90)*factor+capabilityMonthly.softwareSubscriptions,10),
      insuranceComplianceProfessional:roundTo((AGENCY_COST_RULES.insuranceProfessionalBase+people*85+enterprise*95+commerce*35+
        clients.filter(client=>client.channel==="programmatic").length*75+funnels*60)*(year(state)>=2026?1.12:1)*factor,10),
      facilitiesAdministration:roundTo((AGENCY_COST_RULES.facilitiesAdministrationBase+people*120+seats*14)*factor+capabilityMonthly.facilitiesAdministration,10),
      eventsPartnershipsMarketing:roundTo((AGENCY_COST_RULES.growthMarketingBase+(state.businessModel==="agency"?state.targetSeats*14+newClients*75:300+funnels*90)+channels.size*80)*factor,10)
    };
    const total=Object.values(categories).reduce((sum,value)=>sum+value,0);
    const pipelineProspectBonus=state.businessModel==="agency"?Math.min(3,Math.floor(categories.eventsPartnershipsMarketing/250)):0;
    const peopleLabel=Number.isInteger(people)?String(people):people.toFixed(1);
    const drivers=[`${peopleLabel} average company operator${people===1?"":"s"} including the founder`,
      state.businessModel==="agency"?`${seats} client seat${seats===1?"":"s"}, including ${enterprise} enterprise and ${commerce} commerce`:`${funnels} owned funnel${funnels===1?"":"s"}`,
      `${channels.size} active delivery ${channels.size===1?"lane":"lanes"}`,`${capabilityStack} paid capability stack addition${capabilityStack===1?"":"s"}`,
      capabilityMonthly.total?`${safeMoney(capabilityMonthly.total)} in recurring advanced-system obligations`:"no advanced-system obligations",
      state.businessModel==="agency"?`${safeMoney(categories.eventsPartnershipsMarketing)} growth program can add up to ${pipelineProspectBonus} next-month prospect choice${pipelineProspectBonus===1?"":"s"}`:`owned-funnel growth replaces the client lead desk`,
      `${Math.round((factor-1)*100)}% cumulative era-cost growth`];
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
    const m=state.month,y=year(state),ids=["smb_leadgen"];
    if(m>=2&&(hasTech("commerce_feeds",state)||y>=2020))ids.push("smb_commerce");
    if(m>=5&&hasTech("measurement",state))ids.push("enterprise_leadgen");
    if(m>=8&&hasTech("measurement",state)&&hasTech("commerce_feeds",state))ids.push("enterprise_commerce");
    return ids;
  }

  function prospectChannel(state,typeId,id){
    const options=["search"];
    if(hasTech("paid_social",state))options.push("social");
    if(typeId.includes("commerce")&&hasTech("commerce_feeds",state))options.push("shopping");
    if(hasTech("short_form",state))options.push("shortform");
    if(hasTech("programmatic",state)&&typeId.startsWith("enterprise"))options.push("programmatic");
    return options[Math.floor(roll("prospect-channel",id)*options.length)];
  }

  function growthProspectBonus(state=S,organicNeed=0){
    const spend=Math.max(0,Number(state.lastOperatingStatement?.categories?.eventsPartnershipsMarketing)||0);
    const supported=Math.min(3,Math.floor(spend/250));
    return Math.max(0,Math.min(supported,Math.ceil(Math.max(0,organicNeed)*.5)));
  }

  function generateProspects(state=S,count=null){
    if(state.businessModel!=="agency"||state.ended||state.month===0)return [];
    const gap=Math.max(0,state.targetSeats-activeClients(state).length),baseNeed=count??Math.min(12,gap+2);
    const organicNeed=Math.max(1,Math.round(baseNeed*clamp(.65+state.reputation*.005,.65,1.15)));
    const need=count??Math.min(18,organicNeed+growthProspectBonus(state,organicNeed));
    const made=[];
    for(let k=0;k<need;k++){
      const seq=state.telemetry.clientsAccepted+state.telemetry.clientsRejected+state.prospects.length+k+1;
      const id=`lead-${state.month+1}-${seq}`,types=eligibleTypes(state);
      const typeId=types[Math.floor(roll("prospect-type",id)*types.length)],channel=prospectChannel(state,typeId,id);
      const base=makeClient(`candidate-${id}`,typeId,state.month,{channel});
      const reputationFit=clamp(.78+state.reputation*.004,.78,1.18);
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
    if(year(state)<item.year)return {ok:false,reason:`Available in ${item.year}`};
    if(item.level&&state.level<item.level)return {ok:false,reason:`Requires Agency career level ${item.level}`};
    if(item.requires.some(req=>!hasTech(req,state)))return {ok:false,reason:`Requires ${item.requires.map(req=>node(req)?.label||req).join(" + ")}`};
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
    const totalCost=statement.totalExpense,profit=economics.revenue-totalCost;
    state.cumulativeRevenue+=economics.revenue;state.cumulativeCosts+=totalCost;state.cumulativeProfit+=profit;
    state.spendTotal=state.cumulativeCosts;state.telemetry.agencyRevenue+=economics.revenue;state.telemetry.agencyCosts+=totalCost;
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
    state.monthlyHistory.push({month:state.month,year:year(state),seats:activeClients(state).length,revenue:economics.revenue,
      costs:totalCost,profit,cash:state.cash,retainers:economics.retainers,bonuses:economics.bonuses,credits:economics.credits,
      payroll:statement.categories.employeeWages,clientMediaSpend:state.monthClientMediaSpend,...historyCostFields(state,statement,settlement)});
    lines.push(`<b>Month close</b> · agency revenue ${safeMoney(economics.revenue)} · agency costs ${safeMoney(totalCost)} · operating profit <span class="${profit>=0?"pos":"neg"}">${safeMoney(profit)}</span>. The statement includes ${safeMoney(statement.recurringTotal)} in monthly obligations and ${safeMoney(statement.variableTotal)} in operating costs paid as choices were made. Client media spend stayed outside every agency total.`);
  }

  function closeAffiliateMonth(state,lines){
    const statement=monthlyOperatingStatement(state),recognizedRevenue=state.monthAffiliateCollected||0;
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
    state.dayInMonth=1;state.targetSeats=desiredSeatsForMonth(state.month+1);
    state.monthVariableCosts=0;state.monthCostLedger=emptyMonthCostLedger();state.monthStaffDays=emptyStaffDayLedger();state.staffAccruedThrough=0;
    state.monthClientMediaSpend=0;state.monthAffiliateSpend=0;state.monthAffiliateEarned=0;state.monthAffiliateCollected=0;
    if(state.businessModel==="agency"){
      state.prospects=state.prospects.filter(lead=>lead.expiresMonth>=state.month);
      generateProspects(state);
      const seats=managedClients(state).length;
      if(seats>=state.targetSeats){state.reputation=clamp(state.reputation+1,0,100);lines.push(`<b class="pos">Growth gate covered</b> · ${seats}/${state.targetSeats} active client seats.`);}
      else lines.push(`<b class="amb">Growth gate open</b> · ${seats}/${state.targetSeats} active client seats. The lead desk has choices; no prospect is accepted automatically.`);
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
    if(!options.force&&state.businessModel==="agency"){
      const critical=activeClients(state).filter(client=>client.incident?.critical),due=activeClients(state).filter(client=>routineDue(client,state));
      if((critical.length||(state.month===0&&due.length))&&!state.pendingInteraction){
        state.pendingInteraction={type:"end-day",day:state.day};reopenPending();return false;
      }
    }
    const incidentKeys=new Set(activeClients(state).filter(client=>client.incident).map(client=>`${client.id}:${client.incident.openedDay}`));
    const shutdownsBefore=state.telemetry.affiliateShutdowns,historyBefore=state.monthlyHistory.length;
    state.pendingInteraction=null;const lines=[];collectReceivables(state,lines);
    if(state.businessModel==="agency"){
      delegateRoutine({render:false});const unresolved=unresolvedConsequences(state,lines);
      for(const client of activeClients(state))simulateClientDay(state,client);
      const cap=capacity(state);lines.push(`${activeClients(state).length} client seat${activeClients(state).length===1?"":"s"} · ${unresolved.length} unresolved need${unresolved.length===1?"":"s"} · ${state.focusRemaining}/${state.focusTotal} focus unused · ${pct(cap.utilization*100)} forecast utilization.`);
    }else simulateAffiliateDay(state,lines);
    state.telemetry.daysOperated++;const closingLabel=monthName(state),closingDay=state.dayInMonth;
    accrueStaffThrough(state,state.dayInMonth);
    if(state.dayInMonth>=AGENCY_MONTH_DAYS)closeMonth(state,lines);else state.dayInMonth++;
    state.log.unshift({concept:"day",html:`<div><b>${closingLabel} · workday ${closingDay}</b><br>${lines.join("<br>")}</div>`});
    state.log=state.log.slice(0,180);
    state.day++;if(state.month===0&&state.tutorialStep===3)state.tutorialStep=4;
    if(!state.ended)prepareDay(state);
    if(typeof autoCheckpoint==="function")autoCheckpoint();
    const newIncident=activeClients(state).filter(client=>client.incident&&!incidentKeys.has(`${client.id}:${client.incident.openedDay}`))
      .sort((a,b)=>(b.incident.critical?1:0)-(a.incident.critical?1:0))[0];
    const closedMonth=state.monthlyHistory.length>historyBefore?state.monthlyHistory[state.monthlyHistory.length-1]:null;
    if(state.telemetry.affiliateShutdowns>shutdownsBefore)queueDayFx("review",{name:"An owned funnel entered compliance review"});
    if(newIncident)queueDayFx("clientRisk",{name:`${newIncident.name} · ${newIncident.incident.label}`});
    if(closedMonth&&closedMonth.profit>0)queueDayFx("agencyProfit",{profit:closedMonth.profit});
    render();if(state.ended){pendingDayFx=[];const insolvency=state.outcome==="operating-insolvency",won=state.outcome==="win";
      fireFx(won?"success":"fail",won?
        {kicker:"Career target cleared",value:"2027 EXIT CLEARED",sub:`${safeMoney(state.cumulativeProfit)} cumulative operating profit`}:
        insolvency?{kicker:"Monthly obligations could not clear",value:"OPERATING CASH EXHAUSTED",sub:`${safeMoney(state.unpaidOperatingBalance)} remained unpaid after cash and credit`}:
        {kicker:"Career run complete",value:"TARGET MISSED",sub:`${safeMoney(state.cumulativeProfit)} cumulative operating profit`});
      const html=debrief();if(typeof show==="function"){show(html,"performance",{wide:true});afterDebriefRendered();}}
    else flushDayFx();
    return true;
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
    state.affiliate={pivotMonth:state.month,posture:"opaque",funnels:[{id:"funnel-1",name:"Northstar Intent Funnel",verticalId:"home-intent",
      dailyBudget:2500,fatigue:8,signal:68,complianceHeat:18,pausedDays:0,last:null}],preserved};
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
    state.focusRemaining--;markRunDirty();if(options.render!==false)render();return true;
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
    const id=`funnel-${S.affiliate.funnels.length+1}-${S.month}`;S.cash-=launchCost;addMonthCost(S,"funnelDevelopment",launchCost);S.opsCost+=launchCost;
    S.affiliate.funnels.push({id,name:`${vertical.label} Funnel ${S.affiliate.funnels.length+1}`,verticalId,dailyBudget:2000,fatigue:5,signal:60,
      complianceHeat:12+vertical.compliance*8,pausedDays:0,last:null});
    markRunDirty();if(options.render!==false){close();render();}return true;
  }

  function sortedRoster(state=S){
    const rows=activeClients(state).slice();
    const pinned=state.month===0&&state.tutorialStep>0&&state.tutorialStep<4?rows.find(client=>client.id==="client-001"):null;
    let visible=state.filter==="attention"?rows.filter(client=>routineDue(client,state)||client.incident):
      state.filter==="risk"?rows.filter(client=>client.trust<55||client.health<55||client.serviceDebt>=3||client.incident):rows;
    if(pinned&&!visible.includes(pinned))visible=[pinned,...visible];
    return visible.sort((a,b)=>clientPriority(b,state)-clientPriority(a,state)||a.name.localeCompare(b.name));
  }

  function focusFirstAssignment(){
    if(typeof document==="undefined"||!document.querySelector)return false;const guide=document.querySelector(".agency-first-assignment");if(!guide)return false;
    if(typeof guide.setAttribute==="function")guide.setAttribute("tabindex","-1");if(typeof guide.focus==="function")guide.focus({preventScroll:true});
    if(typeof guide.scrollIntoView==="function")guide.scrollIntoView({block:"start",inline:"nearest"});return true;
  }

  function clientCard(client){
    const t=typeOf(client),ch=channelOf(client),due=routineDue(client,S),risk=client.trust<50||client.health<50||client.incident?.critical;
    const profile=personalityOf(client),cost=operationFocusCost(client,"service",S),incident=client.incident;
    const auditFocus=operationFocusCost(client,"audit",S),refreshFocus=operationFocusCost(client,"refresh",S),updateFocus=operationFocusCost(client,"update",S);
    const auditCash=operationCashCost("audit",S),refreshCash=operationCashCost("refresh",S);
    const insight=client.insight?`<div class="agency-guide"><b>What you have learned · ${client.insight}/3 · ${esc(profile.label)}</b><span>${esc(profile.hint)}</span></div>`:
      `<div class="agency-guide"><b>You do not know this client yet</b><span>The business type offers one clue, not an answer. During a tense moment, send an evidence-based update and watch the reaction. To The Moon will record what you learn.</span></div>`;
    return `<article class="agency-client-card slot${risk?" at-risk":""}" data-client-id="${esc(client.id)}">
      <header><div><div class="fam">${esc(t.short)} · ${esc(ch.label)}</div><h3>${esc(client.name)}</h3></div>
        <span class="agency-chip">${safeMoney(client.fee)} per month</span></header>
      <div class="row"><span class="tag">${esc(AGENCY_VERTICALS.find(v=>v.id===client.vertical)?.label||client.vertical)}</span>
        <span class="tag ${incident?.critical?"flag":""}">${incident?esc(incident.label):due?"Service due":"Stable"}</span>
        <span class="tag">service every ${t.cadence} ${t.cadence===1?"day":"days"}</span></div>
      <div class="agency-health"><span><b>Trust</b> ${pct(client.trust)}</span><span><b>Account health</b> ${pct(client.health)}</span>
        <span><b>Outcome index</b> ${Math.round(client.performance)}</span><span><b>Service debt</b> ${client.serviceDebt.toFixed(1)}</span></div>
      ${incident?`<div class="agency-alert${incident.critical?" is-critical":""}"><b>${incident.critical?"⚠ Critical · ":""}${esc(incident.label)}</b><span>${esc(incident.copy)}</span></div>`:""}
      <details class="card-detail-block" data-disclosure-id="client-${esc(client.id)}-contract"><summary>What this client needs and what the contract pays</summary><div class="card-detail-body">
        <p><b>Client media budget:</b> ${safeMoney(client.mediaBudget)}/month. It measures the client's campaign; it is not agency revenue or cost.</p>
        <p><b>Agency contract:</b> ${safeMoney(client.fee)} per month retainer. Payment is due ${client.terms} days after the invoice. This relationship uses one of ${AGENCY_MAX_CLIENTS} client seats.</p>
        <p><b>Outcome ledger:</b> ${safeMoney(client.clientModeledValue)} modeled client value · ${safeMoney(client.clientReportedValue)} platform-reported value. Customer and outcome data collected by the advertiser improve what can be reconciled; they do not invent another outcome.</p>
        <p><b>Account health:</b> To The Moon's 0–100 operating-health score. Missed service, overload and unresolved incidents lower it; service, tracking audits, creative refreshes and resolved incidents raise it. Low health can reduce fees, trigger early churn and weaken renewal odds.</p>
        <p><b>Outcome index:</b> A smoothed performance score centered near 100. Capability fit, service debt, health, creative readiness, workload breadth and daily variance move it. Higher values increase modeled client value; results above 100 can earn a bonus when measurement is credible.</p>
        <p><b>Service schedule:</b> This account normally needs meaningful work every ${t.cadence} workdays. Servicing it now uses ${cost} focus. ${esc(t.lesson)}</p>
        ${insight}</div></details>
      <div class="agency-actions">
        <button class="btn${S.month===0&&S.tutorialStep===1&&client.id==="client-001"?" tutorial-focus":""}" data-agency-action="service" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<cost||(S.month===0&&S.tutorialStep===0&&client.id==="client-001")?"disabled":""}>🎯 Complete routine service · ${cost} focus</button>
        <button class="btn" data-agency-action="audit" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<auditFocus||S.cash-auditCash < -S.creditLimit?"disabled":""}>🔎 Audit tracking · ${auditFocus} focus + ${safeMoney(auditCash)}</button>
        <button class="btn" data-agency-action="refresh" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<refreshFocus||S.cash-refreshCash < -S.creditLimit?"disabled":""}>🎨 Refresh creative · ${refreshFocus} focus + ${safeMoney(refreshCash)}</button>
        <button class="btn" data-agency-action="update" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<updateFocus?"disabled":""}>💬 Update client · ${updateFocus} focus</button>
      </div>${typeof densityLevel==="function"&&densityLevel()==="guided"?`<div class="note"><b>Choose the layer that needs work:</b> Service improves routine performance and resets the due date. Audit improves measurement. Refresh improves creative readiness. Update builds trust and can reveal how the client makes decisions.</div>`:""}${incident?.id==="stakeholder"?`<div class="agency-actions"><button class="btn" data-client-call="evidence" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with evidence</button><button class="btn" data-client-call="plan" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with a plan</button><button class="btn" data-client-call="assurance" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with safeguards</button><button class="btn" data-client-call="context" data-client="${esc(client.id)}" ${S.ended||S.focusRemaining<1?"disabled":""}>Lead with shared context</button></div>`:""}
    </article>`;
  }

  function funnelCard(funnel){const vertical=AFFILIATE_VERTICALS.find(item=>item.id===funnel.verticalId)||AFFILIATE_VERTICALS[0],last=funnel.last;
    return `<article class="affiliate-funnel-card slot${funnel.complianceHeat>65?" at-risk":""}" data-funnel-id="${esc(funnel.id)}"><header><div><div class="fam">Owned funnel · ${esc(vertical.label)}</div><h3>${esc(funnel.name)}</h3></div><span class="agency-chip">${safeMoney(funnel.dailyBudget)}/day</span></header>
      <div class="agency-health"><span><b>Fatigue</b> ${pct(funnel.fatigue)}</span><span><b>Affiliate signal</b> ${pct(funnel.signal)}</span><span><b>Compliance heat</b> ${pct(funnel.complianceHeat)}</span><span><b>Status</b> ${funnel.pausedDays?`review · ${funnel.pausedDays} ${funnel.pausedDays===1?"day":"days"}`:"active"}</span></div>
      <div class="affiliate-heat"><span>Compliance heat</span><i style="--value:${pct(funnel.complianceHeat)}"></i><b>${pct(funnel.complianceHeat)}</b></div>
      <div class="note">${last?`Last workday: ${safeMoney(last.spend)} in media produced ${safeMoney(last.earned)} in modeled payout · modeled payout efficiency ${last.mer.toFixed(2)}× · expected payout delay ${last.lag} ${last.lag===1?"day":"days"}.`:"No delivery evidence yet."} Signal raises modeled payout efficiency. Compliance heat reduces it and can trigger a 5–12-day review. When a payout reaches its due date, validation can remove 4%–14% as a clawback before cash arrives.</div>
      <div class="agency-actions"><button class="btn" data-affiliate-action="scale-down" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||funnel.dailyBudget<=0?"disabled":""}>Lower daily budget by ${safeMoney(500)} · 1 focus</button><button class="btn" data-affiliate-action="scale-up" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||S.cash<10000||funnel.dailyBudget>=25000?"disabled":""}>Raise daily budget by ${safeMoney(500)} · 1 focus + 1 heat · needs ${safeMoney(10000)} cash</button><button class="btn" data-affiliate-action="refresh" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||S.cash<affiliateRefreshCost(S)||funnel.fatigue<=0?"disabled":""}>🎨 Refresh creative · −${affiliateRefreshLift(S)} fatigue · 1 focus + ${safeMoney(affiliateRefreshCost(S))} cash</button><button class="btn" data-affiliate-action="audit" data-funnel="${esc(funnel.id)}" ${S.ended||S.focusRemaining<1||S.cash<1000||(funnel.signal>=100&&funnel.complianceHeat<=0)?"disabled":""}>🔎 Audit signal · +12 signal and −8 heat · 1 focus + ${safeMoney(1000)} cash</button></div><div class="note">Optional interventions use positive operating cash. The credit line can bridge scheduled delivery and month-close obligations, but it cannot fund these discretionary changes.</div></article>`;}

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
    const metrics={
      clock:["Career clock",S.month>=120?"2027 audit":`${year(S)} · Month ${monthOfYear(S)} · Day ${S.dayInMonth}`,`${S.month}/120 months closed`],
      cash:["Operating cash",safeMoney(S.cash),`${safeMoney(Math.max(0,S.creditLimit+S.cash))} liquidity before the credit-line limit`,S.cash>=0?"pos":"neg"],
      runway:["Cash runway",runwayLabel(runway.cashMonths),runwayCopy,liquidity.id==="healthy"?"pos":liquidity.id==="unpayable"?"neg":"amb"],
      profit:["Career profit",safeMoney(S.cumulativeProfit),`${pct(profitProgress)} of ${safeMoney(AGENCY_PROFIT_TARGET)} victory target`,S.cumulativeProfit>=0?"pos":"neg"],
      seats:[S.businessModel==="agency"?"Active client seats":"Owned funnels",S.businessModel==="agency"?`${seats} / ${AGENCY_MAX_CLIENTS}`:`${S.affiliate.funnels.length} / 8`,S.businessModel==="agency"?`${managed} managed · next growth gate ${S.targetSeats}`:"client retainers retired"],
      focus:["Focus left today",`${S.focusRemaining} / ${S.focusTotal}`,`${pct(cap.utilization*100)} forecast utilization`,cap.utilization>.95?"neg":cap.utilization>.8?"amb":"pos"],
      level:["Agency career level",`${S.level} · ${S.skillPoints} point${S.skillPoints===1?"":"s"}`,"Profit milestones award capability points"],
      reputation:["Agency reputation",pct(S.reputation),"Affects lead volume, fee quality and decision time",S.reputation<40?"neg":S.reputation<60?"amb":"pos"],
      receivable:["Open receivables",safeMoney(receivable),`${S.receivables.length} invoice or payout ${S.receivables.length===1?"batch":"batches"}`],
      queue:["Priority queue",urgent?`${urgent} critical`:due?`${due} due`:"Clear",urgent?"Resolve before ending the workday":due?"Routine service is due":"No account requires immediate work",urgent?"neg":due?"amb":"pos"]
    };
    const groups={today:[metrics.clock,metrics.focus,metrics.queue,metrics.seats],money:[metrics.cash,metrics.runway,metrics.profit,metrics.receivable],
      agency:[metrics.level,metrics.reputation,metrics.seats,metrics.focus]},active=currentDashboardView(),
      statMarkup=([k,v,sub,cls])=>`<div class="agency-stat stat"><div class="k">${k}</div><div class="v ${cls||""}">${v}</div><div class="sub">${sub}</div></div>`,
      tab=(id,label,meta)=>`<button type="button" role="tab" data-agency-hud-view="${id}" aria-selected="${active===id}" aria-controls="agency-hud-${id}" tabindex="${active===id?0:-1}"><b>${label}</b><small>${meta}</small></button>`;
    return `<section class="agency-dashboard" aria-label="Agency status"><nav class="agency-hud-nav" role="tablist" aria-label="Agency status pages">
        ${tab("today","Workday",urgent?`${urgent} urgent`:due?`${due} due`:"Ready")}${tab("money","Cash",liquidity.label)}${tab("agency","Progress",`${S.skillPoints} capability point${S.skillPoints===1?"":"s"}`)}</nav>
      ${Object.entries(groups).map(([id,rows])=>`<div class="agency-hud" id="agency-hud-${id}" data-agency-hud-panel="${id}" role="tabpanel"${active===id?"":" hidden"}>${rows.map(statMarkup).join("")}${id==="money"?`<div class="agency-progress"><span>2027 career-profit gate</span><progress max="100" value="${profitProgress}" aria-label="Career profit progress"></progress><b>${safeMoney(S.cumulativeProfit)} / ${safeMoney(AGENCY_PROFIT_TARGET)}</b><small>Operating profit only. Client media budgets are excluded.</small></div>`:""}</div>`).join("")}
    </section>`;
  }

  function guideMarkup(){
    if(S.month>0||S.tutorialStep>=4)return "";
    if(S.tutorialStep===0)return `<div class="agency-guide agency-first-assignment"><b>Your first assignment</b><span>Keep one client through Month 1. Each workday, decide whether the account needs routine service, tracking, creative work or client communication. Today, the founding client needs routine service.</span><button class="btn" data-agency-tutorial="show-client">Show me the client</button></div>`;
    if(S.tutorialStep===1)return `<div class="agency-guide agency-first-assignment"><b>Complete today's service</b><span>The founding client is due now. Routine service costs focus, improves the account and schedules the next check-in. Use the highlighted button on the client card.</span></div>`;
    if(S.tutorialStep===2)return `<div class="agency-guide agency-first-assignment"><b>Read what changed</b><span>Account health tracks the work. Trust tracks the relationship. Strong campaign results do not automatically protect trust, and a friendly client does not automatically mean the account is healthy.</span><button class="btn" data-agency-tutorial="plan-day">Continue to today's plan</button></div>`;
    return `<div class="agency-guide agency-first-assignment"><b>Finish the workday</b><span>The required service is complete. Use any focus that still supports the client or company, or end the workday to see what changes. To The Moon will introduce month-close bills when that deadline is near.</span></div>`;
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
    const recommendation=critical?`${critical} urgent ${critical===1?(state.businessModel==="agency"?"account needs":"funnel needs"):(state.businessModel==="agency"?"accounts need":"funnels need")} attention.`:due?`${due} ${due===1?"account is":"accounts are"} due for service.`:
      liquidity.id!=="healthy"?`${liquidity.label}. Review the month-close obligations.`:cap.utilization>.95?"The workload forecast is over safe capacity.":
      state.focusRemaining?`${state.focusRemaining} of ${state.focusTotal} focus remains today.`:"Today's focus is spent. End the workday when ready.";
    const target=(critical?(urgentClients.sort((a,b)=>clientPriority(b,state)-clientPriority(a,state))[0]||urgentFunnels[0]):
      due?dueClients.sort((a,b)=>clientPriority(b,state)-clientPriority(a,state))[0]:null);
    return {recommendedView,recommendation,targetId:target?.id||null,views:{
      overview:{label:"Today",meta:state.focusRemaining?`${state.focusRemaining} focus left`:"Ready to close"},
      board:{label:state.businessModel==="agency"?"Client work":"Funnels",meta:critical?`${critical} urgent`:due?`${due} due`:state.businessModel==="agency"?`${clients.length} active`:`${state.affiliate?.funnels.length||0} active`},
      finance:{label:"Finance",meta:liquidity.label},team:{label:"Team",meta:`${pct(cap.utilization*100)} utilized`},
      growth:{label:"Capabilities",meta:`${state.skillPoints} capability point${state.skillPoints===1?"":"s"}`},
      history:{label:"History",meta:history?`${history} entries`:"No entries"}
    }};
  }

  function accountControls(){
    const b=breadth(S),cap=capacity(S),staffCount=Object.values(S.staff).reduce((a,n)=>a+n,0),currentEra=AGENCY_ERAS.find(item=>item.year===year(S))||AGENCY_ERAS[0],costs=monthlyOperatingCost(S);
    const documentUseful=S.affiliate?.posture!=="documented"||S.affiliate?.funnels.some(funnel=>funnel.complianceHeat>0),active=currentCompanyView();
    const tab=(id,label,meta)=>`<button type="button" role="tab" data-agency-company-view="${id}" aria-selected="${active===id}" aria-controls="agency-company-${id}" tabindex="${active===id?0:-1}"><b>${label}</b><small>${meta}</small></button>`;
    const operations=`<section class="agency-panel agency-company-panel" id="agency-company-operations" data-agency-company-panel="operations" role="tabpanel"${active==="operations"?"":" hidden"}><div class="eyebrow">Operations desk</div>
      <div class="agency-era"><b>${esc(currentEra.title)}</b><span>${esc(currentEra.copy)}</span></div>
      <div class="agency-capacity"><b>Workload forecast</b><span>The company normally has ${cap.raw} focus per day.${S.focusTotal<cap.raw?` A continuity disruption reduced today to ${S.focusTotal}.`:""} Current clients are expected to use ${cap.committed.toFixed(1)} · ${pct(cap.utilization*100)} utilization.</span>
        <span>You can manage ${b.verticalCap} verticals and ${b.familyCap} channel families without extra switching cost. Current breadth: ${b.verticals} verticals and ${b.families} families · workload multiplier ×${b.multiplier.toFixed(2)}.</span></div>
      ${S.businessModel==="agency"?`<div class="row"><button class="btn wide" data-agency-global="delegate" ${(S.ended||(!S.staff.buyer&&!S.staff.ops&&!hasTech("agency_os",S)&&!hasTech("distributed_ops",S)&&!hasTech("agentic_ops",S)))?"disabled":""}>🤖 Delegate due routine accounts · uses available focus</button><button class="btn wide" data-agency-global="lead-desk" ${S.ended?"disabled":""}>💼 Lead desk · ${S.month===0?"opens Month 2":S.prospects.length}</button></div><div class="note">Employees, approved distributed operators and guardrailed agent workflows can service due, noncritical accounts in priority order. They use today's shared focus. Critical incidents, client commitments and irreversible changes remain yours.</div>`:
        `<div class="row"><button class="btn wide" data-agency-global="affiliate-desk" ${S.ended?"disabled":""}>🧬 Launch funnel</button><button class="btn wide" data-agency-global="document" ${(S.ended||S.focusRemaining<1||S.cash<3000||!documentUseful)?"disabled":""}>🛡 Document network claims · −18 heat on every funnel · 1 focus + ${safeMoney(3000)} cash</button></div>`}
    </section>`;
    const finance=`<section class="agency-panel agency-company-panel" id="agency-company-finance" data-agency-company-panel="finance" role="tabpanel"${active==="finance"?"":" hidden"}><div class="eyebrow">Finance desk</div>
      <p class="agency-role-brief"><b>What this page answers:</b> Can the company pay this month's obligations, and what is consuming its operating cash?</p>${operatingStatementMarkup()}</section>`;
    const team=`<section class="agency-panel agency-company-panel" id="agency-company-team" data-agency-company-panel="team" role="tabpanel"${active==="team"?"":" hidden"}><div class="eyebrow">Team · ${staffCount} employees + founder</div>
      ${Object.entries(STAFF).map(([id,spec])=>{const severance=roundTo(spec.salary*eraCostFactor(S)*.5,50),equipment=workstationSetupCost(id,S),wage=roundTo(spec.salary*eraCostFactor(S),10);return `<div class="pixelrow"><span><b>${esc(spec.label)}</b><small>${esc(spec.note)}</small></span><b>${S.staff[id]}</b><button class="btn" data-agency-hire="${id}" ${S.ended||S.staff[id]>=100||S.cash-spec.hireCost-equipment < -S.creditLimit?"disabled":""}>Hire · ${safeMoney(spec.hireCost)} recruiting + ${safeMoney(equipment)} setup</button><button class="btn" data-agency-release="${id}" ${S.ended||S.staff[id]<=0||S.cash-severance < -S.creditLimit?"disabled":""}>Release · ${safeMoney(severance)} severance + immediate capacity loss</button><small>${safeMoney(wage)}/month wages before employer taxes and benefits</small></div>`;}).join("")}
      <div class="note">Monthly employee wages ${safeMoney(costs.categories.employeeWages)} + ${safeMoney(costs.categories.employerBenefits)} in employer taxes and benefits. Hiring creates capacity, equipment and facilities costs; an oversized team turns quiet months into a cash problem.</div></section>`;
    return `<section class="agency-company-shell"><header><div><div class="eyebrow">Company</div><strong>Choose what you want to manage.</strong></div></header>
      <nav class="agency-company-tabs" role="tablist" aria-label="Company pages">${tab("operations","Operations",`${pct(cap.utilization*100)} utilized`)}${tab("finance","Finance",`${runwayLabel(cashRunway(S).cashMonths)} runway`)}${tab("team","Team",`${staffCount} employees`)}</nav>
      <div class="agency-command">${operations}${finance}${team}</div></section>`;
  }

  function techMarkup(){
    const pivotCheck=canPivot(S),branches=[...new Set(AGENCY_TECH_NODES.map(item=>item.branch))];
    const nodeMarkup=item=>{const unlocked=hasTech(item.id,S),check=canUnlock(item.id,S),investment=capabilityInvestment(item,S),monthly=roundTo((Number(item.monthly)||0)*eraCostFactor(S),10),stateClass=unlocked?" unlocked":check.ok?" available":" locked";return `<article class="agency-tech-node${stateClass}"><div class="agency-tech-meta"><span class="tag">${esc(item.branch)}</span><span class="tag">${item.year}</span>${item.level?`<span class="tag">level ${item.level}+</span>`:""}<span class="tag">${item.cost} point${item.cost===1?"":"s"}</span></div><b>${esc(item.label)}</b><p>${esc(item.effect)}</p>${item.tradeoff?`<small><b>Tradeoff:</b> ${esc(item.tradeoff)}</small>`:""}${investment||monthly?`<div class="agency-tech-economics">${investment?`<span><b>${safeMoney(investment)}</b><small>one-time setup</small></span>`:""}${monthly?`<span><b>${safeMoney(monthly)}/month</b><small>recurring obligation</small></span>`:""}</div>`:""}<button class="btn wide" data-agency-tech="${esc(item.id)}" ${S.ended||unlocked||!check.ok?"disabled":""}>${unlocked?"✓ Unlocked":check.ok?"Unlock capability":esc(check.reason)}</button></article>`;};
    return `<div class="agency-tech-tree"><header class="agency-tree-head"><div><div class="eyebrow">Capability tree</div><strong>${S.skillPoints} Agency capability point${S.skillPoints===1?"":"s"} available</strong></div><span>Open one branch at a time.</span></header>
      <div class="note"><b>Choose an operating strategy, not a shopping list.</b> Capability points are scarce. Advanced systems also require positive operating cash up front and add recurring obligations to the monthly statement. Setup and monthly amounts below include the current era's cost growth.</div>
      <div class="agency-tech-branches">${branches.map((branch,index)=>{const nodes=AGENCY_TECH_NODES.filter(item=>item.branch===branch),unlocked=nodes.filter(item=>hasTech(item.id,S)).length,id=branch.toLowerCase().replace(/[^a-z0-9]+/g,"-");return `<details class="agency-tech-branch" data-disclosure-id="agency-tech-${id}"${index===0?" open":""}><summary><span><b>${esc(branch)}</b><small>${unlocked} of ${nodes.length} unlocked</small></span><em>${nodes.some(item=>canUnlock(item.id,S).ok&&!hasTech(item.id,S))?"Choice available":"Review branch"}</em></summary><div class="agency-lead-grid">${nodes.map(nodeMarkup).join("")}</div></details>`;}).join("")}</div>
      ${S.businessModel==="agency"?`<details class="agency-panel agency-transformation" data-disclosure-id="agency-transformation"><summary>Optional business-model transformation</summary><div class="agency-transformation-body"><p>The affiliate scaling engine is one-way. Client assets return to clients; agency-wide cash, profit, staff, skills, systems, reputation, and calendar remain. The handoff can happen only at the start of a month, before anybody spends focus or company cash, so earned client fees and monthly costs stay on one clean ledger.</p>
        <div class="row"><span class="tag ${pivotCheck.requirements.year?"ok":"flag"}">2021+</span><span class="tag ${pivotCheck.requirements.level?"ok":"flag"}">level 8+</span><span class="tag ${pivotCheck.requirements.cash?"ok":"flag"}">${safeMoney(350000)} cash</span><span class="tag ${pivotCheck.requirements.engine?"ok":"flag"}">engine tech</span><span class="tag ${pivotCheck.requirements.channels?"ok":"flag"}">2 channel capabilities</span><span class="tag ${pivotCheck.requirements.boundary?"ok":"flag"}">clean month opening</span></div>
        <button class="btn wide" data-agency-global="pivot" ${S.ended||!pivotCheck.ok?"disabled":""}>Transform into affiliate scaling engine · ${safeMoney(150000)}</button></div></details>`:""}</div>`;
  }

  function render(){
    const state=S;if(!state||state.engine!=="agency-career")return false;
    if(typeof updateFlavorChrome==="function")updateFlavorChrome();
    document.getElementById("accountSection").textContent="Agency status";document.getElementById("accountSectionNote").textContent="switch between the workday, cash and career progress";
    document.getElementById("operationsSection").textContent="Today's work";document.getElementById("operationsSectionNote").textContent="service priority accounts, manage the company, then end the day";
    document.getElementById("adSection").textContent=state.businessModel==="agency"?"Client roster":"Owned funnel network";
    document.getElementById("adSectionNote").textContent=state.businessModel==="agency"?"priority cards shown first · one relationship equals one seat":"payout lag, fatigue, signal, cash and compliance";
    document.getElementById("runSummary").textContent=`Agency Career · ${state.businessModel==="agency"?"client services":"affiliate scaling engine"}`;
    document.getElementById("seedLbl").textContent=`Scenario ${state.seedShown}`;
    document.getElementById("strip").innerHTML=hud();document.getElementById("accountBox").innerHTML=accountControls();document.getElementById("pipeBox").innerHTML=techMarkup();
    const runBtn=document.getElementById("runBtn");runBtn.disabled=state.ended;runBtn.setAttribute("aria-label","End agency workday");
    const runText=runBtn.querySelector("span"),runLens=document.getElementById("runLens");if(runText)runText.textContent="End workday";if(runLens)runLens.textContent="Apply today's choices and advance 1 workday";
    document.getElementById("asksRow").style.display="";document.getElementById("asksLabel").textContent="Focus left today:";document.getElementById("asksLeft").textContent=state.focusRemaining;
    const binBtn=document.getElementById("binBtn");binBtn.style.display="";binBtn.disabled=state.ended;binBtn.className=`btn wide${state.prospects.length?" crisis-count":""}`;
    binBtn.textContent=state.businessModel==="agency"?(state.month===0?"Lead desk · opens Month 2":`Lead desk (${state.prospects.length})`):`Funnel desk (${state.affiliate.funnels.length})`;
    document.getElementById("benchSection").textContent="Agency command";document.getElementById("logSection").textContent="Career ledger";
    document.getElementById("log").innerHTML=typeof renderLog==="function"?renderLog(state.log,"<div>Nothing has moved yet.</div>"):state.log.map(item=>item.html).join("");
    if(state.businessModel==="agency"){
      const todayRows=activeClients(state).slice().sort((a,b)=>clientPriority(b,state)-clientPriority(a,state)||a.name.localeCompare(b.name)).slice(0,3);
      let rows=sortedRoster(state);const pinned=agencyPinnedTargetId?activeClients(state).find(client=>client.id===agencyPinnedTargetId):null;
      if(agencyPinnedTargetId&&!pinned)agencyPinnedTargetId="";if(pinned&&!rows.includes(pinned))rows=[pinned,...rows];const pageSize=12,maxPage=Math.max(0,Math.ceil(rows.length/pageSize)-1),page=pinned?0:Math.min(state.rosterPage,maxPage);
      const visible=rows.slice(page*pageSize,(page+1)*pageSize);
      document.getElementById("slots").innerHTML=`${guideMarkup()}<div class="agency-today-scope"><span><b>Today's priority desk</b><small>The three highest-priority relationships are independent of the full-roster filter and page.</small></span><button class="btn" type="button" data-agency-workspace="board">Open all client work</button></div>
        <div class="agency-roster agency-today-roster">${todayRows.length?todayRows.map(clientCard).join(""):`<div class="agency-panel"><b>No active client relationships.</b><p>Open Client work or the lead desk to rebuild the roster.</p></div>`}</div>
        <div class="agency-full-scope"><div class="agency-roster-toolbar"><div class="row">${FILTERS.map(id=>`<button class="btn" data-agency-filter="${id}" ${state.filter===id?"disabled":""}>${id==="attention"?"Needs attention":id==="risk"?"At risk":"All clients"} · ${id==="all"?activeClients(state).length:sortedCount(id,state)}</button>`).join("")}</div><span>Showing ${visible.length} of ${rows.length}</span></div>
        <div class="agency-roster agency-full-roster">${visible.length?visible.map(clientCard).join(""):`<div class="agency-panel"><b>No accounts in this view.</b><p>Change the roster filter or open the lead desk.</p></div>`}</div>
        ${maxPage?`<div class="row"><button class="btn" data-agency-page="prev" ${page<=0?"disabled":""}>← Previous</button><span class="agency-chip">Page ${page+1}/${maxPage+1}</span><button class="btn" data-agency-page="next" ${page>=maxPage?"disabled":""}>Next →</button></div>`:""}</div>`;
    }else{const todayFunnels=state.affiliate.funnels.slice().sort((a,b)=>(Number(!!b.pausedDays)-Number(!!a.pausedDays))||(b.complianceHeat-a.complianceHeat)).slice(0,3);
      document.getElementById("slots").innerHTML=`${guideMarkup()}<div class="agency-today-scope"><span><b>Today's priority desk</b><small>The three highest-risk owned funnels are shown here. Open Funnels for the full network.</small></span><button class="btn" type="button" data-agency-workspace="board">Open all funnels</button></div><div class="agency-roster agency-today-roster">${todayFunnels.map(funnelCard).join("")}</div><div class="agency-full-scope"><div class="agency-roster agency-full-roster">${state.affiliate.funnels.map(funnelCard).join("")}</div></div>`;}
    bindRenderedActions();if(typeof tooltipsEnabled==="function"&&tooltipsEnabled()&&typeof wireLore==="function")wireLore(document);
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
      if(action==="show-client"){S.tutorialStep=1;render();if(typeof Workspace!=="undefined"&&Workspace)Workspace.setView("board",{focus:true});focusFirstAssignment();}
      else if(action==="plan-day"){S.tutorialStep=3;render();if(typeof Workspace!=="undefined"&&Workspace)Workspace.setView("overview",{focus:true});}});
    document.querySelectorAll("[data-agency-action]").forEach(button=>button.onclick=()=>operate(button.dataset.client,button.dataset.agencyAction));
    document.querySelectorAll("[data-client-call]").forEach(button=>button.onclick=()=>clientConversation(button.dataset.client,button.dataset.clientCall));
    document.querySelectorAll("[data-agency-filter]").forEach(button=>button.onclick=()=>{agencyPinnedTargetId="";S.filter=FILTERS.includes(button.dataset.agencyFilter)?button.dataset.agencyFilter:"attention";S.rosterPage=0;render();});
    document.querySelectorAll("[data-agency-page]").forEach(button=>button.onclick=()=>{agencyPinnedTargetId="";S.rosterPage=Math.max(0,S.rosterPage+(button.dataset.agencyPage==="next"?1:-1));render();});
    document.querySelectorAll("[data-agency-hire]").forEach(button=>button.onclick=()=>hire(button.dataset.agencyHire));
    document.querySelectorAll("[data-agency-release]").forEach(button=>button.onclick=()=>releaseStaff(button.dataset.agencyRelease));
    document.querySelectorAll("[data-agency-tech]").forEach(button=>button.onclick=()=>unlock(button.dataset.agencyTech));
    document.querySelectorAll("[data-affiliate-action]").forEach(button=>button.onclick=()=>affiliateAction(button.dataset.funnel,button.dataset.affiliateAction));
    document.querySelectorAll("[data-agency-global]").forEach(button=>button.onclick=()=>{
      const action=button.dataset.agencyGlobal;
      if(action==="delegate")delegateRoutine();else if(action==="lead-desk")leadDesk();else if(action==="affiliate-desk")affiliateDesk();
      else if(action==="pivot")confirmPivot();else if(action==="document")documentAffiliateNetwork();
      else if(action==="tutorial-next"){S.tutorialStep++;render();}
    });
  }

  function leadDesk(){
    if(S.ended)return false;
    if(S.businessModel!=="agency")return affiliateDesk();
    if(S.month===0){
      show(`<div class="eyebrow">Lead desk · opens after Month 1</div><h2>Protect the founding relationship first</h2><div class="prose"><p>The opening stage is deliberately closed-loop: one small-business lead-generation client, one paid-search practice and one month to prove the service rhythm. Finish Month 1 with at least 50% trust, 48% account health, fewer than 5 service-debt points and no neglected critical incident.</p><p>If the client renews, Month 2 opens a choice of additional small-business lead-generation leads. No new contract can bypass this first test.</p></div><div class="row"><button class="btn wide" id="closeB">Back to the agency</button></div>`,"structure",{wide:true});
      document.getElementById("closeB").onclick=close;return true;
    }
    const seats=activeClients(S).length,growthSpend=Math.max(0,Number(S.lastOperatingStatement?.categories?.eventsPartnershipsMarketing)||0),growthSupport=Math.min(3,Math.floor(growthSpend/250)),rows=S.prospects.map(lead=>{const t=typeOf(lead),ch=channelOf(lead),projectedLoad=serviceCost(lead,S)/t.cadence;
      return `<article class="agency-lead-card"><div class="fam">${esc(t.short)} · ${esc(ch.label)}</div><h3>${esc(lead.name)}</h3><div class="agency-health"><span><b>Retainer</b> ${safeMoney(lead.fee)} per month</span><span><b>Client media</b> ${safeMoney(lead.mediaBudget)} per month</span><span><b>Expected workload</b> ${projectedLoad.toFixed(1)} focus units per day</span><span><b>Payment timing</b> ${lead.terms} days after invoice</span></div><p>${esc(t.lesson)}</p><div class="note">Signing this client costs ${safeMoney(lead.onboarding)} and uses one client seat. Its business and channel mix would apply a ${lead.fit.toFixed(2)}× context-switching workload multiplier. Client media is neither agency revenue nor agency cost.</div><div class="row"><button class="btn wide" data-agency-lead="accept" data-lead="${esc(lead.id)}" ${(seats>=AGENCY_MAX_CLIENTS||S.focusRemaining<1||S.cash-lead.onboarding < -S.creditLimit)?"disabled":""}>Accept client · 1 seat + ${safeMoney(lead.onboarding)}</button><button class="btn wide" data-agency-lead="reject" data-lead="${esc(lead.id)}">Decline lead</button></div></article>`;}).join("");
    show(`<div class="eyebrow">Lead desk · ${seats}/${AGENCY_MAX_CLIENTS} client seats</div><h2>Choose the clients this agency can serve well</h2><div class="prose"><p>Your next growth target is ${S.targetSeats} managed clients; you currently have ${managedClients(S).length}. A signed client counts only after your team services the account. Repeating familiar verticals and channels reuses playbooks. Expanding into too many unfamiliar areas increases the work required across the roster.</p>${growthSpend?`<p><strong>Business-development effect:</strong> Last month's ${safeMoney(growthSpend)} events, partnerships and company-marketing program supported up to ${growthSupport} additional qualified lead choice${growthSupport===1?"":"s"} in this month's desk. Reputation and open client capacity still determine the final count.</p>`:""}</div><div class="agency-lead-grid">${rows||"<div class='note'>No qualified leads remain this month. Declined and expired leads do not return on demand. The next monthly close creates a new group based on agency reputation.</div>"}</div><div class="row"><button class="btn wide" id="closeB">Back to the agency</button></div>`,"structure",{wide:true});
    document.getElementById("closeB").onclick=close;document.querySelectorAll("[data-agency-lead]").forEach(button=>button.onclick=()=>button.dataset.agencyLead==="accept"?acceptProspect(button.dataset.lead):rejectProspect(button.dataset.lead));return true;
  }

  function affiliateDesk(){
    if(S.ended||S.businessModel!=="affiliate")return false;
    const launchCost=funnelLaunchCost(S);
    show(`<div class="eyebrow">Owned funnel desk · ${S.affiliate.funnels.length}/8</div><h2>Launch another owned acquisition lane</h2><div class="prose"><p>A new funnel costs ${safeMoney(launchCost)} in positive operating cash to build; the credit line cannot fund this optional expansion. Breadth can diversify offer risk, but each funnel adds creative, measurement, payout and compliance work.</p></div><div class="agency-lead-grid">${AFFILIATE_VERTICALS.map(vertical=>`<article class="agency-lead-card"><h3>${esc(vertical.label)}</h3><p>Base modeled payout efficiency: ${vertical.baseMer.toFixed(2)}×, or ${vertical.baseMer.toFixed(2)} in modeled payout for each $1 of media spend, before fatigue, signal quality, enforcement pressure and daily variance.</p><button class="btn wide" data-launch-funnel="${esc(vertical.id)}" ${(S.cash<launchCost||S.affiliate.funnels.length>=8)?"disabled":""}>Launch ${esc(vertical.label)} funnel · ${safeMoney(launchCost)} cash</button></article>`).join("")}</div><div class="row"><button class="btn wide" id="closeB">Back to the network</button></div>`,"structure",{wide:true});
    document.getElementById("closeB").onclick=close;document.querySelectorAll("[data-launch-funnel]").forEach(button=>button.onclick=()=>launchFunnel(button.dataset.launchFunnel));return true;
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
      show(`<div class="eyebrow">End-of-day check</div><h2>${critical?`${critical} critical incident${critical===1?"":"s"} remain`:`${due} account${due===1?"":"s"} still need attention`}</h2><div class="prose"><p>Unfinished work is allowed, but it becomes visible service debt and can reduce account health and client trust. The career never silently fixes a critical issue when time advances.</p></div><div class="row"><button class="btn wide" id="forceEndAgencyDay">End workday with the risk</button><button class="btn wide" id="closeB">Return to operations</button></div>`,"performance");
      document.getElementById("closeB").onclick=()=>{S.pendingInteraction=null;close();};document.getElementById("forceEndAgencyDay").onclick=()=>{close();runDay({force:true});};return true;
    }
    return false;
  }

  function validate(raw){
    if(!raw||raw.engine!=="agency-career"||![1,AGENCY_MODEL_VERSION].includes(raw.agencyModelVersion))return false;
    const isV2=raw.agencyModelVersion===AGENCY_MODEL_VERSION;
    if(!validSeed(raw.seedShown)||raw.totalDays!==TOTAL_DAYS||!Number.isInteger(raw.day)||raw.day<1||raw.day>TOTAL_DAYS+1||
      !Number.isInteger(raw.month)||raw.month<0||raw.month>AGENCY_TOTAL_MONTHS||!Number.isInteger(raw.dayInMonth)||raw.dayInMonth<1||raw.dayInMonth>AGENCY_MONTH_DAYS)return false;
    const stateNumbers=[raw.startReserve,raw.cash,raw.creditLimit,raw.cumulativeRevenue,raw.cumulativeCosts,raw.cumulativeProfit,raw.peakProfit,
      raw.spendTotal,raw.mediaSpendTotal,raw.opsCost,raw.monthVariableCosts,raw.monthClientMediaSpend,raw.monthAffiliateSpend,
      raw.monthAffiliateEarned,raw.monthAffiliateCollected,raw.reputation,raw.focusTotal,raw.focusRemaining];
    if(!stateNumbers.every(Number.isFinite)||raw.creditLimit<0||raw.focusTotal<0||raw.focusRemaining<0||raw.focusRemaining>raw.focusTotal||raw.reputation<0||raw.reputation>100)return false;
    if(typeof raw.ended!=="boolean"||![null,"win","target-missed","payroll-default","founding-client-lost","operating-insolvency"].includes(raw.outcome)||
      (raw.ended&&raw.outcome===null)||(!raw.ended&&raw.outcome!==null))return false;
    if(!isV2&&raw.outcome==="operating-insolvency")return false;
    if(!["agency","affiliate"].includes(raw.businessModel)||!Array.isArray(raw.clients)||raw.clients.length>AGENCY_MAX_CLIENTS||
      !Array.isArray(raw.archivedClients)||raw.archivedClients.length>1000||!Array.isArray(raw.prospects)||raw.prospects.length>24)return false;
    if(!Number.isInteger(raw.level)||raw.level<1||raw.level>22||!Number.isInteger(raw.skillPoints)||raw.skillPoints<0||
      !Number.isInteger(raw.targetSeats)||raw.targetSeats<0||raw.targetSeats>AGENCY_MAX_CLIENTS||!Number.isInteger(raw.payrollMisses)||raw.payrollMisses<0||
      !Number.isInteger(raw.rosterPage)||raw.rosterPage<0||!Number.isInteger(raw.tutorialStep)||raw.tutorialStep<0)return false;
    if(!Array.isArray(raw.eraSeen)||raw.eraSeen.length<1||raw.eraSeen.length>AGENCY_ERAS.length||raw.eraSeen.some(item=>!Number.isInteger(item)||!AGENCY_ERAS.some(era=>era.year===item)))return false;
    if(!raw.staff||Object.keys(STAFF).some(id=>!Number.isInteger(raw.staff[id])||raw.staff[id]<0||raw.staff[id]>100))return false;
    if(!FILTERS.includes(raw.filter)||!Array.isArray(raw.unlocked)||!raw.unlocked.includes("search_foundations")||raw.unlocked.some(id=>!node(id))||
      !Array.isArray(raw.receivables)||raw.receivables.length>5000)return false;
    if(!raw.telemetry||typeof raw.telemetry!=="object"||!Array.isArray(raw.log)||raw.log.length>180||!Array.isArray(raw.monthlyHistory)||raw.monthlyHistory.length>AGENCY_TOTAL_MONTHS)return false;
    if(raw.businessModel==="affiliate"&&(!raw.affiliate||!Array.isArray(raw.affiliate.funnels)||raw.affiliate.funnels.length>8))return false;
    if(raw.businessModel==="agency"&&raw.affiliate!==null)return false;
    if(raw.pendingInteraction!==null&&(!raw.pendingInteraction||raw.pendingInteraction.type!=="end-day"||!Number.isInteger(raw.pendingInteraction.day)))return false;
    const telemetryNumbers=["daysOperated","accountsOperated","incidentsResolved","incidentsMissed","clientUpdates","clientInsights","clientsAccepted",
      "clientsRejected","clientsChurned","staffHired","staffReleased","techUnlocked","delegated","capacityOverloadDays","growthGatesMet",
      "growthGatesMissed","profitLevels","affiliateShutdowns","clientMediaSpend","clientModeledValue","agencyRevenue","agencyCosts"];
    if(telemetryNumbers.some(key=>!Number.isFinite(raw.telemetry[key])||raw.telemetry[key]<0)||typeof raw.telemetry.pivoted!=="boolean")return false;
    if(isV2){
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
        Number.isFinite(client.incident.openedDay)&&safeAuthoredText(client.incident.label,120)&&safeAuthoredText(client.incident.copy,500)&&safeAuthoredText(client.incident.concept,80)));
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
      next.agencyModelVersion=AGENCY_MODEL_VERSION;next.monthCostLedger=ledger;next.lastOperatingStatement=null;next.lastSettlementId=null;
      next.monthStaffDays=Object.fromEntries(Object.keys(STAFF).map(id=>[id,(Number(next.staff[id])||0)*accruedThrough]));next.staffAccruedThrough=accruedThrough;
      next.unpaidOperatingBalance=0;next.insolvencyCause=null;next.telemetry.liquidityWarnings=0;next.telemetry.operatingInsolvencies=0;
    }
    return next;
  }

  function hydrate(raw){
    if(!validate(raw))return false;const next=migrate(raw);
    next.monthClientMediaSpend=Number(next.monthClientMediaSpend)||0;next.monthAffiliateCollected=Number(next.monthAffiliateCollected)||0;
    next.monthCostLedger={...emptyMonthCostLedger(),...next.monthCostLedger};next.unpaidOperatingBalance=Math.max(0,Number(next.unpaidOperatingBalance)||0);
    next.monthStaffDays={...emptyStaffDayLedger(),...next.monthStaffDays};next.staffAccruedThrough=Math.floor(clamp(next.staffAccruedThrough,0,AGENCY_MONTH_DAYS));
    next.lastOperatingStatement=next.lastOperatingStatement&&typeof next.lastOperatingStatement==="object"?next.lastOperatingStatement:null;
    next.lastSettlementId=safeId(next.lastSettlementId)?next.lastSettlementId:null;next.insolvencyCause=next.insolvencyCause&&typeof next.insolvencyCause==="object"?next.insolvencyCause:null;
    next.telemetry.liquidityWarnings=Math.max(0,Number(next.telemetry.liquidityWarnings)||0);next.telemetry.operatingInsolvencies=Math.max(0,Number(next.telemetry.operatingInsolvencies)||0);
    next.filter=FILTERS.includes(next.filter)?next.filter:"attention";next.rosterPage=Math.max(0,Math.floor(next.rosterPage||0));
    next.pendingInteraction=next.pendingInteraction&&typeof next.pendingInteraction==="object"?next.pendingInteraction:null;
    next.log=next.log.slice(0,180);next.monthlyHistory=next.monthlyHistory.slice(-AGENCY_TOTAL_MONTHS);S=next;return S;
  }

  function exportState(){return S&&S.engine==="agency-career"?copy({...S,log:S.log.slice(0,180)}):null;}
  function debrief(){
    const won=S.outcome==="win",model=S.businessModel==="agency"?"client agency":"affiliate scaling engine",seats=S.businessModel==="agency"?activeClients(S).length:S.affiliate?.funnels.length||0;
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
    return `<div class="eyebrow">Agency Career · ${reachedAudit?"2027 audit":`${year(S)} exit review`}</div><h2 class="${won?"pos":"neg"}">${title}</h2>
      <div class="verdict"><b>${safeMoney(S.cumulativeProfit)} cumulative operating profit</b><span>${safeMoney(AGENCY_PROFIT_TARGET)} target · ${safeMoney(S.cash)} ending cash · ${esc(model)} · ${seats} ${S.businessModel==="agency"?"client seats":"owned funnels"}</span></div>
      ${insolvencyMarkup}<div class="prose"><p>Client media spend was never counted as agency revenue. Each month itemizes founder and employee compensation, employer benefits, equipment, infrastructure, software, insurance and professional services, facilities, company marketing, operating actions and — after an affiliate pivot — company-funded media.</p>
      ${best?`<p><strong>Best month:</strong> ${safeMoney(best.profit)} operating profit in ${best.year}.</p>`:""}<p>${outcomeCopy}</p></div>
      ${typeof TrainingProgress!=="undefined"?TrainingProgress.awardMarkup(trainingAward):""}<div class="row"><button class="btn wide" id="saveCareerEnd">Save final checkpoint</button><button class="btn wide" id="trainingProgress">Training progress</button><button class="btn wide" id="debriefMenu">Main menu</button><button class="btn wide" id="closeB">Review the ledger</button></div>`;
  }

  function afterDebriefRendered(){const save=document.getElementById("saveCareerEnd"),training=document.getElementById("trainingProgress"),menu=document.getElementById("debriefMenu"),back=document.getElementById("closeB");if(save)save.onclick=()=>saveGame("career-end",false);if(training)training.onclick=()=>TrainingProgress.open({returnTo:"debrief"});if(menu)menu.onclick=mainMenu;if(back)back.onclick=close;}
  return Object.freeze({fresh:initialState,runDay,render,operate,clientConversation,delegateRoutine,acceptProspect,rejectProspect,
    generateProspects,hire,releaseStaff,unlock,canUnlock,canPivot,pivot,affiliateAction,launchFunnel,leadDesk,affiliateDesk,
    validate,hydrate,export:exportState,debrief,reopenPending,capacity,breadth,serviceCost,desiredSeatsForMonth,activeClients,
    monthlyOperatingCost,monthlyOperatingStatement,cashRunway,liquidityStatus,capabilityInvestment,capabilityMonthlyCosts,continuityCapacity,workspaceModel,setDashboardView,setCompanyView,resetPresentation,revealWorkspaceTarget,
    totalDays:TOTAL_DAYS,maxClients:AGENCY_MAX_CLIENTS,profitTarget:AGENCY_PROFIT_TARGET,modelVersion:AGENCY_MODEL_VERSION,staff:STAFF,afterDebriefRendered});
})();

function freshAgencyCareer(){RUN_DIRTY=false;S=AgencyCareer.fresh();return S;}
function runDayAgencyCareer(){return AgencyCareer.runDay();}
function renderAgencyCareer(){return AgencyCareer.render();}
function agencyLeadDesk(){return AgencyCareer.leadDesk();}
