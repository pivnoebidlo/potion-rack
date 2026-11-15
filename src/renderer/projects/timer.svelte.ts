// The painting timer: one session at a time, remembered by the window (survives a restart); on stop the session goes
// into the figure's front matter (sessions).
import { sessionText } from '../../shared/projects.ts';
import { store } from '../lib/store.svelte.ts';
import { allFigures } from '../../shared/projects.ts';

const load = (): { path: string; start: number } | null => {
  try {
    const v = JSON.parse(localStorage.getItem('timer') ?? 'null') as { path?: unknown; start?: unknown } | null;
    return v && typeof v.path === 'string' && typeof v.start === 'number' ? { path: v.path, start: v.start } : null;
  } catch {
    return null;
  }
};

export const timer = $state<{ running: { path: string; start: number } | null; now: number }>({ running: load(), now: Date.now() });

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem('timer', JSON.stringify(timer.running));
    } catch {
      /* not remembered */
    }
  });
  // The clock ticks only while a session runs.
  $effect(() => {
    if (!timer.running) return;
    const id = setInterval(() => (timer.now = Date.now()), 1000);
    return () => clearInterval(id);
  });
});

export const elapsedMinutes = () => (timer.running ? (timer.now - timer.running.start) / 60000 : 0);

export function startTimer(path: string) {
  timer.now = Date.now();
  timer.running = { path, start: timer.now };
}

export async function stopTimer() {
  const r = timer.running;
  if (!r) return;
  timer.running = null;
  const minutes = (Date.now() - r.start) / 60000;
  const f = allFigures(store.state.projects).find((x) => x.path === r.path);
  // Shorter than half a minute — a click by mistake.
  if (!f || minutes < 0.5) return;
  await window.api.updateFigure(f.path, { sessions: [...f.meta.sessions, sessionText(new Date(r.start), minutes)] });
}
