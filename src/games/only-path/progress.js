import { readJSON, writeJSON } from '../../shared/storage.js';
import { STORAGE_KEY } from './config.js';
import { analyzeRoute, isPlaceable } from './engine.js';

const record = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function cleanWalls(level, value) {
  if (
    !Array.isArray(value) ||
    value.length > level.budget ||
    value.some((cell) => !isPlaceable(level, cell))
  )
    return [];
  return [...new Set(value)];
}

export function loadProgress(levels) {
  const saved = readJSON(STORAGE_KEY);
  const source = saved.value?.version === 1 ? record(saved.value) : {};
  const drafts = {};
  const best = {};
  for (const level of levels) {
    const draft = record(record(source.drafts)[level.id]);
    drafts[level.id] = {
      walls: cleanWalls(level, draft.walls),
      checks:
        Number.isSafeInteger(draft.checks) && draft.checks >= 0 && draft.checks <= 1000000
          ? draft.checks
          : 0,
    };
    const previous = record(source.best)[level.id];
    if (Array.isArray(previous)) {
      const walls = cleanWalls(level, previous);
      if (analyzeRoute(level, walls).status === 'unique') best[level.id] = walls;
    }
  }
  return {
    available: saved.available,
    progress: {
      version: 1,
      levelId: levels.some((level) => level.id === source.levelId)
        ? source.levelId
        : typeof source.levelId === 'string' && source.levelId.startsWith('challenge-')
          ? (levels.find((level) => level.difficulty === 'challenge') ?? levels[0]).id
          : levels[0].id,
      drafts,
      best,
    },
  };
}

export const saveProgress = (progress) => writeJSON(STORAGE_KEY, progress);
