// Narrative state is derived from the campaign; viewing it never grants rewards.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function chapterPeople(state, content) {
  const chapter = content.chapters?.find(item => item.index === state.chapter);
  const narrative = chapter?.narrative;
  if (!narrative) return [];
  const schedule = content.schedule ?? [];
  return narrative.people.map(person => ({
    ...person,
    beats: person.beats.map(beat => {
      const index = schedule.findIndex(slot => beat.kind === 'news'
        ? slot.news_before === beat.id : slot.encounter_id === beat.id);
      const completed = beat.kind === 'news'
        ? (state.newsSeen ?? []).includes(beat.id) : Boolean(state.choices?.[beat.id]);
      const status = completed ? 'remembered' : index < 0 ? 'unavailable'
        : index < state.scheduleIndex ? 'passed' : index === state.scheduleIndex ? 'now' : 'ahead';
      return {...beat, status, day: schedule[index]?.day, block: schedule[index]?.block};
    }),
  }));
}

export function renderChapterPeople(state, content) {
  const people = chapterPeople(state, content);
  if (!people.length) return '';
  return `<section class="paper-panel" aria-label="People in this chapter">
    <p class="section-label">ACT I · KALLIO 2003</p>
    <h2 class="section-title">PEOPLE AND PLACES</h2>
    <p>Family, favours and the evening news follow the same week. Your choices stay in the ledger.</p>
    ${people.map(person => `<details><summary class="paper-button">${esc(person.name)} · ${esc(person.location)}</summary>
      <p>${esc(person.introduction)}</p>
      <ul>${person.beats.map(beat => `<li><strong>${esc(({remembered:'Remembered',passed:'Passed',now:'This block',ahead:'Ahead',unavailable:'Unavailable'})[beat.status])}</strong>${beat.day ? ` · Day ${beat.day}, ${esc(beat.block)}` : ''}: ${esc(beat.status === 'remembered' ? beat.recollection : beat.teaser)}</li>`).join('')}</ul>
    </details>`).join('')}
  </section>`;
}

