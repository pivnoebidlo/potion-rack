import { describe, expect, it } from 'vitest';
import { renderMarkdown, headings } from '../src/shared/markdown.ts';
import {
  applyMetaPatch, convertLegacyMarkdown, emptyMeta, extraData, figureText, findFolder, metaFromData, parseFrontmatter, safeName,
  serializeFrontmatter, type FolderNode,
} from '../src/shared/projects.ts';

describe('front matter', () => {
  it('reads what people type', () => {
    const { data, body } = parseFrontmatter(`---
status: painting
manufacturer: "Games Workshop"
scale: 32mm
paints:
  - legacy79
  - legacy23
tags: [a, 'b c']
# a comment
---
# Title
text`);
    expect(data).toEqual({ status: 'painting', manufacturer: 'Games Workshop', scale: '32mm', paints: ['legacy79', 'legacy23'], tags: ['a', 'b c'] });
    expect(body).toBe('# Title\ntext');
  });

  it('leaves text without front matter alone', () => {
    expect(parseFrontmatter('# Hi\n---\nx')).toEqual({ data: {}, body: '# Hi\n---\nx' });
  });

  it('round-trips, quoting only what needs it', () => {
    const text = serializeFrontmatter(
      [['status', 'done'], ['link', 'https://x.com/a?b=1'], ['scale', '1:72'], ['price', 12.5], ['empty', ''], ['paints', ['a', 'b']], ['n', '123']],
      '\n\nBody'
    );
    expect(text).toBe('---\nstatus: done\nlink: "https://x.com/a?b=1"\nscale: "1:72"\nprice: 12.5\npaints:\n  - a\n  - b\nn: "123"\n---\n\nBody');
    const back = parseFrontmatter(text);
    expect(back.data).toMatchObject({ link: 'https://x.com/a?b=1', scale: '1:72', price: '12.5', paints: ['a', 'b'], n: '123' });
    expect(back.body).toBe('Body');
  });

  it('normalizes meta, maps 0.6 statuses', () => {
    expect(metaFromData({ status: 'in-progress', price: '3,5', bought: 'yesterday', paints: ['a', 'a', 'b'], cover: 'images/x.jpg' })).toMatchObject({
      status: 'painting', price: 3.5, bought: '', paints: ['a', 'b'], cover: 'x.jpg',
    });
    expect(metaFromData({}).status).toBe('pile');
  });

  it('patches meta and writes a whole file', () => {
    const meta = applyMetaPatch(emptyMeta('2026-11-15'), { status: 'primed', paints: ['p1'], price: null });
    expect(meta).toMatchObject({ status: 'primed', paints: ['p1'], price: null, created: '2026-11-15' });
    const text = figureText(meta, 'Article');
    expect(parseFrontmatter(text).body).toBe('Article');
    expect(metaFromData(parseFrontmatter(text).data)).toEqual(meta);
  });
});

it('keeps keys it does not know', () => {
  const { data, body } = parseFrontmatter('---\nstatus: done\ntags:\n  - goblins\n---\n\nText');
  const text = figureText(metaFromData(data), body, extraData(data));
  expect(parseFrontmatter(text).data).toMatchObject({ status: 'done', tags: ['goblins'] });
});

it('makes safe folder names', () => {
  expect(safeName('  Green / Goblin: v2?  ')).toBe('Green Goblin v2');
  expect(safeName('...hidden')).toBe('hidden');
  expect(safeName('name. ')).toBe('name');
  expect(safeName('///')).toBe('');
  expect(safeName('Зелёный Гоблин')).toBe('Зелёный Гоблин');
});

it('converts 0.6 markdown images', () => {
  expect(convertLegacyMarkdown('a\n![image.png](../images/img_1.png =400)\nb')).toBe('a\n![|400](images/img_1.png)\nb');
  expect(convertLegacyMarkdown('2. **X** – teeth![pic](../images/img_2.png =400)')).toBe('2. **X** – teeth\n![pic|400](images/img_2.png)');
  expect(convertLegacyMarkdown('![x](images/a.png)')).toBe('![x](images/a.png)');
  expect(convertLegacyMarkdown('![x](https://e.com/a.png)')).toBe('![x](https://e.com/a.png)');
});

it('finds folders', () => {
  const tree: FolderNode = {
    path: '', name: '', figures: [],
    folders: [{ path: 'D&D', name: 'D&D', figures: [], folders: [{ path: 'D&D/Goblins', name: 'Goblins', figures: [], folders: [] }] }],
  };
  expect(findFolder(tree, 'D&D/Goblins')?.name).toBe('Goblins');
  expect(findFolder(tree, 'D&D/Orcs')).toBeNull();
  expect(findFolder(tree, '')).toBe(tree);
});

describe('markdown', () => {
  const opts = { figurePath: 'D&D/Green Goblin', paintColor: (t: string) => (t === 'Vallejo Heavy Siena' ? '#5e483b' : null) };

  it('resolves local images with width', () => {
    const html = renderMarkdown('![Base coat|400](images/a%20b.png)', opts);
    expect(html).toContain('src="rack://projects/D%26D/Green%20Goblin/images/a%20b.png"');
    expect(html).toContain('style="width:400px"');
    expect(html).toContain('alt="Base coat"');
  });

  it('shows raw html as text and drops unsafe links', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](https://e.com)', opts);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://e.com"');
  });

  it('marks paint names', () => {
    const html = renderMarkdown('Took **Vallejo Heavy Siena** and **something**', opts);
    expect(html).toContain('<strong class="paint"><span class="dot" style="background:#5e483b"></span>Vallejo Heavy Siena</strong>');
    expect(html).toContain('<strong>something</strong>');
  });

  it('lists headings with ids that match the rendered ones', () => {
    const text = '# Покраска\n```\n# not a heading\n```\n## Нижняя часть';
    expect(headings(text)).toEqual([
      { depth: 1, text: 'Покраска', id: 'покраска', line: 1 },
      { depth: 2, text: 'Нижняя часть', id: 'нижняя-часть', line: 5 },
    ]);
    expect(renderMarkdown(text, opts)).toContain('<h2 id="нижняя-часть">');
  });
});
