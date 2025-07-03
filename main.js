const { app, BrowserWindow } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 700,
    resizable: false,         // Optional: prevent user resizing to preserve layout
    fullscreenable: false,    // Prevent accidental fullscreen
    maximizable: false,       // Optional: restrict maximization
    minimizable: true,        // Still allow minimizing
    autoHideMenuBar: true,    // Clean look by hiding menu
    icon: path.join(__dirname, 'assets', 'logo.png'), // Set app icon
    frame: false, // Make window frameless for custom title bar
    titleBarStyle: 'hidden', // Hide default title bar
    backgroundColor: '#141414', // Set window background color
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
    }
  });

  require('@electron/remote/main').enable(win.webContents);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 