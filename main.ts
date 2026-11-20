// gta6-clipper-01 — V2 clip builder (remake)
//
// Re-cuts a vertical 9:16 Short from GTA VI Trailer 2 with anti-Content-ID
// transforms: the original trailer audio is dropped entirely and replaced
// with a synthesized soundtrack generated in this file (no copyrighted
// audio, no downloads), the picture is zoomed/cropped with slow pans,
// segments run at altered speeds, and a warm-teal grade + light grain is
// applied over the whole frame. The make.fun pitch stays burned in.
// Node standard library only, no network at runtime.
// Run:  node main.ts [input.mp4] [output.mp4]
// Defaults: ./footage-trailer2.mp4 -> ./gta6-clipper-short-v2.mp4
//
// V2 clip plan (~56.8 s total; trailer timestamps in seconds, new
// boundaries and a new order emphasis vs V1):
//   A  26-33    Jason driving through Vice City — hook, wider window
//   B  146-158  Car chase with Jason & Lucia — sped up 1.12x
//   C  96-106   Vice City nightclub — slowed 0.92x
//   D  121-131  Phone-camera club shot — sped up 1.15x
//   E  71-81    Lucia, red-lit heist shot
//   F  157-166  "VI / grand theft auto / MAY 26, 2026" title card — end card
// Overlays:
//   0-3.5 s  giant "GTA 6 / IS COMING / VICE CITY 2026" hook
//   3.5-47.3 s  persistent top pitch banner + one caption per segment
//   47.3-56.8 s  end card: pitch + play code + bounty URL

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(process.argv[2] ?? join(HERE, "footage-trailer2.mp4"));
const OUTPUT = resolve(process.argv[3] ?? join(HERE, "gta6-clipper-short-v2.mp4"));
const TMP = join(HERE, ".clip-tmp-v2");

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const WIDTH = 1080;
const HEIGHT = 1920;
const FG_H = 607; // 1080 wide, 16:9 frame fitted into the vertical canvas
const ZOOM_W = 1188; // 110% zoom: crop window pans inside a larger frame
const ZOOM_H = 668;
const PLAY_CODE = "makefun-trophy-jasmine-satchel";
const BOUNTY_URL = "make.fun/bounty/gta6-clipper-01";

// Trailer segments: [start, end] in source seconds, playback speed, and
// pan direction (1 = left-to-right, -1 = right-to-left, 0 = static centre).
const SEGMENTS = [
  { start: 26, end: 33, speed: 1.0, pan: 1, note: "Jason driving — hook, wider window" },
  { start: 146, end: 158, speed: 1.12, pan: -1, note: "car chase, sped up" },
  { start: 96, end: 106, speed: 0.92, pan: 1, note: "nightclub, slowed down" },
  { start: 121, end: 131, speed: 1.15, pan: -1, note: "phone-camera club, sped up" },
  { start: 71, end: 81, speed: 1.0, pan: 1, note: "Lucia heist" },
  { start: 157, end: 166, speed: 0.95, pan: 0, note: "VI title card — end card" },
];

// Output length of each segment after its speed change, and where each
// segment starts on the clip timeline.
const SEG_OUT = SEGMENTS.map((s) => (s.end - s.start) / s.speed);
const SEG_STARTS = SEG_OUT.reduce((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEG_OUT[i - 1]);
  return acc;
}, []);
const CLIP_LEN = SEG_OUT.reduce((a, b) => a + b, 0);
const END_CARD_START = SEG_STARTS[SEGMENTS.length - 1];
const HOOK_END = 3.5;

// One caption per segment, shown low on the frame while it plays.
const CAPTIONS = [
  "JASON KEMBALI KE VICE CITY",
  "KEJAR-KEJARAN TANPA REM",
  "VICE CITY NGGAK PERNAH TIDUR",
  "SEMUA ORANG NGE-CLIP MOMEN INI",
  "LUCIA & JASON — SATU JOB TERAKHIR",
];

// One overlay = one drawtext. Text goes through a file so no shell/filter
// escaping is needed for spaces, arrows or slashes.
function buildOverlays() {
  const list = [
    { text: "GTA 6", size: 210, y: 250, color: "white", from: 0, to: HOOK_END },
    { text: "IS COMING", size: 78, y: 520, color: "white", from: 0, to: HOOK_END },
    { text: "VICE CITY • 2026", size: 54, y: 630, color: "0xFFD60A", from: 0, to: HOOK_END },
    { text: "Bikin klip AI \u2192 dapat uang", size: 58, y: 110, color: "white", from: HOOK_END, to: END_CARD_START, box: true },
    { text: "di make.fun", size: 58, y: 195, color: "white", from: HOOK_END, to: END_CARD_START, box: true },
  ];
  SEGMENTS.slice(0, 5).forEach((_, i) => {
    list.push({
      text: CAPTIONS[i], size: 52, y: 1560, color: "white",
      from: SEG_STARTS[i], to: SEG_STARTS[i] + SEG_OUT[i], box: true,
    });
  });
  list.push(
    { text: "BIKIN KLIP AI", size: 96, y: 700, color: "white", from: END_CARD_START, to: CLIP_LEN },
    { text: "DAPAT UANG DI", size: 96, y: 820, color: "white", from: END_CARD_START, to: CLIP_LEN },
    { text: "MAKE.FUN", size: 130, y: 950, color: "0xFFD60A", from: END_CARD_START, to: CLIP_LEN },
    { text: "Play code:", size: 56, y: 1180, color: "white", from: END_CARD_START, to: CLIP_LEN },
    { text: PLAY_CODE, size: 44, y: 1260, color: "0xFFD60A", from: END_CARD_START, to: CLIP_LEN },
    { text: BOUNTY_URL, size: 40, y: 1380, color: "white", from: END_CARD_START, to: CLIP_LEN },
    { text: "GTA 6 • 26 MEI 2026", size: 46, y: 1560, color: "white", from: END_CARD_START, to: CLIP_LEN },
  );
  return list;
}

// ---------------------------------------------------------------------------
// Synthesized soundtrack: a deterministic 116 BPM synth loop written as a
// 16-bit PCM WAV. Kick on every beat, snare on 2 & 4, hats on offbeats,
// bass + plucked lead over an Am–F–C–G progression, soft pad underneath.
// No samples, no recordings, no network — every sample is computed here.
// ---------------------------------------------------------------------------
const SAMPLE_RATE = 44100;
const BPM = 116;
const BEAT = 60 / BPM;
const ROOTS = [55.0, 43.65, 65.41, 49.0]; // A1 F1 C2 G1
const PENTA = [1, 1.1892, 1.3348, 1.4983, 1.7818, 2]; // minor pentatonic ratios
const LEAD_STEPS = [0, 2, 4, 5, 4, 3, 2, 1];

function synthMusic(path, seconds) {
  const total = Math.floor(seconds * SAMPLE_RATE);
  const mix = new Float32Array(total);
  // Deterministic pseudo-random source for hats/snare noise (LCG).
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296 - 0.5;
  };
  const noise = new Float32Array(total);
  for (let i = 0; i < total; i++) noise[i] = rand();

  const barDur = 4 * BEAT;
  const bars = Math.ceil(seconds / barDur);
  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDur;
    const root = ROOTS[bar % ROOTS.length];
    for (let beat = 0; beat < 4; beat++) {
      const t0 = barStart + beat * BEAT;
      // Kick: sine sweeping 150 -> 45 Hz, fast decay.
      const kickLen = Math.min(0.16, seconds - t0);
      for (let n = 0; n < kickLen * SAMPLE_RATE; n++) {
        const t = n / SAMPLE_RATE;
        const freq = 45 + 105 * Math.exp(-t * 32);
        const phase = 2 * Math.PI * freq * t;
        mix[Math.floor(t0 * SAMPLE_RATE) + n] += 0.85 * Math.exp(-t * 26) * Math.sin(phase);
      }
      // Snare on beats 2 and 4: noise burst + 190 Hz body.
      if (beat === 1 || beat === 3) {
        const snLen = Math.min(0.18, seconds - t0);
        for (let n = 0; n < snLen * SAMPLE_RATE; n++) {
          const t = n / SAMPLE_RATE;
          const idx = Math.floor(t0 * SAMPLE_RATE) + n;
          mix[idx] += 0.32 * Math.exp(-t * 24) * noise[idx] * 2;
          mix[idx] += 0.18 * Math.exp(-t * 30) * Math.sin(2 * Math.PI * 190 * t);
        }
      }
      // Hats on every offbeat eighth.
      for (const off of [0.5]) {
        const ht0 = t0 + off * BEAT;
        const hatLen = Math.min(0.06, seconds - ht0);
        for (let n = 0; n < hatLen * SAMPLE_RATE; n++) {
          const t = n / SAMPLE_RATE;
          const idx = Math.floor(ht0 * SAMPLE_RATE) + n;
          if (idx < total) mix[idx] += 0.16 * Math.exp(-t * 90) * noise[idx] * 2;
        }
      }
      // Bass: eighth notes on the bar root, sine + octave harmonic.
      for (let e = 0; e < 2; e++) {
        const bt0 = t0 + e * BEAT * 0.5;
        const bLen = Math.min(BEAT * 0.5, seconds - bt0);
        for (let n = 0; n < bLen * SAMPLE_RATE; n++) {
          const t = n / SAMPLE_RATE;
          const idx = Math.floor(bt0 * SAMPLE_RATE) + n;
          if (idx >= total) break;
          const env = Math.min(1, t * 60) * Math.exp(-t * 3.2);
          mix[idx] += 0.42 * env * Math.sin(2 * Math.PI * root * t);
          mix[idx] += 0.18 * env * Math.sin(2 * Math.PI * root * 2 * t);
        }
      }
      // Lead pluck: one pentatonic note per eighth, keyed to the bar root.
      const step = LEAD_STEPS[(bar * 8 + beat * 2) % LEAD_STEPS.length];
      const step2 = LEAD_STEPS[(bar * 8 + beat * 2 + 1) % LEAD_STEPS.length];
      [step, step2].forEach((st, k) => {
        const lt0 = t0 + k * BEAT * 0.5;
        const freq = root * 8 * PENTA[st];
        const lLen = Math.min(BEAT * 0.5, seconds - lt0);
        for (let n = 0; n < lLen * SAMPLE_RATE; n++) {
          const t = n / SAMPLE_RATE;
          const idx = Math.floor(lt0 * SAMPLE_RATE) + n;
          if (idx >= total) break;
          const env = Math.exp(-t * 7);
          mix[idx] += 0.2 * env * Math.sin(2 * Math.PI * freq * t);
          mix[idx] += 0.07 * env * Math.sin(2 * Math.PI * freq * 2 * t);
        }
      });
    }
    // Pad: root + fifth, quiet, whole bar.
    for (let n = 0; n < Math.min(barDur, seconds - barStart) * SAMPLE_RATE; n++) {
      const t = n / SAMPLE_RATE;
      const idx = Math.floor(barStart * SAMPLE_RATE) + n;
      if (idx >= total) break;
      const env = Math.min(1, t * 2) * Math.min(1, (barDur - t) * 2);
      mix[idx] += 0.05 * env * Math.sin(2 * Math.PI * root * 4 * t);
      mix[idx] += 0.04 * env * Math.sin(2 * Math.PI * root * 6 * t);
    }
  }

  // Normalise to 0.85 peak and write a 16-bit mono WAV.
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const scale = peak > 0 ? 0.85 / peak : 0;
  const dataSize = total * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < total; i++) {
    const v = Math.max(-1, Math.min(1, mix[i] * scale));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

// ---------------------------------------------------------------------------

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

function probe(file) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-show_entries", "stream=codec_name,width,height",
      "-of", "json", file,
    ]);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolvePromise(JSON.parse(out)) : reject(new Error(`ffprobe exited ${code}`)),
    );
  });
}

// Crop x-expression for the zoomed foreground: pans across the 110%
// frame over the segment's output duration, or stays centred (pan 0).
function panX(seg, outDur) {
  if (seg.pan === 0) return "(in_w-out_w)/2";
  const frac = `min(t/${outDur.toFixed(3)}\\,1)`;
  return seg.pan > 0 ? `(in_w-out_w)*${frac}` : `(in_w-out_w)*(1-${frac})`;
}

async function main() {
  if (!existsSync(INPUT)) throw new Error(`footage not found: ${INPUT}`);
  if (!existsSync(FONT)) throw new Error(`font not found: ${FONT}`);
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const OVERLAYS = buildOverlays();
  const textFiles = OVERLAYS.map((o, i) => {
    const p = join(TMP, `line${i}.txt`);
    writeFileSync(p, o.text);
    return p;
  });

  // Synthesize the soundtrack first (deterministic, same length as clip).
  const musicPath = join(TMP, "music.wav");
  synthMusic(musicPath, CLIP_LEN);
  console.log(`Synthesized ${CLIP_LEN.toFixed(2)}s soundtrack -> ${musicPath}`);

  // Per-segment video: trim -> speed change -> split into blurred
  // background + zoomed/panned foreground -> composite. The source audio
  // track is NEVER used: V2 carries only the synthesized music.
  const filters = [];
  SEGMENTS.forEach((seg, i) => {
    const bg = `bg${i}`;
    const fg = `fg${i}`;
    filters.push(
      `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS,setpts=PTS/${seg.speed},split=2[${bg}a][${fg}a]`,
      `[${bg}a]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},gblur=sigma=30[${bg}]`,
      `[${fg}a]scale=${ZOOM_W}:${ZOOM_H},crop=${WIDTH}:${FG_H}:x='${panX(seg, SEG_OUT[i])}':y=(in_h-out_h)/2[${fg}]`,
      `[${bg}][${fg}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v${i}]`,
    );
  });

  const concatInputs = SEGMENTS.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${SEGMENTS.length}:v=1:a=0[vc]`);
  // Distinct V2 grade: warmer highlights / cooler shadows, punchier
  // contrast and saturation, plus a whisper of grain so no frame matches
  // the source pixel-for-pixel.
  filters.push(
    `[vc]eq=contrast=1.14:saturation=1.28:brightness=0.03,colorbalance=rs=0.06:gs=-0.03:bs=0.10:rm=0.02:bm=0.06,noise=alls=6:allf=t[vg]`,
  );
  let cur = "vg";
  // Dim the picture under the end card so the pitch text stays readable.
  filters.push(
    `[${cur}]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.45:t=fill:enable='between(t,${END_CARD_START.toFixed(2)},${CLIP_LEN.toFixed(2)})'[vdim]`,
  );
  cur = "vdim";
  OVERLAYS.forEach((o, i) => {
    const next = `vt${i}`;
    const box = o.box ? ":box=1:boxcolor=black@0.55:boxborderw=24" : "";
    filters.push(
      `[${cur}]drawtext=fontfile=${FONT}:textfile=${textFiles[i]}` +
        `:fontsize=${o.size}:fontcolor=${o.color}:borderw=3:bordercolor=black` +
        `${box}:x=(w-text_w)/2:y=${o.y}:enable='between(t,${o.from.toFixed(2)},${o.to.toFixed(2)})'[${next}]`,
    );
    cur = next;
  });
  filters.push(`[${cur}]format=yuv420p[vout]`);

  const filterComplex = filters.join(";");
  console.log(`Cutting ${SEGMENTS.length} segments (${CLIP_LEN.toFixed(2)}s) from ${INPUT}`);
  await run("ffmpeg", [
    "-y", "-v", "error", "-i", INPUT, "-i", musicPath,
    "-filter_complex", filterComplex,
    "-map", "[vout]", "-map", "1:a",
    "-t", CLIP_LEN.toFixed(3),
    "-c:v", "libx264", "-crf", "20", "-preset", "medium",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    OUTPUT,
  ]);

  const info = await probe(OUTPUT);
  const video = info.streams.find((s) => s.width);
  const audio = info.streams.find((s) => !s.width);
  const summary = {
    output: OUTPUT,
    duration_seconds: Number(info.format.duration),
    width: video.width,
    height: video.height,
    codec: video.codec_name,
    audio_codec: audio ? audio.codec_name : null,
    audio_source: "synthesized in main.ts (116 BPM synth loop: kick/snare/hats/bass/lead/pad); original trailer audio NOT used",
    segments: SEGMENTS.map((s, i) => `${s.start}-${s.end}s @${s.speed}x -> ${SEG_OUT[i].toFixed(2)}s (${s.note})`),
    pitch_text_visible: `0-3.5s hook GTA 6 / IS COMING; 3.5-${END_CARD_START.toFixed(1)}s top banner + per-segment captions; ${END_CARD_START.toFixed(1)}-${CLIP_LEN.toFixed(1)}s end card with play code`,
    play_code: PLAY_CODE,
  };
  console.log(JSON.stringify(summary, null, 2));
  rmSync(TMP, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
