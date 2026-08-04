# Media Buying Trainer

A turn-based strategy simulation for teaching paid-media fundamentals: funnel maths,
creative fatigue, audience saturation, attribution, platform volatility, and the
difference between an ad that engages and an account that earns.

The design rule is that the learning objective *is* the game mechanic — no quiz
questions between rounds. You cannot improve the result without understanding the funnel.

Static `index.html` plus a small local sound bundle. No build step or runtime dependencies;
the simulation remains usable if the optional web fonts do not load.

## Game systems

- Five modes, including the three-stage 2017 Classic search track.
- Configurable run length and daily account budget for every mode. Defaults remain
  30 days / $300 for Classic and 12 days / $20,000 for Modes 1–4.
- Deterministic but independent random streams for performance noise, daily algorithm
  moods/events, and Common/Epic/Legendary creative drops.
- Account-vs-ad reporting, pixel outages and repair, settlement lag, platform movement,
  compliance holds, rapid-scale review risk, and direct creative swaps.
- Retro financial-terminal visual system with opt-in SFX, score ticks, rarity reveals,
  high-ROAS rewards, short warning/glitch cues, and reduced-motion support.
- Per-mode configuration and passphrase access persist while the browser tab remains open.

Calibrated so passive play fails the target and a basic refresh strategy clears it. Across
100 seeds, passive median ROI is 26–28% in Modes 1–3 against a 40% target and −23% in
Mode 4 against a 25% target; the managed-strategy medians clear every target. A trainer
you can beat by ignoring the lessons teaches nothing.

Figures are rounded and rescaled for training. Passphrase-gated; ask whoever sent the link.

## Tests

Run `node tests/sim-smoke.mjs` to exercise every mode plus boundary periods and budgets.
Add `--report` to print passive and managed-strategy calibration across 100 seeds.

## Assets

The seven local interface sounds are from Kenney's CC0 Interface Sounds pack. Display,
data, and body fonts are loaded from Google Fonts with system fallbacks. See
`ASSET_CREDITS.md` for sources and licenses.
