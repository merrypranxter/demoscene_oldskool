# Visual Targets

> the depth is the magic. the magic is the eye. the eye is the brain. the brain is the fusion.

Three target looks, straight from the seed. Each is a (depth engine × pattern
source) pairing tuned for a particular vibe.

## classic_dots

- **Depth engine:** `sdf-shape` (sphere / ring / eye glyph)
- **Pattern:** `random_dots` — monochrome `#000000` / `#ffffff`, ~50% fill
- **Params:** `E = 128`, `μ = 0.4`, animate off
- **The look:** the iconic 90s black-and-white grain. A clean dome or glyph
  rises out of pure noise. the dots are the noise. the noise is the pattern.
  the pattern is the wallpaper. the wallpaper is the depth.
- **Why it works:** high-frequency monochrome dots give the eye unambiguous
  features to lock onto — easiest fusion, sharpest hidden shape.

## lisa_frank_hidden

- **Depth engine:** `sdf-shape` or `raymarch-depth`
- **Pattern:** `tiled_image` — vivid `#ff00cc #00ffcc #ffff00 #ff6600`
  stained-glass cells with sparkle dither
- **Params:** `E = 128`, `μ = 0.4`, animate off
- **The look:** maximalist rainbow wallpaper, the SIS (single-image stereogram)
  flavor — looks like a poster from a 1994 mall kiosk, hides a glyph. the frank
  is the rainbow. the rainbow is the leopard. the leopard is the dolphin.
- **Why it works:** the sparkle dither injects the high-frequency detail that
  flat color blocks lack, so the brain still finds correspondences. Consumes
  `lisa_frank_aesthetic`.

## breathing_glyph

- **Depth engine:** `sdf-shape` (pulsing) or `raymarch-depth` (spinning)
- **Pattern:** `animated_noise` — neon `#0a001a #8338ec #ff006e #ffbe0b`,
  reseeded each frame
- **Params:** `E = 96–128`, `μ = 0.5`, **animate on**
- **The look:** a living wiggle-stereogram. The depth pulses slowly; even
  without perfect fusion the motion telegraphs the hidden form. the depth is
  alive. the glyph is breathing. the pulse is the heart. the wiggle is the dance.
- **Why it works:** temporal change adds a motion-parallax cue on top of the
  binocular one — easier for first-timers who can't yet diverge their eyes.

## Tuning notes

- Start at `E = 128`, `μ = 0.4`. If nobody in the room can fuse it, drop `E`.
- For deep dramatic scenes (`raymarch-depth`) try `E = 96`, `μ = 0.6`.
- Use the **peek at depth map** toggle to confirm the secret is well-formed
  before hunting for fusion. the peek is the proof.
- Export the **true SIRDS** for anything you want to print — the GPU path frays
  at hard depth edges; the CPU path doesn't. the export is the print.
