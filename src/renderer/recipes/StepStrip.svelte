<!-- The colours of a recipe's steps in a row: the recipe at a glance. -->
<script lang="ts">
  import { stepColor } from '../../shared/recipes.ts';
  import type { Recipe } from '../../shared/types.ts';
  import { store } from '../lib/store.svelte.ts';

  let { recipe, size = 10 }: { recipe: Recipe; size?: number } = $props();
  const colors = $derived(recipe.steps.map((s) => stepColor(s, store.state.rack.paints)).filter(Boolean));
</script>

<span class="strip">
  {#each colors as c, i (i)}<span class="c" style:background={c} style:width="{size}px" style:height="{size}px"></span>{/each}
</span>

<style>
  .strip {
    display: inline-flex;
    flex: none;
  }
  .c {
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 15%, transparent);
  }
  .c + .c {
    margin-left: 1px;
  }
</style>
