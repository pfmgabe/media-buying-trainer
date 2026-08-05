"use strict";
/* ---------------- account-free Spotify radio: presentation only, never touches game state -- */
const RADIO_KEY="media-buying-trainer-radio-v1";
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
  const fallback={station:RADIO_STATIONS[0].key,open:false};
  try{
    const saved=JSON.parse(localStorage.getItem(RADIO_KEY)||"null");
    if(!saved||typeof saved!=="object")return fallback;
    return {station:radioStation(saved.station)?saved.station:fallback.station,open:saved.open===true};
  }catch(e){return fallback;}
}
let radioPrefs=readRadioPrefs();
function persistRadioPrefs(){
  try{localStorage.setItem(RADIO_KEY,JSON.stringify({station:radioPrefs.station,open:radioPrefs.open}));}catch(e){}
}
function spotifyEmbedUrl(key){
  const station=radioStation(key);
  return station?`https://open.spotify.com/embed/playlist/${encodeURIComponent(station.playlist)}?utm_source=generator&theme=0`:"";
}
function spotifyPlaylistUrl(key){
  const station=radioStation(key);
  return station?`https://open.spotify.com/playlist/${encodeURIComponent(station.playlist)}`:"";
}
function unmountRadio(){
  const host=document.getElementById("spotifyPlayer");if(!host)return;
  host.innerHTML="";if(host.dataset)delete host.dataset.radioStation;
}
function mountRadio(){
  const host=document.getElementById("spotifyPlayer"),station=radioStation(radioPrefs.station);
  if(!host||!station||!radioPrefs.open)return false;
  if(host.dataset&&host.dataset.radioStation===station.key&&host.innerHTML)return true;
  if(host.dataset)host.dataset.radioStation=station.key;
  host.innerHTML=`<iframe title="Spotify radio: ${station.genre} — ${station.title}" src="${spotifyEmbedUrl(station.key)}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  return true;
}
function renderRadio(){
  const station=radioStation(radioPrefs.station)||RADIO_STATIONS[0];
  const panel=document.getElementById("radioPanel"),toggle=document.getElementById("radioBtn");
  if(toggle){toggle.setAttribute("aria-expanded",String(radioPrefs.open));
    toggle.setAttribute("aria-label",radioPrefs.open?"Close Media Buyer Radio":"Open Media Buyer Radio");}
  if(panel){panel.hidden=!radioPrefs.open;panel.setAttribute("aria-hidden",String(!radioPrefs.open));}
  const current=document.getElementById("radioCurrent"),phase=document.getElementById("radioPhase");
  if(current)current.textContent=`${station.genre} · ${station.title}`;
  if(phase)phase.textContent=station.phase;
  const direct=document.getElementById("radioOpenLink");
  if(direct){direct.setAttribute("href",spotifyPlaylistUrl(station.key));direct.setAttribute("aria-label",`Open ${station.title} on Spotify`);}
  RADIO_STATIONS.forEach(item=>{
    const button=document.getElementById(`radio-${item.key}`);
    if(button)button.setAttribute("aria-pressed",String(item.key===station.key));
  });
  if(radioPrefs.open)mountRadio();else unmountRadio();
}
function setRadioOpen(open,returnFocus=false){
  radioPrefs={station:radioPrefs.station,open:!!open};persistRadioPrefs();renderRadio();
  if(!radioPrefs.open&&returnFocus){const toggle=document.getElementById("radioBtn");if(toggle&&typeof toggle.focus==="function")toggle.focus();}
  return radioPrefs.open;
}
function setRadioStation(key){
  const station=radioStation(key);if(!station)return false;
  if(radioPrefs.station!==station.key){radioPrefs={station:station.key,open:radioPrefs.open};persistRadioPrefs();}
  renderRadio();return true;
}
const radioBtn=document.getElementById("radioBtn"),radioCloseBtn=document.getElementById("radioCloseBtn");
if(radioBtn)radioBtn.addEventListener("click",()=>setRadioOpen(!radioPrefs.open));
if(radioCloseBtn)radioCloseBtn.addEventListener("click",()=>setRadioOpen(false,true));
RADIO_STATIONS.forEach(station=>{
  const button=document.getElementById(`radio-${station.key}`);
  if(button)button.addEventListener("click",()=>setRadioStation(station.key));
});
renderRadio();
