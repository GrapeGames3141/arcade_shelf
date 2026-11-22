# Cartastrophe — design notes

## Pitch
A demolition-derby party game where you don't wreck carts by hitting them hard, you wreck them by shoving them into the
scenery. The carts are shopping carts with a firework rocket duct-taped under the handle. The rider sits in the basket with
their legs over the front and steers with two ropes tied to the front casters (pull left rope = turn left), so steering is
laggy and the casters wobble like every real shopping cart.

## Hazards and callouts
| Hazard | Callout |
|---|---|
| Store front wall / windows | STORE CLOSED! |
| Sound wall, brick walls | WALLED! |
| Loading dock face | DOCKED! |
| Parked car (sets off its car alarm) | PARKED! |
| Lamp post | LAMPPOSTED! |
| Cart corral | RETURNED! |
| Dumpster | TRASHED! |
| Bollard at the doors | BOLLARDED! |
| Fence by the cliff | FENCED! |
| Duck pond (ducks fly off) | SPLASHDOWN! |
| Off the cliff into the lake | CLIFFED! |
| Landing a jump upside down | BELLY FLOP! |
| Any of the above with nobody to blame | SELF-CHECKOUT! |
| Two wipeouts by one cart within 6 s | BOGO! |
| Jumping the pond from the pond ramp | CLEARANCE! |

Guard rails along the cliff stop slow carts; fast ones vault over. The gaps between rails have nothing.

## Riders
| Rider | Helmet | Weight (kg) | Note |
|---|---|---|---|
| Gary | colander | 75 | all-rounder |
| Big Deb | stock pot | 100 | hard to shove, slow off the line |
| Tiny Tim | traffic cone | 55 | zippy, flies far when hit |
| Nana Rocket | salad bowl | 66 | |
| Chad | bucket | 86 | |
| Box Kid | cardboard box | 60 | |
The cart adds 18 kg. Thrust is the same for everyone, so light riders accelerate faster and heavy riders hit harder.

## Items (grocery bags around the lot, respawn after 10 s)
- Watermelon: lobbed forward; a hit knocks the cart ~7.5 m/s (scaled by weight) and counts as a shove.
- Bananas: three peels behind you; driving over one spins you out for 1.5 s.
- Leaf blower: 3 s cone gust (15 m) that pushes carts away; great for nudging someone off the cliff.
- Mega Rocket: 2.2 s of huge thrust with no heat; rams with it get the biggest shove bonus.

## Match
- 1-5 opponents, 1/3/5 lives, 4-minute timer (most lives, then most wipeouts wins at time-out).
- Wiped-out carts walk back to the store and roll out of a door (sliding doors open, "ding-dong"), ghosted for 2.4 s.
- Eliminated players spectate (left/right to switch, hold E to fast-forward, R to restart).
- End screen is a Clifftop Foods receipt: wipeouts caused, self-checkouts, pond clearances, top speed, biggest air.

## Comedy checklist
Ragdoll riders (scream face, formant-synth scream per rider pitch), groceries spill everywhere, tumbling wrecks with
smoke, car alarms, ducks scattering, PA announcements in the feed ("the duck pond is not a car wash"), slow motion when the
player is involved, a bossa-nova muzak loop, optional spoken callouts (speechSynthesis), and the receipt.

## Possible next steps
- Second arena (rooftop parking garage with ramps between levels).
- Local split-screen or same-keyboard 2 player.
- Replay of the last wipeout from a dramatic angle.
