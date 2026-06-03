/** Trim and sanitize env values loaded from .env or app config. */
export function cleanEnvKey(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\uFEFF]/g, '');
}
