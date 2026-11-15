// An article as a PDF: the window gives a whole HTML page (renderer/projects/pdf.ts), a hidden window prints it.
// The page is written to a temporary file (file:// may load rack:// pictures, as the main window does).
import { app, BrowserWindow } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function htmlToPdf(html: string): Promise<Buffer> {
  const tmp = path.join(app.getPath('temp'), `potion-rack-print-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false, javascript: true } });
  try {
    await win.loadFile(tmp);
    // Every picture loaded (or failed) before printing. A hidden window never loads lazy pictures: made eager first,
    // and the wait is limited, so one broken picture does not hang the export.
    await win.webContents.executeJavaScript(
      `Promise.race([
        Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }); })),
        new Promise((r) => setTimeout(r, 20000)),
      ])`
    );
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    });
  } finally {
    win.destroy();
    fs.rmSync(tmp, { force: true });
  }
}
