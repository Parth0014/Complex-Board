import type { InterlockingDesign } from './interlockingGeometry';
export type Point = [number, number];
export interface Params {
  cuts: Record<string, number>;
  weights: number[];
  scale: number;
  shares: number[];
  inlayOffsets?: number[];
  outerOffsets?: number[];
}
export interface Divider {
  id: string;
  type: 'rail' | 'power' | 'shape' | 'outer';
  points: Point[];
  point: Point;
  normal: Point;
  cells: number[];
  label: string;
}
export interface Result {
  polygons: Point[][];
  dividers: Divider[];
}
export interface Model {
  initialParams: Params;
  type: string;
}
export function create(design: InterlockingDesign, count: number, ratio: number): Model;
export function build(model: Model, params: Params): Result;
export function move(
  model: Model,
  params: Params,
  divider: Divider,
  distance: number,
): Result & { params: Params; limited: boolean; distance: number };
export function valid(model: Model, result: Result): boolean;
export function area(p: Point[]): number;
export function bounds(p: Point[]): { x: number; y: number; w: number; h: number };
