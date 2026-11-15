<script lang="ts">
  let { hex, size = 28 }: { hex: string; size?: number } = $props();
</script>

<span class="sw" class:none={!hex} style:background={hex || null} style:width="{size}px" style:height="{size}px"></span>

<style>
  .sw {
    display: inline-block;
    flex: none;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 20%, transparent);
  }
  .none {
    background: repeating-conic-gradient(var(--bg-active) 0 25%, var(--bg-primary) 0 50%) 50% / 8px 8px;
  }
</style>
