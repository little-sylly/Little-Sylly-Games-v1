Markdown
# Little-Sylly-Games: Project Briefing & Brainstorming Snapshot
**Module:** Phase 27 Drawing Extension  
**Project Codename:** Shrinking  
**Current Tech Stack:** Vanilla JS PWA (HTML/Tailwind), Multiplayer State Machine via Firebase Free (Spark) Tier.

---

## 1. Architectural & Network Decisions

### Core Constraints & Framework
* **Network Paradigm:** **Finish-then-Push**. The drawing canvas operates entirely client-side in local browser memory. Data is only serialized and written to the database as a single atomic payload when the player clicks "Submit". There is **no** stroke-by-stroke real-time network streaming.
* **Database Selection:** **Firebase Realtime Database (RTDB)**. Firestore is explicitly ruled out due to its strict 20,000 daily write limit on the Spark tier, which would be rapidly exhausted by a high-velocity party game. 
* **Storage Guardrail:** Cloud Storage is unavailable. All drawing payloads must be stored as text strings directly within the RTDB schema while staying safely under the 10 GB/month egress cap.

### Technical Options Evaluation

#### **Option 1: Vector Coordinate Compression with Relative Delta Encoding (SELECTED)**
* **How it works:** Capture canvas cursor coordinates as a sequence array. Round coordinates to integers, strip JSON syntax, and flatten into a character-delimited string. Critically, use **relative delta encoding** (storing the difference between consecutive points, e.g., `12,45,s|+3,+3|+3,+2`) instead of absolute values.
* **Payload Size:** ~1 KB – 2 KB per drawing.
* **The Good:** Tiny data footprint; highly compatible with Spark tier. Enables a high-end client-side "live playback" animation loop using vanilla `ctx.lineTo()` at zero extra network cost.
* **The Bad:** Requires custom serialization/deserialization logic in vanilla JavaScript.

#### **Option 2: Native SVG Path Serialization (Runner-Up)**
* **How it works:** Map mouse/touch movements directly into browser-native SVG path string syntax (`<path d="M10..."/>`).
* **The Good:** Zero custom parsing engine needed. The receiving client injects the raw text straight into an innerHTML wrapper. Can be animated natively via CSS (`stroke-dasharray`).
* **The Bad:** String payloads are slightly larger than delta-encoded coordinates (2 KB – 3 KB).

#### **Option 3: Ultra-Low Res Monochrome Bitmaps**
* **How it works:** Downsample the canvas to a 64x64 pixel grid, convert to a 1-bit black-and-white map, and upscale on the client side using Tailwind's `image-rendering: pixelated`.
* **The Good:** Bulletproof efficiency (<1 KB).
* **The Bad:** Forces a highly specific, low-fi retro art style that may feel like a technical compromise rather than a deliberate design choice.

#### **Option 4: Unoptimised Base64 Data URL**
* **The Verdict:** **REJECTED**. Exporting raw PNG strings (50 KB – 150 KB+) poses an immediate, fatal threat to the free tier egress limits under normal party play.

---

## 2. Game Concept & Thematic Design

### Theme & Identity
* **Title:** *Shrinking*
* **Tagline:** *"A big list of problems. Shrinking down one by one."*
* **Inspiration:** Inspired by the tone of the Apple TV+ show *Shrinking*.
* **Core Context:** One or more players act as "Patients" assigned a digital "intake form" containing a list of psychological issues, phobias, or neuroses. They must sketch them out under a strict time limit (e.g., 30 seconds per prompt). The other players act as "Shrinks" diagnosing (guessing) the conditions.

### Gameplay Loop & Mechanics
* **Pacing Model (Simultaneous Input):** To eliminate the friction of a passive lobby waiting for one artist, the game utilizes **Simultaneous Patient Slots**. Every player acts as a Patient simultaneously, drawing their "Item 1" prompt at the same time. All drawings enter a global "Diagnosis Pool" for the room to guess on together before moving to "Item 2".
* **Scoring:** Mutual point allocation for both the Patient (artist) and the Shrink (guesser) upon successful diagnosis to reward clear visual communication.
* **Accessibility Guardrails:** All assigned disorders include brief text definitions/explanations on the artist's screen so players are never left frozen by an unfamiliar prompt.
* **Easy Mode Matching UI:** To eliminate mobile keyboard friction and spelling errors, the guessing UI displays 4 to 6 clickable "Diagnostic Cards" (one correct answer, several thematic decoys) instead of raw text inputs.

### Data Schema & Content Categorization
Prompts will be integrated into the existing `words.json` dictionary framework across three scannable, comedy-forward tiers:
1. **Everyday Neuroses (Easy):** *Insomnia, Road Rage, Caffeine Addiction, Workspace Anxiety.*
2. **Classic Phobias (Medium):** *Arachnophobia (spiders), Acrophobia (heights), Claustrophobia (spaces).*
3. **Pop-Culture & Complex Conditions (Hard):** *Imposter Syndrome, Déjà Vu, Split Personality, Existential Dread.*