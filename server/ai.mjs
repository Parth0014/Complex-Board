export async function generateAI({ prompt, mode = 'image' }, env = process.env, fetcher = fetch) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000)
    throw new Error('Enter a prompt between 1 and 2000 characters.');
  if (!['image', 'quote', 'board', 'search'].includes(mode))
    throw new Error('Unsupported generation mode.');
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN)
    throw new Error(
      'AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on the server.',
    );
  const image = mode === 'image',
    model = image ? '@cf/black-forest-labs/flux-1-schnell' : '@cf/meta/llama-3.1-8b-instruct';
  const body = image
    ? { prompt, steps: 4 }
    : {
        messages: [
          {
            role: 'system',
            content:
              mode === 'search'
                ? 'Return only valid JSON: {"keywords":[string]}. Give 3 to 6 concise searchable vision-board asset tags for the user description. No URLs or code.'
                : mode === 'quote'
                  ? 'Write one short, encouraging vision-board affirmation. Return only the affirmation, no quotation marks.'
                  : 'Return only valid JSON: {"title":string,"goals":[string]}. Create 4 to 6 concise life goals from the user description. Do not include media URLs or code.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      };
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? 'Generation quota reached. Try again later.'
        : `AI provider returned ${response.status}. Check server configuration or try again.`,
    );
  const result = await response.json();
  if (!result.success) throw new Error('The AI provider could not complete this request.');
  if (image) {
    if (typeof result.result?.image !== 'string' || result.result.image.length > 16000000)
      throw new Error('Invalid generated image.');
    return { image: `data:image/jpeg;base64,${result.result.image}`, model };
  }
  const text = result.result?.response;
  if (typeof text !== 'string') throw new Error('Invalid AI response.');
  if (mode === 'quote') return { text: text.slice(0, 1000), model };
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '');
  let board;
  try {
    board = JSON.parse(cleaned);
  } catch {
    throw new Error('The AI returned an invalid board. Please regenerate.');
  }
  if (mode === 'search') {
    if (
      !Array.isArray(board.keywords) ||
      !board.keywords.length ||
      board.keywords.length > 8 ||
      !board.keywords.every((word) => typeof word === 'string' && word.length < 50)
    )
      throw new Error('Invalid search response.');
    return { keywords: board.keywords, model };
  }
  if (
    typeof board.title !== 'string' ||
    !Array.isArray(board.goals) ||
    board.goals.length < 1 ||
    board.goals.length > 12 ||
    !board.goals.every((goal) => typeof goal === 'string' && goal.length < 500)
  )
    throw new Error('The AI returned an invalid board. Please regenerate.');
  return { title: board.title.slice(0, 80), goals: board.goals, model };
}
