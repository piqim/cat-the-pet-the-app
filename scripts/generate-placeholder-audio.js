'use strict';

/**
 * @file generate-placeholder-audio
 * @module scripts/generate-placeholder-audio
 *
 * Synthesizes seamlessly-loopable placeholder WAV files for the audio engine
 * (purr.wav and ambient.wav). Run once during development or when assets are
 * missing; replace output files with real recordings for production.
 *
 * Edge cases:
 * - Loop durations chosen so all frequency components complete whole cycles
 *   (1.0s purr, 2.0s ambient) to avoid audible seams.
 * - Purr includes pseudo-random noise — output differs each run (acceptable
 *   for placeholders).
 * - Overwrites existing files in src/assets/audio/ without prompt.
 *
 * Usage:
 *   node scripts/generate-placeholder-audio.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

/**
 * Writes mono 16-bit PCM samples to a WAV file.
 *
 * @param {string} filePath - Output .wav path.
 * @param {Float32Array} samples - Normalized samples in [-1, 1].
 * @returns {number} Duration in seconds.
 */
function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  return numSamples / SAMPLE_RATE;
}

/**
 * Builds a 1.0s seamless purr loop (25 Hz amplitude-pulsed low rumble).
 *
 * @returns {Float32Array} Sample buffer.
 */
function buildPurr() {
  const duration = 1.0;
  const total = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(total);

  for (let i = 0; i < total; i += 1) {
    const t = i / SAMPLE_RATE;
    const pulse = Math.pow(0.5 * (1 + Math.sin(2 * Math.PI * 25 * t)), 3);
    const carrier =
      0.6 * Math.sin(2 * Math.PI * 55 * t) +
      0.3 * Math.sin(2 * Math.PI * 110 * t) +
      0.1 * Math.sin(2 * Math.PI * 165 * t);
    const noise = (Math.random() * 2 - 1) * 0.08;
    samples[i] = pulse * (carrier + noise) * 0.5;
  }

  return samples;
}

/**
 * Builds a 2.0s seamless ambient room-tone loop.
 *
 * @returns {Float32Array} Sample buffer.
 */
function buildAmbient() {
  const duration = 2.0;
  const total = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(total);

  for (let i = 0; i < total; i += 1) {
    const t = i / SAMPLE_RATE;
    const swell = 0.5 * (1 + Math.sin(2 * Math.PI * 0.5 * t));
    const tone = 0.6 * Math.sin(2 * Math.PI * 80 * t) + 0.4 * Math.sin(2 * Math.PI * 120 * t);
    samples[i] = tone * (0.04 + 0.03 * swell);
  }

  return samples;
}

const outDir = path.join(__dirname, '..', 'src', 'assets', 'audio');
fs.mkdirSync(outDir, { recursive: true });

const purrSeconds = writeWav(path.join(outDir, 'purr.wav'), buildPurr());
const ambientSeconds = writeWav(path.join(outDir, 'ambient.wav'), buildAmbient());

console.log(`Wrote purr.wav (${purrSeconds}s) and ambient.wav (${ambientSeconds}s) to ${outDir}`);
