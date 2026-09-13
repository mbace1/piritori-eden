# C.15 environment pilot assets

Generator: `tools/blender/build_kallio_courtyard.py`. GLB origin/units/conventions,
motifs and hashes are in `kallio-kit-v01.manifest.json`. These are prototype
environment assets, not character approvals. Keep the two supplied texture
images stable on rebuild. No external art pack or Meshy generation used.

Built-in image generation produced the two textures using these final prompts:

**painted-plaster-v01.png**

Seamless tileable painted material texture, square 1024x1024. Warm grey aged lime plaster of an early 1900s Helsinki apartment courtyard wall, soft broad cloudy brush variation, restrained fine vertical rain marks and sparse shallow chips revealing dark warm grey mineral substrate, grit 4/10 beautiful understated. Diffuse ALBEDO only, perfectly flat orthographic material swatch edge to edge. No objects, lighting, shadows, perspective, text, masonry bricks, doors or windows. Low contrast so a 3D engine can light it. Warm mid-grey base, painterly handmade night-stage art material, broad forms and subtle directional texture, no photoreal grunge.

**painted-setts-v01.png**

Game material asset: seamless tileable diffuse ALBEDO texture, 1024 square. Old Helsinki courtyard paving: small rectangular irregular dark cool grey granite setts laid in staggered rows, thin dark recessed joints. About 14 stone columns and 19 rows across image. Worn rounded edges, broad painterly color variation in individual stones, occasional tiny sand or moss in joints. Painted night environment aesthetic with deliberate big shapes and subtle marks, beautiful and restrained, not photoreal. Base stone colors dark slate grey and muted grey-blue, some warm grey, low contrast; no white flecks, no litter, no leaves, no distinct stains, no baked reflections or light, no objects, no perspective, no shadows. Perfect top-down flat texture edge to edge. Stones darker at edges slightly but no strong directional lighting. This will be lit dynamically and given wet roughness in an actual Three.js scene.
