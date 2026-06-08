import { useState, useEffect } from 'react';
import { t } from '../i18n';

interface ImageResizeModalProps {
    imagePath: string;
    safeSlug: string;
    onInsert: (width: number | null, height: number | null) => void;
    onCancel: () => void;
}

export default function ImageResizeModal({ imagePath, safeSlug, onInsert, onCancel }: ImageResizeModalProps) {
    const $t = t();
    const [width, setWidth] = useState<number | null>(400);
    const [height, setHeight] = useState<number | null>(null);
    const [lockRatio, setLockRatio] = useState(false);
    const [originalWidth, setOriginalWidth] = useState<number | null>(null);
    const [originalHeight, setOriginalHeight] = useState<number | null>(null);

    // Конструируем URL для превью
    const previewSrc = imagePath.startsWith('http')
        ? imagePath
        : `http://127.0.0.1:8765/figures-data/${safeSlug}/${imagePath.replace(/^\.\.?\/images\//, 'images/')}`;

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setOriginalWidth(img.naturalWidth);
            setOriginalHeight(img.naturalHeight);
        };
        img.src = previewSrc;
    }, [previewSrc]);

    const presets = [
        { label: $t.sizeSmall || 'Small', w: 200, h: null },
        { label: $t.sizeMedium || 'Medium', w: 400, h: null },
        { label: $t.sizeLarge || 'Large', w: 600, h: null },
        { label: $t.sizeOriginal || 'Original', w: originalWidth, h: originalHeight },
    ];

    const applyPreset = (w: number | null, h: number | null) => {
        if (w && h) {
            setWidth(w);
            setHeight(h);
        } else if (w && originalWidth && originalHeight) {
            setWidth(w);
            setHeight(Math.round(w * (originalHeight / originalWidth)));
        } else if (h && originalWidth && originalHeight) {
            setWidth(Math.round(h * (originalWidth / originalHeight)));
            setHeight(h);
        } else {
            setWidth(w);
            setHeight(h);
        }
    };

    const handleInsert = () => {
        onInsert(width, height);
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 200,
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '24px', width: '480px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
                    🖼 {$t.resizeImage || 'Image size'}
                </div>

                {/* Превью */}
                <div style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center',
                    marginBottom: '20px', minHeight: '80px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                    <div style={{
                        width: width ? `${Math.min(width, 400)}px` : 'auto',
                        height: height ? `${Math.min(height, 200)}px` : '200px',
                        border: '1px dashed var(--border-light)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        <img
                            src={previewSrc}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: '2px',
                            }}
                        />
                        {/* Размерная рамка-подсказка */}
                        <div style={{
                            position: 'absolute', bottom: '4px', right: '6px',
                            fontSize: '10px', color: 'var(--text-muted)',
                            background: 'var(--bg-primary)', padding: '2px 6px',
                            borderRadius: '3px',
                        }}>
                            {width || '—'}×{height || '—'}
                        </div>
                    </div>
                </div>

                {/* Пресеты */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        {$t.quickSize || 'Quick size'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {presets.map(p => (
                            <button
                                key={p.label}
                                onClick={() => applyPreset(p.w, p.h)}
                                style={{
                                    padding: '4px 10px', fontSize: '11px',
                                    background: width === p.w && height === p.h ? 'var(--accent-light)' : 'var(--bg-input)',
                                    border: `1px solid ${width === p.w && height === p.h ? 'var(--accent)' : 'var(--border-light)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    color: width === p.w && height === p.h ? 'var(--accent)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Слайдер ширины */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>{$t.width || 'Width'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{width ? `${width} px` : '—'}</span>
                    </div>
                    <input
                        type="range"
                        min="50"
                        max="800"
                        step="10"
                        value={width || 400}
                        onChange={e => {
                            const w = parseInt(e.target.value);
                            setWidth(w);
                            if (lockRatio && height) {
                                setHeight(Math.round(w * (height / (width || 400))));
                            }
                        }}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Слайдер высоты */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>{$t.height || 'Height'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{height ? `${height} px` : '—'}</span>
                    </div>
                    <input
                        type="range"
                        min="50"
                        max="600"
                        step="10"
                        value={height || 200}
                        onChange={e => {
                            const h = parseInt(e.target.value);
                            setHeight(h);
                            if (lockRatio && width) {
                                setWidth(Math.round(h * (width || 400) / (height || 200)));
                            }
                        }}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Лок пропорций + инфо */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <button
                        onClick={() => setLockRatio(!lockRatio)}
                        style={{
                            background: lockRatio ? 'var(--accent-light)' : 'var(--bg-input)',
                            border: `1px solid ${lockRatio ? 'var(--accent)' : 'var(--border-light)'}`,
                            borderRadius: 'var(--radius-sm)',
                            color: lockRatio ? 'var(--accent)' : 'var(--text-secondary)',
                            cursor: 'pointer', padding: '4px 8px', fontSize: '14px',
                        }}
                        title={lockRatio ? ($t.lockRatioOn || 'Lock aspect ratio: ON') : ($t.lockRatioOff || 'Lock aspect ratio: OFF')}
                    >
                        🔗
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {$t.lockAspectRatio || 'Lock aspect ratio'}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button
                        onClick={() => { setWidth(null); setHeight(null); }}
                        style={{
                            background: 'transparent', border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: '4px 10px', fontSize: '11px',
                        }}
                    >
                        {$t.reset || 'Reset'}
                    </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    {$t.sizeSavedAs || 'Size saved as'}: <code style={{ color: 'var(--accent)' }}>
                    ![alt](path {width && height ? `=${width}x${height}` : width ? `=${width}` : ''})
                </code>
                </div>

                {/* Футер */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px', background: 'var(--bg-input)',
                            color: 'var(--text-secondary)', border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px',
                        }}
                    >
                        {$t.cancel}
                    </button>
                    <button
                        onClick={handleInsert}
                        style={{
                            padding: '8px 16px', background: 'var(--accent)', color: '#fff',
                            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px',
                        }}
                    >
                        {$t.insert || 'Insert'}
                    </button>
                </div>
            </div>
        </div>
    );
}