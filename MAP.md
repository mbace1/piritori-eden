# The Kallio board — stops, services and legend

Generated from `flow-core/city.js`, which is the single source of truth. If a
number here and a number there disagree, city.js wins.

**Projection.** Every stop is placed from its real WGS84 position, one design
unit = **10 metres**:

```
x = (lon − 24.9490) × 5534      (111.32 km/° × cos 60.185° ÷ 10 m)
y = (60.1885 − lat) × 11132     (111.32 km/° ÷ 10 m, north up)
```

The board is **~610 m wide × ~1010 m tall** — Kallio really is that steep a
rectangle, one metro stop end to end.

---

## 1. The stops (10)

Listed north to south by position on the board. `tags` are what the core knows;
each product reads them its own way.

| # | id | Name on the map | lat, lon | x, y | tags | cap |
|---|---|---|---|---|---|---|
| 1 | `vaasankatu` | **Vaasankatu** | 60.1881, 24.9560 | 39, 4 | shop, service | 18 |
| 2 | `sornainen` | **Sörnäinen** | 60.1880, 24.9601 | 61, 6 | transfer, work | 28 |
| 3 | `kurvi` | **Kurvi** | 60.1875, 24.9590 | 55, 11 | transfer, work, shop | 26 |
| 4 | `vaasanaukio` | **Vaasanaukio** → *"Piritori"* | 60.1871, 24.9572 | 45, 16 | transfer, shop, home | 30 |
| 5 | `harju` | **Harju** | 60.1864, 24.9507 | 9, 23 | home, service | 18 |
| 6 | `torkkelinmaki` | **Torkkelinmäki** | 60.1848, 24.9560 | 39, 41 | home | 16 |
| 7 | `karhupuisto` | **Karhupuisto** | 60.1845, 24.9534 | 24, 45 | home, school | 18 |
| 8 | `kirkko` | **Kallion kirkko** | 60.1844, 24.9500 | 6, 46 | service, school | 16 |
| 9 | `kuudeslinja` | **Kuudes linja** | 60.1832, 24.9527 | 20, 59 | shop, home | 20 |
| 10 | `hakaniemi` | **Hakaniemi** | 60.1794, 24.9511 | 12, 101 | transfer, shop, work | 30 |

**What each one is**

- **Vaasanaukio / Piritori** — the plaza at Sörnäinen metro's west door. The
  starting square. The id is the real name; *Piritori* is a street nickname and
  is applied as a **label by the night product only**, which is what keeps the
  term out of the other product's bundle.
- **Sörnäinen** — metro station (opened 1 Sept 1984, Helsinginkatu 1), the
  wholesale end. Igor's back booth.
- **Kurvi** — where Hämeentie bends at Helsinginkatu. Traffic all night.
- **Vaasankatu** — the restaurant street. Toko Slomo's noodle shop.
- **Harju** — Kallion urheilukenttä / Brahen kenttä, the sports fields.
- **Torkkelinmäki** — the residential hill between Pengerkatu and Hämeentie.
- **Karhupuisto** — the bear statue. Jaska's bench.
- **Kallion kirkko** — the church on its rock, west of everything.
- **Kuudes linja** — the linjat. The McCormicks' bar.
- **Hakaniemi** — the market hall and the water. A full metro stop south.

## 2. The links (27)

| mode | count | drawable? | notes |
|---|---|---|---|
| tram | 8 | **yes** | the corridors the player may build on |
| walk | 14 | **yes** | dense, slow, low capacity — the mesh under everything |
| metro | 1 | no | Hakaniemi ↔ Sörnäinen, 900 m of tube |
| car | 4 | no | Hämeentie and Helsinginkatu |

Times are ticks, cut from real distance: walk ≈ 0.9 ticks per unit, tram ≈
0.45, and **Hämeentie is quicker per unit than anything beside it** because it
is the arterial.

## 3. The city's own services (6) — running from tick one

Not drawable, not editable. The player's lines are built *on top of* and
compete for room with these.

| label | mode | route | carriers × cap |
|---|---|---|---|
| **M** | metro | Hakaniemi → Sörnäinen | 2 × 40 |
| **6** | tram | Hakaniemi → Kurvi → Sörnäinen | 2 × 12 |
| **3B** | tram | Hakaniemi → Kuudes linja → Kallion kirkko → Karhupuisto → Vaasanaukio → Kurvi | 2 × 12 |
| **1** | tram | Harju → Vaasanaukio → Kurvi | 1 × 10 |
| **Hämeentie** | car | Hakaniemi → Kurvi → Sörnäinen | 3 × 2 |
| **Helsinginkatu** | car | Harju → Vaasanaukio → Kurvi | 2 × 2 |

*(3B's letter designation is period-correct for act one — 3B/3T ran the
figure-eight in opposite directions until the letters were dropped in 2013.)*

---

## 4. Legend

Everything below is **tappable** and opens a small window with its details.
Nothing is a full-screen takeover.

### Moving

| mark | what | shape / colour | reads |
|---|---|---|---|
| ▬▬ | **Metro train** | long box, amber | 40 a car, 26 ticks end to end |
| ▪ | **Tram** | square box, dull green | city lines 6 / 3B / 1 |
| ▫ | **Car** | small flat lozenge, slate | Hämeentie, Helsinginkatu |
| ▪ | **Your carrier** | box in your line's colour | white / cyan / green / violet by line |
| · · | **Riders aboard** | paper-coloured pips on a carrier | up to 6 shown; how buried your load is |
| **R** | **Rival crew** | white pin | moves haunt daily: Kurvi → Torkkelinmäki → Vaasanaukio |
| **!** | **Patrol** | orange pin, on an edge | sits on the hottest line; appears at ≥34% attention |

### Stationary

| mark | what | shape / colour | reads |
|---|---|---|---|
| ◇ | **Interchange stop** | ringed disc | transfer tag |
| □ | **Shop stop** | ringed disc | shop tag |
| △ | **Service stop** | ringed disc | service tag |
| ○ | **Other stop** | ringed disc | home / school |
| ▪▪▪ | **Queue** | fan of pips beside a stop | who is waiting — read this first |
| ◯ | **Overload ring** | pulsing orange | past 70% of shelter capacity |
| **J T S I** | **Contacts** | magenta pins | Jaska · Toko Slomo · Sean McCormick · Igor |
| **€** | **The square's sellers** | gold pin, Vaasanaukio | tonight's street prices |
| **★** | **Mission goal** | gold pin, dims when met | four of them, below |
| ┄ | **Latent link** | faint dashed | a corridor nobody has built on yet |
| ┅× | **Closed** | orange dashed + × | inspection or works |
| ┅ | **Slowed** | amber dashed | a delay modifier is on it |

### Mission goals (★)

| at | goal | met when |
|---|---|---|
| Sörnäinen | **Clear the paper** | the debt reaches zero |
| Vaasanaukio | **Feed the square** | one consignment has landed |
| Hakaniemi | **The way out** | 3 000 € banked in the exit fund |
| Karhupuisto | **Keep your brother** | Jaska's trust ≥ 3 |

### Toko Move's own pins

The day product shares every stop, link and service above, and swaps the
people layer for its own:

| mark | what | reads |
|---|---|---|
| **▣** | **Delivery due** | a booked job, pinned at its destination |
| **!** | **Crowding** | a stop past 70% of capacity |

---

## 5. Interaction

- **Drag stop → stop** draws a line. Only a *stop* can anchor a drag; a press
  on a vehicle or a pin is always a tap.
- **Tap a stop** opens the counter (night) or the stop's state (day).
- **Tap anything else** — vehicle, contact, seller, rival, patrol, goal —
  opens the small window.
- Four player lines maximum. City services do not count against that budget
  and cannot be deleted or reshaped.
