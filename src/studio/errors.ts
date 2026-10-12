export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return message.replace(/^Error:\s*/i, '').trim() || fallback;
}
