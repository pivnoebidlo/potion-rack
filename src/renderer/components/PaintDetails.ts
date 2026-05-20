import { t } from '../i18n/index.js';
import { escapeHtml, getStars, getStatusText } from '../utils/dom.js';
import { ImageGallery } from './ImageGallery.js';
import { fetchPaintDetails, updatePaintAPI } from '../services/api.js';
import { DateFormatter } from '../utils/dateFormatter.js';

// Simple Markdown renderer without external library
function renderMarkdown(text: string): string {
    if (!text || text === '-') return '-';

    let html = escapeHtml(text);

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Lists
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/<\/li>\n<li>/g, '</li><li>');
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

export class PaintDetails {
    private container: HTMLElement;
    private currentGallery: ImageGallery | null = null;
    private onGalleryUpdate: () => void;
    private currentPaintId: number | null = null;
    private isEditMode: boolean = false;
    private getBaseColorNameFn: (id?: number) => Promise<string> = async () => '—';

    constructor(container: HTMLElement, onGalleryUpdate: () => void) {
        this.container = container;
        this.onGalleryUpdate = onGalleryUpdate;
        this.setupGlobalKeyListeners();
    }

    private setupGlobalKeyListeners(): void {
        document.addEventListener('keydown', (e) => {
            // Ctrl+E or Cmd+E to edit comment
            if ((e.ctrlKey || e.metaKey) && e.key === 'e' && this.currentPaintId && !this.isEditMode) {
                e.preventDefault();
                this.enterEditMode();
            }
            // Escape to cancel edit
            if (e.key === 'Escape' && this.isEditMode) {
                e.preventDefault();
                this.exitEditMode();
            }
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isEditMode) {
                e.preventDefault();
                this.saveComment();
            }
        });
    }

    private enterEditMode(): void {
        const commentElement = this.container.querySelector('.comment-value');
        if (!commentElement) return;

        const currentComment = commentElement.getAttribute('data-comment') || '';
        this.isEditMode = true;

        const textarea = document.createElement('textarea');
        textarea.value = currentComment;
        textarea.className = 'comment-edit-textarea';
        const t_ = t();
        textarea.placeholder = (t_ as any).detailsCommentPlaceholder || 'Add your notes here... Supports **Markdown**!';
        textarea.style.cssText = 'width: 100%; min-height: 150px; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';
        buttonContainer.innerHTML = `
            <button class="save-comment-btn" style="background: #e94560; padding: 4px 12px; font-size: 11px;">💾 Save (Ctrl+S)</button>
            <button class="cancel-comment-btn" style="background: #0f3460; padding: 4px 12px; font-size: 11px;">✖ Cancel (Esc)</button>
        `;

        const parent = commentElement.parentElement;
        if (parent) {
            parent.removeChild(commentElement);
            parent.appendChild(textarea);
            parent.appendChild(buttonContainer);
            textarea.focus();

            const saveBtn = buttonContainer.querySelector('.save-comment-btn');
            const cancelBtn = buttonContainer.querySelector('.cancel-comment-btn');

            saveBtn?.addEventListener('click', () => this.saveComment());
            cancelBtn?.addEventListener('click', () => this.exitEditMode());
        }
    }

    private exitEditMode(): void {
        this.isEditMode = false;
        if (this.currentPaintId) {
            this.loadPaint(this.currentPaintId, this.getBaseColorNameFn);
        }
    }

    private async saveComment(): Promise<void> {
        const textarea = this.container.querySelector('.comment-edit-textarea') as HTMLTextAreaElement;
        if (!textarea || !this.currentPaintId) return;

        const newComment = textarea.value;

        try {
            await updatePaintAPI(this.currentPaintId, {
                comment: newComment
            } as any);
            this.exitEditMode();
            this.showStatusMessage('Comment saved ✓');
        } catch (error) {
            console.error('Failed to save comment:', error);
            this.showStatusMessage('Failed to save comment');
        }
    }

    private showStatusMessage(message: string): void {
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.style.display = 'block';
            setTimeout(() => {
                if (statusMessage.textContent === message) {
                    statusMessage.style.display = 'none';
                }
            }, 2000);
        }
    }

    async loadPaint(id: number, getBaseColorName: (id?: number) => Promise<string>): Promise<void> {
        this.currentPaintId = id;
        this.getBaseColorNameFn = getBaseColorName;

        try {
            const paint = await fetchPaintDetails(id);
            const t_ = t();
            const baseColorName = await getBaseColorName(paint.base_color_id);

            // Render Markdown for comment
            let renderedComment = '-';
            if (paint.comment && paint.comment.trim()) {
                renderedComment = renderMarkdown(paint.comment);
            }

            const seriesText = paint.series ? ` [${paint.series}]` : '';
            const titleText = `${escapeHtml(paint.brand)} – ${escapeHtml(paint.color_name)}${seriesText}`;

            const detailsHtml = `
                <div style="margin-bottom: 20px; text-align: center;">
                    <h3 style="color: #e94560; margin: 0; font-size: 16px;">${titleText}</h3>
                </div>
                <div id="gallery-container" style="margin-bottom: 20px;"></div>
                <div class="details-section">
                    <div class="details-label">${t_.detailsBrand}</div>
                    <div class="details-value">${escapeHtml(paint.brand)}</div>
                    <div class="details-label">${t_.detailsSeries}</div>
                    <div class="details-value">${escapeHtml(paint.series || '-')}</div>
                    <div class="details-label">${t_.detailsColor}</div>
                    <div class="details-value">${escapeHtml(paint.color_name)}</div>
                    <div class="details-label">${t_.detailsArticle}</div>
                    <div class="details-value">${escapeHtml(paint.article || '-')}</div>
                    <div class="details-label">${t_.detailsBaseColor}</div>
                    <div class="details-value">${escapeHtml(baseColorName)}</div>
                    <div class="details-label">${t_.detailsPurchaseDate}</div>
                    <div class="details-value">${DateFormatter.format(paint.purchase_date)}</div>
                    <div class="details-label">${t_.detailsRating}</div>
                    <div class="details-value stars">${getStars(paint.rating)}</div>
                    <div class="details-label">${t_.detailsStatus}</div>
                    <div class="details-value">${getStatusText(paint.status)}</div>
                    <div class="details-label">${t_.detailsPrice}</div>
                    <div class="details-value">${paint.price ? '$' + paint.price : '-'}</div>
                    <div class="details-label">
                        📝 ${t_.detailsComment}
                        <span style="font-size: 9px; color: #aaa; margin-left: 8px;">(Click to edit, Ctrl+E)</span>
                    </div>
                    <div class="details-value comment-value" data-comment="${escapeHtml(paint.comment || '')}" 
                         style="cursor: pointer; padding: 8px; background: #0f0f1a; border-radius: 6px; border-left: 3px solid #e94560;">
                        <div class="markdown-body" style="font-size: 12px; line-height: 1.5;">${renderedComment}</div>
                    </div>
                </div>
            `;

            this.container.innerHTML = detailsHtml;

            // Add click handler for comment
            const commentDiv = this.container.querySelector('.comment-value');
            if (commentDiv) {
                commentDiv.addEventListener('click', () => this.enterEditMode());
            }

            // Destroy old gallery and create new one
            const galleryContainer = document.getElementById('gallery-container');
            if (galleryContainer) {
                if (this.currentGallery) {
                    this.currentGallery = null;
                }
                this.currentGallery = new ImageGallery(galleryContainer, id, this.onGalleryUpdate);
            }
        } catch (error) {
            console.error('Failed to load details:', error);
            this.container.innerHTML = '<div style="text-align: center; color: #aaa; padding: 40px;">Error loading details</div>';
        }
    }

    clear(): void {
        this.currentPaintId = null;
        this.isEditMode = false;
        this.container.innerHTML = '<div style="text-align: center; color: #aaa; padding: 40px;">Select a paint to see details</div>';
        if (this.currentGallery) {
            this.currentGallery = null;
        }
    }
}