"use strict";
/*
 * Media Buyer Audio Matrix.
 *
 * This is the only station allowlist used by the game and the independent
 * player. Playlist titles describe the verified Spotify destination; genre,
 * flow, and utility describe the training station built around it.
 */
const RADIO_MATRIX_VERSION="12";
const RADIO_STATIONS=Object.freeze([
  {
    key:"synthwave",label:"Synthwave",genre:"Synthwave & Retrowave",title:"Retrowave // Outrun",
    playlist:"37i9dQZF1DXdLEN7aqioXM",searchQuery:"Synthwave Essentials",
    phase:"Late-night scaling · dashboard builds · dark-mode coding",
    flow:"Cyberpunk Mainframe Hacking",color:"#FF007F",
    utility:"Ideal for late-night dashboard builds, custom bid scripting, and sustained high-volume scaling.",
    context:"Analog warmth, retro-futurist synths, and 1980s drum-machine energy. Artist orbit: The Midnight, Timecop83, FM-84, and Gunship.",
    curator:"Spotify editorial"
  },
  {
    key:"deep-house",label:"Deep House",genre:"Melodic & Deep House",title:"Deep x Melodic",
    playlist:"1GfH39JcID8aFZ0ZQQVkBk",searchQuery:"Anjunadeep Edition",
    phase:"Attribution audits · multi-account setup · long-range reporting",
    flow:"Subconscious Hypnotic Drift",color:"#0B192C",
    utility:"Built for long attribution audits, meticulous account setup, audience tuning, and steady reporting work.",
    context:"Smooth progressive soundscapes with low verbal friction around 120–124 BPM. Artist orbit: Ben Böhmer, Lane 8, Yotto, and the Anjunadeep label.",
    curator:"Anjunadeep"
  },
  {
    key:"trance",label:"Trance",genre:"Trance & Vocal Trance",title:"ASOT Top 1000",
    playlist:"5QafFMGgQKGwqgV7k3qHy6",searchQuery:"A State Of Trance Radio",
    phase:"Deadline launches · final reporting sprint · urgent bid work",
    flow:"Adrenaline Sprint",color:"#7C3AED",
    utility:"A high-energy push for the final stretch before a launch, client report, or urgent bidding pass.",
    context:"Driving synthesizers, soaring builds, and euphoric breakdowns near 138 BPM. Artist orbit: Armin van Buuren and the A State of Trance catalog.",
    curator:"Armin van Buuren"
  },
  {
    key:"dnb",label:"Drum & Bass",genre:"Drum & Bass · Liquid & Hospital",title:"Hospital Records Catalogue",
    playlist:"7rp3LPyVRMjHh12AY4kj3D",searchQuery:"Hospital Records Official",
    phase:"Bulk edits · UTM passes · emergency campaign changes",
    flow:"Hyper-Speed Tactile Execution",color:"#06B6D4",
    utility:"Suited to rapid data entry, negative-keyword sweeps, UTM updates, and time-sensitive account repairs.",
    context:"Fast syncopated breakbeats with melodic and soulful layers around 174 BPM. Artist orbit: High Contrast, London Elektricity, Metrik, and Netsky.",
    curator:"Hospital Records"
  },
  {
    key:"tech-house",label:"Tech House",genre:"Tech House & Future House",title:"Experts Only: Music Without Limits",
    playlist:"3HPnEh65cfZxTflZP42tkv",searchQuery:"Experts Only John Summit",
    phase:"Account wrap-ups · team momentum · profitable-week celebration",
    flow:"Victory Lap & Hype State",color:"#84CC16",
    utility:"Best for energetic account wrap-ups, team momentum, or celebrating a strong performance week.",
    context:"Punchy four-on-the-floor basslines and club-ready momentum. Artist orbit: John Summit, Experts Only, Tchami, and the Confession sound.",
    curator:"Experts Only"
  },
  {
    key:"metalcore",label:"Metalcore",genre:"Modern Metalcore & Alt-Metal",title:"Kickass Metal",
    playlist:"37i9dQZF1DWTcqUzwhNmKv",searchQuery:"Kickass Metal",
    phase:"Account bans · rejected ads · appeal-ticket firefighting",
    flow:"Cathartic Stress Relief",color:"#DC2626",
    utility:"A pressure-release station for sudden account restrictions, rejected creative, and appeal-ticket triage.",
    context:"Cinematic hooks, heavy breakdowns, and high-intensity release. Artist orbit: Bad Omens, Sleep Token, Bring Me The Horizon, and Spiritbox.",
    curator:"Spotify editorial"
  },
  {
    key:"lofi",label:"Lofi",genre:"Lofi & Chillhop",title:"lofi beats",
    playlist:"37i9dQZF1DWWQRwui0ExPn",searchQuery:"Lofi Beats",
    phase:"Copy variations · post-mortems · calm reporting",
    flow:"Low-Friction Creative Warmth",color:"#D97706",
    utility:"Soft background focus for drafting primary text, headline variations, post-mortems, and low-pressure reporting.",
    context:"Warm tape hiss, mellow keys, and gentle vinyl texture with minimal verbal distraction.",
    curator:"Spotify editorial"
  },
  {
    key:"hip-hop",label:"Hip-Hop",genre:"Hip-Hop & Rap",title:"Most Necessary",
    playlist:"37i9dQZF1DX2RxBh64BHjQ",searchQuery:"Most Necessary",
    phase:"Pitch preparation · competitor teardown · decisive scaling",
    flow:"Ruthless Executive Swagger",color:"#EAB308",
    utility:"A confidence-forward station for pitch decks, competitor analysis, and bold but evidence-based scaling decisions.",
    context:"Modern rap energy with a strategic, high-conviction posture; use the momentum without letting it replace measurement discipline.",
    curator:"Spotify editorial"
  },
  {
    key:"heartland",label:"Heartland",genre:"Neo-Traditional & Heartland Country",title:"Roots Rising",
    playlist:"37i9dQZF1DWYV7OOaGhoH0",searchQuery:"Roots Rising",
    phase:"Consumer research · UGC scripting · human-centered copy",
    flow:"Grounded Narrative & Copywriting",color:"#854D0E",
    utility:"Useful for leaving the tech bubble, finding relatable hooks, and writing broad-market direct-response or UGC stories.",
    context:"Raw acoustic textures and plainspoken storytelling. Artist orbit: Zach Bryan, Tyler Childers, Chris Stapleton, and contemporary Americana.",
    curator:"Spotify editorial"
  },
  {
    key:"outlaw",label:"Outlaw",genre:"Outlaw & Classic Country",title:"Outlaw Country Western Mix",
    playlist:"37i9dQZF1EIepChLBA3FXD",searchQuery:"Outlaw Country",
    phase:"Manual bidding · high-conviction tests · controlled rule-breaking",
    flow:"Rogue Maverick Scaling",color:"#B45309",
    utility:"For deliberate manual interventions and high-risk tests when the evidence supports overriding automated recommendations.",
    context:"Gritty, rebellious country built around autonomy and conviction. Artist orbit: Johnny Cash, Willie Nelson, and Waylon Jennings. Mix contents can change.",
    curator:"Spotify mix"
  },
  {
    key:"atomic-jazz",label:"Atomic Jazz",genre:"Fallout-Era Jazz & Atomic Swing",title:"Fallout Radio",
    playlist:"37i9dQZF1DWWYN0OyXQBvO",searchQuery:"Fallout Radio",
    phase:"Outage response · attribution breakage · calm crisis control",
    flow:"Unbothered Atomic Serenity",color:"#FFD700",
    utility:"A psychological buffer for platform outages, panicked calls, and broken tracking while the response plan stays methodical.",
    context:"Vinyl warmth, brass, vocal harmony, and mid-century swing. Artist orbit: The Ink Spots, Louis Armstrong, Ella Fitzgerald, Billie Holiday, and Roy Brown.",
    curator:"Spotify editorial"
  }
].map(station=>Object.freeze(station)));

function radioStation(key){return RADIO_STATIONS.find(station=>station.key===key)||null;}
function spotifyPlaylistUrl(stationOrKey){
  const station=typeof stationOrKey==="string"?radioStation(stationOrKey):stationOrKey;
  return station?`https://open.spotify.com/playlist/${encodeURIComponent(station.playlist)}`:"";
}
function spotifySearchUrl(stationOrKey){
  const station=typeof stationOrKey==="string"?radioStation(stationOrKey):stationOrKey;
  return station?`https://open.spotify.com/search/${encodeURIComponent(station.searchQuery)}`:"";
}
function spotifySearchCode(stationOrKey){
  const station=typeof stationOrKey==="string"?radioStation(stationOrKey):stationOrKey;
  return station?`spotify:search:playlist:${station.searchQuery}`:"";
}
