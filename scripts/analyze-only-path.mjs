import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { LEVELS } from '../src/games/only-path/levels.js';
import { createLevel, analyzeRoute } from '../src/games/only-path/engine.js';

// Independent oracle: each remaining floor component may touch at most one
// distinct protected cell. This checks all paths, not just the shortest route.
export function conflictPairs(level, walls) {
  const seen = new Set(walls);
  let pairs = 0;
  for (let cell = 0; cell < level.cells.length; cell++) {
    if (level.cells[cell] !== '.' || seen.has(cell)) continue;
    const queue = [cell];
    const ports = new Set();
    seen.add(cell);
    for (let head = 0; head < queue.length; head++) {
      for (const next of level.neighbors[queue[head]]) {
        if ('*ST'.includes(level.cells[next])) ports.add(next);
        else if (level.cells[next] === '.' && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    pairs += (ports.size * (ports.size - 1)) / 2;
  }
  return pairs;
}

function compressedComponents(level) {
  const floor = level.cells.flatMap((cell, i) => (cell === '.' ? [i] : []));
  const adjacent = (cell) => level.neighbors[cell].filter((next) => level.cells[next] === '.');
  const ports = (cell) => level.neighbors[cell].filter((next) => '*ST'.includes(level.cells[next]));
  const anchors = new Set(
    floor.filter((cell) => adjacent(cell).length !== 2 || ports(cell).length),
  );
  const owner = new Map();
  const groups = [];
  const add = (cells) => {
    const id = groups.length;
    cells.forEach((cell) => owner.set(cell, id));
    groups.push({ cells, ports: [...new Set(cells.flatMap(ports))], edges: new Set() });
  };
  for (const anchor of anchors) add([anchor]);
  for (const cell of floor) {
    if (owner.has(cell)) continue;
    const chain = [cell];
    const seen = new Set(chain);
    for (let head = 0; head < chain.length; head++) {
      for (const next of adjacent(chain[head])) {
        if (!anchors.has(next) && !seen.has(next)) {
          seen.add(next);
          chain.push(next);
        }
      }
    }
    add(chain);
  }
  for (const cell of floor) {
    const id = owner.get(cell);
    for (const next of adjacent(cell)) {
      if (owner.get(next) !== id) groups[id].edges.add(owner.get(next));
    }
  }
  // Degree-two corridor interiors are equivalent choices: one wall anywhere
  // in such a chain severs the same connection. Keep junctions and ports apart.
  const seen = new Set();
  const components = [];
  for (let id = 0; id < groups.length; id++) {
    if (seen.has(id)) continue;
    const queue = [id];
    seen.add(id);
    for (let head = 0; head < queue.length; head++) {
      for (const next of groups[queue[head]].edges) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    if (new Set(queue.flatMap((index) => groups[index].ports)).size < 2) continue;
    const mapping = new Map(queue.map((index, i) => [index, i]));
    components.push(
      queue.map((index) => ({
        ...groups[index],
        edges: [...groups[index].edges].map((next) => mapping.get(next)),
      })),
    );
  }
  return components;
}

function graphTools(graph) {
  const bits = graph.map((_, i) => 1n << BigInt(i));
  function conflict(blocked) {
    const parents = Array(graph.length).fill(-1);
    const owners = Array(graph.length).fill(-1);
    const queue = [];
    for (let id = 0; id < graph.length; id++) {
      if (blocked & bits[id]) continue;
      if (graph[id].ports.length > 1) return [id];
      if (graph[id].ports.length) {
        owners[id] = graph[id].ports[0];
        queue.push(id);
      }
    }
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      for (const next of graph[current].edges) {
        if (blocked & bits[next]) continue;
        if (owners[next] === -1) {
          owners[next] = owners[current];
          parents[next] = current;
          queue.push(next);
        } else if (owners[next] !== owners[current]) {
          const path = [];
          for (let cell = current; cell !== -1; cell = parents[cell]) path.push(cell);
          for (let cell = next; cell !== -1; cell = parents[cell]) path.push(cell);
          return path;
        }
      }
    }
    return null;
  }
  function lowerBound(blocked, stopAfter = Infinity) {
    let bound = 0;
    let path;
    while ((path = conflict(blocked))) {
      bound++;
      if (bound > stopAfter) break;
      for (const cell of path) blocked |= bits[cell];
    }
    return bound;
  }
  return { bits, conflict, lowerBound };
}

function solveComponent(graph, timeoutMs) {
  const start = performance.now();
  const { bits, conflict, lowerBound } = graphTools(graph);
  const lower = lowerBound(0n);
  let nodes = 0;
  let timedOut = false;
  for (let limit = lower; limit <= graph.length; limit++) {
    const visited = new Set();
    const solutions = [];
    function search(blocked, used) {
      if (timedOut || visited.has(blocked)) return;
      if (++nodes % 256 === 0 && performance.now() - start > timeoutMs) {
        timedOut = true;
        return;
      }
      visited.add(blocked);
      const path = conflict(blocked);
      if (!path) {
        solutions.push(graph.flatMap((_, i) => (blocked & bits[i] ? [i] : [])));
        return;
      }
      if (used === limit || lowerBound(blocked, limit - used) > limit - used) return;
      path.sort(
        (a, b) =>
          graph[b].edges.length +
          graph[b].ports.length -
          (graph[a].edges.length + graph[a].ports.length),
      );
      for (const cell of path) search(blocked | bits[cell], used + 1);
    }
    search(0n, 0);
    if (solutions.length || timedOut) {
      let layouts = 0n;
      for (const solution of solutions)
        layouts += solution.reduce((n, i) => n * BigInt(graph[i].cells.length), 1n);
      const forced = solutions.length
        ? solutions[0].filter((i) => solutions.every((s) => s.includes(i)))
        : [];
      return {
        minimum: solutions.length ? limit : null,
        lowerBound: limit,
        complete: !timedOut,
        strategyClasses: solutions.length,
        cellLayouts: layouts.toString(),
        forcedGroups: forced.map((i) => graph[i].cells),
        solution: solutions[0]?.map((i) => graph[i].cells[0]) ?? [],
        solutions: solutions.map((solution) => solution.map((i) => graph[i].cells[0])),
        nodes,
        milliseconds: Math.round(performance.now() - start),
      };
    }
  }
  throw new Error('No cut found');
}

// A deliberately simple local heuristic, not a model of human difficulty:
// choose the single wall reducing the most currently connected port pairs.
export function greedySolution(level) {
  const walls = new Set();
  const floors = level.cells.flatMap((cell, i) => (cell === '.' ? [i] : []));
  while (conflictPairs(level, walls)) {
    let best = -1;
    let score = Infinity;
    for (const cell of floors) {
      if (walls.has(cell)) continue;
      walls.add(cell);
      const candidate = conflictPairs(level, walls);
      walls.delete(cell);
      if (candidate < score) {
        score = candidate;
        best = cell;
      }
    }
    walls.add(best);
  }
  return [...walls];
}

// Check all tied greedy choices against the exhaustively enumerated optimum
// classes. Moving a cut within a degree-two corridor has identical connectivity.
function greedyCanFollowOptimal(level, solutions) {
  const floor = level.cells.flatMap((value, cell) => (value === '.' ? [cell] : []));
  const visited = new Set();
  function visit(walls, compatible) {
    if (walls.length === solutions[0].length) return true;
    const key = [...walls].sort((a, b) => a - b).join(',');
    if (visited.has(key)) return false;
    visited.add(key);
    const scores = new Map();
    let best = Infinity;
    for (const cell of floor) {
      if (walls.includes(cell)) continue;
      const score = conflictPairs(level, new Set([...walls, cell]));
      scores.set(cell, score);
      best = Math.min(best, score);
    }
    for (const cell of new Set(compatible.flat())) {
      if (walls.includes(cell) || scores.get(cell) !== best) continue;
      if (
        visit(
          [...walls, cell],
          compatible.filter((solution) => solution.includes(cell)),
        )
      )
        return true;
    }
    return false;
  }
  return visit([], solutions);
}

export function analyzeLevel(level, timeoutMs = 5000) {
  const results = compressedComponents(level).map((graph) => solveComponent(graph, timeoutMs));
  const minimumKnown = results.every((r) => r.minimum !== null);
  const complete = results.every((r) => r.complete);
  const minimum = minimumKnown ? results.reduce((n, r) => n + r.minimum, 0) : null;
  const solution = results.flatMap((r) => r.solution);
  const greedy = greedySolution(level);
  const classes = results.reduce((n, r) => n * BigInt(r.strategyClasses), 1n);
  let greedyOptimal = null;
  if (complete && classes > 0n && classes <= 5000n) {
    const optimumClasses = results.reduce(
      (all, result) =>
        all.flatMap((prefix) => result.solutions.map((solution) => [...prefix, ...solution])),
      [[]],
    );
    greedyOptimal = greedyCanFollowOptimal(level, optimumClasses);
  }

  if (
    minimumKnown &&
    analyzeRoute({ ...level, budget: Math.max(level.budget, minimum) }, solution).status !==
      'unique'
  ) {
    throw new Error('Independent solver and game checker disagree: ' + level.id);
  }
  let turns = 0;
  for (let i = 2; i < level.route.length; i++) {
    if (level.route[i] - level.route[i - 1] !== level.route[i - 1] - level.route[i - 2]) turns++;
  }
  const coordinate = (cell) => [Math.floor(cell / level.width) + 1, (cell % level.width) + 1];
  return {
    id: level.id,
    title: level.title,
    size: [level.width, level.height],
    budget: level.budget,
    routeCells: level.route.length,
    routeTurns: turns,
    minimum,
    complete,
    strategyClasses: results.reduce((n, r) => n * BigInt(r.strategyClasses), 1n).toString(),
    cellLayouts: results.reduce((n, r) => n * BigInt(r.cellLayouts), 1n).toString(),
    forcedWallGroups: results.flatMap((r) => r.forcedGroups).map((group) => group.map(coordinate)),
    solution: solution.map(coordinate),
    greedyWalls: greedy.length,
    greedyWithinBudget: greedy.length <= level.budget,
    greedyCanReachOptimumWithBestTies: greedyOptimal,
    greedySolution: greedy.map(coordinate),
    searchNodes: results.reduce((n, r) => n + r.nodes, 0),
    milliseconds: results.reduce((n, r) => n + r.milliseconds, 0),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  const levels =
    inputIndex === -1
      ? LEVELS.filter((level) => level.difficulty === 'challenge')
      : JSON.parse(readFileSync(args[inputIndex + 1], 'utf8')).map(createLevel);
  const report = [];
  for (const level of levels) {
    const result = analyzeLevel(level);
    report.push(result);
    console.log(JSON.stringify(result));
  }
  if (outputIndex !== -1)
    writeFileSync(args[outputIndex + 1], JSON.stringify(report, null, 2) + '\n');
}
