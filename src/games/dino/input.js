const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK_KEYS = new Set(['ArrowDown', 'KeyS']);

/** Keyboard, multi-touch and assistive button activation share the same actions. */
export function bindDinoInput({
  canvas,
  jumpButton,
  duckButton,
  onJump,
  onReleaseJump,
  onDuck,
  onPause,
  onRestart,
}) {
  const abort = new AbortController();
  const signal = abort.signal;
  const jumps = new Set();
  const ducks = new Set();
  const pressedKeys = new Set();

  function syncDuck() {
    duckButton.classList.toggle('is-held', ducks.size > 0);
    duckButton.setAttribute('aria-pressed', String(ducks.size > 0));
    onDuck(ducks.size > 0);
  }
  function pressJump(source) {
    if (jumps.has(source)) return;
    jumps.add(source);
    jumpButton.classList.add('is-held');
    onJump();
  }
  function releaseJump(source) {
    jumps.delete(source);
    if (!jumps.size) {
      jumpButton.classList.remove('is-held');
      onReleaseJump();
    }
  }
  function reset() {
    jumps.clear();
    ducks.clear();
    pressedKeys.clear();
    jumpButton.classList.remove('is-held');
    onReleaseJump();
    syncDuck();
  }

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target.isContentEditable ||
        event.target.closest('input, select, textarea')
      )
        return;
      if (['Space', 'Enter'].includes(event.code) && event.target.closest('button, a, summary'))
        return;
      const handled =
        JUMP_KEYS.has(event.code) ||
        DUCK_KEYS.has(event.code) ||
        ['KeyP', 'Escape', 'KeyR', 'Enter'].includes(event.code);
      if (!handled) return;
      event.preventDefault();
      if (event.repeat || pressedKeys.has(event.code)) return;
      pressedKeys.add(event.code);
      if (JUMP_KEYS.has(event.code)) pressJump(event.code);
      else if (DUCK_KEYS.has(event.code)) {
        ducks.add(event.code);
        syncDuck();
      } else if (event.code === 'KeyP' || event.code === 'Escape') onPause();
      else onRestart();
    },
    { signal },
  );

  document.addEventListener(
    'keyup',
    (event) => {
      pressedKeys.delete(event.code);
      if (JUMP_KEYS.has(event.code)) releaseJump(event.code);
      if (DUCK_KEYS.has(event.code)) {
        ducks.delete(event.code);
        syncDuck();
      }
    },
    { signal },
  );

  function bindPointer(element, action) {
    element.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0 || element.disabled) return;
        event.preventDefault();
        element.setPointerCapture(event.pointerId);
        const source = `${action}:${event.pointerId}`;
        if (action === 'jump') pressJump(source);
        else {
          ducks.add(source);
          syncDuck();
        }
      },
      { signal },
    );
    const release = (event) => {
      const source = `${action}:${event.pointerId}`;
      if (action === 'jump') releaseJump(source);
      else {
        ducks.delete(source);
        syncDuck();
      }
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      element.addEventListener(type, release, { signal });
    }
  }
  bindPointer(canvas, 'jump');
  bindPointer(jumpButton, 'jump');
  bindPointer(duckButton, 'duck');
  jumpButton.addEventListener(
    'click',
    (event) => {
      if (event.detail === 0) {
        onJump();
        onReleaseJump();
      }
    },
    { signal },
  );
  duckButton.addEventListener(
    'click',
    (event) => {
      if (event.detail !== 0) return;
      if (ducks.has('accessible-toggle')) ducks.delete('accessible-toggle');
      else ducks.add('accessible-toggle');
      syncDuck();
    },
    { signal },
  );

  return {
    reset,
    destroy() {
      reset();
      abort.abort();
    },
  };
}
