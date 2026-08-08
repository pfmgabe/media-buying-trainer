"use strict";
/* ---------------- state ---------------- */
const DAYS=RUN_DAYS, DAILY=DAILY_BUDGET;
const scaledDefault=amount=>Math.max(0,Math.round((amount*(DAILY/20000))/50)*50);
const scaledCost=amount=>scaledDefault(amount);
const SAT_BASE=scaledDefault(6000);
let S;
function fresh(){
  RUN_DIRTY=false;
  if(MODE===6) return freshAgencyCareer();
  if(MODE===5) return freshNightmare();
  if(MODE===0) return freshClassic();
  const pick=[]; const used=new Set();
  /* slot 3 is the trap on purpose: best engagement in the account, worst economics */
  ["utility_a","rendered_b","trap_i"].forEach(id=>{pick.push(id);used.add(id);});
  const brand=LIBRARY.find(c=>c.brandPlay);
  if(modeHas("multiPlatform")){
    const picks=["utility_a","rendered_b","native_f","lifestyle_e"];
    S={day:1, cash:0, revenue:0, attributedRevenue:0, earnedRevenue:0, attributedEarnedRevenue:0,
      spendTotal:0,mediaSpendTotal:0,opsCost:0,costBreakdown:{creative:0,funnel:0,measurement:0,penalties:0},leadsTotal:0,
      reportedLeadsTotal:0, asks:1, seedShown:SEED, unknownRev:0, view:"modeled",knowledgeCredits:0,
      pixel:{status:"healthy",days:0,diagnosed:true},
      slots:PLAT_ORDER.map((p,i)=>{
        const sl=mkSlot(LIBRARY.find(c=>c.id===picks[i]));
        sl.plat=p; sl.budget=scaledDefault(4000); sl.lastBudget=sl.budget;
        sl.offerAtSec=1+Math.floor(rnd()*4); sl.restates=0;
        return sl;}),
      pending:[], requests:[], readyCreative:[], rollHist:[],rng:{event:0,creative:0},
      bin:shuffle(FOUND.slice()).slice(0,4).map(o=>({...o,inspected:false})), log:[],
      queue:shuffle(RECALL.slice()),
      telemetry:{multiplies:0,asks:0,flagsShipped:0,brandKilled:false,brandAsked:false,
                 knee:0,daysAtTarget:0,swaps:0,recallRight:0,recallWrong:0,
                 emptySlotDays:0,requested:0,revisions:0,rejected:0,pendingPanic:0,
                 recasts:0,restates:0,overlapDays:0,rivalHits:0,concentrated:0,
                 pixelBreaks:0,pixelFixes:0,shadowReviews:0,platformMoves:0,landingOptimizations:0}};
    S.dayState=drawDayState(1);
    return;
  }
  S={
    day:1, cash:0, revenue:0, attributedRevenue:0,earnedRevenue:0,attributedEarnedRevenue:0,
    spendTotal:0,mediaSpendTotal:0,opsCost:0,costBreakdown:{creative:0,funnel:0,measurement:0,penalties:0},leadsTotal:0,
    reportedLeadsTotal:0, asks:1, seedShown:SEED, unknownRev:0, view:"modeled",knowledgeCredits:0,
    pixel:{status:"healthy",days:0,diagnosed:true},
    slots:[...pick.map(id=>mkSlot(LIBRARY.find(c=>c.id===id))), mkSlot(brand)],
    pending:[], settledToDate:0, requests:[], readyCreative:[], rollHist:[],rng:{event:0,creative:0},
    log:[], bin:shuffle(FOUND.slice()).slice(0,4).map(o=>({...o,inspected:false})),
    queue:shuffle(RECALL.slice()),
    telemetry:{multiplies:0,asks:0,flagsShipped:0,brandKilled:false,brandAsked:false,
               knee:0,daysAtTarget:0,swaps:0,recallRight:0,recallWrong:0,
               emptySlotDays:0,requested:0,revisions:0,rejected:0,pendingPanic:0,
               pixelBreaks:0,pixelFixes:0,shadowReviews:0,landingOptimizations:0}
  };
  S.slots.slice(0,3).forEach(s=>{s.budget=scaledDefault(4500);s.lastBudget=s.budget;});
  S.slots[3].budget=scaledDefault(1200);
  S.slots[3].lastBudget=S.slots[3].budget;
  S.dayState=drawDayState(1);
}
function mkSlot(c){
  const budget=scaledDefault(c.brandPlay?1200:4500);
  return {c, budget, lastBudget:budget, fatigue:c.brandPlay?0:10, alive:true,
          blocked:0, multiplies:0, revealed:false, last:null, hist:[], restates:0,lpOptimizations:0};
}
function chargeOps(amount,category="creative"){
  const cost=Math.max(0,Number(amount)||0);if(!cost||MODE===0||MODE===5)return false;
  S.opsCost+=cost;S.spendTotal+=cost;
  if(!S.costBreakdown)S.costBreakdown={creative:0,funnel:0,measurement:0,penalties:0};
  S.costBreakdown[category]=(S.costBreakdown[category]||0)+cost;return true;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const money=n=>(n<0?"-$":"$")+Math.abs(Math.round(n)).toLocaleString();
const money2=n=>"$"+n.toFixed(2);
function allocatedBudget(except){
  return S.slots.reduce((total,slot)=>total+(slot!==except&&slot.alive?slot.budget:0),0);
}
function availableFor(slot){return Math.max(0,DAILY-allocatedBudget(slot));}

/* Mode 4's authored pool is a relative, synthetic capacity allowance. At the default
   account size, one pool unit represents $1k of low-friction daily allocation; custom
   budgets scale it with the rest of the simulation. Going beyond the pool raises CPM
   gradually, rather than turning delivery off or changing conversion math. */
function mode4PlatformCapacity(platformId){
  const platform=typeof PLATFORMS!=="undefined"?PLATFORMS[platformId]:null;
  return platform?Math.max(1,scaledDefault((Number(platform.pool)||0)*1000)):Infinity;
}
function mode4CapacityState(platformId,activeAllocation){
  const capacity=mode4PlatformCapacity(platformId);
  const allocation=Math.max(0,Number(activeAllocation)||0);
  const use=Number.isFinite(capacity)&&capacity>0?allocation/capacity:0;
  const over=Math.max(0,use-1);
  return {capacity,allocation,use,over,cpmM:1+0.08*Math.min(2,over)};
}

/* brand-play effect: cheap reach pulls CPM down account-wide */
function brandDiscount(){
  const b=S.slots.find(s=>s.c.brandPlay);
  if(!b||!b.alive||b.budget<=0||b.blocked>0) return 0;
  const fullFunding=Math.max(1,scaledDefault(1200));
  const fundingShare=Math.min(1,b.budget/fullFunding);
  return Math.min(0.15,0.03*b.hist.length)*fundingShare;
}

/* ---------------- one simulated day ---------------- */
function dowFactor(d){            // Mode 2+: weekends are cheaper inventory
  if(!modeHas("settlementLag")) return 1;
  const wd=(Math.max(1,d)-1)%7;    // period 1 = Monday; periods 6–7 are the first weekend
  return (wd>=5)?0.86:1.05;
}
function runDay(){
  if(MODE===6) return runDayAgencyCareer();
  if(MODE===5) return runDayNightmare();
  if(MODE===0) return runDayClassic();
  if(!S||S.day>DAYS)return false;
  const disc=brandDiscount();
  const dow=dowFactor(S.day);
  const dem=(modeHas("multiPlatform"))?demandOn(S.day):1;
  const state=S.dayState, lines=[];
  const pixelShare=S.pixel.status==="degraded"?0.45:1;
  S.slots.forEach((s,i)=>{
    if(s.alive&&s.blocked<=0&&s.lastBudget>0&&s.budget>s.lastBudget*1.6&&scaleRiskRoll(S.day,i)<0.35){
      s.blocked=2; S.telemetry.shadowReviews++;
      queueDayFx("review",{name:`Slot ${i+1} jumped more than 60% in one day`});
      lines.push(`Slot ${i+1} <b class="neg">under review</b> — a one-day budget jump above 60% triggered a two-day delivery hold`);
    }
  });
  // Two slots on one platform can overlap heavily; summed reach is not deduplicated reach.
  const platSpend={}, platCount={};
  if(modeHas("multiPlatform")) S.slots.forEach(s=>{ if(s.alive&&s.budget>0&&s.blocked<=0){
      platSpend[s.plat]=(platSpend[s.plat]||0)+s.budget;
      platCount[s.plat]=(platCount[s.plat]||0)+1; }});
  const totalSpendToday=Object.values(platSpend).reduce((a,b)=>a+b,0)||1;
  let dayRev=0, dayAttributedRev=0, dayEarnedRevenue=0, dayEarnedAttributedRevenue=0,
      daySpend=0, dayLeads=0, dayReportedLeads=0;
  S.slots.forEach((s,i)=>{
    if(s.blocked>0){s.blocked--; lines.push(`Slot ${i+1} <b>blocked</b> — compliance hold (${s.blocked?`${s.blocked} day${s.blocked===1?"":"s"} remain`:"the hold clears after today"})`); s.last=null; return;}
    if(!s.alive||s.budget<=0){s.last=null; return;}
    const c=s.c;
    const format=creativeFormatFor(c);
    const formatFit=formatLaneModifier(format,modeHas("multiPlatform")?s.plat:"google"),formatStyleFit=formatStyleModifier(format,"lead_gen");
    const formatCpm=formatModifier(format,"cpmM"),formatCtr=formatModifier(format,"ctrM"),formatCvr=formatModifier(format,"cvrM"),
      formatQuality=formatModifier(format,"qualityM"),formatVolatility=formatModifier(format,"volatility",.45);
    // saturation: pushing one slot too hard raises CPM
    const thresh=SAT_BASE+scaledDefault(c.satBonus||0)+scaledDefault(format.satBonus||0)+s.multiplies*scaledDefault(2000);
    const over=Math.max(0,(s.budget-thresh)/thresh);
    let cpm=c.cpm*formatCpm/Math.sqrt(formatFit)*(1+0.25*over)*(1-disc)*dow;
    let ctrPlatM=1, cvrPlatM=1, settle=null, hashed=false, laneCapacity=null;
    if(modeHas("multiPlatform")){
      const P=PLATFORMS[s.plat];
      cpm=P.cpm*(c.tierCpmM||1)*formatCpm/Math.sqrt(formatFit)*(1+0.25*over)*(1-disc)*dow;
      cpm*=Math.pow(1+P.infl,S.day-1);                       // auction inflation, compounding
      laneCapacity=mode4CapacityState(s.plat,platSpend[s.plat]||0);
      cpm*=laneCapacity.cpmM;                               // finite lane pool: gentle marginal CPM friction
      const share=(platSpend[s.plat]||0)/totalSpendToday;
      if(share>0.45){ cpm*=1.18; S.telemetry.rivalHits++; }  // a rival piles into your favourite
      if((platCount[s.plat]||0)>1){ cpm*=1.22; S.telemetry.overlapDays++; }  // audience overlap
      ctrPlatM=P.ctrM; cvrPlatM=P.cvrM; settle=P.settle; hashed=!!P.hashed;
      // Offer timing is a declared game lever: each second after the first reduces click-to-lead CVR by 13%.
      const lateP = Math.max(0, (s.offerAtSec-1)) * 0.13;
      cvrPlatM *= (1-lateP);
      s.fatigueRate=P.fatigueM||1;
    }
    cpm*=state.mood.cpmM*dayEffect(state,"cpmM",i);
    // fatigue erodes CTR hard, and lead quality (EPL) mildly — tired creative pulls worse leads
    const f=s.fatigue/100;
    let ctr=c.ctr*formatCtr*Math.sqrt(formatFit)*(1-f*0.72)*ctrPlatM;
    const epl=c.epl*formatQuality*(1-f*0.12);
    // day-to-day noise — deliberately large
    const nz=metric=>1+(keyedRandom(SEED,"modern-delivery",S.day,i,metric)-0.5)*0.36*formatVolatility;
    ctr*=nz("ctr");
    const lpOptimizations=s.lpOptimizations||0;
    const lpctr=Math.min(95,c.lpctr+5*lpOptimizations);
    const cvr=c.cvr*formatCvr*formatFit*formatStyleFit*nz("cvr")*cvrPlatM*dem*(1+0.06*(s.restates||0))*(1+0.08*lpOptimizations)*dayEffect(state,"cvrM",i);  // restates and landing work buy relevance
    const impr=(s.budget/cpm)*1000;
    const clicks=impr*(ctr/100);
    const lpv=clicks*0.93;
    const lpc=lpv*(lpctr/100);
    const leads=clicks*(cvr/100);
    const rev=leads*epl;
    dayEarnedRevenue+=rev;
    const attributionShare=pixelShare*(hashed?0.75:1);
    const attributedRev=rev*attributionShare, reportedLeads=leads*attributionShare;
    s.last={impr,clicks,lpv,lpc,lpctr,leads,reportedLeads,rev,attributedRev,spend:s.budget,cpm,ctr,cvr,epl,
            laneCapacity:laneCapacity?laneCapacity.capacity:null,
            laneCapacityUse:laneCapacity?laneCapacity.use:null,
            laneCapacityCpmM:laneCapacity?laneCapacity.cpmM:1,
            roi:s.budget?(attributedRev-s.budget)/s.budget*100:0,
            actualRoi:s.budget?(rev-s.budget)/s.budget*100:0,
            cpl:reportedLeads?s.budget/reportedLeads:0};
    s.hist.push(s.last.roi);
    daySpend+=s.budget; dayLeads+=leads; dayReportedLeads+=reportedLeads;
    dayEarnedAttributedRevenue+=attributedRev;
    if(modeHas("multiPlatform")){
      const lag=settle||2;                                   // per-platform settlement speed
      S.pending.push({due:S.day+lag,amt:attributedRev});
      if(attributionShare<1) S.pending.push({due:S.day+lag,amt:rev-attributedRev,unknown:true});
    } else if(modeHas("settlementLag")){ SETTLE_SPLIT.forEach(([lag,share])=>{
      S.pending.push({due:S.day+lag,amt:attributedRev*share});
      if(attributionShare<1) S.pending.push({due:S.day+lag,amt:(rev-attributedRev)*share,unknown:true});
    }); }
    else { dayRev+=rev; dayAttributedRev+=attributedRev; S.unknownRev+=rev-attributedRev; }
    s.last.partial=attributionShare<0.999;
    if(!c.brandPlay){
      const fatigueBefore=s.fatigue;
      s.fatigue=Math.min(96,s.fatigue+16*(s.fatigueRate||1)*(c.fatigueM||1)*formatModifier(format,"fatigueM",.55));
      if(fatigueBefore<90&&s.fatigue>=90)queueDayFx("burnout",{name:`Slot ${i+1} · ${c.fam}`});
    }
    lines.push(`Slot ${i+1} <b>${c.fam}</b> — ${money(s.budget)} in, ${money(attributedRev)} attributed`+
      (s.last.partial?` / ${money(rev)} account revenue`:"")+`, ${Math.round(reportedLeads)} reported leads, `+
      `attributed ad ROI <span class="${s.last.roi>=0?"pos":"neg"}">${s.last.roi.toFixed(0)}%</span>`);
  });
  if(modeHas("settlementLag")){
    const due=S.pending.filter(p=>p.due<=S.day);
    dayRev=due.reduce((a,p)=>a+p.amt,0);
    dayAttributedRev=due.filter(p=>!p.unknown).reduce((a,p)=>a+p.amt,0);
    S.unknownRev+=due.filter(p=>p.unknown).reduce((a,p)=>a+p.amt,0);
    S.pending=S.pending.filter(p=>p.due>S.day);
  }
  S.spendTotal+=daySpend;S.mediaSpendTotal+=daySpend;
  S.earnedRevenue+=dayEarnedRevenue;S.attributedEarnedRevenue+=dayEarnedAttributedRevenue;
  S.revenue+=dayRev; S.attributedRevenue+=dayAttributedRev;
  S.leadsTotal+=dayLeads; S.reportedLeadsTotal+=dayReportedLeads;
  if(disc>0) lines.push(`<b>Brand lift</b> — CPM down ${(disc*100).toFixed(0)}% across every slot`);
  if(modeHas("multiPlatform")){
    const top=Math.max(...Object.values(platSpend).map(v=>v/totalSpendToday));
    if(top>0.45) S.telemetry.concentrated++;
    lines.push(`demand index <b>${dem.toFixed(2)}</b> · auction drift day ${S.day}`);
  }
  if(modeHas("creativePipeline")) advancePipeline(lines);
  const earnedRoas=daySpend?dayEarnedRevenue/daySpend:0;
  if(earnedRoas>=5)queueDayFx("jackpot",{profit:dayEarnedRevenue-daySpend,roas:earnedRoas});
  else if(earnedRoas>=2)queueDayFx("profit",{profit:dayEarnedRevenue-daySpend,roas:earnedRoas});
  const roi=S.spendTotal?(S.earnedRevenue-S.spendTotal)/S.spendTotal*100:0;
  if(roi>=ROI_TARGET) S.telemetry.daysAtTarget++;
  addLog(`<div><b>Day ${S.day}</b> · ${state.mood.label} algorithm · ${state.event.title} · `+
    `media spend ${money(daySpend)} · modeled value earned ${money(dayEarnedRevenue)} · `+
    `attributed ${money(dayEarnedAttributedRevenue)} · settled today ${money(dayRev)} · `+
    `cumulative all-in ROI <span class="${roi>=0?"pos":"neg"}">${roi.toFixed(1)}%</span></div>`+
    lines.map(l=>`<div>&nbsp;&nbsp;${l}</div>`).join(""),"day");
  S.slots.forEach(s=>{ if((!s.alive||s.budget<=0)&&!s.c.brandPlay) S.telemetry.emptySlotDays++; });
  S.slots.forEach(s=>{if(s.alive)s.lastBudget=s.budget;});
  if(S.pixel.status==="degraded"){
    S.pixel.days--;
    if(S.pixel.days<=0){S.pixel={status:"healthy",days:0,diagnosed:true};
      addLog("<div><b class='pos'>Pixel recovered</b> — attribution signals are reporting normally again</div>","measurement");}
  }
  const roiNow=S.spendTotal?(S.earnedRevenue-S.spendTotal)/S.spendTotal*100:0;
  S.rollHist.push(roiNow);
  S.day++; S.asks=1;
  if(S.day>DAYS){
    if(typeof autoCheckpoint==="function")autoCheckpoint();
    if(S.pending.length){
      const tail=S.pending.reduce((a,p)=>a+p.amt,0);
      addLog(`<div><b>Period closed</b> — ${money(tail)} remains unsettled. Earned economics stay in the selected window; no future settlement is pulled backward.</div>`,"measurement");
    }
    pendingDayFx=[];render(); debrief(); return;}
  const fatigueBeforeEvent=S.slots.map(s=>s.fatigue), pixelBeforeEvent=S.pixel.status;
  S.dayState=drawDayState(S.day);
  S.slots.forEach((s,i)=>{if(fatigueBeforeEvent[i]<90&&s.fatigue>=90)
    queueDayFx("burnout",{name:`Slot ${i+1} · competitor copied the hook`});});
  if(pixelBeforeEvent!=="degraded"&&S.pixel.status==="degraded")
    queueDayFx("signal",{name:"Ad reporting is missing 55% of outcomes"});
  if(typeof autoCheckpoint==="function")autoCheckpoint();
  if(S.day%3===0 && S.queue.length&&!(typeof tutorialIsActive==="function"&&tutorialIsActive())) recall();
  render();flushDayFx();
}

/* knee-jerk detector: budget change the day after a single-day dip */
function noteBudgetChange(s){
  if(s.lastBudgetDecisionDay===S.day)return;
  s.lastBudgetDecisionDay=S.day;
  if(s.hist.length>=2){
    const prev=s.hist[s.hist.length-2], last=s.hist[s.hist.length-1];
    if(last<prev-20) S.telemetry.knee++;
    if(modeHas("settlementLag") && S.pending.length && last<prev) S.telemetry.pendingPanic++;
  }
}

/* ---------------- creative lab: instant tests early, a real pipeline in Mode 3+ ---------- */
function creativeProductionProfile(format){const system=creativeSystemFor(format);return {system,
  costM:(format.productionCostM||1)*(system.costM||1),daysM:system.daysM||1,
  reviewM:(format.reviewRiskM||1)*(system.reviewM||1)};}
function creativeRequestCost(format){const profile=creativeProductionProfile(format);
  return scaledCost(Math.max(50,Math.round(1200*profile.costM/50)*50));}
function modernFormatFit(format){
  const lanes=modeHas("multiPlatform")?[...new Set(S.slots.filter(slot=>slot.alive).map(slot=>slot.plat))]:["google"];
  const laneFit=lanes.reduce((sum,lane)=>sum+(Number(format.fit&&format.fit[lane])||1),0)/Math.max(1,lanes.length);
  return laneFit*(Number(format.styleFit&&format.styleFit.lead_gen)||1);
}
function formatTendency(value,up="higher",down="lower"){return value>=1.07?up:value<=.93?down:"balanced";}
function creativeCatalogGuideMarkup(){return `<section class="creative-taxonomy-guide" aria-labelledby="creativeCatalogTitle">
  <div><b id="creativeCatalogTitle">How this catalog is organized</b><p>This is not an industry-standard creative taxonomy. The choices mix several real ways of describing an ad: placement or asset format (where it appears or what it is), presentation style (how it looks and sounds), production method (how it is made), and persuasion structure (how it builds its argument). To The Moon puts them into loose workflow families so this screen stays usable. A family changes shared build cost, build time and review pressure. The execution you choose keeps its own fit, response, quality and fatigue behavior.</p></div>
  <ol class="creative-taxonomy-flow">
    <li><span>1</span><b>Workflow family</b><small>A game-only folder for executions with similar production and review needs.</small></li>
    <li><span>2</span><b>Execution type</b><small>The actual choice. Its subtitle says whether it is a format, style, method or persuasion structure.</small></li>
    <li><span>3</span><b>Modeled tendencies</b><small>How To The Moon expects fit, response, lead quality, fatigue and production to differ — not live benchmarks.</small></li>
    <li><span>4</span><b>Rarity</b><small>Common, Epic or Legendary is rolled after the request. Rarity changes the result, not the type of ad.</small></li>
  </ol>
</section>`;}
function creativeWorkflowFamilySummary(system,formats){return `<span class="creative-family-title"><span>${system.mark} ${system.label}</span><em>Workflow family</em></span>
  <small class="creative-family-includes"><b>Includes:</b> ${formats.map(format=>format.label).join(" · ")}</small>
  <small class="creative-family-reason"><b>Why grouped:</b> ${system.groupingReason||system.summary}</small>`;}
function creativeFormatPicker(){
  const tutorialFormat=typeof tutorialRequiredCreativeFormat==="function"?tutorialRequiredCreativeFormat():"";
  const systems=Object.values(CREATIVE_SYSTEMS).filter(system=>system.id!=="search").map(system=>{
    const formats=selectableCreativeFormats().filter(format=>format.system===system.id);
    return {system,formats,score:formats.reduce((sum,format)=>sum+modernFormatFit(format),0)/Math.max(1,formats.length)};
  }).sort((a,b)=>b.score-a.score||a.system.label.localeCompare(b.system.label));
  const platformLabels={google:"Google Display / Demand Gen",meta:"Meta",tiktok:"TikTok",snap:"Snapchat",linkedin:"LinkedIn",ctv:"CTV"};
  const formatCard=format=>{
    const fit=modernFormatFit(format),fitLabel=fit>=1.1?"strong current fit":fit>=.96?"workable current fit":"adapt before use";
    const strongest=Object.entries(format.fit||{}).filter(([lane])=>platformLabels[lane]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([lane])=>platformLabels[lane]).join(" · ");
    return `<article class="creative-format-option">
      <div class="creative-format-heading"><span class="format-option-mark" aria-hidden="true">${format.mark}</span><span><b>${format.label}</b><small>What it is · ${format.kind}</small></span></div>
      <div class="row"><span class="tag">Modeled fit · ${fitLabel}</span><span class="tag">Tradeoff · ${format.tradeoff}</span></div>
      <p>${format.description}</p>
      <div class="creative-format-model-label">Modeled tendencies in To The Moon</div>
      <dl><div><dt>Opening response</dt><dd>${formatTendency(format.ctrM,"faster hook","slower hook")}</dd></div>
        <div><dt>Downstream quality</dt><dd>${formatTendency(format.cvrM*format.qualityM,"stronger","lighter")}</dd></div>
        <div><dt>Fatigue speed</dt><dd>${formatTendency(format.fatigueM,"faster","slower")}</dd></div>
        <div><dt>${modeHas("creativePipeline")?"Build":"Production burden"}</dt><dd>${modeHas("creativePipeline")?`${Math.max(1,Math.ceil(format.productionDays*creativeProductionProfile(format).daysM))}–${Math.max(1,Math.ceil(format.productionDays*creativeProductionProfile(format).daysM)+1)} days`:`Instant in this drill · normally ${Math.max(1,Math.ceil(format.productionDays*creativeProductionProfile(format).daysM))} ${Math.max(1,Math.ceil(format.productionDays*creativeProductionProfile(format).daysM))===1?"day":"days"}`} · ${money(creativeRequestCost(format))}</dd></div></dl>
      <small class="format-lanes">${creativeSystemFor(format).cadence} · Strongest modeled fit: ${strongest||"Placement-dependent"}</small>
      ${format.platformNote?`<div class="note"><b>Placement adaptation:</b> ${format.platformNote}</div>`:""}
      <button class="btn wide" data-format-id="${format.id}">${modeHas("creativePipeline")?"Commission":"Test"} ${format.label}</button>
    </article>`;
  };
  show(`<div class="eyebrow">Creative lab · choose an execution</div><h2>What kind of creative are you building?</h2>
    ${creativeCatalogGuideMarkup()}
    <p class="creative-catalog-order-note"><b>Why one family is open:</b> It has the best average modeled fit for the lanes currently in this account. That is a game hint, not a universal ranking. Open any family to compare its entries.</p>
    <div class="creative-format-groups">${systems.map((group,index)=>{const required=!!tutorialFormat&&group.formats.some(format=>format.id===tutorialFormat);
      return `<details class="creative-format-group" data-format-system="${group.system.id}" ${required||(!tutorialFormat&&index===0)?"open":""}><summary data-format-system="${group.system.id}" ${required?`data-tutorial-format-group="${tutorialFormat}"`:""}>${creativeWorkflowFamilySummary(group.system,group.formats)}</summary><div class="creative-format-grid">${group.formats.map(formatCard).join("")}</div></details>`;}).join("")}</div>
    <div class="row"><button class="btn wide" id="surpriseFormat">Surprise me · execution and rarity both roll</button><button class="btn wide" id="closeB">Back to account</button></div>`,"creative",{wide:true,rosetta:false});
  document.getElementById("closeB").onclick=close;
  document.getElementById("surpriseFormat").onclick=()=>{if(requestCreative()!==false)close();};
  ov.querySelectorAll("button[data-format-id]").forEach(button=>button.onclick=()=>{if(requestCreative(button.dataset.formatId)!==false){close();if(typeof deferTutorialRefresh==="function")deferTutorialRefresh();}});
  if(typeof renderTutorialCoach==="function")renderTutorialCoach();
}
function requestCreative(requestedFormat){
  if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("creative_request",{format:requestedFormat||"surprise"}))return false;
  if(modeHas("creativePipeline")&&S.requests.length>=3){return false;}
  const c=rollCreative(requestedFormat),format=creativeFormatFor(c),profile=creativeProductionProfile(format),cost=creativeRequestCost(format);
  chargeOps(cost,"creative"); S.telemetry.requested++;
  if(!modeHas("creativePipeline")){
    S.readyCreative.push(c);
    addLog(`<div><b>Creative test</b> — <span class="${c.rarityClass}">${c.rarity}</span> ${format.label} · ${c.fam} is ready to swap in. The execution type sets production burden, fit, response and fatigue. Rarity sets the card's possible upside range.</div>`,"creative");
  }else{
    const jitter=Math.floor(stateRoll("creative")*2),days=Math.max(1,Math.ceil(format.productionDays*profile.daysM)+jitter);
    S.requests.push({c,stage:"build",days,reviewRiskM:profile.reviewM,revisionCostM:profile.costM});
    addLog(`<div><b>Creative requested</b> — ${format.label} · ${c.fam}. Cost: ${money(cost)}. Estimated build: ${days} day${days===1?"":"s"}. Rarity appears after approval.</div>`,"creative");
  }
  render();
  if(!modeHas("creativePipeline"))creativeRevealFx(c);
  if(typeof tutorialAfterAction==="function")tutorialAfterAction("creative_request",{format:format.id,creativeId:c.id});
  return c;
}
function advancePipeline(lines){
  S.requests.forEach(r=>{ r.days--; });
  S.requests.slice().forEach(r=>{
    if(r.days>0) return;
    if(r.stage==="build"){ r.stage="review"; r.days=1;
      lines.push(`<b>${r.c.fam}</b> built — into compliance review`); return; }
    if(r.stage==="review"){
      const roll=stateRoll("creative"),risk=Math.max(.65,Math.min(1.75,Number(r.reviewRiskM)||1)),
        rejectP=Math.min(.22,.10*risk),revisionP=Math.min(.35,.22*risk),approveP=1-rejectP-revisionP;
      if(roll<approveP){ r.stage="ready"; S.readyCreative.push(r.c);creativeRevealFx(r.c,true);
        S.requests=S.requests.filter(x=>x!==r);
        lines.push(`<b class="pos">Approved</b> — ${r.c.rarity} ${r.c.fam} is ready to ship`); }
      else if(roll<approveP+revisionP){r.stage="revisions";r.days=1;
        const revisionCost=scaledCost(Math.max(50,Math.round(400*(r.revisionCostM||1)/50)*50));chargeOps(revisionCost,"creative");S.telemetry.revisions++;
        queueDayFx("warning",{name:`${r.c.fam} needs one more pass`});
        lines.push(`<b class="amb">Approved with revisions</b> — ${r.c.fam}, one more day + ${money(revisionCost)}`); }
      else { S.requests=S.requests.filter(x=>x!==r); S.telemetry.rejected++;
        queueDayFx("compliance",{name:`${r.c.fam} was not approved`});
        lines.push(`<b class="neg">Not approved</b> — ${r.c.fam} is dead; the ${money(creativeRequestCost(creativeFormatFor(r.c)))} test cost remains spent`); }
      return; }
    if(r.stage==="revisions"){ r.stage="ready"; S.readyCreative.push(r.c);creativeRevealFx(r.c,true);
      S.requests=S.requests.filter(x=>x!==r);
      lines.push(`<b class="pos">Cleared</b> — ${r.c.rarity} ${r.c.fam} is ready to ship`); }
  });
}
function shipReady(i,slotIdx){
  const c=S.readyCreative[i]; const s=S.slots[slotIdx]; if(!c||!s||s.c.brandPlay) return false;
  if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("creative_swap",{slotIndex:slotIdx,creativeId:c.id}))return false;
  const revived=!s.alive||s.budget<=0;
  if(revived) s.budget=Math.min(scaledDefault(3500),availableFor(s));
  s.c={...c}; s.fatigue=6; s.alive=true; s.multiplies=0; s.revealed=false; s.last=null;
  s.hist=[];s.restates=0;s.lastBudget=s.budget;
  if(modeHas("multiPlatform")) s.offerAtSec=1+Math.floor(stateRoll("creative")*4);
  S.readyCreative.splice(i,1); S.telemetry.swaps++;
  markRunDirty();
  addLog(`<div><b>Shipped</b> ${c.rarity||"Common"} ${creativeFormatFor(c).label} · ${c.fam} into slot ${slotIdx+1}.${revived?` The stopped slot restarted with ${money(s.budget)} in daily allocation.`:" Its existing allocation stayed in place."}</div>`,"creative");
  close(); render();fireFx("swap",{name:c.name||c.fam,slot:slotIdx+1});
  if(typeof tutorialAfterAction==="function")tutorialAfterAction("creative_swap",{slotIndex:slotIdx,creativeId:c.id});return true;
}

/* ---------------- render ---------------- */
let modernHudExpanded=false;
function render(){
  if(MODE===6) return renderAgencyCareer();
  if(MODE===5) return renderNightmare();
  if(MODE===0) return renderClassic();
  updateFlavorChrome();
  const flavor=currentFlavor(),ft=flavor.terms;
  document.getElementById("accountSection").textContent=`Account overview${analogiesEnabled()?` · ${ft.account}`:""}`;
  document.getElementById("accountSectionNote").textContent="money, reporting and total account performance";
  document.getElementById("adSection").textContent=`Active ads${analogiesEnabled()?` · ${flavor.metrics.ad}`:""}`;
  document.getElementById("adSectionNote").textContent=`change budgets, inspect results and manage creative${analogiesEnabled()?` · ${ft.swap}`:""}`;
  const scope=realWorldScope();
  document.getElementById("runSummary").textContent=`${MODE_SCOPE_TITLE[MODE]} · ${scope.channel} · ${DAYS}-day run`;
  document.getElementById("seedLbl").textContent=`Scenario ${S.seedShown}`;
  const modeledView=S.view==="modeled";
  const viewRevenue=modeledView?S.earnedRevenue:S.attributedEarnedRevenue;
  const viewLeads=modeledView?S.leadsTotal:S.reportedLeadsTotal;
  const costBase=modeledView?S.spendTotal:S.mediaSpendTotal;
  const roi=costBase?(viewRevenue-costBase)/costBase*100:0;
  const cpl=viewLeads?S.mediaSpendTotal/viewLeads:0;
  const profit=viewRevenue-costBase;
  const committed=S.slots.reduce((a,s)=>a+(s.alive?s.budget:0),0);
  const unattributedEarned=Math.max(0,S.earnedRevenue-S.attributedEarnedRevenue);
  const hudMetrics=[
    ["Day",Math.min(S.day,DAYS)+" / "+DAYS,""],
    ["Allocated / day",money(committed),money(Math.max(0,DAILY-committed))+" unallocated · daily cap "+money(DAILY),committed>DAILY?"neg":""],
    [modeledView?"Modeled contribution":"Attributed media margin",money(profit),modeledView?"earned value − media and operations":"attributed value − media spend",profit>=0?"pos":"neg"],
    [modeledView?"All-in business ROI (return on investment)":"Attributed media ROI (return on investment)",roi.toFixed(1)+"%",modeledView?`Target: at least ${ROI_TARGET}% after media and operating costs`:`Value credited by the platform after media spend`,roi>=ROI_TARGET?"pos":roi>=ROI_TARGET-15?"amb":"neg"],
    [modeledView?"Modeled media CPL (cost per lead)":"Reported media CPL (cost per lead)",viewLeads?money2(cpl):"—","Media spend per same-window lead · this account's $13–$22 reference range",!viewLeads?"":(cpl<=22?"pos":"neg")],
    [modeledView?"Modeled leads":"Reported leads",Math.round(viewLeads).toLocaleString(),modeledView?"Estimated business leads":"Leads credited by tracking and platform reports"],
    [modeledView?"Modeled value earned":"Attributed value reported",money(viewRevenue),modeledView?"earned in this run":"same-window platform credit"],
    ["Media spend",money(S.mediaSpendTotal),"delivery only"],
    ["Operations cost",money(S.opsCost),"creative, landing, measurement and penalties"],
    ["Settled value",money(S.revenue),"cash-like value received so far"],
    ["Training XP this run",String(S.knowledgeCredits||0),"persistent learning record · never changes campaign economics"]
  ].concat(unattributedEarned>0?[["Unattributed earned value",money(unattributedEarned),"modeled value with no clean ad claim","amb"]]:[])
   .concat(modeHas("multiPlatform")?[
      ["Demand index",demandOn(Math.min(S.day,DAYS)).toFixed(2),"moves on its own"]]:[])
   .concat(modeHas("settlementLag")?[["Unsettled",money(S.pending.reduce((a,p)=>a+p.amt,0)),
      modeHas("multiPlatform")?"lands in 1–3 days":"lands in 2–3 days","amb"],
    ["ROI change, last three days",(S.rollHist.length>=3?
      (S.rollHist[S.rollHist.length-1]-S.rollHist[S.rollHist.length-3]).toFixed(1)+" percentage points":"—"),
      "movement, not level"]]:[]);
  const statMarkup=([k,v,sub,cls])=>`<div class="stat"><div class="k">${k}</div>
      <div class="v ${cls||""}">${v}</div><div class="sub">${sub||"&nbsp;"}<br><span class="metaphor-inline">≈ ${statFlavorAlias(k)}</span></div></div>`;
  const primaryMetrics=hudMetrics.slice(0,6),secondaryMetrics=hudMetrics.slice(6);
  const drawerOpen=modernHudExpanded;
  document.getElementById("strip").innerHTML=primaryMetrics.map(statMarkup).join("")+
    `<details class="modern-hud-drawer" id="modernHudDrawer"${drawerOpen?" open":""}><summary>`+
    `<span>Ledger, reporting &amp; supporting metrics</span><em>${secondaryMetrics.length} supporting signals</em></summary>`+
    `<div class="strip modern-hud-secondary">${secondaryMetrics.map(statMarkup).join("")}</div></details>`;
  const modernHudDrawer=document.getElementById("modernHudDrawer");
  if(modernHudDrawer)modernHudDrawer.addEventListener("toggle",()=>{modernHudExpanded=!!modernHudDrawer.open;});

  document.getElementById("slots").innerHTML=S.slots.map((s,i)=>{
    const c=s.c, L=s.last,F=creativeFormatFor(c),formatFit=formatLaneModifier(F,modeHas("multiPlatform")?s.plat:"google"),
      formatStyleFit=formatStyleModifier(F,"lead_gen"),formatCpm=formatModifier(F,"cpmM"),formatCtr=formatModifier(F,"ctrM"),
      formatCvr=formatModifier(F,"cvrM"),formatQuality=formatModifier(F,"qualityM");
    const detailOpen="";
    const P=modeHas("multiPlatform")?PLATFORMS[s.plat]:null,
      nextPlatform=modeHas("multiPlatform")?PLATFORMS[PLAT_ORDER[(PLAT_ORDER.indexOf(s.plat)+1)%PLAT_ORDER.length]]:null;
    const activeLaneAllocation=P?S.slots.reduce((total,slot)=>total+
      (slot.alive&&slot.budget>0&&slot.blocked<=0&&slot.plat===s.plat?slot.budget:0),0):0;
    const laneCapacity=P?mode4CapacityState(s.plat,activeLaneAllocation):null;
    const shownCpm=L?L.cpm:(P?P.cpm*(c.tierCpmM||1)*formatCpm/Math.sqrt(formatFit)*laneCapacity.cpmM:c.cpm*formatCpm/Math.sqrt(formatFit));
    const shownCtr=L?L.ctr:c.ctr*formatCtr*Math.sqrt(formatFit)*(P?P.ctrM:1);
    const shownCvr=L?L.cvr:c.cvr*formatCvr*formatFit*formatStyleFit*(P?P.cvrM:1);
    const shownLpctr=L?L.lpctr:Math.min(95,c.lpctr+5*(s.lpOptimizations||0));
    const shownEpl=L?L.epl:c.epl*formatQuality;
    const modeledSlotCpl=L&&L.leads?L.spend/L.leads:0;
    const reportedAdCpl=L&&L.reportedLeads?L.spend/L.reportedLeads:0;
    const bars=Array.from({length:6},(_,k)=>{
      const on=s.fatigue>k*16.6;
      return `<i class="${on?(s.fatigue>66?"hot":"on"):""}"></i>`;}).join("");
    const thresh=SAT_BASE+scaledDefault(c.satBonus||0)+scaledDefault(F.satBonus||0)+s.multiplies*scaledDefault(2000);
    const creativeSaturating=s.budget>thresh,laneSaturating=!!(laneCapacity&&laneCapacity.use>1);
    const scaleRisk=s.lastBudget>0&&s.budget>s.lastBudget*1.6,formatSystem=creativeSystemFor(F),
      rawLaneFit=Number(F.fit&&F.fit[modeHas("multiPlatform")?s.plat:"google"])||1,
      rawStyleFit=Number(F.styleFit&&F.styleFit.lead_gen)||1,
      fitRead=value=>value>=1.1?"strong":value>=.96?"workable":"adaptation required";
    return `<div class="slot ${s.alive?"":"dead"} ${(creativeSaturating||laneSaturating)?"hot":""} ${c.rarityClass||""} ${s.fatigue>=90?"burned":""}">
      <div>
        <div class="fam">Slot ${i+1}${modeHas("multiPlatform")?" · "+PLATFORMS[s.plat].name:""} · ${c.fam}</div>
        <h3>${c.name}</h3>
        <div class="metaphor-inline">Ad ≈ ${flavor.metrics.ad} · Creative ≈ ${ft.creative}${modeHas("multiPlatform")?` · Platform ≈ ${ft.platform}`:""}</div>
      </div>
      <div class="row">
        ${creativeFormatBadge(c)}
        <span class="tag">${c.axes}</span>
        ${c.rarity?`<span class="tag ${c.rarityClass||"common"}">${c.rarity}</span>`:""}
        ${creativeSaturating?'<span class="tag" style="border-color:var(--warn);color:var(--warn)">creative scale pressure</span>':""}
        ${laneSaturating?'<span class="tag" style="border-color:var(--warn);color:var(--warn)">lane capacity pressure</span>':""}
        ${s.blocked?'<span class="tag flag">held '+s.blocked+"d</span>":""}
        ${scaleRisk?'<span class="tag flag">rapid-scale review risk</span>':""}
      </div>
      <details class="card-detail-block"${detailOpen}><summary>Creative anatomy · format, concept, rarity and fit</summary><div class="card-detail-body">
        <div class="grid2"><span>Format type</span><span>${F.mark} ${F.label} · ${F.kind}</span>
          <span>Production approach</span><span>${formatSystem.mark} ${formatSystem.label} · ${formatSystem.cadence}</span>
          <span>Concept</span><span>${c.fam}</span><span>Simulated rarity</span><span>${c.rarity||"Common"}</span>
          <span>Production burden</span><span>${F.production}</span>
          <span>${P?P.name:"Lead-gen display"} fit</span><span>${fitRead(rawLaneFit)} · lead-gen objective fit ${fitRead(rawStyleFit)}</span></div>
        <div class="note"><b>Why it behaves differently:</b> ${F.description}<br><b>Primary tradeoff:</b> ${F.tradeoff}. Concept is the repeatable idea; format is how it is executed; rarity is the game's upside roll. None of the three is the ad account or campaign.${F.platformNote?`<br><b>Placement adaptation:</b> ${F.platformNote}`:""}</div>
      </div></details>
      <details class="card-detail-block"${detailOpen}><summary>${L?"Last-day delivery evidence":"Forecast delivery baseline"}</summary><div class="card-detail-body">
        <div class="grid2">
          <span>${L?"Last cost per thousand impressions (CPM)":"Base cost per thousand impressions (CPM)"}</span><span>${money2(shownCpm)}</span>
          <span>${L?"Last click-through rate (CTR)":"Base click-through rate (CTR)"}</span><span>${shownCtr.toFixed(2)}%</span>
          <span>${L?"Last conversion rate (CVR, click → lead)":"Base conversion rate (CVR, click → lead)"}</span><span>${shownCvr.toFixed(1)}%</span>
          <span>${L?"Last landing-page click-through rate (LP CTR) diagnostic":"Base landing-page click-through rate (LP CTR) diagnostic"}</span><span>${c.brandPlay?"Not available · reach objective":shownLpctr.toFixed(1)+"%"}</span>
          <span>${L?"Last earnings per lead (EPL)":"Base earnings per lead (EPL)"}</span><span>${money2(shownEpl)}</span>
        </div>
        <div class="metaphor-inline">CPM ≈ ${flavor.metrics.cpm} · CTR ≈ ${flavor.metrics.ctr} · CVR ≈ ${flavor.metrics.cvr} · CPL ≈ ${flavor.metrics.cpl}</div>
        ${P?`<div class="note"><b>How this platform behaves:</b> ${P.note}<br><b>Lane capacity:</b> This lane can absorb about ${money(laneCapacity.capacity)} per day before delivery becomes more expensive. Current allocation is ${money(laneCapacity.allocation)} (${Math.round(laneCapacity.use*100)}% of that capacity). Above 100%, cost per thousand impressions (CPM) rises gradually. This limit exists only in To The Moon — it is not a platform benchmark.</div>`:""}
      </div></details>
      <div><div class="fam">Fatigue ${Math.round(s.fatigue)}%${modeHas("multiPlatform")?
          ` · relevance x${s.restates||0} (+${((s.restates||0)*6)}% CVR)`:""}</div>
        <div class="bar">${bars}</div>
        ${modeHas("multiPlatform")?`<div class="fam" style="color:var(--ink-dim);margin-top:3px">
          A geo-wording rewrite raises relevance but leaves fatigue alone. Changing the presenter refreshes attention.
        </div>`:""}</div>
      <details class="card-detail-block"${detailOpen}><summary>${L?`Outcome and landing diagnostics · ${Math.round(L.leads)} modeled lead${Math.round(L.leads)===1?"":"s"}`:"Outcome and landing diagnostics · no delivery yet"}</summary><div class="card-detail-body"><div class="funnel">${L?
        `<div><b>Outcome path</b> · CVR = modeled leads / ad clicks<br>
         ${Math.round(L.impr).toLocaleString()} impressions → <b>${Math.round(L.clicks).toLocaleString()}</b> ad clicks → <b>${Math.round(L.leads)}</b> modeled leads<br>
         Measurement reports <b>${Math.round(L.reportedLeads)}</b> of those leads at ad level.</div>
         <div style="margin-top:7px"><b>Parallel landing diagnostic</b> · ${c.brandPlay?
           "Landing-page click-through rate (LP CTR) is not available for this reach ad because it does not track an on-page action.":
           `Landing-page click-through rate (LP CTR) = on-page actions / landing-page visits. It is not multiplied into click-to-lead conversion rate (CVR).<br>${Math.round(L.lpv).toLocaleString()} diagnostic landing-page visits → ${Math.round(L.lpc).toLocaleString()} on-page actions · <b>${L.lpctr.toFixed(1)}% LP CTR</b>`}</div><br>
         Modeled slot CPL <b>${modeledSlotCpl?money2(modeledSlotCpl):"—"}</b> · modeled slot ROI
         <b class="${L.actualRoi>=0?"pos":"neg"}">${L.actualRoi.toFixed(0)}%</b><br>
         Reported ad CPL <b>${reportedAdCpl?money2(reportedAdCpl):"—"}</b> · attributed ad ROI
         <b class="${L.roi>=0?"pos":"neg"}">${L.roi.toFixed(0)}%</b> <span class="tag intent">${modeledView?"Modeled account lens active":"Attributed report lens active"}</span>`
        +(L.partial?` <span class="tag flag">Attribution gap</span>`:"")
        :`<span style="color:var(--ink-dim)">no delivery yet</span>`}</div></div></details>
      ${s.revealed?`<div class="note">${c.intent}</div>`:""}
      <div class="spendline">
        <button class="btn" data-act="minus" data-i="${i}" ${(!s.alive||s.budget<=0)?"disabled":""}>−${money(BUDGET_STEP)}</button>
        <span class="amt">${money(s.budget)}</span>
        <button class="btn" data-act="plus" data-i="${i}" ${(!s.alive||committed+BUDGET_STEP>DAILY)?"disabled":""}>+${money(BUDGET_STEP)}</button>
      </div>
      <div class="row">
        ${modeHas("multiPlatform")?`
        <button class="btn wide" data-act="restate" data-i="${i}" ${(!s.alive||(s.restates||0)>=3)?"disabled":""}>${(s.restates||0)>=3?"Geo rewrite limit reached":`Rewrite geo wording · ${money(scaledCost(300))} · ${(s.restates||0)}/3 used`}</button>
        <button class="btn wide" data-act="recast" data-i="${i}" ${(!s.alive||s.fatigue<24)?"disabled":""}>${s.fatigue<24?"Change presenter unlocks at 24% fatigue":`Change presenter · ${money(scaledCost(1500))} · refresh attention`}</button>
        <button class="btn wide" data-act="sooner" data-i="${i}" ${(!s.alive||s.offerAtSec<=1)?"disabled":""}>Move offer earlier · ${s.offerAtSec} seconds → ${Math.max(1,s.offerAtSec-1)} ${Math.max(1,s.offerAtSec-1)===1?"second":"seconds"} · removes one 13% CVR penalty · ${money(scaledCost(250))}</button>
        <button class="btn wide" data-act="platform" data-i="${i}" ${!s.alive?"disabled":""}>Adapt for ${nextPlatform?.name||"next platform"} · ${money(scaledCost(500))} · clears last-day result</button>`
        :`<button class="btn wide" data-act="mult" data-i="${i}" ${(!s.alive||s.c.brandPlay||s.multiplies>=MAX_MULT)?"disabled":""}>${
          s.c.brandPlay?"Reach ad · no variations needed":s.multiplies>=MAX_MULT?"All variation axes tested":`Create one controlled variation · ${money(scaledCost(600))} · reset fatigue and raise scale ceiling`}</button>`}
        <button class="btn wide" data-act="lander" data-i="${i}" ${(!s.alive||s.c.brandPlay||(s.lpOptimizations||0)>=2)?"disabled":""}>${s.c.brandPlay?"Reach objective · no landing-page diagnostic":(s.lpOptimizations||0)>=2?"Landing-page work complete":`Improve landing-page step · ${money(scaledCost(900))} · +5 points LP CTR and +8% CVR · ${(s.lpOptimizations||0)}/2 used`}</button>
        <button class="btn wide" data-act="ask" data-i="${i}" ${(!s.alive||!S.asks||s.revealed)?"disabled":""}>${s.revealed?"Purpose revealed":`Ask what this ad should do · uses 1 question`}</button>
      </div>
      <div class="row">
        <button class="btn wide" data-act="swap" data-i="${i}" ${(s.c.brandPlay||!S.readyCreative.length)?"disabled":""}>${s.c.brandPlay?"Reach ad · creative is fixed":S.readyCreative.length?`Replace creative · ${S.readyCreative.length} ready`:"Replace creative · create one below first"}</button>
        <button class="btn wide" data-act="kill" data-i="${i}" ${!s.alive?"disabled":""}>${s.alive?`Stop this ad · free ${money(s.budget)}/day`:"Ad stopped"}</button>
      </div>
      ${typeof densityLevel==="function"&&densityLevel()==="guided"?`<div class="note"><b>Before you act:</b> Budget and creative changes affect the next day you run. A controlled variation resets fatigue and raises the creative's scale ceiling. Landing-page work adds 5 percentage points to LP CTR and raises click-to-lead CVR by 8%. Platform adaptation moves to the named lane, clears the last-day result, partially refreshes fatigue and resets geo rewrites. Replacing creative in an active slot keeps its allocation; replacing one in a stopped slot revives it with the allocation shown in the picker. Stopping the ad frees ${money(s.budget)} of daily allocation and keeps its history.</div>`:""}
    </div>`;}).join("");

  document.getElementById("log").innerHTML=renderLog(S.log,
    '<div style="color:var(--ink-dim)">Nothing has run yet. Set your budgets, then run a day.</div>');
  document.getElementById("asksLeft").textContent=S.asks;
  document.getElementById("asksRow").style.display="";
  const binBtn=document.getElementById("binBtn"); binBtn.style.display="";
  binBtn.textContent=`Creative library (${S.bin.length})`;
  binBtn.disabled=!S.bin.length;
  const ab=document.getElementById("accountBox"), dayState=S.dayState;
  const eventTarget=dayState.event.target!==null?` Slot ${dayState.event.target+1}.`:"";
  ab.innerHTML=`<div class="eyebrow">Account controls</div>
    <div class="note"><b>Account ROI:</b> modeled value minus media and operations costs, divided by those costs. <b>Ad ROI:</b> platform-credited value minus one ad's media spend, divided by that spend. Account ROI is not an average of the ad ROIs. Switching the measurement lens changes only the report you see; it never changes delivery. <span class="flavor-cue">${flavorCue("structure")}</span></div>
    <div class="eventcard ${dayState.event.tone||dayState.mood.tone}">
      <div class="eventtitle">Algorithm: ${dayState.mood.label} (${dayState.mood.detail}) · ${dayState.event.title}</div>
      <div class="eventbody">${dayState.event.body}${eventTarget}<span class="flavor-cue">${eventFlavorText(dayState.event.id)}</span></div>
    </div>
    <div class="row" style="margin-top:6px">
      <button class="btn wide" id="viewBtn">${modeledView?"Show attributed report — changes reporting only":"Show modeled outcome — changes reporting only"}</button>
    </div>
    <div class="eventcard ${S.pixel.status==="degraded"?"bad alertpulse":"good"}">
      <div class="eventtitle">Pixel: ${S.pixel.status==="healthy"?"healthy":S.pixel.diagnosed?"degraded — 45% reporting":"signal anomaly"}</div>
      <div class="eventbody">${S.pixel.status==="healthy"?(unattributedEarned>0?`Pixel reporting is healthy; ${money(unattributedEarned)} remains unattributed because historical disruption and platform-specific attribution limits are not rewritten.`:"Current modeled and attributed totals reconcile."):
        S.pixel.diagnosed?`${S.pixel.days} day${S.pixel.days===1?"":"s"} of disruption remain. Repair the pixel now or make decisions from account totals.`:
        "Ad totals no longer reconcile with account revenue. Diagnose before changing ads."}<span class="flavor-cue">${flavorCue("measurement")}</span></div>
      ${S.pixel.status==="degraded"?`<div class="row" style="margin-top:6px"><button class="btn wide" id="pixelBtn">${S.pixel.diagnosed?`Repair pixel ${money(scaledCost(750))}`:"Diagnose pixel"}</button></div>`:""}
    </div>`;
  document.getElementById("viewBtn").onclick=()=>{
    if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("view"))return false;
    S.view=modeledView?"attributed":"modeled";render();
    if(typeof tutorialAfterAction==="function")tutorialAfterAction("view",{view:S.view});
    return true;
  };
  const pixelBtn=document.getElementById("pixelBtn");
  if(pixelBtn) pixelBtn.onclick=()=>{
    const before=JSON.stringify(S);
    if(!S.pixel.diagnosed){S.pixel.diagnosed=true;addLog("<div><b>Diagnosed</b> — the pixel is under-reporting 55% of ad outcomes</div>","measurement");}
    else{S.pixel={status:"healthy",days:0,diagnosed:true};chargeOps(scaledCost(750),"measurement");S.telemetry.pixelFixes++;
      addLog("<div><b class='pos'>Pixel repaired</b> — future ad reporting is restored; the historical attribution gap remains</div>","measurement");}
    const repaired=S.pixel.status==="healthy";
    markRunDirtyIfChanged(before);
    render();
    if(repaired)fireFx("repair",{kicker:"Measurement restored",value:"PIXEL REPAIRED",sub:"Future pixel reporting restored · platform limits remain"});
  };
  const pb=document.getElementById("pipeBox");
  if(pb){
      const q=modeHas("creativePipeline")
        ?(S.requests.map(r=>`<div class="fam">${creativeFormatBadge(r.c)} ${r.c.fam} — ${r.stage}, ${r.days} day${r.days===1?"":"s"}</div>`).join("")
          ||'<div class="fam" style="color:var(--ink-dim)">nothing in flight</div>')
        :'<div class="fam" style="color:var(--ink-dim)">tests deliver instantly in this mode</div>';
      const readyList=S.readyCreative.map(c=>`<div class="fam">${creativeFormatBadge(c)} <span class="tag ${c.rarityClass||"common"}">${c.rarity||"Common"}</span> ${c.fam}</div>`).join("");
      const ready=S.readyCreative.length
        ?`<button class="btn wide" id="shipBtn">Choose a slot (${S.readyCreative.length} ready)</button>`:"";
      pb.innerHTML=`<div class="eyebrow">${modeHas("creativePipeline")?"Creative pipeline":"Creative lab"} · ${ft.test}</div>
        <div class="note"><b>Creative swap process:</b> ${modeHas("creativePipeline")?"Request a creative and complete review":"Test a creative"}. When it is ready, choose the ad slot that will receive it. The slot keeps its delivery role; only the creative changes. <span class="flavor-cue">${flavorCue("creative")}</span></div>${q}${readyList}
        <div class="row" style="margin-top:5px">
          <button class="btn wide" id="reqBtn" ${(modeHas("creativePipeline")&&S.requests.length>=3)?"disabled":""}>1) Choose creative format · cost and build time vary</button>
          ${ready}</div>`;
      const rb=document.getElementById("reqBtn"); if(rb) rb.onclick=()=>{
        if(typeof tutorialBeforeAction!=="function"||tutorialBeforeAction("creative_picker_open"))creativeFormatPicker();};
      const sb=document.getElementById("shipBtn"); if(sb) sb.onclick=shipPicker;
  }
  const runButton=document.getElementById("runBtn"),runDayNumber=Math.min(S.day,DAYS);
  runButton.disabled=S.day>DAYS;
  const runButtonLabel=runButton.querySelector("span");
  if(runButtonLabel)runButtonLabel.textContent=S.day>DAYS?"Run complete":`Run Day ${runDayNumber}`;
  const runLens=document.getElementById("runLens");
  if(runLens)runLens.textContent=S.day>DAYS?"Review the final results":`Spend selected budgets and reveal Day ${runDayNumber} results`;
  wireLore();
  if(typeof tutorialAfterRender==="function")tutorialAfterRender();
  if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.sync();
}

/* ---------------- actions ---------------- */
document.getElementById("slots").addEventListener("click",e=>{
  if(MODE===5){
    const nightButton=e.target.closest("button[data-night]");
    if(nightButton) nightmareAccountAction(nightButton);
    return;
  }
  const b=e.target.closest("button[data-act]"); if(!b) return;
  const i=+b.dataset.i, s=S.slots[i];
  if(!s)return;
  const action=b.dataset.act;
  if(action==="swap"){
    if(!s.c.brandPlay&&S.readyCreative.length&&
      (typeof tutorialBeforeAction!=="function"||tutorialBeforeAction("creative_swap_open",{slotIndex:i})))shipPicker(i);
    return;
  }
  if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("slot",{action,index:i}))return;
  const before=JSON.stringify(S);
  switch(action){
    case "plus":
      if(s.alive&&allocatedBudget()+BUDGET_STEP<=DAILY){s.budget+=BUDGET_STEP;noteBudgetChange(s);} break;
    case "minus": if(s.alive&&s.budget>0){s.budget=Math.max(0,s.budget-BUDGET_STEP);noteBudgetChange(s);} break;
    case "restate":
      if(!s.alive||(s.restates||0)>=3)break;
      s.restates=(s.restates||0)+1;S.telemetry.restates++;chargeOps(scaledCost(300),"creative");
      addLog(`<div><b>Geo wording rewritten</b> in ad slot ${i+1} — conversion-rate relevance rises on future delivery, while fatigue stays unchanged.</div>`,"creative");
      break;
    case "recast":
      if(!s.alive||s.fatigue<24)break;
      s.fatigue=8;S.telemetry.recasts++;chargeOps(scaledCost(1500),"creative");
      addLog(`<div><b>Presenter changed</b> in ad slot ${i+1} — the new presentation refreshes attention and resets fatigue.</div>`,"creative");
      break;
    case "sooner":
      if(s.alive&&s.offerAtSec>1){s.offerAtSec--;chargeOps(scaledCost(250),"creative");
        addLog(`<div><b>Offer moved earlier</b> in slot ${i+1} — now ${s.offerAtSec}s</div>`,"creative");}
      break;
    case "platform": {
      if(!s.alive||!modeHas("multiPlatform"))break;
      const next=(PLAT_ORDER.indexOf(s.plat)+1)%PLAT_ORDER.length;
      s.plat=PLAT_ORDER[next];s.last=null;s.fatigue=Math.max(8,s.fatigue*.65);s.restates=0;
      chargeOps(scaledCost(500),"creative");S.telemetry.platformMoves++;
      const movedFormat=creativeFormatFor(s.c),rawFit=Number(movedFormat.fit&&movedFormat.fit[s.plat])||1,
        fitText=rawFit>=1.1?"strong":rawFit>=.96?"workable":"weak without a deeper rebuild";
      addLog(`<div><b>Platform adaptation complete</b> — Slot ${i+1}'s ${movedFormat.label} is now on ${PLATFORMS[s.plat].name}, where its modeled format fit is <b>${fitText}</b>. The move cost ${money(scaledCost(500))}, cleared the last-day result, partially refreshed attention and reset geographic rewrites. ${PLATFORMS[s.plat].note} Active slots share ${money(mode4PlatformCapacity(s.plat))} of daily lane capacity.</div>`,"platform");
      break; }
    case "mult":
      if(!s.alive||s.c.brandPlay||s.multiplies>=MAX_MULT)break;
      s.fatigue=Math.min(s.fatigue,18);s.multiplies++;S.telemetry.multiplies++;chargeOps(scaledCost(600),"creative");
      addLog(`<div><b>Controlled variation created</b> in ad slot ${i+1} on ${s.c.axes} — fatigue resets and the creative's scale ceiling rises.</div>`,"creative");
      break;
    case "lander":
      if(!s.alive||s.c.brandPlay||(s.lpOptimizations||0)>=2)break;
      s.lpOptimizations=(s.lpOptimizations||0)+1;S.telemetry.landingOptimizations++;
      chargeOps(scaledCost(900),"funnel");
      addLog(`<div><b>Landing-page step improved</b> — Slot ${i+1} gained 5 percentage points of landing-page click-through rate (LP CTR) and an 8% lift to click-to-lead conversion rate (CVR) for future delivery. LP CTR remains a parallel diagnostic; it is not multiplied into leads.</div>`,"funnel");
      break;
    case "ask":
      if(!s.alive||!S.asks||s.revealed)break;
      s.revealed=true; S.asks--; S.telemetry.asks++;
      if(s.c.brandPlay) S.telemetry.brandAsked=true;
      break;
    case "kill":
      if(!s.alive)break;
      s.alive=false; s.budget=0;
      if(s.c.brandPlay) S.telemetry.brandKilled=true;
      addLog(`<div><b>Stopped</b> ad slot ${i+1} — ${s.c.fam}. Its daily allocation is now free; its history remains in the log.</div>`,"creative");
      break;
  }
  const changed=JSON.stringify(S)!==before;
  markRunDirtyIfChanged(before);
  render();
  if(changed&&typeof tutorialAfterAction==="function")tutorialAfterAction("slot",{action,index:i});
});
document.getElementById("runBtn").addEventListener("click",()=>{
  if(typeof tutorialBeforeAction==="function"&&!tutorialBeforeAction("run",{beforeDay:S&&S.day}))return false;
  const beforeDay=S&&S.day,result=runDay(),afterDay=S&&S.day;
  if(Number(afterDay)>Number(beforeDay)&&typeof tutorialAfterAction==="function")
    tutorialAfterAction("run",{beforeDay,afterDay});
  return result;
});
document.getElementById("binBtn").addEventListener("click",()=>MODE===6?agencyLeadDesk():MODE===5?nightmareCrisisQueue():bin());
document.getElementById("helpBtn").addEventListener("click",()=>briefing());

/* ---------------- overlays ---------------- */
const ov=document.getElementById("overlay");
const guideOv=document.getElementById("guideOverlay");
const mainWrap=document.querySelector(".wrap");
let overlayReturnFocus=null,overlayUnderlayState=null;
function setLayerAvailability(layer,available){if(!layer)return;
  layer.inert=!available;if(layer.setAttribute&&layer.removeAttribute){
    if(available)layer.removeAttribute("aria-hidden");else layer.setAttribute("aria-hidden","true");}}
function captureOverlayUnderlay(){if(!mainWrap||overlayUnderlayState)return;
  overlayUnderlayState={inert:!!mainWrap.inert,hidden:mainWrap.getAttribute&&mainWrap.getAttribute("aria-hidden")};}
function coverMainWrap(){if(!mainWrap)return;mainWrap.inert=true;mainWrap.setAttribute&&mainWrap.setAttribute("aria-hidden","true");}
function restoreOverlayUnderlay(){if(!mainWrap)return;
  const audioPanel=document.getElementById("audioPanel"),anotherModal=!!guideOv.innerHTML||!!(audioPanel&&!audioPanel.hidden);
  if(anotherModal){coverMainWrap();return;}
  const prior=overlayUnderlayState;mainWrap.inert=prior?prior.inert:false;
  if(mainWrap.setAttribute&&mainWrap.removeAttribute){
    if(prior&&prior.hidden!==null&&prior.hidden!==undefined)mainWrap.setAttribute("aria-hidden",prior.hidden);else mainWrap.removeAttribute("aria-hidden");}
  overlayUnderlayState=null;
}
function close(){
  ov.innerHTML="";setLayerAvailability(ov,false);restoreOverlayUnderlay();
  if(document.body&&document.body.classList)document.body.classList.remove("menu-overlay-open");
  if(overlayReturnFocus&&typeof overlayReturnFocus.focus==="function")overlayReturnFocus.focus();
  overlayReturnFocus=null;
}
function show(html,concept="structure",options={}){
  if(!ov.innerHTML){overlayReturnFocus=document.activeElement||null;captureOverlayUnderlay();}
  coverMainWrap();setLayerAvailability(ov,true);
  const learning=options.learning!==false;
  const analogy=learning&&analogiesEnabled()?`<span class="flavor-cue" data-flavor-concept="${concept}">${flavorCue(concept)}</span>${options.rosetta===false?"":flavorRosettaMarkup()}`:"";
  if(document.body&&document.body.classList)document.body.classList.toggle("menu-overlay-open",options.menu===true);
  ov.innerHTML=`<div class="veil"><div class="card${options.wide?" menu-card":""}${options.menu?" game-menu-card":""}" id="modalCard" role="dialog" aria-modal="true" aria-label="Game dialog" tabindex="-1">
    ${html}<div class="modal-status" id="modalStatus" role="status" aria-live="polite"></div>${analogy}</div></div>`;
  if((learning||options.definitions===true)&&tooltipsEnabled()&&typeof wireLore==="function")
    wireLore(ov,{flavor:options.loreFlavor,analogies:options.loreAnalogies});
  const modal=document.getElementById("modalCard");if(modal){const heading=modal.querySelector("h2");
    if(heading){heading.id="modalTitle";modal.removeAttribute("aria-label");modal.setAttribute("aria-labelledby",heading.id);}
    if(typeof modal.focus==="function")modal.focus();}
}
document.addEventListener("keydown",e=>{
  if(e.defaultPrevented||!ov.innerHTML||guideOv.innerHTML||(typeof _pop!=="undefined"&&_pop))return;
  const audioPanel=document.getElementById("audioPanel");if(audioPanel&&!audioPanel.hidden)return;
  if(e.key==="Tab"){
    const modal=document.getElementById("modalCard");if(!modal||typeof modal.querySelectorAll!=="function")return;
    const focusable=Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[href],[tabindex]:not([tabindex="-1"])'))
      .filter(el=>!el.hidden&&!el.inert&&(typeof el.getClientRects!=="function"||el.getClientRects().length>0));
    if(!focusable.length){e.preventDefault();modal.focus();return;}
    const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
    if(active!==modal&&typeof modal.contains==="function"&&!modal.contains(active)){e.preventDefault();first.focus();}
    else if(e.shiftKey&&(active===first||active===modal)){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
    return;
  }
  if(e.key!=="Escape")return;
  const dismiss=["closeB","skipA","wizardBack","menuDismiss","closeCardGuide"]
    .map(id=>document.getElementById(id)).find(el=>el&&el.parentNode&&!el.removed);
  if(!dismiss||dismiss.disabled||(typeof dismiss.click!=="function"&&typeof dismiss.onclick!=="function"))return;
  e.preventDefault();if(typeof dismiss.click==="function")dismiss.click();else dismiss.onclick();
});

/* Inert is the primary browser boundary. This capture guard is the fallback for older engines,
   synthetic activation and focus that was already outside the dialog when it opened. */
function topInteractionLayer(){
  const gate=document.getElementById("gate"),audioPanel=document.getElementById("audioPanel");
  const accessGranted=typeof window!=="undefined"&&window.__trainerAccessGranted;
  if(!accessGranted&&gate&&!gate.hidden&&(!gate.style||gate.style.display!=="none"))return gate;
  if(audioPanel&&!audioPanel.hidden)return audioPanel;
  if(guideOv&&guideOv.innerHTML)return document.getElementById("guideCard")||guideOv;
  if(ov&&ov.innerHTML)return document.getElementById("modalCard")||ov;
  return null;
}
function interactionInsideLayer(target,layer){
  if(!target||!layer)return false;
  if(typeof popContains==="function"&&popContains(target))return true;
  return target===layer||(typeof layer.contains==="function"&&layer.contains(target));
}
function containModalInteraction(event){const layer=topInteractionLayer();
  if(!layer||interactionInsideLayer(event&&event.target,layer))return;
  /* Let the existing top-layer keyboard handler recover stale focus and own dismissal. */
  if(event&&event.type==="keydown"&&(event.key==="Tab"||event.key==="Escape"))return;
  if(event&&typeof event.preventDefault==="function")event.preventDefault();
  if(event&&typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
}
function containModalFocus(event){const layer=topInteractionLayer();
  if(!layer||interactionInsideLayer(event&&event.target,layer))return;
  if(event&&typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
  if(typeof layer.focus==="function")layer.focus({preventScroll:true});
}
if(typeof document!=="undefined"&&typeof document.addEventListener==="function"){
  document.addEventListener("pointerdown",containModalInteraction,true);
  document.addEventListener("click",containModalInteraction,true);
  document.addEventListener("keydown",containModalInteraction,true);
  document.addEventListener("focusin",containModalFocus,true);
}
let guideReturnFocus=null;
function closeGuide(){
  guideOv.innerHTML="";
  setLayerAvailability(guideOv,false);setLayerAvailability(ov,!!ov.innerHTML);
  const under=document.getElementById("modalCard");if(under){under.inert=!ov.innerHTML;if(ov.innerHTML)under.removeAttribute&&under.removeAttribute("aria-hidden");}
  if(ov.innerHTML)coverMainWrap();else restoreOverlayUnderlay();
  if(guideReturnFocus&&typeof guideReturnFocus.focus==="function")guideReturnFocus.focus();
  guideReturnFocus=null;if(typeof tutorialIsActive==="function"&&tutorialIsActive()&&typeof deferTutorialRefresh==="function")deferTutorialRefresh();
}
function showGuide(html){
  if(!guideOv.innerHTML){guideReturnFocus=document.activeElement||null;if(!ov.innerHTML)captureOverlayUnderlay();}
  coverMainWrap();setLayerAvailability(guideOv,true);
  if(ov){ov.inert=true;ov.setAttribute&&ov.setAttribute("aria-hidden","true");}
  const under=document.getElementById("modalCard");if(under){under.inert=true;under.setAttribute&&under.setAttribute("aria-hidden","true");}
  guideOv.innerHTML=`<div class="veil guide-veil"><div class="card" id="guideCard" role="dialog" aria-modal="true" aria-labelledby="guideTitle" tabindex="-1">${html}</div></div>`;
  if(tooltipsEnabled()&&typeof wireLore==="function")wireLore(guideOv);
  const modal=document.getElementById("guideCard");if(modal&&typeof modal.focus==="function")modal.focus();
}

function bin(){
  const hasTarget=S.slots.some(slot=>slot.alive&&!slot.c.brandPlay);
  const rows=S.bin.map((o,k)=>`<div class="binrow">
    <span class="nm">${o.name}</span>
    ${o.inspected?(o.flag?`<span class="tag flag">${o.flag}</span>`:'<span class="tag ok">clean</span>')
      :'<span class="tag">not inspected</span>'}
    <button class="btn" data-b="insp" data-k="${k}" ${o.inspected?"disabled":""}>Inspect asset · free</button>
    <button class="btn" data-b="ship" data-k="${k}" ${hasTarget?"":"disabled"}>${hasTarget?`Choose slot · ${money(scaledCost(1800))}`:"No eligible live slot"}</button>
  </div>`).join("");
  show(`<div class="eyebrow">Creative library</div>
  <h2>Found assets</h2>
  <div class="prose"><p>Choose exactly which live ad slot receives the asset. Inspecting is free
  and takes no time; shipping an uninspected asset accepts its compliance risk.</p></div>
  <div class="bin">${rows}</div>
  <div class="row"><button class="btn wide" id="closeB">Back to the account</button></div>`,"compliance");
  document.getElementById("closeB").onclick=close;
  ov.querySelectorAll("button[data-b]").forEach(btn=>btn.onclick=()=>{
    const k=+btn.dataset.k, o=S.bin[k];
    if(btn.dataset.b==="insp"){o.inspected=true;markRunDirty();bin();return;}
    assetTargetPicker(k);
  });
}

function assetTargetPicker(assetIndex){
  const o=S.bin[assetIndex];if(!o)return false;
  const targets=S.slots.map((s,i)=>({s,i})).filter(({s})=>s.alive&&!s.c.brandPlay);
  if(!targets.length)return false;
  show(`<div class="eyebrow">Creative library · choose delivery target</div><h2>${o.name}</h2>
    <div class="prose"><p>An <strong>asset</strong> replaces the creative inside the chosen <strong>ad slot</strong>. The slot's budget, platform, and account remain in place. Both measurement lenses are shown so a tracking gap cannot silently choose the target.</p></div>
    <div class="bin">${targets.map(({s,i})=>{const L=s.last;return `<div class="binrow"><span class="nm"><b>Slot ${i+1} · ${s.c.fam}</b><br><small>${L?`last-day modeled slot ROI ${L.actualRoi.toFixed(0)}% · attributed ad ROI ${L.roi.toFixed(0)}%`:`no delivery evidence yet`}</small></span><button class="btn" data-found-target="${assetIndex}" data-slot="${i}">Ship here · ${money(scaledCost(1800))}</button></div>`;}).join("")}</div>
    <div class="row"><button class="btn wide" id="closeB">Back to creative library</button></div>`,"creative");
  document.getElementById("closeB").onclick=bin;
  ov.querySelectorAll("button[data-found-target]").forEach(button=>button.onclick=()=>shipFoundAsset(+button.dataset.foundTarget,+button.dataset.slot));
  return true;
}

function shipFoundAsset(assetIndex,slotIndex){
  const o=S.bin[assetIndex],t=S.slots[slotIndex];
  if(!o||!t||!t.alive||t.c.brandPlay)return false;
  chargeOps(scaledCost(1800),"creative");
  const complianceFlag=!!o.flag;
  if(complianceFlag){
    S.telemetry.flagsShipped++;t.blocked=2;chargeOps(scaledCost(2500),"penalties");
    addLog(`<div><b class="neg">Compliance block</b> — ${o.flag}. Slot ${slotIndex+1} held 2 days, ${money(scaledCost(2500))} penalty.</div>`,"compliance");
  }else{
    S.telemetry.swaps++;
    t.c={...t.c,name:o.name,format:o.format||"static",cpm:o.cpm,ctr:o.ctr,cvr:o.cvr,epl:o.epl,lpctr:o.lpctr,
      fam:"Net-new concept",axes:"No planned variations yet",
      intent:"A newly sourced concept with no variation axes yet. Create controlled variations before the concept burns out.",
      rarity:"Common",rarityClass:"common",satBonus:0,fatigueM:1};
    t.fatigue=6;t.multiplies=0;t.revealed=false;t.last=null;t.hist=[];t.restates=0;
    if(modeHas("multiPlatform"))t.offerAtSec=1+Math.floor(stateRoll("creative")*4);
    addLog(`<div><b>Shipped</b> ${o.name} into slot ${slotIndex+1}</div>`,"creative");
  }
  const shippedName=o.name;S.bin.splice(assetIndex,1);close();render();
  if(complianceFlag)fireFx("compliance",{name:o.flag||shippedName});
  else fireFx("swap",{name:shippedName,slot:slotIndex+1});
  return true;
}

function shipPicker(slotIdx){
  const targets=Number.isInteger(slotIdx)?[slotIdx]:S.slots.map((_,i)=>i);
  const opts=S.readyCreative.map((c,i)=>targets.map(j=>{
    const s=S.slots[j]; if(s.c.brandPlay) return "";
    return `<button class="btn ship-option" data-i="${i}" data-j="${j}">
      <span class="ship-option-title">${creativeFormatBadge(c)} <span class="tag ${c.rarityClass||"common"}">${c.rarity||"Common"}</span> ${c.fam} → slot ${j+1}</span>
      <span class="ship-option-detail">${s.alive&&s.budget>0?`replaces ${s.c.fam}; keeps ${money(s.budget)}/day`:`revives this stopped slot with ${money(Math.min(scaledDefault(3500),availableFor(s)))}/day`}</span>
    </button>`;}).join("")).join("");
  show(`<div class="eyebrow">Swap creative</div><h2>${Number.isInteger(slotIdx)?`Choose replacement creative for ad slot ${slotIdx+1}`:"Choose a replacement creative and target ad slot"}</h2>
    <div class="prose"><p>The <strong>ad</strong> remains the delivery object. The replacement <strong>creative</strong> is the image, video and copy it carries. To The Moon bundles both in a slot. An active slot keeps its assigned allocation. A stopped slot restarts with the allocation shown below. In Channel Command, the slot also keeps its platform lane. Swapping resets creative fatigue; it does not create another campaign, platform ad account or business container.</p></div>
    <div class="ship-picker-options">${opts}</div>
    <div class="row"><button class="btn wide" id="closeB">Back to account</button></div>`,"creative");
  document.getElementById("closeB").onclick=close;
  ov.querySelectorAll("button[data-i]").forEach(b=>b.onclick=()=>shipReady(+b.dataset.i,+b.dataset.j));
  if(typeof deferTutorialRefresh==="function")deferTutorialRefresh();
}

function normalizeRecall(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ");}
function recallMatches(value,answers){
  const response=normalizeRecall(value);
  return (answers||[]).some(raw=>{
    const answer=normalizeRecall(raw);if(!answer)return false;
    if(answer.length<=2)return response===answer;
    const safe=answer.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return response===answer||new RegExp(`(?:^|\\b)${safe}(?:\\b|$)`,"i").test(response);
  });
}
function recall(){
  const q=S.queue.shift(); if(!q) return;
  show(`<div class="eyebrow">Knowledge check</div>
  <h2 style="font-size:14px">${q.q}</h2>
  <div class="prose"><p>A first correct answer earns the most Training XP. Retried and repeated checks earn less. Training XP records practice and never changes campaign economics. Skipping costs nothing, but the question comes back.</p></div>
  <div class="quiz"><input id="ans" autocomplete="off" placeholder="type your answer"></div>
  <div class="row" style="margin-top:10px">
    <button class="btn wide" id="sendA">Submit answer</button>
    <button class="btn wide" id="skipA">Skip question</button>
  </div>`,"performance",{learning:false});
  let settled=false;
  const done=(ok)=>{
    if(settled)return;settled=true;
    const result=typeof TrainingProgress!=="undefined"?TrainingProgress.recordQuestion(q,{correct:ok,source:"recall"}):
      {awarded:ok?500:0,duplicate:false};
    if(ok){S.telemetry.recallRight++;S.knowledgeCredits=(S.knowledgeCredits||0)+(result.awarded||0);}
    else{S.telemetry.recallWrong++;S.queue.push(q);}
    if(typeof markRunDirty==="function")markRunDirty();
    if(typeof saveGame==="function")saveGame("knowledge-check",false);
    const celebration=ok?`<div class="quiz-result-correct" role="status" aria-live="polite" aria-atomic="true">
      <span class="quiz-result-mark" aria-hidden="true">✓</span><span><strong>Correct!</strong><small>${result.awarded?`+${result.awarded.toLocaleString("en-US")} Training XP`:"Practice already recorded"}</small></span></div>`:"";
    show(`${celebration}<div class="eyebrow">${ok?"Correct answer":"Not quite"}</div>
      <h2 style="font-size:14px">${q.a[0]}</h2>
      <div class="prose"><p>${q.why}</p></div>
      <div class="row" style="margin-top:12px"><button class="btn wide" id="closeB">Return to account</button></div>`,"performance");
    document.getElementById("closeB").onclick=()=>{close();render();};
    if(ok&&result.awarded&&typeof fireFx==="function")fireFx("quizCorrect",{points:result.awarded},{silent:true});
  };
  const answerInput=document.getElementById("ans"),submitAnswer=()=>done(recallMatches(answerInput.value,q.a));
  const answerButton=document.getElementById("sendA");answerButton.onclick=submitAnswer;
  answerInput.onkeydown=e=>{if(e.key==="Enter"){if(typeof e.preventDefault==="function")e.preventDefault();answerButton.click();}};
  document.getElementById("skipA").onclick=()=>{if(settled)return;settled=true;S.queue.push(q);
    if(typeof TrainingProgress!=="undefined")TrainingProgress.recordQuestion(q,{skipped:true,source:"recall"});
    if(typeof markRunDirty==="function")markRunDirty();if(typeof saveGame==="function")saveGame("knowledge-check-skip",false);close();};
  answerInput.focus();
}

/* ---------------- debrief: behavior → linked Field Guide lesson ---------------- */
function debrief(){
  const T=S.telemetry;
  const profit=S.earnedRevenue-S.spendTotal;
  const roi=S.spendTotal?profit/S.spendTotal*100:0;
  const cpl=S.leadsTotal?S.mediaSpendTotal/S.leadsTotal:0;
  const unattributedEarned=Math.max(0,S.earnedRevenue-S.attributedEarnedRevenue);
  const unsettled=S.pending.reduce((sum,item)=>sum+item.amt,0);
  const trainingAward=typeof TrainingProgress!=="undefined"?TrainingProgress.completeRun({success:roi>=ROI_TARGET,
    outcome:roi>=ROI_TARGET?"objective-cleared":"objective-missed",state:S,facts:{roi:Number(roi.toFixed(2)),profit:Math.round(profit),leads:Math.round(S.leadsTotal)}}):null;
  const v=[];
  const add=(cls,h,b)=>v.push(`<div class="verdict ${cls}"><div class="h">${h}</div>${b}</div>`);
  const finding=(observation,consequence,next)=>`<div><b>Observation:</b> ${observation}</div>`+
    `<div><b>Consequence:</b> ${consequence}</div><div><b>Next attempt:</b> ${next}</div>`;

  add(roi>=ROI_TARGET?"hit":roi>=ROI_TARGET-15?"watch":"miss","Result",finding(
    `All-in business return on investment (ROI) was <b class="${roi>=0?"pos":"neg"}">${roi.toFixed(1)}%</b>; media cost per lead (CPL) was <b>${S.leadsTotal?money2(cpl):"—"}</b>; modeled contribution was <b class="${profit>=0?"pos":"neg"}">${money(profit)}</b>; settled value was <b>${money(S.revenue)}</b>; and unsettled value was <b class="${unsettled?"amb":""}">${money(unsettled)}</b>.`,
    roi>=ROI_TARGET?`The account cleared its ${ROI_TARGET}% target.`:roi>=ROI_TARGET-15?`The account was profitable but finished below its ${ROI_TARGET}% target.`:`The account finished below its ${ROI_TARGET}% target.`,
    roi>=ROI_TARGET?"Replay the same scenario to test whether a simpler or more resilient strategy can preserve the result.":"Review the observations below, change one decision pattern and replay the same scenario."));

  if(T.brandKilled&&!T.brandAsked)
    add("miss","Brand play stopped before its purpose was checked",finding(
      "The reach-network slot was stopped before its reach objective was revealed.",
      "The account lost the slot's cost-per-thousand-impressions discount and paid full auction cost for the remaining delivery.",
      `Ask for the objective before judging a deliberate reach test by immediate return. ${lessonLink("03")}.`));
  else if(T.brandAsked)
    add("hit","Brand purpose checked before evaluation",finding(
      "A question established that the reach-network slot was buying reach rather than immediate return.",
      "The slot could be evaluated against its actual objective instead of being mislabeled as a failing acquisition ad.",
      `Repeat the objective check whenever a campaign's short-window economics conflict with its stated role. ${lessonLink("03")}.`));
  else if(!T.brandKilled)
    add("watch","Brand play remained active without a purpose check",finding(
      "The reach-network slot stayed live, but its objective was never revealed.",
      "Its auction-cost benefit helped the account, although the decision lacked evidence about intent.",
      `Ask for the objective so the same choice can be repeated deliberately. ${lessonLink("03")}.`));

  if(!modeHas("multiPlatform")){
    if(T.multiplies===0)
      add("miss","No controlled variations were created",finding(
        "The original creatives ran without a color, state or other controlled variation.",
        "Fatigue reduced click-through rate and limited the available scale ceiling.",
        `Spend ${money(scaledCost(600))} on one declared variation before replacing a proven concept. ${lessonLink("02")}.`));
    else if(T.multiplies>=4)
      add("hit","Proven concepts received controlled variations",finding(
        `${T.multiplies} controlled variations changed color, state, size, demographic or offer while preserving the underlying concept.`,
        "The account refreshed attention and expanded usable delivery without paying for an unnecessary reinvention.",
        `Keep naming the changed axis so each result remains traceable. ${lessonLink("01")} · ${lessonLink("02")}.`));
  }

  if(T.flagsShipped>0)
    add("miss",`${T.flagsShipped} flagged ${T.flagsShipped===1?"asset entered":"assets entered"} delivery`,finding(
      `${T.flagsShipped} externally sourced ${T.flagsShipped===1?"asset was":"assets were"} shipped with a visible compliance flag.`,
      "Each flag created a two-day hold and a penalty.",
      `Inspect provenance, rights, visible marks, claims and likeness permissions before shipping. Inspection is free and instant. ${lessonLink("11")}.`));
  else if(T.swaps>0)
    add("hit","Shipped assets cleared inspection",finding(
      "Every externally sourced asset that entered delivery was inspected first.",
      "No avoidable compliance hold or penalty came from those swaps.",
      `Repeat the same check for third-party marks, recognizable people, claims and usage rights. ${lessonLink("11")}.`));

  if(T.requested>0&&T.swaps>0)
    add("hit",`${T.requested} creative ${T.requested===1?"test":"tests"} led to ${T.swaps} live ${T.swaps===1?"swap":"swaps"}`,finding(
      "Creative moved from request or test through clearance and into a named ad slot.",
      "Each active slot kept its allocation while the replacement creative started with fresh fatigue; a revived slot used the allocation shown in the picker.",
      "Continue naming the destination slot so the account, campaign, ad and creative remain distinct."));
  else if(T.requested>0&&!T.swaps)
    add("miss","Creative tests finished without a live swap",finding(
      `${T.requested} ${T.requested===1?"creative became":"creatives became"} ready but remained in the lab.`,
      "Ready creative produced no delivery evidence or value.",
      "Choose Replace creative on the ad slot that needs a refresh, then select the ready card."));

  if(T.shadowReviews)
    add("miss",`Rapid budget increases triggered ${T.shadowReviews} delivery ${T.shadowReviews===1?"review":"reviews"}`,finding(
      `${T.shadowReviews} ${T.shadowReviews===1?"slot increased":"slots increased"} by more than 60% in one day.`,
      "The affected delivery entered a two-day review hold.",
      "Increase allocation in smaller steps or keep another slot ready while a review clears."));

  if(T.pixelBreaks){
    if(T.pixelFixes)
      add("hit","Pixel issue diagnosed and repaired",finding(
        "The reporting gap was compared with modeled outcomes, diagnosed and repaired.",
        "Future ad reporting recovered while historical attribution remained unchanged.",
        "Use the same lens comparison before changing ads when account and ad totals stop reconciling."));
    else
      add("watch","Pixel disruption ended without an operator repair",finding(
        "Modeled value continued while attributed reporting missed outcomes during the disruption.",
        "The pixel recovered with an unresolved historical attribution gap.",
        "On the next disruption, compare both lenses, diagnose the gap and repair future measurement before optimizing."));
  }

  if(T.knee>=3)
    add("miss",`${T.knee} budget changes followed single-day declines`,finding(
      "Several allocations changed immediately after one weak observation.",
      "Normal day-to-day variance may have been mistaken for a durable performance change.",
      `Use a longer evidence window before reallocating unless a separate risk requires action. ${lessonLink("05")}.`));
  else
    add("hit","Single-day declines did not trigger repeated reallocations",finding(
      "Budget decisions remained stable through the simulation's ±18% daily noise.",
      "Promising ads retained enough time to produce another observation.",
      "Keep matching the evidence window to volume, volatility and decision risk."));

  if(T.asks>=4)
    add("hit",`${T.asks} objective questions were used`,finding(
      "Questions revealed campaign intent before several decisions were made.",
      "The additional context reduced the risk of optimizing the wrong scoreboard.",
      `Turn those questions into a repeatable intake and decision-rights process. ${lessonLink("08")}.`));

  if(modeHas("settlementLag")){
    if(T.pendingPanic>=3)
      add("miss",`${T.pendingPanic} budget changes followed unsettled-value declines`,finding(
        `Value settles ${modeHas("multiPlatform")?"1–3":"2–3"} days after leads are earned.`,
        "Allocation moved against a lagging headline before the underlying outcomes had time to settle.",
        "Compare slot funnels and three-day movement with aligned settlement windows before reallocating."));
    else
      add("hit","Budget decisions accounted for settlement lag",finding(
        "Allocation remained stable while earned value moved through pending settlement.",
        "The account avoided treating a timing gap as an immediate performance decline.",
        "Keep earned, pending and settled value on aligned windows when reviewing working capital."));
  }
  if(modeHas("creativePipeline")){
    if(T.emptySlotDays>=6)
      add("miss",`${T.emptySlotDays} slot-days had no live creative`,finding(
        "Creative requires 2–4 build days plus review, and each slot has only two controlled variations in this mode.",
        "Empty slots produced no delivery while replacement creative was unavailable.",
        "Request the next creative before the second controlled variation uses the slot's remaining planned axis."));
    else
      add("hit","Creative supply stayed close to delivery demand",finding(
        `${T.emptySlotDays} slot-days were idle while the production pipeline was active.`,
        "Most slots retained live creative through build and review lead times.",
        "Continue requesting replacements before the current creative reaches its final planned variation."));
    if(T.rejected)
      add("watch",`${T.rejected} creative ${T.rejected===1?"request was":"requests were"} not approved`,finding(
        `${T.rejected} ${T.rejected===1?"request stopped":"requests stopped"} at review, and ${T.revisions} returned for revisions.`,
        "The associated production cost remained spent while those cards stayed out of delivery.",
        "Keep more than one suitable concept in flight when the account cannot tolerate a supply gap."));
  }
  if(modeHas("multiPlatform")){
    if(T.overlapDays>=4)
      add("miss",`Two slots shared one platform for ${T.overlapDays} slot-days`,finding(
        "The two slots competed for overlapping simulated audiences.",
        "To The Moon applied a 22% cost-per-thousand-impressions penalty to the duplicated delivery.",
        "Compare deduplicated reach and marginal delivery before keeping both slots in the same lane."));
    if(T.concentrated>=5)
      add("miss",`One platform held more than 45% of budget on ${T.concentrated} ${T.concentrated===1?"day":"days"}`,finding(
        "Platform allocation remained above the simulation's concentration threshold.",
        "Auction pressure raised cost per thousand impressions by 18% while that concentration persisted.",
        "Reduce the dominant allocation or accept the disclosed premium when the expected return supports it."));
    if(T.restates && !T.recasts)
      add("miss","Geographic wording changed without a presenter change",finding(
        "The campaign used geographic rewrites while the same presenter remained in the creative.",
        "Relevance improved, but creative fatigue did not reset.",
        "Use a presenter change when the evidence points to worn attention rather than geographic mismatch."));
    else if(T.recasts>=2)
      add("hit","Geographic and presenter changes addressed different problems",finding(
        "The campaign used geographic rewrites for relevance and presenter changes for fresh attention.",
        "Each operation affected its intended layer instead of treating both as the same creative edit.",
        "Continue diagnosing relevance and fatigue separately before choosing the edit."));
    const late=S.slots.filter(s=>(s.offerAtSec||1)>2).length;
    if(late)
      add("watch",`${late} ${late===1?"slot revealed":"slots revealed"} the offer after two seconds`,finding(
        "The offer remained later than the simulation's first-second baseline.",
        "Each additional second applied the declared 13% click-to-lead conversion-rate reduction.",
        "Test an earlier offer when the expected conversion lift justifies the editing cost; this rule is not a live-platform benchmark."));
    add("watch","How To The Moon simplifies the platforms",finding(
      "Channel Command separates fatigue, attribution loss, audience overlap, intent quality and concentration risk.",
      "The isolated effects make diagnosis easier, but the resulting numbers are game rules rather than live-platform forecasts.",
      "Use the separation to name the affected layer, then validate live decisions with account-specific evidence."));
  }
  if(unattributedEarned>0)
    add("watch","Modeled value and ad attribution did not fully reconcile",finding(
      `${money(unattributedEarned)} of modeled earned value had no clean ad-level claim.`,
      "Pixel loss and deliberately incomplete reporting can separate business outcomes from attributed ad results.",
      `Compare the modeled and attributed lenses before changing delivery. ${lessonLink("07")}.`));
  add("watch","Knowledge recall",finding(
    `${T.recallRight} answers were correct, ${T.recallWrong} were incorrect, and knowledge checks earned ${S.knowledgeCredits||0} Training XP during this run.`,
    "Missed questions returned later for spaced practice. Training XP did not change campaign economics.",
    `Review the missed concepts before the next scenario. ${lessonLink("06")}.`));

  show(`<div class="eyebrow">Debrief · day ${DAYS} of ${DAYS}</div>
    <h2>What the run reveals</h2>
    <div class="prose" style="margin-bottom:10px"><p>Each section connects an observed decision to its consequence and a specific next attempt.</p></div>
    ${v.join("")}
    ${typeof TrainingProgress!=="undefined"?TrainingProgress.awardMarkup(trainingAward):""}
    <div class="row" style="margin-top:14px">
      <button class="btn wide" id="again">Replay Scenario ${SEED}</button>
      <button class="btn wide" id="newseed">New scenario</button>
      <button class="btn wide" id="trainingProgress">Training progress</button>
      <button class="btn wide" id="debriefMenu">Main menu</button>
    </div>
    <div class="prose" style="margin-top:10px;font-size:12px">Scenario ${SEED} repeats the same day, ad and metric-level random conditions. Keep the setup fixed when you want to compare two strategies; your decisions can still change later results.</div>`,"performance");
  pendingDayFx=[];
  fireFx(roi>=ROI_TARGET?"success":"fail",roi>=ROI_TARGET
    ?{kicker:"Account objective complete",value:"Target cleared",sub:`Return on investment (ROI) ${roi.toFixed(1)}% · contribution ${money(profit)}`}
    :{kicker:"Account objective missed",value:"Run complete",sub:`Return on investment (ROI) ${roi.toFixed(1)}% · target ${ROI_TARGET}%`});
  document.getElementById("again").onclick=()=>{clearFx();startFreshRunExperience({seed:SEED});};
  document.getElementById("debriefMenu").onclick=mainMenu;
  document.getElementById("trainingProgress").onclick=()=>TrainingProgress.open({returnTo:"debrief"});
  document.getElementById("newseed").onclick=()=>{
    let n=1+Math.floor(rnd()*9000);if(n===SEED)n=n===9000?1:n+1;
    startFreshRunExperience({seed:n});
  };
}
