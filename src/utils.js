export function createSeededRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function shuffle(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randomChoice(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
