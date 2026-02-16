export type ImportModuleType = 'WEEKLY_PAYMENT' | 'EXPENSES' | 'STOCK';

export interface ImportSchema {
    id: ImportModuleType;
    label: string;
    description: string;
    requiredColumns: {
        key: string;
        label: string;
        description: string;
        type: 'text' | 'number' | 'date';
        required: boolean;
        // Validation Rules
        min?: number;
        max?: number;
        regex?: string; // String pattern
    }[];
    aiPromptContext: string;
}

export const IMPORT_SCHEMAS: Record<ImportModuleType, ImportSchema> = {
    'WEEKLY_PAYMENT': {
        id: 'WEEKLY_PAYMENT',
        label: 'Pago Semanal',
        description: 'Importar asistencias, certificados y solicitudes desde la planilla de control semanal.',
        requiredColumns: [
            { key: 'name', label: 'Nombre / Descripción', description: 'Nombre del operario o ítem', type: 'text', required: true },
            { key: 'projects', label: 'Columnas de Obras', description: 'Columnas con montos asignados a obras', type: 'number', required: true, min: 0 },
            { key: 'days', label: 'Días (Asistencia)', description: 'Columnas de días (Lun-Dom)', type: 'text', required: false, regex: '^[0-1]$' } // 0 or 1 for attendance potentially
        ],
        aiPromptContext: `
            Identify the structure for Weekly Payments.
            - Look for a 'Name' column (Employee/Contractor).
            - Look for 'Category' column.
            - Look for Project columns (monetary values).
            - Look for Day columns (dates) for attendance.
        `
    },
    'EXPENSES': {
        id: 'EXPENSES',
        label: 'Gastos y Compras',
        description: 'Importar listado de facturas, tickets o gastos generales.',
        requiredColumns: [
            { key: 'date', label: 'Fecha', description: 'Fecha del comprobante', type: 'date', required: true },
            { key: 'supplier', label: 'Proveedor', description: 'Razón social o nombre', type: 'text', required: true },
            { key: 'amount', label: 'Monto Total', description: 'Importe final', type: 'number', required: true, min: 0.01 },
            { key: 'category', label: 'Categoría', description: 'Rubro del gasto', type: 'text', required: false },
            { key: 'project', label: 'Obra', description: 'Obra asignada', type: 'text', required: false }
        ],
        aiPromptContext: `
            Identify the structure for Expenses.
            - Look for Date column.
            - Look for Supplier/Vendor column.
            - Look for Amount column.
            - Look for Category/Description.
        `
    },
    'STOCK': {
        id: 'STOCK',
        label: 'Stock / Pañol',
        description: 'Importar inventario inicial de herramientas o insumos.',
        requiredColumns: [
            { key: 'name', label: 'Nombre Item', description: 'Nombre de la herramienta o insumo', type: 'text', required: true },
            { key: 'type', label: 'Tipo', description: 'Herramienta vs Insumo', type: 'text', required: false, regex: '^(TOOL|CONSUMABLE)$' },
            { key: 'quantity', label: 'Cantidad', description: 'Stock actual', type: 'number', required: true, min: 0 },
            { key: 'sku', label: 'Código / SKU', description: 'Identificador único', type: 'text', required: false }
        ],
        aiPromptContext: `
            Identify the structure for Stock Inventory.
            - Look for Item Name.
            - Look for Quantity.
            - Look for Category or Type.
            - Look for SKU/Code.
        `
    }
};
