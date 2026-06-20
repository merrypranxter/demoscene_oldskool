// pattern-sources.js — the wallpaper generators.
// the pattern is the wallpaper. the wallpaper is the depth. the depth is the magic.
//
// Each source returns a small square ImageData/canvas, tiled horizontally with
// period E by the stereogram shader. Three flavors from the seed:
//   random_dots  — monochrome SIRDS classic       (classic_dots)
//   tiled_image  — vivid maximalist SIS texture    (lisa_frank_hidden)
//   animated_noise — living neon noise             (breathing)

export const PALETTES = {
  classic:    ['#000000', '#ffffff'],
  lisa_frank: ['#ff00cc', '#00ffcc', '#ffff00', '#ff6600'],
  neon_noise: ['#0a001a', '#8338ec', '#ff006e', '#ffbe0b'],
};

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Deterministic per-cell PRNG so a frame is stable unless we ask for motion.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// classic monochrome random dots. the dots are the noise. ~50% fill.
function randomDots(size, seed) {
  const img = new ImageData(size, size);
  const rnd = mulberry32(seed);
  const [bg, fg] = PALETTES.classic.map(hexToRgb);
  for (let i = 0; i < size * size; i++) {
    const on = rnd() < 0.5;
    const c = on ? fg : bg;
    const o = i * 4;
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  return img;
}

// vivid tiled maximalism. the frank is the rainbow. blobby color cells + sparkle.
function tiledImage(size, seed) {
  const img = new ImageData(size, size);
  const rnd = mulberry32(seed);
  const pal = PALETTES.lisa_frank.map(hexToRgb);
  // a handful of soft color centers; nearest-center wins -> stained-glass cells
  const centers = [];
  const N = 7;
  for (let k = 0; k < N; k++) {
    centers.push({ x: rnd() * size, y: rnd() * size, c: pal[(rnd() * pal.length) | 0] });
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let best = 1e9, col = pal[0];
      for (const c of centers) {
        // toroidal distance so the tile wraps seamlessly
        let dx = Math.abs(x - c.x); dx = Math.min(dx, size - dx);
        let dy = Math.abs(y - c.y); dy = Math.min(dy, size - dy);
        const d = dx * dx + dy * dy;
        if (d < best) { best = d; col = c.c; }
      }
      // sparkle dither so high-frequency detail aids fusion. the sparkle is the lock.
      const spark = rnd() < 0.12 ? 60 : 0;
      const o = (y * size + x) * 4;
      img.data[o]     = Math.min(255, col[0] + spark);
      img.data[o + 1] = Math.min(255, col[1] + spark);
      img.data[o + 2] = Math.min(255, col[2] + spark);
      img.data[o + 3] = 255;
    }
  }
  return img;
}

// living neon noise. the living is the time. value-noise field, reseeded per call.
function animatedNoise(size, seed) {
  const img = new ImageData(size, size);
  const rnd = mulberry32(seed);
  const pal = PALETTES.neon_noise.map(hexToRgb);
  for (let i = 0; i < size * size; i++) {
    const r = rnd();
    const idx = Math.min(pal.length - 1, (r * pal.length) | 0);
    const c = pal[idx];
    const o = i * 4;
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  return img;
}

/**
 * Build an ImageData pattern tile.
 * @param {string} kind  random_dots | tiled_image | animated_noise
 * @param {number} size  tile size in px (use the period E for a clean 1:1 tile)
 * @param {number} seed  PRNG seed (bump per-frame for animated_noise)
 */
export function makePattern(kind, size, seed = 1337) {
  size = Math.max(8, Math.round(size));
  switch (kind) {
    case 'tiled_image':    return tiledImage(size, seed);
    case 'animated_noise': return animatedNoise(size, seed);
    case 'random_dots':
    default:               return randomDots(size, seed);
  }
}

// Does this source want a fresh tile every frame?
export function isLiving(kind) {
  return kind === 'animated_noise';
}
