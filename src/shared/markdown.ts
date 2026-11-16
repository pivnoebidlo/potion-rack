// The article of a figure as HTML (the reading view and PDF later). Raw HTML in the text is shown as text; images
// from images/ go through the rack:// protocol; `![caption|400](…)` sets the width (as in Obsidian).
import { Marked, type Tokens } from 'marked';
import { imageUrl } from './projects.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface RenderOptions {
  figurePath: string;
  // Bold text that is a paint name → its colour (a dot before the name).
  paintColor?: (text: string) => string | null;
  // Where a picture of images/ comes from (the phone: its own copy); by default the rack:// protocol of the desktop.
  imageSrc?: (name: string) => string;
}

// GitHub-style heading ids: 'Нижняя часть' → 'нижняя-часть'.
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');

export function renderMarkdown(text: string, opts: RenderOptions): string {
  const md = new Marked({ gfm: true, breaks: true });
  md.use({
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return esc(text);
      },
      image({ href, text }: Tokens.Image) {
        const [alt, w] = (() => {
          const m = /^(.*)\|(\d+)(?:x\d+)?$/.exec(text);
          return m ? [m[1]!, m[2]!] : [text, ''];
        })();
        let src = href;
        const local = /^(?:\.\/)?images\/(.+)$/.exec(decodeURI(href));
        if (local) src = opts.imageSrc ? opts.imageSrc(local[1]!) : imageUrl(opts.figurePath, local[1]!);
        else if (!/^(https?:|data:image\/)/.test(href)) return esc(`![${text}](${href})`);
        return `<img src="${esc(src)}" alt="${esc(alt)}"${w ? ` style="width:${Number(w)}px"` : ''} data-view${local ? ` data-name="${esc(local[1]!)}"` : ''} loading="lazy">`;
      },
      link({ href, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        if (href.startsWith('#')) return `<a href="${esc(href)}" data-anchor>${inner}</a>`;
        if (!/^(https?:|mailto:)/.test(href)) return inner;
        return `<a href="${esc(href)}" target="_blank" rel="noreferrer">${inner}</a>`;
      },
      heading({ tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${esc(slug(inner))}">${inner}</h${depth}>\n`;
      },
      strong({ tokens }: Tokens.Strong) {
        const inner = this.parser.parseInline(tokens);
        const plain = tokens.map((t) => ('text' in t ? t.text : '')).join('');
        const color = opts.paintColor?.(plain);
        return color ? `<strong class="paint"><span class="dot" style="background:${esc(color)}"></span>${inner}</strong>` : `<strong>${inner}</strong>`;
      },
    },
  });
  return md.parse(text, { async: false }) as string;
}

// Headings of the article for the table of contents.
export interface Heading {
  depth: number;
  text: string;
  id: string;
  // 1-based line of the source.
  line: number;
}

export function headings(text: string): Heading[] {
  const out: Heading[] = [];
  let fence = false;
  for (const [i, line] of text.split('\n').entries()) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const t = m[2]!.replace(/[*_`~]/g, '');
      out.push({ depth: m[1]!.length, text: t, id: slug(esc(t)), line: i + 1 });
    }
  }
  return out;
}
