try {
    const PrinterModule = require('pdfmake/js/Printer');
    console.log('Required pdfmake/js/Printer');
    console.log('Keys:', Object.keys(PrinterModule));

    const Printer = PrinterModule.default || PrinterModule;
    console.log('Resolved Printer type:', typeof Printer);

    try {
        const p = new Printer({ Roboto: { normal: 'Roboto-Regular.ttf' } });
        console.log('Successfully instantiated Printer class!');
    } catch (e) {
        console.log('Failed to instantiate Printer:', e.message);
    }

} catch (e) {
    console.log('Failed to require pdfmake/js/Printer:', e.message);
}
