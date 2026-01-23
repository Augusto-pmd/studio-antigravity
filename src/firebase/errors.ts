'use client';

/**
 * Defines the context for a Firestore security rule denial.
 * This information is used to construct a detailed error message for developers.
 */
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

/**
 * A custom error class to signal a Firestore permission issue.
 * It's designed to be thrown in the Next.js development overlay with rich,
 * actionable context for debugging security rules.
 */
export class FirestorePermissionError extends Error {
  // The context is public to allow for easy access in error listeners.
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    // A simplified message for the main error display.
    const message = `FirestoreError: Missing or insufficient permissions.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // A more detailed message is constructed and logged in the listener component,
    // not directly in the console here, to avoid duplicate logging.
  }
}
