import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase'; // Adjust import based on your firebase config location
import { ProjectPhase, ProjectUpdate } from '@/lib/types';

const PHASES_COLLECTION = 'project_phases';
const UPDATES_COLLECTION = 'project_updates';

// --- Phases ---

export async function getProjectPhases(projectId: string): Promise<ProjectPhase[]> {
    const q = query(
        collection(db, PHASES_COLLECTION),
        where('projectId', '==', projectId),
        orderBy('order', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectPhase));
}

export async function addProjectPhase(phase: Omit<ProjectPhase, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, PHASES_COLLECTION), phase);
    return docRef.id;
}

export async function updateProjectPhase(phaseId: string, data: Partial<ProjectPhase>): Promise<void> {
    const docRef = doc(db, PHASES_COLLECTION, phaseId);
    await updateDoc(docRef, data);
}

export async function deleteProjectPhase(phaseId: string): Promise<void> {
    await deleteDoc(doc(db, PHASES_COLLECTION, phaseId));
}


// --- Updates (Feed) ---

export async function getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    const q = query(
        collection(db, UPDATES_COLLECTION),
        where('projectId', '==', projectId),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectUpdate));
}

export async function addProjectUpdate(update: Omit<ProjectUpdate, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, UPDATES_COLLECTION), update);
    return docRef.id;
}

export async function deleteProjectUpdate(updateId: string): Promise<void> {
    await deleteDoc(doc(db, UPDATES_COLLECTION, updateId));
}

// --- Generic Entities for Stock ---
export async function getProjects() {
    const q = query(collection(db, 'projects'), where('status', '==', 'En Ejecución'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEmployees() {
    const q = query(collection(db, 'employees'), where('status', '==', 'Active'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- Generic Entities for Stock ---
// Note: These should ideally be in a dedicated 'projects.ts' or 'employees.ts' service, 
// but placing them here for now to support the Stock Module request without creating new files.

export async function getProjects() {
    const q = query(collection(db, 'projects'), where('status', '==', 'En Ejecución'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEmployees() {
    const q = query(collection(db, 'employees'), where('status', '==', 'Active'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
