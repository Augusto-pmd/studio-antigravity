'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;
  serverError: Error | null;

  constructor(context: SecurityRuleContext, serverError: Error | null = null) {
    const message = `FirestoreError: Missing or insufficient permissions. Request denied by Firestore Security Rules.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    this.serverError = serverError;
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
