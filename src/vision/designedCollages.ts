import type { GratitudeAsset } from '../assets/contracts';
import type { BoardItem } from './document';
import { create } from './structuredDividers';
import { interlockingDesigns } from './interlockingGeometry';
import { collageFrames } from './canvas/collageGeometry';

/** Each photo owns its visible polygon. Native items retain crop/replace/adjust. */
export function designedCollageItems(
  preset: string,
  assets: GratitudeAsset[],
  width: number,
  height: number,
  id: () => string,
): BoardItem[] {
  const frames = collageFrames(preset, assets.length, width, height);
  if (new Set(assets.map((asset) => asset.id)).size !== assets.length)
    throw new Error('Choose different photos.');
  const unit = Math.min(width, height);
  const params = create(
    interlockingDesigns.find((d) => `interlocking:${d.id}` === preset)!,
    assets.length,
    width / height,
  ).initialParams;
  let group = '';
  return frames.map((frame, slot) => {
    const itemId = id();
    group ||= itemId;
    const w = frame.w * width,
      h = frame.h * height;
    return {
      id: itemId,
      collageLayout: {
        version: 1,
        group,
        preset,
        slot,
        count: assets.length,
        width,
        height,
        params,
      },
      kind: 'asset',
      asset: assets[frame.photo],
      x: frame.x * width,
      y: frame.y * height,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      imageFit: 'fill',
      templatePlaceholder: false,
      borderColor: '#fffdf8',
      borderWidth: unit * 0.0021,
      shadow: 'none',
      scrapbookPhoto: {
        width: w,
        height: h,
        style: 'raw',
        colors: ['#e4e7df', '#e4e7df'],
        clip: frame.clip,
      },
    };
  });
}
