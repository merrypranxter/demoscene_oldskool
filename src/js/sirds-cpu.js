// sirds-cpu.js — the true row-linking SIRDS. Thimbleby / Inglis / Witten (1994),
// "Displaying 3D Images: Algorithms for Single-Image Random-Dot Stereograms".
// the CPU is the true. the true is the slow. the slow is the accurate.
//
// The GPU path (stereogram.frag) walks left per-pixel and never resolves
// conflicts between links. This one maintains the same[] constraint array per
// row, links pixels that must share a colour, performs hidden-surface removal,
// then paints right-to-left. Export-quality stills. the export is the print.

/**
 * @param {Float32Array} depth  z in [0,1], length w*h, row-major, y=0 at top.
 * @param {number} w
 * @param {number} h
 * @param {Object} opts
 * @param {number} opts.E       eye-separation / pattern period in px (~128)
 * @param {number} opts.mu      depth scale (~0.4)
 * @param {ImageData} [opts.pattern]  colour tile to sample anchors from.
 *                                    Omit for monochrome random dots.
 * @returns {ImageData} the finished stereogram, w*h.
 */
export function renderSIRDS(depth, w, h, opts = {}) {
  const E = Math.max(16, Math.round(opts.E ?? 128));
  const mu = opts.mu ?? 0.4;
  const pattern = opts.pattern || null;
  const pw = pattern ? pattern.width : 0;
  const ph = pattern ? pattern.height : 0;

  const out = new ImageData(w, h);
  const same = new Int32Array(w);     // same[x]: pixel x must match colour of same[x]
  const px = new Int32Array(w);       // resolved anchor index per pixel for this row

  // separation in pixels for depth z. nearer (z->1) => smaller separation.
  const separation = (z) => Math.round((1 - mu * z) * E / (2 - mu * z));

  // far-plane separation used by the hidden-surface visibility test.
  const farSep = separation(0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) same[x] = x;

    for (let x = 0; x < w; x++) {
      const z = depth[y * w + x];
      const sep = separation(z);
      let left = x - (sep >> 1);
      let right = left + sep;

      if (left >= 0 && right < w) {
        // --- hidden-surface removal: is this link actually visible? ---
        let visible = true;
        let t = 1;
        let zt;
        do {
          zt = z + 2 * (2 - mu * z) * t / (mu * E);
          const xt = x - t;
          const sepCheck = (xt >= 0) ? depth[y * w + xt] : -1;
          const xt2 = x + t;
          const sepCheck2 = (xt2 < w) ? depth[y * w + xt2] : -1;
          if ((xt >= 0 && sepCheck > zt) || (xt2 < w && sepCheck2 > zt)) {
            visible = false;
          }
          t++;
        } while (zt < 1 && visible);

        if (visible) {
          // merge the two pixels into one constraint chain
          let l = same[left];
          while (l !== left && l !== right) {
            if (l < right) {
              left = l;
              l = same[left];
            } else {
              same[left] = right;
              left = right;
              right = l;
              l = same[left];
            }
          }
          same[left] = right;
        }
      }
    }

    // paint right-to-left: anchors get a fresh colour, links copy their partner.
    for (let x = w - 1; x >= 0; x--) {
      px[x] = (same[x] === x) ? x : px[same[x]];
    }

    for (let x = 0; x < w; x++) {
      const anchor = px[x];
      const o = (y * w + x) * 4;
      let r, g, b;
      if (pattern) {
        // sample tiled pattern at the anchor column (period == tile width ideally)
        const sx = ((anchor % pw) + pw) % pw;
        const sy = y % ph;
        const so = (sy * pw + sx) * 4;
        r = pattern.data[so]; g = pattern.data[so + 1]; b = pattern.data[so + 2];
      } else {
        // monochrome random dots, keyed by anchor so links share the value
        const on = hash2(anchor, y) < 0.5;
        r = g = b = on ? 255 : 0;
      }
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
    }
  }

  return out;
}

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
  return (h >>> 0) / 4294967296;
}

/** Trigger a PNG download of an ImageData. the download is the print. */
export function downloadImageData(imgData, filename = 'autostereogram.png') {
  const c = document.createElement('canvas');
  c.width = imgData.width;
  c.height = imgData.height;
  c.getContext('2d').putImageData(imgData, 0, 0);
  c.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
