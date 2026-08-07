"use strict";
/* ---------------- audiovisual feedback: cosmetic only, never touches seeded RNG ---------- */
const SFX_KEY="media-buying-trainer-sfx-v1";
const SFX_VOLUME_KEY="media-buying-trainer-sfx-volume-v1";
const SFX_IDS=Object.freeze(["nav","open","close","confirm","day","settle","save","profit","creative","swap","correct","wrong","warning","crisis","epic","legendary","victory","failure"]);
const SFX_FALLBACK=Object.freeze({
  nav:Object.freeze({id:"nav",label:"Meaningful navigation",files:Object.freeze(["assets/audio/lunar_nav_a.ogg","assets/audio/lunar_nav_b.ogg","assets/audio/lunar_nav_c.ogg"]),channel:"ui",priority:10,cooldown:140,gain:.24}),
  open:Object.freeze({id:"open",label:"Open a major panel",files:Object.freeze(["assets/audio/lunar_open.ogg"]),channel:"ui",priority:14,cooldown:180,gain:.34}),
  close:Object.freeze({id:"close",label:"Leave a panel",files:Object.freeze(["assets/audio/lunar_close.ogg"]),channel:"ui",priority:14,cooldown:160,gain:.30}),
  confirm:Object.freeze({id:"confirm",label:"Commit a major choice",files:Object.freeze(["assets/audio/lunar_confirm.ogg"]),channel:"ui",priority:20,cooldown:180,gain:.42}),
  day:Object.freeze({id:"day",label:"Run the next day",files:Object.freeze(["assets/audio/lunar_day_a.ogg","assets/audio/lunar_day_b.ogg"]),channel:"turn",priority:45,cooldown:650,gain:.62,resultDelay:720}),
  settle:Object.freeze({id:"settle",label:"Operation settled",files:Object.freeze(["assets/audio/lunar_settle.ogg"]),channel:"action",priority:30,cooldown:220,gain:.44}),
  save:Object.freeze({id:"save",label:"Checkpoint saved",files:Object.freeze(["assets/audio/lunar_save.ogg"]),channel:"action",priority:32,cooldown:300,gain:.42}),
  profit:Object.freeze({id:"profit",label:"Profitable result",files:Object.freeze(["assets/audio/lunar_profit_a.ogg","assets/audio/lunar_profit_b.ogg"]),channel:"result",priority:60,cooldown:750,gain:.68}),
  creative:Object.freeze({id:"creative",label:"Creative ready",files:Object.freeze(["assets/audio/lunar_creative_a.ogg","assets/audio/lunar_creative_b.ogg"]),channel:"result",priority:55,cooldown:500,gain:.52}),
  swap:Object.freeze({id:"swap",label:"Creative shipped",files:Object.freeze(["assets/audio/lunar_swap.ogg"]),channel:"result",priority:58,cooldown:500,gain:.56}),
  correct:Object.freeze({id:"correct",label:"Correct answer",files:Object.freeze(["assets/audio/lunar_correct.ogg"]),channel:"answer",priority:62,cooldown:350,gain:.62}),
  wrong:Object.freeze({id:"wrong",label:"Answer needs another look",files:Object.freeze(["assets/audio/lunar_wrong.ogg"]),channel:"answer",priority:48,cooldown:350,gain:.42}),
  warning:Object.freeze({id:"warning",label:"Warning",files:Object.freeze(["assets/audio/lunar_warning.ogg"]),channel:"alert",priority:70,cooldown:500,gain:.50}),
  crisis:Object.freeze({id:"crisis",label:"Critical incident",files:Object.freeze(["assets/audio/lunar_crisis.ogg"]),channel:"alert",priority:85,cooldown:900,gain:.66}),
  epic:Object.freeze({id:"epic",label:"Epic creative",files:Object.freeze(["assets/audio/lunar_epic.ogg"]),channel:"milestone",priority:76,cooldown:900,gain:.68}),
  legendary:Object.freeze({id:"legendary",label:"Legendary result",files:Object.freeze(["assets/audio/lunar_legendary.ogg"]),channel:"milestone",priority:90,cooldown:1300,gain:.78}),
  victory:Object.freeze({id:"victory",label:"Run victory",files:Object.freeze(["assets/audio/lunar_victory_cash.ogg"]),channel:"milestone",priority:100,cooldown:1800,gain:.84}),
  failure:Object.freeze({id:"failure",label:"Run failure",files:Object.freeze(["assets/audio/lunar_failure.ogg"]),channel:"milestone",priority:95,cooldown:1200,gain:.72})
});
const suppliedSfx=(typeof SFX_CUES!=="undefined"&&Array.isArray(SFX_CUES))?SFX_CUES:[];
const suppliedSfxById=Object.fromEntries(suppliedSfx.filter(c=>c&&SFX_IDS.includes(c.id)).map(c=>[c.id,c]));
function sfxFiles(row){
  const input=row&&Array.isArray(row.files)?row.files:(row&&row.file?[row.file]:[]);
  return Array.from(new Set(input.filter(file=>typeof file==="string"&&file.trim())));
}
/* SFX_CUES is the source of truth. Local rows keep this layer safe when opened alone. */
const SFX_DEFS=Object.freeze(SFX_IDS.map(id=>{
  const fallback=SFX_FALLBACK[id],supplied=suppliedSfxById[id]||{},files=sfxFiles(supplied);
  const resolved=files.length?files:sfxFiles(fallback);
  return Object.freeze({...fallback,...supplied,files:Object.freeze(resolved),file:resolved[0]});
}));
const SFX_VARIANTS=Object.freeze(Object.fromEntries(SFX_DEFS.map(c=>[c.id,c.files])));
const SFX_FILES=Object.freeze(Object.fromEntries(SFX_DEFS.map(c=>[c.id,c.file])));
const SFX_META=Object.freeze(Object.fromEntries(SFX_DEFS.map(c=>[c.id,c])));
const SFX_EVENT_CUE=Object.freeze({
  control:"nav",navigation:"nav",open:"open",close:"close",confirm:"confirm",day:"day",profit:"profit",
  error:"warning",crisis:"crisis",creative:"creative",swap:"swap",quizCorrect:"correct",quizWrong:"wrong",
  save:"save",settlement:"settle",epic:"epic",legendary:"legendary",success:"victory",jackpot:"legendary",failure:"failure"
});
/* Compatibility aliases keep existing callers working without introducing extra cue files. */
const SFX_ALIASES=Object.freeze({click:"nav",tick:"day",tally:"day",success:"victory",jackpot:"legendary",reveal:"legendary",error:"warning",glitch:"crisis"});
const DAY_RESULT_FX_DELAY=Number(SFX_META.day.resultDelay)||720;
const FX_PRIORITY={review:100,compliance:100,burnout:90,fail:88,signal:86,clientRisk:84,legendary:82,jackpot:74,
                   epic:62,warning:55,profit:48,agencyProfit:48,creative:30,swap:24,success:20};
let sfxEnabled=false,sfxVolume=.42,sfxBank={},activeSfx={},pendingDayFx=[],fxTimer=0,dayFxTimer=0,quizSfxBefore=null;
let activeSfxChannels={},sfxVariantCursor={},sfxLastPlayed={};
try{
  sfxEnabled=localStorage.getItem(SFX_KEY)==="on";
  const storedVolume=localStorage.getItem(SFX_VOLUME_KEY),savedVolume=Number(storedVolume);
  if(storedVolume!==null&&storedVolume!==""&&Number.isFinite(savedVolume)&&savedVolume>=0)
    sfxVolume=Math.max(0,Math.min(1,savedVolume>1?savedVolume/100:savedVolume));
}catch(e){}
function richFxDom(){return !!(document.body&&document.body.classList&&document.getElementById("fxLayer"));}
function reducedMotion(){try{return !!window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){return false;}}
function canonicalSfx(key){return SFX_FILES[key]?key:(SFX_ALIASES[key]||"");}
function primeSfx(){
  if(typeof Audio!=="function") return;
  Object.values(SFX_VARIANTS).flat().forEach(src=>{
    if(sfxBank[src]) return;
    try{const audio=new Audio(src);audio.preload="auto";sfxBank[src]=audio;}catch(e){}
  });
}
function sfxNow(){
  try{return typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now();}
  catch(e){return Date.now();}
}
function stopSfx(key){
  const cue=canonicalSfx(key),sound=cue&&activeSfx[cue];if(!sound)return false;
  try{sound.volume=0;if(typeof sound.pause==="function")sound.pause();if("currentTime" in sound)sound.currentTime=0;}catch(e){}
  const channel=SFX_META[cue]?.channel||"action";
  if(activeSfxChannels[channel]?.sound===sound)delete activeSfxChannels[channel];
  delete activeSfx[cue];return true;
}
function stopSfxChannel(channel){
  const active=activeSfxChannels[channel];if(!active)return false;
  return stopSfx(active.cue);
}
function nextSfxFile(cue){
  const files=SFX_VARIANTS[cue]||[],index=sfxVariantCursor[cue]||0;
  if(!files.length)return "";
  sfxVariantCursor[cue]=(index+1)%files.length;
  return files[index%files.length];
}
function playSfx(key,gain,options={}){
  const cue=canonicalSfx(key),force=!!(options&&options.force);
  if(!cue||(!sfxEnabled&&!force)||sfxVolume<=0||typeof Audio!=="function") return false;
  const meta=SFX_META[cue]||{},now=sfxNow(),cooldown=Math.max(0,Number(meta.cooldown)||0);
  const last=Number.isFinite(sfxLastPlayed[cue])?sfxLastPlayed[cue]:-Infinity;
  if(!force&&now-last<cooldown)return false;
  const channel=meta.channel||"action",priority=Number(meta.priority)||0,current=activeSfxChannels[channel];
  if(!force&&current&&current.priority>priority)return false;
  const protectedCue=Object.values(activeSfxChannels).some(active=>{
    const activeChannel=SFX_META[active.cue]?.channel;
    return ["result","alert","milestone"].includes(activeChannel)&&active.priority>priority;
  });
  if(!force&&["ui","action","answer","turn"].includes(channel)&&protectedCue)return false;
  primeSfx();const file=nextSfxFile(cue),source=sfxBank[file];if(!source)return false;
  const cueGain=Number.isFinite(Number(gain))?Number(gain):(Number(meta.gain)||.5);
  try{const sound=typeof source.cloneNode==="function"?source.cloneNode():new Audio(file);
    stopSfxChannel(channel);
    if(channel==="turn")stopSfxChannel("ui");
    if(channel==="result"){stopSfxChannel("turn");stopSfxChannel("action");stopSfxChannel("answer");stopSfxChannel("ui");}
    if(channel==="alert"){stopSfxChannel("turn");stopSfxChannel("result");stopSfxChannel("action");stopSfxChannel("answer");stopSfxChannel("ui");}
    if(channel==="milestone")Object.keys(activeSfxChannels).forEach(stopSfxChannel);
    sound.volume=Math.max(0,Math.min(1,sfxVolume*Math.max(0,Math.min(1,cueGain))));
    if("currentTime" in sound)sound.currentTime=0;
    if(typeof AmbientBackground!=="undefined"&&AmbientBackground){
      AmbientBackground.connectAudioElement(sound);
      AmbientBackground.noteAudioCue(cue,sound.volume);
    }
    const cleanup=()=>{if(activeSfx[cue]===sound)delete activeSfx[cue];if(activeSfxChannels[channel]?.sound===sound)delete activeSfxChannels[channel];};
    activeSfx[cue]=sound;activeSfxChannels[channel]={cue,sound,priority};sound.onended=cleanup;sfxLastPlayed[cue]=now;
    const played=sound.play();
    if(played&&typeof played.catch==="function")played.catch(()=>{try{if(typeof sound.pause==="function")sound.pause();}catch(e){}cleanup();});
    return true;
  }catch(e){return false;}
}
function updateSfxButton(){
  const btn=document.getElementById("sfxBtn"); if(!btn)return;
  btn.textContent=sfxEnabled?"Sound effects on":"Sound effects off";btn.setAttribute&&btn.setAttribute("aria-pressed",String(sfxEnabled));
  btn.setAttribute&&btn.setAttribute("aria-label",sfxEnabled?"Turn sound effects off":"Turn sound effects on");
  btn.title=`Sound effects ${sfxEnabled?"on":"off"} · master ${Math.round(sfxVolume*100)}%`;
}
function setSfx(on,preview=true){
  sfxEnabled=!!on;try{localStorage.setItem(SFX_KEY,sfxEnabled?"on":"off");}catch(e){}
  updateSfxButton();if(sfxEnabled){primeSfx();if(preview)playSfx("settle",.72);}
  return sfxEnabled;
}
function updateSfxVolumeUi(){
  const input=document.getElementById("sfxVolume"),label=document.getElementById("sfxVolumeLabel");
  const percent=Math.round(sfxVolume*100);
  if(input){input.value=String(percent);input.setAttribute&&input.setAttribute("aria-valuetext",`${percent} percent`);}
  if(label)label.textContent=`${percent}%`;
  updateSfxButton();
}
function setSfxVolume(value,persist=true){
  const n=Number(value);if(!Number.isFinite(n))return sfxVolume;
  sfxVolume=Math.max(0,Math.min(1,n>1?n/100:n));
  if(persist)try{localStorage.setItem(SFX_VOLUME_KEY,String(sfxVolume));}catch(e){}
  updateSfxVolumeUi();return sfxVolume;
}
let audioReturnFocus=null,audioInertState=[];
function setAudioPanel(open,returnFocus=false,origin=null){
  const panel=document.getElementById("audioPanel"),button=document.getElementById("audioBtn");
  const next=!!open,wasOpen=!!(panel&&!panel.hidden);
  if(next&&!wasOpen){
    audioReturnFocus=origin||(typeof document!=="undefined"?document.activeElement:null)||button;
    audioInertState=[document.querySelector(".wrap"),document.getElementById("overlay"),document.getElementById("guideOverlay")]
      .filter(Boolean)
      .map(node=>({node,inert:!!node.inert,hidden:node.getAttribute&&node.getAttribute("aria-hidden")}));
    audioInertState.forEach(item=>{item.node.inert=true;item.node.setAttribute&&item.node.setAttribute("aria-hidden","true");});
  }
  if(panel)panel.hidden=!next;
  if(button){button.setAttribute&&button.setAttribute("aria-expanded",String(next));button.textContent=next?"Sound · open":"Sound";}
  if(next){const close=document.getElementById("audioCloseBtn");if(close&&typeof close.focus==="function")close.focus();}
  else{
    audioInertState.forEach(item=>{item.node.inert=item.inert;if(item.node.setAttribute&&item.node.removeAttribute){
      if(item.hidden===null||item.hidden===undefined)item.node.removeAttribute("aria-hidden");else item.node.setAttribute("aria-hidden",item.hidden);}});
    audioInertState=[];const target=audioReturnFocus||button;audioReturnFocus=null;
    if(returnFocus&&target&&typeof target.focus==="function")target.focus();
  }
  return next;
}
function particleMarkup(kind){
  if(kind!=="jackpot"&&kind!=="legendary"&&kind!=="quizCorrect")return "";
  const colors=["#10b981","#22d3ee","#f59e0b","#a855f7","#f8fafc"];
  let out="";
  if(kind==="jackpot")for(let i=0;i<18;i++)out+=`<span class="fx-particle" style="--x:${(i*37+9)%96}%;--dur:${1.1+(i%5)*.13}s;--delay:${(i%7)*.045}s;--rot:${(i*47)%180-90}deg;--size:${13+(i%4)*3}px">$</span>`;
  const count=kind==="quizCorrect"?18:24;
  for(let i=0;i<count;i++)out+=`<i class="fx-confetti" style="--particle:${colors[i%colors.length]};--delay:${(i%8)*.025}s;--rot:${i*31}deg;--dx:${((i*73)%320)-160}px;--dy:${((i*97)%260)-80}px"></i>`;
  return out;
}
function fxCopy(kind,data){
  const name=data.name||"";
  if(kind==="profit"||kind==="jackpot")return {tone:"profit",cls:"",kicker:kind==="jackpot"?"Viral scale":"Profitable day",value:"$0",sub:`${Number(data.roas||0).toFixed(2)}× earned ROAS`};
  if(kind==="agencyProfit")return {tone:"profit",cls:"",kicker:"Profitable agency month",value:"$0",sub:"Agency revenue minus operating costs"};
  if(kind==="legendary")return {tone:"legendary",cls:"legendary",kicker:"Legendary creative unlocked",value:name||"Unicorn creative",sub:"High ceiling · watch fatigue"};
  if(kind==="epic")return {tone:"epic",cls:"epic",kicker:"Epic creative unlocked",value:name||"Epic drop",sub:"Stronger hook · more room to scale"};
  if(kind==="creative")return {tone:"profit",cls:"common",kicker:"Creative ready",value:name||"Common drop",sub:"Choose an ad slot to swap it into"};
  if(kind==="swap")return {tone:"profit",cls:"common",kicker:"Creative shipped",value:name||"Replacement creative live",sub:`Slot ${data.slot||""} · fatigue reset`};
  if(kind==="burnout")return {tone:"danger",cls:"danger",kicker:"Attention collapse",value:"CREATIVE BURNOUT",sub:name||"Refresh or replace this ad"};
  if(kind==="review")return {tone:"danger",cls:"danger",kicker:"Algorithm enforcement",value:"DELIVERY HOLD",sub:name||"Rapid scale triggered review"};
  if(kind==="compliance")return {tone:"danger",cls:"danger",kicker:"Account risk",value:"COMPLIANCE FLAG",sub:name||"Creative rejected"};
  if(kind==="signal")return {tone:"danger",cls:"danger",kicker:"Attribution event",value:"PIXEL SIGNAL LOST",sub:name||"Compare account truth with ad reporting"};
  if(kind==="clientRisk")return {tone:"danger",cls:"danger",kicker:"Client operations",value:"CLIENT INCIDENT",sub:name||"Inspect the account and choose a response"};
  if(kind==="warning")return {tone:"legendary",cls:"legendary",kicker:"Compliance review",value:"REVISIONS REQUIRED",sub:name||"One more day before this creative can ship"};
  if(kind==="repair")return {tone:"profit",cls:"",kicker:data.kicker||"Measurement restored",value:data.value||"SIGNAL RESTORED",sub:data.sub||"Future reporting can recover"};
  if(kind==="quizCorrect")return {tone:"profit",cls:"quiz-correct",kicker:"Correct answer",value:"✓",sub:`+${Number(data.points)||500} Training XP`};
  if(kind==="success")return {tone:"profit",cls:"",kicker:data.kicker||"Run complete",value:data.value||"ACCOUNT CLEARED",sub:data.sub||"Target achieved"};
  return {tone:"danger",cls:"danger",kicker:data.kicker||"Run complete",value:data.value||"TARGET MISSED",sub:data.sub||"Read the debrief, then replay the scenario"};
}
function animateFxCash(amount){
  const node=document.getElementById("fxValue");if(!node)return;
  const target=Math.round(Number(amount)||0),format=n=>(n<0?"−$":"+$")+Math.abs(Math.round(n)).toLocaleString();
  if(reducedMotion()||typeof requestAnimationFrame!=="function"){node.textContent=format(target);return;}
  const start=(typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
  const step=now=>{const t=Math.min(1,(now-start)/520),eased=1-Math.pow(1-t,3);node.textContent=format(target*eased);
    if(t<1)requestAnimationFrame(step);};requestAnimationFrame(step);
}
function fireFx(kind,data={},options={}){
  if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.trigger(kind,data);
  if(!options.silent){
    if(kind==="profit"||kind==="agencyProfit")playSfx(SFX_EVENT_CUE.profit);
    else if(kind==="jackpot"||kind==="legendary")playSfx(SFX_EVENT_CUE.legendary);
    else if(kind==="epic")playSfx(SFX_EVENT_CUE.epic);
    else if(kind==="creative")playSfx(SFX_EVENT_CUE.creative);
    else if(kind==="swap")playSfx(SFX_EVENT_CUE.swap);
    else if(kind==="success")playSfx(SFX_EVENT_CUE.success);
    else if(kind==="quizCorrect")playSfx(SFX_EVENT_CUE.quizCorrect);
    else if(kind==="repair")playSfx(SFX_EVENT_CUE.settlement);
    else if(kind==="burnout"||kind==="fail")playSfx(SFX_EVENT_CUE.failure);
    else if(kind==="review"||kind==="compliance"||kind==="signal"||kind==="clientRisk")playSfx(SFX_EVENT_CUE.crisis);
    else playSfx(SFX_EVENT_CUE.error);
  }
  if(!richFxDom()||reducedMotion())return;
  const layer=document.getElementById("fxLayer"),copy=fxCopy(kind,data);
  clearTimeout(fxTimer);layer.innerHTML=`<div class="fx-flash ${copy.tone}"></div>
    <div class="fx-score ${copy.cls}"><div class="fx-kicker">${copy.kicker}</div>
      <div class="fx-value" id="fxValue">${copy.value}</div><div class="fx-roas">${copy.sub}</div></div>${particleMarkup(kind)}`;
  document.body.classList.remove("fx-shake","fx-glitch");
  if(copy.cls==="danger"){void document.body.offsetWidth;document.body.classList.add(kind==="burnout"?"fx-shake":"fx-glitch");}
  if(kind==="profit"||kind==="jackpot"||kind==="agencyProfit")animateFxCash(data.profit);
  fxTimer=setTimeout(()=>{layer.innerHTML="";document.body.classList.remove("fx-shake","fx-glitch");},1550);
}
function queueDayFx(kind,data={}){pendingDayFx.push({kind,data});}
function clearFx(){
  pendingDayFx=[];clearTimeout(fxTimer);clearTimeout(dayFxTimer);dayFxTimer=0;stopSfx("day");
  const layer=document.getElementById("fxLayer");if(layer)layer.innerHTML="";
  if(document.body&&document.body.classList)document.body.classList.remove("fx-shake","fx-glitch");
}
function flushDayFx(){
  if(!pendingDayFx.length)return;
  const best=pendingDayFx.sort((a,b)=>(FX_PRIORITY[b.kind]||0)-(FX_PRIORITY[a.kind]||0))[0];
  pendingDayFx=[];
  /* Let the score-tally animation land before its single prioritized result cue. */
  if(richFxDom()&&!reducedMotion()){
    clearTimeout(dayFxTimer);dayFxTimer=setTimeout(()=>{dayFxTimer=0;fireFx(best.kind,best.data);},DAY_RESULT_FX_DELAY);
  }else fireFx(best.kind,best.data);
}
function creativeRevealFx(c,queued=false){
  const kind=c.rarityClass==="legendary"?"legendary":c.rarityClass==="epic"?"epic":"creative";
  const data={name:c.name||c.fam};queued?queueDayFx(kind,data):fireFx(kind,data);
}
const sfxBtn=document.getElementById("sfxBtn");
if(sfxBtn)sfxBtn.addEventListener("click",()=>setSfx(!sfxEnabled));
const audioBtn=document.getElementById("audioBtn"),audioCloseBtn=document.getElementById("audioCloseBtn");
if(audioBtn)audioBtn.addEventListener("click",()=>{
  const panel=document.getElementById("audioPanel"),next=!panel||panel.hidden;
  if(next&&typeof setRadioOpen==="function")setRadioOpen(false);
  setAudioPanel(next);
});
if(audioCloseBtn)audioCloseBtn.addEventListener("click",()=>setAudioPanel(false,true));
const sfxVolumeInput=document.getElementById("sfxVolume");
if(sfxVolumeInput){
  sfxVolumeInput.addEventListener("input",()=>setSfxVolume(Number(sfxVolumeInput.value)/100));
}
const fxRunBtn=document.getElementById("runBtn");
if(fxRunBtn)fxRunBtn.addEventListener("click",()=>{
  if(fxRunBtn.classList){fxRunBtn.classList.remove("is-tallying");void fxRunBtn.offsetWidth;fxRunBtn.classList.add("is-tallying");
    setTimeout(()=>fxRunBtn.classList.remove("is-tallying"),480);}
  playSfx(SFX_EVENT_CUE.day);
});
function quizTelemetry(){
  try{return S&&S.telemetry?{right:Number(S.telemetry.recallRight)||0,wrong:Number(S.telemetry.recallWrong)||0}:null;}
  catch(e){return null;}
}
const SFX_SILENT_BUTTON_IDS=new Set(["sfxBtn","runBtn","saveNow","sendA","skipA","tutorialToggle","tipsBtn","analogyBtn","ambientBtn","musicVolumeHelp"]);
const SFX_OPEN_BUTTON_IDS=new Set(["audioBtn","radioBtn","menuBtn","openSound","openGuide","openTrainingProgress","openSetup","trainingProgress","loreBtn","helpBtn","binBtn"]);
function semanticButtonCue(button){
  if(!button||button.disabled)return "";
  const explicit=button.dataset&&typeof button.dataset.sfx==="string"?button.dataset.sfx.trim():"";
  if(explicit)return /^(?:none|off|silent)$/i.test(explicit)?"":canonicalSfx(explicit);
  const id=String(button.id||"");if(SFX_SILENT_BUTTON_IDS.has(id))return "";
  if(SFX_OPEN_BUTTON_IDS.has(id))return SFX_EVENT_CUE.open;
  if(/(?:close|back|dismiss|cancel)/i.test(id))return SFX_EVENT_CUE.close;
  if(/(?:launch|confirm|continue|next)$/i.test(id))return SFX_EVENT_CUE.confirm;
  const classes=button.classList;
  if(classes&&(classes.contains("menu-hero-action")||classes.contains("wizard-primary")))return SFX_EVENT_CUE.confirm;
  if(classes&&(classes.contains("wizard-mode-select")||classes.contains("wizard-guidance")||classes.contains("wizard-intent")||
    classes.contains("wizard-stage")||classes.contains("wizard-pure-toggle")||classes.contains("workspace-tab")||classes.contains("entity-chip")))
    return SFX_EVENT_CUE.navigation;
  return "";
}
/* Capture the pre-answer score on pointer input; ordinary buttons are silent by default. */
document.addEventListener("pointerdown",e=>{
  const b=e.target&&typeof e.target.closest==="function"?e.target.closest("button"):null;
  if(!b||b.disabled)return;
  if(b.id==="sendA")quizSfxBefore=quizTelemetry();
});
/* Click, rather than pointerdown, keeps semantic feedback identical for mouse, touch and keyboard. */
document.addEventListener("click",e=>{
  const button=e.target&&typeof e.target.closest==="function"?e.target.closest("button"):null;
  const cue=semanticButtonCue(button);if(cue)playSfx(cue);
});
/* Capture supplies the pre-answer score for keyboard activation, which has no pointerdown. */
document.addEventListener("click",e=>{
  const b=e.target&&typeof e.target.closest==="function"?e.target.closest("button"):null;
  if(b&&b.id==="sendA"&&!quizSfxBefore)quizSfxBefore=quizTelemetry();
},true);
document.addEventListener("click",e=>{
  const b=e.target&&typeof e.target.closest==="function"?e.target.closest("button"):null;
  if(!b||b.id!=="sendA")return;
  const after=quizTelemetry(),before=quizSfxBefore;quizSfxBefore=null;
  if(after&&before&&after.right>before.right)playSfx(SFX_EVENT_CUE.quizCorrect);
  else playSfx(SFX_EVENT_CUE.quizWrong);
});
document.addEventListener("keydown",e=>{
  const panel=document.getElementById("audioPanel");if(!panel||panel.hidden)return;
  if(e.key==="Tab"){
    const focusable=Array.from(panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[href],[tabindex]:not([tabindex="-1"])'))
      .filter(el=>!el.hidden&&!el.inert&&(typeof el.getClientRects!=="function"||el.getClientRects().length>0));
    if(!focusable.length){e.preventDefault();const close=document.getElementById("audioCloseBtn");if(close)close.focus();return;}
    const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
    if(e.shiftKey&&active===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
    return;
  }
  if(e.key==="Escape"){e.preventDefault();setAudioPanel(false,true);}
});
updateSfxButton();
updateSfxVolumeUi();
