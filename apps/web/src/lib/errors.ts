import { isAxiosError } from 'axios';

/**
 * Extracts a human-readable message from any thrown value.
 * NestJS returns { message: string | string[] } — validation errors arrive as arrays.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(message) && message.length > 0) return String(message[0]);
    if (typeof message === 'string' && message.trim()) return message;
    if (!error.response) return 'Unable to reach the server. Check your connection.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
