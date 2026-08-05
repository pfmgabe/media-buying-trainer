"use strict";
/* Account-free Spotify station launcher. Playback lives in an independent popout. */
const RADIO_KEY="media-buying-trainer-radio-v1";
const RADIO_CHANNEL_NAME="ttm-media-buyer-radio-v1";
const RADIO_WINDOW_NAME="ttm-media-buyer-radio";
const RADIO_POPOUT_BUILD=RADIO_MATRIX_VERSION;
function readRadioPrefs(){
  const fallback={station:RADIO_STATIONS[0].key,panelOpen:false};
  try{
    const saved=JSON.parse(localStorage.getItem(RADIO_KEY)||"null");
    if(!saved||typeof saved!=="object")return fallback;
    return {
      station:radioStation(saved.station)?saved.station:fallback.station,
      panelOpen:saved.panelOpen===true||saved.open===true
    };
  }catch(e){return fallback;}
}
let radioPrefs=readRadioPrefs();
let radioPopout=null;
let radioPopoutKnown=false;
let radioChannel=null;

try{
  if(typeof BroadcastChannel==="function")radioChannel=new BroadcastChannel(RADIO_CHANNEL_NAME);
}catch(e){radioChannel=null;}

function persistRadioPrefs(){
  try{
    localStorage.setItem(RADIO_KEY,JSON.stringify({station:radioPrefs.station,panelOpen:radioPrefs.panelOpen}));
  }catch(e){}
}
function radioPopoutUrl(key){
  const url=new URL("radio.html",document.baseURI);
  url.searchParams.set("station",radioStation(key)?key:RADIO_STATIONS[0].key);
  url.searchParams.set("v",RADIO_POPOUT_BUILD);
  return url.href;
}
function postRadioMessage(message){
  if(!radioChannel)return;
  try{radioChannel.postMessage(message);}catch(e){}
}
function popoutIsOpen(){
  if(radioPopout){
    try{return !radioPopout.closed;}catch(e){return radioPopoutKnown;}
  }
  return radioPopoutKnown;
}
function clearLegacyInlinePlayer(){
  const host=document.getElementById("spotifyPlayer");
  if(!host)return;
  host.innerHTML="";
  host.hidden=true;
  host.setAttribute("aria-hidden","true");
  if(host.dataset)delete host.dataset.radioStation;
}
function mountRadioStations(){
  const host=document.getElementById("radioStations");
  if(!host)return;
  host.innerHTML=RADIO_STATIONS.map(station=>
    `<button class="radio-station" id="radio-${station.key}" type="button" data-radio-station="${station.key}" aria-pressed="false">${station.label}</button>`
  ).join("");
  host.addEventListener("click",event=>{
    const button=event.target&&event.target.closest?event.target.closest("[data-radio-station]"):null;
    if(button)setRadioStation(button.dataset.radioStation);
  });
  host.addEventListener("keydown",event=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    const button=event.target&&event.target.closest?event.target.closest("[data-radio-station]"):null;
    if(!button)return;
    const index=RADIO_STATIONS.findIndex(station=>station.key===button.dataset.radioStation);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==="Home"?0:event.key==="End"?RADIO_STATIONS.length-1:
      (index+(event.key==="ArrowRight"?1:-1)+RADIO_STATIONS.length)%RADIO_STATIONS.length;
    const nextButton=document.getElementById(`radio-${RADIO_STATIONS[next].key}`);
    if(nextButton&&typeof nextButton.focus==="function")nextButton.focus();
    setRadioStation(RADIO_STATIONS[next].key);
  });
}
function renderRadio(){
  const station=radioStation(radioPrefs.station)||RADIO_STATIONS[0];
  if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.setAccent(station.color);
  const panel=document.getElementById("radioPanel"),toggle=document.getElementById("radioBtn");
  if(toggle){
    toggle.setAttribute("aria-expanded",String(radioPrefs.panelOpen));
    toggle.setAttribute("aria-label",radioPrefs.panelOpen?"Close radio controls":"Open radio controls");
  }
  if(panel){
    panel.hidden=!radioPrefs.panelOpen;panel.setAttribute("aria-hidden",String(!radioPrefs.panelOpen));
    if(panel.style&&typeof panel.style.setProperty==="function")panel.style.setProperty("--radio-accent",station.color);
    else if(panel.style)panel.style["--radio-accent"]=station.color;
  }
  const current=document.getElementById("radioCurrent"),phase=document.getElementById("radioPhase");
  if(current)current.textContent=`${station.genre} · ${station.title}`;
  if(phase)phase.textContent=station.phase;
  const flow=document.getElementById("radioFlow"),utility=document.getElementById("radioUtility");
  const context=document.getElementById("radioContext"),searchCode=document.getElementById("radioSearchCode");
  const curator=document.getElementById("radioCurator");
  if(flow)flow.textContent=station.flow;
  if(utility)utility.textContent=station.utility;
  if(context)context.textContent=station.context;
  if(searchCode)searchCode.textContent=spotifySearchCode(station);
  if(curator)curator.textContent=`Destination: ${station.title} · ${station.curator}`;
  const direct=document.getElementById("radioOpenLink");
  if(direct){
    direct.setAttribute("href",spotifyPlaylistUrl(station));
    direct.setAttribute("aria-label",`Open ${station.title} on Spotify`);
  }
  const search=document.getElementById("radioSearchLink");
  if(search){
    search.setAttribute("href",spotifySearchUrl(station));
    search.setAttribute("aria-label",`Search Spotify for ${station.searchQuery}`);
  }
  RADIO_STATIONS.forEach(item=>{
    const button=document.getElementById(`radio-${item.key}`);
    if(button)button.setAttribute("aria-pressed",String(item.key===station.key));
  });
  const popoutButton=document.getElementById("radioPopoutBtn");
  if(popoutButton){
    const active=popoutIsOpen();
    popoutButton.textContent=active?"Focus radio":"Open radio player";
    popoutButton.setAttribute("aria-label",`${active?"Focus":"Open"} independent Spotify radio player for ${station.genre}`);
    popoutButton.dataset.radioStatus=active?"open":"closed";
  }
  const volumeHelp=document.getElementById("musicVolumeHelp");
  if(volumeHelp){
    volumeHelp.textContent=popoutIsOpen()?"Focus Spotify volume control":"Open Spotify volume control";
    volumeHelp.setAttribute("aria-label","Open the Spotify player to use its volume control when available; otherwise use device volume");
    volumeHelp.title="Spotify does not expose account-free volume control to this page.";
  }
  clearLegacyInlinePlayer();
}
function setRadioOpen(open,returnFocus=false){
  radioPrefs={station:radioPrefs.station,panelOpen:!!open};
  persistRadioPrefs();renderRadio();
  if(!radioPrefs.panelOpen&&returnFocus){
    const toggle=document.getElementById("radioBtn");
    if(toggle&&typeof toggle.focus==="function")toggle.focus();
  }
  return radioPrefs.panelOpen;
}
function setRadioStation(key,options={}){
  const station=radioStation(key);if(!station)return false;
  const changed=radioPrefs.station!==station.key;
  radioPrefs={station:station.key,panelOpen:radioPrefs.panelOpen};
  if(options.persist!==false)persistRadioPrefs();
  renderRadio();
  if(changed&&options.broadcast!==false)postRadioMessage({type:"station",station:station.key,source:"game"});
  return true;
}
function openPlaylistFallback(){
  const url=spotifyPlaylistUrl(radioPrefs.station);
  if(!url)return null;
  try{return window.open(url,"_blank","noopener,noreferrer");}catch(e){return null;}
}
function openRadioPopout(){
  if(radioPopout){
    try{
      if(!radioPopout.closed){
        radioPopout.focus();
        radioPopoutKnown=true;
        postRadioMessage({type:"station",station:radioPrefs.station,source:"game"});
        renderRadio();
        return true;
      }
    }catch(e){}
  }
  let opened=null;
  try{
    opened=window.open(
      radioPopoutUrl(radioPrefs.station),
      RADIO_WINDOW_NAME,
      "popup=yes,width=520,height=560,resizable=yes,scrollbars=yes"
    );
  }catch(e){opened=null;}
  if(!opened){
    radioPopoutKnown=false;renderRadio();openPlaylistFallback();return false;
  }
  radioPopout=opened;radioPopoutKnown=true;
  try{radioPopout.focus();}catch(e){}
  renderRadio();return true;
}
function handleRadioMessage(event){
  const message=event&&event.data;
  if(!message||typeof message!=="object")return;
  if(message.type==="station"&&radioStation(message.station)){
    setRadioStation(message.station,{persist:false,broadcast:false});
  }else if(message.type==="popout-ready"){
    radioPopoutKnown=true;renderRadio();
    postRadioMessage({type:"station",station:radioPrefs.station,source:"game"});
  }else if(message.type==="popout-closing"){
    radioPopoutKnown=false;radioPopout=null;renderRadio();
  }
}
if(radioChannel)radioChannel.addEventListener("message",handleRadioMessage);
window.addEventListener("storage",event=>{
  if(event.key!==RADIO_KEY)return;
  const next=readRadioPrefs();
  radioPrefs={station:next.station,panelOpen:radioPrefs.panelOpen};
  renderRadio();
});

const radioBtn=document.getElementById("radioBtn"),radioCloseBtn=document.getElementById("radioCloseBtn");
const radioPopoutBtn=document.getElementById("radioPopoutBtn");
const musicVolumeHelp=document.getElementById("musicVolumeHelp");
if(radioBtn)radioBtn.addEventListener("click",()=>{const next=!radioPrefs.panelOpen;if(next&&typeof setAudioPanel==="function")setAudioPanel(false);setRadioOpen(next);});
if(radioCloseBtn)radioCloseBtn.addEventListener("click",()=>setRadioOpen(false,true));
if(radioPopoutBtn)radioPopoutBtn.addEventListener("click",openRadioPopout);
if(musicVolumeHelp)musicVolumeHelp.addEventListener("click",openRadioPopout);
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&radioPrefs.panelOpen){event.preventDefault();setRadioOpen(false,true);}
});
mountRadioStations();
renderRadio();
postRadioMessage({type:"popout-ping",source:"game"});
