<!-- A paint's status as a coloured dot (the same colours as on the desktop). -->
<script lang="ts">
  import type { PaintStatus } from '../../src/shared/types.ts';
  let { status }: { status: PaintStatus } = $props();
</script>

<span class="dot {status}"></span>

<style>
  .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: 50%;
  }
  .have { background: var(--success); }
  .low { background: var(--warning); }
  .out { background: var(--danger); }
  .ordered { background: var(--accent); }
  .wanted { box-shadow: inset 0 0 0 1.5px var(--text-muted); }
</style>
