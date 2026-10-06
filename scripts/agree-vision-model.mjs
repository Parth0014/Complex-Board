// Explicit opt-in only: never called automatically during analysis or server startup.
if (!process.argv.includes('--accept-license')) {
  console.error('Review the model license and policy before accepting:');
  console.error('https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE');
  console.error(
    'https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/USE_POLICY.md',
  );
  console.error(
    'Acceptance also declares that you are not domiciled in the EU and your company’s principal place of business is not in the EU.',
  );
  console.error(
    'If you agree and this declaration is accurate, run: npm run ai:vision:agree -- --accept-license',
  );
  process.exitCode = 1;
} else if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env first.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'agree' }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await response.json();
    if (!response.ok || !data.success) {
      const details = Array.isArray(data.errors)
        ? data.errors
            .map((error) => `${error.code}: ${String(error.message || '').slice(0, 2000)}`)
            .join('\n')
        : 'Check account permissions and model eligibility.';
      throw new Error(`Cloudflare returned ${response.status}.\n${details}`);
    }
    console.log('Vision model agreement submitted successfully. Retry Analyze reference.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Model setup failed.');
    process.exitCode = 1;
  }
}
