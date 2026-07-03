import { marked } from 'marked';

export async function exportFigureToPdf(figure: { folder_path?: string; name: string; id: number }) {
    const content = await (window as any).electronAPI?.readArticle(figure.folder_path || '', figure.name);
    const slug = (figure.folder_path ? `${figure.folder_path}/` : '') + (figure.name || '');
    const safeSlug = encodeURIComponent(slug);
    let resolvedContent = content || '';

    const sizeMap: Record<string, { w?: string; h?: string }> = {};
    resolvedContent = resolvedContent.replace(
        /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+?)\s*=\s*(\d+)?x?(\d+)?\)/g,
        (match: string, alt: string, path: string, w: string, h: string) => {
            sizeMap[path] = { w, h };
            return `![${alt}](${path})`;
        }
    );

    resolvedContent = resolvedContent.replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);
    resolvedContent = resolvedContent.replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);

    resolvedContent = resolvedContent.replace(
        /!\[([^\]]*)\]\((http:\/\/127\.0\.0\.1:8765\/figures-data\/[^)]+?)\)/g,
        (match: string, alt: string, url: string) => {
            const origPath = Object.keys(sizeMap).find(p => url.endsWith(p.replace(/^\.\.?\/images\//, '')));
            const size = origPath ? sizeMap[origPath] : null;
            let attrs = `src="${url}" alt="${alt}"`;
            if (size?.w) attrs += ` width="${size.w}"`;
            if (size?.h) attrs += ` height="${size.h}"`;
            const imageBorder = localStorage.getItem('potion-rack-image-border') !== 'false';
            const borderStyle = imageBorder ? ' border: 1px solid #ddd;' : '';
            if (!size?.w && !size?.h) attrs += ` style="max-width:100%;max-height:500px;display:block;margin:12px auto;border-radius:6px;${borderStyle}"`;
            else attrs += ` style="${borderStyle}"`;
            return `<img ${attrs} />`;
        }
    );

    const htmlContent = marked(resolvedContent, { breaks: true, gfm: true }) as string;
    await (window as any).electronAPI?.exportPdf(figure.folder_path || '', figure.name, htmlContent);
}