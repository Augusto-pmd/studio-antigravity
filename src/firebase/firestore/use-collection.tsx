'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, type Query, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T extends DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setData([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<T>) => {
          // The converter should handle the data typing, but we explicitly
          // spread and add the ID to ensure it's always present.
          return { ...doc.data(), id: doc.id }
        });
        setData(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        // Emitting the contextual error instead of just logging it.
        const permissionError = new FirestorePermissionError({
            path: '(unknown collection)',
            operation: 'list',
        }, err);
        errorEmitter.emit('permission-error', permissionError);

        setIsLoading(false);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return { data, isLoading, error };
}
