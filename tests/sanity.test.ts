import { describe, it, expect } from 'vitest';
import { GAME_TITLE, GAME_VERSION } from '@/constants';

describe('Project Setup Sanity Test', () => {
  it('should export the correct game title', () => {
    expect(GAME_TITLE).toBe('Knowledge Realms');
  });

  it('should export a valid semantic version', () => {
    expect(GAME_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
