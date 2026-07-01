const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Jakarta Motor POS',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
    autoHideMenuBar: true,
  });

  // Tandai sebagai Electron agar frontend bisa deteksi via userAgent
  mainWindow.webContents.setUserAgent(
    mainWindow.webContents.getUserAgent() + ' ElectronPOS/1.0'
  );

  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;

  if (isDev) {
    // Mode development: load dari VPS (sama seperti production)
    mainWindow.loadURL('http://173.212.243.240').catch(() => {
      mainWindow.loadURL('http://localhost:5173');
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Mode production: load dari VPS
    mainWindow.loadURL('http://173.212.243.240').catch(e => {
      console.error('Gagal memuat VPS, mencoba fallback lokal...', e);
      const localPath = path.join(__dirname, 'dist', 'index.html');
      mainWindow.loadFile(localPath);
    });
  }

  // Keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.webContents.reloadIgnoringCache();
      });
      event.preventDefault();
    } else if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.reload();
      event.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('render-process-gone', (event, detailed) => {
    console.error('Render process gone:', detailed.reason);
  });
}

// ──────────────────────────────────────────────────────────────
// BACKEND STARTER (untuk mode packaged, jalankan backend lokal)
// ──────────────────────────────────────────────────────────────
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
            try { process.kill(parseInt(pid), 'SIGKILL'); } catch (e) {}
          }
        });
      }
      resolve();
    });
  });
};

async function startBackend() {
  if (app.isPackaged) {
    await killPort(3002);

    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });

    const logFile = path.join(userDataPath, 'backend.log');
    let logStream;
    try { logStream = fs.createWriteStream(logFile, { flags: 'a' }); } catch (e) {}

    const log = (msg) => {
      const ts = new Date().toISOString();
      if (logStream) logStream.write(`[${ts}] ${msg}\n`);
      console.log(msg);
    };

    const possiblePaths = [
      path.join(process.resourcesPath, 'backend', 'dist', 'index.js'),
      path.join(process.resourcesPath, 'backend', 'dist', 'src', 'index.js'),
      path.join(process.resourcesPath, 'backend', 'index.js'),
    ];

    let backendPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) { backendPath = p; break; }
    }

    const dbPath = path.join(userDataPath, 'database.db');
    const templateDbPath = path.join(process.resourcesPath, 'backend', 'prisma', 'dev.db');

    if (!fs.existsSync(dbPath)) {
      if (fs.existsSync(templateDbPath)) {
        fs.copyFileSync(templateDbPath, dbPath);
        log('Database copied from template.');
      }
    }

    if (backendPath) {
      const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        DATABASE_URL: `file:${dbPath}`,
        PORT: '3002',
      };
      backendProcess = spawn(process.execPath, [backendPath], {
        cwd: path.join(process.resourcesPath, 'backend'),
        env,
      });
      backendProcess.stdout.on('data', d => { if (logStream) logStream.write(`[BE] ${d}`); });
      backendProcess.stderr.on('data', d => { if (logStream) logStream.write(`[BE-ERR] ${d}`); });
    }
  }
}

// ──────────────────────────────────────────────────────────────
// IPC HANDLERS — PRINTER
// ──────────────────────────────────────────────────────────────
let ThermalPrinter, PrinterTypes;
try {
  ThermalPrinter = require('node-thermal-printer').printer;
  PrinterTypes = require('node-thermal-printer').types;
} catch (e) {
  console.warn('node-thermal-printer not available, using PowerShell fallback only.');
}

// GET PRINTERS
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Gagal mengambil printer:', err);
    return [];
  }
});

// RAW ESC/POS PRINT (Nota Thermal)
ipcMain.handle('print-raw', async (event, printerName, transaction, workshop) => {
  return new Promise(async (resolve) => {
    try {
      let cleanPrinterName = printerName ? printerName.trim() : '';
      if (!cleanPrinterName && mainWindow) {
        const list = await mainWindow.webContents.getPrintersAsync();
        const pos80 = list.find(p =>
          p.name.toUpperCase().includes('POS80') ||
          p.name.toUpperCase().includes('80MM') ||
          p.name.toUpperCase().includes('THERMAL')
        );
        cleanPrinterName = pos80 ? pos80.name : (list[0]?.name || '');
      }

      if (!cleanPrinterName) {
        console.error('Printer tidak ditemukan.');
        return resolve(false);
      }

      const w = workshop || { name: 'JAKARTA MOTOR', address: '', phone: '', footerMessage: 'Terima kasih' };

      // Build ESC/POS buffer menggunakan node-thermal-printer jika tersedia
      let buffer;
      if (ThermalPrinter) {
        const printer = new ThermalPrinter({
          type: PrinterTypes.EPSON,
          interface: 'tcp://127.0.0.1:9000',
          removeSpecialCharacters: false,
          lineCharacter: '=',
          width: 42,
        });

        printer.alignCenter();
        if (transaction.reprintCount > 0 || transaction.isCopy) {
          printer.setTextDoubleHeight();
          printer.println('*** SALINAN ***');
          printer.setTextNormal();
          printer.newLine();
        }
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printer.println(w.name || 'JAKARTA MOTOR');
        printer.setTextNormal();
        if (w.address) printer.println(w.address);
        if (w.phone) printer.println(`Telp: ${w.phone}`);
        printer.drawLine();

        printer.alignLeft();
        printer.println(`No: ${transaction.invoiceNo}`);
        printer.println(`Tgl: ${new Date(transaction.createdAt).toLocaleString('id-ID')}`);
        printer.println(`Ksr: ADMIN`);
        if (transaction.customer?.name) printer.println(`Plg: ${transaction.customer.name}`);
        if (transaction.vehicle) printer.println(`Unit: ${transaction.vehicle.plateNumber}`);
        printer.drawLine();

        transaction.items.forEach(item => {
          printer.alignLeft();
          printer.println(`${item.name}`);
          const qtyStr = `${item.quantity} x ${(item.price || 0).toLocaleString('id-ID')}`;
          const totalStr = ((item.price || 0) * item.quantity).toLocaleString('id-ID');
          const spaces = 42 - qtyStr.length - totalStr.length;
          printer.println(`${qtyStr}${' '.repeat(Math.max(0, spaces))}${totalStr}`);
        });

        printer.drawLine();
        const subtotal = transaction.items.reduce((acc, i) => acc + ((i.price || 0) * i.quantity), 0);
        const printRow = (label, val) => {
          const vStr = (val || 0).toLocaleString('id-ID');
          const spaces = 42 - label.length - vStr.length;
          printer.println(`${label}${' '.repeat(Math.max(0, spaces))}${vStr}`);
        };
        printRow('Subtotal', subtotal);
        if (transaction.tax > 0) printRow('Pajak', transaction.tax);
        if (transaction.discount > 0) printRow('Diskon', -transaction.discount);
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printRow('TOTAL', transaction.totalAmount);
        printer.setTextNormal();
        printer.drawLine();

        printer.alignCenter();
        printer.println(w.footerMessage || 'Terima kasih');
        printer.newLine();
        try { printer.printBarcode(transaction.invoiceNo, 73); } catch (e) {}
        printer.newLine();
        printer.newLine();
        printer.newLine();
        printer.add(Buffer.from([0x1d, 0x56, 0x00]));
        buffer = printer.getBuffer();
      }

      if (!buffer || buffer.length === 0) {
        console.error('Buffer kosong, tidak bisa cetak.');
        return resolve(false);
      }

      // Kirim ke printer via WinSpool API (PowerShell)
      const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
      fs.writeFileSync(tempFile, buffer);

      const psFile = path.join(os.tmpdir(), `print_${Date.now()}.ps1`);
      const psScript = `
$Path = '${tempFile.replace(/\\/g, '\\\\')}';
$PrinterName = '${cleanPrinterName}';
$Code = @'
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern uint StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
    public static bool SendBytesToPrinter(string szPrinterName, IntPtr pBytes, Int32 dwCount) {
        Int32 dwWritten = 0; IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA(); bool bSuccess = false;
        di.pDocName = "RAW POS Receipt"; di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di) != 0) {
                if (StartPagePrinter(hPrinter)) {
                    bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
'@
Add-Type -TypeDefinition $Code
$Bytes = [System.IO.File]::ReadAllBytes($Path)
$Handle = [System.Runtime.InteropServices.Marshal]::AllocCoTaskMem($Bytes.Length)
[System.Runtime.InteropServices.Marshal]::Copy($Bytes, 0, $Handle, $Bytes.Length)
$Result = [RawPrinter]::SendBytesToPrinter($PrinterName, $Handle, $Bytes.Length)
[System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($Handle)
if ($Result) { Write-Output "Success" } else { Write-Error "WinSpool Failed" }
`;
      fs.writeFileSync(psFile, psScript);

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 10000, windowsHide: true }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        try { fs.unlinkSync(psFile); } catch (e) {}
        if (err || stdout.trim() !== 'Success') {
          console.error('WinSpool Error:', stderr || err?.message);
          resolve(false);
        } else {
          console.log('[print-raw] Success:', cleanPrinterName);
          resolve(true);
        }
      });
    } catch (e) {
      console.error('[print-raw] Exception:', e);
      resolve(false);
    }
  });
});

// SILENT HTML PRINT (Label Barcode via print-silent)
ipcMain.handle('print-silent', async (event, options, htmlContent) => {
  console.log(`[print-silent] Target: ${options.deviceName}`);

  if (!htmlContent) {
    if (!mainWindow) return false;
    return new Promise(resolve => {
      mainWindow.webContents.print(options, (success, errType) => {
        if (!success) console.error('[print-silent] Failed:', errType);
        resolve(success);
      });
    });
  }

  return new Promise(resolve => {
    let printWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const printStyles = `<style>
      * { color: black !important; background: white !important; -webkit-print-color-adjust: exact; }
      body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
      @page { margin: 0; }
    </style>`;

    const fullHtml = htmlContent.includes('<html')
      ? htmlContent.replace('</head>', `${printStyles}</head>`)
      : `<!DOCTYPE html><html><head><meta charset="UTF-8">${printStyles}</head><body>${htmlContent}</body></html>`;

    const tempPath = path.join(os.tmpdir(), `print_${Date.now()}.html`);
    fs.writeFileSync(tempPath, fullHtml);
    printWindow.loadFile(tempPath);

    printWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        if (printWindow.isDestroyed()) return;
        const printOptions = {
          silent: options.silent ?? true,
          deviceName: options.deviceName,
          margins: options.margins || { marginType: 'none' },
          pageSize: options.pageSize || 'A4',
          color: false,
          printBackground: true,
          scaleFactor: 100,
          copies: options.copies || 1,
        };
        printWindow.webContents.print(printOptions, (success, errorType) => {
          try { fs.unlinkSync(tempPath); } catch (e) {}
          if (!success) console.error('[print-silent] Print failed:', errorType);
          else console.log('[print-silent] Success!');
          printWindow.close();
          resolve(success);
        });
      }, 1000);
    });

    setTimeout(() => {
      if (!printWindow.isDestroyed()) {
        console.error('[print-silent] Timeout');
        printWindow.close();
        resolve(false);
      }
    }, 15000);
  });
});

// ──────────────────────────────────────────────────────────────
// APP LIFECYCLE
// ──────────────────────────────────────────────────────────────
process.on('uncaughtException', err => console.error('Uncaught:', err));

app.whenReady().then(() => {
  startBackend();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
