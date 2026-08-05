"use strict";
/* ---------------- state ---------------- */
const DAYS=RUN_DAYS, DAILY=DAILY_BUDGET;
const scaledDefault=amount=>Math.max(0,Math.round((amount*(DAILY/20000))/50)*50);
const scaledCost=amount=>scaledDefault(amount);
const SAT_BASE=scaledDefault(6000);
let S;
function fresh(){
  if(MODE===5) return freshNightmare();
  if(MODE===0) return freshClassic();
  const pick=[]; const used=new Set();
  /* slot 3 is the trap on purpose: best engagement in the account, worst economics */
  ["utility_a","rendered_b","trap_i"].forEach(id=>{pick.push(id);used.add(id);});
  const brand=LIBRARY.find(c=>c.brandPlay);
  if(MODE>=4){
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
  if(MODE<2) return 1;
  const wd=(Math.max(1,d)-1)%7;    // period 1 = Monday; periods 6–7 are the first weekend
  return (wd>=5)?0.86:1.05;
}
function runDay(){
  if(MODE===5) return runDayNightmare();
  if(MODE===0) return runDayClassic();
  if(!S||S.day>DAYS)return false;
  const disc=brandDiscount();
  const dow=dowFactor(S.day);
  const dem=(MODE>=4)?demandOn(S.day):1;
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
  if(MODE>=4) S.slots.forEach(s=>{ if(s.alive&&s.budget>0&&s.blocked<=0){
      platSpend[s.plat]=(platSpend[s.plat]||0)+s.budget;
      platCount[s.plat]=(platCount[s.plat]||0)+1; }});
  const totalSpendToday=Object.values(platSpend).reduce((a,b)=>a+b,0)||1;
  let dayRev=0, dayAttributedRev=0, dayEarnedRevenue=0, dayEarnedAttributedRevenue=0,
      daySpend=0, dayLeads=0, dayReportedLeads=0;
  S.slots.forEach((s,i)=>{
    if(s.blocked>0){s.blocked--; lines.push(`Slot ${i+1} <b>blocked</b> — compliance hold (${s.blocked} day(s) left)`); s.last=null; return;}
    if(!s.alive||s.budget<=0){s.last=null; return;}
    const c=s.c;
    const format=creativeFormatFor(c);
    const formatFit=formatLaneModifier(format,MODE>=4?s.plat:"google");
    const formatCpm=formatModifier(format,"cpmM"),formatCtr=formatModifier(format,"ctrM"),formatCvr=formatModifier(format,"cvrM");
    // saturation: pushing one slot too hard raises CPM
    const thresh=SAT_BASE+scaledDefault(c.satBonus||0)+scaledDefault(format.satBonus||0)+s.multiplies*scaledDefault(2000);
    const over=Math.max(0,(s.budget-thresh)/thresh);
    let cpm=c.cpm*formatCpm/Math.sqrt(formatFit)*(1+0.25*over)*(1-disc)*dow;
    let ctrPlatM=1, cvrPlatM=1, settle=null, hashed=false, laneCapacity=null;
    if(MODE>=4){
      const P=PLATFORMS[s.plat];
      cpm=P.cpm*(c.tierCpmM||1)*formatCpm/Math.sqrt(formatFit)*(1+0.25*over)*(1-disc)*dow;
      cpm*=Math.pow(1+P.infl,S.day-1);                       // auction inflation, compounding
      laneCapacity=mode4CapacityState(s.plat,platSpend[s.plat]||0);
      cpm*=laneCapacity.cpmM;                               // finite lane pool: gentle marginal CPM friction
      const share=(platSpend[s.plat]||0)/totalSpendToday;
      if(share>0.45){ cpm*=1.18; S.telemetry.rivalHits++; }  // a rival piles into your favourite
      if((platCount[s.plat]||0)>1){ cpm*=1.22; S.telemetry.overlapDays++; }  // audience overlap
      ctrPlatM=P.ctrM; cvrPlatM=P.cvrM; settle=P.settle; hashed=!!P.hashed;
      // Offer timing is a declared training lever: each second after the first reduces click-to-lead CVR by 13%.
      const lateP = Math.max(0, (s.offerAtSec-1)) * 0.13;
      cvrPlatM *= (1-lateP);
      s.fatigueRate=P.fatigueM||1;
    }
    cpm*=state.mood.cpmM*dayEffect(state,"cpmM",i);
    // fatigue erodes CTR hard, and lead quality (EPL) mildly — tired creative pulls worse leads
    const f=s.fatigue/100;
    let ctr=c.ctr*formatCtr*Math.sqrt(formatFit)*(1-f*0.72)*ctrPlatM;
    const epl=c.epl*(1-f*0.12);
    // day-to-day noise — deliberately large
    const nz=metric=>1+(keyedRandom(SEED,"modern-delivery",S.day,i,metric)-0.5)*0.36;
    ctr*=nz("ctr");
    const lpOptimizations=s.lpOptimizations||0;
    const lpctr=Math.min(95,c.lpctr+5*lpOptimizations);
    const cvr=c.cvr*formatCvr*formatFit*nz("cvr")*cvrPlatM*dem*(1+0.06*(s.restates||0))*(1+0.08*lpOptimizations)*dayEffect(state,"cvrM",i);  // restates and landing work buy relevance
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
    if(MODE>=4){
      const lag=settle||2;                                   // per-platform settlement speed
      S.pending.push({due:S.day+lag,amt:attributedRev});
      if(attributionShare<1) S.pending.push({due:S.day+lag,amt:rev-attributedRev,unknown:true});
    } else if(MODE>=2){ SETTLE_SPLIT.forEach(([lag,share])=>{
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
  if(MODE>=2){
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
  if(MODE>=4){
    const top=Math.max(...Object.values(platSpend).map(v=>v/totalSpendToday));
    if(top>0.45) S.telemetry.concentrated++;
    lines.push(`demand index <b>${dem.toFixed(2)}</b> · auction drift day ${S.day}`);
  }
  if(MODE>=3) advancePipeline(lines);
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
  if(S.day%3===0 && S.queue.length) recall();
  render();flushDayFx();
}

/* knee-jerk detector: budget change the day after a single-day dip */
function noteBudgetChange(s){
  if(s.lastBudgetDecisionDay===S.day)return;
  s.lastBudgetDecisionDay=S.day;
  if(s.hist.length>=2){
    const prev=s.hist[s.hist.length-2], last=s.hist[s.hist.length-1];
    if(last<prev-20) S.telemetry.knee++;
    if(MODE>=2 && S.pending.length && last<prev) S.telemetry.pendingPanic++;
  }
}

/* ---------------- creative lab: instant tests early, a real pipeline in Mode 3+ ---------- */
function requestCreative(){
  const cost=scaledCost(1200);
  if(MODE>=3&&S.requests.length>=3){return;}
  const c=rollCreative();
  chargeOps(cost,"creative"); S.telemetry.requested++;
  if(MODE<3){
    S.readyCreative.push(c);
    addLog(`<div><b>Creative test</b> — <span class="${c.rarityClass}">${c.rarity}</span> ${c.fam} is ready to swap in</div>`,"creative");
  }else{
    S.requests.push({c,stage:"build",days:2+Math.floor(stateRoll("creative")*3)});
    addLog(`<div><b>Requested</b> ${c.fam} — ${money(cost)}, in build; rarity reveals on approval</div>`,"creative");
  }
  render();
  if(MODE<3)creativeRevealFx(c);
}
function advancePipeline(lines){
  S.requests.forEach(r=>{ r.days--; });
  S.requests.slice().forEach(r=>{
    if(r.days>0) return;
    if(r.stage==="build"){ r.stage="review"; r.days=1;
      lines.push(`<b>${r.c.fam}</b> built — into compliance review`); return; }
    if(r.stage==="review"){
      const roll=stateRoll("creative");
      if(roll<0.68){ r.stage="ready"; S.readyCreative.push(r.c);creativeRevealFx(r.c,true);
        S.requests=S.requests.filter(x=>x!==r);
        lines.push(`<b class="pos">Approved</b> — ${r.c.rarity} ${r.c.fam} is ready to ship`); }
      else if(roll<0.90){r.stage="revisions";r.days=1;chargeOps(scaledCost(400),"creative");S.telemetry.revisions++;
        queueDayFx("warning",{name:`${r.c.fam} needs one more pass`});
        lines.push(`<b class="amb">Approved with revisions</b> — ${r.c.fam}, one more day + ${money(scaledCost(400))}`); }
      else { S.requests=S.requests.filter(x=>x!==r); S.telemetry.rejected++;
        queueDayFx("compliance",{name:`${r.c.fam} was not approved`});
        lines.push(`<b class="neg">Not approved</b> — ${r.c.fam} is dead; the ${money(scaledCost(1200))} test cost remains spent`); }
      return; }
    if(r.stage==="revisions"){ r.stage="ready"; S.readyCreative.push(r.c);creativeRevealFx(r.c,true);
      S.requests=S.requests.filter(x=>x!==r);
      lines.push(`<b class="pos">Cleared</b> — ${r.c.rarity} ${r.c.fam} is ready to ship`); }
  });
}
function shipReady(i,slotIdx){
  const c=S.readyCreative[i]; const s=S.slots[slotIdx]; if(!c||!s||s.c.brandPlay) return false;
  if(!s.alive||s.budget<=0) s.budget=Math.min(scaledDefault(3500),availableFor(s));
  s.c={...c}; s.fatigue=6; s.alive=true; s.multiplies=0; s.revealed=false; s.last=null;
  s.hist=[];s.restates=0;s.lastBudget=s.budget;
  if(MODE>=4) s.offerAtSec=1+Math.floor(stateRoll("creative")*4);
  S.readyCreative.splice(i,1); S.telemetry.swaps++;
  addLog(`<div><b>Shipped</b> ${c.rarity||"Common"} ${c.fam} into slot ${slotIdx+1}</div>`,"creative");
  close(); render();fireFx("swap",{name:c.name||c.fam,slot:slotIdx+1});return true;
}

/* ---------------- render ---------------- */
let modernHudExpanded=false;
function render(){
  if(MODE===5) return renderNightmare();
  if(MODE===0) return renderClassic();
  updateFlavorChrome();
  const flavor=currentFlavor(),ft=flavor.terms;
  document.getElementById("accountSection").textContent=`Account HUD${analogiesEnabled()?` · ${ft.account}`:""}`;
  document.getElementById("accountSectionNote").textContent="bank, attribution and total performance";
  document.getElementById("adSection").textContent=`Live ads${analogiesEnabled()?` · ${flavor.metrics.ad}`:""}`;
  document.getElementById("adSectionNote").textContent=`creative-level controls and delivery${analogiesEnabled()?` · ${ft.swap}`:""}`;
  const scope=realWorldScope(),elective=ACTIVE_PROFILE==="specialist"&&MODE===4?" · general elective":"";
  document.getElementById("runSummary").textContent=`${profileRecord().badge} track${elective} · ${scope.channel} · ${DAYS}-day run`;
  document.getElementById("seedLbl").textContent=
    MODE_NAME[MODE]+" · seed "+S.seedShown+" · day "+Math.min(S.day,DAYS)+"/"+DAYS;
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
    ["Allocated / day",money(committed),money(Math.max(0,DAILY-committed))+" free · cap "+money(DAILY),committed>DAILY?"neg":""],
    [modeledView?"Modeled contribution":"Attributed media margin",money(profit),modeledView?"earned value − media and operations":"attributed value − media spend",profit>=0?"pos":"neg"],
    [modeledView?"All-in business ROI":"Attributed media ROI",roi.toFixed(1)+"%",modeledView?`run objective ≥ ${ROI_TARGET}% · all costs`:`platform-attributed value · media only`,roi>=ROI_TARGET?"pos":roi>=ROI_TARGET-15?"amb":"neg"],
    [modeledView?"Modeled media CPL":"Reported media CPL",viewLeads?money2(cpl):"—","media spend / same-window leads · $13–22 diagnostic band",!viewLeads?"":(cpl<=22?"pos":"neg")],
    [modeledView?"Modeled leads":"Reported leads",Math.round(viewLeads).toLocaleString(),modeledView?"business outcome model":"event source + platform report"],
    [modeledView?"Modeled value earned":"Attributed value reported",money(viewRevenue),modeledView?"earned in this run":"same-window platform credit"],
    ["Media spend",money(S.mediaSpendTotal),"delivery only"],
    ["Operations cost",money(S.opsCost),"creative, landing, measurement and penalties"],
    ["Settled value",money(S.revenue),"cash-like value received so far"],
    ["Knowledge score",String(S.knowledgeCredits||0),"training points · never changes campaign economics"]
  ].concat(unattributedEarned>0?[["Unattributed earned value",money(unattributedEarned),"modeled value with no clean ad claim","amb"]]:[])
   .concat(MODE>=4?[
      ["Demand index",demandOn(Math.min(S.day,DAYS)).toFixed(2),"moves on its own"]]:[])
   .concat(MODE>=2?[["Unsettled",money(S.pending.reduce((a,p)=>a+p.amt,0)),
      MODE>=4?"lands in 1-3 days":"lands in 2-3 days","amb"],
    ["ROI, last 3d",(S.rollHist.length>=3?
      (S.rollHist[S.rollHist.length-1]-S.rollHist[S.rollHist.length-3]).toFixed(1)+" pts":"—"),
      "movement, not level"]]:[]);
  const statMarkup=([k,v,sub,cls])=>`<div class="stat"><div class="k">${k}</div>
      <div class="v ${cls||""}">${v}</div><div class="sub">${sub||"&nbsp;"}<br><span class="metaphor-inline">≈ ${statFlavorAlias(k)}</span></div></div>`;
  const primaryMetrics=hudMetrics.slice(0,6),secondaryMetrics=hudMetrics.slice(6);
  const drawerOpen=densityLevel()==="analyst"||modernHudExpanded;
  document.getElementById("strip").innerHTML=primaryMetrics.map(statMarkup).join("")+
    `<details class="modern-hud-drawer" id="modernHudDrawer"${drawerOpen?" open":""}><summary>`+
    `<span>Ledger, reporting &amp; training metrics</span><em>${secondaryMetrics.length} supporting signals</em></summary>`+
    `<div class="strip modern-hud-secondary">${secondaryMetrics.map(statMarkup).join("")}</div></details>`;
  const modernHudDrawer=document.getElementById("modernHudDrawer");
  if(modernHudDrawer)modernHudDrawer.addEventListener("toggle",()=>{if(densityLevel()!=="analyst")modernHudExpanded=!!modernHudDrawer.open;});

  document.getElementById("slots").innerHTML=S.slots.map((s,i)=>{
    const c=s.c, L=s.last,F=creativeFormatFor(c),formatFit=formatLaneModifier(F,MODE>=4?s.plat:"google"),
      formatCpm=formatModifier(F,"cpmM"),formatCtr=formatModifier(F,"ctrM"),formatCvr=formatModifier(F,"cvrM");
    const detailOpen=typeof densityLevel==="function"&&densityLevel()==="analyst"?" open":"";
    const P=MODE>=4?PLATFORMS[s.plat]:null;
    const activeLaneAllocation=P?S.slots.reduce((total,slot)=>total+
      (slot.alive&&slot.budget>0&&slot.blocked<=0&&slot.plat===s.plat?slot.budget:0),0):0;
    const laneCapacity=P?mode4CapacityState(s.plat,activeLaneAllocation):null;
    const shownCpm=L?L.cpm:(P?P.cpm*(c.tierCpmM||1)*formatCpm/Math.sqrt(formatFit)*laneCapacity.cpmM:c.cpm*formatCpm/Math.sqrt(formatFit));
    const shownCtr=L?L.ctr:c.ctr*formatCtr*Math.sqrt(formatFit)*(P?P.ctrM:1);
    const shownCvr=L?L.cvr:c.cvr*formatCvr*formatFit*(P?P.cvrM:1);
    const shownLpctr=L?L.lpctr:Math.min(95,c.lpctr+5*(s.lpOptimizations||0));
    const shownEpl=L?L.epl:c.epl;
    const modeledSlotCpl=L&&L.leads?L.spend/L.leads:0;
    const reportedAdCpl=L&&L.reportedLeads?L.spend/L.reportedLeads:0;
    const bars=Array.from({length:6},(_,k)=>{
      const on=s.fatigue>k*16.6;
      return `<i class="${on?(s.fatigue>66?"hot":"on"):""}"></i>`;}).join("");
    const thresh=SAT_BASE+scaledDefault(c.satBonus||0)+scaledDefault(F.satBonus||0)+s.multiplies*scaledDefault(2000);
    const creativeSaturating=s.budget>thresh,laneSaturating=!!(laneCapacity&&laneCapacity.use>1);
    const scaleRisk=s.lastBudget>0&&s.budget>s.lastBudget*1.6;
    return `<div class="slot ${s.alive?"":"dead"} ${(creativeSaturating||laneSaturating)?"hot":""} ${c.rarityClass||""} ${s.fatigue>=90?"burned":""}">
      <div>
        <div class="fam">Slot ${i+1}${MODE>=4?" · "+PLATFORMS[s.plat].name:""} · ${c.fam}</div>
        <h3>${c.name}</h3>
        <div class="metaphor-inline">Ad ≈ ${flavor.metrics.ad} · Creative ≈ ${ft.creative}${MODE>=4?` · Platform ≈ ${ft.platform}`:""}</div>
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
      <details class="card-detail-block"${detailOpen}><summary>${L?"Last-day delivery evidence":"Forecast delivery baseline"}</summary><div class="card-detail-body">
        <div class="grid2">
          <span>${L?"Last CPM":"Base CPM"}</span><span>${money2(shownCpm)}</span>
          <span>${L?"Last CTR":"Base CTR"}</span><span>${shownCtr.toFixed(2)}%</span>
          <span>${L?"Last CVR (click → lead)":"Base CVR (click → lead)"}</span><span>${shownCvr.toFixed(1)}%</span>
          <span>${L?"Last LP CTR diagnostic":"Base LP CTR diagnostic"}</span><span>${c.brandPlay?"N/A · reach objective":shownLpctr.toFixed(1)+"%"}</span>
          <span>${L?"Last EPL":"Base EPL"}</span><span>${money2(shownEpl)}</span>
        </div>
        <div class="metaphor-inline">CPM ≈ ${flavor.metrics.cpm} · CTR ≈ ${flavor.metrics.ctr} · CVR ≈ ${flavor.metrics.cvr} · CPL ≈ ${flavor.metrics.cpl}</div>
        ${P?`<div class="note"><b>Lane brief:</b> ${P.note}<br>
          <b>Fresh-capacity model:</b> ${money(laneCapacity.capacity)} of low-friction daily allocation across this lane; ${money(laneCapacity.allocation)} is active now (${Math.round(laneCapacity.use*100)}%). Above 100%, CPM friction rises gradually. This is a trainer constraint, not a platform benchmark.</div>`:""}
      </div></details>
      <div><div class="fam">Fatigue ${Math.round(s.fatigue)}%${MODE>=4?
          ` · relevance x${s.restates||0} (+${((s.restates||0)*6)}% CVR)`:""}</div>
        <div class="bar">${bars}</div>
        ${MODE>=4?`<div class="fam" style="color:var(--ink-dim);margin-top:3px">
          restating raises relevance and leaves fatigue alone — only a recast resets attention
        </div>`:""}</div>
      <details class="card-detail-block"${detailOpen}><summary>${L?`Outcome &amp; landing diagnostics · ${Math.round(L.leads)} modeled lead${Math.round(L.leads)===1?"":"s"}`:"Outcome &amp; landing diagnostics · no delivery yet"}</summary><div class="card-detail-body"><div class="funnel">${L?
        `<div><b>Outcome path</b> · CVR = modeled leads / ad clicks<br>
         ${Math.round(L.impr).toLocaleString()} impressions → <b>${Math.round(L.clicks).toLocaleString()}</b> ad clicks → <b>${Math.round(L.leads)}</b> modeled leads<br>
         Measurement reports <b>${Math.round(L.reportedLeads)}</b> of those leads at ad level.</div>
         <div style="margin-top:7px"><b>Parallel landing diagnostic</b> · ${c.brandPlay?
           "This reach objective does not instrument the on-page-action diagnostic, so LP CTR is N/A.":
           `LP CTR = on-page actions / LP visits; it is not multiplied into click-to-lead CVR.<br>${Math.round(L.lpv).toLocaleString()} diagnostic LP visits → ${Math.round(L.lpc).toLocaleString()} on-page actions · <b>${L.lpctr.toFixed(1)}% LP CTR</b>`}</div><br>
         Modeled slot CPL <b>${modeledSlotCpl?money2(modeledSlotCpl):"—"}</b> · modeled slot ROI
         <b class="${L.actualRoi>=0?"pos":"neg"}">${L.actualRoi.toFixed(0)}%</b><br>
         Reported ad CPL <b>${reportedAdCpl?money2(reportedAdCpl):"—"}</b> · attributed ad ROI
         <b class="${L.roi>=0?"pos":"neg"}">${L.roi.toFixed(0)}%</b> <span class="tag intent">${modeledView?"MODELED ACCOUNT LENS ACTIVE":"ATTRIBUTED REPORT LENS ACTIVE"}</span>`
        +(L.partial?` <span class="tag flag">ATTRIBUTION GAP</span>`:"")
        :`<span style="color:var(--ink-dim)">no delivery yet</span>`}</div></div></details>
      ${s.revealed?`<div class="note">${c.intent}</div>`:""}
      <div class="spendline">
        <button class="btn" data-act="minus" data-i="${i}" ${(!s.alive||s.budget<=0)?"disabled":""}>−${money(BUDGET_STEP)}</button>
        <span class="amt">${money(s.budget)}</span>
        <button class="btn" data-act="plus" data-i="${i}" ${(!s.alive||committed+BUDGET_STEP>DAILY)?"disabled":""}>+${money(BUDGET_STEP)}</button>
      </div>
      <div class="row">
        ${MODE>=4?`
        <button class="btn wide" data-act="restate" data-i="${i}" ${(!s.alive||(s.restates||0)>=3)?"disabled":""}>${(s.restates||0)>=3?"Restate limit reached":`Restate ${money(scaledCost(300))} · relevance ${(s.restates||0)}/3`}</button>
        <button class="btn wide" data-act="recast" data-i="${i}" ${(!s.alive||s.fatigue<24)?"disabled":""}>${s.fatigue<24?"Recast available at 24% fatigue":`Recast ${money(scaledCost(1500))} · resets fatigue`}</button>
        <button class="btn wide" data-act="sooner" data-i="${i}" ${(!s.alive||s.offerAtSec<=1)?"disabled":""}>Offer at ${s.offerAtSec}s → earlier ${money(scaledCost(250))}</button>
        <button class="btn wide" data-act="platform" data-i="${i}" ${!s.alive?"disabled":""}>Move platform →</button>`
        :`<button class="btn wide" data-act="mult" data-i="${i}" ${(!s.alive||s.c.brandPlay||s.multiplies>=MAX_MULT)?"disabled":""}>${
          s.c.brandPlay?"Brand play · no variation axes":s.multiplies>=MAX_MULT?"Axes exhausted":`Multiply ${money(scaledCost(600))}`}</button>`}
        <button class="btn wide" data-act="lander" data-i="${i}" ${(!s.alive||s.c.brandPlay||(s.lpOptimizations||0)>=2)?"disabled":""}>${s.c.brandPlay?"Reach objective · landing diagnostic N/A":(s.lpOptimizations||0)>=2?"Landing step optimized":`Optimize landing step ${money(scaledCost(900))} · ${(s.lpOptimizations||0)}/2`}</button>
        <button class="btn wide" data-act="ask" data-i="${i}" ${(!s.alive||!S.asks||s.revealed)?"disabled":""}>Ask the buyer</button>
      </div>
      <div class="row">
        <button class="btn wide" data-act="swap" data-i="${i}" ${(s.c.brandPlay||!S.readyCreative.length)?"disabled":""}>${s.c.brandPlay?"Brand-play slot · no direct creative swap":S.readyCreative.length?`Swap creative (${S.readyCreative.length} ready)`:"2) Swap here · first test below"}</button>
        <button class="btn wide" data-act="kill" data-i="${i}" ${!s.alive?"disabled":""}>Kill slot</button>
      </div>
    </div>`;}).join("");

  document.getElementById("log").innerHTML=renderLog(S.log,
    '<div style="color:var(--ink-dim)">Nothing has run yet. Set your budgets, then run a day.</div>');
  document.getElementById("asksLeft").textContent=S.asks;
  document.getElementById("asksRow").style.display="";
  const binBtn=document.getElementById("binBtn"); binBtn.style.display="";
  binBtn.textContent=`Asset bin (${S.bin.length})`;
  binBtn.disabled=!S.bin.length;
  const ab=document.getElementById("accountBox"), dayState=S.dayState;
  const eventTarget=dayState.event.target!==null?` Slot ${dayState.event.target+1}.`:"";
  ab.innerHTML=`<div class="eyebrow">Account controls</div>
    <div class="note"><b>Measurement lens:</b> Modeled outcome shows account-level business value against all-in investment. Attributed report shows platform-creditable value against media spend. Cards show both modeled slot ROI and attributed ad ROI at once; the account ROI above also includes operations and is never an average of card ROIs. The lens changes reporting, never delivery. <span class="flavor-cue">${flavorCue("structure")}</span></div>
    <div class="eventcard ${dayState.event.tone||dayState.mood.tone}">
      <div class="eventtitle">Algorithm: ${dayState.mood.label} (${dayState.mood.detail}) · ${dayState.event.title}</div>
      <div class="eventbody">${dayState.event.body}${eventTarget}<span class="flavor-cue">${eventFlavorText(dayState.event.id)}</span></div>
    </div>
    <div class="row" style="margin-top:6px">
      <button class="btn wide" id="viewBtn">Lens: ${modeledView?"MODELED OUTCOME → attributed report":"ATTRIBUTED REPORT → modeled outcome"}</button>
    </div>
    <div class="eventcard ${S.pixel.status==="degraded"?"bad alertpulse":"good"}">
      <div class="eventtitle">Pixel: ${S.pixel.status==="healthy"?"healthy":S.pixel.diagnosed?"degraded — 45% reporting":"signal anomaly"}</div>
      <div class="eventbody">${S.pixel.status==="healthy"?(unattributedEarned>0?`Pixel reporting is healthy; ${money(unattributedEarned)} remains unattributed because historical disruption and platform-specific attribution limits are not rewritten.`:"Current modeled and attributed totals reconcile."):
        S.pixel.diagnosed?`${S.pixel.days} day(s) of disruption remain. Repair now or steer from account totals.`:
        "Ad totals no longer reconcile with account revenue. Diagnose before changing ads."}<span class="flavor-cue">${flavorCue("measurement")}</span></div>
      ${S.pixel.status==="degraded"?`<div class="row" style="margin-top:6px"><button class="btn wide" id="pixelBtn">${S.pixel.diagnosed?`Repair pixel ${money(scaledCost(750))}`:"Diagnose pixel"}</button></div>`:""}
    </div>`;
  document.getElementById("viewBtn").onclick=()=>{S.view=modeledView?"attributed":"modeled";render();};
  const pixelBtn=document.getElementById("pixelBtn");
  if(pixelBtn) pixelBtn.onclick=()=>{
    if(!S.pixel.diagnosed){S.pixel.diagnosed=true;addLog("<div><b>Diagnosed</b> — the pixel is under-reporting 55% of ad outcomes</div>","measurement");}
    else{S.pixel={status:"healthy",days:0,diagnosed:true};chargeOps(scaledCost(750),"measurement");S.telemetry.pixelFixes++;
      addLog("<div><b class='pos'>Pixel repaired</b> — future ad reporting is restored; the historical attribution gap remains</div>","measurement");}
    const repaired=S.pixel.status==="healthy";
    render();
    if(repaired)fireFx("success",{kicker:"Measurement restored",value:"PIXEL REPAIRED",sub:"Future pixel reporting restored · platform limits remain"});
  };
  const pb=document.getElementById("pipeBox");
  if(pb){
      const q=MODE>=3
        ?(S.requests.map(r=>`<div class="fam">${r.c.fam} — ${r.stage}, ${r.days}d</div>`).join("")
          ||'<div class="fam" style="color:var(--ink-dim)">nothing in flight</div>')
        :'<div class="fam" style="color:var(--ink-dim)">tests deliver instantly in this mode</div>';
      const readyList=S.readyCreative.map(c=>`<div class="fam"><span class="tag ${c.rarityClass||"common"}">${c.rarity||"Common"}</span> ${c.fam}</div>`).join("");
      const ready=S.readyCreative.length
        ?`<button class="btn wide" id="shipBtn">Choose a slot (${S.readyCreative.length} ready)</button>`:"";
      pb.innerHTML=`<div class="eyebrow">${MODE>=3?"Creative pipeline":"Creative lab"} · ${ft.test}</div>
        <div class="note">1) ${MODE>=3?"Request and clear review":"Test"} → 2) a creative becomes ready → 3) choose a slot and swap it live. <span class="flavor-cue">${flavorCue("creative")}</span></div>${q}${readyList}
        <div class="row" style="margin-top:5px">
          <button class="btn wide" id="reqBtn" ${(MODE>=3&&S.requests.length>=3)?"disabled":""}>1) ${MODE>=3?"Request":"Test"} creative ${money(scaledCost(1200))}</button>
          ${ready}</div>`;
      const rb=document.getElementById("reqBtn"); if(rb) rb.onclick=requestCreative;
      const sb=document.getElementById("shipBtn"); if(sb) sb.onclick=shipPicker;
  }
  document.getElementById("runBtn").disabled=S.day>DAYS;
  wireLore();
  if(typeof tutorialAfterRender==="function")tutorialAfterRender();
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
  switch(b.dataset.act){
    case "plus":
      if(s.alive&&allocatedBudget()+BUDGET_STEP<=DAILY){s.budget+=BUDGET_STEP;noteBudgetChange(s);} break;
    case "minus": if(s.alive&&s.budget>0){s.budget=Math.max(0,s.budget-BUDGET_STEP);noteBudgetChange(s);} break;
    case "restate":
      if(!s.alive||(s.restates||0)>=3)break;
      s.restates=(s.restates||0)+1;S.telemetry.restates++;chargeOps(scaledCost(300),"creative");
      addLog(`<div><b>Restated</b> slot ${i+1} — a new state name buys relevance, `+
        `not fresh attention: CVR up, fatigue unchanged</div>`,"creative");
      break;
    case "recast":
      if(!s.alive||s.fatigue<24)break;
      s.fatigue=8;S.telemetry.recasts++;chargeOps(scaledCost(1500),"creative");
      addLog(`<div><b>Recast</b> slot ${i+1} — a new face resets attention</div>`,"creative");
      break;
    case "sooner":
      if(s.alive&&s.offerAtSec>1){s.offerAtSec--;chargeOps(scaledCost(250),"creative");
        addLog(`<div><b>Offer moved earlier</b> in slot ${i+1} — now ${s.offerAtSec}s</div>`,"creative");}
      break;
    case "platform": {
      if(!s.alive||MODE<4)break;
      const next=(PLAT_ORDER.indexOf(s.plat)+1)%PLAT_ORDER.length;
      s.plat=PLAT_ORDER[next]; s.last=null; S.telemetry.platformMoves++;
      addLog(`<div><b>Platform moved</b> — slot ${i+1} is now on ${PLATFORMS[s.plat].name}. `+
        `${PLATFORMS[s.plat].note} Its low-friction lane capacity is ${money(mode4PlatformCapacity(s.plat))}/day across active slots; watch both capacity pressure and audience overlap.</div>`,"platform");
      break; }
    case "mult":
      if(!s.alive||s.c.brandPlay||s.multiplies>=MAX_MULT)break;
      s.fatigue=Math.min(s.fatigue,18);s.multiplies++;S.telemetry.multiplies++;chargeOps(scaledCost(600),"creative");
      addLog(`<div><b>Multiplied</b> slot ${i+1} on ${s.c.axes} — fatigue reset, saturation ceiling up</div>`,"creative");
      break;
    case "lander":
      if(!s.alive||s.c.brandPlay||(s.lpOptimizations||0)>=2)break;
      s.lpOptimizations=(s.lpOptimizations||0)+1;S.telemetry.landingOptimizations++;
      chargeOps(scaledCost(900),"funnel");
      addLog(`<div><b>Landing step optimized</b> for slot ${i+1} — the parallel LP-CTR diagnostic rises 5 points and overall click-to-lead CVR rises 8% on future delivery. LP CTR is not multiplied into leads.</div>`,"funnel");
      break;
    case "ask":
      if(!s.alive||!S.asks||s.revealed)break;
      s.revealed=true; S.asks--; S.telemetry.asks++;
      if(s.c.brandPlay) S.telemetry.brandAsked=true;
      break;
    case "swap": if(!s.c.brandPlay&&S.readyCreative.length)shipPicker(i); return;
    case "kill":
      if(!s.alive)break;
      s.alive=false; s.budget=0;
      if(s.c.brandPlay) S.telemetry.brandKilled=true;
      addLog(`<div><b>Killed</b> slot ${i+1} — ${s.c.fam}</div>`,"creative");
      break;
  }
  render();
});
document.getElementById("runBtn").addEventListener("click",runDay);
document.getElementById("binBtn").addEventListener("click",()=>MODE===5?nightmareCrisisQueue():bin());
document.getElementById("helpBtn").addEventListener("click",briefing);

/* ---------------- overlays ---------------- */
const ov=document.getElementById("overlay");
const guideOv=document.getElementById("guideOverlay");
const mainWrap=document.querySelector(".wrap");
let overlayReturnFocus=null;
function close(){
  ov.innerHTML="";if(mainWrap&&!guideOv.innerHTML)mainWrap.inert=false;
  if(overlayReturnFocus&&typeof overlayReturnFocus.focus==="function")overlayReturnFocus.focus();
  overlayReturnFocus=null;
}
function show(html,concept="structure",options={}){
  if(!ov.innerHTML)overlayReturnFocus=document.activeElement||null;
  if(mainWrap)mainWrap.inert=true;
  const learning=options.learning!==false;
  const analogy=learning&&analogiesEnabled()?`<span class="flavor-cue" data-flavor-concept="${concept}">${flavorCue(concept)}</span>${flavorRosettaMarkup()}`:"";
  ov.innerHTML=`<div class="veil"><div class="card${options.wide?" menu-card":""}" id="modalCard" role="dialog" aria-modal="true" aria-label="Simulation dialog" tabindex="-1">
    ${html}${analogy}</div></div>`;
  if(learning&&tooltipsEnabled()&&typeof wireLore==="function") wireLore(ov);
  const modal=document.getElementById("modalCard");if(modal){const heading=modal.querySelector("h2");
    if(heading){heading.id="modalTitle";modal.removeAttribute("aria-label");modal.setAttribute("aria-labelledby",heading.id);}
    if(typeof modal.focus==="function")modal.focus();}
}
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape"||e.defaultPrevented||!ov.innerHTML||guideOv.innerHTML||
    (typeof _pop!=="undefined"&&_pop))return;
  const dismiss=ov.querySelector("#closeB, #skipA, #continueRun, #closeCardGuide");
  if(!dismiss||dismiss.disabled||typeof dismiss.click!=="function")return;
  e.preventDefault();dismiss.click();
});
let guideReturnFocus=null;
function closeGuide(){
  guideOv.innerHTML="";
  if(ov){ov.inert=false;ov.removeAttribute&&ov.removeAttribute("aria-hidden");}
  const under=document.getElementById("modalCard");if(under){under.inert=false;under.removeAttribute&&under.removeAttribute("aria-hidden");}
  if(mainWrap&&!ov.innerHTML)mainWrap.inert=false;
  if(guideReturnFocus&&typeof guideReturnFocus.focus==="function")guideReturnFocus.focus();
  guideReturnFocus=null;
}
function showGuide(html){
  if(!guideOv.innerHTML)guideReturnFocus=document.activeElement||null;
  if(mainWrap)mainWrap.inert=true;
  if(ov){ov.inert=true;ov.setAttribute&&ov.setAttribute("aria-hidden","true");}
  const under=document.getElementById("modalCard");if(under){under.inert=true;under.setAttribute&&under.setAttribute("aria-hidden","true");}
  guideOv.innerHTML=`<div class="veil guide-veil"><div class="card" id="guideCard" role="dialog" aria-modal="true" aria-labelledby="guideTitle" tabindex="-1">${html}</div></div>`;
  if(tooltipsEnabled()&&typeof wireLore==="function")wireLore(guideOv);
  const modal=document.getElementById("guideCard");if(modal&&typeof modal.focus==="function")modal.focus();
}

function briefing(options={}){
  const draft=options.draft||{},focusFlavor=options.focusFlavor||null;
  const spec=CONFIG_SPECS[MODE];
  const profile=profileRecord();
  const picker=[0,1,2,3,4,5].map(m=>`<button class="btn${m===MODE?"":" wide"}" data-mode="${m}"
      ${m===MODE?"disabled":""} style="${m===MODE?"border-color:var(--accent);color:var(--accent)":""}">${MODE_NAME[m]}${m===MODE?" · active":""}</button>`).join(" ");
  const rules=MODE===0?`<div class="prose">
    <p>This is the <strong>search account</strong>. Each card is an ad group, not an individual ad.
    The daily number is an <strong>account-wide simulation cap</strong>; in real Google Ads, budgets normally live at campaign level or in a shared campaign budget. Bids and match types control how each ad group competes.</p>
    <ul>
      <li>Read <strong>search intent</strong> before CTR. The DIY group attracts clicks from people who will never hire.</li>
      <li><strong>Lost to rank</strong> is fixed with bid or relevance. <strong>Lost to budget</strong> is fixed with budget.</li>
      <li>Work the search-terms report, check tracking, and communicate honestly with the client.</li>
      <li>Your period goal is prorated from the client's monthly baseline when you choose a run shorter or longer than 30 days.</li>
    </ul></div>`:MODE===5?`<div class="prose">
    <p><strong>Every advertiser, business, product and result in this mode is invented for training.</strong> Real platform names identify buying disciplines only; no affiliation or endorsement is implied. The daily number is the shared portfolio allocation cap, not guaranteed spend.</p>
    <ul>
      <li><strong>Three linked layers.</strong> A simulated holding company owns shared credit and cash; six synthetic advertiser workstreams can run simultaneous platform initiatives; deliberately misconfigured shared event sources can duplicate or misroute platform claims across accounts.</li>
      <li><strong>Intent vs interruption.</strong> Search uses bids, Quality Score, negatives, impression share and a finite query ceiling. Social and Demand Gen use hooks, creative fatigue and audience saturation. Programmatic / CTV uses impressions and ambiguous view-through credit.</li>
      <li><strong>Synthetic value contract.</strong> To compare unlike verticals, every training operating company uses an invented pay-per-validated-outcome transfer contract. A modeled outcome batch becomes an intercompany receivable after implicit validation; this is game physics, not GAAP revenue or platform reporting. Adjusted platform bills lock the shared credit line, so a positive projected contribution can still fail a payment.</li>
      <li><strong>Claims are not truth.</strong> Platform-claimed ROAS may double-count cross-platform paths. Blended modeled MER uses synthetic outcome value; audits reduce uncertainty rather than manufacturing value.</li>
      <li><strong>Exit.</strong> Pass three consecutive 30-day gates for MER, projected contribution, attribution integrity, liquidity and advertiser concentration. A deliberate one-platform strategy is legal: build two paid contingency layers to satisfy resilience without fake diversification.</li>
      <li><strong>Control.</strong> Any advertiser workstream may activate any lane—or several at once—including an all-Google portfolio. Fit and finite demand change the economics; the game never forbids the choice.</li>
    </ul></div>`:`<div class="prose">
    <p>Each card is a simulation slot that bundles an <strong>ad</strong> (the delivery object) with its <strong>creative</strong> (image/video/copy). The status strip is the <strong>account</strong>.
    End the run with all-in business ROI at or above <strong>${ROI_TARGET}%</strong>. A media CPL of <strong>$13–22</strong> is a diagnostic band, not a second win gate.</p>
    <ul>
      <li><strong>Measurement lens.</strong> Modeled outcome compares earned business value with media and operating costs. Attributed report compares platform-creditable value with media spend. When they disagree, diagnose measurement before killing an ad.</li>
      <li><strong>Creative loop.</strong> Test or request a creative, wait for approval in advanced modes, then use <em>Swap creative</em> on the slot. Common, Epic, and Legendary drops trade scale, efficiency, and fatigue.</li>
      <li><strong>Algorithm conditions.</strong> Each day previews a delivery environment and event before you commit spend. Adapt; a one-day budget jump over 60% can trigger a two-day review.</li>
      <li><strong>Fatigue and saturation.</strong> Refresh attention before it collapses, but do not confuse a new ad with a new campaign or platform.</li>
      <li><strong>Outcome and landing branches.</strong> The displayed CVR is modeled leads divided by ad clicks. LP CTR separately diagnoses on-page action among landing visits; the simulator never multiplies it into CVR. A reach objective may leave that landing diagnostic uninstrumented.</li>
      ${MODE>=4?`<li><strong>Platform lane capacity.</strong> Each card explains its lane behavior and shows the synthetic low-friction allocation pool shared by active slots on that platform. Going above the pool raises CPM gradually; the pool is a game constraint, not a platform benchmark.</li>`:""}
      <li><strong>Asset bin.</strong> Inspect found assets before shipping. Compliance flags create a hold and a fine.</li>
    </ul></div>`;
  const budgetLabel=MODE===5?"daily portfolio authorization":"daily account budget";
  show(`<div class="eyebrow">Briefing · ${MODE_NAME[MODE]}</div>
  <h2>${DAYS} days · ${money(DAILY)} ${budgetLabel}.</h2>
  <div class="portfolio-banner"><b>${profile.label}</b><span>${profile.scope}</span></div>
  <div class="prose" style="margin-bottom:8px"><p>${MODE_BLURB[MODE]}</p></div>
  <div class="eyebrow" style="margin-bottom:7px">Mode · selecting another starts its saved setup</div>
  <div class="row" style="margin-bottom:8px">${picker}</div>
  <div class="eyebrow" style="margin-top:12px">Choose one of 11 analogy flavors · explanations change, mechanics do not</div>
  ${flavorGridMarkup()}
  ${MODE===0?`<div class="row" style="margin-bottom:12px">${[1,2,3].map(st=>
     `<button class="btn" data-stage="${st}" ${st===CLASSIC_STAGE?"disabled":""} style="${st===CLASSIC_STAGE?
       "border-color:var(--accent);color:var(--accent)":""}">${CSTAGE_NAME[st]}${st===CLASSIC_STAGE?" · active":""}</button>`).join(" ")}
     </div><div class="prose" style="margin-bottom:10px"><p>${CSTAGE_BLURB[CLASSIC_STAGE]}</p></div>`:""}
  <div class="config">
    <div class="eyebrow" style="margin-bottom:7px">Run setup · values are normalized before a new run starts</div>
    <div class="configgrid">
      <label>${MODE===5?"Mandate (days, 30-day blocks)":"Periods (days)"}<input id="daysCfg" type="number" inputmode="numeric"
        min="${spec.minDays}" max="${spec.maxDays}" step="${spec.periodStep||1}" value="${draft.days??DAYS}"></label>
      <label>${MODE===5?"Daily portfolio authorization":"Daily account budget"}<input id="budgetCfg" type="number" inputmode="numeric"
        min="${spec.minBudget}" max="${spec.maxBudget}" step="${spec.inputStep}" value="${draft.budget??DAILY}"></label>
    </div>
    <div class="hint">Defaults for this mode: ${spec.days} days and ${money(spec.budget)}/day.
      Allowed: ${spec.minDays}–${spec.maxDays} days${MODE===5?" in 30-day blocks":""} and ${money(spec.minBudget)}–${money(spec.maxBudget)}.</div>
    <div class="hint">Editing these fields changes nothing yet. Load setup starts a fresh run; if this run has progress, it is checkpointed first and remains resumable from Menu.</div>
    <div class="hint" id="configStatus" aria-live="polite"></div>
    <div class="row" style="margin-top:8px"><button class="btn wide" id="applyCfg" disabled>Current setup already loaded</button></div>
  </div>
  <div class="note">Dotted media-buying terms open definitions. Purple Lesson links open the Field Guide at beginner, working, and expert depth.</div>
  ${rules}
  <div class="row" style="margin-top:14px">
    ${ACTIVE_PROFILE==="specialist"?'<button class="btn wide" id="openTrackGuide">Open account playbook</button>':""}
    <button class="btn wide" id="closeB">${S&&S.spendTotal?"Back to the account":"Start the run"}</button>
  </div>`,"structure");
  document.getElementById("closeB").onclick=close;
  const trackGuide=document.getElementById("openTrackGuide");if(trackGuide)trackGuide.onclick=()=>specialistGuide("00");
  ov.querySelectorAll("button[data-flavor]").forEach(b=>b.onclick=()=>{
    const nextDraft={days:document.getElementById("daysCfg").value,budget:document.getElementById("budgetCfg").value};
    setFlavor(b.dataset.flavor,{rerender:true});briefing({draft:nextDraft,focusFlavor:b.dataset.flavor});
  });
  if(focusFlavor){const card=document.getElementById(`flavorCard-${focusFlavor}`);if(card)card.focus();}
  const normalizedDraft=()=>cleanConfig(MODE,{days:document.getElementById("daysCfg").value,budget:document.getElementById("budgetCfg").value});
  const hasProgress=()=>!!(S&&(S.day>1||S.spendTotal>0||S.opsCost>0));
  const updateConfigCta=()=>{const cfg=normalizedDraft(),changed=cfg.days!==DAYS||cfg.budget!==DAILY;
    const cta=document.getElementById("applyCfg"),status=document.getElementById("configStatus"),back=document.getElementById("closeB");
    if(status)status.textContent=`Normalized selection: ${cfg.days} days · ${money(cfg.budget)}/day.${changed?" Use the load button below when ready; the current run stays active until then.":" This is the active setup; nothing will restart."}`;
    if(cta){cta.disabled=!changed;cta.textContent=!changed?"Current setup already loaded":hasProgress()?"Save current & load this fresh setup":"Load this setup & start fresh";}
    if(back)back.textContent=changed?(hasProgress()?"Back without applying draft":"Start current setup without draft changes"):(hasProgress()?"Back to the account":"Start the run");
    return {cfg,changed};};
  [document.getElementById("daysCfg"),document.getElementById("budgetCfg")].forEach(input=>{
    if(input)input.addEventListener("input",updateConfigCta);});
  updateConfigCta();
  document.getElementById("applyCfg").onclick=()=>{
    const next=updateConfigCta();if(!next.changed)return false;
    if(hasProgress()&&typeof saveGame==="function")saveGame("before-setup-change",false);
    const cfg=saveConfigFor(MODE,next.cfg);
    const p=new URLSearchParams(location.search);
    p.set("mode",MODE);p.set("days",cfg.days);p.set("budget",cfg.budget);p.set("seed",SEED);p.set("flavor",ACTIVE_FLAVOR);
    p.set("autostart","1");
    if(MODE===0)p.set("stage",CLASSIC_STAGE);else p.delete("stage");
    location.search=p.toString();
    return true;
  };
  ov.querySelectorAll("button[data-stage]").forEach(b=>b.onclick=()=>{
    if(+b.dataset.stage===CLASSIC_STAGE)return false;
    if(hasProgress()&&typeof saveGame==="function")saveGame("before-stage-change",false);
    const p=new URLSearchParams(location.search);
    p.set("mode","0");p.set("stage",b.dataset.stage);p.set("days",DAYS);p.set("budget",DAILY);
    p.set("seed",SEED);p.set("flavor",ACTIVE_FLAVOR);p.set("autostart","1");location.search=p.toString();
  });
  ov.querySelectorAll("button[data-mode]").forEach(b=>b.onclick=()=>{
    const m=+b.dataset.mode;if(m===MODE)return false;
    if(hasProgress()&&typeof saveGame==="function")saveGame("before-mode-change",false);
    const cfg=savedConfigFor(m), p=new URLSearchParams(location.search);
    p.set("mode",m);p.set("days",cfg.days);p.set("budget",cfg.budget);p.set("seed",SEED);p.set("flavor",ACTIVE_FLAVOR);
    p.set("autostart","1");
    if(m===0)p.set("stage",m===MODE?CLASSIC_STAGE:1);else p.delete("stage");
    location.search=p.toString();
  });
}

function bin(){
  const hasTarget=S.slots.some(slot=>slot.alive&&!slot.c.brandPlay);
  const rows=S.bin.map((o,k)=>`<div class="binrow">
    <span class="nm">${o.name}</span>
    ${o.inspected?(o.flag?`<span class="tag flag">${o.flag}</span>`:'<span class="tag ok">clean</span>')
      :'<span class="tag">not inspected</span>'}
    <button class="btn" data-b="insp" data-k="${k}" ${o.inspected?"disabled":""}>Inspect</button>
    <button class="btn" data-b="ship" data-k="${k}" ${hasTarget?"":"disabled"}>${hasTarget?`Choose slot · ${money(scaledCost(1800))}`:"No eligible live slot"}</button>
  </div>`).join("");
  show(`<div class="eyebrow">Asset bin</div>
  <h2>Found assets</h2>
  <div class="prose"><p>Choose exactly which live ad slot receives the asset. Inspecting is free
  and takes no time; shipping an uninspected asset accepts its compliance risk.</p></div>
  <div class="bin">${rows}</div>
  <div class="row"><button class="btn wide" id="closeB">Back to the account</button></div>`,"compliance");
  document.getElementById("closeB").onclick=close;
  ov.querySelectorAll("button[data-b]").forEach(btn=>btn.onclick=()=>{
    const k=+btn.dataset.k, o=S.bin[k];
    if(btn.dataset.b==="insp"){o.inspected=true; bin(); return;}
    assetTargetPicker(k);
  });
}

function assetTargetPicker(assetIndex){
  const o=S.bin[assetIndex];if(!o)return false;
  const targets=S.slots.map((s,i)=>({s,i})).filter(({s})=>s.alive&&!s.c.brandPlay);
  if(!targets.length)return false;
  show(`<div class="eyebrow">Asset bin · choose delivery target</div><h2>${o.name}</h2>
    <div class="prose"><p>An <strong>asset</strong> replaces the creative inside the chosen <strong>ad slot</strong>. The slot's budget, platform, and account remain in place. Both measurement lenses are shown so a tracking gap cannot silently choose the target.</p></div>
    <div class="bin">${targets.map(({s,i})=>{const L=s.last;return `<div class="binrow"><span class="nm"><b>Slot ${i+1} · ${s.c.fam}</b><br><small>${L?`last-day modeled slot ROI ${L.actualRoi.toFixed(0)}% · attributed ad ROI ${L.roi.toFixed(0)}%`:`no delivery evidence yet`}</small></span><button class="btn" data-found-target="${assetIndex}" data-slot="${i}">Ship here · ${money(scaledCost(1800))}</button></div>`;}).join("")}</div>
    <div class="row"><button class="btn wide" id="closeB">Back to asset bin</button></div>`,"creative");
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
      fam:"Net-new concept",axes:"needs a multiplication plan",
      intent:"A newly sourced concept with no variation axes yet. Multiply it before fatigue exhausts it.",
      rarity:"Common",rarityClass:"common",satBonus:0,fatigueM:1};
    t.fatigue=6;t.multiplies=0;t.revealed=false;t.last=null;t.hist=[];t.restates=0;
    if(MODE>=4)t.offerAtSec=1+Math.floor(stateRoll("creative")*4);
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
    return `<button class="btn" data-i="${i}" data-j="${j}" style="text-align:left">
      <span class="tag ${c.rarityClass||"common"}">${c.rarity||"Common"}</span> ${c.fam} → slot ${j+1}
      <br><span style="color:var(--ink-dim);font-size:10px">${s.alive?"replaces "+s.c.fam:"revives this empty slot"}</span>
    </button>`;}).join(" ")).join("<br>");
  show(`<div class="eyebrow">Swap creative</div><h2>${Number.isInteger(slotIdx)?`Choose replacement creative for ad slot ${slotIdx+1}`:"Choose a replacement creative and target ad slot"}</h2>
    <div class="prose"><p>The <strong>ad</strong> remains the delivery object. The replacement <strong>creative</strong> is the image, video, and copy it carries. This trainer bundles both in a slot. The slot keeps its assigned allocation and, in Mode 4,
    its platform lane. Swapping resets creative fatigue; it does not create another campaign, platform ad account, or business container.</p></div>
    <div class="row" style="margin:10px 0">${opts}</div>
    <div class="row"><button class="btn wide" id="closeB">Not yet</button></div>`,"creative");
  document.getElementById("closeB").onclick=close;
  ov.querySelectorAll("button[data-i]").forEach(b=>b.onclick=()=>shipReady(+b.dataset.i,+b.dataset.j));
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
  <div class="prose"><p>Answer for 500 training points. The score never changes campaign economics. Skipping costs nothing —
  but the question comes back.</p></div>
  <div class="quiz"><input id="ans" autocomplete="off" placeholder="type your answer"></div>
  <div class="row" style="margin-top:10px">
    <button class="btn wide" id="sendA">Answer</button>
    <button class="btn wide" id="skipA">Skip</button>
  </div>`,"performance",{learning:false});
  const done=(ok)=>{
    if(ok){S.telemetry.recallRight++;S.knowledgeCredits=(S.knowledgeCredits||0)+500;}
    else{S.telemetry.recallWrong++; S.queue.push(q);}
    const celebration=ok?`<div class="quiz-result-correct" role="status" aria-live="polite" aria-atomic="true">
      <span class="quiz-result-mark" aria-hidden="true">✓</span><span><strong>Correct!</strong><small>+500 training points</small></span></div>`:"";
    show(`${celebration}<div class="eyebrow">${ok?"Correct answer":"Not quite"}</div>
      <h2 style="font-size:14px">${q.a[0]}</h2>
      <div class="prose"><p>${q.why}</p></div>
      <div class="row" style="margin-top:12px"><button class="btn wide" id="closeB">Carry on</button></div>`,"performance");
    document.getElementById("closeB").onclick=()=>{close();render();};
    if(ok&&typeof fireFx==="function")fireFx("quizCorrect",{points:500},{silent:true});
  };
  const answerInput=document.getElementById("ans"),submitAnswer=()=>done(recallMatches(answerInput.value,q.a));
  const answerButton=document.getElementById("sendA");answerButton.onclick=submitAnswer;
  answerInput.onkeydown=e=>{if(e.key==="Enter"){if(typeof e.preventDefault==="function")e.preventDefault();answerButton.click();}};
  document.getElementById("skipA").onclick=()=>{S.queue.push(q);close();};
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
  const v=[];
  const add=(cls,h,b)=>v.push(`<div class="verdict ${cls}"><div class="h">${h}</div>${b}</div>`);

  add(roi>=ROI_TARGET?"hit":roi>=ROI_TARGET-15?"watch":"miss","Result",
    `All-in business ROI <b class="${roi>=0?"pos":"neg"}">${roi.toFixed(1)}%</b> · media CPL <b>${S.leadsTotal?money2(cpl):"—"}</b> · `+
    `modeled contribution <b class="${profit>=0?"pos":"neg"}">${money(profit)}</b> · `+
    `settled value <b>${money(S.revenue)}</b> · unsettled <b class="${unsettled?"amb":""}">${money(unsettled)}</b>. `+
    (roi>=ROI_TARGET?`That clears the ${ROI_TARGET}% target.`
     :roi>=ROI_TARGET-15?`Profitable, but under the account's ${ROI_TARGET}% target. Look at where your spend sat.`
     :"Under target. Read the notes below before you re-run."));

  if(T.brandKilled&&!T.brandAsked)
    add("miss","You killed the brand play without asking",
      "The reach-network slot loses money on purpose — it buys cheap reach that pulls CPM down across every "+
      "other slot. You cut it before you knew that, so you paid full CPM for the rest of the run. "+
      `<b>The dashboard shows outcome, never intent.</b> ${lessonLink("03")}.`);
  else if(T.brandAsked)
    add("hit","You asked before you judged",
      "One question told you the reach-network line was a brand play, not a failing campaign. That instinct is "+
      `the core of ${lessonLink("03")} — it prevents a deliberate test from being judged against the wrong objective.`);
  else if(!T.brandKilled)
    add("watch","You left the brand play running without asking why",
      "It worked out — it was pulling CPM down for you. But you did not know that. Ask, so it is judgement "+
      `rather than luck. ${lessonLink("03")}.`);

  if(MODE<4){
    if(T.multiplies===0)
      add("miss","You never multiplied anything",
        `Fatigue ate your CTR all run. A ${money(scaledCost(600))} colour or state swap resets fatigue and lifts the `+
        `saturation ceiling — always cheaper than a new concept. <b>Cheap to multiply beats beautiful.</b> ${lessonLink("02")}.`);
    else if(T.multiplies>=4)
      add("hit","You multiplied instead of reinventing",
        `${T.multiplies} multiplies. The simulation rewards one proven concept cut along colour, state, size, demo, and offer. `+
        `${lessonLink("01")} · ${lessonLink("02")}.`);
  }

  if(T.flagsShipped>0)
    add("miss",`You shipped ${T.flagsShipped} asset(s) with a compliance flag`,
      "Each one cost two days and a penalty. Inspection is free and instant; external sourcing makes provenance, rights, visible marks, and likeness checks operational requirements. "+lessonLink("11")+".");
  else if(T.swaps>0)
    add("hit","Everything you shipped was clean",
      "Inspection happened before shipping. Keep that habit for third-party marks, recognizable people, claims, and usage rights. "+lessonLink("11")+".");

  if(T.requested>0&&T.swaps>0)
    add("hit",`You tested ${T.requested} creative(s) and completed ${T.swaps} swap(s)`,
      "That is the operating loop: source or request the creative, get it cleared, then choose the existing ad slot whose creative it replaces. The account, campaign, ad slot, and budget survive the swap; the creative and its fatigue do not.");
  else if(T.requested>0&&!T.swaps)
    add("miss","You made creative and never put it into an ad slot",
      "A card sitting in the lab earns nothing. Use Swap creative on the slot you want to refresh.");

  if(T.shadowReviews)
    add("miss",`Rapid scaling triggered ${T.shadowReviews} delivery review(s)`,
      "Jumping a slot more than 60% in one day can look anomalous to the platform. Scale in steps or keep another slot ready while the review clears.");

  if(T.pixelBreaks){
    if(T.pixelFixes)
      add("hit","You diagnosed and repaired the pixel",
        "You used the modeled outcome as the diagnostic reference, confirmed the attribution gap, and restored future measurement instead of punishing ads for missing data. Historical reporting stayed unchanged.");
    else
      add("watch","The pixel broke and you let it recover on its own",
        "Modeled value kept accruing while attributed reporting missed outcomes. Compare the two lenses, diagnose the gap, and repair future measurement before optimizing.");
  }

  if(T.knee>=3)
    add("miss",`You changed budgets ${T.knee} times right after a single bad day`,
      "Day-to-day noise in this sim is deliberately high. Reacting to one day can churn a winner. Judge across an evidence window. "+lessonLink("05")+".");
  else
    add("hit","You did not panic on single-day dips",
      "Noise was ±18% and you held. That patience is most of the job.");

  if(T.asks>=4)
    add("hit","You asked a lot",
      `${T.asks} questions. ${lessonLink("08")} turns that instinct into a repeatable intake and decision-rights process.`);

  if(MODE>=2){
    if(T.pendingPanic>=3)
      add("miss","You chased unsettled revenue",
        `Revenue lands ${MODE>=4?"1-3":"2-3"} days after the leads do, so the headline number always lags what your slots `+
        "are actually earning. You moved budget on the lagging figure "+T.pendingPanic+" times. Read the "+
        "slot funnels and the 3-day movement, not the cumulative line.");
    else
      add("hit","You read through the settlement lag",
        "You did not panic at a headline that was always behind reality. That is the Mode 2 lesson.");
  }
  if(MODE>=3){
    if(T.emptySlotDays>=6)
      add("miss",`You ran on empty slots for ${T.emptySlotDays} slot-days`,
        "Creative takes 2-4 days to build and another to clear review, and each slot only multiplies "+
        "twice before its axes are exhausted. Empty slots earn nothing — request before you need it.");
    else
      add("hit","You kept the pipeline ahead of demand",
        `Only ${T.emptySlotDays} slot-days idle. You requested creative before you were forced to.`);
    if(T.rejected)
      add("watch",`${T.rejected} request(s) came back Not Approved`,
        "That is normal and it is why you keep more than one thing in flight. "+
        `${T.revisions} came back with revisions.`);
  }
  if(MODE>=4){
    if(T.overlapDays>=4)
      add("miss",`You ran two slots on the same platform for ${T.overlapDays} slot-days`,
        "Their audiences overlap, so the second one mostly re-served people the first already "+
        "reached and triggered the simulation's synthetic CPM overlap penalty. The lesson is to compare deduplicated reach and marginal delivery, not to add campaign reach totals.");
    if(T.concentrated>=5)
      add("miss",`You put over 45% of the budget on one platform on ${T.concentrated} day(s)`,
        "A rival notices and bids you up — CPM +18% whenever one platform carries more than 45% "+
        "of your spend. Spread it or pay for the concentration.");
    if(T.restates && !T.recasts)
      add("miss","You restated but never recast",
        "A new state name buys relevance, not fresh attention. Only a new face resets fatigue. "+
        "You kept swapping the place while the same worn-out creative kept running.");
    else if(T.recasts>=2)
      add("hit","You recast, not just restated",
        "You understood that geography buys relevance and a new face buys attention. They are "+
        "different purchases.");
    const late=S.slots.filter(s=>(s.offerAtSec||1)>2).length;
    if(late)
      add("watch",`${late} slot(s) still revealed the offer after 2 seconds`,
        "In this training model, every second after the first applies a 13% click-to-lead CVR haircut. "+
        "Moving the offer earlier removes that declared penalty; the simulator does not claim a measured platform completion rate.");
    add("watch","Platform archetypes are training constraints",
      "Mode 4 deliberately exaggerates different lane behaviors—fatigue, attribution loss, audience overlap, "+
      "intent quality and concentration risk. They are game physics, not forecasts or platform benchmarks.");
  }
  if(unattributedEarned>0)
    add("watch","Modeled value and ad attribution did not fully reconcile",
      `${money(unattributedEarned)} of modeled earned value had no clean ad-level claim. Pixel loss and deliberately incomplete reporting can create that gap. ${lessonLink("07")}.`);
  add("watch","Recall",
    `${T.recallRight} right, ${T.recallWrong} wrong · ${S.knowledgeCredits||0} training points. Missed questions returned for spaced practice. ${lessonLink("06")}.`);

  show(`<div class="eyebrow">Debrief · day ${DAYS} of ${DAYS}</div>
    <h2>What the run reveals</h2>
    <div class="prose" style="margin-bottom:10px"><p>Each line below ties a thing you actually did to the
    relevant Field Guide lesson.</p></div>
    ${v.join("")}
    <div class="row" style="margin-top:14px">
      <button class="btn wide" id="again">Run it again — same seed</button>
      <button class="btn wide" id="newseed">New seed</button>
      <button class="btn wide" id="debriefMenu">Main menu</button>
    </div>
    <div class="prose" style="margin-top:10px;font-size:12px">Same seed replays the same day, slot, and metric-level random conditions. Keeping the setup fixed creates a controlled strategy comparison while preserving the real downstream effects of each decision.</div>`,"performance");
  pendingDayFx=[];
  fireFx(roi>=ROI_TARGET?"success":"fail",roi>=ROI_TARGET
    ?{kicker:"Account objective complete",value:"TARGET CLEARED",sub:`ROI ${roi.toFixed(1)}% · contribution ${money(profit)}`}
    :{kicker:"Account objective missed",value:"RUN FAILED",sub:`ROI ${roi.toFixed(1)}% · target ${ROI_TARGET}%`});
  document.getElementById("again").onclick=()=>{clearFx();resetRng();fresh();close();render();};
  document.getElementById("debriefMenu").onclick=mainMenu;
  document.getElementById("newseed").onclick=()=>{
    const n=Math.max(1,Math.floor(rnd()*9000));
    const p=new URLSearchParams(location.search);
    p.set("seed",n);p.set("mode",MODE);p.set("days",DAYS);p.set("budget",DAILY);p.set("flavor",ACTIVE_FLAVOR);
    location.search=p.toString();
  };
}
