import { assistStroke } from '../strokeAssist';
import { resolveTemplateSticker } from '../templateStickers';
import { curatedPackProvider } from '../../assets/curatedPack';
import Konva from 'konva';
import { requestAI } from '../aiClient';
import { compileReference, placeholderUrl, type ReferenceLayout } from '../referenceTemplate';
import type { GratitudeAsset } from '../../assets/contracts';
import type {
  CanvasAdapter,
  GeneratedBoardVisuals,
  VisionSelection,
  VisionSelectionPatch,
  VisionTextPreset,
  VisionPoint,
  VisionImageEdits,
} from '../contracts';
import { DocumentHistory, type BoardItem } from '../document';
import { getLayoutSlotBounds, fitTemplateLayout, type VisionLayout } from '../layouts';
import type { VisionTemplate } from '../templates';
import { VISION_TEMPLATES, LEGACY_VISION_TEMPLATES } from '../templates';
import { TEMPLATE_PHOTOS, fitCollageElements } from '../collageTemplates';
import { boundsOf, unionBounds, constrainItems } from './geometry';
import { loadBoard, saveBoard, validateBoard } from '../storage';
import { imagePdf, imagesPdf } from '../pdf';
import { renderPage } from './renderPage';
import { updateConnectors } from '../connectors';
import { loadEditorFonts, fontFamily } from '../fonts';
import {
  loadMedia,
  saveMedia,
  preparePhoto,
  mediaAsset,
  portableMedia,
  parsePortableMedia,
  referencedMedia,
  type MediaRecord,
} from '../media';

const deferred = () => {
  throw new Error('This operation belongs to a later v1 milestone.');
};
const isTemplatePlaceholder = (item: BoardItem) =>
  item.kind === 'shape' &&
  (item.templatePlaceholder ||
    (item.shape === 'rectangle' &&
      !!item.slotId &&
      /^#[0-9a-f]{6}20$/i.test(item.color || '') &&
      item.borderWidth === 1));

export class KonvaCanvasAdapter implements CanvasAdapter {
  readonly history = new DocumentHistory();
  readonly images = new Map<string, HTMLImageElement>();
  selectedIds: string[] = [];
  groupScope: string[] = [];
  cropDraft?: { id: string; crop: NonNullable<BoardItem['crop']> };
  updateCropDraft(crop: NonNullable<BoardItem['crop']>) {
    if (!this.cropDraft) return;
    this.cropDraft = { ...this.cropDraft, crop };
    this.changed();
  }
  applyCrop() {
    if (!this.cropDraft) return;
    const draft = this.cropDraft;
    this.cropDraft = undefined;
    this.patchItems([
      {
        id: draft.id,
        patch: {
          crop: {
            ...draft.crop,
            x: Math.min(draft.crop.x, 1 - draft.crop.width),
            y: Math.min(draft.crop.y, 1 - draft.crop.height),
          },
        },
      },
    ]);
  }
  cancelCrop() {
    this.cropDraft = undefined;
    this.changed();
  }
  saveStatus = 'Loading';
  storageReady = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private saveSerial = 0;
  async initialize() {
    const revision = this.history.revision;
    try {
      await loadEditorFonts(this.ownerWindow);
      const stored = await loadBoard(this.ownerWindow);
      if (stored && revision === this.history.revision) {
        const board = await this.prepareBoard(stored);
        if (revision === this.history.revision) this.history.document = board;
      }
      this.storageReady = true;
      this.saveStatus = 'Saved';
      this.changed();
      if (this.history.revision !== revision) this.persist();
    } catch (error) {
      this.storageReady = true;
      this.saveStatus = `Save failed: ${error instanceof Error ? error.message : String(error)}`;
      this.changed();
    }
  }
  private persist() {
    if (!this.storageReady) return;
    const document = structuredClone(this.history.document),
      serial = ++this.saveSerial;
    this.saveStatus = 'Saving';
    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(() => saveBoard(this.ownerWindow, document))
      .then(
        () => {
          if (serial === this.saveSerial) {
            this.saveStatus = 'Saved';
            this.changed();
          }
        },
        (error) => {
          if (serial === this.saveSerial) {
            this.saveStatus = 'Save failed';
            this.changed();
          }
          throw error;
        },
      );
    void this.saveQueue.catch(() => {});
  }
  private async prepareBoard(value: unknown, mediaRecords = new Map<string, MediaRecord>()) {
    const board = validateBoard(value);
    referencedMedia(board);
    const assets = [
      ...board.items.flatMap((item) =>
        [item.asset, item.contentAsset].filter((asset): asset is GratitudeAsset => !!asset),
      ),
      ...(board.background ? [board.background] : []),
    ];
    const resolved = new Map<string, GratitudeAsset>();
    for (const asset of assets) {
      if (!resolved.has(asset.id)) {
        let canonical: GratitudeAsset;
        if (asset.provider === 'upload')
          canonical = mediaAsset(
            mediaRecords.get(asset.mediaId!) || (await loadMedia(this.ownerWindow, asset.mediaId!)),
          );
        else if (
          asset.provider === 'template-photo' &&
          Object.values(TEMPLATE_PHOTOS).some((photo) => photo.id === asset.id)
        )
          canonical = Object.values(TEMPLATE_PHOTOS).find((photo) => photo.id === asset.id)!;
        else if (asset.provider === 'template-sticker') canonical = resolveTemplateSticker(asset);
        else if (asset.provider === 'template-photo' && asset.id === 'reference-placeholder')
          canonical = { ...asset, assetUrl: placeholderUrl, previewUrl: placeholderUrl };
        else if (
          asset.provider === 'generated' &&
          /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(asset.assetUrl) &&
          asset.assetUrl.length < 16000000 &&
          asset.id.startsWith('generated:')
        )
          canonical = { ...asset, previewUrl: asset.assetUrl };
        else {
          if (asset.provider !== 'curated-v1')
            throw new Error('Backup contains media outside the curated library.');
          canonical = await curatedPackProvider.resolve(asset.id, this.ownerWindow);
        }
        await this.decode(canonical, mediaRecords.get(asset.mediaId!));
        resolved.set(asset.id, canonical);
      }
    }
    board.items = board.items.map((item) => ({
      ...item,
      asset: item.asset ? resolved.get(item.asset.id) : undefined,
      contentAsset: item.contentAsset ? resolved.get(item.contentAsset.id) : undefined,
      groupPath: item.groupPath || (item.groupId ? [item.groupId] : []),
      groupId: (item.groupPath || (item.groupId ? [item.groupId] : []))[0],
    }));
    for (const item of board.items)
      if (item.rendition) {
        if (
          !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(item.rendition) ||
          item.rendition.length > 16000000
        )
          throw new Error('Invalid edited image.');
        const asset = item.contentAsset || item.asset;
        if (!asset) throw new Error('Edited image has no original.');
        await this.decode({ ...asset, assetUrl: item.rendition });
      }
    if (board.background) board.background = resolved.get(board.background.id);
    if (board.pages) {
      const pages = [];
      for (const page of board.pages) {
        const prepared = await this.prepareBoard(
          { ...page, version: 2, title: board.title, pages: undefined },
          mediaRecords,
        );
        pages.push({ ...page, ...prepared, pages: undefined });
      }
      board.pages = pages;
    }
    return board;
  }
  async backup() {
    const board = structuredClone(this.history.document),
      media = await portableMedia(this.ownerWindow, board);
    const blob = new this.ownerWindow.Blob(
      [JSON.stringify(media.length ? { ...board, media } : board)],
      { type: 'application/json' },
    );
    if (blob.size > 180 * 1024 * 1024)
      throw new Error('Backup exceeds 180 MB. Use fewer or smaller images.');
    const url = this.ownerWindow.URL.createObjectURL(blob);
    this.download(url, 'vision-board.json');
    this.ownerWindow.setTimeout(() => this.ownerWindow.URL.revokeObjectURL(url), 1000);
  }
  async restore(text: string) {
    if (text.length > 180 * 1024 * 1024) throw new Error('Backup is too large (maximum 180 MB).');
    const revision = this.history.revision,
      value = JSON.parse(text),
      { media, ...document } = value;
    const validated = validateBoard(document);
    if (referencedMedia(validated).size && media === undefined)
      throw new Error('Backup is missing its photos.');
    const records = await parsePortableMedia(this.ownerWindow, media, validated);
    const board = await this.prepareBoard(
      validated,
      new Map(records.map((record) => [record.id, record])),
    );
    if (revision !== this.history.revision)
      throw new Error('The board changed while restoring. Try again.');
    await saveMedia(this.ownerWindow, records);
    if (revision !== this.history.revision)
      throw new Error('The board changed while restoring. Try again.');
    this.groupScope = [];
    this.commit(board);
    this.select([]);
  }
  private clipboard: BoardItem[] = [];
  private pasteCount = 0;
  private clipboardDepth = 0;
  clipboardStatus = '';
  async copyToSystem(cut = false) {
    this.copySelection();
    if (!this.clipboard.length) return;
    const revision = this.history.revision,
      cutIds = this.clipboard.map((item) => item.id);
    try {
      await this.ownerWindow.navigator.clipboard.writeText(
        JSON.stringify({
          type: 'gratitude-board-selection',
          version: 1,
          depth: this.clipboardDepth,
          items: this.clipboard,
        }),
      );
      this.clipboardStatus = 'Copied to clipboard';
    } catch {
      this.clipboardStatus = 'Copied within this editor; browser clipboard unavailable';
    }
    if (cut) {
      if (revision === this.history.revision) this.delete(cutIds);
      else this.clipboardStatus = 'Copied; cut cancelled because the board changed';
    }
    this.changed();
  }
  async pasteFromSystem() {
    const revision = this.history.revision;
    try {
      const text = await this.ownerWindow.navigator.clipboard.readText();
      if (text.length > 32000000) throw new Error('Clipboard is too large.');
      let value;
      try {
        value = JSON.parse(text);
      } catch {
        value = null;
      }
      if (value?.type === 'gratitude-board-selection') {
        if (
          value.version !== 1 ||
          !Number.isInteger(value.depth) ||
          value.depth < 0 ||
          value.depth > 20
        )
          throw new Error('Invalid clipboard selection.');
        const prepared = await this.prepareBoard({
          ...this.history.document,
          pages: undefined,
          items: value.items,
        });
        if (revision !== this.history.revision)
          throw new Error('Board changed while pasting. Try again.');
        this.clipboard = prepared.items;
        this.clipboardDepth = value.depth;
        this.pasteCount = 0;
      } else if (!this.clipboard.length && text.trim()) {
        if (revision !== this.history.revision) return;
        this.createTextPreset({
          id: 'clipboard-text',
          label: 'Pasted text',
          category: 'reflection',
          sample: text.slice(0, 5000),
          fontFamily: 'assistant',
          fontSize: 34,
          color: '#49375e',
        });
        return;
      }
      this.clipboardStatus = '';
    } catch (error) {
      // Permission denial retains the session clipboard. Invalid board data does not.
      if (
        error instanceof Error &&
        error.name !== 'NotAllowedError' &&
        error.name !== 'SecurityError' &&
        !(error instanceof TypeError)
      ) {
        this.clipboardStatus = error.message;
        this.changed();
        return;
      }
      this.clipboardStatus = 'Using this editor clipboard';
    }
    if (revision !== this.history.revision) {
      this.clipboardStatus = 'Board changed while pasting. Try again.';
      this.changed();
      return;
    }
    this.pasteSelection();
    this.changed();
  }
  private copiedStyle?: { kind: BoardItem['kind']; patch: Partial<BoardItem> };
  copyStyle() {
    const item = this.history.document.items.find((item) => this.selectedIds.includes(item.id));
    if (!item) return;
    const {
      opacity,
      fontFamily,
      fontSize,
      color,
      align,
      bold,
      italic,
      underline,
      letterSpacing,
      lineHeight,
      borderWidth,
      borderColor,
      shadow,
      radius,
      borderStyle,
      effect,
      gradient,
      textBackground,
      strike,
      curve,
      fill,
      fontWeight,
      gradientType,
      noFill,
      kerning,
      ligatures,
      shadowColor,
      shadowOpacity,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
    } = item;
    this.copiedStyle = {
      kind: item.kind,
      patch: {
        opacity,
        fontFamily,
        fontSize,
        color,
        align,
        bold,
        italic,
        underline,
        letterSpacing,
        lineHeight,
        borderWidth,
        borderColor,
        shadow,
        radius,
        borderStyle,
        effect,
        gradient,
        textBackground,
        strike,
        curve,
        fill,
        fontWeight,
        gradientType,
        noFill,
        kerning,
        ligatures,
        shadowColor,
        shadowOpacity,
        shadowBlur,
        shadowOffsetX,
        shadowOffsetY,
      },
    };
    this.changed();
  }
  get canPasteStyle() {
    return !!this.copiedStyle;
  }
  pasteStyle() {
    const style = this.copiedStyle;
    if (!style) return;
    const patches = this.history.document.items
      .filter((item) => this.selectedIds.includes(item.id) && item.kind === style.kind)
      .map((item) => ({ id: item.id, patch: { ...style.patch } }));
    if (patches.length) this.patchItems(patches);
  }
  copySelection() {
    this.clipboard = this.history.document.items
      .filter((item) => this.selectedIds.includes(item.id))
      .map((item) => structuredClone(item));
    for (const item of this.clipboard)
      if (
        item.connector &&
        (!this.clipboard.some((other) => other.id === item.connector!.from) ||
          !this.clipboard.some((other) => other.id === item.connector!.to))
      )
        item.connector = undefined;
    this.pasteCount = 0;
    this.clipboardDepth = this.groupScope.length;
  }
  cutSelection() {
    if (!this.selectedIds.length) return;
    this.copySelection();
    this.delete(this.selectedIds);
  }
  pasteSelection() {
    if (!this.clipboard.length) return;
    const offset = 24 * ++this.pasteCount,
      groups = new Map<string, string>();
    const identities = new Map(this.clipboard.map((item) => [item.id, this.id()]));
    const copies = this.clipboard.map((source) => {
      const item = structuredClone(source);
      if (item.groupId && !groups.has(item.groupId)) groups.set(item.groupId, this.id());
      const path = [
        ...this.groupScope,
        ...this.path(item)
          .slice(this.clipboardDepth)
          .map((id) => {
            if (!groups.has(id)) groups.set(id, this.id());
            return groups.get(id)!;
          }),
      ];
      return {
        ...item,
        id: identities.get(item.id)!,
        connector:
          item.connector && identities.has(item.connector.from) && identities.has(item.connector.to)
            ? { from: identities.get(item.connector.from)!, to: identities.get(item.connector.to)! }
            : undefined,
        x: item.x + offset,
        y: item.y + offset,
        slotId: undefined,
        groupPath: path,
        groupId: path[0],
      };
    });
    this.items((items) => [...items, ...copies]);
    this.select(copies.map((item) => item.id));
  }
  snapToEdges = true;
  setSnapToEdges(enabled: boolean) {
    this.snapToEdges = enabled;
    if (enabled) this.commit(this.history.document);
    else this.changed();
  }
  private listeners = new Set<() => void>();
  private serial = 0;
  exporter?: (scale: number, selectionOnly?: boolean, transparent?: boolean) => string;
  fit?: () => void;
  constructor(readonly ownerWindow: Window & typeof globalThis) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.listeners.forEach((listener) => listener());
  }
  private id() {
    return this.ownerWindow.crypto.randomUUID();
  }
  getSnapshot = () => this.serial;
  private changed() {
    this.serial++;
    this.emit();
  }
  beginGesture() {
    this.history.beginGesture();
  }
  endGesture() {
    this.history.endGesture();
    this.changed();
  }
  cancelGesture() {
    this.history.cancelGesture();
    this.persist();
    this.changed();
  }
  commit(document: typeof this.history.document) {
    const previous = this.history.document;
    if (
      document.activePageId === previous.activePageId &&
      (document.width !== previous.width || document.height !== previous.height)
    ) {
      const heading = document.items.find((item) => item.slotId === 'template-heading');
      const template = [...VISION_TEMPLATES, ...LEGACY_VISION_TEMPLATES].find((template) =>
        heading?.templateId
          ? template.id === heading.templateId
          : heading?.text === template.heading,
      );
      if (template?.elements) {
        const canvas = template.canvas || { width: 1000, height: 1000 };
        const oldScale = Math.min(previous.width / canvas.width, previous.height / canvas.height);
        const newScale = Math.min(document.width / canvas.width, document.height / canvas.height);
        const oldX = (previous.width - oldScale * canvas.width) / 2;
        const oldY = (previous.height - oldScale * canvas.height) / 2;
        const newX = (document.width - newScale * canvas.width) / 2;
        const newY = (document.height - newScale * canvas.height) / 2;
        const ratio = newScale / oldScale;
        document = {
          ...document,
          items: document.items.map((item) =>
            item.templateId === template.id
              ? {
                  ...item,
                  x: newX + (item.x - oldX) * ratio,
                  y: newY + (item.y - oldY) * ratio,
                  width: item.width * ratio,
                  height: item.height * ratio,
                  ...(item.fontSize ? { fontSize: item.fontSize * ratio } : {}),
                }
              : item,
          ),
        };
      } else if (template) {
        const validSlots = new Set(template.layout.slots.map((slot) => slot.id));
        const used = new Set<string>();
        const cleaned = document.items.filter((item) => {
          if (!item.slotId || item.slotId === 'template-heading') return true;
          if (!validSlots.has(item.slotId)) return !isTemplatePlaceholder(item);
          if (
            isTemplatePlaceholder(item) &&
            document.items.some(
              (other) =>
                other.id !== item.id &&
                other.slotId === item.slotId &&
                !isTemplatePlaceholder(other),
            )
          )
            return false;
          if (used.has(item.slotId)) return !isTemplatePlaceholder(item);
          used.add(item.slotId);
          return true;
        });
        document = {
          ...document,
          items: cleaned.map((item) => {
            if (item.slotId === 'template-heading')
              return {
                ...item,
                x: document.width * 0.028,
                y: document.height * 0.022,
                width: document.width * 0.944,
                height: document.height * 0.07,
                fontSize: Math.max(
                  16,
                  48 * Math.min(document.width / 1080, document.height / 1350),
                ),
              };
            const slot = template.layout.slots.find((slot) => slot.id === item.slotId);
            if (!slot) return item;
            const bounds = fitTemplateLayout(template.layout, document).get(slot.id)!;
            return {
              ...item,
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              rotation: slot.rotation || 0,
            };
          }),
        };
      }
    }
    const measured = document.items.map((item) => {
      if (item.kind !== 'text' || item.curve) return item;
      const text = new Konva.Text({
        text: item.text || '',
        width: Math.max(10, item.width),
        fontSize: item.fontSize || 34,
        fontFamily: fontFamily(item.fontFamily),
        fontStyle: `${item.bold ? 'bold' : item.fontWeight || 'normal'}${item.italic ? ' italic' : ''}`,
        lineHeight: item.lineHeight || 1,
        padding: item.textPadding || 0,
        letterSpacing: item.letterSpacing || 0,
      });
      const height = Math.max(item.height, Math.ceil(text.height()));
      text.destroy();
      return height === item.height ? item : { ...item, height };
    });
    const normalized = this.snapToEdges ? constrainItems(measured, document) : measured;
    const connected = updateConnectors(normalized);
    const next = {
      ...document,
      items: this.snapToEdges ? constrainItems(connected, document) : connected,
    };
    if (next.pages && next.activePageId) {
      const { width, height, color, gradient, gradientType, background, items } = next;
      next.pages = next.pages.map((page) =>
        page.id === next.activePageId
          ? { id: page.id, width, height, color, gradient, gradientType, background, items }
          : page,
      );
    }
    this.history.commit(next);
    this.persist();
    this.changed();
  }
  async applyReferenceTemplate(layout: ReferenceLayout, revision: number) {
    if (revision !== this.history.revision)
      throw new Error('The board changed. Analyze again before applying.');
    const items = compileReference(layout, () => this.id());
    for (const item of items) if (item.asset) await this.decode(item.asset);
    if (revision !== this.history.revision)
      throw new Error('The board changed. Analyze again before applying.');
    this.commit({
      ...this.history.document,
      width: layout.width,
      height: layout.height,
      color: layout.background,
      background: undefined,
      gradient: undefined,
      items,
    });
    this.select([]);
    this.fitBoard();
  }
  addPage() {
    const doc = this.history.document,
      id = this.id(),
      original = doc.activePageId || this.id(),
      pages = doc.pages || [
        {
          id: original,
          width: doc.width,
          height: doc.height,
          color: doc.color,
          gradient: doc.gradient,
          gradientType: doc.gradientType,
          background: doc.background,
          items: doc.items,
        },
      ],
      page = { id, width: doc.width, height: doc.height, color: '#fffaf6', items: [] };
    this.groupScope = [];
    this.commit({ ...doc, ...page, pages: [...pages, page], activePageId: id });
    this.select([]);
  }
  switchPage(id: string) {
    const doc = this.history.document,
      page = doc.pages?.find((page) => page.id === id);
    if (!page || doc.activePageId === id) return;
    this.groupScope = [];
    this.cropDraft = undefined;
    this.commit({
      ...doc,
      width: page.width,
      height: page.height,
      color: page.color,
      gradient: page.gradient,
      gradientType: page.gradientType,
      background: page.background,
      items: page.items,
      activePageId: id,
    });
    this.select([]);
    this.fitBoard();
  }
  deletePage() {
    const doc = this.history.document;
    if (!doc.pages || doc.pages.length < 2) return;
    const pages = doc.pages.filter((page) => page.id !== doc.activePageId),
      page = pages[0];
    this.groupScope = [];
    this.commit({
      ...doc,
      width: page.width,
      height: page.height,
      color: page.color,
      gradient: page.gradient,
      gradientType: page.gradientType,
      background: page.background,
      items: page.items,
      pages,
      activePageId: page.id,
    });
    this.select([]);
  }
  private items(update: (items: BoardItem[]) => BoardItem[]) {
    this.commit({ ...this.history.document, items: update(this.history.document.items) });
  }
  private reconcileHistory() {
    const doc = this.history.document;
    if (this.snapToEdges) {
      const items = constrainItems(doc.items, doc);
      this.history.document = {
        ...doc,
        items,
        pages: doc.pages?.map((page) => (page.id === doc.activePageId ? { ...page, items } : page)),
      };
    }
    if (this.groupScope.length && !this.history.document.items.some((item) => this.inScope(item)))
      this.groupScope = [];
    this.cropDraft = undefined;
    this.persist();
    this.select(this.selectedIds);
  }
  undo() {
    this.history.undo();
    this.reconcileHistory();
  }
  redo() {
    this.history.redo();
    this.reconcileHistory();
  }
  path(item: BoardItem) {
    return item.groupPath || (item.groupId ? [item.groupId] : []);
  }
  unitKey(item: BoardItem) {
    return this.path(item)[this.groupScope.length] || item.id;
  }
  reorderLayer(source: string, target: string, parent: string[]) {
    const belongs = (item: BoardItem, key: string) =>
      parent.every((id, index) => this.path(item)[index] === id) &&
      (this.path(item)[parent.length] || item.id) === key;
    const doc = this.history.document,
      moving = doc.items.filter((item) => belongs(item, source));
    if (source === target || !moving.length || !doc.items.some((item) => belongs(item, target)))
      return;
    const rest = doc.items.filter((item) => !moving.includes(item)),
      index = rest.findIndex((item) => belongs(item, target));
    rest.splice(index, 0, ...moving);
    this.commit({ ...doc, items: rest });
  }
  enterGroup(id: string) {
    const item = this.history.document.items.find((item) => item.id === id);
    if (!item) return;
    const path = this.path(item);
    if (path.length > this.groupScope.length) {
      this.groupScope = path.slice(0, this.groupScope.length + 1);
      this.selectedIds = [];
      this.changed();
    }
  }
  exitGroup() {
    this.groupScope = this.groupScope.slice(0, -1);
    this.selectedIds = [];
    this.changed();
  }
  inScope(item: BoardItem) {
    return this.groupScope.every((id, index) => this.path(item)[index] === id);
  }
  select(ids: string[]) {
    if (this.cropDraft && !ids.includes(this.cropDraft.id)) this.cropDraft = undefined;
    const items = this.history.document.items;
    const keys = new Set(
      items
        .filter((item) => ids.includes(item.id) && this.inScope(item))
        .map((item) => this.unitKey(item)),
    );
    this.selectedIds = items
      .filter((item) => this.inScope(item) && keys.has(this.unitKey(item)))
      .map((item) => item.id);
    this.changed();
  }
  getSelection(): VisionSelection {
    const selected = this.history.document.items.filter((item) =>
      this.selectedIds.includes(item.id),
    );
    const item = selected[0];
    return {
      ids: selected.map((item) => item.id),
      count: selected.length,
      kind:
        selected.length > 1
          ? 'multiple'
          : !item
            ? 'none'
            : item.kind === 'text'
              ? 'text'
              : item.kind === 'shape'
                ? 'shape'
                : item.kind === 'drawing'
                  ? 'drawing'
                  : 'item',
      style: item
        ? {
            width: item.width,
            height: item.height,
            opacity: item.opacity * 100,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            strokeColor: item.color,
            textAlign: item.align,
          }
        : {},
    };
  }
  patchItems(patches: Array<{ id: string; patch: Partial<BoardItem> }>) {
    const locked = this.history.document.items.some(
      (item) => item.locked && patches.some((patch) => patch.id === item.id),
    );
    this.items((items) =>
      items.map((item) => {
        const patch = { ...patches.find((patch) => patch.id === item.id)?.patch };
        if (patch.text !== undefined && patch.text !== item.text && !('textRuns' in patch))
          patch.textRuns = undefined;
        if (locked) {
          delete patch.x;
          delete patch.y;
          delete patch.width;
          delete patch.height;
          delete patch.rotation;
        }
        return { ...item, ...patch };
      }),
    );
  }
  updateSelection(patch: VisionSelectionPatch) {
    this.patchItems(
      this.selectedIds.map((id) => ({
        id,
        patch: {
          ...(patch.width !== undefined ? { width: Math.max(10, patch.width) } : {}),
          ...(patch.height !== undefined ? { height: Math.max(10, patch.height) } : {}),
          ...(patch.opacity !== undefined
            ? { opacity: Math.max(0, Math.min(100, patch.opacity)) / 100 }
            : {}),
          ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
          ...(patch.fontFamily !== undefined ? { fontFamily: patch.fontFamily } : {}),
          ...(patch.strokeColor !== undefined ? { color: patch.strokeColor } : {}),
          ...(patch.textAlign !== undefined ? { align: patch.textAlign } : {}),
        },
      })),
    );
  }
  private async decode(asset: GratitudeAsset, record?: MediaRecord) {
    if (this.images.has(asset.assetUrl)) return;
    const image = new this.ownerWindow.Image();
    const local = asset.assetUrl.startsWith('media:')
      ? this.ownerWindow.URL.createObjectURL(
          (record || (await loadMedia(this.ownerWindow, asset.mediaId!))).working,
        )
      : undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Unable to load ${asset.title}`));
        image.src = local || asset.assetUrl;
      });
    } finally {
      if (local) this.ownerWindow.URL.revokeObjectURL(local);
    }
    this.images.set(asset.assetUrl, image);
  }
  async replaceImageFile(id: string, file: File) {
    const item = this.history.document.items.find((item) => item.id === id);
    if (!item || item.kind !== 'asset' || item.locked)
      throw new Error('Select an unlocked image to replace.');
    if (this.cropDraft || this.originalPreview)
      throw new Error('Apply or cancel image editing before replacing an image.');
    await this.uploadPhotos([file], undefined, id);
  }
  async uploadPhotos(files: File[], position?: VisionPoint, replaceId?: string) {
    if (!files.length) return;
    if (files.length > 20) throw new Error('Add up to 20 photos at a time.');
    const revision = this.history.revision,
      records: MediaRecord[] = [];
    const storage = this.ownerWindow.navigator.storage;
    if (storage?.estimate) {
      const estimate = await storage.estimate();
      if (
        estimate.quota &&
        estimate.quota - (estimate.usage || 0) < files.reduce((sum, file) => sum + file.size, 0) * 2
      )
        throw new Error('Not enough browser storage. Back up your board and use smaller photos.');
    }
    for (const file of files) {
      const record = await preparePhoto(this.ownerWindow, file);
      records.push(record);
      await this.decode(mediaAsset(record), record);
    }
    if (revision !== this.history.revision)
      throw new Error('The board changed while preparing photos. Please add them again.');
    try {
      await saveMedia(this.ownerWindow, records);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError')
        throw new Error('Browser storage is full. Back up your board and use smaller photos.', {
          cause: error,
        });
      throw error;
    }
    if (revision !== this.history.revision)
      throw new Error('The board changed while saving photos. Please add them again.');
    const board = this.history.document;
    const templatePhoto = replaceId
      ? board.items.find((item) => item.id === replaceId)
      : !position && records.length === 1 && this.selectedIds.length === 1
        ? board.items.find(
            (item) => item.id === this.selectedIds[0] && item.asset?.provider === 'template-photo',
          )
        : undefined;
    if (templatePhoto) {
      this.commit({
        ...board,
        items: board.items.map((item) =>
          item.id === templatePhoto.id
            ? {
                ...item,
                ...(item.asset?.frameSlot
                  ? { contentAsset: mediaAsset(records[0]) }
                  : { asset: mediaAsset(records[0]), contentAsset: undefined }),
                templatePlaceholder: false,
                crop: undefined,
                rendition: undefined,
                imageFit: 'fill',
              }
            : item,
        ),
      });
      this.select([templatePhoto.id]);
      return;
    }
    const items = records.map((record, index) => {
      const asset = mediaAsset(record),
        scale = Math.min(
          1,
          400 / Math.max(record.width, record.height),
          board.width / record.width,
          board.height / record.height,
        );
      const width = record.width * scale,
        height = record.height * scale;
      return {
        id: this.id(),
        kind: 'asset' as const,
        asset,
        x: (position?.x ?? board.width / 2) - width / 2 + index * 18,
        y: (position?.y ?? board.height / 2) - height / 2 + index * 18,
        width,
        height,
        rotation: 0,
        opacity: 1,
      };
    });
    this.commit({ ...board, items: [...board.items, ...items] });
    this.select(items.map((item) => item.id));
    if (storage?.persist) void storage.persist().catch(() => {});
  }
  async downloadOriginalPhoto() {
    const item = this.history.document.items.find((item) => item.id === this.selectedIds[0]),
      asset = item?.contentAsset || item?.asset;
    if (this.selectedIds.length !== 1 || asset?.provider !== 'upload' || !asset.mediaId)
      throw new Error('Select one uploaded photo.');
    const record = await loadMedia(this.ownerWindow, asset.mediaId),
      url = this.ownerWindow.URL.createObjectURL(record.original);
    this.download(url, record.name);
    this.ownerWindow.setTimeout(() => this.ownerWindow.URL.revokeObjectURL(url), 1000);
  }
  async insertAsset(input: GratitudeAsset, position?: VisionPoint) {
    if (input.provider !== 'curated-v1')
      throw new Error('Only the uploaded curated pack is allowed.');
    const revision = this.history.revision;
    const asset = await curatedPackProvider.resolve(input.id, this.ownerWindow);
    await this.decode(asset);
    if (revision !== this.history.revision)
      throw new Error('The board changed while loading. Please insert the asset again.');
    if (asset.tags.includes('background')) {
      this.commit({ ...this.history.document, background: asset });
      return asset.id;
    }
    const width = Math.min(320, asset.width || 240);
    const height = (width * (asset.height || 240)) / (asset.width || 240);
    const id = this.id();
    this.items((items) => [
      ...items,
      {
        id,
        kind: 'asset',
        asset,
        x: position?.x ?? 100,
        y: position?.y ?? 160,
        width,
        height,
        rotation: 0,
        opacity: 1,
        groupPath: [...this.groupScope],
        groupId: this.groupScope[0],
      },
    ]);
    this.select([id]);
    return id;
  }
  async insertGeneratedImage(url: string, prompt: string, background = false) {
    if (!/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(url) || url.length > 16000000)
      throw new Error('Invalid generated image.');
    const revision = this.history.revision,
      id = this.id(),
      asset: GratitudeAsset = {
        id: `generated:${id}`,
        provider: 'generated',
        type: 'photo',
        title: prompt.slice(0, 80),
        tags: ['generated'],
        previewUrl: url,
        assetUrl: url,
        editable: { crop: true, filters: true },
        license: {
          tier: 'E',
          id: 'ai-generated',
          label: 'AI-generated; provider terms apply',
          attributionRequired: false,
          sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/',
        },
      };
    await this.decode(asset);
    if (revision !== this.history.revision)
      throw new Error('Board changed while loading generated image.');
    const image = this.images.get(url)!;
    asset.width = image.naturalWidth;
    asset.height = image.naturalHeight;
    if (background) {
      this.commit({ ...this.history.document, background: asset });
      this.select([]);
      return;
    }
    this.items((items) => [
      ...items,
      {
        id,
        kind: 'asset',
        asset,
        x: 100,
        y: 160,
        width: 400,
        height: (400 * asset.height!) / asset.width!,
        rotation: 0,
        opacity: 1,
        groupPath: [...this.groupScope],
        groupId: this.groupScope[0],
      },
    ]);
    this.select([id]);
  }
  async removeBackground() {
    const item = this.history.document.items.find(
        (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
      ),
      asset = item?.contentAsset || item?.asset;
    if (!item || !asset) throw new Error('Select an image first.');
    const revision = this.history.revision,
      image = this.images.get(item.rendition || asset.assetUrl);
    if (!image) throw new Error('Image is still loading.');
    const canvas = this.ownerWindow.document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image editing is unavailable.');
    ctx.drawImage(image, 0, 0);
    const result = await requestAI(this.ownerWindow, '/api/ai/remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: canvas.toDataURL('image/png') }),
    });
    if (
      typeof result.image !== 'string' ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.image)
    )
      throw new Error('Invalid cutout image.');
    await this.decode({ ...asset, assetUrl: result.image });
    if (revision !== this.history.revision)
      throw new Error('Board changed while removing background.');
    this.patchItems([{ id: item.id, patch: { rendition: result.image } }]);
  }
  editingSource() {
    const item = this.history.document.items.find(
        (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
      ),
      asset = item?.contentAsset || item?.asset;
    if (!item || !asset) throw new Error('Select an image to edit.');
    const image = this.images.get(item.rendition || asset.assetUrl);
    if (!image) throw new Error('Image is still loading.');
    const canvas = this.ownerWindow.document.createElement('canvas'),
      ratio = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing is unavailable.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      image: canvas.toDataURL('image/png'),
      id: item.id,
      revision: this.history.revision,
      width: canvas.width,
      height: canvas.height,
    };
  }
  async applyEditedImage(id: string, revision: number, url: string) {
    if (revision !== this.history.revision)
      throw new Error('Board changed since the preview was generated. Regenerate before applying.');
    const item = this.history.document.items.find((item) => item.id === id),
      asset = item?.contentAsset || item?.asset;
    if (
      !asset ||
      !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url) ||
      url.length > 16000000
    )
      throw new Error('Invalid edited image.');
    await this.decode({ ...asset, assetUrl: url });
    if (revision !== this.history.revision) throw new Error('Board changed while applying edits.');
    this.patchItems([{ id, patch: { rendition: url } }]);
  }
  async splitImageLayers() {
    const source = this.editingSource(),
      item = this.history.document.items.find((item) => item.id === source.id)!;
    if (item.asset?.frameSlot || item.frameShape)
      throw new Error('Detach frame content before splitting layers.');
    const asset = item.contentAsset || item.asset!;
    const cut = await requestAI(this.ownerWindow, '/api/ai/remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: source.image }),
    });
    if (
      typeof cut.image !== 'string' ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(cut.image)
    )
      throw new Error('Invalid foreground image.');
    await this.decode({ ...asset, assetUrl: cut.image });
    const canvas = this.ownerWindow.document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Layer extraction is unavailable.');
    context.drawImage(this.images.get(cut.image)!, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const value = pixels.data[index + 3] > 20 ? 255 : 0;
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const background = await requestAI(this.ownerWindow, '/api/ai/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: source.image,
        mask: canvas.toDataURL('image/png'),
        prompt:
          'Remove the foreground subject. Reconstruct the continuous natural background with matching lighting and texture. No foreground objects.',
      }),
    });
    if (
      typeof background.image !== 'string' ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(background.image)
    )
      throw new Error('Invalid reconstructed background.');
    await this.decode({ ...asset, assetUrl: background.image });
    if (source.revision !== this.history.revision)
      throw new Error('Board changed while extracting layers.');
    const group = this.id(),
      path = [...this.path(item), group],
      back = this.id(),
      front = this.id();
    this.items((items) =>
      items.flatMap((other) =>
        other.id === item.id
          ? [
              {
                ...item,
                id: back,
                asset,
                contentAsset: undefined,
                rendition: background.image,
                groupPath: path,
                groupId: path[0],
              },
              {
                ...item,
                id: front,
                asset,
                contentAsset: undefined,
                rendition: cut.image,
                groupPath: path,
                groupId: path[0],
              },
            ]
          : [other],
      ),
    );
    this.select([front]);
  }
  async matchImageStyle() {
    const selected = this.history.document.items.filter(
      (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
    );
    if (selected.length !== 2)
      throw new Error(
        'Select two images: the lower layer is the target, the upper layer is the reference.',
      );
    const revision = this.history.revision,
      canvas = this.ownerWindow.document.createElement('canvas'),
      context = canvas.getContext('2d');
    if (!context) throw new Error('Style matching unavailable.');
    const data = selected.map((item) => {
      const image = this.images.get(item.rendition || (item.contentAsset || item.asset)!.assetUrl)!;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    });
    const statistics = (pixels: ImageData) => {
      const mean = [0, 0, 0],
        variance = [0, 0, 0];
      let count = 0;
      for (let i = 0; i < pixels.data.length; i += 4) {
        if (pixels.data[i + 3] < 20) continue;
        count++;
        for (let c = 0; c < 3; c++) mean[c] += pixels.data[i + c];
      }
      for (let c = 0; c < 3; c++) mean[c] /= Math.max(1, count);
      for (let i = 0; i < pixels.data.length; i += 4) {
        if (pixels.data[i + 3] < 20) continue;
        for (let c = 0; c < 3; c++) variance[c] += (pixels.data[i + c] - mean[c]) ** 2;
      }
      return { mean, std: variance.map((value) => Math.sqrt(value / Math.max(1, count))) };
    };
    const target = statistics(data[0]),
      reference = statistics(data[1]),
      pixels = data[0];
    for (let i = 0; i < pixels.data.length; i += 4)
      for (let c = 0; c < 3; c++)
        pixels.data[i + c] =
          ((pixels.data[i + c] - target.mean[c]) * Math.max(1, reference.std[c])) /
            Math.max(1, target.std[c]) +
          reference.mean[c];
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    context.putImageData(pixels, 0, 0);
    const url = canvas.toDataURL('image/png');
    await this.applyEditedImage(selected[0].id, revision, url);
  }
  async upscaleImage() {
    const item = this.history.document.items.find(
        (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
      ),
      asset = item?.contentAsset || item?.asset;
    if (!item || !asset) return;
    const image = this.images.get(item.rendition || asset.assetUrl);
    if (!image) return;
    const revision = this.history.revision,
      canvas = this.ownerWindow.document.createElement('canvas');
    canvas.width = Math.min(4096, image.naturalWidth * 2);
    canvas.height = Math.min(4096, image.naturalHeight * 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image editing unavailable.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/png');
    await this.decode({ ...asset, assetUrl: url });
    if (revision !== this.history.revision) throw new Error('Board changed while upscaling.');
    this.patchItems([{ id: item.id, patch: { rendition: url } }]);
  }
  async upscaleAI() {
    const item = this.history.document.items.find(
        (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
      ),
      asset = item?.contentAsset || item?.asset;
    if (!item || !asset) throw new Error('Select an image first.');
    const revision = this.history.revision,
      image = this.images.get(item.rendition || asset.assetUrl);
    if (!image) throw new Error('Image is still loading.');
    const canvas = this.ownerWindow.document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing unavailable.');
    context.drawImage(image, 0, 0);
    const result = await requestAI(this.ownerWindow, '/api/ai/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: canvas.toDataURL('image/png') }),
    });
    await this.applyEditedImage(item.id, revision, result.image);
  }
  async recolorAsset(from: string, to: string) {
    if (
      (!/^#[\da-f]{6}$/i.test(from) && from.toLowerCase() !== 'currentcolor') ||
      !/^#[\da-f]{6}$/i.test(to)
    )
      throw new Error('Invalid graphic color.');
    const item = this.history.document.items.find((item) => this.selectedIds.includes(item.id)),
      asset = item?.asset;
    if (
      !item ||
      asset?.provider !== 'curated-v1' ||
      !asset.editable.colors ||
      !asset.assetUrl.startsWith('data:image/svg+xml,')
    )
      throw new Error('This graphic cannot be recolored.');
    const revision = this.history.revision,
      overrides = { ...item.colorOverrides, [from.toLowerCase()]: to },
      source = decodeURIComponent(asset.assetUrl.slice('data:image/svg+xml,'.length));
    const svg = source.replace(
      /(fill|stroke)="(#[\da-f]{6}|currentColor)"/gi,
      (match, attribute: string, color: string) =>
        overrides[color.toLowerCase()] ? `${attribute}="${overrides[color.toLowerCase()]}"` : match,
    );
    const edited = { ...asset, assetUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` };
    await this.decode(edited);
    const image = this.images.get(edited.assetUrl)!;
    const canvas = this.ownerWindow.document.createElement('canvas');
    canvas.width = (asset.width || 200) * 2;
    canvas.height = (asset.height || 200) * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Graphic editing unavailable.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const rendition = canvas.toDataURL('image/png');
    await this.decode({ ...asset, assetUrl: rendition });
    if (revision !== this.history.revision) throw new Error('Board changed while recoloring.');
    this.patchItems([{ id: item.id, patch: { rendition, colorOverrides: overrides } }]);
  }
  async composeBoard(
    title: string,
    goals: string[],
    theme = 'minimal',
    visuals?: GeneratedBoardVisuals,
  ) {
    const revision = this.history.revision;
    if (visuals && (visuals.images.length !== goals.length || !goals.length))
      throw new Error('Generate all board images before applying the composition.');
    const search = visuals
        ? { items: [] }
        : await curatedPackProvider.search({ limit: 250 }, this.ownerWindow),
      candidates = search.items.filter((asset) => asset.category === 'goal-objects');
    const assets: GratitudeAsset[] = visuals
      ? visuals.images.map(({ image, prompt }) => {
          if (
            !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(image) ||
            image.length > 16000000
          )
            throw new Error('Invalid generated board image.');
          return {
            id: `generated:${this.id()}`,
            provider: 'generated',
            type: 'photo',
            title: prompt.slice(0, 80),
            tags: ['generated'],
            previewUrl: image,
            assetUrl: image,
            editable: { crop: true, filters: true },
            license: {
              tier: 'E',
              id: 'ai-generated',
              label: 'AI-generated; provider terms apply',
              attributionRequired: false,
            },
          };
        })
      : goals
          .slice(0, 8)
          .map(
            (goal) =>
              candidates.find((asset) =>
                asset.tags.some((tag) => goal.toLowerCase().includes(tag.toLowerCase())),
              ) || candidates[goals.indexOf(goal) % candidates.length],
          );
    for (const asset of assets) await this.decode(asset);
    if (revision !== this.history.revision)
      throw new Error('Board changed while building the composition.');
    const doc = this.history.document,
      items: BoardItem[] = [
        {
          id: this.id(),
          kind: 'text',
          text: title,
          fontFamily: 'assistant',
          fontSize: 58,
          bold: true,
          color: visuals?.palette?.text || '#49375e',
          align: 'center',
          x: 40,
          y: 30,
          width: doc.width - 80,
          height: 100,
          rotation: 0,
          opacity: 1,
        },
      ];
    const columns = doc.width > doc.height ? 3 : 2,
      rows = Math.ceil(assets.length / columns),
      w = (doc.width - 100) / columns,
      h = (doc.height - 200) / Math.max(1, rows);
    assets.forEach((asset, index) => {
      const x = 40 + (index % columns) * w,
        y = 150 + Math.floor(index / columns) * h,
        group = this.id();
      items.push(
        {
          id: this.id(),
          kind: 'shape',
          shape: 'rectangle',
          x,
          y,
          width: w - 20,
          height: h - 20,
          fill:
            visuals?.palette?.card ||
            (theme === 'dark' ? '#ece1f9' : theme === 'scrapbook' ? '#fff2ca' : '#fff'),
          radius: theme === 'scrapbook' ? 0 : 18,
          rotation: 0,
          opacity: 1,
          shadow: 'soft',
          groupId: this.groupScope[0] || group,
          groupPath: [...this.groupScope, group],
        },
        {
          id: this.id(),
          kind: 'asset',
          asset,
          imageFit: visuals ? 'fill' : 'fit',
          x: x + 25,
          y: y + 20,
          width: w - 70,
          height: Math.max(40, h - 140),
          rotation: 0,
          opacity: 1,
          groupId: this.groupScope[0] || group,
          groupPath: [...this.groupScope, group],
        },
        {
          id: this.id(),
          kind: 'text',
          text: goals[index],
          fontFamily: 'assistant',
          fontSize: 28,
          color: visuals?.palette?.text || '#49375e',
          align: 'center',
          x: x + 15,
          y: y + h - 110,
          width: w - 50,
          height: 80,
          rotation: 0,
          opacity: 1,
          groupId: this.groupScope[0] || group,
          groupPath: [...this.groupScope, group],
        },
      );
    });
    this.groupScope = [];
    this.commit({
      ...doc,
      title,
      color:
        visuals?.palette?.background ||
        (theme === 'dark' ? '#25263a' : theme === 'scrapbook' ? '#f7e9d3' : '#f4effb'),
      background: undefined,
      gradient: undefined,
      items,
    });
    this.select([]);
  }
  async composeGeneratedBoard(title: string, goals: string[], visuals: GeneratedBoardVisuals) {
    if (!visuals?.images?.length || visuals.images.length !== goals.length)
      throw new Error(
        'The generated board images are missing. Regenerate the preview before applying.',
      );
    await this.composeBoard(title, goals, 'minimal', visuals);
  }
  async createImage(
    _blob: Blob,
    _ownerWindow: Window & typeof globalThis,
    sourceAsset?: GratitudeAsset,
    position?: VisionPoint,
  ) {
    if (!sourceAsset) throw new Error('Only curated assets are supported in this build.');
    return this.insertAsset(sourceAsset, position);
  }
  async replaceSelectedImage(
    _blob: Blob,
    _ownerWindow: Window & typeof globalThis,
    sourceAsset?: GratitudeAsset,
  ): Promise<string | null> {
    if (!sourceAsset) throw new Error('Choose curated or generated media.');
    return this.replaceAsset(sourceAsset.id);
  }
  async replaceAsset(assetId: string) {
    const item = this.history.document.items.find(
      (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
    );
    if (!item) return null;
    const revision = this.history.revision,
      asset = await this.resolveBoardAsset(assetId);
    await this.decode(asset);
    if (revision !== this.history.revision) throw new Error('Board changed while replacing media.');
    this.patchItems([
      {
        id: item.id,
        patch: {
          asset,
          contentAsset: undefined,
          crop: undefined,
          rendition: undefined,
          colorOverrides: undefined,
        },
      },
    ]);
    return item.id;
  }
  private async resolveBoardAsset(assetId: string) {
    const generated = this.history.document.items
      .flatMap((item) => [item.asset, item.contentAsset])
      .find(
        (asset) =>
          asset?.id === assetId && (asset.provider === 'generated' || asset.provider === 'upload'),
      );
    return generated || curatedPackProvider.resolve(assetId, this.ownerWindow);
  }
  async updateImageEdits(patch: Partial<VisionImageEdits>) {
    this.patchItems(
      this.history.document.items
        .filter((item) => this.selectedIds.includes(item.id) && item.kind === 'asset')
        .map((item) => ({
          id: item.id,
          patch: {
            ...('brightness' in patch ? { brightness: patch.brightness } : {}),
            ...('contrast' in patch ? { contrast: patch.contrast } : {}),
            ...('saturation' in patch ? { saturation: patch.saturation } : {}),
            ...('blur' in patch ? { blur: patch.blur } : {}),
            ...('flipX' in patch ? { flipX: patch.flipX } : {}),
            ...('flipY' in patch ? { flipY: patch.flipY } : {}),
            ...('borderWidth' in patch ? { borderWidth: patch.borderWidth } : {}),
            ...('borderColor' in patch ? { borderColor: patch.borderColor } : {}),
          },
        })),
    );
  }
  async resetImageEdits() {
    this.patchItems(
      this.selectedIds.map((id) => ({
        id,
        patch: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          blur: 0,
          warmth: 0,
          tint: 0,
          filter: 'original',
          effect: 'none',
          rendition: undefined,
          colorOverrides: undefined,
          crop: undefined,
          flipX: false,
          flipY: false,
        },
      })),
    );
  }
  originalPreview = false;
  previewOriginalImage(show: boolean) {
    this.originalPreview = show;
    this.changed();
  }
  startImageCrop() {
    const item = this.history.document.items.find(
      (item) => this.selectedIds.includes(item.id) && item.kind === 'asset',
    );
    if (item) {
      this.cropDraft = { id: item.id, crop: item.crop || { x: 0, y: 0, width: 1, height: 1 } };
      this.changed();
    }
  }
  setImageFit(mode: 'fit' | 'fill') {
    this.patchItems(
      this.selectedIds.map((id) => ({ id, patch: { imageFit: mode, crop: undefined } })),
    );
  }
  rotateSelection(degrees: number) {
    if (
      this.history.document.items.some((item) => this.selectedIds.includes(item.id) && item.locked)
    )
      return;
    const chosen = this.history.document.items.filter(
      (item) => this.selectedIds.includes(item.id) && !item.locked,
    );
    if (!chosen.length) return;
    const box = unionBounds(chosen.map(boundsOf)),
      cx = box.x + box.width / 2,
      cy = box.y + box.height / 2,
      rad = (degrees * Math.PI) / 180;
    this.patchItems(
      chosen.map((item) => ({
        id: item.id,
        patch: {
          x: cx + (item.x - cx) * Math.cos(rad) - (item.y - cy) * Math.sin(rad),
          y: cy + (item.x - cx) * Math.sin(rad) + (item.y - cy) * Math.cos(rad),
          rotation: item.rotation + degrees,
        },
      })),
    );
  }
  delete(ids: string[]) {
    this.items((items) => items.filter((item) => !ids.includes(item.id)));
    this.select([]);
  }
  clearBoard() {
    this.groupScope = [];
    this.cropDraft = undefined;
    this.items(() => []);
    this.select([]);
  }
  createShape(shape: NonNullable<BoardItem['shape']>) {
    const id = this.id();
    const document = this.history.document;
    const baseWidth =
      shape === 'rectangle' || shape === 'cloud' || shape === 'line' || shape === 'arrow'
        ? 240
        : 200;
    const baseHeight =
      shape === 'line' || shape === 'arrow'
        ? 30
        : shape === 'cloud'
          ? 156
          : shape === 'rectangle'
            ? 160
            : 200;
    const factor = Math.min(
      1,
      (document.width * 0.5) / baseWidth,
      (document.height * 0.5) / baseHeight,
    );
    const width = baseWidth * factor,
      height = baseHeight * factor;
    this.items((items) => [
      ...items,
      {
        id,
        kind: 'shape',
        shape,
        x: (document.width - width) / 2,
        y: (document.height - height) / 2,
        width,
        height,
        color: '#b48ce3',
        fill: '#b48ce3',
        rotation: 0,
        opacity: 1,
        groupPath: [...this.groupScope],
        groupId: this.groupScope[0],
      },
    ]);
    this.select([id]);
  }
  connectSelection() {
    const selected = this.history.document.items.filter(
      (item) => this.selectedIds.includes(item.id) && !item.connector,
    );
    if (selected.length !== 2) throw new Error('Select exactly two individual objects to connect.');
    const id = this.id();
    this.items((items) => [
      ...items,
      {
        id,
        kind: 'shape',
        shape: 'arrow',
        connector: { from: selected[0].id, to: selected[1].id },
        x: 0,
        y: 0,
        width: 100,
        height: 10,
        color: '#573575',
        borderWidth: 3,
        rotation: 0,
        opacity: 1,
        groupPath: [...this.groupScope],
        groupId: this.groupScope[0],
      },
    ]);
    this.select([id]);
  }
  shapeAssist = false;
  createDrawing(points: number[], color: string, width: number, opacity = 1) {
    if (points.length < 4) return;
    const assisted = this.shapeAssist ? assistStroke(points) : { points, tension: 0.35 };
    const xs = assisted.points.filter((_, i) => i % 2 === 0),
      ys = assisted.points.filter((_, i) => i % 2 === 1),
      x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(1, Math.max(...xs) - x),
      h = Math.max(1, Math.max(...ys) - y),
      id = this.id();
    this.items((items) => [
      ...items,
      {
        id,
        kind: 'drawing',
        strokeTension: assisted.tension,
        x,
        y,
        width: w,
        height: h,
        points: assisted.points.map((n, i) => n - (i % 2 ? y : x)),
        color,
        strokeWidth: width,

        borderColor: color,

        rotation: 0,
        opacity,
        groupPath: [...this.groupScope],
        groupId: this.groupScope[0],
      },
    ]);
    this.select([id]);
  }
  cleanSelectedDrawings() {
    const patches = this.history.document.items
      .filter(
        (item) =>
          this.selectedIds.includes(item.id) &&
          item.kind === 'drawing' &&
          !item.locked &&
          item.points?.length,
      )
      .map((item) => {
        const assisted = assistStroke(item.points!);
        return { id: item.id, patch: { points: assisted.points, strokeTension: assisted.tension } };
      });
    if (patches.length) this.patchItems(patches);
  }
  createCard(text: string, context: 'goal' | 'affirmation' = 'goal') {
    if (!text.trim()) return;
    const group = this.id();
    const affirmation = context === 'affirmation';
    const width = Math.min(420, this.history.document.width * 0.8);
    const padding = 28;
    const measure = new Konva.Text({
      text,
      width: width - padding * 2,
      fontSize: 28,
      fontFamily: fontFamily(affirmation ? 'georgia' : 'assistant'),
      lineHeight: 1.2,
    });
    const textHeight = Math.ceil(measure.height());
    measure.destroy();
    const height = Math.max(340, textHeight + 235);
    const x = Math.max(0, (this.history.document.width - width) / 2);
    const y = Math.max(0, (this.history.document.height - height) / 2);
    const base = {
      rotation: 0,
      opacity: 1,
      groupId: this.groupScope[0] || group,
      groupPath: [...this.groupScope, group],
    };
    const label = this.id();
    const pieces: BoardItem[] = [
      {
        ...base,
        id: this.id(),
        kind: 'shape',
        shape: 'rectangle',
        x,
        y,
        width,
        height,
        color: affirmation ? '#faeaf0' : '#eaf2fb',
        radius: affirmation ? 32 : 12,
        borderWidth: 1,
        borderColor: affirmation ? '#edc8d9' : '#c5d8ed',
      },
      {
        ...base,
        id: this.id(),
        kind: 'text',
        text: affirmation ? 'A LITTLE LOVE FOR MYSELF' : 'THE FUTURE I?M BUILDING',
        x: x + padding,
        y: y + 92,
        width: width - padding * 2,
        height: 22,
        fontFamily: 'assistant',
        fontSize: 13,
        bold: true,
        letterSpacing: 2,
        align: affirmation ? 'center' : 'left',
        color: affirmation ? '#a45b7d' : '#4e7299',
      },
      {
        ...base,
        id: label,
        kind: 'text',
        text,
        x: x + padding,
        y: y + 130,
        width: width - padding * 2,
        height: textHeight,
        fontFamily: affirmation ? 'georgia' : 'assistant',
        fontSize: 28,
        lineHeight: 1.2,
        italic: affirmation,
        bold: !affirmation,
        align: affirmation ? 'center' : 'left',
        color: affirmation ? '#753d60' : '#244668',
      },
      {
        ...base,
        id: this.id(),
        kind: 'text',
        text: affirmation
          ? 'Breathe. Believe. Become.'
          : 'NEXT STEP  __________________\nWORKING TOWARDS IT, ONE DAY AT A TIME',
        x: x + padding,
        y: y + height - 70,
        width: width - padding * 2,
        height: 45,
        fontFamily: 'assistant',
        fontSize: 14,
        align: affirmation ? 'center' : 'left',
        color: affirmation ? '#a45b7d' : '#4e7299',
      },
    ];
    const decoration = (
      shape: BoardItem['shape'],
      dx: number,
      dy: number,
      w: number,
      h: number,
      color: string,
      extra: Partial<BoardItem> = {},
    ): BoardItem => ({
      ...base,
      id: this.id(),
      kind: 'shape',
      shape,
      x: x + dx,
      y: y + dy,
      width: w,
      height: h,
      color,
      ...extra,
    });
    if (affirmation) {
      pieces.splice(
        1,
        0,
        decoration('circle', width / 2 - 34, 20, 68, 68, '#f5d4e2'),
        decoration('heart', width / 2 - 20, 35, 40, 35, '#c8799d'),
        decoration('star', 24, height - 48, 16, 16, '#c4a4dc'),
        decoration('star', width - 45, 36, 20, 20, '#c4a4dc'),
        decoration('heart', width - 54, height - 47, 17, 15, '#df9dba'),
      );
    } else {
      pieces.splice(
        1,
        0,
        decoration('circle', padding, 22, 60, 60, '#c9dff5'),
        decoration('circle', padding + 9, 31, 42, 42, '#eaf2fb', {
          borderColor: '#4e7299',
          borderWidth: 2,
        }),
        decoration('circle', padding + 22, 44, 16, 16, '#4e7299'),
        decoration('arrow', padding + 29, 21, 37, 37, '#244668', {
          borderColor: '#244668',
          borderWidth: 3,
        }),
        decoration('rectangle', padding, height - 92, width - padding * 2, 6, '#ccdded', {
          radius: 3,
        }),
        decoration('rectangle', padding, height - 92, (width - padding * 2) * 0.15, 6, '#4e7299', {
          radius: 3,
        }),
      );
    }
    this.items((items) => [...items, ...pieces]);
    this.select([label]);
  }
  async attachFrameContent(assetId: string) {
    const item = this.history.document.items.find((item) => this.selectedIds.includes(item.id));
    const eligible =
      item?.kind === 'shape' &&
      ['rectangle', 'circle', 'triangle', 'heart', 'cloud', 'star'].includes(item.shape || '');
    if (!item || (!item.asset?.frameSlot && !eligible))
      throw new Error('Select a curated frame or eligible shape first.');
    const revision = this.history.revision,
      asset = await this.resolveBoardAsset(assetId);
    await this.decode(asset);
    if (revision !== this.history.revision)
      throw new Error('Board changed while loading frame content.');
    this.patchItems([
      {
        id: item.id,
        patch: eligible
          ? {
              kind: 'asset',
              asset,
              contentAsset: undefined,
              frameShape:
                item.shape === 'rectangle' ? undefined : (item.shape as BoardItem['frameShape']),
              noFill: false,
              crop: undefined,
              imageFit: 'fill',
              rendition: undefined,
              colorOverrides: undefined,
            }
          : {
              contentAsset: asset,
              crop: undefined,
              imageFit: 'fill',
              rendition: undefined,
              colorOverrides: undefined,
            },
      },
    ]);
  }
  detachFrameContent() {
    const item = this.history.document.items.find((item) => this.selectedIds.includes(item.id));
    if (!item?.contentAsset) return;
    const id = this.id();
    this.items((items) => [
      ...items.map((other) =>
        other.id === item.id
          ? {
              ...other,
              contentAsset: undefined,
              crop: undefined,
              rendition: undefined,
              colorOverrides: undefined,
              brightness: 0,
              contrast: 0,
              saturation: 0,
              blur: 0,
              warmth: 0,
              tint: 0,
              filter: 'original' as const,
            }
          : other,
      ),
      { ...item, id, asset: item.contentAsset, contentAsset: undefined },
    ]);
    this.select([id]);
  }
  duplicateSelection() {
    const groups = new Map<string, string>();
    const identities = new Map(this.selectedIds.map((id) => [id, this.id()]));
    const copies = this.history.document.items
      .filter((item) => this.selectedIds.includes(item.id))
      .map((item) => {
        if (item.groupId && !groups.has(item.groupId)) groups.set(item.groupId, this.id());
        const path = this.path(item).map((id, index) => {
          if (index < this.groupScope.length) return id;
          if (!groups.has(id)) groups.set(id, this.id());
          return groups.get(id)!;
        });
        return {
          ...structuredClone(item),
          id: identities.get(item.id)!,
          connector:
            item.connector &&
            identities.has(item.connector.from) &&
            identities.has(item.connector.to)
              ? {
                  from: identities.get(item.connector.from)!,
                  to: identities.get(item.connector.to)!,
                }
              : undefined,
          x: item.x + 24,
          y: item.y + 24,
          slotId: undefined,
          groupPath: path,
          groupId: path[0],
        };
      });
    this.items((items) => [...items, ...copies]);
    this.select(copies.map((item) => item.id));
  }
  groupSelection() {
    if (this.selectedIds.length < 2) return;
    const groupId = this.id();
    this.patchItems(
      this.history.document.items
        .filter((item) => this.selectedIds.includes(item.id))
        .map((item) => {
          const path = [
            ...this.groupScope,
            groupId,
            ...this.path(item).slice(this.groupScope.length),
          ];
          return { id: item.id, patch: { groupPath: path, groupId: path[0] } };
        }),
    );
  }
  ungroupSelection() {
    this.patchItems(
      this.history.document.items
        .filter((item) => this.selectedIds.includes(item.id))
        .map((item) => {
          const path = this.path(item).filter((_, index) => index !== this.groupScope.length);
          return { id: item.id, patch: { groupPath: path, groupId: path[0] } };
        }),
    );
  }
  toggleLock() {
    const chosen = this.history.document.items.filter((item) => this.selectedIds.includes(item.id));
    const locked = !chosen.every((item) => item.locked);
    this.patchItems(chosen.map((item) => ({ id: item.id, patch: { locked } })));
  }
  private selectionUnits() {
    const units = new Map<string, BoardItem[]>();
    for (const item of this.history.document.items.filter((item) =>
      this.selectedIds.includes(item.id),
    )) {
      const key = this.unitKey(item);
      units.set(key, [...(units.get(key) || []), item]);
    }
    return [...units.values()].map((items) => ({ items, box: unionBounds(items.map(boundsOf)) }));
  }
  alignSelection(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    const units = this.selectionUnits();
    if (!units.length || units.some((unit) => unit.items.some((item) => item.locked))) return;
    const document = this.history.document;
    const target =
      units.length === 1
        ? { x: 0, y: 0, width: document.width, height: document.height }
        : unionBounds(units.map((unit) => unit.box));
    this.patchItems(
      units.flatMap(({ items, box }) => {
        const dx =
          alignment === 'left'
            ? target.x - box.x
            : alignment === 'center'
              ? target.x + target.width / 2 - box.x - box.width / 2
              : alignment === 'right'
                ? target.x + target.width - box.x - box.width
                : 0;
        const dy =
          alignment === 'top'
            ? target.y - box.y
            : alignment === 'middle'
              ? target.y + target.height / 2 - box.y - box.height / 2
              : alignment === 'bottom'
                ? target.y + target.height - box.y - box.height
                : 0;
        return items.map((item) => ({ id: item.id, patch: { x: item.x + dx, y: item.y + dy } }));
      }),
    );
  }
  distributeSelection(axis: 'horizontal' | 'vertical') {
    const units = this.selectionUnits();
    if (units.length < 3 || units.some((unit) => unit.items.some((item) => item.locked))) return;
    const key = axis === 'horizontal' ? 'x' : 'y',
      size = axis === 'horizontal' ? 'width' : 'height';
    const sorted = units.sort((a, b) => a.box[key] - b.box[key]);
    const last = sorted[sorted.length - 1];
    const gap =
      (last.box[key] +
        last.box[size] -
        sorted[0].box[key] -
        sorted.reduce((sum, item) => sum + item.box[size], 0)) /
      (sorted.length - 1);
    let cursor = sorted[0].box[key];
    this.patchItems(
      sorted.flatMap(({ items, box }) => {
        const delta = cursor - box[key];
        cursor += box[size] + gap;
        return items.map((item) => ({ id: item.id, patch: { [key]: item[key] + delta } }));
      }),
    );
  }
  arrangeSelection(position: 'front' | 'back' | 'forward' | 'backward') {
    this.items((items) => {
      const scoped = items.filter((item) => this.inScope(item));
      const merge = (ordered: BoardItem[]) => {
        let index = 0;
        return items.map((item) => (this.inScope(item) ? ordered[index++] : item));
      };
      if (position === 'forward' || position === 'backward') {
        const units: BoardItem[][] = [];
        const groups = new Map<string, BoardItem[]>();
        for (const item of scoped) {
          const key = this.unitKey(item);
          if (key !== item.id) {
            let group = groups.get(key);
            if (!group) {
              group = [];
              groups.set(key, group);
              units.push(group);
            }
            group.push(item);
          } else units.push([item]);
        }
        const selected = (unit: BoardItem[]) =>
          unit.some((item) => this.selectedIds.includes(item.id));
        if (position === 'forward')
          for (let i = units.length - 2; i >= 0; i--) {
            if (selected(units[i]) && !selected(units[i + 1]))
              [units[i], units[i + 1]] = [units[i + 1], units[i]];
          }
        else
          for (let i = 1; i < units.length; i++) {
            if (selected(units[i]) && !selected(units[i - 1]))
              [units[i], units[i - 1]] = [units[i - 1], units[i]];
          }
        return merge(units.flat());
      }
      const chosen = scoped.filter((item) => this.selectedIds.includes(item.id));
      const rest = scoped.filter((item) => !this.selectedIds.includes(item.id));
      return merge(position === 'front' ? [...rest, ...chosen] : [...chosen, ...rest]);
    });
  }
  activateTool(tool: 'image' | 'note' | 'text') {
    if (tool !== 'text') return deferred();
    this.createTextPreset({
      id: 'text',
      label: 'Text',
      sample: 'My next chapter',
      category: 'minimal',
      fontFamily: 'helvetica',
      fontSize: 48,
      color: '#33272b',
    });
  }
  createTextPreset(preset: VisionTextPreset) {
    const id = this.id();
    const document = this.history.document;
    const text = new Konva.Text({
      text: preset.sample,
      fontSize: preset.fontSize,
      fontFamily: fontFamily(preset.fontFamily),
      padding: 8,
      lineHeight: 1.2,
    });
    const width = Math.min(document.width * 0.8, Math.max(40, Math.ceil(text.width())));
    text.width(width);
    const height = Math.ceil(text.height());
    text.destroy();
    this.items((items) => [
      ...items,
      {
        id,
        kind: 'text',
        text: preset.sample,
        fontFamily: preset.fontFamily,
        fontSize: preset.fontSize,
        color: preset.color,
        align: preset.align || 'center',
        textPadding: 8,
        lineHeight: 1.2,
        x: (document.width - width) / 2,
        y: (document.height - height) / 2,
        width,
        height,
        opacity: 1,
        rotation: 0,
        groupPath: [...this.groupScope],
        groupId: this.groupScope[0],
      },
    ]);
    this.select([id]);
  }
  applyLayout(layout: VisionLayout) {
    const document = this.history.document;
    let index = 0;
    const items = document.items.map((item) => {
      if (item.slotId === 'template-heading') return item;
      const slot = layout.slots[index++];
      if (!slot) return item;
      const bounds = getLayoutSlotBounds(
        slot,
        document.items.some((item) => item.slotId === 'template-heading'),
      );
      return {
        ...item,
        slotId: slot.id,
        x: bounds.x * document.width,
        y: bounds.y * document.height,
        width: bounds.width * document.width,
        height: bounds.height * document.height,
        rotation: slot.rotation || 0,
      };
    });
    this.commit({ ...document, items });
  }
  applyTemplate(template: VisionTemplate) {
    if (template.elements) return this.applyCollageTemplate(template);
    const document = this.history.document;
    let index = 0;
    const items = document.items
      .filter(
        (item) =>
          item.slotId !== 'template-heading' &&
          !isTemplatePlaceholder(item) &&
          (!item.slotId?.startsWith('collage:') || item.asset?.provider === 'upload'),
      )
      .map((item) => {
        if (item.kind === 'text' || item.kind === 'drawing' || item.connector) return item;
        const slot = template.layout.slots[index++];
        if (!slot) return { ...item, slotId: undefined };
        const bounds = fitTemplateLayout(template.layout, document).get(slot.id)!;
        return {
          ...item,
          slotId: slot.id,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          rotation: slot.rotation || 0,
        };
      });
    for (const slot of template.layout.slots.slice(index)) {
      const bounds = fitTemplateLayout(template.layout, document).get(slot.id)!;
      items.push({
        id: this.id(),
        kind: 'shape',
        shape: 'rectangle',
        slotId: slot.id,
        templatePlaceholder: true,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: slot.rotation || 0,
        opacity: 1,
        fill: `${template.accent}20`,
        color: `${template.accent}20`,
        borderColor: template.accent,
        borderWidth: 1,
      });
    }
    items.push({
      id: this.id(),
      kind: 'text',
      slotId: 'template-heading',
      templateId: template.id,
      text: template.heading,
      fontFamily: 'helvetica',
      fontSize: 48,
      color: template.accent,
      align: 'center',
      x: 30,
      y: 30,
      width: document.width - 60,
      height: 95,
      rotation: 0,
      opacity: 1,
    });
    this.commit({
      ...document,
      title: template.title,
      color: template.backgroundColor,
      background: undefined,
      items,
    });
    this.select([]);
  }
  private async applyCollageTemplate(template: VisionTemplate) {
    const revision = this.history.revision;
    await Promise.all(
      template.elements!.filter((item) => item.asset).map((item) => this.decode(item.asset!)),
    );
    if (revision !== this.history.revision)
      throw new Error('The board changed while preparing this template. Please try again.');
    const document = this.history.document;
    const pieces = fitCollageElements(template.elements!, document, template.canvas).map(
      (item, index) => ({
        ...item,
        id: this.id(),
        templateId: template.id,
        slotId: item.text === template.heading ? 'template-heading' : `collage:${index}`,
      }),
    );
    // Use the headline as the template marker even when its display copy differs.
    if (!pieces.some((item) => item.slotId === 'template-heading'))
      pieces.find((item) => item.kind === 'text')!.slotId = 'template-heading';
    const existing = document.items.filter(
      (item) =>
        item.slotId !== 'template-heading' &&
        (!item.slotId?.startsWith('collage:') || item.asset?.provider === 'upload') &&
        !isTemplatePlaceholder(item),
    );
    this.commit({
      ...document,
      title: template.title,
      color: template.backgroundColor,
      background: undefined,
      gradient: undefined,
      items: [...pieces, ...existing],
    });
    this.select([]);
    this.fitBoard();
  }
  fitBoard() {
    this.fit?.();
  }
  private download(data: string, filename: string, ownerDocument = this.ownerWindow.document) {
    const anchor = ownerDocument.createElement('a');
    anchor.href = data;
    anchor.download = filename;
    anchor.click();
  }
  private png(scale: number, selected = false) {
    if (!this.exporter) throw new Error('Canvas is not ready.');
    if (!Number.isFinite(scale) || scale < 1 || scale > 3)
      throw new Error('Export scale must be between 1 and 3.');
    return this.exporter(scale, selected);
  }
  exportImage() {
    this.download(this.png(1), 'vision-board.png');
  }
  async exportFormat(format: 'jpeg' | 'transparent' | 'pdf' | '4k' | 'pdf-all') {
    await this.ownerWindow.document.fonts.ready;
    if (!this.exporter) throw new Error('Canvas is not ready.');
    if (format === 'pdf-all') {
      if (this.cropDraft || this.originalPreview)
        throw new Error('Apply or cancel image editing before exporting.');
      const doc = structuredClone(this.history.document),
        pages = doc.pages || [{ ...doc, id: 'current' }],
        rendered = [];
      for (const page of pages) {
        const jpeg = await renderPage(this, page);
        rendered.push({
          jpeg: Uint8Array.from(this.ownerWindow.atob(jpeg.split(',')[1]), (char) =>
            char.charCodeAt(0),
          ),
          width: page.width,
          height: page.height,
        });
      }
      const pdf = imagesPdf(rendered),
        url = this.ownerWindow.URL.createObjectURL(
          new this.ownerWindow.Blob([pdf as BlobPart], { type: 'application/pdf' }),
        );
      this.download(url, 'vision-board-all-pages.pdf');
      this.ownerWindow.setTimeout(() => this.ownerWindow.URL.revokeObjectURL(url), 10000);
      return;
    }
    if (format === 'transparent') {
      this.download(this.exporter(1, false, true), 'vision-board-transparent.png');
      return;
    }
    if (format === '4k') {
      this.download(
        this.exporter(3840 / Math.max(this.history.document.width, this.history.document.height)),
        'vision-board-4k.png',
      );
      return;
    }
    const image = new this.ownerWindow.Image();
    image.src = this.png(1);
    await image.decode();
    const canvas = this.ownerWindow.document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image export is unavailable.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const jpeg = canvas.toDataURL('image/jpeg', 0.95);
    if (format === 'jpeg') {
      this.download(jpeg, 'vision-board.jpg');
      return;
    }
    const bytes = Uint8Array.from(this.ownerWindow.atob(jpeg.split(',')[1]), (char) =>
      char.charCodeAt(0),
    );
    const pdf = imagePdf(bytes, canvas.width, canvas.height);
    const url = this.ownerWindow.URL.createObjectURL(
      new this.ownerWindow.Blob([pdf as BlobPart], { type: 'application/pdf' }),
    );
    this.download(url, 'vision-board.pdf');
    this.ownerWindow.setTimeout(() => this.ownerWindow.URL.revokeObjectURL(url), 10000);
  }
  exportSelection() {
    this.download(this.png(1, true), 'selection.png');
  }
  async downloadHighResolution(ownerDocument: Document, scale = 2) {
    this.download(this.png(scale), 'vision-board.png', ownerDocument);
  }
  async downloadSelectedPrint(ownerDocument: Document, scale = 2) {
    this.download(this.png(scale, true), 'selection.png', ownerDocument);
  }
  async printBoard() {
    const source = this.png(2),
      popup = this.ownerWindow.open('', '_blank');
    if (!popup) throw new Error('Allow popups to print your board.');
    popup.document.title = this.history.document.title;
    const style = popup.document.createElement('style');
    style.textContent = 'body{margin:0}img{display:block;width:100%;height:auto}@page{margin:0}';
    popup.document.head.append(style);
    const image = popup.document.createElement('img');
    image.alt = this.history.document.title;
    image.onload = () => popup.print();
    image.src = source;
    popup.document.body.append(image);
  }
  downloadReelVideo = async (): Promise<void> => deferred();
  downloadReelPlan = deferred;
  downloadReel = deferred;
  downloadAttributions(ownerDocument: Document) {
    const document = this.history.document;
    const assets = [
      ...document.items.flatMap((item) =>
        [item.asset, item.contentAsset].filter((asset): asset is GratitudeAsset => !!asset),
      ),
      ...(document.background ? [document.background] : []),
    ];
    const unique = [...new Map(assets.map((asset) => [asset.id, asset])).values()];
    const credits = unique
      .map(
        (asset) =>
          `${asset.title}\n${asset.license.author || 'Original project artwork'}\n${asset.license.label}\n${asset.license.sourceUrl || ''}\n${asset.license.licenseUrl || ''}`,
      )
      .join('\n\n');
    this.download(
      `data:text/plain;charset=utf-8,${encodeURIComponent(credits || 'No media assets used.')}`,
      'credits.txt',
      ownerDocument,
    );
  }
}
