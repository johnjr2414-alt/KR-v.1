import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from '../../src/audio/AudioManager';
import { DEFAULT_GAME_SETTINGS } from '../../src/storage/StorageTypes';

describe('Phase 22.4 — Audio System & Settings Volume Mapping Unit Tests', () => {
  let audio: AudioManager;

  beforeEach(() => {
    AudioManager.resetInstance();
    audio = new AudioManager({ ...DEFAULT_GAME_SETTINGS });
  });

  it('1. Calculates effective volume for music and sfx based on master volume', () => {
    // Defaults: master 0.8, sfx 0.8, music 0.7
    expect(audio.getEffectiveVolume('sfx')).toBe(0.64); // 0.8 * 0.8
    expect(audio.getEffectiveVolume('music')).toBe(0.56); // 0.8 * 0.7

    // Lower master volume
    audio.updateSettings({ masterVolume: 0.5 });
    expect(audio.getEffectiveVolume('sfx')).toBe(0.4); // 0.5 * 0.8
    expect(audio.getEffectiveVolume('music')).toBe(0.35); // 0.5 * 0.7
  });

  it('2. Returns zero volume when muted', () => {
    audio.setMuted(true);
    expect(audio.isAudioMuted()).toBe(true);
    expect(audio.getEffectiveVolume('sfx')).toBe(0);
    expect(audio.getEffectiveVolume('music')).toBe(0);

    audio.setMuted(false);
    expect(audio.isAudioMuted()).toBe(false);
    expect(audio.getEffectiveVolume('sfx')).toBeGreaterThan(0);
  });

  it('3. Prevents duplicate background music restart when track is already playing', () => {
    const trackA = 'bgm-village';
    expect(audio.playMusic(trackA)).toBe(true);
    expect(audio.getCurrentMusicKey()).toBe(trackA);

    // Calling playMusic again with same key returns false (no restart)
    expect(audio.playMusic(trackA)).toBe(false);

    // Switching track returns true
    expect(audio.playMusic('bgm-wilderness')).toBe(true);
    expect(audio.getCurrentMusicKey()).toBe('bgm-wilderness');

    // Stop music
    audio.stopMusic();
    expect(audio.getCurrentMusicKey()).toBeNull();
  });

  it('4. SFX triggers return true when volume > 0 and not muted, false when muted', () => {
    expect(audio.playSfx('sfx-attack')).toBe(true);

    audio.setMuted(true);
    expect(audio.playSfx('sfx-attack')).toBe(false);
  });
});
