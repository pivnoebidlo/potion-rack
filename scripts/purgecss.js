const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

async function run() {
    const contentPaths = [
        path.resolve('public/index.html'),
        path.resolve('src/renderer/index.ts'),
    ];

    console.log('Content files:', contentPaths.map(p => `${p} (${fs.existsSync(p) ? 'exists' : 'NOT FOUND'})`));
    console.log('CSS files:', [
        path.resolve('public/css/theme.css'),
        path.resolve('public/css/main.css'),
    ].map(p => `${p} (${fs.existsSync(p) ? 'exists' : 'NOT FOUND'})`));

    const purgeCSSResult = await new PurgeCSS().purge({
        content: contentPaths,
        css: [
            'public/css/theme.css',
            'public/css/main.css',
        ],
        safelist: {
            standard: ['active', 'hidden', 'selected', 'collapsed', 'open', 'closed'],
            deep: [/^status-/, /^star-/, /^gallery-/, /^cm-/, /^toastui-/, /^markdown-/],
        },
    });

    for (const result of purgeCSSResult) {
        const filename = path.basename(result.file);
        fs.writeFileSync(`public/css/${filename}.purged`, result.css);
        const original = fs.readFileSync(result.file, 'utf8');
        const removed = original.length - result.css.length;
        console.log(`${filename}: removed ${(removed / 1024).toFixed(1)} KB (${((removed / original.length) * 100).toFixed(1)}%)`);
    }
}

run().catch(console.error);