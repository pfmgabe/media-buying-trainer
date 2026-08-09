# To The Moon — development handoff for Claude

- **Handoff date:** Aug. 8, 2026
- **Repository:** `pfmgabe/media-buying-trainer`
- **Local path:** `/Users/gabrielmoss/Documents/Codex/2026-08-04/plea/media-buying-trainer`
- **Branch:** `main`
- **Shipped baseline:** `a773c3a` — `Build distinct agency career origins`
- **Public build:** `https://pfmgabe.github.io/media-buying-trainer/?release=a773c3a`
- **Browser asset version at handoff:** `v52`

This document is the product, technical and historical handoff for **To The Moon**, the PFM media-buying strategy game. It is written so a new Claude task can ingest one file, understand what exists, distinguish shipped mechanics from future direction and work without replaying the entire product conversation.

The executable source and tests remain authoritative. If this document, `README.md` and the source disagree, inspect the current source and tests before changing anything.

## Status vocabulary

- **SHIPPED:** Present in the current public GitHub Pages build.
- **REQUIRED DIRECTION:** A product rule that future work must preserve or move toward.
- **ROADMAP:** Deliberately not implemented yet.
- **DO NOT REGRESS:** A failure that occurred during development and now has a behavioral or test contract.
- **RESEARCH INPUT:** Material supplied to inform synthetic mechanics. It is not automatically approved for public redistribution.

---

## 1. Read this first

Claude should begin every implementation task by doing the following:

1. Read this file completely.
2. Read `EDITORIAL_STYLE.md` and `INTERFACE_ARCHITECTURE.md` completely.
3. Inspect `git status` and preserve unrelated user changes.
4. Read the relevant engine, data and tests before proposing a rewrite.
5. Treat stable numeric mode IDs, save migrations, deterministic RNG and script order as compatibility contracts.
6. Make the smallest coherent change that fulfills the requested interaction, not merely the smallest text patch.
7. Run the relevant checks listed in Section 20.
8. If a served script or stylesheet changes, bump the shared cache version everywhere the tests require.

Do not put private PFM data, OAuth secrets, real advertiser identifiers or home-server credentials in this public repository.

---

## 2. Product identity and north star

The product is **To The Moon**. Use that name in player-facing copy. Reserve **the PFM Media Buying Trainer** for the formal subtitle and metadata. Do not repeatedly call it “the trainer.”

To The Moon is a turn-based media-buying strategy and training game for the PFM team. It teaches judgment through playable systems:

- Funnel and account math
- Search intent and query control
- Creative concepts, executions, production and fatigue
- Audience and inventory saturation
- Attribution and measurement failure
- Working capital, receivables and settlement timing
- Client trust and communication
- Platform volatility, policy and account health
- Portfolio concentration and shared systems
- Agency capacity, operating expenses and long-term strategy

The core product rule is:

> **The learning objective should be the game mechanic, not a wall of explanatory text beside the mechanic.**

The user wants distinct modes in the traditional video-game sense, closer to the way a Super Smash Bros. game contains different experiences. Each mode should have a clear scope, teach a different lesson and produce a materially different interaction cycle. Noncareer modes are slices of the wider job, centered on work Trend/PFM does today. Agency Career is the RPG-scale version: more probability, exploration, progression, identity, opportunity cost and irreversible strategy across a decade.

This is a dense game. Density must be structured into **sequence, hierarchy and interaction**, not unloaded onto the first screen.

---

## 3. Current release in one page

### SHIPPED

- Seven stable game modes, each with its own scope and objective.
- A staged title and onboarding flow with Tutorial On/Off.
- Selection first, then an explicit **Continue** action in setup menus.
- RNG-matched opening briefings before every fresh run.
- Deterministic simulation seeds and profile-isolated browser saves.
- A modular cockpit with persistent destinations, independent panes, nested evidence and entity inspection.
- A deterministic nine-step Fundamentals walkthrough in Mode 1.
- Model-specific guided openings and a dismissible walkthrough in Agency Career.
- Verified action scripts (the Mode 1 Fundamentals template) for Modes 2, 3 and 4: per-mode fixed teaching seeds (`TUTORIAL_SEEDS` = 2601–2604), per-mode action tables in `TUTORIAL_DB.modes`, mode-scoped progress keys, click gating, and target resolvers (`best`, `worst`, `tired`). Guided runs are deterministic ONLY for the scripted window: a per-run `liveSeed` (drawn at setup, stored in the save) takes over all delivery noise and event/creative streams once `S.day` passes `S.tutorialWindowDays`, so replaying a guided route repeats the teaching window exactly while later days vary run to run. Saves restore both phases identically (2026-08-08).
- First-time staged guided openings for Modes 0 and 5 (the modes without action scripts yet): steps that highlight and center one real control at a time, auto-advance on the first day run, never lock clicks and complete per profile (2026-08-08).
- Definition popovers add a "What it means in this case" block that pulls the live number for the metric being defined (Agency Career; card-scoped where opened inside a client or funnel card).
- Agency Career model v5: per-client campaign plans (platform, pacing, chosen creative direction), differentiated buying platforms (Google / Microsoft / LinkedIn / broad social / 2026+ assistant placements), channel tradeoff profiles, origin-unique organic service lines (SEO / web development / AIEO-GEO; PR and launch communications; software development / financial services), business development and prospect intake interviews (2026-08-08).
- A staged Field Guide, a searchable 303-term glossary and persistent Training XP.
- Eleven optional analogy lenses that do not change mechanics.
- A faceted creative-planning model rather than one vague “format” field.
- Agency Career origins, products, customers, locations, target states, time-zone effects, monthly operating costs and late-game capabilities.
- A semantic lunar sound suite with no universal button beep.
- A victory bloom containing an audible physical cash-register drawer, bell and coin tail.
- An audio-, event- and cursor-reactive WebGL background with accessibility fallbacks.
- A 12-station Spotify radio matrix led by Psych Pop.
- A static GitHub Pages deployment with no build step and no trusted backend.

### NOT SHIPPED

- Real user accounts, Google Workspace login or MFA.
- Server-authoritative saves, replays, rankings or asynchronous multiplayer.
- A home-server deployment.
- A pure simulation package shared by browser and server.
- Deep player-controlled geographic targeting at individual campaign level.
- Full traditional-media planning physics.
- A Mode 5-depth holding-company system inside Agency Career.

### Current access profiles

The static build has two internal profile IDs:

- `general` — broad portfolio/media-buying curriculum.
- `specialist` — sanitized insurance lead-generation curriculum.

`js/access.js` selects the profile from a client-side passphrase hash and keeps the selection in session storage. This is routing, not confidentiality. The Specialist content must never include real client names, private links, account identifiers, live figures or source-workbook rows.

Do not expose the internal ID as a player-facing “General Track” badge. That label was removed because it did not tell the player anything useful about the game they were playing.

---

## 4. Game-mode map

Mode IDs are permanent route and save identifiers. **Do not renumber them.**

| ID | Title | Run type | Engine | Primary lesson |
|---:|---|---|---|---|
| 0 | Search Desk — 2017 Client Account | Challenge | Classic | Paid search diagnosis plus client trust |
| 1 | Closed-Loop Account — One Client, One Funnel | Challenge / Tutorial | Modern | Account and funnel fundamentals |
| 2 | Working Capital — The Settlement Lag | Challenge | Modern | Profit, attribution, receivables and cash timing |
| 3 | Creative Operations — The Pipeline | Challenge | Modern | Production lead time, approval, replacement and fatigue |
| 4 | Channel Command — Four-Platform Account | Challenge | Modern | Cross-platform allocation and account health |
| 5 | Portfolio Command — Holding Company Nightmare | Full run | Nightmare | Shared cash, measurement, concentration, crises and gates |
| 6 | Agency Career — The Decade: 2017–2027 | Career | Agency Career | Build and survive a company across a decade |

### Mode 0 — Search Desk

- Simplified 2017 paid-search rules.
- Campaign, ad group, keyword, query, match type, bid, landing page and ad-copy controls.
- Manual bidding, finite intent and separate lost-impression-share causes: rank versus budget.
- Quality Score is split into expected click-through rate, ad relevance and landing-page experience.
- Historical Expanded Text Ads.
- A client-management loop with fallible business priors, observable communication cues, trust dimensions, commitments and account-loss risk.
- Objective: meet the client’s lead goal and retain enough trust to keep the account.

### Mode 1 — Closed-Loop Account

- One account, one funnel and four delivery slots.
- Teaches the difference between an ad and its creative, allocation, funnel movement, fatigue, saturation, measurement and all-in economics.
- Optional guided tutorial uses fixed seed `2601` so each verified action has a reliable result.
- Objective: finish at 40% all-in ROI or better.

### Mode 2 — Working Capital

- Earned value, platform claims, receivables and settled cash run on different clocks.
- The player must avoid treating a delayed payment as failed performance or a platform claim as cash.
- Objective: finish at 40% all-in ROI or better while handling settlement lag honestly.

### Mode 3 — Creative Operations

- Builds take two to four days.
- Compliance can approve, request a revision or reject.
- A concept has a finite set of useful controlled variations.
- Empty delivery caused by missing approved replacements is an operations failure.
- Objective: finish at 40% all-in ROI or better while preserving a live creative pipeline.

### Mode 4 — Channel Command

- One account across four platform lanes.
- Lanes differ by demand source, auction, attention, capacity, settlement and attribution behavior.
- A local winning ad or platform can coexist with an unhealthy account.
- Objective: finish at 25% all-in ROI or better across the full account.

### Mode 5 — Portfolio Command

- Six invented advertiser workstreams.
- Each workstream can carry parallel platform initiatives.
- Shared cash, credit, receivables, event-source clusters and operating-company outcomes connect the portfolio.
- Platform claims can overlap and do not manufacture additional business outcomes.
- Crises have explicit scope: creative, account, event source, search demand, attribution, receivable, lead quality or liquidity.
- Mandates are selected in 30-day blocks and judged at immutable 30-day gates.
- Objective: pass three monthly reviews in a row and clear the portfolio profit target before cash and credit fail.

### Mode 6 — Agency Career

- Fixed 120-month career from 2017 through the projected 2027 season.
- The player names a company, selects a U.S. headquarters and chooses one of three business origins.
- Monthly operating statements, payroll and insolvency matter before the final target.
- The career includes company identity, products, customers, clients or owned offers, service areas, time zones, staff, capacity, capabilities and strategic transformation.
- Objective: pay every month’s bills and reach `$12,000,000` in cumulative agency operating profit by 2027.

---

## 5. Repository and runtime architecture

This is a static, framework-free global-script application.

- No package manager
- No bundler
- No framework
- No server runtime
- No compilation step
- No deployment workflow checked into `.github`
- GitHub Pages serves the repository root

`index.html` loads ordered global scripts. **Script order is an API contract.** The global simulation state is `S`.

### Simulation boundaries

1. `js/classic-engine.js` — Mode 0.
2. `js/modern-engine.js` — Modes 1–4.
3. `js/nightmare-engine.js` — Mode 5.
4. `js/agency-career-engine.js` — Mode 6.

`fresh()`, `runDay()` and `render()` dispatch through those engines. `js/runtime.js` is the source of truth for stable mode IDs, route keys, run types, objectives, capability flags and configuration limits.

### File map

| File | Responsibility |
|---|---|
| `index.html` | Access gate, global shell, context bar, navigation, workspaces, command rail and overlay layers |
| `assets/styles/trainer.css` | Main responsive visual system, mode layouts, onboarding, cockpit and accessibility states |
| `js/access.js` | SHA-256 passphrase-to-profile routing; session-only selection; not security |
| `js/content-db.js` | Sanitized profile content, creative taxonomy and semantic SFX manifest |
| `js/runtime.js` | Seed validation, deterministic RNG, mode registry and route configuration |
| `js/session.js` | Saves, profile activation, UI preferences, restore behavior, menus and shared context model |
| `js/menu-flow.js` | Staged onboarding, select-then-Continue setup, Agency origin wizard and fresh-run briefings |
| `js/workspace.js` | Presentation-only navigation, selected entities, breadcrumbs, disclosures and keyboard behavior |
| `js/classic-client-data.js` | Authored Classic client types, cues, encounters and responses |
| `js/classic-engine.js` | Historical search and client engine |
| `js/modern-content.js` | Modes 1–4 scenarios, slots, platforms, events, drops and recall content |
| `js/modern-engine.js` | Modes 1–4 simulation and rendering |
| `js/nightmare-engine.js` | Mode 5 portfolio simulation, crises, gates and validation |
| `js/agency-career-data.js` | Agency constants, origins, HQs, states, channels, verticals, offers, ads, tech, eras and incidents |
| `js/agency-career-engine.js` | Career simulation, company economics, clients, hiring, capabilities, transformation and migrations |
| `js/training-progress.js` | Persistent profile-isolated Training XP and learning evidence outside `S` |
| `js/knowledge-data.js` | Canonical glossary, aliases, guidance and reference content |
| `js/lesson-data.js` | Staged lesson modules |
| `js/field-guide.js` | Field Guide library, glossary search, inline terms and lesson state |
| `js/tutorial.js` | Deterministic Mode 1 action tutorial by run fingerprint |
| `js/flavors.js` | Eleven presentation-only analogy systems and boundaries |
| `js/feedback.js` | Semantic SFX playback, cooldowns, channels and priorities |
| `js/ambient-background.js` | Read-only reactive WebGL background and fallbacks |
| `js/radio-data.js` | Frozen 12-station audio matrix |
| `js/radio.js` | Main-window radio UI and synchronization |
| `radio.html`, `js/radio-popout.js` | Independent named radio window |
| `js/bootstrap.js` | Starts the correct route only after access/profile resolution |
| `scripts/generate_lunar_sfx.py` | Procedural generation and the victory-register composite |
| `tests/sim-smoke.mjs` | Sharded Node VM/fake-DOM integration, determinism and balance suite |
| `tests/workspace-stability.mjs` | MutationObserver/card-navigation stability regression suite |
| `EDITORIAL_STYLE.md` | Mandatory player-facing writing rules |
| `INTERFACE_ARCHITECTURE.md` | Mandatory cockpit and navigation contract |
| `ASSET_CREDITS.md` | Audio and font provenance |

### Important global-shell IDs

- `#strip` — a small selected set of primary status signals.
- `#slots` — operating entities.
- `#accountBox` — account, measurement, money or company systems.
- `#pipeBox` — production, search terms, capability or shared-system work.
- `#log` — outcomes, not instructions.
- `#runBtn` — the single action that commits choices and advances the simulation clock.

Do not silently change the meaning of these surfaces. A mode may change the labels and contents, but the player must retain orientation.

---

## 6. Determinism, RNG and state boundaries

### Simulation RNG

- Seeds are positive integers from `1` through `2,147,483,647`.
- `keyedRandom()` derives deterministic values from stable authored keys.
- A fresh random scenario seed is chosen during setup and then written into the route.
- The same seed, origin and decisions must replay identically.
- Creative and daily-event cursors are saved.

### Nonnegotiable isolation

The following must not draw simulation randomness, mutate `S`, advance time, change economics or enter the save payload:

- Menu browsing
- Mode, analogy or guidance selection before Continue
- Radio
- Sound playback and SFX variant rotation
- Background animation
- Definitions and Field Guide navigation
- Display density
- Workspace destination, focus and disclosure state
- Training Progress awards

The deterministic Fundamentals tutorial fixes the entire scenario to seed `2601`. Guided Agency Career does **not** reuse one fixed career; it uses a fresh seed while verifying model-specific early actions.

Randomness should create different situations, constraints, opportunities and consequences. It should not merely add invisible ±noise or new whimsical names.

---

## 7. Persistence and migration contracts

### Main save schema

`SAVE_SCHEMA = 3`

Canonical key:

```text
ttm.save.<profile>.mode-<mode>.v3
```

Compatibility mirror:

```text
ttm.save.<profile>.v3
```

Save record:

```js
{
  schema: 3,
  creativeTaxonomy: 2,
  profile,
  mode,
  stage,
  days,
  budget,
  seed,
  flavor,
  savedAt,
  source,
  dirty,
  state,
  trainingRun,
  tutorial
}
```

Rules:

- Saves are isolated by profile and mode.
- A present but invalid canonical save fails closed. Do not silently resurrect an older mirror.
- Restore canonicalizes the route to saved mode, seed and configuration.
- Agency identity is restored into `agencyName`, `hq` and `agencyType` query parameters.
- Presentation choices live outside `S`.

Agency Career still accepts a few legacy roster filter/page fields inside older state shapes. Do not use that as precedent for adding more UI state to the simulation. New destination, disclosure, selected-entity and paging behavior belongs in mode-scoped presentation storage; a future cleanup may migrate the remaining legacy fields without breaking old saves.

### Other persistence

- Training Progress: `ttm.training.<profile>.v1`.
- Training Progress schema: 1.
- Training audit-event cap: 240.
- Access profile: session storage only.
- Workspace and disclosure state: session storage, scoped by mode.
- UI density, definition and analogy preferences: local storage.
- Onboarding choices: local storage.
- Radio, SFX volume and ambient choice: local storage.
- Tutorial progress: profile plus run fingerprint.

### Agency Career migration

`AGENCY_MODEL_VERSION = 6`

- v1 → v2: monthly cost ledger, staff accrual and explicit insolvency fields.
- v2 → v3: agency identity, origin, tutorial setting, geography, product, customer and ad context.
- v3 → v4: coherent offer, concept, channel, format and copy repair.
- v4 → v5: campaign-plan fields (`platform`, `pacing`, `secondaryPlatformId`, `secondaryShare`) on every client/prospect/archive record, plus `services` (organic service lines) and `bizDevPoints` on the state. Older clients land on their channel's default platform at steady pacing with no split; no service line opens without the player's choice.
- v6 → v7: buying doctrines (`strategy` on every client record; `AGENCY_STRATEGIES`). Six doctrines — balanced, intent harvesting, creative testing engine, broad automation, manual precision, retargeting squeeze — with family/year/tech gates and era-aware economics (`strategyEconomics`): automation shines 2019+ but starves in signal-loss years without first-party data; manual hands dominate early and fade under automation pressure; retargeting is efficient but slashes the demand pool. Switching costs 1 focus plus a settling dip and stamps the results table.
- Analogy law (2026-08-09, user-locked): analogies are shaped to PLAYER PSYCHOLOGY, never to "this term kinda maps if you squint." Run endings use `FLAVOR_MOMENTS` (victory/defeat in each flavor's own emotional vocabulary — party wipe, DNF, busted run) via `flavorCue("victory"|"defeat")`, and terminal debriefs suppress the rosetta grid (`rosetta:false`). Never render a term-correspondence dump on a win/loss screen.
- Title screen (2026-08-09): the run/guide/settings options render as an always-visible panel on the right side at desktop widths (the `title-screen-drawer` details stays for narrow screens). Do not re-collapse them behind an unlabeled expander.
- v5 → v6: the campaign results loop — `campaignHistory` (a ≤10-row daily ring: day, spend, value, leads, index, platform mix, changed, incident) and `planChangedDay` on every client record. This is the playable core of agency media buying: `simulateClientDay` writes one readable row per workday, every plan action (platform move, split, pacing, creative choice, refresh) stamps `planChangedDay` so its day is marked in the table, and the client card renders the panel un-collapsed with a target cost per outcome derived from `customerValue / 1.24` (the CPL at baseline-100 delivery). Daily outcomes blend the smoothed score with today's index (60/40) so the table answers a decision the next workday. Client media stays ledger-only — the loop never touches agency revenue.

### Model-v5 invariants (2026-08-08)

- A client's `platform` must belong to its channel; channels without modeled platforms carry `null`.
- Platform **efficiency** feeds the outcome index and is budget-independent. The platform **capacity** penalty applies only to the client's own value ledger, so client media volume can never move agency revenue (a locked test invariant).
- LinkedIn-class platforms flip between a B2B bonus (`AGENCY_B2B_VERTICALS`) and a consumer penalty.
- Assistant-answer placements (`assistant_placements`) are tech- and year-gated (2026+); AIEO/GEO is a 2025+ organic service line requiring the SEO line.
- Every offer carries one authored ad concept plus three generated direction variants (customer story, price transparency, comparison), all offer-aligned, so "Choose creative direction" is always a real choice.
- Organic service lines bill at month close from momentum; momentum decays daily when unworked; upkeep enters `softwareSubscriptions`. Their revenue posts to `monthlyHistory[].organicRevenue`.
- Business development is capped at 6 points/month and only improves next month's prospect group; prospect interviews reveal personality pre-signing and cannot repeat.
- The allocation board (`adjustMediaSplit`) moves a client's monthly media in 10% steps between the primary platform and ONE secondary lane in the same channel, capped at a 50% secondary share. Efficiency blends by share; each lane's capacity absorbs only its own allocated share (still ledger-only, never agency revenue). Promoting the secondary to primary clears the split so `platform === secondaryPlatformId` can never persist.

`hydrate()` must validate the source version, migrate it, validate the current result and only then assign `S`.

Never add a strict current-only field without a migration path for v1–v3 saves.

---

## 8. Startup, tutorial and interaction design

### REQUIRED DIRECTION

The first several minutes follow this sequence:

1. Explain what To The Moon is.
2. Explain what the player can do.
3. Let the player turn tutorials on or off.
4. Ask one real question per setup screen.
5. Let a card click select a value.
6. Require **Continue** to commit and navigate.
7. Introduce the actual seeded circumstances.
8. Point to one visible action.
9. Reveal deeper systems when they become relevant.

A player who turns tutorials off should reach play quickly. A guided first run should hand-hold roughly the first 10 minutes without pretending the player already knows the hierarchy.

Every new challenge or career opening should answer:

- Who or what does the player control?
- What is already happening?
- What is on the board?
- What needs attention?
- What does success mean?
- What is the first action?

### Tutorial rhythm

Every tutorial or lesson follows:

1. **Orient** — say where the player is and the immediate goal.
2. **Act** — name one visible control and request one action.
3. **Observe** — identify what changed.
4. **Explain** — connect the result to the real media-buying concept.
5. **Continue** — give the next action or a troubleshooting route.

### DO NOT REGRESS

- Do not display all modes, all analogies, all rules and the whole glossary on the opening screen.
- Do not show a fake period choice for Agency Career; it is always 120 months.
- Do not navigate immediately when the player selects a setup card.
- Do not hide Menu, settings or the option to end a walkthrough during a tutorial.
- Do not tell the player to click a control that is not physically visible and locatable.
- Do not let an action coach disappear when navigation reveals its target.
- Do not let a tutorial lock unrelated menu/help controls.
- Do not use one fixed seed for every Agency Career.
- Do not allow a card to disappear between “perform the action” and “read what changed.”

---

## 9. Interface architecture

The interface is an adaptive app shell, not a long document.

### Persistent questions

The player must always be able to answer:

1. Is this a Tutorial, Challenge, Full run or Career?
2. Which mode is active?
3. Where am I in its clock?
4. What phase am I in?
5. What is the immediate objective?
6. What should I do next?
7. What wins or loses the run?

`playerContextModel()` is the read-only source for this orientation. It must not draw RNG or mutate `S`.

### Current destination model

- **Today** — bounded priority work and the clock-advancing action.
- **Board / Client work** — all operating entities and selected-entity inspection.
- **Account / Finance** — account-wide measurement or company money.
- **Team** — Agency Career staff and capacity.
- **Production / Capabilities** — creative operations or expansion.
- **History** — outcomes and ledger events.

The recommendation model may highlight a destination. It must not forcibly navigate or steal focus.

### Information layers

1. Persistent product identity, global controls and run orientation.
2. One current workspace destination.
3. One selected entity or bounded priority list.
4. Named disclosures for evidence, contracts, analogies and supporting metrics.
5. Deep overlays for setup, briefings, Field Guide, creative pickers, conversations, crises, lead desks and irreversible confirmations.

### Responsive behavior

- At desktop widths, including a short 1,024-by-540 CSS viewport and 2× Retina capture, the shell remains bounded to the viewport.
- The gameplay region appears in the first viewport.
- Active panes scroll independently.
- Height alone must not dismantle the desktop shell.
- Narrow screens return to readable document flow.
- Avoid horizontal body overflow.

### Modal contract

Every overlay must:

- Provide an obvious Back, Close, Return or Menu route.
- Close with Escape where appropriate.
- Treat nested overlays as a stack; Escape closes only the top layer.
- Trap or deliberately manage focus.
- Restore focus to the opener.
- Make the covered layer inert and `aria-hidden`.
- Block covered pointer, click, Enter, Space and focus events before global sound handlers.
- Never permit underlying actions or sound effects.

### DO NOT REGRESS

- The former Creative Lab allowed interaction and SFX behind the modal.
- A glossary popover once reopened itself immediately after Escape because restored focus and hover retriggered it.
- A nested Field Guide once failed because popover removal was reentrant.
- Term links once needed the containing card focused before the click worked.
- A short Retina viewport once put every status card above the actual game.
- A seven-card HUD once wrapped a single metric into a giant empty row.
- Analyst density once auto-opened every detail panel and destroyed nesting.
- Workspace view selection once collided with a `data-workspace-view` attribute on the cockpit ancestor.
- Today once inherited the full-roster filter/page and could show no work while due clients existed. Today must remain an independent, unfiltered priority slice.
- Route changes once revealed a new card scope without rerunning card discovery, leaving missing Inspect controls and stale entity navigation.
- Portfolio and account cards once visually overlapped after nested focus; hidden siblings must also be inert, and scoped panes must own their layout.
- A broad MutationObserver plus unconditional `textContent` writes once created an infinite microtask loop and froze the browser immediately after access.

`tests/workspace-stability.mjs` and the UI sections of `tests/sim-smoke.mjs` protect these failures.

---

## 10. Editorial style

`EDITORIAL_STYLE.md` is mandatory.

### Rules

- Use **To The Moon**, not “the trainer.”
- Use American English: **color**, not **colour**.
- Use AP-informed sentence case, punctuation and numerals.
- Write directly to **you**.
- Prefer active voice and concrete verbs.
- Define an unfamiliar abbreviation on first use.
- Label controls with verb, object and immediate consequence or cost.
- Use the actual actor and action.
- Lead with the goal, action or result.
- Keep essential consequences beside the control; the glossary is support, not a substitute.

Before a mechanic affects a decision, explain:

1. What is it?
2. Why does it matter now?
3. What changes it?
4. What can the player do?
5. Where will the result appear?

### Avoid

- Self-congratulatory AI prose.
- Vaguely snarky or “snippy copywriter” language.
- Dense strings of nouns.
- Shorthand whose subtext is legible only to another AI.
- Phrases such as “reaches your desk.”
- Internal jargon such as “evidence surface,” “operational state” or “deterministic action coach.”
- Vague verbs such as “execute” and “optimize” when a precise action exists.
- A large block of hyperlinks pretending to be a lesson.
- Unexplained platform names or taxonomies.
- A one-word orphan on the final line of a paragraph.
- Repeating the title multiple times on the title screen.
- Player-facing labels such as “General Track.” Internal profile IDs can remain internal.

The target is **exact, explanatory and simple at the same time**.

---

## 11. Field Guide, glossary and Training Progress

### SHIPPED Field Guide

- 303 canonical terms.
- Searchable and lazily rendered glossary.
- A lesson library instead of 11 equal-weight tabs and a full encyclopedia on every page.
- One visible lesson stage at a time.
- Commit-before-reveal knowledge checks.
- Worked examples, application and recap.
- General and specialist lesson paths.
- Contextual term routes and focus restoration.

A lesson should:

1. State one learner outcome.
2. Present a concrete situation.
3. Ask the player to predict or choose.
4. Hide the answer until commitment.
5. Explain why the answer fits.
6. Show a worked example.
7. Transfer the concept to a board action.
8. Recap and return to play.

Hyperlinks support a lesson. They are not the lesson.

### Training XP

Training Progress lives outside the simulation.

- Schema 1.
- Profile-isolated local persistence.
- Nine disciplines:
  - Account and funnel fundamentals
  - Paid search
  - Paid social
  - Creative operations
  - Measurement and attribution
  - Working capital
  - Client leadership
  - Cross-platform allocation
  - Portfolio and agency operations
- Levels and titles:
  1. New arrival — 0 XP
  2. Foundation builder — 1,000 XP
  3. Campaign operator — 2,500 XP
  4. Media buyer — 5,000 XP
  5. Senior buyer — 9,000 XP
  6. Portfolio strategist — 14,000 XP
  7. Moonshot director — 20,000 XP
- Stable question, run and scenario IDs prevent double credit.
- Events use a versioned shape suitable for future server replay, but are marked local/unverified now.

Training XP must never:

- Improve delivery.
- Change campaign economics.
- Consume simulation RNG.
- Change a challenge score.
- Affect a win condition.
- Create a permanent ranked advantage.

### Agency Capability Points

Agency Capability Points are a different currency:

- Run-local to one Agency Career save.
- Earned through peak-profit Agency levels.
- Spendable in the Agency capability tree.
- They change that company’s mechanics.

Never merge Training XP and Capability Points.

### Future multiplayer role for Training XP

- Verified competency profile.
- Coaching and skill-gap visibility.
- Practice recommendations.
- Cosmetic titles and badges.
- Optional cohort or experience filters.
- Eligibility for advanced practice content.

It should not become pay-to-win.

---

## 12. Analogy system

Analogies are optional teaching lenses. Canonical media-buying language remains primary.

### Display order

1. Venture Portfolio
2. Formula Race Engineering
3. Restaurant Line
4. Evolutionary Lab
5. Precision Agriculture
6. Audio Mixing
7. Deep-Sea Fishing
8. Deckbuilder
9. JRPG Raid Party
10. Fighting-Game Neutral
11. D20 Adventure (D&D)

Conventional professional analogies belong near the top; gaming analogies belong later.

### Mapping rules

- Explain the real system first.
- Then give the simplest useful correspondence.
- Put the analogy boundary in its own visual block.
- Declare mapping strength as strong, partial or none.
- It is acceptable to omit an analogy when no useful mapping exists.
- Do not invent jargon to force all 303 terms into every metaphor.
- Analogy selection never changes mechanics, saves or RNG.

### Corrected D&D model

- Buyer ≈ party leader or player.
- Platform ≈ the game world and its governing rules or campaign setting.
- Campaign ≈ a quest arc.
- Ad set/group or buying lane ≈ an encounter plan or party formation.
- Ad ≈ one deployed action or adventurer within that plan.
- Creative ≈ the equipped weapon, prepared spell or readied item. (Corrected 2026-08-08: an adventurer does not equip a "message" or "tactic." The source side of every analogy must stay true to its own domain; only the connection sentence may reference media buying.)
- Algorithm/auction ≈ encounter rules, modifiers, adjudication and dice.
- Audience ≈ the eligible encounter population.
- Targeting ≈ encounter or quest selection.
- Pixel/event source ≈ campaign or combat log.
- Attribution ≈ credit for experience or loot.
- Residual day-to-day variance may be compared with a die roll.

Never use:

- “Platform ≈ d20 table.”
- “Audience ≈ monster AC.”
- “Buyer ≈ DM.”

The real boundary should say that auctions, policy, demand, cash timing, attribution and customer behavior constrain media delivery. It is not a fair die, and the player is not all-powerful.

---

## 13. Creative taxonomy and mechanics

The original format list supplied by the user was:

- Story Ad (Stories)
- VSL
- Podcast
- Slideshow
- Veo / AI-generated video
- News Greenscreen
- Nat Geo Documentary
- Memes
- Voicemail
- Static
- Animation
- Branded
- Native Long-Copy
- Long-Copy to Video

The crucial correction is that those labels mix several different facets. Current To The Moon separates:

1. **Offer** — what the business sells.
2. **Customer** — who may buy it.
3. **Persuasion concept** — the argument or reason intended to motivate the customer.
4. **Execution type** — how the idea appears: format, style, structure or placement-ready asset.
5. **Production method** — how people, templates, motion or AI make the asset.
6. **Variation axis** — one declared element changed in a controlled test.
7. **Evidence scope** — what this exact combination has proved.
8. **Delivery role** — the part of the funnel/account it serves.
9. **Rarity** — a game upside roll after blueprint submission, not an intrinsic format quality.

### Current shared taxonomy

- Five loose workflow systems:
  - Conversational and Long-Form
  - Fast-Turn Hook Concepts
  - Structured Explanation and Proof
  - Modular Visual Production
  - Search Text Assets
- 12 persuasion concepts.
- Seven production methods.
- 17 selectable nonsearch executions, plus Search Text Assets and legacy-only Veo compatibility.
- Examples include Story Ads, VSLs, podcasts, slideshows, UGC interviews, QVC-style demonstrations, breaking-news treatments, News Greenscreen, documentary, CTV spots, memes, voicemail, static, animation, branded, native long-copy, long-copy-to-video and search assets.

Current concept vocabulary: bill/quote reveal, price transparency, life-event trigger, customer story, demonstration, news/current-event frame, action/disruption story, seasonal urgency, average-cost pitch, social proof, comparison and problem-to-solution.

Current production methods: user-shot/UGC, live action, studio/polished, modular template, motion design/animation, AI-assisted production and AI-generated scenes.

The Creative Lab explicitly says this is a **To The Moon planning catalog**, not a formal industry-standard taxonomy.

The five systems are organizational shortcuts based on broadly shared build/review characteristics. They are not formal industry taxonomies, and they do not imply that every execution in a family shares identical fatigue or performance.

### AI/Veo rule

AI generation is a production method, not a persuasion concept, complete format or automatic winner. It can change:

- Production time
- Cost
- Review burden
- Trust
- Variance
- Rights and compliance risk
- Ability to produce controlled variants

The user explicitly said Veo “isn’t that great.” Do not give AI production an automatic quality advantage. A legacy `veo` format exists only for old-save compatibility.

### Creative physics

Executions and methods can affect:

- Build/review time
- Platform and placement fit
- Front-end response
- Downstream quality
- Volatility
- Fatigue
- Saturation capacity
- Production and revision cost

A creative refresh should not be an invisible scalar forever. Agency Career now stores offer-aligned concepts, format, copy and creative version. Future creative-agency work should let the player explicitly choose concept → execution → method → placement → controlled revision.

### Realism constraint

A single buyer ordinarily does not run unlimited offers in unrelated verticals across every platform. New verticals, platforms and offers should consume operating bandwidth. Reusing a specialty should reuse playbooks. Late-game systems can reduce context-switching penalties, not erase them.

---

## 14. Platform and hierarchy language

Every platform or lane that appears in play needs a plain-language explanation of:

- What kind of demand it reaches.
- What the player controls.
- What the platform controls.
- How creative or query intent matters.
- What the platform report can and cannot prove.
- Which hierarchy level the player is viewing.

Do not assume the player already understands Meta, Snapchat, TikTok, Google Ads, LinkedIn, Demand Gen, CTV, radio, cable or outdoor.

Current authored definitions in `js/knowledge-data.js` cover Google Search, Google Demand Gen, Microsoft Search, Meta, TikTok, Snapchat, LinkedIn, programmatic/CTV and traditional media. Each explanation includes a simulation boundary. Expand this catalog when a new platform enters play rather than relying on its brand name to teach the mechanic.

Keep these concepts distinct:

- Business/advertiser
- Ad platform
- Ad account
- Campaign
- Ad set or ad group
- Ad
- Creative asset
- Audience or keyword target
- Event source/pixel
- Business outcome
- Platform-attributed claim

The canonical money/measurement sequence is:

```text
Authorized → Allocated → Spent → Billed → Earned → Claimed → Settled
```

Platform claims are attribution, not extra customers or cash.

---

## 15. Agency Career — complete current contract

### Core constants

- `AGENCY_MONTH_DAYS = 20`
- `AGENCY_TOTAL_MONTHS = 120`
- `AGENCY_MAX_CLIENTS = 75`
- `AGENCY_PROFIT_TARGET = 12_000_000`
- `AGENCY_MODEL_VERSION = 4`

The player controls one media buyer. Staff and systems are company-level abstractions that change capacity, cost and risk. The game should make company success feel consequential without becoming payroll-clerk micromanagement.

### Current interaction loop

Client-agency day:

1. Open **Today** to see the bounded priority queue.
2. Inspect the due client and read what it sells, whom it serves, the contract, current ad and relevant location/time-zone conditions.
3. Spend focus on an appropriate action: routine service, tracking audit, creative refresh or client update.
4. Optionally manage staff, cash, prospects or capabilities in their named destinations.
5. Choose **End workday** to commit the day.
6. Read what changed and repeat until the 20-workday month closes.

Month close invoices client fees, ages receivables, settles recurring company obligations, checks liquidity/insolvency, updates reputation and growth requirements, creates the next prospect set and advances the era when appropriate.

Holding-company day:

1. Inspect company-owned offers and their current evidence.
2. Allocate or change owned-media budgets without exhausting operating cash.
3. Read platform claims separately from validated value and payout timing.
4. Manage creative, concentration, compliance and infrastructure.
5. End the workday and wait for delayed payouts.

The persistent context bar and model-specific walkthrough must name the exact next visible action. A label such as “Show me the client” is acceptable only when that literal control is present, highlighted and reachable.

### Origin selection

The player:

1. Names the company, 2–48 visible characters after normalization.
2. Selects one of 20 U.S. headquarters.
3. Selects one of three Pokémon-starter-style business origins.
4. Chooses a starting reserve.
5. Reviews a model-specific mission.

Selection is inert until Continue.

### Performance holding company

- `agencyType: "holding_company"`
- Starts with `businessModel: "affiliate"`.
- No clients, prospects, retainers, trust or client-loss risk.
- Starts with three company-owned offers/funnels.
- The company funds all media.
- Revenue arrives after offer-specific payout timing.
- Risks include liquidity, clawback, claims, compliance, platform action and concentration.
- Digital channels can unlock.
- Traditional client media is unavailable.
- `targetSeats` must always remain `0`, including after month close and save/resume.

This is distinct from a client agency that later transforms into owned-funnel economics, even though both use the affiliate branch.

### Full-service creative agency

- `agencyType: "creative_agency"`
- Starts with a paid-social client.
- Starts with social, creative-studio and traditional-media capabilities.
- Paid search and Shopping are permanently forbidden.
- Search foundations, landing systems, commerce feeds and search bidding automation must never leak into this origin.
- Available directions include social, short form, programmatic/CTV, outdoor, terrestrial radio and local cable.
- The tutorial should teach the client’s actual offer and audience, then concept, execution, placement and revision as distinct ideas.

### Digital marketing agency

- `agencyType: "digital_agency"`
- Starts with a paid-search lead-generation client.
- Paid search is the first specialty.
- Search, landing pages, measurement and client communication define the opening.
- Other digital channels can unlock.
- A full creative department is later-game.
- Outdoor, radio and cable are outside the service agreement.

### Headquarters

Current selectable HQs:

- Portland, Oregon
- Seattle, Washington
- Anchorage, Alaska
- San Francisco, California
- Los Angeles, California
- Honolulu, Hawaii
- Phoenix, Arizona
- Denver, Colorado
- Austin, Texas
- Dallas, Texas
- Kansas City, Missouri
- Minneapolis, Minnesota
- Chicago, Illinois
- Nashville, Tennessee
- Atlanta, Georgia
- Miami, Florida
- Raleigh, North Carolina
- Philadelphia, Pennsylvania
- New York, New York
- Boston, Massachusetts

They span Pacific, Arizona, Mountain, Central, Eastern, Alaska and Hawaii IANA-zone behavior. Headquarters changes facilities/administration cost and handoff context. It does **not** apply a vague distance penalty to ROAS.

### Geography concepts

Keep these separate:

1. Agency headquarters
2. Client headquarters
3. Client service or licensed territory
4. Audience delivery locations
5. Media market
6. Ad-account time zone

Current generation supports all 50 states plus Washington, D.C., through regional pools. Client records carry office, market scope, target states and account timezone.

An Oregon agency with a New York client should not receive a flat performance penalty. The game can create:

- Earlier client contact windows
- Narrower synchronous overlap
- Handoff load
- Travel or coordination cost
- Late approval risk
- An overnight-turnaround advantage after distributed systems are built

### Client tiers and seat economics

Difficulty and fee ladder:

1. SMB lead generation — easiest, lowest fee ceiling.
2. SMB commerce — more creative, merchandising and seasonality work; higher fee.
3. Enterprise lead generation — more stakeholders, CRM, permissions, measurement and reporting; higher fee.
4. Enterprise commerce — highest creative, catalog, governance and incident burden; highest fee.

One client relationship consumes one of 75 seats even if it has multiple campaigns. Client media budget is not agency revenue and not agency operating cost.

### First-year targets

- Month 1 — retain the founding client.
- Month 2 — service two SMB lead-generation clients.
- Month 3 — five active clients.
- Month 6 — 15 active clients.
- Year 1 — 30 active clients.
- Later months — growth continues toward the 75-seat ceiling.
- Month 120 — 2027 cumulative-profit gate.

The player chooses which contracts deserve a seat. Familiar verticals and channels reuse playbooks. Too much breadth raises context switching and service load.

### Current authored variety

- 20 headquarters.
- 13 geographic pools.
- All 50 states plus Washington, D.C.
- 25 verticals.
- 75 concrete offers.
- 75 offer-specific ad concepts.
- Eight channels.
- Four client tiers.
- Multiple personalities, opening circumstances and generated contracts.
- Client offer, customer, stakes, customer value, office, service area, target states, timezone, current ad concept, format, copy and version.

Current channels:

- Search
- Paid social
- Shopping
- Short-form social
- Programmatic/CTV
- Outdoor
- Terrestrial radio
- Local cable

Model-v4 coherence rules:

- The offer belongs to the client’s vertical.
- The concept explicitly supports the offer.
- A nonsearch concept supports the selected channel.
- Format matches the channel.
- Search and Shopping use truthful channel-specific copy.
- Rewrite stays in the same offer/channel pool.
- v3 migration repairs mismatches without changing company cash or client trust.

Do not create variety by pairing an unrelated bookkeeping ad with an estate-planning offer.

### Operating costs

The monthly statement can include:

- Founder compensation
- Employee wages
- Payroll taxes and benefits
- Infrastructure and hosting
- Equipment reserve
- Software and subscriptions
- Insurance, compliance and professional services
- Facilities, administration and distributed operations
- Events, partnerships and agency marketing
- Client service and onboarding
- Hiring, severance and workstation setup
- Business-model transformation
- Compliance intervention
- Company-funded media
- Other system investments

Staff costs accrue by staff-days. A Day 20 firing cannot erase 19 days of payroll, and a Day 20 hire cannot incur a retroactive full month.

Month close uses operating cash first, then available credit. If cash plus unused credit cannot pay obligations, the company immediately ends in `operating-insolvency`. Positive modeled client value or open receivables do not keep an insolvent agency alive.

### Agency financial invariants

- Agency revenue comes from fees/retainers or owned-offer payouts.
- Client media spend remains on the client ledger.
- Agency profit equals agency revenue minus explicit agency costs.
- Every statement reconciles to itemized categories.
- Cash, profit, receivables and credit remain separate.
- The 2027 target uses cumulative agency operating profit.
- Supporting metrics do not create revenue.

### Capability tree and eras

Career-era arc:

- 2017 — Manual-search foundation
- 2018 — Social acquisition opens
- 2019 — Automation enters the auction
- 2020 — Remote-demand shock
- 2021 — Signal-loss era
- 2022 — Consolidated delivery and creative pressure
- 2023 — Modeled measurement
- 2024 — Creative-volume race
- 2025 — AI-assisted operations
- 2026 — Enforcement and resilience
- 2027 — Projected final season

Late-game capabilities currently include:

- Distributed operations and virtual-assistant network
- Distributed quality and access controls
- Follow-the-sun operations
- Agentic account workbench
- Guardrailed agentic operations
- Automated creative workbench
- Automated creative pipeline
- Creative workstation fleet
- Dual-provider network and power reserve
- Low-orbit satellite failover
- Local AI and render cluster
- Affiliate scaling engine

Every advanced capability requires some combination of year, Agency level, prerequisite, Capability Points, cash investment and recurring monthly cost. Tradeoffs include access risk, quality risk, supervision, documentation, power, cooling, maintenance, replacement, utilization and automation error.

Human approval remains required for consequential work. Agentic systems prepare or automate bounded routine work; they are not magic autopilot.

### Affiliate transformation

An agency can make a one-way start-of-month transformation into owned-funnel/affiliate economics.

Preserve:

- Calendar
- Cash and credit
- Cumulative profit
- Staff
- Agency level and Capability Points
- Systems/capabilities
- Reputation
- History

Retire:

- Clients and retainers
- Client seat-growth targets
- Client-service gameplay

The transformation is available only at a clean month opening before work or variable spending. This avoids discarding partially earned fees or mixing incompatible revenue bases.

After transformation, `targetSeats` remains `0`. The same 2027 profit objective applies. Owned-funnel risks include payout delay, anonymous-funnel fragility, claims review, compliance crackdowns, account enforcement, payment paths and platform concentration.

### Agency Level

Agency Level is a major progression signal and must look important. It is driven by peak-profit milestones. Capability Points are a separate spendable count. Never compress them into an ambiguous string such as `1 · 1 point`.

---

## 16. Variety and randomization

The user’s repeated critique was that runs felt identical.

### REQUIRED DIRECTION

Different seeds should change more than names and ±10% outcome noise. Vary:

- What the business sells
- Who buys it
- Why the outcome matters
- Agency and client location
- Service or licensed area
- Account timezone
- Existing ad and offer
- Opening condition
- Relationship source and personality
- Fulfillment capacity
- Seasonality
- Available opportunities
- Incident category and scope
- Strategic tradeoffs

The opening briefing must make those differences legible. Randomness that the player cannot perceive or use does not make a run feel different.

### Deterministic tutorial balance

- Tutorial action outcomes must be stable enough to explain.
- The career around those actions may vary.
- Ordinary challenges should remain replayable by seed.
- Do not use setup presentation choices to perturb game RNG.

### Current limitation

Agency incident variety remains relatively small compared with the desired career span. Future decks should be condition-tagged and include positive, negative and mixed events with cooldowns so one run cannot repeat the same story too often.

Potential event families:

- Client fulfillment and sales follow-up
- Geography and service-area mistakes
- Time-zone handoff
- Weather and seasonality
- Platform/account status
- Tracking and attribution
- Creative production
- Agency staffing and infrastructure
- Positive expansion opportunities
- Partnerships and reputation
- Payment and receivable timing
- Compliance and claims

---

## 17. Traditional media and location research direction

### ROADMAP DEPTH

Traditional media exists as channels in Agency Career, but future mechanics should not be a digital CPM reskin.

Each traditional buy should eventually model:

- Geography/market
- Reach
- Frequency
- Spill outside the service area
- Production lead time
- Commitment length
- Creative fit
- Daypart/programming
- Measurement confidence
- Branded-search or direct-response lift

Distinct directions:

- Broadcast TV — broad market/DMA-like reach, spill, daypart, longer production and low direct attribution.
- Local cable — market/zone/network/programming, less scale and more local control.
- Radio — metro/station/daypart, high frequency, local message, call/vanity-URL measurement.
- Static billboard — individual site or package, physical production, long commitment and estimated exposure.
- Digital out-of-home — faster swaps and dayparting, still not click-level measurement.

Do not ship proprietary Nielsen DMA mappings without a license. Use market names, synthetic markets or open county/metro structures and explain the approximation.

### Future geography controls

Potential player-facing campaign controls:

- Radius
- County
- Metro
- State
- Multistate
- National
- Included/excluded regions where the simulated platform supports them
- Presence versus presence-or-interest behavior
- Service/licensed eligibility
- Address or ZIP qualification
- State-separated versus pooled campaigns

The underlying design relation is:

```text
reachable demand = location demand × eligibility × seasonality × capacity fit
qualified outcomes = raw outcomes × service-area fit × geo integrity × sales-hours fit
```

Use synthetic, disclosed game rates rather than presenting invented platform leakage as fact.

### Research references already gathered

These sources informed the location/traditional-media direction. Recheck the primary source before turning a design approximation into player-facing factual copy.

- U.S. Bureau of Economic Analysis regional price parities — relative state/metro price context, not literal agency-cost quotes: `https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area`
- Census County Business Patterns — local business/industry priors: `https://www.census.gov/programs-surveys/cbp/data/datasets.html`
- American Community Survey profiles — population and market context: `https://www.census.gov/acs/www/data/data-tables-and-tools/data-profiles/`
- U.S. Department of Transportation time zones and daylight-saving authority: `https://www.transportation.gov/regulations/time-act`
- Google Ads account timezone: `https://support.google.com/google-ads/answer/17006726`
- Google Ads ad scheduling: `https://support.google.com/google-ads/answer/2404244`
- Google Ads advanced geographic options: `https://support.google.com/google-ads/answer/1722038`
- Google’s explanation of location determination: `https://support.google.com/google-ads/answer/2453995`
- Google matched-location reports: `https://support.google.com/google-ads/answer/7492954`
- TikTok location targeting: `https://ads.tiktok.com/help/article/location-targeting?lang=en`
- Snapchat location/audience targeting: `https://forbusiness.snapchat.com/advertising/audience-targeting`
- Meta Advantage+ audience/location constraint context: `https://www.facebook.com/business/ads/meta-advantage-plus/audience`
- Google restricted targeting for housing, employment and credit: `https://support.google.com/adspolicy/answer/143465`
- TikTok housing, employment and credit policy: `https://ads.tiktok.com/help/article/housing-employment-credit-hec-ad-policy?redirected=2`
- Nielsen’s explanation of designated market areas: `https://www.nielsen.com/insights/2025/what-is-a-dma-and-why-does-it-matter/`
- FCC material on cross-state DMA realities: `https://docs.fcc.gov/public/attachments/DA-16-613A1.pdf`
- Geopath out-of-home terminology: `https://geopath.org/glossary/`
- NOAA 1991–2020 climate-normal documentation for nonstereotyped seasonal events: `https://www.ncei.noaa.gov/pub/data/cdo/documentation/normals-annualseasonal-1991-2020_documentation.pdf`

Important design interpretation: use these as inputs to a synthetic and transparent game model. Do not imply that To The Moon reproduces a platform’s actual leakage rate, a metro’s literal agency expense or a proprietary media-market boundary.

---

## 18. Sound, visual and radio direction

### Sound

The user explicitly hates repeated “BEEP BEEP BEEP” on buttons.

Current suite:

- 18 semantic cue roles.
- 23 active `lunar_*.ogg` variants.
- Routine buttons, sliders and repeated adjustments are silent by default.
- Meaningful navigation opts into a quiet cue.
- Cooldowns and channel priorities prevent stacking.
- Local round-robin variation is RNG-neutral.

Semantic families include navigation, open, close, confirm, day launch, settle, save, profit, creative ready, creative shipped, correct, wrong, warning, crisis, Epic, Legendary, victory and failure.

The desired character is flowy, lunar, broad, cinematic and epic—emotionally comparable to large science-fiction games such as Starfield, without copying their sounds or motifs.

### Victory cash register

`assets/audio/lunar_victory_cash.ogg` is one composite runtime cue.

- A real CC0 physical register drawer/bell/coin source is baked into the bloom.
- It enters about 520 ms after the opening rise.
- The bloom ducks so the register is unmistakable.
- It plays only for victory.
- It remains one `Audio.play`, not two runtime cues.

This was revised twice because earlier synthesized and mixed accents existed in the waveform but were inaudible in context. Test file paths and hashes are not a substitute for an audible QC pass.

User-supplied sound libraries:

- `https://soundbible.com/tags-cha-ching.html`
- `https://mixkit.co/free-sound-effects/`
- `https://freesound.org/`
- `https://pixabay.com/sound-effects/`
- `https://www.zapsplat.com/`

Verify the license of every asset. Current money sources and the baked victory source are documented in `ASSET_CREDITS.md`.

### Reactive background

Current background implements the supplied “Financial Data Matrix / Algorithm Pulse” concept:

- Full-screen WebGL/GLSL canvas behind the interface.
- Grid/liquid-mesh movement suggesting capital, auctions and data nodes.
- First-party audio/SFX energy affects pulse.
- Game state changes hue and disruption.
- High performance trends emerald/cyan and orderly flow.
- Bleeding spend, fatigue and crises trend crimson/amber/glitch.
- Pointer movement creates local lens behavior.
- It is cosmetic and RNG-neutral.
- Reduced-motion, forced-color, data-saving, low-memory and WebGL-failure fallbacks apply.

Spotify audio is cross-origin and cannot be assumed available to a Web Audio analyzer. React safely to first-party SFX, game state and selected radio accent.

### Graphical assets

Actual graphical assets are possible. Current title art is:

```text
assets/images/title-operations-room.webp
```

Future title/key-art work should add original lunar imagery, transitions and restrained motion. Do not imitate another game’s protected art.

### Media Buyer Radio

Current order:

| # | Station | Flow/use | Color |
|---:|---|---|---|
| 1 | Psych Pop | Kaleidoscopic warm-up; planning and hooks | `#FF6B9D` |
| 2 | Synthwave | Late-night scaling and dashboard work | `#FF007F` |
| 3 | Melodic & Deep House | Attribution audits and long reporting | `#0B192C` |
| 4 | Trance | Deadline sprint | `#7C3AED` |
| 5 | Drum & Bass | Bulk edits, tracking tags and urgent fixes | `#06B6D4` |
| 6 | Tech House | Victory lap and team momentum | `#84CC16` |
| 7 | Metalcore | Bans, rejections and appeal triage | `#DC2626` |
| 8 | Lofi | Copy variations and calm reporting | `#D97706` |
| 9 | Hip-Hop | Pitch preparation and decisive scaling | `#EAB308` |
| 10 | Heartland | Consumer research and grounded stories | `#854D0E` |
| 11 | Outlaw | Manual overrides and controlled risk | `#B45309` |
| 12 | Atomic Jazz | Calm outage/attribution response | `#FFD700` |

Psych Pop leads because the user requested Tame Impala-style pop near the front. Its documented orbit includes Tame Impala, MGMT, Magdalena Bay, Unknown Mortal Orchestra and Khruangbin.

The exact Spotify playlist IDs and search codes live in `js/radio-data.js`. Radio is cosmetic and cannot consume RNG. Playback uses Spotify’s public embed in an independent named window. Browser, region and Spotify-session behavior can affect preview/full playback; do not promise guaranteed playback, track metadata access or custom embed volume.

---

## 19. User-supplied references and research inputs

### Game flow and information architecture

- EQOA PS2 startup/title flow: `https://www.youtube.com/watch?v=gkimZPkrl1g&pp=ygUVZXFvYSBwczIgdGl0bGUgc2NyZWVu`
- Classic Newgrounds game flow: `https://youtu.be/JLnDlE9Mz0w?si=iY-DWWB5qmYgTYlk`
- Civilization IV dense-reference presentation: `https://civilization.fandom.com/wiki/Civilization_IV`

The lesson is pacing, hierarchy and interaction, not arbitrary loading screens or visual imitation. Actually inspect these sources before the next major startup/title pass.

### Creative/performance research

- Google Sheet: `https://docs.google.com/spreadsheets/d/1U-j0wOvIE6XMAmrPRAvDLETLelEac5vT7I3GqIuRVEE/edit?usp=sharing`
- Local PDF supplied during development: `/Users/gabrielmoss/Downloads/ctv-performance-aug-1-7-2026.pdf`
- Two private dashboard screenshots contrasting materially different buyer/account structures.

The useful hypothesis from those screenshots was that two real buyers can use materially different account and creative structures—one appearing more Story Ad/native-long-copy oriented and another using a different campaign/ad-set/asset architecture. Treat the interpretation as a hypothesis to test against the supplied data, not a proven rule. Keep the public game synthetic and avoid carrying personal names into source or documentation.

The PDF may not exist on another machine, and the sheet may require access. Ask the user to reattach or grant access if necessary.

### Privacy rule

Do not copy into this repository:

- Private account IDs
- Real client/employee names
- Live financial figures
- Private links
- Source-workbook rows
- Identifiable screenshots

Translate evidence into generalized, invented game mechanics. Tests explicitly reject known private tokens from earlier screenshots.

---

## 20. Testing and release workflow

### Required checks

```bash
for f in js/*.js; do node --check "$f" || exit 1; done
node --check tests/sim-smoke.mjs
git diff --check
node tests/workspace-stability.mjs
node tests/sim-smoke.mjs
```

Calibration report:

```bash
node tests/sim-smoke.mjs --report
```

The smoke suite self-shards into child Node processes. Run the normal command unless diagnosing a named shard. CLI flags such as `--report` are forwarded.

### What the smoke suite protects

- Exact global script order and cache version.
- All seven modes.
- Determinism and UI/RNG isolation.
- Setup selection plus Continue.
- RNG-matched openings.
- Tutorial locks, exits and resume.
- Save isolation, corruption handling and migrations.
- 303 glossary terms and all 11 analogy lenses.
- Field Guide staging and first-click term navigation.
- Creative taxonomy, format/method behavior and offer alignment.
- Classic search, ads, Quality Score and client trust.
- Mode 5 ledgers, crises, concentration, gates and reconciliation.
- Agency origins, geography, costs, staff proration, insolvency, growth, tech, holding/affiliate invariants and v1–v4 migration.
- Modal isolation and keyboard behavior.
- Training XP idempotency and economic neutrality.
- Radio and ambient-background RNG neutrality.
- Semantic SFX and the victory composite.

`tests/workspace-stability.mjs` separately protects:

- MutationObserver settlement.
- No duplicate Inspect controls.
- Stable entity keys.
- Route rescoping.
- No observer feedback loop from presentation writes.

There is no installed automated real-browser end-to-end suite or CI workflow. The Node harness is extensive, but high-risk responsive, focus, sound and modal work still needs a local browser check.

### Balance snapshot

The current executable `--report` output is more authoritative than older prose in `README.md`.

`README.md` also contains a few historical descriptions of the old eight-cue sound system and earlier Field Guide structure. When exact counts or current behavior matter, prefer `js/content-db.js`, `js/feedback.js`, `js/lesson-data.js`, `js/field-guide.js` and the passing test contracts. Refresh the README in a dedicated documentation pass rather than weakening current code to match stale prose.

Recent observed calibration:

| Mode | Passive ROI p10 / median / p90 | Managed ROI p10 / median / p90 |
|---:|---|---|
| 1 | -22.8 / 13.8 / 82.3 | 34.1 / 109.4 / 230.4 |
| 2 | -21.6 / 15.0 / 83.7 | 44.4 / 112.4 / 220.4 |
| 3 | -20.6 / 12.6 / 80.5 | 12.3 / 65.7 / 159.9 |
| 4 | -59.6 / -37.9 / -11.4 | -10.0 / 43.3 / 89.9 |

Mode 5 passive sample: 0/40 mandate exits, 33 credit collapses, median exit around Day 54.
Mode 5 managed sample: 34/40 mandate exits, no credit collapses, median exit around Day 90.

Do not weaken tests merely to accommodate a new feature. Investigate whether the mechanic has broken the teaching policy or economy.

### Static release

- Local static check: `python3 -m http.server 8768`, then open `http://localhost:8768/`.
- Push to `main`.
- GitHub Pages serves the root.
- There is no build output directory.
- If any served JS/CSS changes, increment the shared query version in every URL in `index.html` and update the test constant.
- Update `radio.html` resource versions when its served dependencies change.
- Do not change script order casually.
- A `?release=<commit>` query is useful for a cache-distinct public link, but does not replace asset-version bumps.

---

## 21. Security, accounts and asynchronous multiplayer

### Current state

The two passphrase-selected profiles are routing convenience. GitHub Pages ships the hashes and all content to the browser. It is not secure authentication.

There are currently no:

- Accounts
- Password database
- Google login
- MFA enforcement
- Trusted API
- Server saves
- Verified runs
- Leaderboards
- Async challenges
- Ghost replays

### User’s future goal

- PFM-only accounts.
- Mandatory MFA.
- Cross-device saves.
- Per-mode leaderboards.
- Ranked and sandbox separation.
- Daily/weekly shared-seed challenges.
- Career seasons.
- Direct seeded challenges.
- Replayable “ghost” runs.
- Player, coach and administrator roles.

### Trusted-run contract

The browser cannot submit “I earned $40 million” as trusted truth.

1. Server creates a run with player, mode, rules version, seed, budget, period and difficulty.
2. Each player decision enters an authenticated, ordered action log.
3. The server replays the log through a shared deterministic engine.
4. The server calculates the result.
5. Only the server publishes a ranked score.

Use idempotency keys/nonces, replay protection and immutable rules versions.

Each mode needs a scoring contract aligned with its lesson:

- Working Capital — liquidity and settlement discipline.
- Creative Operations — pipeline continuity and fatigue control.
- Channel Command — account health and allocation quality.
- Portfolio Command — profit, concentration, resilience and attribution integrity.
- Agency Career — 2027 profit, survival, liquidity, resilience and operating quality.

Training XP can become verified profile evidence, but never a ranked economic buff.

### Preferred authentication

PFM already has Google Workspace.

- Prefer Google Workspace OIDC/SSO.
- Enforce the PFM domain.
- Rely on organization-enforced MFA.
- Do not build or store passwords.
- If Workspace SSO is ever unavailable, use a managed authentication provider with mandatory authenticator-app TOTP; do not implement a custom password database.
- Use player, coach and administrator roles.
- Support invite/domain revocation and private display handles.
- Use secure, HttpOnly, SameSite sessions, CSRF protection where applicable, rate limits and audit logs.

### Backend extraction requirement

The current engines are DOM-bound global scripts. Before ranked multiplayer:

1. Extract versioned pure simulation commands and reducers.
2. Separate rendering from game mutations.
3. Define run, action, checkpoint, result and replay-hash schemas.
4. Make browser and server run the same logic.
5. Prove replay parity across many seeds before trusting rankings.

A practical first database shape would separate:

- `users` and organization memberships
- roles and invitations
- rules versions
- cross-device save snapshots
- server-issued runs
- ordered run actions with idempotency keys
- verified run results and replay hashes
- seasons and mode-specific leaderboard entries
- Training Progress events
- administrative audit events

Do not store the authoritative result only as a mutable total. Preserve enough versioned input to replay it.

---

## 22. Home-server deployment plan

### User’s hardware and constraints

- Dedicated Ubuntu tower.
- Intel i7-6700K.
- 16 GB RAM.
- Dedicated SSD.
- PFM Google Workspace is available.
- Tailscale Funnel has been unreliable.
- **Do not make Tailscale Funnel a public-ingress dependency.**
- Keep the existing GitHub Pages practice game running.

The hardware is adequate for a small team API, PostgreSQL database and deterministic replay workload. Power, residential upload, public reachability and backups matter more than CPU.

### Recommended service stack

- Docker Compose.
- Application/API service.
- PostgreSQL.
- Caddy or another reverse proxy for HTTPS.
- Redis only if real queues/rate limiting require it.
- Automated encrypted off-machine backups.
- Health checks and structured logs.
- UPS and graceful shutdown.
- Host firewall exposing only necessary ports.
- Tailscale may remain for private administration.

### Public ingress options

1. Cloudflare Tunnel to a dedicated game subdomain.
2. Conventional port forwarding plus Caddy/Let’s Encrypt and static DNS/DDNS.
3. A small VPS reverse tunnel if the ISP uses carrier-grade NAT.

Avoid Tailscale Funnel.

### Parallel deployment model

Preserve two products during migration:

1. Static GitHub Pages practice edition.
2. Authenticated, authoritative team edition on the home stack.

A separate authenticated hostname is easier to reason about than embedding secrets or score authority into Pages.

If residential uptime, upload bandwidth or carrier-grade NAT makes the home tower unsuitable for public production traffic, a managed alternative remains valid: host the application/API on Cloudflare or Vercel and use a managed PostgreSQL/auth provider such as Supabase. The same server-authority and replay rules apply. Do not split data across several providers until there is an operational reason.

### Rollout sequence

1. Write a backend architecture decision record.
2. Extract the deterministic simulation core.
3. Define versioned run/action/replay schemas.
4. Add Google Workspace OIDC and role authorization.
5. Create database tables for users, saves, runs, actions, results, seasons and leaderboards.
6. Implement server run creation, action append, finalization and replay verification.
7. Containerize and deploy API + Postgres behind HTTPS.
8. Add backups, monitoring, rate limits and audit logs.
9. Compare browser/server outcomes across the entire seed suite.
10. Introduce ranked play only after parity passes.

Never put OAuth secrets, database URLs, tunnel tokens or backups in this public repository.

---

## 23. Known limitations and next product milestones

These are honest gaps, not hidden failures.

### P0 — preserve the current behavioral floor

- Keep the static release working.
- Preserve save migration and deterministic replay.
- Preserve modal isolation, menu access and select-then-Continue behavior.
- Keep Agency origin channel restrictions valid across active clients, prospects, archives and saves.
- Keep client media separate from agency economics.
- Keep Holding/affiliate `targetSeats = 0` after every close and resume.
- Keep Training XP economically neutral.

### P1 — deepen Agency run variety

- Expand condition-tagged incident decks.
- Add positive and mixed opportunities, not only problems.
- Add cooldown/history to prevent repetition.
- Make fulfillment, seasonality and service boundaries visible decision inputs.
- Add more opening-story combinations that change early strategy.
- Preserve offer/customer/concept/channel semantic alignment.

### P1 — make creative-agency play genuinely creative

- Let the player choose concept, execution, production method, placement and controlled revision.
- Teach those as separate actions.
- Make a refresh visibly produce a new creative, not just a higher scalar.
- Maintain approval, rights, production capacity and fatigue tradeoffs.

### P1 — deepen holding-company Career

- Current Holding origin is a simplified owned-funnel branch.
- Port selected Mode 5 ideas—shared event sources, multiple simultaneous platform initiatives, payout risk and scoped crises—without duplicating Mode 5 wholesale.
- Keep the original Holding origin distinct from an agency’s later affiliate transformation.

### P2 — editable geography

- Add explicit campaign target-state/service-area controls.
- Model pooled versus state-separated learning and workload.
- Add platform-specific geo boundaries and compliance constraints.
- Show literal local times and response windows.
- Verify DST behavior before claiming exact historical clock fidelity.

### P2 — traditional media depth

- Reach, frequency, spill, daypart, production lead, commitment and measurement confidence.
- Local market inventory without unlicensed proprietary data.
- Cross-channel lift and attribution ambiguity.

### P2 — authenticated team edition

- Pure engine extraction.
- Google Workspace SSO and MFA.
- Server saves and replay verification.
- Ranked/sandbox modes and versioned leaderboards.
- Home-server deployment, monitoring and backups.

### P3 — audiovisual expansion

- Original lunar key art and transitions.
- More state-aware background behavior with restrained motion.
- Broader semantic cues only where an event deserves sound.
- Continue real listening tests at normal volume.

---

## 24. Relevant development history

Recent commits show the order and intent of the current architecture:

```text
a773c3a Build distinct agency career origins
2c4fe1e Replace vague agency interface copy
6101a1a Rebuild the creative blueprint model
c71128f Explain every simulated ad platform
aa752b8 Fix Portfolio workstream overlap
91e3e18 Keep navigation available during tutorials
b531ded Deepen seeded scenario variation
34a3cdc Repair Agency Career guided opening
4dcb89e Make Agency level a primary progression card
32cb52c Expand Agency Career endgame capabilities
2e83e0a Require confirmation after setup selections
c622a18 Remove player-facing training track labels
b1797e9 Fix guided tutorial card collisions
791afec Make hover lesson links directly clickable
a5fb383 Clarify creative catalog and isolate modal input
3fb129e Cache-bust corrected victory audio
00679f1 Make victory cash register clearly audible
1e802cc Refine analogy system and prioritize gameplay UI
2abaeac Add psychedelic pop to the radio
087bae7 Rebuild the game cockpit navigation
b498b9d Add cash accent to lunar victory bloom
a4d35a8 Turn Field Guide chapters into staged lessons
190620a Replace universal beeps with lunar soundscape
cb7ebf2 Rebuild startup flow around staged play
e7a1741 Model agency operating runway
7990fd6 Skip fixed career horizon setup
26146b8 Build persistent Training XP progression
5f971f4 Fix workspace crash and card navigation
34f946b Rebuild the game interface as a modular cockpit
792b0d9 Make To The Moon clearer and more instructional
11c19da Prevent hanging words across trainer UI
89b2b1f Rebuild onboarding and expand creative systems
e6d6498 Rebuild the game front door as a staged menu
d8d491e Add reactive ambient data field
a82d9ce Use American spelling and reorder analogy flavors
bd78996 Add Agency Career
```

Read these commits when a new change appears to contradict an existing behavior. Many “odd” checks are the residue of a real browser failure, not arbitrary test ceremony.

---

## 25. Definition of done for future work

Before calling a feature complete, verify the actual interaction in addition to source presence:

- Can a new player explain what To The Moon is after the first screen?
- Is there only one meaningful decision per setup screen?
- Does a selection wait for Continue?
- Can the player always tell the run type, mode and phase?
- Is the next action visible and physically locatable?
- Can the player exit or reconfigure every tutorial?
- Are covered controls inert and silent beneath overlays?
- Does gameplay appear before supporting dashboards dominate the viewport?
- Does every term link work on the first click?
- Does every taxonomy explain what it is and why it exists?
- Does every generated client have a coherent business, customer, offer, ad, channel and geography?
- Do two fresh seeds present meaningfully different situations?
- Are tutorial outcomes deterministic where instruction requires it?
- Is the copy exact, plain, American and human?
- Is Agency Level prominent and unambiguous?
- Is the physical cash-register drawer unmistakable in the victory bloom?
- Does Training XP remain economically and randomly neutral?
- Do save migrations preserve older runs?
- Can ranked results eventually be reconstructed from server-owned actions instead of browser claims?

The most important warning is:

> **Do not respond to density by adding more text to the first screen. Structure the density into a sequence, a hierarchy and an interaction cycle.**

---

## 26. Suggested prompt when handing this to another Claude task

Use this wording with the file attached or pasted:

> You are continuing development of To The Moon. Read `CLAUDE_DEVELOPMENT_HANDOFF.md`, `EDITORIAL_STYLE.md` and `INTERFACE_ARCHITECTURE.md` completely before acting. Inspect the current repository and tests; do not assume roadmap items are shipped. Preserve stable mode IDs, deterministic simulation behavior, save migrations, presentation-state isolation, public-repo privacy and the current GitHub Pages build. Make changes with focused patches, add regression coverage for the user-visible behavior and run the relevant verification commands before handing back the result.
