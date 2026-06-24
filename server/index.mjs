/**
 * EmoCare API proxy — keeps Anthropic / ElevenLabs / Tavily keys off the client.
 *
 * Usage:
 *   cp server/.env.example server/.env   # add real keys (never commit)
 *   npm run api-server
 *
 * Client (.env at project root):
 *   EXPO_PUBLIC_EMOCARE_API_URL=http://localhost:3001
 *   EXPO_PUBLIC_EMOCARE_API_SECRET=...   # must match EMOCARE_API_SECRET on server
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 3001);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim() || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY?.trim() || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim() || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL?.trim() || 'eleven_flash_v2_5';
const EMOCARE_API_SECRET = process.env.EMOCARE_API_SECRET?.trim() || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

const EMO_VOICE_SETTINGS = {
  stability: 0.42,
  similarity_boost: 0.88,
  use_speaker_boost: true,
};

const EMO_SESSION_VOICE_SETTINGS = {
  stability: 0.36,
  similarity_boost: 0.9,
  use_speaker_boost: true,
};

const EMO_BREATH_VOICE_SETTINGS = {
  stability: 0.72,
  similarity_boost: 0.76,
  use_speaker_boost: false,
  speed: 0.84,
};

// --- in-memory per-IP rate limiter (single-instance; fine for v1 scale) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000;   // 1 minute
const RATE_LIMIT_MAX = 30;                // requests per IP per window — tune to real usage
const rateBuckets = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();   // Railway sets this
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimited(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now > b.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets) if (now > b.resetAt) rateBuckets.delete(ip);
}, 5 * 60 * 1000).unref();

const MAX_TOKENS_CEILING = 1600;  // covers Oracle; still blocks abusive 8000-token requests
function clampMaxTokens(requested) {
  const n = Number(requested) || 700;
  return Math.min(Math.max(n, 1), MAX_TOKENS_CEILING);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders() });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function authorize(req, res) {
  if (!EMOCARE_API_SECRET) {
    sendJson(res, 503, { error: { type: 'config_error', message: 'Server auth not configured' } });
    return false;   // fail CLOSED, never run open
  }
  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${EMOCARE_API_SECRET}`) return true;
  sendJson(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized' } });
  return false;
}

function prepareSanctuarySpeechText(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1  ')
    .replace(/[,;]\s*/g, ', ');
}

function prepareBreathSpeechText(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1   ')
    .replace(/[,;]\s*/g, ',  ')
    .replace(/\.\.\./g, '… ');
}

async function handleConfig(_req, res) {
  sendJson(res, 200, {
    anthropic: Boolean(ANTHROPIC_API_KEY),
    elevenLabs: Boolean(ELEVENLABS_API_KEY),
    tavily: Boolean(TAVILY_API_KEY),
    voiceId: ELEVENLABS_VOICE_ID,
    elevenLabsModel: ELEVENLABS_MODEL,
  });
}

async function handleAnthropicMessages(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    sendJson(res, 503, {
      error: { type: 'authentication_error', message: 'Anthropic not configured on server' },
    });
    return;
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: body.model || ANTHROPIC_MODEL,
      max_tokens: clampMaxTokens(body.max_tokens ?? body.maxTokens),
      ...(body.system ? { system: body.system } : {}),
      messages: body.messages,
    }),
  });

  const text = await upstream.text();
  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('content-type') || 'application/json',
    ...corsHeaders(),
  });
  res.end(text);
}

async function handleAnthropicStream(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    sendJson(res, 503, {
      error: { type: 'authentication_error', message: 'Anthropic not configured on server' },
    });
    return;
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: body.model || ANTHROPIC_MODEL,
      max_tokens: clampMaxTokens(body.max_tokens ?? body.maxTokens),
      stream: true,
      ...(body.system ? { system: body.system } : {}),
      messages: body.messages,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      ...corsHeaders(),
    });
    res.end(errText);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    ...corsHeaders(),
  });

  const reader = upstream.body?.getReader?.();
  if (!reader) {
    res.end(await upstream.text());
    return;
  }

  req.on('close', () => {
    reader.cancel().catch(() => {});
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) res.write(Buffer.from(value));
    }
  } catch {
    // client disconnected
  } finally {
    res.end();
  }
}

async function handleElevenLabsTts(req, res, body) {
  if (!ELEVENLABS_API_KEY) {
    sendJson(res, 503, { error: { message: 'ElevenLabs not configured on server' } });
    return;
  }

  const sanctuarySession = Boolean(body.sanctuarySession);
  const breathGuide = Boolean(body.breathGuide);
  const text = breathGuide ? prepareBreathSpeechText(body.text) : prepareSanctuarySpeechText(body.text);
  if (!text) {
    sendJson(res, 400, { error: { message: 'Missing text' } });
    return;
  }

  const outputFormat = body.output_format || body.outputFormat || 'mp3_44100_128';
  const voiceId = body.voice_id || body.voiceId || ELEVENLABS_VOICE_ID;
  const voiceSettings = breathGuide
    ? EMO_BREATH_VOICE_SETTINGS
    : sanctuarySession
      ? EMO_SESSION_VOICE_SETTINGS
      : EMO_VOICE_SETTINGS;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${encodeURIComponent(outputFormat)}`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: outputFormat.startsWith('pcm') ? 'audio/pcm' : 'audio/*',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: body.model_id || body.modelId || ELEVENLABS_MODEL,
      voice_settings: voiceSettings,
    }),
  });

  if (!upstream.ok) {
    let detail = `ElevenLabs TTS failed (${upstream.status})`;
    try {
      const err = await upstream.json();
      const nested = err?.detail;
      const code = typeof nested === 'object' ? nested?.code : null;
      const message = nested?.message || nested || err?.message;
      if (code === 'quota_exceeded') {
        detail = 'ElevenLabs voice credits are low. Add credits at elevenlabs.io.';
      } else if (typeof message === 'string' && message.length) {
        detail = message;
      }
    } catch {}
    sendJson(res, upstream.status, { error: { message: detail } });
    return;
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, ...corsHeaders() });

  const reader = upstream.body?.getReader?.();
  if (!reader) {
    res.end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }

  req.on('close', () => {
    reader.cancel().catch(() => {});
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) res.write(Buffer.from(value));
    }
  } catch {
    // client disconnected
  } finally {
    res.end();
  }
}

async function searchTavily(query) {
  if (!TAVILY_API_KEY) return [];

  const body = {
    query,
    max_results: 5,
    search_depth: 'advanced',
    include_answer: 'basic',
  };

  const attempts = [
    () =>
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TAVILY_API_KEY}`,
        },
        body: JSON.stringify(body),
      }),
    () =>
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, api_key: TAVILY_API_KEY }),
      }),
  ];

  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      const data = await res.json();
      const rows = [];
      if (data.answer) {
        rows.push({
          title: 'Research summary',
          url: '',
          snippet: String(data.answer).trim(),
        });
      }
      for (const r of data.results || []) {
        if (!r.content && !r.title) continue;
        rows.push({
          title: r.title || 'Source',
          url: r.url || '',
          snippet: String(r.content || '').trim().slice(0, 420),
        });
      }
      if (rows.length) return rows;
    } catch {}
  }
  return [];
}

async function handleOracleSearch(_req, res, body) {
  const query = String(body.query || '').trim();
  if (!query || query.length < 3) {
    sendJson(res, 400, { error: { message: 'Query too short' } });
    return;
  }

  const rows = await searchTavily(query);
  sendJson(res, 200, { rows });
}

const server = createServer(async (req, res) => {
  // OPTIONS — CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // GET /health — open (Railway / uptime monitors)
  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  // Rate limit before auth + any expensive work
  if (rateLimited(req)) {
    return sendJson(res, 429, { error: { type: 'rate_limited', message: 'Too many requests. Please slow down.' } });
  }
  // Fail closed — required for all non-health routes (including /v1/config)
  if (!authorize(req, res)) return;

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};

    if (req.method === 'GET' && path === '/v1/config') {
      await handleConfig(req, res);
      return;
    }

    if (req.method === 'POST' && path === '/v1/anthropic/messages') {
      await handleAnthropicMessages(req, res, body);
      return;
    }
    if (req.method === 'POST' && path === '/v1/anthropic/messages/stream') {
      await handleAnthropicStream(req, res, body);
      return;
    }
    if (req.method === 'POST' && path === '/v1/elevenlabs/tts') {
      await handleElevenLabsTts(req, res, body);
      return;
    }
    if (req.method === 'POST' && path === '/v1/oracle/search') {
      await handleOracleSearch(req, res, body);
      return;
    }

    sendJson(res, 404, { error: { message: 'Not found' } });
  } catch (err) {
    sendJson(res, 500, {
      error: { message: err instanceof Error ? err.message : 'Server error' },
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`EmoCare API listening on http://0.0.0.0:${PORT}`);
  console.log(`  Anthropic: ${ANTHROPIC_API_KEY ? 'ready' : 'missing ANTHROPIC_API_KEY'}`);
  console.log(`  ElevenLabs: ${ELEVENLABS_API_KEY ? 'ready' : 'missing ELEVENLABS_API_KEY'}`);
  console.log(`  Tavily: ${TAVILY_API_KEY ? 'ready' : 'missing TAVILY_API_KEY'}`);
  console.log(`  Auth: ${EMOCARE_API_SECRET ? 'secret required' : 'BLOCKED — set EMOCARE_API_SECRET'}`);
});
