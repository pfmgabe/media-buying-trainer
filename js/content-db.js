"use strict";

/* Structured, sanitized content that can be extended without touching either game engine.
   GitHub Pages is a public static host: passphrases select a profile, but no private workbook
   values, people, identifiers, URLs, or live account records belong in this bundle. */
const PROFILE_DB=Object.freeze({
  general:Object.freeze({
    id:"general",label:"General Portfolio Lab",badge:"GENERAL",
    scope:"Cross-platform media buying · paid search, paid social, display, connected TV (CTV), client, in-house, and agency-career practice",
    intro:"A broad media-buying laboratory spanning creative, auctions, funnels, attribution, client service, agency growth, operations, and portfolio risk.",
    defaultMode:1,guide:"general"
  }),
  specialist:Object.freeze({
    id:"specialist",label:"Specialist Account Track",badge:"GUIDED",
    scope:"Insurance lead generation · Google Display and Demand Gen · scalable creative operations",
    intro:"A sanitized guided ramp based on a mature lead-generation account: diagnose the full funnel, multiply proven concepts, preserve traceability, and ask before assigning cause.",
    defaultMode:1,guide:"specialist"
  })
});

/* Creative blueprints deliberately keep four different questions separate:
   concept = why the ad may persuade; execution = how the argument is presented; production
   method = how the asset is made; variations = what changes between related assets. These are
   game tendencies, not universal platform benchmarks. */
const CREATIVE_SYSTEMS=Object.freeze({
  narrative:Object.freeze({id:"narrative",label:"Conversational and Long-Form",mark:"🧶",
    summary:"Conversation, story and sustained written or spoken arguments.",
    groupingReason:"These executions need more than one beat to develop a story, conversation or written argument.",
    costM:1,daysM:1,reviewM:1.05,cadence:"Measured production · moderate review pressure"}),
  hook:Object.freeze({id:"hook",label:"Fast-Turn Hook Concepts",mark:"⚡",
    summary:"Quick, topical or curiosity-led openings made for frequent refreshes.",
    groupingReason:"These executions depend on an immediate curiosity, topical or cultural hook and usually need frequent replacement.",
    costM:.90,daysM:.80,reviewM:1.15,cadence:"Fastest throughput · highest review pressure"}),
  authority:Object.freeze({id:"authority",label:"Structured Explanation and Proof",mark:"🏛️",
    summary:"Structured arguments, polished evidence and documentary-style treatments.",
    groupingReason:"These executions build confidence through a structured argument, polished proof or documentary treatment.",
    costM:1.12,daysM:1.10,reviewM:.90,cadence:"Slowest throughput · lower review pressure"}),
  modular:Object.freeze({id:"modular",label:"Modular Visual Production",mark:"🧩",
    summary:"Reusable still, template and motion parts for controlled variations.",
    groupingReason:"These executions can be assembled from reusable stills, templates or motion components, making controlled variations easier.",
    costM:.88,daysM:.85,reviewM:.95,cadence:"Efficient throughput · reusable components"}),
  search:Object.freeze({id:"search",label:"Search Text Assets",mark:"🔍",
    summary:"Query-matched text and extensions. Search relevance, bids, landing experience, and demand replace social-style format physics.",
    groupingReason:"These assets answer expressed search intent and follow search-auction rules rather than social creative rules.",
    costM:1,daysM:1,reviewM:1,cadence:"Query-led iteration"})
});

const CREATIVE_CONCEPTS=Object.freeze({
  bill_reveal:Object.freeze({id:"bill_reveal",label:"Bill or quote reveal",mark:"🧾",mechanism:"Makes an abstract price or obligation concrete by showing the number or interface where it appears.",bestFor:"Price curiosity · direct response",ctrM:1.10,cvrM:1.04,qualityM:1.01,fatigueM:1.10,volatility:1.08}),
  price_transparency:Object.freeze({id:"price_transparency",label:"Price transparency",mark:"🏷️",mechanism:"Answers the buyer's price question directly with a comparison, range or cost breakdown.",bestFor:"High-intent shoppers · comparisons",ctrM:1.06,cvrM:1.08,qualityM:1.06,fatigueM:1.00,volatility:.96}),
  life_event:Object.freeze({id:"life_event",label:"Life-event trigger",mark:"🎉",mechanism:"Connects the offer to a recognizable change in the customer's life, timing or responsibilities.",bestFor:"Lead generation · broad social",ctrM:1.08,cvrM:1.05,qualityM:1.03,fatigueM:1.08,volatility:1.08}),
  customer_story:Object.freeze({id:"customer_story",label:"Customer story",mark:"🗣️",mechanism:"Uses a person's situation, objection and outcome to make the offer easier to understand and trust.",bestFor:"Trust · objection handling",ctrM:.98,cvrM:1.10,qualityM:1.11,fatigueM:.88,volatility:.90}),
  product_demo:Object.freeze({id:"product_demo",label:"Demonstration",mark:"🛍️",mechanism:"Shows the product, service or process working instead of only describing its promise.",bestFor:"Commerce · considered decisions",ctrM:1.02,cvrM:1.09,qualityM:1.07,fatigueM:.94,volatility:.92}),
  news_frame:Object.freeze({id:"news_frame",label:"News or current-event frame",mark:"📡",mechanism:"Borrows the urgency and explanatory grammar of a news update to make a problem feel current.",bestFor:"Fast hooks · timely angles",ctrM:1.13,cvrM:.98,qualityM:.96,fatigueM:1.30,volatility:1.28}),
  action_story:Object.freeze({id:"action_story",label:"Action or disruption story",mark:"💥",mechanism:"Opens with motion, conflict or a surprising incident, then bridges that attention to the offer.",bestFor:"Cold social · interruptive reach",ctrM:1.15,cvrM:.94,qualityM:.92,fatigueM:1.34,volatility:1.30}),
  seasonal:Object.freeze({id:"seasonal",label:"Seasonal urgency",mark:"🎄",mechanism:"Ties the decision to a real calendar moment, deadline or seasonal need.",bestFor:"Short windows · promotions",ctrM:1.09,cvrM:1.05,qualityM:.99,fatigueM:1.24,volatility:1.18}),
  average_cost:Object.freeze({id:"average_cost",label:"Average-cost pitch",mark:"🧮",mechanism:"Uses a benchmark or regional average to frame the offer and invite the customer to compare.",bestFor:"Search-supported lead generation",ctrM:.96,cvrM:1.04,qualityM:1.02,fatigueM:.94,volatility:1.04}),
  social_proof:Object.freeze({id:"social_proof",label:"Social proof",mark:"👥",mechanism:"Uses adoption, reviews, interviews or observable behavior to reduce uncertainty.",bestFor:"Trust · retargeting · qualification",ctrM:1.00,cvrM:1.10,qualityM:1.12,fatigueM:.90,volatility:.88}),
  comparison:Object.freeze({id:"comparison",label:"Comparison",mark:"⚖️",mechanism:"Places two choices, outcomes or approaches side by side so the decision rule becomes visible.",bestFor:"High intent · product education",ctrM:1.03,cvrM:1.08,qualityM:1.08,fatigueM:.94,volatility:.90}),
  problem_solution:Object.freeze({id:"problem_solution",label:"Problem to solution",mark:"🧩",mechanism:"Names a specific problem, explains the mechanism and connects it to one next action.",bestFor:"Evergreen explanation",ctrM:1.00,cvrM:1.07,qualityM:1.06,fatigueM:.92,volatility:.90})
});

const CREATIVE_PRODUCTION_METHODS=Object.freeze({
  user_shot:Object.freeze({id:"user_shot",label:"User-shot / UGC",mark:"📱",description:"A person records in a native, lightly produced style.",costM:.72,daysM:.72,reviewM:1.08,ctrM:1.05,cvrM:1.02,qualityM:1.02,fatigueM:1.10,volatility:1.12}),
  live_action:Object.freeze({id:"live_action",label:"Live action",mark:"🎥",description:"A planned physical shoot with people, locations or demonstrations.",costM:1.35,daysM:1.30,reviewM:1.02,ctrM:1.00,cvrM:1.04,qualityM:1.06,fatigueM:.94,volatility:.92}),
  studio:Object.freeze({id:"studio",label:"Studio / polished",mark:"🎬",description:"A controlled, higher-finish production with stronger brand and proof control.",costM:1.60,daysM:1.45,reviewM:.94,ctrM:.96,cvrM:1.05,qualityM:1.08,fatigueM:.90,volatility:.86}),
  modular_template:Object.freeze({id:"modular_template",label:"Modular template",mark:"🧱",description:"Reusable layouts, stills and text components make variants inexpensive and traceable.",costM:.72,daysM:.70,reviewM:.94,ctrM:1.00,cvrM:1.00,qualityM:.99,fatigueM:1.02,volatility:.92}),
  motion_design:Object.freeze({id:"motion_design",label:"Motion design / animation",mark:"🎞️",description:"Designed movement, diagrams and reusable scenes explain without a physical shoot.",costM:1.18,daysM:1.22,reviewM:.94,ctrM:1.04,cvrM:1.01,qualityM:1.01,fatigueM:1.06,volatility:.94}),
  ai_assisted:Object.freeze({id:"ai_assisted",label:"AI-assisted production",mark:"🛠️",description:"People retain editorial control while AI helps with ideation, cleanup, versions or selected shots.",costM:.84,daysM:.78,reviewM:1.08,ctrM:1.01,cvrM:.99,qualityM:.99,fatigueM:1.06,volatility:1.08}),
  ai_generated:Object.freeze({id:"ai_generated",label:"AI-generated scenes",mark:"✨",description:"Generated footage supplies much of the visible scene. It is fast to vary, but coherence, authenticity, rights and disclosure need more review; generation alone is not a strong concept.",costM:.82,daysM:.76,reviewM:1.34,ctrM:1.03,cvrM:.92,qualityM:.90,fatigueM:1.18,volatility:1.34})
});

const CREATIVE_FORMATS=Object.freeze({
  story:Object.freeze({id:"story",label:"Story Ad (Stories)",mark:"📱",tone:"pink",system:"narrative",kind:"placement-led format",
    description:"A vertical, full-screen sequence built for a fast opening and an immediate action. It feels native in Stories and short-video feeds, then tires quickly when the same hook repeats.",
    production:"Fast mobile build · one simulated production day",tradeoff:"Fast hook · fast fatigue",productionDays:1,productionCostM:.85,reviewRiskM:1.05,volatility:1.18,
    cpmM:1.02,ctrM:1.12,cvrM:.99,qualityM:1.00,fatigueM:1.25,satBonus:950,
    fit:Object.freeze({google:.94,google_dgen:.94,meta:1.15,tiktok:1.14,snap:1.18,linkedin:.72,ctv:.62}),
    styleFit:Object.freeze({lead_gen:1.02,commerce:1.08,b2b:.82,app:1.08,brand:.96})}),
  vsl:Object.freeze({id:"vsl",label:"Video sales letter (VSL)",mark:"🎬",tone:"violet",system:"authority",kind:"persuasion structure",
    description:"A video sales letter builds a sequenced argument: problem, mechanism, proof, offer, and action. The opening is slower, but qualified viewers can carry stronger downstream intent.",
    production:"Scripted production · five simulated production days",tradeoff:"Slow hook · strong persuasion",productionDays:5,productionCostM:1.80,reviewRiskM:1.35,volatility:.84,
    cpmM:1.06,ctrM:.90,cvrM:1.16,qualityM:1.12,fatigueM:.80,satBonus:1400,
    fit:Object.freeze({google:1.06,google_dgen:1.06,meta:1.10,tiktok:.90,snap:.75,linkedin:1.04,ctv:1.10}),
    styleFit:Object.freeze({lead_gen:1.12,commerce:1.05,b2b:1.10,app:.72,brand:1.03})}),
  podcast:Object.freeze({id:"podcast",label:"Podcast",mark:"🎙️",tone:"violet",system:"narrative",kind:"source / presentation style",
    description:"A conversational host-and-guest or clipped interview treatment. Voice, captions, and credible detail build trust; it loses much of its edge when sound or context is missing.",
    production:"Recorded conversation + cutdowns · three simulated production days",tradeoff:"Conversational proof · sound-dependent",productionDays:3,productionCostM:1.35,reviewRiskM:.95,volatility:.88,
    cpmM:1.04,ctrM:.95,cvrM:1.11,qualityM:1.13,fatigueM:.84,satBonus:1200,
    fit:Object.freeze({google:.98,google_dgen:.98,meta:1.09,tiktok:1.04,snap:.90,linkedin:1.12,ctv:1.06}),
    styleFit:Object.freeze({lead_gen:1.09,commerce:.98,b2b:1.16,app:.78,brand:1.08})}),
  slideshow:Object.freeze({id:"slideshow",label:"Slideshow",mark:"🗂️",tone:"cyan",system:"modular",kind:"assembly format",
    description:"A lightweight sequence of stills, text, and simple motion. It is cheap to recut across aspect ratios and messages, with middle-of-the-road attention and fatigue.",
    production:"Template assembly · two simulated production days",tradeoff:"Cheap coverage · moderate novelty",productionDays:2,productionCostM:.80,reviewRiskM:.95,volatility:.94,
    cpmM:.98,ctrM:1.05,cvrM:1.00,qualityM:.99,fatigueM:1.04,satBonus:700,
    fit:Object.freeze({google:1.05,google_dgen:1.05,meta:1.03,tiktok:1.02,snap:1.06,linkedin:.92,ctv:.82}),
    styleFit:Object.freeze({lead_gen:1.02,commerce:1.05,b2b:.94,app:.96,brand:.92})}),
  veo:Object.freeze({id:"veo",label:"AI-generated video · legacy save",mark:"✨",tone:"pink",system:"hook",kind:"legacy combined execution",
    description:"Earlier saves treated AI generation as the entire ad type. New creative blueprints instead pair an AI-generated production method with a separate concept and execution.",legacyOnly:true,
    platformNote:"AI-generated or significantly edited executions may need platform disclosure and must still clear rights, claims, and human review.",
    production:"Generated + human review · two simulated production days",tradeoff:"Fast variation · high trust variance",productionDays:2,productionCostM:1.15,reviewRiskM:1.35,volatility:1.38,
    cpmM:1.03,ctrM:1.14,cvrM:.93,qualityM:.92,fatigueM:1.34,satBonus:1250,
    fit:Object.freeze({google:1.02,google_dgen:1.02,meta:1.08,tiktok:1.16,snap:1.12,linkedin:.72,ctv:1.02}),
    styleFit:Object.freeze({lead_gen:.94,commerce:1.03,b2b:.76,app:1.16,brand:.92})}),
  ugc_interview:Object.freeze({id:"ugc_interview",label:"UGC interview",mark:"🤳",tone:"pink",system:"narrative",kind:"source and presentation style",
    description:"A person answers prompts or tells a short experience in a native interview treatment. The concept can be a customer story, life event, price reveal or something else; the interview is only how it is presented.",
    production:"Interview capture + cutdowns · two simulated production days",tradeoff:"Human specificity · presenter dependence",productionDays:2,productionCostM:1.05,reviewRiskM:1.08,volatility:.94,
    cpmM:1.02,ctrM:1.05,cvrM:1.08,qualityM:1.09,fatigueM:.94,satBonus:1100,
    fit:Object.freeze({google:.98,google_dgen:.98,meta:1.13,tiktok:1.12,snap:1.05,linkedin:1.04,ctv:.96}),
    styleFit:Object.freeze({lead_gen:1.10,commerce:1.02,b2b:1.02,app:.86,brand:1.02})}),
  qvc_demo:Object.freeze({id:"qvc_demo",label:"QVC-style demonstration",mark:"🛍️",tone:"violet",system:"authority",kind:"persuasion and presentation structure",
    description:"A host demonstrates, explains and repeats the offer in a direct-response retail rhythm. Duration, presenter, offer and market remain separate variation axes.",
    production:"Hosted demonstration · four simulated production days",tradeoff:"Clear offer · heavier production",productionDays:4,productionCostM:1.55,reviewRiskM:1.15,volatility:.90,
    cpmM:1.05,ctrM:.98,cvrM:1.11,qualityM:1.07,fatigueM:.88,satBonus:1400,
    fit:Object.freeze({google:1.04,google_dgen:1.04,meta:1.08,tiktok:.91,snap:.82,linkedin:.82,ctv:1.16}),
    styleFit:Object.freeze({lead_gen:1.07,commerce:1.13,b2b:.82,app:.72,brand:1.05})}),
  breaking_news:Object.freeze({id:"breaking_news",label:"Breaking-news treatment",mark:"📡",tone:"amber",system:"hook",kind:"presentation and persuasion structure",
    description:"A bulletin-style package frames the problem as an urgent update. It is broader than a greenscreen: anchor desk, field report, voice-over and graphic packages can all carry the same treatment.",
    production:"Bulletin package · three simulated production days",tradeoff:"Urgent opening · context decay",productionDays:3,productionCostM:1.30,reviewRiskM:1.48,volatility:1.26,
    cpmM:1.02,ctrM:1.12,cvrM:1.00,qualityM:.98,fatigueM:1.28,satBonus:1000,
    fit:Object.freeze({google:.98,google_dgen:.98,meta:1.12,tiktok:1.08,snap:1.02,linkedin:.83,ctv:1.12}),
    styleFit:Object.freeze({lead_gen:1.04,commerce:.98,b2b:.86,app:.92,brand:.90})}),
  ctv_spot:Object.freeze({id:"ctv_spot",label:"CTV spot",mark:"📺",tone:"amber",system:"authority",kind:"placement-led asset format",
    description:"A horizontal, full-screen video built for connected TV. View-through and call or site outcomes matter more than clicks; duration, concept and production method remain separate choices.",
    production:"Broadcast-safe spot · five simulated production days",tradeoff:"High-attention reach · weak click signal",productionDays:5,productionCostM:1.75,reviewRiskM:1.02,volatility:.82,
    cpmM:1.06,ctrM:.20,cvrM:1.05,qualityM:1.06,fatigueM:.80,satBonus:1700,
    fit:Object.freeze({google:.72,google_dgen:.82,meta:.78,tiktok:.62,snap:.64,linkedin:.78,ctv:1.24}),
    styleFit:Object.freeze({lead_gen:1.02,commerce:.96,b2b:.98,app:.82,brand:1.16})}),
  news_greenscreen:Object.freeze({id:"news_greenscreen",label:"News Greenscreen",mark:"🗞️",tone:"amber",system:"hook",kind:"presentation style",
    description:"A presenter reacts to a headline or visual source behind them. Currency creates a sharp hook, but stale context, source clarity, and claim framing make it a high-maintenance execution.",
    production:"Rapid-response edit · one simulated production day",tradeoff:"Topical hook · rapid decay",productionDays:1,productionCostM:1.00,reviewRiskM:1.55,volatility:1.32,
    cpmM:1.01,ctrM:1.13,cvrM:1.02,qualityM:1.00,fatigueM:1.32,satBonus:850,
    fit:Object.freeze({google:.96,google_dgen:.96,meta:1.12,tiktok:1.18,snap:1.06,linkedin:.85,ctv:.84}),
    styleFit:Object.freeze({lead_gen:1.03,commerce:1.01,b2b:.90,app:1.05,brand:.88})}),
  documentary:Object.freeze({id:"documentary",label:"Nat Geo Documentary",mark:"🦌",tone:"green",system:"authority",kind:"presentation style",
    description:"A cinematic field-story treatment modeled on nature-documentary grammar, with no publisher affiliation. It opens slowly, builds durable trust, and demands the heaviest production commitment.",
    production:"Field-story production · seven simulated production days",tradeoff:"High trust · highest production burden",productionDays:7,productionCostM:2.20,reviewRiskM:1.10,volatility:.76,
    cpmM:1.08,ctrM:.90,cvrM:1.12,qualityM:1.15,fatigueM:.73,satBonus:1800,
    fit:Object.freeze({google:1.07,google_dgen:1.07,meta:1.02,tiktok:.87,snap:.72,linkedin:1.06,ctv:1.20}),
    styleFit:Object.freeze({lead_gen:1.00,commerce:.96,b2b:1.04,app:.78,brand:1.18})}),
  meme:Object.freeze({id:"meme",label:"Memes",mark:"😄",tone:"pink",system:"hook",kind:"cultural style",
    description:"A compact joke or recognizable visual grammar that can win cheap attention. It is extremely fast to make, volatile in tone, and usually exhausts itself before polished evergreen work.",
    production:"Rapid cultural remix · one simulated production day",tradeoff:"Cheapest hook · fastest burnout",productionDays:1,productionCostM:.45,reviewRiskM:1.25,volatility:1.48,
    cpmM:.95,ctrM:1.18,cvrM:.89,qualityM:.88,fatigueM:1.48,satBonus:450,
    fit:Object.freeze({google:.86,google_dgen:.86,meta:1.12,tiktok:1.20,snap:1.16,linkedin:.62,ctv:.50}),
    styleFit:Object.freeze({lead_gen:.90,commerce:1.04,b2b:.65,app:1.18,brand:.76})}),
  voicemail:Object.freeze({id:"voicemail",label:"Voicemail",mark:"📞",tone:"amber",system:"hook",kind:"audio-led style",
    description:"A voicemail-screen or recorded-message conceit that opens a curiosity loop. It is cheap and personal, but depends on captions, sound design, and frequent new setups.",
    production:"Audio-led social cut · one simulated production day",tradeoff:"Curiosity hook · sound dependency",productionDays:1,productionCostM:.55,reviewRiskM:1.45,volatility:1.27,
    cpmM:.98,ctrM:1.11,cvrM:.96,qualityM:.93,fatigueM:1.30,satBonus:500,
    fit:Object.freeze({google:.84,google_dgen:.84,meta:1.09,tiktok:1.16,snap:1.12,linkedin:.66,ctv:.72}),
    styleFit:Object.freeze({lead_gen:1.00,commerce:1.01,b2b:.72,app:1.08,brand:.80})}),
  static:Object.freeze({id:"static",label:"Static",mark:"🖼️",tone:"cyan",system:"modular",kind:"base visual format",
    description:"One still image with copy. It is inexpensive, stable, and easy to split-test across messages and sizes, but cannot rely on motion to earn the opening second.",
    production:"Single-frame build · one simulated production day",tradeoff:"Reliable testing · lower motion hook",productionDays:1,productionCostM:.70,reviewRiskM:1.00,volatility:.84,
    cpmM:.99,ctrM:.98,cvrM:1.02,qualityM:1.02,fatigueM:.90,satBonus:400,
    fit:Object.freeze({google:1.08,google_dgen:1.08,meta:1.00,tiktok:.80,snap:.88,linkedin:1.04,ctv:.58}),
    styleFit:Object.freeze({lead_gen:1.04,commerce:1.00,b2b:1.02,app:.82,brand:.98})}),
  animation:Object.freeze({id:"animation",label:"Animation",mark:"🎞️",tone:"amber",system:"modular",kind:"motion format",
    description:"Designed motion explains a mechanism or demonstrates change without a physical shoot. Reusable components make it broad, while more movement raises the attention-refresh clock.",
    production:"Designed motion package · four simulated production days",tradeoff:"Clear explanation · medium build",productionDays:4,productionCostM:1.40,reviewRiskM:.90,volatility:.96,
    cpmM:1.02,ctrM:1.08,cvrM:1.00,qualityM:1.01,fatigueM:1.12,satBonus:1000,
    fit:Object.freeze({google:1.06,google_dgen:1.06,meta:1.05,tiktok:1.08,snap:1.07,linkedin:.96,ctv:1.10}),
    styleFit:Object.freeze({lead_gen:1.03,commerce:1.03,b2b:1.05,app:1.08,brand:1.04})}),
  branded:Object.freeze({id:"branded",label:"Branded",mark:"🏷️",tone:"violet",system:"authority",kind:"presentation style",
    description:"A polished, unmistakably advertiser-owned execution. Brand clarity and trust are high; native-feed feel and immediate click impulse are lower unless the cut is adapted.",
    production:"Polished brand production · six simulated production days",tradeoff:"Durable trust · low native feel",productionDays:6,productionCostM:1.90,reviewRiskM:.90,volatility:.70,
    cpmM:1.08,ctrM:.87,cvrM:1.08,qualityM:1.10,fatigueM:.76,satBonus:1700,
    fit:Object.freeze({google:1.08,google_dgen:1.08,meta:1.00,tiktok:.78,snap:.72,linkedin:1.14,ctv:1.18}),
    styleFit:Object.freeze({lead_gen:1.02,commerce:1.01,b2b:1.12,app:.76,brand:1.18})}),
  native_long_copy:Object.freeze({id:"native_long_copy",label:"Native Long-Copy",mark:"📜",tone:"green",system:"narrative",kind:"copy-led style",
    description:"A long argument designed for copy-friendly feeds, especially Meta and LinkedIn. It qualifies patient readers and supports stronger intent; constrained placements need short ad assets that click to a long-copy destination.",
    platformNote:"Google visual inventory uses short asset fields rather than a native long-copy unit. LinkedIn posts can truncate, and sponsored author content can require permission.",
    production:"Long-form copy + native layout · two simulated production days",tradeoff:"Deep qualification · slower attention",productionDays:2,productionCostM:1.00,reviewRiskM:1.30,volatility:.86,
    cpmM:.96,ctrM:1.04,cvrM:1.12,qualityM:1.14,fatigueM:.83,satBonus:950,
    fit:Object.freeze({google:.90,google_dgen:.90,meta:1.12,tiktok:.86,snap:.70,linkedin:1.15,ctv:.48}),
    styleFit:Object.freeze({lead_gen:1.12,commerce:1.02,b2b:1.16,app:.64,brand:1.00})}),
  long_copy_video:Object.freeze({id:"long_copy_video",label:"Long-Copy to Video",mark:"📽️",tone:"violet",system:"narrative",kind:"repurposing format",
    description:"A long-form written argument rebuilt as narrated motion, chapters, and cutdowns. It preserves explanatory depth while gaining video reach, at the cost of a larger edit and re-hooking burden.",
    production:"Script adaptation + motion edit · four simulated production days",tradeoff:"Repurposed depth · heavier edit",productionDays:4,productionCostM:1.55,reviewRiskM:1.35,volatility:.90,
    cpmM:1.05,ctrM:.97,cvrM:1.13,qualityM:1.12,fatigueM:.88,satBonus:1350,
    fit:Object.freeze({google:1.06,google_dgen:1.06,meta:1.11,tiktok:1.02,snap:.86,linkedin:1.07,ctv:1.10}),
    styleFit:Object.freeze({lead_gen:1.10,commerce:1.03,b2b:1.12,app:.80,brand:1.08})}),
  search:Object.freeze({id:"search",label:"Search text / assets",mark:"🔍",tone:"blue",system:"search",kind:"lane-specific asset system",
    description:"Intent-matched text and asset combinations. Keywords, bids, relevance, and query demand — not social-style rarity — drive delivery.",
    production:"Search copy + destination alignment",tradeoff:"Finite intent · relevance constrained",productionDays:1,productionCostM:.55,reviewRiskM:1,volatility:.75,
    cpmM:1,ctrM:1,cvrM:1,qualityM:1,fatigueM:1,satBonus:0,
    fit:Object.freeze({google_search:1,microsoft_search:1}),styleFit:Object.freeze({lead_gen:1,commerce:1,b2b:1,app:1,brand:1})})
});

/* Old local saves can still contain the first taxonomy. Resolve them silently; all newly
   authored and generated creatives use the catalog above. */
const CREATIVE_FORMAT_ALIASES=Object.freeze({
  rendered:"animation",motion:"animation",ugc:"story",founder:"vsl",native:"native_long_copy",
  utility:"static",lifestyle:"static",ctv:"branded"
});

/* Which execution SYSTEMS can carry each persuasion concept, and which production methods can
   physically make each system. Without this the Creative Lab's concept and production menus
   only rewrote help text while the same catalog stayed on offer (fixed 2026-08-09). */
const CONCEPT_CARRIERS=Object.freeze({
  bill_reveal:Object.freeze(["modular","hook","authority","search"]),
  price_transparency:Object.freeze(["modular","authority","search","hook"]),
  life_event:Object.freeze(["narrative","hook","modular"]),
  customer_story:Object.freeze(["narrative","authority","hook"]),
  product_demo:Object.freeze(["authority","narrative","modular"]),
  news_frame:Object.freeze(["authority","narrative","hook"]),
  action_story:Object.freeze(["narrative","hook"]),
  seasonal:Object.freeze(["modular","hook","narrative","search"]),
  average_cost:Object.freeze(["modular","authority","search"]),
  social_proof:Object.freeze(["narrative","authority","hook","modular"]),
  comparison:Object.freeze(["authority","modular","search"]),
  problem_solution:Object.freeze(["narrative","authority","modular","hook","search"])
});
const SYSTEM_METHODS=Object.freeze({
  narrative:Object.freeze(["user_shot","live_action","studio","ai_assisted","ai_generated"]),
  hook:Object.freeze(["user_shot","modular_template","motion_design","ai_assisted","ai_generated"]),
  authority:Object.freeze(["live_action","studio","motion_design","ai_assisted"]),
  modular:Object.freeze(["modular_template","motion_design","studio","ai_assisted","ai_generated"]),
  search:Object.freeze(["modular_template"])
});
function conceptCarriesFormat(conceptId,formatId){
  const carriers=CONCEPT_CARRIERS[conceptId];const format=CREATIVE_FORMATS[formatId];
  if(!carriers||!format)return true;return carriers.includes(format.system);
}
function methodMakesFormat(methodId,formatId){
  const format=CREATIVE_FORMATS[formatId];if(!format)return true;
  const methods=SYSTEM_METHODS[format.system];return !methods||methods.includes(methodId);
}
function methodsForFormat(formatId){
  const format=CREATIVE_FORMATS[formatId],methods=format&&SYSTEM_METHODS[format.system];
  return Object.values(CREATIVE_PRODUCTION_METHODS).filter(method=>!methods||methods.includes(method.id));
}

const LEGACY_CREATIVE_FORMATS=Object.freeze({
  static_legacy:Object.freeze({id:"static_legacy",label:"Static image · legacy save",mark:"🖼️",tone:"cyan",system:"modular",kind:"legacy format taxonomy",
    description:"A still-image execution preserved with the exact placement and decay physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Reliable variation · moderate attention",cpmM:.99,ctrM:.98,cvrM:1.02,qualityM:1,fatigueM:.90,volatility:1,satBonus:400,fit:Object.freeze({google:1.05,meta:1,snap:.91,tiktok:.86,google_dgen:1.05,ctv:.72}),styleFit:Object.freeze({})}),
  rendered:Object.freeze({id:"rendered",label:"Rendered scene · legacy save",mark:"🎨",tone:"violet",system:"modular",kind:"legacy format taxonomy",
    description:"An illustrated or 3D scene preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Reusable scene · moderate build",cpmM:1.02,ctrM:1.01,cvrM:1.05,qualityM:1,fatigueM:.96,volatility:1,satBonus:900,fit:Object.freeze({google:1.04,meta:1.04,snap:.96,tiktok:.91,google_dgen:1.08,ctv:.86}),styleFit:Object.freeze({})}),
  motion:Object.freeze({id:"motion",label:"Motion graphic · legacy save",mark:"🎞️",tone:"amber",system:"modular",kind:"legacy format taxonomy",
    description:"A short motion unit preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Fast attention · faster fatigue",cpmM:1.02,ctrM:1.10,cvrM:.98,qualityM:1,fatigueM:1.18,volatility:1,satBonus:650,fit:Object.freeze({google:.98,meta:1.04,snap:1.08,tiktok:1.10,google_dgen:1.02,ctv:1.02}),styleFit:Object.freeze({})}),
  ugc:Object.freeze({id:"ugc",label:"User-generated content video · legacy save",mark:"🤳",tone:"pink",system:"hook",kind:"legacy format taxonomy",
    description:"A person-led native video preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Breakout hook · fast fatigue",cpmM:1.04,ctrM:1.15,cvrM:1.04,qualityM:1,fatigueM:1.32,volatility:1,satBonus:1100,fit:Object.freeze({google:.88,meta:1.10,snap:1.12,tiktok:1.18,google_dgen:.98,ctv:.90}),styleFit:Object.freeze({})}),
  founder:Object.freeze({id:"founder",label:"Founder / explainer · legacy save",mark:"🗣️",tone:"violet",system:"authority",kind:"legacy format taxonomy",
    description:"A longer trust-building explanation preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Slower attention · stronger conversion",cpmM:1.06,ctrM:.91,cvrM:1.13,qualityM:1,fatigueM:.78,volatility:1,satBonus:800,fit:Object.freeze({google:.94,meta:1.06,snap:.82,tiktok:.94,google_dgen:1,ctv:1.05,linkedin:1.14}),styleFit:Object.freeze({})}),
  native:Object.freeze({id:"native",label:"Native display · legacy save",mark:"📰",tone:"green",system:"narrative",kind:"legacy format taxonomy",
    description:"A deliberately plain content-like unit preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Cheap inventory · lighter downstream fit",cpmM:.94,ctrM:1.05,cvrM:.94,qualityM:1,fatigueM:.84,volatility:1,satBonus:500,fit:Object.freeze({google:1.10,meta:.94,snap:.90,tiktok:.84,google_dgen:1.05,ctv:.76}),styleFit:Object.freeze({})}),
  utility:Object.freeze({id:"utility",label:"Input / UI utility · legacy save",mark:"🖥️",tone:"blue",system:"modular",kind:"legacy format taxonomy",
    description:"An interface-like proof unit preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Concrete action · narrow execution",cpmM:.97,ctrM:1.04,cvrM:1.08,qualityM:1,fatigueM:1,volatility:1,satBonus:350,fit:Object.freeze({google:1.10,meta:1.01,snap:.94,tiktok:.91,google_dgen:1.04,ctv:.68}),styleFit:Object.freeze({})}),
  lifestyle:Object.freeze({id:"lifestyle",label:"Lifestyle static · legacy save",mark:"📸",tone:"cyan",system:"narrative",kind:"legacy format taxonomy",
    description:"A life-event or regional still preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"Contextual fit · moderate hook",cpmM:1.01,ctrM:.97,cvrM:1.08,qualityM:1,fatigueM:.94,volatility:1,satBonus:650,fit:Object.freeze({google:1.03,meta:1.05,snap:.97,tiktok:.91,google_dgen:1.06,ctv:.90}),styleFit:Object.freeze({})}),
  ctv:Object.freeze({id:"ctv",label:"Connected TV (CTV) spot · legacy save",mark:"📺",tone:"amber",system:"authority",kind:"legacy format taxonomy",
    description:"A reach-led full-screen spot preserved with the physics stored by an earlier save version.",production:"Legacy save · existing asset",tradeoff:"View-through reach · few clicks",cpmM:1.08,ctrM:.15,cvrM:1.06,qualityM:1,fatigueM:.72,volatility:1,satBonus:1500,fit:Object.freeze({ctv:1.20,google:.72,meta:.80,snap:.82,tiktok:.84,google_dgen:.88}),styleFit:Object.freeze({})})
});
function canonicalCreativeFormatId(id){return CREATIVE_FORMATS[id]?id:(CREATIVE_FORMAT_ALIASES[id]||"static");}
function creativeFormatById(id){return CREATIVE_FORMATS[id]||LEGACY_CREATIVE_FORMATS[id]||CREATIVE_FORMATS[canonicalCreativeFormatId(id)]||CREATIVE_FORMATS.static;}
function creativeSystemFor(format){return CREATIVE_SYSTEMS[(format&&format.system)||"modular"]||CREATIVE_SYSTEMS.modular;}
function selectableCreativeFormats(){return Object.values(CREATIVE_FORMATS).filter(format=>format.id!=="search"&&!format.legacyOnly);}
function defaultCreativeConceptId(formatId){return ({story:"life_event",vsl:"problem_solution",podcast:"customer_story",slideshow:"comparison",
  veo:"problem_solution",ugc_interview:"customer_story",qvc_demo:"product_demo",breaking_news:"news_frame",ctv_spot:"product_demo",
  news_greenscreen:"news_frame",documentary:"customer_story",meme:"action_story",voicemail:"customer_story",static:"bill_reveal",
  animation:"problem_solution",branded:"product_demo",native_long_copy:"problem_solution",long_copy_video:"problem_solution"})[formatId]||"problem_solution";}
function defaultCreativeProductionMethodId(formatId){return ({story:"user_shot",vsl:"live_action",podcast:"live_action",slideshow:"modular_template",
  veo:"ai_generated",ugc_interview:"user_shot",qvc_demo:"studio",breaking_news:"studio",ctv_spot:"studio",news_greenscreen:"user_shot",
  documentary:"live_action",meme:"modular_template",voicemail:"user_shot",static:"modular_template",animation:"motion_design",
  branded:"studio",native_long_copy:"modular_template",long_copy_video:"motion_design"})[formatId]||"modular_template";}
function creativeConceptById(id){return CREATIVE_CONCEPTS[id]||CREATIVE_CONCEPTS.problem_solution;}
function creativeProductionMethodById(id){return CREATIVE_PRODUCTION_METHODS[id]||CREATIVE_PRODUCTION_METHODS.modular_template;}
function creativeConceptFor(creative){return creativeConceptById(creative&&creative.concept||defaultCreativeConceptId(creative&&creative.format));}
function creativeProductionMethodFor(creative){return creativeProductionMethodById(creative&&creative.productionMethod||defaultCreativeProductionMethodId(creative&&creative.format));}
function creativeFacetModifier(creative,key,weight=.28){const concept=Number(creativeConceptFor(creative)[key]),method=Number(creativeProductionMethodFor(creative)[key]);
  const combined=(Number.isFinite(concept)?concept:1)*(Number.isFinite(method)?method:1);return 1+(combined-1)*weight;}
function creativeEvidenceLabel(creative,measurementHealthy=true){if(!measurementHealthy)return "Measurement blocked · no creative verdict";
  const days=Math.max(0,Math.floor(Number(creative&&creative.evidenceDays)||0));return days>=5?"Repeated account evidence":days>=2?"Directional account evidence":"Untested in this account";}

const GUIDED_PLAYBOOK=Object.freeze([
  {id:"00",title:"Account mission, intent, and boundaries",summary:"Establish what a campaign is for, which evidence is authoritative, and which controls are owned before judging results.",
    core:"A losing line item is not automatically a failed line item. Awareness, learning, testing, and immediate acquisition can use different scoreboards.",
    operator:"Record the objective, source of truth, decision window, ownership, and expected downstream outcome before recommending a change.",
    advanced:"Separate causal evidence from dashboard coincidence. Account, campaign, ad, creative, audience, event source, and downstream acceptance are different layers.",
    checklist:["Name the campaign objective.","Confirm the evidence window.","Confirm which controls are authorized.","Ask when intent is missing."],terms:["objective","campaign intent","decision window","account"]},
  {id:"01",title:"Scalable concept systems",summary:"A concept becomes scalable when one core mechanic can produce many traceable assets without rebuilding the idea.",
    core:"Concept is the idea; mechanic is the repeatable device; asset is one finished file. A winner needs room to expand.",
    operator:"Favor social-proof scenes, interface proof, regional protection, life events, direct price curiosity, and deliberately native treatments only as reusable archetypes — not copied ads.",
    advanced:"Evaluate production cost, approval reuse, platform fit, evidence quality, and the number of independent variation axes before scaling.",
    checklist:["Name the concept and mechanic separately.","Choose the execution and production method separately.","State the evidence scope before transferring a winner.","Count usable axes.","Define the asset matrix.","Preserve version lineage."],terms:["concept","mechanic","asset","matrix","creative execution","production method","evidence scope","story ad","vsl","podcast creative","slideshow","veo creative","ugc interview","qvc-style demonstration","breaking-news treatment","news greenscreen","nat geo documentary","memes","voicemail creative","static","animation","branded creative","native long-copy","long-copy to video"]},
  {id:"02",title:"Variation axes",summary:"Multiply a proven concept along controlled axes before replacing it with unrelated ideas.",
    core:"Common axes are color, geography, format or size, demographic or language, and offer or headline. In search, an A/B ad permutation keeps the core message and changes one copy axis; a rewrite replaces the lead wording.",
    operator:"Change one declared variable at a time when the goal is learning, and let sibling variants collect separate evidence. Read creative scale pressure separately from shared lane-capacity pressure before deciding whether the next fix is new creative or a different allocation mix.",
    advanced:"An axis is useful only when the resulting variants remain attributable, compliant, and sufficiently powered to compare. Equal ad rotation improves readability but does not guarantee a conclusive experiment, and To The Moon's rapid-scale threshold is a game rule rather than a platform benchmark.",
    checklist:["Declare the changed axis.","Hold comparison variables steady.","Name each version consistently.","Compare marginal results with fresh capacity.","Do not call a cosmetic change a new concept."],terms:["axis","multiplication","a/b ad permutation","ad rotation","fresh capacity","creative scale pressure","lane capacity pressure","rapid-scale review risk","geo cut","creative test"]},
  {id:"03",title:"Unit economics and calibration",summary:"Read cost and downstream value together; engagement alone cannot establish business quality.",
    core:"Cost per lead (CPL) describes acquisition cost. Earnings or value per lead (EPL) describes downstream value. Profit depends on both. Attributed media margin is a currency amount — attributed value minus media spend — while return on investment (ROI) is a percentage based on a declared cost base. In an agency ledger, client media spend and agency profit remain separate.",
    operator:"Use account-specific normal ranges as investigation context, never universal truth. Align numerator, denominator, attribution, and date window. Compare the marginal marketing efficiency ratio (MER) with the blended result before committing the next allocation step. At agency month close, read the monthly operating statement separately from cash, then compare obligations with the operating reserve, available credit and runway.",
    advanced:"Cohort quality, settlement lag and attribution uncertainty matter more than a single blended average at scale. Working capital can fail before profitable receivables are collected; taking an early receivable haircut exchanges contribution for liquidity rather than repairing media performance. An affiliate pivot replaces client-fee economics with owned-funnel economics rather than combining both ledgers. Affiliate signal changes modeled payout efficiency, while validation and clawbacks determine how much of that payout becomes collected cash.",
    checklist:["Pair CPL with EPL.","Check modeled and attributed value.","Separate client media spend from agency revenue and profit.","Align windows.","Inspect marginal performance before scaling.","Reconcile the operating statement, obligations, collections, reserve, available credit and runway before declaring the company safe."],terms:["cpl","epl","profit","agency profit","client media spend","operations cost","operating reserve","monthly operating statement","monthly operating obligations","runway","insolvency","retainer","payroll","attributed media margin","attribution gap","marginal mer","working capital","liquidity","receivables","receivable collections","receivable haircut","credit payment failure","affiliate pivot","outcome index","affiliate signal","validation","clawback"]},
  {id:"04",title:"Winner and anomaly lab",summary:"The most instructive rows are often the ones whose metrics disagree.",
    core:"A high click-through rate (CTR) can lose money. A low CTR can be profitable. The same creative can diverge across two ads because delivery context differs.",
    operator:"Trace each declared path from its denominator to its outcome before assigning a cause. In the four single-account challenges, click-to-lead conversion rate and the landing-page diagnostic are parallel branches after the ad click.",
    advanced:"Treat creative, placement, audience, account learning, event-source quality, downstream lead fit, and downstream acceptance as competing hypotheses. Front-end efficiency can rise while the acquired cohort becomes less usable.",
    checklist:["Predict before revealing the answer.","Find the first funnel break.","Check downstream fit separately from form volume.","List plausible confounders.","Choose the smallest isolating test."],terms:["ctr","funnel","placement","variance","downstream lead fit"]},
  {id:"05",title:"Hierarchy, navigation, and diagnostic order",summary:"Know which object is being observed or changed: account, campaign, group, ad, creative, keyword diagnostic, or measurement source.",
    core:"An ad carries creative. A campaign declares structure and objective. An account holds permissions, billing, and delivery history. In paid search, Quality Score is a keyword-level diagnostic assembled from expected click-through rate (CTR), ad relevance, and landing page experience.",
    operator:"Widen thin date windows, preserve reporting configuration, and trace the relevant evidence path with its declared denominator before editing live delivery. Inspect wasted clicks and the weak Quality Score component before deciding whether exclusions, copy, destination, bid, or auction rank should change; a larger bid does not improve the score.",
    advanced:"Quality Score is neither a key performance indicator nor the literal auction-time input. A dedicated campaign and campaign delivery pacing change structural control, not ad quality. Reporting keys, event-source mappings, optimization sources and diagnostic scores may overlap operationally, but they are not interchangeable. Brand-keyword conquest can also capture demand another channel created.",
    checklist:["Name the object and scope.","Use a sufficient date window.","Inspect search terms and the three Quality Score components.","Separate rank, budget, and pacing constraints.","Record the current configuration."],terms:["ad","creative","campaign","dedicated campaign","campaign delivery pacing","pixel","event-source mapping","quality score","expected ctr","ad relevance","landing page experience","auction rank","wasted clicks","brand keyword conquest"]},
  {id:"06",title:"Metric and operations glossary",summary:"Build instant fluency without collapsing distinct metrics or operational objects into one another.",
    core:"Cost per thousand impressions (CPM) buys exposure, click-through rate (CTR) measures response, conversion rate (CVR) measures progression, cost per lead (CPL) measures acquisition cost, and earnings or value per lead (EPL) measures downstream value.",
    operator:"Definitions must state the denominator, scope, window, and cost base. Operational labels should name the actual object.",
    advanced:"Reported, modeled, settled, and attributed values can all be internally consistent while answering different questions. Attribution-claim uncertainty should be stated, and a view-through audit can narrow future uncertainty without manufacturing historical certainty.",
    checklist:["State the denominator.","State the window.","State modeled or reported.","State media-only or all-in cost.","Name material claim uncertainty."],terms:["cpm","ctr","cvr","modeled outcome","attribution claim uncertainty","attribution view-through audit"]},
  {id:"07",title:"Transferable creative patterns",summary:"Use recurring structural patterns as prompts for original work, not as permission to copy executions.",
    core:"Proof, specificity, life events, native treatment, and reusable format matrices are durable patterns. A historical Expanded Text Ad is one period-specific search format, not a promise about current creation controls.",
    operator:"Pitch the hook, mechanic, multiplication plan, lane fit, and compliance check together.",
    advanced:"A pattern transfers only when audience intent, placement, economics, rights, and downstream acceptance remain compatible.",
    checklist:["Describe the transferable pattern.","Create an original execution.","Map formats and placements.","Verify rights and claims."],terms:["proof","native","expanded text ad","placement","compliance"]},
  {id:"08",title:"Questions for the account lead",summary:"Turn unknown account context and client preferences into explicit, testable questions instead of unsupported conclusions.",
    core:"Ask what the campaign is for, which baseline and campaign source of truth govern it, what constraints apply, and who owns the next decision. Treat the business context as a starting hypothesis, never a personality verdict. Monthly conversion pace is a projection — not a promise of the final total. A service cadence is the operating agreement for when the account needs attention.",
    operator:"During pressure, separate account facts from an observable client cue. Choose a communication stance — recommend, investigate, acknowledge, or set a boundary — then record what the reaction taught you. Convert the response into a working agreement with an owner, evidence check, and due point. Surface service debt before an overdue touch becomes a relationship surprise.",
    advanced:"Questions should distinguish among account and relationship hypotheses. Track results confidence, judgment, transparency, responsiveness and alignment separately from short-term tension. Account health measures operating condition, while client trust measures the relationship. Evidence and operational quality outrank stylistic fit; later behavior must verify each commitment. The client-retention line is a To The Moon rule, not a universal personality score. A client seat measures agency capacity, while platform ad accounts remain delivery objects inside that relationship.",
    checklist:["Prioritize three decision-changing questions.","Confirm the source, pace window and goal.","Label the business prior as uncertain.","Check the service cadence and any service debt.","Compare focus demand with team capacity before promising more.","Record the reaction and update the Client Read.","Close or renegotiate every commitment."],terms:["intake","baseline","monthly conversion pace","campaign source of truth","business prior","client trust","account health","trust dimensions","client tension","communication stance","client insight","client read","working agreement","commitment","client retention line","relationship risk","client seat","service cadence","service debt","focus units","capacity utilization","sprawl penalty"]},
  {id:"09",title:"Practice drills",summary:"Prediction, reveal, and replay build judgment faster than passive reading.",
    core:"Guess the outcome before seeing it, identify the funnel break, and explain the result after the reveal.",
    operator:"Use same-seed races, multiplication drills, compliance landmines, concept drafts, and short exit tickets.",
    advanced:"Keep scoring tied to calibration and causal reasoning, not trivia recall or visual taste. State a test stop rule before looking at the outcome, and distinguish causal test evidence from a coincidental before-and-after move.",
    checklist:["Commit to a prediction.","Define the stop rule.","Reveal only after answering.","Explain the miss.","Replay with one changed decision."],terms:["seed","recall","noise","creative test","test stop rule","causal test evidence"]},
  {id:"10",title:"Guided progression",summary:"Move from vocabulary to diagnosis, production, and independent decision-making in staged practice.",
    core:"Learn the language and map first, then read the funnel, build concepts, and finally close the loop on live-style outcomes.",
    operator:"Track what moved, propose why, compare that theory with the account lead, and preserve the differences as learning evidence.",
    advanced:"Progress is demonstrated by independent diagnosis and explicit uncertainty — not by memorizing a fixed benchmark.",
    checklist:["Reproduce core metrics.","Diagnose a funnel break.","Pitch a scalable concept.","Track and revise the verdict."],terms:["learning","decision window","funnel","matrix"]},
  {id:"11",title:"Compliance, claims, and asset rights",summary:"Creative sourcing includes rights, brands, people, claims, and jurisdiction-specific review.",
    core:"Inspect every asset before it enters a concept. A strong hook does not override rights or claim boundaries. In Agency Career, compliance heat is a pressure score; lower is safer.",
    operator:"Check license, visible marks, recognizable people, promise language, price framing, and required disclosures.",
    advanced:"Compliance review, platform policy, account status and asset rights are separate gates with different remedies. Compliance heat can raise delivery-review and clawback risk, but it is not the same as compliance health or a platform account status.",
    checklist:["Verify usage rights.","Scan every frame for marks and people.","Qualify claims.","Escalate uncertainty before shipping."],terms:["compliance","compliance health","compliance heat","approval","account hold","creative pipeline"]},
  {id:"12",title:"Practice, debrief and replay",summary:"Use a first attempt, prediction, debrief, linked reading and same-scenario replay to turn mistakes into durable judgment.",
    core:"Play once without coaching, inspect the behavior-based debrief, learn the relevant lesson, and replay the same conditions.",
    operator:"After clearing a known seed, move to a new seed and explain the first three decisions aloud.",
    advanced:"A fixed seed controls simulated uncertainty only under the same configuration. Strategy comparisons still require aligned windows and state. Training XP is a persistent learning record across runs. It can guide practice, but it never changes simulation delivery, random outcomes, economics, win conditions or challenge scores. Agency Capability Points are different: They are spendable resources inside one Agency Career save and can unlock career mechanics.",
    checklist:["Run cold.","Read the linked debrief.","Replay the same seed.","Review Training Progress separately from campaign results.","Prove transfer on a new seed."],terms:["seed","variance","debrief","decision window","training xp","agency capability points"]}
]);

/* Canonical glossary routing for the Specialist Account Playbook. These IDs describe
   the specialist curriculum, whose numbering and subject order intentionally differ
   from the general Field Guide. Keep every canonical LORE key represented once. */
const SPECIALIST_PLAYBOOK_BY_TERM=Object.freeze({
  // 00 · mission, intent, and boundaries
  "objective":"00",
  "campaign intent":"00",
  "decision window":"00",
  "brand play":"00",
  "in-window":"00",

  // 01 · scalable concept systems
  "creative pipeline":"01",
  "offer":"01",
  "ad concept":"01",
  "concept":"01",
  "creative":"01",
  "asset":"01",
  "hook":"01",
  "mechanic":"01",
  "matrix":"01",
  "creative execution":"01",
  "production method":"01",
  "evidence scope":"01",
  "story ad":"01",
  "vsl":"01",
  "podcast creative":"01",
  "slideshow":"01",
  "veo creative":"01",
  "ugc interview":"01",
  "qvc-style demonstration":"01",
  "breaking-news treatment":"01",
  "news greenscreen":"01",
  "nat geo documentary":"01",
  "memes":"01",
  "voicemail creative":"01",
  "static":"01",
  "animation":"01",
  "branded creative":"01",
  "native long-copy":"01",
  "long-copy to video":"01",

  // 02 · controlled variation, rotation, and decay
  "creative test":"02",
  "a/b ad permutation":"02",
  "ad rotation":"02",
  "fresh capacity":"02",
  "creative scale pressure":"02",
  "lane capacity pressure":"02",
  "rapid-scale review risk":"02",
  "scaling":"02",
  "restate":"02",
  "recast":"02",
  "offer timing":"02",
  "creative rarity":"02",
  "common":"02",
  "epic":"02",
  "legendary":"02",
  "creative swap":"02",
  "fatigue":"02",
  "saturation":"02",
  "multiplication":"02",
  "axis":"02",
  "axes":"02",
  "cut":"02",
  "geo cut":"02",
  "demo":"02",
  "tail":"02",
  "decay":"02",
  "milking":"02",

  // 03 · unit economics, ledgers, cash timing, and portfolio gates
  "budget":"03",
  "allocation":"03",
  "media spend":"03",
  "operations cost":"03",
  "customer value":"03",
  "revenue":"03",
  "settled value":"03",
  "profit":"03",
  "agency profit":"03",
  "outcome index":"03",
  "validation":"03",
  "clawback":"03",
  "client media spend":"03",
  "operating reserve":"03",
  "monthly operating statement":"03",
  "monthly operating obligations":"03",
  "runway":"03",
  "insolvency":"03",
  "retainer":"03",
  "payroll":"03",
  "affiliate pivot":"03",
  "affiliate signal":"03",
  "modeled contribution":"03",
  "projected contribution":"03",
  "attributed media margin":"03",
  "cpc":"03",
  "settlement":"03",
  "settlement lag":"03",
  "unsettled":"03",
  "campaign budget":"03",
  "account roi":"03",
  "ad roi":"03",
  "all-in business roi":"03",
  "attributed media roi":"03",
  "modeled outcome":"03",
  "media cpl":"03",
  "reported media cpl":"03",
  "modeled outcome value":"03",
  "attributed value":"03",
  "modeled mer":"03",
  "blended modeled mer":"03",
  "blended mer":"03",
  "marginal mer":"03",
  "claimed roas":"03",
  "receivables":"03",
  "receivable collections":"03",
  "receivable haircut":"03",
  "credit line":"03",
  "credit limit":"03",
  "available credit":"03",
  "adjusted billed cost":"03",
  "cash":"03",
  "credit holds":"03",
  "working capital":"03",
  "credit payment failure":"03",
  "liquidity":"03",
  "concentration risk":"03",
  "platform concentration":"03",
  "advertiser concentration":"03",
  "resilience":"03",
  "contingency layer":"03",
  "acquisition gate":"03",
  "gate streak":"03",
  "band":"03",
  "cpa":"03",
  "roas":"03",
  "cpl":"03",
  "epl":"03",
  "roi":"03",

  // 04 · funnel diagnosis, lead quality, and conflicting evidence
  "lead":"04",
  "lead quality":"04",
  "acceptance criteria":"04",
  "downstream acceptance":"04",
  "downstream lead fit":"04",
  "conversion":"04",
  "click":"04",
  "modeled leads":"04",
  "reported lead":"04",
  "reported clicks":"04",
  "relevance":"04",
  "funnel":"04",
  "landing-page visit":"04",
  "on-page click":"04",
  "front end":"04",
  "lander":"04",
  "landing-page optimization":"04",
  "trap":"04",

  // 05 · object hierarchy, channel controls, and measurement plumbing
  "account":"05",
  "platform ad account":"05",
  "ad":"05",
  "ad set":"05",
  "platform":"05",
  "google ads search":"05",
  "google ads demand gen":"05",
  "google display / demand gen":"05",
  "microsoft advertising search":"05",
  "meta ads":"05",
  "tiktok ads":"05",
  "snapchat ads":"05",
  "linkedin campaign manager":"05",
  "agency headquarters":"05",
  "client headquarters":"05",
  "service area":"05",
  "target state":"05",
  "state targeting":"05",
  "account time zone":"05",
  "media market":"05",
  "traditional media":"05",
  "outdoor advertising":"05",
  "radio advertising":"05",
  "local cable television":"05",
  "paid search":"05",
  "search intent":"05",
  "ppc":"05",
  "paid social":"05",
  "programmatic":"05",
  "ctv":"05",
  "learning phase":"05",
  "account learning":"05",
  "slot":"05",
  "targeting":"05",
  "tracking":"05",
  "pixel":"05",
  "event source":"05",
  "event-source mapping":"05",
  "reporting key":"05",
  "attribution":"05",
  "event-source contamination":"05",
  "event-source cluster":"05",
  "signal integrity":"05",
  "attribution-control quality":"05",
  "business container":"05",
  "advertiser workstream":"05",
  "platform initiative":"05",
  "workstream mix":"05",
  "buying lane":"05",
  "delivery hierarchy":"05",
  "holding company":"05",
  "operating company":"05",
  "ops action":"05",
  "crisis":"05",
  "learning":"05",
  "algorithm":"05",
  "campaign":"05",
  "dedicated campaign":"05",
  "campaign delivery pacing":"05",
  "ad group":"05",
  "keyword":"05",
  "bid":"05",
  "match type":"05",
  "exact match":"05",
  "phrase match":"05",
  "broad match":"05",
  "negative keyword":"05",
  "search terms report":"05",
  "wasted clicks":"05",
  "quality score":"05",
  "expected ctr":"05",
  "ad relevance":"05",
  "landing page experience":"05",
  "avg position":"05",
  "max cpc":"05",
  "sis":"05",
  "impression share":"05",
  "query ceiling":"05",
  "sis lost to rank":"05",
  "sis lost to budget":"05",
  "auction rank":"05",
  "brand keyword conquest":"05",
  "accelerated delivery":"05",
  "standard delivery":"05",
  "native":"05",
  "demand gen":"05",
  "display":"05",
  "audience":"05",
  "vertical":"05",
  "broad":"05",

  // 06 · metric and reporting fluency
  "attribution gap":"06",
  "account view":"06",
  "ad view":"06",
  "attributed report":"06",
  "platform claims":"06",
  "cross-account claim":"06",
  "view-through":"06",
  "attribution view-through audit":"06",
  "attribution claim uncertainty":"06",
  "reach":"06",
  "cpm":"06",
  "ctr":"06",
  "cvr":"06",
  "lp ctr":"06",
  "impressions":"06",

  // 07 · transferable execution formats and placement patterns
  "creative format":"07",
  "static image":"07",
  "rendered scene":"07",
  "motion graphic":"07",
  "ugc video":"07",
  "founder / explainer":"07",
  "native display creative":"07",
  "input / ui utility":"07",
  "lifestyle static":"07",
  "ctv spot":"07",
  "search text / assets":"07",
  "expanded text ad":"07",
  "placement":"07",

  // 08 · discovery and account-lead questions
  "intake":"08",
  "monthly conversion pace":"08",
  "campaign source of truth":"08",
  "client trust":"08",
  "account health":"08",
  "trust dimensions":"08",
  "client insight":"08",
  "client read":"08",
  "client tension":"08",
  "communication stance":"08",
  "business prior":"08",
  "working agreement":"08",
  "commitment":"08",
  "relationship risk":"08",
  "client retention line":"08",
  "baseline":"08",
  "client seat":"08",
  "service cadence":"08",
  "service debt":"08",
  "focus units":"08",
  "capacity utilization":"08",
  "sprawl penalty":"08",

  // 09 · prediction, causal practice, and stopping rules
  "test stop rule":"09",
  "causal test evidence":"09",

  // 11 · claims, rights, policy, and review gates
  "approval":"11",
  "compliance hold":"11",
  "account hold":"11",
  "compliance":"11",
  "compliance health":"11",
  "compliance heat":"11",
  "review":"11",

  // 12 · seeded simulation, noise, and evidence protocol
  "demand index":"12",
  "noise":"12",
  "variance":"12",
  "seed":"12",
  "training xp":"12",
  "agency capability points":"10"
});

/* Every challenge mode with the modern engine gets a Mode 1-style verified action script.
   Each script runs on its own fixed seed so every verified action has a reliable result;
   the guided run turns probabilistic after the scripted window (see liveSeed in the engine). */
const TUTORIAL_SEEDS=Object.freeze({1:2601,2:2602,3:2603,4:2604,6:2606});
const TUTORIAL_DB=Object.freeze({
  version:2,
  modes:Object.freeze({
    2:Object.freeze([
      Object.freeze({id:"baseline",kind:"run",focus:"runBtn",lessonId:"06",title:"Create a clean Day 1 baseline",instruction:"Select Run Day 1 without changing a budget.",body:"To The Moon will spend today's budgets and record what the media earned. Watch the account strip: earned value moves today, but the cash line will not — collections land days later."}),
      Object.freeze({id:"lens",kind:"view",focus:"viewBtn",lessonId:"07",title:"Separate the platform's claim from modeled value",instruction:"In Account controls, select Lens: MODELED OUTCOME → attributed report.",body:"The account switches between modeled business value and the value the platform claims credit for. Neither number is cash in the bank. The lens changes the report you read, never what delivered."}),
      Object.freeze({id:"settle",kind:"run",focus:"runBtn",lessonId:"06",title:"Watch yesterday settle on a delay",instruction:"Select Run Day 2.",body:"Most of Day 1's earned value settles two days out, and the rest a day later. A day with strong delivery and weak cash is normal here — a payment on its way is not a failed campaign."}),
      Object.freeze({id:"allocate",kind:"slot",action:"plus",target:"best",focus:"slots",lessonId:"03",title:"Fund the strongest ad with open eyes",instruction:"On the highlighted strongest ad, select {budgetIncrease} once.",body:"The increase spends real cash tomorrow while its revenue arrives days later. Working capital exists to pay for the gap between those two clocks."}),
      Object.freeze({id:"window",kind:"run",focus:"runBtn",lessonId:"06",title:"Run the day and read both clocks",instruction:"Select Run Day 3.",body:"After Day 3, the guided opening ends and the full account opens. Judge every future day twice: what did the media earn, and what actually landed as cash?"})
    ]),
    3:Object.freeze([
      Object.freeze({id:"commission",kind:"creative_request",format:"static",focus:"pipeBox",lessonId:"01",title:"Order the replacement before you need it",instruction:"In Creative lab, keep Static selected, review the blueprint, then choose Continue with this blueprint.",body:"Builds take two to four days, and compliance can still request a revision or reject the work. A live ad without an approved replacement behind it is an operations failure waiting for a date."}),
      Object.freeze({id:"baseline",kind:"run",focus:"runBtn",lessonId:"05",title:"Run Day 1 while the build moves",instruction:"Select Run Day 1.",body:"Delivery and production advance on the same clock. Today's spend earns value while the requested build moves through production."}),
      Object.freeze({id:"progress",kind:"run",focus:"runBtn",lessonId:"01",title:"Give production another day",instruction:"Select Run Day 2.",body:"Watch the production panel: the build is aging toward review. Fatigue on the live ads keeps climbing whether or not the replacement is ready."}),
      Object.freeze({id:"approval",kind:"run",focus:"runBtn",lessonId:"01",title:"Wait out the review gate",instruction:"Select Run Day 3.",body:"Compliance can approve, request a revision or reject. The pipeline's job is to make sure a rejection costs you one build instead of a live delivery slot."}),
      Object.freeze({id:"swap",kind:"creative_swap",target:"tired",focus:"slots",lessonId:"04",title:"Put the approved build into the tired ad",instruction:"On the most fatigued ad, select Replace creative, then choose the new Static creative.",body:"The ad slot and its budget stay in place; only the message changes. Replacing creative resets fatigue — it does not reset audience saturation."}),
      Object.freeze({id:"window",kind:"run",focus:"runBtn",lessonId:"05",title:"Measure the swap",instruction:"Select Run Day 4.",body:"After Day 4, the guided opening ends and the full account opens. Keep one approved replacement ahead of every fatiguing slot and the pipeline stays a system instead of an emergency."})
    ]),
    6:Object.freeze([
      Object.freeze({id:"baseline",kind:"run",focus:"runBtn",lessonId:"05",title:"Run the first day and see what the media bought",instruction:"Select Run day 1.",body:"You have one client and a media budget. Nothing improves until the media actually runs. The day report will show what the money bought: impressions, clicks, outcomes and the cost of each one."}),
      Object.freeze({id:"read",kind:"agency_inspect",focus:"slots",lessonId:"06",title:"Read the campaign against the client's target",instruction:"On the client card, open the campaign results panel.",body:"Every client's card carries the cost per outcome the client can afford, and what yesterday actually cost. That gap is the whole job: everything else you touch is a way to close it."}),
      Object.freeze({id:"platform",kind:"agency_platform",platform:"microsoft_search",focus:"slots",lessonId:"03",title:"Move the media somewhere cheaper",instruction:"In Buy media for this campaign, select Move to Microsoft.",body:"The same money buys different amounts of attention on different platforms. Microsoft's clicks cost less against a smaller pool of searches. The account gives back a few points while delivery relearns."}),
      Object.freeze({id:"compare",kind:"run",focus:"runBtn",lessonId:"05",title:"Run the day and compare",instruction:"Select Run day 2.",body:"The results table marks the day your change landed, so you can read what the move actually bought instead of guessing."}),
      Object.freeze({id:"service",kind:"agency_action",action:"service",focus:"slots",lessonId:"08",title:"Service the account before it drifts",instruction:"On the client card, select Optimize the account.",body:"Media performance and the client relationship are different scoreboards. Servicing the account raises its operating health and resets the service clock; it does not, on its own, make the client trust you."}),
      Object.freeze({id:"window",kind:"run",focus:"runBtn",lessonId:"06",title:"Close the third day",instruction:"Select Run day 3.",body:"After Day 3 the walkthrough ends and the full company opens: hiring, capabilities, prospective clients and the deeper campaign layers. The fixed teaching scenario ends here too — from Day 4 the career runs on live conditions."})
    ]),
    4:Object.freeze([
      Object.freeze({id:"baseline",kind:"run",focus:"runBtn",lessonId:"05",title:"Run Day 1 across all four lanes",instruction:"Select Run Day 1 without changing a budget.",body:"Each platform lane buys different attention at different costs with different reporting confidence. One unchanged day gives every lane comparable evidence."}),
      Object.freeze({id:"lens",kind:"view",focus:"viewBtn",lessonId:"07",title:"Check how each lane reports",instruction:"In Account controls, select Lens: MODELED OUTCOME → attributed report.",body:"Lanes disagree with the modeled ledger by different amounts — search claims conservatively while view-through lanes claim generously. The lens changes the story, not the delivery."}),
      Object.freeze({id:"trim",kind:"slot",action:"minus",target:"worst",focus:"slots",lessonId:"03",title:"Take one step out of the weakest lane",instruction:"On the highlighted weakest ad, select the minus-budget control once.",body:"A small reallocation is a test you can read tomorrow. Cutting the lane to zero would be a conclusion, and the evidence so far only supports a trim."}),
      Object.freeze({id:"fund",kind:"slot",action:"plus",target:"best",focus:"slots",lessonId:"03",title:"Move that budget where response is strongest",instruction:"On the highlighted strongest ad, select {budgetIncrease} once.",body:"The account wins at the account level. Budget should follow capacity that still has demand, not the single best number from yesterday."}),
      Object.freeze({id:"window",kind:"run",focus:"runBtn",lessonId:"05",title:"Run the reallocated day",instruction:"Select Run Day 2.",body:"After Day 2, the guided opening ends and the full account opens. Compare lanes over matched windows before every future move; the objective is 25% all-in ROI across the whole account."})
    ])
  }),
  actions:Object.freeze([
    Object.freeze({id:"baseline",kind:"run",focus:"runBtn",lessonId:"05",title:"Create a clean Day 1 baseline",instruction:"Select Run Day 1 without changing a budget.",body:"To The Moon will spend the current budgets and show the first results. Use Day 1 as a reference point, not proof of a trend."}),
    Object.freeze({id:"lens",kind:"view",focus:"viewBtn",lessonId:"04",title:"See what the reporting view changes",instruction:"In Account controls, select Lens: MODELED OUTCOME → attributed report.",body:"The account will switch from modeled business value to value credited by the platform. This changes the report, not ad delivery."}),
    Object.freeze({id:"ask",kind:"slot",action:"ask",target:"brand",focus:"slots",lessonId:"00",title:"Find out what the reach ad should do",instruction:"On the reach ad, select Ask what this ad should do.",body:"To The Moon will reveal why the advertiser funded this ad. A negative short-term result can be acceptable when the goal is reach or learning instead of immediate return."}),
    Object.freeze({id:"multiply",kind:"slot",action:"mult",target:"utility",focus:"slots",lessonId:"02",title:"Create one controlled variation",instruction:"On the Bill Screenshot ad, select Create one controlled variation.",body:"The game will vary one part of a proven idea, refresh its fatigue and preserve the original concept. This is a variation, not a new concept."}),
    Object.freeze({id:"request",kind:"creative_request",format:"static",focus:"pipeBox",lessonId:"01",title:"Create one Static test",instruction:"In Creative lab, keep Static selected, review the concept and production method, then choose Continue with this blueprint.",body:"The blueprint separates the concept (why the ad may persuade), the Static execution (how it appears), and the production method (how it is made). Rarity is rolled only after the blueprint is submitted."}),
    Object.freeze({id:"swap",kind:"creative_swap",target:"trap",focus:"slots",lessonId:"04",title:"Put the new creative into an active ad",instruction:"On Mobile broad — screenshot ad, select Replace creative, then choose the new Static creative.",body:"The account, campaign and ad slot will stay in place. Only the creative shown by that ad will change."}),
    Object.freeze({id:"comparison",kind:"run",focus:"runBtn",lessonId:"04",title:"Measure the next day",instruction:"Select Run Day 2.",body:"To The Moon will show the replacement creative's Day 2 result beside the Day 1 baseline. That is one comparison, not proof that the swap caused every difference."}),
    Object.freeze({id:"allocate",kind:"slot",action:"plus",target:"best",focus:"slots",lessonId:"03",title:"Make one small budget increase",instruction:"On the highlighted strongest ad, select {budgetIncrease} once.",body:"The next day will give that ad one more budget step. A small increase is easier to evaluate than a large jump, but it still does not guarantee the same return."}),
    Object.freeze({id:"window",kind:"run",focus:"runBtn",lessonId:"05",title:"Add a third observation",instruction:"Select Run Day 3.",body:"After Day 3, the guided opening will end and the full account will open. Three days give you more evidence, but they still do not prove a trend."})
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
  Object.freeze({id:"nav",label:"Meaningful navigation",files:Object.freeze(["assets/audio/lunar_nav_a.ogg","assets/audio/lunar_nav_b.ogg","assets/audio/lunar_nav_c.ogg"]),channel:"ui",priority:10,cooldown:140,gain:.24}),
  Object.freeze({id:"open",label:"Open a major panel",files:Object.freeze(["assets/audio/lunar_open.ogg"]),channel:"ui",priority:14,cooldown:180,gain:.34}),
  Object.freeze({id:"close",label:"Leave a panel",files:Object.freeze(["assets/audio/lunar_close.ogg"]),channel:"ui",priority:14,cooldown:160,gain:.30}),
  Object.freeze({id:"confirm",label:"Commit a major choice",files:Object.freeze(["assets/audio/lunar_confirm.ogg"]),channel:"ui",priority:20,cooldown:180,gain:.42}),
  Object.freeze({id:"day",label:"Run the next day",files:Object.freeze(["assets/audio/lunar_day_a.ogg","assets/audio/lunar_day_b.ogg"]),channel:"turn",priority:45,cooldown:650,gain:.62,resultDelay:720}),
  Object.freeze({id:"settle",label:"Operation settled",files:Object.freeze(["assets/audio/lunar_settle.ogg"]),channel:"action",priority:30,cooldown:220,gain:.44}),
  Object.freeze({id:"save",label:"Checkpoint saved",files:Object.freeze(["assets/audio/lunar_save.ogg"]),channel:"action",priority:32,cooldown:300,gain:.42}),
  Object.freeze({id:"profit",label:"Profitable result",files:Object.freeze(["assets/audio/lunar_profit_a.ogg","assets/audio/lunar_profit_b.ogg"]),channel:"result",priority:60,cooldown:750,gain:.68}),
  Object.freeze({id:"creative",label:"Creative ready",files:Object.freeze(["assets/audio/lunar_creative_a.ogg","assets/audio/lunar_creative_b.ogg"]),channel:"result",priority:55,cooldown:500,gain:.52}),
  Object.freeze({id:"swap",label:"Creative shipped",files:Object.freeze(["assets/audio/lunar_swap.ogg"]),channel:"result",priority:58,cooldown:500,gain:.56}),
  Object.freeze({id:"correct",label:"Correct answer",files:Object.freeze(["assets/audio/lunar_correct.ogg"]),channel:"answer",priority:62,cooldown:350,gain:.62}),
  Object.freeze({id:"wrong",label:"Answer needs another look",files:Object.freeze(["assets/audio/lunar_wrong.ogg"]),channel:"answer",priority:48,cooldown:350,gain:.42}),
  Object.freeze({id:"warning",label:"Warning",files:Object.freeze(["assets/audio/lunar_warning.ogg"]),channel:"alert",priority:70,cooldown:500,gain:.50}),
  Object.freeze({id:"crisis",label:"Critical incident",files:Object.freeze(["assets/audio/lunar_crisis.ogg"]),channel:"alert",priority:85,cooldown:900,gain:.66}),
  Object.freeze({id:"epic",label:"Epic creative",files:Object.freeze(["assets/audio/lunar_epic.ogg"]),channel:"milestone",priority:76,cooldown:900,gain:.68}),
  Object.freeze({id:"legendary",label:"Legendary result",files:Object.freeze(["assets/audio/lunar_legendary.ogg"]),channel:"milestone",priority:90,cooldown:1300,gain:.78}),
  Object.freeze({id:"victory",label:"Run victory",files:Object.freeze(["assets/audio/lunar_victory_cash.ogg?v=35"]),channel:"milestone",priority:100,cooldown:1800,gain:.84}),
  Object.freeze({id:"failure",label:"Run failure",files:Object.freeze(["assets/audio/lunar_failure.ogg"]),channel:"milestone",priority:95,cooldown:1200,gain:.72})
]);

/* RENDER MUST NOT DIE ON A MISSING NODE (2026-08-10).
   Thirty-seven call sites did document.getElementById("x").textContent = value directly. If any
   one of those elements was absent the whole render threw, and because the render is what draws
   the board, the result was a blank app still showing the previous mode's chrome -- a JavaScript
   error in the console and nothing on screen. That is a bad trade: one missing label should cost
   that label, not the entire screen. Writes go through here now; a missing node is a no-op. */
function setNodeText(id,value){
  var node=typeof document!=="undefined"&&document.getElementById?document.getElementById(id):null;
  if(!node)return false;
  node.textContent=value;
  return true;
}
if(typeof window!=="undefined")window.setNodeText=setNodeText;
