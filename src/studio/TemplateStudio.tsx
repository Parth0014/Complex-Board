import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { newBoard, type BoardDocument } from '../vision/document';
import { listBoards, loadBoard, saveBoard, validateBoard } from '../vision/storage';
import { portableMedia } from '../vision/media';
import { publishedTemplates, type PublishedTemplate } from '../vision/publishedTemplates';
import { Editor } from '../editor/Editor';
import { BoardPreview } from './boards/BoardPreview';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Toast } from './ui/Toast';
import { VisionMark, PlusIcon } from './icons';
import {
  readTemplateDraftMeta,
  writeTemplateDraftMeta,
  publishedIdFor,
  TEMPLATE_DRAFT_PREFIX,
  type TemplateDraftMeta,
} from './templateDrafts';
import './TemplateStudio.css';

const FORMATS = [
  { id: '1080x1920', name: 'Portrait', ratio: '9 / 16', note: 'Phone wallpaper' },
  { id: '1080x1080', name: 'Square', ratio: '1', note: 'A balanced canvas' },
  { id: '1920x1080', name: 'Landscape', ratio: '16 / 9', note: 'Desktop wallpaper' },
];

export function TemplateStudio({
  createAdapter,
}: {
  createAdapter: (id: string) => KonvaCanvasAdapter;
}) {
  const [adapter, setAdapter] = useState<KonvaCanvasAdapter>();
  const [drafts, setDrafts] = useState<Array<{ id: string; document: BoardDocument }>>([]);
  const [meta, setMeta] = useState<TemplateDraftMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [format, setFormat] = useState('1080x1920');
  const [review, setReview] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState('');
  const [publishError, setPublishError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [editingDraft, setEditingDraft] = useState<TemplateDraftMeta>();

  const register = (entry: TemplateDraftMeta) => {
    writeTemplateDraftMeta(window, entry);
    setMeta(readTemplateDraftMeta(window));
    return entry;
  };
  const changeUrl = (id?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('board');
    if (id) url.searchParams.set('draft', id);
    else url.searchParams.delete('draft');
    window.history.replaceState(null, '', url);
  };
  const open = async (id: string) => {
    if (!(await loadBoard(window, id))) throw new Error('This template draft could not be found.');
    const entry =
      readTemplateDraftMeta(window).find((candidate) => candidate.id === id) ||
      register({ id, description: '' });
    const next = createAdapter(id);
    await next.initialize();
    if (next.saveStatus.startsWith('Save failed')) throw new Error(next.saveStatus);
    setEditingDraft(entry);
    setAdapter(next);
    changeUrl(id);
  };
  const editPublished = async (template: PublishedTemplate) => {
    setBusy(true);
    setError('');
    try {
      const existing = readTemplateDraftMeta(window).find(
        (entry) => entry.publishedId === template.id,
      );
      if (existing && (await loadBoard(window, existing.id))) {
        await open(existing.id);
        return;
      }
      const id = TEMPLATE_DRAFT_PREFIX + window.crypto.randomUUID();
      await saveBoard(window, { ...newBoard(), title: template.title }, id);
      const next = createAdapter(id);
      await next.initialize();
      await next.restore(JSON.stringify(template.project));
      next.commit({ ...next.history.document, title: template.title });
      await next.flushSave();
      const entry = register({ id, description: template.description, publishedId: template.id });
      setEditingDraft(entry);
      setAdapter(next);
      changeUrl(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to edit this template.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const entries = readTemplateDraftMeta(window),
          url = new URL(window.location.href);
        let id = url.searchParams.get('draft') || url.searchParams.get('board');
        if (id && !id.startsWith(TEMPLATE_DRAFT_PREFIX)) {
          const existing = entries.find((entry) => entry.sourceId === id);
          if (existing) id = existing.id;
          else {
            const original = await loadBoard(window, id);
            if (!active) return;
            if (!original) throw new Error('This earlier template draft could not be found.');
            const nextId = TEMPLATE_DRAFT_PREFIX + window.crypto.randomUUID();
            await saveBoard(window, validateBoard(original), nextId);
            register({
              id: nextId,
              description: '',
              sourceId: id,
              publishedId: publishedIdFor(id),
            });
            id = nextId;
          }
        }
        if (active && id) await open(id);
        if (active) {
          setDrafts(await listBoards(window, 'template-drafts'));
          setMeta(readTemplateDraftMeta(window));
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to open template maker.');
          changeUrl();
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // Resolve the URL once; subsequent draft navigation stays in this workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const returnToLibrary = async () => {
    try {
      await adapter?.flushSave();
      setDrafts(await listBoards(window, 'template-drafts'));
      setMeta(readTemplateDraftMeta(window));
      setAdapter(undefined);
      setEditingDraft(undefined);
      changeUrl();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your draft.');
    }
  };
  const openReview = () => {
    if (!adapter) return;
    setReviewName(adapter.history.document.title);
    setDescription(editingDraft?.description || '');
    setPublishError('');
    setPreview('');
    setReview(true);
    void adapter
      .previewSavedDocument(adapter.history.document, 480)
      .then(setPreview)
      .catch(() => setPublishError('Preview could not be prepared. Try reopening this draft.'));
  };

  return (
    <div className="vs-root template-workspace">
      {adapter ? (
        <Editor
          key={adapter.boardId}
          adapter={adapter}
          initialTab="elements"
          onHome={() => void returnToLibrary()}
          templateTools={{ onPublish: openReview, publishing }}
        />
      ) : (
        <div className="vs template-maker-library">
          <header className="tm-library-header">
            <div className="tm-identity">
              <VisionMark />
              <strong>Template maker</strong>
            </div>
          </header>
          <main className="tm-library-main">
            <div className="tm-library-heading">
              <div>
                <p className="tm-eyebrow">YOUR WORKSPACE</p>
                <h1>Your templates</h1>
                <p>
                  Build a reusable board. Keep working on a draft, then publish when it's ready.
                </p>
              </div>
              <Button
                variant="primary"
                disabled={loading || busy}
                onClick={() => {
                  setNewName('');
                  setCreating(true);
                }}
              >
                <PlusIcon /> New template
              </Button>
            </div>
            <h2 className="tm-section-title">Your drafts</h2>
            {loading ? (
              <p role="status">Opening your template workspace...</p>
            ) : drafts.length ? (
              <div className="tm-draft-grid">
                {drafts.map((draft) => (
                  <article className="tm-draft-card" key={draft.id}>
                    <Button
                      type="button"
                      className="tm-draft-open"
                      disabled={busy}
                      aria-label={`Open template: ${draft.document.title}`}
                      onClick={async () => {
                        setBusy(true);
                        setError('');
                        try {
                          await open(draft.id);
                        } catch (cause) {
                          setError(
                            cause instanceof Error ? cause.message : 'Unable to open draft.',
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <div className="tm-draft-image">
                        <BoardPreview document={draft.document} />
                      </div>
                      <div className="tm-draft-info">
                        <h2>{draft.document.title}</h2>
                        <p>
                          {draft.document.width} / {draft.document.height} /{' '}
                          {draft.document.items.length ? 'Continue editing' : 'Empty draft'}
                        </p>
                      </div>
                    </Button>
                    <p className="tm-draft-status">
                      {meta.find((entry) => entry.id === draft.id)?.publishedAt
                        ? 'Published to the app library'
                        : 'Draft  /  saved in this browser'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <section className="tm-library-empty">
                <div className="tm-paper-stack" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <h2>Make your first template</h2>
                <p>Start with a blank canvas. Add photos, cutouts, torn paper and text.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNewName('');
                    setCreating(true);
                  }}
                >
                  Create a template
                </Button>
              </section>
            )}
            {publishedTemplates.length > 0 && (
              <section className="tm-published-library" aria-label="Published templates">
                <h2 className="tm-section-title">Published templates</h2>
                <p className="tm-storage-note">
                  Edit a published design, then publish an update to its existing app library entry.
                  If you already have a draft, editing continues where you left off.
                </p>
                <div className="tm-draft-grid">
                  {publishedTemplates.map((template) => (
                    <article className="tm-draft-card" key={template.id}>
                      <div className="tm-draft-image">
                        <img src={template.preview} alt={template.title + ' template'} />
                      </div>
                      <div className="tm-draft-info">
                        <h3>{template.title}</h3>
                        {template.description && <p>{template.description}</p>}
                      </div>
                      <div className="tm-published-actions">
                        <Button
                          variant="secondary"
                          disabled={loading || busy}
                          aria-label={'Edit template: ' + template.title}
                          onClick={() => void editPublished(template)}
                        >
                          Edit template
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <p className="tm-storage-note">
              Drafts stay in this browser. Download a draft file from the editor's File menu to keep
              a backup.
            </p>
          </main>
        </div>
      )}
      {creating &&
        createPortal(
          <div className="vs vs-veil">
            <Dialog
              className="vs-dialog tm-dialog"
              aria-label="New template"
              onClose={() => {
                if (!busy) setCreating(false);
              }}
              dismissible={!busy}
            >
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError('');
                  try {
                    const id = TEMPLATE_DRAFT_PREFIX + window.crypto.randomUUID(),
                      [width, height] = format.split('x').map(Number);
                    await saveBoard(
                      window,
                      {
                        ...newBoard(),
                        title: newName.trim() || 'Untitled template',
                        width,
                        height,
                      },
                      id,
                    );
                    register({ id, description: '' });
                    await open(id);
                    setCreating(false);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'Unable to create template.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p className="tm-eyebrow">A FRESH CANVAS</p>
                <h2>New template</h2>
                <label className="vs-field">
                  <span>Template name</span>
                  <input
                    className="vs-input"
                    aria-label="Template name"
                    maxLength={80}
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. A slower, softer year"
                  />
                </label>
                <fieldset className="tm-format-group">
                  <legend>Canvas format</legend>
                  <div className="tm-formats">
                    {FORMATS.map((choice) => (
                      <label className="tm-format" key={choice.id}>
                        <input
                          type="radio"
                          name="template-format"
                          aria-label={choice.name}
                          value={choice.id}
                          checked={format === choice.id}
                          onChange={() => setFormat(choice.id)}
                        />
                        <span className="tm-format-paper" style={{ aspectRatio: choice.ratio }} />
                        <strong>{choice.name}</strong>
                        <span>{choice.note}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="tm-dialog-actions">
                  <Button disabled={busy} onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={busy}>
                    Create template
                  </Button>
                </div>
              </form>
            </Dialog>
          </div>,
          window.document.body,
        )}
      {review &&
        adapter &&
        createPortal(
          <div className="vs vs-veil">
            <Dialog
              className="vs-dialog tm-dialog tm-publish-dialog"
              aria-label="Publish template"
              onClose={() => setReview(false)}
              dismissible={!publishing}
            >
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setPublishing(true);
                  setPublishError('');
                  try {
                    if (!import.meta.env.DEV)
                      throw new Error('Publish from the local template maker.');
                    const title = reviewName.trim();
                    if (!title) throw new Error('Give your template a name.');
                    if (!adapter.history.document.items.length)
                      throw new Error('Add some content before publishing.');
                    if (title !== adapter.history.document.title)
                      adapter.commit({ ...adapter.history.document, title });
                    const entry = register({ ...editingDraft!, id: adapter.boardId, description });
                    setEditingDraft(entry);
                    await adapter.flushSave();
                    const revision = adapter.history.revision,
                      project = structuredClone(adapter.history.document);
                    const image = await adapter.previewSavedDocument(project, 480),
                      media = await portableMedia(window, project);
                    if (revision !== adapter.history.revision)
                      throw new Error('The draft changed while preparing it. Please try again.');
                    const response = await fetch('/api/template-studio', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: entry.publishedId || publishedIdFor(adapter.boardId),
                        title,
                        description,
                        preview: image,
                        project: { ...project, media },
                      }),
                    });
                    if (!response.ok) {
                      const result = await response.json().catch(() => ({}));
                      throw new Error(
                        result.error || 'Publishing needs the local development server.',
                      );
                    }
                    setEditingDraft(
                      register({
                        ...entry,
                        publishedId: entry.publishedId || publishedIdFor(adapter.boardId),
                        publishedAt: Date.now(),
                      }),
                    );
                    setReview(false);
                    setMessage(
                      'Published to the app library. It will reach your live site with the next deployment.',
                    );
                  } catch (cause) {
                    setPublishError(
                      cause instanceof Error ? cause.message : 'Unable to publish template.',
                    );
                  } finally {
                    setPublishing(false);
                  }
                }}
              >
                <p className="tm-eyebrow">READY TO SHARE</p>
                <h2>
                  {editingDraft?.publishedId ? 'Publish template update' : 'Publish template'}
                </h2>
                <p>
                  {editingDraft?.publishedId
                    ? 'Replace this template in the app library. Boards already created from it stay unchanged.'
                    : 'Add this design to Templates in the main app. Your draft stays editable.'}
                </p>
                <div className="tm-review-content">
                  <div className="tm-review-image">
                    {preview ? (
                      <img src={preview} alt="Template preview" />
                    ) : (
                      <p role="status">Preparing preview...</p>
                    )}
                  </div>
                  <div className="tm-review-fields">
                    <label className="vs-field">
                      <span>Template name</span>
                      <input
                        className="vs-input"
                        required
                        maxLength={80}
                        value={reviewName}
                        onChange={(event) => setReviewName(event.target.value)}
                      />
                    </label>
                    <label className="vs-field">
                      <span>Description</span>
                      <textarea
                        className="vs-textarea"
                        rows={4}
                        maxLength={400}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="What is this template for?"
                      />
                    </label>
                    <p className="tm-storage-note">
                      {import.meta.env.DEV
                        ? 'Publishing updates the app library. The live site updates with your next deployment.'
                        : 'Publishing is available in the local template maker. Download this draft from File to continue there.'}
                    </p>
                  </div>
                </div>
                {publishError && (
                  <p role="alert" className="panel-inline-error">
                    {publishError}
                  </p>
                )}
                <div className="tm-dialog-actions">
                  <Button disabled={publishing} onClick={() => setReview(false)}>
                    Keep editing
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={publishing}
                    disabled={!preview || !import.meta.env.DEV}
                  >
                    {editingDraft?.publishedId ? 'Publish update' : 'Publish to app'}
                  </Button>
                </div>
              </form>
            </Dialog>
          </div>,
          window.document.body,
        )}
      {error && <Toast error message={error} onDismiss={() => setError('')} />}
      {message && <Toast message={message} onDismiss={() => setMessage('')} />}
    </div>
  );
}
