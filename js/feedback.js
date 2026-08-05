"use strict";
/* ---------------- audiovisual feedback: cosmetic only, never touches seeded RNG ---------- */
const SFX_KEY="media-buying-trainer-sfx-v1";
const SFX_VOLUME_KEY="media-buying-trainer-sfx-volume-v1";
const SFX_IDS=Object.freeze(["click","tally","settle","profit","jackpot","creative","warning","failure"]);
const SFX_FALLBACK=Object.freeze({
  click:Object.freeze({id:"click",label:"Tactile control",file:"assets/audio/select_004.ogg"}),
  tally:Object.freeze({id:"tally",label:"Run-day tally",file:"assets/audio/scroll_002.ogg"}),
  settle:Object.freeze({id:"settle",label:"Value settled / saved",file:"assets/audio/confirmation_003.ogg"}),
  profit:Object.freeze({id:"profit",label:"Profitable result",file:"assets/audio/confirmation_004.ogg"}),
  jackpot:Object.freeze({id:"jackpot",label:"Jackpot / Legendary",file:"assets/audio/maximize_005.ogg"}),
  creative:Object.freeze({id:"creative",label:"Creative ready / swapped",file:"assets/audio/drop_004.ogg"}),
  warning:Object.freeze({id:"warning",label:"Warning / crisis",file:"assets/audio/error_003.ogg"}),
  failure:Object.freeze({id:"failure",label:"Burnout / failed run",file:"assets/audio/scratch_004.ogg"})
});
const suppliedSfx=(typeof SFX_CUES!=="undefined"&&Array.isArray(SFX_CUES))?SFX_CUES:[];
const suppliedSfxById=Object.fromEntries(suppliedSfx.filter(c=>c&&SFX_IDS.includes(c.id)).map(c=>[c.id,c]));
/* Always expose exactly eight semantic cues. SFX_CUES is the source of truth; the local rows only
   keep the feedback layer safe if it is opened in isolation during development. */
const SFX_DEFS=Object.freeze(SFX_IDS.map(id=>Object.freeze({...SFX_FALLBACK[id],...(suppliedSfxById[id]||{})})));
const SFX_FILES=Object.freeze(Object.fromEntries(SFX_DEFS.map(c=>[c.id,c.file])));
const SFX_EVENT_CUE=Object.freeze({
  control:"click",day:"tally",profit:"profit",error:"warning",creative:"creative",
  quizCorrect:"settle",quizWrong:"warning",save:"settle",settlement:"settle",
  jackpot:"jackpot",failure:"failure"
});
/* Compatibility aliases keep existing callers working without introducing extra cue files. */
const SFX_ALIASES=Object.freeze({tick:"tally",success:"settle",reveal:"jackpot",error:"warning",glitch:"failure",swap:"creative"});
const SFX_GAIN=Object.freeze({click:.52,tally:.72,settle:.72,profit:.86,jackpot:.90,creative:.76,warning:.70,failure:.74});
const FX_PRIORITY={review:100,compliance:100,burnout:90,fail:88,signal:86,legendary:82,jackpot:74,
                   epic:62,warning:55,profit:48,creative:30,swap:24,success:20};
let sfxEnabled=false,sfxVolume=.42,sfxBank={},pendingDayFx=[],fxTimer=0,quizSfxBefore=null;
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
  Object.entries(SFX_FILES).forEach(([key,src])=>{
    if(sfxBank[key]) return;
    try{const audio=new Audio(src);audio.preload="auto";sfxBank[key]=audio;}catch(e){}
  });
}
function playSfx(key,gain,options={}){
  const cue=canonicalSfx(key),force=!!(options&&options.force);
  if(!cue||(!sfxEnabled&&!force)||sfxVolume<=0||typeof Audio!=="function") return false;
  primeSfx(); const source=sfxBank[cue]; if(!source) return false;
  const cueGain=Number.isFinite(Number(gain))?Number(gain):(SFX_GAIN[cue]||.7);
  try{const sound=typeof source.cloneNode==="function"?source.cloneNode():new Audio(SFX_FILES[cue]);
    sound.volume=Math.max(0,Math.min(1,sfxVolume*Math.max(0,Math.min(1,cueGain))));
    if("currentTime" in sound)sound.currentTime=0;
    const played=sound.play();
    if(played&&typeof played.catch==="function")played.catch(()=>{});
    return true;
  }catch(e){return false;}
}
function updateSfxButton(){
  const btn=document.getElementById("sfxBtn"); if(!btn)return;
  btn.textContent=sfxEnabled?"SFX ON":"SFX OFF";btn.setAttribute&&btn.setAttribute("aria-pressed",String(sfxEnabled));
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
function setAudioPanel(open,returnFocus=false){
  const panel=document.getElementById("audioPanel"),button=document.getElementById("audioBtn");
  const next=!!open;if(panel)panel.hidden=!next;
  if(button){button.setAttribute&&button.setAttribute("aria-expanded",String(next));button.textContent=next?"Sound · open":"Sound";}
  if(!next&&returnFocus&&button&&typeof button.focus==="function")button.focus();
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
  if(kind==="legendary")return {tone:"legendary",cls:"legendary",kicker:"Legendary creative unlocked",value:name||"Unicorn creative",sub:"High ceiling · watch fatigue"};
  if(kind==="epic")return {tone:"epic",cls:"epic",kicker:"Epic creative unlocked",value:name||"Epic drop",sub:"Stronger hook · more room to scale"};
  if(kind==="creative")return {tone:"profit",cls:"common",kicker:"Creative ready",value:name||"Common drop",sub:"Choose an ad slot to swap it into"};
  if(kind==="swap")return {tone:"profit",cls:"common",kicker:"Creative shipped",value:name||"Replacement creative live",sub:`Slot ${data.slot||""} · fatigue reset`};
  if(kind==="burnout")return {tone:"danger",cls:"danger",kicker:"Attention collapse",value:"CREATIVE BURNOUT",sub:name||"Refresh or replace this ad"};
  if(kind==="review")return {tone:"danger",cls:"danger",kicker:"Algorithm enforcement",value:"DELIVERY HOLD",sub:name||"Rapid scale triggered review"};
  if(kind==="compliance")return {tone:"danger",cls:"danger",kicker:"Account risk",value:"COMPLIANCE FLAG",sub:name||"Creative rejected"};
  if(kind==="signal")return {tone:"danger",cls:"danger",kicker:"Attribution event",value:"PIXEL SIGNAL LOST",sub:name||"Compare account truth with ad reporting"};
  if(kind==="warning")return {tone:"legendary",cls:"legendary",kicker:"Compliance review",value:"REVISIONS REQUIRED",sub:name||"One more day before this creative can ship"};
  if(kind==="quizCorrect")return {tone:"profit",cls:"quiz-correct",kicker:"Correct answer",value:"✓",sub:`+${Number(data.points)||500} training points`};
  if(kind==="success")return {tone:"profit",cls:"",kicker:data.kicker||"Run complete",value:data.value||"ACCOUNT CLEARED",sub:data.sub||"Target achieved"};
  return {tone:"danger",cls:"danger",kicker:data.kicker||"Run complete",value:data.value||"TARGET MISSED",sub:data.sub||"Read the debrief and rerun the seed"};
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
  if(!options.silent){
    if(kind==="profit")playSfx(SFX_EVENT_CUE.profit);
    else if(kind==="jackpot"||kind==="legendary")playSfx(SFX_EVENT_CUE.jackpot);
    else if(kind==="epic"||kind==="creative"||kind==="swap")playSfx(SFX_EVENT_CUE.creative);
    else if(kind==="success"||kind==="quizCorrect")playSfx(SFX_EVENT_CUE.quizCorrect);
    else if(kind==="burnout"||kind==="fail")playSfx(SFX_EVENT_CUE.failure);
    else playSfx(SFX_EVENT_CUE.error);
  }
  if(!richFxDom()||reducedMotion())return;
  const layer=document.getElementById("fxLayer"),copy=fxCopy(kind,data);
  clearTimeout(fxTimer);layer.innerHTML=`<div class="fx-flash ${copy.tone}"></div>
    <div class="fx-score ${copy.cls}"><div class="fx-kicker">${copy.kicker}</div>
      <div class="fx-value" id="fxValue">${copy.value}</div><div class="fx-roas">${copy.sub}</div></div>${particleMarkup(kind)}`;
  document.body.classList.remove("fx-shake","fx-glitch");
  if(copy.cls==="danger"){void document.body.offsetWidth;document.body.classList.add(kind==="burnout"?"fx-shake":"fx-glitch");}
  if(kind==="profit"||kind==="jackpot")animateFxCash(data.profit);
  fxTimer=setTimeout(()=>{layer.innerHTML="";document.body.classList.remove("fx-shake","fx-glitch");},1550);
}
function queueDayFx(kind,data={}){pendingDayFx.push({kind,data});}
function clearFx(){
  pendingDayFx=[];clearTimeout(fxTimer);
  const layer=document.getElementById("fxLayer");if(layer)layer.innerHTML="";
  if(document.body&&document.body.classList)document.body.classList.remove("fx-shake","fx-glitch");
}
function flushDayFx(){
  if(!pendingDayFx.length)return;
  const best=pendingDayFx.sort((a,b)=>(FX_PRIORITY[b.kind]||0)-(FX_PRIORITY[a.kind]||0))[0];
  pendingDayFx=[];
  if(richFxDom()&&!reducedMotion())setTimeout(()=>fireFx(best.kind,best.data),180);else fireFx(best.kind,best.data);
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
  sfxVolumeInput.addEventListener("change",()=>playSfx("click",.7));
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
document.addEventListener("pointerdown",e=>{
  const b=e.target&&typeof e.target.closest==="function"?e.target.closest("button"):null;
  if(!b||b.disabled)return;
  if(b.id==="sendA"){quizSfxBefore=quizTelemetry();return;}
  if(b.id!=="sfxBtn"&&b.id!=="runBtn"&&b.id!=="saveNow"&&!b.dataset.sfxPreview)playSfx(SFX_EVENT_CUE.control);
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
  if(e.key!=="Escape")return;
  const panel=document.getElementById("audioPanel");if(panel&&!panel.hidden){e.preventDefault();setAudioPanel(false,true);}
});
updateSfxButton();
updateSfxVolumeUi();
