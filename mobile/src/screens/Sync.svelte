<!-- Sync with the computer: the pairing (scan the code shown in Settings → Phone, or paste its link), sync now, what
     waits to be sent. -->
<script lang="ts">
  import { Capacitor } from '@capacitor/core';
  import { QrCode, RefreshCw } from '@lucide/svelte';
  import { store, t, lang } from '../store.svelte.ts';

  let link = $state('');
  let error = $state('');
  const native = Capacitor.isNativePlatform();
  const fmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' });

  function pair(text: string) {
    error = '';
    if (!store.pair(text)) return void (error = t('m.badLink'));
    link = '';
    void store.sync();
  }

  async function scan() {
    error = '';
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      const ok = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().then((r) => r.available);
      if (!ok) await BarcodeScanner.installGoogleBarcodeScannerModule();
      const { barcodes } = await BarcodeScanner.scan();
      const text = barcodes[0]?.rawValue;
      if (text) pair(text);
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<header class="bar"><h1>{t('m.sync')}</h1></header>

<div class="page">
  {#if store.pairing}
    <p>{t('m.paired', { host: `${store.host || store.pairing.hosts[0]}:${store.pairing.port}` })}</p>
    <button class="btn primary big" disabled={store.syncing} onclick={() => store.sync()}>
      <RefreshCw size={18} /> {store.syncing ? t('m.syncing') : t('m.syncNow')}
    </button>
    {#if store.message}<p class:bad={store.message.bad}>{store.message.text}</p>{/if}
    <p class="faint">{store.lastSync ? t('m.lastSync', { date: fmt.format(new Date(store.lastSync)) }) : t('m.never')}</p>
    <p class="faint">{store.pending.length ? t('m.pending', { count: store.pending.length }) : t('m.noPending')}</p>
    <p class="faint small">{t('m.offlineHint')}</p>
    <button class="btn" onclick={() => store.unpair()}>{t('m.unpair')}</button>
  {:else}
    <p>{t('m.notPaired')}</p>
    <p class="faint small">{t('m.pairHint')}</p>
    {#if native}<button class="btn primary big" onclick={scan}><QrCode size={18} /> {t('m.scan')}</button>{/if}
    <label class="field">
      <span class="faint small">{t('m.paste')}</span>
      <input type="text" bind:value={link} placeholder="potionrack://pair?…" autocapitalize="off" autocomplete="off" spellcheck="false" />
    </label>
    <button class="btn" disabled={!link.trim()} onclick={() => pair(link)}>{t('m.pair')}</button>
    {#if error}<p class="bad">{error}</p>{/if}
  {/if}
</div>

<style>
  .bar {
    padding: 12px 16px 8px;
  }
  h1 {
    margin: 0;
    font-size: 22px;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 4px 16px 24px;
  }
  p {
    margin: 0;
  }
  .small {
    font-size: 13px;
  }
  .big {
    justify-content: center;
    padding: 12px;
    font-size: 16px;
  }
  .btn {
    justify-content: center;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bad {
    color: var(--danger);
  }
</style>
