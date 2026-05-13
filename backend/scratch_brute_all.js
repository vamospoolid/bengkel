const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const { printRaw } = require('./dist/utils/printer');

async function testBrute() {
    console.log(`Testing Brute Force Cut...`);
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:dummy',
        driver: { send: () => {}, open: () => {}, close: () => {} },
        width: 48
    });
    
    printer.println("BRUTE FORCE CUT TEST");
    printer.println("Mengirim berbagai jenis perintah");
    printer.println("potong sekaligus.");
    printer.newLine();
    printer.newLine();
    printer.newLine();
    
    // Epson/Iware Standard Full Cut
    printer.add(Buffer.from([0x1d, 0x56, 0x00])); 
    
    // Epson Legacy Full Cut
    printer.add(Buffer.from([0x1b, 0x69])); 
    
    // GS V 65 0
    printer.add(Buffer.from([0x1d, 0x56, 0x41, 0x00])); 
    
    // Star Mode Full Cut
    printer.add(Buffer.from([0x1b, 0x64, 0x02])); 
    
    // Citizen Mode Full Cut
    printer.add(Buffer.from([0x1b, 0x50])); 
    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log(`Sent Brute Force Test`);
    } catch (e) {
        console.error(`Failed:`, e.message);
    }
}

testBrute();
