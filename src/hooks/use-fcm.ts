'use client';

import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { getMessaging, isSupported } from 'firebase/messaging';

export function useFCMToken() {
    const { user, firestore, firebaseApp } = useFirebase();

    useEffect(() => {
        // Only run on the client, when user is logged in, and firestore/app are available
        if (typeof window === 'undefined' || !user || !firestore || !firebaseApp) return;

        const requestPermissionAndGetToken = async () => {
            try {
                const supported = await isSupported();
                if (!supported) {
                    console.log('Firebase Messaging is not supported in this browser.');
                    return;
                }

                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const messaging = getMessaging(firebaseApp);
                    const currentToken = await getToken(messaging, {
                        vapidKey: 'BP4rQjY3d3Y0uP9r22Ff01uP9r22Ff01uP9r22Ff01uP9r22Ff01uP9r22Ff01uP9r2', // Note: This needs to be the actual VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration
                    }).catch((err) => {
                        console.log('An error occurred while retrieving token. ', err);
                        return null;
                    });

                    if (currentToken) {
                        console.log('FCM Token retrieved successfully.');
                        // Save token to user profile
                        const userRef = doc(firestore, 'users', user.uid);
                        await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                } else {
                    console.log('Unable to get permission to notify.');
                }
            } catch (error) {
                console.error('Error getting FCM token or requesting permission:', error);
            }
        };

        requestPermissionAndGetToken();
    }, [user, firestore, firebaseApp]);
}
