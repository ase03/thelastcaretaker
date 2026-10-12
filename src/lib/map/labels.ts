import type { Frame } from './renderer';

type Rect = { left: number; top: number; width: number; height: number };
const intersects = (a: Rect, b: Rect) =>
 a.left < b.left + b.width + 6 && a.left + a.width + 6 > b.left &&
 a.top < b.top + b.height + 4 && a.top + a.height + 4 > b.top;

/** Screen-space decluttering only: the world record and marker position never change. */
export function placeLabels(markers: Frame['markers'], selectedId: string | undefined,
 width: number, height: number, measure: (name: string) => number) {
 const occupied: Rect[] = [
  { left: width - 220, top: 0, width: 220, height: 58 },
  { left: 0, top: height - 65, width, height: 65 }
 ];
 const placements = new Map<string, { visible: boolean; dx: number; dy: number; width: number }>();
 const ordered = [...markers].sort((a, b) =>
  Number(b.poi.id === selectedId) - Number(a.poi.id === selectedId) || a.poi.id.localeCompare(b.poi.id));
 for (const marker of ordered) {
  const labelWidth = Math.min(260, Math.max(30, width - 32), measure(marker.poi.name) + 12);
  const candidates = [
   { left: marker.x + 18, top: marker.y - 10, width: labelWidth, height: 24 },
   { left: marker.x - labelWidth - 18, top: marker.y - 10, width: labelWidth, height: 24 },
   { left: marker.x + 18, top: marker.y - 34, width: labelWidth, height: 24 },
   { left: marker.x + 18, top: marker.y + 14, width: labelWidth, height: 24 }
  ];
  const inView = (box: Rect) => box.left >= 4 && box.top >= 28 &&
   box.left + box.width <= width - 4 && box.top + box.height <= height - 65;
  let box = candidates.find(candidate => inView(candidate) &&
   !occupied.some(rect => intersects(candidate, rect)) &&
   !markers.some(other => other.poi.id !== marker.poi.id && intersects(candidate,
    { left: other.x - 7, top: other.y - 7, width: 14, height: 14 })));
  if (!box && marker.poi.id === selectedId) {
   box = { ...candidates[0], left: Math.max(4, Math.min(width - labelWidth - 4, candidates[0].left)),
    top: Math.max(28, Math.min(height - 89, candidates[0].top)) };
  }
  if (box) occupied.push(box);
  placements.set(marker.poi.id, { visible: !!box, dx: (box?.left ?? candidates[0].left) - marker.x,
   dy: (box?.top ?? candidates[0].top) - marker.y, width: labelWidth });
 }
 return markers.map(marker => ({ ...marker, label: placements.get(marker.poi.id)! }));
}
