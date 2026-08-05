"use strict";
/* Ambient data field: a cosmetic, read-only view of simulation state and first-party SFX. */
const AmbientBackground=(()=>{
  const STORAGE_KEY="media-buying-trainer-ambient-v1";
  const canvas=document.getElementById("ambientCanvas");
  const toggle=document.getElementById("ambientBtn");
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
  const mix=(from,to,amount)=>from+(to-from)*clamp(amount);
  const average=values=>values.length?values.reduce((sum,value)=>sum+(Number(value)||0),0)/values.length:0;
  const maximum=values=>values.length?Math.max(...values.map(value=>Number(value)||0)):0;
  const motionQuery=(()=>{try{return window.matchMedia("(prefers-reduced-motion: reduce)");}catch(error){return null;}})();
  const forcedColorsQuery=(()=>{try{return window.matchMedia("(forced-colors: active)");}catch(error){return null;}})();
  const saveData=(()=>{try{return !!(navigator.connection&&navigator.connection.saveData);}catch(error){return false;}})();
  const prefersStatic=()=>!!(motionQuery&&motionQuery.matches)||!!(forcedColorsQuery&&forcedColorsQuery.matches)||saveData;
  let enabled=(()=>{try{return localStorage.getItem(STORAGE_KEY)!=="off";}catch(error){return true;}})(),initialized=false;
  let staticOnly=prefersStatic();
  let gl=null,program=null,buffer=null,frameId=0,lastFrame=0,lastSample=0,lastWidth=0,lastHeight=0;
  let audioContext=null,analyser=null,frequencyData=null,audioSources=new WeakMap();
  let bassEnvelope=0,trebleEnvelope=0,eventPulse=0,eventTone=0,glitch=0;
  let phaseA=[0,0],phaseB=[0,0],flow=[0,0];
  let accent=[1,.0,.5],accentTarget=[1,.0,.5];
  let pointer=[.5,.52],pointerTarget=[.5,.52],pointerStrength=0,pointerStrengthTarget=0;
  let state={performance:0,stress:.08,activity:.18},stateTarget={...state};
  let uniforms={};

  const VERTEX_SOURCE=[
    "attribute vec2 a_position;",
    "void main(){gl_Position=vec4(a_position,0.0,1.0);}"
  ].join("\n");
  const FRAGMENT_SOURCE=[
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 u_resolution;",
    "uniform vec2 u_phase_a;",
    "uniform vec2 u_phase_b;",
    "uniform vec2 u_flow;",
    "uniform vec2 u_glitch_clock;",
    "uniform vec2 u_audio;",
    "uniform vec3 u_roas_color;",
    "uniform vec3 u_accent_color;",
    "uniform float u_stress;",
    "uniform float u_activity;",
    "uniform float u_pulse;",
    "uniform float u_glitch;",
    "uniform vec2 u_mouse;",
    "uniform float u_mouse_strength;",
    /* Bound the hash domain and multiplier so genuine mediump WebGL1 GPUs keep fractional detail. */
    "float hash(vec2 p){p=mod(p,71.0);return fract(sin(dot(p,vec2(12.9898,53.1215)))*437.5453);}",
    "float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}",
    "void main(){",
    "  vec2 p=(gl_FragCoord.xy-.5*u_resolution.xy)/u_resolution.y;",
    "  vec2 mouseP=(u_mouse*u_resolution-.5*u_resolution.xy)/u_resolution.y;",
    "  vec2 mouseDelta=p-mouseP;",
    "  float mouseDistance=length(mouseDelta);",
    "  float lens=exp(-mouseDistance*mouseDistance*24.0)*u_mouse_strength;",
    "  p+=normalize(mouseDelta+vec2(.0001))*(.025+.035*u_stress)*lens;",
    "  float bass=u_audio.x;float treble=u_audio.y;",
    "  float horizon=-.18+.035*sin(u_phase_a.x);",
    "  float depth=1.0/(abs(p.y-horizon)+.22);",
    "  float instability=.025+u_stress*.085+u_glitch*.07;",
    "  float warp=sin(p.y*13.0+u_phase_a.y)*instability+sin(p.x*19.0-u_phase_b.x)*instability*.42;",
    "  vec2 gridUv=vec2((p.x+warp)*depth*(6.5+bass*2.8),depth*2.15-u_flow.x);",
    "  gridUv.x+=sin(fract(gridUv.y)*6.2831853+u_phase_b.y)*(.10+u_stress*.22);",
    "  float glitchBand=step(.88,hash(vec2(floor(p.y*74.0),u_glitch_clock.x)))*u_glitch;",
    "  gridUv.x+=(hash(vec2(floor(p.y*96.0),u_glitch_clock.y))-.5)*glitchBand*1.4;",
    "  vec2 edge=abs(fract(gridUv)-.5);",
    "  float lineX=smoothstep(.472,.5,edge.x);",
    "  float lineY=smoothstep(.462,.5,edge.y);",
    "  float grid=max(lineX*.58,lineY);",
    "  float node=lineX*lineY*(.38+treble*1.5);",
    "  float stream=pow(max(0.0,sin(fract(gridUv.y+gridUv.x*.13)*6.2831853)),22.0)*(.12+u_activity*.34);",
    "  float pulseRadius=(1.0-u_pulse)*1.05;",
    "  float ring=(1.0-smoothstep(.0,.035,abs(length(p-mouseP*.22)-pulseRadius)))*u_pulse;",
    "  float fog=noise(p*3.0+vec2(0.0,u_flow.y))*(.05+.07*u_activity);",
    "  float vignette=clamp(1.12-length(p)*.68,0.0,1.0);",
    "  vec3 base=vec3(.006,.012,.027);",
    "  vec3 color=base+u_roas_color*(grid*.15+stream+fog);",
    "  color+=u_accent_color*(node*.42+lens*.12+ring*.30);",
    "  color+=vec3(1.0,.19,.07)*glitchBand*.12;",
    "  color*=vignette;",
    "  gl_FragColor=vec4(color,.94);",
    "}"
  ].join("\n");

  function setStyle(name,value){
    if(!canvas||!canvas.style)return;
    if(typeof canvas.style.setProperty==="function")canvas.style.setProperty(name,value);else canvas.style[name]=value;
  }
  function updateToggle(){
    if(!toggle)return;
    const label=enabled?(staticOnly?"AMBIENT STATIC":"AMBIENT ON"):"AMBIENT OFF";
    toggle.textContent=label;toggle.setAttribute("aria-pressed",String(enabled));
    toggle.setAttribute("aria-label",enabled?"Turn ambient data field off":"Turn ambient data field on");
    toggle.title=staticOnly&&enabled?"A static fallback respects browser, device, motion, color, and data-saving capabilities.":"Ambient visuals never affect simulation outcomes.";
  }
  function applyBodyState(){
    if(!document.body||!document.body.classList)return;
    document.body.classList.toggle("ambient-enabled",initialized&&enabled);
    document.body.classList.toggle("ambient-static",initialized&&enabled&&staticOnly);
  }
  function fallback(reason){
    stop();try{if(gl&&buffer)gl.deleteBuffer(buffer);if(gl&&program)gl.deleteProgram(program);}catch(error){}
    gl=null;program=null;buffer=null;uniforms={};staticOnly=true;
    resetTransient();
    if(canvas&&canvas.dataset)canvas.dataset.engine="static";
    if(canvas&&reason)canvas.dataset.reason=reason;
    applyBodyState();updateToggle();return false;
  }
  function shader(type,source){
    const item=gl.createShader(type);gl.shaderSource(item,source);gl.compileShader(item);
    if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)){gl.deleteShader(item);return null;}return item;
  }
  function initWebGl(){
    if(!canvas||staticOnly||typeof canvas.getContext!=="function"||typeof requestAnimationFrame!=="function")return fallback(staticOnly?"motion-preference":"webgl-unavailable");
    try{gl=canvas.getContext("webgl",{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:"low-power",preserveDrawingBuffer:false})||canvas.getContext("experimental-webgl");}catch(error){gl=null;}
    if(!gl)return fallback("webgl-unavailable");
    const vertex=shader(gl.VERTEX_SHADER,VERTEX_SOURCE),fragment=shader(gl.FRAGMENT_SHADER,FRAGMENT_SOURCE);
    if(!vertex||!fragment){try{if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);}catch(error){}return fallback("shader-unavailable");}
    program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return fallback("shader-unavailable");
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for(const name of ["u_resolution","u_phase_a","u_phase_b","u_flow","u_glitch_clock","u_audio","u_roas_color","u_accent_color","u_stress","u_activity","u_pulse","u_glitch","u_mouse","u_mouse_strength"])
      uniforms[name]=gl.getUniformLocation(program,name);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
    if(canvas.dataset){canvas.dataset.engine="webgl";delete canvas.dataset.reason;}
    resize();start();return true;
  }
  function resize(){
    if(!canvas||!gl)return;
    const width=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
    const height=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    const memory=(()=>{try{return Number(navigator.deviceMemory)||4;}catch(error){return 4;}})();
    const dpr=Math.min(memory<=2?1:1.5,Math.max(1,window.devicePixelRatio||1));
    const pixelWidth=Math.round(width*dpr),pixelHeight=Math.round(height*dpr);
    if(pixelWidth===lastWidth&&pixelHeight===lastHeight)return;
    lastWidth=pixelWidth;lastHeight=pixelHeight;canvas.width=pixelWidth;canvas.height=pixelHeight;gl.viewport(0,0,pixelWidth,pixelHeight);
  }
  function ratioPerformance(ratio,high=2){
    if(ratio===null||!Number.isFinite(ratio))return 0;
    return ratio>=1?clamp((ratio-1)/Math.max(.01,high-1),0,1):clamp((ratio-1)/.5,-1,0);
  }
  function sampleGameState(){
    const neutral={performance:0,stress:.08,activity:.18};
    try{
      if(typeof S==="undefined"||!S)return neutral;
      const stateValue=S,mode=typeof MODE==="number"?MODE:1;
      if(mode===0){
        const ratio=stateValue.spendTotal>0?stateValue.valueTotal/stateValue.spendTotal:null;
        const groups=Array.isArray(stateValue.groups)?stateValue.groups:[];
        const activeGroups=groups.filter(group=>!group.paused),qualityStress=maximum(activeGroups.map(group=>clamp((6-(Number(group.qs)||6))/5)));
        const trust=stateValue.client&&Number(stateValue.client.trust),tension=stateValue.client&&Number(stateValue.client.tension);
        const delivered=activeGroups.reduce((sum,group)=>sum+(Number(group.last&&group.last.spend)||0),0);
        const activity=delivered>0?clamp(delivered/Math.max(1,Number(stateValue.budget)||1)):clamp(activeGroups.length/Math.max(1,groups.length),.12,1);
        const trackingStress=activeGroups.some(group=>group.trackingBroken) ? .58 : 0;
        return {performance:ratioPerformance(ratio),stress:clamp(Math.max(qualityStress,trackingStress,Number.isFinite(trust)?(60-trust)/45:0,Number.isFinite(tension)?tension/100:0)),activity};
      }
      if(mode===5){
        const accounts=Array.isArray(stateValue.accounts)?stateValue.accounts:[];
        const allInCost=(Number(stateValue.billedTotal)||0)+(Number(stateValue.opsCost)||0);
        const contributionRatio=allInCost>0?(Number(stateValue.modeledRevenue)||0)/allInCost:null;
        const fatigue=maximum(accounts.map(account=>account.fatigue))/100,holds=accounts.filter(account=>account.paused||account.blockedDays>0).length;
        const crisis=Array.isArray(stateValue.crises)?stateValue.crises.length:0;
        const allocation=accounts.filter(account=>!account.paused&&!(account.blockedDays>0)).reduce((sum,account)=>sum+(Number(account.budget)||0),0);
        const creditLimit=Number(stateValue.finance&&stateValue.finance.creditLimit)||0,creditUsed=Number(stateValue.finance&&stateValue.finance.creditUsed)||0;
        const liquidityStress=creditLimit?clamp((creditUsed/creditLimit-.55)/.45):0;
        return {performance:ratioPerformance(contributionRatio,1.18),stress:clamp(Math.max(fatigue*.82,crisis/3,holds/Math.max(1,accounts.length),liquidityStress)),activity:clamp(allocation/(typeof DAILY==="number"?DAILY:allocation||1))};
      }
      if(mode===6){
        const costs=Number(stateValue.cumulativeCosts)||0,profit=Number(stateValue.cumulativeProfit)||0;
        const clients=Array.isArray(stateValue.clients)?stateValue.clients.filter(client=>!client.ended):[];
        const funnels=stateValue.affiliate&&Array.isArray(stateValue.affiliate.funnels)?stateValue.affiliate.funnels:[];
        const incidents=clients.filter(client=>client.incident).length,serviceStress=maximum(clients.map(client=>Math.max(Number(client.serviceDebt)||0,(55-(Number(client.trust)||55))/6)))/10;
        const funnelStress=maximum(funnels.map(funnel=>Math.max(Number(funnel.fatigue)||0,Number(funnel.complianceHeat)||0,(Number(funnel.pausedDays)||0)*35)))/100;
        const creditLimit=Number(stateValue.creditLimit)||0,cash=Number(stateValue.cash)||0;
        const liquidityStress=creditLimit?clamp(Math.max(0,-cash)/creditLimit):0,payrollStress=clamp((Number(stateValue.payrollMisses)||0)/2);
        let capacityStress=0;
        try{const capacityValue=typeof AgencyCareer!=="undefined"&&AgencyCareer&&AgencyCareer.capacity?AgencyCareer.capacity(stateValue):null;
          if(capacityValue)capacityStress=clamp((Number(capacityValue.utilization)-.75)/.5);}catch(error){}
        return {performance:costs?clamp((profit/costs)*2,-1,1):0,stress:clamp(Math.max(incidents/3,serviceStress,funnelStress,liquidityStress,payrollStress,capacityStress)),activity:clamp((clients.length+funnels.length)/15,.16,1)};
      }
      const slots=Array.isArray(stateValue.slots)?stateValue.slots:[],ratio=stateValue.spendTotal>0?stateValue.earnedRevenue/stateValue.spendTotal:null;
      const active=slots.filter(slot=>slot.alive&&slot.budget>0),allocation=active.reduce((sum,slot)=>sum+(Number(slot.budget)||0),0);
      const fatigue=maximum(active.map(slot=>slot.fatigue))/100,holds=active.filter(slot=>slot.blocked>0).length;
      const pixelStress=stateValue.pixel&&stateValue.pixel.status==="degraded" ? .72 : 0;
      return {performance:ratioPerformance(ratio),stress:clamp(Math.max(fatigue*.86,pixelStress,holds/Math.max(1,active.length))),activity:clamp(allocation/(typeof DAILY==="number"?DAILY:allocation||1))};
    }catch(error){return neutral;}
  }
  function stateColor(performance,stressValue,tone=eventTone){
    const neutral=[.03,.32,.43],good=[.04,.84,.57],bad=[.94,.15,.25],warning=[1,.43,.07];
    const signed=performance>=0?good:bad,amount=Math.abs(performance);
    let color=neutral.map((value,index)=>mix(value,signed[index],amount));
    const danger=clamp(stressValue*.72+Math.max(0,-tone)*.35);
    color=color.map((value,index)=>mix(value,warning[index],danger));
    if(tone>0)color=color.map((value,index)=>mix(value,good[index],tone*.32));
    return color;
  }
  function parseColor(value){
    const match=String(value||"").trim().match(/^#([0-9a-f]{6})$/i);if(!match)return null;
    const number=parseInt(match[1],16);return [((number>>16)&255)/255,((number>>8)&255)/255,(number&255)/255];
  }
  function setAccent(value){const parsed=parseColor(value);if(parsed)accentTarget=parsed;return !!parsed;}
  function publishStateColor(){
    const color=stateColor(stateTarget.performance,stateTarget.stress,staticOnly?0:eventTone),rgb=color.map(value=>Math.round(value*255));
    setStyle("--ambient-state","rgb("+rgb.join(" ")+")");
    setStyle("--ambient-state-soft","rgba("+rgb.join(",")+",.13)");
    setStyle("--ambient-state-faint","rgba("+rgb.join(",")+",.052)");
    if(canvas&&canvas.dataset){canvas.dataset.performance=stateTarget.performance>.12?"positive":stateTarget.performance<-.12?"negative":"neutral";canvas.dataset.risk=stateTarget.stress>.66?"high":stateTarget.stress>.32?"watch":"low";}
    return color;
  }
  function sync(){stateTarget=sampleGameState();publishStateColor();return {...stateTarget};}
  function audioLevels(delta){
    let measuredBass=0,measuredTreble=0;
    if(analyser&&frequencyData&&audioContext&&audioContext.state==="running"){
      try{analyser.getByteFrequencyData(frequencyData);measuredBass=average(Array.from(frequencyData.slice(0,4)))/255;measuredTreble=average(Array.from(frequencyData.slice(7,18)))/255;}catch(error){}
    }
    bassEnvelope=Math.max(measuredBass,bassEnvelope*Math.exp(-delta*3.1));
    trebleEnvelope=Math.max(measuredTreble,trebleEnvelope*Math.exp(-delta*4.8));
    return [clamp(bassEnvelope),clamp(trebleEnvelope)];
  }
  function renderFrame(now){
    frameId=0;if(!enabled||staticOnly||!gl||document.hidden)return;
    if(now-lastFrame<32){frameId=requestAnimationFrame(renderFrame);return;}
    const delta=Math.min(.08,Math.max(.001,(now-(lastFrame||now-16))/1000));lastFrame=now;
    if(now-lastSample>180){sync();lastSample=now;}
    const easing=1-Math.exp(-delta*2.5);
    state.performance=mix(state.performance,stateTarget.performance,easing);state.stress=mix(state.stress,stateTarget.stress,easing);state.activity=mix(state.activity,stateTarget.activity,easing);
    pointer[0]=mix(pointer[0],pointerTarget[0],1-Math.exp(-delta*8));pointer[1]=mix(pointer[1],pointerTarget[1],1-Math.exp(-delta*8));
    pointerStrength=mix(pointerStrength,pointerStrengthTarget,1-Math.exp(-delta*7));accent=accent.map((value,index)=>mix(value,accentTarget[index],easing));
    eventPulse*=Math.exp(-delta*1.55);eventTone*=Math.exp(-delta*1.15);glitch*=Math.exp(-delta*3.6);
    const audio=audioLevels(delta),tau=Math.PI*2;
    phaseA[0]=(phaseA[0]+delta*.21)%tau;phaseA[1]=(phaseA[1]+delta*(.55+audio[0]*.55))%tau;
    phaseB[0]=(phaseB[0]+delta*.37)%tau;phaseB[1]=(phaseB[1]+delta*.35)%tau;
    /* Grid translation wraps by exactly one cell and fog wraps by its 71-cell hash period, so neither seam can jump. */
    flow[0]=(flow[0]+delta*(.25+state.activity*.52))%1;flow[1]=(flow[1]+delta*.06)%71;
    const glitchClock=[Math.floor(now*.017)%67,Math.floor(now*.023)%67],color=stateColor(state.performance,state.stress);resize();
    gl.useProgram(program);gl.uniform2f(uniforms.u_resolution,lastWidth,lastHeight);
    gl.uniform2f(uniforms.u_phase_a,phaseA[0],phaseA[1]);gl.uniform2f(uniforms.u_phase_b,phaseB[0],phaseB[1]);
    gl.uniform2f(uniforms.u_flow,flow[0],flow[1]);gl.uniform2f(uniforms.u_glitch_clock,glitchClock[0],glitchClock[1]);
    gl.uniform2f(uniforms.u_audio,audio[0],audio[1]);gl.uniform3f(uniforms.u_roas_color,color[0],color[1],color[2]);
    gl.uniform3f(uniforms.u_accent_color,accent[0],accent[1],accent[2]);gl.uniform1f(uniforms.u_stress,state.stress);
    gl.uniform1f(uniforms.u_activity,state.activity);gl.uniform1f(uniforms.u_pulse,eventPulse);gl.uniform1f(uniforms.u_glitch,glitch);
    gl.uniform2f(uniforms.u_mouse,pointer[0],pointer[1]);gl.uniform1f(uniforms.u_mouse_strength,pointerStrength);
    gl.drawArrays(gl.TRIANGLES,0,6);frameId=requestAnimationFrame(renderFrame);
  }
  function start(){if(!enabled||staticOnly||!gl||frameId||document.hidden)return false;lastFrame=0;frameId=requestAnimationFrame(renderFrame);return true;}
  function stop(){if(frameId&&typeof cancelAnimationFrame==="function")cancelAnimationFrame(frameId);frameId=0;return true;}
  function resetTransient(){bassEnvelope=0;trebleEnvelope=0;eventPulse=0;eventTone=0;glitch=0;pointerStrength=0;pointerStrengthTarget=0;}
  function setEnabled(value,persist=true){
    enabled=!!value;if(persist)try{localStorage.setItem(STORAGE_KEY,enabled?"on":"off");}catch(error){}
    if(!initialized){init();return enabled;}
    if(!enabled){stop();resetTransient();if(canvas&&canvas.dataset)canvas.dataset.engine="disabled";}
    else if(!staticOnly){if(gl){if(canvas&&canvas.dataset)canvas.dataset.engine="webgl";start();}else initWebGl();}
    else if(canvas&&canvas.dataset)canvas.dataset.engine="static";
    applyBodyState();updateToggle();return enabled;
  }
  function trigger(kind){
    if(!initialized||!enabled||staticOnly)return {pulse:eventPulse,tone:eventTone,glitch};
    const positive=["profit","agencyProfit","jackpot","legendary","epic","creative","swap","success","quizCorrect"].includes(kind);
    const severe=["burnout","review","compliance","signal","clientRisk","fail","failure","error","warning"].includes(kind);
    eventPulse=Math.max(eventPulse,positive ? .92 : (severe ? .98 : .54));eventTone=positive?1:severe?-1:eventTone;
    glitch=Math.max(glitch,severe ? .92 : (kind==="swap" ? .18 : 0));
    return {pulse:eventPulse,tone:eventTone,glitch};
  }
  function noteAudioCue(cue,gain=.7){
    if(!initialized||!enabled||staticOnly)return [bassEnvelope,trebleEnvelope];
    const bass={tally:.62,profit:.72,jackpot:1,failure:.78,warning:.52,creative:.42,settle:.34,click:.18};
    const treble={tally:.38,profit:.56,jackpot:.86,failure:.64,warning:.76,creative:.7,settle:.58,click:.48};
    bassEnvelope=Math.max(bassEnvelope,(bass[cue]||.25)*clamp(gain,0,1));trebleEnvelope=Math.max(trebleEnvelope,(treble[cue]||.35)*clamp(gain,0,1));
    return [bassEnvelope,trebleEnvelope];
  }
  function ensureAnalyser(){
    if(analyser){if(audioContext.state==="suspended")try{const resumed=audioContext.resume();if(resumed&&typeof resumed.catch==="function")resumed.catch(()=>{});}catch(error){}return audioContext.state==="running";}
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(typeof AudioContextClass!=="function")return false;
    try{audioContext=new AudioContextClass();analyser=audioContext.createAnalyser();analyser.fftSize=64;analyser.smoothingTimeConstant=.72;frequencyData=new Uint8Array(analyser.frequencyBinCount);analyser.connect(audioContext.destination);
      if(audioContext.state==="suspended"){const resumed=audioContext.resume();if(resumed&&typeof resumed.catch==="function")resumed.catch(()=>{});}return audioContext.state==="running";
    }catch(error){audioContext=null;analyser=null;frequencyData=null;return false;}
  }
  function connectAudioElement(element){
    if(!initialized||!enabled||staticOnly||!element||!ensureAnalyser()||audioSources.has(element))return false;
    try{const source=audioContext.createMediaElementSource(element);source.connect(analyser);audioSources.set(element,source);
      const release=()=>{try{source.disconnect();}catch(error){}};
      if(typeof element.addEventListener==="function"){element.addEventListener("ended",release,{once:true});element.addEventListener("pause",release,{once:true});}
      return true;
    }catch(error){return false;}
  }
  function focusTarget(event){
    if(!initialized||!enabled||staticOnly)return;
    if(event.pointerType==="touch"){pointerStrengthTarget=0;return;}
    const width=Math.max(1,window.innerWidth||1),height=Math.max(1,window.innerHeight||1);
    pointerTarget=[clamp(event.clientX/width),clamp(1-event.clientY/height)];
    const overlay=document.getElementById("overlay"),guide=document.getElementById("guideOverlay");
    if((overlay&&overlay.innerHTML)||(guide&&guide.innerHTML)){pointerStrengthTarget=.08;return;}
    let interactive=false;try{interactive=!!(event.target&&event.target.closest&&event.target.closest(".slot,.classic-slot,.night-workstream,.agency-client-card,.affiliate-funnel-card,.stat,button"));}catch(error){}
    pointerStrengthTarget=interactive?1:.28;
  }
  function clickPulse(event){
    if(!initialized||!enabled||staticOnly)return;
    let button=null;try{button=event.target&&event.target.closest?event.target.closest("button"):null;}catch(error){}
    if(!button||button.disabled)return;
    const action=(button.dataset&&(button.dataset.act||button.dataset.night||button.dataset.ca||button.dataset.affiliateAction||button.dataset.agencyAction))||"";
    if(["plus","budget-plus","bid+","scale-up"].includes(action))trigger("scale");
    else if(["minus","budget-minus","bid-","scale-down","kill","pause"].includes(action))trigger("warning");
    else{eventPulse=Math.max(eventPulse,.28);pointerStrengthTarget=1;}
  }
  function syncInitialAccent(){try{if(typeof radioPrefs!=="undefined"&&typeof radioStation==="function"){const station=radioStation(radioPrefs.station);if(station)setAccent(station.color);}}catch(error){}
  }
  function init(){
    if(initialized)return true;initialized=true;staticOnly=prefersStatic();
    syncInitialAccent();sync();applyBodyState();updateToggle();
    if(!enabled){if(canvas&&canvas.dataset)canvas.dataset.engine="disabled";return true;}
    if(staticOnly)return fallback("motion-preference");
    return initWebGl();
  }
  function destroy(){
    stop();initialized=false;try{if(gl&&buffer)gl.deleteBuffer(buffer);if(gl&&program)gl.deleteProgram(program);}catch(error){}
    if(audioContext&&typeof audioContext.close==="function")try{audioContext.close();}catch(error){}
    audioContext=null;analyser=null;frequencyData=null;gl=null;program=null;buffer=null;uniforms={};resetTransient();
    if(canvas&&canvas.dataset)canvas.dataset.engine="stopped";applyBodyState();return true;
  }
  function snapshot(){return {enabled,initialized,staticOnly,engine:canvas&&canvas.dataset?canvas.dataset.engine||"none":"none",state:{...stateTarget},audio:{bass:bassEnvelope,treble:trebleEnvelope},accent:accentTarget.slice(),pointer:pointerTarget.slice(),pulse:eventPulse,tone:eventTone,glitch};}

  if(toggle)toggle.addEventListener("click",()=>setEnabled(!enabled));
  window.addEventListener("resize",resize,{passive:true});window.addEventListener("pointermove",focusTarget,{passive:true});window.addEventListener("pointerleave",()=>{pointerStrengthTarget=0;});
  document.addEventListener("click",clickPulse,true);document.addEventListener("visibilitychange",()=>{if(!initialized)return;if(document.hidden)stop();else start();});
  window.addEventListener("pagehide",stop);window.addEventListener("pageshow",()=>{if(initialized)start();});
  function applyStaticPreference(){staticOnly=prefersStatic();if(!initialized)return;if(staticOnly)fallback("motion-preference");else if(enabled)initWebGl();applyBodyState();updateToggle();}
  if(motionQuery&&typeof motionQuery.addEventListener==="function")motionQuery.addEventListener("change",applyStaticPreference);
  if(forcedColorsQuery&&typeof forcedColorsQuery.addEventListener==="function")forcedColorsQuery.addEventListener("change",applyStaticPreference);
  if(canvas&&typeof canvas.addEventListener==="function"){
    canvas.addEventListener("webglcontextlost",event=>{if(event&&typeof event.preventDefault==="function")event.preventDefault();fallback("context-lost");});
    canvas.addEventListener("webglcontextrestored",()=>{staticOnly=prefersStatic();if(initialized&&enabled&&!staticOnly)initWebGl();});
  }
  return Object.freeze({init,destroy,sync,setEnabled,isEnabled:()=>enabled,setAccent,trigger,noteAudioCue,connectAudioElement,sampleGameState,snapshot,vertexSource:VERTEX_SOURCE,fragmentSource:FRAGMENT_SOURCE});
})();
window.AmbientBackground=AmbientBackground;
