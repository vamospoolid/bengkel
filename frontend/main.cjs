const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Port cleanup function
const killPort = (port) => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}` 
      : `lsof -i :${port} -t`;
      
    exec(cmd, (err, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = process.platform === 'win32' ? parts[parts.length - 1] : parts[0];
          if (pid && pid !== process.pid.toString()) {
            console.log(`Killing process ${pid} on port ${port}`);
            try { process.kill(pid, 'SIGKILL'); } catch(e) {}
          }
        });
      }
      resolve();
    });
  });
}

async function startBackend() {
  const port = 3002;
  await killPort(port);
  
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath('userData');
  
  // Ensure userData directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const logFile = path.join(userDataPath, 'backend.log');
  let logStream;
  try {
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  } catch (e) {
    console.error('Failed to create log stream:', e);
  }

  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    if (logStream) logStream.write(formattedMsg);
    console.log(msg);
  };

  log(`--- App started (isPackaged: ${app.isPackaged}) ---`);

  if (!isDev) {
    // Try multiple possible paths for the backend entry point
    const possiblePaths = [
      path.join(process.resourcesPath, 'backend', 'dist', 'index.js'),
      path.join(process.resourcesPath, 'backend', 'dist', 'src', 'index.js'),
      path.join(process.resourcesPath, 'backend', 'index.js')
    ];

    let backendPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        backendPath = p;
        break;
      }
    }

    const dbPath = path.join(userDataPath, 'database.db');
    const templateDbPath = path.join(process.resourcesPath, 'backend', 'prisma', 'dev.db');
    
    log(`Selected Backend Path: ${backendPath || 'NOT FOUND'}`);
    log(`Database Path: ${dbPath}`);
    log(`Template DB Path: ${templateDbPath}`);

    // Ensure database exists
    if (!fs.existsSync(dbPath)) {
      log(`Database not found in userData. Initializing...`);
      try {
        if (fs.existsSync(templateDbPath)) {
          fs.copyFileSync(templateDbPath, dbPath);
          log(`Database successfully copied from template.`);
        } else {
          log(`WARNING: Template database not found at ${templateDbPath}`);
          fs.writeFileSync(dbPath, '');
          log(`Created empty database file.`);
        }
      } catch (err) {
        log(`ERROR initializing database: ${err.message}`);
      }
    }

    if (backendPath) {
      log(`Spawning backend process...`);
      const env = { 
        ...process.env, 
        ELECTRON_RUN_AS_NODE: '1',
        DATABASE_URL: `file:${dbPath}`,
        PORT: '3002'
      };

      backendProcess = spawn(process.execPath, [backendPath], {
        cwd: path.join(process.resourcesPath, 'backend'),
        env: env
      });

      backendProcess.stdout.on('data', (data) => {
        if (logStream) logStream.write(`[BACKEND-STDOUT] ${data}`);
      });

      backendProcess.stderr.on('data', (data) => {
        if (logStream) logStream.write(`[BACKEND-STDERR] ${data}`);
      });

      backendProcess.on('error', (err) => {
        log(`CRITICAL: Failed to start backend: ${err.message}`);
      });

      backendProcess.on('close', (code) => {
        log(`Backend process closed with code ${code}`);
      });
    } else {
      log(`ERROR: Could not find backend entry file in any of: ${possiblePaths.join(', ')}`);
    }
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
