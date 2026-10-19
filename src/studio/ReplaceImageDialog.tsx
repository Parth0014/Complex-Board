import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GratitudeAsset } from '../assets/contracts';
import type { EditorAdapter } from '../vision/contracts';
import { assertPhoto, listMedia, mediaAsset } from '../vision/media';
import { Skeleton } from './ui/Skeleton';
import { CloseIcon, UploadIcon } from './icons';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { errorMessage } from './errors';

const DiscoverPanel = lazy(() =>
  import('./DiscoverPanel').then((m) => ({ default: m.DiscoverPanel })),
);
const AIPanel = lazy(() => import('./AIPanel').then((m) => ({ default: m.AIPanel })));

type Choice =
  | { kind: 'asset'; asset: GratitudeAsset; url: string; title: string }
  | { kind: 'file'; file: File; url: string; title: string }
  | { kind: 'generated'; url: string; prompt: string; title: string };

export function ReplaceImageDialog({
  adapter,
  targetId,
  onClose,
}: {
  adapter: EditorAdapter;
  targetId: string;
  onClose: () => void;
}) {
  const [source, setSource] = useState<'uploads' | 'unsplash' | 'generate'>('uploads');
  const [visited, setVisited] = useState<string[]>(['uploads']);
  const [uploads, setUploads] = useState<Array<{ asset: GratitudeAsset; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const applying = useRef(false);
  const target = adapter.history.document.items.find((item) => item.id === targetId);
  const original = target?.contentAsset || target?.asset;
  const currentUrl =
    original?.provider === 'upload'
      ? uploads.find((photo) => photo.asset.id === original.id)?.url
      : original?.previewUrl;
  const generated = [
    ...new Map(
      adapter.history.document.items
        .flatMap((item) =>
          [item.asset, item.contentAsset].filter(
            (asset): asset is GratitudeAsset => asset?.provider === 'generated',
          ),
        )
        .map((asset) => [asset.id, asset]),
    ).values(),
  ];
  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    void listMedia(adapter.ownerWindow)
      .then((records) => {
        if (!live) return;
        setUploads(
          records.map((record) => {
            const url = adapter.ownerWindow.URL.createObjectURL(record.working);
            urls.push(url);
            return { asset: mediaAsset(record), url };
          }),
        );
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      urls.forEach((url) => adapter.ownerWindow.URL.revokeObjectURL(url));
    };
  }, [adapter]);
  useEffect(
    () => () => {
      if (choice?.kind === 'file') adapter.ownerWindow.URL.revokeObjectURL(choice.url);
    },
    [adapter, choice],
  );
  const chooseAsset = (asset: GratitudeAsset, url = asset.previewUrl) => {
    setError('');
    setChoice({ kind: 'asset', asset, url, title: asset.title });
  };
  const apply = async () => {
    if (!choice || applying.current) return;
    applying.current = true;
    setBusy(true);
    setError('');
    try {
      if (choice.kind === 'file') await adapter.replaceImageFile(targetId, choice.file);
      else if (choice.kind === 'generated')
        await adapter.insertGeneratedImage(choice.url, choice.prompt, false, undefined, targetId);
      else await adapter.replaceImageAsset(targetId, choice.asset);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      applying.current = false;
      setBusy(false);
    }
  };
  return createPortal(
    <div className="vs vs-veil replace-image-veil">
      <Dialog
        className="vs-dialog replace-image-dialog"
        aria-label="Replace image"
        dismissible={!busy}
        onClose={() => {
          if (!applying.current) onClose();
        }}
      >
        <header className="replace-image-header">
          <div>
            <h2>Replace image</h2>
            <p>Choose a new photo. Your frame and layout stay in place.</p>
          </div>
          <Button
            className="gs-icon-button"
            aria-label="Close image picker"
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon />
          </Button>
        </header>
        <div className="replace-image-body">
          <section className="replace-image-library" aria-label="Choose a replacement" inert={busy}>
            <div className="replace-image-sources" role="group" aria-label="Image sources">
              {(['uploads', 'unsplash', 'generate'] as const).map((id) => (
                <Button
                  key={id}
                  aria-pressed={source === id}
                  disabled={busy}
                  onClick={() => {
                    setSource(id);
                    setVisited((old) => (old.includes(id) ? old : [...old, id]));
                  }}
                >
                  {{ uploads: 'Your uploads', unsplash: 'Unsplash', generate: 'Generate' }[id]}
                </Button>
              ))}
            </div>
            <div className="replace-image-source" hidden={source !== 'uploads'}>
              <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
                <UploadIcon /> Upload a new photo
              </Button>
              <input
                ref={input}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload replacement photo"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (!file) return;
                  try {
                    assertPhoto(file);
                    setError('');
                    setChoice({
                      kind: 'file',
                      file,
                      url: adapter.ownerWindow.URL.createObjectURL(file),
                      title: file.name,
                    });
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              />
              {loading ? (
                <p role="status">Loading your photos…</p>
              ) : !uploads.length ? (
                <p className="ai-tool-help">
                  Your uploaded photos will appear here. Upload one to get started.
                </p>
              ) : (
                <div className="replace-image-grid">
                  {uploads.map(({ asset, url }) => (
                    <Button
                      key={asset.id}
                      disabled={busy}
                      aria-label={`Choose ${asset.title}`}
                      aria-pressed={choice?.kind === 'asset' && choice.asset.id === asset.id}
                      onClick={() => chooseAsset(asset, url)}
                    >
                      <img src={url} alt={asset.title} loading="lazy" draggable={false} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="replace-image-source" hidden={source !== 'unsplash'}>
              {visited.includes('unsplash') && (
                <Suspense fallback={<Skeleton label="Opening Unsplash" />}>
                  <DiscoverPanel adapter={adapter} onChoosePhoto={chooseAsset} />
                </Suspense>
              )}
            </div>
            <div className="replace-image-source" hidden={source !== 'generate'}>
              {generated.length > 0 && (
                <>
                  <h3>Already on this board</h3>
                  <div className="replace-image-grid">
                    {generated.map((asset) => (
                      <Button
                        key={asset.id}
                        disabled={busy}
                        aria-label={`Choose ${asset.title}`}
                        onClick={() => chooseAsset(asset)}
                      >
                        <img src={asset.previewUrl} alt={asset.title} draggable={false} />
                      </Button>
                    ))}
                  </div>
                </>
              )}
              {visited.includes('generate') && (
                <Suspense fallback={<Skeleton label="Opening image generation" />}>
                  <AIPanel
                    adapter={adapter}
                    onChooseImage={(url, prompt) => {
                      setError('');
                      setChoice({ kind: 'generated', url, prompt, title: 'AI-generated image' });
                    }}
                  />
                </Suspense>
              )}
            </div>
          </section>
          <aside className="replace-image-preview" aria-label="Replacement preview">
            <h3>{choice ? 'New image' : 'Current image'}</h3>
            <div className="replace-image-preview-art">
              {(choice?.url || currentUrl) && (
                <img
                  src={choice?.url || currentUrl}
                  alt={choice ? choice.title : 'Current image'}
                />
              )}
            </div>
            <p>{choice ? choice.title : 'Select a photo to preview it here.'}</p>
            <small>
              Size, position and frame are preserved. You can adjust the crop after replacing.
            </small>
          </aside>
        </div>
        <footer className="replace-image-footer">
          <div role={error ? 'alert' : 'status'}>
            {error ||
              (busy
                ? 'Replacing image…'
                : choice
                  ? 'Ready to replace'
                  : 'Your board stays unchanged until you replace.')}
          </div>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!choice || !target || !!target.locked}
            loading={busy}
            onClick={() => void apply()}
          >
            Replace image
          </Button>
        </footer>
      </Dialog>
    </div>,
    adapter.ownerWindow.document.body,
  );
}
