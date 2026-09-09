/** Storage failures must not stop a game (private mode, quota or damaged JSON). */
export function readJSON(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { value: null, available: false };
  }
  try {
    return { value: raw ? JSON.parse(raw) : null, available: true };
  } catch {
    return { value: null, available: true };
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
