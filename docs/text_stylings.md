# Fable Bot — Text Formatting and Styling Standards

This document defines the technical rendering and styling rules for all user-facing embeds and messages across Fable commands. These standards prevent visual clutter, maintain a premium RPG design aesthetic, and ensure consistent client-side rendering.

---

## 1. Syntax Formatting Rules

### A. Dynamic Variables
All dynamic values (integers, strings, ratios, and currencies) in description strings or field values **must be bolded**. 
* **Correct**: `Balance: **250 ⌬**` | `You reached **Level 5**!`
* **Incorrect**: `Balance: 250 ⌬` | `You reached Level 5!`

### B. Command References
Command names must be formatted as inline code blocks wrapped in backticks (`` ` ``) when mentioned in description or error messages. Do **not** use backticks inside embed footers or author fields (since Discord does not render markdown in those spaces).
* **Correct**: `Use \`/shop\` to browse catching supplies.`
* **Incorrect**: `Use /shop to browse catching supplies.` | `Use */shop* to browse catching supplies.`

### C. Metadata Separation
Inline metadata attributes (e.g. status details, values, levels) must be separated using a centered middot (` · `) with surrounding spaces. Never use vertical pipelines (`|`) or slashes (`/`) as inline boundaries.
* **Correct**: `Butterfly 🦋 · Rare · **80 ⌬**`
* **Incorrect**: `Butterfly 🦋 | Rare | 80 ⌬` | `Butterfly 🦋 / Rare / 80 ⌬`

---

## 2. Structural & Layout Restrictions

### A. No Emoji-Pipeline Prefixes
Leading decorative emoji-prefix blocks (such as `🔹 | Text` or `🟢 | Status`) are strictly banned. Emojis must only be used inline adjacent to their semantic target.
* **Correct**: `You successfully captured a **Ladybug** 🐞!`
* **Incorrect**: `🐞 | You successfully captured a **Ladybug**!`

### B. Balanced Data Separation
Financial state parameters (balances) and secondary status indicators must reside in the **embed footer** rather than the main description block to reduce screen real-estate usage.
* **Correct**: 
  * Description: `Daily reward claimed. **+250 ⌬** added to your balance.`
  * Footer: `Balance: 1,500 ⌬ · Streak: 5 days`
* **Incorrect**:
  * Description: `Daily reward claimed! You received **250 ⌬**.\nYour new balance is: **1500 ⌬**.`

### C. Markdown Restriction in Embed Headers
Embed author names and footer texts must remain plain text. Discord does not support markdown parsing (such as `**` or `_`) in headers and footers; inclusion of formatting tokens creates visible syntax bugs.
* **Correct**: `footer: { text: "Use /daily to claim your coins" }`
* **Incorrect**: `footer: { text: "Use **/daily** to claim your coins" }`
