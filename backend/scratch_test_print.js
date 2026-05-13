const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const { printRaw } = require('./src/utils/printer');
const os = require('os');

async function testThermal() {
    console.log('Testing POS80...');
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:dummy'
    });
    printer.alignCenter();
    printer.println("TEST PRINT POS80");
    printer.println("JAKARTA MOTOR");
    printer.println("--------------------------------");
    printer.println("PRINTER KASIR SIAP DIGUNAKAN");
    printer.newLine();
    printer.newLine();
    printer.add(Buffer.from([0x1d, 0x56, 0x42, 0x00])); 

    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log('POS80 Test sent!');
    } catch (e) {
        console.error('POS80 Test failed:', e.message);
    }
}

async function testLabel() {
    console.log('Testing Xprinter...');
    // For label printers like Xprinter (TSPL/ESC-POS), we can send a simple text or raw command
    // Here we just send a simple text buffer to see if it responds
    const buffer = Buffer.from("SIZE 40 mm, 30 mm\r\nGAP 2 mm, 0\r\nDIRECTION 1\r\nCLS\r\nTEXT 50,50,\"3\",0,1,1,\"TEST XPRINTER\"\r\nPRINT 1,1\r\n");
    
    try {
        await printRaw(buffer, "Xprinter");
        console.log('Xprinter Test sent!');
    } catch (e) {
        console.error('Xprinter Test failed:', e.message);
    }
}

async function run() {
    await testThermal();
    await testLabel();
}

run();
