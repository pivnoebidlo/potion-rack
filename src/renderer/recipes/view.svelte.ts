// What the recipes module shows, and the actions on recipes.
import { newRecipe } from '../../shared/recipes.ts';
import type { Recipe } from '../../shared/types.ts';
import { confirm, promptText } from '../lib/confirm.svelte.ts';
import { t } from '../lib/i18n.svelte.ts';
import { dispatch, store } from '../lib/store.svelte.ts';
import { openModule } from '../lib/workspace.svelte.ts';

export const rview = $state({ selected: null as string | null, search: '' });

export const selectedRecipe = (): Recipe | null => store.state.rack.recipes.find((r) => r.id === rview.selected) ?? null;
export const recipeTitle = (r: Recipe) => r.name || t('recipes.untitled');

export const newId = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function createRecipe() {
  const name = await promptText(t('recipes.newName'));
  if (!name) return;
  const recipe = newRecipe(newId('r'), new Date().toISOString(), { name, steps: [{ id: newId('s'), kind: 'base', paints: [], note: '' }] });
  await dispatch({ type: 'recipe/add', recipe });
  rview.selected = recipe.id;
}

export async function duplicateRecipe(r: Recipe) {
  const copy = newRecipe(newId('r'), new Date().toISOString(), {
    ...r,
    name: t('recipes.copy', { name: recipeTitle(r) }),
    steps: r.steps.map((s) => ({ ...s, id: newId('s') })),
  });
  await dispatch({ type: 'recipe/add', recipe: copy });
  rview.selected = copy.id;
}

export async function removeRecipe(r: Recipe) {
  if (!(await confirm(t('recipes.deleteConfirm', { name: recipeTitle(r) }), t('app.delete'), true))) return;
  if (rview.selected === r.id) rview.selected = null;
  await dispatch({ type: 'recipe/remove', id: r.id });
}

export function openRecipe(id: string) {
  rview.selected = id;
  openModule('recipes');
}
