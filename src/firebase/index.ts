// This file re-exports the mock Firebase provider and hooks
// to ensure the application can render without a real Firebase backend.
export {
    FirebaseProvider,
    useFirebase,
    useFirebaseApp,
    useAuth,
    useFirestore,
    useUser,
    useCollection,
    useDoc,
} from './provider';
