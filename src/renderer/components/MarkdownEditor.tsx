import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { marked } from 'marked';
import styles from './MarkdownEditor.module.css';
import { t } from '../i18n';

function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
}

function safeEncode(str: string): string {
    return str.replace(/&/g, '%26').replace(/ /g, '%20').replace(/#/g, '%23');
}

function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas not available')); return; }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

class ImagePreviewWidget extends WidgetType {
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

const HIDDEN_MARKER = 'position: absolute; left: -9999px; top: -9999px;';
const HIDDEN_MARKER_VISIBLE = 'color: var(--text-muted); opacity: 0.5;';

// StateField для хранения slug
const slugField = StateField.define<string>({
    create: () => '',
    update: (value, tr) => {
        for (const e of tr.effects) {
            if (e.is(setSlug)) return e.value;
        }
        return value;
    }
});

const setSlug = StateEffect.define<string>();

const wysiwymPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(readonly view: EditorView) {
        this.decorations = this.buildDecorations(view, view.state.selection.main.head);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            const cursor = update.view.state.selection.main.head;
            this.decorations = this.buildDecorations(update.view, cursor);
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
                if (cursorInside) { items.push({ from: line.from, to: markerEnd, decoration: Decoration.mark({ attributes: { style: HIDDEN_MARKER_VISIBLE } }) }); }
                else { items.push({ from: line.from, to: markerEnd, decoration: Decoration.mark({ attributes: { style: HIDDEN_MARKER } }) }); }
                const level = markers.length;
                const fontSize = Math.max(13, 22 - level * 2);
                items.push({ from: markerEnd, to: line.to, decoration: Decoration.mark({ attributes: { style: `font-size: ${fontSize}px; font-weight: 600; color: var(--text-primary);` } }) });
                continue;
            }

            const quoteMatch = text.match(/^>\s?(.*)$/);
            if (quoteMatch) {
                const markerEnd = line.from + 1 + (text[1] === ' ' ? 1 : 0);
                const cursorInside = cursor >= line.from && cursor <= line.to;
                if (cursorInside) { items.push({ from: line.from, to: markerEnd, decoration: Decoration.mark({ attributes: { style: HIDDEN_MARKER_VISIBLE } }) }); }
                else { items.push({ from: line.from, to: markerEnd, decoration: Decoration.mark({ attributes: { style: HIDDEN_MARKER } }) }); }
                items.push({ from: markerEnd, to: line.to, decoration: Decoration.mark({ attributes: { style: `color: var(--text-secondary); font-style: italic; border-left: 3px solid var(--quote-border, var(--accent)); padding-left: 12px; display: inline-block;` } }) });
                continue;
            }

            const listMatch = text.match(/^(\s*)[-*+]\s+(.+)$/);
            if (listMatch) {
                const indent = listMatch[1];
                const markerStart = line.from + indent.length;
                const markerEnd = markerStart + 2;
                const cursorInside = cursor >= markerStart && cursor <= line.to;
                if (cursorInside) { items.push({ from: markerStart, to: markerEnd, decoration: Decoration.mark({ attributes: { style: HIDDEN_MARKER_VISIBLE } }) }); }
                else { items.push({ from: markerStart, to: markerEnd, decoration: Decoration.mark({ attributes: { style: HIDDEN_MARKER } }) }); }
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
                if (bold) {
                    const markerStyle = cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER;
                    items.push({ from, to: from + 2, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 2, to: to - 2, decoration: Decoration.mark({ attributes: { style: 'font-weight: 700; color: var(--text-primary);' } }) });
                    items.push({ from: to - 2, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                } else if (italic) {
                    const markerStyle = cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER;
                    items.push({ from, to: from + 1, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 1, to: to - 1, decoration: Decoration.mark({ attributes: { style: 'font-style: italic; color: var(--text-secondary);' } }) });
                    items.push({ from: to - 1, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                } else if (strike) {
                    const markerStyle = cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER;
                    items.push({ from, to: from + 2, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                    items.push({ from: from + 2, to: to - 2, decoration: Decoration.mark({ attributes: { style: 'text-decoration: line-through; color: var(--text-muted);' } }) });
                    items.push({ from: to - 2, to, decoration: Decoration.mark({ attributes: { style: markerStyle } }) });
                } else if (code) {
                    const markerStyle = cursorInside ? HIDDEN_MARKER_VISIBLE : HIDDEN_MARKER;
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

        items.sort((a, b) => a.from - b.from || a.to - b.to);

        const builder = new RangeSetBuilder<Decoration>();
        for (const item of items) {
            builder.add(item.from, item.to, item.decoration);
        }
        return builder.finish();
    }
}, { decorations: v => v.decorations });

interface MarkdownEditorProps {
    content: string;
    onChange: (v: string) => void;
    onSave: () => void;
    figureName?: string;
    folderPath?: string;
    editorViewRef?: React.MutableRefObject<EditorView | null>;
}

export default function MarkdownEditor({ content, onChange, onSave, figureName, folderPath, editorViewRef }: MarkdownEditorProps) {
    const $t = t();
    const [preview, setPreview] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRefInternal = useRef<EditorView | null>(null);

    const slug = folderPath ? `${folderPath}/${slugify(figureName || '')}` : slugify(figureName || '');

    useEffect(() => {
        setPreview(false);
    }, [slug]);

    useEffect(() => {
        if (!editorRef.current) return;

        // Уничтожаем старый EditorView перед созданием нового
        if (editorViewRefInternal.current) {
            editorViewRefInternal.current.destroy();
            editorViewRefInternal.current = null;
            if (editorViewRef) editorViewRef.current = null;
        }

        console.log('Creating EditorView for slug:', slug);

        const editorTheme = EditorView.theme({
            '&': { background: 'var(--bg-primary)', color: 'var(--text-primary)', height: '100%' },
            '.cm-scroller': { background: 'var(--bg-primary)', overflow: 'auto', height: '100%' },
            '.cm-content': { background: 'var(--bg-primary)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', padding: '24px 32px', fontSize: 'var(--font-size-md)', lineHeight: '1.8' },
            '.cm-gutters': { display: 'none' },
            '.cm-activeLine': { background: 'transparent' },
            '.cm-cursor': { borderLeftColor: 'var(--text-primary)' },
            '.cm-selectionBackground': { background: 'var(--accent-light) !important', borderRadius: '2px' },
            '.cm-matchingBracket': { background: 'var(--accent-light)' },
            '.cm-heading': { textDecoration: 'none !important', borderBottom: 'none !important' },
            '.cm-headingMark': { textDecoration: 'none !important' },
        });

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) { onChange(update.state.doc.toString()); }
        });

        const view = new EditorView({
            doc: content,
            extensions: [
                slugField,
                keymap.of([...defaultKeymap, ...historyKeymap]),
                history(),
                markdown({ base: markdownLanguage, codeLanguages: languages }),
                syntaxHighlighting(defaultHighlightStyle),
                autocompletion(),
                closeBrackets(),
                bracketMatching(),
                EditorView.lineWrapping,
                wysiwymPlugin,
                updateListener,
                editorTheme,
            ],
            parent: editorRef.current,
        });

        view.dispatch({ effects: setSlug.of(slug) });

        editorViewRefInternal.current = view;
        if (editorViewRef) editorViewRef.current = view;
    }, [slug]);

    useEffect(() => {
        const view = editorViewRefInternal.current;
        if (view && view.state.doc.toString() !== content) {
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
        }
    }, [content]);

    useEffect(() => {
        if (typeof onSave !== 'function') return;
        const timer = setTimeout(() => onSave(), 500);
        return () => clearTimeout(timer);
    }, [content, onSave]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link && link.getAttribute('href')) {
                e.preventDefault();
                window.open(link.getAttribute('href')!, '_blank');
            }
        };
        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            if (e.key === 'e') {
                e.preventDefault(); e.stopPropagation();
                setPreview(p => { if (p) { setTimeout(() => editorViewRefInternal.current?.focus(), 50); } return !p; });
                return;
            }
            const view = editorViewRefInternal.current;
            if (!view || !view.hasFocus) return;
            switch (e.key) {
                case 's': e.preventDefault(); onSave(); break;
                case 'b': e.preventDefault(); insertText('**', '**'); break;
                case 'i': e.preventDefault(); insertText('*', '*'); break;
                case 'x': e.preventDefault(); insertText('~~', '~~'); break;
                case 'k': e.preventDefault(); insertText('`', '`'); break;
                case 'u': e.preventDefault(); handleInsertLink(); break;
                case 'l': e.preventDefault(); insertBlock('---', ''); break;
                case '1': e.preventDefault(); insertLine('#'); break;
                case '2': e.preventDefault(); insertLine('##'); break;
                case '3': e.preventDefault(); insertLine('###'); break;
                case 'q': e.preventDefault(); insertLine('>'); break;
                case 'I': if (e.shiftKey) { e.preventDefault(); handleInsertImage(); } break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSave]);

    const insertText = useCallback((before: string, after: string = '') => {
        const view = editorViewRefInternal.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to);
        view.dispatch({ changes: { from, to, insert: `${before}${selectedText}${after}` }, selection: { anchor: from + before.length, head: from + before.length + selectedText.length } });
        view.focus();
    }, []);

    const insertLine = useCallback((prefix: string) => {
        const view = editorViewRefInternal.current;
        if (!view) return;
        const { from } = view.state.selection.main;
        const line = view.state.doc.lineAt(from);
        view.dispatch({ changes: { from: line.from, insert: `${prefix} ` }, selection: { anchor: line.from + prefix.length + 1, head: line.from + prefix.length + 1 } });
        view.focus();
    }, []);

    const insertBlock = useCallback((marker: string, placeholder: string) => {
        const view = editorViewRefInternal.current;
        if (!view) return;
        const { from } = view.state.selection.main;
        view.dispatch({ changes: { from, insert: placeholder ? `${marker}\n${placeholder}\n${marker}\n` : `${marker}\n` } });
        view.focus();
    }, []);

    const handleInsertImage = useCallback(async () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const compressed = await compressImage(file, 1920, 1920, 0.85);
                const base64Data = compressed.split(',')[1];
                const name = figureName || 'unknown';
                const result = await (window as any).electronAPI?.saveImage(folderPath || '', name, file.name, base64Data);
                if (result?.success) {
                    const view = editorViewRefInternal.current;
                    if (!view) return;
                    const { from } = view.state.selection.main;
                    view.dispatch({ changes: { from, insert: `![${file.name}](.${result.path})\n` } });
                    view.focus();
                }
            } catch (err) { console.error('Failed to insert image:', err); }
        };
        input.click();
    }, [figureName, folderPath]);

    const handleInsertLink = useCallback(() => {
        const view = editorViewRefInternal.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to);
        const placeholder = selectedText || 'link text';
        view.dispatch({ changes: { from, to, insert: `[${placeholder}](url)` }, selection: { anchor: from + placeholder.length + 3, head: from + placeholder.length + 6 } });
        view.focus();
    }, []);

    useEffect(() => {
        const container = editorRef.current;
        if (!container) return;
        const handlePaste = async (e: ClipboardEvent) => {
            const view = editorViewRefInternal.current;
            if (!view || !view.hasFocus) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        try {
                            const compressed = await compressImage(file, 1920, 1920, 0.85);
                            const base64Data = compressed.split(',')[1];
                            const name = figureName || 'unknown';
                            const result = await (window as any).electronAPI?.saveImage(folderPath || '', name, file.name, base64Data);
                            if (result?.success) {
                                const { from } = view.state.selection.main;
                                view.dispatch({ changes: { from, insert: `![${file.name}](.${result.path})\n` } });
                            }
                        } catch (err) { console.error('Failed to insert image:', err); }
                    }
                    return;
                }
            }
        };
        container.addEventListener('paste', handlePaste);
        return () => container.removeEventListener('paste', handlePaste);
    }, [figureName, folderPath]);

    const safeSlug = safeEncode(slug);
    const resolvedContent = (content || '')
        .replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`)
        .replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);

    return (
        <div className={styles.root}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Bold (Cmd+B)" onClick={() => insertText('**', '**')}><strong>B</strong></button>
                    <button className={styles.tbBtn} title="Italic (Cmd+I)" onClick={() => insertText('*', '*')}><em>I</em></button>
                    <button className={styles.tbBtn} title="Strikethrough (Cmd+X)" onClick={() => insertText('~~', '~~')}><s>S</s></button>
                    <button className={styles.tbBtn} title="Horizontal line (Cmd+L)" onClick={() => insertBlock('---', '')}>—</button>
                </div>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Heading 1 (Cmd+1)" onClick={() => insertLine('#')}>H1</button>
                    <button className={styles.tbBtn} title="Heading 2 (Cmd+2)" onClick={() => insertLine('##')}>H2</button>
                    <button className={styles.tbBtn} title="Heading 3 (Cmd+3)" onClick={() => insertLine('###')}>H3</button>
                </div>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Bullet list" onClick={() => insertLine('-')}>•</button>
                    <button className={styles.tbBtn} title="Numbered list" onClick={() => insertLine('1.')}>1.</button>
                    <button className={styles.tbBtn} title="Quote (Cmd+Q)" onClick={() => insertLine('>')}>❝</button>
                    <button className={styles.tbBtn} title="Code (Cmd+K)" onClick={() => insertText('`', '`')}>&lt;/&gt;</button>
                </div>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Link (Cmd+U)" onClick={handleInsertLink}>🔗</button>
                    <button className={styles.tbBtn} title="Image (Cmd+Shift+I)" onClick={handleInsertImage}>🖼</button>
                </div>
                <div className={`${styles.toolbarGroup} ${styles.toolbarRight}`}>
                    <button className={styles.tbBtn} onClick={() => setPreview(!preview)} title={preview ? $t.edit : $t.preview}>
                        {preview ? '✏️' : '👁'}
                    </button>
                </div>
            </div>
            {preview ? (
                <div className={styles.preview} dangerouslySetInnerHTML={{ __html: marked(resolvedContent, { breaks: true }) as string }} />
            ) : (
                <div className={styles.editorWrapper} ref={editorRef} style={{ height: '100%' }} />
            )}
        </div>
    );
}