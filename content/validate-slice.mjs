import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contentPath = join(here, "era1-slice-v1.json");
const mapPath = resolve(here, "../map/kallio-era1-2003-v1.json");
const artManifestPath = resolve(here, "../art/v3/manifest.json");

const content = JSON.parse(readFileSync(contentPath, "utf8"));
const map = JSON.parse(readFileSync(mapPath, "utf8"));
const art = JSON.parse(readFileSync(artManifestPath, "utf8"));
const errors = [];

const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const uniqueIds = (items, label) => {
  const ids = items.map((item) => item.id);
  check(ids.every(Boolean), `${label}: every item needs an id`);
  check(new Set(ids).size === ids.length, `${label}: duplicate ids`);
  return new Set(ids);
};

const products = uniqueIds(content.products, "products");
const offers = uniqueIds(content.market_offers, "market offers");
const crew = uniqueIds(content.crew, "crew");
const equipment = uniqueIds(content.equipment, "equipment");
const missions = uniqueIds(content.missions, "missions");
const battles = uniqueIds(content.battles, "battles");
const encounters = uniqueIds(content.encounters, "encounters");
const news = uniqueIds(content.news, "news");
const endings = uniqueIds(content.endings, "endings");
const anchors = uniqueIds(map.anchors, "map anchors");
const sites = uniqueIds(map.sites, "map sites");

check(content.schema_version === 1, "content schema_version must be 1");
check(content.campaign.era === "2003", "slice must remain anchored in 2003");
check(content.campaign.days === 7, "slice must contain seven days");
check(content.campaign.total_player_blocks === 14, "slice must contain fourteen player blocks");
check(JSON.stringify(content.campaign.blocks_per_day) === JSON.stringify(["day", "night"]), "block order must be day, night");
check(content.products.length === 1 && products.has("piri"), "slice must use one product: piri");
check(content.market_offers.length === 5, "slice must expose five market offers");
check(content.crew.length === 6, "slice must define six recruitable crew");
check(content.missions.length === 4, "slice must define four mission families");
check(content.battles.length === 2, "slice must define exactly two authored battles");
check(content.encounters.length >= 10 && content.encounters.length <= 14, "slice must define ten to fourteen meaningful encounters");
check(content.encounters.length === 14, "implementation baseline expects fourteen encounters");
check(content.schedule.length === 14, "schedule must contain fourteen entries");
check(content.schedule[0]?.encounter_id === "enc-first-purchase" && content.schedule[0]?.anchor_id === "piritori", "opening must show Piritori as the first highlighted map destination");
check(content.schedule[1]?.encounter_id === "enc-first-sale" && content.schedule[1]?.anchor_id !== "piritori", "first purchase must lead directly to a profitable sale elsewhere");
check(content.news.length === 1, "slice must contain one scheduled Arvo bulletin");
check(content.endings.length >= 2, "slice must show more than one Pasila reachability state");

const scheduleKeys = new Set();
for (const slot of content.schedule) {
  const key = `${slot.day}:${slot.block}`;
  check(slot.day >= 1 && slot.day <= 7, `schedule ${key}: invalid day`);
  check(["day", "night"].includes(slot.block), `schedule ${key}: invalid block`);
  check(!scheduleKeys.has(key), `schedule ${key}: duplicate block`);
  scheduleKeys.add(key);
  check(encounters.has(slot.encounter_id), `schedule ${key}: missing encounter ${slot.encounter_id}`);
  check(anchors.has(slot.anchor_id), `schedule ${key}: missing anchor ${slot.anchor_id}`);
  const anchor = map.anchors.find((item) => item.id === slot.anchor_id);
  check(anchor?.sliceState === "active", `schedule ${key}: anchor ${slot.anchor_id} is not active`);
  if (slot.news_before) check(news.has(slot.news_before), `schedule ${key}: missing news ${slot.news_before}`);
  const encounter = content.encounters.find((item) => item.id === slot.encounter_id);
  check(encounter?.day === slot.day && encounter?.block === slot.block, `schedule ${key}: encounter timing mismatch`);
}
for (let day = 1; day <= 7; day += 1) {
  for (const block of ["day", "night"]) check(scheduleKeys.has(`${day}:${block}`), `schedule: missing ${day}:${block}`);
}

const validSourceStatus = new Set(["fiction", "mixed", "documented", "inference", "accusation"]);
for (const encounter of content.encounters) {
  check(sites.has(encounter.site_id), `${encounter.id}: missing site ${encounter.site_id}`);
  if (encounter.anchor_override_id) check(anchors.has(encounter.anchor_override_id), `${encounter.id}: missing anchor override`);
  check(validSourceStatus.has(encounter.source_status), `${encounter.id}: invalid source status`);
  check(typeof encounter.opening === "string" && encounter.opening.length >= 30, `${encounter.id}: opening is too thin`);
  check(Array.isArray(encounter.inspectables) && encounter.inspectables.length >= 2, `${encounter.id}: needs at least two inspectables`);
  check(Array.isArray(encounter.choices) && encounter.choices.length >= 3, `${encounter.id}: needs at least three choices`);
  const choiceIds = new Set();
  for (const choice of encounter.choices ?? []) {
    check(choice.id && !choiceIds.has(choice.id), `${encounter.id}: duplicate or missing choice id`);
    choiceIds.add(choice.id);
    check(typeof choice.forecast === "string" && choice.forecast.length >= 20, `${encounter.id}/${choice.id}: missing forecast`);
    check(Array.isArray(choice.requirements), `${encounter.id}/${choice.id}: requirements must be an array`);
    check(Array.isArray(choice.effects) && choice.effects.length > 0, `${encounter.id}/${choice.id}: effects required`);
  }
  if (encounter.mission_id) check(missions.has(encounter.mission_id), `${encounter.id}: missing mission ${encounter.mission_id}`);
  if (encounter.source_status === "mixed") {
    check(Boolean(encounter.documented_fact), `${encounter.id}: mixed record needs documented_fact`);
    check(Boolean(encounter.fiction), `${encounter.id}: mixed record needs fiction boundary`);
  }
}

for (const offer of content.market_offers) {
  check(products.has(offer.product_id), `${offer.id}: unknown product ${offer.product_id}`);
  check(anchors.has(offer.anchor_id), `${offer.id}: unknown anchor ${offer.anchor_id}`);
  check(encounters.has(offer.revealed_by) || missions.has(offer.revealed_by), `${offer.id}: invalid reveal source ${offer.revealed_by}`);
  check(["rumour", "range", "quote"].includes(offer.confidence), `${offer.id}: invalid confidence`);
  check(Boolean(offer.dominant_cause), `${offer.id}: price needs a readable dominant cause`);
}

const expectedRoles = new Set(["runner", "muscle", "watcher", "fixer", "driver", "local"]);
check(new Set(content.crew.map((item) => item.role)).size === 6, "crew must cover six distinct field roles");
for (const member of content.crew) {
  check(member.age >= 18, `${member.id}: every recruit must be an adult`);
  check(expectedRoles.has(member.role), `${member.id}: invalid field role`);
  check(anchors.has(member.origin_anchor_id), `${member.id}: invalid origin anchor`);
  check(encounters.has(member.recruit_encounter_id), `${member.id}: invalid recruitment encounter`);
  check(member.strength && member.liability, `${member.id}: needs strength and liability`);
  check(member.competencies?.length === 2, `${member.id}: needs exactly two core competencies`);
  for (const item of member.initial_equipment) check(equipment.has(item), `${member.id}: unknown equipment ${item}`);
}

const missionFamilies = new Set(content.missions.map((item) => item.family));
for (const family of ["delivery-collection", "information", "protection", "recovery"]) {
  check(missionFamilies.has(family), `missing mission family ${family}`);
}
for (const mission of content.missions) {
  check(encounters.has(mission.signal_encounter_id), `${mission.id}: invalid signal encounter`);
  check(anchors.has(mission.destination_anchor_id), `${mission.id}: invalid destination`);
  if (mission.battle_id) check(battles.has(mission.battle_id), `${mission.id}: invalid battle ${mission.battle_id}`);
  check(mission.approaches?.length >= 2, `${mission.id}: needs approach choices`);
  for (const outcome of ["success_effects", "partial_effects", "failure_effects"]) {
    check(Array.isArray(mission[outcome]) && mission[outcome].length > 0, `${mission.id}: missing ${outcome}`);
  }
}

const formats = new Set(content.battles.map((item) => item.format));
check(formats.has("2v2") && formats.has("3v3"), "battles must include one 2v2 and one 3v3");
check(content.missions.some((item) => item.battle_avoidance?.requires_any?.some((rule) => rule.includes("toko"))), "one battle must be avoidable through Toko information");
for (const battle of content.battles) {
  const expected = Number(battle.format[0]);
  check(battle.player_deployed === expected, `${battle.id}: deployed count disagrees with format`);
  check(battle.opponents.length === expected, `${battle.id}: opponent count disagrees with format`);
  check(JSON.stringify(battle.grid.rows) === JSON.stringify(["front", "middle", "back"]), `${battle.id}: rows must be front, middle, back`);
  check([3, 4].includes(battle.grid.lanes), `${battle.id}: formation must use three or four lanes`);
  check(battle.opponents.every((item) => !item.id.includes("aatami") && !item.name.toLowerCase().includes("aatami")), `${battle.id}: Aatami cannot be a regular field unit`);
  check(Boolean(battle.withdrawal), `${battle.id}: withdrawal must be available and forecast`);
  check(Boolean(battle.casualty_table?.telegraph), `${battle.id}: casualty risk needs telegraphing`);
}
const lethalBattle = content.battles.find((item) => item.casualty_table.death !== "not-eligible-in-this-battle");
check(Boolean(lethalBattle?.casualty_table?.mitigation?.length), "possible death must expose mitigation");

for (const bulletin of content.news) {
  check(bulletin.presenter === "Arvo Linde", `${bulletin.id}: bulletin presenter must be Arvo Linde`);
  check(Boolean(bulletin.documented), `${bulletin.id}: documented field required`);
  check(Object.hasOwn(bulletin, "inference"), `${bulletin.id}: inference field required`);
  check(Object.hasOwn(bulletin, "accusation"), `${bulletin.id}: accusation field required`);
  check(Boolean(bulletin.fiction), `${bulletin.id}: fiction field required`);
  check(bulletin.sources?.length >= 1 && bulletin.sources.every((url) => url.startsWith("https://")), `${bulletin.id}: authoritative https source required`);
}
check(content.news[0].documented.includes("5.94573"), "markka bulletin must preserve the fixed conversion rate");
check(content.encounters.some((item) => item.id === "enc-first-firearm"), "first firearm must be an authored encounter");
check(content.encounters.some((item) => item.id === "enc-first-purchase"), "first purchase must be an authored encounter");
{
  const buy = content.encounters.find((item) => item.id === "enc-first-purchase")?.choices.find((item) => item.id === "buy");
  const sale = content.encounters.find((item) => item.id === "enc-first-sale")?.choices.find((item) => item.id === "complete");
  const buyCost = Math.abs(Number(buy?.effects.find((effect) => effect.startsWith("cash:-"))?.split(":")[1] ?? 0));
  const saleValue = Number(sale?.effects.find((effect) => effect.startsWith("cash:+"))?.split(":")[1] ?? 0);
  check(buyCost > 0 && saleValue > buyCost, "the opening sale must visibly return more cash than the first purchase costs");
}
check(content.encounters.some((item) => item.id === "enc-toko-quiet-voice"), "Toko must be a recurring location encounter");

const artIds = new Set();
const artFiles = [];
const addArtId = (id, context) => {
  check(Boolean(id), `${context}: missing art id`);
  check(!artIds.has(id), `${context}: duplicate art id ${id}`);
  artIds.add(id);
};
const addArtFile = (item, inherited, context) => {
  const file = item.file;
  check(Boolean(file), `${context}: missing file`);
  if (!file) return;
  const absolute = resolve(dirname(artManifestPath), file);
  artFiles.push({ absolute, item: { ...inherited, ...item }, context });
};
for (const asset of art.assets) {
  addArtId(asset.id, "art asset");
  check(["approved", "semi-approved"].includes(asset.approval_status), `${asset.id}: invalid approval status`);
  check(Boolean(asset.production_status), `${asset.id}: production status required`);
  if (asset.file) addArtFile(asset, {}, asset.id);
  for (const member of asset.members ?? []) {
    addArtId(member.id, asset.id);
    addArtFile(member, asset, member.id);
  }
  for (const frame of asset.frames ?? []) addArtFile(frame, asset, `${asset.id}/${frame.pose}`);
}
for (const ref of content.asset_refs) check(artIds.has(ref), `content asset ref missing from manifest: ${ref}`);
for (const member of content.crew) {
  for (const key of ["portrait_asset_id", "torso_asset_id", "legs_asset_id"]) check(artIds.has(member[key]), `${member.id}: missing art ${member[key]}`);
}
for (const item of content.equipment) check(artIds.has(item.asset_id), `${item.id}: missing art ${item.asset_id}`);
for (const battle of content.battles) check(artIds.has(battle.scene_asset_id), `${battle.id}: missing scene art ${battle.scene_asset_id}`);
for (const encounter of content.encounters.filter((item) => item.scene_asset_id)) check(artIds.has(encounter.scene_asset_id), `${encounter.id}: missing scene art`);

for (const { absolute, item, context } of artFiles) {
  check(existsSync(absolute), `${context}: file does not exist: ${absolute}`);
  if (!existsSync(absolute)) continue;
  check(statSync(absolute).size > 0, `${context}: file is empty`);
  check(!absolute.includes("archive/needs-rework"), `${context}: archive asset may not be a runtime dependency`);
  if (absolute.endsWith(".webp")) {
    const header = readFileSync(absolute).subarray(0, 12);
    check(header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP", `${context}: invalid WebP header`);
  }
  if (item.sha256) {
    const digest = createHash("sha256").update(readFileSync(absolute)).digest("hex");
    check(digest === item.sha256, `${context}: sha256 mismatch`);
  }
}

if (errors.length) {
  console.error(`SLICE INVALID (${errors.length} errors)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `SLICE OK: ${content.campaign.days} days, ${content.schedule.length} blocks, ` +
  `${content.encounters.length} encounters, ${content.missions.length} missions, ` +
  `${content.battles.map((item) => item.format).join(" + ")}, ${content.crew.length} crew, ` +
  `${artIds.size} registered art ids and ${artFiles.length} runtime files.`
);
