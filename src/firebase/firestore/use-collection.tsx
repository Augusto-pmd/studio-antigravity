import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, getDocs, type Query, type DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T extends DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(data);
        setIsLoading(false);
        setError(null);
      },
      async (err) => {
        setIsLoading(false);
        setError(err);
        const permissionError = new FirestorePermissionError({
          path: (q as any)._query.path.segments.join('/'),
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [q ? (q as any)._query.canonicalId : 'null']);

  return { data, isLoading, error };
}
