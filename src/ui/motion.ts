/**
 * True when the player asked the operating system to reduce motion.
 * Used to skip ambient Phaser tweens that CSS cannot disable.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
