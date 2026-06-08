import styles from './FiguresApp.module.css';
import { t } from '../i18n';

export default function HelpSection() {
    const $t = t();

    return (
        <>
            <div className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>{$t.helpNavigation}</div>
                <div className={styles.helpKey}><span>{$t.helpMove}</span><span><kbd>↑</kbd> <kbd>↓</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpExpand}</span><span><kbd>→</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpCollapse}</span><span><kbd>←</kbd></span></div>
            </div>
            <div className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>{$t.helpEditor}</div>
                <div className={styles.helpKey}><span>{$t.helpBold || 'Bold'}</span><span><kbd>⌘</kbd> <kbd>B</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpItalic || 'Italic'}</span><span><kbd>⌘</kbd> <kbd>I</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpStrikethrough || 'Strikethrough'}</span><span><kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>X</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpCode || 'Code'}</span><span><kbd>⌘</kbd> <kbd>K</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpHeading1 || 'Heading 1'}</span><span><kbd>⌘</kbd> <kbd>1</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpHeading2 || 'Heading 2'}</span><span><kbd>⌘</kbd> <kbd>2</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpHeading3 || 'Heading 3'}</span><span><kbd>⌘</kbd> <kbd>3</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpLink || 'Link'}</span><span><kbd>⌘</kbd> <kbd>U</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpImage || 'Image'}</span><span><kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>I</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpHorizontalLine || 'Horizontal line'}</span><span><kbd>⌘</kbd> <kbd>L</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpQuote || 'Quote'}</span><span><kbd>⌘</kbd> <kbd>Q</kbd></span></div>
            </div>
            <div className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>{$t.helpActions}</div>
                <div className={styles.helpKey}><span>{$t.helpSave || 'Save'}</span><span><kbd>⌘</kbd> <kbd>S</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpPreview || 'Edit / Preview'}</span><span><kbd>⌘</kbd> <kbd>E</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpUndo || 'Undo'}</span><span><kbd>⌘</kbd> <kbd>Z</kbd></span></div>
                <div className={styles.helpKey}><span>{$t.helpRedo || 'Redo'}</span><span><kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>Z</kbd></span></div>
            </div>
        </>
    );
}