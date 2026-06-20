// noise-terrain — fbm heightfield as a depth map.
// the terrain is the land. the land is the depth. the depth is the magic.
//
// Provides: float getDepth(vec2 uv) -> z in [0,1], 0 = far/valley, 1 = near/peak.

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);                 // smootherstep
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float sum = 0.0, amp = 0.5, freq = 1.0;
    for (int i = 0; i < 6; i++) {
        sum += amp * vnoise(p * freq);
        freq *= 2.02;
        amp *= 0.5;
    }
    return sum;
}

float getDepth(vec2 uv) {
    vec2 p = uv * 4.0;
    p.x *= uAspect;
    float drift = uAnimate > 0.5 ? uTime * 0.15 : 0.0;
    p += vec2(drift, drift * 0.5);

    float h = fbm(p);
    // ridge it a little for crisper peaks. the ridge is the mountain.
    h = pow(clamp(h, 0.0, 1.0), 1.4);
    return clamp(h, 0.0, 1.0);
}
