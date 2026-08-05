# Media Buying Trainer

A turn-based strategy simulation for teaching paid-media fundamentals: funnel maths,
creative fatigue, audience saturation, attribution, platform volatility, and the
difference between an ad that engages and an account that earns.

The design rule is that the learning objective *is* the game mechanic — no quiz
questions between rounds. You cannot improve the result without understanding the funnel.

Static `index.html` plus a small local sound bundle. No build step or runtime dependencies;
the simulation remains usable if the optional web fonts do not load.

## Game systems

- Six modes, including the three-stage 2017 Classic search track and a separate
  Agency / Holding Co. Nightmare portfolio engine.
- Eleven persistent analogy flavors—Deckbuilder, JRPG Raid Party, Fighting-Game
  Neutral, Precision Agriculture, Evolutionary Lab, Restaurant Line, Formula Race
  Engineering, Deep-Sea Fishing, Audio Mixing, Venture Portfolio, and D20 Adventure
  (D&D).
  They translate every concept while keeping the real media-buying terminology and
  channel/platform/team context visible.
- Configurable run length and daily allocation cap for every mode. The existing
  per-mode settings remain the defaults until the player changes them.
- Deterministic but independent random streams for performance noise, daily algorithm
  moods/events, and Common/Epic/Legendary creative drops.
- Account-vs-ad reporting, pixel outages and repair, settlement lag, platform movement,
  compliance holds, rapid-scale review risk, and direct creative swaps.
- Mode 5 adds an entirely fictional holding-company portfolio with concurrent advertiser
  workstreams, independently selected platform initiatives, shared financial and
  measurement systems, operational crises, and acquisition gates.
- Retro financial-terminal visual system with opt-in SFX, score ticks, rarity reveals,
  high-ROAS rewards, short warning/glitch cues, and reduced-motion support.
- A collapsible Media Buyer Radio with five live Spotify editorial stations for
  Synthwave, Deep House, Trance, Drum & Bass, and Lofi. The selected station and
  panel state persist across mode changes; closing the panel removes the player and
  stops playback.
- Per-mode configuration and passphrase access persist while the browser tab remains open.

The radio uses Spotify's ordinary embedded player, so Account Sim never requests a
Spotify login, token, or account permission. Track/artist information and volume live in
Spotify's native player where exposed (otherwise use device volume); preview or full-playback availability
can vary by browser, region, and the listener's Spotify session. Radio choices are cosmetic
and never consume or alter the simulation's seeded random streams.

## Mode 5: fictional portfolio

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
problems, paid-search competition, attribution uncertainty, receivable delays, and
holding-company liquidity failures. An all-Google allocation is valid: concentration is a
strategy choice, not an automatic failure, when the player funds the required resilience
safeguards. Mandates are chosen in 30-day blocks and evaluated at immutable 30-day gates; the exit requires three
consecutive passes across performance, measurement, liquidity, concentration, and
resilience.

All eleven analogy flavors remain presentation-only in Mode 5. They annotate advertiser
workstreams, platform initiatives, creative and search operations, event sources, liquidity,
crises, metrics, and gate outcomes while canonical media-buying labels stay visible.

Modes 1–4 are calibrated so passive play fails the target and a basic refresh strategy
clears it. Across 100 seeds, passive median ROI is 26–28% in Modes 1–3 against a 40%
target and −23% in Mode 4 against a 25% target; the managed-strategy medians clear
every target. A trainer you can beat by ignoring the lessons teaches nothing.

Mode 5 is calibrated separately: passive play reaches a shared-credit collapse, while a
policy that audits attribution, builds resilience, resolves scoped crises, rotates fatigued
creative, works search terms, and reallocates marginal budget survives the mandate and
clears the exit.

Figures are rounded and rescaled for training. Passphrase-gated; ask whoever sent the link.

## Tests

Run `node tests/sim-smoke.mjs` to exercise every mode, all 11 flavor vocabularies,
mid-run flavor-switch RNG invariance, boundary periods and budgets, Mode 5 ledger
identities, crisis responses, cross-account event-source claims, finite search demand, and all-Google
resilience.
Add `--report` to print passive and managed-strategy calibration across 100 seeds.

## Assets

The seven local interface sounds are from Kenney's CC0 Interface Sounds pack. Display,
data, and body fonts are loaded from Google Fonts with system fallbacks. See
`ASSET_CREDITS.md` for sources and licenses. Radio playlists are loaded from Spotify's
public embed service and are not bundled with or redistributed by this repository.
