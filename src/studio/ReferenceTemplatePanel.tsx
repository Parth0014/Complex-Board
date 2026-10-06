import { useEffect, useRef, useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import { requestAI } from '../vision/aiClient';
import { type ReferenceLayout } from '../vision/referenceTemplate';
import { fontFamily } from '../vision/fonts';

export function ReferenceTemplatePanel({
  adapter,
  configured,
}: {
  adapter: EditorAdapter;
  configured: boolean;
}) {
  const [reference, setReference] = useState<{
    image: string;
    width: number;
    height: number;
  } | null>(null);
  const [layout, setLayout] = useState<ReferenceLayout | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  useEffect(() => () => controller.current?.abort(), [adapter]);
  const upload = async (file?: File) => {
    setLayout(null);
    setReference(null);
    setError('');
    setConfirm(false);
    if (!file) return;
    setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20000000)
        throw new Error('Choose a PNG, JPEG or WebP under 20 MB.');
      const url = adapter.ownerWindow.URL.createObjectURL(file);
      try {
        const image = new adapter.ownerWindow.Image();
        image.src = url;
        await image.decode();
        if (image.width < 64 || image.height < 64 || image.width * image.height > 40000000)
          throw new Error('Use an image at least 64 pixels wide and tall, under 40 megapixels.');
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = adapter.ownerWindow.document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setReference({
          image: canvas.toDataURL('image/jpeg', 0.9),
          width: canvas.width,
          height: canvas.height,
        });
      } finally {
        adapter.ownerWindow.URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to read reference.');
    } finally {
      setBusy(false);
    }
  };
  const analyze = async () => {
    if (!reference) return;
    setBusy(true);
    setError('');
    setLayout(null);
    setConfirm(false);
    revision.current = adapter.history.revision;
    controller.current = new adapter.ownerWindow.AbortController();
    try {
      setLayout(
        await requestAI(adapter.ownerWindow, '/api/ai/reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reference),
          signal: controller.current.signal,
        }),
      );
    } catch (error) {
      setError(
        error instanceof Error && error.name === 'AbortError'
          ? 'Analysis cancelled.'
          : error instanceof Error
            ? error.message
            : 'Analysis failed.',
      );
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!layout) return;
    setError('');
    if (revision.current !== adapter.history.revision) {
      setError('The board changed after analysis. Analyze again before applying.');
      setConfirm(false);
      return;
    }
    setBusy(true);
    try {
      await adapter.applyReferenceTemplate(layout, revision.current);
      setLayout(null);
      setConfirm(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to apply template.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="ai-result" aria-label="Reference to template">
      <h4>Reference to template</h4>
      <p>
        Upload one design. Keep its detected text and layout; every photo becomes a replaceable
        placeholder.
      </p>
      <p className="ai-tool-help">
        The reference is sent to Cloudflare for analysis. Its photos are never added to your board.
        Layout and fonts are approximate; check the text before applying.
      </p>
      <input
        aria-label="Upload design reference"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      {reference && (
        <img
          src={reference.image}
          alt="Uploaded design reference"
          style={{ width: '100%', maxHeight: 260, objectFit: 'contain' }}
        />
      )}
      <button
        className="panel-action"
        disabled={!reference || !configured || busy}
        onClick={() => void analyze()}
      >
        {busy ? 'Working…' : 'Analyze reference'}
      </button>
      {busy && <button onClick={() => controller.current?.abort()}>Cancel analysis</button>}
      {error && (
        <p role="alert" className="panel-inline-error">
          {error}
        </p>
      )}
      {layout && (
        <>
          <p>
            {layout.elements.filter((e) => e.type === 'photo').length} photo slots ·{' '}
            {layout.elements.filter((e) => e.type === 'text').length} text blocks
          </p>
          <svg
            aria-label="Editable template preview"
            role="img"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            style={{ width: '100%', maxHeight: 350 }}
          >
            <rect width={layout.width} height={layout.height} fill={layout.background} />
            {layout.elements.map((e, index) => (
              <g
                key={index}
                transform={`translate(${e.x * layout.width} ${e.y * layout.height}) rotate(${e.rotation})`}
              >
                {e.type === 'text' ? (
                  <text
                    fontFamily={fontFamily(e.fontFamily)}
                    fontSize={(e.fontSize || 0.035) * layout.width}
                    fontWeight={e.bold ? 'bold' : 'normal'}
                    fill={e.color}
                  >
                    {e.text?.split('\n').map((line, i) => (
                      <tspan key={i} x="0" dy={(e.fontSize || 0.035) * layout.width}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : e.shape === 'circle' ? (
                  <ellipse
                    cx={(e.width * layout.width) / 2}
                    cy={(e.height * layout.height) / 2}
                    rx={(e.width * layout.width) / 2}
                    ry={(e.height * layout.height) / 2}
                    fill={e.color}
                  />
                ) : (
                  <rect
                    width={e.width * layout.width}
                    height={e.height * layout.height}
                    fill={e.type === 'photo' ? '#e6dfd5' : e.color}
                    stroke={e.type === 'photo' ? '#b8afa2' : 'none'}
                  />
                )}
              </g>
            ))}
          </svg>
          {layout.elements.map(
            (e, index) =>
              e.type === 'text' && (
                <label key={index}>
                  Detected text {index + 1}
                  <textarea
                    className="vs-textarea"
                    maxLength={2000}
                    value={e.text}
                    onChange={(event) =>
                      setLayout({
                        ...layout,
                        elements: layout.elements.map((item, i) =>
                          i === index ? { ...item, text: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </label>
              ),
          )}
          <p>
            Applying replaces the current page composition and size. You can undo it. Select a
            placeholder and upload your photo to replace it.
          </p>
          {!confirm ? (
            <button
              className="panel-action"
              disabled={busy}
              onClick={() =>
                adapter.history.document.items.length ? setConfirm(true) : void apply()
              }
            >
              Use this template
            </button>
          ) : (
            <>
              <button disabled={busy} onClick={() => void apply()}>
                Replace current composition
              </button>
              <button disabled={busy} onClick={() => setConfirm(false)}>
                Keep current board
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
