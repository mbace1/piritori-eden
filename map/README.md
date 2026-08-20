# Era I map package

`kallio-era1-2003-v1.json` is the design graph for the v3 map adapter.
`kallio-era1-2003-v1.svg` is a structural art blueprint, not a raster runtime
background. `../MAP.md` is the human-readable authority.

The package deliberately keeps:

- WGS84 public anchor points;
- derived local metre and board coordinates;
- public corridor identity;
- fictional enterable sites;
- slice reveal state;
- responsive art-layer requirements.

It deliberately does not keep final balance, market prices, criminal methods or
real private addresses.

Validate with:

```sh
node piritori/map/validate-map.mjs
```

