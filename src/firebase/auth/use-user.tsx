'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { Auth } from 'firebase/auth';

export function useUser(auth: Auth | null, firestore: Firestore | null) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!firestore || !user) {
      setUserProfile(null);
      return;
    }

    const userDocRef = doc(firestore, `users/${user.uid}`);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return { user, userProfile, isLoading };
}
