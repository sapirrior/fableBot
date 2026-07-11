# Fable Bot — Text Styling Standards (The Swarm Terminal - OwO Style)

This document defines the formal text styling guidelines for Fable Bot. All command responses, error messages, and embeds must adhere to these rules to maintain a cohesive, cyberpunk-inspired terminal aesthetic.

---

## 1. Core Structural Layout

Every response follows this primary pattern:
```
STATUS_EMOJI **::** **Username**, Message content about `species_id` or action.
> Secondary line 1
```

### 1.1 Status Emojis
All main responses must begin with a theme-appropriate emoji (without brackets):
* `⌬` : General Colony Actions / Level ups
* `💵` : Money transactions / Balance / Selling
* `📆` : Daily claims
* `💸` : Transferring funds
* `📖` : Lists / Dex browsing
* `⏳` : Cooldown warnings
* `❌` : Failure / Errors

### 1.2 Separator (`**::**`)
The status emoji and main text body are separated by a double colon in bold `**::**` with single spaces on either side.

### 1.3 Indents / Secondary Info (`>`)
If a command returns multiple lines of information, secondary lines must be indented using a greater-than symbol `>` followed by a space.

### 1.4 Highlights
* **Usernames:** Always styled in bold (`**username**`).
* **Insect Species:** Always styled in monospace lowercase code blocks (`` `species_id` ``).
* **Numeric Values / XP / Money:** Always styled in bold (`**value**`).

---

## 2. Command Reference Style Guide

### 2.1 Balance Command
```
💵 **::** **sapirrior**, You currently have **150** Fables.
```

### 2.2 Daily Command
```
📆 **::** **sapirrior**, You claimed your daily reward and received **250** Fables!
```

### 2.3 Give Command
```
💸 **::** **sapirrior**, Successfully transferred **100** Fables to **target_user**!
```

### 2.4 Catch Command
```
⌬ **::** **sapirrior** went hunting in the colony and caught a `beetle` 🪲!
> **+15 XP** generated!
```

### 2.5 Sell Command
```
💵 **::** **sapirrior**, Successfully sold **5x** `ant` 🐜!
> **+50 Fables** generated!
```

### 2.6 Release Command
```
⌬ **::** **sapirrior**, Successfully released **1x** `scorpion` 🦂 back into the wild.
```

### 2.7 Profile Command (Embed Description)
```
⌬ **::** **sapirrior**'s Colony Profile
==================================
Level: **5**
Experience: `45 / 350 XP`
Colony Balance: **1,250** Fables
Collection size: **42** insects
```

### 2.8 Cooldown Message
```
⏳ **::** **sapirrior**, System throttle active!
> Please wait **8.5s** before querying this node again.
```
