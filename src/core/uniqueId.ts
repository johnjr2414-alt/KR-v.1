/**
 * Generates a unique identifier.
 *
 * `crypto.randomUUID` is only exposed in secure contexts (HTTPS or localhost),
 * so plain-HTTP LAN play and some embedded webviews fall back to a
 * timestamp/random composite. The fallback is suitable for local IDs such as
 * battle IDs and is not intended for cryptographic use.
 */
export function createUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
