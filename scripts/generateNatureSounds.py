#!/usr/bin/env python3
"""Generate seamless 24s nature ambient loops — 44.1 kHz mono 16-bit WAV."""
from __future__ import annotations

import math
import os
import random
import struct
import wave

SR = 44100
DUR = 24
N = SR * DUR
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'breathe', 'nature')


def clamp(x: float) -> int:
    return max(-32767, min(32767, int(x)))


def normalize(samples: list[float], target_rms: float = 3000.0) -> list[int]:
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) or 1.0
    scale = target_rms / rms
    return [clamp(s * scale) for s in samples]


def pink_noise(count: int, state: list[float] | None = None) -> tuple[list[float], list[float]]:
    if state is None:
        state = [0.0] * 7
    out: list[float] = []
    for _ in range(count):
        white = random.uniform(-1.0, 1.0)
        state[0] = 0.99886 * state[0] + white * 0.0555179
        state[1] = 0.99332 * state[1] + white * 0.0750759
        state[2] = 0.96900 * state[2] + white * 0.1538520
        state[3] = 0.86650 * state[3] + white * 0.3104856
        state[4] = 0.55000 * state[4] + white * 0.5329522
        state[5] = -0.7616 * state[5] - white * 0.0168980
        pink = (
            state[0]
            + state[1]
            + state[2]
            + state[3]
            + state[4]
            + state[5]
            + state[6]
            + white * 0.5362
        )
        state[6] = white * 0.115926
        out.append(pink)
    return out, state


def make_rain() -> list[int]:
    random.seed(11)
    samples: list[float] = []
    state: list[float] | None = None
    for i in range(0, N, 512):
        noise, state = pink_noise(min(512, N - i), state)
        for j, v in enumerate(noise):
            s = v * 1400
            if random.random() < 0.0012:
                s += random.uniform(5000, 14000)
            samples.append(s)
    return normalize(samples[:N], 3200)


def make_ocean() -> list[int]:
    random.seed(22)
    samples: list[float] = []
    state: list[float] | None = None
    noise_buf: list[float] = []
    for i in range(N):
        t = i / SR
        swell = (math.sin(2 * math.pi * 0.11 * t) * 0.5 + 0.5) ** 1.4
        if i % 512 == 0:
            noise_buf, state = pink_noise(512, state)
        v = noise_buf[i % 512] * 2100 * swell
        v += math.sin(2 * math.pi * 0.06 * t) * 520
        v += math.sin(2 * math.pi * 0.17 * t + 0.8) * 180
        samples.append(v)
    return normalize(samples, 3100)


def make_forest() -> list[int]:
    random.seed(33)
    samples = [0.0] * N
    state: list[float] | None = None
    for i in range(0, N, 512):
        noise, state = pink_noise(512, state)
        for j, v in enumerate(noise):
            idx = i + j
            if idx >= N:
                break
            samples[idx] += v * 700
    for _ in range(52):
        start = random.randint(0, N - SR // 3)
        freq = random.uniform(1600, 4500)
        length = random.randint(int(SR * 0.06), int(SR * 0.22))
        for k in range(length):
            if start + k >= N:
                break
            env = math.sin(math.pi * k / length)
            t = k / SR
            samples[start + k] += math.sin(2 * math.pi * freq * t) * env * random.uniform(900, 2200)
    for i in range(N):
        mod = 0.62 + 0.38 * math.sin(2 * math.pi * 0.19 * (i / SR))
        samples[i] *= mod
    return normalize(samples, 3000)


def make_fireplace() -> list[int]:
    random.seed(44)
    samples = [0.0] * N
    state: list[float] | None = None
    for i in range(0, N, 256):
        noise, state = pink_noise(256, state)
        for j, v in enumerate(noise):
            idx = i + j
            if idx >= N:
                break
            samples[idx] += v * 420
    for _ in range(220):
        start = random.randint(0, N - 1)
        pop_len = random.randint(18, 90)
        amp = random.uniform(3500, 11000)
        for k in range(pop_len):
            if start + k >= N:
                break
            decay = math.exp(-k / 14.0)
            samples[start + k] += random.uniform(-1.0, 1.0) * amp * decay
    for i in range(N):
        t = i / SR
        samples[i] += math.sin(2 * math.pi * 48 * t) * 160
        samples[i] += math.sin(2 * math.pi * 96 * t) * 80
    return normalize(samples, 3200)


def write_wav(path: str, samples: list[int]) -> None:
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', s) for s in samples))


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    clips = {
        'rain': make_rain,
        'ocean': make_ocean,
        'forest': make_forest,
        'fireplace': make_fireplace,
    }
    for name, builder in clips.items():
        out = os.path.join(OUT_DIR, f'{name}.wav')
        print(f'Writing {out} …')
        write_wav(out, builder())
    print('Done — commit assets/audio/breathe/nature/*.wav')


if __name__ == '__main__':
    main()
