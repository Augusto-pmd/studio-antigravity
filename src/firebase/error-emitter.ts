// A dummy emitter that does nothing to prevent runtime errors.
// The original implementation caused a persistent "is not a constructor" TypeError.
export const errorEmitter = {
  on: () => {},
  off: () => {},
  emit: () => {},
};
