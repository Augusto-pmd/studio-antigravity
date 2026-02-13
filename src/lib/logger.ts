import { addDoc, collection } from 'firebase/firestore';

export type ActionLog = {
    id?: string;
    userId: string;
    userName: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'APPROVE' | 'REJECT';
    entity: 'EXPENSE' | 'PROJECT' | 'EMPLOYEE' | 'DOCUMENT' | 'TASK' | 'FUND_REQUEST';
    entityId?: string;
    details: string;
    metadata?: any;
    timestamp: string;
};

export const logAction = async (
    db: any,
    user: { uid: string; displayName?: string | null; email?: string | null },
    action: ActionLog['action'],
    entity: ActionLog['entity'],
    details: string,
    metadata: any = {}
) => {
    if (!db || !user) return;

    try {
        await addDoc(collection(db, 'action_logs'), {
            userId: user.uid,
            userName: user.displayName || user.email || 'Unknown',
            timestamp: new Date().toISOString(),
            action,
            entity,
            details,
            metadata
        });
    } catch (error) {
        console.error("Failed to log action:", error);
    }
};
