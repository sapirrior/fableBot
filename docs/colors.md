# Fable Bot — Theme Colors and Brand Palette Guidelines

This document details Fable's visual color specifications. All embeds returned by the bot must use the central theme mappings exported by `src/util/colors.js` to maintain visual coherence across systems.

---

## 1. Palette Mapping Configurations

Never hardcode raw hexadecimal integer values inside commands. Color constants must be imported from:
`import { COLORS } from '../../util/colors.js';`

The Fable theme configuration binds the following hex codes to game actions:

| Constant | Hex Value | Decimal | Intent / Usage Case |
| :--- | :--- | :--- | :--- |
| `COLORS.BRAND` | `#5865F2` | `5793266` | Default theme, shop menu, and landing embeds. |
| `COLORS.SOFT` | `#A0AAB0` | `10529456` | Secondary info parameters, avatar card queries, and rule panels. |
| `COLORS.MINT` | `#57F287` | `5763719` | Positive economy operations, level ups, purchases, and /daily claims. |
| `COLORS.GOLD` | `#FEE75C` | `16705372` | Blackjack natural payouts, coinflip wins, and rare insect catches. |
| `COLORS.ROSE` | `#ED4245` | `15549000` | Gambling loss outcomes, broken nets, and session cancellations. |
| `COLORS.SLATE` | `#4F545C` | `5198940` | Tie/Push game results, or default common item displays. |
| `COLORS.CRIMSON` | `#992D22` | `10038562` | System errors, command blockers, and permission faults. |
| `COLORS.VOID` | `#1A0A2A` | `1706538` | Celestial tier rolls, lore sequences, and dramatic narrative embeds. |

---

## 2. API Implementation Reference

### Embed Configuration Style
```javascript
import { COLORS } from '../../util/colors.js';

const embed = {
  color: COLORS.MINT, // Uses the mint color constant
  title: 'Transaction Approved!',
  description: 'Purchased a **Fine Mesh Net** 🏸 for **500 ⌬**.'
};
```

### Color Synchronization Rules
* **Neutral Operations**: Use `COLORS.BRAND` or `COLORS.SOFT`.
* **State Outcomes**:
  * **Success/Win**: `COLORS.MINT` or `COLORS.GOLD`
  * **Failure/Loss**: `COLORS.ROSE`
  * **Tie/Neutral**: `COLORS.SLATE`
* **Error Bounds**: All errors managed via the `sender.error()` wrapper are auto-styled to use `COLORS.CRIMSON`.
