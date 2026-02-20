/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Set global options for functions.
setGlobalOptions({ maxInstances: 10 });

import { onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Helper function to update denormalized names across common collections
async function updateDenormalizedName(
  collectionName: string,
  filterField: string,
  filterValue: string,
  updateField: string,
  newValue: string
) {
  const snapshot = await admin.firestore().collection(collectionName).where(filterField, "==", filterValue).get();

  if (snapshot.empty) return;

  const batch = admin.firestore().batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { [updateField]: newValue });
  });

  await batch.commit();
}

/**
 * Triggered when a Project is updated.
 * Propagates the new project name to related collections if the name changed.
 */
export const onProjectUpdated = onDocumentUpdated("projects/{projectId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.name === after.name) return;

  const projectId = event.params.projectId;
  const newName = after.name;

  // Update potential denormalized fields (e.g. in 'movements', 'tasks', etc.)
  await Promise.all([
    updateDenormalizedName("treasury", "projectId", projectId, "projectName", newName),
    updateDenormalizedName("certifications", "projectId", projectId, "projectName", newName)
  ]);

  console.log(`Propagated project name update for project ${projectId} to '${newName}'`);
});

/**
 * Triggered when a Supplier is updated.
 * Propagates the new supplier name to related collections if the name or alias changed.
 */
export const onSupplierUpdated = onDocumentUpdated("suppliers/{supplierId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Also check for alias changes
  const nameChanged = before.name !== after.name;
  const aliasChanged = before.alias !== after.alias;

  if (!nameChanged && !aliasChanged) return;

  const supplierId = event.params.supplierId;
  const newName = after.name;

  // For suppliers we might have denormalized names in treasury movements or similar
  await Promise.all([
    updateDenormalizedName("treasury", "supplierId", supplierId, "supplierName", newName),
  ]);

  console.log(`Propagated supplier name update for supplier ${supplierId} to '${newName}'`);
});

/**
 * Triggered when an Expense is created, updated, or deleted.
 * Adjusts the Project's remaining balance accordingly.
 * Handles currency conversion if the Expense currency differs from the Project currency.
 */
export const onExpenseWritten = onDocumentWritten("projects/{projectId}/expenses/{expenseId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const projectId = event.params.projectId;

  // Si no hay datos antes ni después, ignorar (no debería pasar)
  if (!beforeData && !afterData) return;

  const projectRef = admin.firestore().doc(`projects/${projectId}`);

  await admin.firestore().runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);
    if (!projectSnap.exists) {
      console.warn(`Project ${projectId} not found. Cannot update balance.`);
      return;
    }

    const project = projectSnap.data();
    const projectCurrency = project?.currency || 'ARS';

    // Helper: Normalize an expense amount to the project's currency
    const getNormalizedAmount = (amount: number, expCurrency: string, rate: number) => {
      if (expCurrency === projectCurrency) return amount;
      if (!rate || rate <= 0) return amount; // Fallback

      if (projectCurrency === 'USD' && expCurrency === 'ARS') {
        return amount / rate;
      }
      if (projectCurrency === 'ARS' && expCurrency === 'USD') {
        return amount * rate;
      }
      return amount;
    };

    let balanceDelta = 0;

    if (!beforeData && afterData) {
      // Create: Balance descents
      const amount = getNormalizedAmount(afterData.amount || 0, afterData.currency || 'ARS', afterData.exchangeRate || 1);
      balanceDelta = -amount;
    } else if (beforeData && !afterData) {
      // Delete: Balance goes up
      const amount = getNormalizedAmount(beforeData.amount || 0, beforeData.currency || 'ARS', beforeData.exchangeRate || 1);
      balanceDelta = amount;
    } else if (beforeData && afterData) {
      // Update: Calculate the difference
      const oldAmount = getNormalizedAmount(beforeData.amount || 0, beforeData.currency || 'ARS', beforeData.exchangeRate || 1);
      const newAmount = getNormalizedAmount(afterData.amount || 0, afterData.currency || 'ARS', afterData.exchangeRate || 1);

      // If amount went from 100 to 150 (difference +50), balance should go down by 50.
      // So delta is oldAmount - newAmount (100 - 150 = -50).
      balanceDelta = oldAmount - newAmount;
    }

    // Only update if there is a real change and the value is finite
    if (balanceDelta !== 0 && isFinite(balanceDelta)) {
      const currentBalance = project?.balance || 0;
      const newBalance = currentBalance + balanceDelta;

      transaction.update(projectRef, { balance: newBalance });
      console.log(`Updated balance for project ${projectId}: Delta ${balanceDelta} -> New Balance ${newBalance}`);
    }
  });
});

/**
 * Triggered when an Attendance record is created, updated, or deleted.
 * Calculates labor cost based on Employee's dailyWage and adjusts the Project's remaining balance.
 */
export const onAttendanceWritten = onDocumentWritten("attendances/{attendanceId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  // Si no hay datos, ignorar
  if (!beforeData && !afterData) return;

  // Determinar a qué proyecto afecta esto (puede cambiar de un proyecto a otro, aunque es raro)
  let oldProjectId = beforeData?.projectId;
  let newProjectId = afterData?.projectId;

  // Si no hay proyectos involucrados, ignorar (asistencia en oficina central u otro)
  if (!oldProjectId && !newProjectId) return;

  const employeeId = afterData?.employeeId || beforeData?.employeeId;
  if (!employeeId) return;

  await admin.firestore().runTransaction(async (transaction) => {
    // 1. Obtener el sueldo del empleado
    const employeeRef = admin.firestore().doc(`employees/${employeeId}`);
    const employeeSnap = await transaction.get(employeeRef);
    if (!employeeSnap.exists) {
      console.warn(`Employee ${employeeId} not found. Cannot calculate labor cost.`);
      return;
    }
    const employee = employeeSnap.data();
    const dailyWage = employee?.dailyWage || 0;

    if (dailyWage <= 0) return;

    // 2. Helper para procesar el impacto en un proyecto específico
    const processProjectImpact = async (projectId: string, isRemoval: boolean) => {
      const projectRef = admin.firestore().doc(`projects/${projectId}`);
      const projectSnap = await transaction.get(projectRef);

      if (!projectSnap.exists) {
        console.warn(`Project ${projectId} not found. Skipping balance deduction.`);
        return;
      }

      const project = projectSnap.data();
      const projectCurrency = project?.currency || 'ARS';

      // Default: Sueldos se asumen en ARS. Si la obra es en USD, necesitamos un exchange rate genérico.
      // Como no tenemos el exchange rate exacto del día en la función sin buscar más, 
      // y RRHH no especifica USD, haremos una sustracción directa (o requeriría mejoras en el modelo).
      // Aquí reduciremos directamente asumiendo ARS = ARS, o si el usuario quiere, podríamos usar un conversor.
      let costToApply = dailyWage;
      if (projectCurrency === 'USD') {
        // Omitimos conversión automática por seguridad financiera, a menos que el user lo solicite.
        // Lo ideal sería guardar el exchangeRate de la PayrollWeek en la Attendance.
        console.warn(`Project ${projectId} is in USD. Labor cost direct subtraction might be incorrect without a rate.`);
      }

      let balanceDelta = isRemoval ? costToApply : -costToApply;

      if (balanceDelta !== 0) {
        const currentBalance = project?.balance || 0;
        const newBalance = currentBalance + balanceDelta;
        transaction.update(projectRef, { balance: newBalance });
        console.log(`Labor cost: Updated balance for project ${projectId}: Delta ${balanceDelta} -> New Balance ${newBalance}`);
      }
    };

    // 3. Evaluar la lógica de estados
    const wasPresentPrevious = beforeData?.status === 'presente' && !!beforeData?.projectId;
    const isPresentNow = afterData?.status === 'presente' && !!afterData?.projectId;

    if (!wasPresentPrevious && isPresentNow) {
      // Create/Update: Employee is now present at a project
      await processProjectImpact(afterData.projectId, false); // Deduct balance
    } else if (wasPresentPrevious && !isPresentNow) {
      // Delete/Update: Employee is no longer present, or changed project
      await processProjectImpact(beforeData.projectId, true); // Revert balance
    } else if (wasPresentPrevious && isPresentNow) {
      // User was present, and is still present. Did the project change?
      if (beforeData.projectId !== afterData.projectId) {
        // Revert old project
        await processProjectImpact(beforeData.projectId, true);
        // Deduct new project
        await processProjectImpact(afterData.projectId, false);
      }
      // If project is the same, no financial change occurs.
    }
  });
});

/**
 * Scheduled Cloud Function: Runs daily at midnight (America/Argentina/Buenos_Aires).
 * Checks for active recurring expenses that are due today or overdue.
 * For each, it creates a new pending Expense document and advances the nextDueDate 
 * of the recurring expense according to its period.
 */
export const processRecurringExpenses = onSchedule({
  schedule: "0 0 * * *", // Every day at 00:00
  timeZone: "America/Argentina/Buenos_Aires",
}, async (event) => {
  const db = admin.firestore();

  // 1. Get today's date in YYYY-MM-DD format (Argentina time)
  // To avoid complex timezone issues in the simple script, we use the local date string 
  // adjusted to the timezone, or simply UTC depending on how the frontend saves it.
  // Assuming frontend saves YYYY-MM-DD in local time:
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const todayStr = `${year}-${month}-${day}`;

  console.log(`[Recurring Expenses] Starting cron job for date: ${todayStr}`);

  // 2. Query active recurring expenses due today or strictly before today
  const recurringRef = db.collection('recurringExpenses');
  const snapshot = await recurringRef
    .where('status', '==', 'Activo')
    .where('nextDueDate', '<=', todayStr)
    .get();

  if (snapshot.empty) {
    console.log('[Recurring Expenses] No recurring expenses due today.');
    return;
  }

  // 3. Process each one in a batch
  const batch = db.batch();
  let processedCount = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();

    // a) Create the actual Expense document
    // NOTE: Projects might not be explicitly linked to recurring expenses unless added to the model.
    // We assume these form part of overhead/general treasury expenses unless specified otherwise.
    const expenseRef = db.collection(`projects/general-overhead/expenses`).doc();
    const newExpense = {
      projectId: 'general-overhead', // Assuming a fallback, or we can use a generic ID
      date: todayStr,
      supplierId: 'recurring-system', // Placeholder or add to model if needed
      categoryId: data.category || 'Gastos Generales',
      documentType: 'Factura',
      amount: data.amount,
      currency: data.currency || 'ARS',
      exchangeRate: 1,
      description: `[Autogenerado] ${data.description} (Vencimiento: ${data.nextDueDate})`,
      status: 'Pendiente de Pago',
      paymentSource: data.paymentSource || 'Tesorería',
    };
    batch.set(expenseRef, newExpense);

    // b) Calculate the next due date based on the period
    const currentDueDate = new Date(`${data.nextDueDate}T12:00:00Z`); // Noon to avoid timezone offset issues locally
    const period = data.period;
    const nextDate = new Date(currentDueDate);

    if (period === 'Diario') nextDate.setDate(nextDate.getDate() + 1);
    else if (period === 'Semanal') nextDate.setDate(nextDate.getDate() + 7);
    else if (period === 'Mensual') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (period === 'Bimestral') nextDate.setMonth(nextDate.getMonth() + 2);
    else if (period === 'Trimestral') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (period === 'Semestral') nextDate.setMonth(nextDate.getMonth() + 6);
    else if (period === 'Anual') nextDate.setFullYear(nextDate.getFullYear() + 1);
    else {
      // Fallback
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextDay = String(nextDate.getDate()).padStart(2, '0');
    const nextDueDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

    // c) Update the recurring expense document
    batch.update(doc.ref, { nextDueDate: nextDueDateStr });

    console.log(`[Recurring Expenses] Processed "${data.description}". New Due Date: ${nextDueDateStr}`);
    processedCount++;
  });

  // 4. Commit the batch
  await batch.commit();
  console.log(`[Recurring Expenses] Successfully processed ${processedCount} expenses.`);
});

/**
 * Scheduled Cloud Function: Runs on the 1st day of every month at 01:00 AM (America/Argentina/Buenos_Aires).
 * Calculates tool depreciation (Amortization) based on purchasePrice and lifespanMonths.
 * Generates an internal expense for the project currently holding the tool, or general overhead.
 */
export const processToolDepreciation = onSchedule({
  schedule: "0 1 1 * *", // 1st day of the month at 01:00
  timeZone: "America/Argentina/Buenos_Aires",
}, async (event) => {
  const db = admin.firestore();

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const todayStr = `${year}-${month}-${day}`;

  console.log(`[Tool Depreciation] Starting cron job for date: ${todayStr}`);

  // Query all tools
  const toolsRef = db.collection('inventory');
  const snapshot = await toolsRef.where('type', '==', 'TOOL').get();

  if (snapshot.empty) {
    console.log('[Tool Depreciation] No tools found.');
    return;
  }

  const batch = db.batch();
  let processedCount = 0;

  snapshot.forEach((doc) => {
    const tool = doc.data();

    // Check if tool is eligible for depreciation
    if (!tool.purchasePrice || tool.purchasePrice <= 0 || !tool.lifespanMonths || tool.lifespanMonths <= 0) {
      return; // Skip tools without price or lifespan
    }

    if (tool.status === 'LOST' || tool.status === 'STOLEN' || tool.status === 'DISCARDED') {
      // Once discarded, we stop amortizing it. (Ideally, the remaining value should be dumped, but keeping it simple).
      return;
    }

    // Calculate monthly quota
    // We assume straight-line depreciation without residual value for simplicity
    const originalLifespan = tool.originalLifespanMonths || tool.lifespanMonths;
    // If original is missing, we use current. To be accurate over time, 
    // the system should store original lifespan. We'll fallback safely.
    // For now, if we divide current price by current lifespan it's practically the same
    // if we haven't mutated purchasePrice.
    const monthlyDepreciation = tool.purchasePrice / (tool.originalLifespanMonths ? tool.originalLifespanMonths : tool.lifespanMonths);

    // Determine who pays for this month
    let targetProjectId = 'general-overhead';
    let targetProjectName = 'Gastos Generales (Pañol)';

    if (tool.currentHolder && tool.currentHolder.type === 'PROJECT') {
      targetProjectId = tool.currentHolder.id;
      targetProjectName = tool.currentHolder.name;
    }

    // Create the "Virtual" Expense for the project
    const expenseRef = db.collection(`projects/${targetProjectId}/expenses`).doc();
    const newExpense = {
      projectId: targetProjectId,
      date: todayStr,
      supplierId: 'internal-amortization', // Virtual supplier
      categoryId: 'Amortización de Equipos',
      documentType: 'Factura', // Or 'Internal Note'
      amount: monthlyDepreciation,
      currency: tool.currency || 'ARS',
      exchangeRate: 1,
      description: `[Amortización] ${tool.name} - Cuota 1 de ${tool.lifespanMonths} meses restantes.`,
      status: 'Pagado', // It's an internal sunk cost, no need to actually "pay" it from treasury again
      paymentSource: 'Amortización Virtual',
    };
    batch.set(expenseRef, newExpense);

    // Update the tool's remaining lifespan
    const newLifespan = tool.lifespanMonths - 1;
    let updatePayload: any = { lifespanMonths: newLifespan };

    // Safety net to remember original lifespan if not set
    if (!tool.originalLifespanMonths) {
      updatePayload.originalLifespanMonths = tool.lifespanMonths;
    }

    batch.update(doc.ref, updatePayload);

    console.log(`[Tool Depreciation] Processed "${tool.name}". Charged ${monthlyDepreciation} to ${targetProjectName}. Remaining months: ${newLifespan}`);
    processedCount++;
  });

  // Commit all changes
  if (processedCount > 0) {
    await batch.commit();
    console.log(`[Tool Depreciation] Successfully processed ${processedCount} tools.`);
  } else {
    console.log(`[Tool Depreciation] No tools were eligible for depreciation this month.`);
  }
});

