const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const { printRaw } = require('./dist/utils/printer');

async function testAggressive() {
    console.log(`Testing Aggressive Cut...`);
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:dummy',
        driver: { send: () => {}, open: () => {}, close: () => {} },
        width: 48
    });
    
    // Full Reset + Initialize
    printer.add(Buffer.from([0x1b, 0x40])); 
    
    printer.println("AGGRESSIVE CUT TEST");
    printer.println("Jika dulu bisa, sekarang harusnya bisa.");
    printer.newLine();
    printer.newLine();
    printer.newLine();
    printer.newLine();
    
    // Sending BOTH common cut commands
    // Some printers need to see the old command if the new one fails
    printer.add(Buffer.from([0x1d, 0x56, 0x00])); // GS V 0
    printer.add(Buffer.from([0x1b, 0x69]));       // ESC i
    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log(`Sent Aggressive Test`);
    } catch (e) {
        console.error(`Failed:`, e.message);
    }
}

testAggressive();
