const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const { printRaw } = require('./dist/utils/printer');

async function testCommand(name, commandArray) {
    console.log(`Testing command: ${name}`);
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:dummy',
        driver: { send: () => {}, open: () => {}, close: () => {} },
        width: 42
    });
    
    printer.println(`LAST TEST: ${name}`);
    printer.println("--------------------------------");
    printer.println("Jika ini tetap menyisakan tengah,");
    printer.println("berarti printer ini HARDWARE PARTIAL.");
    printer.newLine();
    printer.newLine();
    printer.newLine();
    printer.newLine();
    
    printer.add(Buffer.from(commandArray));
    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log(`Sent ${name}`);
    } catch (e) {
        console.error(`Failed ${name}:`, e.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
}

async function runTests() {
    // 1. ESC i (Old Style Full Cut)
    await testCommand("ESC i (0x1B 0x69)", [0x1b, 0x69]);
    
    // 2. GS V 48 (ASCII 0 Full Cut)
    await testCommand("GS V 48 (0x1D 0x56 0x30)", [0x1d, 0x56, 0x30]);
    
    // 3. GS V 65 with Feed 30 (0x1D 0x56 0x41 0x1E)
    await testCommand("GS V 65 Feed 30", [0x1d, 0x56, 0x41, 0x1e]);
    
    console.log("Last tests sent.");
}

runTests();
