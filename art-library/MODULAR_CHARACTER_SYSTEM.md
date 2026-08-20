# Modular character system

This is the reusable 2D unit contract and the optional 3D handoff contract. It
is intentionally an asset-system document, not an Art Bible.

## Design goal

Units should read immediately at battle scale while allowing a small library of
body frames, heads, clothes, hands and props to produce a much larger cast. The
visible construction may feel like hinged cardstock, but registration must be
precise enough for combat animation and portrait crops.

Roles are not gender locked. The `m` and `f` suffixes below describe two base
chest-and-hip silhouettes used during production; heads, hair, hats, colours,
roles and most clothing remain independent.

## Active paper and marker grammar

The active `v03` modules follow the approved foliage treatment rather than the
older rendered character pass:

- the silhouette is built from a few broad cardstock pieces;
- each piece keeps a physical cut edge, small misalignment and visible overlap;
- ink is reserved for faces, joints, folds and one or two material cues;
- marker strokes must wobble, taper, skip, double back or slightly overshoot;
- perfect vector contours, airbrushed volume and tiny costume rendering are
  outside the target;
- facial caricature uses an original early-1990s adult-animation vocabulary,
  with specific noses, jaws, brows and asymmetry rather than copied characters;
- expressions should carry humour, irritation, nerves or vanity as well as
  threat. The whole cast must not read as uniformly depressed.

Concept head sheets currently include hair for quick review. The production
rig separates `head` and `hair_hat` without changing the approved silhouette.

## Body frames

| Frame id | Read at battle scale | Primary use |
|---|---|---|
| `light-m` / `light-f` | narrow shoulder and hip mass, longer visible limbs | runners, watchers, younger locals |
| `medium-m` / `medium-f` | balanced torso and limb mass | fixers, drivers, general crew |
| `heavy-m` / `heavy-f` | broad chest or hip mass, shorter negative spaces | muscles, enforcers, older locals |

Heads share one normalized neck socket. Torsos, arms, pelvis/legs and footwear
swap freely inside the same frame. Adjacent-frame swaps are allowed through a
documented scale and socket offset; light-to-heavy swaps require a bespoke
bridge piece rather than silent deformation.

## Module stack

Modules are drawn back-to-front in this order:

1. `back_gear`
2. `rear_arm`
3. `rear_leg`
4. `pelvis_legs`
5. `torso`
6. `front_leg`
7. `front_arm`
8. `neck`
9. `head`
10. `hair_hat`
11. `hands_grip`
12. `weapon_prop`
13. `front_accessory`
14. `role_tab`

Sleeves should normally travel with their arm module. Coats may provide a
torso, skirt or tail overlay that masks the pelvis seam. Faces, hair and hats
remain separate so a head can age, change role or gain winter gear without
redrawing the body.

## Registration and pivots

All 2D modules use a common 1024-unit canvas and these normalized sockets:

| Socket | Purpose |
|---|---|
| `root_ground` | feet-centre world anchor; never moves inside a stance frame |
| `pelvis` | root of body motion and body-frame scaling |
| `torso` | coat and chest registration |
| `neck` | universal head socket |
| `shoulder_l`, `shoulder_r` | arm roots |
| `elbow_l`, `elbow_r` | paper-joint or mesh-deform pivots |
| `wrist_l`, `wrist_r` | interchangeable hand and grip poses |
| `grip_primary` | dominant hand contact point |
| `grip_secondary` | support-hand contact point |
| `back_gear` | slung prop, backpack or long weapon rest |
| `role_tab` | small engine-tinted subclass marker behind the silhouette |

Pivots sit inside the paper shapes so a dark overlap hides the joint. Ground
shadows are engine assets and must not be baked into modules.

## Holding families

| Hold id | Hands | Typical visual assets | Required poses |
|---|---:|---|---|
| `empty` | 0 | fists, open hand, pocketed hand | idle, guard, talk, run |
| `utility-one` | 1 | feature phone, keys, small bag, torch | low, inspect, use |
| `blunt-one` | 1 | short baton, pipe, bottle | low, ready, strike |
| `firearm-one` | 1 | compact handgun or blank-gun silhouette | low, ready, aim, recoil |
| `bat-two` | 2 | baseball bat, long club | shoulder, ready, swing, recover |
| `long-firearm-two` | 2 | long-gun silhouette | low, ready, aim, recoil |
| `improvised-two` | 2 | board, heavy bar, signpost | carry, ready, strike |

Weapon art is a readable silhouette and grip contract, not a mechanical guide.
Every two-hand asset defines both grip points. One-hand assets define the
primary grip and may optionally declare a bracing pose.

## Subclass reads

Subclass identity uses silhouette first, one prop or clothing cue second, and a
small tinted UI tab third. It must not depend on ethnicity or a uniform.

| Subclass | Shape and posture | Diegetic cue | Default tab |
|---|---|---|---|
| Runner | forward lean, visible lower legs | wool cap, cross-body pouch, feature phone | cyan chevron |
| Muscle | broad square stance | heavy parka, work gloves, taped hand | orange block |
| Watcher | upright and slightly withdrawn | long coat, notebook, compact camera | magenta eye |
| Fixer | layered, asymmetrical silhouette | scarf, key ring, document wallet | mustard knot |
| Driver | weight on rear foot | work jacket, gloves, keys | green wheel |
| Local | ordinary practical layers | grocery bag, transit card, cigarette pack | blue street tab |
| Hired | planted stance and cheap gear | tracksuit, blunt weapon, small duffel | ochre bars |
| Enforcer | closed stance, concealed hands | rain shell, dark cap, long silhouette | red wedge |

Heads and body frames vary age, face width, hairline, nose and jaw. Cast
ordinary Kallio residents across Finnish and immigrant-background faces without
making ancestry a faction or class shorthand. A crew should include women and
men across light, medium and heavy frames, with roles communicated through
posture, clothing, equipment and the role tab.

## 2D animation set

Every battle-ready body frame must support:

- `idle-a`, `idle-b`, `breathe`
- `talk-a`, `talk-b`, `react-choice`
- `guard`, `brace`, `reposition`
- `ready-one`, `attack-one`, `recover-one`
- `ready-two`, `attack-two`, `recover-two`
- `aim-one`, `recoil-one`, `aim-two`, `recoil-two`
- `hit-light`, `hit-heavy`, `wounded-idle`
- `walk-iso-ne`, `walk-iso-nw`, `walk-iso-se`, `walk-iso-sw`
- `flee`, `downed`, `death-hold`
- `interact`, `phone`, `pickup`

The root remains fixed for combat poses. Reposition, walking and fleeing export
root motion separately. The first production pass can use 4-frame holds and
6-to-8-frame actions; timing matters more than extra drawings.

## Optional 3D handoff

Each base frame also gets an orthographic turnaround with front, left, back and
right views plus a neutral T-pose. Requirements:

- identical body proportions and clothing seams in all views;
- arms horizontal, palms down, feet parallel and shoulder-width;
- flat neutral lighting, no cast shadow, no dramatic perspective;
- hair, hat, outerwear and carried props separated when practical;
- one material region per paper or cardstock colour family;
- face shapes remain stylized and low-detail enough to match the 2D cutouts;
- weapon and hand sockets preserve the 2D names where the 3D tool allows it.

The optional 3D model is a clean animation source, not the final rendered look.
The game can apply the printed-paper texture, ink outline and limited-frame
timing after rendering.
