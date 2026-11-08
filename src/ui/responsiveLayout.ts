export interface ViewportDimension {
  width: number;
  height: number;
}

export type ScreenFormFactor = 'compact' | 'standard' | 'wide' | 'ultrawide';

/**
 * Pure helper function to classify viewport dimensions into responsive categories.
 */
export function classifyScreenFormFactor(width: number, height: number): ScreenFormFactor {
  if (width < 900 || height < 650) {
    return 'compact';
  }
  const aspectRatio = width / height;
  if (aspectRatio > 2.1) {
    return 'ultrawide';
  }
  if (aspectRatio > 1.6) {
    return 'wide';
  }
  return 'standard';
}

/**
 * Pure function to calculate clamped modal dimensions based on viewport bounds.
 */
export function computeModalBounds(
  viewportWidth: number,
  viewportHeight: number,
  preferredWidth: number,
  preferredHeight: number,
): ViewportDimension {
  const maxWidth = Math.floor(viewportWidth * 0.95);
  const maxHeight = Math.floor(viewportHeight * 0.95);

  return {
    width: Math.min(preferredWidth, maxWidth),
    height: Math.min(preferredHeight, maxHeight),
  };
}
