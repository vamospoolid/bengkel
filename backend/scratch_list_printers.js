const { exec } = require('child_process');
exec('Get-Printer | Select-Object Name | ConvertTo-Json -Compress', { shell: 'powershell.exe' }, (error, stdout) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Detected Printers:');
  console.log(stdout);
});
