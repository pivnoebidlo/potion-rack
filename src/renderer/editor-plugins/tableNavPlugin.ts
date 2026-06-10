import { EditorView, ViewPlugin } from '@codemirror/view';

export const tableNavPlugin = ViewPlugin.fromClass(class {
    constructor(readonly view: EditorView) {
        this.view.dom.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                const pos = view.state.selection.main.head;
                const line = view.state.doc.lineAt(pos);
                if (/^\|(.+)\|$/.test(line.text)) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        const textBefore = line.text.substring(0, pos - line.from);
                        const prevPipe = textBefore.lastIndexOf('|');
                        if (prevPipe !== -1) view.dispatch({ selection: { anchor: line.from + Math.max(0, prevPipe - 1) } });
                    } else {
                        const textAfter = line.text.substring(pos - line.from);
                        const nextPipe = textAfter.indexOf('|');
                        if (nextPipe !== -1) view.dispatch({ selection: { anchor: Math.min(pos + nextPipe + 2, line.to) } });
                    }
                }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                const pos = view.state.selection.main.head;
                const line = view.state.doc.lineAt(pos);
                if (/^\|(.+)\|$/.test(line.text) && !/^\|[-:\s|]+\|$/.test(line.text)) {
                    e.preventDefault();
                    const cells = line.text.split('|').filter(c => c.trim() !== '');
                    view.dispatch({ changes: { from: line.to + 1, insert: '|' + '  |'.repeat(cells.length) + '\n' } });
                }
            }
        });
    }
});