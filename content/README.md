# Era I content package

`era1-slice-v1.json` is the finite authored baseline for the first playable
Piritori → Eden vertical slice. It implements the scope locked in the GDD rather
than expanding it:

- seven days, each with Day and Night;
- fourteen authored encounter blocks;
- the Piritori purchase, Toko, Jaska, McCormicks, staffed bank and restaurant
  front;
- one abstract product and five offers;
- six adult recruitable characters covering six flexible field roles;
- four mission families;
- one information-avoidable 2v2 and one consequential 3v3;
- one sourced Arvo broadcast;
- debt, dead markka and four Pasila reachability outcomes.

Run from the repository root:

```bash
node piritori/content/validate-slice.mjs
```

The validator resolves the map and runtime-art manifests, checks every content
reference, enforces the locked counts and formation rules, verifies runtime
files and hashes, and rejects any dependency on the needs-rework archive.

## Runtime rule

The JSON is content, not a save format. Runtime state should reference stable
ids and apply typed effects through an interpreter. Unknown effects must fail
validation or log clearly during development; code must not silently discard a
narrative consequence.

The economy values are tuning data. The structure, content boundaries,
encounter identities, source labels and battle formats are the implementation
baseline.
