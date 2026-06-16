import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Placeholder synthesized loops (PRD §13 Q5). Swap the files in src/assets/audio
// for real recordings without touching this engine.
const PURR_SOURCE = require('../assets/audio/purr.wav');
const AMBIENT_SOURCE = require('../assets/audio/ambient.wav');

const AMBIENT_VOLUME = 0.18;

let purr: AudioPlayer | null = null;
let ambient: AudioPlayer | null = null;
let configured = false;
let enabled = true;
let purrLevel = 0;
let purrPlaying = false;
let ambientPlaying = false;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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

export const audioEngine = {
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
  setEnabled(value: boolean) {
    enabled = value;
    applyState();
  },
  setPurrLevel(level: number) {
    purrLevel = clamp01(level);
    applyState();
  },
};
