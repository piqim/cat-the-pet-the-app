/**
 * @file AudioEngine
 * @module engine/AudioEngine
 *
 * Singleton audio controller for looping purr and ambient sounds via expo-audio.
 * Volume is driven by animation state (purr level) and the settings store toggle.
 *
 * Edge cases:
 * - Players are lazily created on first start(); safe to call start() multiple times.
 * - `setAudioModeAsync` failure is non-fatal — audio plays with default session.
 * - Purr pauses when level drops below 0.01 to avoid audible loop artifacts.
 * - Ambient plays continuously whenever sound is enabled (low background volume).
 * - Placeholder .wav files in src/assets/audio/ — swap files without code changes.
 * - Simulator may log MediaToolbox errors for placeholder audio; harmless on device.
 *
 * Usage:
 *   await audioEngine.start();
 *   audioEngine.setEnabled(soundEnabled);
 *   audioEngine.setPurrLevel(0.6); // 0 = silent, 1 = full purr
 */

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const PURR_SOURCE = require('../assets/audio/purr.wav');
const AMBIENT_SOURCE = require('../assets/audio/ambient.wav');

/** Background ambient loop volume (constant, independent of purr level). */
const AMBIENT_VOLUME = 0.18;

let purr: AudioPlayer | null = null;
let ambient: AudioPlayer | null = null;
let configured = false;
let enabled = true;
let purrLevel = 0;
let purrPlaying = false;
let ambientPlaying = false;

/**
 * Clamps a value to the [0, 1] range.
 *
 * @param value - Raw level input.
 * @returns Clamped value.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Lazily creates looping audio players on first access.
 * Idempotent — subsequent calls are no-ops if players already exist.
 */
function ensurePlayers() {
  if (!purr) {
    purr = createAudioPlayer(PURR_SOURCE);
    purr.loop = true;
    purr.volume = 0;
  }

  if (!ambient) {
    ambient = createAudioPlayer(AMBIENT_SOURCE);
    ambient.loop = true;
    ambient.volume = 0;
  }
}

/**
 * Applies current enabled/purrLevel state to the audio players.
 * Pauses, resumes, and sets volumes based on module-level flags.
 */
function applyState() {
  if (!purr || !ambient) {
    return;
  }

  if (!enabled) {
    if (purrPlaying) {
      purr.pause();
      purrPlaying = false;
    }
    if (ambientPlaying) {
      ambient.pause();
      ambientPlaying = false;
    }
    purr.volume = 0;
    ambient.volume = 0;
    return;
  }

  ambient.volume = AMBIENT_VOLUME;
  if (!ambientPlaying) {
    ambient.play();
    ambientPlaying = true;
  }

  purr.volume = purrLevel;
  if (purrLevel > 0.01) {
    if (!purrPlaying) {
      purr.play();
      purrPlaying = true;
    }
  } else if (purrPlaying) {
    purr.pause();
    purrPlaying = false;
  }
}

/**
 * Module-level audio engine singleton.
 * Configure once via start(), then drive with setEnabled/setPurrLevel.
 */
export const audioEngine = {
  /**
   * Configures the audio session and creates players. Safe to call repeatedly.
   * Should be called once on app launch (PetScreen useEffect).
   */
  async start() {
    if (!configured) {
      configured = true;
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        });
      } catch {
        // Non-fatal: audio still plays with default session config.
      }
    }

    ensurePlayers();
    applyState();
  },

  /**
   * Master sound toggle. Pauses all audio when false.
   *
   * @param value - Whether sound is enabled (from settingsStore).
   */
  setEnabled(value: boolean) {
    enabled = value;
    applyState();
  },

  /**
   * Sets purr loop volume. 0 = silent/paused, 1 = full volume.
   *
   * @param level - Purr intensity in [0, 1], typically from animation state.
   */
  setPurrLevel(level: number) {
    purrLevel = clamp01(level);
    applyState();
  },
};
