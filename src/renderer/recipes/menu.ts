// The actions of a recipe: right click in the list and the «⋯» of the editor.
import { Copy, Trash2 } from '@lucide/svelte';
import type { Recipe } from '../../shared/types.ts';
import type { MenuItem } from '../lib/ContextMenu.svelte';
import { t } from '../lib/i18n.svelte.ts';
import { duplicateRecipe, removeRecipe } from './view.svelte.ts';

export const recipeMenu = (r: Recipe): MenuItem[] => [
  { label: t('recipes.duplicate'), icon: Copy, action: () => void duplicateRecipe(r) },
  { label: t('recipes.delete'), icon: Trash2, danger: true, action: () => void removeRecipe(r) },
];
