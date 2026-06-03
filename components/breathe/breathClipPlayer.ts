import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import { Platform } from 'react-native';
import { getVoiceVolume } from '../../utils/voiceVolume';
import { BREATH_CLIPS } from './breathClips';

let player: AudioPlayer | null = null;
const uriCache = new Map<number, string>();
let preloadPromise: Promise<void> | null = null;
/** One clip at a time — never cut a cue mid-word. */
let clipChain: Promise<void> = Promise.resolve();

function isIosSimulator(): boolean {
  return Platform.OS === 'ios' && Constants.isDevice === false;
}

async function ensureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: isIosSimulator() ? 'duckOthers' : 'doNotMix',
  });
}

async function resolveClipUri(moduleId: number): Promise<string> {
  const cached = uriCache.get(moduleId);
  if (cached) return cached;

  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Breath clip asset URI missing');

  uriCache.set(moduleId, uri);
  return uri;
}

async function toPlaybackUri(source: AudioSource): Promise<string> {
  if (typeof source === 'number') return resolveClipUri(source);
  if (typeof source === 'object' && source && 'uri' in source && source.uri) return source.uri;
  throw new Error('Unsupported breath clip source');
}

async function waitForPlayerReady(activePlayer: AudioPlayer, timeoutMs = 8000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = setInterval(() => {
      if (activePlayer.currentStatus.isLoaded) {
        clearInterval(tick);
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(tick);
        reject(new Error('Breath clip failed to load'));
      }
    }, 40);
  });
}

function hasClipFinished(activePlayer: AudioPlayer): boolean {
  const status = activePlayer.currentStatus;
  if (status.didJustFinish) return true;
  if (!status.isLoaded || status.playing || status.isBuffering) return false;
  if (status.duration > 0.15) {
    return status.currentTime >= status.duration - 0.12;
  }
  return false;
}

async function waitForClipFinish(activePlayer: AudioPlayer, timeoutMs = 6000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = setInterval(() => {
      if (hasClipFinished(activePlayer)) {
        clearInterval(tick);
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(tick);
        resolve();
      }
    }, 45);
  });
}

/** Cache bundled clip URIs before the first cue. */
export async function prepareBreathVoice(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const modules = Object.values(BREATH_CLIPS).filter((s): s is number => typeof s === 'number');
    await Promise.all(modules.map((moduleId) => resolveClipUri(moduleId)));
  })();

  try {
    await preloadPromise;
  } catch (err) {
    preloadPromise = null;
    if (__DEV__) console.warn('[Breath voice] preload failed:', err);
  }
}

async function playBreathClipInner(source: AudioSource): Promise<void> {
  await prepareBreathVoice();
  await ensureAudioMode();

  const uri = await toPlaybackUri(source);

  if (player?.currentStatus.playing) {
    await waitForClipFinish(player);
  }

  if (!player) {
    player = createAudioPlayer({ uri }, { updateInterval: 200 });
  } else {
    player.replace({ uri });
  }

  await waitForPlayerReady(player);

  const vol = await getVoiceVolume();
  player.volume = Math.max(vol, 0.85);
  player.play();
}

/** Play one pre-recorded Emo clip — queued so cues never overlap or cut off. */
export function playBreathClip(source: AudioSource): Promise<void> {
  const run = clipChain.then(() => playBreathClipInner(source));
  clipChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function stopBreathClips(): void {
  clipChain = Promise.resolve();
  try {
    player?.pause();
  } catch {}
}

export function releaseBreathVoice(): void {
  stopBreathClips();
  try {
    player?.remove();
  } catch {}
  player = null;
  preloadPromise = null;
}
