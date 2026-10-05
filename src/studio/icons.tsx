import React from 'react';
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Aperture,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpFromLine,
  Baseline,
  Bold,
  Brush,
  CaseLower,
  CaseUpper,
  Check,
  ChevronDown,
  Circle,
  ClipboardPaste,
  Cloud,
  Contrast,
  Copy,
  Crop,
  Diamond,
  Download,
  Droplet,
  Eraser,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  FileUp,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Group,
  Hand,
  Heart,
  Hexagon,
  Highlighter,
  Image,
  ImagePlus,
  Info,
  Italic,
  Layers,
  LayoutTemplate,
  Link,
  Lock,
  LockOpen,
  Magnet,
  Maximize,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Move,
  Palette,
  PenLine,
  Plus,
  Printer,
  Redo2,
  Replace,
  RotateCw,
  Save,
  Scissors,
  Search,
  Shapes,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Strikethrough,
  Sun,
  Triangle,
  TriangleAlert,
  Trash2,
  Type,
  Underline,
  Undo2,
  Ungroup,
  Unlink,
  Upload,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { StudioTab } from './studioTypes';

/**
 * Single icon surface for the whole app. Every icon is a Lucide glyph on a
 * 24px grid with a consistent 1.8 stroke — no emoji, no text glyphs in chrome.
 */
function ic(Icon: LucideIcon, defaultSize = 18) {
  return function StudioIcon({
    size = defaultSize,
    strokeWidth = 1.8,
  }: {
    size?: number;
    strokeWidth?: number;
  }) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" />;
  };
}

/* Rail tabs */
export const TabIcon = ({ tab, size = 20 }: { tab: StudioTab; size?: number }) => {
  const map: Record<StudioTab, LucideIcon> = {
    templates: LayoutTemplate,
    elements: Sparkles,
    uploads: ImagePlus,
    text: Type,
    create: Shapes,
    background: Palette,
    ai: WandSparkles,
  };
  const Icon = map[tab];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
};

/* Brand */
export const VisionMark = ({ size = 26 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="#2f54eb" />
    <path
      d="M9 11.5 16 21l7-9.5"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="21" r="1.6" fill="#fff" />
  </svg>
);

/* Canvas tools */
export const SelectIcon = ic(MousePointer2);
export const HandIcon = ic(Hand);
export const PenIcon = ic(PenLine);
export const MarkerIcon = ic(Brush);
export const HighlighterIcon = ic(Highlighter);
export const EraserIcon = ic(Eraser);

/* Header / history */
export const UndoIcon = ic(Undo2);
export const RedoIcon = ic(Redo2);
export const PlusIcon = ic(Plus);
export const ExportIcon = ic(Upload);
export const ShareIcon = ic(Share2);
export const DotsIcon = ic(MoreHorizontal);
export const ArrowRightIcon = ic(ArrowRight, 15);
export const ChevronDownIcon = ic(ChevronDown, 14);
export const HeartIcon = ic(Heart, 15);
export const TypeIcon = ic(Type, 16);
export const CloseIcon = ic(X);
export const SaveIcon = ic(Save, 16);
export const RestoreIcon = ic(FolderOpen, 16);
export const BackupUpIcon = ic(FileUp, 16);
export const BackupDownIcon = ic(FileDown, 16);

/* Selection + inspector */
export const DuplicateIcon = ic(Copy);
export const TrashIcon = ic(Trash2);
export const LayersIcon = ic(Layers);
export const CropIcon = ic(Crop);
export const LockIcon = ic(Lock);
export const UnlockIcon = ic(LockOpen);
export const GroupIcon = ic(Group);
export const UngroupIcon = ic(Ungroup);
export const AlignIcon = ic(AlignCenter);
export const AlignLeftIcon = ic(AlignStartVertical);
export const AlignCenterHIcon = ic(AlignCenter);
export const AlignRightIcon = ic(AlignEndVertical);
export const AlignTopIcon = ic(AlignStartHorizontal);
export const AlignMiddleIcon = ic(AlignEndHorizontal);
export const DistributeHIcon = ic(AlignHorizontalDistributeCenter);
export const DistributeVIcon = ic(AlignVerticalDistributeCenter);
export const EyeIcon = ic(Eye, 16);
export const EyeOffIcon = ic(EyeOff, 16);
export const CheckIcon = ic(Check, 16);
export const PasteIcon = ic(ClipboardPaste);
export const SearchIcon = ic(Search, 16);
export const SlidersIcon = ic(SlidersHorizontal);
export const SparklesIcon = ic(Sparkles, 16);
export const UploadIcon = ic(Upload, 18);
export const FitIcon = ic(Maximize);
export const MinusIcon = ic(Minus);
export const DownloadIcon = ic(Download, 16);
export const PrinterIcon = ic(Printer, 16);
export const FileTextIcon = ic(FileText, 16);
export const AlertIcon = ic(TriangleAlert, 16);
export const InfoIcon = ic(Info, 16);
export const MagnetIcon = ic(Magnet, 14);

/* Text formatting */
export const BoldIcon = ic(Bold, 15);
export const ItalicIcon = ic(Italic, 15);
export const UnderlineIcon = ic(Underline, 15);
export const StrikeIcon = ic(Strikethrough, 15);
export const UppercaseIcon = ic(CaseUpper, 15);
export const LowercaseIcon = ic(CaseLower, 15);
export const BaselineIcon = ic(Baseline, 15);

/* Media */
export const ImageIcon = ic(Image, 16);
export const FlipHIcon = ic(FlipHorizontal2, 15);
export const FlipVIcon = ic(FlipVertical2, 15);
export const RotateIcon = ic(RotateCw, 15);
export const MoveIcon = ic(Move, 15);
export const SunIcon = ic(Sun, 15);
export const ContrastIcon = ic(Contrast, 15);
export const DropletIcon = ic(Droplet, 15);
export const WandIcon = ic(WandSparkles, 15);
export const ScissorsIcon = ic(Scissors, 15);
export const ReplaceIcon = ic(Replace, 15);
export const UnlinkIcon = ic(Unlink, 15);
export const LinkIcon = ic(Link, 15);
export const BringFrontIcon = ic(ArrowUpFromLine, 15);
export const SendBackIcon = ic(ArrowDownToLine, 15);
export const ForwardIcon = ic(ArrowUp, 15);
export const BackwardIcon = ic(ArrowDown, 15);
export const ZapIcon = ic(Zap, 15);
export const ApertureIcon = ic(Aperture, 15);

/* Shapes (Create panel previews) */
export const ShapeIcon = ({ shape, size = 22 }: { shape: string; size?: number }) => {
  const map: Record<string, LucideIcon> = {
    rectangle: Square,
    circle: Circle,
    triangle: Triangle,
    star: Star,
    heart: Heart,
    cloud: Cloud,
    blob: Droplet,
    burst: Zap,
    line: Minus,
    arrow: ArrowRight,
    diamond: Diamond,
    hexagon: Hexagon,
  };
  const Icon = map[shape] ?? Square;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
};

/* Legacy alias kept for any lingering import */
export const LogoIcon = VisionMark;
