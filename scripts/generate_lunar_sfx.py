#!/usr/bin/env python3
"""Generate To The Moon's original lunar interface sound suite.

The generator uses only deterministic oscillators and seeded noise. It does not
contain, transform or imitate audio from another game, soundtrack or sample pack.
Run it from the repository root; ffmpeg encodes the temporary WAV files as Ogg.
"""

from __future__ import annotations

import math
import random
import struct
import subprocess
import tempfile
import wave
from pathlib import Path


SAMPLE_RATE = 48_000
TAU = math.tau
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "audio"


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def envelope(position: float, duration: float, attack: float, release: float) -> float:
    if position < 0.0 or position > duration:
        return 0.0
    head = smooth(position / max(attack, 1e-6))
    tail = smooth((duration - position) / max(release, 1e-6))
    return min(head, tail)


def stereo_pan(pan: float) -> tuple[float, float]:
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4.0
    return math.cos(angle), math.sin(angle)


class Sound:
    def __init__(self, duration: float, seed: int):
        self.duration = duration
        self.seed = seed
        self.frames = max(1, round(duration * SAMPLE_RATE))
        self.left = [0.0] * self.frames
        self.right = [0.0] * self.frames

    def tone(
        self,
        start: float,
        duration: float,
        frequency: float,
        amplitude: float,
        *,
        end_frequency: float | None = None,
        attack: float = 0.012,
        release: float = 0.16,
        pan: float = 0.0,
        vibrato: float = 0.0,
        vibrato_rate: float = 4.0,
        color: float = 0.12,
    ) -> None:
        first = max(0, round(start * SAMPLE_RATE))
        last = min(self.frames, round((start + duration) * SAMPLE_RATE))
        if last <= first:
            return
        left_gain, right_gain = stereo_pan(pan)
        phase = 0.0
        finish = end_frequency if end_frequency and end_frequency > 0 else frequency
        ratio = finish / max(frequency, 1e-6)
        for index in range(first, last):
            local = (index - first) / SAMPLE_RATE
            progress = local / max(duration, 1e-6)
            current = frequency * (ratio ** progress)
            if vibrato:
                current *= 1.0 + vibrato * math.sin(TAU * vibrato_rate * local)
            phase += TAU * current / SAMPLE_RATE
            env = envelope(local, duration, attack, release)
            wave_value = math.sin(phase)
            wave_value += color * math.sin(phase * 2.002 + 0.31)
            wave_value += color * 0.35 * math.sin(phase * 3.011 + 1.17)
            value = wave_value * amplitude * env
            self.left[index] += value * left_gain
            self.right[index] += value * right_gain

    def bell(
        self,
        start: float,
        frequency: float,
        amplitude: float,
        *,
        duration: float = 0.62,
        decay: float = 4.6,
        pan: float = 0.0,
        dark: bool = False,
    ) -> None:
        partials = ((1.0, 1.0), (2.01, 0.30), (2.96, 0.13), (4.17, 0.055))
        if dark:
            partials = ((1.0, 1.0), (1.997, 0.18), (2.71, 0.07))
        for order, (ratio, level) in enumerate(partials):
            partial_duration = duration * (1.0 - order * 0.08)
            first = max(0, round(start * SAMPLE_RATE))
            last = min(self.frames, round((start + partial_duration) * SAMPLE_RATE))
            left_gain, right_gain = stereo_pan(max(-1.0, min(1.0, pan + (order - 1.5) * 0.08)))
            phase = order * 0.71
            for index in range(first, last):
                local = (index - first) / SAMPLE_RATE
                attack = smooth(local / 0.008)
                tail = math.exp(-decay * local / max(partial_duration, 1e-6))
                value = math.sin(phase + TAU * frequency * ratio * local) * amplitude * level * attack * tail
                self.left[index] += value * left_gain
                self.right[index] += value * right_gain

    def air(
        self,
        start: float,
        duration: float,
        amplitude: float,
        *,
        cutoff_start: float = 180.0,
        cutoff_end: float = 2_600.0,
        pan_start: float = -0.3,
        pan_end: float = 0.3,
        seed_offset: int = 0,
        attack: float = 0.12,
        release: float = 0.22,
    ) -> None:
        first = max(0, round(start * SAMPLE_RATE))
        last = min(self.frames, round((start + duration) * SAMPLE_RATE))
        rng = random.Random(self.seed + seed_offset)
        low_l = low_r = slow_l = slow_r = 0.0
        for index in range(first, last):
            local = (index - first) / SAMPLE_RATE
            progress = local / max(duration, 1e-6)
            cutoff = cutoff_start + (cutoff_end - cutoff_start) * smooth(progress)
            fast_alpha = 1.0 - math.exp(-TAU * max(80.0, cutoff) / SAMPLE_RATE)
            slow_alpha = 1.0 - math.exp(-TAU * max(30.0, cutoff * 0.22) / SAMPLE_RATE)
            white_l, white_r = rng.uniform(-1.0, 1.0), rng.uniform(-1.0, 1.0)
            low_l += fast_alpha * (white_l - low_l)
            low_r += fast_alpha * (white_r - low_r)
            slow_l += slow_alpha * (white_l - slow_l)
            slow_r += slow_alpha * (white_r - slow_r)
            band_l, band_r = low_l - slow_l, low_r - slow_r
            pan = pan_start + (pan_end - pan_start) * progress
            left_gain, right_gain = stereo_pan(pan)
            env = envelope(local, duration, attack, release)
            self.left[index] += band_l * amplitude * env * (0.68 + 0.32 * left_gain)
            self.right[index] += band_r * amplitude * env * (0.68 + 0.32 * right_gain)

    def sub(self, start: float, frequency: float, amplitude: float, *, duration: float = 0.55, end: float | None = None) -> None:
        self.tone(start, duration, frequency, amplitude, end_frequency=end or frequency * 0.62,
                  attack=0.014, release=duration * 0.72, color=0.03)

    def chord(
        self,
        start: float,
        duration: float,
        notes: tuple[float, ...],
        amplitude: float,
        *,
        attack: float = 0.16,
        release: float = 0.38,
    ) -> None:
        pans = (-0.58, 0.46, -0.18, 0.68, 0.08)
        for index, note in enumerate(notes):
            level = amplitude / math.sqrt(max(1, len(notes)))
            self.tone(start, duration, note * 0.997, level * 0.52, attack=attack, release=release,
                      pan=pans[index % len(pans)], vibrato=0.0017, vibrato_rate=3.1 + index * 0.19, color=0.06)
            self.tone(start, duration, note * 1.003, level * 0.48, attack=attack, release=release,
                      pan=-pans[index % len(pans)], vibrato=0.0013, vibrato_rate=3.6 + index * 0.17, color=0.05)

    def latch(self, start: float, amplitude: float, *, pan: float = 0.0, seed_offset: int = 0) -> None:
        self.air(start, 0.10, amplitude, cutoff_start=3_600.0, cutoff_end=620.0,
                 pan_start=pan, pan_end=pan, seed_offset=seed_offset, attack=0.002, release=0.075)
        self.tone(start + 0.012, 0.13, 118.0, amplitude * 0.62, end_frequency=78.0,
                  attack=0.002, release=0.11, pan=pan, color=0.04)

    def echo(self, taps: tuple[tuple[float, float, bool], ...]) -> None:
        original_l, original_r = self.left[:], self.right[:]
        for delay, gain, cross in taps:
            offset = round(delay * SAMPLE_RATE)
            for index in range(offset, self.frames):
                source = index - offset
                self.left[index] += (original_r[source] if cross else original_l[source]) * gain
                self.right[index] += (original_l[source] if cross else original_r[source]) * gain

    def master(self, peak_db: float) -> None:
        # Remove tiny DC offsets, use a very gentle soft clip, then leave generous
        # headroom for Vorbis intersample peaks and browser mixing.
        mean_l = sum(self.left) / self.frames
        mean_r = sum(self.right) / self.frames
        for index in range(self.frames):
            self.left[index] = math.tanh((self.left[index] - mean_l) * 0.92)
            self.right[index] = math.tanh((self.right[index] - mean_r) * 0.92)
        peak = max(max(abs(value) for value in self.left), max(abs(value) for value in self.right), 1e-9)
        target = 10.0 ** (peak_db / 20.0)
        scale = target / peak
        fade_frames = min(round(0.018 * SAMPLE_RATE), self.frames // 4)
        for index in range(self.frames):
            edge = 1.0
            if index < fade_frames:
                edge = smooth(index / max(1, fade_frames))
            elif index >= self.frames - fade_frames:
                edge = smooth((self.frames - 1 - index) / max(1, fade_frames))
            self.left[index] *= scale * edge
            self.right[index] *= scale * edge

    def write_ogg(self, name: str, peak_db: float) -> None:
        self.echo(((0.071, 0.16, True), (0.137, 0.09, False), (0.223, 0.045, True)))
        self.master(peak_db)
        OUTPUT.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="to-the-moon-sfx-") as directory:
            wav_path = Path(directory) / f"{name}.wav"
            with wave.open(str(wav_path), "wb") as handle:
                handle.setnchannels(2)
                handle.setsampwidth(2)
                handle.setframerate(SAMPLE_RATE)
                frames = bytearray()
                for left, right in zip(self.left, self.right):
                    frames.extend(struct.pack("<hh", round(max(-1.0, min(1.0, left)) * 32767),
                                              round(max(-1.0, min(1.0, right)) * 32767)))
                handle.writeframes(frames)
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
                 "-c:a", "vorbis", "-strict", "-2", "-q:a", "5", str(OUTPUT / f"{name}.ogg")],
                check=True,
            )


def build(name: str, duration: float, seed: int, peak_db: float) -> None:
    sound = Sound(duration, seed)
    if name.startswith("lunar_nav_"):
        variant = ord(name[-1]) - ord("a")
        bases = (659.25, 587.33, 739.99)
        sound.air(0.0, duration * 0.72, 0.06, cutoff_start=420, cutoff_end=1_650 + variant * 230,
                  seed_offset=11, attack=0.025, release=0.16)
        sound.bell(0.034, bases[variant], 0.25, duration=0.27, decay=7.8, pan=(-0.22, 0.18, -0.05)[variant], dark=True)
        sound.bell(0.072, bases[variant] * 1.498, 0.07, duration=0.22, decay=9.1, pan=(0.3, -0.27, 0.2)[variant])
    elif name == "lunar_open":
        sound.air(0.0, 0.62, 0.22, cutoff_start=130, cutoff_end=3_900, seed_offset=21)
        sound.tone(0.02, 0.56, 118, 0.16, end_frequency=286, attack=0.09, release=0.24, pan=-0.12, color=0.04)
        sound.chord(0.23, 0.43, (146.83, 220.0, 329.63), 0.16, attack=0.18, release=0.31)
        sound.bell(0.31, 880.0, 0.12, duration=0.36, decay=5.8, pan=0.34)
    elif name == "lunar_close":
        sound.air(0.0, 0.49, 0.18, cutoff_start=2_900, cutoff_end=120, pan_start=0.34, pan_end=-0.22, seed_offset=22,
                  attack=0.025, release=0.19)
        sound.tone(0.0, 0.46, 390, 0.15, end_frequency=128, attack=0.025, release=0.24, pan=0.06, color=0.035)
        sound.bell(0.02, 523.25, 0.09, duration=0.31, decay=7.0, pan=-0.25, dark=True)
    elif name == "lunar_confirm":
        sound.sub(0.015, 82.41, 0.24, duration=0.48, end=58.27)
        sound.chord(0.08, 0.59, (146.83, 220.0, 293.66), 0.24, attack=0.10, release=0.36)
        sound.bell(0.075, 293.66, 0.16, duration=0.48, decay=5.2, pan=-0.28, dark=True)
        sound.bell(0.19, 440.0, 0.14, duration=0.45, decay=5.5, pan=0.32)
    elif name.startswith("lunar_day_"):
        variant = ord(name[-1]) - ord("a")
        sound.air(0.0, 0.94, 0.30, cutoff_start=95, cutoff_end=5_200, pan_start=-0.55, pan_end=0.52,
                  seed_offset=40 + variant)
        sound.sub(0.0, 68.0 if not variant else 61.0, 0.33, duration=0.72, end=39.0)
        sound.tone(0.08, 0.72, 105, 0.18, end_frequency=390 if not variant else 345,
                  attack=0.16, release=0.27, pan=-0.12, color=0.035)
        notes = (440.0, 554.37, 739.99) if not variant else (392.0, 523.25, 659.25)
        for index, note in enumerate(notes):
            sound.bell(0.29 + index * 0.135, note, 0.115, duration=0.47, decay=5.7, pan=(-0.44, 0.06, 0.47)[index])
        sound.chord(0.48, 0.54, (110.0, 164.81, 220.0, 293.66), 0.24, attack=0.18, release=0.38)
    elif name == "lunar_settle":
        sound.sub(0.012, 73.42, 0.13, duration=0.35, end=55.0)
        sound.chord(0.045, 0.49, (146.83, 220.0, 293.66), 0.20, attack=0.075, release=0.31)
        sound.bell(0.08, 587.33, 0.12, duration=0.40, decay=6.0, pan=0.22, dark=True)
    elif name == "lunar_save":
        sound.air(0.0, 0.58, 0.10, cutoff_start=260, cutoff_end=1_800, seed_offset=51)
        sound.latch(0.045, 0.12, pan=-0.18, seed_offset=52)
        sound.chord(0.12, 0.57, (123.47, 185.0, 246.94, 329.63), 0.22, attack=0.11, release=0.38)
        sound.bell(0.20, 493.88, 0.12, duration=0.45, decay=5.8, pan=0.28)
    elif name.startswith("lunar_profit_"):
        variant = ord(name[-1]) - ord("a")
        sound.air(0.0, 1.03, 0.16, cutoff_start=260, cutoff_end=4_300, seed_offset=60 + variant)
        sound.sub(0.02, 73.42 if not variant else 65.41, 0.28, duration=0.68, end=49.0)
        notes = (329.63, 440.0, 659.25) if not variant else (293.66, 440.0, 587.33)
        for index, note in enumerate(notes):
            sound.bell(0.16 + index * 0.18, note, 0.20 - index * 0.018, duration=0.82, decay=4.0,
                       pan=(-0.48, 0.08, 0.5)[index])
        chord = (110.0, 164.81, 220.0, 293.66) if not variant else (98.0, 146.83, 220.0, 293.66)
        sound.chord(0.36, 0.80, chord, 0.31, attack=0.19, release=0.48)
    elif name.startswith("lunar_creative_"):
        variant = ord(name[-1]) - ord("a")
        sound.latch(0.02, 0.20, pan=-0.36 if not variant else 0.33, seed_offset=70 + variant)
        sound.air(0.09, 0.67, 0.15, cutoff_start=240, cutoff_end=3_600, seed_offset=72 + variant)
        root = 246.94 if not variant else 220.0
        sound.bell(0.16, root * 2, 0.17, duration=0.62, decay=4.7, pan=0.28 if not variant else -0.25)
        sound.chord(0.18, 0.62, (root, root * 1.5, root * 2.0), 0.21, attack=0.10, release=0.40)
    elif name == "lunar_swap":
        sound.latch(0.018, 0.17, pan=-0.43, seed_offset=81)
        sound.latch(0.14, 0.15, pan=0.39, seed_offset=82)
        sound.air(0.09, 0.66, 0.15, cutoff_start=180, cutoff_end=3_200, seed_offset=83)
        sound.chord(0.23, 0.58, (130.81, 196.0, 261.63, 392.0), 0.22, attack=0.12, release=0.36)
        sound.bell(0.29, 784.0, 0.10, duration=0.47, decay=5.4, pan=0.18)
    elif name == "lunar_correct":
        sound.air(0.0, 0.72, 0.12, cutoff_start=350, cutoff_end=4_200, seed_offset=90)
        for start, note, pan in ((0.08, 440.0, -0.35), (0.22, 659.25, 0.34), (0.34, 880.0, 0.02)):
            sound.bell(start, note, 0.18, duration=0.63, decay=4.5, pan=pan)
        sound.chord(0.17, 0.66, (146.83, 220.0, 329.63), 0.18, attack=0.16, release=0.42)
    elif name == "lunar_wrong":
        sound.air(0.0, 0.48, 0.09, cutoff_start=1_500, cutoff_end=160, seed_offset=91, attack=0.02, release=0.19)
        sound.tone(0.025, 0.50, 329.63, 0.18, end_frequency=207.65, attack=0.025, release=0.28,
                   pan=-0.08, vibrato=0.0028, vibrato_rate=3.0, color=0.04)
        sound.sub(0.12, 69.30, 0.13, duration=0.37, end=51.91)
    elif name == "lunar_warning":
        sound.air(0.0, 0.75, 0.16, cutoff_start=920, cutoff_end=240, seed_offset=100, attack=0.035, release=0.28)
        sound.sub(0.02, 73.42, 0.28, duration=0.40, end=52.0)
        sound.sub(0.34, 69.30, 0.22, duration=0.40, end=49.0)
        sound.tone(0.06, 0.67, 146.83, 0.12, end_frequency=138.59, attack=0.08, release=0.34,
                   pan=-0.23, vibrato=0.009, vibrato_rate=2.4, color=0.05)
    elif name == "lunar_crisis":
        sound.air(0.0, 1.16, 0.31, cutoff_start=4_600, cutoff_end=90, pan_start=0.6, pan_end=-0.58,
                  seed_offset=110, attack=0.012, release=0.38)
        sound.sub(0.0, 78.0, 0.40, duration=0.94, end=32.0)
        sound.tone(0.04, 1.02, 117.0, 0.22, end_frequency=67.0, attack=0.04, release=0.48,
                   pan=0.08, vibrato=0.012, vibrato_rate=1.7, color=0.075)
        sound.latch(0.18, 0.16, pan=0.48, seed_offset=111)
        sound.latch(0.46, 0.12, pan=-0.48, seed_offset=112)
    elif name == "lunar_epic":
        sound.air(0.0, 1.26, 0.22, cutoff_start=140, cutoff_end=5_500, seed_offset=120)
        sound.sub(0.0, 61.74, 0.34, duration=0.82, end=41.20)
        sound.chord(0.18, 1.08, (98.0, 146.83, 220.0, 293.66, 440.0), 0.38, attack=0.25, release=0.62)
        for index, note in enumerate((392.0, 587.33, 783.99, 987.77)):
            sound.bell(0.24 + index * 0.16, note, 0.135, duration=0.78, decay=3.9,
                       pan=(-0.55, 0.42, -0.18, 0.58)[index])
    elif name == "lunar_legendary":
        sound.air(0.0, 1.84, 0.26, cutoff_start=100, cutoff_end=6_500, pan_start=-0.7, pan_end=0.7, seed_offset=130)
        sound.sub(0.0, 55.0, 0.40, duration=1.08, end=34.0)
        sound.chord(0.19, 1.68, (82.41, 123.47, 164.81, 246.94, 329.63, 493.88), 0.46,
                    attack=0.32, release=0.78)
        for index, note in enumerate((329.63, 493.88, 659.25, 987.77, 1318.51)):
            sound.bell(0.27 + index * 0.18, note, 0.15, duration=1.02, decay=3.4,
                       pan=(-0.62, 0.48, -0.28, 0.58, 0.02)[index])
        sound.sub(0.82, 73.42, 0.22, duration=0.69, end=49.0)
    elif name == "lunar_victory":
        sound.air(0.0, 2.45, 0.25, cutoff_start=120, cutoff_end=6_800, pan_start=-0.72, pan_end=0.72, seed_offset=140)
        sound.sub(0.0, 55.0, 0.42, duration=1.12, end=36.71)
        sound.chord(0.16, 1.18, (73.42, 110.0, 146.83, 220.0, 293.66), 0.43, attack=0.28, release=0.62)
        sound.chord(0.83, 1.45, (98.0, 146.83, 196.0, 293.66, 392.0), 0.48, attack=0.32, release=0.82)
        for index, note in enumerate((293.66, 440.0, 587.33, 880.0, 1174.66, 1318.51)):
            sound.bell(0.31 + index * 0.22, note, 0.145, duration=1.10, decay=3.2,
                       pan=(-0.62, 0.45, -0.32, 0.61, -0.06, 0.29)[index])
        sound.sub(1.20, 73.42, 0.24, duration=0.82, end=49.0)
    elif name == "lunar_failure":
        sound.air(0.0, 1.62, 0.27, cutoff_start=3_300, cutoff_end=80, pan_start=0.48, pan_end=-0.51,
                  seed_offset=150, attack=0.028, release=0.56)
        sound.sub(0.0, 73.42, 0.38, duration=1.28, end=29.14)
        sound.tone(0.04, 1.42, 220.0, 0.19, end_frequency=82.41, attack=0.07, release=0.68,
                   pan=-0.15, vibrato=0.006, vibrato_rate=1.6, color=0.05)
        sound.bell(0.12, 293.66, 0.13, duration=0.88, decay=3.8, pan=0.33, dark=True)
        sound.bell(0.48, 207.65, 0.11, duration=0.92, decay=3.7, pan=-0.31, dark=True)
    else:
        raise ValueError(f"Unknown cue {name}")
    sound.write_ogg(name, peak_db)


SUITE = (
    ("lunar_nav_a", 0.34, 101, -10.0),
    ("lunar_nav_b", 0.36, 102, -10.0),
    ("lunar_nav_c", 0.37, 103, -10.0),
    ("lunar_open", 0.74, 104, -8.0),
    ("lunar_close", 0.58, 105, -8.0),
    ("lunar_confirm", 0.78, 106, -7.0),
    ("lunar_day_a", 1.12, 107, -5.0),
    ("lunar_day_b", 1.12, 108, -5.0),
    ("lunar_settle", 0.64, 109, -7.0),
    ("lunar_save", 0.82, 110, -7.0),
    ("lunar_profit_a", 1.28, 111, -4.0),
    ("lunar_profit_b", 1.31, 112, -4.0),
    ("lunar_creative_a", 0.94, 113, -6.0),
    ("lunar_creative_b", 0.97, 114, -6.0),
    ("lunar_swap", 0.94, 115, -6.0),
    ("lunar_correct", 0.96, 116, -5.0),
    ("lunar_wrong", 0.66, 117, -7.0),
    ("lunar_warning", 0.92, 118, -5.0),
    ("lunar_crisis", 1.30, 119, -3.5),
    ("lunar_epic", 1.48, 120, -3.0),
    ("lunar_legendary", 2.08, 121, -2.5),
    ("lunar_victory", 2.70, 122, -2.0),
    ("lunar_failure", 1.82, 123, -4.0),
)


def main() -> None:
    for cue in SUITE:
        build(*cue)
        print(f"generated assets/audio/{cue[0]}.ogg")


if __name__ == "__main__":
    main()
