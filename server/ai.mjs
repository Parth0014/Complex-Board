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
                  : `You are a vision-board art director. Return only valid JSON: {"title":string,"goals":[string],"imagePrompts":[string],"palette":{"background":string,"text":string,"card":string}}. Create 4 to 6 short personal goal captions. For each goal give one detailed image prompt in the same order: concrete subject, setting, lighting and a coherent visual style matching the user's wishes. Each image must represent its goal uniquely, with no text or watermarks. Use consistent art direction across images. Palette values must be six-digit hex colors with readable text contrast. The current year is ${new Date().getUTCFullYear()}; use it for "this year". Prefer a timeless title unless requested. No media URLs or code.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: mode === 'board' ? 1800 : 500,
        ...(mode === 'board' || mode === 'search'
          ? {
              temperature: 0.2,
              response_format: {
                type: 'json_schema',
                json_schema:
                  mode === 'board'
                    ? {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          goals: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 4,
                            maxItems: 6,
                          },
                          imagePrompts: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 4,
                            maxItems: 6,
                          },
                          palette: {
                            type: 'object',
                            properties: {
                              background: { type: 'string' },
                              text: { type: 'string' },
                              card: { type: 'string' },
                            },
                            required: ['background', 'text', 'card'],
                            additionalProperties: false,
                          },
                        },
                        required: ['title', 'goals', 'imagePrompts', 'palette'],
                        additionalProperties: false,
                      }
                    : {
                        type: 'object',
                        properties: {
                          keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 3,
                            maxItems: 6,
                          },
                        },
                        required: ['keywords'],
                        additionalProperties: false,
                      },
              },
            }
          : {}),
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
  if (mode === 'quote') {
    if (typeof text !== 'string') throw new Error('Invalid AI response.');
    return { text: text.slice(0, 1000), model };
  }
  let board;
  try {
    if (text && typeof text === 'object' && !Array.isArray(text)) board = text;
    else if (typeof text === 'string') {
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '');
      try {
        board = JSON.parse(cleaned);
      } catch {
        // Some providers surround otherwise valid JSON with an explanation.
        board = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
      }
    } else throw new Error('Missing structured response.');
    if (!board || typeof board !== 'object' || Array.isArray(board))
      throw new Error('Invalid structured response.');
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
    !board.title.trim() ||
    !Array.isArray(board.goals) ||
    board.goals.length < 1 ||
    board.goals.length > 12 ||
    !board.goals.every((goal) => typeof goal === 'string' && goal.trim() && goal.length < 500)
  )
    throw new Error('The AI returned an invalid board. Please regenerate.');
  return {
    title: board.title.trim().slice(0, 80),
    goals: board.goals.map((goal) => goal.trim()),
    imagePrompts: board.goals.map((goal, index) => {
      const detail = board.imagePrompts?.[index];
      return typeof detail === 'string' && detail.trim()
        ? detail.trim().slice(0, 1800)
        : `Inspiring vision-board photography representing ${goal}. Natural lighting, harmonious composition, no text or watermarks.`;
    }),
    palette: Object.fromEntries(
      ['background', 'text', 'card'].map((key) => [
        key,
        /^#[0-9a-f]{6}$/i.test(board.palette?.[key] || '')
          ? board.palette[key]
          : { background: '#f4effb', text: '#49375e', card: '#ffffff' }[key],
      ]),
    ),
    model,
  };
}
