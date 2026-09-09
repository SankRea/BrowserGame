import { FULL, LEVELS } from './config.js';

export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
export const peers = Array.from({ length: 81 }, (_, i) =>
  Array.from({ length: 81 }, (_, j) => j).filter(
    (j) => i !== j && (rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || boxOf(i) === boxOf(j)),
  ),
);

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function bitCount(mask) {
  let count = 0;
  while (mask) {
    mask &= mask - 1;
    count++;
  }
  return count;
}

// Count up to two solutions. An exhausted search budget is never treated as unique.
export function solve(puzzle, limit = 2) {
  const board = [...puzzle];
  const rows = Array(9).fill(0),
    cols = Array(9).fill(0),
    boxes = Array(9).fill(0);
  let count = 0,
    solution = null,
    visits = 0,
    aborted = false;
  for (let i = 0; i < 81; i++) {
    if (!board[i]) continue;
    const bit = 1 << board[i],
      r = rowOf(i),
      c = colOf(i),
      b = boxOf(i);
    if ((rows[r] | cols[c] | boxes[b]) & bit) return { count: 0, solution: null, aborted: false };
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }
  function search() {
    if (count >= limit || aborted) return;
    if (++visits > 60000) {
      aborted = true;
      return;
    }
    let index = -1,
      options = 0,
      fewest = 10;
    for (let i = 0; i < 81; i++) {
      if (board[i]) continue;
      const mask = FULL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      const size = bitCount(mask);
      if (!size) return;
      if (size < fewest) {
        index = i;
        options = mask;
        fewest = size;
      }
      if (size === 1) break;
    }
    if (index === -1) {
      count++;
      if (!solution) solution = [...board];
      return;
    }
    const r = rowOf(index),
      c = colOf(index),
      b = boxOf(index);
    while (options && count < limit && !aborted) {
      const bit = options & -options;
      options &= ~bit;
      board[index] = Math.log2(bit);
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      search();
      board[index] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
    }
  }
  search();
  return { count, solution, aborted };
}

const yieldToPage = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generatePuzzle(level) {
  const groups = [0, 1, 2];
  const order = () =>
    shuffled(groups).flatMap((group) => shuffled(groups).map((n) => group * 3 + n));
  const rows = order(),
    cols = order(),
    digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let solution = rows.flatMap((r) => cols.map((c) => digits[(r * 3 + Math.floor(r / 3) + c) % 9]));
  if (Math.random() < 0.5) solution = solution.map((_, i) => solution[colOf(i) * 9 + rowOf(i)]);
  const puzzle = [...solution];
  let clues = 81,
    attempts = 0;
  for (const index of shuffled(Array.from({ length: 81 }, (_, i) => i))) {
    const previous = puzzle[index];
    puzzle[index] = 0;
    const result = solve(puzzle);
    if (result.aborted || result.count !== 1) puzzle[index] = previous;
    else clues--;
    if (clues <= LEVELS[level].clues) break;
    if (++attempts % 4 === 0) await yieldToPage();
  }
  return {
    puzzle,
    solution,
    values: [...puzzle],
    notes: Array(81).fill(0),
    level,
    elapsedMs: 0,
    hints: 0,
    won: false,
  };
}
