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
    
    printer.println(`EXTRA TEST: ${name}`);
    printer.println("--------------------------------");
    printer.println("Mencoba perintah potong alternatif.");
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
    // 1. GS V 2
    await testCommand("GS V 2", [0x1d, 0x56, 0x02]);
    
    // 2. GS V 3
    await testCommand("GS V 3", [0x1d, 0x56, 0x03]);
    
    // 3. GS i
    await testCommand("GS i", [0x1d, 0x69]);
    
    // 4. GS m
    await testCommand("GS m", [0x1d, 0x6d]);
    
    console.log("Extra tests sent.");
}

runTests();
