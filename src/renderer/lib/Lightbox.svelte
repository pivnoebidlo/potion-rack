<!-- A photo full size over the window: ← → go through the others, Esc or a click closes. -->
<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';

  let { urls, index = $bindable(0), onclose }: { urls: string[]; index: number; onclose: () => void } = $props();
  const go = (d: number) => (index = (index + d + urls.length) % urls.length);

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<svelte:window onkeydowncapture={onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="lightbox" onclick={onclose}>
  <img src={urls[index]} alt="" />
  <button class="icon-btn close"><X size={20} /></button>
  {#if urls.length > 1}
    <button class="icon-btn nav prev" onclick={(e) => (e.stopPropagation(), go(-1))}><ChevronLeft size={28} /></button>
    <button class="icon-btn nav next" onclick={(e) => (e.stopPropagation(), go(1))}><ChevronRight size={28} /></button>
  {/if}
</div>

<style>
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 150;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.85);
    -webkit-app-region: no-drag;
  }
  img {
    max-width: calc(100vw - 120px);
    max-height: calc(100vh - 60px);
    object-fit: contain;
    border-radius: var(--radius-s);
  }
  .icon-btn {
    position: absolute;
    color: #ddd;
  }
  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .close {
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
  }
  .nav {
    top: 50%;
    width: 44px;
    height: 64px;
    transform: translateY(-50%);
  }
  .prev {
    left: 12px;
  }
  .next {
    right: 12px;
  }
</style>
