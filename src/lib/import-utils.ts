import { read, utils } from 'xlsx';

export type ImportResult<T> = {
    data: T[];
    errors: string[];
    headers: string[];
    sheetNames?: string[];
};

export async function parseExcelFile(file: File, options: { headerRowIndex?: number; sheetName?: string } | number = {}): Promise<ImportResult<any>> {
    // Handle both object and number (legacy) signatures
    const headerRowIndex = typeof options === 'number' ? options : (options.headerRowIndex || 0);
    const sheetName = typeof options === 'object' ? options.sheetName : undefined;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'array' });
                const sheetNames = workbook.SheetNames;

                // Select specific sheet or the first one
                const targetSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
                const worksheet = workbook.Sheets[targetSheetName];

                // Get all data as array of arrays
                const rawRows = utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

                if (!rawRows || rawRows.length <= headerRowIndex) {
                    resolve({ data: [], errors: ['La hoja seleccionada está vacía o no tiene suficientes filas'], headers: [], sheetNames });
                    return;
                }

                // Extract headers from the selected row
                // Filter out null/undefined headers and convert to string
                const headers = rawRows[headerRowIndex]?.map(h => h ? String(h).trim() : '').filter(h => h !== '') || [];

                if (headers.length === 0) {
                    resolve({ data: [], errors: ['No se detectaron columnas con nombre en la fila seleccionada'], headers: [], sheetNames });
                    return;
                }

                // Map row data to objects using headers
                const headerMap: Record<number, string> = {};
                rawRows[headerRowIndex].forEach((cell, idx) => {
                    if (cell) headerMap[idx] = String(cell).trim();
                });

                const robustData = rawRows.slice(headerRowIndex + 1).map((row, idx) => {
                    const obj: any = { _row: headerRowIndex + 1 + idx + 1 + 1 }; // +1 for 0-index, +1 for header
                    Object.keys(headerMap).forEach((colIdx) => {
                        const key = parseInt(colIdx);
                        obj[headerMap[key]] = row[key];
                    });
                    return obj;
                });

                resolve({
                    data: robustData,
                    errors: [],
                    headers: Object.values(headerMap),
                    sheetNames
                });
            } catch (error) {
                console.error("Error parsing Excel:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

export function normalizeDate(value: any): string | null {
    if (!value) return null;
    // Excel date handling (if number)
    if (typeof value === 'number') {
        // Excel base date
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return date.toISOString();
    }
    // String parsing logic could be added here
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date.toISOString();
    } catch (e) { }

    return null;
}
