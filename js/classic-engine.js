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
 {name:"Commercial Concrete Contractors", core:"commercial concrete contractors",
  intent:"ready",    vol:520, baseCVR:7.2, value:95,
  note:"Tightly themed and high intent. The money is here if you can afford the position."},
 {name:"Concrete Contractors Near Me", core:"concrete contractors near me",
  intent:"ready",    vol:880, baseCVR:5.4, value:85,
  note:"Local intent, more volume, slightly cheaper leads."},
 {name:"Concrete Patio Cost", core:"concrete patio cost",
  intent:"research", vol:1450, baseCVR:2.1, value:70,
  note:"Price research. Real buyers, earlier in the funnel — cheap clicks, patient money."},
 /* the wainscoting third scenario, transplanted: looks mid-funnel, is a DIY-er */
 {name:"How To Pour A Concrete Slab", core:"how to pour a concrete slab",
  intent:"diy",      vol:2600, baseCVR:0.25, value:70,
  note:"Huge volume and a great click-through rate. Read the intent before you fund it."}];

const JUNK_TERMS=["concrete contractor jobs","concrete calculator free","how much does a bag of "+
 "concrete weigh","concrete poem examples","cement vs concrete reddit","diy concrete countertop",
 "concrete contractor salary","minecraft concrete recipe"];

function freshClassic(){
  S={ classic:true, stage:CLASSIC_STAGE, day:1, seedShown:SEED,
      budget:CLASSIC_BUDGET, delivery:"standard",
      spendTotal:0, convReported:0, convActual:0, valueTotal:0, reportedValueTotal:0, clicksTotal:0, wasteTotal:0,
      knowledgeCredits:0,log:[], queue:shuffle(RECALL.slice()), asks:1,
      groups:AD_GROUPS.map((g,i)=>({...g, match:(i===3?"broad":"phrase"), maxCPC:2.50, qs:6,
        negatives:0, paused:false, split:false, last:null,lastRewriteDay:0,
        trackingBroken:(CLASSIC_STAGE>=2 && i===1)})),
      terms:[], compBid:1.0,
      client:{trust:62, baseline:100, promised:null, grievance:"the last agency never explained "+
        "what they were doing", grievanceHandled:false, amNoted:false, calls:0, budgetCut:false},
      telemetry:{negAdded:0, bidMoves:0, thinBidMoves:0, adRewrites:0, splits:0, trackingChecked:false,
                 overPromised:false, speculated:false, sisMisread:0, acceleratedDays:0,recallRight:0,recallWrong:0} };
}

function classicSeason(day){                       // "is my client's business seasonal?"
  if(S.stage<2) return 1;
  return 0.82+0.34*Math.sin((day/CLASSIC_DAYS)*Math.PI);   // concrete: soft winter, strong summer
}
const MATCH={exact:{reach:0.30,junk:0.02,cvrM:1.20},
             phrase:{reach:0.62,junk:0.16,cvrM:1.00},
             broad:{reach:1.00,junk:0.46,cvrM:0.72}};

function runDayClassic(){
  if(!S||S.day>CLASSIC_DAYS)return false;
  const lines=[];const season=classicSeason(S.day),accelerated=S.stage>=2&&S.delivery==="accelerated";
  if(S.stage>=3){ S.compBid=Math.min(2.2, S.compBid*1.018); }   // competitors escalate
  let daySpend=0, dayConvA=0, dayConvR=0, dayValA=0, dayValR=0, dayClicks=0, dayWaste=0;
  const active=S.groups.filter(g=>!g.paused);
  const wantSpend=active.reduce((a,g)=>a+g.maxCPC*g.vol*0.05,0);
  const budgetRatio=Math.min(1, S.budget/Math.max(1,wantSpend));   // budget-capped delivery
  active.forEach(g=>{
    const M=MATCH[g.match];
    // Avg Position from bid x Quality Score. Lower number = higher on the page.
    const strength=(g.maxCPC*g.qs)/(S.compBid*6);
    const avgPos=Math.max(1, Math.min(4.2, 4.4-2.6*Math.min(1.6,strength)));
    const sisRank=Math.max(0, Math.min(1, (strength-0.35)/0.9));   // share reachable at this rank
    const sis=sisRank*budgetRatio;
    const lostRank=Math.max(0,1-sisRank), lostBudget=Math.max(0,sisRank*(1-budgetRatio));
    const impr=g.vol*M.reach*sis*season;
    const ctr=(0.085-0.014*(avgPos-1))*(0.7+g.qs*0.05)*(g.intent==="diy"?1.9:1);
    const clicks=Math.max(0,impr*ctr);
    // second-price-ish: you pay a little under your bid
    const cpc=Math.min(g.maxCPC,S.compBid*(0.72+keyedRandom(SEED,"classic-cpc",S.day,g.name)*0.30));
    let spend=clicks*cpc;
    if(accelerated){spend*=1.14;}  // burns faster, catches worse traffic
    const junkShare=Math.max(0,M.junk-g.negatives*0.045)*(accelerated?1.12:1);
    const wasted=clicks*junkShare;
    const good=clicks-wasted;
    const convA=good*(g.baseCVR/100)*M.cvrM*season*(accelerated?0.93:1);
    const convR=g.trackingBroken?convA*0.35:convA;   // the website isn't tracking properly
    const valA=convA*g.value,valR=convR*g.value;
    g.last={impr,clicks,cpc,spend,avgPos,sis,lostRank,lostBudget,wasted,convA,convR,val:valA,valA,valR,
            cpa:convR>0?spend/convR:0,roas:spend>0?valR/spend:0,
            roasReported:spend>0?valR/spend:0,roasModeled:spend>0?valA/spend:0};
    daySpend+=spend;dayConvA+=convA;dayConvR+=convR;dayValA+=valA;dayValR+=valR;dayClicks+=clicks;dayWaste+=wasted;
    if(S.stage>=3 && !g.split) g.qs=Math.max(3, g.qs-0.045);   // stale copy decays
  });
  /* The old approximation could report spend above the account budget, especially with
     accelerated delivery. Scale delivery proportionally so the chosen cap is a real cap. */
  if(daySpend>S.budget){
    const scale=S.budget/daySpend;
    daySpend=0;dayConvA=0;dayConvR=0;dayValA=0;dayValR=0;dayClicks=0;dayWaste=0;
    active.forEach(g=>{const L=g.last;
      ["impr","clicks","spend","wasted","convA","convR","val","valA","valR"].forEach(k=>{L[k]*=scale;});
      L.sis*=scale;L.lostBudget=Math.max(0,(1-L.lostRank)-L.sis);
      L.cpa=L.convR?L.spend/L.convR:0;L.roasReported=L.spend?L.valR/L.spend:0;
      L.roasModeled=L.spend?L.valA/L.spend:0;L.roas=L.roasReported;
      daySpend+=L.spend;dayConvA+=L.convA;dayConvR+=L.convR;dayValA+=L.valA;dayValR+=L.valR;
      dayClicks+=L.clicks;dayWaste+=L.wasted;
    });
  }
  // junk search terms surface for the player to negative out
  if(dayWaste>1&&S.terms.length<8&&keyedRandom(SEED,"classic-term-surface",S.day)<0.75){
    const t=JUNK_TERMS[Math.floor(keyedRandom(SEED,"classic-term-choice",S.day)*JUNK_TERMS.length)];
    if(!S.terms.includes(t)) S.terms.push(t);
  }
  S.spendTotal+=daySpend; S.convActual+=dayConvA; S.convReported+=dayConvR;
  S.valueTotal+=dayValA;S.reportedValueTotal+=dayValR;S.clicksTotal+=dayClicks;S.wasteTotal+=dayWaste;
  if(accelerated)S.telemetry.acceleratedDays++;
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
function renderClassic(){
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
    const L=g.last;
    const sisBar=L?`SIS <b>${(L.sis*100).toFixed(0)}%</b> · lost to rank
      <b class="${L.lostRank>0.35?"neg":""}">${(L.lostRank*100).toFixed(0)}%</b> · lost to budget
      <b class="${L.lostBudget>0.25?"neg":""}">${(L.lostBudget*100).toFixed(0)}%</b>`:"";
    return `<div class="slot ${g.paused?"dead":""}">
      <div><div class="fam">Ad group ${i+1} · ${g.match} match${g.split?" · split out":""}</div>
        <h3>${g.name}</h3><div class="metaphor-inline">Ad group ≈ ${ft.group} · Keyword ≈ ${ft.keyword} · Bid ≈ ${ft.bid}</div></div>
      <div class="row"><span class="tag">[${g.core}]</span>
        <span class="tag">QS ${g.qs.toFixed(1)}</span>
        <span class="tag">neg x${g.negatives}</span></div>
      <div class="grid2">
        <span>Max CPC</span><span>${money2(g.maxCPC)}</span>
        <span>Avg Pos</span><span>${L?L.avgPos.toFixed(1):"—"}</span>
        <span>Avg CPC</span><span>${L?money2(L.cpc):"—"}</span>
        <span>Wasted</span><span>${L?Math.round(L.wasted):"—"}</span>
      </div>
      <div class="metaphor-inline">Bid ≈ ${ft.bid} · Quality Score ≈ ${ft.quality} · CPA ≈ ${flavor.metrics.cpa} · ROAS ≈ ${flavor.metrics.roas}</div>
      <div class="funnel">${L?
        `${Math.round(L.impr)} impr → <b>${Math.round(L.clicks)}</b> clicks →
         <b>${L.convR.toFixed(1)}</b> reported conv · CPA <b>${L.cpa?money2(L.cpa):"—"}</b> ·
         reported ROAS <b class="${L.roasReported>=2?"pos":"neg"}">${L.roasReported.toFixed(2)}</b>${S.telemetry.trackingChecked&&Math.abs(L.roasModeled-L.roasReported)>.01?` · modeled ${L.roasModeled.toFixed(2)}`:""}<br>${sisBar}`
        :`<span style="color:var(--ink-dim)">no delivery yet</span>`}</div>
      <div class="fam" style="color:var(--ink-dim)">${g.note}</div>
      <div class="spendline">
        <button class="btn" data-ca="bid-" data-i="${i}" ${g.maxCPC<=.25?"disabled":""}>− bid</button>
        <span class="amt">${money2(g.maxCPC)}</span>
        <button class="btn" data-ca="bid+" data-i="${i}" ${g.maxCPC>=8?"disabled":""}>+ bid</button>
      </div>
      <div class="row">
        <button class="btn wide" data-ca="match" data-i="${i}">Match: ${g.match} →</button>
        <button class="btn wide" data-ca="rewrite" data-i="${i}" ${(g.qs>=10||g.lastRewriteDay===S.day)?"disabled":""}>${g.qs>=10?"Rewrite complete · QS max":g.lastRewriteDay===S.day?"Rewrite used this day":"Rewrite ad · QS+1 · once/day"}</button>
      </div>
      <div class="row">
        <button class="btn wide" data-ca="split" data-i="${i}" ${g.split?"disabled":""}>Split out</button>
        <button class="btn wide" data-ca="pause" data-i="${i}">${g.paused?"Enable":"Pause"}</button>
      </div>
    </div>`;}).join("");
  document.getElementById("log").innerHTML=renderLog(S.log,
    '<div style="color:var(--ink-dim)">Set your bids and match types, then run a day.</div>');
  document.getElementById("binBtn").style.display="none";
  document.getElementById("asksRow").style.display="none";
  document.getElementById("accountBox").innerHTML=`<div class="eyebrow">What you are changing</div>
    <div class="eventcard"><div class="eventtitle">Account → campaign → ad groups → ads</div>
    <div class="eventbody">The ${money(S.budget)} number is an account-wide simulation cap; real Google Ads budgets normally sit at campaign level or in a shared campaign budget. Each card below is an ad group.
    Max CPC and match type steer that group's delivery; Rewrite changes its ad; Split out changes campaign structure.
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
      ${S.stage>=2?`<button class="btn wide" id="delivBtn">Delivery: ${S.delivery}</button>`:`<div class="note">Accelerated delivery unlocks in Stage 2. Stage 1 always uses standard pacing.</div>`}
      <button class="btn wide" id="trackBtn" ${S.telemetry.trackingChecked?"disabled":""}>Check tracking</button>
    </div>`;
  const nb=document.getElementById("negBtn");
  if(nb) nb.onclick=()=>{ const n=S.terms.length; S.groups.forEach(g=>{g.negatives+=n;});
    S.telemetry.negAdded+=n; S.terms=[];
    addLog(`<div><b>Negatives</b> — ${n} junk term(s) excluded across every ad group</div>`,"search");
    renderClassic(); };
  const db=document.getElementById("delivBtn");
  if(db)db.onclick=()=>{if(S.stage<2)return false;S.delivery=(S.delivery==="standard")?"accelerated":"standard";renderClassic();return true;};
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

document.getElementById("slots").addEventListener("click",e=>{
  const b=e.target.closest("button[data-ca]"); if(!b) return;
  const i=+b.dataset.i, g=S.groups[i], T=S.telemetry;
  switch(b.dataset.ca){
    case "bid+": case "bid-": {
      if((b.dataset.ca==="bid-"&&g.maxCPC<=.25)||(b.dataset.ca==="bid+"&&g.maxCPC>=8))break;
      const clicks=g.last?g.last.clicks:0;
      if(clicks>0 && clicks*Math.max(1,S.day-1)<30) T.thinBidMoves++;   // thin data
      g.maxCPC=Math.max(.25,Math.min(8,g.maxCPC+(b.dataset.ca==="bid+"?.35:-.35)));
      T.bidMoves++; break; }
    case "match": {
      const order=["exact","phrase","broad"];
      g.match=order[(order.indexOf(g.match)+1)%3]; break; }
    case "rewrite": if(g.qs>=10||g.lastRewriteDay===S.day)break;
      g.qs=Math.min(10,g.qs+1);g.lastRewriteDay=S.day;T.adRewrites++;
      addLog(`<div><b>Ad rewritten</b> in ${g.name} — Quality Score up</div>`,"search"); break;
    case "split": if(g.split)break;
      g.split=true; g.qs=Math.min(10,g.qs+0.5); T.splits++;
      addLog(`<div><b>Split out</b> ${g.name} into its own campaign for tighter control. `+
        `It still sits inside the account-wide simulation cap of ${money(S.budget)}/day.</div>`,"structure"); break;
    case "pause": g.paused=!g.paused; break;
  }
  renderClassic();
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
  const diy=S.groups[3];
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
