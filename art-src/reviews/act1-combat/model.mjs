// Review data only. All measured values come from preserved fight-balance output.
export const SOURCES = {
  baseline12: { label: 'Baseline · 12 seeds', file: 'instrumented-default-12.json', seeds: 12, experiment: false, actions: true },
  baseline30: { label: 'Baseline · 30 seeds', file: 'baseline-30.json', seeds: 30, experiment: false, actions: false },
  dodge12: { label: 'Dodge first · 12 seeds', file: 'dodge-first-instrumented-12.json', seeds: 12, experiment: true, actions: true },
  dodge30: { label: 'Dodge first · 30 seeds', file: 'dodge-first-30.json', seeds: 30, experiment: true, actions: true },
};
export const POLICY_NAMES = { fight: 'Aggressive', careful: 'Careful', focused: 'Focused', run: 'Straight out', escort: 'Escort' };
export const rowKey = row => [row.fight, row.heat, row.policy].join('|');
export function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw Error('Evidence must contain rows');
  const keys = new Set();
  for (const row of rows) {
    if (keys.has(rowKey(row))) throw Error('Duplicate evidence row');
    keys.add(rowKey(row));
    for (const key of ['win', 'withdraw', 'loss', 'police', 'downed', 'stuck']) {
      if (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0 || Number(row[key]) > 100) throw Error('Invalid percentage: ' + key);
    }
    for (const key of ['rounds', 'hpLost', 'downs']) if (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0) throw Error('Invalid measurement: ' + key);
    if (!['fight', 'getaway'].includes(row.goal) || ![0, 2, 3].includes(row.heat)) throw Error('Unexpected goal/heat');
  }
  if (new Set(rows.map(row => row.fight)).size !== 15 || rows.length !== 147) throw Error('Expected all 15 Act I fights / 147 rows');
  return rows;
}
export function selectRow(rows, fight, heat, policy) { return rows.find(row => row.fight === fight && row.heat === Number(heat) && row.policy === policy) || null; }
export function peers(rows, fight, heat) { return rows.filter(row => row.fight === fight && row.heat === Number(heat)); }
export function comparison(rows, fight, heat) {
  const aggressive = selectRow(rows, fight, heat, 'fight'), careful = selectRow(rows, fight, heat, 'careful');
  if (!aggressive || !careful) return null;
  return { winPoints: +(Number(careful.win) - Number(aggressive.win)).toFixed(2), hpSaved: +(Number(aggressive.hpLost) - Number(careful.hpLost)).toFixed(2), extraRounds: +(Number(careful.rounds) - Number(aggressive.rounds)).toFixed(2) };
}
export const metricText = (row, key, suffix = '') => row?.[key] === undefined ? 'Not measured' : `${row[key]}${suffix}`;
export const PROPOSALS = [
  { id: 'intent', title: 'Intent beside the threatened fighter', label: 'Threat · odds + damage', text: 'Keep the current world-anchored threat badge. Explore a short pinned explanation when its fighter is selected; odds, HP/guard cost and MAY FALL must remain visible.', source: 'UI_DIET.md step 2; C19_READABILITY.md; current v4.96 threat badges', acceptance: 'At phone width every threatened fighter keeps a readable badge in tactical, oblique and overhead views; the explanation never covers the chosen target.' },
  { id: 'target', title: 'Target preview before commitment', label: 'Preview · no action spent', text: 'A selected target should read as the commitment destination. Explore a quieter target outline and one concise Confirm / Cancel strip; preserve exact live forecasts and optional Aim view.', source: 'C19_READABILITY.md; COMBAT.md promise; fight-module targeting', acceptance: 'Select, preview, cancel and rotate without spending resources. Confirm commits once and the selected/target rings remain visually distinct.' },
  { id: 'move', title: 'Movement feedback at the destination', label: 'Move · uncommitted route', text: 'Explore a compact destination marker and a short route trace while previewing movement. Keep real reachable cells and the existing Move + Act in either order; do not introduce a second board.', source: 'DESIGN_AUTHORITY.md, 13 September; current tactics routes', acceptance: 'Free previews show the actual route and cost. Confirm uses the same command path. Invalid cells explain refusal without moving the fighter.' },
  { id: 'pressure', title: 'Pressure as a visible clock', label: 'Pressure · police at 6', text: 'Preserve the existing pressure line and arrival warning. Explore a small round-boundary pulse and an expanded risk line on request, with reduced-motion stillness.', source: 'ROADMAP.md G1 targets; C19_CAMPAIGN_FIGHTS.md §6', acceptance: 'Heat 0/2/3 show their actual starting pressure. The warning is visible before arrival and police choices name who is taken.' },
  { id: 'exit', title: 'Exit and withdrawal cost stay distinct', label: 'Exit · objective / withdrawal', text: 'Keep the south-edge exit in the 3D place. Explore a selected-carrier cue beside it; getaway victory and withdrawing from a fight must not look equivalent.', source: 'C19_CAMPAIGN_FIGHTS.md §6; C19_READABILITY.md', acceptance: 'A player can identify the way out and the job before committing. Extraction, withdrawal and police settlement retain their authored costs and exactly-once receipts.' },
];
