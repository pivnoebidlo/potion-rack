// Numbers of the rack and the projects for the statistics page. Pure: the window and (later) a mobile app share it.
import { FIGURE_STATUSES, allFigures, sessionOf, totalMinutes, type FigureStatus, type FolderNode } from './projects.ts';
import { tally } from './rack.ts';
import type { Rack } from './types.ts';

export interface MonthValue {
  // 'YYYY-MM'
  month: string;
  value: number;
}

export interface Stats {
  paints: { total: number; onShelf: number; low: number; out: number; wanted: number; ordered: number };
  brands: { value: string; count: number }[];
  spentOnPaints: number;
  figures: { total: number; byStatus: Record<FigureStatus, number> };
  spentOnFigures: number;
  // The last 12 months, oldest first.
  finishedByMonth: MonthValue[];
  minutesByMonth: MonthValue[];
  finishedThisYear: number;
  minutesThisYear: number;
  minutesTotal: number;
  // Average painting time of finished figures that have sessions; null — none.
  avgMinutesPerFinished: number | null;
  recipes: number;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function lastMonths(now: Date, n = 12): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return out;
}

export function computeStats(rack: Rack, tree: FolderNode, now: Date): Stats {
  const p = rack.paints;
  const figures = allFigures(tree);
  const months = lastMonths(now);
  const year = String(now.getFullYear());

  const finished = new Map<string, number>();
  const minutes = new Map<string, number>();
  for (const f of figures) {
    if (f.meta.status === 'done' && f.meta.finished) finished.set(f.meta.finished.slice(0, 7), (finished.get(f.meta.finished.slice(0, 7)) ?? 0) + 1);
    for (const s of f.meta.sessions) {
      const x = sessionOf(s);
      if (x) minutes.set(x.start.slice(0, 7), (minutes.get(x.start.slice(0, 7)) ?? 0) + x.minutes);
    }
  }
  const sumYear = (m: Map<string, number>) => [...m].filter(([k]) => k.startsWith(year)).reduce((s, [, v]) => s + v, 0);

  const byStatus = Object.fromEntries(FIGURE_STATUSES.map((s) => [s, 0])) as Record<FigureStatus, number>;
  for (const f of figures) byStatus[f.meta.status]++;

  const timed = figures.filter((f) => f.meta.status === 'done' && totalMinutes(f.meta) > 0);

  return {
    paints: {
      total: p.length,
      onShelf: p.filter((x) => x.status === 'have' || x.status === 'low').length,
      low: p.filter((x) => x.status === 'low').length,
      out: p.filter((x) => x.status === 'out').length,
      wanted: p.filter((x) => x.status === 'wanted').length,
      ordered: p.filter((x) => x.status === 'ordered').length,
    },
    brands: tally(p.map((x) => x.brand)),
    // Bought paints only: a wanted one has not cost anything yet.
    spentOnPaints: p.filter((x) => x.status !== 'wanted').reduce((s, x) => s + (x.price ?? 0) * Math.max(1, x.count), 0),
    figures: { total: figures.length, byStatus },
    spentOnFigures: figures.reduce((s, f) => s + (f.meta.price ?? 0), 0),
    finishedByMonth: months.map((month) => ({ month, value: finished.get(month) ?? 0 })),
    minutesByMonth: months.map((month) => ({ month, value: minutes.get(month) ?? 0 })),
    finishedThisYear: sumYear(finished),
    minutesThisYear: sumYear(minutes),
    minutesTotal: [...minutes.values()].reduce((s, v) => s + v, 0),
    avgMinutesPerFinished: timed.length ? timed.reduce((s, f) => s + totalMinutes(f.meta), 0) / timed.length : null,
    recipes: rack.recipes.length,
  };
}
