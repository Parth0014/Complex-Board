export interface PaperEdge {
  width: number;
  color: string;
  outline?: import('./tornOutline').TornOutline;
}
import { validateTornOutline } from './tornOutline';

export function validatePaperEdge(value: unknown): asserts value is PaperEdge {
  const edge = value as PaperEdge;
  if (
    !edge ||
    typeof edge !== 'object' ||
    !Number.isFinite(edge.width) ||
    edge.width < 2 ||
    edge.width > 30 ||
    typeof edge.color !== 'string' ||
    !/^#[a-f0-9]{6}$/i.test(edge.color)
  )
    throw new Error('Invalid paper edge.');
  if (edge.outline !== undefined) validateTornOutline(edge.outline);
}

function noise(x: number, y: number, seed: number) {
  let n = Math.imul(x ^ seed, 374761393) ^ Math.imul(y + seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function softNoise(x: number, y: number, scale: number, seed: number) {
  const gx = Math.floor(x / scale),
    gy = Math.floor(y / scale);
  const tx = x / scale - gx,
    ty = y / scale - gy;
  const a = noise(gx, gy, seed),
    b = noise(gx + 1, gy, seed);
  const c = noise(gx, gy + 1, seed),
    d = noise(gx + 1, gy + 1, seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/** Distance from the actual alpha silhouette; transparent holes remain holes. */
export function paperEdgePixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  color: string,
  seed: number,
  roughness = 1,
): Uint8ClampedArray {
  const distance = new Float32Array(width * height);
  for (let i = 0; i < distance.length; i++) distance[i] = source[i * 4 + 3] > 48 ? 0 : 1e6;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1);
      if (y) {
        distance[i] = Math.min(distance[i], distance[i - width] + 1);
        if (x) distance[i] = Math.min(distance[i], distance[i - width - 1] + diagonal);
        if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i - width + 1] + diagonal);
      }
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + 1] + 1);
      if (y + 1 < height) {
        distance[i] = Math.min(distance[i], distance[i + width] + 1);
        if (x) distance[i] = Math.min(distance[i], distance[i + width - 1] + diagonal);
        if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + width + 1] + diagonal);
      }
    }
  const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  const output = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (distance[i] > radius * 1.3 + 2) continue;
      const grain = noise(x, y, seed);
      const broad = softNoise(x, y, Math.max(4, radius * 1.8), seed + 7);
      const tear = softNoise(x, y, 2.5, seed + 31);
      const limit =
        radius * (0.94 + (broad - 0.5) * 0.44 * roughness) +
        (tear - 0.5) * Math.min(4, radius * 0.5) * roughness;
      const coverage = Math.max(0, Math.min(1, limit - distance[i] + 0.65));
      if (!coverage) continue;
      const fiber = distance[i] > limit - 1.8;
      const texture = fiber ? 1 : 0.94 + grain * 0.06 + softNoise(x, y, 13, seed) * 0.025;
      for (let channel = 0; channel < 3; channel++)
        output[i * 4 + channel] = Math.min(255, rgb[channel] * texture);
      output[i * 4 + 3] = Math.round(coverage * 255);
    }
  return output;
}

export function renderPaperEdge(
  source: HTMLCanvasElement,
  ownerDocument: Document,
  edge: PaperEdge,
  seedText: string,
) {
  const padding = Math.ceil(edge.width * 1.3 + 2);
  const canvas = ownerDocument.createElement('canvas');
  canvas.width = source.width + padding * 2;
  canvas.height = source.height + padding * 2;
  const context = canvas.getContext('2d')!;
  context.drawImage(source, padding, padding);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const seed = [...seedText].reduce(
    (value, character) => (Math.imul(value, 31) + character.charCodeAt(0)) | 0,
    17,
  );
  data.data.set(
    paperEdgePixels(
      data.data,
      canvas.width,
      canvas.height,
      edge.width,
      edge.color,
      seed + (edge.outline?.seed || 0),
      edge.outline?.roughness ?? 1,
    ),
  );
  context.putImageData(data, 0, 0);
  return { canvas, padding };
}
