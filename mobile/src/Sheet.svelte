<!-- A sheet from the bottom of the screen over a shade; a tap on the shade closes it. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { onclose, tall = false, children }: { onclose: () => void; tall?: boolean; children: Snippet } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="shade" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="sheet" class:tall onclick={(e) => e.stopPropagation()}>
    {@render children()}
  </div>
</div>

<style>
  .shade {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    background: rgba(0, 0, 0, 0.45);
  }
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-height: calc(100dvh - env(safe-area-inset-top) - 24px);
    overflow: auto;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0;
    background: var(--bg-secondary);
  }
  .sheet.tall {
    height: calc(100dvh - env(safe-area-inset-top) - 24px);
  }
</style>
