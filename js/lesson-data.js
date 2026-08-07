"use strict";

/* The Field Guide chapters in knowledge-data.js remain the long-form reference source.
   These modules turn each chapter into a short teaching sequence with a concrete case,
   a worked example and a commit-before-reveal check. Keep this file free of simulation
   state so opening a lesson can never consume RNG or change a run. */
const LESSON_PATHS=Object.freeze([
  Object.freeze({id:"fundamentals",title:"Start with the account",copy:"Learn what the work is trying to accomplish, follow the funnel and read the scoreboards.",lessons:Object.freeze(["03","04","06","05"])}),
  Object.freeze({id:"buying",title:"Build and buy media",copy:"Separate creative layers, manage fatigue and use the controls that fit each channel.",lessons:Object.freeze(["01","02","09","07"])}),
  Object.freeze({id:"operations",title:"Manage the work",copy:"Handle client decisions, account structure, capacity, rights and review.",lessons:Object.freeze(["08","10","11"])})
]);

const SPECIALIST_LESSON_META=Object.freeze({
  "00":Object.freeze({
    outcome:"State the campaign objective, evidence window and decision rights before you judge the result.",
    title:"The report is open, but the assignment is missing",
    body:"A campaign is losing money in the current report. No one has written down whether its job is immediate acquisition, learning or demand creation.",
    facts:Object.freeze(["The dashboard shows performance, not intent.","The decision window is unknown.","The buyer's authority to change the campaign is unclear."]),
    example:"Write the objective, source of truth, review window and owned controls before recommending a change.",questionId:"account-two-scoreboards"}),
  "01":Object.freeze({
    outcome:"Separate a creative concept from its mechanic and assets, then judge whether the idea has room to scale.",
    title:"One winner has nowhere to go",
    body:"A strong video has one finished file, no named mechanic and no planned variation axes. The account needs more creative next week.",
    facts:Object.freeze(["The asset performs now.","Its repeatable mechanism is undocumented.","Production has no clear sibling brief."]),
    example:"Name the core idea and repeatable device, then list the formats, hooks and audiences that can vary without replacing the concept.",questionId:"creative-rewrite-variation"}),
  "02":Object.freeze({
    outcome:"Design a controlled creative variation that changes one declared axis and preserves a readable comparison.",
    title:"Four new ads change everything at once",
    body:"The proposed variants use new hooks, formats, offers and audiences. Variant B wins, but the source of the lift is still unknown. It could be the hook, format, offer or audience.",
    facts:Object.freeze(["The current concept has evidence.","Each proposed asset changes several variables.","The goal of the test is learning, not volume alone."]),
    example:"Hold the concept, audience and offer steady. Change one hook or format, name that axis and compare sibling results in the same window.",questionId:"social-fatigue"}),
  "03":Object.freeze({
    outcome:"Read acquisition cost, downstream value, profit, return and cash without merging their ledgers.",
    title:"The account is profitable but cannot pay today",
    body:"Modeled value is above cost, client payment is still pending and the platform bill is due. The performance report and bank balance tell different stories.",
    facts:Object.freeze(["Value has been earned.","Cash has not settled.","The platform charge still consumes liquidity."]),
    example:"Calculate acquisition cost and value first, subtract the stated costs for profit, then check receivables, cash and available credit separately.",questionId:"finance-profit-cash"}),
  "04":Object.freeze({
    outcome:"Investigate a winner or anomaly by tracing where its metrics disagree before you copy or cut it.",
    title:"The strongest row has an impossible click rate",
    body:"One row reports extraordinary clicks, weak landing visits and ordinary business outcomes. The headline result looks attractive, but the path does not reconcile.",
    facts:Object.freeze(["The row may be a real winner.","It may also contain bot traffic or broken tracking.","The downstream ledger is less extreme than the click report."]),
    example:"Trace the row from impression through settled outcome, compare it with sibling rows and label the anomaly before changing delivery.",questionId:"measurement-claims"}),
  "05":Object.freeze({
    outcome:"Locate the account, campaign, ad group, ad, creative and event source before you change the wrong layer.",
    title:"A creative problem is being treated like an account problem",
    body:"One ad is weak. The proposed fix is to move the whole client to another platform account and pixel before checking the ad or creative.",
    facts:Object.freeze(["The weakness appears in one delivery object.","The account and event source affect many other objects.","A broad migration would introduce new variables."]),
    example:"Start at the business outcome, follow the hierarchy to the smallest broken object and use the control owned by that layer.",questionId:"account-ad-creative"}),
  "06":Object.freeze({
    outcome:"Read a metric by its numerator, denominator, scope and decision use before you act on it.",
    title:"A high Quality Score is being treated as profit",
    body:"A search keyword has strong relevance diagnostics but poor business economics. The team is using one healthy diagnostic as the verdict for the entire account.",
    facts:Object.freeze(["Quality Score describes auction relevance signals.","Profit requires value and costs.","The two measures can move independently."]),
    example:"Name what the metric measures, what changes it and where its effect should appear. Then pair it with the business outcome needed for the decision.",questionId:"search-quality-components"}),
  "07":Object.freeze({
    outcome:"Turn a useful creative pattern into an original, traceable execution without copying the source asset.",
    title:"A competitor's ad is being used as a production brief",
    body:"The team likes a proof-heavy native ad and wants to recreate its scenes, wording and visual arrangement. The transferable lesson has not been separated from the execution.",
    facts:Object.freeze(["Proof is a reusable pattern.","The source execution belongs to someone else.","The new audience and placement may need a different treatment."]),
    example:"Describe the hook, proof mechanism and placement fit in plain terms. Build a new execution from owned evidence and record its own version lineage.",questionId:"creative-rewrite-variation"}),
  "08":Object.freeze({
    outcome:"Ask the account lead the few questions that can change the next decision, then record a checkable commitment.",
    title:"The dashboard cannot explain the client's quality concern",
    body:"Lead volume is steady, but the client reports fewer useful conversations. The definition of a qualified lead and the source-of-truth report are unclear.",
    facts:Object.freeze(["The concern may be downstream of the ad click.","The acceptance rule is unknown.","A response is due before the cause is proven."]),
    example:"Confirm the objective, quality definition, baseline and source of truth. Then name the next test, owner and follow-up date.",questionId:"client-quality-diagnosis"}),
  "09":Object.freeze({
    outcome:"Use prediction, reveal and same-scenario replay to turn a missed decision into usable judgment.",
    title:"The answer is visible before the prediction",
    body:"A practice drill shows the result and explanation before the learner commits. The learner can repeat the words but never tests a decision.",
    facts:Object.freeze(["No prediction was recorded.","The reveal cannot measure calibration.","A replay has no declared change to compare."]),
    example:"State the prediction and stop rule first. Reveal the outcome, explain the miss and replay the same scenario with one changed decision.",questionId:""}),
  "10":Object.freeze({
    outcome:"Move from vocabulary to guided diagnosis and then to an independent account decision with stated uncertainty.",
    title:"A new buyer can name the metrics but cannot choose a move",
    body:"The learner recognizes funnel terms and formulas. When the account breaks, every control still looks equally plausible.",
    facts:Object.freeze(["Vocabulary recall is present.","Diagnostic order is not yet demonstrated.","The next practice step should require a decision."]),
    example:"Practice the map, diagnose one known break with coaching, then repeat on a new scenario and explain the first three decisions aloud.",questionId:""}),
  "11":Object.freeze({
    outcome:"Identify the rights, claim and policy checks an asset needs before it enters live delivery.",
    title:"A high-potential asset has no documented rights",
    body:"A video contains a recognizable person, a third-party mark and an unsupported savings promise. The current winner may fatigue before review is complete.",
    facts:Object.freeze(["Performance potential is not usage permission.","The claim needs support.","The account still needs a reviewed replacement path."]),
    example:"Hold the unresolved asset, verify each rights and claim issue, and prepare a compliant alternate while review continues.",questionId:""}),
  "12":Object.freeze({
    outcome:"Use a cold attempt, debrief, linked lesson and controlled replay to prove that a better decision transfers.",
    title:"A completed run ends without a learning loop",
    body:"The learner sees the score, starts a different seed and cannot tell which earlier decision should change. The next run adds uncertainty before the first lesson is settled.",
    facts:Object.freeze(["The original decision sequence is available.","The same seed can hold scenario uncertainty steady.","A new seed should come after the replay."]),
    example:"Run cold, inspect the behavior-based debrief, study the linked concept and replay the same setup with one deliberate change.",questionId:""})
});

const LESSON_MODULES=Object.freeze({
  "01":Object.freeze({
    id:"01",category:"Buying and creative",minutes:4,discipline:"creative",
    outcome:"Tell a concept, a mechanic and an asset apart, then change one variable without losing the original idea.",
    situation:Object.freeze({
      title:"The team calls every file a new idea",
      body:"A voicemail-style ad is producing strong leads. The team has a vertical video, a square cut and a static transcript. Someone reports that the account now has three winning concepts.",
      facts:Object.freeze(["All three files use the same missed-call premise.","All three use the same voicemail interface.","Only the format and crop changed."])
    }),
    concept:Object.freeze({
      title:"Name the layer before you test it",
      body:"The concept is the central idea. The mechanic is the repeatable way the idea is expressed. The asset is one finished file that can run as creative.",
      contrasts:Object.freeze([
        Object.freeze({label:"Concept",value:"A missed call contains useful advice."}),
        Object.freeze({label:"Mechanic",value:"A voicemail interface delivers the message."}),
        Object.freeze({label:"Asset",value:"One 15-second vertical video with a specific opening line."})
      ])
    }),
    example:Object.freeze({
      title:"Test the opening hook without rebuilding the ad",
      setup:"The current asset opens with: \"You missed the one call that could lower your bill.\" You want to learn whether a more direct opening earns more attention.",
      steps:Object.freeze(["Keep the concept, audience, offer and format unchanged.","Write one new opening line.","Run the two assets as named siblings and compare the same measurement window."]),
      outcome:"If performance changes, the hook is the main planned difference. The test can teach you something useful."
    }),
    check:Object.freeze({
      id:"lesson-01-clean-axis",prompt:"Which test gives the clearest answer about the opening hook?",answer:1,
      choices:Object.freeze([
        Object.freeze({text:"Change the hook, offer, audience and video length together.",feedback:"Too many things changed. A result would not tell you which change mattered."}),
        Object.freeze({text:"Keep the concept and setup, then change only the opening line.",feedback:"This isolates the hook while preserving the winning idea."}),
        Object.freeze({text:"Raise the budget on the current file.",feedback:"A budget change tests delivery scale, not the hook."}),
        Object.freeze({text:"Duplicate the exact file under a new name.",feedback:"A new name does not create a meaningful variation."})
      ]),
      why:"A controlled variation preserves the winning system and changes one declared axis. That makes the result easier to interpret."
    }),
    application:Object.freeze({title:"Use this in Creative Operations",mode:"Creative Operations",body:"When you request new work, name the concept, mechanic and one changed axis before production begins.",steps:Object.freeze(["Label the concept.","Name the mechanic.","Record the one variable each sibling changes."])}),
    terms:Object.freeze(["concept","mechanic","creative","asset","axis"])
  }),
  "02":Object.freeze({
    id:"02",category:"Buying and creative",minutes:4,discipline:"social",
    outcome:"Distinguish creative fatigue from audience saturation and choose the remedy that fits the evidence.",
    situation:Object.freeze({
      title:"One ad is fading, but the lane is not",
      body:"A proven social ad fell from a 3.1% click-through rate to 1.4% after repeated delivery. A fresh sibling in the same audience is still near 3%. Cost per thousand impressions is steady.",
      facts:Object.freeze(["The older asset lost attention.","The fresh sibling still works.","Auction cost did not rise across the lane."])
    }),
    concept:Object.freeze({
      title:"Fatigue and saturation leave different fingerprints",
      body:"Fatigue is wear on a particular creative. Saturation is pressure on the reachable audience or inventory. A fresh asset can repair fatigue. It cannot create more audience capacity.",
      contrasts:Object.freeze([
        Object.freeze({label:"Fatigue",value:"The old asset weakens while fresh creative still performs."}),
        Object.freeze({label:"Saturation",value:"Costs or response weaken across several fresh assets in the same lane."})
      ])
    }),
    example:Object.freeze({
      title:"Use a prepared replacement",
      setup:"The live winner is at 82% fatigue. A reviewed sibling is ready and has not spent yet.",
      steps:Object.freeze(["Keep the exhausted winner's history intact.","Swap the reviewed sibling into delivery.","Watch whether attention recovers before changing the audience or budget."]),
      outcome:"A recovery points toward creative fatigue. Weak performance across both assets points toward a wider lane problem."
    }),
    check:Object.freeze({
      id:"lesson-02-fatigue",prompt:"What is the strongest first move in this case?",answer:2,
      choices:Object.freeze([
        Object.freeze({text:"Double the lane budget immediately.",feedback:"More spend can accelerate the decline before you know what is broken."}),
        Object.freeze({text:"Replace the pixel.",feedback:"The evidence describes attention decay, not a reporting failure."}),
        Object.freeze({text:"Swap in the prepared sibling and compare its response.",feedback:"A fresh sibling tests whether the problem belongs to the old creative."}),
        Object.freeze({text:"Pause every campaign in the account.",feedback:"The evidence is local to one creative. An accountwide pause is too broad."})
      ]),
      why:"Use the smallest change that tests the diagnosis. Fresh creative is the direct test for fatigue."
    }),
    application:Object.freeze({title:"Use this before an ad burns out",mode:"Creative Operations",body:"Compare production lead time with remaining creative life. Request the replacement before the gap opens.",steps:Object.freeze(["Check fatigue.","Check whether fresh siblings still work.","Keep one reviewed replacement ready."])}),
    terms:Object.freeze(["fatigue","saturation","creative swap","fresh capacity","scaling"])
  }),
  "03":Object.freeze({
    id:"03",category:"Fundamentals",minutes:4,discipline:"account",
    outcome:"Choose the scoreboard that matches the campaign's declared job and decision window.",
    situation:Object.freeze({
      title:"The immediate return is weak on purpose",
      body:"A campaign was approved to create demand before a seasonal launch. Its seven-day attributed return is low, but branded searches and assisted visits are rising. The agreed review window is 30 days.",
      facts:Object.freeze(["The campaign's job is demand creation.","The short report does not cover the full review window.","Downstream signals are moving before final sales settle."])
    }),
    concept:Object.freeze({
      title:"Purpose comes before performance",
      body:"A metric only answers a useful question when the objective, scope, cost base and time window are clear. A learning or demand campaign should not be judged as if its only job were same-day profit.",
      contrasts:Object.freeze([
        Object.freeze({label:"Objective",value:"What the spend is supposed to accomplish."}),
        Object.freeze({label:"Window",value:"How long the agreed outcome needs to appear."}),
        Object.freeze({label:"Scoreboard",value:"The measurement that can answer that objective."})
      ])
    }),
    example:Object.freeze({
      title:"Write the decision before opening the report",
      setup:"The question is whether the campaign is creating qualified demand by Day 30.",
      steps:Object.freeze(["Write the objective in one sentence.","Name the 30-day window and the downstream signals.","Use short-window return as a warning signal, not the final verdict."]),
      outcome:"The team can still set loss limits, but it no longer mistakes an incomplete report for the whole assignment."
    }),
    check:Object.freeze({
      id:"lesson-03-purpose",prompt:"Which review follows the campaign's actual assignment?",answer:0,
      choices:Object.freeze([
        Object.freeze({text:"Review demand signals through Day 30, while enforcing the agreed loss limit.",feedback:"This matches the objective and still protects the account."}),
        Object.freeze({text:"Stop it because seven-day attributed return is below the profit target.",feedback:"That applies the wrong objective and an incomplete window."}),
        Object.freeze({text:"Ignore every financial result because it is a brand campaign.",feedback:"A different objective does not remove cost controls or accountability."}),
        Object.freeze({text:"Use click-through rate as the only measure of success.",feedback:"Attention can support diagnosis, but it does not prove qualified demand."})
      ]),
      why:"Judge the work against the job it was funded to do, using the window and safeguards agreed before launch."
    }),
    application:Object.freeze({title:"Use this before changing a campaign",mode:"Closed-Loop Account",body:"State the objective and evaluation window before you read a green or red result.",steps:Object.freeze(["Name the job.","Name the window.","Name the cost base and stop condition."])}),
    terms:Object.freeze(["objective","campaign intent","decision window","account roi","ad roi"])
  }),
  "04":Object.freeze({
    id:"04",category:"Fundamentals",minutes:5,discipline:"account",
    outcome:"Find the first broken step in a funnel and choose a fix at that same layer.",
    situation:Object.freeze({
      title:"The ad still earns clicks, but leads fall",
      body:"Cost per thousand impressions and click-through rate remain near their normal ranges. Landing-page actions fell from 28% to 11%, and click-to-lead conversion fell with them.",
      facts:Object.freeze(["Exposure cost is stable.","The ad is still earning attention.","The first clear break appears after the click."])
    }),
    concept:Object.freeze({
      title:"Move through the funnel in order",
      body:"Each rate describes one step and one denominator. Find the first material change before choosing a remedy. An upstream creative change will not repair a broken form, page or offer step.",
      contrasts:Object.freeze([
        Object.freeze({label:"CPM",value:"What exposure costs."}),
        Object.freeze({label:"CTR",value:"How often an impression becomes an ad click."}),
        Object.freeze({label:"CVR",value:"How often the declared eligible traffic becomes a lead or sale."})
      ])
    }),
    example:Object.freeze({
      title:"Trace the first break",
      setup:"Yesterday: 100,000 impressions, 2,000 clicks and 200 leads. Today: 100,000 impressions, 2,020 clicks and 85 leads.",
      steps:Object.freeze(["Exposure volume is essentially unchanged.","Clicks are essentially unchanged.","Leads fell sharply after the click, so inspect the landing and conversion path first."]),
      outcome:"The funnel narrows the investigation before money is spent on the wrong fix."
    }),
    check:Object.freeze({
      id:"lesson-04-funnel",prompt:"What should you inspect first?",answer:1,
      choices:Object.freeze([
        Object.freeze({text:"The ad's opening hook.",feedback:"The ad is still producing its normal click response."}),
        Object.freeze({text:"The landing page, form and offer path.",feedback:"The first clear break occurs after the click."}),
        Object.freeze({text:"The account credit limit.",feedback:"Nothing in the case points to a billing or delivery pause."}),
        Object.freeze({text:"The campaign name.",feedback:"Naming does not explain the conversion drop."})
      ]),
      why:"Repair the first broken stage. Later metrics inherit problems from earlier stages, so diagnosis must follow the path in order."
    }),
    application:Object.freeze({title:"Use this on every weak day",mode:"Closed-Loop Account",body:"Read the funnel from exposure to business outcome. Stop when you find the first material change.",steps:Object.freeze(["Compare like-for-like windows.","Check volume beside each rate.","Choose a control at the broken layer."])}),
    terms:Object.freeze(["funnel","cpm","ctr","cvr","cpl"])
  }),
  "05":Object.freeze({
    id:"05",category:"Fundamentals",minutes:4,discipline:"measurement",
    outcome:"Separate a genuine break from one noisy period before reallocating money.",
    situation:Object.freeze({
      title:"One ugly day interrupts a stable run",
      body:"The account has held near its target for 10 days. Day 11 is sharply negative, but half of the day's outcomes are still unsettled. Tracking shows no outage or mapping change.",
      facts:Object.freeze(["The recent baseline is stable.","The newest outcome is incomplete.","No system failure has been detected."])
    }),
    concept:Object.freeze({
      title:"A result can be real and still be weak evidence",
      body:"Daily results vary even when the strategy is unchanged. Use enough volume, settlement and repeated movement to distinguish a persistent change from ordinary variance.",
      contrasts:Object.freeze([
        Object.freeze({label:"Noise",value:"Movement that can occur without a strategy change."}),
        Object.freeze({label:"Signal",value:"A repeatable change supported by enough evidence."}),
        Object.freeze({label:"Decision window",value:"The period you agree to observe before acting."})
      ])
    }),
    example:Object.freeze({
      title:"Set the rule before the next result arrives",
      setup:"You will reduce allocation only if the three-day settled result falls below the account's lower band, unless a hard failure appears first.",
      steps:Object.freeze(["Write the threshold and window.","Allow delayed outcomes to settle.","Break the rule early only for a defined safety, tracking or billing failure."]),
      outcome:"The decision no longer changes with the mood of the latest report."
    }),
    check:Object.freeze({
      id:"lesson-05-noise",prompt:"What is the strongest next move?",answer:2,
      choices:Object.freeze([
        Object.freeze({text:"Cut the budget after the first negative period.",feedback:"One incomplete day is weak evidence against a stable baseline."}),
        Object.freeze({text:"Double the budget because the prior 10 days were good.",feedback:"The weak day is not proof of a new problem, but it is not a reason to scale either."}),
        Object.freeze({text:"Wait for the stated settlement window, then compare the pattern with the stop rule.",feedback:"This uses the agreed evidence standard without ignoring risk."}),
        Object.freeze({text:"Reset the seed so the next result is better.",feedback:"A seed controls the simulation sequence. It is not an operating remedy."})
      ]),
      why:"Make the evidence rule before you know whether the next number will be pleasant. That protects the account from reactive changes."
    }),
    application:Object.freeze({title:"Use this before scaling or cutting",mode:"Working Capital",body:"Write a window, a volume requirement and an exception for hard failures.",steps:Object.freeze(["Check settlement.","Compare more than one period.","Act only when the stop rule or safety exception is met."])}),
    terms:Object.freeze(["noise","variance","decision window","settlement lag","test stop rule"])
  }),
  "06":Object.freeze({
    id:"06",category:"Fundamentals",minutes:5,discipline:"finance",
    outcome:"Tell marketing efficiency ratio, profit, return on investment, platform claims and cash apart.",
    situation:Object.freeze({
      title:"Five numbers answer five different questions",
      body:"An account spent $10,000 on media and $2,000 on operations. It produced $18,000 in modeled outcome value. Platforms claim $21,500. Only $6,000 has been collected so far.",
      facts:Object.freeze(["Media spend: $10,000","Operations cost: $2,000","Modeled value: $18,000","Platform claims: $21,500","Cash collected: $6,000"])
    }),
    concept:Object.freeze({
      title:"Keep each number on its own ledger",
      body:"Marketing efficiency ratio (MER) compares modeled value with media spend. Profit subtracts costs. Return on investment (ROI) divides profit by the stated investment. Platform claims assign credit. Cash shows what is available now.",
      contrasts:Object.freeze([
        Object.freeze({label:"Modeled MER",value:"$18,000 ÷ $10,000 = 1.8x"}),
        Object.freeze({label:"All-in profit",value:"$18,000 − $10,000 − $2,000 = $6,000"}),
        Object.freeze({label:"All-in ROI",value:"$6,000 ÷ $12,000 = 50%"})
      ])
    }),
    example:Object.freeze({
      title:"Do not add reporting lenses together",
      setup:"The platform claims total $21,500, while the modeled business outcome is $18,000.",
      steps:Object.freeze(["Use modeled value for the modeled business calculation.","Use platform claims to inspect attribution, not to create extra outcomes.","Use the $6,000 cash balance to answer today's bill-paying question."]),
      outcome:"The account can show 1.8x modeled MER, 50% all-in ROI and only $6,000 in collected cash at the same time."
    }),
    check:Object.freeze({
      id:"lesson-06-scoreboards",prompt:"Which statement is accurate?",answer:1,
      choices:Object.freeze([
        Object.freeze({text:"Profit is $8,000.",feedback:"That subtracts media spend but leaves out the $2,000 operating cost."}),
        Object.freeze({text:"Modeled MER is 1.8x and all-in ROI is 50%.",feedback:"Both calculations use the correct numerator, denominator and cost base."}),
        Object.freeze({text:"Total value is $39,500.",feedback:"Adding modeled value to platform claims counts two reporting lenses as separate outcomes."}),
        Object.freeze({text:"The business has $18,000 available to pay bills.",feedback:"Modeled value is not collected cash. Only $6,000 has arrived."})
      ]),
      why:"Labels and ledgers matter. Similar-looking numbers can be internally consistent while answering different questions."
    }),
    application:Object.freeze({title:"Use this before calling an account healthy",mode:"Working Capital",body:"Name the numerator, denominator, cost base, window and cash status for every headline result.",steps:Object.freeze(["Read efficiency.","Subtract the stated costs.","Check whether earned value has settled into cash."])}),
    terms:Object.freeze(["modeled mer","roi","profit","platform claims","cash"])
  }),
  "07":Object.freeze({
    id:"07",category:"Buying and creative",minutes:5,discipline:"measurement",
    outcome:"Reconcile business outcomes with platform claims without double-counting or rewriting history.",
    situation:Object.freeze({
      title:"Three platforms claim more than the business received",
      body:"The business recorded 100 outcomes. Meta claims 78, Google claims 55 and TikTok claims 34. A tracking gap also hid part of yesterday's path.",
      facts:Object.freeze(["Business outcomes: 100","Combined platform claims: 167","One customer can appear in more than one platform report."])
    }),
    concept:Object.freeze({
      title:"Attribution assigns credit; it does not create the outcome",
      body:"An event source reports activity. Attribution rules assign credit to that activity. Several platforms can claim the same customer, and a broken event source can change reporting without changing customer behavior.",
      contrasts:Object.freeze([
        Object.freeze({label:"Business outcome",value:"What actually occurred in the declared business ledger."}),
        Object.freeze({label:"Platform claim",value:"Credit assigned under one platform's rules."}),
        Object.freeze({label:"Tracking gap",value:"A period where the evidence is incomplete."})
      ])
    }),
    example:Object.freeze({
      title:"Repair forward and preserve the gap",
      setup:"The event source is fixed at noon after missing data for three days.",
      steps:Object.freeze(["Mark the affected historical window as incomplete.","Confirm that new events route to the correct destination.","Reconcile future reports without inventing historical outcomes."]),
      outcome:"The repair improves future measurement. It does not manufacture a cleaner past."
    }),
    check:Object.freeze({
      id:"lesson-07-attribution",prompt:"How should the 167 combined platform claims be used?",answer:3,
      choices:Object.freeze([
        Object.freeze({text:"Record 167 new business outcomes.",feedback:"The business ledger recorded 100 outcomes. Claims can overlap."}),
        Object.freeze({text:"Split the difference and record 134 outcomes.",feedback:"Averaging claims does not establish the business total."}),
        Object.freeze({text:"Delete the business ledger and trust the largest platform.",feedback:"A platform claim is one attribution view, not the source of truth for every decision."}),
        Object.freeze({text:"Keep 100 business outcomes, then inspect why the platform claims overlap.",feedback:"This preserves the outcome ledger and treats attribution as evidence to reconcile."})
      ]),
      why:"Do not add overlapping claims as if each platform created a separate customer. Reconcile the reports against the declared source of truth."
    }),
    application:Object.freeze({title:"Use this when reports disagree",mode:"Working Capital",body:"Separate modeled outcomes, platform claims, receivables and settled cash before changing delivery.",steps:Object.freeze(["Name the source of truth.","Mark the attribution window.","Repair future reporting without revising unsupported history."])}),
    terms:Object.freeze(["pixel","event source","attribution","platform claims","attribution gap"])
  }),
  "08":Object.freeze({
    id:"08",category:"Managing systems",minutes:5,discipline:"clients",
    outcome:"Turn a tense client report into a specific investigation, decision and follow-up commitment.",
    situation:Object.freeze({
      title:"Lead volume is stable, but the client says quality slipped",
      body:"The client reports fewer useful conversations. Front-end lead volume is stable. A different team recently used the same event source, one geographic mistake ended weeks ago and no single cause has been proven.",
      facts:Object.freeze(["The quality concern is credible.","Volume alone cannot locate the cause.","Several account, creative and signal explanations remain possible."])
    }),
    concept:Object.freeze({
      title:"Acknowledge the concern, then separate the layers",
      body:"Client trust grows from results, judgment, transparency, responsiveness and follow-through. A useful response does not guess at a cause. It states what is known, names the evidence gap and proposes a test with an owner and review point.",
      contrasts:Object.freeze([
        Object.freeze({label:"Account fact",value:"A measurable change in delivery, setup or downstream results."}),
        Object.freeze({label:"Client cue",value:"An observable concern, priority or decision preference."}),
        Object.freeze({label:"Commitment",value:"A named action, owner, evidence check and due point."})
      ])
    }),
    example:Object.freeze({
      title:"Turn the concern into a controlled comparison",
      setup:"You can compare a second account setup while holding pixel, creative, geography and offer as steady as possible.",
      steps:Object.freeze(["Confirm how the client defines a useful lead.","Audit the timing of creative, geography, account and event-source changes.","Run the smallest comparison that can separate the leading explanations, then report back on a fixed date."]),
      outcome:"The client receives a plan that can produce evidence, not a promise that one favorite theory is correct."
    }),
    check:Object.freeze({
      id:"lesson-08-client",prompt:"What is the strongest first response?",answer:1,
      choices:Object.freeze([
        Object.freeze({text:"Promise that another ad account will fix quality.",feedback:"The cause is not known, so the promise outruns the evidence."}),
        Object.freeze({text:"Acknowledge the concern, define quality and test account, creative, geography and signal explanations separately.",feedback:"This respects the report and creates a path to evidence."}),
        Object.freeze({text:"Blame the event source immediately.",feedback:"Shared signal is plausible, but it has not been isolated as the cause."}),
        Object.freeze({text:"Wait until lead volume falls too.",feedback:"Downstream quality can weaken before front-end volume changes."})
      ]),
      why:"Strong client leadership combines an honest read of uncertainty with a specific action and follow-up."
    }),
    application:Object.freeze({title:"Use this in Search Desk and Agency Career",mode:"Search Desk",body:"After a tense exchange, write the fact, hypothesis, test, owner and follow-up date.",steps:Object.freeze(["Separate facts from cues.","Avoid unsupported certainty.","Close the loop on the commitment."])}),
    terms:Object.freeze(["client trust","client tension","client read","working agreement","commitment"])
  }),
  "09":Object.freeze({
    id:"09",category:"Buying and creative",minutes:5,discipline:"channels",
    outcome:"Match the buying decision to the way a channel finds demand and reaches its capacity limit.",
    situation:Object.freeze({
      title:"Search is stable while social creative fades",
      body:"Paid search captures high-intent queries and already holds 92% impression share. A paid social winner is tiring. The account needs stable volume without paying far above the remaining search demand.",
      facts:Object.freeze(["Search has strong intent but little unused query volume.","Social has more reach but depends on fresh creative.","The two lanes fail for different reasons."])
    }),
    concept:Object.freeze({
      title:"Intent and interruption use different controls",
      body:"Search captures demand that already exists through keywords, bids, relevance and finite query volume. Paid social interrupts or creates demand through the hook, offer, audience and creative supply.",
      contrasts:Object.freeze([
        Object.freeze({label:"Paid search",value:"Intent, query volume, bid and relevance pressure."}),
        Object.freeze({label:"Paid social",value:"Creative response, audience freshness, learning and fatigue."}),
        Object.freeze({label:"CTV and display",value:"Reach-led delivery with weaker click evidence and more view-through uncertainty."})
      ])
    }),
    example:Object.freeze({
      title:"Use search as a stabilizer, not an infinite reservoir",
      setup:"Another $2,000 in search would mostly bid harder on the same queries. A reviewed social sibling can launch tomorrow.",
      steps:Object.freeze(["Protect the profitable high-intent search base.","Do not assume extra budget creates extra queries.","Refresh the social lane and compare its marginal outcome after launch."]),
      outcome:"The plan respects the search ceiling and repairs the channel that has a creative problem."
    }),
    check:Object.freeze({
      id:"lesson-09-channel",prompt:"Which plan fits the evidence?",answer:0,
      choices:Object.freeze([
        Object.freeze({text:"Keep the stable search base, avoid forcing its ceiling and launch fresh social creative.",feedback:"This uses each lane for the job and capacity it actually has."}),
        Object.freeze({text:"Move every dollar to search because its current return is higher.",feedback:"At 92% impression share, the next search dollar may buy little new demand."}),
        Object.freeze({text:"Use social bidding changes without replacing the tired creative.",feedback:"The known social problem is creative fatigue."}),
        Object.freeze({text:"Judge both lanes by click-through rate alone.",feedback:"The channels capture different intent and produce different downstream paths."})
      ]),
      why:"Compare the next useful unit of demand, not only each channel's historical average."
    }),
    application:Object.freeze({title:"Use this in Channel Command",mode:"Channel Command",body:"For every lane, name its demand source, main control, decay mechanism and capacity limit.",steps:Object.freeze(["Classify the lane.","Use its native diagnostic.","Compare marginal accountwide value before moving budget."])}),
    terms:Object.freeze(["paid search","paid social","impression share","quality score","marginal mer"])
  }),
  "10":Object.freeze({
    id:"10",category:"Managing systems",minutes:5,discipline:"portfolio",
    outcome:"Keep budget, allocation, spend, billed cost, cash and capacity separate before changing the account.",
    situation:Object.freeze({
      title:"The account has room, but the business is tight on cash",
      body:"The daily account budget is $20,000. You allocated $14,700 across live ads, so $5,300 remains unassigned. Today's media spend is $12,100. The bank has $8,000 and part of the credit line is already held by unsettled charges.",
      facts:Object.freeze(["Budget is the authorized ceiling.","Allocation is assigned capacity.","Spend is delivered media.","Cash and available credit determine what can be paid."])
    }),
    concept:Object.freeze({
      title:"These numbers move on different clocks",
      body:"A budget permits spend. An allocation assigns part of that permission. Delivery creates media spend and billed cost. Cash and available credit settle obligations. Positive performance does not remove a capacity or liquidity constraint.",
      contrasts:Object.freeze([
        Object.freeze({label:"Budget",value:"The maximum allowed for the account or period."}),
        Object.freeze({label:"Allocation",value:"The portion assigned to a lane or ad before delivery."}),
        Object.freeze({label:"Spend",value:"What delivery actually consumed."}),
        Object.freeze({label:"Cash",value:"Money available to settle obligations now."})
      ])
    }),
    example:Object.freeze({
      title:"Follow one dollar through the system",
      setup:"You raise a slot's allocation by $1,000, but the platform only delivers $700 before day end.",
      steps:Object.freeze(["Authorized budget stays at $20,000.","Allocated capacity rises by $1,000.","Media spend rises only by the $700 delivered.","The bill and cash impact follow the platform's settlement rules."]),
      outcome:"Changing allocation does not instantly spend the whole amount or create cash."
    }),
    check:Object.freeze({
      id:"lesson-10-ledgers",prompt:"What does the unassigned $5,300 mean?",answer:2,
      choices:Object.freeze([
        Object.freeze({text:"The business earned $5,300 in profit.",feedback:"Unassigned authorization is not earned value or profit."}),
        Object.freeze({text:"The platform already spent $5,300.",feedback:"The amount has not been assigned, much less delivered."}),
        Object.freeze({text:"The account can assign up to $5,300 more, if capacity and liquidity support it.",feedback:"It is unused authorization, not a command to spend."}),
        Object.freeze({text:"The bank balance increased by $5,300.",feedback:"Budget capacity and cash are separate resources."})
      ]),
      why:"Name the layer and resource before using a control. The same dollar figure can mean permission, assignment, delivery, a bill or cash."
    }),
    application:Object.freeze({title:"Use this in Portfolio Command and Agency Career",mode:"Portfolio Command",body:"Before expanding, check the hierarchy level, focus cost, concentration, receivable timing and available credit.",steps:Object.freeze(["Name the object you are changing.","Name the resource it consumes.","Check whether the team can service the added work."])}),
    terms:Object.freeze(["budget","allocation","media spend","cash","available credit"])
  }),
  "11":Object.freeze({
    id:"11",category:"Managing systems",minutes:4,discipline:"creative",
    outcome:"Catch rights, claim and policy risks before a strong asset becomes an account problem.",
    situation:Object.freeze({
      title:"The best-looking asset has unresolved rights",
      body:"A new video has a recognizable person, a third-party logo and the line \"save 70% guaranteed.\" It has not been reviewed, but the live winner may fatigue tomorrow.",
      facts:Object.freeze(["Performance potential does not establish permission to use the asset.","The claim needs support and qualification.","Waiting until burnout creates pressure to ship unsafe work."])
    }),
    concept:Object.freeze({
      title:"Approval is part of production",
      body:"Rights, likeness, visible brands, claims, disclosures and platform policy are separate checks. An account hold, creative rejection and rights problem also have different remedies.",
      contrasts:Object.freeze([
        Object.freeze({label:"Rights review",value:"Can the people, marks and source material be used this way?"}),
        Object.freeze({label:"Claims review",value:"Can the promise be supported and presented with required qualifications?"}),
        Object.freeze({label:"Platform review",value:"Can the ad run under the platform's current rules?"})
      ])
    }),
    example:Object.freeze({
      title:"Build the safe replacement before the deadline",
      setup:"The current winner has about two days of useful life. Review and revision take one to three days.",
      steps:Object.freeze(["Hold the unresolved asset out of delivery.","Verify the source, likeness, logo and claim support.","Prepare a compliant alternate while review continues."]),
      outcome:"The account keeps a replacement path without treating urgency as approval."
    }),
    check:Object.freeze({
      id:"lesson-11-review",prompt:"What should happen next?",answer:1,
      choices:Object.freeze([
        Object.freeze({text:"Ship it now because the current winner is tiring.",feedback:"Urgency does not resolve rights, claim or platform risk."}),
        Object.freeze({text:"Hold it for review and prepare a compliant alternate.",feedback:"This protects delivery continuity without bypassing review."}),
        Object.freeze({text:"Remove the logo and assume every other issue is cleared.",feedback:"The person, source and guarantee still require separate review."}),
        Object.freeze({text:"Pause the entire account permanently.",feedback:"The unresolved risk belongs to this asset. Use a scoped hold and replacement plan."})
      ]),
      why:"A mature pipeline treats review time and backup creative as production requirements, not last-minute obstacles."
    }),
    application:Object.freeze({title:"Use this before every creative swap",mode:"Creative Operations",body:"Inspect the asset before it reaches the live queue and keep one reviewed alternate ready.",steps:Object.freeze(["Verify source and rights.","Review people, marks, claims and disclosures.","Record approval limits and expiration."])}),
    terms:Object.freeze(["compliance","review","approval","account hold","creative pipeline"])
  })
});

const LESSON_STAGE_LABELS=Object.freeze(["Briefing","Core idea","Worked example","Make the call","Debrief","Apply it"]);
