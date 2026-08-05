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
  {id:"deckbuilder",name:"Deckbuilder",mark:"♠",audience:"Balatro / Slay the Spire players",
   premise:"Build an economic deck, find synergies, and retire cards before their value decays.",
   signature:"Creative test ≈ card draft · Budget ≈ energy · Fatigue ≈ card decay · Scaling ≈ upgrading a proven card",
   metrics:flavorMetrics(["hand","card in play","energy spent","gross chips","run score","score efficiency","gross-chip multiplier","cost per thousand deals","card-connect rate","scoring-combo rate","energy per scoring chance","energy per completed score","scoring chance","scored hand","blind cleared","run busted","chips waiting to score"]),
   terms:flavorTerms(["deck pilot","full deck","run strategy","card family","playable card","table rules","draw and scoring engine","energy pool","enemy pool","card decay","overplayed hand","combat log","score credit","card draft","replace a card","shop gate","stakeholder","card tag","targeting rule","banish card","energy commitment","card synergy"]),
   flow:"Impression → card dealt · Click → card connects · Lead or sale → points banked · Profit → run score",
   events:{quiet:"The draw is ordinary; fundamentals decide the hand.",viral:"A card found a rare multiplier pocket—exploit it while the hand is hot.",surge:"The blind got more expensive; the same energy buys fewer plays.",influencer:"A free multiplier entered the scoring chain for one hand.",copied:"A rival copied the combo; your strongest card decays sharply.",ios:"The score display is obscured, but chips still enter the bank.",glut:"The shop flooded with cheap plays; reach costs less this turn."}},
  {id:"jrpg",name:"JRPG Raid Party",mark:"✦",audience:"Final Fantasy / JRPG players",
   premise:"Command a raid party whose builds, resources, roles, and cooldowns must survive a volatile boss.",
   signature:"Top-of-funnel awareness ≈ Tank · Mid-funnel nurture ≈ Healer/support · Bottom-funnel conversion ≈ DPS · Pixel ≈ combat log",
   metrics:flavorMetrics(["combat turn","deployment order","MP spent","loot earned","net loot / XP","XP efficiency","loot-per-MP multiplier","MP cost per thousand encounters","hit rate","loot-drop rate","MP per quest lead","MP per completed quest","quest lead","quest completion","boss cleared","party wipe","pending loot"]),
   terms:flavorTerms(["party leader","guild roster","battle plan","party formation","party member and build","battlefield","boss phase","MP pool","enemy formation","exhaustion","overfarmed zone","combat log","loot credit","recruit roll","swap party member","guild review","quest giver","quest-board target","aggro rule","status immunity","MP allocation","gear score"]),
   flow:"Impression → encounter · Click → landed hit · Lead or sale → loot drop · Profit → XP gained",
   events:{quiet:"The boss is in a neutral phase; rotations and resource discipline matter.",viral:"Limit Break: one party member found a huge damage window.",surge:"Enrage phase: every action costs more MP today.",influencer:"A guest ally applied a one-turn conversion buff.",copied:"The boss learned your best rotation; that party member jumps toward exhaustion.",ios:"The combat log is fogged, though loot still reaches inventory.",glut:"A low-cost encounter wave opened; MP buys more reach this turn."}},
  {id:"fighting",name:"Fighting-Game Neutral",mark:"VS",audience:"Street Fighter / Tekken players",
   premise:"Win neutral, spend meter deliberately, punish openings, and stop repeating a solved string.",
   signature:"Audience targeting ≈ spacing · Hook ≈ startup frames · Value proposition ≈ active frames · CTA ≈ hit-confirm into a finisher · Budget ≈ meter",
   metrics:flavorMetrics(["round","selected move","meter spent","damage dealt","life lead","meter efficiency","damage-per-meter multiplier","meter cost per thousand approaches","hit-confirm rate","combo-conversion rate","meter per opening","meter per round conversion","opening","combo finish","round won","KO loss","unconfirmed damage"]),
   terms:flavorTerms(["player","full match","round plan","move set","attack string","matchup","opponent system","meter","opponent spacing","stale move penalty","corner pressure","input display","hit credit","lab session","change move","tournament ruling","sponsor","move property","spacing rule","hard counter","meter spend","frame advantage"]),
   flow:"Impression → enter neutral · Click → hit confirm · Lead or sale → combo conversion · Profit → round won",
   events:{quiet:"Neutral is stable; spacing and clean confirms decide the round.",viral:"Counter-hit window: one move converts far above baseline.",surge:"The matchup tax rose; every approach costs more meter.",influencer:"An assist opened a one-round conversion window.",copied:"The opponent downloaded your best string; its stale-move penalty spikes.",ios:"The input display is unreliable, but the life bar still moves.",glut:"Neutral opened up; approaches are cheaper this round."}},
  {id:"agriculture",name:"Precision Agriculture",mark:"⌗",audience:"systems and farming-sim players",
   premise:"Run a sensor-mapped irrigation system: route scarce water to productive fields and adapt before soil or demand is exhausted.",
   signature:"Audience ≈ field · Creative ≈ crop treatment · Budget ≈ water reserve · Bid ≈ valve setting · Pixel ≈ sensor network · Fatigue ≈ one treatment losing response · Saturation ≈ field capacity",
   metrics:flavorMetrics(["growing day","planted plot","water spent","gross harvest","net yield","yield efficiency","harvest-per-water ratio","water cost per thousand seedings","sprout rate","harvest-conversion rate","water per viable crop","water per harvest","viable crop","harvest","target yield met","crop failure","crop awaiting harvest"]),
   terms:flavorTerms(["irrigation manager","irrigation control console","growing plan","irrigation zone","crop treatment","climate and market","weather model","water reserve","field","treatment-response decay","field capacity","sensor network","harvest traceability","trial plot","replant plot","agronomy review","farm owner","field prescription","irrigation rule","weed exclusion","valve setting","soil quality"]),
   flow:"Impression → seed exposure · Click → sprout · Lead or sale → harvest · Profit → net yield",
   events:{quiet:"Weather is normal; irrigation and field selection drive yield.",viral:"One plot hit perfect growing conditions for a short harvest window.",surge:"Water and land costs surged; the same reserve covers less ground.",influencer:"An organic demand bloom lifted harvest value today.",copied:"A neighboring farm planted the same crop; your best plot exhausts faster.",ios:"Field sensors are faulty, though produce still reaches the barn.",glut:"Extra acreage opened cheaply; water reaches more plots today."}},
  {id:"evolution",name:"Evolutionary Lab",mark:"DNA",audience:"biology and simulation players",
   premise:"Fund variation, select on business fitness, preserve diversity, and adapt as the environment moves.",
   signature:"Human-made creative variants ≈ mutations · Ad group ≈ population · Campaign ≈ selection program · Profit ≈ fitness · Platform change ≈ selection pressure",
   metrics:flavorMetrics(["generation","phenotype in market","energy spent","gross reproduction value","fitness gain","fitness efficiency","reproduction-per-energy ratio","energy per thousand exposures","survival-signal rate","reproduction rate","energy per viable specimen","energy per reproduction","viable specimen","successful reproduction","lineage survives","lineage dies out","pending descendants"]),
   terms:flavorTerms(["research lead","gene pool","selection program","population","phenotype","habitat","selection pressure","energy budget","ecological niche","fitness decay","carrying capacity","assay","lineage credit","mutation trial","replace phenotype","ethics review","funder","trait marker","trait-match breadth","remove maladaptation","resource allocation","fitness score"]),
   flow:"Impression → environmental exposure · Click → survival signal · Lead or sale → reproduction · Profit → fitness",
   events:{quiet:"Selection pressure is steady; true fitness separates from noise.",viral:"A rare phenotype found a high-fitness niche.",surge:"The environment became costlier; each exposure consumes more energy.",influencer:"An external symbiosis temporarily increased conversion fitness.",copied:"A competitor converged on your trait; its fitness decays faster.",ios:"The assay lost resolution, though real reproduction continues.",glut:"Habitat capacity expanded; exposure is cheaper this generation."}},
  {id:"kitchen",name:"Restaurant Line",mark:"86",audience:"Overcooked / restaurant-ops players",
   premise:"Run a service: choose the menu, pace tickets, prep new dishes, protect quality, and 86 weak items.",
   signature:"Campaign ≈ service plan and menu strategy · Creative ≈ dish/presentation · Spend ≈ ingredients · Conversion ≈ plate served · Pipeline ≈ prep queue",
   metrics:flavorMetrics(["service","menu item on sale","ingredient spend","gross checks","nightly take","margin efficiency","sales-per-food-dollar","cost per thousand menu views","order-start rate","plate-completion rate","food cost per interested guest","food cost per served guest","interested guest","plate served","successful service","failed service","open checks"]),
   terms:flavorTerms(["expediter","whole restaurant","service plan","station","menu item","dining room","ticket flow","food budget","guest segment","menu fatigue","station overload","order system","check attribution","test special","swap menu item","health check","restaurant owner","ingredient","order modifier","86 list","portion spend","dish quality"]),
   flow:"Impression → menu seen · Click → order started · Lead or sale → plate served · Profit → nightly take",
   events:{quiet:"Service is steady; prep and ticket discipline decide the shift.",viral:"One special caught fire and is flying out of the kitchen.",surge:"Ingredient prices jumped; every plate costs more tonight.",influencer:"A critic mention created a one-service demand rush.",copied:"The restaurant next door copied the special; diners tire of it faster.",ios:"The order screen is dropping item credit, though checks still close.",glut:"Extra table inventory opened; serving new guests costs less."}},
  {id:"f1",name:"Formula Race Engineering",mark:"F1",audience:"motorsport and racing-strategy players",
   premise:"Tune a car-and-driver package, manage tires and fuel, read telemetry, and adapt to track conditions.",
   signature:"Creative ≈ car/driver package · Budget ≈ fuel · Fatigue ≈ tire wear · Rotation ≈ pit stop · Rapid scaling risk ≈ overdriving the car · Pixel ≈ telemetry",
   metrics:flavorMetrics(["race stint","car entry","fuel spent","gross points value","net championship points","points efficiency","points-per-fuel multiplier","fuel cost per thousand lap starts","sector-win rate","finish-conversion rate","fuel per opportunity","fuel per points finish","passing opportunity","points-scoring finish","podium / target cleared","DNF","laps awaiting classification"]),
   terms:flavorTerms(["race engineer","race operation","race strategy","car setup","car-and-driver package","circuit","track conditions","fuel allocation","fan/customer segment","tire wear","market-reach ceiling","telemetry sensor","lap attribution","test stint","driver or setup swap","scrutineering","team principal","setup parameter","tire compound rule","avoidance map","fuel flow","aero efficiency"]),
   flow:"Impression → lap started · Click → sector won · Lead or sale → lap completed · Profit → championship points",
   events:{quiet:"Track conditions are stable; setup and tire management decide pace.",viral:"A perfect tire window unlocked exceptional pace for one car.",surge:"Traffic and track costs rose; each lap burns more fuel.",influencer:"A safety-car-style opening created a one-lap conversion advantage.",copied:"A rival copied your setup; your best package wears faster.",ios:"Telemetry is partial, though the timing line still records real laps.",glut:"Clean track space opened; fuel buys more laps today."}},
  {id:"fishing",name:"Deep-Sea Fishing",mark:"⚓",audience:"resource and survival-game players",
   premise:"Choose grounds, deploy boats and lures, read sonar, protect the fishery, and move before a patch is depleted.",
   signature:"Broad targeting ≈ trawl net · Retargeting ≈ a tagged returning school / known hot spot · Creative ≈ lure · Budget ≈ fuel · Lead or sale ≈ landed catch",
   metrics:flavorMetrics(["fishing day","deployed rig","fuel spent","gross catch value","voyage margin","catch efficiency","catch-value-per-fuel multiplier","fuel cost per thousand casts","bite rate","landing rate","fuel per promising bite","fuel per landed catch","promising bite","landed catch","quota / target landed","empty net","catch awaiting market"]),
   terms:flavorTerms(["fleet captain","whole fleet","voyage plan","fishing ground","lure and boat","ocean market","currents and weather","fuel reserve","fishery","lure wear","depleted grounds","sonar","catch attribution","test cast","change lure","harbor inspection","fleet owner","bait signal","net width","bycatch exclusion","fuel commitment","catch quality"]),
   flow:"Impression → cast · Click → bite · Lead or sale → landed catch · Profit → voyage margin",
   events:{quiet:"Seas are normal; grounds, lure, and fuel discipline drive the catch.",viral:"One lure found a dense school for a short window.",surge:"Fuel costs and auction competition rose; each cast costs more.",influencer:"An outside signal pushed a school toward your boats today.",copied:"A rival fleet copied the lure; the school learns and lure wear spikes.",ios:"Sonar attribution is fogged, though fish still land on deck.",glut:"Open water inventory expanded; each cast reaches more fish."}},
  {id:"mixing",name:"Audio Mixing Console",mark:"dB",audience:"music-production and rhythm players",
   premise:"Balance channels, preserve headroom, read meters, replace tired takes, and judge the whole mix—not one loud track.",
   signature:"Platforms ≈ channel faders · Audience tuning ≈ EQ · Exclusions ≈ frequency cuts · Creative ≈ track/take · Budget ≈ promotion resources · Available credit ≈ headroom · Pixel ≈ meter",
   metrics:flavorMetrics(["mix pass","channel on air","promotion spend","gross output value","clean-master margin","mix efficiency","output-per-promotion-dollar multiplier","promotion cost per thousand plays","attention-transient rate","listener-commit rate","promotion cost per interested listener","promotion cost per committed customer","interested listener","listener commitment","clean master","clipped mix","unresolved signal"]),
   terms:flavorTerms(["mix engineer","full mix","session plan","channel bus","track or take","playback system","room response","promotion budget","listener segment","ear fatigue","listener-pool ceiling","meter","mix credit","A/B take","swap take","quality control","artist or label","frequency","routing rule","noise gate","gain setting","signal quality"]),
   flow:"Impression → signal played · Click → transient lands · Lead → listener commits · Sale → fan/customer converts · Profit → master level",
   events:{quiet:"The room is neutral; balance and clean gain staging decide the mix.",viral:"One take hit a resonant frequency and cuts through brilliantly.",surge:"The noise floor rose; the same signal costs more headroom.",influencer:"A guest feature boosted the conversion channel for one pass.",copied:"A rival sampled your hook; listener fatigue spikes on that track.",ios:"A meter is under-reading, though the master output is still real.",glut:"The room opened up; the same promotion budget buys more plays."}},
  {id:"vc",name:"Venture Portfolio",mark:"↑",audience:"capital-allocation and strategy players",
   premise:"Allocate capital across bets, run diligence, fund breakout winners, preserve optionality, and mark returns honestly.",
   signature:"Account ≈ portfolio · Ad ≈ deployed distribution bet · Creative ≈ pitch/positioning package · Spend ≈ invested capital · CPL/ROAS ≈ unit economics/return · Fatigue ≈ growth decay",
   metrics:flavorMetrics(["investment period","deployed distribution bet","capital deployed","gross return","net fund return","capital efficiency","gross return multiple","capital per thousand market exposures","qualified-interest rate","realized-conversion rate","capital per qualified lead","capital per acquisition","qualified lead","realized customer","target return","write-off","unrealized return"]),
   terms:flavorTerms(["portfolio manager","fund portfolio","investment thesis","sector sleeve","pitch/positioning package","market","market regime","dry powder","customer market","growth decay","market capacity","reporting stack","return attribution","pilot investment","rotate positioning package","diligence gate","limited partner","deal signal","mandate","exclusion list","capital allocation","unit economics"]),
   flow:"Impression → market exposure · Click → qualified interest · Lead or sale → realized return · Profit → fund performance",
   events:{quiet:"The market regime is stable; underwriting and allocation drive returns.",viral:"One holding found breakout product-market fit.",surge:"Market pricing expanded; the same capital buys less exposure.",influencer:"A strategic endorsement opened a one-day demand window.",copied:"A rival entered your best thesis; growth decay accelerates.",ios:"Company-level reporting is incomplete, though cash still reaches the fund.",glut:"Cheap inventory expanded; dry powder buys more exposure."}},
  {id:"dnd",name:"D20 Adventure (D&D)",mark:"d20",audience:"D&D and tabletop RPG players",
   premise:"Act as the DM of an ad account: build the party, allocate gold, choose encounters, and survive the dice.",
   signature:"Evergreen image ≈ Fighter · Viral UGC ≈ Rogue · Founder video ≈ Wizard · Retargeting offer ≈ Cleric · Residual delivery uncertainty ≈ d20 modified by creative quality and targeting",
   metrics:flavorMetrics(["adventure day","deployment order","gold spent","gross loot","gold retained","gold efficiency","loot-per-gold multiplier","gold cost per thousand encounters","attack-hit rate","loot-conversion rate","gold per quest lead","gold per completed quest","quest lead","quest completion","encounter won","party wipe","loot awaiting identification"]),
   terms:flavorTerms(["Dungeon Master","guild charter and party roster","quest plan","encounter party","adventurer and build","d20 table","dice roll","gold pool","monster AC","exhaustion and spell slots","cleared dungeon","scrying rune","loot credit","recruit roll","swap party member","guild review","quest giver","quest-board target rune","encounter rule","warded term","gold wager","character modifier"]),
   flow:"Impression → encounter · Click → attack lands · Lead or sale → loot won · Profit → gold retained",
   events:{quiet:"The d20 is ordinary today; party composition and gold discipline decide the encounter.",viral:"Natural 20: one adventurer found a viral pocket.",surge:"Natural 1 on auction conditions: monster AC rose and each encounter costs more gold.",influencer:"Bardic Inspiration created a one-turn conversion buff.",copied:"The monsters learned your best tactic; that adventurer jumps toward exhaustion.",ios:"The scrying rune is broken, though loot still reaches the party treasury.",glut:"A room of low-AC encounters opened; gold buys more reach."}}
];
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
  vc:Object.freeze({why:"Both allocate scarce capital across uncertain bets, stage tests, double down on evidence, and manage concentration and liquidity risk.",boundary:"A creative is a positioning asset inside a media initiative—not a company—and modeled value is not a marked investment return."}),
  dnd:Object.freeze({why:"Both combine deliberate setup with uncertain rolls: the buyer chooses the party, encounter, and gold allocation while delivery variance determines the exact result.",boundary:"The platform is not a fair d20 and the buyer is not all-powerful; attribution, cash timing, and customer behavior remain real measurement constraints."})
});
/* Exact aliases keep neighboring media objects distinct. These are presentation-only;
   the canonical media-buying term is always rendered first by the glossary. */
const FLAVOR_CONTEXT_ALIASES=Object.freeze({
  deckbuilder:Object.freeze({advertiserWorkstream:"advertiser-specific scoring deck",placement:"board slot",vertical:"deck archetype",geo:"act-map region",demo:"enemy class",
    tracking:"score-tracking ledger",contamination:"cross-deck scoring bleed",cluster:"shared combat-log package",approval:"shop-cleared card",compliance:"table-legality rules",
    complianceHold:"card quarantined by table rules",accountHold:"entire deck suspended from the run",relevance:"card-to-blind fit",qualityScore:"card-synergy diagnostic",
    avgPosition:"draw-order position",creativeRarity:"card rarity tier",band:"expected score range"}),
  jrpg:Object.freeze({advertiserWorkstream:"one guild raid team",placement:"battlefield row",vertical:"quest category",geo:"world-map region",demo:"enemy class",
    tracking:"battle-telemetry ledger",contamination:"cross-party combat-log bleed",cluster:"shared combat-log crystal",approval:"guild-cleared party member",compliance:"guild legality rules",
    complianceHold:"party member benched by guild rules",accountHold:"entire raid roster locked by the guild",relevance:"skill-to-enemy affinity",qualityScore:"gear-score diagnostic",
    avgPosition:"turn-order position",creativeRarity:"party-member rarity",band:"expected damage range"}),
  fighting:Object.freeze({advertiserWorkstream:"one sponsored player run",placement:"stage position",vertical:"matchup class",geo:"tournament region",demo:"opponent archetype",
    tracking:"input-replay capture",contamination:"cross-controller input bleed",cluster:"shared input-display rig",approval:"tournament-legal move",compliance:"tournament ruleset",
    complianceHold:"move disabled by tournament ruling",accountHold:"player entry disqualified",relevance:"move-to-matchup fit",qualityScore:"frame-advantage diagnostic",
    avgPosition:"screen-position average",creativeRarity:"move-tier rarity",band:"expected damage range"}),
  agriculture:Object.freeze({advertiserWorkstream:"one crop program",placement:"plot location",vertical:"crop line",geo:"growing region",demo:"field cohort",
    tracking:"field-telemetry ledger",contamination:"cross-field sensor drift",cluster:"shared sensor array",approval:"agronomy-cleared treatment",compliance:"crop-treatment rules",
    complianceHold:"treatment quarantined by agronomy review",accountHold:"full farm delivery program paused",relevance:"seed-to-field fit",qualityScore:"soil-quality diagnostic",
    avgPosition:"canopy-position average",creativeRarity:"seed-grade rarity",band:"expected yield range"}),
  evolution:Object.freeze({advertiserWorkstream:"one funded lineage",placement:"habitat microzone",vertical:"species niche",geo:"habitat region",demo:"organism cohort",
    tracking:"lineage assay trail",contamination:"sample cross-contamination",cluster:"shared assay batch",approval:"ethics-cleared phenotype",compliance:"bioethics protocol",
    complianceHold:"phenotype quarantined by ethics review",accountHold:"selection program suspended",relevance:"phenotype-to-habitat fit",qualityScore:"fitness-score diagnostic",
    avgPosition:"competitive-rank average",creativeRarity:"mutation rarity",band:"expected fitness range"}),
  kitchen:Object.freeze({advertiserWorkstream:"one restaurant concept",placement:"menu or section position",vertical:"cuisine line",geo:"delivery zone",demo:"diner cohort",
    tracking:"ticket-level order trail",contamination:"cross-station ticket bleed",cluster:"shared order-system terminal group",approval:"chef-cleared menu item",compliance:"food-safety rules",
    complianceHold:"dish held at health check",accountHold:"whole restaurant service suspended",relevance:"dish-to-guest fit",qualityScore:"dish-quality diagnostic",
    avgPosition:"menu-position average",creativeRarity:"special rarity tier",band:"expected margin range"}),
  f1:Object.freeze({advertiserWorkstream:"one sponsor-backed car program",placement:"grid position",vertical:"racing class",geo:"circuit market",demo:"fan cohort",
    tracking:"lap-telemetry trail",contamination:"crossed telemetry channels",cluster:"shared telemetry bus",approval:"scrutineering-cleared package",compliance:"technical regulations",
    complianceHold:"car held in scrutineering",accountHold:"constructor entry barred from the race",relevance:"setup-to-circuit fit",qualityScore:"aero-efficiency diagnostic",
    avgPosition:"average grid position",creativeRarity:"component rarity",band:"expected lap-time range"}),
  fishing:Object.freeze({advertiserWorkstream:"one licensed vessel program",placement:"grounds waypoint",vertical:"catch category",geo:"fishing region",demo:"species cohort",
    tracking:"catch-and-sonar log",contamination:"sonar cross-talk",cluster:"shared sonar array",approval:"harbor-cleared rig",compliance:"fishery rules",
    complianceHold:"rig held at harbor inspection",accountHold:"fleet grounded",relevance:"lure-to-species fit",qualityScore:"catch-quality diagnostic",
    avgPosition:"average depth position",creativeRarity:"lure rarity",band:"expected catch range"}),
  mixing:Object.freeze({advertiserWorkstream:"one release-campaign session",placement:"channel or playlist slot",vertical:"genre",geo:"listener market",demo:"listener cohort",
    tracking:"metering path",contamination:"cross-channel signal bleed",cluster:"shared meter bus",approval:"quality-control-cleared take",compliance:"rights and quality-control rules",
    complianceHold:"take muted pending rights review",accountHold:"full session locked",relevance:"take-to-listener fit",qualityScore:"signal-quality diagnostic",
    avgPosition:"playlist-position average",creativeRarity:"take rarity",band:"acceptable meter range"}),
  vc:Object.freeze({advertiserWorkstream:"one portfolio-company growth program",placement:"distribution-channel slot",vertical:"investment sector",geo:"market region",demo:"customer segment",
    tracking:"portfolio reporting trail",contamination:"cross-company data leakage",cluster:"shared reporting-stack instance",approval:"diligence-cleared investment",compliance:"fund mandate",
    complianceHold:"deal held by mandate review",accountHold:"fund deployment frozen",relevance:"company-to-market fit",qualityScore:"unit-economics diagnostic",
    avgPosition:"deal-rank average",creativeRarity:"deal rarity",band:"underwriting range"}),
  dnd:Object.freeze({advertiserWorkstream:"one adventuring party",placement:"dungeon room or encounter square",vertical:"quest type",geo:"realm region",demo:"monster class",
    tracking:"scrying trail",contamination:"crossed scrying signals",cluster:"shared scrying-rune network",approval:"guild-cleared adventurer",compliance:"guild law and table rules",
    complianceHold:"adventurer held by guild ruling",accountHold:"whole campaign table suspended",relevance:"class-to-encounter fit",qualityScore:"character-modifier diagnostic",
    avgPosition:"initiative-order position",creativeRarity:"character rarity tier",band:"expected roll range"})
});
const CREATIVE_FORMAT_ALIAS_KEYS=Object.freeze(["static","rendered","motion","ugc","founder","native","utility","lifestyle","ctv","search"]);
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
  "static image":"static","rendered scene":"rendered","motion graphic":"motion","ugc video":"ugc","founder / explainer":"founder",
  "native display creative":"native","native display":"native","input / ui utility":"utility","lifestyle static":"lifestyle",
  "ctv spot":"ctv","search text / assets":"search"
});
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
const DEFAULT_FLAVOR="jrpg";
function savedFlavor(){
  try{const value=typeof localStorage!=="undefined"?localStorage.getItem(FLAVOR_KEY):null;
    return FLAVOR_BY_ID[value]?value:null;}catch(e){return null;}
}
function queryFlavor(){const value=new URLSearchParams(location.search).get("flavor");return FLAVOR_BY_ID[value]?value:null;}
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
  if(typeof ACTIVE_PROFILE!=="undefined"&&ACTIVE_PROFILE==="specialist"&&MODE>=1&&MODE<=3)
    return {channel:"Insurance lead-generation display / demand generation",platform:"Google Display / Demand Gen operating model, represented by a platform-abstracted trainer",
      team:"Guided in-house account operations",objective:"Profitable, accepted lead volume with traceable creative multiplication",
      hierarchy:"Business account → campaign intent → ad group → ad → creative asset; event source and downstream acceptance sit beside delivery and must be diagnosed separately"};
  if(MODE===5)return {channel:"Multi-client paid search, paid social, demand generation and programmatic / CTV",
    platform:"Google Ads — Search, Google Ads — Demand Gen, Microsoft Advertising — Search, Meta Ads, TikTok Ads, Snapchat Ads, LinkedIn Campaign Manager, and a platform-abstracted programmatic / CTV lane",
    team:"Synthetic in-house holding-company media desk / internal agency",objective:"Modeled portfolio contribution, liquidity, attribution integrity and traffic resilience",
    hierarchy:"Training HoldCo → operating company → advertiser workstream → platform-specific ad account → campaign → delivery group → ad → creative. Programmatic abstraction: advertiser → campaign/insertion order → line item → creative; exposure and view-through measurement sit beside that hierarchy"};
  if(MODE===4)return {channel:"Cross-platform paid social + Google display / Demand Gen",platform:"Google Display/Demand Gen, Snapchat, Meta and TikTok",
    team:"In-house, single-brand portfolio",objective:"Lead generation / performance",
    hierarchy:"Training surface: account → platform ad/creative slots.<br>Real hierarchies: Google Demand Gen and TikTok: campaign → ad group → ad · Meta: campaign → ad set → ad · Snapchat: campaign → ad squad → ad"};
  return {channel:"Platform-abstracted direct-response display/native lead generation",
    platform:"No single platform is simulated; the visual slot model borrows some Google Display/Demand Gen concepts but is not a literal Google Ads UI",
    team:"In-house-style, single brand",objective:"Lead generation / performance",
    hierarchy:"Training surface: account → bundled ad/creative slots. Real platforms also use campaign and ad-set/ad-group containers"};
}
function flavorCue(concept="day"){
  const f=currentFlavor(),t=f.terms;
  const cues={
    day:`${f.name}: one media-buying day is one ${f.metrics.day.toLowerCase()} inside the persistent ${t.campaign.toLowerCase()}.`,
    performance:`${f.name}: business outcome view is ${t.accountView.toLowerCase()}; platform-attributed reporting is ${t.attributedView.toLowerCase()}. Profit maps to ${f.metrics.profit.toLowerCase()}; ROI, ROAS and CPL remain distinct and must use explicit windows and cost bases.`,
    budget:`${f.name}: budget is the available ${t.budget.toLowerCase()}; spend is the ${f.metrics.spend.toLowerCase()} actually consumed.`,
    creative:`${f.name}: a live ad is ${f.metrics.ad.toLowerCase()} and its creative is ${t.creative.toLowerCase()}; testing creates an option, swapping puts it into delivery.`,
    measurement:`${f.name}: the pixel is ${t.pixel.toLowerCase()}; tracking is ${flavorAliasForTerm("tracking",f).toLowerCase()}; attribution is ${t.attribution.toLowerCase()}. These are related but not interchangeable.`,
    fatigue:`${f.name}: fatigue is ${t.fatigue.toLowerCase()}; saturation is ${t.saturation.toLowerCase()}. One wears out the ad, the other exhausts the audience.`,
    platform:`${f.name}: the platform is ${t.platform.toLowerCase()} and its delivery system is ${t.algorithm.toLowerCase()}; volatility is a rule, not intent.`,
    compliance:`${f.name}: creative approval is ${flavorAliasForTerm("approval",f).toLowerCase()}; a compliance hold is ${flavorAliasForTerm("compliance hold",f).toLowerCase()}; an account hold is ${flavorAliasForTerm("account hold",f).toLowerCase()}. Scope determines the remedy.`,
    client:`${f.name}: the client is ${t.client.toLowerCase()}; account performance and trust are separate scoreboards.`,
    search:`${f.name}: a keyword is ${t.keyword.toLowerCase()}, match type is ${t.match.toLowerCase()}, a negative is ${t.negative.toLowerCase()}, and Quality Score is ${flavorAliasForTerm("quality score",f).toLowerCase()}.`,
    liquidity:`${f.name}: cash ≈ ${t.cash.toLowerCase()}, credit ≈ ${t.credit.toLowerCase()}, and receivables ≈ ${t.receivable.toLowerCase()}. Platform-attributed credit is a report, not spendable liquidity.`,
    portfolio:`${f.name}: holding company ≈ ${t.holding.toLowerCase()}; operating company ≈ ${t.operatingCompany.toLowerCase()}; advertiser workstream ≈ ${flavorAliasForTerm("advertiser workstream",f).toLowerCase()}; platform ad account ≈ ${flavorAliasForTerm("platform ad account",f).toLowerCase()}; platform initiative ≈ ${t.initiative.toLowerCase()}; event-source cluster ≈ ${flavorAliasForTerm("event-source cluster",f).toLowerCase()}.`,
    crisis:`${f.name}: a crisis ticket is scoped. Identify whether it hit the ${t.creative.toLowerCase()}, ${t.campaign.toLowerCase()}, ${flavorAliasForTerm("platform ad account",f).toLowerCase()}, ${t.pixel.toLowerCase()} or shared ${t.budget.toLowerCase()} before choosing a response.`,
    structure:`Common teaching hierarchy: Account → Campaign → Ad Set/Ad Group → Ad → Creative; platform and programmatic names vary. The real-world assignment identifies the hierarchy used in this mode. ${f.name}: account ≈ ${t.account.toLowerCase()}, campaign ≈ ${t.campaign.toLowerCase()}, ad ≈ ${f.metrics.ad.toLowerCase()}, creative ≈ ${t.creative.toLowerCase()}.`
  };
  return cues[concept]||cues.day;
}
function conceptForText(text){
  const s=text.toLowerCase();
  if(/receivable|liquidity|cash|credit line|credit cleared|payment threshold|billing/.test(s))return "liquidity";
  if(/holding company|portfolio|advertiser matrix|acquisition gate/.test(s))return "portfolio";
  if(/crisis|ticket|bid war|payout delay|conquest/.test(s))return "crisis";
  if(/pixel|attribut|tracking|reported|reconcile|settlement/.test(s))return "measurement";
  if(/creative|shipped|swap|recast|restate|multipl|asset|hook|ad rewritten|built|approved/.test(s))return "creative";
  if(/fatigue|burn|saturat|exhaust/.test(s))return "fatigue";
  if(/compliance|review|blocked|held|flag/.test(s))return "compliance";
  if(/client|trust|account manager|\bam\b|call/.test(s))return "client";
  if(/keyword|match|search term|negative|quality score|\bqs\b/.test(s))return "search";
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
function flavorMechanicExplanation(term,f=currentFlavor()){
  const s=String(term||"").toLowerCase(),reason=FLAVOR_REASONING[f.id]||FLAVOR_REASONING[DEFAULT_FLAVOR];
  let shared="The metaphor preserves the decision relationship, not just the vocabulary.";
  if(/modeled mer|blended mer/.test(s))shared=`It compares modeled ${f.metrics.revenue.toLowerCase()} with ${f.metrics.spend.toLowerCase()} actually used, so it is an efficiency multiple—not profit, cash, or platform-claimed credit.`;
  else if(/view-through/.test(s))shared=`It assigns ${f.terms.attribution.toLowerCase()} credit after a ${f.metrics.impression.toLowerCase()} without a measured ${f.metrics.click.toLowerCase()}; that can reveal reach effects, but overlapping exposure makes causal credit uncertain.`;
  else if(/claimed roas|platform claim|cross-account claim|attributed value|attributed report|attribution/.test(s))shared=`It is credit written into the ${f.terms.attribution.toLowerCase()} report; several reports may claim the same outcome, so the number is not additional ${f.terms.cash.toLowerCase()} or another customer result.`;
  else if(/modeled outcome|modeled value|revenue/.test(s))shared=`It estimates business value in the account-level ledger; it can continue while a platform report is incomplete and it becomes cash only through the simulation's settlement rules.`;
  else if(/profit|contribution|roi/.test(s))shared=`It is what remains after the named cost base; always check whether the view includes only media spend or also operations and billing adjustments.`;
  else if(/acquisition gate|gate streak/.test(s))shared=`This is a conjunctive checkpoint: performance, measurement, liquidity, diversification, and resilience must pass together. One failed condition resets the streak even when the other scores look strong.`;
  else if(/concentration/.test(s))shared=`This measures dependence on the largest ${f.terms.platform.toLowerCase()} or advertiser engine. Concentration can look efficient until one outage, restriction, or demand shock removes too much of the portfolio at once.`;
  else if(/liquidity|receivable|settlement|unsettled/.test(s))shared=`Timing controls survival: earned ${f.metrics.revenue.toLowerCase()} can sit as ${f.terms.receivable.toLowerCase()} while bills consume ${f.terms.cash.toLowerCase()} and ${f.terms.credit.toLowerCase()} first.`;
  else if(/budget|allocation|spend|cash|credit/.test(s))shared=`These are separate resource states: authorization sets the ceiling, allocation assigns it, spend consumes it, cash settles it, and credit only provides temporary buying capacity.`;
  else if(/event.source cluster/.test(s))shared=`Several initiatives can write to this shared ${f.terms.pixel.toLowerCase()} network; contamination changes optimization and claim routing without creating a second customer outcome.`;
  else if(/pixel|event source|tracking/.test(s))shared=`This records observed events for optimization and measurement; it does not decide which touchpoint caused the outcome.`;
  else if(/\bcpm\b/.test(s))shared=`CPM prices access: ${f.metrics.cpm.toLowerCase()} is ${f.metrics.spend.toLowerCase()} per thousand ${f.metrics.impression.toLowerCase()} units. A lower price creates more opportunities, but does not improve response or downstream value by itself.`;
  else if(/\bctr\b/.test(s))shared=`CTR is the share of ${f.metrics.impression.toLowerCase()} units that become a ${f.metrics.click.toLowerCase()}. It diagnoses attention and message fit, but a high rate can still produce weak leads or poor economics.`;
  else if(/\bcvr\b/.test(s))shared=`CVR measures progression from its stated eligible denominator into ${f.metrics.conversion.toLowerCase()} outcomes. The denominator must be named because platforms may use clicks, visits, sessions, or users.`;
  else if(/\bcpl\b|media cpl|\bcpa\b|\bepl\b/.test(s))shared=`Cost metrics divide the declared cost base by leads or acquisitions, while EPL divides earned value by leads. Read cost and value together, with the same cohort and window, before scaling.`;
  else if(/impression|\bclick\b|\blead\b|conversion/.test(s))shared=`The causal sequence is opportunity (${f.metrics.impression.toLowerCase()}) → response (${f.metrics.click.toLowerCase()}) → prospect (${f.metrics.lead.toLowerCase()}) → completed objective (${f.metrics.conversion.toLowerCase()}). Each transition answers a different diagnostic question.`;
  else if(/platform ad account|account|workstream|initiative|campaign|ad set|ad group/.test(s))shared=`The analogy preserves hierarchy: a workstream owns a business objective, an account is a platform container, and an initiative is one active buying lane inside that scope.`;
  else if(/platform|paid search|ppc|paid social|programmatic|\bctv\b|display|demand gen|buying lane|channel/.test(s))shared=`The lane determines how demand is found and what control matters: search captures expressed intent, social and display interrupt or stimulate demand, and reach media often relies more on exposure and view-through evidence.`;
  else if(/targeting|audience|\bdemo\b|\bbroad\b/.test(s))shared=`The audience is the eligible pool; targeting is the rule that selects within it. Narrowing can improve fit while reducing scale, and it cannot repair a weak creative or create demand that is not present.`;
  else if(/creative format|static image|rendered scene|motion graphic|ugc video|founder \/ explainer|native display creative|input \/ ui utility|lifestyle static|ctv spot|search text/.test(s))shared=`Format is how a concept is produced and delivered. It changes placement fit, attention, downstream trust, fatigue, and production cost, while the underlying concept and simulated rarity remain separate properties.`;
  else if(/learning|algorithm/.test(s))shared=`Repeated delivery updates the platform's estimate of who will respond; changing the account, signal source, or delivery object can disturb that accumulated evidence.`;
  else if(/fatigue|saturation/.test(s))shared=`Fatigue is declining response to one repeated creative; saturation is the reachable audience or demand ceiling. A new asset can help the first without enlarging the second.`;
  else if(/creative format|concept|rarity|creative|\bad\b/.test(s))shared=`The ad is the delivery object, the creative is the message it carries, the concept is the repeatable idea, the format is its execution, and rarity describes simulated upside—not guaranteed quality.`;
  else if(/keyword|match|negative|search term/.test(s))shared=`The keyword declares intended demand, match type controls query breadth, the search-terms report shows what actually matched, and negatives exclude unwanted demand.`;
  else if(/compliance|approval|review|hold/.test(s))shared=`This is a delivery gate with a named scope: inspect rights, claims, policy, and approval status before deciding whether to revise one asset or respond at the account level.`;
  else if(/search intent/.test(s))shared=`This is expressed demand rather than interrupted attention: the ${f.terms.keyword.toLowerCase()} enters only the searches whose underlying need and readiness fit the offer.`;
  else if(/operations cost|adjusted billed cost/.test(s))shared=`This consumes the business ledger outside the visible media delivery line. Separate ${f.metrics.spend.toLowerCase()} from production, repair, fees, and penalties before judging true ${f.metrics.profit.toLowerCase()}.`;
  else if(/settled value/.test(s))shared=`This is earned ${f.metrics.revenue.toLowerCase()} after its timing delay has cleared into the recognized ledger; earning time and settlement time are different turns in the analogy.`;
  else if(/acceptance criteria|downstream acceptance/.test(s))shared=`The front-end ${f.metrics.lead.toLowerCase()} must still pass a later quality gate. Strong response can coexist with weak accepted value when eligibility, geography, contactability, or buyer rules shift.`;
  else if(/\bcpc\b|max cpc/.test(s))shared=`This prices one ${f.metrics.click.toLowerCase()}: auction cost per click is shaped by competition, relevance, and response rate, while a maximum CPC is only the bid ceiling—not the final price or value.`;
  else if(/modeled leads|reported clicks/.test(s))shared=`The modeled count estimates the underlying business step; the reported count is what the measurement path observed. A gap can be tracking loss or attribution noise rather than a change in customer behavior.`;
  else if(/demand index|\breach\b/.test(s))shared=`This describes how much eligible opportunity exists before response quality is applied. More reachable ${f.terms.audience.toLowerCase()} creates chances, but cannot guarantee a ${f.metrics.click.toLowerCase()} or ${f.metrics.conversion.toLowerCase()}.`;
  else if(/\bscaling\b/.test(s))shared=`Scaling commits more ${f.terms.budget.toLowerCase()} only while marginal efficiency, available demand, fatigue, learning, and liquidity can support it; a larger allocation is not automatically a larger win.`;
  else if(/restate|recast|geo cut/.test(s))shared=`These change different creative variables: a restatement or geo cut changes relevance, while a recast changes presentation and refreshes attention. The right move depends on whether fit or fatigue is failing.`;
  else if(/\brelevance\b/.test(s))shared=`Relevance is alignment among demand, message, offer, and destination. It can improve response and conversion efficiency without increasing the size of the reachable pool.`;
  else if(/\bslot\b/.test(s))shared=`The slot is a trainer bundle for one active delivery object, its ${f.terms.creative.toLowerCase()}, and its allocation. It makes controls playable but is not a universal platform hierarchy level.`;
  else if(/offer timing/.test(s))shared=`The offer must arrive before attention is lost: moving it earlier can improve conversion without changing audience size, auction price, or the underlying concept.`;
  else if(/\bobjective\b|decision window/.test(s))shared=`The objective names the result being pursued, and the decision window names how much evidence is allowed before judgment. Performance is meaningful only against both.`;
  else if(/reporting key/.test(s))shared=`This is a routing label inside the ${f.terms.attribution.toLowerCase()} system. It can connect records, but it is not interchangeable with the advertiser, account, event source, or customer outcome.`;
  else if(/event[- ]source contamination|signal integrity/.test(s))shared=`Mixed observations weaken the ${f.terms.pixel.toLowerCase()} network: optimization learns from the wrong examples and reported credit can drift, even though no extra customer outcome was created.`;
  else if(/business container|delivery hierarchy|operating company/.test(s))shared=`This names ownership and nesting, not performance: the business contains platform accounts, which contain delivery objects, while the operating company remains the real advertiser behind those structures.`;
  else if(/resilience|contingency layer/.test(s))shared=`This is paid capacity held for bad turns—billing grace, cleaner measurement, or safer migration. It reduces failure impact but does not create free ${f.metrics.revenue.toLowerCase()} or erase concentration.`;
  else if(/ops action|\bcrisis\b/.test(s))shared=`This is a scarce intervention against a named operational scope. Diagnose whether the problem lives in creative, account, measurement, or finance before spending the action.`;
  else if(/\bcommon\b|\bepic\b|\blegendary\b/.test(s))shared=`Rarity summarizes the simulation's upside, scale room, and fatigue profile. It is a probability tier—not an industry taxonomy, production grade, or guaranteed winner.`;
  else if(/\bbid\b|quality score|avg position|\bsis\b|query ceiling|lost to rank|accelerated delivery|standard delivery/.test(s))shared=`These are paid-search auction controls and diagnostics: bids set aggressiveness, relevance affects eligibility and price, impression share diagnoses access, and finite query volume caps scale.`;
  else if(/^roas$/.test(s))shared=`ROAS divides the named revenue or attributed-value ledger by media spend. It is a return multiple before operating costs, so it cannot substitute for profit, ROI, or cash.`;
  else if(/\bintake\b|client trust/.test(s))shared=`This is the information-and-relationship layer: establish constraints, baselines, ownership, and evidence before changing the live ${f.terms.account.toLowerCase()}.`;
  else if(/\bbaseline\b|in-window|\bband\b/.test(s))shared=`This is a comparison boundary, not a universal truth. It defines the normal range, active evaluation window, or diagnostic zone against which a change becomes meaningful.`;
  else if(/^funnel$/.test(s))shared=`The funnel is the ordered handoff from ${f.metrics.impression.toLowerCase()} to ${f.metrics.click.toLowerCase()} to ${f.metrics.lead.toLowerCase()} to ${f.metrics.conversion.toLowerCase()}; each drop belongs to a different control layer.`;
  else if(/landing-page visit|front end|\blander\b|landing-page optimization/.test(s))shared=`This is the handoff after the ad earns attention. Improving the destination can raise progression without changing auction cost, audience selection, or creative fatigue.`;
  else if(/multiplication|\baxis\b|\baxes\b|\bmatrix\b|\bcut\b|\btail\b|\bdecay\b|\bmilking\b/.test(s))shared=`These describe systematic variation and lifecycle management: change one repeatable dimension, preserve the winning idea, measure the result, and retire it when marginal response decays.`;
  else if(/\btrap\b|brand play/.test(s))shared=`This is a deliberate strategic exception whose visible in-window score can mislead. Inspect its declared role and downstream effect before judging it by direct-response output alone.`;
  else if(/\bnoise\b|\bvariance\b|\bseed\b/.test(s))shared=`This separates chance from judgment: the seed fixes a comparable sequence, variance moves individual results around it, and repeated evidence reveals whether the decision survives noise.`;
  else if(/^native$|\bplacement\b/.test(s))shared=`This describes where or how the unit fits its surrounding inventory. Placement changes context and response opportunity; it does not by itself define the creative concept or buying objective.`;
  else if(/\bvertical\b/.test(s))shared=`The vertical is the advertiser's market and operating context. It changes demand, value, policy, and funnel physics without becoming a platform or creative format.`;
  else if(/\basset\b|\bhook\b|\bmechanic\b/.test(s))shared=`The asset is the produced file, the hook earns initial attention, and the mechanic is the repeatable persuasive device. They can be varied independently inside one broader concept.`;
  return `${shared} Boundary: ${reason.boundary}`;
}
function flavorRosettaMarkup(compact=false){
  const f=currentFlavor(),t=f.terms,scope=realWorldScope(),reason=FLAVOR_REASONING[f.id]||FLAVOR_REASONING[DEFAULT_FLAVOR];
  return `<div class="rosetta" id="overlayFlavorLens"><h3>${f.mark} ${f.name} lens</h3>
    <div class="flow"><b>Real work:</b> ${scope.channel} · ${scope.team}.<br>
    <b>Core analogy Rosetta:</b> Account ≈ ${t.account} · Campaign ≈ ${t.campaign} · Ad set/group ≈ ${t.group} · Ad ≈ ${f.metrics.ad} · Creative ≈ ${t.creative} · Budget ≈ ${t.budget}${compact?".":` · Audience ≈ ${t.audience} · Targeting ≈ ${t.targeting} · Pixel ≈ ${t.pixel} · Event-source cluster ≈ ${flavorAliasForTerm("event-source cluster",f)} · Attribution ≈ ${t.attribution}.<br><b>Signature mapping:</b> ${f.signature}.<br><b>Media funnel:</b> Impression → Click → Lead → Conversion → Revenue → Profit.<br><b>${f.name} path:</b> ${flavorAnalogyFlow(f)}.`}</div>
    <details class="analogy-bridge"><summary>Why this analogy works—and where it stops</summary><p><b>Shared logic:</b> ${reason.why}</p><p><b>Boundary:</b> ${reason.boundary}</p></details></div>`;
}
function flavorGridMarkup(){
  return `<div class="flavor-grid">${FLAVORS.map(f=>`<button class="flavor-card" id="flavorCard-${f.id}" type="button" data-flavor="${f.id}" aria-pressed="${f.id===ACTIVE_FLAVOR}">
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
  if(/training points|knowledge score/.test(s))return "presentation-only training progress";
  if(/day/.test(s))return m.day;
  return "no direct one-to-one analogue";
}
function flavorAliasForTerm(term,f=currentFlavor()){
  const s=String(term||"").toLowerCase(),t=f.terms,m=f.metrics,
    x=FLAVOR_CONTEXT_ALIASES[f.id]||FLAVOR_CONTEXT_ALIASES[DEFAULT_FLAVOR],formats=FLAVOR_CREATIVE_FORMAT_ALIASES[f.id]||FLAVOR_CREATIVE_FORMAT_ALIASES[DEFAULT_FLAVOR],
    guided=FLAVOR_GUIDED_ALIASES[f.id]||FLAVOR_GUIDED_ALIASES[DEFAULT_FLAVOR];
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
  map(["targeting"],t.targeting);map(["restate"],`${t.targeting} change while the face stays fixed`);map(["audience","broad","broad targeting"],t.audience);
  map(["placement"],x.placement);map(["vertical"],x.vertical);map(["geo cut","geo","geography"],x.geo);map(["demo","demographic"],x.demo);
  map(["objective","campaign intent"],`${t.campaign} purpose`);map(["decision window"],`${m.day} evidence window`);
  map(["relevance"],x.relevance);map(["quality score"],x.qualityScore);map(["avg position"],x.avgPosition);
  map(["creative rarity"],x.creativeRarity);map(["band"],x.band);
  map(["creative"],t.creative);map(["asset"],`${t.creative} deliverable`);map(["concept"],`${t.creative} family idea`);
  map(["creative format"],`${t.creative} build type`);
  for(const [label,id] of Object.entries(CREATIVE_FORMAT_TERM_TO_ID))map([label],formats[id]);
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
  map(["media spend"],m.spend);map(["operations cost"],`support cost paid from ${t.budget}`);
  map(["adjusted billed cost"],`${m.spend} plus settlement friction`);map(["lead"],m.lead);map(["reported lead"],`${m.lead} credited by a platform report`);map(["modeled lead","modeled leads"],`${m.lead} estimated in the business ledger`);map(["reported clicks"],`${m.click} visible in a platform report`);map(["conversion"],m.conversion);
  map(["click"],m.click);map(["impressions"],m.impression);map(["reach"],m.reach);map(["cpc"],m.cpc);
  map(["cpm"],m.cpm);map(["ctr"],m.ctr);map(["cvr"],m.cvr);map(["cpl","media cpl","reported media cpl"],m.cpl);
  map(["cpa"],m.cpa);map(["epl"],m.epl);map(["lp ctr","lander","landing-page optimization"],m.lpctr);map(["roi"],m.roi);map(["roas"],m.roas);
  map(["modeled mer"],`${m.mer} for one initiative`);map(["blended modeled mer","blended mer"],`${m.mer} across the whole portfolio`);
  map(["claimed roas"],`${m.roas} in a platform-credit report`);map(["projected contribution"],`${m.profit} after named media and operating costs`);
  map(["trap"],m.loss);map(["in-window"],`${m.day} range`);
  map(["front end"],`${m.cpm} + ${m.ctr} + ${m.cpc}`);map(["funnel"],flavorFlow(f));
  map(["intake","client trust","baseline"],t.client);map(["demand index"],t.demand);
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
  const lens=analogiesEnabled()?`<br><span class="lens">${f.mark} ${f.name} lens:</span> ${f.premise}`:"";
  const open=typeof densityLevel==="function"&&densityLevel()==="analyst"?" open":"";
  return `<details class="reality-details"${open}><summary><span class="reality-label">Real-world assignment</span>`+
    `<span class="reality-summary"><b>${s.channel}</b> · ${s.team}</span><span class="reality-more">Scope &amp; hierarchy</span></summary>`+
    `<div class="reality-copy"><b>Platforms:</b> ${s.platform}<br><b>Business lens:</b> ${s.objective}<br>${s.hierarchy}${lens}</div></details>`;
}
function updateFlavorChrome(){
  const f=currentFlavor(),select=document.getElementById("flavorSelect"),reality=document.getElementById("realityBar");
  if(select){
    if(!select.innerHTML)select.innerHTML=FLAVORS.map(x=>`<option value="${x.id}">${x.name}</option>`).join("");
    select.value=f.id;
  }
  if(reality){const next=realityMarkup();if(reality.innerHTML!==next)reality.innerHTML=next;}
  const suffix=value=>analogiesEnabled()?` · ${value}`:"";
  const runLens=document.getElementById("runLens");if(runLens)runLens.textContent=`Execute media buy${suffix(f.terms.turn)}`;
  const ops=document.getElementById("operationsSection");if(ops)ops.textContent=`Operations${suffix(f.terms.buyer)}`;
  const note=document.getElementById("operationsSectionNote");if(note)note.textContent=`execute, review and source${suffix(f.terms.test)}`;
  const log=document.getElementById("logSection");if(log)log.textContent=`Day log${suffix(f.terms.log)}`;
  const bench=document.getElementById("benchSection");if(bench)bench.textContent=`Bench${suffix(f.terms.bench)}`;
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
if(flavorSelect)flavorSelect.addEventListener("change",e=>setFlavor(e.target.value));
