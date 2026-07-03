import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state';

// ============ Image Preview Widget ============
export class ImagePreviewWidget extends WidgetType {
    private img: HTMLImageElement | null = null;

    constructor(
        readonly src: string,
        readonly alt: string,
        readonly from: number,
        readonly to: number,
        readonly view: EditorView,
        readonly displayWidth?: number,
        readonly displayHeight?: number,
        readonly isSelected?: boolean
    ) { super(); }

    toDOM() {
        const container = document.createElement('span');
        container.style.display = 'block';
        container.style.margin = '8px 0';
        container.style.position = 'relative';
        const img = document.createElement('img');
        this.img = img;
        img.src = this.src;
        img.onerror = () => {
            img.style.display = 'none';
        };
        img.alt = this.alt;
        if (this.displayWidth) img.style.width = `${this.displayWidth}px`;
        if (this.displayHeight) img.style.height = `${this.displayHeight}px`;
        if (!this.displayWidth && !this.displayHeight) {
            img.style.maxWidth = '100%';
            img.style.maxHeight = '600px';
        }
        const imageBorder = localStorage.getItem('potion-rack-image-border') !== 'false';
        img.style.borderRadius = '6px';
        img.style.display = 'block';
        img.style.objectFit = 'contain';
        img.style.margin = '0 auto';
        if (imageBorder) {
            img.style.border = '1px solid var(--border)';
        }
        if (this.isSelected) {
            img.style.outline = '2px solid var(--accent)';
            img.style.outlineOffset = '2px';
            img.style.borderRadius = '4px';
        }

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋';
        copyBtn.style.position = 'absolute';
        copyBtn.style.top = '4px';
        copyBtn.style.right = '60px';
        copyBtn.style.background = 'var(--bg-primary)';
        copyBtn.style.color = 'var(--text-primary)';
        copyBtn.style.border = 'none';
        copyBtn.style.borderRadius = '50%';
        copyBtn.style.width = '24px';
        copyBtn.style.height = '24px';
        copyBtn.style.fontSize = '12px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.display = 'none';
        copyBtn.style.alignItems = 'center';
        copyBtn.style.justifyContent = 'center';
        copyBtn.title = 'Copy image';
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const response = await fetch(this.src);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });

        const resizeBtn = document.createElement('button');
        resizeBtn.textContent = '✂️';
        resizeBtn.style.position = 'absolute';
        resizeBtn.style.top = '4px';
        resizeBtn.style.right = '32px';
        resizeBtn.style.background = 'var(--bg-primary)';
        resizeBtn.style.color = 'var(--text-primary)';
        resizeBtn.style.border = 'none';
        resizeBtn.style.borderRadius = '50%';
        resizeBtn.style.width = '24px';
        resizeBtn.style.height = '24px';
        resizeBtn.style.fontSize = '12px';
        resizeBtn.style.cursor = 'pointer';
        resizeBtn.style.display = 'none';
        resizeBtn.style.alignItems = 'center';
        resizeBtn.style.justifyContent = 'center';
        resizeBtn.title = 'Resize image';
        resizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cb = this.view.state.field(resizeCallbackField, false);
            if (cb) cb(this.from, this.to, this.displayWidth, this.displayHeight);
        });

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
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.view.dispatch({ changes: { from: this.from, to: this.to } });
        });

        container.addEventListener('mouseenter', () => {
            deleteBtn.style.display = 'flex';
            resizeBtn.style.display = 'flex';
            copyBtn.style.display = 'flex';
        });
        container.addEventListener('mouseleave', () => {
            deleteBtn.style.display = 'none';
            resizeBtn.style.display = 'none';
            copyBtn.style.display = 'none';
        });

        container.appendChild(img);
        container.appendChild(copyBtn);
        container.appendChild(resizeBtn);
        container.appendChild(deleteBtn);
        return container;
    }

    destroy() {
        if (this.img) {
            this.img.src = '';
            this.img = null;
        }
    }
}

// ============ Table Placeholder Widget ============
export class TablePlaceholderWidget extends WidgetType {
    constructor(
        readonly from: number,
        readonly to: number,
        readonly rows: number,
        readonly cols: number,
        readonly view: EditorView
    ) { super(); }

    toDOM() {
        const container = document.createElement('div');
        container.className = 'cm-table-placeholder';
        container.setAttribute('data-table-from', String(this.from));
        container.setAttribute('data-table-to', String(this.to));
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '10px';
        container.style.padding = '10px 14px';
        container.style.margin = '12px 0';
        container.style.background = 'var(--bg-primary)';
        container.style.border = '1px solid var(--border)';
        container.style.borderRadius = '6px';
        container.style.cursor = 'pointer';
        container.style.userSelect = 'none';

        container.addEventListener('mouseenter', () => {
            container.style.background = 'var(--bg-hover)';
            container.style.borderColor = 'var(--accent)';
        });
        container.addEventListener('mouseleave', () => {
            container.style.background = 'var(--bg-primary)';
            container.style.borderColor = 'var(--border)';
        });
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            container.dispatchEvent(new CustomEvent('table-placeholder-click', {
                bubbles: true,
                detail: { from: this.from, to: this.to }
            }));
        });

        const tableLabel = this.view.state.field(tableLabelField, false) || 'Таблица';
        const label = document.createElement('span');
        label.textContent = `${tableLabel} ${this.rows}×${this.cols}`;
        label.style.fontSize = '13px';
        label.style.color = 'var(--text-primary)';

        container.appendChild(label);
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

// ============ Resize Callback State ============
export const setResizeCallback = StateEffect.define<(from: number, to: number, currentWidth?: number, currentHeight?: number) => void>();
export const resizeCallbackField = StateField.define<((from: number, to: number, currentWidth?: number, currentHeight?: number) => void) | null>({
    create: () => null,
    update: (value, tr) => {
        for (const e of tr.effects) if (e.is(setResizeCallback)) return e.value;
        return value;
    }
});

// ============ Table Label State ============
export const setTableLabel = StateEffect.define<string>();
export const tableLabelField = StateField.define<string>({
    create: () => 'Таблица',
    update: (value, tr) => {
        for (const e of tr.effects) if (e.is(setTableLabel)) return e.value;
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

            // Находим таблицы и добавляем плашки
            if (/^\|(.+)\|$/.test(text)) {
                let insideTable = false;
                if (line.number > 1) {
                    const prevLine = doc.line(line.number - 1);
                    if (/^\|(.+)\|$/.test(prevLine.text)) insideTable = true;
                }
                if (insideTable) continue;

                let start = line.from;
                let end = line.to;
                const doc2 = view.state.doc;

                for (let j = line.number + 1; j <= doc2.lines; j++) {
                    if (/^\|(.+)\|$/.test(doc2.line(j).text)) end = doc2.line(j).to;
                    else break;
                }

                const tableText = doc2.sliceString(start, end).trim();
                const tableLines = tableText.split('\n').filter(l => /^\|.+/.test(l));
                const dataRows = tableLines.length > 2 ? tableLines.length - 2 : Math.max(0, tableLines.length - 1);
                const colCount = tableLines[0] ? (tableLines[0].match(/\|/g) || []).length - 1 : 0;

                items.push({
                    from: start,
                    to: start,
                    decoration: Decoration.widget({
                        widget: new TablePlaceholderWidget(start, end, dataRows, colCount, view),
                        side: 1
                    })
                });

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
                    items.push({ from: from + 2, to: to - 2, decoration: Decoration.mark({ attributes: {
                                style: 'text-decoration: line-through !important; color: var(--text-muted);'
                            } }) });
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

        if (slug && slug.trim()) {
            const imageRegex = /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+?)(?:\s*=\s*(\d+)?x?(\d+)?)?\)/g;
            const docText = doc.toString();
            let imgMatch;
            while ((imgMatch = imageRegex.exec(docText)) !== null) {
                const from = imgMatch.index;
                const to = from + imgMatch[0].length;
                const relativePath = imgMatch[2].replace(/^\.\.?\//, '');
                const absoluteUrl = `http://127.0.0.1:8765/figures-data/${safeSlug}/${relativePath}`;
                const width = imgMatch[3] ? parseInt(imgMatch[3]) : undefined;
                const height = imgMatch[4] ? parseInt(imgMatch[4]) : undefined;
                const selFrom = view.state.selection.main.from;
                const selTo = view.state.selection.main.to;
                const isSelected = (selFrom <= to && selTo >= from);
                items.push({ from, to, decoration: Decoration.replace({ widget: new ImagePreviewWidget(absoluteUrl, imgMatch[1], from, to, view, width, height, isSelected) }) });
            }
        }

        items.sort((a, b) => a.from - b.from || a.to - b.to);
        const builder = new RangeSetBuilder<Decoration>();
        for (const item of items) builder.add(item.from, item.to, item.decoration);
        return builder.finish();
    }
}, { decorations: v => v.decorations });