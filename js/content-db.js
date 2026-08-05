"use strict";

/* Structured, sanitized content that can be extended without touching either game engine.
   GitHub Pages is a public static host: passphrases select a profile, but no private workbook
   values, people, identifiers, URLs, or live account records belong in this bundle. */
const PROFILE_DB=Object.freeze({
  general:Object.freeze({
    id:"general",label:"General Portfolio Lab",badge:"GENERAL",
    scope:"Cross-platform media buying · paid search, paid social, display, CTV, client and in-house practice",
    intro:"A broad media-buying laboratory spanning creative, auctions, funnels, attribution, operations, and portfolio risk.",
    defaultMode:1,guide:"general"
  }),
  specialist:Object.freeze({
    id:"specialist",label:"Specialist Account Track",badge:"GUIDED",
    scope:"Insurance lead generation · Google Display & Demand Gen · scalable creative operations",
    intro:"A sanitized guided ramp based on a mature lead-generation account: diagnose the full funnel, multiply proven concepts, preserve traceability, and ask before assigning cause.",
    defaultMode:1,guide:"specialist"
  })
});

const CREATIVE_FORMATS=Object.freeze({
  static:Object.freeze({id:"static",label:"Static image",mark:"▣",tone:"cyan",
    description:"One still image with copy. Reliable and inexpensive to vary; attention usually decays more slowly than motion.",
    cpmM:.99,ctrM:.98,cvrM:1.02,fatigueM:.90,satBonus:400,
    fit:Object.freeze({google:1.05,meta:1.00,snap:.91,tiktok:.86,google_dgen:1.05,ctv:.72})}),
  rendered:Object.freeze({id:"rendered",label:"Rendered scene",mark:"◇",tone:"violet",
    description:"Illustrated or 3D scene built to be recast across audiences, places, and treatments.",
    cpmM:1.02,ctrM:1.01,cvrM:1.05,fatigueM:.96,satBonus:900,
    fit:Object.freeze({google:1.04,meta:1.04,snap:.96,tiktok:.91,google_dgen:1.08,ctv:.86})}),
  motion:Object.freeze({id:"motion",label:"Motion graphic",mark:"▶",tone:"amber",
    description:"Animation or short motion unit. It earns attention quickly but normally exhausts its hook faster.",
    cpmM:1.02,ctrM:1.10,cvrM:.98,fatigueM:1.18,satBonus:650,
    fit:Object.freeze({google:.98,meta:1.04,snap:1.08,tiktok:1.10,google_dgen:1.02,ctv:1.02})}),
  ugc:Object.freeze({id:"ugc",label:"UGC video",mark:"●",tone:"pink",
    description:"Person-led native video with a direct hook. High breakout ceiling and high fatigue risk.",
    cpmM:1.04,ctrM:1.15,cvrM:1.04,fatigueM:1.32,satBonus:1100,
    fit:Object.freeze({google:.88,meta:1.10,snap:1.12,tiktok:1.18,google_dgen:.98,ctv:.90})}),
  founder:Object.freeze({id:"founder",label:"Founder / explainer",mark:"▤",tone:"violet",
    description:"Longer trust-building explanation. Slower attention, stronger downstream fit, and lower fatigue.",
    cpmM:1.06,ctrM:.91,cvrM:1.13,fatigueM:.78,satBonus:800,
    fit:Object.freeze({google:.94,meta:1.06,snap:.82,tiktok:.94,google_dgen:1.00,ctv:1.05,linkedin:1.14})}),
  native:Object.freeze({id:"native",label:"Native display",mark:"≡",tone:"green",
    description:"Deliberately plain unit designed to resemble surrounding content and buy inexpensive inventory.",
    cpmM:.94,ctrM:1.05,cvrM:.94,fatigueM:.84,satBonus:500,
    fit:Object.freeze({google:1.10,meta:.94,snap:.90,tiktok:.84,google_dgen:1.05,ctv:.76})}),
  utility:Object.freeze({id:"utility",label:"Input / UI utility",mark:"⌨",tone:"blue",
    description:"Interactive-looking entry box, calculator, screenshot, or interface proof that makes the next action concrete.",
    cpmM:.97,ctrM:1.04,cvrM:1.08,fatigueM:1.00,satBonus:350,
    fit:Object.freeze({google:1.10,meta:1.01,snap:.94,tiktok:.91,google_dgen:1.04,ctv:.68})}),
  lifestyle:Object.freeze({id:"lifestyle",label:"Lifestyle static",mark:"◫",tone:"cyan",
    description:"Still scene tied to a life event, audience, or regional context. Fit drives value more than raw click rate.",
    cpmM:1.01,ctrM:.97,cvrM:1.08,fatigueM:.94,satBonus:650,
    fit:Object.freeze({google:1.03,meta:1.05,snap:.97,tiktok:.91,google_dgen:1.06,ctv:.90})}),
  ctv:Object.freeze({id:"ctv",label:"CTV spot",mark:"▰",tone:"amber",
    description:"Full-screen video optimized for reach and modeled view-through outcomes rather than dependable clicks.",
    cpmM:1.08,ctrM:.15,cvrM:1.06,fatigueM:.72,satBonus:1500,
    fit:Object.freeze({ctv:1.20,google:.72,meta:.80,snap:.82,tiktok:.84,google_dgen:.88})}),
  search:Object.freeze({id:"search",label:"Search text / assets",mark:"Aa",tone:"blue",
    description:"Intent-matched text and asset combinations. Keywords, bids, relevance, and query demand—not social-style rarity—drive delivery.",
    cpmM:1,ctrM:1,cvrM:1,fatigueM:1,satBonus:0,fit:Object.freeze({google_search:1,microsoft_search:1})})
});

const GUIDED_PLAYBOOK=Object.freeze([
  {id:"00",title:"Account mission, intent, and boundaries",summary:"Establish what a campaign is for, which evidence is authoritative, and which controls are owned before judging results.",
    core:"A losing line item is not automatically a failed line item. Awareness, learning, testing, and immediate acquisition can use different scoreboards.",
    operator:"Record the objective, source of truth, decision window, ownership, and expected downstream outcome before recommending a change.",
    advanced:"Separate causal evidence from dashboard coincidence. Account, campaign, ad, creative, audience, event source, and downstream acceptance are different layers.",
    checklist:["Name the campaign objective.","Confirm the evidence window.","Confirm which controls are authorized.","Ask when intent is missing."],terms:["objective","campaign intent","decision window","account"]},
  {id:"01",title:"Scalable concept systems",summary:"A concept becomes scalable when one core mechanic can produce many traceable assets without rebuilding the idea.",
    core:"Concept is the idea; mechanic is the repeatable device; asset is one finished file. A winner needs room to expand.",
    operator:"Favor social-proof scenes, interface proof, regional protection, life events, direct price curiosity, and deliberately native treatments only as reusable archetypes—not copied ads.",
    advanced:"Evaluate production cost, approval reuse, platform fit, evidence quality, and the number of independent variation axes before scaling.",
    checklist:["Name the concept and mechanic separately.","Count usable axes.","Define the asset matrix.","Preserve version lineage."],terms:["concept","mechanic","asset","matrix"]},
  {id:"02",title:"Variation axes",summary:"Multiply a proven concept along controlled axes before replacing it with unrelated ideas.",
    core:"Common axes are color, geography, format or size, demographic or language, and offer or headline.",
    operator:"Change one declared variable at a time when the goal is learning. Build full size coverage when the buying lane requires it.",
    advanced:"An axis is useful only when the resulting variants remain attributable, compliant, and sufficiently powered to compare.",
    checklist:["Declare the changed axis.","Hold comparison variables steady.","Name each version consistently.","Do not call a cosmetic change a new concept."],terms:["axis","multiplication","geo cut","creative test"]},
  {id:"03",title:"Unit economics and calibration",summary:"Read cost and downstream value together; engagement alone cannot establish business quality.",
    core:"CPL describes acquisition cost. EPL describes value per lead. Profit depends on both.",
    operator:"Use account-specific normal ranges as investigation context, never universal truth. Align numerator, denominator, attribution, and date window.",
    advanced:"Marginal economics, cohort quality, settlement lag, and attribution uncertainty matter more than a single blended average at scale.",
    checklist:["Pair CPL with EPL.","Check modeled and attributed value.","Align windows.","Inspect marginal performance before scaling."],terms:["cpl","epl","profit","attribution gap"]},
  {id:"04",title:"Winner and anomaly lab",summary:"The most instructive rows are often the ones whose metrics disagree.",
    core:"High CTR can lose money. Low CTR can be profitable. The same creative can diverge across two ads because delivery context differs.",
    operator:"Walk the funnel in order and locate the first meaningful break before assigning a cause.",
    advanced:"Treat creative, placement, audience, account learning, event-source quality, and downstream acceptance as competing hypotheses.",
    checklist:["Predict before revealing the answer.","Find the first funnel break.","List plausible confounders.","Choose the smallest isolating test."],terms:["ctr","funnel","placement","variance"]},
  {id:"05",title:"Hierarchy, navigation, and diagnostic order",summary:"Know which object is being observed or changed: account, campaign, group, ad, creative, or measurement source.",
    core:"An ad carries creative. A campaign declares structure and objective. An account holds permissions, billing, and delivery history. A pixel or event source reports outcomes.",
    operator:"Widen thin date windows, preserve reporting configuration, and diagnose the funnel left to right before editing live delivery.",
    advanced:"A reporting key, attribution label, and optimization source may overlap, but they are not automatically the same object.",
    checklist:["Name the object and scope.","Use a sufficient date window.","Avoid write controls while investigating.","Record the current configuration."],terms:["ad","creative","campaign","pixel"]},
  {id:"06",title:"Metric and operations glossary",summary:"Build instant fluency without collapsing distinct metrics or operational objects into one another.",
    core:"CPM buys exposure, CTR measures response, CVR measures progression, CPL measures cost, and EPL measures downstream value.",
    operator:"Definitions must state the denominator, scope, window, and cost base. Operational labels should name the actual object.",
    advanced:"Reported, modeled, settled, and attributed values can all be internally consistent while answering different questions.",
    checklist:["State the denominator.","State the window.","State modeled or reported.","State media-only or all-in cost."],terms:["cpm","ctr","cvr","modeled outcome"]},
  {id:"07",title:"Transferable creative patterns",summary:"Use recurring structural patterns as prompts for original work, not as permission to copy executions.",
    core:"Proof, specificity, life events, native treatment, and reusable format matrices are durable patterns.",
    operator:"Pitch the hook, mechanic, multiplication plan, lane fit, and compliance check together.",
    advanced:"A pattern transfers only when audience intent, placement, economics, rights, and downstream acceptance remain compatible.",
    checklist:["Describe the transferable pattern.","Create an original execution.","Map formats and placements.","Verify rights and claims."],terms:["proof","native","placement","compliance"]},
  {id:"08",title:"Questions for the account lead",summary:"Turn unknown intent and context into explicit questions instead of unsupported conclusions.",
    core:"Ask what a campaign is for, which concepts are scaling, how variants are named, and what delivery format is needed.",
    operator:"Bring a small prioritized set of questions, record the answer as account knowledge, and identify who owns the next decision.",
    advanced:"Questions should discriminate among hypotheses. Avoid questions that merely invite confirmation of an existing guess.",
    checklist:["Prioritize three questions.","Explain why each changes a decision.","Record the answer.","Update the operating model."],terms:["intake","client trust","review","baseline"]},
  {id:"09",title:"Practice drills",summary:"Prediction, reveal, and replay build judgment faster than passive reading.",
    core:"Guess the outcome before seeing it, identify the funnel break, and explain the result after the reveal.",
    operator:"Use same-seed races, multiplication drills, compliance landmines, concept drafts, and short exit tickets.",
    advanced:"Keep scoring tied to calibration and causal reasoning, not trivia recall or visual taste.",
    checklist:["Commit to a prediction.","Reveal only after answering.","Explain the miss.","Replay with one changed decision."],terms:["seed","recall","noise","creative test"]},
  {id:"10",title:"Guided progression",summary:"Move from vocabulary to diagnosis, production, and independent decision-making in staged practice.",
    core:"Learn the language and map first, then read the funnel, build concepts, and finally close the loop on live-style outcomes.",
    operator:"Track what moved, propose why, compare that theory with the account lead, and preserve the differences as learning evidence.",
    advanced:"Progress is demonstrated by independent diagnosis and explicit uncertainty—not by memorizing a fixed benchmark.",
    checklist:["Reproduce core metrics.","Diagnose a funnel break.","Pitch a scalable concept.","Track and revise the verdict."],terms:["learning","decision window","funnel","matrix"]},
  {id:"11",title:"Compliance, claims, and asset rights",summary:"Creative sourcing includes rights, brands, people, claims, and jurisdiction-specific review.",
    core:"Inspect every asset before it enters a concept. A strong hook does not override rights or claim boundaries.",
    operator:"Check license, visible marks, recognizable people, promise language, price framing, and required disclosures.",
    advanced:"Compliance review, platform policy, account status, and asset rights are separate gates with different remedies.",
    checklist:["Verify usage rights.","Scan every frame for marks and people.","Qualify claims.","Escalate uncertainty before shipping."],terms:["compliance","approval","account hold","creative pipeline"]},
  {id:"12",title:"Simulation protocol",summary:"Use cold runs, prediction, debrief, linked reading, and same-seed replay to convert mistakes into durable judgment.",
    core:"Play once without coaching, inspect the behavior-based debrief, learn the relevant lesson, and replay the same conditions.",
    operator:"After clearing a known seed, move to a new seed and explain the first three decisions aloud.",
    advanced:"A fixed seed controls simulated uncertainty only under the same configuration. Strategy comparisons still require aligned windows and state.",
    checklist:["Run cold.","Read the linked debrief.","Replay the same seed.","Prove transfer on a new seed."],terms:["seed","variance","debrief","decision window"]}
]);

const TUTORIAL_DB=Object.freeze({
  version:1,
  reveal:Object.freeze([
    Object.freeze({target:"account",title:"1 · Start with the account",body:"The account HUD is the business scoreboard. Modeled value and all-in ROI answer a different question from platform-attributed ad performance."}),
    Object.freeze({target:"slots",title:"2 · Read the delivery objects",body:"Each card is a trainer slot containing one ad and its creative. Format, rarity, objective, fatigue, and budget are separate properties."}),
    Object.freeze({target:"slot-0",title:"3 · Follow one card through the funnel",body:"Read impressions → clicks → landing visit → on-page action → lead → value. Find the first break before changing anything."}),
    Object.freeze({target:"controls",title:"4 · Controls change different layers",body:"Budget changes delivery. Multiplication changes one creative axis. Testing creates an option. Swapping puts that option into an existing ad slot."}),
    Object.freeze({target:"run",title:"5 · Establish a baseline",body:"Run the first day before optimizing. One observation is evidence, not a trend."})
  ]),
  coach:Object.freeze([
    Object.freeze({throughDay:1,title:"Baseline day",body:"Run Day 1 with the starting allocation. Watch account economics and each ad’s funnel resolve before changing a control.",focus:"runBtn"}),
    Object.freeze({throughDay:2,title:"Predict before explanation",body:"Choose which card looks strongest and which one earns the most. Then reveal intent with Ask the buyer; engagement and economics may disagree.",focus:"slots"}),
    Object.freeze({throughDay:3,title:"Objective before verdict",body:"Inspect the reach-test card before killing it. Negative in-window ROI may be intentional when the objective is learning or awareness.",focus:"slots"}),
    Object.freeze({throughDay:4,title:"Multiply one axis",body:"Refresh a tiring proven concept with one declared variation axis. This is not the same as inventing a new concept.",focus:"slots"}),
    Object.freeze({throughDay:5,title:"Test, ready, then swap",body:"Test or request a creative, inspect the ready asset, and choose the exact ad slot that receives it. Account and campaign scope remain unchanged.",focus:"pipeBox"}),
    Object.freeze({throughDay:6,title:"Lead-quality investigation",body:"A quality escalation can implicate creative, geography, account learning, signal contamination, or downstream acceptance. Change one variable when the goal is diagnosis.",focus:"accountBox"})
  ])
});

const QUALITY_ESCALATION=Object.freeze({
  id:"lead_quality_escalation",title:"Lead-quality escalation",scope:"account operations",
  summary:"Downstream lead quality softened after a previous strong platform account stopped delivering. Alternate accounts underperformed, one geo mistake was corrected, and another team recently began optimizing through a mature event source.",
  dialogue:Object.freeze([
    Object.freeze({role:"Campaign Operations",text:"Quality has softened since the previous strongest ad account stopped delivering. A replacement takes time to prepare, so a controlled setup should begin now."}),
    Object.freeze({role:"Buyer",text:"Two alternate accounts trailed today. One test briefly included excluded regions, but that traffic is now off."}),
    Object.freeze({role:"Measurement Analyst",text:"The decline began before the geography mistake, and language traffic remains isolated on a different reporting key."}),
    Object.freeze({role:"Campaign Operations",text:"A second team recently began optimizing through the mature event source. Test whether shared learning changed the lead profile."})
  ]),
  causes:Object.freeze(["creative_fit","account_learning","signal_contamination","geo_leak","downstream_shift"]),
  choices:Object.freeze({
    account_test:Object.freeze({label:"Account-only A/B",detail:"Keep event source, creative, geo, audience, and budget matched. Slower warm-up; strong account-learning evidence."}),
    signal_test:Object.freeze({label:"Event-source-only A/B",detail:"Keep the account and creative matched. Cold-source noise; strong contamination evidence."}),
    creative_test:Object.freeze({label:"Creative-only refresh",detail:"Fastest response. It cannot repair account learning, signal quality, or downstream acceptance."}),
    clean_migration:Object.freeze({label:"Clean-stack migration",detail:"May recover delivery, but changing account and event source together leaves weak causal evidence."}),
    observe:Object.freeze({label:"Correct geo and observe",detail:"Low disruption. It cannot explain a quality shift that predates the geography error."}),
    cohort:Object.freeze({label:"Await cohort-quality report",detail:"Preserves experimental clarity and tests downstream acceptance, but costs time."})
  })
});

const SFX_CUES=Object.freeze([
  Object.freeze({id:"click",label:"Tactile control",file:"assets/audio/select_004.ogg"}),
  Object.freeze({id:"tally",label:"Run-day tally",file:"assets/audio/scroll_002.ogg"}),
  Object.freeze({id:"settle",label:"Value settled / saved",file:"assets/audio/confirmation_003.ogg"}),
  Object.freeze({id:"profit",label:"Profitable result",file:"assets/audio/confirmation_004.ogg"}),
  Object.freeze({id:"jackpot",label:"Jackpot / Legendary",file:"assets/audio/maximize_005.ogg"}),
  Object.freeze({id:"creative",label:"Creative ready / swapped",file:"assets/audio/drop_004.ogg"}),
  Object.freeze({id:"warning",label:"Warning / crisis",file:"assets/audio/error_003.ogg"}),
  Object.freeze({id:"failure",label:"Burnout / failed run",file:"assets/audio/scratch_004.ogg"})
]);
