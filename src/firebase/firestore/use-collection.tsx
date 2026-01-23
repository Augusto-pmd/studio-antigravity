import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, getDocs, type Query, type DocumentData } from 'firebase/firestore';

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
      (err) => {
        console.error(err);
        setIsLoading(false);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [q ? (q as any)._query.canonicalId : 'null']);

  return { data, isLoading, error };
}
