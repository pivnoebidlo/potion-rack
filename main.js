const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1e1e1e',
        show: false
    });

    win.loadFile('frontend/index.html');

    win.once('ready-to-show', () => {
        win.show();
    });

    // Create application menu
    const menu = Menu.buildFromTemplate(getMenuTemplate(win));
    Menu.setApplicationMenu(menu);
}

function getMenuTemplate(win) {
    return [
        {
            label: 'Potion Rack',
            submenu: [
                {
                    label: 'About Potion Rack',
                    click: () => {
                        win.webContents.send('show-about');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Preferences',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        win.webContents.send('open-preferences');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Paint',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        win.webContents.send('new-paint');
                    }
                },
                {
                    label: 'Edit Paint',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        win.webContents.send('edit-paint');
                    }
                },
                {
                    label: 'Delete Paint',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => {
                        win.webContents.send('delete-paint');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Import JSON',
                    click: () => {
                        win.webContents.send('import-json');
                    }
                },
                {
                    label: 'Export JSON',
                    click: () => {
                        win.webContents.send('export-json');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    role: 'reload'
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    role: 'toggleDevTools'
                },
                { type: 'separator' },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+=',
                    role: 'zoomIn'
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    role: 'zoomOut'
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    role: 'resetZoom'
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => {
                        require('electron').shell.openExternal('https://github.com/dvb/potion-rack');
                    }
                }
            ]
        }
    ];
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});