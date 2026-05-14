const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  console.log("Membuat jendela utama...");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Jakarta Motor POS",
    show: true, // Tampilkan langsung agar kita bisa lihat prosesnya
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // Izinkan load file lokal
    }
  });

  // Buka versi desktop asli (selalu lokal)
  // Ini memastikan localStorage (data login) tidak hilang saat mati lampu/offline
  let frontendPath;
  if (app.isPackaged) {
    frontendPath = path.join(process.resourcesPath, 'frontend_dist', 'index.html');
  } else {
    frontendPath = path.join(__dirname, '../frontend/dist/index.html');
  }
  
  mainWindow.loadFile(frontendPath).catch(e => {
    console.error("Gagal memuat versi lokal:", e);
  });

  // Matikan panel devtools otomatis agar rapi
  // mainWindow.webContents.openDevTools();

  mainWindow.setMenuBarVisibility(false);
  
  // Langsung maximize saat terbuka
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Tangkap jika terjadi crash di halaman web
  mainWindow.webContents.on('render-process-gone', (event, detailed) => {
    console.error("Render process gone:", detailed.reason);
  });
}

// Tambahkan error handler global
process.on('uncaughtException', (error) => {
    console.error('Ada error yang tidak tertangkap:', error);
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// --- IPC HANDLERS ---
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Gagal mengambil printer:', err);
    return [];
  }
});

// RAW ESC/POS PRINTER
ipcMain.handle('print-raw', async (event, printerName, transaction, workshop) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cleanPrinterName = printerName.trim();
      
      let w = workshop;
      if (!w) {
        try {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          w = await prisma.workshop.findFirst();
        } catch (err) {
          console.error("Failed to fetch workshop for raw print", err);
          w = {};
        }
      }
      
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'tcp://127.0.0.1:9000',
        characterSet: 'PC858_EURO',
        removeSpecialCharacters: false,
        lineCharacter: "=",
        width: 42
      });

      printer.alignCenter();
      if (transaction.reprintCount > 0 || transaction.isCopy) {
        printer.setTextDoubleHeight();
        printer.println("*** SALINAN ***");
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
      if (transaction.customer && transaction.customer.name) printer.println(`Plg: ${transaction.customer.name}`);
      if (transaction.vehicle) printer.println(`Unit: ${transaction.vehicle.plateNumber}`);
      printer.drawLine();

      transaction.items.forEach((item) => {
        printer.alignLeft();
        printer.println(`${item.name}`);
        const qtyStr = `${item.quantity} x ${(item.price || 0).toLocaleString('id-ID')}`;
        const totalStr = ((item.price || 0) * item.quantity).toLocaleString('id-ID');
        const spaces = 42 - qtyStr.length - totalStr.length;
        printer.println(`${qtyStr}${" ".repeat(Math.max(0, spaces))}${totalStr}`);
      });

      printer.drawLine();

      const subtotal = transaction.items.reduce((acc, i) => acc + ((i.price || 0) * i.quantity), 0);
      const printRow = (label, val) => {
        const vStr = (val || 0).toLocaleString('id-ID');
        const spaces = 42 - label.length - vStr.length;
        printer.println(`${label}${" ".repeat(Math.max(0, spaces))}${vStr}`);
      };

      printRow("Subtotal", subtotal);
      if (transaction.tax > 0) printRow("Pajak", transaction.tax);
      if (transaction.discount > 0) printRow("Diskon", -transaction.discount);

      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printRow("TOTAL", transaction.totalAmount);
      printer.setTextNormal();
      printer.drawLine();

      printer.alignCenter();
      printer.println(w.footerMessage || "Terima kasih");
      printer.newLine();
      if (transaction.invoiceNo) {
        try {
          printer.printBarcode(transaction.invoiceNo, 73);
        } catch (e) {
          console.error("Barcode print error:", e);
        }
      }
      printer.newLine();
      printer.newLine();
      printer.add(Buffer.from([0x1d, 0x56, 0x00])); // Standard GS V command for single cut

      const buffer = printer.getBuffer();
      
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
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern uint StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, IntPtr pBytes, Int32 dwCount) {
        Int32 dwWritten = 0;
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;
        di.pDocName = "RAW POS Receipt";
        di.pDataType = "RAW";
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

if ($Result) { Write-Output "Success" } else { Write-Error "WinSpool API Failed" }
`;
      fs.writeFileSync(psFile, psScript);

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 10000, windowsHide: true }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        try { fs.unlinkSync(psFile); } catch (e) {}

        if (err || stdout.trim() !== 'Success') {
          console.error('WinSpool Print Error:', stderr || err?.message || stdout);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      console.error(e);
      resolve(false);
    }
  });
});

ipcMain.handle('print-silent', async (event, options, htmlContent) => {
  console.log(`[Print] Target: ${options.deviceName}, Silent: ${options.silent}`);
  
  if (htmlContent) {
    return new Promise((resolve) => {
      let printWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });
      
      // Ensure we have a valid HTML structure but don't double-wrap
      // Force High Contrast for Thermal
      const printStyles = `
        <style>
          * { color: black !important; background: white !important; -webkit-print-color-adjust: exact; }
          body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
          @page { margin: 0; }
        </style>
      `;

      const fullHtml = htmlContent.includes('<html') 
        ? htmlContent.replace('</head>', `${printStyles}</head>`) 
        : `<!DOCTYPE html><html><head><meta charset="UTF-8">${printStyles}</head><body>${htmlContent}</body></html>`;
      
      const tempPath = path.join(os.tmpdir(), `print_${Date.now()}.html`);
      fs.writeFileSync(tempPath, fullHtml);
      printWindow.loadFile(tempPath);
      
      printWindow.webContents.on('did-finish-load', () => {
        console.log(`[Print] File loaded, waiting for paint...`);
        setTimeout(() => {
          if (printWindow.isDestroyed()) return;
          
          const printOptions = {
            silent: options.silent ?? true,
            deviceName: options.deviceName,
            margins: options.margins || { marginType: 'none' },
            pageSize: options.pageSize || 'A4',
            color: options.color ?? false,
            printBackground: true,
            scaleFactor: 100,
            copies: options.copies || 1
          };

          console.log(`[Print] Options:`, JSON.stringify(printOptions));
          printWindow.webContents.print(printOptions, (success, errorType) => {
            try { fs.unlinkSync(tempPath); } catch (e) {}
            if (!success) console.error('[Print] Failed:', errorType);
            else console.log('[Print] Success!');
            printWindow.close();
            resolve(success);
          });
        }, 1000);
      });

      // Timeout safety
      setTimeout(() => {
        if (!printWindow.isDestroyed()) {
          console.error('[Print] Timeout reached');
          printWindow.close();
          resolve(false);
        }
      }, 15000);
    });
  }

  if (!mainWindow) return false;
  return new Promise((resolve) => {
    mainWindow.webContents.print(options, (success, errorType) => {
      if (!success) console.error('Print failed:', errorType);
      resolve(success);
    });
  });
});
