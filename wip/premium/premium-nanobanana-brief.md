# Premium Lobby — image-mockup brief for Gemini (Nano Banana)

**Written for: an image-generation model, pasted by the owner. 17 Sep 2026 (rev 2).**

Nano Banana cannot read this repo, so everything below is self-contained prose — no file paths,
no code, nothing it would have to look up. Part 1 is context to paste once. Part 5 holds
ready-to-paste prompts, one per concept, each complete on its own.

**What this round is for:** cheap, broad visual exploration of the **Premium** lobby before
spending Fable credits on the real brainstorm. Expect *directions and atmosphere*, not usable
layouts — an image model will garble UI text and invent geometry. Judge these on whether a room
full of people would lean forward, not on whether the buttons are in the right place.

**Rev 2 changes everything structurally.** Round 1 offered eight unrelated worlds. The owner's
answer was clearer than that: there is **one world — a family lounge** — and the only real
variable is *what holds the games at centre stage*. So the lounge is now a fixed stage described
once, and the concepts are containers inside it.

---

## 1. The idea, in one paragraph

**You are a guest in Little Sylly's lounge room on game night.** Not a menu, not a storefront —
someone's actual living room, the kind where board games get played on the coffee table. The TV
is on. There's a shelf with a few odd, handmade-looking trinkets on it. A soft pastel controller
is resting on the arm of the couch, waiting for you to pick it up. And somewhere in the middle
of the room is the thing holding twenty games, which is what you're here to choose from.

**Whose lounge it is matters, and this is a real decision.** If it's *the player's* lounge, the
trinkets on the shelf are strange — they're the studio's work, not theirs. If it's **Sylly's
lounge and the player is visiting**, everything lands: the trinkets belong there, the controller
has been handed to you, and a box of games on the table is exactly what game night at a friend's
place looks like. It also gives the brand a *home* instead of a logo. **The prompts below assume
the guest framing.** Worth confirming in the Fable round, because it decides a lot downstream.

---

## 2. The context block — paste this once at the start of a Gemini session

> I'm designing the "Premium" home screen for **Little Sylly Games**, a browser-based suite of
> 20 party games for people in the same room. Everyone plays together on one screen — some games
> pass a single phone around, most use each player's phone as a controller. It's warm, playful
> and tactile: moulded plastic toys, not flat minimalism, and definitely not a dark neon gamer
> aesthetic.
>
> The app already has three finished home screens that are deliberately practical — lists,
> shelves and tiles. **Premium is the opposite brief: it is the showpiece.** It's a real-time 3D
> scene (WebGL) rendered live in the page.
>
> **The setting is always the same: a family lounge room on game night**, seen as if you've just
> walked in as a guest. A TV, a coffee table, a couch, a shelf. Warm, lived-in, late afternoon.
> The games are physical objects in that room, and you browse them by moving something.
>
> **The visual language, which is fixed:**
> - Type is Fredoka — rounded, friendly, a single family. Headings in a deep plum `#2B1B45`.
> - Ground is warm off-white `#FAFAF9`. Accent is a hot bubblegum pink `#E9408E`.
> - Buttons are **moulded glossy keycaps** — inflated, candy-like, with a bright specular crown,
>   a darker moulded bezel and a 3D drop, like a premium keyboard key or a gel capsule.
> - Each of the twenty games owns one saturated brand colour: hot pink, violet, teal, amber, red,
>   lime, cyan, sage, chocolate brown, glacier blue, honey gold, rust orange, and so on.
>
> **The hero object is the player's controller.** A soft, inflated, pastel 3D game controller
> with rounded **bear ears** — squeezable, toy-like, matte soft-touch plastic with glossy candy
> buttons. Every player recolours their own and sticks stickers on it. It is the player's avatar
> and the most distinctive thing the product owns.
>
> **The game art:** every game has a **die-cut sticker** — a watercolour illustration with a
> white cut border on a transparent background. A cookie, a penguin holding an ice block, a bee
> on a honeycomb, a lion's head, an elephant, a sleeping sheep, a pink speech bubble with a star,
> a rainbow banana, a brain with rainbow arcs, a hooded figure holding cards. Irregular, never
> square, and allowed to tilt, overlap and break out of whatever holds them.
>
> **Fidelity:** physically-based real-time rendering — filmic tone mapping, a warm key light with
> a cool fill, true contact shadows, real materials (soft-touch plastic, matte card stock, light
> birch ply, brushed chrome, a warm lamp). High-end product configurator, not stylised cartoon.
>
> Reply "ready" and I'll send concepts one at a time.

---

## 3. The stage — three planes, constant in every concept

This is the composition rule, and it is the design. Parallax between three planes is the
cheapest "alive" available in real-time 3D, and it costs nothing when frozen.

| Plane | What's there | Treatment |
|---|---|---|
| **Back** | The lounge itself — TV glowing, a shelf holding a few handmade trinkets, and among them **a small photo-carousel lamp slowly rotating** | **Defocused.** Recognisable, never legible. This is what says the room belongs to someone |
| **Mid** | **The container holding the twenty games.** The hero | **Sharp, lit, centre stage.** The only thing that changes between concepts |
| **Front** | **The player's controller**, resting on the arm of the couch or the table edge, waiting to be picked up | **Near and soft**, off to one side. Partly out of frame is fine — it reads as *yours*, within reach |

**On the rotating lamp in the back:** it's one of the studio's other pieces, sitting in the room
as a trinket. Defocused, it reads as *a thing someone made* rather than as a feature — which is
exactly the right weight. Say **"a small rotating photo-carousel lamp, heavily defocused"** and
nothing more; describing it in detail pulls focus it shouldn't have.

**On the controller in front:** it is the inspiration for this whole layout, so it gets presence
without getting the stage. Resting, not floating. Never centred, never hero — the moment it takes
centre frame the room stops being a room and becomes a product shot.

---

## 4. How the games "come to life" — read this before prompting

This is the part an image model will get wrong by default, so it needs stating as a hard
negative.

**Life means motion, weight and light. It does not mean faces.** A box tilts out of the shelf and
settles. A cartridge rises and catches the key light along its edge. A sticker's corner lifts
slightly. The stack shifts when one is pulled. Things have mass, momentum, and a beat of
anticipation before they move.

**No anthropomorphism.** Nothing has eyes, a mouth, arms, legs or a face. The cookie is a cookie.
The penguin is an illustration printed on a box, not a character standing in the room. Append
this line to every prompt:

```
The game boxes and objects are inert physical props — no faces, no eyes, no arms or legs,
nothing cartoonishly alive. Any sense of life comes only from weight, motion, light and shadow.
```

Nano Banana will otherwise cheerfully give a box googly eyes, and once one generation does it the
session tends to keep doing it.

---

## 5. The base prompt

Keep paragraphs 1 and 2 verbatim; swap the SCENE line per concept.

```
Photorealistic real-time 3D web app home screen, rendered like a high-end product
configurator: filmic tone mapping, soft warm key light, cool blue-grey fill, true contact
shadows, shallow depth of field. Real materials — moulded soft-touch plastic, matte card
stock, light birch ply, brushed chrome. Warm, tactile, toy-like and premium. Palette: warm
off-white #FAFAF9, deep plum #2B1B45, hot pink accent #E9408E, saturated toy colours. Rounded
friendly geometry. Not flat minimalism, not dark-mode gamer UI, no neon, no RGB.

SETTING: a lived-in family lounge room on game night, late afternoon light. In the defocused
background: a glowing TV, a shelf of small handmade trinkets, and a small rotating
photo-carousel lamp, heavily blurred. In the soft foreground to one side: a pastel game
controller with rounded bear ears resting on the arm of a couch, waiting to be picked up.

SCENE (sharp, centre stage): [the container]

The game boxes and objects are inert physical props — no faces, no eyes, no arms or legs,
nothing cartoonishly alive. Any sense of life comes only from weight, motion, light and shadow.

UI: minimal floating interface — a short plum heading and one glossy moulded keycap button.
Keep on-screen text to a few short words.

16:9 widescreen, 1280x720 feel.
```

**On text:** image models garble UI copy. Ask for *few* words and treat whatever returns as
placeholder. Real strings get set in code later.

---

## 6. The six containers

Your three ideas are 1–3. The rest are adjacent containers that fit the same room, so the sheet
has breadth without leaving the world.

### 1 · The Cabinet

*Bet: the games are behind doors, and opening them is the moment.*

> SCENE (sharp, centre stage): a pastel display cabinet standing against the lounge wall, its two
> glass doors swinging open toward the viewer. Inside, on three softly lit birch shelves, sit
> twenty small game boxes in different saturated colours, each with a die-cut watercolour sticker
> on its face. Warm light spills out of the cabinet across the floorboards. The cabinet is
> rounded and toy-like — moulded plastic and light wood, a premium child's display case, not an
> antique curio. One box on the middle shelf is tilted forward and lit brighter than the rest.

**Look for:** whether "open the doors" reads instantly, and whether twenty boxes at readable size
fit without becoming a wall of stamps.

---

### 2 · The Carousel on the Table

*Bet: flipping through is the most satisfying verb available — and it rhymes with the lamp
behind it, which makes the room feel like one person made everything in it.*

> SCENE (sharp, centre stage): a rotating vertical rack on the coffee table, holding twenty
> chunky game cartridges like a jukebox mechanism or a rotating postcard stand, on a turned birch
> base. Each cartridge is a moulded soft-touch plastic shell in its own saturated colour with a
> white label carrying a die-cut watercolour sticker. The rack is caught mid-spin — cartridges
> nearest the camera sharp, the ones rotating away motion-blurred. One cartridge has risen up out
> of the rack and hovers slightly forward, lit brighter, casting a soft shadow back onto the
> others.

**Look for:** the deliberate echo between this and the lamp in the background — same mechanism,
different scale. If that reads, the room gains a designer. Also: is twenty "satisfying to flip"
or "a chore"?

---

### 3 · Pulling One Off the Shelf

*Bet: the hand is the interface. The most physical of the three.*

> SCENE (sharp, centre stage): the lounge's own shelf, filled with twenty upright game boxes seen
> close and slightly from below. Matte card stock with soft worn edges and visible board
> thickness, each in its own saturated colour with a die-cut watercolour sticker on the spine and
> face. One box in the middle has been pulled halfway out toward the viewer, tilted, catching the
> key light, its neighbours leaning into the gap it left. The boxes look genuinely handled, not
> shrink-wrapped.

**Look for:** whether "one is pulled out" carries the entire selection state with no UI at all.
Most likely to feel alive; most likely to break at twenty.

---

### 4 · Back to the Box

*Bet: your app already says "← Back to the Box" on every screen. Make the box real.*

> SCENE (sharp, centre stage): a large rounded pastel toy chest sitting on the lounge rug, lid
> lifted and tilted back, warm light pouring out from inside. Twenty small game boxes and die-cut
> watercolour stickers rise gently out of the open chest in a loose spiral, weightless, each lit
> from the glow below.

**Look for:** the only concept that arrives with its copy already written. If it lands visually,
the metaphor, the back button and the brand voice all agree at once.

---

### 5 · The Coffee Table

*Bet: show the surface the games are actually played on.*

> SCENE (sharp, centre stage): the lounge coffee table seen from above and slightly tilted, with
> twenty game boxes fanned across it in a wide arc like an oversized hand of cards. Matte card
> stock, each in its own saturated colour with a die-cut watercolour sticker on its face. One box
> near the centre has lifted off the table and hovers, tilted toward the viewer, casting a soft
> shadow on the fan below. Two mugs and a bowl of snacks at the table's edge.

**Look for:** the only container that shows all twenty at once with each still readable. Least
novel, most likely to actually work.

---

### 6 · The Controller's Room

*Bet: the object that inspired this gets the frame — once — so you can see what's lost and gained.*

> SCENE: break the three-plane rule for this one. A large soft pastel game controller with
> rounded bear ears sits in the near foreground on the coffee table, sharp and hero-lit,
> occupying the lower third. Behind it, softly defocused, the lounge: a glowing TV, the shelf of
> trinkets, the rotating lamp, and a low stack of twenty colourful game boxes. A few die-cut
> watercolour stickers are already stuck on the controller's shell and ears.

**Look for:** this inverts the hierarchy deliberately. It's the one that survives a phone screen
best — a single centred object crops where a room does not.

---

### Wildcard · The Claw Machine

*Bet: worth one generation purely for contrast. It abandons the lounge, and seeing why is useful.*

> SCENE: a pastel arcade claw machine, glass cabinet full of twenty colourful game boxes and
> plush die-cut shapes piled at the bottom, chrome claw descending toward one bright box near the
> centre. Moulded rounded plastic in soft mint and cream with hot pink trim, warmly lit from
> inside. Boutique toy, not grimy arcade. Plain warm off-white surround — no lounge.

**Look for:** whether randomness reads as *fun* or *loss of control*. You already ship a "Random
Game" button; this is that button as an entire layout.

---

## 7. The tension to watch

**A full lounge, twenty readable games, a controller and a lamp is a lot for one 1280×720
frame.** The likely failure is that the room wins and the games — the actual functional content —
end up as small coloured rectangles. Watch for it in every generation.

Two ways out, both worth generating:

- **The push-in.** The lounge is an *establishing shot* that the camera moves through on load,
  settling close on the container. The room is felt at the edges rather than surveyed. Add:
  *"camera pushed in close on the container, the room falling away soft at the frame edges."*
- **The corner.** The container sits in the near third and the lounge occupies the rest, rather
  than the container floating in the middle of a wide room. Add: *"container large in the left
  two thirds, the room receding to the right."*

If the wide establishing version never resolves, that's a real finding — it means Premium is a
close-up layout with a suggested room, not a room you look at.

---

## 8. The trinket shelf — a note for the Fable round, not for Gemini

The shelf is doing more work than set dressing, and there are **two different features competing
for it**:

1. **The studio's accomplishments** — the lamp and whatever else Little Sylly has made. This is
   brand-building: the lobby becomes a portfolio without ever announcing itself as one. It's what
   you described, and the guest framing (§ 1) is what makes it not-weird.
2. **The player's achievements** — which already have a planned home elsewhere (an achievements
   surface, with the idea that they'd attach to the player's controller naturally).

Both want a shelf in a lounge. They can co-exist — *their* trophies on the controller, *your*
work on the shelf — but that should be a decision rather than an accident, because if player
achievements ever land on the same shelf, the studio's pieces stop reading as the studio's.

Not something the image round needs to resolve. Flagging it so it reaches the brainstorm.

---

## 9. Attach these reference images — this matters more than the wording

Nano Banana is an *editing* model. Given references it holds style; given none it invents.
Upload these with the first prompt and say **"match the materials, lighting and palette of these
references."**

| Attach | Why it earns its slot |
|---|---|
| **A clean render of the bear-eared controller** | **Now the most important one.** It's the inspiration for the layout and the object most likely to drift off-model |
| The 20-sticker contact sheet | The real art layer, all twenty, on their brand colours |
| The shipped phone lobby screenshot | The glossy keycaps, the domed discs, the wordmark, the controller in situ |
| The photo-carousel lamp render ⚠️ | Sets the real-time 3D fidelity bar: filmic exposure, birch base, warm bulb, studio backdrop. **⚠️ It renders your family photos on the panels** — crop to the base and frame, or swap in placeholders, before uploading to a third-party service. In the scene itself this solves itself: defocused in the background, no photo is legible |

If Gemini drifts off-palette, re-attach and say *"keep the warm off-white and plum ink; remove
any black or neon."* Drift toward dark-mode gamer UI is the most likely failure.

---

## 10. Phone

Widescreen first, deliberately. A room is a widescreen idea, and your own read is right: the
shiny things get hard on mobile.

Once one or two containers survive, re-prompt **those only** with the scene unchanged and this
swapped in:

```
COMPOSITION: vertical phone screen, 9:19.5 portrait. One object hero-centred and large, the
room falling away soft behind it and out of frame. Interface is a single column: heading at the
top, the 3D scene filling the middle two thirds, one glossy moulded keycap button at the bottom
in easy thumb reach.
```

**Concept 6 (the controller) and concept 2 (the carousel) are the two that survive portrait** —
both are one centred object. The cabinet, the shelf and the coffee table are horizontal ideas and
will fight the crop.

The real mobile question isn't visual, it's a product call for the Fable round: **does Premium
simply not offer itself on a phone that can't hold the frame rate?** A layout switcher that
honestly says "this one needs a bigger screen" is legitimate, and you already ship exactly that
pattern — the wide layout has an eligibility floor and explains itself below it.

---

## 11. Touchstones, if a concept stalls

Add one line — *"in the spirit of X"* — only when a generation is drifting. Naming several at
once produces mush.

| Touchstone | What to borrow |
|---|---|
| **Animal Crossing** interiors | **The closest fit now.** Warm miniature rooms, soft light, how a space feels inhabited |
| **Astro's Playroom** (PS5) | Toy-plastic PBR done properly at real-time fidelity — the closest existing reference for the materials |
| **Jackbox Party Pack** menus | The boxes-on-a-shelf idea and the confidence of a big friendly hub. Stylised 2D — borrow the *shape*, not the finish |
| **Nintendo Switch** cartridge cases | Chunky physical objects with beautiful labels; the satisfaction of a small solid thing |
| **Apple TV / tvOS** parallax posters | Restrained depth and focus as the entire selection language |
| **A jukebox or rotating postcard stand** | The flip-through verb, mechanical and satisfying |

**Avoid naming:** Steam, Xbox dashboard, Discord, "cyberpunk", "neon", "RGB". One stray mention
and the palette goes dark and it stops looking like this product.

---

## 12. How to judge what comes back

1. **Frozen test.** Every animation removed — does the still frame still feel like a place?
2. **Ninety seconds.** Five people, one deciding, four talking over them. Does this get them into
   a game faster than a list would, or is it a beautiful obstacle?
3. **Twenty, not six.** Several of these look wonderful with six objects. Count them.
4. **Whose room is it?** Does the guest framing read, or does it just look like stock furniture?
5. **Same family.** Could it sit beside the existing phone lobby without looking like a different
   app?
6. **Buildable in a browser.** You've shipped a real-time 3D controller and the lamp configurator
   already, so the bar is "like those", not "like a pre-rendered film".

Bring the two or three that survive into the Fable round. That's where layout, state and the real
strings get decided — this round only has to answer *which room, and what's in the middle of it*.
