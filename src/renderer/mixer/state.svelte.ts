// The mixer's state: the mode, the paints of the mix, the wanted colour (remembered by the window).
import { newRecipe } from '../../shared/recipes.ts';
import type { StepKind } from '../../shared/types.ts';
import { t } from '../lib/i18n.svelte.ts';
import { dispatch } from '../lib/store.svelte.ts';
import { notify } from '../lib/toast.svelte.ts';
import { newId, openRecipe } from '../recipes/view.svelte.ts';

interface Saved {
  mode: 'mix' | 'match' | 'reference' | 'harmony';
  items: { paint: string; parts: number }[];
  target: string;
  onShelf: boolean;
}

const load = (): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem('mixer') ?? '{}') as Partial<Saved>;
    return { mode: s.mode === 'match' || s.mode === 'reference' || s.mode === 'harmony' ? s.mode : 'mix', items: Array.isArray(s.items) ? s.items : [], target: s.target ?? '', onShelf: s.onShelf !== false };
  } catch {
    return { mode: 'mix', items: [], target: '', onShelf: true };
  }
};

export const mixer = $state<Saved>(load());

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem('mixer', JSON.stringify(mixer));
    } catch {
      /* not remembered */
    }
  });
});

// A mix becomes a recipe of one step.
export async function saveAsRecipe(items: { paint: string; parts: number }[], hex: string, kind: StepKind = 'base') {
  const recipe = newRecipe(newId('r'), new Date().toISOString(), {
    name: t('mixer.recipeName', { hex }),
    steps: [{ id: newId('s'), kind, paints: items.map((i) => ({ ...i })), note: '' }],
  });
  await dispatch({ type: 'recipe/add', recipe });
  notify(t('mixer.saved'));
  openRecipe(recipe.id);
}

// The reference picture of «From a picture» and its colours: for this session only (not saved, may be big).
export const reference = $state<{ url: string; count: number; colours: { hex: string; share: number; picked?: boolean }[] }>({
  url: '',
  count: 6,
  colours: [],
});
