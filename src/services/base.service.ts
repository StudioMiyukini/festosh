/** Standard result type for all service operations */
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError };

/** Application-level error for service operations */
export class ServiceError extends Error {
  code: string;

  constructor(message: string, code = 'APP_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }

  static fromMessage(message: string, code = 'APP_ERROR'): ServiceError {
    return new ServiceError(message, code);
  }
}
