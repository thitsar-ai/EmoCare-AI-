/** iPhone SE / mini and similar — tighten typography and horizontal layout below this width. */
export const NARROW_PHONE_WIDTH = 390;

export function isNarrowPhone(width: number): boolean {
  return width < NARROW_PHONE_WIDTH;
}
