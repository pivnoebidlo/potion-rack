<!-- Mixing: the mixer (paints in parts → the colour) and the recipes it saves into. -->
<script lang="ts">
  import { t } from '../store.svelte.ts';
  import Mixer from './Mixer.svelte';
  import Recipe from './Recipe.svelte';
  import Recipes from './Recipes.svelte';
  import { mv } from './state.svelte.ts';
</script>

{#if mv.mode === 'recipes' && mv.recipe}
  <Recipe id={mv.recipe} onback={() => (mv.recipe = '')} />
{:else}
  <header class="bar">
    <h1>{t('app.mixer')}</h1>
    <div class="seg">
      <button class:on={mv.mode === 'mixer'} onclick={() => (mv.mode = 'mixer')}>{t('mixer.mix')}</button>
      <button class:on={mv.mode === 'recipes'} onclick={() => (mv.mode = 'recipes')}>{t('app.recipes')}</button>
    </div>
  </header>
  {#if mv.mode === 'mixer'}<Mixer />{:else}<Recipes />{/if}
{/if}
