import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import { printRaw } from './src/utils/printer';

async function testThermal() {
    console.log('Testing POS80 with Full Cut Fix...');
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:dummy',
        width: 42
    });
    
    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.println("TEST FULL CUT FIX");
    printer.setTextNormal();
    printer.println("JAKARTA MOTOR");
    printer.drawLine();
    printer.println("Jika struk ini terpotong 100%,");
    printer.println("maka perbaikan berhasil.");
    printer.newLine();
    printer.newLine();
    printer.newLine();
    
    // Manual Full Cut Command (GS V 66 0)
    printer.add(Buffer.from([0x1d, 0x56, 0x42, 0x00])); 
    
    try {
        await printRaw(printer.getBuffer(), "POS80");
        console.log('Test print sent successfully to POS80!');
    } catch (e: any) {
        console.error('Test print failed:', e.message);
    }
}

testThermal();
