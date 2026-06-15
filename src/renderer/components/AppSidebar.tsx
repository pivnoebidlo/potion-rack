// @ts-ignore
import PaintsIcon from '../assets/icons/paints.svg?react';
// @ts-ignore
import FiguresIcon from '../assets/icons/figures.svg?react';
// @ts-ignore
import PaletteIcon from '../assets/icons/palette.svg?react';
// @ts-ignore
import SettingsIcon from '../assets/icons/settings.svg?react';

interface AppSidebarProps {
    active: 'paints' | 'figures' | 'palette' | 'settings';
}

export default function AppSidebar({ active }: AppSidebarProps) {
    const items = [
        { id: 'paints', icon: <PaintsIcon style={{ width: 20, height: 20, color: active === 'paints' ? 'var(--accent)' : 'var(--text-secondary)' }} />, page: 'paints.html' },
        { id: 'figures', icon: <FiguresIcon style={{ width: 20, height: 20, color: active === 'figures' ? 'var(--accent)' : 'var(--text-secondary)' }} />, page: 'figures.html' },
        { id: 'palette', icon: <PaletteIcon style={{ width: 20, height: 20, color: active === 'palette' ? 'var(--accent)' : 'var(--text-secondary)' }} />, page: 'palette.html' },
        { id: 'settings', icon: <SettingsIcon style={{ width: 20, height: 20, color: active === 'settings' ? 'var(--accent)' : 'var(--text-secondary)' }} />, page: 'settings.html' },
    ];

    return (
        <div style={{
            width: 48, minWidth: 48,
            background: 'var(--bg-tertiary)',
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', paddingTop: 8, gap: 4,
        }}>
            {items.map(item => (
                <div
                    key={item.id}
                    onClick={() => { if (item.id !== active) window.location.href = item.page; }}
                    style={{
                        width: 36, height: 36,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        color: active === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                        background: active === item.id ? 'var(--accent-light)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (active !== item.id) (e.target as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (active !== item.id) (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                    {item.icon}
                </div>
            ))}
        </div>
    );
}