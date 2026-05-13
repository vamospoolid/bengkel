const fs = require('fs');
const os = require('os');

function printRaw(buffer, printerName) {
    const hostname = os.hostname().trim();
    const printerPath = `\\\\${hostname}\\${printerName}`;
    console.log('Sending to:', printerPath);
    const stream = fs.createWriteStream(printerPath);
    stream.write(buffer);
    stream.end();
}

// POS80 Test
const thermalBuffer = Buffer.from("\x1B\x40\x1B\x61\x01TEST PRINT POS80\nJAKARTA MOTOR\n--------------------------------\nPRINTER KASIR SIAP\n\n\n\x1D\x56\x41\x03");
try {
    printRaw(thermalBuffer, "POS80");
    console.log('POS80 Test sent!');
} catch (e) { console.error('POS80 Error:', e.message); }

// Xprinter Test
const labelBuffer = Buffer.from("SIZE 40 mm, 30 mm\r\nGAP 2 mm, 0\r\nDIRECTION 1\r\nCLS\r\nTEXT 50,50,\"3\",0,1,1,\"TEST XPRINTER\"\r\nPRINT 1,1\r\n");
try {
    printRaw(labelBuffer, "Xprinter");
    console.log('Xprinter Test sent!');
} catch (e) { console.error('Xprinter Error:', e.message); }
