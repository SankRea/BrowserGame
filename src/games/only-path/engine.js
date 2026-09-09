/** Pure, deterministic graph rules. A route never visits the same cell twice. */
export function isPlaceable(level, cell) {
  return (
    Number.isInteger(cell) && cell >= 0 && cell < level.cells.length && level.cells[cell] === '.'
  );
}

export function wallCounts(level, walls) {
  const rows = Array(level.height).fill(0);
  const columns = Array(level.width).fill(0);
  for (const cell of new Set(walls)) {
    rows[Math.floor(cell / level.width)]++;
    columns[cell % level.width]++;
  }
  return { rows, columns };
}

export function getWallConflict(level, walls) {
  const { rows, columns } = wallCounts(level, walls);
  const row = rows.findIndex((count) => count > (level.rowLimit ?? Infinity));
  if (row !== -1) return { axis: 'row', index: row, limit: level.rowLimit };
  const column = columns.findIndex((count) => count > (level.columnLimit ?? Infinity));
  if (column !== -1) return { axis: 'column', index: column, limit: level.columnLimit };
  return null;
}

function shortestPath(level, walls, skippedEdge = null, routeOnly = false) {
  const parents = new Int16Array(level.cells.length).fill(-1);
  const queue = [level.start];
  parents[level.start] = level.start;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === level.end) {
      const path = [current];
      while (path[path.length - 1] !== level.start) path.push(parents[path[path.length - 1]]);
      return path.reverse();
    }
    for (const next of level.neighbors[current]) {
      if (parents[next] !== -1 || level.cells[next] === '#' || walls.has(next)) continue;
      if (routeOnly && !'*ST'.includes(level.cells[next])) continue;
      if (
        skippedEdge &&
        ((current === skippedEdge[0] && next === skippedEdge[1]) ||
          (current === skippedEdge[1] && next === skippedEdge[0]))
      )
        continue;
      parents[next] = current;
      queue.push(next);
    }
  }
  return null;
}

export function createLevel(definition) {
  const { rows } = definition;
  const height = rows.length;
  const width = rows[0]?.length;
  if (
    !width ||
    width > 9 ||
    height > 9 ||
    rows.some((row) => row.length !== width || /[^#.*STo]/.test(row))
  ) {
    throw new Error('Invalid only-path board: ' + definition.id);
  }
  const cells = rows.join('').split('');
  if (
    cells.filter((cell) => cell === 'S').length !== 1 ||
    cells.filter((cell) => cell === 'T').length !== 1
  ) {
    throw new Error('A board needs one start and one finish: ' + definition.id);
  }
  const neighbors = cells.map((_, cell) => {
    const row = Math.floor(cell / width);
    const col = cell % width;
    return [
      col > 0 ? cell - 1 : -1,
      row > 0 ? cell - width : -1,
      col < width - 1 ? cell + 1 : -1,
      row < height - 1 ? cell + width : -1,
    ].filter((next) => next !== -1);
  });
  const level = {
    ...definition,
    width,
    height,
    cells,
    neighbors,
    start: cells.indexOf('S'),
    end: cells.indexOf('T'),
  };
  const route = shortestPath(level, new Set(), null, true);
  const protectedCount = cells.filter((cell) => '*ST'.includes(cell)).length;
  if (!route || route.length !== protectedCount) {
    throw new Error('The blue cells must form one induced simple path: ' + definition.id);
  }
  if (!Number.isInteger(level.budget) || level.budget < 1) throw new Error('Invalid wall budget');
  for (const name of ['rowLimit', 'columnLimit']) {
    if (level[name] !== undefined && (!Number.isInteger(level[name]) || level[name] < 1)) {
      throw new Error('Invalid wall constraint: ' + definition.id + ' / ' + name);
    }
  }
  return { ...level, route };
}

export function analyzeRoute(level, walls) {
  const placed = new Set(walls);
  if ([...placed].some((cell) => !isPlaceable(level, cell))) return { status: 'invalid' };
  if (placed.size > level.budget) return { status: 'over-budget' };
  const conflict = getWallConflict(level, placed);
  if (conflict) return { status: 'constraint', conflict };

  // Any different simple S–T path omits an edge of the protected path.
  // Removing each protected edge and running BFS therefore finds a genuine
  // counterexample, or proves uniqueness. Dead-end walks never count.
  for (let index = 0; index < level.route.length - 1; index++) {
    const route = shortestPath(level, placed, [level.route[index], level.route[index + 1]]);
    if (route) return { status: 'alternative', route };
  }
  return { status: 'unique', route: level.route };
}
