import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { marked } from 'marked';
import styles from './MarkdownEditor.module.css';
import TableDialog from './TableDialog';
import { t } from '../i18n';
import { wysiwymPlugin, setSlug, slugField } from '../editor-plugins/wysiwymPlugin';
import { tableNavPlugin } from '../editor-plugins/tableNavPlugin';

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
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRefInternal = useRef<EditorView | null>(null);
    const lastSavedContent = useRef(content);
    const slug = folderPath ? `${folderPath}/${slugify(figureName || '')}` : slugify(figureName || '');
    const safeSlug = safeEncode(slug);

    useEffect(() => {
        if (!editorRef.current) return;
        if (!content && !slug) return;
        const existingView = editorViewRefInternal.current;
        if (existingView) {
            const hadFocus = existingView.hasFocus;
            existingView.dispatch({ effects: setSlug.of(slug) });
            if (existingView.state.doc.toString() !== content) {
                existingView.dispatch({ changes: { from: 0, to: existingView.state.doc.length, insert: content } });
            }
            if (hadFocus) existingView.focus();
            return;
        }
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
            if (update.docChanged) onChange(update.state.doc.toString());
        });
        const view = new EditorView({
            state: EditorState.create({
                doc: content,
                extensions: [
                    slugField.init(() => slug),
                    keymap.of([...defaultKeymap, ...historyKeymap]),
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
            parent: editorRef.current,
        });
        editorViewRefInternal.current = view;
        if (editorViewRef) editorViewRef.current = view;
        setPreview(false);
    }, [slug, content]);

    useEffect(() => {
        if (content === lastSavedContent.current) return;
        const timer = setTimeout(() => { lastSavedContent.current = content; onSave(); }, 500);
        return () => clearTimeout(timer);
    }, [content, onSave]);

    useEffect(() => {
        const h = (e: MouseEvent) => { const a = (e.target as HTMLElement).closest('a'); if (a?.getAttribute('href')) { e.preventDefault(); window.open(a.getAttribute('href')!, '_blank'); } };
        document.addEventListener('click', h, true);
        return () => document.removeEventListener('click', h, true);
    }, []);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey; if (!mod) return;
            if (e.key === 'e') { e.preventDefault(); e.stopPropagation(); setPreview(p => { if (p) setTimeout(() => editorViewRefInternal.current?.focus(), 50); return !p; }); return; }
            const v = editorViewRefInternal.current; if (!v?.hasFocus) return;
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
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onSave]);

    const insertText = useCallback((before: string, after = '') => {
        const v = editorViewRefInternal.current; if (!v) return;
        const { from, to } = v.state.selection.main; const s = v.state.sliceDoc(from, to);
        v.dispatch({ changes: { from, to, insert: before + s + after }, selection: { anchor: from + before.length, head: from + before.length + s.length } });
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
        const separator = '|' + ' --- |'.repeat(cols) + '\n';
        const row = '|' + ' Ячейка |'.repeat(cols) + '\n';
        let table = header + separator;
        for (let i = 0; i < rows; i++) table += row;
        v.dispatch({ changes: { from: v.state.selection.main.from, insert: table } });
        v.focus();
        setTableDialogOpen(false);
    }, []);
    const handleInsertImage = useCallback(async () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async (e) => {
            const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
            try {
                const c = await compressImage(f, 1920, 1920, 0.85);
                const r = await (window as any).electronAPI?.saveImage(folderPath || '', figureName || 'unknown', f.name, c.split(',')[1]);
                if (r?.success) { const v = editorViewRefInternal.current; if (!v) return; v.dispatch({ changes: { from: v.state.selection.main.from, insert: `![${f.name}](.${r.path})\n` } }); v.focus(); }
            } catch (err) { console.error(err); }
        };
        inp.click();
    }, [figureName, folderPath]);
    const handleInsertLink = useCallback(() => {
        const v = editorViewRefInternal.current; if (!v) return;
        const { from, to } = v.state.selection.main; const s = v.state.sliceDoc(from, to) || 'link text';
        v.dispatch({ changes: { from, to, insert: `[${s}](url)` }, selection: { anchor: from + s.length + 3, head: from + s.length + 6 } });
        v.focus();
    }, []);

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
                        if (r?.success) v.dispatch({ changes: { from: v.state.selection.main.from, insert: `![${f.name}](.${r.path})\n` } });
                    } catch (err) { console.error(err); }
                    return;
                }
            }
        };
        el.addEventListener('paste', h);
        return () => el.removeEventListener('paste', h);
    }, [figureName, folderPath]);

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
                    <button className={styles.tbBtn} title="Table" onClick={() => setTableDialogOpen(true)}>⊞</button>
                </div>
                <div className={`${styles.toolbarGroup} ${styles.toolbarRight}`}>
                    <button className={styles.tbBtn} onClick={() => setPreview(!preview)} title={preview ? $t.edit : $t.preview}>{preview ? '✏️' : '👁'}</button>
                </div>
            </div>
            <div className={styles.preview} style={{ display: preview ? 'block' : 'none' }} dangerouslySetInnerHTML={{ __html: marked(resolvedContent, { breaks: true }) as string }} />
            <div className={styles.editorWrapper} ref={editorRef} style={{ display: preview ? 'none' : 'block', height: '100%' }} />
            {tableDialogOpen && (
                <TableDialog onInsert={handleInsertTable} onClose={() => setTableDialogOpen(false)} />
            )}
        </div>
    );
}