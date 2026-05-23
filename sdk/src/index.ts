// sdk/src/index.ts
// Public SDK API

export { InferenceLogger, InferenceTracker } from './core/InferenceLogger';
export type {
  SDKConfig,
  InferenceLogEntry,
  LogMiddleware,
  Provider,
  RequestStatus,
} from './core/InferenceLogger';

// Convenience middleware
export const filterSensitiveFields = (): import('./core/InferenceLogger').LogMiddleware => {
  return (entry) => {
    // Remove metadata fields that might contain sensitive data
    const { metadata, ...rest } = entry;
    return rest;
  };
};

export const addEnvironmentTag = (env: string): import('./core/InferenceLogger').LogMiddleware => {
  return (entry) => ({
    ...entry,
    metadata: { ...entry.metadata, environment: env },
  });
};
