# Importación de Pago Semanal desde Excel

Este módulo permite importar datos históricos o legacy desde planillas Excel para poblar el "Pago Semanal".
El sistema procesa el archivo para identificar **Personal** (Asistencias), **Contratistas** (Certificaciones) y **Solicitudes de Fondos**.

## Formato de Excel Soportado
El sistema intenta ser flexible, pero espera ciertas convenciones:

### 1. Zona de Personal (Asistencias)
- Filas que contienen en la columna "Rubro" o "Categoría" alguno de los siguientes términos:
  - `Capataz`, `Oficial`, `1/2 Oficial`, `Ayudante`, `Sereno`.
- Debe existir una columna con el nombre del empleado.
- Debe haber columnas para los días de la semana (Lunes, Martes, ..., Domingo).
- **Contenido**: En la celda del día debe figurar el **Nombre de la Obra**. Si está vacío, "0" o "-", se ignora.

### 2. Zona de Contratistas y Gastos (Certificaciones / Solicitudes)
- Filas donde el Rubro NO es de personal operativo.
- **Contratistas**: Se identifican si el **Nombre** coincide con un contratista registrado en el sistema (ej: "Fernando", "Claudio") y el rubro NO es genérico ("Materiales", "Caja").
- **Solicitudes de Fondos**: Se asume si no hay contratista o si el nombre es genérico ("Caja", "Materiales", "Varios").
- **Montos**: El sistema busca columnas cuyo encabezado coincida con el **Nombre de una Obra** registrada. Si la celda tiene un valor numérico, se crea el registro asociado a esa obra.

## Reglas de Proceso
- **Idempotencia**: Al importar, se **borran** todos los registros previamente importados (origen `IMPORT`) para esa misma semana. Esto permite corregir el Excel y volver a subirlo sin duplicar datos.
- **Normalización**: Se ignoran mayúsculas, minúsculas y tildes para el matcheo de nombres y obras.
- **Advertencias**: Si una fila tiene datos pero no se encuentra la obra o el empleado/contratista, se reportará en el resumen final.

## Uso
1. Ir a la página de **Migración**.
2. En la tarjeta "Importación Masiva (Multi-Hoja)", haz clic en **Importar Excel**.
3. Selecciona tu archivo `.xlsx`.
4. Haz clic en **Importar**.
5. El sistema procesará todas las hojas, creará las semanas correspondientes si no existen, e importará asistencias, pagos a contratistas y solicitudes de fondos.
6. Al finalizar, verás un resumen de lo importado y cualquier advertencia.
