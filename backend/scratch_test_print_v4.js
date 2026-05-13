const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const printerName = 'POS80';
const hostname = os.hostname().trim();
const printerPath = `\\\\${hostname}\\${printerName}`;
const tempFile = 'test_receipt.bin';

const buffer = Buffer.concat([
    Buffer.from([0x1B, 0x40]), // Init
    Buffer.from('\n\nJAKARTA MOTOR - TEST COMMAND PRINT\n'),
    Buffer.from('--------------------\n'),
    Buffer.from(new Date().toLocaleString() + '\n\n\n\n'),
    Buffer.from([0x1D, 0x56, 0x41, 0x03]) // Cut
]);

fs.writeFileSync(tempFile, buffer);

console.log('Sending via CMD PRINT to:', printerPath);
exec(`print /d:"${printerPath}" ${tempFile}`, (err, stdout, stderr) => {
    if (err) {
        console.error('CMD PRINT FAILED:', err.message);
        console.error('STDERR:', stderr);
    } else {
        console.log('CMD PRINT SUCCESS:', stdout);
    }
});
