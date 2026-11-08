import { describe, it, expect } from 'vitest';
import {
  classifyScreenFormFactor,
  computeModalBounds,
} from '../../src/ui/responsiveLayout';

describe('Phase 22.5 — Responsive UI & Resolution Matrix Unit Tests', () => {
  it('1. Correctly classifies screen form factors based on viewport dimensions and aspect ratios', () => {
    // Compact: e.g. 800x600, or mobile/tablet viewports
    expect(classifyScreenFormFactor(800, 600)).toBe('compact');
    expect(classifyScreenFormFactor(768, 1024)).toBe('compact');

    // Standard Desktop (4:3 or standard laptop bounds)
    expect(classifyScreenFormFactor(1024, 768)).toBe('standard');

    // Wide: Standard 16:9 desktop (1280x720, 1920x1080)
    expect(classifyScreenFormFactor(1280, 720)).toBe('wide');
    expect(classifyScreenFormFactor(1920, 1080)).toBe('wide');

    // Ultrawide (21:9 e.g. 2560x1080)
    expect(classifyScreenFormFactor(2560, 1080)).toBe('ultrawide');
  });

  it('2. Clamps modal bounds to maximum 95% of viewport to prevent overflow and clipping', () => {
    // When viewport is large (1920x1080), preferred dimensions (600x480) are retained
    const boundsDesktop = computeModalBounds(1920, 1080, 600, 480);
    expect(boundsDesktop.width).toBe(600);
    expect(boundsDesktop.height).toBe(480);

    // When viewport is constrained (800x600), bounds are clamped to 95% (760x570)
    const boundsConstrained = computeModalBounds(800, 600, 850, 650);
    expect(boundsConstrained.width).toBe(760);
    expect(boundsConstrained.height).toBe(570);
  });
});
