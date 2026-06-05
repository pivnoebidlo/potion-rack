import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { marked } from 'marked';
import styles from './MarkdownEditor.module.css';
import { t } from '../i18n';

const imagePositions: { from: number; to: number }[] = [];

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

function createImagePreviewPlugin(slug: string) {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;
        constructor(readonly view: EditorView) { this.decorations = this.buildDecorations(view); }
        update(update: ViewUpdate) { if (update.docChanged || update.viewportChanged) this.decorations = this.buildDecorations(update.view); }
        buildDecorations(view: EditorView) {
            imagePositions.length = 0;
            const widgets: { from: number; to: number; value: Decoration }[] = [];
            const doc = view.state.doc.toString();

            const base64Regex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
            let match;
            while ((match = base64Regex.exec(doc)) !== null) {
                const from = match.index, to = from + match[0].length, base64 = match[2];
                imagePositions.push({ from, to });
                widgets.push({ from, to, value: Decoration.replace({ widget: new ImagePreviewWidget(base64, match[1], from, to, view) }) });
            }

            const fileRegex = /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+)\)/g;
            while ((match = fileRegex.exec(doc)) !== null) {
                const from = match.index, to = from + match[0].length;
                const filePath = match[2];
                imagePositions.push({ from, to });
                const relativePath = filePath.replace(/^\.\.?\//, '');
                const absoluteUrl = `http://127.0.0.1:8765/figures-data/${slug}/${relativePath}`;
                widgets.push({ from, to, value: Decoration.replace({ widget: new ImagePreviewWidget(absoluteUrl, match[1], from, to, view) }) });
            }

            return Decoration.set(widgets);
        }
    }, { decorations: v => v.decorations });
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

function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-а-яё]/gi, '');
}

interface MarkdownEditorProps {
    content: string;
    onChange: (v: string) => void;
    onSave: () => void;
    figureName?: string;
    folderPath?: string;
}

export default function MarkdownEditor({ content, onChange, onSave, figureName, folderPath }: MarkdownEditorProps) {
    const $t = t();
    const [preview, setPreview] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    const slug = folderPath
        ? `${folderPath}/${slugify(figureName || '')}`
        : slugify(figureName || '');

    // Создаём EditorView при монтировании
    useEffect(() => {
        if (!editorRef.current || editorViewRef.current) return;

        const editorTheme = EditorView.theme({
            '&': { background: 'var(--bg-primary)', color: 'var(--text-primary)', height: '100%' },
            '.cm-scroller': { background: 'var(--bg-primary)', overflow: 'auto', height: '100%' },
            '.cm-content': { background: 'var(--bg-primary)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', padding: '16px' },
            '.cm-gutters': { display: 'none' },
            '.cm-activeLineGutter': { display: 'none' },
            '.cm-activeLine': { background: 'transparent' },
            '.cm-cursor': { borderLeftColor: 'var(--text-primary)' },
            '.cm-selectionBackground': { background: 'rgba(124, 92, 252, 0.3) !important', borderRadius: '2px' },
            '.cm-matchingBracket': { background: 'var(--accent-light)' },
        });

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const newContent = update.state.doc.toString();
                onChange(newContent);
            }
        });

        const view = new EditorView({
            doc: content,
            extensions: [
                keymap.of([...defaultKeymap, ...historyKeymap]),
                history(),
                markdown({ base: markdownLanguage, codeLanguages: languages }),
                syntaxHighlighting(defaultHighlightStyle),
                autocompletion(),
                closeBrackets(),
                bracketMatching(),
                EditorView.lineWrapping,
                createImagePreviewPlugin(slug),
                updateListener,
                editorTheme,
            ],
            parent: editorRef.current,
        });

        editorViewRef.current = view;

        return () => {
            view.destroy();
            editorViewRef.current = null;
        };
    }, []);

    // Обновляем содержимое, если content изменился извне
    useEffect(() => {
        const view = editorViewRef.current;
        if (view && view.state.doc.toString() !== content) {
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: content
                }
            });
        }
    }, [content]);

    // Автосохранение
    useEffect(() => {
        const timer = setTimeout(() => {
            onSave();
        }, 500);
        return () => clearTimeout(timer);
    }, [content]);

    // Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                onSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSave]);

    // Вставка текста
    const insertText = useCallback((before: string, after: string = '') => {
        const view = editorViewRef.current;
        if (!view) return;

        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to);

        view.dispatch({
            changes: { from, to, insert: `${before}${selectedText}${after}` },
            selection: { anchor: from + before.length, head: from + before.length + selectedText.length }
        });

        view.focus();
    }, []);

    const insertLine = useCallback((prefix: string) => {
        const view = editorViewRef.current;
        if (!view) return;

        const { from } = view.state.selection.main;
        const line = view.state.doc.lineAt(from);
        const insert = `${prefix} `;

        view.dispatch({
            changes: { from: line.from, insert },
            selection: { anchor: line.from + insert.length, head: line.from + insert.length }
        });

        view.focus();
    }, []);

    const insertBlock = useCallback((marker: string, placeholder: string) => {
        const view = editorViewRef.current;
        if (!view) return;

        const { from } = view.state.selection.main;
        const insert = placeholder ? `${marker}\n${placeholder}\n${marker}\n` : `${marker}\n`;

        view.dispatch({
            changes: { from, insert },
            selection: { anchor: from + insert.length, head: from + insert.length }
        });

        view.focus();
    }, []);

    const handleInsertImage = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const compressed = await compressImage(file, 1920, 1920, 0.85);
                const base64Data = compressed.split(',')[1];
                const name = figureName || 'unknown';
                const result = await (window as any).electronAPI?.saveImage(folderPath || '', name, file.name, base64Data);

                if (result?.success) {
                    const view = editorViewRef.current;
                    if (!view) return;
                    const { from } = view.state.selection.main;
                    const imageMarkdown = `![${file.name}](.${result.path})\n`;
                    view.dispatch({ changes: { from, insert: imageMarkdown } });
                    view.focus();
                }
            } catch (err) {
                console.error('Failed to insert image:', err);
            }
        };
        input.click();
    }, [figureName, folderPath]);

    const handleInsertLink = useCallback(() => {
        const view = editorViewRef.current;
        if (!view) return;

        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to);
        const placeholder = selectedText || 'link text';
        const insert = `[${placeholder}](url)`;

        view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + placeholder.length + 3, head: from + placeholder.length + 6 }
        });

        view.focus();
    }, []);

    // Вставка из буфера
    useEffect(() => {
        const container = editorRef.current;
        if (!container) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const view = editorViewRef.current;
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
                                const imageMarkdown = `![${file.name}](.${result.path})`;
                                const { from } = view.state.selection.main;
                                view.dispatch({ changes: { from, insert: imageMarkdown + '\n' } });
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

    const resolvedContent = content
        .replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${slug}/images/`)
        .replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${slug}/images/`);

    return (
        <div className={styles.root}>
            {/* Тулбар */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Bold (Ctrl+B)" onClick={() => insertText('**', '**')}><strong>B</strong></button>
                    <button className={styles.tbBtn} title="Italic (Ctrl+I)" onClick={() => insertText('*', '*')}><em>I</em></button>
                    <button className={styles.tbBtn} title="Strikethrough" onClick={() => insertText('~~', '~~')}><s>S</s></button>
                    <button className={styles.tbBtn} title="Horizontal line" onClick={() => insertBlock('---', '')}>—</button>
                </div>

                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Heading 1" onClick={() => insertLine('#')}>H1</button>
                    <button className={styles.tbBtn} title="Heading 2" onClick={() => insertLine('##')}>H2</button>
                    <button className={styles.tbBtn} title="Heading 3" onClick={() => insertLine('###')}>H3</button>
                </div>

                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Bullet list" onClick={() => insertLine('-')}>•</button>
                    <button className={styles.tbBtn} title="Numbered list" onClick={() => insertLine('1.')}>1.</button>
                    <button className={styles.tbBtn} title="Quote" onClick={() => insertLine('>')}>❝</button>
                    <button className={styles.tbBtn} title="Code" onClick={() => insertText('`', '`')}>&lt;/&gt;</button>
                </div>

                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Link (Ctrl+K)" onClick={handleInsertLink}>🔗</button>
                    <button className={styles.tbBtn} title="Image (Ctrl+Shift+I)" onClick={handleInsertImage}>🖼</button>
                </div>

                <div className={`${styles.toolbarGroup} ${styles.toolbarRight}`}>
                    <button className={`${styles.tbBtn} ${!preview ? styles.active : ''}`} onClick={() => setPreview(false)} title="Edit">✏️</button>
                    <button className={`${styles.tbBtn} ${preview ? styles.active : ''}`} onClick={() => setPreview(true)} title="Preview">👁</button>
                </div>
            </div>

            {/* Превью */}
            <div
                className={styles.preview}
                style={{ display: preview ? 'block' : 'none' }}
                dangerouslySetInnerHTML={{ __html: marked(resolvedContent, { breaks: true }) as string }}
            />

            {/* Редактор */}
            <div
                className={styles.editorWrapper}
                ref={editorRef}
                style={{ display: preview ? 'none' : 'block', height: '100%' }}
            />
        </div>
    );
}