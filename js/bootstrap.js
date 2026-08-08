"use strict";
/* Nothing profile-dependent boots until the access gate has selected a track. */
const loreButton=document.getElementById("loreBtn");
if(loreButton)loreButton.addEventListener("click",()=>ACTIVE_PROFILE==="specialist"?specialistGuide():loreBook());

function openAfterUnlock(profile){
  if(profileBooted)return false;
  activateProfile(profile||window.__trainerProfile||"general");
  profileBooted=true;
  const routeParams=new URLSearchParams(location.search),forceTutorial=routeParams.get("tutorial")==="1",
    hasFreshBrief=routeParams.get("brief")==="1",resuming=routeParams.get("resume")==="1";
  /* Deep links cannot opt the action coach into a different scenario. Preserve a valid
     scripted-mode period/budget choice, but canonicalize its mode, seed, and recoverable
     briefing. Modes without a verified action script canonicalize to the Mode 1 script. */
  const tutorialSeeds=typeof TUTORIAL_SEEDS!=="undefined"?TUTORIAL_SEEDS:{1:TUTORIAL_SEED};
  if(forceTutorial&&(!tutorialSeeds[MODE]||SEED!==tutorialSeeds[MODE]||!hasFreshBrief||resuming||routeParams.get("guided")!=="1")){
    const targetMode=tutorialSeeds[MODE]?MODE:1;
    const cfg=targetMode===MODE?{days:DAYS,budget:DAILY}:CONFIG_SPECS[targetMode];
    routeParams.set("mode",String(targetMode));routeParams.set("days",String(cfg.days));routeParams.set("budget",String(cfg.budget));
    routeParams.set("seed",String(tutorialSeeds[targetMode]));routeParams.set("autostart","1");routeParams.set("brief","1");routeParams.set("guided","1");routeParams.delete("stage");routeParams.delete("resume");
    location.search=routeParams.toString();return true;
  }
  /* Older launch links used autostart without a briefing marker. Upgrade them before a
     board is created so every deliberate fresh run receives the same recoverable intro. */
  if(AUTO_START&&!resuming&&!hasFreshBrief){routeParams.set("brief","1");location.search=routeParams.toString();return true;}
  setFlavor(ACTIVE_FLAVOR,{persist:true,updateUrl:true,rerender:false});
  resetRng();fresh();
  if(typeof TrainingProgress!=="undefined"&&TrainingProgress)TrainingProgress.beginRun({mode:MODE,stage:MODE===0?CLASSIC_STAGE:null,
    seed:SEED,days:DAYS,budget:DAILY,tutorial:forceTutorial||typeof tutorialQueryRequested==="function"&&tutorialQueryRequested()});
  if(typeof AmbientBackground!=="undefined"&&AmbientBackground)AmbientBackground.init();

  let resumed=false;
  if(resumeRequested()){
    const record=saveRecord();
    resumed=!!(record&&restoreSavedState(record));
    clearResumeQuery();
  }
  if(!resumed){if(typeof Workspace!=="undefined"&&Workspace&&typeof Workspace.resetPresentation==="function")Workspace.resetPresentation();
    if(MODE===6&&typeof AgencyCareer!=="undefined"&&typeof AgencyCareer.resetPresentation==="function")AgencyCareer.resetPresentation();render();}
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
     soon as the fresh state boots, while brief=1 remains until the player finishes it. */
  if(freshBrief&&typeof showRunOpening==="function"){showRunOpening();return true;}
  if(AUTO_START)return true;
  if(forceTutorial&&(typeof TUTORIAL_SEEDS!=="undefined"?!!TUTORIAL_SEEDS[MODE]:MODE===1))return true;
  mainMenu({opening:true});return true;
}
if(typeof installPlayerContextHook==="function")installPlayerContextHook();
if(typeof Workspace!=="undefined"&&Workspace)Workspace.init();
window.__unlocked=openAfterUnlock;
if(window.__trainerAccessGranted)openAfterUnlock(window.__trainerProfile);
