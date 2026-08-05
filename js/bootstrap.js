"use strict";
/* Nothing profile-dependent boots until the access gate has selected a track. */
const loreButton=document.getElementById("loreBtn");
if(loreButton)loreButton.addEventListener("click",()=>ACTIVE_PROFILE==="specialist"?specialistGuide("00"):loreBook("01"));

function openAfterUnlock(profile){
  if(profileBooted)return false;
  activateProfile(profile||window.__trainerProfile||"general");
  profileBooted=true;
  setFlavor(ACTIVE_FLAVOR,{persist:true,updateUrl:true,rerender:false});
  resetRng();fresh();
  if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.init();

  let resumed=false;
  if(resumeRequested()){
    const record=saveRecord();
    resumed=!!(record&&restoreSavedState(record));
    clearResumeQuery();
  }
  if(!resumed)render();
  applyUiPrefs();
  const forceTutorial=new URLSearchParams(location.search).get("tutorial")==="1";
  /* A first-time player reaches the title hub before any teaching UI. Forced/tutorial launches
     still start immediately because the player already made that choice on the prior screen. */
  if(forceTutorial||AUTO_START){if(typeof initTutorial==="function")initTutorial({force:forceTutorial});}
  else if(typeof bindTutorialRefresh==="function")bindTutorialRefresh();

  if(resumed)return true;
  if(AUTO_START){
    const p=new URLSearchParams(location.search);p.delete("autostart");
    if(typeof history!=="undefined"&&history.replaceState)history.replaceState(null,"",`?${p.toString()}`);
    return true;
  }
  if(forceTutorial&&MODE===1)return true;
  mainMenu({opening:true});return true;
}
window.__unlocked=openAfterUnlock;
if(window.__trainerAccessGranted)openAfterUnlock(window.__trainerProfile);
