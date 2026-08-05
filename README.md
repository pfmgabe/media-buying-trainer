# To The Moon — the PFM Media Buying Trainer

A turn-based strategy simulation for teaching paid-media fundamentals: funnel maths,
creative fatigue, audience saturation, attribution, platform volatility, and the
difference between an ad that engages and an account that earns.

The design rule is that the learning objective *is* the game mechanic. Short recall and
bonus prompts reinforce decisions during play; their answers, explanations, and analogy
connections remain hidden until the player responds. Improving the result still requires
understanding the funnel.

Static GitHub Pages app with a small local sound bundle and no build step or runtime
dependencies. The thin `index.html` shell loads separate content, access, feedback,
learning, session, and simulation-engine files, so lessons and event decks can change
without rebuilding the entire game.

## Game systems

- Six modes, including the three-stage 2017 Classic search track and a separate
  Agency / Holding Co. Nightmare portfolio engine.
- The Classic search workshop separates campaign, ad group, keyword, bid, landing page,
  and ad-copy controls. It renders every authored headline and description, distinguishes a
  full rewrite from a current-control A/B permutation, lets players pause or retire sibling
  ads, supports historical 2017 Expanded Text Ads, and breaks Quality Score into expected
  CTR, ad relevance, and landing-page experience. Its expanded deck contains at least eight
  lead rewrites, five one-axis permutations, and two Expanded Text Ads for each intent group—
  more than 200 authored control/test pairings before delivery variation is applied.
- Classic client management is a second strategy loop. A business type supplies a fallible
  prior, while a separately seeded communication profile changes how evidence-based responses
  land. Tense account events expose observable cues; completed conversations build a progressive
  Client Read. Weighted trust tracks confidence in results and judgment, transparency,
  responsiveness, and alignment; conversation tension and later-checked commitments remain
  separate. Unsupported claims stay harmful regardless of personality fit.
- Eleven persistent analogy flavors—Deckbuilder, JRPG Raid Party, Fighting-Game
  Neutral, Precision Agriculture, Evolutionary Lab, Restaurant Line, Formula Race
  Engineering, Deep-Sea Fishing, Audio Mixing, Venture Portfolio, and D20 Adventure
  (D&D).
  They translate every concept while keeping the real media-buying terminology and
  channel/platform/team context visible.
- Configurable run length and daily allocation cap for every mode. The existing
  per-mode settings remain the defaults until the player changes them.
- Deterministic, keyed performance noise plus saved daily-event and creative-drop cursors,
  so a seed keeps day/slot/metric conditions stable across strategy comparisons and resumes.
- Modeled-outcome versus platform-attributed reporting, pixel outages and future-only
  repair, honest unsettled receivables at period close, landing-step optimization, platform
  movement, compliance holds, rapid-scale review risk, and explicit creative-to-slot swaps.
- Mode 5 adds an entirely synthetic holding-company portfolio with concurrent advertiser
  workstreams, independently selected platform initiatives, shared financial and
  measurement systems, operational crises, and acquisition gates.
- A real creative taxonomy: format, concept, variation axes, delivery role, and rarity are
  independent. Static, rendered, motion, UGC, explainer, native, utility, lifestyle, CTV,
  and search assets have distinct lane fit, response, downstream-quality, and fatigue physics.
- Retro financial-terminal visual system with eight internal semantic feedback cues,
  a simple SFX toggle and volume control, score ticks, rarity reveals, high-ROAS rewards,
  warning/failure cues, an oversized green correct-answer celebration, and reduced-motion
  support. The cue library is not exposed as UI.
- Compact Media Buyer Radio controls backed by one 11-station audio matrix: Synthwave,
  Melodic/Deep House, Trance, Drum & Bass, Tech House, Metalcore, Lofi, Hip-Hop,
  Heartland Country, Outlaw Country, and Atomic Jazz. Each station explains its workflow
  state, best media-buying use, sound orbit, color identity, and direct Spotify search code.
  Playback opens in an independent named window so it can continue after the game tab closes
  when browser background rules permit; station choice synchronizes between game and player.
- Two passphrase-selected tracks: a broad General Portfolio Lab and a sanitized Specialist
  Account Track. The specialist curriculum reflects an insurance lead-generation operating
  model without shipping names, private links, account identifiers, live figures, or source
  workbook data. GitHub Pages is static, so the selector is routing—not confidential-content security.
- Per-mode configuration and passphrase access persist while the browser tab remains open.
- Profile-isolated browser checkpoints, resume-from-menu, automatic day checkpoints, and
  a first-time Mode 1 tutorial with staged UI reveals and six guided days.
- Guided links every recognized real media-buying term across HUDs, cards, dialogs, tutorials,
  and recent logs. Compact and Analyst retain the important labels while deduplicating repeated
  links; every mode also includes a contextual card-anatomy guide.
- Independent tooltip and analogy toggles allow canonical-only game text, definitions without
  metaphors, or the full composite learning layer.
- An internal Field Guide replaces orphaned numbered references with 11 linked lessons,
  beginner/working/expert depth, explicit scope notes, a 237-term neutral glossary, plural-term
  matching, and all 11 analogy lenses. Media-buying terms remain authoritative; metaphor
  labels are presented as approximations rather than identities.

The independent radio window uses Spotify's ordinary embedded player, so To The Moon never
requests a Spotify login, token, or account permission. Track/artist information and music
volume remain in Spotify's native player where exposed (otherwise use device volume); preview
or full-playback availability can vary by browser, region, and the listener's Spotify session.
Radio choices are cosmetic and never consume or alter the simulation's seeded random streams.

## Mode 5: synthetic portfolio

Mode 5 is a synthetic in-house holding-company scenario, presented with some internal-agency
pressure. Every holding company, operating company, advertiser, product, contract, value,
cash flow, and outcome is invented. Real platform names identify buying disciplines only;
they do not imply affiliation, endorsement, live data, or a real advertiser relationship.

Six advertiser workstreams operate concurrently. Each begins with one platform-specific
initiative, and the player can open additional simultaneous initiatives under that same
advertiser. Every initiative has its own allocation, learning state, creative or search
controls, and platform-reported claims; advertiser-level concentration and measurement still
aggregate the siblings so parallel lanes cannot game the exit gates. Players can replace an
initiative's lane or build a parallel initiative across eight choices:

- paid search/PPC, where bids, Quality Score, search terms, negatives, impression share,
  and finite query demand control delivery;
- paid social and visual demand generation, where the offer, creative, fatigue, audience
  saturation, and learning control scale; and
- a clearly labeled, platform-abstracted programmatic/CTV lane, where reach and
  view-through uncertainty matter more than clicks.

The portfolio shares cash, a credit facility, delayed intercompany receivables, and
first-party event-source clusters. Those clusters are deliberately capable of bad event
mapping, duplicated claims, and cross-account contamination so the player must diagnose
measurement scope. **Modeled validated-outcome value** is the simulation's synthetic
business-value ledger; **platform claims** are overlapping attribution reports and cannot
create additional outcomes or cash by themselves.

The crisis queue separates creative/ad issues, platform ad-account holds, event-source
problems, paid-search competition, attribution uncertainty, receivable delays, lead-quality
escalations, and holding-company liquidity failures. Lead-quality tickets use deterministic
hidden causes and controlled account-only, event-source-only, creative-only, geography,
cohort, or clean-stack responses. An all-Google allocation is valid: concentration is a
strategy choice, not an automatic failure, when the player funds the required resilience
safeguards. Mandates are chosen in 30-day blocks and evaluated at immutable 30-day gates; the exit requires three
consecutive passes across performance, measurement, liquidity, concentration, and
resilience.

All eleven analogy flavors remain presentation-only in Mode 5. They annotate advertiser
workstreams, platform initiatives, creative and search operations, event sources, liquidity,
crises, metrics, and gate outcomes while canonical media-buying labels stay visible.

Modes 1–4 are calibrated so each mode's passive median remains below target, although a
favorable passive seed can sometimes clear. Across 100 seeds, passive median ROI is 32.9%,
30.1%, 30.1%, and −27.4% in Modes 1–4; managed-strategy median ROI is 131.8%, 130.1%,
86.6%, and 58.2%, respectively. Modes 1–3 target 40% and Mode 4 targets 25%, so every
managed median clears its target. A trainer you can beat reliably by ignoring the lessons
teaches nothing.

Mode 5 is calibrated separately: passive play reaches a shared-credit collapse, while a
policy that audits attribution, builds resilience, resolves scoped crises, rotates fatigued
creative, works search terms, and reallocates marginal budget survives the mandate and
clears the exit.

Figures are rounded and rescaled for training. Passphrase-gated; ask whoever sent the link.

## Tests

Run `node tests/sim-smoke.mjs` to exercise every mode, all 11 flavor vocabularies,
mid-run flavor-switch RNG invariance, boundary periods and budgets, Mode 5 ledger
identities, account-versus-attributed ledger separation, control no-ops, period-close
receivables, linked Field Guide behavior, authored search-ad rewrites and permutations,
Quality Score component scope, historical Expanded Text Ads, parallel landing diagnostics,
weekday/weekend inventory, platform-capacity pressure, crisis reconciliation and blocked
batch advancement, cross-account event-source claims, finite search demand, all-Google resilience,
seeded client diversity, hidden-preference leakage, interaction idempotency, progressive insight,
commitment settlement, and choice/feedback/terminal resume precedence.
Add `--report` to print passive and managed-strategy calibration across 100 seeds.

## Assets

The eight active local interface cues are from Kenney's CC0 Interface Sounds pack. Display,
data, and body fonts are loaded from Google Fonts with system fallbacks. See
`ASSET_CREDITS.md` for sources and licenses. Radio playlists are loaded from Spotify's
public embed service and are not bundled with or redistributed by this repository.
