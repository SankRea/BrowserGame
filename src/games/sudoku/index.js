import '../../styles/base.css';
import './styles.css';
import { mountSiteChrome } from '../../shared/site.js';
import { readJSON, writeJSON } from '../../shared/storage.js';
import { FULL, LEVELS, STORAGE_KEY } from './config.js';
import { rowOf, colOf, peers, solve, generatePuzzle, yieldToPage } from './engine.js';

mountSiteChrome({ footerNote: '不赶时间，慢慢想。' });

const byId = (id) => document.getElementById(id);
const ui = {
  game: byId('game'),
  board: byId('sudoku-board'),
  body: byId('board-body'),
  overlay: byId('board-overlay'),
  overlayTitle: byId('overlay-title'),
  overlayDescription: byId('overlay-description'),
  resume: byId('resume'),
  difficulty: byId('difficulty'),
  currentDifficulty: byId('current-difficulty'),
  newGame: byId('new-game'),
  restart: byId('restart'),
  pause: byId('pause'),
  notes: byId('notes'),
  erase: byId('erase'),
  undo: byId('undo'),
  check: byId('check'),
  hint: byId('hint'),
  timer: byId('timer'),
  progress: byId('progress'),
  hintCount: byId('hint-count'),
  status: byId('status'),
  saveStatus: byId('save-status'),
  mode: byId('input-mode'),
  mobileMode: byId('mobile-input-mode'),
  mobileNotes: byId('mobile-notes'),
  mobileErase: byId('mobile-erase'),
  completion: byId('completion'),
  completionDetail: byId('completion-detail'),
  numberButtons: [...document.querySelectorAll('[data-number]')],
};
const cells = [];
let state = null;
let selected = 0;
let notesMode = false;
let paused = false;
let busy = false;
let runningSince = null;
let history = [];
let checked = new Set();
let storageAvailable = true;

function timeNow() {
  return state
    ? state.elapsedMs + (runningSince === null ? 0 : performance.now() - runningSince)
    : 0;
}
function stopClock() {
  if (state) state.elapsedMs = timeNow();
  runningSince = null;
}
function startClock() {
  if (state && !state.won && !paused && !busy && !document.hidden && runningSince === null) {
    runningSince = performance.now();
  }
}
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return (
    (hours ? `${hours}:` : '') +
    `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  );
}
function renderClock() {
  const elapsed = timeNow();
  ui.timer.textContent = formatTime(elapsed);
  ui.timer.dateTime = `PT${Math.floor(elapsed / 1000)}S`;
}
function say(message, tone = '') {
  ui.status.textContent = message;
  ui.status.dataset.tone = tone;
}
function storageNotice() {
  ui.saveStatus.textContent = storageAvailable
    ? '进度自动保存在当前浏览器。'
    : '浏览器未允许保存进度，关闭页面后本局可能丢失。';
}
function saveGame() {
  if (!state || busy) return;
  storageAvailable = writeJSON(STORAGE_KEY, {
    version: 1,
    puzzle: state.puzzle,
    values: state.values,
    notes: state.notes,
    level: state.level,
    elapsedMs: timeNow(),
    hints: state.hints,
  });
  storageNotice();
}
function restoreGame() {
  const stored = readJSON(STORAGE_KEY);
  storageAvailable = stored.available;
  if (!stored.value) return null;
  try {
    const saved = stored.value;
    const isBoard = (a) =>
      Array.isArray(a) &&
      a.length === 81 &&
      a.every((n) => Number.isInteger(n) && n >= 0 && n <= 9);
    if (
      !saved ||
      saved.version !== 1 ||
      !Object.hasOwn(LEVELS, saved.level) ||
      !isBoard(saved.puzzle) ||
      !isBoard(saved.values) ||
      !Array.isArray(saved.notes) ||
      saved.notes.length !== 81 ||
      !saved.notes.every((n) => Number.isInteger(n) && n >= 0 && n <= FULL && !(n & ~FULL)) ||
      !Number.isFinite(saved.elapsedMs) ||
      saved.elapsedMs < 0 ||
      saved.elapsedMs > 31536000000 ||
      !Number.isInteger(saved.hints) ||
      saved.hints < 0 ||
      saved.hints > 1000000 ||
      saved.puzzle.some((value, i) => value && saved.values[i] !== value)
    )
      return null;
    const result = solve(saved.puzzle);
    if (result.aborted || result.count !== 1) return null;
    return {
      puzzle: saved.puzzle,
      solution: result.solution,
      values: saved.values,
      notes: saved.notes.map((mask, i) => (saved.values[i] ? 0 : mask)),
      level: saved.level,
      elapsedMs: saved.elapsedMs,
      hints: saved.hints,
      won: saved.values.every((value, i) => value === result.solution[i]),
    };
  } catch {
    return null;
  }
}

function makeBoard() {
  for (let r = 0; r < 9; r++) {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');
    for (let c = 0; c < 9; c++) {
      const index = r * 9 + c;
      const cell = document.createElement('td');
      cell.setAttribute('role', 'gridcell');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sudoku-cell';
      button.tabIndex = -1;
      button.disabled = true;
      button.addEventListener('click', () => selectCell(index));
      cell.append(button);
      row.append(cell);
      cells.push(button);
    }
    ui.body.append(row);
  }
}
const canPlay = () => !!state && !paused && !busy && !state.won;
const positionLabel = (i) => `第 ${rowOf(i) + 1} 行第 ${colOf(i) + 1} 列`;
const noteDigits = (mask) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => mask & (1 << digit));
function focusSelected() {
  if (!busy && !paused) cells[selected].focus({ preventScroll: true });
}

function render() {
  const obscured = busy || paused || !state;
  ui.game.setAttribute('aria-busy', String(busy));
  ui.overlay.hidden = !obscured;
  ui.overlayTitle.textContent = busy
    ? '正在准备棋盘'
    : paused
      ? '休息一下，刚刚好。'
      : '棋盘暂时未能生成';
  ui.overlayDescription.textContent = busy
    ? '正在为这一局挑选数字。'
    : paused
      ? '这一局会在这里等你。'
      : '点击“新一局”再试一次。';
  ui.resume.hidden = !paused || busy;
  ui.board.style.visibility = obscured ? 'hidden' : 'visible';
  ui.board.setAttribute('aria-hidden', String(obscured));
  ui.newGame.disabled = busy;
  ui.difficulty.disabled = busy;
  ui.restart.disabled = busy || !state;
  ui.pause.disabled = busy || !state || state.won;
  ui.pause.textContent = paused ? '继续' : '暂停';
  ui.pause.setAttribute('aria-pressed', String(paused));
  const playable = canPlay();
  const editable = playable && !state.puzzle[selected];
  ui.notes.disabled = !playable;
  ui.erase.disabled = !editable || !(state.values[selected] || state.notes[selected]);
  ui.mobileErase.disabled = ui.erase.disabled;
  ui.mobileNotes.disabled = !playable;
  ui.mobileNotes.setAttribute('aria-pressed', String(notesMode));
  ui.mobileNotes.textContent = notesMode ? '笔记：开' : '笔记：关';
  ui.mobileMode.textContent = notesMode ? '标记候选数字' : '填入数字';
  ui.undo.disabled = !playable || !history.length;
  ui.check.disabled = !playable;
  ui.hint.disabled = !playable;
  ui.notes.setAttribute('aria-pressed', String(notesMode));
  ui.mode.textContent = notesMode ? '笔记模式' : '填数模式';
  ui.numberButtons.forEach((button) => {
    const digit = Number(button.dataset.number);
    const noted = editable && notesMode && !!(state.notes[selected] & (1 << digit));
    button.disabled = !editable;
    button.classList.toggle('is-noted', noted);
    button.setAttribute('aria-label', `${notesMode ? '标记候选数字' : '填入数字'} ${digit}`);
    if (notesMode) button.setAttribute('aria-pressed', String(!!noted));
    else button.removeAttribute('aria-pressed');
  });
  if (!state) return;
  const errors = new Set(
    [...checked].filter((i) => state.values[i] && state.values[i] !== state.solution[i]),
  );
  state.values.forEach((value, i) => {
    if (value && peers[i].some((j) => state.values[j] === value)) errors.add(i);
  });
  cells.forEach((cell, i) => {
    const value = state.values[i],
      given = !!state.puzzle[i];
    cell.disabled = obscured;
    cell.tabIndex = !obscured && i === selected ? 0 : -1;
    cell.classList.toggle('is-given', given);
    cell.classList.toggle('is-related', peers[selected].includes(i));
    cell.classList.toggle('is-same', !!value && value === state.values[selected]);
    cell.classList.toggle('is-selected', i === selected);
    cell.classList.toggle('is-error', errors.has(i));
    cell.parentElement.setAttribute('aria-selected', String(i === selected));
    cell.parentElement.setAttribute('aria-readonly', String(given || state.won));
    cell.setAttribute('aria-invalid', String(errors.has(i)));
    let label = `${positionLabel(i)}，`;
    cell.replaceChildren();
    if (value) {
      cell.textContent = value;
      label += `${given ? '题目数字' : '已填'} ${value}`;
    } else if (state.notes[i]) {
      const notes = document.createElement('span');
      notes.className = 'cell-notes';
      notes.setAttribute('aria-hidden', 'true');
      for (let n = 1; n <= 9; n++) {
        const small = document.createElement('span');
        small.textContent = state.notes[i] & (1 << n) ? n : '';
        notes.append(small);
      }
      cell.append(notes);
      label += `空格，笔记 ${noteDigits(state.notes[i]).join('、')}`;
    } else label += '空格';
    if (errors.has(i)) label += '，数字有误';
    cell.setAttribute('aria-label', label);
  });
  const blanks = state.puzzle.filter((value) => !value).length;
  const filled = state.values.filter((value, i) => value && !state.puzzle[i]).length;
  ui.currentDifficulty.textContent = LEVELS[state.level].label;
  ui.progress.textContent = `已填 ${filled} / ${blanks} 格`;
  ui.hintCount.textContent = `已用 ${state.hints} 次提示`;
  ui.completion.hidden = !state.won;
  if (state.won)
    ui.completionDetail.textContent = `用时 ${formatTime(state.elapsedMs)}，使用了 ${state.hints} 次提示。再来一局，或休息一下。`;
  renderClock();
}

function selectCell(index) {
  if (!state || busy || paused) return;
  selected = index;
  render();
  focusSelected();
  if (!state.won && state.puzzle[index])
    say(`${positionLabel(index)}是题目给定的数字，选择空格来填数。`);
}
function snapshot() {
  history.push({ values: [...state.values], notes: [...state.notes] });
  if (history.length > 200) history.shift();
}
function finishEdit(message) {
  if (state.values.every((value, i) => value === state.solution[i])) {
    stopClock();
    state.won = true;
    say(`恭喜完成这一局！用时 ${formatTime(state.elapsedMs)}，使用了 ${state.hints} 次提示。`);
  } else if (state.values.every(Boolean)) {
    say('棋盘已填满，还有数字需要调整。点击“检查数字”找到它们。', 'error');
  } else say(message);
  render();
  saveGame();
  focusSelected();
}
function writeValue(index, digit) {
  state.values[index] = digit;
  state.notes[index] = 0;
  checked.delete(index);
  for (const peer of peers[index]) state.notes[peer] &= ~(1 << digit);
}
function inputDigit(digit) {
  if (!canPlay()) return;
  if (state.puzzle[selected]) {
    say('题目给定的数字不能修改，先选择一个空格。');
    return;
  }
  if (notesMode) {
    if (state.values[selected]) {
      say('先擦除这个格子的数字，再记录候选笔记。');
      return;
    }
    snapshot();
    state.notes[selected] ^= 1 << digit;
    finishEdit(`${positionLabel(selected)}的笔记已更新。`);
  } else {
    if (state.values[selected] === digit) return;
    snapshot();
    writeValue(selected, digit);
    finishEdit(`${positionLabel(selected)}已填入 ${digit}。`);
  }
}
function erase() {
  if (!canPlay() || state.puzzle[selected] || !(state.values[selected] || state.notes[selected]))
    return;
  snapshot();
  state.values[selected] = 0;
  state.notes[selected] = 0;
  checked.delete(selected);
  finishEdit('已擦除当前格子的数字与笔记。');
}
function undo() {
  if (!canPlay() || !history.length) return;
  const previous = history.pop();
  state.values = previous.values;
  state.notes = previous.notes;
  checked.clear();
  finishEdit('已撤销上一步。');
}
function toggleNotes() {
  if (!canPlay()) return;
  notesMode = !notesMode;
  say(notesMode ? '笔记已开启，在空格中记录候选数字。' : '已切换到填数模式。');
  render();
  focusSelected();
}
function check() {
  if (!canPlay()) return;
  checked = new Set(
    state.values.flatMap((value, i) =>
      value && !state.puzzle[i] && value !== state.solution[i] ? [i] : [],
    ),
  );
  const filled = state.values.some((value, i) => value && !state.puzzle[i]);
  say(
    checked.size
      ? `有 ${checked.size} 个数字需要调整，已用红色和下划线标出。`
      : filled
        ? '目前填入的数字都正确，继续保持。'
        : '先填几个数字，再来检查吧。',
    checked.size ? 'error' : '',
  );
  render();
  focusSelected();
}
function hint() {
  if (!canPlay()) return;
  let index = selected;
  if (state.puzzle[index] || state.values[index] === state.solution[index]) {
    index = state.values.findIndex((value, i) => value && value !== state.solution[i]);
    if (index < 0) index = state.values.findIndex((value) => !value);
  }
  if (index < 0) return;
  snapshot();
  selected = index;
  state.hints++;
  writeValue(index, state.solution[index]);
  finishEdit(`提示：${positionLabel(index)}应填 ${state.solution[index]}，已帮你填好。`);
}
function togglePause() {
  if (!state || busy || state.won) return;
  if (!paused) {
    stopClock();
    paused = true;
  } else {
    paused = false;
    startClock();
  }
  render();
  saveGame();
  say(paused ? '游戏已暂停，计时也暂停了。' : '欢迎回来，继续这一局。');
  if (paused) ui.resume.focus();
  else focusSelected();
}
const hasProgress = () =>
  state &&
  !state.won &&
  (state.values.some((value, i) => value !== state.puzzle[i]) || state.notes.some(Boolean));

async function newGame(level) {
  if (busy) return;
  const wasPaused = paused;
  stopClock();
  saveGame();
  busy = true;
  render();
  say('正在生成新的数独题目……');
  await yieldToPage();
  try {
    const nextState = await generatePuzzle(level);
    state = nextState;
    selected = state.puzzle.indexOf(0);
    history = [];
    checked.clear();
    notesMode = false;
    paused = false;
    busy = false;
    ui.difficulty.value = level;
    startClock();
    render();
    saveGame();
    say('新的一局开始了。选中一个空格，再填入数字。');
  } catch (error) {
    busy = false;
    paused = wasPaused;
    startClock();
    render();
    say('棋盘生成遇到问题，请点击“新一局”重试。', 'error');
    console.error('Sudoku generation failed:', error);
  }
}
function restart() {
  if (!state || busy) return;
  if (hasProgress() && !window.confirm('重玩这一局？当前填数、笔记和计时将被重置。')) return;
  stopClock();
  state.values = [...state.puzzle];
  state.notes = Array(81).fill(0);
  state.elapsedMs = 0;
  state.hints = 0;
  state.won = false;
  history = [];
  checked.clear();
  notesMode = false;
  paused = false;
  selected = state.puzzle.indexOf(0);
  startClock();
  render();
  saveGame();
  focusSelected();
  say('棋盘已重置，重新开始这一局。');
}

ui.numberButtons.forEach((button) =>
  button.addEventListener('click', () => inputDigit(Number(button.dataset.number))),
);
ui.notes.addEventListener('click', toggleNotes);
ui.mobileNotes.addEventListener('click', toggleNotes);
ui.mobileErase.addEventListener('click', erase);
ui.erase.addEventListener('click', erase);
ui.undo.addEventListener('click', undo);
ui.check.addEventListener('click', check);
ui.hint.addEventListener('click', hint);
ui.pause.addEventListener('click', togglePause);
ui.resume.addEventListener('click', togglePause);
ui.restart.addEventListener('click', restart);
ui.newGame.addEventListener('click', () => {
  if (hasProgress() && !window.confirm('开始新的一局？当前这一局的进度会被替换。')) return;
  newGame(ui.difficulty.value);
});
ui.board.addEventListener('keydown', (event) => {
  if (!state || busy || paused || event.altKey) return;
  if (event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    }
    return;
  }
  const directions = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  if (Object.hasOwn(directions, event.key)) {
    event.preventDefault();
    const [dr, dc] = directions[event.key];
    selectCell(
      Math.max(0, Math.min(8, rowOf(selected) + dr)) * 9 +
        Math.max(0, Math.min(8, colOf(selected) + dc)),
    );
  } else if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    inputDigit(Number(event.key));
  } else if (['Backspace', 'Delete', '0'].includes(event.key)) {
    event.preventDefault();
    erase();
  } else if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    toggleNotes();
  } else if (event.key === 'Home') {
    event.preventDefault();
    selectCell(rowOf(selected) * 9);
  } else if (event.key === 'End') {
    event.preventDefault();
    selectCell(rowOf(selected) * 9 + 8);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopClock();
    saveGame();
  } else startClock();
  renderClock();
});
window.addEventListener('pagehide', () => {
  stopClock();
  saveGame();
});
window.addEventListener('pageshow', startClock);
let ticks = 0;
window.setInterval(() => {
  renderClock();
  if (++ticks % 15 === 0) saveGame();
}, 1000);

makeBoard();
state = restoreGame();
if (state) {
  selected = state.values.findIndex((value) => !value);
  if (selected < 0) selected = 0;
  ui.difficulty.value = state.level;
  startClock();
  render();
  storageNotice();
  say(
    state.won ? '上一次的数独已完成，可以选择难度开始新的一局。' : '已恢复上次的棋盘，接着慢慢想。',
  );
} else newGame('easy');
