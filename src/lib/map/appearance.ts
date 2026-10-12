// Display-only band around the arbitrary Z=0 reference: 100 UE cm = 1 metre.
// Classification never rounds or alters source coordinates.
export const ZERO_HEIGHT_BAND = 100;
export function heightTone(z: number | null): 'below' | 'above' | 'neutral' | 'unknown' {
 if (z === null) return 'unknown';
 return z < -ZERO_HEIGHT_BAND ? 'below' : z > ZERO_HEIGHT_BAND ? 'above' : 'neutral';
}
export function heightColor(z: number | null): string {
 const tone = heightTone(z);
 return tone === 'below' ? '#379fad' : tone === 'above' ? '#83e7ee' : '#47dce9';
}
