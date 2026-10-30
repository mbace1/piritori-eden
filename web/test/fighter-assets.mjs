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
const BODY_CLIP_NAMES = ['alert-idle', 'casual-walk'];
const HAND_CLIP_NAMES = ['hands-open', 'hands-relaxed', 'hands-fist', 'hands-prop-grip'];
const ALL_CLIP_NAMES = [...BODY_CLIP_NAMES, ...HAND_CLIP_NAMES];
const LEGACY_BODY_BONES = 24;
const FINGER_BONES = 20;

const pilots = [
  {
    name: 'F01',
    bodyId: 'cast3d-f01-heavy-bruiser-v03',
    clipsId: 'cast3d-f01-heavy-bruiser-clips-v03',
    triangles: 15512,
    clipTiming: {
      'alert-idle': { duration: 4, fullKeys: 121 },
      'casual-walk': { duration: 4.2, fullKeys: 127 },
    },
  },
  {
    name: 'F02',
    bodyId: 'cast3d-f02-wiry-skirmisher-v03',
    clipsId: 'cast3d-f02-wiry-skirmisher-clips-v03',
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
  assert.equal(asset.production_status, 'playable-test-only', `${bodyId} stays provisional`);
  assert.equal(asset.rig_version, 'v3', `${bodyId} records the v03 rig version`);
  assert.equal(asset.triangle_count, triangles, `${bodyId} records ${triangles.toLocaleString()} triangles`);
  assert.equal(asset.bone_count, LEGACY_BODY_BONES + FINGER_BONES,
    `${bodyId} records ${LEGACY_BODY_BONES} body and ${FINGER_BONES} finger bones`);
  assert.equal(asset.animation_count, 0, `${bodyId} records zero animations`);
  assert.deepEqual(asset.texture_resolution, [2048, 2048], `${bodyId} records a 2K texture`);

  assert.equal(optionalArray(gltf.meshes).length, 1, `${bodyId} contains exactly one mesh`);
  assert.equal(optionalArray(gltf.nodes).filter(node => Number.isInteger(node.mesh)).length, 1,
    `${bodyId} instantiates exactly one mesh node`);
  assert.equal(optionalArray(gltf.animations).length, 0, `${bodyId} contains zero animations`);
  assert.equal(triangleCount(gltf, bodyId), triangles, `${bodyId} GLB triangle count matches the manifest`);

  assert.equal(optionalArray(gltf.skins).length, 1, `${bodyId} contains exactly one skin`);
  const joints = gltf.skins[0].joints;
  assert.equal(optionalArray(joints).length, asset.bone_count,
    `${bodyId} skin joint count matches manifest bone_count`);
  const jointNames = joints.map(index => gltf.nodes?.[index]?.name);
  assert(jointNames.every(nameValue => typeof nameValue === 'string' && nameValue.trim()),
    `${bodyId} gives every joint a name`);
  assert.equal(new Set(jointNames).size, asset.bone_count, `${bodyId} joint names are unique`);

  assertDurablePbr(gltf, bodyId);
}

function assertClipPack({ asset, gltf }, pilot, bodyGltf) {
  const { bodyId, clipsId, name } = pilot;
  assert.equal(asset.character_id, name, `${clipsId} records ${name}`);
  assert.equal(asset.production_status, 'playable-test-only', `${clipsId} stays provisional`);
  assert.equal(asset.rig_version, 'v3', `${clipsId} records the v03 rig version`);
  assert.equal(asset.compatible_model_id, bodyId, `${clipsId} targets its own v03 body`);
  assert.deepEqual(asset.clip_names, ALL_CLIP_NAMES, `${clipsId} records exact body and hand clips`);
  assert.equal(asset.sample_rate_hz, 30, `${clipsId} records the source 30 Hz cadence`);
  assert.equal(asset.clip_durations_seconds?.['alert-idle'], 4,
    `${clipsId} records the exact Alert Idle source duration`);
  assert.equal(asset.clip_durations_seconds?.['casual-walk'], 4.2,
    `${clipsId} records the exact Casual Walk source duration`);
  for (const handClip of HAND_CLIP_NAMES) {
    assert(Number.isFinite(asset.clip_durations_seconds?.[handClip])
      && asset.clip_durations_seconds[handClip] >= 0,
    `${clipsId} records ${handClip} duration`);
  }
  assert.equal(asset.mesh_count, 0, `${clipsId} records zero meshes`);

  for (const key of ['meshes', 'materials', 'images', 'textures']) {
    assert.equal(optionalArray(gltf[key]).length, 0, `${clipsId} contains zero ${key}`);
  }
  assert.equal(optionalArray(gltf.nodes).filter(node => Number.isInteger(node.mesh)).length, 0,
    `${clipsId} has no mesh-bearing nodes`);

  const animations = optionalArray(gltf.animations);
  assert.deepEqual(animations.map(animation => animation.name).sort(), [...ALL_CLIP_NAMES].sort(),
    `${clipsId} contains exactly the six layered runtime clips`);
  const bodyJointNames = new Set(bodyGltf.skins[0].joints.map(index => bodyGltf.nodes[index].name));
  const bodyTargetSets = [];
  const handTargetSets = [];
  for (const animation of animations) {
    const channels = optionalArray(animation.channels);
    const samplers = optionalArray(animation.samplers);
    assert.equal(samplers.length, channels.length,
      `${clipsId} ${animation.name} has one sampler per channel`);
    const channelKeys = animation.channels.map(channel => {
      assert(Number.isInteger(channel.sampler) && animation.samplers[channel.sampler],
        `${clipsId} ${animation.name} channel references a sampler`);
      const targetName = gltf.nodes?.[channel.target?.node]?.name;
      assert(typeof targetName === 'string' && targetName.trim(),
        `${clipsId} ${animation.name} channel targets a named node`);
      assert(bodyJointNames.has(targetName),
        `${clipsId} ${animation.name} targets a joint from ${bodyId}`);
      assert(['translation', 'rotation', 'scale'].includes(channel.target.path),
        `${clipsId} ${animation.name} channel has a supported TRS path`);
      return `${channel.target.node}:${channel.target.path}`;
    });
    assert.equal(new Set(channelKeys).size, channels.length,
      `${clipsId} ${animation.name} has no duplicate joint-property tracks`);
    const targetNames = new Set(animation.channels.map(channel => gltf.nodes[channel.target.node].name));
    const timeAccessors = animation.samplers.map(sampler => gltf.accessors?.[sampler.input]);
    assert(timeAccessors.every(accessor => accessor
      && Number.isSafeInteger(accessor.count)
      && accessor.count > 0
      && Array.isArray(accessor.min)
      && Array.isArray(accessor.max)),
    `${clipsId} ${animation.name} samplers expose bounded input accessors`);

    if (BODY_CLIP_NAMES.includes(animation.name)) {
      assert.equal(channels.length, 72, `${clipsId} ${animation.name} contains 72 legacy body channels`);
      assert.equal(targetNames.size, LEGACY_BODY_BONES,
        `${clipsId} ${animation.name} targets ${LEGACY_BODY_BONES} legacy body bones`);
      bodyTargetSets.push(targetNames);
      const expectedTiming = pilot.clipTiming[animation.name];
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
    } else {
      assert(HAND_CLIP_NAMES.includes(animation.name), `${clipsId} ${animation.name} is an agreed hand pose`);
      assert.equal(channels.length, FINGER_BONES,
        `${clipsId} ${animation.name} contains exactly one channel per finger bone`);
      assert(channels.every(channel => channel.target.path === 'rotation'),
        `${clipsId} ${animation.name} contains rotation channels only`);
      assert.equal(targetNames.size, FINGER_BONES,
        `${clipsId} ${animation.name} targets all ${FINGER_BONES} finger bones`);
      handTargetSets.push(targetNames);
    }
  }

  assert(bodyTargetSets.every(targets => (
    targets.size === bodyTargetSets[0].size && [...targets].every(nameValue => bodyTargetSets[0].has(nameValue))
  )), `${clipsId} body clips target the same legacy bone set`);
  assert(handTargetSets.every(targets => (
    targets.size === handTargetSets[0].size && [...targets].every(nameValue => handTargetSets[0].has(nameValue))
  )), `${clipsId} hand poses target the same finger bone set`);
  assert([...bodyTargetSets[0]].every(nameValue => !handTargetSets[0].has(nameValue)),
    `${clipsId} body and hand tracks are disjoint`);
  const layeredJointNames = new Set([...bodyTargetSets[0], ...handTargetSets[0]]);
  assert.deepEqual([...layeredJointNames].sort(), [...bodyJointNames].sort(),
    `${clipsId} disjoint layers cover the exact ${bodyId} skeleton`);
}

for (const pilot of pilots) {
  const [body, clips] = await Promise.all([
    loadAsset(pilot.bodyId),
    loadAsset(pilot.clipsId),
  ]);
  assertBody(body, pilot);
  assertClipPack(clips, pilot, body.gltf);
}

console.log('FIGHTER ASSETS OK: F01/F02 v03 finger rigs and layered clip packs match the durable Art contract.');
