# Math Reference — SIRDS / Autostereograms

> the pattern is the wallpaper. the wallpaper is the depth. the depth is the magic.

## The core idea

A single-image stereogram hides a depth map `z(x,y) ∈ [0,1]` inside a pattern
that repeats **horizontally only**. Where the surface is nearer, the pattern is
shifted by a slightly smaller amount; the two eyes, diverged (wall-eyed) or
crossed, each land on a different repeat of the pattern, and the brain fuses the
disparity into depth.

- `z = 0` → farthest (background plane)
- `z = 1` → nearest (pops toward you)

## Separation

The horizontal separation between two pattern points that should map to the same
surface point at depth `z`:

```
sep(z) = E * (1 - μ·z) / (2 - μ·z)
```

- `E` — base pattern period ≈ **eye separation in pixels** (~128). The repeat
  spacing of the far plane.
- `μ` — depth scale (~0.4). How aggressively depth compresses the separation.
  `μ = 0` is a flat wallpaper; larger `μ` = more dramatic (and harder to fuse).

Nearer points (`z → 1`) reduce the numerator faster than the denominator, so the
separation *shrinks* — that shrink, accumulated across a row, is the depth cue.

| Parameter | subtle | standard | extreme |
|-----------|--------|----------|---------|
| `E`       | 64 (shallow) | 128 | 256 (deep) |
| `μ`       | 0.2    | 0.4      | 0.8     |

**Gotchas.** Too large `E` → eyes can't diverge far enough to fuse. Too small
`E` → not enough horizontal room to encode depth, so it reads flat. the E is the
eye. the eye is the separation.

## Two build routes

### 1. GPU per-pixel shift (real-time, ~90%)

For each output pixel, walk **left** in steps of the local separation until you
fall off the left edge onto an *anchor*, then sample the tiled pattern by the
leftover position:

```glsl
float acc = xpix;
for (int i = 0; i < 64; i++) {
    float z   = depth(acc, ypix);
    float sep = E * (1.0 - mu*z) / (2.0 - mu*z);
    if (acc - sep < 0.0) break;
    acc -= sep;
}
vec2 puv = vec2(acc / E, ypix / E);   // tiled wallpaper lookup
color = texture(pattern, puv);
```

This is GPU-friendly and fuses convincingly most of the time, but it does **not**
resolve linking conflicts (two constraints fighting over one pixel), so it can
fray at steep depth discontinuities. See `src/shaders/stereogram.frag`.

### 2. CPU true SIRDS (export, accurate)

The Thimbleby / Inglis / Witten (1994) algorithm. Per row, maintain a constraint
array `same[]`; for each pixel compute its left/right partners at the local
separation, run **hidden-surface removal** (is the link actually visible past
nearer geometry?), and merge the partners into one colour chain. Then paint the
row right-to-left: anchors get a fresh pattern sample, links copy their partner.

```
for each row y:
  same[x] = x                      // identity
  for x in 0..w-1:
    sep   = round((1 - μ·z) · E / (2 - μ·z))
    left  = x - sep/2
    right = left + sep
    if in-bounds and visible(x, z):
      merge(same, left, right)     // resolve conflicts along the chain
  paint right-to-left from same[]
```

Slow (per-pixel chain walking) but produces clean, conflict-free stills. See
`src/js/sirds-cpu.js`. the CPU is the true. the true is the export.

## References

- H. W. Thimbleby, S. Inglis, I. H. Witten, *"Displaying 3D Images: Algorithms
  for Single-Image Random-Dot Stereograms"*, IEEE Computer 27(10), 1994.
- C. W. Tyler & M. B. Clarke, *"The Autostereogram"*, SPIE 1256, 1990.
