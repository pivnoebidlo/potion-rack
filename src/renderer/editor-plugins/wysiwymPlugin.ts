import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state';

// ============ Image Preview Widget ============
export class ImagePreviewWidget extends WidgetType {
    constructor(readonly src: string, readonly alt: string, readonly from: number, readonly to: number, readonly view: EditorView) { super(); }
    toDOM() {
        const container = document.createElement('span');
        container.style.display = 'block';
        container.style.margin = '8px 0';
        container.style.position = 'relative';
        const img = document.createElement('img');
        img.src = this.src;
        img.alt = this.alt;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '600px';
        img.style.borderRadius = '6px';
        img.style.display = 'block';
        img.style.objectFit = 'contain';
        img.style.margin = '0 auto';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '4px';
        deleteBtn.style.right = '4px';
        deleteBtn.style.background = 'var(--bg-primary)';
        deleteBtn.style.color = 'var(--text-primary)';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.display = 'none';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        container.addEventListener('mouseenter', () => { deleteBtn.style.display = 'flex'; });
        container.addEventListener('mouseleave', () => { deleteBtn.style.display = 'none'; });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.view.dispatch({ changes: { from: this.from, to: this.to } });
        });
        container.appendChild(img);
        container.appendChild(deleteBtn);
        return container;
    }
}

// ============ Markers ============
export const HIDDEN_MARKER = 'position: absolute; left: -9999px; top: -9999px;';
export const HIDDEN_MARKER_VISIBLE = 'color: var(--text-muted); opacity: 0.5;';

// ============ Slug State ============
export const setSlug = StateEffect.define<string>();
export const slugField = StateField.define<string>({
    create: () => '',
    update: (value, tr) => {
        for (const e of tr.effects) if (e.is(setSlug)) return e.value;
        return value;
    }
});

// ============ WYSIWYM Plugin ============
function safeEncode(str: string): string {
    return str.replace(/&/g, '%26').replace(/ /g, '%20').replace(/#/g, '%23');
}

export const wysiwymPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(readonly view: EditorView) {
        this.decorations = this.buildDecorations(view, view.state.selection.main.head);
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view, update.view.state.selection.main.head);
        }
    }
    buildDecorations(view: EditorView, cursor: number): DecorationSet {
        const slug = view.state.field(slugField, false) || '';
        const safeSlug = safeEncode(slug);
        const items: { from: number; to: number; decoration: Decoration }[] = [];
        const doc = view.state.doc;

        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text;

            // Строка данных таблицы — рендерим как <tr>
            if (/^\|(.+)\|$/.test(text) && !/^\|[-:\s|]+\|$/.test(text)) {
                const cells = text.split('|').filter(c => c.trim() !== '');
                const tr = document.createElement('tr');
                for (const cell of cells) {
                    const td = document.createElement('td');
                    td.textContent = cell.trim();
                    td.style.border = '1px solid var(--border)';
                    td.style.padding = '4px 8px';
                    td.style.fontSize = 'var(--font-size-sm)';
                    tr.appendChild(td);
                }
                items.push({ from: line.from, to: line.to, decoration: Decoration.replace({ widget: new class extends WidgetType { toDOM() { return tr; } } }) });
                continue;
            }
            // Разделитель таблицы — скрываем
            if (/^\|[-:\s|]+\|$/.test(text)) {
                items.push({ from: line.from, to: line.to, decoration: Decoration.mark({ attributes: { style: 'font-size: 0; line-height: 0;' } }) });
                continue;
            }

            if (/^[-]{3,}\s*$/.test(text) || /^[_]{3,}\s*$/.test(text)) {
                const hr = document.createElement('hr');
                hr.style.border = 'none';
                hr.style.borderTop = '1px solid var(--border)';
                hr.style.margin = '0';
                hr.style.lineHeight = '0';
                items.push({ from: line.from, to: line.to, decoration: Decoration.replace({ widget: new class extends WidgetType { toDOM() { return hr; } } }) });
                continue;
            }
            const headingMatch = text.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const markers = headingMatch[1];
                const markerEnd = line.from + markers.length + 1;
                const cursorInside = cursor >= line.from && cursor <= line.to;
                items.push({ from: line.from, to: markerEnd, decoration: Decoration.mark({ attributes: { style: cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER } }) });
                const level = markers.length;
                const fontSize = Math.max(13, 22 - level * 2);
                items.push({ from: markerEnd, to: line.to, decoration: Decoration.mark({ attributes: { style: `font-size: ${fontSize}px; font-weight: 600; color: var(--text-primary);` } }) });
                continue;
            }
            const quoteMatch = text.match(/^>\s?(.*)$/);
            if (quoteMatch) {
                const markerEnd = line.from + 1 + (text[1] === ' ' ? 1 : 0);
                const cursorInside = cursor >= line.from && cursor <= line.to;
                items.push({ from: line.from, to: markerEnd, decoration: Decoration.mark({ attributes: { style: cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER } }) });
                items.push({ from: markerEnd, to: line.to, decoration: Decoration.mark({ attributes: { style: `color: var(--text-secondary); font-style: italic; border-left: 3px solid var(--quote-border, var(--accent)); padding-left: 12px; display: inline-block;` } }) });
                continue;
            }
            const listMatch = text.match(/^(\s*)[-*+]\s+(.+)$/);
            if (listMatch) {
                const indent = listMatch[1];
                const markerStart = line.from + indent.length;
                const markerEnd = markerStart + 2;
                const cursorInside = cursor >= markerStart && cursor <= line.to;
                items.push({ from: markerStart, to: markerEnd, decoration: Decoration.mark({ attributes: { style: cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER } }) });
                items.push({ from: markerStart, to: markerStart, decoration: Decoration.widget({ widget: new class extends WidgetType { toDOM() { const d = document.createElement('span'); d.textContent = '•'; d.style.color = 'var(--list-marker, var(--accent))'; d.style.marginRight = '8px'; return d; } }, side: 0 }) });
                continue;
            }
            const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)|(`(.+?)`)/g;
            let match;
            while ((match = inlineRegex.exec(text)) !== null) {
                const [full, , bold, , italic, , strike, , code] = match;
                const from = line.from + match.index;
                const to = from + full.length;
                const cursorInside = cursor >= from && cursor <= to;
                const markerStyle = cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER;
                if (bold) {
                    items.push({ from, to: from + 2, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 2, to: to - 2, decoration: Decoration.mark({ attributes: { style: 'font-weight: 700; color: var(--text-primary);' } }) });
                    items.push({ from: to - 2, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                } else if (italic) {
                    items.push({ from, to: from + 1, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 1, to: to - 1, decoration: Decoration.mark({ attributes: { style: 'font-style: italic; color: var(--text-secondary);' } }) });
                    items.push({ from: to - 1, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                } else if (strike) {
                    items.push({ from, to: from + 2, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 2, to: to - 2, decoration: Decoration.mark({ attributes: { style: 'text-decoration: line-through; color: var(--text-muted);' } }) });
                    items.push({ from: to - 2, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                } else if (code) {
                    items.push({ from, to: from + 1, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 1, to: to - 1, decoration: Decoration.mark({ attributes: { style: 'background: var(--bg-secondary); padding: 1px 5px; border-radius: 3px; font-family: var(--font-mono); font-size: 12px;' } }) });
                    items.push({ from: to - 1, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                }
            }
            const linkRegex = /\[(.+?)\]\((.+?)\)/g;
            while ((match = linkRegex.exec(text)) !== null) {
                const full = match[0];
                const linkText = match[1];
                const from = line.from + match.index;
                const to = from + full.length;
                const cursorInside = cursor >= from && cursor <= to;
                const textStart = from + 1;
                const textEnd = textStart + linkText.length;
                const markerStyle = cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER;
                items.push({ from, to: from + 1, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                items.push({ from: textStart, to: textEnd, decoration: Decoration.mark({ attributes: { style: `color: var(--link-color, var(--accent)); text-decoration: underline; cursor: pointer;` } }) });
                items.push({ from: textEnd, to: to - 1, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                items.push({ from: to - 1, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
            }
        }

        if (slug) {
            const imageRegex = /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+)\)/g;
            const docText = doc.toString();
            let imgMatch;
            while ((imgMatch = imageRegex.exec(docText)) !== null) {
                const from = imgMatch.index;
                const to = from + imgMatch[0].length;
                const relativePath = imgMatch[2].replace(/^\.\.?\//, '');
                const absoluteUrl = `http://127.0.0.1:8765/figures-data/${safeSlug}/${relativePath}`;
                items.push({ from, to, decoration: Decoration.replace({ widget: new ImagePreviewWidget(absoluteUrl, imgMatch[1], from, to, view) }) });
            }
        }

        items.sort((a, b) => a.from - b.from || a.to - b.to);
        const builder = new RangeSetBuilder<Decoration>();
        for (const item of items) builder.add(item.from, item.to, item.decoration);
        return builder.finish();
    }
}, { decorations: v => v.decorations });