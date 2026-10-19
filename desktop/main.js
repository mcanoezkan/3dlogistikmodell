// Healthcare Simulation Suite – Desktop (Electron)
// Lädt die Suite als lokale Datei; Lizenzpflicht über window.HSS_DESKTOP (preload.js).
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

function fenster() {
  const win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1000, minHeight: 640, backgroundColor: '#0A223C',
    title: 'Healthcare Simulation Suite', icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // externe Links (OpenStreetMap usw.) im Standardbrowser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(fenster);
app.on('window-all-closed', () => app.quit());
