const ROOT = new URL('../../../', import.meta.url);
export const REVIEW_KEY = 'piritori:review:act1-workbench:v1';
const read = async url => { const r = await fetch(url); if (!r.ok) throw Error(`Cannot read ${url}: ${r.status}`); return r.json(); };
const [plans, content, doors, road] = await Promise.all([read(new URL('packets.json', import.meta.url)), read(new URL('content/era1-slice-v1.json', ROOT)), read(new URL('content/doors-v1.json', ROOT)), read(new URL('content/road-events-v1.json', ROOT))]);
let review = { shortlist: [], notes: '' };
try { const kept = JSON.parse(localStorage.getItem(REVIEW_KEY) || 'null'); if (kept && Array.isArray(kept.shortlist) && typeof kept.notes === 'string') review = kept; } catch { /* A corrupt review never touches campaign recovery. */ }
const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
const save = () => { try { localStorage.setItem(REVIEW_KEY, JSON.stringify(review)); document.querySelector('#saved').textContent = 'Saved to this review browser.'; } catch { document.querySelector('#saved').textContent = 'Browser storage unavailable; export to keep these notes.'; } };
const previewGrid = document.querySelector('#preview-grid');
for (const section of plans.previews) {
  const card = el('article', null, `preview-card ${section.kind === 'plan' ? 'planning' : ''}`);
  card.append(el('span', section.label, 'tag'), el('h3', section.title), el('p', section.description));
  const link = el('a', section.action, 'launch'); link.href = section.href; card.append(link);
  card.append(el('span', section.status, 'state')); previewGrid.append(card);
}
const slots = content.schedule || [];
document.querySelector('#facts').textContent = `${new Set(slots.map(s => s.day)).size} days · ${slots.length} blocks · ${content.encounters.length} encounters · ${doors.templates.length} door templates · ${road.events.length} road events`;
const milestone = document.querySelector('#milestone'), search = document.querySelector('#search'), only = document.querySelector('#only-shortlist'), tasks = document.querySelector('#tasks');
function renderTasks() {
  const q = search.value.trim().toLowerCase();
  const rows = plans.tasks.filter(t => (milestone.value === 'all' || String(t.milestone) === milestone.value) && (!only.checked || review.shortlist.includes(t.id)) && (!q || JSON.stringify(t).toLowerCase().includes(q)));
  tasks.replaceChildren(); document.querySelector('#plan-count').textContent = `${rows.length} of ${plans.tasks.length} work packets`; document.querySelector('#empty').hidden = rows.length > 0;
  for (const task of rows) {
    const row = el('article', null, 'task'); row.dataset.task = task.id;
    const body = el('div'), meta = el('div', null, 'meta'); meta.append(el('span', task.id), el('span', `Milestone ${task.milestone}`), el('span', task.lane), el('span', task.status));
    body.append(meta, el('h3', task.title), el('p', task.change), el('p', `Passes when: ${task.acceptance}`, 'acceptance'));
    const details = el('details'); details.append(el('summary', 'Sources and limits'), el('p', task.boundary));
    const links = el('div', null, 'links');
    for (const source of task.sources) { const a = el('a', source); a.href = new URL(source, ROOT).href; links.append(a); }
    if (task.preview) { const a = el('a', 'Open related preview'); a.href = task.preview; links.append(a); }
    details.append(links); body.append(details); row.append(body);
    const mark = el('button', review.shortlist.includes(task.id) ? 'Shortlisted' : 'Shortlist'); mark.type = 'button'; mark.setAttribute('aria-pressed', String(review.shortlist.includes(task.id))); mark.setAttribute('aria-label', `Shortlist ${task.title}`);
    mark.onclick = () => { review.shortlist = review.shortlist.includes(task.id) ? review.shortlist.filter(id => id !== task.id) : [...review.shortlist, task.id]; save(); renderTasks(); };
    row.append(mark); tasks.append(row);
  }
}
for (const input of [milestone, search, only]) input.addEventListener('input', renderTasks);
document.querySelector('#filters').addEventListener('submit', event => event.preventDefault());
const notes = document.querySelector('#review-notes'); notes.value = review.notes; notes.addEventListener('input', () => { review.notes = notes.value; save(); });
document.querySelector('#reset').onclick = () => { review = {shortlist: [], notes: ''}; notes.value = ''; save(); renderTasks(); };
document.querySelector('#export').onclick = () => { const data = {...review, kind:'Piritori Act I review preferences, not approvals or implementation status', estimate:48, exportedAt:new Date().toISOString()}; const a = el('a'); a.download = 'piritori-act1-review.json'; a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'})); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
renderTasks();
window.__act1Workbench = {ready:true, key:REVIEW_KEY, taskCount:plans.tasks.length, previewCount:plans.previews.length};
