<!-- A newer version on GitHub (found on launch, if the check is on). Three stages:
     available — offer to download in-app (or open the release page if canInstall is false);
     downloading — progress bar, no dismiss;
     ready — restart to apply the downloaded update. -->
<script lang="ts">
  import { Download, RotateCcw, X } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import type { UpdateInfo } from '../../shared/updates.ts';
  import { t } from './i18n.svelte.ts';

  type Stage = 'available' | 'downloading' | 'ready' | 'error';

  let info = $state<UpdateInfo | null>(null);
  let stage = $state<Stage>('available');
  let pct = $state(0);

  onMount(() => {
    window.api.onUpdateAvailable((i) => { info = i; stage = 'available'; pct = 0; });
    window.api.onUpdateProgress((p) => { pct = Math.round(p * 100); });
    window.api.onUpdateReady(() => { stage = 'ready'; });
    window.api.onUpdateError(() => { stage = 'error'; });
  });

  async function download() {
    if (!info) return;
    if (info.canInstall) {
      stage = 'downloading';
      pct = 0;
      await window.api.downloadUpdate();
    } else {
      await window.api.openRelease(info.url);
    }
  }

  async function skip() {
    if (info?.latest) await window.api.setUpdateSettings({ skip: info.latest });
    info = null;
  }

  function dismiss() { info = null; }
</script>

{#if info?.latest}
  <div class="banner" role="status">
    {#if stage === 'available'}
      <span>{t('updates.available', { version: info.latest, current: info.current })}</span>
      <button class="btn primary" onclick={download}><Download size={14} /> {t('updates.download')}</button>
      <button class="btn" onclick={skip}>{t('updates.skip')}</button>
      <button class="icon-btn" title={t('updates.later')} onclick={dismiss}><X size={14} /></button>
    {:else if stage === 'downloading'}
      <span>{t('updates.downloading', { version: info.latest, pct })}</span>
      <div class="progress"><div class="bar" style="width:{pct}%"></div></div>
    {:else if stage === 'ready'}
      <span>{info.latest}</span>
      <button class="btn primary" onclick={() => window.api.installUpdate()}><RotateCcw size={14} /> {t('updates.restart')}</button>
      <button class="btn" onclick={dismiss}>{t('updates.later')}</button>
    {:else}
      <span>{t('updates.downloadFailed')}</span>
      <button class="btn" onclick={() => info && window.api.openRelease(info.url)}>{t('updates.download')}</button>
      <button class="icon-btn" title={t('updates.later')} onclick={dismiss}><X size={14} /></button>
    {/if}
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 120;
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    width: min(380px, calc(100vw - 32px));
    padding: 8px 10px 8px 14px;
    border: 1px solid var(--accent);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  }
  .progress {
    flex: 1;
    min-width: 60px;
    height: 4px;
    border-radius: 2px;
    background: var(--bg-active);
    overflow: hidden;
  }
  .bar {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
</style>
