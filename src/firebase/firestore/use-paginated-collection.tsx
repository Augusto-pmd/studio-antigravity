'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    onSnapshot,
    type Query,
    type DocumentData,
    type QueryDocumentSnapshot,
    limit,
    startAfter,
    query,
    getDocs
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface PaginatedOptions {
    pageSize?: number;
}

export function usePaginatedCollection<T extends DocumentData>(baseQuery: Query<T> | null, options?: PaginatedOptions) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Keep track of the last document snapshot for pagination
    const lastDocRef = useRef<QueryDocumentSnapshot<T> | null>(null);

    // We use a ref for the baseQuery stringification to detect if the query itself changed vs just re-rendering
    const queryRefString = useRef<string | null>(null);

    const pageSize = options?.pageSize || 20;

    const loadData = useCallback(() => {
        if (!baseQuery) {
            setData([]);
            setIsLoading(false);
            setHasMore(false);
            return () => { };
        }

        setIsLoading(true);
        setError(null);

        // Initial query: base limit
        const q = query(baseQuery, limit(pageSize));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const newData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;

                setData(newData);
                setHasMore(snapshot.docs.length === pageSize);
                setIsLoading(false);
            },
            (err) => {
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: '(unknown collection)',
                        operation: 'list',
                    }, err);
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.error("Firestore paginated query failed:", err);
                }
                setIsLoading(false);
                setError(err);
                setHasMore(false);
            }
        );

        return unsubscribe;
    }, [baseQuery, pageSize]);

    useEffect(() => {
        // Simple stringification might not work for complex Firestore Query objects depending on the SDK version, 
        // but given baseQuery usually changes on dependency updates in `useMemo`, we'll rely on the dependency array.
        const unsubscribe = loadData();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [loadData]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore || !lastDocRef.current || !baseQuery) return;

        setIsLoadingMore(true);

        try {
            const nextQuery = query(
                baseQuery,
                startAfter(lastDocRef.current),
                limit(pageSize)
            );

            // To prevent creating multiple separate snapshot listeners that might desynchronize, 
            // the loadMore performs a one-time fetch and concatenates to the list.
            const snapshot = await getDocs(nextQuery);

            const nextData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;

            setData(prev => {
                // To avoid duplicate IDs if a live update came in right before getDocs:
                const existingIds = new Set(prev.map(p => p.id));
                const uniqueNextData = nextData.filter(d => !existingIds.has(d.id));
                return [...prev, ...uniqueNextData];
            });

            setHasMore(snapshot.docs.length === pageSize);
        } catch (err: any) {
            console.error("Error loading more documents:", err);
            setError(err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [baseQuery, hasMore, isLoadingMore, pageSize]);

    // Force refresh
    const refresh = useCallback(() => {
        loadData();
    }, [loadData]);

    return {
        data,
        isLoading,
        error,
        hasMore,
        loadMore,
        isLoadingMore,
        refresh
    };
}
