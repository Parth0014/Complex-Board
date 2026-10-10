import { useEffect, useRef, useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
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
};
type Result = {
  image?: string;
  text?: string;
};
export function AIPanel({ adapter }: { adapter: EditorAdapter }) {
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
    setProgress('Adding your creation to the board…');
    setError('');
    try {
      if (result.image) await adapter.insertGeneratedImage(result.image, prompt, background);
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
      setResult(null);
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ai-panel">
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
      <button
        className="panel-action"
        aria-label="Generate"
        title={help.action}
        data-tip={help.action}
        disabled={busy || !prompt.trim()}
        onClick={() => void generate()}
      >
        {busy ? 'Working…' : help.action}
      </button>
      {busy && <button onClick={() => controller.current?.abort()}>Cancel generation</button>}
      {busy && (
        <p className="ai-tool-help" role="status">
          {progress}
        </p>
      )}
      {error && (
        <div className="panel-inline-error" role="alert">
          <p>{error}</p>
          <p>
            Review the connection and prompt, then try again. Existing board items are preserved.
          </p>
        </div>
      )}
      {result && (
        <section className="ai-result" aria-label="AI result">
          <header className="ai-result__heading">
            <h4>{result.image ? 'Your image' : 'Your affirmation'}</h4>
            <span className="ai-result__badge">Preview</span>
          </header>
          {result.image && <img src={result.image} alt="Generated preview" />}
          {result.text && <blockquote className="ai-result__quote">{result.text}</blockquote>}
          <p className="ai-result__hint">
            {result.image
              ? 'Add this image to your board or use it as a background.'
              : 'Add to your board as editable text.'}
          </p>
          <div className="ai-result__actions">
            <button className="panel-action" disabled={busy} onClick={() => void insert()}>
              Add to board
            </button>
            {result.image && (
              <button
                className="panel-secondary-action"
                disabled={busy}
                onClick={() => void insert(true)}
              >
                Use as background
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
