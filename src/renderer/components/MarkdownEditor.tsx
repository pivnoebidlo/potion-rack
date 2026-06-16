import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap, foldService } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { marked } from 'marked';
import styles from './MarkdownEditor.module.css';
import { t } from '../i18n';
import { wysiwymPlugin, setSlug, slugField, setResizeCallback, resizeCallbackField } from '../editor-plugins/wysiwymPlugin';
import { tableNavPlugin } from '../editor-plugins/tableNavPlugin';
import ImageResizeModal from './ImageResizeModal';
import TableEditorModal from './TableEditorModal';

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

interface MarkdownEditorProps {
    content: string;
    onChange: (v: string) => void;
    onSave: () => void;
    figureName?: string;
    folderPath?: string;
    figureId?: number;
    editorViewRef?: React.MutableRefObject<EditorView | null>;
}

const viewPool = new Map<string, { view: EditorView; container: HTMLDivElement }>();

function createEditorView(
    content: string,
    slug: string,
    parent: HTMLElement,
    onChange: (v: string) => void,
    handleResizeExisting: (from: number, to: number, w?: number, h?: number) => void,
    showLineNumbers: boolean
): EditorView {
    const editorTheme = EditorView.theme({
        '&': { background: 'var(--bg-primary)', color: 'var(--text-primary)', height: '100%' },
        '.cm-scroller': { background: 'var(--bg-primary)', overflow: 'auto', height: '100%' },
        '.cm-content': { background: 'var(--bg-primary)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', padding: '24px 32px', fontSize: 'var(--font-size-md)', lineHeight: '1.8' },
        '.cm-gutters': { background: 'var(--bg-primary)', borderRight: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)', lineHeight: '1.8' },
        '.cm-foldGutter': { width: '20px' },
        '.cm-foldGutter .cm-gutterElement': { padding: '0 4px', cursor: 'pointer', color: 'var(--text-muted)' },
        '.cm-activeLine': { background: 'transparent' },
        '.cm-cursor': { borderLeftColor: 'var(--text-primary)' },
        '.cm-selectionBackground': { background: 'var(--accent-light) !important', borderRadius: '2px' },
        '.cm-matchingBracket': { background: 'var(--accent-light)' },
        '.cm-heading': { textDecoration: 'none !important', borderBottom: 'none !important' },
        '.cm-headingMark': { textDecoration: 'none !important' },
        '.cm-strikethrough': { textDecoration: 'line-through' },
        '.cm-line': { },
        '& .cm-panels': { backgroundColor: 'transparent !important', color: 'inherit !important' },
        '& .cm-panels-bottom': { borderTop: '1px solid var(--search-border) !important' },
        '& .cm-panel.cm-search': { background: 'var(--bg-primary) !important', padding: '8px 16px !important' },
        '.cm-search .cm-textfield': { background: 'var(--bg-input) !important', border: '1px solid var(--border-light) !important', color: 'var(--text-primary) !important', padding: '6px 10px !important', fontSize: '13px', width: '220px' },
        '.cm-search .cm-textfield::placeholder': { color: 'var(--text-muted) !important' },
        '.cm-search .cm-button': { background: 'transparent !important', border: 'none !important', color: 'var(--text-muted) !important', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' },
        '.cm-search .cm-button:hover': { color: 'var(--text-primary) !important' },
        '.cm-search .cm-button[name="close"]': { display: 'none' },
        '.cm-search label': { color: 'var(--text-secondary) !important', fontSize: '11px' },
        '.cm-search input[type="checkbox"]': { accentColor: 'var(--accent)', margin: '0 4px' },
    });
    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
    });
    const view = new EditorView({
        state: EditorState.create({
            doc: content,
            extensions: [
                slugField.init(() => slug),
                resizeCallbackField,
                ...(showLineNumbers ? [lineNumbers()] : []),
                search({ top: false }),
                foldGutter(),
                foldService.of((state, lineStart, lineEnd) => {
                    const line = state.doc.lineAt(lineStart);
                    const match = line.text.match(/^(#{1,6})\s/);
                    if (!match) return null;

                    const level = match[1].length;
                    let end = lineEnd;
                    for (let i = line.number + 1; i <= state.doc.lines; i++) {
                        const nextLine = state.doc.line(i);
                        const nextMatch = nextLine.text.match(/^(#{1,6})\s/);
                        if (nextMatch && nextMatch[1].length <= level) {
                            end = nextLine.from;
                            break;
                        }
                        end = nextLine.to;
                    }

                    return { from: line.from, to: end };
                }),
                keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap]),
                history(),
                markdown({ base: markdownLanguage, codeLanguages: languages }),
                syntaxHighlighting(defaultHighlightStyle),
                autocompletion(),
                closeBrackets(),
                bracketMatching(),
                EditorView.lineWrapping,
                tableNavPlugin,
                wysiwymPlugin,
                updateListener,
                editorTheme,
            ],
        }),
        parent,
    });
    view.dispatch({ effects: setResizeCallback.of(handleResizeExisting) });
    return view;
}

export default function MarkdownEditor({ content, onChange, onSave, figureName, folderPath, figureId, editorViewRef }: MarkdownEditorProps) {
    const $t = t();
    const [preview, setPreview] = useState(false);
    const [resizeModalOpen, setResizeModalOpen] = useState(false);
    const [resizeImagePath, setResizeImagePath] = useState('');
    const [resizeInsertCallback, setResizeInsertCallback] = useState<(width: number | null, height: number | null) => void>(() => {});
    const [tableEditorOpen, setTableEditorOpen] = useState(false);
    const [tableEditorMarkdown, setTableEditorMarkdown] = useState('');
    const [tableEditorFrom, setTableEditorFrom] = useState(0);
    const [tableEditorTo, setTableEditorTo] = useState(0);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRefInternal = useRef<EditorView | null>(null);
    const lastSavedContent = useRef(content);
    const slug = folderPath ? `${folderPath}/${figureName || ''}` : (figureName || '');
    const safeSlug = safeEncode(slug);

    const [showLineNumbers] = useState(() => {
        return localStorage.getItem('potion-rack-show-line-numbers') === 'true';
    });

    const handleResizeExisting = useCallback((from: number, to: number, currentWidth?: number, currentHeight?: number) => {
        const v = editorViewRefInternal.current; if (!v) return;
        const text = v.state.sliceDoc(from, to);
        const match = text.match(/!\[([^\]]*)\]\((\.\.?\/images\/[^)]+?)(?:\s*=\s*\d*x?\d*)?\)/);
        if (match) {
            const imgPath = match[2];
            setResizeImagePath(imgPath);
            setResizeInsertCallback(() => (width: number | null, height: number | null) => {
                const alt = match[1];
                const sizeStr = width ? (height ? ` =${width}x${height}` : ` =${width}`) : '';
                v.dispatch({ changes: { from, to, insert: `![${alt}](${imgPath}${sizeStr})` } });
                v.focus();
            });
            setResizeModalOpen(true);
        }
    }, []);

    useEffect(() => {
        if (!editorRef.current) return;
        if (!slug) return;

        const container = editorRef.current;

        const currentView = editorViewRefInternal.current;
        if (currentView) {
            const currentSlug = [...viewPool.entries()].find(([, v]) => v.view === currentView)?.[0];
            if (currentSlug && currentSlug !== slug) {
                const pooled = viewPool.get(currentSlug);
                if (pooled) {
                    pooled.container.appendChild(currentView.dom);
                }
            }
        }

        let pooled = viewPool.get(slug);
        if (!pooled) {
            const viewContainer = document.createElement('div');
            viewContainer.style.display = 'none';
            document.body.appendChild(viewContainer);
            const view = createEditorView(content, slug, viewContainer, onChange, handleResizeExisting, showLineNumbers);
            pooled = { view, container: viewContainer };
            viewPool.set(slug, pooled);
        } else {
            if (pooled.view.state.doc.toString() !== content) {
                pooled.view.dispatch({
                    changes: { from: 0, to: pooled.view.state.doc.length, insert: content }
                });
            }
        }

        container.innerHTML = '';
        container.appendChild(pooled.view.dom);
        editorViewRefInternal.current = pooled.view;
        if (editorViewRef) editorViewRef.current = pooled.view;
        pooled.view.dispatch({ effects: setSlug.of(slug) });
        pooled.view.dispatch({ effects: setResizeCallback.of(handleResizeExisting) });

        setPreview(false);
    }, [slug]);

    useEffect(() => {
        const h = (e: MouseEvent) => { const a = (e.target as HTMLElement).closest('a'); if (a?.getAttribute('href')) { e.preventDefault(); window.open(a.getAttribute('href')!, '_blank'); } };
        document.addEventListener('click', h, true);
        return () => document.removeEventListener('click', h, true);
    }, []);

    useEffect(() => {
        if (content === lastSavedContent.current) return;
        if (content.trim() === '') return;
        const timer = setTimeout(() => {
            lastSavedContent.current = content;
            onSave();
        }, 2000);
        return () => clearTimeout(timer);
    }, [content, onSave]);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        const dbl = (e: MouseEvent) => {
            const v = editorViewRefInternal.current;
            if (!v?.hasFocus) return;
            const pos = v.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos == null) return;
            const line = v.state.doc.lineAt(pos);
            const text = line.text;
            if (/^\|(.+)\|$/.test(text)) {
                e.preventDefault();
                let start = line.from;
                let end = line.to;
                const doc = v.state.doc;
                for (let i = line.number - 1; i >= 1; i--) {
                    if (/^\|(.+)\|$/.test(doc.line(i).text)) start = doc.line(i).from;
                    else break;
                }
                for (let i = line.number + 1; i <= doc.lines; i++) {
                    if (/^\|(.+)\|$/.test(doc.line(i).text)) end = doc.line(i).to;
                    else break;
                }
                if (end < doc.length && doc.sliceString(end, end) === '\n') {
                    end = end + 1;
                }
                const tableMarkdown = v.state.sliceDoc(start, end);
                setTableEditorMarkdown(tableMarkdown);
                setTableEditorFrom(start);
                setTableEditorTo(end);
                setTableEditorOpen(true);
            }
        };
        el.addEventListener('dblclick', dbl);
        return () => el.removeEventListener('dblclick', dbl);
    }, []);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                const v = editorViewRefInternal.current;
                if (v?.hasFocus) {
                    const pos = e.key === 'Backspace' ? v.state.selection.main.from : v.state.selection.main.to;
                    const docText = v.state.doc.toString();
                    const imageRegex = /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+?(?:\s*=\s*\d*x?\d*)?)\)/g;
                    let match;
                    while ((match = imageRegex.exec(docText)) !== null) {
                        const imgFrom = match.index;
                        const imgTo = imgFrom + match[0].length;
                        const cursorAtEnd = e.key === 'Delete' && pos >= imgFrom && pos < imgTo;
                        const cursorAtStart = e.key === 'Backspace' && pos > imgFrom && pos <= imgTo;
                        if (cursorAtEnd || cursorAtStart) {
                            e.preventDefault();
                            e.stopPropagation();
                            v.dispatch({ changes: { from: imgFrom, to: imgTo } });
                            return;
                        }
                    }
                }
            }

            const mod = e.metaKey || e.ctrlKey; if (!mod) return;

            if (e.code === 'KeyX' && e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                toggleWrap('~~');
                return;
            }
            if (e.code === 'KeyE' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                setPreview(p => { if (p) setTimeout(() => editorViewRefInternal.current?.focus(), 50); return !p; });
                return;
            }

            const v = editorViewRefInternal.current; if (!v?.hasFocus) return;
            switch (e.code) {
                case 'KeyS':
                    e.preventDefault();
                    e.stopPropagation();
                    onSave();
                    break;
                case 'KeyB':
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWrap('**');
                    break;
                case 'KeyI':
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.shiftKey) {
                        handleInsertImage();
                    } else {
                        toggleWrap('*');
                    }
                    break;
                case 'KeyK':
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWrap('`');
                    break;
                case 'KeyU':
                    e.preventDefault();
                    e.stopPropagation();
                    handleInsertLink();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    e.stopPropagation();
                    insertBlock('---', '');
                    break;
                case 'Digit1':
                    e.preventDefault();
                    e.stopPropagation();
                    insertLine('#');
                    break;
                case 'Digit2':
                    e.preventDefault();
                    e.stopPropagation();
                    insertLine('##');
                    break;
                case 'Digit3':
                    e.preventDefault();
                    e.stopPropagation();
                    insertLine('###');
                    break;
                case 'KeyQ':
                    e.preventDefault();
                    e.stopPropagation();
                    insertLine('>');
                    break;
            }
        };
        window.addEventListener('keydown', h, true);
        return () => window.removeEventListener('keydown', h, true);
    }, [onSave]);

    const toggleWrap = useCallback((marker: string) => {
        const v = editorViewRefInternal.current; if (!v) return;
        const { from, to } = v.state.selection.main;
        const s = v.state.sliceDoc(from, to);
        const len = marker.length;

        const before = v.state.sliceDoc(Math.max(0, from - len), from);
        const after = v.state.sliceDoc(to, Math.min(v.state.doc.length, to + len));

        if (before === marker && after === marker) {
            v.dispatch({
                changes: [
                    { from: from - len, to: from },
                    { from: to, to: to + len }
                ],
                selection: { anchor: from - len, head: to - len }
            });
        } else {
            v.dispatch({
                changes: { from, to, insert: marker + s + marker },
                selection: { anchor: from + len, head: from + len + s.length }
            });
        }
        v.focus();
    }, []);

    const insertLine = useCallback((prefix: string) => {
        const v = editorViewRefInternal.current; if (!v) return;
        const line = v.state.doc.lineAt(v.state.selection.main.from);
        v.dispatch({ changes: { from: line.from, insert: prefix + ' ' }, selection: { anchor: line.from + prefix.length + 1 } });
        v.focus();
    }, []);
    const insertBlock = useCallback((marker: string, placeholder: string) => {
        const v = editorViewRefInternal.current; if (!v) return;
        v.dispatch({ changes: { from: v.state.selection.main.from, insert: placeholder ? marker + '\n' + placeholder + '\n' + marker + '\n' : marker + '\n' } });
        v.focus();
    }, []);
    const handleInsertTable = useCallback((rows: number, cols: number) => {
        const v = editorViewRefInternal.current; if (!v) return;
        const header = '|' + ' Заголовок |'.repeat(cols) + '\n';
        const separator = '|' + '-----|'.repeat(cols) + '\n';
        const row = '|' + ' Ячейка |'.repeat(cols) + '\n';
        let table = header + separator;
        for (let i = 0; i < rows; i++) table += row;
        v.dispatch({ changes: { from: v.state.selection.main.from, insert: table } });
        v.focus();
    }, []);
    const handleInsertImage = useCallback(async () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async (e) => {
            const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
            try {
                const c = await compressImage(f, 1920, 1920, 0.85);
                const r = await (window as any).electronAPI?.saveImage(folderPath || '', figureName || 'unknown', f.name, c.split(',')[1]);
                if (r?.success) {
                    setResizeImagePath(r.path);
                    setResizeInsertCallback(() => (width: number | null, height: number | null) => {
                        const v = editorViewRefInternal.current; if (!v) return;
                        const sizeStr = width ? (height ? ` =${width}x${height}` : ` =${width}`) : '';
                        const insertPos = v.state.selection.main.from;
                        const inserted = `![${f.name}](.${r.path}${sizeStr})\n`;
                        v.dispatch({ changes: { from: insertPos, insert: inserted } });
                        v.dispatch({ selection: { anchor: insertPos + inserted.length } });
                        v.focus();
                    });
                    setResizeModalOpen(true);
                }
            } catch (err) { console.error('Upload error:', err); }
        };
        inp.click();
    }, [figureName, folderPath]);
    const handleInsertLink = useCallback(() => {
        const v = editorViewRefInternal.current; if (!v) return;
        const { from, to } = v.state.selection.main; const s = v.state.sliceDoc(from, to) || 'link text';
        v.dispatch({ changes: { from, to, insert: `[${s}](url)` }, selection: { anchor: from + s.length + 3, head: from + s.length + 6 } });
        v.focus();
    }, []);

    const handleInsertPaintList = useCallback(async () => {
        if (!figureId) return;
        try {
            const res = await fetch(`http://127.0.0.1:8765/api/figures/${figureId}/paints`);
            const paints = await res.json();
            if (!paints.length) return;

            let table = `\n| ${$t.colorName} | ${$t.brand} | ${$t.series || 'Series'} |\n|-------|-------|--------|\n`;
            paints.forEach((p: any) => {
                table += `| ${p.color_name} | ${p.brand} | ${p.series || '—'} |\n`;
            });

            const v = editorViewRefInternal.current;
            if (v) {
                v.dispatch({ changes: { from: v.state.selection.main.from, insert: table + '\n' } });
                v.focus();
            }
        } catch (err) { console.error('Failed to insert paint list:', err); }
    }, [figureId, $t]);

    useEffect(() => {
        const el = editorRef.current; if (!el) return;
        const h = async (e: ClipboardEvent) => {
            const v = editorViewRefInternal.current; if (!v?.hasFocus) return;
            for (const item of Array.from(e.clipboardData?.items || [])) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault(); const f = item.getAsFile(); if (!f) continue;
                    try {
                        const c = await compressImage(f, 1920, 1920, 0.85);
                        const r = await (window as any).electronAPI?.saveImage(folderPath || '', figureName || 'unknown', f.name, c.split(',')[1]);
                        if (r?.success) {
                            setResizeImagePath(r.path);
                            setResizeInsertCallback(() => (width: number | null, height: number | null) => {
                                const v = editorViewRefInternal.current; if (!v) return;
                                const sizeStr = width ? (height ? ` =${width}x${height}` : ` =${width}`) : '';
                                const insertPos = v.state.selection.main.from;
                                const inserted = `![${f.name}](.${r.path}${sizeStr})\n`;
                                v.dispatch({ changes: { from: insertPos, insert: inserted } });
                                v.dispatch({ selection: { anchor: insertPos + inserted.length } });
                                v.focus();
                            });
                            setResizeModalOpen(true);
                        }
                    } catch (err) { console.error(err); }
                    return;
                }
            }
        };
        el.addEventListener('paste', h);
        return () => el.removeEventListener('paste', h);
    }, [figureName, folderPath]);

    let resolvedContent = content || '';

    const sizeMap: Record<string, { w?: string; h?: string }> = {};
    resolvedContent = resolvedContent.replace(
        /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+?)\s*=\s*(\d+)?x?(\d+)?\)/g,
        (match, alt, path, w, h) => {
            sizeMap[path] = { w, h };
            return `![${alt}](${path})`;
        }
    );

    resolvedContent = resolvedContent.replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);
    resolvedContent = resolvedContent.replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);

    resolvedContent = resolvedContent.replace(
        /!\[([^\]]*)\]\((http:\/\/127\.0\.0\.1:8765\/figures-data\/[^)]+?)\)/g,
        (match, alt, url) => {
            const origPath = Object.keys(sizeMap).find(p => url.endsWith(p.replace(/^\.\.?\/images\//, '')));
            const size = origPath ? sizeMap[origPath] : null;
            let attrs = `src="${url}" alt="${alt}"`;
            if (size?.w) attrs += ` width="${size.w}"`;
            if (size?.h) attrs += ` height="${size.h}"`;
            if (!size?.w && !size?.h) attrs += ' style="max-width:100%;max-height:500px;display:block;margin:12px auto;border-radius:6px;"';
            return `<img ${attrs} />`;
        }
    );

    return (
        <div className={styles.root}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Bold (Cmd+B)" onClick={() => toggleWrap('**')}><strong>B</strong></button>
                    <button className={styles.tbBtn} title="Italic (Cmd+I)" onClick={() => toggleWrap('*')}><em>I</em></button>
                    <button className={styles.tbBtn} title="Strikethrough (Shift+Cmd+X)" onClick={() => toggleWrap('~~')}><s>S</s></button>
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
                    <button className={styles.tbBtn} title="Code (Cmd+K)" onClick={() => toggleWrap('`')}>&lt;/&gt;</button>
                </div>
                <div className={styles.toolbarGroup}>
                    <button className={styles.tbBtn} title="Link (Cmd+U)" onClick={handleInsertLink}>🔗</button>
                    <button className={styles.tbBtn} title="Image (Cmd+Shift+I)" onClick={handleInsertImage}>🖼</button>
                    <button className={styles.tbBtn} title="Insert paint list" onClick={handleInsertPaintList}>📋</button>
                    <button className={styles.tbBtn} title="Table" onClick={() => {
                        const v = editorViewRefInternal.current;
                        if (v) {
                            v.focus();
                            setTableEditorMarkdown('|  |  |  |\n|---|---|---|\n|  |  |  |\n|  |  |  |');
                            setTableEditorFrom(v.state.selection.main.from);
                            setTableEditorTo(v.state.selection.main.from);
                            setTableEditorOpen(true);
                        }
                    }}>⊞</button>
                </div>
                <div className={`${styles.toolbarGroup} ${styles.toolbarRight}`}>
                    <button className={styles.tbBtn} onClick={() => setPreview(!preview)} title={preview ? $t.edit : $t.preview}>{preview ? '✏️' : '👁'}</button>
                </div>
            </div>
            <div className={styles.preview} style={{ display: preview ? 'block' : 'none' }} dangerouslySetInnerHTML={{ __html: marked(resolvedContent, { breaks: true }) as string }} />
            <div className={styles.editorWrapper} ref={editorRef} style={{ display: preview ? 'none' : 'block', height: '100%' }} />
            {resizeModalOpen && (
                <ImageResizeModal
                    imagePath={resizeImagePath}
                    safeSlug={safeSlug}
                    onInsert={(w, h) => {
                        resizeInsertCallback(w, h);
                        setResizeModalOpen(false);
                    }}
                    onCancel={() => setResizeModalOpen(false)}
                />
            )}
            {tableEditorOpen && (
                <TableEditorModal
                    initialMarkdown={tableEditorMarkdown}
                    onApply={(newMd) => {
                        const v = editorViewRefInternal.current;
                        if (v) {
                            v.dispatch({ changes: { from: tableEditorFrom, to: tableEditorTo, insert: newMd } });
                            v.focus();
                        }
                        setTableEditorOpen(false);
                    }}
                    onCancel={() => setTableEditorOpen(false)}
                />
            )}
        </div>
    );
}