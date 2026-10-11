import React from 'react';
import { shapeGeometry } from '../vision/shapeGeometry';
import { Glyph, type GlyphProps } from './icon-set/Glyph';
import type { GlyphName } from './icon-set/glyphs';
import type { StudioTab } from './studioTypes';

export { Glyph } from './icon-set/Glyph';
export type { GlyphName } from './icon-set/glyphs';

/**
 * Single icon surface for the whole app: the custom Atelier set (24px grid,
 * 1.5 stroke, round joins, soft duotone tint). Export names and props are
 * unchanged from the previous Lucide-based file, so no importer changes.
 */
type IconProps = { size?: number; strokeWidth?: number };

function ic(name: GlyphName, defaultSize = 18) {
  return function StudioIcon({ size = defaultSize, strokeWidth = 1.5 }: IconProps) {
    return <Glyph name={name} size={size} strokeWidth={strokeWidth} />;
  };
}

/* Rail tabs */
const TAB_GLYPHS: Record<StudioTab, GlyphName> = {
  templates: 'tab-templates',
  elements: 'tab-elements',
  uploads: 'tab-uploads',
  text: 'tab-text',
  create: 'tab-create',
  background: 'tab-background',
  ai: 'tab-ai',
};
export const TabIcon = ({ tab, size = 22 }: { tab: StudioTab; size?: number }) => (
  <Glyph name={TAB_GLYPHS[tab]} size={size} />
);

/* Brand: token-driven squircle with a "V" horizon and a saffron sun. */
export const VisionMark = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="1.5" y="1.5" width="29" height="29" rx="9" style={{ fill: 'var(--gs-accent)' }} />
    <path
      d="M8.5 11.5 16 22l7.5-10.5"
      style={{ stroke: 'var(--gs-surface)' }}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="23.2" cy="8.6" r="2.4" style={{ fill: 'var(--gs-saffron-500)' }} />
  </svg>
);

/* Canvas tools */
export const SelectIcon = ic('select');
export const HandIcon = ic('hand');
export const PenIcon = ic('pen');
export const MarkerIcon = ic('marker');
export const HighlighterIcon = ic('highlighter');
export const EraserIcon = ic('eraser');

/* Header / history */
export const UndoIcon = ic('undo');
export const RedoIcon = ic('redo');
export const PlusIcon = ic('plus');
export const ExportIcon = ic('upload');
export const ShareIcon = ic('share');
export const DotsIcon = ic('dots');
export const ArrowRightIcon = ic('arrow-right', 15);
export const ChevronDownIcon = ic('chevron-down', 14);
export const ChevronRightIcon = ic('chevron-right', 14);
export const HeartIcon = ic('heart', 15);
export const TypeIcon = ic('tab-text', 16);
export const CloseIcon = ic('close');
export const SaveIcon = ic('save', 16);
export const RestoreIcon = ic('restore', 16);
export const BackupUpIcon = ic('backup-up', 16);
export const BackupDownIcon = ic('backup-down', 16);

/* Selection + inspector */
export const DuplicateIcon = ic('duplicate');
export const DuplicateItemIcon = ic('duplicate-item');
export const TrashIcon = ic('trash');
export const LayersIcon = ic('layers');
export const CropIcon = ic('crop');
export const LockIcon = ic('lock');
export const UnlockIcon = ic('unlock');
export const GroupIcon = ic('group');
export const UngroupIcon = ic('ungroup');
export const AlignIcon = ic('align-center-h');
export const AlignLeftIcon = ic('align-left');
export const AlignCenterHIcon = ic('align-center-h');
export const AlignRightIcon = ic('align-right');
export const AlignTopIcon = ic('align-top');
export const AlignMiddleIcon = ic('align-middle');
export const AlignBottomIcon = ic('align-bottom');
export const DistributeHIcon = ic('distribute-h');
export const DistributeVIcon = ic('distribute-v');
export const EyeIcon = ic('eye', 16);
export const EyeOffIcon = ic('eye-off', 16);
export const CheckIcon = ic('check', 16);
export const PasteIcon = ic('paste');
export const SearchIcon = ic('search', 16);
export const SlidersIcon = ic('sliders');
export const SparklesIcon = ic('tab-elements', 16);
export const UploadIcon = ic('upload', 18);
export const FitIcon = ic('fit');
export const MinusIcon = ic('minus');
export const DownloadIcon = ic('download', 16);
export const PrinterIcon = ic('printer', 16);
export const FileTextIcon = ic('file-text', 16);
export const AlertIcon = ic('alert', 16);
export const InfoIcon = ic('info', 16);
export const MagnetIcon = ic('magnet', 14);

/* Text formatting */
export const BoldIcon = ic('bold', 15);
export const ItalicIcon = ic('italic', 15);
export const UnderlineIcon = ic('underline', 15);
export const StrikeIcon = ic('strike', 15);
export const UppercaseIcon = ic('uppercase', 15);
export const LowercaseIcon = ic('lowercase', 15);
export const BaselineIcon = ic('baseline', 15);

/* Media */
export const ImageIcon = ic('image', 16);
export const FlipHIcon = ic('flip-h', 15);
export const FlipVIcon = ic('flip-v', 15);
export const RotateIcon = ic('rotate', 15);
export const MoveIcon = ic('move', 15);
export const SunIcon = ic('sun', 15);
export const ContrastIcon = ic('contrast', 15);
export const DropletIcon = ic('droplet', 15);
export const WandIcon = ic('tab-ai', 15);
export const ScissorsIcon = ic('scissors', 15);
export const ReplaceIcon = ic('replace', 15);
export const UnlinkIcon = ic('unlink', 15);
export const LinkIcon = ic('link', 15);
export const BringFrontIcon = ic('bring-front', 15);
export const SendBackIcon = ic('send-back', 15);
export const ForwardIcon = ic('forward', 15);
export const BackwardIcon = ic('backward', 15);
export const ZapIcon = ic('zap', 15);
export const ApertureIcon = ic('aperture', 15);

/* Shapes (Create panel previews) */
const SHAPE_GLYPHS: Record<string, GlyphName> = {
  rectangle: 'shape-rectangle',
  circle: 'shape-circle',
  triangle: 'shape-triangle',
  star: 'shape-star',
  heart: 'shape-heart',
  cloud: 'shape-cloud',
  blob: 'shape-blob',
  burst: 'shape-burst',
  line: 'shape-line',
  arrow: 'shape-arrow',
  diamond: 'shape-diamond',
  hexagon: 'shape-hexagon',
};

export const ShapeIcon = ({ shape, size = 22 }: { shape: string; size?: number }) => {
  const geometry = shapeGeometry[shape];
  const previewHeight = shape === 'rectangle' ? (100 * 160) / 240 : shape === 'cloud' ? 65 : 100;
  if (geometry) {
    const d = geometry.path;
    const transform = `translate(0 ${(100 - previewHeight) / 2}) scale(${100 / geometry.width} ${previewHeight / geometry.height}) translate(${-geometry.x} ${-geometry.y})`;
    return (
      <svg
        width={size}
        height={size}
        viewBox="-8 -8 116 116"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={d}
          transform={transform}
          fill="currentColor"
          stroke="none"
          style={{ fillOpacity: 'var(--gs-glyph-tint, 0.16)' }}
        />
        <path d={d} transform={transform} vectorEffect="non-scaling-stroke" strokeWidth="1.8" />
      </svg>
    );
  }
  return <Glyph name={SHAPE_GLYPHS[shape] ?? 'shape-rectangle'} size={size} />;
};

/* Legacy alias kept for any lingering import */
export const LogoIcon = VisionMark;
export type { GlyphProps };
