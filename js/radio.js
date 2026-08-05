"use strict";
/* Account-free Spotify station launcher. Playback lives in an independent popout. */
const RADIO_KEY="media-buying-trainer-radio-v1";
const RADIO_CHANNEL_NAME="ttm-media-buyer-radio-v1";
const RADIO_WINDOW_NAME="ttm-media-buyer-radio";
const RADIO_POPOUT_BUILD="6";
const RADIO_STATIONS=Object.freeze([
  Object.freeze({key:"synthwave",genre:"Synthwave",title:"Retrowave // Outrun",playlist:"37i9dQZF1DXdLEN7aqioXM",
    phase:"Cyberpunk scaling · high-volume runs"}),
  Object.freeze({key:"deep-house",genre:"Deep House",title:"Deep House Relax",playlist:"37i9dQZF1DX2TRYkJECvfC",
    phase:"Campaign setup · audience tuning · steady workflow"}),
  Object.freeze({key:"trance",genre:"Trance",title:"trance mission",playlist:"37i9dQZF1DX91oIci4su1D",
    phase:"Keyword bids · account optimization · uninterrupted flow"}),
  Object.freeze({key:"dnb",genre:"Drum & Bass",title:"Massive Drum & Bass",playlist:"37i9dQZF1DX5wDmLW735Yd",
    phase:"Crisis response · emergency creative swaps · firefighting"}),
  Object.freeze({key:"lofi",genre:"Lofi Beats",title:"lofi beats",playlist:"37i9dQZF1DWWQRwui0ExPn",
    phase:"Post-mortems · reporting · calm copywriting"})
]);

function radioStation(key){return RADIO_STATIONS.find(station=>station.key===key)||null;}
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
function spotifyPlaylistUrl(key){
  const station=radioStation(key);
  return station?`https://open.spotify.com/playlist/${encodeURIComponent(station.playlist)}`:"";
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
function renderRadio(){
  const station=radioStation(radioPrefs.station)||RADIO_STATIONS[0];
  const panel=document.getElementById("radioPanel"),toggle=document.getElementById("radioBtn");
  if(toggle){
    toggle.setAttribute("aria-expanded",String(radioPrefs.panelOpen));
    toggle.setAttribute("aria-label",radioPrefs.panelOpen?"Close radio controls":"Open radio controls");
  }
  if(panel){panel.hidden=!radioPrefs.panelOpen;panel.setAttribute("aria-hidden",String(!radioPrefs.panelOpen));}
  const current=document.getElementById("radioCurrent"),phase=document.getElementById("radioPhase");
  if(current)current.textContent=`${station.genre} · ${station.title}`;
  if(phase)phase.textContent=station.phase;
  const direct=document.getElementById("radioOpenLink");
  if(direct){
    direct.setAttribute("href",spotifyPlaylistUrl(station.key));
    direct.setAttribute("aria-label",`Open ${station.title} on Spotify`);
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
      "popup=yes,width=460,height=390,resizable=yes,scrollbars=yes"
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
RADIO_STATIONS.forEach(station=>{
  const button=document.getElementById(`radio-${station.key}`);
  if(button)button.addEventListener("click",()=>setRadioStation(station.key));
});
renderRadio();
postRadioMessage({type:"popout-ping",source:"game"});
