// gta6-clipper-01 — clip builder
//
// Cuts a vertical 9:16 Short from Rockstar's GTA VI Trailer 2 and burns the
// make.fun pitch into the picture. Node standard library only, no network.
// Run:  node main.ts [input.mp4] [output.mp4]
// Defaults: ./footage-trailer2.mp4 -> ./gta6-clipper-short.mp4
//
// Clip plan (45 s total, trailer timestamps in seconds):
//   A  28-32   Jason driving through Vice City — the hook (GTA 6 in frame 1)
//   B  73-81   Lucia, red-lit heist shot — action
//   C  98-106  Vice City nightclub — vibe / nightlife
//   D 123-131  Phone-camera club shot — "clip" energy, meta for a clipper
//   E 148-158  Car chase with Jason & Lucia — stakes
//   F 158-165  The "VI / grand theft auto / MAY 26, 2026" title card — end card
// Overlays:
//   0-4 s   giant "GTA 6" + "VICE CITY" hook text
//   4-38 s  persistent pitch banner: "Bikin klip AI -> dapat uang di make.fun"
//   38-45 s end card: pitch + play code + bounty URL over the title card

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(process.argv[2] ?? join(HERE, "footage-trailer2.mp4"));
const OUTPUT = resolve(process.argv[3] ?? join(HERE, "gta6-clipper-short.mp4"));
const TMP = join(HERE, ".clip-tmp");

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const WIDTH = 1080;
const HEIGHT = 1920;
const FG_H = 607; // 1080 wide, 16:9 frame fitted into the vertical canvas
const PLAY_CODE = "makefun-trophy-jasmine-satchel";
const BOUNTY_URL = "make.fun/bounty/gta6-clipper-01";

// Trailer segments: [start, end] in source seconds, in clip order.
const SEGMENTS = [
  { start: 28, end: 32, note: "Jason driving — hook" },
  { start: 73, end: 81, note: "Lucia heist" },
  { start: 98, end: 106, note: "nightclub" },
  { start: 123, end: 131, note: "phone-camera club" },
  { start: 148, end: 158, note: "car chase" },
  { start: 158, end: 165, note: "VI title card — end card" },
];

const CLIP_LEN = SEGMENTS.reduce((sum, s) => sum + (s.end - s.start), 0);
const PITCH_START = 38; // end card begins when the title-card segment starts

// One overlay = one drawtext. Text goes through a file so no shell/filter
// escaping is needed for spaces, arrows or slashes.
const OVERLAYS = [
  { text: "GTA 6", size: 220, y: 300, color: "white", from: 0, to: 4 },
  { text: "VICE CITY", size: 84, y: 570, color: "white", from: 0, to: 4 },
  { text: "Bikin klip AI \u2192 dapat uang", size: 62, y: 1400, color: "white", from: 4, to: 38, box: true },
  { text: "di make.fun", size: 62, y: 1490, color: "white", from: 4, to: 38, box: true },
  { text: "BIKIN KLIP AI", size: 96, y: 740, color: "white", from: PITCH_START, to: CLIP_LEN },
  { text: "DAPAT UANG DI", size: 96, y: 860, color: "white", from: PITCH_START, to: CLIP_LEN },
  { text: "MAKE.FUN", size: 130, y: 990, color: "0xFFD60A", from: PITCH_START, to: CLIP_LEN },
  { text: "Play code:", size: 56, y: 1210, color: "white", from: PITCH_START, to: CLIP_LEN },
  { text: PLAY_CODE, size: 48, y: 1290, color: "0xFFD60A", from: PITCH_START, to: CLIP_LEN },
  { text: BOUNTY_URL, size: 40, y: 1410, color: "white", from: PITCH_START, to: CLIP_LEN },
];

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

async function main() {
  if (!existsSync(INPUT)) throw new Error(`footage not found: ${INPUT}`);
  if (!existsSync(FONT)) throw new Error(`font not found: ${FONT}`);
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  // Write one text file per overlay line.
  const textFiles = OVERLAYS.map((o, i) => {
    const p = join(TMP, `line${i}.txt`);
    writeFileSync(p, o.text);
    return p;
  });

  // Per-segment video: trim -> split into blurred background + fitted
  // foreground -> composite. Per-segment audio: trim + reset timestamps.
  const filters = [];
  SEGMENTS.forEach((seg, i) => {
    const bg = `bg${i}`;
    const fg = `fg${i}`;
    filters.push(
      `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS,split=2[${bg}a][${fg}a]`,
      `[${bg}a]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},gblur=sigma=30[${bg}]`,
      `[${fg}a]scale=${WIDTH}:${FG_H}[${fg}]`,
      `[${bg}][${fg}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v${i}]`,
      `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}]`,
    );
  });

  // Join the segments. concat takes inputs interleaved per segment:
  // video then audio for each segment, in clip order.
  const concatInputs = SEGMENTS.map((_, i) => `[v${i}][a${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${SEGMENTS.length}:v=1:a=1[vc][ac]`);
  let cur = "vc";
  // Dim the picture under the end card so the pitch text stays readable.
  filters.push(
    `[${cur}]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.45:t=fill:enable='between(t,${PITCH_START},${CLIP_LEN})'[vdim]`,
  );
  cur = "vdim";
  OVERLAYS.forEach((o, i) => {
    const next = `vt${i}`;
    const box = o.box ? ":box=1:boxcolor=black@0.55:boxborderw=24" : "";
    filters.push(
      `[${cur}]drawtext=fontfile=${FONT}:textfile=${textFiles[i]}` +
        `:fontsize=${o.size}:fontcolor=${o.color}:borderw=3:bordercolor=black` +
        `${box}:x=(w-text_w)/2:y=${o.y}:enable='between(t,${o.from},${o.to})'[${next}]`,
    );
    cur = next;
  });
  filters.push(`[${cur}]format=yuv420p[vout]`);

  const filterComplex = filters.join(";");
  console.log(`Cutting ${SEGMENTS.length} segments (${CLIP_LEN}s) from ${INPUT}`);
  await run("ffmpeg", [
    "-y", "-v", "error", "-i", INPUT,
    "-filter_complex", filterComplex,
    "-map", "[vout]", "-map", "[ac]",
    "-c:v", "libx264", "-crf", "20", "-preset", "medium",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    OUTPUT,
  ]);

  const info = await probe(OUTPUT);
  const video = info.streams.find((s) => s.width);
  const summary = {
    output: OUTPUT,
    duration_seconds: Number(info.format.duration),
    width: video.width,
    height: video.height,
    codec: video.codec_name,
    segments: SEGMENTS.map((s) => `${s.start}-${s.end}s (${s.note})`),
    pitch_text_visible: "0-4s hook GTA 6 / VICE CITY; 4-38s banner; 38-45s end card with play code",
    play_code: PLAY_CODE,
  };
  console.log(JSON.stringify(summary, null, 2));
  rmSync(TMP, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
