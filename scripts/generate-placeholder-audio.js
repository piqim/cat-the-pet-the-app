'use strict';

// Generates placeholder, seamlessly-loopable WAV assets for the audio layer
// (PRD §13 Q5). These are synthesized stand-ins — replace with real recordings
// by dropping files of the same names into src/assets/audio/.

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
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

// Purr: 25 Hz amplitude-pulsed low rumble. 1.0s contains whole cycles of every
// component (25/50/110/165 Hz) so the loop is seamless.
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

// Ambient: very soft low room tone with a slow swell. 2.0s seamless loop.
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
