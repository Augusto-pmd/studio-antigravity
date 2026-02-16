import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    getDoc,
    orderBy,
    limit,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tool, Consumable, StockMovement, InventoryItem } from '@/lib/types';

const TOOLS_COLLECTION = 'inventory_tools';
const CONSUMABLES_COLLECTION = 'inventory_consumables';
const MOVEMENTS_COLLECTION = 'inventory_movements';

// --- FETCHING ---

export async function getTools(): Promise<Tool[]> {
    const q = query(collection(db, TOOLS_COLLECTION), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tool));
}

export async function getConsumables(): Promise<Consumable[]> {
    const q = query(collection(db, CONSUMABLES_COLLECTION), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consumable));
}

export async function getToolById(id: string): Promise<Tool | null> {
    const docRef = doc(db, TOOLS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Tool;
}

export async function getMovementsByItem(itemId: string, limitCount = 20): Promise<StockMovement[]> {
    const q = query(
        collection(db, MOVEMENTS_COLLECTION),
        where('itemId', '==', itemId),
        orderBy('date', 'desc'),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement));
}

// --- CREATION ---

export async function addTool(tool: Omit<Tool, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, TOOLS_COLLECTION), tool);
    return ref.id;
}

export async function addConsumable(item: Omit<Consumable, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, CONSUMABLES_COLLECTION), item);
    return ref.id;
}

// --- MOVEMENTS & LOGIC ---

/**
 * Executes a Stock Movement.
 * Handles the logic for updating the Record AND the Item status/holder/quantity.
 * Uses a Transaction to ensure consistency.
 */
export async function registerMovement(movement: Omit<StockMovement, 'id'>) {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Create Movement Reference
            const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));

            // 2. Determine Item Reference
            const collectionName = movement.itemType === 'TOOL' ? TOOLS_COLLECTION : CONSUMABLES_COLLECTION;
            const itemRef = doc(db, collectionName, movement.itemId);
            const itemSnap = await transaction.get(itemRef);

            if (!itemSnap.exists()) {
                throw new Error(`Item ${movement.itemId} does not exist`);
            }

            // 3. Update Logic based on Type
            if (movement.itemType === 'TOOL') {
                const tool = itemSnap.data() as Tool;
                const updateData: Partial<Tool> = {};

                // Status Transitions
                switch (movement.type) {
                    case 'CHECK_OUT':
                        if (tool.status !== 'AVAILABLE') throw new Error(`Tool is not AVAILABLE (Status: ${tool.status})`);
                        updateData.status = 'IN_USE';
                        updateData.currentHolder = movement.to ? { type: movement.to.type as any, id: movement.to.id, name: movement.to.name } : null;
                        break;

                    case 'CHECK_IN':
                        updateData.status = 'AVAILABLE';
                        updateData.currentHolder = null;
                        break;

                    case 'BROKEN':
                        updateData.status = 'BROKEN';
                        break;

                    case 'REPAIR_START':
                        updateData.status = 'IN_REPAIR';
                        break;

                    case 'REPAIR_END':
                        updateData.status = 'AVAILABLE';
                        break;

                    case 'LOSS':
                    case 'STOLEN':
                        updateData.status = movement.type; // 'LOSS' or 'STOLEN'
                        updateData.currentHolder = null;
                        break;
                }

                transaction.update(itemRef, updateData);

            } else {
                // CONSUMABLE
                const consumable = itemSnap.data() as Consumable;
                let newQty = consumable.quantity;

                if (['CHECK_OUT', 'LOSS', 'BROKEN', 'ADJUSTMENT'].includes(movement.type)) {
                    // Outgoing or Loss = Subtract? 
                    // NOTE: 'ADJUSTMENT' could be positive or negative. For now assuming explicit types.
                    // Actually, let's treat quantity as delta in the future, but for now:
                    // CHECK_OUT means it leaves stock -> Subtract
                    if (movement.type === 'ADJUSTMENT') {
                        // Needs manual direction? Let's assume quantity is absolute change or we handle "stock take".
                        // Simpler: If user enters negative quantity implies removal. 
                        // But usually quantity is unsigned. 
                        // Let's assume PURCHASE/CHECK_IN = Add, Others = Subtract
                    }
                }

                if (movement.type === 'PURCHASE' || movement.type === 'CHECK_IN') {
                    newQty += movement.quantity;
                } else {
                    newQty -= movement.quantity;
                }

                if (newQty < 0) throw new Error(`Insufficient stock for ${consumable.name}`);

                transaction.update(itemRef, { quantity: newQty });
            }

            // 4. Save Movement
            transaction.set(movementRef, { ...movement, id: movementRef.id });
        });

        return true;
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw e;
    }
}
