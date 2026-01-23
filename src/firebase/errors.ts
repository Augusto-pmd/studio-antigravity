'use client';

/**
 * A custom error class to signal a Firestore permission issue.
 * This is a simplified version to ensure stability.
 */
export class FirestorePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirestorePermissionError';
  }
}
