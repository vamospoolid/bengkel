const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const { printRaw } = require('./dist/utils/printer');

async function testFinal() {
    console.log(`Testing 80mm Final Brute...`);
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:dummy',
        driver: { send: () => {}, open: () => {}, close: () => {} },
        width: 48 // Standard 80mm width (48 chars)
    });
    
    // Reset printer to default settings before cut
    printer.add(Buffer.from([0x1b, 0x40])); 
    
    printer.println("FINAL 80mm TEST");
    printer.println("================================");
    printer.println("Jika ini masih tersisa di tengah,");
    printer.println("berarti pisau Anda tipe PARTIAL.");
    printer.newLine();
    printer.newLine();
    printer.newLine();
    printer.newLine();
    
    // GS V 65 0 (Standard Full Cut with Feed)
    printer.add(Buffer.from([0x1d, 0x56, 0x41, 0x00])); 
    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log(`Sent Final 80mm Test`);
    } catch (e) {
        console.error(`Failed:`, e.message);
    }
}

testFinal();
