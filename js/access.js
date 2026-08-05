(function(){
  var HASH_TO_PROFILE={
    "bb4db630004e61a51492115b876f93e9716710f4e3bbe39625088c334970302e":"general",
    "5a3b1ef9f7594ecbe03bff6d08366a452e210c3a6964f6a204fe620e1e3265f6":"specialist"
  },KEY="media-buying-trainer-access-v2",LEGACY_KEY="media-buying-trainer-access-v1",
      wrap=document.querySelector(".wrap"),rail=document.getElementById("overlay"),gate=document.getElementById("gate");
  if(wrap)wrap.style.display="none";if(rail)rail.style.display="none";
  function persist(profile){try{sessionStorage.setItem(KEY,JSON.stringify({profile:profile}));}catch(e){}}
  function reveal(profile){
    if(!profile)return false;
    persist(profile);window.__trainerProfile=profile;window.__trainerAccessGranted=true;
    if(gate)gate.remove();if(wrap)wrap.style.display="";if(rail)rail.style.display="";
    if(typeof window.__unlocked==="function")window.__unlocked(profile);
    return true;
  }
  async function tryPw(){
    var input=document.getElementById("pw"),v=input?input.value||"":"";
    var buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
    var hex=[].map.call(new Uint8Array(buf),function(b){return b.toString(16).padStart(2,"0")}).join("");
    var profile=HASH_TO_PROFILE[hex];
    if(profile)reveal(profile);
    else{var error=document.getElementById("pwerr");if(error)error.textContent="That passphrase doesn't match. Try again.";}
  }
  try{
    var saved=JSON.parse(sessionStorage.getItem(KEY)||"null");
    if(saved&&HASH_TO_PROFILE&&["general","specialist"].includes(saved.profile)){reveal(saved.profile);return;}
    if(sessionStorage.getItem(LEGACY_KEY)==="5a3b1ef9f7594ecbe03bff6d08366a452e210c3a6964f6a204fe620e1e3265f6"){
      reveal("specialist");return;
    }
  }catch(e){}
  var go=document.getElementById("go"),pw=document.getElementById("pw");
  if(go)go.onclick=tryPw;if(pw){pw.addEventListener("keydown",function(e){if(e.key==="Enter")tryPw();});pw.focus();}
})();
