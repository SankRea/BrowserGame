import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS } from '../src/games/only-path/levels.js';
import { analyzeRoute } from '../src/games/only-path/engine.js';
import { analyzeLevel, conflictPairs } from '../scripts/analyze-only-path.mjs';

// Exhaustive cell-level search checks both the minimum and the corridor
// compression's multiplicities on the six smaller introductory boards.
for (const level of LEVELS.slice(0, 6)) {
  test('exact solver matches exhaustive layouts: ' + level.id, () => {
    const floor = level.cells.flatMap((value, cell) => (value === '.' ? [cell] : []));
    let minimum;
    let count = 0;
    for (let size = 0; size <= level.budget && !count; size++) {
      function visit(index, walls) {
        if (walls.length === size) {
          const unique = analyzeRoute(level, walls).status === 'unique';
          assert.equal(conflictPairs(level, walls) === 0, unique);
          if (unique) count++;
          return;
        }
        for (let i = index; i <= floor.length - (size - walls.length); i++) {
          visit(i + 1, [...walls, floor[i]]);
        }
      }
      visit(0, []);
      if (count) minimum = size;
    }
    const result = analyzeLevel(level);
    assert.equal(result.complete, true);
    assert.equal(result.minimum, minimum);
    assert.equal(result.cellLayouts, String(count));
  });
}

for (const level of LEVELS.filter((item) => item.difficulty === 'challenge')) {
  test('challenge has a tight budget and a valid solution: ' + level.id, () => {
    const result = analyzeLevel(level);
    assert.equal(result.complete, true, 'search must finish before making an exact claim');
    assert.equal(result.minimum, level.budget, 'budget must not admit a cheaper shortcut');
    assert.ok(result.routeTurns <= 2, 'target route must be visually simple');
    assert.ok(result.routeCells <= 55, 'target route must remain easy to follow');
    assert.equal(
      result.greedyCanReachOptimumWithBestTies,
      false,
      'purely greedy play must require reconsideration',
    );
    assert.equal(analyzeRoute(level, []).status, 'alternative');
    const walls = result.solution.map(([row, col]) => (row - 1) * level.width + col - 1);
    assert.equal(analyzeRoute(level, walls).status, 'unique');
    assert.equal(conflictPairs(level, walls), 0);
    for (const wall of walls) {
      assert.equal(
        analyzeRoute(
          level,
          walls.filter((cell) => cell !== wall),
        ).status,
        'alternative',
      );
    }
  });
}
