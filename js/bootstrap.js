"use strict";
/* Nothing profile-dependent boots until the access gate has selected a track. */
const loreButton=document.getElementById("loreBtn");
if(loreButton)loreButton.addEventListener("click",()=>ACTIVE_PROFILE==="specialist"?specialistGuide("00"):loreBook("01"));

function openAfterUnlock(profile){
  if(profileBooted)return false;
  activateProfile(profile||window.__trainerProfile||"general");
  profileBooted=true;
  const routeParams=new URLSearchParams(location.search),forceTutorial=routeParams.get("tutorial")==="1",
    hasFreshBrief=routeParams.get("brief")==="1",resuming=routeParams.get("resume")==="1";
  /* Deep links cannot opt the action coach into a different scenario. Preserve a valid
     Mode-1 period/budget choice, but canonicalize its mode, seed, and recoverable briefing. */
  if(forceTutorial&&(MODE!==1||SEED!==TUTORIAL_SEED||!hasFreshBrief||resuming||routeParams.get("guided")!=="1")){
    const cfg=MODE===1?{days:DAYS,budget:DAILY}:CONFIG_SPECS[1];
    routeParams.set("mode","1");routeParams.set("days",String(cfg.days));routeParams.set("budget",String(cfg.budget));
    routeParams.set("seed",String(TUTORIAL_SEED));routeParams.set("autostart","1");routeParams.set("brief","1");routeParams.set("guided","1");routeParams.delete("stage");routeParams.delete("resume");
    location.search=routeParams.toString();return true;
  }
  /* Older launch links used autostart without a briefing marker. Upgrade them before a
     board is created so every deliberate fresh run receives the same recoverable intro. */
  if(AUTO_START&&!resuming&&!hasFreshBrief){routeParams.set("brief","1");location.search=routeParams.toString();return true;}
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
  const launchParams=new URLSearchParams(location.search),freshBrief=launchParams.get("brief")==="1";
  /* A first-time player reaches the title hub before any teaching UI. Forced/tutorial launches
     still start immediately because the player already made that choice on the prior screen. */
  if(!freshBrief&&(forceTutorial||AUTO_START)){if(typeof initTutorial==="function")initTutorial({force:forceTutorial});}
  else if(typeof bindTutorialRefresh==="function")bindTutorialRefresh();

  if(resumed)return true;
  if(AUTO_START){
    const p=new URLSearchParams(location.search);p.delete("autostart");
    if(typeof history!=="undefined"&&history.replaceState)history.replaceState(null,"",`?${p.toString()}`);
  }
  /* Keep the briefing recoverable after a refresh. AUTO_START is deliberately removed as
     soon as the fresh state boots, while brief=1 remains until the player finishes slide 4. */
  if(freshBrief&&typeof showRunOpening==="function"){showRunOpening();return true;}
  if(AUTO_START)return true;
  if(forceTutorial&&MODE===1)return true;
  mainMenu({opening:true});return true;
}
window.__unlocked=openAfterUnlock;
if(window.__trainerAccessGranted)openAfterUnlock(window.__trainerProfile);
