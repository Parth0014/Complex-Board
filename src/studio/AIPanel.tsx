import { errorMessage } from './errors';
import { Skeleton } from './ui/Skeleton';
import { Button } from './ui/Button';
import { useEffect, useRef, useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import { requestAI } from '../vision/aiClient';
import { useAIStatus } from './useAIStatus';
import { startCreationDrag } from './canvasDrag';

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
};

/** Style preset for AI-generated affirmations. */
const AFFIRMATION_STYLE = {
  id: 'ai-quote',
  label: 'AI affirmation',
  category: 'reflection',
  fontFamily: 'assistant',
  fontSize: 34,
  color: '#49375e',
} as const;
type Result = {
  image?: string;
  text?: string;
};
export function AIPanel({
  adapter,
  onChooseImage,
}: {
  adapter: EditorAdapter;
  onChooseImage?: (image: string, prompt: string) => void;
}) {
  const { status: aiStatus, checking: aiChecking } = useAIStatus(adapter.ownerWindow);
  const [prompt, setPrompt] = useState(''),
    [mode, setMode] = useState<'image' | 'quote'>('image');
  const [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const help = modeHelp[mode];
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => controller.current?.abort();
  }, [adapter]);
  const generate = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    setProgress('Creating your preview…');
    controller.current = new adapter.ownerWindow.AbortController();
    try {
      const value = await requestAI(adapter.ownerWindow, '/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode }),
        signal: controller.current.signal,
      });
      setResult(value);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        setError('Generation cancelled. Your board is unchanged.');
      else setError('Generation is unavailable right now. Please try again later.');
    } finally {
      setBusy(false);
    }
  };
  const insert = async (background = false) => {
    if (!result) return;
    setBusy(true);
    setProgress('Adding your creation to the board…');
    setError('');
    try {
      if (result.image && onChooseImage) onChooseImage(result.image, prompt);
      else if (result.image) await adapter.insertGeneratedImage(result.image, prompt, background);
      else if (result.text)
        adapter.createTextPreset({
          ...AFFIRMATION_STYLE,
          sample: result.text,
        });
      setResult(null);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ai-panel">
      {aiChecking && <Skeleton label="Checking AI availability" />}
      {!aiChecking && !aiStatus?.configured && (
        <div className="gs-empty">
          <h3 className="gs-empty__title">Image generation is unavailable</h3>
          <p className="gs-empty__body">You can still use your uploaded photos and templates.</p>
        </div>
      )}
      {!aiChecking && aiStatus?.configured && (
        <>
          {!onChooseImage && (
            <label>
              Create
              <select
                className="vs-select"
                aria-label="AI generation type"
                disabled={busy}
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as typeof mode);
                  setPrompt('');
                  setResult(null);
                  setError('');
                }}
              >
                <option value="image">Image</option>
                <option value="quote">Affirmation</option>
              </select>
            </label>
          )}
          <p className="ai-tool-help" id="ai-mode-help">
            {help.description}
          </p>
          <textarea
            className="vs-textarea"
            aria-label="AI prompt"
            aria-describedby="ai-mode-help"
            placeholder={help.example}
            maxLength={2000}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Button
            className="panel-action"
            aria-label={onChooseImage ? 'Generate replacement preview' : 'Generate'}
            data-tip={help.action}
            loading={busy}
            disabled={!prompt.trim()}
            onClick={() => void generate()}
          >
            {help.action}
          </Button>
          {busy && <Skeleton label="Generating" />}
          {busy && <Button onClick={() => controller.current?.abort()}>Cancel generation</Button>}
          {busy && (
            <p className="ai-tool-help" role="status">
              {progress}
            </p>
          )}
          {error && (
            <div className="panel-inline-error" role="alert">
              <p>{error}</p>
              <Button type="button" className="gs-button--sm" onClick={() => void generate()}>
                Try again
              </Button>
            </div>
          )}
        </>
      )}
      {result && (
        <section className="ai-result" aria-label="AI result">
          <header className="ai-result__heading">
            <h4>{result.image ? 'Your image' : 'Your affirmation'}</h4>
            <span className="ai-result__badge">Preview</span>
          </header>
          {result.image && (
            <img
              src={result.image}
              alt="Generated preview"
              draggable={!busy && !onChooseImage}
              onDragStart={(event) => {
                if (busy) return event.preventDefault();
                startCreationDrag(event, { kind: 'generated-image', image: result.image!, prompt });
              }}
            />
          )}
          {result.text && (
            <blockquote
              className="ai-result__quote"
              draggable={!busy}
              onDragStart={(event) => {
                if (busy) return event.preventDefault();
                startCreationDrag(event, {
                  kind: 'text',
                  preset: { ...AFFIRMATION_STYLE, sample: result.text! },
                });
              }}
            >
              {result.text}
            </blockquote>
          )}
          <p className="ai-result__hint">
            {result.image
              ? onChooseImage
                ? 'Choose this image to preview your replacement.'
                : 'Add this image to your board or use it as a background.'
              : 'Add to your board as editable text.'}
          </p>
          <div className="ai-result__actions">
            <Button className="panel-action" disabled={busy} onClick={() => void insert()}>
              {onChooseImage ? 'Choose this image' : 'Add to board'}
            </Button>
            {result.image && !onChooseImage && (
              <Button
                className="panel-secondary-action"
                disabled={busy}
                onClick={() => void insert(true)}
              >
                Use as background
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
