const KEY = 'stellar-drift-hs-v1';

export interface HighScore { score: number; wave: number; date: string; }

export function loadHighscores(): HighScore[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HighScore[];
  } catch { return []; }
}

export function saveHighscore(score: number, wave: number): HighScore[] {
  const list = loadHighscores();
  list.push({ score, wave, date: new Date().toISOString().slice(0, 10) });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 5);
  try { localStorage.setItem(KEY, JSON.stringify(dedupeHighscores(top))); } catch {}
  return top;
}

export function renderHighscores(el: HTMLElement, list: HighScore[]) {
  if (list.length === 0) { el.innerHTML = '<div style="opacity:0.6">// no scores yet //</div>'; return; }
  el.innerHTML = list.map((h, i) =>
    `<div><span style="color:#ff3cf2">#${i + 1}</span> &nbsp; ${h.score.toLocaleString('en')} &nbsp; <span style="color:#889">W${h.wave} · ${h.date}</span></div>`
  ).join('');
}


function dedupeHighscores<T extends any>(scores: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const entry of scores) {
    const value: any = entry;
    const score = typeof value === 'number' ? value : value?.score;
    const wave = typeof value === 'object' ? value?.wave : '';
    const date = typeof value === 'object' ? value?.date : '';
    const key = `${score}|${wave}|${date}`;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }

  return result;
}
