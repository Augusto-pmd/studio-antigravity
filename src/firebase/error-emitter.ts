import { TinyEmitter } from 'tiny-typed-emitter';
import type { FirestorePermissionError } from './errors';

interface ErrorEvents {
  'permission-error': (error: FirestorePermissionError) => void;
}

export const errorEmitter = new TinyEmitter<ErrorEvents>();
