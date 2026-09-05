### Overall Balance Review

The core structure of *Pecking Order* is remarkably solid, and the math holds up beautifully. It is absolutely in a playable state and ready for the build. The shedding asymmetry, where the Leader dictates width but not throughput, ensures that the game won't violently snowball.

The most crucial fix was the adjustment to the Eagle and Poacher counts:

* **The Premium Card Economy:** Dropping Eagles to **1.5n** and scaling Poachers to **`n`** (One Each) perfectly rebalances the game. It reduces the probability of a hand holding an Eagle from 57% to 40% and nearly doubles the counter-to-Eagle ratio. Eagles will now decide roughly 2 out of 8 Encounters, making them a powerful tool rather than an automatic win.


* **The Dead Weight Tension:** Leaving Mouse and Fish as 4n (roughly 22% of the pool) is an excellent shedding mechanic. Because they can only be shed via a Stake or Stampede, players are forced to aggressively fight for Unchallenged status.



You are definitely not far from a balanced game; the foundation is validated, and any further adjustments can be made safely in `data/pko-data.json` after early playtesting.

---

### Suggestions for §16 Open Questions

**Q1: What is a Poacher once it's on the board?**

* **Recommendation:** **Option (a) — It stays as an unbeatable Mark.**
* **Reasoning:** With the Poacher copy count reduced to strictly `n` (default One Each), it is a rare and powerful play. Thematically, the Poacher "answers to no one". Allowing it to stay on the board as an unbeatable Mark creates a definitive, dramatic "mic drop" moment that effectively ends that Encounter, rewarding the player who perfectly timed their wildcard. Option (b) would shrink the board and unpredictably change the core math of Encounters, while Option (c) undermines the Poacher's unique identity.



**Q4: Challenge Builder UX — Screen vs. Overlay**

* **Recommendation:** **Overlay (Bottom Sheet/Modal).**
* **Reasoning:** The Challenge builder needs to keep the active Marks and the Hoard visually connected in the same context. A full screen swap might feel too jarring and disconnect the player from the central "table" action. The layout detailed in §15 works perfectly as an overlay sitting just above the Hoard.



**Q5: Skin Selector UI Location**

* **Recommendation:** **Lobby Host Screen & Player Setup.**
* **Reasoning:** For a seamless UX, players should choose their preferred skin during Player Setup or in the Lobby before the Match starts. Since skin selection is a display layer only and mixed-skin multiplayer is supported, allowing each player to select this before they "Enter the Wild" is the most frictionless approach.



**Q6: Sound Design Constraints — Which unbuildable audio moments to keep vs. cut**

* **Recommendation:** **Pivot to synth-friendly abstract textures; cut the hyper-realistic samples.**
* **Reasoning:** Web Audio API synthesis is a hard constraint for the suite. Rather than faking literal animal noises, we should lean into abstract audio cues:


* *Stampede:* Layered sub-bass swell with a noise burst.


* *Unchallenged:* A rising three-note synth brass sting.


* *Retreat:* A short descending filtered whoosh.


* *Clash Win:* A deepened, heavier version of the existing `playSuccess` chord rather than a literal roar.


* *Phase 2 Audio (Dark Forest, Carrion):* Cut or simplify to a low drone and a granular noise tick.





**Q7: Sylly Mode Toggle in v1 — Keep vs. Omit**

* **Recommendation:** **Keep the toggle, but lock it.**
* **Reasoning:** Leaving it out breaks the "every game has a Sylly Mode card" standard in the suite. By keeping the toggle visible but disabled (or rendering a "Force of Nature arrives in Phase 2" toast when tapped), we build anticipation without breaking UI conventions or releasing untested rule mutations.



---

### Confirming the Nine §17 Deviations

* **Confirmed:** I fully sign off on all nine deviations logged in the Stage 2 technical spec.


* **Special Note on D9:** Dropping the Hoard Size 20 option was absolutely the right call. A 20-card Hoard paired with 7 Clashes would stretch the game to two hours, far outside the targeted 25–35 minute playtime. Capping the maximum at 15 keeps the pacing tight and the maximum game time within the suite's normal bounds.



Are you ready to lock the Stage 2 spec and move into Protocol B Step 1 (skeleton and routing), or would you like to debate the Poacher board-state ruling first?