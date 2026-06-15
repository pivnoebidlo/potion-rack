// @ts-ignore
import CollapseIcon from '../assets/icons/collapse.svg?react';
// @ts-ignore
import ExpandIcon from '../assets/icons/expand.svg?react';
import { useState } from 'react';
import styles from './PaintsApp.module.css';
import placeholderImg from '../images/placeholder.png';
import { t } from '../i18n';
import { Paint } from '../types/paint';

interface PaintDetailPanelProps {
    paint: Paint;
    images: any[];
    selectedImageId: number | null;
    rightPanelCollapsed: boolean;
    rightPanelWidth: number;
    isResizing: boolean;
    commentRef: React.RefObject<HTMLTextAreaElement>;
    onCollapse: () => void;
    onImageSelect: (id: number) => void;
    onResizeStart: () => void;
    onUpload: (file: File) => void;
    onSetPrimary: (id: number) => void;
    onDeleteImage: (id: number) => void;
    onCommentChange: (id: number, comment: string) => void;
}

export default function PaintDetailPanel({
                                             paint,
                                             images,
                                             selectedImageId,
                                             rightPanelCollapsed,
                                             rightPanelWidth,
                                             isResizing,
                                             commentRef,
                                             onCollapse,
                                             onImageSelect,
                                             onResizeStart,
                                             onUpload,
                                             onSetPrimary,
                                             onDeleteImage,
                                             onCommentChange,
                                         }: PaintDetailPanelProps) {
    const $t = t();
    const [hoverMain, setHoverMain] = useState(false);

    const triggerUpload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.onchange = (ev) => {
            const f = (ev.target as HTMLInputElement).files?.[0];
            if (f) onUpload(f);
        };
        inp.click();
    };

    return (
        <>
            <div
                style={{
                    width: '4px',
                    cursor: 'col-resize',
                    background: isResizing ? 'var(--accent)' : 'var(--border)',
                    transition: isResizing ? 'none' : 'background 0.2s',
                    flexShrink: 0,
                }}
                onMouseDown={onResizeStart}
            />
            <div
                className={`${styles.rightPanel} ${rightPanelCollapsed ? styles.rightPanelCollapsed : ''}`}
                style={{
                    width: rightPanelCollapsed ? 32 : rightPanelWidth,
                    minWidth: rightPanelCollapsed ? 32 : rightPanelWidth,
                }}
            >
                <button className={styles.collapseBtn} onClick={onCollapse}>
                    {rightPanelCollapsed ? <ExpandIcon style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} /> : <CollapseIcon style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />}
                </button>
                {!rightPanelCollapsed && (
                    <div className={styles.panelContent}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', textAlign: 'center' }}>
                            {paint.brand} – {paint.color_name}
                        </div>
                        {paint.series && (
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>
                                [{paint.series}]
                            </div>
                        )}
                        {selectedImageId && images.length > 0 ? (
                            <>
                                <div
                                    className={styles.galleryMain}
                                    onMouseEnter={() => setHoverMain(true)}
                                    onMouseLeave={() => setHoverMain(false)}
                                >
                                    <img
                                        src={`data:${images.find(i => i.id === selectedImageId)?.content_type || 'image/jpeg'};base64,${images.find(i => i.id === selectedImageId)?.image_data}`}
                                        alt="Selected paint"
                                    />
                                    {hoverMain && (
                                        <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
                                            <button onClick={triggerUpload} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button>
                                            <button onClick={(e) => { e.stopPropagation(); onSetPrimary(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--star-active)' }}>★</button>
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteImage(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>🗑</button>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.galleryThumbnails}>
                                    {images.map((img: any) => (
                                        <div
                                            key={img.id}
                                            className={`${styles.thumbnail} ${selectedImageId === img.id ? styles.thumbnailActive : ''}`}
                                            onClick={() => onImageSelect(img.id)}
                                        >
                                            <img src={`data:${img.content_type || 'image/jpeg'};base64,${img.image_data}`} alt={img.filename} />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div
                                className={styles.galleryMain}
                                onMouseEnter={() => setHoverMain(true)}
                                onMouseLeave={() => setHoverMain(false)}
                            >
                                <img src={placeholderImg} alt="No photo" style={{ opacity: 0.3 }} />
                                {hoverMain && (
                                    <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
                                        <button onClick={triggerUpload} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 12px' }} />
                        <div className={styles.detailsLabel}>{$t.comment}</div>
                        <textarea
                            ref={commentRef}
                            value={paint.comment || ''}
                            onChange={(e) => {
                                onCommentChange(paint.id, e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{
                                width: '100%', minHeight: '40px', padding: '8px',
                                background: 'var(--bg-input)', border: '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                                fontSize: 'var(--font-size-sm)', resize: 'none', outline: 'none',
                                boxSizing: 'border-box', overflow: 'hidden',
                            }}
                            placeholder={$t.commentPlaceholder}
                        />
                    </div>
                )}
            </div>
        </>
    );
}