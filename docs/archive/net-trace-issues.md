## Building
It is not just a 18x18 movement grid, its a 18x18 building grid. for clarify lets just call it as it is 18x18
Settings now at 16x16, 18x18, 20x20
Let me illustrate you an example

ABC123
DEF456
GHI789

In our version we can only build a block of ABDE, C1F4, 2356
However in mazing.game you can build ABDE, BCEF, C1F4, 2356, DEGH, EFHI, F417, 4578, 5689

## Pathing and Playback
absolutely doesnt look natural to me. 
i feel like our "runner" needs a width or hitbox, and it should be equal to half the length of a unit square.
that way for corners it must run parallel against the side of an edge then 90 degree turn - which will cause that turn rate.

needs to show the ingress and egress, lets actually change them from arrows and instead a colored rectangle along the squares edge
of where it would be. have rectangle overlap in a way that the squares edge would cut it (underneath-rectangle ontop) in half along 
the rectangle's length. 

## Style
We definitely need to fix the styling however right now lets start with the janky feeling of its run.
lets smooth it out and make it one continuous movement. 
While we're at it lets change the "head" to be flashing+pulsing dot like a signal ping 
(make the current dot head (core) smaller and have the flashing+pulsing emit to its *hidden* hitbox which is again half the length of a unit square.
While we're at it, let's also change the trailing line to be blue and fades (transparency) the further away it is from the core 
(not geometric distance, length-wise, but never becomes invisible. so basically the tail end at the ingress point would be like 20% opacity and 
the section immediately connecting the core will be at 100%. you can choose whether its a gradient along its length or sectioned - like each 20% or something

## Honeypot
should only pulse once and once the core is "hit" or the slow status is applied lets have the core change color.
Lets have the color be the color when you add Red to Fusha. same with the trailing line colour should be result of Fusha + Blue.

The Visualised Layout LogicArbitrary 2×2 Placement: The entire board is a flat coordinate system of single tiles. 
When you build a block, you are choosing a single coordinate as the top-left anchor. The block simply occupies a 2×2 footprint from that anchor point.
Creating 1-Tile Corridors: Because you can anchor a block at any single tile, you can place one block at column 1 (occupying columns 1 and 2) and another block at column 4 (occupying columns 4 and 5). 
This leaves column 3 completely open, creating the exact 1-tile-wide corridors shown in your yellow diagram.
The Hitbox and Turn MechanicsNatural Wall Hugging: Because a corridor can be exactly 1 tile wide, giving our runner a physical width/hitbox of half a unit square ($0.5$ tiles) means it has a $0.25$ clearance buffer on either side.
The Turn Rate Delay: When navigating a tight corner, the runner's $0.5$ hitbox forces it to travel completely parallel against the edge of the blocking tile until its entire body clears the collision boundary, before executing the 90-degree turn. 
This completely eliminates the need for artificial "turn latency timers"—the physical geometry creates the delay naturally.


## 1. Unified Grid & Placement Freedom
- **The Matrix:** A single, flat grid system based on user settings: 16×16, 18×18, or 20×20 tiles.
- **Block Footprint:** All placed structures (Firewalls/Honeypots) are 2×2 tiles in size.
- **Placement Snapping:** Blocks snap to single-tile increments (1-tile resolution). They can be placed at any valid integer coordinate (x, y), allowing players to shift blocks by a single tile to create tight, 1-tile-wide corridors.

## 2. Runner Geometry & Movement
- **Runner Size:** The core runner has a physical hitbox width equal to half a unit square (0.5 tiles).
- **Pathing Engine:** Smooth, continuous vector pathfinding calculated directly on the unified grid. The runner hugs the walls and must clear tile corners geometrically based on its 0.5 width, naturally creating a realistic turn-rate delay at corners.
- **Perimeter Ports:** Ingress and egress points are rendered as coloured rectangles along the outer grid border, positioned on top so the border line cuts the rectangle exactly in half along its length.

## 3. Honeypot AoE Calibration
- **Origin:** The Area of Effect radiates from the exact dead centre of the 2×2 block.
- **Range:** Extends outward by exactly 3 corner-to-corner diagonal steps of a single unit square.
- **Radius Formula:** R = 3 × √2 ≈ 4.2426 tiles.
- **Engine Check:** (dx * dx) + (dy * dy) <= 18

