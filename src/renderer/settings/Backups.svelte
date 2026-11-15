<!-- Settings → Backups: the snapshots of this rack (restore one), a snapshot now, the full backup to and from a zip. -->
<script lang="ts">
  import { FolderOpen, History } from '@lucide/svelte';
  import type { BackupInfo } from '../../shared/api.ts';
  import { confirm } from '../lib/confirm.svelte.ts';
  import { locale, t } from '../lib/i18n.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';

  let list = $state<BackupInfo[]>([]);
  void window.api.listBackups().then((l) => (list = l));

  const fmt = $derived(new Intl.DateTimeFormat(locale.lang, { dateStyle: 'medium', timeStyle: 'short' }));

  async function restore(b: BackupInfo) {
    if (!(await confirm(t('backups.restoreConfirm', { date: fmt.format(b.created) }), t('backups.restore')))) return;
    list = await window.api.restoreBackup(b.id);
    notify(t('backups.restored'));
  }
  async function importZip() {
    notify(await window.api.importZip());
  }
</script>

<div class="field">
  <span>{t('backups.snapshots')}</span>
  <small class="faint">{t('backups.snapshotsHint')}</small>
  <div class="buttons">
    <button class="btn" onclick={async () => (list = await window.api.createBackup())}><History size={14} /> {t('backups.now')}</button>
    <button class="btn" onclick={() => window.api.revealBackups()}><FolderOpen size={14} /> {t('backups.reveal')}</button>
  </div>
  <div class="list">
    {#each list as b (b.id)}
      <div class="row">
        <span class="when">{fmt.format(b.created)}</span>
        <span class="faint">{t(`backups.reason.${b.reason}`)} · {t('backups.files', { count: b.files })}</span>
        <span class="spacer"></span>
        <button class="btn small" onclick={() => restore(b)}>{t('backups.restore')}</button>
      </div>
    {:else}
      <p class="faint">{t('backups.none')}</p>
    {/each}
  </div>
</div>

<div class="field">
  <span>{t('backups.full')}</span>
  <small class="faint">{t('backups.fullHint')}</small>
  <div class="buttons">
    <button class="btn" onclick={() => window.api.exportZip()}>{t('backups.export')}</button>
    <button class="btn" onclick={importZip}>{t('backups.import')}</button>
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
  }
  .field > span {
    font-weight: 600;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .list {
    max-height: 220px;
    margin-top: 4px;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
  }
  .list p {
    margin: 8px 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    font-size: 12px;
  }
  .row:last-child {
    border-bottom: 0;
  }
  .when {
    white-space: nowrap;
  }
  .spacer {
    flex: 1;
  }
  .btn.small {
    padding: 2px 8px;
    font-size: 12px;
  }
</style>
