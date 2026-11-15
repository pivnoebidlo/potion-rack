// The printable page of an article: the figure's name and data, the article, the paints with their colours.
// Light and plain on purpose (paper), whatever the theme of the app.
import { renderMarkdown } from '../../shared/markdown.ts';
import { parentOf, type Figure } from '../../shared/projects.ts';
import { mentionOf, paintByMention } from '../../shared/rack.ts';
import type { Paint } from '../../shared/types.ts';
import { t } from '../lib/i18n.svelte.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function articlePage(figure: Figure, body: string, paints: readonly Paint[], lang: string): string {
  const m = figure.meta;
  const facts = [
    [t('figure.status'), t(`fstatus.${m.status}`)],
    [t('figure.manufacturer'), m.manufacturer],
    [t('figure.scale'), m.scale],
    [t('figure.material'), m.material],
    [t('figure.started'), m.started],
    [t('figure.finished'), m.finished],
  ].filter(([, v]) => v);
  const used = m.paints.map((id) => paints.find((p) => p.id === id)).filter((p): p is Paint => !!p);
  // Pictures load at once on paper (the reading view loads them lazily).
  const html = renderMarkdown(body, { figurePath: figure.path, paintColor: (s) => paintByMention(s, paints, m.paints)?.hex || null }).replace(/ loading="lazy"/g, '');
  return `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><title>${esc(figure.name)}</title>
<style>
  body { font: 11pt/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #1d1d1f; margin: 0; }
  header { border-bottom: 1px solid #ddd; margin-bottom: 14pt; padding-bottom: 8pt; }
  header h1 { margin: 0 0 2pt; font-size: 22pt; }
  .path { color: #888; font-size: 9pt; }
  dl { display: flex; flex-wrap: wrap; gap: 4pt 18pt; margin: 8pt 0 0; font-size: 9pt; }
  dt { color: #888; } dd { margin: 0 0 0 4pt; } .fact { display: flex; }
  h1, h2, h3 { line-height: 1.25; break-after: avoid; } h1 { font-size: 17pt; } h2 { font-size: 14pt; } h3 { font-size: 12pt; }
  hr { border: 0; border-top: 1px solid #ddd; }
  img { display: block; max-width: 100%; height: auto; margin: 6pt 0; border-radius: 4pt; break-inside: avoid; }
  table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 3pt 7pt; }
  blockquote { margin: 0; padding: 2pt 10pt; border-left: 3pt solid #bbb; color: #555; }
  a { color: inherit; }
  .dot, .sw { display: inline-block; border-radius: 50%; box-shadow: inset 0 0 0 0.6pt rgba(0,0,0,.25); }
  strong.paint .dot { width: .7em; height: .7em; margin-right: .3em; vertical-align: .02em; }
  .paints { margin-top: 18pt; border-top: 1px solid #ddd; break-inside: avoid; }
  .paints li { list-style: none; display: flex; align-items: center; gap: 6pt; margin: 2pt 0; }
  .paints ul { padding: 0; columns: 2; } .sw { width: 10pt; height: 10pt; flex: none; } .line { color: #888; font-size: 9pt; }
</style></head><body>
<header><h1>${esc(figure.name)}</h1>${parentOf(figure.path) ? `<div class="path">${esc(parentOf(figure.path))}</div>` : ''}
${facts.length ? `<dl>${facts.map(([k, v]) => `<div class="fact"><dt>${esc(k!)}:</dt><dd>${esc(v!)}</dd></div>`).join('')}</dl>` : ''}</header>
<main>${html}</main>
${used.length ? `<section class="paints"><h2>${esc(t('figure.paints'))}</h2><ul>${used.map((p) => `<li><span class="sw" style="background:${esc(p.hex || 'transparent')}"></span>${esc(mentionOf(p))} <span class="line">${esc([p.line, p.code].filter(Boolean).join(' · '))}</span></li>`).join('')}</ul></section>` : ''}
</body></html>`;
}
