import { useState, useEffect } from 'react';
import { t } from '../i18n';
import styles from './ImageResizeModal.module.css';

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
        if (w && h) { setWidth(w); setHeight(h); }
        else if (w && originalWidth && originalHeight) { setWidth(w); setHeight(Math.round(w * (originalHeight / originalWidth))); }
        else if (h && originalWidth && originalHeight) { setWidth(Math.round(h * (originalWidth / originalHeight))); setHeight(h); }
        else { setWidth(w); setHeight(h); }
    };

    const handleInsert = () => onInsert(width, height);

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.title}>🖼 {$t.resizeImage || 'Image size'}</div>

                <div className={styles.previewArea}>
                    <div
                        className={styles.previewFrame}
                        style={{
                            width: width ? `${Math.min(width, 400)}px` : 'auto',
                            height: height ? `${Math.min(height, 200)}px` : '200px',
                        }}
                    >
                        <img src={previewSrc} alt="Preview" className={styles.previewImg} />
                        <div className={styles.sizeLabel}>{width || '—'}×{height || '—'}</div>
                    </div>
                </div>

                <div className={styles.sectionLabel}>{$t.quickSize || 'Quick size'}</div>
                <div className={styles.presets}>
                    {presets.map(p => (
                        <button
                            key={p.label}
                            onClick={() => applyPreset(p.w, p.h)}
                            className={`${styles.presetBtn} ${width === p.w && height === p.h ? styles.presetBtnActive : ''}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className={styles.sliderGroup}>
                    <div className={styles.sliderHeader}>
                        <span>{$t.width || 'Width'}</span>
                        <span className={styles.sliderValue}>{width ? `${width} px` : '—'}</span>
                    </div>
                    <input
                        type="range" min="50" max="800" step="10"
                        value={width || 400}
                        onChange={e => {
                            const w = parseInt(e.target.value);
                            setWidth(w);
                            if (lockRatio && height) setHeight(Math.round(w * (height / (width || 400))));
                        }}
                        className={styles.slider}
                    />
                </div>

                <div className={styles.sliderGroup}>
                    <div className={styles.sliderHeader}>
                        <span>{$t.height || 'Height'}</span>
                        <span className={styles.sliderValue}>{height ? `${height} px` : '—'}</span>
                    </div>
                    <input
                        type="range" min="50" max="600" step="10"
                        value={height || 200}
                        onChange={e => {
                            const h = parseInt(e.target.value);
                            setHeight(h);
                            if (lockRatio && width) setWidth(Math.round(h * (width || 400) / (height || 200)));
                        }}
                        className={styles.slider}
                    />
                </div>

                <div className={styles.lockRow}>
                    <button
                        onClick={() => setLockRatio(!lockRatio)}
                        className={`${styles.lockBtn} ${lockRatio ? styles.lockBtnActive : ''}`}
                        title={lockRatio ? ($t.lockRatioOn || 'Lock aspect ratio: ON') : ($t.lockRatioOff || 'Lock aspect ratio: OFF')}
                    >
                        🔗
                    </button>
                    <span className={styles.lockLabel}>{$t.lockAspectRatio || 'Lock aspect ratio'}</span>
                    <span className={styles.spacer} />
                    <button onClick={() => { setWidth(null); setHeight(null); }} className={styles.resetBtn}>
                        {$t.reset || 'Reset'}
                    </button>
                </div>

                <div className={styles.syntaxHint}>
                    {$t.sizeSavedAs || 'Size saved as'}: <code className={styles.syntaxCode}>
                    ![alt](path {width && height ? `=${width}x${height}` : width ? `=${width}` : ''})
                </code>
                </div>

                <div className={styles.footer}>
                    <button onClick={onCancel} className={styles.cancelBtn}>{$t.cancel}</button>
                    <button onClick={handleInsert} className={styles.insertBtn}>{$t.insert || 'Insert'}</button>
                </div>
            </div>
        </div>
    );
}