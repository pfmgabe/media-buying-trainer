"use strict";
/* ---------------- analogy flavors: presentation only; mechanics and RNG never read these --- */
const FLAVOR_KEY="media-buying-trainer-flavor-v1";
const FLAVOR_TERM_KEYS=["buyer","account","campaign","group","creative","platform","algorithm","budget",
  "audience","fatigue","saturation","pixel","attribution","test","swap","review","client",
  "keyword","match","negative","bid","quality"];
const FLAVOR_METRIC_KEYS=["day","ad","spend","revenue","profit","roi","roas","cpm","ctr","cvr",
  "cpl","cpa","lead","conversion","win","loss","pending"];
function flavorTerms(values){
  return Object.fromEntries(FLAVOR_TERM_KEYS.map((key,index)=>[key,values[index]]));
}
function flavorMetrics(values){
  return Object.fromEntries(FLAVOR_METRIC_KEYS.map((key,index)=>[key,values[index]]));
}
const FLAVORS=[
  {id:"deckbuilder",name:"Deckbuilder",mark:"🃏",audience:"Balatro / Slay the Spire players",
   premise:"Build an economic deck, find synergies, and retire cards before their value decays.",
   signature:"Creative test ≈ card draft · Budget ≈ energy · Fatigue ≈ card decay · Scaling ≈ upgrading a proven card",
   metrics:flavorMetrics(["hand","card play","energy spent","gross chips","run score","score efficiency","gross-chip multiplier","cost per thousand deals","card-connect rate","scoring-combo rate","energy per scoring chance","energy per completed score","scoring chance","scored hand","blind cleared","run busted","chips waiting to score"]),
   terms:flavorTerms(["deck pilot","full deck","run strategy","card family","card","table rules","draw and scoring engine","energy pool","enemy pool","card decay","remaining scoring opportunities","combat log","score credit","card draft","replace a card","shop gate","stakeholder","card tag","targeting rule","banish card","energy commitment","card synergy"]),
   flow:"Impression → card dealt · Click → card connects · Lead or sale → points banked · Profit → run score",
   events:{quiet:"The draw is ordinary; fundamentals decide the hand.",viral:"A card found a rare multiplier pocket — exploit it while the hand is hot.",surge:"The blind got more expensive; the same energy buys fewer plays.",influencer:"A free multiplier entered the scoring chain for one hand.",copied:"A rival copied the combo; your strongest card decays sharply.",ios:"The score display is obscured, but chips still enter the bank.",glut:"The shop flooded with cheap plays; reach costs less this turn."}},
  {id:"jrpg",name:"JRPG Raid Party",mark:"⚔️",audience:"Final Fantasy / JRPG players",
   premise:"Command a raid party whose builds, resources, roles, and cooldowns must survive a volatile boss.",
   signature:"Top-of-funnel awareness ≈ Tank · Mid-funnel nurture ≈ Healer/support · Bottom-funnel conversion ≈ DPS · Pixel ≈ combat log",
   metrics:flavorMetrics(["combat turn","deployed party member","MP spent","loot earned","net loot / XP","XP efficiency","loot-per-MP multiplier","MP cost per thousand encounters","hit rate","loot-drop rate","MP per quest lead","MP per completed quest","quest lead","quest completion","boss cleared","party wipe","pending loot"]),
   terms:flavorTerms(["party leader","guild roster","battle plan","party formation","equipped weapon, ability or signature move","game world and battle system","battle rules and boss AI","MP pool","encounter pool","exhaustion","overfarmed zone","combat log","loot credit","recruit roll","swap party member","guild review","quest giver","quest-board target","aggro rule","status immunity","MP allocation","gear score"]),
   flow:"Impression → encounter · Click → landed hit · Lead or sale → loot drop · Profit → XP gained",
   events:{quiet:"The boss is in a neutral phase; rotations and resource discipline matter.",viral:"Limit Break: one party member found a huge damage window.",surge:"Enrage phase: every action costs more MP today.",influencer:"A guest ally applied a one-turn conversion buff.",copied:"The boss learned your best rotation; that party member jumps toward exhaustion.",ios:"The combat log is fogged, though loot still reaches inventory.",glut:"A low-cost encounter wave opened; MP buys more reach this turn."}},
  {id:"agriculture",name:"Precision Agriculture",mark:"🚜",audience:"systems and farming-sim players",
   premise:"Run a sensor-mapped irrigation system: route scarce water to productive fields and adapt before soil or demand is exhausted.",
   signature:"Audience ≈ field · Creative ≈ crop treatment · Budget ≈ water reserve · Bid ≈ valve setting · Pixel ≈ sensor network · Fatigue ≈ one treatment losing response · Saturation ≈ field capacity",
   metrics:flavorMetrics(["growing day","treatment application","water spent","gross harvest","net yield","yield efficiency","harvest-per-water ratio","water cost per thousand seedings","sprout rate","harvest-conversion rate","water per viable crop","water per harvest","viable crop","harvest","target yield met","crop failure","crop awaiting harvest"]),
   terms:flavorTerms(["irrigation manager","irrigation control console","growing plan","irrigation zone","crop treatment","growing environment and market","forecast and irrigation-response model","water reserve","field cohort","treatment-response decay","field capacity","sensor network","harvest traceability","trial plot","replant plot","agronomy review","farm owner","field prescription","irrigation rule","weed exclusion","valve setting","soil quality"]),
   flow:"Impression → seed exposure · Click → sprout · Lead or sale → harvest · Profit → net yield",
   events:{quiet:"Weather is normal; irrigation and field selection drive yield.",viral:"One plot hit perfect growing conditions for a short harvest window.",surge:"Water and land costs surged; the same reserve covers less ground.",influencer:"An organic demand bloom lifted harvest value today.",copied:"A neighboring farm planted the same crop; your best plot exhausts faster.",ios:"Field sensors are faulty, though produce still reaches the barn.",glut:"Extra acreage opened cheaply; water reaches more plots today."}},
  {id:"kitchen",name:"Restaurant Line",mark:"🍽️",audience:"Overcooked / restaurant-ops players",
   premise:"Run a service: choose the menu, pace tickets, prep new dishes, protect quality, and retire weak items.",
   signature:"Campaign ≈ service plan and menu strategy · Creative ≈ dish/presentation · Spend ≈ ingredients · Conversion ≈ plate served · Pipeline ≈ prep queue",
   metrics:flavorMetrics(["service","menu listing","ingredient spend","gross checks","nightly take","margin efficiency","sales-per-food-dollar","cost per thousand menu views","order-start rate","plate-completion rate","food cost per interested guest","food cost per served guest","interested guest","plate served","successful service","failed service","open checks"]),
   terms:flavorTerms(["expediter","whole restaurant","service plan","station","dish, description and presentation","service channel and dining market","ticket routing and guest demand","food budget","guest segment","menu fatigue","guest-demand capacity","order system","check attribution","test special","swap menu item","health check","restaurant owner","ingredient","order modifier","menu exclusion list","portion spend","dish quality"]),
   flow:"Impression → menu seen · Click → order started · Lead or sale → plate served · Profit → nightly take",
   events:{quiet:"Service is steady; prep and ticket discipline decide the shift.",viral:"One special caught fire and is flying out of the kitchen.",surge:"Ingredient prices jumped; every plate costs more tonight.",influencer:"A critic mention created a one-service demand rush.",copied:"The restaurant next door copied the special; diners tire of it faster.",ios:"The order screen is dropping item credit, though checks still close.",glut:"Extra table inventory opened; serving new guests costs less."}},
  {id:"f1",name:"Formula Race Engineering",mark:"🏎️",audience:"motorsport and racing-strategy players",
   premise:"Tune a car-and-driver package, manage tires and fuel, read telemetry, and adapt to track conditions.",
   signature:"Creative ≈ car/driver package · Budget ≈ fuel · Fatigue ≈ tire wear · Rotation ≈ pit stop · Rapid scaling risk ≈ overdriving the car · Pixel ≈ telemetry",
   metrics:flavorMetrics(["race stint","car entry","fuel spent","gross points value","net championship points","points efficiency","points-per-fuel multiplier","fuel cost per thousand lap starts","sector-win rate","finish-conversion rate","fuel per opportunity","fuel per points finish","passing opportunity","points-scoring finish","podium / target cleared","DNF","laps awaiting classification"]),
   terms:flavorTerms(["race engineer","race operation","race strategy","car setup","car-and-driver package","circuit and racing series","race-control, timing and track model","fuel allocation","fan/customer segment","tire wear","market-reach ceiling","telemetry sensor","lap attribution","test stint","driver or setup swap","scrutineering","team principal","setup parameter","tire compound rule","avoidance map","fuel flow","aero efficiency"]),
   flow:"Impression → lap started · Click → sector won · Lead or sale → lap completed · Profit → championship points",
   events:{quiet:"Track conditions are stable; setup and tire management decide pace.",viral:"A perfect tire window unlocked exceptional pace for one car.",surge:"Traffic and track costs rose; each lap burns more fuel.",influencer:"A safety-car-style opening created a one-lap conversion advantage.",copied:"A rival copied your setup; your best package wears faster.",ios:"Telemetry is partial, though the timing line still records real laps.",glut:"Clean track space opened; fuel buys more laps today."}},
  {id:"fishing",name:"Deep-Sea Fishing",mark:"🎣",audience:"resource and survival-game players",
   premise:"Choose grounds, deploy boats and lures, read sonar, protect the fishery, and move before a patch is depleted.",
   signature:"Broad targeting ≈ trawl net · Retargeting ≈ a tagged returning school / known hot spot · Creative ≈ lure · Budget ≈ fuel · Lead or sale ≈ landed catch",
   metrics:flavorMetrics(["fishing day","deployed rig","fuel spent","gross catch value","voyage margin","catch efficiency","catch-value-per-fuel multiplier","fuel cost per thousand casts","bite rate","landing rate","fuel per promising bite","fuel per landed catch","promising bite","landed catch","quota / target landed","empty net","catch awaiting market"]),
   terms:flavorTerms(["fleet captain","whole fleet","voyage plan","fishing ground","lure and bait presentation","fishery and market","currents, weather and sonar model","fuel reserve","grounds and buyer segment","lure-response decay","depleted grounds","sonar","catch attribution","test cast","change lure","harbor inspection","fleet owner","bait signal","net width","bycatch exclusion","fuel commitment","catch quality"]),
   flow:"Impression → cast · Click → bite · Lead or sale → landed catch · Profit → voyage margin",
   events:{quiet:"Seas are normal; grounds, lure, and fuel discipline drive the catch.",viral:"One lure found a dense school for a short window.",surge:"Fuel costs and auction competition rose; each cast costs more.",influencer:"An outside signal pushed a school toward your boats today.",copied:"A rival fleet copied the lure; the school learns and lure wear spikes.",ios:"Sonar attribution is fogged, though fish still land on deck.",glut:"Open water inventory expanded; each cast reaches more fish."}},
  {id:"mixing",name:"Audio Mixing Console",mark:"🎚️",audience:"music-production and rhythm players",
   premise:"Balance channels, preserve headroom, read meters, replace tired takes, and judge the whole mix — not one loud track.",
   signature:"Platforms ≈ channel faders · Audience tuning ≈ EQ · Exclusions ≈ frequency cuts · Creative ≈ track/take · Budget ≈ promotion resources · Available credit ≈ headroom · Pixel ≈ meter",
   metrics:flavorMetrics(["mix pass","channel on air","promotion spend","gross output value","clean-master margin","mix efficiency","output-per-promotion-dollar multiplier","promotion cost per thousand plays","attention-transient rate","listener-commit rate","promotion cost per interested listener","promotion cost per committed customer","interested listener","listener commitment","clean master","clipped mix","unresolved signal"]),
   terms:flavorTerms(["mix engineer","full mix","session plan","channel bus","track or take","playback channel and venue","distribution and room response","promotion budget","listener segment","ear fatigue","listener-pool ceiling","meter","mix credit","A/B take","swap take","quality control","artist or label","frequency","routing rule","noise gate","gain setting","signal quality"]),
   flow:"Impression → signal played · Click → transient lands · Lead → listener commits · Sale → fan/customer converts · Profit → master level",
   events:{quiet:"The room is neutral; balance and clean gain staging decide the mix.",viral:"One take hit a resonant frequency and cuts through brilliantly.",surge:"The noise floor rose; the same signal costs more headroom.",influencer:"A guest feature boosted the conversion channel for one pass.",copied:"A rival sampled your hook; listener fatigue spikes on that track.",ios:"A meter is under-reading, though the master output is still real.",glut:"The room opened up; the same promotion budget buys more plays."}},
  {id:"vc",name:"Venture Portfolio",mark:"📈",audience:"capital-allocation and strategy players",
   premise:"Allocate capital across bets, run diligence, fund breakout winners, preserve optionality, and mark returns honestly.",
   signature:"Account ≈ portfolio · Ad ≈ deployed distribution bet · Creative ≈ pitch/positioning package · Spend ≈ invested capital · CPL/ROAS ≈ unit economics/return · Fatigue ≈ growth decay",
   metrics:flavorMetrics(["investment period","deployed distribution bet","capital deployed","gross return","net fund return","capital efficiency","gross return multiple","capital per thousand market exposures","qualified-interest rate","realized-conversion rate","capital per qualified lead","capital per acquisition","qualified lead","realized customer","target return","write-off","unrealized return"]),
   terms:flavorTerms(["portfolio manager","fund portfolio","investment thesis","sector sleeve","pitch/positioning package","market","market regime","dry powder","customer market","growth decay","market capacity","reporting stack","return attribution","pilot investment","rotate positioning package","diligence gate","limited partner","deal signal","mandate","exclusion list","capital allocation","unit economics"]),
   flow:"Impression → market exposure · Click → qualified interest · Lead or sale → realized return · Profit → fund performance",
   events:{quiet:"The market regime is stable; underwriting and allocation drive returns.",viral:"One holding found breakout product-market fit.",surge:"Market pricing expanded; the same capital buys less exposure.",influencer:"A strategic endorsement opened a one-day demand window.",copied:"A rival entered your best thesis; growth decay accelerates.",ios:"Company-level reporting is incomplete, though cash still reaches the fund.",glut:"Cheap inventory expanded; dry powder buys more exposure."}},
  {id:"dnd",name:"D20 Adventure (D&D)",mark:"🎲",audience:"D&D and tabletop RPG players",
   premise:"Lead an adventuring party: choose the quest, equip the party, allocate gold and adapt when the campaign world pushes back.",
   signature:"Evergreen image ≈ Fighter · Viral user-generated content ≈ Rogue · Founder video ≈ Wizard · Retargeting offer ≈ Cleric · Residual delivery uncertainty ≈ d20 modified by creative quality and targeting",
   metrics:flavorMetrics(["adventure day","deployed adventurer","gold spent","gross loot","gold retained","gold efficiency","loot-per-gold multiplier","gold cost per thousand encounters","attack-hit rate","loot-conversion rate","gold per quest lead","gold per completed quest","quest lead","quest completion","encounter won","party wipe","loot awaiting identification"]),
   terms:flavorTerms(["party leader","party charter and campaign record","quest arc","encounter plan","equipped weapon, prepared spell or readied item","game world and rules","encounter rules, modifiers and dice","gold pool","encounter population","exhaustion and spent abilities","depleted quest region","campaign log and divination record","quest-credit ledger","trial encounter","change loadout or party member","table-rules review","patron or quest giver","quest-board posting","how broadly a posting is read","quest the party refuses","gold commitment","character and gear fit"]),
   flow:"Impression → encounter · Click → attack lands · Lead or sale → loot won · Profit → gold retained",
   events:{quiet:"Encounter conditions are ordinary today; party composition and gold discipline decide the result.",viral:"Natural 20: one adventurer found an unusually favorable pocket.",surge:"Natural 1: the game world turned hostile, and each encounter now costs more gold.",influencer:"Bardic Inspiration created a one-turn conversion buff.",copied:"The encounter adapted to your best tactic; that adventurer jumps toward exhaustion.",ios:"The campaign log is incomplete, though loot still reaches the party treasury.",glut:"A large field of easier encounters opened; gold buys more reach."}}
];
/* Keep stable flavor IDs for saves and links while presenting the most familiar
   professional analogies first and explicitly game-shaped lenses last. */
const FLAVOR_DISPLAY_ORDER=Object.freeze([
  "vc","f1","kitchen","agriculture","mixing","fishing",
  "deckbuilder","jrpg","dnd"
]);
/* Retired lenses (2026-08-09). To The Moon's audience is largely non-gamers, and two lenses
   did not serve them: Evolutionary Lab leaned on a frame many players do not share, and
   Fighting-Game Neutral assumed genre fluency almost none of them have. The IDs stay mapped
   so old saves and links resolve to a live lens instead of failing. */
const RETIRED_FLAVOR_IDS=Object.freeze({evolution:"agriculture",fighting:"deckbuilder"});
const ORDERED_FLAVORS=Object.freeze(FLAVOR_DISPLAY_ORDER.map(id=>FLAVORS.find(flavor=>flavor.id===id)));
const FLAVOR_EXTRA_METRICS={
  deckbuilder:{impression:"card dealt",click:"card connection",reach:"unique hands reached",frequency:"repeat-deal rate",cpc:"energy per connection",epl:"chips per scoring chance",lpctr:"shop-through rate",mer:"whole-deck return multiple",impressionShare:"deal coverage"},
  jrpg:{impression:"encounter",click:"landed hit",reach:"unique enemies reached",frequency:"repeat-encounter rate",cpc:"MP per landed hit",epl:"loot per quest lead",lpctr:"checkpoint-through rate",mer:"party loot multiple",impressionShare:"encounter coverage"},
  fighting:{impression:"approach",click:"hit confirm",reach:"unique openings reached",frequency:"repeated-string rate",cpc:"meter per confirm",epl:"damage value per opening",lpctr:"confirm-to-combo rate",mer:"round return multiple",impressionShare:"neutral control"},
  agriculture:{impression:"seed exposure",click:"sprout",reach:"acreage reached",frequency:"rewatering rate",cpc:"water per sprout",epl:"crop value per viable plant",lpctr:"field-to-offer progression",mer:"whole-farm yield multiple",impressionShare:"field coverage"},
  evolution:{impression:"environmental exposure",click:"survival signal",reach:"population reached",frequency:"repeat-exposure rate",cpc:"energy per survival signal",epl:"value per viable specimen",lpctr:"assay-progression rate",mer:"population fitness multiple",impressionShare:"habitat coverage"},
  kitchen:{impression:"menu view",click:"order start",reach:"unique guests reached",frequency:"repeat-menu exposure",cpc:"ingredient cost per order start",epl:"check value per interested guest",lpctr:"line-throughput rate",mer:"restaurant return multiple",impressionShare:"service coverage"},
  f1:{impression:"lap start",click:"sector win",reach:"track segments reached",frequency:"repeat-lap rate",cpc:"fuel per sector win",epl:"points value per opportunity",lpctr:"pit-to-finish progression",mer:"race-operation return multiple",impressionShare:"track coverage"},
  fishing:{impression:"cast",click:"bite",reach:"waters reached",frequency:"repeat-cast rate",cpc:"fuel per bite",epl:"catch value per promising bite",lpctr:"bite-to-landing progression",mer:"fleet catch multiple",impressionShare:"grounds coverage"},
  mixing:{impression:"play",click:"transient landed",reach:"unique listeners reached",frequency:"replay frequency",cpc:"headroom per transient",epl:"value per interested listener",lpctr:"signal-to-commit rate",mer:"mix output multiple",impressionShare:"channel coverage"},
  vc:{impression:"market exposure",click:"qualified interest",reach:"unique prospects reached",frequency:"repeat-touch rate",cpc:"capital per qualified interest",epl:"value per qualified lead",lpctr:"funnel-progression rate",mer:"fund gross multiple",impressionShare:"market coverage"},
  dnd:{impression:"encounter",click:"attack landed",reach:"unique monsters reached",frequency:"repeat-encounter rate",cpc:"gold per landed attack",epl:"loot per quest lead",lpctr:"quest-path progression",mer:"party loot multiple",impressionShare:"dungeon coverage"}
};
const FLAVOR_EXTRA_TERMS={
  deckbuilder:{turn:"hand played",log:"run ledger",bench:"sideboard",holding:"full tournament run",operatingCompany:"deck archetype",initiative:"card lane",cash:"banked chips",credit:"borrowed energy",receivable:"unscored chips",crisis:"boss modifier",demand:"draw pool",accountView:"full-run scoreboard",attributedView:"card-scoring report",targeting:"deck-search rule"},
  jrpg:{turn:"combat turn",log:"battle chronicle",bench:"reserve roster",holding:"world campaign",operatingCompany:"guild",initiative:"raid lane",cash:"treasury gold",credit:"borrowed MP",receivable:"pending loot",crisis:"urgent quest",demand:"encounter pool",accountView:"party treasury",attributedView:"combat-log credit",targeting:"targeting command"},
  fighting:{turn:"round exchange",log:"match replay",bench:"character bench",holding:"tournament run",operatingCompany:"team bracket",initiative:"matchup lane",cash:"life lead banked",credit:"borrowed meter",receivable:"unconfirmed damage",crisis:"matchup emergency",demand:"neutral openings",accountView:"match scoreboard",attributedView:"hit-confirm report",targeting:"spacing plan"},
  agriculture:{turn:"irrigation cycle",log:"field ledger",bench:"seed reserve",holding:"farm network",operatingCompany:"farm operation",initiative:"irrigation program",cash:"harvest proceeds",credit:"borrowed water capacity",receivable:"crop awaiting market",crisis:"field alert",demand:"market demand",accountView:"whole-farm ledger",attributedView:"sensor-attributed harvest",targeting:"sensor-guided valve plan"},
  evolution:{turn:"generation cycle",log:"lab notebook",bench:"specimen reserve",holding:"research ecosystem",operatingCompany:"lineage",initiative:"selection trial",cash:"realized fitness value",credit:"borrowed energy",receivable:"pending descendants",crisis:"environmental shock",demand:"habitat capacity",accountView:"population outcome",attributedView:"assay-attributed outcome",targeting:"selection boundary"},
  kitchen:{turn:"service cycle",log:"ticket rail",bench:"prep station",holding:"restaurant group",operatingCompany:"restaurant",initiative:"service station",cash:"closed checks",credit:"supplier tab",receivable:"open checks",crisis:"rush ticket",demand:"guest demand",accountView:"whole-house P&L",attributedView:"ticket attribution",targeting:"seating plan"},
  f1:{turn:"race lap",log:"telemetry log",bench:"garage reserve",holding:"race program",operatingCompany:"constructor team",initiative:"race-entry lane",cash:"banked points value",credit:"borrowed fuel allowance",receivable:"points awaiting classification",crisis:"pit-wall alert",demand:"track opportunity",accountView:"team championship ledger",attributedView:"timing attribution",targeting:"race-line plan"},
  fishing:{turn:"fishing cycle",log:"captain's log",bench:"harbor reserve",holding:"fleet network",operatingCompany:"fleet",initiative:"vessel route",cash:"sold catch",credit:"borrowed fuel",receivable:"catch awaiting market",crisis:"maritime alert",demand:"fishery capacity",accountView:"fleet ledger",attributedView:"sonar-attributed catch",targeting:"grounds plan"},
  mixing:{turn:"mix pass",log:"session notes",bench:"alternate-take rack",holding:"studio catalog",operatingCompany:"record project",initiative:"channel route",cash:"mastered value",credit:"borrowed headroom",receivable:"unresolved signal",crisis:"signal fault",demand:"listener demand",accountView:"full-mix meter",attributedView:"channel attribution",targeting:"EQ and routing plan"},
  vc:{turn:"allocation period",log:"investment memo log",bench:"watchlist",holding:"fund complex",operatingCompany:"portfolio company",initiative:"growth channel",cash:"realized proceeds",credit:"fund facility",receivable:"unrealized return",crisis:"portfolio alert",demand:"market opportunity flow",accountView:"fund ledger",attributedView:"deal attribution",targeting:"investment mandate"},
  dnd:{turn:"encounter turn",log:"campaign journal",bench:"tavern roster",holding:"campaign setting",operatingCompany:"adventuring guild",initiative:"quest lane",cash:"party treasury",credit:"borrowed gold",receivable:"loot awaiting identification",crisis:"urgent encounter",demand:"encounter pool",accountView:"party treasury ledger",attributedView:"loot-credit report",targeting:"encounter targeting rule"}
};
FLAVORS.forEach(flavor=>{Object.assign(flavor.metrics,FLAVOR_EXTRA_METRICS[flavor.id]||{});Object.assign(flavor.terms,FLAVOR_EXTRA_TERMS[flavor.id]||{});flavor.canonicalFlow=flavorCanonicalFlow(flavor);});
const FLAVOR_BY_ID=Object.fromEntries(FLAVORS.map(flavor=>[flavor.id,flavor]));
function liveFlavorId(id){const key=String(id||"");
  if(FLAVOR_BY_ID[key])return key;
  const retired=typeof RETIRED_FLAVOR_IDS!=="undefined"?RETIRED_FLAVOR_IDS[key]:null;
  return retired&&FLAVOR_BY_ID[retired]?retired:"";}
const FLAVOR_REASONING=Object.freeze({
  deckbuilder:Object.freeze({why:"Both systems reward drafting several uncertain options, reading interaction effects, and putting more resources behind proven combinations before repetition erodes them.",boundary:"An ad auction has no fixed deck order: delivery, attribution, and market response remain probabilistic."}),
  jrpg:Object.freeze({why:"A portfolio works like a party because different ads fill different funnel roles, share limited resources, and must rotate when one member is exhausted.",boundary:"People are not enemies and the platform is not choosing a fair boss pattern; business outcomes still come from measured customer behavior."}),
  fighting:Object.freeze({why:"Both reward timing, match-up fit, controlled resource use, and changing a repeated pattern once the other side has adapted.",boundary:"Auction response is statistical rather than a deterministic frame-data exchange."}),
  agriculture:Object.freeze({why:"Both allocate a scarce input across heterogeneous fields, use noisy sensors, and improve yield by matching treatment to local conditions.",boundary:"An audience is not soil: fatigue belongs to the repeated creative treatment, while saturation belongs to reachable demand."}),
  evolution:Object.freeze({why:"Both create variation, expose it to selection pressure, retain high-fitness variants, and preserve diversity when the environment changes.",boundary:"Media buyers design tests intentionally; platform delivery is not biological inheritance or natural selection."}),
  kitchen:Object.freeze({why:"Both coordinate a live service, limited inputs, a prep pipeline, quality control, and rapid removal of an item that no longer satisfies demand.",boundary:"A conversion is a measured customer outcome, not a plate, and attribution can credit several touchpoints for one result."}),
  f1:Object.freeze({why:"Both combine a configurable package, telemetry, resource pacing, changing conditions, and planned refreshes before performance falls away.",boundary:"Media delivery is an auction across people and placements, not a closed circuit with a fixed finish line."}),
  fishing:Object.freeze({why:"Both choose where to search, commit finite fuel, test lures, read imperfect signals, and leave a depleted pocket before returns collapse.",boundary:"Targeted audiences are people with intent and privacy constraints, not a harvestable natural resource."}),
  mixing:Object.freeze({why:"Both require balancing several channels, tracing signal paths, preserving capacity, and judging the combined output instead of the loudest meter.",boundary:"Spend is a monetary flow, not audio headroom, and causal business lift cannot be heard on a channel strip."}),
  vc:Object.freeze({why:"Both allocate scarce capital across uncertain bets, stage tests, double down on evidence, and manage concentration and liquidity risk.",boundary:"A creative is a positioning asset inside a media initiative — not a company — and modeled value is not a marked investment return."}),
  dnd:Object.freeze({why:"Both reward a sound plan before an uncertain encounter: the buyer chooses the objective, audience, creative and budget, while the delivery system resolves opportunities the buyer cannot command directly.",boundary:"A platform is not a Dungeon Master, an audience is not an enemy, and delivery is not a fair die roll. Auctions, customer behavior, attribution and cash timing remain real business systems."})
});
/* Exact aliases keep neighboring media objects distinct. These are presentation-only;
   the canonical media-buying term is always rendered first by the glossary. */
const FLAVOR_CONTEXT_ALIASES=Object.freeze({
  deckbuilder:Object.freeze({advertiserWorkstream:"advertiser-specific scoring deck",placement:"board slot",vertical:"deck archetype",geo:"act-map region",demo:"enemy class",
    tracking:"score-tracking ledger",contamination:"cross-deck scoring bleed",cluster:"shared combat-log package",approval:"shop-cleared card",compliance:"table-legality rules",
    complianceHold:"card quarantined by table rules",accountHold:"entire deck suspended from the run",relevance:"card-to-blind fit",qualityScore:"three-check card-fit readout",expectedCtr:"estimated card-connect chance",landingExperience:"scoring-board path quality",expandedTextAd:"expanded-format, two-title intent card",adPermutation:"two card copies differing by one modifier",
    avgPosition:"draw-order position",creativeRarity:"card rarity tier",band:"expected score range"}),
  jrpg:Object.freeze({advertiserWorkstream:"one guild raid team",placement:"battlefield row",vertical:"quest category",geo:"world-map region",demo:"enemy class",
    tracking:"battle-telemetry ledger",contamination:"cross-party combat-log bleed",cluster:"shared combat-log crystal",approval:"guild-cleared party member",compliance:"guild legality rules",
    complianceHold:"party member benched by guild rules",accountHold:"entire raid roster locked by the guild",relevance:"skill-to-enemy affinity",qualityScore:"three-stat encounter-fit diagnostic",expectedCtr:"predicted hit chance",landingExperience:"quest-chamber handoff quality",expandedTextAd:"two-title quest-board spell",adPermutation:"two party builds differing by one skill",
    avgPosition:"turn-order position",creativeRarity:"party-member rarity",band:"expected damage range"}),
  fighting:Object.freeze({advertiserWorkstream:"one sponsored player run",placement:"stage position",vertical:"matchup class",geo:"tournament region",demo:"opponent archetype",
    tracking:"input-replay capture",contamination:"cross-controller input bleed",cluster:"shared input-display rig",approval:"tournament-legal move",compliance:"tournament ruleset",
    complianceHold:"move disabled by tournament ruling",accountHold:"player entry disqualified",relevance:"move-to-matchup fit",qualityScore:"three-check matchup-readiness diagnostic",expectedCtr:"predicted hit-confirm chance",landingExperience:"combo-route handoff quality",expandedTextAd:"two-beat intent-matched move list",adPermutation:"two strings differing by one move property",
    avgPosition:"screen-position average",creativeRarity:"move-tier rarity",band:"expected damage range"}),
  agriculture:Object.freeze({advertiserWorkstream:"one crop program",placement:"plot location",vertical:"crop line",geo:"growing region",demo:"field cohort",
    tracking:"field-telemetry ledger",contamination:"cross-field sensor drift",cluster:"shared sensor array",approval:"agronomy-cleared treatment",compliance:"crop-treatment rules",
    complianceHold:"treatment quarantined by agronomy review",accountHold:"full farm delivery program paused",relevance:"seed-to-field fit",qualityScore:"three-reading field-fit diagnostic",expectedCtr:"predicted sprout chance",landingExperience:"trial-plot handoff quality",expandedTextAd:"two-title intent-matched seed listing",adPermutation:"two treatments differing by one input",
    avgPosition:"canopy-position average",creativeRarity:"seed-grade rarity",band:"expected yield range"}),
  evolution:Object.freeze({advertiserWorkstream:"one funded lineage",placement:"habitat microzone",vertical:"species niche",geo:"habitat region",demo:"organism cohort",
    tracking:"lineage assay trail",contamination:"sample cross-contamination",cluster:"shared assay batch",approval:"ethics-cleared phenotype",compliance:"bioethics protocol",
    complianceHold:"phenotype quarantined by ethics review",accountHold:"selection program suspended",relevance:"phenotype-to-habitat fit",qualityScore:"three-factor environment-fit diagnostic",expectedCtr:"predicted survival-signal chance",landingExperience:"assay handoff quality",expandedTextAd:"two-title intent-matched trait listing",adPermutation:"two phenotypes differing by one trait",
    avgPosition:"competitive-rank average",creativeRarity:"mutation rarity",band:"expected fitness range"}),
  kitchen:Object.freeze({advertiserWorkstream:"one restaurant concept",placement:"menu or section position",vertical:"cuisine line",geo:"delivery zone",demo:"diner cohort",
    tracking:"ticket-level order trail",contamination:"cross-station ticket bleed",cluster:"shared order-system terminal group",approval:"chef-cleared menu item",compliance:"food-safety rules",
    complianceHold:"dish held at health check",accountHold:"whole restaurant service suspended",relevance:"dish-to-guest fit",qualityScore:"three-check ticket-readiness diagnostic",expectedCtr:"predicted order-start chance",landingExperience:"menu-to-checkout path quality",expandedTextAd:"two-title intent-matched menu listing",adPermutation:"two specials differing by one menu claim",
    avgPosition:"menu-position average",creativeRarity:"special rarity tier",band:"expected margin range"}),
  f1:Object.freeze({advertiserWorkstream:"one sponsor-backed car program",placement:"grid position",vertical:"racing class",geo:"circuit market",demo:"fan cohort",
    tracking:"lap-telemetry trail",contamination:"crossed telemetry channels",cluster:"shared telemetry bus",approval:"scrutineering-cleared package",compliance:"technical regulations",
    complianceHold:"car held in scrutineering",accountHold:"constructor entry barred from the race",relevance:"setup-to-circuit fit",qualityScore:"three-reading package-fit diagnostic",expectedCtr:"predicted sector-win chance",landingExperience:"pit-entry-to-finish path quality",expandedTextAd:"two-title intent-matched entry copy",adPermutation:"two setups differing by one parameter",
    avgPosition:"average grid position",creativeRarity:"component rarity",band:"expected lap-time range"}),
  fishing:Object.freeze({advertiserWorkstream:"one licensed vessel program",placement:"grounds waypoint",vertical:"catch category",geo:"fishing region",demo:"species cohort",
    tracking:"catch-and-sonar log",contamination:"sonar cross-talk",cluster:"shared sonar array",approval:"harbor-cleared rig",compliance:"fishery rules",
    complianceHold:"rig held at harbor inspection",accountHold:"fleet grounded",relevance:"lure-to-species fit",qualityScore:"three-reading grounds-fit diagnostic",expectedCtr:"predicted bite chance",landingExperience:"bait-zone-to-landing path quality",expandedTextAd:"two-title intent-matched tackle listing",adPermutation:"two lures differing by one signal",
    avgPosition:"average depth position",creativeRarity:"lure rarity",band:"expected catch range"}),
  mixing:Object.freeze({advertiserWorkstream:"one release-campaign session",placement:"channel or playlist slot",vertical:"genre",geo:"listener market",demo:"listener cohort",
    tracking:"metering path",contamination:"cross-channel signal bleed",cluster:"shared meter bus",approval:"quality-control-cleared take",compliance:"rights and quality-control rules",
    complianceHold:"take muted pending rights review",accountHold:"full session locked",relevance:"take-to-listener fit",qualityScore:"three-meter signal-path diagnostic",expectedCtr:"predicted attention-transient chance",landingExperience:"track-page handoff quality",expandedTextAd:"two-title intent-matched search take",adPermutation:"two takes differing by one arrangement choice",
    avgPosition:"playlist-position average",creativeRarity:"take rarity",band:"acceptable meter range"}),
  vc:Object.freeze({advertiserWorkstream:"one portfolio-company growth program",placement:"distribution-channel slot",vertical:"investment sector",geo:"market region",demo:"customer segment",
    tracking:"portfolio reporting trail",contamination:"cross-company data leakage",cluster:"shared reporting-stack instance",approval:"diligence-cleared investment",compliance:"fund mandate",
    complianceHold:"deal held by mandate review",accountHold:"fund deployment frozen",relevance:"company-to-market fit",qualityScore:"three-check market-fit diagnostic",expectedCtr:"predicted qualified-interest chance",landingExperience:"diligence-room handoff quality",expandedTextAd:"two-title intent-capture memo",adPermutation:"two positioning packages differing by one proof point",
    avgPosition:"deal-rank average",creativeRarity:"deal rarity",band:"underwriting range"}),
  dnd:Object.freeze({advertiserWorkstream:"one adventuring party",placement:"dungeon room or encounter square",vertical:"quest type",geo:"realm region",demo:"monster class",
    tracking:"scrying trail",contamination:"crossed scrying signals",cluster:"shared scrying-rune network",approval:"guild-cleared adventurer",compliance:"guild law and table rules",
    complianceHold:"adventurer held by guild ruling",accountHold:"whole campaign table suspended",relevance:"class-to-encounter fit",qualityScore:"three-check encounter-readiness diagnostic",expectedCtr:"predicted attack-hit chance",landingExperience:"quest-chamber handoff quality",expandedTextAd:"two-title Diviner intent spell",adPermutation:"two character builds differing by one ability",
    avgPosition:"initiative-order position",creativeRarity:"character rarity tier",band:"expected roll range"})
});
const CREATIVE_FORMAT_ALIAS_KEYS=Object.freeze(["story","vsl","podcast","slideshow","veo","news_greenscreen","documentary","meme","voicemail","static","animation","branded","native_long_copy","long_copy_video","search"]);
const FLAVOR_CREATIVE_FORMAT_ALIASES=Object.freeze({
  deckbuilder:Object.freeze({static:"steady evergreen card",rendered:"generated-scene card",motion:"animated combo card",ugc:"high-roll testimonial card",founder:"slow-build authority card",
    native:"camouflaged table card",utility:"interface-effect card",lifestyle:"scenario card",ctv:"full-board spectacle card",search:"intent-tagged text card"}),
  jrpg:Object.freeze({static:"Fighter portrait unit",rendered:"Summoner scene unit",motion:"Limit-Break animation",ugc:"Thief field-report video",founder:"Sage explainer",
    native:"Scout dispatch",utility:"Machinist interface unit",lifestyle:"side-quest scene",ctv:"full-party summon cinematic",search:"quest-board text and skills"}),
  fighting:Object.freeze({static:"reliable standing-normal panel",rendered:"stylized arena scene",motion:"animated special-move clip",ugc:"player-cam combo clip",founder:"coach matchup breakdown",
    native:"platform-native poke",utility:"frame-data interface",lifestyle:"character-story still",ctv:"full-screen super cinematic",search:"intent-matched move list"}),
  agriculture:Object.freeze({static:"reliable field still",rendered:"modeled crop scene",motion:"animated growth cycle",ugc:"grower field report",founder:"agronomist explainer",
    native:"market-native field notice",utility:"yield-calculator panel",lifestyle:"life-stage farm still",ctv:"broadcast harvest spot",search:"intent-matched seed listing"}),
  evolution:Object.freeze({static:"stable phenotype plate",rendered:"modeled habitat specimen",motion:"animated adaptation sequence",ugc:"field-observer testimony",founder:"principal-investigator explainer",
    native:"habitat-cam specimen",utility:"assay-interface phenotype",lifestyle:"life-history scene",ctv:"ecosystem broadcast sequence",search:"intent-matched trait listing"}),
  kitchen:Object.freeze({static:"menu-board still",rendered:"styled plated-dish scene",motion:"animated prep sequence",ugc:"diner reaction video",founder:"chef explainer",
    native:"feed-native special",utility:"order-form interface",lifestyle:"dining-occasion still",ctv:"full-screen restaurant spot",search:"intent-matched menu text"}),
  f1:Object.freeze({static:"reliable car beauty still",rendered:"simulated race scene",motion:"animated telemetry clip",ugc:"driver-cam reaction clip",founder:"race-engineer explainer",
    native:"paddock-native update",utility:"telemetry-dashboard unit",lifestyle:"race-weekend still",ctv:"full-screen race film",search:"intent-matched entry copy"}),
  fishing:Object.freeze({static:"lure-and-catch still",rendered:"modeled ocean scene",motion:"animated lure action",ugc:"deckhand catch report",founder:"captain explainer",
    native:"dockside-native notice",utility:"sonar-interface unit",lifestyle:"voyage-life still",ctv:"full-screen fleet story",search:"intent-matched tackle listing"}),
  mixing:Object.freeze({static:"single-cover still",rendered:"designed session artwork",motion:"animated visualizer",ugc:"artist phone-take",founder:"producer explainer",
    native:"feed-native demo take",utility:"console-interface unit",lifestyle:"studio-life still",ctv:"full-screen music spot",search:"intent-matched text and extensions"}),
  vc:Object.freeze({static:"one-page company snapshot",rendered:"modeled market scene",motion:"animated metrics brief",ugc:"customer testimonial clip",founder:"founder thesis video",
    native:"feed-native company memo",utility:"product-dashboard proof",lifestyle:"customer-context still",ctv:"full-screen brand thesis",search:"intent-matched demand-capture copy"}),
  dnd:Object.freeze({static:"Fighter card — steady evergreen visual",rendered:"Illusionist card — constructed scene",motion:"Sorcerer card — animated spell burst",ugc:"Rogue card — native high-critical testimony",
    founder:"Wizard card — slow-build trust spell",native:"Ranger card — environment-blending message",utility:"Artificer card — interactive-looking tool",lifestyle:"Druid card — life-context scene",
    ctv:"Bard card — full-party broadcast performance",search:"Diviner text and assets — expressed-intent spellbook"})
});
const CREATIVE_FORMAT_TERM_TO_ID=Object.freeze({
  "story ad":"story","story ad (stories)":"story","vsl":"vsl","podcast creative":"podcast","slideshow":"slideshow",
  "veo creative":"veo","veo (ai-gen video)":"veo","news greenscreen":"news_greenscreen","nat geo documentary":"documentary",
  "memes":"meme","voicemail creative":"voicemail","static":"static","animation":"animation","branded creative":"branded",
  "native long-copy":"native_long_copy","long-copy to video":"long_copy_video",
  "static image":"static","rendered scene":"animation","motion graphic":"animation","ugc video":"story","founder / explainer":"vsl",
  "native display creative":"native","native display":"native","input / ui utility":"utility","lifestyle static":"lifestyle",
  "ctv spot":"ctv","search text / assets":"search"
});
function genericCreativeFormatAnalogy(id,f,legacy={}){
  if(legacy[id])return legacy[id];
  const creative=f.terms.creative.toLowerCase();
  return ({
    story:`fast three-beat ${creative} sequence`,vsl:`slow-build sequenced ${creative} argument`,
    podcast:`two-voice ${creative} proof session`,slideshow:`modular ${creative} sequence`,
    veo:`rapidly generated experimental ${creative}`,news_greenscreen:`topical reaction-style ${creative}`,
    documentary:`cinematic field-story ${creative}`,meme:`high-volatility cultural-joke ${creative}`,
    voicemail:`recorded-message curiosity ${creative}`,static:`single-frame reliable ${creative}`,
    animation:`designed-motion ${creative}`,branded:`polished authority-building ${creative}`,
    native_long_copy:`long-form native ${creative} argument`,long_copy_video:`narrated long-form ${creative} adaptation`,
    search:`intent-matched ${creative} text and assets`
  })[id]||`${creative} execution`;}
const FLAVOR_GUIDED_ALIASES=Object.freeze({
  deckbuilder:Object.freeze({common:"Common card",epic:"Epic card",legendary:"Legendary card",landingVisit:"card reaches the scoring board",onPageClick:"card effect triggers",
    programmatic:"automated card-dealing market",ctv:"full-board broadcast card",platformAdAccount:"platform-specific deck license",reportingKey:"score-ledger key",
    downstreamAcceptance:"banked-score validation",acceptanceCriteria:"score-banking rules",leadQuality:"scoring-chance quality",accountLearning:"deck-specific draw calibration"}),
  jrpg:Object.freeze({common:"Common recruit",epic:"Epic hero",legendary:"Legendary hero",landingVisit:"party enters the quest chamber",onPageClick:"party activates the quest objective",
    programmatic:"automated encounter allocator",ctv:"realm-wide summon cinematic",platformAdAccount:"battlefield-specific guild charter",reportingKey:"combat-log rune key",
    downstreamAcceptance:"guild accepts the loot",acceptanceCriteria:"quest turn-in requirements",leadQuality:"quest-lead quality",accountLearning:"raid-roster battle memory"}),
  fighting:Object.freeze({common:"standard move",epic:"high-tier move",legendary:"legendary signature move",landingVisit:"opponent enters the combo route",onPageClick:"follow-up input connects",
    programmatic:"automated matchmaking inventory",ctv:"full-screen tournament broadcast",platformAdAccount:"platform tournament player profile",reportingKey:"replay-channel key",
    downstreamAcceptance:"tournament confirms the damage",acceptanceCriteria:"round-confirmation rules",leadQuality:"opening quality",accountLearning:"player-profile matchup adaptation"}),
  agriculture:Object.freeze({common:"standard seed grade",epic:"elite seed grade",legendary:"heritage seed grade",landingVisit:"seed reaches the trial plot",onPageClick:"sprout takes root",
    programmatic:"automated acreage exchange",ctv:"regional harvest broadcast",platformAdAccount:"market-specific farm permit",reportingKey:"sensor-ledger key",
    downstreamAcceptance:"buyer accepts the harvest",acceptanceCriteria:"produce-grade specifications",leadQuality:"viable-crop quality",accountLearning:"farm-program soil-model learning"}),
  evolution:Object.freeze({common:"common phenotype",epic:"rare adaptive phenotype",legendary:"breakthrough phenotype",landingVisit:"specimen enters the assay",onPageClick:"assay response triggers",
    programmatic:"automated habitat-allocation market",ctv:"ecosystem-wide broadcast",platformAdAccount:"habitat-specific research permit",reportingKey:"assay-batch key",
    downstreamAcceptance:"environmental fitness validates",acceptanceCriteria:"reproductive-fitness threshold",leadQuality:"specimen-fitness quality",accountLearning:"lineage-specific selection memory"}),
  kitchen:Object.freeze({common:"regular menu item",epic:"chef's special",legendary:"signature dish",landingVisit:"guest opens the menu",onPageClick:"guest selects an item",
    programmatic:"automated table-allocation market",ctv:"full-screen restaurant broadcast",platformAdAccount:"delivery-platform restaurant console",reportingKey:"ticket-ledger key",
    downstreamAcceptance:"guest keeps and pays for the plate",acceptanceCriteria:"served-plate standard",leadQuality:"interested-guest quality",accountLearning:"restaurant-console service learning"}),
  f1:Object.freeze({common:"baseline package",epic:"works-upgrade package",legendary:"championship package",landingVisit:"car reaches pit entry",onPageClick:"pit command confirms",
    programmatic:"automated inventory race director",ctv:"full-screen race broadcast",platformAdAccount:"series-specific constructor entry",reportingKey:"telemetry-channel key",
    downstreamAcceptance:"points classification confirms",acceptanceCriteria:"classification rules",leadQuality:"passing-opportunity quality",accountLearning:"constructor-entry setup learning"}),
  fishing:Object.freeze({common:"standard lure",epic:"trophy lure",legendary:"legendary lure",landingVisit:"fish reaches the bait zone",onPageClick:"fish strikes the hook",
    programmatic:"automated waters-allocation market",ctv:"full-screen fleet broadcast",platformAdAccount:"market-specific vessel license",reportingKey:"catch-log key",
    downstreamAcceptance:"market accepts the catch",acceptanceCriteria:"market-grade requirements",leadQuality:"promising-bite quality",accountLearning:"vessel-route sonar learning"}),
  mixing:Object.freeze({common:"standard take",epic:"featured take",legendary:"master take",landingVisit:"listener opens the track page",onPageClick:"listener presses the next control",
    programmatic:"automated channel-inventory router",ctv:"full-screen broadcast mix",platformAdAccount:"distribution-platform channel account",reportingKey:"meter-route key",
    downstreamAcceptance:"label accepts the master",acceptanceCriteria:"mastering acceptance specification",leadQuality:"interested-listener quality",accountLearning:"channel-account listener calibration"}),
  vc:Object.freeze({common:"core holding",epic:"breakout holding",legendary:"unicorn holding",landingVisit:"prospect opens the diligence room",onPageClick:"prospect requests the next document",
    programmatic:"automated market-inventory allocator",ctv:"full-screen brand thesis",platformAdAccount:"market-specific company growth account",reportingKey:"reporting-ledger key",
    downstreamAcceptance:"customer value realizes",acceptanceCriteria:"revenue-quality threshold",leadQuality:"qualified-lead quality",accountLearning:"growth-account market learning"}),
  dnd:Object.freeze({common:"Common adventurer",epic:"Epic adventurer",legendary:"Legendary adventurer",landingVisit:"adventurer enters the quest chamber",onPageClick:"adventurer activates the quest object",
    programmatic:"automated encounter allocator",ctv:"realm-wide bardic broadcast",platformAdAccount:"realm-specific guild charter",reportingKey:"scrying-rune key",
    downstreamAcceptance:"quest giver accepts the result",acceptanceCriteria:"quest-completion requirements",leadQuality:"quest-lead quality",accountLearning:"guild-charter encounter memory"})
});
/* Agency Career scores and affiliate-settlement events need their own analogies.
   Reusing the broad account, compliance or attribution metaphor would erase the
   operating distinction the glossary is meant to teach. */
const FLAVOR_CAREER_ALIASES=Object.freeze({
  deckbuilder:Object.freeze({accountHealth:"deck readiness meter",outcomeIndex:"smoothed deck-output rating",capabilityPoints:"deck-upgrade currency",affiliateSignal:"scoring-evidence clarity",complianceHeat:"table-scrutiny meter",validation:"score-banking review",clawback:"banked-chip deduction",operatingReserve:"chips banked outside the active deck",operatingStatement:"end-of-round score-and-upkeep ledger",operatingObligations:"mandatory table and deck upkeep due",runway:"rounds the bank and credit can fund at current upkeep",insolvency:"bank and credit exhausted before mandatory upkeep"}),
  jrpg:Object.freeze({accountHealth:"guild-roster readiness",outcomeIndex:"smoothed party-output rating",capabilityPoints:"job points",affiliateSignal:"battle-log evidence clarity",complianceHeat:"guild-scrutiny meter",validation:"loot appraisal",clawback:"loot-value deduction",operatingReserve:"guild treasury reserve",operatingStatement:"month-end guild income-and-upkeep ledger",operatingObligations:"party wages, supplies and guild-hall bills due",runway:"months the treasury and credit can sustain the guild",insolvency:"treasury and credit exhausted before guild upkeep"}),
  fighting:Object.freeze({accountHealth:"player-camp readiness",outcomeIndex:"smoothed match-output rating",capabilityPoints:"move-unlock tokens",affiliateSignal:"opponent-read clarity",complianceHeat:"tournament-scrutiny meter",validation:"result certification",clawback:"points deduction",operatingReserve:"fighter-camp operating purse",operatingStatement:"month-end purse-and-camp-cost ledger",operatingObligations:"coaches, venue, equipment and travel bills due",runway:"events the purse and credit can keep the camp open",insolvency:"purse and credit exhausted before camp bills"}),
  agriculture:Object.freeze({accountHealth:"farm-program readiness",outcomeIndex:"smoothed yield index",capabilityPoints:"farm-development credits",affiliateSignal:"sensor-evidence clarity",complianceHeat:"crop-regulation pressure",validation:"harvest grading",clawback:"rejected-harvest deduction",operatingReserve:"farm operating reserve",operatingStatement:"month-end harvest-income and farm-cost ledger",operatingObligations:"labor, equipment, inputs, facilities and market bills due",runway:"growing cycles the reserve and credit can support",insolvency:"reserve and credit exhausted before farm bills"}),
  evolution:Object.freeze({accountHealth:"lab-program readiness",outcomeIndex:"smoothed fitness index",capabilityPoints:"research points",affiliateSignal:"assay-evidence clarity",complianceHeat:"ethics-review pressure",validation:"grant-result audit",clawback:"grant recovery",operatingReserve:"lab grant reserve",operatingStatement:"monthly grant-inflow and lab-burn report",operatingObligations:"staff, assays, equipment, facilities and review costs due",runway:"research cycles the grant reserve and credit can sustain",insolvency:"grant reserve and credit exhausted before lab costs"}),
  kitchen:Object.freeze({accountHealth:"restaurant operating condition",outcomeIndex:"smoothed service-output index",capabilityPoints:"kitchen-upgrade credits",affiliateSignal:"ticket-evidence clarity",complianceHeat:"health-inspection pressure",validation:"check-settlement audit",clawback:"post-service check deduction",operatingReserve:"restaurant operating cash reserve",operatingStatement:"month-end sales-and-operating-cost statement",operatingObligations:"payroll, suppliers, equipment, rent and promotion bills due",runway:"services the till and credit can fund at current overhead",insolvency:"till and credit exhausted before payroll and supplier bills"}),
  f1:Object.freeze({accountHealth:"race-operation readiness",outcomeIndex:"smoothed pace-and-points index",capabilityPoints:"development points",affiliateSignal:"telemetry-evidence clarity",complianceHeat:"scrutineering pressure",validation:"results classification",clawback:"post-race points deduction",operatingReserve:"team working-capital reserve",operatingStatement:"month-end sponsorship-income and team-cost report",operatingObligations:"crew, factory, car, travel and partner commitments due",runway:"race weekends the treasury and credit can fund",insolvency:"team treasury and credit exhausted before payroll and suppliers"}),
  fishing:Object.freeze({accountHealth:"fleet operating condition",outcomeIndex:"smoothed catch-value index",capabilityPoints:"fleet-upgrade credits",affiliateSignal:"sonar-evidence clarity",complianceHeat:"fishery-enforcement pressure",validation:"dockside catch grading",clawback:"catch-value deduction",operatingReserve:"fleet operating reserve",operatingStatement:"month-end catch-revenue and fleet-cost ledger",operatingObligations:"crew, fuel, maintenance, dock and market bills due",runway:"sailing cycles the reserve and credit can fund",insolvency:"fleet reserve and credit exhausted before crew and harbor bills"}),
  mixing:Object.freeze({accountHealth:"session-system readiness",outcomeIndex:"smoothed release-output index",capabilityPoints:"studio-upgrade credits",affiliateSignal:"meter-evidence clarity",complianceHeat:"rights-review pressure",validation:"royalty-statement audit",clawback:"royalty recoupment",operatingReserve:"studio operating reserve",operatingStatement:"month-end session-revenue and studio-cost statement",operatingObligations:"engineers, licenses, gear, rent and promotion bills due",runway:"sessions the reserve and credit can keep the studio open",insolvency:"studio reserve and credit exhausted before staff, license and rent bills"}),
  vc:Object.freeze({accountHealth:"portfolio-company operating health",outcomeIndex:"smoothed value-creation index",capabilityPoints:"operating-growth credits",affiliateSignal:"diligence-data quality",complianceHeat:"regulatory-review pressure",validation:"proceeds verification",clawback:"distribution recoupment",operatingReserve:"management-company operating reserve",operatingStatement:"month-end fee-income and operating-expense statement",operatingObligations:"team, data, diligence, office, legal and event bills due",runway:"months the management company reserve and credit can operate",insolvency:"management-company reserve and credit exhausted before obligations"}),
  dnd:Object.freeze({accountHealth:"guild-operation readiness",outcomeIndex:"smoothed quest-output score",capabilityPoints:"advancement points",affiliateSignal:"scrying-evidence clarity",complianceHeat:"guild-scrutiny meter",validation:"loot appraisal",clawback:"treasury deduction",operatingReserve:"guild treasury reserve",operatingStatement:"moon-close loot-and-guild-upkeep ledger",operatingObligations:"party wages, stronghold, gear, healers and alliance dues",runway:"quests the treasury and credit can sustain",insolvency:"treasury and credit exhausted before guild dues and upkeep"})
});
const DEFAULT_FLAVOR="jrpg";
function savedFlavor(){
  try{const value=typeof localStorage!=="undefined"?localStorage.getItem(FLAVOR_KEY):null;
    return liveFlavorId(value)||null;}catch(e){return null;}
}
function queryFlavor(){const value=new URLSearchParams(location.search).get("flavor");return liveFlavorId(value)||null;}
let ACTIVE_FLAVOR=queryFlavor()||savedFlavor()||DEFAULT_FLAVOR;
function currentFlavor(){return FLAVOR_BY_ID[ACTIVE_FLAVOR]||FLAVOR_BY_ID[DEFAULT_FLAVOR];}
function flavorScore(f=currentFlavor()){
  return f.metrics.profit;
}
function flavorOutcome(f=currentFlavor()){
  return f.metrics.conversion;
}
function realWorldScope(){
  if(MODE===0)return {channel:"Paid Search / PPC",platform:"Google Ads-style Search (2017 manual bidding)",
    team:"Client-based agency",objective:"Lead generation",hierarchy:"Client → account → campaign → ad group → keyword + search ad"};
  if(MODE===6){
    const affiliate=typeof S!=="undefined"&&S&&S.engine==="agency-career"&&S.businessModel==="affiliate";
    const agencyType=typeof S!=="undefined"&&S&&S.engine==="agency-career"?S.agencyIdentity?.agencyType:null;
    if(affiliate&&agencyType==="holding_company")return {
      channel:"Company-owned digital acquisition for the company's own offers. There are no clients or retainers.",
      platform:"Paid search and paid social are available from the start. Shopping, short-form video and programmatic media can be added later. Outdoor, radio and cable are unavailable.",
      team:"Performance holding company operating company-owned offers",
      objective:"Validated payout contribution, liquidity, durable company-owned offers, compliance and channel resilience",
      hierarchy:"Company → company-owned offer and funnel → platform ad account → campaign → ad set/ad group → ad → creative; network validation, receivables and clawbacks sit beside delivery"
    };
    if(affiliate)return {channel:"Company-owned acquisition after the agency has offboarded every client",platform:"Platform mix carried forward from the agency's capability tree",
      team:"Affiliate scaling company operating a transformed owned-funnel business",objective:"Validated payout contribution, liquidity, durable funnels, compliance and platform resilience",
      hierarchy:"Company → owned funnel → platform ad account → campaign → ad set/ad group → ad → creative; network validation, receivables, and clawbacks sit beside delivery"};
    if(agencyType==="creative_agency")return {
      channel:"Client campaign strategy, creative production, paid social, outdoor, radio and cable. Paid search and shopping feeds are unavailable.",
      platform:"Paid social, creative production, outdoor, radio and cable are available from the start. Short-form video and programmatic media can be added later. Paid search and shopping feeds remain unavailable.",
      team:"Full-service creative agency growing from one founding client to a larger client roster",
      objective:"Client outcomes, retention, creative effectiveness, agency operating profit, liquidity and sustainable production capacity",
      hierarchy:"Agency → client relationship (one seat) → campaign brief → concept and production → media plan → paid-social campaign or traditional placement; client media economics remain separate from the agency income statement"
    };
    return {channel:"Client digital-acquisition services, beginning with paid search and expanding through optional digital capabilities",platform:"Paid search is available from the start. Paid social, shopping, short-form video and programmatic media can be added later. Outdoor, radio and cable are unavailable.",
      team:"Client-based agency growing from founder-led service to a 75-client-seat operating company",objective:"Client outcomes, retention, agency operating profit, liquidity, and sustainable capacity",
      hierarchy:"Agency → client relationship (one seat) → client-owned platform ad account(s) → campaign → ad set/ad group → ad → creative; client media economics remain separate from the agency income statement"};
  }
  if(typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE==="specialist"&&MODE>=1&&MODE<=3)
    return {channel:"Insurance lead-generation display / demand generation",platform:"Google Display / Demand Gen, represented by To The Moon's simplified rules",
      team:"Guided in-house account operations",objective:"Profitable, accepted lead volume with traceable creative multiplication",
      hierarchy:"Business account → campaign intent → ad group → ad → creative asset; event source and downstream acceptance sit beside delivery and must be diagnosed separately"};
  if(MODE===5)return {channel:"Multi-client paid search, paid social, demand generation and programmatic / CTV",
    platform:"Google Ads — Search, Google Ads — Demand Gen, Microsoft Advertising — Search, Meta Ads, TikTok Ads, Snapchat Ads, LinkedIn Campaign Manager, and a platform-abstracted programmatic / CTV lane",
    team:"In-house holding-company media desk / internal agency",objective:"Modeled portfolio contribution, liquidity, attribution integrity and traffic resilience",
    hierarchy:"To The Moon portfolio → operating company → advertiser workstream → platform-specific ad account → campaign → delivery group → ad → creative. Programmatic abstraction: advertiser → campaign/insertion order → line item → creative; exposure and view-through measurement sit beside that hierarchy"};
  if(MODE===4)return {channel:"Cross-platform paid social + Google display / Demand Gen",platform:"Google Display/Demand Gen, Snapchat, Meta and TikTok",
    team:"In-house, single-brand portfolio",objective:"Lead generation / performance",
    hierarchy:"To The Moon board: account → platform ad/creative slots.<br>Real hierarchies: Google Demand Gen and TikTok: campaign → ad group → ad · Meta: campaign → ad set → ad · Snapchat: campaign → ad squad → ad"};
  return {channel:"Platform-abstracted direct-response display/native lead generation",
    platform:"No single platform is simulated; the visual slot model borrows some Google Display/Demand Gen concepts but is not a literal Google Ads UI",
    team:"In-house-style, single brand",objective:"Lead generation / performance",
    hierarchy:"To The Moon board: account → bundled ad/creative slots. Real platforms also use campaign and ad-set/ad-group containers"};
}
function escapeRealityText(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function escapeRealityHierarchy(value){return String(value??"").split(/<br\s*\/?\s*>/i).map(escapeRealityText).join("<br>");}
/* Moment cues: analogies shaped to what the player is FEELING right now, not to a term map.
   A run ending is a death or a triumph in the source world's own emotional vocabulary — a
   party wipe, a DNF, a busted run — never a ledger correspondence recited over a grave. */
const FLAVOR_MOMENTS=Object.freeze({
  vc:Object.freeze({defeat:"Venture Portfolio: the fund is finished — capital ran out before the thesis proved out. No paper markup pays real bills; only collected returns do.",
    victory:"Venture Portfolio: the fund returned. The thesis survived contact with the market, and the gains are real, collected and yours."}),
  f1:Object.freeze({defeat:"Formula Race Engineering: DNF. The car did not make the flag — out of fuel, out of tires, out of race. Nothing hurts a race engineer more, and nothing teaches faster.",
    victory:"Formula Race Engineering: checkered flag. The car, the strategy and the fuel math all held to the end — that podium was won on the setup sheets."}),
  kitchen:Object.freeze({defeat:"Restaurant Line: service failed. The kitchen went dark mid-shift — out of stock, out of cash, guests still seated. Every restaurateur who survives has one of these nights behind them.",
    victory:"Restaurant Line: last ticket cleared, doors closed, the till is full. A won service is a hundred small calls that each went right."}),
  evolution:Object.freeze({defeat:"Evolutionary Lab: the lineage died out. The environment kept selecting and the population could not adapt fast enough. Extinction is data — brutal, honest data.",
    victory:"Evolutionary Lab: the lineage survived and multiplied — fit enough for this environment, diverse enough for the next one."}),
  agriculture:Object.freeze({defeat:"Precision Agriculture: crop failure. The season ended with the reserve spent and nothing left to harvest. Farms fail in the ledger before they fail in the field.",
    victory:"Precision Agriculture: harvest is in and the barn is full — water, soil and patience turned into yield you can actually sell."}),
  mixing:Object.freeze({defeat:"Audio Mixing Console: the master clipped. You ran out of headroom and the mix is unusable — loud is not loud when it distorts. Back to the desk.",
    victory:"Audio Mixing Console: clean master. Every channel sat where it belonged, and the mix survived every speaker you played it on."}),
  fishing:Object.freeze({defeat:"Deep-Sea Fishing: the boat came home empty. Fuel spent, hold empty, harbor bills still due — the sea does not owe anyone a catch.",
    victory:"Deep-Sea Fishing: quota landed and sold. The grounds, the lures and the fuel math all paid off — that is a captain's voyage."}),
  deckbuilder:Object.freeze({defeat:"Deckbuilder: run busted. The blind outpriced the deck and the chips ran out — no synergy saves a deck that cannot pay the ante. The next run starts smarter.",
    victory:"Deckbuilder: blind cleared, run won. The deck curved exactly when it had to — that is not luck, that is the draft you built."}),
  jrpg:Object.freeze({defeat:"JRPG Raid Party: party wipe. The MP ran dry mid-boss and the screen went dark. Every JRPG player knows the walk back from the last save point — the grind resumes.",
    victory:"JRPG Raid Party: boss down, credits roll. The party, the build and the resource discipline all held through the final phase."}),
  fighting:Object.freeze({defeat:"Fighting-Game Neutral: KO. You got read, you got punished, and the health bar hit zero. Run it back — the loss is the download.",
    victory:"Fighting-Game Neutral: round won, match won. You took neutral more than you gave it, spent meter when it counted and confirmed everything."}),
  dnd:Object.freeze({defeat:"D20 Adventure: party wipe — a TPK by upkeep, the least glorious death in the game. The gold ran out mid-campaign, and no loot claim on a ledger revives a dead party. Roll new characters; keep the lesson.",
    victory:"D20 Adventure: campaign complete. The party reached the final session alive with the treasury intact — the world could not kill what you kept funded."})
});
function flavorCue(concept="day"){
  const f=currentFlavor(),t=f.terms;
  if(concept==="victory"||concept==="defeat")return (FLAVOR_MOMENTS[f.id]||FLAVOR_MOMENTS.vc)[concept];
  const cues={
    day:`${f.name}: one media-buying day is one ${f.metrics.day.toLowerCase()} inside the persistent ${t.campaign.toLowerCase()}.`,
    performance:`${f.name}: business outcome view is ${t.accountView.toLowerCase()}; platform-attributed reporting is ${t.attributedView.toLowerCase()}. Profit maps to ${f.metrics.profit.toLowerCase()}; ROI, ROAS and CPL remain distinct and must use explicit windows and cost bases.`,
    budget:`${f.name}: budget is the available ${t.budget.toLowerCase()}; spend is the ${f.metrics.spend.toLowerCase()} actually consumed.`,
    creative:`${f.name}: a live ad is ${f.metrics.ad.toLowerCase()} and its creative is ${t.creative.toLowerCase()}; testing creates an option, swapping puts it into delivery.`,
    measurement:`${f.name}: the pixel is ${t.pixel.toLowerCase()}; tracking is ${flavorAliasForTerm("tracking",f).toLowerCase()}; attribution is ${t.attribution.toLowerCase()}. These are related but not interchangeable.`,
    fatigue:`${f.name}: fatigue is ${t.fatigue.toLowerCase()}; saturation is ${t.saturation.toLowerCase()}. One wears out the ad, the other exhausts the audience.`,
    platform:`${f.name}: the platform is ${t.platform.toLowerCase()} and its delivery system is ${t.algorithm.toLowerCase()}; volatility is a rule, not intent.`,
    compliance:`${f.name}: creative approval is ${flavorAliasForTerm("approval",f).toLowerCase()}; a compliance hold is ${flavorAliasForTerm("compliance hold",f).toLowerCase()}; an account hold is ${flavorAliasForTerm("account hold",f).toLowerCase()}. Scope determines the remedy.`,
    client:`${f.name}: the client is ${t.client.toLowerCase()}; the business prior is a context clue, Client Read is an earned behavior read, tension is the pressure meter, and weighted trust is the relationship score. Account performance remains a separate scoreboard.`,
    search:`${f.name}: a keyword is ${t.keyword.toLowerCase()}, match type is ${t.match.toLowerCase()}, and a negative is ${t.negative.toLowerCase()}. Quality Score is the ${flavorAliasForTerm("quality score",f).toLowerCase()}: a three-part diagnostic of expected response, message-to-intent fit, and destination quality — not the campaign objective or a literal auction input.`,
    liquidity:`${f.name}: cash ≈ ${t.cash.toLowerCase()}, credit ≈ ${t.credit.toLowerCase()}, and receivables ≈ ${t.receivable.toLowerCase()}. Platform-attributed credit is a report, not spendable liquidity.`,
    portfolio:`${f.name}: holding company ≈ ${t.holding.toLowerCase()}; operating company ≈ ${t.operatingCompany.toLowerCase()}; advertiser workstream ≈ ${flavorAliasForTerm("advertiser workstream",f).toLowerCase()}; platform ad account ≈ ${flavorAliasForTerm("platform ad account",f).toLowerCase()}; platform initiative ≈ ${t.initiative.toLowerCase()}; event-source cluster ≈ ${flavorAliasForTerm("event-source cluster",f).toLowerCase()}.`,
    crisis:`${f.name}: a crisis ticket is scoped. Identify whether it hit the ${t.creative.toLowerCase()}, ${t.campaign.toLowerCase()}, ${flavorAliasForTerm("platform ad account",f).toLowerCase()}, ${t.pixel.toLowerCase()} or shared ${t.budget.toLowerCase()} before choosing a response.`,
    agency:`${f.name}: a client seat is ${flavorAliasForTerm("client seat",f).toLowerCase()}; focus units are ${flavorAliasForTerm("focus units",f).toLowerCase()}; agency profit is ${flavorAliasForTerm("agency profit",f).toLowerCase()}. Client media spend remains on the client's separate scoreboard.`,
    structure:`Common teaching hierarchy: Platform → Account → Campaign → Ad Set/Ad Group → Ad → Creative; platform and programmatic names vary. The real-world assignment identifies the hierarchy used in this mode. ${f.name}: platform ≈ ${t.platform.toLowerCase()}, account ≈ ${t.account.toLowerCase()}, campaign ≈ ${t.campaign.toLowerCase()}, buying lane ≈ ${t.initiative.toLowerCase()}, ad ≈ ${f.metrics.ad.toLowerCase()}, creative ≈ ${t.creative.toLowerCase()}.`
  };
  return cues[concept]||cues.day;
}
function conceptForText(text){
  const s=text.toLowerCase();
  if(/receivable|liquidity|cash|credit line|credit cleared|payment threshold|billing/.test(s))return "liquidity";
  if(/client seat|service cadence|service debt|focus unit|capacity utilization|sprawl|retainer|payroll|agency profit|agency capability point|skill point|affiliate pivot/.test(s))return "agency";
  if(/holding company|portfolio|advertiser matrix|acquisition gate/.test(s))return "portfolio";
  if(/crisis|ticket|bid war|payout delay|conquest/.test(s))return "crisis";
  if(/pixel|attribut|tracking|reported|reconcile|settlement/.test(s))return "measurement";
  if(/creative|shipped|swap|recast|restate|multipl|asset|hook|ad rewritten|built|approved/.test(s))return "creative";
  if(/fatigue|burn|saturat|exhaust/.test(s))return "fatigue";
  if(/compliance|review|blocked|held|flag/.test(s))return "compliance";
  if(/client|trust|account manager|\bam\b|call/.test(s))return "client";
  if(/keyword|match|search term|negative|quality score|\bqs\b|expected ctr|ad relevance|landing.page experience|expanded text|ad permutation|a\/b permutation/.test(s))return "search";
  if(/platform|algorithm|auction|google|snap|meta|tiktok|cpm/.test(s))return "platform";
  if(/budget|spend|bid|cpc|cost/.test(s))return "budget";
  if(/revenue|profit|roi|roas|lead|conversion|cpl|cpa|epl/.test(s))return "performance";
  if(/account|campaign|ad group|slot/.test(s))return "structure";
  return "day";
}
function addLog(html,concept="day"){S.log.unshift({html,concept});}
function renderLog(entries,fallback){
  const source=(entries&&entries.length)?entries.slice(0,6):[{html:fallback,concept:"day"}];
  return source.map(entry=>{
    const html=typeof entry==="string"?entry:entry.html||"";
    const plain=html.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ");
    const concept=typeof entry==="string"?conceptForText(plain):(entry.concept||"day");
    return `<div class="log-entry">${html}<span class="flavor-cue" data-flavor-concept="${concept}">${flavorCue(concept)}</span></div>`;
  }).join("");
}
function eventFlavorText(eventId){const f=currentFlavor();return f.events[eventId]||f.events.quiet;}
function nightmareEventFlavorText(eventId){
  const f=currentFlavor(),t=f.terms,m=f.metrics;
  const exact={
    quiet:eventFlavorText("quiet"),viral:eventFlavorText("viral"),earned:eventFlavorText("influencer"),glut:eventFlavorText("glut"),copied:eventFlavorText("copied"),
    auction:`${f.name}: the ${t.platform.toLowerCase()} became more expensive; the same ${t.budget.toLowerCase()} now buys fewer units of ${m.impression.toLowerCase()}.`,
    ghost:`${f.name}: ${t.attribution.toLowerCase()} shows impossible credit. Audit the ${t.pixel.toLowerCase()} before treating the report as ${m.revenue.toLowerCase()}.`,
    signal:`${f.name}: ${flavorAliasForTerm("event-source contamination",f).toLowerCase()} is mixing signals across multiple ${flavorAliasForTerm("advertiser workstream",f).toLowerCase()} records; isolate the source before optimizing delivery.`,
    payout:`${f.name}: ${t.receivable.toLowerCase()} is delayed, so the ${t.accountView.toLowerCase()} can look healthy while ${t.cash.toLowerCase()} is constrained.`,
    flag:`${f.name}: ${flavorAliasForTerm("account hold",f).toLowerCase()} blocked an initiative; this is not automatic proof that the ${t.creative.toLowerCase()} failed.`,
    bidwar:`${f.name}: competition raised the cost of the ${t.keyword.toLowerCase()}; improve ${flavorAliasForTerm("quality score",f).toLowerCase()} or change the ${t.bid.toLowerCase()}.`,
    fees:`${f.name}: billing adjustments consumed more ${t.budget.toLowerCase()} than the delivery report alone showed.`,
    blackout:`${f.name}: delivery and modeled value continue while reported ${t.platform.toLowerCase()} credit is suppressed; use the business ledger and other ${t.attribution.toLowerCase()} evidence until reporting returns.`,
    conquest:`${f.name}: rival demand captured the ${t.keyword.toLowerCase()} opportunity created elsewhere; protect that intent explicitly.`
  };
  return exact[eventId]||eventFlavorText("quiet");
}
function flavorCanonicalFlow(f=currentFlavor()){
  const m=f.metrics;
  return `Impression ≈ ${m.impression} → Click ≈ ${m.click} → Lead ≈ ${m.lead} → Conversion ≈ ${m.conversion} → Revenue ≈ ${m.revenue} → Profit ≈ ${m.profit}`;
}
function flavorFlow(f=currentFlavor()){return f.canonicalFlow||flavorCanonicalFlow(f);}
function flavorAnalogyFlow(f=currentFlavor()){return f.flow||flavorFlow(f);}
const GENERIC_FLAVOR_CONNECTION="The metaphor preserves the decision relationship, not just the vocabulary.";
function flavorMechanicExplanation(term,f=currentFlavor()){
  const s=String(term||"").toLowerCase(),reason=FLAVOR_REASONING[f.id]||FLAVOR_REASONING[DEFAULT_FLAVOR];
  let shared=GENERIC_FLAVOR_CONNECTION;
  if(/agency profit/.test(s))shared=`This is the agency's own ${f.metrics.profit.toLowerCase()}: retainers and earned bonuses or validated owned payouts, minus payroll, tools, overhead, onboarding, service costs, and — after a pivot — owned media. A client's media budget never becomes agency revenue.`;
  else if(/client media spend/.test(s))shared=`This is ${f.metrics.spend.toLowerCase()} inside the client's campaign economy. It can change the client's outcomes and service pressure, but it is neither a retainer nor a cost on the agency income statement.`;
  else if(/client seat/.test(s))shared=`This is one persistent ${f.terms.client.toLowerCase()} relationship in the agency roster. Several campaigns or platform ad accounts can sit inside the relationship without consuming extra seats; service load still reflects that complexity.`;
  else if(/service cadence/.test(s))shared=`This is the recurring ${f.metrics.day.toLowerCase()} rhythm at which a ${f.terms.client.toLowerCase()} account normally needs a meaningful decision. Stability stretches the interval; incidents and complexity pull work forward.`;
  else if(/service debt/.test(s))shared=`This is overdue operator attention: required ${f.metrics.day.toLowerCase()} actions have accumulated instead of disappearing. It raises delivery and relationship risk until capacity is spent to clear it.`;
  else if(/focus unit/.test(s))shared=`This is a unit of the ${f.terms.buyer.toLowerCase()}'s daily attention ${f.terms.budget.toLowerCase()}. Unlike cash it resets each workday, but hiring and systems increase how much work the company can responsibly process.`;
  else if(/capacity utilization/.test(s))shared=`This compares forecast service demand with the team's available attention ${f.terms.budget.toLowerCase()}. Near-full use can be efficient; sustained overload compounds missed work and makes random incidents much harder to absorb.`;
  else if(/sprawl penalty/.test(s))shared=`This is context-switching friction when the roster spans too many unrelated ${f.terms.platform.toLowerCase()} families and advertiser markets. Reusing a playbook is easier than maintaining equal mastery across every lane.`;
  else if(/retainer/.test(s))shared=`This is recurring ${f.metrics.revenue.toLowerCase()} paid for the agency relationship and operating service. It belongs to the agency ledger; the separate client media budget still funds delivery.`;
  else if(/payroll/.test(s))shared=`This is the recurring ${f.terms.cash.toLowerCase()} cost of converting specialists into dependable operating capacity. Capacity arrives immediately, while the obligation returns at every month close.`;
  else if(/^operating reserve$/.test(s))shared=`In ${f.name}, the operating reserve works like ${flavorAliasForTerm("operating reserve",f).toLowerCase()}. It is company cash held for agency bills while earned fees remain uncollected. It is not client media spend, profit or the credit line.`;
  else if(/^monthly operating statement$/.test(s))shared=`In ${f.name}, the monthly operating statement works like ${flavorAliasForTerm("monthly operating statement",f).toLowerCase()}. It reconciles recognized company revenue with recurring and one-time agency costs for the month. Profit on this statement can differ from cash because invoices may remain uncollected.`;
  else if(/^monthly operating obligations$/.test(s))shared=`In ${f.name}, monthly operating obligations work like ${flavorAliasForTerm("monthly operating obligations",f).toLowerCase()}. They are the company bills due for people, systems, equipment, facilities and approved growth commitments. Client media spend stays on the client's campaign ledger.`;
  else if(/^runway$/.test(s))shared=`In ${f.name}, runway works like ${flavorAliasForTerm("runway",f).toLowerCase()}. It estimates how long operating cash plus permitted credit could support recurring obligations and, after an affiliate pivot, planned company-funded media. Collections, budget changes or new costs can move it, so it is an early warning rather than a promise.`;
  else if(/^insolvency$/.test(s))shared=`In ${f.name}, insolvency works like ${flavorAliasForTerm("insolvency",f).toLowerCase()}. It occurs when month-close obligations remain unpaid after operating cash and available credit are applied. The career ends immediately even if the income statement shows recognized profit.`;
  else if(/affiliate pivot/.test(s))shared=`This replaces the ${f.terms.client.toLowerCase()} service model with company-owned acquisition lanes. Prior cash, systems, staff, reputation, level, and profit persist, while retainers give way to media risk, delayed payouts, clawbacks, and compliance durability.`;
  else if(/agency capability points?|(?:agency |career )?skill points?/.test(s))shared=`In ${f.name}, Agency Capability Points work like ${flavorAliasForTerm("agency capability points",f).toLowerCase()}. They are spendable only inside the current Agency Career save and unlock operating options in its capability tree. Training XP is separate: It records learning across play and never buys a simulation advantage.`;
  else if(/^account health$/.test(s))shared=`In ${f.name}, account health works like ${flavorAliasForTerm("account health",f).toLowerCase()}. It is To The Moon's 0–100 score for how well one client account is being operated. Service coverage, incident response, measurement and creative readiness can move it. It is not client trust, the Outcome index or a platform account's status.`;
  else if(/^outcome index$/.test(s))shared=`In ${f.name}, the Outcome index works like ${flavorAliasForTerm("outcome index",f).toLowerCase()}. It is To The Moon's smoothed, 100-centered gauge of modeled client-value production against its baseline. A higher index can support a performance bonus, but the score is not revenue, ROI, MER, profit or a platform report.`;
  else if(/^affiliate signal$/.test(s))shared=`In ${f.name}, affiliate signal works like ${flavorAliasForTerm("affiliate signal",f).toLowerCase()}. It is To The Moon's 0–100 score for usable optimization and measurement evidence in one owned funnel. Stronger signal can improve modeled payout efficiency; it is not event-source signal integrity, compliance heat, payout validation or cash.`;
  else if(/^compliance heat$/.test(s))shared=`In ${f.name}, compliance heat works like ${flavorAliasForTerm("compliance heat",f).toLowerCase()}. It is To The Moon's 0–100 pressure score, and lower is safer. Claims, ownership and enforcement exposure can raise it; more heat can reduce efficiency, trigger review and increase clawback risk. It is not compliance health.`;
  else if(/^validation$/.test(s))shared=`In ${f.name}, payout validation works like ${flavorAliasForTerm("validation",f).toLowerCase()}. It is the network review that determines how much of a modeled affiliate payout becomes collected cash. The review can approve the expected amount or apply a clawback; it does not create another customer outcome or improve media performance.`;
  else if(/^clawback$/.test(s))shared=`In ${f.name}, a clawback works like ${flavorAliasForTerm("clawback",f).toLowerCase()}. It is a payout deduction made during validation. It reduces recognized payout and cash while the original media cost remains. Compliance heat can raise the simulated risk, but it does not guarantee a deduction.`;
  else if(/compliance health/.test(s))shared=`This is the resilience of an owned funnel or delivery system under ${flavorAliasForTerm("compliance",f).toLowerCase()} review. Clear claims, ownership evidence, and documented operations lower fragility; it is not a loophole or a performance multiplier.`;
  else if(/modeled mer|blended mer/.test(s))shared=`It compares modeled ${f.metrics.revenue.toLowerCase()} with ${f.metrics.spend.toLowerCase()} actually used, so it is an efficiency multiple — not profit, cash or platform-claimed credit.`;
  else if(/view-through/.test(s))shared=`It assigns ${f.terms.attribution.toLowerCase()} credit after a ${f.metrics.impression.toLowerCase()} without a measured ${f.metrics.click.toLowerCase()}; that can reveal reach effects, but overlapping exposure makes causal credit uncertain.`;
  else if(/claimed roas|platform claim|cross-account claim|attributed value|attributed report|attribution/.test(s))shared=`It is credit written into the ${f.terms.attribution.toLowerCase()} report; several reports may claim the same outcome, so the number is not additional ${f.terms.cash.toLowerCase()} or another customer result.`;
  else if(/modeled outcome|modeled value|revenue/.test(s))shared=`It estimates business value in the account-level ledger. It can continue while a platform report is incomplete, and it becomes cash only after To The Moon's stated settlement delay.`;
  else if(/profit|contribution|margin|roi/.test(s))shared=`It is what remains after the named cost base; always check whether the view includes only media spend or also operations and billing adjustments.`;
  else if(/training xp|training points|knowledge score/.test(s))shared=`This is the persistent practice record for the ${f.terms.buyer.toLowerCase()}, outside the campaign system. It can show mastery and guide the next lesson, but it never changes delivery, random outcomes, platform learning, budget, economics, win conditions or challenge scores.`;
  else if(/acquisition gate|gate streak/.test(s))shared=`This is a conjunctive checkpoint: performance, measurement, liquidity, diversification, and resilience must pass together. One failed condition resets the streak even when the other scores look strong.`;
  else if(/concentration/.test(s))shared=`This measures dependence on the largest ${f.terms.platform.toLowerCase()} or advertiser engine. Concentration can look efficient until one outage, restriction, or demand shock removes too much of the portfolio at once.`;
  else if(/liquidity|working capital|receivable|settlement|unsettled/.test(s))shared=`Timing controls survival: earned ${f.metrics.revenue.toLowerCase()} can sit as ${f.terms.receivable.toLowerCase()} while bills consume ${f.terms.cash.toLowerCase()} and ${f.terms.credit.toLowerCase()} first.`;
  else if(/budget|allocation|spend|cash|credit/.test(s))shared=`These are separate resource states: authorization sets the ceiling, allocation assigns it, spend consumes it, cash settles it, and credit only provides temporary buying capacity.`;
  else if(/event.source cluster/.test(s))shared=`Several initiatives can write to this shared ${f.terms.pixel.toLowerCase()} network; contamination changes optimization and claim routing without creating a second customer outcome.`;
  else if(/pixel|event source|event-source mapping|tracking/.test(s))shared=`This records and routes observed events for optimization and measurement; it does not decide which touchpoint caused the outcome, and a mapping repair changes future signal rather than rewriting history.`;
  else if(/quality score/.test(s))shared=`In ${f.name}, the 1–10 diagnostic works like a ${flavorAliasForTerm("quality score",f).toLowerCase()}: one readout combining predicted response, message-to-intent fit and destination quality. It helps locate the weak system; it is not the objective, a key performance indicator or the literal value submitted into each auction.`;
  else if(/expected ctr|expected click.through rate/.test(s))shared=`In this analogy, expected CTR is ${flavorAliasForTerm("expected ctr",f).toLowerCase()}: a pre-delivery forecast for an eligible ${f.metrics.impression.toLowerCase()}. In media terms it predicts the impression-to-click transition; measured CTR is the evidence observed after delivery.`;
  else if(/ad relevance/.test(s))shared=`This works like ${flavorAliasForTerm("ad relevance",f).toLowerCase()}: the ${f.terms.creative.toLowerCase()} must answer the intent represented by the ${f.terms.keyword.toLowerCase()}. It diagnoses message fit separately from attention probability and the quality of the post-click destination.`;
  else if(/landing.page experience/.test(s))shared=`This works like ${flavorAliasForTerm("landing page experience",f).toLowerCase()}: after the ${f.metrics.click.toLowerCase()}, the destination must fulfill the promise clearly and make the next step usable. It is a separate Quality Score diagnostic; changing the bid cannot repair this handoff.`;
  else if(/expanded text ad/.test(s))shared=`This works like a ${flavorAliasForTerm("expanded text ad",f).toLowerCase()}: the same intent-capture unit receives two headline beats and a longer explanation, creating more room to qualify the searcher. Extra space is a testable format advantage, not a guaranteed response or Quality Score improvement. Search Desk treats it as a historical 2017 format.`;
  else if(/a\/b ad permutation|a\/b permutation|ad permutation/.test(s))shared=`This works like ${flavorAliasForTerm("a/b ad permutation",f).toLowerCase()}: two sibling versions keep the same core strategy while one declared copy axis changes. Holding the other conditions steady makes the evidence interpretable; a full rewrite instead replaces the lead message.`;
  else if(/\bcpm\b/.test(s))shared=`CPM prices access: ${f.metrics.cpm.toLowerCase()} is ${f.metrics.spend.toLowerCase()} per thousand ${f.metrics.impression.toLowerCase()} units. A lower price creates more opportunities, but does not improve response or downstream value by itself.`;
  else if(/\bctr\b/.test(s))shared=`CTR is the share of ${f.metrics.impression.toLowerCase()} units that become a ${f.metrics.click.toLowerCase()}. It diagnoses attention and message fit, but a high rate can still produce weak leads or poor economics.`;
  else if(/\bcvr\b/.test(s))shared=`CVR measures progression from its stated eligible denominator into ${f.metrics.conversion.toLowerCase()} outcomes. The denominator must be named because platforms may use clicks, visits, sessions, or users.`;
  else if(/\bcpl\b|media cpl|\bcpa\b|\bepl\b/.test(s))shared=`Cost metrics divide the declared cost base by leads or acquisitions, while EPL divides earned value by leads. Read cost and value together, with the same cohort and window, before scaling.`;
  else if(/impression|\bclick\b|\blead\b|conversion/.test(s))shared=`The causal sequence is opportunity (${f.metrics.impression.toLowerCase()}) → response (${f.metrics.click.toLowerCase()}) → prospect (${f.metrics.lead.toLowerCase()}) → completed objective (${f.metrics.conversion.toLowerCase()}). Each transition answers a different diagnostic question.`;
  else if(/platform ad account|account|workstream|initiative|campaign|ad set|ad group/.test(s))shared=`The analogy preserves hierarchy: a workstream owns a business objective, an account is a platform container, and an initiative is one active buying lane inside that scope.`;
  else if(/platform|paid search|ppc|paid social|programmatic|\bctv\b|display|demand gen|buying lane|channel/.test(s))shared=`The lane determines how demand is found and what control matters: search captures expressed intent, social and display interrupt or stimulate demand, and reach media often relies more on exposure and view-through evidence.`;
  else if(/targeting|audience|\bdemo\b|\bbroad\b/.test(s))shared=`The audience is the eligible pool; targeting is the rule that selects within it. Narrowing can improve fit while reducing scale, and it cannot repair a weak creative or create demand that is not present.`;
  else if(/creative format|story ad|\bvsl\b|podcast creative|slideshow|veo creative|news greenscreen|nat geo documentary|\bmemes\b|voicemail creative|\bstatic\b|animation|branded creative|native long-copy|long-copy to video|static image|rendered scene|motion graphic|ugc video|founder \/ explainer|native display creative|input \/ ui utility|lifestyle static|ctv spot|search text/.test(s))shared=`This is an execution layer: placement-led format, persuasion structure, presentation style or production method. It changes platform fit, opening attention, downstream trust, fatigue, volatility and production burden, while the concept, ad, campaign, account and To The Moon rarity remain separate. In ${f.name}, the analogy describes the same tradeoff rather than claiming the two systems are identical.`;
  else if(/learning|algorithm/.test(s))shared=`Repeated delivery updates the platform's estimate of who will respond; changing the account, signal source, or delivery object can disturb that accumulated evidence.`;
  else if(/fatigue|saturation|fresh capacity|lane capacity/.test(s))shared=`Fatigue is declining response to one repeated creative; fresh capacity is the low-friction room inside the reachable lane before saturation raises marginal cost. A new asset can help fatigue without enlarging shared lane capacity.`;
  else if(/creative format|concept|rarity|creative|\bad\b/.test(s))shared=`The ad is the delivery object, the creative is the message it carries, the concept is the repeatable idea, the format is its execution, and rarity describes simulated upside — not guaranteed quality.`;
  else if(/keyword|match|negative|search term|wasted clicks/.test(s))shared=`The keyword declares intended demand, match type controls query breadth, the search-terms report reveals wasted clicks, and negatives exclude unwanted demand without creating more useful searches.`;
  else if(/compliance|approval|review|hold/.test(s))shared=`This is a delivery gate with a named scope: inspect rights, claims, policy, and approval status before deciding whether to revise one asset or respond at the account level.`;
  else if(/search intent/.test(s))shared=`This is expressed demand rather than interrupted attention: the ${f.terms.keyword.toLowerCase()} enters only the searches whose underlying need and readiness fit the offer.`;
  else if(/operations cost|adjusted billed cost/.test(s))shared=`This consumes the business ledger outside the visible media delivery line. Separate ${f.metrics.spend.toLowerCase()} from production, repair, fees, and penalties before judging true ${f.metrics.profit.toLowerCase()}.`;
  else if(/settled value/.test(s))shared=`This is earned ${f.metrics.revenue.toLowerCase()} after its timing delay has cleared into the recognized ledger; earning time and settlement time are different turns in the analogy.`;
  else if(/acceptance criteria|downstream acceptance/.test(s))shared=`The front-end ${f.metrics.lead.toLowerCase()} must still pass a later quality gate. Strong response can coexist with weak accepted value when eligibility, geography, contactability, or buyer rules shift.`;
  else if(/\bcpc\b|max cpc/.test(s))shared=`This prices one ${f.metrics.click.toLowerCase()}: auction cost per click is shaped by competition, relevance, and response rate, while a maximum CPC is only the bid ceiling — not the final price or value.`;
  else if(/modeled leads|reported clicks/.test(s))shared=`The modeled count estimates the underlying business step; the reported count is what the measurement path observed. A gap can be tracking loss or attribution noise rather than a change in customer behavior.`;
  else if(/demand index|\breach\b/.test(s))shared=`This describes how much eligible opportunity exists before response quality is applied. More reachable ${f.terms.audience.toLowerCase()} creates chances, but cannot guarantee a ${f.metrics.click.toLowerCase()} or ${f.metrics.conversion.toLowerCase()}.`;
  else if(/\bscaling\b/.test(s))shared=`Scaling commits more ${f.terms.budget.toLowerCase()} only while marginal efficiency, available demand, fatigue, learning, and liquidity can support it; a larger allocation is not automatically a larger win.`;
  else if(/restate|recast|geo cut/.test(s))shared=`These actions change different creative variables. A geography rewrite changes relevance. A new presenter changes the presentation and refreshes attention. Use the first when fit is weak and the second when fatigue is high.`;
  else if(/\brelevance\b/.test(s))shared=`Relevance is alignment among demand, message, offer, and destination. It can improve response and conversion efficiency without increasing the size of the reachable pool.`;
  else if(/\bslot\b/.test(s))shared=`The slot is a To The Moon bundle for one active delivery object, its ${f.terms.creative.toLowerCase()}, and its allocation. It makes the controls playable but is not a universal platform hierarchy level.`;
  else if(/offer timing/.test(s))shared=`The offer must arrive before attention is lost: moving it earlier can improve conversion without changing audience size, auction price, or the underlying concept.`;
  else if(/\bobjective\b|decision window/.test(s))shared=`The objective names the result being pursued, and the decision window names how much evidence is allowed before judgment. Performance is meaningful only against both.`;
  else if(/reporting key/.test(s))shared=`This is a routing label inside the ${f.terms.attribution.toLowerCase()} system. It can connect records, but it is not interchangeable with the advertiser, account, event source, or customer outcome.`;
  else if(/event[- ]source contamination|signal integrity/.test(s))shared=`Mixed observations weaken the ${f.terms.pixel.toLowerCase()} network: optimization learns from the wrong examples and reported credit can drift, even though no extra customer outcome was created.`;
  else if(/business container|delivery hierarchy|operating company/.test(s))shared=`This names ownership and nesting, not performance: the business contains platform accounts, which contain delivery objects, while the operating company remains the real advertiser behind those structures.`;
  else if(/resilience|contingency layer/.test(s))shared=`This is paid capacity held for bad turns — billing grace, cleaner measurement or safer migration. It reduces failure impact but does not create free ${f.metrics.revenue.toLowerCase()} or erase concentration.`;
  else if(/ops action|\bcrisis\b/.test(s))shared=`This is a scarce intervention against a named operational scope. Diagnose whether the problem lives in creative, account, measurement, or finance before spending the action.`;
  else if(/\bcommon\b|\bepic\b|\blegendary\b/.test(s))shared=`Rarity summarizes To The Moon's upside, scale room and fatigue profile. It is a probability tier — not an industry category, production grade or guaranteed winner.`;
  else if(/\bbid\b|auction rank|avg position|\bsis\b|query ceiling|lost to rank|accelerated delivery|standard delivery/.test(s))shared=`These are paid-search auction controls and diagnostics: bids set aggressiveness, relevance affects rank, impression share diagnoses access, and finite query volume caps scale; a rank problem is not automatically a budget problem.`;
  else if(/^roas$/.test(s))shared=`ROAS divides the named revenue or attributed-value ledger by media spend. It is a return multiple before operating costs, so it cannot substitute for profit, ROI, or cash.`;
  else if(/business prior/.test(s))shared=`This is an opening read on what pressures a ${f.terms.client.toLowerCase()} may face, not a revealed character class. Treat it as a hypothesis until the person's words and reactions supply individual evidence.`;
  else if(/client insight|client read/.test(s))shared=`This is the earned read on the ${f.terms.client.toLowerCase()}: observe a tell, choose a defensible approach, then update the working hypothesis from the reaction. It improves judgment without revealing an automatic winning response.`;
  else if(/trust dimensions|client trust/.test(s))shared=`The relationship has several attributes — confidence in results and judgment, transparency, responsiveness and alignment. This weighted score is separate from campaign performance and from the pressure inside one conversation.`;
  else if(/client tension|relationship risk|client retention line/.test(s))shared=`This is the pressure state around the ${f.terms.client.toLowerCase()}. Tension can spike before long-term trust fails; the retention line marks a To The Moon relationship boundary, not a universal personality rule or campaign key performance indicator.`;
  else if(/communication stance/.test(s))shared=`This is the dialogue approach used with the ${f.terms.client.toLowerCase()}: recommend, investigate, acknowledge, or set a boundary. Style changes how a sound plan lands, but cannot redeem unsupported claims or bad operations.`;
  else if(/working agreement|\bcommitment\b/.test(s))shared=`This is a recorded pact with the ${f.terms.client.toLowerCase()}. The game checks later behavior against it, so saying the right words without following through can reduce trust on a later turn.`;
  else if(/\bintake\b/.test(s))shared=`This is the information-and-relationship layer: establish constraints, baselines, ownership, and evidence before changing the live ${f.terms.account.toLowerCase()}.`;
  else if(/\bbaseline\b|in-window|\bband\b/.test(s))shared=`This is a comparison boundary, not a universal truth. It defines the normal range, active evaluation window, or diagnostic zone against which a change becomes meaningful.`;
  else if(/^funnel$/.test(s))shared=`The funnel is the ordered handoff from ${f.metrics.impression.toLowerCase()} to ${f.metrics.click.toLowerCase()} to ${f.metrics.lead.toLowerCase()} to ${f.metrics.conversion.toLowerCase()}; each drop belongs to a different control layer.`;
  else if(/landing-page visit|front end|\blander\b|landing-page optimization/.test(s))shared=`This is the handoff after the ad earns attention. Improving the destination can raise progression without changing auction cost, audience selection, or creative fatigue.`;
  else if(/multiplication|\baxis\b|\baxes\b|\bmatrix\b|\bcut\b|\btail\b|\bdecay\b|\bmilking\b/.test(s))shared=`These describe systematic variation and lifecycle management: change one repeatable dimension, preserve the winning idea, measure the result, and retire it when marginal response decays.`;
  else if(/\btrap\b|brand play/.test(s))shared=`This is a deliberate strategic exception whose visible in-window score can mislead. Inspect its declared role and downstream effect before judging it by immediate-response output alone.`;
  else if(/test stop rule|causal test evidence/.test(s))shared=`This protects causal learning: define when the ${f.terms.test.toLowerCase()} ends, hold competing variables steady, and treat a coincident dashboard move as a hypothesis until the comparison isolates the changed decision.`;
  else if(/\bnoise\b|\bvariance\b|\bseed\b/.test(s))shared=`This separates chance from judgment: the seed fixes a comparable sequence, variance moves individual results around it, and repeated evidence reveals whether the decision survives noise.`;
  else if(/^native$|\bplacement\b/.test(s))shared=`This describes where or how the unit fits its surrounding inventory. Placement changes context and response opportunity; it does not by itself define the creative concept or buying objective.`;
  else if(/\bvertical\b/.test(s))shared=`The vertical is the advertiser's market and operating context. It changes demand, value, policy, and funnel physics without becoming a platform or creative format.`;
  else if(/\basset\b|\bhook\b|\bmechanic\b/.test(s))shared=`The asset is the produced file, the hook earns initial attention, and the mechanic is the repeatable persuasive device. They can be varied independently inside one broader concept.`;
  return shared;
}
const FLAVOR_SOURCE_CONCEPTS=Object.freeze({
  /* Plain speech only. Every line here used to be built as "a [noun] that [verbs] the
     [abstraction]" — a shape that needs its own explanation and teaches nobody anything.
     Words like "signal", "resource pool" and "opportunity" are banned from this block. */
  buyer:"The person making the calls and deciding where the money goes.",
  account:"The place all of it lives: the roster, the money, the history. It outlasts any one job.",
  campaign:"One push with one goal, and a budget behind it.",
  group:"A smaller piece of that push, aimed at one crowd with one tactic.",
  ad:"One thing you actually put out into the world, tracked on its own.",
  creative:"What people see and hear. The words, the picture, the pitch itself.",
  platform:"Where the whole thing happens, and whoever writes the rules there. You play by them; you do not set them.",
  algorithm:"What decides who sees what. You make your choices, then it decides how they land.",
  lane:"One route you take again and again because you know it works.",
  budget:"How much you have to spend. When it is gone, it is gone.",
  spend:"How much of it you actually used.",
  audience:"Everyone you could reach. Real people, not targets.",
  targeting:"How you decide who is worth reaching and who is not.",
  fatigue:"When the same thing stops working because people have seen it too many times.",
  saturation:"When you have reached everyone worth reaching. New wording will not conjure more people.",
  pixel:"How you find out what happened after someone saw it.",
  attribution:"Deciding who gets the credit when several things helped.",
  test:"Trying two versions and changing one thing, so you learn which change mattered.",
  swap:"Putting something new in the same slot. Everything around it stays put.",
  review:"Someone checking whether this is allowed to run. They are not judging whether it works.",
  client:"Whoever is paying, and whose definition of success is the one that counts.",
  keyword:"The words someone types when they are looking for what you sell.",
  match:"How loosely you let those words be read. Tight catches less and wastes less; loose catches more of everything.",
  negative:"Words you refuse to show up for, because that traffic is not yours.",
  bid:"The most you will pay to be in front of one person.",
  quality:"How well the thing you made fits what the person was actually after.",
  exposure:"Someone had the chance to see it. Nothing more than that yet.",
  response:"They looked. They did something. It is a start, not a sale.",
  prospect:"Someone raised their hand. They are interested, not sold, and not paid for yet.",
  outcome:"The thing you were after actually happened.",
  cost:"What one of those cost you.",
  value:"What it was worth once it happened.",
  efficiency:"What you got back against what you put in.",
  liquidity:"Money you can spend today. Not money you are owed, and not money on a report.",
  generic:"The source-side object named above. Use the connection below for the shared decision pattern, not as a literal definition of the media term."
});
const FLAVOR_SOURCE_OVERRIDES=Object.freeze({
  dnd:Object.freeze({
    buyer:"A party leader coordinates the players' plan from their side of the table. The leader does not control the world or decide the outcome.",
    account:"A party charter and campaign record persist across quests: roster, resources, reputation and prior events travel with them.",
    campaign:"A quest arc is a connected objective pursued across one or more encounters.",
    group:"An encounter plan assigns a particular party, place and tactic inside the larger quest.",
    ad:"A deployed adventurer is the specific participant sent into an encounter and tracked through it.",
    creative:"An adventurer equips a weapon, prepares a spell with its reagents or readies an item from the pack — the concrete thing they will actually use when the encounter starts.",
    platform:"The game world is where adventures take place, and the rules define what actions and encounters are possible there.",
    algorithm:"Encounter resolution combines the game's rules, the DM's judgment, character modifiers and dice after the players declare an action.",
    lane:"A quest lane is one recurring kind of route or objective the party can choose inside the larger world.",
    audience:"An encounter population is the group of creatures or people the party might meet. It is not their Armor Class or a difficulty score.",
    targeting:"An encounter-selection rule tells the party which locations, objectives or possible encounters it will pursue.",
    pixel:"A campaign log or divination record captures evidence about what happened; it does not cause the encounter.",
    attribution:"A quest-credit ledger records which action receives credit for the result, even when several party members contributed.",
    prospect:"A quest lead is a rumor, clue or informant pointing the party toward work — worth following up, but not yet a quest accepted, completed or paid."
  }),
  f1:Object.freeze({platform:"A circuit and racing series define the course, rules, calendar and competitive environment in which the car runs.",algorithm:"Race control, timing systems and a changing track turn the chosen setup into observed lap opportunities and results.",
    prospect:"A passing opportunity is a gap opening on track — a real chance that still has to be taken, completed and held before it scores anything."}),
  vc:Object.freeze({platform:"A market is the arena in which a portfolio company seeks customers and competes for scarce attention.",algorithm:"A market regime is the set of pricing, demand and competitive conditions acting on the investment thesis."}),
  kitchen:Object.freeze({platform:"A service channel and dining market define where guests discover, order and receive the menu.",algorithm:"Ticket routing and guest demand determine which orders reach each station and when.",
    prospect:"An interested guest has stopped at the menu and started asking questions — they have not yet ordered, been served or paid."}),
  agriculture:Object.freeze({platform:"The growing environment and market determine where a crop can be produced and what demand exists for it.",algorithm:"A forecast and irrigation-response model turns sensor readings and valve choices into an expected treatment plan."}),
  evolution:Object.freeze({platform:"A habitat is the environment in which a population competes and reproduces.",algorithm:"Selection pressure is the set of environmental conditions that makes some traits reproduce more successfully than others."}),
  mixing:Object.freeze({platform:"A playback channel and venue determine where listeners encounter the mix and what technical constraints shape it.",algorithm:"Distribution and room response shape which listeners hear the signal and how that signal reaches them."}),
  fishing:Object.freeze({platform:"A fishery and its market define the permitted waters, available grounds and economic context for a voyage.",algorithm:"Currents, weather and sonar interpretation shape where opportunities appear after the captain chooses a route.",
    prospect:"A promising bite is a fish mouthing the bait — a real sign of interest that is not yet hooked, landed or sold at market."}),
  jrpg:Object.freeze({platform:"The game world and battle system define where encounters happen and which actions are possible.",algorithm:"Battle rules and boss behavior resolve the party's chosen commands under the current phase and status effects.",
    prospect:"A quest lead is a rumor or objective marker pointing the party at possible progress — not yet a battle fought, won or rewarded."}),
  fighting:Object.freeze({platform:"The game and tournament ruleset define the legal characters, stages, timing and match conditions.",algorithm:"The game engine resolves inputs exactly, while the opponent adapts strategically to repeated choices."}),
  deckbuilder:Object.freeze({platform:"The table rules define which cards, resources and scoring interactions are available in the run.",algorithm:"The draw and scoring engine determines which options appear and how a played combination is evaluated."})
});
const FLAVOR_CONNECTION_TEMPLATES=Object.freeze({
  buyer:alias=>`Like ${alias}, the media buyer chooses the plan, coordinates limited resources and reacts to results without controlling them.`,
  account:alias=>`Like ${alias}, an ad account carries persistent access, history and learning across several campaigns.`,
  campaign:alias=>`Like ${alias}, a campaign organizes one objective and its budget across smaller operating units.`,
  group:alias=>`Like ${alias}, an ad set or ad group binds a narrower audience, placement and bidding plan inside the campaign.`,
  ad:alias=>`Like ${alias}, an ad is one deployed delivery object with its own identity, settings and performance history.`,
  creative:alias=>`Like ${alias}, creative is the message and sensory material the audience actually sees or hears inside the ad.`,
  platform:alias=>`Like ${alias}, a platform defines the operating environment, available inventory and governing delivery rules; campaigns run inside it.`,
  algorithm:alias=>`Like ${alias}, the delivery algorithm resolves opportunities from the chosen inputs, current conditions and evidence it has learned.`,
  lane:alias=>`Like ${alias}, a buying lane is one repeatable route to demand, with its own controls, constraints and performance pattern.`,
  budget:alias=>`Like ${alias}, budget is a finite resource ceiling that must be allocated across competing opportunities.`,
  spend:alias=>`Like ${alias}, media spend is the part of the authorized budget actually consumed by delivery.`,
  audience:alias=>`Like ${alias}, an audience identifies the pool of people eligible to encounter the message.`,
  targeting:alias=>`Like ${alias}, targeting is the rule that selects which people, searches, placements or contexts are eligible for delivery.`,
  fatigue:alias=>`Like ${alias}, creative fatigue is declining response to a repeated tactic even when the larger market still contains demand.`,
  saturation:alias=>`Like ${alias}, saturation means the reachable opportunity pool is running out, not merely that one creative is tired.`,
  pixel:alias=>`Like ${alias}, a pixel or event source records evidence after delivery so the system can measure and learn.`,
  attribution:alias=>`Like ${alias}, attribution assigns reporting credit for an outcome that may have involved several touchpoints.`,
  test:alias=>`Like ${alias}, a media test compares alternatives while holding the decision boundary as steady as possible.`,
  swap:alias=>`Like ${alias}, a creative swap replaces the active message without necessarily changing the campaign's objective or audience.`,
  review:alias=>`Like ${alias}, a review is a gate that can approve, hold or reject an item without measuring whether it would perform well.`,
  client:alias=>`Like ${alias}, the client supplies the objective, constraints and definition of a useful business outcome.`,
  keyword:alias=>`Like ${alias}, a keyword names the search intent a campaign is prepared to answer.`,
  match:alias=>`Like ${alias}, match type controls how broadly the system may interpret that intent signal.`,
  negative:alias=>`Like ${alias}, a negative keyword explicitly removes unwanted demand from consideration.`,
  bid:alias=>`Like ${alias}, a bid sets how aggressively limited resources may be committed for one opportunity.`,
  quality:alias=>`Like ${alias}, Quality Score summarizes several kinds of fit that can affect paid-search rank and cost.`,
  exposure:alias=>`The ${alias} marks an opportunity to be encountered; it does not yet prove attention or business value.`,
  response:alias=>`The ${alias} marks an early response after exposure; later funnel stages still have to succeed.`,
  prospect:alias=>`Like the ${alias}, a lead is an early expression of interest — a submitted form or inquiry — that still has to survive qualification, acceptance and the sale before it is worth anything.`,
  outcome:alias=>`The ${alias} marks a stated intermediate or final outcome, whose exact meaning depends on the funnel.`,
  cost:(alias,term)=>{const s=String(term||"").toLowerCase(),metric=/cpm|thousand/.test(s)?"CPM":/cpc|click/.test(s)?"CPC":/cpl|lead/.test(s)?"CPL":"CPA",
      unit=metric==="CPM"?"1,000 impressions":metric==="CPC"?"click":metric==="CPL"?"lead":"acquisition";
    return `Like ${alias}, ${metric} is media spend per ${unit}.`;},
  value:alias=>`The ${alias} describes value in a named ledger; reported, modeled and collected value must remain separate.`,
  efficiency:alias=>`The ${alias} compares a named result with a named resource base; changing either side changes the question being answered.`,
  liquidity:alias=>`The ${alias} describes resources available to meet obligations now, which is different from reported profit or future value.`
});
const FLAVOR_TERM_BOUNDARIES=Object.freeze({
  buyer:"The buyer controls decisions, not auction outcomes or customer behavior.",
  account:"An ad account is a platform-owned technical and permission container, not a literal team, vehicle, field or portfolio.",
  campaign:"A media campaign has platform-specific settings and reporting rules; the source-side plan is only a memory aid for its scope.",
  group:"The exact layer is platform-specific — such as an ad set, ad group, ad squad or line item — and the analogy does not replace that hierarchy.",
  ad:"An ad is a delivery object in a platform hierarchy. It is distinct from the creative asset carried inside it.",
  creative:"Creative is produced media and copy, not the whole ad, audience, campaign or account that delivers it.",
  platform:"A platform is a commercial auction, delivery and reporting system, not literally the source-side world or ruleset.",
  algorithm:"Platform delivery is not pure chance: bids, predicted response, inventory, policy and learned evidence all influence the result.",
  lane:"A buying lane is a game-level grouping for a route to demand, not a universal platform hierarchy layer.",
  budget:"Budget authorizes spend; it is not the same thing as cash, actual spend, profit or available credit.",
  spend:"Media spend is consumed campaign budget. It is not agency revenue, client payment, profit or the full operating cost base.",
  audience:"Audiences are people with intent, context and privacy rights, not enemies, soil, fish, cards or abstract targets.",
  targeting:"Targeting defines eligibility; it cannot guarantee attention, intent, conversion or lawful use of audience data.",
  fatigue:"Fatigue belongs to a repeated creative treatment; it is not the same as exhausting the total reachable market.",
  saturation:"Saturation belongs to reachable demand; a fresh creative can recover fatigue but cannot create unlimited qualified demand.",
  pixel:"A pixel or event source observes configured events. It does not independently prove causation, revenue or lead quality.",
  attribution:"Attribution is reporting credit, not another conversion, payment or proof that one touchpoint caused the outcome.",
  test:"A coincident change is not automatically causal; the comparison, window and stop rule still determine what the test can support.",
  swap:"A swap changes the active creative; other settings remain separate unless the player changes them too.",
  review:"Approval and compliance status do not guarantee performance, and strong performance does not override policy.",
  client:"A client is a real stakeholder with individual needs, not a fixed game archetype or a puzzle with one winning dialogue choice.",
  keyword:"A keyword is an advertiser instruction, while the search term is what the person actually typed.",
  match:"Match behavior is defined by the ad platform and can change over time; the analogy does not define eligibility.",
  negative:"An exclusion can prevent waste, but an overbroad exclusion can also remove useful demand.",
  bid:"A bid affects auction participation and rank; it does not guarantee placement, clicks or conversions.",
  quality:"Quality Score is a platform diagnostic for paid search, not a universal grade for a business, client or creative.",
  exposure:"Exposure metrics describe delivery, not attention, persuasion or incremental business value.",
  response:"An early response can be low quality or fail later; it is not the final business outcome.",
  prospect:"A lead is not a customer, revenue or proof of quality. Volume can rise while downstream acceptance falls, so lead counts must be read beside qualification and conversion evidence.",
  outcome:"The outcome label must match the actual funnel event and measurement window; similar names can represent different business value.",
  cost:"A lower unit cost is not automatically better when traffic, lead or acquisition quality changes downstream.",
  value:"Modeled, attributed, recognized and collected value are different ledgers and must not be added together as separate customer outcomes.",
  efficiency:"Every efficiency ratio depends on its numerator, denominator, cost base and time window; the analogy cannot choose those for you.",
  liquidity:"Available cash and credit can keep the operation alive, but they do not make an unprofitable strategy economically sound.",
  generic:"This is a loose memory aid rather than a one-to-one match. The media-buying definition and game rule remain authoritative."
});
function flavorConceptForTerm(term){
  const s=String(term||"").toLowerCase();
  if(/^(?:google ads search|google ads demand gen|google display \/ demand gen|microsoft advertising search|meta ads|tiktok ads|snapchat ads|linkedin campaign manager)$/.test(s))return "platform";
  if(/^account$|platform ad account/.test(s))return "account";
  if(/^group$|ad set|ad group/.test(s))return "group";
  if(/^ad$|delivery object/.test(s))return "ad";
  if(/^budget$|campaign budget/.test(s))return "budget";
  if(/^media spend$|^spend$/.test(s))return "spend";
  if(/^campaign$|campaign intent|brand play/.test(s))return "campaign";
  if(/media buyer|buyer/.test(s))return "buyer";
  if(/^platform$/.test(s))return "platform";
  if(/algorithm|auction|learning/.test(s))return "algorithm";
  if(/^buying lane$|^lane$|platform initiative/.test(s))return "lane";
  if(/^audience$/.test(s))return "audience";
  if(/^targeting$|audience targeting|broad targeting|targeting rule/.test(s))return "targeting";
  if(/^creative$|creative format|asset|concept|hook|mechanic/.test(s))return "creative";
  if(/fatigue|decay|milking/.test(s))return "fatigue";
  if(/saturation/.test(s))return "saturation";
  if(/^pixel$|event source/.test(s))return "pixel";
  if(/attribution|platform claim|view-through/.test(s))return "attribution";
  if(/^test$|creative test|test stop|causal test/.test(s))return "test";
  if(/creative swap|swap|recast/.test(s))return "swap";
  if(/^review$|approval|compliance/.test(s))return "review";
  if(/client|stakeholder|intake/.test(s))return "client";
  if(/^keyword$|search intent/.test(s))return "keyword";
  if(/match type|exact match|phrase match|broad match/.test(s))return "match";
  if(/negative keyword/.test(s))return "negative";
  if(/^bid$|max cpc/.test(s))return "bid";
  if(/quality score|relevance|rank/.test(s))return "quality";
  if(/^(?:cpm|cpc|cpl|cpa|media cpl|reported media cpl|modeled cpl)$|cost per (?:thousand|click|lead|acquisition)/.test(s))return "cost";
  if(/impression|reach|frequency|cpm/.test(s))return "exposure";
  if(/click|ctr|lp ctr|cpc/.test(s))return "response";
  if(/\blead\b/.test(s))return "prospect";
  if(/conversion|cvr|cpl|cpa/.test(s))return "outcome";
  if(/^(?:cash|operating cash|cash balance|available cash|cash reserve)$/.test(s))return "liquidity";
  if(/revenue|profit|contribution|receivable|settlement/.test(s))return "value";
  if(/roi|roas|mer|margin|epl/.test(s))return "efficiency";
  if(/liquidity|credit|runway|reserve|insolvency/.test(s))return "liquidity";
  return "generic";
}
function flavorSourceDefinition(term,f=currentFlavor()){
  const concept=flavorConceptForTerm(term),overrides=FLAVOR_SOURCE_OVERRIDES[f.id]||{};
  return overrides[concept]||FLAVOR_SOURCE_CONCEPTS[concept]||FLAVOR_SOURCE_CONCEPTS.generic;
}
function flavorMechanicModel(term,f=currentFlavor()){
  const concept=flavorConceptForTerm(term),alias=flavorAliasForTerm(term,f),relation=FLAVOR_CONNECTION_TEMPLATES[concept],
    canonical=flavorMechanicExplanation(term,f),fallback=canonical===GENERIC_FLAVOR_CONNECTION,
    aliasText=String(alias||"").trim().toLowerCase(),authoredPartial=concept==="generic"&&!fallback&&aliasText&&!aliasText.includes("no direct one-to-one")&&canonical.toLowerCase().includes(aliasText),
    strength=concept==="generic"?(authoredPartial?"partial":"none"):"strong",connection=strength==="none"?"":relation?`${relation(alias,term,f)} ${canonical}`:canonical;
  return Object.freeze({term:String(term||""),flavor:f.name,mark:f.mark,alias,concept,
    strength,source:strength==="none"?"":flavorSourceDefinition(term,f),connection,
    boundary:strength==="none"?"":FLAVOR_TERM_BOUNDARIES[concept]||FLAVOR_TERM_BOUNDARIES.generic});
}
function flavorRosettaMarkup(compact=false){
  /* One correspondence per row, each carrying the sentence that says WHAT actually carries
     over. A bare "A ≈ B · C ≈ D …" chain names pairs without communicating the analogous
     meaning, which is the failure this layout replaced (2026-08-08). */
  const f=currentFlavor(),t=f.terms,scope=realWorldScope(),reason=FLAVOR_REASONING[f.id]||FLAVOR_REASONING[DEFAULT_FLAVOR];
  const pairs=[["Account","account",t.account],["Campaign","campaign",t.campaign],["Creative","creative",t.creative],["Budget","budget",t.budget]];
  if(!compact)pairs.push(["Ad","ad",f.metrics.ad],["Audience","audience",t.audience],["Targeting","targeting",t.targeting],["Pixel","pixel",t.pixel],["Attribution","attribution",t.attribution]);
  const pairMarkup=([label,concept,alias])=>{const relation=FLAVOR_CONNECTION_TEMPLATES[concept];
    return `<div class="rosetta-pair"><b>${label} <i aria-hidden="true">↔</i> ${alias}</b><span>${relation?relation(alias,label):""}</span></div>`;};
  return `<div class="rosetta" id="overlayFlavorLens"><h3>${f.mark} ${f.name} lens</h3>
    <div class="flow"><b>Real work:</b> ${scope.channel} · ${scope.team}.</div>
    <div class="rosetta-pairs">${pairs.map(pairMarkup).join("")}</div>
    ${compact?"":`<div class="flow"><b>Media funnel:</b> Impression → Click → Lead → Conversion → Revenue → Profit.<br><b>${f.name} path:</b> ${flavorAnalogyFlow(f)}.</div>`}
    <div class="analogy-bridge"><b>Why it helps</b><p>${reason.why}</p></div>
    <aside class="analogy-boundary" aria-label="Limit of this analogy"><b>Where the analogy stops</b><p>${reason.boundary}</p></aside></div>`;
}
function flavorGridMarkup(){
  return `<div class="flavor-grid">${ORDERED_FLAVORS.map(f=>`<button class="flavor-card" id="flavorCard-${f.id}" type="button" data-flavor="${f.id}" aria-pressed="${f.id===ACTIVE_FLAVOR}">
    <span class="mark" aria-hidden="true">${f.mark}</span><b>${f.name}</b><small>${f.premise}</small><span class="flavor-card-pairs">Account ≈ ${f.terms.account} · Creative ≈ ${f.terms.creative} · Budget ≈ ${f.terms.budget}</span></button>`).join("")}</div>`;
}
function statFlavorAlias(label){
  const f=currentFlavor(),t=f.terms,m=f.metrics,s=String(label).toLowerCase();
  if(/unsettled|receivable/.test(s))return t.receivable;
  if(/pending/.test(s))return m.pending;
  if(/unknown|unattributed/.test(s))return t.attribution;
  if(/^cash$|settled/.test(s))return t.cash;
  if(/available credit|credit holds/.test(s))return t.credit;
  if(/portfolio allocation/.test(s))return t.budget;
  if(/platform claims|attribution gap|audit quality/.test(s))return t.attribution;
  if(/attributed value/.test(s))return `${m.revenue} credited by ${t.attribution}`;
  if(/open crises/.test(s))return t.crisis;
  if(/modeled (?:outcome )?value/.test(s))return m.revenue;
  if(/projected contribution/.test(s))return m.profit;
  if(/\bmer\b/.test(s))return m.mer;
  if(/impression share|\bsis\b/.test(s))return m.impressionShare;
  if(/wasted click/.test(s))return t.negative;
  if(/\bimpression/.test(s))return m.impression;
  if(/\bclick/.test(s))return m.click;
  if(/\breach/.test(s))return m.reach;
  if(/frequency/.test(s))return m.frequency;
  if(/\bcpc\b/.test(s))return m.cpc;
  if(/\bepl\b/.test(s))return m.epl;
  if(/lp ctr/.test(s))return m.lpctr;
  if(/daily budget|allocated|budget/.test(s))return t.budget;
  if(/operations cost/.test(s))return `support cost paid from ${t.budget}`;
  if(/media spend/.test(s))return m.spend;
  if(/spend|investment|cost/.test(s))return m.spend;
  if(/modeled contribution|profit/.test(s))return m.profit;
  if(/roas/.test(s))return m.roas;
  if(/all-in business roi|account roi/.test(s))return t.accountView;
  if(/attributed media roi|ad roi/.test(s))return t.attributedView;
  if(/roi/.test(s))return m.roi;
  if(/revenue/.test(s))return m.revenue;
  if(/cpl/.test(s))return m.cpl;
  if(/cpa/.test(s))return m.cpa;
  if(/lead/.test(s))return m.lead;
  if(/conversion|pace/.test(s))return m.conversion;
  if(/demand/.test(s))return t.demand;
  if(/trust/.test(s))return t.client;
  if(/agency capability points?|(?:agency |career )?skill points?/.test(s))return "spendable Agency Career unlock currency";
  if(/training xp|training points|knowledge score/.test(s))return "persistent training progress outside the simulation economy";
  if(/day/.test(s))return m.day;
  return "no direct one-to-one analogue";
}
function flavorAliasForTerm(term,f=currentFlavor()){
  const s=String(term||"").toLowerCase(),t=f.terms,m=f.metrics,
    x=FLAVOR_CONTEXT_ALIASES[f.id]||FLAVOR_CONTEXT_ALIASES[DEFAULT_FLAVOR],formats=FLAVOR_CREATIVE_FORMAT_ALIASES[f.id]||FLAVOR_CREATIVE_FORMAT_ALIASES[DEFAULT_FLAVOR],
    guided=FLAVOR_GUIDED_ALIASES[f.id]||FLAVOR_GUIDED_ALIASES[DEFAULT_FLAVOR],career=FLAVOR_CAREER_ALIASES[f.id]||FLAVOR_CAREER_ALIASES[DEFAULT_FLAVOR];
  const exact={};const map=(keys,value)=>keys.forEach(key=>{exact[key]=value;});
  map(["account"],t.account);map(["advertiser workstream"],x.advertiserWorkstream);
  map(["ad"],m.ad);map(["slot"],`${m.ad} carrying ${t.creative} with ${t.budget}`);map(["ad set","ad group"],t.group);map(["campaign","brand play"],t.campaign);
  map(["holding company","business container"],t.holding);map(["operating company"],t.operatingCompany);map(["platform initiative"],t.initiative);
  map(["account view"],t.accountView);map(["account roi","all-in business roi"],`${m.roi} across the full ${t.account}`);
  map(["modeled outcome"],`${m.revenue} in the business ledger`);map(["ad view","attributed report"],t.attributedView);
  map(["attributed value"],`${m.revenue} credited by ${t.attribution}`);
  map(["ad roi","attributed media roi"],`${m.roi} credited to one ${m.ad}`);
  map(["common"],guided.common);map(["epic"],guided.epic);map(["legendary"],guided.legendary);
  map(["landing-page visit","landing page visit"],guided.landingVisit);map(["on-page click","on page click"],guided.onPageClick);
  map(["programmatic"],guided.programmatic);map(["ctv"],guided.ctv);map(["platform ad account"],guided.platformAdAccount);
  map(["reporting key"],guided.reportingKey);map(["downstream acceptance"],guided.downstreamAcceptance);
  map(["acceptance criteria"],guided.acceptanceCriteria);map(["lead quality"],guided.leadQuality);map(["account learning"],guided.accountLearning);
  map(["platform"],t.platform);map(["paid social"],`${t.platform} using ${t.creative} + ${t.audience}`);
  map(["native","demand gen","display"],`${t.platform} interruption lane`);map(["paid search","ppc"],`${t.platform} using ${t.keyword} + ${t.bid}`);map(["keyword","search intent"],t.keyword);
  map(["budget"],t.budget);map(["allocation"],`${t.budget} assigned to a lane`);map(["campaign budget"],`${t.budget} ceiling for one ${t.campaign}`);
  map(["operating reserve"],career.operatingReserve);map(["monthly operating statement"],career.operatingStatement);
  map(["monthly operating obligations"],career.operatingObligations);map(["runway"],career.runway);map(["insolvency"],career.insolvency);
  map(["scaling"],`expanding a proven ${m.ad} with more ${t.budget}`);map(["cash"],t.cash);map(["credit line"],t.credit);map(["credit holds"],`${t.credit} already reserved`);
  map(["liquidity"],`${t.cash} + ${t.credit}`);map(["concentration risk"],`${t.platform} overexposure`);map(["resilience"],`${t.holding} safeguards`);
  map(["credit limit"],`maximum ${t.credit} capacity`);map(["available credit"],`${t.credit} capacity not yet reserved`);
  map(["platform concentration"],`largest ${t.platform} share of ${m.spend}`);map(["advertiser concentration"],`largest ${x.advertiserWorkstream} share of ${m.revenue}`);
  map(["workstream mix"],`composition of ${x.advertiserWorkstream} records`);map(["buying lane"],t.initiative);
  map(["delivery hierarchy"],`${t.account} → ${t.campaign} → ${t.group} → ${m.ad} → ${t.creative}`);
  map(["contingency layer"],`${t.holding} safeguard for billing and measurement shocks`);map(["ops action"],`one support move outside ${m.spend}`);
  map(["acquisition gate"],`${t.review} of performance, liquidity, measurement, and diversification`);map(["gate streak"],`consecutive passed ${t.review} checkpoints`);
  map(["crisis"],t.crisis);
  map(["settlement","settlement lag","unsettled","receivables"],t.receivable);map(["settled value"],`${m.revenue} cleared into ${t.cash}`);
  map(["pixel"],t.pixel);map(["event source"],`${t.pixel} event feed`);map(["tracking"],x.tracking);
  map(["event-source contamination","pixel contamination","cross-tag contamination"],x.contamination);
  map(["event-source cluster","shared event source"],x.cluster);
  map(["signal integrity"],`purity of the ${x.tracking}`);map(["attribution-control quality"],`${t.attribution} audit strength`);
  map(["cross-account claim"],`${t.attribution} credit routed between ${x.advertiserWorkstream} records`);
  map(["attribution"],t.attribution);map(["attribution gap"],`difference between ${t.attribution} credit and business outcomes`);
  map(["platform claims"],`${t.attribution} credit written by platforms`);map(["view-through"],`${t.attribution} credit after an exposure without a click`);
  map(["algorithm"],t.algorithm);map(["learning"],`${t.algorithm} calibration from delivery history`);map(["learning phase"],`early ${t.algorithm} calibration period`);map(["noise"],`${t.algorithm} uncertainty`);
  map(["variance"],`spread of ${t.algorithm} rolls`);map(["seed"],`repeatable ${t.algorithm} roll sequence`);
  map(["accelerated delivery","standard delivery"],`${t.budget} pacing rule`);
  map(["creative pipeline"],`${t.test} queue from brief through approval`);map(["creative test"],t.test);map(["creative swap"],t.swap);map(["recast"],`${t.swap} with a new face or asset`);
  map(["review"],t.review);map(["approval","creative approval"],x.approval);map(["compliance"],x.compliance);
  map(["compliance hold"],x.complianceHold);map(["account hold"],x.accountHold);
  map(["targeting"],t.targeting);map(["broad targeting"],`broad ${t.targeting}`);map(["restate"],`${t.targeting} change while the face stays fixed`);map(["audience","broad"],t.audience);
  map(["placement"],x.placement);map(["vertical"],x.vertical);map(["geo cut","geo","geography"],x.geo);map(["demo","demographic"],x.demo);
  map(["objective","campaign intent"],`${t.campaign} purpose`);map(["decision window"],`${m.day} evidence window`);
  map(["relevance"],x.relevance);map(["quality score"],x.qualityScore);
  map(["expected ctr"],x.expectedCtr);map(["ad relevance"],x.relevance);
  map(["landing page experience"],x.landingExperience);
  map(["expanded text ad"],x.expandedTextAd);
  map(["a/b ad permutation"],x.adPermutation);
  map(["avg position"],x.avgPosition);
  map(["creative rarity"],x.creativeRarity);map(["band"],x.band);
  map(["creative"],t.creative);map(["asset"],`${t.creative} deliverable`);map(["concept"],`${t.creative} family idea`);
  map(["creative format"],`${t.creative} build type`);
  for(const [label,id] of Object.entries(CREATIVE_FORMAT_TERM_TO_ID))map([label],genericCreativeFormatAnalogy(id,f,formats));
  map(["mechanic"],`${t.creative} repeatable device`);map(["hook"],`${t.creative} opening move`);
  map(["matrix"],`${t.test} grid`);map(["axis","axes"],`${t.creative} variation axis`);map(["cut"],`${t.creative} variant`);
  map(["offer timing"],`${t.creative} timing`);map(["multiplication"],`${t.creative} variation system`);
  map(["fatigue"],t.fatigue);map(["decay"],`measured decline caused by ${t.fatigue}`);map(["milking"],`continuing a tiring ${t.creative} for residual value`);map(["saturation"],t.saturation);map(["tail"],t.bench);
  map(["match type"],t.match);map(["exact match"],`narrow ${t.match}`);map(["phrase match"],`phrase-bounded ${t.match}`);map(["broad match"],`expansive ${t.match}`);
  map(["negative keyword"],t.negative);map(["search terms report"],`query ledger reviewed before adding ${t.negative}`);
  map(["bid","max cpc"],t.bid);map(["sis","impression share"],m.impressionShare);map(["sis lost to rank"],`${m.impressionShare} missed because ${t.quality} was insufficient`);map(["sis lost to budget"],`${m.impressionShare} missed because ${t.budget} ran out`);
  map(["query ceiling"],`${t.keyword} demand ceiling`);
  map(["revenue","modeled outcome value","modeled revenue"],m.revenue);map(["profit"],m.profit);
  map(["modeled contribution"],`${m.profit} estimated after the named cost base`);
  map(["attributed media margin"],`${m.revenue} credited by ${t.attribution} minus ${m.spend}`);
  map(["media spend"],m.spend);map(["operations cost"],`support cost paid from ${t.budget}`);
  map(["adjusted billed cost"],`${m.spend} plus settlement friction`);map(["lead"],m.lead);map(["reported lead"],`${m.lead} credited by a platform report`);map(["modeled lead","modeled leads"],`${m.lead} estimated in the business ledger`);map(["reported clicks"],`${m.click} visible in a platform report`);map(["conversion"],m.conversion);
  map(["click"],m.click);map(["impressions"],m.impression);map(["reach"],m.reach);map(["cpc"],m.cpc);
  map(["cpm"],m.cpm);map(["ctr"],m.ctr);map(["cvr"],m.cvr);map(["cpl","media cpl","reported media cpl"],m.cpl);
  map(["cpa"],m.cpa);map(["epl"],m.epl);map(["lp ctr","lander","landing-page optimization"],m.lpctr);map(["roi"],m.roi);map(["roas"],m.roas);
  map(["modeled mer"],`${m.mer} for one initiative`);map(["blended modeled mer","blended mer"],`${m.mer} across the whole portfolio`);
  map(["claimed roas"],`${m.roas} in a platform-credit report`);map(["projected contribution"],`${m.profit} after named media and operating costs`);
  map(["trap"],m.loss);map(["in-window"],`${m.day} range`);
  map(["front end"],`${m.cpm} + ${m.ctr} + ${m.cpc}`);map(["funnel"],flavorFlow(f));
  map(["intake","baseline"],t.client);
  map(["business prior"],`${t.client} context clue`);map(["client insight","client read"],`${t.client} behavior read`);
  map(["client trust"],`${t.client} relationship score`);map(["trust dimensions"],`${t.client} relationship attributes`);
  map(["client tension"],`${t.client} pressure meter`);map(["communication stance"],`${t.client} dialogue approach`);
  map(["working agreement"],`${t.client} operating pact`);map(["commitment"],`${t.client} follow-through promise`);
  map(["relationship risk"],`${t.client} retention danger`);map(["demand index"],t.demand);
  map(["account health"],career.accountHealth);map(["outcome index"],career.outcomeIndex);
  map(["agency capability points","agency skill points","career skill points","skill points"],career.capabilityPoints);
  map(["agency profit"],`${m.profit} across the agency operating ledger`);
  map(["client media spend"],`${m.spend} inside one ${t.client} campaign economy`);
  map(["client seat"],`one ${t.client} relationship slot in the agency roster`);
  map(["service cadence"],`recurring ${m.day} rhythm for meaningful ${t.account} work`);
  map(["service debt"],`overdue ${t.buyer} actions carried into later ${m.day} turns`);
  map(["focus units"],`${t.buyer} attention ${t.budget} for one workday`);
  map(["capacity utilization"],`share of team attention ${t.budget} already committed`);
  map(["sprawl penalty"],`context-switching friction across unrelated ${t.platform} and ${x.vertical} lanes`);
  map(["retainer"],`recurring ${m.revenue} paid by the ${t.client} for agency service`);
  map(["payroll"],`recurring ${t.cash} cost for additional ${t.buyer} capacity`);
  map(["affiliate pivot"],`one-way change from ${t.client} service to owned ${t.initiative} economics`);
  map(["affiliate signal"],career.affiliateSignal);map(["compliance heat"],career.complianceHeat);
  map(["validation"],career.validation);map(["clawback"],career.clawback);
  map(["compliance health"],`durability under ${x.compliance} review`);
  map(["training xp","training points","knowledge score"],`${t.buyer} practice XP outside the campaign`);map(["credit payment failure"],`missed ${t.credit} obligation`);
  if(exact[s])return exact[s];
  if(/holding company/.test(s))return t.holding;
  if(/operating company/.test(s))return t.operatingCompany;
  if(/advertiser workstream/.test(s))return x.advertiserWorkstream;
  if(/platform ad account/.test(s))return guided.platformAdAccount;
  if(/platform initiative/.test(s))return t.initiative;
  if(/\bcash\b/.test(s))return t.cash;
  if(/credit line|available credit|credit hold/.test(s))return t.credit;
  if(/receivable/.test(s))return t.receivable;
  if(/crisis/.test(s))return t.crisis;
  if(/demand index/.test(s))return t.demand;
  if(/reporting key/.test(s))return guided.reportingKey;
  if(/downstream acceptance/.test(s))return guided.downstreamAcceptance;
  if(/acceptance criteria/.test(s))return guided.acceptanceCriteria;
  if(/lead quality/.test(s))return guided.leadQuality;
  if(/account learning/.test(s))return guided.accountLearning;
  if(/account view|modeled outcome|business outcome|account roi/.test(s))return t.accountView;
  if(/ad view|attributed report|attributed ad|ad roi/.test(s))return t.attributedView;
  if(/account hold/.test(s))return x.accountHold;
  if(/compliance hold/.test(s))return x.complianceHold;
  if(/\baccount\b/.test(s))return t.account;
  if(/delivery object|\bad\b/.test(s))return m.ad;
  if(/ad set|ad group/.test(s))return t.group;
  if(/campaign/.test(s))return t.campaign;
  if(/media buyer|buyer/.test(s))return t.buyer;
  if(/creative swap|swap/.test(s))return t.swap;
  if(/creative test|test/.test(s))return t.test;
  if(/creative rarity/.test(s))return x.creativeRarity;
  if(/creative approval/.test(s))return x.approval;
  if(/creative|asset|concept|hook|matrix|axis|cut/.test(s))return t.creative;
  if(/platform/.test(s))return t.platform;
  if(/algorithm|auction|learning/.test(s))return t.algorithm;
  if(/budget|capital/.test(s))return t.budget;
  if(/targeting|field prescription|spacing plan/.test(s))return t.targeting;
  if(/placement/.test(s))return x.placement;
  if(/vertical/.test(s))return x.vertical;
  if(/geo cut|geograph/.test(s))return x.geo;
  if(/demographic|\bdemo\b/.test(s))return x.demo;
  if(/audience|broad targeting/.test(s))return t.audience;
  if(/fatigue|decay|milking/.test(s))return t.fatigue;
  if(/saturation|capacity/.test(s))return t.saturation;
  if(/event.source contamination|pixel contamination|cross.tag contamination/.test(s))return x.contamination;
  if(/event.source cluster|shared event source/.test(s))return x.cluster;
  if(/tracking/.test(s))return x.tracking;
  if(/pixel|event.source|sensor/.test(s))return t.pixel;
  if(/attribution|platform claims|reported/.test(s))return t.attribution;
  if(/approval/.test(s))return x.approval;
  if(/compliance/.test(s))return x.compliance;
  if(/review/.test(s))return t.review;
  if(/client|stakeholder|intake|baseline|trust/.test(s))return t.client;
  if(/negative keyword|search terms/.test(s))return t.negative;
  if(/keyword/.test(s))return t.keyword;
  if(/match/.test(s))return t.match;
  if(/quality score/.test(s))return x.qualityScore;
  if(/avg position/.test(s))return x.avgPosition;
  if(/\bband\b/.test(s))return x.band;
  if(/relevance/.test(s))return x.relevance;
  if(/rank/.test(s))return t.quality;
  if(/bid|max cpc/.test(s))return t.bid;
  if(/impression share|\bsis\b/.test(s))return m.impressionShare;
  if(/impression/.test(s))return m.impression;
  if(/\breach\b/.test(s))return m.reach;
  if(/frequency/.test(s))return m.frequency;
  if(/lp ctr/.test(s))return m.lpctr;
  if(/\bctr\b/.test(s))return m.ctr;
  if(/\bcvr\b/.test(s))return m.cvr;
  if(/\bcpm\b/.test(s))return m.cpm;
  if(/\bcpc\b/.test(s))return m.cpc;
  if(/\bcpl\b/.test(s))return m.cpl;
  if(/\bcpa\b/.test(s))return m.cpa;
  if(/\bepl\b/.test(s))return m.epl;
  if(/\broas\b/.test(s))return m.roas;
  if(/\bmer\b/.test(s))return m.mer;
  if(/\broi\b/.test(s))return m.roi;
  if(/profit|contribution/.test(s))return m.profit;
  if(/revenue|outcome value/.test(s))return m.revenue;
  if(/spend|cost/.test(s))return m.spend;
  if(/conversion|sale/.test(s))return m.conversion;
  if(/lead/.test(s))return m.lead;
  if(/click/.test(s))return m.click;
  if(/unsettled/.test(s))return t.receivable;
  if(/pending/.test(s))return m.pending;
  return "no direct one-to-one analogue";
}
function realityMarkup(){
  const s=realWorldScope(),f=currentFlavor();
  const lens=analogiesEnabled()?`<br><span class="lens">${escapeRealityText(f.mark)} ${escapeRealityText(f.name)} lens:</span> ${escapeRealityText(f.premise)}`:"";
  return `<details class="reality-details" data-disclosure-id="run-reality"><summary><span class="reality-label">The job you are doing</span>`+
    `<span class="reality-summary"><b>${escapeRealityText(s.channel)}</b></span><span class="reality-more">What that means</span></summary>`+
    `<div class="reality-copy"><b>Who you are:</b> ${escapeRealityText(s.team)}<br>`+
    `<b>Where you can buy:</b> ${escapeRealityText(s.platform)}<br>`+
    `<b>What you are judged on:</b> ${escapeRealityText(s.objective)}<br>`+
    `<b>How the pieces stack:</b> ${escapeRealityHierarchy(s.hierarchy)}${lens}</div></details>`;
}
function updateFlavorChrome(){
  const f=currentFlavor(),select=document.getElementById("flavorSelect"),reality=document.getElementById("realityBar");
  if(select){
    if(!select.innerHTML)select.innerHTML=ORDERED_FLAVORS.map(x=>`<option value="${x.id}">${x.name}</option>`).join("");
    select.value=f.id;
  }
  if(reality){const next=realityMarkup();if(reality.innerHTML!==next)reality.innerHTML=next;}
  const suffix=value=>analogiesEnabled()?` · ${value}`:"";
  const runLens=document.getElementById("runLens");if(runLens)runLens.textContent=`Spend selected budgets and reveal results${suffix(f.terms.turn)}`;
  const ops=document.getElementById("operationsSection");if(ops)ops.textContent=`Your next move${suffix(f.terms.buyer)}`;
  const note=document.getElementById("operationsSectionNote");if(note)note.textContent=`change, review and create${suffix(f.terms.test)}`;
  const log=document.getElementById("logSection");if(log)log.textContent=`Day log${suffix(f.terms.log)}`;
  const bench=document.getElementById("benchSection");if(bench)bench.textContent=`Creative library${suffix(f.terms.bench)}`;
  const overlayLens=document.getElementById("overlayFlavorLens");if(overlayLens)overlayLens.outerHTML=flavorRosettaMarkup();
  document.querySelectorAll("[data-flavor-concept]").forEach(el=>{
    el.textContent=flavorCue(el.dataset.flavorConcept||"day");
  });
  document.querySelectorAll("button[data-flavor]").forEach(button=>{
    button.setAttribute("aria-pressed",String(button.dataset.flavor===ACTIVE_FLAVOR));
  });
}
function setFlavor(id,{persist=true,updateUrl=true,rerender=true}={}){
  if(!FLAVOR_BY_ID[id])return false;
  ACTIVE_FLAVOR=id;
  if(persist){try{if(typeof localStorage!=="undefined")localStorage.setItem(FLAVOR_KEY,id);}catch(e){}}
  if(updateUrl&&typeof history!=="undefined"&&history.replaceState){
    const p=new URLSearchParams(location.search);p.set("flavor",id);history.replaceState(null,"","?"+p.toString());
  }
  updateFlavorChrome();
  if(rerender&&typeof S!=="undefined"&&S){MODE===0?renderClassic():render();}
  return true;
}
const flavorSelect=document.getElementById("flavorSelect");
if(flavorSelect)flavorSelect.addEventListener("change",e=>{
  const id=e.target.value;if(setFlavor(id)&&typeof writeOnboardingPrefs==="function")writeOnboardingPrefs({flavor:id});
});
