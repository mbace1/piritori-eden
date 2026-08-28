/**
 * The pause menu, and the THINGS TO TEST list inside it.
 *
 * Self-contained: it owns its own markup and its own key handling, and talks to
 * the game through one `jump` callback. That is deliberate — a test menu that
 * reaches into the app's internals becomes the reason a refactor breaks the
 * only tool for looking at the app.
 *
 * See `testlist.js` for the list itself and for why approval stamps a rev
 * rather than a tick.
 */
import { TESTS, partition, approve, unapprove } from './testlist.js?v=1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);

const BUILD_LABEL = {
  js: { tag: 'THIS BUILD', hint: '' },
  godot: { tag: 'GODOT', hint: 'checked in the port — no jump from here' },
  both: { tag: 'BOTH', hint: 'jump here, then check the same screen in the port' },
};

export function createPauseMenu({ root, version, jump, onClose }) {
  let view = 'menu';        // 'menu' | 'tests'
  let showDone = false;
  let lastFocus = null;

  root.className = 'pause-veil';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Paused');

  function counts() {
    const { open, done } = partition(TESTS);
    return { open, done };
  }

  function render() {
    const { open, done } = counts();
    root.innerHTML = view === 'menu' ? menuMarkup(open, done) : testsMarkup(open, done);
    const first = root.querySelector('button:not([disabled])');
    if (first) first.focus();
  }

  function menuMarkup(open, done) {
    return `<section class="pause-card">
      <p class="eyebrow">PAUSED · ${esc(version)}</p>
      <h2 class="section-title">PIRITORI <span aria-hidden="true">→</span> EDEN</h2>
      <div class="pause-actions">
        <button class="paper-button primary" data-pause="resume" type="button">RESUME</button>
        <button class="paper-button" data-pause="tests" type="button">
          THINGS TO TEST <span class="pause-count">${open.length}</span>
        </button>
      </div>
      <p class="pause-foot">${done.length
        ? `${done.length} approved. An item comes back if the screen it points at moves.`
        : 'Nothing approved yet.'}</p>
    </section>`;
  }

  function testsMarkup(open, done) {
    const list = open.length
      ? open.map(item).join('')
      : `<li class="test-empty"><p><b>Nothing left to look at.</b></p>
          <p>Every screen on the list has been approved at its current revision.
          One will come back the moment the thing it points at changes.</p></li>`;

    const doneList = !showDone || !done.length ? '' :
      `<ul class="test-list done">${done.map(doneItem).join('')}</ul>`;

    return `<section class="pause-card wide">
      <p class="eyebrow">THINGS TO TEST · ${esc(version)}</p>
      <h2 class="section-title">${open.length} TO LOOK AT</h2>
      <p class="pause-lede">Screens that are hard to reach by playing. Each says what to
        look for. Approving one removes it — until the screen changes.</p>
      <ul class="test-list">${list}</ul>
      ${done.length ? `<button class="paper-button ghost" data-pause="toggle-done" type="button">
        ${showDone ? 'HIDE' : 'SHOW'} ${done.length} APPROVED</button>` : ''}
      ${doneList}
      <div class="pause-actions">
        <button class="paper-button" data-pause="menu" type="button">BACK</button>
        <button class="paper-button primary" data-pause="resume" type="button">RESUME</button>
      </div>
    </section>`;
  }

  function item(t) {
    const build = BUILD_LABEL[t.build] ?? BUILD_LABEL.js;
    const canJump = Boolean(t.jump);
    return `<li class="test-item${t.changed ? ' changed' : ''}">
      <div class="test-head">
        <h3>${esc(t.title)}</h3>
        <span class="test-build build-${esc(t.build)}">${esc(build.tag)}</span>
      </div>
      <p class="test-where">${esc(t.where)}</p>
      ${t.changed ? `<p class="test-changed">CHANGED since you approved it at rev ${esc(t.approvedRev)}${t.approvedAt ? ` on ${esc(t.approvedAt)}` : ''} — worth another look.</p>` : ''}
      <p class="test-note">${esc(t.note)}</p>
      <div class="test-actions">
        ${canJump
          ? `<button class="paper-button" data-pause="jump" data-test="${esc(t.id)}" type="button">GO THERE</button>`
          : `<span class="test-hint">${esc(build.hint)}</span>`}
        <button class="paper-button ghost" data-pause="approve" data-test="${esc(t.id)}" type="button">APPROVE</button>
      </div>
    </li>`;
  }

  function doneItem(t) {
    return `<li class="test-item approved">
      <div class="test-head">
        <h3>${esc(t.title)}</h3>
        <span class="test-build build-${esc(t.build)}">rev ${esc(t.rev)}</span>
      </div>
      <p class="test-where">approved${t.approvedAt ? ` ${esc(t.approvedAt)}` : ''}${t.approvedVersion ? ` · ${esc(t.approvedVersion)}` : ''}</p>
      <div class="test-actions">
        <button class="paper-button ghost" data-pause="unapprove" data-test="${esc(t.id)}" type="button">PUT IT BACK</button>
      </div>
    </li>`;
  }

  function open_() {
    lastFocus = document.activeElement;
    view = 'menu';
    root.hidden = false;
    render();
  }

  function close() {
    root.hidden = true;
    root.innerHTML = '';
    if (lastFocus?.isConnected) lastFocus.focus();
    onClose?.();
  }

  root.addEventListener('click', event => {
    // The veil itself closes; a click inside the card does not.
    if (event.target === root) { close(); return; }
    const button = event.target.closest('[data-pause]');
    if (!button) return;
    const what = button.dataset.pause;
    const id = button.dataset.test;
    if (what === 'resume') close();
    else if (what === 'tests') { view = 'tests'; render(); }
    else if (what === 'menu') { view = 'menu'; render(); }
    else if (what === 'toggle-done') { showDone = !showDone; render(); }
    else if (what === 'approve') { approve(id, version); render(); }
    else if (what === 'unapprove') { unapprove(id); render(); }
    else if (what === 'jump') {
      const test = TESTS.find(t => t.id === id);
      if (!test?.jump) return;
      close();
      jump(test.jump, test);
    }
  });

  // Esc backs out one level rather than closing from the sub-list, so a stray
  // press does not throw away the list you were reading.
  //
  // stopPropagation is load-bearing, not tidiness. The app binds Esc on the
  // WINDOW to open this menu, and that listener fires after this one on the way
  // up — so closing here left `isOpen` false by the time the window saw the
  // same keypress, and it opened the menu straight back up. Esc appeared to do
  // nothing at all.
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (view === 'tests') { view = 'menu'; render(); } else close();
  });

  return {
    open: open_,
    close,
    get isOpen() { return !root.hidden; },
    toggle() { root.hidden ? open_() : close(); },
    counts,
  };
}
