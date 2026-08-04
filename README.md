# Media Buying Trainer

A turn-based strategy simulation for teaching paid-media fundamentals: funnel maths,
creative fatigue, audience saturation, attribution, platform volatility, and the
difference between an ad that engages and an account that earns.

The design rule is that the learning objective *is* the game mechanic — no quiz
questions between rounds. You cannot improve the result without understanding the funnel.

Single self-contained `index.html`. No build step, no runtime dependencies, works offline.

## Game systems

- Five modes, including the three-stage 2017 Classic search track.
- Configurable run length and daily account budget for every mode. Defaults remain
  30 days / $300 for Classic and 12 days / $20,000 for Modes 1–4.
- Deterministic but independent random streams for performance noise, daily algorithm
  moods/events, and Common/Epic/Legendary creative drops.
- Account-vs-ad reporting, pixel outages and repair, settlement lag, platform movement,
  compliance holds, rapid-scale review risk, and direct creative swaps.
- Per-mode configuration and passphrase access persist while the browser tab remains open.

Calibrated so passive play fails the target and managed play clears it: roughly 19% ROI
doing nothing, 4% chasing click-through, 69% managing it properly, against a 40% target.
A trainer you can beat by ignoring the lessons teaches nothing.

Figures are rounded and rescaled for training. Passphrase-gated; ask whoever sent the link.

## Tests

Run `node tests/sim-smoke.mjs` to exercise every mode plus boundary periods and budgets.
Add `--report` to print passive and managed-strategy calibration across 100 seeds.
