<!-- A picture of a figure: from the phone's own copy, the cache, or the desktop (fetched once). -->
<script lang="ts">
  import { ImageOff } from '@lucide/svelte';
  import { pictureKey, srcs, want } from '../pictures.ts';
  import { store } from '../store.svelte.ts';

  let { figure, name, w = 300, alt = '', onclick }: { figure: string; name: string; w?: number; alt?: string; onclick?: () => void } = $props();
  const key = $derived(pictureKey(figure, name, w));
  const src = $derived(srcs.get(key) ?? '');
  $effect(() => want(figure, name, w, store.remote, store.uploads.some((u) => u.name === name)));
</script>

{#if src}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <img {src} {alt} {onclick} />
{:else}
  <span class="none"><ImageOff size={18} /></span>
{/if}

<style>
  img,
  .none {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .none {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-hover);
    color: var(--text-faint);
  }
</style>
