export async function requestAI(
  ownerWindow: Window & typeof globalThis,
  path: string,
  options?: RequestInit,
) {
  let response: Response;
  try {
    response = await ownerWindow.fetch(path, options);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error(
      'The AI server could not be reached. Start it with npm run ai:server, then check the connection again.',
      { cause: error },
    );
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      'The AI server returned an unreadable response. Restart it with npm run ai:server and try again.',
    );
  }
  if (!response.ok)
    throw new Error(value.error || `The request failed (${response.status}). Try again shortly.`);
  return value;
}
