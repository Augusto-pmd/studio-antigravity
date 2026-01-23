'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { UserProfile, Role } from '@/lib/types';
import type { Auth } from 'firebase/auth';

const userProfileConverter = {
    toFirestore(profile: UserProfile): DocumentData {
        const { id, ...data } = profile;
        return data;
    },
    fromFirestore(
        snapshot: DocumentSnapshot,
        options: SnapshotOptions
    ): UserProfile {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            role: data.role as Role,
            fullName: data.fullName,
            email: data.email,
            photoURL: data.photoURL,
        };
    }
};

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

    const userDocRef = doc(firestore, `users/${user.uid}`).withConverter(userProfileConverter);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return { user, userProfile, isLoading };
}
