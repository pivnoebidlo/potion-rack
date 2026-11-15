<!-- Settings → Phone: sync with the Android app over Wi-Fi. On — a QR code to pair the phone (the link holds this
     computer's addresses, the port and the key); the last sync; a new key unpairs the old phone. -->
<script lang="ts">
  import { renderSVG } from 'uqr';
  import { confirm } from '../lib/confirm.svelte.ts';
  import { locale, t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';

  const ph = $derived(store.state.settings.phone);
  const live = $derived(store.state.phone);
  const qr = $derived(live ? renderSVG(live.link, { border: 1 }) : '');
  const fmt = $derived(new Intl.DateTimeFormat(locale.lang, { dateStyle: 'medium', timeStyle: 'short' }));

  async function renew() {
    if (await confirm(t('phone.renewConfirm'), t('phone.renew'))) await window.api.renewPhone();
  }
</script>

<div class="field">
  <span>{t('phone.title')}</span>
  <small class="faint">{t('phone.hint')}</small>
  <label class="check">
    <input type="checkbox" checked={ph.enabled} onchange={(e) => window.api.enablePhone(e.currentTarget.checked)} />
    {t('phone.enable')}
  </label>
</div>

{#if ph.enabled && live}
  <div class="pair">
    <div class="qr">{@html qr}</div>
    <div class="info">
      <p>{t('phone.scan')}</p>
      <p class="faint small">{t('phone.address')}: <code>{live.hosts.length ? live.hosts.map((h) => `${h}:${live.port}`).join(', ') : '—'}</code></p>
      {#if !live.hosts.length}<p class="warn small">{t('phone.noNetwork')}</p>{/if}
      <p class="faint small">
        {#if ph.lastSync}{t('phone.lastSync', { date: fmt.format(new Date(ph.lastSync)), device: ph.device || '—' })}{:else}{t('phone.never')}{/if}
      </p>
      <button class="btn" onclick={renew}>{t('phone.renew')}</button>
    </div>
  </div>
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }
  .field > span {
    font-weight: 600;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pair {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .qr {
    width: 190px;
    flex: none;
    padding: 8px;
    border-radius: var(--radius-m);
    background: #fff;
    color: #000;
  }
  .qr :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .info p {
    margin: 0 0 8px;
  }
  .small {
    font-size: 12px;
  }
  .warn {
    color: var(--warning);
  }
  code {
    user-select: text;
  }
</style>
