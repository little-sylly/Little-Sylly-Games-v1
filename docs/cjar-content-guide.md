# Cookie Jar — Content Guide

**Applies to:** `data/cjar-data.json` — the `family[].warn` / `family[].bust` flavour
pools and the `treats[].name` list. Nothing else in the file is content; the values,
tiers and schedules are balance and are governed by the tech spec, not by this guide.

## The voice

Before dinner, in a kitchen, with people who love each other. **Playful, never
genuinely scary.** The worst outcome in Cookie Jar is that the jar goes on top of
the fridge — not that anyone is in real trouble. If a line would land badly read
aloud to an eight-year-old, it is wrong for this game.

- **Australian English, always.** "Mum", never "Mom". No "color"/"flavor"/"organize".
  Metric only. The verification harness asserts this and will fail the build.
- **Short.** One line, spoken. Most are under nine words. They are read off a phone
  in the middle of a turn, not studied.
- **In character, not narrated** — except the Dog, which is the one archetype that
  gets described rather than quoted, because it does not speak.

## The two pools, and why they differ

| Pool | When it fires | Register |
|---|---|---|
| `warn` | The **first** appearance of that family member this Raid | A near miss. Suspicion, not proof. Tension rising. |
| `bust` | The **second** — the Raid ends, BUSTED! | Caught. Consequence lands. Still funny, still warm. |

A `warn` line must never sound like a `bust`: if it reads as *"you have been caught"*
it spoils the second card's job. Warns hint; busts confirm.

## Minimum counts

**≥4 warn and ≥4 bust per archetype**, all distinct within their pool. Lines are drawn
without replacement within a Raid, so four is the floor at which a 5-Raid match does
not repeat itself every time. More is better; the harness enforces the floor.

## The five archetypes

| id | Name | Personality brief |
|---|---|---|
| `mum` | Mum | The authority. Knows before she sees. Warm but final. Consequences are logistical — the jar moves. |
| `dad` | Dad | Complicit, amused, still enforcing. Calls you "mate". Would probably have one himself. |
| `big` | Big Brother | Not an authority — a *threat*. Enjoys this. His power is that he'll tell, and he will. |
| `grandma` | Grandma | Indulgent and completely unbothered by the rules — but she'll mention it to your mother. Her consequence is being sat down and fussed over, not told off. |
| `pet` | The Dog | Described, never quoted. Escalates by accident. Every bust line is the dog causing a scene that summons a human. |

**On Grandma:** the spec's fifth archetype was originally a Little Brother. It became
Grandma during the build (2 Aug 2026) because usable card art of young children could
not be generated. The swap is cosmetic — `copies` stays at 3 and no mechanic keys off
the archetype's identity — but the *voice* is genuinely different and must not be
written as a re-skinned younger sibling. Grandma is not trying to catch you. She has
simply appeared, she is delighted, and she is going to make this take much longer than
you wanted. Her busts should feel like affection you cannot escape.

## Treat names

Real, specific, slightly aspirational biscuits — the ones that are *not* the everyday
jar. Three at 5 points (`special`), two at 10 (`super`). Names are proper nouns and
title-cased. Keep them concrete: "French Macarons" beats "Fancy Biscuits".

## Adding an expansion pack

`cjarApplyExpansionOverrides()` runs at the top of `cjarStartMatch()`. Cookie Jar's
content is a fixed deck, not a word pool, so the practical override surface is **the
flavour pools and treat names only** — a themed pack can re-voice the whole family
without touching a single number. There is no pool-refill path, and an override must
never change `cookieValues`, `copies`, `points` or `treatSchedule`.
