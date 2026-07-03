import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap, foldService } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { wysiwymPlugin, slugField, resizeCallbackField, setSlug, setResizeCallback, setTableLabel, tableLabelField } from '../editor-plugins/wysiwymPlugin';
import { tableNavPlugin } from '../editor-plugins/tableNavPlugin';

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
                tableLabelField,
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

export function useEditorPool(
    content: string,
    slug: string,
    onChange: (v: string) => void,
    handleResizeExisting: (from: number, to: number, w?: number, h?: number) => void,
    showLineNumbers: boolean,
    tableLabel: string,
    editorViewRef?: React.MutableRefObject<EditorView | null>
) {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRefInternal = useRef<EditorView | null>(null);

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
        pooled.view.dispatch({ effects: setTableLabel.of(tableLabel) });
        pooled.view.dispatch({ effects: setResizeCallback.of(handleResizeExisting) });
    }, [slug]);

    return { editorRef, editorViewRefInternal };
}