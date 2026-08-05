"use strict";
/* Independent, account-free Spotify Embed host. Catalog: js/radio-data.js. */
const RADIO_KEY="media-buying-trainer-radio-v1";
const RADIO_CHANNEL_NAME="ttm-media-buyer-radio-v1";
function spotifyEmbedUrl(station){
  return `https://open.spotify.com/embed/playlist/${encodeURIComponent(station.playlist)}?utm_source=generator&theme=0`;
}
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
function stationButtons(){
  const host=document.getElementById("popoutStations");
  return host?host.querySelectorAll("[data-station]"):[];
}
function mountStations(){
  const host=document.getElementById("popoutStations");
  if(!host)return;
  host.innerHTML=RADIO_STATIONS.map(station=>
    `<button type="button" data-station="${station.key}" aria-pressed="false">${station.label}</button>`
  ).join("");
  host.addEventListener("click",event=>{
    const button=event.target&&event.target.closest?event.target.closest("[data-station]"):null;
    if(button)setStation(button.dataset.station);
  });
  host.addEventListener("keydown",event=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    const button=event.target&&event.target.closest?event.target.closest("[data-station]"):null;
    if(!button)return;
    const index=RADIO_STATIONS.findIndex(station=>station.key===button.dataset.station);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==="Home"?0:event.key==="End"?RADIO_STATIONS.length-1:
      (index+(event.key==="ArrowRight"?1:-1)+RADIO_STATIONS.length)%RADIO_STATIONS.length;
    const nextButton=stationButtons()[next];
    if(nextButton&&typeof nextButton.focus==="function")nextButton.focus();
    setStation(RADIO_STATIONS[next].key);
  });
}
function renderStation(){
  const station=radioStation(stationKey)||RADIO_STATIONS[0];
  document.title=`${station.genre} · Media Buyer Radio`;
  const current=document.getElementById("popoutCurrent"),phase=document.getElementById("popoutPhase");
  if(current)current.textContent=`${station.genre} · ${station.title}`;
  if(phase)phase.textContent=station.phase;
  const shell=document.querySelector(".radio-window");
  if(shell&&shell.style&&typeof shell.style.setProperty==="function")shell.style.setProperty("--radio-accent",station.color);
  const flow=document.getElementById("popoutFlow"),utility=document.getElementById("popoutUtility");
  const context=document.getElementById("popoutContext"),searchCode=document.getElementById("popoutSearchCode");
  const curator=document.getElementById("popoutCurator");
  if(flow)flow.textContent=station.flow;
  if(utility)utility.textContent=station.utility;
  if(context)context.textContent=station.context;
  if(searchCode)searchCode.textContent=spotifySearchCode(station);
  if(curator)curator.textContent=`Destination: ${station.title} · ${station.curator}`;
  stationButtons().forEach(button=>{
    button.setAttribute("aria-pressed",String(button.dataset.station===station.key));
  });
  const link=document.getElementById("popoutSpotifyLink");
  if(link){
    link.href=spotifyPlaylistUrl(station);
    link.setAttribute("aria-label",`Open ${station.title} on Spotify`);
  }
  const search=document.getElementById("popoutSearchLink");
  if(search){
    search.href=spotifySearchUrl(station);
    search.setAttribute("aria-label",`Search Spotify for ${station.searchQuery}`);
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
mountStations();persistStation();renderStation();
postRadioMessage({type:"popout-ready",station:stationKey,source:"popout"});
