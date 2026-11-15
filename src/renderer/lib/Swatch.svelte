<!-- A paint's colour: a filled square/circle; no colour — a checkered "unknown" pattern. -->
<script lang="ts">
  let { hex, size = 16, round = false, title }: { hex: string; size?: number; round?: boolean; title?: string } = $props();
</script>

<span class="swatch" class:round class:none={!hex} style:--c={hex || 'transparent'} style:width="{size}px" style:height="{size}px" {title}></span>

<style>
  .swatch {
    display: inline-block;
    flex: none;
    border-radius: 3px;
    background: var(--c);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 18%, transparent);
  }
  .round {
    border-radius: 50%;
  }
  .none {
    background: repeating-conic-gradient(var(--bg-active) 0 25%, var(--bg-primary) 0 50%) 50% / 8px 8px;
  }
</style>
