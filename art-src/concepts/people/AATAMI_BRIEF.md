# Aatami — concept art brief (for GPT)

**Owner, 2026-10-24:** *"Aatami.. Just get concept art for me to approve. Think
of Kurt Cobain in the Piritori style."*

This branch holds everything needed to make it. Your job: generate the three
images below, save each next to its prompt file, add one review sheet, commit
to this branch. Nothing else.

## Who he is

From `NARRATIVE.md`, the character canon:

- Aatami is the Era I protagonist: early thirties, Kallio, Helsinki, **2003**.
- He arrives at Piritori with cash, debt, **one small bag** and one known route.
- He later becomes the boss who calls the shots while his crew does the work.
- His brother is **Jaska**, an artist and his moral counterweight. Jaska's
  approved concept is the style reference below.

He will be shown **waist-up as a talking profile** when he speaks, cut straight
out of the approved concept. So the concept needs a clean silhouette on flat
grey, hands clear of the face, nothing crossing the head.

## The Cobain note

The look nods to the early-1990s grunge musician: hair, stubble, cardigan or
flannel, tired guarded eyes. It is an **homage, not a likeness**, which is the
same rule the project already applies to Arvo Linde (a fictional homage to the
newsreader Arvi Lind, never a portrait). Do not draw Kurt Cobain's face.

## Open these first

| Reference | Why |
|---|---|
| `jaska-concept-v03.jpg` | Approved. Match its style, framing and grey background exactly. Attach it to every generation. |
| `hooded-camera-woman-v02.png` | Same style family, for line and fill. |

Both are in this folder, `art-src/concepts/people/`.

## Make these three

Each `.txt` holds the full prompt. Save the image with the same name and a `.png`.

| File | Take |
|---|---|
| `aatami-concept-a-cardigan-v01` | Oversized mohair cardigan over a striped tee, ripped jeans, black high-tops, small shoulder bag |
| `aatami-concept-b-parka-v01` | Open army parka over a plaid flannel shirt, Helsinki winter, bag across the chest |
| `aatami-concept-c-corduroy-v01` | Corduroy jacket, white oval sunglasses in the collar, small holdall in hand |

If you change a prompt to get a better result, write the prompt you actually
used into its `.txt`. Every PNG in `art-src/` carries the prompt that made it.

## Then one review sheet, for a phone

`aatami-concept-sheet-v01.jpg`: **1000 px wide, portrait**, the three images
stacked vertically, each labelled **A / B / C** in type at least 28 px tall.
The owner reviews on a phone.

## Check before committing

- [ ] Background is one flat uniform grey, edge to edge. No gradient, shadow or scenery.
- [ ] Whole figure in frame, feet included, about 10% margin on every side.
- [ ] Ink line and flat fills like Jaska's concept. No soft shading, no photo look.
- [ ] Reads as a fictional man, not as a portrait of Kurt Cobain.
- [ ] Clothes are believable for Helsinki in 2003.
- [ ] The small bag is there.
- [ ] Face reads clearly at phone size, and the hands don't cross it.
- [ ] No text or logos in the image.

## Do not

- Do not edit any other file, add dependencies, or touch `web/`, `godot/` or the docs.
- Do not merge. The owner approves one take, or none.
