# Asset credits

## Interface sounds

The following files are selected from **Interface Sounds (1.0)**, created and
distributed by [Kenney](https://kenney.nl/assets/interface-sounds), 11 February 2020.

License: [Creative Commons Zero 1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).
Attribution is optional; it is included here as a courtesy.

Bundled files:

- `click_002.ogg`
- `confirmation_003.ogg`
- `confirmation_004.ogg`
- `drop_004.ogg`
- `error_003.ogg`
- `error_008.ogg`
- `glitch_004.ogg`
- `maximize_005.ogg`
- `maximize_008.ogg`
- `scratch_004.ogg`
- `scroll_002.ogg`
- `select_004.ogg`
- `tick_001.ogg`
- `day_tally_fast.ogg`, a shortened, accelerated, and faded adaptation of `scroll_002.ogg`

Older selected files remain bundled as alternate source material, but the interface does
not present the sound library or expose additional cue roles.

## Original lunar feedback suite

The active game-feedback suite is original procedural sound design created for To The Moon.
It uses deterministic oscillators, seeded noise, filters, envelopes and delay taps generated
by [`scripts/generate_lunar_sfx.py`](scripts/generate_lunar_sfx.py). It contains no sampled,
transformed or imitated audio from another game, soundtrack or commercial library.

The 23 active `lunar_*.ogg` files cover 18 semantic roles: meaningful navigation, panel movement,
major confirmation, day launch, settlement, checkpoint save, profit, creative production and
shipping, knowledge-check results, warnings, crises, Epic and Legendary reveals, victory and
failure. Common actions rotate through local variants without consuming simulation randomness.
Routine controls, sliders and repeated adjustments are intentionally silent.

The victory cue keeps its broad lunar bloom and adds an original procedural cash accent: a
mechanical register release, a bright two-part chime and a short coin-sparkle tail. The accent
appears only when a run is won; ordinary navigation and profitable-day cues do not use it.

## Money feedback sounds

These sounds are released under [Creative Commons Zero 1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).
Attribution is not required; source details are included for provenance.

- `money_settle_coin.ogg` is adapted from [Coin Pickup Sound V 0.2](https://freesound.org/people/Davidsraba/sounds/347174/)
  by Davidsraba. It is trimmed, faded, level-adjusted, and encoded as Ogg Vorbis.
- `money_profit_register.ogg` is adapted from [Cash Register Fake.wav](https://freesound.org/people/CapsLok/sounds/184438/)
  by CapsLok. It is trimmed, faded, level-adjusted, and encoded as Ogg Vorbis.
- `money_jackpot_register.ogg` combines [Cash Register (imitation with toaster and bells)](https://freesound.org/people/modusmogulus/sounds/794903/)
  by modusmogulus with [Coin Pickup SFX \[2\]](https://freesound.org/people/SoundDesignForYou/sounds/646672/)
  by SoundDesignForYou. Both sources are trimmed, mixed, faded, level-limited, and encoded
  as Ogg Vorbis.

These money sounds remain bundled as credited legacy source material. They are no longer part
of the active cue map.

## Fonts

The interface requests [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch),
[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), and
[Inter](https://fonts.google.com/specimen/Inter) from Google Fonts. All three families
are distributed under the SIL Open Font License 1.1. The CSS includes local system
fallbacks, so To The Moon remains functional if the font request is unavailable.

No Game-icons.net or Kenney UI Pack graphics are bundled; the terminal surfaces,
borders, gauges, particles, and badges are original CSS.
