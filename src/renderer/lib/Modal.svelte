<!-- A dialog over the window: Esc or a click outside closes it. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, onclose, wide = false, children, footer }: { title: string; onclose: () => void; wide?: boolean; children: Snippet; footer?: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (e.preventDefault(), onclose())} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="modal" class:wide role="dialog" aria-modal="true" aria-label={title}>
    <h2>{title}</h2>
    <div class="body">{@render children()}</div>
    {#if footer}<div class="footer">{@render footer()}</div>{/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.45);
    -webkit-app-region: no-drag;
  }
  .modal {
    display: flex;
    flex-direction: column;
    width: min(420px, calc(100vw - 40px));
    max-height: calc(100vh - 60px);
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  .modal.wide {
    width: min(760px, calc(100vw - 40px));
    height: min(560px, calc(100vh - 60px));
  }
  h2 {
    margin: 0;
    padding: 14px 18px 0;
    font-size: 15px;
  }
  .body {
    flex: 1;
    min-height: 0;
    padding: 12px 18px;
    overflow: auto;
    user-select: text;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 18px 14px;
  }
</style>
