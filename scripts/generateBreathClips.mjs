#!/usr/bin/env node
/**
 * Generate pre-recorded Emo breath guide clips using the same ElevenLabs voice
 * and settings as Voice Talk (utils/elevenLabs.js).
 *
 * Prerequisites:
 *   - server/.env with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID
 *
 * Run:
 *   npm run generate:breath-clips
 *
 * Output:
 *   assets/audio/breathe/*.mp3
 */
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'assets/audio/breathe');

function loadDotenv() {
  for (const rel of ['server/.env', '.env']) {
    try {
      const raw = readFileSync(join(root, rel), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {}
  }
}

loadDotenv();

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim() || '';
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM';
const MODEL = process.env.ELEVENLABS_MODEL?.trim() || 'eleven_flash_v2_5';

/** Match EMO_VOICE_SETTINGS in utils/elevenLabs.js */
const VOICE_SETTINGS = {
  stability: 0.42,
  similarity_boost: 0.88,
  use_speaker_boost: true,
};

function prepareSanctuarySpeechText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1  ')
    .replace(/[,;]\s*/g, ', ');
}

/** @type {{ file: string; text: string }[]} */
const CLIPS = [
  { file: 'intro.mp3', text: "Let's breathe together." },
  { file: 'phase-breathe-in.mp3', text: 'Breathe in' },
  { file: 'phase-hold.mp3', text: 'Hold,' },
  { file: 'phase-breathe-out.mp3', text: 'Breathe out' },
  { file: 'phase-rest.mp3', text: 'Rest' },
  { file: 'count-1.mp3', text: '1' },
  { file: 'count-2.mp3', text: '2' },
  { file: 'count-3.mp3', text: '3' },
  { file: 'count-4.mp3', text: '4' },
  { file: 'count-5.mp3', text: '5' },
  { file: 'count-6.mp3', text: '6' },
  { file: 'count-7.mp3', text: '7' },
  { file: 'count-8.mp3', text: '8' },
  { file: 'well-done.mp3', text: 'Beautiful.  Take a gentle breath.' },
];

async function fetchMp3(text) {
  const prepared = prepareSanctuarySpeechText(text);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}/stream?output_format=mp3_44100_128`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/*',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify({
      text: prepared,
      model_id: MODEL,
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs ${response.status}: ${body.slice(0, 200)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (!API_KEY || API_KEY.length < 20) {
    console.error('Missing ELEVENLABS_API_KEY in server/.env');
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  console.log(`Voice ID: ${VOICE_ID}`);
  console.log(`Model:    ${MODEL}`);
  console.log(`Output:   ${outDir}\n`);

  for (const clip of CLIPS) {
    process.stdout.write(`Generating ${clip.file} … `);
    try {
      const mp3 = await fetchMp3(clip.text);
      writeFileSync(join(outDir, clip.file), mp3);
      console.log(`OK (${(mp3.length / 1024).toFixed(1)} KB) — "${clip.text}"`);
    } catch (err) {
      console.log('FAILED');
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('\nDone. Commit assets/audio/breathe/ and wire clips in useBreathVoiceGuide.');
}

main();
