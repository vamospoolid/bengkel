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
    
    printer.println(`TEST COMMAND: ${name}`);
    printer.println("--------------------------------");
    printer.println("Jika struk ini terlepas sepenuhnya,");
    printer.println(`maka perintah ${name} adalah Full Cut.`);
    printer.newLine();
    printer.newLine();
    printer.newLine();
    printer.newLine();
    
    // Add the specific cut command
    printer.add(Buffer.from(commandArray));
    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log(`Sent ${name}`);
    } catch (e) {
        console.error(`Failed ${name}:`, e.message);
    }
    
    // Wait 2 seconds between tests so user can see which one worked
    await new Promise(resolve => setTimeout(resolve, 3000));
}

async function runTests() {
    // 1. GS V 0 (Standard Full Cut)
    await testCommand("GS V 0", [0x1d, 0x56, 0x00]);
    
    // 2. GS V 48 (ASCII '0' Full Cut)
    await testCommand("GS V 48", [0x1d, 0x56, 0x30]);
    
    // 3. GS V 65 0 (Feed and Full Cut)
    await testCommand("GS V 65 0", [0x1d, 0x56, 0x41, 0x00]);
    
    // 4. GS V 66 0 (Alternative Feed and Full Cut - the one we just tried)
    await testCommand("GS V 66 0", [0x1d, 0x56, 0x42, 0x00]);
    
    // 5. ESC i (Old Full Cut)
    await testCommand("ESC i", [0x1b, 0x69]);
    
    console.log("All tests sent. Please check which one resulted in a 100% cut.");
}

runTests();
