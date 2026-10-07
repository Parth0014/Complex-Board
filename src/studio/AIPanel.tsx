import { useEffect, useRef, useState } from 'react';
import type { EditorAdapter, GeneratedBoardVisuals } from '../vision/contracts';
import { requestAI } from '../vision/aiClient';
import { ReferenceTemplatePanel } from './ReferenceTemplatePanel';
import { CloseIcon, ImageIcon } from './icons';
import { useDialogFocus } from './useDialogFocus';

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
    description: 'Describe your goals and style. Generation may take a few minutes.',
    example:
      'This year I want to travel to Japan, develop my career, and build healthy daily habits',
    action: 'Create my vision board',
  },
};
type Result = {
  image?: string;
  text?: string;
  title?: string;
  goals?: string[];
  imagePrompts?: string[];
  images?: GeneratedBoardVisuals['images'];
  palette?: GeneratedBoardVisuals['palette'];
};
export function AIPanel({ adapter }: { adapter: EditorAdapter }) {
  const [prompt, setPrompt] = useState(modeHelp.board.example),
    [mode, setMode] = useState<'image' | 'quote' | 'board'>('board');
  const [boardStyle, setBoardStyle] = useState<'scrapbook' | 'editorial' | 'gallery'>('scrapbook');
  const [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  useDialogFocus(adapter.ownerWindow, referenceOpen, () => setReferenceOpen(false));
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
    setProgress(
      mode === 'board' ? 'Planning your goals and visual direction…' : 'Creating your preview…',
    );
    controller.current = new adapter.ownerWindow.AbortController();
    try {
      const value = await requestAI(adapter.ownerWindow, '/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode }),
        signal: controller.current.signal,
      });
      if (mode === 'board') {
        if (!Array.isArray(value.goals) || value.goals.length < 1 || value.goals.length > 6)
          throw new Error('The board plan needs 1 to 6 goals. Please regenerate.');
        const images: GeneratedBoardVisuals['images'] = [];
        for (let index = 0; index < value.goals.length; index++) {
          setProgress(
            `Creating image ${index + 1} of ${value.goals.length}: ${value.goals[index]}`,
          );
          const imagePrompt =
            value.imagePrompts?.[index] ||
            `Inspiring photography of ${value.goals[index]}, natural lighting, no text or watermarks`;
          const generated = await requestAI(adapter.ownerWindow, '/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'image', prompt: imagePrompt }),
            signal: controller.current.signal,
          });
          if (!generated.image)
            throw new Error(`Image ${index + 1} could not be generated. Please try again.`);
          images.push({ image: generated.image, prompt: imagePrompt });
        }
        value.images = images;
      }
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
      else if (result.title && result.goals) {
        if (!result.images?.length || result.images.length !== result.goals.length)
          throw new Error(
            'The generated board images are missing. Regenerate the preview before applying.',
          );
        await adapter.composeBoard(result.title, result.goals, boardStyle, {
          images: result.images,
          palette: result.palette,
        });
      }
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
      <label>
        Create
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
          }}
        >
          <option value="image">Image</option>
          <option value="quote">Affirmation</option>
          <option value="board">Complete vision board</option>
        </select>
      </label>
      {mode === 'board' && (
        <label>
          Style
          <select
            className="vs-select"
            aria-label="Board layout style"
            disabled={busy}
            value={boardStyle}
            onChange={(event) => setBoardStyle(event.target.value as typeof boardStyle)}
          >
            <option value="scrapbook">Scrapbook & Polaroids (Layered, tape & notes)</option>
            <option value="editorial">Editorial Story (Magazine layout & serif titles)</option>
            <option value="gallery">Modern Gallery (Clean cards & sleek frames)</option>
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
        <div className="ai-result">
          <p className="ai-tool-help">Preview only. Use the button below to apply this result.</p>
          {result.image && <img src={result.image} alt="Generated preview" />}
          {result.text && <p>{result.text}</p>}
          {result.goals && (
            <>
              <h4>{result.title}</h4>
              {result.images && (
                <div
                  className="ai-board-preview"
                  style={{ background: result.palette?.background, color: result.palette?.text }}
                >
                  {result.images.map((visual, index) => (
                    <figure key={index} style={{ background: result.palette?.card }}>
                      <img src={visual.image} alt={result.goals![index]} />
                      <figcaption>{result.goals![index]}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <ul>
                {result.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </>
          )}
          <div className="ai-result__actions">
            <button
              className="panel-action"
              disabled={busy}
              onClick={() => {
                if (result.goals && adapter.history.document.items.length) setConfirm(true);
                else void insert();
              }}
            >
              {result.goals ? 'Use this board' : 'Add to board'}
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
          {confirm && (
            <>
              <p>Replace the current composition? You can undo this.</p>
              <button onClick={() => void insert()}>Replace composition</button>
              <button onClick={() => setConfirm(false)}>Keep current board</button>
            </>
          )}
        </div>
      )}
      <button
        className="panel-secondary-action ai-reference-trigger"
        disabled={busy}
        onClick={() => setReferenceOpen(true)}
      >
        <ImageIcon /> Use an image reference
      </button>
      {referenceOpen && (
        <div
          className="vs-veil"
          onClick={(event) => {
            if (event.target === event.currentTarget) setReferenceOpen(false);
          }}
        >
          <div
            className="vs-dialog ai-reference-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Image reference"
          >
            <div className="vs-dialog__head">
              <h2>Image reference</h2>
              <button
                className="vs-icon-btn"
                aria-label="Close image reference"
                onClick={() => setReferenceOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <ReferenceTemplatePanel adapter={adapter} />
          </div>
        </div>
      )}
    </div>
  );
}
