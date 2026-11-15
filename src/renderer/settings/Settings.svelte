<!-- Settings (⌘,): general (language, theme), the rack folder, about. -->
<script lang="ts">
  import { FolderOpen } from '@lucide/svelte';
  import { LANGS, type LangSetting } from '../../shared/i18n/core.ts';
  import { THEMES, type ThemeSetting } from '../../shared/types.ts';
  import Modal from '../lib/Modal.svelte';
  import Backups from './Backups.svelte';
  import Phone from './Phone.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { setSettings, store } from '../lib/store.svelte.ts';

  let { onclose }: { onclose: () => void } = $props();

  const SECTIONS = ['general', 'rack', 'backups', 'phone', 'about'] as const;
  let section = $state<(typeof SECTIONS)[number]>('general');
  const s = $derived(store.state.settings);

  let checking = $state(false);
  let result = $state<{ text: string; url?: string } | null>(null);
  async function checkNow() {
    checking = true;
    const info = await window.api.checkForUpdates();
    checking = false;
    if (!info.latest) result = { text: t('updates.failed') };
    else if (info.newer) result = { text: t('updates.newer', { version: info.latest }), url: info.url };
    else result = { text: t('updates.upToDate') };
  }
</script>

<Modal title={t('app.settings')} {onclose} wide>
  <div class="layout">
    <nav>
      {#each SECTIONS as id (id)}
        <button class:active={section === id} onclick={() => (section = id)}>{t(`settings.${id}`)}</button>
      {/each}
    </nav>
    <div class="content">
      {#if section === 'general'}
        <label class="field">
          <span>{t('settings.language')}</span>
          <select value={s.language} onchange={(e) => setSettings({ language: e.currentTarget.value as LangSetting })}>
            <option value="auto">{t('settings.language.auto')}</option>
            {#each Object.entries(LANGS) as [id, name] (id)}<option value={id}>{name}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>{t('settings.theme')}</span>
          <select value={s.theme} onchange={(e) => setSettings({ theme: e.currentTarget.value as ThemeSetting })}>
            {#each THEMES as th (th)}<option value={th}>{t(`theme.${th}`)}</option>{/each}
          </select>
          <small class="faint">{t('settings.themeHint')}</small>
        </label>
        <div class="field">
          <span>{t('updates.title')}</span>
          <small class="faint">{t('updates.desc', { version: store.state.version })}</small>
          <label class="check">
            <input type="checkbox" checked={s.updates.check} onchange={(e) => setSettings({ updates: { ...s.updates, check: e.currentTarget.checked } })} />
            {t('updates.onLaunch')}
          </label>
          <div class="buttons">
            <button class="btn" disabled={checking} onclick={checkNow}>{checking ? t('updates.checking') : t('updates.checkNow')}</button>
            {#if result}<span class="faint">{result.text}</span>{/if}
            {#if result?.url}<button class="btn primary" onclick={() => window.api.openRelease(result!.url!)}>{t('updates.download')}</button>{/if}
          </div>
        </div>
      {:else if section === 'rack'}
        <div class="field">
          <span>{t('settings.rackFolder')}</span>
          <code>{store.state.rackPath}</code>
          <small class="faint">{t('settings.rackHint')}</small>
          <div class="buttons">
            <button class="btn" onclick={() => window.api.revealRack()}><FolderOpen size={14} /> {t('app.reveal')}</button>
            <button class="btn" onclick={() => window.api.chooseRack()}>{t('settings.chooseFolder')}</button>
            {#if s.rackPath}<button class="btn" onclick={() => window.api.resetRack()}>{t('settings.defaultFolder')}</button>{/if}
          </div>
        </div>
      {:else if section === 'backups'}
        <Backups />
      {:else if section === 'phone'}
        <Phone />
      {:else}
        <h3>Potion Rack</h3>
        <p class="muted">{t('settings.version', { version: store.state.version })}</p>
        <p>{t('settings.aboutText')}</p>
        <p class="faint">
          <a href="https://github.com/Arcturus5404/miniature-paints" target="_blank" rel="noreferrer">{t('catalog.credit', { author: 'Rick Fleuren (Miniature Painter Pro)', license: 'MIT' })}</a>
        </p>
      {/if}
    </div>
  </div>
</Modal>

<style>
  .layout {
    display: flex;
    gap: 18px;
    height: 100%;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 160px;
    flex: none;
  }
  nav button {
    padding: 6px 10px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  nav button:hover {
    background: var(--bg-hover);
  }
  nav button.active {
    background: var(--bg-active);
  }
  .content {
    flex: 1;
    min-width: 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
  }
  .field > span {
    font-weight: 600;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .buttons span {
    align-self: center;
  }
  .field select {
    max-width: 260px;
  }
  code {
    padding: 6px 8px;
    border-radius: var(--radius-s);
    background: var(--bg-primary);
    font-size: 12px;
    word-break: break-all;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  h3 {
    margin: 0 0 4px;
  }
  a {
    color: inherit;
  }
</style>
