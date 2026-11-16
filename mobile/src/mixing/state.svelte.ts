// The mixer of the phone and what the mixing tab shows; the mix is remembered on this phone.
import type { StepPaint } from '../../../src/shared/types.ts';

const load = (): StepPaint[] => {
  try {
    const v = JSON.parse(localStorage.getItem('mix') ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is StepPaint => typeof x?.paint === 'string' && typeof x?.parts === 'number') : [];
  } catch {
    return [];
  }
};

export const mv = $state<{ mode: 'mixer' | 'recipes'; items: StepPaint[]; recipe: string }>({ mode: 'mixer', items: load(), recipe: '' });

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem('mix', JSON.stringify(mv.items));
    } catch {
      /* not remembered */
    }
  });
});
