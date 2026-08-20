// Heat — Piritori's reading of the neutral pressure signals.
//
// The brief is strict and it is right: heat belongs to NODES AND EDGES, never a
// global wanted bar. A wanted bar tells you that you are in trouble; a stained
// edge tells you WHERE, which is the only version you can do anything about.
//
// BRIEF § Pressure/heat, implemented as written: it grows through high volume,
// repeated routes, risky payloads and visible incidents; it cools through time
// and changed behaviour; thresholds are telegraphed before an inspection or a
// closure; and there is no gunfight — the response is rerouting, abandoning
// stock, sacrificing profit or accepting the closure.
//
// "Ordinary traffic is the cover" (pillar 2) is read off the core's
// `visibility` signal: the share of movement on an edge carrying a tagged
// payload. A crowded tram is slow but anonymous; a private walk is direct but
// conspicuous.

export const THRESHOLD = { notice: 0.34, warn: 0.62, act: 0.85 };

export class Heat {
  constructor(flow) {
    this.flow = flow;
    this.edge = new Map();
    this.node = new Map();
    for (const id of flow.graph.edges.keys()) this.edge.set(id, 0);
    for (const id of flow.graph.nodes.keys()) this.node.set(id, 0);
    this.warned = new Set();
    this.inspections = [];
  }

  step(tick) {
    const p = this.flow.pressure;
    for (const [id] of this.flow.graph.edges) {
      const r = p.read(id);
      // exposure, not traffic: a tagged payload alone on an edge is loud
      const gain = r.visibility * (0.35 + r.repetition * 0.02) * 0.010;
      const cur = this.edge.get(id) * 0.9985 + gain;
      this.edge.set(id, Math.max(0, Math.min(1.2, cur)));
    }
    for (const [id] of this.flow.graph.nodes) {
      const r = p.readNode(id);
      const cur = this.node.get(id) * 0.999 + r.failure * 0.004;
      this.node.set(id, Math.max(0, Math.min(1.2, cur)));
    }
  }

  hottest() {
    let id = null, v = -1;
    for (const [k, n] of this.edge) if (n > v) { v = n; id = k; }
    return { id, heat: v };
  }

  // Thresholds are telegraphed BEFORE anything happens — the brief forbids
  // random punishment without a readable warning, and a closure the player
  // could not have seen coming reads as the game cheating.
  pending() {
    const out = [];
    for (const [id, v] of this.edge) {
      if (v >= THRESHOLD.warn && v < THRESHOLD.act && !this.warned.has(id)) {
        this.warned.add(id);
        out.push({ kind: 'warn', edge: id });
      }
      if (v >= THRESHOLD.act) out.push({ kind: 'act', edge: id });
    }
    return out;
  }

  // An inspection closes the edge and cools it — the response the brief wants
  // is rerouting and lost profit, never a gunfight.
  inspect(edgeId, tick) {
    const e = this.flow.graph.edge(edgeId);
    if (!e || e.closed) return null;
    e.closed = true;
    this.edge.set(edgeId, 0.2);
    this.warned.delete(edgeId);
    const rec = { edge: edgeId, until: tick + 240 };
    this.inspections.push(rec);
    this.flow.trips.replan();
    return rec;
  }

  lift(tick) {
    for (let i = this.inspections.length - 1; i >= 0; i--) {
      const r = this.inspections[i];
      if (r.until > tick) continue;
      const e = this.flow.graph.edge(r.edge);
      if (e) e.closed = false;
      this.inspections.splice(i, 1);
      this.flow.trips.replan();
    }
  }

  // Did this consignment's whole path run under the notice threshold? Reported
  // to the player as a fact about the route it took; it changes no money.
  pathClean(legs) {
    if (!legs) return false;
    for (const leg of legs) {
      const r = this.flow.routes.get(leg.routeId);
      if (!r) return false;
      const step = leg.toIdx > leg.fromIdx ? 1 : -1;
      for (let i = leg.fromIdx; i !== leg.toIdx; i += step) {
        const e = this.flow.graph.edgeBetween(r.nodes[i], r.nodes[i + step], r.mode);
        if (e && this.edge.get(e.id) > THRESHOLD.notice) return false;
      }
    }
    return true;
  }
}
