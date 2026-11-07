import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const ROOT = new URL('../../../', import.meta.url);
const read = path => JSON.parse(fs.readFileSync(new URL(path, ROOT)));
const cast = read('art-src/reviews/act1-production/characters.json');
const content = read('content/era1-slice-v1.json');
const art = read('art/v3/manifest.json');
const ids = new Map(cast.characters.map(packet => [packet.id, packet]));
const participantIds = [...new Set(content.encounters.flatMap(encounter => encounter.participants || []))].sort();
const registered = new Map();
for (const group of art.assets) {
  if (group.file) registered.set(group.id, { approval: group.approval_status, production: group.production_status || 'not recorded', file: `art/v3/${group.file}` });
  for (const member of group.members || []) registered.set(member.id, { approval: group.approval_status, production: group.production_status || 'not recorded', file: `art/v3/${member.file}` });
}
assert.equal(cast.reviewOnly, true); assert.equal(cast.runtimePromotion, false); assert.equal(cast.completionPercent, 48);
assert.equal(cast.characters.length, 26); assert.equal(ids.size, 26); assert.equal(participantIds.length, 21);
assert.deepEqual(cast.coverage.participantIds, participantIds);
for (const id of participantIds) assert(ids.has(id), `${id}: authored participant has a packet`);
for (const encounter of content.encounters) for (const id of encounter.participants || []) assert(ids.get(id).encounters.includes(encounter.id), `${id}: encounter coverage`);
for (const packet of [...cast.characters, ...cast.deferredExisting]) {
  assert(['individual', 'crew-slot', 'group', 'offscreen'].includes(packet.kind));
  assert(Number.isFinite(packet.priority)); assert(packet.status && packet.name && packet.summary);
  for (const key of ['encounters', 'locations', 'existingRigIds', 'assets', 'sourceCandidates', 'animationNeeds', 'placeholders', 'sources']) assert(Array.isArray(packet[key]), `${packet.id}: ${key}`);
  for (const key of ['nextSteps', 'acceptance', 'mustPreserve']) assert(packet.plan[key].length > 0, `${packet.id}: ${key}`);
  for (const path of [...packet.sourceCandidates, ...packet.sources]) assert(fs.existsSync(new URL(path, ROOT)), `${packet.id}: real provenance ${path}`);
  for (const rig of packet.existingRigIds) assert(art.assets.some(asset => asset.id === rig), `${packet.id}: existing rig id`);
  for (const asset of packet.assets) {
    const original = registered.get(asset.id); assert(original, `${packet.id}: existing registered asset`);
    assert.equal(asset.approval, original.approval); assert.equal(asset.production, original.production); assert.equal(asset.file, original.file);
    assert(fs.existsSync(new URL(asset.file, ROOT)));
  }
}
for (const [path, sha] of Object.entries(cast.source.sha256)) {
  const file = fs.readFileSync(new URL(path, ROOT));
  assert.equal(crypto.createHash('sha256').update(file).digest('hex'), sha, `source hash: ${path}`);
}
for (const crew of content.crew) {
  const packet = ids.get(crew.id); assert.equal(packet.kind, 'crew-slot'); assert.equal(packet.authoredNamed, crew.named);
  assert.deepEqual(packet.assets.map(asset => asset.id), [crew.portrait_asset_id, crew.torso_asset_id, crew.legs_asset_id]);
  // A recruitment metadata link never fabricates a visible participant.
  assert.deepEqual(packet.encounters.slice().sort(), content.encounters.filter(e => e.participants?.includes(crew.id)).map(e => e.id).sort());
}
for (const id of ['seller-esa', 'buyer-leena', 'teller-anne', 'bank-clerk', 'sean-mccormick', 'mei-lan', 'kello']) {
  assert.equal(ids.get(id).existingRigIds.length, 0, `${id}: no invented dedicated rig`);
  assert.equal(ids.get(id).assets.length, 0, `${id}: no invented face assignment`);
}
assert.equal(ids.get('bank-clerk').status, 'identity-clarification-needed');
assert.equal(ids.get('jaska-offscreen').kind, 'offscreen');
assert.equal(ids.get('arvo').encounters.length, 0, 'news is not an invented enterable encounter');
assert.equal(ids.has('hooded-camera-woman'), false);
assert(cast.deferredExisting.some(packet => packet.id === 'hooded-camera-woman' && packet.encounters.length === 0));
for (const asset of ids.get('aatami').assets) assert.equal(asset.approval, 'semi-approved');
assert.match(ids.get('aatami').rigAssessment.side, /unassessed/);
assert(cast.uncertainties.some(issue => issue.id === 'runner-identity'));
assert(cast.uncertainties.some(issue => issue.id === 'kello-conditional-absence'));
console.log(`Cast packets PASS: ${cast.characters.length} active, ${participantIds.length} participant ids across ${content.encounters.length} encounters, all ${content.crew.length} crew slots, ${cast.deferredExisting.length} deferred existing concept; ${Object.keys(cast.source.sha256).length} exact source hashes.`);
