# To The Moon interface architecture

This document defines the shared navigation model for every To The Moon mode. Mode engines
own their rules and content. The cockpit owns orientation, layout and presentation state.

## The player must always know

The persistent context bar answers seven questions without opening another screen:

1. What kind of play is this: Tutorial, Challenge, Full run or Career?
2. Which mode am I playing?
3. Where am I in its clock?
4. What phase am I in now?
5. What is the immediate objective?
6. What should I do next?
7. What wins the run?

`playerContextModel()` is the single source for these answers. It is read-only: context must
never draw random numbers, advance time or enter a save payload.

## Information layers

### Persistent

- Product identity and global controls
- Run context
- Six primary mode signals
- Primary commit/run action

These elements answer orientation and support the next decision. They should not become a
second glossary or full ledger.

### Workspace

- Compact entity navigator
- Active board or selected entity
- Actions, recent activity and account systems

The default desktop view shows the board and command pane together. Board and Command tabs
let either pane use the full workspace. Selecting an entity keeps its siblings available in
the navigator while focusing one card.

### Nested evidence

Technical evidence, card anatomy, contracts, supporting metrics and analogies belong in
named disclosures. Detailed guidance adds stronger explanations and glossary links; it does
not open every disclosure at once.

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

- `#strip`: Six primary signals plus a supporting-metrics disclosure.
- `#slots`: Navigable operating entities.
- `#accountBox`: Current event, measurement or account-wide systems.
- `#pipeBox`: Production, search-term, shared-system or capability work appropriate to the mode.
- `#log`: Recent outcomes, not instructions.
- `#runBtn`: The single action that commits choices and advances the simulation clock.

The generic shell may change a panel label to match a mode, but a control must not silently
change its consequence.

## Responsive behavior

At desktop game sizes, the shell is bounded to the viewport. The board and command pane scroll
independently so the page itself does not become navigation. Short screens, zoomed layouts and
phones return to document flow to preserve readable text and touch targets; Board and Command
tabs still provide focused views.

## Accessibility and continuity

- Workspace and command tabs expose selected state and support keyboard focus.
- Cards hidden by entity focus are also inert.
- Escape first leaves a focused card or expanded workspace, then follows the existing overlay
  dismissal hierarchy.
- Reduced motion, high contrast and forced colors remain supported.
- Workspace view, command tab and selected entity are presentation state only.

