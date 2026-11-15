<!-- The progress of a figure: «before and after» with a slider over two pictures, then all pictures by day (with the
     time painted that day). A click opens a picture large. -->
<script lang="ts">
  import { byTime, duration, imageUrl, sessionOf, type Figure } from '../../shared/projects.ts';
  import Lightbox from '../lib/Lightbox.svelte';
  import { locale, t } from '../lib/i18n.svelte.ts';

  let { figure }: { figure: Figure } = $props();

  const ordered = $derived(byTime(figure));
  const urls = $derived(ordered.map((n) => imageUrl(figure.path, n)));

  // Days: pictures taken that day and the minutes of the sessions of that day.
  const dayKey = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const days = $derived.by(() => {
    const minutes = new Map<string, number>();
    for (const s of figure.meta.sessions) {
      const x = sessionOf(s);
      if (x) minutes.set(x.start.slice(0, 10), (minutes.get(x.start.slice(0, 10)) ?? 0) + x.minutes);
    }
    const out: { day: string; pictures: { name: string; i: number }[]; minutes: number }[] = [];
    ordered.forEach((name, i) => {
      const day = dayKey(figure.times[name] ?? 0);
      let d = out.at(-1);
      if (!d || d.day !== day) out.push((d = { day, pictures: [], minutes: minutes.get(day) ?? 0 }));
      d.pictures.push({ name, i });
    });
    return out.reverse();
  });
  const fmt = $derived(new Intl.DateTimeFormat(locale.lang, { dateStyle: 'long' }));

  // Before / after: the first and the last picture by default.
  let before = $state('');
  let after = $state('');
  $effect(() => {
    void figure.path;
    before = ordered[0] ?? '';
    after = ordered.at(-1) ?? '';
  });
  let split = $state(50);
  let viewing = $state<number | null>(null);
</script>

<div class="progress">
  {#if !ordered.length}
    <p class="faint empty">{t('progress.empty')}</p>
  {:else}
    {#if ordered.length > 1}
      <section class="compare">
        <h3>{t('progress.compare')}</h3>
        <div class="pick">
          <label>{t('progress.before')}
            <select bind:value={before}>{#each ordered as n (n)}<option value={n}>{fmt.format(figure.times[n] ?? 0)} · {n}</option>{/each}</select>
          </label>
          <label>{t('progress.after')}
            <select bind:value={after}>{#each ordered as n (n)}<option value={n}>{fmt.format(figure.times[n] ?? 0)} · {n}</option>{/each}</select>
          </label>
        </div>
        <div class="stage">
          <img src={imageUrl(figure.path, after)} alt="" />
          <img class="top" src={imageUrl(figure.path, before)} alt="" style:clip-path="inset(0 {100 - split}% 0 0)" />
          <div class="line" style:left="{split}%"></div>
          <input class="slider" type="range" min="0" max="100" bind:value={split} aria-label={t('progress.compare')} />
          <span class="tag l">{t('progress.before')}</span>
          <span class="tag r">{t('progress.after')}</span>
        </div>
      </section>
    {/if}

    {#each days as d (d.day)}
      <section class="day">
        <h3>
          {fmt.format(new Date(d.day + 'T12:00'))}
          {#if d.minutes}<span class="faint">· {t('progress.dayTime', { time: duration(d.minutes, t('timer.h'), t('timer.min')) })}</span>{/if}
        </h3>
        <div class="grid">
          {#each d.pictures as p (p.name)}
            <button class="pic" onclick={() => (viewing = p.i)}><img src={urls[p.i]} alt="" loading="lazy" /></button>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>

{#if viewing !== null}<Lightbox {urls} bind:index={viewing} onclose={() => (viewing = null)} />{/if}

<style>
  .progress {
    height: 100%;
    overflow: auto;
    padding: 18px 28px 60px;
  }
  .progress > * {
    max-width: 760px;
    margin-left: auto;
    margin-right: auto;
  }
  .empty {
    padding: 60px 0;
    text-align: center;
  }
  h3 {
    margin: 18px 0 8px;
    font-size: 14px;
  }
  .pick {
    display: flex;
    gap: 14px;
    margin-bottom: 8px;
  }
  .pick label {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    color: var(--text-muted);
    font-size: 12px;
  }
  .stage {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-m);
    background: var(--bg-active);
    user-select: none;
  }
  .stage img {
    display: block;
    width: 100%;
    max-height: 520px;
    object-fit: contain;
  }
  .stage .top {
    position: absolute;
    inset: 0;
    height: 100%;
  }
  .line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: #fff;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }
  .slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: ew-resize;
  }
  .tag {
    position: absolute;
    top: 8px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 11px;
    pointer-events: none;
  }
  .tag.l {
    left: 8px;
  }
  .tag.r {
    right: 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }
  .pic {
    aspect-ratio: 1;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-s);
    background: var(--bg-active);
    cursor: zoom-in;
  }
  .pic img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
