#version 300 es
// stereogram.frag — GPU per-pixel pattern-shift approximation.
// the GPU is the fast. the fast is the approximation. the approximation is the 90%.
//
// For each pixel we walk LEFT in steps of the local separation
//     sep = E * (1 - μ*z) / (2 - μ*z)
// until we fall off the left edge, landing on an "anchor". The pattern is then
// sampled by the leftover horizontal position, tiled with period E. Repeated
// columns linked this way fuse, wall-eyed, into depth.
//
// This is NOT the strict Thimbleby/Inglis/Witten linking solve (see sirds-cpu.js
// for the true path) but it visually fuses ~90% of the time. the GPU is the fast.

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDepth;     // depth map z in .r
uniform sampler2D uPattern;   // repeating pattern (wrap = REPEAT)
uniform vec2  uResolution;    // render target size in px
uniform float uPeriod;        // E, eye separation in px (~128)
uniform float uMu;            // depth scale μ (~0.4)
uniform float uShowDepth;     // 1.0 = bypass, show raw depth map

float depthAt(float xpix, float ypix) {
    vec2 uv = vec2(xpix, ypix) / uResolution;
    return clamp(texture(uDepth, uv).r, 0.0, 1.0);
}

void main() {
    if (uShowDepth > 0.5) {
        float z = texture(uDepth, vUv).r;
        // tint the peek so it reads as "depth", not stereogram
        fragColor = vec4(z, z * 0.7, z * 0.4 + 0.1, 1.0);
        return;
    }

    float ypix = vUv.y * uResolution.y;
    float xpix = vUv.x * uResolution.x;

    // Walk left along the linking chain to an anchor near the left edge.
    float acc = xpix;
    // Bound the loop; worst case columns = width / minSeparation.
    for (int i = 0; i < 64; i++) {
        float z = depthAt(acc, ypix);
        float sep = uPeriod * (1.0 - uMu * z) / (2.0 - uMu * z);
        if (acc - sep < 0.0) break;
        acc -= sep;
    }

    // The leftover position (mod E) indexes into the tiled wallpaper.
    // Vertical is tiled by the same period to keep dots square-ish.
    vec2 puv = vec2(acc / uPeriod, ypix / uPeriod);
    vec3 col = texture(uPattern, puv).rgb;

    fragColor = vec4(col, 1.0);
}
