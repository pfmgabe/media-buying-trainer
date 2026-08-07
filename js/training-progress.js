"use strict";

/* Training progress lives outside simulation state. It may observe a completed run, but it
   never changes delivery, RNG, budgets, outcomes, client trust or a win condition. The event
   shape is deliberately close to the future server contract; this static build marks every
   record as local practice until authenticated, replay-verified accounts exist. */
const TRAINING_PROGRESS_SCHEMA=1,TRAINING_POLICY_VERSION=1,TRAINING_EVENT_LIMIT=240;
const TRAINING_DISCIPLINES=Object.freeze([
  Object.freeze({id:"account",mark:"🧭",label:"Account & funnel fundamentals",short:"Account fundamentals",
    copy:"Read the business goal, separate an ad from its creative and follow the funnel from delivery to business outcome.",mode:1}),
  Object.freeze({id:"search",mark:"🔎",label:"Paid search",short:"Paid search",
    copy:"Diagnose queries, match types, bids, Quality Score components, landing pages and finite search demand.",mode:0}),
  Object.freeze({id:"social",mark:"📣",label:"Paid social",short:"Paid social",
    copy:"Create demand with hooks, audiences and offers while managing learning, fatigue and interruption-based traffic.",mode:1}),
  Object.freeze({id:"creative",mark:"🎬",label:"Creative operations",short:"Creative operations",
    copy:"Distinguish rewrites from controlled permutations, plan production lead time and replace tired work deliberately.",mode:3}),
  Object.freeze({id:"measurement",mark:"📡",label:"Measurement & attribution",short:"Measurement",
    copy:"Separate business outcomes from platform claims, diagnose tracking gaps and preserve the historical record.",mode:2}),
  Object.freeze({id:"finance",mark:"💳",label:"Working capital",short:"Working capital",
    copy:"Keep profit, earned value, receivables, settled cash and credit capacity on the right clocks.",mode:2}),
  Object.freeze({id:"clients",mark:"🤝",label:"Client leadership",short:"Client leadership",
    copy:"Communicate evidence, learn a client's decision style and keep explicit working agreements after tense moments.",mode:0}),
  Object.freeze({id:"channels",mark:"🛰️",label:"Cross-platform allocation",short:"Channel allocation",
    copy:"Compare different buying lanes without mistaking a local platform win for a healthy overall account.",mode:4}),
  Object.freeze({id:"portfolio",mark:"🏢",label:"Portfolio & agency operations",short:"Portfolio operations",
    copy:"Manage concentration, shared systems, capacity, liquidity and organizational risk across several accounts.",mode:5})
]);
const TRAINING_DISCIPLINE_BY_ID=Object.freeze(Object.fromEntries(TRAINING_DISCIPLINES.map(item=>[item.id,item])));
const TRAINING_MODE_DISCIPLINES=Object.freeze({
  0:Object.freeze(["search","clients"]),1:Object.freeze(["account","social"]),2:Object.freeze(["finance","measurement"]),
  3:Object.freeze(["creative","social"]),4:Object.freeze(["channels","account"]),5:Object.freeze(["portfolio","measurement"]),
  6:Object.freeze(["portfolio","clients"])
});
const TRAINING_LEVELS=Object.freeze([
  Object.freeze({level:1,xp:0,title:"New arrival"}),Object.freeze({level:2,xp:1000,title:"Foundation builder"}),
  Object.freeze({level:3,xp:2500,title:"Campaign operator"}),Object.freeze({level:4,xp:5000,title:"Media buyer"}),
  Object.freeze({level:5,xp:9000,title:"Senior buyer"}),Object.freeze({level:6,xp:14000,title:"Portfolio strategist"}),
  Object.freeze({level:7,xp:20000,title:"Moonshot director"})
]);
const TRAINING_SKILL_LEVELS=Object.freeze([
  Object.freeze({xp:0,label:"Not started"}),Object.freeze({xp:500,label:"Introduced"}),
  Object.freeze({xp:1500,label:"Practiced"}),Object.freeze({xp:3500,label:"Demonstrated"}),
  Object.freeze({xp:6500,label:"Advanced"}),Object.freeze({xp:10000,label:"Mastery"})
]);

/* The first question in each discipline forms the optional placement check. Questions stay
   multiple-choice so their answer contract is stable across display density and analogy flavor. */
const TRAINING_QUESTIONS=Object.freeze([
  Object.freeze({id:"account-ad-creative",discipline:"account",tier:0,prompt:"What is the most accurate relationship between an ad and its creative?",
    choices:["They are two names for the same thing.","The ad is the delivery object; the creative is the message or asset it carries.","The creative owns the ad account.","The ad is the business's final outcome."],answer:1,
    why:"An ad is a delivery object inside campaign structure. Creative is the image, video and copy attached to it. Replacing creative does not automatically create another campaign, account or pixel."}),
  Object.freeze({id:"account-two-scoreboards",discipline:"account",tier:1,minXp:500,prompt:"One ad reports a strong return, but the full account is unprofitable after operating costs. Which scoreboard controls the business decision?",
    choices:["The ad's return alone","The full account's all-in result","Whichever number is green","Click-through rate"],answer:1,
    why:"A local winner can coexist with an unhealthy account. Use the ad result to diagnose the component, but use the account's all-in objective to judge the business result."}),

  Object.freeze({id:"search-rank-budget",discipline:"search",tier:0,prompt:"Search impression share is being lost mostly to rank, not budget. What should you diagnose first?",
    choices:["Raise the daily budget only","Bid and relevance pressure","Creative fatigue on a social video","Invoice collection timing"],answer:1,
    why:"Loss to rank points toward auction pressure, bid or relevance. Loss to budget points toward the spending cap. The two losses call for different remedies."}),
  Object.freeze({id:"search-quality-components",discipline:"search",tier:1,minXp:500,prompt:"Which set names the three Quality Score diagnostics represented in Search Desk?",
    choices:["Reach, frequency and fatigue","Expected click-through rate, ad relevance and landing-page experience","Budget, profit and cash","Impressions, leads and revenue"],answer:1,
    why:"Quality Score is represented as a keyword-level diagnostic built from expected click-through rate, ad relevance and landing-page experience. Raising a bid does not improve those components."}),

  Object.freeze({id:"social-interruption",discipline:"social",tier:0,prompt:"Why can paid social produce many inexpensive clicks without producing enough valuable outcomes?",
    choices:["Every social click is fraudulent.","The ad interrupts people who may respond to the hook without having strong purchase intent.","Paid social never uses creative.","A low cost per click guarantees a high conversion rate."],answer:1,
    why:"Paid social often creates or interrupts demand. A compelling hook can earn a click before the user has strong intent, so downstream quality must be read separately."}),
  Object.freeze({id:"social-fatigue",discipline:"social",tier:1,minXp:500,prompt:"A proven social concept is tiring, but its underlying message still converts. What is the cleanest first test?",
    choices:["Delete the ad account","Change one controlled creative axis","Triple every campaign budget","Repair an unrelated pixel"],answer:1,
    why:"A controlled variation can refresh attention while preserving the concept. It creates a clearer comparison than changing the message, audience and budget at once."}),

  Object.freeze({id:"creative-rewrite-variation",discipline:"creative",tier:0,prompt:"What is the difference between rewriting an ad and creating a controlled permutation?",
    choices:["There is no difference.","A rewrite replaces the message; a permutation preserves the core concept and changes one declared axis.","A permutation always changes the platform.","A rewrite only changes the budget."],answer:1,
    why:"A rewrite tests substantially different wording or positioning. A controlled permutation keeps the underlying idea and changes one named variable, which makes the result easier to interpret."}),
  Object.freeze({id:"creative-pipeline",discipline:"creative",tier:1,minXp:500,prompt:"A live ad will probably burn out in two days, while new work takes three days to build and review. What should happen now?",
    choices:["Wait for the ad to fail","Start the replacement before the gap opens","Turn off all delivery immediately","Assume review will finish early"],answer:1,
    why:"Creative operations are a pipeline problem. Production must begin before the current supply is exhausted, with enough redundancy for revision or rejection."}),

  Object.freeze({id:"measurement-claims",discipline:"measurement",tier:0,prompt:"Three platforms each claim credit for one customer outcome. How many business outcomes were necessarily created?",
    choices:["Three","One","Four","The platform total always decides"],answer:1,
    why:"Several platforms can claim the same outcome. Platform attribution is a credit system; it does not manufacture another sale, lead or receivable."}),
  Object.freeze({id:"measurement-pixel-repair",discipline:"measurement",tier:1,minXp:500,prompt:"A pixel is repaired after missing outcomes for three days. What should the repair change?",
    choices:["Rewrite the historical business ledger","Improve future measurement while preserving the historical gap","Create replacement revenue","Erase every platform claim"],answer:1,
    why:"A repair improves future signal. It should not invent historical outcomes or silently rewrite the period that was measured poorly."}),

  Object.freeze({id:"finance-profit-cash",discipline:"finance",tier:0,prompt:"A campaign earned profitable value today, but the advertiser pays in three days. What increased today?",
    choices:["Settled cash only","Earned value and a pending receivable","The credit limit automatically","Nothing at all"],answer:1,
    why:"Profitability and liquidity run on different clocks. The outcome can be earned now while cash remains pending until settlement."}),
  Object.freeze({id:"finance-credit",discipline:"finance",tier:1,minXp:500,prompt:"Why can a profitable portfolio still suffer a failed-payment pause?",
    choices:["Profit and cash are always identical.","Spend can consume available credit before receivables settle.","A high MER eliminates billing.","Platforms wait for every customer payment."],answer:1,
    why:"Working capital bridges the gap between platform billing and incoming collections. Positive economics do not prevent a temporary cash or credit bottleneck."}),

  Object.freeze({id:"client-quality-diagnosis",discipline:"clients",tier:0,prompt:"A client reports weaker lead quality while front-end volume is stable. What is the strongest first response?",
    choices:["Promise that a new ad account will fix it","Name the evidence gap and test intent, geography, creative and signal quality separately","Blame the pixel immediately","Ignore the report until volume falls"],answer:1,
    why:"Lead quality can shift for several reasons. A useful response acknowledges the concern, separates plausible layers and proposes a test that can distinguish them."}),
  Object.freeze({id:"client-commitment",discipline:"clients",tier:1,minXp:500,prompt:"Why does an explicit client commitment matter after a tense conversation?",
    choices:["It replaces performance data.","It turns reassurance into a checkable action and review point.","It guarantees renewal.","It removes the need for another update."],answer:1,
    why:"Trust grows when the stated next action is completed and reported. A commitment is an operating obligation, not a substitute for evidence."}),

  Object.freeze({id:"channels-local-account",discipline:"channels",tier:0,prompt:"One platform lane has the account's best reported return, but it holds most of the budget and shares an audience with another lane. What should you review next?",
    choices:["Only that platform's headline return","Marginal efficiency, overlap and account-wide concentration","The logo color","The client's invoice font"],answer:1,
    why:"A local winner can become less efficient at the margin or create concentration and overlap risk. The next dollar matters more than the historical average alone."}),
  Object.freeze({id:"channels-intent-interruption",discipline:"channels",tier:1,minXp:500,prompt:"Why should a search campaign and a short-form social campaign not be judged by identical operating rules?",
    choices:["They use different currencies.","Search captures finite expressed intent; social creates demand and depends more heavily on creative velocity.","Search has no auction.","Social has unlimited fresh attention."],answer:1,
    why:"The channels solve different demand problems. Search is constrained by queries and auction rank; social is constrained more by creative response, audience freshness and fatigue."}),

  Object.freeze({id:"portfolio-shared-signal",discipline:"portfolio",tier:0,prompt:"Two unrelated advertiser workstreams share one event-source cluster. What is the main operational risk?",
    choices:["Both campaigns receive free budget.","Low-quality activity can contaminate shared optimization and attribution signals.","Search volume doubles automatically.","Creative fatigue disappears."],answer:1,
    why:"Shared data can leak across workstreams. Weak traffic, mistaken permissions or cross-account claims can degrade decisions beyond the campaign that created them."}),
  Object.freeze({id:"portfolio-agency-revenue",discipline:"portfolio",tier:1,minXp:500,prompt:"An agency manages $200,000 in client media spend and earns a $12,000 retainer. Which amount is agency revenue?",
    choices:["$212,000","$200,000","$12,000","The platform-reported value"],answer:2,
    why:"Client media spend belongs to the advertiser's campaign economics. The agency's retainer and earned fees are agency revenue; payroll, tools and service costs determine agency profit."})
]);
const TRAINING_QUESTION_BY_ID=Object.freeze(Object.fromEntries(TRAINING_QUESTIONS.map(item=>[item.id,item])));
const TRAINING_PLACEMENT_IDS=Object.freeze(TRAINING_DISCIPLINES.map(discipline=>
  TRAINING_QUESTIONS.find(question=>question.discipline===discipline.id&&question.tier===0)?.id).filter(Boolean));
const TRAINING_RECALL_FALLBACK=Object.freeze({
  "cpl stands for?":"recall-cpl","epl stands for?":"recall-epl",
  "which is the scoreboard — ctr or profit?":"recall-scoreboard",
  "lp ctr measures the pull of the ad or the landing page?":"recall-lpctr",
  "which concept change usually costs the least?":"recall-cheapest-change",
  "a campaign losing money during the current window is always failing. true or false?":"recall-window-objective"
});

const TrainingProgress=(()=>{
  let activeProfileId=null,progress=null,currentRun=null,storageHealthy=true,returnTarget="game";
  const memory=new Map();
  const clampInt=(value,min=0,max=10000000)=>Math.max(min,Math.min(max,Math.floor(Number(value)||0)));
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const profileId=value=>typeof PROFILE_DB!=="undefined"&&PROFILE_DB[value]?value:"general";
  const keyFor=value=>`ttm.training.${profileId(value)}.v${TRAINING_PROGRESS_SCHEMA}`;
  const now=()=>{try{return new Date().toISOString();}catch(e){return "";}};
  function uid(prefix="event"){
    try{if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return `${prefix}-${crypto.randomUUID()}`;}catch(e){}
    try{if(typeof crypto!=="undefined"&&typeof crypto.getRandomValues==="function"){const bytes=new Uint32Array(4);crypto.getRandomValues(bytes);return `${prefix}-${Array.from(bytes,n=>n.toString(36)).join("-")}`;}}catch(e){}
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  }
  function hash(value){let h=2166136261;for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function blank(id){return {schema:TRAINING_PROGRESS_SCHEMA,policyVersion:TRAINING_POLICY_VERSION,profileId:profileId(id),revision:0,
    installationId:installationId(),totalXp:0,disciplines:Object.fromEntries(TRAINING_DISCIPLINES.map(item=>[item.id,{xp:0,attempts:0,correct:0,skipped:0}])),
    questions:{},runs:{},scenarios:{},byMode:{},firstClears:{},awards:{},events:[],
    placement:{completed:false,answered:[]},migrations:{legacyKnowledgeV1:false},updatedAt:null};}
  function installationId(){const key="ttm.training.installation.v1";try{let value=localStorage.getItem(key);if(value)return value;
      value=uid("installation");localStorage.setItem(key,value);return value;}catch(e){return uid("installation-memory");}}
  function safeMap(raw){return raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};}
  function normalize(raw,id){const base=blank(id),source=safeMap(raw);base.revision=clampInt(source.revision,0,1e9);
    base.installationId=typeof source.installationId==="string"&&source.installationId?source.installationId:base.installationId;
    for(const discipline of TRAINING_DISCIPLINES){const value=safeMap(source.disciplines?.[discipline.id]);base.disciplines[discipline.id]={
      xp:clampInt(value.xp),attempts:clampInt(value.attempts,0,1e6),correct:clampInt(value.correct,0,1e6),skipped:clampInt(value.skipped,0,1e6)};}
    const questions=safeMap(source.questions);for(const [id,value] of Object.entries(questions).slice(0,500)){const item=safeMap(value),scenarios={};
      for(const [scenario,stats] of Object.entries(safeMap(item.scenarios)).slice(0,250)){const stat=safeMap(stats);scenarios[scenario]={attempts:clampInt(stat.attempts,0,1000),correct:!!stat.correct,skipped:clampInt(stat.skipped,0,1000)};}
      base.questions[id]={discipline:TRAINING_DISCIPLINE_BY_ID[item.discipline]?item.discipline:"account",attempts:clampInt(item.attempts,0,1e6),
        correct:clampInt(item.correct,0,1e6),wrong:clampInt(item.wrong,0,1e6),skipped:clampInt(item.skipped,0,1e6),scenarios};}
    for(const [id,value] of Object.entries(safeMap(source.runs)).slice(-1000))base.runs[id]=safeMap(value);
    for(const [id,value] of Object.entries(safeMap(source.scenarios)).slice(-1000))base.scenarios[id]={completions:clampInt(value?.completions,0,1000),wins:clampInt(value?.wins,0,1000)};
    for(const [id,value] of Object.entries(safeMap(source.byMode)).slice(0,7)){const item=safeMap(value);base.byMode[id]={completed:clampInt(item.completed,0,10000),wins:clampInt(item.wins,0,10000),xp:clampInt(item.xp),seeds:Array.isArray(item.seeds)?[...new Set(item.seeds.map(n=>clampInt(n,1,9000)).filter(Boolean))].slice(-40):[]};}
    base.firstClears=safeMap(source.firstClears);base.awards=safeMap(source.awards);
    base.events=Array.isArray(source.events)?source.events.filter(item=>item&&typeof item==="object").slice(0,TRAINING_EVENT_LIMIT):[];
    base.placement={completed:!!source.placement?.completed,answered:Array.isArray(source.placement?.answered)?[...new Set(source.placement.answered.filter(id=>TRAINING_QUESTION_BY_ID[id]))]:[]};
    base.migrations={legacyKnowledgeV1:!!source.migrations?.legacyKnowledgeV1};base.updatedAt=typeof source.updatedAt==="string"?source.updatedAt:null;
    base.totalXp=Object.values(base.disciplines).reduce((sum,item)=>sum+item.xp,0);return base;}
  function read(id=activeProfileId){const key=keyFor(id);try{const raw=localStorage.getItem(key),value=raw?normalize(JSON.parse(raw),id):blank(id);memory.set(key,value);storageHealthy=true;return value;}
    catch(e){storageHealthy=false;return memory.get(key)||blank(id);}}
  function write(){if(!progress)return false;progress.totalXp=Object.values(progress.disciplines).reduce((sum,item)=>sum+item.xp,0);
    progress.revision=clampInt(progress.revision,0,1e9)+1;progress.updatedAt=now();const key=keyFor(activeProfileId);memory.set(key,progress);
    try{localStorage.setItem(key,JSON.stringify(progress));storageHealthy=true;return true;}catch(e){storageHealthy=false;return false;}}
  function refresh(){if(!activeProfileId)return false;const latest=read(activeProfileId);if(!progress||latest.revision>=progress.revision)progress=latest;return true;}
  function eventBase(id,type,run=currentRun){return {schema:1,eventId:uid("xp"),idempotencyKey:id,eventType:type,occurredAt:now(),playerId:null,
    installationId:progress.installationId,profileId:activeProfileId,run:run?{...run}:null,verification:"local"};}
  function addEvent(event){progress.events.unshift(event);progress.events=progress.events.slice(0,TRAINING_EVENT_LIMIT);}
  function applyAward({id,type,discipline,xp,label,facts={},run=currentRun}){const skill=TRAINING_DISCIPLINE_BY_ID[discipline]?discipline:"account",points=clampInt(xp,0,5000);
    if(progress.awards[id])return {awarded:0,duplicate:true,discipline:skill,label,reason:"already-recorded"};
    progress.awards[id]={xp:points,discipline:skill,type,at:now()};progress.disciplines[skill].xp+=points;
    addEvent({...eventBase(id,type,run),facts:{...facts},award:{policyVersion:TRAINING_POLICY_VERSION,xp:points,discipline:skill},label});
    return {awarded:points,duplicate:false,discipline:skill,label};}
  function legacyKnowledgeValue(raw,id,expectedMode=null){try{const item=JSON.parse(raw||"null"),mode=Number(item?.mode),value=Number(item?.state?.knowledgeCredits);
      if(!item||item.schema!==3||item.profile!==id||!Number.isInteger(mode)||mode<0||mode>4||expectedMode!==null&&mode!==expectedMode||!Number.isFinite(value))return 0;
      return clampInt(value,0,3000);}catch(e){return 0;}}
  function legacyKnowledgeMaximum(id){const get=key=>{try{return localStorage.getItem(key);}catch(e){return null;}};let best=0;for(let mode=0;mode<=4;mode++)best=Math.max(best,
      legacyKnowledgeValue(get(`ttm.save.${id}.mode-${mode}.v3`),id,mode));
    best=Math.max(best,legacyKnowledgeValue(get(`ttm.save.${id}.v3`),id));
    return best;}
  function migrateLegacy(){if(!progress||progress.migrations.legacyKnowledgeV1)return false;progress.migrations.legacyKnowledgeV1=true;
    const amount=legacyKnowledgeMaximum(activeProfileId);if(amount)applyAward({id:"legacy:knowledge-v1",type:"legacy.quiz_import",discipline:"account",xp:amount,
      label:"Earlier recall practice",facts:{source:"maximum saved run score"},run:null});write();return amount>0;}
  function activate(id){activeProfileId=profileId(id);progress=read(activeProfileId);migrateLegacy();return summary();}
  function ensure(){if(!activeProfileId)activate(typeof ACTIVE_PROFILE!=="undefined"?ACTIVE_PROFILE:"general");return progress;}
  function runConfig(raw={}){return {id:typeof raw.id==="string"&&raw.id?raw.id:uid("run"),mode:clampInt(raw.mode??(typeof MODE!=="undefined"?MODE:1),0,6),
    stage:raw.stage==null?null:clampInt(raw.stage,1,3),seed:clampInt(raw.seed??(typeof SEED!=="undefined"?SEED:1),1,9000),
    days:clampInt(raw.days??(typeof DAYS!=="undefined"?DAYS:12),1,4000),budget:clampInt(raw.budget??(typeof DAILY!=="undefined"?DAILY:20000),1,1e9),
    tutorial:!!raw.tutorial,rulesVersion:TRAINING_POLICY_VERSION,startedAt:typeof raw.startedAt==="string"?raw.startedAt:now()};}
  function beginRun(raw={}){ensure();currentRun=runConfig(raw);return {...currentRun};}
  function restoreRun(raw,fallback={}){ensure();if(raw&&typeof raw==="object"&&typeof raw.id==="string"&&raw.id)currentRun=runConfig({...fallback,...raw});
    else{const fingerprint=`${activeProfileId}|${fallback.mode}|${fallback.stage||0}|${fallback.seed}|${fallback.savedAt||"legacy"}`;
      currentRun=runConfig({...fallback,id:`legacy-${hash(fingerprint)}`,startedAt:fallback.savedAt||now()});}return {...currentRun};}
  function currentRunRecord(){return currentRun?{...currentRun}:null;}
  function ensureRun(){return currentRun||beginRun({mode:typeof MODE!=="undefined"?MODE:1,stage:typeof CLASSIC_STAGE!=="undefined"&&MODE===0?CLASSIC_STAGE:null,
    seed:typeof SEED!=="undefined"?SEED:1,days:typeof DAYS!=="undefined"?DAYS:12,budget:typeof DAILY!=="undefined"?DAILY:20000,
    tutorial:typeof tutorialQueryRequested==="function"&&tutorialQueryRequested()});}
  function normalizedPrompt(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ");}
  function questionId(question){if(question&&typeof question.id==="string"&&question.id)return question.id;const prompt=normalizedPrompt(question?.q||question?.prompt);
    return TRAINING_RECALL_FALLBACK[prompt]||`legacy-recall-${hash(prompt||"unknown")}`;}
  function questionDiscipline(question){return TRAINING_DISCIPLINE_BY_ID[question?.discipline]?question.discipline:"account";}
  function scenarioKey(source="recall",question=null){if(source==="placement")return `placement-v${TRAINING_POLICY_VERSION}`;
    if(source==="mastery")return `mastery:${questionId(question)}`;const run=ensureRun();return `mode-${run.mode}|stage-${run.stage||0}|seed-${run.seed}`;}
  function recordQuestion(question,{correct=false,skipped=false,source="recall"}={}){ensure();refresh();const id=questionId(question),discipline=questionDiscipline(question),scenario=scenarioKey(source,question),eventRun=source==="recall"?ensureRun():null,
      stats=progress.questions[id]||{discipline,attempts:0,correct:0,wrong:0,skipped:0,scenarios:{}},local=stats.scenarios[scenario]||{attempts:0,correct:false,skipped:0};
    if(correct&&local.correct)return {awarded:0,duplicate:true,discipline,id,status:"already-mastered"};
    const firstEver=stats.correct===0,firstTry=local.attempts===0;let result={awarded:0,duplicate:false,discipline,id,status:skipped?"skipped":correct?"correct":"wrong"};
    if(skipped){stats.skipped++;local.skipped++;progress.disciplines[discipline].skipped++;
      addEvent({...eventBase(uid("skip"),"quiz.skipped",eventRun),facts:{questionId:id,discipline,source,scenario},award:{policyVersion:TRAINING_POLICY_VERSION,xp:0,discipline},label:"Question skipped"});}
    else{stats.attempts++;local.attempts++;progress.disciplines[discipline].attempts++;
      if(correct){stats.correct++;local.correct=true;progress.disciplines[discipline].correct++;
        const points=source==="recall"?(firstEver?(firstTry?500:200):(firstTry?100:50)):(firstEver?(firstTry?500:200):0);
        result={...result,...applyAward({id:`quiz:${id}:${scenario}`,type:"quiz.correct",discipline,xp:points,label:`Correct · ${TRAINING_DISCIPLINE_BY_ID[discipline].short}`,
          facts:{questionId:id,source,scenario,firstTry,firstEver},run:eventRun})};
      }else{stats.wrong++;addEvent({...eventBase(uid("wrong"),"quiz.wrong",eventRun),facts:{questionId:id,discipline,source,scenario},award:{policyVersion:TRAINING_POLICY_VERSION,xp:0,discipline},label:"Question missed"});}}
    stats.scenarios[scenario]=local;progress.questions[id]=stats;
    if(source==="placement"){progress.placement.answered=[...new Set([...progress.placement.answered,id])];
      progress.placement.completed=TRAINING_PLACEMENT_IDS.every(questionId=>progress.placement.answered.includes(questionId));}
    write();return result;}
  function runMilestones(mode,state){const T=state?.telemetry||{},rows=[];const add=(condition,id,discipline,xp,label)=>{if(condition)rows.push({id,discipline,xp,label});};
    if(mode===0){add(T.negAdded>0,"search-terms","search",250,"Diagnosed irrelevant search intent");add(T.commitmentsMet>0,"client-follow-through","clients",250,"Completed a client commitment");add(!!T.trackingChecked,"tracking-check","measurement",250,"Checked the conversion path");}
    else if(mode===1){add(T.asks>=2,"objective-questions","account",200,"Checked campaign purpose before acting");add(T.multiplies>0,"controlled-variation","creative",200,"Created a controlled variation");add(T.swaps>0&&!T.flagsShipped,"safe-swap","creative",250,"Shipped inspected creative");}
    else if(mode===2){add(T.pendingPanic<=1,"settlement-discipline","finance",300,"Managed settlement lag without repeated panic moves");add(T.pixelBreaks>0&&T.pixelFixes>0,"pixel-repair","measurement",250,"Diagnosed and repaired future measurement");}
    else if(mode===3){add(T.requested>0&&T.swaps>0,"creative-pipeline","creative",350,"Moved creative from request into delivery");add(T.rejected>0&&T.requested>1,"pipeline-redundancy","creative",200,"Maintained more than one creative path");}
    else if(mode===4){add(T.platformMoves>0&&T.overlapDays<4,"channel-move","channels",300,"Moved a lane without sustained audience overlap");add(T.recasts>0||T.restates>0,"channel-adaptation","social",200,"Adapted creative for a diagnosed platform need");}
    else if(mode===5){add(T.crisesResolved>0,"crisis-resolution","portfolio",300,"Resolved a portfolio crisis");add(T.audits+T.pixelCleans+T.pixelIsolations>0,"portfolio-measurement","measurement",250,"Improved portfolio signal integrity");add(T.searchRepairs>0,"search-repair","search",200,"Repaired search intent or relevance");add(T.creativeRefreshes>0,"portfolio-creative","creative",200,"Maintained portfolio creative supply");}
    else if(mode===6){add(T.clientUpdates>0&&T.clientInsights>0,"client-insight","clients",300,"Learned and used client decision evidence");add(T.techUnlocked>0,"agency-capability","portfolio",250,"Built an agency capability");add(T.incidentsResolved>0,"agency-incident","portfolio",250,"Resolved an agency incident");add(!!T.pivoted,"affiliate-pivot","portfolio",400,"Completed the affiliate business-model pivot");}
    return rows.slice(0,4);}
  function completeRun({success=false,outcome="complete",state=null,facts={}}={}){ensure();refresh();const run=ensureRun();if(progress.runs[run.id])return {awarded:0,duplicate:true,
      recorded:clampInt(progress.runs[run.id].awarded),breakdown:[],run:{...run},success:!!progress.runs[run.id].success};
    const skills=TRAINING_MODE_DISCIPLINES[run.mode]||["account","portfolio"],scenario=`mode-${run.mode}|stage-${run.stage||0}|seed-${run.seed}`,
      prior=progress.scenarios[scenario]?.completions||0,longFactor=run.mode===5?Math.max(.25,Math.min(1,(Number(state?.day)||1)/Math.max(1,run.days))):
        run.mode===6?Math.max(.1,Math.min(1,(Number(state?.month)||0)/120)):1,repeatFactor=prior===0?1:prior<3?.2:0,
      primary=Math.round(500*longFactor*repeatFactor/10)*10,secondary=Math.round(250*longFactor*repeatFactor/10)*10,breakdown=[];
    if(primary)breakdown.push(applyAward({id:`run:${run.id}:complete:primary`,type:"run.completed",discipline:skills[0],xp:primary,label:`Completed · ${TRAINING_DISCIPLINE_BY_ID[skills[0]].short}`,facts:{...facts,outcome,success,scenario}}));
    if(secondary)breakdown.push(applyAward({id:`run:${run.id}:complete:secondary`,type:"run.completed",discipline:skills[1],xp:secondary,label:`Completed · ${TRAINING_DISCIPLINE_BY_ID[skills[1]].short}`,facts:{...facts,outcome,success,scenario}}));
    const clearKey=`mode-${run.mode}|stage-${run.stage||0}`;if(success&&!progress.firstClears[clearKey]){progress.firstClears[clearKey]=now();
      breakdown.push(applyAward({id:`first-clear:${clearKey}`,type:"run.first_clear",discipline:skills[0],xp:500,label:"First objective clear",facts:{...facts,outcome,scenario}}));}
    for(const item of runMilestones(run.mode,state)){const id=`evidence:${scenario}:${item.id}`;if(!progress.awards[id])breakdown.push(applyAward({id,type:"run.evidence",discipline:item.discipline,xp:item.xp,label:item.label,facts:{...facts,outcome,scenario,evidence:item.id}}));}
    const awarded=breakdown.reduce((sum,item)=>sum+(item.awarded||0),0),mode=String(run.mode),modeRecord=progress.byMode[mode]||{completed:0,wins:0,xp:0,seeds:[]};
    modeRecord.completed++;if(success)modeRecord.wins++;modeRecord.xp+=awarded;modeRecord.seeds=[...new Set([...modeRecord.seeds,run.seed])].slice(-40);progress.byMode[mode]=modeRecord;
    progress.scenarios[scenario]={completions:prior+1,wins:(progress.scenarios[scenario]?.wins||0)+(success?1:0)};
    progress.runs[run.id]={mode:run.mode,stage:run.stage,seed:run.seed,days:run.days,budget:run.budget,success:!!success,outcome,awarded,completedAt:now()};write();
    return {awarded,duplicate:false,breakdown:breakdown.filter(item=>item.awarded),run:{...run},success:!!success};}
  function completeTutorial(key="fundamentals-v2"){ensure();refresh();const result=applyAward({id:`tutorial:${key}`,type:"tutorial.completed",discipline:"account",xp:1000,
      label:"Completed the guided Fundamentals opening",facts:{tutorial:key},run:currentRun});write();return result;}
  function levelFor(xp=progress?.totalXp||0){let current=TRAINING_LEVELS[0];for(const level of TRAINING_LEVELS)if(xp>=level.xp)current=level;return current;}
  function skillFor(xp=0){let current=TRAINING_SKILL_LEVELS[0];for(const level of TRAINING_SKILL_LEVELS)if(xp>=level.xp)current=level;return current;}
  function nextThreshold(list,xp){return list.find(item=>item.xp>xp)||null;}
  function badges(){ensure();const introduced=TRAINING_DISCIPLINES.filter(item=>progress.disciplines[item.id].xp>=500).length,
      completedModes=Object.values(progress.byMode).filter(item=>item.completed>0).length,rows=[];
    if(Object.values(progress.questions).some(item=>item.correct>0))rows.push({mark:"✓",label:"First read",copy:"Answered a knowledge check correctly."});
    if(progress.placement.completed)rows.push({mark:"🧭",label:"Placement mapped",copy:"Completed the nine-skill placement check."});
    if(introduced>=4)rows.push({mark:"🧩",label:"Across the funnel",copy:"Introduced four different practice areas."});
    if(introduced===TRAINING_DISCIPLINES.length)rows.push({mark:"🌐",label:"Full account view",copy:"Introduced every practice area."});
    if(completedModes>=5)rows.push({mark:"🚀",label:"Scenario explorer",copy:"Completed five different To The Moon modes."});
    if(Object.keys(progress.firstClears).length)rows.push({mark:"🏁",label:"Objective cleared",copy:"Cleared at least one mode objective."});
    if(progress.awards["tutorial:fundamentals-v2"])rows.push({mark:"🎓",label:"Guided foundation",copy:"Completed the deterministic Fundamentals opening."});return rows;}
  function summary(){ensure();const level=levelFor(),next=nextThreshold(TRAINING_LEVELS,progress.totalXp),introduced=TRAINING_DISCIPLINES.filter(item=>progress.disciplines[item.id].xp>=500).length,
      demonstrated=TRAINING_DISCIPLINES.filter(item=>progress.disciplines[item.id].xp>=3500).length,modes=Object.values(progress.byMode).filter(item=>item.completed>0).length,
      correct=Object.values(progress.questions).reduce((sum,item)=>sum+item.correct,0),attempts=Object.values(progress.questions).reduce((sum,item)=>sum+item.attempts,0);
    return {totalXp:progress.totalXp,level,next,introduced,demonstrated,modes,correct,attempts,badges:badges(),storageHealthy};}
  function availableQuestion(disciplineId=null,placement=false){ensure();if(placement){const id=TRAINING_PLACEMENT_IDS.find(item=>!progress.placement.answered.includes(item));return id?TRAINING_QUESTION_BY_ID[id]:null;}
    const disciplines=disciplineId?[TRAINING_DISCIPLINE_BY_ID[disciplineId]].filter(Boolean):TRAINING_DISCIPLINES.slice().sort((a,b)=>progress.disciplines[a.id].xp-progress.disciplines[b.id].xp);
    for(const discipline of disciplines){const xp=progress.disciplines[discipline.id].xp,question=TRAINING_QUESTIONS.find(item=>item.discipline===discipline.id&&xp>=(item.minXp||0)&&!(progress.questions[item.id]?.correct>0));if(question)return question;}return null;}
  function recommendation(){ensure();if(!progress.placement.completed)return {kind:"placement",title:"Map your starting point",copy:"Take one question in each practice area. A missed answer only changes the recommendation; it never penalizes a campaign.",mode:null};
    const question=availableQuestion();if(question){const skill=TRAINING_DISCIPLINE_BY_ID[question.discipline];return {kind:"question",question,title:`Practice ${skill.short.toLowerCase()}`,copy:skill.copy,mode:skill.mode};}
    const discipline=TRAINING_DISCIPLINES.slice().sort((a,b)=>progress.disciplines[a.id].xp-progress.disciplines[b.id].xp)[0];return {kind:"mode",title:`Apply ${discipline.short.toLowerCase()} on a new scenario`,copy:discipline.copy,mode:discipline.mode};}
  function awardMarkup(result){if(!result)return "";if(result.duplicate&&result.recorded)return `<div class="training-run-award is-recorded" role="status"><span>Training XP already recorded</span><b>${result.recorded.toLocaleString("en-US")} XP</b><small>This debrief can be reviewed without awarding the run again.</small></div>`;
    if(!result.awarded)return "";const labels=[...new Set((result.breakdown||[]).map(item=>TRAINING_DISCIPLINE_BY_ID[item.discipline]?.short).filter(Boolean))];
    return `<div class="training-run-award" role="status"><span>Training XP recorded</span><b>+${result.awarded.toLocaleString("en-US")} XP</b><small>${esc(labels.join(" · ")||"Learning progress")} · campaign economics unchanged</small></div>`;}
  function menuMarkup(firstRun=false){const info=summary(),next=recommendation();return `<button class="btn menu-choice training-menu-choice${firstRun?" training-first-choice":""}" id="openTrainingProgress" type="button">
    <b>Training progress · ${info.totalXp.toLocaleString("en-US")} XP</b><span>${esc(info.level.title)} · Next: ${esc(next.title)}</span></button>`;}
  function masteryMarkup(){return `<div class="training-skill-list">${TRAINING_DISCIPLINES.map(item=>{const stats=progress.disciplines[item.id],rank=skillFor(stats.xp),next=nextThreshold(TRAINING_SKILL_LEVELS,stats.xp),
      max=next?next.xp:Math.max(10000,stats.xp),value=Math.min(max,stats.xp),available=availableQuestion(item.id);
      return `<details class="training-skill"><summary><span class="training-skill-mark" aria-hidden="true">${item.mark}</span><span><b>${esc(item.label)}</b><small>${stats.xp.toLocaleString("en-US")} XP · ${esc(rank.label)}</small></span><strong>${next?`${(next.xp-stats.xp).toLocaleString("en-US")} to ${esc(next.label)}`:"Top practice rank"}</strong></summary>
        <div class="training-skill-body"><p>${esc(item.copy)}</p><label><span>${esc(rank.label)}</span><progress max="${max}" value="${value}">${value} of ${max}</progress></label>
        <small>${stats.correct} correct answer${stats.correct===1?"":"s"} across ${stats.attempts} attempt${stats.attempts===1?"":"s"}. Practice status records evidence inside To The Moon; it is not a professional certification.</small>
        ${available?`<button class="btn" type="button" data-training-discipline="${item.id}">Take the next ${esc(item.short)} check</button>`:`<span class="tag ok">Available questions complete · apply it in Mode ${item.mode}</span>`}</div></details>`;}).join("")}</div>`;}
  function runsMarkup(){const recent=progress.events.filter(event=>Number(event?.award?.xp)>0).slice(0,12),modeIds=typeof MODE_IDS!=="undefined"?MODE_IDS:[0,1,2,3,4,5,6];return `<div class="training-run-list">${modeIds.map(mode=>{const row=progress.byMode[String(mode)]||{completed:0,wins:0,xp:0,seeds:[]},name=typeof MODE_NAME!=="undefined"?MODE_NAME[mode]:`Mode ${mode}`;
      return `<div class="training-run-row"><span>${typeof MODE_MENU_META!=="undefined"?MODE_MENU_META[mode]?.icon||"🎯":"🎯"}</span><div><b>${esc(name)}</b><small>${row.completed?`${row.completed} completed · ${row.wins} objective clear${row.wins===1?"":"s"} · ${row.seeds.length} scenario${row.seeds.length===1?"":"s"}`:"No completed scenario yet"}</small></div><strong>${row.xp.toLocaleString("en-US")} XP</strong></div>`;}).join("")}</div>
      <details class="training-history"><summary>Recent XP evidence</summary>${recent.length?recent.map(event=>`<div><span>${esc(event.label||event.eventType)}</span><b>+${Number(event.award.xp).toLocaleString("en-US")} XP</b><small>${event.occurredAt?esc(new Date(event.occurredAt).toLocaleDateString()):""}</small></div>`).join(""):'<p>No XP evidence has been recorded yet.</p>'}</details>`;}
  function overviewMarkup(){const info=summary(),nextLevel=info.next,from=info.level.xp,to=nextLevel?.xp||Math.max(info.totalXp,info.level.xp+1),
      value=nextLevel?Math.max(0,info.totalXp-from):1,max=nextLevel?Math.max(1,to-from):1,rec=recommendation(),badgeRows=info.badges;
    return `<section class="training-overview"><div class="training-xp-hero"><span><small>Lifetime Training XP</small><b>${info.totalXp.toLocaleString("en-US")}</b><em>Level ${info.level.level} · ${esc(info.level.title)}</em></span>
      <label><span>${nextLevel?`${(nextLevel.xp-info.totalXp).toLocaleString("en-US")} XP to ${esc(nextLevel.title)}`:"Top training level reached"}</span><progress max="${max}" value="${Math.min(max,value)}">${value} of ${max}</progress></label></div>
      <div class="training-summary-grid"><div><b>${info.introduced} / ${TRAINING_DISCIPLINES.length}</b><span>skills introduced</span></div><div><b>${info.demonstrated}</b><span>skills demonstrated</span></div><div><b>${info.modes} / 7</b><span>modes completed</span></div><div><b>${info.attempts?Math.round(info.correct/info.attempts*100):0}%</b><span>knowledge-check accuracy</span></div></div>
      <article class="training-next"><div><small>Recommended next practice</small><h3>${esc(rec.title)}</h3><p>${esc(rec.copy)}</p></div>
        ${rec.kind==="placement"?'<button class="btn" id="trainingPlacement" type="button">Start the nine-skill placement check</button>':rec.kind==="question"?'<button class="btn" id="trainingPractice" type="button">Take the recommended mastery check</button>':'<button class="btn" id="trainingChooseMode" type="button">Choose the recommended challenge</button>'}</article>
      <div class="training-principle"><b>What Training XP changes</b><span>Your learning record, practice recommendations, titles, badges and advanced mastery checks.</span><b>What it never changes</b><span>Campaign delivery, RNG, budget, platform learning, outcomes, profit or win conditions.</span></div>
      <details class="training-badges" ${badgeRows.length?"":"open"}><summary>Titles and badges · ${badgeRows.length}</summary>${badgeRows.length?`<div>${badgeRows.map(item=>`<article><span>${item.mark}</span><b>${esc(item.label)}</b><small>${esc(item.copy)}</small></article>`).join("")}</div>`:'<p>Complete one knowledge check or scenario to earn the first badge.</p>'}</details>
      <p class="training-storage-note${info.storageHealthy?"":" is-warning"}">${info.storageHealthy?"Saved on this device and training track. The record is structured for future account sync, but it is not a multiplayer ranking.":"This browser blocked the latest progress save. Gameplay remains unaffected; keep this tab open until browser storage is available."}</p></section>`;}
  function back(){if(typeof close==="function")close();if(returnTarget==="menu"&&typeof mainMenu==="function")mainMenu();
    else if(returnTarget==="debrief"&&typeof reopenTerminalDebrief==="function")reopenTerminalDebrief();}
  function open(options={}){ensure();refresh();const view=["next","mastery","runs"].includes(options.view)?options.view:"next";if(options.returnTo)returnTarget=options.returnTo;
    const content=view==="mastery"?masteryMarkup():view==="runs"?runsMarkup():overviewMarkup();
    show(`<div class="training-center"><header><div><div class="eyebrow">Persistent learning record</div><h2>Training progress</h2><p>Training XP records practice across To The Moon. It stays separate from challenge scores and Agency Career capability points.</p></div></header>
      <nav class="training-tabs" role="tablist" aria-label="Training progress views">${[["next","Next up"],["mastery","Mastery"],["runs","Runs"]].map(([id,label])=>`<button type="button" role="tab" data-training-view="${id}" aria-selected="${view===id}" tabindex="${view===id?0:-1}">${label}</button>`).join("")}</nav>
      <div class="training-panel" role="tabpanel">${content}</div><div class="row training-footer"><button class="btn wide" id="closeB" type="button">${returnTarget==="menu"?"Back to main menu":returnTarget==="debrief"?"Back to debrief":"Back to the account"}</button></div></div>`,"structure",{wide:true,learning:false,menu:true});
    document.getElementById("closeB").onclick=back;const tabs=Array.from(ov.querySelectorAll("button[data-training-view]"));tabs.forEach((button,index)=>{button.onclick=()=>{const nextView=button.dataset.trainingView;open({view:nextView});
        const selected=ov.querySelector(`button[data-training-view="${nextView}"]`);if(selected&&typeof selected.focus==="function")selected.focus();};
      button.onkeydown=event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;if(typeof event.preventDefault==="function")event.preventDefault();
        const next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;tabs[next].click();};});
    ov.querySelectorAll("button[data-training-discipline]").forEach(button=>button.onclick=()=>openQuestion(availableQuestion(button.dataset.trainingDiscipline),{source:"mastery"}));
    const placement=document.getElementById("trainingPlacement");if(placement)placement.onclick=()=>openQuestion(availableQuestion(null,true),{source:"placement"});
    const practice=document.getElementById("trainingPractice");if(practice)practice.onclick=()=>openQuestion(recommendation().question,{source:"mastery"});
    const choose=document.getElementById("trainingChooseMode");if(choose)choose.onclick=()=>{const mode=recommendation().mode;if(typeof setupWizard==="function"){const draft=typeof wizardDraft==="function"?wizardDraft({mode,origin:"training"}):{mode};setupWizard(draft,"intent");}};
    return true;}
  function openQuestion(question,options={}){if(!question){open({view:"next"});return false;}const source=options.source||"mastery",placement=source==="placement",step=placement?progress.placement.answered.length+1:0,skill=TRAINING_DISCIPLINE_BY_ID[question.discipline];
    show(`<div class="training-question"><div class="eyebrow">${placement?`Placement check · ${Math.min(step,TRAINING_PLACEMENT_IDS.length)} of ${TRAINING_PLACEMENT_IDS.length}`:`${skill.mark} ${esc(skill.label)} · mastery check`}</div><h2>${esc(question.prompt)}</h2>
      <p>Choose the strongest answer. Explanations appear only after you commit.</p><div class="training-choice-list">${question.choices.map((choice,index)=>`<button class="btn" type="button" data-training-choice="${index}"><span>${String.fromCharCode(65+index)}</span>${esc(choice)}</button>`).join("")}</div>
      <div class="row"><button class="btn wide" id="trainingUnsure" type="button">Not sure · show the explanation</button><button class="btn wide" id="closeB" type="button">Back to training progress</button></div></div>`,"performance",{wide:true,learning:false,menu:true});
    let settled=false;const finish=(choice,skipped=false)=>{if(settled)return;settled=true;const correct=!skipped&&Number(choice)===question.answer,result=recordQuestion(question,{correct,skipped,source}),answer=question.choices[question.answer],nextPlacement=placement?availableQuestion(null,true):null,
        success=correct?`<div class="quiz-result-correct" role="status" aria-live="polite"><span class="quiz-result-mark" aria-hidden="true">✓</span><span><strong>Correct!</strong><small>${result.awarded?`+${result.awarded.toLocaleString("en-US")} Training XP`:"Practice already recorded"}</small></span></div>`:
          `<div class="training-answer-miss" role="status"><span aria-hidden="true">↺</span><div><strong>${skipped?"No penalty":"Not quite"}</strong><small>${skipped?"This question can return later.":"A later correct answer can still earn partial XP."}</small></div></div>`;
      show(`<div class="training-question-result">${success}<div class="eyebrow">${skill.mark} ${esc(skill.label)}</div><h2>${correct?"Why that answer works":"Strongest answer"}</h2><div class="training-answer"><b>${esc(answer)}</b><p>${esc(question.why)}</p></div>
        <div class="row">${placement&&nextPlacement?'<button class="btn wide" id="trainingNextQuestion" type="button">Continue placement check</button>':placement?'<button class="btn wide" id="trainingNextQuestion" type="button">See placement results</button>':'<button class="btn wide" id="trainingNextQuestion" type="button">Back to training progress</button>'}</div></div>`,"performance",{wide:true,learning:true,definitions:true,menu:true});
      if(correct&&result.awarded&&typeof fireFx==="function")fireFx("quizCorrect",{points:result.awarded},{silent:false});
      else if(correct&&typeof playSfx==="function")playSfx(SFX_EVENT_CUE.quizCorrect);
      else if(!skipped&&typeof playSfx==="function")playSfx(SFX_EVENT_CUE.quizWrong);
      document.getElementById("trainingNextQuestion").onclick=()=>placement&&nextPlacement?openQuestion(nextPlacement,{source:"placement"}):open({view:"next"});};
    ov.querySelectorAll("button[data-training-choice]").forEach(button=>button.onclick=()=>finish(Number(button.dataset.trainingChoice),false));
    document.getElementById("trainingUnsure").onclick=()=>finish(null,true);document.getElementById("closeB").onclick=()=>open({view:"next"});return true;}
  function bindMenuTrigger(){const button=document.getElementById("openTrainingProgress");if(button)button.onclick=()=>open({returnTo:"menu",view:"next"});return !!button;}
  if(typeof addEventListener==="function")addEventListener("storage",event=>{if(!activeProfileId||event?.key!==keyFor(activeProfileId)||!event.newValue)return;try{progress=normalize(JSON.parse(event.newValue),activeProfileId);}catch(e){}});
  return Object.freeze({activate,beginRun,restoreRun,currentRunRecord,recordQuestion,completeRun,completeTutorial,summary,menuMarkup,bindMenuTrigger,open,openQuestion,
    availableQuestion,recommendation,awardMarkup,questionId,disciplines:TRAINING_DISCIPLINES,questions:TRAINING_QUESTIONS,placementIds:TRAINING_PLACEMENT_IDS});
})();
window.TrainingProgress=TrainingProgress;
