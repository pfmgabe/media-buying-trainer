"use strict";
/* Independent, account-free Spotify Embed host. Keep this allowlist in sync with js/radio.js. */
const RADIO_KEY="media-buying-trainer-radio-v1";
const RADIO_CHANNEL_NAME="ttm-media-buyer-radio-v1";
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
function spotifyEmbedUrl(station){
  return `https://open.spotify.com/embed/playlist/${encodeURIComponent(station.playlist)}?utm_source=generator&theme=0`;
}
function spotifyPlaylistUrl(station){return `https://open.spotify.com/playlist/${encodeURIComponent(station.playlist)}`;}
function savedStation(){
  try{
    const saved=JSON.parse(localStorage.getItem(RADIO_KEY)||"null");
    if(saved&&radioStation(saved.station))return saved.station;
  }catch(e){}
  return null;
}
function requestedStation(){
  try{
    const key=new URLSearchParams(location.search).get("station");
    return radioStation(key)?key:null;
  }catch(e){return null;}
}
let stationKey=requestedStation()||savedStation()||RADIO_STATIONS[0].key;
let radioChannel=null;
try{
  if(typeof BroadcastChannel==="function")radioChannel=new BroadcastChannel(RADIO_CHANNEL_NAME);
}catch(e){radioChannel=null;}
function postRadioMessage(message){
  if(!radioChannel)return;
  try{radioChannel.postMessage(message);}catch(e){}
}
function persistStation(){
  try{
    const previous=JSON.parse(localStorage.getItem(RADIO_KEY)||"null");
    localStorage.setItem(RADIO_KEY,JSON.stringify({
      station:stationKey,
      panelOpen:!!(previous&&typeof previous==="object"&&(previous.panelOpen===true||previous.open===true))
    }));
  }catch(e){}
}
function renderStation(){
  const station=radioStation(stationKey)||RADIO_STATIONS[0];
  document.title=`${station.genre} · Media Buyer Radio`;
  const current=document.getElementById("popoutCurrent"),phase=document.getElementById("popoutPhase");
  if(current)current.textContent=`${station.genre} · ${station.title}`;
  if(phase)phase.textContent=station.phase;
  document.querySelectorAll("[data-station]").forEach(button=>{
    button.setAttribute("aria-pressed",String(button.dataset.station===station.key));
  });
  const link=document.getElementById("popoutSpotifyLink");
  if(link){
    link.href=spotifyPlaylistUrl(station);
    link.setAttribute("aria-label",`Open ${station.title} on Spotify`);
  }
  const player=document.getElementById("popoutSpotifyPlayer");
  if(player&&player.dataset.station!==station.key){
    player.dataset.station=station.key;
    player.innerHTML="";
    const iframe=document.createElement("iframe");
    iframe.title=`Spotify radio: ${station.genre} — ${station.title}`;
    iframe.src=spotifyEmbedUrl(station);
    iframe.width="100%";iframe.height="152";iframe.frameBorder="0";
    iframe.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.loading="eager";iframe.referrerPolicy="strict-origin-when-cross-origin";
    player.appendChild(iframe);
  }
}
function setStation(key,options={}){
  const station=radioStation(key);if(!station)return false;
  const changed=stationKey!==station.key;
  stationKey=station.key;
  if(options.persist!==false)persistStation();
  renderStation();
  if(changed&&options.broadcast!==false)postRadioMessage({type:"station",station:stationKey,source:"popout"});
  return true;
}
document.querySelectorAll("[data-station]").forEach(button=>{
  button.addEventListener("click",()=>setStation(button.dataset.station));
});
const closeButton=document.getElementById("closeRadioWindow");
if(closeButton)closeButton.addEventListener("click",()=>window.close());
if(radioChannel){
  radioChannel.addEventListener("message",event=>{
    const message=event&&event.data;
    if(message&&message.type==="station"&&radioStation(message.station)){
      setStation(message.station,{persist:false,broadcast:false});
    }else if(message&&message.type==="popout-ping"){
      postRadioMessage({type:"popout-ready",station:stationKey,source:"popout"});
    }
  });
}
window.addEventListener("storage",event=>{
  if(event.key!==RADIO_KEY)return;
  const key=savedStation();
  if(key)setStation(key,{persist:false,broadcast:false});
});
window.addEventListener("beforeunload",()=>postRadioMessage({type:"popout-closing",source:"popout"}));
persistStation();renderStation();
postRadioMessage({type:"popout-ready",station:stationKey,source:"popout"});
