import '../../styles/base.css';
import './styles.css';
import { mountSiteChrome } from '../../shared/site.js';
import { readJSON, writeJSON } from '../../shared/storage.js';
import { CONFIG } from './config.js';
import { DinoEngine } from './engine.js';
import { bindDinoInput } from './input.js';
import { DinoRenderer, loadDinoSprite } from './renderer.js';

mountSiteChrome({ footerNote: '再多跑一点点。' });

const byId = (id) => document.getElementById(id);
const ui = {
  canvas: byId('dino-canvas'),
  stage: byId('runner-stage'),
  panel: document.querySelector('.runner-panel'),
  overlay: byId('runner-overlay'),
  title: byId('overlay-title'),
  description: byId('overlay-description'),
  eyebrow: byId('overlay-eyebrow'),
  primary: byId('primary-action'),
  pause: byId('pause-run'),
  jump: byId('jump-control'),
  duck: byId('duck-control'),
  score: byId('score'),
  best: byId('best-score'),
  speed: byId('speed-label'),
  cleared: byId('cleared-label'),
  state: byId('run-state'),
  feedback: byId('run-feedback'),
  notice: byId('record-notice'),
};
const engine = new DinoEngine();
const stored = readJSON(CONFIG.storageKey);
const validRecord = (record) =>
  record?.version === 1 && Number.isSafeInteger(record.best) && record.best >= 0;
let best = validRecord(stored.value) ? stored.value.best : 0;
let storageAvailable = stored.available;
let roundBest = best;
let renderer = null;
let input = null;
let resizeObserver = null;
let frameId = 0;
let previousTime = 0;
let accumulator = 0;
let lastCrashTime = 0;
let lastSavedMilestone = 0;
let failed = false;
let disposed = false;
const abort = new AbortController();
const signal = abort.signal;
const formatScore = (value) => String(value).padStart(5, '0');

function showStorageNotice() {
  ui.notice.textContent = storageAvailable
    ? '最高分自动保存在当前浏览器。'
    : '浏览器未允许保存，最高分仅保留到本次页面关闭。';
}

function persistBest() {
  const latest = readJSON(CONFIG.storageKey);
  if (validRecord(latest.value)) best = Math.max(best, latest.value.best);
  storageAvailable = writeJSON(CONFIG.storageKey, { version: 1, best });
  showStorageNotice();
}

function updateHUD() {
  best = Math.max(best, engine.score);
  ui.score.textContent = formatScore(engine.score);
  ui.best.textContent = formatScore(best);
  ui.speed.textContent = `速度 ${(engine.speed / CONFIG.initialSpeed).toFixed(1)}×`;
  ui.cleared.textContent = `已越过 ${engine.cleared} 个障碍`;
  ui.stage.classList.toggle('is-night', engine.night);
  if (Math.floor(best / 100) > lastSavedMilestone) {
    lastSavedMilestone = Math.floor(best / 100);
    persistBest();
  }
}

function draw() {
  renderer?.draw(engine);
  updateHUD();
}

function updateControls(reason = '') {
  const running = engine.status === 'running';
  ui.panel.classList.toggle('is-running', running);
  ui.overlay.hidden = running;
  ui.primary.disabled = !renderer;
  ui.pause.disabled = !['running', 'paused'].includes(engine.status);
  ui.pause.textContent = engine.status === 'paused' ? '继续 ▶' : '暂停 Ⅱ';
  ui.pause.setAttribute('aria-pressed', String(engine.status === 'paused'));
  ui.jump.disabled = !renderer || engine.status === 'paused';
  ui.duck.disabled = !renderer || !running;
  ui.state.textContent = {
    ready: '等待出发',
    running: '正在奔跑',
    paused: '已暂停',
    over: '本局结束',
  }[engine.status];
  if (running) return;
  if (engine.status === 'ready') {
    ui.eyebrow.textContent = 'A LITTLE RUN. A LITTLE FUN.';
    ui.title.textContent = '准备好，跑一会儿。';
    ui.description.textContent = '按空格、点击画面，或从这里开始。';
    ui.primary.textContent = '开始奔跑 ↗';
  } else if (engine.status === 'paused') {
    ui.eyebrow.textContent = 'TAKE YOUR TIME.';
    ui.title.textContent = '休息一下，刚刚好。';
    ui.description.textContent = reason || '这一局已经暂停，小恐龙会在这里等你。';
    ui.primary.textContent = '继续奔跑 →';
  } else {
    ui.eyebrow.textContent = engine.score > roundBest ? 'A NEW PERSONAL BEST.' : 'ONE MORE TRY?';
    ui.title.textContent =
      engine.score > roundBest ? '新的纪录，跑出来了。' : '差一点点，再来一次？';
    ui.description.textContent = `本次 ${engine.score} 分，越过了 ${engine.cleared} 个障碍。`;
    ui.primary.textContent = '再跑一局 ↻';
  }
}

function stopLoop() {
  cancelAnimationFrame(frameId);
  frameId = 0;
  previousTime = 0;
  accumulator = 0;
}

function finishRound() {
  stopLoop();
  input.reset();
  lastCrashTime = performance.now();
  persistBest();
  updateControls();
  draw();
  ui.feedback.textContent = `本局结束：${engine.score} 分。按空格或点击“再跑一局”重新开始。`;
}

function frame(time) {
  if (disposed || engine.status !== 'running') return;
  const delta = previousTime
    ? Math.min(CONFIG.maxFrameSeconds, Math.max(0, (time - previousTime) / 1000))
    : 0;
  previousTime = time;
  accumulator += delta;
  while (accumulator >= CONFIG.fixedStep && engine.status === 'running') {
    engine.step(CONFIG.fixedStep);
    accumulator -= CONFIG.fixedStep;
  }
  draw();
  if (engine.status === 'over') finishRound();
  else frameId = requestAnimationFrame(frame);
}

function startLoop() {
  stopLoop();
  frameId = requestAnimationFrame(frame);
}

function startRound() {
  if (!renderer || disposed) return;
  persistBest();
  roundBest = best;
  stopLoop();
  input?.reset();
  engine.start();
  updateControls();
  draw();
  ui.feedback.textContent = '出发！短按小跳，长按高跳，注意前方的障碍。';
  ui.canvas.focus({ preventScroll: true });
  startLoop();
}

function pauseRound(reason = '') {
  if (engine.status !== 'running') return;
  engine.pause();
  stopLoop();
  input?.reset();
  persistBest();
  updateControls(reason);
  draw();
  ui.feedback.textContent = reason || '游戏已暂停。按 P 或点击“继续奔跑”返回。';
}

function resumeRound() {
  if (!renderer || engine.status !== 'paused' || document.hidden) return;
  input?.reset();
  engine.resume();
  updateControls();
  draw();
  ui.feedback.textContent = '欢迎回来，继续向前跑。';
  ui.canvas.focus({ preventScroll: true });
  startLoop();
}

function togglePause() {
  if (engine.status === 'running') pauseRound();
  else if (engine.status === 'paused') resumeRound();
}

ui.primary.addEventListener(
  'click',
  () => {
    if (failed) {
      window.location.reload();
      return;
    }
    if (engine.status === 'paused') resumeRound();
    else startRound();
  },
  { signal },
);
ui.pause.addEventListener('click', togglePause, { signal });
document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden) pauseRound('离开页面时已自动暂停，回来后点击继续。');
  },
  { signal },
);
window.addEventListener('blur', () => pauseRound('已自动暂停，准备好后继续即可。'), { signal });
window.addEventListener(
  'pagehide',
  () => {
    pauseRound();
    persistBest();
  },
  { signal },
);

async function initialize() {
  try {
    const image = await loadDinoSprite();
    if (disposed) return;
    renderer = new DinoRenderer(ui.canvas, image);
    engine.width = renderer.width;
    input = bindDinoInput({
      canvas: ui.canvas,
      jumpButton: ui.jump,
      duckButton: ui.duck,
      onJump() {
        if (engine.status === 'over' && performance.now() - lastCrashTime < 500) return;
        if (engine.status === 'ready' || engine.status === 'over') startRound();
        engine.jump();
        ui.canvas.focus({ preventScroll: true });
      },
      onReleaseJump: () => engine.releaseJump(),
      onDuck: (held) => engine.setDuck(held),
      onPause: togglePause,
      onRestart: startRound,
    });
    resizeObserver = new ResizeObserver(() => {
      const previousWidth = renderer.width;
      renderer.resize();
      engine.width = renderer.width;
      if (Math.abs(renderer.width - previousWidth) > 1)
        pauseRound('画面尺寸已变化，准备好后继续奔跑。');
      draw();
    });
    resizeObserver.observe(ui.canvas);
    updateControls();
    draw();
    showStorageNotice();
    ui.feedback.textContent = '不必断网，随时开跑。';
  } catch (error) {
    failed = true;
    ui.title.textContent = '游戏资源未能加载';
    ui.description.textContent = '请刷新页面再试一次。';
    ui.primary.textContent = '重新加载';
    ui.primary.disabled = false;
    ui.feedback.textContent = '小恐龙暂时无法开始，请检查页面资源是否完整。';
    console.error(error);
  }
}

initialize();
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true;
    abort.abort();
    stopLoop();
    input?.destroy();
    resizeObserver?.disconnect();
    persistBest();
  });
}
