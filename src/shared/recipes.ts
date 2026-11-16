// Recipes as pure functions: reading them from the rack file, what a recipe needs, which paints are missing.
import { mixPaints } from './mixing.ts';
import { STEP_KINDS, type Paint, type Recipe, type RecipeStep, type StepKind, type StepPaint } from './types.ts';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function normalizeStepPaint(raw: unknown): StepPaint | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const paint = str(p['paint']);
  const parts = Number(p['parts']);
  return paint ? { paint, parts: Number.isFinite(parts) && parts > 0 ? Math.min(99, Math.round(parts * 10) / 10) : 1 } : null;
}

export function normalizeStep(raw: unknown, i: number): RecipeStep | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const kind = STEP_KINDS.includes(s['kind'] as StepKind) ? (s['kind'] as StepKind) : 'other';
  const paints = (Array.isArray(s['paints']) ? s['paints'] : []).map(normalizeStepPaint).filter((x): x is StepPaint => !!x);
  return { id: str(s['id']) || `s${i}`, kind, paints, note: typeof s['note'] === 'string' ? s['note'] : '' };
}

export function normalizeRecipe(raw: unknown, now: string): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r['id']);
  if (!id) return null;
  const seen = new Set<string>();
  const steps = (Array.isArray(r['steps']) ? r['steps'] : [])
    .map(normalizeStep)
    .filter((x): x is RecipeStep => !!x)
    .map((s, i) => (seen.has(s.id) ? { ...s, id: `${s.id}-${i}` } : (seen.add(s.id), s)));
  return {
    id,
    name: str(r['name']),
    note: typeof r['note'] === 'string' ? r['note'] : '',
    steps,
    created: str(r['created']) || now,
    updated: str(r['updated']) || now,
  };
}

export function newRecipe(id: string, now: string, init: Partial<Recipe> = {}): Recipe {
  return normalizeRecipe({ ...init, id, created: now, updated: now }, now)!;
}

export const recipePaintIds = (r: Recipe) => [...new Set(r.steps.flatMap((s) => s.paints.map((p) => p.paint)))];

export const recipesWithPaint = (recipes: readonly Recipe[], paintId: string) => recipes.filter((r) => recipePaintIds(r).includes(paintId));

// Paints the recipe needs that are not on the shelf now: used up, ordered, wanted, or gone from the rack (null).
export function missingPaints(r: Recipe, paints: readonly Paint[]): { id: string; paint: Paint | null }[] {
  const out: { id: string; paint: Paint | null }[] = [];
  for (const id of recipePaintIds(r)) {
    const p = paints.find((x) => x.id === id) ?? null;
    if (!p || (p.status !== 'have' && p.status !== 'low')) out.push({ id, paint: p });
  }
  return out;
}

// The colour a step gives: the paint's own, or the mix of its paints (as pigments mix, shared/mixing.ts).
export function stepColor(step: RecipeStep, paints: readonly Paint[]): string {
  const items = step.paints.map((sp) => ({ hex: paints.find((p) => p.id === sp.paint)?.hex ?? '', parts: step.paints.length > 1 ? sp.parts : 1 }));
  return mixPaints(items);
}

// «2 : 1» — the parts of a mix.
export const ratioText = (step: RecipeStep) => step.paints.map((p) => String(p.parts).replace('.', ',')).join(' : ');
