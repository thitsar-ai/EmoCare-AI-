/**
 * One-time migration: move EXPO_PUBLIC_* provider keys from root .env → server/.env
 * Run: node scripts/migrate-env-to-server.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const rootEnvPath = resolve(root, '.env');
const serverEnvPath = resolve(root, 'server/.env');

function parseEnv(text) {
  const map = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return map;
}

if (!existsSync(rootEnvPath)) {
  console.error('No root .env found. Copy .env.example to .env first.');
  process.exit(1);
}

if (existsSync(serverEnvPath)) {
  console.log('server/.env already exists — skipping migration.');
  process.exit(0);
}

const rootEnv = parseEnv(readFileSync(rootEnvPath, 'utf8'));

const serverLines = [
  '# Migrated from root .env — provider keys stay server-side only',
  'PORT=3001',
  '',
  `ANTHROPIC_API_KEY=${rootEnv.EXPO_PUBLIC_ANTHROPIC_KEY || ''}`,
  `TAVILY_API_KEY=${rootEnv.EXPO_PUBLIC_TAVILY_API_KEY || ''}`,
  `ELEVENLABS_API_KEY=${rootEnv.EXPO_PUBLIC_ELEVENLABS_API_KEY || rootEnv.EXPO_PUBLIC_ELEVENLABS_KEY || ''}`,
  `ELEVENLABS_VOICE_ID=${rootEnv.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || ''}`,
  `ELEVENLABS_MODEL=${rootEnv.EXPO_PUBLIC_ELEVENLABS_MODEL || 'eleven_flash_v2_5'}`,
  '',
  '# Generate a random string for production',
  'EMOCARE_API_SECRET=',
  '',
];

writeFileSync(serverEnvPath, serverLines.join('\n'), 'utf8');

const clientLines = [
  '# Client — no provider API keys (those live in server/.env)',
  'EXPO_PUBLIC_EMOCARE_API_URL=http://localhost:3001',
  'EXPO_PUBLIC_EMOCARE_API_SECRET=',
  '',
];

if (rootEnv.EXPO_PUBLIC_VOICE_WS_URL) {
  clientLines.push(`EXPO_PUBLIC_VOICE_WS_URL=${rootEnv.EXPO_PUBLIC_VOICE_WS_URL}`, '');
}

writeFileSync(rootEnvPath, clientLines.join('\n'), 'utf8');

console.log('Migration complete:');
console.log('  • Created server/.env with provider keys');
console.log('  • Rewrote root .env with EXPO_PUBLIC_EMOCARE_API_URL only');
console.log('Next: npm run api-server  (terminal 1)');
console.log('      npm run start:clear  (terminal 2)');
