'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore, type DocumentData, type DocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
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
      if (!user) {
        setIsLoading(false);
        setUserProfile(null);
      }
      // Don't set loading false here if user exists; wait for profile
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!firestore || !user) {
      if (!user && !isLoading) return; // Already handled
      // If we have no user, we are done loading (handled above usually, but safety check)
      return;
    }

    // Set loading true again just in case (though it should be true from initial state if auth detected user)
    // Actually, if we came from 'no user' to 'user', loading might be false? No, auth state change triggers.

    const userDocRef = doc(firestore, `users/${user.uid}`).withConverter(userProfileConverter);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      } else {
        setUserProfile(null);
      }
      setIsLoading(false); // <--- Set loading false ONLY after profile check
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setIsLoading(false); // Stop loading on error
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return { user, userProfile, isLoading };
}
