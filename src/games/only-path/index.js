import '../../styles/base.css';
import './styles.css';
import { mountSiteChrome } from '../../shared/site.js';
import { HISTORY_LIMIT } from './config.js';
import { analyzeRoute, isPlaceable } from './engine.js';
import { LEVELS } from './levels.js';
import { loadProgress, saveProgress } from './progress.js';
import { BoardView } from './renderer.js';

mountSiteChrome({ footerNote: '慢慢排除，总会找到答案。' });

const byId = (id) => document.getElementById('only-' + id);
const ui = Object.fromEntries(
  [
    'board',
    'chapter',
    'level-title',
    'level-number',
    'description',
    'undo',
    'redo',
    'reset',
    'used',
    'budget',
    'checks',
    'budget-note',
    'check',
    'feedback',
    'feedback-symbol',
    'feedback-title',
    'feedback-text',
    'counter-toggle',
    'continue',
    'best',
    'hint',
    'hint-text',
    'level-select',
    'completed',
    'previous',
    'next',
    'save-notice',
    'challenge',
    'challenge-entry',
    'board-size',
    'zoom',
  ].map((id) => [id, byId(id)]),
);
const { progress, available } = loadProgress(LEVELS);
const view = new BoardView(ui.board);
const events = new AbortController();
const listen = (target, event, handler) =>
  target.addEventListener(event, handler, { signal: events.signal });
let levelIndex = 0;
let level;
let walls = new Set();
let checks = 0;
let history = [];
let future = [];
let result = null;
let showCounterexample = true;

function storageNotice(ok) {
  ui['save-notice'].textContent = ok
    ? '进度与通过方案保存在当前浏览器。'
    : '浏览器暂时无法保存；本次仍可正常游玩，离开页面后进度可能丢失。';
}

function persist() {
  progress.levelId = level.id;
  progress.drafts[level.id] = { walls: [...walls], checks };
  storageNotice(saveProgress(progress));
}

function message(state, title, description) {
  ui.feedback.dataset.state = state;
  ui['feedback-symbol'].textContent =
    state === 'success' ? '✓' : state === 'alternative' ? '↗' : state === 'notice' ? '!' : '?';
  ui['feedback-title'].textContent = title;
  ui['feedback-text'].textContent = description;
}

function render() {
  const hasAlternative = result?.status === 'alternative';
  view.render(walls, hasAlternative && showCounterexample ? result.route : null);
  ui.used.textContent = walls.size;
  ui.budget.textContent = level.budget;
  ui.checks.textContent = checks;
  ui.undo.disabled = history.length === 0;
  ui.redo.disabled = future.length === 0;
  ui.reset.disabled = walls.size === 0;
  ui.check.disabled = false;
  ui['budget-note'].textContent =
    walls.size === level.budget
      ? '墙已用完。还可以点击已放置的墙，把它收回来。'
      : '还可放 ' + (level.budget - walls.size) + ' 堵墙，不必全部用完。';
  ui['counter-toggle'].hidden = !hasAlternative;
  ui['counter-toggle'].textContent = showCounterexample ? '隐藏橙色反例' : '显示橙色反例';
  ui['counter-toggle'].setAttribute('aria-pressed', String(showCounterexample));
  ui.continue.hidden = result?.status !== 'unique';
  const incomplete = LEVELS.findIndex((item) => !progress.best[item.id]);
  ui.continue.textContent =
    levelIndex < LEVELS.length - 1
      ? '下一关 →'
      : incomplete !== -1
        ? '去看看未完成的关卡 →'
        : '回到第一关 →';
  ui.best.hidden = !progress.best[level.id] || result?.status === 'unique';
  ui.best.parentElement.hidden = [ui.best, ui.continue, ui['counter-toggle']].every(
    (button) => button.hidden,
  );
  ui.completed.textContent = '已完成 ' + Object.keys(progress.best).length + ' / ' + LEVELS.length;
  [...ui['level-select'].options].forEach((option, index) => {
    const item = LEVELS[index];
    option.textContent =
      (progress.best[item.id] ? '✓ ' : '') +
      String(index + 1).padStart(2, '0') +
      ' · ' +
      item.title;
  });
}

function changed() {
  result = null;
  showCounterexample = true;
  message('ready', '布局已更新', '点击「检查路线」，看看是否还有其他走法。');
  render();
  persist();
}

function remember() {
  history.push([...walls]);
  if (history.length > HISTORY_LIMIT) history.shift();
  future = [];
}

function toggleWall(cell) {
  if (!isPlaceable(level, cell)) {
    message(
      'notice',
      '这一格保持原样',
      level.cells[cell] === '#'
        ? '这是固定障碍。请在白色空地上放置你的墙。'
        : '指定路线、起点和终点需要保持畅通。请在白色空地上放墙。',
    );
    return;
  }
  if (!walls.has(cell) && walls.size >= level.budget) {
    message(
      'notice',
      '先收回一堵墙',
      '本关最多放 ' + level.budget + ' 堵墙。点击已经放下的深色墙，即可移除。',
    );
    return;
  }
  remember();
  if (walls.has(cell)) walls.delete(cell);
  else walls.add(cell);
  changed();
}

function undo() {
  if (!history.length) return;
  future.push([...walls]);
  walls = new Set(history.pop());
  changed();
}

function redo() {
  if (!future.length) return;
  history.push([...walls]);
  walls = new Set(future.pop());
  changed();
}

function reset() {
  if (!walls.size) return;
  remember();
  walls = new Set();
  changed();
  message('ready', '空地回来了', '本关的墙已清空。需要恢复时，可以点击撤销。');
}

function checkRoute(count = true) {
  if (count) checks = Math.min(1000000, checks + 1);
  result = analyzeRoute(level, walls);
  showCounterexample = true;
  if (result.status === 'unique') {
    const previous = progress.best[level.id];
    if (!previous || walls.size < previous.length) progress.best[level.id] = [...walls];
    const complete = LEVELS.every((item) => progress.best[item.id]);
    message(
      'success',
      complete ? '所有关卡，都只剩一条路' : '现在，只剩这一个答案',
      '使用 ' +
        walls.size +
        ' 堵墙，指定路线已成为唯一的有效路线。' +
        (complete ? '可以回到喜欢的关卡，探索不同布局。' : '你的通过方案已记录，可以继续下一关。'),
    );
  } else if (result.status === 'alternative') {
    message(
      'alternative',
      '还有另一种可能',
      '橙色反例共有 ' +
        (result.route.length - 1) +
        ' 步，它也能从起点走到终点。观察它离开和重新接入蓝线的位置，再调整墙。',
    );
  } else {
    message(
      'notice',
      '这个布局暂时无法检查',
      '请清空本关重新布置，在白色空地上放墙，保持蓝线畅通，并遵守总墙数预算。',
    );
  }
  render();
  persist();
}

function loadLevel(index, focus = false) {
  levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  level = LEVELS[levelIndex];
  const draft = progress.drafts[level.id];
  walls = new Set(draft.walls);
  checks = draft.checks;
  history = [];
  future = [];
  result = null;
  showCounterexample = true;
  ui['level-title'].textContent = level.title;
  ui.chapter.textContent = level.chapter + ' / ' + String(levelIndex + 1).padStart(2, '0');
  ui['level-number'].textContent =
    String(levelIndex + 1).padStart(2, '0') + ' / ' + String(LEVELS.length).padStart(2, '0');
  ui.description.textContent = level.description;
  ui['board-size'].textContent = level.width + ' × ' + level.height + ' · 放大后可滚动查看全图';
  ui['challenge-entry'].hidden = level.difficulty === 'challenge';
  ui['hint-text'].textContent = level.hint;
  ui.hint.open = false;
  ui['level-select'].value = level.id;
  ui['level-select'].disabled = false;
  ui.previous.disabled = levelIndex === 0;
  ui.next.disabled = levelIndex === LEVELS.length - 1;
  view.setLevel(level);
  message(
    'ready',
    walls.size ? '接着上次的想法' : '先看看另一种可能',
    walls.size
      ? '已恢复本关的布局。检查一次，即可重新查看结果。'
      : '点击空地放墙；也可以先检查一次，让橙色路线带你发现岔路。',
  );
  render();
  if (focus) view.setCursor(view.cursor, true);
}

function navigate(index) {
  persist();
  loadLevel(index);
  persist();
  const url = new URL(window.location.href);
  url.searchParams.set('level', level.id);
  window.history.replaceState(null, '', url);
}

for (const [difficulty, label] of [
  ['intro', '入门 · 认识路线'],
  ['challenge', '挑战 · 全局推理'],
]) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const item of LEVELS.filter((item) => item.difficulty === difficulty)) {
    const option = document.createElement('option');
    option.value = item.id;
    group.append(option);
  }
  ui['level-select'].append(group);
}

listen(ui.board, 'click', (event) => {
  const button = event.target.closest('button[data-cell]');
  if (!button) return;
  const cell = Number(button.dataset.cell);
  view.setCursor(cell);
  toggleWall(cell);
});
listen(ui.board, 'focusin', (event) => {
  const button = event.target.closest('button[data-cell]');
  if (button) view.setCursor(Number(button.dataset.cell));
});
listen(ui.board, 'keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const current = view.cursor;
  const col = current % level.width;
  const row = Math.floor(current / level.width);
  let next = current;
  if (event.key === 'ArrowLeft' && col > 0) next--;
  if (event.key === 'ArrowRight' && col < level.width - 1) next++;
  if (event.key === 'ArrowUp' && row > 0) next -= level.width;
  if (event.key === 'ArrowDown' && row < level.height - 1) next += level.width;
  if (event.key === 'Home') next -= col;
  if (event.key === 'End') next += level.width - 1 - col;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    view.setCursor(next, true);
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    if (walls.has(current)) toggleWall(current);
  }
});
listen(document, 'keydown', (event) => {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.altKey ||
    event.target.closest('input, select, textarea, [contenteditable="true"]')
  )
    return;
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key !== 'z' && key !== 'y') return;
    event.preventDefault();
    if (key === 'y' || event.shiftKey) redo();
    else undo();
    return;
  }
  const actions = { z: undo, y: redo, r: reset, c: checkRoute };
  if (actions[key]) {
    event.preventDefault();
    actions[key]();
  }
});
listen(ui.challenge, 'click', () => {
  const next = LEVELS.findIndex(
    (item) => item.difficulty === 'challenge' && !progress.best[item.id],
  );
  navigate(next === -1 ? LEVELS.findIndex((item) => item.difficulty === 'challenge') : next);
  view.setCursor(view.cursor, true);
});
listen(ui.zoom, 'click', () => {
  const zoomed = ui.board.classList.toggle('is-zoomed');
  ui.board.parentElement.classList.toggle('is-zoomed', zoomed);
  ui.zoom.setAttribute('aria-pressed', String(zoomed));
  ui.zoom.textContent = zoomed ? '缩回棋盘' : '放大棋盘';
});
listen(ui.undo, 'click', undo);
listen(ui.redo, 'click', redo);
listen(ui.reset, 'click', reset);
listen(ui.check, 'click', () => checkRoute());
listen(ui['counter-toggle'], 'click', () => {
  showCounterexample = !showCounterexample;
  render();
});
listen(ui.best, 'click', () => {
  if (!progress.best[level.id]) return;
  remember();
  walls = new Set(progress.best[level.id]);
  checkRoute(false);
  view.setCursor(view.cursor, true);
});
listen(ui.previous, 'click', () => navigate(levelIndex - 1));
listen(ui.next, 'click', () => navigate(levelIndex + 1));
listen(ui['level-select'], 'change', () =>
  navigate(LEVELS.findIndex((item) => item.id === ui['level-select'].value)),
);
listen(ui.continue, 'click', () => {
  const incomplete = LEVELS.findIndex((item) => !progress.best[item.id]);
  navigate(levelIndex < LEVELS.length - 1 ? levelIndex + 1 : incomplete !== -1 ? incomplete : 0);
  view.setCursor(view.cursor, true);
});

const requestedLevel = new URLSearchParams(window.location.search).get('level');
const requestedIndex = LEVELS.findIndex((item) => item.id === requestedLevel);
const fallbackIndex = requestedLevel?.startsWith('challenge-')
  ? LEVELS.findIndex((item) => item.difficulty === 'challenge')
  : LEVELS.findIndex((item) => item.id === progress.levelId);
loadLevel(requestedIndex === -1 ? fallbackIndex : requestedIndex);
if (requestedLevel && requestedIndex === -1) {
  const url = new URL(window.location.href);
  url.searchParams.set('level', level.id);
  window.history.replaceState(null, '', url);
}
storageNotice(available);

if (import.meta.hot) import.meta.hot.dispose(() => events.abort());
