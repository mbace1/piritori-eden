import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const assetRoot = resolve(root, 'art/v3');
const manifest = JSON.parse(await readFile(resolve(assetRoot, 'manifest.json'), 'utf8'));
const assetsById = new Map(manifest.assets.map(asset => [asset.id, asset]));

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const EPSILON = 1e-6;

const pilots = [
  {
    name: 'F01',
    bodyId: 'cast3d-f01-heavy-bruiser-v02',
    clipsId: 'cast3d-f01-heavy-bruiser-clips-v02',
    triangles: 15512,
    clipTiming: {
      'alert-idle': { duration: 4, fullKeys: 121 },
      'casual-walk': { duration: 4.2, fullKeys: 127 },
    },
  },
  {
    name: 'F02',
    bodyId: 'cast3d-f02-wiry-skirmisher-v02',
    clipsId: 'cast3d-f02-wiry-skirmisher-clips-v02',
    triangles: 15503,
    clipTiming: {
      'alert-idle': { duration: 4, fullKeys: 121 },
      'casual-walk': { duration: 4.2, fullKeys: 127 },
    },
  },
];

function optionalArray(value) {
  return Array.isArray(value) ? value : [];
}

function manifestAsset(id) {
  const asset = assetsById.get(id);
  assert(asset, `${id} is registered in art/v3/manifest.json`);
  return asset;
}

function assetPath(asset) {
  assert.equal(extname(asset.file), '.glb', `${asset.id} points at a GLB`);
  const path = resolve(assetRoot, asset.file);
  const withinRoot = relative(assetRoot, path);
  assert(withinRoot && !withinRoot.startsWith('..') && !isAbsolute(withinRoot),
    `${asset.id} stays inside art/v3`);
  return path;
}

function parseGlbJson(bytes, id) {
  assert(bytes.length >= 20, `${id} has a complete GLB header`);
  assert.equal(bytes.readUInt32LE(0), GLB_MAGIC, `${id} has glTF magic`);
  assert.equal(bytes.readUInt32LE(4), 2, `${id} is GLB version 2`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${id} declared GLB length matches its file`);

  let json = null;
  let offset = 12;
  while (offset < bytes.length) {
    assert(offset + 8 <= bytes.length, `${id} has a complete chunk header`);
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    assert(end <= bytes.length, `${id} chunk stays inside the GLB`);
    if (type === GLB_JSON_CHUNK) {
      assert.equal(json, null, `${id} has one JSON chunk`);
      json = JSON.parse(bytes.subarray(start, end).toString('utf8').replace(/\0+$/u, '').trimEnd());
    }
    offset = end;
  }
  assert(json, `${id} contains a JSON chunk`);
  return json;
}

async function loadAsset(id) {
  const asset = manifestAsset(id);
  assert(Number.isSafeInteger(asset.bytes) && asset.bytes > 0, `${id} records a positive byte size`);
  assert.match(asset.sha256, /^[0-9a-f]{64}$/u, `${id} records a lowercase SHA-256`);

  const bytes = await readFile(assetPath(asset));
  assert.equal(bytes.length, asset.bytes, `${id} byte size matches the manifest`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256,
    `${id} SHA-256 matches the manifest`);
  return { asset, gltf: parseGlbJson(bytes, id) };
}

function triangleCount(gltf, id) {
  let triangles = 0;
  for (const mesh of optionalArray(gltf.meshes)) {
    for (const primitive of optionalArray(mesh.primitives)) {
      assert.equal(primitive.mode ?? 4, 4, `${id} uses triangle primitives`);
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      assert(Number.isInteger(accessorIndex), `${id} primitive has indices or POSITION`);
      const count = gltf.accessors?.[accessorIndex]?.count;
      assert(Number.isSafeInteger(count) && count > 0, `${id} primitive accessor has a count`);
      assert.equal(count % 3, 0, `${id} primitive count forms complete triangles`);
      triangles += count / 3;
    }
  }
  return triangles;
}

function assertDurablePbr(gltf, id) {
  const materials = optionalArray(gltf.materials);
  assert(materials.length > 0, `${id} contains a material`);
  for (const [index, material] of materials.entries()) {
    const label = `${id} material ${index}`;
    assert(!Object.hasOwn(material, 'emissiveTexture'), `${label} has no emissive texture`);
    assert(!Object.hasOwn(material, 'emissiveFactor'), `${label} has no emissive factor`);
    assert(!material.extensions?.KHR_materials_emissive_strength,
      `${label} has no emissive-strength extension`);

    const pbr = material.pbrMetallicRoughness;
    assert(pbr, `${label} declares metallic-roughness PBR`);
    assert.equal(pbr.metallicFactor, 0, `${label} is non-metallic`);
    assert(Math.abs(pbr.roughnessFactor - 0.92) <= EPSILON, `${label} roughness is 0.92`);

    const specular = material.extensions?.KHR_materials_specular;
    assert(specular, `${label} declares durable specular controls`);
    assert(Math.abs(specular.specularFactor - 0.5) <= EPSILON,
      `${label} specular factor is 0.5`);
    assert.deepEqual(specular.specularColorFactor ?? [1, 1, 1], [1, 1, 1],
      `${label} specular is explicitly or implicitly white`);
    assert(!Object.hasOwn(specular, 'specularTexture'), `${label} has no specular strength texture`);
    assert(!Object.hasOwn(specular, 'specularColorTexture'), `${label} has no coloured specular texture`);
  }
  assert(optionalArray(gltf.extensionsUsed).includes('KHR_materials_specular'),
    `${id} declares KHR_materials_specular in extensionsUsed`);
}

function assertBody({ asset, gltf }, pilot) {
  const { bodyId, name, triangles } = pilot;
  assert.equal(asset.character_id, name, `${bodyId} records ${name}`);
  assert.equal(asset.triangle_count, triangles, `${bodyId} records ${triangles.toLocaleString()} triangles`);
  assert.equal(asset.bone_count, 24, `${bodyId} records 24 bones`);
  assert.equal(asset.animation_count, 0, `${bodyId} records zero animations`);
  assert.deepEqual(asset.texture_resolution, [2048, 2048], `${bodyId} records a 2K texture`);

  assert.equal(optionalArray(gltf.meshes).length, 1, `${bodyId} contains exactly one mesh`);
  assert.equal(optionalArray(gltf.nodes).filter(node => Number.isInteger(node.mesh)).length, 1,
    `${bodyId} instantiates exactly one mesh node`);
  assert.equal(optionalArray(gltf.animations).length, 0, `${bodyId} contains zero animations`);
  assert.equal(triangleCount(gltf, bodyId), triangles, `${bodyId} GLB triangle count matches the manifest`);

  assert.equal(optionalArray(gltf.skins).length, 1, `${bodyId} contains exactly one skin`);
  const joints = gltf.skins[0].joints;
  assert.equal(optionalArray(joints).length, 24, `${bodyId} skin contains 24 joints`);
  const jointNames = joints.map(index => gltf.nodes?.[index]?.name);
  assert(jointNames.every(nameValue => typeof nameValue === 'string' && nameValue.trim()),
    `${bodyId} gives every joint a name`);
  assert.equal(new Set(jointNames).size, 24, `${bodyId} joint names are unique`);

  assertDurablePbr(gltf, bodyId);
}

function assertClipPack({ asset, gltf }, pilot, bodyGltf) {
  const { bodyId, clipsId, name } = pilot;
  assert.equal(asset.character_id, name, `${clipsId} records ${name}`);
  assert.equal(asset.compatible_model_id, bodyId, `${clipsId} targets its own v02 body`);
  assert.deepEqual(asset.clip_names, ['alert-idle', 'casual-walk'], `${clipsId} records exact clip names`);
  assert.equal(asset.sample_rate_hz, 30, `${clipsId} records the source 30 Hz cadence`);
  assert.deepEqual(asset.clip_durations_seconds, { 'alert-idle': 4, 'casual-walk': 4.2 },
    `${clipsId} records exact source clip durations`);
  assert.equal(asset.mesh_count, 0, `${clipsId} records zero meshes`);

  for (const key of ['meshes', 'materials', 'images', 'textures']) {
    assert.equal(optionalArray(gltf[key]).length, 0, `${clipsId} contains zero ${key}`);
  }
  assert.equal(optionalArray(gltf.nodes).filter(node => Number.isInteger(node.mesh)).length, 0,
    `${clipsId} has no mesh-bearing nodes`);

  const animations = optionalArray(gltf.animations);
  assert.deepEqual(animations.map(animation => animation.name).sort(), ['alert-idle', 'casual-walk'],
    `${clipsId} contains exactly the two runtime clips`);
  for (const animation of animations) {
    assert.equal(optionalArray(animation.channels).length, 72,
      `${clipsId} ${animation.name} contains 72 channels`);
    assert.equal(optionalArray(animation.samplers).length, 72,
      `${clipsId} ${animation.name} contains 72 samplers`);
    const channelKeys = animation.channels.map(channel => {
      assert(Number.isInteger(channel.sampler) && animation.samplers[channel.sampler],
        `${clipsId} ${animation.name} channel references a sampler`);
      const targetName = gltf.nodes?.[channel.target?.node]?.name;
      assert(typeof targetName === 'string' && targetName.trim(),
        `${clipsId} ${animation.name} channel targets a named node`);
      assert(['translation', 'rotation', 'scale'].includes(channel.target.path),
        `${clipsId} ${animation.name} channel has a supported TRS path`);
      return `${channel.target.node}:${channel.target.path}`;
    });
    assert.equal(new Set(channelKeys).size, 72,
      `${clipsId} ${animation.name} has one TRS channel per joint property`);
    assert.equal(new Set(animation.channels.map(channel => channel.target.node)).size, 24,
      `${clipsId} ${animation.name} targets 24 named joints`);

    const expectedTiming = pilot.clipTiming[animation.name];
    assert(expectedTiming, `${clipsId} ${animation.name} has an expected source timing contract`);
    const timeAccessors = animation.samplers.map(sampler => gltf.accessors?.[sampler.input]);
    assert(timeAccessors.every(accessor => accessor
      && Number.isSafeInteger(accessor.count)
      && Array.isArray(accessor.min)
      && Array.isArray(accessor.max)),
    `${clipsId} ${animation.name} samplers expose bounded input accessors`);
    for (const accessor of timeAccessors) {
      assert([2, expectedTiming.fullKeys].includes(accessor.count),
        `${clipsId} ${animation.name} retains sparse or full 30 Hz keys`);
      assert(Math.abs(accessor.min[0] - (1 / 30)) <= EPSILON,
        `${clipsId} ${animation.name} preserves the source first-key time`);
      assert(Math.abs((accessor.max[0] - accessor.min[0]) - expectedTiming.duration) <= EPSILON,
        `${clipsId} ${animation.name} preserves the source duration`);
    }
    assert(timeAccessors.some(accessor => accessor.count === expectedTiming.fullKeys),
      `${clipsId} ${animation.name} retains a full 30 Hz channel`);

    const clipJointNames = new Set(animation.channels.map(channel => gltf.nodes[channel.target.node].name));
    const bodyJointNames = new Set(bodyGltf.skins[0].joints.map(index => bodyGltf.nodes[index].name));
    assert.deepEqual([...clipJointNames].sort(), [...bodyJointNames].sort(),
      `${clipsId} ${animation.name} targets the exact ${bodyId} joint-name set`);
  }
}

for (const pilot of pilots) {
  const [body, clips] = await Promise.all([
    loadAsset(pilot.bodyId),
    loadAsset(pilot.clipsId),
  ]);
  assertBody(body, pilot);
  assertClipPack(clips, pilot, body.gltf);
}

console.log('FIGHTER ASSETS OK: F01/F02 v02 bodies and own-rig clip packs match the durable Art contract.');
