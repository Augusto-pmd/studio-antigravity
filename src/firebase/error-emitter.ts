import TinyEmitter from 'tiny-typed-emitter';
import type { FirestorePermissionError } from './errors';

interface ErrorEvents {
  'permission-error': (error: FirestorePermissionError) => void;
}

// The type definitions for tiny-typed-emitter might not align with its runtime module format in this build environment.
// We cast to `any` to bypass the TypeScript error and use the default import as a constructor, which is what the runtime expects.
export const errorEmitter = new (TinyEmitter as any)();
