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

  let resumed=false;
  if(resumeRequested()){
    const record=saveRecord();
    resumed=!!(record&&restoreSavedState(record));
    clearResumeQuery();
  }
  if(!resumed)render();
  applyUiPrefs();
  const forceTutorial=new URLSearchParams(location.search).get("tutorial")==="1";
  const tutorialProgress=typeof readTutorialProgress==="function"?readTutorialProgress():{introComplete:true,complete:true};
  const tutorialStarting=MODE===1&&(forceTutorial||(!tutorialProgress.introComplete&&!tutorialProgress.complete));
  if(typeof initTutorial==="function")initTutorial({force:forceTutorial});

  if(resumed)return true;
  if(AUTO_START){
    const p=new URLSearchParams(location.search);p.delete("autostart");
    if(typeof history!=="undefined"&&history.replaceState)history.replaceState(null,"",`?${p.toString()}`);
    return true;
  }
  if(tutorialStarting)return true;
  briefing();return true;
}
window.__unlocked=openAfterUnlock;
if(window.__trainerAccessGranted)openAfterUnlock(window.__trainerProfile);
