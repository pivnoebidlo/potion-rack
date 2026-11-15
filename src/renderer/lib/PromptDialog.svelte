<!-- The host of promptText(): a name in a dialog, Enter — done, Esc — cancel. -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import { asking } from './confirm.svelte.ts';
  import { t } from './i18n.svelte.ts';

  const q = $derived(asking.q!);
  let value = $state(asking.q?.value ?? '');
  let input = $state<HTMLInputElement>();
  $effect(() => {
    input?.focus();
    input?.select();
  });

  function done(v: string | null) {
    q.resolve(v === null || !v.trim() ? null : v.trim());
    asking.q = null;
  }
</script>

<Modal title={q.title} onclose={() => done(null)}>
  <input type="text" class="name" bind:this={input} bind:value onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), done(value))} />
  {#snippet footer()}
    <button class="btn" onclick={() => done(null)}>{t('app.cancel')}</button>
    <button class="btn primary" disabled={!value.trim()} onclick={() => done(value)}>OK</button>
  {/snippet}
</Modal>

<style>
  .name {
    width: 100%;
  }
</style>
