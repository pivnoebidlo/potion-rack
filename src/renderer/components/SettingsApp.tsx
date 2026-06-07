import { useState, useEffect } from 'react';
import styles from './SettingsApp.module.css';
import { t, setLanguage, getLanguage } from '../i18n';

type SettingsTab = 'general' | 'appearance' | 'data';

export default function SettingsApp() {
    const [tab, setTab] = useState<SettingsTab>('general');
    const [theme, setTheme] = useState('midnight');
    const [language, setLanguageState] = useState(getLanguage());
    const [version, setVersion] = useState('');
    const [importConfirmOpen, setImportConfirmOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [figuresPath, setFiguresPath] = useState('');
    const [dbPath, setDbPath] = useState('');
    const [showStatusIndicators, setShowStatusIndicators] = useState(true);
    const [showCounters, setShowCounters] = useState(true);
    const [showPaintColorDots, setShowPaintColorDots] = useState(true);
    const [dateFormat, setDateFormat] = useState('auto');

    const $t = t();

    useEffect(() => {
        if ((window as any).electronAPI?.getAppVersion) {
            (window as any).electronAPI.getAppVersion().then((v: string) => setVersion(v));
        } else {
            setVersion('0.3.0');
        }
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-theme');
        if (saved) setTheme(saved);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('potion-rack-theme', theme);
    }, [theme]);

    useEffect(() => {
        const savedPath = localStorage.getItem('potion-rack-figures-path');
        if (savedPath) {
            setFiguresPath(savedPath);
        } else if ((window as any).electronAPI?.getDefaultFiguresPath) {
            (window as any).electronAPI.getDefaultFiguresPath().then((p: string) => setFiguresPath(p));
        }
    }, []);

    useEffect(() => {
        const savedPath = localStorage.getItem('potion-rack-db-path');
        if (savedPath) {
            setDbPath(savedPath);
        } else if ((window as any).electronAPI?.getDbPath) {
            (window as any).electronAPI.getDbPath().then((p: string) => setDbPath(p));
        }
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-show-indicators');
        if (saved !== null) setShowStatusIndicators(saved === 'true');
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-show-counters');
        if (saved !== null) setShowCounters(saved === 'true');
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-show-paint-color-dots');
        if (saved !== null) setShowPaintColorDots(saved === 'true');
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-date-format');
        if (saved) setDateFormat(saved);
    }, []);

    useEffect(() => {
        const tabs: SettingsTab[] = ['general', 'appearance', 'data'];
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const idx = tabs.indexOf(tab);
                if (e.key === 'ArrowUp' && idx > 0) setTab(tabs[idx - 1]);
                else if (e.key === 'ArrowDown' && idx < tabs.length - 1) setTab(tabs[idx + 1]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tab]);

    const navigateTo = (page: string) => {
        if (page === 'paints') window.location.href = 'paints.html';
        else if (page === 'figures') window.location.href = 'figures.html';
        else window.location.href = 'settings.html';
    };

    const handleSelectFolder = async () => {
        const api = (window as any).electronAPI;
        if (!api?.selectFiguresDirectory) return;
        const selectedPath = await api.selectFiguresDirectory();
        if (selectedPath) {
            setFiguresPath(selectedPath);
            localStorage.setItem('potion-rack-figures-path', selectedPath);
            if (api.setFiguresPath) await api.setFiguresPath(selectedPath);
        }
    };

    const handleSelectDbPath = async () => {
        const api = (window as any).electronAPI;
        if (!api?.selectDbPath) return;
        const selectedPath = await api.selectDbPath();
        if (selectedPath) {
            setDbPath(selectedPath);
            localStorage.setItem('potion-rack-db-path', selectedPath);
            if (api.setDbPath) await api.setDbPath(selectedPath);
        }
    };

    const handleExport = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8765/api/backup/export');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `potion-rack-backup-${new Date().toISOString().split('T')[0]}.prbackup`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error('Export failed:', err); }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.prbackup,.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) { setImportFile(file); setImportConfirmOpen(true); }
        };
        input.click();
    };

    const performImport = async () => {
        if (!importFile) return;
        try {
            const text = await importFile.text();
            const data = JSON.parse(text);
            await fetch('http://127.0.0.1:8765/api/backup/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            setImportConfirmOpen(false);
            setImportFile(null);
        } catch (err) { console.error('Import failed:', err); }
    };

    const handleReset = async () => {
        if (!confirm('Delete ALL data? This cannot be undone!')) return;
        if (!confirm('Are you really sure?')) return;
    };

    return (
        <div className={styles.root}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarItem} onClick={() => navigateTo('paints')}>🎨</div>
                <div className={styles.sidebarItem} onClick={() => navigateTo('figures')}>🧩</div>
                <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>⚙️</div>
            </div>

            <div className={styles.main}>
                <div className={styles.nav}>
                    <div className={`${styles.navItem} ${tab === 'general' ? styles.navItemActive : ''}`} onClick={() => setTab('general')}>{$t.general}</div>
                    <div className={`${styles.navItem} ${tab === 'appearance' ? styles.navItemActive : ''}`} onClick={() => setTab('appearance')}>{$t.appearance}</div>
                    <div className={`${styles.navItem} ${tab === 'data' ? styles.navItemActive : ''}`} onClick={() => setTab('data')}>{$t.data}</div>
                </div>

                <div className={styles.content}>
                    {tab === 'general' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>{$t.general}</div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.language}</div>
                                    <div className={styles.settingDesc}>{$t.languageDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <select className={styles.select} value={language} onChange={e => { const lang = e.target.value as 'en' | 'ru'; setLanguageState(lang); setLanguage(lang); }}>
                                        <option value="en">English</option>
                                        <option value="ru">Русский</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.dateFormat || 'Формат даты'}</div>
                                    <div className={styles.settingDesc}>{$t.dateFormatDesc || 'Формат отображения дат'}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <select className={styles.select} value={dateFormat} onChange={e => { setDateFormat(e.target.value); localStorage.setItem('potion-rack-date-format', e.target.value); }}>
                                        <option value="auto">{$t.dateAuto || 'Авто'}</option>
                                        <option value="dd.mm.yyyy">dd.mm.yyyy</option>
                                        <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                                        <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.about} style={{ marginTop: 24 }}>
                                <strong>{$t.version}</strong> v{version}
                                <div className={styles.aboutSub}>{$t.appSubtitle}</div>
                                <a href="https://github.com/pivnoebidlo/potion-rack" target="_blank">GitHub Repository</a>
                            </div>
                        </div>
                    )}

                    {tab === 'appearance' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>{$t.appearance}</div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.theme}</div>
                                    <div className={styles.settingDesc}>{$t.themeDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <select className={styles.select} value={theme} onChange={e => setTheme(e.target.value)}>
                                        <option value="midnight">Midnight</option>
                                        <option value="dark">Dark</option>
                                        <option value="light">Light</option>
                                        <option value="retro">Retro</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.showStatusIndicators || 'Статус-индикаторы'}</div>
                                    <div className={styles.settingDesc}>{$t.showStatusIndicatorsDesc || 'Показывать кружки статуса у фигурок в дереве'}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <label className={styles.toggle}>
                                        <input type="checkbox" checked={showStatusIndicators} onChange={e => { setShowStatusIndicators(e.target.checked); localStorage.setItem('potion-rack-show-indicators', e.target.checked.toString()); }} />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.showCounters || 'Счётчики в папках'}</div>
                                    <div className={styles.settingDesc}>{$t.showCountersDesc || 'Показывать количество фигурок рядом с именем папки'}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <label className={styles.toggle}>
                                        <input type="checkbox" checked={showCounters} onChange={e => { setShowCounters(e.target.checked); localStorage.setItem('potion-rack-show-counters', e.target.checked.toString()); }} />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.showPaintColorDots || 'Цветные индикаторы красок'}</div>
                                    <div className={styles.settingDesc}>{$t.showPaintColorDotsDesc || 'Показывать цветные кружки рядом с названиями красок в таблице'}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <label className={styles.toggle}>
                                        <input type="checkbox" checked={showPaintColorDots} onChange={e => { setShowPaintColorDots(e.target.checked); localStorage.setItem('potion-rack-show-paint-color-dots', e.target.checked.toString()); }} />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'data' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>{$t.data}</div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.figuresPath}</div>
                                    <div className={styles.settingDesc}>{$t.figuresPathDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnFixed}`} onClick={handleSelectFolder}>📂 {$t.selectFolder}</button>
                                    {figuresPath && <div className={styles.pathText}>{figuresPath}</div>}
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.dbPath || 'База данных'}</div>
                                    <div className={styles.settingDesc}>{$t.dbPathDesc || 'Расположение файла базы данных SQLite'}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnFixed}`} onClick={handleSelectDbPath}>📂 {$t.selectFolder}</button>
                                    {dbPath && <div className={styles.pathText}>{dbPath}</div>}
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.exportBackup}</div>
                                    <div className={styles.settingDesc}>{$t.exportBackupDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnFixed}`} onClick={handleExport}>📤 {$t.export}</button>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.importBackup}</div>
                                    <div className={styles.settingDesc}>{$t.importBackupDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnFixed}`} onClick={handleImport}>📥 {$t.import}</button>
                                </div>
                            </div>
                            <div className={styles.setting} style={{ marginTop: 24, borderTop: '1px solid var(--danger)', paddingTop: 16 }}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel} style={{ color: 'var(--danger)' }}>{$t.resetData}</div>
                                    <div className={styles.settingDesc}>{$t.resetDataDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleReset}>{$t.reset}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {importConfirmOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '24px', minWidth: '400px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{$t.importBackup}</div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: 'var(--font-size-sm)' }}>{$t.importBackupDesc}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => { setImportConfirmOpen(false); setImportFile(null); }} style={{ padding: '8px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>{$t.cancel}</button>
                            <button onClick={performImport} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>{$t.import}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}