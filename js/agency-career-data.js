"use strict";
/* Agency Career is a long-form training campaign. Client names, contracts and results are
   generated for the simulation; platform/channel labels identify media-buying disciplines. */
const AGENCY_MONTH_DAYS=20;
const AGENCY_TOTAL_MONTHS=120;
const AGENCY_MAX_CLIENTS=75;
const AGENCY_PROFIT_TARGET=12000000;
const AGENCY_MODEL_VERSION=2;

/* Agency Career keeps this ledger explicit so company costs are operating mechanics rather
   than one generic "overhead" penalty. Values are monthly 2017-dollar baselines; the engine
   applies the era, roster, team, channel and capability drivers listed here. */
const AGENCY_COST_RULES=Object.freeze({
  annualCostGrowth:.025,
  employerBenefitRate:.30,
  founderMonthlyCompensation:3200,
  infrastructureBase:180,
  equipmentReservePerPerson:110,
  softwareBase:280,
  insuranceProfessionalBase:300,
  facilitiesAdministrationBase:375,
  growthMarketingBase:180,
  workstationSetup:Object.freeze({buyer:1800,account:1600,creative:2400,ops:1900,analyst:2200})
});

const AGENCY_EXPENSE_CATEGORIES=Object.freeze({
  founderCompensation:Object.freeze({icon:"🧭",label:"Founder compensation",note:"The player remains the operating media buyer; this is the founder's modest monthly pay."}),
  employeeWages:Object.freeze({icon:"👥",label:"Employee wages",note:"Base monthly wages for the company's support team."}),
  employerBenefits:Object.freeze({icon:"🩺",label:"Employer taxes and benefits",note:"Payroll taxes, insurance and benefits paid on top of employee wages."}),
  infrastructureHosting:Object.freeze({icon:"🖥️",label:"Infrastructure and hosting",note:"Data storage, reporting infrastructure, hosting and account volume."}),
  equipmentReserve:Object.freeze({icon:"🧰",label:"Equipment reserve",note:"Workstation replacement, phones, monitors and ordinary equipment upkeep."}),
  softwareSubscriptions:Object.freeze({icon:"🧩",label:"Software and subscriptions",note:"Buying, reporting, creative, communication and operations tools."}),
  insuranceComplianceProfessional:Object.freeze({icon:"🛡️",label:"Insurance, compliance and professional services",note:"Coverage, bookkeeping, legal support and compliance work appropriate to the roster."}),
  facilitiesAdministration:Object.freeze({icon:"🏢",label:"Facilities, administration and distributed operations",note:"Workspace, utilities, communications, routine administration and contracted distributed-operations capacity."}),
  eventsPartnershipsMarketing:Object.freeze({icon:"🤝",label:"Events, partnerships and company marketing",note:"Spending in this category can increase the number of qualified prospective clients available next month."}),
  clientServiceOnboarding:Object.freeze({icon:"🎯",label:"Client service and onboarding",note:"Client onboarding plus paid audits and creative production used this month."}),
  teamChangesEquipment:Object.freeze({icon:"🪑",label:"Hiring, severance and equipment setup",note:"One-time recruiting, workstation setup and staff-transition costs."}),
  businessTransformation:Object.freeze({icon:"🧬",label:"Business transformation and funnel development",note:"One-time costs created by an affiliate pivot or a new owned funnel."}),
  complianceInterventions:Object.freeze({icon:"📋",label:"Compliance and documentation interventions",note:"Optional audits and documentation purchased during affiliate operations."}),
  ownedMedia:Object.freeze({icon:"📣",label:"Company-funded media",note:"Media funded by the affiliate scaling engine; client-owned media never appears here."}),
  other:Object.freeze({icon:"🧾",label:"Systems investment and other operating costs",note:"One-time capability buildouts, hardware purchases and unclassified costs carried forward from an older save."})
});

const AGENCY_CLIENT_TYPES=Object.freeze({
  smb_leadgen:Object.freeze({id:"smb_leadgen",label:"small-business lead generation",short:"Small business · lead generation",fee:2900,
    mediaBudget:6500,cadence:5,work:1,trustFloor:30,risk:.75,availableMonth:0,
    lesson:"The simplest service pattern and lowest fee ceiling. Search intent, lead quality and a dependable client update matter more than channel breadth."}),
  smb_commerce:Object.freeze({id:"smb_commerce",label:"small-business commerce",short:"Small business · commerce",fee:5200,
    mediaBudget:24000,cadence:4,work:1.6,trustFloor:32,risk:1,availableMonth:2,
    lesson:"Higher fee potential, with more creative, merchandising, offer and seasonality work than lead generation."}),
  enterprise_leadgen:Object.freeze({id:"enterprise_leadgen",label:"enterprise lead generation",short:"Enterprise · lead generation",fee:12500,
    mediaBudget:90000,cadence:3,work:2.5,trustFloor:38,risk:1.25,availableMonth:5,
    lesson:"Customer relationship management data quality, stakeholder alignment, permissions, reporting and controlled testing create most of the service load."}),
  enterprise_commerce:Object.freeze({id:"enterprise_commerce",label:"enterprise commerce",short:"Enterprise · commerce",fee:22500,
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
  Object.freeze({id:"b2b-software",label:"Business-to-business software",fit:["smb_leadgen","enterprise_leadgen"]}),
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
  Object.freeze({id:"measurement",label:"Client data and measurement",branch:"Operations",year:2018,cost:1,requires:["search_foundations"],
    effect:"Measurement incidents create less trust damage; enterprise lead generation becomes safer."}),
  Object.freeze({id:"commerce_feeds",label:"Commerce feeds",branch:"Channels",year:2019,cost:1,requires:["search_foundations"],
    effect:"Shopping/feed accounts and commerce leads become available."}),
  Object.freeze({id:"automation",label:"Bidding automation",branch:"Operations",year:2019,cost:2,requires:["search_foundations"],
    effect:"Stable search accounts need attention less frequently, freeing operating capacity."}),
  Object.freeze({id:"agency_os",label:"Agency operating system",branch:"Operations",year:2020,cost:2,requires:["measurement"],
    effect:"Standard operating procedures, alerts and handoffs add daily capacity and reduce overload penalties."}),
  Object.freeze({id:"creative_studio",label:"Creative studio",branch:"Craft",year:2020,cost:2,requires:["paid_social"],
    effect:"Commerce and social accounts consume less service capacity and recover fatigue faster."}),
  Object.freeze({id:"short_form",label:"Short-form creative",branch:"Channels",year:2021,cost:2,requires:["paid_social","creative_studio"],
    effect:"Short-form social leads unlock, with high upside and a faster creative clock."}),
  Object.freeze({id:"first_party",label:"Advertiser-collected customer data",branch:"Measurement",year:2021,cost:2,requires:["measurement"],
    effect:"Customer and outcome data collected by the advertiser make signal loss and attribution shocks less damaging across the roster."}),
  Object.freeze({id:"programmatic",label:"Programmatic & CTV",branch:"Channels",year:2022,cost:2,requires:["measurement"],
    effect:"Reach-led accounts unlock, adding scale and view-through ambiguity."}),
  Object.freeze({id:"portfolio_measurement",label:"Portfolio measurement",branch:"Measurement",year:2023,cost:2,requires:["first_party","agency_os"],
    effect:"Cross-client diagnostics and workload forecasts improve; context switching costs less."}),
  Object.freeze({id:"predictive_ops",label:"Predictive operations",branch:"Operations",year:2024,cost:2,requires:["automation","agency_os"],
    effect:"Healthy accounts stay stable longer and the priority queue surfaces trouble earlier."}),
  Object.freeze({id:"distributed_ops",label:"Distributed operations and virtual assistant network",branch:"Distributed Team",year:2022,level:6,cost:1,requires:["agency_os"],
    investment:15000,monthly:2200,monthlyCategory:"facilitiesAdministration",
    effect:"A trained external operator network adds daily capacity and can clear routine account work. Until a quality layer is built, extra handoffs slightly increase incident risk.",
    tradeoff:"Fast capacity at a lower fixed cost than a large domestic team, with access-control, training, context and quality risk."}),
  Object.freeze({id:"distributed_qa",label:"Distributed quality and access controls",branch:"Distributed Team",year:2024,level:9,cost:2,requires:["distributed_ops","measurement"],
    investment:28000,monthly:3200,monthlyCategory:"facilitiesAdministration",
    effect:"Role-based access, calibration, review sampling and documented handoffs make the distributed network safer and more dependable.",
    tradeoff:"More reliable delegation, in exchange for a larger monthly vendor and management obligation."}),
  Object.freeze({id:"follow_the_sun",label:"Follow-the-sun operations",branch:"Distributed Team",year:2026,level:14,cost:3,requires:["distributed_qa","predictive_ops"],
    investment:75000,monthly:9000,monthlyCategory:"facilitiesAdministration",
    effect:"Regional handoffs extend routine coverage across the day, add major operating capacity and soften unresolved service debt. Critical decisions remain with the player.",
    tradeoff:"Very high throughput, but expensive coordination and more exposure to documentation or handoff failure."}),
  Object.freeze({id:"agentic_workbench",label:"Agentic account workbench",branch:"AI Operations",year:2025,level:11,cost:2,requires:["predictive_ops","portfolio_measurement"],
    investment:45000,monthly:3200,monthlyCategory:"softwareSubscriptions",
    effect:"Tool-using software agents prepare diagnostics, draft account changes and organize evidence. The player still reviews and commits every account decision.",
    tradeoff:"Less analysis and update labor, with added software cost and a continuing need for human review."}),
  Object.freeze({id:"agentic_ops",label:"Guardrailed agentic operations",branch:"AI Operations",year:2026,level:15,cost:3,requires:["agentic_workbench","agency_os"],
    investment:85000,monthly:7800,monthlyCategory:"softwareSubscriptions",
    effect:"Monitored multi-step workflows can clear more routine service work and reduce operating load. Critical incidents, client commitments and irreversible changes still require the player.",
    tradeoff:"Large capacity gain, balanced by recurring platform cost, supervision and automation-error risk."}),
  Object.freeze({id:"creative_automation",label:"Automated creative workbench",branch:"Creative Systems",year:2025,level:10,cost:2,requires:["creative_studio","agency_os"],
    investment:65000,monthly:4800,monthlyCategory:"softwareSubscriptions",
    effect:"Modular briefs, versioning, routing and review reduce the focus and cash needed to refresh creative across the roster.",
    tradeoff:"Faster iteration, but weak source material can now produce mediocre variations at greater speed."}),
  Object.freeze({id:"automated_creative_pipeline",label:"Automated creative pipeline",branch:"Creative Systems",year:2026,level:14,cost:3,requires:["creative_automation","short_form"],
    investment:140000,monthly:11000,monthlyCategory:"softwareSubscriptions",
    effect:"A connected brief-to-variation-to-quality-review pipeline raises creative coverage, slows roster-wide fatigue and supports owned funnels after a business-model pivot.",
    tradeoff:"Powerful production leverage with a serious monthly bill; human concept judgment and final approval remain necessary."}),
  Object.freeze({id:"workstation_fleet",label:"Creative workstation fleet",branch:"Infrastructure",year:2022,level:7,cost:2,requires:["creative_studio"],
    investment:70000,monthly:1600,monthlyCategory:"infrastructureHosting",
    effect:"High-memory editing and rendering workstations lower creative production cost and improve refresh throughput.",
    tradeoff:"A durable production asset that ties up cash and creates replacement, support and power costs."}),
  Object.freeze({id:"resilient_network",label:"Dual-provider network and power reserve",branch:"Infrastructure",year:2023,level:8,cost:1,requires:["agency_os"],
    investment:18000,monthly:700,monthlyCategory:"infrastructureHosting",
    effect:"A second terrestrial connection, battery-backed network rack and tested failover sharply reduce work lost to an office connectivity incident.",
    tradeoff:"Affordable continuity for the office; it cannot restore an ad platform, cloud vendor or regional utility failure."}),
  Object.freeze({id:"satellite_failover",label:"Low-orbit satellite failover",branch:"Infrastructure",year:2025,level:11,cost:2,requires:["resilient_network"],
    investment:35000,monthly:1500,monthlyCategory:"infrastructureHosting",
    effect:"A non-terrestrial backup route makes local internet failure far less likely to consume a workday.",
    tradeoff:"A resilient last-mile path, not a cure for platform downtime, cloud failure, weather, power loss or poor internal process."}),
  Object.freeze({id:"local_ai_cluster",label:"Local AI and render cluster",branch:"Infrastructure",year:2026,level:16,cost:3,requires:["workstation_fleet","agentic_workbench"],
    investment:250000,monthly:8500,monthlyCategory:"infrastructureHosting",
    effect:"On-site inference and render capacity accelerate approved agent workflows, large creative batches and sensitive first-party analysis.",
    tradeoff:"Exceptional throughput and data control, with a major cash purchase plus power, cooling, maintenance and utilization risk."}),
  Object.freeze({id:"affiliate_engine",label:"Affiliate scaling engine",branch:"Transformation",year:2021,cost:3,requires:["first_party","creative_studio"],
    effect:"Unlocks a one-way pivot from client retainers to owned funnel economics, delayed payouts and enforcement risk."})
]);

const AGENCY_ERAS=Object.freeze([
  Object.freeze({year:2017,title:"Manual-search foundation",copy:"Manual bids, query intent, negatives, Quality Score components and expanded search copy dominate the operating model.",flags:{manualSearch:true}}),
  Object.freeze({year:2018,title:"Social acquisition opens",copy:"Creative-led interruption buying becomes a viable expansion path, but only after the practice earns the capability.",flags:{socialOpportunity:true}}),
  Object.freeze({year:2019,title:"Automation enters the auction",copy:"The search interface changes and automated bidding becomes a strategic choice; old position habits lose value.",flags:{automationPressure:true}}),
  Object.freeze({year:2020,title:"Remote demand shock",copy:"Demand and account volatility widen. Process quality and cash reserves matter more than a clean average month.",flags:{volatility:1.08}}),
  Object.freeze({year:2021,title:"Signal-loss era",copy:"Privacy changes weaken one-to-one attribution and increase the value of customer and outcome data collected by the advertiser.",flags:{signalPressure:true}}),
  Object.freeze({year:2022,title:"Consolidated delivery",copy:"Platforms push broader automation while creative volume and feed quality become larger operating constraints.",flags:{automationPressure:true,creativePressure:true}}),
  Object.freeze({year:2023,title:"Modeled measurement",copy:"Teams increasingly reconcile platform claims with customer records and business outcomes instead of expecting one report to be complete.",flags:{signalPressure:true}}),
  Object.freeze({year:2024,title:"Creative-volume race",copy:"Iteration speed becomes a scaling limit across social and commerce accounts.",flags:{creativePressure:true}}),
  Object.freeze({year:2025,title:"AI-assisted operations",copy:"Automation expands production and analysis capacity, but review, strategy and accountability remain human constraints.",flags:{automationPressure:true}}),
  Object.freeze({year:2026,title:"Enforcement & resilience",copy:"Account durability, claims review, payment paths and concentration risk become core operating concerns.",flags:{enforcement:1.18}}),
  Object.freeze({year:2027,title:"Projected final season",copy:"The final season is a scenario, not an observed platform rulebook. Win by reaching it with the required cumulative business profit.",flags:{final:true}})
]);

const AGENCY_MILESTONES=Object.freeze([
  Object.freeze({month:1,target:1,label:"Month 1 · retain the founding client"}),
  Object.freeze({month:2,target:2,label:"Month 2 · service 2 small-business lead-generation clients"}),
  Object.freeze({month:3,target:5,label:"Month 3 · 5 active clients"}),
  Object.freeze({month:6,target:15,label:"Month 6 · 15 active clients"}),
  Object.freeze({month:12,target:30,label:"Year 1 · 30 active clients"}),
  Object.freeze({month:120,target:0,label:"2027 · career profit gate"})
]);

const AGENCY_INCIDENTS=Object.freeze([
  Object.freeze({id:"quality",label:"Lead quality softened",concept:"lead quality",trust:-5,health:-3,work:1,
    copy:"Downstream acceptance slipped while front-end volume still looks healthy. Diagnose intent, geography and measurement before blaming the ad account."}),
  Object.freeze({id:"tracking",label:"Tracking discrepancy",concept:"tracking",trust:-4,health:-2,work:2,
    copy:"The platform report and business outcome ledger no longer reconcile. An audit is due before a performance decision."}),
  Object.freeze({id:"creative",label:"Creative fatigue",concept:"fatigue",trust:-2,health:-5,work:1,
    copy:"Response has decayed faster than the normal service schedule. The account needs a fresh message or new creative."}),
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
  Object.freeze({id:"commerce",label:"Immediate-response commerce",baseMer:1.38,compliance:1.02})
]);
