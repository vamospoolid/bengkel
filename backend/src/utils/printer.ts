import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function ensurePrinterShared(printerName: string): Promise<string> {
  try {
    // Check if shared, if not, share it.
    // We use a robust PS command to both check and set.
    const shareCommand = `powershell -NoProfile -Command "$p = Get-Printer -Name '${printerName}' -ErrorAction SilentlyContinue; if ($p -and -not $p.Shared) { Set-Printer -Name '${printerName}' -Shared $true -ShareName '${printerName}' -ErrorAction Stop; Start-Sleep -Seconds 1; Write-Output 'Shared' } elseif ($p) { Write-Output 'AlreadyShared' } else { Write-Output 'NotFound' }"`;
    
    const { stdout } = await execAsync(shareCommand);
    const result = stdout.trim();
    
    if (result === 'NotFound') {
      console.warn(`Printer ${printerName} not found in system.`);
    } else {
      console.log(`Printer ${printerName} status verified: ${result}`);
    }
    
    return printerName; // Always return the original printerName for the path
  } catch (err) {
    console.error('Failed to ensure printer shared:', err);
    return printerName;
  }
}

export async function printRaw(buffer: Buffer, printerName: string): Promise<void> {
  // First, ensure it is shared (fixes the issue where sharing is lost on printer restart)
  const shareName = await ensurePrinterShared(printerName);

  return new Promise((resolve, reject) => {
    const cleanPrinterName = printerName.trim();
    
    console.log('Smart Print: Sending RAW data via WinSpool API to', cleanPrinterName);

    // Write buffer to a temp file first
    const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, buffer);

    // Write PowerShell script to a temp .ps1 file
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

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, (err, stdout, stderr) => {
      // Clean up temp files
      try { fs.unlinkSync(tempFile); } catch (e) {}
      try { fs.unlinkSync(psFile); } catch (e) {}

      if (err || stdout.trim() !== 'Success') {
        console.error('WinSpool Print Error:', stderr || err?.message || stdout);
        reject(new Error(`Gagal cetak via WinSpool API. Error: ${stderr || stdout}`));
      } else {
        console.log('Print job sent successfully via WinSpool API');
        resolve();
      }
    });
  });
}

