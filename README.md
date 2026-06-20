# autostereogram

> **magic eye.** SIRDS — single-image random-dot stereogram. A repeating-pattern
> field hides a 3D depth map; your brain fuses it wall-eyed. Depth is encoded as
> a horizontal shift of the pattern.

A real-time WebGL2 autostereogram playground with swappable depth engines and
pattern sources — plus a true CPU SIRDS path for export-quality stills.

![chunky 90s aesthetic](docs/visual-targets.md)

---

## 👁 How to view (this is half the fun)

These are **wall-eyed** (parallel) stereograms.

1. Put your nose almost touching the screen.
2. Relax your eyes and stare *through* the screen, as if focusing on something
   far behind it — let everything go soft and double.
3. Slowly pull your head back while holding that unfocused, far-away stare.
4. The repeating pattern will start to "click": a third image fuses in the
   middle and the hidden shape rises out toward you in 3D.

**Tips**
- It can take 10–30 seconds the first time. Don't force focus — defocus.
- Some people find it easier with the **animate** toggle on (the motion gives an
  extra depth cue).
- Toggle **peek at depth map** to see what's hidden, then go hunt for it.
- Can't get wall-eyed? Cross-eyed viewing also works but inverts depth (near
  becomes far).

the wall-eyed is the trick. the trick is the magic. the magic is the eye. the
eye is the brain. the brain is the fusion.

---

## ▶ Run it

The app loads its shaders with `fetch()`, so it needs to be served over HTTP
(opening `index.html` from `file://` will hit CORS). Any static server works:

```bash
# python
python3 -m http.server 8080

# or node
npx serve .
```

Then open <http://localhost:8080>.

---

## 🎛 Controls

| Control | What it does |
|---|---|
| **depth engine** | which secret to hide: SDF shape, raymarched scene, or fbm terrain |
| **pattern source** | the wallpaper: random dots, tiled rainbow, or living neon noise |
| **pattern period E** | repeat spacing ≈ eye separation in px (48–256, default 128) |
| **depth scale μ** | how strong the 3D effect is (0.05–0.85, default 0.4) |
| **animate** | breathing / spinning depth + living patterns |
| **CRT scanlines** | authentic chunky post-process |
| **peek at depth map** | bypass the stereogram and show `z(x,y)` |
| **export true SIRDS** | run the accurate CPU algorithm and download a PNG |

---

## 🧠 Two build routes

True SIRDS is **row-sequential** — each pixel's colour depends on the linking
constraints resolved to its left. That's awkward on a pure GPU, so this repo
ships both routes:

- **GPU path** (`src/shaders/stereogram.frag`) — per-pixel horizontal shift
  approximation. Real-time, fuses ~90% of the time. the GPU is the fast.
- **CPU path** (`src/js/sirds-cpu.js`) — the true Thimbleby/Inglis/Witten
  row-linking algorithm with hidden-surface removal. Slow but clean; used by the
  **export** button. the CPU is the true. the true is the export.

See [`docs/math-reference.md`](docs/math-reference.md) for the full derivation.

---

## 🗂 Structure

```
.
├── index.html                 # canvas + UI
├── context.manifest.json      # machine-readable project descriptor
├── repo_seed.txt              # the original build seed
├── docs/
│   ├── math-reference.md      # separation formula + both algorithms
│   └── visual-targets.md      # the three target looks
└── src/
    ├── js/
    │   ├── main.js            # switcher + 3-pass pipeline + export
    │   ├── sirds-cpu.js       # true row-linking SIRDS (accurate)
    │   └── pattern-sources.js # random dots | tiled image | animated noise
    └── shaders/
        ├── depth/             # swappable depth-map engines
        │   ├── sdf-shape.glsl
        │   ├── raymarch-depth.glsl
        │   └── noise-terrain.glsl
        ├── depth.frag         # renders z(x,y) -> FBO (engine injected here)
        ├── stereogram.frag    # per-pixel pattern shift (GPU approximation)
        └── post-process.frag  # CRT scanlines + vignette
```

## Pipeline

1. **depth.frag** (+ chosen `depth/<engine>.glsl`) → depth map `z` to an FBO.
2. **stereogram.frag** → per-pixel horizontal pattern shift using
   `sep = E·(1 − μz)/(2 − μz)`.
3. **post-process.frag** → CRT scanlines + vignette to screen.
4. **export** → read the depth FBO back, run true SIRDS, download a PNG.

---

## 🌐 Ecosystem

A **consumer** repo: it eats depth from `sdf_fields` / `raymarching` and patterns
from any `*_aesthetic` / `*_patterns` repo. Pairs with `op_art_style`, `moire`,
`lisa_frank_aesthetic`. The depth is the input. The pattern is the input. The
input is the art. The art is the magic.

## License

MIT — go make some eye magic.
