"use strict";
/* Agency Career is a long-form training campaign. Client names, contracts and results are
   generated for the simulation; platform/channel labels identify media-buying disciplines. */
const AGENCY_MONTH_DAYS=20;
const AGENCY_TOTAL_MONTHS=120;
const AGENCY_MAX_CLIENTS=75;
const AGENCY_PROFIT_TARGET=12000000;

const AGENCY_CLIENT_TYPES=Object.freeze({
  smb_leadgen:Object.freeze({id:"smb_leadgen",label:"SMB lead generation",short:"SMB · LEAD GEN",fee:2900,
    mediaBudget:6500,cadence:5,work:1,trustFloor:30,risk:.75,availableMonth:0,
    lesson:"The simplest service pattern and lowest fee ceiling. Search intent, lead quality and a dependable client update matter more than channel breadth."}),
  smb_commerce:Object.freeze({id:"smb_commerce",label:"SMB commerce",short:"SMB · COMMERCE",fee:5200,
    mediaBudget:24000,cadence:4,work:1.6,trustFloor:32,risk:1,availableMonth:2,
    lesson:"Higher fee potential, with more creative, merchandising, offer and seasonality work than lead generation."}),
  enterprise_leadgen:Object.freeze({id:"enterprise_leadgen",label:"Enterprise lead generation",short:"ENTERPRISE · LEAD GEN",fee:12500,
    mediaBudget:90000,cadence:3,work:2.5,trustFloor:38,risk:1.25,availableMonth:5,
    lesson:"CRM quality, stakeholder alignment, permissions, reporting and controlled testing create most of the service load."}),
  enterprise_commerce:Object.freeze({id:"enterprise_commerce",label:"Enterprise commerce",short:"ENTERPRISE · COMMERCE",fee:22500,
    mediaBudget:280000,cadence:2,work:3.8,trustFloor:42,risk:1.55,availableMonth:8,
    lesson:"The highest revenue ceiling and the heaviest creative, catalog, measurement, governance and incident burden."})
});

const AGENCY_CHANNELS=Object.freeze({
  search:Object.freeze({id:"search",label:"Paid search",family:"intent",tech:"search_foundations",workM:1,
    note:"Captures expressed intent through keywords, queries, bids, negatives, relevance and landing pages."}),
  social:Object.freeze({id:"social",label:"Paid social",family:"interruption",tech:"paid_social",workM:1.12,
    note:"Creates demand through creative, audience signals and offers; response decays when production cannot keep up."}),
  shopping:Object.freeze({id:"shopping",label:"Shopping / feeds",family:"intent",tech:"commerce_feeds",workM:1.18,
    note:"Product data, merchandising and query demand share responsibility with bids and creative."}),
  shortform:Object.freeze({id:"shortform",label:"Short-form social",family:"interruption",tech:"short_form",workM:1.28,
    note:"High creative velocity and fast fatigue exchange operating load for reach and discovery."}),
  programmatic:Object.freeze({id:"programmatic",label:"Programmatic / CTV",family:"reach",tech:"programmatic",workM:1.24,
    note:"Reach-led buying introduces placement, frequency and view-through uncertainty rather than search-volume ceilings."})
});

const AGENCY_VERTICALS=Object.freeze([
  Object.freeze({id:"home-services",label:"Home services",fit:["smb_leadgen","enterprise_leadgen"]}),
  Object.freeze({id:"professional-services",label:"Professional services",fit:["smb_leadgen","enterprise_leadgen"]}),
  Object.freeze({id:"health-services",label:"Health services",fit:["smb_leadgen","enterprise_leadgen"]}),
  Object.freeze({id:"b2b-software",label:"B2B software",fit:["smb_leadgen","enterprise_leadgen"]}),
  Object.freeze({id:"home-goods",label:"Home goods",fit:["smb_commerce","enterprise_commerce"]}),
  Object.freeze({id:"apparel",label:"Apparel",fit:["smb_commerce","enterprise_commerce"]}),
  Object.freeze({id:"specialty-food",label:"Specialty food",fit:["smb_commerce","enterprise_commerce"]}),
  Object.freeze({id:"consumer-software",label:"Consumer software",fit:["smb_commerce","enterprise_commerce"]})
]);

const AGENCY_NAME_PREFIX=Object.freeze([
  "Lantern Fox","Quartz Finch","Northstar Otter","Harbor Kite","Copper Comet","Juniper Atlas",
  "Bluefield Lark","Granite Sparrow","Mosaic Badger","Brightwell Raven","Cinder Heron","Aster Lynx"
]);
const AGENCY_NAME_SUFFIX=Object.freeze({
  "home-services":["Home Services","Mechanical","Outdoor Living"],
  "professional-services":["Advisory Group","Legal Intake","Planning Partners"],
  "health-services":["Care Network","Dental Group","Wellness Partners"],
  "b2b-software":["Workflow Systems","Operations Cloud","Pipeline Software"],
  "home-goods":["Housewares","Living Co.","Home Supply"],
  apparel:["Workwear","Apparel Co.","Field Goods"],
  "specialty-food":["Pantry Co.","Roasting House","Provisions"],
  "consumer-software":["Mobile Studio","Learning Apps","Utility Labs"]
});

const AGENCY_TECH_NODES=Object.freeze([
  Object.freeze({id:"search_foundations",label:"Search foundations",branch:"Channels",year:2017,cost:0,requires:[],starter:true,
    effect:"Paid search accounts unlocked. Negative-query and landing-page work produce stronger results."}),
  Object.freeze({id:"landing_systems",label:"Landing systems",branch:"Craft",year:2017,cost:1,requires:["search_foundations"],
    effect:"Lead-generation service produces more client value and recovers health faster."}),
  Object.freeze({id:"paid_social",label:"Paid social practice",branch:"Channels",year:2018,cost:1,requires:["search_foundations"],
    effect:"Paid social client leads and a new interruption-based strategy become available."}),
  Object.freeze({id:"measurement",label:"CRM & measurement",branch:"Operations",year:2018,cost:1,requires:["search_foundations"],
    effect:"Measurement incidents create less trust damage; enterprise lead generation becomes safer."}),
  Object.freeze({id:"commerce_feeds",label:"Commerce feeds",branch:"Channels",year:2019,cost:1,requires:["search_foundations"],
    effect:"Shopping/feed accounts and commerce leads become available."}),
  Object.freeze({id:"automation",label:"Bidding automation",branch:"Operations",year:2019,cost:2,requires:["search_foundations"],
    effect:"Stable search accounts need attention less frequently, freeing operating capacity."}),
  Object.freeze({id:"agency_os",label:"Agency operating system",branch:"Operations",year:2020,cost:2,requires:["measurement"],
    effect:"SOPs, alerts and handoffs add daily capacity and reduce overload penalties."}),
  Object.freeze({id:"creative_studio",label:"Creative studio",branch:"Craft",year:2020,cost:2,requires:["paid_social"],
    effect:"Commerce and social accounts consume less service capacity and recover fatigue faster."}),
  Object.freeze({id:"short_form",label:"Short-form creative",branch:"Channels",year:2021,cost:2,requires:["paid_social","creative_studio"],
    effect:"Short-form social leads unlock, with high upside and a faster creative clock."}),
  Object.freeze({id:"first_party",label:"First-party signal",branch:"Measurement",year:2021,cost:2,requires:["measurement"],
    effect:"Signal loss and attribution shocks do less damage across the roster."}),
  Object.freeze({id:"programmatic",label:"Programmatic & CTV",branch:"Channels",year:2022,cost:2,requires:["measurement"],
    effect:"Reach-led accounts unlock, adding scale and view-through ambiguity."}),
  Object.freeze({id:"portfolio_measurement",label:"Portfolio measurement",branch:"Measurement",year:2023,cost:2,requires:["first_party","agency_os"],
    effect:"Cross-client diagnostics and workload forecasts improve; context switching costs less."}),
  Object.freeze({id:"predictive_ops",label:"Predictive operations",branch:"Operations",year:2024,cost:2,requires:["automation","agency_os"],
    effect:"Healthy accounts stay stable longer and the priority queue surfaces trouble earlier."}),
  Object.freeze({id:"affiliate_engine",label:"Affiliate scaling engine",branch:"Transformation",year:2021,cost:3,requires:["first_party","creative_studio"],
    effect:"Unlocks a one-way pivot from client retainers to owned funnel economics, delayed payouts and enforcement risk."})
]);

const AGENCY_ERAS=Object.freeze([
  Object.freeze({year:2017,title:"Manual-search foundation",copy:"Manual bids, query intent, negatives, Quality Score components and expanded search copy dominate the operating model.",flags:{manualSearch:true}}),
  Object.freeze({year:2018,title:"Social acquisition opens",copy:"Creative-led interruption buying becomes a viable expansion path, but only after the practice earns the capability.",flags:{socialOpportunity:true}}),
  Object.freeze({year:2019,title:"Automation enters the auction",copy:"The search interface changes and automated bidding becomes a strategic choice; old position habits lose value.",flags:{automationPressure:true}}),
  Object.freeze({year:2020,title:"Remote demand shock",copy:"Demand and account volatility widen. Process quality and cash reserves matter more than a clean average month.",flags:{volatility:1.08}}),
  Object.freeze({year:2021,title:"Signal-loss era",copy:"Privacy changes weaken deterministic attribution and increase the value of first-party measurement.",flags:{signalPressure:true}}),
  Object.freeze({year:2022,title:"Consolidated delivery",copy:"Platforms push broader automation while creative volume and feed quality become larger operating constraints.",flags:{automationPressure:true,creativePressure:true}}),
  Object.freeze({year:2023,title:"Modeled measurement",copy:"Teams increasingly reconcile platform claims with CRM and business outcomes instead of expecting one report to be complete.",flags:{signalPressure:true}}),
  Object.freeze({year:2024,title:"Creative-volume race",copy:"Iteration speed becomes a scaling limit across social and commerce accounts.",flags:{creativePressure:true}}),
  Object.freeze({year:2025,title:"AI-assisted operations",copy:"Automation expands production and analysis capacity, but review, strategy and accountability remain human constraints.",flags:{automationPressure:true}}),
  Object.freeze({year:2026,title:"Enforcement & resilience",copy:"Account durability, claims review, payment paths and concentration risk become core operating concerns.",flags:{enforcement:1.18}}),
  Object.freeze({year:2027,title:"Projected final season",copy:"The final season is a scenario, not an observed platform rulebook. Win by reaching it with the required cumulative business profit.",flags:{final:true}})
]);

const AGENCY_MILESTONES=Object.freeze([
  Object.freeze({month:1,target:1,label:"Month 1 · retain the founding client"}),
  Object.freeze({month:2,target:2,label:"Month 2 · operate two SMB lead-gen clients"}),
  Object.freeze({month:3,target:5,label:"Month 3 · five active clients"}),
  Object.freeze({month:6,target:15,label:"Month 6 · fifteen active clients"}),
  Object.freeze({month:12,target:30,label:"Year 1 · thirty active clients"}),
  Object.freeze({month:120,target:0,label:"2027 · career profit gate"})
]);

const AGENCY_INCIDENTS=Object.freeze([
  Object.freeze({id:"quality",label:"Lead quality softened",concept:"lead quality",trust:-5,health:-3,work:1,
    copy:"Downstream acceptance slipped while front-end volume still looks healthy. Diagnose intent, geography and measurement before blaming the ad account."}),
  Object.freeze({id:"tracking",label:"Tracking discrepancy",concept:"tracking",trust:-4,health:-2,work:2,
    copy:"The platform report and business outcome ledger no longer reconcile. An audit is due before a performance decision."}),
  Object.freeze({id:"creative",label:"Creative fatigue",concept:"fatigue",trust:-2,health:-5,work:1,
    copy:"Response has decayed faster than the normal service cadence. The account needs a fresh message or execution."}),
  Object.freeze({id:"stakeholder",label:"Stakeholder escalation",concept:"client trust",trust:-7,health:0,work:1,
    copy:"A tense client question needs an evidence-based update and a named next action."}),
  Object.freeze({id:"policy",label:"Policy review",concept:"compliance",trust:-3,health:-6,work:2,
    copy:"A delivery object entered review. Separate creative policy, platform-account health and the business relationship before responding."}),
  Object.freeze({id:"auction",label:"Auction pressure",concept:"auction rank",trust:-1,health:-4,work:1,
    copy:"Marginal delivery worsened. Check demand ceilings, relevance and competitive pressure before adding budget."})
]);

const AFFILIATE_VERTICALS=Object.freeze([
  Object.freeze({id:"home-intent",label:"Home-intent leads",baseMer:1.34,compliance:.9}),
  Object.freeze({id:"consumer-finance",label:"Consumer finance leads",baseMer:1.48,compliance:1.35}),
  Object.freeze({id:"wellness",label:"Wellness offers",baseMer:1.42,compliance:1.25}),
  Object.freeze({id:"software",label:"Consumer software trials",baseMer:1.28,compliance:.72}),
  Object.freeze({id:"commerce",label:"Direct-response commerce",baseMer:1.38,compliance:1.02})
]);
