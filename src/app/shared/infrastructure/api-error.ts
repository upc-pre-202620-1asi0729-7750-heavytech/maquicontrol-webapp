import { HttpErrorResponse } from '@angular/common/http';

/** Problem details returned by the MaquiControl Platform when a request fails. */
interface ProblemDetails {
  detail?: string;
  details?: string;
}

/** Builds a readable error from a failed request, keeping the backend's explanation when it sends one. */
export function toApiError(error: HttpErrorResponse, operation: string): Error {
  if (error.status === 0) {
    return new Error(`${operation}: Unable to connect to the server`);
  }

  const problem = (error.error ?? {}) as ProblemDetails;
  const reason = problem.details || problem.detail || (error.status === 404 ? 'Resource not found' : error.status);

  return new Error(`${operation}: ${reason}`);
}
