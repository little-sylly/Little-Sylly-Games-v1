# Project Specification: Just Enough Cooks

**Tagline:** Won't Spoil the Broth!

---

## 1. Context & Theme
A culinary coordination game where players act as "Cooks" trying to assemble a perfect recipe. The core mechanic is **Social Sync** — finding the middle ground between being too obvious (overcrowding) and too obscure (outliers).

---

## 2. Core Gameplay (Base Mode)

### **The Game Loop**
1. **The Order:** A secret food item (e.g., **NACHOS**) is revealed to everyone.
2. **The Prep:** Every player secretly enters **3 ingredients**.
3. **The Sifting:** The engine calculates the frequency of every word.
4. **The Tally:**
    * **Golden Zone:** The "Sweet Spot." **+20 points** per word.
    * **Spoilt:** The "Basic" trap. **0 points** (Default).
    * **Rotten:** The "Odd One Out." **0 points** (Default).

### **The Scaling "Golden Zone" Logic**
The engine dynamically scales the "Spoilt" threshold based on the number of players ($N$).
* **Formula:** The Golden Zone starts at 2 matches. The upper limit is `Math.floor(N × 0.7)`.
* **4 Players:** 2–2 matches.
* **5 Players:** 2–3 matches.
* **6 Players:** 2–4 matches.

---

## 3. Sylly Mode: Kitchen Nightmares
An optional high-stakes mode for advanced play.

### **The Signature Dish (Multiplier)**
Before the reveal, flag **one** of your 3 words as your "Signature."
* **Golden:** Double points (+40).
* **Spoilt/Rotten:** High risk of penalty (if toggled on).

### **The Poison Word (Sabotage)**
Every player enters a **4th word** (The Poison).
* Any ingredient matching a Poison word is instantly **Spoilt**, regardless of its match count.
* Allows players to "kill" dominant ingredients to prevent others from scoring.

---

## 4. The Pantry Cabinet (Settings)
* **Chefs:** Set the number of players (Default: 5).
* **Rounds:** Set the number of dishes (Default: 5).
* **Rotten Penalty:** Toggle negative points for unique words (Default: Off / −10 pts).
* **Spoilt Penalty:** Toggle negative points for over-crowded words (Default: Off / −10 pts).
* **Sylly Mode:** Toggle "Kitchen Nightmares" mechanics.
* **Sous Chef Oversight:** A post-round review screen where players can manually vote to merge two similar words (e.g., "Prosciutto" and "Persciutto").

---

## 5. Technicals & Coding

### **Input Cleaning (The "Lenient Cook" Rule)**
We want to be as lenient as possible to encourage complex words without fear of typos.
* **Normalisation:** Use `.toLowerCase().trim()`.
* **Basic Plurals:** Automatically treat "Tomato" and "Tomatoes" as the same.
* **Manual Override:** Instead of complex fuzzy-matching, provide a "Sous Chef Oversight" button. If the group agrees two words were meant to be the same, the host can merge them before the final tally. This removes spelling anxiety around words like *prosciutto* or *bouillabaisse*.

### **Scaling Bucket Logic**
```javascript
function getIngredientStatus(input, wordFrequency, N) {
  const count = wordFrequency[input];
  if (count === 1) return 'Rotten';
  if (count >= 2 && count <= Math.floor(N * 0.7)) return 'Golden';
  return 'Spoilt';
}
```

---

## 6. Challenges & Considerations
**The Sync Gap:** If the group is too diverse, every word might be "Rotten."

**Solution:** Word lists are curated enough that common associations should naturally emerge. A practice round is recommended for new groups.

**Australian English:** The app defaults to AU spelling (e.g., "Chilli," "Organise") and metric units where applicable.

---

## 7. Thematic Glossary & UI Phrasing

### **Navigation & Buttons**
* **Start Game:** "Let's Cook!"
* **Join Lobby:** "Grab an Apron"
* **Player Lobby Screen:** "Kitchen Roster"
* **Settings Menu:** "The Pantry Cabinet"
* **Submit Words:** "Serve it Up!"
* **Next Round:** "Next Course"
* **Game Over/Leaderboard:** "The Final Wash-up"
* **Exit Game:** "Kitchen Closed"

### **Gameplay & Prompts**
* **Secret Word Label:** "Today's Order:"
* **Ingredient Entry Header:** "Prep your Ingredients!"
* **Signature Dish Prompt (Sylly Mode):** "Choose your Speciality!"
* **Poison Word Prompt (Sylly Mode):** "Add a dash of Sabotage..."
* **Wait State (Others Typing):** "The broth is simmering..."
* **Wait State (Sifting Results):** "Letting the flavours develop..."

### **Result State Headers (The Broth Status)**
* **Golden (2–N×0.7 Matches):** "Chef's Kiss!" or "Spot On!"
* **Spoilt (too many Matches):** "Too Many Cooks!" or "Overpowered!"
* **Rotten (1 Match):** "A Bit Pongy!" or "The Odd One Out."
* **Poisoned (Sabotage):** "Kitchen Nightmare!" or "Sabotaged!"

### **Thematic Feedback & System Messages**
* **Sous Chef Oversight Header:** "Sous Chef Oversight: Are these the same?"
* **Low Round Score:** "Maybe stick to toast next time."
* **High Round Score:** "Five-star effort right there!"
* **Perfect Round (All 3 Golden):** "Head Chef Status: Absolutely Cookin'!"
* **Tie Breaker:** "A dead heat in the kitchen!"

### **Visual Styling Cues**
* **Golden:** Warm gold/yellow (Premium feel).
* **Spoilt:** Dull grey/brown (Overcooked look).
* **Rotten:** Sickly green (The "Bin" look).
* **Poisoned:** Neon purple or toxic pink (Sabotage vibe).

> When generating UI text or system alerts, refer to this Thematic Glossary. Use Australian English (e.g., "Flavours", "Organise") and ensure the tone remains cheeky but clear.

---

## 8. How to Play

1. **Get the Order** — Everyone sees the same secret food (e.g., "Pizza").
2. **Prep your Ingredients** — Secretly type 3 words you associate with that food.
3. **Find the Golden Zone** — You score if your word matches with at least one other player, but not too many.
4. **Avoid the Crowd** — If too many people pick the same word, it's "Spoilt" — 0 points.
5. **Avoid the Bin** — If you're the only one who picked a word, it's "Rotten" — 0 points.
6. **Win the Shift** — The Chef with the most points after all Meals wins!

**Sylly Mode bonus:** Flag one word as your Signature Dish for double points — or add a Poison Word to sabotage a rival's sure-thing ingredient.

---

## 9. UI Flow (Screen Map)

Follows the standard Little Sylly sequence: Lobby → Game Menu → Setup → Gameplay Loop → Results.

| Screen ID      | Display Name            | Navigation                              |
|----------------|-------------------------|-----------------------------------------|
| `screen-lobby` | The Box (shared)        | Entry point                             |
| `jec-menu`     | Just Enough Cooks Menu  | Lobby card → here                       |
| `jec-roster`   | Kitchen Roster          | "Let's Cook!" → here                    |
| `jec-order`    | Today's Order           | After roster confirm                    |
| `jec-prep`     | Prep your Ingredients!  | After secret word reveal                |
| `jec-sign`     | Choose your Speciality! | Sylly Mode only — after Prep            |
| `jec-sifting`  | The Sifting             | After all players submit                |
| `jec-tally`    | Round Score             | After sifting                           |
| `jec-washup`   | The Final Wash-up       | After final round tally                 |

**Round loop:** `jec-order` → `jec-prep` → [`jec-sign`] → `jec-sifting` → `jec-tally` → repeat or `jec-washup`

**Exit rules (standard):**
- Pre-game screens (menu, roster) → ✕ returns to `jec-menu` or `screen-lobby`
- Mid-game (order, prep, sifting, tally) → ✕ opens quit-confirm modal (Pattern 2)
- Post-game (washup) → ✕ calls `resetToLobby()`

**Key file:** `js/games/jec.js`

---

## 10. Technical Notes (Architecture)

- **Word normalisation:** Reuse `gmNormaliseWord` pattern from `great-minds.js` for plural stripping (Tomato/Tomatoes).
- **Sous Chef Oversight (Manual Match):** Decision modal (Pattern 2) — host taps two matching words to merge before final tally.
- **Frequency map:** Built client-side after all inputs collected: `Object.entries(wordFrequency)`.
- **State prefix:** `jec` — e.g., `jecPlayerNames`, `jecRound`, `jecInputs`, `jecWordFrequency`.
- **Sylly Mode flag:** `jecKitchenNightmares` (bool) — derived at runtime, never stored in data.
- **All screen IDs must be added to `allScreens[]` in `engine.js`.**
- **SW:** Bump `CACHE_NAME` to v57 when `js/games/jec.js` is created and added to the precache list.
