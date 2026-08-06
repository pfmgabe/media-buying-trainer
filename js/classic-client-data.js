"use strict";

/* Classic client encounters use observable working preferences, not diagnoses. Business context
   provides a fallible prior; the seeded client profile can reinforce or contradict it. Facts and
   operational judgment always outweigh stylistic fit. */
const CLASSIC_CLIENT_PROFILES=Object.freeze([
  Object.freeze({
    id:"owner-operator",label:"Control-seeking operator",role:"Owner-operator",
    business:"Copper Comet Concrete",businessType:"Owner-led regional service company",
    prior:"Owner-led service businesses often watch booked work, schedule quality, and immediate cash flow closely — but the person on the call may value something else.",
    primaryNeed:"visibility and control",secondaryNeed:"cash-flow predictability",
    initialTrust:64,baseline:98,retentionFloor:50,budgetCutAt:44,budgetCutM:.72,
    weights:{results:.18,judgment:.23,transparency:.18,responsiveness:.25,alignment:.16},
    affinity:{recommend:1.5,investigate:.5,reassure:.2,boundary:1.0},
    cues:[
      "Asks who owns the next action before discussing the explanation.",
      "Returns to what can change today and what cannot.",
      "Responds better when options, owner, and timing are explicit.",
      "Pushes back when a recommendation sounds open-ended or ownerless."],
    reactions:{recommend:"The client settles when the owner, action, and checkpoint are concrete.",investigate:"The client accepts the diagnosis but presses for a decision boundary.",reassure:"The acknowledgment lands, though the client still asks who is doing what next.",boundary:"The clear constraint earns respect when it is paired with a workable option."}
  }),
  Object.freeze({
    id:"auditor",label:"Evidence-first auditor",role:"Finance and analytics director",
    business:"Ledger Lark Structures",businessType:"Investor-backed multi-market contractor",
    prior:"Finance-led organizations often emphasize unit economics, causal evidence, and forecast variance. That is a useful starting hypothesis, not a personality verdict.",
    primaryNeed:"causal evidence",secondaryNeed:"forecast discipline",
    initialTrust:60,baseline:105,retentionFloor:54,budgetCutAt:49,budgetCutM:.68,
    weights:{results:.18,judgment:.30,transparency:.27,responsiveness:.10,alignment:.15},
    affinity:{recommend:.5,investigate:1.7,reassure:.1,boundary:.9},
    cues:[
      "Separates what the report shows from what the team can actually prove.",
      "Asks which variable changed and which variables were held constant.",
      "Notices when a confident sentence outruns the available sample.",
      "Warms to tests with a clear way to prove the idea wrong and explicit decision thresholds."],
    reactions:{recommend:"The recommendation is heard, but the client asks for the evidence chain behind it.",investigate:"The client engages with the controlled test and narrows the question.",reassure:"The client appreciates candor but does not treat reassurance as evidence.",boundary:"A precise limit is accepted when its measurement consequence is named."}
  }),
  Object.freeze({
    id:"sprinter",label:"Momentum-oriented growth lead",role:"Growth lead",
    business:"Rocket Trowel Network",businessType:"Rapidly expanding multi-location operator",
    prior:"Expansion-stage businesses may prize response speed and reversible action because missed demand has an opportunity cost. Some leaders still prefer slower proof.",
    primaryNeed:"decisive momentum",secondaryNeed:"reversible tests",
    initialTrust:61,baseline:112,retentionFloor:48,budgetCutAt:42,budgetCutM:.78,
    weights:{results:.28,judgment:.18,transparency:.10,responsiveness:.28,alignment:.16},
    affinity:{recommend:1.7,investigate:.2,reassure:.3,boundary:-.2},
    cues:[
      "Asks what can launch before the next reporting cycle.",
      "Loses patience with analysis that has no stop rule or action date.",
      "Accepts uncertainty when the test is fast and reversible.",
      "Responds to a clear move-now / measure-next sequence."],
    reactions:{recommend:"The client responds to a bounded move with a named checkpoint.",investigate:"The analysis is useful, but the client asks how quickly it becomes a decision.",reassure:"The acknowledgment helps briefly; momentum still has to follow.",boundary:"The client resists the limit until a faster safe alternative is offered."}
  }),
  Object.freeze({
    id:"steward",label:"Reputation and risk steward",role:"Brand and reputation steward",
    business:"Juniper Hearth Hardscapes",businessType:"Family-owned specialty contractor",
    prior:"Reputation-led firms often protect referral quality, local standing, and downside risk. They can still be aggressive when safeguards are clear.",
    primaryNeed:"downside protection",secondaryNeed:"brand consistency",
    initialTrust:68,baseline:92,retentionFloor:56,budgetCutAt:52,budgetCutM:.64,
    weights:{results:.16,judgment:.22,transparency:.21,responsiveness:.14,alignment:.27},
    affinity:{recommend:.1,investigate:.7,reassure:1.5,boundary:1.3},
    cues:[
      "Frames bad leads as a reputation and customer-experience problem, not just wasted spend.",
      "Asks what guardrail prevents the same surprise next week.",
      "Responds when the business consequence is acknowledged before the tactic.",
      "Prefers an explicit stop condition to an open-ended scale plan."],
    reactions:{recommend:"The client asks whether the action protects reputation if the hypothesis is wrong.",investigate:"The controlled diagnosis lowers concern when the risk boundary is visible.",reassure:"The client feels heard and becomes more willing to discuss the operating plan.",boundary:"A firm guardrail reduces tension and creates room for a measured test."}
  }),
  Object.freeze({
    id:"partner",label:"Relationship-centered partner",role:"General manager",
    business:"Moonbeam Aggregate Works",businessType:"Referral-heavy regional contractor",
    prior:"Referral-heavy companies may care intensely about candor, early warning, and shared ownership. That does not mean they prefer reassurance over facts.",
    primaryNeed:"early communication",secondaryNeed:"shared ownership",
    initialTrust:66,baseline:100,retentionFloor:49,budgetCutAt:45,budgetCutM:.74,
    weights:{results:.16,judgment:.18,transparency:.25,responsiveness:.20,alignment:.21},
    affinity:{recommend:.4,investigate:1.0,reassure:1.5,boundary:.4},
    cues:[
      "Notices whether bad news arrived from the buyer or from someone else.",
      "Uses 'we' when the plan is clear and 'you' when surprised.",
      "Responds to direct acknowledgment without needing certainty theater.",
      "Values a documented check-in as much as the initial recommendation."],
    reactions:{recommend:"The action helps, but the client watches whether the team stays aligned around it.",investigate:"The client joins the diagnosis when the uncertainty is shared plainly.",reassure:"The candid acknowledgment restores a sense of partnership.",boundary:"The limit is accepted when it is framed as a shared operating agreement."}
  }),
  Object.freeze({
    id:"quality-guardian",label:"Lead-quality guardian",role:"Lead operations manager",
    business:"Signal Quarry Structural",businessType:"High-ticket commercial lead operation",
    prior:"High-ticket lead operations often care more about accepted opportunities than cheap form fills. Front-end volume can still matter, but only beside downstream quality.",
    primaryNeed:"accepted lead quality",secondaryNeed:"clean comparisons",
    initialTrust:62,baseline:94,retentionFloor:53,budgetCutAt:48,budgetCutM:.67,
    weights:{results:.25,judgment:.28,transparency:.18,responsiveness:.16,alignment:.13},
    affinity:{recommend:.6,investigate:1.6,reassure:0,boundary:.8},
    cues:[
      "Asks for disposition or acceptance evidence before celebrating volume.",
      "Distinguishes an ad-account change from a creative or geography change.",
      "Pushes for a controlled comparison instead of a stack of simultaneous fixes.",
      "Treats cheap low-intent clicks as a quality warning, not a win."],
    reactions:{recommend:"The client asks how the action isolates the source of the quality change.",investigate:"The controlled comparison matches the client's need for a clean quality read.",reassure:"The client does not dismiss the acknowledgment, but asks for buyer-side evidence.",boundary:"The stop rule is useful when it protects the quality sample from contamination."}
  }),
  Object.freeze({
    id:"planner",label:"Process-oriented operator",role:"Operations director",
    business:"Atlas Otter Commercial",businessType:"Multi-branch commercial contractor",
    prior:"Multi-branch operators may prioritize repeatable process, branch variance, and handoff clarity. Individual leaders can still favor experimentation.",
    primaryNeed:"process reliability",secondaryNeed:"clear handoffs",
    initialTrust:65,baseline:103,retentionFloor:51,budgetCutAt:46,budgetCutM:.70,
    weights:{results:.20,judgment:.25,transparency:.16,responsiveness:.24,alignment:.15},
    affinity:{recommend:1.3,investigate:1.1,reassure:.2,boundary:.5},
    cues:[
      "Asks whether the proposed fix works across branches or only in one pocket.",
      "Returns to the owner, handoff, and reporting cadence.",
      "Responds to sequenced plans more than isolated tactics.",
      "Treats undocumented changes as operational risk."],
    reactions:{recommend:"The sequence and owner make the recommendation easier to operationalize.",investigate:"The client supports the test once the handoff and reporting cadence are named.",reassure:"The acknowledgment is welcome, though process detail is still missing.",boundary:"The limit works when it becomes a repeatable rule rather than a one-off refusal."}
  }),
  Object.freeze({
    id:"visionary",label:"Upside-seeking brand builder",role:"Marketing founder",
    business:"Prism Pour Engineering",businessType:"Design-forward concrete systems company",
    prior:"Design-led businesses may value creative coherence and upside alongside efficiency. A strong concept still needs a measurable operating thesis.",
    primaryNeed:"coherent upside",secondaryNeed:"creative conviction",
    initialTrust:63,baseline:108,retentionFloor:47,budgetCutAt:41,budgetCutM:.76,
    weights:{results:.25,judgment:.15,transparency:.13,responsiveness:.20,alignment:.27},
    affinity:{recommend:1.3,investigate:.2,reassure:.8,boundary:-.1},
    cues:[
      "Asks what the account could become, not only what the last report says.",
      "Responds to a clear creative thesis with a measurable downside limit.",
      "Disengages when every idea is reduced to one short-window metric.",
      "Accepts a failed test more readily when the learning changes the next concept."],
    reactions:{recommend:"The client engages when the recommendation connects upside to a concrete thesis.",investigate:"The client accepts the learning plan but asks what larger opportunity it unlocks.",reassure:"The acknowledgment lands when it reconnects the work to the intended brand direction.",boundary:"The client resists a pure limit unless the next creative path remains visible."}
  })
]);

/* Business context and communication preference are selected separately. The weighted priors
   make sector hints useful without turning a company type into a deterministic personality tag. */
const CLASSIC_CLIENT_BUSINESSES=Object.freeze([
  Object.freeze({id:"local-service",name:"Copper Comet Concrete",role:"Managing owner",type:"Owner-led regional service company",baseline:98,
    prior:"Owner-led service companies often watch booked work, schedule quality, and near-term cash flow closely. Watch whether this client actually asks for action ownership, evidence, reassurance, or something else.",
    weights:{"owner-operator":4,partner:2,steward:2,planner:1,auditor:1,sprinter:1,"quality-guardian":1,visionary:1}}),
  Object.freeze({id:"multi-location",name:"Rocket Trowel Network",role:"Growth and branch lead",type:"Rapidly expanding multi-location operator",baseline:112,
    prior:"Expansion-stage operators often feel the opportunity cost of delay and the pain of inconsistent branch handoffs. That suggests speed or process may matter — but neither is safe to assume until the client reacts.",
    weights:{sprinter:4,planner:3,"owner-operator":2,auditor:1,partner:1,steward:1,"quality-guardian":1,visionary:1}}),
  Object.freeze({id:"commercial-leads",name:"Signal Quarry Structural",role:"Demand and lead operations lead",type:"High-ticket commercial lead operation",baseline:94,
    prior:"High-ticket lead businesses often care more about accepted opportunities than cheap form fills. Evidence quality is a sensible starting question, not proof that this individual prefers an analytical communication style.",
    weights:{"quality-guardian":4,auditor:3,planner:2,partner:1,"owner-operator":1,sprinter:1,steward:1,visionary:1}}),
  Object.freeze({id:"design-systems",name:"Prism Pour Engineering",role:"Marketing and brand lead",type:"Design-forward concrete systems company",baseline:108,
    prior:"Design-led businesses may value creative coherence and upside alongside efficiency. Listen for whether this client protects the idea, the downside, the evidence, or the pace.",
    weights:{visionary:4,steward:2,partner:2,sprinter:1,auditor:1,planner:1,"owner-operator":1,"quality-guardian":1}}),
  Object.freeze({id:"finance-backed",name:"Ledger Lark Structures",role:"Portfolio marketing director",type:"Investor-backed multi-market contractor",baseline:105,
    prior:"Finance-backed organizations often emphasize unit economics, causal evidence, and forecast variance. Individual leaders inside them may still favor momentum, partnership, or brand conviction.",
    weights:{auditor:4,planner:2,sprinter:2,"quality-guardian":2,"owner-operator":1,partner:1,steward:1,visionary:1}}),
  Object.freeze({id:"referral-specialist",name:"Juniper Hearth Hardscapes",role:"General manager",type:"Referral-heavy specialty contractor",baseline:92,
    prior:"Referral-heavy firms often protect reputation, customer experience, and early warning. Do not confuse that sector pressure with a request for reassurance; the client may prefer evidence or a firm recommendation.",
    weights:{steward:4,partner:3,"owner-operator":2,planner:1,auditor:1,sprinter:1,"quality-guardian":1,visionary:1}})
]);

const CLASSIC_CLIENT_EVENTS=Object.freeze({
  intake:Object.freeze({title:"Expectation-setting intake",pressure:32,
    quote:"Before we get deeper into the month, tell me what you believe this account can actually deliver — and how I will know if the plan is working.",
    options:Object.freeze([
      Object.freeze({id:"measured-plan",stance:"investigate",evidence:2,operational:2,base:2,tension:-7,insight:2,effect:"safe-promise",commitment:"reporting",
        text:"The current baseline is {baseline} reported conversions a month. I recommend a small, testable lift, a weekly evidence check, and no larger goal until account performance supports it.",
        feedback:"You separated the baseline, proposed lift, and decision cadence instead of converting optimism into a guarantee."}),
      Object.freeze({id:"owned-plan",stance:"recommend",evidence:1,operational:2,base:2,tension:-6,insight:1,effect:"safe-promise",commitment:"reporting",
        text:"I will own the weekly account read. We will target a measured lift above {baseline}, review search terms and tracking, and state the next decision at every check-in.",
        feedback:"The plan has an owner, a bounded target, and a recurring decision point."}),
      Object.freeze({id:"diagnostic-question",stance:"reassure",evidence:2,operational:1,base:1,tension:-8,insight:3,effect:"grievance",
        text:"Before I set the target, what would make this engagement feel like the last agency all over again? I want that concern written into the operating plan.",
        feedback:"The question trades immediate certainty for information about the relationship risk and makes the concern operational."}),
      Object.freeze({id:"big-promise",stance:"recommend",evidence:-2,operational:-2,base:-2,tension:-1,insight:0,effect:"over-promise",unsupported:true,reckless:true,
        text:"We should beat {baseline} comfortably. I am confident we can push well past it once I turn the right levers.",
        feedback:"The statement creates a larger promise without evidence, constraints or a test that could prove the idea wrong."})
    ])}),
  waste:Object.freeze({title:"Search-quality confrontation",pressure:68,
    quote:"I looked at the search terms and found clicks that were never going to become customers. Why did we pay for those — and what changes now?",
    options:Object.freeze([
      Object.freeze({id:"query-control",stance:"recommend",evidence:2,operational:2,base:2,tension:-10,insight:1,commitment:"negatives",
        text:"The waste is visible in the search-terms report. I will exclude the irrelevant themes, keep the hiring-intent groups intact, and report what the change removes before touching bids.",
        feedback:"The response names the evidence, the correct control, and the layer that stays unchanged."}),
      Object.freeze({id:"quality-question",stance:"investigate",evidence:2,operational:2,base:2,tension:-8,insight:2,commitment:"negatives",
        text:"I agree the queries are wrong for the objective. I want to separate pure junk from early research, add negatives for the former, and compare downstream quality before excluding the latter.",
        feedback:"The response avoids treating every upper-funnel query as identical while still acting on obvious waste."}),
      Object.freeze({id:"acknowledge-waste",stance:"reassure",evidence:1,operational:1,base:0,tension:-7,insight:1,commitment:"negatives",
        text:"You should not have had to find that first. I will own the cleanup today and send the exact excluded themes with the next account read.",
        feedback:"The acknowledgment repairs transparency, though the technical diagnosis is less specific."}),
      Object.freeze({id:"blame-auction",stance:"recommend",evidence:-2,operational:-2,base:-3,tension:8,insight:0,unsupported:true,
        text:"The platform is sending bad traffic this week. I will raise bids so we can reach better users and make the volume back.",
        feedback:"The answer invents a cause and applies a rank control to an intent-quality problem."})
    ])}),
  tracking:Object.freeze({title:"Measurement credibility crisis",pressure:74,
    quote:"The reporting shifted and the team cannot reconcile it with what the business is seeing. Are the ads failing, or is the measurement failing?",
    options:Object.freeze([
      Object.freeze({id:"audit-first",stance:"investigate",evidence:2,operational:2,base:3,tension:-12,insight:2,commitment:"tracking",
        text:"We do not know yet. I will check the conversion path before optimizing from this report, keep modeled and reported outcomes separate, and return with the exact break point.",
        feedback:"The response states uncertainty, protects the account from a false optimization, and names a diagnostic next step."}),
      Object.freeze({id:"disclose-gap",stance:"reassure",evidence:2,operational:1,base:2,tension:-10,insight:2,commitment:"tracking",
        text:"The mismatch is real, and I should surface it before defending a tactic. I will document what the platform reports, what the business observed, and what the tracking check confirms.",
        feedback:"The response prioritizes early disclosure and a shared source-of-truth check."}),
      Object.freeze({id:"pause-from-report",stance:"recommend",evidence:0,operational:-1,base:-1,tension:2,insight:0,
        text:"The reported results are down, so I will pause the weakest-looking ad group now and rebuild after the numbers stabilize.",
        feedback:"The action treats an unchecked report as ground truth and can destroy learning before the measurement question is answered."}),
      Object.freeze({id:"hide-gap",stance:"boundary",evidence:-2,operational:-2,base:-4,tension:10,insight:0,unsupported:true,
        text:"Attribution is always messy. The account looks healthy enough, so there is no reason to spend time on the discrepancy.",
        feedback:"The response uses a general truth to dismiss a specific unresolved measurement failure."})
    ])}),
  promise:Object.freeze({title:"Missed-expectation call",pressure:82,
    quote:"We are behind the number you gave me. I need to know whether the target was wrong, the account is wrong, or the plan is wrong.",
    options:Object.freeze([
      Object.freeze({id:"reset-expectation",stance:"boundary",evidence:2,operational:2,base:2,tension:-10,insight:2,effect:"reset-promise",commitment:"reporting",
        text:"The promise outran the evidence. I own that. I will reset the target to the measured baseline, show the current gap, and use the next controlled test — not another promise — to earn a higher number.",
        feedback:"Respectful pushback on the old promise costs less credibility than pretending the gap will disappear."}),
      Object.freeze({id:"gap-plan",stance:"investigate",evidence:2,operational:2,base:2,tension:-9,insight:1,commitment:"reporting",
        text:"The account is pacing at {pace} against a {goal} monthly commitment. I will separate delivery, tracking, and intent causes, then attach one action and one stop rule to the largest supported gap.",
        feedback:"The response quantifies the miss and turns it into competing hypotheses rather than a single convenient story."}),
      Object.freeze({id:"catch-up-guarantee",stance:"recommend",evidence:-2,operational:-1,base:-3,tension:3,insight:0,unsupported:true,reckless:true,
        text:"We can still catch up. I will push harder this week and make the number before the period closes.",
        feedback:"This answer responds to one broken promise with another. It also proposes scaling without saying how much, when or why."}),
      Object.freeze({id:"season-blame",stance:"reassure",evidence:-1,operational:-1,base:-2,tension:4,insight:0,unsupported:true,
        text:"This is probably seasonality. I would not read too much into the pace yet; the market should come back.",
        feedback:"The response offers comfort through an untested causal claim and no decision threshold."})
    ])}),
  behind:Object.freeze({title:"Performance-pressure review",pressure:62,
    quote:"The pace is below baseline. I do not need a dashboard tour — I need to understand what you know, what you do not know, and what you recommend.",
    options:Object.freeze([
      Object.freeze({id:"evidence-next",stance:"investigate",evidence:2,operational:2,base:2,tension:-8,insight:1,commitment:"reporting",
        text:"Reported pace is {pace} against a {baseline} baseline. I can support the gap; I cannot yet support one cause. I will rank the hypotheses by evidence and make the smallest decision that distinguishes them.",
        feedback:"The response makes uncertainty actionable instead of using it as an excuse to avoid a recommendation."}),
      Object.freeze({id:"owned-next",stance:"recommend",evidence:1,operational:2,base:2,tension:-9,insight:1,commitment:"reporting",
        text:"My recommendation is to protect high-intent demand, remove known waste, and hold the budget flat until the next evidence check. I own that checkpoint.",
        feedback:"The recommendation is bounded, operational, and avoids changing every layer at once."}),
      Object.freeze({id:"business-question",stance:"reassure",evidence:2,operational:1,base:1,tension:-8,insight:3,
        text:"Before I optimize to the wrong scoreboard: has the business seen a change in accepted jobs, answer rate, or close quality that the ad report does not show?",
        feedback:"The question links media metrics to the business outcome and creates new diagnostic information."}),
      Object.freeze({id:"confident-theory",stance:"recommend",evidence:-2,operational:-1,base:-3,tension:6,insight:0,unsupported:true,
        text:"Competitors are clearly bidding us up. I will increase bids and recover the missing volume.",
        feedback:"The answer turns one plausible hypothesis into certainty without checking rank loss, intent, or tracking."})
    ])}),
  rank:Object.freeze({title:"Auction-pressure decision",pressure:58,
    quote:"Impression share is down. Do we need more budget, higher bids, better ads, or something else? I do not want four changes disguised as one answer.",
    options:Object.freeze([
      Object.freeze({id:"separate-losses",stance:"investigate",evidence:2,operational:2,base:3,tension:-9,insight:2,
        text:"First separate share lost to rank from share lost to budget. Rank points to bid or relevance; budget points to the cap. I will change only the supported layer and preserve the comparison.",
        feedback:"The response uses the diagnostic split to prevent opposite problems from receiving the same fix."}),
      Object.freeze({id:"bounded-rank-action",stance:"recommend",evidence:1,operational:2,base:2,tension:-8,insight:1,
        text:"Where rank loss is material and click intent is proven, I recommend one bounded bid or relevance change with a stop rule. I will not ask for budget to solve rank.",
        feedback:"The recommendation is decisive without pretending every ad group has the same constraint."}),
      Object.freeze({id:"budget-ask",stance:"recommend",evidence:-1,operational:-2,base:-2,tension:4,insight:0,
        text:"We need more budget. A larger cap will let us win back the impression share we are missing.",
        feedback:"The answer does not distinguish a budget ceiling from an auction-rank problem."}),
      Object.freeze({id:"position-promise",stance:"reassure",evidence:-2,operational:-2,base:-3,tension:5,insight:0,unsupported:true,reckless:true,
        text:"I can get us back to the top position. Give me a week and I will restore the lost share.",
        feedback:"The promise is not supported by the auction evidence and substitutes position for business value."})
    ])}),
  strong:Object.freeze({title:"Success-under-pressure scale request",pressure:52,
    quote:"The last stretch looks strong. I want to capitalize before it disappears. How hard can we push without turning a good result into a bad decision?",
    options:Object.freeze([
      Object.freeze({id:"bounded-scale",stance:"recommend",evidence:2,operational:2,base:3,tension:-8,insight:1,
        text:"Scale the proven high-intent groups in a bounded step, keep the trap traffic constrained, and set a rollback threshold before the next run.",
        feedback:"The answer acts on the result while preserving a clear downside boundary."}),
      Object.freeze({id:"copy-learning",stance:"investigate",evidence:2,operational:2,base:2,tension:-6,insight:2,commitment:"rewrite",
        text:"Before we generalize the win, I want one controlled copy permutation against the current lead ad and enough evidence to see whether the message or temporary auction conditions drove the strong result.",
        feedback:"The response converts a strong period into a causal learning opportunity instead of assuming permanence."}),
      Object.freeze({id:"celebrate-align",stance:"reassure",evidence:1,operational:1,base:1,tension:-7,insight:2,
        text:"The result is worth recognizing. Let us agree on the risk limit first, then decide whether this is a volume push, a margin push, or a learning push.",
        feedback:"The response acknowledges success while returning the scale decision to the business objective."}),
      Object.freeze({id:"double-now",stance:"recommend",evidence:-1,operational:-2,base:-2,tension:6,insight:0,reckless:true,
        text:"This is the window. I will double the account immediately and let the platform find the next pocket.",
        feedback:"The action has no rollback threshold and treats one strong stretch as proof of unlimited marginal demand."})
    ])}),
  routine:Object.freeze({title:"Operating check-in",pressure:38,
    quote:"Give me the short version: what changed, what did you learn, and what decision do you need from me?",
    options:Object.freeze([
      Object.freeze({id:"three-part-read",stance:"recommend",evidence:2,operational:2,base:2,tension:-6,insight:1,commitment:"reporting",
        text:"Performance is pacing at {pace}; the clearest account signal is {signal}. My next action is bounded, and the decision I need from you is whether the current risk limit still holds.",
        feedback:"The update separates evidence, action, and decision ownership."}),
      Object.freeze({id:"ask-priority",stance:"investigate",evidence:2,operational:1,base:1,tension:-6,insight:3,
        text:"The account has more than one plausible next move. Before I choose, which matters most this week: conversion volume, accepted-job quality, cash efficiency, or protecting the current baseline?",
        feedback:"The question improves strategic alignment without pretending every objective can be maximized simultaneously."}),
      Object.freeze({id:"relationship-check",stance:"reassure",evidence:1,operational:1,base:1,tension:-7,insight:2,effect:"grievance",
        text:"The account read is stable enough to decide. Before that: are you getting the visibility and early warning you expected from this engagement?",
        feedback:"The response treats relationship operations as measurable work rather than assuming silence means trust."}),
      Object.freeze({id:"vague-positive",stance:"recommend",evidence:-1,operational:-1,base:-2,tension:3,insight:0,unsupported:true,
        text:"Things are generally moving in the right direction. I am watching the account closely and will keep optimizing.",
        feedback:"The update contains no specific evidence, action, threshold, or decision request."})
    ])}),
  final:Object.freeze({title:"End-of-period account defense",pressure:70,
    quote:"The period is over. Tell me what happened, what you own, and whether the next plan deserves another month.",
    options:Object.freeze([
      Object.freeze({id:"report",stance:"investigate",evidence:2,operational:2,base:3,tension:-8,insight:1,
        text:"I will report the actual pace, reported and modeled gaps, decisions made, and unresolved risks. Then I will recommend the next test without rewriting the month.",
        feedback:"The closing read protects the source of truth and keeps future recommendations separate from historical results."}),
      Object.freeze({id:"own-outcome",stance:"recommend",evidence:2,operational:2,base:2,tension:-9,insight:1,
        text:"I own the decisions and the communication. Here is the result against the agreed goal, the strongest evidence, and the one operating change I recommend next.",
        feedback:"The response combines accountability with a bounded forward recommendation."}),
      Object.freeze({id:"relationship-close",stance:"reassure",evidence:1,operational:1,base:1,tension:-8,insight:2,
        text:"Before we plan another period, I want to name where the engagement met your expectations and where our operating agreement failed you.",
        feedback:"The response creates space for relationship evidence but still needs the numerical report beside it."}),
      Object.freeze({id:"spin-month",stance:"recommend",evidence:-2,operational:-2,base:-4,tension:8,insight:0,unsupported:true,
        text:"The account generated valuable learning and is positioned for a breakout. The month should be judged on momentum, not the reported goal.",
        feedback:"The answer changes the evaluation rule after the period and uses future possibility to avoid the agreed scoreboard."})
    ])})
});

const CLASSIC_CLIENT_STANCES=Object.freeze({
  recommend:"Recommend · name the action, owner, and boundary",
  investigate:"Investigate · separate facts, hypotheses, and the next test",
  reassure:"Acknowledge · connect the business concern to the operating plan",
  boundary:"Set a boundary · correct the expectation and offer a safe path"
});
