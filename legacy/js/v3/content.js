const CONTENT_URL = '../../content/era1-slice-v1.json';
const MAP_URL = '../../map/kallio-era1-2003-v1.json';
const ART_URL = '../../art/v3/manifest.json';

async function readJson(url) {
  const response = await fetch(new URL(url, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.json();
}

function flattenArt(manifest) {
  const byId = new Map();
  for (const group of manifest.assets) {
    if (group.file) byId.set(group.id, { ...group, url: `art/v3/${group.file}` });
    for (const member of group.members ?? []) {
      byId.set(member.id, {
        ...member,
        approval_status: group.approval_status,
        kind: group.kind,
        url: `art/v3/${member.file}`,
      });
    }
    for (const frame of group.frames ?? []) {
      const frameId = `${group.id}:${frame.pose}`;
      byId.set(frameId, {
        ...frame,
        id: frameId,
        approval_status: group.approval_status,
        kind: group.kind,
        url: `art/v3/${frame.file}`,
      });
    }
  }
  return byId;
}

function indexContent(content, map, artManifest) {
  return {
    content,
    map,
    artManifest,
    encounters: new Map(content.encounters.map(item => [item.id, item])),
    missions: new Map(content.missions.map(item => [item.id, item])),
    battles: new Map(content.battles.map(item => [item.id, item])),
    crew: new Map(content.crew.map(item => [item.id, item])),
    offers: new Map(content.market_offers.map(item => [item.id, item])),
    equipment: new Map(content.equipment.map(item => [item.id, item])),
    news: new Map(content.news.map(item => [item.id, item])),
    anchors: new Map(map.anchors.map(item => [item.id, item])),
    sites: new Map(map.sites.map(item => [item.id, item])),
    art: flattenArt(artManifest),
  };
}

export async function loadGameData() {
  const [content, map, artManifest] = await Promise.all([
    readJson(CONTENT_URL),
    readJson(MAP_URL),
    readJson(ART_URL),
  ]);
  return indexContent(content, map, artManifest);
}

export function shortestPath(map, from, to) {
  if (from === to) return [from];
  const links = new Map(map.anchors.map(anchor => [anchor.id, []]));
  for (const edge of map.edges) {
    links.get(edge.from)?.push(edge.to);
    links.get(edge.to)?.push(edge.from);
  }
  const queue = [from];
  const previous = new Map([[from, null]]);
  while (queue.length) {
    const node = queue.shift();
    for (const next of links.get(node) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, node);
      if (next === to) {
        const path = [to];
        let cursor = node;
        while (cursor) {
          path.unshift(cursor);
          cursor = previous.get(cursor);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

export function assetUrl(data, id) {
  return data.art.get(id)?.url ?? '';
}
