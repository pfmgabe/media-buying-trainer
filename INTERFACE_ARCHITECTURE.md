# To The Moon interface architecture

This document defines the shared navigation model for every To The Moon mode. Mode engines
own their rules and content. The cockpit owns orientation, layout and presentation state.

## The player must always know

The compact context bar answers the first four questions immediately. The last three live in
two named reference drawers so they remain available without pushing the work below the fold:

1. What kind of play is this: Tutorial, Challenge, Full run or Career?
2. Which mode am I playing?
3. Where am I in its clock?
4. What phase am I in now?
5. What is the immediate objective? (`Goal and rules`)
6. What should I do next? (`Do this next`, always visible and actionable)
7. What wins the run? (`Goal and rules`)

`playerContextModel()` is the single source for these answers. It is read-only: context must
never draw random numbers, advance time or enter a save payload.

## Information layers

### Persistent orientation

- Product identity and global controls
- Compact run context and one recommended route
- One selected status page, rather than every available metric
- Primary commit/run action

These elements answer orientation and support the next decision. They should not become a
second glossary or full ledger.

### Workspace destinations

- `Today`: a bounded priority desk (at most three operating entities), active work and the commit action
- `Board` or `Client work`: operating entities and selected-entity inspection
- `Account` or `Finance`: money, measurement and operating systems
- `Team` in Agency Career: capacity and staff
- `Production` or `Capabilities`: creative production, capabilities and expansion
- `History`: the event and result ledger

The destination rail is persistent on desktop. Each destination owns the center workspace and
may expose its own second-level tabs. Selecting an entity keeps its siblings available in the
navigator while focusing one card. The recommendation model may highlight a destination; it
must not move the player or steal focus until the player chooses it.

### Nested evidence

Technical evidence, card anatomy, contracts, supporting metrics and analogies belong in named
disclosures. Detailed guidance adds explanations and glossary links; expertise level never
opens every disclosure at once. Disclosure state is presentation state and survives an engine
rerender during the current browser session.

### Deep overlays

Setup, opening briefings, the Field Guide, creative pickers, client conversations, crisis
resolution, lead desks and irreversible confirmations use the existing modal stack. Closing
an overlay returns focus to the control that opened it.

## Shared vocabulary

- **Mode:** A game type with its own lesson and engine.
- **Challenge:** A configured run of Modes 0–4.
- **Full run:** The portfolio-scale Mode 5 simulation.
- **Career:** The multi-session 2017–2027 mode.
- **Day, workday or month:** Simulation time.
- **Campaign:** A media-buying hierarchy object, not a synonym for game mode.

Money and measurement states should remain distinct:

`Authorized → Allocated → Spent → Billed → Earned → Claimed → Settled`

## Mode integration contract

Every engine may populate the established content slots, but it must preserve their meaning:

- `#strip`: A small set of status pages. A page should show no more than four primary signals
  in Agency Career and no more than six in a challenge mode.
- `#slots`: Navigable operating entities.
- `#accountBox`: Current event, measurement or account-wide systems.
- `#pipeBox`: Production, search-term, shared-system or capability work appropriate to the mode.
- `#log`: Recent outcomes, not instructions.
- `#runBtn`: The single action that commits choices and advances the simulation clock.

The generic shell may change a panel label to match a mode, but a control must not silently
change its consequence.

## Responsive behavior

At desktop widths, including short laptop and 2× Retina viewports, the shell remains bounded to
the viewport. The active workspace scrolls independently so the page itself does not become
navigation. Narrow screens return to document flow to preserve readable text and touch targets.
Height alone must never dismantle the desktop shell.

## Accessibility and continuity

- Workspace and local page tabs expose selected state, name their controlled region and support
  arrow, Home and End keyboard navigation.
- Cards hidden by entity focus are also inert.
- Escape first leaves a focused card or expanded destination, then follows the existing overlay
  dismissal hierarchy.
- Reduced motion, high contrast and forced colors remain supported.
- Workspace destination, local page, disclosure and selected entity are presentation state only.
- Presentation preferences are scoped by mode so one mode cannot reopen another in the wrong
  destination.
