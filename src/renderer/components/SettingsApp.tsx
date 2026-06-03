import { useState, useEffect } from 'react';
import styles from './SettingsApp.module.css';
import { t, setLanguage, getLanguage } from '../i18n';

type SettingsTab = 'general' | 'appearance' | 'data';

export default function SettingsApp() {
    const [tab, setTab] = useState<SettingsTab>('general');
    const [theme, setTheme] = useState('midnight');
    const [language, setLanguageState] = useState(getLanguage());
    const [autoBackup, setAutoBackup] = useState(false);
    const [backupInterval, setBackupInterval] = useState(7);
    const [version, setVersion] = useState('');

    const $t = t();

    useEffect(() => {
        if ((window as any).electronAPI?.getAppVersion) {
            (window as any).electronAPI.getAppVersion().then((v: string) => setVersion(v));
        } else {
            setVersion('0.1.5');
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
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed');
        }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.prbackup,.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                await fetch('http://127.0.0.1:8765/api/backup/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                alert('Import successful!');
            } catch (err) {
                console.error('Import failed:', err);
                alert('Import failed');
            }
        };
        input.click();
    };

    const handleReset = async () => {
        if (!confirm('Delete ALL data? This cannot be undone!')) return;
        if (!confirm('Are you really sure? Type YES to confirm:')) return;
        alert('Reset not implemented yet');
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
                                    <select
                                        className={styles.select}
                                        value={language}
                                        onChange={e => {
                                            const lang = e.target.value as 'en' | 'ru';
                                            setLanguageState(lang);
                                            setLanguage(lang);
                                        }}
                                    >
                                        <option value="en">English</option>
                                        <option value="ru">Русский</option>
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
                        </div>
                    )}

                    {tab === 'data' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>{$t.data}</div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.exportBackup}</div>
                                    <div className={styles.settingDesc}>{$t.exportBackupDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExport}>📤 {$t.export}</button>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.importBackup}</div>
                                    <div className={styles.settingDesc}>{$t.importBackupDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleImport}>📥 {$t.import}</button>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.autoBackup}</div>
                                    <div className={styles.settingDesc}>{$t.autoBackupDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <label className={styles.toggle}>
                                        <input type="checkbox" checked={autoBackup} onChange={e => setAutoBackup(e.target.checked)} />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            </div>
                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel}>{$t.backupInterval}</div>
                                    <div className={styles.settingDesc}>{$t.backupIntervalDesc}</div>
                                </div>
                                <div className={styles.settingControl}>
                                    <input className={styles.numberInput} type="number" value={backupInterval} min={1} max={30} onChange={e => setBackupInterval(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className={styles.setting} style={{ marginTop: 24, borderTop: '1px solid #dc2626', paddingTop: 16 }}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingLabel} style={{ color: '#dc2626' }}>{$t.resetData}</div>
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
        </div>
    );
}