import { useEffect, useRef, useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import { curatedPackProvider } from '../assets/curatedPack';
import type { GratitudeAsset } from '../assets/contracts';
import { useAIStatus } from './useAIStatus';
import { requestAI } from '../vision/aiClient';

const modeHelp = {
  image: {
    description: 'Create a new image. Preview it before adding it to the board.',
    example: 'A peaceful Japanese garden at sunrise, warm natural light, inspiring photography',
    action: 'Create image preview',
  },
  quote: {
    description: 'Write a short affirmation, then add it as editable text.',
    example: 'An encouraging affirmation about building confidence, in a warm and grounded voice',
    action: 'Write affirmation',
  },
  board: {
    description:
      'Turn your goals into an editable composition. Review it before replacing the current board.',
    example:
      'This year I want to travel to Japan, develop my career, and build healthy daily habits',
    action: 'Plan my board',
  },
  search: {
    description: 'Find matching graphics in the curated library using a description of your goal.',
    example: 'Symbols for travel, curiosity, and a new career chapter',
    action: 'Find matching elements',
  },
  edit: {
    description:
      'Select one image, describe the change, then review the preview before applying. Your original is preserved.',
    example: 'Give this image warmer sunlight while keeping the subject and composition',
    action: 'Preview image edit',
  },
  video: {
    description:
      'Animate one selected image as a short MP4. Requires enabled paid video generation.',
    example: 'Slow camera movement with a gentle breeze and natural lighting',
    action: 'Preview animation',
  },
};
type Result = {
  image?: string;
  text?: string;
  title?: string;
  goals?: string[];
  keywords?: string[];
  video?: string;
};
type EditSource = ReturnType<EditorAdapter['editingSource']>;
export function AIPanel({ adapter }: { adapter: EditorAdapter }) {
  const [prompt, setPrompt] = useState(
      'A peaceful Japanese garden at sunrise, warm natural light, inspiring photography',
    ),
    [mode, setMode] = useState<'image' | 'quote' | 'board' | 'search' | 'edit' | 'video'>('image');
  const [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [suggestions, setSuggestions] = useState<GratitudeAsset[]>([]);
  const ai = useAIStatus(adapter.ownerWindow);
  const configured = ai.status?.configured;
  const videoConfigured = ai.status?.videoConfigured;
  const help = modeHelp[mode];
  const selected = adapter.history.document.items.filter((item) =>
    adapter.selectedIds.includes(item.id),
  );
  const needsImage = mode === 'edit' || mode === 'video';
  const validSelection =
    selected.length === 1 && selected[0].kind === 'asset' && !selected[0].locked;
  const [masked, setMasked] = useState(false),
    [region, setRegion] = useState({ x: 25, y: 25, width: 50, height: 50 });
  const source = useRef<EditSource | null>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => controller.current?.abort();
  }, [adapter]);
  const generate = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    setSuggestions([]);
    source.current = null;
    controller.current = new adapter.ownerWindow.AbortController();
    try {
      let body: Record<string, unknown> = { prompt, mode };
      if (mode === 'edit' || mode === 'video') {
        const current = adapter.editingSource();
        source.current = current;
        body = { prompt, image: current.image };
        if (masked && mode === 'edit') {
          const canvas = adapter.ownerWindow.document.createElement('canvas');
          canvas.width = current.width;
          canvas.height = current.height;
          const context = canvas.getContext('2d')!;
          context.fillStyle = '#000';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#fff';
          context.fillRect(
            (region.x / 100) * canvas.width,
            (region.y / 100) * canvas.height,
            (Math.min(region.width, 100 - region.x) / 100) * canvas.width,
            (Math.min(region.height, 100 - region.y) / 100) * canvas.height,
          );
          body.mask = canvas.toDataURL('image/png');
        }
      }
      const value = await requestAI(
        adapter.ownerWindow,
        mode === 'edit' ? '/api/ai/edit' : mode === 'video' ? '/api/ai/video' : '/api/ai/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.current.signal,
        },
      );
      setResult(value);
      if (value.keywords) {
        const found = await Promise.all(
          value.keywords.map((q: string) =>
            curatedPackProvider.search({ search: q, limit: 12 }, adapter.ownerWindow),
          ),
        );
        setSuggestions(
          [
            ...new Map(
              found.flatMap((result) => result.items).map((asset) => [asset.id, asset]),
            ).values(),
          ].slice(0, 24),
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        setError('Generation cancelled. Your board is unchanged.');
      else
        setError(
          error instanceof Error
            ? error.message
            : 'Generation failed. Try again with a simpler description.',
        );
    } finally {
      setBusy(false);
    }
  };
  const insert = async (background = false) => {
    if (!result) return;
    setBusy(true);
    setError('');
    try {
      if (result.image && source.current)
        await adapter.applyEditedImage(source.current.id, source.current.revision, result.image);
      else if (result.image) await adapter.insertGeneratedImage(result.image, prompt, background);
      else if (result.text)
        adapter.createTextPreset({
          id: 'ai-quote',
          sample: result.text,
          label: 'AI affirmation',
          category: 'reflection',
          fontFamily: 'assistant',
          fontSize: 34,
          color: '#49375e',
        });
      else if (result.title && result.goals) await adapter.composeBoard(result.title, result.goals);
      setConfirm(false);
      setResult(null);
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ai-panel">
      <h4>AI studio</h4>
      <p>
        Generate images, affirmations, or editable boards; edit a selected image or search the
        curated library. Requests use your configured AI service.
      </p>
      <div
        className={`ai-status${configured && !ai.error ? ' ai-status--ready' : ''}`}
        role="status"
      >
        {ai.checking
          ? 'Checking AI connection…'
          : ai.error ||
            (configured
              ? 'AI is ready. Generate a preview, review it, then apply.'
              : 'AI is not set up yet. Configure your server credentials and start npm run ai:server.')}
        <button
          className="panel-secondary-action"
          disabled={ai.checking || busy}
          onClick={() => void ai.refresh()}
        >
          Check connection
        </button>
      </div>
      {!configured && !ai.checking && (
        <details className="ai-setup">
          <summary>How to get AI working</summary>
          <ol>
            <li>Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env.</li>
            <li>Run npm run ai:server in a separate terminal and keep it running.</li>
            <li>Choose Check connection. Background removal uses a separate rembg service.</li>
          </ol>
        </details>
      )}
      <label>
        What would you like to do?
        <select
          className="vs-select"
          aria-label="AI generation type"
          disabled={busy}
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as typeof mode);
            setPrompt(modeHelp[event.target.value as typeof mode].example);
            setResult(null);
            setError('');
            setConfirm(false);
            setSuggestions([]);
            source.current = null;
          }}
        >
          <option value="image">Image</option>
          <option value="quote">Affirmation</option>
          <option value="board">Editable board</option>
          <option value="search">Search curated assets</option>
          <option value="edit">Edit selected image</option>
          <option value="video" disabled={!videoConfigured}>
            Animate selected image (paid)
          </option>
        </select>
      </label>
      <p className="ai-tool-help" id="ai-mode-help">
        {help.description}
      </p>
      {needsImage && (
        <p className="ai-status" role="status">
          {validSelection
            ? `Selected image: ${selected[0].asset?.title || 'Image'}`
            : 'Select one unlocked image on the board to use this tool.'}
        </p>
      )}
      {mode === 'edit' && (
        <>
          <p>Describe the desired change. Apply preserves the original source and can be undone.</p>
          <label>
            Edit a region
            <input
              aria-label="Edit a region"
              type="checkbox"
              checked={masked}
              onChange={(event) => setMasked(event.target.checked)}
            />
          </label>
          {masked && (
            <>
              {Object.keys(region).map((key) => (
                <label key={key}>
                  Region {key}
                  <input
                    aria-label={`Region ${key}`}
                    type="number"
                    min={key === 'width' || key === 'height' ? 1 : 0}
                    max={99}
                    value={region[key as keyof typeof region]}
                    onChange={(event) =>
                      setRegion({
                        ...region,
                        [key]: Math.max(
                          key === 'width' || key === 'height' ? 1 : 0,
                          Math.min(99, Number(event.target.value)),
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <p>The region uses percentages of the source image.</p>
            </>
          )}
        </>
      )}
      <textarea
        className="vs-textarea"
        aria-label="AI prompt"
        aria-describedby="ai-mode-help"
        placeholder={help.example}
        maxLength={2000}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <button
        className="panel-secondary-action"
        disabled={busy}
        onClick={() => setPrompt(help.example)}
      >
        Use example prompt
      </button>
      <button
        className="panel-action"
        aria-label="Generate"
        title={help.action}
        data-tip={help.action}
        disabled={
          busy || !prompt.trim() || ai.checking || !configured || (needsImage && !validSelection)
        }
        onClick={() => void generate()}
      >
        {busy ? 'Working…' : help.action}
      </button>
      {busy && <button onClick={() => controller.current?.abort()}>Cancel generation</button>}
      {error && (
        <div className="panel-inline-error" role="alert">
          <p>{error}</p>
          <p>
            Review the connection and prompt, then try again. Existing board items are preserved.
          </p>
        </div>
      )}
      {result && (
        <div className="ai-result">
          <p className="ai-tool-help">Preview only. Use the button below to apply this result.</p>
          {result.image && <img src={result.image} alt="Generated preview" />}
          {result.video && (
            <>
              <video
                src={result.video}
                controls
                aria-label="Generated video preview"
                style={{ width: '100%' }}
              />
              <a href={result.video} download="vision-board-animation.mp4">
                Download MP4
              </a>
            </>
          )}
          {result.text && <p>{result.text}</p>}
          {result.goals && (
            <>
              <h4>{result.title}</h4>
              <ul>
                {result.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </>
          )}
          {result.video ? null : result.keywords ? (
            <>
              <p>
                {suggestions.length
                  ? 'Suggested curated assets'
                  : 'No matching assets. Try a different description.'}
              </p>
              <div className="shape-grid">
                {suggestions.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() =>
                      void adapter.insertAsset(asset).catch((error) => setError(String(error)))
                    }
                  >
                    <img src={asset.previewUrl} alt="" width={64} height={64} />
                    {asset.title}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="ai-result__actions">
              <button
                className="panel-action"
                disabled={busy}
                onClick={() => {
                  if (result.goals && adapter.history.document.items.length) setConfirm(true);
                  else void insert();
                }}
              >
                {source.current ? 'Apply image edit' : 'Add to board'}
              </button>
              {result.image && !source.current && (
                <button
                  className="panel-secondary-action"
                  disabled={busy}
                  onClick={() => void insert(true)}
                >
                  Use as background
                </button>
              )}
            </div>
          )}
          {confirm && (
            <>
              <p>Replace the current composition? You can undo this.</p>
              <button onClick={() => void insert()}>Replace composition</button>
              <button onClick={() => setConfirm(false)}>Keep current board</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
