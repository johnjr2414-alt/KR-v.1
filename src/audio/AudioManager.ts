import type { GameSettings } from '../storage/StorageTypes';
import { DEFAULT_GAME_SETTINGS } from '../storage/StorageTypes';

export type SoundChannel = 'sfx' | 'music';

export interface SoundCueOptions {
  volume?: number; // 0.0 - 1.0 (local factor)
  loop?: boolean;
}

/**
 * Headless AudioManager contract and implementation.
 *
 * Responsibilities:
 * - Computes effective volume based on Master, Music, and SFX volume settings:
 *     effectiveMusicVolume = masterVolume * musicVolume
 *     effectiveSfxVolume = masterVolume * sfxVolume
 * - Tracks active background music key and prevents duplicate restarts across scene transitions
 * - Supports mute toggle with state preservation
 * - Handles browser autoplay suspension gracefully
 * - Synthesizes non-blocking mock / Web Audio beep tones where assets are not present
 * - Completely headless and testable without browser DOM
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private isMuted = false;
  private currentMusicKey: string | null = null;
  private audioContext: AudioContext | null = null;

  constructor(settings?: GameSettings) {
    if (settings) {
      this.settings = { ...settings };
    }
  }

  static getInstance(settings?: GameSettings): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(settings);
    }
    return AudioManager.instance;
  }

  static resetInstance(): void {
    AudioManager.instance = null;
  }

  updateSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  isAudioMuted(): boolean {
    return this.isMuted;
  }

  getEffectiveVolume(channel: SoundChannel): number {
    if (this.isMuted) return 0;
    const master = Math.max(0, Math.min(1, this.settings.masterVolume));
    if (channel === 'music') {
      const music = Math.max(0, Math.min(1, this.settings.musicVolume));
      return Math.round(master * music * 100) / 100;
    } else {
      const sfx = Math.max(0, Math.min(1, this.settings.sfxVolume));
      return Math.round(master * sfx * 100) / 100;
    }
  }

  getCurrentMusicKey(): string | null {
    return this.currentMusicKey;
  }

  /**
   * Plays background music track by key.
   * If the requested track is already playing, ignores call to avoid duplicate restarts.
   */
  playMusic(key: string): boolean {
    if (this.currentMusicKey === key) {
      return false; // Already playing this track
    }

    this.currentMusicKey = key;
    // When real assets exist, scene/Phaser sound manager or HTML5 audio node plays here.
    return true;
  }

  stopMusic(): void {
    this.currentMusicKey = null;
  }

  /**
   * Plays a one-shot sound effect.
   */
  playSfx(key: string, options: SoundCueOptions = {}): boolean {
    if (this.isMuted || this.getEffectiveVolume('sfx') <= 0) {
      return false;
    }

    // Try unlocking web audio context upon first user gesture if in browser
    this.tryUnlockAudio();

    // If web audio is supported, synthesize a quick pleasant tone if asset missing
    if (this.audioContext && this.audioContext.state === 'running') {
      this.synthesizeFallbackTone(key, options);
    }

    return true;
  }

  private tryUnlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }
    } catch {
      // Non-blocking browser autoplay policy catch
    }
  }

  private synthesizeFallbackTone(key: string, options: SoundCueOptions): void {
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      // Pitch variation based on cue
      let freq = 440;
      let duration = 0.08;

      if (key.includes('crit')) {
        freq = 880;
        duration = 0.15;
      } else if (key.includes('hurt') || key.includes('timeout')) {
        freq = 220;
        duration = 0.12;
      } else if (key.includes('attack')) {
        freq = 587;
        duration = 0.06;
      }

      const effVol = this.getEffectiveVolume('sfx') * (options.volume ?? 1.0) * 0.15;

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(effVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Silently ignore audio synthesis errors
    }
  }
}

export const audioManager = AudioManager.getInstance();
