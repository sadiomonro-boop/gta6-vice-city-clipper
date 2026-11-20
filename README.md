# GTA 6 Clipper — make.fun bounty entry (gta6-clipper-01)

A 45-second vertical (1080x1920) Short cut from Rockstar's GTA VI Trailer 2
(May 2026) with the make.fun pitch burned into the picture. Built for the
$500 "Clip GTA 6 for the most YouTube views" bounty on make.fun — ranked
purely by YouTube views at the deadline (Mon 23 Nov 2026 08:00 WIB).

## The clip

| Segment | Trailer time | Content |
| --- | --- | --- |
| A (hook) | 28–32 s | Jason driving through Vice City |
| B | 73–81 s | Lucia, red-lit heist shot |
| C | 98–106 s | Vice City nightclub |
| D | 123–131 s | Phone-camera club shot |
| E | 148–158 s | Car chase with Jason & Lucia |
| F (end card) | 158–165 s | "VI / grand theft auto / MAY 26, 2026" title card |

Overlays: 0–4 s giant "GTA 6 / VICE CITY" hook; 4–38 s persistent banner
"Bikin klip AI → dapat uang di make.fun"; 38–45 s end card with the pitch,
play code `makefun-trophy-jasmine-satchel`, and the bounty URL.

## Why this cut

- **Hook first:** the first frame is Jason in the driver's seat with a giant
  "GTA 6" — recognisable in under a second on a Shorts feed.
- **Variety, no dead air:** six shots in 45 s — driving, heist, nightlife,
  phone-clip energy, chase, title card. Nothing lingers long enough to swipe
  away from.
- **Pitch is on screen the whole time after the hook:** the banner runs
  4–38 s and the end card repeats it with the play code, so the make.fun
  pitch survives even if the viewer watches with sound off.
- **Vertical done properly:** blurred-fill background + fitted foreground,
  so no shot is cropped and no face is cut off.

## Build

Requirements: `ffmpeg` (with libx264 + drawtext) and Node.js 22+.

```sh
# 1. Get the footage: GTA VI Trailer 2 (Rockstar, May 2026)
#    e.g. yt-dlp -f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]" \
#      -o footage-trailer2.mp4 "https://www.youtube.com/watch?v=VQRLujxTm3c"
# 2. Render the clip (Node standard library only, no network at runtime)
node main.ts [footage-trailer2.mp4] [gta6-clipper-short.mp4]
```

`main.ts` trims the six segments, composites each into 1080x1920
(blurred background + fitted foreground), concatenates them, burns the
text overlays with ffmpeg `drawtext`, and verifies the output with
`ffprobe` (duration, resolution, codec). Output: 45 s, 1080x1920, H.264 +
AAC, 30 fps.

## Files

- `main.ts` — the program that produces/cuts the clip
- `VIDEO.json` — the video's YouTube address (placeholder until uploaded)
- `gta6-clipper-short.mp4` — the rendered Short (45 s, 1080x1920)
- `footage-trailer2.mp4` — source trailer (not in the repo; Rockstar footage)

## License

MIT
